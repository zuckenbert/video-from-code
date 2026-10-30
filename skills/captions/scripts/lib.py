"""Config shared by the Python stages."""
import json, os, sys

WORK = os.environ.get('CAP_WORK') or sys.exit('CAP_WORK is not set (run scripts/run.sh)')
ROOT = os.environ.get('CAP_ROOT') or sys.exit('CAP_ROOT is not set (run scripts/run.sh)')
CFG = json.load(open(os.path.join(WORK, 'config.json'), encoding='utf-8'))


def wpath(*p):
    return os.path.join(WORK, *p)


def asset(p):
    """resolve a path relative to the skill root"""
    p = os.path.expanduser(p)
    return p if os.path.isabs(p) else os.path.join(ROOT, p)


def rgb(hexstr):
    h = hexstr.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def has_card():
    """the lower third is drawn only when a name is configured"""
    return bool(CFG['card'].get('name', '').strip())
