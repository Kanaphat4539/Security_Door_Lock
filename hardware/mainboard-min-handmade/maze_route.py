#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Single-sided (F.Cu) maze router for the mainboard, with automatic wire
jumpers for the connections copper can't make on one layer.

Approach
--------
* GND is not traced at all - it becomes a copper pour on F.Cu, so every
  GND pad connects through the pour.
* Every other net is broken into MST edges (pad->pad). Each edge is
  routed on F.Cu with a Lee/BFS maze router on a 0.5 mm grid that steers
  around all other pads and already-laid copper (0.5 mm trace, ~0.5 mm
  clearance - realistic for home toner-transfer etching).
* An edge the maze can't complete on copper becomes a JUMPER: an
  insulated wire the builder solders on the component side. It's modelled
  as a B.Cu segment with a via (drilled hole) at each end down to the
  F.Cu copper, so KiCad sees a real electrical connection and DRC passes.
  The build note: drill the two via holes, run a wire over the top.

The router prints how many edges routed on copper vs. how many became
jumpers - that jumper count is the honest cost of staying single-sided.

Run after generate_kicad.py + route_pcb.py placement is settled:
    python maze_route.py
Overwrites mainboard.kicad_pcb with the fully routed board.
"""

import heapq
import math
import os

import generate_kicad as gk
import route_pcb as rp
from generate_kicad import PCB_CX, PCB_CY, BOARD_W, BOARD_H, uid, f
from route_pcb import COMPS, FPGEOM, PLACEMENT, abs_pos, build_nets, \
    build_pad_positions

# ---- routing parameters (mm) ----
GRID = 0.5
TRACE_W = 0.5
POWER_W = 0.6
CLEAR = 0.45
VIA_D = 1.2
VIA_DRILL = 0.7
EDGE_MARGIN = 1.5
POWER_NETS = {"+12V", "+5V", "+3V3"}

# grid bounds (a little inside the board edge)
X0 = PCB_CX - BOARD_W / 2 + EDGE_MARGIN
Y0 = PCB_CY - BOARD_H / 2 + EDGE_MARGIN
NX = int((BOARD_W - 2 * EDGE_MARGIN) / GRID)
NY = int((BOARD_H - 2 * EDGE_MARGIN) / GRID)


def cell_to_xy(ix, iy):
    return (X0 + ix * GRID, Y0 + iy * GRID)


def xy_to_cell(x, y):
    return (int(round((x - X0) / GRID)), int(round((y - Y0) / GRID)))


def in_grid(ix, iy):
    return 0 <= ix < NX and 0 <= iy < NY


def pad_layers(ptype):
    return ("F.Cu", "B.Cu") if ptype == "thru_hole" else ("F.Cu",)


# ---------------------------------------------------------------------------
# Obstacle grid on F.Cu. Value: net name occupying the cell, or None free,
# or "#" for a hard block (board edge, mounting hole, foreign pad body).
# A cell is routable for net N if it's None or already == N.
# ---------------------------------------------------------------------------

class Grid:
    def __init__(self):
        self.g = [[None] * NX for _ in range(NY)]

    def block(self, ix, iy, val):
        if in_grid(ix, iy):
            self.g[iy][ix] = val

    def get(self, ix, iy):
        return self.g[iy][ix]

    def block_rect(self, cx, cy, hw, hh, val, only_if_free=False):
        halo = TRACE_W / 2 + CLEAR
        i0, j0 = xy_to_cell(cx - hw - halo, cy - hh - halo)
        i1, j1 = xy_to_cell(cx + hw + halo, cy + hh + halo)
        for iy in range(min(j0, j1), max(j0, j1) + 1):
            for ix in range(min(i0, i1), max(i0, i1) + 1):
                if in_grid(ix, iy):
                    if only_if_free and self.g[iy][ix] is not None:
                        continue
                    self.g[iy][ix] = val


def build_obstacles():
    """Mark every pad on F.Cu as a hard block tagged with its net (so a
    trace of that net may still reach it, foreign nets may not). THT pad
    holes block both layers but we only maze on F.Cu here."""
    grid = Grid()
    # board-edge ring already excluded by grid bounds; mounting holes:
    for sx in (-1, 1):
        for sy in (-1, 1):
            hx = PCB_CX + sx * rp.HOLE_X
            hy = PCB_CY + sy * rp.HOLE_Y
            grid.block_rect(hx, hy, 2.5, 2.5, "#")
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
            grid.block_rect(ax, ay, pw / 2, ph / 2, tag)
    return grid


# ---------------------------------------------------------------------------
# Maze routing (BFS/Dijkstra with turn penalty for straighter traces)
# ---------------------------------------------------------------------------

def maze_route(grid, net, start_cells, goal_cells):
    """Route from any start cell to any goal cell for `net`, treating
    cells that are None or == net as passable. Returns a list of (ix,iy)
    path cells or None. Prefers straight runs (small turn penalty)."""
    goal = set(goal_cells)
    starts = [c for c in start_cells if in_grid(*c)]
    if not starts or not goal:
        return None

    def passable(ix, iy):
        v = grid.get(ix, iy)
        return v is None or v == net

    dist = {}
    pq = []
    for c in starts:
        if passable(*c):
            dist[(c, None)] = 0
            heapq.heappush(pq, (0, c, None))
    best_end = None
    while pq:
        d, (ix, iy), pdir = heapq.heappop(pq)
        if dist.get(((ix, iy), pdir), 1e18) < d:
            continue
        if (ix, iy) in goal:
            best_end = ((ix, iy), pdir)
            break
        for k, (dx, dy) in enumerate(((1, 0), (-1, 0), (0, 1), (0, -1))):
            nx, ny = ix + dx, iy + dy
            if not in_grid(nx, ny) or not passable(nx, ny):
                continue
            nd = d + 1 + (0 if pdir == k or pdir is None else 2)
            key = ((nx, ny), k)
            if nd < dist.get(key, 1e18):
                dist[key] = nd
                # backpointer stored separately
                _bp[key] = ((ix, iy), pdir)
                heapq.heappush(pq, (nd, (nx, ny), k))
    if best_end is None:
        return None
    path = []
    cur = best_end
    while cur is not None:
        path.append(cur[0])
        cur = _bp.get(cur)
    path.reverse()
    return path


_bp = {}


def net_cells(grid, net):
    return [(ix, iy) for iy in range(NY) for ix in range(NX)
            if grid.get(ix, iy) == net]


# clearance halo (in cells) between a laid trace and any *other* net:
# needs own_half + clearance + other_half worth of gap.
HALO = max(1, int(math.ceil((POWER_W + CLEAR) / GRID)))


def mark_path(grid, net, path):
    for ix, iy in path:
        for dy in range(-HALO, HALO + 1):
            for dx in range(-HALO, HALO + 1):
                nx, ny = ix + dx, iy + dy
                if in_grid(nx, ny) and grid.get(nx, ny) is None:
                    grid.g[ny][nx] = net
        grid.g[iy][ix] = net


def simplify(path):
    """Collapse collinear runs to corner points."""
    if len(path) < 3:
        return path
    out = [path[0]]
    for i in range(1, len(path) - 1):
        ax, ay = path[i - 1]
        bx, by = path[i]
        cx, cy = path[i + 1]
        if (bx - ax, by - ay) != (cx - bx, cy - by):
            out.append(path[i])
    out.append(path[-1])
    return out


def pad_info(ref, num):
    """Return (abs_x, abs_y, is_tht) for one pad of a placed component."""
    c = next(k for k in COMPS if k.ref == ref)
    (x0, y0), angle = PLACEMENT[ref]
    pad = next(p for p in FPGEOM[c.footprint] if p[0] == num)
    ax, ay = abs_pos(x0, y0, angle, pad[3], pad[4])
    return ax, ay, (pad[1] == "thru_hole")


def pad_cells_of(ref, num):
    """The grid cell of one pad (BFS start/end)."""
    ax, ay, _ = pad_info(ref, num)
    return [xy_to_cell(ax, ay)], (ax, ay)


def build_bcu_obstacles():
    """B.Cu obstacle grid for jumper routing: only THT pads of foreign
    nets block a jumper (SMD pads are F.Cu-only, invisible on the back).
    Mounting holes block. Tagged by net so a jumper may end on its own
    THT pad."""
    grid = Grid()
    for sx in (-1, 1):
        for sy in (-1, 1):
            grid.block_rect(PCB_CX + sx * rp.HOLE_X, PCB_CY + sy * rp.HOLE_Y,
                            2.5, 2.5, "#")
    for c in COMPS:
        if c.ref not in PLACEMENT:
            continue
        (x0, y0), angle = PLACEMENT[c.ref]
        for num, ptype, shape, lx, ly, w, h, drill, pa in FPGEOM[c.footprint]:
            if ptype != "thru_hole":
                continue
            ax, ay = abs_pos(x0, y0, angle, lx, ly)
            pw, ph = (h, w) if pa in (90, 270) else (w, h)
            if angle in (90, 270):
                pw, ph = ph, pw
            net = c.nets.get(num)
            grid.block_rect(ax, ay, pw / 2, ph / 2,
                            net if net is not None else "#")
    return grid


if __name__ == "__main__":
    net_ids = build_nets()
    pads = build_pad_positions(net_ids)
    grid = build_obstacles()

    # MST edges per non-GND net, shortest edges first (global order)
    edges = []  # (length, net, (refA,padA), (refB,padB))
    for net, plist in pads.items():
        if net == "GND":
            continue
        pts = [(r, p, x, y) for (r, p, x, y) in plist]
        n = len(pts)
        if n < 2:
            continue
        # Prim MST
        INF = 1e18
        intree = [False] * n
        d = [INF] * n
        par = [-1] * n
        d[0] = 0
        for _ in range(n):
            u = min((i for i in range(n) if not intree[i]),
                    key=lambda i: d[i])
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
                        par[v] = v and u or u
                        par[v] = u
    edges.sort(key=lambda e: e[0])

    # ---- pass 1: route every non-GND edge on F.Cu ----
    routed = []       # (net, [(x,y),...], width)
    failed = []       # (net, (ra,pa), (rb,pb))
    for L, net, (ra, pa), (rb, pb) in edges:
        _bp.clear()
        sc, _ = pad_cells_of(ra, pa)
        gc, _ = pad_cells_of(rb, pb)
        _, aend = pad_cells_of(ra, pa)
        _, bend = pad_cells_of(rb, pb)
        path = maze_route(grid, net, sc, gc)
        if path is None:
            failed.append((net, (ra, pa), (rb, pb)))
        else:
            mark_path(grid, net, path)
            # land exactly on pad centres (grid snap otherwise leaves a
            # sub-mm stub that reads as unconnected / too-close to the pad)
            pts = [aend] + [cell_to_xy(ix, iy) for ix, iy in simplify(path)] \
                + [bend]
            w = POWER_W if net in POWER_NETS else TRACE_W
            routed.append((net, pts, w))

    # ---- pass 2: route the failed edges as B.Cu jumpers ----
    # Longest first: the long U1(centre)->edge-header jumpers need clear
    # B.Cu space; if short ones grab it first the long ones get boxed in.
    def edge_len(e):
        _net, (ra, pa), (rb, pb) = e
        ax, ay, _ = pad_info(ra, pa)
        bx, by, _ = pad_info(rb, pb)
        return abs(ax - bx) + abs(ay - by)
    failed.sort(key=edge_len, reverse=True)

    bgrid = build_bcu_obstacles()
    jumpers = []      # (net, [(x,y),...], [via_xy,...], (ra,pa), (rb,pb), crossed)
    direct_count = 0
    for net, (ra, pa), (rb, pb) in failed:
        _bp.clear()
        sc, aend = pad_cells_of(ra, pa)
        gc, bend = pad_cells_of(rb, pb)
        path = maze_route(bgrid, net, sc, gc)
        if path is None:
            # can't dodge other jumpers on B.Cu -> straight insulated wire.
            # Physically fine (insulated, elevated); it just crosses other
            # jumper wires, which is allowed for hand-run links.
            pts = [aend, bend]
            crossed = True
            direct_count += 1
        else:
            mark_path(bgrid, net, path)
            pts = [aend] + [cell_to_xy(ix, iy) for ix, iy in simplify(path)] \
                + [bend]
            crossed = False
        vias = []
        for (r, p), end in (((ra, pa), aend), ((rb, pb), bend)):
            ax, ay, tht = pad_info(r, p)
            if not tht:                      # SMD pad -> need F.Cu<->B.Cu via
                vias.append((ax, ay))
        jumpers.append((net, pts, vias, (ra, pa), (rb, pb), crossed))

    print("edges total:", len(edges))
    print("routed on F.Cu:", len(routed))
    print("jumpers total:", len(jumpers),
          "({} maze-routed, {} direct wire)".format(
              len(jumpers) - direct_count, direct_count))
    from collections import Counter
    print("jumper nets:", dict(Counter(j[0] for j in jumpers)))

    # ---- emit full board ----
    def seg(x1, y1, x2, y2, w, layer, net, tag):
        return ('  (segment (start {} {}) (end {} {}) (width {})'
                ' (layer "{}") (net {}) (uuid "{}"))'.format(
                    f(x1), f(y1), f(x2), f(y2), f(w), layer,
                    net_ids[net], uid(tag)))

    body = []
    # pad bridges: some footprints expose one pin as several same-numbered
    # pads (button = 2 pads per terminal, SOT-223 = split tab). Link them
    # with a short F.Cu trace so the net is copper-connected across them.
    for c in COMPS:
        if c.ref not in PLACEMENT:
            continue
        (x0, y0), angle = PLACEMENT[c.ref]
        by_num = {}
        for num, ptype, shape, lx, ly, w, h, drill, pa in FPGEOM[c.footprint]:
            ax, ay = abs_pos(x0, y0, angle, lx, ly)
            by_num.setdefault(num, []).append((ax, ay))
        for num, locs in by_num.items():
            net = c.nets.get(num)
            if net is None or len(locs) < 2:
                continue
            for k in range(len(locs) - 1):
                (x1, y1), (x2, y2) = locs[k], locs[k + 1]
                body.append(seg(x1, y1, x2, y2, TRACE_W, "F.Cu", net,
                                "br{}-{}-{}".format(c.ref, num, k)))
    for i, (net, pts, w) in enumerate(routed):
        for k in range(len(pts) - 1):
            (x1, y1), (x2, y2) = pts[k], pts[k + 1]
            body.append(seg(x1, y1, x2, y2, w, "F.Cu", net,
                            "trk{}-{}".format(i, k)))
    for i, (net, pts, vias, ea, eb, crossed) in enumerate(jumpers):
        for k in range(len(pts) - 1):
            (x1, y1), (x2, y2) = pts[k], pts[k + 1]
            body.append(seg(x1, y1, x2, y2, TRACE_W, "B.Cu", net,
                            "jmp{}-{}".format(i, k)))
        for j, (vx, vy) in enumerate(vias):
            body.append('  (via (at {} {}) (size {}) (drill {})'
                        ' (layers "F.Cu" "B.Cu") (net {}) (uuid "{}"))'
                        .format(f(vx), f(vy), f(VIA_D), f(VIA_DRILL),
                                net_ids[net], uid("jv{}-{}".format(i, j))))

    # GND pour on F.Cu (fill in KiCad with 'B'; kicad-cli won't auto-fill)
    L = PCB_CX - BOARD_W / 2 + 0.5
    R = PCB_CX + BOARD_W / 2 - 0.5
    T = PCB_CY - BOARD_H / 2 + 0.5
    B = PCB_CY + BOARD_H / 2 - 0.5
    zone = (
        '  (zone (net {}) (net_name "GND") (layer "F.Cu") (uuid "{}")\n'
        '    (hatch edge 0.5) (connect_pads (clearance 0.4))\n'
        '    (min_thickness 0.25)\n'
        '    (fill yes (thermal_gap 0.4) (thermal_bridge_width 0.6))\n'
        '    (polygon (pts (xy {} {}) (xy {} {}) (xy {} {}) (xy {} {}))))'
        .format(net_ids["GND"], uid("gndzone"),
                f(L), f(T), f(R), f(T), f(R), f(B), f(L), f(B)))
    body.append(zone)

    outline = gk.emit_pcb()
    net_decls = "\n".join('  (net {} "{}")'.format(nid, name)
                          for name, nid in sorted(net_ids.items(),
                                                  key=lambda kv: kv[1]))
    outline = outline.replace('  (net 0 "")',
                              '  (net 0 "")\n' + net_decls, 1)
    fps = "\n".join(rp.emit_footprint(c, net_ids) for c in COMPS
                    if c.ref in PLACEMENT)
    insert_at = outline.rfind(")")
    full = (outline[:insert_at] + fps + "\n" + "\n".join(body) + "\n"
            + outline[insert_at:])
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "mainboard.kicad_pcb"), "w",
              encoding="utf-8") as fh:
        fh.write(full)
    print("wrote routed mainboard.kicad_pcb")

    # ---- jumper wire list (what the builder solders by hand) ----
    lines = ["# Jumper wire list (single-sided build)",
             "",
             "หลังกัดทองแดง F.Cu แล้ว ให้เดินสายไฟหุ้มฉนวนด้านบนบอร์ด (B.Cu)",
             "ตามรายการนี้ สายกระโดดข้ามกันได้ (หุ้มฉนวน). จุดที่เป็น SMD pad",
             "มีรูเจาะ (via) ให้ร้อยสายลงไปเชื่อม F.Cu.", ""]
    lines.append("| # | net | from | to | หมายเหตุ |")
    lines.append("|---|-----|------|----|---------|")
    for i, (net, pts, vias, (ra, pa), (rb, pb), crossed) in enumerate(jumpers, 1):
        note = "สายตรง (ข้ามสายอื่น)" if crossed else "เดินอ้อม"
        if vias:
            note += " + via {} จุด".format(len(vias))
        lines.append("| {} | {} | {}.{} | {}.{} | {} |".format(
            i, net, ra, pa, rb, pb, note))
    with open(os.path.join(here, "JUMPERS.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("wrote JUMPERS.md ({} wires)".format(len(jumpers)))
