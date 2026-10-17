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
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/>'
  };
  var items = [
    ['index.html', 'Home', 'Home', I.home],
    ['dashboard.html', 'Dashboard', 'Progress', I.dash],
    'sep',
    ['math.html', 'Mathematics', 'Math', I.math],
    ['crit.html', 'Critical Thinking', 'CT', I.ct],
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
