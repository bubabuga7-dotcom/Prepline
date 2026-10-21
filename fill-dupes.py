"""Copy an explanation to every other question with the same wording and the same correct option (duplicates across tests).
Writes into explanations/<test>.json, then run apply-explain.py.   python3 fill-dupes.py"""
import json, re, glob, os
Q = re.compile(r"^const (?:questions|QUESTIONS)\s*=\s*(\[.*\]);\s*$", re.M)
def norm(s):
    s = re.sub(r'<[a-zA-Z/][^>]*>', ' ', s or ''); s = re.sub(r'\\[()\[\]]|\\dfrac|\\frac|\\left|\\right|[{}\\$ ]', '', s)
    s = s.replace('−', '-').replace('&lt;', '<').replace('&gt;', '>').lower()
    return re.sub(r'^\d+question', '', re.sub(r'\W', '', s))
pages = {}
for f in glob.glob('*.html'):
    m = Q.search(open(f, encoding='utf-8').read())
    if m: pages[f[:-5]] = json.loads(m.group(1))
ex = {t: json.load(open('explanations/%s.json' % t)) for t in pages if os.path.exists('explanations/%s.json' % t)}
known = {}
for t, qs in pages.items():
    for q in qs:
        e = ex.get(t, {}).get(str(q['id'])) or q.get('explain')
        if e and not q.get('image') and isinstance(q.get('correct'), int) and 0 <= q['correct'] < len(q['options']) and len(norm(q.get('text'))) > 25:
            known.setdefault(norm(q['text']), (norm(q['options'][q['correct']]), e))
n = 0
for t, qs in pages.items():
    for q in qs:
        if q.get('explain') or q.get('image') or str(q['id']) in ex.get(t, {}): continue
        k = known.get(norm(q.get('text')))
        if not k or not isinstance(q.get('correct'), int) or q['correct'] < 0: continue
        if norm(q['options'][q['correct']]) != k[0]: print('  same question, different key:', t, q['id']); continue
        ex.setdefault(t, {})[str(q['id'])] = k[1]; n += 1
for t, d in ex.items(): json.dump(d, open('explanations/%s.json' % t, 'w'), ensure_ascii=False, indent=0)
print('copied', n)
