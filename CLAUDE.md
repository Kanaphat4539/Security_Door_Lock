# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

คำแนะนำสำหรับ Claude Code เมื่อทำงานกับโค้ดในโปรเจกต์นี้

## สถานะปัจจุบันของ repo (อัปเดต 2026-07-20)

**ฝั่งซอฟต์แวร์ใช้งานได้ครบวงจรแล้ว** — backend ต่อ MySQL จริง, dashboard เรียลไทม์ใช้งานได้,
มีระบบล็อกอิน/สิทธิ์ ทุกอย่างถูกทดสอบกับเซิร์ฟเวอร์ที่รันจริง ไม่ใช่แค่คอมไพล์ผ่าน

**สิ่งที่ยังไม่เคยเกิดขึ้นเลยคือการรันบนฮาร์ดแวร์จริง** — เฟิร์มแวร์คอมไพล์ผ่านทั้งสอง env
และขา GPIO ยืนยันกับวงจรแล้ว แต่ยังไม่เคย flash ลงบอร์ด จึงยังไม่มีอะไรในฝั่ง firmware
ที่พิสูจน์แล้วว่าทำงานจริง

| ส่วน | สถานะ | หมายเหตุ |
|---|---|---|
| `firmware/` | โครงสร้าง + ลอจิกตามสเปก คอมไพล์ผ่านทั้ง 2 บอร์ด | ⚠️ ยังไม่เคย flash — `secrets.h` ยังเป็นค่า placeholder |
| `apps/backend/` | `/access` + User CRUD + MySQL/Prisma + WebSocket + auth ครบ | ยังไม่มี HTTPS |
| `apps/frontend/` | Dashboard + User Management + ล็อกอิน/สิทธิ์ + shadcn/ui | ยังไม่มี pagination, ไม่มี test |

**สิ่งที่ยังไม่มีในระบบ:** HTTPS/TLS, CI, test ฝั่ง frontend, การทดสอบกับฮาร์ดแวร์จริง

### ก่อนทดสอบฮาร์ดแวร์ครั้งแรก ต้องแก้ 3 อย่างนี้ก่อน

ตรวจแล้วเมื่อ 2026-07-20 — `DEVICE_TOKEN` ใน `apps/backend/.env` กับ `secrets.h` **ตรงกันแล้ว**
และ Nest bind `0.0.0.0` เรียกจาก LAN ได้จริง แต่:

1. **`kWifiSsid` ยังเป็น `CHANGE_ME`** — CAM จะต่อ Wi-Fi ไม่ติด แล้วทุก request
   จะคืน `RESULT:error` ทันที (ประตูไม่เปิด) โดยไม่มี log บอกสาเหตุ
2. **`kServerUrl` ชี้ไป `192.168.1.100` ซึ่งไม่ใช่ IP ของเครื่องนี้** — ต้องแก้เป็น IP จริง
   ของเครื่องที่รัน backend และควรเป็น IP ที่ไม่เปลี่ยน (จอง DHCP หรือตั้ง static)
3. **ต้องให้ ESP32-CAM กับเครื่องที่รัน backend อยู่วงแลนเดียวกันที่คุยกันได้** —
   เน็ตของสถาบัน/มหาวิทยาลัยมักเปิด client isolation ซึ่งบล็อกอุปกรณ์คุยกันเอง
   ทดสอบครั้งแรกให้ใช้ hotspot มือถือหรือเราเตอร์ของตัวเองจะตัดปัญหานี้ไปได้เลย

อย่าลืมว่า Windows Firewall จะถามสิทธิ์ตอนมี inbound เข้าพอร์ต 3001 ครั้งแรกจากเครื่องอื่น
(เรียกจากเครื่องตัวเองผ่านได้ ไม่ได้แปลว่าเครื่องอื่นจะเรียกได้)

**เวลาไล่ปัญหา ให้ดู log ของ `npm run start:dev` เป็นหลัก** เพราะฝั่ง ESP32-CAM
debug ไม่ได้ (UART0 คือสายที่ต่อไป ESP32 main) — request ไม่มาเลย = เน็ต/firewall,
มาแล้วได้ 401 = token, มาแล้ว 200 = ไปดูฝั่ง firmware ที่ parse ผลลัพธ์

---

## โครงสร้าง repo

```
Door/
├── CLAUDE.md              ← ไฟล์นี้
├── .gitignore             ← ครอบคลุม node_modules, .pio, secrets.h, .env, uploads, generated
├── docker-compose.yml     ← MySQL 8.4 สำหรับ dev
├── docker/mysql-init/     ← SQL ที่รันครั้งแรกตอนสร้าง DB (grant shadow db ให้ Prisma)
│
├── firmware/              ← PlatformIO แยกเป็น 2 โปรเจกต์ (บอร์ดละโปรเจกต์)
│   ├── shared/
│   │   └── protocol.h    ← ⭐ สัญญาการสื่อสารระหว่างสองบอร์ด (ทั้งคู่ include ไฟล์นี้)
│   ├── esp32-main/        ← ESP32 main: RFID x2, ultrasonic, OLED, buzzer, relay
│   │   ├── platformio.ini ← board=esp32dev, -I../shared
│   │   └── src/
│   │       ├── main.cpp   ← state machine เข้า/ออก
│   │       ├── config.h   ← ขา GPIO ทั้งหมด (ยืนยันกับวงจรจริงแล้ว)
│   │       ├── rfid.{h,cpp}        ← RC522 สองตัว คนละ SPI bus (VSPI/HSPI)
│   │       ├── ultrasonic.{h,cpp}  ← HY-SRF05
│   │       ├── display.{h,cpp}     ← OLED SSD1306
│   │       ├── buzzer.{h,cpp}      ← non-blocking
│   │       └── relay.{h,cpp}       ← non-blocking, fail-secure
│   └── esp32-cam/         ← ESP32-CAM: กล้อง + Wi-Fi + TFT
│       ├── platformio.ini ← board=esp32cam, huge_app.csv, -I../shared
│       └── src/
│           ├── main.cpp   ← รับคำสั่งทาง Serial แล้วยิง HTTP multipart
│           ├── config.h   ← ขากล้อง AI-Thinker
│           ├── secrets.example.h   ← ต้นแบบ (commit ได้)
│           └── secrets.h  ← ⚠️ gitignored — ค่า Wi-Fi/URL จริง
│
└── apps/
    ├── apps/backend/           ← Nest.js 11 (npm, TypeScript strict) + Prisma 7 + MySQL
    │   ├── .env.example   ← DATABASE_URL, PORT, UPLOAD_DIR
    │   ├── prisma.config.ts ← ⭐ Prisma 7 อ่าน DATABASE_URL ที่นี่ ไม่ใช่ใน schema
    │   ├── prisma/
    │   │   ├── schema.prisma  ← ⭐ schema จริง (User, AccessLog)
    │   │   └── migrations/    ← ต้อง commit ห้าม gitignore
    │   ├── generated/     ← Prisma client (gitignored, สร้างด้วย db:generate)
    │   ├── scripts/add-card.ts ← CLI เพิ่มบัตร (รันด้วย tsx ไม่ใช่ ts-node)
    │   ├── uploads/       ← ภาพจาก ESP32-CAM (gitignored)
    │   └── src/
    │       ├── prisma/    ← PrismaService (@Global) + PrismaModule
    │       ├── access/    ← POST /access, GET /access/recent
    │       ├── users/     ← CRUD ผู้ใช้/บัตร + dto/ (class-validator)
    │       ├── events/    ← Socket.io gateway (@Global) ยิง event 'access'
    │       └── auth/      ← ⭐ TokenAuthGuard (global) + @Public/@DeviceRoute
    │
    └── apps/frontend/          ← Next.js 16 (App Router, src/, Tailwind, ESLint)
        ├── AGENTS.md      ← ⭐ ต้องอ่านก่อนแก้โค้ด Next.js (breaking changes)
        ├── CLAUDE.md      ← มีบรรทัดเดียว: `@AGENTS.md` (import ไฟล์ข้างบน)
        ├── components.json ← ตั้งค่า shadcn/ui (style, alias, base=radix)
        ├── .env.example   ← NEST_API_URL, NEXT_PUBLIC_WS_URL (ไม่มี token แล้ว)
        └── src/
            ├── app/
            │   ├── page.tsx           ← ภาพรวม (Server Component)
            │   ├── users/page.tsx     ← จัดการผู้ใช้ (Server Component)
            │   ├── login/             ← หน้าล็อกอิน + Server Action
            │   └── api/
            │       ├── [...path]/     ← ⭐ proxy ไป Nest แนบ token ให้
            │       └── ws-ticket/     ← แลก session เป็นตั๋ว WebSocket อายุ 60 วิ
            ├── components/
            │   ├── ui/                ← ⭐ shadcn/ui — โค้ด generate มา แก้ได้ตามใจ
            │   ├── dashboard/         ← *Client.tsx = ฝั่ง client + ตาราง/badge
            │   └── shared/            ← MainNav, ThemeToggle, BackendError
            ├── providers/
            │   └── ThemeProvider.tsx  ← ครอบ next-themes (ใส่คลาส .dark ให้ <html>)
            ├── services/
            │   ├── server-api.ts      ← fetch ฝั่งเซิร์ฟเวอร์ (server-only)
            │   └── api.ts             ← fetch ฝั่ง client ผ่าน proxy
            ├── hooks/
            │   └── useRealtimeAccess.ts ← hook ต่อ socket.io
            ├── types/index.ts         ← type ที่ใช้ร่วมกันทั้งแอป
            └── lib/
                ├── dal.ts             ← requireSession/requireAdmin
                ├── session.ts         ← cookie ของ session
                └── utils.ts           ← cn() ของ shadcn (clsx + tailwind-merge)
```

