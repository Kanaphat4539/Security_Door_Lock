# EasyEDA Standard ตั้งแต่ศูนย์ — บอร์ด `pooh` แบบกัดลายมือชั้นเดียว

คู่มือนี้ใช้สำหรับทำ carrier board ของ Security Door Lock ด้วย **EasyEDA Standard** (`https://easyeda.com/editor`) แล้วพิมพ์ลาย **BottomLayer เพียงด้านเดียวเพื่อกัดแผ่นทองแดงเอง** อุปกรณ์อยู่ด้านบน และใช้สายจัมเปอร์หุ้มฉนวนเมื่อเส้นจำเป็นต้องข้ามกัน

> **คำเตือน Source of Truth**
> การต่อขาในเอกสารนี้ยึดไฟล์ `pooh:firmware/esp32-main/src/esp_main/full-main_test.ino` เท่านั้น ตรวจต้นฉบับได้ด้วย
> `git show pooh:firmware/esp32-main/src/esp_main/full-main_test.ino`
> อย่าคัดลอกขาจาก `config.h`, แผนผังเก่า หรือคู่มือเวอร์ชัน UART หากแก้ `#define` ในไฟล์นี้ ต้องแก้ตารางขา สกีมาติก และ PCB **ก่อนกัดบอร์ดใหม่**

วงจรปัจจุบันมีเงื่อนไขสำคัญดังนี้

- ESP32-CAM คุยด้วย ESP-NOW: มีสายจากบอร์ดหลักแค่ `5V` และ `GND` ไม่มี UART
- buzzer เป็นโมดูลที่รับ `S/GND`: GPIO33 ต่อ `S` โดยตรง และกราวด์ร่วม ไม่ใช้ทรานซิสเตอร์หรือตัวต้านทานขับ
- OLED module มี pull-up I2C อยู่แล้ว: ไม่ใส่ตัวต้านทาน pull-up เพิ่ม
- ECHO ของ ultrasonic ต้องผ่าน 1 kΩ อนุกรม แล้วมี 2 kΩ จากจุดรับ GPIO27 ลง GND
- กราวด์ฝั่งแรงดันต่ำทุกชุดต้องร่วมกัน
- ขั้วโหลดรีเลย์ใช้ `COM/NO`; คู่มือนี้ไม่ออกแบบสำหรับไฟบ้าน

---

## 0. แบบที่จะสร้าง

- แผ่นทองแดงด้านเดียว: ใช้เฉพาะ `BottomLayer`
- อุปกรณ์ through-hole อยู่ด้านบน: ESP32 DevKit บน socket, pin header/terminal block, R แบบ axial, C แบบ radial
- จุดตัดที่หลบไม่ได้: ใช้ wire link/สายจัมเปอร์หุ้มฉนวนด้านบน แล้วบัดกรีปลายลงรูสองจุด
- ห้ามใช้ via เพราะแผ่นกัดเองไม่มี plated through hole
- ESP32-CAM รับไฟจาก connector 2 ขา พร้อม C 470 µF และ C 100 nF ชิด connector
- relay ที่ใช้คือโมดูล 1 ช่อง 5V รุ่น SRD-05VDC-SL-C แบบ High-level trigger มีขั้วสกรู `NC/COM/NO` บนโมดูลอยู่แล้ว carrier board ต่อเฉพาะ `VCC/GND/IN` และไม่ต้องมี J_LOCK

EasyEDA Standard ไม่ใช่ EasyEDA Pro เมนูในคู่มือนี้อ้างอิง Standard เท่านั้น

---

## 1. สร้างโปรเจกต์และตั้งหน้าจอ

1. เปิด `https://easyeda.com/editor` และ login
2. เลือก **File → New → Create a new project** ตั้งชื่อ `Security_Door_Lock_pooh_handetch`
3. คลิกขวาโปรเจกต์ → **New → Schematic** ตั้งชื่อ `main_pooh`
4. คลิกบน canvas ก่อนใช้ hotkey; `Shift+F` อาจไม่ทำงานหาก focus อยู่หน้า Start
5. กด `Q` ให้หน่วยเป็น mm และกด `Ctrl+S` บ่อย ๆ
6. ใช้ `Ctrl+D` เปิด Design Manager และ `Alt+F` เปิด Footprint Manager

