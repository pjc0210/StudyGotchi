#!/usr/bin/env python3
"""Download leftover CC0 creature GLBs and write the cycle catalog."""

from __future__ import annotations

import json
import os
import struct
import urllib.request
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CC0 = REPO / "assets" / "creatures" / "cc0"
LEDGER = CC0 / "LEDGER.md"
GOBKIT = CC0 / "gobkit"
CATALOG = REPO / "prototypes" / "world-lab" / "src" / "data" / "cycle-catalog.ts"

UA = "StudyGotchi/1.0 (local asset import; CC0 ledger)"

# Already in the ledger: Bat, Corgi, Duck, Platypus, Red, Bee, Marmot, Owl, Rat, Seal
MORE_GOBKIT = [
    ("Gobkit Minion A01", "https://gobkit.com/freebies/minion/minion-a01.glb", "minion-a01.glb", "Minion Pack blob."),
    ("Gobkit Minion A02", "https://gobkit.com/freebies/minion/minion-a02.glb", "minion-a02.glb", "Minion Pack blob."),
    ("Gobkit Minion B01", "https://gobkit.com/freebies/minion/minion-b01.glb", "minion-b01.glb", "Minion Pack blob."),
    ("Gobkit Minion B02", "https://gobkit.com/freebies/minion/minion-b02.glb", "minion-b02.glb", "Minion Pack blob."),
    ("Gobkit Minion C01", "https://gobkit.com/freebies/minion/minion-c01.glb", "minion-c01.glb", "Minion Pack blob."),
    ("Gobkit Minion C02", "https://gobkit.com/freebies/minion/minion-c02.glb", "minion-c02.glb", "Minion Pack blob."),
    ("Gobkit Minion D01", "https://gobkit.com/freebies/minion/minion-d01.glb", "minion-d01.glb", "Minion Pack blob."),
    ("Gobkit Minion D02", "https://gobkit.com/freebies/minion/minion-d02.glb", "minion-d02.glb", "Minion Pack blob."),
    ("Gobkit Hippo", "https://gobkit.com/freebies/animal/Hippo.glb", "Hippo.glb", "Previously skipped as off-theme; imported for the cycle board."),
    ("Gobkit Jellyfish", "https://gobkit.com/freebies/animal/Jellyfish.glb", "Jellyfish.glb", "Previously skipped; blob cousin."),
    ("Gobkit Fugu", "https://gobkit.com/freebies/animalB/Fugu.glb", "Fugu.glb", "Previously skipped; cute puffer."),
    ("Gobkit Goat", "https://gobkit.com/freebies/animalB/Goat.glb", "Goat.glb", "Previously skipped."),
    ("Gobkit Blue", "https://gobkit.com/freebies/animalB/Blue.glb", "Blue.glb", "Unknown species; imported for the cycle board."),
]


def is_glb(path: Path) -> bool:
    with path.open("rb") as f:
        return f.read(4) == b"glTF"


def download(url: str, dest: Path) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp, dest.open("wb") as out:
        out.write(resp.read())
    if not is_glb(dest):
        dest.unlink(missing_ok=True)
        return f"FAILED: not a GLB ({url})"
    return f"gobkit/{dest.name} ({dest.stat().st_size} bytes, glTF magic OK)"


def append_ledger(name: str, url: str, result: str, notes: str) -> None:
    today = date.today().isoformat()
    row = (
        f"| {name} | {url} | CC0 1.0 | https://gobkit.com | {result} | {today} | "
        f"Pack from gobkit.com/api/free. API license: CC0 1.0 (public domain). {notes} |\n"
    )
    text = LEDGER.read_text(encoding="utf-8")
    if name in text:
        return
    LEDGER.write_text(text + row, encoding="utf-8")


def write_catalog() -> None:
    items = []
    for stem in ("verity", "falsity", "cruelty", "lovity"):
        path = REPO / "assets" / "creatures" / "original" / "souls" / f"{stem}.glb"
        if path.exists():
            items.append(
                {
                    "id": stem,
                    "name": stem.title(),
                    "source": "StudyGotchi original soul-ball",
                    "license": "original",
                    "url": f"/assets/creatures/original/souls/{path.name}",
                }
            )
    order = ["souls", "gobkit", "polypizza", "kenney-cube-pets"]
    roots = [
        (REPO / "assets" / "creatures" / "original" / "souls", "StudyGotchi original", "original", "/assets/creatures/original/souls/"),
        (CC0 / "gobkit", "Gobkit", "CC0 1.0", "/assets/creatures/cc0/gobkit/"),
        (CC0 / "polypizza", "Quaternius via Poly Pizza", "CC0 1.0", "/assets/creatures/cc0/polypizza/"),
        (CC0 / "kenney-cube-pets", "Kenney Cube Pets", "CC0 1.0", "/assets/creatures/cc0/kenney-cube-pets/"),
    ]
    seen = {i["id"] for i in items}
    for folder, source, license_, prefix in roots:
        if not folder.exists():
            continue
        for path in sorted(folder.glob("*.glb")):
            if path.stem in seen:
                continue
            seen.add(path.stem)
            items.append(
                {
                    "id": path.stem,
                    "name": path.stem.replace("-", " ").replace("_", " ").title(),
                    "source": source,
                    "license": license_,
                    "url": prefix + path.name,
                }
            )
    ts = "export interface CycleItem {\n  id: string\n  name: string\n  source: string\n  license: string\n  url: string\n}\n\n"
    ts += f"export const CYCLE_CATALOG: CycleItem[] = {json.dumps(items, indent=2)}\n"
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(ts, encoding="utf-8")
    print(f"catalog {len(items)} items -> {CATALOG}")


def main() -> None:
    GOBKIT.mkdir(parents=True, exist_ok=True)
    for name, url, filename, notes in MORE_GOBKIT:
        dest = GOBKIT / filename
        if dest.exists() and is_glb(dest):
            result = f"gobkit/{filename} ({dest.stat().st_size} bytes, already present)"
            print("have", filename)
        else:
            append_ledger(name, url, "PENDING", notes)
            try:
                result = download(url, dest)
            except Exception as exc:
                result = f"FAILED: {exc}"
            # rewrite last pending row is messy; append the outcome as notes via a second write only if missing outcome
            text = LEDGER.read_text(encoding="utf-8")
            text = text.replace(
                f"| {name} | {url} | CC0 1.0 | https://gobkit.com | PENDING |",
                f"| {name} | {url} | CC0 1.0 | https://gobkit.com | {result} |",
            )
            if f"| {name} |" not in text:
                append_ledger(name, url, result, notes)
            else:
                LEDGER.write_text(text, encoding="utf-8")
            print(name, result)
    write_catalog()


if __name__ == "__main__":
    main()
