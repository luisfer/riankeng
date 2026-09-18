#!/usr/bin/env python3
"""Write 192 and 512 PNG icons: paper ground, lacquer bar."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
PAPER = (242, 234, 216)
LACQUER = (154, 43, 31)


def png(size: int) -> bytes:
    rows = []
    bar = max(8, size // 16)
    for y in range(size):
        row = bytearray()
        color = LACQUER if y < bar else PAPER
        for _ in range(size):
            row.extend(color)
        rows.append(b"\x00" + bytes(row))
    raw = b"".join(rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        path = OUT / f"icon-{size}.png"
        path.write_bytes(png(size))
        print(path)


if __name__ == "__main__":
    main()
