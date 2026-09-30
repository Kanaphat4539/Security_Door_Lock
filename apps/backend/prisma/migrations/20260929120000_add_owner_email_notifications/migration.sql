ALTER TABLE `User`
  ADD COLUMN `email` VARCHAR(254) NULL,
  ADD COLUMN `emailNotificationsEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `dashboardAccountId` INTEGER NULL;

CREATE UNIQUE INDEX `User_dashboardAccountId_key` ON `User`(`dashboardAccountId`);
ALTER TABLE `User` ADD CONSTRAINT `User_dashboardAccountId_fkey`
  FOREIGN KEY (`dashboardAccountId`) REFERENCES `Admin`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `EmailNotification` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `accessLogId` INTEGER NOT NULL,
  `toEmail` VARCHAR(254) NOT NULL,
  `recipientName` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','SENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lockedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `lastError` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `EmailNotification_accessLogId_key` ON `EmailNotification`(`accessLogId`);
CREATE INDEX `EmailNotification_status_nextAttemptAt_idx` ON `EmailNotification`(`status`, `nextAttemptAt`);
CREATE INDEX `EmailNotification_status_lockedAt_idx` ON `EmailNotification`(`status`, `lockedAt`);
ALTER TABLE `EmailNotification` ADD CONSTRAINT `EmailNotification_accessLogId_fkey`
  FOREIGN KEY (`accessLogId`) REFERENCES `AccessLog`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
