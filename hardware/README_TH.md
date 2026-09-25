# Hardware — Security Door Lock

โฟลเดอร์นี้เก็บคู่มือและไฟล์ออกแบบฮาร์ดแวร์ของระบบ Security Door Lock

> **Source of truth สำหรับ GPIO:**
> `pooh:firmware/esp32-main/src/esp_main/full-main_test.ino`
>
> ไฟล์ KiCad ใน `mainboard-*` เป็นแบบเก่าที่ไม่ตรงกับ firmware ปัจจุบัน ห้ามส่งผลิต
> หรือกัดแผ่นโดยไม่แก้ schematic/PCB ให้ตรงกับสเปกปัจจุบันก่อน

## เอกสารปัจจุบัน

| ไฟล์ | ใช้เมื่อ |
|---|---|
| [`PINOUT_TH.md`](PINOUT_TH.md) | ตรวจ GPIO, pin, connector, net และการต่อสายทั้งหมด |
| [`EASYEDA_FROM_ZERO_TH.md`](EASYEDA_FROM_ZERO_TH.md) | สร้างบอร์ดกัดมือหน้าเดียวใน EasyEDA Standard ตั้งแต่ศูนย์ |
| [`PCB_HANDMADE_FIX_GUIDE_TH.md`](PCB_HANDMADE_FIX_GUIDE_TH.md) | ตรวจและแก้ Schematic EasyEDA ปัจจุบันก่อนวาง PCB |
| [`KICAD_GUIDE_TH.md`](KICAD_GUIDE_TH.md) | สร้าง/วาง/ลาก/ตรวจบอร์ดด้วย KiCad |
| [`LEARN_PCB_TH.md`](LEARN_PCB_TH.md) | เรียนรู้เหตุผลของวงจรและหลักออกแบบ PCB |

## ภาพอ้างอิงปัจจุบัน

- [`diagrams/current/Schematic_Security_Door_Lock_PCB_2026-09-16.svg`](diagrams/current/Schematic_Security_Door_Lock_PCB_2026-09-16.svg)
- [`diagrams/current/EASYEDA_PCB_PLACEMENT_ROUTING_GUIDE.svg`](diagrams/current/EASYEDA_PCB_PLACEMENT_ROUTING_GUIDE.svg)

ภาพ placement เป็นแนวทางจัดวาง ไม่ใช่ไฟล์ทองแดงพร้อมกัด ต้องวัด footprint จริงและรัน DRC ก่อนผลิต

## โครงสร้าง KiCad เก่า

ไฟล์ทั้งหมดถูกรวมไว้ใต้ `legacy/` เพื่อไม่ให้สับสนกับแบบปัจจุบัน

| โฟลเดอร์ | สถานะ |
|---|---|
| `legacy/mainboard-min/` | LEGACY — แบบฝึกยังไม่ route |
| `legacy/mainboard-min-routed/` | LEGACY — บอร์ด 2 ชั้นที่ route แล้ว |
| `legacy/mainboard-min-handmade/` | LEGACY — บอร์ดกัดมือหน้าเดียว |
| `legacy/mainboard-2layer/` | LEGACY — สถาปัตยกรรมบอร์ดรุ่นเก่าอีกชุด |
| `tools/check_board.py` | ตัวตรวจบอร์ดหลังแก้ด้วยตนเอง |

เก็บเฉพาะ source ที่จำเป็นสำหรับเปิด/ศึกษาไฟล์เดิม ส่วน preview, cache, report และ fabrication output ที่สร้างใหม่ได้ถูกนำออกแล้ว

## สเปกย่อของบอร์ดปัจจุบัน

- RFID IN: SS5, RST4, SCK18, MISO19, MOSI23
- RFID OUT: SS17, RST2, SCK14, MISO35, MOSI13
- Relay IN: GPIO25
- Ultrasonic: TRIG26, ECHO ผ่าน 1 kΩ/2 kΩ เข้า GPIO27
- Buzzer module S/GND: S = GPIO33
- OLED: SDA21, SCL22 และใช้ pull-up บนโมดูล
- ESP32-CAM: ใช้ ESP-NOW; carrier board ต่อเฉพาะ 5V/GND
- งานกัดมือ: BottomLayer ชั้นเดียว ไม่มี via และใช้ insulated jumper เมื่อจำเป็น
