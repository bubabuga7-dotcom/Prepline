# -*- coding: utf-8 -*-
"""
Prepline: вписывает распознанный текст вопросов обратно в страницы.

Вход: questions-text.json — то, что выдал конвертер:
  { "mix-12.html": { "1": {"text": "...", "options": [...],
                           "keep_image": false, "review": false } } }

Что делает с каждым вопросом:
  * text     <- распознанный текст
  * options  <- распознанные варианты (порядок сохраняется, correct не трогается)
  * orig     <- путь к исходной картинке (остаётся всегда, как страховка)
  * image    <- остаётся только если keep_image=true, иначе пустеет
  * review   <- true, если конвертер пометил вопрос к проверке

Поле correct НЕ меняется ни при каких условиях.
Если число вариантов не совпало с исходным — вопрос ПРОПУСКАЕТСЯ,
потому что при сдвиге вариантов правильный ответ поехал бы.

Также добавляет в страницы KaTeX, чтобы формулы в $...$ рисовались.

Запуск из папки Prepline:
    python apply-text.py
    python apply-text.py --no-katex     (только текст, без формул)
"""

import glob
import json
import os
import re
import shutil
import sys

SRC = "questions-text.json"
EXTRA_GLOB = "questions-text-*.json"
MANUAL = "manual-fixes.json"
BACKUP = "backup-text"

KATEX = """
<link rel="stylesheet" href="vendor/katex/katex.min.css">
<script defer src="vendor/katex/katex.min.js"></script>
<script defer src="vendor/katex/contrib/auto-render.min.js"></script>
<script>
(function(){
  var pending = null;
  function draw(){
    if(!window.renderMathInElement) return;
    renderMathInElement(document.body, {
      delimiters: [{left:"\\\\[",right:"\\\\]",display:true},{left:"\\\\(",right:"\\\\)",display:false}],
      throwOnError: false
    });
  }
  function schedule(){ clearTimeout(pending); pending = setTimeout(draw, 60); }
  window.addEventListener("load", function(){
    schedule();
    new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true});
  });
})();
</script>
"""

MARK = "katex.min.css"


def md_inline(s):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<em>\1</em>", s)
    return s


