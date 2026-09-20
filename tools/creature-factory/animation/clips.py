"""
Clip definitions and keying for the creature rig (node transforms only, no skeleton).

Every clip is written in glTF / runtime semantics and mapped to Blender axes at key time:
    y   = vertical offset (glTF +Y)         -> Blender location.z
    sy  = vertical scale, sxz = horizontal  -> Blender scale (sxz, sxz, sy)
    rx  = pitch, positive nods the face down/forward (+Z is the face)  -> Blender rotation.x
    ry  = yaw (spin about the up axis)                                 -> Blender rotation.z
    rz  = roll (sideways tilt about the face axis)                     -> Blender rotation.y (negated)

One Blender Action per clip, with one slot per animated object (Body, Eyes), pushed onto NLA tracks named after the
clip so the glTF exporter (ACTIONS mode, merge by action name) emits exactly one animation per clip.
"""

import math

import bpy

FPS = 30

# name -> (frames, loops)
CLIP_SPEC = {
    "idle": (60, True),    # 2.0 s
    "walk": (24, True),    # 0.8 s, two hops per loop (roll alternates)
    "happy": (36, False),  # 1.2 s
    "sad": (45, True),     # 1.5 s
    "sleep": (90, True),   # 3.0 s
}
CLIP_ORDER = ["idle", "walk", "happy", "sad", "sleep"]

BEZ, LIN, QUAD, SINE = "BEZIER", "LINEAR", "QUAD", "SINE"
OUT, IN, INOUT, AUTO = "EASE_OUT", "EASE_IN", "EASE_IN_OUT", "AUTO"


def T(y=0.0):
    return (0.0, 0.0, y)


def TZ(y=0.0, z=0.0):
    """Vertical + along-the-face-axis offset (glTF +Z forward) -> Blender (0, -z, y)."""
    return (0.0, -z, y)


def R(rx=0.0, ry=0.0, rz=0.0):
    return (math.radians(rx), -math.radians(rz), math.radians(ry))


def S(sy=1.0, sxz=1.0):
    return (sxz, sxz, sy)


def SB(sy=1.0, sx=1.0, sz=1.0):
    """Anisotropic scale in glTF semantics (sz = along the face axis / long body axis) -> Blender (sx, sz, sy)."""
    return (sx, sz, sy)


# Per-archetype tuning. `flat` bodies are horizontal (seal / fish: length along +Z), so squash & stretch go along
# the long axis instead of only up, and pitch is damped because a nod moves the far-forward nose a lot.
PROFILES = {
    "default": dict(
        hop_squash=lambda: S(0.90, 1.05), hop_stretch=lambda: S(1.08, 0.96),
        jump_stretch=lambda: S(1.18, 0.90), jump_land=lambda: S(0.72, 1.22), jump_rebound=lambda: S(1.10, 0.95),
        pitch_k=1.0, sleep_roll=12.0,
    ),
    "flat": dict(
        hop_squash=lambda: SB(0.88, 1.04, 1.07), hop_stretch=lambda: SB(1.03, 0.95, 1.10),
        jump_stretch=lambda: SB(1.08, 0.90, 1.18), jump_land=lambda: SB(0.74, 1.12, 1.22),
        jump_rebound=lambda: SB(1.05, 0.96, 1.08),
        pitch_k=0.4, sleep_roll=10.0,
    ),
}


def profile(rig):
    return PROFILES.get(getattr(rig, "archetype", None), PROFILES["default"])


def ES(sy=1.0):
    return (1.0, 1.0, sy)


def K(frame, value, interp=BEZ, easing=AUTO):
    return (frame, value, interp, easing)


