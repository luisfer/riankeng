#!/usr/bin/env python3
"""The mark, the icons and the wordmark, drawn from the fonts the page already ships.

The mark is ก carrying the mai ek of เก่ง, paper on a lacquer square, in Fahkwang Bold: a
consonant is a seat, and the tone sits on it. The lockup sets เรียนเก่ง in Fahkwang over
rian gèng in Didact Gothic. The romanization is spaced and scaled so the grave over è stands
under the mai ek over ก, and those two tone marks are the only lacquer.

Writes:
  public/favicon.svg, public/favicon.ico       the mark at tab size
  public/icons/*.png                           apple-touch, 192, 512 and maskable 512
  public/brand/mark.svg, lockup.svg, wordmark.svg
  src/brand/paths.ts                           the lockup, for drawing inline
  index.html                                   any inline lockup between <!-- brand:lockup --> markers

Usage: python3 scripts/gen-brand.py
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image
from PIL.PngImagePlugin import PngInfo

ROOT = Path(__file__).resolve().parents[1]
FONTS = {
    "thai": ROOT / "public/fonts/fahkwang/Fahkwang-Regular.woff2",
    "thai-bold": ROOT / "art/fonts/Fahkwang-Bold.ttf",
    "latin": ROOT / "public/fonts/didact-gothic/didact-gothic.woff2",
}
PAPER = "#f2ead8"
LACQUER = "#9a2b1f"
INK = "#1c1710"
NAME = "rian gèng, เรียนเก่ง"

# The mark, in thousandths of its square, at three optical sizes. Tab fills the square for
# 16 to 48px. Icon breathes. Safe keeps ก่ inside the 80% circle a maskable icon promises.
MARK = {
    "tab": (0.80, 8),
    "icon": (0.62, 18),
    "safe": (0.50, 14),
}
TRACKING = 60  # the romanization's letterspacing, in Didact units
LEAD = 1100  # Thai baseline to Latin baseline, in Fahkwang units
ROW_LATIN = 0.654  # the one-line wordmark keeps the site's 26:17
ROW_GAP = 460

THAI_TONE_MARKS = {"uni0E48", "uni0E49", "uni0E4A", "uni0E4B"}
LATIN_TONE_MARKS = {"gravecomb", "acutecomb", "circumflexcomb", "caroncomb"}

_fonts: dict[str, TTFont] = {}


def font(key: str) -> TTFont:
    if key not in _fonts:
        _fonts[key] = TTFont(FONTS[key])
    return _fonts[key]


@dataclass(frozen=True)
class Glyph:
    font: str
    name: str
    x: float
    y: float
    tone: bool


def _attach(f: TTFont, mark: str, base: str) -> tuple[float, float] | None:
    """Where the font's own mark-to-base anchors put a mark on its base."""
    for lookup in f["GPOS"].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if st.LookupType == 9:
                st = st.ExtSubTable
            if st.LookupType != 4:
                continue
            marks, bases = st.MarkCoverage.glyphs, st.BaseCoverage.glyphs
            if mark in marks and base in bases:
                rec = st.MarkArray.MarkRecord[marks.index(mark)]
                anchor = st.BaseArray.BaseRecord[bases.index(base)].BaseAnchor[rec.Class]
                if anchor is not None:
                    return anchor.XCoordinate - rec.MarkAnchor.XCoordinate, anchor.YCoordinate - rec.MarkAnchor.YCoordinate
    return None


def thai(text: str, key: str = "thai") -> list[Glyph]:
    f = font(key)
    cmap, hmtx = f.getBestCmap(), f["hmtx"]
    out: list[Glyph] = []
    pen = 0.0
    base: Glyph | None = None
    for ch in text:
        name = cmap[ord(ch)]
        advance = hmtx[name][0]
        if advance == 0 and base is not None:
            dx, dy = _attach(f, name, base.name) or (pen - base.x, 0.0)
            out.append(Glyph(key, name, base.x + dx, base.y + dy, name in THAI_TONE_MARKS))
            continue
        base = Glyph(key, name, pen, 0.0, False)
        out.append(base)
        pen += advance
    return out


