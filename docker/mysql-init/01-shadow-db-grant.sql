-- รันอัตโนมัติครั้งแรกที่ container สร้าง volume ใหม่
--
-- `prisma migrate dev` ต้องสร้าง "shadow database" ชั่วคราวเพื่อตรวจว่า migration
-- ที่จะสร้างถูกต้องไหม ผู้ใช้ doorlock ที่ MySQL image สร้างให้มีสิทธิ์แค่ใน DB
-- ชื่อ doorlock เท่านั้น จึงสร้าง shadow db ไม่ได้ (error P3014)
--
-- ให้สิทธิ์เฉพาะ DB ที่ขึ้นต้นด้วย prisma_migrate_shadow_db เท่านั้น
-- (ใน GRANT ตัว % คือ wildcard) จะได้ไม่ต้องใช้ root ใน DATABASE_URL
GRANT ALL PRIVILEGES ON `prisma_migrate_shadow_db%`.* TO 'doorlock'@'%';
FLUSH PRIVILEGES;
