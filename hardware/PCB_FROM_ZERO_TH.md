# คู่มือทำ PCB ตั้งแต่ศูนย์ — บอร์ดหลัก Security Door Lock (ฉบับคนไม่เคยทำ PCB)

เขียนสำหรับ: คนที่ไม่มีความรู้เรื่อง PCB มาก่อน — ทุกขั้นมีคำสั่ง/ปุ่มให้กดจริง
เป้าหมายสุดท้าย: ได้ไฟล์ Gerber ส่ง JLCPCB → ได้บอร์ดที่ ESP32 DevKit V1 เสียบลง
แล้วต่อโมดูลครบทุกตัวตามโค้ด `firmware/esp32-main`

บอร์ดนี้คืออะไร: "carrier/shield" — ไม่มีชิปบนบอร์ดเลยนอกจากซ็อกเก็ต + header + R + Q1
ดึงไฟจากตัวแปลงภายนอก (J1) และจากบอร์ด DevKit เอง เป็นแบบที่ทำง่ายสุดสำหรับผู้เริ่ม

เวลาที่ใช้: 4–8 ชั่วโมงครั้งแรก (ไม่ต้องรีบ ทำทีละขั้น)

สารบัญ
  0. เตรียมของ + ภาพรวม
  1. สร้างโปรเจกต์
  2. คำศัพท์ที่ต้องรู้ (10 คำ)
  3. รายการอุปกรณ์หลักที่ต้องใส่ (ตารางเต็ม)
  4. Pin map ESP32 DevKit V1 (30 ขา)
  5. ขั้น 1 — วางสัญลักษณ์ใน Schematic
  6. ขั้น 2 — ต่อ net + PWR_FLAG + ERC
  7. ขั้น 3 — Assign Footprint
  8. ขั้น 4 — ขอบบอร์ด + รูยึด + Update PCB
  9. ขั้น 5 — วางอุปกรณ์ (มีพิกัดให้)
 10. ขั้น 6 — กฎการผลิต + ลากสาย (ตารางทีละ net)
 11. ขั้น 7 — GND pour + DRC
 12. ขั้น 8 — Gerber + สั่ง JLCPCB
 13. เช็คลิสต์ก่อนสั่งผลิต + วิธีให้ตรวจ
 ภาคผนวก A — ปุ่มลัด
 ภาคผนวก B — ปัญหาที่พบบ่อย
 ภาคผนวก C — จุดที่ต้องตรวจกับของจริง + หมายเหตุความต่างจากไฟล์เก่า

---

## 0. เตรียมของ + ภาพรวม

ของจริงที่ต้องมี (ซื้อ/มีอยู่แล้ว)
  - ESP32 DevKit V1 (30 ขา) ×1
  - ซ็อกเก็ตตัวเมีย 15 ขา ×2 (สำหรับเสียบ DevKit)
  - RC522 RFID ×2 · OLED SSD1306 I2C 128x64 ×1 · HY-SRF05 ×1
  - Relay module 5V (active-high) ×1 · BZ-1295 active buzzer ×1 · ESP32-CAM ×1 (อีกบอร์ด)
  - Header ตัวผู้: 8 ขา ×2, 4 ขา ×3, 3 ขา ×1, 2 ขา ×2
  - R 0805: 4.7k ×2, 1k ×2, 2k ×1 · Q1 = S8050/MMBT2222A (SOT-23) ×1
  - ตัวแปลงไฟ 5V ≥1A · สาย dupont

ไฟฟ้าบนบอร์ด (สำคัญ)
  - บอร์ดนี้ไม่มีภาคจ่ายไฟ (ไม่มี buck/LDO/ฟิวส์/TVS)
  - J1 = 5V + GND จากตัวแปลงภายนอก → ไปเลี้ยง HC-SRF05, relay module, ESP32-CAM, buzzer
  - +3V3 ทั้งบอร์ดดึงจากขา 3V3 ของ DevKit เอง (ขา 16) → เลี้ยง RC522 ×2, OLED, pull-up I2C
  - ถ้าตัวแปลงของคุณให้ 12V หรือ 3.3V อย่างเดียว บอกได้ ต้องเพิ่มภาคจ่ายไฟก่อน (ดูไฟล์ mainboard-2layer)

---

## 1. สร้างโปรเจกต์

KiCad 10.0.6 ติดตั้งอยู่ที่ C:\Users\TEE\AppData\Local\Programs\KiCad\10.0\

  1. เปิด KiCad → File → New Project…
  2. เลือกโฟลเดอร์ C:\Users\TEE\ProjectY3IoT\Security_Door_Lock\hardware\myboard\
  3. ตั้งชื่อไฟล์ door_lock → Save  (จะได้ door_lock.kicad_pro / .kicad_sch / .kicad_pcb)
  4. ดับเบิลคลิกอะไรก็ได้เพื่อเข้า Schematic Editor

ครั้งแรกที่เปิด ถ้าถามเรื่อง library ให้กด OK/ใช้ค่าเริ่มต้น

---

