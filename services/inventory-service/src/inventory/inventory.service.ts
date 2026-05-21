import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AdjustStockCommandPayload,
  EXCHANGE_NAMES,
  ReleaseStockReservationCommandPayload,
  ReserveStockCommandPayload,
  ReserveStockItemPayload,
  ROUTING_KEYS,
  StockAdjustedEventPayload,
  StockConfirmedEventPayload,
  StockReleasedEventPayload,
  StockReservationDto,
  StockReservationFailedEventPayload,
  StockReservationReferencePayload,
  StockReservedEventPayload,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createHash } from 'node:crypto';
import {
  InventoryItem,
  PrismaClient,
  StockReservation,
} from '../generated/prisma';
import { InventoryServiceConfigService } from '../config/inventory-service.config';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapInventoryItem,
  mapStockReservation,
  ReservationItemSnapshot,
  toPrismaJson,
} from './inventory.mapper';
import { createInventoryEventEnvelope, MessageContext } from './inventory.events';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>;

type LockedReservationItem = Readonly<{
  item: InventoryItem;
  quantity: number;
  sku: string;
  variantId: string;
}>;

const RESERVATION_REFERENCE_TYPE = 'stock_reservation';
const ADJUSTMENT_REFERENCE_TYPE = 'stock_adjustment';

@Injectable()
export class InventoryService {
  constructor(
    private readonly config: InventoryServiceConfigService,
    private readonly prisma: PrismaService,
    private readonly rabbitMqClient: RabbitMqClient,
  ) {}

  async reserveStock(payload: ReserveStockCommandPayload, context: MessageContext): Promise<StockReservationDto> {
    const normalizedItems = normalizeReservationItems(payload.items);
    const reservationId = payload.reservationId ?? payload.orderId;
    const itemsHash = hashReservationItems(normalizedItems);
    const expiresAt = resolveExpiration(payload, this.config.defaultReservationTtlSeconds);

    const result = await this.prisma.$transaction(async (tx) => {
      const existingReservation = await this.findExistingReservation(tx, {
        idempotencyKey: payload.idempotencyKey,
        orderId: payload.orderId,
        reservationId,
      });

      if (existingReservation) {
        this.assertReservationIdempotency(existingReservation, {
          idempotencyKey: payload.idempotencyKey,
          itemsHash,
          orderId: payload.orderId,
          reservationId,
        });
        return {
          event: undefined,
          reservation: existingReservation,
        };
      }

      const lockedItems: LockedReservationItem[] = [];
      const failedItems: ReserveStockItemPayload[] = [];
      let failureReason: string | undefined;

      for (const item of normalizedItems) {
        const inventoryItem = await this.lockInventoryItemByVariantId(tx, item.variantId);
        if (!inventoryItem || inventoryItem.sku !== item.sku || !inventoryItem.isActive) {
          failedItems.push(item);
          failureReason = `Inventory item ${item.sku} is not available.`;
          continue;
        }

        const availableStock = inventoryItem.stockOnHand - inventoryItem.reservedStock;
        if (availableStock < item.quantity) {
          failedItems.push(item);
          failureReason = `Insufficient stock for SKU ${item.sku}.`;
          continue;
        }

        lockedItems.push({
          item: inventoryItem,
          quantity: item.quantity,
          sku: item.sku,
          variantId: item.variantId,
        });
      }

      if (failedItems.length > 0) {
        const failedReservation = await tx.stockReservation.create({
          data: {
            expiresAt,
            failureReason: failureReason ?? 'Stock reservation failed.',
            idempotencyKey: payload.idempotencyKey,
            items: toPrismaJson(normalizedItems),
            itemsHash,
            orderId: payload.orderId,
            reservationId,
            status: 'FAILED',
            userId: payload.userId,
          },
        });

        return {
          event: {
            failedItems,
            orderId: payload.orderId,
            reason: failedReservation.failureReason ?? 'Stock reservation failed.',
            reservationId,
            userId: payload.userId,
          } satisfies StockReservationFailedEventPayload,
          reservation: failedReservation,
        };
      }

      const reservationItems: ReservationItemSnapshot[] = [];
      for (const lockedItem of lockedItems) {
        const updatedItem = await tx.inventoryItem.update({
          data: {
            reservedStock: { increment: lockedItem.quantity },
          },
          where: { id: lockedItem.item.id },
        });

        await this.createMovement(tx, {
          after: updatedItem,
          before: lockedItem.item,
          quantity: lockedItem.quantity,
          reason: 'Stock reserved for order.',
          referenceId: reservationId,
          referenceType: RESERVATION_REFERENCE_TYPE,
          type: 'RESERVE',
        });

        reservationItems.push({
          inventoryItemId: updatedItem.id,
          quantity: lockedItem.quantity,
          sku: lockedItem.sku,
          variantId: lockedItem.variantId,
        });
      }

      const reservation = await tx.stockReservation.create({
        data: {
          expiresAt,
          idempotencyKey: payload.idempotencyKey,
          items: toPrismaJson(reservationItems),
          itemsHash,
          orderId: payload.orderId,
          reservationId,
          status: 'PENDING',
          userId: payload.userId,
        },
      });

      return {
        event: {
          expiresAt: reservation.expiresAt.toISOString(),
          items: reservationItems,
          orderId: reservation.orderId,
          reservationId: reservation.reservationId,
          userId: reservation.userId,
        } satisfies StockReservedEventPayload,
        reservation,
      };
    });

    if (result.event && result.reservation.status === 'FAILED') {
      await this.publishEvent(ROUTING_KEYS.inventoryEventStockReservationFailed, result.event, context);
    } else if (result.event) {
      await this.publishEvent(ROUTING_KEYS.inventoryEventStockReserved, result.event, context);
    }

    return mapStockReservation(result.reservation);
  }