**หมายเหตุสำคัญ:** โครงสร้างเป็น `apps/` แบบ monorepo ก็จริง แต่ **ไม่ได้ใช้ npm workspaces** —
`apps/backend/` กับ `apps/frontend/` มี `node_modules` และ `package-lock.json` แยกกันคนละชุด
ต้อง `npm install` แยกทีละโฟลเดอร์

---

## คำสั่งสำหรับพัฒนา

> ทุกคำสั่งด้านล่างถูกรันจริงแล้วในวันที่อัปเดต และผ่านทั้งหมด

**การจองพอร์ต (รันพร้อมกันได้ ไม่ชนกันแล้ว):**

| ส่วน | พอร์ต | กำหนดที่ |
|---|---|---|
| frontend (Next.js) | 3000 | ค่า default ของ `next dev` |
| backend (Nest.js) | 3001 | `apps/backend/src/main.ts` (override ด้วย env `PORT`) |

ถ้าเปลี่ยนพอร์ต backend ต้องแก้ `kServerUrl` ใน `firmware/esp32-cam/src/secrets.h` ด้วย
ไม่งั้น ESP32-CAM จะยิง HTTP ไปผิดพอร์ต

### Backend (Nest.js) — จาก `apps/backend/`
```bash
npm install
npm run start:dev      # dev server + watch (พอร์ต 3001 ตาม src/main.ts)
npm run build          # -> dist/
npm run start:prod     # node dist/main
npm run lint           # eslint --fix
npm test               # jest (unit) — ปัจจุบัน 1 suite / 1 test ผ่าน
npm run test:watch
npm run test:cov
npm run test:e2e       # jest --config ./test/jest-e2e.json

# รันเทสต์ไฟล์เดียว / เทสต์เดียว
npx jest src/app.controller.spec.ts
npx jest -t "should return"
```
เทสต์ unit ถูกจับด้วย `testRegex: .*\.spec\.ts$` ส่วน e2e อยู่ใน `test/` แยก config

### ฐานข้อมูล (MySQL ผ่าน Docker) — จาก root ของ repo
```bash
docker compose up -d          # เปิด MySQL 8.4 (พอร์ต 3306)
docker compose down           # ปิด (ข้อมูลยังอยู่)
docker compose down -v        # ปิด + ล้างข้อมูลทั้งหมด
docker compose logs -f mysql  # ดู log ตอนต่อไม่ติด
```
จาก `apps/backend/`:
```bash
npm run db:migrate            # สร้าง/อัปเดตตารางตาม schema.prisma (dev)
npm run db:deploy             # ใช้ตอน deploy — ไม่สร้าง migration ใหม่
npm run db:generate           # generate Prisma client ใหม่หลังแก้ schema
npm run db:studio             # GUI ดู/แก้ข้อมูลในตาราง
npm run db:add-card -- A1B2C3D4 "ธีรภัทร ทองสิงห์"   # เพิ่มบัตร
```

**ขั้นตอนตอน clone ใหม่:** `docker compose up -d --wait` →
`cd apps/backend && npm install && npm run setup && npm run db:generate && npm run db:migrate`

`npm run setup` (scripts/setup-env.ts) สร้าง `.env` พร้อมสุ่ม `DASHBOARD_TOKEN`, `DEVICE_TOKEN`,
`JWT_SECRET`, `ADMIN_INVITE_CODE` ให้อัตโนมัติ — **จงใจไม่ commit ค่าพวกนี้ลง repo เพราะ
repo นี้เป็น public** ใครได้ `JWT_SECRET` ไปก็ปลอม session เป็น ADMIN ได้ทันที
สคริปต์รันซ้ำได้ ไม่ทับค่าเดิม (เติมเฉพาะ key ที่ยังขาด) จะได้ไม่ล้าง `DEVICE_TOKEN`
ที่ตรงกับบอร์ดที่ flash ไปแล้ว

**ทุก request ต้องมี token** — ดึงจาก `.env` มาใส่ตัวแปรก่อนจะสะดวก:
```bash
DASH=$(grep DASHBOARD_TOKEN .env | cut -d= -f2)
DEV=$(grep DEVICE_TOKEN .env | cut -d= -f2)
```

**ทดสอบ `POST /access` ด้วยมือ (ไม่ต้องมีบอร์ด)** — จำลองสิ่งที่ ESP32-CAM ส่ง
(ใช้ `$DEV` เพราะเป็น route ที่บอร์ดเรียก):
```bash
npm run db:add-card -- A1B2C3D4 "ทดสอบ"   # ต้องมีบัตรใน DB ก่อน
npm run start:dev

# ขาเข้า + แนบภาพ -> granted
curl -X POST http://localhost:3001/access -H "Authorization: Bearer $DEV" \
  -F "uid=A1B2C3D4" -F "direction=in" -F "image=@some.jpg;type=image/jpeg"

# ขาออก ไม่มีภาพ -> granted
curl -X POST http://localhost:3001/access -H "Authorization: Bearer $DEV" \
  -F "uid=A1B2C3D4" -F "direction=out"

# บัตรที่ไม่รู้จัก -> denied (แต่ยังเก็บภาพไว้เป็นหลักฐาน)
curl -X POST http://localhost:3001/access -H "Authorization: Bearer $DEV" \
  -F "uid=DEADBEEF" -F "direction=in"

curl -H "Authorization: Bearer $DASH" http://localhost:3001/access/recent
```

**ทดสอบ User API** (ต้องใช้ `$DASH` — `$DEV` จะโดน 401):
```bash
curl -X POST http://localhost:3001/users \
  -H "Authorization: Bearer $DASH" -H "Content-Type: application/json" \
  -d '{"uid":"A1B2C3D4","name":"Somchai"}'

curl -H "Authorization: Bearer $DASH" http://localhost:3001/users
curl -H "Authorization: Bearer $DASH" http://localhost:3001/users/unassigned-uids
curl -X PATCH http://localhost:3001/users/1 \
  -H "Authorization: Bearer $DASH" -H "Content-Type: application/json" \
  -d '{"isActive":false}'

curl http://localhost:3001/            # health check ไม่ต้องใช้ token
```

⚠️ **ถ้าจะทดสอบชื่อภาษาไทยด้วย curl ให้ส่งจากไฟล์ ไม่ใช่ `-d` ตรง ๆ**
เพราะ terminal บน Windows อาจแปลง encoding จน byte เพี้ยนก่อนถึง curl
แล้วจะได้ `?????` เก็บลง DB (เคยเจอมาแล้ว — ตัว API กับ DB ไม่ได้ผิด):
```bash
curl -X POST http://localhost:3001/users -H "Authorization: Bearer $DASH" \
  -H "Content-Type: application/json" \
  --data-binary @user.json      # user.json ต้องเป็น UTF-8
```

