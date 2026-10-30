// Captures the storyboard: one real UI frame per state (2x), with cursor, zoom and hold.
// usage: node scripts/capture.mjs <project-folder> [scene1,scene2]
// Reads <project>/storyboard.json; writes <project>/frames/*.png and <project>/events.json
import { chromium } from 'playwright-core'
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
const P = resolve(process.argv[2] ?? '.')
const SB = JSON.parse(readFileSync(`${P}/storyboard.json`, 'utf8'))
rmSync(`${P}/frames`, { recursive: true, force: true }); mkdirSync(`${P}/frames`, { recursive: true })
const ONLY = process.argv[3] ? process.argv[3].split(',') : null
const SPEED = SB.speed ?? 1
const B = SB.base, VP = SB.viewport ?? { width: 1600, height: 900 }
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined })
const ctx = await browser.newContext({ viewport: VP, locale: SB.locale ?? 'en-US', deviceScaleFactor: 2 })
const page = await ctx.newPage(); page.setDefaultTimeout(10000)
const CSS = (SB.hideCss ?? 'nextjs-portal,.tsqd-open-btn-container,#__next-build-watcher{display:none!important}') + ' ::-webkit-scrollbar{display:none} *{caret-color:transparent!important}'
const ensureCss = async () => { const ok = await page.evaluate(() => !!document.getElementById('__cap2')).catch(() => true); if (!ok) await page.addStyleTag({ content: CSS }).then((h) => h.evaluate((e) => (e.id = '__cap2'))).catch(() => {}) }
const events = []; let fi = 0; let cursor = { x: VP.width * 0.55, y: VP.height * 0.5 }; let curScene = ''; let capturing = true
const settle = async (ms = 700) => { await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(ms) }
const snap = async () => { await ensureCss(); fi++; const f = `f${String(fi).padStart(4, '0')}.png`; await page.screenshot({ path: `${P}/frames/${f}`, animations: 'disabled', caret: 'hide' }); return f }
const rectOf = async (loc) => { const h = loc.first(); await h.waitFor({ state: 'visible', timeout: 8000 }); const b = await h.boundingBox(); if (!b) throw new Error('no box'); return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 } }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const locate = (t) => {
  if (!t) return null
  if (t.css) return page.locator(t.css)
  if (t.label) return page.getByLabel(t.label)
  if (t.placeholder) return page.getByPlaceholder(t.placeholder)
  if (t.text && !t.role) return page.getByText(t.text, { exact: !!t.exact })
  const opts = t.name == null ? {} : { name: t.exact ? t.name : new RegExp((t.any ? '' : '^') + esc(t.name), 'i'), exact: !!t.exact }
  let l = (t.role === 'button' || t.role === 'link') ? page.getByRole('button', opts).or(page.getByRole('link', opts)) : page.getByRole(t.role, opts)
  if (t.last) l = l.last(); if (t.nth != null) l = l.nth(t.nth); return l
}
const push = async (kind, extra = {}) => { if (!capturing) return null; if (extra.hold != null) extra.hold = extra.hold / SPEED; const img = await snap(); const e = { scene: curScene, kind, img, cursor: { ...cursor }, ...extra }; events.push(e); return e }
const moveTo = (r) => { cursor = { x: r.cx + (r.w > 240 ? -r.w * 0.3 : 0), y: r.cy } }
const clickLoc = async (loc, step, kind = 'click') => { const r = await rectOf(loc); moveTo(r); await page.mouse.move(cursor.x, cursor.y); await push('move', { hold: 0 }); await loc.first().click({ position: { x: cursor.x - r.x, y: cursor.y - r.y } }); await settle(step.settle ?? 500); await push(kind, { rect: r, zoom: step.zoom, hold: step.hold ?? 0.9 }) }
const typeText = async (text, step) => { const chunk = step.fast ? 4 : 1; for (let i = 0; i < text.length; i += chunk) { await page.keyboard.type(text.slice(i, i + chunk), { delay: 0 }); await page.waitForTimeout(30); await push('type', { hold: step.fast ? 0.03 : 0.055 }) } if (step.hold && events.length) events[events.length - 1].hold += step.hold }
const dlg = () => page.locator('[role=dialog],[role=alertdialog]')
const confirm = async (step) => { const d = dlg().last(); await d.waitFor({ state: 'visible', timeout: 6000 }); await page.waitForTimeout(300); await push('dialog', { hold: 0.9, zoom: step.zoom ?? 1.0 }); const b = d.getByRole('button').filter({ hasNotText: /Cancelar|Voltar|Fechar|Close|Cancel|Back/i }).last(); await clickLoc(b, { hold: step.hold ?? 1.4, settle: 1400 }, 'confirm') }
const sheetSubmit = async (step) => { const re = new RegExp(step.name, 'i'); const d = dlg().filter({ has: page.getByRole('button', { name: re }) }).last(); await clickLoc(d.getByRole('button', { name: re }).last(), { hold: step.hold ?? 1.4, settle: 1400 }, 'confirm'); const d2 = dlg(); if (await d2.count()) { const ok = d2.last().getByRole('button').filter({ hasNotText: /Cancelar|Voltar|Fechar|Close|Cancel|Back/i }).last(); if (await ok.count()) await clickLoc(ok, { hold: step.hold ?? 1.4, settle: 1400 }, 'confirm') } }
const selectOpt = async (step) => { const loc = step._combo ?? locate(step.target); await clickLoc(loc, { hold: step.fast ? 0.3 : 0.55, zoom: step.zoom, settle: 300 }, 'open'); const o = page.getByRole('option', { name: new RegExp(step.option, 'i') }).first(); await clickLoc(o, { hold: step.hold ?? 0.7, zoom: step.zoom, settle: 300 }) }
const zoomTo = async (step) => { if (step.reset) { if (events.length) events.push({ scene: curScene, kind: 'zoom', img: events[events.length - 1].img, cursor: { ...cursor }, zoom: 1.0, hold: (step.hold ?? 1.0) / SPEED }); return } const r = await rectOf(locate(step.target)); await push('zoom', { rect: r, zoom: step.scale ?? 1.4, hold: step.hold ?? 1.5 }) }
const scrollTo = async (step) => {
  if (step.top) { await page.evaluate(() => window.scrollTo({ top: 0 })); await page.waitForTimeout(250); await push('scroll', { hold: step.hold ?? 0.6, zoom: 1.0 }); return }
  const loc = locate(step.target).first(); await loc.waitFor({ state: 'attached' })
  const y0 = await page.evaluate(() => window.scrollY)
  const target = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); return window.scrollY + r.top - 140 })
  const N = 6; for (let i = 1; i <= N; i++) { const y = y0 + (target - y0) * (0.5 - 0.5 * Math.cos(Math.PI * i / N)); await page.evaluate((y) => window.scrollTo({ top: y }), y); await page.waitForTimeout(80); await push('scrollstep', { hold: 0.045 }) }
  await page.waitForTimeout(200); const r = await rectOf(loc); await push('zoom', { rect: r, zoom: step.zoom ?? 1.2, hold: step.hold ?? 1.6 })
}
const pickDate = async (step) => { await clickLoc(locate(step.target), { hold: 0.6, zoom: step.zoom ?? 1.3, settle: 400 }, 'open'); for (let k = 0; k < (step.month_next ?? 0); k++) await clickLoc(page.getByRole('button', { name: /next|próximo|proximo/i }).last(), { hold: 0.4, zoom: step.zoom ?? 1.3, settle: 250 }); const re = new RegExp('^' + (step.day ?? '20') + '$'); let day = page.locator('[role=gridcell] button').filter({ hasText: re }).first(); if (!(await day.count())) day = page.locator('[role=gridcell]').filter({ hasText: re }).first(); if (!(await day.count())) day = page.getByRole('button', { name: re }).first(); if (await day.count()) { await clickLoc(day, { hold: step.hold ?? 0.6, zoom: step.zoom ?? 1.3, settle: 400 }); await page.keyboard.press('Escape'); await page.waitForTimeout(300); await push('click', { hold: 0.3, zoom: step.zoom ?? 1.3 }) } else { await page.keyboard.press('Escape'); await push('click', { hold: 0.4 }) } }

