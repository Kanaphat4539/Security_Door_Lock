ALTER TABLE `AccessLog` ADD COLUMN `userName` VARCHAR(191) NULL;

UPDATE `AccessLog` AS log
LEFT JOIN `User` AS owner ON owner.id = log.userId
SET log.userName = owner.name
WHERE owner.id IS NOT NULL;
