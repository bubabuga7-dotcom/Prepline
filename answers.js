/* Prepline: official explanations ("Why C?") stored with each question as q.explain.
   Free plan: 3 explanations per test attempt (or per topic session); Premium: all.
   Test pages: added under each answer on the results screen.
   Other pages call window.preplineWhy(q, container) after an answer is shown. */
(function () {
  if (window.preplineWhy) return;
  var FREE = 3, opened = {}, L = 'ABCDEFGH';

  function premium() {
    if (!window.preplinePremiumOn || !window.preplinePremiumOn()) return true;   // Premium switched off: everything is free
    return !!(window.preplinePremiumCached && window.preplinePremiumCached());
  }
  function left() { return Math.max(0, FREE - Object.keys(opened).length); }
  function math(el) {
    if (window.renderMathInElement) try {
      renderMathInElement(el, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }], throwOnError: false });
    } catch (e) {}
  }

  var css = document.createElement('style');
  css.textContent =
    '.why{margin-top:8px;font-size:14px;line-height:1.6;text-align:left;width:100%}' +
    '.why summary{cursor:pointer;color:var(--gold,#C9AA6A);font-weight:600;list-style:none;display:inline-flex;gap:6px;align-items:center}' +
    '.why summary::-webkit-details-marker{display:none}' +
    '.why summary::before{content:"▸";font-size:11px;transition:transform .15s}.why[open] summary::before{transform:rotate(90deg)}' +
    '.why .wb{margin-top:6px;padding:10px 12px;border-left:2px solid var(--gold,#C9AA6A);background:rgba(201,170,106,.06);border-radius:0 6px 6px 0}' +
    '.why .wl{font-size:12.5px;margin-top:6px;color:#A6ADB8}.why .wl a{color:var(--gold,#C9AA6A);font-weight:600}' +
    '.why .free{font:600 11px "IBM Plex Mono",monospace;opacity:.7;margin-left:4px}' +
    'html[data-theme=light] .why .wb{background:#EFEDE7}html[data-theme=light] .why .wl{color:#6E7480}';
  document.head.appendChild(css);

  /* q: question with .explain; key: unique id inside this attempt; box: element to append to */
  window.preplineWhy = function (q, box, key) {
    if (!q || !q.explain || !box || box.querySelector('.why')) return;
    key = key || (q.id + '');
    var d = document.createElement('details'); d.className = 'why';
    d.innerHTML = '<summary>Why ' + (L[q.correct] || '') + '?' + (premium() ? '' : '<span class="free"></span>') + '</summary><div class="wb"></div>';
    function label() { var f = d.querySelector('.free'); if (f) f.textContent = opened[key] ? '' : left() ? '· ' + left() + ' free left' : '· Premium'; }
    label();
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      var b = d.querySelector('.wb');
      if (!premium() && !opened[key] && !left()) {
        b.innerHTML = 'You have used the ' + FREE + ' free explanations for this test.<div class="wl"><a href="premium.html?from=why">Premium</a> unlocks every explanation on the site.</div>';
        return;
      }
      if (!opened[key]) { opened[key] = 1; [].forEach.call(document.querySelectorAll('.why'), function (x) { if (x._label) x._label(); }); }
      b.innerHTML = q.explain;
      math(b);
    });
    d._label = label;
    box.appendChild(d);
    return d;
  };
  window.preplineWhyReset = function () { opened = {}; };

  /* test pages: results screen */
  if (typeof questions === 'undefined' || typeof state === 'undefined') return;
  function attach() {
    if (!state.finished) return;
    var items = [].filter.call(document.querySelectorAll('.review-item'), function (it) { return it.querySelector('.mark'); });
    items.forEach(function (it, i) {
      var q = questions[i];
      if (!q || !q.explain || it.querySelector('.why')) return;
      it.style.flexWrap = 'wrap';
      window.preplineWhy(q, it, 'q' + q.id);
    });
  }
  var was = false;
  setInterval(function () {
    if (state.finished && !was) { was = true; window.preplineWhyReset(); }
    if (!state.finished) was = false;
    attach();
  }, 700);
})();
