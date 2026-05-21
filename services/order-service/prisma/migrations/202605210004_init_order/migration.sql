CREATE SCHEMA IF NOT EXISTS "order_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "order_service"."OrderStatus" AS ENUM (
    'PENDING',
    'STOCK_RESERVED',
    'PAYMENT_PENDING',
    'PAID',
    'CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'FAILED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "order_service"."orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_number" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "order_service"."OrderStatus" NOT NULL DEFAULT 'PENDING',
  "subtotal" DECIMAL(12, 2) NOT NULL,
  "discount_total" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "shipping_cost" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "tax_total" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "grand_total" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "payment_id" TEXT,
  "payment_status" TEXT,
  "shipping_address_snapshot" JSONB,
  "billing_address_snapshot" JSONB,
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_subtotal_non_negative_check" CHECK ("subtotal" >= 0),
  CONSTRAINT "orders_discount_total_non_negative_check" CHECK ("discount_total" >= 0),
  CONSTRAINT "orders_shipping_cost_non_negative_check" CHECK ("shipping_cost" >= 0),
  CONSTRAINT "orders_tax_total_non_negative_check" CHECK ("tax_total" >= 0),
  CONSTRAINT "orders_grand_total_non_negative_check" CHECK ("grand_total" >= 0)
);

CREATE TABLE IF NOT EXISTS "order_service"."order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "sku" TEXT NOT NULL,
  "product_title" TEXT NOT NULL,
  "product_slug" TEXT NOT NULL,
  "product_image" TEXT,
  "brand" TEXT,
  "category" TEXT,
  "selected_size" TEXT NOT NULL,
  "selected_color" TEXT NOT NULL,
  "unit_price" DECIMAL(12, 2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "total" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "order_items_unit_price_non_negative_check" CHECK ("unit_price" >= 0),
  CONSTRAINT "order_items_total_non_negative_check" CHECK ("total" >= 0)
);

CREATE TABLE IF NOT EXISTS "order_service"."order_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "status" "order_service"."OrderStatus" NOT NULL,
  "reason" TEXT,
  "changed_by" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "order_service"."idempotency_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "order_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_key" ON "order_service"."orders" ("order_number");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_key" ON "order_service"."orders" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "orders_user_id_created_at_idx" ON "order_service"."orders" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "order_service"."orders" ("status");

CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_service"."order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_service"."order_items" ("product_id");
CREATE INDEX IF NOT EXISTS "order_items_variant_id_idx" ON "order_service"."order_items" ("variant_id");

CREATE INDEX IF NOT EXISTS "order_status_history_order_id_idx" ON "order_service"."order_status_history" ("order_id");
CREATE INDEX IF NOT EXISTS "order_status_history_status_idx" ON "order_service"."order_status_history" ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_key_key" ON "order_service"."idempotency_keys" ("key");
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_order_id_key" ON "order_service"."idempotency_keys" ("order_id");
CREATE INDEX IF NOT EXISTS "idempotency_keys_user_id_idx" ON "order_service"."idempotency_keys" ("user_id");

DO $$ BEGIN
  ALTER TABLE "order_service"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey"
    FOREIGN KEY ("order_id")
    REFERENCES "order_service"."orders" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "order_service"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey"
    FOREIGN KEY ("order_id")
    REFERENCES "order_service"."orders" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "order_service"."idempotency_keys"
    ADD CONSTRAINT "idempotency_keys_order_id_fkey"
    FOREIGN KEY ("order_id")
    REFERENCES "order_service"."orders" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
