# เรียนรู้การทำ PCB ด้วยตัวเองใน KiCad 10.0 — บอร์ด Security Door Lock (Carrier/Shield)

คู่มือนี้พาคุณทำบอร์ด **ด้วยมือตัวเองจากศูนย์** ทีละขั้น ตั้งแต่โปรเจกต์ว่างเปล่า
จนได้ไฟล์ Gerber ส่งโรงงาน ไม่มีไฟล์สำเร็จรูปให้ลอก — คุณต้องวางทุกสัญลักษณ์
ต่อทุก net เลือกทุก footprint และลากทุกเส้นเอง ตรงตามโค้ด `firmware/esp32-main`
ที่คุณมีอยู่จริง

สิ่งที่คุณจะทำ: **บอร์ดขยาย (carrier/shield)** ที่ ESP32 DevKit V1 (30 ขา)
เสียบลงไป แล้วมี header ให้โมดูลแต่ละตัวเสียบต่อ นี่คือบอร์ดแบบที่ง่ายที่สุด
และแก้ไขได้มากที่สุดสำหรับโปรเจกต์นักศึกษา

> ถ้าระหว่างทำเจอปัญหาหรือไม่แน่ใจ ให้หยุดแล้วถามได้เสมอ คู่มือนี้มีภาคผนวก
> "ปัญหาที่พบบ่อย" อยู่ท้ายสุด

---

## สารบัญ

0. ภาพรวมระบบ + ศัพท์พื้นฐาน
1. Pin map จากโค้ดจริง (ต้องรู้ก่อนวาด)
2. ขั้นที่ 1 — สร้างโปรเจกต์ใหม่
3. ขั้นที่ 2 — วาด Schematic (ลงรายละเอียดทีละโมดูล)
4. ขั้นที่ 3 — รัน ERC
5. ขั้นที่ 4 — Assign Footprint ให้ทุกสัญลักษณ์
6. ขั้นที่ 5 — Update PCB + วางอุปกรณ์
7. ขั้นที่ 6 — ตั้ง Design Rules + ลากสาย (Routing)
8. ขั้นที่ 7 — เท GND pour + รัน DRC
9. ขั้นที่ 8 — Export Gerber ส่งโรงงาน
- ภาคผนวก A: ปุ่มลัดสำคัญ
- ภาคผนวก B: ตารางอ้างอิง Symbol → Footprint
- ภาคผนวก C: ปัญหาที่พบบ่อย

---

## 0. ภาพรวมระบบ + ศัพท์พื้นฐาน

### ระบบทำงานยังไง

บอร์ดหลัก (ที่คุณกำลังทำ) คือ ESP32 ที่คุมทุกอย่าง ยกเว้น Wi-Fi/กล้อง —
ส่วนนั้นอยู่ที่ ESP32-CAM อีกบอร์ดหนึ่ง คุยกันผ่าน Serial2 (ขา 16/17)

โมดูลที่ต้องต่อเข้าบอร์ดหลักทั้งหมด:

| โมดูล | หน้าที่ | จำนวน |
|---|---|---|
| RC522 (RFID reader) | อ่านบัตร RFID เข้า/ออก | 2 ตัว |
| HY-SRF05 (Ultrasonic) | วัดระยะว่ามีคนยืนหน้าประตู | 1 ตัว |
| SSD1306 OLED 128x64 (I2C) | แสดงผล STANDBY/GRANTED/DENIED | 1 ตัว |
| Relay module | ปลดล็อกประตู (โซลินอยด์) | 1 ตัว |
| Buzzer | เสียงยืนยัน/ปฏิเสธ | 1 ตัว |
| ESP32-CAM (ผ่าน UART) | ถ่ายภาพ + คุยเซิร์ฟเวอร์ | 1 ตัว (อีกบอร์ด) |

### ศัพท์ที่ต้องรู้ก่อน (สำคัญมาก)

