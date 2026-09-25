# คู่มือ KiCad — วางและลากบอร์ด Security Door Lock ดีไซน์ `pooh`

คู่มือนี้เน้นการใช้ KiCad เพื่อสร้าง/แก้ carrier board ของ ESP32 DevKit 30 ขา ใช้ได้กับบอร์ดโรงงาน 2 ชั้นและบอร์ดกัดเองหน้าเดียว โดยไม่แก้ไฟล์ KiCad สำเร็จรูปใด ๆ อัตโนมัติ

ตาราง pin/connector/net ฉบับละเอียดอยู่ที่ [`PINOUT_TH.md`](PINOUT_TH.md) และคำอธิบาย
เชิงแนวคิดสำหรับผู้เริ่มต้นอยู่ที่ [`LEARN_PCB_TH.md`](LEARN_PCB_TH.md) เอกสารนี้รวมขั้นตอน
ปฏิบัติที่เคยแยกอยู่ใน `PCB_FROM_ZERO_TH.md` แล้ว

> **Source of truth:** ตรวจ net กับ `firmware/esp32-main/src/esp_main/full-main_test.ino` ก่อนทุกครั้ง หาก PCB/schematic/README เก่าขัดแย้ง ให้ยึด `.ino` และแก้แบบก่อนผลิต

## 1. Connection snapshot ปัจจุบัน

```text
RFID IN : SS5  RST4  SCK18 MISO19 MOSI23
RFID OUT: SS17 RST2  SCK14 MISO35 MOSI13
Relay   : GPIO25
Trig    : GPIO26
Echo    : divider 5V→3.3V → GPIO27
Buzzer  : module S→GPIO33, GND→GND
OLED    : SDA21, SCL22 (ใช้ pull-up บนโมดูล)
CAM     : ESP-NOW; PCB ต่อเฉพาะ +5V/GND
```

สิ่งที่ต้องไม่มีใน schematic ปัจจุบัน:

- UART RX/TX ไป ESP32-CAM
- Q1 และ R8 สำหรับ buzzer
- R pull-up SDA/SCL ภายนอก
- Echo ต่อตรงจากโมดูลเข้า ESP32

วงจร Echo divider:

```text
Echo --- R1 1k ---+--- GPIO27
                  |
                 R2 2k
                  |
                 GND
```

## 2. เปิดหรือสร้างโปรเจกต์

- เปิด `.kicad_pro` ของสำเนาโปรเจกต์ที่ต้องการแก้
- ถ้าสร้างใหม่ ให้สร้าง `.kicad_sch` และ `.kicad_pcb` ในโฟลเดอร์เดียวกัน
- เก็บ symbol/footprint library แบบ project-local หากมี footprint ที่วาดเอง
- ก่อนแก้ไฟล์เก่า ให้บันทึกสำเนาและจดว่าเป็นบอร์ด 2 ชั้นหรือหน้าเดียว อย่า route ปะปนกัน

## 3. Schematic และ ERC

### 3.1 วาง symbol

รายการหลัก:

- socket ESP32: `Conn_01x15` สองตัว
- RFID: `Conn_01x08` สองตัว
- OLED และ ultrasonic: `Conn_01x04`
- relay: `Conn_01x03`
- power, buzzer และ CAM: `Conn_01x02`
- R1 = 1k, R2 = 2k
- mounting holes ไม่มี net

ใช้ global label เพื่อให้ตรวจง่าย เช่น `RFID_IN_SCK`, `RFID_OUT_SS`, `US_ECHO_3V3`, `BUZZER_S`

### 3.2 ตารางตรวจ net

| กลุ่ม | GPIO → ปลายทาง |
|---|---|
| RFID IN | 5→SS, 4→RST, 18→SCK, 19→MISO, 23→MOSI |
| RFID OUT | 17→SS, 2→RST, 14→SCK, 35→MISO, 13→MOSI |
| Relay | 25→IN |
| Ultrasonic | 26→Trig, Echo→R1→จุดร่วม R2→27 |
| Buzzer | 33→S, GND→GND |
| OLED | 21→SDA, 22→SCL |
| CAM | +5V/GND เท่านั้น |

ติด no-connect ที่ RFID IRQ และขา MCU ที่ไม่ใช้ แล้วรัน **Inspect → Electrical Rules Checker** เป้าหมายคือ 0 error ที่ยังไม่ได้อธิบาย

ERC ไม่สามารถรู้ว่า connector ของจริงเรียงขาตรงกับ symbol หรือไม่ ต้องตรวจซิลค์สกรีน RC522, OLED, ultrasonic, relay และ buzzer ด้วยตนเอง

## 4. Assign Footprints

สำหรับงานโรงงานเลือก THT หรือ SMD ตามการประกอบจริง สำหรับงานกัดเองแนะนำ THT:

