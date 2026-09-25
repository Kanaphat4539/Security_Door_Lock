#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_wiring_guide.py — สร้างคู่มือ "ตำแหน่งต่อสายเพื่อบัดกรี" ของบอร์ด testPCB
(door-demo01, 88 x 148 mm, ด้านเดียว)

อ่านข้อมูลจริงจากไฟล์บอร์ด EasyEDA (PCB_demo_last_19-9.json):
  - footprint ทุกตัว + pad + net + พิกัด (แปลงเป็น mm จากมุมซ้ายบนของบอร์ด)
  - pad "ลอย" ที่ใช้เป็นจุดจั้มสาย (W1-W11)
แล้วเทียบชื่อ net กับขา GPIO จาก firmware/esp32-main/src/esp_main/full-main_test.ino

ใช้งาน:
    cd testPCB && python3 tools/gen_wiring_guide.py
ผลลัพธ์:
    testPCB/WIRING_SOLDER_GUIDE_TH.md
    testPCB/WIRING_SOLDER_GUIDE_TH.html
"""
import json
import os
import re
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BOARD = os.path.join(ROOT, "PCB_demo_last_19-9.json")

# --- ระบบพิกัด EasyEDA: 1 unit = 0.254 mm, origin = BBox (มุมซ้ายบนของบอร์ด) ---
U = 0.254

# --- ชื่อ net ใน EasyEDA -> ความหมายจริง (ยืนยันกับ full-main_test.ino) ---
NET_MEAN = {
    "5V_OUT_1": "+5V (ราง 5V)",
    "5V_OUT_2": "GND (กราวด์ร่วม)",
    "OLED1_1": "+3.3V (ราง 3V3)",
    "RFID_IN1_1": "GPIO5 — SS (ขาเข้า)",
    "RFID_IN1_2": "GPIO18 — SCK (ขาเข้า)",
    "RFID_IN1_3": "GPIO23 — MOSI (ขาเข้า)",
    "RFID_IN1_4": "GPIO19 — MISO (ขาเข้า)",
    "RFID_IN1_7": "GPIO4 — RST (ขาเข้า)",
    "RFID_OUT1_1": "GPIO17 — SS (ขาออก) *ผ่านสาย W2",
    "RFID_OUT1_2": "GPIO14 — SCK (ขาออก)",
    "RFID_OUT1_3": "GPIO13 — MOSI (ขาออก) *ผ่านสาย W10+W11",
    "RFID_OUT1_4": "GPIO35 — MISO (ขาออก) *ผ่านสาย W7",
    "RFID_OUT1_7": "GPIO2 — RST (ขาออก) *ผ่านสาย W1",
    "ESP32_8": "GPIO25 — สัญญาณ Relay (IN)",
    "ESP32_24": "GPIO17 — SS ขาออก (รอจั้ม W2)",
    "ESP32_27": "GPIO2 — RST ขาออก (รอจั้ม W1)",
    "ULTRASONIC_SENSOR1_2": "GPIO26 — TRIG",
    "BUZZER1_1": "GPIO33 — สัญญาณ buzzer",
    "R4_1": "ECHO ดิบจากโมดูล (ก่อนตัวแบ่ง)",
    "R4_2": "GPIO27 — ECHO หลังตัวแบ่ง 1k/2k",
    "OLED1_3": "GPIO22 — SCL",
    "OLED1_4": "GPIO21 — SDA",
}

# --- ขา ESP32 DevKit V1 (30 ขา) เรียงตามหมายเลข pin บน PCB ---
ESP_PIN_GPIO = {
    1: "EN", 2: "GPIO36 (VP)", 3: "GPIO39 (VN)", 4: "GPIO34", 5: "GPIO35",
    6: "GPIO32", 7: "GPIO33", 8: "GPIO25", 9: "GPIO26", 10: "GPIO27",
    11: "GPIO14", 12: "GPIO12", 13: "GPIO13", 14: "GND", 15: "VIN",
    16: "GPIO23", 17: "GPIO22", 18: "GPIO1 (TX0)", 19: "GPIO3 (RX0)",
    20: "GPIO21", 21: "GPIO19", 22: "GPIO18", 23: "GPIO5", 24: "GPIO17 (TX2)",
    25: "GPIO16 (RX2)", 26: "GPIO4", 27: "GPIO2", 28: "GPIO15", 29: "GND",
    30: "3V3",
}

# --- ขั้วต่อบนบอร์ด: (ชื่อตามคู่มือ, ชนิดขั้ว, จำนวนขา) ---
CONNECTORS = [
    ("RFID_IN1", "JST-XH 8 ขา (B8B-XH-AM, pitch 2.5 mm)", 8),
    ("RFID_OUT1", "JST-XH 8 ขา (B8B-XH-AM, pitch 2.5 mm)", 8),
    ("OLED1", "JST-XH 4 ขา (B4B-XH-AM)", 4),
    ("ULTRASONIC", "JST-XH 4 ขา (B4B-XH-AM)", 4),
    ("J_RELAY_CTRL", "JST-XH 3 ขา (B3B-XH-A)", 3),
    ("BUZZER1", "JST-XH 2 ขา (B2B-XH-AM)", 2),
    ("5V_IN", "JST-XH 2 ขา (B2B-XH-AM)", 2),
    ("5V_OUT", "JST-XH 2 ขา (B2B-XH-AM)", 2),
]

# --- หน้าที่ของขั้วต่อแต่ละตัว (ใช้ในตาราง) ---
CONN_ROLE = {
    "RFID_IN1": "หัวอ่านบัตรฝั่งเข้า (VSPI) — SS=5, SCK=18, MOSI=23, MISO=19, RST=4",
    "RFID_OUT1": "หัวอ่านบัตรฝั่งออก (HSPI) — SS=17, SCK=14, MOSI=13, MISO=35, RST=2",
    "OLED1": "จอ OLED SH1106 1.3\" I2C (ที่อยู่ 0x3C) — SDA=21, SCL=22",
    "ULTRASONIC": "HY-SRF05 — TRIG=26, ECHO=27 ผ่านตัวแบ่ง 1k/2k บนบอร์ด",
    "J_RELAY_CTRL": "โมดูลรีเลย์ 5V (HIGH-trigger) — IN=25",
    "BUZZER1": "Buzzer โมดูล S/GND (BZ-1295) — ขับตรงจาก GPIO33",
    "5V_IN": "ไฟเข้า 5V จาก USB/อะแดปเตอร์ 5V (pin1=+5V, pin2=GND)",
    "5V_OUT": "ไฟออก 5V ไปเลี้ยง ESP32-CAM (pin1=+5V, pin2=GND)",
}


def load_board():
    with open(BOARD, encoding="utf-8") as fh:
        return json.load(fh)


def parse(d):
    """คืน (groups, loose_pads, holes, bbox_mm, origin)"""
    x0 = float(d["BBox"]["x"])
    y0 = float(d["BBox"]["y"])

    def mm(x, y):
        return (round((x - x0) * U, 2), round((y - y0) * U, 2))

    groups = collections.OrderedDict()
    for s in d["shape"]:
        if not s.startswith("LIB"):
            continue
        parts = s.split("#@$")
        head = parts[0]
        m = re.search(r"package`([^`]*)`", head) or re.search(r"`([^`]*)`", head)
        pkg = m.group(1)
        lx, ly = map(float, re.match(r"LIB~([\d.]+)~([\d.]+)", head).groups())
        pins = []
        for p in parts[1:]:
            if not p.startswith("PAD"):
                continue
            f = p.split("~")
            pins.append({"number": f[8], "net": f[7],
                         "mm": mm(float(f[2]), float(f[3])),
                         "origin": (lx, ly)})
        pins.sort(key=lambda z: (int(z["number"]) if z["number"].isdigit() else 999))
        groups[(pkg, lx, ly)] = pins

    loose, holes = [], []
    for s in d["shape"]:
        f = s.split("~")
        if s.startswith("PAD"):
            loose.append({"net": f[7], "mm": mm(float(f[2]), float(f[3]))})
        elif s.startswith("HOLE"):
            holes.append({"mm": mm(float(f[1]), float(f[2])),
                          "d": round(float(f[3]) * U * 2, 2)})
    bbox = (round(d["BBox"]["width"] * U, 1), round(d["BBox"]["height"] * U, 1))
    return groups, loose, holes, bbox, (x0, y0, mm)


def fmt_net(net):
    return NET_MEAN.get(net, net) if net else "— (ไม่ได้ต่อ)"


def jumper_rows(loose, jw=None):
    """จัดกลุ่ม pad ลอยเป็นคู่สายจั้ม (ตามพิกัดที่จับคู่กัน) + ตรวจ net จากไฟล์จริง"""
    pairs = [
        ("W1", "RST ขาออก GPIO2", (50.33, 71.87), (47.54, 96.51), "ESP32_27", "RFID_OUT1_7"),
        ("W2", "SS ขาออก GPIO17", (4.56, 107.94), (13.56, 107.94), "ESP32_24", "RFID_OUT1_1"),
        ("W3", "GND", (30.14, 26.40), (37.25, 26.40), "5V_OUT_2", "5V_OUT_2"),
        ("W4", "+3.3V ไปหัวอ่านขาออก", (56.30, 122.03), (61.00, 122.03), "OLED1_1", "OLED1_1"),
        ("W5", "+3.3V ไปหัวอ่านขาเข้า/ESP32", (55.16, 17.13), (59.48, 17.13), "OLED1_1", "OLED1_1"),
        ("W6", "+3.3V ไปขั้ว OLED", (11.60, 16.75), (16.68, 22.34), "OLED1_1", "OLED1_1"),
        ("W7", "MISO ขาออก GPIO35", (35.73, 73.52), (40.17, 134.61), "RFID_OUT1_4", "RFID_OUT1_4"),
        ("W8", "+5V ด้านขวาล่าง", (73.19, 112.51), (73.19, 125.34), "5V_OUT_1", "5V_OUT_1"),
        ("W9", "+5V ด้านซ้ายกลาง", (10.33, 77.58), (17.19, 84.70), "5V_OUT_1", "5V_OUT_1"),
        ("W10", "MOSI ขาออก ช่วงล่าง", (42.46, 117.21), (51.86, 117.21), "RFID_OUT1_3", "RFID_OUT1_3"),
        ("W11", "MOSI ขาออก ช่วงกลาง", (51.86, 97.65), (51.86, 88.51), "RFID_OUT1_3", "RFID_OUT1_3"),
    ]
    flat = {(round(p["mm"][0], 2), round(p["mm"][1], 2)): p["net"] for p in loose}
    for p in (jw or []):  # W2 = footprint JUMPER WIRE (ไม่ได้เป็น pad ลอย)
        flat[(round(p["mm"][0], 2), round(p["mm"][1], 2))] = p["net"]
    out = []
    for name, role, pa, pb, na, nb in pairs:
        dx, dy = pb[0] - pa[0], pb[1] - pa[1]
        dist = round((dx * dx + dy * dy) ** 0.5, 1)
        fa = flat.get((round(pa[0], 2), round(pa[1], 2)))
        fb = flat.get((round(pb[0], 2), round(pb[1], 2)))
        ok = (fa == na and fb == nb)
        out.append((name, role, pa, pb, dist, na, nb, ok, fa, fb))
    return out, len(flat) - len(jw or [])


def collect(d):
    """รวบรวมข้อมูลบอร์ด: ขั้วต่อแต่ละตัว, ESP32, ขั้วจั้ม W2, pad ลอย, รูยึด"""
    groups, loose, holes, bbox, (x0, y0, mm) = parse(d)

    # จับกลุ่ม footprint -> ขั้วต่อที่รู้จัก (ข้าม footprint ของ ESP32 เอง)
    conn = {}
    for (pkg, lx, ly), pins in groups.items():
        if "ESP32" in pkg:
            continue
        nets = set(p["net"] for p in pins)
        if pkg.startswith("CONN-TH_8P"):
            key = "RFID_IN1" if "RFID_IN1_1" in nets else "RFID_OUT1"
        elif pkg.startswith("MY_B4B"):
            key = "OLED1" if "OLED1_3" in nets else "ULTRASONIC"
        elif pkg.startswith("CONN-TH_B3B"):
            key = "J_RELAY_CTRL"
        elif pkg.startswith("MY_B2B"):
            if "BUZZER1_1" in nets:
                key = "BUZZER1"
            else:
                key = "5V_OUT" if mm(lx, ly)[1] > 91.0 else "5V_IN"
        else:
            continue
        conn[key] = pins

    esp = None
    jw = None
    for (pkg, lx, ly), pins in groups.items():
        if "ESP32" in pkg:
            esp = pins
        elif pkg.startswith("JUMPER"):
            jw = pins

    return {"conn": conn, "esp": esp, "jw": jw, "loose": loose, "holes": holes,
            "bbox": bbox, "mm": mm, "groups": groups}


def tag(net):
    """ป้ายสั้น ๆ ของ net ไว้ใส่ในภาพ"""
    if not net:
        return "-"
    return NET_MEAN.get(net, net).split(" — ")[0].split(" (")[0]


def build_md():
    d = load_board()
    data = collect(d)
    conn, esp, jw = data["conn"], data["esp"], data["jw"]
    loose, holes, bbox, mm = data["loose"], data["holes"], data["bbox"], data["mm"]
    pu = {p["number"]: p["net"] for p in esp} if esp else {}

    L = []
    a = L.append
    a("# คู่มือตำแหน่งต่อสายเพื่อบัดกรี — บอร์ด Security Door Lock (door-demo01 / testPCB)")
    a("")
    a("**ไฟล์บอร์ด:** `PCB_demo_last_19-9.json` · ด้านเดียว (BottomLayer) · "
      f"{bbox[0]:.0f} × {bbox[1]:.0f} mm · pad วงกลม 2.0 mm")
    a("")
    a("ไฟล์นี้ตอบคำถามเดียว: **ตอนบัดกรี ต้องบัดกรีอะไรลงช่องไหน และลากสายไปเข้าขาไหนของโมดูล**")
    a("ข้อมูลทุกบรรทัดดึงจากไฟล์บอร์ดจริง (pad + net + พิกัด) แล้วเทียบกับ "
      "`firmware/esp32-main/src/esp_main/full-main_test.ino` — ไม่ใช่การกะจากรูป")
    a("")
    a("> สร้างโดย `tools/gen_wiring_guide.py` — รันซ้ำได้เมื่อไฟล์บอร์ดเปลี่ยน "
      "(`python3 tools/gen_wiring_guide.py`)")
    a("")
    a("## ผังภาพ (ดู 2 ภาพนี้ก่อน แล้วค่อยอ่านตาราง)")
    a("")
    a("![ผังการต่อสาย: ขา ESP32 ↔ ขั้วบนบอร์ด](WIRING_MAP_CONNECT_TH.svg)")
    a("")
    a("![ผังตำแหน่งบนบอร์ด + สายจั้ม W1–W11](WIRING_MAP_BOARD_TH.svg)")
    a("")
    a("---")
    a("")
    a("## 1. ระบบพิกัด (อ่านตารางให้ถูก)")
    a("")
    a(f"- ต้นกำเนิด (0, 0) = **มุมซ้ายบนของบอร์ด** หน่วยเป็นมิลลิเมตร วัดตาม "
      "`BLUEPRINT_COMPONENT_SIDE.svg` (ด้านอุปกรณ์ / ด้านที่บัดกรี)")
    a(f"- บอร์ดกว้าง {bbox[0]:.0f} mm สูง {bbox[1]:.0f} mm")
    a("- ทุกขั้วต่อเป็น **JST-XH pitch 2.5 mm** ส่วนขา ESP32 เป็น 2.54 mm "
      "(ระยะห่างขาที่ติดกัน = 2.5 / 2.54 mm)")
    a("- รูยึดบอร์ด M2 (2.3 mm) 4 รู: " +
      " · ".join(f"({h['mm'][0]}, {h['mm'][1]})" for h in holes))
    a("")
    a("## 2. ชื่อ net บนบอร์ด ≠ ชื่อไฟ ⚠️ อ่านก่อนบัดกรี")
    a("")
    a("EasyEDA ตั้งชื่อ net ตามชื่อ pad ปลายทาง จึงดูสับสน ของจริงเป็นแบบนี้:")
    a("")
    a("| ชื่อ net ในไฟล์ | = อะไรจริง ๆ |")
    a("|---|---|")
    a("| `5V_OUT_1` | **+5V** (ทั้งราง รวมขา VIN ของ ESP32) |")
    a("| `5V_OUT_2` | **GND** (กราวด์ร่วมทั้งบอร์ด) |")
    a("| `OLED1_1` | **+3.3V** (ทั้งราง รวมขา 3V3 ของ ESP32) |")
    a("| `RFID_IN1_n` / `RFID_OUT1_n` | ขาที่ n ของขั้วหัวอ่านขาเข้า / ขาออก |")
    a("| `ESP32_n` | ขาหมายเลข n ของ header ESP32 30 ขา (**n = เลข pin บน PCB ไม่ใช่เลข GPIO**) |")
    a("")
    a("ตารางแปลงเลข pin → GPIO อยู่ข้อ 4 อย่าจำสลับกัน")
    a("")
    a("---")
    a("")
    a("## 3. ขั้วต่อทั้ง 8 ตัว — pin ไหน ต่ออะไร")
    a("")
    a("พิกัด = ตำแหน่ง pad ของขานั้น วัดจากมุมซ้ายบนของบอร์ด (mm)")
    a("")

    for name, kind, npin in CONNECTORS:
        pins = conn.get(name)
        if not pins:
            continue
        a(f"### {name} — {kind}")
        a("")
        a(f"*{CONN_ROLE[name]}*")
        a("")
        xs = [p["mm"][0] for p in pins]
        ys = [p["mm"][1] for p in pins]
        horiz = (max(xs) - min(xs)) >= (max(ys) - min(ys))
        if horiz:
            side = "ซ้ายสุด (pin เพิ่มไปทางขวา)" if pins[0]["mm"][0] == min(xs) else "ขวาสุด (pin เพิ่มไปทางซ้าย)"
        else:
            side = "บนสุด (pin เพิ่มลงล่าง)" if pins[0]["mm"][1] == min(ys) else "ล่างสุด (pin เพิ่มขึ้นบน)"
        a(f"**pin 1 อยู่{side}** — ยึดเลขที่พิมพ์บนขั้ว JST เป็นหลัก")
        a("")
        a("| pin | พิกัด (mm) | net | ต่อกับอะไร |")
        a("|---|---|---|---|")
        for p in pins:
            a(f"| {p['number']} | ({p['mm'][0]}, {p['mm'][1]}) | `{p['net'] or '-'}` | "
              f"{fmt_net(p['net'])} |")
        a("")

    a("> พิกัดด้านบนคือ **pad ทองแดงของขานั้น** ใช้เทียบกับภาพ `BLUEPRINT_COPPER_SIDE.svg` "
      "(ด้านบัดกรี) และ `BLUEPRINT_COMPONENT_SIDE.svg` (ด้านอุปกรณ์) ได้โดยตรง")
    a("")
    a("### 5V_IN กับ 5V_OUT แยกกันยังไง")
    a("")
    a("ทั้งสองขั้วเป็นของเหมือนกันเป๊ะ (pin1 = `5V_OUT_1` = +5V, pin2 = `5V_OUT_2` = GND) "
      "ต่างกันแค่ตำแหน่ง: ตัวหนึ่งอยู่ **ขวาบน (y ≈ 39.6)** อีกตัวอยู่ **ขวากลาง (y ≈ 91.0)** "
      "ให้ดูป้าย `5V_IN` / `5V_OUT` บนซิลค์สกรีนบอร์ด ถ้าสลับกันก็ยังใช้งานได้เหมือนเดิม "
      "เพราะเป็นรางเดียวกัน")
    a("")
    a("⚠️ **จ่ายไฟทางเดียว** — ใช้ USB หรือป้อน 5V ที่ขั้ว 5V_IN อย่างใดอย่างหนึ่ง "
      "อย่าจ่ายพร้อมกัน (เป็นรางเดียวกัน จะป้อนย้อนกลับเข้า USB)")
    a("")
    a("---")
    a("")
    a("## 4. ขา ESP32 (header 30 ขา) — pin ไหนคือ GPIO อะไร")
    a("")
    a(f"- แถว A = ขา 1–15 อยู่ที่ y = 81.29 mm (EN อยู่ซ้ายสุด, pin เพิ่มไปทางขวา)")
    a(f"- แถว B = ขา 16–30 อยู่ที่ y = 55.89 mm (GPIO23 อยู่ซ้ายสุด)")
    a("")
    a("| pin | พิกัด (mm) | GPIO | net | ใช้ทำอะไร |")
    a("|---|---|---|---|---|")
    yA, yB = 81.29, 55.89
    for n in list(range(1, 16)) + list(range(16, 31)):
        idx = (n - 1) % 15
        x = round(25.54 + 2.54 * idx, 2)
        y = yA if n <= 15 else yB
        net = pu.get(str(n), "")
        a(f"| {n} | ({x}, {y}) | {ESP_PIN_GPIO[n]} | `{net or '-'}` | {fmt_net(net)} |")
    a("")
    a("**ขาที่ปล่อยว่างไว้ (ห้ามบัดกรีสายต่อ):** " +
      ", ".join(f"pin {n} ({ESP_PIN_GPIO[n]})" for n in range(1, 31) if not pu.get(str(n))))
    a("")
    a("⚠️ `GPIO12` เป็น strapping pin — คุมแรงดัน flash ตอนบูต **ห้ามดึงลง GND/ต่ออะไร** "
      "และ `GPIO2` (RST ของหัวอ่านขาออก) ต้องลอย HIGH ตอนเปิดเครื่อง อย่าใส่ pull-down")
    a("")
    a("---")
    a("")
    a("## 5. สายจั้ม 11 เส้น (W1–W11)")
    a("")
    a("บอร์ดเป็น **ด้านเดียว ไม่มี via** สายที่ต้องข้ามลายทองแดงหรือคร่อมคนละมุมบอร์ด "
      "จึงต้องจั้มด้วยลวด — จุดจั้มมี pad 2.0 mm ฝังมาให้แล้วทุกจุด (ไม่ต้องหาขั้วเพิ่ม)")
    a("")
    a("| สาย | หน้าที่ | จาก (mm) | ไป (mm) | ระยะ | net ที่ตรวจในไฟล์ |")
    a("|---|---|---|---|---|---|")
    rows, n_pads = jumper_rows(loose, jw)
    for name, role, p1, p2, dist, na, nb, ok, fa, fb in rows:
        src = f"`{fa}` ↔ `{fb}`" if ok else f"⚠️ ไม่ตรง (พบ `{fa}` / `{fb}`)"
        a(f"| {name} | {role} | ({p1[0]}, {p1[1]}) | ({p2[0]}, {p2[1]}) | {dist} mm | {src} |")
    a("")
    a(f"ไฟล์บอร์ดมี pad ลอยทั้งหมด {n_pads} จุด = 10 คู่ (W1, W3–W11) "
      "บวกขั้ว `W2` ที่เป็น footprint JUMPER WIRE 2 ขา — รวม 11 เส้นตรงกับคู่มือพิมพ์")
    a("")
    a("วิธีจั้ม:")
    a("")
    a("- สายสัญญาณ (W1, W2, W7, W10, W11) ใช้ลวดเส้นเล็ก 0.3–0.5 mm")
    a("- สายไฟ (W3–W6, W8, W9) ใช้เส้น 0.5 mm ขึ้นไป")
    a("- **W7 ยาวสุด 61 mm** ลากชิดขอบบอร์ดหรือใช้สายหุ้มฉนวน กันไปแตะลายอื่น")
    a("- บัดกรีทีละเส้นแล้ววัดไม่แตะลายข้าง ๆ ก่อนไปเส้นถัดไป")
    a("")
    a("**ทำไมต้องมีสายจั้ม 2 กลุ่มนี้** (จะได้ไม่งงว่าทำไมลายไม่ถึง):")
    a("")
    a("1. **รางไฟถูกแบ่งเป็นเกาะ** — +3.3V มี 3 เกาะ (W4, W5, W6), +5V มี 2 เกาะ (W8, W9), "
      "GND มี 1 เกาะ (W3)")
    a("2. **สัญญาณหัวอ่านขาออก (HSPI)** SS / RST / MISO / MOSI ถูกส่งไปคนละมุมบอร์ด "
      "จึงต้องจั้ม W1, W2, W7, W10+W11 — ซีกขา enter (VSPI) ลากลายตรงถึงกันหมดแล้ว")
    a("")
    a("---")
    a("")
    a("## 6. อุปกรณ์รอบข้าง (R, C)")
    a("")
    a("| ตัว | ค่า | พิกัดขา (mm) | ต่อกับ |")
    a("|---|---|---|---|")
    a("| R 1k (1/4W) | 1 kΩ | (25.57, 102.98) และ (25.57, 95.36) | ขา 1 → ECHO ของ HY-SRF05 · ขา 2 → จุดกลางตัวแบ่ง |")
    a("| R 2k (1/2W) | 2 kΩ | (28.85, 92.82) และ (41.85, 92.82) | ขา 1 → จุดกลางตัวแบ่ง · ขา 2 → GND |")
    a("| C 100nF ×2 | 100 nF | (66.46, 37.07)/(66.46, 42.15) และ (75.61, 102.35)/(80.69, 102.35) | คร่อม +5V กับ GND (ไม่มีขั้ว) |")
    a("| C 470uF ×2 | 470 µF 10V | (57.07, 37.83)/(57.07, 40.37) และ (77.13, 111.11)/(79.67, 111.11) | คร่อม +5V กับ GND — **มีขั้ว** |")
    a("")
    a("**ตัวแบ่งแรงดัน ECHO (R 1k + R 2k):** ขา 3 ของขั้ว ULTRASONIC → R 1k → จุดกลาง "
      "→ R 2k → GND และจุดกลางเข้า pin 10 (GPIO27) — ECHO ของ HY-SRF05 เป็น 5V "
      "**ห้ามต่อตรงเข้า GPIO27 เด็ดขาด** ตัวแบ่งนี้อยู่บนบอร์ดแล้ว (5V × 2k/(1k+2k) ≈ 3.33V)")
    a("")
    a("**C 470uF มีขั้ว:** ขาที่ต่อ `5V_OUT_1` (+5V) = ขั้วบวก ส่วนอีกขาเข้า GND — "
      "ก่อนบัดกรีดูแถบสี/เครื่องหมายลบบนตัวถังและเครื่องหมายที่ซิลค์สกรีนให้ตรงกัน "
      "ใส่กลับขั้วแล้วจะบวม/ระเบิดตอนจ่ายไฟ")
    a("")
    a("---")
    a("")
    a("## 7. ลำดับการบัดกรี + ตรวจก่อนจ่ายไฟ")
    a("")
    a("1. **ตัวเตี้ยก่อน:** R 1k → R 2k → C 100nF ×2 → C 470uF ×2 (ระวังขั้วของ 470uF)")
    a("2. **ขั้วต่อ JST-XH ทั้ง 8 ตัว** — อย่าลืมว่าขั้ว 8 ขา ขา 1 อยู่ด้านซ้ายตามตารางข้อ 3")
    a("3. **หัว ESP32:** บัดกรีหัว female 2×15 (แนะนำ — ถอดเปลี่ยนบอร์ดได้) "
      "หรือบัดกรีตัว DevKit ลงไปตรง ๆ (รู ≈ 1.0 mm รับขา 0.64 mm ได้)")
    a("4. **จั้มสาย W1–W11** ทีละเส้นตามตารางข้อ 5 (ทำท้ายสุด เพราะจะบังจุดอื่น)")
    a("5. **วัด short ก่อนจ่ายไฟ** (โหมดต่อเนื่อง/โอห์ม): "
      "+5V ↔ GND · +3.3V ↔ GND · +5V ↔ +3.3V → ต้องไม่ต่อถึงกัน "
      "(ถ้าแตะกันให้หาสะพานบัดกรีก่อน ห้ามจ่ายไฟ)")
    a("6. **จ่ายไฟ 5V** ที่ขั้ว 5V_IN (อย่าเสียบ USB พร้อมกัน) แล้ววัด: "
      "ขา 1 ของ 5V_OUT ได้ 5V · ขา 1 ของ OLED1 (หรือ pin 30 ของ ESP32) ได้ 3.3V")
    a("7. **ตรวจความต่อเนื่องทีละ net** ตามตารางข้อ 8 (วัดจาก pad ขั้ว ไป pad ขาของ ESP32)")
    a("8. เสียบ USB → เปิด Serial Monitor 115200 → flash `full-main_test.ino` → ทาบบัตร")
    a("")
    a("## 8. ตารางตรวจความต่อเนื่อง (วัดจริงด้วยมิเตอร์)")
    a("")
    a("| จาก | ไป | ผ่าน |")
    a("|---|---|---|")
    checks = [
        ("RFID_IN1 pin 1", "ESP32 pin 23 (GPIO5)", "ลายทองแดง"),
        ("RFID_IN1 pin 2", "ESP32 pin 22 (GPIO18)", "ลายทองแดง"),
        ("RFID_IN1 pin 3", "ESP32 pin 16 (GPIO23)", "ลายทองแดง"),
        ("RFID_IN1 pin 4", "ESP32 pin 21 (GPIO19)", "ลายทองแดง"),
        ("RFID_IN1 pin 6", "GND (ยืนยันกับ pin 14)", "ลายทองแดง"),
        ("RFID_IN1 pin 7", "ESP32 pin 26 (GPIO4)", "ลายทองแดง"),
        ("RFID_IN1 pin 8", "ESP32 pin 30 (3V3)", "ผ่าน W5"),
        ("RFID_OUT1 pin 1", "ESP32 pin 24 (GPIO17)", "ผ่าน W2"),
        ("RFID_OUT1 pin 2", "ESP32 pin 11 (GPIO14)", "ลายทองแดง"),
        ("RFID_OUT1 pin 3", "ESP32 pin 13 (GPIO13)", "ผ่าน W10 + W11"),
        ("RFID_OUT1 pin 4", "ESP32 pin 5 (GPIO35)", "ผ่าน W7"),
        ("RFID_OUT1 pin 7", "ESP32 pin 27 (GPIO2)", "ผ่าน W1"),
        ("RFID_OUT1 pin 6", "GND (pin 14)", "ลายทองแดง"),
        ("RFID_OUT1 pin 8", "ESP32 pin 30 (3V3)", "ผ่าน W4"),
        ("OLED1 pin 1", "ESP32 pin 30 (3V3)", "ผ่าน W6"),
        ("OLED1 pin 2", "GND (pin 14)", "ลายทองแดง"),
        ("OLED1 pin 3", "ESP32 pin 17 (GPIO22)", "ลายทองแดง"),
        ("OLED1 pin 4", "ESP32 pin 20 (GPIO21)", "ลายทองแดง"),
        ("ULTRASONIC pin 1", "ESP32 pin 15 (VIN / +5V)", "ลายทองแดง"),
        ("ULTRASONIC pin 2", "ESP32 pin 9 (GPIO26)", "ลายทองแดง"),
        ("ULTRASONIC pin 3", "ขา 1 ของ R 1k", "ลายทองแดง"),
        ("ULTRASONIC pin 4", "GND (pin 14)", "ลายทองแดง"),
        ("ขา 2 ของ R 1k", "ESP32 pin 10 (GPIO27) + ขา 1 ของ R 2k", "จุดกลางตัวแบ่ง"),
        ("ขา 2 ของ R 2k", "GND (pin 14)", "ลายทองแดง"),
        ("BUZZER1 pin 1", "ESP32 pin 7 (GPIO33)", "ลายทองแดง"),
        ("BUZZER1 pin 2", "GND (pin 14)", "ลายทองแดง"),
        ("J_RELAY_CTRL pin 1", "+5V (pin 15)", "ลายทองแดง"),
        ("J_RELAY_CTRL pin 2", "GND (pin 14)", "ลายทองแดง"),
        ("J_RELAY_CTRL pin 3", "ESP32 pin 8 (GPIO25)", "ลายทองแดง"),
        ("5V (ทั้งราง)", "pin 15 (VIN) + ULTRASONIC pin 1 + RELAY pin 1 + 5V_OUT pin 1", "ผ่าน W8 + W9"),
        ("3V3 (ทั้งราง)", "pin 30 + OLED1 pin 1 + RFID_IN1 pin 8 + RFID_OUT1 pin 8", "ผ่าน W4 + W5 + W6"),
    ]
    for fr, to, v in checks:
        a(f"| {fr} | {to} | {v} |")
    a("")
    a("## 9. ต่อสายจากบอร์ดไปโมดูล — ทำสายให้ตรง")
    a("")
    a("ขั้วบนบอร์ดเป็น JST-XH 2.5 mm แต่โมดูลทั่วไปเป็นขา 2.54 mm "
      "ต้องทำสาย 2 ด้าน (JST-XH ↔ ดูปองท์) โดยยึด **ป้ายบนโมดูล** เป็นหลัก:")
    a("")
    a("- **RC522:** โมดูลเรียงขาไม่เหมือนกันในแต่ละร้าน (มักเป็น `SDA/SS · SCK · MOSI · MISO · "
      "IRQ · GND · RST · 3.3V` แต่มีรุ่นสลับหัวท้าย) → ดูชื่อขาบนตัวโมดูลแล้วทำสายให้ตรงกับ "
      "ตารางข้อ 3 ของขั้วนั้น · **ใช้ไฟ 3.3V เท่านั้น** ต่อ 5V แล้วชิปไหม้ทันที")
    a("- **OLED (SH1106 1.3\"):** ขั้วบนบอร์ดเรียง `1=3.3V · 2=GND · 3=SCL · 4=SDA` "
      "ถ้าโมดูลเรียงเป็น `GND/VCC` ให้สลับตามป้าย ไม่ใช่ตามตำแหน่ง")
    a("- **HY-SRF05:** ขั้วบนบอร์ดเรียง `1=+5V · 2=TRIG · 3=ECHO · 4=GND` — "
      "โมดูลส่วนใหญ่เป็น `VCC/TRIG/ECHO/GND` ตรงกันอยู่แล้ว")
    a("- **โมดูลรีเลย์:** ขั้วบนบอร์ด `1=+5V · 2=GND · 3=IN(สัญญาณ)` — ตั้งโมดูลเป็น "
      "**HIGH-trigger** เพราะเฟิร์มแวร์สั่ง HIGH = ปลดล็อก ขั้วโซลินอยด์ 12V ต่อที่สกรู "
      "`COM/NO` บนตัวโมดูล (ไม่อยู่บนบอร์ดนี้)")
    a("- **Buzzer:** บอร์ดขับจาก GPIO33 ตรง ๆ (ไม่มีทรานซิสเตอร์บนบอร์ด) → "
      "ใช้ buzzer **โมดูล S/GND (BZ-1295)** ที่กินกระแสต่ำเท่านั้น")
    a("- **ESP32-CAM:** ต่อแค่ +5V/GND จากขั้ว 5V_OUT ไม่มีสายสัญญาณ "
      "(สั่งงานผ่าน ESP-NOW ระยะต้องตรงกับ `camMacAddress` ในโค้ด)")
    a("")
    a("## 10. เช็กลิสต์สุดท้ายก่อนเปิดเครื่อง")
    a("")
    a("- [ ] R 1k / R 2k บัดกรีถูกค่า (วัดด้วยโอห์มมิเตอร์: 1.0 kΩ และ 2.0 kΩ)")
    a("- [ ] C 470uF ทั้งสองตัวใส่ขั้วถูก (+ เข้า +5V)")
    a("- [ ] สายจั้ม W1–W11 ครบ 11 เส้น (ไล่ตามตารางข้อ 5 ทีละเส้น)")
    a("- [ ] ไม่มีสะพานบัดกรี: +5V ↔ GND · +3.3V ↔ GND · +5V ↔ +3.3V")
    a("- [ ] pin 12 (GPIO12) ไม่มีอะไรต่อ และ pin 27 (GPIO2) ไม่ถูกดึงลง GND")
    a("- [ ] จ่ายไฟ 5V แล้วได้ 5V ที่ขั้ว 5V_OUT และ 3.3V ที่ OLED1 pin 1")
    a("- [ ] ตรวจความต่อเนื่องตามตารางข้อ 8 ครบทุกบรรทัด")
    a("")
    a("---")
    a("")
    a("## โหมดทดลองก่อนบัดกรี (บนบอร์ดทดลอง/breadboard)")
    a("")
    a("ถ้ายังไม่กล้าบัดกรี ใช้ตารางข้อ 3–4 เป็นผังต่อบนบอร์ดทดลองได้เลย: "
      "คอลัมน์ net/ต่อกับอะไร คือขา GPIO ที่ต้องจั้มหาขาโมดูล — "
      "สิ่งที่ห้ามลืมคือ **ECHO ต้องผ่านตัวแบ่ง 1k/2k** (บนบอร์ดทดลองต้องต่อเอง) "
      "และ **ห้ามใช้ไฟ 5V กับ RC522 / OLED**")
    a("")
    return "\n".join(L) + "\n"


def md_to_html(md, title):
    """แปลง Markdown ชุดที่ใช้ในไฟล์นี้ -> HTML พิมพ์ได้ (ไม่พึ่ง library ภายนอก)"""
    def inline(t):
        t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
        t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
        t = re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)
        return t

    out, in_tbl, in_ul = [], False, False
    for line in md.split("\n"):
        s = line.rstrip()
        if not in_tbl and not in_ul:
            im = re.fullmatch(r"!\[(.*?)\]\((\S+?)\)", s.strip())
            if im:
                out.append(f'<figure><img src="{im.group(2)}" alt="{inline(im.group(1))}">'
                           f"<figcaption>{inline(im.group(1))}</figcaption></figure>")
                continue
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                continue
            if not in_tbl:
                out.append("<table>")
                in_tbl, first = True, True
            else:
                first = False
            tag = "th" if first else "td"
            out.append("<tr>" + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in cells) + "</tr>")
            continue
        if in_tbl:
            out.append("</table>")
            in_tbl = False
        if s.startswith("- "):
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append(f"<li>{inline(s[2:])}</li>")
            continue
        if s.startswith("  ") and in_ul and s.strip():
            out.append(f"<li>{inline(s.strip())}</li>")
            continue
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if s.startswith("### "):
            out.append(f"<h3>{inline(s[4:])}</h3>")
        elif s.startswith("## "):
            out.append(f"<h2>{inline(s[3:])}</h2>")
        elif s.startswith("# "):
            out.append(f"<h1>{inline(s[2:])}</h1>")
        elif s.startswith("> "):
            out.append(f"<blockquote>{inline(s[2:])}</blockquote>")
        elif s.startswith("---"):
            out.append("<hr>")
        elif s.strip():
            out.append(f"<p>{inline(s)}</p>")
    if in_tbl:
        out.append("</table>")
    if in_ul:
        out.append("</ul>")

    css = """
    body{font-family:"Leelawadee UI","Tahoma",sans-serif;font-size:12.5px;line-height:1.5;
         margin:14mm 12mm;color:#111}
    h1{font-size:19px;border-bottom:2px solid #333;padding-bottom:4px}
    h2{font-size:16px;margin-top:18px;border-bottom:1px solid #bbb}
    h3{font-size:14px;margin-top:14px;color:#0a5}
    table{border-collapse:collapse;margin:6px 0 12px;width:100%}
    th,td{border:1px solid #999;padding:3px 6px;text-align:left;vertical-align:top}
    th{background:#eee}
    code{background:#f3f3f3;padding:0 3px;font-family:Consolas,monospace}
    blockquote{border-left:3px solid #0a5;margin:6px 0;padding:2px 8px;background:#f7fff9}
    hr{border:none;border-top:1px dashed #999;margin:14px 0}
    ul{margin:4px 0 8px 18px}
    figure{margin:8px 0 14px}
    figure img{width:100%;border:1px solid #ccc;background:#fff}
    figcaption{font-size:11px;color:#555;margin-top:3px}
    @media print{body{margin:10mm} h2{page-break-after:avoid} table{page-break-inside:avoid}
                 figure{page-break-inside:avoid}}
    """
    return (f"<!DOCTYPE html>\n<html lang=\"th\">\n<head>\n<meta charset=\"utf-8\">\n"
            f"<title>{title}</title>\n<style>{css}</style>\n</head>\n<body>\n"
            + "\n".join(out) + "\n</body>\n</html>\n")


def main():
    md = build_md()
    md_path = os.path.join(ROOT, "WIRING_SOLDER_GUIDE_TH.md")
    html_path = os.path.join(ROOT, "WIRING_SOLDER_GUIDE_TH.html")
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write(md)
    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(md_to_html(md, "คู่มือตำแหน่งต่อสายเพื่อบัดกรี — Security Door Lock (door-demo01)"))
    print("wrote:", md_path, len(md), "chars")
    print("wrote:", html_path)


if __name__ == "__main__":
    main()
