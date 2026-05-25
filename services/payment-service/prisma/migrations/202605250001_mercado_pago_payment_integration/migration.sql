ALTER TYPE "payment_service"."PaymentStatus" ADD VALUE IF NOT EXISTS 'IN_PROCESS';
ALTER TYPE "payment_service"."PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

DO $$ BEGIN
  CREATE TYPE "payment_service"."WebhookEventStatus" AS ENUM (
    'RECEIVED',
    'IGNORED',
    'PROCESSING',
    'PROCESSED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "payment_service"."payments"
  ADD COLUMN IF NOT EXISTS "provider_preference_id" TEXT,
  ADD COLUMN IF NOT EXISTS "external_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "checkout_url" TEXT,
  ADD COLUMN IF NOT EXISTS "init_point" TEXT,
  ADD COLUMN IF NOT EXISTS "sandbox_init_point" TEXT,
  ADD COLUMN IF NOT EXISTS "raw_provider_status" TEXT,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMP(3);

ALTER TABLE "payment_service"."payment_events"
  ADD COLUMN IF NOT EXISTS "provider" "payment_service"."PaymentProvider",
  ADD COLUMN IF NOT EXISTS "event_type" TEXT,
  ADD COLUMN IF NOT EXISTS "provider_event_id" TEXT,
  ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "payment_service"."webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID,
  "provider" "payment_service"."PaymentProvider" NOT NULL,
  "deduplication_key" TEXT NOT NULL,
  "provider_event_id" TEXT,
  "topic" TEXT,
  "action" TEXT,
  "resource_id" TEXT,
  "signature" TEXT,
  "payload" JSONB NOT NULL,
  "status" "payment_service"."WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_external_reference_key" ON "payment_service"."payments" ("external_reference");
CREATE INDEX IF NOT EXISTS "payments_provider_idx" ON "payment_service"."payments" ("provider");
CREATE INDEX IF NOT EXISTS "payments_provider_preference_id_idx" ON "payment_service"."payments" ("provider_preference_id");
CREATE INDEX IF NOT EXISTS "payments_provider_payment_id_idx" ON "payment_service"."payments" ("provider_payment_id");
CREATE INDEX IF NOT EXISTS "payment_events_provider_event_id_idx" ON "payment_service"."payment_events" ("provider_event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_deduplication_key_key" ON "payment_service"."webhook_events" ("deduplication_key");
CREATE INDEX IF NOT EXISTS "webhook_events_payment_id_idx" ON "payment_service"."webhook_events" ("payment_id");
CREATE INDEX IF NOT EXISTS "webhook_events_provider_resource_id_idx" ON "payment_service"."webhook_events" ("provider", "resource_id");
CREATE INDEX IF NOT EXISTS "webhook_events_status_idx" ON "payment_service"."webhook_events" ("status");

DO $$ BEGIN
  ALTER TABLE "payment_service"."webhook_events"
    ADD CONSTRAINT "webhook_events_payment_id_fkey"
    FOREIGN KEY ("payment_id")
    REFERENCES "payment_service"."payments" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