| รายการ | Footprint แนะนำสำหรับงานมือ |
|---|---|
| ESP32 socket | `PinSocket_1x15_P2.54mm_Vertical` ×2 |
| Module headers | `PinHeader_1xNN_P2.54mm_Vertical` |
| R1/R2 | `R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` |
| Power input | terminal block pitch ตามของจริง หรือ 1x02 header |
| M2 hole | `MountingHole_2.2mm_M2` |

พิมพ์ footprint 1:1 บนกระดาษแล้วเสียบอุปกรณ์จริงก่อนผลิต โดยเฉพาะระยะระหว่าง socket สองแถวของ ESP32

หลังแก้ schematic ใช้ **Tools → Update PCB from Schematic (`F8`)** แล้วอ่านรายการเปลี่ยนแปลงก่อนกด Update PCB

## 5. Placement

หลักวางที่ใช้กับทั้งสองแบบ:

1. ESP32 อยู่กลางบอร์ด ปลายเสาอากาศหันออกขอบ
2. สร้าง Rule Area ห้าม track/via/copper zone ใต้เสาอากาศ
3. RFID IN และ OUT อยู่คนละด้านตามกลุ่ม GPIO ของตนเพื่อลดการไขว้
4. R1/R2 อยู่ชิด ultrasonic header และ GPIO27
5. relay/CAM/power อยู่ใกล้ rail +5V แต่ห่างเสาอากาศ
6. connector ที่ต้องถอดสายอยู่ริมบอร์ดและมีพื้นที่จับปลั๊ก
7. silkscreen ระบุชื่อขา เช่น `5V GND`, `S GND`, `V T E G` ไม่ใช้เพียงหมายเลข J

ปุ่มสำคัญ: `M` move, `R` rotate, `F` flip, `G` drag โดยคง track, `E` properties

## 6. ตั้ง Design Rules

### 6.1 บอร์ดโรงงาน 2 ชั้น

ค่าตั้งต้นทั่วไป ต้องเทียบกับ capability ของผู้ผลิต:

| ชนิด | Track | Clearance | Via |
|---|---:|---:|---:|
| Signal | 0.25–0.30 mm | 0.20 mm | 0.60/0.30 mm |
| +5V/+3V3 | ≥0.60 mm | 0.20 mm | ตามกระแส |

### 6.2 บอร์ดกัดเองหน้าเดียว

| ชนิด | Track | Clearance |
|---|---:|---:|
| Signal | 0.60 mm | 0.50–0.80 mm |
| +5V/GND หลัก | 1.00–1.50 mm | ≥0.50 mm |

- เปิดใช้ทองแดงเฉพาะ `B.Cu`
- ห้ามใช้ via ที่ต้องพึ่งรูชุบ
- จุดข้ามให้วาง jumper footprint/pad แล้วต่อสาย insulated wire บนด้านอุปกรณ์
- ใช้ pad และ annular ring ใหญ่กว่าค่าบอร์ดโรงงาน
- หลีกเลี่ยง route ระหว่าง pad pitch 2.54 mm จนกว่าจะพิสูจน์ว่ากระบวนการกัดทำได้สม่ำเสมอ

## 7. Routing

### 7.1 คำสั่งพื้นฐาน

