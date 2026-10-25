/* Prepline private lock: the whole site is closed. Only the owner's account can see any page.
   Loaded first in <head>; hides the page until the signed-in email is confirmed.
   To reopen the site: remove the <script src="lock.js"> line from the pages (python lock-site.py off). */
(function () {
  var OWNER = 'bubabuga7@gmail.com';
  var URL = 'https://spwavetenjuvvohlnsvx.supabase.co';
  var KEY = 'sb_publishable_8mO7x7XYroNYlL4n_yzoRw_FIK0z5MY';

  var hide = document.createElement('style');
  hide.id = 'pl-lock-hide';
  hide.textContent = 'html.pl-locked body>*:not(#pl-lock){display:none!important}html.pl-locked body{background:#15181D!important}';
  document.documentElement.classList.add('pl-locked');
  (document.head || document.documentElement).appendChild(hide);

  function unlock() {
    document.documentElement.classList.remove('pl-locked');
    var s = document.getElementById('pl-lock'); if (s) s.remove();
  }

  function screen(client, msg) {
    var run = function () {
      var old = document.getElementById('pl-lock'); if (old) old.remove();
      var d = document.createElement('div');
      d.id = 'pl-lock';
      d.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#15181D;color:#DADDE2;font:16px system-ui,sans-serif;padding:24px');
      d.innerHTML =
        '<form style="width:100%;max-width:340px;text-align:center">' +
        '<div style="font:700 26px system-ui;color:#C9AA6A;margin-bottom:6px">Prepline</div>' +
        '<p style="color:#A6ADB8;margin:0 0 18px">The site is temporarily closed.</p>' +
        '<input name="e" type="email" placeholder="Email" autocomplete="username" required style="width:100%;box-sizing:border-box;padding:12px;margin-bottom:10px;border-radius:10px;border:1px solid #333a44;background:#1d2128;color:#DADDE2;font-size:16px">' +
        '<input name="p" type="password" placeholder="Password" autocomplete="current-password" required style="width:100%;box-sizing:border-box;padding:12px;margin-bottom:12px;border-radius:10px;border:1px solid #333a44;background:#1d2128;color:#DADDE2;font-size:16px">' +
        '<button style="width:100%;padding:12px;border:0;border-radius:10px;background:#C9AA6A;color:#15181D;font-weight:700;font-size:16px;cursor:pointer">Sign in</button>' +
        '<p data-m style="color:#e08a8a;min-height:1.2em;margin:12px 0 0">' + (msg || '') + '</p></form>';
      document.body.appendChild(d);
      var f = d.querySelector('form'), m = d.querySelector('[data-m]');
      f.onsubmit = function (ev) {
        ev.preventDefault();
        if (!client) { m.textContent = 'Could not reach the server. Reload the page.'; return; }
        m.style.color = '#A6ADB8'; m.textContent = 'Checking…';
        client.auth.signInWithPassword({ email: f.e.value.trim(), password: f.p.value }).then(function (r) {
          if (r.error) { m.style.color = '#e08a8a'; m.textContent = 'Wrong email or password.'; return; }
          check(client);
        });
      };
    };
    if (document.body) run(); else document.addEventListener('DOMContentLoaded', run);
  }

  function check(client) {
    client.auth.getSession().then(function (r) {
      var u = r && r.data && r.data.session && r.data.session.user;
      var email = u && u.email ? u.email.toLowerCase() : '';
      if (email === OWNER) { unlock(); return; }
      if (u) client.auth.signOut();            // any other account is signed out and stays locked
      screen(client, u ? 'This account has no access.' : '');
    }, function () { screen(client); });
  }

  function start() {
    if (window.supabase && window.supabase.createClient) {
      check(window.preplineLockClient || (window.preplineLockClient = window.supabase.createClient(URL, KEY)));
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = start;
    s.onerror = function () { screen(null, 'Could not reach the server. Reload the page.'); };
    (document.head || document.documentElement).appendChild(s);
  }
  start();
})();
