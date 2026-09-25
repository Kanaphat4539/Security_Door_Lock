#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_wiring_diagrams.py — สร้าง "ภาพผังต่อสาย" ของบอร์ด testPCB 2 แผ่น

  1. WIRING_MAP_CONNECT_TH.svg  — ผังการต่อ: ขา ESP32 ↔ ขั้วบนบอร์ด (เส้นสี ตรงกันทุกเส้น)
  2. WIRING_MAP_BOARD_TH.svg    — ผังตำแหน่งบนบอร์ด: ขั้ว/pin/พิกัด + สายจั้ม W1–W11

ข้อมูลทั้งหมดดึงจาก PCB_demo_last_19-9.json ผ่าน gen_wiring_guide.py (แหล่งความจริงเดียว)

ใช้งาน:
    cd testPCB && python3 tools/gen_wiring_diagrams.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import gen_wiring_guide as g  # noqa: E402

FONT = "Leelawadee UI, Tahoma, sans-serif"
C = {
    "rail5": "#d32f2f", "rail3": "#ef6c00", "gnd": "#111111",
    "in": "#1565c0", "out": "#6a1b9a", "oled": "#00838f",
    "us": "#2e7d32", "relay": "#ad1457", "buzz": "#c07f00", "jumper": "#b00020",
}
LEGEND = [
    ("rail5", "+5V  (net 5V_OUT_1)"),
    ("gnd", "GND  (net 5V_OUT_2)"),
    ("rail3", "+3.3V  (net OLED1_1)"),
    ("in", "สัญญาณหัวอ่านขาเข้า RFID_IN1 (VSPI)"),
    ("out", "สัญญาณหัวอ่านขาออก RFID_OUT1 (HSPI)"),
    ("oled", "OLED1 (I2C)"),
    ("us", "ULTRASONIC / ตัวแบ่ง Echo"),
    ("relay", "J_RELAY_CTRL"),
    ("buzz", "BUZZER1"),
]
# ป้ายที่ทำให้สั้นลงเพื่อไม่ให้ทับกับอุปกรณ์ข้าง ๆ (เฉพาะในภาพ)
LABEL_OVERRIDE = {"R4_1": "ECHO 5V เข้าตัวแบ่ง", "R4_2": "ECHO 3.3V"}
# ขยับป้ายชื่อขั้วขึ้นเป็นพิเศษเมื่อชื่อยาวชนกับขั้วข้าง ๆ (หน่วย px)
NAME_DY = {"J_RELAY_CTRL": -12}
# ขั้วที่ต้องสลับข้างป้าย (เลข pin อยู่ขวา, ป้าย net อยู่ซ้าย) เพราะมีขั้วอื่นชิดทางขวา
LABEL_SIDE = {"BUZZER1": "left"}


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def t(x, y, s, size=7, anchor="start", color="#111", bold=False, rot=None, op=1):
    tr = f' transform="rotate({rot} {x:.1f} {y:.1f})"' if rot is not None else ""
    b = ' font-weight="bold"' if bold else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}"'
            f' text-anchor="{anchor}" font-family="{FONT}"{b}{tr} opacity="{op}">'
            f'{esc(s)}</text>')