  async confirmStockReservation(
    payload: StockReservationReferencePayload,
    context: MessageContext,
  ): Promise<StockReservationDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await this.lockReservation(tx, payload);
      if (reservation.status === 'CONFIRMED') {
        return { event: undefined, reservation };
      }

      if (reservation.status !== 'PENDING') {
        throw new ConflictException(`Reservation ${reservation.reservationId} cannot be confirmed from ${reservation.status}.`);
      }

      if (reservation.expiresAt <= new Date()) {
        throw new ConflictException(`Reservation ${reservation.reservationId} is expired.`);
      }

      const reservationItems = parseReservationItems(reservation);
      for (const item of reservationItems) {
        const lockedItem = await this.lockInventoryItemByVariantId(tx, item.variantId);
        if (!lockedItem || lockedItem.reservedStock < item.quantity) {
          throw new ConflictException(`Reserved stock for SKU ${item.sku} is not available.`);
        }

        const updatedItem = await tx.inventoryItem.update({
          data: {
            reservedStock: { decrement: item.quantity },
            stockOnHand: { decrement: item.quantity },
          },
          where: { id: lockedItem.id },
        });

        await this.createMovement(tx, {
          after: updatedItem,
          before: lockedItem,
          quantity: item.quantity,
          reason: payload.reason ?? 'Stock reservation confirmed.',
          referenceId: reservation.reservationId,
          referenceType: RESERVATION_REFERENCE_TYPE,
          type: 'CONFIRM',
        });
      }

      const updatedReservation = await tx.stockReservation.update({
        data: {
          confirmedAt: new Date(),
          status: 'CONFIRMED',
        },
        where: { id: reservation.id },
      });

