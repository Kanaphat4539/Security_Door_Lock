# เรียนรู้การทำ PCB ด้วย KiCad — Security Door Lock ดีไซน์ `pooh`

เอกสารนี้อธิบายเหตุผลของวงจรและให้แบบฝึกทำ carrier board ด้วยตนเอง ทั้งแบบ PCB โรงงาน 2 ชั้นและแบบกัดทองแดงหน้าเดียว

> **Source of truth:** ขาใช้งานต้องตรงกับ `firmware/esp32-main/src/esp_main/full-main_test.ino` เสมอ เอกสารหรือไฟล์บอร์ดรุ่นเก่าที่มี UART กล้อง, Q1/R8, pull-up OLED ภายนอก หรือ mapping อื่น ไม่ใช่ข้อกำหนดปัจจุบัน

## 1. เริ่มจากอ่านโค้ดเป็นวงจร

โค้ดกำหนดสัญญาณดังนี้:

```text
RFID IN : SS 5,  RST 4, SCK 18, MISO 19, MOSI 23
RFID OUT: SS 17, RST 2, SCK 14, MISO 35, MOSI 13
Relay   : GPIO25
Trig     : GPIO26
Echo     : GPIO27 หลังตัวแบ่งแรงดัน
Buzzer S : GPIO33
OLED     : SDA 21, SCL 22
CAM      : ESP-NOW; ต่อเฉพาะ +5V และ GND
```

สิ่งที่เรียนรู้จาก mapping นี้:

- RFID สองหัวอ่านไม่ได้แชร์ SPI เดียวกัน จึงต้องลากสัญญาณ 5 เส้นแยกกันต่อหัวอ่าน
- MISO เป็นสัญญาณจากอุปกรณ์เข้า MCU; `GPIO35` รับเข้าอย่างเดียวจึงใช้กับ MISO ได้
- สัญญาณ 5V จาก Echo ต้องลดเหลือระดับปลอดภัยต่อ ESP32
- GPIO17 ไม่ว่างสำหรับ UART เพราะเป็น SS ของ RFID OUT
- การสื่อสารกับกล้องอยู่ในอากาศผ่าน ESP-NOW; PCB จ่ายไฟให้กล้องเท่านั้น

## 2. เข้าใจวงจรย่อยแต่ละส่วน

### 2.1 RFID สองบัส

RC522 ทั่วไปมีขา `SDA/SS, SCK, MOSI, MISO, IRQ, GND, RST, 3.3V` แต่ clone อาจเรียงต่างกัน ต้องดูซิลค์สกรีนของโมดูลจริง

| หัวอ่าน | SS | RST | SCK | MISO | MOSI | ไฟ |
|---|---:|---:|---:|---:|---:|---|
| IN | 5 | 4 | 18 | 19 | 23 | 3.3V |
| OUT | 17 | 2 | 14 | 35 | 13 | 3.3V |

IRQ ไม่ใช้ ให้ติด no-connect ใน schematic อย่าต่อบัสสองชุดเข้าด้วยกันเพียงเพราะชื่อขาบนโมดูลเหมือนกัน

### 2.2 Ultrasonic และตัวแบ่งแรงดัน

ต่อดังนี้:

```text
GPIO26 ----------------------------> TRIG
ECHO ---- R1 1k ----+--------------> GPIO27
                    |
                   R2 2k
                    |
                   GND
```

จุดร่วม R1/R2 คือ `US_ECHO_3V3` อัตราส่วน 2k/(1k+2k) ลด 5V เหลือประมาณ 3.3V การต่อ Echo ตรงเป็นข้อผิดพลาดของเอกสารเก่า

### 2.3 Relay module

ใช้โมดูล relay ที่มี driver และ flyback diode ในตัว:

- VCC → +5V
- GND → GND
- IN → GPIO25

carrier board ไม่ควรพาไฟเมนส์ผ่านบริเวณ ESP32 หากต้องสวิตช์โหลดแรงดันสูง ให้เดินสายที่ขั้ว COM/NO/NC ของโมดูลแยกจาก PCB logic และรักษาระยะฉนวนตามงานจริง

### 2.4 Buzzer module

ชุดปัจจุบันเป็นโมดูล 2 ขา `S/GND`:

- S → GPIO33
- GND → GND

ไม่ใช้ transistor Q1 หรือ base resistor R8 และไม่ต่อ +5V แบบ buzzer เปล่า ต้องตรวจว่าของจริงเป็นโมดูล S/GND ที่ใช้กับ logic 3.3V ได้ก่อนผลิต

### 2.5 OLED

- SDA → GPIO21
- SCL → GPIO22
- VCC → 3.3V
- GND → GND

