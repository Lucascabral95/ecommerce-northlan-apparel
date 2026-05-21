import { OrderDto, OrderItemDto, OrderStatusHistoryDto } from '@northlane/contracts';
import { Order, OrderItem, OrderStatusHistory, Prisma } from '../generated/prisma';

export type OrderWithRelations = Order & {
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
};

export function mapOrder(order: OrderWithRelations): OrderDto {
  return {
    billingAddressSnapshot: order.billingAddressSnapshot ?? undefined,
    createdAt: order.createdAt.toISOString(),
    currency: order.currency,
    discountTotal: toNumber(order.discountTotal),
    grandTotal: toNumber(order.grandTotal),
    id: order.id,
    idempotencyKey: order.idempotencyKey,
    items: order.items.map(mapOrderItem),
    orderNumber: order.orderNumber,
    paymentId: order.paymentId ?? undefined,
    paymentStatus: order.paymentStatus ?? undefined,
    shippingAddressSnapshot: order.shippingAddressSnapshot ?? undefined,
    shippingCost: toNumber(order.shippingCost),
    status: order.status,
    statusHistory: order.statusHistory.map(mapStatusHistory),
    subtotal: toNumber(order.subtotal),
    taxTotal: toNumber(order.taxTotal),
    updatedAt: order.updatedAt.toISOString(),
    userId: order.userId,
  };
}

function mapOrderItem(item: OrderItem): OrderItemDto {
  return {
    brand: item.brand ?? undefined,
    category: item.category ?? undefined,
    createdAt: item.createdAt.toISOString(),
    id: item.id,
    productId: item.productId,
    productImage: item.productImage ?? undefined,
    productSlug: item.productSlug,
    productTitle: item.productTitle,
    quantity: item.quantity,
    selectedColor: item.selectedColor,
    selectedSize: item.selectedSize,
    sku: item.sku,
    total: toNumber(item.total),
    unitPrice: toNumber(item.unitPrice),
    variantId: item.variantId,
  };
}

function mapStatusHistory(history: OrderStatusHistory): OrderStatusHistoryDto {
  return {
    changedBy: history.changedBy ?? undefined,
    createdAt: history.createdAt.toISOString(),
    id: history.id,
    reason: history.reason ?? undefined,
    status: history.status,
  };
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}
