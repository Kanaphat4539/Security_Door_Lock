# PINOUT — บอร์ด Security Door Lock (รวมอุปกรณ์ที่ต้องเพิ่มแล้ว)

ไฟล์นี้ = **ตารางขาแบบครบชุด** สำหรับใช้ตอนวางสัญลักษณ์/ติด NetLabel ใน EasyEDA
รวมของที่ต้องเพิ่มเข้าไปในตารางแล้ว: **J1 (ไฟเข้า)** · **Q1 + R8 (ขับ buzzer)** · **R6 + R7 (ตัวแบ่ง ECHO)** · R4/R5 (pull-up I2C)

ไฟล์ที่เกี่ยว: `WIRING_MAP_TH.md` (เหตุผล/คำอธิบายของที่เพิ่ม + ข้อควรระวังจากโค้ด) · `EASYEDA_FROM_ZERO_TH.md` (วิธีใช้โปรแกรม)
ขาทุกขาตรงกับ `firmware/esp32-main/src/config.h`

---

## 0. สัญลักษณ์ทั้งหมดที่ต้องมี (นับรวมของที่เพิ่ม) — 14 รายการ

| Ref | อุปกรณ์ | ค้นในไลบรารี EasyEDA | ขา |
|-----|---------|----------------------|----|
| U1 | Module RC522 (ฝาเข้า / VSPI) | `Module RC522` | 8 |
| U2 | Module RC522 (ฝาออก / HSPI) | `Module RC522` | 8 |
| U3 | DOIT ESP32 DEVKIT V1 | `DOIT ESP32 DEVKIT V1` | 30 |
| U4 | OLED 1.3" 128x64 I2C | `OLED 1.3 128x64 I2C` | 4 |
| U5 | ULTRASONIC | `ULTRASONIC` | 4 |
| BZ1 | BUZZER (active 3–5V) | `BUZZER` | 2 |
| RELAY | RELAY MODULE (ควรเป็นคอยล์ 5V) | `SINGLE 6V-10A RELAY MODULE` | 6 |
| **J1** | **ขั้วต่อไฟเข้า 5V/GND** | `HDR-M-2.54_1X2` | 2 |
| **Q1** | **NPN ขับ buzzer** | `S8050` (C181158) หรือ `2N3904(SOT-23)` | 3 (B·E·C) |
| **R8** | **1k — base resistor** | `1k 0805` → C17513 | 2 |
| **R6** | **1k — ตัวบนของตัวแบ่ง ECHO** | `1k 0805` → C17513 | 2 |
| **R7** | **2k — ตัวล่างของตัวแบ่ง ECHO** | `2k 0805` → C17604 | 2 |
| R4, R5 | 4.7k — pull-up I2C (ถ้า OLED ไม่มีมาให้) | `4.7k 0805` → C17673 | 2+2 |
| J_CAM | (ตัวเลือก) ขั้วต่อไป ESP32-CAM | `HDR-M-2.54_1X4` | 4 |
| C1 | (แนะนำ) 100–470 µF คร่อม +5V | — | 2 |
| C2–C5 | (แนะนำ) 100 nF ที่ขา VCC ของ U1/U2/U4/U5 | — | 2 ตัวละ |

---

## 1. U3 — DOIT ESP32 DEVKIT V1 (ครบ 30 ขา)

แถวซ้าย (บน→ล่าง) = EN · VP · VN · D34 · D35 · D32 · D33 · D25 · D26 · D27 · D14 · D12 · D13 · GND · VIN
แถวขวา (บน→ล่าง) = D23 · D22 · TX0 · RX0 · D21 · D19 · D18 · D5 · TX2 · RX2 · D4 · D2 · D15 · GND · 3V3

