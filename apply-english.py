# -*- coding: utf-8 -*-
"""
Prepline: переводит вопросы на английский.

Читает translations-en.json вида:
  { "mix-1.html": { "1": {"text": "...", "options": ["...", "..."]}, ... }, ... }
и подставляет текст и варианты в соответствующие вопросы.

Порядок вариантов сохраняется, поле correct не трогается — верные ответы
остаются на своих местах. Если число вариантов не совпадает, вопрос
пропускается и попадает в отчёт.

Как запустить:
  положить в папку Prepline вместе с translations-en.json и выполнить:
      python apply-english.py

Безопасность: оригиналы копируются в backup-english/
"""

import json
import os
import re
import shutil
import sys

BACKUP = "backup-english"
MAP = "translations-en.json"
CYRILLIC = re.compile(r"[А-Яа-яЁё]")


def main():
    if not os.path.exists(MAP):
        print("Не вижу " + MAP + ". Положи его рядом со скриптом.")
        return 1

    mapping = json.load(open(MAP, encoding="utf-8"))
    os.makedirs(BACKUP, exist_ok=True)

    total = 0
    skipped = []
    files_done = 0

    for filename, items in sorted(mapping.items()):
        if not os.path.exists(filename):
            print("  пропуск, файла нет: " + filename)
            continue

        with open(filename, encoding="utf-8", errors="ignore") as fh:
            original = fh.read()
        html = original
        done = 0

        for var in ("questions", "QUESTIONS"):
            m = re.search(r"const " + var + r"\s*=\s*(\[.*?\]);", html, re.S)
            if not m:
                continue
            try:
                data = json.loads(m.group(1))
            except Exception as e:
                print("  ОШИБКА разбора " + filename + ": " + str(e)[:60])
                break

            by_id = {str(q.get("id")): q for q in data}
            for qid, tr in items.items():
                q = by_id.get(str(qid))
                if q is None:
                    skipped.append((filename, qid, "нет такого вопроса"))
                    continue
                new_opts = tr.get("options")
                if new_opts is not None and len(new_opts) != len(q.get("options", [])):
                    skipped.append((filename, qid, "разное число вариантов: было %d, дают %d"
                                    % (len(q.get("options", [])), len(new_opts))))
                    continue
                if tr.get("text") is not None:
                    q["text"] = tr["text"]
                if new_opts is not None:
                    q["options"] = list(new_opts)
                done += 1

            new_arr = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
            html = html[:m.start(1)] + new_arr + html[m.end(1):]
            break

        if html != original:
            shutil.copy2(filename, os.path.join(BACKUP, filename))
            with open(filename, "w", encoding="utf-8") as fh:
                fh.write(html)
            files_done += 1

        # сколько кириллицы осталось в самих вопросах
        left = 0
        m = re.search(r"const (?:questions|QUESTIONS)\s*=\s*(\[.*?\]);", html, re.S)
        if m:
            try:
                for q in json.loads(m.group(1)):
                    blob = str(q.get("text", "")) + " ".join(str(o) for o in q.get("options", []))
                    if CYRILLIC.search(blob):
                        left += 1
            except Exception:
                pass

        total += done
        print("  %-16s переведено: %-4d осталось с русским: %d" % (filename, done, left))

    print()
    print("файлов изменено:    " + str(files_done))
    print("вопросов переведено:" + str(total))
    if skipped:
        print("ПРОПУЩЕНО:")
        for s in skipped[:10]:
            print("   " + str(s))
    print("копии оригиналов:   " + BACKUP + "/")
    print()
    print("Дальше: git add . / git commit -m \"english questions\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
