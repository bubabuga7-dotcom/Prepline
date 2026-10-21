"""explanations/_keyfix.json: {"test": {"question id": correct index}} for answer keys found wrong while explaining.
Write explanations/<test>.json ({"<question id>": "explanation html"}) into the test pages as q.explain.
Only the explain field is touched.   python3 apply-explain.py"""
import json, re, glob
Q = re.compile(r"^(const (?:questions|QUESTIONS)\s*=\s*)(\[.*\])(;\s*)$", re.M)
tot = 0
import os
FIX = json.load(open('explanations/_keyfix.json')) if os.path.exists('explanations/_keyfix.json') else {}
import html as H
def render(o, letter):
    """o = {"i": idea, "s": [steps], "n": why-not (str or [str]), "t": trap/tip} -> html (Russian explanation)"""
    if isinstance(o, str): return o
    p = ['<div class="ex">']
    if o.get('i'): p.append('<div class="ex-h">✦ Идея</div><p class="ex-i">%s</p>' % o['i'])
    if o.get('s'): p.append('<div class="ex-h">Решение</div><ol class="ex-s">%s</ol>' % ''.join('<li>%s</li>' % x for x in o['s']))
    if letter: p.append('<div class="ex-a">Ответ: <b>%s</b></div>' % letter)
    n = o.get('n')
    if n:
        if isinstance(n, list): n = '<ul class="ex-n">%s</ul>' % ''.join('<li>%s</li>' % x for x in n)
        else: n = '<p>%s</p>' % n
        p.append('<div class="ex-h ex-x">✗ Почему не другие</div>' + n)
    if o.get('t'): p.append('<div class="ex-t"><b>⚠ Ловушка / совет.</b> %s</div>' % o['t'])
    p.append('</div>')
    return ''.join(p)
names = sorted({f.split('/')[-1] for f in glob.glob('explanations/[!_]*.json') + glob.glob('explanations/ru/[!_]*.json')})
for nm in names:
    jf = 'explanations/' + nm
    page = nm[:-5] + '.html'
    ex = json.load(open(jf, encoding='utf-8')) if os.path.exists(jf) else {}
    rf = 'explanations/ru/' + jf.split('/')[-1]
    RU = json.load(open(rf, encoding='utf-8')) if os.path.exists(rf) else {}
    s = open(page, encoding='utf-8').read()
    m = Q.search(s)
    qs = json.loads(m.group(2))
    compact = ', ' not in m.group(2)[:200]
    n = 0
    for q in qs:
        e = ex.get(str(q['id']))
        r = RU.get(str(q['id']))
        if r: e = render(r, 'ABCDEFGH'[FIX.get(page[:-5], {}).get(str(q['id']), q['correct'])] if q['correct'] >= 0 or FIX.get(page[:-5], {}).get(str(q['id'])) is not None else '')
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