| # | ชื่อขา | GPIO | net | ต่อไปที่ |
|---|--------|------|-----|----------|
| 1 | EN | — | — | ว่าง (No-Connect) |
| 2 | VP | 36 | — | ว่าง (input-only) |
| 3 | VN | 39 | — | ว่าง (input-only) |
| 4 | D34 | 34 | — | ว่าง (input-only) |
| 5 | D35 | 35 | `RFID_EXIT_MISO` | U2.4 |
| 6 | D32 | 32 | `US_ECHO_3V3` | R6.2 + R7.1 |
| 7 | D33 | 33 | `US_TRIG` | U5.2 (TRIG) |
| 8 | D25 | 25 | `BUZZER_CTRL` | R8.1 |
| 9 | D26 | 26 | `RELAY_CTRL` | RELAY.3 (S / IN) |
| 10 | D27 | 27 | `RFID_ENTRY_RST` | U1.7 |
| 11 | D14 | 14 | `RFID_EXIT_SCK` | U2.2 |
| 12 | D12 | 12 | — | **ห้ามต่ออะไรเลย** (strapping) |
| 13 | D13 | 13 | `RFID_EXIT_MOSI` | U2.3 |
| 14 | GND | — | `GND` | ทุกจุด GND |
| 15 | VIN | — | `+5V` | J1.1 |
| 16 | D23 | 23 | `RFID_ENTRY_MOSI` | U1.3 |
| 17 | D22 | 22 | `OLED_SCL` | U4.3 + R5.2 |
| 18 | TX0 | 1 | — | ว่าง |
| 19 | RX0 | 3 | — | ว่าง |
| 20 | D21 | 21 | `OLED_SDA` | U4.4 + R4.2 |
| 21 | D19 | 19 | `RFID_ENTRY_MISO` | U1.4 |
| 22 | D18 | 18 | `RFID_ENTRY_SCK` | U1.2 |
| 23 | D5 | 5 | `RFID_ENTRY_SS` | U1.1 |
| 24 | TX2 | 17 | `CAM_TX2` | J_CAM.3 |
| 25 | RX2 | 16 | `CAM_RX2` | J_CAM.4 |
| 26 | D4 | 4 | `RFID_EXIT_SS` | U2.1 |
| 27 | D2 | 2 | `RFID_EXIT_RST` | U2.7 |
| 28 | D15 | 15 | — | ว่าง |
| 29 | GND | — | `GND` | ทุกจุด GND |
| 30 | 3V3 | — | `+3V3` | U1.8 · U2.8 · U4.1 · R4.1 · R5.1 |

---

## 2. ขาของแต่ละโมดูล

### U1 — Module RC522 (ฝาเข้า)
| ขา | ชื่อ | net | ต่อไปที่ |
|-----|------|-----|----------|
| 1 | SDA (=SS) | `RFID_ENTRY_SS` | U3.D5 |
| 2 | SCK | `RFID_ENTRY_SCK` | U3.D18 |
| 3 | MOSI | `RFID_ENTRY_MOSI` | U3.D23 |
| 4 | MISO | `RFID_ENTRY_MISO` | U3.D19 |
| 5 | IRQ | — | No-Connect |
| 6 | GND | `GND` | — |
| 7 | RST | `RFID_ENTRY_RST` | U3.D27 |
| 8 | 3.3V | `+3V3` | — |

### U2 — Module RC522 (ฝาออก)
| ขา | ชื่อ | net | ต่อไปที่ |
|-----|------|-----|----------|
| 1 | SDA (=SS) | `RFID_EXIT_SS` | U3.D4 |
| 2 | SCK | `RFID_EXIT_SCK` | U3.D14 |
| 3 | MOSI | `RFID_EXIT_MOSI` | U3.D13 |
| 4 | MISO | `RFID_EXIT_MISO` | U3.D35 |
| 5 | IRQ | — | No-Connect |
| 6 | GND | `GND` | — |
| 7 | RST | `RFID_EXIT_RST` | U3.D2 |
| 8 | 3.3V | `+3V3` | — |

### U4 — OLED 1.3" I2C (SH1106)
| ขา | ชื่อ | net | ต่อไปที่ |
|-----|------|-----|----------|
| 1 | VDD | `+3V3` | — |
| 2 | GND | `GND` | — |
| 3 | SCK | `OLED_SCL` | U3.D22 + R5.2 |
| 4 | SDA | `OLED_SDA` | U3.D21 + R4.2 |

### U5 — ULTRASONIC
| ขา | ชื่อ | net | ต่อไปที่ |
|-----|------|-----|----------|
| 1 | VCC | `+5V` | — |
| 2 | TRIG | `US_TRIG` | U3.D33 |
| 3 | ECHO | `US_ECHO_5V` | R6.1 |
| 4 | GND | `GND` | — |

### BZ1 — BUZZER (ต่อผ่าน Q1 เท่านั้น)
| ขา | ชื่อ | net | ต่อไปที่ |
|-----|------|-----|----------|
| 1 | + (ขายาว) | `+5V` | — |
| 2 | − (ขาสั้น) | `BUZZ_LO` | Q1.C (ขา 3) |

