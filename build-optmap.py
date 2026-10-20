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
            if chain[-1] is None or miss > (2 if n >= 5 else 1) or (miss and n < 4):
                continue
            # a missing letter that does exist elsewhere in the picture means a different layout (a grid): no guessing
            if any(x is None and by[L] for x, L in zip(chain, want)):
                continue
            chain = interpolate(chain)
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
        g = find_grid(by, want, W, H)
        if g:
            return 'grid', g
        return None, None
    return best[1], best[2]


def interpolate(chain):
    """Fill missing labels evenly between the nearest found ones."""
    found = [i for i, x in enumerate(chain) if x]
    if found[0] != 0:
        return None
    out = list(chain)
    for i, x in enumerate(chain):
        if x is None:
            p = max(j for j in found if j < i); q = min(j for j in found if j > i)
            f = (i - p) / (q - p); P, Q = chain[p], chain[q]
            out[i] = dict(P, l=P['l'] + f * (Q['l'] - P['l']), t=P['t'] + f * (Q['t'] - P['t']), text='?')
    return out


def find_grid(by, want, W, H):
    """Labels in reading order over several rows: 'A B / C D / E', or 'A B C D / E'.
    Every label must be found, each new row must start under A, and at least one row holds two labels."""
    best = None
    for a in by['A']:
        rows, chain = [[a]], [a]
        for L in want[1:]:
            prev = chain[-1]
            pcy = prev['t'] + prev['h'] / 2
            same = [c for c in by[L] if abs(c['t'] + c['h'] / 2 - pcy) < 0.9 * a['h'] and c['l'] > prev['l'] + prev['w'] + a['h']]
            if same:
                pick = min(same, key=lambda c: c['l']); rows[-1].append(pick)
            else:
                below = [c for c in by[L] if c['t'] > prev['t'] + 1.2 * prev['h'] and abs(c['l'] - a['l']) < max(0.04 * W, 2 * a['h'])]
                if not below:
                    chain = None; break
                pick = min(below, key=lambda c: c['t']); rows.append([pick])
            chain.append(pick)
        if not chain or len(rows) < 2 or max(len(r) for r in rows) < 2:
            continue
        # columns line up: a label in row k sits under some label of row 0 (or past its right end)
        xs = [c['l'] for c in rows[0]]
        if not all(any(abs(c['l'] - x) < max(0.05 * W, 3 * a['h']) for x in xs) for r in rows[1:] for c in r):
            continue
        score = a['t']
        if best is None or score > best[0]:
            best = (score, rows)
    if not best:
        return None
    return best[1]


def boxes(kind, labels, words, W, H):
    if kind == 'grid':
        return grid_boxes(labels, W, H)
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
        # never more than about a line above or below the labels: keeps the question text and figures out
        top, bot = max(top, cy - 2.0 * lh), min(bot, cy + 2.0 * lh)
        for i, l in enumerate(labels):
            x = l['l'] - pad
            x2 = labels[i + 1]['l'] - pad if i < n - 1 else W
            out.append([max(0, x), max(0, top), min(W, x2) - max(0, x), min(H, bot) - max(0, top)])
    # sanity: boxes must not overlap and must be big enough to tap
    for b in out:
        if b[2] < 12 or b[3] < 10:
            return None
    return out


def grid_boxes(rows, W, H):
    """Each label owns the area to its right (up to the next label in its row) and down to the next row."""
    lh = sorted(c['h'] for r in rows for c in r)[0]
    pad = max(4, int(0.5 * lh))
    xs0 = rows[0][0]['l']
    out = []
    for k, r in enumerate(rows):
        top = min(c['t'] for c in r) - pad
        bot = (min(c['t'] for c in rows[k + 1]) - pad) if k + 1 < len(rows) else None
        for i, c in enumerate(r):
            x1 = c['l'] - pad
            # the next label to the right in this row, or in the first row when this one ends early
            nxt = r[i + 1]['l'] if i + 1 < len(r) else next((d['l'] for d in rows[0] if d['l'] > c['l'] + c['w'] + lh), W)
            x2 = nxt - pad if nxt < W else W
            if bot is None:
                # last row: as tall as the row above it, within the picture
                hgt = min(d['t'] for d in rows[k]) - min(d['t'] for d in rows[k - 1])
                b = min(H, top + hgt)
            else:
                b = bot
            out.append([max(0, x1), max(0, top), min(W, x2) - max(0, x1), b - max(0, top)])
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
    import io
    found = None
    passes = [(2 if W < 900 else 1, False, (3, 11, 6)), (3 if W < 900 else 2, True, (3, 11, 4))]
    for scale, binar, psms in passes:
        big = im.resize((W * scale, H * scale), Image.LANCZOS) if scale > 1 else im
        if binar:
            big = big.point(lambda v: 0 if v < 170 else 255)
        buf = io.BytesIO(); big.save(buf, 'PNG'); data = buf.getvalue()
        for psm in psms:
            words = ocr(data, psm)
            for w in words:
                for k in ('l', 't', 'w', 'h'):
                    w[k] = w[k] / scale
            kind, labels = find_set(candidates(words), n, W, H)
            if labels:
                b = boxes(kind, labels, words, W, H)
                if b:
                    flat = [c for r in labels for c in r] if kind == 'grid' else labels
                    r = dict(kind=kind, boxes=[[round(v / d, 4) for v, d in zip(bb, (W, H, W, H))] for bb in b])
                    if all(l.get('text') != '?' for l in flat):
                        return path, r
                    found = found or r
        if found:
            break
    return path, found


def main():
    draw_dir = sys.argv[sys.argv.index('--draw') + 1] if '--draw' in sys.argv else None
    need = used_images()
    only = [a for a in sys.argv[1:] if a.startswith('images/')]
    items = [(p, n) for p, n in sorted(need.items()) if os.path.exists(p) and (not only or p in only)]
    old = {}
    if '--missing' in sys.argv:
        old = json.load(open('option-map.json'))
        redo = set(json.load(open(sys.argv[sys.argv.index('--redo') + 1]))) if '--redo' in sys.argv else set()
        items = [(p, n) for p, n in items if p not in old or p in redo]
        for p in redo:
            old.pop(p, None)
    res = {}
    with ProcessPoolExecutor(os.cpu_count()) as ex:
        for i, (p, r) in enumerate(ex.map(analyse, items, chunksize=8)):
            if r:
                res[p] = r
            if i % 200 == 0:
                print(i, '/', len(items), 'found', len(res), flush=True)
    out = {p: r['boxes'] for p, r in res.items()}
    json.dump(dict(old, **out), open('option-map.json', 'w'), separators=(',', ':'))
    json.dump({p: r['kind'] for p, r in res.items()}, open('option-map-new.json', 'w'))
    print('done:', len(out), 'of', len(items), 'images mapped;',
          sum(1 for r in res.values() if r['kind'] == 'col'), 'columns,', sum(1 for r in res.values() if r['kind'] == 'row'), 'rows,', sum(1 for r in res.values() if r['kind'] == 'grid'), 'grids')
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