### Frontend (Next.js) — จาก `apps/frontend/`
```bash
npm install
cp .env.example .env.local   # แล้วใส่ DASHBOARD_TOKEN ให้ตรงกับ apps/backend/.env
npm run dev            # http://localhost:3000
npm run build
npm start              # ต้อง build ก่อน
npm run lint
```

ยังไม่มี test runner ฝั่ง frontend — `create-next-app` ไม่ได้ติดตั้งมาให้

### Firmware (PlatformIO) — บอร์ดละโปรเจกต์
⚠️ `pio` **ไม่ได้อยู่ใน PATH** บนเครื่องนี้ (ติดตั้งมากับ VSCode extension)
ต้องเรียกด้วย path เต็ม หรือเพิ่ม `C:\Users\TEE\.platformio\penv\Scripts` เข้า PATH ก่อน

แต่ละบอร์ดเป็นโปรเจกต์ PlatformIO ของตัวเอง — **ต้อง `cd` เข้าโฟลเดอร์นั้นก่อนรัน**
(ไม่ใช่ `-e main` / `-e cam` แบบ repo เดิมที่รวมสองบอร์ดไว้ใน platformio.ini เดียว)

```bash
PIO="C:/Users/TEE/.platformio/penv/Scripts/pio.exe"

cd firmware/esp32-main            # หรือ firmware/esp32-cam
$PIO run                          # build
$PIO run -t upload                # flash (ต่อบอร์ดก่อน)
$PIO run -t upload --upload-port COM3
$PIO device monitor -b 115200     # serial monitor
$PIO run -t clean
$PIO device list                  # ดูว่าบอร์ดอยู่ COM ไหน
```

`firmware/shared/protocol.h` ถูกดึงเข้าทั้งสองโปรเจกต์ผ่าน `-I$PROJECT_DIR/../shared`
ใน `platformio.ini` — แก้ที่ไฟล์เดียวมีผลทั้งสองบอร์ด

**ก่อน build ครั้งแรก** ต้องมี `firmware/esp32-cam/src/secrets.h` (มีอยู่แล้วพร้อมค่า placeholder)
ถ้า clone ใหม่แล้วไม่มี ให้ `cp src/secrets.example.h src/secrets.h` (จาก `firmware/esp32-cam/`)

ESP32-CAM ไม่มี USB-serial ในตัว ต้องใช้ FTDI และต่อ `GPIO0 -> GND` ตอน flash

### git
push ขึ้น remote `origin` (GitHub, repo `Security_Door_Lock` ของ Kanaphat4539) ทำงานบน branch ของตัวเอง
`TEAM.local.md`, `.env`, `secrets.h` ถูก gitignore ไว้ทั้งหมด — อย่าเผลอ commit เข้าไป

## ภาพรวมโปรเจกต์

**ชื่อโครงงาน:** Security Door Lock — ระบบควบคุมการเข้า-ออกประตูอัจฉริยะด้วยบัตร RFID ร่วมกับกล้อง IoT

ระบบควบคุมการเข้า-ออกประตูด้วยบัตร RFID แบบ 2 ทิศทาง (เข้า/ออก) ร่วมกับกล้องบันทึกภาพอัตโนมัติฝั่งขาเข้า เชื่อมต่อกับเซิร์ฟเวอร์เพื่อตรวจสอบสิทธิ์และบันทึกประวัติการใช้งานแบบเรียลไทม์

**ทีมพัฒนา:** 4 คน แบ่งงานเป็น Backend & Database / Frontend Dashboard /
Hardware & Camera / Hardware & IoT

รายชื่อและรหัสนักศึกษาอยู่ใน `TEAM.local.md` ซึ่งถูก gitignore ไว้ (เป็นข้อมูลส่วนบุคคล
จึงไม่เก็บใน repo) — ถ้า clone มาใหม่จะไม่มีไฟล์นี้ ซึ่งไม่กระทบการพัฒนา

---

## สถาปัตยกรรมระบบ

```
[RFID Reader 1 (เข้า)] ─┐
[RFID Reader 2 (ออก)] ──┼──► [ESP32 (main)] ◄──Serial/UART──► [ESP32-CAM] ◄──Wi-Fi/HTTP──► [Nest.js API] ◄──► [MySQL]
[Ultrasonic Sensor] ────┘         │                                                              ▲
                                   ▼                                                              │
                     [OLED] [TFT*] [Buzzer] [Relay→Solenoid Lock]                    [Next.js Dashboard]
```

**สำคัญ:** `ESP32 (main)` **ไม่มี Wi-Fi module เป็นของตัวเอง** จุดเชื่อมต่อ Wi-Fi ของทั้งระบบมีอยู่ที่ `ESP32-CAM` เพียงจุดเดียวเท่านั้น ดังนั้นข้อมูลทุกอย่างที่ออกไปยังเซิร์ฟเวอร์ (ทั้งขาเข้าและขาออก) ต้องส่งผ่าน ESP32-CAM เสมอ โดยฝั่งขาออกจะไม่แนบไฟล์ภาพไปด้วย

*TFT LCD ต่อกับ ESP32-CAM โดยตรง (แสดงภาพสด/สตรีมมิ่งจากกล้อง)

---

## อุปกรณ์ฮาร์ดแวร์ (Bill of Materials)

**Input:**
- RC522 RFID module x2 (ตัวที่ 1 = ขาเข้า, ตัวที่ 2 = ขาออก)
- Ultrasonic Module (HY-SRF05) — ตรวจจับระยะห่างผู้ใช้งาน

**Processing:**
- ESP32 Dev Board (main controller)
- ESP32-CAM (ถ่ายภาพ + จุดเชื่อมต่อ Wi-Fi หลัก)

**Output:**
- TFT LCD (แสดงภาพสด, ต่อกับ ESP32-CAM)
- OLED Display (แสดงข้อความสถานะ, ต่อกับ ESP32)
- Active Buzzer (เสียงแจ้งเตือน)
- Relay + Solenoid Electromagnetic Door Lock LY-03 12V/0.6A

**Software stack:**
- Firmware: Arduino C++ (ESP32 / ESP32-CAM)
- Backend: Nest.js (TypeScript) + MySQL
- Frontend: Next.js Dashboard + WebSocket client (real-time)

---

## ขา GPIO (ยืนยันกับวงจรจริงแล้ว)

ค่าจริงอยู่ที่ `firmware/esp32-main/src/config.h` และ `firmware/esp32-cam/src/config.h` — **แก้ที่ไฟล์นั้น ไม่ใช่ตารางนี้**

### ESP32 (main)
| อุปกรณ์ | ขา |
|---|---|
| RFID ขาเข้า (VSPI) | RST=27, SS=5, SCK=18, MISO=19, MOSI=23 |
| RFID ขาออก (HSPI) | RST=2, SS=4, SCK=14, MISO=12, MOSI=13 |
| Ultrasonic HY-SRF05 | Trig=33, Echo=32 |
| Relay | 26 |
| Buzzer | 25 |
| OLED (I2C) | SDA=21, SCL=22 |
| UART2 → ESP32-CAM | TX2=17, RX2=16 |

### ESP32-CAM
| อุปกรณ์ | ขา |
|---|---|
| กล้อง | ชุดมาตรฐาน AI-Thinker |
| TFT ST7735 | MOSI=13, SCLK=14, CS=15, DC=2 |
| UART0 → ESP32 main | RX=3, TX=1 |

### ผลที่ตามมา 2 ข้อที่ต้องรู้ก่อนแก้โค้ด

