# -*- coding: utf-8 -*-
"""
Prepline: список вопросов, которые надо проверить глазами после конвертации.

Запуск из папки Prepline:
    python check-text.py            только сводка и список
    python check-text.py --full     ещё и текст правильного ответа

Что показывает:
  КЛЮЧ  — число вариантов не равно 5. Правильный ответ хранится номером,
          поэтому здесь ключ мог съехать. Проверять в первую очередь.
  ПУСТО — у вопроса нет текста: конвертация его не тронула.
  ФЛАГ  — модель сама пометила вопрос как сомнительный.
"""

import glob
import json
import os
import re
import sys

full = "--full" in sys.argv

rows = []
totals = {"key": 0, "empty": 0, "flag": 0, "all": 0, "broken": 0, "old": 0}

for filename in sorted(glob.glob("*.html")):
    if filename == "weak-spots.html":
        continue
    html = open(filename, encoding="utf-8", errors="ignore").read()
    m = re.search(r"const (?:questions|QUESTIONS)\s*=\s*(\[.*?\]);", html, re.S)
    if not m:
        continue
    try:
        qs = json.loads(m.group(1))
    except Exception:
        print("не разобрался: " + filename)
        continue

    for q in qs:
        totals["all"] += 1
        opts = q.get("options") or []
        text = (q.get("text") or "").strip()
        converted = os.path.exists(os.path.join("backup-text", filename))
        correct = q.get("correct")
        marks = []
        if isinstance(correct, int) and correct >= len(opts):
            marks.append("СЛОМАН")
            totals["broken"] += 1
        elif len(opts) != 5 and converted:
            marks.append("КЛЮЧ")
            totals["key"] += 1
        elif len(opts) != 5:
            totals["old"] += 1
            continue
        if not text:
            marks.append("ПУСТО")
            totals["empty"] += 1
        if q.get("review"):
            marks.append("ФЛАГ")
            totals["flag"] += 1
        if not marks:
            continue
        answer = ""
        if full and isinstance(correct, int) and 0 <= correct < len(opts):
            answer = " | ответ: " + re.sub(r"<[^>]+>", "", str(opts[correct]))[:60]
        rows.append("%-22s №%-3s %-16s вариантов: %d%s"
                    % (filename, q.get("id"), ",".join(marks), len(opts), answer))

for r in rows:
    if "СЛОМАН" in r:
        print(r)
print()
for r in rows:
    if "КЛЮЧ" in r:
        print(r)
print()
for r in rows:
    if "КЛЮЧ" not in r and "ПУСТО" in r:
        print(r)

print()
print("всего вопросов:          " + str(totals["all"]))
print("СЛОМАНО, ключ вне списка: " + str(totals["broken"]) + "  <- чинить обязательно")
print("проверить вручную:       " + str(totals["key"]) + "  (конвертированные, вариантов не 5)")
print("было так и до нас:       " + str(totals["old"]) + "  (файлы без конвертации, не трогаем)")
print("без текста:              " + str(totals["empty"]))
print("помечено моделью:        " + str(totals["flag"]))
print()
print("Списком выше открывай вопрос на странице и сверяй правильный ответ с картинкой.")
print("Оригиналы страниц лежат в backup-text/ — оттуда можно взять исходный номер ответа.")
