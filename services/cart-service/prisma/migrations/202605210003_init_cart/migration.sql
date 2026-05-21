CREATE SCHEMA IF NOT EXISTS "cart_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "cart_service"."CartStatus" AS ENUM (
    'ACTIVE',
    'CHECKED_OUT',
    'ABANDONED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "cart_service"."carts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "status" "cart_service"."CartStatus" NOT NULL DEFAULT 'ACTIVE',
  "subtotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "carts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "carts_subtotal_non_negative_check" CHECK ("subtotal" >= 0)
);

CREATE TABLE IF NOT EXISTS "cart_service"."cart_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cart_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "sku" TEXT NOT NULL,
  "title_snapshot" TEXT NOT NULL,
  "slug_snapshot" TEXT NOT NULL,
  "image_snapshot" TEXT,
  "selected_size" TEXT NOT NULL,
  "selected_color" TEXT NOT NULL,
  "unit_price_snapshot" DECIMAL(12, 2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "total" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cart_items_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "cart_items_unit_price_non_negative_check" CHECK ("unit_price_snapshot" >= 0),
  CONSTRAINT "cart_items_total_non_negative_check" CHECK ("total" >= 0)
);

CREATE INDEX IF NOT EXISTS "carts_user_id_status_idx" ON "cart_service"."carts" ("user_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "carts_one_active_cart_per_user_idx"
  ON "cart_service"."carts" ("user_id")
  WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_cart_id_variant_id_key" ON "cart_service"."cart_items" ("cart_id", "variant_id");
CREATE INDEX IF NOT EXISTS "cart_items_cart_id_idx" ON "cart_service"."cart_items" ("cart_id");
CREATE INDEX IF NOT EXISTS "cart_items_product_id_idx" ON "cart_service"."cart_items" ("product_id");
CREATE INDEX IF NOT EXISTS "cart_items_variant_id_idx" ON "cart_service"."cart_items" ("variant_id");

DO $$ BEGIN
  ALTER TABLE "cart_service"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey"
    FOREIGN KEY ("cart_id")
    REFERENCES "cart_service"."carts" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
