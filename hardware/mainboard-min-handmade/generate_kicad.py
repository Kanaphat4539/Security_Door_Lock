#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Security Door Lock - Mainboard (ESP32 hub) KiCad project generator.

Emits a self-contained KiCad 8 project for the ESP32-main controller board
described in firmware/esp32-main (branch pooh):

    RFID x2 (RC522, two SPI buses), HY-SRF05 ultrasonic, SSD1306 OLED (I2C),
    active buzzer, relay -> 12V solenoid lock, UART2 link to the ESP32-CAM,
    and a programming/USB-serial header.

Mechanical envelope follows 3Dpro/FrontBox/frontbox_pcb_spec.md:
    outline <= 90 x 150 mm (we use 88 x 148), corner R3, 1.6 mm,
    4x M2 mounting holes at (+/-41.75, +/-71.75), origin = board centre.

WHY A GENERATOR (and not hand-drawn .kicad_sch):
    KiCad is not installed on the build machine, so the files can't be opened
    or ERC-checked here. The generator computes all geometry, so pin<->net
    connectivity is correct by construction. Connectivity uses GLOBAL LABELS
    placed exactly on each pin's connection point (KiCad joins global labels of
    the same name across the sheet), which removes all wire-routing guesswork.

    After generating, open in KiCad 8:
        1. Schematic: Inspect -> ERC.
        2. PCB: Tools -> Update PCB from Schematic (footprints drop in from the
           lib_ids below; the board outline + mounting holes are already placed).

