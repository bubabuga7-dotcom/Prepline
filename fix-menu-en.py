# -*- coding: utf-8 -*-
"""
Prepline: переводит остаток меню на английский.

Пункт «Слабые места» был вставлен в меню HTML-кодами (&#1057;&#1083;...),
а не буквами, поэтому прошлый перевод его не увидел. Скрипт декодирует
такие последовательности и заменяет их английским текстом.

Заодно проверяет весь сайт и на обычную, и на закодированную кириллицу.

Как запустить:
  положить в папку Prepline и выполнить:  python fix-menu-en.py

Безопасность: оригиналы копируются в backup-menu/
"""

import glob
import html as H
import os
import re
import shutil
import sys

BACKUP = "backup-menu"

REPLACEMENTS = [
    ('aria-label="&#1057;&#1083;&#1072;&#1073;&#1099;&#1077; &#1084;&#1077;&#1089;&#1090;&#1072;"',
     'aria-label="Weak spots"'),
    ('<span class="dock-tip">&#1057;&#1083;&#1072;&#1073;&#1099;&#1077; &#1084;&#1077;&#1089;&#1090;&#1072;</span>',
     '<span class="dock-tip">Weak spots</span>'),
    ("Слабые места", "Weak spots"),
]

ENTITY = re.compile(r"&#(\d{3,5});")


def decoded_cyrillic(text):
    """Сколько в тексте кириллицы, записанной HTML-кодами."""
    return sum(1 for m in ENTITY.finditer(text)
               if re.match(r"[А-Яа-яЁё]", H.unescape(m.group(0))))


def main():
    if not os.path.exists("index.html"):
        print("Не вижу index.html. Запусти скрипт внутри папки Prepline.")
        return 1
    os.makedirs(BACKUP, exist_ok=True)

    files_done = 0
    total = 0

    for f in sorted(glob.glob("*.html")):
        html = open(f, encoding="utf-8", errors="ignore").read()
        original = html
        n = 0
        for old, new in REPLACEMENTS:
            if old in html:
                n += html.count(old)
                html = html.replace(old, new)
        if html != original:
            shutil.copy2(f, os.path.join(BACKUP, f))
            open(f, "w", encoding="utf-8").write(html)
            files_done += 1
            total += n
            print("  %-22s замен: %d" % (f, n))

    # --- честная проверка: и буквы, и коды ---
    print()
    print("Проверка всего сайта:")
    plain_left = 0
    coded_left = 0
    for f in sorted(glob.glob("*.html")):
        html = open(f, encoding="utf-8", errors="ignore").read()
        p = len(re.findall(r"[А-Яа-яЁё]", html))
        c = decoded_cyrillic(html)
        if p or c:
            print("  %-22s буквами: %-5d кодами: %d" % (f, p, c))
        plain_left += p
        coded_left += c

    print()
    print("файлов изменено:           " + str(files_done))
    print("замен:                     " + str(total))
    print("осталось русского буквами: " + str(plain_left))
    print("осталось русского кодами:  " + str(coded_left))
    print("копии оригиналов:          " + BACKUP + "/")
    print()
    print("Дальше: git add . / git commit -m \"english menu\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
