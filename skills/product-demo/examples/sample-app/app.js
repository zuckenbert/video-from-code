// Tiny task app used to test the product-demo skill. No build, no server logic: state lives in localStorage.
const SEED = [
  { id: 1, title: 'Write the release notes', priority: 'Medium', urgent: false, due: 'Nov 14', status: 'Open', owner: 'Sam Chen' },
  { id: 2, title: 'Fix the login redirect loop', priority: 'High', urgent: true, due: 'Nov 6', status: 'Open', owner: 'Priya Nair' },
  { id: 3, title: 'Update the pricing page copy', priority: 'Low', urgent: false, due: 'Nov 21', status: 'Open', owner: 'Jordan Lee' },
  { id: 4, title: 'Review the Q4 roadmap', priority: 'Medium', urgent: false, due: 'Nov 3', status: 'Done', owner: 'Alex Rivera' },
  { id: 5, title: 'Rotate the staging API keys', priority: 'High', urgent: false, due: 'Nov 10', status: 'Open', owner: 'Sam Chen' },
];
const store = {
  get tasks() { try { return JSON.parse(localStorage.getItem('tasks')) ?? SEED } catch { return SEED } },
  set tasks(v) { localStorage.setItem('tasks', JSON.stringify(v)) },
  get user() { return localStorage.getItem('user') },
  set user(v) { localStorage.setItem('user', v) },
};
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const requireUser = () => { if (!store.user) location.href = 'login.html' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function sidebar(active) {
  return `<nav class="side">
    <div class="logo"><i></i>Taskboard</div>
    <a href="index.html" class="${active === 'tasks' ? 'on' : ''}">My tasks</a>
    <a href="index.html">Team</a><a href="index.html">Calendar</a><a href="index.html">Reports</a>
    <div class="foot">Signed in as<br>${esc(store.user ?? '')}</div>
  </nav>`;
}

function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 4000) }

// Modal helper: builds the dialog on open and removes it from the DOM on close.
function openDialog(html, { role = 'dialog', label } = {}) {
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  scrim.innerHTML = `<div class="dialog" role="${role}" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
  document.body.appendChild(scrim);
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey) };
  const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.cal')) close() };
  document.addEventListener('keydown', onKey);
  return { el: $('.dialog', scrim), close };
}

// Date popover: a role=dialog above the task dialog. Picking a day keeps it open; Escape closes only the popover.
function openCalendar(anchor, onPick) {
  const now = new Date(); let y = now.getFullYear(), m = now.getMonth(); let picked = null;
  const cal = document.createElement('div'); cal.className = 'cal'; cal.setAttribute('role', 'dialog'); cal.setAttribute('aria-label', 'Choose a date');
  const r = anchor.getBoundingClientRect(); cal.style.left = `${r.left}px`; cal.style.top = `${r.bottom + 6}px`;
  const draw = () => {
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    let cells = ''; for (let i = 0; i < first; i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) cells += `<div role="gridcell"><button type="button" class="${picked === d ? 'sel' : ''}">${d}</button></div>`;
    cal.innerHTML = `<header><button type="button" aria-label="Previous month">&lsaquo;</button><span>${MONTHS[m]} ${y}</span><button type="button" aria-label="Next month">&rsaquo;</button></header>
      <div class="grid" role="grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="dow">${d}</div>`).join('')}${cells}</div>`;
  };
  cal.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    if (b.getAttribute('aria-label') === 'Next month') { m++; if (m > 11) { m = 0; y++ } picked = null; draw(); return }
    if (b.getAttribute('aria-label') === 'Previous month') { m--; if (m < 0) { m = 11; y-- } picked = null; draw(); return }
    picked = Number(b.textContent); onPick(`${MONTHS[m].slice(0, 3)} ${picked}`); draw();
  });
  const onKey = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); cal.remove(); document.removeEventListener('keydown', onKey, true) } };
  document.addEventListener('keydown', onKey, true);
  draw(); document.body.appendChild(cal);
}

function newTaskDialog(onCreate) {
  const d = openDialog(`
    <h2>New task</h2><p class="hint">Give it a title, a priority and a due date.</p>
    <div class="field"><label for="t-title">Title</label><input id="t-title" type="text" autocomplete="off"></div>
    <div class="row">
      <div class="field"><span class="lbl" id="l-prio">Priority</span>
        <button type="button" class="combo placeholder" role="combobox" aria-expanded="false" aria-labelledby="l-prio" id="t-prio">Select priority</button></div>
      <div class="field"><span class="lbl">Due</span>
        <button type="button" class="combo placeholder" aria-label="Due date" id="t-due">Pick a date</button></div>
    </div>
    <label class="check"><input type="checkbox" id="t-urgent"> Urgent</label>
    <div class="actions"><button type="button" class="btn" data-x="cancel">Cancel</button><button type="button" class="btn solid" data-x="create">Create task</button></div>`, { label: 'New task' });
  const val = { priority: 'Medium', due: '' };
  const prio = $('#t-prio', d.el), due = $('#t-due', d.el);
  prio.addEventListener('click', () => {
    const old = $('.listbox'); if (old) { old.remove(); prio.setAttribute('aria-expanded', 'false'); return }
    const lb = document.createElement('div'); lb.className = 'listbox'; lb.setAttribute('role', 'listbox');
    lb.innerHTML = ['Low', 'Medium', 'High'].map((p) => `<div role="option" aria-selected="false">${p}</div>`).join('');
    const r = prio.getBoundingClientRect(); lb.style.left = `${r.left}px`; lb.style.top = `${r.bottom + 4}px`;
    lb.addEventListener('click', (e) => { const o = e.target.closest('[role=option]'); if (!o) return; val.priority = o.textContent; prio.textContent = o.textContent; prio.classList.remove('placeholder'); prio.setAttribute('aria-expanded', 'false'); lb.remove() });
    document.body.appendChild(lb); prio.setAttribute('aria-expanded', 'true');
  });
  due.addEventListener('click', () => openCalendar(due, (label) => { val.due = label; due.textContent = label; due.classList.remove('placeholder') }));
  $('[data-x=cancel]', d.el).addEventListener('click', d.close);
  $('[data-x=create]', d.el).addEventListener('click', () => {
    const title = $('#t-title', d.el).value.trim() || 'Untitled task';
    const tasks = store.tasks; const id = Math.max(...tasks.map((t) => t.id)) + 1;
    const t = { id, title, priority: val.priority, urgent: $('#t-urgent', d.el).checked, due: val.due || 'No date', status: 'Open', owner: 'Alex Rivera', fresh: true };
    store.tasks = [t, ...tasks]; d.close(); onCreate(t);
  });
  setTimeout(() => $('#t-title', d.el).focus(), 0);
}
