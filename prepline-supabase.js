/* Prepline x Supabase: authentication + saving results to the cloud.
   Included on every page AFTER supabase-js (CDN). */
(function () {
  if (typeof supabase === 'undefined') { console.error('[Prepline] supabase-js failed to load'); return; }

  const supa = supabase.createClient(
    'https://spwavetenjuvvohlnsvx.supabase.co',
    'sb_publishable_8mO7x7XYroNYlL4n_yzoRw_FIK0z5MY'
  );
  window.preplineSupa = supa;

  /* ---------- saving a result (called by the quiz) ---------- */
  window.preplineSaveResult = async function (mockId, score, total) {
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user) { toast('Saved on this device. Sign in to keep your results in the cloud.'); return; }
      const { error } = await supa.from('results').insert({
        user_id: user.id, mock_id: mockId, score: score, total: total
      });
      if (error) { console.error('[Prepline] insert:', error.message); toast('Could not save: ' + error.message); }
      else toast('Result ' + score + '/' + total + ' saved to the cloud');
    } catch (e) { console.error('[Prepline]', e); }
  };


  /* ---------- per-question saving: one compact row per test (stage5.sql), else the old answer_log ---------- */
  window.preplineSaveAnswers = async function (mockId, qs, answers) {
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user || !qs || !qs.length) return;
      const mark = q => {
        const given = answers ? answers[q.id] : undefined;
        const answered = given !== undefined && given !== null && given !== '';
        return !answered ? 's' : given === q.correct ? 'c' : 'w';
      };
      const ids = qs.map(q => q.id);
      if (ids.every(id => Number.isInteger(id) && id > 0 && id < 32768)) {
        const { error } = await supa.from('answer_attempts').insert({
          mock_id: mockId, q_ids: ids, marks: qs.map(mark).join('')
        });
        if (!error) {
          // topics are stored once per question; register them the first time this device saves this test
          const key = 'prepline:topics-sent:' + mockId;
          const tagged = qs.filter(q => q.topic).map(q => ({ mock_id: mockId, q_id: q.id, topic: q.topic }));
          if (tagged.length && !localStorage.getItem(key)) {
            const t = await supa.from('question_topics').upsert(tagged, { onConflict: 'mock_id,q_id', ignoreDuplicates: true });
            if (!t.error) try { localStorage.setItem(key, '1'); } catch (e) {}
          }
          return;
        }
        if (!/answer_attempts|schema cache|does not exist/i.test(error.message)) {
          console.error('[Prepline] answer_attempts:', error.message); return;
        }
      }
      // fallback: before stage5.sql is run
      const rows = qs.map(q => ({
        user_id: user.id, mock_id: mockId, q_id: q.id, topic: q.topic || null,
        correct: mark(q) === 'c', answered: mark(q) !== 's'
      }));
      const { error } = await supa.from('answer_log').insert(rows);
      if (error) console.error('[Prepline] answer_log:', error.message);
    } catch (e) { console.error('[Prepline]', e); }
  };

  /* ---------- topic statistics of the signed-in student ---------- */
  window.preplineTopicStats = async function () {
    const r = await supa.rpc('my_topic_stats');
    if (!r.error) return r.data || [];
    // before stage5.sql: aggregate the old per-question log in the browser
    const { data } = await supa.from('answer_log').select('topic,correct').not('topic', 'is', null).limit(20000);
    const map = {};
    (data || []).forEach(x => {
      const m = map[x.topic] = map[x.topic] || { topic: x.topic, total: 0, correct: 0 };
      m.total++; if (x.correct) m.correct++;
    });
    return Object.values(map);
  };

  /* ---------- widget styles ---------- */
  const css = document.createElement('style');
  css.textContent = `
    .pl-auth { position: fixed; top: 14px; right: 14px; z-index: 400; font-family: 'Inter', sans-serif; }
    .pl-pill {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: #E6ECF7; cursor: pointer;
      background: #111A2E; border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 8px 16px; border-radius: 999px; user-select: none;
      transition: border-color .25s, background .25s;
    }
    .pl-pill:hover { border-color: rgba(201,162,39,0.6); background: rgba(201,162,39,0.12); }
    .pl-pill .pl-dot { width: 8px; height: 8px; border-radius: 50%; background: #64748B; }
    .pl-pill.on .pl-dot { background: #34D399; box-shadow: 0 0 8px rgba(52,211,153,0.8); }
    .pl-modal-bg {
      position: fixed; inset: 0; z-index: 500; display: none;
      align-items: center; justify-content: center;
      background: rgba(5,8,20,0.6); backdrop-filter: blur(4px);
    }
    .pl-modal-bg.open { display: flex; }
    .pl-modal {
      width: min(360px, calc(100vw - 32px));
      background: #111A2E; border: 1px solid rgba(255,255,255,0.14);
      border-radius: 10px; padding: 26px;
      box-shadow: 0 20px 60px -20px rgba(0,0,0,0.8);
      color: #C9D2F0;
    }
    .pl-modal h3 {
      font-family: 'Sora', sans-serif; color: #E6ECF7; font-size: 19px; margin: 0 0 16px;
    }
    .pl-modal input {
      width: 100%; box-sizing: border-box; margin-bottom: 10px;
      font: 500 14px 'Inter', sans-serif; color: #E6ECF7;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
      border-radius: 6px; padding: 11px 14px; outline: none;
      transition: border-color .2s;
    }
    .pl-modal input:focus { border-color: #C9A227; }
    .pl-row { display: flex; gap: 10px; margin-top: 6px; }
    .pl-btn {
      flex: 1; font: 600 14px 'Inter', sans-serif; color: #fff; cursor: pointer;
      border: none; border-radius: 6px; padding: 11px 0;
      background: #C9A227; color: #0E1A2E;
      transition: background .15s;
    }
    .pl-btn:hover { background: #E0BC45; }
    .pl-btn.ghost { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16); }
    .pl-forgot { background: none; border: 0; padding: 0; margin-top: 12px; cursor: pointer;
      font: 500 12.5px 'Inter', sans-serif; color: #8492AC; text-decoration: underline; }
    .pl-forgot:hover { color: #E6ECF7; }
    .pl-msg { font-size: 12.5px; min-height: 18px; margin-top: 10px; color: #FCA5A5; }
    .pl-msg.ok { color: #A7F3D0; }
    .pl-close {
      float: right; cursor: pointer; color: #C9D2F0; font-size: 18px; line-height: 1;
      background: none; border: none; padding: 0; margin: -4px -4px 0 0;
    }
    .pl-toast {
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(16px);
      z-index: 600; opacity: 0; pointer-events: none;
      font: 600 13.5px 'Inter', sans-serif; color: #E6ECF7; white-space: nowrap;
      background: #111A2E; border: 1px solid rgba(201,162,39,0.5);
      border-radius: 999px; padding: 10px 20px;
      box-shadow: 0 12px 40px -10px rgba(0,0,0,0.5);
      transition: opacity .3s, transform .3s;
      max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis;
    }
    .pl-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    @media (max-width: 780px) { .pl-auth { top: 10px; right: 10px; } }
  `;
  document.head.appendChild(css);

  /* ---------- markup ---------- */
  const root = document.createElement('div');
  root.className = 'pl-auth';
  root.innerHTML = '<div class="pl-pill" id="plPill"><span class="pl-dot"></span><span id="plPillText">Sign in</span></div>';
  document.body.appendChild(root);

  const modalBg = document.createElement('div');
  modalBg.className = 'pl-modal-bg';
  modalBg.innerHTML = `
    <div class="pl-modal">
      <button class="pl-close" id="plClose">&#10005;</button>
      <h3 id="plTitle">Sign in to Prepline</h3>
      <div id="plForm">
        <input type="email" id="plEmail" placeholder="Email" autocomplete="email">
        <input type="password" id="plPass" placeholder="Password (at least 6 characters)" autocomplete="current-password">
        <div class="pl-row">
          <button class="pl-btn" id="plSignIn">Sign in</button>
          <button class="pl-btn ghost" id="plSignUp">Create account</button>
        </div>
        <button type="button" class="pl-forgot" id="plForgot">Forgot password?</button>
      </div>
      <div id="plLogged" style="display:none;">
        <div class="pl-row"><button class="pl-btn ghost" id="plSignOut">Sign out</button></div>
      </div>
      <div class="pl-msg" id="plMsg"></div>
    </div>`;
  document.body.appendChild(modalBg);

  const toastEl = document.createElement('div');
  toastEl.className = 'pl-toast';
  document.body.appendChild(toastEl);
  let toastT = null;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 3500);
  }
  window.preplineToast = toast;

  const $ = id => document.getElementById(id);
  const pill = $('plPill'), pillText = $('plPillText'), msg = $('plMsg');

  function setMsg(text, ok) { msg.textContent = text || ''; msg.className = 'pl-msg' + (ok ? ' ok' : ''); }

  async function refreshUI() {
    const { data: { user } } = await supa.auth.getUser();
    if (user) {
      pill.classList.add('on');
      pillText.textContent = user.email;
      $('plTitle').textContent = user.email;
      $('plForm').style.display = 'none';
      $('plLogged').style.display = 'block';
    } else {
      pill.classList.remove('on');
      pillText.textContent = 'Sign in';
      $('plTitle').textContent = 'Sign in to Prepline';
      $('plForm').style.display = 'block';
      $('plLogged').style.display = 'none';
    }
  }

  pill.onclick = () => { setMsg(''); modalBg.classList.add('open'); };
  $('plClose').onclick = () => modalBg.classList.remove('open');
  modalBg.onclick = e => { if (e.target === modalBg) modalBg.classList.remove('open'); };

  function readCreds() {
    const email = $('plEmail').value.trim();
    const password = $('plPass').value;
    if (!email || !email.includes('@')) { setMsg('Enter your email'); return null; }
    if (!password || password.length < 6) { setMsg('Password must be at least 6 characters'); return null; }
    return { email, password };
  }

  $('plSignIn').onclick = async () => {
    const creds = readCreds();
    if (!creds) return;
    setMsg('Signing in...', true);
    const { error } = await supa.auth.signInWithPassword(creds);
    if (error) { setMsg(error.message); return; }
    setMsg('');
    modalBg.classList.remove('open');
    toast('Signed in');
  };

  $('plForgot').onclick = async () => {
    const email = $('plEmail').value.trim();
    if (!email || !email.includes('@')) { setMsg('Enter your email above, then press "Forgot password?" again'); return; }
    setMsg('Sending a reset link...', true);
    const base = location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
    const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo: base + 'reset.html' });
    if (error) { setMsg(error.message); return; }
    setMsg('If an account exists for ' + email + ', a reset link is on its way. Check spam too.', true);
  };

  $('plSignUp').onclick = async () => {
    const creds = readCreds();
    if (!creds) return;
    setMsg('Creating your account...', true);
    const { data, error } = await supa.auth.signUp(creds);
    if (error) { setMsg(error.message); return; }
    if (data.session) { setMsg(''); modalBg.classList.remove('open'); toast('Account created — you are signed in'); }
    else setMsg('Account created. Confirm your email using the link we sent, then sign in.', true);
  };

  $('plSignOut').onclick = async () => {
    await supa.auth.signOut();
    modalBg.classList.remove('open');
    toast('Signed out');
  };

  supa.auth.onAuthStateChange(() => { refreshUI(); });
  refreshUI();

  /* ---------- "Report an error" button on every question ---------- */
  if (typeof questions === 'undefined' && typeof QUESTIONS === 'undefined') return;
  const QS = () => (typeof questions !== 'undefined' ? questions : QUESTIONS);
  const mockId = (location.pathname.split('/').pop() || 'mock').replace('.html', '');
  const REASONS = ['Typo in the question', 'Typo in the options', 'Wrong answer key', 'No correct option', 'Image unreadable / cut off', 'Other'];

  const rcss = document.createElement('style');
  rcss.textContent = `
    .pl-rep { display: inline-flex; align-items: center; gap: 6px; margin: 2px 0 14px; padding: 5px 12px;
      font: 500 12.5px 'Inter', sans-serif; color: inherit; opacity: .6; cursor: pointer;
      background: none; border: 1px dashed rgba(255,255,255,0.25); border-radius: 999px; }
    .pl-rep:hover { opacity: 1; border-color: #F87171; color: #FCA5A5; }
    .pl-rep.done { opacity: .5; border-style: solid; cursor: default; color: #34D399; border-color: rgba(52,211,153,.4); }
    .pl-rep-box { background: #0E1430; border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 22px;
      width: min(420px, calc(100vw - 32px)); color: #C9D2F0; font-family: 'Inter', sans-serif; }
    .pl-rep-box h3 { font: 700 17px 'Sora', sans-serif; color: #E6ECF7; margin-bottom: 4px; }
    .pl-rep-box .sub { font-size: 13px; opacity: .65; margin-bottom: 14px; }
    .pl-rep-box label { display: flex; gap: 10px; align-items: center; font-size: 14px; padding: 7px 0; cursor: pointer; }
    .pl-rep-box textarea { width: 100%; min-height: 70px; margin: 10px 0 14px; padding: 10px; border-radius: 10px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); color: #E6ECF7; font: 14px 'Inter', sans-serif; resize: vertical; }
    .pl-rep-box .row { display: flex; gap: 10px; justify-content: flex-end; }
    .pl-rep-box button { font: 600 14px 'Inter', sans-serif; border-radius: 999px; padding: 9px 18px; cursor: pointer; }
    .pl-rep-box .cancel { background: none; color: #C9D2F0; border: 1px solid rgba(255,255,255,0.2); }
    .pl-rep-box .send { border: 0; color: #fff; background: #C9A227; color: #0E1A2E; }
    .pl-rep-bg { position: fixed; inset: 0; z-index: 500; background: rgba(5,8,20,0.7); display: none; align-items: center; justify-content: center; }
    .pl-rep-bg.open { display: flex; }`;
  document.head.appendChild(rcss);

  const sent = new Set();
  try { JSON.parse(localStorage.getItem('prepline:reported') || '[]').forEach(k => sent.add(k)); } catch (e) {}

  const rbg = document.createElement('div');
  rbg.className = 'pl-rep-bg';
  rbg.innerHTML = `<div class="pl-rep-box">
      <h3>Report an error</h3><div class="sub" id="plRepSub"></div>
      ${REASONS.map((r, i) => `<label><input type="radio" name="plRepR" value="${r}" ${i === 0 ? 'checked' : ''}> ${r}</label>`).join('')}
      <textarea id="plRepTxt" maxlength="1000" placeholder="What exactly is wrong? (optional)"></textarea>
      <div class="row"><button class="cancel" id="plRepCancel">Cancel</button><button class="send" id="plRepSend">Send</button></div>
    </div>`;
  document.body.appendChild(rbg);
  let target = null;
  const close = () => rbg.classList.remove('open');
  rbg.onclick = e => { if (e.target === rbg) close(); };
  rbg.querySelector('#plRepCancel').onclick = close;
  rbg.querySelector('#plRepSend').onclick = async () => {
    if (!target) return;
    const reason = rbg.querySelector('input[name=plRepR]:checked').value;
    const comment = rbg.querySelector('#plRepTxt').value.trim() || null;
    const btn = rbg.querySelector('#plRepSend'); btn.disabled = true;
    try {
      const { data: { user } } = await supa.auth.getUser();
      const { error } = await supa.from('question_reports').insert({
        mock_id: mockId, q_id: target.id, image: target.image || null,
        reason: reason, comment: comment, user_id: user ? user.id : null, page_url: location.href
      });
      if (error) { console.error('[Prepline] report:', error.message); toast('Could not send: ' + error.message); }
      else {
        sent.add(mockId + ':' + target.id);
        try { localStorage.setItem('prepline:reported', JSON.stringify([...sent].slice(-500))); } catch (e) {}
        toast('Thanks! The report has been sent.');
        close(); decorate();
      }
    } catch (e) { console.error('[Prepline]', e); }
    btn.disabled = false;
  };

  function openFor(q, num) {
    target = q;
    rbg.querySelector('#plRepSub').textContent = 'Question ' + num + ' · ' + mockId;
    rbg.querySelector('#plRepTxt').value = '';
    rbg.querySelector('input[name=plRepR]').checked = true;
    rbg.classList.add('open');
  }
  function makeBtn(q, num) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pl-rep';
    if (sent.has(mockId + ':' + q.id)) { b.classList.add('done'); b.textContent = '✓ Reported'; }
    else { b.textContent = '⚑ Report an error'; b.onclick = e => { e.stopPropagation(); openFor(q, num); }; }
    return b;
  }
  function decorate() {
    const qs = QS();
    // one-at-a-time view
    const app = document.getElementById('app');
    if (app && typeof state !== 'undefined' && !state.finished) {
      const opts = app.querySelector('.options');
      const q = qs[state.idx];
      if (opts && q) {
        const old = app.querySelector(':scope > .pl-rep, .pl-rep[data-v=one]'); if (old) old.remove();
        const b = makeBtn(q, state.idx + 1); b.dataset.v = 'one';
        opts.parentNode.insertBefore(b, opts);
      }
    }
    // scroll view
    document.querySelectorAll('.pl-scroll .pl-q').forEach(el => {
      const id = el.id.replace('pl-q-', '');
      const i = qs.findIndex(x => String(x.id) === id);
      if (i < 0) return;
      const old = el.querySelector('.pl-rep'); if (old) old.remove();
      const opts = el.querySelector('.pl-opts');
      if (opts) opts.parentNode.insertBefore(makeBtn(qs[i], i + 1), opts);
    });
  }
  let busy = false;
  new MutationObserver(() => {
    if (busy) return; busy = true;
    requestAnimationFrame(() => {
      const need = [...document.querySelectorAll('#app .options, .pl-scroll .pl-opts')].some(o => !o.previousElementSibling || !o.previousElementSibling.classList.contains('pl-rep'));
      if (need) decorate();
      busy = false;
    });
  }).observe(document.body, { childList: true, subtree: true });
  decorate();
})();
