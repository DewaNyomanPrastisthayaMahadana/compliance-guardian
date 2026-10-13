CREATE TABLE "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "banned" boolean NOT NULL DEFAULT false,
  "ban_reason" text,
  "ban_expires" timestamptz,
  "app_role" text NOT NULL DEFAULT 'mitra',
  "organization" text
);

CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email");

CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "impersonated_by" text
);

CREATE UNIQUE INDEX "session_token_unique" ON "session" ("token");
CREATE INDEX "session_user_id_index" ON "session" ("user_id");

CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamptz,
  "refresh_token_expires_at" timestamptz,
  "scope" text,
  "password" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE INDEX "account_user_id_index" ON "account" ("user_id");

CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz,
  "updated_at" timestamptz
);

CREATE INDEX "verification_identifier_index" ON "verification" ("identifier");

CREATE TABLE "auth_bootstrap_guard" (
  "id" integer PRIMARY KEY NOT NULL CHECK ("id" = 1)
);