| คำ | ความหมาย |
|---|---|
| **Schematic** | แผนภาพวงจร บอกว่า "อะไรต่อกับอะไร" ไม่ใช่รูปบอร์ดจริง |
| **Symbol** | สัญลักษณ์ของอุปกรณ์ใน schematic (สี่เหลี่ยมมีขา) |
| **Footprint** | รูปทรงทองแดง/รูของอุปกรณ์จริงบนบอร์ด (เช่น รู 8 ขา ของ header) |
| **Pad** | จุดทองแดงที่บัดกรีขาอุปกรณ์ |
| **Net** | "กลุ่มจุดที่ต้องต่อถึงกัน" เช่น net `+3V3` = ทุก pad ที่ต้องได้ไฟ 3.3V |
| **Label (Global label)** | ป้ายชื่อ net — ป้ายชื่อเดียวกัน = สายเส้นเดียวกัน แม้ไม่ลากเส้นถึงกันบนจอ |
| **ERC** | ตรวจวงจร (schematic) ว่าเชื่อมถูกไหม |
| **DRC** | ตรวจบอร์ด (PCB) ว่าผลิตได้ไหม |
| **Track / Trace** | เส้นทองแดงที่ลากเชื่อม pad |
| **Ratsnest** | เส้นบางบอกว่า pad ไหน "ยังต้องต่อ" ไปหา pad ไหน (ยังไม่ใช่ทองแดงจริง) |
| **Via** | รูชุบทองแดง เชื่อมลายชั้นบน (F.Cu) กับชั้นล่าง (B.Cu) |
| **Zone / Pour** | พื้นที่ทองแดงกว้าง (ใช้ทำ ground plane) |
| **F.Cu / B.Cu** | ทองแดงด้านหน้า (Front) / ด้านหลัง (Back) |

---

## 1. Pin map จากโค้ดจริง

ต่อไปนี้คือ "สัญญา" ระหว่างโค้ดกับบอร์ดของคุณ ถ้าขาไหนต่อผิด โค้ดจะคุมอุปกรณ์ผิดตัว
คัดลอกตารางนี้ไว้ข้างจอตลอดเวลาที่วาด schematic

ที่มา: `firmware/esp32-main/src/config.h`

```
 ┌────────────────────────────────────────────────────────────┐
 │  RC522 #1 (ขาเข้า, VSPI)          RC522 #2 (ขาออก, HSPI)   │
 │    SCK  = GPIO18                    SCK  = GPIO14          │
 │    MISO = GPIO19                    MISO = GPIO35  ⚠️        │
 │    MOSI = GPIO23                    MOSI = GPIO13          │
 │    SS   = GPIO5                     SS   = GPIO4           │
 │    RST  = GPIO27                    RST  = GPIO2           │
 ├────────────────────────────────────────────────────────────┤
 │  Ultrasonic HY-SRF05:   Trig = GPIO33, Echo = GPIO32      │
 │  OLED SSD1306 (I2C):    SDA = GPIO21, SCL = GPIO22        │
 │  Buzzer:                GPIO25                             │
 │  Relay:                 GPIO26 (active-high)               │
 │  UART2 → ESP32-CAM:     RX = GPIO16, TX = GPIO17          │
 └────────────────────────────────────────────────────────────┘
```

⚠️ **เหตุผลที่ MISO ของ RC522 #2 ต้องเป็น GPIO35 (ไม่ใช่ GPIO12):**
GPIO12 เป็น strapping pin (MTDI) ที่ตั้งแรงดัน flash ตอนบูต ถ้าโมดูล RC522
ดึงขานี้ HIGH ตอนบูต flash จะเพี้ยนเป็น 1.8V แล้วบอร์ดบูตค้าง — โค้ดเขียน
comment เตือนไว้เองว่าผู้เขียน "เจอจริงตอนทดสอบฮาร์ดแวร์" แล้วย้ายไป GPIO35
ซึ่งเป็นขา input-only ดังนั้น **ห้ามลาก MISO ของ RC522 #2 ไป GPIO12 เด็ดขาด**

### ไฟเลี้ยงแต่ละโมดูล (สำคัญเท่ากัน)

ESP32 DevKit เสียบ USB จ่ายไฟให้เอง ตัว DevKit มี regulator 5V→3.3V ในตัว
ดังนั้นบน carrier board ของเราไม่ต้องมี regulator ใด ๆ แค่ "ดึงไฟ" จากขาของ
DevKit ไปเลี้ยงโมดูล:

| โมดูล | ไฟที่ต้องจ่าย | หมายเหตุ |
|---|---|---|
| RC522 x2 | **3.3V** | MFRC522 เป็นชิป 3.3V — ใช้ 3.3V ปลอดภัยที่สุด |
| OLED SSD1306 | **3.3V** | โมดูลมี reg ในตัว แต่ใช้ 3.3V สะอาดกว่า |
| HY-SRF05 | **5V** | ทำงานเสถียรที่ 5V |
| Relay module | **5V** | coil SRD-05VDC กิน 5V |
| Buzzer | **5V** | active buzzer 5V ดังชัดเจน |
| ESP32-CAM | **5V** | ESP32-CAM กิน 5V |