      return {
        event: {
          items: reservationItems,
          orderId: updatedReservation.orderId,
          reservationId: updatedReservation.reservationId,
          userId: updatedReservation.userId,
        } satisfies StockConfirmedEventPayload,
        reservation: updatedReservation,
      };
    });

    if (result.event) {
      await this.publishEvent(ROUTING_KEYS.inventoryEventStockConfirmed, result.event, context);
    }

    return mapStockReservation(result.reservation);
  }

  async releaseStockReservation(
    payload: ReleaseStockReservationCommandPayload,
    context: MessageContext,
  ): Promise<StockReservationDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await this.lockReservation(tx, payload);
      if (reservation.status === 'RELEASED') {
        return { event: undefined, reservation };
      }

      if (reservation.status === 'CONFIRMED') {
        throw new ConflictException(`Reservation ${reservation.reservationId} was already confirmed.`);
      }

      if (reservation.status === 'FAILED') {
        return { event: undefined, reservation };
      }

      const reservationItems = parseReservationItems(reservation);
      for (const item of reservationItems) {
        const lockedItem = await this.lockInventoryItemByVariantId(tx, item.variantId);
        if (!lockedItem) {
          throw new ConflictException(`Inventory item ${item.sku} was not found.`);
        }

        const releaseQuantity = Math.min(item.quantity, lockedItem.reservedStock);
        const updatedItem = await tx.inventoryItem.update({
          data: {
            reservedStock: { decrement: releaseQuantity },
          },
          where: { id: lockedItem.id },
        });

        await this.createMovement(tx, {
          after: updatedItem,
          before: lockedItem,
          quantity: releaseQuantity,
          reason: payload.reason ?? 'Stock reservation released.',
          referenceId: reservation.reservationId,
          referenceType: RESERVATION_REFERENCE_TYPE,
          type: 'RELEASE',
        });
      }

      const updatedReservation = await tx.stockReservation.update({
        data: {
          releasedAt: new Date(),
          status: 'RELEASED',
        },
        where: { id: reservation.id },
      });

      return {
        event: {
          items: reservationItems,
          orderId: updatedReservation.orderId,
          reservationId: updatedReservation.reservationId,
          userId: updatedReservation.userId,
        } satisfies StockReleasedEventPayload,
        reservation: updatedReservation,
      };
    });

    if (result.event) {
      await this.publishEvent(ROUTING_KEYS.inventoryEventStockReleased, result.event, context);
    }

    return mapStockReservation(result.reservation);
  }

  async adjustStock(payload: AdjustStockCommandPayload, context: MessageContext) {
    validateAdjustQuantity(payload);

    const result = await this.prisma.$transaction(async (tx) => {
      let existingItem = await this.lockInventoryItemByVariantId(tx, payload.variantId);
      if (!existingItem) {
        if (payload.mode === 'DECREMENT') {
          throw new NotFoundException(`Inventory item ${payload.sku} was not found.`);
        }

        existingItem = await tx.inventoryItem.create({
          data: {
            productId: payload.productId,
            reservedStock: 0,
            sku: payload.sku,
            stockOnHand: 0,
            variantId: payload.variantId,
          },
        });
      }

      if (existingItem.sku !== payload.sku) {
        throw new ConflictException('Variant ID and SKU point to different inventory items.');
      }

      const stockOnHandAfter = resolveAdjustedStock(existingItem, payload);
      if (stockOnHandAfter < existingItem.reservedStock) {
        throw new ConflictException('Stock on hand cannot be lower than currently reserved stock.');
      }

      const updatedItem =
        stockOnHandAfter === existingItem.stockOnHand && existingItem.productId === payload.productId
          ? existingItem
          : await tx.inventoryItem.update({
              data: {
                productId: payload.productId,
                stockOnHand: stockOnHandAfter,
              },
              where: { id: existingItem.id },
            });

      const movement = await this.createMovement(tx, {
        after: updatedItem,
        before: existingItem,
        quantity: stockOnHandAfter - existingItem.stockOnHand,
        reason: payload.reason,
        referenceId: payload.idempotencyKey,
        referenceType: ADJUSTMENT_REFERENCE_TYPE,
        type: 'ADJUST',
      });

      return {
        event: {
          inventoryItem: mapInventoryItem(updatedItem),
          mode: payload.mode,
          movementId: movement.id,
          productId: updatedItem.productId,
          quantity: payload.quantity,
          reason: payload.reason,
          sku: updatedItem.sku,
          variantId: updatedItem.variantId,
        } satisfies StockAdjustedEventPayload,
        item: updatedItem,
      };
    });

    await this.publishEvent(ROUTING_KEYS.inventoryEventStockAdjusted, result.event, context);
    return mapInventoryItem(result.item);
  }

  private async findExistingReservation(
    tx: TransactionClient,
    input: { idempotencyKey: string; orderId: string; reservationId: string },
  ): Promise<StockReservation | null> {
    return tx.stockReservation.findFirst({
      where: {
        OR: [
          { idempotencyKey: input.idempotencyKey },
          { orderId: input.orderId },
          { reservationId: input.reservationId },
        ],
      },
    });
  }

  private assertReservationIdempotency(
    reservation: StockReservation,
    input: { idempotencyKey: string; itemsHash: string; orderId: string; reservationId: string },
  ): void {
    if (
      reservation.idempotencyKey !== input.idempotencyKey ||
      reservation.itemsHash !== input.itemsHash ||
      reservation.orderId !== input.orderId ||
      reservation.reservationId !== input.reservationId
    ) {
      throw new ConflictException('Stock reservation idempotency mismatch.');
    }
  }

  private async lockInventoryItemByVariantId(
    tx: TransactionClient,
    variantId: string,
  ): Promise<InventoryItem | null> {
    const lockedRows = await tx.$queryRaw<readonly { id: string }[]>`
      SELECT "id"
      FROM "inventory_service"."inventory_items"
      WHERE "variant_id" = CAST(${variantId} AS UUID)
      FOR UPDATE
    `;

    const lockedItemId = lockedRows[0]?.id;
    if (!lockedItemId) {
      return null;
    }

    return tx.inventoryItem.findUnique({
      where: { id: lockedItemId },
    });
  }

  private async lockReservation(
    tx: TransactionClient,
    payload: StockReservationReferencePayload,
  ): Promise<StockReservation> {
    const reservation = await findReservationForUpdate(tx, payload);
    if (!reservation) {
      throw new NotFoundException('Stock reservation was not found.');
    }

    return reservation;
  }

  private async createMovement(
    tx: TransactionClient,
    input: {
      after: InventoryItem;
      before: InventoryItem;
      quantity: number;
      reason: string;
      referenceId?: string;
      referenceType?: string;
      type: 'ADJUST' | 'CONFIRM' | 'RELEASE' | 'RESERVE';
    },
  ) {
    return tx.stockMovement.create({
      data: {
        inventoryItemId: input.after.id,
        quantity: input.quantity,
        reason: input.reason,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        reservedStockAfter: input.after.reservedStock,
        reservedStockBefore: input.before.reservedStock,
        stockOnHandAfter: input.after.stockOnHand,
        stockOnHandBefore: input.before.stockOnHand,
        type: input.type,
      },
    });
  }

  private async publishEvent<TPayload, TType extends string>(
    routingKey: TType,
    payload: TPayload,
    context: MessageContext,
  ): Promise<void> {
    await this.rabbitMqClient.publish({
      correlationId: context.correlationId,
      exchange: EXCHANGE_NAMES.inventory,
      message: createInventoryEventEnvelope(routingKey, payload, context),
      routingKey,
    });
  }
}

