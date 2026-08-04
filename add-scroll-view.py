# -*- coding: utf-8 -*-
"""
Prepline: добавляет режим сплошного просмотра тестов.

Что появляется:
  Кнопка-переключатель вверху каждого теста. В режиме "Scroll" все вопросы
  выводятся один за другим на одной странице — как в PDF, только листать
  ничего не нужно. Варианты ответа остаются кликабельными, ответы
  запоминаются, таймер продолжает идти, кнопка завершения теста внизу.
  Обратное переключение возвращает обычный режим по одному вопросу и
  открывает тот вопрос, на котором ты остановился.

  Дополнительно в сплошном режиме включается защита от простого копирования:
  выделение текста, правый клик, перетаскивание картинок и печать страницы
  блокируются. Это останавливает случайного человека, но не является
  настоящей защитой: всё, что показал браузер, уже загружено на устройство.
  Гарантировать «только просмотр» на статическом сайте невозможно.

Существующий код теста не переписывается — режим добавляется отдельным
блоком в конце страницы.

Как запустить:
  положить в папку Prepline и выполнить:  python add-scroll-view.py

Безопасность: оригиналы копируются в backup-scroll/
"""

import glob
import os
import re
import shutil
import sys

BACKUP = "backup-scroll"
MARK = "prepline-scroll-view"

