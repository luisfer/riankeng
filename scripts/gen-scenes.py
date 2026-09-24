#!/usr/bin/env python3
"""Crop the comic panels in art/scenes into public/scenes, and find their balloons.

Every source is a 1024² drawing. A 22px inset removes the cream margin and the
drawn border (it sits 9 to 16px in), so every panel ships as a clean 980² square
and the page draws one frame for all of them. Nothing is ever stretched.

Writes public/scenes/<stem>-980.webp and -490.webp, and src/landing/scenes.css with
each empty balloon's box, in % of the panel, so the Thai can be lettered into it.

The balloon is measured by a flood fill from a hand-picked seed inside it. The
fill stops at the ink outline, so it works for the white balloons of the bordered
style and the cream balloons of the flat style alike. The tail is trimmed.

New drawings do not go straight into art/scenes. They land in art/candidates and
are graded against the shipped panels first. See art/STYLE.md.

    python3 scripts/gen-scenes.py                    # build
    python3 scripts/gen-scenes.py --debug x.png      # also draw the found boxes
    python3 scripts/gen-scenes.py --candidates       # grade art/candidates, write sheet.png
    python3 scripts/gen-scenes.py --candidates DIR   # grade another folder
    python3 scripts/gen-scenes.py --approve STEM     # move a passed candidate into art/scenes
"""

from __future__ import annotations

import argparse
import shutil
import sys
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "scenes"
CANDIDATES = ROOT / "art" / "candidates"
OUT = ROOT / "public" / "scenes"
CSS = ROOT / "src" / "landing" / "scenes.css"
INSET = 22
SIZES = (980, 490)
NO_BALLOON = {
    "night", "pier", "temple", "canal", "train", "park", "shrine", "soi", "ferry",
    "alms", "krathong", "rain",
    "cat", "dishes", "elder", "market", "sewing",
}

# The two shipped panels every candidate is laid beside on the sheet.
SHEET_REFS = ("tea", "coffee")

# The gate. Both are shares of the panel outside the balloon. The floors sit just
# under the sparsest shipped panels (tea for contour, bike for occupied). Of the
# 33 fails of 22 Sep they stop 25; the eight that pass have a whole scene drawn
# around the wrong woman, which only eyes can see. Recalibrate with
# --candidates art/scenes if the shipped set changes.
MIN_CONTOUR = 0.026
MIN_OCCUPIED = 0.18

# A quiet panel has no balloon to earn its bare paper, so it is painted to the
# edges. Night shows 0.04 of it, train 0.15. The seven quiet panels Luis sent
# back on 23 Sep showed 0.28 to 0.48, as blank sky and blank wall. A quiet panel
# answers to paper instead of occupied: its painted wall is the ground colour,
# so occupied reads the night panel as 0.16.
MAX_PAPER = 0.20

# A point inside each empty balloon, in % of the cropped panel.
SEEDS: dict[str, tuple[float, float]] = {
    "bike": (44.7, 13.0),
    "bill": (41.9, 20.1),
    "cash": (62.9, 16.9),
    "children": (66.3, 17.1),
    "coffee": (44.5, 15.9),
    "dinner": (60.9, 17.5),
    "door": (44.2, 13.0),
    "eaten": (71.8, 24.2),
    "from": (57.3, 13.4),
    "heat": (36.7, 23.7),
    "help": (42.0, 17.0),
    "hotel": (43.0, 15.7),
    "howmuch": (43.5, 18.3),
    "hungry": (44.6, 18.8),
    "jasmine": (61.2, 16.3),
    "laugh": (26.3, 16.3),
    "left": (47.2, 16.4),
    "mango": (57.6, 15.9),
    "name": (65.1, 19.3),
    "nospicy": (39.1, 18.1),
    "passenger": (47.6, 14.3),
    "pharmacy": (44.3, 17.9),
    "praise": (55.2, 17.3),
    "pricey": (45.4, 17.8),
    "scan": (60.6, 17.6),
    "slowly": (49.4, 17.4),
    "sorry": (44.8, 16.1),
    "stairs": (43.9, 16.5),
    "stall": (43.2, 14.0),
    "stop": (44.7, 20.7),
    "table": (42.3, 18.1),
    "tasty": (57.8, 18.6),
    "tea": (62.9, 15.9),
    "thanks": (43.2, 18.2),
    "tired": (42.9, 20.2),
    "toilet": (44.4, 17.7),
    "tooth": (31.6, 21.1),
    "umbrella": (44.3, 14.9),
    "water": (42.1, 18.0),
    "well": (44.7, 19.7),
}

