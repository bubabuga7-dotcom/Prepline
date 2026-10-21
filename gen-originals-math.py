# -*- coding: utf-8 -*-
"""Prepline original Mathematics questions for the topics that had the fewest questions.
Every answer is computed here, not typed by hand. Writes mix-81..mix-84 from the mix-10 page shell.
    python3 gen-originals-math.py
"""
import json, random, re, math
from fractions import Fraction as F

R = random.Random(2026)
L = 'ABCDE'

def fmt(x):
    if isinstance(x, F):
        if x.denominator == 1: return str(x.numerator)
        s = '-' if x < 0 else ''
        return s + '\\(\\dfrac{%d}{%d}\\)' % (abs(x.numerator), x.denominator)
    if isinstance(x, float):
        s = ('%.4f' % x).rstrip('0').rstrip('.')
        return s
    return str(x)

def mk(topic, text, right, wrong, explain, sort=True):
    """right: answer string; wrong: candidate distractors (strings), first 4 distinct used."""
    opts = []
    for w in wrong:
        if w != right and w not in opts: opts.append(w)
        if len(opts) == 4: break
    if len(opts) < 4 and re.fullmatch(r'-?\d+', right):
        for d in (1, -1, 2, -2, 3, 4, 5):
            c = str(int(right) + d)
            if c not in opts and c != right and len(opts) < 4: opts.append(c)
    if len(opts) < 4: return None
    allo = opts + [right]
    if sort:
        def key(s):
            t = re.sub(r'[^0-9.\-]', '', s.split(' ')[0].replace('\\dfrac', ''))
            try: return (0, float(t))
            except: return (1, s)
        try:
            allo.sort(key=lambda s: float(re.sub(r'[^0-9.\-]', '', s)))
        except ValueError:
            R.shuffle(allo)
    else:
        R.shuffle(allo)
    return {'topic': topic, 'text': text, 'options': allo, 'correct': allo.index(right), 'explain': explain}

def nums(right, deltas, f=lambda v: str(v)):
    return [f(right + d) for d in deltas]

Q = []
def X(c, e):
    return '\\(%s%s\\)' % ('' if c == 1 else c, 'x' if e == 1 else '' if e == 0 else 'x^{%d}' % e)
SEEN = set(); CNT = {}
def add(q):
    if q is None: return
    t = q['topic']
    if CNT.get(t, 0) >= 8 or q['text'] in SEEN: return
    SEEN.add(q['text']); CNT[t] = CNT.get(t, 0) + 1; Q.append(q)

# ---------- M3.10 lengths, areas and volumes by ratio ----------
for i in range(80):
    k = i % 3
    if k == 0:
        sc = R.choice([25000, 50000, 20000, 10000]); a = R.choice([2, 3, 4, 6, 8, 12])
        real = a * sc * sc / 1e10  # cm^2 -> km^2
        right = fmt(real) + ' km²'
        add(mk('M3.10', '<p>A map has scale 1 : %s. A lake covers %d cm² on the map.</p><p>What is the real area of the lake?</p>' % (format(sc, ','), a),
            right, [fmt(real * 10) + ' km²', fmt(real / 10) + ' km²', fmt(a * sc / 1e5) + ' km²', fmt(real * 100) + ' km²', fmt(real / 100) + ' km²'],
            'Lengths scale by %s, so areas scale by %s². %d × %s² cm² = %s km² (1 km² = 10¹⁰ cm²).' % (format(sc, ','), format(sc, ','), a, format(sc, ','), fmt(real))))
    elif k == 1:
        m = R.choice([2, 3, 4, 5]); n = m + R.choice([1, 2, 3])
        if n % m == 0: n += 1
        v = R.choice([16, 24, 40, 54, 80, 128]) * m ** 3
        big = F(v * n ** 3, m ** 3)
        add(mk('M3.10', '<p>Two mathematically similar bottles have heights in the ratio %d : %d. The smaller bottle holds %d ml.</p><p>How much does the larger bottle hold?</p>' % (m, n, v),
            fmt(big) + ' ml', [fmt(F(v * n, m)) + ' ml', fmt(F(v * n * n, m * m)) + ' ml', fmt(big + v) + ' ml', fmt(big * 2) + ' ml', fmt(F(v * n ** 3, m ** 2)) + ' ml'],
            'Volumes scale by the cube of the length ratio: %d × (%d/%d)³ = %s ml.' % (v, n, m, fmt(big))))
    else:
        k2 = R.choice([2, 3, 4]); A = R.choice([24, 54, 96, 150])
        right = A * k2 * k2
        add(mk('M3.10', '<p>A cube has surface area %d cm². Every edge is multiplied by %d.</p><p>What is the surface area of the new cube?</p>' % (A, k2),
            '%d cm²' % right, ['%d cm²' % (A * k2), '%d cm²' % (A * k2 ** 3), '%d cm²' % (A + k2), '%d cm²' % (A * 2 * k2), '%d cm²' % (right * 2)],
            'Areas scale by the square of the length factor: %d × %d² = %d cm².' % (A, k2, right)))

