# -*- coding: utf-8 -*-
"""Сколько вопросов на каждой странице всё ещё показывают картинку.

Запуск из папки Prepline:
    python images-left.py
"""

import glob
import json
import re

print("%-22s %6s %6s %6s" % ("страница", "всего", "текст", "картинка"))
total_img = 0
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
        continue
    img = [q for q in qs if (q.get("image") or "").strip()]
    txt = [q for q in qs if (q.get("text") or "").strip()]
    total_img += len(img)
    if img:
        print("%-22s %6d %6d %6d   %s" % (filename, len(qs), len(txt), len(img),
                                          ",".join(str(q.get("id")) for q in img[:12])))
print()
print("вопросов с картинкой осталось: " + str(total_img))
print("Ожидаемо: это чертежи, графики и вопросы, где сами ответы — картинки.")
