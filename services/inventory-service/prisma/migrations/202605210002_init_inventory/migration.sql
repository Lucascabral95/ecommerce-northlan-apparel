CREATE SCHEMA IF NOT EXISTS "inventory_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "inventory_service"."StockReservationStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'RELEASED',
    'EXPIRED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "inventory_service"."StockMovementType" AS ENUM (
    'RESERVE',
    'CONFIRM',
    'RELEASE',
    'ADJUST'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_service"."inventory_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "sku" TEXT NOT NULL,
  "stock_on_hand" INTEGER NOT NULL DEFAULT 0,
  "reserved_stock" INTEGER NOT NULL DEFAULT 0,
  "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_items_stock_non_negative_check" CHECK ("stock_on_hand" >= 0),
  CONSTRAINT "inventory_items_reserved_non_negative_check" CHECK ("reserved_stock" >= 0),
  CONSTRAINT "inventory_items_reserved_not_above_stock_check" CHECK ("reserved_stock" <= "stock_on_hand")
);

CREATE TABLE IF NOT EXISTS "inventory_service"."stock_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reservation_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "inventory_service"."StockReservationStatus" NOT NULL DEFAULT 'PENDING',
  "items" JSONB NOT NULL,
  "items_hash" TEXT NOT NULL,
  "failure_reason" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "confirmed_at" TIMESTAMP(3),
  "released_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_service"."stock_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inventory_item_id" UUID NOT NULL,
  "type" "inventory_service"."StockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "stock_on_hand_before" INTEGER NOT NULL,
  "stock_on_hand_after" INTEGER NOT NULL,
  "reserved_stock_before" INTEGER NOT NULL,
  "reserved_stock_after" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_variant_id_key" ON "inventory_service"."inventory_items" ("variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_sku_key" ON "inventory_service"."inventory_items" ("sku");
CREATE INDEX IF NOT EXISTS "inventory_items_product_id_idx" ON "inventory_service"."inventory_items" ("product_id");
CREATE INDEX IF NOT EXISTS "inventory_items_sku_idx" ON "inventory_service"."inventory_items" ("sku");

CREATE UNIQUE INDEX IF NOT EXISTS "stock_reservations_reservation_id_key" ON "inventory_service"."stock_reservations" ("reservation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_reservations_order_id_key" ON "inventory_service"."stock_reservations" ("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_reservations_idempotency_key_key" ON "inventory_service"."stock_reservations" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "stock_reservations_status_idx" ON "inventory_service"."stock_reservations" ("status");
CREATE INDEX IF NOT EXISTS "stock_reservations_expires_at_idx" ON "inventory_service"."stock_reservations" ("expires_at");

CREATE INDEX IF NOT EXISTS "stock_movements_inventory_item_id_idx" ON "inventory_service"."stock_movements" ("inventory_item_id");
CREATE INDEX IF NOT EXISTS "stock_movements_reference_type_reference_id_idx" ON "inventory_service"."stock_movements" ("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "inventory_service"."stock_movements" ("created_at");

DO $$ BEGIN
  ALTER TABLE "inventory_service"."stock_movements"
    ADD CONSTRAINT "stock_movements_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id")
    REFERENCES "inventory_service"."inventory_items" ("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
