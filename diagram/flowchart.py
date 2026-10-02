"""
Legacy Stata PWT production flowchart.

Launch examples
---------------

Clean SVG using automatic routing only:

    python flowchart.py

Clean SVG using manual routes from routes.json where available:

    python flowchart.py --routes-json routes.json

Interactive recorder/editor using automatic routing as the starting point:

    python flowchart.py --recorder

Interactive recorder/editor using routes.json as the starting point:

    python flowchart.py --routes-json routes.json --recorder


Optional arguments
------------------

--routes-json FILE
    Load manual line geometry from FILE.

    Lines present in the JSON are drawn exactly from their listed points.
    Lines absent from the JSON continue to use automatic routing.

--recorder
    Enable the interactive SVG editing tools:

    - click a line to load its current geometry
    - hover to identify line and segment numbers
    - show SVG x/y coordinates
    - record route points by clicking
    - edit x/y coordinates with live preview
    - generate a ready-to-paste JSON fragment for the selected line


Typical workflow
----------------

Edit or review routes:

    python flowchart.py --routes-json routes.json --recorder

Generate the final clean figure:

    python flowchart.py --routes-json routes.json
"""



from pathlib import Path
import argparse
import json
import textwrap
import math
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(
    description="Generate the legacy Stata PWT architecture flowchart."
)
parser.add_argument(
    "--routes-json",
    type=Path,
    help=(
        "Optional JSON file with manual route geometry. Lines present in the "
        "file are drawn exactly from their recorded points; all other lines "
        "use the automatic router."
    ),
)
parser.add_argument(
    "--recorder",
    action="store_true",
    help=(
        "Embed the interactive click recorder in the SVG. Omit this flag for "
        "the clean/final SVG."
    ),
)
ARGS = parser.parse_args()

OUT = Path("/home/reitze/Data/Work/Projecten/PWT/Python_PWT/pwt_python/docs/stata_baseline/flowchart.svg")

MANUAL_ROUTES = {}
if ARGS.routes_json is not None:
    with ARGS.routes_json.open("r", encoding="utf-8") as f:
        raw_routes = json.load(f)
    if not isinstance(raw_routes, dict):
        raise ValueError("--routes-json must contain one top-level JSON object.")
    MANUAL_ROUTES = {str(k): v for k, v in raw_routes.items()}
    print(f"Loaded {len(MANUAL_ROUTES)} manual route definition(s) from {ARGS.routes_json}")

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)

W, H = 1683.78, 2383.94  # internal coordinate system retained; rendered on A4
root = ET.Element(f"{{{SVG}}}svg", {
    "width": "297mm",
    "height": "420mm",
    "viewBox": f"0 0 {W} {H}",
    "version": "1.1",
    "preserveAspectRatio": "xMidYMid meet",
})

COLORS = {
    "external": "#DDEBF7",
    "upstream": "#FCE4D6",
    "process": "#E2F0D9",
    "output": "#FFF2CC",
    "operator_fill": "#FDE9D9",
    "edge": "#2F2F2F",
    "operator": "#D9534F",
    "text": "#1F1F1F",
    # harder route colors keyed to originating cluster
    "edge_prep": "#4E6274",
    "edge_pass1": "#3E6D93",
    "edge_capital": "#A45A00",
    "edge_pass2": "#557E55",
}

# ---------------- basic SVG helpers ----------------
def rect(parent, x, y, w, h, fill, stroke="#777", sw=1.2, rx=10, dash=None):
    attrs = {
        "x": str(x), "y": str(y), "width": str(w), "height": str(h),
        "fill": fill, "stroke": stroke, "stroke-width": str(sw),
        "rx": str(rx), "ry": str(rx)
    }
    if dash:
        attrs["stroke-dasharray"] = dash
    return ET.SubElement(parent, f"{{{SVG}}}rect", attrs)

def text(parent, x, y, lines, size=18, weight=None, anchor="middle",
         fill=COLORS["text"], line_h=None):
    if isinstance(lines, str):
        lines = [lines]
    if line_h is None:
        line_h = size * 1.15
    t = ET.SubElement(parent, f"{{{SVG}}}text", {
        "x": str(x), "y": str(y), "font-family": "Arial",
        "font-size": str(size), "fill": fill, "text-anchor": anchor
    })
    if weight:
        t.set("font-weight", weight)
    start_y = y - (len(lines) - 1) * line_h / 2
    for i, line in enumerate(lines):
        sp = ET.SubElement(t, f"{{{SVG}}}tspan", {
            "x": str(x), "y": str(start_y + i * line_h)
        })
        sp.text = line
    return t

def wrap_lines(s, width_px, font_size):
    # Conservative wrap for Arial-ish text.
    chars = max(9, int(width_px / (font_size * 0.56)))
    lines = []
    for raw in s.split("\n"):
        if not raw:
            lines.append("")
        else:
            lines.extend(
                textwrap.wrap(
                    raw,
                    width=chars,
                    break_long_words=False,
                    break_on_hyphens=False,
                )
                or [""]
            )
    return lines

# ---------------- node model ----------------
class Node:
    def __init__(self, key, x, y, w, title=None, body=None, lines=None,
                 fill=COLORS["process"], stroke="#777",
                 title_size=16.5, body_size=15, plain_size=15.5,
                 min_h=62, padding=12):
        self.key = key
        self.x, self.y, self.w = x, y, w
        self.fill, self.stroke = fill, stroke
        self.title, self.body, self.lines = title, body or [], lines
        self.title_size, self.body_size, self.plain_size = title_size, body_size, plain_size
        self.padding = padding

        if title is not None:
            title_lines = wrap_lines(title, w - 2 * padding, title_size)
            body_lines = []
            for b in self.body:
                body_lines += wrap_lines(b, w - 2 * padding, body_size)
            n = len(title_lines) + len(body_lines)
            line_h = max(title_size, body_size) * 1.18
            self.h = max(min_h, 2 * padding + n * line_h + (5 if body_lines else 0))
            self._title_lines = title_lines
            self._body_lines = body_lines
        else:
            all_lines = []
            for s in (lines or []):
                all_lines += wrap_lines(s, w - 2 * padding, plain_size)
            line_h = plain_size * 1.18
            self.h = max(min_h, 2 * padding + len(all_lines) * line_h)
            self._plain_lines = all_lines

    @property
    def left(self): return self.x
    @property
    def right(self): return self.x + self.w
    @property
    def top(self): return self.y
    @property
    def bottom(self): return self.y + self.h
    @property
    def cx(self): return self.x + self.w / 2
    @property
    def cy(self): return self.y + self.h / 2

    def draw(self, parent):
        rect(parent, self.x, self.y, self.w, self.h, self.fill, self.stroke, 1.2, 9)
        if self.title is not None:
            line_h_t = self.title_size * 1.18
            line_h_b = self.body_size * 1.18
            gap = 6 if self._body_lines else 0
            total = len(self._title_lines) * line_h_t + gap + len(self._body_lines) * line_h_b
            baseline = self.cy - total / 2 + line_h_t * 0.82

            for i, line in enumerate(self._title_lines):
                t = ET.SubElement(parent, f"{{{SVG}}}text", {
                    "x": str(self.cx),
                    "y": str(baseline + i * line_h_t),
                    "font-family": "Arial",
                    "font-size": str(self.title_size),
                    "font-weight": "bold",
                    "fill": COLORS["text"],
                    "text-anchor": "middle",
                })
                t.text = line

            body_start = baseline + len(self._title_lines) * line_h_t + gap
            for i, line in enumerate(self._body_lines):
                t = ET.SubElement(parent, f"{{{SVG}}}text", {
                    "x": str(self.cx),
                    "y": str(body_start + i * line_h_b),
                    "font-family": "Arial",
                    "font-size": str(self.body_size),
                    "fill": COLORS["text"],
                    "text-anchor": "middle",
                })
                t.text = line
        else:
            line_h = self.plain_size * 1.18
            total = len(self._plain_lines) * line_h
            baseline = self.cy - total / 2 + line_h * 0.82
            for i, line in enumerate(self._plain_lines):
                t = ET.SubElement(parent, f"{{{SVG}}}text", {
                    "x": str(self.cx),
                    "y": str(baseline + i * line_h),
                    "font-family": "Arial",
                    "font-size": str(self.plain_size),
                    "fill": COLORS["text"],
                    "text-anchor": "middle",
                })
                t.text = line

nodes = {}
def add_node(key, x, y, w, **kwargs):
    n = Node(key, x, y, w, **kwargs)
    nodes[key] = n
    return n

# ---------------- defs and layers ----------------
defs = ET.SubElement(root, f"{{{SVG}}}defs")

style = ET.SubElement(defs, f"{{{SVG}}}style", {"type": "text/css"})
style.text = """
.edge-visible {
    transition: stroke-width 0.08s ease, opacity 0.08s ease;
}
.edge-visible.edge-hover {
    stroke-width: 5.2 !important;
    opacity: 1 !important;
}
.edge-visible.edge-selected {
    stroke-width: 4.3 !important;
    opacity: 1 !important;
}
.edge-hover-clone,
.edge-pinned-clone {
    stroke-width: 5.2 !important;
    opacity: 1 !important;
    pointer-events: none;
}
.edge-hit {
    fill: none;
    stroke: #000000;
    stroke-width: 14;
    stroke-opacity: 0.001;
    pointer-events: stroke;
    cursor: crosshair;
}
"""
ARROW_MARKERS = {
    "arrowGray": COLORS["edge"],
    "arrowRed": COLORS["operator"],
    "arrowPrep": COLORS["edge_prep"],
    "arrowPass1": COLORS["edge_pass1"],
    "arrowCapital": COLORS["edge_capital"],
    "arrowPass2": COLORS["edge_pass2"],
}
for mid, color in ARROW_MARKERS.items():
    marker = ET.SubElement(defs, f"{{{SVG}}}marker", {
        "id": mid, "markerWidth": "10", "markerHeight": "8",
        "refX": "10", "refY": "4", "orient": "auto",
        "markerUnits": "strokeWidth"
    })
    ET.SubElement(marker, f"{{{SVG}}}path", {
        "d": "M 0 0 L 10 4 L 0 8 z", "fill": color
    })