## 2. คำศัพท์ที่ต้องรู้ (10 คำ)

  Symbol      สัญลักษณ์ในวงจร (สี่เหลี่ยมมีขา) — ไม่ใช่รูปของจริงบนบอร์ด
  Footprint   รูปทองแดง/รูของอุปกรณ์จริงบนบอร์ด (เช่น รู 8 ขาของ header)
  Pad         จุดทองแดงที่บัดกรีขาอุปกรณ์
  Net         กลุ่มจุดที่ต้องต่อถึงกัน เช่น net +5V = ทุก pad ที่ต้องได้ไฟ 5V
  Global label ป้ายชื่อ net — ชื่อเดียวกัน = สายเส้นเดียวกัน แม้ไม่ลากเส้นถึงกัน
  ERC         ตรวจวงจร (ว่าเชื่อมถูกไหม) · DRC = ตรวจบอร์ด (ว่าผลิตได้ไหม)
  Ratsnest    เส้นบางบอกว่า pad ไหนยังต้องต่อไปหา pad ไหน (ยังไม่ใช่ทองแดงจริง)
  Track       เส้นทองแดง · Via = รูเชื่อมชั้นบน-ล่าง
  Zone/pour   พื้นทองแดงกว้าง (ใช้ทำ ground plane ของ GND)
  F.Cu / B.Cu ทองแดงด้านหน้า / ด้านหลัง

---

## 3. รายการอุปกรณ์หลักที่ต้องใส่ (ตารางเต็ม — คัดลอกได้เลย)

ไลบรารีทั้งหมดเป็นของมาตรฐานที่มากับ KiCad ไม่ต้องโหลดเพิ่ม

| Ref | สิ่งที่ใส่ | ค่า | Symbol (ไลบรารี) | Footprint |
|-----|-----------|-----|------------------|-----------|
| U1 | ซ็อกเก็ตแถวซ้ายของ DevKit (ขา 1–15) | — | `Connector_Generic:Conn_01x15` | `Connector_PinSocket_2.54mm:PinSocket_1x15_P2.54mm_Vertical` |
| U2 | ซ็อกเก็ตแถวขวาของ DevKit (ขา 16–30) | — | `Connector_Generic:Conn_01x15` | `Connector_PinSocket_2.54mm:PinSocket_1x15_P2.54mm_Vertical` |
| J1 | ไฟเข้า 5V/GND จากตัวแปลง | — | `Connector_Generic:Conn_01x02` | `Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical` |
| J3 | RC522 ตัวขาเข้า | — | `Connector_Generic:Conn_01x08` | `Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical` |
| J4 | RC522 ตัวขาออก | — | `Connector_Generic:Conn_01x08` | `Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical` |
| J5 | OLED SSD1306 | — | `Connector_Generic:Conn_01x04` | `Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical` |
| J6 | HY-SRF05 | — | `Connector_Generic:Conn_01x04` | `Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical` |
| J7 | สายไป ESP32-CAM | — | `Connector_Generic:Conn_01x04` | `Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical` |
| J8 | Relay module (VCC/GND/IN) | — | `Connector_Generic:Conn_01x03` | `Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical` |
| J9 | สายไป buzzer บนฝา | — | `Connector_Generic:Conn_01x02` | `Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical` |
| R4 | pull-up I2C (SDA) | 4.7k | `Device:R` | `Resistor_SMD:R_0805_2012Metric` |
| R5 | pull-up I2C (SCL) | 4.7k | `Device:R` | `Resistor_SMD:R_0805_2012Metric` |
| R6 | ตัวแบ่งแรงดัน Echo (ตัวบน) | 1k | `Device:R` | `Resistor_SMD:R_0805_2012Metric` |
| R7 | ตัวแบ่งแรงดัน Echo (ตัวล่าง) | 2k | `Device:R` | `Resistor_SMD:R_0805_2012Metric` |
| R8 | base resistor ขับ buzzer | 1k | `Device:R` | `Resistor_SMD:R_0805_2012Metric` |
| Q1 | ทรานซิสเตอร์ขับ buzzer | S8050/MMBT2222A | `Transistor_BJT:MMBT2222A` | `Package_TO_SOT_SMD:SOT-23` |
| H1–H4 | รูยึด M2 4 มุม | M2 | `Mechanical:MountingHole` | `MountingHole:MountingHole_2.2mm_M2` |
| #FLG | PWR_FLAG (อย่างน้อย 1 ตัว) | — | `power:PWR_FLAG` | — (ไม่ลงบอร์ด) |

⚠️ ห้ามใช้ symbol `mainboard:NPN` ที่อยู่ในไฟล์บอร์ดเก่า — ขาของมันสลับกับของจริง
   (ดูภาคผนวก C ข้อ 1) ให้ใช้ `Transistor_BJT:MMBT2222A` ตามตารางนี้

ทำไมไม่มีอย่างอื่น: relay module มีไดรเวอร์+ไดโอดในตัวแล้ว, RC522/OLED มี pull-up/regulator
ในตัว, buzzer เป็น active (มีวงจรกำเนิดเสียงในตัว) จึงเหลือแค่ 15 ชิ้น + รูยึด

---

## 4. Pin map ESP32 DevKit V1 (30 ขา)

ตัวเลข "ขา" = ลำดับตามที่พิมพ์บนบอร์ด DevKit (แถวซ้าย 1–15, แถวขวา 16–30 จากบนลงล่าง)

