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
    topic: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/>'
  };
  var items = [
    ['index.html', 'Home', 'Home', I.home],
    ['dashboard.html', 'Dashboard', 'Progress', I.dash],
    'sep',
    ['math.html', 'Mathematics', 'Math', I.math],
    ['crit.html', 'Critical Thinking', 'CT', I.ct],
    ['topics.html', 'Train by topic', 'Topics', I.topic],
    ['review.html', 'Mistakes deck', 'Review', I.deck],
    ['live.html', 'Live room', 'Live', I.live],
    ['league.html', 'League', 'League', I.league],
    'spacer',
    ['intro.html', 'What is NUET', 'NUET', I.info]
  ];
  var h = '<a href="index.html" class="dock-logo" aria-label="Prepline home">P</a>';
  items.forEach(function (it) {
    if (it === 'sep') { h += '<div class="dock-sep"></div>'; return; }
    if (it === 'spacer') { h += '<div class="dock-spacer"></div>'; return; }
    h += '<a href="' + it[0] + '" class="dock-item' + (it[0] === kind ? ' on' : '') + '" aria-label="' + it[1] + '">' +
         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + it[3] + '</svg>' +
         '<span class="dock-tip">' + it[1] + '</span><span class="dock-label">' + it[2] + '</span></a>';
  });
  el.innerHTML = h;
})();
