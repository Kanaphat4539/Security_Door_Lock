# PINOUT และการต่อสาย — Security Door Lock

เอกสารนี้เป็นแหล่งอ้างอิงรวมสำหรับวางสัญลักษณ์ ติด NetLabel ตรวจ schematic
และต่อสายจริง โดยรวมข้อมูลเดิมจาก `WIRING_MAP_TH.md` ไว้ที่เดียว

> **แหล่งอ้างอิงหลัก (source of truth):** `firmware/esp32-main/src/esp_main/full-main_test.ino` บน branch `pooh` หากพบข้อมูลขัดแย้ง ให้ยึด GPIO จากไฟล์ดังกล่าวและปรับเอกสารนี้ให้ตรงกัน

## 1. U3 — DOIT ESP32 DEVKIT V1

แถวซ้ายบนลงล่าง: `EN · VP · VN · D34 · D35 · D32 · D33 · D25 · D26 · D27 · D14 · D12 · D13 · GND · VIN`

แถวขวาบนลงล่าง: `D23 · D22 · TX0 · RX0 · D21 · D19 · D18 · D5 · TX2 · RX2 · D4 · D2 · D15 · GND · 3V3`

| ขาบนบอร์ด | GPIO | Net | หน้าที่/จุดต่อ |
|---|---:|---|---|
| EN | — | — | ไม่ใช้; No-Connect |
| VP | 36 | — | ไม่ใช้; input-only |
| VN | 39 | — | ไม่ใช้; input-only |
| D34 | 34 | — | ไม่ใช้; input-only |
| D35 | 35 | `RFID_OUT_MISO` | U2 MISO; input-only |
| D32 | 32 | — | ไม่ใช้; No-Connect |
| D33 | 33 | `BUZZER_CTRL` | BZ1.S |
| D25 | 25 | `RELAY_CTRL` | RELAY.S / IN |
| D26 | 26 | `US_TRIG` | U5.TRIG |
| D27 | 27 | `US_ECHO_3V3` | จุดกลาง R6/R7 |
| D14 | 14 | `RFID_OUT_SCK` | U2.SCK |
| D12 | 12 | — | **ห้ามต่อ; strapping pin** |
| D13 | 13 | `RFID_OUT_MOSI` | U2.MOSI |
| GND | — | `GND` | กราวด์ร่วม |
| VIN | — | `+5V` | ไฟ 5V จาก J1 |
| D23 | 23 | `RFID_IN_MOSI` | U1.MOSI |
| D22 | 22 | `OLED_SCL` | U4.SCL/SCK |
| TX0 | 1 | — | ไม่ใช้; No-Connect |
| RX0 | 3 | — | ไม่ใช้; No-Connect |
| D21 | 21 | `OLED_SDA` | U4.SDA |
| D19 | 19 | `RFID_IN_MISO` | U1.MISO |
| D18 | 18 | `RFID_IN_SCK` | U1.SCK |
| D5 | 5 | `RFID_IN_SS` | U1.SDA/SS |
| TX2 | 17 | `RFID_OUT_SS` | U2.SDA/SS |
| RX2 | 16 | — | ไม่ใช้; No-Connect |
| D4 | 4 | `RFID_IN_RST` | U1.RST |
| D2 | 2 | `RFID_OUT_RST` | U2.RST |
| D15 | 15 | — | ไม่ใช้; No-Connect |
| GND | — | `GND` | กราวด์ร่วม |
| 3V3 | — | `+3V3` | U1, U2 และ U4 |

> GPIO2 เป็น strapping pin แต่เฟิร์มแวร์และฮาร์ดแวร์ปัจจุบันใช้เป็น RST ของ U2 ห้ามเพิ่มตัวดึงระดับที่รบกวนช่วงบูต

## 2. โมดูลและขั้วต่อ

### U1 — RC522 ฝั่งเข้า / VSPI

