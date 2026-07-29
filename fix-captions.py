# -*- coding: utf-8 -*-
"""
Prepline: заменяет оставшиеся русские подписи под картинками на английские.

Как запустить:
  положить в папку Prepline и выполнить:  python fix-captions.py

Безопасность: оригиналы копируются в backup-captions/
"""

import glob
import os
import re
import shutil
import sys

BACKUP = "backup-captions"
CAPTIONS = [
    ("Выбери ответ по изображению выше:", "Choose your answer from the image above:"),
    ("Выберите ответ по изображению выше:", "Choose your answer from the image above:"),
    ("Смотри изображение выше", "See the image above"),
]


def main():
    if not os.path.exists("index.html"):
        print("Не вижу index.html. Запусти скрипт внутри папки Prepline.")
        return 1
    os.makedirs(BACKUP, exist_ok=True)
    total = 0
    files = 0
    for f in sorted(glob.glob("*.html")):
        html = open(f, encoding="utf-8", errors="ignore").read()
        original = html
        n = 0
        for ru, en in CAPTIONS:
            n += html.count(ru)
            html = html.replace(ru, en)
        if html != original:
            shutil.copy2(f, os.path.join(BACKUP, f))
            open(f, "w", encoding="utf-8").write(html)
            files += 1
            total += n
            print("  %-24s подписей заменено: %d" % (f, n))
    print()
    print("файлов изменено:   " + str(files))
    print("подписей заменено: " + str(total))
    print("копии оригиналов:  " + BACKUP + "/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