background_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "background"})
cluster_fill_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "cluster_fills"})
edge_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "edges"})
edge_hit_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "edge_hit_areas"})
node_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "nodes"})
cluster_border_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "cluster_borders"})
hover_edge_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "hover_edges", "pointer-events": "none"})
overlay_layer = ET.SubElement(root, f"{{{SVG}}}g", {"id": "overlay"})

rect(background_layer, 0, 0, W, H, "white", "white", 0, 0)
text(overlay_layer, 36, 50, "Legacy Stata PWT production flow", size=31, weight="bold", anchor="start")

# ---------------- clusters ----------------
clusters = {
    "prep": (55, 175, 1030, 520, "#EEF2F5", "#66747F",
             "Preparation sequence recorded in gen_pwt110.do — commented out in the inspected master"),
    "pass1": (235, 755, 760, 500, "#EDF6FD", "#5E829E",
              "First gen_pwt110 pass / capital handoff"),
    "capital": (1160, 175, 465, 1010, "#FFF3E2", "#B97717",
                "Separately operated capital sequence"),
    "pass2": (390, 1395, 1110, 600, "#EEF8EE", "#5F875F",
              "Second / final gen_pwt110 run"),
}
for _, (x, y, w, h, fill, stroke, label) in clusters.items():
    rect(cluster_fill_layer, x, y, w, h, fill, "none", 0, 12)
    rect(cluster_border_layer, x, y, w, h, "none", stroke, 1.7, 12, "4,5")

    # Tight opaque background behind the cluster title only. This keeps the
    # title readable without masking more of the underlying arrows than needed.
    label_font_size = 20
    label_line_h = 24
    label_pad_x = 8
    label_pad_y = 6
    label_x = x + 16
    label_y = y + 23

    label_lines = wrap_lines(label, w - 40, label_font_size)
    longest_line_px = max(
        len(line) * label_font_size * 0.56 for line in label_lines
    )
    label_box_w = min(w - 24, longest_line_px + 2 * label_pad_x)
    label_box_h = len(label_lines) * label_line_h + 2 * label_pad_y

    label_bg = rect(
        cluster_border_layer,
        label_x - label_pad_x,
        label_y - label_font_size - label_pad_y + 3,
        label_box_w,
        label_box_h,
        fill,
        "none",
        0,
        4,
    )
    label_bg.set("pointer-events", "none")

    label_text = ET.SubElement(cluster_border_layer, f"{{{SVG}}}text", {
        "x": str(label_x),
        "y": str(label_y),
        "font-family": "Arial",
        "font-size": str(label_font_size),
        "font-weight": "bold",
        "fill": stroke,
        "text-anchor": "start",
        "pointer-events": "none"
    })
    for i, line in enumerate(label_lines):
        tspan = ET.SubElement(label_text, f"{{{SVG}}}tspan", {
            "x": str(label_x),
            "y": str(label_y + i * label_line_h)
        })
        tspan.text = line

# ---------------- nodes ----------------
# external inputs
add_node("in_hc", 330, 85, 205, lines=["Schooling", "provider / reference inputs"],
         fill=COLORS["external"], plain_size=15)
add_node("in_lab", 70, 85, 190, lines=["Labor", "provider / reference inputs"],
         fill=COLORS["external"], plain_size=15)
add_node("in_na", 610, 85, 175, lines=["NA / employment", "provider inputs"],
         fill=COLORS["external"], plain_size=15)
add_node("in_ppp", 900, 85, 220, lines=["PPP / trade", "provider / reference inputs"],
         fill=COLORS["external"], plain_size=15)
add_node("in_cap", 1280, 80, 265,
         lines=["Capital-specific inputs", "ICP / UNIDO / Comtrade / TED / parameters"],
         fill=COLORS["external"], plain_size=14.5, min_h=70)

# cluster 1
# Geometry-only redesign: open the center around high-traffic NA and move
# lower-traffic/end-point nodes toward the cluster edges. Routing logic is
# unchanged from flowchart19.
add_node("na", 430, 225, 260, title="NA",
         body=["national accounts + employment"], fill=COLORS["process"])
add_node("lab", 180, 350, 170, title="LAB", body=["labor shares"], fill=COLORS["process"])
add_node("hc", 285, 455, 170, title="HC", body=["schooling"], fill=COLORS["process"])
add_node("ppp", 800, 560, 275, title="PPP",
         body=["benchmark / regional PPP preparation", "+ asset-price interfaces"],
         fill=COLORS["process"])
add_node("trade", 825, 255, 175, title="TRADE",
         body=["BEC conversion + trade totals"], fill=COLORS["process"])
add_node("corr", 125, 570, 190, title="Expenditure\ncorrelations",
         body=["gen_esh_cor"], fill=COLORS["process"])

# cluster 2
# Geometry-only redesign: move preliminary GDP left and group the PPP/capital
# handoff path on the right, giving the router a wider central corridor.
add_node("combined1", 620, 805, 260, title="Combined PPP synthesis",
         body=["first pass", "gen_ppp_ts"], fill=COLORS["process"])
add_node("prelim1", 340, 1035, 190, title="Preliminary GDP / absorption",
         body=["current + chained aggregates"], fill=COLORS["process"])
add_node("geks", 735, 960, 220,
         lines=["geks_all.csv", "(source classification)"],
         fill=COLORS["output"], plain_size=15)
add_node("cgdpo", 720, 1100, 235,
         lines=["cgdpo_matlab_in.csv", "(capital handoff)"],
         fill=COLORS["output"], plain_size=15)

# cluster 3
add_node("cfm", 1185, 230, 310, title="CFM preparation / calculation",
         body=["4 Stata do-files; manual / commented calls"], fill=COLORS["process"])
add_node("invcfm", 1330, 430, 150, lines=["inv_cfm.csv"],
         fill=COLORS["output"], plain_size=15)
add_node("cap_inputs", 1200, 650, 385,
         lines=["Capital upstream interfaces",
                "NA + LAB + geks_all + preliminary GDP",
                "PPP asset prices + CFM + capital raw/reference inputs"],
         fill=COLORS["upstream"], plain_size=14.5, min_h=95)
add_node("batch", 1250, 825, 240, title="BATCH_k.m",
         body=["investment → stocks → services",
               "capital PPPs → aggregation + detail"], fill=COLORS["process"])
add_node("repeat", 1505, 825, 105,
         lines=["Operator instruction:", "run BATCH_k at least twice"],
         fill=COLORS["operator_fill"], stroke="#B97717",
         plain_size=14.5, min_h=126, padding=10)
add_node("kdetail", 1215, 1105, 155, lines=["k_detail_alt.csv"],
         fill=COLORS["output"], plain_size=14.5)
add_node("kagg", 1420, 1105, 155, lines=["k_aggregate.csv"],
         fill=COLORS["output"], plain_size=14.5)

# rerun bridge
add_node("rerun", 1115, 1260, 330,
         lines=["Operator reruns whole gen_pwt110",
                "with newly produced capital results available"],
         fill=COLORS["operator_fill"], stroke="#B97717", plain_size=14.5)

# detail lane
add_node("detail_inputs", 55, 1310, 285,
         lines=["Detail-package inputs",
                "NA + employment + schooling + LAB detail + k_detail_alt"],
         fill=COLORS["upstream"], plain_size=14.5, min_h=84)
add_node("detail", 95, 1665, 205, title="Detail packaging",
         body=["gen_detail_pwt"], fill=COLORS["process"])
add_node("detail_out", 90, 2110, 220,
         lines=["NA / labor / capital", "detail datasets"],
         fill=COLORS["output"], plain_size=14.5)

# cluster 4
add_node("combined2", 455, 1460, 245, title="Combined PPP synthesis",
         body=["rerun", "gen_ppp_ts"], fill=COLORS["process"])
add_node("prelim2", 795, 1460, 255, title="Preliminary GDP / absorption",
         body=["recalculated"], fill=COLORS["process"])
add_node("import", 1140, 1450, 300, title="Import capital + merge LAB / HC",
         body=["k_aggregate + labor shares + schooling"], fill=COLORS["process"])
add_node("finalcalc", 1135, 1665, 300, title="Final PWT assembly",
         body=["human capital + productivity + identifiers",
               "+ observation adjustments"], fill=COLORS["process"])
add_node("mergecorr", 805, 1670, 260, title="Merge expenditure correlations",
         body=[], fill=COLORS["process"])
add_node("finalvars", 455, 1665, 285, title="Final variable selection",
         body=["+ optional price-level normalization"], fill=COLORS["process"])
add_node("publication", 475, 1865, 245, title="Publication packaging",
         body=["gen_final_pwt"], fill=COLORS["process"])

# outputs
add_node("pwtpub", 430, 2110, 315,
         lines=["PWT 11.0 publication",
                "pwt110.dta / .xlsx / application .xlsx"],
         fill=COLORS["output"], plain_size=14.5)