บนบอร์ดจึงมีแค่ 3 rail: `+5V`, `+3V3`, `GND` — ลากออกจากขา VIN/3V3/GND
ของ header ESP32

> **หมายเหตุ echo 5V:** HY-SRF05 เมื่อจ่ายไฟ 5V ขา Echo จะออก ~5V เข้า GPIO32
> โดยตรง — วงจรเดิมที่โค้ดอ้างอิง "ต่อตรงและยืนยันแล้ว" ว่าใช้ได้ ดังนั้นคู่มือนี้
> ต่อตรงตามโค้ด ไม่ใส่ voltage divider (ถ้าภายหลังเจอปัญหาอ่านค่าผิด จึงค่อยเพิ่ม)

---

## 2. ขั้นที่ 1 — สร้างโปรเจกต์ใหม่

KiCad 10.0.6 ของคุณติดตั้งอยู่ที่ `C:\Users\TEE\AppData\Local\Programs\KiCad\10.0\`

1. เปิด **KiCad** (Project Manager)
2. เมนู **File → New Project…**
3. สร้างโฟลเดอร์ใหม่:
   `C:\Users\TEE\ProjectY3IoT\Security_Door_Lock\hardware\myboard\`
4. ตั้งชื่อไฟล์ว่า `door_lock` แล้วกด Save
5. ได้ 3 ไฟล์: `door_lock.kicad_pro` (โปรเจกต์), `door_lock.kicad_sch`
   (schematic), `door_lock.kicad_pcb` (บอร์ด)

> **ทำบน branch ไหน:** ถ้าใช้ git กับทีม ให้สลับไป branch ของตัวเองก่อนเริ่ม
> (ตอนนี้เราอยู่บน branch `nongtee` แล้ว)

ตอนนี้ยังไม่ต้องตั้งค่า library ใด ๆ — บอร์ดนี้ใช้แค่ symbol/footprint มาตรฐาน
ที่มากับ KiCad ทั้งหมด

---

## 3. ขั้นที่ 2 — วาด Schematic

เปิด **Schematic Editor** (ดับเบิลคลิกไฟล์ .kicad_sch)

### 3.1 หลักการวาง symbol

ทุกโมดูลบนบอร์ด = **header (connector)** ตัวหนึ่งใน schematic เช่น
"ขั้ว 8 ขาสำหรับ RC522" ก็คือ symbol `Conn_01x08` เราแค่ต่อแต่ละขาไปหา
GPIO ที่ถูกต้องตาม pin map ผ่าน **global label**

หลักการทำงานของคุณ:
1. วาง symbol connector สำหรับแต่ละโมดูล
2. วาง global label ชื่อ net ที่จะใช้ (เช่น `RFID_ENTRY_SCK`)
3. ต่อขา connector ไปหา label นั้น
4. ขาไหนเป็นไฟ ให้ต่อ label `+3V3` / `+5V` / `GND`

### 3.2 ปุ่มที่ใช้ตลอดขั้นนี้

| ปุ่ม/เมนู | ทำอะไร |
|---|---|
| `A` (หรือ Shift+A) | เปิดหน้าต่างวาง symbol |
| `L` | วาง global label |
| `P` | วาง power symbol (+3V3, +5V, GND, PWR_FLAG) |
| `W` | ลากเส้น (wire) |
| `M` / `R` | ย้าย / หมุน symbol |
| `V` | แก้ค่าของ symbol |
| `Esc` | ยกเลิกโหมดปัจจุบัน |

### 3.3 ลำดับการวาด (ทำทีละโมดูล)

ด้านล่างคือ spec ที่สมบูรณ์ของแต่ละโมดูล — symbol ชื่ออะไร, ขาไหนต่อ net อะไร

#### (ก) ESP32 DevKit V1 — 2 × Conn_01x15

ESP32 DevKit 30 ขา = header 2 แถว แถวละ 15 ขา

1. กด `A` → ค้น `Conn_01x15` (จาก library `Connector_Generic`)
   → วาง 2 ตัว ตั้งชื่อ **J1** (แถวซ้าย) และ **J2** (แถวขวา)
2. ต่อ global label ที่แต่ละขาตามตารางนี้ (ขาที่ไม่ใช้ = ติด `X` no-connect
   หรือปล่อยว่างก็ได้ แต่ขาไฟ/GPIO ที่ใช้ **ต้องติด label ให้ครบ**)

**J1 (แถวซ้ายของ DevKit, ขา 1–15):**

| ขา | Net / Label |
|---|---|
| 1 | `+3V3` |
| 2 | `EN` (ปล่อยหรือต่อ RST — ไม่ใช้ในโค้ดนี้) |
| 3 | `GPIO36` (ไม่ใช้ → no-connect) |
| 4 | `GPIO39` (ไม่ใช้ → no-connect) |
| 5 | `GPIO34` (ไม่ใช้) |
| 6 | `GPIO35` → **`RFID_EXIT_MISO`** |
| 7 | `GPIO32` → **`US_ECHO`** |
| 8 | `GPIO33` → **`US_TRIG`** |
| 9 | `GPIO25` → **`BUZZER_CTRL`** |
| 10 | `GPIO26` → **`RELAY_CTRL`** |
| 11 | `GPIO27` → **`RFID_ENTRY_RST`** |
| 12 | `GPIO14` → **`RFID_EXIT_SCK`** |
| 13 | `GPIO12` (ห้ามใช้ — ติด no-connect) |
| 14 | `GND` |
| 15 | `GPIO13` → **`RFID_EXIT_MOSI`** |

**J2 (แถวขวาของ DevKit, ขา 1–15):**

| ขา | Net / Label |
|---|---|
| 1 | `+5V` (VIN) |
| 2 | `GND` |
| 3 | `GPIO23` → **`RFID_ENTRY_MOSI`** |
| 4 | `GPIO22` → **`OLED_SCL`** |
| 5 | `GPIO1` (U0TXD — ไม่ใช้ในโค้ด) |
| 6 | `GPIO3` (U0RXD — ไม่ใช้) |
| 7 | `GPIO21` → **`OLED_SDA`** |
| 8 | `GND` |
| 9 | `GPIO19` → **`RFID_ENTRY_MISO`** |
| 10 | `GPIO18` → **`RFID_ENTRY_SCK`** |
| 11 | `GPIO5` → **`RFID_ENTRY_SS`** |
| 12 | `GPIO17` → **`CAM_TX2`** |
| 13 | `GPIO16` → **`CAM_RX2`** |
| 14 | `GPIO4` → **`RFID_EXIT_SS`** |
| 15 | `GPIO2` → **`RFID_EXIT_RST`** |

> ขา 2/5/6 ของ J2 ไม่ได้ใช้ในโค้ดนี้ ติด no-connect (X) ได้เลย

#### (ข) RC522 #1 (ขาเข้า) — Conn_01x08 → J3

1. กด `A` → ค้น `Conn_01x08` → วาง ตั้งชื่อ **J3** = "RFID_ENTRY"
2. ต่อขา (โมดูล RC522 ทั่วไปเรียงขา: 1=SDA/SS, 2=SCK, 3=MOSI, 4=MISO,
   5=IRQ, 6=GND, 7=RST, 8=3.3V — **ยึดตามโมดูลจริงที่คุณซื้อ** โดยดูซิลค์สกรีน
   บนตัวโมดูลเป็นหลัก):

| ขา | Net / Label |
|---|---|
| 1 | `RFID_ENTRY_SS` |
| 2 | `RFID_ENTRY_SCK` |
| 3 | `RFID_ENTRY_MOSI` |
| 4 | `RFID_ENTRY_MISO` |
| 5 | `NC` (IRQ — โค้ดไม่ใช้ → no-connect) |
| 6 | `GND` |
| 7 | `RFID_ENTRY_RST` |
| 8 | `+3V3` |

#### (ค) RC522 #2 (ขาออก) — Conn_01x08 → J4

1. วาง `Conn_01x08` อีกตัว ตั้งชื่อ **J4** = "RFID_EXIT"
2. ต่อขาแบบเดียวกัน แต่เป็น net ของ exit:

| ขา | Net / Label |
|---|---|
| 1 | `RFID_EXIT_SS` |
| 2 | `RFID_EXIT_SCK` |
| 3 | `RFID_EXIT_MOSI` |
| 4 | `RFID_EXIT_MISO` |
| 5 | `NC` (no-connect) |
| 6 | `GND` |
| 7 | `RFID_EXIT_RST` |
| 8 | `+3V3` |

#### (ง) Ultrasonic HY-SRF05 — Conn_01x04 → J5

1. วาง `Conn_01x04` ตั้งชื่อ **J5** = "ULTRASONIC"
2. ต่อขา (เรียง: 1=VCC, 2=Trig, 3=Echo, 4=GND):

| ขา | Net / Label |
|---|---|
| 1 | `+5V` |
| 2 | `US_TRIG` |
| 3 | `US_ECHO` |
| 4 | `GND` |

#### (จ) OLED SSD1306 — Conn_01x04 → J6

1. วาง `Conn_01x04` ตั้งชื่อ **J6** = "OLED"
2. ต่อขา (โมดูล OLED I2C ทั่วไปเรียง: VCC, GND, SCL, SDA):

| ขา | Net / Label |
|---|---|
| 1 | `+3V3` |
| 2 | `GND` |
| 3 | `OLED_SCL` |
| 4 | `OLED_SDA` |

#### (ฉ) Relay module — Conn_01x03 → J7

1. วาง `Conn_01x03` ตั้งชื่อ **J7** = "RELAY"
2. ต่อขา (โมดูล relay สำเร็จรูป 3 ขา: VCC, IN, GND):

| ขา | Net / Label |
|---|---|
| 1 | `+5V` |
| 2 | `RELAY_CTRL` |
| 3 | `GND` |

> โค้ดตั้ง `kRelayActiveHigh = true` → IN = HIGH = ปลดล็อก เลือกโมดูล relay
> ที่เป็น active-high ตรงกัน (มี jumper เลือกได้หลายรุ่น)

#### (ช) Buzzer — Conn_01x02 → J8

1. วาง `Conn_01x02` ตั้งชื่อ **J8** = "BUZZER"
2. ต่อขา (active buzzer 2 ขา: +, −):

| ขา | Net / Label |
|---|---|
| 1 | `BUZZER_CTRL` |
| 2 | `GND` |

> โค้ดขับ buzzer ตรงจาก GPIO25 (digitalWrite HIGH/LOW) — ใช้ **active buzzer**
> (ไม่ใช่ piezo เปล่า) เพื่อให้มีเสียงเองเมื่อจ่ายไฟ

#### (ซ) ESP32-CAM link — Conn_01x04 → J9

1. วาง `Conn_01x04` ตั้งชื่อ **J9** = "CAM_LINK"
2. ต่อขา (เรียง: 5V, GND, TX, RX):

| ขา | Net / Label |
|---|---|
| 1 | `+5V` |
| 2 | `GND` |
| 3 | `CAM_RX2` |
| 4 | `CAM_TX2` |

> ⚠️ ครอสสาย: TX ของ ESP32 หลัก (GPIO17 = `CAM_TX2`) ต้องไปเข้า **RX** ของ
> ESP32-CAM และ RX (GPIO16 = `CAM_RX2`) ไปเข้า **TX** ของ ESP32-CAM
> (TX↔RX ไขว้กันเสมอ)

#### (ฌ) Power flags + จุดต่อไฟ

สุดท้าย วาง power symbol เพื่อบอก KiCad ว่า rail ไหนเป็นแหล่งจ่าย:

1. กด `P` → วาง `PWR_FLAG` อย่างน้อย 2 ตัว ต่อเข้า `+3V3` และ `+5V`
   (บอก ERC ว่า 2 rail นี้ "มีไฟเข้า" จริง)
2. วาง `GND`, `+3V3`, `+5V` symbol ต่อตามจุดที่ขาไฟของแต่ละ header
   (ถ้ายังไม่ได้ใส่ตอนวาดข้างบน)

### 3.4 เคล็ดลับการต่อ net ให้สะอาด

- **ใช้ global label แทนการลากเส้นยาว ๆ** — ขา GPIO ของ ESP32 (J1/J2) กับ
  ขา header ของโมดูล อยู่คนละมุมจอ ไม่ต้องลากเส้นโยงยาว ให้ติด label ชื่อ
  เดียวกันทั้งสองจุดแทน KiCad จะรู้ว่ามันคือ net เดียวกัน
- ตั้งชื่อ label ให้ตรงกับตารางในคู่มือนี้เป๊ะ (ตัวพิมพ์ใหญ่-เล็ก สำคัญ)
- ขาที่ไม่ใช้ ให้ติด **no-connect** (ปุ่ม `Q` แล้วคลิกปลายขา) เพื่อให้ ERC ไม่ฟ้อง
  "unconnected pin"

---

## 4. ขั้นที่ 3 — รัน ERC

1. เมนู **Inspect → Electrical Rules Checker**
2. กด **Run**
3. เป้าหมาย: **0 errors** (warning เกี่ยวกับ no-connect/power flag อ่านแล้ว
   ยอมรับได้ แต่ error ต้องเป็น 0)

**ถ้า ERC ฟ้อง ให้อ่านภาคผนวก C** — error ที่พบบ่อยคือ "Input power pin not
driven" (แก้โดยเพิ่ม PWR_FLAG) และ "unconnected pin" (แก้โดยติด no-connect
หรือต่อให้ครบ)

---

## 5. ขั้นที่ 4 — Assign Footprint ให้ทุกสัญลักษณ์

Footprint = รูปจริงบนบอร์ด ทุกสัญลักษณ์ต้องมี footprint ก่อนจะไป PCB

1. ใน Schematic Editor: เมนู **Tools → Assign Footprints…**
2. ช่องซ้าย = ไลบรารี footprint มาตรฐาน ช่องกลาง = รายการสัญลักษณ์
3. ไล่ assign ทีละตัวตามตารางนี้ (ค้นชื่อในช่อง filter):

| สัญลักษณ์ | Footprint (library) |
|---|---|
| J1, J2 (ESP32) | `PinSocket_1x15_P2.54mm_Vertical` (Connector_PinSocket_2.54mm) |
| J3, J4 (RC522) | `PinHeader_1x08_P2.54mm_Vertical` (Connector_PinHeader_2.54mm) |
| J5 (Ultrasonic) | `PinHeader_1x04_P2.54mm_Vertical` |
| J6 (OLED) | `PinHeader_1x04_P2.54mm_Vertical` |
| J7 (Relay) | `PinHeader_1x03_P2.54mm_Vertical` |
| J8 (Buzzer) | `PinHeader_1x02_P2.54mm_Vertical` |
| J9 (CAM link) | `PinHeader_1x04_P2.54mm_Vertical` |

> **J1/J2 ใช้ `PinSocket` (ตัวเมีย)** เพื่อให้ขาของ ESP32 DevKit เสียบลงไปได้
> โมดูลอื่นใช้ `PinHeader` (ตัวผู้) แล้วใช้สาย dupont/jumper ต่อ

4. กด **Apply, Save Schematic & Continue** แล้วปิดหน้าต่าง

---

## 6. ขั้นที่ 5 — Update PCB + วางอุปกรณ์

1. เปิด **PCB Editor** (ดับเบิลคลิกไฟล์ .kicad_pcb)
2. เมนู **Tools → Update PCB from Schematic…** (หรือ `F8`)
3. กด **Update PCB** → อุปกรณ์ทั้งหมดจะโผล่มากองรวมกัน คลิกวางกลางจอ
4. จะเห็น **ratsnest** เส้นบาง ๆ โยงยั่วยุ่ง = ยังไม่ได้ลากสาย (ปกติ)

### วางอุปกรณ์ (placement)

ก่อนลากสาย ต้องวางอุปกรณ์ให้เป็นระเบียบตามหลักนี้:

1. **ESP32 (J1/J2)** วางกลางบอร์ด คู่กัน แถวละ 15 ขา หันหลังชนกัน
   (J1 กับ J2 ขนานกัน ห่างกันพอให้ DevKit เสียบลงได้ = ระยะระหว่างแถวขา
   ของ DevKit มาตรฐาน ~0.9 นิ้ว)
2. **โมดูลที่ต่อขาใกล้กัน** วางใกล้กัน เช่น J3 (RFID entry) ใกล้ขา GPIO
   ของ ESP32 ที่มันต่อ
3. **ปล่อยพื้นที่ขอบบอร์ด** สำหรับ mounting hole (รูยึด M2/M3) 4 มุม
4. วางให้สายสั้นที่สุด = วางอุปกรณ์ที่ต่อกันไว้ชิดกัน

**ปุ่มวาง:**

| ปุ่ม | ทำอะไร |
|---|---|
| `M` | ย้ายอุปกรณ์ (ratsnest ตามไปด้วย) |
| `R` | หมุน 90° |
| `F` | พลิกไปอีกด้าน |
| `Ctrl+Shift+M` | ระบุพิกัดเป๊ะ |

---

## 7. ขั้นที่ 6 — ตั้ง Design Rules + ลากสาย

### 7.1 Design Rules (Board Setup)

เมนู **File → Board Setup → Design Rules → Constraints** และ **Net Classes**

ค่าที่แนะนำ (เหมาะ JLCPCB 2 ชั้น):

| Net Class | Track width | Clearance | Via |
|---|---|---|---|
| Default | 0.3 mm | 0.2 mm | 0.6/0.3 mm |
| Power (`+5V`, `+3V3`, `GND`) | 0.5 mm | 0.2 mm | 0.6/0.3 mm |

> 2 ชั้น (F.Cu + B.Cu) พอสำหรับบอร์ดนี้ ไม่ต้อง 4 ชั้น

### 7.2 ลากสาย (Routing) — หัวใจของงาน

เป้าหมาย: ลาก track ทองแดงแทน ratsnest ทุกเส้นจนเหลือ 0

1. เลือกชั้นทำงานที่แถบขวา: **`F.Cu`** (แดง)
2. กด **`X`** (Route Track) → คลิกที่ pad ต้นทาง
3. เลื่อนเมาส์ → คลิกเพื่อหักมุม → **ดับเบิลคลิกที่ pad ปลายทาง** จบเส้น
   (ratsnest เส้นนั้นหาย = ต่อสำเร็จ)
4. `Esc` ออกจากโหมดลาก

**สลับชั้น + ใส่ via:** ระหว่างลากเส้นอยู่ กด **`V`** → KiCad หย่อน via ลงตรงนั้น
แล้วสลับไปเดินต่อบนอีกชั้น (ใช้ตอนเส้นบนชั้นนี้ตัน)

**ความกว้างเส้น:**
- เส้นสัญญาณทั่วไป 0.3 mm พอ
- เส้นไฟ (`+5V`, `+3V3`, `GND` ไป relay/โมดูล) ใช้ **0.5 mm** ขึ้นไป
- เปลี่ยนความกว้างระหว่างลาก: กด `W` (เพิ่ม) / `Shift+W` (ลด)

**ลำดับการลากที่แนะนำ:**
1. เส้นไฟก่อน (`+5V` → `+3V3`) ตอนบอร์ดยังว่าง
2. เส้นสัญญาณ SPI/I2C/UART จาก ESP32 ออกไปโมดูล
3. เส้นสั้น ๆ ที่เหลือ
4. **GND ไว้ท้ายสุด** — จะใช้ "pour" (ขั้นที่ 7) ไม่ต้องลากทีละเส้น

> ดูจำนวนที่เหลือได้ที่มุมล่าง "Unrouted" — ทำจนเป็น 0 (ยกเว้น GND ที่จะ
> จัดการด้วย pour)

---

## 8. ขั้นที่ 7 — เท GND pour + รัน DRC

### เท ground plane (GND pour)

แทนที่จะลาก GND ทีละเส้น เราเททองแดงเป็นพื้นที่กว้างคลุมทั้งบอร์ด

1. เลือกชั้น **`B.Cu`** (น้ำเงิน)
2. กด **`Ctrl+Shift+Z`** (Add Filled Zone) หรือปุ่มรูปพื้นที่ทองแดง
3. คลิกวาดกรอบสี่เหลี่ยมคลุมทั้งบอร์ด (คลิกทีละมุม ปิดกรอบที่จุดเริ่ม)
4. หน้าต่าง: เลือก **net = `GND`**, layer = `B.Cu` → OK
5. (ถ้าต้องการ ground ทั้ง 2 ด้าน) ทำซ้ำบน `F.Cu`
6. กด **`B`** = Fill All Zones → ทองแดงเติมเต็ม เว้นระยะรอบเส้น/pad อื่น
   อัตโนมัติ และ GND ทุกจุดเชื่อมเข้าพื้นนี้ (ratsnest GND หายหมด)

> ⚠️ ทุกครั้งที่แก้ลายเสร็จ ต้องกด `B` เติม zone ใหม่ก่อนตรวจ/ส่งไฟล์เสมอ

### รัน DRC

1. เมนู **Inspect → Design Rules Checker**
2. ติ๊ก **Refill all zones before performing DRC**
3. กด **Run**
4. เป้าหมาย: **0 unconnected**, ไม่มี error สีแดง
   - ดับเบิลคลิกที่ error → จอซูมไปที่จุดนั้นให้แก้

---

## 9. ขั้นที่ 8 — Export Gerber ส่งโรงงาน

1. **กด `B` เติม zone ก่อน** (สำคัญที่สุด)
2. เมนู **File → Fabrication Outputs → Gerbers (.gbr)**
   - ติ๊ก layers: `F.Cu`, `B.Cu`, `F.Paste`, `B.Paste`, `F.Silkscreen`,
     `B.Silkscreen`, `F.Mask`, `B.Mask`, `Edge.Cuts`
   - กด **Plot**
3. กด **Generate Drill Files…** → เลือก **Excellon**, ติ๊ก
   *PTH and NPTH in single file* → **Generate Drill File**
4. เอาไฟล์ `.gbr` + `.drl` ทั้งหมด **zip รวมกัน**
5. อัปโหลด zip ที่ **jlcpcb.com** → ดูพรีวิว → สั่งผลิต

**ตั้งค่า JLCPCB แนะนำ:** Layers = 2, Thickness = 1.6 mm, ที่เหลือ default

> **อย่าลืมวาดขอบบอร์ด (Edge.Cuts)!** ถ้ายังไม่วาด ให้เลือกชั้น `Edge.Cuts`
> แล้วกด `Ctrl+Shift+L` (line) หรือใช้ rectangle วาดกรอบบอร์ดเสียก่อน
> มิฉะนั้น Gerber จะไม่มีขอบบอร์ด

---

## ภาคผนวก A: ปุ่มลัดสำคัญ

| ปุ่ม | ความหมาย |
|---|---|
| `A` / `P` / `L` | วาง symbol / power / label (schematic) |
| `W` | ลากเส้น (schematic) |
| `X` | เริ่มลาก track (PCB) |
| `V` | ใส่ via + สลับชั้น (ระหว่างลาก track) |
| `D` | drag เส้น (คงการต่อ) |
| `M` / `R` / `F` | move / rotate / flip อุปกรณ์ |
| `B` | เติม zone (GND pour) |
| `E` | แก้คุณสมบัติสิ่งที่ชี้อยู่ |
| `U` | เลือกทั้ง net |
| `` ` `` | ไฮไลต์ net ทั้งเส้น |
| `Ctrl+Z` | undo |
| `F8` | Update PCB from Schematic |
| `?` | โชว์รายการปุ่มลัดทั้งหมด |

