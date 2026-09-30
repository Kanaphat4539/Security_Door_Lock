# Security Door Lock System (ระบบประตูเพื่อความปลอดภัยอัจฉริยะ)

โปรเจกต์ระบบควบคุมและบันทึกการเปิด-ปิดประตูห้องปฏิบัติการ/อาคารอัจฉริยะ ด้วยเทคโนโลยี RFID, กล้องตรวจจับและบันทึกใบหน้า (ESP32-CAM), เซนเซอร์วัดระยะ (Ultrasonic), ระบบแจ้งเตือนผ่าน LINE Official Account (Flex Message) และระบบรายงานผลแดชบอร์ดแบบ Real-time ผ่านเว็บ (Next.js + NestJS + WebSocket)

---

## 🏗️ โครงสร้างโปรเจกต์ (Project Structure)

- **`apps/frontend`**: เว็บแอปพลิเคชัน Dashboard (Next.js App Router + Tailwind CSS + Lucide Icons)
- **`apps/backend`**: เซิร์ฟเวอร์ API, ฐานข้อมูล Prisma ORM และ WebSocket Gateway (NestJS + MySQL)
- **`firmware/esp32-main`**: เฟิร์มแวร์ ESP32 หลักสำหรับต่อเซนเซอร์ RFID RC522, Ultrasonic HC-SR04, จอแสดงผล และรีเลย์ควบคุมกลอนแม่เหล็กไฟฟ้า
- **`firmware/esp32-cam`**: เฟิร์มแวร์ ESP32-CAM ถ่ายภาพใบหน้าเมื่อมีการทาบบัตรและส่งขึ้นเซิร์ฟเวอร์
- **`firmware/shared`**: `protocol.h` — ข้อตกลงรับ-ส่งข้อมูลผ่าน UART ระหว่าง ESP32 ทั้ง 2 บอร์ด
- **`docker`**: สคริปต์และคอนฟิกสำหรับ MySQL บน Docker Container

> [!NOTE]
> `apps/backend` และ `apps/frontend` แยก `node_modules` และ `package.json` ของตัวเอง (ไม่ใช่ monorepo workspace) ดังนั้นเวลาติดตั้งหรือรันคำสั่งต้อง `cd` เข้าไปในโฟลเดอร์ของแต่ละฝั่ง

---

## 🚀 คู่มือติดตั้งและเริ่มใช้งาน (สำหรับเพื่อน/ผู้พัฒนาใหม่)

เพื่อให้เพื่อนสามารถเปิดใช้งานเว็บไซต์และระบบทั้งหมดได้เหมือนเจ้าของโปรเจกต์ทุกประการ ให้ทำตามขั้นตอนตามลำดับดังนี้:

### 1. สิ่งที่ต้องมีในเครื่อง (Prerequisites)
- [Node.js](https://nodejs.org/) (เวอร์ชัน 18 ขึ้นไป แนะนำ LTS)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (และเปิดใช้งานอยู่)
- [Git](https://git-scm.com/)
- [PlatformIO IDE](https://platformio.org/) (สำหรับเขียนและแฟลชโค้ดลงบอร์ด ESP32)

---

### 2. ติดตั้งและเปิดฐานข้อมูล (Database)
เปิด Terminal ที่โฟลเดอร์หลักของโปรเจกต์ (`Security Door Lock/`):

```bash
docker compose up -d --wait
```
*ระบบจะเปิด MySQL 8.4 ขึ้นมาบนพอร์ต **3307** (เพื่อป้องกันการชนกับพอร์ต 3306 เดิมในเครื่อง)*

---

### 3. ตั้งค่าและเปิดใช้งานเซิร์ฟเวอร์ Backend (NestJS)

เปิด Terminal แล้วเข้าไปที่โฟลเดอร์ `apps/backend`:

```bash
cd apps/backend
npm install
npm run setup          # สร้างไฟล์ .env พร้อมสุ่ม Token/Secret ความปลอดภัยให้อัตโนมัติ
npm run db:generate    # สร้าง Prisma Client
npm run db:migrate     # รันตารางฐานข้อมูลลง MySQL
```

#### 3.1 สร้างบัญชีผู้ใช้งานสำหรับเข้าเว็บไซต์ (จำเป็น!)
ก่อนจะล็อกอินเข้าเว็บ ต้องมีบัญชีผู้ใช้งานในระบบก่อน โดยสามารถเลือกวิธีใดวิธีหนึ่ง:

- **สร้างบัญชีผู้ดูแลระบบ (ADMIN):**
  ```bash
  npm run db:add-admin -- admin "รหัสผ่าน8ตัวขึ้นไป" ADMIN
  ```
  *(สามารถเปลี่ยน `admin` เป็นชื่อผู้ใช้ที่ต้องการ และรหัสผ่านต้องยาว 8 ตัวขึ้นไป)*

- **หรือ สร้างบัญชีเจ้าหน้าที่รักษาความปลอดภัย (GUARD):**
  ```bash
  npm run db:add-admin -- guard "รหัสผ่าน8ตัวขึ้นไป" GUARD
  ```

- **หรือ สมัครผ่านหน้าเว็บ (`/register`):**
  สามารถเปิดดูค่า `ADMIN_INVITE_CODE` ในไฟล์ `apps/backend/.env` แล้วนำโค้ดนั้นไปกรอกที่หน้าลงทะเบียนบนเว็บ

#### 3.2 เพิ่มบัตร RFID เข้าระบบ
หากมีบัตร RFID สามารถเพิ่มหรือผูกชื่อผู้ถือบัตรล่วงหน้าได้ด้วยคำสั่ง:
```bash
npm run db:add-card -- A9620207 "ชื่อผู้ถือบัตร"
```
*(หากทาบบัตรที่ไม่เคยลงทะเบียน ระบบจะปฏิเสธ (DENIED) และแสดง UID ใน Terminal Backend สามารถนำ UID นั้นมาเพิ่มต่อได้ทันที)*

#### 3.3 ตั้งค่าการแจ้งเตือน LINE Bot (ถ้าต้องการ)
หากต้องการให้แจ้งเตือนการสแกนบัตร (Flex Message) เข้ากลุ่ม LINE:
1. เปิดไฟล์ `apps/backend/.env`
2. ใส่ Token และ Group ID:
   ```env
   LINE_CHANNEL_ACCESS_TOKEN=ใส่_Channel_Access_Token_ที่นี่
   LINE_GROUP_ID=ใส่_Group_ID_ที่นี่
   ```
3. ดึง Bot เข้ากลุ่ม LINE และเปิดตั้งค่า "Allow account to join groups" ใน LINE Official Account Manager
4. ทดสอบส่งข้อความเข้ากลุ่ม:
   ```bash
   npm run test:line
   ```

#### 3.4 รัน Backend
```bash
npm run start:dev
```
*Backend จะพร้อมให้บริการที่: **http://localhost:3001***

---

### 4. ตั้งค่าและเปิดใช้งาน Frontend Dashboard (Next.js)

เปิด Terminal อีกหน้าต่าง แล้วเข้าไปที่โฟลเดอร์ `apps/frontend`:

```bash
cd apps/frontend
npm install
cp .env.example .env.local
npm run dev
```

*เปิดเว็บเบราว์เซอร์แล้วไปที่: **http://localhost:3000***  
เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่สร้างไว้ในขั้นตอน **3.1**

---

## 🌐 วิธีให้เพื่อนเข้าใช้งานเว็บจากเครื่องอื่น (แชร์ผ่าน Wi-Fi / LAN วงเดียวกัน)

หากต้องการให้เพื่อนบนเครือข่าย Wi-Fi เดียวกัน เข้าใช้งาน Dashboard ผ่านมือถือหรือคอมพิวเตอร์ของเพื่อน:

1. **หาหมายเลข IP เครื่องของท่าน (Host IP):**
   - บน Windows: เปิด PowerShell พิมพ์ `ipconfig` แล้วดู IPv4 Address (เช่น `192.168.1.50`)
2. **แก้ไขไฟล์ `apps/frontend/.env.local`:**
   ให้ชี้ไปยัง IP เครื่องโฮสต์แทน localhost:
   ```env
   NEXT_PUBLIC_API_URL=http://192.168.1.50:3001
   NEXT_PUBLIC_SOCKET_URL=http://192.168.1.50:3001
   ```
3. **รัน Frontend ให้รับการเชื่อมต่อจากภายนอก:**
   ```bash
   npm run dev -- -H 0.0.0.0
   ```
4. **ให้เพื่อนเปิดเบราว์เซอร์ไปที่:**
   ```
   http://192.168.1.50:3000
   ```
   และล็อกอินด้วยบัญชี ADMIN หรือ GUARD ที่สร้างไว้

---

## 💻 ฟังก์ชันและการใช้งานระบบเว็บ (Web Features)

### 1. ระบบยืนยันตัวตนและการเข้าถึง (Authentication & Roles)
- **ADMIN**: สิทธิ์สูงสุด สามารถจัดการข้อมูลผู้ใช้, เพิ่ม/ลบ/แก้ไขบัตร RFID, ตั้งค่าอีเมลแจ้งเตือนรายบุคคล, ดูประวัติเข้า-ออกพร้อมภาพถ่าย, สั่งปลดล็อกประตูระยะไกล (Remote Unlock) และจัดการบัญชีผู้ตรวจการ (Guard)
- **GUARD**: สิทธิ์เจ้าหน้าที่รักษาความปลอดภัย มอนิเตอร์หน้าจอ Dashboard และดูประวัติการเข้า-ออกย้อนหลังแบบเรียลไทม์

### 2. หน้าระบบต่างๆ
- **`/admin/dashboard`**: แสดงภาพรวมระบบแบบ Real-time, สถิติการเข้า-ออกรายวัน, สถานะการเชื่อมต่อ และปุ่ม Emergency Unlock สั่งเปิดประตูฉุกเฉิน
- **`/admin/users`**: หน้าจัดการข้อมูลผู้ถือบัตร RFID (UID, ชื่อ-สกุล, สถานะบัตร Active/Inactive, อีเมลสำหรับรับการแจ้งเตือน)
- **`/admin/logs`**: รายการประวัติการเข้า-ออกทั้งหมด พร้อมระบุทิศทาง (เข้า/ออก), สถานะ (GRANTED / DENIED) และภาพถ่าย Snapshot จาก ESP32-CAM แบบทันที
- **`/admin/guards`**: จัดการสร้างและลบบัญชีผู้ตรวจการ (Guard)
- **`/guard/dashboard`**: จอมอนิเตอร์สำหรับเจ้าหน้าที่รักษาความปลอดภัย

---

## 🔌 การตั้งค่าฝั่งฮาร์ดแวร์ (Firmware ESP32)

แต่ละบอร์ดเป็นโปรเจกต์ PlatformIO แยกกัน:

### 1. ESP32-CAM (กล้องถ่ายภาพใบหน้า)
```bash
cd firmware/esp32-cam
cp src/secrets.example.h src/secrets.h
```
แก้ไขไฟล์ `src/secrets.h`:
- ใส่ชื่อ Wi-Fi (`WIFI_SSID`) และรหัสผ่าน (`WIFI_PASS`)
- ใส่ `DEVICE_TOKEN` ให้ตรงกับค่าใน `apps/backend/.env`
- แฟลชโค้ดลงบอร์ด: `pio run -t upload`

### 2. ESP32-Main (ควบคุมกลอนประตู, RFID, Ultrasonic)
```bash
cd firmware/esp32-main
cp src/secrets.example.h src/secrets.h   # ถ้ามี
pio run -t upload
```

---

## 📧 ระบบแจ้งเตือนผ่าน Email (Resend)

1. รันการอัปเดต Migration ฐานข้อมูล:
   ```bash
   cd apps/backend
   npm run db:deploy
   npm run db:generate
   ```
2. สมัครใช้งานและยืนยันโดเมนที่ [Resend](https://resend.com/docs/dashboard/domains/introduction)
3. เพิ่มค่าลงใน `apps/backend/.env`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM="Door Lock <alerts@your-domain.com>"
   ```
4. ในหน้า **Admin &rarr; User Management** ให้ใส่อีเมลของผู้ถือบัตร แล้วติ๊กเปิดใช้งาน **Email owner on each granted scan**

---

## 🛠️ สรุปคำสั่งที่ใช้งานบ่อย (Cheat Sheet)

| คำสั่ง | ตำแหน่งที่รัน | หน้าที่ |
|---|---|---|
| `docker compose up -d --wait` | Root (`/`) | เปิดใช้งานฐานข้อมูล MySQL |
| `docker compose down` | Root (`/`) | หยุดการทำงานของฐานข้อมูล |
| `npm run start:dev` | `apps/backend` | เริ่มทำงานเซิร์ฟเวอร์ Backend (พอร์ต 3001) |
| `npm run db:add-admin -- <user> <pass> [ROLE]` | `apps/backend` | สร้างหรือเปลี่ยนรหัสผ่านบัญชี ADMIN/GUARD |
| `npm run db:add-card -- <UID> "<Name>"` | `apps/backend` | เพิ่มหรือเปิดใช้งานบัตร RFID เข้าระบบ |
| `npm run test:line` | `apps/backend` | ทดสอบยิงข้อความแจ้งเตือนเข้า LINE Bot |
| `npm run db:studio` | `apps/backend` | เปิดดูข้อมูลในฐานข้อมูลผ่านหน้าเว็บ Prisma Studio |
| `npm run dev` | `apps/frontend` | เริ่มทำงานเว็บ Frontend Dashboard (พอร์ต 3000) |