# ---------- M3.11 growth, decay, compound interest ----------
for i in range(80):
    k = i % 4
    if k == 0:
        P = R.choice([2000, 5000, 8000, 10000]); r = R.choice([2, 3, 4, 5]); n = R.choice([2, 3])
        v = P * (1 + r / 100) ** n
        add(mk('M3.11', '<p>₸%s is invested at %d%% per year compound interest.</p><p>What is it worth after %d years, to the nearest tenge?</p>' % (format(P, ','), r, n),
            '₸' + format(round(v), ','), ['₸' + format(round(P * (1 + r * n / 100)), ','), '₸' + format(round(P * (1 + r / 100) ** (n + 1)), ','), '₸' + format(round(P * (1 + r / 100) ** (n - 1)), ','), '₸' + format(round(P * r * n / 100), ','), '₸' + format(round(v) + 100, ',')],
            '%s × %s^%d = %s. Simple interest would ignore the interest earned on interest.' % (format(P, ','), fmt(1 + r / 100), n, format(round(v), ','))))
    elif k == 1:
        P = R.choice([12000, 15000, 20000, 24000]); r = R.choice([10, 15, 20, 25]); n = R.choice([2, 3])
        v = P * (1 - r / 100) ** n
        add(mk('M3.11', '<p>A car bought for $%s loses %d%% of its value every year.</p><p>What is it worth after %d years?</p>' % (format(P, ','), r, n),
            '$' + format(round(v), ','), ['$' + format(round(P * (1 - r * n / 100)), ','), '$' + format(round(P * (1 - r / 100) ** (n + 1)), ','), '$' + format(round(P * (1 - r / 100) ** (n - 1)), ','), '$' + format(round(P * r * n / 100), ','), '$' + format(round(v) - 500, ',')],
            'Each year multiply by %s: %s × %s^%d = %s.' % (fmt(1 - r / 100), format(P, ','), fmt(1 - r / 100), n, format(round(v), ','))))
    elif k == 2:
        r = R.choice([10, 20, 50]); P = R.choice([500, 1000, 2000]); T = P * R.choice([2, 3])
        n = 0; v = P
        while v < T: v *= 1 + r / 100; n += 1
        add(mk('M3.11', '<p>A population of %s bacteria grows by %d%% every hour.</p><p>After how many whole hours does it first exceed %s?</p>' % (format(P, ','), r, format(T, ',')),
            str(n), [str(n - 1), str(n + 1), str(n + 2), str(max(1, n - 2)), str(n + 3)],
            'Multiply by %s each hour; after %d hours the population is %s, the first value above %s.' % (fmt(1 + r / 100), n, format(round(v), ','), format(T, ','))))
    else:
        r = R.choice([5, 10, 20, 25]); V = R.choice([100, 200, 400]) * (100 + r) ** 2 // 100 // 100 * 100
        V = R.choice([2420, 1210, 6050, 3630]); r = 10
        P = round(V / 1.21)
        add(mk('M3.11', '<p>After two years at %d%% compound interest per year an account holds $%s.</p><p>How much was put in at the start?</p>' % (r, format(V, ',')),
            '$' + format(P, ','), ['$' + format(round(V * 0.8), ','), '$' + format(round(V * 0.81), ','), '$' + format(round(V / 1.1), ','), '$' + format(round(V / 1.2), ','), '$' + format(P + 100, ',')],
            'Undo two increases: %s ÷ 1.1² = %s ÷ 1.21 = %s. Taking 20%% off is wrong, because the percentages were of different amounts.' % (format(V, ','), format(V, ','), format(P, ','))))

# ---------- M4.13 interpreting graphs, speed-time ----------
for i in range(80):
    k = i % 3
    if k == 0:
        v = R.choice([8, 10, 12, 15, 20]); t1 = R.choice([4, 5, 6]); t2 = R.choice([10, 12, 20]); t3 = R.choice([4, 5, 6])
        d = v * t1 / 2 + v * t2 + v * t3 / 2
        add(mk('M4.13', '<p>A speed–time graph shows a cyclist speeding up steadily from rest to %d m/s in %d s, staying at %d m/s for %d s, then slowing steadily to rest in %d s.</p><p>How far does the cyclist travel?</p>' % (v, t1, v, t2, t3),
            fmt(d) + ' m', [fmt(v * (t1 + t2 + t3)) + ' m', fmt(v * t2) + ' m', fmt(d / 2) + ' m', fmt(d + v * t1 / 2) + ' m', fmt(v * (t1 + t2 + t3) / 2) + ' m'],
            'Distance is the area under the graph: two triangles and a rectangle, ½·%d·%d + %d·%d + ½·%d·%d = %s m.' % (t1, v, t2, v, t3, v, fmt(d))))
    elif k == 1:
        u = R.choice([0, 2, 4, 5]); v = u + R.choice([6, 9, 12, 15]); t = R.choice([3, 4, 5, 6])
        a = F(v - u, t)
        add(mk('M4.13', '<p>On a speed–time graph a straight line joins (0, %d) to (%d, %d), with time in seconds and speed in m/s.</p><p>What is the acceleration?</p>' % (u, t, v),
            fmt(a) + ' m/s²', [fmt(F(v, t)) + ' m/s²', fmt(F(t, v - u)) + ' m/s²', fmt(F(v - u, t) * 2) + ' m/s²', fmt(F(u + v, 2)) + ' m/s²', str(v - u) + ' m/s²'],
            'Acceleration is the gradient: (%d − %d) ÷ %d = %s m/s².' % (v, u, t, fmt(a))))
    else:
        d1 = R.choice([12, 15, 18, 24]); t1 = R.choice([1, 2]); s = R.choice([F(1, 2), F(1), F(3, 2)]); d2 = R.choice([6, 9, 12]); t2 = R.choice([1, 2])
        avg = F(d1 + d2, 1) / (t1 + s + t2)
        add(mk('M4.13', '<p>A distance–time graph shows a walk: %d km in %d h, a rest of %s h, then %d km more in %d h.</p><p>What is the average speed for the whole trip, including the rest?</p>' % (d1, t1, fmt(s).replace('\\(\\dfrac{1}{2}\\)', '½').replace('\\(\\dfrac{3}{2}\\)', '1½'), d2, t2),
            fmt(round(float(avg), 2)) + ' km/h', [fmt(round((d1 + d2) / (t1 + t2), 2)) + ' km/h', fmt(round((d1 / t1 + d2 / t2) / 2, 2)) + ' km/h', fmt(round(float(avg) + 1, 2)) + ' km/h', fmt(round(float(avg) - 1, 2)) + ' km/h', fmt(round((d1 + d2) / (t1 + t2 + 2 * float(s)), 2)) + ' km/h'],
            'Average speed = total distance ÷ total time = %d ÷ %s = %s km/h. The rest counts as time.' % (d1 + d2, fmt(float(t1 + s + t2)), fmt(round(float(avg), 2)))))