def clip_keys(name, rig):
    """Return {"body": {channel: [K...]}, "eyes": {channel: [K...]}} for one clip."""
    n = CLIP_SPEC[name][0]
    P = profile(rig)
    pk = P["pitch_k"]
    ec = tuple(rig.eye_center) if rig.eyes is not None else (0.0, 0.0, 0.0)
    eyes = {"location": [K(0, ec), K(n, ec)], "rotation_euler": [K(0, (0.0, 0.0, 0.0)), K(n, (0.0, 0.0, 0.0))]}
    body = {}

    if name == "idle":
        body["location"] = [K(0, T(0)), K(n, T(0))]
        body["rotation_euler"] = [K(0, R()), K(15, R(rz=2)), K(30, R()), K(45, R(rz=-2)), K(60, R())]
        body["scale"] = [K(0, S()), K(30, S(1.03, 0.985)), K(60, S())]
        eyes["scale"] = [K(0, ES(1)), K(40, ES(1), LIN), K(42, ES(0.1), LIN), K(44, ES(1)), K(60, ES(1))]

    elif name == "walk":
        loc, rot, sca = [], [], []
        for h, roll in ((0, 4.0), (12, -4.0)):
            loc += [K(h, T(0), QUAD, OUT), K(h + 6, T(0.18), QUAD, IN)]
            rot += [K(h, R()), K(h + 6, R(rx=6 * pk, rz=roll))]
            sca += [K(h, P["hop_squash"]()), K(h + 3, P["hop_stretch"]()), K(h + 9, P["hop_stretch"]())]
        loc.append(K(24, T(0)))
        rot.append(K(24, R()))
        sca.append(K(24, P["hop_squash"]()))
        body["location"], body["rotation_euler"], body["scale"] = loc, rot, sca
        eyes["scale"] = [K(0, ES(1)), K(n, ES(1))]

    elif name == "happy":
        variant = HAPPY_VARIANTS.get(rig.archetype, happy_jump_spin)
        body, eye_scale = variant(rig, P)
        eyes["scale"] = eye_scale

    elif name == "sad":
        body["location"] = [K(0, T(0)), K(n, T(0))]
        body["rotation_euler"] = [K(0, R(rx=8 * pk)), K(11, R(rx=9 * pk, rz=1.5)), K(22, R(rx=10 * pk)),
                                  K(34, R(rx=9 * pk, rz=-1.5)), K(45, R(rx=8 * pk))]
        body["scale"] = [K(0, S(0.94, 1.03)), K(22, S(0.92, 1.04)), K(45, S(0.94, 1.03))]
        eyes["scale"] = [K(0, ES(0.5)), K(n, ES(0.5))]

    elif name == "sleep":
        # roll about the ground centre; lift a little so the low side does not sink far into the floor
        roll = P["sleep_roll"]
        lift = 0.5 * (rig.size.x * 0.5) * math.sin(math.radians(roll))
        body["location"] = [K(0, T(lift)), K(n, T(lift))]
        body["rotation_euler"] = [K(0, R(rz=roll)), K(n, R(rz=roll))]
        body["scale"] = [K(0, S(0.98, 1.01)), K(45, S(1.03, 0.985)), K(90, S(0.98, 1.01))]
        eyes["scale"] = [K(0, ES(0.08)), K(n, ES(0.08))]
    else:
        raise KeyError(name)

    return {"body": body, "eyes": eyes if rig.eyes is not None else None}


# ----------------------------------------------------------------------------- happy variants (36 frames, end at rest)
# Every variant returns ({"location", "rotation_euler", "scale"} for Body, Eyes scale keys). All start and end at rest.

def happy_jump_spin(rig, P):  # biped (and the fallback): big jump, full yaw spin at the apex, hard landing squash
    body = {
        "location": [K(0, T(0), QUAD, OUT), K(13, T(0.35), QUAD, IN), K(24, T(0)), K(36, T(0))],
        "rotation_euler": [K(0, R()), K(3, R(), SINE, INOUT), K(23, R(ry=360)), K(36, R(ry=360))],
        "scale": [K(0, S()), K(2, P["jump_stretch"]()), K(20, P["jump_rebound"]()), K(24, P["jump_land"]()),
                  K(28, P["jump_rebound"]()), K(36, S())],
    }
    return body, [K(0, ES(1)), K(2, ES(1.2)), K(22, ES(1.2)), K(26, ES(1)), K(36, ES(1))]