def latin(text: str, tracking: float = 0.0) -> list[Glyph]:
    """Didact builds è from e and a combining grave, so the accent can take its own colour."""
    f = font("latin")
    cmap, hmtx, glyf = f.getBestCmap(), f["hmtx"], f["glyf"]
    out: list[Glyph] = []
    pen = 0.0
    for ch in text:
        name = cmap[ord(ch)]
        g = glyf[name]
        if g.isComposite() and any(c.glyphName in LATIN_TONE_MARKS for c in g.components):
            for c in g.components:
                out.append(Glyph("latin", c.glyphName, pen + c.x, c.y, c.glyphName in LATIN_TONE_MARKS))
        elif ch != " ":
            out.append(Glyph("latin", name, pen, 0.0, False))
        pen += hmtx[name][0] + tracking
    return out


def bounds(glyphs: list[Glyph]) -> tuple[float, float, float, float]:
    boxes = []
    for g in glyphs:
        gs = font(g.font).getGlyphSet()
        pen = BoundsPen(gs)
        gs[g.name].draw(pen)
        if pen.bounds:
            x0, y0, x1, y1 = pen.bounds
            boxes.append((g.x + x0, g.y + y0, g.x + x1, g.y + y1))
    return min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)


def centre_x(glyphs: list[Glyph]) -> float:
    x0, _, x1, _ = bounds(glyphs)
    return (x0 + x1) / 2


def _draw(glyphs: list[Glyph], pen_for, scale: float, ox: float, oy: float) -> None:
    """Draw into a pen with y down: a font point (x, y) lands at (ox + s·x, oy − s·y)."""
    for g in glyphs:
        gs = font(g.font).getGlyphSet()
        gs[g.name].draw(TransformPen(pen_for(gs), (scale, 0, 0, -scale, ox + scale * g.x, oy - scale * g.y)))


def path(glyphs: list[Glyph], scale: float, ox: float, oy: float) -> str:
    parts: list[str] = []

    def pen_for(gs):
        p = SVGPathPen(gs, ntos=lambda v: str(round(v)))
        parts.append(p)
        return p

    _draw(glyphs, pen_for, scale, ox, oy)
    return "".join(p.getCommands() for p in parts)


class _Flatten(BasePen):
    """Outlines as polygons, for the rasterizer."""

    def __init__(self, glyphset, contours: list[list[tuple[float, float]]], steps: int = 32):
        super().__init__(glyphset)
        self.contours, self.steps, self.cur = contours, steps, []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _qCurveToOne(self, p1, p2):
        (x0, y0) = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            u = 1 - t
            self.cur.append((u * u * x0 + 2 * u * t * p1[0] + t * t * p2[0], u * u * y0 + 2 * u * t * p1[1] + t * t * p2[1]))

    def _curveToOne(self, p1, p2, p3):
        (x0, y0) = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            u = 1 - t
            self.cur.append((
                u**3 * x0 + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * y0 + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            ))

    def _closePath(self):
        if len(self.cur) > 2:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


def polygons(glyphs: list[Glyph], scale: float, ox: float, oy: float) -> list[list[tuple[float, float]]]:
    contours: list[list[tuple[float, float]]] = []
    _draw(glyphs, lambda gs: _Flatten(gs, contours), scale, ox, oy)
    return contours


def coverage(contours: list[list[tuple[float, float]]], size: int, supersample: int) -> Image.Image:
    """Nonzero-winding fill of contours given on a 1000 grid, box-filtered down to size."""
    n = size * supersample
    k = n / 1000
    edges = []
    for contour in contours:
        pts = [(x * k, y * k) for x, y in contour]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
            if y0 == y1:
                continue
            wind = 1 if y1 > y0 else -1
            if y0 > y1:
                x0, y0, x1, y1 = x1, y1, x0, y0
            edges.append((x0, y0, x1, y1, wind))
    e_all = np.array(edges, dtype=np.float64)
    mask = np.zeros((n, n), dtype=np.uint8)
    for row in range(n):
        y = row + 0.5
        live = (e_all[:, 1] <= y) & (y < e_all[:, 3])
        if not live.any():
            continue
        e = e_all[live]
        xs = e[:, 0] + (y - e[:, 1]) * (e[:, 2] - e[:, 0]) / (e[:, 3] - e[:, 1])
        order = np.argsort(xs, kind="stable")
        xs, winding = xs[order], np.cumsum(e[order, 4])
        for i in range(len(xs) - 1):
            if winding[i] != 0:
                a = max(int(np.ceil(xs[i] - 0.5)), 0)
                b = min(int(np.ceil(xs[i + 1] - 0.5)), n)
                if b > a:
                    mask[row, a:b] = 255
    return Image.fromarray(mask, "L").resize((size, size), Image.Resampling.BOX)


