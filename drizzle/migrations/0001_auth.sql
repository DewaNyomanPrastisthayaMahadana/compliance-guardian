CREATE TABLE `user` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `name` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `emailVerified` INTEGER NOT NULL DEFAULT 0,
  `image` TEXT,
  `createdAt` INTEGER NOT NULL,
  `updatedAt` INTEGER NOT NULL,
  `role` TEXT NOT NULL DEFAULT 'user',
  `banned` INTEGER NOT NULL DEFAULT 0,
  `banReason` TEXT,
  `banExpires` INTEGER,
  `appRole` TEXT NOT NULL DEFAULT 'mitra',
  `organization` TEXT
);

CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);

CREATE TABLE `session` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `expiresAt` INTEGER NOT NULL,
  `token` TEXT NOT NULL,
  `createdAt` INTEGER NOT NULL,
  `updatedAt` INTEGER NOT NULL,
  `ipAddress` TEXT,
  `userAgent` TEXT,
  `userId` TEXT NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `impersonatedBy` TEXT
);

CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
CREATE INDEX `session_user_id_index` ON `session` (`userId`);

CREATE TABLE `account` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `accountId` TEXT NOT NULL,
  `providerId` TEXT NOT NULL,
  `userId` TEXT NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `accessToken` TEXT,
  `refreshToken` TEXT,
  `idToken` TEXT,
  `accessTokenExpiresAt` INTEGER,
  `refreshTokenExpiresAt` INTEGER,
  `scope` TEXT,
  `password` TEXT,
  `createdAt` INTEGER NOT NULL,
  `updatedAt` INTEGER NOT NULL
);

CREATE INDEX `account_user_id_index` ON `account` (`userId`);

CREATE TABLE `verification` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `identifier` TEXT NOT NULL,
  `value` TEXT NOT NULL,
  `expiresAt` INTEGER NOT NULL,
  `createdAt` INTEGER,
  `updatedAt` INTEGER
);

CREATE INDEX `verification_identifier_index` ON `verification` (`identifier`);