**1. หัวอ่าน RFID สองตัวอยู่คนละ SPI bus** (ขาเข้า=VSPI, ขาออก=HSPI)
ทำให้ใช้ `miguelbalboa/MFRC522` v1.x **ไม่ได้** เพราะไลบรารีนั้นเรียก global `SPI`
ตายตัวในโค้ด (`SPI.beginTransaction`/`SPI.transfer`) ซึ่งผูกกับ VSPI เท่านั้น
โปรเจกต์จึงใช้ **`computer991/Arduino_MFRC522v2`** ที่รับ `SPIClass&` เข้ามาได้:
```cpp
SPIClass gSpiEntry(VSPI);  MFRC522DriverSPI gDriverEntry(gSsEntry, gSpiEntry);
SPIClass gSpiExit(HSPI);   MFRC522DriverSPI gDriverExit(gSsExit, gSpiExit);
```
MFRC522v2 ไม่รับขา RST ทาง driver (ใช้ soft reset) แต่วงจรต่อ RST ไว้จริง
`rfidBegin()` จึงดึงขา RST ขึ้น HIGH เองก่อนเรียก `PCD_Init()`

**2. ลิงก์ฝั่ง ESP32-CAM คือ UART0 ซึ่งเป็นพอร์ตเดียวกับ USB-serial**
⚠️ **ห้าม `Serial.print()` debug ในโค้ดฝั่ง ESP32-CAM เด็ดขาด** — ทุกไบต์จะวิ่งไปเข้า
ESP32 (main) แล้วถูก parse เป็นคำสั่งมั่ว ใน `src/cam/main.cpp` จึงใช้แมโคร `LOGF/LOGLN`
ที่คอมไพล์ทิ้งไปเลยโดยค่าเริ่มต้น ถ้าจำเป็นต้อง debug ให้ต่อ UART อีกชุดแล้ว build ด้วย
`-DCAM_DEBUG=1` (จะส่งออก `HardwareSerial(1)` แทน)

ฝั่ง ESP32 (main) ใช้ UART2 (16/17) แยกจาก USB จึง `Serial.print()` debug ได้ตามปกติ

---

## ตรรกะการทำงานของเฟิร์มแวร์ (Firmware Logic)

### ฝั่งทางเข้า (Entry — RFID Reader 1)

1. Initialize: เปิดใช้งาน RFID, Ultrasonic, หน้าจอ, ลำโพง ที่ ESP32 / เปิด Wi-Fi + กล้องที่ ESP32-CAM
2. วนลูปอ่านค่า Ultrasonic:
   - ระยะ < 100 ซม.? **ไม่ใช่** → OLED แสดง "สแตนด์บาย", ปิดจอ TFT, กลับไปวนอ่านค่าใหม่
   - **ใช่** → เปิดจอ TFT + เริ่มสตรีมภาพสด
3. ระยะ < 45 ซม. (ประชิด)? **ใช่** → ถ่ายภาพนิ่งเก็บล่วงหน้า 1 ภาพ
4. มีการทาบบัตร RFID1? **ไม่ใช่** → วนกลับไปอ่านค่าเซนเซอร์ใหม่
5. **ใช่** → อ่านรหัส UID → สั่ง ESP32-CAM ถ่ายภาพซ้ำตอนสแกนบัตร
6. ส่งข้อมูล `{ uid, direction: "in", image }` ผ่าน ESP32-CAM (HTTP POST) ไปเซิร์ฟเวอร์
7. รอรับ JSON `{ status: "granted" | "denied" }`
8. **granted:** OLED "อนุญาต" → buzzer สั้น (0.2s) → Relay ON → delay 5s → Relay OFF
9. **denied:** OLED "ไม่อนุญาต" → buzzer ยาว (3s) → ประตูคงสถานะล็อกเดิม
10. วนกลับไปข้อ 2

### ฝั่งทางออก (Exit — RFID Reader 2)

ทำงานคู่ขนานกับฝั่งทางเข้า ไม่เช็คระยะ Ultrasonic เช็คเฉพาะการทาบบัตร:

1. มีการทาบบัตร RFID2? **ไม่ใช่** → วนรอใหม่
2. **ใช่** → อ่านรหัส UID (**ไม่ถ่ายภาพ**)
3. ส่งข้อมูล `{ uid, direction: "out" }` ผ่าน ESP32-CAM (ไม่มีไฟล์ภาพแนบ) ไปเซิร์ฟเวอร์
4. รอรับ JSON `{ status: "granted" | "denied" }`
5. **granted:** buzzer ดัง 1 ครั้ง → ปลดล็อกประตู 5 วินาที → ล็อกกลับ
6. **denied:** buzzer ดังยาว → ประตูไม่เปิด (คงสถานะล็อก)
7. วนกลับไปข้อ 1

### โปรโตคอลสื่อสาร ESP32 (main) ↔ ESP32-CAM

**implement แล้ว** — ค่าคงที่ทั้งหมดอยู่ที่ `firmware/shared/protocol.h` ซึ่งถูกคอมไพล์เข้าไป
ในทั้งสอง env เพื่อกันสตริงพิมพ์ผิดคนละฝั่ง **แก้โปรโตคอลต้องแก้ที่ไฟล์นี้ไฟล์เดียว**

ESP32 main → ESP32-CAM:
```
IN:<uid>    → ถ่ายภาพ + POST {uid, direction:"in", image}
OUT:<uid>   → POST {uid, direction:"out"} (ไม่ถ่ายภาพ)
WAKE        → เปิด TFT + สตรีมภาพสด   (ระยะ < 100cm)
SLEEP       → ปิด TFT กลับสแตนด์บาย
PRECAP      → ถ่ายภาพนิ่งเก็บล่วงหน้า   (ระยะ < 45cm)
```
ESP32-CAM → ESP32 main:
```
RESULT:granted | RESULT:denied | RESULT:error
```
`error` = ต่อเซิร์ฟเวอร์ไม่ได้/timeout (10s) — ฝั่ง main ปฏิบัติเหมือน `denied` คือประตูคงล็อก

การส่งข้อมูลจริงใช้ **multipart/form-data** (fields: `uid`, `direction`, ไฟล์ `image`)
ไม่ใช่ JSON+base64 — endpoint ฝั่ง backend ต้องรับ multipart ให้ตรงกัน

**ยังไม่ implement:** คำสั่ง `WAKE`/`SLEEP` ฝั่ง ESP32-CAM ยังเป็น stub เปล่า
รุ่นจอยืนยันแล้วว่าเป็น ST7735 (ขา 13/14/15/2) แต่ยังไม่ได้เพิ่มไลบรารี TFT
เข้า `platformio.ini` — ดู `handleCommand()` ใน `src/cam/main.cpp`

---

## Backend (Nest.js + MySQL)

**Endpoint หลัก:** `POST /access` — **ทำแล้ว** อยู่ที่ `apps/backend/src/access/`
(ฝั่ง firmware ยิงไปที่ URL นี้ตาม `kServerUrl` ใน `firmware/esp32-cam/src/secrets.h`)

| route | ใช้ทำอะไร |
|---|---|
| `POST /access` | รับ multipart จาก ESP32-CAM ตอบ `{ "status": "granted" \| "denied" }` |
| `GET /access/recent` | ดู log 50 รายการล่าสุด |

### Authentication (`src/auth/`)

ทุก route และการเชื่อม WebSocket ต้องมี credential **ยกเว้น** `GET /` (health check)
กับ `POST /auth/login`

| credential | ใครใช้ | เรียกอะไรได้ | อายุ |
|---|---|---|---|
| session JWT (ADMIN) | ผู้ดูแลที่ล็อกอิน | ทุก route (ยกเว้น device-only) | 8 ชม. |
| session JWT (USER) | ผู้ชมที่ล็อกอิน | **ทุก route ยกเว้น `/users/*`** | 8 ชม. |
| ตั๋ว WebSocket | เบราว์เซอร์ของคนที่ล็อกอินแล้ว | **ต่อ WebSocket ได้อย่างเดียว** | 60 วินาที |
| `DASHBOARD_TOKEN` | สคริปต์/curl/เครื่องมือ dev | ทุก route (เทียบเท่า ADMIN) | ไม่หมดอายุ |
| `DEVICE_TOKEN` | ESP32-CAM | **เฉพาะ** `POST /access` | ไม่หมดอายุ |

```
Authorization: Bearer <token>
```

**บัญชี dashboard อยู่ในตาราง `Admin`** — คนละเรื่องกับตาราง `User` ที่เป็นเจ้าของบัตร RFID
(มีบัตรเข้าประตูได้ ไม่ได้แปลว่าเข้า dashboard ได้ และกลับกัน)

