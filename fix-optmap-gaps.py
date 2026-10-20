"""Second pass over option-map.json for options listed in a column.
The OCR pass splits options just above each label. When a label sits in the middle of a two-line option,
that split cuts through the option text. Here each split moves to the widest blank strip between two labels,
the first box starts above its first text line, and the last box ends after its last text line.

    python3 fix-optmap-gaps.py [--draw DIR]
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw


def runs(ink):
    """[(start, end, has_ink)] runs of rows."""
    out, s = [], 0
    for i in range(1, len(ink) + 1):
        if i == len(ink) or ink[i] != ink[s]:
            out.append((s, i, bool(ink[s])))
            s = i
    return out


def fix(path, boxes):
    tops = [b[1] for b in boxes]
    if len(set(round(t, 3) for t in tops)) == 1:
        return boxes                       # a row of options: nothing to do
    im = np.asarray(Image.open(path).convert('L'))
    H, W = im.shape
    x0 = int(boxes[0][0] * W)
    # label column itself is excluded from the ink test, so only the option text decides
    area = im[:, min(W - 1, x0 + 2):]
    ink = (area < 150).sum(axis=1) > 0
    R = runs(ink)
    lines = [r[1] - r[0] for r in R if r[2]]
    lh = sorted(lines)[len(lines) // 2] if lines else 12
    lt = [int(b[1] * H) for b in boxes]              # roughly each label's top
    cen = [t + lh // 2 + 2 for t in lt]
    n = len(boxes)
    cuts, gaps = [], []
    for i in range(n - 1):
        a, b = cen[i], cen[i + 1]
        blank = [(max(s, a), min(e, b)) for s, e, k in R if not k and e > a and s < b]
        blank = [g for g in blank if g[1] - g[0] > 0]
        if not blank:
            return boxes
        g = max(blank, key=lambda g: g[1] - g[0])
        cuts.append((g[0] + g[1]) // 2)
        gaps.append(g[1] - g[0])
    thr = max(3, int(0.7 * min(gaps)))

    def walk(start, step):
        """From start, move until a blank strip at least thr tall; return the edge of the text before it."""
        y, edge = start, start
        while 0 <= y < H:
            if ink[y]:
                edge = y
                y += step
                continue
            z = y
            while 0 <= z < H and not ink[z]:
                z += step
            if abs(z - y) >= thr or not (0 <= z < H):
                return edge
            y = z
        return edge

    pad = max(2, thr // 2)
    top0 = max(0, walk(cen[0], -1) - pad)
    botN = min(H, walk(cen[-1], 1) + pad + 1)
    edges = [top0] + cuts + [botN]
    out = []
    for i, bx in enumerate(boxes):
        y1, y2 = edges[i], edges[i + 1]
        if y2 - y1 < 10:
            return boxes
        out.append([bx[0], round(y1 / H, 4), bx[2], round((y2 - y1) / H, 4)])
    return out


def main():
    m = json.load(open('option-map.json'))
    changed = 0
    # with --new: only images added by the last `build-optmap.py --missing` run, and only column layouts
    todo = m
    if '--new' in sys.argv:
        kinds = json.load(open('option-map-new.json'))
        todo = {p: m[p] for p, k in kinds.items() if k == 'col'}
    for p, bb in todo.items():
        nb = fix(p, bb)
        if nb != bb:
            changed += 1
            m[p] = nb
    json.dump(m, open('option-map.json', 'w'), separators=(',', ':'))
    print('adjusted', changed, 'of', len(m))
    if '--draw' in sys.argv:
        d = sys.argv[sys.argv.index('--draw') + 1]
        os.makedirs(d, exist_ok=True)
        for p, bb in m.items():
            im = Image.open(p).convert('RGB'); W, H = im.size; dr = ImageDraw.Draw(im)
            for i, b in enumerate(bb):
                dr.rectangle([b[0] * W, b[1] * H, (b[0] + b[2]) * W, (b[1] + b[3]) * H],
                             outline=['red', 'blue', 'green', 'orange', 'purple', 'brown'][i % 6], width=3)
            im.save(os.path.join(d, p.replace('/', '_') + '.png'))


if __name__ == '__main__':
    main()
