import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CartDto,
  CreateOrderCommandPayload,
  EXCHANGE_NAMES,
  GetOrderCommandPayload,
  ListOrdersCommandPayload,
  OrderDto,
  OrderStatus,
  OrderStatusChangedEventPayload,
  ROUTING_KEYS,
  StockReservationFailedEventPayload,
  StockReservedEventPayload,
  UpdateOrderStatusCommandPayload,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createHash, randomUUID } from 'node:crypto';
import { Order, Prisma, PrismaClient } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CartClientService } from './cart-client.service';
import { createOrderMessageEnvelope, MessageContext } from './order.events';
import { mapOrder, OrderWithRelations } from './order.mapper';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>;

const ORDER_INCLUDE = {
  items: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  statusHistory: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrderService {
  constructor(
    private readonly cartClient: CartClientService,
    private readonly prisma: PrismaService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async createOrder(
    payload: CreateOrderCommandPayload,
    context: MessageContext,
  ): Promise<OrderDto> {
    const cart = await this.cartClient.getActiveCart(payload.userId, context);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot create an order from an empty cart.');
    }

    const requestHash = hashCheckoutRequest(payload, cart);
    const result = await this.prisma.$transaction(async (tx) => {
      const existingRecord = await tx.idempotencyKey.findUnique({
        where: { key: payload.idempotencyKey },
      });

      if (existingRecord) {
        if (
          existingRecord.userId !== payload.userId ||
          existingRecord.requestHash !== requestHash
        ) {
          throw new ConflictException('Checkout idempotency mismatch.');
        }

        return {
          isNewOrder: false,
          order: await this.fetchOrder(tx, existingRecord.orderId),
        };
      }

      const orderNumber = createOrderNumber();
      const order = await tx.order.create({
        data: {
          billingAddressSnapshot: toJson(payload.billingAddressSnapshot),
          currency: cart.currency,
          discountTotal: 0,
          grandTotal: cart.subtotal,
          idempotencyKey: payload.idempotencyKey,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productImage: item.imageSnapshot,
              productSlug: item.slugSnapshot,
              productTitle: item.titleSnapshot,
              quantity: item.quantity,
              selectedColor: item.selectedColor,
              selectedSize: item.selectedSize,
              sku: item.sku,
              total: item.total,
              unitPrice: item.unitPriceSnapshot,
              variantId: item.variantId,
            })),
          },
          orderNumber,
          shippingAddressSnapshot: toJson(
            payload.shippingAddressSnapshot ?? payload.shippingAddressId,
          ),
          status: 'PENDING',
          statusHistory: {
            create: {
              reason: 'Order created from active cart.',
              status: 'PENDING',
            },
          },
          subtotal: cart.subtotal,
          taxTotal: 0,
          userId: payload.userId,
        },
      });

      await tx.idempotencyKey.create({
        data: {
          key: payload.idempotencyKey,
          orderId: order.id,
          requestHash,
          userId: payload.userId,
        },
      });

      return {
        isNewOrder: true,
        order: await this.fetchOrder(tx, order.id),
      };
    });

    if (result.isNewOrder) {
      await this.publishOrderCreated(result.order, context);
      await this.publishReserveStockCommand(result.order, payload.idempotencyKey, context);
    }

    return mapOrder(result.order);
  }

  async listOrders(payload: ListOrdersCommandPayload): Promise<readonly OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      where: payload.includeAll ? undefined : { userId: payload.userId },
    });

    return orders.map((order) => mapOrder(order as OrderWithRelations));
  }

  async getOrder(payload: GetOrderCommandPayload): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      include: ORDER_INCLUDE,
      where: {
        id: payload.orderId,
        ...(payload.includeAll ? {} : { userId: payload.userId }),
      },
    });

    if (!order) {
      throw new NotFoundException('Order was not found.');
    }

    return mapOrder(order as OrderWithRelations);
  }

  async updateOrderStatus(
    payload: UpdateOrderStatusCommandPayload,
    context: MessageContext,
  ): Promise<OrderDto> {
    const order = await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: payload.orderId },
      });

      if (!existingOrder) {
        throw new NotFoundException('Order was not found.');
      }

      await this.transitionStatus(tx, existingOrder, payload.status, {
        changedBy: payload.changedBy,
        reason: payload.reason ?? 'Order status updated by admin.',
      });

      return this.fetchOrder(tx, existingOrder.id);
    });

    await this.publishStatusChanged(order, context);
    return mapOrder(order);
  }

  async handleStockReserved(
    payload: StockReservedEventPayload,
    context: MessageContext,
  ): Promise<void> {
    const order = await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({ where: { id: payload.orderId } });
      if (!existingOrder || existingOrder.status !== 'PENDING') {
        return undefined;
      }

      await this.transitionStatus(tx, existingOrder, 'STOCK_RESERVED', {
        reason: `Stock reservation ${payload.reservationId} completed.`,
      });
      const stockReservedOrder = await tx.order.findUniqueOrThrow({
        where: { id: existingOrder.id },
      });
      await this.transitionStatus(tx, stockReservedOrder, 'PAYMENT_PENDING', {
        reason: 'Payment request prepared after stock reservation.',
      });

      return this.fetchOrder(tx, existingOrder.id);
    });

    if (!order) {
      return;
    }

    await this.publishStatusChanged(order, context);
    await this.publishPaymentRequestCommand(order, context);
  }

  async handleStockReservationFailed(
    payload: StockReservationFailedEventPayload,
    context: MessageContext,
  ): Promise<void> {
    const order = await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({ where: { id: payload.orderId } });
      if (!existingOrder || existingOrder.status !== 'PENDING') {
        return undefined;
      }

      await this.transitionStatus(tx, existingOrder, 'FAILED', {
        reason: payload.reason,
      });

      return this.fetchOrder(tx, existingOrder.id);
    });

    if (order) {
      await this.publishStatusChanged(order, context);
    }
  }

  private async transitionStatus(
    tx: TransactionClient,
    order: Order,
    status: OrderStatus,
    input: { changedBy?: string; reason?: string },
  ): Promise<void> {
    if (order.status === status) {
      return;
    }

    await tx.order.update({
      data: { status },
      where: { id: order.id },
    });
    await tx.orderStatusHistory.create({
      data: {
        changedBy: input.changedBy,
        orderId: order.id,
        reason: input.reason,
        status,
      },
    });
  }

  private async fetchOrder(tx: TransactionClient, orderId: string): Promise<OrderWithRelations> {
    const order = await tx.order.findUnique({
      include: ORDER_INCLUDE,
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order was not found.');
    }

    return order as OrderWithRelations;
  }

  private async publishOrderCreated(
    order: OrderWithRelations,
    context: MessageContext,
  ): Promise<void> {
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.order,
      message: createOrderMessageEnvelope(
        ROUTING_KEYS.orderEventOrderCreated,
        {
          grandTotal: toNumber(order.grandTotal),
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
        },
        context,
      ),
      routingKey: ROUTING_KEYS.orderEventOrderCreated,
    });
  }

  private async publishStatusChanged(
    order: OrderWithRelations,
    context: MessageContext,
  ): Promise<void> {
    const payload: OrderStatusChangedEventPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      userId: order.userId,
    };
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.order,
      message: createOrderMessageEnvelope(
        ROUTING_KEYS.orderEventOrderStatusChanged,
        payload,
        context,
      ),
      routingKey: ROUTING_KEYS.orderEventOrderStatusChanged,
    });
  }

  private async publishReserveStockCommand(
    order: OrderWithRelations,
    idempotencyKey: string,
    context: MessageContext,
  ): Promise<void> {
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.inventory,
      message: createOrderMessageEnvelope(
        ROUTING_KEYS.inventoryCommandReserveStock,
        {
          expiresInSeconds: 900,
          idempotencyKey,
          items: order.items.map((item) => ({
            quantity: item.quantity,
            sku: item.sku,
            variantId: item.variantId,
          })),
          orderId: order.id,
          userId: order.userId,
        },
        context,
      ),
      routingKey: ROUTING_KEYS.inventoryCommandReserveStock,
    });
  }

  private async publishPaymentRequestCommand(
    order: OrderWithRelations,
    context: MessageContext,
  ): Promise<void> {
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.payment,
      message: createOrderMessageEnvelope(
        ROUTING_KEYS.paymentCommandRequestPayment,
        {
          amount: toNumber(order.grandTotal),
          currency: order.currency,
          idempotencyKey: `${order.idempotencyKey}:payment`,
          orderId: order.id,
          provider: 'MOCK',
          userId: order.userId,
        },
        context,
      ),
      routingKey: ROUTING_KEYS.paymentCommandRequestPayment,
    });
  }
}

function hashCheckoutRequest(payload: CreateOrderCommandPayload, cart: CartDto): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        billingAddressSnapshot: payload.billingAddressSnapshot,
        cartId: cart.id,
        items: cart.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          total: item.total,
          unitPriceSnapshot: item.unitPriceSnapshot,
          variantId: item.variantId,
        })),
        shippingAddressId: payload.shippingAddressId,
        shippingAddressSnapshot: payload.shippingAddressSnapshot,
        subtotal: cart.subtotal,
        userId: payload.userId,
      }),
    )
    .digest('hex');
}

function createOrderNumber(): string {
  const date = new Date();
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `NLA-${day}-${suffix}`;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return { value };
  }

  return value as Prisma.InputJsonValue;
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}