### สิทธิ์ (role) — `ADMIN` กับ `USER`

| role | ทำอะไรได้ | ได้มายังไง |
|---|---|---|
| `ADMIN` | ทุกอย่าง รวมถึงเพิ่ม/ลบบัตร และดูประวัติรายบุคคล | **CLI เท่านั้น** |
| `USER` | ดูหน้าภาพรวม (KPI + log เรียลไทม์) เท่านั้น | สมัครเองผ่านหน้าเว็บด้วยรหัสเชิญ |

```bash
npm run db:add-admin -- <username> <password>   # สร้าง ADMIN / เลื่อนขั้นคนเดิม
```

**สมัครเองได้แค่ `USER` โดยตั้งใจ** — ถ้ารหัสเชิญรั่ว คนที่ได้ไปก็ยังแตะบัตรไม่ได้
การจะเป็น `ADMIN` ต้องรันคำสั่งจากเครื่องที่รัน backend เท่านั้น

⚠️ **`db:add-admin` เวอร์ชันก่อนหน้าไม่ได้ตั้ง role** บัญชีที่สร้างไว้ก่อนหน้านี้
จะกลายเป็น `USER` (ค่า default ของคอลัมน์) ให้รันคำสั่งเดิมซ้ำเพื่อเลื่อนเป็น `ADMIN`

**การบังคับสิทธิ์:** `@AdminOnly()` ติดไว้ที่ระดับคลาสของ `UsersController`
จะได้ไม่ลืมเวลาเพิ่ม route ใหม่ — role `USER` ที่เรียกเข้ามาได้ `403`

**รหัสเชิญ (`ADMIN_INVITE_CODE`)** อยู่ใน `apps/backend/.env`
**ถ้าไม่ตั้งค่านี้ = ปิดการสมัครทั้งหมด** (fail-closed) เปลี่ยนค่าใหม่ได้ตลอด
คนที่สมัครไปแล้วไม่ได้รับผลกระทบ

**รหัสผ่านเก็บด้วย scrypt** (`src/auth/password.ts`) ที่มากับ Node ไม่ต้องพึ่ง
bcrypt/argon2 ซึ่งต้อง compile native module (มักมีปัญหาบน Windows)
เก็บเป็น `scrypt:<salt>:<hash>` จะได้เปลี่ยนอัลกอริทึมทีหลังได้โดยดูจาก prefix

**ตั๋ว WebSocket แก้ปัญหาอะไร:** เบราว์เซอร์ต่อ WebSocket ตรงไปที่ Nest จึงต้องถือ
credential ไว้จริง ๆ เดิมเราส่ง `DASHBOARD_TOKEN` ตัวจริงไปให้ (ซึ่งเรียก REST ได้ทุก
route และไม่มีวันหมดอายุ) ตอนนี้ Nest ออกตั๋วใบเล็กที่ `typ: 'ws'` อายุ 60 วินาที
ตรวจแล้วว่า **session JWT ใช้ต่อ WebSocket ไม่ได้** และ **ตั๋วหมดอายุแล้วต่อไม่ได้**

**ทำไมต้องแยก token 2 ใบ:** token ที่ฝังในเฟิร์มแวร์ดึงออกจากบอร์ดที่ flash แล้วได้
(อ่าน flash ตรง ๆ) ถ้าใช้ใบเดียวกัน คนที่หยิบบอร์ดไปได้จะเพิ่ม/ลบผู้ใช้
และดูประวัติทุกคนได้ทันที แยกไว้แล้ว token ของบอร์ดทำได้แค่ส่ง log เข้ามา

**การใช้งานในโค้ด:**
- default = ต้องมี session (role ไหนก็ได้) หรือ `DASHBOARD_TOKEN`
- `@AdminOnly()` = ต้องเป็น role `ADMIN` (ทั้ง `UsersController`)
- `@DeviceRoute()` = รับ `DEVICE_TOKEN` ด้วย (ตอนนี้มีที่เดียวคือ `POST /access`)
- `@Public()` = ไม่ต้องมี credential เลย (`GET /`, `POST /auth/login`, `POST /auth/register`)

**รายละเอียดที่ตั้งใจทำ:**
- เทียบ token ด้วย `timingSafeEqual` กันการเดาทีละไบต์จากเวลาที่ใช้ตอบ
- ข้อความ error ไม่แยกระหว่าง "token ผิด" กับ "สิทธิ์ไม่พอ" เพื่อไม่ให้ใช้ไล่เดา
- เซิร์ฟเวอร์ **ไม่ยอมบูต** ถ้าไม่ได้ตั้ง `DASHBOARD_TOKEN`/`DEVICE_TOKEN`
  (กันการเผลอรันแบบเปิดโล่ง)
- ฝั่งเฟิร์มแวร์เก็บ token ไว้ใน `firmware/esp32-cam/src/secrets.h` ซึ่ง gitignore ไว้
  **ถ้าเปลี่ยน `DEVICE_TOKEN` ใน `.env` ต้อง flash ESP32-CAM ใหม่ด้วย**
  ไม่งั้นจะได้ 401 แล้วฝั่ง firmware จะตีความเป็น `RESULT:error` → ประตูไม่เปิด
- **ถ้าเปลี่ยน `JWT_SECRET` ทุกคนจะหลุด session ต้องล็อกอินใหม่**

⚠️ **ที่ยังไม่ได้ทำ:**
- **ไม่มี HTTPS** — รหัสผ่านตอนล็อกอินและ token ทั้งหมดวิ่งเป็น plaintext บน LAN
  ใครดักจับ traffic ได้ก็เอาไปใช้ต่อได้ นี่คือช่องโหว่ที่ใหญ่ที่สุดที่เหลืออยู่
- ไม่มีการจำกัดจำนวนครั้งที่ลองล็อกอินผิด (brute-force ได้)
- ไม่มีการ revoke session กลางคัน (JWT ใช้ได้จนหมดอายุ 8 ชม. แม้ลบ Admin แล้ว)
- **`USER` ยังเห็น log ของทุกคนบนหน้าภาพรวม** — role นี้คือ "ผู้ชมแบบอ่านอย่างเดียว"
  ไม่ใช่กำแพงความเป็นส่วนตัว ถ้าต้องการให้เห็นเฉพาะของตัวเอง ต้องผูก `Admin`
  เข้ากับ `User` (เจ้าของบัตร) ก่อน ซึ่งตอนนี้ยังไม่มีความสัมพันธ์นั้น
- ไม่มีหน้าจัดการบัญชี dashboard (ดู/ลบ/เปลี่ยน role) ต้องทำผ่าน CLI หรือ SQL

### User Management API (`src/users/`)

| route | ใช้ทำอะไร | ผลลัพธ์ที่ควรได้ |
|---|---|---|
| `GET /users` | รายชื่อทั้งหมด + จำนวนครั้งที่ทาบบัตร (`_count.logs`) | 200 |
| `GET /users/unassigned-uids` | ⭐ UID ที่เคยทาบแต่ยังไม่มีเจ้าของ | 200 |
| `GET /users/:id` | ดูผู้ใช้คนเดียว | 200 / 404 |
| `GET /users/:id/logs` | ประวัติเข้า-ออกรายบุคคล (50 ล่าสุด) | 200 / 404 |
| `POST /users` | เพิ่มบัตร `{ uid, name, isActive? }` | 201 / 400 / 409 |
| `PATCH /users/:id` | แก้ `{ name?, isActive? }` | 200 / 404 |
| `DELETE /users/:id` | ลบผู้ใช้ (log ยังอยู่ userId เป็น null) | 200 / 404 |

**`GET /users/unassigned-uids` คือหัวใจของการลงทะเบียนบัตร** — คืน UID ที่เคยถูกทาบ
แต่ยังไม่มีแถวใน `User` พร้อมจำนวนครั้งและเวลาที่เห็นล่าสุด
flow ที่ตั้งใจไว้: เอาบัตรใหม่ไปทาบที่เครื่องอ่าน → เปิดหน้า User Management →
เลือก UID จากลิสต์นี้ → ใส่ชื่อ → บันทึก (ไม่ต้องไปไล่อ่าน UID จาก log เอง)