# ── the mark ──────────────────────────────────────────────────────────────────


def mark_geometry(optical: str) -> tuple[list[Glyph], float, float, float]:
    glyphs = thai("ก่", key="thai-bold")
    fill, drop = MARK[optical]
    x0, y0, x1, y1 = bounds(glyphs)
    s = fill * 1000 / (y1 - y0)
    return glyphs, s, 500 - s * (x0 + x1) / 2, 500 + s * (y0 + y1) / 2 + drop


def mark_svg(optical: str) -> str:
    glyphs, s, ox, oy = mark_geometry(optical)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><title>{NAME}</title>'
        f'<rect width="1000" height="1000" fill="{LACQUER}"/><path d="{path(glyphs, s, ox, oy)}" fill="{PAPER}"/></svg>\n'
    )


def mark_png(optical: str, size: int) -> Image.Image:
    glyphs, s, ox, oy = mark_geometry(optical)
    cov = coverage(polygons(glyphs, s, ox, oy), size, 16 if size <= 64 else 8)
    return Image.composite(Image.new("RGB", (size, size), PAPER), Image.new("RGB", (size, size), LACQUER), cov)


# ── the wordmark ──────────────────────────────────────────────────────────────


def lockup_layout() -> tuple[list[Glyph], list[Glyph], float, float, float, float, float, int, int]:
    """Glyphs and placement of the lockup: Thai at scale 1, the romanization at s."""
    th = thai("เรียนเก่ง")
    la = latin("rian gèng", TRACKING)
    tb, lb = bounds(th), bounds(la)
    mai_ek = centre_x([g for g in th if g.tone]) - tb[0]
    grave = centre_x([g for g in la if g.tone]) - lb[0]
    s = mai_ek / grave  # the Latin scale that stands the grave under the mai ek
    th_base = tb[3]
    la_base = th_base + LEAD
    th_x, la_x = -tb[0], -lb[0] * s
    width = round(max(tb[2] + th_x, lb[2] * s + la_x))
    height = round(la_base - lb[1] * s)
    return th, la, s, th_x, th_base, la_x, la_base, width, height


def lockup() -> dict[str, str | int]:
    """เรียนเก่ง over rian gèng, flush left, one vertical line through both tone marks."""
    th, la, s, th_x, th_base, la_x, la_base, width, height = lockup_layout()
    parts = {
        "thaiInk": path([g for g in th if not g.tone], 1, th_x, th_base),
        "thaiMark": path([g for g in th if g.tone], 1, th_x, th_base),
        "romInk": path([g for g in la if not g.tone], s, la_x, la_base),
        "romMark": path([g for g in la if g.tone], s, la_x, la_base),
    }
    return {"width": width, "height": height, **parts}


def row() -> dict[str, str | int]:
    """The one-line wordmark: เรียนเก่ง, then rian gèng on the same baseline."""
    th = thai("เรียนเก่ง")
    la = latin("rian gèng", TRACKING)
    tb, lb = bounds(th), bounds(la)
    base = tb[3]
    th_x = -tb[0]
    la_x = tb[2] + th_x + ROW_GAP - lb[0] * ROW_LATIN
    ink = path([g for g in th if not g.tone], 1, th_x, base) + path([g for g in la if not g.tone], ROW_LATIN, la_x, base)
    tone = path([g for g in th if g.tone], 1, th_x, base) + path([g for g in la if g.tone], ROW_LATIN, la_x, base)
    return {"width": round(la_x + lb[2] * ROW_LATIN), "height": round(base - lb[1] * ROW_LATIN), "ink": ink, "mark": tone}


def lockup_inline(lk: dict) -> str:
    """The landing page's copy: the two lines as groups, so the romanization can give way to its English."""
    return (
        f'<svg class="lockup" viewBox="0 0 {lk["width"]} {lk["height"]}" aria-hidden="true" focusable="false">'
        f'<g class="lockup-th"><path class="wm-ink" d="{lk["thaiInk"]}"/><path class="wm-mark" d="{lk["thaiMark"]}"/></g>'
        f'<g class="lockup-rom"><path class="wm-ink" d="{lk["romInk"]}"/><path class="wm-mark" d="{lk["romMark"]}"/></g>'
        f"</svg>"
    )


