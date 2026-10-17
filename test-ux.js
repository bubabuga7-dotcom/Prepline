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
  var orig = render;
  render = function () {
    var r = orig.apply(this, arguments);
    try {
      if (state.finished) { flags = {}; saveFlags(); showScore(); }
      decorate(); updateMap();
      if (live) pushProgress();
    } catch (e) {}
    return r;
  };
  if (host) {
    new MutationObserver(function () { decorateScroll(); updateMap(); }).observe(host, { childList: true });
    host.addEventListener('click', function () { setTimeout(function () { updateMap(); if (live) pushProgress(); }, 0); });
    window.addEventListener('scroll', function () { if (scrollMode()) updateMap(); }, { passive: true });
  }

  /* ---------- NUET-style weighted score ----------
     Weight of a question = 1 + 2·p, p = share of students who got it wrong
     (smoothed towards 50% with PRIOR imaginary students, so early data cannot swing it).
     Score = 120 · Σ weight(correct) / Σ weight(all scored questions). */
  var PRIOR = 4, stats = {}, statsReady = false, totalStudents = 0;
  (function loadStats() {
    var supa = window.preplineSupa;
    if (!supa) { statsReady = true; return; }
    supa.from('question_stats').select('q_id,students,wrong').eq('mock_id', page).then(function (res) {
      if (!res.error && res.data) res.data.forEach(function (r) {
        stats[r.q_id] = r; totalStudents = Math.max(totalStudents, r.students);
      });
      statsReady = true;
      if (state.finished) showScore();
    }, function () { statsReady = true; });
  })();

  function qInfo(q) {
    var s = stats[q.id] || { students: 0, wrong: 0 };
    var p = (s.wrong + PRIOR / 2) / (s.students + PRIOR);
    var w = 1 + 2 * p;
    var right = s.students ? Math.round(100 * (1 - s.wrong / s.students)) : null;
    var lvl = p >= 0.6 ? 'hard' : p <= 0.35 ? 'easy' : 'medium';
    return { w: w, p: p, right: right, n: s.students, lvl: lvl };
  }

  css.textContent += [
    '.nscore{background:linear-gradient(135deg,rgba(20,59,107,.6),rgba(17,26,46,.5));border:1px solid rgba(132,174,236,.3);',
    '  border-radius:8px;padding:18px 20px;margin:0 0 16px;display:grid;grid-template-columns:auto 1fr;gap:6px 22px;align-items:center}',
    '.nscore .k{grid-column:1/-1;font:600 11px "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#C9A227}',
    '.nscore .big{font:600 44px/1 "IBM Plex Mono",monospace;color:#E6ECF7}',
    '.nscore .big small{font-size:18px;color:#8492AC;margin-left:4px}',
    '.nscore .txt{font-size:13px;color:#B4C0D6;line-height:1.5}',
    '.nscore .txt b{color:#E6ECF7}',
    '.nscore .bar{grid-column:1/-1;height:6px;border-radius:99px;background:rgba(255,255,255,.08);position:relative;margin-top:8px}',
    '.nscore .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:#C9A227}',
    '.nscore .bar u{position:absolute;top:-4px;bottom:-4px;width:2px;background:#4ADE9A}',
    '.nscore .legend{grid-column:1/-1;display:flex;justify-content:space-between;font:500 11px "IBM Plex Mono",monospace;color:#8492AC}',
    '.nscore .note{grid-column:1/-1;font-size:11.5px;color:#8492AC;margin-top:4px}',
    '.qdiff{display:inline-block;margin-left:8px;font:600 10.5px "IBM Plex Mono",monospace;padding:1px 7px;border-radius:99px;border:1px solid;vertical-align:1px;white-space:nowrap}',
    '.qdiff.easy{color:#4ADE9A;border-color:rgba(74,222,154,.35)}',
    '.qdiff.medium{color:#F5C451;border-color:rgba(245,196,81,.35)}',
    '.qdiff.hard{color:#F87171;border-color:rgba(248,113,113,.35)}',
    '@media (max-width:560px){.nscore{grid-template-columns:1fr}.nscore .big{font-size:38px}}'
  ].join('\n');

  function showScore() {
    if (!state.finished || !statsReady || ROOM_CODE || app.querySelector('.nscore')) return;
    var scored = questions.filter(function (q) { return q.verified !== false && (q.options || []).length; });
    if (!scored.length) return;
    var got = 0, all = 0, raw = 0;
    scored.forEach(function (q) {
      var w = qInfo(q).w; all += w;
      if (state.answers[q.id] === q.correct) { got += w; raw++; }
    });
    var scaled = Math.round(120 * got / all);
    // 105/120 per section ≈ the 210/240 competitive mark
    var box = document.createElement('div');
    box.className = 'nscore';
    box.innerHTML =
      '<span class="k">NUET-style score</span>' +
      '<div class="big">' + scaled + '<small>/120</small></div>' +
      '<div class="txt">Raw <b>' + raw + '/' + scored.length + '</b>. Harder questions are worth more: ' +
        'a question most students miss counts up to 3× an easy one.<br>' +
        (scaled >= 105 ? '<b style="color:#4ADE9A">On track for 210+/240.</b>'
                       : 'Need <b>' + (105 - scaled) + '</b> more to reach 105/120 — the pace for 210+/240.') + '</div>' +
      '<div class="bar"><i style="width:' + (100 * scaled / 120) + '%"></i><u style="left:' + (100 * 105 / 120) + '%"></u></div>' +
      '<div class="legend"><span>0</span><span style="margin-left:auto;margin-right:' + (100 - 100 * 105 / 120) + '%">105</span><span>120</span></div>' +
      '<div class="note">' + (totalStudents
        ? 'Difficulty is based on answers from ' + totalStudents + (totalStudents === 1 ? ' student' : ' students') + ' so far and becomes more accurate as more people take this test.'
        : 'No difficulty data for this test yet, so every question counts the same for now. It changes as students take the test.') + '</div>';
    app.insertBefore(box, app.firstChild);

    // difficulty tag on each reviewed question
    var items = app.querySelectorAll('.review-item');
    if (items.length >= questions.length) {
      questions.forEach(function (q, i) {
        if (q.verified === false || !(q.options || []).length) return;
        var inf = qInfo(q), line = items[i].querySelector('span') || items[i];
        var label = inf.lvl[0].toUpperCase() + inf.lvl.slice(1) + ' · ' + inf.w.toFixed(1) + ' pts' +
                    (inf.right !== null && inf.n >= 3 ? ' · ' + inf.right + '% right' : '');
        line.insertAdjacentHTML('beforeend', '<span class="qdiff ' + inf.lvl + '">' + label + '</span>');
      });
    }
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

  decorate(); updateMap();
})();
