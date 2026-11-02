/* Shyn: on phones, picture questions that have been converted to text are shown as real text
   (readable, follows the page's A−/A+ size) instead of the scanned picture. Desktop keeps the picture.
   Data: mtext/<set>.json = { "images/ct-pp/ct059_q02.webp": { "p": [paragraphs], "o": [options] } }.
   Only questions whose text was checked against the picture are in these files; everything else
   (diagrams, tables, charts) stays a picture. */
(function () {
  var SETS = ['ct059'];                       // which sets have text files
  var IMG = 'img.q-img, img.question-img, img.pl-img';
  var L = 'ABCDEFGH';
  function phone() { return window.matchMedia('(max-width: 780px)').matches; }
  if (!phone()) return;

  var css = document.createElement('style');
  css.textContent =
    '.mt-on > img.mt-src, .mt-on > .pl-tap, .mt-on > .zm-btn, .mt-on > .pl-zoom{display:none!important}' +
    '.mtext{font:400 16.5px/1.6 Inter,system-ui,sans-serif;color:var(--ink,#DADDE2);margin:0 0 14px}' +
    '.mtext p{margin:0 0 12px;white-space:pre-line}' +
    '.mtext .mt-q{font-weight:600}' +
    '.mtext ol{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:8px}' +
    '.mtext li{display:flex;gap:10px;padding:9px 12px;border-radius:10px;background:rgba(157,184,220,.08);border:1px solid rgba(157,184,220,.18)}' +
    '.mtext li b{color:var(--gold,#9DB8DC);min-width:14px}' +
    'html[data-theme=light] .mtext{color:#22262C}' +
    'html[data-theme=light] .mtext li{background:#F1F3F7;border-color:#DDE3EC}' +
    'html[data-theme=light] .mtext li b{color:#3D63A3}';
  document.head.appendChild(css);

  var data = {}, loading = {};
  function key(img) {
    var a = img.getAttribute('src') || ''; a = a.split('?')[0];
    var i = a.indexOf('images/'); return i >= 0 ? a.slice(i) : a;
  }
  function setOf(k) { var m = /\/([a-z]+\d+)_q\d+\./.exec(k); return m && SETS.indexOf(m[1]) >= 0 ? m[1] : null; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function apply(img) {
    var k = key(img), q = data[k];
    if (!q) return;
    var par = img.parentNode, old = par.querySelector(':scope > .mtext');
    if (img.dataset.mt === k && old) return;
    if (old) old.remove();
    img.dataset.mt = k;
    var last = q.p.length - 1, h = '';
    q.p.forEach(function (p, i) {
      var t = esc(p);
      if (i === last) t = t.replace(/\b(not|NOT|cannot|least|most)\b/g, '<b>$1</b>');
      h += '<p' + (i === last ? ' class="mt-q"' : '') + '>' + t + '</p>';
    });
    h += '<ol>' + q.o.map(function (o, i) { return '<li><b>' + L[i] + '</b><span>' + esc(o) + '</span></li>'; }).join('') + '</ol>';
    var d = document.createElement('div'); d.className = 'mtext'; d.innerHTML = h;
    img.classList.add('mt-src'); par.classList.add('mt-on');
    img.insertAdjacentElement('afterend', d);
  }
  function unapply(img) {               // the page reused this <img> for a question without text
    var par = img.parentNode; delete img.dataset.mt; img.classList.remove('mt-src');
    if (!par) return; par.classList.remove('mt-on');
    var old = par.querySelector(':scope > .mtext'); if (old) old.remove();
  }

  function scan() {
    [].forEach.call(document.querySelectorAll(IMG), function (img) {
      var k = key(img), s = setOf(k);
      if (img.dataset.mt && img.dataset.mt !== k) unapply(img);
      if (!s) return;
      if (data[k]) return apply(img);
      if (loading[s]) return;
      loading[s] = fetch('mtext/' + s + '.json').then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (j) { for (var x in j) data[x] = j[x]; scan(); }).catch(function () {});
    });
  }
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
})();