def md_to_html(text):
    """Markdown из распознавания -> HTML. Формулы в $...$ не трогаем, их рисует KaTeX."""
    lines = str(text).split("\n")
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # таблица: строка с | и следующая строка-разделитель
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i+1]):
            header = [c.strip() for c in stripped.strip("|").split("|")]
            i += 2
            body = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                body.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            html = ['<table class="q-table"><thead><tr>']
            html += ["<th>" + md_inline(c) + "</th>" for c in header]
            html.append("</tr></thead><tbody>")
            for row in body:
                html.append("<tr>" + "".join("<td>" + md_inline(c) + "</td>" for c in row) + "</tr>")
            html.append("</tbody></table>")
            out.append("".join(html))
            continue

        # маркированный список
        if re.match(r"^\s*[-*]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                items.append("<li>" + md_inline(re.sub(r"^\s*[-*]\s+", "", lines[i])) + "</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue

        # нумерованный список
        if re.match(r"^\s*\d+[.)]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\s*\d+[.)]\s+", lines[i]):
                items.append("<li>" + md_inline(re.sub(r"^\s*\d+[.)]\s+", "", lines[i])) + "</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue

        if not stripped:
            i += 1
            continue

        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^\s*([-*]|\d+[.)])\s+", lines[i]) \
                and not lines[i].strip().startswith("|"):
            para.append(lines[i].strip())
            i += 1
        out.append("<p>" + md_inline(" ".join(para)) + "</p>")

    return "".join(out)


TABLE_CSS = """
<style>
.q-table{border-collapse:collapse;margin:10px 0;font-size:.95em}
.q-table th,.q-table td{border:1px solid rgba(128,150,200,.45);padding:4px 10px;text-align:left}
.q-table th{font-weight:600}
</style>
"""


def apply_katex(html):
    if MARK in html:
        return html, False
    if "</body>" in html:
        return html.replace("</body>", TABLE_CSS + KATEX + "</body>", 1), True
    return html + TABLE_CSS + KATEX, True


def unescape_text_render(html):
    """В списках/разборе текст вопроса выводится через esc(q.text) — тогда HTML
    показался бы тегами. Снимаем экранирование только для текста вопроса."""
    before = html
    html = html.replace("esc(q.text)", "q.text")
    html = html.replace("esc(q.options[", "(q.options[")
    return html, html != before


def is_placeholder(opts):
    """В страницах Prepline варианты хранятся как заглушки ['A','B','C','D','E'],
    сам вариант ученик читает с картинки. Тогда число вариантов ничего не значит."""
    return all(re.match(r"^[A-E]$", str(o).strip()) for o in opts) if opts else False


def looks_like_description(opts):
    """Варианты-картинки модель описывает словами: '[Bar chart A: ...]'.
    Такими подменять настоящие варианты нельзя. Пустой список — тоже не замена."""
    if not opts:
        return True
    for o in opts:
        s = str(o).strip()
        if not s:
            return True
        if s.startswith("[") and s.endswith("]"):
            return True
        if re.match(r"^(Graph|Bar chart|Net|Image|Diagram)\s+[A-E]\b", s):
            return True
    return False


NUM_PREFIX = re.compile(r"^\s*\d{1,2}\s*[.)]\s*")


def main():
    no_katex = "--no-katex" in sys.argv

    sources = []
    if os.path.exists(SRC):
        sources.append(SRC)
    sources += sorted(glob.glob(EXTRA_GLOB))
    if os.path.exists(MANUAL):
        sources.append(MANUAL)  # ручные правки идут последними и перекрывают остальное

    if not sources:
        print("Нет ни " + SRC + ", ни " + MANUAL + " — положи их рядом со скриптом.")
        return 1

    data = {}
    for name in sources:
        try:
            part = json.load(open(name, encoding="utf-8"))
        except Exception as e:
            print("  НЕ ЧИТАЕТСЯ " + name + ": " + str(e)[:80])
            continue
        n = 0
        for filename, items in part.items():
            bucket = data.setdefault(filename, {})
            for qid, rec in items.items():
                if str(qid).startswith("_failed"):
                    continue
                bucket[str(qid)] = rec
                n += 1
        print("  прочитан " + name + ": " + str(n) + " вопросов")
    print()
    os.makedirs(BACKUP, exist_ok=True)

    written = 0
    skipped_count = 0
    skipped_examples = []
    flagged = 0
    kept_opts = 0
    count_changed = 0
    images_kept = 0
    files_touched = 0

    for filename, items in sorted(data.items()):
        if not os.path.exists(filename):
            print("  нет файла, пропуск: " + filename)
            continue

        with open(filename, encoding="utf-8", errors="ignore") as fh:
            html = fh.read()
        original = html

        m = re.search(r"const (questions|QUESTIONS)\s*=\s*(\[.*?\]);", html, re.S)
        if not m:
            print("  не нашёл массив вопросов: " + filename)
            continue
        try:
            qs = json.loads(m.group(2))
        except Exception as e:
            print("  ОШИБКА разбора " + filename + ": " + str(e)[:60])
            continue

        by_id = {str(q.get("id")): q for q in qs}
        local = 0
        for qid, rec in items.items():
            q = by_id.get(str(qid))
            if q is None:
                continue
            old_opts = q.get("options") or []
            new_opts = rec.get("options") or []
            keep_old_opts = looks_like_description(new_opts)
            count_off = bool(old_opts) and len(old_opts) != len(new_opts)
            if not keep_old_opts and count_off and not is_placeholder(old_opts):
                skipped_count += 1
                if len(skipped_examples) < 8:
                    skipped_examples.append(filename + " №" + str(qid) +
                                            " (" + str(len(old_opts)) + "→" + str(len(new_opts)) + ")")
                continue

            body = NUM_PREFIX.sub("", rec.get("text", ""), count=1)
            q["text"] = md_to_html(body)
            if keep_old_opts:
                kept_opts += 1
                q["review"] = True
                if q.get("image"):
                    q["orig"] = q["image"]
                flagged += 1
                local += 1
                written += 1
                continue
            q["options"] = [md_inline(o) for o in new_opts]
            if count_off:
                q["review"] = True
                count_changed += 1
                flagged += 1
            if q.get("image"):
                q["orig"] = q["image"]
            if rec.get("keep_image"):
                images_kept += 1
            else:
                q["image"] = ""
            if rec.get("review"):
                q["review"] = True
                flagged += 1
            local += 1
            written += 1

        new_arr = json.dumps(qs, ensure_ascii=False, separators=(",", ":"))
        html = html[:m.start(2)] + new_arr + html[m.end(2):]

        if not no_katex:
            html, added = apply_katex(html)
        html, _ = unescape_text_render(html)
        if html != original:
            shutil.copy2(filename, os.path.join(BACKUP, filename))
            with open(filename, "w", encoding="utf-8") as fh:
                fh.write(html)
            files_touched += 1
        print("  %-22s вписано: %d" % (filename, local))

    print()
    print("вопросов переведено в текст: " + str(written))
    print("картинок оставлено (чертежи): " + str(images_kept))
    print("помечено к ручной проверке:   " + str(flagged))
    print("вариантов оставлено как было (картинки-ответы): " + str(kept_opts))
    print("число вариантов изменилось, проверь ключ ответа: " + str(count_changed))
    print("пропущено из-за расхождения вариантов: " + str(skipped_count))
    for s in skipped_examples:
        print("    " + s)
    print("файлов изменено: " + str(files_touched) + " · копии в " + BACKUP + "/")
    print()
    print("Проверь пару страниц в браузере, потом: git add . && git commit -m \"text questions\" && git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