หลักการค้นชิ้นส่วน: `Shift+F` → **Types = Symbol** แล้วเลือก symbol ที่มี footprint หากใช้ชิ้นส่วนจริงคนละรุ่น ให้ตรวจระยะขาและลำดับขาจากของจริงก่อนเลือก footprint

---

## 2. BOM และ connector ที่ต้องวาง

เลข reference ด้านล่างเป็นชื่อแนะนำเพื่อให้ตรวจตามตารางได้ง่าย จะเปลี่ยนเลขได้ แต่ชื่อ net และลำดับขาต้องคงเดิม

| Ref | จำนวน | อุปกรณ์/ค่า | คำค้นใน EasyEDA Standard | ข้อกำหนดงานกัดมือ |
|---|---:|---|---|---|
| U1 | 1 | ESP32 DevKit V1 30-pin | `DOIT ESP32 DEVKIT V1` | ใช้ socket female 1×15 สองแถว; ตรวจชื่อ pin ไม่เชื่อเลข pin ของ symbol โดยไม่ตรวจ |
| J_PWR | 1 | ไฟเข้า 5V/GND 2P | `HDR-M-2.54_1X2` หรือ terminal 2P | ถ้าถอดบ่อยใช้ screw terminal 5.08 mm |
| J_RFID_IN | 1 | RFID เข้า 1×8 | `HDR-M-2.54_1X8` | 2.54 mm THT |
| J_RFID_OUT | 1 | RFID ออก 1×8 | `HDR-M-2.54_1X8` | 2.54 mm THT |
| J_OLED | 1 | OLED 1×4 | `HDR-M-2.54_1X4` | ไม่มี R pull-up เพิ่ม |
| J_US | 1 | Ultrasonic 1×4 | `HDR-M-2.54_1X4` | ตรวจลำดับ VCC/TRIG/ECHO/GND จากโมดูลจริง |
| R_ECHO_SER | 1 | 1 kΩ | resistor axial THT | อนุกรม ECHO ก่อน GPIO27 |
| R_ECHO_PD | 1 | 2 kΩ | resistor axial THT | จากจุด GPIO27 ลง GND |
| J_BUZZ | 1 | Buzzer module 1×2 | `HDR-M-2.54_1X2` | pin 1 = S, pin 2 = GND; ต่อ GPIO33 ตรง |
| J_CAM | 1 | ESP32-CAM power 1×2 | terminal/header 2P | pin 1 = 5V, pin 2 = GND; ไม่มี data |
| C_CAM_BULK | 1 | 470 µF, อย่างน้อย 10 V | radial electrolytic THT | วางชิด J_CAM; ขั้ว `+` ไป 5V |
| C_CAM_HF | 1 | 100 nF ceramic | ceramic THT | วางชิด J_CAM คร่อม 5V/GND |
| J_RELAY_CTRL | 1 | Relay control 1×3 | `HDR-M-2.54_1X3` | pin 1 VCC, 2 GND, 3 IN |
| JP1… | ตาม routing | insulated wire link | `WIRE LINK`, `0R`, axial resistor footprint | เพิ่มเมื่อเส้นต้องข้าม; ไม่ใช้ via |
| H1–H4 | 4 | รูยึด | Hole | เลือกขนาดตามสกรูจริง |

ต่อโหลด 12V เข้าที่ขั้วสกรู `COM/NO` ของ relay module โดยตรง ไม่ต้องลากกระแสโหลดผ่าน carrier PCB กัดมือ

> งานนักศึกษาที่กัดเองควรเลือก footprint THT และวัด pitch ของชิ้นส่วนจริงด้วยเวอร์เนียร์ก่อนวาง อย่าเลือก footprint จากชื่ออย่างเดียว

---

## 3. ตาราง GPIO ปัจจุบันจาก `pooh`

