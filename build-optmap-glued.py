"""Third pass for option-map.json: images the first pass could not map.

Most of them print the label glued to the answer with no bracket ("A6", "c8", "A120", "B−3"),
which build-optmap.py does not accept as a label. Here such words also count as labels, then the
same layout checks (a full A..E chain in a row, column or grid with sane spacing) and the column fix
(fix-optmap-gaps.py) run, and only images that were not mapped before are added, as {w, h, b}.

    python3 build-optmap-glued.py [--draw DIR] [--dry] [--only LIST.json]
"""
import importlib.util, json, os, re, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageDraw


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


B = load('optmap', 'build-optmap.py')
G = load('optgaps', 'fix-optmap-gaps.py')
base = B.candidates
GLUED = re.compile(r'^[\(\[]?([A-Ha-h©])[\)\].:]?(?=[0-9−\-+√π(½¼¾∞<>≤≥=])')


def candidates(words):
    c = base(words)
    for w in words:
        if any(w is x for x in c):
            continue
        m = GLUED.match(w['text'])
        if not m:
            continue
        core = m.group(1)
        letters = [L for L, f in B.FUZZY.items() if core in f]
        if not letters:
            continue
        # the label is only the first character: shrink the box so spacing checks see a letter, not the whole answer
        ww = max(1, w['w'] / max(1, len(w['text'])) * 1.2)
        c.append(dict(w, w=ww, letters=letters, glued=True))
    return c


B.candidates = candidates


def run(item):
    path, n = item
    p, r = B.analyse((path, n))
    if not r:
        return path, None
    bb = r['boxes']
    if r['kind'] in ('col', 'grid'):
        try:
            bb = G.fix(path, bb)
        except Exception:
            pass
    W, H = Image.open(path).size
    if r['kind'] == 'row':
        bb = clamp_top(path, bb)
    return path, dict(kind=r['kind'], e={'w': W, 'h': H, 'b': bb})


def clamp_top(path, bb):
    """Row of options: the shared top edge may reach into the question line just above.
    Look only at the thin strip where each label letter sits (question text crosses it, fractions in the
    answers do not), take the boldest ink run there as the label line and start the boxes just above it."""
    import numpy as np
    im = np.asarray(Image.open(path).convert('L'))
    H, W = im.shape
    top, bot = int(bb[0][1] * H), int((bb[0][1] + bb[0][3]) * H)
    sw = max(6, int(0.035 * W))
    cols = np.zeros(H, dtype=int)
    for b in bb:
        x = int(b[0] * W)
        cols += (im[:, x:min(W, x + sw)] < 150).sum(axis=1)
    runs, y = [], top
    while y < bot:
        if cols[y]:
            z = y
            while z < bot and cols[z]:
                z += 1
            runs.append((y, z, int(cols[y:z].sum())))
            y = z
        else:
            y += 1
    if not runs:
        return bb
    lab = max(runs, key=lambda r: r[2])
    lh = lab[1] - lab[0]
    new = max(top, lab[0] - lh)                # up to a line of blank space above the labels, for an easier tap
    above = [r for r in runs if r[1] <= lab[0]]
    if above:
        new = max(new, min(lab[0] - 2, above[-1][1] + 2))   # never into the run above (question text)
    end = min(H, max(bot, lab[1] + lh))       # and a line below, inside the picture
    if new <= top and end <= bot:
        return bb
    new = max(top, new)
    return [[b[0], round(new / H, 4), b[2], round((end - new) / H, 4)] for b in bb]


def main():
    m = json.load(open('option-map.json'))
    need = B.used_images()
    items = [(p, n) for p, n in sorted(need.items()) if os.path.exists(p) and p not in m]
    if '--only' in sys.argv:                  # a list from an earlier run (option-map-glued.json)
        keep = set(json.load(open(sys.argv[sys.argv.index('--only') + 1])))
        items = [x for x in items if x[0] in keep]
    res = {}
    with ProcessPoolExecutor(os.cpu_count()) as ex:
        for p, r in ex.map(run, items, chunksize=4):
            if r:
                res[p] = r
    kinds = {}
    for r in res.values():
        kinds[r['kind']] = kinds.get(r['kind'], 0) + 1
    print('mapped', len(res), 'of', len(items), kinds)
    if '--dry' not in sys.argv:
        for p, r in res.items():
            m[p] = r['e']
        json.dump(m, open('option-map.json', 'w'), separators=(',', ':'))
    json.dump(sorted(res), open('option-map-glued.json', 'w'))
    if '--draw' in sys.argv:
        d = sys.argv[sys.argv.index('--draw') + 1]; os.makedirs(d, exist_ok=True)
        for p, r in res.items():
            im = Image.open(p).convert('RGB'); W, H = im.size; dr = ImageDraw.Draw(im)
            for i, b in enumerate(r['e']['b']):
                x, y, w, h = b[0] * W, b[1] * H, b[2] * W, b[3] * H
                dr.rectangle([x, y, x + w, y + h], outline=['red', 'blue', 'green', 'orange', 'purple', 'brown', 'magenta', 'cyan'][i % 8], width=3)
                dr.text((x + 3, y + 2), 'ABCDEFGH'[i], fill='red')
            im.save(os.path.join(d, p.replace('/', '_') + '.png'))


if __name__ == '__main__':
    main()