add_node("trade_detail", 925, 2110, 240,
         lines=["pwt110_trade_detail.dta"],
         fill=COLORS["output"], plain_size=14.5)

# ---------------- routing ----------------
CLEAR = 3.0  # hard routing margin around unrelated node boxes
DOCK_PAD = 11.0  # keep arrow docking points off rounded-corner arcs (node rx=9)
PARALLEL_MARGIN = 22.0
LONG_PARALLEL_DISTANCE = 15.0
LONG_PARALLEL_OVERLAP = 30.0
HARD_PARALLEL_DISTANCE = 12.0
HARD_PARALLEL_OVERLAP = 30.0
CLUSTER_BORDER_MARGIN = 12.0
CLUSTER_BORDER_MIN_OVERLAP = 30.0
ARROW_GAP = 0.0  # path endpoint = target-box boundary; arrowhead tip lands here
existing_segments = []

# Optional fixed departure ports for selected edges.
# Fractions are measured from top to bottom on a vertical side, or
# left to right on a horizontal side.
FORCED_SOURCE_PORTS = {
    ("na", "lab"): ("left", 0.66),           # left side, below midpoint
    ("na", "detail_inputs"): ("left", 0.34), # left side, above midpoint
}


NODE_CLUSTER = {
    # cluster 1
    "na": "prep", "lab": "prep", "hc": "prep", "ppp": "prep", "trade": "prep", "corr": "prep",
    # cluster 2
    "combined1": "pass1", "prelim1": "pass1", "geks": "pass1", "cgdpo": "pass1",
    # cluster 3
    "cfm": "capital", "invcfm": "capital", "cap_inputs": "capital", "batch": "capital",
    "repeat": "capital", "kdetail": "capital", "kagg": "capital", "rerun": "capital",
    # cluster 4
    "combined2": "pass2", "prelim2": "pass2", "import": "pass2", "finalcalc": "pass2",
    "mergecorr": "pass2", "finalvars": "pass2", "publication": "pass2",
}

CLUSTER_EDGE_STYLE = {
    "prep": (COLORS["edge_prep"], "arrowPrep"),
    "pass1": (COLORS["edge_pass1"], "arrowPass1"),
    "capital": (COLORS["edge_capital"], "arrowCapital"),
    "pass2": (COLORS["edge_pass2"], "arrowPass2"),
}

def edge_style_for(src, dst, red=False, dashed=False):
    if red:
        return COLORS["operator"], "arrowRed"
    cluster = NODE_CLUSTER.get(src)
    if cluster is None:
        return COLORS["edge"], "arrowGray"
    # Keep external -> cluster and clearly outside-of-cluster relations black.
    return CLUSTER_EDGE_STYLE.get(cluster, (COLORS["edge"], "arrowGray"))

def orientation(a, b):
    if abs(a[0] - b[0]) < 1e-6: return "v"
    if abs(a[1] - b[1]) < 1e-6: return "h"
    return "d"

