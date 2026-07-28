# -*- coding: utf-8 -*-
"""
Prepline: выносит картинки из HTML в отдельные файлы.

Что делает:
  1. находит все картинки, вшитые в HTML как base64
  2. сохраняет каждую в папку images/ отдельным файлом
  3. в HTML вместо огромной base64-строки ставит короткую ссылку на файл
  4. добавляет ленивую загрузку, чтобы картинки грузились по мере прокрутки
  5. одинаковые картинки сохраняет один раз

Как запустить:
  положить файл в папку Prepline и выполнить:  python split-images.py

Безопасность: перед правкой все HTML копируются в папку backup-html/
"""

import base64
import hashlib
import os
import re
import shutil
import sys

IMG_DIR = "images"
BACKUP_DIR = "backup-html"
PATTERN = re.compile(r'data:image/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+?)(?=["\'\)])')
EXT = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "gif": "gif",
       "webp": "webp", "svg+xml": "svg", "bmp": "bmp"}


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def main():
    html_files = sorted(f for f in os.listdir(".") if f.lower().endswith(".html"))
    if not html_files:
        print("HTML-файлы не найдены. Запусти скрипт внутри папки Prepline.")
        return 1

    os.makedirs(IMG_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)

    seen = {}          # hash -> имя файла
    total_before = 0
    total_after = 0
    saved_files = 0
    changed_files = 0

    for name in html_files:
        with open(name, encoding="utf-8", errors="ignore") as fh:
            html = fh.read()

        before = len(html.encode("utf-8"))
        total_before += before
        count = 0

        def replace(match):
            nonlocal count, saved_files
            mime, payload = match.group(1).lower(), match.group(2)
            payload = re.sub(r"\s+", "", payload)
            try:
                blob = base64.b64decode(payload)
            except Exception:
                return match.group(0)      # не тронем то, что не разобралось

            digest = hashlib.sha1(blob).hexdigest()[:10]
            if digest in seen:
                filename = seen[digest]
            else:
                filename = f"q-{digest}.{EXT.get(mime, 'bin')}"
                with open(os.path.join(IMG_DIR, filename), "wb") as out:
                    out.write(blob)
                seen[digest] = filename
                saved_files += 1
            count += 1
            return f"{IMG_DIR}/{filename}"

        new_html = PATTERN.sub(replace, html)

        # ленивая загрузка: картинки подтягиваются по мере прокрутки
        new_html = re.sub(r'<img (?![^>]*loading=)', '<img loading="lazy" ', new_html)

        if new_html != html:
            shutil.copy2(name, os.path.join(BACKUP_DIR, name))
            with open(name, "w", encoding="utf-8") as out:
                out.write(new_html)
            changed_files += 1

        after = len(new_html.encode("utf-8"))
        total_after += after
        if count:
            print(f"  {name:<20} {human(before):>9} -> {human(after):>9}   картинок: {count}")

    print()
    print(f"HTML-файлов изменено:   {changed_files}")
    print(f"картинок сохранено:     {saved_files} (папка {IMG_DIR}/)")
    print(f"HTML было:              {human(total_before)}")
    print(f"HTML стало:             {human(total_after)}")
    print(f"копии оригиналов:       {BACKUP_DIR}/")
    print()
    print("Проверь сайт локально, потом:")
    print("  git add .")
    print("  git commit -m \"split images out of html\"")
    print("  git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