| ขา | ป้ายบนบอร์ด | GPIO | net ในวงจร | ต่อไปที่ |
|----|-------------|------|------------|----------|
| 1 | EN | — | — | ว่าง (no-connect) |
| 2 | VP | 36 | — | ว่าง |
| 3 | VN | 39 | — | ว่าง |
| 4 | D34 | 34 | — | ว่าง |
| 5 | D35 | 35 | RFID_EXIT_MISO | J4.4 |
| 6 | D32 | 32 | US_ECHO_3V3 | R6.2 + R7.1 |
| 7 | D33 | 33 | US_TRIG | J6.2 |
| 8 | D25 | 25 | BUZZER_CTRL | R8.1 |
| 9 | D26 | 26 | RELAY_CTRL | J8.3 |
| 10 | D27 | 27 | RFID_ENTRY_RST | J3.7 |
| 11 | D14 | 14 | RFID_EXIT_SCK | J4.2 |
| 12 | D12 | 12 | — | **ห้ามใช้** (strapping pin ทำบอร์ดบูตค้าง) |
| 13 | D13 | 13 | RFID_EXIT_MOSI | J4.3 |
| 14 | GND | — | GND | — |
| 15 | VIN | — | +5V | J1.1, J6.1, J7.1, J8.1, J9.1 |
| 16 | 3V3 | — | +3V3 | J3.8, J4.8, J5.2, R4.1, R5.1 |
| 17 | GND | — | GND | — |
| 18 | D15 | 15 | — | ว่าง |
| 19 | D2 | 2 | RFID_EXIT_RST | J4.7 |
| 20 | D4 | 4 | RFID_EXIT_SS | J4.1 |
| 21 | RX2 | 16 | CAM_RX2 | J7.4 |
| 22 | TX2 | 17 | CAM_TX2 | J7.3 |
| 23 | D5 | 5 | RFID_ENTRY_SS | J3.1 |
| 24 | D18 | 18 | RFID_ENTRY_SCK | J3.2 |
| 25 | D19 | 19 | RFID_ENTRY_MISO | J3.4 |
| 26 | D21 | 21 | OLED_SDA | J5.4 + R4.2 |
| 27 | RX0 | 3 | — | ว่าง |
| 28 | TX0 | 1 | — | ว่าง |
| 29 | D22 | 22 | OLED_SCL | J5.3 + R5.2 |
| 30 | D23 | 23 | RFID_ENTRY_MOSI | J3.3 |

ที่มา: `firmware/esp32-main/src/config.h` (ตรงกับไฟล์บอร์ดอ้างอิงทุกขา)

ขา header ของโมดูลแต่ละตัว (ยึดลำดับขาของโมดูลจริงที่คุณซื้อเป็นหลัก)

  J1 ไฟเข้า        1 = +5V          2 = GND
  J3 RC522 เข้า    1 = SS  2 = SCK  3 = MOSI  4 = MISO  5 = ว่าง  6 = GND  7 = RST  8 = 3V3
  J4 RC522 ออก     1 = SS  2 = SCK  3 = MOSI  4 = MISO  5 = ว่าง  6 = GND  7 = RST  8 = 3V3
  J5 OLED          1 = GND 2 = 3V3  3 = SCL   4 = SDA
  J6 HY-SRF05      1 = +5V 2 = TRIG 3 = ECHO  4 = GND
  J7 ไป CAM        1 = +5V 2 = GND  3 = TX(ไป RX ของ CAM)  4 = RX(ไป TX ของ CAM)
  J8 Relay module  1 = +5V (VCC)  2 = GND  3 = IN (RELAY_CTRL)
  J9 Buzzer (ฝา)   1 = +5V  2 = BUZZ_LO (ผ่าน Q1 ลง GND)

---

## 5. ขั้น 1 — วางสัญลักษณ์ใน Schematic

เปิด Schematic Editor ปุ่มหลัก: `A` = วาง symbol · `P` = วาง power symbol · `L` = global label
`W` = ลากเส้น · `M`/`R` = ย้าย/หมุน · `Q` = ติด no-connect · `Esc` = ออกโหมด

หลักการ: **ไม่วาดวงจรของโมดูล** ทำแค่ header + global label ชื่อ net เท่านั้น

  1. กด `A` → พิมพ์ชื่อ symbol → Enter → วางลงจอ → `Esc`
  2. วางตามตารางในหัวข้อ 3 ให้ครบ 16 บรรทัด (U1, U2, J1, J3–J9, R4–R8, Q1)
     - วาง U1 (แถวซ้าย) และ U2 (แถวขวา) ไว้ข้างกัน
     - H1–H4 (MountingHole) ไม่มีขา วางมุมจอก็ได้
  3. ตั้งค่า (double-click ที่ตัวอุปกรณ์ช่อง Value) ตามคอลัมน์ "ค่า"
     - R4/R5 = 4.7k, R6/R8 = 1k, R7 = 2k, Q1 = MMBT2222A, J3/J4 = RC522_IN / RC522_OUT ฯลฯ
  4. กด `P` วาง `PWR_FLAG` 1 ตัว แล้วต่อเข้าที่ net +5V (บอก ERC ว่ารail นี้มีไฟเข้าจริง)

---

## 6. ขั้น 2 — ต่อ net + ERC