def seg_len(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def segment_intersects_rect(a, b, n, clearance=CLEAR):
    x1, y1 = a; x2, y2 = b
    L = n.left - clearance
    R = n.right + clearance
    T = n.top - clearance
    B = n.bottom + clearance
    if orientation(a, b) == "v":
        x = x1
        lo, hi = sorted((y1, y2))
        return (L < x < R) and (max(lo, T) < min(hi, B))
    elif orientation(a, b) == "h":
        y = y1
        lo, hi = sorted((x1, x2))
        return (T < y < B) and (max(lo, L) < min(hi, R))
    return True

def proper_cross(seg1, seg2):
    a, b = seg1; c, d = seg2
    o1, o2 = orientation(a, b), orientation(c, d)
    if "d" in (o1, o2) or o1 == o2:
        return False
    if o1 == "v":
        vx = a[0]
        hy = c[1]
        hlo, hhi = sorted((c[0], d[0]))
        vlo, vhi = sorted((a[1], b[1]))
    else:
        vx = c[0]
        hy = a[1]
        hlo, hhi = sorted((a[0], b[0]))
        vlo, vhi = sorted((c[1], d[1]))
    return hlo < vx < hhi and vlo < hy < vhi

def parallel_penalty(seg, other):
    a, b = seg; c, d = other
    o = orientation(a, b)

    if o != orientation(c, d) or o == "d":
        return 0.0

    if o == "v":
        dist = abs(a[0] - c[0])
        if dist >= PARALLEL_MARGIN:
            return 0.0
        lo = max(min(a[1], b[1]), min(c[1], d[1]))
        hi = min(max(a[1], b[1]), max(c[1], d[1]))
    else:
        dist = abs(a[1] - c[1])
        if dist >= PARALLEL_MARGIN:
            return 0.0
        lo = max(min(a[0], b[0]), min(c[0], d[0]))
        hi = min(max(a[0], b[0]), max(c[0], d[0]))

    overlap = max(0.0, hi - lo)
    if overlap <= 0:
        return 0.0

    # Existing general spacing penalty.
    penalty = overlap * (PARALLEL_MARGIN - dist) * 2.2

    # Additional strong penalty only for long, genuinely close runs.
    # This is intended to break up dense bundles without disturbing brief
    # near-parallel approaches around shared source/target areas.
    if overlap >= LONG_PARALLEL_OVERLAP and dist < LONG_PARALLEL_DISTANCE:
        penalty += (
            (overlap - LONG_PARALLEL_OVERLAP + 1.0)
            * (LONG_PARALLEL_DISTANCE - dist)
            * 18.0
        )

    return penalty

def long_close_parallel_conflict(seg, other):
    """
    Return True when two distinct parallel segments would run very close
    together for a substantial distance.

    Exact collinear overlap is already forbidden separately; this handles
    the visually ambiguous 'almost the same line' case.
    """
    a, b = seg
    c, d = other

    o = orientation(a, b)
    if o != orientation(c, d) or o == "d":
        return False

    if o == "v":
        dist = abs(a[0] - c[0])
        if dist >= HARD_PARALLEL_DISTANCE:
            return False
        lo = max(min(a[1], b[1]), min(c[1], d[1]))
        hi = min(max(a[1], b[1]), max(c[1], d[1]))
    else:
        dist = abs(a[1] - c[1])
        if dist >= HARD_PARALLEL_DISTANCE:
            return False
        lo = max(min(a[0], b[0]), min(c[0], d[0]))
        hi = min(max(a[0], b[0]), max(c[0], d[0]))

    overlap = max(0.0, hi - lo)
    return overlap >= HARD_PARALLEL_OVERLAP


def compress(points):
    out = [points[0]]
    for p in points[1:]:
        if p != out[-1]:
            out.append(p)
    changed = True
    while changed and len(out) > 2:
        changed = False
        tmp = [out[0]]
        for i in range(1, len(out) - 1):
            if orientation(tmp[-1], out[i]) == orientation(out[i], out[i + 1]):
                changed = True
                continue
            tmp.append(out[i])
        tmp.append(out[-1])
        out = tmp
    return out

def move_toward(p_from, p_to, gap):
    x1, y1 = p_from
    x2, y2 = p_to
    if abs(x1 - x2) < 1e-6:
        if y2 > y1:
            return (x2, y2 - gap)
        else:
            return (x2, y2 + gap)
    elif abs(y1 - y2) < 1e-6:
        if x2 > x1:
            return (x2 - gap, y2)
        else:
            return (x2 + gap, y2)
    return (x2, y2)

def point_on_side(n, side, frac):
    if side == "top":
        return (n.left + n.w * frac, n.top)
    if side == "bottom":
        return (n.left + n.w * frac, n.bottom)
    if side == "left":
        return (n.left, n.top + n.h * frac)
    return (n.right, n.top + n.h * frac)


def side_ports(n, side):
    frac = [0.18, 0.34, 0.50, 0.66, 0.82]
    # Keep ports away from rounded corners.
    return [point_on_side(n, side, f) for f in frac]

def candidate_side_pairs(src, dst):
    """
    Consider every source/target side combination equally for bent routes.

    There is deliberately no preference for side-to-side, top-to-bottom,
    or mixed side-to-top/bottom connections. Straight routes are handled
    separately and already benefit naturally from having zero bends.
    """
    sides = ("top", "right", "bottom", "left")
    return [(source_side, target_side)
            for source_side in sides
            for target_side in sides]

def straight_candidate(src, dst):
    S, T = nodes[src], nodes[dst]
    cands = []
    # Vertical only if the FLAT top/bottom portions overlap.
    # This prevents the arrow tip from landing on a rounded-corner arc.
    left = max(S.left + DOCK_PAD, T.left + DOCK_PAD)
    right = min(S.right - DOCK_PAD, T.right - DOCK_PAD)
    if left <= right:
        x = max(left, min((S.cx + T.cx) / 2, right))
        if T.cy >= S.cy:
            start = (x, S.bottom)
            dock = (x, T.top)
        else:
            start = (x, S.top)
            dock = (x, T.bottom)
        end = move_toward(start, dock, ARROW_GAP)
        cands.append((start, [start, end], dock))

    # Horizontal only if the FLAT left/right portions overlap.
    top = max(S.top + DOCK_PAD, T.top + DOCK_PAD)
    bottom = min(S.bottom - DOCK_PAD, T.bottom - DOCK_PAD)
    if top <= bottom:
        y = max(top, min((S.cy + T.cy) / 2, bottom))
        if T.cx >= S.cx:
            start = (S.right, y)
            dock = (T.left, y)
        else:
            start = (S.left, y)
            dock = (T.right, y)
        end = move_toward(start, dock, ARROW_GAP)
        cands.append((start, [start, end], dock))
    return cands

def side_segment_orientation(side):
    """Required orientation of a segment leaving/entering this box side."""
    return "v" if side in ("top", "bottom") else "h"


def candidate_matches_sides(points, source_side, target_side):
    """
    Enforce perpendicular departure/arrival:
      - top/bottom side -> vertical segment
      - left/right side -> horizontal segment
    """
    pts = compress(points)
    if len(pts) < 2:
        return False

    first_orientation = orientation(pts[0], pts[1])
    final_orientation = orientation(pts[-2], pts[-1])

    return (
        first_orientation == side_segment_orientation(source_side)
        and final_orientation == side_segment_orientation(target_side)
    )


def one_and_two_bend_candidates(src, dst):
    S, T = nodes[src], nodes[dst]
    cands = []
    forced = FORCED_SOURCE_PORTS.get((src, dst))

    # All target sides remain free. For selected edges, only the explicitly
    # assigned source side/port is allowed.
    for sside, tside in candidate_side_pairs(src, dst):
        if forced is not None:
            forced_side, forced_frac = forced
            if sside != forced_side:
                continue
            s_ports = [point_on_side(S, forced_side, forced_frac)]
        else:
            s_ports = side_ports(S, sside)

        t_ports = side_ports(T, tside)

        for sp in s_ports:
            for dock in t_ports:
                # One bend: H->V.
                p1 = (dock[0], sp[1])
                route = compress([sp, p1, dock])
                if candidate_matches_sides(route, sside, tside):
                    cands.append((sp, route, dock))

                # One bend: V->H.
                p2 = (sp[0], dock[1])
                route = compress([sp, p2, dock])
                if candidate_matches_sides(route, sside, tside):
                    cands.append((sp, route, dock))

                # Two bends with a horizontal middle trunk:
                # V -> H -> V.
                midy = (sp[1] + dock[1]) / 2
                route = compress([
                    sp,
                    (sp[0], midy),
                    (dock[0], midy),
                    dock,
                ])
                if candidate_matches_sides(route, sside, tside):
                    cands.append((sp, route, dock))

                # Two bends with a vertical middle trunk:
                # H -> V -> H.
                midx = (sp[0] + dock[0]) / 2
                route = compress([
                    sp,
                    (midx, sp[1]),
                    (midx, dock[1]),
                    dock,
                ])
                if candidate_matches_sides(route, sside, tside):
                    cands.append((sp, route, dock))

    return cands

def path_valid(points, src, dst):
    segments = list(zip(points[:-1], points[1:]))
    if any(orientation(a, b) == "d" for a, b in segments):
        return False
    # Hard node avoidance: no unrelated node box may be crossed or hidden behind.
    for a, b in segments:
        for key, n in nodes.items():
            if key in (src, dst):
                continue
            if segment_intersects_rect(a, b, n):
                return False
    return True

def collinear_overlap_length(seg1, seg2):
    """
    Positive overlap length for exactly collinear horizontal/vertical segments.
    A single-point touch returns 0 and remains allowed.
    """
    a, b = seg1
    c, d = seg2

    o1 = orientation(a, b)
    o2 = orientation(c, d)

    if o1 != o2 or o1 == "d":
        return 0.0

    if o1 == "v":
        if abs(a[0] - c[0]) > 1e-9:
            return 0.0
        lo = max(min(a[1], b[1]), min(c[1], d[1]))
        hi = min(max(a[1], b[1]), max(c[1], d[1]))
        return max(0.0, hi - lo)

    if abs(a[1] - c[1]) > 1e-9:
        return 0.0
    lo = max(min(a[0], b[0]), min(c[0], d[0]))
    hi = min(max(a[0], b[0]), max(c[0], d[0]))
    return max(0.0, hi - lo)


def cluster_border_parallel_penalty(seg):
    """
    Discourage red operator/control paths from tracing cluster borders.

    Crossing a cluster border is fine. Only long, nearby parallel runs are
    penalized.
    """
    a, b = seg
    o = orientation(a, b)

    if o == "d":
        return 0.0

    penalty = 0.0

    for _, (x, y, w, h, _fill, _stroke, _label) in clusters.items():
        left = x
        right = x + w
        top = y
        bottom = y + h

        if o == "v":
            seg_lo, seg_hi = sorted((a[1], b[1]))
            overlap = max(0.0, min(seg_hi, bottom) - max(seg_lo, top))
            if overlap < CLUSTER_BORDER_MIN_OVERLAP:
                continue

            dist = min(abs(a[0] - left), abs(a[0] - right))
            if dist < CLUSTER_BORDER_MARGIN:
                penalty += (
                    (overlap - CLUSTER_BORDER_MIN_OVERLAP + 1.0)
                    * (CLUSTER_BORDER_MARGIN - dist)
                    * 20.0
                )

        elif o == "h":
            seg_lo, seg_hi = sorted((a[0], b[0]))
            overlap = max(0.0, min(seg_hi, right) - max(seg_lo, left))
            if overlap < CLUSTER_BORDER_MIN_OVERLAP:
                continue

            dist = min(abs(a[1] - top), abs(a[1] - bottom))
            if dist < CLUSTER_BORDER_MARGIN:
                penalty += (
                    (overlap - CLUSTER_BORDER_MIN_OVERLAP + 1.0)
                    * (CLUSTER_BORDER_MARGIN - dist)
                    * 20.0
                )

    return penalty


def route_score(points, src, dst, dock, avoid_cluster_borders=False):
    segments = list(zip(points[:-1], points[1:]))
    if not path_valid(points, src, dst):
        return 1e12

    score = 0.0
    bends = max(0, len(points) - 2)
    total_len = sum(seg_len(a, b) for a, b in segments)
    direct = abs(nodes[src].cx - nodes[dst].cx) + abs(nodes[src].cy - nodes[dst].cy)
    detour = max(0.0, total_len - direct)

    # Routing preference hierarchy:
    # 1. hard validity constraints are handled above/below;
    # 2. strongly prefer fewer bends;
    # 3. strongly prefer fewer line crossings;
    # 4. use spacing, clearance and path length to distinguish the remainder.
    #
    # There is intentionally NO source/target side-pair preference. A straight
    # side-to-side or top-to-bottom route already wins naturally through its
    # zero bend count; once a bend is required, mixed side connections are
    # just as valid as any other orientation.
    score += bends * 520.0
    score += total_len * 0.12
    score += detour * 0.22

    # Crossing penalty: relaxed, but still mildly discouraged.
    for seg in segments:
        for other in existing_segments:
            # Exact shared collinear segments are forbidden: otherwise two
            # dependencies visually merge into a single line. Touching at one
            # point is still allowed.
            if collinear_overlap_length(seg, other) > 1e-9:
                return 1e12

            # A long, very close parallel run is considered visually
            # ambiguous and is therefore rejected. A clean crossing is still
            # allowed and preferred over this kind of near-overlap.
            if long_close_parallel_conflict(seg, other):
                return 1e12

            if proper_cross(seg, other):
                # A clean crossing remains allowed, but should lose to an
                # otherwise comparable route that avoids the crossing.
                score += 450.0

            # Less severe near-parallel cases still use the softer spacing
            # penalty from flowchart18.
            score += parallel_penalty(seg, other)

        # Apply cluster-border avoidance to ALL arrows, not just red control
        # paths. Crossing a cluster border remains fine; only long nearby
        # parallel runs are discouraged.
        score += cluster_border_parallel_penalty(seg)

    # Keep lines a bit away from unrelated boxes even if they do not intersect.
    for a, b in segments:
        o = orientation(a, b)
        if o == "v":
            x = a[0]
            lo, hi = sorted((a[1], b[1]))
            for key, n in nodes.items():
                if key in (src, dst): 
                    continue
                if lo < n.bottom and hi > n.top:
                    d = min(abs(x - n.left), abs(x - n.right))
                    if d < CLEAR * 1.8:
                        score += (CLEAR * 1.8 - d) * 80
        elif o == "h":
            y = a[1]
            lo, hi = sorted((a[0], b[0]))
            for key, n in nodes.items():
                if key in (src, dst): 
                    continue
                if lo < n.right and hi > n.left:
                    d = min(abs(y - n.top), abs(y - n.bottom))
                    if d < CLEAR * 1.8:
                        score += (CLEAR * 1.8 - d) * 80

    # Mild preference for docking near the midpoint of the appropriate side.
    T = nodes[dst]
    if abs(dock[0] - T.left) < 1e-6 or abs(dock[0] - T.right) < 1e-6:
        score += abs(dock[1] - T.cy) * 0.05
    else:
        score += abs(dock[0] - T.cx) * 0.05

    return score

def best_route(src, dst, avoid_cluster_borders=False):
    candidates = []

    if (src, dst) not in FORCED_SOURCE_PORTS:
        for start, pts, dock in straight_candidate(src, dst):
            candidates.append((pts, dock))

    for candidate in one_and_two_bend_candidates(src, dst):
        start, pts, dock = candidate
        candidates.append((pts, dock))

    valid = []
    for pts, dock in candidates:
        pts = compress(pts)
        score = route_score(pts, src, dst, dock, avoid_cluster_borders=avoid_cluster_borders)
        if score < 1e11:
            valid.append((score, pts, dock))
    if not valid:
        # For a forced-source edge, keep the requested departure point even in
        # permissive fallback mode. Choose the simplest generated orthogonal
        # candidate without enforcing box avoidance.
        if (src, dst) in FORCED_SOURCE_PORTS:
            fallback = []
            for _start, pts, dock in one_and_two_bend_candidates(src, dst):
                pts = compress(pts)
                bends = max(0, len(pts) - 2)
                total_len = sum(seg_len(a, b) for a, b in zip(pts[:-1], pts[1:]))
                fallback.append((bends, total_len, pts, dock))

            if fallback:
                fallback.sort(key=lambda item: (item[0], item[1]))
                _bends, _length, pts, dock = fallback[0]
                print(
                    f"WARNING: permissive fallback route used: {src} -> {dst} "
                    f"(may cross another node box)"
                )
                return pts, dock

        # Permissive fallback for diagnostics:
        # draw the simplest orthogonal route even if it crosses another node.
        # These cases are printed so they can be reviewed explicitly.
        S, T = nodes[src], nodes[dst]

        # Prefer a straight vertical route only when the FLAT portions
        # of source/target top-bottom edges overlap.
        left = max(S.left + DOCK_PAD, T.left + DOCK_PAD)
        right = min(S.right - DOCK_PAD, T.right - DOCK_PAD)
        if left <= right:
            x = (left + right) / 2
            if T.cy >= S.cy:
                pts = [(x, S.bottom), (x, T.top)]
                dock = (x, T.top)
            else:
                pts = [(x, S.top), (x, T.bottom)]
                dock = (x, T.bottom)

        # Otherwise prefer a straight horizontal route only when the FLAT
        # portions of source/target left-right edges overlap.
        else:
            top = max(S.top + DOCK_PAD, T.top + DOCK_PAD)
            bottom = min(S.bottom - DOCK_PAD, T.bottom - DOCK_PAD)
            if top <= bottom:
                y = (top + bottom) / 2
                if T.cx >= S.cx:
                    pts = [(S.right, y), (T.left, y)]
                    dock = (T.left, y)
                else:
                    pts = [(S.left, y), (T.right, y)]
                    dock = (T.right, y)

            # Otherwise use the simplest route that remains perpendicular
            # to BOTH the source side and the target side.
            else:
                if abs(T.cy - S.cy) >= abs(T.cx - S.cx):
                    # Mostly vertical relationship:
                    # V -> H -> V, leaving/arriving on horizontal borders.
                    if T.cy >= S.cy:
                        start = (S.cx, S.bottom)
                        dock = (T.cx, T.top)
                    else:
                        start = (S.cx, S.top)
                        dock = (T.cx, T.bottom)

                    midy = (start[1] + dock[1]) / 2
                    pts = [
                        start,
                        (start[0], midy),
                        (dock[0], midy),
                        dock,
                    ]

                else:
                    # Mostly horizontal relationship:
                    # H -> V -> H, leaving/arriving on vertical borders.
                    if T.cx >= S.cx:
                        start = (S.right, S.cy)
                        dock = (T.left, T.cy)
                    else:
                        start = (S.left, S.cy)
                        dock = (T.right, T.cy)

                    midx = (start[0] + dock[0]) / 2
                    pts = [
                        start,
                        (midx, start[1]),
                        (midx, dock[1]),
                        dock,
                    ]

        pts = compress(pts)
        print(
            f"WARNING: permissive fallback route used: {src} -> {dst} "
            f"(may cross another node box)"
        )
        return pts, dock
    valid.sort(key=lambda x: x[0])
    return valid[0][1], valid[0][2]

def manual_points_for_line(line_no):
    """Return exact manual route points for this line, or None."""
    spec = MANUAL_ROUTES.get(str(line_no))
    if spec is None:
        return None

    if not isinstance(spec, dict):
        raise ValueError(
            f"Manual route {line_no} must be an object containing a 'points' list."
        )

    raw_points = spec.get("points")
    if not isinstance(raw_points, list) or len(raw_points) < 2:
        raise ValueError(
            f"Manual route {line_no} must contain at least two points."
        )

    points = []
    for i, point in enumerate(raw_points, start=1):
        if not isinstance(point, dict) or "x" not in point or "y" not in point:
            raise ValueError(
                f"Manual route {line_no}, point {i}, must contain numeric x and y."
            )
        try:
            x = float(point["x"])
            y = float(point["y"])
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Manual route {line_no}, point {i}, has non-numeric x/y."
            ) from exc
        points.append((x, y))

    # Manual geometry is authoritative, so do not auto-correct it.
    # Warn about diagonal segments because the visual convention is orthogonal.
    for seg_no, (a, b) in enumerate(zip(points[:-1], points[1:]), start=1):
        if orientation(a, b) == "d":
            print(
                f"WARNING: manual route line {line_no}.{seg_no} is diagonal: "
                f"{a} -> {b}"
            )

    return points