- `X`: เริ่ม route จาก pad
- คลิก: วางมุม; จบที่ pad ปลายทาง
- `V`: วาง via/เปลี่ยนชั้น — ใช้เฉพาะบอร์ด 2 ชั้น
- `D`: drag track
- `U`: เลือกทั้ง net
- `Del`: ลบสิ่งที่เลือก
- `` ` ``: highlight net

### 7.2 ลำดับ route ที่แนะนำ

1. +5V, +3V3 และเส้นทางกลับ GND
2. RFID IN ทั้ง 5 สัญญาณ
3. RFID OUT ทั้ง 5 สัญญาณ
4. ultrasonic รวม divider, relay และ buzzer
5. OLED SDA/SCL
6. CAM +5V/GND
7. ground pour หรือ GND track ที่เหลือ

ลำดับนี้ไม่มี UART-specific routing เพราะ CAM ใช้ ESP-NOW และ GPIO17 ถูกใช้เป็น RFID OUT SS

### 7.3 เทคนิคบอร์ดหน้าเดียว

- route ทุกอย่างบน B.Cu ก่อน ไม่กด `V`
- เมื่อเลี่ยงทางข้ามไม่ได้ ให้วาง `JP1`, `JP2`, … และลากเส้น F.Cu สั้น ๆ เพื่อสื่อว่าเป็น **สาย jumper จริง** ไม่ใช่ทองแดงหน้า
- กระจาย jumper ให้อยู่ในที่บัดกรี/เปลี่ยนสายได้ ไม่ลอดใต้ socket แบบเข้าถึงไม่ได้
- socket ESP32 กลางบอร์ดทำให้การข้ามแนวขาเป็นข้อจำกัดเชิงโครงสร้าง บอร์ดหน้าเดียวจึงอาจต้องมี jumper หลายเส้น
- ตรวจว่าทุก pad ของ GND เชื่อมจริง; ground pour ที่แตกเป็นเกาะไม่ถือว่าต่อ

## 8. Copper zone

### บอร์ด 2 ชั้น

1. เลือก **Add Filled Zone**
2. เลือก net `GND` และชั้น B.Cu; เพิ่ม F.Cu ได้ตามความเหมาะสม
3. เว้น keepout ใต้เสาอากาศ ESP32 ทั้งสองชั้น
4. กด `B` เพื่อ refill หลังแก้ track ทุกครั้ง

### บอร์ดหน้าเดียว

ใช้ GND zone บน B.Cu ได้เมื่อพื้นที่กว้างพอ แต่ควรมี GND trunk ที่เห็นและตรวจ continuity ได้ Zone แคบระหว่าง pad อาจกัดขาดง่าย กด `B` แล้วซูมตรวจ thermal spoke และ island ทุกจุด

## 9. DRC และการตรวจแบบ

รัน **Inspect → Design Rules Checker** โดย refill zone ก่อนตรวจ เป้าหมาย:

- 0 unconnected
- 0 clearance/short error
- ไม่มี copper ใต้เสาอากาศ
- บอร์ดหน้าเดียวไม่มี via และไม่มี track จริงบน F.Cu นอกจากเส้นแทน jumper ที่ระบุชัด

ตรวจด้วยตาอีกครั้ง:

- RFID IN RST = 4; RFID OUT SS = 17
- Relay 25; Trig 26; Echo-divider 27; Buzzer 33
- OLED 21/22 และไม่มี pull-up ภายนอก
- CAM connector มีเพียง +5V/GND
- ไม่มี Q1/R8
- connector pin 1 และ polarity ตรงของจริง

## 10. Output สำหรับโรงงาน

1. กด `B`
2. **File → Fabrication Outputs → Gerbers**
3. เลือก F.Cu/B.Cu, solder mask, silkscreen และ Edge.Cuts ตามบอร์ด
4. Generate Excellon drill
5. เปิด Gerber viewer ตรวจ outline, drill, layer และ polarity
6. zip ไฟล์ที่จำเป็นส่งผู้ผลิต

## 11. Output สำหรับ toner transfer/กัดเอง

1. Plot `B.Cu` และ `Edge.Cuts`
2. ตั้ง artwork ทองแดง B.Cu เป็น **mirrored** สำหรับถ่ายโทนเนอร์
3. พิมพ์ 100% ห้าม fit-to-page
4. วัด pitch 2.54 mm และขนาดบอร์ดบนกระดาษก่อนรีด
5. ใช้ drill โดยประมาณ: header/resistor 0.9–1.0 mm, jumper 0.7–0.9 mm, M2 2.2–2.3 mm; วัดขาจริงเป็นหลัก
6. หลังแกะกัด ล้างและตรวจ short/open ด้วยมัลติมิเตอร์ก่อนบัดกรี
7. บัดกรี jumper/ตัวต้านทานก่อน socket สูง แล้วทดสอบ continuity ทุก net

> อย่าส่งไฟล์ Gerber 2 ชั้นเดิมไปพิมพ์เป็นลายหน้าเดียวโดยซ่อน F.Cu เฉย ๆ เส้นที่เคยผ่าน via จะขาด ต้อง route variant หน้าเดียวโดยตั้งข้อจำกัดตั้งแต่ต้น

## 12. Troubleshooting

| อาการ | จุดตรวจ |
|---|---|
| RFID IN ไม่ตอบ | SS5, RST4, SCK18, MISO19, MOSI23 และไฟ 3.3V |
| RFID OUT ไม่ตอบ | SS17, RST2, SCK14, MISO35, MOSI13 และไฟ 3.3V |
| บอร์ดอ่าน Echo เพี้ยน/เสี่ยงเสีย | ตรวจ R1=1k จาก Echo และ R2=2k ลง GND ก่อน GPIO27 |
| Relay ทำงานผิดอุปกรณ์ | IN ต้องเป็น GPIO25 |
| Buzzer ไม่ดัง | ตรวจว่าเป็นโมดูล S/GND, S=GPIO33 และ ground ร่วม |
| CAM มีไฟแต่ไม่มี UART data | เป็นพฤติกรรมถูกต้อง; ดีไซน์ใช้ ESP-NOW |
| OLED ไม่ขึ้น | ตรวจ SDA21/SCL22, address และ pull-up บนโมดูล; อย่าเพิ่ม R โดยเดา |
| แผ่นกัดกลับด้าน | B.Cu สำหรับ toner transfer ต้อง mirror; ใส่ข้อความทดสอบใน artwork |
| ลายขาดหลังเจาะ | เพิ่ม pad/annular ring และใช้ดอกสว่านตรงขนาด |
