# -*- coding: utf-8 -*-
"""
Prepline: проставляет вопросам коды тем по спецификации NUET.

Читает topics-math.json вида:
  { "mix-1.html": { "1": "M4.11", "2": "M3.9", ... }, ... }
и записывает поле "topic" в соответствующие вопросы.

Запускать столько раз, сколько нужно: файл пополняется новыми партиями,
уже проставленные коды просто перезаписываются теми же значениями.
Изменить чей-то код можно правкой topics-math.json и повторным запуском.

Как запустить:
  положить в папку Prepline вместе с topics-math.json и выполнить:
      python apply-topics.py

Безопасность: оригиналы копируются в backup-topics/
"""

import json
import os
import re
import shutil
import sys

BACKUP = "backup-topics"
MAP = "topics-math.json"
VALID = re.compile(r"^M[1-5]\.\d{1,2}$")


def main():
    if not os.path.exists(MAP):
        print("Не вижу " + MAP + ". Положи его рядом со скриптом.")
        return 1

    mapping = json.load(open(MAP, encoding="utf-8"))
    os.makedirs(BACKUP, exist_ok=True)

    total_set = 0
    total_changed = 0
    bad_codes = []
    missing_ids = []

    for filename, codes in sorted(mapping.items()):
        if not os.path.exists(filename):
            print("  пропуск, файла нет: " + filename)
            continue

        with open(filename, encoding="utf-8", errors="ignore") as fh:
            html = fh.read()

        wrote = 0
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
            for qid, code in codes.items():
                if not VALID.match(code):
                    bad_codes.append((filename, qid, code))
                    continue
                q = by_id.get(str(qid))
                if q is None:
                    missing_ids.append((filename, qid))
                    continue
                if q.get("topic") != code:
                    q["topic"] = code
                    wrote += 1
                else:
                    q["topic"] = code

            new_arr = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
            html = html[:m.start(1)] + new_arr + html[m.end(1):]
            break

        original = open(filename, encoding="utf-8", errors="ignore").read()
        if html != original:
            shutil.copy2(filename, os.path.join(BACKUP, filename))
            with open(filename, "w", encoding="utf-8") as fh:
                fh.write(html)
            total_changed += 1
        total_set += len(codes)
        print("  %-16s кодов: %-4d изменено: %d" % (filename, len(codes), wrote))

    print()
    print("файлов затронуто:   " + str(total_changed))
    print("кодов проставлено:  " + str(total_set))
    if bad_codes:
        print("НЕВЕРНЫЙ ФОРМАТ КОДА: " + str(bad_codes[:5]))
    if missing_ids:
        print("НЕТ ТАКОГО ВОПРОСА:   " + str(missing_ids[:5]))
    print("копии оригиналов:   " + BACKUP + "/")
    print()
    print("Дальше: git add . / git commit -m \"math topics\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