**ข้อควรระวังเรื่องลำดับ route:** `@Get('unassigned-uids')` ต้องประกาศ**ก่อน** `@Get(':id')`
ไม่งั้น Nest จะจับคำว่า `unassigned-uids` เป็นค่า `:id` แล้ว `ParseIntPipe` จะโยน 400

**ตั้งใจไม่ให้แก้ `uid` ผ่าน `PATCH`** เพราะ `AccessLog` อ้างอิงบัตรใบเดิมอยู่
ถ้าต้องเปลี่ยนบัตรให้ลบผู้ใช้แล้วสร้างใหม่ ประวัติเดิมจะยังอยู่โดย `userId` เป็น null

**Validation:** เปิด `ValidationPipe` แบบ global ไว้ใน `main.ts` (`whitelist` + `transform`)
DTO อยู่ที่ `src/users/dto/` — `uid` ถูกบังคับเป็น hex และ normalize เป็นตัวพิมพ์ใหญ่
ตั้งแต่ชั้น DTO จึงส่งมาเป็นพิมพ์เล็กได้ ไม่กระทบ `POST /access` เพราะ body ที่นั่น
ไม่ได้ผูกกับคลาส DTO (ValidationPipe ข้าม native type)

**การตรวจสิทธิ์:** `granted` ต่อเมื่อมีแถวใน `User` ที่ `uid` ตรงกัน **และ** `isActive = true`
บัตรที่ไม่รู้จักหรือถูกปิดใช้งานได้ `denied` แต่ยังบันทึกลง `AccessLog` เสมอ
(บัตรไม่รู้จัก -> `userId` เป็น null) — ทุกอย่างอยู่ใน `AccessService.authorize()`

uid ถูก normalize เป็นตัวพิมพ์ใหญ่ทั้งตอนค้นหาและตอนบันทึก ทั้งใน service
และใน `db:add-card` จึงไม่ต้องกังวลว่าฝั่ง firmware จะส่งมาเป็นพิมพ์เล็กหรือใหญ่

รูปแบบที่ firmware ส่งจริงคือ `multipart/form-data` ไม่ใช่ JSON:

| field | ขาเข้า | ขาออก |
|---|---|---|
| `uid` | ✅ เช่น `A1B2C3D4` | ✅ |
| `direction` | `"in"` | `"out"` |
| `image` | ✅ ไฟล์ `capture.jpg` (image/jpeg) | ❌ ไม่ส่ง |

การรับ multipart ใน Nest ต้องติดตั้ง `@nestjs/platform-express` + `multer` (ยังไม่ได้ติดตั้ง)

**ลอจิกการประมวลผล:**
1. เชื่อมต่อ MySQL → ค้นหา UID ในตาราง `Users`
2. พบ UID และสถานะบัตรใช้งานได้?
   - **ใช่:** `response = "granted"` → บันทึกไฟล์ภาพ (ถ้ามี) ลง Server Folder → Insert log สถานะ "เข้าใช้งานสำเร็จ" (หรือ "ออกสำเร็จ" ตาม direction)
   - **ไม่ใช่:** `response = "denied"` → บันทึกไฟล์ภาพ (ถ้ามี, เพื่อเก็บหลักฐาน) → Insert log สถานะ "ปฏิเสธการเข้าถึง"
3. ส่ง JSON กลับ: `{ "status": "granted" | "denied" }`

**โครงสร้างฐานข้อมูล — ของจริงอยู่ที่ `apps/backend/prisma/schema.prisma` (แก้ที่นั่น ไม่ใช่ที่นี่)**

| model | field สำคัญ |
|---|---|
| `Admin` | `id`, `username` (unique), `passwordHash`, `role` (`ADMIN`/`USER`) |
| `User` | `id`, `uid` (unique), `name`, `isActive`, `createdAt`, `updatedAt` |
| `AccessLog` | `id`, `uid`, `direction`, `status`, `imagePath?`, `userId?`, `createdAt` |

จุดออกแบบที่ตั้งใจไว้ 3 ข้อ:
- **`AccessLog.uid` เก็บซ้ำแยกจาก relation** เพราะบัตรที่ไม่รู้จักไม่มีแถวใน `User`
  ให้อ้างอิง และถ้าผู้ใช้ถูกลบทีหลัง log ก็ยังบอกได้ว่าบัตรใบไหนมาทาบ
- **`onDelete: SetNull`** ลบผู้ใช้แล้วประวัติไม่หายตาม (สำคัญเพราะเป็น log ความปลอดภัย)
- **enum ใน Prisma ใช้ค่าตัวพิมพ์เล็ก** (`in`/`out`, `granted`/`denied`) ตรงกับที่ firmware
  ส่งมาและที่ frontend ใช้เป๊ะ ๆ จึงไม่ต้องมีโค้ดแปลงค่าตรงกลางให้พลาด

**Prisma 7 ต่างจาก v6 หลายจุด — อ่านก่อนแก้อะไรที่เกี่ยวกับ Prisma:**

- ต้องส่ง **driver adapter** เข้า `PrismaClient` เสมอ ไม่อ่าน `DATABASE_URL` ให้เอง
  MySQL ใช้ `@prisma/adapter-mariadb` (ไม่มี `@prisma/adapter-mysql` — ไม่ต้องไปหา)
  ดู `src/prisma/prisma.service.ts`
- URL ของ datasource อยู่ใน `prisma.config.ts` ไม่ได้อยู่ใน `schema.prisma`
- client generate ไปที่ `apps/backend/generated/` (gitignore ไว้ — สร้างใหม่ด้วย `npm run db:generate`)
- generator ตั้ง `moduleFormat = "cjs"` ไว้ **ห้ามเอาออก** ค่า default เป็น ESM ที่ใช้
  `import.meta` แล้วทั้ง jest และ ts-node จะพังทันที
- client ที่ generate มาเป็นซอร์ส `.ts` ที่ import กันเองด้วยนามสกุล `.js`
  ผลที่ตามมา 2 อย่าง:
  1. **jest resolve ไม่ได้** — เทสต์ที่แตะ service ซึ่งต่อกับ Prisma ต้อง
     `jest.mock('../../generated/prisma/client', () => ({ PrismaClient: class {} }))`
     ดูหัวไฟล์ `access.service.spec.ts`
  2. **ts-node รันไม่ได้** — สคริปต์ใน `scripts/` จึงใช้ `tsx` แทน
- `tsc` คอมไพล์ `generated/` กับ `scripts/` เข้าไปใน `dist/` ด้วย ทำให้ entry point
  ย้ายไปอยู่ที่ `dist/src/main.js` (ไม่ใช่ `dist/main.js`) — `start:prod` ชี้ไว้ถูกแล้ว

**shadow database:** `prisma migrate dev` ต้องสร้าง DB ชั่วคราวเพื่อตรวจ migration
ผู้ใช้ `doorlock` ไม่มีสิทธิ์สร้าง DB โดยปริยาย จะได้ error P3014
แก้ไว้แล้วด้วย `docker/mysql-init/01-shadow-db-grant.sql` ซึ่งรันอัตโนมัติตอนสร้าง volume
**สคริปต์นี้รันครั้งแรกครั้งเดียว** ถ้าแก้แล้วอยากให้มีผลต้อง `docker compose down -v` ก่อน

## WebSocket (real-time) — `src/events/`

Socket.io gateway ยิง log ไปหา dashboard ทันทีที่มีการทาบบัตร ไม่ต้องรอ refresh

| ชื่อ event | ยิงเมื่อไหร่ | payload |
|---|---|---|
| `access` | ทุกครั้งที่ทาบบัตร ทั้ง granted และ denied | `AccessAttempt` |

payload หน้าตาเหมือนกับที่ `GET /access/recent` คืนมาทุกประการ:
```json
{ "id": 4, "uid": "DEADBEEF", "direction": "out", "status": "denied",
  "imagePath": null, "userName": null, "createdAt": "2026-07-19T15:36:14.553Z" }
```
`userName` เป็น `null` เมื่อเป็นบัตรที่ไม่รู้จัก / `imagePath` เป็น `null` ตอนขาออก

