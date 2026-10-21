"""Copy Russian structured explanations (explanations/ru/*.json) to identical questions in other tests.
Match = same normalised question text + same normalised correct-option text (+ same image if any)."""
import json, re, glob, os, html
R = re.compile(r"^const (?:questions|QUESTIONS)\s*=\s*(\[.*\]);\s*$", re.M)
def norm(s):
    s = html.unescape(re.sub(r'<[^>]+>', ' ', str(s)))
    s = re.sub(r'\\\(|\\\)|\\dfrac|\\frac|\\left|\\right|\\,|\;|\\quad|\\text|\\mathbin|[{}\\$]', '', s)
    s = re.sub(r'^\s*\d+\s*question\s*', '', s, flags=re.I)
    return re.sub(r'[^a-z0-9а-я%]+', '', s.lower())
tests = {}
for f in glob.glob('*.html'):
    m = R.search(open(f, encoding='utf-8').read())
    if m:
        try: tests[f[:-5]] = json.loads(m.group(1))
        except Exception: pass
ru = {f.split('/')[-1][:-5]: json.load(open(f, encoding='utf-8')) for f in glob.glob('explanations/ru/[!_]*.json')}
def key(q):
    if q.get('correct', -1) < 0: return None
    return (norm(q.get('text', '')), norm(q['options'][q['correct']]), q.get('image') or '')
import subprocess
EN = {}
for t in tests:   # English explanations as they were before the Russian rewrite (commit 64a6d8c~1)
    old = subprocess.run(['git', 'show', '64a6d8c~1:%s.html' % t], capture_output=True, text=True).stdout
    m = R.search(old) if old else None
    if m:
        try: EN[t] = {str(q['id']): q.get('explain', '') for q in json.loads(m.group(1))}
        except Exception: pass
def key2(t, q):
    e = EN.get(t, {}).get(str(q['id']))
    if not e or q.get('correct', -1) < 0: return None
    e = norm(e)
    return ('EN', e, norm(q['options'][q['correct']])) if len(e) > 20 else None
src = {}
for t, d in ru.items():
    for q in tests.get(t, []):
        e = d.get(str(q['id']))
        if not e: continue
        k = key(q)
        if k and len(k[0]) > 25: src.setdefault(k, e)
        k2 = key2(t, q)
        if k2: src.setdefault(k2, e)
n = 0
for t, qs in tests.items():
    for q in qs:
        k = key(q); k2 = key2(t, q)
        e = src.get(k) if k else None
        e = e or (src.get(k2) if k2 else None)
        if not e: continue
        d = ru.setdefault(t, {})
        if str(q['id']) not in d:
            d[str(q['id'])] = e; n += 1
for t, d in ru.items():
    if d: json.dump(d, open('explanations/ru/%s.json' % t, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('copied', n)
