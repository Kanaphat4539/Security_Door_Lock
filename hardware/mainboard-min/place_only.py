#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Emit a PLACED-BUT-UNROUTED board: board outline + mounting holes + every
footprint dropped in its final position, WITH net assignments but NO
copper tracks/vias/zones.

This is the "practice" board - open it in KiCad and you'll see the parts
already placed and the white ratsnest lines showing what still needs to
be connected. Route the copper yourself (see hardware/KICAD_GUIDE_TH.md).

Run after generate_kicad.py. Writes mainboard.kicad_pcb here.
"""

import os
import generate_kicad as gk
import route_pcb as rp
from generate_kicad import PROJECT
from route_pcb import COMPS, PLACEMENT, build_nets

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    net_ids = build_nets()

    outline = gk.emit_pcb()
    net_decls = "\n".join('  (net {} "{}")'.format(nid, name)
                          for name, nid in sorted(net_ids.items(),
                                                  key=lambda kv: kv[1]))
    outline = outline.replace('  (net 0 "")',
                              '  (net 0 "")\n' + net_decls, 1)
    fps = "\n".join(rp.emit_footprint(c, net_ids) for c in COMPS
                    if c.ref in PLACEMENT)
    at = outline.rfind(")")
    full = outline[:at] + fps + "\n" + outline[at:]

    with open(os.path.join(HERE, "mainboard.kicad_pcb"), "w",
              encoding="utf-8") as fh:
        fh.write(full)
    placed = sum(1 for c in COMPS if c.ref in PLACEMENT)
    print("wrote PLACED-ONLY mainboard.kicad_pcb ({} footprints, no copper)"
          .format(placed))


if __name__ == "__main__":
    main()
