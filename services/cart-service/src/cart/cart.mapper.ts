import { CartDto, CartItemDto } from '@northlane/contracts';
import { Cart, CartItem, Prisma } from '../generated/prisma';

export type CartWithItems = Cart & {
  items: CartItem[];
};

export function mapCart(cart: CartWithItems): CartDto {
  return {
    createdAt: cart.createdAt.toISOString(),
    currency: cart.currency,
    id: cart.id,
    items: cart.items.map(mapCartItem),
    status: cart.status,
    subtotal: toNumber(cart.subtotal),
    updatedAt: cart.updatedAt.toISOString(),
    userId: cart.userId,
  };
}

function mapCartItem(item: CartItem): CartItemDto {
  return {
    createdAt: item.createdAt.toISOString(),
    id: item.id,
    imageSnapshot: item.imageSnapshot ?? undefined,
    productId: item.productId,
    quantity: item.quantity,
    selectedColor: item.selectedColor,
    selectedSize: item.selectedSize,
    sku: item.sku,
    slugSnapshot: item.slugSnapshot,
    titleSnapshot: item.titleSnapshot,
    total: toNumber(item.total),
    unitPriceSnapshot: toNumber(item.unitPriceSnapshot),
    updatedAt: item.updatedAt.toISOString(),
    variantId: item.variantId,
  };
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}
