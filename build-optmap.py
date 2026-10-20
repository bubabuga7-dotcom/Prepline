"""Find where the answer options A-E sit inside question images, so the test can be answered by tapping the picture.

Writes option-map.json: {"images/...": [[x, y, w, h], ...]} as fractions of the image size, one box per option.
Only images where every option label was found in a clean row or column are written; the rest keep answer buttons.

    python3 build-optmap.py            # all images used by tests
    python3 build-optmap.py --draw DIR # also save previews with the boxes drawn
"""
import glob, json, os, re, subprocess, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageDraw

LETTERS = 'ABCDEFGH'
STRIP = '()[]{}=*:.,;|\'"‘’`~^_-—–'
FUZZY = {'A': 'Aa4', 'B': 'Bb8', 'C': 'Cc©(G', 'D': 'DdpPO0', 'E': 'EeF£€', 'F': 'Ff', 'G': 'G', 'H': 'H'}


def used_images():
    need = {}
    for f in glob.glob('mix-*.html') + glob.glob('crit-*.html'):
        s = open(f, encoding='utf-8').read()
        m = re.search(r'const questions = (\[.*?\]);\n', s, re.S)
        if not m:
            continue
        try:
            qs = json.loads(m.group(1))
        except Exception:
            continue
        for q in qs:
            if q.get('image') and q.get('options') and all(len(o) <= 1 for o in q['options']):
                need[q['image']] = max(need.get(q['image'], 0), len(q['options']))
    return need


def ocr(img, psm):
    out = subprocess.run(['tesseract', 'stdin', 'stdout', '--psm', str(psm), 'tsv'],
                         input=img, capture_output=True).stdout.decode('utf-8', 'replace')
    words = []
    for line in out.splitlines()[1:]:
        p = line.split('\t')
        if len(p) < 12 or p[0] != '5' or not p[11].strip():
            continue
        l, t, w, h = map(int, p[6:10])
        words.append(dict(text=p[11].strip(), l=l, t=t, w=w, h=h, key=(p[2], p[3], p[4]), wn=int(p[5])))
    return words


def candidates(words):
    """Words that may be an option label: 'A', 'a)', '(A)', 'A=' (OCR noise), or glued to the answer 'A)25'."""
    c = []
    for w in words:
        t = w['text']
        core = t.strip(STRIP)
        glued = False
        if len(core) != 1:
            m = re.match(r'^[\(\[]?([A-Ha-h©])[\)\].]\S', t)
            if not m:
                continue
            core, glued = m.group(1), True
        letters = [L for L, f in FUZZY.items() if core in f]
        if not letters:
            continue
        bare = t == core
        if bare and w['wn'] != 1:
            prev = [x for x in words if x['key'] == w['key'] and x['wn'] == w['wn'] - 1]
            # a lone letter right after a word is part of a sentence ("A glass", "x y"), not a label
            if prev and w['l'] - (prev[0]['l'] + prev[0]['w']) < 2.5 * w['h']:
                continue
        c.append(dict(w, letters=letters, glued=glued))
    return c


def find_set(cands, n, W, H):
    """One label per letter forming a column (same x, y going down) or a row (same y, x going right).
    One missing label in the middle is allowed and placed between its neighbours."""
    want = LETTERS[:n]
    by = {L: [c for c in cands if L in c['letters']] for L in want}
    best = None
    for a in by['A']:
        for kind in ('col', 'row'):
            chain, miss = [a], 0
            for L in want[1:]:
                prev = next(x for x in reversed(chain) if x)
                if kind == 'col':
                    opts = [c for c in by[L] if abs(c['l'] - a['l']) < max(0.04 * W, 2 * a['h']) and c['t'] > prev['t'] + 0.6 * prev['h']]
                    pick = min(opts, key=lambda c: c['t']) if opts else None
                else:
                    opts = [c for c in by[L] if abs((c['t'] + c['h'] / 2) - (a['t'] + a['h'] / 2)) < 1.0 * a['h'] and c['l'] > prev['l'] + prev['w']]
                    pick = min(opts, key=lambda c: c['l']) if opts else None
                if not pick:
                    miss += 1
                chain.append(pick)
            if chain[-1] is None or miss > 1 or (miss and n < 4):
                continue
            for i, x in enumerate(chain):          # fill a gap from its neighbours
                if x is None:
                    p, q = chain[i - 1], chain[i + 1]
                    if p is None or q is None:
                        chain = None
                        break
                    chain[i] = dict(p, l=(p['l'] + q['l']) / 2, t=(p['t'] + q['t']) / 2, text='?')
            if not chain:
                continue
            pos = [x['t'] for x in chain] if kind == 'col' else [x['l'] for x in chain]
            gaps = [pos[i + 1] - pos[i] for i in range(n - 1)]
            if min(gaps) <= 0 or max(gaps) > 3.5 * min(gaps) + 3 * a['h']:
                continue
            score = (miss == 0, a['t'])
            if not best or score > best[0]:
                best = (score, kind, chain)
    if not best:
        return None, None
    return best[1], best[2]


