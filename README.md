# Security Door Lock System
ระบบประตูเพื่อความปลอดภัย

This monorepo contains the software and firmware for a Security Door Lock system featuring facial recognition, RFID, and ultrasonic sensing.

## Project Structure

- **apps/frontend**: Next.js (App Router) + Tailwind CSS application for the dashboard.
- **apps/backend**: NestJS + Prisma application for the API and WebSocket server.
- **firmware/esp32-main**: PlatformIO firmware for the main ESP32 (RFID, Ultrasonic, Lock control).
- **firmware/esp32-cam**: PlatformIO firmware for the ESP32-CAM (Face capture).
- **firmware/shared**: `protocol.h` — the serial contract shared by both boards.
- **docker**: MySQL init scripts used by `docker-compose.yml`.

> `apps/backend` and `apps/frontend` each have their own `node_modules` and
> `package-lock.json` — this is *not* an npm workspaces setup, so install in each folder.

รายละเอียดทั้งหมด (สถาปัตยกรรม, สัญญาระหว่างสามฝั่ง, ขา GPIO, ระบบสิทธิ์) อยู่ใน **`CLAUDE.md`**

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- PlatformIO (for firmware development)

### 1. Database
```bash
docker compose up -d --wait
```

### 2. Backend
```bash
cd apps/backend
npm install
npm run setup                 # สร้าง .env พร้อม token สุ่มให้อัตโนมัติ
npm run db:generate           # สร้าง Prisma client
npm run db:migrate            # สร้างตาราง
             # http://localhost:3001
```

> **ทำไมไม่ commit token ไว้ให้เลย?** repo นี้เป็น public — ถ้า `JWT_SECRET` อยู่ใน git
> ใครก็ปลอม session เป็น ADMIN ได้ และประวัติ git ลบไม่ออก `npm run setup` เลยสุ่มให้
> ทุกคนคนละชุด รันคำสั่งเดียวได้ `.env` ที่ใช้ได้เลย รันซ้ำได้ไม่ทับของเดิม

### 3. Frontend
```bash
cd apps/frontend
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

### 4. Firmware
แต่ละบอร์ดเป็นโปรเจกต์ PlatformIO แยกกัน — `cd` เข้าโฟลเดอร์ก่อนรัน:
```bash
cd firmware/esp32-cam
cp src/secrets.example.h src/secrets.h   # ใส่ Wi-Fi + DEVICE_TOKEN ให้ตรงกับ backend
pio run -t upload

cd ../esp32-main
pio run -t upload
```

## Email notifications for card owners

1. Apply the database migration in `apps/backend` with `npm run db:deploy`, then run `npm run db:generate`.
2. Verify a sending domain with [Resend](https://resend.com/docs/dashboard/domains/introduction). Add `RESEND_API_KEY` and `EMAIL_FROM="Door Lock <alerts@your-domain.com>"` to `apps/backend/.env`, then restart the backend. Keep the key out of the frontend and firmware.
3. In **Admin → User Management**, enter the card owner's email and check **Email owner on each granted scan**. Card owners do not need a dashboard account. Only an admin can change this setting.
4. A successful entry or exit records the access log, then queues one `EmailNotification` job in the background. Email failures do not delay or deny door access. The sender retries temporary failures up to five times and does not notify an admin or an unknown card. If delivery fails permanently, inspect the `EmailNotification` table in Prisma Studio (`npm run db:studio`); if queuing itself fails, check the backend error log.

The `USER` dashboard role is the Guard account for now (existing `employee` logins continue to work). It opens `/guard/dashboard` and can read access history, statistics, and snapshots. The backend rejects user/card management, device commands, and notification setting changes from Guard sessions. Only `ADMIN` accounts can manage RFID cards and owners.

Sending is disabled when the Resend settings are absent. No real email can be verified until a valid provider key and sender domain are configured.