def draw_edge(src, dst, line_no, red=False, dashed=False):
    manual_pts = manual_points_for_line(line_no)
    if manual_pts is not None:
        pts = manual_pts
        route_mode = "manual"
        print(
            f"MANUAL ROUTE: line {line_no}: {src} -> {dst} "
            f"({len(pts)} points)"
        )
    else:
        pts, _dock = best_route(src, dst, avoid_cluster_borders=red)
        if pts is None:
            return
        route_mode = "auto"

    d = f"M {pts[0][0]:.2f} {pts[0][1]:.2f}"
    for x, y in pts[1:]:
        d += f" L {x:.2f} {y:.2f}"

    color, marker_id = edge_style_for(src, dst, red=red, dashed=dashed)
    group_id = f"line-{line_no:02d}"
    path_id = f"{group_id}-path"

    group = ET.SubElement(edge_layer, f"{{{SVG}}}g", {
        "id": group_id,
        "data-line": str(line_no),
        "data-src": src,
        "data-dst": dst,
        "data-route-mode": route_mode,
        "data-default-stroke": color,
        "data-default-marker": marker_id,
        "data-operator": "true" if red else "false",
    })

    attrs = {
        "id": path_id,
        "class": "edge-visible",
        "d": d,
        "fill": "none",
        "stroke": color,
        "stroke-width": "2.7" if red else "2.25",
        "marker-end": f"url(#{marker_id})",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "pointer-events": "none",
    }
    if dashed:
        attrs["stroke-dasharray"] = "8,6"

    visible_path = ET.SubElement(group, f"{{{SVG}}}path", attrs)
    title = ET.SubElement(visible_path, f"{{{SVG}}}title")
    title.text = (
        f"Line {line_no}: {src} → {dst}"
        + (" [manual]" if route_mode == "manual" else " [auto]")
    )

    segment_count = len(pts) - 1
    for seg_no, (a, b) in enumerate(zip(pts[:-1], pts[1:]), start=1):
        seg_d = f"M {a[0]:.2f} {a[1]:.2f} L {b[0]:.2f} {b[1]:.2f}"
        hit = ET.SubElement(edge_hit_layer, f"{{{SVG}}}path", {
            "id": f"{group_id}-seg-{seg_no:02d}",
            "class": "edge-hit",
            "d": seg_d,
            "data-line": str(line_no),
            "data-segment": str(seg_no),
            "data-segment-count": str(segment_count),
            "data-src": src,
            "data-dst": dst,
            "data-route-mode": route_mode,
            "data-visible-path": path_id,
            "data-x1": f"{a[0]:.2f}",
            "data-y1": f"{a[1]:.2f}",
            "data-x2": f"{b[0]:.2f}",
            "data-y2": f"{b[1]:.2f}",
        })
        hit_title = ET.SubElement(hit, f"{{{SVG}}}title")
        hit_title.text = (
            f"Line {line_no}.{seg_no} — {src} → {dst} — "
            f"{route_mode} — segment {seg_no}/{segment_count} — "
            f"({a[0]:.1f}, {a[1]:.1f}) → ({b[0]:.1f}, {b[1]:.1f})"
        )

    # Preserve v29 sequential behavior: whether manual or automatic, once the
    # line is drawn its segments affect only routes drawn after it.
    for seg in zip(pts[:-1], pts[1:]):
        existing_segments.append(seg)

# ---------------- edge list ----------------
# Stable manual line IDs. These numbers are intentionally independent of the
# sequential routing/drawing order, so future manual overrides can refer to a
# dependency simply as "line 33".
LINE_IDS = {
     1: ("in_na", "na"),
     2: ("in_lab", "lab"),
     3: ("in_hc", "hc"),
     4: ("in_ppp", "ppp"),
     5: ("in_ppp", "trade"),
     6: ("in_cap", "cfm"),
     7: ("na", "lab"),
     8: ("na", "hc"),
     9: ("na", "ppp"),
    10: ("na", "trade"),
    11: ("ppp", "corr"),
    12: ("na", "combined1"),
    13: ("ppp", "combined1"),
    14: ("trade", "combined1"),
    15: ("na", "prelim1"),
    16: ("combined1", "prelim1"),
    17: ("combined1", "geks"),
    18: ("prelim1", "cgdpo"),
    19: ("cfm", "invcfm"),
    20: ("invcfm", "cap_inputs"),
    21: ("cap_inputs", "batch"),
    22: ("batch", "kagg"),
    23: ("batch", "kdetail"),
    24: ("na", "cap_inputs"),
    25: ("lab", "cap_inputs"),
    26: ("ppp", "cap_inputs"),
    27: ("geks", "cap_inputs"),
    28: ("cgdpo", "cap_inputs"),
    29: ("in_cap", "cap_inputs"),
    30: ("na", "combined2"),
    31: ("ppp", "combined2"),
    32: ("trade", "combined2"),
    33: ("na", "prelim2"),
    34: ("kagg", "import"),
    35: ("lab", "import"),
    36: ("hc", "import"),
    37: ("corr", "mergecorr"),
    38: ("combined2", "prelim2"),
    39: ("prelim2", "import"),
    40: ("import", "finalcalc"),
    41: ("finalcalc", "mergecorr"),
    42: ("mergecorr", "finalvars"),
    43: ("finalvars", "publication"),
    44: ("na", "detail_inputs"),
    45: ("hc", "detail_inputs"),
    46: ("lab", "detail_inputs"),
    47: ("kdetail", "detail_inputs"),
    48: ("detail_inputs", "detail"),
    49: ("detail", "detail_out"),
    50: ("publication", "pwtpub"),
    51: ("mergecorr", "trade_detail"),
    52: ("batch", "repeat"),
    53: ("repeat", "batch"),
    54: ("batch", "rerun"),
    55: ("rerun", "combined2"),
    56: ("publication", "detail"),
}

