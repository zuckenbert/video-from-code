"""Loads config.json on top of the defaults and resolves fonts and colors."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

DEFAULTS = {
    "video": "source.mp4",
    "workdir": "_work",
    "outdir": "clips",
    "language_code": "por",
    "num_speakers": 4,
    "output": {"width": 1920, "height": 1080, "fps": 24, "crf": 19, "loudness": -16},
    "theme": {
        # repo palette: Ink canvas, Beacon only for highlighted terms, Cobalt card edge, Field text, Slate role
        "background": "#12141A",
        "accent": "#EF681E",
        "bar": "#1D4AA5",
        "text": "#F3EFE5",
        "muted": "#8195B0",
        "font_bold": None,
        "font_medium": None,
        "logo": None,
    },
    "caption": {
        "size": 52, "line_height": 68, "stroke": 6,
        "x": 88, "max_width": 1180,
        "bottom": 92, "bottom_raised": 300,
        "max_line_chars": 36, "max_cue_chars": 74,
        "max_dur": 3.4, "min_dur": 0.85,
        "min_size": 38,
    },
    "lower_third": {"enabled": True, "in": 0.6, "out": 7.0, "fade": 0.5,
                    "name_size": 44, "role_size": 26, "logo_height": 32},
    "pip": {"enabled": True, "source_crop": [476, 267, 1443, 406],
            "w": 560, "h": 316, "x": 1324, "y": 728, "border": 4},
    "share_detect": {"split_x": 1440, "threshold": 24, "outside_threshold": 40,
                     "tile_slack": 26, "probe_at": [0.15, 0.5, 0.85]},
    "lexicon": {"highlight": [], "locked": [], "fix": {}, "fillers": None, "orphans": None},
    "speakers": {},
}

# per-language defaults: words that must not end a cut (loose conjunction/article)
# and the regex of hesitation fillers the captions drop.
LANG = {
    "por": {
        "orphans": ["e", "entao", "então", "mas", "é", "ai", "aí", "ou", "que",
                    "a", "o", "ne", "né", "pois", "porque"],
        "fillers": r'^(é{2,}|e{2,}|h[ãa]+|ã+|ahn|hum|hm+)[,.!?]?$',
    },
    "eng": {
        "orphans": ["and", "so", "but", "or", "that", "the", "a", "then", "right", "like"],
        "fillers": r'^(uh+|um+|erm+|hmm+|mm+)[,.!?]?$',
    },
}
LANG["pt"] = LANG["por"]
LANG["en"] = LANG["eng"]


def _merge(base, over):
    out = dict(base)
    for k, v in (over or {}).items():
        out[k] = _merge(base[k], v) if isinstance(v, dict) and isinstance(base.get(k), dict) else v
    return out


def rgb(hexstr):
    h = hexstr.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


# Manrope (captions, names) and IBM Plex Mono (role, a label) ship with the captions skill of this repo,
# with their OFL license files; then system installs; then Arial/DejaVu.
_SHIPPED = os.path.join(ROOT, "..", "captions", "assets", "fonts")
FONT_CANDIDATES = {
    "bold": [
        os.path.join(_SHIPPED, "Manrope-SemiBold.ttf"),
        "~/Library/Fonts/Manrope-SemiBold.ttf",
        "/Library/Fonts/Manrope-SemiBold.ttf",
        "/Library/Fonts/IBMPlexSans-SemiBold.ttf",
        "~/Library/Fonts/IBMPlexSans-SemiBold.ttf",
        "/usr/share/fonts/truetype/ibm-plex/IBMPlexSans-SemiBold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "medium": [
        os.path.join(_SHIPPED, "IBMPlexMono-Medium.ttf"),
        "~/Library/Fonts/IBMPlexMono-Medium.ttf",
        "/Library/Fonts/IBMPlexMono-Medium.ttf",
        "/usr/share/fonts/truetype/ibm-plex/IBMPlexMono-Medium.ttf",
        "/Library/Fonts/IBMPlexSans-Medium.ttf",
        "~/Library/Fonts/IBMPlexSans-Medium.ttf",
        "/usr/share/fonts/truetype/ibm-plex/IBMPlexSans-Medium.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
}


def resolve_font(path, kind):
    for cand in ([path] if path else []) + FONT_CANDIDATES[kind]:
        p = os.path.expanduser(cand)
        if os.path.exists(p):
            return p
    raise SystemExit(
        f"No {kind} font found. Point theme.font_{kind} in config.json or install one\n"
        "  macOS:  brew install --cask font-ibm-plex-sans\n"
        "  Debian: apt install fonts-ibm-plex"
    )


def load(path=None):
    path = path or os.path.join(ROOT, "config.json")
    raw = json.load(open(path)) if os.path.exists(path) else {}
    cfg = _merge(DEFAULTS, raw)
    lang = LANG.get(cfg["language_code"], LANG["eng"])
    lx = cfg["lexicon"]
    lx["orphans"] = lx["orphans"] or lang["orphans"]
    lx["fillers"] = lx["fillers"] or lang["fillers"]
    lx["_fillers_re"] = re.compile(lx["fillers"], re.I)
    t = cfg["theme"]
    t["_bg"] = rgb(t["background"]); t["_accent"] = rgb(t["accent"])
    t["_bar"] = rgb(t.get("bar") or t["accent"])
    t["_text"] = rgb(t["text"]); t["_muted"] = rgb(t["muted"])
    t["font_bold"] = resolve_font(t["font_bold"], "bold")
    t["font_medium"] = resolve_font(t["font_medium"], "medium")
    if t["logo"]:
        t["logo"] = os.path.expanduser(t["logo"])
        if not os.path.exists(t["logo"]):
            print(f"warning: logo {t['logo']} does not exist, card goes out without a logo", file=sys.stderr)
            t["logo"] = None
    base = os.path.dirname(os.path.abspath(path))
    cfg["_root"] = base
    for key in ("workdir", "outdir"):
        cfg[key] = os.path.join(base, cfg[key]) if not os.path.isabs(cfg[key]) else cfg[key]
    cfg["video"] = os.path.expanduser(cfg["video"])
    if not os.path.isabs(cfg["video"]):
        cfg["video"] = os.path.join(base, cfg["video"])
    return cfg