| ฟังก์ชัน | ขา ESP32 | ทิศทาง/หมายเหตุ |
|---|---:|---|
| RFID_IN SS | GPIO5 (`D5`) | output, VSPI |
| RFID_IN RST | GPIO4 (`D4`) | output |
| RFID_IN SCK | GPIO18 (`D18`) | output, VSPI |
| RFID_IN MISO | GPIO19 (`D19`) | input, VSPI |
| RFID_IN MOSI | GPIO23 (`D23`) | output, VSPI |
| RFID_OUT SS | GPIO17 (`TX2`) | output, HSPI; ชื่อ TX2 บนบอร์ดไม่ได้หมายความว่าใช้ UART |
| RFID_OUT RST | GPIO2 (`D2`) | output |
| RFID_OUT SCK | GPIO14 (`D14`) | output, HSPI |
| RFID_OUT MISO | GPIO35 (`D35`) | input-only, HSPI |
| RFID_OUT MOSI | GPIO13 (`D13`) | output, HSPI |
| Relay IN | GPIO25 (`D25`) | output |
| Ultrasonic TRIG | GPIO26 (`D26`) | output |
| Ultrasonic ECHO | GPIO27 (`D27`) | input หลัง divider 1 kΩ/2 kΩ |
| Buzzer module S | GPIO33 (`D33`) | output ต่อตรงเข้าขา S |
| OLED SDA | GPIO21 (`D21`) | I2C |
| OLED SCL | GPIO22 (`D22`) | I2C |
| ESP32-CAM | ไม่มี GPIO | ESP-NOW; ต่อเพียง 5V/GND |

ห้ามย้าย ECHO ไป GPIO32, TRIG ไป GPIO33, relay ไป GPIO26 หรือ buzzer ไป GPIO25 ตามแผนผังเก่า

---

## 4. Pin table ของ connector

หัน connector ตามซิลค์สกรีนของบอร์ดและพิมพ์เลข `1` บน PCB ทุกตัว ลำดับในตารางคือคำตอบของ schematic

| Connector | Pin 1 | Pin 2 | Pin 3 | Pin 4 | Pin 5 | Pin 6 | Pin 7 | Pin 8 |
|---|---|---|---|---|---|---|---|---|
| J_PWR | P5V | GND | — | — | — | — | — | — |
| J_RFID_IN | RFIDINSS | RFIDINSCK | RFIDINMOSI | RFIDINMISO | NC/IRQ | GND | RFIDINRST | P3V3 |
| J_RFID_OUT | RFIDOUTSS | RFIDOUTSCK | RFIDOUTMOSI | RFIDOUTMISO | NC/IRQ | GND | RFIDOUTRST | P3V3 |
| J_OLED | GND | P3V3 | OLEDSCL | OLEDSDA | — | — | — | — |
| J_US | P5V | USTRIG | USECHO5V | GND | — | — | — | — |
| J_BUZZ | BUZZERS | GND | — | — | — | — | — | — |
| J_CAM | P5V | GND | — | — | — | — | — | — |
| J_RELAY_CTRL | P5V | GND | RELAYIN | — | — | — | — | — |

RC522 บางบอร์ดพิมพ์ `SDA` ที่ขา chip-select; ในตารางนี้ `SDA` ของ RC522 หมายถึง `SS` ไม่ใช่ I2C

---

## 5. Net answer key — ต้องตรงทุกจุด

ใช้ชื่อ ASCII ด้านล่างเพื่อหลีกเลี่ยงปัญหาชื่อ net ใน EasyEDA Standard

