#!/usr/bin/env bash
# StudyGotchi asset quality gate: runs every check that has inputs and writes assets/QA.md.
#
#   bash tools/qa/run_all.sh                 # everything
#   SKIP_SILHOUETTES=1 bash tools/qa/run_all.sh   # skip the Blender renders (fast, GLB + audio only)
#   BLENDER=/path/to/Blender bash tools/qa/run_all.sh
#
# Exit code: 1 when any first-party GLB or audio file fails the gate, else 0. Never modifies anything
# outside tools/qa/out/ and assets/QA.md.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
QA=tools/qa
OUT=$QA/out
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
SKIP_SILHOUETTES=${SKIP_SILHOUETTES:-0}
PY=${PYTHON:-python3}
CLIPS=${EXPECT_CLIPS:-idle,walk,happy,sad,sleep}
mkdir -p "$OUT"
# one gate at a time: the producer and the QA Inspector may both call this; a second caller waits
LOCK="$OUT/.lock"
waited=0
until mkdir "$LOCK" 2>/dev/null; do
  if [ -f "$LOCK/pid" ] && ! kill -0 "$(cat "$LOCK/pid" 2>/dev/null)" 2>/dev/null; then
    echo "[run_all] removing stale lock from pid $(cat "$LOCK/pid")"; rm -rf "$LOCK"; continue
  fi
  [ "$waited" -eq 0 ] && echo "[run_all] another run_all.sh is active (pid $(cat "$LOCK/pid" 2>/dev/null)); waiting"
  sleep 2; waited=$((waited + 2))
  if [ "$waited" -ge 600 ]; then echo "[run_all] gave up waiting for the lock after 10 min"; exit 2; fi
done
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT
RAN_SETS=""
status=0
start=$(date +%s)

glb_set() {  # name kind folder [extra args...]
  local name=$1 kind=$2 folder=$3; shift 3
  if [ ! -d "$folder" ]; then echo "[run_all] $name: $folder missing, skipped"; return; fi
  echo "[run_all] GLB gate: $name ($folder, kind=$kind)"
  RAN_SETS="$RAN_SETS glb-$name"
  "$PY" "$QA/check_glb.py" "$folder" --kind "$kind" --set "$name" --json-out "$OUT/glb-$name.json" "$@" | tail -n 1
  local rc=${PIPESTATUS[0]}
  [ "$rc" -eq 1 ] && status=1
  return 0
}

silhouette_set() {  # name folder [extra args...]
  local name=$1 folder=$2; shift 2
  [ "$SKIP_SILHOUETTES" = "1" ] && return
  if [ ! -d "$folder" ]; then return; fi
  if [ -z "$(find "$folder" -name '*.glb' -not -path '*_input_snapshot*' -print -quit)" ]; then return; fi
  if [ ! -x "$BLENDER" ]; then echo "[run_all] Blender not found at $BLENDER; skipping silhouettes"; return; fi
  echo "[run_all] silhouettes: $name"
  RAN_SETS="$RAN_SETS silhouettes-$name"
  "$BLENDER" -b --python "$QA/silhouette_test.py" -- --in "$folder" --set "$name" --out-dir "$OUT" "$@" 2>&1 \
    | grep -E "^\[silhouette\] [0-9]+ files|Traceback|Error:" || true
}

# manifest-aware sets: kind/stage/variant, tags and contrast_vs_ground come from the worker's manifest;
# files listed there but missing on disk fail the gate
manifest_arg() { [ -f "$1/manifest.json" ] && echo "--manifest" "$1/manifest.json"; }
catalog_arg() { [ -f assets/biomes/catalog.json ] && echo "--catalog" "assets/biomes/catalog.json"; }
stamp() { [ -f "$1" ] && (stat -f '%m' "$1" 2>/dev/null || stat -c '%Y' "$1" 2>/dev/null) || echo 0; }
hms() { [ -f "$1" ] && (stat -f '%Sm' -t '%H:%M:%S' "$1" 2>/dev/null || stat -c '%y' "$1" 2>/dev/null) || echo "-"; }