โมดูล OLED ที่ใช้มี pull-up บนบอร์ดแล้ว จึงไม่เพิ่ม 4.7k ภายนอกซ้ำ หากเปลี่ยนโมดูล ต้องวัดหรือดู schematic ของโมดูลใหม่ก่อนตัดสินใจ

### 2.6 ESP32-CAM

- +5V → +5V
- GND → GND
- ไม่มี TX/RX บน carrier board

คำสั่งถูกส่งด้วย ESP-NOW ตาม `full-main_test.ino`; MAC address และซอฟต์แวร์ไม่ใช่ net บน PCB

## 3. จากวงจรเป็น net list

ตั้งชื่อ net ให้สื่อความหมายและตรวจง่าย:

| Net | GPIO/ต้นทาง | ปลายทาง |
|---|---|---|
| `RFID_IN_SS` | GPIO5 | RFID IN SS |
| `RFID_IN_RST` | GPIO4 | RFID IN RST |
| `RFID_IN_SCK` | GPIO18 | RFID IN SCK |
| `RFID_IN_MISO` | GPIO19 | RFID IN MISO |
| `RFID_IN_MOSI` | GPIO23 | RFID IN MOSI |
| `RFID_OUT_SS` | GPIO17 | RFID OUT SS |
| `RFID_OUT_RST` | GPIO2 | RFID OUT RST |
| `RFID_OUT_SCK` | GPIO14 | RFID OUT SCK |
| `RFID_OUT_MISO` | GPIO35 | RFID OUT MISO |
| `RFID_OUT_MOSI` | GPIO13 | RFID OUT MOSI |
| `RELAY_IN` | GPIO25 | Relay IN |
| `US_TRIG` | GPIO26 | Ultrasonic Trig |
| `US_ECHO_5V` | Echo | R1 1k |
| `US_ECHO_3V3` | จุดร่วม R1/R2 | GPIO27 |
| `BUZZER_S` | GPIO33 | Buzzer S |
| `OLED_SDA` | GPIO21 | OLED SDA |
| `OLED_SCL` | GPIO22 | OLED SCL |

Rail:

- `+3V3`: RFID IN/OUT และ OLED
- `+5V`: VIN, ultrasonic, relay และ CAM
- `GND`: ทุกโมดูลต้องมี ground ร่วมกัน

## 4. แบบฝึกหัดสร้าง schematic

1. วาง `Conn_01x15` สองตัวแทน socket ESP32 30 ขา
2. วาง header: RFID 1x08 สองตัว, OLED/ultrasonic 1x04, relay 1x03, buzzer/CAM/power 1x02
3. วาง R1 = 1k และ R2 = 2k สำหรับ Echo divider
4. วาง global labels ตามตาราง net list
5. ติด no-connect ที่ GPIO และ IRQ ที่ไม่ใช้
6. ตรวจว่าไม่มี `CAM_RX`, `CAM_TX`, Q1, R8 หรือ pull-up SDA/SCL ภายนอก
7. รัน ERC อ่านทุกข้อความ ไม่กด ignore โดยไม่เข้าใจสาเหตุ

## 5. เลือก footprint จากของจริง

Symbol บอกหน้าที่ทางไฟฟ้า ส่วน footprint บอกตำแหน่งรูจริง จึงต้องวัดก่อนเลือก:

- pin/socket header ส่วนมาก pitch 2.54 mm
- terminal block มัก 5.08 mm แต่ต้องวัด
- DevKit clone แต่ละรุ่นอาจมีระยะระหว่างแถวต่างกันเล็กน้อย
- ตรวจลำดับ GND/VCC/SCL/SDA ของ OLED และ SDA/SCK/MOSI/MISO/IRQ/GND/RST/3.3V ของ RC522 จากตัวจริง

สำหรับงานกัดเองใช้ THT เป็นหลัก:

- resistor axial DIN0207, pitch 10.16 mm
- header/socket THT
- mounting hole 2.2 mm สำหรับ M2

## 6. Placement คือการแก้ปัญหาก่อน routing

1. วาง ESP32 กลางบอร์ดและให้เสาอากาศหันออกขอบ
2. ทำ rule area ห้าม copper ใต้เสาอากาศ
3. วาง RFID IN/OUT คนละด้านตามกลุ่ม GPIO ของตน
4. วาง R1/R2 ชิด ultrasonic header และ GPIO27
5. วาง power, CAM และ relay ใกล้เส้น +5V แต่ห่างเสาอากาศ
6. วาง connector ที่ต้องถอดสายไว้ริมบอร์ด
7. ทดลองเสียบ DevKit/ปลั๊กจริงบนกระดาษพิมพ์ 100% ก่อนกัด

เส้น ratsnest ที่ไขว้กันมากหลัง placement เป็นสัญญาณให้ย้าย/หมุน connector ก่อนเริ่มลาก ไม่ใช่เหตุให้ลด clearance

## 7. Routing สองแบบ

