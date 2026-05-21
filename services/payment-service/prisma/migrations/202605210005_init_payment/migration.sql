CREATE SCHEMA IF NOT EXISTS "payment_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "payment_service"."PaymentProvider" AS ENUM (
    'STRIPE',
    'MERCADO_PAGO',
    'MOCK'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_service"."PaymentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "payment_service"."payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" "payment_service"."PaymentProvider" NOT NULL,
  "provider_payment_id" TEXT,
  "status" "payment_service"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "metadata" JSONB,
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_amount_non_negative_check" CHECK ("amount" >= 0)
);

CREATE TABLE IF NOT EXISTS "payment_service"."payment_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_order_id_key" ON "payment_service"."payments" ("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key" ON "payment_service"."payments" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payment_service"."payments" ("user_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payment_service"."payments" ("status");
CREATE INDEX IF NOT EXISTS "payment_events_payment_id_idx" ON "payment_service"."payment_events" ("payment_id");
CREATE INDEX IF NOT EXISTS "payment_events_type_idx" ON "payment_service"."payment_events" ("type");

DO $$ BEGIN
  ALTER TABLE "payment_service"."payment_events"
    ADD CONSTRAINT "payment_events_payment_id_fkey"
    FOREIGN KEY ("payment_id")
    REFERENCES "payment_service"."payments" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
