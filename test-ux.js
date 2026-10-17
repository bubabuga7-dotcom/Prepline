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
      if (state.finished) { flags = {}; saveFlags(); }
      decorate(); updateMap();
    } catch (e) {}
    return r;
  };
  if (host) {
    new MutationObserver(function () { decorateScroll(); updateMap(); }).observe(host, { childList: true });
    host.addEventListener('click', function () { setTimeout(updateMap, 0); });
    window.addEventListener('scroll', function () { if (scrollMode()) updateMap(); }, { passive: true });
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
