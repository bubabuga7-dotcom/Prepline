/* Shyn sign-up nudge for test pages.
   Guests can take any test to the end and see their results without an account.
   Diagnostics never show the nudge mid-test. On other tests it appears once, after FREE answers,
   and once more when a guest finishes; both times "Continue without an account" closes it.
   The clock is paused while the window is open. */
(function () {
  var FREE = 10;
  var DIAG = /diagnostic-/.test(location.pathname);
  var gate = document.getElementById('pl-gate');
  if (!gate) return;
  var h3 = gate.querySelector('h3'), p = gate.querySelector('p'), go = document.getElementById('plGateGo');
  var back = document.getElementById('plGateBack');
  var signedIn = null, frozen = null, freezeId = null, shownMid = false, shownEnd = false;

  function answered() {
    try { return typeof state !== 'undefined' && state.answers ? Object.keys(state.answers).length : 0; } catch (e) { return 0; }
  }
  function finished() { try { return typeof state !== 'undefined' && state.finished; } catch (e) { return false; } }

  function show(atEnd) {
    if (gate.classList.contains('on')) return;
    var n = answered();
    if (atEnd) {
      h3.textContent = 'Done — want to keep this result?';
      p.innerHTML = 'Your results are below either way. A free account saves them, so you can see your progress, ' +
        'redo your mistakes and pick up on any device.';
    } else {
      h3.textContent = 'Nice pace — ' + n + ' answered';
      p.innerHTML = 'You can finish this test without an account. A free account saves your answers and results, ' +
        'so you can see your progress and redo your mistakes later.';
    }
    go.textContent = 'Create a free account';
    back.textContent = atEnd ? 'See my results' : 'Continue without an account';
    gate.classList.add('on');
    if (atEnd) return;
    try {                                       // pause the clock while the window is open
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
    hide();
    var pill = document.getElementById('plPill');
    if (pill) pill.click();
  };
  back.onclick = hide;
  gate.addEventListener('click', function (e) { if (e.target === gate) hide(); });

  // guests: one nudge mid-test (not on diagnostics), one when they finish
  var timer = null;
  function watch() {
    clearInterval(timer);
    timer = setInterval(function () {
      if (signedIn !== false) return;
      if (document.querySelector('.pl-modal-bg.open')) return;
      if (finished()) {
        if (!shownEnd) { shownEnd = true; setTimeout(function () { show(true); }, 1200); }
        clearInterval(timer); return;
      }
      if (!DIAG && !shownMid && answered() >= FREE) { shownMid = true; setTimeout(function () { show(false); }, 600); }
    }, 400);
  }

  function check() {
    var supa = window.preplineSupa;
    if (!supa) return;                          // database did not load: never block the test
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