Box = tuple[float, float, float, float]


def luminance(p: tuple[int, int, int]) -> float:
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def assert_clean_edges(stem: str, im: Image.Image) -> None:
    """A leftover drawn border is a run of near-black along an edge."""
    w, h = im.size
    px = im.load()
    for name, points in {
        "top": [(x, 0) for x in range(w)],
        "bottom": [(x, h - 1) for x in range(w)],
        "left": [(0, y) for y in range(h)],
        "right": [(w - 1, y) for y in range(h)],
    }.items():
        dark = sum(1 for pt in points if luminance(px[pt]) < 35) / len(points)
        if dark > 0.5:
            raise SystemExit(f"{stem}: {name} edge still carries the drawn border ({dark:.0%} dark)")


def is_paper(p: tuple[int, int, int]) -> bool:
    """Anything that is not the ink outline: white or cream, never a line."""
    return luminance(p) > 170


def is_white(p: tuple[int, int, int], warm: int = 0) -> bool:
    """The inside of a balloon: white, not the cream of the paper. warm lets a creamier white through."""
    r, g, b = p
    return r > 236 and g > 236 and b > 236 - warm and abs(r - g) < 14 and abs(g - b) < 14 + warm


def paper_share(im: Image.Image) -> float:
    """The share of the panel left as bare cream or white paper, not a painted wall, sky or floor."""
    r, g, b = im.split()
    mask = r.point(lambda v: 255 if v > 225 else 0)
    for band in (
        g.point(lambda v: 255 if v > 215 else 0),
        b.point(lambda v: 255 if v > 190 else 0),
        ImageChops.subtract(r, b).point(lambda v: 255 if v < 45 else 0),
        ImageChops.subtract(b, r).point(lambda v: 255 if v == 0 else 0),
    ):
        mask = ImageChops.multiply(mask, band)
    return mask.histogram()[255] / (im.width * im.height)


def crop_panel(stem: str, src: Path) -> Image.Image:
    im = Image.open(src).convert("RGB")
    if im.size != (1024, 1024):
        raise SystemExit(f"{stem}: expected 1024², got {im.size}")
    crop = im.crop((INSET, INSET, 1024 - INSET, 1024 - INSET))
    assert_clean_edges(stem, crop)
    return crop


def find_balloon(stem: str, im: Image.Image, seed: tuple[float, float]) -> Box:
    """Flood fill from the seed to the ink outline, then trim the tail.

    Returns centre x, centre y, width, height, all in % of the panel.
    """
    w, h = im.size
    px = im.load()
    sx, sy = seed
    start = (round(sx / 100 * w), round(sy / 100 * h))
    if not is_paper(px[start]):
        raise SystemExit(f"{stem}: the seed {start} sits on ink, move it")
    seen = bytearray(w * h)
    seen[start[1] * w + start[0]] = 1
    q = deque([start])
    rows: dict[int, list[int]] = {}
    filled = 0
    limit = w * h * 0.3
    while q:
        cx, cy = q.popleft()
        filled += 1
        if filled > limit:
            raise SystemExit(f"{stem}: the fill leaked out of the balloon, the outline is open")
        row = rows.setdefault(cy, [cx, cx])
        if cx < row[0]:
            row[0] = cx
        elif cx > row[1]:
            row[1] = cx
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_paper(px[nx, ny]):
                seen[ny * w + nx] = 1
                q.append((nx, ny))
    widest = max(r[1] - r[0] for r in rows.values())
    if widest / w < 0.12:
        raise SystemExit(f"{stem}: the fill is too small to be a balloon")
    body = {y: r for y, r in rows.items() if r[1] - r[0] >= widest * 0.4}
    top, bottom = min(body), max(body)
    left = min(r[0] for r in body.values())
    right = max(r[1] for r in body.values())
    cx = (left + right + 1) / 2 / w * 100
    cy = (top + bottom + 1) / 2 / h * 100
    return cx, cy, (right - left + 1) / w * 100, (bottom - top + 1) / h * 100


