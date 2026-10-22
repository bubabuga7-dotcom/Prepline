/* Prepline shared side menu. Put <aside class="dock" id="dock"></aside> on a page and load this script. */
(function () {
  var el = document.getElementById('dock');
  if (!el) return;
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var kind = page.indexOf('mix-') === 0 || page.indexOf('test') === 0 || page === 'diagnostic-math.html' ? 'math.html'
           : page.indexOf('crit-') === 0 || page === 'diagnostic-crit.html' ? 'crit.html' : page;
  var I = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    dash: '<rect x="3" y="3" width="8" height="9" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/>',
    math: '<path d="M5 5h14L11 12l8 7H5"/>',
    ct: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 1.9-2.6 2.4-2.6 4"/><path d="M12 17h.01"/>',
    live: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
    league: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/>',
    deck: '<rect x="4" y="6" width="13" height="15" rx="2"/><path d="M8 3h10a2 2 0 0 1 2 2v12"/><path d="m8 13 2 2 4-4"/>',
    fx: '<path d="M8 20c2.5 0 2.5-16 5-16 1.2 0 2 .8 2 2"/><path d="M6 11h7"/><path d="M15 13l5 6M20 13l-5 6"/>',
    topic: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    admin: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/>'
  };
  var items = [
    ['index.html', 'Home', 'Home', I.home],
    ['dashboard.html', 'Dashboard', 'Progress', I.dash],
    'sep',
    ['math.html', 'Mathematics', 'Math', I.math],
    ['crit.html', 'Critical Thinking', 'CT', I.ct],
    ['topics.html', 'Train by topic', 'Topics', I.topic],
    ['formulas.html', 'Formula quiz', 'Formulas', I.fx, 'more'],
    ['review.html', 'Mistakes deck', 'Review', I.deck, 'more'],
    ['saved.html', 'Saved questions', 'Saved', I.star, 'more'],
    ['live.html', 'Live room', 'Live', I.live, 'more'],
    ['league.html', 'League', 'League', I.league, 'more'],
    'spacer',
    ['intro.html', 'What is NUET', 'NUET', I.info, 'more']
  ];
  var h = '<a href="index.html" class="dock-logo" aria-label="Prepline home">P</a>';
  items.forEach(function (it) {
    if (it === 'sep') { h += '<div class="dock-sep"></div>'; return; }
    if (it === 'spacer') { h += '<div class="dock-spacer"></div>'; return; }
    h += '<a href="' + it[0] + '" class="dock-item' + (it[0] === kind ? ' on' : '') + (it[4] === 'more' ? ' dock-more' : '') + '" aria-label="' + it[1] + '">' +
         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + it[3] + '</svg>' +
         '<span class="dock-tip">' + it[1] + '</span><span class="dock-label">' + it[2] + '</span></a>';
  });
  el.innerHTML = h;

  /* phone: no bottom bar. The home page is the menu (big buttons in the middle of the screen);
     every other page gets a sticky top bar with one "Menu" button back to it. */
  window.PL_NAV = { items: items.filter(function (it) { return Array.isArray(it); }), icons: I };
  var dst = document.createElement('style');
  dst.textContent =
    '.pl-top{display:none}' +
    '@media (max-width:780px){' +
      '.dock{display:none!important}body{padding-bottom:0!important}main{margin-left:0!important;padding-top:0!important}' +
      '.pl-top{display:flex;position:sticky;top:0;z-index:90;height:64px;align-items:center;gap:10px;padding:0 112px 0 14px;' +
        'background:var(--bg,#15181D);border-bottom:1px solid var(--line,rgba(255,255,255,.12))}' +
      '.pl-menu{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 16px 0 12px;border-radius:12px;' +
        'background:rgba(201,170,106,.14);border:1px solid rgba(201,170,106,.45);color:var(--gold,#C9AA6A);font:700 15px Inter,system-ui,sans-serif;text-decoration:none}' +
      '.pl-menu svg{width:20px;height:20px}' +
      '.pl-brand{font:700 19px Sora,sans-serif;color:var(--ink,#DADDE2);text-decoration:none;letter-spacing:-.02em}' +
      '.pl-brand i{font-style:normal;color:var(--gold,#C9AA6A)}' +
      /* less reading on hubs */
      'body[data-kind] .hub-head>div:first-child>p,body[data-kind] .hub-head>div:first-child>.kicker,' +
      'body[data-kind] .stats,body[data-kind] .progress,.foot-note{display:none!important}' +
      '#tagline,.panel.about,.wrap>.head>.kicker,.wrap>.head>p{display:none!important}' +
    '}' +
    'html[data-theme=light] .pl-top{background:#FBFAF7;border-color:#E1DED7}' +
    'html[data-theme=light] .pl-menu{background:#E4E9F1;border-color:#C3CEDF;color:#3D63A3}' +
    'html[data-theme=light] .pl-brand i{color:#3D63A3}';
  document.head.appendChild(dst);
  var bar = document.createElement('div'); bar.className = 'pl-top';
  bar.innerHTML = page === 'index.html'
    ? '<a href="index.html" class="pl-brand">Prep<i>line</i></a>'
    : '<a href="index.html" class="pl-menu" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>Menu</a>';
  document.body.insertBefore(bar, document.body.firstChild);

  // "Admin" item: only for accounts in the admins table (stage7.sql). Remembered on this device to avoid a flash.
  function addAdmin() {
    if (el.querySelector('.dock-admin')) return;
    var sp = el.querySelector('.dock-spacer'); if (!sp) return;
    var a = document.createElement('a');
    a.href = 'admin.html'; a.className = 'dock-item dock-admin' + (page === 'admin.html' ? ' on' : ''); a.setAttribute('aria-label', 'Admin');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I.admin + '</svg>' +
      '<span class="dock-tip">Admin</span><span class="dock-label">Admin</span>';
    sp.parentNode.insertBefore(a, sp);
    addTile();
  }
  // phone: the dock is hidden, so admins get an "Admin" tile in the home-page menu grid
  function addTile() {
    var g = document.getElementById('m-grid');
    if (!g || !g.children.length || g.querySelector('.m-admin')) return;
    var t = document.createElement('a'); t.className = 'm-tile m-admin'; t.href = 'admin.html';
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I.admin + '</svg>' +
      '<span><b>Admin</b><em>site panel</em></span>';
    g.appendChild(t);
  }
  window.PL_NAV_ADMIN_TILE = function () { try { if (localStorage.getItem('prepline:admin') === '1') addTile(); } catch (e) {} };
  function removeAdmin() { var a = el.querySelector('.dock-admin'); if (a) a.remove(); var t = document.querySelector('#m-grid .m-admin'); if (t) t.remove(); }
  function remember(v) { try { v ? localStorage.setItem('prepline:admin', '1') : localStorage.removeItem('prepline:admin'); } catch (e) {} }
  try { if (localStorage.getItem('prepline:admin') === '1') addAdmin(); } catch (e) {}
  function check() {
    var supa = window.preplineSupa; if (!supa) return;
    supa.auth.getSession().then(function (r) {
      if (!r.data || !r.data.session) { removeAdmin(); remember(false); return; }
      return supa.rpc('is_admin').then(function (x) {
        if (x.error) return;                       // stage7.sql not run or offline: leave as is
        if (x.data === true) { addAdmin(); remember(true); } else { removeAdmin(); remember(false); }
      });
    }).catch(function () {});
  }
  window.addEventListener('load', function () {
    check();
    var supa = window.preplineSupa;
    supa && supa.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') check(); });
  });
})();