for (const u of SB.warmup ?? []) { await page.goto(`${B}${u}`).catch(() => {}); await settle(500) }
for (const sc of SB.scenes) {
  if (sc.kind === 'card') continue
  if (ONLY && !ONLY.includes(sc.id) && sc.capture !== false) continue
  curScene = sc.id; capturing = sc.capture !== false; console.log(`== ${sc.id}${capturing ? '' : ' (not captured)'}`)
  for (const [i, step] of (sc.steps ?? []).entries()) {
    try {
      switch (step.s) {
        case 'goto': await page.goto(`${B}${step.url}`); await settle(1200); await push('nav', { hold: step.hold ?? 1.2, zoom: step.zoom ?? 1.0 }); break
        case 'click': await clickLoc(locate(step.target), step); break
        case 'fill': await locate(step.target).first().fill(step.text); await page.waitForTimeout(100); break
        case 'press': await page.keyboard.press(step.key); await settle(step.settle ?? 400); if (step.snap) await push('nav', { hold: step.hold ?? 0.8, zoom: step.zoom ?? null }); break
        case 'type': if (step.clear) { await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace') } await typeText(step.text, step); break
        case 'select': await selectOpt(step); break
        case 'check': { const loc = page.getByRole('checkbox', { name: new RegExp('^' + esc(step.target.label), 'i') }).or(page.getByLabel(step.target.label, { exact: true })).first(); const r = await rectOf(loc); cursor = { x: r.cx, y: r.cy }; await page.mouse.move(cursor.x, cursor.y); await push('move', { hold: 0 }); await loc.check({ force: true }); await page.waitForTimeout(200); await push('click', { rect: r, zoom: step.zoom, hold: step.hold ?? 0.6 }); break }
        case 'confirm': await confirm(step); break
        case 'sheet_submit': await sheetSubmit(step); break
        case 'zoom': await zoomTo(step); break
        case 'scroll': await scrollTo(step); break
        case 'date': await pickDate(step); break
        case 'snap': await settle(600); await push('nav', { hold: step.hold ?? 1.2, zoom: step.zoom ?? 1.0 }); break
        case 'wait': await page.waitForTimeout(step.ms); break
        default: throw new Error(`unknown step: ${step.s}`)
      }
      console.log(`  ok ${i} ${step.s} ${step.target?.name ?? step.target?.text ?? step.target?.label ?? step.url ?? step.text ?? ''}`)
    } catch (e) {
      console.error(`  ERR ${i} ${step.s} ${JSON.stringify(step.target ?? step.url ?? '')}: ${e.message.split('\n')[0]}`)
      if (capturing) await push('error', { hold: 0.5, error: e.message.split('\n')[0], step })
    }
  }
}
writeFileSync(`${P}/events.json`, JSON.stringify({ viewport: VP, events }, null, 1))
console.log('frames', fi, 'events', events.length, 'errors', events.filter((e) => e.kind === 'error').length)
await browser.close()
