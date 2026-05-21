import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AddCartItemCommandPayload,
  CartDto,
  ClearCartCommandPayload,
  ProductDto,
  ProductImageDto,
  ProductVariantDto,
  RemoveCartItemCommandPayload,
  UpdateCartItemCommandPayload,
} from '@northlane/contracts';
import { Cart, CartItem, Prisma, PrismaClient } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CartWithItems, mapCart } from './cart.mapper';
import { CatalogClientService } from './catalog-client.service';
import { MessageContext } from './cart.events';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>;

const CART_INCLUDE = {
  items: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.CartInclude;

@Injectable()
export class CartService {
  constructor(
    private readonly catalogClient: CatalogClientService,
    private readonly prisma: PrismaService,
  ) {}

  async getActiveCart(payload: ClearCartCommandPayload): Promise<CartDto> {
    const cart = await this.prisma.$transaction(async (tx) => {
      const activeCart = await this.getOrCreateActiveCart(tx, payload.userId);
      return this.fetchCart(tx, activeCart.id);
    });

    return mapCart(cart);
  }

  async addItem(payload: AddCartItemCommandPayload, context: MessageContext): Promise<CartDto> {
    validateQuantity(payload.quantity);
    const product = await this.catalogClient.getProductById(payload.productId, context);
    const snapshot = buildItemSnapshot(product, payload.variantId);

    const cart = await this.prisma.$transaction(async (tx) => {
      const activeCart = await this.getOrCreateActiveCart(tx, payload.userId, product.currency);
      const cartWithCurrency = await this.ensureCartCurrency(tx, activeCart, product.currency);
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cartWithCurrency.id,
            variantId: payload.variantId,
          },
        },
      });

      if (existingItem) {
        const quantity = existingItem.quantity + payload.quantity;
        await tx.cartItem.update({
          data: {
            quantity,
            total: calculateLineTotal(toNumber(existingItem.unitPriceSnapshot), quantity),
          },
          where: { id: existingItem.id },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cartWithCurrency.id,
            imageSnapshot: snapshot.imageSnapshot,
            productId: product.id,
            quantity: payload.quantity,
            selectedColor: snapshot.selectedColor,
            selectedSize: snapshot.selectedSize,
            sku: snapshot.sku,
            slugSnapshot: product.slug,
            titleSnapshot: product.title,
            total: calculateLineTotal(snapshot.unitPriceSnapshot, payload.quantity),
            unitPriceSnapshot: snapshot.unitPriceSnapshot,
            variantId: payload.variantId,
          },
        });
      }

      await this.recalculateCartSubtotal(tx, cartWithCurrency.id);
      return this.fetchCart(tx, cartWithCurrency.id);
    });

    return mapCart(cart);
  }

  async updateItem(payload: UpdateCartItemCommandPayload): Promise<CartDto> {
    validateQuantity(payload.quantity);

    const cart = await this.prisma.$transaction(async (tx) => {
      const activeCart = await this.getActiveCartOrThrow(tx, payload.userId);
      const item = await this.getCartItemOrThrow(tx, activeCart.id, payload.itemId);

      await tx.cartItem.update({
        data: {
          quantity: payload.quantity,
          total: calculateLineTotal(toNumber(item.unitPriceSnapshot), payload.quantity),
        },
        where: { id: item.id },
      });

      await this.recalculateCartSubtotal(tx, activeCart.id);
      return this.fetchCart(tx, activeCart.id);
    });

    return mapCart(cart);
  }

  async removeItem(payload: RemoveCartItemCommandPayload): Promise<CartDto> {
    const cart = await this.prisma.$transaction(async (tx) => {
      const activeCart = await this.getActiveCartOrThrow(tx, payload.userId);
      const item = await this.getCartItemOrThrow(tx, activeCart.id, payload.itemId);

      await tx.cartItem.delete({
        where: { id: item.id },
      });

      await this.recalculateCartSubtotal(tx, activeCart.id);
      return this.fetchCart(tx, activeCart.id);
    });

    return mapCart(cart);
  }

  async clearCart(payload: ClearCartCommandPayload): Promise<CartDto> {
    const cart = await this.prisma.$transaction(async (tx) => {
      const activeCart = await this.getOrCreateActiveCart(tx, payload.userId);
      await tx.cartItem.deleteMany({
        where: { cartId: activeCart.id },
      });
      await tx.cart.update({
        data: { subtotal: 0 },
        where: { id: activeCart.id },
      });

      return this.fetchCart(tx, activeCart.id);
    });

    return mapCart(cart);
  }

  private async getOrCreateActiveCart(tx: TransactionClient, userId: string, currency = 'USD'): Promise<Cart> {
    const existingCart = await tx.cart.findFirst({
      where: {
        status: 'ACTIVE',
        userId,
      },
    });

    if (existingCart) {
      return existingCart;
    }

    return tx.cart.create({
      data: {
        currency,
        userId,
      },
    });
  }

  private async getActiveCartOrThrow(tx: TransactionClient, userId: string): Promise<Cart> {
    const activeCart = await tx.cart.findFirst({
      where: {
        status: 'ACTIVE',
        userId,
      },
    });

    if (!activeCart) {
      throw new NotFoundException('Active cart was not found.');
    }

    return activeCart;
  }

  private async getCartItemOrThrow(tx: TransactionClient, cartId: string, itemId: string): Promise<CartItem> {
    const item = await tx.cartItem.findFirst({
      where: {
        cartId,
        id: itemId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item was not found.');
    }

    return item;
  }

  private async ensureCartCurrency(tx: TransactionClient, cart: Cart, currency: string): Promise<Cart> {
    if (cart.currency === currency) {
      return cart;
    }

    const itemCount = await tx.cartItem.count({
      where: { cartId: cart.id },
    });

    if (itemCount > 0) {
      throw new ConflictException('Cart cannot contain products with different currencies.');
    }

    return tx.cart.update({
      data: { currency },
      where: { id: cart.id },
    });
  }

  private async recalculateCartSubtotal(tx: TransactionClient, cartId: string): Promise<void> {
    const items = await tx.cartItem.findMany({
      select: { total: true },
      where: { cartId },
    });
    const subtotal = roundMoney(items.reduce((total, item) => total + toNumber(item.total), 0));

    await tx.cart.update({
      data: { subtotal },
      where: { id: cartId },
    });
  }

  private async fetchCart(tx: TransactionClient, cartId: string): Promise<CartWithItems> {
    const cart = await tx.cart.findUnique({
      include: CART_INCLUDE,
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Cart was not found.');
    }

    return cart;
  }
}

function buildItemSnapshot(product: ProductDto, variantId: string) {
  if (!product.isActive) {
    throw new NotFoundException('Product was not found.');
  }

  const variant = product.variants.find((candidate) => candidate.id === variantId);
  if (!variant || !variant.isActive) {
    throw new NotFoundException('Product variant was not found.');
  }

  return {
    imageSnapshot: resolveImageSnapshot(product.images, variant),
    selectedColor: variant.colorName,
    selectedSize: variant.size,
    sku: variant.sku,
    unitPriceSnapshot: variant.priceOverride ?? product.price,
  };
}

function resolveImageSnapshot(images: readonly ProductImageDto[], variant: ProductVariantDto): string | undefined {
  const variantImage = images.find((image) => image.variantId === variant.id && image.isPrimary);
  if (variantImage) {
    return variantImage.url;
  }

  const primaryImage = images.find((image) => image.isPrimary);
  return primaryImage?.url ?? images[0]?.url;
}

function calculateLineTotal(unitPrice: number, quantity: number): number {
  return roundMoney(unitPrice * quantity);
}

function validateQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BadRequestException('Quantity must be a positive integer.');
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}