### RELAY — RELAY MODULE
| ขา | ชื่อ | net | ต่อไปที่ |
|-----|------|-----|----------|
| 1 | + | `+5V` | — |
| 2 | − | `GND` | — |
| 3 | S (IN) | `RELAY_CTRL` | U3.D26 |
| 4 | NC | — | ไม่ใช้ |
| 5 | COM | `LOCK_COM` | ขั้วต่อโหลด ขา 1 |
| 6 | NO | `LOCK_NO` | ขั้วต่อโหลด ขา 2 |

### J1 — ไฟเข้า (เพิ่มใหม่)
| ขา | net | ต่อไปที่ |
|-----|-----|----------|
| 1 | `+5V` | U3.VIN · U5.VCC · BZ1.1 · RELAY.1 · J_CAM.1 |
| 2 | `GND` | ทุกจุด GND |

### Q1 — NPN ขับ buzzer (เพิ่มใหม่) — SOT-23: ขา 1 = B, 2 = E, 3 = C
| ขา | ชื่อ | net | ต่อไปที่ |
|-----|------|-----|----------|
| 1 | B (base) | `Q1_B` | R8.2 |
| 2 | E (emitter) | `GND` | — |
| 3 | C (collector) | `BUZZ_LO` | BZ1.2 (−) |

### ตัวต้านทาน (เพิ่มใหม่ + แนะนำ)
| Ref | ค่า | ขา 1 | ขา 2 |
|-----|-----|------|------|
| R8 | 1k | `BUZZER_CTRL` (จาก U3.D25) | `Q1_B` (เข้า Q1.B) |
| R6 | 1k | `US_ECHO_5V` (จาก U5.ECHO) | `US_ECHO_3V3` (ไป U3.D32 + R7.1) |
| R7 | 2k | `US_ECHO_3V3` (ต่อกับ R6.2 + U3.D32) | `GND` |
| R4 | 4.7k | `+3V3` | `OLED_SDA` (U4.4 + U3.D21) |
| R5 | 4.7k | `+3V3` | `OLED_SCL` (U4.3 + U3.D22) |

### J_CAM — (ตัวเลือก) ไป ESP32-CAM
| ขา | net | ต่อไปที่ |
|-----|-----|----------|
| 1 | `+5V` | — |
| 2 | `GND` | — |
| 3 | `CAM_TX2` | U3.TX2 (ไป RX ของกล้อง) |
| 4 | `CAM_RX2` | U3.RX2 (ไป TX ของกล้อง) |

---

## 3. "เฉลย" — net ไหนต้องมีจุดต่ออะไรบ้าง (ติ๊กทีละบรรทัดใน Design Manager)

| net | ต้องมีจุดเหล่านี้ครบ |
|-----|---------------------|
| `+5V` | U3.VIN · J1.1 · U5.VCC · BZ1.1(+) · RELAY.1(+) · J_CAM.1 · C1.+ |
| `+3V3` | U3.3V3 · U1.8 · U2.8 · U4.VDD · R4.1 · R5.1 |
| `GND` | U3.GND (2 ขา) · J1.2 · U1.6 · U2.6 · U4.GND · U5.GND · RELAY.2(−) · Q1.E · R7.2 · J_CAM.2 · C1.− |
| `RFID_ENTRY_SS` | U3.D5 · U1.1 |
| `RFID_ENTRY_SCK` | U3.D18 · U1.2 |
| `RFID_ENTRY_MOSI` | U3.D23 · U1.3 |
| `RFID_ENTRY_MISO` | U3.D19 · U1.4 |
| `RFID_ENTRY_RST` | U3.D27 · U1.7 |
| `RFID_EXIT_SS` | U3.D4 · U2.1 |
| `RFID_EXIT_SCK` | U3.D14 · U2.2 |
| `RFID_EXIT_MOSI` | U3.D13 · U2.3 |
| `RFID_EXIT_MISO` | U3.D35 · U2.4 |
| `RFID_EXIT_RST` | U3.D2 · U2.7 |
| `US_TRIG` | U3.D33 · U5.TRIG |
| `US_ECHO_5V` | U5.ECHO · R6.1 |
| `US_ECHO_3V3` | U3.D32 · R6.2 · R7.1 |
| `BUZZER_CTRL` | U3.D25 · R8.1 |
| `Q1_B` | R8.2 · Q1.B (ขา 1) |
| `BUZZ_LO` | Q1.C (ขา 3) · BZ1.2 (−) |
| `RELAY_CTRL` | U3.D26 · RELAY.3 |
| `OLED_SDA` | U3.D21 · U4.SDA · R4.2 |
| `OLED_SCL` | U3.D22 · U4.SCK · R5.2 |
| `CAM_TX2` | U3.TX2 · J_CAM.3 |
| `CAM_RX2` | U3.RX2 · J_CAM.4 |
| `LOCK_COM` / `LOCK_NO` | RELAY.COM / RELAY.NO · ขั้วต่อโหลด |