EDGE_TO_LINE = {edge: line_no for line_no, edge in LINE_IDS.items()}

if MANUAL_ROUTES:
    valid_line_keys = {str(i) for i in LINE_IDS}
    unknown = sorted(set(MANUAL_ROUTES) - valid_line_keys, key=lambda x: int(x) if x.isdigit() else 10**9)
    if unknown:
        print(
            "WARNING: manual route JSON contains unknown line id(s): "
            + ", ".join(unknown)
        )

normal_edges = [LINE_IDS[i] for i in range(1, 52)]
operator_edges = [LINE_IDS[i] for i in range(52, 57)]

def node_distance(edge):
    a, b = edge[0], edge[1]
    A, B = nodes[a], nodes[b]
    return abs(A.cx - B.cx) + abs(A.cy - B.cy)

# Route short/internal edges first; longer cross-cluster later.
for s, t in sorted(normal_edges, key=node_distance):
    draw_edge(s, t, EDGE_TO_LINE[(s, t)])

for s, t in operator_edges:
    draw_edge(s, t, EDGE_TO_LINE[(s, t)], red=True, dashed=True)

# ---------------- draw nodes on top ----------------
for n in nodes.values():
    n.draw(node_layer)

# ---------------- legend ----------------
legend_y = 2290
legend_items = [
    (COLORS["external"], "External input", "box"),
    (COLORS["upstream"], "Upstream derived input", "box"),
    (COLORS["process"], "Processing stage", "box"),
    (COLORS["output"], "Derived output / interface", "box"),
    (COLORS["operator"], "Operator / control sequence", "line"),
]
x = 300
for color, label, kind in legend_items:
    if kind == "box":
        rect(overlay_layer, x, legend_y - 16, 20, 20, color, "#777", 1.0, 3)
    else:
        ET.SubElement(overlay_layer, f"{{{SVG}}}line", {
            "x1": str(x), "y1": str(legend_y - 6),
            "x2": str(x + 28), "y2": str(legend_y - 6),
            "stroke": color, "stroke-width": "3.2", "stroke-dasharray": "8,5"
        })
    text(overlay_layer, x + 32, legend_y - 1, label, size=15.5,
         weight="bold", anchor="start", fill="#2B2B2B")
    x += 250 if label not in ("Derived output / interface", "Operator / control sequence") else 300

# Route-colour key: these are deliberately stronger tones of the cluster colours.
route_legend_y = 2333
text(overlay_layer, 300, route_legend_y, "Solid arrow colour = originating cluster:",
     size=14.5, weight="bold", anchor="start", fill="#333")
route_items = [
    (COLORS["edge_prep"], "Preparation"),
    (COLORS["edge_pass1"], "First pass"),
    (COLORS["edge_capital"], "Capital"),
    (COLORS["edge_pass2"], "Final pass"),
]
x = 690
for color, label in route_items:
    ET.SubElement(overlay_layer, f"{{{SVG}}}line", {
        "x1": str(x), "y1": str(route_legend_y - 5),
        "x2": str(x + 32), "y2": str(route_legend_y - 5),
        "stroke": color, "stroke-width": "3.4"
    })
    text(overlay_layer, x + 40, route_legend_y, label, size=14.5,
         weight="bold", anchor="start", fill="#333")
    x += 205

# ---------------- interactive inspection overlay ----------------
hud_heading = None
hover_info = None
cursor_info = None

if ARGS.recorder:
    hud_heading = text(
        overlay_layer, W - 35, 28,
        "Hover a route segment to identify it",
        size=13, anchor="end", fill="#555"
    )
    hud_heading.set("id", "inspection-heading")

    hover_info = ET.SubElement(overlay_layer, f"{{{SVG}}}text", {
        "id": "hover-info",
        "x": str(W - 35),
        "y": "48",
        "font-family": "Arial",
        "font-size": "13",
        "font-weight": "bold",
        "fill": "#333333",
        "text-anchor": "end",
        "pointer-events": "none",
    })
    hover_info.text = "Line —"

    cursor_info = ET.SubElement(overlay_layer, f"{{{SVG}}}text", {
        "id": "cursor-coordinates",
        "x": str(W - 35),
        "y": "68",
        "font-family": "Arial",
        "font-size": "13",
        "fill": "#555555",
        "text-anchor": "end",
        "pointer-events": "none",
    })
    cursor_info.text = "x=—, y=—"

# Optional click-recorder panel. It emits exactly the same JSON structure that
# --routes-json consumes, so its output can be copied directly into the route file.
if ARGS.recorder:
    XHTML = "http://www.w3.org/1999/xhtml"
    recorder = ET.SubElement(root, f"{{{SVG}}}foreignObject", {
        "id": "route-recorder-panel",
        "x": str(W - 410),
        "y": "90",
        "width": "375",
        "height": "390",
    })
    panel = ET.SubElement(recorder, f"{{{XHTML}}}div", {
        "style": (
            "box-sizing:border-box;width:100%;height:100%;"
            "background:rgba(255,255,255,0.96);border:1px solid #888;"
            "border-radius:8px;padding:10px;font-family:Arial,sans-serif;"
            "font-size:13px;color:#222;"
        )
    })

    h = ET.SubElement(panel, f"{{{XHTML}}}div", {
        "id": "rec-drag-handle",
        "style": (
            "font-weight:bold;margin:-10px -10px 8px -10px;padding:8px 10px;"
            "background:#f2f2f2;border-bottom:1px solid #bbb;"
            "border-radius:8px 8px 0 0;cursor:move;user-select:none;"
        )
    })
    h.text = "Route point recorder — drag here"

    row = ET.SubElement(panel, f"{{{XHTML}}}div", {
        "style": "display:flex;gap:6px;align-items:center;margin-bottom:7px;"
    })
    label = ET.SubElement(row, f"{{{XHTML}}}label", {"for": "rec-line-number"})
    label.text = "Line"
    ET.SubElement(row, f"{{{XHTML}}}input", {
        "id": "rec-line-number",
        "type": "number",
        "min": "1",
        "max": "56",
        "step": "1",
        "placeholder": "44",
        "style": "width:70px;padding:3px;",
    })
    rec_btn = ET.SubElement(row, f"{{{XHTML}}}button", {
        "id": "rec-toggle",
        "type": "button",
        "style": "padding:4px 8px;",
    })
    rec_btn.text = "Start recording"
    undo_btn = ET.SubElement(row, f"{{{XHTML}}}button", {
        "id": "rec-undo",
        "type": "button",
        "style": "padding:4px 8px;",
    })
    undo_btn.text = "Undo"

    row2 = ET.SubElement(panel, f"{{{XHTML}}}div", {
        "style": "display:flex;gap:6px;margin-bottom:7px;"
    })
    clear_line_btn = ET.SubElement(row2, f"{{{XHTML}}}button", {
        "id": "rec-clear-line",
        "type": "button",
        "style": "padding:4px 8px;",
    })
    clear_line_btn.text = "Clear line"
    clear_all_btn = ET.SubElement(row2, f"{{{XHTML}}}button", {
        "id": "rec-clear-all",
        "type": "button",
        "style": "padding:4px 8px;",
    })
    clear_all_btn.text = "Clear all"
    select_btn = ET.SubElement(row2, f"{{{XHTML}}}button", {
        "id": "rec-select-json",
        "type": "button",
        "style": "padding:4px 8px;",
    })
    select_btn.text = "Select JSON"

    status = ET.SubElement(panel, f"{{{XHTML}}}div", {
        "id": "rec-status",
        "style": "margin-bottom:6px;color:#555;",
    })
    status.text = "Enter a line number, record its points, then copy the fragment."

    textarea = ET.SubElement(panel, f"{{{XHTML}}}textarea", {
        "id": "rec-json",
        "spellcheck": "false",
        "style": (
            "box-sizing:border-box;width:100%;height:245px;"
            "font-family:monospace;font-size:12px;white-space:pre;"
        ),
    })
    textarea.text = ""