| Net | จุดที่ต้องอยู่ใน net เดียวกัน |
|---|---|
| P5V | U1 VIN, J_PWR.1, J_US.1, J_CAM.1, J_RELAY_CTRL.1, C_CAM_BULK(+), C_CAM_HF.1 |
| P3V3 | U1 3V3, J_RFID_IN.8, J_RFID_OUT.8, J_OLED.2 |
| GND | U1 GND ทั้งสองขา, J_PWR.2, J_RFID_IN.6, J_RFID_OUT.6, J_OLED.1, J_US.4, R_ECHO_PD.2, J_BUZZ.2, J_CAM.2, C_CAM_BULK(−), C_CAM_HF.2, J_RELAY_CTRL.2 |
| RFIDINSS | U1 GPIO5, J_RFID_IN.1 |
| RFIDINRST | U1 GPIO4, J_RFID_IN.7 |
| RFIDINSCK | U1 GPIO18, J_RFID_IN.2 |
| RFIDINMISO | U1 GPIO19, J_RFID_IN.4 |
| RFIDINMOSI | U1 GPIO23, J_RFID_IN.3 |
| RFIDOUTSS | U1 GPIO17, J_RFID_OUT.1 |
| RFIDOUTRST | U1 GPIO2, J_RFID_OUT.7 |
| RFIDOUTSCK | U1 GPIO14, J_RFID_OUT.2 |
| RFIDOUTMISO | U1 GPIO35, J_RFID_OUT.4 |
| RFIDOUTMOSI | U1 GPIO13, J_RFID_OUT.3 |
| RELAYIN | U1 GPIO25, J_RELAY_CTRL.3 |
| USTRIG | U1 GPIO26, J_US.2 |
| USECHO5V | J_US.3, R_ECHO_SER.1 |
| USECHO3V3 | R_ECHO_SER.2, R_ECHO_PD.1, U1 GPIO27 |
| BUZZERS | U1 GPIO33, J_BUZZ.1 |
| OLEDSDA | U1 GPIO21, J_OLED.4 |
| OLEDSCL | U1 GPIO22, J_OLED.3 |

ขา IRQ ของ RC522 ทั้งสองตัวเป็น No-Connect ไม่มี UART ระหว่าง main board กับ CAM และไม่มีอุปกรณ์ pull-up เพิ่มบน SDA/SCL

---

## 6. วาด schematic ใน EasyEDA

1. วาง U1 และ connector ทั้งหมดจากตาราง BOM
2. วาง R_ECHO_SER 1 kΩ และ R_ECHO_PD 2 kΩ เป็นรูป divider:

```text
J_US.ECHO ── 1k ──●── GPIO27
                  │
                  2k
                  │
                 GND
```

3. วาง C 470 µF และ 100 nF ขนานระหว่าง P5V/GND ชิด J_CAM ใน schematic และภายหลังชิด connector จริงบน PCB
4. กด `W` ลาก wire สั้นจาก pin แล้วกด `N` วาง NetLabel ตาม Net answer key
5. ใช้ `Ctrl+G` สำหรับ GND; หาก power flag ที่เลือกสร้างชื่อไม่ตรง ให้ใช้ NetLabel `P5V`/`P3V3` อย่างสม่ำเสมอ
6. ใส่ No-Connect Flag ที่ขา ESP32 ที่ไม่ใช้และ IRQ ของ RC522
7. **อย่าวาง** วงจร transistor สำหรับ buzzer, resistor อนุกรม buzzer หรือ pull-up 4.7 kΩ ของ OLED
8. กด `Ctrl+D` → **Nets** ตรวจสมาชิกทุก net ตามตารางข้อ 5
9. กด `Alt+F` ตรวจ footprint และเลข pad ให้ตรง pin symbol
10. Save ด้วย `Ctrl+S`

---

## 7. Convert to PCB และกำหนดบอร์ด

1. กด **Convert to PCB**; แถวแดงหมายถึง footprint หายหรือเลข pad ไม่ตรง
2. EasyEDA สร้าง outline อัตโนมัติ ให้ลบแล้วสร้างของจริงด้วย **Tools → Set Board Outline**
3. หากต้องใช้ขนาดเดิมของกล่อง ให้ใช้ 88 × 148 mm; ถ้างานจริงเปลี่ยน ให้ยึดกล่องและตำแหน่งรูจริง
4. วางรูยึดด้วย PCB Tools → **Hole**; พิมพ์แบบ 1:1 ตรวจทาบกล่องก่อนกัด
5. หลังแก้ schematic ใช้ **Design → Import Changes → Apply Change** และเลือก update net ของ track เมื่อจำเป็น

---

## 8. Placement สำหรับแผ่นชั้นเดียว

วางเพื่อให้ ratsnest ตัดกันน้อยที่สุด แทนการบังคับพิกัดเก่าของบอร์ดสองชั้น

