/* Prepline: answer image questions by tapping the option on the picture.
   option-map.json (build-optmap.py) gives the box of each option A-E inside a question image.
   For a mapped image the answer buttons under it are hidden and transparent tap areas sit over the options;
   a tap clicks the real (hidden) button, so the test engine, autosave, keyboard and results work unchanged.
   Images without a map keep their buttons. */
(function () {
  if (window.__plTap) return; window.__plTap = 1;
  var LET = 'ABCDEFGH';
  var KINDS = [
    { img: 'img.question-img', box: '.options', btn: '.opt', idx: 'i' },     // one question at a time
    { img: 'img.pl-img', box: '.pl-opts', btn: '.pl-opt', idx: 'i' },       // scroll view
    { img: 'img.q-img', box: '#opts', btn: '.opt', idx: 'k' }               // train by topic
  ];
  var MAP = null;

  var st = document.createElement('style');
  st.textContent =
    '.pl-tap{position:absolute;z-index:3;pointer-events:none}' +
    '.pl-tap-b{position:absolute;pointer-events:auto;margin:0;padding:0;background:transparent;border:2px solid transparent;border-radius:7px;' +
      'cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .12s,border-color .12s}' +
    '.pl-tap-b:hover{border-color:rgba(29,95,209,.45);background:rgba(29,95,209,.06)}' +
    '.pl-tap-b:active{background:rgba(29,95,209,.14)}' +
    '.pl-tap-b i{position:absolute;top:-12px;left:-6px;display:none;min-width:20px;height:20px;padding:0 5px;border-radius:999px;' +
      'box-shadow:0 2px 6px rgba(0,0,0,.3);font:700 12px/20px Inter,system-ui,sans-serif;font-style:normal;color:#fff;text-align:center}' +
    '.pl-tap-b.sel{border:3px solid #C9A227;background:rgba(201,162,39,.16)}.pl-tap-b.sel i{display:block;background:#C9A227;color:#0B1120}' +
    '.pl-tap-b.ok{border:3px solid #12965C;background:rgba(18,150,92,.14)}.pl-tap-b.ok i{display:block;background:#12965C}' +
    '.pl-tap-b.bad{border:3px solid #D93C3C;background:rgba(217,60,60,.12)}.pl-tap-b.bad i{display:block;background:#D93C3C}' +
    '.pl-tap-b[disabled]{cursor:default}.pl-tap-b[disabled]:hover{background:transparent;border-color:transparent}' +
    '.pl-tap-b[disabled].ok:hover,.pl-tap-b[disabled].bad:hover,.pl-tap-b[disabled].sel:hover{border-color:inherit}' +
    '.pl-tap-hint{position:absolute;left:50%;top:-30px;transform:translateX(-50%);white-space:nowrap;pointer-events:none;' +
      'background:#1D5FD1;color:#fff;font:600 12px/1 Inter,system-ui,sans-serif;padding:7px 10px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25)}' +
    '.pl-tap-off{display:none!important}' +
    'html[data-theme=light] .pl-tap-b.sel{border-color:#1D5FD1;background:rgba(29,95,209,.1)}html[data-theme=light] .pl-tap-b.sel i{background:#1D5FD1;color:#fff}';
  document.head.appendChild(st);

  var hintSeen = false;
  try { hintSeen = !!localStorage.getItem('prepline:tap-hint'); } catch (e) {}

  function entry(img) { var e = MAP[img.getAttribute('src')]; return !e ? null : Array.isArray(e) ? { b: e } : e; }
  function place(img, ov) {
    if (!img.isConnected) return;
    var cs = getComputedStyle(img);
    var bl = parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), br = parseFloat(cs.borderRightWidth) + parseFloat(cs.paddingRight);
    var bt = parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop), bb = parseFloat(cs.borderBottomWidth) + parseFloat(cs.paddingBottom);
    ov.style.left = (img.offsetLeft + bl) + 'px';
    ov.style.top = (img.offsetTop + bt) + 'px';
    ov.style.width = Math.max(0, img.offsetWidth - bl - br) + 'px';
    var h = Math.max(0, img.offsetHeight - bt - bb);
    ov.style.height = h + 'px';
    // too small to hit with a finger (a long passage on a phone): keep the answer buttons as well.
    // Decided from the picture's known size, so the buttons do not jump when the picture finishes loading.
    var t = img.__plTap, e = entry(img);
    if (t && t.cont && e) {
      var ih = h;
      if (e.w && e.h) {
        var avail = t.cont.getBoundingClientRect().width || img.parentNode.getBoundingClientRect().width;
        var iw = Math.min(e.w, Math.max(0, avail - bl - br));
        ih = iw * e.h / e.w;
      }
      if (ih) {
        var minH = Math.min.apply(null, e.b.map(function (b) { return b[3] * ih; }));
        t.cont.classList.toggle('pl-tap-off', minH >= 24);
      }
    }
  }

  function enhance(img, K) {
    var en = entry(img), boxes = en && en.b;
    if (!boxes) { img.__plTap = 'none'; return; }
    var par = img.parentNode, cont = par.querySelector(K.box);
    if (!cont) return;
    var btns = cont.querySelectorAll(K.btn);
    if (btns.length !== boxes.length) { img.__plTap = 'none'; return; }
    if (getComputedStyle(par).position === 'static') par.style.position = 'relative';
    var ov = document.createElement('div');
    ov.className = 'pl-tap';
    ov.innerHTML = boxes.map(function (b, i) {
      return '<button type="button" class="pl-tap-b" data-n="' + i + '" aria-label="Answer ' + LET[i] + '" style="left:' + (b[0] * 100) + '%;top:' +
        (b[1] * 100) + '%;width:' + (b[2] * 100) + '%;height:' + (b[3] * 100) + '%"><i>' + LET[i] + '</i></button>';
    }).join('') + (hintSeen ? '' : '<span class="pl-tap-hint">Tap your answer on the picture</span>');
    img.insertAdjacentElement('afterend', ov);
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('.pl-tap-b'); if (!b || b.disabled) return;
      e.stopPropagation();
      var real = cont.querySelectorAll(K.btn)[+b.dataset.n];
      if (real && !real.disabled) real.click();
      if (!hintSeen) { hintSeen = true; try { localStorage.setItem('prepline:tap-hint', '1'); } catch (x) {} [].forEach.call(document.querySelectorAll('.pl-tap-hint'), function (h) { h.remove(); }); }
      sync();
    });
    img.__plTap = { ov: ov, cont: cont, K: K };
    var re = function () { place(img, ov); };
    re(); img.addEventListener('load', re);
    if (window.ResizeObserver) new ResizeObserver(re).observe(img);
  }

  function sync() {
    KINDS.forEach(function (K) {
      [].forEach.call(document.querySelectorAll(K.img), function (img) {
        var t = img.__plTap; if (!t || t === 'none') return;
        var real = t.cont.querySelectorAll(K.btn), hit = t.ov.querySelectorAll('.pl-tap-b');
        for (var i = 0; i < hit.length; i++) {
          var r = real[i]; if (!r) continue;
          var c = r.classList;
          hit[i].classList.toggle('sel', c.contains('selected') || c.contains('sel'));
          hit[i].classList.toggle('ok', c.contains('c'));
          hit[i].classList.toggle('bad', c.contains('u'));
          hit[i].disabled = !!r.disabled;
        }
        place(img, t.ov);
      });
    });
  }

  var queued = false;
  function scan() {
    queued = false;
    if (!MAP) return;
    KINDS.forEach(function (K) {
      [].forEach.call(document.querySelectorAll(K.img), function (img) {
        if (!img.__plTap) enhance(img, K);
      });
    });
    sync();
  }
  function later() { if (!queued) { queued = true; requestAnimationFrame(scan); } }

  fetch('option-map.json?v=3').then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    if (!m) return;
    MAP = m; scan();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    window.addEventListener('resize', later);
  }).catch(function () {});
})();
