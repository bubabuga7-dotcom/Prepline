/* Prepline appearance: Dark / Light / Auto (follows the device). Load in <head> so the page never flashes the wrong theme.
   The choice is stored on this device (localStorage "prepline:theme") and shared by all pages and tabs. */
(function () {
  var KEY = 'prepline:theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function pref() {
    var v = 'dark';
    try { v = localStorage.getItem(KEY) || 'dark'; } catch (e) {}
    return v === 'light' || v === 'auto' ? v : 'dark';
  }
  function current() { var p = pref(); return p === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : p; }
  function apply() {
    var t = current();
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#FFFFFF' : '#0B1120');
  }
  apply();
  if (mq) {
    var onChange = function () { if (pref() === 'auto') { apply(); sync(); } };
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener && mq.addListener(onChange);
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) { apply(); sync(); } });

  window.preplineTheme = {
    get: pref, current: current,
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} apply(); sync(); }
  };

  /* ---------- the switch: a round button next to the account button, top right ---------- */
  var ICON = {
    dark: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    auto: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'
  };
  function svg(k) {
    return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>';
  }
  var btn, menu;
  function sync() {
    if (!btn) return;
    btn.innerHTML = svg(current());
    btn.setAttribute('aria-label', 'Appearance: ' + pref());
    [].forEach.call(menu.querySelectorAll('button'), function (b) {
      var on = b.getAttribute('data-v') === pref();
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    });
  }
  function place() {
    if (!btn) return;
    var a = document.querySelector('.pl-auth');
    var r = a && a.offsetWidth ? a.getBoundingClientRect() : null;
    var right = r ? Math.max(10, window.innerWidth - r.left + 8) : 14;
    btn.style.right = right + 'px';
    btn.style.top = (r ? r.top + (r.height - 36) / 2 : 14) + 'px';
    menu.style.right = Math.max(10, right - 110) + 'px';
    menu.style.top = (parseFloat(btn.style.top) + 44) + 'px';
  }
  function build() {
    if (document.querySelector('.pl-theme')) return;
    var st = document.createElement('style');
    st.textContent =
      '.pl-theme{position:fixed;top:14px;right:14px;z-index:401;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;' +
      'background:#111A2E;color:#B4C0D6;border:1px solid rgba(255,255,255,.16);cursor:pointer;padding:0;transition:color .15s,border-color .15s}' +
      '.pl-theme:hover{color:#C9A227;border-color:rgba(201,162,39,.6)}' +
      '@media (max-width:780px){.pl-theme,.pl-theme-menu{position:absolute}}' +
      '*{-webkit-tap-highlight-color:transparent}' +
      'a:active,button:active,.pl-pill:active,.pl-theme:active{opacity:.7}' +
      '.pl-theme-menu{position:fixed;z-index:402;display:none;min-width:150px;background:#111A2E;border:1px solid rgba(255,255,255,.16);' +
      'border-radius:8px;padding:5px;box-shadow:0 12px 32px rgba(0,0,0,.45);font:600 13px Inter,system-ui,sans-serif}' +
      '.pl-theme-menu.open{display:block}' +
      '.pl-theme-menu .t{font:600 10.5px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#8492AC;padding:6px 9px 4px}' +
      '.pl-theme-menu button{display:flex;gap:9px;align-items:center;width:100%;background:none;border:0;color:#D5DDEC;font:inherit;' +
      'padding:8px 9px;border-radius:5px;cursor:pointer;text-align:left}' +
      '.pl-theme-menu button:hover{background:rgba(255,255,255,.06)}' +
      '.pl-theme-menu button.on{color:#C9A227}' +
      '.pl-theme-menu button.on::after{content:"✓";margin-left:auto}' +
      'html[data-theme=light] .pl-theme,html[data-theme=light] .pl-theme-menu{background:#fff;color:#3C4A63;border-color:#D5DEEB}' +
      'html[data-theme=light] .pl-theme-menu{box-shadow:0 12px 32px rgba(15,27,51,.14)}' +
      'html[data-theme=light] .pl-theme:hover{color:#1D5FD1;border-color:#1D5FD1}' +
      'html[data-theme=light] .pl-theme-menu .t{color:#66748C}' +
      'html[data-theme=light] .pl-theme-menu button{color:#0F1B33}' +
      'html[data-theme=light] .pl-theme-menu button:hover{background:#EEF3FB}' +
      'html[data-theme=light] .pl-theme-menu button.on{color:#1D5FD1}' +
      'body.exam-day .pl-theme{display:none}' +
      '@media print{.pl-theme,.pl-theme-menu{display:none}}';
    document.head.appendChild(st);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pl-theme'; btn.title = 'Appearance';
    btn.setAttribute('aria-haspopup', 'menu');
    menu = document.createElement('div');
    menu.className = 'pl-theme-menu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = '<div class="t">Appearance</div>' +
      '<button type="button" role="menuitemradio" data-v="dark">' + svg('dark') + 'Dark</button>' +
      '<button type="button" role="menuitemradio" data-v="light">' + svg('light') + 'Light</button>' +
      '<button type="button" role="menuitemradio" data-v="auto">' + svg('auto') + 'Same as device</button>';
    document.body.appendChild(btn); document.body.appendChild(menu);
    btn.onclick = function (e) { e.stopPropagation(); place(); menu.classList.toggle('open'); };
    menu.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      window.preplineTheme.set(b.getAttribute('data-v'));
      menu.classList.remove('open');
    };
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) menu.classList.remove('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.classList.remove('open'); });
    sync(); place();
    // the account button appears and changes width after sign-in: keep ours next to it
    var tries = 0, iv = setInterval(function () { place(); if (++tries > 20) clearInterval(iv); }, 250);
    window.addEventListener('resize', place);
    if (window.ResizeObserver) {
      var watch = function () { var a = document.querySelector('.pl-auth'); if (a && !a._plWatched) { a._plWatched = 1; new ResizeObserver(place).observe(a); } };
      watch(); setTimeout(watch, 1500);
    }
  }
  /* ---------- phones: a one-time tip that a tablet or laptop is more comfortable ---------- */
  function deviceTip() {
    var K = 'prepline:device-tip';
    try { if (localStorage.getItem(K)) return; } catch (e) { return; }
    if (Math.min(screen.width, screen.height) >= 600 || window.innerWidth >= 700) return;
    if (!/^(mix-|crit-|diagnostic-)/.test(location.pathname.split('/').pop() || '')) return;   // tests only: figures matter there
    var st = document.createElement('style');
    st.textContent =
      '.pl-devtip{position:relative;z-index:50;margin:0 0 14px;display:flex;gap:10px;align-items:center;' +
      'background:#111A2E;border:1px solid rgba(132,174,236,.4);border-radius:10px;padding:8px 8px 8px 12px;font:13px/1.4 Inter,system-ui,sans-serif;color:#D5DDEC}' +
      '.pl-devtip b{color:#E6ECF7}.pl-devtip .ico{font-size:16px}' +
      '.pl-devtip button{margin-left:auto;flex-shrink:0;background:#84AEEC;color:#0B1120;border:0;border-radius:6px;font:700 13px Inter,sans-serif;padding:7px 12px;cursor:pointer}' +
      'html[data-theme=light] .pl-devtip{background:#EEF4FE;border-color:#B9CDF1;color:#26324A}' +
      'html[data-theme=light] .pl-devtip b{color:#0F1B33}html[data-theme=light] .pl-devtip button{background:#1D5FD1;color:#fff}' +
      'body.exam-day .pl-devtip{display:none}';
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.className = 'pl-devtip';
    d.innerHTML = '<span class="ico">💻</span><span><b>Tip:</b> on a tablet or laptop figures are bigger.</span><button type="button" aria-label="Close">✕</button>';
    var host = document.querySelector('main .wrap') || document.querySelector('.wrap') || document.querySelector('main') || document.body;
    host.insertBefore(d, host.firstChild);
    d.querySelector('button').onclick = function () { try { localStorage.setItem(K, '1'); } catch (e) {} d.remove(); };
  }
  function start() { build(); }   // the phone tip (deviceTip) is off: it pushed the first question down
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
