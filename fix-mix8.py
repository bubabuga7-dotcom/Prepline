# -*- coding: utf-8 -*-
"""
Prepline: чинит Test 8 (mix-8.html).

Проблема: в файле объявлена функция render(), которая рисует все 30 вопросов,
но её никто не вызывает. Из-за этого тест открывался пустым — были видны
только заголовок, таймер и кнопка завершения. Дефект существовал с самого
первого коммита репозитория.

Что делает скрипт:
  1. добавляет вызов render() при загрузке страницы;
  2. добавляет переключатель режимов, как на остальных тестах.
     Test 8 показывает все вопросы сразу, поэтому здесь переключатель
     работает наоборот: по умолчанию лента, а «One at a time» прячет все
     карточки кроме текущей и добавляет кнопки навигации.

Как запустить:
  положить в папку Prepline и выполнить:  python fix-mix8.py

Безопасность: оригинал копируется в backup-mix8/
"""

import os
import re
import shutil
import sys

FILE = "mix-8.html"
BACKUP = "backup-mix8"
MARK = "prepline-mix8-fix"

BLOCK = r"""
<!-- ===== Prepline: fix + view modes for Test 8 ===== -->
<style id="prepline-mix8-fix-css">
  .pl-mode {
    display: flex; gap: 6px; align-items: center; margin: 0 auto 18px;
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
    opacity: 1; background: linear-gradient(90deg,#8EADD2,#8EADD2,#C9AA6A); color: #fff;
  }
  .pl-nav {
    display: flex; gap: 12px; align-items: center; justify-content: center;
    margin: 16px 0 4px;
  }
  .pl-nav button {
    font: 600 13.5px 'Inter', system-ui, sans-serif; color: inherit; cursor: pointer;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px; padding: 9px 20px;
  }
  .pl-nav button:disabled { opacity: .35; cursor: default; }
  .pl-nav span { font: 500 13px 'Inter', system-ui, sans-serif; opacity: .7; }
</style>

<script id="prepline-mix8-fix">
(function () {
  function boot() {
    if (typeof render !== 'function' || typeof QUESTIONS === 'undefined') return;

    var quiz = document.getElementById('quiz');
    if (!quiz) return;

    // 1. главное: нарисовать вопросы
    if (!quiz.querySelector('.q-card')) {
      try { render(); } catch (e) { console.error('[Prepline] render:', e); return; }
    }

    var cards = [].slice.call(quiz.querySelectorAll('.q-card'));
    if (!cards.length) return;

    // 2. переключатель режимов
    var bar = document.createElement('div');
    bar.className = 'pl-mode';
    bar.innerHTML = '<button type="button" data-m="all" class="on">Scroll view</button>' +
                    '<button type="button" data-m="one">One at a time</button>';
    quiz.parentNode.insertBefore(bar, quiz);

    var nav = document.createElement('div');
    nav.className = 'pl-nav';
    nav.style.display = 'none';
    nav.innerHTML = '<button type="button" id="pl-prev">&larr; Back</button>' +
                    '<span id="pl-pos"></span>' +
                    '<button type="button" id="pl-next">Next &rarr;</button>';
    quiz.parentNode.insertBefore(nav, quiz.nextSibling);

    var idx = 0;
    var mode = 'all';

    function paint() {
      if (mode === 'all') {
        for (var i = 0; i < cards.length; i++) cards[i].style.display = '';
        nav.style.display = 'none';
        return;
      }
      for (var j = 0; j < cards.length; j++) cards[j].style.display = (j === idx ? '' : 'none');
      nav.style.display = 'flex';
      document.getElementById('pl-pos').textContent = 'Question ' + (idx + 1) + ' of ' + cards.length;
      document.getElementById('pl-prev').disabled = (idx === 0);
      document.getElementById('pl-next').disabled = (idx === cards.length - 1);
    }

    var mb = bar.querySelectorAll('button');
    for (var k = 0; k < mb.length; k++) {
      mb[k].onclick = function () {
        mode = this.dataset.m;
        for (var n = 0; n < mb.length; n++) mb[n].classList.toggle('on', mb[n].dataset.m === mode);
        paint();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    }
    document.getElementById('pl-prev').onclick = function () {
      idx = Math.max(0, idx - 1); paint(); window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.getElementById('pl-next').onclick = function () {
      idx = Math.min(cards.length - 1, idx + 1); paint(); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // при показе результатов возвращаем ленту, чтобы был виден весь разбор
    var res = document.getElementById('result');
    if (res && window.MutationObserver) {
      new MutationObserver(function () {
        if (res.style.display === 'block' && mode !== 'all') {
          mode = 'all';
          for (var n = 0; n < mb.length; n++) mb[n].classList.toggle('on', mb[n].dataset.m === 'all');
          paint();
        }
      }).observe(res, { attributes: true, attributeFilter: ['style'] });
    }

    paint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>
"""


def main():
    if not os.path.exists(FILE):
        print("Не вижу " + FILE + ". Запусти скрипт внутри папки Prepline.")
        return 1

    html = open(FILE, encoding="utf-8", errors="ignore").read()

    if MARK in html:
        print(FILE + ": уже починен, ничего не делаю.")
        return 0

    i = html.rfind("</body>")
    if i < 0:
        print("Не нашёл </body> в " + FILE)
        return 1

    os.makedirs(BACKUP, exist_ok=True)
    shutil.copy2(FILE, os.path.join(BACKUP, FILE))
    open(FILE, "w", encoding="utf-8").write(html[:i] + BLOCK + "\n" + html[i:])

    print(FILE + ": вопросы теперь отображаются, добавлен переключатель режимов")
    print("копия оригинала: " + BACKUP + "/")
    print()
    print("Дальше: git add . / git commit -m \"fix Test 8\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
