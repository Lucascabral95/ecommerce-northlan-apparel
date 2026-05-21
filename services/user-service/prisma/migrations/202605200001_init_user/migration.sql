CREATE SCHEMA IF NOT EXISTS "user_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "user_service"."profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "first_name" TEXT,
  "last_name" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "birth_date" DATE,
  "document_type" TEXT,
  "document_number" TEXT,
  "gender" TEXT,
  "preferred_sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferred_categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_service"."addresses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "alias" TEXT NOT NULL,
  "recipient_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "street_number" TEXT NOT NULL,
  "apartment" TEXT,
  "references" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_user_id_key"
  ON "user_service"."profiles" ("user_id");

CREATE INDEX IF NOT EXISTS "addresses_user_id_idx"
  ON "user_service"."addresses" ("user_id");

CREATE INDEX IF NOT EXISTS "addresses_user_id_is_default_idx"
  ON "user_service"."addresses" ("user_id", "is_default");

ALTER TABLE "user_service"."addresses"
  ADD CONSTRAINT "addresses_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "user_service"."profiles" ("user_id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