Run:  python generate_kicad.py
"""

import uuid
import math

NS = uuid.UUID("6f2a1c00-0000-4000-8000-000000000000")  # stable namespace
_seen = {}


def uid(key):
    """Deterministic UUID so re-runs produce stable diffs."""
    n = _seen.get(key, 0)
    _seen[key] = n + 1
    return str(uuid.uuid5(NS, "{}:{}".format(key, n)))


PROJECT = "mainboard"
GRID = 2.54
PIN_LEN = 2.54
WIRE_LEN = 2.54


# ---------------------------------------------------------------------------
# Symbol model
# ---------------------------------------------------------------------------
# A symbol is a box with pins on its four sides. Each pin: (number, name, etype)
# grouped per side. etype in {input,output,bidirectional,passive,power_in,
# power_out,unspecified}. Geometry is derived so the generator controls both the
# pin connection point AND the label it drops there.

class SymDef:
    def __init__(self, key, left=None, right=None, top=None, bottom=None,
                 body_w=None, pin_pitch=GRID, ref_prefix="U", show_pin_names=True,
                 show_pin_numbers=True):
        self.key = key
        self.sides = {"L": left or [], "R": right or [],
                      "T": top or [], "B": bottom or []}
        self.pin_pitch = pin_pitch
        self.ref_prefix = ref_prefix
        self.show_pin_names = show_pin_names
        self.show_pin_numbers = show_pin_numbers
        n_side = max(len(self.sides["L"]), len(self.sides["R"]))
        n_tb = max(len(self.sides["T"]), len(self.sides["B"]))
        self.body_h = max(n_side + 1, 2) * pin_pitch
        if body_w is not None:
            self.body_w = body_w
        else:
            self.body_w = max(n_tb + 1, 4) * pin_pitch
        # local geometry for each pin: number -> (x, y, angle, side)
        self.pins = {}
        self._place_side("L")
        self._place_side("R")
        self._place_side("T")
        self._place_side("B")

    def _place_side(self, side):
        pins = self.sides[side]
        if not pins:
            return
        n = len(pins)
        pitch = self.pin_pitch
        half_w = self.body_w / 2.0
        half_h = self.body_h / 2.0
        span = (n - 1) * pitch
        for i, (num, name, et) in enumerate(pins):
            if side in ("L", "R"):
                y = span / 2.0 - i * pitch
                if side == "L":
                    x, ang = -half_w - PIN_LEN, 0
                else:
                    x, ang = half_w + PIN_LEN, 180
            else:
                x = -span / 2.0 + i * pitch
                if side == "T":
                    y, ang = half_h + PIN_LEN, 270
                else:
                    y, ang = -half_h - PIN_LEN, 90
            self.pins[num] = (x, y, ang, side, name, et)


def f(v):
    """Format a float the way KiCad does (trim, avoid -0)."""
    if abs(v) < 1e-9:
        v = 0.0
    s = "{:.4f}".format(v).rstrip("0").rstrip(".")
    return s if s not in ("", "-") else "0"


def sym_lib_sexpr(sd, bare=False):
    """Emit one (symbol ...) definition.

    bare=False -> "PROJECT:key" name, for the schematic's embedded
                  lib_symbols cache (what (lib_id ...) instances resolve
                  against first).
    bare=True  -> plain "key" name, for the standalone .kicad_sym library
                  file (symbol names inside a library file carry no
                  library-nickname prefix; the nickname comes from the
                  sym-lib-table entry instead).
    """
    name = sd.key if bare else "{}:{}".format(PROJECT, sd.key)
    lines = []
    lines.append('    (symbol "{}"'.format(name))
    if not sd.show_pin_numbers:
        lines.append('      (pin_numbers (hide yes))')
    if sd.show_pin_names:
        lines.append('      (pin_names (offset 0.508))')
    else:
        lines.append('      (pin_names (offset 0.508) (hide yes))')
    lines.append('      (exclude_from_sim no) (in_bom yes) (on_board yes)')
    lines.append('      (property "Reference" "{}" (at 0 {} 0)'.format(
        sd.ref_prefix, f(sd.body_h / 2.0 + 2.54)))
    lines.append('        (effects (font (size 1.27 1.27))))')
    lines.append('      (property "Value" "{}" (at 0 {} 0)'.format(
        sd.key, f(-sd.body_h / 2.0 - 2.54)))
    lines.append('        (effects (font (size 1.27 1.27))))')
    # body rectangle
    lines.append('      (symbol "{}_0_1"'.format(sd.key))
    lines.append('        (rectangle (start {} {}) (end {} {})'.format(
        f(-sd.body_w / 2.0), f(sd.body_h / 2.0),
        f(sd.body_w / 2.0), f(-sd.body_h / 2.0)))
    lines.append('          (stroke (width 0.254) (type default))'
                 ' (fill (type background))))')
    # pins
    lines.append('      (symbol "{}_1_1"'.format(sd.key))
    for num, (x, y, ang, side, pname, et) in sorted(
            sd.pins.items(), key=lambda kv: str(kv[0])):
        lines.append('        (pin {} line (at {} {} {}) (length {})'.format(
            et, f(x), f(y), ang, f(PIN_LEN)))
        lines.append('          (name "{}" (effects (font (size 1.27 1.27))))'
                     .format(pname))
        lines.append('          (number "{}" (effects (font (size 1.27 1.27)))))'
                     .format(num))
    lines.append('      )')
    lines.append('    )')
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Symbol library
# ---------------------------------------------------------------------------
P = "passive"

def hdr(key, pins):
    """1-column header: pins is list of (name,) -> numbered 1..n on left."""
    # body_w must be an integer multiple of 2.54 so half_w (and therefore
    # every pin's absolute x) lands on the 1.27mm schematic connection grid.
    left = [(str(i + 1), nm, P) for i, nm in enumerate(pins)]
    return SymDef(key, left=left, ref_prefix="J", body_w=5.08,
                  show_pin_numbers=True)


SYMS = {}

def add(sd):
    SYMS[sd.key] = sd
    return sd


# Passives / discretes (2-pin, vertical: pin1 top, pin2 bottom)
add(SymDef("R", top=[("1", "~", P)], bottom=[("2", "~", P)],
           body_w=2.54, ref_prefix="R", show_pin_names=False))
add(SymDef("C", top=[("1", "~", P)], bottom=[("2", "~", P)],
           body_w=2.54, ref_prefix="C", show_pin_names=False))
add(SymDef("CP", top=[("1", "+", P)], bottom=[("2", "-", P)],
           body_w=2.54, ref_prefix="C", show_pin_names=False))
add(SymDef("LED", top=[("1", "A", P)], bottom=[("2", "K", P)],
           body_w=2.54, ref_prefix="D", show_pin_names=False))
add(SymDef("D", top=[("1", "A", P)], bottom=[("2", "K", P)],
           body_w=2.54, ref_prefix="D", show_pin_names=False))
add(SymDef("TVS", top=[("1", "A", P)], bottom=[("2", "K", P)],
           body_w=2.54, ref_prefix="D", show_pin_names=False))
add(SymDef("FUSE", top=[("1", "1", P)], bottom=[("2", "2", P)],
           body_w=2.54, ref_prefix="F", show_pin_names=False))
add(SymDef("SW", left=[("1", "1", P)], right=[("2", "2", P)],
           body_w=5.08, ref_prefix="SW", show_pin_names=False))
add(SymDef("BUZZER", top=[("1", "+", P)], bottom=[("2", "-", P)],
           body_w=5.08, ref_prefix="BZ", show_pin_names=False))

# NPN transistor: B left, C top, E bottom
add(SymDef("NPN", left=[("2", "B", P)], top=[("1", "C", P)],
           bottom=[("3", "E", P)], body_w=5.08, ref_prefix="Q"))

# AMS1117-3.3 (SOT-223): 1=GND, 2=VOUT, 3=VIN
add(SymDef("LDO", left=[("3", "VIN", "power_in")],
           right=[("2", "VOUT", "power_out")],
           bottom=[("1", "GND", "power_in")],
           body_w=15.24, ref_prefix="U"))

# Buck module (4-pad breakout): 1=VIN 2=GND 3=VOUT 4=GND
add(SymDef("BUCK", left=[("1", "VIN", "power_in"), ("2", "GND", "power_in")],
           right=[("3", "VOUT", "power_out"), ("4", "GND", "power_in")],
           body_w=17.78, ref_prefix="U"))

# Relay SPDT (Form C): 1,2 coil ; 3 COM ; 4 NO ; 5 NC
add(SymDef("RELAY", left=[("1", "COIL+", P), ("2", "COIL-", P)],
           right=[("3", "COM", P), ("4", "NO", P), ("5", "NC", P)],
           body_w=15.24, ref_prefix="K"))

# PWR_FLAG - single power_out pin, tells ERC a net is externally driven
add(SymDef("PWR_FLAG", bottom=[("1", "pwr", "power_out")], body_w=2.54,
           ref_prefix="#FLG", show_pin_names=False, show_pin_numbers=False))

# Headers
add(hdr("TERM2", ["1", "2"]))
add(hdr("HDR2", ["1", "2"]))
add(hdr("HDR3", ["1", "2", "3"]))
add(hdr("HDR4", ["1", "2", "3", "4"]))
add(hdr("HDR6", ["1", "2", "3", "4", "5", "6"]))
add(hdr("HDR8", ["1", "2", "3", "4", "5", "6", "7", "8"]))

# ESP32-WROOM-32 (38-pad module). Left = pads 1..19, right = pads 38..20.
_WROOM_L = [
    ("1", "GND", "power_in"), ("2", "3V3", "power_in"), ("3", "EN", "input"),
    ("4", "IO36", "input"), ("5", "IO39", "input"), ("6", "IO34", "input"),
    ("7", "IO35", "input"), ("8", "IO32", "bidirectional"),
    ("9", "IO33", "bidirectional"), ("10", "IO25", "bidirectional"),
    ("11", "IO26", "bidirectional"), ("12", "IO27", "bidirectional"),
    ("13", "IO14", "bidirectional"), ("14", "IO12", "bidirectional"),
    ("15", "GND", "power_in"), ("16", "IO13", "bidirectional"),
    ("17", "IO9", "bidirectional"), ("18", "IO10", "bidirectional"),
    ("19", "IO11", "bidirectional"),
]
_WROOM_R = [
    ("38", "GND", "power_in"), ("37", "GND", "power_in"),
    ("36", "IO23", "bidirectional"), ("35", "IO22", "bidirectional"),
    ("34", "TXD0", "output"), ("33", "RXD0", "input"),
    ("32", "IO21", "bidirectional"), ("31", "IO19", "bidirectional"),
    ("30", "IO18", "bidirectional"), ("29", "IO5", "bidirectional"),
    ("28", "IO17", "bidirectional"), ("27", "IO16", "bidirectional"),
    ("26", "IO4", "bidirectional"), ("25", "IO0", "bidirectional"),
    ("24", "IO2", "bidirectional"), ("23", "IO15", "bidirectional"),
    ("22", "IO8", "bidirectional"), ("21", "IO7", "bidirectional"),
    ("20", "IO6", "bidirectional"),
]
_WROOM_B = [("39", "EP", "power_in")]  # central thermal pad = GND
add(SymDef("ESP32WROOM", left=_WROOM_L, right=_WROOM_R, bottom=_WROOM_B,
           body_w=27.94, ref_prefix="U"))

# ---- ESP32 DevKit V1 (DOIT, 30-pin) plug-in module socket ----
# Pad order matches the RandomNerd DOIT V1 30-pin reference:
#   left  (pads 1-15, top->bottom): EN 36 39 34 35 32 33 25 26 27 14 12 13 GND VIN
#   right (pads 16-30, top->bottom): 3V3 GND 15 2 4 16 17 5 18 19 21 RX0 TX0 22 23
_DK = "bidirectional"
_DEVKIT_L = [
    ("1", "EN", "input"), ("2", "IO36", "input"), ("3", "IO39", "input"),
    ("4", "IO34", "input"), ("5", "IO35", "input"), ("6", "IO32", _DK),
    ("7", "IO33", _DK), ("8", "IO25", _DK), ("9", "IO26", _DK),
    ("10", "IO27", _DK), ("11", "IO14", _DK), ("12", "IO12", _DK),
    ("13", "IO13", _DK), ("14", "GND", "power_in"), ("15", "VIN", "power_in"),
]
_DEVKIT_R = [
    ("16", "3V3", "power_out"), ("17", "GND", "power_in"), ("18", "IO15", _DK),
    ("19", "IO2", _DK), ("20", "IO4", _DK), ("21", "IO16", _DK),
    ("22", "IO17", _DK), ("23", "IO5", _DK), ("24", "IO18", _DK),
    ("25", "IO19", _DK), ("26", "IO21", _DK), ("27", "RX0", "input"),
    ("28", "TX0", "output"), ("29", "IO22", _DK), ("30", "IO23", _DK),
]
add(SymDef("ESP32DEVKIT", left=_DEVKIT_L, right=_DEVKIT_R,
           body_w=25.4, ref_prefix="U"))


# ---------------------------------------------------------------------------
# Component instances
# ---------------------------------------------------------------------------
# Each Comp: ref, symbol key, value, footprint, (x,y), nets{pinnum: netname}
# Pins with no net entry -> emit a no_connect at the pin.

def snap127(v, grid=1.27):
    """Snap to the schematic connection grid so every pin/wire endpoint
    (already an exact multiple of 1.27mm in symbol-local space) stays on
    grid once placed at an arbitrary layout position."""
    return round(round(v / grid) * grid, 4)


class Comp:
    def __init__(self, ref, sym, value, footprint, at, nets, no_connect=None):
        self.ref = ref
        self.sym = sym
        self.value = value
        self.footprint = footprint
        self.at = (snap127(at[0]), snap127(at[1]))
        self.nets = nets
        self.no_connect = set(no_connect or [])


COMPS = []
def C_(*a, **k):
    c = Comp(*a, **k)
    COMPS.append(c)
    return c


# Footprint libs (resolve from a standard KiCad 8 install on "Update PCB")
FP_HDR = "Connector_PinHeader_2.54mm:PinHeader_1x{:02d}_P2.54mm_Vertical"
FP_TERM2 = "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-2-5.08_1x02_P5.08mm_Horizontal"
FP_R = "Resistor_SMD:R_0805_2012Metric"
FP_C = "Capacitor_SMD:C_0805_2012Metric"
FP_CP = "Capacitor_THT:CP_Radial_D8.0mm_P3.50mm"
FP_LED = "LED_SMD:LED_0805_2012Metric"
FP_D_SMA = "Diode_SMD:D_SMA"
FP_SOT23 = "Package_TO_SOT_SMD:SOT-23"
FP_SOT223 = "Package_TO_SOT_SMD:SOT-223-3_TabPin2"
FP_FUSE = "Fuse:Fuse_1812_4532Metric"
FP_SW = "Button_Switch_THT:SW_PUSH_6mm"
FP_BUZ = "Buzzer_Beeper:Buzzer_12x9.5RM7.6"
FP_RELAY = "Relay_THT:Relay_SPDT_SANYOU_SRD_Series_Form_C"
FP_WROOM = "RF_Module:ESP32-WROOM-32"
FP_DEVKIT = "Module:ESP32-DevKitV1-30P_Socket"  # custom, 2x15 female @ 25.4mm

# Grid placement columns (mm on the A3 sheet)
X = [50, 120, 190, 260, 330, 400]
def col(i):
    return X[i]


# =========================================================================
# MINIMAL BOARD (plug-in ESP32 DevKit V1). Main devices only. The ESP32
# DevKit plugs into a 2x15 socket; it carries its own USB + auto-program
# circuit, so NO programming header, boot/EN buttons, EN/IO0 pull-ups or
# extra decoupling are needed on this PCB. Power: feed 5V into the DevKit
# VIN (pad 15); its on-board regulator's 3V3 output (pad 16) powers the
# 3.3V devices (RC522 x2, OLED). No on-board power supply parts.
# =========================================================================

# --- ESP32 DevKit V1 (30-pin) socket --------------------------------------
# pad->net per DOIT V1 pinout. Unused/USB pins (EN, TX0/RX0, spare GPIOs,
# strapping GPIO12/15) left unconnected.
devkit_nets = {
    "15": "+5V",   "14": "GND",   "16": "+3V3", "17": "GND",
    "5": "RFID_EXIT_MISO", "6": "US_ECHO_3V3", "7": "US_TRIG",
    "8": "BUZZER_CTRL", "9": "RELAY_CTRL", "10": "RFID_ENTRY_RST",
    "11": "RFID_EXIT_SCK", "13": "RFID_EXIT_MOSI",
    "19": "RFID_EXIT_RST", "20": "RFID_EXIT_SS",
    "21": "CAM_RX2", "22": "CAM_TX2", "23": "RFID_ENTRY_SS",
    "24": "RFID_ENTRY_SCK", "25": "RFID_ENTRY_MISO", "26": "OLED_SDA",
    "29": "OLED_SCL", "30": "RFID_ENTRY_MOSI",
}
devkit_nc = ["1", "2", "3", "4", "12", "18", "27", "28"]  # EN,36,39,34,12,15,RX0,TX0
C_("U1", "ESP32DEVKIT", "ESP32 DevKit V1 (30p)", FP_DEVKIT, (200, 120),
   devkit_nets, no_connect=devkit_nc)

# --- Power input from external converter (5V + GND only) ------------------
# 3.3V is produced by the DevKit and taken from its 3V3 pin, so no 3V3
# input is needed here.
C_("J1", "HDR2", "PWR IN 5V/GND", FP_HDR.format(2), (col(0), 40),
   {"1": "+5V", "2": "GND"})
# ERC power flags for the two rails that enter as passive header pins.
# (+3V3 needs none - the DevKit's 3V3 pin is a power-output that drives it.)
C_("#FLG1", "PWR_FLAG", "PWR_FLAG", "", (col(0) - 15, 30), {"1": "GND"})
C_("#FLG2", "PWR_FLAG", "PWR_FLAG", "", (col(0) - 15, 60), {"1": "+5V"})

# --- RFID entry (RC522, VSPI) header --------------------------------------
# RC522 pin order: SDA(SS) SCK MOSI MISO IRQ GND RST 3.3V
C_("J3", "HDR8", "RFID IN (RC522)", FP_HDR.format(8), (col(3), 45),
   {"1": "RFID_ENTRY_SS", "2": "RFID_ENTRY_SCK", "3": "RFID_ENTRY_MOSI",
    "4": "RFID_ENTRY_MISO", "6": "GND", "7": "RFID_ENTRY_RST", "8": "+3V3"},
   no_connect=["5"])                        # IRQ unused

# --- RFID exit (RC522, HSPI) header ---------------------------------------
C_("J4", "HDR8", "RFID OUT (RC522)", FP_HDR.format(8), (col(3), 105),
   {"1": "RFID_EXIT_SS", "2": "RFID_EXIT_SCK", "3": "RFID_EXIT_MOSI",
    "4": "RFID_EXIT_MISO", "6": "GND", "7": "RFID_EXIT_RST", "8": "+3V3"},
   no_connect=["5"])

# --- OLED (I2C) header + pull-ups -----------------------------------------
C_("J5", "HDR4", "OLED SSD1306", FP_HDR.format(4), (col(3), 165),
   {"1": "GND", "2": "+3V3", "3": "OLED_SCL", "4": "OLED_SDA"})
C_("R4", "R", "4.7k", FP_R, (col(3), 200),
   {"1": "+3V3", "2": "OLED_SDA"})
C_("R5", "R", "4.7k", FP_R, (col(3), 224),
   {"1": "+3V3", "2": "OLED_SCL"})

# --- Ultrasonic HY-SRF05 header + ECHO divider ----------------------------
# VCC=5V, TRIG=3V3(direct, ESP output), ECHO=5V -> divider -> 3V3
C_("J6", "HDR4", "HY-SRF05", FP_HDR.format(4), (col(4), 45),
   {"1": "+5V", "2": "US_TRIG", "3": "US_ECHO_5V", "4": "GND"})
C_("R6", "R", "1k", FP_R, (col(4), 80),
   {"1": "US_ECHO_5V", "2": "US_ECHO_3V3"})   # top of divider
C_("R7", "R", "2k", FP_R, (col(4), 104),
   {"1": "US_ECHO_3V3", "2": "GND"})          # bottom of divider

# --- UART link to ESP32-CAM -----------------------------------------------
# 1 +5V (feed cam), 2 GND, 3 to CAM-RX (our TX2/IO17), 4 to CAM-TX (our RX2/IO16)
C_("J7", "HDR4", "to ESP32-CAM", FP_HDR.format(4), (col(4), 140),
   {"1": "+5V", "2": "GND", "3": "CAM_TX2", "4": "CAM_RX2"})

# --- Buzzer driver (buzzer itself is remote, on the lid ring per
#     frontbox_pcb_spec.md S5 - "buzzer hdr (34,0) / buzzer sits in the
#     lid ring there" - only the driver transistor lives on this PCB) ---
C_("R8", "R", "1k", FP_R, (col(4), 185),
   {"1": "BUZZER_CTRL", "2": "Q1_B"})
C_("Q1", "NPN", "S8050 / 2N2222", FP_SOT23, (col(4), 212),
   {"2": "Q1_B", "1": "BUZZ_LO", "3": "GND"})
C_("J9", "HDR2", "to Buzzer (lid ring)", FP_HDR.format(2), (col(4), 240),
   {"1": "+5V", "2": "BUZZ_LO"})

# --- Relay MODULE (has its own driver + flyback + solenoid terminals) -----
# Only a 3-wire control cable lands on this board: VCC, GND, IN.
# The 12V solenoid + supply wire straight to the relay module, off-board.
C_("J8", "HDR3", "RELAY MODULE (VCC/GND/IN)", FP_HDR.format(3), (col(5), 60),
   {"1": "+5V", "2": "GND", "3": "RELAY_CTRL"})


# ---------------------------------------------------------------------------
# Schematic emit
# ---------------------------------------------------------------------------

def transform(inst_xy, lx, ly):
    """Symbol-local (lx,ly, +Y up) -> schematic (X+lx, Y-ly)."""
    return inst_xy[0] + lx, inst_xy[1] - ly


def outward(side):
    """Schematic-space outward unit vector for a pin on the given side."""
    return {"L": (-1, 0), "R": (1, 0), "T": (0, -1), "B": (0, 1)}[side]


def label_angle(side):
    return {"L": 180, "R": 0, "T": 90, "B": 270}[side]


def emit_schematic():
    root = uid("root-sheet")
    out = []
    out.append('(kicad_sch')
    out.append('  (version 20231120)')
    out.append('  (generator "eeschema")')
    out.append('  (generator_version "8.0")')
    out.append('  (uuid "{}")'.format(root))
    out.append('  (paper "A3")')
    out.append('  (title_block')
    out.append('    (title "Security Door Lock - Mainboard (ESP32 hub)")')
    out.append('    (rev "A")')
    out.append('    (company "ProjectY3 IoT")')
    out.append('  )')

    # lib_symbols cache: only the ones we actually place
    used = sorted({c.sym for c in COMPS})
    out.append('  (lib_symbols')
    for k in used:
        out.append(sym_lib_sexpr(SYMS[k]))
    out.append('  )')

    # instances + connectivity
    for c in COMPS:
        sd = SYMS[c.sym]
        X0, Y0 = c.at
        cu = uid("sym-" + c.ref)
        is_flag = c.sym == "PWR_FLAG"
        out.append('  (symbol (lib_id "{}:{}") (at {} {} 0) (unit 1)'.format(
            PROJECT, c.sym, f(X0), f(Y0)))
        out.append('    (exclude_from_sim no) (in_bom {}) (on_board {})'
                   ' (dnp no)'.format("no" if is_flag else "yes",
                                     "no" if is_flag else "yes"))
        out.append('    (uuid "{}")'.format(cu))
        out.append('    (property "Reference" "{}" (at {} {} 0)'.format(
            c.ref, f(X0 + sd.body_w / 2.0 + 1.27), f(Y0 - sd.body_h / 2.0)))
        out.append('      (effects (font (size 1.27 1.27)) (justify left)))')
        out.append('    (property "Value" "{}" (at {} {} 0)'.format(
            c.value, f(X0 + sd.body_w / 2.0 + 1.27), f(Y0 - sd.body_h / 2.0 + 1.9)))
        out.append('      (effects (font (size 1.27 1.27)) (justify left)))')
        out.append('    (property "Footprint" "{}" (at {} {} 0)'.format(
            c.footprint, f(X0), f(Y0)))
        out.append('      (effects (font (size 1.27 1.27)) (hide yes)))')
        for num in sorted(sd.pins, key=str):
            out.append('    (pin "{}" (uuid "{}"))'.format(
                num, uid("pin-{}-{}".format(c.ref, num))))
        out.append('    (instances (project "{}"'.format(PROJECT))
        out.append('      (path "/{}" (reference "{}") (unit 1))))'.format(
            root, c.ref))
        out.append('  )')

        # wires + global labels / no-connects
        for num, (lx, ly, ang, side, pname, et) in sd.pins.items():
            px, py = transform(c.at, lx, ly)
            if num in c.no_connect:
                out.append('  (no_connect (at {} {}) (uuid "{}"))'.format(
                    f(px), f(py), uid("nc-{}-{}".format(c.ref, num))))
                continue
            net = c.nets.get(num)
            if net is None:
                out.append('  (no_connect (at {} {}) (uuid "{}"))'.format(
                    f(px), f(py), uid("nc-{}-{}".format(c.ref, num))))
                continue
            ox, oy = outward(side)
            ex, ey = px + ox * WIRE_LEN, py + oy * WIRE_LEN
            out.append('  (wire (pts (xy {} {}) (xy {} {}))'.format(
                f(px), f(py), f(ex), f(ey)))
            out.append('    (stroke (width 0) (type default)) (uuid "{}"))'
                       .format(uid("wire-{}-{}".format(c.ref, num))))
            out.append('  (global_label "{}" (shape bidirectional)'
                       ' (at {} {} {})'.format(net, f(ex), f(ey),
                                               label_angle(side)))
            out.append('    (effects (font (size 1.27 1.27)) (justify left))'
                       ' (uuid "{}"))'.format(
                           uid("lbl-{}-{}".format(c.ref, num))))

    out.append('  (sheet_instances')
    out.append('    (path "/" (page "1"))')
    out.append('  )')
    out.append(')')
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------------------
# PCB emit: outline (rounded rect) + 4 mounting holes, per frontbox_pcb_spec
# ---------------------------------------------------------------------------

BOARD_W = 88.0     # X, <= 90
BOARD_H = 148.0    # Y, <= 150
BOARD_R = 3.0      # corner radius
HOLE_X = 41.75
HOLE_Y = 71.75
# board centre placed at this page coordinate
PCB_CX, PCB_CY = 150.0, 100.0


def _arc(cx, cy, r, a0, a1):
    """Return (start, mid, end) points for an arc from a0 to a1 (deg, CCW math)."""
    def pnt(a):
        return (cx + r * math.cos(math.radians(a)),
                cy + r * math.sin(math.radians(a)))
    return pnt(a0), pnt((a0 + a1) / 2.0), pnt(a1)


def emit_pcb():
    o = []
    o.append('(kicad_pcb')
    o.append('  (version 20240108)')
    o.append('  (generator "pcbnew")')
    o.append('  (generator_version "8.0")')
    o.append('  (general (thickness 1.6) (legacy_teardrops no))')
    o.append('  (paper "A3")')
    o.append('  (layers')
    o.append('    (0 "F.Cu" signal)')
    o.append('    (31 "B.Cu" signal)')
    o.append('    (32 "B.Adhes" user "B.Adhesive")')
    o.append('    (33 "F.Adhes" user "F.Adhesive")')
    o.append('    (34 "B.Paste" user)')
    o.append('    (35 "F.Paste" user)')
    o.append('    (36 "B.SilkS" user "B.Silkscreen")')
    o.append('    (37 "F.SilkS" user "F.Silkscreen")')
    o.append('    (38 "B.Mask" user)')
    o.append('    (39 "F.Mask" user)')
    o.append('    (40 "Dwgs.User" user "User.Drawings")')
    o.append('    (41 "Cmts.User" user "User.Comments")')
    o.append('    (44 "Edge.Cuts" user)')
    o.append('    (45 "Margin" user)')
    o.append('    (49 "F.Fab" user)')
    o.append('    (48 "B.Fab" user)')
    o.append('  )')
    o.append('  (setup (pad_to_mask_clearance 0))')
    o.append('  (net 0 "")')

    def line(x1, y1, x2, y2, layer, width, tag):
        o.append('  (gr_line (start {} {}) (end {} {})'.format(
            f(x1), f(y1), f(x2), f(y2)))
        o.append('    (stroke (width {}) (type default)) (layer "{}")'
                 ' (uuid "{}"))'.format(f(width), layer, uid(tag)))

    def arc(sx, sy, mx, my, ex, ey, layer, width, tag):
        o.append('  (gr_arc (start {} {}) (mid {} {}) (end {} {})'.format(
            f(sx), f(sy), f(mx), f(my), f(ex), f(ey)))
        o.append('    (stroke (width {}) (type default)) (layer "{}")'
                 ' (uuid "{}"))'.format(f(width), layer, uid(tag)))

    # Board outline: rounded rectangle centred at (PCB_CX, PCB_CY).
    L = PCB_CX - BOARD_W / 2.0
    R = PCB_CX + BOARD_W / 2.0
    T = PCB_CY - BOARD_H / 2.0
    B = PCB_CY + BOARD_H / 2.0
    r = BOARD_R
    W = 0.1
    # straight segments (between the corner arcs)
    line(L + r, T, R - r, T, "Edge.Cuts", W, "edge-top")
    line(R, T + r, R, B - r, "Edge.Cuts", W, "edge-right")
    line(R - r, B, L + r, B, "Edge.Cuts", W, "edge-bottom")
    line(L, B - r, L, T + r, "Edge.Cuts", W, "edge-left")
    # corner arcs (KiCad Y is down; use screen-space arc points)
    arc(L + r, T, L + r - r * math.sin(math.radians(45)),
        T + r - r * math.cos(math.radians(45)), L, T + r,
        "Edge.Cuts", W, "arc-tl")
    arc(R - r, T, R - r + r * math.sin(math.radians(45)),
        T + r - r * math.cos(math.radians(45)), R, T + r,
        "Edge.Cuts", W, "arc-tr")
    arc(R, B - r, R - r + r * math.sin(math.radians(45)),
        B - r + r * math.cos(math.radians(45)), R - r, B,
        "Edge.Cuts", W, "arc-br")
    arc(L, B - r, L + r - r * math.sin(math.radians(45)),
        B - r + r * math.cos(math.radians(45)), L + r, B,
        "Edge.Cuts", W, "arc-bl")

    # Mounting holes: 4x M2 clearance (2.3 mm per frontbox_pcb_spec.md S3),
    # NPTH, at (+/-41.75, +/-71.75). KiCad's stock "MountingHole" library
    # only ships a 2.2mm M2 variant; this is a deliberate custom size (not
    # a mistake), so it's named/described as its own footprint rather than
    # reusing the stock name — structure otherwise mirrors the stock part
    # (courtyard, silkscreen ref, fab value/text) for DRC/fab consistency.
    hole_dia = 2.3
    courtyard_dia = hole_dia + 0.25
    for i, (sx, sy) in enumerate([(-1, -1), (1, -1), (1, 1), (-1, 1)]):
        hx = PCB_CX + sx * HOLE_X
        hy = PCB_CY + sy * HOLE_Y
        o.append('  (footprint "{}:MountingHole_2.3mm_M2_custom"'.format(
            PROJECT))
        o.append('    (layer "F.Cu") (uuid "{}")'.format(uid("mh" + str(i))))
        o.append('    (at {} {})'.format(f(hx), f(hy)))
        o.append('    (descr "Mounting hole 2.3mm, M2 clearance per'
                 ' frontbox_pcb_spec.md")')
        o.append('    (tags "mountinghole M2 custom")')
        o.append('    (property "Reference" "H{}" (at 0 -3.15 0)'
                 ' (layer "F.SilkS") (uuid "{}")'.format(
                     i + 1, uid("mhr" + str(i))))
        o.append('      (effects (font (size 1 1) (thickness 0.15))))')
        o.append('    (property "Value" "MountingHole_2.3mm_M2_custom"'
                 ' (at 0 3.15 0) (layer "F.Fab") (uuid "{}")'.format(
                     uid("mhv" + str(i))))
        o.append('      (effects (font (size 1 1) (thickness 0.15))))')
        o.append('    (attr exclude_from_pos_files exclude_from_bom)')
        o.append('    (fp_circle (center 0 0) (end {} 0)'.format(
            f(hole_dia / 2.0)))
        o.append('      (stroke (width 0.15) (type solid)) (fill no)'
                 ' (layer "Cmts.User"))')
        o.append('    (fp_circle (center 0 0) (end {} 0)'.format(
            f(courtyard_dia / 2.0)))
        o.append('      (stroke (width 0.05) (type solid)) (fill no)'
                 ' (layer "F.CrtYd"))')
        o.append('    (fp_text user "${{REFERENCE}}" (at 0 0 0)'
                 ' (layer "F.Fab") (uuid "{}")'.format(uid("mht" + str(i))))
        o.append('      (effects (font (size 1 1) (thickness 0.15))))')
        o.append('    (pad "" np_thru_hole circle (at 0 0)'
                 ' (size {} {}) (drill {})'
                 ' (layers "*.Cu" "*.Mask") (uuid "{}"))'.format(
                     f(hole_dia), f(hole_dia), f(hole_dia),
                     uid("mhp" + str(i))))
        o.append('  )')

    # Connector-zone hints on Cmts.User (from frontbox_pcb_spec section 5/7)
    def note(x, y, text, tag):
        o.append('  (gr_text "{}" (at {} {}) (layer "Cmts.User")'
                 ' (uuid "{}")'.format(text, f(PCB_CX + x), f(PCB_CY + y),
                                       uid(tag)))
        o.append('    (effects (font (size 1.5 1.5) (thickness 0.25))))')

    note(0, -BOARD_H / 2.0 - 4, "+Y  TOP WALL (RC522 side)", "n-top")
    note(0, BOARD_H / 2.0 + 4, "-Y  POWER-IN / RELAY-OUT / FLOOR CABLE EXIT",
         "n-bot")
    note(0, -45, "RC522 hdr zone", "n-rc")
    note(0, 30, "OLED hdr", "n-oled")
    note(0, 66, "HC-SR04 hdr", "n-hc")

    o.append(')')
    return "\n".join(o) + "\n"


# ---------------------------------------------------------------------------
# Project file
# ---------------------------------------------------------------------------

def emit_symbol_lib():
    """Standalone project symbol library, referenced via sym-lib-table so
    the 'mainboard' lib_id nickname resolves cleanly (avoids the ERC
    'library not found in table' warning that the in-schematic lib_symbols
    cache alone can't satisfy)."""
    used = sorted({c.sym for c in COMPS})
    out = []
    out.append('(kicad_symbol_lib')
    out.append('  (version 20231120)')
    out.append('  (generator "kicad_symbol_editor")')
    out.append('  (generator_version "8.0")')
    for k in used:
        out.append(sym_lib_sexpr(SYMS[k], bare=True))
    out.append(')')
    return "\n".join(out) + "\n"


def emit_sym_lib_table():
    return (
        '(sym_lib_table\n'
        '  (version 7)\n'
        '  (lib (name "{}")(type "KiCad")(uri "${{KIPRJMOD}}/{}.kicad_sym")'
        '(options "")(descr ""))\n'
        ')\n'
    ).format(PROJECT, PROJECT)


def emit_mounting_hole_module():
    """Standalone library copy of the custom 2.3mm mounting hole, so
    'mainboard:MountingHole_2.3mm_M2_custom' resolves via fp-lib-table
    instead of DRC flagging it as absent from any library."""
    hole_dia = 2.3
    courtyard_dia = hole_dia + 0.25
    o = []
    o.append('(footprint "MountingHole_2.3mm_M2_custom"')
    o.append('  (version 20231120)')
    o.append('  (generator "generate_kicad.py")')
    o.append('  (layer "F.Cu")')
    o.append('  (descr "Mounting hole 2.3mm, M2 clearance per'
             ' frontbox_pcb_spec.md")')
    o.append('  (tags "mountinghole M2 custom")')
    o.append('  (property "Reference" "REF**" (at 0 -3.15 0)'
             ' (layer "F.SilkS")')
    o.append('    (effects (font (size 1 1) (thickness 0.15))))')
    o.append('  (property "Value" "MountingHole_2.3mm_M2_custom"'
             ' (at 0 3.15 0) (layer "F.Fab")')
    o.append('    (effects (font (size 1 1) (thickness 0.15))))')
    o.append('  (attr exclude_from_pos_files exclude_from_bom)')
    o.append('  (fp_circle (center 0 0) (end {} 0)'.format(f(hole_dia / 2.0)))
    o.append('    (stroke (width 0.15) (type solid)) (fill no)'
             ' (layer "Cmts.User"))')
    o.append('  (fp_circle (center 0 0) (end {} 0)'.format(
        f(courtyard_dia / 2.0)))
    o.append('    (stroke (width 0.05) (type solid)) (fill no)'
             ' (layer "F.CrtYd"))')
    o.append('  (fp_text user "${REFERENCE}" (at 0 0 0) (layer "F.Fab")')
    o.append('    (effects (font (size 1 1) (thickness 0.15))))')
    o.append('  (pad "" np_thru_hole circle (at 0 0)'
             ' (size {} {}) (drill {}) (layers "*.Cu" "*.Mask"))'.format(
                 f(hole_dia), f(hole_dia), f(hole_dia)))
    o.append('  (embedded_fonts no)')
    o.append(')')
    return "\n".join(o) + "\n"


def emit_fp_lib_table():
    return (
        '(fp_lib_table\n'
        '  (version 7)\n'
        '  (lib (name "{}")(type "KiCad")(uri "${{KIPRJMOD}}/{}.pretty")'
        '(options "")(descr ""))\n'
        ')\n'
    ).format(PROJECT, PROJECT)


def emit_pro():
    return (
        '{\n'
        '  "board": {\n'
        '    "design_settings": {\n'
        '      "defaults": {}\n'
        '    }\n'
        '  },\n'
        '  "meta": { "filename": "mainboard.kicad_pro", "version": 1 },\n'
        '  "net_settings": {\n'
        '    "classes": [\n'
        '      {\n'
        '        "name": "Default",\n'
        '        "clearance": 0.2,\n'
        '        "track_width": 0.25,\n'
        '        "via_diameter": 0.8,\n'
        '        "via_drill": 0.4\n'
        '      },\n'
        '      {\n'
        '        "name": "Power",\n'
        '        "clearance": 0.3,\n'
        '        "track_width": 1.0,\n'
        '        "via_diameter": 1.0,\n'
        '        "via_drill": 0.5\n'
        '      }\n'
        '    ]\n'
        '  },\n'
        '  "sheets": [ [ "root", "" ] ],\n'
        '  "text_variables": {}\n'
        '}\n'
    )


def main():
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "mainboard.kicad_sch"), "w",
              encoding="utf-8") as fh:
        fh.write(emit_schematic())
    with open(os.path.join(here, "mainboard.kicad_pcb"), "w",
              encoding="utf-8") as fh:
        fh.write(emit_pcb())
    with open(os.path.join(here, "mainboard.kicad_pro"), "w",
              encoding="utf-8") as fh:
        fh.write(emit_pro())
    with open(os.path.join(here, "mainboard.kicad_sym"), "w",
              encoding="utf-8") as fh:
        fh.write(emit_symbol_lib())
    with open(os.path.join(here, "sym-lib-table"), "w",
              encoding="utf-8") as fh:
        fh.write(emit_sym_lib_table())
    with open(os.path.join(here, "fp-lib-table"), "w",
              encoding="utf-8") as fh:
        fh.write(emit_fp_lib_table())
    pretty_dir = os.path.join(here, "{}.pretty".format(PROJECT))
    os.makedirs(pretty_dir, exist_ok=True)
    with open(os.path.join(pretty_dir,
                           "MountingHole_2.3mm_M2_custom.kicad_mod"),
              "w", encoding="utf-8") as fh:
        fh.write(emit_mounting_hole_module())
    print("wrote mainboard.kicad_sch / .kicad_pcb / .kicad_pro / "
          ".kicad_sym / sym-lib-table / fp-lib-table / "
          "mainboard.pretty/MountingHole_2.3mm_M2_custom.kicad_mod")
    print("components:", len(COMPS))


if __name__ == "__main__":
    main()
