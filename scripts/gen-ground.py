#!/usr/bin/env python3
"""Generate the painted-light ground for riian gèng.

One continuous colour field: Bangkok dawn over the river.
indigo -> plum -> apricot -> pale gold, with a few soft light pools,
gaussian-blurred so no edge survives. Seeded so the output is reproducible.

Usage: python3 scripts/gen-ground.py
Writes public/ground.jpg (1600x1000) and public/ground-portrait.jpg (800x1400).
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SEED = 2569  # Thai Buddhist year for 2026
OUT = Path(__file__).resolve().parent.parent / "public"

INDIGO = (27, 31, 59)
PLUM = (74, 42, 77)
APRICOT = (232, 137, 90)
GOLD = (214, 160, 104)  # amber on the raster; the pale gold #f6e3b4 is reserved for ink
RIVER = (38, 52, 84)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def stops(t: float):
    """Vertical dawn gradient: indigo at top, gold near the horizon, river below."""
    if t < 0.55:
        return lerp(INDIGO, PLUM, t / 0.55)
    if t < 0.80:
        return lerp(PLUM, APRICOT, (t - 0.55) / 0.25)
    if t < 0.86:
        return lerp(APRICOT, GOLD, (t - 0.80) / 0.06)
    if t < 0.90:
        return lerp(GOLD, APRICOT, (t - 0.86) / 0.04)
    return lerp(APRICOT, RIVER, (t - 0.90) / 0.10)


def render(w: int, h: int, name: str, rng: random.Random) -> None:
    small_w, small_h = w // 8, h // 8
    img = Image.new("RGB", (small_w, small_h))
    px = img.load()
    for y in range(small_h):
        c = stops(y / (small_h - 1))
        for x in range(small_w):
            px[x, y] = c

    # Light pools: warm near the horizon, cool high up.
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(9):
        cx = rng.uniform(0.1, 0.9) * small_w
        cy = rng.uniform(0.45, 0.95) * small_h
        r = rng.uniform(0.18, 0.42) * small_w
        warm = cy / small_h
        col = lerp(PLUM, GOLD, min(1.0, warm * 1.1))
        alpha = int(rng.uniform(30, 70))
        draw.ellipse([cx - r, cy - r * 0.6, cx + r, cy + r * 0.6], fill=col + (alpha,))
    for _ in range(4):
        cx = rng.uniform(0.0, 1.0) * small_w
        cy = rng.uniform(0.0, 0.4) * small_h
        r = rng.uniform(0.2, 0.5) * small_w
        alpha = int(rng.uniform(30, 70))
        draw.ellipse([cx - r, cy - r * 0.7, cx + r, cy + r * 0.7], fill=RIVER + (alpha,))

    img = img.resize((w, h), Image.BICUBIC)
    img = img.filter(ImageFilter.GaussianBlur(radius=max(w, h) / 28))

    # Slight horizon glow band
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    hy = int(h * 0.87)
    for i in range(60):
        a = int(18 * (1 - i / 60) ** 2)
        gd.line([(0, hy - i), (w, hy - i)], fill=GOLD + (a,))
        gd.line([(0, hy + i), (w, hy + i)], fill=GOLD + (a,))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=h / 30))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / name
    img.save(
        out,
        "JPEG",
        quality=86,
        optimize=True,
        comment=f"riian geng ground, procedurally generated, seed {SEED}, {w}x{h}".encode(),
    )
    print(f"wrote {out} ({w}x{h})")


if __name__ == "__main__":
    rng = random.Random(SEED)
    render(1600, 1000, "ground.jpg", rng)
    render(800, 1400, "ground-portrait.jpg", random.Random(SEED + 1))
