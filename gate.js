/* Prepline sign-in gate for test pages.
   Guests can try the first few questions without an account; then the gate asks them to sign up.
   Their answers stay in place and the clock is paused while the gate is open. */
(function () {
  var FREE = 3;
  var gate = document.getElementById('pl-gate');
  if (!gate) return;
  var h3 = gate.querySelector('h3'), p = gate.querySelector('p'), go = document.getElementById('plGateGo');
  var signedIn = null, frozen = null, freezeId = null;

  function answered() {
    try { return typeof state !== 'undefined' && state.answers ? Object.keys(state.answers).length : 0; } catch (e) { return 0; }
  }
  function finished() { try { return typeof state !== 'undefined' && state.finished; } catch (e) { return false; } }

  function show() {
    if (gate.classList.contains('on')) return;
    var n = answered();
    h3.textContent = 'Nice start — save your progress';
    p.innerHTML = 'You have answered <b>' + n + '</b> question' + (n === 1 ? '' : 's') + '. Create a free account to finish this test. ' +
      'Your answers stay where they are, and you get your results, the mistakes deck and a daily streak.';
    go.textContent = 'Create a free account';
    gate.classList.add('on');
    try {                                       // pause the clock
      clearInterval(freezeId);
      if (frozen == null) frozen = state.timeLeft;
      freezeId = setInterval(function () { if (frozen != null) state.timeLeft = frozen; }, 200);
    } catch (e) {}
  }
  function hide() {
    gate.classList.remove('on');
    clearInterval(freezeId); freezeId = null; frozen = null;
  }

  go.onclick = function () {
    gate.classList.remove('on');               // the sign-in window opens on top; the clock stays paused
    var pill = document.getElementById('plPill');
    if (pill) pill.click();
    setTimeout(function () { if (signedIn === false) watch(); }, 0);
  };
  document.getElementById('plGateBack').onclick = function () {
    location.href = /crit-\d/.test(location.pathname) ? 'crit.html' : 'math.html';
  };

  // guests: watch the number of answers, open the gate once the free questions are used
  var timer = null;
  function watch() {
    clearInterval(timer);
    timer = setInterval(function () {
      if (signedIn !== false) return;
      if (finished()) { show(); return; }       // finished as a guest: results need an account
      if (answered() >= FREE && !gate.classList.contains('on') && !document.querySelector('.pl-modal-bg.open')) {
        clearInterval(timer);
        setTimeout(show, 600);                  // let them see the option they just picked
      }
    }, 300);
  }

  function check() {
    var supa = window.preplineSupa;
    if (!supa) return;                          // database did not load: do not block the test
    supa.auth.getUser().then(function (r) {
      signedIn = !!(r.data && r.data.user);
      if (signedIn) { clearInterval(timer); hide(); }
      else watch();
    }, function () {});
  }

  setTimeout(check, 300);
  var supa = window.preplineSupa;
  if (supa && supa.auth && supa.auth.onAuthStateChange) supa.auth.onAuthStateChange(function () { check(); });
})();
