#!/usr/bin/env python3
"""Generate the short UI sound effects used by the Sound component (pop, whoosh, stop) with ElevenLabs
sound generation. Needs ELEVENLABS_API_KEY in the environment. Calls run one after the other: firing them
in parallel returns 429. Any other short mp3 with the same names works too.
usage: make_sfx.py <out_dir> [name ...]     (default: pop whoosh stop)"""
import json, os, subprocess, sys

PROMPTS = {
    'pop': 'a single soft short UI pop, clean, no reverb',
    'whoosh': 'a short quick soft whoosh transition, clean, no reverb',
    'stop': 'a short dull thud like a stamp hitting paper, clean, no reverb',
}
out = sys.argv[1]; names = sys.argv[2:] or list(PROMPTS)
os.makedirs(out, exist_ok=True)
key = os.environ.get('ELEVENLABS_API_KEY') or sys.exit('ELEVENLABS_API_KEY not set')
for n in names:
    body = json.dumps({'text': PROMPTS[n], 'duration_seconds': 0.8, 'prompt_influence': 0.6})
    dst = os.path.join(out, f'{n}.mp3')
    r = subprocess.run(['curl', '-sS', '--fail-with-body', '-X', 'POST', 'https://api.elevenlabs.io/v1/sound-generation',
                        '-H', f'xi-api-key: {key}', '-H', 'Content-Type: application/json', '-d', body, '-o', dst], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'{n}: failed {r.stdout[:300]} {r.stderr[:300]}')
    print(n, '->', dst, os.path.getsize(dst), 'bytes')
