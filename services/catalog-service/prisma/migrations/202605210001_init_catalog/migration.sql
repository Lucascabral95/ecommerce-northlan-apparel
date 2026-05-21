CREATE SCHEMA IF NOT EXISTS "catalog_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "catalog_service"."GenderTarget" AS ENUM ('MEN', 'WOMEN', 'UNISEX', 'KIDS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "catalog_service"."ProductType" AS ENUM (
    'T_SHIRT',
    'SHIRT',
    'PANTS',
    'JEANS',
    'JACKET',
    'HOODIE',
    'SWEATER',
    'DRESS',
    'SHOES',
    'ACCESSORY',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "catalog_service"."ProductFit" AS ENUM ('SLIM', 'REGULAR', 'OVERSIZED', 'RELAXED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "catalog_service"."ProductSeason" AS ENUM ('SUMMER', 'WINTER', 'MID_SEASON', 'ALL_SEASON');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "catalog_service"."brands" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_service"."collections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_service"."categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "parent_id" UUID,
  "description" TEXT,
  "image_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_service"."products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sku_base" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "category_id" UUID NOT NULL,
  "category_name" TEXT NOT NULL,
  "subcategory_id" UUID,
  "subcategory_name" TEXT,
  "gender_target" "catalog_service"."GenderTarget" NOT NULL,
  "product_type" "catalog_service"."ProductType" NOT NULL,
  "short_description" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "material" TEXT NOT NULL,
  "composition" TEXT NOT NULL,
  "care_instructions" TEXT NOT NULL,
  "fit" "catalog_service"."ProductFit" NOT NULL,
  "season" "catalog_service"."ProductSeason" NOT NULL,
  "collection" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "price" DECIMAL(12, 2) NOT NULL,
  "compare_at_price" DECIMAL(12, 2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "cost_price" DECIMAL(12, 2),
  "tax_rate" DECIMAL(5, 4) NOT NULL DEFAULT 0.21,
  "discount_percentage" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_new_arrival" BOOLEAN NOT NULL DEFAULT false,
  "is_best_seller" BOOLEAN NOT NULL DEFAULT false,
  "external_url" TEXT,
  "canonical_url" TEXT,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "average_rating" DECIMAL(3, 2) NOT NULL DEFAULT 0,
  "total_reviews" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_service"."product_variants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "sku" TEXT NOT NULL,
  "color_name" TEXT NOT NULL,
  "color_hex" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "barcode" TEXT,
  "price_override" DECIMAL(12, 2),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "reserved_stock" INTEGER NOT NULL DEFAULT 0,
  "weight_in_grams" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_service"."product_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "variant_id" UUID,
  "url" TEXT NOT NULL,
  "alt_text" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "brands_name_key" ON "catalog_service"."brands" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "brands_slug_key" ON "catalog_service"."brands" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "collections_name_key" ON "catalog_service"."collections" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "collections_slug_key" ON "catalog_service"."collections" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "catalog_service"."categories" ("slug");
CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "catalog_service"."categories" ("parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_key" ON "catalog_service"."products" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_base_key" ON "catalog_service"."products" ("sku_base");
CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "catalog_service"."products" ("brand");
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "catalog_service"."products" ("category_id");
CREATE INDEX IF NOT EXISTS "products_subcategory_id_idx" ON "catalog_service"."products" ("subcategory_id");
CREATE INDEX IF NOT EXISTS "products_gender_target_idx" ON "catalog_service"."products" ("gender_target");
CREATE INDEX IF NOT EXISTS "products_product_type_idx" ON "catalog_service"."products" ("product_type");
CREATE INDEX IF NOT EXISTS "products_is_active_is_featured_idx" ON "catalog_service"."products" ("is_active", "is_featured");
CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "catalog_service"."products" ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_sku_key" ON "catalog_service"."product_variants" ("sku");
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "catalog_service"."product_variants" ("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_color_name_idx" ON "catalog_service"."product_variants" ("color_name");
CREATE INDEX IF NOT EXISTS "product_variants_size_idx" ON "catalog_service"."product_variants" ("size");
CREATE INDEX IF NOT EXISTS "product_images_product_id_idx" ON "catalog_service"."product_images" ("product_id");
CREATE INDEX IF NOT EXISTS "product_images_variant_id_idx" ON "catalog_service"."product_images" ("variant_id");

ALTER TABLE "catalog_service"."categories"
  ADD CONSTRAINT "categories_parent_id_fkey"
  FOREIGN KEY ("parent_id")
  REFERENCES "catalog_service"."categories" ("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "catalog_service"."products"
  ADD CONSTRAINT "products_category_id_fkey"
  FOREIGN KEY ("category_id")
  REFERENCES "catalog_service"."categories" ("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "catalog_service"."products"
  ADD CONSTRAINT "products_subcategory_id_fkey"
  FOREIGN KEY ("subcategory_id")
  REFERENCES "catalog_service"."categories" ("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "catalog_service"."product_variants"
  ADD CONSTRAINT "product_variants_product_id_fkey"
  FOREIGN KEY ("product_id")
  REFERENCES "catalog_service"."products" ("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "catalog_service"."product_images"
  ADD CONSTRAINT "product_images_product_id_fkey"
  FOREIGN KEY ("product_id")
  REFERENCES "catalog_service"."products" ("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "catalog_service"."product_images"
  ADD CONSTRAINT "product_images_variant_id_fkey"
  FOREIGN KEY ("variant_id")
  REFERENCES "catalog_service"."product_variants" ("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
