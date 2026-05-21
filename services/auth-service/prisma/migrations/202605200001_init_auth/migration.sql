CREATE SCHEMA IF NOT EXISTS "auth_service";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "auth_service"."AuthRole" AS ENUM ('USER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "auth_service"."users_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "auth_service"."AuthRole" NOT NULL DEFAULT 'USER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "auth_service"."refresh_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_credentials_user_id_key"
  ON "auth_service"."users_credentials" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "users_credentials_email_key"
  ON "auth_service"."users_credentials" ("email");

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key"
  ON "auth_service"."refresh_tokens" ("token_hash");

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx"
  ON "auth_service"."refresh_tokens" ("user_id");

CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx"
  ON "auth_service"."refresh_tokens" ("expires_at");

ALTER TABLE "auth_service"."refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "auth_service"."users_credentials" ("user_id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
