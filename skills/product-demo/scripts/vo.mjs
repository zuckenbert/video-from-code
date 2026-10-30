// Per-scene narration via ElevenLabs. usage: ELEVENLABS_API_KEY=... node scripts/vo.mjs <project> [--force]
// No key: exits cleanly and timeline.mjs builds a silent video (durations from the steps only).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
const P = resolve(process.argv[2] ?? '.')
const SB = JSON.parse(readFileSync(`${P}/storyboard.json`, 'utf8'))
const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) { console.log('ELEVENLABS_API_KEY not set: skipping voice (video will be silent).'); process.exit(0) }
const VOICE = process.env.VOICE ?? SB.voice ?? 'onwK4e9ZLuTAKqWW03F9'
const MODEL = process.env.MODEL ?? 'eleven_multilingual_v2'
const force = process.argv.includes('--force')
mkdirSync(`${P}/vo`, { recursive: true }); const out = {}
for (const sc of SB.scenes) {
  if (!sc.vo) continue
  const f = `${P}/vo/${sc.id}.mp3`
  if (force || !existsSync(f)) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sc.vo, model_id: MODEL, language_code: SB.lang ?? 'en', voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, speed: 1.0 } }) })
    if (!r.ok) throw new Error(`${sc.id}: ${r.status} ${await r.text()}`)
    writeFileSync(f, Buffer.from(await r.arrayBuffer()))
  }
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString())
  out[sc.id] = { file: `vo/${sc.id}.mp3`, dur }; console.log(sc.id, dur.toFixed(2))
}
writeFileSync(`${P}/vo.json`, JSON.stringify(out, null, 1))
