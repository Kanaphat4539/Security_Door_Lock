# Mainboard — ESP32 Hub PCB (Security Door Lock)

วงจร PCB สำหรับ **บอร์ดหลัก (ESP32-main)** ที่รวมอุปกรณ์ทั้งหมดของกล่องหลัก (FrontBox/Hub)
สร้างจากโค้ดจริงใน `firmware/esp32-main` (branch `pooh`) และยึดขนาดตาม
`3Dpro/FrontBox/frontbox_pcb_spec.md`

> ⚠️ **ยังไม่ผ่าน ERC/DRC ในโปรแกรม** — เครื่องที่สร้างไฟล์ไม่มี KiCad ติดตั้ง
> ไฟล์ผ่านการตรวจ syntax (S-expression) และตรวจ net/GPIO เชิงตรรกะแล้ว
> **ต้องเปิดใน KiCad 8 แล้วรัน Inspect → ERC ก่อนสั่งผลิต**

## ไฟล์

| ไฟล์ | คืออะไร |
|---|---|
| `generate_kicad.py` | ตัวสร้างไฟล์ KiCad (แก้วงจรที่นี่ แล้วรันใหม่) |
| `mainboard.kicad_pro` | โปรเจกต์ KiCad 8 |
| `mainboard.kicad_sch` | Schematic (วงจร) — เชื่อมต่อด้วย global label |
| `mainboard.kicad_pcb` | บอร์ด: กรอบ 88×148, มุม R3, รูยึด M2 4 รู (ยังไม่วาง footprint) |

### วิธีเปิดใช้งาน
```bash
python generate_kicad.py        # (ถ้าแก้วงจร) สร้างไฟล์ใหม่
```
1. เปิด `mainboard.kicad_pro` ใน **KiCad 8**
2. Schematic → **Inspect → Electrical Rules Checker (ERC)**
3. PCB → **Tools → Update PCB from Schematic** (footprint จะถูกดึงจากไลบรารีมาตรฐาน
   ตาม lib_id ที่กำหนด — กรอบบอร์ด + รูยึดวางไว้ให้แล้ว) จากนั้นวางตำแหน่ง + เดินลาย

## สถาปัตยกรรม

ESP32-WROOM-32 เป็นตัวคุมกลาง **ไม่ใช้ Wi-Fi** — งานที่ต้องคุยเซิร์ฟเวอร์ส่งผ่าน
ESP32-CAM ทาง UART2 เสมอ (ดู `protocol.h`)

```
        [RC522 เข้า]  [RC522 ออก]      [OLED]     [HY-SRF05]
          VSPI          HSPI            I2C         5V→div
            \            |               |            /
             \           |               |           /
              +------- ESP32-WROOM-32 (U1) ---------+
             /           |               |           \
        [Buzzer]     [Relay→Solenoid]  [UART2]    [PROG/USB]
          25            26 →12V         16/17       EN/IO0/TX/RX
```

## Pin map (ตรงกับ `firmware/esp32-main/src/config.h` — ตรวจแล้ว 100%)

| ระบบ | สัญญาณ | GPIO | Net | ขั้วต่อ |
|---|---|---|---|---|
| RFID เข้า (VSPI) | SCK / MISO / MOSI / SS / RST | 18/19/23/5/27 | `RFID_ENTRY_*` | J3 |
| RFID ออก (HSPI) | SCK / MISO / MOSI / SS / RST | 14/35/13/4/2 | `RFID_EXIT_*` | J4 |
| Ultrasonic | TRIG / ECHO | 33 / 32 | `US_TRIG` / `US_ECHO_3V3` | J6 |
| Buzzer | ควบคุม | 25 | `BUZZER_CTRL` | BZ1 |
| Relay | ควบคุม | 26 | `RELAY_CTRL` | K1 → J8 |
| OLED (I2C) | SDA / SCL | 21 / 22 | `OLED_SDA/SCL` | J5 |
| UART2 → CAM | RX2 / TX2 | 16 / 17 | `CAM_RX2/TX2` | J7 |
| Program | EN / IO0 / TXD0 / RXD0 | EN/0/1/3 | — | J2 |

## จุดออกแบบสำคัญ (ที่แก้/กันพลาดจากในโค้ด)

1. **ECHO ของ HY-SRF05 เป็นลอจิก 5V — ESP32 ทน 5V ไม่ได้**
   ใส่ตัวแบ่งแรงดัน R6 (1k) / R7 (2k): `US_ECHO_5V → US_ECHO_3V3` = 5 × 2/(1+2) ≈ **3.3V**
   ก่อนเข้า GPIO32 (TRIG ต่อตรงได้เพราะ ESP32 เป็นฝั่งขับออก)
2. **GPIO2 / GPIO5 เป็น strapping pin** — GPIO2 (RFID_EXIT_RST) ต้องไม่ถูกดึง HIGH ตอนบูต,
   GPIO5 (RFID_ENTRY_SS) ควร HIGH ตอนบูต (SS idle = HIGH อยู่แล้ว ✓). RC522 ควรต่อ
   หลังจ่ายไฟ/รีเซ็ตแล้ว — ตรวจอาการบูตค้างถ้าใช้สายยาว
3. **หลีกเลี่ยง GPIO12** (MTDI strapping ตั้งแรงดัน flash) — โค้ดย้าย RFID_EXIT_MISO ไป
   GPIO35 (input-only) แล้ว วงจรตามนั้น