BLOCK = r"""
<!-- ===== Prepline: scroll view ===== -->
<style id="prepline-scroll-view-css">
  .pl-mode {
    display: flex; gap: 6px; align-items: center; margin: 0 0 16px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px; padding: 4px; width: fit-content;
  }
  .pl-mode button {
    font: 600 12.5px 'Inter', system-ui, sans-serif; color: inherit; cursor: pointer;
    background: none; border: 0; padding: 7px 16px; border-radius: 999px;
    opacity: .65; transition: opacity .15s, background .15s;
  }
  .pl-mode button:hover { opacity: 1; }
  .pl-mode button.on {
    opacity: 1; background: linear-gradient(90deg,#60A5FA,#A78BFA,#F472B6); color: #fff;
  }
  .pl-scroll .pl-q {
    border-bottom: 1px solid rgba(255,255,255,0.09);
    padding: 20px 0 24px;
  }
  .pl-scroll .pl-q:last-of-type { border-bottom: 0; }
  .pl-scroll .pl-num {
    font: 700 12px 'Inter', system-ui, sans-serif; letter-spacing: .06em;
    text-transform: uppercase; opacity: .5; margin-bottom: 8px;
  }
  .pl-scroll .pl-img {
    max-width: 100%; border-radius: 8px; margin: 4px 0 12px;
    background: #fff; padding: 4px; -webkit-user-drag: none; user-drag: none;
    pointer-events: none;
  }
  .pl-scroll .pl-text { margin-bottom: 12px; line-height: 1.55; }
  .pl-scroll .pl-opts { display: flex; flex-direction: column; gap: 7px; }
  .pl-scroll .pl-opt {
    text-align: left; font: 400 14.5px 'Inter', system-ui, sans-serif; color: inherit;
    cursor: pointer; background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 14px;
    transition: border-color .15s, background .15s;
  }
  .pl-scroll .pl-opt:hover { border-color: rgba(167,139,250,0.55); }
  .pl-scroll .pl-opt.sel {
    background: rgba(167,139,250,0.18); border-color: rgba(167,139,250,0.85);
  }
  .pl-bar {
    position: sticky; bottom: 0; display: flex; gap: 14px; align-items: center;
    justify-content: space-between; margin-top: 8px; padding: 12px 4px;
    background: rgba(10,14,30,0.9); backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .pl-bar .pl-count { font: 500 13px 'Inter', system-ui, sans-serif; opacity: .75; }
  .pl-bar .pl-submit {
    font: 600 14px 'Inter', system-ui, sans-serif; color: #fff; cursor: pointer; border: 0;
    background: linear-gradient(90deg,#60A5FA,#A78BFA,#F472B6);
    padding: 11px 26px; border-radius: 999px;
  }
  .pl-noselect, .pl-noselect * {
    -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;
  }
  @media print { body.pl-noprint * { display: none !important; } }
</style>

<script id="prepline-scroll-view">
(function () {
  if (typeof questions === 'undefined' || typeof state === 'undefined') return;
  if (typeof render !== 'function') return;

  var LETTERS = 'ABCDEFGH';
  var app = document.getElementById('app');
  if (!app) return;

  var wrap = app.parentNode;
  var host = document.createElement('div');
  host.id = 'pl-scroll-host';
  host.className = 'pl-scroll pl-noselect';
  host.style.display = 'none';
  wrap.insertBefore(host, app.nextSibling);

  var bar = document.createElement('div');
  bar.className = 'pl-mode';
  bar.innerHTML = '<button type="button" data-m="one" class="on">One at a time</button>' +
                  '<button type="button" data-m="all">Scroll view</button>';
  wrap.insertBefore(bar, app);

  var mode = 'one';

  function esc(s) { return String(s == null ? '' : s); }

  function draw() {
    var parts = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var opts = '';
      for (var k = 0; k < (q.options || []).length; k++) {
        var on = state.answers[q.id] === k ? ' sel' : '';
        opts += '<button type="button" class="pl-opt' + on + '" data-q="' + q.id +
                '" data-i="' + k + '">' + (LETTERS[k] || (k + 1)) + ') ' + esc(q.options[k]) + '</button>';
      }
      parts.push(
        '<div class="pl-q" id="pl-q-' + q.id + '">' +
          '<div class="pl-num">Question ' + (i + 1) + ' of ' + questions.length + '</div>' +
          (q.image ? '<img loading="lazy" class="pl-img" src="' + q.image + '" alt="Figure">' : '') +
          (esc(q.text) ? '<div class="pl-text">' + esc(q.text) + '</div>' : '') +
          '<div class="pl-opts">' + opts + '</div>' +
        '</div>');
    }
    var answered = Object.keys(state.answers).length;
    parts.push(
      '<div class="pl-bar">' +
        '<span class="pl-count">' + answered + ' of ' + questions.length + ' answered</span>' +
        '<button type="button" class="pl-submit" id="pl-submit">Finish test</button>' +
      '</div>');
    host.innerHTML = parts.join('');

    var btns = host.querySelectorAll('.pl-opt');
    for (var b = 0; b < btns.length; b++) {
      btns[b].onclick = function () {
        var qid = parseInt(this.dataset.q, 10);
        state.answers[qid] = parseInt(this.dataset.i, 10);
        var sibs = this.parentNode.querySelectorAll('.pl-opt');
        for (var s = 0; s < sibs.length; s++) sibs[s].classList.remove('sel');
        this.classList.add('sel');
        var c = host.querySelector('.pl-count');
        if (c) c.textContent = Object.keys(state.answers).length + ' of ' + questions.length + ' answered';
      };
    }
    var sub = document.getElementById('pl-submit');
    if (sub) sub.onclick = function () {
      var left = questions.length - Object.keys(state.answers).length;
      if (left > 0 && !confirm('Unanswered: ' + left + ' question(s). Finish anyway?')) return;
      setMode('one');
      if (typeof finish === 'function') finish();
    };
  }

  function setMode(m) {
    if (state.finished) m = 'one';
    mode = m;
    var on = (m === 'all');
    host.style.display = on ? 'block' : 'none';
    app.style.display = on ? 'none' : '';
    document.body.classList.toggle('pl-noprint', on);
    var mb = bar.querySelectorAll('button');
    for (var i = 0; i < mb.length; i++) mb[i].classList.toggle('on', mb[i].dataset.m === m);
    if (on) { draw(); } else { render(); }
  }

  var mbtns = bar.querySelectorAll('button');
  for (var i = 0; i < mbtns.length; i++) {
    mbtns[i].onclick = function () { setMode(this.dataset.m); };
  }

  // в сплошном режиме мешаем самому простому копированию
  host.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  host.addEventListener('dragstart', function (e) { e.preventDefault(); });
  host.addEventListener('copy', function (e) { e.preventDefault(); });

  // после завершения теста режим прокрутки прячется, показываем результаты
  var origFinish = window.finish;
  if (typeof origFinish === 'function') {
    window.finish = function () {
      if (mode === 'all') setMode('one');
      return origFinish.apply(this, arguments);
    };
  }
})();
</script>
"""


def main():
    if not os.path.exists("index.html"):
        print("Не вижу index.html. Запусти скрипт внутри папки Prepline.")
        return 1
    os.makedirs(BACKUP, exist_ok=True)

    done = 0
    skipped = 0
    for f in sorted(glob.glob("*.html")):
        html = open(f, encoding="utf-8", errors="ignore").read()

        # mix-8 уже показывает все вопросы сразу — режим ему не нужен
        if "const QUESTIONS" in html and "q-card" in html:
            continue
        if "function render()" not in html or "let state" not in html:
            continue
        if MARK in html:
            skipped += 1
            continue

        i = html.rfind("</body>")
        if i < 0:
            print("  нет </body>: " + f)
            continue

        shutil.copy2(f, os.path.join(BACKUP, f))
        open(f, "w", encoding="utf-8").write(html[:i] + BLOCK + "\n" + html[i:])
        done += 1
        print("  " + f)

    print()
    print("страниц с режимом прокрутки: " + str(done))
    if skipped:
        print("уже было, пропущено:         " + str(skipped))
    print("копии оригиналов:            " + BACKUP + "/")
    print()
    print("Дальше: git add . / git commit -m \"scroll view\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
