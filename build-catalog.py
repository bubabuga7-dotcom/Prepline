"""One-off: extract every test card from the old math.html / crit.html into tests.js.
tests.js is the single list of tests used by the hubs and the dashboard.
Run once on the OLD hubs; after that edit tests.js directly when adding tests."""
import re, json, html

def parse(path, kind):
    s = open(path, encoding='utf-8').read()
    body = s[s.find('<main>'):s.find('</main>')]
    out, group = [], None
    for m in re.finditer(r'<h2[^>]*>(.*?)</h2>|<h3>(.*?)</h3>\s*<div class="mock-meta">(.*?)</div>\s*</div>\s*<a href="([^"]+)"', body, re.S):
        if m.group(1):
            group = re.sub(r'<[^>]+>', ' ', m.group(1)).split('  ')[0].strip()
            continue
        title, meta, href = m.group(2), m.group(3), m.group(4)
        text = html.unescape(re.sub(r'<[^>]+>', '', meta))
        q = re.search(r'(\d+) questions', text)
        mins = re.search(r'(\d+) min', text)
        parts = [p.strip() for p in text.split('·')]
        drop = {'Mathematics', 'Critical Thinking', 'Past paper'}
        src = ' · '.join(p for p in parts if p not in drop and not re.fullmatch(r'\d+ (questions|min)', p))
        num = int(re.search(r'(\d+)$', title).group(1))
        out.append({
            'id': href.replace('.html', ''), 'kind': kind, 'n': num,
            'group': group or ('Topic mix' if kind == 'ct' else 'Mixed tests'),
            'q': int(q.group(1)) if q else 30,
            'min': int(mins.group(1)) if mins else (int(q.group(1)) if q else 30),
            'src': src,
        })
    return out

tests = parse('math.html', 'math') + parse('crit.html', 'ct')
for i, (tid, name) in enumerate([('test', 'Mock Exam #1'), ('test-2', 'Mock Exam #2'), ('test-3', 'Mock Exam #3')], 1):
    tests.append({'id': tid, 'kind': 'math', 'n': i, 'group': 'Original mock exams', 'q': 30, 'min': 60, 'src': name})

rename = {'More mocks': 'Mock collection', 'Past papers BMAT': 'Past papers'}
for t in tests:
    for k, v in rename.items():
        if t['group'].startswith(k): t['group'] = v

with open('tests.js', 'w', encoding='utf-8') as f:
    f.write('/* Prepline test catalog: one entry per test page. Edit here when adding tests. */\n')
    f.write('window.PREPLINE_TESTS = ' + json.dumps(tests, ensure_ascii=False, indent=0) + ';\n')

from collections import Counter
print(len(tests), Counter((t['kind'], t['group']) for t in tests))