# ---------- M5.19 vectors ----------
def vec(a, b): return '\\(\\begin{pmatrix}%d\\\\%d\\end{pmatrix}\\)' % (a, b)
for i in range(80):
    k = i % 4
    a = (R.randint(-4, 5), R.randint(-4, 5)); b = (R.randint(-3, 4), R.randint(-3, 4))
    if k == 0:
        p, q = R.choice([2, 3]), R.choice([2, 3, 4])
        r = (p * a[0] - q * b[0], p * a[1] - q * b[1])
        add(mk('M5.19', '<p>\\(\\mathbf{a} = \\) %s and \\(\\mathbf{b} = \\) %s.</p><p>Find \\(%d\\mathbf{a} - %d\\mathbf{b}\\).</p>' % (vec(*a), vec(*b), p, q),
            vec(*r), [vec(p * a[0] + q * b[0], p * a[1] + q * b[1]), vec(p * a[0] - b[0], p * a[1] - b[1]), vec(r[1], r[0]), vec(-r[0], -r[1]), vec(r[0] + 1, r[1])],
            '%d%s − %d%s: take each row separately, giving (%d, %d).' % (p, str(a), q, str(b), r[0], r[1]), sort=False))
    elif k == 1:
        t = R.choice([(3, 4), (5, 12), (6, 8), (8, 15), (7, 24)]); s = R.choice([1, -1])
        add(mk('M5.19', '<p>What is the magnitude of the vector %s?</p>' % vec(t[0] * s, -t[1]),
            str(int(math.hypot(*t))), [str(t[0] + t[1]), str(abs(t[1] - t[0])), str(t[0] ** 2 + t[1] ** 2), str(int(math.hypot(*t)) + 1), str(int(math.hypot(*t)) - 2)],
            'Magnitude = √(%d² + %d²) = √%d = %d.' % (t[0], t[1], t[0] ** 2 + t[1] ** 2, int(math.hypot(*t)))))
    elif k == 2:
        m = R.choice([2, 3, -2]); base = (R.choice([1, 2, 3]), R.choice([-2, -1, 2, 5]))
        add(mk('M5.19', '<p>The vector %s is parallel to %s.</p><p>What is the value of \\(k\\)?</p>' % ('\\(\\begin{pmatrix}%d\\\\k\\end{pmatrix}\\)' % (base[0] * m), vec(*base)),
            str(base[1] * m), [str(base[1] + m), str(base[1] * -m), str(base[1]), str(base[1] * m + 1), str(base[0] * m)],
            'Parallel vectors are multiples: %d = %d × %d, so k = %d × %d = %d.' % (base[0] * m, m, base[0], m, base[1], base[1] * m)))
    else:
        add(mk('M5.19', '<p>OABC is a parallelogram with \\(\\vec{OA} = \\mathbf{a}\\) and \\(\\vec{OC} = \\mathbf{c}\\). M is the midpoint of AB.</p><p>Which expression equals \\(\\vec{OM}\\)?</p>' if i < 4 else
            '<p>OABC is a parallelogram with \\(\\vec{OA} = \\mathbf{a}\\) and \\(\\vec{OC} = \\mathbf{c}\\). N is the midpoint of the diagonal AC.</p><p>Which expression equals \\(\\vec{ON}\\)?</p>',
            '\\(\\mathbf{a} + \\tfrac12\\mathbf{c}\\)' if i < 4 else '\\(\\tfrac12(\\mathbf{a} + \\mathbf{c})\\)',
            ['\\(\\tfrac12(\\mathbf{a} + \\mathbf{c})\\)', '\\(\\tfrac12\\mathbf{a} + \\mathbf{c}\\)', '\\(\\mathbf{a} - \\tfrac12\\mathbf{c}\\)', '\\(\\mathbf{a} + \\tfrac12\\mathbf{c}\\)', '\\(\\mathbf{c} - \\mathbf{a}\\)', '\\(\\tfrac12(\\mathbf{c} - \\mathbf{a})\\)'],
            'Go O → A (a), then half of AB, and AB = OC = c: OM = a + ½c.' if i < 4 else 'ON = OA + ½AC = a + ½(c − a) = ½(a + c).', sort=False))

