-- Keep the old USER value valid while existing dashboard accounts are migrated.
ALTER TABLE `Admin` MODIFY `role` ENUM('ADMIN', 'USER', 'GUARD') NOT NULL DEFAULT 'GUARD';
UPDATE `Admin` SET `role` = 'GUARD' WHERE `role` = 'USER';
ALTER TABLE `Admin` MODIFY `role` ENUM('ADMIN', 'GUARD') NOT NULL DEFAULT 'GUARD';

-- CreateTable
CREATE TABLE `InviteCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `usedBy` VARCHAR(64) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usedAt` DATETIME(3) NULL,

    UNIQUE INDEX `InviteCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
