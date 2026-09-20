#!/usr/bin/env python3
"""
Aggregate the JSON outputs in tools/qa/out/ into assets/QA.md (stdlib only).

  python3 tools/qa/write_report.py --out assets/QA.md [--out-dir tools/qa/out]

Reads glb-<set>.json (check_glb.py), silhouettes-<set>.json (silhouette_test.py) and audio-<set>.json
(check_audio.py). Sets that have no JSON are listed as "not run"; folders that do not exist yet are
listed as blockers.
"""

import argparse
import collections
import glob
import json
import os
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

EXPECTED_SETS = [
    # (set name, folder, owner, what the gate expects)
    ("creatures-generated", "assets/creatures/generated", "Creature Artisan", "static creatures, kind=creature"),
    ("creatures-animated", "assets/creatures/animated", "Animator", "creatures with idle/walk/happy/sad/sleep clips"),
    ("creatures-cc0", "assets/creatures/cc0", "Asset Scout", "third-party references (reported, never gate)"),
    ("landmarks", "assets/landmarks", "Landmark Artisan", "landmark stages/variants, props, terrain (+ v4: ruin, scaffold, hero, shared)"),
    ("growth", "assets/growth", "Growth Artisan", "growth heroes g0-g3, construction states, catastrophe kit"),
    ("props", "assets/props", "Landmark Artisan / Asset Scout", "filler props, kind=prop"),
    ("audio", "assets/audio", "Sound Artisan", "25 wav sounds, peak <= -1 dBFS"),
]


def load(path):
    with open(path) as fh:
        return json.load(fh)


def rel_link(target, from_file):
    return os.path.relpath(target, os.path.dirname(os.path.abspath(from_file))).replace(os.sep, "/")


def fmt_range(pair, fmt="{:.2f}"):
    if not pair or pair[0] is None:
        return "-"
    return f"{fmt.format(pair[0])} - {fmt.format(pair[1])}"


