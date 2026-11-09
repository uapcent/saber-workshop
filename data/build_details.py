"""Extracts surface details of the legacy Polaris parts from the official size chart and writes data/details.json.

The silhouettes in profiles.json only give each part's outline. The size chart (reference/polaris-size-chart.png,
141 px = 200 mm) also shows what is drawn inside the outline:

  grooves - darker lines across the part (turned grooves, ribs, step edges): [x, width, y0, y1]
  holes   - white spots inside the part (screw holes, windows):              [x, y, width, height]
  knurls  - rows with a fine alternating pattern (knurled bands):           [x0, x1]
  ribs    - areas of fine ribbing, read by eye (see RIBS):                  [x0, x1, y0, y1]

All values are mm. x runs along the hilt from the pommel side (as in profiles.json), y across it from the axis
(negative = top of the drawing). Each part is located by its pixel columns in the chart's top row, and its rows
are stretched to the model's length so the details line up with the traced outline.

Usage: python data/build_details.py   (needs Pillow)
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHART = ROOT / "reference" / "polaris-size-chart.png"
OUT = Path(__file__).with_name("details.json")
CHART_ROW = (205, 365)  # pixel rows of the chart's top row of parts

# model key -> (first column, last column, color kind, model length mm)
PARTS = {
    "body.sse1": (23, 49, "color", 200),
    "body.sse3": (74, 99, "color", 179.6),
    "body.sse2": (124, 149, "color", 146.5),
    "emitter.x2": (172, 202, "color", 55),
    "emitter.sse1": (222, 252, "color", 55),
    "emitter.sse2": (274, 301, "color", 55),
    "emitter.sse3": (326, 350, "color", 40),
    "emitter.artiglio": (375, 402, "grey", 40),
    "pommel.sse1": (426, 451, "color", 38),
    "pommel.sse3std": (476, 502, "color", 20),
    "pommel.sse3extra": (524, 555, "color", 20),
    "pommel.sse2": (575, 604, "color", 16),
}

DARKER = 15  # a pixel this much darker than the part's body color is part of a groove
MIN_RUN = 3  # px: shorter dark runs are anti-aliasing, not grooves


def lum(p):
    return sum(p) / 3


def sat(p):
    return max(p) - min(p)


def is_body(p, kind):
    """Pixel belongs to the part (its paint, or a darker line on it), not background, LDL ring or base ring."""
    if kind == "color":
        return sat(p) > 60
    return 70 < lum(p) < 185 and sat(p) < 20


def extract(px, a, b, kind, length):
    rows = range(*CHART_ROW)
    width = b - a + 1
    body_rows = [y for y in rows if sum(is_body(px[x, y], kind) for x in range(a, b + 1)) >= 0.4 * width]
    top, bottom = min(body_rows), max(body_rows)
    mm = length / (bottom - top + 1)
    base = sorted(lum(px[x, y]) for y in body_rows for x in range(a, b + 1) if is_body(px[x, y], kind))
    paint = base[len(base) * 2 // 3]  # body color brightness (upper part of the distribution, past the lines)

    def to_x(y):  # pixel row -> mm from the pommel side
        return round((bottom + 0.5 - y) * mm, 1)

    grooves, knurl_rows, inside_white = [], [], set()
    for y in range(top + 1, bottom):  # skip the anti-aliased end rows
        body_x = [x for x in range(a, b + 1) if is_body(px[x, y], kind)]
        if not body_x:
            continue
        left, right = body_x[0], body_x[-1]
        center = (left + right) / 2
        runs, start = [], None
        for x in range(left + 1, right + 1):
            dark = is_body(px[x, y], kind) and lum(px[x, y]) < paint - DARKER
            if dark and start is None:
                start = x
            if not dark and start is not None:
                runs.append((start, x - 1))
                start = None
        if start is not None:
            runs.append((start, right - 1))
        long_runs = [r for r in runs if r[1] - r[0] + 1 >= MIN_RUN]
        if len(runs) >= 4 and len(long_runs) <= 1:
            knurl_rows.append(y)
        else:
            for r0, r1 in long_runs:
                grooves.append([y, round((r0 - 0.5 - center) * mm, 1), round((r1 + 0.5 - center) * mm, 1)])
        for x in range(left + 1, right):
            if lum(px[x, y]) > 200:
                inside_white.add((x, y))

    # Merge grooves on neighbouring rows that span the same width into one wider groove.
    merged = []
    for y, y0, y1 in grooves:
        last = merged[-1] if merged else None
        if last and y - last["y1row"] == 1 and abs(y0 - last["y0"]) < 2 and abs(y1 - last["y1"]) < 2:
            last["y1row"] = y
        else:
            merged.append({"y0row": y, "y1row": y, "y0": y0, "y1": y1})
    groove_out = [
        [to_x((g["y0row"] + g["y1row"]) / 2), round((g["y1row"] - g["y0row"] + 1) * mm * 0.55, 2), g["y0"], g["y1"]]
        for g in merged
    ]

    # White blobs inside the part: flood fill into bounding boxes.
    holes, seen = [], set()
    for start in sorted(inside_white):
        if start in seen:
            continue
        stack, blob = [start], []
        seen.add(start)
        while stack:
            x, y = stack.pop()
            blob.append((x, y))
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in inside_white and n not in seen:
                    seen.add(n)
                    stack.append(n)
        xs = [p[0] for p in blob]
        ys = [p[1] for p in blob]
        center = (a + b) / 2
        holes.append([
            to_x((min(ys) + max(ys)) / 2),
            round(((min(xs) + max(xs)) / 2 - center) * mm, 1),
            round((max(xs) - min(xs) + 1) * mm, 1),
            round((max(ys) - min(ys) + 1) * mm, 1),
        ])

    knurls = []
    for y in knurl_rows:
        if knurls and knurls[-1][2] == y - 1:
            knurls[-1][2] = y
        else:
            knurls.append([y, y, y])
    knurl_out = [[to_x(y1 + 0.5), to_x(y0 - 0.5)] for _, y0, y1 in knurls]

    return {"grooves": groove_out, "holes": holes, "knurls": knurl_out}


# Fine ribbing is drawn too faintly in the chart to detect reliably at 1.4 mm per pixel, so it is read by eye:
# [x0, x1, y0, y1] mm areas covered with ribs at the chart's 1.4 mm pitch.
RIBS = {
    # SSe-3 main body: ribbed waist either side of a smooth central panel.
    "body.sse3": [[53, 100, -17.2, -3.6], [53, 100, 3.6, 17.2]],
}


def build():
    px = Image.open(CHART).convert("RGB").load()
    return {key: {**extract(px, *spec), "ribs": RIBS.get(key, [])} for key, spec in PARTS.items()}


if __name__ == "__main__":
    details = build()
    with OUT.open("w", encoding="utf8", newline="\n") as f:
        json.dump(details, f, indent=1)
    for key, d in details.items():
        print(f"{key:18} {len(d['grooves']):3} grooves {len(d['holes']):3} holes {len(d['knurls']):2} knurled bands")
