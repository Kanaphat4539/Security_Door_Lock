#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_board.py — ตรวจบอร์ด Security Door Lock ให้อัตโนมัติ

ใช้:
    python3 hardware/tools/check_board.py hardware/myboard
    python3 hardware/tools/check_board.py <โฟลเดอร์ที่มี .kicad_pcb>
    python3 hardware/tools/check_board.py <ไฟล์.kicad_pcb>

สิ่งที่ตรวจ:
    1. รัน ERC (kicad-cli sch erc)  → ต้องได้ 0 error
    2. รัน DRC (kicad-cli pcb drc)  → ต้องได้ 0 unconnected / 0 error
    3. เทียบการต่อทุก net กับ "เฉลย" ของโปรเจกต์ (ตาราง EXPECTED ด้านล่าง)
    4. ตรวจขา Q1 (B ต้องเป็นขา 1, E ขา 2, C ขา 3) — จุดที่ไฟล์เก่าเคยผิด
    5. ตรวจขั้ว J1, จำนวนรูยึด, ขนาดขอบบอร์ด 88x148 mm

exit code: 0 = ผ่านทั้งหมด, 1 = มีข้อที่ไม่ผ่าน
"""

import json
import os
import re
import subprocess
import sys
import tempfile

KICAD_CLI_CANDIDATES = [
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\KiCad\10.0\bin\kicad-cli.exe"),
    r"C:\Program Files\KiCad\10.0\bin\kicad-cli.exe",
    r"C:\Program Files\KiCad\9.0\bin\kicad-cli.exe",
    "kicad-cli",
]

BOARD_W, BOARD_H = 88.0, 148.0          # mm (ตามกล่อง FrontBox)
BOARD_TOL = 1.0

# --- เฉลย: net -> จุดที่ต้องต่อ (ชื่อขา DevKit ใช้เลขขา 1..30 ของบอร์ดจริง) ---
#   U1.1..U1.15  = แถวซ้าย (บน -> ล่าง)      U1.16..U1.30 = แถวขวา (บน -> ล่าง)
EXPECTED = {
    "+5V":             ["U1.15", "J1.1", "J6.1", "J7.1", "J8.1", "J9.1"],
    "+3V3":            ["U1.16", "J3.8", "J4.8", "J5.2", "R4.1", "R5.1"],
    "GND":             ["U1.14", "U1.17", "J1.2", "J3.6", "J4.6", "J5.1",
                        "J6.4", "J7.2", "J8.2", "R7.2", "Q1.2"],
    "BUZZER_CTRL":     ["U1.8", "R8.1"],
    "Q1_B":            ["R8.2", "Q1.1"],
    "BUZZ_LO":         ["Q1.3", "J9.2"],
    "RELAY_CTRL":      ["U1.9", "J8.3"],
    "US_TRIG":         ["U1.7", "J6.2"],
    "US_ECHO_5V":      ["J6.3", "R6.1"],
    "US_ECHO_3V3":     ["U1.6", "R6.2", "R7.1"],
    "OLED_SDA":        ["U1.26", "J5.4", "R4.2"],
    "OLED_SCL":        ["U1.29", "J5.3", "R5.2"],
    "CAM_RX2":         ["U1.21", "J7.4"],
    "CAM_TX2":         ["U1.22", "J7.3"],
    "RFID_ENTRY_SS":   ["U1.23", "J3.1"],
    "RFID_ENTRY_SCK":  ["U1.24", "J3.2"],
    "RFID_ENTRY_MOSI": ["U1.30", "J3.3"],
    "RFID_ENTRY_MISO": ["U1.25", "J3.4"],
    "RFID_ENTRY_RST":  ["U1.10", "J3.7"],
    "RFID_EXIT_SS":    ["U1.20", "J4.1"],
    "RFID_EXIT_SCK":   ["U1.11", "J4.2"],
    "RFID_EXIT_MOSI":  ["U1.13", "J4.3"],
    "RFID_EXIT_MISO":  ["U1.5",  "J4.4"],
    "RFID_EXIT_RST":   ["U1.19", "J4.7"],
}

REQUIRED_REFS = ["J1", "J3", "J4", "J5", "J6", "J7", "J8", "J9",
                 "R4", "R5", "R6", "R7", "R8", "Q1"]

# net ที่ยอมรับได้บน J9.1: +5V (ตามแบบ) หรือ +3V3 (ทางเลือกถ้าอยากปลอดภัยกับสเปก buzzer)
J9_ALLOWED_RAILS = ["+5V", "+3V3"]


# ----------------------------------------------------------------- helpers ---
def find_kicad_cli():
    for c in KICAD_CLI_CANDIDATES:
        if c == "kicad-cli" or os.path.exists(c):
            return c
    return None


def resolve_inputs(arg):
    """คืน (pcb_path, sch_path) จากโฟลเดอร์หรือไฟล์ที่ผู้ใช้ให้มา"""
    if os.path.isdir(arg):
        files = os.listdir(arg)
        pcb = next((f for f in sorted(files) if f.endswith(".kicad_pcb")), None)
        sch = next((f for f in sorted(files) if f.endswith(".kicad_sch")), None)
        return (os.path.join(arg, pcb) if pcb else None,
                os.path.join(arg, sch) if sch else None)
    if arg.endswith(".kicad_pcb"):
        base = arg[:-len(".kicad_pcb")]
        sch = base + ".kicad_sch"
        return arg, (sch if os.path.exists(sch) else None)
    if arg.endswith(".kicad_sch"):
        base = arg[:-len(".kicad_sch")]
        pcb = base + ".kicad_pcb"
        return (pcb if os.path.exists(pcb) else None), arg
    return None, None


def run_cli(cli, args):
    try:
        p = subprocess.run([cli] + args, capture_output=True, text=True,
                           timeout=300)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except Exception as exc:                     # pragma: no cover
        return 999, str(exc)


def parse_footprints(pcb_text):
    """คืน dict: ref -> {"fp": ชื่อ footprint, "pads": {pad_number: net_name}}"""
    out = {}
    blocks = re.split(r"\n[\t ]*\(footprint ", pcb_text)
    for b in blocks[1:]:
        m = re.search(r'\(property "Reference" "([^"]+)"', b)
        if not m:
            continue
        ref = m.group(1)
        fp = b.split('"')[1] if '"' in b else ""
        pads = {}
        # pad แต่ละตัวขึ้นต้นด้วย (pad "N" ... — ตัดเป็นก้อนแล้วหา (net N "ชื่อ") ในก้อนนั้น
        for c in re.split(r'\(pad "', b)[1:]:
            num = c.split('"')[0]
            nm = re.search(r'\(net (?:\d+ )?"([^"]*)"\)', c[:600])
            pads[num] = nm.group(1) if nm else ""
        out[ref] = {"fp": fp, "pads": pads}
    return out


def normalize_socket(fps, left_ref=None, right_ref=None):
    """คืน (mapping, note)

    mapping: {key_in_design ("REF.pad") -> key_ในเฉลย ("U1.1".."U1.30")}
    รองรับทั้งซ็อกเก็ตตัวเดียว 30 ขา และซ็อกเก็ต 2 ตัว แถวละ 15 ขา
    """
    mapping, note = {}, ""
    single = [r for r, v in fps.items()
              if len(v["pads"]) == 30 and "MountingHole" not in v["fp"]]
    if len(single) == 1:
        ref = single[0]
        mapping = {"{}.{}".format(ref, p): "U1.{}".format(p)
                   for p in fps[ref]["pads"]}
        note = "พบซ็อกเก็ต 30 ขา 1 ตัว ({} = U1)".format(ref)
        return mapping, note

    sockets = [r for r, v in fps.items()
               if len(v["pads"]) == 15 and "Socket" in v["fp"].replace("_", "")]
    if left_ref:
        sockets = [r for r in sockets if r != left_ref] + [left_ref]
    if len(sockets) >= 2:
        left = left_ref or sockets[0]
        right = right_ref or next(r for r in sockets if r != left)
        for p in fps[left]["pads"]:
            mapping["{}.{}".format(left, p)] = "U1.{}".format(int(p))
        for p in fps[right]["pads"]:
            mapping["{}.{}".format(right, p)] = "U1.{}".format(15 + int(p))
        # ซ็อกเก็ตที่เหลือ (ถ้ามี 3 ตัว) map ตรงตัว
        for r in sockets:
            if r not in (left, right):
                for p in fps[r]["pads"]:
                    mapping["{}.{}".format(r, p)] = "U1.{}".format(p)
        note = "พบซ็อกเก็ต 2 แถว: {} = แถวซ้าย (ขา 1-15), {} = แถวขวา (ขา 16-30)".format(
            left, right)
        return mapping, note

    note = "ยังหาไม่พบซ็อกเก็ต 30 ขา / 2x15 ขา — ข้ามการเทียบขา U1"
    return mapping, note


def edge_size(pcb_text):
    """ขนาดขอบบอร์ดจาก Edge.Cuts (mm)"""
    xs, ys = [], []
    for m in re.finditer(r'\(layer "Edge\.Cuts"\)', pcb_text):
        chunk = pcb_text[max(0, m.start() - 260):m.start()]
        seg = chunk[chunk.rfind("("):]
        for c in re.finditer(r'\((?:start|end|mid|center|xy)\s+([-\d.]+)\s+([-\d.]+)\)',
                             seg):
            xs.append(float(c.group(1)))
            ys.append(float(c.group(2)))
    if not xs:
        return None, None
    return round(max(xs) - min(xs), 2), round(max(ys) - min(ys), 2)


# -------------------------------------------------------------------- main ---
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    target = sys.argv[1]

    cli = find_kicad_cli()
    pcb_path, sch_path = resolve_inputs(target)
    if not pcb_path and not sch_path:
        print("ไม่พบไฟล์ .kicad_pcb / .kicad_sch ใน: {}".format(target))
        return 1

    results = []           # (ผ่าน?, หัวข้อ, รายละเอียด)

    def add(ok, title, detail=""):
        results.append((bool(ok), title, detail))

    # ---- 1. ERC -------------------------------------------------------------
    if cli and sch_path:
        tmp = tempfile.mkdtemp(prefix="chk_")
        out = os.path.join(tmp, "erc.json")
        rc, _log = run_cli(cli, ["sch", "erc", "--format", "json",
                                 "--exit-code-violations", "--output", out, sch_path])
        try:
            d = json.load(open(out, encoding="utf-8"))
            viol = [v for s in d.get("sheets", []) for v in s.get("violations", [])]
            errs = [v for v in viol if v.get("severity") == "error"]
            warns = [v for v in viol if v.get("severity") == "warning"]
            add(len(errs) == 0, "ERC: {} error / {} warning".format(len(errs), len(warns)),
                "; ".join(sorted({v.get("type", "?") for v in errs}))[:200])
        except Exception as exc:
            add(False, "ERC: อ่านผลไม่ได้", str(exc))
    else:
        add(False, "ERC: ไม่ได้รัน", "ไม่พบ kicad-cli หรือไฟล์ .kicad_sch")

    # ---- 2. DRC -------------------------------------------------------------
    unconnected = None
    if cli and pcb_path:
        tmp = tempfile.mkdtemp(prefix="chk_")
        out = os.path.join(tmp, "drc.json")
        rc, log = run_cli(cli, ["pcb", "drc", "--format", "json", "--refill-zones",
                                "--output", out, pcb_path])
        try:
            d = json.load(open(out, encoding="utf-8"))
            viol = d.get("violations", [])
            errs = [v for v in viol if v.get("severity") == "error"]
            warns = [v for v in viol if v.get("severity") == "warning"]
            unconnected = len(d.get("unconnected_items", []))
            parity = len(d.get("schematic_parity", []))
            add(unconnected == 0 and len(errs) == 0 and parity == 0,
                "DRC: {} unconnected / {} error / {} warning / parity {}".format(
                    unconnected, len(errs), len(warns), parity),
                "; ".join(sorted({v.get("type", "?") for v in errs}))[:200])
        except Exception as exc:
            add(False, "DRC: อ่านผลไม่ได้", str(exc))
    else:
        add(False, "DRC: ไม่ได้รัน", "ไม่พบ kicad-cli หรือไฟล์ .kicad_pcb")

    # ---- 3. การต่อ net ------------------------------------------------------
    fps = {}
    if pcb_path:
        pcb_text = open(pcb_path, encoding="utf-8", errors="replace").read()
        fps = parse_footprints(pcb_text)
        mapping, note = normalize_socket(fps)
        if note:
            print("หมายเหตุ: " + note)

        by_net = {}
        for ref, v in fps.items():
            for pad, net in v["pads"].items():
                if not net:
                    continue
                key = "{}.{}".format(ref, pad)
                by_net.setdefault(net, set()).add(mapping.get(key, key))

        problems = []
        for net, want in EXPECTED.items():
            got = by_net.get(net, set())
            missing = [w for w in want if w not in got]
            if missing:
                problems.append("{}: ขาด {}".format(net, ", ".join(sorted(missing))))
            extra = sorted(x for x in got if x not in want)
            if extra:
                problems.append("{}: เกิน {}".format(net, ", ".join(extra)))
        add(not problems, "การต่อ net ตรงกับแบบ {} net".format(len(EXPECTED)),
            " | ".join(problems)[:600])

        # ---- 4. ขา Q1 (B=1, E=2, C=3) ---------------------------------------
        q = fps.get("Q1", {}).get("pads", {})
        if q:
            base_net = q.get("1", "")
            emi_net = q.get("2", "")
            col_net = q.get("3", "")
            ok = (base_net == "Q1_B" and emi_net == "GND" and col_net == "BUZZ_LO")
            add(ok, "ขา Q1: 1(B)={} 2(E)={} 3(C)={}".format(
                base_net or "-", emi_net or "-", col_net or "-"),
                "" if ok else "ต้องเป็น 1=Q1_B, 2=GND, 3=BUZZ_LO "
                              "(SOT-23 NPN: 1=B 2=E 3=C)")

        # ---- 5. ขั้ว J1 + รางไฟ buzzer ---------------------------------------
        j1 = fps.get("J1", {}).get("pads", {})
        if j1:
            ok = j1.get("1") == "+5V" and j1.get("2") == "GND"
            add(ok, "J1: 1={} 2={}".format(j1.get("1") or "-", j1.get("2") or "-"),
                "" if ok else "ต้องเป็น 1=+5V, 2=GND (ต่อกลับขั้วบอร์ดพัง)")
        j9 = fps.get("J9", {}).get("pads", {})
        if j9:
            ok = j9.get("1") in J9_ALLOWED_RAILS and j9.get("2") == "BUZZ_LO"
            add(ok, "J9 (buzzer): 1={} 2={}".format(j9.get("1") or "-",
                                                   j9.get("2") or "-"),
                "" if ok else "ต้องเป็น 1=+5V หรือ +3V3 และ 2=BUZZ_LO")

        # ---- 6. รูยึด + ขนาดบอร์ด --------------------------------------------
        holes = [r for r, v in fps.items() if "MountingHole" in v["fp"]]
        add(len(holes) >= 4, "รูยึด: พบ {} รู".format(len(holes)),
            "" if len(holes) >= 4 else "ควรมี 4 รู (มุมละ 1)")

        w, h = edge_size(pcb_text)
        if w is not None:
            ok = abs(w - BOARD_W) <= BOARD_TOL and abs(h - BOARD_H) <= BOARD_TOL
            add(ok, "ขอบบอร์ด: {:.2f} x {:.2f} mm".format(w, h),
                "" if ok else "ควรเป็น {:.0f} x {:.0f} mm".format(BOARD_W, BOARD_H))

        # ---- 7. อุปกรณ์ครบไหม -------------------------------------------------
        missing = [r for r in REQUIRED_REFS if r not in fps]
        add(not missing, "อุปกรณ์หลักครบ ({} ตัว + ซ็อกเก็ต/รูยึด)".format(
            len(REQUIRED_REFS)), "ขาด: " + ", ".join(missing) if missing else "")

    # ---------------------------------------------------------------- report --
    print()
    print("=" * 68)
    print("สรุปผลตรวจบอร์ด: {}".format(os.path.basename(pcb_path or sch_path or target)))
    print("=" * 68)
    n_fail = 0
    for ok, title, detail in results:
        mark = "PASS" if ok else "FAIL"
        if not ok:
            n_fail += 1
        print("[{}] {}".format(mark, title))
        if detail and not ok:
            print("       -> {}".format(detail))
    print("-" * 68)
    print("ผ่าน {} / {} รายการ{}".format(len(results) - n_fail, len(results),
                                        "" if n_fail == 0 else "   (ไม่ผ่าน {} รายการ)".format(n_fail)))
    return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
