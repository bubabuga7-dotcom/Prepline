# -*- coding: utf-8 -*-
"""
Prepline: give every local script, stylesheet and data file a version tag, so a visitor never gets
a mix of old and new files after an update (GitHub Pages lets browsers cache files for 10 minutes).

    python3 stamp-versions.py      # run before every publish

The tag is a short hash of the file's content. Scripts that load other files are stamped first and
hashed after, round by round, so a change in answers.js also changes the tag of test-ux.js that loads it.
"""
import glob, hashlib, re

ASSETS = sorted(f for f in glob.glob('*.js') + glob.glob('*.css') + glob.glob('*.json') if f != 'sw.js')
NAMES = '|'.join(re.escape(a) for a in sorted(ASSETS, key=len, reverse=True))
HTML_RE = re.compile(r'((?:src|href)=")((?:' + NAMES + r'))(?:\?v=[A-Za-z0-9._-]*)?(")')
JS_RE = re.compile(r'(?<!src\^=)(([\'"]))((?:' + NAMES + r'))(?:\?v=[A-Za-z0-9._-]*)?(\2)')

def read(f): return open(f, encoding='utf-8', errors='ignore').read()
def h(f): return hashlib.sha1(read(f).encode('utf-8')).hexdigest()[:8]

changed = set()
for rnd in range(12):                       # scripts first, until their tags stop moving
    HASH = {a: h(a) for a in ASSETS}
    moved = False
    for f in [a for a in ASSETS if a.endswith('.js')]:
        s = read(f)
        new = JS_RE.sub(lambda m: m.group(1) + m.group(3) + ('?v=' + HASH[m.group(3)] if m.group(3) != f else '') + m.group(4), s)
        if new != s:
            open(f, 'w', encoding='utf-8').write(new); changed.add(f); moved = True
    if not moved: break
else:
    raise SystemExit('script tags did not settle: is there a loop of scripts loading each other?')
HASH = {a: h(a) for a in ASSETS}
for f in glob.glob('*.html'):
    s = read(f)
    new = HTML_RE.sub(lambda m: m.group(1) + m.group(2) + '?v=' + HASH[m.group(2)] + m.group(3), s)
    if new != s:
        open(f, 'w', encoding='utf-8').write(new); changed.add(f)
print('stamped', len(changed), 'files;', len(ASSETS), 'assets')
