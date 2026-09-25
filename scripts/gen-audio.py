#!/usr/bin/env python3
"""Generate neural Thai clips for Voice entries (edge-tts, Premwadee).

Usage: python3 scripts/gen-audio.py
       python3 scripts/gen-audio.py --level 0

Skip files that already exist unless --force. Writes public/audio/{id}.mp3
and src/audio/clip-manifest.json for the ids that landed.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "public" / "audio"
CATALOG = AUDIO / "catalog.json"
MANIFEST = ROOT / "src" / "audio" / "clip-manifest.json"
VOICE = "th-TH-PremwadeeNeural"

# Same Thai spelling, different words. Isolated ไหม is read as silk (rising).
OVERRIDES = {
    "w:mái": "มั้ย",
    "w:mǎi": "ไหม",
}


def dump_catalog() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["npx", "tsx", "scripts/dump-audio-catalog.ts"],
        cwd=ROOT,
        check=True,
    )


def spoken(thai: str) -> str:
    """What the voice says. Premwadee is a woman, so of ครับ/ค่ะ she says ค่ะ, not both."""
    return thai.replace("ครับ/", "")


def load_rows(level: int | None) -> list[dict]:
    rows = json.loads(CATALOG.read_text())
    if level is None:
        return rows
    return [r for r in rows if r["level"] == level]


def clip_stem(entry_id: str) -> str:
    return entry_id.replace("/", "_").replace("#", "_")


def write_manifest(rows: list[dict]) -> list[str]:
    ids = []
    for row in rows:
        dest = AUDIO / f"{clip_stem(row['id'])}.mp3"
        if dest.exists() and dest.stat().st_size >= 200:
            ids.append(row["id"])
    ids.sort()
    MANIFEST.write_text(json.dumps({"ids": ids}, ensure_ascii=False, indent=2) + "\n")
    return ids


async def synth(text: str, dest: Path) -> None:
    import edge_tts

    tmp = dest.with_name(dest.stem + ".part.mp3")
    last_err: Exception | None = None
    for attempt in range(4):
        try:
            comm = edge_tts.Communicate(text, VOICE)
            await comm.save(str(tmp))
            if tmp.stat().st_size < 200:
                tmp.unlink(missing_ok=True)
                raise RuntimeError("empty clip")
            tmp.replace(dest)
            return
        except Exception as e:
            last_err = e
            tmp.unlink(missing_ok=True)
            await asyncio.sleep(1.5 * (attempt + 1))
    raise last_err if last_err else RuntimeError("synth failed")


async def run(rows: list[dict], force: bool, concurrency: int) -> tuple[int, int, int]:
    sem = asyncio.Semaphore(concurrency)
    ok = skip = fail = 0
    lock = asyncio.Lock()

    async def one(row: dict) -> None:
        nonlocal ok, skip, fail
        dest = AUDIO / f"{clip_stem(row['id'])}.mp3"
        if dest.exists() and dest.stat().st_size >= 200 and not force:
            async with lock:
                skip += 1
            return
        if dest.exists():
            dest.unlink()
        text = OVERRIDES.get(row["id"], spoken(row["thai"]))
        if not text.strip():
            async with lock:
                fail += 1
            print(f"empty {row['id']}", file=sys.stderr)
            return
        async with sem:
            try:
                await synth(text, dest)
            except Exception as e:
                async with lock:
                    fail += 1
                print(f"fail {row['id']}: {e}", file=sys.stderr)
                return
        async with lock:
            ok += 1
            if ok % 25 == 0:
                print(f"wrote {ok}", flush=True)

    await asyncio.gather(*(one(r) for r in rows))
    return ok, skip, fail


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--level", type=int)
    p.add_argument("--force", action="store_true")
    p.add_argument("--concurrency", type=int, default=3)
    args = p.parse_args()

    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("pip3 install edge-tts", file=sys.stderr)
        return 1

    dump_catalog()
    rows = load_rows(args.level)
    print(f"{len(rows)} Voice lines", flush=True)
    ok, skip, fail = asyncio.run(run(rows, args.force, args.concurrency))
    ids = write_manifest(rows if args.level is None else json.loads(CATALOG.read_text()))
    print(f"ok {ok} skip {skip} fail {fail} manifest {len(ids)}")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
