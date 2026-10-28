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
    '.pl-tap-b:hover{border-color:rgba(61,99,163,.45);background:rgba(61,99,163,.06)}' +
    '.pl-tap-b:active{background:rgba(61,99,163,.14)}' +
    '.pl-tap-b i{position:absolute;top:-12px;left:-6px;display:none;min-width:20px;height:20px;padding:0 5px;border-radius:999px;' +
      'box-shadow:0 2px 6px rgba(0,0,0,.3);font:700 12px/20px Inter,system-ui,sans-serif;font-style:normal;color:#fff;text-align:center}' +
    '.pl-tap-b.sel{border:3px solid #C9AA6A;background:rgba(201,170,106,.16)}.pl-tap-b.sel i{display:block;background:#C9AA6A;color:#15181D}' +
    '.pl-tap-b.ok{border:3px solid #2F8A63;background:rgba(18,150,92,.14)}.pl-tap-b.ok i{display:block;background:#2F8A63}' +
    '.pl-tap-b.bad{border:3px solid #B95050;background:rgba(217,60,60,.12)}.pl-tap-b.bad i{display:block;background:#B95050}' +
    '.pl-tap-b[disabled]{cursor:default}.pl-tap-b[disabled]:hover{background:transparent;border-color:transparent}' +
    '.pl-tap-b[disabled].ok:hover,.pl-tap-b[disabled].bad:hover,.pl-tap-b[disabled].sel:hover{border-color:inherit}' +
    '.pl-tap-hint{position:absolute;left:50%;top:-30px;transform:translateX(-50%);white-space:nowrap;pointer-events:none;' +
      'background:#3D63A3;color:#fff;font:600 12px/1 Inter,system-ui,sans-serif;padding:7px 10px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25)}' +
    '.pl-tap-off{display:none!important}' +
    '.pl-tap.small .pl-tap-b{pointer-events:none}.pl-tap.small+.x{}' +
    '.pl-zoom{position:fixed;inset:0;z-index:9500;background:rgba(5,8,20,.985);display:flex;flex-direction:column}' +
    '.pl-zoom-h{display:flex;align-items:center;gap:10px;padding:10px 12px;color:#DADDE2;font:600 15px Inter,system-ui,sans-serif}' +
    '.pl-zoom-h span{flex:1}.pl-zoom-h button{background:#1D2A44;color:#fff;border:0;border-radius:10px;font:700 15px Inter,sans-serif;padding:10px 14px}' +
    '.pl-zoom-s{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:24px 8px 40px}' +
    '.pl-zoom-in{position:relative;margin:0 auto}.pl-zoom-in img{display:block;width:100%;background:#fff;border-radius:6px}' +
    '.pl-zoom .pl-tap-b{border-color:rgba(61,99,163,.55);background:rgba(61,99,163,.05)}.pl-zoom .pl-tap-b i{display:block;background:#3D63A3}' +
    '.pl-zoom .pl-tap-b.sel{border-color:#C9AA6A;background:rgba(201,170,106,.18)}.pl-zoom .pl-tap-b.sel i{background:#C9AA6A;color:#15181D}' +
    'html[data-theme=light] .pl-tap-b.sel{border-color:#3D63A3;background:rgba(61,99,163,.1)}html[data-theme=light] .pl-tap-b.sel i{background:#3D63A3;color:#fff}';
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
        ov.classList.toggle('small', minH < 24);   // too small to hit: tap the picture to answer in a zoomed view
        var hint = ov.querySelector('.pl-tap-hint');
        if (hint) hint.textContent = minH < 24 ? 'Tap the picture to answer on it' : 'Tap your answer on the picture';
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

  /* phones: the options on the picture are too small to hit, so a tap on the picture opens it large with answer areas */
  function zoom(img) {
    var t = img.__plTap, e = entry(img);
    if (!t || t === 'none' || !e || !e.w) return false;
    var real = t.cont.querySelectorAll(t.K.btn);
    if (!real.length || real[0].disabled) return false;
    var minF = Math.min.apply(null, e.b.map(function (b) { return b[3]; }));
    var vw = window.innerWidth - 16;
    // big enough to hit (about 40 px a row) but at most 1.7 screens wide, so a line of text needs little sideways scrolling
    var fitZ = vw / e.w, z = Math.min(Math.max(fitZ, 40 / (minF * e.h)), fitZ * 1.7);
    var W = Math.round(e.w * z), H = e.h * z;
    var d = document.createElement('div'); d.className = 'pl-zoom';
    d.innerHTML = '<div class="pl-zoom-h"><span>Tap your answer</span><button type="button" class="x">Close</button></div>' +
      '<div class="pl-zoom-s"><div class="pl-zoom-in" style="width:' + W + 'px"><img alt="Question" src="' + img.getAttribute('src') + '">' +
      e.b.map(function (b, i) {
        var on = real[i] && (real[i].classList.contains('selected') || real[i].classList.contains('sel')) ? ' sel' : '';
        return '<button type="button" class="pl-tap-b' + on + '" data-n="' + i + '" aria-label="Answer ' + LET[i] + '" style="left:' + (b[0] * 100) + '%;top:' +
          (b[1] * 100) + '%;width:' + (b[2] * 100) + '%;height:' + (b[3] * 100) + '%"><i>' + LET[i] + '</i></button>';
      }).join('') + '</div></div>';
    document.body.appendChild(d);
    var sc = d.querySelector('.pl-zoom-s'), b0 = e.b[0];
    sc.scrollTop = Math.max(0, b0[1] * H - 70); sc.scrollLeft = Math.max(0, b0[0] * W - 12);
    function close() { d.remove(); document.removeEventListener('keydown', esc); }
    function esc(ev) { if (ev.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);
    d.querySelector('.x').onclick = close;
    d.querySelector('.pl-zoom-in').addEventListener('click', function (ev) {
      var b = ev.target.closest('.pl-tap-b'); if (!b) return;
      [].forEach.call(d.querySelectorAll('.pl-tap-b'), function (x) { x.classList.toggle('sel', x === b); });
      var r = t.cont.querySelectorAll(t.K.btn)[+b.dataset.n];
      if (r && !r.disabled) r.click();
      if (!hintSeen) { hintSeen = true; try { localStorage.setItem('prepline:tap-hint', '1'); } catch (x) {} [].forEach.call(document.querySelectorAll('.pl-tap-hint'), function (h) { h.remove(); }); }
      setTimeout(function () { close(); sync(); }, 220);
    });
    return true;
  }
  document.addEventListener('click', function (ev) {
    var img = ev.target;
    if (!img || img.tagName !== 'IMG' || !img.__plTap || img.__plTap === 'none') return;
    if (!img.__plTap.ov.classList.contains('small')) return;
    if (zoom(img)) { ev.stopPropagation(); ev.preventDefault(); }
  }, true);

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

  fetch('option-map.json?v=e0387f86').then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    if (!m) return;
    MAP = m; scan();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    window.addEventListener('resize', later);
  }).catch(function () {});
})();
