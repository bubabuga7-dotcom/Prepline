/* Shyn: read image questions comfortably on a phone.
   A 🔍 button sits on every question picture. It opens the picture full screen, at a size the
   student picks once (remembered on this device), with the answer buttons right underneath —
   read, answer, done, no pinch-zooming and no scrolling back to the buttons.
   An answer tapped here clicks the page's real option button, so tests, autosave and results
   work exactly as before. Phones only; desktops are untouched. */
(function () {
  var IMG = 'img.q-img, img.question-img, img.pl-img';
  var L = 'ABCDEFGH';
  var KEY = 'shyn-zoom';
  var SIZES = [100, 135, 170, 200];
  function phone() { return window.matchMedia('(max-width: 780px)').matches; }
  function getSize() { try { var v = +localStorage.getItem(KEY); return SIZES.indexOf(v) >= 0 ? v : 100; } catch (e) { return 100; } }
  function setSize(v) { try { localStorage.setItem(KEY, String(v)); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent =
        '.zm-btn{position:relative;display:none;margin:0 0 32px auto;align-items:center;gap:6px;height:40px;padding:0 14px;' +
      'border-radius:999px;border:1px solid rgba(61,99,163,.35);background:rgba(255,255,255,.95);color:#2B4C83;' +
      'font:700 14px Inter,system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.18);cursor:pointer}' +
    '@media (max-width:780px){.zm-btn{display:flex}}' +
    '.zm{position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;background:#0E1013}' +
    '.zm-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.1)}' +
    '.zm-top button{height:44px;min-width:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#1C2026;color:#E6E8EB;' +
      'font:700 16px Inter,system-ui,sans-serif;cursor:pointer}' +
    '.zm-top .zm-x{margin-left:auto;padding:0 16px}' +
    '.zm-top span{color:#9AA3AE;font:600 13px Inter,system-ui,sans-serif;min-width:44px;text-align:center}' +
    '.zm-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom;padding:10px 6px}' +
    '.zm-body img{display:block;max-width:none;background:#fff;border-radius:6px;padding:4px;box-sizing:border-box}' +
    '.zm-ans{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.1)}' +
    '.zm-ans button{flex:1;height:52px;border-radius:12px;border:1px solid rgba(157,184,220,.45);background:rgba(157,184,220,.14);' +
      'color:#DCE6F3;font:700 18px Inter,system-ui,sans-serif;cursor:pointer}' +
    '.zm-ans button:disabled{opacity:.45}' +
    '.zm-hint{color:#9AA3AE;font:500 12.5px Inter,system-ui,sans-serif;padding:0 12px 8px;text-align:center}';
  document.head.appendChild(css);

  function optionsFor(img) {
    var box = img.closest('.pl-q, [data-ex-q], .question, .q-card, #card, main') || document.body;
    var opts = [].slice.call(box.querySelectorAll('button.opt, button.pl-opt'));
    if (!opts.length) { var o = document.querySelector('.options'); if (o) opts = [].slice.call(o.querySelectorAll('button.opt')); }
    return opts.slice(0, 8);
  }

  // cut the empty margins around the scan, so at 100% the words already fill the phone's width
  var cache = {};
  function trimmed(img, cb) {
    var key = img.currentSrc || img.src;
    if (key in cache) return cb(cache[key]);
    function run() {
      try {
        var w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return cb(null);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var g = c.getContext('2d'); g.drawImage(img, 0, 0);
        var d = g.getImageData(0, 0, w, h).data;
        var bg = [d[0], d[1], d[2]];                      // the corner colour is the page background
        function ink(i) { return Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 90; }
        var x0 = w, x1 = -1, y0 = h, y1 = -1;
        for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) {
          if (ink((y * w + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0 || (x1 - x0) > w * 0.94) { cache[key] = null; return cb(null); }   // nothing worth cutting
        var pad = Math.round(w * 0.015);
        x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + pad); y1 = Math.min(h, y1 + pad);
        var o = document.createElement('canvas'); o.width = x1 - x0; o.height = y1 - y0;
        o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        cache[key] = o.toDataURL('image/png'); cb(cache[key]);
      } catch (e) { cache[key] = null; cb(null); }        // e.g. a picture from another site: show it as is
    }
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
  }

  function open(img) {
    var size = getSize();
    var z = document.createElement('div'); z.className = 'zm'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-label', 'Question, zoomed');
    z.innerHTML =
      '<div class="zm-top"><button class="zm-minus" aria-label="Smaller text">A−</button><span class="zm-pct"></span>' +
      '<button class="zm-plus" aria-label="Bigger text">A+</button><button class="zm-x">Close</button></div>' +
      '<div class="zm-body"><img alt="Question"></div>' +
      '<div class="zm-hint">Tip: turn your phone sideways for even bigger text.</div>' +
      '<div class="zm-ans"></div>';
    var big = z.querySelector('.zm-body img'); big.src = img.currentSrc || img.src;
    trimmed(img, function (url) { if (url) big.src = url; });
    function apply() { big.style.width = size + '%'; z.querySelector('.zm-pct').textContent = size + '%'; }
    apply();
    z.querySelector('.zm-minus').onclick = function () { var i = SIZES.indexOf(size); if (i > 0) { size = SIZES[i - 1]; setSize(size); apply(); } };
    z.querySelector('.zm-plus').onclick = function () { var i = SIZES.indexOf(size); if (i < SIZES.length - 1) { size = SIZES[i + 1]; setSize(size); apply(); } };
    function close() { z.remove(); document.documentElement.style.overflow = ''; document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    z.querySelector('.zm-x').onclick = close;
    document.addEventListener('keydown', esc);
    var opts = optionsFor(img), ans = z.querySelector('.zm-ans');
    if (!opts.length) ans.remove();
    opts.forEach(function (b, k) {
      var t = document.createElement('button'); t.type = 'button';
      var letter = (b.querySelector('b') && b.querySelector('b').textContent.trim()) || L[k];
      t.textContent = letter.length <= 2 ? letter : L[k];
      t.disabled = b.disabled;
      t.onclick = function () { b.click(); close(); };
      ans.appendChild(t);
    });
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(z);
  }

  function decorate(img) {
    if (img.dataset.zm) return; img.dataset.zm = '1';
    // a separate row above the picture: the picture itself is not wrapped or moved, so tap-on-picture answers keep working
    var b = document.createElement('button'); b.type = 'button'; b.className = 'zm-btn'; b.setAttribute('aria-label', 'Open the question full screen');
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>Read bigger';
    b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); open(img); };
    img.parentNode.insertBefore(b, img);
  }

  function scan() { [].forEach.call(document.querySelectorAll(IMG), decorate); }
  scan();
  new MutationObserver(function () { scan(); }).observe(document.body, { childList: true, subtree: true });
  window.preplineZoomOpen = function () { if (!phone()) return; var i = document.querySelector(IMG); if (i) open(i); };
})();
