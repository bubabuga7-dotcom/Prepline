# -*- coding: utf-8 -*-
"""
Prepline: английская форма входа + мягкая проверка авторизации.

Две вещи:

  1. Перевод. В prepline-supabase.js остались русские надписи формы входа
     («Введи email», «Входим...», «Ты вышел из аккаунта»). Прошлый перевод
     правил только HTML и до .js не добрался.

  2. Мягкая проверка. Сайт остаётся открытым: главную, разделы, описание
     NUET и мини-тест видно без входа. Но при попытке начать тест
     появляется окно с предложением войти. Отказаться нельзя — тест
     не начнётся, но и со страницы никуда не выкидывает: можно вернуться
     к списку и смотреть дальше.

     Жёсткий редирект намеренно не делается: человек, пришедший по ссылке,
     должен сначала увидеть, что это за сайт.

Как запустить:
  положить в папку Prepline и выполнить:  python auth-gate.py

Откат:
  python auth-gate.py off

Безопасность: оригиналы копируются в backup-auth/
"""

import glob
import os
import re
import shutil
import sys

BACKUP = "backup-auth"
JS = "prepline-supabase.js"
MARK = "prepline-gate"

# ---------- перевод формы входа ----------
STRINGS = [
    ("'[Prepline] supabase-js не загружен'", "'[Prepline] supabase-js failed to load'"),
    ("'Результат сохранён локально. Войди, чтобы сохранять в облако.'",
     "'Saved on this device. Sign in to keep your results in the cloud.'"),
    ("'Ошибка сохранения: '", "'Could not save: '"),
    ("'☁ Результат '", "'Result '"),
    ("' сохранён в облако'", "' saved to the cloud'"),
    (">Войти</span></div>", ">Sign in</span></div>"),
    ("'Пароль (мин. 6 символов)'", "'Password (at least 6 characters)'"),
    ("'Войти'", "'Sign in'"),
    ("'Вход в Prepline'", "'Sign in to Prepline'"),
    ("'Введи email'", "'Enter your email'"),
    ("'Пароль минимум 6 символов'", "'Password must be at least 6 characters'"),
    ("'Входим...'", "'Signing in...'"),
    ("'Вход выполнен'", "'Signed in'"),
    ("'Создаём аккаунт...'", "'Creating your account...'"),
    ("'Аккаунт создан, ты в системе'", "'Account created — you are signed in'"),
    ("'Аккаунт создан. Подтверди email по ссылке из письма, затем войди.'",
     "'Account created. Confirm your email using the link we sent, then sign in.'"),
    ("'Ты вышел из аккаунта'", "'Signed out'"),
    # разметка виджета — там двойные кавычки
    ('<h3 id="plTitle">Вход в Prepline</h3>', '<h3 id="plTitle">Sign in to Prepline</h3>'),
    ('placeholder="Пароль (мин. 6 символов)"', 'placeholder="Password (at least 6 characters)"'),
    ('id="plSignIn">Войти</button>', 'id="plSignIn">Sign in</button>'),
    ('id="plSignUp">Регистрация</button>', 'id="plSignUp">Create account</button>'),
    ('id="plSignOut">Выйти</button>', 'id="plSignOut">Sign out</button>'),
    # комментарии в коде
    ("Prepline × Supabase: авторизация + сохранение результатов в облако.",
     "Prepline x Supabase: authentication + saving results to the cloud."),
    ("Подключается на всех страницах ПОСЛЕ supabase-js (CDN).",
     "Included on every page AFTER supabase-js (CDN)."),
    ("сохранение результата (вызывается из квиза)", "saving a result (called by the quiz)"),
    ("подробное сохранение: каждый вопрос отдельно", "per-question saving"),
    ("стили виджета", "widget styles"),
    ("---------- разметка ----------", "---------- markup ----------"),
]