| ขา | ชื่อ | Net | ต่อไปที่ |
|---:|---|---|---|
| 1 | SDA / SS | `RFID_IN_SS` | U3.D5 |
| 2 | SCK | `RFID_IN_SCK` | U3.D18 |
| 3 | MOSI | `RFID_IN_MOSI` | U3.D23 |
| 4 | MISO | `RFID_IN_MISO` | U3.D19 |
| 5 | IRQ | — | No-Connect |
| 6 | GND | `GND` | กราวด์ร่วม |
| 7 | RST | `RFID_IN_RST` | U3.D4 |
| 8 | 3.3V | `+3V3` | U3.3V3 |

### U2 — RC522 ฝั่งออก / HSPI

| ขา | ชื่อ | Net | ต่อไปที่ |
|---:|---|---|---|
| 1 | SDA / SS | `RFID_OUT_SS` | U3.TX2 / GPIO17 |
| 2 | SCK | `RFID_OUT_SCK` | U3.D14 |
| 3 | MOSI | `RFID_OUT_MOSI` | U3.D13 |
| 4 | MISO | `RFID_OUT_MISO` | U3.D35 |
| 5 | IRQ | — | No-Connect |
| 6 | GND | `GND` | กราวด์ร่วม |
| 7 | RST | `RFID_OUT_RST` | U3.D2 |
| 8 | 3.3V | `+3V3` | U3.3V3 |

### U4 — OLED 1.3 นิ้ว I2C / SH1106

| ขา | ชื่อ | Net | ต่อไปที่ |
|---:|---|---|---|
| 1 | VDD | `+3V3` | U3.3V3 |
| 2 | GND | `GND` | กราวด์ร่วม |
| 3 | SCL / SCK | `OLED_SCL` | U3.D22 |
| 4 | SDA | `OLED_SDA` | U3.D21 |

โมดูล OLED ของโครงการมีตัวต้านทานดึงขึ้นในตัว ต่อ SDA/SCL โดยตรงตามตาราง

### U5 — Ultrasonic 5V

| ขา | ชื่อ | Net | ต่อไปที่ |
|---:|---|---|---|
| 1 | VCC | `+5V` | J1.1 |
| 2 | TRIG | `US_TRIG` | U3.D26 |
| 3 | ECHO | `US_ECHO_5V` | R6.1 |
| 4 | GND | `GND` | กราวด์ร่วม |

### ตัวแบ่งแรงดัน ECHO

| Ref | ค่า | ขา 1 | ขา 2 |
|---|---:|---|---|
| R6 | 1 kΩ | `US_ECHO_5V` จาก U5.ECHO | `US_ECHO_3V3` ไป U3.D27 และ R7.1 |
| R7 | 2 kΩ | `US_ECHO_3V3` | `GND` |

**ห้ามข้าม R6/R7:** ECHO เป็นสัญญาณ 5V และต้องลดระดับก่อนเข้า GPIO27

### BZ1 — Buzzer module แบบ S/GND

| ขา | Net | ต่อไปที่ |
|---|---|---|
| S | `BUZZER_CTRL` | U3.D33 |
| GND | `GND` | กราวด์ร่วม |

### RELAY — Relay module

โมดูลจริงคือ SRD-05VDC-SL-C 1 ช่อง 5V แบบ High-level trigger ให้ carrier PCB ใช้ขั้ว `VCC/GND/IN` เท่านั้น ส่วน `COM/NO/NC` เป็นขั้วสกรูบนโมดูลและไม่อยู่ใน netlist ของ carrier PCB

| ขา | Net | ต่อไปที่ |
|---|---|---|
| `+` / VCC | `+5V` | J1.1 |
| `-` / GND | `GND` | J1.2 |
| S / IN | `RELAY_CTRL` | U3.D25 |
| COM | — | ต่อ 12V+ ที่ขั้วสกรูบนโมดูลโดยตรง |
| NO | — | ต่อไปขั้วบวกของกลอนที่ขั้วสกรูบนโมดูลโดยตรง |
| NC | — | ไม่ใช้ |

ต้องตั้ง relay module เป็น HIGH-trigger ให้ตรงกับเฟิร์มแวร์ปัจจุบัน

### J1 — ไฟเข้า

