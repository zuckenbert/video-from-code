#!/usr/bin/env python3
"""Word-timestamped transcript -> words.json as [{"w": word, "s": start, "e": end}] in seconds.

Primary: ElevenLabs Scribe (diarized, per-word timestamps). Needs ELEVENLABS_API_KEY in the environment.
Fallback (no key): local Whisper WITH per-word timestamps (mlx_whisper on Apple Silicon, faster-whisper elsewhere).
Never use a transcript without per-word timestamps: every cue in the video is tied to a spoken word.

usage:
  transcribe.py <media> <out_words.json> [--lang en] [--raw raw.json] [--speaker speaker_0]
  transcribe.py --from-raw raw.json <out_words.json> --cut IN OUT     # reuse a long transcript: keep [IN, OUT] and rebase to 0
  transcribe.py ... --fix "Wrong=Right" --fix "Other=Fixed"            # fix proper names the ASR got wrong
"""
import argparse, json, os, subprocess, sys, tempfile


def scribe(media, lang, raw_out):
    key = os.environ['ELEVENLABS_API_KEY']
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'audio.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', media, '-vn', '-ac', '1', '-ar', '16000', wav], check=True)
        cmd = ['curl', '-sS', '--fail-with-body', '-X', 'POST', 'https://api.elevenlabs.io/v1/speech-to-text',
               '-H', f'xi-api-key: {key}', '-F', f'file=@{wav}', '-F', 'model_id=scribe_v1',
               '-F', 'diarize=true', '-F', 'timestamps_granularity=word', '-F', 'tag_audio_events=false']
        if lang:
            cmd += ['-F', f'language_code={lang}']
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(f'Scribe failed: {r.stdout[:400]} {r.stderr[:400]}')
    raw = json.loads(r.stdout)
    if raw_out:
        json.dump(raw, open(raw_out, 'w'), ensure_ascii=False)
    return raw


def whisper(media, lang):
    """Same output shape as Scribe ({"words": [{"text","start","end","type"}]})."""
    words = []
    try:
        import mlx_whisper
        r = mlx_whisper.transcribe(media, path_or_hf_repo='mlx-community/whisper-large-v3-turbo', language=lang, word_timestamps=True)
        for s in r['segments']:
            words += [{'text': w['word'].strip(), 'start': w['start'], 'end': w['end'], 'type': 'word'} for w in s.get('words', [])]
    except ImportError:
        from faster_whisper import WhisperModel
        m = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
        segs, _ = m.transcribe(media, language=lang, word_timestamps=True)
        for s in segs:
            words += [{'text': w.word.strip(), 'start': w.start, 'end': w.end, 'type': 'word'} for w in s.words]
    return {'words': words}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('media', nargs='?')
    ap.add_argument('out')
    ap.add_argument('--lang', default=None, help='ISO code (en, pt, es...); Scribe auto-detects when omitted')
    ap.add_argument('--raw', help='also save the full raw transcript here')
    ap.add_argument('--from-raw', help='skip ASR, read an existing raw transcript')
    ap.add_argument('--cut', nargs=2, type=float, metavar=('IN', 'OUT'), help='keep only words inside [IN, OUT] and rebase time to IN')
    ap.add_argument('--speaker', help='keep only this diarized speaker_id (Scribe mixes up speakers when voices overlap: check)')
    ap.add_argument('--fix', action='append', default=[], help='Wrong=Right replacement on whole words, keeps punctuation')
    a = ap.parse_args()

    if a.from_raw:
        raw = json.load(open(a.from_raw))
    elif not a.media:
        sys.exit('give a media file or --from-raw')
    elif os.environ.get('ELEVENLABS_API_KEY'):
        raw = scribe(a.media, a.lang, a.raw)
    else:
        print('ELEVENLABS_API_KEY not set: falling back to local Whisper with word timestamps', file=sys.stderr)
        raw = whisper(a.media, a.lang)
        if a.raw:
            json.dump(raw, open(a.raw, 'w'), ensure_ascii=False)

    fixes = dict(f.split('=', 1) for f in a.fix)
    out = []
    for w in raw['words']:
        if w.get('type', 'word') != 'word':
            continue
        if a.speaker and w.get('speaker_id') != a.speaker:
            continue
        s, e, txt = float(w['start']), float(w['end']), w['text'].strip()
        if a.cut:
            if s < a.cut[0] or e > a.cut[1]:
                continue
            s, e = s - a.cut[0], e - a.cut[0]
        core = txt.rstrip('.,:;?!')
        if core in fixes:
            txt = fixes[core] + txt[len(core):]
        out.append({'w': txt, 's': round(s, 3), 'e': round(e, 3)})
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, indent=0)
    print(f'{len(out)} words, speech {out[0]["s"]:.2f} to {out[-1]["e"]:.2f} s -> {a.out}' if out else 'no words found')


if __name__ == '__main__':
    main()
