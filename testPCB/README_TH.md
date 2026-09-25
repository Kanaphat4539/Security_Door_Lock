# testPCB — บอร์ด Security Door Lock (door-demo01)

โฟลเดอร์นี้เก็บเฉพาะบอร์ด**ปัจจุบัน**ที่พร้อมพิมพ์/บัดกรี (ไฟล์รุ่นเก่าลบออกแล้ว)

## ไฟล์หลัก

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `PCB_demo_last_19-9.json` | ✅ **ไฟล์บอร์ดสุดท้าย** — เปิดใน EasyEDA แล้วพิมพ์ลาย |
| `PRINT_BLUEPRINT_TH.md` | คู่มือรวมฉบับย่อ: พิมพ์ + จุดระวัง + สาย Jumper + pinout |
| `PRINT_BLUEPRINT_TH.html` | คู่มือแบบพิมพ์ได้ (เปิดเบราว์เซอร์ → Ctrl+P) |
| `WIRING_SOLDER_GUIDE_TH.md` | ⭐ **คู่มือตำแหน่งต่อสายเพื่อบัดกรี** — pin/พิกัด(mm)/net ทุกขั้ว + สายจั้ม W1–W11 + ตารางวัดความต่อเนื่อง |
| `WIRING_SOLDER_GUIDE_TH.html` | เวอร์ชันพิมพ์ได้ของไฟล์ข้างบน (วางข้างบอร์ดตอนบัดกรี) |
| `WIRING_MAP_CONNECT_TH.svg` / `.png` | ⭐ **ภาพผังการต่อสาย** — ขา ESP32 ↔ ขั้วบนบอร์ด (เส้นสี = จุดที่ต้องถึงกัน) |
| `WIRING_MAP_BOARD_TH.svg` / `.png` | ⭐ **ภาพผังตำแหน่งบนบอร์ด** — ขั้ว/pin/พิกัด + สายจั้ม W1–W11 |
| `BLUEPRINT_COPPER_SIDE.svg` | ภาพด้านทองแดง (บัดกรี) พิมพ์ 1:1 |
| `BLUEPRINT_COMPONENT_SIDE.svg` | ภาพด้านอุปกรณ์ (Top) พิมพ์ 1:1 |
| `tools/gen_wiring_guide.py` | สคริปต์สร้างไฟล์คู่มือต่อสายจาก JSON ของบอร์ด (รันซ้ำได้) |
| `tools/gen_wiring_diagrams.py` | สคริปต์สร้างภาพผัง 2 แผ่น (อ่านข้อมูลจาก gen_wiring_guide.py) |

## ข้อมูลสำคัญของบอร์ดนี้

- ด้านเดียว (BottomLayer), 88 × 148 mm, ไม่มี Via
- รู Mounting 4 รู ขนาด **2.3 mm** (M2 clearance) ที่ (5.97, 5.97) · (81.97, 5.97) · (5.97, 141.97) · (81.97, 141.97)
- Clearance แก้ครบแล้ว — ไม่มีจุดต่ำกว่า 0.45 mm
- สาย Jumper 11 เส้น (W1–W11) สำหรับ RFID ฝั่งขาออก + กระจายไฟ
- ขั้วต่อทั้ง 8 ตัวเป็น JST-XH pitch 2.5 mm (8 ขา ×2, 4 ขา ×2, 3 ขา ×1, 2 ขา ×3)
- วงจรตรวจแล้วตรงกับ `full-main_test.ino`

## แก้ไฟล์บอร์ดแล้วต้องรันซ้ำ

```bash
cd testPCB
python3 tools/gen_wiring_guide.py      # สร้าง WIRING_SOLDER_GUIDE_TH.md/.html ใหม่
```
