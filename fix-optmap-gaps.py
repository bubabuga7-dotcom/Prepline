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
    if len(set(round(b[0], 3) for b in boxes)) > 1:
        return fix_grid(path, boxes)
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


def fix_grid(path, boxes):
    """Options in a grid: move each split between rows to the widest blank strip between them,
    so a figure that reaches above its label still belongs to its own option."""
    im = np.asarray(Image.open(path).convert('L'))
    H, W = im.shape
    rows = []                                   # [top_px, [box indexes]]
    for i, b in enumerate(boxes):
        t = int(b[1] * H)
        for r in rows:
            if abs(r[0] - t) < 4:
                r[1].append(i); break
        else:
            rows.append([t, [i]])
    rows.sort()
    if len(rows) < 2:
        return boxes
    x1 = int(min(b[0] for b in boxes) * W); x2 = int(max(b[0] + b[2] for b in boxes) * W)
    ink = (im[:, x1:x2] < 150).sum(axis=1) > 0
    R = runs(ink)
    pad = 6
    rowh = rows[1][0] - rows[0][0]
    if rowh < 90:
        return boxes            # rows of text or formulas: the label split is already right
    cen = [r[0] + pad + 8 for r in rows]        # just under each row's label top
    cuts, gaps = [], []
    for k in range(len(rows) - 1):
        a, b = cen[k], cen[k + 1]
        blank = [(max(s, a), min(e, b)) for s, e, inked in R if not inked and e > a and s < b]
        blank = [g for g in blank if g[1] - g[0] > 0]
        if not blank:
            return boxes
        g = max(blank, key=lambda g: g[1] - g[0])
        cuts.append((g[0] + g[1]) // 2); gaps.append(g[1] - g[0])
    thr = max(4, int(0.6 * min(gaps)))
    # first row: up to the blank strip above it, never more than half a row above its label
    y = cen[0]; top0 = rows[0][0]
    while y > 0 and y > rows[0][0] - rowh // 2:
        if not ink[y]:
            z = y
            while z > 0 and not ink[z]:
                z -= 1
            if y - z >= thr:
                top0 = min(top0, y - pad); break
            y = z
        else:
            y -= 1
    top0 = max(0, top0)
    edges = [top0] + cuts
    out = [list(b) for b in boxes]
    for k, r in enumerate(rows):
        y1 = edges[k]
        y2 = cuts[k] if k < len(cuts) else int((boxes[r[1][0]][1] + boxes[r[1][0]][3]) * H)
        if y2 - y1 < 10:
            return boxes
        for i in r[1]:
            out[i][1] = round(y1 / H, 4); out[i][3] = round((y2 - y1) / H, 4)
    return out


def main():
    m = json.load(open('option-map.json'))
    changed = 0
    # with --new: only images added by the last `build-optmap.py --missing` run, and only column layouts
    todo = m
    if '--grids' in sys.argv:
        kinds = json.load(open('option-map-new.json'))
        todo = {p: m[p] for p, k in kinds.items() if k == 'grid'}
    elif '--new' in sys.argv:
        kinds = json.load(open('option-map-new.json'))
        todo = {p: m[p] for p, k in kinds.items() if k in ('col', 'grid')}
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