def worst(files, n=5):
    bad = [f for f in files if f.get("status") == "FAIL"]
    bad.sort(key=lambda f: (-len(f.get("reasons", [])), f.get("rel", "")))
    return bad[:n]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="assets/QA.md")
    p.add_argument("--out-dir", default="tools/qa/out")
    args = p.parse_args()
    out_dir = args.out_dir if os.path.isabs(args.out_dir) else os.path.join(REPO_ROOT, args.out_dir)
    out_md = args.out if os.path.isabs(args.out) else os.path.join(REPO_ROOT, args.out)

    glb = {load(f)["set"]: load(f) for f in glob.glob(os.path.join(out_dir, "glb-*.json"))}
    sil = {load(f)["set"]: load(f) for f in glob.glob(os.path.join(out_dir, "silhouettes-*.json"))}
    aud = {load(f)["set"]: load(f) for f in glob.glob(os.path.join(out_dir, "audio-*.json"))}
    meta_path = os.path.join(out_dir, "run-meta.json")
    meta = load(meta_path) if os.path.isfile(meta_path) else {}
    pending = set(meta.get("pending_sets") or [])

    lines = []
    w = lines.append
    w("# Asset QA report")
    w("")
    w(f"Generated {time.strftime('%Y-%m-%d %H:%M %Z')} by `tools/qa/run_all.sh` (QA Inspector territory). "
      "Re-run: `bash tools/qa/run_all.sh`. Rules and thresholds: `tools/qa/README.md`; contract: `.fleet/org.md`.")
    w("")
    w("Verdicts: PASS = every rule in the technical contract holds. FAIL = at least one rule broken (reasons listed). "
      "Third-party sets (`cc0`) are measured against the same rules but tagged `third-party` and never block the gate. "
      "Silhouette scores come from `silhouette_test.py` (Blender, 3/4 orthographic view, 96 px and 48 px masks). "
      "PENDING = the set's manifest or file count changed while the gate ran (a worker is mid-write); its numbers are "
      "a snapshot and its failures are not blockers until the next run.")
    w("")
    if pending:
        w("**Pending sets (mid-write during this run): " + ", ".join(sorted(pending)) + ".** Re-run once the worker is done.")
        w("")

    # ---- folder inventory
    w("## Asset sets")
    w("")
    w("| Set | Folder | Owner | Files on disk | GLB gate | Silhouettes | Notes |")
    w("|---|---|---|---|---|---|---|")
    blockers = []
    for name, folder, owner, what in EXPECTED_SETS:
        abs_folder = os.path.join(REPO_ROOT, folder)
        exists = os.path.isdir(abs_folder)
        if exists:
            if name == "audio":
                n_files = len(glob.glob(os.path.join(abs_folder, "**", "*.wav"), recursive=True))
            else:
                n_files = len([f for f in glob.glob(os.path.join(abs_folder, "**", "*.glb"), recursive=True)
                               if "_input_snapshot" not in f])
        else:
            n_files = 0
        gate = "-"
        if name in glb:
            s = glb[name]["summary"]
            if name in pending:
                gate = f"PENDING ({s['pass']}/{s['first_party']} at snapshot)"
            elif s["count"] == 0:
                gate = "no files"
            elif s["first_party"]:
                gate = f"{s['pass']}/{s['first_party']} pass"
            else:
                gate = f"{s['third_party_pass']}/{s['third_party']} pass (third-party)"
        elif name in aud:
            s = aud[name]["summary"]
            gate = f"{s['pass']}/{s['count']} pass"
        sils = "-"
        if name in sil:
            s = sil[name]["summary"]
            sils = f"{s['pass']}/{s['count']} pass, {s.get('samey', 0)} samey"
        note = what
        landmark_props = sum(1 for f in glb.get("landmarks", {}).get("files", []) if f.get("kind") == "prop")
        if not exists and name == "props" and landmark_props:
            note = f"optional: {landmark_props} props ship under `assets/landmarks/<biome>/props/` (gated with the landmarks set)"
        elif not exists:
            note = f"folder missing: {what}"
            blockers.append(f"`{folder}` does not exist yet ({owner}): {what}.")
        elif n_files == 0:
            note = f"folder empty: {what}"
            blockers.append(f"`{folder}` has no files yet ({owner}): {what}.")
        w(f"| {name} | `{folder}` | {owner} | {n_files} | {gate} | {sils} | {note} |")
    w("")

    # ---- GLB sets
    w("## GLB contract gate (`check_glb.py`)")
    w("")
    w("| Set | Kind | Files | Pass | Fail | Triangles | Height (m) | Textures | Extensions | Clips expected |")
    w("|---|---|---|---|---|---|---|---|---|---|")
    for name in sorted(glb):
        r = glb[name]
        s = r["summary"]
        files = r["files"]
        third = all(f["third_party"] for f in files) if files else False
        n_tex = sum(1 for f in files if f.get("uses_textures"))
        exts = sorted({e for f in files for e in f.get("extensions_used", [])})
        passed = s["third_party_pass"] if third else s["pass"]
        failed = s["third_party_fail"] if third else s["fail"]
        kinds = sorted({f["kind"] for f in files})
        w(f"| {name}{' (third-party)' if third else ''} | {', '.join(kinds) or r['kind']} | {s['count']} | {passed} | {failed} | "
          f"{fmt_range(s['triangles'], '{:d}')} | {fmt_range(s['height'], '{:.3f}')} | {n_tex} | {', '.join(exts) or 'none'} | "
          f"{', '.join(r.get('expect_clips') or []) or '-'} |")
    w("")
    for name in sorted(glb):
        r = glb[name]
        files = r["files"]
        if not files:
            w(f"### {name}: no GLB files found")
            w("")
            continue
        third = all(f["third_party"] for f in files)
        bad = worst(files)
        w(f"### {name}{' (third-party, reported only)' if third else ''}{' (PENDING: mid-write snapshot)' if name in pending else ''}")
        w("")
        kinds = collections.Counter((f["kind"], f.get("stage")) for f in files)
        w("Kinds: " + ", ".join(f"{k}{'' if st is None else ' stage ' + str(st)} x{n}" for (k, st), n in sorted(kinds.items(), key=lambda kv: (kv[0][0], str(kv[0][1])))) + ".")
        fams = sorted({f["family"] for f in files if f.get("family")})
        if fams:
            w(f"Families ({len(fams)}): " + ", ".join(fams) + ".")
        contrasts = [f["contrast_vs_ground"] for f in files if isinstance(f.get("contrast_vs_ground"), (int, float))]
        if contrasts:
            w(f"Body/ground contrast (catalogue): {min(contrasts):.2f} - {max(contrasts):.2f} over {len(contrasts)} creatures (rule >= 1.4).")
        w("")
        s = r["summary"]
        if s.get("manifest"):
            w(f"Manifest `{s['manifest']}` (written {s.get('manifest_mtime')}, generated_at {s.get('manifest_generated_at')}); "
              f"kind/stage/variant, tags and contrast come from it; {len(s.get('missing_listed') or [])} listed file(s) missing on disk.")
            w("")
        rules = r.get("rules") or {}
        active = [f"clips {', '.join(r.get('expect_clips') or [])}" if r.get("expect_clips") else "",
                  "durations " + ", ".join(f"{k}={v}" for k, v in (rules.get("clip_durations") or {}).items()) if rules.get("clip_durations") else "",
                  f"nodes {', '.join(rules.get('expect_nodes') or [])}" if rules.get("expect_nodes") else "",
                  f"static {', '.join(rules.get('static_nodes') or [])}" if rules.get("static_nodes") else ""]
        active = [a for a in active if a]
        if active:
            w("Animation rules: " + "; ".join(active) + ".")
            w("")
        if bad:
            w("Worst offenders:")
            w("")
            for f in bad:
                w(f"- `{os.path.basename(f['rel'])}`: " + "; ".join(f["reasons"]))
            w("")
        else:
            w("No failures.")
            w("")
        warn_counts = {}
        for f in files:
            for wmsg in f.get("warnings", []):
                key = wmsg.split("(")[0].split(":")[0].strip()
                warn_counts[key] = warn_counts.get(key, 0) + 1
        if warn_counts:
            top = sorted(warn_counts.items(), key=lambda kv: -kv[1])[:5]
            w("Most common warnings: " + "; ".join(f"{k} ({v})" for k, v in top) + ".")
            w("")
        if not third:
            w("| File | Status | Tris | Height | min y | Front z | Mats | Clips | KB | Reasons |")
            w("|---|---|---|---|---|---|---|---|---|---|")
            for f in files:
                front = (f.get("front") or {}).get("centroid_z_eyes")
                clips = ",".join(a["name"] for a in f.get("animations", [])) or "-"
                w(f"| `{os.path.basename(f['rel'])}` | {f['status']} | {f.get('triangles', '-')} | "
                  f"{f.get('height', '-')} | {f.get('min_y', '-')} | {front if front is not None else 'n/a'} | "
                  f"{f.get('materials', '-')} | {clips} | {f['bytes'] // 1024} | {'; '.join(f['reasons']) or '-'} |")
            w("")
            for f in files:
                if f["status"] == "FAIL" and name not in pending:
                    blockers.append(f"`{f['rel']}`: " + "; ".join(f["reasons"]))
        else:
            # compact third-party facts the scouts and producer need
            w("| File | Tris | Height | min y | Textures | Extensions | Clips | KB |")
            w("|---|---|---|---|---|---|---|---|")
            for f in files:
                clips = len(f.get("animations", []))
                w(f"| `{os.path.basename(f['rel'])}` | {f.get('triangles', '-')} | {f.get('height', '-')} | {f.get('min_y', '-')} | "
                  f"{'yes' if f.get('uses_textures') else 'no'} | {', '.join(f.get('extensions_used', [])) or '-'} | {clips} | {f['bytes'] // 1024} |")
            w("")

    # ---- silhouettes
    if sil:
        w("## Silhouette readability (`silhouette_test.py`)")
        w("")
        w("Each cell: 96 px mask, 48 px mask (shown 2x), then `f` = fill of the silhouette's bounding rectangle "
          "(want 0.25-0.75), `c` = connected components at 96/48 px (want 1/1), `d` = mean per-pixel difference to the "
          "rest of the family (low = samey). Red border = fails.")
        w("")
        for name in sorted(sil):
            r = sil[name]
            s = r["summary"]
            w(f"### {name}: {s['pass']}/{s['count']} pass, {s['fail']} fail, {s.get('samey', 0)} samey "
              f"(fill {fmt_range(s.get('fill_range'))})")
            w("")
            grid = r.get("grid")
            if grid:
                png = os.path.join(REPO_ROOT, grid["png"])
                w(f"![silhouettes {name}]({rel_link(png, out_md)})")
                w("")
            bad = [f for f in r["files"] if f["status"] == "FAIL"]
            if bad:
                w("Failures:")
                w("")
                for f in sorted(bad, key=lambda f: -len(f["reasons"]))[:12]:
                    w(f"- `{f['label']}`: " + "; ".join(f["reasons"]))
                if len(bad) > 12:
                    w(f"- ... {len(bad) - 12} more in `tools/qa/out/silhouettes-{name}.json`")
                w("")
                if "cc0" not in name and name not in pending:
                    for f in bad:
                        blockers.append(f"silhouette `{f['label']}` ({name}): " + "; ".join(f["reasons"]))
            scored = [f for f in r["files"] if f.get("distinctness") is not None]
            if scored:
                scored.sort(key=lambda f: f["distinctness"])
                w("Most samey (lowest family distinctness): " + ", ".join(
                    f"`{f['label']}` {f['distinctness']:.3f} (nearest `{f.get('nearest')}` {f.get('nearest_score', 0):.3f})"
                    for f in scored[:5]) + ".")
                w("")

    # ---- audio
    if aud:
        w("## Audio (`check_audio.py`)")
        w("")
        for name in sorted(aud):
            r = aud[name]
            s = r["summary"]
            w(f"### {name}: {s['pass']}/{s['count']} pass, {s['fail']} fail; duration {fmt_range(s['duration'])} s; "
              f"peak {fmt_range(s['peak_dbfs'], '{:+.1f}')} dBFS")
            w("")
            if r["files"]:
                w("| File | Status | Kind | Duration (s) | Rate | Ch | Bits | Peak dBFS | RMS dBFS | Lead ms | Reasons / warnings |")
                w("|---|---|---|---|---|---|---|---|---|---|---|")
                for f in r["files"]:
                    notes = "; ".join(f["reasons"] + f["warnings"]) or "-"
                    w(f"| `{os.path.basename(f['rel'])}` | {f['status']} | {f['kind']} | {f.get('duration', '-')} | {f.get('sample_rate', '-')} | "
                      f"{f.get('channels', '-')} | {f.get('bits', '-')} | {f.get('peak_dbfs', '-')} | {f.get('rms_dbfs', '-')} | "
                      f"{f.get('leading_silence_ms', '-')} | {notes} |")
                w("")
                for f in r["files"]:
                    if f["status"] == "FAIL":
                        blockers.append(f"`{f['rel']}`: " + "; ".join(f["reasons"]))
            else:
                w("No .wav files found.")
                w("")

    # ---- blockers
    w("## Blockers for integration")
    w("")
    if blockers:
        for b in blockers:
            w(f"- {b}")
    else:
        w("- None: every stable first-party asset passes the gate.")
    for name in sorted(pending):
        w(f"- PENDING `{name}`: worker mid-write during this run; re-run `bash tools/qa/run_all.sh` to gate it.")
    w("")
    w("Third-party (`cc0`) failures are not blockers; they document why those packs cannot be dropped in unchanged "
      "(units, textures, extensions, clip names).")
    w("")

    os.makedirs(os.path.dirname(out_md), exist_ok=True)
    with open(out_md, "w") as fh:
        fh.write("\n".join(lines))
    print(f"[write_report] {out_md}: {len(glb)} GLB set(s), {len(sil)} silhouette set(s), {len(aud)} audio set(s), {len(blockers)} blocker(s)")


if __name__ == "__main__":
    main()