1. U1 กลางบอร์ดและหันเสาอากาศออกขอบ; เว้นพื้นที่ใต้/หน้าเสาอากาศจากทองแดงและสาย
2. J_RFID_IN/J_RFID_OUT อยู่คนละฝั่งใกล้ชุด GPIO ของตน
3. J_US และ divider 1 kΩ/2 kΩ อยู่ชิดกัน; จุด `USECHO3V3` ต้องสั้น
4. J_CAM กับ C ทั้งสองตัวอยู่ชิดกัน; ลาย 5V/GND สั้นและกว้าง
5. J_OLED อยู่ใกล้ GPIO21/22
6. J_BUZZ อยู่ใกล้ GPIO33/GND
7. J_RELAY_CTRL อยู่ริมบอร์ดและใกล้ GPIO25 เพื่อให้ลากสาย 3 เส้นไป relay module ได้สั้น
8. J_PWR อยู่ริมบอร์ด ใช้ terminal ที่รับกระแสได้
9. วาง silkscreen ชื่อทุก pin และเครื่องหมายขั้ว `+` ของ electrolytic

ตัว socket ESP32 สองแถวต้องวัดระยะจาก DevKit จริง บอร์ด 30-pin หลายยี่ห้อมีความกว้างไม่เท่ากัน พิมพ์ footprint 1:1 แล้วเสียบของจริงก่อนกัด

---

## 9. Design Rule สำหรับกัดลายมือ

ไปที่ **Tools → Design Rule…** และตั้งค่าตามความสามารถจริงของวิธี transfer/กัด ไม่ใช้ค่าจิ๋วแบบโรงงานเป็นค่าเริ่มต้น

ค่าตั้งต้นที่ทำมือได้ง่าย:

- signal track: 0.8–1.0 mm
- 5V/3.3V/GND: 1.2–1.5 mm
- CAM 5V/GND และ relay-control power: 1.5 mm ถ้าพื้นที่พอ
- ไม่ลากกระแสโหลด 12V ผ่าน carrier PCB; ต่อที่ COM/NO ของ relay module โดยตรง
- clearance: 0.8 mm; บริเวณโหลดให้ 1.0 mm ขึ้นไป
- pad annular ring ใหญ่พอเจาะมือ; รู header ปกติประมาณ 1.0 mm แต่ต้องวัดขาจริง
- เปิด Realtime DRC และ Check Object to Board Outline

บอร์ดนี้สำหรับแรงดันต่ำเท่านั้น ห้ามนำ clearance ชุดนี้ไปใช้กับ 220/230 VAC

---

## 10. เดินลาย BottomLayer และทำ insulated jumper

1. เลือก `BottomLayer` เป็น active layer แล้วกด `W` เดิน track
2. เดิน P5V/GND และจุด CAM ก่อน ตามด้วย relay load, SPI, I2C และสัญญาณอื่น
3. ใช้มุม 45°; หลีกเลี่ยงคอขวดระหว่าง pad
4. ห้ามกด `V` และห้ามเปลี่ยนไป TopLayer เพื่อสร้าง via
5. เมื่อเส้นต้องข้ามกัน ให้ย้อนกลับไป schematic แล้วเพิ่ม `Wire Link/0R` เป็น `Jn` เพื่อแยก net สองฝั่ง เช่น `RFIDINSCKA` และ `RFIDINSCKB`; update PCB แล้ววาง footprint แบบ axial ระยะพอข้ามลาย
   Schematic ปัจจุบันมี jumper 5 เส้น: `J1` = RFID_OUT RST, `J2` = RFID_OUT SS,
   `J3` = Buzzer, `J4` = Relay IN และ `J5` = Ultrasonic TRIG
   (ใช้ ref J1–J5 ไม่ใช่ JP1–JP5); สายที่เพิ่มใหม่ให้ใช้ `J6` ขึ้นไป
6. บนของจริง ใช้สายแกนเดี่ยวหุ้มฉนวนพาดด้านอุปกรณ์ บัดกรีปลายที่ pad ของ JPn ด้านทองแดง
7. อย่าใช้ลวดเปลือยข้ามเหนือ pad/ขาโลหะอื่น และอย่าวาง jumper ผ่านใต้เสาอากาศ ESP32
8. ใส่ silkscreen `J1`–`J5` และบันทึกตารางว่า jumper แต่ละเส้นเชื่อม net ใด

หากไม่ต้องการแก้ schematic สามารถใช้ pad THT สองจุดสำหรับ jumper ได้ แต่ DRC/netlist จะตรวจการต่อให้ไม่ได้ วิธีใส่ Wire Link ใน schematic จึงปลอดภัยกว่า