วิธีที่ง่ายที่สุดสำหรับมือใหม่ (ไม่ต้องลากเส้นยาวข้ามจอ):
  1. กด `L` วาง global label ปลายขาของ header → พิมพ์ชื่อ net ให้ตรงเป๊ะตามตาราง
  2. วาง global label ชื่อเดียวกันที่ขา GPIO ของ U1/U2 → KiCad จะรู้ว่าเป็นสายเดียวกัน
  3. ขาที่ไม่ใช้ (ขา 1,2,3,4,12,18,27,28 ของ DevKit และขา 5 ของ J3/J4) กด `Q` แล้วคลิกปลายขา = no-connect

ตาราง net → จุดที่ต้องต่อให้ครบ (นี่คือ "เฉลย" ให้ตรวจได้ทีละบรรทัด)
เลข "ขา n" = ขาที่ n ของ DevKit (1–15 = symbol U1 แถวซ้าย · 16–30 = symbol U2 ขาที่ 1–15)

| net | ต้องมีจุดเหล่านี้ครบ |
|-----|---------------------|
| +5V | ขา 15, J1.1, J6.1, J7.1, J8.1, J9.1 |
| +3V3 | ขา 16, J3.8, J4.8, J5.2, R4.1, R5.1 |
| GND | ขา 14, ขา 17, J1.2, J3.6, J4.6, J5.1, J6.4, J7.2, J8.2, R7.2, Q1.2 |
| BUZZER_CTRL | ขา 8, R8.1 |
| Q1_B | R8.2, Q1.1 |
| BUZZ_LO | Q1.3, J9.2 |
| RELAY_CTRL | ขา 9, J8.3 |
| US_TRIG | ขา 7, J6.2 |
| US_ECHO_5V | J6.3, R6.1 |
| US_ECHO_3V3 | ขา 6, R6.2, R7.1 |
| OLED_SDA | ขา 26, J5.4, R4.2 |
| OLED_SCL | ขา 29, J5.3, R5.2 |
| CAM_RX2 | ขา 21, J7.4 |
| CAM_TX2 | ขา 22, J7.3 |
| RFID_ENTRY_SS | ขา 23, J3.1 |
| RFID_ENTRY_SCK | ขา 24, J3.2 |
| RFID_ENTRY_MOSI | ขา 30, J3.3 |
| RFID_ENTRY_MISO | ขา 25, J3.4 |
| RFID_ENTRY_RST | ขา 10, J3.7 |
| RFID_EXIT_SS | ขา 20, J4.1 |
| RFID_EXIT_SCK | ขา 11, J4.2 |
| RFID_EXIT_MOSI | ขา 13, J4.3 |
| RFID_EXIT_MISO | ขา 5, J4.4 |
| RFID_EXIT_RST | ขา 19, J4.7 |

วิธีแปลง "ขา n" เป็นขาของ symbol ที่วางไว้
  U1 (แถวซ้าย):  ขา 1–15  → U1.1  … U1.15
  U2 (แถวขวา):   ขา 16–30 → U2.1  … U2.15   (เช่น ขา 21 = U2.6, ขา 26 = U2.11, ขา 29 = U2.14)

จากนั้น: Inspect → Electrical Rules Checker → Run → เป้าหมาย **0 errors**
(error ที่เจอบ่อย: "Input power pin not driven" → ยังไม่ได้วาง PWR_FLAG,
 "unconnected pin" → ขานั้นยังไม่ติด label/no-connect)

---

## 7. ขั้น 3 — Assign Footprint

Tools → Assign Footprints… → ไล่ assign ตามคอลัมน์สุดท้ายของตารางหัวข้อ 3
(พิมพ์คำค้นในช่อง filter เช่น ใส่ `PinHeader_1x08` แล้วเลือกตัว `_Vertical`)
เสร็จแล้วกด **Apply, Save Schematic & Continue**

หมายเหตุ:
  - U1/U2 ต้องเป็น `PinSocket` (ตัวเมีย) เท่านั้น ไม่งั้นเสียบ DevKit ไม่ได้
  - Q1 ใช้ `Package_TO_SOT_SMD:SOT-23` ตามที่ symbol MMBT2222A ตั้งมาให้แล้ว (ไม่ต้องแก้)
  - H1–H4 ใช้ `MountingHole:MountingHole_2.2mm_M2`

---

## 8. ขั้น 4 — ขอบบอร์ด + รูยึด + Update PCB

เปิด PCB Editor

  1. เลือกชั้น `Edge.Cuts` (แถบเลเยอร์ขวา)
  2. กดปุ่มสี่เหลี่ยม (Add rectangle) ในแถบเครื่องมือขวา → คลิกมุมซ้ายบน แล้วคลิกมุมขวาล่าง
     ให้ได้กรอบขนาด **88 × 148 mm** (ดูตัวเลขขนาดที่แถบล่างขณะลาก)
     - ถ้าอยากเหมือนไฟล์อ้างอิงเป๊ะ: กรอบจาก (106, 26) ถึง (194, 174)
  3. Tools → Update PCB from Schematic… (`F8`) → Update PCB
     → อุปกรณ์โผล่มากองกลางจอ คลิกลากกองนั้นออกไปข้างนอกบอร์ดก่อน
  4. ย้ายรูยึด H1–H4 เข้ามุมทั้ง 4 (ห่างขอบ ~8 mm) — ถ้าอยากได้พิกัดเป๊ะ:
     (108.25, 28.25) (191.75, 28.25) (191.75, 171.75) (108.25, 171.75)

---

## 9. ขั้น 5 — วางอุปกรณ์ (placement)

