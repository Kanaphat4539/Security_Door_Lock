# คู่มือตรวจวงจรและทำ PCB กัดมือหน้าเดียว — Security Door Lock

เอกสารนี้อ้างอิงวงจรจากไฟล์:

[`diagrams/current/Schematic_Security_Door_Lock_PCB_2026-09-16.svg`](diagrams/current/Schematic_Security_Door_Lock_PCB_2026-09-16.svg)

แหล่งอ้างอิง GPIO ปัจจุบันคือโค้ดใน branch `pooh`:

`firmware/esp32-main/src/esp_main/full-main_test.ino`

> ห้ามใช้ `firmware/esp32-main/src/config.h` ใน branch `nongtee` เป็น GPIO อ้างอิง เพราะเป็นชุดเก่า และ `config.h` ที่ยังอยู่ใน branch `pooh` ก็ยังเป็นโครงสร้าง firmware คนละชุดกับ `full-main_test.ino`

## 0. ข้อตกลงของวงจรนี้

- BUZZER1 เป็น **โมดูล Active Buzzer แบบมีขา S/GND** ตามที่กลุ่มตั้งใจใช้ จึงไม่เพิ่มทรานซิสเตอร์ขับ
- OLED มีตัวต้านทาน pull-up I2C อยู่บนโมดูลแล้ว จึงไม่เพิ่ม pull-up ซ้ำ
- ESP32 หลักกับ ESP32-CAM สื่อสารด้วย **ESP-NOW** จึงไม่ต้องมีสาย UART ระหว่างบอร์ด
- ขั้ว `5V_OUT` ใช้จ่ายไฟ `5V/GND` ให้ ESP32-CAM โดยตรง
- PCB จะทำแบบ **หน้าเดียว กัดแผ่นเอง และใช้สาย jumper หุ้มฉนวนด้านบนเมื่อเดินลายไม่ผ่าน**

> ก่อนใช้ BUZZER1 ให้ยืนยันว่าเป็นโมดูลที่ขา `S` เป็นอินพุตลอจิกจริง ไม่ใช่ buzzer เปลือยสองขาที่กินกระแสจาก GPIO โดยตรง

### ชื่ออุปกรณ์ใน Schematic ปัจจุบัน

ใช้ชื่อหน้าที่ด้านขวาเป็นหลักเมื่อเทียบเอกสาร เพราะเลข reference ของแบบเก่าและ
คู่มือ KiCad ไม่ตรงกับ Schematic EasyEDA ปัจจุบัน

| Ref ปัจจุบัน | ค่า | ชื่อหน้าที่ |
|---|---:|---|
| R4 | 1 kΩ | `R_ECHO_SER` — อนุกรมจาก ECHO |
| R3 | 2 kΩ | `R_ECHO_PD` — จาก GPIO27 ลง GND |
| C2 | 470 µF | `C_CAM_BULK` — ใกล้ 5V_OUT/ESP32-CAM |
| C1 | 100 nF | `C_CAM_HF` — ใกล้ 5V_OUT/ESP32-CAM |
| C4 | 470 µF | `C_RELAY_BULK` — ใกล้ Relay (ถ้าใส่) |
| C3 | 100 nF | `C_RELAY_HF` — ใกล้ Relay (ถ้าใส่) |

No-Connect ที่ต้องใส่: IRQ ของ RC522 ทั้งสองตัว และขา ESP32 ที่ไม่ใช้ ได้แก่
`EN`, `VP`, `VN`, `D34`, `D32`, `D12`, `RX2/GPIO16`, `D15`, `RX0`, `TX0`.
ห้ามติด No-Connect ที่ `TX2/GPIO17` เพราะใช้เป็น `RFID_OUT_SS`.

---

## 1. ผลตรวจ GPIO กับโค้ดใหม่ใน branch pooh

GPIO ใน Schematic ปัจจุบัน **ตรงกับ `full-main_test.ino` แล้ว** ไม่ต้องย้าย GPIO ทั้งหกจุดตามคำแนะนำเดิม