# ---------- окно «нужен вход» на страницах теста ----------
GATE = r"""
<!-- ===== Prepline: sign-in gate ===== -->
<style id="prepline-gate-css">
  #pl-gate{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;
           background:rgba(6,10,20,.78);backdrop-filter:blur(4px);padding:20px}
  #pl-gate.on{display:flex}
  #pl-gate .box{max-width:420px;width:100%;background:#111A2E;border:1px solid rgba(255,255,255,.14);
                border-radius:10px;padding:26px 28px;font-family:Inter,system-ui,sans-serif;color:#E6ECF7}
  #pl-gate h3{font-family:Sora,Inter,sans-serif;font-size:19px;margin:0 0 10px;letter-spacing:-.01em}
  #pl-gate p{font-size:14px;line-height:1.55;color:#B4C0D6;margin:0 0 18px}
  #pl-gate .row{display:flex;gap:10px;flex-wrap:wrap}
  #pl-gate button{font:600 14px Inter,sans-serif;padding:11px 22px;border-radius:5px;cursor:pointer;border:0}
  #pl-gate .go{background:#C9A227;color:#10192C}
  #pl-gate .back{background:transparent;border:1px solid rgba(255,255,255,.18);color:#E6ECF7}
</style>
<div id="pl-gate">
  <div class="box">
    <h3>Sign in to start this test</h3>
    <p>Your answers are saved per question so the platform can show which specification
       topics you are weakest on. That needs an account — it takes about twenty seconds.</p>
    <div class="row">
      <button class="go" id="plGateGo">Sign in or create an account</button>
      <button class="back" id="plGateBack">Back to the list</button>
    </div>
  </div>
</div>
<script id="prepline-gate">
(function () {
  const gate = document.getElementById('pl-gate');
  if (!gate) return;

  function show(){ gate.classList.add('on'); }
  function hide(){ gate.classList.remove('on'); }

  document.getElementById('plGateGo').onclick = () => {
    hide();
    const pill = document.getElementById('plPill');
    if (pill) pill.click();          // открываем штатное окно входа
  };
  document.getElementById('plGateBack').onclick = () => {
    const isCT = /crit-\d/.test(location.pathname);
    location.href = isCT ? 'crit.html' : 'math.html';
  };

  async function check(){
    const supa = window.preplineSupa;
    if (!supa) return;               // база не поднялась — не мешаем работать
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user) show(); else hide();
    } catch (e) { /* молча пропускаем */ }
  }

  setTimeout(check, 500);
  const supa = window.preplineSupa;
  if (supa && supa.auth && supa.auth.onAuthStateChange) {
    supa.auth.onAuthStateChange(() => check());
  }
})();
</script>
"""


def main():
    off = len(sys.argv) > 1 and sys.argv[1].lower() in ("off", "undo", "revert")

    if not os.path.exists("index.html"):
        print("Не вижу index.html. Запусти скрипт внутри папки Prepline.")
        return 1
    os.makedirs(BACKUP, exist_ok=True)

    # ---------- 1. перевод ----------
    if os.path.exists(JS):
        js = open(JS, encoding="utf-8", errors="ignore").read()
        original = js
        if off:
            for en, ru in [(b, a) for a, b in STRINGS]:
                js = js.replace(en, ru)
        else:
            n = 0
            for ru, en in STRINGS:
                if ru in js:
                    n += js.count(ru)
                    js = js.replace(ru, en)
            print(JS + ": строк переведено " + str(n))
        if js != original:
            shutil.copy2(JS, os.path.join(BACKUP, JS))
            open(JS, "w", encoding="utf-8").write(js)

    left = len(re.findall(r"[А-Яа-яЁё]", open(JS, encoding="utf-8").read())) if os.path.exists(JS) else 0
    if not off:
        print(JS + ": русских букв осталось " + str(left))

    # ---------- 2. проверка входа на страницах теста ----------
    done = 0
    for f in sorted(glob.glob("*.html")):
        html = open(f, encoding="utf-8", errors="ignore").read()

        is_quiz = re.search(r"const (?:questions|QUESTIONS)\s*=\s*\[", html) is not None
        if not is_quiz:
            continue

        original = html
        if off:
            html = re.sub(r'<!-- ===== Prepline: sign-in gate ===== -->.*?</script>\s*',
                          "", html, flags=re.S)
        else:
            if MARK in html:
                continue
            i = html.rfind("</body>")
            if i < 0:
                print("  нет </body>: " + f)
                continue
            html = html[:i] + GATE + "\n" + html[i:]

        if html != original:
            shutil.copy2(f, os.path.join(BACKUP, f))
            open(f, "w", encoding="utf-8").write(html)
            done += 1

    print()
    print(("проверка снята со страниц: " if off else "страниц теста под проверкой: ") + str(done))
    print("копии оригиналов:          " + BACKUP + "/")
    if not off:
        print()
        print("Дальше: git add . / git commit -m \"english auth + sign-in gate\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
