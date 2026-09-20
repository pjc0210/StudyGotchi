#!/usr/bin/env python3
"""
StudyGotchi audio gate (Python 3, stdlib `wave` only).

For every .wav: duration, sample rate, channels, bit depth, peak dBFS, RMS dBFS, silence share,
leading/trailing silence and DC offset.

Rules: peak must be <= -1 dBFS (clipping headroom), the file must not be silent (peak > -60 dBFS;
pause tokens named comma/period/question/pause/space/rest/silence/gap are allowed and only warned),
duration within a per-kind band (`--kind sfx|voice|music|any`; default inferred from the path:
`sfx` < 3 s, `voice` < 10 s, `music` any), sample rate 22050-48000 Hz, PCM 8/16/24/32-bit. Long
leading silence (> 100 ms) and a DC offset (> 2 %) are warnings.

  python3 tools/qa/check_audio.py assets/audio [--json] [--json-out tools/qa/out/audio.json] [--kind sfx]

Exit code 1 when any file fails.
"""

import argparse
import fnmatch
import glob
import json
import math
import os
import struct
import sys
import time
import wave

PEAK_MAX_DBFS = -1.0
SILENT_DBFS = -60.0
KINDS = {"sfx": (0.02, 3.0), "voice": (0.05, 10.0), "music": (1.0, 600.0), "any": (0.01, 600.0)}
SAMPLE_RATES = (22050, 24000, 32000, 44100, 48000)
# silent by design: pause tokens of the Animalese-style voice banks (concatenated between letter blips)
PAUSE_TOKENS = {"comma", "period", "question", "pause", "space", "rest", "silence", "gap"}


def infer_kind(path):
    parts = path.replace("\\", "/").lower().split("/")
    for p in ("sfx", "voice", "voices", "music", "bgm"):
        if p in parts:
            return {"voices": "voice", "bgm": "music"}.get(p, p)
    return "any"


def dbfs(x):
    return max(-120.0, 20.0 * math.log10(x)) if x > 0 else -120.0  # floor keeps the JSON finite


def decode(frames, sampwidth, nchannels):
    """Return per-channel lists of floats in [-1, 1]."""
    n = len(frames) // (sampwidth * nchannels)
    if sampwidth == 1:
        vals = [(b - 128) / 128.0 for b in frames[:n * nchannels]]
    elif sampwidth == 2:
        vals = [v / 32768.0 for v in struct.unpack_from(f"<{n * nchannels}h", frames)]
    elif sampwidth == 3:
        vals = []
        for i in range(0, n * nchannels * 3, 3):
            v = frames[i] | (frames[i + 1] << 8) | (frames[i + 2] << 16)
            if v & 0x800000:
                v -= 1 << 24
            vals.append(v / 8388608.0)
    elif sampwidth == 4:
        vals = [v / 2147483648.0 for v in struct.unpack_from(f"<{n * nchannels}i", frames)]
    else:
        raise ValueError(f"unsupported sample width {sampwidth}")
    return [vals[c::nchannels] for c in range(nchannels)]


def inspect(path, kind):
    rec = {"file": path, "rel": os.path.relpath(path), "kind": kind, "status": "PASS", "reasons": [], "warnings": [],
           "bytes": os.path.getsize(path)}
    fail, warn = rec["reasons"].append, rec["warnings"].append
    try:
        with wave.open(path, "rb") as w:
            nch, sw, sr, nframes = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
            frames = w.readframes(nframes)
    except (wave.Error, EOFError, struct.error) as exc:
        fail(f"unreadable WAV: {exc} (float/compressed WAV is not PCM)")
        rec["status"] = "FAIL"
        return rec
    rec.update(channels=nch, sample_rate=sr, bits=sw * 8, frames=nframes, duration=round(nframes / sr, 4) if sr else 0)
    if sr not in SAMPLE_RATES:
        warn(f"sample rate {sr} Hz (expected one of {SAMPLE_RATES})")
    if nch not in (1, 2):
        fail(f"{nch} channels")
    if nframes == 0:
        fail("no audio frames")
        rec["status"] = "FAIL"
        return rec
    try:
        chans = decode(frames, sw, nch)
    except ValueError as exc:
        fail(str(exc))
        rec["status"] = "FAIL"
        return rec
    n = len(chans[0])
    mono = [sum(ch[i] for ch in chans) / nch for i in range(n)]
    peak = max(max(abs(v) for v in ch) for ch in chans)
    rms = math.sqrt(sum(v * v for v in mono) / n)
    dc = sum(mono) / n
    thr = 10 ** (SILENT_DBFS / 20.0)
    quiet = [abs(v) < thr for v in mono]
    lead = next((i for i, q in enumerate(quiet) if not q), n)
    trail = next((i for i, q in enumerate(reversed(quiet)) if not q), n)
    rec.update(peak_dbfs=round(dbfs(peak), 2), rms_dbfs=round(dbfs(rms), 2), dc_offset=round(dc, 4),
               silence_share=round(sum(quiet) / n, 4), leading_silence_ms=round(lead / sr * 1000, 1),
               trailing_silence_ms=round(trail / sr * 1000, 1))
    if rec["peak_dbfs"] > PEAK_MAX_DBFS:
        fail(f"peak {rec['peak_dbfs']:+.2f} dBFS > {PEAK_MAX_DBFS} dBFS (clipping risk)")
    stem = os.path.splitext(os.path.basename(path))[0].lower()
    if rec["peak_dbfs"] <= SILENT_DBFS:
        if stem in PAUSE_TOKENS:
            warn(f"intentional silence (pause token '{stem}', {rec['duration']:.2f} s)")
        else:
            fail(f"silent file (peak {rec['peak_dbfs']} dBFS)")
    elif rec["silence_share"] > 0.9:
        warn(f"{rec['silence_share'] * 100:.0f} % of the file is below {SILENT_DBFS} dBFS")
    lo, hi = KINDS[kind]
    if not (lo <= rec["duration"] <= hi):
        fail(f"duration {rec['duration']:.2f} s outside {lo}-{hi} s for {kind}")
    if rec["leading_silence_ms"] > 100:
        warn(f"{rec['leading_silence_ms']:.0f} ms leading silence (UI sounds should start immediately)")
    if abs(dc) > 0.02:
        warn(f"DC offset {dc:+.3f}")
    if -60 < rec["peak_dbfs"] < -12:
        warn(f"quiet: peak {rec['peak_dbfs']:+.1f} dBFS (normalise towards -3 dBFS)")
    if rec["reasons"]:
        rec["status"] = "FAIL"
    return rec


