#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Two-layer maze router for the mainboard (fabrication version, e.g. JLCPCB).

Unlike the single-sided sibling in ../mainboard, this routes on BOTH
copper layers (F.Cu + B.Cu) with real vias for layer changes, so there
are NO hand jumper wires - every net is finished in copper.

* Signals/power route on either layer; the router drops through a via
  whenever the current layer is blocked. Two layers relieve the
  congestion that forced 24 jumpers in the single-sided build.
* GND is a copper pour on BOTH layers, stitched by the signal vias plus
  dedicated stitching vias, giving a proper return plane. (kicad-cli
  can't fill zones, so GND reads as unconnected on the CLI DRC - open in
  KiCad and press 'B' once to fill. Every OTHER net is verified in
  copper.)

Reuses the schematic, placement and footprint geometry from
../mainboard (generate_kicad.py + route_pcb.py). Writes
mainboard.kicad_pcb in this folder.

Run:  python route2.py
"""

import heapq
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = HERE          # generators live in this same (minimal-board) folder
sys.path.insert(0, SRC)

import generate_kicad as gk        # noqa: E402
import route_pcb as rp             # noqa: E402
from generate_kicad import PCB_CX, PCB_CY, BOARD_W, BOARD_H, uid, f  # noqa: E402
from route_pcb import COMPS, FPGEOM, PLACEMENT, abs_pos, build_nets, \
    build_pad_positions            # noqa: E402

# ---- routing parameters (mm) ----
GRID = 0.25
TRACE_W = 0.3
POWER_W = 0.5
CLEAR = 0.2
VIA_D = 0.6
VIA_DRILL = 0.3
VIA_COST = 8           # discourage needless layer hops
EDGE_MARGIN = 1.5
POWER_NETS = {"+12V", "+5V", "+3V3"}
LAYERS = ("F.Cu", "B.Cu")

X0 = PCB_CX - BOARD_W / 2 + EDGE_MARGIN
Y0 = PCB_CY - BOARD_H / 2 + EDGE_MARGIN
NX = int((BOARD_W - 2 * EDGE_MARGIN) / GRID)
NY = int((BOARD_H - 2 * EDGE_MARGIN) / GRID)
HALO = max(1, int(math.ceil((POWER_W + CLEAR) / GRID)))


def cell_to_xy(ix, iy):
    return (X0 + ix * GRID, Y0 + iy * GRID)


def xy_to_cell(x, y):
    return (int(round((x - X0) / GRID)), int(round((y - Y0) / GRID)))


def in_grid(ix, iy):
    return 0 <= ix < NX and 0 <= iy < NY


class Grid:
    def __init__(self):
        self.g = [[[None, None] for _ in range(NX)] for _ in range(NY)]

    def get(self, ix, iy, layer):
        return self.g[iy][ix][layer]

    def set(self, ix, iy, layer, val):
        if in_grid(ix, iy):
            self.g[iy][ix][layer] = val

    def block_rect(self, cx, cy, hw, hh, val, layers):
        halo = TRACE_W / 2 + CLEAR
        i0, j0 = xy_to_cell(cx - hw - halo, cy - hh - halo)
        i1, j1 = xy_to_cell(cx + hw + halo, cy + hh + halo)
        for iy in range(min(j0, j1), max(j0, j1) + 1):
            for ix in range(min(i0, i1), max(i0, i1) + 1):
                if in_grid(ix, iy):
                    for L in layers:
                        self.g[iy][ix][L] = val


def build_grid():
    grid = Grid()
    for sx in (-1, 1):
        for sy in (-1, 1):
            grid.block_rect(PCB_CX + sx * rp.HOLE_X, PCB_CY + sy * rp.HOLE_Y,
                            2.5, 2.5, "#", (0, 1))
    for c in COMPS:
        if c.ref not in PLACEMENT:
            continue
        (x0, y0), angle = PLACEMENT[c.ref]
        for num, ptype, shape, lx, ly, w, h, drill, pa in FPGEOM[c.footprint]:
            ax, ay = abs_pos(x0, y0, angle, lx, ly)
            pw, ph = (h, w) if pa in (90, 270) else (w, h)
            if angle in (90, 270):
                pw, ph = ph, pw
            net = c.nets.get(num)
            tag = net if net is not None else "#"
            layers = (0, 1) if ptype == "thru_hole" else (0,)
            grid.block_rect(ax, ay, pw / 2, ph / 2, tag, layers)
    return grid


def pad_info(ref, num):
    c = next(k for k in COMPS if k.ref == ref)
    (x0, y0), angle = PLACEMENT[ref]
    pad = next(p for p in FPGEOM[c.footprint] if p[0] == num)
    ax, ay = abs_pos(x0, y0, angle, pad[3], pad[4])
    return ax, ay, (pad[1] == "thru_hole")


# ---------------------------------------------------------------------------
# 2-layer Dijkstra with turn + via penalties
# ---------------------------------------------------------------------------

def maze_route(grid, net, start, goal, start_layers=(0, 1),
               goal_layers=(0, 1)):
    """start/goal: (ix,iy). start_layers/goal_layers restrict which copper
    layers the endpoints may use - an SMD pad has copper on F.Cu only, so
    the route must start/end on F.Cu (and place a via nearby if it needs
    B.Cu), never begin on an empty B.Cu cell under the pad. Returns list
    of (ix,iy,layer) or None."""
    def passable(ix, iy, L):
        v = grid.get(ix, iy, L)
        return v is None or v == net

    def via_ok(ix, iy):
        # keep the via pad (0.6) + clearance (0.2) clear of foreign copper
        # on both layers -> 3 cells at 0.25mm grid
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                nx, ny = ix + dx, iy + dy
                if not in_grid(nx, ny):
                    continue
                for L in (0, 1):
                    v = grid.get(nx, ny, L)
                    if v is not None and v != net:
                        return False
        return True

    dist = {}
    bp = {}
    pq = []
    ctr = [0]

    def push(nd, state, pdir):
        ctr[0] += 1
        heapq.heappush(pq, (nd, ctr[0], state, pdir))

    for L in start_layers:
        if passable(start[0], start[1], L):
            s = (start[0], start[1], L)
            dist[(s, None)] = 0
            push(0, s, None)
    end_state = None
    while pq:
        d, _c, (ix, iy, L), pdir = heapq.heappop(pq)
        if dist.get(((ix, iy, L), pdir), 1e18) < d:
            continue
        if (ix, iy) == goal and L in goal_layers:
            end_state = ((ix, iy, L), pdir)
            break
        # planar moves
        for k, (dx, dy) in enumerate(((1, 0), (-1, 0), (0, 1), (0, -1))):
            nx, ny = ix + dx, iy + dy
            if not in_grid(nx, ny) or not passable(nx, ny, L):
                continue
            nd = d + 1 + (0 if pdir in (k, None) else 2)
            key = ((nx, ny, L), k)
            if nd < dist.get(key, 1e18):
                dist[key] = nd
                bp[key] = ((ix, iy, L), pdir)
                push(nd, (nx, ny, L), k)
        # via to other layer. A via (0.6mm) is wider than a trace, so it
        # needs a clear neighbourhood on BOTH layers - not just the cell -
        # or it shorts/violates clearance against adjacent pads (esp. the
        # dense ESP32 pin field).
        oL = 1 - L
        if passable(ix, iy, oL) and passable(ix, iy, L) and via_ok(ix, iy):
            nd = d + VIA_COST
            key = ((ix, iy, oL), None)
            if nd < dist.get(key, 1e18):
                dist[key] = nd
                bp[key] = ((ix, iy, L), pdir)
                push(nd, (ix, iy, oL), None)
    if end_state is None:
        return None
    path = []
    cur = end_state
    while cur is not None:
        path.append(cur[0])
        cur = bp.get(cur)
    path.reverse()
    return path


def mark(grid, net, path):
    for ix, iy, L in path:
        for dy in range(-HALO, HALO + 1):
            for dx in range(-HALO, HALO + 1):
                nx, ny = ix + dx, iy + dy
                if in_grid(nx, ny) and grid.get(nx, ny, L) is None:
                    grid.set(nx, ny, L, net)
        grid.set(ix, iy, L, net)


def to_polys(path):
    """Split a (ix,iy,layer) path into per-layer segments and via points
    (where the layer changes at a fixed cell)."""
    segs = []   # (layer, [(ix,iy),...])
    vias = []   # (ix,iy)
    cur_layer = path[0][2]
    run = [(path[0][0], path[0][1])]
    for k in range(1, len(path)):
        ix, iy, L = path[k]
        if L != cur_layer:
            segs.append((cur_layer, run))
            vias.append((ix, iy))
            cur_layer = L
            run = [(ix, iy)]
        else:
            run.append((ix, iy))
    segs.append((cur_layer, run))
    return segs, vias


def simplify(cells):
    if len(cells) < 3:
        return cells
    out = [cells[0]]
    for i in range(1, len(cells) - 1):
        ax, ay = cells[i - 1]
        bx, by = cells[i]
        cx, cy = cells[i + 1]
        if (bx - ax, by - ay) != (cx - bx, cy - by):
            out.append(cells[i])
    out.append(cells[-1])
    return out


if __name__ == "__main__":
    net_ids = build_nets()
    pads = build_pad_positions(net_ids)
    grid = build_grid()

    # MST edges for every non-GND net (longest first: hard nets get first
    # pick of the 2-layer space)
    edges = []
    for net, plist in pads.items():
        if net == "GND":
            continue
        pts = [(r, p, x, y) for (r, p, x, y) in plist]
        n = len(pts)
        if n < 2:
            continue
        INF = 1e18
        intree = [False] * n
        d = [INF] * n
        par = [-1] * n
        d[0] = 0
        for _ in range(n):
            u = min((i for i in range(n) if not intree[i]), key=lambda i: d[i])
            intree[u] = True
            if par[u] >= 0:
                a, b = pts[par[u]], pts[u]
                L = abs(a[2] - b[2]) + abs(a[3] - b[3])
                edges.append((L, net, (a[0], a[1]), (b[0], b[1])))
            for v in range(n):
                if not intree[v]:
                    dd = (abs(pts[u][2] - pts[v][2]) +
                          abs(pts[u][3] - pts[v][3]))
                    if dd < d[v]:
                        d[v] = dd
                        par[v] = u
    edges.sort(key=lambda e: -e[0])
    order = [(net, a, b) for (_L, net, a, b) in edges]

    def route_all(order):
        """Route every edge in the given order on a fresh grid. Returns
        (routed, vias_pts, failed)."""
        grid = build_grid()
        routed = []
        vias_pts = []
        failed = []
        for net, (ra, pa), (rb, pb) in order:
            ax, ay, tht_a = pad_info(ra, pa)
            bx, by, tht_b = pad_info(rb, pb)
            sa = xy_to_cell(ax, ay)
            sb = xy_to_cell(bx, by)
            la = (0, 1) if tht_a else (0,)   # SMD -> F.Cu only
            lb = (0, 1) if tht_b else (0,)
            path = maze_route(grid, net, sa, sb,
                              start_layers=la, goal_layers=lb)
            if path is None:
                failed.append((net, (ra, pa), (rb, pb)))
                continue
            mark(grid, net, path)
            segs, vias = to_polys(path)
            w = POWER_W if net in POWER_NETS else TRACE_W
            # NOTE: keep every vertex on the grid (cell centres). At 0.25mm
            # grid a cell centre is <=0.18mm from the true pad centre, well
            # inside any pad's copper, so the track still lands on the pad -
            # and, crucially, via points (also cell centres) coincide
            # exactly with segment ends, so layer changes actually connect.
            for li, (layer, cells) in enumerate(segs):
                pts = [cell_to_xy(ix, iy) for ix, iy in simplify(cells)]
                routed.append((net, LAYERS[layer], pts, w))
            for (vx, vy) in vias:
                vias_pts.append((net, *cell_to_xy(vx, vy)))
        return routed, vias_pts, failed

    # Iterative reorder rip-up: whatever failed this round jumps to the
    # front next round (gets first pick of the congested space). Keep the
    # best (fewest-failures) result across rounds.
    best = None
    for rnd in range(8):
        routed, vias_pts, failed = route_all(order)
        print("round {}: routed {}/{}, failed {}".format(
            rnd, len(order) - len(failed), len(order), len(failed)))
        if best is None or len(failed) < len(best[2]):
            best = (routed, vias_pts, failed)
        if not failed:
            break
        fset = set(id(e) for e in failed)  # not stable; match by tuple
        failed_keys = set((n, a, b) for (n, a, b) in failed)
        order = [e for e in order if e in failed_keys] + \
                [e for e in order if e not in failed_keys]
    routed, vias_pts, failed = best
    print("FINAL routed {}/{}, failed {}".format(
        len(order) - len(failed), len(order), len(failed)))
    for e in failed:
        print("  FAILED", e)
    print("vias:", len(vias_pts))

    # ---- emit ----
    def seg(x1, y1, x2, y2, w, layer, net, tag):
        return ('  (segment (start {} {}) (end {} {}) (width {})'
                ' (layer "{}") (net {}) (uuid "{}"))'.format(
                    f(x1), f(y1), f(x2), f(y2), f(w), layer,
                    net_ids[net], uid(tag)))

    body = []
    # pad bridges (same-numbered pads: buttons, SOT-223 tab)
    for c in COMPS:
        if c.ref not in PLACEMENT:
            continue
        (x0, y0), angle = PLACEMENT[c.ref]
        by_num = {}
        for num, ptype, shape, lx, ly, w, h, drill, pa in FPGEOM[c.footprint]:
            ax, ay = abs_pos(x0, y0, angle, lx, ly)
            by_num.setdefault(num, []).append((ax, ay, ptype))
        for num, locs in by_num.items():
            net = c.nets.get(num)
            if net is None or len(locs) < 2:
                continue
            for k in range(len(locs) - 1):
                (x1, y1, _), (x2, y2, _) = locs[k], locs[k + 1]
                body.append(seg(x1, y1, x2, y2, TRACE_W, "F.Cu", net,
                                "br{}-{}-{}".format(c.ref, num, k)))

    for i, (net, layer, pts, w) in enumerate(routed):
        for k in range(len(pts) - 1):
            (x1, y1), (x2, y2) = pts[k], pts[k + 1]
            body.append(seg(x1, y1, x2, y2, w, layer, net,
                            "t{}-{}".format(i, k)))
    seen_via = set()
    for i, (net, vx, vy) in enumerate(vias_pts):
        # merge same-net vias that land within ~0.6mm of each other so two
        # nnearby layer changes don't drill overlapping holes (hole_to_hole)
        key = (net, round(vx / 0.6), round(vy / 0.6))
        if key in seen_via:
            continue
        seen_via.add(key)
        body.append('  (via (at {} {}) (size {}) (drill {})'
                    ' (layers "F.Cu" "B.Cu") (net {}) (uuid "{}"))'.format(
                        f(vx), f(vy), f(VIA_D), f(VIA_DRILL),
                        net_ids[net], uid("v{}".format(i))))

    # GND pour on both layers
    L = PCB_CX - BOARD_W / 2 + 0.5
    R = PCB_CX + BOARD_W / 2 - 0.5
    T = PCB_CY - BOARD_H / 2 + 0.5
    B = PCB_CY + BOARD_H / 2 - 0.5
    for layer in ("F.Cu", "B.Cu"):
        body.append(
            '  (zone (net {}) (net_name "GND") (layer "{}") (uuid "{}")\n'
            '    (hatch edge 0.5) (connect_pads (clearance 0.4))\n'
            '    (min_thickness 0.25)\n'
            '    (fill yes (thermal_gap 0.4) (thermal_bridge_width 0.6))\n'
            '    (polygon (pts (xy {} {}) (xy {} {}) (xy {} {}) (xy {} {}))))'
            .format(net_ids["GND"], layer, uid("gnd" + layer),
                    f(L), f(T), f(R), f(T), f(R), f(B), f(L), f(B)))

    outline = gk.emit_pcb()
    # 2-layer board: default outline already declares F.Cu + B.Cu
    net_decls = "\n".join('  (net {} "{}")'.format(nid, name)
                          for name, nid in sorted(net_ids.items(),
                                                  key=lambda kv: kv[1]))
    outline = outline.replace('  (net 0 "")',
                              '  (net 0 "")\n' + net_decls, 1)
    fps = "\n".join(rp.emit_footprint(c, net_ids) for c in COMPS
                    if c.ref in PLACEMENT)
    at = outline.rfind(")")
    full = outline[:at] + fps + "\n" + "\n".join(body) + "\n" + outline[at:]
    with open(os.path.join(HERE, "mainboard.kicad_pcb"), "w",
              encoding="utf-8") as fh:
        fh.write(full)
    print("wrote 2-layer mainboard.kicad_pcb")
