/* Prepline: explanations written by students.
   Test pages (loaded by test-ux.js): added to every .review-item of the results screen.
   Any other page (live.html review): added to every element with data-ex-mock and data-ex-q.
   Needs stage4.sql in Supabase. */
(function () {
  if (window.__preplineExplain) return; window.__preplineExplain = true;
  var TEST = typeof questions !== 'undefined' && typeof state !== 'undefined';
  var PAGE = (location.pathname.split('/').pop() || 'mock').replace('.html', '');
  var MIN = 30, MAX = 1500;
  var counts = {}, countsAt = {}, user = null, open = {};

  function supa() { return window.preplineSupa; }
  function toast(t) { if (window.preplineToast) window.preplineToast(t); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) { return esc(s).replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br>'); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (e) { return ''; } }
  function ago(iso) {
    var d = (Date.now() - Date.parse(iso)) / 1000;
    if (d < 3600) return Math.max(1, Math.round(d / 60)) + ' min ago';
    if (d < 86400) return Math.round(d / 3600) + ' h ago';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  var css = document.createElement('style');
  css.textContent =
    '.ex-bar{display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap}' +
    '.ex-toggle{background:transparent;border:1px solid rgba(255,255,255,.16);color:#B4C0D6;font:600 12.5px Inter,sans-serif;' +
      'padding:5px 12px;border-radius:99px;cursor:pointer}' +
    '.ex-toggle:hover,.ex-toggle.on{border-color:#C9A227;color:#E0BC45}' +
    '.ex-toggle.has{color:#E6ECF7}' +
    '.ex-panel{margin-top:10px;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;text-align:left}' +
    '.ex-item{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}' +
    '.ex-head{font-size:12px;color:#8492AC;margin-bottom:4px}.ex-head b{color:#E6ECF7;font-weight:600}' +
    '.ex-body{font-size:14px;line-height:1.55;color:#E6ECF7;white-space:normal;word-wrap:break-word}' +
    '.ex-acts{display:flex;gap:12px;margin-top:6px;font-size:12px}' +
    '.ex-acts button{background:none;border:0;color:#8492AC;cursor:pointer;font:600 12px Inter,sans-serif;padding:0}' +
    '.ex-acts button:hover{color:#E6ECF7}.ex-acts button.voted{color:#4ADE9A}' +
    '.ex-hidden{font-size:12px;color:#F5C451;margin-top:4px}' +
    '.ex-empty{font-size:13px;color:#8492AC;padding:6px 0 10px}' +
    '.ex-form{margin-top:10px;display:flex;flex-direction:column;gap:8px}' +
    '.ex-form input,.ex-form textarea{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.14);border-radius:6px;' +
      'color:#E6ECF7;font:14px Inter,sans-serif;padding:9px 11px;width:100%;box-sizing:border-box}' +
    '.ex-form textarea{min-height:92px;resize:vertical;line-height:1.5}' +
    '.ex-form input:focus,.ex-form textarea:focus{outline:none;border-color:#C9A227}' +
    '.ex-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
    '.ex-post{background:#C9A227;color:#0E1A2E;border:0;border-radius:5px;font:700 13px Inter,sans-serif;padding:8px 16px;cursor:pointer}' +
    '.ex-post:disabled{opacity:.5;cursor:default}' +
    '.ex-note{font-size:12px;color:#8492AC}.ex-err{font-size:12.5px;color:#F87171}' +
    '.ex-rep{display:flex;gap:6px;margin-top:6px}.ex-rep input{flex:1;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.14);' +
      'border-radius:5px;color:#E6ECF7;font:13px Inter,sans-serif;padding:6px 9px}' +
    '.ex-rep button{background:transparent;border:1px solid #F87171;color:#F87171;border-radius:5px;font:600 12px Inter,sans-serif;padding:5px 10px;cursor:pointer}';
  document.head.appendChild(css);

  async function loadCounts(mock) {
    if (counts[mock] && Date.now() - countsAt[mock] < 30000) return counts[mock];
    var c = counts[mock] = {};
    try {
      var r = await supa().rpc('explanation_counts', { p_mock: mock });
      (r.data || []).forEach(function (x) { c[x.q_id] = x.n; });
    } catch (e) {}
    countsAt[mock] = Date.now();
    return c;
  }

  // [element, mock, question id] for every place that gets an explanation bar
  function targets() {
    var out = [];
    if (TEST && state.finished)
      [].forEach.call(document.querySelectorAll('.review-item'), function (el, i) { if (questions[i]) out.push([el, PAGE, questions[i].id]); });
    [].forEach.call(document.querySelectorAll('[data-ex-mock][data-ex-q]'), function (el) {
      out.push([el, el.getAttribute('data-ex-mock'), +el.getAttribute('data-ex-q')]);
    });
    return out;
  }

  function label(n) { return n ? '💬 ' + n + ' explanation' + (n === 1 ? '' : 's') : '💬 Explain this question'; }

  async function decorate() {
    if (!supa()) return;
    var todo = targets().filter(function (t) { return !t[0].querySelector('.ex-bar'); });
    if (!todo.length) return;
    try { user = (await supa().auth.getUser()).data.user; } catch (e) { user = null; }
    var mocks = {}; todo.forEach(function (t) { mocks[t[1]] = 1; });
    for (var m in mocks) await loadCounts(m);
    todo.forEach(function (t) {
      var el = t[0], q = { mock: t[1], id: t[2] }, c = counts[q.mock] || {};
      if (el.querySelector('.ex-bar')) return;
      var bar = document.createElement('div');
      bar.className = 'ex-bar';
      bar.innerHTML = '<button type="button" class="ex-toggle' + (c[q.id] ? ' has' : '') + '">' + label(c[q.id] || 0) + '</button>';
      var panel = document.createElement('div');
      panel.className = 'ex-panel'; panel.style.display = 'none';
      el.appendChild(bar); el.appendChild(panel);
      bar.firstChild.onclick = function () { toggle(q, bar.firstChild, panel); };
      if (open[q.mock + ':' + q.id]) toggle(q, bar.firstChild, panel);
    });
  }

  function toggle(q, btn, panel) {
    var show = panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    btn.classList.toggle('on', show);
    open[q.mock + ':' + q.id] = show;
    if (show) draw(q, btn, panel);
  }

  async function draw(q, btn, panel) {
    panel.innerHTML = '<div class="ex-empty">Loading…</div>';
    var r = await supa().rpc('explanations_for', { p_mock: q.mock, p_q: q.id });
    if (r.error) { panel.innerHTML = '<div class="ex-err">Explanations are not available yet.</div>'; return; }
    var list = r.data || [];
    var visible = list.filter(function (x) { return x.status === 'visible'; }).length;
    (counts[q.mock] = counts[q.mock] || {})[q.id] = visible;
    btn.textContent = label(visible); btn.classList.toggle('has', !!visible);
    var h = list.length ? '' : '<div class="ex-empty">No explanations yet. If you solved it, explain how — in your own words, the way you would tell a friend.</div>';
    list.forEach(function (x) {
      h += '<div class="ex-item" data-id="' + x.id + '"><div class="ex-head"><b>' + esc(x.name) + '</b> · ' + ago(x.created_at) +
        (x.helpful ? ' · ' + x.helpful + ' found this helpful' : '') + '</div>' +
        '<div class="ex-body">' + fmt(x.body) + '</div>' +
        (x.status !== 'visible' ? '<div class="ex-hidden">Hidden after reports — only you can see it until it is reviewed.</div>' : '') +
        '<div class="ex-acts">' +
        (x.mine ? '<button type="button" data-a="del">Delete</button>'
                : '<button type="button" data-a="vote" class="' + (x.voted ? 'voted' : '') + '">👍 Helpful' + (x.voted ? ' ✓' : '') + '</button>' +
                  '<button type="button" data-a="rep">Report</button>') +
        '</div></div>';
    });
    h += form();
    panel.innerHTML = h;
    wire(q, btn, panel, list);
  }

  function form() {
    if (!user) return '<div class="ex-row" style="margin-top:10px"><button type="button" class="ex-post" data-a="signin">Sign in to write an explanation</button></div>';
    var name = ls('prepline:expl-name') || ls('prepline:live-name');
    return '<div class="ex-form"><input maxlength="40" class="ex-name" placeholder="Your name" value="' + esc(name) + '">' +
      '<textarea class="ex-text" maxlength="' + MAX + '" placeholder="How did you solve it? Key step, the trap in the wrong options, a faster way…"></textarea>' +
      '<div class="ex-row"><button type="button" class="ex-post" data-a="post" disabled>Post explanation</button>' +
      '<span class="ex-note ex-count">0 / ' + MAX + ' · at least ' + MIN + ' characters</span></div><div class="ex-err"></div></div>';
  }

  function wire(q, btn, panel, list) {
    var ta = panel.querySelector('.ex-text'), post = panel.querySelector('[data-a=post]'), err = panel.querySelector('.ex-err');
    if (ta) ta.oninput = function () {
      var n = ta.value.trim().length;
      panel.querySelector('.ex-count').textContent = n + ' / ' + MAX + (n < MIN ? ' · at least ' + MIN + ' characters' : '');
      post.disabled = n < MIN;
    };
    panel.onclick = async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.dataset.a, item = b.closest('.ex-item'), id = item && +item.dataset.id;
      var x = list.find(function (y) { return y.id === id; });
      if (a === 'signin') { var p = document.getElementById('plPill'); if (p) p.click(); return; }
      if (a === 'post') {
        var name = panel.querySelector('.ex-name').value.trim(), body = ta.value.trim();
        if (!name) { err.textContent = 'Write your name — it is shown next to the explanation.'; return; }
        post.disabled = true; err.textContent = '';
        var r = await supa().from('explanations').insert({ mock_id: q.mock, q_id: q.id, name: name, body: body });
        if (r.error) {
          post.disabled = false;
          err.textContent = /row-level security/i.test(r.error.message)
            ? 'Could not post. You can explain only questions you answered while signed in, and up to 15 explanations a day.'
            : 'Could not post: ' + r.error.message;
          return;
        }
        ls('prepline:expl-name', name);
        toast('Thanks! Your explanation is published.');
        draw(q, btn, panel);
        return;
      }
      if (!x) return;
      if (a === 'vote') {
        if (!user) { toast('Sign in to vote.'); return; }
        var v = x.voted ? await supa().from('explanation_votes').delete().eq('expl_id', id).eq('user_id', user.id)
                        : await supa().from('explanation_votes').insert({ expl_id: id });
        if (v.error) toast('Could not vote: ' + v.error.message);
        draw(q, btn, panel);
      } else if (a === 'del') {
        if (!confirm('Delete your explanation?')) return;
        var d = await supa().from('explanations').delete().eq('id', id);
        if (d.error) toast('Could not delete: ' + d.error.message);
        draw(q, btn, panel);
      } else if (a === 'rep') {
        if (!user) { toast('Sign in to report.'); return; }
        if (item.querySelector('.ex-rep')) return;
        item.insertAdjacentHTML('beforeend', '<div class="ex-rep"><input maxlength="300" placeholder="What is wrong? (wrong maths, spam, rude…)"><button type="button" data-a="send">Send report</button></div>');
        item.querySelector('.ex-rep input').focus();
      } else if (a === 'send') {
        var reason = item.querySelector('.ex-rep input').value.trim();
        var s = await supa().from('explanation_reports').insert({ expl_id: id, reason: reason || null });
        if (s.error && !/duplicate/i.test(s.error.message)) { toast('Could not send: ' + s.error.message); return; }
        item.querySelector('.ex-rep').outerHTML = '<div class="ex-note" style="margin-top:6px">Report sent. Thank you.</div>';
      }
    };
  }

  // review screens are redrawn (engine results, live review filters); decorate whenever new items appear
  var busy = false;
  function pending() { return targets().some(function (t) { return !t[0].querySelector('.ex-bar'); }); }
  new MutationObserver(function () {
    if (busy || !pending()) return;
    busy = true;
    setTimeout(function () { decorate().catch(function () {}).then(function () { busy = false; }); }, 50);
  }).observe(document.body, { childList: true, subtree: true });
  if (pending()) decorate();
})();
