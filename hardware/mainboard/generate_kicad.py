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


def sym_lib_sexpr(sd):
    """Emit one (symbol ...) definition for the lib_symbols cache."""
    name = "{}:{}".format(PROJECT, sd.key)
    hide_names = "" if sd.show_pin_names else " hide"
    lines = []
    lines.append('    (symbol "{}"'.format(name))
    lines.append('      (pin_numbers {})'.format(
        "yes" if sd.show_pin_numbers else "hide"))
    lines.append('      (pin_names (offset 0.508){})'.format(hide_names))
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
    left = [(str(i + 1), nm, P) for i, nm in enumerate(pins)]
    return SymDef(key, left=left, ref_prefix="J", body_w=6.35,
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

# Headers
add(hdr("TERM2", ["1", "2"]))
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


# ---------------------------------------------------------------------------
# Component instances
# ---------------------------------------------------------------------------
# Each Comp: ref, symbol key, value, footprint, (x,y), nets{pinnum: netname}
# Pins with no net entry -> emit a no_connect at the pin.

class Comp:
    def __init__(self, ref, sym, value, footprint, at, nets, no_connect=None):
        self.ref = ref
        self.sym = sym
        self.value = value
        self.footprint = footprint
        self.at = at
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
FP_BUZ = "Buzzer_Beeper:Buzzer_D9.0mm_H5.5mm"
FP_RELAY = "Relay_THT:Relay_SPDT_SANYOU_SRD_Series_Form_C"
FP_WROOM = "RF_Module:ESP32-WROOM-32"

# Grid placement columns (mm on the A3 sheet)
X = [50, 120, 190, 260, 330, 400]
def col(i):
    return X[i]


# --- ESP32-WROOM (centre) --------------------------------------------------
wroom_nets = {
    "1": "GND", "2": "+3V3", "3": "EN",
    "7": "RFID_EXIT_MISO", "8": "US_ECHO_3V3", "9": "US_TRIG",
    "10": "BUZZER_CTRL", "11": "RELAY_CTRL", "12": "RFID_ENTRY_RST",
    "13": "RFID_EXIT_SCK", "15": "GND", "16": "RFID_EXIT_MOSI",
    "24": "RFID_EXIT_RST", "25": "IO0", "26": "RFID_EXIT_SS",
    "27": "CAM_RX2", "28": "CAM_TX2", "29": "RFID_ENTRY_SS",
    "30": "RFID_ENTRY_SCK", "31": "RFID_ENTRY_MISO", "32": "OLED_SDA",
    "33": "U0RXD", "34": "U0TXD", "35": "OLED_SCL", "36": "RFID_ENTRY_MOSI",
    "37": "GND", "38": "GND", "39": "GND",
}
wroom_nc = ["4", "5", "6", "14", "17", "18", "19", "20", "21", "22", "23"]
C_("U1", "ESP32WROOM", "ESP32-WROOM-32", FP_WROOM, (200, 120),
   wroom_nets, no_connect=wroom_nc)

# --- Power input + protection ---------------------------------------------
C_("J1", "TERM2", "12V DC IN", FP_TERM2, (col(0), 40),
   {"1": "VIN_RAW", "2": "GND"})
C_("F1", "FUSE", "1.5A PPTC", FP_FUSE, (col(0), 65),
   {"1": "VIN_RAW", "2": "VIN_F"})
C_("D1", "D", "SS34 (reverse prot)", FP_D_SMA, (col(0), 88),
   {"1": "VIN_F", "2": "+12V"})           # pin1=A -> VIN_F, pin2=K -> +12V
C_("D2", "TVS", "SMBJ13A", FP_D_SMA, (col(0), 112),
   {"1": "GND", "2": "+12V"})             # clamp +12V to GND
C_("C1", "CP", "470uF/25V", FP_CP, (col(0), 136),
   {"1": "+12V", "2": "GND"})
C_("C2", "C", "100nF", FP_C, (col(0), 160),
   {"1": "+12V", "2": "GND"})

# --- Buck 12V->5V (module) + LDO 5V->3V3 ----------------------------------
C_("U2", "BUCK", "MP1584 5V/2A", FP_HDR.format(4), (col(1), 45),
   {"1": "+12V", "2": "GND", "3": "+5V", "4": "GND"})
C_("C3", "CP", "100uF/16V", FP_CP, (col(1), 78),
   {"1": "+5V", "2": "GND"})
C_("C4", "C", "100nF", FP_C, (col(1), 102),
   {"1": "+5V", "2": "GND"})
C_("U3", "LDO", "AMS1117-3.3", FP_SOT223, (col(1), 130),
   {"3": "+5V", "2": "+3V3", "1": "GND"})
C_("C5", "C", "10uF", FP_C, (col(1), 158),
   {"1": "+5V", "2": "GND"})
C_("C6", "CP", "22uF/10V", FP_CP, (col(1), 182),
   {"1": "+3V3", "2": "GND"})
C_("C7", "C", "100nF", FP_C, (col(1), 206),
   {"1": "+3V3", "2": "GND"})
# Power LED on 3V3
C_("R1", "R", "1k", FP_R, (col(1), 230),
   {"1": "+3V3", "2": "PWR_LED_A"})
C_("D3", "LED", "PWR (green)", FP_LED, (col(1), 254),
   {"1": "PWR_LED_A", "2": "GND"})

# --- ESP32 decoupling + boot/en strap -------------------------------------
C_("C8", "C", "100nF", FP_C, (col(2), 40),
   {"1": "+3V3", "2": "GND"})
C_("C9", "CP", "10uF/10V", FP_CP, (col(2), 64),
   {"1": "+3V3", "2": "GND"})
C_("R2", "R", "10k", FP_R, (col(2), 90),
   {"1": "+3V3", "2": "EN"})               # EN pull-up
C_("C10", "C", "100nF", FP_C, (col(2), 114),
   {"1": "EN", "2": "GND"})                # EN reset RC
C_("R3", "R", "10k", FP_R, (col(2), 140),
   {"1": "+3V3", "2": "IO0"})              # IO0 pull-up (run mode)
C_("SW1", "SW", "BOOT", FP_SW, (col(2), 166),
   {"1": "IO0", "2": "GND"})
C_("SW2", "SW", "EN/RST", FP_SW, (col(2), 190),
   {"1": "EN", "2": "GND"})

# --- Programming / USB-serial header --------------------------------------
# 1 GND, 2 +5V, 3 U0TXD(->RX of adapter), 4 U0RXD(<-TX of adapter),
# 5 IO0, 6 EN
C_("J2", "HDR6", "PROG/UART", FP_HDR.format(6), (col(2), 230),
   {"1": "GND", "2": "+5V", "3": "U0TXD", "4": "U0RXD",
    "5": "IO0", "6": "EN"})

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

# --- Buzzer + driver -------------------------------------------------------
C_("R8", "R", "1k", FP_R, (col(4), 185),
   {"1": "BUZZER_CTRL", "2": "Q1_B"})
C_("Q1", "NPN", "S8050 / 2N2222", FP_SOT23, (col(4), 212),
   {"2": "Q1_B", "1": "BUZZ_LO", "3": "GND"})
C_("BZ1", "BUZZER", "active 5V", FP_BUZ, (col(4), 240),
   {"1": "+5V", "2": "BUZZ_LO"})

# --- Relay + driver + solenoid output -------------------------------------
C_("R9", "R", "1k", FP_R, (col(5), 45),
   {"1": "RELAY_CTRL", "2": "Q2_B"})
C_("Q2", "NPN", "S8050 / 2N2222", FP_SOT23, (col(5), 72),
   {"2": "Q2_B", "1": "RLY_COIL_LO", "3": "GND"})
C_("K1", "RELAY", "SRD-12VDC-SL-C", FP_RELAY, (col(5), 105),
   {"1": "+12V", "2": "RLY_COIL_LO", "3": "+12V", "4": "LOCK_SW"},
   no_connect=["5"])
C_("D4", "D", "1N4007 (coil flyback)", FP_D_SMA, (col(5), 140),
   {"1": "RLY_COIL_LO", "2": "+12V"})     # A=coil_lo, K=+12V
C_("J8", "TERM2", "SOLENOID 12V", FP_TERM2, (col(5), 168),
   {"1": "LOCK_SW", "2": "GND"})
C_("D5", "D", "1N4007 (load flyback)", FP_D_SMA, (col(5), 196),
   {"1": "GND", "2": "LOCK_SW"})          # A=GND, K=LOCK_SW across solenoid


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
        out.append('  (symbol (lib_id "{}:{}") (at {} {} 0) (unit 1)'.format(
            PROJECT, c.sym, f(X0), f(Y0)))
        out.append('    (exclude_from_sim no) (in_bom yes) (on_board yes)'
                   ' (dnp no)')
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

    # Mounting holes: 4x M2 clearance (2.3 mm), NPTH, at (+/-41.75, +/-71.75)
    for i, (sx, sy) in enumerate([(-1, -1), (1, -1), (1, 1), (-1, 1)]):
        hx = PCB_CX + sx * HOLE_X
        hy = PCB_CY + sy * HOLE_Y
        o.append('  (footprint "MountingHole:MountingHole_2.2mm_M2"')
        o.append('    (layer "F.Cu") (uuid "{}")'.format(uid("mh" + str(i))))
        o.append('    (at {} {})'.format(f(hx), f(hy)))
        o.append('    (attr exclude_from_pos_files exclude_from_bom)')
        o.append('    (property "Reference" "H{}" (at 0 -3 0) (layer "F.SilkS")'
                 ' (uuid "{}")'.format(i + 1, uid("mhr" + str(i))))
        o.append('      (effects (font (size 1 1) (thickness 0.15))))')
        o.append('    (property "Value" "M2" (at 0 3 0) (layer "F.Fab")'
                 ' (uuid "{}")'.format(uid("mhv" + str(i))))
        o.append('      (effects (font (size 1 1) (thickness 0.15))))')
        o.append('    (pad "" np_thru_hole circle (at 0 0) (size 2.3 2.3)'
                 ' (drill 2.3) (layers "*.Cu" "*.Mask")'
                 ' (uuid "{}"))'.format(uid("mhp" + str(i))))
        o.append('  )')

    # Connector-zone hints on Cmts.User (from frontbox_pcb_spec section 5/7)
    def note(x, y, text, tag):
        o.append('  (gr_text "{}" (at {} {}) (layer "Cmts.User")'
                 ' (uuid "{}")'.format(text, f(PCB_CX + x), f(PCB_CY + y),
                                       uid(tag)))
        o.append('    (effects (font (size 1.5 1.5) (thickness 0.25))))')

    note(0, -BOARD_H / 2.0 - 4, "+Y  PROGRAMMING / USB WALL", "n-top")
    note(0, BOARD_H / 2.0 + 4, "-Y  POWER-IN / RELAY-OUT / FLOOR CABLE EXIT",
         "n-bot")
    note(0, -45, "RC522 hdr zone (0,+45)", "n-rc")
    note(0, 8, "OLED hdr (0,-8)", "n-oled")
    note(0, 52, "HC-SR04 hdr (0,-52)", "n-hc")
    note(-30, 0, "WROOM antenna -> board edge, no copper", "n-ant")

    o.append(')')
    return "\n".join(o) + "\n"


# ---------------------------------------------------------------------------
# Project file
# ---------------------------------------------------------------------------

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
    print("wrote mainboard.kicad_sch / .kicad_pcb / .kicad_pro")
    print("components:", len(COMPS))


if __name__ == "__main__":
    main()