| สัญญาณ | Schematic ปัจจุบัน | โค้ดใหม่ pooh | ผลตรวจ |
|---|---|---|---|
| RFID_IN.SDA/SS | GPIO5 | `SS_IN 5` | ถูก |
| RFID_IN.RST | GPIO4 | `RST_IN 4` | ถูก |
| RFID_IN.SCK | GPIO18 | `SCK_IN 18` | ถูก |
| RFID_IN.MISO | GPIO19 | `MISO_IN 19` | ถูก |
| RFID_IN.MOSI | GPIO23 | `MOSI_IN 23` | ถูก |
| RFID_OUT.SDA/SS | GPIO17/TX2 | `SS_OUT 17` | ถูก |
| RFID_OUT.RST | GPIO2 | `RST_OUT 2` | ถูก |
| RFID_OUT.SCK | GPIO14 | `SCK_OUT 14` | ถูก |
| RFID_OUT.MISO | GPIO35 | `MISO_OUT 35` | ถูก |
| RFID_OUT.MOSI | GPIO13 | `MOSI_OUT 13` | ถูก |
| Relay IN1 | GPIO25 | `RELAY_PIN 25` | ถูก |
| Ultrasonic TRIG | GPIO26 | `TRIG_PIN 26` | ถูก |
| Ultrasonic ECHO หลังตัวแบ่งแรงดัน | GPIO27 | `ECHO_PIN 27` | ถูก |
| Buzzer S | GPIO33 | `BUZZER_PIN 33` | ถูก |
| OLED SDA | GPIO21 | `Wire.begin(21, 22)` | ถูก |
| OLED SCL | GPIO22 | `Wire.begin(21, 22)` | ถูก |

### ห้ามแก้ GPIO เหล่านี้เป็นชุดเก่า

- อย่าย้าย RFID_IN.RST จาก GPIO4 ไป GPIO27
- อย่าย้าย RFID_OUT.SDA/SS จาก GPIO17 ไป GPIO4
- อย่าย้าย Relay จาก GPIO25 ไป GPIO26
- อย่าย้าย TRIG จาก GPIO26 ไป GPIO33
- อย่าย้าย ECHO จาก GPIO27 ไป GPIO32
- อย่าย้าย Buzzer จาก GPIO33 ไป GPIO25

ชุดที่กล่าวข้างบนเป็น mapping จาก firmware รุ่นเก่า ไม่ใช่ mapping ของ `full-main_test.ino` ใน branch `pooh`

---

## 2. ผัง GPIO ฉบับที่ต้องใช้ทำ PCB

### RFID_IN — VSPI

| ขา RC522 | ESP32 |
|---|---|
| SDA/SS | GPIO5 / D5 |
| SCK | GPIO18 / D18 |
| MOSI | GPIO23 / D23 |
| MISO | GPIO19 / D19 |
| RST | GPIO4 / D4 |
| IRQ | ไม่ใช้ |
| 3.3V | 3.3V |
| GND | GND |

### RFID_OUT — HSPI

| ขา RC522 | ESP32 |
|---|---|
| SDA/SS | GPIO17 / TX2 |
| SCK | GPIO14 / D14 |
| MOSI | GPIO13 / D13 |
| MISO | GPIO35 / D35 |
| RST | GPIO2 / D2 |
| IRQ | ไม่ใช้ |
| 3.3V | 3.3V |
| GND | GND |

GPIO35 เป็น input-only จึงใช้เป็น MISO ได้ และปลอดภัยกว่า GPIO12 ซึ่งเป็น strapping pin

### Ultrasonic

| สัญญาณ | การต่อ |
|---|---|
| VCC | +5V |
| TRIG | GPIO26 / D26 |
| ECHO | ผ่านตัวแบ่งแรงดันแล้วเข้า GPIO27 / D27 |
| GND | GND |

ตัวแบ่งแรงดัน ECHO ใน Schematic:

`ECHO 5V → R4 1kΩ → จุดกลาง → R3 2kΩ → GND`

จุดกลางระหว่าง R4/R3 ต่อเข้า GPIO27 ห้ามต่อ ECHO 5V เข้า ESP32 โดยตรง

### อุปกรณ์อื่น

| อุปกรณ์/สัญญาณ | ESP32/แหล่งจ่าย |
|---|---|
| BUZZER1.S | GPIO33 / D33 |
| BUZZER1.GND | GND |
| RELAY1.IN1 | GPIO25 / D25 |
| OLED SDA | GPIO21 / D21 |
| OLED SCL | GPIO22 / D22 |
| OLED VCC | 3.3V |
| 5V_OUT.1 | +5V ไป ESP32-CAM |
| 5V_OUT.2 | GND ไป ESP32-CAM |