# ---------- M2.6 squares, cubes, roots ----------
for i in range(80):
    k = i % 4
    if k == 0:
        a, b = R.choice([(144, 27), (196, 64), (81, 125), (225, 8), (169, 216)])
        r = int(math.isqrt(a)) + round(b ** (1 / 3))
        add(mk('M2.6', '<p>Evaluate \\(\\sqrt{%d} + \\sqrt[3]{%d}\\).</p>' % (a, b), str(r),
            [str(r + 1), str(r - 1), str(int(math.isqrt(a)) + b // 3), str(r + 2), str(int(math.isqrt(a + b)))], '√%d = %d and ∛%d = %d, so %d.' % (a, math.isqrt(a), b, round(b ** (1 / 3)), r)))
    elif k == 1:
        n = R.choice([52, 75, 110, 150, 200, 300, 450])
        lo = math.isqrt(n)
        add(mk('M2.6', '<p>Between which two consecutive whole numbers does \\(\\sqrt{%d}\\) lie?</p>' % n, '%d and %d' % (lo, lo + 1),
            ['%d and %d' % (lo - 1, lo), '%d and %d' % (lo + 1, lo + 2), '%d and %d' % (lo - 2, lo - 1), '%d and %d' % (lo + 2, lo + 3)], '%d² = %d and %d² = %d, and %d lies between them.' % (lo, lo * lo, lo + 1, (lo + 1) ** 2, n)))
    elif k == 2:
        n = R.choice([12, 18, 20, 45, 50, 72, 98, 108])
        f = n; kk = 1; p = 2; m = n
        sq = 1
        for p in range(2, n + 1):
            e = 0
            while m % p == 0: m //= p; e += 1
            if e % 2: sq *= p
        add(mk('M2.6', '<p>What is the smallest positive whole number \\(k\\) such that \\(%d k\\) is a perfect square?</p>' % n, str(sq),
            [str(sq * 2), str(sq * 4), str(n), str(sq + 1), str(max(2, sq // 2) if sq // 2 != sq else sq * 3)], 'Write %d in prime factors; the primes with an odd power multiply to %d, and %d × %d = %d = %d².' % (n, sq, n, sq, n * sq, math.isqrt(n * sq))))
    else:
        a = R.choice([2, 3, 4, 5]); b = R.choice([2, 3])
        val = a ** (2 * b)
        add(mk('M2.6', '<p>What is \\(\\sqrt{%d^{%d}}\\)?</p>' % (a, 2 * b), str(a ** b),
            [str(a ** (2 * b - 1)), str(a ** (b + 1)), str(val // 2), str(a ** (b - 1)), str(a * b)], '√(%d^%d) = %d^%d = %d.' % (a, 2 * b, a, b, a ** b)))

# ---------- M1.2 converting units ----------
for i in range(80):
    k = i % 4
    if k == 0:
        v = R.choice([36, 54, 72, 90, 108])
        add(mk('M1.2', '<p>A train travels at %d km/h. What is this speed in m/s?</p>' % v, str(v * 5 // 18) + ' m/s',
            [str(v * 18 // 5) + ' m/s', str(v // 6) + ' m/s', str(v * 5 // 18 + 5) + ' m/s', str(round(v / 60)) + ' m/s', str(v * 10 // 36 * 2) + ' m/s'], '%d km/h = %d000 m per 3600 s = %d m/s.' % (v, v, v * 5 // 18)))
    elif k == 1:
        a = R.choice([3.5, 0.8, 12, 2.4])
        add(mk('M1.2', '<p>Convert %s m² to cm².</p>' % fmt(a), format(int(a * 10000), ',') + ' cm²',
            [format(int(a * 100), ',') + ' cm²', format(int(a * 1000), ',') + ' cm²', format(int(a * 100000), ',') + ' cm²', format(int(a * 1000000), ',') + ' cm²'], '1 m² = 100 × 100 = 10,000 cm², so %s × 10,000 = %s cm².' % (fmt(a), format(int(a * 10000), ','))))
    elif k == 2:
        d = R.choice([2.7, 7.8, 1.2, 8.9]); vol = R.choice([500, 250, 1500, 2000])
        m = d * vol / 1000
        add(mk('M1.2', '<p>A metal has density %s g/cm³. What is the mass, in kg, of a %s cm³ block?</p>' % (fmt(d), format(vol, ',')), fmt(round(m, 3)) + ' kg',
            [fmt(round(m * 10, 3)) + ' kg', fmt(round(m / 10, 3)) + ' kg', fmt(round(vol / d / 1000, 3)) + ' kg', fmt(round(m * 1000, 3)) + ' kg'], 'Mass = density × volume = %s × %s = %s g = %s kg.' % (fmt(d), format(vol, ','), fmt(round(d * vol, 1)), fmt(round(m, 3)))))
    else:
        L_ = R.choice([1.5, 0.75, 2.25, 4])
        add(mk('M1.2', '<p>A jug holds %s litres. How many cm³ is that?</p>' % fmt(L_), format(int(L_ * 1000), ',') + ' cm³',
            [format(int(L_ * 100), ',') + ' cm³', format(int(L_ * 10000), ',') + ' cm³', format(int(L_ * 1000000), ',') + ' cm³', format(int(L_ * 10), ',') + ' cm³'], '1 litre = 1000 cm³.'))

# ---------- M2.9 fractions, decimals and percentages ----------
for i in range(80):
    k = i % 3
    if k == 0:
        fr = R.choice([F(3, 8), F(7, 20), F(5, 16), F(11, 25), F(9, 40)])
        p = float(fr * 100)
        add(mk('M2.9', '<p>Write %s as a percentage.</p>' % fmt(fr), fmt(p) + '%', [fmt(p / 10) + '%', fmt(p * 10) + '%', fmt(round(fr.numerator / fr.denominator * 10, 2)) + '%', fmt(p + 5) + '%', fmt(p - 2.5) + '%'],
            '%d ÷ %d = %s = %s%%.' % (fr.numerator, fr.denominator, fmt(float(fr)), fmt(p))))
    elif k == 1:
        d, fr = R.choice([('0.\\overline{3}6', None), ('0.\\overline{45}', F(5, 11)), ('0.\\overline{27}', F(3, 11)), ('0.1\\overline{6}', F(1, 6)), ('0.\\overline{12}', F(4, 33))])
        if fr is None: d, fr = '0.\\overline{36}', F(4, 11)
        add(mk('M2.9', '<p>Which fraction equals \\(%s\\)?</p>' % d, fmt(fr), [fmt(fr + F(1, 11)), fmt(F(fr.numerator, fr.denominator + 1)), fmt(F(int(d[-3:-1]) if d[-3:-1].isdigit() else 16, 100)), fmt(fr * 2) if fr * 2 < 1 else fmt(fr / 2), fmt(F(1, 3))],
            'Let x be the decimal and subtract a shifted copy to remove the repeating part; x = %s.' % fmt(fr), sort=False))
    else:
        vals = [F(5, 8), F(0.6).limit_denominator(5), F(13, 20), F(31, 50)]
        txt = ['\\(\\dfrac58\\)', '0.6', '65%', '\\(\\dfrac{31}{50}\\)']
        if i % 2:
            vals = [F(2, 3), F(67, 100), F(13, 20), F(7, 10)]; txt = ['\\(\\dfrac23\\)', '0.67', '65%', '\\(\\dfrac{7}{10}\\)']
        order = sorted(range(4), key=lambda j: vals[j])
        right = ', '.join(txt[j] for j in order)
        wr = [', '.join(txt[j] for j in p) for p in ([0, 1, 2, 3], [3, 2, 1, 0], [1, 0, 3, 2], [2, 0, 1, 3], [0, 2, 1, 3], [1, 3, 0, 2])]
        add(mk('M2.9', '<p>Put these in order, smallest first: %s.</p>' % ', '.join(txt), right, wr,
            'As decimals: %s. Ordered: %s.' % (', '.join(fmt(round(float(v), 4)) for v in vals), right), sort=False))

# ---------- M5.13 maps and bearings ----------
for i in range(80):
    k = i % 3
    if k == 0:
        b = R.choice([35, 72, 140, 215, 300, 250, 110])
        back = (b + 180) % 360
        add(mk('M5.13', '<p>The bearing of B from A is %03d°.</p><p>What is the bearing of A from B?</p>' % b, '%03d°' % back,
            ['%03d°' % ((360 - b) % 360), '%03d°' % ((b + 90) % 360), '%03d°' % ((180 - b) % 360), '%03d°' % ((back + 10) % 360), '%03d°' % b], 'Back bearing = %03d° %s 180° = %03d°.' % (b, '+' if b < 180 else '−', back)))
    elif k == 1:
        e, n = R.choice([(5, 5), (3, -3), (-4, 4), (-2, -2), (6, 0), (0, -7)])
        ang = round(math.degrees(math.atan2(e, n))) % 360
        dirn = '%s%s' % ('%d km north' % n if n > 0 else '%d km south' % -n if n < 0 else '', (' and ' if n and e else '') + ('%d km east' % e if e > 0 else '%d km west' % -e if e < 0 else ''))
        add(mk('M5.13', '<p>A boat sails %s of a harbour H.</p><p>What is the bearing of the boat from H?</p>' % dirn, '%03d°' % ang,
            ['%03d°' % ((ang + 90) % 360), '%03d°' % ((ang + 180) % 360), '%03d°' % ((360 - ang) % 360), '%03d°' % ((ang + 45) % 360), '%03d°' % ((ang + 270) % 360)], 'Bearings are measured clockwise from north; this direction is %03d°.' % ang))
    else:
        sc = R.choice([25000, 50000, 200000]); cm = R.choice([3.2, 4.5, 6, 7.4])
        km = cm * sc / 100000
        add(mk('M5.13', '<p>On a map with scale 1 : %s two towns are %s cm apart.</p><p>What is the real distance?</p>' % (format(sc, ','), fmt(cm)), fmt(km) + ' km',
            [fmt(km * 10) + ' km', fmt(km / 10) + ' km', fmt(km * 100) + ' km', fmt(round(km + 1, 2)) + ' km', fmt(km * 2) + ' km'], '%s × %s = %s cm = %s km.' % (fmt(cm), format(sc, ','), format(int(cm * sc), ','), fmt(km))))

# ---------- M3.4 dividing in a ratio ----------
for i in range(80):
    k = i % 3
    if k == 0:
        r = R.choice([(2, 3), (3, 5), (4, 7), (1, 4), (5, 3)]); t = sum(r) * R.choice([40, 60, 75, 120])
        a = t * r[0] // sum(r)
        add(mk('M3.4', '<p>₸%s is shared between Aruzhan and Dias in the ratio %d : %d.</p><p>How much does Aruzhan get?</p>' % (format(t, ','), *r), '₸' + format(a, ','),
            ['₸' + format(t - a, ','), '₸' + format(t // r[0], ','), '₸' + format(t * r[0] // r[1], ','), '₸' + format(t // 2, ','), '₸' + format(a + t // sum(r), ',')], '%d parts in all, each worth %s; Aruzhan has %d part(s) = %s.' % (sum(r), format(t // sum(r), ','), r[0], format(a, ','))))
    elif k == 1:
        r = R.choice([(2, 3, 5), (1, 2, 4), (3, 4, 5), (2, 5, 6)]); part = R.choice([12, 15, 20, 25])
        diff = (r[2] - r[0]) * part; tot = sum(r) * part
        add(mk('M3.4', '<p>Three numbers are in the ratio %d : %d : %d. The largest is %d more than the smallest.</p><p>What is their total?</p>' % (*r, diff), str(tot),
            [str(diff * sum(r)), str(tot - part), str(tot + part), str(r[1] * part), str(sum(r) * diff // r[2])], 'The difference is %d − %d = %d parts = %d, so one part is %d and the total is %d × %d = %d.' % (r[2], r[0], r[2] - r[0], diff, part, sum(r), part, tot)))
    else:
        a, b = R.choice([(3, 2), (5, 3), (7, 4)]); g = R.choice([6, 8, 10])
        boys = a * g; girls = b * g;
        add(mk('M3.4', '<p>In a club the ratio of boys to girls is %d : %d. There are %d more boys than girls.</p><p>How many girls are there?</p>' % (a, b, (a - b) * g), str(girls),
            [str(boys), str(boys + girls), str((a - b) * g * b), str(girls + g), str(girls - g)], 'The difference is %d part(s) = %d, so one part is %d and girls = %d × %d = %d.' % (a - b, (a - b) * g, g, b, g, girls)))

# ---------- M4.2 index laws (algebra) ----------
for i in range(80):
    k = i % 3
    if k == 0:
        c, p, q, r = R.choice([2, 3]), R.choice([2, 3, 4]), R.choice([2, 3]), R.choice([1, 2, 3, 5])
        num = c ** q; e = p * q - r
        if e <= 1 or r == 1: continue
        add(mk('M4.2', '<p>Simplify \\(\\dfrac{(%dx^{%d})^{%d}}{x^{%d}}\\).</p>' % (c, p, q, r), X(num, e),
            [X(c * q, e), X(num, p + q - r), X(c, e), X(num, p * q + r), X(num, e + 1)], '(%dx^%d)^%d = %dx^%d, then divide by x^%d: subtract the powers to get %dx^%d.' % (c, p, q, num, p * q, r, num, e), sort=False))
    elif k == 1:
        a, b = R.choice([(4, 8), (9, 27), (8, 16), (25, 125)])
        base = {4: 2, 8: 2, 9: 3, 27: 3, 16: 2, 25: 5, 125: 5}[a]
        ea = round(math.log(a, base)); eb = round(math.log(b, base)); n = R.choice([2, 3, 4])
        # a^x = b^(x-n)  -> ea x = eb (x - n) -> x = eb n / (eb - ea)
        x = F(eb * n, eb - ea)
        add(mk('M4.2', '<p>Solve \\(%d^{x} = %d^{x-%d}\\).</p>' % (a, b, n), fmt(x),
            [fmt(x + 1), fmt(-x), fmt(F(n * ea, eb - ea) if eb != ea else x + 2), fmt(x * 2), fmt(F(n, 1))], 'Write both as powers of %d: %d·x = %d(x − %d), so x = %s.' % (base, ea, eb, n, fmt(x))))
    else:
        p, q = R.choice([(F(1, 2), 3), (F(2, 3), 2), (F(3, 2), 2), (F(1, 3), 3)])
        e = p * q
        add(mk('M4.2', '<p>Simplify \\((x^{%s})^{%d} \\times x^{-1}\\).</p>' % ('%d/%d' % (p.numerator, p.denominator), q), '\\(x^{%s}\\)' % (str(e - 1) if (e - 1).denominator == 1 else '%d/%d' % ((e - 1).numerator, (e - 1).denominator)),
            ['\\(x^{%s}\\)' % s for s in ('%d/%d' % ((p + q - 1).numerator, (p + q - 1).denominator), str(e + 1) if (e + 1).denominator == 1 else '%d/%d' % ((e + 1).numerator, (e + 1).denominator), '%d/%d' % (p.numerator, p.denominator), '-%s' % (str(e) if e.denominator == 1 else '%d/%d' % (e.numerator, e.denominator)), '0')] + ['\\(x^{%d}\\)' % q],
            'Multiply the powers (%s × %d = %s), then add −1.' % (fmt(p), q, fmt(e)), sort=False))

# ---------- M4.5 brackets and factorising ----------
for i in range(80):
    k = i % 3
    if k == 0:
        a, b = R.choice([(2, 5), (3, -4), (-2, -6), (1, 7), (-3, 5), (4, 6)])
        if a + b == 0: continue
        s = '\\(x^2 %s %sx %s %d\\)' % ('+' if a + b >= 0 else '-', '' if abs(a + b) == 1 else abs(a + b), '+' if a * b >= 0 else '-', abs(a * b))
        def br(u, v): return '\\((x %s %d)(x %s %d)\\)' % ('+' if u >= 0 else '-', abs(u), '+' if v >= 0 else '-', abs(v))
        add(mk('M4.5', '<p>Factorise %s.</p>' % s, br(a, b), [br(-a, -b), br(a, -b), br(-a, b), br(a + 1, b - 1), br(a * b, 1)],
            'Find two numbers with product %d and sum %d: %d and %d.' % (a * b, a + b, a, b), sort=False))
    elif k == 1:
        a, b = R.choice([(2, 3), (3, 1), (2, 5), (3, 2)]); c, d = R.choice([(1, 4), (1, -2), (2, -1), (3, 1)])
        # (ax+b)(cx+d)
        A, B, C = a * c, a * d + b * c, b * d
        if (a, b) == (c, d) or a * d - b * c == 0: continue
        def p(A, B, C): return '\\(%dx^2 %s %sx %s %d\\)' % (A, '+' if B >= 0 else '-', '' if abs(B) == 1 else abs(B), '+' if C >= 0 else '-', abs(C))
        add(mk('M4.5', '<p>Expand \\((%dx + %d)(%sx %s %d)\\).</p>' % (a, b, '' if c == 1 else c, '+' if d >= 0 else '-', abs(d)), p(A, B, C),
            [p(A, a * d - b * c, C), p(A, B, -C), p(a + c, B, C), p(A, a * d, C), p(A, B + 1, C)], 'Multiply each term: %dx² %s %dx %s %dx %s %d, then collect the x terms.' % (A, '+' if a*d>=0 else '−', abs(a * d), '+' if b*c>=0 else '−', abs(b * c), '+' if C>=0 else '−', abs(C)), sort=False))
    else:
        n = R.choice([4, 9, 25, 16, 49]); m = int(math.isqrt(n)); c = R.choice([c for c in (1, 2, 3) if math.gcd(c, m) == 1])
        add(mk('M4.5', '<p>Factorise fully \\(%dx^2 - %d\\).</p>' % (c * n if c > 1 else n, c * 1 if c > 1 else 1) if False else '<p>Factorise \\(%dx^2 - %d\\).</p>' % (n, c * c),
            '\\((%dx - %d)(%dx + %d)\\)' % (m, c, m, c), ['\\((%dx - %d)^2\\)' % (m, c), '\\((%dx + %d)^2\\)' % (m, c), '\\((%dx - %d)(%dx + %d)\\)' % (n, c, n, c), '\\(%dx(x - %d)\\)' % (m, c), '\\((x - %d)(%dx + %d)\\)' % (c, n, c)],
            'Difference of two squares: (%dx)² − %d² = (%dx − %d)(%dx + %d).' % (m, c, m, c, m, c), sort=False))

# ---------- M5.6 transformations ----------
for i in range(80):
    k = i % 4
    x, y = R.choice([(3, 1), (2, -5), (-4, 2), (5, 3), (-1, -6), (4, -2)])
    P = lambda a, b: '(%d, %d)' % (a, b)
    if k == 0:
        add(mk('M5.6', '<p>The point %s is reflected in the line \\(y = x\\).</p><p>What are the coordinates of its image?</p>' % P(x, y), P(y, x),
            [P(-x, y), P(x, -y), P(-y, -x), P(-x, -y), P(y, -x)], 'Reflecting in y = x swaps the coordinates.', sort=False))
    elif k == 1:
        add(mk('M5.6', '<p>The point %s is rotated 90° clockwise about the origin.</p><p>Where does it go?</p>' % P(x, y), P(y, -x),
            [P(-y, x), P(-x, -y), P(y, x), P(x, -y), P(-y, -x)], '90° clockwise about the origin sends (x, y) to (y, −x).', sort=False))
    elif k == 2:
        sx, sy = R.choice([(3, -2), (-4, 1), (2, 5)])
        add(mk('M5.6', '<p>The point %s is translated by the vector %s.</p><p>What are the coordinates of its image?</p>' % (P(x, y), vec(sx, sy)), P(x + sx, y + sy),
            [P(x - sx, y - sy), P(x + sy, y + sx), P(sx, sy), P(x * sx, y * sy), P(x + sx, y - sy)], 'Add the vector to each coordinate: (%d + (%d), %d + (%d)) = (%d, %d).' % (x, sx, y, sy, x + sx, y + sy), sort=False))
    else:
        s = R.choice([2, 3, F(1, 2)])
        add(mk('M5.6', '<p>Triangle T has area 12 cm². It is enlarged by scale factor %s.</p><p>What is the area of the image?</p>' % fmt(s), fmt(12 * s * s) + ' cm²',
            [fmt(12 * s) + ' cm²', fmt(12 * s ** 3) + ' cm²', fmt(12 + s) + ' cm²', fmt(12 * s * 2) + ' cm²', fmt(24 * s * s) + ' cm²'], 'Area scales by the square of the scale factor: 12 × %s² = %s.' % (fmt(s), fmt(12 * s * s))))

# ---------- M2.1 ordering numbers and symbols ----------
for i in range(80):
    k = i % 2
    if k == 0:
        sets = [([-0.5, -0.05, 0.05, -0.55], ['−0.5', '−0.05', '0.05', '−0.55']), ([0.3, 0.33, 0.303, 0.033], ['0.3', '0.33', '0.303', '0.033']),
                ([-2, -0.2, -2.2, 0.02], ['−2', '−0.2', '−2.2', '0.02']), ([1.09, 1.9, 1.091, 1.009], ['1.09', '1.9', '1.091', '1.009'])]
        v, t = sets[(i // 2) % 4]
        order = sorted(range(4), key=lambda j: v[j])
        right = ', '.join(t[j] for j in order)
        wr = [', '.join(t[j] for j in p) for p in ([0, 1, 2, 3], list(reversed(order)), [order[1], order[0], order[2], order[3]], [order[0], order[2], order[1], order[3]], [order[0], order[1], order[3], order[2]])]
        add(mk('M2.1', '<p>Which list is in order from smallest to largest?</p>', right, wr, 'Compare place by place; negatives further from zero are smaller. Order: %s.' % right, sort=False))
    else:
        a, b = R.choice([(-3, 2), (-5, -1), (1, 4), (-2, 6), (-7, -2), (0, 9), (-4, 4), (-10, -6), (3, 11)])
        ints = [n for n in range(a, b + 1) if a < n <= b]
        add(mk('M2.1', '<p>How many integers \\(n\\) satisfy \\(%d \\lt n \\le %d\\)?</p>' % (a, b), str(len(ints)),
            [str(len(ints) + 1), str(len(ints) - 1), str(b - a + 1), str(len(ints) + 2), str(abs(b) + abs(a))], 'They are %s: %d integers. The left end is not included, the right end is.' % (', '.join(map(str, ints)), len(ints))))

# ---------- M2.10 using fractions and percentages ----------
for i in range(80):
    k = i % 3
    if k == 0:
        p = R.choice([20, 25, 15, 40, 12]); price = (100 + p) * R.choice([40, 60, 80, 100, 150])
        orig = price * 100 // (100 + p)
        add(mk('M2.10', '<p>After a %d%% increase a coat costs ₸%s.</p><p>What did it cost before the increase?</p>' % (p, format(price, ',')), '₸' + format(orig, ','),
            ['₸' + format(price * (100 - p) // 100, ','), '₸' + format(price - p * 10, ','), '₸' + format(orig + 200, ','), '₸' + format(price * 100 // (100 + 2 * p), ','), '₸' + format(orig - 200, ',')], 'The new price is %d%% of the old: %s ÷ %s = %s. Taking %d%% off the new price is wrong.' % (100 + p, format(price, ','), fmt((100 + p) / 100), format(orig, ','), p)))
    elif k == 1:
        a, b = R.choice([(F(1, 3), F(1, 4)), (F(2, 5), F(1, 3)), (F(1, 4), F(2, 3))]); tot = R.choice([120, 240, 360])
        left = tot * (1 - a) * (1 - b)
        add(mk('M2.10', '<p>Dana spends %s of her ₸%d,000 on books and %s of the remainder on food.</p><p>How much is left?</p>' % (fmt(a), tot // 1000 if tot >= 1000 else tot, fmt(b)) if False else '<p>Dana has ₸%d. She spends %s of it on books and then %s of what remains on food.</p><p>How much is left?</p>' % (tot, fmt(a), fmt(b)),
            '₸' + fmt(left), ['₸' + fmt(tot * (1 - a - b)), '₸' + fmt(tot * a * b), '₸' + fmt(tot * (1 - a)), '₸' + fmt(left + 10), '₸' + fmt(left - 10)], 'After books: %s. Food takes %s of that, leaving %s.' % (fmt(tot * (1 - a)), fmt(b), fmt(left))))
    else:
        old, new = R.choice([(80, 92), (250, 210), (40, 52), (1200, 1050), (500, 560), (60, 45), (200, 170)])
        pc = F(new - old, old) * 100
        add(mk('M2.10', '<p>A price changes from $%d to $%d.</p><p>What is the percentage change?</p>' % (old, new), ('+' if pc > 0 else '−') + fmt(abs(float(pc))) + '%',
            [('+' if pc > 0 else '−') + fmt(round(abs(float(F(new - old, new) * 100)), 1)) + '%', ('−' if pc > 0 else '+') + fmt(abs(float(pc))) + '%', ('+' if pc > 0 else '−') + str(abs(new - old)) + '%', ('+' if pc > 0 else '−') + fmt(abs(float(pc)) + 5) + '%'], 'Change ÷ original × 100 = %s ÷ %d × 100 = %s%%. Divide by the original price, not the new one.' % (str(new - old).replace('-', '−'), old, fmt(float(pc)).replace('-', '−')), sort=False))

# ---------- M3.5 ratio in real contexts ----------
for i in range(80):
    k = i % 2
    if k == 0:
        serves, need = R.choice([(4, 6), (6, 10), (8, 12), (5, 8)]); flour = R.choice([200, 300, 250, 360])
        r = F(flour * need, serves)
        add(mk('M3.5', '<p>A recipe for %d people uses %d g of flour.</p><p>How much flour is needed for %d people?</p>' % (serves, flour, need), fmt(r) + ' g',
            [fmt(F(flour * serves, need)) + ' g', fmt(flour + (need - serves) * 10) + ' g', fmt(flour * 2) + ' g', fmt(r + 25) + ' g', fmt(r - 25) + ' g'], '%d ÷ %d × %d = %s g.' % (flour, serves, need, fmt(r))))
    else:
        a = (R.choice([300, 400, 500]), R.choice([450, 600, 750])); b = (R.choice([750, 1000, 1200]), None)
        pa = a[1]; ga = a[0]; gb = b[0]; pb = round(pa * gb / ga * R.choice([0.9, 1.1, 0.95, 1.05]))
        ua, ub = pa / ga, pb / gb
        better = 'the %d g pack' % (ga if ua < ub else gb)
        add(mk('M3.5', '<p>Rice costs ₸%d for a %d g pack or ₸%d for a %d g pack.</p><p>Which is better value, and why?</p>' % (pa, ga, pb, gb),
            '%s, because it costs less per gram' % better.capitalize(),
            ['%s, because it costs less in total' % ('The %d g pack' % ga), '%s, because it is heavier' % ('The %d g pack' % gb), 'They are the same value', '%s, because it costs less per gram' % ('The %d g pack' % (gb if ua < ub else ga))],
            'Per gram: ₸%s and ₸%s. The cheaper rate is %s.' % (fmt(round(ua, 3)), fmt(round(ub, 3)), better), sort=False))

print(len(Q), 'questions')
from collections import Counter
print(Counter(q['topic'] for q in Q))

# interleave topics into 4 tests of 30
by = {}
for q in Q: by.setdefault(q['topic'], []).append(q)
order = []
while any(by.values()):
    for t in list(by):
        if by[t]: order.append(by[t].pop(0))
tests = [order[i::4] for i in range(4)]

shell = open('mix-10.html', encoding='utf-8').read()
crit = open('crit-68.html', encoding='utf-8').read()
explain_line = re.search(r"\n *\$\{q\.explain \? `<details.*?: ''\}", crit).group(0)
QRE = re.compile(r"^const (?:questions|QUESTIONS)\s*=\s*(\[.*\]);\s*$", re.M)
for n, qs in enumerate(tests):
    tid = 81 + n
    for i, q in enumerate(qs):
        q['id'] = i + 1; q['image'] = ''; q['src'] = 'PL'; q['verified'] = True
        q.setdefault('topic', q['topic'])
    qs = [{k: q[k] for k in ('id', 'topic', 'text', 'image', 'options', 'correct', 'explain', 'src')} for q in qs]
    s = shell.replace('mix-10.html', 'mix-%d.html' % tid).replace('Test 10 — Prepline', 'Test %d — Prepline' % tid)
    s = s.replace('<h2>Test 10 — NUET Mathematics (30 questions)</h2>', '<h2>Test %d — Prepline original maths %d (30 questions)</h2>' % (tid, n + 1))
    s = QRE.sub(lambda m: 'const questions = ' + json.dumps(qs, ensure_ascii=False) + ';', s, count=1)
    if False:
        s = s.replace("${ok ? '' : `<div style=\"font-size:13px; margin-top:6px;\"><span style=\"color:var(--danger);\">Your answer: ${userAns}</span> &nbsp;·&nbsp; <span style=\"color:var(--ok); font-weight:600;\">Correct: ${correctAns}</span></div>`}",
                      "${ok ? '' : `<div style=\"font-size:13px; margin-top:6px;\"><span style=\"color:var(--danger);\">Your answer: ${userAns}</span> &nbsp;·&nbsp; <span style=\"color:var(--ok); font-weight:600;\">Correct: ${correctAns}</span></div>`}" + explain_line, 1)
    open('mix-%d.html' % tid, 'w', encoding='utf-8').write(s)
    print('mix-%d.html' % tid, len(qs), '${q.explain' in s)