# mid-write detection: a manifest (or the file count) that changes while the gate runs, or within 30 s of
# the start, marks its set PENDING in the report instead of failing it (a worker is still writing)
MANIFESTS="creatures-generated=assets/creatures/generated creatures-animated=assets/creatures/animated landmarks=assets/landmarks growth=assets/growth props=assets/props"
snapshot() {  # -> "set mtime nfiles" per line
  for pair in $MANIFESTS; do
    name=${pair%%=*}; folder=${pair#*=}
    [ -d "$folder" ] || continue
    n=$(find "$folder" -name '*.glb' -not -path '*_input_snapshot*' | wc -l | tr -d ' ')
    echo "$name $(stamp "$folder/manifest.json") $n"
  done
}
snap_before=$(snapshot)
for pair in $MANIFESTS; do
  m=${pair#*=}/manifest.json; [ -f "$m" ] && echo "[run_all] manifest $m written $(hms "$m")"
done

glb_set creatures-generated creature assets/creatures/generated $(manifest_arg assets/creatures/generated) $(catalog_arg)
glb_set creatures-animated creature assets/creatures/animated $(manifest_arg assets/creatures/animated) $(catalog_arg) \
  --expect-clips "$CLIPS" --expect-clip-durations "${CLIP_DURATIONS:-idle=2.0,walk=0.8,happy=1.2,sad=1.5,sleep=3.0}" \
  --expect-nodes Root,Body --static-nodes Root --exclude "*_input_snapshot*"
glb_set creatures-cc0 creature assets/creatures/cc0 --third-party
glb_set landmarks auto assets/landmarks $(manifest_arg assets/landmarks)
glb_set growth auto assets/growth $(manifest_arg assets/growth)
glb_set props auto assets/props $(manifest_arg assets/props) --exclude "*cc0*"
[ -d assets/props/cc0 ] && glb_set props-cc0 prop assets/props/cc0 --third-party

if [ -d assets/audio ]; then
  echo "[run_all] audio: assets/audio"
  RAN_SETS="$RAN_SETS audio-audio"
  "$PY" "$QA/check_audio.py" assets/audio --set audio --json-out "$OUT/audio-audio.json" | tail -n 1
  [ "${PIPESTATUS[0]}" -eq 1 ] && status=1
fi

silhouette_set creatures-generated assets/creatures/generated --family archetype --cols 8 $(manifest_arg assets/creatures/generated)
silhouette_set creatures-animated assets/creatures/animated --family archetype --cols 8 --exclude "*_input_snapshot*" $(manifest_arg assets/creatures/animated)
silhouette_set landmarks assets/landmarks --family folder --cols 6 $(manifest_arg assets/landmarks)
silhouette_set growth assets/growth --family folder --cols 6 $(manifest_arg assets/growth)
silhouette_set props assets/props --family folder --cols 8 --exclude "*cc0*" $(manifest_arg assets/props)
silhouette_set creatures-cc0 assets/creatures/cc0 --family folder --cols 8

# outputs of sets that no longer exist (folder removed) must not survive into the report
for f in "$OUT"/glb-*.json "$OUT"/audio-*.json "$OUT"/silhouettes-*.json "$OUT"/silhouettes-*.png; do
  [ -e "$f" ] || continue
  base=$(basename "$f"); base=${base%.*}
  case " $RAN_SETS " in *" $base "*) ;; *) echo "[run_all] dropping stale $f"; rm -f "$f";; esac
done

# second snapshot at least 30 s after the first; sets whose manifest or file count moved are pending
elapsed=$(( $(date +%s) - start ))
[ "$elapsed" -lt 30 ] && sleep $(( 30 - elapsed ))
snap_after=$(snapshot)
pending=""
while read -r name before_m before_n; do
  [ -z "$name" ] && continue
  after=$(echo "$snap_after" | awk -v n="$name" '$1==n {print $2, $3}')
  if [ "$after" != "$before_m $before_n" ]; then
    pending="$pending $name"
    echo "[run_all] PENDING: $name changed while the gate ran (manifest/file count $before_m/$before_n -> ${after:-gone})"
  fi
done <<EOF
$snap_before
EOF
"$PY" - "$OUT/run-meta.json" "$start" "$pending" <<'PYEOF'
import json, sys, time
out, start, pending = sys.argv[1], int(sys.argv[2]), sys.argv[3].split()
json.dump({"started_at": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(start)),
           "finished_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "pending_sets": pending}, open(out, "w"), indent=1)
PYEOF
if [ -n "$pending" ]; then
  # a pending set's failures are not gate failures; recompute the status from the stable sets only
  status=$("$PY" - "$OUT" "$pending" <<'PYEOF'
import glob, json, os, sys
out, pending = sys.argv[1], set(sys.argv[2].split())
bad = 0
for f in glob.glob(os.path.join(out, "glb-*.json")) + glob.glob(os.path.join(out, "audio-*.json")):
    r = json.load(open(f))
    if r["set"] in pending:
        continue
    bad += r["summary"].get("fail", 0)
print(1 if bad else 0)
PYEOF
)
fi

"$PY" "$QA/write_report.py" --out assets/QA.md --out-dir "$OUT"
echo "[run_all] done in $(( $(date +%s) - start ))s, gate status $status (0 = all stable first-party assets pass)${pending:+, pending:$pending}"
exit $status