def ln(x1, y1, x2, y2, color, w=1, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{color}" stroke-width="{w}"{d} stroke-linecap="round"/>')


def box(x, y, w, h, fill="none", stroke="#333", sw=1, rx=0, op=1):
    return (f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" rx="{rx}" opacity="{op}"/>')


def dot(cx, cy, r, fill="#333", stroke="none", sw=0):
    return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"/>')


def group_of(net):
    if net == "5V_OUT_1":
        return "rail5"
    if net == "5V_OUT_2":
        return "gnd"
    if net == "OLED1_1":
        return "rail3"
    if net.startswith("RFID_IN1"):
        return "in"
    if net.startswith("RFID_OUT1") or net in ("ESP32_24", "ESP32_27"):
        return "out"
    if net.startswith("OLED1"):
        return "oled"
    if net in ("ULTRASONIC_SENSOR1_2", "R4_1", "R4_2"):
        return "us"
    if net == "ESP32_8":
        return "relay"
    if net == "BUZZER1_1":
        return "buzz"
    return "gnd"


def net_human(net):
    if net == "5V_OUT_1":
        return "+5V"
    if net == "5V_OUT_2":
        return "GND"
    if net == "OLED1_1":
        return "+3V3"
    m = {"ESP32": "ขา ", "RFID_IN1": "IN ขา ", "RFID_OUT1": "OUT ขา "}
    for k, v in m.items():
        if net.startswith(k):
            return v + net[len(k):]
    return net


# ---------------------------------------------------------------- แผ่น A: ผังบอร์ด
def sheet_board(data):
    K = 4.0            # px ต่อ mm
    OX, OY = 40, 86
    W, H = 780, 726
    PW = W - (OX + 352) - 24          # ความกว้างแผงคำอธิบาย
    PX = OX + 352 + 12
    s = []
    X = lambda mm: OX + mm * K     # noqa: E731
    Y = lambda mm: OY + mm * K     # noqa: E731

    s.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
             f'viewBox="0 0 {W} {H}">')
    s.append(box(0, 0, W, H, "#ffffff"))
    s.append(t(16, 30, "ผังตำแหน่งบนบอร์ด — Security Door Lock (door-demo01) 88 × 148 mm",
               size=15, bold=True))
    s.append(t(16, 48, "ด้านบัดกรี (มุมมองด้านอุปกรณ์) · พิกัด mm จากมุมซ้ายบน · "
                       "ตัวเลขในวงกลม = net/ขา, ตัวเลขเล็ก = เลข pin ของขั้ว",
               size=9, color="#444"))

    # บอร์ด + รูยึด
    s.append(box(X(0), Y(0), 88 * K, 148 * K, "#fcfdfd", "#111", 1.8, rx=4))
    for h in data["holes"]:
        s.append(dot(X(h["mm"][0]), Y(h["mm"][1]), 1.15 * K, "#ffffff", "#888", 1.2))
        s.append(dot(X(h["mm"][0]), Y(h["mm"][1]), 0.5 * K, "#bbb"))

    # ---------- ESP32 ----------
    ex1, ey1, ex2, ey2 = 23.84, 52.0, 62.8, 85.2
    s.append(box(X(ex1), Y(ey1), (ex2 - ex1) * K, (ey2 - ey1) * K, "#eceff1", "#546e7a", 1.4, rx=3))
    mid = Y((ey1 + ey2) / 2)
    s.append(t(X((ex1 + ex2) / 2), mid - 4, "ESP32 DEVKIT V1 (30 ขา)", size=11, anchor="middle", bold=True))
    s.append(t(X((ex1 + ex2) / 2), mid + 12, "แถวบน = ขา 16–30 · แถวล่าง = ขา 1–15",
               size=9, anchor="middle", color="#555"))
    s.append(t(X((ex1 + ex2) / 2), mid + 27, "เลขในวงกลมเล็ก = หมายเลขขาบนบอร์ด",
               size=8, anchor="middle", color="#78909c"))
    esp = data["esp"]
    used = []
    for p in esp:
        n = int(p["number"])
        px, py = X(p["mm"][0]), Y(p["mm"][1])
        net = p["net"]
        col = group_of(net) if net else None
        s.append(dot(px, py, 2.8, C[col] if col else "#ffffff", "#37474f", 1))
        if n <= 15:      # แถวล่าง -> เลขอยู่ด้านล่างของบอร์ดโมดูล
            s.append(t(px, py + 15, str(n), size=7.5, anchor="middle", color="#37474f", bold=True))
        else:            # แถวบน -> เลขอยู่ด้านบน
            s.append(t(px, py - 7, str(n), size=7.5, anchor="middle", color="#37474f", bold=True))
        if net:
            used.append((n, p["net"]))

    # ---------- ขั้วต่อ ----------
    PINLAB = {"RFID_IN1": "down", "RFID_OUT1": "up", "OLED1": "left", "ULTRASONIC": "left",
              "BUZZER1": "right", "J_RELAY_CTRL": "right", "5V_IN": "right", "5V_OUT": "right"}
    NAMEAT = {}  # (ไม่ใช้แล้ว — ป้ายชื่อขั้ววางเหนือ/ใต้กล่องแบบเดียวกันหมด)
    for key in ["RFID_IN1", "RFID_OUT1", "OLED1", "ULTRASONIC", "BUZZER1", "J_RELAY_CTRL",
                "5V_IN", "5V_OUT"]:
        pins = data["conn"].get(key)
        if not pins:
            continue
        xs = [p["mm"][0] for p in pins]
        ys = [p["mm"][1] for p in pins]
        mx = 1.9
        s.append(box(X(min(xs) - mx), Y(min(ys) - mx), (max(xs) - min(xs) + 2 * mx) * K,
                     (max(ys) - min(ys) + 2 * mx) * K, "#eef7ff", "#78909c", 1, rx=2))
        side = PINLAB[key]
        # ป้ายชื่อขั้ว: RFID_OUT1 ไว้ใต้กล่อง ที่เหลือไว้เหนือกล่อง (กันทับกัน)
        if key == "RFID_OUT1":
            ny = Y(max(ys) + mx) + 12
        else:
            ny = Y(min(ys) - mx) - 4
        s.append(t(X(min(xs) - mx), ny + NAME_DY.get(key, 0), key, size=9, anchor="start",
                   bold=True, color="#0d47a1"))
        for p in pins:
            px, py = X(p["mm"][0]), Y(p["mm"][1])
            net = p["net"]
            col = C[group_of(net)] if net else "#888"
            s.append(dot(px, py, 2.8, C[group_of(net)] if net else "#ffffff", "#263238", 1))
            lbl = g.tag(net)
            if net in LABEL_OVERRIDE:
                lbl = LABEL_OVERRIDE[net]
            if side in ("down", "up"):
                # ข้อความหมุนตั้ง: รวมเลข pin ไว้ในป้ายเดียว ("1 GPIO5") กันทับกัน
                ay = py + 6 if side == "down" else py - 6
                s.append(t(px + 3, ay, f"{p['number']} {lbl}", size=8,
                           anchor="end" if side == "down" else "start", rot=-90, color=col,
                           bold=True))
            else:
                # แนวตั้ง: เลข pin ด้านหนึ่ง · ป้าย net อีกด้าน (สลับข้างได้ต่อขั้ว)
                if LABEL_SIDE.get(key) == "left":
                    s.append(t(px + 7, py + 3, str(p["number"]), size=7.5, anchor="start",
                               color="#37474f", bold=True))
                    s.append(t(px - 6, py + 3, lbl, size=8, anchor="end", color=col))
                else:
                    s.append(t(px - 6, py + 3, str(p["number"]), size=7.5, anchor="end",
                               color="#37474f", bold=True))
                    s.append(t(px + 7, py + 3, lbl, size=8, anchor="start", color=col))

    # ---------- สายจั้ม ----------
    rows, _ = g.jumper_rows(data["loose"], data["jw"])
    for name, role, pa, pb, dist, na, nb, ok, fa, fb in rows:
        s.append(ln(X(pa[0]), Y(pa[1]), X(pb[0]), Y(pb[1]), C["jumper"], 3, dash="6,3"))
        mx, my = (X(pa[0]) + X(pb[0])) / 2, (Y(pa[1]) + Y(pb[1])) / 2
        # ถ้าป้ายตกในกล่อง ESP32 ให้ย้ายป้ายลงมาใต้กล่อง + ลากเส้นชี้
        mmx, mmy = (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2
        if ex1 <= mmx <= ex2 and ey1 <= mmy <= ey2:
            lx, ly = mx, Y(ey2) + 16
            s.append(ln(mx, my, lx, ly - 7, C["jumper"], 1.2, dash="3,2"))
        else:
            lx, ly = mx, my
        s.append(dot(lx, ly, 8.5, "#ffffff", C["jumper"], 1))
        s.append(t(lx, ly + 3.2, name, size=7.5, anchor="middle", bold=True, color=C["jumper"]))

    # ---------- R / C ----------
    comps = [
        ("R 1k", 25.57, 99.17, "v"), ("R 2k", 35.35, 92.82, "h"),
        ("C 100nF", 66.46, 39.61, "v"), ("C 470uF", 57.07, 39.10, "v"),
        ("C 100nF", 78.15, 102.35, "h"), ("C 470uF", 78.40, 111.11, "h"),
    ]
    for name, cx, cy, ori in comps:
        w, h = (10, 22) if ori == "v" else (22, 10)
        s.append(box(X(cx) - w / 2, Y(cy) - h / 2, w, h, "#fff8e1", "#8d6e63", 1, rx=2))
        if cx > 70:            # ตัวนี้อยู่ชิดขอบขวา -> ป้ายไว้ด้านขวา กันทับป้ายขั้ว relay
            s.append(t(X(cx) + w / 2 + 4, Y(cy) + 3, name, size=6.5, anchor="start", color="#4e342e"))
        else:
            s.append(t(X(cx), Y(cy) + 3 if ori == "v" else Y(cy) - h / 2 - 4, name, size=6.5,
                       anchor="middle", color="#4e342e"))

    # ---------- แผงคำอธิบาย ----------
    s.append(box(PX, OY, PW, 592, "#fafafa", "#999", 1, rx=3))
    y = OY + 18
    s.append(t(PX + 10, y, "คำอธิบายสี", size=10, bold=True))
    y += 14
    for k, txt in LEGEND:
        s.append(dot(PX + 16, y - 3, 5, C[k]))
        s.append(t(PX + 28, y, txt, size=7.5, color="#222"))
        y += 13
    y += 6
    s.append(ln(PX + 8, y - 8, PX + PW - 8, y - 8, "#ccc"))
    s.append(t(PX + 10, y + 4, "สายจั้ม W1–W11 (ลวดบัดกรีข้าม pad)", size=9.5, bold=True))
    y += 17
    for name, role, pa, pb, dist, na, nb, ok, fa, fb in rows:
        s.append(t(PX + 12, y, f"{name} · {role}", size=7.2, color="#222"))
        s.append(t(PX + 22, y + 9, f"{net_human(fa)}  ↔  {net_human(fb)}   ({dist} mm)",
                   size=7, color=C["jumper"]))
        y += 20
    y += 4
    s.append(ln(PX + 8, y - 8, PX + PW - 8, y - 8, "#ccc"))
    s.append(t(PX + 10, y + 4, "ขา ESP32 ที่ใช้งาน (pin = เลขบนบอร์ด)", size=9.5, bold=True))
    y += 16
    for n, net in sorted(used):
        s.append(t(PX + 12, y, f"ขา {n} = {g.ESP_PIN_GPIO[n]}", size=7, color="#37474f"))
        s.append(t(PX + PW - 14, y, g.tag(net), size=7, anchor="end", color=C[group_of(net)], bold=True))
        y += 10.5

    s.append(t(16, H - 16, "สร้างอัตโนมัติจาก PCB_demo_last_19-9.json โดย tools/gen_wiring_diagrams.py",
               size=7.5, color="#888"))
    s.append("</svg>")
    return "\n".join(s)


# ------------------------------------------------------- แผ่น B: ผังการต่อ (netlist)
def sheet_connect(data):
    W = 840
    rows_def = [
        ("RFID_IN1 — หัวอ่านบัตรขาเข้า (VSPI)", "in", [
            ("ขา 23 · GPIO5", "pin 1 · SS", ""),
            ("ขา 22 · GPIO18", "pin 2 · SCK", ""),
            ("ขา 16 · GPIO23", "pin 3 · MOSI", ""),
            ("ขา 21 · GPIO19", "pin 4 · MISO", ""),
            ("ขา 26 · GPIO4", "pin 7 · RST", ""),
            ("", "pin 6 · GND · pin 8 · +3.3V", "รางไฟ"),
        ]),
        ("RFID_OUT1 — หัวอ่านบัตรขาออก (HSPI)", "out", [
            ("ขา 24 · GPIO17", "pin 1 · SS", "ผ่านสายจั้ม W2"),
            ("ขา 11 · GPIO14", "pin 2 · SCK", ""),
            ("ขา 13 · GPIO13", "pin 3 · MOSI", "ผ่านสายจั้ม W10 + W11"),
            ("ขา 5 · GPIO35", "pin 4 · MISO", "ผ่านสายจั้ม W7"),
            ("ขา 27 · GPIO2", "pin 7 · RST", "ผ่านสายจั้ม W1"),
            ("", "pin 6 · GND · pin 8 · +3.3V", "รางไฟ (W4)"),
        ]),
        ("OLED1 — จอ OLED 1.3\" (I2C, 0x3C)", "oled", [
            ("ขา 17 · GPIO22", "pin 3 · SCL", ""),
            ("ขา 20 · GPIO21", "pin 4 · SDA", ""),
            ("", "pin 1 · +3.3V (W6) · pin 2 · GND", "รางไฟ"),
        ]),
        ("ULTRASONIC — HY-SRF05", "us", [
            ("ขา 9 · GPIO26", "pin 2 · TRIG", ""),
            ("ขา 10 · GPIO27", "pin 3 · ECHO ผ่าน R 1k/2k บนบอร์ด", "ห้ามต่อ ECHO ตรงเข้า GPIO27"),
            ("", "pin 1 · +5V · pin 4 · GND", "รางไฟ"),
        ]),
        ("J_RELAY_CTRL — โมดูลรีเลย์ 5V (HIGH-trigger)", "relay", [
            ("ขา 8 · GPIO25", "pin 3 · IN (สัญญาณ)", "HIGH = ปลดล็อก"),
            ("", "pin 1 · +5V · pin 2 · GND", "รางไฟ"),
        ]),
        ("BUZZER1 — buzzer โมดูล S/GND", "buzz", [
            ("ขา 7 · GPIO33", "pin 1 · S", "ขับตรงจาก GPIO33"),
            ("", "pin 2 · GND", "รางไฟ"),
        ]),
    ]
    rails = [
        ("rail5", "+5V", ["ขา 15 (VIN) · ULTRASONIC pin 1 · J_RELAY_CTRL pin 1 · 5V_IN pin 1",
                          "5V_OUT pin 1 (ไป ESP32-CAM) · C 100nF ×2 · C 470uF ×2",
                          "จั้มต่อเกาะไฟ: W8 (ขวาล่าง) · W9 (ซ้ายกลาง)"]),
        ("gnd", "GND", ["ขา 14 · ขา 29 · RFID_IN1 pin 6 · RFID_OUT1 pin 6 · OLED1 pin 2",
                        "ULTRASONIC pin 4 · BUZZER1 pin 2 · J_RELAY_CTRL pin 2",
                        "5V_IN pin 2 · 5V_OUT pin 2 · ขา 2 ของ R 2k · จั้ม W3"]),
        ("rail3", "+3.3V", ["ขา 30 (3V3) · OLED1 pin 1 · RFID_IN1 pin 8 · RFID_OUT1 pin 8",
                            "RC522 และ OLED ใช้ 3.3V เท่านั้น — ห้าม 5V",
                            "จั้มต่อเกาะ 3V3: W6 (ไป OLED) · W5 (ไป RFID_IN1) · W4 (ไป RFID_OUT1)"]),
    ]
    RH, GH, GAP = 19, 24, 10
    y = 118
    for title, key, items in rows_def:
        y += GH + len(items) * RH + GAP
    rails_y = y + 6
    H = rails_y + 3 * 74 + 92
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         box(0, 0, W, H, "#ffffff")]
    s.append(t(16, 30, "ผังการต่อสาย — ขา ESP32 ↔ ขั้วบนบอร์ด (ทุกเส้นคือจุดที่ต้องได้ถึงกัน)",
               size=15, bold=True))
    s.append(t(16, 48, "อ่านซ้าย = ขา ESP32 (เลข pin บนบอร์ด) · อ่านขวา = ขั้วบนบอร์ดและขาโมดูล · "
                       "เส้นสีบอกว่าต้องวัดความต่อเนื่องระหว่างคู่นี้",
               size=9, color="#444"))
    s.append(t(16, 62, "ที่มา: PCB_demo_last_19-9.json + full-main_test.ino",
               size=8, color="#888"))

    xL, xL2, xR, xR2 = 214, 250, 430, W - 20
    yy = 90
    for title, key, items in rows_def:
        s.append(box(12, yy - 4, W - 36, GH - 6, C[key], C[key], 0, rx=3, op=0.12))
        s.append(dot(22, yy + 5, 5, C[key]))
        s.append(t(34, yy + 8, title, size=10, bold=True, color="#111"))
        s.append(t(W - 26, yy + 8, f"{len(items)} ขา", size=8, anchor="end", color="#555"))
        yy += GH
        for left, right, note in items:
            s.append(t(xL, yy, left, size=8.5, anchor="end", color="#222", bold=bool(left)))
            s.append(t(xR, yy, right, size=8.5, color="#222"))
            if left:
                s.append(ln(xL2, yy - 3, xR - 8, yy - 3, C[key], 2.2))
                s.append(dot(xR - 8, yy - 3, 2.2, C[key]))
                if note:
                    s.append(t(xL2 + 4, yy - 5, note, size=7, color=C["jumper"]))
            elif note:
                s.append(t(xL, yy, note, size=7.5, anchor="end", color="#666"))
                s.append(ln(xL2, yy - 3, xL2 + 12, yy - 3, "#bbb", 1.4, dash="3,3"))
            yy += RH
        yy += GAP

    yy = rails_y
    s.append(t(16, yy - 8, "รางไฟ 3 เส้น — ทุกจุดในรายการนี้ต้องต่อถึงกัน (วัดด้วยมิเตอร์)", size=11, bold=True))
    yy += 6
    for key, name, lines in rails:
        s.append(box(12, yy, W - 36, 62, "#ffffff", C[key], 1.4, rx=4))
        s.append(box(12, yy, 92, 62, C[key], C[key], 0, rx=4))
        s.append(t(28, yy + 38, name, size=13, bold=True, color="#ffffff"))
        for i, l in enumerate(lines):
            s.append(t(116, yy + 20 + i * 15, l, size=8, color="#222"))
        yy += 74

    notes = [
        "• ECHO ของ HY-SRF05 เป็น 5V — ตัวแบ่ง R 1k/2k อยู่บนบอร์ดแล้ว ห้ามลากตรงเข้า GPIO27",
        "• GPIO12 (ขา 12) ห้ามต่ออะไร · GPIO2 (ขา 27) เป็น strapping pin ต้องลอย HIGH ตอนบูต",
        "• จ่ายไฟทางเดียว: USB หรือ 5V ที่ขั้ว 5V_IN (ขั้ว 5V ทั้งสองตัวเป็นรางเดียวกัน)",
        "• ขั้วบนบอร์ดเป็น JST-XH 2.5 mm — ทำสายไปโมดูลโดยยึดป้ายชื่อขาบนโมดูล ไม่ใช่ตำแหน่ง",
    ]
    s.append(box(12, yy, W - 36, 78, "#fffde7", "#f9a825", 1.2, rx=4))
    s.append(t(24, yy + 18, "ข้อห้าม", size=10, bold=True, color="#b26a00"))
    for i, n in enumerate(notes):
        s.append(t(24, yy + 34 + i * 13, n, size=8, color="#5d4037"))
    s.append("</svg>")
    return "\n".join(s)


def main():
    d = g.load_board()
    data = g.collect(d)
    out = {
        "WIRING_MAP_BOARD_TH.svg": sheet_board(data),
        "WIRING_MAP_CONNECT_TH.svg": sheet_connect(data),
    }
    for fn, svg in out.items():
        p = os.path.join(ROOT, fn)
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(svg)
        print("wrote:", p, len(svg), "chars")


if __name__ == "__main__":
    main()