def happy_double_bounce(rig, P):  # blob: two bounces, big squash between, 20 deg roll wobble alternating
    body = {
        "location": [K(0, T(0), QUAD, OUT), K(7, T(0.22), QUAD, IN), K(14, T(0), QUAD, OUT), K(21, T(0.14), QUAD, IN),
                     K(28, T(0)), K(36, T(0))],
        "rotation_euler": [K(0, R()), K(7, R(rz=20)), K(21, R(rz=-20)), K(30, R(rz=5)), K(36, R())],
        "scale": [K(0, S()), K(3, S(1.14, 0.93)), K(14, S(0.78, 1.16)), K(17, S(1.10, 0.95)), K(28, S(0.86, 1.09)),
                  K(32, S(1.03, 0.985)), K(36, S())],
    }
    return body, [K(0, ES(1)), K(3, ES(1.2)), K(24, ES(1.2)), K(29, ES(1)), K(36, ES(1))]


def happy_pounce(rig, P):  # bean: crouch, leap forward, land with a splay, hop back to the start
    fwd = 0.28
    body = {
        "location": [K(0, T(0)), K(4, T(0), QUAD, OUT), K(11, TZ(0.25, fwd * 0.5), QUAD, IN), K(18, TZ(0, fwd), QUAD, OUT),
                     K(25, TZ(0.16, fwd * 0.5), QUAD, IN), K(32, T(0)), K(36, T(0))],
        "rotation_euler": [K(0, R()), K(4, R(rx=-4)), K(11, R(rx=-10)), K(18, R(rx=5)), K(25, R(rx=-6)), K(32, R(rx=2)),
                           K(36, R())],
        "scale": [K(0, S()), K(4, S(0.84, 1.08)), K(8, SB(1.10, 0.92, 1.12)), K(18, SB(0.82, 1.18, 1.06)),
                  K(22, S(1.06, 0.97)), K(32, S(0.92, 1.04)), K(36, S())],
    }
    return body, [K(0, ES(1)), K(4, ES(0.6)), K(8, ES(1.25)), K(24, ES(1.25)), K(30, ES(1)), K(36, ES(1))]


def happy_flap_hop(rig, P):  # bird: two quick hops, body tilts 30 deg to alternate sides like flapping
    body = {
        "location": [K(0, T(0), QUAD, OUT), K(6, T(0.16), QUAD, IN), K(12, T(0), QUAD, OUT), K(18, T(0.16), QUAD, IN),
                     K(24, T(0)), K(36, T(0))],
        "rotation_euler": [K(0, R()), K(6, R(rz=30)), K(12, R()), K(18, R(rz=-30)), K(24, R()), K(36, R())],
        "scale": [K(0, S()), K(3, S(1.08, 0.96)), K(12, S(0.88, 1.06)), K(15, S(1.08, 0.96)), K(24, S(0.86, 1.08)),
                  K(29, S(1.04, 0.98)), K(36, S())],
    }
    return body, [K(0, ES(1)), K(3, ES(1.2)), K(22, ES(1.2)), K(27, ES(1)), K(36, ES(1))]


def happy_cap_pop(rig, P):  # sprite: body pops tall (cap shoots up), yaw wiggle, tiny hop
    body = {
        "location": [K(0, T(0)), K(2, T(0), QUAD, OUT), K(8, T(0.07), QUAD, IN), K(14, T(0)), K(36, T(0))],
        "rotation_euler": [K(0, R()), K(6, R(ry=8)), K(12, R(ry=-8)), K(18, R(ry=6)), K(24, R(ry=-4)), K(30, R(ry=2)),
                           K(36, R())],
        "scale": [K(0, S()), K(5, S(1.25, 0.92)), K(11, S(0.95, 1.03)), K(16, S(1.15, 0.95)), K(22, S(0.97, 1.02)),
                  K(28, S(1.05, 0.98)), K(36, S())],
    }
    return body, [K(0, ES(1)), K(5, ES(1.25)), K(16, ES(1.25)), K(24, ES(1)), K(36, ES(1))]