## ภาคผนวก B: ตารางอ้างอิง Symbol → Footprint (สรุป)

| Ref | โมดูล | Symbol | Footprint |
|---|---|---|---|
| J1, J2 | ESP32 DevKit | Conn_01x15 ×2 | PinSocket_1x15_P2.54mm_Vertical |
| J3 | RC522 ขาเข้า | Conn_01x08 | PinHeader_1x08_P2.54mm_Vertical |
| J4 | RC522 ขาออก | Conn_01x08 | PinHeader_1x08_P2.54mm_Vertical |
| J5 | Ultrasonic | Conn_01x04 | PinHeader_1x04_P2.54mm_Vertical |
| J6 | OLED | Conn_01x04 | PinHeader_1x04_P2.54mm_Vertical |
| J7 | Relay | Conn_01x03 | PinHeader_1x03_P2.54mm_Vertical |
| J8 | Buzzer | Conn_01x02 | PinHeader_1x02_P2.54mm_Vertical |
| J9 | CAM link | Conn_01x04 | PinHeader_1x04_P2.54mm_Vertical |

## ภาคผนวก C: ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| ERC ฟ้อง "Input power pin not driven" | วาง `PWR_FLAG` ต่อเข้า `+3V3` และ `+5V` |
| ERC ฟ้อง "unconnected pin" | ขานั้นไม่ได้ต่อ — ต่อ net ให้ครบ หรือติด no-connect (`Q`) |
| ratsnest ไม่หายทั้งที่ลากถึงแล้ว | ปลายเส้นไม่โดน pad จริง — กด `D` ลากปลายให้ทับกลาง pad |
| ลากเส้นไม่ได้ ขึ้นเตือนชนกัน | มีเส้น/pad ขวาง — กด `V` เปลี่ยนชั้นแล้วอ้อม |
| DRC ฟ้อง "unconnected" ที่ GND | ยังไม่ได้กด `B` เติม zone |
| Gerber ไม่มีขอบบอร์ด | ยังไม่ได้วาด Edge.Cuts — วาดกรอบก่อน export |
| footprint ไม่ตรงโมดูลที่ซื้อมา | เปิด datasheet โมดูล เช็กลำดับขา แล้วแก้ net ใน schematic ให้ตรง |
| RC522 #2 ทำให้บอร์ดบูตค้าง | MISO ต่อผิดไป GPIO12 — ต้องเป็น GPIO35 (input-only) |

---

## สรุปลำดับทำงานสั้น ๆ

```
สร้างโปรเจกต์ → วาด schematic (วาง connector 9 ตัว + ต่อ net ตาม pin map)
  → ERC ผ่าน 0 error
  → Assign footprint ตามตาราง
  → F8 Update PCB → วางอุปกรณ์
  → ตั้ง design rules → ลากสาย (X, V) จน Unrouted = 0
  → กด B เท GND pour → DRC ผ่าน
  → วาด Edge.Cuts → Export Gerber + Drill → zip → อัปโหลด JLCPCB
```

จบแล้วคุณจะได้บอร์ด carrier/shield ที่ ESP32 DevKit เสียบลง แล้วต่อทุกโมดูล
ได้ด้วย header — บอร์ดเดียวแทนสายจัมเปอร์ทั้งกองบน breadboard
