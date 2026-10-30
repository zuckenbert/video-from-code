// Records the product journey as ONE CONTINUOUS browser video (never screenshots), cued by an ABSOLUTE CLOCK so every
// action lands on a beat of the archival audio:   t_rec = t_video - recAt   (recAt comes from src/film.json).
// Every `at` in the journey is a time in the FINAL FILM (the archival audio clock); the recorder converts it.
//
// Outputs (per language):
//   $PUBLIC_DIR/rec_<lang>.mp4          the recording (viewport x scale, e.g. 1440x900 CSS rendered at 2880x1800, 25 fps)
//   $PUBLIC_DIR/rec_events_<lang>.json  raw event log, saved BEFORE post-processing (so a failed finish never loses it)
//   src/cuts/cut_<lang>.json            events with absolute instants + rects in CSS px, consumed by the composition
//
// Usage:
//   FILM_LANG=en JOURNEY=examples/journey.json PUBLIC_DIR=public node scripts/record.mjs
//   FINISH=<path.webm> FILM_LANG=en node scripts/record.mjs      # only post-process an existing webm
// FILM_LANG, not LANG: LANG is the shell locale and is almost always set.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LANG = process.env.FILM_LANG ?? 'en'
const J = JSON.parse(readFileSync(resolve(ROOT, process.env.JOURNEY ?? 'examples/journey.json'), 'utf8'))
const FILM = JSON.parse(readFileSync(resolve(ROOT, process.env.FILM ?? 'src/film.json'), 'utf8'))
const OFFSET = FILM.recAt // t_rec = t_video - OFFSET
const PUB = resolve(ROOT, process.env.PUBLIC_DIR ?? 'public'); mkdirSync(`${PUB}/rec_tmp`, { recursive: true }); mkdirSync(`${ROOT}/src/cuts`, { recursive: true })
const Z = J.scale ?? 2, VP = J.viewport ?? { width: 1440, height: 900 }
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)))

// {{var}} substitution per language (same app, typed text in the film's language)
const VARS = (J.vars ?? {})[LANG] ?? {}
const sub = (v) => typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, k) => VARS[k] ?? '') : Array.isArray(v) ? v.map(sub) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v
const STEPS = sub(J.steps ?? []), WARM = sub(J.warmup ?? [])

const FINISH = process.env.FINISH
if (FINISH) { const ev = JSON.parse(readFileSync(`${PUB}/rec_events_${LANG}.json`, 'utf8')); await finish(FINISH, ev); process.exit(0) }

const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) })
// Recording at 2x: viewport = layout x Z with deviceScaleFactor 1, then CSS zoom Z. (DSF 2 with recordVideo does NOT
// scale: the content lands in a corner of the frame. CDP screencast came out at 1x and ~10 fps.)
const ctx = await browser.newContext({ viewport: { width: VP.width * Z, height: VP.height * Z }, deviceScaleFactor: 1, locale: (J.locale ?? {})[LANG] ?? 'en-US', recordVideo: { dir: `${PUB}/rec_tmp`, size: { width: VP.width * Z, height: VP.height * Z } } })
const page = await ctx.newPage(); page.setDefaultTimeout(10000)

// Two zoom modes, both proven:
//  documentElement: document.documentElement.style.zoom = Z (plain apps; `body>*{zoom}` did not take on one of them)
//  bodyChildren:    zoom on the CHILDREN of <body> via an injected <style> (Next.js removes a loose <style> on <html>,
//                   and html zoom breaks Radix popover positioning: the popper wrapper is placed by translate in real px,
//                   so the zoom goes on its content and select-content goes back to the trigger width).
const MODE = J.zoomMode ?? 'documentElement'
const ZCSS = MODE === 'bodyChildren' ? `body>*:not([data-radix-popper-content-wrapper]){zoom:${Z}} [data-radix-popper-content-wrapper]>*{zoom:${Z}} [data-radix-popper-content-wrapper]>.select-content{width:calc(var(--radix-popper-anchor-width)/${Z})!important;min-width:0!important}\n` : ''
const CSS = ZCSS + '::-webkit-scrollbar{display:none}\n' + (J.css ?? '')
const applyCss = () => page.evaluate(([css, z, mode]) => { if (mode === 'documentElement') document.documentElement.style.zoom = String(z); let s = document.getElementById('__rec'); if (!s) { s = document.createElement('style'); s.id = '__rec'; document.head.appendChild(s) } if (s.textContent !== css) s.textContent = css }, [CSS, Z, MODE]).catch(() => {})
page.on('framenavigated', (f) => { if (f === page.mainFrame()) applyCss() })
// scroll container: the app scrolls a div, never the window. Configured selector, else nearest scrollable parent, else first scrollable div.
await ctx.addInitScript((sel) => {
  window.__main = () => { if (sel) { const m = document.querySelector(sel); if (m) return m } for (const el of document.querySelectorAll('div,main,section')) { const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 5) return el } return document.scrollingElement }
  window.__sp = (el) => { if (sel) { const m = el.closest(sel); if (m) return m } let p = el.parentElement; while (p) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 5) return p; p = p.parentElement } return window.__main() }
}, J.scroller ?? null)

