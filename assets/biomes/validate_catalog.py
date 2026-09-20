#!/usr/bin/env python3
"""Validate assets/biomes/catalog.json.

    python3 assets/biomes/validate_catalog.py            # schema + semantic checks, exit 1 on failure
    python3 assets/biomes/validate_catalog.py --fix      # rewrite derived fields (contrast ratios, terrain tints)

Schema validation uses `jsonschema` when installed and falls back to a stdlib required-key check.
Semantic checks (stdlib only):
  * every creature body colour reads >= 1.4 (WCAG ratio) against palette.ground, ratio stored matches
  * terrain_kinds[].tint == ground shifted by tint_hsl_offset (tolerance 2/255 per channel)
  * decor prop ids, marker signature props resolve to some family's props[] or shared_props[]
  * creature_archetype_weights sum to 1
  * growth_hero heights are monotonic across bands
  * sound_ambience names exist in assets/audio/sfx/manifest.json (when present)
  * shipped families keep the ids / file names recorded in assets/landmarks/manifest.json (when present)
"""
import colorsys, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CATALOG = os.path.join(HERE, "catalog.json")
SCHEMA = os.path.join(HERE, "catalog.schema.json")
SFX = os.path.join(ROOT, "assets", "audio", "sfx", "manifest.json")
LANDMARKS = os.path.join(ROOT, "assets", "landmarks", "manifest.json")
MIN_CONTRAST = 1.4


def rgb01(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def hexof(r, g, b):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c * 255))) for c in (r, g, b))

def lum(h):
    def lin(c): return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb01(h)); return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(a, b):
    la, lb = lum(a), lum(b); return round((max(la, lb) + 0.05) / (min(la, lb) + 0.05), 3)

def apply_offset(ground, off):
    hh, l, s = colorsys.rgb_to_hls(*rgb01(ground))
    h = ((hh * 360 + off["h"]) % 360) / 360
    s = max(0, min(1, s + off["s"])); l = max(0, min(1, l + off["l"]))
    return hexof(*colorsys.hls_to_rgb(h, l, s))

def close(a, b, tol=2):
    return all(abs(x - y) <= tol for x, y in zip(bytes.fromhex(a[1:]), bytes.fromhex(b[1:])))


def schema_check(cat, schema, errors):
    try:
        import jsonschema
    except ImportError:
        for k in schema["required"]:
            if k not in cat: errors.append(f"missing top-level key {k}")
        fam_req = schema["$defs"]["family"]["required"]
        for fam in cat.get("families", []):
            for k in fam_req:
                if k not in fam: errors.append(f"{fam.get('id', '?')}: missing {k}")
        return "stdlib required-key check"
    v = jsonschema.Draft202012Validator(schema)
    for e in sorted(v.iter_errors(cat), key=lambda e: list(e.path)):
        path = "/".join(str(p) for p in e.path)
        errors.append(f"schema: {path}: {e.message[:160]}")
    from importlib.metadata import version
    return "jsonschema " + version("jsonschema")