---

## 4. รายการที่ต้องสร้างใน EasyEDA (คัดลอกได้เลย)

NetFlag (ไฟ): `GND` · `+5V` · `+3V3` (วาง NetFlag VCC แล้วเปลี่ยนชื่อ)

NetLabel (สัญญาณ):
```
RFID_ENTRY_SS  RFID_ENTRY_SCK  RFID_ENTRY_MOSI  RFID_ENTRY_MISO  RFID_ENTRY_RST
RFID_EXIT_SS   RFID_EXIT_SCK   RFID_EXIT_MOSI   RFID_EXIT_MISO   RFID_EXIT_RST
US_TRIG        US_ECHO_5V      US_ECHO_3V3
BUZZER_CTRL    Q1_B            BUZZ_LO          RELAY_CTRL
OLED_SDA       OLED_SCL        LOCK_COM         LOCK_NO
CAM_TX2        CAM_RX2         (เฉพาะถ้าทำสายไปกล้อง)
```
ขาที่ต้องติด **No-Connect Flag**: U1.5 · U2.5 · U3.EN, VP, VN, D34, D12, TX0, RX0, D15 · RELAY.4 (NC)

---

## 5. ต้องไม่ลืม (สรุปสั้น)

1. BZ1 **ห้ามต่อกับ GPIO ตรง ๆ** — ต้องผ่าน Q1 + R8 (ตามตารางหัวข้อ 2)
2. ECHO ของ U5 **ห้ามต่อตรงเข้า D32** — ต้องผ่าน R6/R7 (จุดกลาง = `US_ECHO_3V3`)
3. D12 ต้องว่างเสมอ (เป็นเหตุผลที่ MISO ของ RC522 ตัวออกอยู่ที่ D35)
4. ขา Q1: **1 = B · 2 = E · 3 = C** — ตรวจในสัญลักษณ์ก่อนเดินลาย (ของจริง SOT-23 เป็นแบบนี้)
5. relay ต้องเป็นแบบ HIGH-trigger ให้ตรงกับ `kRelayActiveHigh = true` (หรือแก้โค้ดเป็น false)
6. จอ 1.3" = SH1106 → ใช้โค้ด `Adafruit_SH1106G` (esp_main.ino)
7. ไฟเข้าใช้ 5V ≥1A — 3.3V ดึงจากขา 3V3 ของ DevKit (ไม่ต้องป้อนจากนอก)
8. PCB: ห้ามเททองแดงใต้เสาอากาศ ESP32 (Solid Region → Type = `No Solid` → `Shift+B`)

---

## 6. เช็คลิสต์ก่อน Convert to PCB

- [ ] มีสัญลักษณ์ครบตามหัวข้อ 0 (อย่างน้อย U1,U2,U3,U4,U5,BZ1,RELAY,J1,Q1,R6,R7,R8)
- [ ] ติด NetLabel/NetFlag ครบทุกชื่อในหัวข้อ 4 และไม่มีชื่อที่พิมพ์เพี้ยน
- [ ] No-Connect Flag ครบทุกขาที่ระบุ
- [ ] `Ctrl+D` → Nets: ตรงกับ "เฉลย" หัวข้อ 3 ทุกบรรทัด ไม่มีเน็ตขึ้นแดง
- [ ] `Alt+F` → ทุกตัวมี footprint (HDR-M-2.54_1X2/1X3/1X4/1X8 ตามที่ใช้ · R = 0805 · Q1 = SOT-23)
- [ ] ขา Q1 และขั้ว BZ1 (+) / (−) ถูกต้อง