def auto_seed(im: Image.Image) -> tuple[float, float] | None:
    """A candidate has no hand-picked seed yet. Take the largest enclosed white blob centred in the upper half.

    A white coat or shirt runs off the panel edge; a balloon never does. Creamier
    whites (the b series balloons are 255, 242, 223) are tried only when no pure
    white balloon turns up.
    """
    for warm in (0, 8, 16):
        seed = white_blob(im, warm)
        if seed:
            return seed
    return None


def white_blob(im: Image.Image, warm: int) -> tuple[float, float] | None:
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    best: tuple[int, tuple[float, float]] | None = None
    for y in range(0, int(h * 0.55), 2):
        for x in range(int(w * 0.05), int(w * 0.95), 2):
            i = y * w + x
            if seen[i] or not is_white(px[x, y], warm):
                continue
            q = deque([(x, y)])
            seen[i] = 1
            n = 0
            xs = [x, x]
            ys = [y, y]
            while q:
                cx, cy = q.popleft()
                n += 1
                xs[0] = min(xs[0], cx)
                xs[1] = max(xs[1], cx)
                ys[0] = min(ys[0], cy)
                ys[1] = max(ys[1], cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_white(px[nx, ny], warm):
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            enclosed = xs[0] > 0 and ys[0] > 0 and xs[1] < w - 1 and ys[1] < h - 1
            centre = ((xs[0] + xs[1] + 1) / 2 / w * 100, (ys[0] + ys[1] + 1) / 2 / h * 100)
            if n > w * h * 0.01 and enclosed and centre[1] < 50 and (best is None or n > best[0]):
                best = (n, centre)
    return best[1] if best else None


def ground_colour(im: Image.Image) -> tuple[int, int, int]:
    """The paper or the navy: the median of a thin band along all four edges."""
    w, h = im.size
    band = max(4, w // 40)
    px = im.load()
    samples = []
    for y in range(0, h, 5):
        for x in (*range(0, band, 2), *range(w - band, w, 2)):
            samples.append(px[x, y])
    for x in range(0, w, 5):
        for y in (*range(0, band, 2), *range(h - band, h, 2)):
            samples.append(px[x, y])
    mid = len(samples) // 2
    return tuple(sorted(s[i] for s in samples)[mid] for i in range(3))  # type: ignore[return-value]


def measure(im: Image.Image, box: Box | None) -> tuple[float, float, tuple[int, int, int]]:
    """How much is drawn outside the balloon.

    contour is the share of pixels on a strong edge. occupied is the share of
    pixels that are not the ground colour. Both are fractions of the panel.
    """
    w, h = im.size
    ground = ground_colour(im)
    work = im.copy()
    if box:
        cx, cy, bw, bh = box
        pad = 3.0
        x0 = int((cx - bw / 2 - pad) / 100 * w)
        y0 = int((cy - bh / 2 - pad) / 100 * h)
        x1 = int((cx + bw / 2 + pad) / 100 * w)
        y1 = int((cy + bh / 2 + pad + 9.0) / 100 * h)  # the tail hangs below the oval
        ImageDraw.Draw(work).rectangle((x0, y0, x1, y1), fill=ground)
    edges = work.convert("L").filter(ImageFilter.FIND_EDGES)
    contour = sum(edges.histogram()[64:]) / (w * h)
    diff = ImageChops.difference(work, Image.new("RGB", work.size, ground)).convert("L")
    occupied = sum(diff.histogram()[40:]) / (w * h)
    return contour, occupied, ground


@dataclass
class Grade:
    stem: str
    crop: Image.Image
    box: Box | None
    seed: tuple[float, float] | None
    contour: float
    occupied: float
    reasons: list[str]
    paper: float | None = None

    @property
    def ok(self) -> bool:
        return not self.reasons


def grade(stem: str, src: Path) -> Grade:
    crop = crop_panel(stem, src)
    if stem in NO_BALLOON:
        contour, occupied, _ = measure(crop, None)
        paper = paper_share(crop)
        reasons: list[str] = []
        if contour < MIN_CONTOUR:
            reasons.append(f"contour {contour:.3f} under {MIN_CONTOUR:.3f}, too little drawn")
        if paper > MAX_PAPER:
            reasons.append(f"paper {paper:.2f} over {MAX_PAPER:.2f}, bare paper where a wall, sky or floor should be")
        return Grade(stem, crop, None, None, contour, occupied, reasons, paper)
    seed = SEEDS.get(stem) or auto_seed(crop)
    reasons: list[str] = []
    box: Box | None = None
    if seed is None:
        reasons.append("no empty white balloon in the upper half")
    else:
        try:
            box = find_balloon(stem, crop, seed)
        except SystemExit as e:
            reasons.append(str(e).split(": ", 1)[-1])
    contour, occupied, _ = measure(crop, box)
    if contour < MIN_CONTOUR:
        reasons.append(f"contour {contour:.3f} under {MIN_CONTOUR:.3f}, too little drawn")
    if occupied < MIN_OCCUPIED:
        reasons.append(f"occupied {occupied:.2f} under {MIN_OCCUPIED:.2f}, the panel is mostly empty ground")
    return Grade(stem, crop, box, seed, contour, occupied, reasons)


def build(debug: str | None) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rules = []
    crops = []
    for src in sorted(ART.glob("*.png")):
        stem = src.stem
        crop = crop_panel(stem, src)
        for size in SIZES:
            out = crop if size == crop.width else crop.resize((size, size), Image.LANCZOS)
            out.save(OUT / f"{stem}-{size}.webp", "WEBP", quality=84, method=6)
        if stem not in NO_BALLOON and stem not in SEEDS:
            raise SystemExit(f"{stem}: add a balloon seed to SEEDS, or list it in NO_BALLOON")
        box = None if stem in NO_BALLOON else find_balloon(stem, crop, SEEDS[stem])
        if box:
            cx, cy, bw, bh = box
            rules.append(f'[data-scene="{stem}"] {{ --bx: {cx:.1f}; --by: {cy:.1f}; --bw: {bw:.1f}; --bh: {bh:.1f}; }}')
        crops.append((stem, crop, box))
        print(f"{stem:10s} 980²  balloon {'-' if not box else ' '.join(f'{v:5.1f}' for v in box)}")
    CSS.parent.mkdir(parents=True, exist_ok=True)
    CSS.write_text(
        "/* Generated by scripts/gen-scenes.py. Each panel's empty balloon, in % of the panel:\n"
        "   centre x and y, then width and height of the round part (tail trimmed). */\n"
        + "\n".join(rules)
        + "\n",
        encoding="utf-8",
    )
    if debug:
        t = 300
        cols = 6
        rows = (len(crops) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * t, rows * t), (242, 234, 216))
        for i, (stem, crop, box) in enumerate(crops):
            thumb = crop.resize((t, t))
            if box:
                cx, cy, bw, bh = (v / 100 * t for v in box)
                ImageDraw.Draw(thumb).rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2), outline=(154, 43, 31), width=3)
            sheet.paste(thumb, ((i % cols) * t, (i // cols) * t))
        sheet.save(debug)


def grade_folder(folder: Path) -> list[Grade]:
    """Grade every PNG in a folder and lay each beside the shipped references in sheet.png."""
    files = sorted(p for p in folder.glob("*.png") if not p.name.endswith("sheet.png"))
    if not files:
        raise SystemExit(f"{folder}: no candidate PNGs")
    refs = [crop_panel(r, ART / f"{r}.png").resize((300, 300)) for r in SHEET_REFS]
    grades = [grade(p.stem, p) for p in files]
    t = 300
    label = 44
    sheet = Image.new("RGB", (3 * t, len(grades) * (t + label)), (242, 234, 216))
    draw = ImageDraw.Draw(sheet)
    print(f"{'stem':12s} {'contour':>8s} {'occupied':>9s} {'paper':>6s}  {'seed':>14s}  verdict")
    for i, g in enumerate(grades):
        y = i * (t + label)
        thumb = g.crop.resize((t, t))
        if g.box:
            cx, cy, bw, bh = (v / 100 * t for v in g.box)
            ImageDraw.Draw(thumb).rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2), outline=(154, 43, 31), width=2)
        sheet.paste(refs[0], (0, y))
        sheet.paste(thumb, (t, y))
        sheet.paste(refs[1], (2 * t, y))
        verdict = "PASS" if g.ok else "FAIL " + "; ".join(g.reasons)
        seed = f"({g.seed[0]:.1f}, {g.seed[1]:.1f})" if g.seed else "-"
        paper = f"{g.paper:.2f}" if g.paper is not None else "-"
        draw.text((8, y + t + 6), f"{g.stem}  contour {g.contour:.3f}  occupied {g.occupied:.2f}  paper {paper}  seed {seed}", fill=(28, 23, 16))
        draw.text((8, y + t + 24), verdict, fill=(28, 23, 16) if g.ok else (154, 43, 31))
        print(f"{g.stem:12s} {g.contour:8.3f} {g.occupied:9.2f} {paper:>6s}  {seed:>14s}  {verdict}")
    out = CANDIDATES / "shipped-sheet.png" if folder.resolve() == ART.resolve() else folder / "sheet.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"sheet {out}")
    return grades


def approve(stem: str, force: bool) -> None:
    src = CANDIDATES / f"{stem}.png"
    if not src.exists():
        raise SystemExit(f"{src} does not exist")
    if (ART / f"{stem}.png").exists():
        raise SystemExit(f"art/scenes/{stem}.png already exists, pick another stem")
    g = grade(stem, src)
    if not g.ok and not force:
        raise SystemExit(f"{stem} fails the gate: " + "; ".join(g.reasons) + ". Use --force only if Luis said so.")
    shutil.move(str(src), ART / f"{stem}.png")
    print(f"moved to art/scenes/{stem}.png")
    if g.seed:
        print(f'add to SEEDS:  "{stem}": ({g.seed[0]:.1f}, {g.seed[1]:.1f}),')
    print("then: npm run scenes, a DEMO row in src/landing/demo.ts, npm test")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--debug", metavar="PNG", help="also draw the found balloon boxes into this sheet")
    ap.add_argument("--candidates", nargs="?", const=str(CANDIDATES), metavar="DIR", help="grade candidate PNGs against the shipped panels")
    ap.add_argument("--approve", metavar="STEM", help="move a passed candidate into art/scenes")
    ap.add_argument("--force", action="store_true", help="approve even if the gate fails")
    args = ap.parse_args()
    if args.approve:
        approve(args.approve, args.force)
        return
    if args.candidates:
        folder = Path(args.candidates)
        if not folder.is_absolute():
            folder = ROOT / folder
        folder.mkdir(parents=True, exist_ok=True)
        grades = grade_folder(folder)
        sys.exit(0 if all(g.ok for g in grades) else 1)
    build(args.debug)


if __name__ == "__main__":
    main()
