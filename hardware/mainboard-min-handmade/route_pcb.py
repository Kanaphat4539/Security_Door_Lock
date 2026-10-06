#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Places every schematic component onto the mainboard PCB with real
footprint pad geometry (extracted from the installed KiCad 10 libraries)
and routes single-sided (F.Cu only) copper for hand etching / toner
transfer.

Why single-sided has no vias: a via needs copper on both sides of the
board to be useful; this board is etched on one side only, so any two
nets that would need to cross get a 0-ohm wire-link footprint (JP*)
instead - a bare wire the builder solders across the gap by hand. This
is the standard technique for home-made single-sided boards.

GND, +3V3, +5V and +12V are flooded as copper zones instead of traced
star-style - far more forgiving to hand-etch than dozens of thin
parallel traces, and avoids most of the crossing problem before routing
even starts (signal traces then only need to dodge the *zone islands*,
not a spaghetti of individual power wires).

Run after generate_kicad.py (imports COMPS/SYMS from it without
re-running its __main__ block) - overwrites mainboard.kicad_pcb.
"""

import math
import os

import generate_kicad as gk
from generate_kicad import COMPS, SYMS, PCB_CX, PCB_CY, BOARD_W, BOARD_H, \
    BOARD_R, HOLE_X, HOLE_Y, uid, f

# ---------------------------------------------------------------------------
# Footprint pad geometry, extracted from the real .kicad_mod files under
# C:/Users/TEE/AppData/Local/Programs/KiCad/10.0/share/kicad/footprints/
# Each pad: (number, pad_type, shape, x, y, w, h, drill_or_None, pad_angle)
# x/y/w/h in mm, LOCAL to the footprint's own (0,0) before placement.
# ---------------------------------------------------------------------------

def header_pads(n):
    """1x0n THT pin header: pad1 square (pin-1 marker), rest round."""
    pads = [("1", "thru_hole", "rect", 0.0, 0.0, 1.7, 1.7, 1.0, 0)]
    for k in range(2, n + 1):
        pads.append((str(k), "thru_hole", "circle", 0.0, (k - 1) * 2.54,
                     1.7, 1.7, 1.0, 0))
    return pads


# ESP32 DevKit V1 (30-pin) socket: two 1x15 rows, 2.54mm pitch, 25.4mm
# (1 inch) between rows. Pads 1-15 left column (top->bottom), 16-30 right
# column (top->bottom). Centred on the footprint origin.
_DEVKIT_ROW_DX = 12.7          # half of 25.4mm row spacing
_DEVKIT_Y0 = -(14 * 2.54) / 2  # -17.78, top pad


def devkit_pads():
    pads = []
    for i in range(1, 16):      # left column, x = -12.7
        y = _DEVKIT_Y0 + (i - 1) * 2.54
        shape = "rect" if i == 1 else "circle"
        pads.append((str(i), "thru_hole", shape, -_DEVKIT_ROW_DX, y,
                     1.7, 1.7, 1.0, 0))
    for i in range(16, 31):     # right column, x = +12.7
        y = _DEVKIT_Y0 + (i - 16) * 2.54
        pads.append((str(i), "thru_hole", "circle", _DEVKIT_ROW_DX, y,
                     1.7, 1.7, 1.0, 0))
    return pads


# GPIO silk label for each DevKit pad (for orientation when plugging in).
DEVKIT_SILK = {
    "1": "EN", "2": "36", "3": "39", "4": "34", "5": "35", "6": "32",
    "7": "33", "8": "25", "9": "26", "10": "27", "11": "14", "12": "12",
    "13": "13", "14": "GND", "15": "VIN",
    "16": "3V3", "17": "GND", "18": "15", "19": "2", "20": "4", "21": "16",
    "22": "17", "23": "5", "24": "18", "25": "19", "26": "21", "27": "RX0",
    "28": "TX0", "29": "22", "30": "23",
}


_WROOM_PADS_RAW = [
    (1, -8.75, -8.25, 0), (2, -8.75, -6.98, 0), (3, -8.75, -5.71, 0),
    (4, -8.75, -4.44, 0), (5, -8.75, -3.17, 0), (6, -8.75, -1.9, 0),
    (7, -8.75, -0.63, 0), (8, -8.75, 0.64, 0), (9, -8.75, 1.91, 0),
    (10, -8.75, 3.18, 0), (11, -8.75, 4.45, 0), (12, -8.75, 5.72, 0),
    (13, -8.75, 6.99, 0), (14, -8.75, 8.26, 0), (15, -5.71, 9.51, 90),
    (16, -4.44, 9.51, 90), (17, -3.17, 9.51, 90), (18, -1.9, 9.51, 90),
    (19, -0.63, 9.51, 90), (20, 0.64, 9.51, 90), (21, 1.91, 9.51, 90),
    (22, 3.18, 9.51, 90), (23, 4.45, 9.51, 90), (24, 5.72, 9.51, 90),
    (25, 8.75, 8.26, 0), (26, 8.75, 6.99, 0), (27, 8.75, 5.72, 0),
    (28, 8.75, 4.45, 0), (29, 8.75, 3.18, 0), (30, 8.75, 1.91, 0),
    (31, 8.75, 0.64, 0), (32, 8.75, -0.63, 0), (33, 8.75, -1.9, 0),
    (34, 8.75, -3.17, 0), (35, 8.75, -4.44, 0), (36, 8.75, -5.71, 0),
    (37, 8.75, -6.98, 0), (38, 8.75, -8.25, 0),
]
_WROOM_PADS = [(str(n), "smd", "rect", x, y, 1.5, 0.9, None, a)
               for n, x, y, a in _WROOM_PADS_RAW]
# Pad 39 = big centre thermal/GND pad (real footprint tiles it as 22
# small rects; one representative rect is enough for routing/DRC here).
_WROOM_PADS.append(("39", "smd", "rect", -0.68, -0.91, 3.0, 3.0, None, 0))

FPGEOM = {
    gk.FP_TERM2: [
        ("1", "thru_hole", "roundrect", 0.0, 0.0, 2.6, 2.6, 1.3, 0),
        ("2", "thru_hole", "circle", 5.08, 0.0, 2.6, 2.6, 1.3, 0),
    ],
    gk.FP_DEVKIT: devkit_pads(),
    gk.FP_HDR.format(2): header_pads(2),
    gk.FP_HDR.format(3): header_pads(3),
    gk.FP_HDR.format(4): header_pads(4),
    gk.FP_HDR.format(6): header_pads(6),
    gk.FP_HDR.format(8): header_pads(8),
    gk.FP_R: [
        ("1", "smd", "roundrect", -0.9125, 0.0, 1.025, 1.4, None, 0),
        ("2", "smd", "roundrect", 0.9125, 0.0, 1.025, 1.4, None, 0),
    ],
    gk.FP_C: [
        ("1", "smd", "roundrect", -0.95, 0.0, 1.0, 1.45, None, 0),
        ("2", "smd", "roundrect", 0.95, 0.0, 1.0, 1.45, None, 0),
    ],
    gk.FP_CP: [
        ("1", "thru_hole", "roundrect", 0.0, 0.0, 1.6, 1.6, 0.8, 0),
        ("2", "thru_hole", "circle", 3.5, 0.0, 1.6, 1.6, 0.8, 0),
    ],
    gk.FP_LED: [
        ("1", "smd", "roundrect", -0.9375, 0.0, 0.975, 1.4, None, 0),
        ("2", "smd", "roundrect", 0.9375, 0.0, 0.975, 1.4, None, 0),
    ],
    gk.FP_D_SMA: [
        ("1", "smd", "roundrect", -2.0, 0.0, 2.5, 1.8, None, 0),
        ("2", "smd", "roundrect", 2.0, 0.0, 2.5, 1.8, None, 0),
    ],
    gk.FP_SOT23: [
        ("1", "smd", "roundrect", -0.9375, -0.95, 1.475, 0.6, None, 0),
        ("2", "smd", "roundrect", -0.9375, 0.95, 1.475, 0.6, None, 0),
        ("3", "smd", "roundrect", 0.9375, 0.0, 1.475, 0.6, None, 0),
    ],
    gk.FP_SOT223: [
        ("1", "smd", "roundrect", -3.15, -2.3, 2.0, 1.5, None, 0),
        ("2", "smd", "roundrect", -3.15, 0.0, 2.0, 1.5, None, 0),
        ("2", "smd", "roundrect", 3.15, 0.0, 2.0, 3.8, None, 0),
        ("3", "smd", "roundrect", -3.15, 2.3, 2.0, 1.5, None, 0),
    ],
    gk.FP_FUSE: [
        ("1", "smd", "roundrect", -2.1375, 0.0, 1.125, 3.4, None, 0),
        ("2", "smd", "roundrect", 2.1375, 0.0, 1.125, 3.4, None, 0),
    ],
    gk.FP_SW: [
        ("1", "thru_hole", "circle", 0.0, 0.0, 2.0, 2.0, 1.1, 90),
        ("1", "thru_hole", "circle", 6.5, 0.0, 2.0, 2.0, 1.1, 90),
        ("2", "thru_hole", "circle", 0.0, 4.5, 2.0, 2.0, 1.1, 90),
        ("2", "thru_hole", "circle", 6.5, 4.5, 2.0, 2.0, 1.1, 90),
    ],
    gk.FP_RELAY: [
        ("1", "thru_hole", "circle", 0.0, 0.0, 3.0, 3.0, 1.3, 90),
        ("2", "thru_hole", "circle", 1.95, 6.05, 2.5, 2.5, 1.0, 90),
        ("3", "thru_hole", "circle", 14.15, 6.05, 3.0, 3.0, 1.3, 90),
        ("4", "thru_hole", "circle", 14.2, -6.0, 3.0, 3.0, 1.3, 90),
        ("5", "thru_hole", "circle", 1.95, -5.95, 2.5, 2.5, 1.0, 90),
    ],
    gk.FP_WROOM: _WROOM_PADS,
}

# ---------------------------------------------------------------------------
# Rotation convention, empirically confirmed against kicad-cli SVG output:
# KiCad rotates a footprint's local pad coordinates by the *negative* of
# the standard CCW matrix (equivalently: standard CW rotation applied
# directly to KiCad's own x-right/y-down numbers). Verified 2025-09-13
# with a 4-pin header at (100,100,90): pad4 (local 0,7.62) rendered at
# absolute (107.62,100), matching this formula, not the plain-CCW one.
# ---------------------------------------------------------------------------

def rot_pt(lx, ly, angle_deg):
    th = math.radians(angle_deg)
    c, s = math.cos(th), math.sin(th)
    return (lx * c + ly * s, -lx * s + ly * c)


def abs_pos(x0, y0, angle_deg, lx, ly):
    dx, dy = rot_pt(lx, ly, angle_deg)
    return (x0 + dx, y0 + dy)


# ---------------------------------------------------------------------------
# Placement (absolute PCB sheet mm; PCB_CX,PCB_CY = board centre).
# Zones follow 3Dpro/FrontBox/frontbox_pcb_spec.md S5/S7 (+Y-up = smaller
# sheet-Y here, since spec's +Y/"programming wall" maps to PCB_CY - spec_y).
# Two RC522 headers (not the one the spec assumed) are placed side by
# side in the single "RC522" zone the spec reserved.
# ---------------------------------------------------------------------------

def P(dx, dy):
    """Board-centre-relative helper: dx right, dy DOWN the sheet."""
    return (PCB_CX + dx, PCB_CY + dy)


# Half-extent (mm) of each footprint's real silhouette, used only to
# space components apart with a safe margin - NOT the pad bbox alone,
# since some parts (radial caps, the relay can) are physically bigger
# than their pads suggest. Keyed by the same FP_* strings as FPGEOM.
_BODY = {
    gk.FP_R: (1.6, 1.0), gk.FP_C: (1.6, 1.0), gk.FP_LED: (1.6, 1.0),
    gk.FP_CP: (4.2, 4.2),          # 8mm-diameter can, centred on pad1
    gk.FP_D_SMA: (3.5, 1.5),
    gk.FP_SOT23: (1.8, 1.8), gk.FP_SOT223: (4.5, 3.5),
    gk.FP_FUSE: (2.9, 2.0),
    gk.FP_SW: (5.0, 5.0), gk.FP_RELAY: (10.5, 8.5),
    gk.FP_TERM2: (4.5, 3.5),
    gk.FP_HDR.format(2): (2.0, 3.0), gk.FP_HDR.format(3): (2.0, 4.5),
    gk.FP_HDR.format(4): (2.0, 6.0),
    gk.FP_HDR.format(6): (2.0, 8.5), gk.FP_HDR.format(8): (2.0, 11.0),
    gk.FP_WROOM: (10.5, 10.5),
    gk.FP_DEVKIT: (14.5, 26.5),   # DevKit board silhouette ~28 x 52 mm
}
GAP = 1.6  # mm, minimum clearance between adjacent footprint bodies


def half(ref_or_fp):
    fp = ref_or_fp if ":" in ref_or_fp else \
        next(c.footprint for c in COMPS if c.ref == ref_or_fp)
    return _BODY[fp]


def row(refs, start, dx, dy, rot=0):
    """Place refs one after another along direction (dx,dy) (need not be
    unit length - only its sign/axis matters), spacing each pair by the
    sum of their half-extents along that axis plus GAP. Returns the
    dict fragment {ref: (xy, rot)} and the point just past the last
    item (for chaining more rows)."""
    out = {}
    x, y = start
    axis = 0 if dx != 0 else 1
    prev_half = None
    for ref in refs:
        hx, hy = half(ref)
        h = hx if axis == 0 else hy
        if prev_half is not None:
            step = prev_half + GAP + h
            x += step if dx >= 0 else -step
            y += step if dy >= 0 else -step
        out[ref] = ((x, y), rot)
        prev_half = h
    return out, (x, y)


PLACEMENT = {
    # ---- top edge (+Y wall): RC522 readers ----
    "J3": (P(-31, -60), 0),   # RFID in  (1x8, extends down)
    "J4": (P(31, -60), 0),    # RFID out (1x8)

    # ---- ESP32 DevKit socket, centre (tall 2x15, USB toward -Y) ----
    "U1": (P(0, -8), 0),

    # ---- OLED + I2C pull-ups (left margin, clear of the socket) ----
    "J5": (P(-31, 8), 0), "R4": (P(-22, 4), 0), "R5": (P(-22, 11), 0),

    # ---- buzzer driver + remote header (right margin, lid ring) ----
    "R8": (P(22, -14), 0), "Q1": (P(28, -14), 0), "J9": (P(35, -15), 0),

    # ---- inter-box cable to ESP32-CAM (-Y half, left) ----
    "J7": (P(-31, 40), 0),

    # ---- HY-SRF05 (spec bottom) + echo divider ----
    "J6": (P(-8, 52), 0), "R6": (P(0, 52), 0), "R7": (P(0, 59), 0),

    # ---- power input from external converter (-Y edge, left) ----
    "J1": (P(-31, 62), 0),    # 5V / GND

    # ---- relay MODULE control cable (relay-out zone, -Y edge, +X) ----
    "J8": (P(22, 62), 0),
}


def fp_bbox(ref):
    """Real absolute axis-aligned bounding box (minx,miny,maxx,maxy) of a
    placed footprint: the union of its rotated pad rectangles, then
    expanded so it's at least as large as the _BODY silhouette (some
    parts - radial caps, the relay can - overhang their pads). Correct
    for asymmetric parts like pin headers, unlike a centre+half model."""
    (x0, y0), angle = PLACEMENT[ref]
    fp = next(c.footprint for c in COMPS if c.ref == ref)
    geom = FPGEOM[fp]
    minx = miny = 1e9
    maxx = maxy = -1e9
    for num, ptype, shape, lx, ly, w, h, drill, pa in geom:
        # pad footprint rotation can swap w/h when pad_angle is 90/270
        pw, ph = (h, w) if pa in (90, 270) else (w, h)
        for cx, cy in ((lx - pw / 2, ly - ph / 2), (lx + pw / 2, ly + ph / 2),
                       (lx - pw / 2, ly + ph / 2), (lx + pw / 2, ly - ph / 2)):
            ax, ay = abs_pos(x0, y0, angle, cx, cy)
            minx, maxx = min(minx, ax), max(maxx, ax)
            miny, maxy = min(miny, ay), max(maxy, ay)
    # widen to the body silhouette, centred on the pad-bbox centre
    bhx, bhy = _BODY[fp]
    if angle in (90, 270):
        bhx, bhy = bhy, bhx
    cx = (minx + maxx) / 2
    cy = (miny + maxy) / 2
    minx = min(minx, cx - bhx); maxx = max(maxx, cx + bhx)
    miny = min(miny, cy - bhy); maxy = max(maxy, cy + bhy)
    return minx, miny, maxx, maxy


def check_overlaps():
    """AABB overlap check over every placed pair, using real pad bboxes
    plus GAP. Returns [(refA, refB, overlap_x_mm, overlap_y_mm)]."""
    problems = []
    boxes = {r: fp_bbox(r) for r in PLACEMENT}
    refs = list(PLACEMENT)
    for i, a in enumerate(refs):
        a1x, a1y, a2x, a2y = boxes[a]
        for b in refs[i + 1:]:
            b1x, b1y, b2x, b2y = boxes[b]
            ox = min(a2x, b2x) - max(a1x, b1x) + GAP
            oy = min(a2y, b2y) - max(a1y, b1y) + GAP
            if ox > 0 and oy > 0:
                problems.append((a, b, round(ox, 2), round(oy, 2)))
    return problems


def check_edge_clearance(margin=2.0):
    """Flag any footprint whose real bbox crosses the outline (minus a
    margin) or lands inside a mounting-hole keepout ring."""
    problems = []
    for ref in PLACEMENT:
        minx, miny, maxx, maxy = fp_bbox(ref)
        if (minx < PCB_CX - BOARD_W / 2 + margin or
                maxx > PCB_CX + BOARD_W / 2 - margin or
                miny < PCB_CY - BOARD_H / 2 + margin or
                maxy > PCB_CY + BOARD_H / 2 - margin):
            problems.append((ref, "board edge"))
        for sx in (-1, 1):
            for sy in (-1, 1):
                hxp = PCB_CX + sx * HOLE_X
                hyp = PCB_CY + sy * HOLE_Y
                # 4mm keepout ring around each M2 hole
                if (minx - 2 < hxp < maxx + 2 and
                        miny - 2 < hyp < maxy + 2):
                    problems.append((ref, "mounting hole {},{}".format(
                        sx, sy)))
    return problems


def placed_refs():
    return set(PLACEMENT) | {c.ref for c in COMPS if c.footprint == ""}


def check_placement_complete():
    all_refs = {c.ref for c in COMPS}
    on_pcb = all_refs - {c.ref for c in COMPS if c.footprint == ""}
    missing = on_pcb - set(PLACEMENT)
    extra = set(PLACEMENT) - on_pcb
    return missing, extra


# ---------------------------------------------------------------------------
# Net numbering + absolute pad positions (needed for routing + emission)
# ---------------------------------------------------------------------------

def build_nets():
    """net name -> net number (1-based; 0 is reserved for 'no net')."""
    names = sorted({n for c in COMPS for n in c.nets.values()})
    return {name: i + 1 for i, name in enumerate(names)}


def build_pad_positions(net_ids):
    """net name -> list of (ref, pad_num, abs_x, abs_y) for every pin on
    that net that actually has a placed footprint (skips PWR_FLAGs)."""
    out = {name: [] for name in net_ids}
    for c in COMPS:
        if c.ref not in PLACEMENT:
            continue
        (x0, y0), angle = PLACEMENT[c.ref]
        geom = FPGEOM[c.footprint]
        by_num = {}
        for num, *_rest in geom:
            by_num.setdefault(num, geom[[g[0] for g in geom].index(num)])
        for num in {p[0] for p in geom}:
            net = c.nets.get(num)
            if net is None:
                continue
            pad = next(p for p in geom if p[0] == num)
            ax, ay = abs_pos(x0, y0, angle, pad[3], pad[4])
            out[net].append((c.ref, num, ax, ay))
    return out


# ---------------------------------------------------------------------------
# Footprint instance emission
# ---------------------------------------------------------------------------

def emit_footprint(c, net_ids):
    (x0, y0), angle = PLACEMENT[c.ref]
    geom = FPGEOM[c.footprint]
    o = []
    o.append('  (footprint "{}" (layer "F.Cu") (uuid "{}")'.format(
        c.footprint, uid("fp-" + c.ref)))
    o.append('    (at {} {} {})'.format(f(x0), f(y0), f(angle)))
    o.append('    (property "Reference" "{}" (at 0 -3 0) (layer "F.SilkS")'
             ' (uuid "{}")'.format(c.ref, uid("fpr-" + c.ref)))
    o.append('      (effects (font (size 1 1) (thickness 0.15))))')
    o.append('    (property "Value" "{}" (at 0 3 0) (layer "F.Fab")'
             ' (uuid "{}")'.format(c.value, uid("fpv-" + c.ref)))
    o.append('      (effects (font (size 1 1) (thickness 0.15))))')
    is_smd = all(p[1] != "thru_hole" for p in geom)
    o.append('    (attr {})'.format("smd" if is_smd else "through_hole"))
    for num, ptype, shape, lx, ly, w, h, drill, pad_angle in geom:
        net = c.nets.get(num)
        net_clause = ""
        if net is not None:
            net_clause = ' (net {} "{}")'.format(net_ids[net], net)
        drill_clause = " (drill {})".format(f(drill)) if drill else ""
        layers = '"*.Cu" "*.Mask"' if ptype == "thru_hole" else \
            '"F.Cu" "F.Mask" "F.Paste"'
        o.append('    (pad "{}" {} {} (at {} {} {}) (size {} {}){}'
                 ' (layers {}){})'.format(
                     num, ptype, shape, f(lx), f(ly), f(pad_angle),
                     f(w), f(h), drill_clause, layers, net_clause))
    # DevKit socket: GPIO label beside each pad + a body outline + USB
    # marker so the board can only be plugged in one way.
    if c.footprint == gk.FP_DEVKIT:
        for num, ptype, shape, lx, ly, w, h, drill, pad_angle in geom:
            lbl = DEVKIT_SILK.get(num, num)
            tx = lx - 3.2 if lx < 0 else lx + 3.2
            just = "right" if lx < 0 else "left"
            o.append('    (fp_text user "{}" (at {} {} {}) (layer "F.SilkS")'
                     ' (uuid "{}")'.format(lbl, f(tx), f(ly), f(angle),
                                           uid("dks-" + c.ref + num)))
            o.append('      (effects (font (size 0.9 0.9) (thickness 0.15))'
                     ' (justify {})))'.format(just))
        o.append('    (fp_rect (start -14 -19.3) (end 14 19.3)'
                 ' (stroke (width 0.15) (type default)) (fill no)'
                 ' (layer "F.SilkS") (uuid "{}"))'.format(uid("dkbox" + c.ref)))
        o.append('    (fp_text user "USB v" (at 0 21 {}) (layer "F.SilkS")'
                 ' (uuid "{}") (effects (font (size 1.2 1.2)'
                 ' (thickness 0.2))))'.format(f(angle), uid("dkusb" + c.ref)))
    o.append('  )')
    return "\n".join(o)


if __name__ == "__main__":
    missing, extra = check_placement_complete()
    print("placement missing:", missing if missing else "none")
    print("placement extra:", extra if extra else "none")
    net_ids = build_nets()
    print("nets:", len(net_ids))
    pads = build_pad_positions(net_ids)
    empty = [n for n, p in pads.items() if len(p) < 2]
    print("nets with <2 placed pads (expected: none):", empty)

    # --- Stage 1 output: board outline + mounting holes (reuse the
    # existing generator) + all footprints placed, no copper yet - for
    # a first visual placement sanity check before routing is added. ---
    outline_pcb = gk.emit_pcb()
    net_decls = "\n".join(
        '  (net {} "{}")'.format(nid, name)
        for name, nid in sorted(net_ids.items(), key=lambda kv: kv[1]))
    outline_pcb = outline_pcb.replace(
        '  (net 0 "")', '  (net 0 "")\n' + net_decls, 1)
    insert_at = outline_pcb.rfind(")")
    fps = "\n".join(emit_footprint(c, net_ids) for c in COMPS
                    if c.ref in PLACEMENT)
    staged = outline_pcb[:insert_at] + fps + "\n" + outline_pcb[insert_at:]
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "mainboard.kicad_pcb"), "w",
              encoding="utf-8") as fh:
        fh.write(staged)
    print("wrote mainboard.kicad_pcb (placement stage, no copper yet)")