def standalone(width, height, ink: str, mark: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}"><title>{NAME}</title>'
        f'<path d="{ink}" fill="{INK}"/><path d="{mark}" fill="{LACQUER}"/></svg>\n'
    )


# ── the share card ────────────────────────────────────────────────────────────

SHARE = (1200, 630)
SHARE_PANEL = "coffee"
SHARE_FACES = {
    "display": ROOT / "public/fonts/brygada-1918/brygada-1918-roman.woff2",
    "display-italic": ROOT / "public/fonts/brygada-1918/brygada-1918-italic.woff2",
    "ui": ROOT / "public/fonts/onest/onest.woff2",
    "balloon": ROOT / "public/fonts/mali/mali-thai.woff2",
}
# The coffee panel's phrase and its balloon, as src/landing/demo.ts and scenes.css have them.
SHARE_BALLOON = {"lines": ["ขอกาแฟเย็น", "หนึ่งแก้ว"], "em": 5.72, "bx": 44.4, "by": 15.9, "bw": 36.3, "bh": 18.6}


def _face(key: str, size: int):
    """A shipped woff2 as a Pillow face, shaped by Raqm so the headline keeps its kerning."""
    from io import BytesIO

    from PIL import ImageFont

    f = TTFont(SHARE_FACES[key])
    f.flavor = None
    buf = BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size, layout_engine=ImageFont.Layout.RAQM)


def _ink(canvas: Image.Image, contours: list[list[tuple[float, float]]], colour: str) -> None:
    """Fill contours given in canvas pixels, at the canvas's own size."""
    w, h = canvas.size
    side = max(w, h)
    grid = [[(x * 1000 / side, y * 1000 / side) for x, y in c] for c in contours]
    cov = coverage(grid, side, 2).crop((0, 0, w, h))
    canvas.paste(Image.new("RGB", (w, h), colour), (0, 0), cov)


def share_card() -> Image.Image:
    """1200x630 for link previews: the mark and lockup, the landing's headline, one drawn panel.
    Drawn at twice the size and scaled down, so Mali's thin strokes survive at balloon size."""
    from PIL import ImageDraw

    u = 2
    w, h = SHARE[0] * u, SHARE[1] * u
    card = Image.new("RGB", (w, h), PAPER)
    draw = ImageDraw.Draw(card)
    margin = 72 * u

    # The drawing, square, in the landing's ink frame, flush to the right margin.
    side = h - 2 * margin
    frame = 3 * u
    art = Image.open(ROOT / f"art/scenes/{SHARE_PANEL}.png").convert("RGB")
    inset = round(art.width * 22 / 1024)  # the crop gen-scenes.py makes, border and margin gone
    panel = side - 2 * frame
    art = art.crop((inset, inset, art.width - inset, art.height - inset)).resize((panel, panel), Image.Resampling.LANCZOS)
    px = w - margin - side
    card.paste(Image.new("RGB", (side, side), INK), (px, margin))
    card.paste(art, (px + frame, margin + frame))

    # Letter the balloon the way card.css does: Mali 500, centred, sized by the balloon's box.
    b = SHARE_BALLOON
    size = round(min(b["bw"] * 0.70 * panel / 100 / b["em"], b["bh"] * 0.58 * panel / 100 / len(b["lines"]) / 1.35))
    face = _face("balloon", size)
    cx, cy = px + frame + b["bx"] * panel / 100, margin + frame + b["by"] * panel / 100
    for i, line in enumerate(b["lines"]):
        y = cy + (i - (len(b["lines"]) - 1) / 2) * size * 1.35
        draw.text((cx, y), line, font=face, fill="#1a1612", anchor="mm", language="th")

    # The mark and the lockup beside it, as the site bar sets them.
    mark = 96 * u
    card.paste(mark_png("icon", mark), (margin, margin))
    th, la, s, th_x, th_base, la_x, la_base, lw, lh = lockup_layout()
    k = mark / lh
    ox, oy = margin + mark + 22 * u, margin
    parts = [
        ([g for g in th if not g.tone], 1, th_x, th_base, INK),
        ([g for g in th if g.tone], 1, th_x, th_base, LACQUER),
        ([g for g in la if not g.tone], s, la_x, la_base, INK),
        ([g for g in la if g.tone], s, la_x, la_base, LACQUER),
    ]
    for glyphs, scale, gx, gy, colour in parts:
        _ink(card, polygons(glyphs, scale * k, ox + gx * k, oy + gy * k), colour)

    # The headline, two lines, the second in lacquer italic as on the landing.
    size = 64 * u
    top = margin + mark + 92 * u
    draw.text((margin - 3 * u, top), "Learn Thai as", font=_face("display", size), fill=INK, anchor="ls")
    draw.text((margin - 3 * u, top + round(size * 1.18)), "Thais speak it.", font=_face("display-italic", size), fill=LACQUER, anchor="ls")
    draw.text((margin, h - margin), "riangeng.com", font=_face("ui", 26 * u), fill="#5a5146", anchor="ls")
    return card.resize(SHARE, Image.Resampling.LANCZOS)


