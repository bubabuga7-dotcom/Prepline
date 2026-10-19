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
  var moreOn = items.some(function (it) { return it[4] === 'more' && it[0] === kind; }) || page === 'admin.html';
  h += '<button type="button" class="dock-item dock-morebtn' + (moreOn ? ' on' : '') + '" aria-label="More" aria-expanded="false">' +
       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>' +
       '<span class="dock-label">More</span></button>';
  el.innerHTML = h;

  /* phone: secondary pages live in a sheet behind "More" */
  var dst = document.createElement('style');
  dst.textContent = '.dock-morebtn{display:none;background:none;font:inherit;cursor:pointer;padding:0}.dock-sheet{display:none}@media (max-width:780px){main{padding-top:56px}.dock-logo,.dock-sep,.dock-spacer,.dock-tip,.dock-item.dock-more,.dock-item.dock-admin{display:none!important}  .dock{padding-bottom:env(safe-area-inset-bottom);height:calc(64px + env(safe-area-inset-bottom))}.dock-item{width:auto;flex:1;min-width:0;height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.dock-item svg{width:22px;height:22px}.dock-label{display:block;font-size:11.5px;font-weight:600;line-height:1}.dock-morebtn{display:flex;color:var(--ink-3);border:1px solid transparent}.dock-sheet{position:fixed;inset:0;z-index:99;background:rgba(5,8,20,.45)}.dock-sheet.open{display:block}.dock-sheet-box{position:absolute;left:10px;right:10px;bottom:calc(74px + env(safe-area-inset-bottom));background:var(--bg-2,#111A2E);border:1px solid var(--line);border-radius:14px;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;box-shadow:0 14px 40px rgba(0,0,0,.35)}.dock-sheet-box a{display:flex;align-items:center;gap:10px;padding:14px 12px;border-radius:10px;color:var(--ink-2,#D5DDEC);text-decoration:none;font-size:15px;font-weight:600}.dock-sheet-box a.on{background:rgba(201,162,39,.14);color:var(--gold)}.dock-sheet-box svg{width:22px;height:22px;flex:none}}html[data-theme=light] .dock-sheet-box{background:#fff;border-color:#DCE3EE;box-shadow:0 14px 40px rgba(15,27,51,.18)}html[data-theme=light] .dock-sheet-box a{color:#26324A}html[data-theme=light] .dock-sheet-box a.on{background:#E3ECFB;color:#1D5FD1}html[data-theme=light] .dock-morebtn{color:#66748C}';
  document.head.appendChild(dst);
  var sheet = document.createElement('div'); sheet.className = 'dock-sheet';
  function fillSheet() {
    sheet.innerHTML = '<div class="dock-sheet-box">' + [].map.call(el.querySelectorAll('.dock-more, .dock-admin'), function (a) {
      return '<a href="' + a.getAttribute('href') + '" class="' + (a.classList.contains('on') ? 'on' : '') + '">' +
        a.querySelector('svg').outerHTML + '<span>' + a.getAttribute('aria-label') + '</span></a>';
    }).join('') + '</div>';
  }
  document.body.appendChild(sheet);
  var mb = el.querySelector('.dock-morebtn');
  function toggle(open) { fillSheet(); sheet.classList.toggle('open', open); mb.setAttribute('aria-expanded', open); }
  mb.onclick = function (e) { e.stopPropagation(); toggle(!sheet.classList.contains('open')); };
  sheet.onclick = function (e) { if (e.target === sheet) toggle(false); };

  // "Admin" item: only for accounts in the admins table (stage7.sql). Remembered on this device to avoid a flash.
  function addAdmin() {
    if (el.querySelector('.dock-admin')) return;
    var sp = el.querySelector('.dock-spacer'); if (!sp) return;
    var a = document.createElement('a');
    a.href = 'admin.html'; a.className = 'dock-item dock-admin' + (page === 'admin.html' ? ' on' : ''); a.setAttribute('aria-label', 'Admin');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I.admin + '</svg>' +
      '<span class="dock-tip">Admin</span><span class="dock-label">Admin</span>';
    sp.parentNode.insertBefore(a, sp);
  }
  function removeAdmin() { var a = el.querySelector('.dock-admin'); if (a) a.remove(); }
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
