// Tiny sample product for testing the launch-film recorder: "relay.", a sales agent. Plain JS, hash router, one
// scroll container (#main). All companies and people are fictional.
// Journey: give a mission in one sentence -> agent works -> ranked accounts, each with a public signal and the person
// who decides -> edit one draft -> approve the ready ones -> confirm -> the send queue.
const state = {
  prompt: 'Find fintechs hiring a Head of Sales this month, with the person who decides.',
  queued: false,
  accounts: [
    { id: 'a1', company: 'Tidewater Credit', city: 'Sao Paulo', why: 'Sales team doubled since June.', signal: 'Head of Sales job post, 6 days ago.', person: 'Rafael Moura, CEO', ready: true, send: 'Tue 09:40', msg: 'Hi Rafael, saw the Head of Sales opening. Want the first 50 accounts mapped before they start?' },
    { id: 'a2', company: 'Harbor Ledger', city: 'Curitiba', why: 'Launched a card product in October.', signal: 'Hiring a Head of Sales and 2 AEs.', person: 'Nina Castro, COO', ready: true, send: 'Tue 10:15', msg: 'Hi Nina, congrats on the card launch. Who will own outbound until the new Head of Sales joins?' },
    { id: 'a3', company: 'Fernpay', city: 'Belo Horizonte', why: 'Closed a Series A last month.', signal: 'Head of Sales role open after the round.', person: 'Lena Ortiz, CEO', ready: true, send: 'Tue 11:00', msg: 'Hi Lena, congrats on the Series A. Worth 15 minutes on pipeline before the new hire starts?' },
    { id: 'a4', company: 'Pinecrest Pay', city: 'Recife', why: 'Opened a second office.', signal: 'Sales lead role reposted.', person: 'to confirm', ready: false, send: '', msg: '' },
    { id: 'a5', company: 'Quillmark Bank', city: 'Porto Alegre', why: 'New SMB credit line.', signal: 'Hiring sales managers.', person: 'to confirm', ready: false, send: '', msg: '' },
  ],
};
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function home() {
  view.innerHTML = `
    <h1>New mission</h1>
    <p class="sub">Say the mission in one sentence.</p>
    <div class="composer">
      <textarea id="prompt" placeholder="Give relay a mission..."></textarea>
      <div class="hint">Enter to send</div>
    </div>
    <div id="work"></div>`;
  const ta = $('#prompt');
  ta.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    const text = ta.value.trim(); if (!text) return;
    state.prompt = text;
    const work = $('#work');
    work.innerHTML = `<div class="bubble" style="margin-top:22px">${esc(text)}</div><ul class="steps"></ul>`;
    const ul = $('.steps', work);
    ['Searching fintechs', 'Reading hiring signals', 'Finding who decides'].forEach((s, i) => {
      setTimeout(() => { const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); }, 300 + i * 600);
    });
  });
}

function card(a, i) {
  return `
    <section class="block" data-id="${a.id}">
      <header><h3><span class="rank">#${i + 1}</span> ${esc(a.company)}</h3><span class="tag ${a.ready ? 'ready' : ''}">${a.ready ? 'ready' : 'needs research'}</span></header>
      <div class="row"><b>signal</b><span>${esc(a.signal)}</span><b>who decides</b><span>${esc(a.person)}</span><b>why now</b><span>${esc(a.why)}</span><b>city</b><span>${esc(a.city)}</span></div>
      ${a.ready ? `<div class="msg"><span class="text">${esc(a.msg)}</span></div><div class="actions"><button data-act="edit">Edit</button></div>` : ''}
    </section>`;
}

function mission() {
  const ready = state.accounts.filter((a) => a.ready);
  view.innerHTML = `
    <div class="bubble">${esc(state.prompt)}</div>
    <ul class="steps"><li class="done">Searched fintechs</li><li class="done">Read hiring signals</li><li class="done">Found who decides</li></ul>
    <section class="block intro"><header><h3>5 accounts, ranked. 3 drafts ready</h3></header><p class="note">Each one with its public signal, the person who decides and why now.</p></section>
    ${state.accounts.map((a, i) => card(a, i)).join('')}
    ${state.queued ? done() : `<div class="actions"><button class="go" data-act="approve">Approve the ${ready.length} ready</button></div>`}
    <div id="tail"></div>`;
}

function done() {
  return `<section class="block result"><header><h3>3 of 3 approved</h3><span class="tag ready">queued</span></header><p>Three messages in the send queue, each in its own window.</p><a href="#/queue">Open Sends</a></section>`;
}

function queue() {
  const rows = state.queued ? state.accounts.filter((a) => a.ready) : [];
  view.innerHTML = `
    <h1>Sends</h1>
    <p class="sub">${rows.length} messages queued. relay sends each one in its window.</p>
    <table><thead><tr><th>#</th><th>Who decides</th><th>Company</th><th>Message</th><th>Sends</th><th>State</th></tr></thead><tbody>
    ${rows.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.person)}</td><td>${esc(a.company)}</td><td>${esc(a.msg)}</td><td class="when">${esc(a.send)}</td><td><span class="tag ready">Queued</span></td></tr>`).join('') || '<tr><td colspan="6">Nothing queued yet.</td></tr>'}
    </tbody></table>`;
}

view.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const sec = b.closest('section.block'); const a = sec && state.accounts.find((x) => x.id === sec.dataset.id);
  if (b.dataset.act === 'edit' && a) {
    $('.msg', sec).innerHTML = `<textarea name="text">${esc(a.msg)}</textarea>`;
    $('.actions', sec).innerHTML = '<button class="go" data-act="save">Save</button>';
  } else if (b.dataset.act === 'save' && a) {
    a.msg = $('textarea', sec).value;
    $('.msg', sec).innerHTML = `<span class="text">${esc(a.msg)}</span>`;
    $('.actions', sec).innerHTML = '<button data-act="edit">Edit</button>';
  } else if (b.dataset.act === 'approve') {
    const ready = state.accounts.filter((x) => x.ready);
    $('#tail').innerHTML = `
      <section class="block panel"><header><h3>Approve ${ready.length} messages?</h3></header>
        <ol>${ready.map((x) => `<li>${esc(x.person)}, ${esc(x.company)}</li>`).join('')}</ol>
        <p class="note">Nothing is sent yet. Approved messages go to the send queue.</p>
        <div class="actions"><button class="fire" data-act="confirm">Confirm and queue (${ready.length})</button><button data-act="cancel">Cancel</button></div>
      </section>`;
    b.parentElement.remove();
  } else if (b.dataset.act === 'cancel') {
    mission();
  } else if (b.dataset.act === 'confirm') {
    state.queued = true;
    $('#tail').innerHTML = done();
  }
});

function route() {
  const h = location.hash || '#/';
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === h));
  if (h.startsWith('#/mission')) mission(); else if (h === '#/queue') queue(); else home();
  $('#main').scrollTop = 0;
}
window.addEventListener('hashchange', route);
route();