| ขา | Net | จุดต่อหลัก |
|---:|---|---|
| 1 | `+5V` | U3.VIN, U5.VCC, RELAY.VCC, J_CAM.1 |
| 2 | `GND` | กราวด์ร่วมทุกอุปกรณ์ |

### J_CAM — ไฟเลี้ยง ESP32-CAM

| ขา | Net | ต่อไปที่ |
|---:|---|---|
| 1 | `+5V` | ESP32-CAM 5V |
| 2 | `GND` | ESP32-CAM GND |

คำสั่งควบคุมกล้องส่งด้วย ESP-NOW จึงไม่มีสายสัญญาณระหว่างบอร์ดหลักกับกล้อง

## 3. Net connectivity ที่ต้องตรวจ

| Net | จุดที่ต้องเชื่อมครบ |
|---|---|
| `+5V` | J1.1 · U3.VIN · U5.VCC · RELAY.VCC · J_CAM.1 |
| `+3V3` | U3.3V3 · U1.3.3V · U2.3.3V · U4.VDD |
| `GND` | U3.GND ทั้งสองขา · J1.2 · U1.GND · U2.GND · U4.GND · U5.GND · BZ1.GND · RELAY.GND · R7.2 · J_CAM.2 |
| `RFID_IN_SS` | U3.D5 · U1.SDA/SS |
| `RFID_IN_RST` | U3.D4 · U1.RST |
| `RFID_IN_SCK` | U3.D18 · U1.SCK |
| `RFID_IN_MISO` | U3.D19 · U1.MISO |
| `RFID_IN_MOSI` | U3.D23 · U1.MOSI |
| `RFID_OUT_SS` | U3.TX2/GPIO17 · U2.SDA/SS |
| `RFID_OUT_RST` | U3.D2 · U2.RST |
| `RFID_OUT_SCK` | U3.D14 · U2.SCK |
| `RFID_OUT_MISO` | U3.D35 · U2.MISO |
| `RFID_OUT_MOSI` | U3.D13 · U2.MOSI |
| `RELAY_CTRL` | U3.D25 · RELAY.S/IN |
| `US_TRIG` | U3.D26 · U5.TRIG |
| `US_ECHO_5V` | U5.ECHO · R6.1 |
| `US_ECHO_3V3` | R6.2 · R7.1 · U3.D27 |
| `BUZZER_CTRL` | U3.D33 · BZ1.S |
| `OLED_SDA` | U3.D21 · U4.SDA |
| `OLED_SCL` | U3.D22 · U4.SCL/SCK |

## 4. NetLabel สำหรับคัดลอก

```text
RFID_IN_SS    RFID_IN_RST    RFID_IN_SCK    RFID_IN_MISO    RFID_IN_MOSI
RFID_OUT_SS   RFID_OUT_RST   RFID_OUT_SCK   RFID_OUT_MISO   RFID_OUT_MOSI
RELAY_CTRL    US_TRIG        US_ECHO_5V     US_ECHO_3V3
BUZZER_CTRL   OLED_SDA       OLED_SCL
```

No-Connect ของ U3: `EN`, `VP`, `VN`, `D34`, `D32`, `D12`, `TX0`, `RX0`, `RX2`, `D15`

## 5. เช็กลิสต์ตรวจแบบ

- [ ] RFID เข้า: SS5, RST4, SCK18, MISO19, MOSI23
- [ ] RFID ออก: SS17, RST2, SCK14, MISO35, MOSI13
- [ ] Relay25, TRIG26, ECHO27 หลังตัวแบ่ง 1 kΩ/2 kΩ, Buzzer33
- [ ] OLED SDA21 / SCL22 และใช้ไฟ 3.3V
- [ ] J_CAM เป็นขั้วต่อ 2 ขา เฉพาะ 5V/GND
- [ ] GPIO12 ปล่อยว่าง และ GPIO2 ไม่มีวงจรดึงระดับเพิ่ม
- [ ] แหล่งจ่าย 5V อย่างน้อย 1A, GND ร่วม และไม่มีการป้อนไฟย้อนจาก USB
- [ ] ไม่เททองแดงใต้เสาอากาศ ESP32
