#!/usr/bin/env python3
"""Build the Latin webfonts into public/fonts: Brygada 1918, Onest, Didact Gothic.

Each style becomes ONE woff2 subset from the full Google Fonts source. Google's
CSS subsets split by unicode-range and leave out U+0302 and U+030C, so a tone
mark after ɔ, ə or ε fell back to another font. One file per style keeps every
base letter and every combining mark in the same font.

The Thai faces (Noto Serif Thai, Fahkwang, Mali) are committed as they are.
"""

from __future__ import annotations

import io
import ssl
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "public" / "fonts"
SRC = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
CTX = ssl.create_default_context()

# dir in google/fonts, source file, output dir, output file
FACES = [
    ("brygada1918", "Brygada1918[wght].ttf", "brygada-1918", "brygada-1918-roman.woff2"),
    ("brygada1918", "Brygada1918-Italic[wght].ttf", "brygada-1918", "brygada-1918-italic.woff2"),
    ("onest", "Onest[wght].ttf", "onest", "onest.woff2"),
    ("didactgothic", "DidactGothic-Regular.ttf", "didact-gothic", "didact-gothic.woff2"),
]

RANGES = [
    (0x0020, 0x007E),  # Basic Latin
    (0x00A0, 0x00FF),  # Latin-1
    (0x0100, 0x024F),  # Latin Extended-A and -B (ǎ ǐ ǒ ǔ)
    (0x0250, 0x02FF),  # IPA (ɔ ɛ ə) and spacing modifiers
    (0x0300, 0x036F),  # every combining mark
    (0x0370, 0x03FF),  # Greek (ε έ), where the face has it
    (0x1E00, 0x1EFF),  # Latin Extended Additional (ʉ)
    (0x1F00, 0x1FFF),  # Greek Extended (ὲ)
    (0x2000, 0x206F),  # punctuation
    (0x20A0, 0x20CF),  # currency
    (0x2100, 0x214F),  # letterlike
    (0x2190, 0x21FF),  # arrows
    (0x2212, 0x2215),
    (0x25CC, 0x25CC),  # dotted circle
    (0xFEFF, 0xFEFF),
    (0xFFFD, 0xFFFD),
]


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, context=CTX, timeout=120) as res:
        return res.read()


def build(src_dir: str, src_file: str, out_dir: str, out_file: str) -> None:
    font = TTFont(io.BytesIO(fetch(SRC + src_dir + "/" + urllib.parse.quote(src_file))))
    options = subset.Options()
    options.layout_features = ["*"]
    options.flavor = "woff2"
    options.hinting = False
    options.glyph_names = False
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=[cp for lo, hi in RANGES for cp in range(lo, hi + 1)])
    sub.subset(font)
    dest = FONTS / out_dir
    dest.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(dest / out_file)
    license_path = dest / "OFL.txt"
    if not license_path.exists():
        license_path.write_bytes(fetch(SRC + src_dir + "/OFL.txt"))
    size = (dest / out_file).stat().st_size // 1024
    print(f"{(dest / out_file).relative_to(ROOT)}  {size} KB")


def main() -> None:
    for face in FACES:
        build(*face)


if __name__ == "__main__":
    main()