// ===== clock and log =====
let T0 = 0; const now = () => (performance.now() - T0) / 1000
const events = []; let cursor = { ...(J.cursorStart ?? { x: VP.width * 0.55, y: VP.height * 0.55 }) }
const log = (kind, extra = {}) => { const e = { kind, t: +now().toFixed(3), cursor: { ...cursor }, ...extra }; events.push(e); return e }
const toCss = (b) => ({ x: b.x / Z, y: b.y / Z, w: b.width / Z, h: b.height / Z, cx: (b.x + b.width / 2) / Z, cy: (b.y + b.height / 2) / Z })
const easeInOut = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p)
// mouse on a real trajectory: duration by distance (0.28 to 0.8 s), 30 steps/s
const moveDur = (d) => Math.min(0.8, Math.max(0.28, d / 1500))
const moveMouse = async (to) => {
  const from = { ...cursor }; const d = Math.hypot(to.x - from.x, to.y - from.y); if (d < 2) { cursor = { ...to }; return 0 }
  const dur = moveDur(d); const n = Math.max(4, Math.round(dur * 30)); const t = now(); log('move', { dur, from, to })
  for (let i = 1; i <= n; i++) { const p = easeInOut(i / n); await page.mouse.move((from.x + (to.x - from.x) * p) * Z, (from.y + (to.y - from.y) * p) * Z); await sleep((t + dur * i / n - now()) * 1000) }
  cursor = { ...to }; return dur
}
const leadFor = (r) => { const d = Math.hypot(r.cx - cursor.x, r.cy - cursor.y); return d < 2 ? 0 : moveDur(d) }
// aim: wide targets get the cursor at 30% from the left, not dead center
const aim = (r) => ({ x: r.cx + (r.w > 240 ? -r.w * 0.3 : 0), y: r.cy })
const rectOf = async (loc) => { const h = loc.first(); await h.waitFor({ state: 'visible', timeout: 8000 }); const b = await h.boundingBox(); if (!b) throw new Error('no box'); return toCss(b) }
const unionRect = (rs) => { const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y)), x2 = Math.max(...rs.map((r) => r.x + r.w)), y2 = Math.max(...rs.map((r) => r.y + r.h)); return { x, y, w: x2 - x, h: y2 - y, cx: (x + x2) / 2, cy: (y + y2) / 2 } }

// target spec -> locator. {css|role+name|label|text, hasText, hasTextRe, within, last, nth}
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const locate = (t) => {
  if (!t) throw new Error('step without target')
  const root = t.within ? locate(t.within).first() : page
  let l
  if (t.css) l = root.locator(t.css)
  else if (t.role) l = root.getByRole(t.role, { name: t.exact ? t.name : new RegExp('^' + escRe(t.name), 'i'), exact: !!t.exact })
  else if (t.label) l = root.getByLabel(t.label)
  else if (t.text) l = root.getByText(t.text, { exact: false })
  else throw new Error('target needs css, role, label or text: ' + JSON.stringify(t))
  if (t.hasText) l = l.filter({ hasText: t.hasText })
  if (t.hasTextRe) l = l.filter({ hasText: new RegExp(t.hasTextRe, 'i') })
  if (t.last) l = l.last(); else if (t.nth != null) l = l.nth(t.nth)
  return l
}

// smooth scroll of the CONTAINER (scrollTo smooth), then wait until it settles
const smoothTo = async (top) => {
  const moved = await page.evaluate((y) => { const m = window.__active ?? window.__main(); if (!m || Math.abs(m.scrollTop - y) < 4) return false; m.scrollTo({ top: y, behavior: 'smooth' }); return true }, top)
  if (!moved) return; log('scroll')
  let last = -1; for (let i = 0; i < 50; i++) { await sleep(60); const y = await page.evaluate(() => (window.__active ?? window.__main())?.scrollTop ?? 0); if (Math.abs(y - last) < 1) break; last = y }
  await sleep(100)
}
// bring an element into view, placing its top at `frac` of the container height
const ensureVisible = async (loc, frac = 0.4) => {
  const h = loc.first(); await h.waitFor({ state: 'attached', timeout: 8000 })
  const i = await h.evaluate((el) => { const m = window.__sp(el); window.__active = m; const r = el.getBoundingClientRect(); const cr = m === document.scrollingElement ? { top: 0, bottom: innerHeight, height: innerHeight } : m.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, cTop: cr.top, cBot: cr.bottom, cH: cr.height, cur: m.scrollTop, max: m.scrollHeight - m.clientHeight } })
  if (i.top >= i.cTop + 60 * Z && i.bottom <= i.cBot - 60 * Z) return
  // getBoundingClientRect is in real px (zoomed); scrollTop is in CSS px: convert before mixing
  const relTopCss = (i.top - i.cTop) / Z + i.cur; await smoothTo(Math.max(0, Math.min(i.max, relTopCss - (i.cH / Z) * frac)))
}