def write_share_card() -> None:
    info = PngInfo()
    info.add_text("Comment", "rian geng share card, drawn by scripts/gen-brand.py from Fahkwang, Didact Gothic, Brygada 1918, Onest (OFL) and the coffee panel")
    out = ROOT / "public/og.png"
    share_card().save(out, "PNG", optimize=True, pnginfo=info)
    print(f"wrote public/og.png ({out.stat().st_size // 1024} KB)")


# ── writing ───────────────────────────────────────────────────────────────────


def write(rel: str, data: str | bytes) -> None:
    out = ROOT / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        out.write_text(data, encoding="utf-8")
    else:
        out.write_bytes(data)
    print(f"wrote {rel}")


def save_png(img: Image.Image, rel: str, optical: str) -> None:
    info = PngInfo()
    info.add_text("Comment", f"rian geng mark, {optical} size, drawn by scripts/gen-brand.py from Fahkwang Bold (OFL)")
    out = ROOT / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True, pnginfo=info)
    print(f"wrote {rel}")


def letter_landing(inline: str) -> None:
    """Refresh any inline copy of the lockup the landing page carries between markers."""
    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    marker = re.compile(r"(<!-- brand:lockup -->).*?(<!-- /brand:lockup -->)", re.S)
    if not marker.search(html):
        print("index.html carries no <!-- brand:lockup --> markers, left alone")
        return
    html_path.write_text(marker.sub(lambda m: m.group(1) + inline + m.group(2), html), encoding="utf-8")
    print("lettered index.html")


def main() -> None:
    write("public/favicon.svg", mark_svg("tab"))
    write("public/brand/mark.svg", mark_svg("icon"))

    tab = {size: mark_png("tab", size) for size in (16, 32, 48)}
    ico = ROOT / "public/favicon.ico"
    tab[48].save(ico, "ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[tab[16], tab[32]])
    print("wrote public/favicon.ico")
    save_png(mark_png("icon", 180), "public/icons/apple-touch-icon.png", "icon")
    save_png(mark_png("icon", 192), "public/icons/icon-192.png", "icon")
    save_png(mark_png("icon", 512), "public/icons/icon-512.png", "icon")
    save_png(mark_png("safe", 512), "public/icons/icon-maskable-512.png", "safe")

    lk = lockup()
    write("public/brand/lockup.svg", standalone(lk["width"], lk["height"], lk["thaiInk"] + lk["romInk"], lk["thaiMark"] + lk["romMark"]))
    rw = row()
    write("public/brand/wordmark.svg", standalone(rw["width"], rw["height"], rw["ink"], rw["mark"]))

    ts = [
        "/** Generated by scripts/gen-brand.py from Fahkwang and Didact Gothic. Run npm run brand; do not edit. */",
        "",
        "/** เรียนเก่ง over rian gèng. The two tone marks stand on one vertical line and are the only lacquer. */",
        "export const LOCKUP = {",
        f"  width: {lk['width']},",
        f"  height: {lk['height']},",
    ]
    for key in ("thaiInk", "thaiMark", "romInk", "romMark"):
        ts.append(f"  {key}: '{lk[key]}',")
    ts += ["} as const", ""]
    write("src/brand/paths.ts", "\n".join(ts))

    letter_landing(lockup_inline(lk))
    write_share_card()


if __name__ == "__main__":
    import sys

    if "--og" in sys.argv:  # only the share card, leaving every other brand file as it is
        write_share_card()
    else:
        main()