### ขาที่ต้องระวัง

- GPIO12/D12: ห้ามใช้ เพราะเป็น strapping pin ที่มีผลต่อแรงดันแฟลชตอนบูต
- GPIO35: input-only ใช้เป็น RFID_OUT MISO ได้ แต่อย่านำไปขับเอาต์พุต
- GPIO2: เป็น strapping pin แต่โครงการใช้เป็น RFID_OUT RST และโค้ดดึง HIGH หลังบูต หากบูตผิดปกติต้องตรวจระดับสัญญาณขานี้
- GPIO17/TX2: ถูกใช้เป็น RFID_OUT SDA/SS ไม่ได้ปล่อยว่าง
- IRQ ของ RC522 ทั้งสองตัว: ไม่ใช้

---

## 3. จุดที่ยังควรแก้ใน Schematic

### 3.1 รวม GND เป็นเน็ตเดียว

ใน Schematic ปัจจุบัน GND ถูกแบ่งเป็นสองกลุ่ม

กลุ่ม A:

- 5V_IN.GND
- 5V_OUT.GND
- ESP32 GND ฝั่งซ้าย

กลุ่ม B:

- Relay GND
- Buzzer GND
- Ultrasonic GND
- OLED GND
- RFID_IN GND
- RFID_OUT GND
- R3 ด้านล่าง
- ESP32 GND ฝั่งขวา

แม้ GND สองขาของ ESP32 DevKit เชื่อมกันภายในโมดูล แต่ไม่ควรใช้ DevKit เป็นสะพานรับกระแส ให้เชื่อมกลุ่ม A และ B โดยตรงใน Schematic และทำ GND copper pour เดียวบน PCB

เหตุผล:

- ลดกระแส Relay และ ESP32-CAM ที่ไหลผ่านลายภายใน DevKit
- ลด ground bounce และอาการ ESP32 รีเซ็ต
- ทำให้ตรวจ continuity และซ่อมบอร์ดง่าย

### 3.2 ต่อหน้าสัมผัส Relay ไปยังโหลด

ขาควบคุม Relay ปัจจุบันถูกต้อง:

| ขา Relay | การต่อ |
|---|---|
| VCC | +5V |
| GND | GND |
| IN1 | ESP32 GPIO25 |

Relay ที่ใช้จริงเป็นโมดูล 1 ช่อง 5V รุ่น SRD-05VDC-SL-C แบบ High-level trigger มีขั้วสกรู `NC/COM/NO` อยู่บนโมดูลแล้ว จึงไม่ต้องเพิ่ม `J_LOCK` บน carrier PCB ให้ต่อโหลด 12V ที่ `COM/NO` ของโมดูลโดยตรง และให้ carrier PCB มีเพียงขั้ว `VCC/GND/IN` 3 ขา

`5V_OUT` ไม่ต้องผ่าน Relay เพราะใช้เลี้ยง ESP32-CAM ซึ่งต้องมีไฟตลอดเวลา

---

## 4. ระบบไฟสำหรับ ESP32-CAM

ต่อขั้ว `5V_OUT` ดังนี้:

- `5V_OUT.1 → ESP32-CAM 5V`
- `5V_OUT.2 → ESP32-CAM GND`

เป็นการแยกไฟจากราง `5V_IN` เดียวกัน ไม่ใช่การจ่ายไฟจาก GPIO และไม่ต้องมี TX/RX เพราะใช้ ESP-NOW

### แหล่งจ่ายที่แนะนำ

- ขั้นต่ำ: 5V 1A
- แนะนำ: 5V 2A เพื่อเผื่อ ESP32-CAM ตอนเปิด Wi-Fi/ถ่ายภาพ รวม Relay, RFID สองตัว และอุปกรณ์อื่น
- ห้ามใช้ขา 3.3V ของ ESP32 หลักจ่ายไฟให้ ESP32-CAM

### คาปาซิเตอร์ที่ควรเพิ่ม

ใกล้ `5V_OUT`:

- 470–1000 µF electrolytic คร่อม +5V/GND
- 100 nF ceramic คร่อม +5V/GND

ใกล้ขั้ว Relay:

- 100–470 µF electrolytic คร่อม +5V/GND
- 100 nF ceramic คร่อม +5V/GND

แนะนำเพิ่ม 100 nF ใกล้ VCC/GND ของ RC522 แต่ละตัวและ Ultrasonic เพื่อลดสัญญาณรบกวน