// wait until the clock reaches `at` (film time), minus the lead of the mouse move so the CLICK lands on the beat.
// When a wait overruns, the natural holds that follow shrink to 35% until the journey catches up.
let behind = 0
const waitAt = async (at, lead = 0, label = '') => { if (at == null) return; const w = (at - OFFSET) - lead - now(); behind = Math.max(0, -w); if (w < -0.15) console.log(`  OVERRUN ${(-w).toFixed(2)}s before @${at}${label ? ' ' + label : ''}`); await sleep(w * 1000) }
const hold = async (sec) => sleep((behind > 0.2 ? sec * 0.35 : sec) * 1000)
// screen signature: route + h1. A click that changes the screen never keeps a zoom: the new screen enters whole
// and only the next step zooms in.
const signature = () => page.evaluate(() => location.pathname + location.hash + '#' + (document.querySelector('h1')?.textContent ?? '').trim()).catch(() => '')

const doClick = async (st) => {
  const loc = locate(st.target); await ensureVisible(loc, st.frac ?? 0.4); const r = await rectOf(loc); const to = aim(r)
  await waitAt(st.at, leadFor(r), st.cue); await moveMouse(to)
  const before = await signature()
  await loc.first().click({ position: { x: (to.x - r.x) * Z, y: (to.y - r.y) * Z } })
  const e = log(st.kind ?? 'click', { rect: r, zoom: st.zoom ?? null, at: st.at ?? null })
  await sleep(st.settle ?? 220)
  if (!st.keepZoom && (await signature()) !== before) { e.nav = true; e.zoom = 1.0; e.rect = null; await applyCss() }
  await hold(st.hold ?? 0.3)
}
const focus = async (t) => { if (t) await locate(t).first().click() } // focus without moving the drawn cursor

const run = {
  click: doClick,
  hover: async (st) => { const loc = locate(st.target); await ensureVisible(loc, st.frac ?? 0.4); const r = await rectOf(loc); await waitAt(st.at, leadFor(r), st.cue); await moveMouse(aim(r)); await loc.first().hover({ position: { x: (aim(r).x - r.x) * Z, y: (aim(r).y - r.y) * Z } }) },
  type: async (st) => { await focus(st.focus); if (st.clear) await page.keyboard.press('ControlOrMeta+A'); await waitAt(st.at, 0, st.cue); log('type'); await page.keyboard.type(st.text, { delay: st.delay ?? 48 }); await hold(st.hold ?? 0.15) },
  press: async (st) => { await waitAt(st.at, 0, st.cue); await focus(st.focus); await page.keyboard.press(st.key); log('key', st.zoom != null ? { rect: null, zoom: st.zoom } : {}); await sleep((st.hold ?? 0.1) * 1000) },
  zoom: async (st) => { const loc = locate(st.target); await ensureVisible(loc, st.frac ?? 0.4); const r = await rectOf(loc); await waitAt(st.at, 0, st.cue); log('zoom', { rect: r, zoom: st.scale ?? 1.3, at: st.at ?? null }); await hold(st.hold ?? 0.3) },
  frame: async (st) => { const locs = st.targets.map(locate); for (const l of locs) await ensureVisible(l, st.frac ?? 0.4); const rs = []; for (const l of locs) rs.push(await rectOf(l)); await waitAt(st.at, 0, st.cue); log('zoom', { rect: unionRect(rs), zoom: st.scale ?? 1.3, at: st.at ?? null }); await hold(st.hold ?? 0.3) },
  zoomReset: async (st) => { await waitAt(st.at, 0, st.cue); log('zoom', { rect: null, zoom: 1.0, at: st.at ?? null }); await hold(st.hold ?? 0) },
  reveal: async (st) => { await waitAt(st.at, 0, st.cue); await ensureVisible(locate(st.target), st.frac ?? 0.6); if (st.zoom != null) log('zoom', { rect: null, zoom: st.zoom }) },
  // "concept" beats: go back to the TOP of the full screen at zoom 1.0 instead of idling on a scrolled fragment
  scrollTop: async (st) => { await waitAt(st.at, 0, st.cue); log('zoom', { rect: null, zoom: st.zoom ?? 1.0 }); await page.evaluate(() => { window.__active = window.__main() }); await smoothTo(0); await hold(st.hold ?? 0.4) },
  select: async (st) => { await doClick({ ...st, kind: 'open', hold: st.openHold ?? 0.4, settle: 180 }); await doClick({ target: { role: 'option', name: st.option }, hold: st.hold ?? 0.4, zoom: st.zoom, settle: 200 }) },
  // navigation: hash change, or the SPA router (Next.js `window.next.router.push`), never a hard reload when avoidable:
  // a hard goto shows the empty shell for about a second.
  nav: async (st) => {
    await waitAt(st.at, 0, st.cue); log('nav', { zoom: 1.0, rect: null, nav: true, at: st.at ?? null })
    if (st.hash) await page.evaluate((h) => { location.hash = h }, st.hash)
    else { const ok = st.router === 'next' && await page.evaluate((u) => { const r = window.next?.router; if (r?.push) { r.push(u); return true } return false }, st.url).catch(() => false); if (!ok) await page.goto(new URL(st.url, J.base).href, { waitUntil: 'load' }) }
    await sleep(250); await applyCss()
  },
  waitFor: async (st) => { await locate(st.target).first().waitFor({ state: st.state ?? 'visible', timeout: st.timeout ?? 10000 }); await applyCss() },
  wait: async (st) => sleep(st.ms ?? 0),
  mark: async (st) => { await waitAt(st.at, 0, st.cue); log('mark', st.cue ? { cue: st.cue } : {}) },
}
const warm = {
  goto: async (st) => { await page.goto(new URL(st.url ?? '', J.base).href, { waitUntil: 'load' }); await applyCss() },
  fill: async (st) => locate(st.target).first().fill(st.text),
  click: async (st) => locate(st.target).first().click(),
  press: async (st) => page.keyboard.press(st.key),
  hash: async (st) => page.evaluate((h) => { location.hash = h }, st.hash),
  waitFor: async (st) => locate(st.target).first().waitFor({ state: 'visible', timeout: st.timeout ?? 15000 }),
  wait: async (st) => sleep(st.ms ?? 0),
}

