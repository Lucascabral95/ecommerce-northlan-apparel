CREATE SCHEMA IF NOT EXISTS "notification_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "notification_service"."NotificationChannel" AS ENUM (
    'EMAIL'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_service"."NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notification_service"."notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" "notification_service"."NotificationChannel" NOT NULL DEFAULT 'EMAIL',
  "subject" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "notification_service"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notification_service"."notifications" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_type_idx"
  ON "notification_service"."notifications" ("type");
CREATE INDEX IF NOT EXISTS "notifications_status_idx"
  ON "notification_service"."notifications" ("status");