GND plane ไม่จำเป็นสำหรับบอร์ดกัดมือ หากเท copper ให้ใช้ **Copper Area เฉพาะ BottomLayer, Net=GND**, clearance อย่างน้อย 0.8 mm, Keep Island=No แล้วกด `Shift+B` ทุกครั้งหลังแก้ ห้ามสร้าง TopLayer copper area

---

## 11. ตรวจ DRC และตรวจ net ก่อนพิมพ์

1. กด `Shift+B` ถ้ามี copper area
2. **Design → Check DRC** ให้เหลือ 0 error
3. ตรวจ ratline ต้องไม่มี ยกเว้นรายการที่ตั้งใจและบันทึกไว้ชัดเจน
4. `Ctrl+D` ตรวจ net กับตารางข้อ 5 ทีละแถว
5. ตรวจ continuity เชิงตรรกะ:
   - GPIO26 ถึง TRIG; GPIO27 อยู่ฝั่งหลัง 1 kΩ
   - GPIO25 ถึง relay IN; GPIO33 ถึง buzzer S
   - CAM มีเพียง P5V/GND และ C สองตัว
   - OLED ไม่มี pull-up เพิ่ม
   - GND ของทุกโมดูลต่อร่วมกัน
   - J_RELAY_CTRL มีเพียง P5V/GND/RELAYIN; ไม่มี COM/NO บน carrier PCB
6. พิมพ์ assembly/footprint 1:1 ลงกระดาษ เจาะรูทดลองบางจุดแล้วทาบ ESP32, terminal และกล่อง

---

## 12. ส่งออกลายสำหรับ toner transfer/กัด

1. ซ่อน TopLayer, silkscreen และ layer อื่น เหลือ BottomLayer, pad และ BoardOutLine ตามวิธี export ที่ใช้
2. Export/Print ที่สเกล **100% หรือ 1:1** ปิด Fit to page
3. ใส่เส้นวัด 100 mm หรือระยะ header หลายช่วง แล้ววัดกระดาษก่อน transfer
4. เรื่อง mirror ขึ้นกับว่าโปรแกรม/viewer แสดง BottomLayer จากด้านใดและวิธีวางกระดาษ toner อย่าเดา: ใช้ connector ที่ไม่สมมาตรและตัวอักษร `BOT` เป็น test mark แล้วทาบแผ่นใส/กระดาษกับตำแหน่งอุปกรณ์ด้านบนก่อนกัด
5. หลัง transfer ตรวจ track ขาด/ติดกันด้วยแว่นขยายและแต้มแก้ด้วยปากกากันกรด
6. กัด ล้าง เจาะ แล้วตรวจด้วย multimeter ก่อนบัดกรี: ทุก net ต้องต่อ, net ข้างเคียงต้องไม่ short
7. บัดกรีของเตี้ยไปสูง: jumper/resistor → header/socket → capacitor/terminal
8. ยังไม่เสียบ ESP32/โมดูล ให้จ่ายไฟและวัด P5V, P3V3, polarity และ short ก่อน

Gerber ยังสร้างได้ที่ **File → Generate PCB Fabrication File (Gerber)** เพื่อเก็บอ้างอิง แต่ถ้าส่งโรงงานต้องแจ้ง/เลือก 1-layer ตามความสามารถผู้ผลิต และตรวจว่าไม่มี TopLayer copper

---

## 13. ต่อโหลด relay และทดสอบ

สำหรับโซลินอยด์ 12V DC ตัวอย่างการต่อคือ `+12V → COM`, `NO → solenoid +`, `solenoid − → 12V−` หาก 5V มาจาก buck ที่รับ 12V ก้อนเดียวกัน ให้ 12V−/buck GND/ESP32 GND เป็น common ground ฝั่งควบคุม

- ใส่ flyback diode ที่โซลินอยด์ DC ตามขั้ว: cathode ไปด้านบวก, anode ไปด้านลบ
- contact COM/NO เป็นวงจรสวิตช์ ไม่ผูกเข้ากับ GND บน PCB โดยอัตโนมัติ
- ทดสอบ relay ด้วยโหลด 12V กระแสต่ำก่อน
- ห้ามใช้แผ่นกัดมือนี้กับไฟบ้าน