// ===== warm-up (outside the useful recording: sign in, visit every screen once so caches are hot) =====
await page.goto(J.base, { waitUntil: 'load' }); await applyCss()
for (const st of WARM) { await warm[st.s](st); await applyCss(); await sleep(st.after ?? 300) }
await page.mouse.move(cursor.x * Z, cursor.y * Z)
// black marker: 0.6 s full-screen black; t0 = the instant it disappears. blackdetect finds it in the webm later.
console.log('warm; marker')
await page.evaluate(() => { const d = document.createElement('div'); d.id = '__mark'; d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647'; document.body.appendChild(d) })
await sleep(600); await page.evaluate(() => document.getElementById('__mark')?.remove()); T0 = performance.now()

for (const [i, st] of STEPS.entries()) {
  const name = `${i} ${st.s}${st.cue ? ' "' + st.cue + '"' : ''}`
  try { if (!run[st.s]) throw new Error('unknown step ' + st.s); await run[st.s](st); console.log(`  ok ${name} @rec ${now().toFixed(2)} (film ${(now() + OFFSET).toFixed(2)})`) }
  catch (e) { console.error(`  ERR ${name}: ${e.message.split('\n')[0]}`); log('error', { error: e.message.split('\n')[0], step: i }) }
}
const tEnd = now(); await sleep(800)
const video = page.video(); await ctx.close(); const webm = await video.path(); await browser.close()
console.log('recorded', tEnd.toFixed(1), 's; webm', webm)
writeFileSync(`${PUB}/rec_events_${LANG}.json`, JSON.stringify(events, null, 1)) // BEFORE post-processing
await finish(webm, events)

async function finish(webm, events) {
  // ffmpeg writes blackdetect to STDERR; execFileSync only returns stdout (paid lesson: one run lost its events)
  const bd = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', webm, '-vf', 'blackdetect=d=0.2:pix_th=0.20:pic_th=0.90', '-an', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
  const m = bd.match(/black_start:([\d.]+) black_end:([\d.]+)/); if (!m) throw new Error('black marker not found:\n' + bd.slice(-2000))
  const t0v = Number(m[2]); console.log('black marker', m[1], '->', m[2])
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', webm, '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${PUB}/rec_${LANG}.mp4`], { stdio: 'inherit' })
  const cut = { fps: 30, viewport: VP, video: `rec_${LANG}.mp4`, videoT0: t0v, offset: OFFSET, events: events.filter((e) => e.kind !== 'error'), lang: LANG }
  writeFileSync(`${ROOT}/src/cuts/cut_${LANG}.json`, JSON.stringify(cut)); console.log('events', cut.events.length, '->', `src/cuts/cut_${LANG}.json`)
  const errs = events.filter((e) => e.kind === 'error'); if (errs.length) console.log('STEP ERRORS:', errs.length, JSON.stringify(errs.map((e) => e.error)))
}
