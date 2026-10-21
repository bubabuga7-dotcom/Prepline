"""explanations/_keyfix.json: {"test": {"question id": correct index}} for answer keys found wrong while explaining.
Write explanations/<test>.json ({"<question id>": "explanation html"}) into the test pages as q.explain.
Only the explain field is touched.   python3 apply-explain.py"""
import json, re, glob
Q = re.compile(r"^(const (?:questions|QUESTIONS)\s*=\s*)(\[.*\])(;\s*)$", re.M)
tot = 0
import os
FIX = json.load(open('explanations/_keyfix.json')) if os.path.exists('explanations/_keyfix.json') else {}
for jf in sorted(glob.glob('explanations/[!_]*.json')):
    page = jf.split('/')[-1][:-5] + '.html'
    ex = json.load(open(jf, encoding='utf-8'))
    s = open(page, encoding='utf-8').read()
    m = Q.search(s)
    qs = json.loads(m.group(2))
    compact = ', ' not in m.group(2)[:200]
    n = 0
    for q in qs:
        e = ex.get(str(q['id']))
        if e and q.get('explain') != e: q['explain'] = e; n += 1
        fx = FIX.get(page[:-5], {}).get(str(q['id']))
        if fx is not None and q.get('correct') != fx:
            print('  answer key fixed: %s q%s %s -> %s' % (page, q['id'], 'ABCDEFGH'[q['correct']] if q['correct'] >= 0 else 'none', 'ABCDEFGH'[fx])); q['correct'] = fx; n += 1
        if fx is not None and q.get('verified') is False: q['verified'] = True; n += 1
    if n:
        body = json.dumps(qs, ensure_ascii=False, separators=(',', ':') if compact else None)
        s = s[:m.start(2)] + body + s[m.end(2):]
        open(page, 'w', encoding='utf-8').write(s)
    tot += n
print('explanations written:', tot)