script = ET.SubElement(root, f"{{{SVG}}}script", {"type": "application/ecmascript"})
script.text = r"""
(function () {
    const svg = document.documentElement;
    const W = 1683.78;
    const H = 2383.94;
    const COLORS_EDGE_HOVER = "#2F2F2F";
    const hudHeading = document.getElementById('inspection-heading');
    const hoverInfo = document.getElementById('hover-info');
    const coordInfo = document.getElementById('cursor-coordinates');

    /*
     * Convert browser viewport coordinates to the SVG's permanent viewBox
     * coordinates. This deliberately uses getBoundingClientRect() rather than
     * getScreenCTM(), so scrolling the standalone SVG cannot change the
     * coordinate assigned to a point in the diagram.
     */
    function clientToSvg(clientX, clientY) {
        const rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        return {
            x: (clientX - rect.left) * (W / rect.width),
            y: (clientY - rect.top) * (H / rect.height)
        };
    }

    function svgPoint(evt) {
        return clientToSvg(evt.clientX, evt.clientY);
    }

    /*
     * Keep the inspection readout at the visible top-right of the browser
     * window while the A1 SVG itself scrolls underneath it. The text still
     * lives in SVG coordinates; only its display position follows the viewport.
     */
    function positionInspectionHud() {
        const rect = svg.getBoundingClientRect();

        const clientRight = Math.min(
            window.innerWidth - 18,
            rect.right - 18
        );
        const clientTop = Math.max(
            18,
            rect.top + 18
        );

        const p = clientToSvg(clientRight, clientTop);
        if (!p) return;

        if (hudHeading) {
            hudHeading.setAttribute('x', p.x.toFixed(2));
            hudHeading.setAttribute('y', p.y.toFixed(2));
        }

        if (hoverInfo) {
            hoverInfo.setAttribute('x', p.x.toFixed(2));
            hoverInfo.setAttribute('y', (p.y + 20).toFixed(2));
        }

        if (coordInfo) {
            coordInfo.setAttribute('x', p.x.toFixed(2));
            coordInfo.setAttribute('y', (p.y + 40).toFixed(2));
        }
    }

    if (coordInfo) {
        svg.addEventListener('mousemove', function (evt) {
            const p = svgPoint(evt);
            if (p) {
                coordInfo.textContent =
                    'x=' + p.x.toFixed(1) + ', y=' + p.y.toFixed(1);
            }
        });
    }

    window.addEventListener('scroll', positionInspectionHud, {passive: true});
    window.addEventListener('resize', positionInspectionHud);
    positionInspectionHud();

    let loadLineIntoRecorder = null;
    const hoverEdgeLayer = document.getElementById('hover_edges');
    const RECORDER_MODE = document.getElementById('route-recorder-panel') !== null;
    let hoverClone = null;
    const pinnedLines = new Map();

    function clearHoverClone() {
        if (hoverClone && hoverClone.parentNode) {
            hoverClone.parentNode.removeChild(hoverClone);
        }
        hoverClone = null;
    }

    function makeHighlightClone(visible, group, cssClass) {
        if (!visible || !hoverEdgeLayer) return null;

        const clone = visible.cloneNode(false);
        clone.removeAttribute('id');
        clone.setAttribute('class', cssClass);
        clone.setAttribute('pointer-events', 'none');

        if (group && group.dataset.operator === 'true') {
            clone.setAttribute('stroke', group.dataset.defaultStroke);
            clone.setAttribute(
                'marker-end',
                'url(#' + group.dataset.defaultMarker + ')'
            );
        } else {
            clone.setAttribute('stroke', COLORS_EDGE_HOVER);
            clone.setAttribute('marker-end', 'url(#arrowGray)');
        }

        return clone;
    }

    function showHoverClone(visible, group) {
        clearHoverClone();

        const clone = makeHighlightClone(
            visible,
            group,
            'edge-hover-clone'
        );
        if (!clone) return;

        hoverEdgeLayer.appendChild(clone);
        hoverClone = clone;
    }

    function togglePinnedLine(line) {
        line = String(line);

        if (pinnedLines.has(line)) {
            const clone = pinnedLines.get(line);
            if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
            pinnedLines.delete(line);
            return;
        }

        const visible = document.getElementById(
            'line-' + line.padStart(2, '0') + '-path'
        );
        const group = visible ? visible.parentElement : null;
        const clone = makeHighlightClone(
            visible,
            group,
            'edge-pinned-clone'
        );
        if (!clone) return;

        clone.setAttribute('data-pinned-line', line);
        hoverEdgeLayer.appendChild(clone);
        pinnedLines.set(line, clone);
    }

    function bindEdgeHit(hit) {
        hit.addEventListener('mouseenter', function () {
            const visible = document.getElementById(hit.dataset.visiblePath);
            const group = visible ? visible.parentElement : null;
            if (visible) {
                visible.classList.add('edge-hover');
                if (group && group.dataset.operator !== 'true') {
                    visible.setAttribute('stroke', COLORS_EDGE_HOVER);
                    visible.setAttribute('marker-end', 'url(#arrowGray)');
                }
                showHoverClone(visible, group);
            }

            if (hoverInfo) {
                hoverInfo.textContent =
                    'Line ' + hit.dataset.line + '.' + hit.dataset.segment +
                    '  ' + hit.dataset.src + ' → ' + hit.dataset.dst +
                    '  [' + hit.dataset.routeMode + ']  ' +
                    '(' + hit.dataset.x1 + ',' + hit.dataset.y1 +
                    ') → (' + hit.dataset.x2 + ',' + hit.dataset.y2 + ')';
            }
        });

        hit.addEventListener('mouseleave', function () {
            const visible = document.getElementById(hit.dataset.visiblePath);
            const group = visible ? visible.parentElement : null;
            if (visible) {
                visible.classList.remove('edge-hover');
                if (group) {
                    visible.setAttribute('stroke', group.dataset.defaultStroke);
                    visible.setAttribute('marker-end', 'url(#' + group.dataset.defaultMarker + ')');
                }
            }
            clearHoverClone();
            if (hoverInfo) hoverInfo.textContent = 'Line —';
        });

        hit.addEventListener('click', function (evt) {
            evt.preventDefault();
            evt.stopPropagation();

            if (!RECORDER_MODE) {
                togglePinnedLine(hit.dataset.line);
                return;
            }

            if (loadLineIntoRecorder) {
                loadLineIntoRecorder(hit.dataset.line);
            }
        });
    }

    document.querySelectorAll('.edge-hit').forEach(bindEdgeHit);

    const panel = document.getElementById('route-recorder-panel');
    if (!panel) return;

    const lineInput = document.getElementById('rec-line-number');
    const toggle = document.getElementById('rec-toggle');
    const undo = document.getElementById('rec-undo');
    const clearLine = document.getElementById('rec-clear-line');
    const clearAll = document.getElementById('rec-clear-all');
    const selectJson = document.getElementById('rec-select-json');
    const status = document.getElementById('rec-status');
    const output = document.getElementById('rec-json');
    const dragHandle = document.getElementById('rec-drag-handle');

    let draggingPanel = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragMoved = false;
    let suppressNextClick = false;

    // Do not rely on pointer capture inside foreignObject. Some browsers/viewers
    // lose capture when the foreignObject itself moves. Start the drag on the
    // HTML header, but track movement on the SVG document instead.
    dragHandle.style.touchAction = 'none';

    dragHandle.addEventListener('pointerdown', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        const p = svgPoint(evt);
        if (!p) return;

        draggingPanel = true;
        dragMoved = false;
        dragOffsetX = p.x - Number(panel.getAttribute('x'));
        dragOffsetY = p.y - Number(panel.getAttribute('y'));
    });

    document.addEventListener('pointermove', function (evt) {
        if (!draggingPanel) return;

        evt.preventDefault();

        const p = svgPoint(evt);
        if (!p) return;

        const panelWidth = Number(panel.getAttribute('width'));
        const panelHeight = Number(panel.getAttribute('height'));

        let x = p.x - dragOffsetX;
        let y = p.y - dragOffsetY;

        // Keep the recorder inside the SVG canvas.
        x = Math.max(0, Math.min(x, W - panelWidth));
        y = Math.max(0, Math.min(y, H - panelHeight));

        panel.setAttribute('x', x.toFixed(1));
        panel.setAttribute('y', y.toFixed(1));
        dragMoved = true;
    }, true);

    function stopDraggingPanel(evt) {
        if (!draggingPanel) return;

        evt.preventDefault();
        draggingPanel = false;

        // A drag normally generates a click afterwards. Suppress that click so
        // moving the recorder cannot accidentally record a route point.
        if (dragMoved) suppressNextClick = true;
    }

    document.addEventListener('pointerup', stopDraggingPanel, true);
    document.addEventListener('pointercancel', stopDraggingPanel, true);

    let recording = false;
    const routes = {};
    let selectedLine = null;

    const markerLayer = document.createElementNS(
        'http://www.w3.org/2000/svg', 'g'
    );
    markerLayer.setAttribute('id', 'recorder-markers');
    svg.appendChild(markerLayer);

    function currentLine() {
        const value = Number.parseInt(lineInput.value, 10);
        return Number.isInteger(value) && value >= 1 && value <= 56
            ? String(value)
            : null;
    }

    function ensureLine(line) {
        if (!routes[line]) routes[line] = {points: []};
        return routes[line];
    }

    function lineId(line) {
        return 'line-' + String(line).padStart(2, '0');
    }

    function pointsFromDisplayedLine(line) {
        const hits = Array.from(
            document.querySelectorAll('.edge-hit[data-line="' + line + '"]')
        ).sort(function (a, b) {
            return Number(a.dataset.segment) - Number(b.dataset.segment);
        });

        if (hits.length === 0) return null;

        const points = [{
            x: Number(hits[0].dataset.x1),
            y: Number(hits[0].dataset.y1)
        }];

        hits.forEach(function (hit) {
            points.push({
                x: Number(hit.dataset.x2),
                y: Number(hit.dataset.y2)
            });
        });

        return points;
    }

    function selectVisibleLine(line) {
        document.querySelectorAll('.edge-visible.edge-selected').forEach(
            function (path) { path.classList.remove('edge-selected'); }
        );

        const visible = document.getElementById(lineId(line) + '-path');
        if (visible) visible.classList.add('edge-selected');
        selectedLine = line;
    }

    function updateJson() {
        const line = currentLine();

        if (!line) {
            output.value = '';
            return;
        }

        const route = routes[line] || {points: []};

        // Recorder output is deliberately a JSON fragment rather than a
        // complete JSON document. It is intended to be pasted directly into
        // the top-level routes object, one line at a time.
        const body = JSON.stringify(route, null, 2)
            .split('\n')
            .map(function (row, index) {
                return index === 0 ? row : '  ' + row;
            })
            .join('\n');

        output.value = '"' + line + '": ' + body + ',';
    }

    function renderMarkers() {
        while (markerLayer.firstChild) markerLayer.removeChild(markerLayer.firstChild);

        const line = currentLine();
        if (!line || !routes[line]) return;

        routes[line].points.forEach(function (pt, idx) {
            const circle = document.createElementNS(
                'http://www.w3.org/2000/svg', 'circle'
            );
            circle.setAttribute('cx', pt.x);
            circle.setAttribute('cy', pt.y);
            circle.setAttribute('r', '7');
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', '#222222');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('pointer-events', 'none');
            markerLayer.appendChild(circle);

            const label = document.createElementNS(
                'http://www.w3.org/2000/svg', 'text'
            );
            label.setAttribute('x', pt.x + 10);
            label.setAttribute('y', pt.y - 9);
            label.setAttribute('font-family', 'Arial');
            label.setAttribute('font-size', '13');
            label.setAttribute('font-weight', 'bold');
            label.setAttribute('fill', '#222222');
            label.setAttribute('pointer-events', 'none');
            label.textContent = line + '.' + (idx + 1);
            markerLayer.appendChild(label);
        });
    }

    function pathData(points) {
        if (!points || points.length < 2) return null;
        let d = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
        for (let i = 1; i < points.length; i += 1) {
            d += ' L ' + points[i].x.toFixed(2) + ' ' + points[i].y.toFixed(2);
        }
        return d;
    }

    function rebuildHitAreas(line, points) {
        const group = document.getElementById(lineId(line));
        if (!group) return;

        const src = group.dataset.src;
        const dst = group.dataset.dst;
        const visiblePath = lineId(line) + '-path';

        document.querySelectorAll('.edge-hit[data-line="' + line + '"]').forEach(
            function (hit) { hit.remove(); }
        );

        const hitLayer = document.getElementById('edge_hit_areas');
        const segmentCount = points.length - 1;

        for (let i = 0; i < segmentCount; i += 1) {
            const a = points[i];
            const b = points[i + 1];
            const segNo = i + 1;

            const hit = document.createElementNS(
                'http://www.w3.org/2000/svg', 'path'
            );
            hit.setAttribute('id', lineId(line) + '-seg-' + String(segNo).padStart(2, '0'));
            hit.setAttribute('class', 'edge-hit');
            hit.setAttribute(
                'd',
                'M ' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) +
                ' L ' + b.x.toFixed(2) + ' ' + b.y.toFixed(2)
            );
            hit.dataset.line = line;
            hit.dataset.segment = String(segNo);
            hit.dataset.segmentCount = String(segmentCount);
            hit.dataset.src = src;
            hit.dataset.dst = dst;
            hit.dataset.routeMode = 'preview';
            hit.dataset.visiblePath = visiblePath;
            hit.dataset.x1 = a.x.toFixed(2);
            hit.dataset.y1 = a.y.toFixed(2);
            hit.dataset.x2 = b.x.toFixed(2);
            hit.dataset.y2 = b.y.toFixed(2);

            const title = document.createElementNS(
                'http://www.w3.org/2000/svg', 'title'
            );
            title.textContent =
                'Line ' + line + '.' + segNo + ' — ' + src + ' → ' + dst +
                ' — preview — segment ' + segNo + '/' + segmentCount +
                ' — (' + a.x.toFixed(1) + ', ' + a.y.toFixed(1) + ')' +
                ' → (' + b.x.toFixed(1) + ', ' + b.y.toFixed(1) + ')';
            hit.appendChild(title);

            hitLayer.appendChild(hit);
            bindEdgeHit(hit);
        }
    }

    function applyRoutePreview(line, points) {
        if (!points || points.length < 2) return;

        const visible = document.getElementById(lineId(line) + '-path');
        const group = document.getElementById(lineId(line));
        const d = pathData(points);
        if (!visible || !group || !d) return;

        visible.setAttribute('d', d);
        group.dataset.routeMode = 'preview';
        rebuildHitAreas(line, points);
        selectVisibleLine(line);
    }

    function refresh(preview) {
        updateJson();
        renderMarkers();

        if (preview) {
            const line = currentLine();
            if (line && routes[line] && routes[line].points.length >= 2) {
                applyRoutePreview(line, routes[line].points);
            }
        }
    }

    function parseRecorderFragment() {
        const line = currentLine();
        if (!line) {
            return {ok: false, message: 'Enter a valid line number first.'};
        }

        let fragment = output.value.trim();
        if (!fragment) {
            return {ok: false, message: 'Recorder JSON is empty.'};
        }

        fragment = fragment.replace(/,\s*$/, '');

        let parsed;
        try {
            parsed = JSON.parse('{' + fragment + '}');
        } catch (_err) {
            return {ok: false, message: 'JSON is not valid yet.'};
        }

        const keys = Object.keys(parsed);
        if (keys.length !== 1 || keys[0] !== line) {
            return {
                ok: false,
                message: 'JSON key must match the selected line (' + line + ').'
            };
        }

        const route = parsed[line];
        if (!route || !Array.isArray(route.points)) {
            return {ok: false, message: 'Route must contain a points array.'};
        }

        const points = [];
        for (let i = 0; i < route.points.length; i += 1) {
            const point = route.points[i];
            const x = Number(point && point.x);
            const y = Number(point && point.y);

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                return {
                    ok: false,
                    message: 'Point ' + (i + 1) + ' needs numeric x and y.'
                };
            }

            points.push({x: x, y: y});
        }

        return {ok: true, points: points};
    }

    loadLineIntoRecorder = function (line) {
        line = String(line);

        // Preserve already edited/recorded points; otherwise capture the route
        // exactly as it is currently displayed in the SVG.
        if (!routes[line]) {
            const displayed = pointsFromDisplayedLine(line);
            if (!displayed) return;
            routes[line] = {points: displayed};
        }

        lineInput.value = line;
        selectVisibleLine(line);
        updateJson();
        renderMarkers();

        const group = document.getElementById(lineId(line));
        const src = group ? group.dataset.src : '';
        const dst = group ? group.dataset.dst : '';
        status.textContent =
            'Loaded line ' + line + (src && dst ? ': ' + src + ' → ' + dst : '') +
            '. Edit x/y below for live preview.';
    };

    toggle.addEventListener('click', function () {
        const line = currentLine();
        if (!line) {
            status.textContent = 'Enter a line number from 1 to 56 first.';
            return;
        }
        recording = !recording;
        toggle.textContent = recording ? 'Stop recording' : 'Start recording';
        status.textContent = recording
            ? 'Recording line ' + line + ': click route points in order.'
            : 'Recording stopped.';
    });

    undo.addEventListener('click', function () {
        const line = currentLine();
        if (!line || !routes[line] || routes[line].points.length === 0) return;
        routes[line].points.pop();
        if (routes[line].points.length === 0) delete routes[line];
        refresh(true);
    });

    clearLine.addEventListener('click', function () {
        const line = currentLine();
        if (!line) return;
        delete routes[line];
        refresh();
    });

    clearAll.addEventListener('click', function () {
        Object.keys(routes).forEach(function (key) { delete routes[key]; });
        refresh();
    });

    selectJson.addEventListener('click', function () {
        output.focus();
        output.select();
    });

    lineInput.addEventListener('change', function () {
        const line = currentLine();

        if (!line) {
            status.textContent = 'Enter a line number from 1 to 56.';
            updateJson();
            renderMarkers();
            return;
        }

        loadLineIntoRecorder(line);

        if (recording) {
            status.textContent =
                'Recording line ' + line + ': click route points in order.';
        }
    });

    output.addEventListener('input', function () {
        const parsed = parseRecorderFragment();

        if (!parsed.ok) {
            status.textContent = parsed.message;
            return;
        }

        const line = currentLine();
        routes[line] = {points: parsed.points};
        renderMarkers();

        if (parsed.points.length >= 2) {
            applyRoutePreview(line, parsed.points);
            status.textContent =
                'Live preview: line ' + line + ' (' +
                parsed.points.length + ' points).';
        } else {
            status.textContent =
                'Add at least two points to preview line ' + line + '.';
        }
    });

    svg.addEventListener('click', function (evt) {
        if (suppressNextClick) {
            suppressNextClick = false;
            return;
        }
        if (!recording || draggingPanel) return;

        if (
            evt.target &&
            evt.target.classList &&
            evt.target.classList.contains('edge-hit')
        ) {
            return;
        }

        const path = evt.composedPath ? evt.composedPath() : [];
        if (path.includes(panel)) return;

        const line = currentLine();
        if (!line) {
            status.textContent = 'Enter a line number from 1 to 56 first.';
            return;
        }

        const p = svgPoint(evt);
        if (!p) return;

        const route = ensureLine(line);
        route.points.push({
            x: Number(p.x.toFixed(1)),
            y: Number(p.y.toFixed(1))
        });
        status.textContent =
            'Line ' + line + ': ' + route.points.length + ' point(s) recorded.';
        refresh(true);
    }, true);

    refresh();
})();
"""

ET.ElementTree(root).write(OUT, encoding="utf-8", xml_declaration=True)
print(OUT)
