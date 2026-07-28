/* Prepline × Supabase: авторизация + сохранение результатов в облако.
   Подключается на всех страницах ПОСЛЕ supabase-js (CDN). */
(function () {
  if (typeof supabase === 'undefined') { console.error('[Prepline] supabase-js не загружен'); return; }

  const supa = supabase.createClient(
    'https://spwavetenjuvvohlnsvx.supabase.co',
    'sb_publishable_8mO7x7XYroNYlL4n_yzoRw_FIK0z5MY'
  );
  window.preplineSupa = supa;

  /* ---------- сохранение результата (вызывается из квиза) ---------- */
  window.preplineSaveResult = async function (mockId, score, total) {
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user) { toast('Результат сохранён локально. Войди, чтобы сохранять в облако.'); return; }
      const { error } = await supa.from('results').insert({
        user_id: user.id, mock_id: mockId, score: score, total: total
      });
      if (error) { console.error('[Prepline] insert:', error.message); toast('Ошибка сохранения: ' + error.message); }
      else toast('☁ Результат ' + score + '/' + total + ' сохранён в облако');
    } catch (e) { console.error('[Prepline]', e); }
  };


  /* ---------- подробное сохранение: каждый вопрос отдельно ---------- */
  window.preplineSaveAnswers = async function (mockId, qs, answers) {
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user || !qs || !qs.length) return;
      const rows = qs.map(function (q) {
        const given = answers ? answers[q.id] : undefined;
        return {
          user_id: user.id,
          mock_id: mockId,
          q_id: q.id,
          topic: q.topic || null,
          correct: given === q.correct,
          answered: given !== undefined && given !== null && given !== ''
        };
      });
      const { error } = await supa.from('answer_log').insert(rows);
      if (error) console.error('[Prepline] answer_log:', error.message);
    } catch (e) { console.error('[Prepline]', e); }
  };

  /* ---------- стили виджета ---------- */
  const css = document.createElement('style');
  css.textContent = `
    .pl-auth { position: fixed; top: 14px; right: 14px; z-index: 400; font-family: 'Inter', sans-serif; }
    .pl-pill {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: #F2F5FF; cursor: pointer;
      background: rgba(14,20,48,0.72); border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 8px 16px; border-radius: 999px; user-select: none;
      transition: border-color .25s, background .25s;
    }
    .pl-pill:hover { border-color: rgba(167,139,250,0.6); background: rgba(167,139,250,0.14); }
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
      background: rgba(14,20,48,0.92); border: 1px solid rgba(255,255,255,0.14);
      border-radius: 18px; padding: 26px;
      box-shadow: 0 20px 60px -20px rgba(0,0,0,0.8);
      color: #C9D2F0;
    }
    .pl-modal h3 {
      font-family: 'Sora', sans-serif; color: #F2F5FF; font-size: 19px; margin: 0 0 16px;
    }
    .pl-modal input {
      width: 100%; box-sizing: border-box; margin-bottom: 10px;
      font: 500 14px 'Inter', sans-serif; color: #F2F5FF;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
      border-radius: 10px; padding: 11px 14px; outline: none;
      transition: border-color .2s;
    }
    .pl-modal input:focus { border-color: rgba(96,165,250,0.7); }
    .pl-row { display: flex; gap: 10px; margin-top: 6px; }
    .pl-btn {
      flex: 1; font: 600 14px 'Inter', sans-serif; color: #fff; cursor: pointer;
      border: none; border-radius: 999px; padding: 11px 0;
      background: linear-gradient(90deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%);
      background-size: 200% 100%; background-position: 0% 50%;
      transition: background-position .4s;
    }
    .pl-btn:hover { background-position: 100% 50%; }
    .pl-btn.ghost { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16); }
    .pl-msg { font-size: 12.5px; min-height: 18px; margin-top: 10px; color: #FCA5A5; }
    .pl-msg.ok { color: #A7F3D0; }
    .pl-close {
      float: right; cursor: pointer; color: #C9D2F0; font-size: 18px; line-height: 1;
      background: none; border: none; padding: 0; margin: -4px -4px 0 0;
    }
    .pl-toast {
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(16px);
      z-index: 600; opacity: 0; pointer-events: none;
      font: 600 13.5px 'Inter', sans-serif; color: #F2F5FF; white-space: nowrap;
      background: rgba(14,20,48,0.92); border: 1px solid rgba(167,139,250,0.5);
      border-radius: 999px; padding: 10px 20px;
      box-shadow: 0 12px 40px -10px rgba(167,139,250,0.45);
      transition: opacity .3s, transform .3s;
      max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis;
    }
    .pl-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    @media (max-width: 780px) { .pl-auth { top: 10px; right: 10px; } }
  `;
  document.head.appendChild(css);

  /* ---------- разметка ---------- */
  const root = document.createElement('div');
  root.className = 'pl-auth';
  root.innerHTML = '<div class="pl-pill" id="plPill"><span class="pl-dot"></span><span id="plPillText">Войти</span></div>';
  document.body.appendChild(root);

  const modalBg = document.createElement('div');
  modalBg.className = 'pl-modal-bg';
  modalBg.innerHTML = `
    <div class="pl-modal">
      <button class="pl-close" id="plClose">&#10005;</button>
      <h3 id="plTitle">Вход в Prepline</h3>
      <div id="plForm">
        <input type="email" id="plEmail" placeholder="Email" autocomplete="email">
        <input type="password" id="plPass" placeholder="Пароль (мин. 6 символов)" autocomplete="current-password">
        <div class="pl-row">
          <button class="pl-btn" id="plSignIn">Войти</button>
          <button class="pl-btn ghost" id="plSignUp">Регистрация</button>
        </div>
      </div>
      <div id="plLogged" style="display:none;">
        <div class="pl-row"><button class="pl-btn ghost" id="plSignOut">Выйти</button></div>
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
      pillText.textContent = 'Войти';
      $('plTitle').textContent = 'Вход в Prepline';
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
    if (!email || !email.includes('@')) { setMsg('Введи email'); return null; }
    if (!password || password.length < 6) { setMsg('Пароль минимум 6 символов'); return null; }
    return { email, password };
  }

  $('plSignIn').onclick = async () => {
    const creds = readCreds();
    if (!creds) return;
    setMsg('Входим...', true);
    const { error } = await supa.auth.signInWithPassword(creds);
    if (error) { setMsg(error.message); return; }
    setMsg('');
    modalBg.classList.remove('open');
    toast('Вход выполнен');
  };

  $('plSignUp').onclick = async () => {
    const creds = readCreds();
    if (!creds) return;
    setMsg('Создаём аккаунт...', true);
    const { data, error } = await supa.auth.signUp(creds);
    if (error) { setMsg(error.message); return; }
    if (data.session) { setMsg(''); modalBg.classList.remove('open'); toast('Аккаунт создан, ты в системе'); }
    else setMsg('Аккаунт создан. Подтверди email по ссылке из письма, затем войди.', true);
  };

  $('plSignOut').onclick = async () => {
    await supa.auth.signOut();
    modalBg.classList.remove('open');
    toast('Ты вышел из аккаунта');
  };

  supa.auth.onAuthStateChange(() => { refreshUI(); });
  refreshUI();
})();