async function findReservationForUpdate(
  tx: TransactionClient,
  payload: StockReservationReferencePayload,
): Promise<StockReservation | null> {
  const lockedRows = payload.reservationId
    ? await tx.$queryRaw<readonly { id: string }[]>`
        SELECT "id"
        FROM "inventory_service"."stock_reservations"
        WHERE "reservation_id" = ${payload.reservationId}
        FOR UPDATE
      `
    : await tx.$queryRaw<readonly { id: string }[]>`
        SELECT "id"
        FROM "inventory_service"."stock_reservations"
        WHERE "order_id" = ${payload.orderId}
        FOR UPDATE
      `;

  const lockedReservationId = lockedRows[0]?.id;
  if (!lockedReservationId) {
    return null;
  }

  return tx.stockReservation.findUnique({
    where: { id: lockedReservationId },
  });
}

function normalizeReservationItems(items: readonly ReserveStockItemPayload[]): readonly ReserveStockItemPayload[] {
  if (items.length === 0) {
    throw new BadRequestException('At least one stock item is required.');
  }

  const itemByVariantId = new Map<string, ReserveStockItemPayload>();
  for (const item of items) {
    validatePositiveQuantity(item.quantity, 'quantity');
    const existingItem = itemByVariantId.get(item.variantId);
    if (!existingItem) {
      itemByVariantId.set(item.variantId, item);
      continue;
    }

    if (existingItem.sku !== item.sku) {
      throw new BadRequestException(`Variant ${item.variantId} has conflicting SKUs.`);
    }

    itemByVariantId.set(item.variantId, {
      quantity: existingItem.quantity + item.quantity,
      sku: item.sku,
      variantId: item.variantId,
    });
  }

  return [...itemByVariantId.values()].sort((left, right) => left.variantId.localeCompare(right.variantId));
}

function hashReservationItems(items: readonly ReserveStockItemPayload[]): string {
  return createHash('sha256')
    .update(JSON.stringify(items))
    .digest('hex');
}

function resolveExpiration(payload: ReserveStockCommandPayload, defaultTtlSeconds: number): Date {
  if (payload.expiresAt) {
    const expiresAt = new Date(payload.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new BadRequestException('expiresAt must be a future ISO date.');
    }

    return expiresAt;
  }

  const ttlSeconds = payload.expiresInSeconds ?? defaultTtlSeconds;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60) {
    throw new BadRequestException('expiresInSeconds must be an integer greater than or equal to 60.');
  }

  return new Date(Date.now() + ttlSeconds * 1000);
}

function parseReservationItems(reservation: StockReservation): readonly ReservationItemSnapshot[] {
  if (!Array.isArray(reservation.items)) {
    throw new ConflictException('Reservation items snapshot is invalid.');
  }

  return reservation.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ConflictException('Reservation item snapshot is invalid.');
    }

    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.quantity !== 'number' ||
      typeof candidate.sku !== 'string' ||
      typeof candidate.variantId !== 'string'
    ) {
      throw new ConflictException('Reservation item snapshot is invalid.');
    }

    return {
      inventoryItemId: typeof candidate.inventoryItemId === 'string' ? candidate.inventoryItemId : undefined,
      quantity: candidate.quantity,
      sku: candidate.sku,
      variantId: candidate.variantId,
    };
  });
}

function resolveAdjustedStock(item: InventoryItem, payload: AdjustStockCommandPayload): number {
  if (payload.mode === 'SET') {
    return payload.quantity;
  }

  if (payload.mode === 'INCREMENT') {
    return item.stockOnHand + payload.quantity;
  }

  return item.stockOnHand - payload.quantity;
}

function validatePositiveQuantity(quantity: number, fieldName: string): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }
}

function validateAdjustQuantity(payload: AdjustStockCommandPayload): void {
  if (!Number.isInteger(payload.quantity)) {
    throw new BadRequestException('quantity must be an integer.');
  }

  if (payload.mode === 'SET') {
    if (payload.quantity < 0) {
      throw new BadRequestException('quantity must be greater than or equal to zero.');
    }
    return;
  }

  validatePositiveQuantity(payload.quantity, 'quantity');
}
