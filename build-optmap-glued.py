"""Third pass for option-map.json: images the first pass could not map.

Most of them print the label glued to the answer with no bracket ("A6", "c8", "A120", "B−3"),
which build-optmap.py does not accept as a label. Here such words also count as labels, then the
same layout checks (a full A..E chain in a row, column or grid with sane spacing) and the column fix
(fix-optmap-gaps.py) run, and only images that were not mapped before are added, as {w, h, b}.

    python3 build-optmap-glued.py [--draw DIR] [--dry]
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
    seen = {id(w) for w in c}
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
    return path, dict(kind=r['kind'], e={'w': W, 'h': H, 'b': bb})


def main():
    m = json.load(open('option-map.json'))
    need = B.used_images()
    items = [(p, n) for p, n in sorted(need.items()) if os.path.exists(p) and p not in m]
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
