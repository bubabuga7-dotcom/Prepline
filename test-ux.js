/* Prepline test UX: question map with flags, compact A–E row for picture questions, keyboard shortcuts.
   Works on top of the existing test engines (globals: questions, state, render). Load last in <body>. */
(function () {
  if (typeof questions === 'undefined' || typeof state === 'undefined' || typeof render !== 'function') return;
  var app = document.getElementById('app');
  if (!app) return;

  var LET = 'ABCDEFGH';
  var page = (location.pathname.split('/').pop() || 'test').replace('.html', '');
  var FKEY = 'prepline-flags:' + page;
  var flags = {};
  try { (JSON.parse(sessionStorage.getItem(FKEY) || '[]')).forEach(function (id) { flags[id] = 1; }); } catch (e) {}
  function saveFlags() { try { sessionStorage.setItem(FKEY, JSON.stringify(Object.keys(flags))); } catch (e) {} }

  var host = document.getElementById('pl-scroll-host');
  function scrollMode() { return host && host.style.display !== 'none'; }
  var mobile = window.matchMedia('(max-width: 640px)').matches;

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.qmap{background:#111A2E;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 12px 12px;margin:0 0 18px}',
    '.qmap-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:#8492AC}',
    '.qmap-head b{color:#E6ECF7;font-weight:600}',
    '.qmap-toggle{background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:0;display:flex;gap:6px;align-items:center}',
    '.qmap-toggle i{font-style:normal;transition:transform .15s;display:inline-block}',
    '.qmap.closed .qmap-toggle i{transform:rotate(-90deg)}',
    '.qmap-keys{margin-left:auto;font-family:"IBM Plex Mono",monospace;font-size:11px;opacity:.75}',
    '.qmap-flag{margin-left:auto;background:transparent;border:1px solid rgba(255,255,255,.16);color:#B4C0D6;border-radius:5px;',
    '  font:600 12px Inter,sans-serif;padding:5px 10px;cursor:pointer}',
    '.qmap-keys+.qmap-flag{margin-left:0}',
    '.qmap-flag:hover{border-color:#C9A227;color:#C9A227}',
    '.qmap-flag.on{background:rgba(201,162,39,.16);border-color:#C9A227;color:#C9A227}',
    '.qmap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(32px,1fr));gap:5px;margin-top:10px}',
    '.qmap.closed .qmap-grid{display:none}',
    '.qm{position:relative;height:30px;border-radius:5px;border:1px solid rgba(255,255,255,.12);background:transparent;',
    '  color:#8492AC;font:600 12px "IBM Plex Mono",monospace;cursor:pointer;padding:0}',
    '.qm:hover{border-color:#84AEEC;color:#E6ECF7}',
    '.qm.ans{background:#1B3358;border-color:#2A4A78;color:#E6ECF7}',
    '.qm.cur{border-color:#C9A227;color:#C9A227;box-shadow:0 0 0 1px #C9A227 inset}',
    '.qm.flag::after{content:"";position:absolute;top:3px;right:3px;width:6px;height:6px;border-radius:50%;background:#C9A227}',
    '.qm.nokey{opacity:.45}',
    '.qmap-legend{display:flex;gap:14px;font-size:11px;color:#8492AC;margin-top:9px;flex-wrap:wrap}',
    '.qmap-legend span::before{content:"";display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px;border:1px solid rgba(255,255,255,.2)}',
    '.qmap-legend .l-ans::before{background:#1B3358;border-color:#2A4A78}',
    '.qmap-legend .l-flag::before{background:#C9A227;border-radius:50%;border:0}',
    '.qmap-legend .l-cur::before{border-color:#C9A227}',
    /* compact answer row for picture questions */
    'html body .options.compact,html body .pl-opts.compact{display:grid;grid-template-columns:repeat(auto-fit,minmax(52px,1fr));gap:8px}',
    'html body .options.compact .opt,html body .pl-opts.compact .pl-opt{text-align:center;padding:12px 0;font:700 16px "IBM Plex Mono",monospace;letter-spacing:.02em}',
    'html body .options.compact .opt .k{display:none}',
    /* key hint letters on text options */
    'html body .opt .k{display:inline-block;width:22px;font:600 12px "IBM Plex Mono",monospace;color:#8492AC}',
    'html body .opt.selected .k{color:#C9A227}',
    '.q-flagnote{display:inline-block;margin-left:8px;color:#C9A227;font-size:12px;font-weight:600}',
    '@media (max-width:640px){.qmap-keys{display:none}.qmap-grid{grid-template-columns:repeat(10,1fr);gap:4px}.qm{height:28px;font-size:11px}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- question map ---------- */
  var map = document.createElement('div');
  map.className = 'qmap' + (mobile ? ' closed' : '');
  map.innerHTML =
    '<div class="qmap-head">' +
      '<button type="button" class="qmap-toggle" aria-expanded="' + !mobile + '"><i>▾</i> Question map · <b class="qm-count"></b></button>' +
      '<span class="qmap-keys">A–E choose · ← → move · F flag</span>' +
      '<button type="button" class="qmap-flag" title="Flag this question to come back later (F)">⚑ Flag</button>' +
    '</div>' +
    '<div class="qmap-grid"></div>' +
    '<div class="qmap-legend"><span class="l-ans">answered</span><span class="l-flag">flagged</span><span class="l-cur">current</span></div>';
  app.parentNode.insertBefore(map, app);
  var grid = map.querySelector('.qmap-grid');
  var flagBtn = map.querySelector('.qmap-flag');

  var cells = [], pinned = 0, pinnedUntil = 0;
  questions.forEach(function (q, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'qm'; b.textContent = i + 1;
    b.setAttribute('aria-label', 'Question ' + (i + 1));
    b.onclick = function () { go(i); };
    grid.appendChild(b); cells.push(b);
  });

  map.querySelector('.qmap-toggle').onclick = function () {
    map.classList.toggle('closed');
    this.setAttribute('aria-expanded', !map.classList.contains('closed'));
  };
  flagBtn.onclick = function () { toggleFlag(); };

  function curIdx() {
    if (!scrollMode()) return state.idx;
    // in scroll view: the question nearest the top of the screen
    if (Date.now() < pinnedUntil) return pinned;
    // in scroll view: the last question whose top has reached the upper part of the screen
    var best = 0;
    questions.forEach(function (q, i) {
      var el = document.getElementById('pl-q-' + q.id);
      if (el && el.getBoundingClientRect().top <= 160) best = i;
    });
    return best;
  }

  function go(i) {
    if (scrollMode()) {
      var el = document.getElementById('pl-q-' + questions[i].id);
      if (!el) return;
      pinned = i; pinnedUntil = Date.now() + 1600;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // pictures above load lazily and push the target down: settle on it again
      setTimeout(function () { el.scrollIntoView({ block: 'start' }); updateMap(); }, 700);
      setTimeout(function () { el.scrollIntoView({ block: 'start' }); updateMap(); }, 1500);
      updateMap();
      return;
    }
    state.idx = i; render();
    if (mobile) map.scrollIntoView({ block: 'nearest' });
  }

  function toggleFlag() {
    var id = questions[curIdx()].id;
    if (flags[id]) delete flags[id]; else flags[id] = 1;
    saveFlags(); updateMap(); decorate();
  }

  function updateMap() {
    if (state.finished) { map.style.display = 'none'; return; }
    map.style.display = '';
    var cur = curIdx(), answered = 0;
    questions.forEach(function (q, i) {
      var a = q.id in state.answers; if (a) answered++;
      var c = cells[i];
      c.className = 'qm' + (a ? ' ans' : '') + (i === cur ? ' cur' : '') + (flags[q.id] ? ' flag' : '') +
                    ((q.options || []).length ? '' : ' nokey');
    });
    var nf = Object.keys(flags).length;
    map.querySelector('.qm-count').textContent = answered + '/' + questions.length + ' answered' + (nf ? ' · ' + nf + ' flagged' : '');
    var on = !!flags[questions[cur].id];
    flagBtn.classList.toggle('on', on);
    flagBtn.textContent = on ? '⚑ Flagged' : '⚑ Flag';
  }

  /* ---------- compact options + key letters ---------- */
  function isLetterSet(texts) {
    return texts.length > 1 && texts.every(function (t, k) { return t === LET[k]; });
  }
  function decorate() {
    if (state.finished) return;
    var box = app.querySelector('.options');
    if (box) {
      var opts = box.querySelectorAll('.opt');
      var texts = [].map.call(opts, function (o) { return o.textContent.trim(); });
      if (isLetterSet(texts)) box.classList.add('compact');
      else if (!mobile) [].forEach.call(opts, function (o, k) {
        if (!o.querySelector('.k')) o.insertAdjacentHTML('afterbegin', '<span class="k">' + LET[k] + '</span>');
      });
      var top = app.querySelector('.topbar span');
      var q = questions[state.idx];
      if (top && q && flags[q.id] && !top.querySelector('.q-flagnote')) top.insertAdjacentHTML('beforeend', '<span class="q-flagnote">⚑ flagged</span>');
    }
  }
  function decorateScroll() {
    if (!host) return;
    [].forEach.call(host.querySelectorAll('.pl-opts'), function (box) {
      if (box.classList.contains('compact')) return;
      var opts = box.querySelectorAll('.pl-opt');
      var texts = [].map.call(opts, function (o) { return o.textContent.trim(); });
      var letters = texts.map(function (t) { var m = t.match(/^([A-H])\) \1$/); return m ? m[1] : null; });
      if (letters.length > 1 && letters.every(function (l, k) { return l === LET[k]; })) {
        box.classList.add('compact');
        [].forEach.call(opts, function (o, k) { o.textContent = LET[k]; });
      }
    });
  }

  /* re-apply after every engine render (the timer re-renders each second) */
  var orig = render, lastSig = null;   // set after the first decorate() below
  function sig() { return state.finished + '|' + state.idx + '|' + JSON.stringify(state.answers); }
  function mmss(s) { s = Math.max(0, s | 0); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  render = function () {
    // The engines call render() every second for the timer, which rebuilt the whole question:
    // the picture reloaded and formulas flashed as raw text (visible flicker on phones).
    // If nothing but the time changed, update only the timer.
    var t = document.getElementById('timer');
    if (sig() === lastSig && t && app.contains(t) && !state.finished) {
      t.textContent = mmss(state.timeLeft);
      t.classList.toggle('low', state.timeLeft < 60);
      tick();
      return;
    }
    lastSig = sig();
    var r = orig.apply(this, arguments);
    try {
      if (state.finished) { flags = {}; saveFlags(); }
      decorate(); updateMap();
      if (live) pushProgress();
    } catch (e) {}
    tick();
    return r;
  };
  if (host) {
    new MutationObserver(function () { decorateScroll(); updateMap(); }).observe(host, { childList: true });
    host.addEventListener('click', function () { setTimeout(function () { updateMap(); if (live) pushProgress(); tick(); }, 0); });
    window.addEventListener('scroll', function () { if (scrollMode()) updateMap(); }, { passive: true });
  }

  /* ---------- live room mode: <test>.html?room=CODE ---------- */
  var ROOM_CODE = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
  var live = null;   // { room, user }
  if (ROOM_CODE) startRoomMode();

  function startRoomMode() {
    var supa = window.preplineSupa;
    var back = function () { location.replace('live.html?room=' + ROOM_CODE); };
    if (!supa) return;
    css.textContent += '\n.lroom{display:flex;gap:12px;align-items:center;justify-content:space-between;background:rgba(201,162,39,.1);' +
      'border:1px solid rgba(201,162,39,.45);border-radius:8px;padding:10px 14px;margin:0 0 14px;font-size:13px;color:#E6ECF7}' +
      '\n.lroom b{font-family:"IBM Plex Mono",monospace;color:#C9A227;letter-spacing:.12em}' +
      '\n.lcover{position:fixed;inset:0;z-index:8000;background:rgba(11,17,32,.92);display:flex;align-items:center;justify-content:center;' +
      'font:600 16px Inter,sans-serif;color:#E6ECF7}' +
      '\nhtml body #restart{display:none}';
    var cover = document.createElement('div');
    cover.className = 'lcover'; cover.textContent = 'Connecting to room ' + ROOM_CODE + '…';
    document.body.appendChild(cover);

    supa.auth.getUser().then(function (u) {
      var user = u.data && u.data.user;
      if (!user) { cover.textContent = 'Sign in to take part in the room.'; return; }
      return supa.from('rooms').select('*').eq('code', ROOM_CODE).maybeSingle().then(function (r) {
        var room = r.data;
        if (!room) { cover.textContent = 'Room ' + ROOM_CODE + ' not found.'; return; }
        if (room.mock_id !== page) { location.replace(room.mock_id + '.html?room=' + ROOM_CODE); return; }
        return supa.from('room_players').select('*').eq('room_id', room.id).eq('user_id', user.id).maybeSingle().then(function (m) {
          var ends = room.ends_at ? new Date(room.ends_at).getTime() : 0;
          if (!m.data || m.data.finished || room.status !== 'running' || Date.now() >= ends) return back();
          live = { room: room, user: user, ends: ends, sent: -1 };
          // answers survive an accidental reload
          try {
            var saved = JSON.parse(sessionStorage.getItem(saveKey()) || '{}');
            Object.keys(saved).forEach(function (k) { state.answers[k] = saved[k]; });
          } catch (e) {}
          state.timeLeft = Math.max(1, Math.floor((ends - Date.now()) / 1000));
          render();
          setInterval(function () {             // keep in step with the room clock
            if (!state.finished) state.timeLeft = Math.max(0, Math.floor((live.ends - Date.now()) / 1000));
          }, 5000);
          var bar = document.createElement('div');
          bar.className = 'lroom';
          bar.innerHTML = '<span>Live room <b>' + ROOM_CODE + '</b> · shared timer · scores are revealed when the test ends</span>';
          map.parentNode.insertBefore(bar, map.previousElementSibling || map);
          cover.remove();
          pushProgress();
        });
      });
    }).catch(function () { cover.textContent = 'Could not connect to the room. Refresh the page.'; });

    var origFinish = window.finish;
    if (typeof origFinish === 'function') {
      window.finish = function () {
        var r = origFinish.apply(this, arguments);
        if (live && !live.done) submitRoom();
        return r;
      };
    }
  }

  var progressTimer = null;
  function saveKey() { return 'prepline-room:' + ROOM_CODE + ':' + page; }
  function pushProgress() {
    if (!live || live.done) return;
    try { sessionStorage.setItem(saveKey(), JSON.stringify(state.answers)); } catch (e) {}
    var n = Object.keys(state.answers).length;
    if (n === live.sent) return;
    clearTimeout(progressTimer);
    progressTimer = setTimeout(function () {
      live.sent = n;
      window.preplineSupa.from('room_players').update({ answered: n })
        .eq('room_id', live.room.id).eq('user_id', live.user.id).then(function () {});
    }, 800);
  }

  function submitRoom() {
    live.done = true;
    // kept on this device for the "Review my answers" screen in live.html
    try { localStorage.setItem('prepline-room-answers:' + ROOM_CODE, JSON.stringify({ mock: page, answers: state.answers })); } catch (e) {}
    var supa = window.preplineSupa;
    var cover = document.createElement('div');
    cover.className = 'lcover'; cover.textContent = 'Submitting your answers…';
    document.body.appendChild(cover);
    var rows = questions.filter(function (q) { return q.verified !== false && (q.options || []).length; })
      .map(function (q) { return { room_id: live.room.id, user_id: live.user.id, q_id: q.id, correct: state.answers[q.id] === q.correct }; });
    var tries = 0;
    (function send() {
      supa.from('room_answers').upsert(rows, { onConflict: 'room_id,user_id,q_id' }).then(function (a) {
        if (a.error) throw a.error;
        return supa.from('room_players').update({ finished: true, answered: Object.keys(state.answers).length })
          .eq('room_id', live.room.id).eq('user_id', live.user.id);
      }).then(function (b) {
        if (b && b.error) throw b.error;
        location.replace('live.html?room=' + ROOM_CODE);
      }).catch(function (e) {
        // keep the answers in memory and keep trying; reloading would lose them
        tries++;
        cover.textContent = 'Connection problem (' + (e && e.message ? e.message : 'network') + '). Retrying… do not close this page.';
        setTimeout(send, Math.min(10000, 1500 * tries));
      });
    })();
  }

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || state.finished) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (document.querySelector('.pl-modal-bg.open, .pl-rep-bg.open, #pl-gate.on')) return;
    var k = e.key;
    if (k === 'f' || k === 'F') { toggleFlag(); e.preventDefault(); return; }
    if (scrollMode()) return;
    if (k === 'ArrowRight') { var n = document.getElementById('next'); if (n) { n.click(); e.preventDefault(); } return; }
    if (k === 'ArrowLeft') { var p = document.getElementById('prev'); if (p && !p.disabled) { p.click(); e.preventDefault(); } return; }
    var i = -1;
    if (/^[1-8]$/.test(k)) i = +k - 1;
    else if (/^[a-hA-H]$/.test(k)) i = LET.indexOf(k.toUpperCase());
    if (i < 0) return;
    var opts = app.querySelectorAll('.options .opt');
    if (opts[i]) { opts[i].click(); e.preventDefault(); }
  });

  /* ======================================================================
     Exam day mode (?exam=1) and the ghost of your previous attempt
     ====================================================================== */
  var PARAMS = new URLSearchParams(location.search);
  var EXAM = PARAMS.get('exam') === '1' && !ROOM_CODE;
  var T0 = state.timeLeft;                          // full time; the engine started counting at page load
  function elapsed() { return (live ? live.room.duration_sec : T0) - state.timeLeft; }
  function tick() { try { ghostTick(); examTick(); } catch (e) {} }

  /* ---------- ghost ---------- */
  var GKEY = 'prepline-pace:' + page;
  var pace = [], lastCount = -1, ghost = null, ghostEl = null;
  try {
    var hist = JSON.parse(localStorage.getItem(GKEY) || '[]');
    ghost = hist.length ? hist[hist.length - 1] : null;  // the most recent finished attempt
  } catch (e) {}
  css.textContent += [
    '.ghost{display:flex;align-items:center;gap:12px;margin:0 0 14px;font-size:12.5px;color:#8492AC}',
    '.ghost .gl{white-space:nowrap}',
    '.ghost .gl b{color:#E6ECF7;font-family:"IBM Plex Mono",monospace}',
    '.ghost .gt{flex:1;position:relative;height:6px;border-radius:99px;background:rgba(255,255,255,.07);min-width:60px}',
    '.ghost .gt i{position:absolute;left:0;top:0;bottom:0;border-radius:99px}',
    '.ghost .gt .g{background:rgba(180,192,214,.35)}',
    '.ghost .gt .y{background:#C9A227;height:3px;top:1.5px}',
    '.ghost .gd{font:600 12px "IBM Plex Mono",monospace;white-space:nowrap}',
    '.ghost .gd.ahead{color:#4ADE9A} .ghost .gd.behind{color:#F5C451}',
    '@media (max-width:640px){.ghost{flex-wrap:wrap;gap:6px 10px}.ghost .gt{order:3;flex-basis:100%}}'
  ].join('\n');
  function ghostAt(sec) {                            // how many the ghost had answered by this second
    var n = 0;
    for (var i = 0; i < ghost.p.length && ghost.p[i][0] <= sec; i++) n = ghost.p[i][1];
    return n;
  }
  function ghostTick() {
    if (state.finished) return;
    var n = Object.keys(state.answers).length;
    if (n !== lastCount) { lastCount = n; pace.push([Math.max(0, elapsed()), n]); }
    if (!ghost || EXAM) return;
    if (!ghostEl) {
      ghostEl = document.createElement('div');
      ghostEl.className = 'ghost';
      ghostEl.title = 'Your pace in your previous attempt of this test';
      app.parentNode.insertBefore(ghostEl, app);
    }
    var g = ghostAt(elapsed()), total = questions.length, d = n - g;
    var when = new Date(ghost.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    ghostEl.innerHTML = '<span class="gl">👻 You on ' + when + ': <b>' + g + '</b> answered by now</span>' +
      '<span class="gt"><i class="g" style="width:' + (100 * g / total) + '%"></i><i class="y" style="width:' + (100 * n / total) + '%"></i></span>' +
      '<span class="gd ' + (d > 0 ? 'ahead">' + d + ' ahead' : d < 0 ? 'behind">' + (-d) + ' behind' : '">level') + '</span>';
  }
  function savePace() {
    try {
      var h = JSON.parse(localStorage.getItem(GKEY) || '[]');
      h.push({ t: Date.now(), p: pace });
      localStorage.setItem(GKEY, JSON.stringify(h.slice(-5)));
    } catch (e) {}
  }

  /* ---------- exam day ---------- */
  var examAlerts = { 600: 'Ten minutes remaining.', 300: 'Five minutes remaining.', 60: 'One minute remaining.' };
  var examStarted = false, examBox = null;
  function examTick() {
    if (!EXAM || !examStarted || state.finished) return;
    var msg = examAlerts[state.timeLeft];
    if (msg) {
      examBox.textContent = msg; examBox.classList.add('on');
      clearTimeout(examBox._t); examBox._t = setTimeout(function () { examBox.classList.remove('on'); }, 6000);
    }
  }
  function setupExam() {
    document.body.classList.add('exam-day');
    css.textContent += [
      'body.exam-day{background:#000!important;background-image:none!important}',
      'body.exam-day .qmap,body.exam-day .pl-mode,body.exam-day .pl-auth,body.exam-day .ghost,body.exam-day .pl-pill{display:none!important}',
      'body.exam-day #timer{visibility:hidden}',
      'body.exam-day [class*="pl-rep"],body.exam-day .pl-report{display:none!important}',
      'body.exam-day .opt .k{display:none}',
      '.exam-tag{display:inline-block;font:600 11px "IBM Plex Mono",monospace;letter-spacing:.12em;color:#C9A227;border:1px solid rgba(201,162,39,.45);border-radius:4px;padding:2px 8px;margin-bottom:10px}',
      '.exam-alert{position:fixed;left:50%;top:18px;transform:translate(-50%,-140%);z-index:7000;background:#C9A227;color:#0E1A2E;',
      '  font:700 15px Inter,sans-serif;padding:12px 22px;border-radius:6px;transition:transform .3s;box-shadow:0 8px 30px rgba(0,0,0,.6)}',
      '.exam-alert.on{transform:translate(-50%,0)}',
      '.exam-intro{position:fixed;inset:0;z-index:8500;background:#000;display:flex;align-items:center;justify-content:center;padding:20px}',
      '.exam-intro .box{max-width:460px;color:#E6ECF7;font:15px/1.6 Inter,sans-serif}',
      '.exam-intro h3{font:700 24px Sora,Inter,sans-serif;margin:10px 0 14px}',
      '.exam-intro ul{margin:0 0 22px 18px;color:#B4C0D6} .exam-intro li{margin:6px 0}',
      '.exam-intro button{background:#C9A227;color:#0E1A2E;border:0;font:700 15px Inter,sans-serif;padding:13px 26px;border-radius:6px;cursor:pointer}',
      '.exam-intro a{color:#8492AC;font-size:13px;margin-left:16px}'
    ].join('\n');
    examBox = document.createElement('div'); examBox.className = 'exam-alert'; document.body.appendChild(examBox);
    var tag = document.createElement('div'); tag.className = 'exam-tag'; tag.textContent = 'EXAM DAY MODE';
    var h = document.querySelector('.wrap h2'); if (h) h.parentNode.insertBefore(tag, h);
    // nothing counts until the student presses Start
    var stopId = setInterval(function () { if (!examStarted) state.timeLeft = T0; }, 200);
    var intro = document.createElement('div'); intro.className = 'exam-intro';
    intro.innerHTML = '<div class="box"><span class="exam-tag">EXAM DAY MODE</span><h3>Like the real NUET</h3><ul>' +
      '<li>The clock is hidden. You get a signal at 10, 5 and 1 minute left.</li>' +
      '<li>No question map, flags, hints or scroll view.</li>' +
      '<li>You have <b>' + Math.round(T0 / 60) + ' minutes</b> for ' + questions.length + ' questions. When time is up, the test is submitted.</li>' +
      '<li>Leaving the page asks for confirmation.</li></ul>' +
      '<button type="button">Start the exam</button><a href="' + location.pathname + '">Practice mode instead</a></div>';
    document.body.appendChild(intro);
    intro.querySelector('button').onclick = function () {
      clearInterval(stopId); state.timeLeft = T0; examStarted = true; intro.remove();
      pace = []; lastCount = -1;
    };
    window.addEventListener('beforeunload', function (e) {
      if (examStarted && !state.finished) { e.preventDefault(); e.returnValue = ''; }
    });
  }
  if (EXAM) setupExam();

  // remember the pace of every finished attempt for the ghost next time
  (function () {
    var f = window.finish;
    if (typeof f !== 'function') return;
    window.finish = function () {
      var was = state.finished, r = f.apply(this, arguments);
      if (!was && state.finished && pace.length > 1) savePace();
      if (ghostEl) ghostEl.style.display = 'none';
      return r;
    };
  })();

  decorate(); updateMap(); tick();
  lastSig = sig();   // the engine already drew the first question before this script loaded
})();