ปุ่ม: `M` ย้าย · `R` หมุน 90° · `F` พลิกด้าน · `Ctrl+Shift+M` ใส่พิกัดเป๊ะ
ตั้ง grid 0.5 mm ตอนวางอุปกรณ์

พิกัดที่แนะนำ (หน่วย mm, มุมซ้ายบนของบอร์ดอ้างอิงที่ (106,26) — ใช้ Ctrl+Shift+M ใส่ทีละตัว)

| Ref | ตำแหน่ง (x, y) | เหตุผล |
|-----|----------------|--------|
| U1 + U2 | กลางบอร์ด (ซ็อกเก็ตสองแถวห่างกัน 25.4 mm) | เป็นศูนย์กลาง สายออกทุกทางสั้น |
| J3 | (119, 40) ซ้ายบน | เสียบ RC522 ฝาเข้า |
| J4 | (181, 40) ขวาบน | เสียบ RC522 ฝาออก |
| J5 | (119, 108) ซ้ายกลาง | OLED หน้าจอ |
| J7 | (119, 140) ซ้ายล่าง | สายไป CAM |
| J6 | (142, 152) ล่างกลาง | เสียบ HY-SRF05 |
| J8 | (172, 162) ขวาล่าง | สายไป relay module + ขั้วโซลินอยด์ |
| J1 | (119, 162) ซ้ายล่าง | สายไฟเข้า |
| Q1 | (178, 86) · R8 (172, 86) ขวากลาง | ชุดขับ buzzer |
| J9 | (185, 85) ขอบขวา | สายไป buzzer บนฝา |
| R4 (128, 104) R5 (128, 111) | ข้าง J5 | pull-up I2C ชิด OLED |
| R6 (150, 152) R7 (150, 159) | ใต้ J6 | ตัวแบ่ง Echo ชิดขา J6.3 |

กฎการวางที่ต้องจำ
  1. อุปกรณ์ที่ต่อกัน → วางใกล้กัน (R ชิด header ที่มันเกี่ยว) จะลากสายง่ายมาก
  2. header ที่มีสายออกนอกกล่อง → หันออกขอบบอร์ด (J1/J6/J8/J9 ด้านล่าง-ขวา)
  3. **เสาอากาศของ ESP32**: ให้ปลายด้านเสาอากาศของ DevKit หันออกขอบบอร์ด
     และห้ามมีทองแดง (zone) ใต้เสาอากาศ — จะทำ keepout ในขั้นที่ 7
  4. relay module (มีขดลวด+สวิตช์ 220V) อยู่ไกลจาก ESP32 และสายไปกล้อง ≥15 mm อยู่แล้ว — รักษาระยะไว้
  5. วางแล้วกด `B` (fill zone) ดูว่าทองแดงไม่ทับขอบ/ทับรู

---

## 10. ขั้น 6 — กฎการผลิต + ลากสาย

### 10.1 ตั้งค่า (ทำครั้งเดียว)
File → Board Setup → Design Rules → Constraints: ค่าเริ่มต้นของ JLCPCB 2 ชั้นใช้ได้เลย
  - Minimum track width 0.2 · Minimum clearance 0.2 · Minimum via 0.6/0.3
Net Classes: Default — Track width **0.3 mm**, Clearance 0.2 mm

ความกว้างที่จะใช้จริงตอนลาก
  - สัญญาณ 0.3 mm
  - ไฟ (+5V, +3V3) **0.6 mm** (0.5 mm ก็พอ: รับได้ ~1.4 A ที่อุณหภูมิขึ้น 10°C)
  - GND ไม่ต้องลากทีละเส้น → ใช้ pour (ขั้นที่ 7)
  - เปลี่ยนความกว้าง: ระหว่างลากกด `W` / `Shift+W` หรือเลือกจาก dropdown แถบบน

### 10.2 ลากเส้น (หัวใจของงาน)
  1. เลือกชั้น `F.Cu` → กด `X` → คลิก pad ต้นทาง → เลื่อนไปคลิกหักมุม → **ดับเบิลคลิกที่ pad ปลายทาง**
     (ratsnest เส้นนั้นหาย = ต่อสำเร็จ) → `Esc`
  2. ตันขวาง? ระหว่างลากกด `V` = หย่อน via + สลับไปเดินต่อชั้น `B.Cu` แล้วค่อย `V` กลับขึ้นมา
  3. ดูตัวเลข "Unrouted" มุมล่างซ้าย ทำให้เป็น 0 (ยกเว้น GND)