def boxes(kind, labels, words, W, H):
    n = len(labels)
    lh = sorted(l['h'] for l in labels)[n // 2]
    pad = max(4, int(0.35 * lh))
    out = []
    if kind == 'col':
        gaps = [labels[i + 1]['t'] - labels[i]['t'] for i in range(n - 1)]
        typical = sorted(gaps)[len(gaps) // 2]
        x0 = max(0, min(l['l'] for l in labels) - pad)
        for i, l in enumerate(labels):
            # an option's text runs down from its label, so its box ends just above the next label
            top = l['t'] - min(pad, (gaps[i - 1] - lh) * 0.3) if i else l['t'] - min(pad * 2, typical * 0.3)
            if i < n - 1:
                bot = labels[i + 1]['t'] - min(pad, (gaps[i] - lh) * 0.3)
            else:
                # last option: its own line(s) — words that start below it and above a big gap
                end = l['t'] + l['h']
                for w in sorted(words, key=lambda w: w['t']):
                    if w['t'] >= l['t'] - lh and w['t'] <= end + 1.2 * typical * 0.6 and w['t'] < l['t'] + typical:
                        end = max(end, w['t'] + w['h'])
                bot = end + pad
            right = W
            out.append([x0, max(0, top), right - x0, min(H, bot) - max(0, top)])
    else:
        cy = sum(l['t'] + l['h'] / 2 for l in labels) / n
        top, bot = cy - 1.6 * lh, cy + 1.6 * lh
        for w in words:            # stacked fractions / exponents around the row
            wc = w['t'] + w['h'] / 2
            if abs(wc - cy) < 2.2 * lh and w['l'] >= labels[0]['l'] - pad:
                top, bot = min(top, w['t'] - pad / 2), max(bot, w['t'] + w['h'] + pad / 2)
        for i, l in enumerate(labels):
            x = l['l'] - pad
            x2 = labels[i + 1]['l'] - pad if i < n - 1 else W
            out.append([max(0, x), max(0, top), min(W, x2) - max(0, x), min(H, bot) - max(0, top)])
    # sanity: boxes must not overlap and must be big enough to tap
    for b in out:
        if b[2] < 12 or b[3] < 10:
            return None
    return out


def analyse(path_n):
    path, n = path_n
    try:
        im = Image.open(path).convert('L')
    except Exception:
        return path, None
    W, H = im.size
    scale = 2 if W < 900 else 1
    big = im.resize((W * scale, H * scale), Image.LANCZOS) if scale > 1 else im
    import io
    buf = io.BytesIO(); big.save(buf, 'PNG'); data = buf.getvalue()
    found = None
    for psm in (3, 11, 6):
        words = ocr(data, psm)
        for w in words:
            for k in ('l', 't', 'w', 'h'):
                w[k] = w[k] / scale
        kind, labels = find_set(candidates(words), n, W, H)
        if labels:
            b = boxes(kind, labels, words, W, H)
            if b:
                r = dict(kind=kind, boxes=[[round(v / d, 4) for v, d in zip(bb, (W, H, W, H))] for bb in b])
                if all(l.get('text') != '?' for l in labels):
                    return path, r
                found = found or r
    return path, found


def main():
    draw_dir = sys.argv[sys.argv.index('--draw') + 1] if '--draw' in sys.argv else None
    need = used_images()
    only = [a for a in sys.argv[1:] if a.startswith('images/')]
    items = [(p, n) for p, n in sorted(need.items()) if os.path.exists(p) and (not only or p in only)]
    res = {}
    with ProcessPoolExecutor(os.cpu_count()) as ex:
        for i, (p, r) in enumerate(ex.map(analyse, items, chunksize=8)):
            if r:
                res[p] = r
            if i % 200 == 0:
                print(i, '/', len(items), 'found', len(res), flush=True)
    out = {p: r['boxes'] for p, r in res.items()}
    json.dump(out, open('option-map.json', 'w'), separators=(',', ':'))
    print('done:', len(out), 'of', len(items), 'images mapped;',
          sum(1 for r in res.values() if r['kind'] == 'col'), 'columns,', sum(1 for r in res.values() if r['kind'] == 'row'), 'rows')
    if draw_dir:
        os.makedirs(draw_dir, exist_ok=True)
        for p, bb in out.items():
            im = Image.open(p).convert('RGB'); W, H = im.size; d = ImageDraw.Draw(im)
            for i, b in enumerate(bb):
                x, y, w, h = b[0] * W, b[1] * H, b[2] * W, b[3] * H
                d.rectangle([x, y, x + w, y + h], outline=['red', 'blue', 'green', 'orange', 'purple', 'brown'][i % 6], width=3)
            im.save(os.path.join(draw_dir, p.replace('/', '_') + '.png'))


if __name__ == '__main__':
    main()