def semantic_check(cat, errors, fix=False):
    prop_ids = {p["id"] for p in cat.get("shared_props", [])}
    for fam in cat["families"]:
        prop_ids |= {p["id"] for p in fam["props"]}
    sfx_names = None
    if os.path.exists(SFX):
        with open(SFX) as fh: sfx_names = {s["name"] for s in json.load(fh)["sounds"]}
    manifest = None
    if os.path.exists(LANDMARKS):
        with open(LANDMARKS) as fh: manifest = {a["id"]: a for a in json.load(fh)["assets"]}

    seen = set()
    for fam in cat["families"]:
        fid = fam["id"]
        if fid in seen: errors.append(f"{fid}: duplicate family id")
        seen.add(fid)
        ground = fam["palette"]["ground"]
        for c in fam["palette"]["creature"]:
            r = contrast(c["hex"], ground)
            if r < MIN_CONTRAST: errors.append(f"{fid}: creature {c['name']} {c['hex']} contrast {r} < {MIN_CONTRAST} vs ground {ground}")
            if abs(r - c["contrast_vs_ground"]) > 0.005:
                if fix: c["contrast_vs_ground"] = r
                else: errors.append(f"{fid}: creature {c['name']} stored contrast {c['contrast_vs_ground']} != computed {r} (run --fix)")
        for k in fam["terrain_kinds"]:
            derived = apply_offset(ground, k["tint_hsl_offset"])
            if not close(derived, k["tint"]):
                if fix: k["tint"] = derived
                else: errors.append(f"{fid}/{k['id']}: tint {k['tint']} != ground+offset {derived} (run --fix)")
            for d in k["decor"]:
                if d["prop"] not in prop_ids: errors.append(f"{fid}/{k['id']}: unknown decor prop {d['prop']}")
            if k["profile"] == "recessed_water" and "fill" not in k:
                errors.append(f"{fid}/{k['id']}: recessed_water needs fill")
        roles = [k.get("role") for k in fam["terrain_kinds"]]
        if "water" not in roles or "shore" not in roles:
            errors.append(f"{fid}: terrain_kinds need one role=water and one role=shore (galaxy.ts places them at the patch edge)")
        for sp in fam["marker"]["signature_props"]:
            if sp not in prop_ids: errors.append(f"{fid}: marker signature prop {sp} unknown")
        w = fam["creature_archetype_weights"]
        if abs(sum(w.values()) - 1.0) > 1e-6: errors.append(f"{fid}: archetype weights sum to {sum(w.values())}")
        hs = [fam["growth_hero"]["height_m_by_band"][b] for b in ("0", "25", "50", "75", "100")]
        if any(b <= a for a, b in zip(hs, hs[1:])): errors.append(f"{fid}: growth_hero heights not increasing {hs}")
        if fam["terrain_piece"]["height_m"] > 3.0: errors.append(f"{fid}: terrain piece taller than 3 m")
        if sfx_names is not None:
            for n in fam["sound_ambience"]["loops"] + fam["sound_ambience"]["one_shots"]:
                if n not in sfx_names: errors.append(f"{fid}: sfx {n} not in {os.path.relpath(SFX, ROOT)}")
        if manifest is not None and fam["status"] == "shipped":
            for stage, key in (("s1", "s1"), ("s2a", "s2"), ("s2b", "s2b"), ("s2c", "s2c"), ("s3", "s3")):
                aid = f"{fid}-landmark-{key}"
                m = manifest.get(aid); lm = fam["landmarks"][stage]
                if m is None: errors.append(f"{fid}: {aid} missing from landmark manifest"); continue
                if lm.get("file") != m["file"]: errors.append(f"{fid}: {aid} file {lm.get('file')} != manifest {m['file']}")
                if lm["name"] != m["name"]: errors.append(f"{fid}: {aid} name '{lm['name']}' != manifest '{m['name']}'")
            for p in fam["props"]:
                m = manifest.get(p["id"])
                if m is None: errors.append(f"{fid}: prop {p['id']} missing from landmark manifest")
                elif p.get("file") != m["file"]: errors.append(f"{fid}: prop {p['id']} file mismatch")
            tp = fam["terrain_piece"]; m = manifest.get(tp["id"])
            if m is None or tp.get("file") != m["file"]: errors.append(f"{fid}: terrain piece {tp['id']} not matching manifest")


def main():
    fix = "--fix" in sys.argv
    with open(CATALOG) as fh: cat = json.load(fh)
    with open(SCHEMA) as fh: schema = json.load(fh)
    errors = []
    how = schema_check(cat, schema, errors)
    semantic_check(cat, errors, fix=fix)
    if fix:
        with open(CATALOG, "w") as fh:
            json.dump(cat, fh, indent=2, ensure_ascii=False); fh.write("\n")
    fams = cat["families"]
    print(f"[biome-catalog] {len(fams)} families ({sum(f['status'] == 'shipped' for f in fams)} shipped, "
          f"{sum(f['status'] == 'planned' for f in fams)} planned), schema via {how}")
    for e in errors: print("  FAIL", e)
    print("[biome-catalog]", "FAILED" if errors else "ok")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