### 10.3 ลำดับที่ควรลาก (จากง่ายไปยาก) + ตาราง net

  1) ไฟก่อน (เส้นอ้วน ตอนบอร์ดยังว่าง)
     +5V   → ขา 15 ↔ J1.1 ↔ J6.1 ↔ J7.1 ↔ J8.1 ↔ J9.1
     +3V3  → ขา 16 ↔ J3.8 ↔ J4.8 ↔ J5.2 ↔ R4.1 ↔ R5.1
  2) SPI ของ RFID ทั้งสองชุด (เส้นตรง ไม่ค่อยตัดกัน)
     RFID_ENTRY_SS   ขา 23 ↔ J3.1        RFID_EXIT_SS   ขา 20 ↔ J4.1
     RFID_ENTRY_SCK  ขา 24 ↔ J3.2        RFID_EXIT_SCK  ขา 11 ↔ J4.2
     RFID_ENTRY_MOSI ขา 30 ↔ J3.3        RFID_EXIT_MOSI ขา 13 ↔ J4.3
     RFID_ENTRY_MISO ขา 25 ↔ J3.4        RFID_EXIT_MISO ขา 5  ↔ J4.4
     RFID_ENTRY_RST  ขา 10 ↔ J3.7        RFID_EXIT_RST  ขา 19 ↔ J4.7
  3) I2C + ตัวประกอบ
     OLED_SDA ขา 26 ↔ J5.4 ↔ R4.2 · OLED_SCL ขา 29 ↔ J5.3 ↔ R5.2
     US_TRIG  ขา 7 ↔ J6.2 · US_ECHO_5V J6.3 ↔ R6.1 · US_ECHO_3V3 ขา 6 ↔ R6.2 ↔ R7.1
     BUZZER_CTRL ขา 8 ↔ R8.1 · Q1_B R8.2 ↔ Q1.1 · BUZZ_LO Q1.3 ↔ J9.2
     RELAY_CTRL ขา 9 ↔ J8.3
  4) UART ไปกล้อง (ไขว้กันตามที่ระบุ)
     CAM_TX2 ขา 22 ↔ J7.3 · CAM_RX2 ขา 21 ↔ J7.4
  5) GND — ไม่ลาก ทำเป็น pour ในขั้นถัดไป

หมายเหตุ: "ขา n" = ขาที่ n ของ DevKit (แปลงเป็น symbol ได้ตามตารางหัวข้อ 6)

---

## 11. ขั้น 7 — GND pour + DRC

เท ground plane (แทนการลาก GND ทีละเส้น)
  1. เลือกชั้น `B.Cu` → กด `Ctrl+Shift+Z` (Add Filled Zone) → วาดกรอบคลุมทั้งบอร์ด (ปิดกรอบที่จุดเริ่ม)
  2. หน้าต่างเด้ง: net = **GND**, layer = `B.Cu` → OK
  3. ทำซ้ำบน `F.Cu` อีก zone (ได้ ground ทั้งสองด้าน)
  4. **กันเสาอากาศ ESP32**: วาด zone อีกอันบน F.Cu+B.Cu ใต้ตำแหน่งเสาอากาศ แล้วตั้ง
     "Keep out copper fill" (หรือใน Board Setup → Rule Areas) ห้ามมีทองแดงใต้เสาอากาศ
  5. กด `B` = Fill All Zones → GND ทุกจุดเชื่อมเข้าพื้น (ratsnest GND หายหมด)

รัน DRC
  1. Inspect → Design Rules Checker → ติ๊ก "Refill all zones before performing DRC" → Run
  2. เป้าหมาย: **0 unconnected** และไม่มี error สีแดง
     (warning `lib_footprint_mismatch` เกิดจาก footprint ที่ฝังมาแบบย่อ ยอมรับได้)

---

## 12. ขั้น 8 — Gerber + สั่ง JLCPCB

  1. **กด `B` เติม zone ก่อนเสมอ**
  2. File → Fabrication Outputs → Gerbers (.gbr)
     ติ๊กชั้น: F.Cu, B.Cu, F.Paste, B.Paste, F.Silkscreen, B.Silkscreen, F.Mask, B.Mask, Edge.Cuts
     → Plot
  3. Generate Drill Files → Excellon → ติ๊ก "PTH and NPTH in single file" → Generate
  4. zip ไฟล์ .gbr + .drl ทั้งหมด → อัปโหลด jlcpcb.com → ตรวจพรีวิว → สั่ง
     ตั้งค่า: Layers = 2, Thickness = 1.6 mm, ที่เหลือ default

ทางลัด (ใช้ command line แทนการกดใน GUI ได้):
```
"C:/Users/TEE/AppData/Local/Programs/KiCad/10.0/bin/kicad-cli.exe" pcb export gerbers \
  --output gerbers/ --layers F.Cu,B.Cu,F.Paste,B.Paste,F.Silkscreen,B.Silkscreen,F.Mask,B.Mask,Edge.Cuts door_lock.kicad_pcb
"C:/Users/TEE/AppData/Local/Programs/KiCad/10.0/bin/kicad-cli.exe" pcb export drill --output gerbers/ door_lock.kicad_pcb
```

---

## 13. เช็คลิสต์ก่อนสั่งผลิต + วิธีให้ตรวจ

ทำเองก่อน (ติ๊กทีละข้อ)
  [ ] ERC 0 errors
  [ ] DRC 0 unconnected, 0 error
  [ ] ตรวจ "เฉลย" ตาราง net ในหัวข้อ 6 ครบทุกบรรทัด
  [ ] Q1: net Q1_B อยู่ขา 1 (Base) · GND อยู่ขา 2 (Emitter) · BUZZ_LO อยู่ขา 3 (Collector)
  [ ] ลำดับขาของโมดูลจริง (RC522 / OLED / HY-SRF05) ตรงกับ header บนบอร์ด — ดูซิลค์สกรีนโมดูลจริง
  [ ] ไฟเข้า J1 = 5V ที่ขา 1, GND ที่ขา 2 (ต่อกลับขั้วบอร์ดจะไหม้)
  [ ] ขอบบอร์ดปิดครบ 88 × 148 mm ไม่มีเส้นขาด
  [ ] กด `B` fill zone ครั้งสุดท้ายแล้ว

