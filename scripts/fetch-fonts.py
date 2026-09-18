#!/usr/bin/env python3
"""Download Fraunces, Charis SIL, and Noto Serif Thai woff2 files into public/fonts."""

from __future__ import annotations

import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "public" / "fonts"
CSS = (
    "https://fonts.googleapis.com/css2"
    "?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,500"
    "&family=Charis+SIL:ital,wght@0,400;0,700;1,400"
    "&family=Noto+Serif+Thai:wght@300;400;500"
    "&display=swap"
)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
CTX = ssl.create_default_context()


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=CTX) as res:
        return res.read()


def family_dir(family: str) -> Path:
    name = family.strip("'\"").lower()
    if "fraunces" in name:
        return FONTS / "fraunces"
    if "charis" in name:
        return FONTS / "charis-sil"
    if "noto" in name:
        return FONTS / "noto-serif-thai"
    return FONTS / "other"


def main() -> None:
    css = fetch(CSS).decode("utf-8")
    blocks = re.split(r"(?=@font-face)", css)
    n = 0
    for block in blocks:
        if "@font-face" not in block:
            continue
        fam = re.search(r"font-family:\s*([^;]+);", block)
        src = re.search(r"url\(([^)]+\.woff2)\)", block)
        if not fam or not src:
            continue
        dest_dir = family_dir(fam.group(1))
        dest_dir.mkdir(parents=True, exist_ok=True)
        url = src.group(1)
        name = url.rsplit("/", 1)[-1]
        dest = dest_dir / name
        if not dest.exists():
            dest.write_bytes(fetch(url))
        n += 1
        print(dest.relative_to(ROOT))
    (FONTS / "google-faces.css").write_text(css, encoding="utf-8")
    print(f"wrote {n} faces")


if __name__ == "__main__":
    main()
