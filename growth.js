/* Prepline: saved questions (bookmarks), invite-a-friend referrals and push reminders.
   Loaded by prepline-supabase.js on every page that talks to Supabase. */
(function () {
  if (window.__plGrowth) return; window.__plGrowth = 1;
  var supa = window.preplineSupa;
  var VAPID = 'BErz95dsW-bEGAGgujpJc4MDE08Rfa9Duv-ZEzNYRYoDQ5Bmy9vqcylnIAmjrzXZ8hpmGzLUyd62xBQKVI-g7Fk';
  var page = (location.pathname.split('/').pop() || 'index').replace('.html', '');
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function user() { return supa ? supa.auth.getUser().then(function (r) { return r.data.user; }, function () { return null; }) : Promise.resolve(null); }

  /* =================== referrals =================== */
  var ref = new URLSearchParams(location.search).get('ref');
  if (ref && /^[a-z0-9]{6}$/i.test(ref)) ls('prepline:ref', ref.toLowerCase());
  function claim() {
    var code = ls('prepline:ref'); if (!code || !supa) return;
    supa.rpc('claim_referral', { p_code: code }).then(function (r) {
      if (r.error) return;                       // try again on the next sign-in
      ls('prepline:ref', null);
      if (r.data === 'ok' && window.preplineToast) window.preplineToast('Welcome! Your friend gets a week of Premium once you finish your first test.');
    });
  }
  window.preplineReferral = function () {
    // signed-out visitors have no referral code: skip the request instead of getting a 401
    return supa.auth.getSession().then(function (s) {
      if (!s || !s.data || !s.data.session) return { error: 1 };
      return supa.rpc('my_referral');
    }).then(function (r) {
      if (r.error || !r.data) return null;
      r.data.link = 'https://bubabuga7-dotcom.github.io/Prepline/?ref=' + r.data.code;
      return r.data;
    });
  };

  /* =================== bookmarks =================== */
  var BKEY = 'prepline:bookmarks';
  var marks = {};                                  // "mock:q" -> 1
  try { (JSON.parse(ls(BKEY) || '[]')).forEach(function (k) { marks[k] = 1; }); } catch (e) {}
  function saveLocal() { ls(BKEY, JSON.stringify(Object.keys(marks))); }
  var signedIn = false;
  function pull() {
    return supa.from('bookmarks').select('mock_id,q_id').limit(2000).then(function (r) {
      if (r.error) return;
      var local = Object.keys(marks), server = {};
      (r.data || []).forEach(function (b) { server[b.mock_id + ':' + b.q_id] = 1; });
      var up = local.filter(function (k) { return !server[k]; }).map(function (k) { var p = k.split(':'); return { mock_id: p[0], q_id: +p[1] }; });
      if (up.length) supa.from('bookmarks').upsert(up, { onConflict: 'user_id,mock_id,q_id', ignoreDuplicates: true }).then(function () {});
      Object.keys(server).forEach(function (k) { marks[k] = 1; });
      saveLocal(); paint();
      document.dispatchEvent(new Event('prepline:bookmarks'));
    });
  }
  window.preplineBookmarks = {
    has: function (mock, q) { return !!marks[mock + ':' + q]; },
    list: function () { return Object.keys(marks).map(function (k) { var p = k.split(':'); return { mock_id: p[0], q_id: +p[1] }; }); },
    ready: function () { return user().then(function (u) { signedIn = !!u; return u ? pull() : null; }); },
    toggle: function (mock, q) {
      var k = mock + ':' + q, on = !marks[k];
      if (on) marks[k] = 1; else delete marks[k];
      saveLocal(); paint();
      if (signedIn) {
        var t = supa.from('bookmarks');
        (on ? t.upsert({ mock_id: mock, q_id: q }, { onConflict: 'user_id,mock_id,q_id', ignoreDuplicates: true })
            : t.delete().eq('mock_id', mock).eq('q_id', q)).then(function () {});
      }
      if (on && window.preplineToast) window.preplineToast(signedIn ? 'Saved. Find it in Saved questions.' : 'Saved on this device. Sign in to keep it everywhere.');
      return on;
    }
  };

  /* star buttons inside tests: next to "Report an error", and on the results list */
  var css = document.createElement('style');
  css.textContent = '.pl-bm{background:none;border:1px solid rgba(255,255,255,.16);color:#A6ADB8;border-radius:5px;font:600 12px Inter,sans-serif;' +
    'padding:4px 10px;cursor:pointer;margin:0 8px 10px 0}.pl-bm:hover{border-color:#C9AA6A;color:#C9AA6A}' +
    '.pl-bm.on{background:rgba(201,170,106,.16);border-color:#C9AA6A;color:#C9AA6A}' +
    '.review-item .pl-bm{margin:8px 0 0;align-self:flex-start}';
  document.head.appendChild(css);
  var QS = function () { return typeof QUESTIONS !== 'undefined' ? QUESTIONS : (typeof questions !== 'undefined' ? questions : null); };
  function btn(qid) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pl-bm'; b.dataset.q = qid;
    b.onclick = function (e) { e.stopPropagation(); window.preplineBookmarks.toggle(page, +qid); };
    return b;
  }
  function paint() {
    [].forEach.call(document.querySelectorAll('.pl-bm'), function (b) {
      var on = !!marks[page + ':' + b.dataset.q];
      // write only on change: every write is a DOM mutation that re-triggers the observer below (was an endless loop)
      var label = on ? '★ Saved' : '☆ Save';
      if (b.classList.contains('on') !== on) b.classList.toggle('on', on);
      if (b.textContent !== label) b.textContent = label;
    });
  }
  function decorate() {
    var qs = QS(); if (!qs || typeof state === 'undefined') return;
    // the engine redraws the report button on every render: drop stars that lost it
    [].forEach.call(document.querySelectorAll('.pl-bm'), function (b) {
      if (b.closest('.review-item')) return;
      var nx = b.nextElementSibling;               // the star sits right before the report button
      if (!nx || !nx.classList.contains('pl-rep')) b.remove();
    });
    // one-at-a-time view and scroll view: after the report button
    [].forEach.call(document.querySelectorAll('.pl-rep'), function (rep) {
      var holder = rep.closest('.pl-q'), q;
      if (holder) q = qs.filter(function (x) { return 'pl-q-' + x.id === holder.id; })[0];
      else if (!state.finished) q = qs[state.idx];
      if (!q) return;
      var pv = rep.previousElementSibling;          // keep the report button next to the options: its own script expects that
      if (pv && pv.classList.contains('pl-bm')) { if (pv.dataset.q !== String(q.id)) pv.dataset.q = q.id; return; }
      rep.insertAdjacentElement('beforebegin', btn(q.id));
    });
    // results list
    if (state.finished) [].forEach.call(document.querySelectorAll('#app .review-item'), function (it) {
      if (it.style.flexDirection !== 'column' || it.querySelector('.pl-bm')) return;
      var m = (it.textContent || '').trim().match(/^(\d+)\./); if (!m) return;
      it.appendChild(btn(m[1]));
    });
    paint();
  }
  if (QS()) {
    var busy = false;
    new MutationObserver(function () {
      if (busy) return; busy = true;
      requestAnimationFrame(function () { busy = false; decorate(); });
    }).observe(document.body, { childList: true, subtree: true });
    decorate();
  }

  /* =================== push reminders =================== */
  function b64(s) {
    var p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    var a = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i); return a;
  }
  function reg() { return navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }); }
  function store(sub) {
    var j = sub.toJSON();
    return supa.rpc('save_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_device: ls('prepline:device') });
  }
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  window.preplinePush = {
    // 'unsupported' | 'install' (iPhone outside the home-screen app) | 'blocked' | 'on' | 'off'
    state: function () {
      if (ios && !standalone) return Promise.resolve('install');
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return Promise.resolve('unsupported');
      if (Notification.permission === 'denied') return Promise.resolve('blocked');
      return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) { return s ? 'on' : 'off'; }, function () { return 'unsupported'; });
    },
    enable: function () {
      return Notification.requestPermission().then(function (p) {
        if (p !== 'granted') throw new Error(p === 'denied' ? 'blocked' : 'dismissed');
        return reg();
      }).then(function (r) {
        return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) }); });
      }).then(function (s) { return store(s).then(function (res) { if (res.error) throw res.error; return 'on'; }); });
    },
    disable: function () {
      return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) {
        if (!s) return 'off';
        var ep = s.endpoint;
        return s.unsubscribe().then(function () { return supa.rpc('delete_push', { p_endpoint: ep }); }).then(function () { return 'off'; });
      });
    }
  };
  // link an existing subscription to the account after sign-in, so streak reminders can find it
  function relink() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) { if (s) store(s); }).catch(function () {});
  }

  /* =================== on sign-in =================== */
  if (supa) {
    supa.auth.onAuthStateChange(function (ev) {
      if (ev === 'SIGNED_IN') { signedIn = true; setTimeout(function () { claim(); pull(); relink(); }, 0); }
      if (ev === 'SIGNED_OUT') { signedIn = false; }
    });
    user().then(function (u) { if (u) { signedIn = true; claim(); pull(); } });
  }
})();