ให้ผมตรวจอัตโนมัติ (ทำได้ทั้ง 2 ทาง)
```
python3 hardware/tools/check_board.py <โฟลเดอร์โปรเจกต์ของคุณ>
```
สคริปต์นี้จะรัน ERC + DRC ให้เอง แล้วเทียบการต่อทุก net กับ "เฉลย" ของโปรเจกต์
พร้อมบอกเป็น PASS/FAIL ทีละบรรทัด จากนั้นส่งผลมาให้ผมอ่านก็ได้

หมายเหตุของสคริปต์
  - ในผลลัพธ์ของสคริปต์ ขาทุกขาของ DevKit จะถูกเรียกว่า `U1.1`–`U1.30`
    (ขา 1–15 = แถวซ้าย, ขา 16–30 = แถวขวา) แม้ใน schematic คุณจะแยกเป็น U1/U2 ก็ตาม
  - "เฉลย" ในสคริปต์คือดีไซน์บอร์ด min (15 ชิ้น ไม่มีภาคจ่ายไฟ) — ถ้าเอาไปรันกับ
    `mainboard-2layer` (แบบมีภาคจ่ายไฟ) จะขึ้น FAIL หลายบรรทัดเป็นเรื่องปกติ เพราะคนละดีไซน์
  - ลองรันกับไฟล์เก่าได้เลย: `mainboard-min` / `-routed` / `-handmade` จะขึ้น FAIL เรื่องขา Q1
    (ยืนยัน bug ในภาคผนวก C ข้อ 1 — ERC/DRC ผ่านก็จริง แต่ของจริงจะใช้ไม่ได้)

---

## ภาคผนวก A — ปุ่มลัดสำคัญ

| ปุ่ม | ทำอะไร |
|------|--------|
| `A` / `P` / `L` | วาง symbol / power / global label (schematic) |
| `W` | ลากเส้น (schematic) |
| `Q` | ติด no-connect |
| `F8` | Update PCB from Schematic |
| `X` | เริ่มลาก track (PCB) |
| `V` | หย่อน via + สลับชั้น (ระหว่างลาก) |
| `W` / `Shift+W` | เพิ่ม/ลดความกว้างเส้น |
| `M` / `R` / `F` / `G` | ย้าย / หมุน / พลิกด้าน / drag คงการต่อ |
| `B` | เติม zone (GND pour) |
| `Ctrl+Shift+M` | ใส่พิกัดเป๊ะ |
| `U` | เลือกทั้ง net |
| `Ctrl+Z` | ย้อนกลับ |
| `?` | ดูรายการปุ่มลัดทั้งหมด |