---

## 5. แนวทาง PCB กัดมือหน้าเดียว

### 5.1 โครงสร้างบอร์ด

- อุปกรณ์และสาย jumper อยู่ด้านบนบอร์ด
- ลายทองแดงสำหรับกัดอยู่ด้านล่างบอร์ด
- GND เป็น copper pour ด้านล่าง
- จุดที่เดินลายไม่ผ่านใช้สาย jumper หุ้มฉนวนด้านบน

อย่าฝืนลดความกว้างลายเพื่อหลบกันจนเล็กมาก เพราะลายอาจขาดระหว่างกัดหรือหลุดตอนบัดกรี

### 5.2 Design rule สำหรับงานกัดมือ

| รายการ | ค่าที่แนะนำ |
|---|---:|
| ลายสัญญาณทั่วไป | 0.8 mm |
| ลาย 3.3V | 1.2 mm |
| ลาย 5V/GND | 1.5 mm |
| Clearance | 0.45 mm |
| รูขา header/socket | ประมาณ 1.0 mm |
| รูสาย jumper | 0.8–1.0 mm |
| Pad รอบรู jumper | 2.0–2.5 mm |
| รูยึด M2 | ประมาณ 2.3 mm |

ถ้ากระบวนการพิมพ์หรือรีดหมึกไม่คม ให้เพิ่มลายสัญญาณเป็น 0.6–0.8 mm และเพิ่ม clearance แทนการใช้ลายบาง

### 5.3 Copper pour

- ทำ copper area เป็นเน็ต GND
- ไม่เก็บ copper island ที่ไม่เชื่อมกับ GND
- เว้นพื้นที่ใต้เสาอากาศ ESP32 และ ESP32-CAM ไม่ให้มีทองแดง
- หลังแก้ PCB ทุกครั้งกด `Shift+B` เพื่อ rebuild copper area
- ก่อนพิมพ์ให้ตรวจว่าพื้น GND ทุกส่วนเชื่อมถึงกันจริง

---

## 6. วิธีทำสาย Jumper ผ่านรู

เมื่อเส้นทางเดินบนด้านทองแดงไม่ผ่าน ให้สร้างรูสองจุดและใช้สายไฟเชื่อมด้านบน

```text
ต้นทาง ──ลายทองแดง── ○ JP1A
                         │
                         │ สายหุ้มฉนวนด้านบน
                         │
ปลายทาง ─ลายทองแดง── ○ JP1B
```

### 6.1 วิธีวางใน EasyEDA

1. วาง `Wire Link/0R` ใน Schematic เพื่อคั่นเส้นสัญญาณ แล้วกำหนด ref เป็น `J1`, `J2`, ...
2. Update/Import Changes เข้า PCB; pad 1 และ pad 2 จะเป็น **คนละ net** ซึ่งเชื่อมถึงกันผ่านตัว jumper เท่านั้น
3. ลากลาย BottomLayer จากต้นทางมาถึง pad 1
4. ลากลาย BottomLayer จาก pad 2 ไปยังปลายทาง
5. ใช้ TopSilk บอกแนวสายเท่านั้น ห้ามลาก TopLayer copper เชื่อม pad ทั้งสอง
6. ตอนประกอบ สอดสายหุ้มฉนวนผ่านรูและบัดกรีกับ pad ทองแดงด้านล่างทั้งสองจุด

> รูที่เจาะเองไม่มี plated through-hole จึงไม่เชื่อมสองด้านอัตโนมัติเหมือน PCB โรงงาน ปลายสายต้องผ่านรูและบัดกรีกับทองแดงจริง

### 6.2 ชนิดสาย

- สัญญาณทั่วไป: สายแกนเดี่ยว AWG 26–30 หรือ wire-wrap
- 3.3V: AWG 24–26
- 5V/GND ไป ESP32-CAM: AWG 22–24
- ใช้สายหุ้มฉนวนเมื่อข้ามลายหรือ jumper เส้นอื่น
- ไม่ใช้ลวดเปลือยกับเส้นทางยาวหรือบริเวณที่มีการไขว้กัน

### 6.3 ตาราง Jumper

Schematic และ PCB ปัจจุบัน (2026-09-17) มี jumper 5 เส้น โดย PCB มี pad ทั้งสองข้างพร้อม net แยกกันแล้ว:

| Jumper | Net ฝั่งอุปกรณ์ | Net ฝั่ง ESP32 | ต้นทาง | ปลายทาง |
|---|---|---|---|---|
| J1 | `RFID_OUT1_7` | `ESP32_27` | RFID_OUT1.RST (pin 7) | ESP32.D2 / GPIO2 (pin 27) |
| J2 | `RFID_OUT1_1` | `ESP32_24` | RFID_OUT1.SDA/SS (pin 1) | ESP32.TX2 / GPIO17 (pin 24) |
| J3 | `BUZZER1_1` | `ESP32_7` | BUZZER1.S (pin 1) | ESP32.D33 / GPIO33 (pin 7) |
| J4 | `J_RELAY_CTRL_3` | `ESP32_8` | J_RELAY_CTRL.IN1 (pin 3) | ESP32.D25 / GPIO25 (pin 8) |
| J5 | `ULTRASONIC_SENSOR1_2` | `ESP32_9` | ULTRASONIC_SENSOR1.TRIG (pin 2) | ESP32.D26 / GPIO26 (pin 9) |

ตอนประกอบ ให้บัดกรีสายหุ้มฉนวนด้านบนเชื่อม pad ทั้งสองของแต่ละ jumper
โดยลากลาย BottomLayer จากอุปกรณ์มาถึง pad ฝั่งหนึ่ง และจาก ESP32 มาถึง pad อีกฝั่ง
ห้ามลากลายเชื่อม pad ทั้งสองของ jumper เดียวกันบนทองแดง

ถ้าลากแล้วพบเส้นอื่นข้ามกันเพิ่ม ให้ใส่ jumper ใหม่ใน Schematic ด้วย ref `J6` ขึ้นไป
แล้วทำตามแบบเดียวกับ J1–J5 แล้วค่อย Import Changes กลับเข้า PCB

### 6.4 หลักการจัดวาง Jumper

- ให้ jumper สั้นและตรงเท่าที่ทำได้
- หลีกเลี่ยงพาดใต้ ESP32 DevKit เพราะถอดและซ่อมยาก
- ไม่พาดผ่านบริเวณเสาอากาศ ESP32
- เว้นระยะจาก Relay และขั้วโหลด
- ให้สาย SPI สั้น โดยเฉพาะ SCK/MOSI/MISO
- ถ้ามีหลายเส้นไขว้กัน ใช้สายคนละสีและเขียนสีลงตาราง
- jumper สั้นและตรงสามารถใช้ 0Ω resistor แบบขาเสียบแทนสายได้

---

## 7. ลำดับวางและเดินลาย

1. วาง ESP32 DevKit ให้เสียบ USB และถอดบอร์ดได้
2. วาง 5V_IN, 5V_OUT และคาปาซิเตอร์ใกล้ขอบบอร์ด
3. วาง J_RELAY_CTRL 3 ขาไว้ริมบอร์ดเพื่อเดินสายไป relay module และไม่ลากสายโหลด 12V บน carrier PCB
4. วาง RC522 สองชุดให้สาย SPI สั้น
5. วาง R4/R3 ใกล้ ECHO/GPIO27
6. เดิน GND และ 5V ก่อนโดยใช้ลายกว้าง
7. เดิน 3.3V
8. เดิน SPI ของ RFID_IN และ RFID_OUT
9. เดิน Ultrasonic, OLED, Relay และ Buzzer
10. เส้นที่ข้ามกันหรืออ้อมมากเกินไปให้เปลี่ยนเป็น jumper
11. ทำ GND copper pour และกด `Shift+B`
12. ตรวจ DRC และตรวจ unrouted ทุกเส้น

ไม่แนะนำใช้ Auto Router เป็นผลลัพธ์สุดท้ายสำหรับบอร์ดหน้าเดียว ควรเดินไฟและสัญญาณสำคัญด้วยมือ

---

## 8. การพิมพ์และกัดแผ่น

1. Export เฉพาะชั้นทองแดงด้านที่ใช้กัด
2. ตรวจทิศภาพให้ถูกกับวิธี toner transfer
3. พิมพ์สเกล 100% ห้าม Fit to page
4. วัดระยะขา ESP32 DevKit/header บนกระดาษก่อนรีดจริง
5. ตรวจ pitch 2.54 mm ด้วยอุปกรณ์จริง
6. ถ้าคว่ำหน้าหมึกลงทองแดง ให้ใช้ภาพ mirrored
7. หลังรีด ตรวจเส้นขาดและซ่อมด้วยปากกากันน้ำก่อนกัด
8. หลังล้างแผ่น ตรวจ short ด้วยมัลติมิเตอร์ก่อนเจาะและบัดกรี

