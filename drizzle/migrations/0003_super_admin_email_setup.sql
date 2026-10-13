CREATE TABLE `super_admin_email_setup` (
  `email` TEXT PRIMARY KEY NOT NULL,
  `verification_code_hash` TEXT NOT NULL,
  `verification_expires_at` INTEGER NOT NULL,
  `verification_attempts` INTEGER NOT NULL DEFAULT 0,
  `requested_at` INTEGER NOT NULL,
  `verified_at` INTEGER,
  `bootstrap_token_hash` TEXT,
  `bootstrap_token_expires_at` INTEGER
);