## ภาคผนวก B — ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|-------|--------|
| ERC: "Input power pin not driven" | ยังไม่มี PWR_FLAG — วาง `power:PWR_FLAG` ต่อเข้า +5V |
| ERC: "unconnected pin" | ติด `Q` (no-connect) ที่ขานั้น หรือต่อ label ให้ครบ |
| ratsnest ไม่หายทั้งที่ลากถึงแล้ว | ปลายเส้นไม่ทับกลาง pad — กด `D` ลากปลายให้ทับ |
| ลากเส้นไม่ได้ ขึ้นเตือนชน | กด `V` มุดไปอีกชั้นแล้วอ้อม |
| DRC ฟ้อง unconnected ที่ GND | ยังไม่ได้กด `B` เติม zone |
| Gerber ไม่มีขอบบอร์ด | ยังไม่ได้วาด Edge.Cuts หรือกรอบไม่ปิด |
| เสียบ DevKit แล้วไม่แน่น | ใช้ PinSocket (ตัวเมีย) ไม่ใช่ PinHeader |
| บอร์ดบูตค้าง/แฟลชพัง | มีอะไรต่อกับ GPIO12 — ต้องไม่ต่อ (MISO ของ RC522 #2 ใช้ GPIO35) |

## ภาคผนวก C — จุดที่ต้องตรวจกับของจริง + ความต่างจากไฟล์เก่า

### C1. ⚠️ ขา Q1 สลับ (bug จริงในไฟล์เก่า — ต้องแก้แบบที่ไกด์นี้ระบุ)

ไฟล์เดิม (`mainboard-min`, `mainboard-min-handmade`, `mainboard-min-routed`) ใช้ symbol
`mainboard:NPN` ที่กำหนด ขา 1 = C, ขา 2 = B, ขา 3 = E
แต่ของจริง SOT-23 NPN (S8050 / MMBT2222A / BC817) ขา **1 = B, 2 = E, 3 = C**
(ยืนยันได้จาก symbol มาตรฐานของ KiCad เอง: `Transistor_BJT:MMBT2222A` extends `Q_NPN_BEC`
= pin1 B, pin2 E, pin3 C, footprint `Package_TO_SOT_SMD:SOT-23` — ตรงกับ datasheet)

ผลถ้าใช้ไฟล์เก่าไปสั่งผลิต: ทรานซิสเตอร์กลับขั้ว → วงจรขับ buzzer ไม่ทำงาน

แก้ให้ถูก (ตามไกด์นี้): ใช้ `Transistor_BJT:MMBT2222A`
  - Q1 ขา 1 (B) ← net `Q1_B` (จาก R8)
  - Q1 ขา 2 (E) ← net `GND`
  - Q1 ขา 3 (C) ← net `BUZZ_LO` (ไป J9.2)

วิธีแก้ไฟล์เก่า (เลือกทางใดทางหนึ่ง หลังแก้ให้รัน check_board.py ซ้ำ)

  ทาง A — สร้างใหม่ตามไกด์นี้ (แนะนำ ถ้ายังไม่ได้สั่งผลิต)
      ทำโปรเจกต์ใหม่ตามหัวข้อ 1–12 แล้วใช้ symbol MMBT2222A ตั้งแต่ต้น

  ทาง B — แก้ symbol ในไฟล์เก่า (เร็วสุด)
      1. เปิด Symbol Editor → library `mainboard` → symbol `NPN`
      2. แก้ "เลขขา" ให้ตรงของจริง (ชื่อขา/รูปไม่ต้องแตะ):
           ขาชื่อ B  → number 1
           ขาชื่อ E  → number 2
           ขาชื่อ C  → number 3
      3. กด Save → กลับไป Schematic Editor → Tools → Update PCB from Schematic (`F8`)
      4. ตรวจว่าไดโอด/ขั้วอื่นไม่ขยับ แล้วกด check_board.py ซ้ำ → ต้อง PASS ทุกบรรทัด
      ⚠️ ในไฟล์ `mainboard-min-routed` (ที่เดินลายแล้ว) หลัง F8 ต้องลบลาย 3 เส้น
         ที่เกี่ยวกับ Q1 (BUZZ_LO, Q1_B, GND ที่ขา Q1) แล้วลากใหม่ เพราะเลขขาเปลี่ยน
         → ถ้าขี้เกียจรื้อ ให้ใช้ทาง A ง่ายกว่า

### C2. ลำดับขาของโมดูลจริง — ต้องดูซิลค์สกรีนก่อนสั่งผลิต
  - RC522: บางรุ่นเรียง SDA, SCK, MOSI, MISO, IRQ, GND, RST, 3.3V (ตามไกด์นี้)
    แต่บางรุ่นสลับ — ดูที่ตัวโมดูลแล้วแก้ header ให้ตรง
  - OLED SSD1306 4 ขา: มักเป็น GND, VCC, SCL, SDA (ตามไกด์นี้)
  - HY-SRF05: รุ่น 5 ขา (VCC, Trig, Echo, OUT, GND) มีอยู่จริง — ถ้าของคุณเป็น 5 ขา
    ต้องเปลี่ยน J6 เป็น 1x05 และต่อ GND ให้ถูกตำแหน่ง

### C3. Buzzer BZ-1295 (ของที่ใช้)
  - เป็น **active buzzer** 3–5VDC → ใช้กับโค้ด `digitalWrite(HIGH/LOW)` ที่มีอยู่ได้เลย
    (ไม่ต้องใช้ tone()/PWM)
  - ต้องขับผ่าน Q1 (กระแส 10–30 mA เกินที่ควรให้ GPIO ขับตรง ๆ)
  - ต่อขั้ว: ขายาว (+) → J9.1 (+5V) · ขาสั้น (−) → J9.2 (ผ่าน Q1 ลง GND)
  - ถ้าอยากให้ปลอดภัยจากสเปก (5V = ขอบบน) เปลี่ยน J9.1 จาก +5V เป็น +3V3 ได้
  - ถ้าซื้อแบบ magnetic (มีขดลวด) แนะนำเพิ่มไดโอด 1N4148 คร่อมขา buzzer (ขั้วลบ–บวก)

### C4. คู่มือเก่าในโปรเจกต์ (อ่านได้ แต่มีจุดไม่ตรงกับบอร์ดจริง)
  - `hardware/KICAD_GUIDE_TH.md` = วิธีใช้ GUI/ลากสาย/ออก Gerber (ใช้ได้เลย)
  - `hardware/LEARN_PCB_TH.md` = ไกด์จากศูนย์เวอร์ชันเก่า: ต่อ buzzer เข้า GPIO ตรง ๆ
    ไม่มี Q1/R8, ไม่มีตัวแบ่ง Echo, ไม่มี pull-up I2C และเลขขา DevKit คลาดไป 1
    → ถ้าอ่านคู่กัน ให้ยึดไฟล์นี้ (`PCB_FROM_ZERO_TH.md`) เป็นหลัก
  - `hardware/mainboard-min/README_TH.md` = ตารางเก่า (บอก J1 3 ขา, มี C8/C9/C10/SW1/SW2
    ที่ไม่มีในบอร์ดจริง) → ยึดตัวไฟล์ .kicad_sch/.kicad_pcb เป็นหลัก

---

## สรุปลำดับทำงานสั้น ๆ

```
สร้างโปรเจกต์ → วาง symbol 16 ตัว (ตารางหัวข้อ 3) → ต่อ global label ตามตารางหัวข้อ 6
  → ERC 0 error → Assign footprint → วาด Edge.Cuts 88×148 → F8 Update PCB
  → วางอุปกรณ์ตามพิกัดหัวข้อ 9 → ตั้ง design rules → ลากสายตามลำดับหัวข้อ 10.3
  → กด B เท GND pour (+ keepout ใต้เสาอากาศ) → DRC 0 unconnected
  → Gerber + Drill → zip → JLCPCB
```
