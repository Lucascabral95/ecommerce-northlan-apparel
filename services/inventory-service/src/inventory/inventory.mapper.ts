import {
  InventoryItemDto,
  StockMovementDto,
  StockReservationDto,
  StockReservationItemDto,
} from '@northlane/contracts';
import { InventoryItem, Prisma, StockMovement, StockReservation } from '../generated/prisma';

export type ReservationItemSnapshot = Readonly<{
  inventoryItemId?: string;
  quantity: number;
  sku: string;
  variantId: string;
}>;

export function mapInventoryItem(item: InventoryItem): InventoryItemDto {
  return {
    availableStock: Math.max(item.stockOnHand - item.reservedStock, 0),
    createdAt: item.createdAt.toISOString(),
    id: item.id,
    isActive: item.isActive,
    productId: item.productId,
    reservedStock: item.reservedStock,
    sku: item.sku,
    stockOnHand: item.stockOnHand,
    updatedAt: item.updatedAt.toISOString(),
    variantId: item.variantId,
  };
}

export function mapStockReservation(reservation: StockReservation): StockReservationDto {
  return {
    confirmedAt: reservation.confirmedAt?.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    expiresAt: reservation.expiresAt.toISOString(),
    failureReason: reservation.failureReason ?? undefined,
    idempotencyKey: reservation.idempotencyKey,
    items: parseReservationItems(reservation.items),
    orderId: reservation.orderId,
    releasedAt: reservation.releasedAt?.toISOString(),
    reservationId: reservation.reservationId,
    status: reservation.status,
    updatedAt: reservation.updatedAt.toISOString(),
    userId: reservation.userId,
  };
}

export function mapStockMovement(movement: StockMovement): StockMovementDto {
  return {
    createdAt: movement.createdAt.toISOString(),
    id: movement.id,
    inventoryItemId: movement.inventoryItemId,
    quantity: movement.quantity,
    reason: movement.reason,
    referenceId: movement.referenceId ?? undefined,
    referenceType: movement.referenceType ?? undefined,
    reservedStockAfter: movement.reservedStockAfter,
    reservedStockBefore: movement.reservedStockBefore,
    stockOnHandAfter: movement.stockOnHandAfter,
    stockOnHandBefore: movement.stockOnHandBefore,
    type: movement.type,
  };
}

export function toPrismaJson(value: readonly ReservationItemSnapshot[]): Prisma.InputJsonValue {
  return value.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    quantity: item.quantity,
    sku: item.sku,
    variantId: item.variantId,
  })) as Prisma.InputJsonValue;
}

function parseReservationItems(value: Prisma.JsonValue): readonly StockReservationItemDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => parseReservationItem(item))
    .filter((item): item is StockReservationItemDto => item !== undefined);
}

function parseReservationItem(value: Prisma.JsonValue): StockReservationItemDto | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.quantity !== 'number' ||
    typeof candidate.sku !== 'string' ||
    typeof candidate.variantId !== 'string'
  ) {
    return undefined;
  }

  return {
    inventoryItemId: typeof candidate.inventoryItemId === 'string' ? candidate.inventoryItemId : undefined,
    quantity: candidate.quantity,
    sku: candidate.sku,
    variantId: candidate.variantId,
  };
}
