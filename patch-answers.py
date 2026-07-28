# -*- coding: utf-8 -*-
"""
Prepline, фаза 1: включает подробное сохранение ответов.

Что делает:
  1. в вопросах, у которых src — настоящая тема (ASM, CON, EF, MC, FLAW
     или код спецификации вида M3.10), добавляет поле "topic"
  2. в prepline-supabase.js добавляет функцию preplineSaveAnswers
  3. в каждом тесте после отправки результата добавляет отправку
     подробностей: какой вопрос, какая тема, верно или нет

Как запустить:
  положить в папку Prepline и выполнить:  python patch-answers.py

Безопасность: оригиналы копируются в backup-phase1/
"""

import json
import os
import re
import shutil
import sys

BACKUP = "backup-phase1"
JS = "prepline-supabase.js"

# что считаем настоящей темой, а не номером исходного мока
TOPIC_RE = re.compile(r'^(ASM|CON|EF|MC|FLAW|M[1-5]\.\d{1,2})$')

SAVE_FN = '''
  /* ---------- подробное сохранение: каждый вопрос отдельно ---------- */
  window.preplineSaveAnswers = async function (mockId, qs, answers) {
    try {
      const { data: { user } } = await supa.auth.getUser();
      if (!user || !qs || !qs.length) return;
      const rows = qs.map(function (q) {
        const given = answers ? answers[q.id] : undefined;
        return {
          user_id: user.id,
          mock_id: mockId,
          q_id: q.id,
          topic: q.topic || null,
          correct: given === q.correct,
          answered: given !== undefined && given !== null && given !== ''
        };
      });
      const { error } = await supa.from('answer_log').insert(rows);
      if (error) console.error('[Prepline] answer_log:', error.message);
    } catch (e) { console.error('[Prepline]', e); }
  };
'''

CALL_RE = re.compile(
    r'(window\.preplineSaveResult\(\s*mockId\(\)\s*,\s*score\s*,\s*(\w+)\.length\s*\);)')


def add_topics(path):
    """Добавляет "topic" рядом с "src", если src — настоящая тема."""
    with open(path, encoding="utf-8", errors="ignore") as fh:
        html = fh.read()

    changed = 0
    out = html

    for var in ("questions", "QUESTIONS"):
        m = re.search(r'const ' + var + r'\s*=\s*(\[.*?\]);', out, re.S)
        if not m:
            continue
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        touched = False
        for q in data:
            src = str(q.get("src", ""))
            if TOPIC_RE.match(src) and "topic" not in q:
                q["topic"] = src
                touched = True
                changed += 1
        if touched:
            new_arr = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
            out = out[:m.start(1)] + new_arr + out[m.end(1):]

    return out, changed


def patch_call(html):
    """После отправки результата добавляет отправку подробностей."""
    if "preplineSaveAnswers" in html:
        return html, 0

    def repl(m):
        return (m.group(1) +
                "\n        window.preplineSaveAnswers && window.preplineSaveAnswers("
                "mockId(), " + m.group(2) + ", state.answers);")

    new, n = CALL_RE.subn(repl, html)
    return new, n


def main():
    if not os.path.exists(JS):
        print("Не вижу " + JS + ". Запусти скрипт внутри папки Prepline.")
        return 1

    os.makedirs(BACKUP, exist_ok=True)

    # --- 1. функция в общий JS ---
    with open(JS, encoding="utf-8") as fh:
        js = fh.read()
    if "preplineSaveAnswers" in js:
        print(JS + ": функция уже есть, пропускаю")
    else:
        anchor = "  /* ---------- стили виджета ---------- */"
        if anchor not in js:
            print("ОШИБКА: не нашёл место для вставки в " + JS)
            return 1
        shutil.copy2(JS, os.path.join(BACKUP, JS))
        js = js.replace(anchor, SAVE_FN + "\n" + anchor, 1)
        with open(JS, "w", encoding="utf-8") as fh:
            fh.write(js)
        print(JS + ": функция preplineSaveAnswers добавлена")

    # --- 2. HTML: темы + вызов ---
    tot_topics = 0
    tot_calls = 0
    files = 0
    for name in sorted(f for f in os.listdir(".") if f.lower().endswith(".html")):
        with open(name, encoding="utf-8", errors="ignore") as fh:
            original = fh.read()

        html, n_topics = add_topics(name)
        html, n_calls = patch_call(html)

        if html != original:
            shutil.copy2(name, os.path.join(BACKUP, name))
            with open(name, "w", encoding="utf-8") as fh:
                fh.write(html)
            files += 1
            tot_topics += n_topics
            tot_calls += n_calls
            note = []
            if n_topics:
                note.append("тем: " + str(n_topics))
            if n_calls:
                note.append("вызов включён")
            print("  " + name.ljust(22) + ", ".join(note))

    print()
    print("файлов изменено:        " + str(files))
    print("вопросов получили тему: " + str(tot_topics))
    print("тестов шлют подробности:" + str(tot_calls))
    print("копии оригиналов:       " + BACKUP + "/")
    print()
    print("Дальше: выполнить supabase-setup.sql в Supabase, потом git add/commit/push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