def happy_belly_wiggle(rig, P):  # flat: roll +-12 deg wiggle (never inverting), tail-fin slaps, small lifts keep pads near the ground
    lift = 0.5 * (rig.size.x * 0.5) * math.sin(math.radians(12))
    body = {
        "location": [K(0, T(0)), K(5, T(lift)), K(11, T(lift)), K(17, T(lift * 0.85)), K(23, T(lift * 0.7)),
                     K(29, T(lift * 0.35)), K(36, T(0))],
        "rotation_euler": [K(0, R()), K(5, R(rx=4, rz=12)), K(11, R(rx=0, rz=-12)), K(17, R(rx=4, rz=10)),
                           K(23, R(rx=0, rz=-8)), K(29, R(rx=2, rz=4)), K(36, R())],
        "scale": [K(0, S()), K(5, SB(0.95, 1.03, 1.06)), K(11, SB(1.04, 0.98, 0.96)), K(17, SB(0.96, 1.02, 1.05)),
                  K(23, SB(1.02, 0.99, 0.98)), K(29, SB(0.99, 1.0, 1.01)), K(36, S())],
    }
    return body, [K(0, ES(1)), K(5, ES(1.2)), K(20, ES(1.2)), K(27, ES(1)), K(36, ES(1))]


HAPPY_VARIANTS = {
    "blob": happy_double_bounce,
    "bean": happy_pounce,
    "bird": happy_flap_hop,
    "biped": happy_jump_spin,
    "sprite": happy_cap_pop,
    "flat": happy_belly_wiggle,
}


def happy_variant_name(rig):
    return HAPPY_VARIANTS.get(rig.archetype, happy_jump_spin).__name__.replace("happy_", "")


# ----------------------------------------------------------------------------- keying (slotted actions, Blender 4.4+)

def _channelbag(action, slot):
    for layer in action.layers:
        for strip in layer.strips:
            cb = strip.channelbag(slot, ensure=False)
            if cb is not None:
                return cb
    return None


def _key_object(obj, action, channels):
    ad = obj.animation_data or obj.animation_data_create()
    ad.action = action
    slot = action.slots.new(id_type="OBJECT", name=obj.name)
    ad.action_slot = slot
    for path, keys in channels.items():
        for frame, value, _i, _e in keys:
            setattr(obj, path, value)
            obj.keyframe_insert(data_path=path, frame=frame)
    cb = _channelbag(action, slot)
    for fc in cb.fcurves:
        keys = channels[fc.data_path]
        pts = sorted(fc.keyframe_points, key=lambda p: p.co.x)
        for kp, (_f, _v, interp, easing) in zip(pts, keys):
            kp.interpolation = interp
            kp.easing = easing
            if interp == BEZ:
                kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
        fc.update()
    return slot


def _push_to_nla(obj, action, slot, name):
    ad = obj.animation_data
    track = ad.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    strip.action_slot = slot
    strip.name = name
    ad.action = None
    track.mute = True  # authoring convenience only; exporter ignores track mute (it checks strip.mute)
    return track


def build_clips(rig):
    """Create the five actions + NLA tracks on the rig. Returns {clip: {"frames": n, "loop": bool, "seconds": s}}."""
    info = {}
    for name in CLIP_ORDER:
        frames, loop = CLIP_SPEC[name]
        action = bpy.data.actions.new(name)
        action.use_frame_range = True
        action.frame_start = 0
        action.frame_end = frames
        action.use_cyclic = loop
        keys = clip_keys(name, rig)
        slot = _key_object(rig.body, action, keys["body"])
        _push_to_nla(rig.body, action, slot, name)
        if rig.eyes is not None and keys["eyes"] is not None:
            eslot = _key_object(rig.eyes, action, keys["eyes"])
            _push_to_nla(rig.eyes, action, eslot, name)
        info[name] = {"frames": frames, "loop": loop, "seconds": round(frames / FPS, 4)}
    return info


def solo(rig, name):
    """Make only clip `name` drive the rig (for previews / motion sheets from the authoring scene)."""
    for obj in rig.animated:
        ad = obj.animation_data
        if ad is None:
            continue
        ad.action = None
        for track in ad.nla_tracks:
            track.mute = track.name != name
            track.is_solo = False
