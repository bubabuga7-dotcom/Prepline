"""Write each test's share of tap-to-answer questions into tests.js as "tap" (0-100).
hub.js lists groups and tests with more tap questions first.
Run after rebuilding option-map.json:  python3 set-tap-order.py"""
import json, re

m = json.load(open('option-map.json'))
src = open('tests.js', encoding='utf-8').read()
head, body, tail = re.match(r'(.*?window\.PREPLINE_TESTS = )(\[.*?\n\])(;.*)', src, re.S).groups()
tests = json.loads(body)
for t in tests:
    s = open(t['id'] + '.html', encoding='utf-8').read()
    mm = re.search(r'const questions = (\[.*?\]);\n', s, re.S)
    if not mm:
        t['tap'] = 0
        continue
    q = json.loads(mm.group(1))
    tap = sum(1 for x in q if x.get('image') in m and all(len(o) <= 1 for o in x['options']))
    t['tap'] = round(100 * tap / max(1, len(q)))
open('tests.js', 'w', encoding='utf-8').write(head + json.dumps(tests, ensure_ascii=False, indent=0) + tail)
print({k: sum(t['tap'] for t in tests if t['kind'] == k) // max(1, sum(1 for t in tests if t['kind'] == k)) for k in ('math', 'ct')})
