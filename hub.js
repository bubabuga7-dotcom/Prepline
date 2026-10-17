/* Prepline hub page (math.html / crit.html): renders the test grid from tests.js.
   <body data-kind="math"> or <body data-kind="ct">. */
(function () {
  var kind = document.body.getAttribute('data-kind');
  var all = (window.PREPLINE_TESTS || []).filter(function (t) { return t.kind === kind; });
  var grid = document.getElementById('groups');
  var tabs = document.getElementById('tabs');
  var search = document.getElementById('search');
  var hideDone = document.getElementById('hide-done');
  var results = {};           // id -> {best, total, count}
  var state = { group: 'All', q: '', hide: false };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function title(t) { return t.group === 'Original mock exams' ? t.src : (kind === 'ct' ? 'CT Test ' : 'Test ') + t.n; }

  function loadLocal() {
    all.forEach(function (t) {
      try {
        var h = JSON.parse(localStorage.getItem('prepline:' + t.id) || '[]');
        if (!h.length) return;
        var best = Math.max.apply(null, h.map(function (a) { return a.s; }));
        merge(t.id, best, h[h.length - 1].n || t.q, h.length);
      } catch (e) {}
    });
  }
  function merge(id, best, total, count) {
    var r = results[id];
    if (!r) { results[id] = { best: best, total: total, count: count }; return; }
    if (best / total > r.best / r.total) { r.best = best; r.total = total; }
    r.count = Math.max(r.count, count);
  }

  var groups = [];
  all.forEach(function (t) { if (groups.indexOf(t.group) < 0) groups.push(t.group); });

  function renderTabs() {
    var h = '';
    ['All'].concat(groups).forEach(function (g) {
      var n = g === 'All' ? all.length : all.filter(function (t) { return t.group === g; }).length;
      h += '<button class="tab' + (state.group === g ? ' on' : '') + '" data-g="' + esc(g) + '">' + esc(g) + ' <span class="mono">' + n + '</span></button>';
    });
    tabs.innerHTML = h;
  }

  function tile(t) {
    var r = results[t.id], badge = '';
    if (r) {
      var p = Math.round(100 * r.best / r.total);
      var cls = p >= 70 ? 'ok' : p >= 45 ? 'warn' : 'bad';
      badge = '<span class="score ' + cls + '">' + r.best + '/' + r.total + '</span>';
    }
    return '<a class="tile' + (r ? ' done' : '') + '" href="' + t.id + '.html">' +
      '<div class="tile-top"><span class="num mono">' + (t.group === 'Original mock exams' ? 'EXAM' : '#' + t.n) + '</span>' + badge + '</div>' +
      '<h3>' + esc(title(t)) + '</h3>' +
      '<p class="src">' + esc(t.src || '') + '</p>' +
      '<div class="tile-foot mono"><span>' + t.q + ' q</span><span>' + t.min + ' min</span>' +
      (r ? '<span class="tries">' + r.count + (r.count === 1 ? ' attempt' : ' attempts') + '</span>' : '<span class="go">Start →</span>') +
      '</div></a>';
  }

  function render() {
    var q = state.q.trim().toLowerCase(), h = '', shown = 0;
    groups.forEach(function (g) {
      if (state.group !== 'All' && state.group !== g) return;
      var list = all.filter(function (t) {
        if (t.group !== g) return false;
        if (state.hide && results[t.id]) return false;
        if (q && (title(t) + ' ' + t.n + ' ' + (t.src || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if (!list.length) return;
      shown += list.length;
      h += '<section class="group"><div class="group-head"><h2>' + esc(g) + '</h2><span class="mono">' + list.length + ' tests</span></div>' +
           '<div class="tiles">' + list.map(tile).join('') + '</div></section>';
    });
    grid.innerHTML = h || '<p class="empty">No tests match. Clear the search or show completed tests.</p>';
    renderStats();
  }

  function renderStats() {
    var done = all.filter(function (t) { return results[t.id]; });
    var qs = all.reduce(function (s, t) { return s + t.q; }, 0);
    var avg = done.length ? Math.round(done.reduce(function (s, t) { var r = results[t.id]; return s + 100 * r.best / r.total; }, 0) / done.length) + '%' : '—';
    document.getElementById('st-tests').textContent = all.length;
    document.getElementById('st-q').textContent = qs.toLocaleString('en-US');
    document.getElementById('st-done').textContent = done.length + ' / ' + all.length;
    document.getElementById('st-avg').textContent = avg;
    var bar = document.getElementById('done-bar');
    if (bar) bar.style.width = (100 * done.length / Math.max(all.length, 1)) + '%';
    var next = all.filter(function (t) { return !results[t.id] && t.group !== 'Original mock exams'; })[0];
    var nx = document.getElementById('next');
    if (next && nx) {
      nx.querySelector('.next-name').textContent = title(next);
      nx.querySelector('.next-src').textContent = (next.src ? next.src + ' · ' : '') + next.q + ' questions · ' + next.min + ' min';
      nx.querySelector('a.btn').href = next.id + '.html';
      nx.querySelector('.next-label').textContent = done.length ? 'Next up' : 'Start here';
    }
  }

  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (!b) return;
    state.group = b.getAttribute('data-g'); renderTabs(); render();
  });
  search.addEventListener('input', function () { state.q = search.value; render(); });
  hideDone.addEventListener('change', function () { state.hide = hideDone.checked; render(); });

  search.placeholder = kind === 'ct' ? 'Find: 24, TSA 2019, IMAT…' : 'Find: 23, Kiseki, Trial Test…';
  loadLocal(); renderTabs(); render();

  // cloud results for signed-in users
  var supa = window.preplineSupa;
  if (supa) {
    var pull = function () {
      supa.auth.getUser().then(function (u) {
        if (!u.data || !u.data.user) return;
        supa.from('results').select('mock_id,score,total').then(function (res) {
          if (res.error || !res.data) return;
          var cnt = {};
          res.data.forEach(function (r) { cnt[r.mock_id] = (cnt[r.mock_id] || 0) + 1; });
          res.data.forEach(function (r) { merge(r.mock_id, r.score, r.total || 30, cnt[r.mock_id]); });
          render();
        });
      });
    };
    supa.auth.onAuthStateChange(pull); pull();
  }
})();