**ชื่อ event อยู่ใน `WS_EVENTS` ที่ `src/events/events.types.ts`** ฝั่ง frontend ควรอ้างค่าเดียวกัน
อย่าพิมพ์สตริง `'access'` เองกระจายหลายที่

ตัวอย่างฝั่ง Next.js:
```ts
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001');
socket.on('access', (log) => { /* prepend เข้าตาราง */ });
```

**จุดที่ตั้งใจออกแบบไว้:**
- ยิง event **หลัง** commit ลง DB สำเร็จแล้วเท่านั้น dashboard จะไม่เห็นรายการที่ยังไม่ถูกบันทึก
- `emitAccess()` กลืน error ทิ้ง (try/catch) — ถ้า WebSocket มีปัญหา **การเปิดประตูต้องทำงานต่อได้**
  ตัวตัดสินสิทธิ์ไม่ควรพังเพราะ dashboard ไม่ได้เชื่อมต่อ
- CORS ตั้งที่ `WS_CORS_ORIGIN` (ค่า default `http://localhost:3000`) เพราะ backend
  อยู่คนละพอร์ตกับ frontend

**การเชื่อมต่อต้องมีตั๋ว** ที่ขอจาก `/api/ws-ticket` ฝั่ง Next (ต้องล็อกอินก่อน):
```ts
const { url, ticket } = await (await fetch("/api/ws-ticket")).json();
const socket = io(url, { auth: { token: ticket } });
```
ตรวจที่ชั้น **middleware ตอน handshake** (`afterInit`) ไม่ใช่ใน `handleConnection`
เพราะถ้าปล่อยให้ต่อสำเร็จก่อนแล้วค่อย disconnect จะมีช่องว่างที่ event
อาจ broadcast ไปหา client ที่ยังไม่ผ่านการตรวจ

ตั๋วถูกใช้ตอน handshake ครั้งเดียว หลังจากนั้น socket.io ถือ connection ไว้เอง
ตั๋วหมดอายุระหว่างทางไม่ทำให้หลุด (แต่ถ้า reconnect ต้องขอตั๋วใหม่)

---

## Frontend Dashboard (Next.js) — `apps/frontend/src/`

⚠️ **อ่าน `apps/frontend/AGENTS.md` ก่อนแก้โค้ด Next.js** — เวอร์ชันนี้มี breaking changes
เอกสารจริงอยู่ใน `apps/frontend/node_modules/next/dist/docs/`

| หน้า | ไฟล์ | มีอะไร |
|---|---|---|
| ภาพรวม | `app/page.tsx` + `components/DashboardClient.tsx` | KPI 4 ใบ + ตาราง log เรียลไทม์ |
| จัดการผู้ใช้งาน | `app/users/page.tsx` + `components/UsersClient.tsx` | เพิ่ม/ปิดใช้งาน/ลบ/ดูประวัติรายคน |

### สถาปัตยกรรมที่ใช้ (สำคัญ — อย่าเผลอทำผิดแบบ)

**Server Component ดึงข้อมูลตั้งต้น → Client Component ดูแลเรียลไทม์**
- `app/*/page.tsx` เป็น Server Component เรียก `lib/server-api.ts` ซึ่งแนบ token
  ฝั่งเซิร์ฟเวอร์ (`import "server-only"` กันเผลอ import เข้าฝั่ง client)
- `components/*Client.tsx` รับข้อมูลตั้งต้นมาเป็น props แล้วต่อ WebSocket เอง
- หลังแก้ข้อมูลใน UsersClient เรียก `router.refresh()` ให้ server ดึงใหม่
  แทนการเก็บ state คู่ขนานไว้เอง (กันหลุด sync กับ DB)

**Token ไม่เคยถูกฝังลง JS bundle**
- `DASHBOARD_TOKEN` ใน `.env.local` **ไม่มี** prefix `NEXT_PUBLIC_` โดยตั้งใจ
- REST จากฝั่ง client วิ่งผ่าน proxy `app/api/[...path]/route.ts` ซึ่งเป็นคนแนบ
  header `Authorization` ให้ตอนรันบนเซิร์ฟเวอร์
- ผลพลอยได้: `<img src="/api/access/image/xxx.jpg">` ใช้ได้เลย
  (แท็ก img แนบ header เองไม่ได้ แต่ proxy แนบให้แทน)
- WebSocket ต่อจากเบราว์เซอร์ตรงไปที่ Nest จึงต้องมี credential ในเบราว์เซอร์จริง ๆ
  แต่ได้แค่ **ตั๋วอายุ 60 วินาที** จาก `app/api/ws-ticket/route.ts` ซึ่งต้องล็อกอินก่อน
  ไม่ใช่ token ตัวจริงอีกต่อไป

### ระบบล็อกอินของ dashboard

| ไฟล์ | หน้าที่ |
|---|---|
| `app/login/page.tsx` | แท็บ เข้าสู่ระบบ / สมัครสมาชิก ในการ์ดเดียว (`useActionState`) |
| `app/login/actions.ts` | Server Action ทั้ง `login` และ `register` แล้วเซ็ต cookie |
| `lib/dal.ts` | `requireSession()`, `getCurrentRole()`, `requireAdmin()` |
| `lib/session.ts` | อ่าน/เขียน/ลบ cookie `doorlock_session` (httpOnly) |
| `proxy.ts` | เช็คแบบ optimistic พาไปหน้า login เร็ว ๆ |

**การซ่อน UI ตาม role:** `layout.tsx` ยิง `/auth/me` เพื่อรู้ role แล้วซ่อนเมนู
"จัดการผู้ใช้งาน" ถ้าไม่ใช่ ADMIN ส่วน `app/users/page.tsx` เรียก `requireAdmin()`
เผื่อคนพิมพ์ URL ตรง ๆ
**ทั้งสองอย่างเป็นแค่การกันที่ชั้น UI** ด่านจริงคือ `@AdminOnly()` ฝั่ง Nest
ที่ตอบ 403 ไม่ว่าจะเรียกมาจากที่ไหน (ตรวจแล้วด้วย `fetch('/api/users')` ในเบราว์เซอร์
ของบัญชี USER — ได้ 403 จริง)

**ตั้งใจไม่ decode JWT เองฝั่ง Next** เพราะจะต้องแชร์ `JWT_SECRET` มาไว้ที่ frontend ด้วย
ให้ Nest เป็นเจ้าของความจริงเรื่องสิทธิ์ที่เดียว

**รหัสผ่านไม่เคยผ่าน JS ฝั่ง client** — ฟอร์มส่งตรงเข้า Server Action
**session cookie เป็น httpOnly** ตรวจแล้วว่า `document.cookie` ในเบราว์เซอร์ว่างเปล่า
ต่อให้มี XSS ก็อ่าน session ไม่ได้

⚠️ **`proxy.ts` เป็นแค่การเช็คแบบ optimistic** — เอกสาร Next ระบุชัดว่าห้ามใช้เป็น
ระบบ authorization หลัก ตรงนั้นดูแค่ว่า "มี cookie ไหม" ไม่ได้ตรวจว่า JWT หมดอายุยัง
ด่านจริงคือ `requireSession()` ใน `lib/dal.ts` และ Nest ที่ตรวจ JWT อีกชั้น
**อย่าย้ายการตรวจสิทธิ์ไปไว้ที่ `proxy.ts` อย่างเดียว**

### ระบบ UI — shadcn/ui (Radix) + Tailwind v4

ตั้งค่าไว้ที่ `components.json` (style/alias) — เพิ่ม component ใหม่ด้วย:
```bash
npx shadcn@latest add <ชื่อ>     # จาก apps/frontend/
```
โค้ดที่ได้จะถูก **คัดลอกลง `src/components/ui/`** ไม่ใช่ dependency
แก้ไฟล์พวกนั้นได้ตรง ๆ (แต่ `shadcn add` ซ้ำจะเขียนทับ)

ที่ติดตั้งไว้แล้ว: `button card badge input label table tabs alert separator
dialog sonner skeleton dropdown-menu switch tooltip`

⚠️ **`shadcn init` ทำให้ 2 อย่างพังเงียบ ๆ แก้ไปแล้ว อย่าเผลอทำกลับ:**