4. **Power tree:** 12V IN → ฟิวส์ PPTC (F1) → กันกลับขั้ว SS34 (D1) → TVS SMBJ13A (D2)
   → บัค MP1584 เป็น **5V** → LDO AMS1117 เป็น **3.3V**
   - 3.3V: ESP32, RC522×2, OLED
   - 5V: HY-SRF05, buzzer, **จ่ายให้ ESP32-CAM ผ่าน J7** (กล้องกระชากถึง ~500mA → เลือกบัค ≥1A)
   - 12V: relay coil + solenoid lock
5. **Relay + solenoid (LY-03 12V, fail-secure):** GPIO26 → R9(1k) → Q2(NPN) ขับคอยล์รีเลย์
   12V, มี flyback D4 คร่อมคอยล์ และ D5 คร่อม solenoid (โหลดเหนี่ยวนำ)
6. **Buzzer:** active 5V ขับผ่าน Q1(NPN) + R8(1k) — GPIO ขับตรงกระแสไม่พอ
7. **I2C pull-up:** R4/R5 (4.7k) ที่ SDA/SCL (เผื่อโมดูล OLED ไม่มีในตัว)
8. **Boot/Program:** ปุ่ม SW1(BOOT=IO0), SW2(EN), R2/R3 pull-up 10k, C10 reset RC + header J2

## ขนาด/เครื่องกล (ตาม `frontbox_pcb_spec.md`)

- Outline **88 × 148 mm** (max 90×150), มุม **R3**, หนา 1.6 mm
- รูยึด **4× Ø2.3 (M2)** ที่ **(±41.75, ±71.75)**, จุดกำเนิด = กลางบอร์ด
- โซนขั้วต่อ (แนะนำวางตาม spec): power-in/relay-out ที่ขอบ **−Y**, USB/prog ที่ขอบ **+Y**,
  RC522 ใกล้ (0,+45), OLED (0,−8), HC-SR04 (0,−52), buzzer (34,0)
- **เสา WROOM หันเสาอากาศออกขอบบอร์ด ห้ามมี copper ใต้เสาอากาศ** และห่างรีเลย์ ≥15mm
- สูงด้านบน ≤18mm (รีเลย์สูงสุด), ด้านล่าง ≤1mm

## BOM

| Ref | ค่า | Footprint | หมายเหตุ |
|---|---|---|---|
| U1 | ESP32-WROOM-32 | RF_Module:ESP32-WROOM-32 | ตัวคุมหลัก |
| U2 | MP1584 5V/2A | โมดูลบัค (header 1×4) | 12V→5V |
| U3 | AMS1117-3.3 | SOT-223 | 5V→3.3V |
| K1 | SRD-12VDC-SL-C | Relay SPDT | ขับ solenoid |
| Q1,Q2 | S8050/2N2222 | SOT-23 | ขับ buzzer/relay |
| D1 | SS34 | SMA | กันกลับขั้ว |
| D2 | SMBJ13A | SMA | TVS 12V |
| D4,D5 | 1N4007 | SMA | flyback |
| D3 | LED เขียว | 0805 | ไฟเลี้ยง |
| F1 | PPTC 1.5A | 1812 | ฟิวส์ |
| BZ1 | active buzzer 5V | D9.0mm | |
| R1,R8,R9 | 1k | 0805 | |
| R2,R3 | 10k | 0805 | pull-up EN/IO0 |
| R4,R5 | 4.7k | 0805 | I2C pull-up |
| R6 | 1k | 0805 | ECHO divider บน |
| R7 | 2k | 0805 | ECHO divider ล่าง |
| C1 | 470µF/25V | radial | bulk 12V |
| C3 | 100µF/16V | radial | bulk 5V |
| C6 | 22µF/10V | radial | LDO out |
| C9 | 10µF/10V | radial | ESP bulk |
| C2,C4,C7,C8 | 100nF | 0805 | decoupling |
| C5 | 10µF | 0805 | LDO in |
| C10 | 100nF | 0805 | EN reset RC |
| SW1,SW2 | ปุ่มกด | 6mm | BOOT / EN |
| J1 | 12V DC IN | terminal 2P | −Y |
| J8 | Solenoid 12V | terminal 2P | −Y, X+30 |
| J2 | PROG/UART 1×6 | header | +Y |
| J3,J4 | RC522 1×8 | header | ไป lid |
| J5 | OLED 1×4 | header | ไป lid |
| J6 | HY-SRF05 1×4 | header | ไป lid |
| J7 | to ESP32-CAM 1×4 | header | inter-box |
| H1–H4 | รูยึด M2 | MountingHole 2.2mm | มุมบอร์ด |

## ทำไมเป็น Python generator

KiCad ไม่ได้ติดตั้งบนเครื่องที่สร้างไฟล์ จึงเปิด/ตรวจ ERC ไม่ได้ตอนสร้าง
generator คำนวณพิกัดขาทั้งหมดเอง → **การเชื่อม pin↔net ถูกต้องโดยโครงสร้าง**
(เชื่อมด้วย global label ที่วางตรงจุดต่อของแต่ละขาพอดี KiCad จะรวม label ชื่อเดียวกันเป็น net เดียว)
แก้วงจรได้ที่ `generate_kicad.py` ส่วน `COMPS` แล้วรันใหม่