ลำดับทดสอบ: power rails → OLED → ultrasonic/divider → RFID_IN → RFID_OUT → buzzer module → relay control → CAM power/ESP-NOW → โหลดจริง

---

## 14. Checklist ก่อนกัด

- [ ] ขาทั้งหมดตรงกับ `pooh:.../full-main_test.ino`
- [ ] RFID_IN = SS5/RST4/SCK18/MISO19/MOSI23
- [ ] RFID_OUT = SS17/RST2/SCK14/MISO35/MOSI13
- [ ] relay GPIO25, TRIG GPIO26, ECHO GPIO27 ผ่าน 1 kΩ + 2 kΩ ลง GND
- [ ] buzzer module S = GPIO33 และอีกขา = GND
- [ ] OLED SDA21/SCL22 และไม่มี pull-up เพิ่ม
- [ ] CAM มีเฉพาะ 5V/GND พร้อม 470 µF + 100 nF ชิด connector
- [ ] GND ทุกโมดูลร่วมกัน
- [ ] โหลดต่อที่ COM/NO บน relay module โดยตรง และ carrier PCB มีเพียง J_RELAY_CTRL 3 ขา
- [ ] ทุก track อยู่ BottomLayer; ไม่มี via/TopLayer copper
- [ ] jumper ทุกเส้นเป็นสายหุ้มฉนวนและมี reference
- [ ] DRC 0 error, ratline 0, พิมพ์ 1:1 ทาบของจริงแล้ว
- [ ] ตรวจ mirror ด้วยชิ้นส่วนไม่สมมาตรก่อนกัด
- [ ] continuity/short test ผ่านก่อนเสียบ ESP32

---

## ภาคผนวก A — Hotkey ที่ใช้จริง

| ปุ่ม | หน้าที่ |
|---|---|
| `Shift+F` | Library; ต้องให้ canvas มี focus |
| `Ctrl+D` | Design Manager: Components/Nets/DRC |
| `Alt+F` | Footprint Manager |
| `W` | schematic wire / PCB track |
| `N` | NetLabel |
| `Ctrl+G` / `Ctrl+Q` | GND / VCC NetFlag |
| `Space` | หมุน |
| `D` | drag |
| `Q` | mil/mm |
| `K` | fit window |
| `H` | highlight net |
| `L` | เปลี่ยนมุม routing |
| `+` / `-` | เปลี่ยนความกว้างระหว่าง route |
| `E` | Copper Area |
| `Shift+B` | rebuild copper area |
| `Shift+M` | ซ่อน/แสดง copper fill |
| `Ctrl+S` | save |

`B`, `T`, `V` เป็น hotkey ที่มีประโยชน์กับบอร์ดโรงงานหลายชั้น แต่ในงานกัดชั้นเดียวนี้ **อย่าใช้ระหว่าง routing** เพราะจะสร้าง TopLayer/via

## ภาคผนวก B — ปัญหาที่พบบ่อย

| อาการ | ตรวจ/แก้ |
|---|---|
| Shift+F ไม่ขึ้น | เปิดเอกสารและคลิก canvas ก่อน |
| Convert แล้วแถวแดง | footprint หาย หรือเลข symbol pin ไม่ตรง pad |
| แก้ schematic แล้ว PCB ไม่เปลี่ยน | Design → Import Changes → Apply Change |
| DRC ยังมี unrouted | ตรวจ ratline และ jumper; อย่าซ่อนด้วยการวาดเส้นไร้ net |
| ลายขาดหลัง etch | เพิ่ม track width/pad size และลดความหนาแน่น; ใช้ jumper แทนการเบียด |
| CAM reset ตอนส่งภาพ | ตรวจ 5V drop, GND, ความกว้างลาย และ C 470 µF/100 nF ชิด J_CAM |
| RFID_OUT ไม่ทำงาน | ตรวจ GPIO17/2/14/35/13 และ GPIO35 ต้องเป็น MISO เท่านั้น |
| ESP32 เสีย/อ่านระยะเพี้ยน | ตรวจ divider: ECHO—1 kΩ—GPIO27 และ 2 kΩ จาก GPIO27 ลง GND |