---

## 9. ลำดับประกอบและทดสอบ

### ก่อนใส่อุปกรณ์

- [ ] 5V กับ GND ไม่ short
- [ ] 3.3V กับ GND ไม่ short
- [ ] GND pour ทุกบริเวณต่อถึงกัน
- [ ] ทุกลายมี continuity จากต้นทางถึงปลายทาง
- [ ] เส้นข้างเคียงไม่ short กัน

### หลังบัดกรี Jumper

- [ ] ตรวจทุกเส้นตามตาราง From/To
- [ ] ไม่มี jumper สลับปลาย
- [ ] ไม่มีทองแดงเปลือยแตะกันตรงจุดไขว้
- [ ] ไม่มีสายพาดใต้เสาอากาศ

### เปิดไฟครั้งแรก

1. ยังไม่เสียบ ESP32, ESP32-CAM, RFID, OLED, Relay และ Ultrasonic
2. ป้อนไฟ 5V ผ่านแหล่งจ่ายจำกัดกระแส ถ้ามี
3. วัด 5V_IN, 5V_OUT และราง 5V ทุกจุด
4. ปิดไฟและเสียบ ESP32 หลักเพียงตัวเดียว
5. ตรวจว่า ESP32 บูตได้และราง 3.3V ถูกต้อง
6. เพิ่ม OLED และ RFID ทีละโมดูล
7. เพิ่ม Ultrasonic และ Buzzer
8. เพิ่ม Relay
9. เสียบ ESP32-CAM เป็นลำดับสุดท้าย แล้วทดสอบ ESP-NOW

---

## 10. Checklist ก่อนกัดจริง

### Schematic

- [ ] GPIO ตรงกับตารางในหัวข้อ 1 และ `pooh/full-main_test.ino`
- [ ] RFID_IN.RST อยู่ GPIO4
- [ ] RFID_OUT.SS อยู่ GPIO17
- [ ] Relay IN1 อยู่ GPIO25
- [ ] TRIG อยู่ GPIO26
- [ ] ECHO ผ่าน R4/R3 แล้วเข้า GPIO27
- [ ] Buzzer S อยู่ GPIO33
- [ ] GND ทั้งสองกลุ่มเชื่อมเป็นเน็ตเดียว
- [ ] ไม่วาง J_LOCK; โหลดต่อ COM/NO บน relay module โดยตรง
- [ ] GPIO12 ไม่ได้ต่ออะไร
- [ ] 5V_OUT ต่อ 5V/GND ไป ESP32-CAM
- [ ] OLED ไม่มี pull-up ภายนอกซ้ำ
- [ ] BUZZER1 ยืนยันว่าเป็นโมดูลอินพุต S/GND

### PCB

- [ ] ลายทั้งหมดสำหรับกัดอยู่ชั้นเดียว
- [ ] ลาย 5V/GND ไป CAM กว้างอย่างน้อย 1.2 mm
- [ ] GND copper pour เชื่อมถึงทุกจุด
- [ ] ไม่มี copper pour ใต้เสาอากาศ ESP32/ESP32-CAM
- [ ] Pad jumper ใหญ่พอสำหรับเจาะมือ
- [ ] Jumper ทุกเส้นมีหมายเลขและตาราง From/To
- [ ] ไม่มี Unrouted ที่ไม่ได้ตั้งใจ
- [ ] DRC ผ่านหรือบันทึกเหตุผลของข้อยกเว้นแล้ว
- [ ] พิมพ์สเกล 100% และตรวจ pitch 2.54 mm แล้ว

### หลังทำบอร์ด

- [ ] ตรวจ short ระหว่าง 5V, 3.3V และ GND
- [ ] ตรวจ continuity ครบทุก net
- [ ] ตรวจ GPIO12 ไม่ short กับลายข้างเคียง
- [ ] ตรวจขั้วคาปาซิเตอร์ electrolytic
- [ ] ตรวจ 5V_OUT ก่อนเสียบ ESP32-CAM
- [ ] ทดสอบอุปกรณ์ทีละชุด ไม่เสียบทั้งหมดพร้อมกันครั้งแรก
