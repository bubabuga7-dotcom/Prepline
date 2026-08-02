# -*- coding: utf-8 -*-
"""
Prepline: исправляет найденные ошибки в вопросах.

Что правится:

  mix-6 №16  Прямая через (2,1) и (0,3) — это y = -x + 3.
             Верного варианта в списке не было: вместо "y = -x + 2"
             ставится "y = -x + 3", correct остаётся на том же месте.

  mix-3 №21  (1,5)^2 x 0,8 / 2 = 0,9, то есть уменьшение на 10%.
             Верным был помечен B (увеличение на 10%), ставится A.

  mix-1 №28  Парабола (x-1)^2 - 4 пересекает ось x в точках 3 и -1.
             Вариант "-2" стоял дважды; второй заменяется на "-1".
             Внимание: после этого у вопроса ДВА верных ответа (3 и -1).
             Помечен остаётся 3. По-хорошему вопрос надо переформулировать
             как "какое из значений НЕ является точкой пересечения" или
             убрать один из корней из списка — оставляю на твоё решение.

  mix-1 №2   Вариант "4" стоял дважды, второй заменён на "6" (правдоподобный
             отвлекающий: типичная ошибка p = 10 x 36/25 даёт не 12).
  mix-2 №1   Вариант "6" стоял дважды, второй заменён на "9".
  mix-6 №19  Вариант "x = 3, y = 3" стоял дважды, второй заменён на "x = 1, y = -3".

Верные ответы пересчитаны и проверены. Правка идёт по точному совпадению
текста варианта, поэтому повторный запуск ничего не испортит.

Как запустить:
  положить в папку Prepline и выполнить:  python fix-answers.py

Безопасность: оригиналы копируются в backup-answers/
"""

import json
import os
import re
import shutil
import sys

BACKUP = "backup-answers"
ARR = r"const (?:questions|QUESTIONS)\s*=\s*(\[.*?\]);"

# файл -> id вопроса -> список правок
# ("option", старый текст, новый текст) — заменить вариант ответа
# ("correct", старый индекс, новый индекс) — переставить верный ответ
FIXES = {
    "mix-6.html": {
        16: [("option", "y = −x + 2", "y = −x + 3")],
        19: [("option", "x = 3, y = 3", "x = 1, y = −3", "last")],
    },
    "mix-3.html": {
        21: [("correct", 1, 0)],
    },
    "mix-1.html": {
        2:  [("option", "4", "6", "last")],
        28: [("option", "−2", "−1", "last")],
    },
    "mix-2.html": {
        1:  [("option", "6", "9", "last")],
    },
    # те же вопросы продублированы на тестовых страницах
    "test-2.html": {
        21: [("option", "6", "9", "last")],
    },
    "test.html": {
        9:  [("option", "−2", "−1", "last")],
    },
}


def plain(s):
    return re.sub(r"<[^>]*>", "", str(s)).strip()


def main():
    if not os.path.exists("index.html"):
        print("Не вижу index.html. Запусти скрипт внутри папки Prepline.")
        return 1
    os.makedirs(BACKUP, exist_ok=True)

    done = 0
    skipped = 0

    for filename, per_q in sorted(FIXES.items()):
        if not os.path.exists(filename):
            print("  нет файла: " + filename)
            continue

        html = open(filename, encoding="utf-8", errors="ignore").read()
        original = html
        m = re.search(ARR, html, re.S)
        if not m:
            print("  не нашёл массив в " + filename)
            continue
        try:
            data = json.loads(m.group(1))
        except Exception as e:
            print("  ошибка разбора " + filename + ": " + str(e)[:50])
            continue

        by_id = {q.get("id"): q for q in data}

        for qid, fixes in sorted(per_q.items()):
            q = by_id.get(qid)
            if q is None:
                print("  %s №%s: нет такого вопроса" % (filename, qid))
                continue

            for fix in fixes:
                kind = fix[0]

                if kind == "correct":
                    old, new = fix[1], fix[2]
                    if q.get("correct") == old:
                        q["correct"] = new
                        print("  %s №%s: верный ответ %s -> %s" % (filename, qid, old, new))
                        done += 1
                    else:
                        skipped += 1

                elif kind == "option":
                    old, new = fix[1], fix[2]
                    which = fix[3] if len(fix) > 3 else "first"
                    opts = q.get("options", [])
                    idxs = [i for i, o in enumerate(opts) if plain(o) == old]
                    if not idxs:
                        skipped += 1
                        continue
                    i = idxs[-1] if which == "last" else idxs[0]
                    if which == "last" and len(idxs) < 2:
                        skipped += 1
                        continue
                    if i == q.get("correct") and which == "last":
                        print("  %s №%s: пропуск, вариант помечен верным" % (filename, qid))
                        skipped += 1
                        continue
                    opts[i] = new
                    print("  %s №%s: вариант %s -> %s" % (filename, qid, old, new))
                    done += 1

        arr = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        html = html[:m.start(1)] + arr + html[m.end(1):]

        if html != original:
            shutil.copy2(filename, os.path.join(BACKUP, filename))
            open(filename, "w", encoding="utf-8").write(html)

    # --- битая ссылка на несуществующий test-4.html ---
    for page in ("math.html", "nuet.html"):
        if not os.path.exists(page):
            continue
        if os.path.exists("test-4.html"):
            break
        html = open(page, encoding="utf-8", errors="ignore").read()
        fixed = html.replace(', <a href="test-4.html">#4</a>', '')
        fixed = fixed.replace('<a href="test-4.html">#4</a>', '')
        if fixed != html:
            shutil.copy2(page, os.path.join(BACKUP, page))
            open(page, "w", encoding="utf-8").write(fixed)
            print("  %s: убрана ссылка на несуществующий test-4.html" % page)
            done += 1

    print()
    print("правок внесено:   " + str(done))
    print("уже было / пропущено: " + str(skipped))
    print("копии оригиналов: " + BACKUP + "/")
    print()
    print("Дальше: git add . / git commit -m \"fix answer keys\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