### 7.1 โรงงาน 2 ชั้น

ค่าตั้งต้นทั่วไป:

- signal 0.25–0.3 mm
- +5V/+3V3 0.6 mm ขึ้นไปตามกระแส
- clearance 0.2 mm หรือตามผู้ผลิต
- ground pour และ via ใช้ได้

ลำดับที่ช่วยให้ทำงานง่าย:

1. rail ไฟและ ground return
2. SPI ของ RFID IN
3. SPI ของ RFID OUT
4. Echo divider, Trig, Relay และ Buzzer
5. I2C OLED
6. เติม GND zone และรัน DRC

ไม่มีขั้น UART กล้อง เพราะดีไซน์ปัจจุบันไม่มี UART บน PCB

### 7.2 กัดเองหน้าเดียว

ข้อจำกัดจริงต่างจากบอร์ดโรงงาน:

- ใช้ทองแดง `B.Cu` เท่านั้น
- ไม่มี plated through-hole; ห้ามใช้ via เป็นทางข้ามชั้น
- ใช้สาย jumper ฝั่งอุปกรณ์และบันทึกเป็น `JP1`, `JP2`, …
- signal 0.6 mm, power/GND 1.0–1.5 mm, clearance 0.5–0.8 mm
- ใช้ THT และ pad ใหญ่เพื่อทนการเจาะ/บัดกรีมือ
- บอร์ดที่มี socket ESP32 กลางแผ่นมักหลีกเลี่ยง jumper ทั้งหมดไม่ได้

เทคนิคฝึก:

1. route บน B.Cu เท่านั้นก่อน
2. หากเส้นต้องข้าม ให้หยุดเส้นที่ pad jumper สองจุด แล้วต่อสาย insulated wire บนด้านอุปกรณ์
3. หลีกเลี่ยงการลากเส้นลอดระหว่าง pad 2.54 mm ถ้ากระบวนการกัดยังไม่แม่น
4. อย่าใช้ zone แคบแตกเป็นเกาะ; ลาก GND track หลักที่ตรวจ continuity ได้ง่าย
5. พิมพ์ B.Cu แบบ **mirror** สำหรับ toner transfer และสเกล 100%

ขนาดดอกสว่านเริ่มต้น: 0.9–1.0 mm สำหรับ header/resistor, 0.7–0.9 mm สำหรับรูสาย jumper, 2.2–2.3 mm สำหรับ M2 โดยวัดขาจริงก่อนเจาะ

## 8. การตรวจที่ ERC/DRC ทำแทนไม่ได้

ERC/DRC ตรวจความสอดคล้องในไฟล์ แต่ไม่รู้ว่าของจริงเรียงขาอย่างไร จึงต้องตรวจเพิ่ม:

- socket ESP32 ตรงกับ pinout ของบอร์ดที่ถืออยู่
- header ทุกตัวตรงกับซิลค์สกรีนโมดูล
- Echo เข้าขาบนของ divider ไม่เข้าจุด GPIO โดยตรง
- CAM header มี 2 ขาเท่านั้น
- Buzzer header ระบุ S/GND ชัดเจน
- B.Cu artwork ถูก mirror และระยะ 2.54 mm ยังเป็น 2.54 mm หลังพิมพ์

## 9. ขั้นตรวจหลังประกอบ

1. ยังไม่เสียบโมดูล: วัดว่า +5V, +3V3 และ GND ไม่ short กัน
2. beep continuity ทุก net จาก GPIO socket ถึง header ปลายทาง
3. ตรวจ divider ว่า R1 = 1k, R2 = 2k และ R2 ลง GND
4. จ่ายไฟโดยจำกัดกระแสถ้ามี แล้ววัด 5V/3.3V
5. เสียบและทดสอบทีละโมดูล: OLED, RFID IN, RFID OUT, ultrasonic, buzzer, relay, CAM
6. หากฮาร์ดแวร์ไม่ตรง mapping ให้แก้ schematic และ PCB พร้อมกัน ไม่แก้เฉพาะสายจริงโดยไม่บันทึก

## 10. สรุปข้อผิดพลาดของดีไซน์เก่าที่ต้องไม่คัดลอก

- RFID IN RST = GPIO4 ไม่ใช่ GPIO27
- RFID OUT SS = GPIO17 ไม่ใช่ GPIO4
- Relay = GPIO25, Trig = GPIO26, Echo = GPIO27, Buzzer = GPIO33
- CAM ใช้ ESP-NOW และต่อเพียง +5V/GND ไม่ใช้ UART GPIO16/17
- buzzer module S/GND ต่อตรง ไม่ใช้ Q1/R8
- OLED มี pull-up บนโมดูล ไม่ใส่ pull-up ภายนอก
- Echo ต้องมีตัวแบ่งแรงดันก่อนเข้า ESP32
