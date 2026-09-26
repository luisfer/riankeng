#!/usr/bin/env python3
"""Draw every Script letter card's glyph as ink paths, head first, from the font the app sets Thai in.

Usage: python3 scripts/gen-letters.py

Reads Noto Serif Thai (public/fonts/noto-serif-thai) and content/script/alphabet.ts, and writes
src/ui/letter-paths.ts. Each letter is its contours in writing order: the head loop first (the
leftmost closed counter, where a Thai letter starts), then the body, traced from the point nearest
the head. A letter with no closed loop, like ก in this face, starts at its leftmost point.
Combining marks (ั ิ ่ and the rest) sit on a dotted circle in the app and are not drawn here.
"""
from __future__ import annotations

import glob
import math
import re
import unicodedata
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT = next(iter(glob.glob(str(ROOT / "public/fonts/noto-serif-thai/*.woff2"))))
ALPHABET = ROOT / "content/script/alphabet.ts"
OUT = ROOT / "src/ui/letter-paths.ts"


def letters() -> list[str]:
    """Every single-codepoint letter, vowel letter, sign and digit the alphabet lists, bar the combining marks."""
    src = ALPHABET.read_text(encoding="utf-8")
    chars = re.findall(r"char: '([^']+)'", src) + re.findall(r"'([๐-๙])'", src)
    out: list[str] = []
    for ch in chars:
        if len(ch) != 1 or unicodedata.category(ch) == "Mn" or ch in out:
            continue
        out.append(ch)
    return out


def area(pts: list[tuple[int, int]]) -> float:
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1])) / 2


def centroid(pts: list[tuple[int, int]]) -> tuple[float, float]:
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def qpoint(p0, c, p1, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1])


def segments(pts: list[tuple[int, int, bool]]):
    """TrueType contour points (x, y, on-curve), starting on-curve, as line and quadratic segments."""
    n = len(pts)
    out = []
    start = (pts[0][0], pts[0][1])
    cur = start
    pending = None
    for k in range(1, n + 1):
        x, y, on = pts[k % n]
        if on:
            out.append(("L", (x, y)) if pending is None else ("Q", pending, (x, y)))
            pending = None
            cur = (x, y)
        else:
            if pending is not None:
                mid = ((pending[0] + x) / 2, (pending[1] + y) / 2)
                out.append(("Q", pending, mid))
                cur = mid
            pending = (x, y)
    if pending is not None:
        out.append(("Q", pending, start))
    return out


def contour_path(pts: list[tuple[int, int, bool]], ascent: int) -> tuple[str, float]:
    """An SVG subpath, y flipped so the ascent sits at 0, and its length for timing."""

    def f(p):
        return f"{round(p[0])} {round(ascent - p[1])}"

    d = [f"M{f(pts[0][:2])}"]
    length = 0.0
    cur = pts[0][:2]
    for seg in segments(pts):
        if seg[0] == "L":
            d.append(f"L{f(seg[1])}")
            length += math.dist(cur, seg[1])
            cur = seg[1]
        else:
            _, c, p1 = seg
            d.append(f"Q{f(c)} {f(p1)}")
            prev = cur
            for s in range(1, 9):
                q = qpoint(cur, c, p1, s / 8)
                length += math.dist(prev, q)
                prev = q
            cur = p1
    return "".join(d) + "Z", length


def rotate_to(pts: list[tuple[int, int, bool]], target: tuple[float, float]) -> list[tuple[int, int, bool]]:
    """Start the contour at its on-curve point nearest the target."""
    best = min((i for i, p in enumerate(pts) if p[2]), key=lambda i: math.dist(pts[i][:2], target))
    return pts[best:] + pts[:best]


def glyph(font: TTFont, ch: str) -> dict | None:
    cmap = font.getBestCmap()
    name = cmap.get(ord(ch))
    if not name:
        return None
    glyf = font["glyf"]
    coords, ends, flags = glyf[name].getCoordinates(glyf)
    raw = []
    s = 0
    for e in ends:
        raw.append([(int(x), int(y), bool(fl & 1)) for (x, y), fl in zip(coords[s : e + 1], flags[s : e + 1])])
        s = e + 1
    raw = [c for c in raw if len(c) > 2 and any(p[2] for p in c)]
    if not raw:
        return None
    areas = [area([p[:2] for p in c]) for c in raw]
    outer_sign = math.copysign(1, max(areas, key=abs))
    holes = [c for c, a in zip(raw, areas) if math.copysign(1, a) != outer_sign]
    bodies = [c for c, a in zip(raw, areas) if math.copysign(1, a) == outer_sign]
    # The head: the leftmost closed loop, or, with none, the leftmost point of the letter.
    holes.sort(key=lambda c: centroid([p[:2] for p in c])[0])
    if holes:
        head = centroid([p[:2] for p in holes[0]])
    else:
        allpts = [p for c in bodies for p in c if p[2]]
        left = min(allpts, key=lambda p: (p[0], -p[1]))
        head = (left[0], left[1])
    bodies.sort(key=lambda c: min(math.dist(p[:2], head) for p in c))
    ordered = [rotate_to(c, head) for c in holes[:1]] + [rotate_to(c, head) for c in bodies] + [rotate_to(c, head) for c in holes[1:]]
    ascent = font["hhea"].ascent
    descent = font["hhea"].descent
    advance = font["hmtx"][name][0]
    contours = []
    for c in ordered:
        d, length = contour_path(c, ascent)
        contours.append({"d": d, "len": round(length)})
    xs = [p[0] for c in raw for p in c]
    x0 = min(0, min(xs))
    x1 = max(advance, max(xs))
    return {"viewBox": f"{x0} 0 {x1 - x0} {ascent - descent}", "contours": contours}


def main() -> None:
    font = TTFont(FONT)
    assert font["hhea"].ascent == font["OS/2"].sTypoAscender and -font["hhea"].descent == -font["OS/2"].sTypoDescender, "hhea and typo metrics differ"
    rows = []
    missing = []
    for ch in letters():
        g = glyph(font, ch)
        if not g:
            missing.append(ch)
            continue
        parts = ", ".join(f"{{ d: '{c['d']}', len: {c['len']} }}" for c in g["contours"])
        rows.append(f"  '{ch}': {{ viewBox: '{g['viewBox']}', contours: [{parts}] }},")
    ts = [
        "/**",
        " * Generated by scripts/gen-letters.py from Noto Serif Thai. Run python3 scripts/gen-letters.py; do not edit.",
        " * Each Script letter as ink contours in writing order: the head loop first, then the body from the head.",
        " * Units are the font's, with the ascent at 0, so a letter sits where the text would.",
        " */",
        "export interface LetterPath {",
        "  viewBox: string",
        "  contours: { d: string; len: number }[]",
        "}",
        "",
        "/** The face's own measures, in the units the paths use. */",
        f"export const LETTER_FACE = {{ unitsPerEm: {font['head'].unitsPerEm}, ascent: {font['hhea'].ascent}, descent: {-font['hhea'].descent} }}",
        "",
        "export const LETTER_PATHS: Record<string, LetterPath> = {",
        *rows,
        "}",
        "",
    ]
    OUT.write_text("\n".join(ts), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(rows)} letters, {OUT.stat().st_size // 1024} KB" + (f", no glyph for {missing}" if missing else ""))


if __name__ == "__main__":
    main()
