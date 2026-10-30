// Builds <project>/cut.json from events.json + vo.json (optional) + storyboard.json and copies the engine assets (fonts).
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const P = resolve(process.argv[2] ?? '.')
const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FPS = 30
const SB = JSON.parse(readFileSync(`${P}/storyboard.json`, 'utf8'))
const EV = JSON.parse(readFileSync(`${P}/events.json`, 'utf8'))
const VO = existsSync(`${P}/vo.json`) ? JSON.parse(readFileSync(`${P}/vo.json`, 'utf8')) : {}
const CARD_MIN = SB.cardMin ?? 4.5, PAD = SB.pad ?? 0.9
mkdirSync(`${P}/assets`, { recursive: true }); for (const f of readdirSync(`${SKILL}/assets`).filter((f) => !f.startsWith('.'))) copyFileSync(join(SKILL, 'assets', f), join(P, 'assets', f))
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
let prevCursor = EV.events[0]?.cursor ?? { x: 800, y: 450 }
const scenes = []; let t = 0
for (const sc of SB.scenes) {
  if (sc.capture === false) continue
  const vo = VO[sc.id] ?? null
  if (sc.kind === 'card') { const dur = Math.max(CARD_MIN, (vo?.dur ?? 0) + PAD); scenes.push({ id: sc.id, kind: 'card', title: sc.title, line: sc.line, sub: sc.sub ?? null, start: t, dur, vo: vo?.file ?? null, events: [] }); t += dur; continue }
  const evs = EV.events.filter((e) => e.scene === sc.id && e.kind !== 'error')
  if (!evs.length) { console.warn(`scene ${sc.id} has no events, skipped`); continue }
  const items = evs.map((e) => { let move = 0; if (e.kind === 'move' || (['click', 'open', 'confirm'].includes(e.kind) && dist(prevCursor, e.cursor) > 2)) move = Math.min(0.8, Math.max(0.28, dist(prevCursor, e.cursor) / 1500)); prevCursor = e.cursor; return { ...e, move, hold: e.hold ?? 0 } })
  const natural = items.reduce((s, e) => s + e.move + e.hold, 0)
  const target = Math.max(natural, (vo?.dur ?? 0) + PAD)
  const stretchable = items.filter((e) => e.hold >= 0.4).reduce((s, e) => s + e.hold, 0)
  const k = target > natural && stretchable > 0 ? 1 + (target - natural) / stretchable : 1
  let tt = 0
  const out = items.map((e) => { const hold = e.hold >= 0.4 ? e.hold * k : e.hold; const o = { kind: e.kind, img: e.img, cursor: e.cursor, rect: e.rect ?? null, zoom: e.zoom ?? null, start: tt, move: e.move, hold }; tt += e.move + hold; return o })
  scenes.push({ id: sc.id, kind: 'ui', chapter: sc.chapter ?? null, timer: sc.timer ?? false, start: t, dur: tt, vo: vo?.file ?? null, events: out }); t += tt
}
const cut = { fps: FPS, viewport: EV.viewport, total: t, scenes, frames: 'frames', brand: SB.brand ?? {} }
writeFileSync(`${P}/cut.json`, JSON.stringify(cut))
console.log('total', t.toFixed(1), 's;', scenes.map((s) => `${s.id}=${s.dur.toFixed(1)}`).join(' '))
