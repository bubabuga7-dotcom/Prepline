/* Prepline test tools: draw on the test (pen / highlighter / eraser), zoom the test, and open any figure full screen.
   Loaded by test-ux.js on every test page. Drawings are kept per question while the page is open.
   With a stylus the finger keeps scrolling, so a hand resting on a tablet does not draw. */
(function () {
  if (typeof questions === 'undefined' || typeof state === 'undefined') return;
  var app = document.getElementById('app');
  var wrap = app && app.parentNode;
  if (!wrap) return;

  var ZKEY = 'prepline:test-zoom';
  var COLORS = { blue: '#2F6FE0', red: '#D27474', green: '#1F9D55' };

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.pl-ink{position:absolute;left:0;top:0;z-index:30;pointer-events:none;touch-action:auto}',
    '.pl-ink.on{pointer-events:auto;cursor:crosshair}',
    '.pl-ink.on.touch-draw{touch-action:none}',
    '.pl-tools{position:fixed;left:14px;bottom:14px;z-index:420;display:flex;gap:4px;align-items:center;flex-wrap:wrap;',
    '  background:#1D2127;border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:5px;box-shadow:0 10px 30px rgba(0,0,0,.45);',
    '  font:600 12px Inter,system-ui,sans-serif;max-width:calc(100vw - 28px)}',
    '.pl-tools button{height:34px;min-width:34px;padding:0 9px;border-radius:7px;border:1px solid transparent;background:none;color:#A6ADB8;',
    '  font:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}',
    '.pl-tools button:hover{background:rgba(255,255,255,.07);color:#DADDE2}',
    '.pl-tools button.on{background:rgba(201,170,106,.16);border-color:rgba(201,170,106,.55);color:#C9AA6A}',
    '.pl-tools .sep{width:1px;height:22px;background:rgba(255,255,255,.14);margin:0 3px}',
    '.pl-tools .zl{min-width:44px;text-align:center;color:#858C97;font-family:"IBM Plex Mono",monospace}',
    '.pl-tools .dot{width:14px;height:14px;border-radius:50%;display:inline-block}',
    '.pl-tools .pen-only{display:none}.pl-tools.drawing .pen-only{display:inline-flex}',
    '.pl-tools .pen-only.sep{display:none}.pl-tools.drawing .pen-only.sep{display:block}',
    '.pl-tools svg{width:17px;height:17px}',
    'body.pl-drawing .opt,body.pl-drawing .pl-opt{cursor:crosshair}',
    'html body .question-img,html body .pl-scroll .pl-img{cursor:zoom-in;pointer-events:auto}',
    '.pl-lb{position:fixed;inset:0;z-index:9000;background:rgba(5,8,16,.92);display:none;overflow:hidden;touch-action:none}',
    '.pl-lb.open{display:block}',
    '.pl-lb img{position:absolute;left:50%;top:50%;max-width:none;background:#fff;border-radius:6px;transform-origin:0 0;user-select:none;-webkit-user-drag:none;cursor:grab}',
    '.pl-lb .bar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:6px;background:#1D2127;',
    '  border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:5px}',
    '.pl-lb .bar button{height:36px;min-width:40px;border-radius:7px;border:0;background:none;color:#DADDE2;font:600 15px Inter,sans-serif;cursor:pointer}',
    '.pl-lb .bar button:hover{background:rgba(255,255,255,.08)}',
    '.pl-lb .x{position:absolute;right:14px;top:14px;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.2);',
    '  background:#1D2127;color:#fff;font:400 22px/1 Inter,sans-serif;cursor:pointer}',
    'html[data-theme=light] .pl-tools,html[data-theme=light] .pl-lb .bar{background:#FBFAF7;border-color:#D9D6CF;box-shadow:0 10px 30px rgba(15,27,51,.14)}',
    'html[data-theme=light] .pl-tools button{color:#4E545E}',
    'html[data-theme=light] .pl-tools button:hover{background:#ECEEF1;color:#2B2F36}',
    'html[data-theme=light] .pl-tools button.on{background:#E4E9F1;border-color:#3D63A3;color:#3D63A3}',
    'html[data-theme=light] .pl-tools .sep{background:#E1DED7}',
    'html[data-theme=light] .pl-lb .bar button{color:#2B2F36}',
    '@media (max-width:640px){.pl-tools{left:8px;bottom:8px}html body .pl-bar{bottom:54px}body{padding-bottom:56px}.pl-tools button{height:32px;min-width:32px;padding:0 7px}.pl-tools .lbl{display:none}}',
    '@media print{.pl-tools,.pl-lb{display:none!important}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- zoom of the whole test ---------- */
  var zoom = 1;
  try { zoom = Math.min(1.6, Math.max(0.8, parseFloat(localStorage.getItem(ZKEY)) || 1)); } catch (e) {}
  function applyZoom() {
    wrap.style.zoom = zoom === 1 ? '' : zoom;
    var z = tools && tools.querySelector('.zl'); if (z) z.textContent = Math.round(zoom * 100) + '%';
    try { localStorage.setItem(ZKEY, zoom); } catch (e) {}
    setTimeout(size, 30);
  }

  /* ---------- canvas over the test ---------- */
  var cv = document.createElement('canvas');
  cv.className = 'pl-ink';
  wrap.appendChild(cv);
  var ctx = cv.getContext('2d');
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var ink = {};                 // page key -> [{tool, color, w, pts:[[x,y],...]}]
  var tool = 'pen', color = 'blue', drawing = false, penSeen = false;

  function key() { return state.finished ? 'done' : scrollMode() ? 'scroll' : 'q' + (questions[state.idx] || {}).id; }
  function scrollMode() { var h = document.getElementById('pl-scroll-host'); return h && h.style.display !== 'none'; }
  function strokes() { var k = key(); return ink[k] || (ink[k] = []); }

  var W = 0, H = 0;
  function size() {
    var w = wrap.clientWidth, h = wrap.scrollHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    redraw();
  }
  function paint(s) {
    if (!s.pts.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.tool === 'hl') { ctx.globalAlpha = 0.28; ctx.lineWidth = 16; ctx.strokeStyle = '#D6B672'; }
    else { ctx.lineWidth = s.w; ctx.strokeStyle = COLORS[s.color] || COLORS.blue; }
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0], s.pts[0][1]);
    if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]);
    for (var i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]);
    ctx.stroke(); ctx.restore();
  }
  function redraw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (state.finished) return;
    strokes().forEach(paint);
  }
  function point(e) {
    var r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
  }
  function eraseAt(p) {
    var list = strokes(), hit = false;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].pts.some(function (q) { return Math.abs(q[0] - p[0]) < 14 && Math.abs(q[1] - p[1]) < 14; })) { list.splice(i, 1); hit = true; }
    }
    if (hit) redraw();
  }

  var cur = null;
  cv.addEventListener('pointerdown', function (e) {
    if (!drawing) return;
    if (e.pointerType === 'pen') { penSeen = true; cv.classList.add('touch-draw'); }
    if (e.pointerType === 'touch' && penSeen) return;          // stylus in use: fingers scroll
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    var p = point(e);
    if (tool === 'eraser') { cur = { erase: true }; eraseAt(p); return; }
    cur = { tool: tool, color: color, w: e.pointerType === 'pen' ? 1.6 + 2.2 * (e.pressure || 0.5) : 2.6, pts: [p] };
    strokes().push(cur);
    paint(cur);
  });
  cv.addEventListener('pointermove', function (e) {
    if (!cur) return;
    var p = point(e);
    if (cur.erase) { eraseAt(p); return; }
    var last = cur.pts[cur.pts.length - 1];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (cur.tool === 'hl') { ctx.globalAlpha = 0.28; ctx.lineWidth = 16; ctx.strokeStyle = '#D6B672'; }
    else { ctx.lineWidth = cur.w; ctx.strokeStyle = COLORS[cur.color]; }
    ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.restore();
    cur.pts.push(p);
    if (cur.tool === 'hl') redraw();      // avoid dark overlaps of the see-through marker
  });
  function end() { cur = null; }
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  /* ---------- toolbar ---------- */
  var I = {
    pen: '<path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M14 7l3 3"/>',
    hl: '<path d="M9 15l-4 4h6l1.5-1.5"/><path d="M9 15l7.5-9.5a2 2 0 0 1 3 2.6L10.5 16z"/>',
    er: '<path d="M7 20h11"/><path d="M5.5 15.5l9-9a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L12 18H8z"/>',
    clear: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'
  };
  function ic(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg>'; }
  var tools = document.createElement('div');
  tools.className = 'pl-tools';
  tools.innerHTML =
    '<button type="button" data-a="zoom-" title="Smaller">A−</button>' +
    '<span class="zl">100%</span>' +
    '<button type="button" data-a="zoom+" title="Bigger">A+</button>' +
    '<span class="sep"></span>' +
    '<button type="button" data-a="draw" title="Draw on the test (D)">' + ic('pen') + '<span class="lbl">Draw</span></button>' +
    '<span class="sep pen-only"></span>' +
    '<button type="button" class="pen-only" data-a="hl" title="Highlighter">' + ic('hl') + '</button>' +
    '<button type="button" class="pen-only" data-c="blue" title="Blue pen"><i class="dot" style="background:' + COLORS.blue + '"></i></button>' +
    '<button type="button" class="pen-only" data-c="red" title="Red pen"><i class="dot" style="background:' + COLORS.red + '"></i></button>' +
    '<button type="button" class="pen-only" data-c="green" title="Green pen"><i class="dot" style="background:' + COLORS.green + '"></i></button>' +
    '<button type="button" class="pen-only" data-a="er" title="Eraser">' + ic('er') + '</button>' +
    '<button type="button" class="pen-only" data-a="clear" title="Clear this page">' + ic('clear') + '</button>';
  document.body.appendChild(tools);

  function syncTools() {
    tools.classList.toggle('drawing', drawing);
    cv.classList.toggle('on', drawing);
    document.body.classList.toggle('pl-drawing', drawing);
    [].forEach.call(tools.querySelectorAll('button'), function (b) {
      var a = b.getAttribute('data-a'), c = b.getAttribute('data-c');
      b.classList.toggle('on', (a === 'draw' && drawing) || (a === 'hl' && tool === 'hl') || (a === 'er' && tool === 'eraser') || (c && tool === 'pen' && c === color));
    });
  }
  function setDrawing(v) { drawing = v; if (v) size(); syncTools(); }
  tools.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var a = b.getAttribute('data-a'), c = b.getAttribute('data-c');
    if (a === 'zoom+') { zoom = Math.min(1.6, Math.round((zoom + 0.1) * 10) / 10); applyZoom(); }
    else if (a === 'zoom-') { zoom = Math.max(0.8, Math.round((zoom - 0.1) * 10) / 10); applyZoom(); }
    else if (a === 'draw') setDrawing(!drawing);
    else if (a === 'hl') { tool = 'hl'; }
    else if (a === 'er') { tool = 'eraser'; }
    else if (a === 'clear') { ink[key()] = []; redraw(); }
    else if (c) { tool = 'pen'; color = c; }
    syncTools();
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey || (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
    if ((e.key === 'd' || e.key === 'D') && !state.finished) { setDrawing(!drawing); e.preventDefault(); }
    if (e.key === 'Escape' && drawing && !lb.classList.contains('open')) setDrawing(false);
  });

  /* follow the test: another question, the results screen, a different height */
  var lastKey = '';
  setInterval(function () {
    var k = key();
    tools.style.display = state.finished ? 'none' : '';
    if (state.finished && drawing) setDrawing(false);
    if (k !== lastKey) { lastKey = k; W = 0; size(); redraw(); }
    else size();
  }, 250);
  window.addEventListener('resize', function () { W = 0; size(); });

  /* ---------- figures full screen: wheel / buttons / pinch to zoom, drag to move ---------- */
  var lb = document.createElement('div');
  lb.className = 'pl-lb';
  lb.innerHTML = '<img alt="Figure"><button type="button" class="x" aria-label="Close">×</button>' +
    '<div class="bar"><button type="button" data-z="-">−</button><button type="button" data-z="fit">Fit</button><button type="button" data-z="+">+</button></div>';
  document.body.appendChild(lb);
  var im = lb.querySelector('img'), s = 1, tx = 0, ty = 0, base = 1;
  function show() { im.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')'; im.style.left = '0'; im.style.top = '0'; }
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight - 80;
    base = Math.min(vw * 0.94 / im.naturalWidth, vh * 0.94 / im.naturalHeight, 3);
    s = base; tx = (vw - im.naturalWidth * s) / 2; ty = (vh - im.naturalHeight * s) / 2 + 10; show();
  }
  function zoomAt(f, cx, cy) {
    var ns = Math.min(base * 6, Math.max(base * 0.5, s * f));
    tx = cx - (cx - tx) * (ns / s); ty = cy - (cy - ty) * (ns / s); s = ns; show();
  }
  function openLb(src) {
    if (drawing) return;
    im.onload = fit; im.src = src; lb.classList.add('open');
    if (im.complete && im.naturalWidth) fit();
  }
  function closeLb() { lb.classList.remove('open'); }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && (t.classList.contains('question-img') || t.classList.contains('pl-img'))) openLb(t.currentSrc || t.src);
  });
  lb.querySelector('.x').onclick = closeLb;
  lb.querySelector('.bar').onclick = function (e) {
    var z = e.target.getAttribute('data-z'); if (!z) return;
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    if (z === 'fit') fit(); else zoomAt(z === '+' ? 1.4 : 1 / 1.4, cx, cy);
  };
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) closeLb(); });
  lb.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
  var ptrs = {}, pinch0 = 0, drag = null;
  im.addEventListener('pointerdown', function (e) {
    e.preventDefault(); im.setPointerCapture(e.pointerId); ptrs[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(ptrs);
    if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); drag = null; }
    else drag = [e.clientX - tx, e.clientY - ty];
  });
  im.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(ptrs);
    if (ids.length === 2 && pinch0) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt(d / pinch0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch0 = d;
    } else if (drag) { tx = e.clientX - drag[0]; ty = e.clientY - drag[1]; show(); }
  });
  function up(e) { delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch0 = 0; if (!Object.keys(ptrs).length) drag = null; }
  im.addEventListener('pointerup', up); im.addEventListener('pointercancel', up);
  im.addEventListener('dblclick', function (e) { zoomAt(s > base * 1.5 ? base / s : 2, e.clientX, e.clientY); });

  applyZoom(); syncTools(); size();
})();