1. **ฟอนต์** — init เขียน `--font-sans: var(--font-sans)` ลง `globals.css`
   ซึ่ง**ไม่มีใครนิยามไว้เลย** (`layout.tsx` ตั้งชื่อตัวแปรว่า `--font-geist-sans`)
   ผลคือ `font-sans` ไม่มีค่า ตกไปใช้ฟอนต์ default ของเบราว์เซอร์
   แก้แล้วโดยชี้กลับไปที่ตัวแปรจริง และ **ต่อท้ายด้วย `--font-noto-thai` เสมอ**
   เพราะ Geist ไม่มีกลิฟไทย ถ้าไม่มีตัวสำรอง เบราว์เซอร์จะ fallback ทีละอักษร
   แล้วความสูงบรรทัดของข้อความไทยจะเพี้ยน

2. **โหมดมืด** — init เปลี่ยนจาก `@media (prefers-color-scheme)` มาเป็นคลาส
   `.dark` (`@custom-variant dark`) แต่ไม่มีใครใส่คลาสนั้นให้ `<html>`
   โหมดมืดจึงตายสนิท แก้แล้วด้วย `next-themes` (`ThemeProvider` ใน `layout.tsx`)
   ต้องมี `suppressHydrationWarning` ที่ `<html>` ด้วย เพราะ next-themes
   เขียนคลาสหลัง hydrate ทำให้ markup ฝั่ง server ไม่ตรงกับ client เสมอ

**สีเขียวไม่มีใน variant มาตรฐาน** — `Badge` มีแค่ default/secondary/destructive/
outline/ghost/link สถานะ `granted` จึงใส่คลาส emerald เองใน `StatusBadge.tsx`

### กฎ lint ของ React 19 ที่จะเจอแน่ ๆ

โครงสร้างข้างบนไม่ได้เลือกมาลอย ๆ — `npm run lint` จะ **error** (ไม่ใช่ warning) ถ้า:
- เรียก `setState` ตรง ๆ ใน `useEffect` (เช่น fetch แล้ว setState) → ให้ย้ายไป
  ดึงใน Server Component แล้วส่งเป็น props แทน
- สร้าง JSX ใน `try/catch` → ให้รับผลลัพธ์ออกมาก่อน แล้วค่อยตัดสินใจ render
  (ดู `app/page.tsx` กับ `components/BackendError.tsx`)
- แก้ค่า `ref.current` ตอน render → ต้องย้ายไปทำใน `useEffect`

⚠️ **ท่า `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true))`
ใช้ไม่ได้ในโปรเจกต์นี้** — เป็นท่ามาตรฐานที่เอกสาร next-themes กับ shadcn แนะนำ
เพื่อกัน hydration mismatch แต่มันคือ setState ใน effect ตรง ๆ จึงติด lint ข้อแรก
`ThemeToggle.tsx` เลยเลี่ยงด้วยการ **render ไอคอนทั้งสองอันแล้วให้ CSS เลือก**
(`dark:hidden` / `hidden dark:block`) ไม่ต้องมี state เลย
ส่วน `resolvedTheme` อ่านใน `onClick` ได้ตามปกติ เพราะไม่ใช่ตอน render

### ที่ยังไม่ได้ทำ
- **Security Alerts** (Ultrasonic เจอคนแต่ไม่ทาบบัตร) — firmware ยังไม่ส่ง event นี้มา
- **สถานะประตู Locked/Unlocked** — ไม่มีข้อมูล ฝั่ง firmware ไม่ได้รายงานสถานะ relay กลับมา
  ถ้าจะทำต้องเพิ่ม event ใหม่ในโปรโตคอลก่อน
- แก้ชื่อผู้ใช้ (ตอนนี้แก้ได้แค่เปิด/ปิดใช้งาน) และยังไม่มี pagination

---

## แนวทางการเขียนโค้ด (Conventions)

- **Firmware (ESP32/ESP32-CAM):** Arduino C++, ตั้งชื่อฟังก์ชันตามพฤติกรรม (เช่น `checkEntryRFID()`, `sendExitData()`) แยกไฟล์ตามอุปกรณ์ (rfid.h, ultrasonic.h, display.h, buzzer.h, relay.h)
- **Backend:** Nest.js module แยกตามโดเมน (Auth, Users, AccessLogs, Hardware, Dashboard, Notifications) ใช้ TypeScript strict mode
- **Frontend:** Next.js + TypeScript ใช้ WebSocket client รับข้อมูล real-time จาก Backend
- **การตั้งชื่อ field ข้อมูล:** ใช้ `direction: "in" | "out"` และ `status: "granted" | "denied"` ให้ตรงกันทั้งฝั่ง firmware, backend, และ frontend เพื่อไม่ให้เกิดความสับสน

---

## หมายเหตุ / TODO สำหรับอัปเดตไฟล์นี้

เสร็จแล้ว:
- [x] `git init` + `.gitignore`
- [x] เติมคำสั่ง build/run จริงของแต่ละส่วน (ดูหัวข้อ "คำสั่งสำหรับพัฒนา")
- [x] เติม path จริงของโฟลเดอร์ (ดูหัวข้อ "โครงสร้าง repo")
- [x] แยกค่า Wi-Fi/URL ออกเป็น `secrets.h` ที่ถูก gitignore + มี `secrets.example.h`
- [x] แก้พอร์ตชนกัน — backend ย้ายไป 3001, frontend อยู่ 3000
- [x] ยืนยันขา GPIO ทั้งหมดกับวงจรจริง (ดูตารางในหัวข้อ "ขา GPIO")
- [x] เขียน endpoint `POST /access` รับ multipart + เก็บภาพลง `uploads/`
- [x] ต่อ MySQL ผ่าน Prisma + docker-compose แทนการตรวจสิทธิ์ด้วย env
- [x] User Management CRUD API (`/users`) + ตัวช่วยลงทะเบียนบัตร `unassigned-uids`
- [x] WebSocket Gateway ยิง event `access` แบบเรียลไทม์
- [x] Bearer token auth ทั้ง REST และ WebSocket (แยก device/dashboard token)
- [x] หน้า Dashboard + User Management ฝั่ง frontend (เรียลไทม์ใช้งานได้จริง)
- [x] ระบบล็อกอินของ dashboard + ตั๋ว WebSocket อายุสั้นแทนการส่ง token ตัวจริง
- [x] เพิ่ม env vars ที่โค้ดอ่านจริงลง `apps/backend/.env.example` (ครบทั้ง 7 ตัวแล้ว)
- [x] ยกเครื่อง UI ด้วย shadcn/ui + Tailwind v4 + โหมดมืด + ฟอนต์ไทย

ยังค้าง:
- [ ] **flash ลงบอร์ดจริงแล้วทดสอบ end-to-end** ← งานถัดไป ดูหัวข้อ
      "ก่อนทดสอบฮาร์ดแวร์ครั้งแรก" ด้านบนก่อนเริ่ม
- [ ] Security Alerts + สถานะประตู บน dashboard — ต้องเพิ่ม event ในโปรโตคอล
      firmware ก่อน (ตอนนี้บอร์ดไม่ได้รายงานสถานะ relay / การเจอคนแต่ไม่ทาบบัตร)
- [ ] implement TFT (`WAKE`/`SLEEP`) ฝั่ง ESP32-CAM — ตอนนี้เป็น stub เปล่า
      คำสั่ง `WAKE`/`SLEEP`/`PRECAP` ที่ส่งไปจะไม่มีอะไรเกิดขึ้นบนจอ
- [ ] **HTTPS/TLS** — ช่องโหว่ที่ใหญ่ที่สุดที่เหลืออยู่ ตอนนี้รหัสผ่านตอนล็อกอิน
      และ token ทั้งหมดวิ่งเป็น plaintext บน LAN
- [ ] จำกัดจำนวนครั้งที่ลองล็อกอินผิด (ตอนนี้ brute-force ได้)
- [ ] revoke session กลางคัน (ตอนนี้ JWT ใช้ได้จนหมดอายุ 8 ชม. แม้ลบ Admin แล้ว)
- [ ] ยังไม่มี test ฝั่ง frontend และยังไม่มี Docker/CI