def expand(inputs, excludes):
    files = []
    for inp in inputs:
        if os.path.isdir(inp):
            files += glob.glob(os.path.join(inp, "**", "*.wav"), recursive=True)
            files += glob.glob(os.path.join(inp, "**", "*.WAV"), recursive=True)
        elif any(ch in inp for ch in "*?["):
            files += glob.glob(inp, recursive=True)
        elif os.path.isfile(inp):
            files.append(inp)
    out = []
    for f in sorted(set(files)):
        rel = os.path.relpath(f)
        if any(fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(os.path.basename(rel), p) for p in excludes):
            continue
        out.append(f)
    return out


def main(argv=None):
    p = argparse.ArgumentParser(prog="check_audio.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("inputs", nargs="+")
    p.add_argument("--kind", default="auto", choices=["auto"] + list(KINDS))
    p.add_argument("--exclude", action="append", default=[])
    p.add_argument("--set", dest="set_name", default="audio")
    p.add_argument("--json", action="store_true")
    p.add_argument("--json-out", default="")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv)

    files = expand(args.inputs, args.exclude)
    records = [inspect(f, infer_kind(f) if args.kind == "auto" else args.kind) for f in files]
    summary = {"count": len(records), "pass": sum(r["status"] == "PASS" for r in records),
               "fail": sum(r["status"] == "FAIL" for r in records),
               "duration": [min((r.get("duration", 0) for r in records), default=0), max((r.get("duration", 0) for r in records), default=0)],
               "peak_dbfs": [min((r.get("peak_dbfs", 0) for r in records if "peak_dbfs" in r), default=None),
                             max((r.get("peak_dbfs", 0) for r in records if "peak_dbfs" in r), default=None)]}
    report = {"tool": "check_audio.py", "version": 1, "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
              "set": args.set_name, "inputs": args.inputs, "summary": summary, "files": records}
    if args.json_out:
        os.makedirs(os.path.dirname(os.path.abspath(args.json_out)), exist_ok=True)
        with open(args.json_out, "w") as fh:
            json.dump(report, fh, indent=1)
    if args.json:
        json.dump(report, sys.stdout, indent=1)
        print()
    elif not records:
        print("[check_audio] no .wav files found")
    else:
        cols = ["status", "file", "kind", "dur(s)", "rate", "ch", "bits", "peak dBFS", "rms dBFS", "silence%", "lead ms"]
        rows = [[r["status"], os.path.basename(r["rel"]), r["kind"], f"{r.get('duration', 0):.2f}", str(r.get("sample_rate", "-")),
                 str(r.get("channels", "-")), str(r.get("bits", "-")), f"{r.get('peak_dbfs', float('nan')):+.1f}",
                 f"{r.get('rms_dbfs', float('nan')):+.1f}", f"{r.get('silence_share', 0) * 100:.0f}",
                 f"{r.get('leading_silence_ms', 0):.0f}"] for r in records]
        widths = [max(len(c), *(len(row[i]) for row in rows)) for i, c in enumerate(cols)]
        print("  ".join(c.ljust(widths[i]) for i, c in enumerate(cols)))
        for r, row in zip(records, rows):
            print("  ".join(v.ljust(widths[i]) for i, v in enumerate(row)))
            for reason in r["reasons"]:
                print(f"      FAIL: {reason}")
            if args.verbose:
                for w in r["warnings"]:
                    print(f"      warn: {w}")
        print(f"\n[check_audio] {summary['count']} files: {summary['pass']} pass, {summary['fail']} fail"
              + (f"; JSON -> {args.json_out}" if args.json_out else ""))
    return 1 if summary["fail"] else 0


if __name__ == "__main__":
    sys.exit(main())
