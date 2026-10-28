# -*- coding: utf-8 -*-
"""Prepline: tops up every Mathematics test that has fewer than 30 questions
with original NUET-syllabus questions (src "PL"). Every answer is computed here.
Explanations are written in the site's Russian format (idea, steps, answer, why not, trap).

    python3 gen-fill-math.py          # dry run: prints what would be added
    python3 gen-fill-math.py --write  # writes the pages and tests.js
"""
import json, math, random, re, sys
from fractions import Fraction as F
from collections import Counter

R = random.Random(20261028)
L = 'ABCDE'
QRE = re.compile(r"^const (?:questions|QUESTIONS)\s*=\s*(\[.*\]);\s*$", re.M)


# ---------------------------------------------------------------- formatting
def fr(x):
    """Fraction or number -> KaTeX for the question text / options."""
    x = F(x)
    if x.denominator == 1:
        return str(x.numerator).replace('-', '−')
    s = '−' if x < 0 else ''
    return s + '\\(\\dfrac{%d}{%d}\\)' % (abs(x.numerator), x.denominator)


def frx(x):
    """Fraction -> plain text for explanations."""
    x = F(x)
    if x.denominator == 1:
        return str(x.numerator).replace('-', '−')
    s = '−' if x < 0 else ''
    return s + '<span class="fr"><span>%d</span><span>%d</span></span>' % (abs(x.numerator), x.denominator)


def num(v, dp=4):
    if isinstance(v, F):
        if v.denominator == 1:
            v = v.numerator
        else:
            v = float(v)
    if isinstance(v, float):
        if abs(v - round(v)) < 1e-9:
            v = int(round(v))
        else:
            return (('%.' + str(dp) + 'f') % v).rstrip('0').rstrip('.').replace('-', '−')
    s = '{:,}'.format(v) if abs(v) >= 10000 else str(v)
    return s.replace('-', '−')


def ru(s):
    """Russian number style for explanations: 1 500 000 and 2,5."""
    s = re.sub(r'(\d),(?=\d{3}\b)', r'\1 ', s)
    return re.sub(r'(\d)\.(\d)', r'\1,\2', s)


def PI(v, unit):
    v = num(v)
    return '\\(%s\\pi\\) %s' % ('' if v == '1' else v, unit)


def pn(v):
    return '(−%s)' % abs(v) if v < 0 else str(v)


def sgn(c, first=False):
    if first:
        return ('−' if c < 0 else '') + str(abs(c))
    return ('− ' if c < 0 else '+ ') + str(abs(c))


def poly(*cs, var='x'):
    """poly(a, b, c) -> 'ax^2 + bx + c' in KaTeX-friendly text (inside \\( \\))."""
    n = len(cs) - 1
    out = []
    for i, c in enumerate(cs):
        p = n - i
        if c == 0:
            continue
        mag = abs(c)
        body = ('' if (mag == 1 and p > 0) else str(mag)) + (var if p >= 1 else '') + ('^{%d}' % p if p >= 2 else '')
        if not out:
            out.append(('-' if c < 0 else '') + body)
        else:
            out.append(('- ' if c < 0 else '+ ') + body)
    return ' '.join(out) if out else '0'


def lx(x):
    """Fraction -> LaTeX body (no \\( \\)), sign included."""
    x = F(x)
    if x.denominator == 1:
        return str(x.numerator)
    return ('-' if x < 0 else '') + '\\dfrac{%d}{%d}' % (abs(x.numerator), x.denominator)


MATH = re.compile(r'(\\\(.*?\\\))', re.S)


def fixminus(s):
    """Hyphen before a digit -> real minus sign, outside \\( \\) only."""
    s = s.replace('\\(1\\pi\\)', '\\(\\pi\\)')
    parts = MATH.split(s)
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r'(?<![\w>])-(?=\d)', '−', parts[i])
    return ''.join(parts)


def decimals(s):
    t = re.sub(r'\\\(|\\\)', '', s)
    best = 0
    for m in re.finditer(r'\d+\.(\d+)', t):
        best = max(best, len(m.group(1)))
    return best


def ugly(v, right):
    """A distractor that a student can rule out at a glance."""
    if decimals(v) > max(2, decimals(right)):
        return True
    strip = lambda s: re.sub(r'^[₸$]', '', s)
    if re.fullmatch(r'[−-]?0(\s.*)?', strip(v)) and not re.fullmatch(r'[−-]?0(\s.*)?', strip(right)):
        return True
    rneg = strip(right).startswith(('−', '-'))
    if not rneg and re.match(r'^[₸$]?[−-]\d', v) and re.search(r'(days|cm|g|m|ml|km|°|litres)', v):
        return True
    return False


def filler(right):
    """Plausible numeric neighbours of the right answer."""
    if '\\(' in right or right.startswith('0.'):
        return []
    t = right
    if '\\' in t or '(' in t or len(re.findall(r'\d+(?:[.,]\d+)*', t)) != 1:
        return []
    m = re.search(r'\d+(?:\.\d+)?', t.replace(',', ''))
    if not m:
        return []
    v = F(m.group(0))
    raw = t.replace(',', '')
    out = []
    for c in (v * 2, v / 2, v * F(3, 2), v + 1, v - 1, v * 10, v / 10, v + 2):
        if c <= 0 or c == v:
            continue
        s = num(c).replace(',', '')
        if decimals(s) > max(2, decimals(t)):
            continue
        out.append((raw.replace(m.group(0), s, 1), ''))
    return out


def val(s):
    """Numeric value of a plain-number or single-fraction option, else None."""
    t = s.replace('−', '-').replace(',', '').strip()
    m = re.fullmatch(r'(-?)\\\(\\dfrac\{(\d+)\}\{(\d+)\}\\\)', t) or re.fullmatch(r'\\\((-?)\\dfrac\{(\d+)\}\{(\d+)\}\\\)', t)
    if m:
        return F(int(m.group(2)), int(m.group(3))) * (-1 if m.group(1) else 1)
    m = re.fullmatch(r'-?\d+(?:\.\d+)?', t)
    return F(t) if m else None


# ---------------------------------------------------------------- question builder
def build(topic, text, right, wrong, idea, steps, trap, sort=True):
    """wrong: list of (value_string, reason_ru). Returns question dict or None."""
    if text is None:
        return None
    right = fixminus(right)
    opts, why = [], {}
    vals = {val(right)} - {None}
    for v, r in list(wrong) + filler(right):
        v = fixminus(v)
        vv = val(v)
        if vv is not None and vv in vals:
            continue
        if v != right and v not in opts and not ugly(v, right):
            if vv is not None:
                vals.add(vv)
            opts.append(v)
            why[v] = r
        if len(opts) == 4:
            break
    if len(opts) < 4:
        return None
    allo = opts + [right]
    if sort:
        def key(s):
            t = re.sub(r'<[^>]+>|\\\(|\\\)', '', s).replace('−', '-').replace(',', '')
            m = re.search(r'-?\d+(?:\.\d+)?', t)
            fm = re.search(r'\\dfrac\{(\d+)\}\{(\d+)\}', s)
            if fm:
                v = int(fm.group(1)) / int(fm.group(2))
                if s.strip().startswith('−'):
                    v = -v
                return v
            if m:
                return float(m.group(0))
            raise ValueError
        try:
            allo.sort(key=key)
        except ValueError:
            R.shuffle(allo)
    else:
        R.shuffle(allo)
    if len(set(allo)) != 5:
        return None
    c = allo.index(right)
    letter = L[c]
    wn = [(allo.index(v), r) for v, r in why.items() if r]
    wn.sort(key=lambda p: (p[1].startswith('ошибка'), p[0]))
    wn = sorted(wn[:2])
    ex = ('<div class="ex"><div class="ex-h">✦ Идея</div><p class="ex-i">%s</p>'
          '<div class="ex-h">Решение</div><ol class="ex-s">%s</ol>'
          '<div class="ex-a">Ответ: <b>%s</b></div>' % (idea, ''.join('<li>%s</li>' % s for s in steps[:-1]) +
                                                        '<li>%s Ответ %s.</li>' % (steps[-1], letter), letter))
    if wn:
        ex += '<div class="ex-h ex-x">✗ Почему не другие</div><ul class="ex-n">%s</ul>' % ''.join(
            '<li>%s — %s</li>' % (L[i], r) for i, r in wn)
    ex += '<div class="ex-t"><b>⚠ Ловушка / совет.</b> %s</div></div>' % trap
    ex = fixminus(ex)
    text = fixminus(text)
    return {'topic': topic, 'text': text, 'image': '', 'options': allo, 'correct': c, 'explain': ex, 'src': 'PL'}


T = []  # (topic, generator)


def tpl(topic):
    def deco(f):
        T.append((topic, f))
        return f
    return deco


# ================================================================ M1 units
@tpl('M1.1')
def speed_units(R):
    v = R.choice([18, 36, 54, 72, 90, 108])
    ms = F(v * 1000, 3600)
    return build('M1.1', '<p>A train travels at %d km/h.</p><p>What is this speed in metres per second?</p>' % v,
                 num(ms) + ' m/s',
                 [(num(F(v * 1000, 60)) + ' m/s', 'делили только на 60 (минуты), а не на 3600.'),
                  (num(F(v * 3600, 1000)) + ' m/s', 'перевернули дробь: умножили на 3,6.'),
                  (num(F(v, 36)) + ' m/s', 'потеряли множитель 100.'),
                  (num(ms * 2) + ' m/s', 'ошибка в счёте.')],
                 '1 км/ч = <span class="fr"><span>1000</span><span>3600</span></span> м/с = <span class="fr"><span>5</span><span>18</span></span> м/с.',
                 ['%d · <span class="fr"><span>5</span><span>18</span></span> = %s м/с.' % (v, ru(num(ms)))],
                 'км/ч → м/с: делить на 3,6.')


@tpl('M1.1')
def density(R):
    d = R.choice([F(5, 2), F(8), F(27, 10), F(19, 2), F(13, 2)])
    vol = R.choice([20, 40, 50, 60, 80])
    m = d * vol
    return build('M1.1', '<p>A metal has density %s g/cm³. A block of it has volume %d cm³.</p><p>What is the mass of the block?</p>' % (num(d), vol),
                 num(m) + ' g',
                 [(num(F(vol) / d) + ' g', 'разделили объём на плотность.'),
                  (num(d / vol) + ' g', 'разделили плотность на объём.'),
                  (num(m / 10) + ' g', 'ошибка в порядке.'),
                  (num(m + vol) + ' g', 'сложили вместо умножения.')],
                 'Масса = плотность × объём.',
                 ['%s · %d = %s г.' % (ru(num(d)), vol, ru(num(m)))],
                 'Треугольник m = ρ·V помогает не перепутать.')


@tpl('M1.2')
def volume_units(R):
    a = R.choice([F(3, 2), F(12, 5), F(3), F(7, 20), F(1, 4)])
    cm3 = a * 1000000
    return build('M1.2', '<p>Convert %s m³ to cm³.</p>' % num(a),
                 num(cm3) + ' cm³',
                 [(num(a * 100) + ' cm³', 'умножили на 100, как для длины.'),
                  (num(a * 10000) + ' cm³', 'умножили на 100², как для площади.'),
                  (num(a * 1000) + ' cm³', 'перевели в литры, а не в см³.'),
                  (num(a * 100000000) + ' cm³', 'лишний множитель 100.')],
                 '1 м = 100 см, значит 1 м³ = 100³ = 1 000 000 см³.',
                 ['%s · 1 000 000 = %s см³.' % (ru(num(a)), ru(num(cm3)))],
                 'Объём — куб коэффициента, площадь — квадрат.')


@tpl('M1.2')
def litres(R):
    l, w, h = R.choice([(40, 25, 30), (50, 20, 30), (60, 40, 25), (80, 50, 20), (120, 30, 40)])
    v = l * w * h
    lit = F(v, 1000)
    return build('M1.2', '<p>A fish tank is a cuboid %d cm long, %d cm wide and %d cm high.</p><p>How many litres of water does it hold when full?</p>' % (l, w, h),
                 num(lit) + ' litres',
                 [(num(F(v, 100)) + ' litres', 'делили на 100, а 1 л = 1000 см³.'),
                  (num(F(v, 10000)) + ' litres', 'делили на 10 000.'),
                  (num(F(2 * (l * w + l * h + w * h), 1000)) + ' litres', 'посчитали площадь поверхности, а не объём.'),
                  (num(lit * 10) + ' litres', 'ошибка в порядке.')],
                 '1 литр = 1000 см³.',
                 ['V = %d · %d · %d = %s см³.' % (l, w, h, num(v)), '%s : 1000 = %s л.' % (num(v), ru(num(lit)))],
                 'Литр — это куб 10 × 10 × 10 см.')


# ================================================================ M2 number
@tpl('M2.2')
def order_ops(R):
    a, b, c, d = R.choice([(3, 4, 2, 5), (6, 2, 3, 4), (5, 3, 4, 2), (8, 4, 2, 3), (7, 2, 5, 3)])
    v = a + b * c ** 2 - d
    return build('M2.2', '<p>Evaluate \\(%d + %d \\times %d^2 - %d\\).</p>' % (a, b, c, d),
                 str(v),
                 [(str((a + b) * c ** 2 - d), 'сначала сложили %d + %d.' % (a, b)),
                  (str(a + (b * c) ** 2 - d), 'возвели в квадрат произведение %d·%d.' % (b, c)),
                  (str(a + b * c * 2 - d), 'c² посчитали как 2c.'),
                  (str(a + b * c ** 2 + d), 'потеряли минус.')],
                 'Порядок: степень → умножение → сложение и вычитание.',
                 ['%d² = %d, %d · %d = %d.' % (c, c * c, b, c * c, b * c * c), '%d + %d − %d = %d.' % (a, b * c * c, d, v)],
                 'Степень относится только к числу, на котором стоит.')


@tpl('M2.3')
def hcf_lcm(R):
    while True:
        g = R.choice([4, 6, 8, 9, 12, 15])
        x, y = R.sample([2, 3, 5, 7], 2)
        a, b = g * x, g * y
        if a != b:
            break
    lcm = a * b // math.gcd(a, b)
    hcf = math.gcd(a, b)
    return build('M2.3', '<p>Two buses leave the station together. One returns every %d minutes and the other every %d minutes.</p><p>After how many minutes are they next at the station together?</p>' % (a, b),
                 str(lcm),
                 [(str(hcf), 'это НОД, а нужен НОК.'), (str(a * b), 'просто перемножили — это общее кратное, но не наименьшее.'),
                  (str(a + b), 'сложили интервалы.'), (str(lcm * 2), 'второе совпадение, а не первое.')],
                 'Нужно наименьшее общее кратное (НОК).',
                 ['НОД(%d, %d) = %d.' % (a, b, hcf), 'НОК = %d · %d : %d = %d.' % (a, b, hcf, lcm)],
                 '«Снова вместе» — НОК; «разделить поровну» — НОД.')


@tpl('M2.3')
def prime_factor(R):
    p = R.choice([(2, 3, 3), (2, 2, 7), (2, 5, 2), (3, 3, 2), (2, 3, 4), (2, 4, 1)])
    n = 2 ** p[0] * 3 ** p[1] * (p[2] if p[2] in (5, 7) else 1)
    if p[2] == 5:
        n = 2 ** p[0] * 3 ** 0 * 5 ** p[1] if False else n
    a, b = R.choice([(3, 2), (2, 3), (4, 1), (1, 4), (2, 2)])
    c = R.choice([1, 2])
    n = 2 ** a * 3 ** b * 5 ** c
    def f(a, b, c):
        parts = []
        for base, e in ((2, a), (3, b), (5, c)):
            if e == 0:
                continue
            parts.append('%d^{%d}' % (base, e) if e > 1 else str(base))
        return '\\(' + ' \\times '.join(parts) + '\\)'
    return build('M2.3', '<p>Write %s as a product of its prime factors.</p>' % num(n),
                 f(a, b, c),
                 [(f(a + 1, b - 1 if b > 1 else b, c) if b > 1 else f(a - 1, b + 1, c), 'произведение не равно %s.' % num(n)),
                  (f(b, a, c), 'перепутали показатели у 2 и 3.'),
                  (f(a, b, c + 1), 'лишняя пятёрка.'),
                  ('\\(%d \\times %d\\)' % (2 ** a * 3 ** b, 5 ** c), 'множитель %d не простой.' % (2 ** a * 3 ** b))],
                 'Делите на 2, пока делится, затем на 3, затем на 5.',
                 ['%s = 2<sup>%d</sup> · 3<sup>%d</sup> · 5<sup>%d</sup>.' % (num(n), a, b, c)],
                 'Проверьте: перемножьте ответ обратно.', sort=False)


@tpl('M2.6')
def roots(R):
    a = R.choice([4, 5, 6, 7, 8, 9])
    b = R.choice([2, 3, 4, 5])
    v = a + b
    return build('M2.6', '<p>Evaluate \\(\\sqrt{%d} - \\sqrt[3]{%d} + %d\\).</p>' % (a * a, -b ** 3, 0) if False else
                 '<p>Evaluate \\(\\sqrt{%d} - \\sqrt[3]{-%d}\\).</p>' % (a * a, b ** 3),
                 str(a + b),
                 [(str(a - b), 'кубический корень из отрицательного числа отрицателен: −(−%d) = +%d.' % (b, b)),
                  (str(a * a - b), 'забыли извлечь квадратный корень.'),
                  (str(a + b * b), 'посчитали ∛ как квадратный корень.'),
                  (str(-(a + b)), 'ошибка в знаке.')],
                 '∛(−%d) = −%d.' % (b ** 3, b),
                 ['√%d = %d.' % (a * a, a), '%d − (−%d) = %d.' % (a, b, a + b)],
                 'Куб отрицательного числа отрицателен, поэтому ∛ отрицательного существует.')


@tpl('M2.7')
def index_numbers(R):
    b = R.choice([2, 3, 5])
    p, q, r = R.choice([(5, 3, 4), (7, 2, 6), (4, 6, 7), (8, 3, 9), (6, 4, 8)])
    e = p + q - r
    return build('M2.7', '<p>Evaluate \\(\\dfrac{%d^{%d} \\times %d^{%d}}{%d^{%d}}\\).</p>' % (b, p, b, q, b, r),
                 num(b ** e),
                 [(num(b ** (p * q - r)) if p * q - r < 12 else num(b ** (e + 2)), 'перемножили показатели вместо сложения.'),
                  (num(b ** (e + 1)), 'ошибка в показателе.'),
                  (num(b * e), 'умножили основание на показатель.'),
                  (num(b ** (e - 1)) if e > 1 else num(b ** (e + 3)), 'ошибка в показателе.')],
                 'При умножении показатели складываются, при делении — вычитаются.',
                 ['%d + %d − %d = %d.' % (p, q, r, e), '%d<sup>%d</sup> = %s.' % (b, e, num(b ** e))],
                 'aᵐ · aⁿ = aᵐ⁺ⁿ, а не aᵐⁿ.')


@tpl('M2.7')
def neg_frac_index(R):
    base, root, pw = R.choice([(8, 3, 2), (27, 3, 2), (16, 4, 3), (32, 5, 2), (125, 3, 2), (9, 2, 3), (64, 3, 2)])
    r = round(base ** (1 / root))
    v = F(1, r ** pw)
    return build('M2.7', '<p>Evaluate \\(%d^{-\\frac{%d}{%d}}\\).</p>' % (base, pw, root),
                 fr(v),
                 [(fr(F(r ** pw)), 'забыли минус: он даёт обратное число.'),
                  (fr(-F(r ** pw)), 'минус в показателе не делает число отрицательным.'),
                  (fr(F(1, r * pw)), 'умножили корень на показатель.'),
                  (fr(F(1, base ** pw)) if base ** pw < 5000 else fr(F(1, r ** (pw + 1))), 'не извлекли корень.')],
                 'Минус — обратное число, знаменатель — корень, числитель — степень.',
                 ['<sup>%d</sup>√%d = %d.' % (root, base, r), '%d<sup>%d</sup> = %d → ответ %s.' % (r, pw, r ** pw, frx(v))],
                 'Сначала корень, потом степень — числа меньше.', sort=False)


@tpl('M2.8')
def standard_form(R):
    a, b = R.choice([(F(3), F(4)), (F(6), F(5)), (F(25, 10), F(8)), (F(12, 10), F(5)), (F(45, 10), F(2))])
    m, n = R.choice([(5, 3), (7, -2), (4, 6), (-3, 8), (6, -9)])
    prod = a * b
    e = m + n
    while prod >= 10:
        prod /= 10
        e += 1
    def sf(c, k):
        return '\\(%s \\times 10^{%d}\\)' % (num(c), k)
    return build('M2.8', '<p>Calculate \\((%s \\times 10^{%d}) \\times (%s \\times 10^{%d})\\), giving your answer in standard form.</p>' % (num(a), m, num(b), n),
                 sf(prod, e),
                 [(sf(prod, e - 1), 'не перенесли разряд, когда произведение стало ≥ 10.' if a * b >= 10 else 'ошибка в показателе.'),
                  (sf(prod, e + 1), 'ошибка в показателе.'),
                  (sf(prod, m * n), 'перемножили показатели.'),
                  (sf(a + b if a + b < 10 else (a + b) / 10, e), 'сложили множители.')],
                 'Перемножьте числа и отдельно степени десятки.',
                 ['%s · %s = %s.' % (ru(num(a)), ru(num(b)), ru(num(a * b))), '10<sup>%d</sup> · 10<sup>%d</sup> = 10<sup>%d</sup>; приводим к виду 1 ≤ a &lt; 10: %s · 10<sup>%d</sup>.' % (m, n, m + n, ru(num(prod)), e)],
                 'В стандартном виде множитель от 1 до 10.', sort=False)


@tpl('M2.9')
def recurring(R):
    a, b = R.choice([(4, 9), (7, 9), (2, 9)])
    if R.random() < 0.5:
        d = R.choice([12, 45, 27, 81, 36])
        v = F(d, 99)
        txt = '0.\\(\\dot{%d}\\dot{%d}\\)' % (d // 10, d % 10)
        rnum = '0,%d%d…' % (d, d)
        wrong = [(fr(F(d, 100)), 'это 0,%d без повторения.' % d), (fr(F(d, 90)), 'знаменатель 90 — для одной повторяющейся цифры после одной неповторяющейся.'),
                 (fr(F(d, 999)) if F(d, 999) != v else fr(F(d, 9)), 'три девятки — для периода из трёх цифр.'), (fr(F(d % 10, 9)), 'взяли только последнюю цифру.')]
        steps = ['x = %s, 100x = %d,%d%d…' % (rnum, d, d, d), '99x = %d → x = %s.' % (d, frx(v))]
    else:
        d = R.choice([1, 2, 4, 5, 7, 8])
        v = F(d, 9)
        txt = '0.\\(\\dot{%d}\\)' % d
        wrong = [(fr(F(d, 10)), 'это 0,%d без повторения.' % d), (fr(F(d, 99)), 'это 0,0%d0%d…' % (d, d)),
                 (fr(F(d, 90)), 'это 0,0%d%d…' % (d, d)), (fr(F(d + 1, 10)), 'округлили.')]
        steps = ['x = 0,%d%d%d…, 10x = %d,%d%d…' % (d, d, d, d, d, d), '9x = %d → x = %s.' % (d, frx(v))]
    return build('M2.9', '<p>Write %s as a fraction in its simplest form.</p>' % txt,
                 fr(v), wrong, 'Умножьте на 10ⁿ (n — длина периода) и вычтите.', steps,
                 'Период из k цифр → знаменатель из k девяток.')


@tpl('M2.11')
def surds(R):
    a, b = R.choice([(2, 3), (3, 2), (5, 2), (2, 5), (4, 3)])
    n1, n2 = R.choice([(8, 18), (12, 27), (20, 45), (50, 32), (75, 12), (18, 50)])
    def simp(n):
        for k in range(10, 1, -1):
            if n % (k * k) == 0:
                return k, n // (k * k)
        return 1, n
    k1, r1 = simp(n1)
    k2, r2 = simp(n2)
    s = k1 + k2
    return build('M2.11', '<p>Simplify \\(\\sqrt{%d} + \\sqrt{%d}\\).</p>' % (n1, n2),
                 '\\(%d\\sqrt{%d}\\)' % (s, r1),
                 [('\\(\\sqrt{%d}\\)' % (n1 + n2), '√a + √b ≠ √(a + b).'),
                  ('\\(%d\\sqrt{%d}\\)' % (k1 * k2, r1), 'перемножили коэффициенты.'),
                  ('\\(%d\\sqrt{%d}\\)' % (s, 2 * r1), 'ошибка под корнем.'),
                  ('\\(%d\\sqrt{%d}\\)' % (s + 1, r1), 'ошибка при упрощении.')],
                 'Вынесите полные квадраты из-под корня.',
                 ['√%d = %d√%d, √%d = %d√%d.' % (n1, k1, r1, n2, k2, r2), '%d√%d + %d√%d = %d√%d.' % (k1, r1, k2, r2, s, r1)],
                 'Складывать можно только одинаковые корни.', sort=False)


@tpl('M2.11')
def rationalise(R):
    a, n = R.choice([(6, 3), (10, 5), (14, 7), (12, 2), (15, 3), (4, 2), (21, 7)])
    g = math.gcd(a, n)
    c = a // n if a % n == 0 else None
    rnum, rden = a // g, n // g
    def ans(p, q):
        if q == 1:
            return '\\(%s\\sqrt{%d}\\)' % ('' if p == 1 else p, n)
        return '\\(\\dfrac{%s\\sqrt{%d}}{%d}\\)' % ('' if p == 1 else p, n, q)
    return build('M2.11', '<p>Write \\(\\dfrac{%d}{\\sqrt{%d}}\\) with a rational denominator, in its simplest form.</p>' % (a, n),
                 ans(rnum, rden),
                 [(ans(a, 1), 'забыли разделить на %d.' % n), ('\\(\\dfrac{%d}{%d}\\)' % (a, n), 'корень пропал.'),
                  ('\\(\\dfrac{\\sqrt{%d}}{%d}\\)' % (n, a), 'перевернули дробь.'), (ans(rnum * 2, rden) if rden != 1 else ans(a * n, 1), 'ошибка при сокращении.')],
                 'Умножьте числитель и знаменатель на √%d.' % n,
                 ['<span class="fr"><span>%d√%d</span><span>%d</span></span>, сокращаем.' % (a, n, n)],
                 '√n · √n = n.', sort=False)


@tpl('M2.12')
def bounds(R):
    l, w = R.choice([(12, 8), (15, 6), (20, 9), (14, 11), (25, 4)])
    up = F(2 * l + 1) / 2 * (F(2 * w + 1) / 2)
    lo = F(2 * l - 1) / 2 * (F(2 * w - 1) / 2)
    return build('M2.12', '<p>A rectangle is %d cm long and %d cm wide, both measured to the nearest centimetre.</p><p>What is the upper bound of its area?</p>' % (l, w),
                 num(up) + ' cm²',
                 [(num(F(l * w)) + ' cm²', 'это значение без учёта точности.'), (num(lo) + ' cm²', 'это нижняя граница.'),
                  (num(F(l + 1) * (w + 1)) + ' cm²', 'прибавили по 1 см, а граница — ±0,5.'),
                  (num(F(2 * l + 1, 2) * w) + ' cm²', 'увеличили только длину.')],
                 'Верхняя граница произведения = верхняя × верхняя.',
                 ['Границы: %s и %s см.' % (ru(num(F(2 * l + 1, 2))), ru(num(F(2 * w + 1, 2)))), '%s · %s = %s см².' % (ru(num(F(2 * l + 1, 2))), ru(num(F(2 * w + 1, 2))), ru(num(up)))],
                 'До ближайшего целого — это ±0,5.')


@tpl('M2.13')
def sig_figs(R):
    v = R.choice([0.004672, 38452, 0.07085, 2649.7, 0.0003958, 615.48])
    n = R.choice([2, 3])
    def sig(x, k):
        from decimal import Decimal
        if x == 0:
            return '0'
        from decimal import ROUND_HALF_UP
        d = Decimal(repr(x))
        e = d.adjusted()
        q = Decimal(1).scaleb(e - k + 1)
        r = d.quantize(q, rounding=ROUND_HALF_UP) if e - k + 1 < 0 else (d / q).quantize(Decimal(1), rounding=ROUND_HALF_UP) * q
        if e - k + 1 >= 0:
            r = int(r)
            return '{:,}'.format(r) if r >= 10000 else str(r)
        return format(r, 'f')
    right = sig(v, n)
    return build('M2.13', '<p>Round %s to %d significant figures.</p>' % ('{:,}'.format(v) if v >= 10000 else ('%f' % v).rstrip('0'), n),
                 right,
                 [(sig(v, n + 1), 'это %d значащие цифры.' % (n + 1)), (sig(v, n - 1) if n > 1 else sig(v, 3), 'это %d значащая цифра.' % (n - 1)),
                  (('%.' + str(n) + 'f') % v if v < 1 and float(('%.' + str(n) + 'f') % v) != 0 else sig(v, n + 2) if v < 1 else str(round(v / 10 ** (len(str(int(v))) - n))), 'округлили до %d знаков после запятой или потеряли разряд.' % n),
                  (sig(v * 10, n) if v < 1 else sig(v / 10, n), 'сдвинули разряд.')],
                 'Значащие цифры считаются с первой ненулевой.',
                 ['Первая ненулевая цифра — начало счёта; округляем по следующей цифре: %s.' % ru(right)],
                 'Нули в начале не считаются, нули-заполнители в конце сохраняем.', sort=False)


@tpl('M2.14')
def estimate(R):
    a, b, c = R.choice([(4.87, 61.3, 0.512), (9.73, 39.6, 0.198), (19.8, 5.12, 0.247), (3.06, 79.4, 0.389), (7.91, 48.2, 0.0193)])
    def one(x):
        e = math.floor(math.log10(abs(x)))
        return round(x, -e)
    A, B, C = one(a), one(b), one(c)
    v = A * B / C
    vs = num(F(v).limit_denominator(1000))
    return build('M2.14', '<p>By rounding each number to 1 significant figure, estimate \\(\\dfrac{%s \\times %s}{%s}\\).</p>' % (a, b, c),
                 vs,
                 [(num(F(A * B * C).limit_denominator(1000)), 'умножили на знаменатель.'), (num(F(v / 10).limit_denominator(1000)), 'ошибка в разряде знаменателя.'),
                  (num(F(v * 10).limit_denominator(1000)), 'ошибка в разряде.'), (num(F(A * B).limit_denominator(1000)), 'забыли разделить.')],
                 'Округлите до 1 значащей цифры: %s, %s, %s.' % (ru(num(F(A).limit_denominator(1000))), ru(num(F(B).limit_denominator(1000))), ru(num(F(C).limit_denominator(1000)))),
                 ['%s · %s : %s = %s.' % (ru(num(F(A).limit_denominator(1000))), ru(num(F(B).limit_denominator(1000))), ru(num(F(C).limit_denominator(1000))), ru(vs))],
                 'Деление на 0,2 — то же, что умножение на 5.')


# ================================================================ M3 ratio and proportion
@tpl('M3.6')
def inverse_prop(R):
    w, d = R.choice([(6, 10), (4, 15), (8, 9), (5, 12), (12, 5)])
    w2 = R.choice([k for k in (2, 3, 4, 5, 6, 9, 10, 15, 20) if (w * d) % k == 0 and k != w])
    d2 = w * d // w2
    return build('M3.6', '<p>%d workers can paint a school in %d days.</p><p>How long would %d workers take, working at the same rate?</p>' % (w, d, w2),
                 '%d days' % d2,
                 [(num(F(d * w2, w)) + ' days', 'посчитали как прямую пропорцию.'), ('%d days' % (d + w - w2), 'вычли разницу в рабочих.'),
                  ('%d days' % (w * d), 'это человеко-дни, а не дни.'), ('%d days' % (d2 + 2), 'ошибка в счёте.')],
                 'Больше рабочих — меньше дней: объём работы w·d постоянен.',
                 ['%d · %d = %d человеко-дней.' % (w, d, w * d), '%d : %d = %d дней.' % (w * d, w2, d2)],
                 'Сначала проверьте: прямая или обратная пропорция?')


@tpl('M3.9')
def direct_square(R):
    k = R.choice([2, 3, 5, F(1, 2), 4])
    x1 = R.choice([2, 3, 4, 6])
    y1 = k * x1 * x1
    x2 = R.choice([v for v in (5, 8, 10, 12) if v != x1])
    y2 = k * x2 * x2
    return build('M3.9', '<p>\\(y\\) is directly proportional to \\(x^2\\). When \\(x = %d\\), \\(y = %s\\).</p><p>Find \\(y\\) when \\(x = %d\\).</p>' % (x1, num(y1), x2),
                 num(y2),
                 [(num(y1 * x2 / x1), 'взяли y ∝ x, а не x².'), (num(y1 * x1 * x1 / (x2 * x2)), 'посчитали как обратную пропорцию.'),
                  (num(k * x2), 'забыли возвести в квадрат.'), (num(y2 * 2), 'ошибка в коэффициенте.')],
                 'y = kx²: найдите k по первой паре.',
                 ['k = %s : %d = %s.' % (ru(num(y1)), x1 * x1, ru(num(k))), 'y = %s · %d = %s.' % (ru(num(k)), x2 * x2, ru(num(y2)))],
                 'Коэффициент k находится один раз и используется дальше.')


@tpl('M3.9')
def inverse_sqrt(R):
    k = R.choice([12, 24, 36, 60])
    x1, x2 = R.choice([(4, 9), (9, 36), (4, 16), (16, 4), (25, 4), (9, 4)])
    y1 = F(k, int(math.isqrt(x1)))
    y2 = F(k, int(math.isqrt(x2)))
    return build('M3.9', '<p>\\(y\\) is inversely proportional to \\(\\sqrt{x}\\). When \\(x = %d\\), \\(y = %s\\).</p><p>Find \\(y\\) when \\(x = %d\\).</p>' % (x1, num(y1), x2),
                 num(y2),
                 [(num(y1 * F(int(math.isqrt(x2)), int(math.isqrt(x1)))), 'это прямая пропорция.'), (num(y1 * F(x1, x2)), 'забыли корень.'),
                  (num(y1 * F(x2, x1)), 'прямая пропорция и без корня.'), (num(y2 + 1), 'ошибка в счёте.')],
                 'y = <span class="fr"><span>k</span><span>√x</span></span>.',
                 ['k = %s · √%d = %d.' % (ru(num(y1)), x1, k), 'y = %d : √%d = %s.' % (k, x2, ru(num(y2)))],
                 '«Обратно пропорционально» — произведение постоянно.')


@tpl('M3.7')
def ratio_fraction(R):
    a, b = R.choice([(2, 3), (3, 5), (4, 5), (5, 7), (3, 4)])
    left = R.choice([F(1, 3), F(1, 4), F(2, 5)])
    total = (a + b) * R.choice([20, 30, 40]) * left.denominator
    A = F(total * a, a + b)
    give = A * left
    return build('M3.7', '<p>Asel and Bota share %d stickers in the ratio %d : %d. Asel then gives %s of her stickers to Bota.</p><p>How many stickers does Bota have now?</p>' % (total, a, b, fr(left)),
                 num(F(total) - A + give),
                 [(num(F(total) - A), 'забыли подарок.'), (num(A - give), 'это сколько осталось у Асель.'),
                  (num(F(total) - A + F(total) * left), 'взяли дробь от всех наклеек, а не от доли Асель.'), (num(A), 'это доля Асель до подарка.')],
                 'Сначала поделите в отношении, потом возьмите дробь от доли Асель.',
                 ['Асель: %d · <span class="fr"><span>%d</span><span>%d</span></span> = %s, Бота: %s.' % (total, a, a + b, num(A), num(F(total) - A)),
                  'Асель отдаёт %s · %s = %s → у Боты %s.' % (frx(left), num(A), num(give), num(F(total) - A + give))],
                 'Читайте «от чего» берётся дробь.')


@tpl('M3.8')
def reverse_percent(R):
    p = R.choice([15, 20, 25, 30, 35])
    orig = R.choice([40, 60, 80, 120, 200]) * 4
    sale = orig * (100 - p) // 100
    if orig * (100 - p) % 100:
        return None
    return build('M3.8', '<p>In a sale all prices are reduced by %d%%. A jacket costs ₸%s in the sale.</p><p>What was the original price?</p>' % (p, num(sale)),
                 '₸' + num(orig),
                 [('₸' + num(F(sale * (100 + p), 100)), 'прибавили %d%% к цене со скидкой.' % p), ('₸' + num(F(sale * (100 - p), 100)), 'ещё раз отняли %d%%.' % p),
                  ('₸' + num(sale + p * 100), 'прибавили %d·100.' % p), ('₸' + num(F(sale * 100, p)), 'разделили на %d%%, а не на %d%%.' % (p, 100 - p))],
                 'Цена со скидкой — это %d%% от исходной.' % (100 - p),
                 ['%s : %s = %s.' % (num(sale), ru(num(F(100 - p, 100))), num(orig))],
                 'Обратный процент: делите, а не прибавляйте.')


@tpl('M3.8')
def successive(R):
    a, b = R.choice([(20, 20), (10, 10), (25, 20), (30, 10), (50, 50), (20, 25)])
    up = R.random() < 0.5
    m = (F(100 + a, 100) * F(100 - b, 100)) if up else (F(100 - a, 100) * F(100 - b, 100))
    ch = (m - 1) * 100
    def s(v):
        return ('+' if v > 0 else '−') + num(abs(v)) + '%' if v != 0 else '0%'
    txt = 'increased by %d%%, then the new price is decreased by %d%%' % (a, b) if up else 'decreased by %d%%, then the new price is decreased by a further %d%%' % (a, b)
    naive = (a - b) if up else -(a + b)
    return build('M3.8', '<p>A price is %s.</p><p>What is the overall percentage change?</p>' % txt,
                 s(ch),
                 [(s(F(naive)), 'проценты нельзя просто складывать — они от разных сумм.'), (s(-ch) if ch != 0 else '+%d%%' % (a * b // 100), 'перепутали знак.'),
                  (s(ch - 1) if ch != 1 else s(ch + 2), 'ошибка в счёте.'), (s(F(naive) * 2) if naive else '+%d%%' % a, 'ошибка в счёте.')],
                 'Перемножьте множители изменений.',
                 ['%s · %s = %s.' % (ru(num(F(100 + a, 100) if up else F(100 - a, 100))), ru(num(F(100 - b, 100))), ru(num(m))), 'Изменение: %s.' % ru(s(ch))],
                 'Последовательные проценты — умножение, а не сложение.', sort=False)


@tpl('M3.2')
def fraction_of(R):
    a, b, unit = R.choice([(45, 2, 'minutes of 2 hours'), (40, 3, 'cm of 3 m'), (250, 2, 'g of 2 kg'), (35, 1, 'minutes of 1 hour'), (600, 4, 'm of 4 km')])
    big = {'minutes of 2 hours': 120, 'cm of 3 m': 300, 'g of 2 kg': 2000, 'minutes of 1 hour': 60, 'm of 4 km': 4000}[unit]
    v = F(a, big)
    return build('M3.2', '<p>Write %d %s as a fraction in its simplest form.</p>' % (a, unit),
                 fr(v),
                 [(fr(F(a, b)) if F(a, b) != v else fr(F(a, b * 10)), 'не перевели в одинаковые единицы.'), (fr(F(a, big // 10)), 'ошибка при переводе единиц.'),
                  (fr(F(big - a, big)), 'это оставшаяся часть.'), (fr(F(a, big * 10)), 'ошибка при переводе единиц.')],
                 'Сначала одинаковые единицы, потом сокращение.',
                 ['%d из %d → %s.' % (a, big, frx(v))],
                 'Дробь имеет смысл только для одинаковых единиц.', sort=False)


@tpl('M3.3')
def map_scale(R):
    sc = R.choice([25000, 50000, 40000, 20000])
    km = R.choice([F(3), F(5, 2), F(6), F(4), F(15, 2)])
    cm = km * 100000 / sc
    return build('M3.3', '<p>A map has scale 1 : %s. Two villages are %s km apart.</p><p>How far apart are they on the map?</p>' % ('{:,}'.format(sc), num(km)),
                 num(cm) + ' cm',
                 [(num(cm * 10) + ' cm', 'ошибка в переводе км в см.'), (num(cm / 10) + ' cm', 'ошибка в переводе км в см.'),
                  (num(km * sc / 1000) + ' cm', 'умножили на масштаб вместо деления.'), (num(cm * 100) + ' cm', 'перевели км в м, а не в см.')],
                 '1 км = 100 000 см.',
                 ['%s км = %s см.' % (ru(num(km)), num(km * 100000)), '%s : %s = %s см.' % (num(km * 100000), num(sc), ru(num(cm)))],
                 'Переведите в одни единицы, потом делите на масштаб.')


@tpl('M3.1')
def similar_side(R):
    a, b, c = R.choice([(6, 9, 8), (4, 10, 6), (5, 8, 15), (9, 12, 6), (8, 14, 12)])
    v = F(b * c, a)
    return build('M3.1', '<p>Triangles PQR and XYZ are similar. PQ = %d cm corresponds to XY = %d cm, and QR = %d cm.</p><p>Find YZ.</p>' % (a, b, c),
                 num(v) + ' cm',
                 [(num(F(a * c, b)) + ' cm', 'коэффициент перевёрнут.'), (num(c + b - a) + ' cm', 'прибавили разницу вместо умножения.'),
                  (num(v * v / c) + ' cm', 'взяли коэффициент в квадрате.'), (num(v + 2) + ' cm', 'ошибка в счёте.')],
                 'Коэффициент подобия k = <span class="fr"><span>%d</span><span>%d</span></span>.' % (b, a),
                 ['YZ = %d · <span class="fr"><span>%d</span><span>%d</span></span> = %s см.' % (c, b, a, ru(num(v)))],
                 'В подобных фигурах стороны умножаются, а не прибавляются.')


@tpl('M3.10')
def similar_area(R):
    a, b = R.choice([(2, 3), (3, 5), (4, 5), (2, 5), (3, 4)])
    S = R.choice([8, 12, 20, 36, 45]) * a * a
    big = F(S * b * b, a * a)
    return build('M3.10', '<p>Two similar shapes have corresponding lengths in the ratio %d : %d. The smaller has area %d cm².</p><p>What is the area of the larger?</p>' % (a, b, S),
                 num(big) + ' cm²',
                 [(num(F(S * b, a)) + ' cm²', 'площадь растёт как k², а не k.'), (num(F(S * b ** 3, a ** 3)) + ' cm²', 'k³ — это для объёма.'),
                  (num(S + (b - a) ** 2) + ' cm²', 'прибавили вместо умножения.'), (num(big * 2) + ' cm²', 'ошибка в счёте.')],
                 'Площади относятся как квадраты длин.',
                 ['k² = (%d/%d)² = %s.' % (b, a, frx(F(b * b, a * a))), '%d · %s = %s см².' % (S, frx(F(b * b, a * a)), ru(num(big)))],
                 'Длина ×k, площадь ×k², объём ×k³.')


@tpl('M3.11')
def reverse_growth(R):
    r = R.choice([10, 20, 50])
    n = 2
    start = R.choice([500, 1000, 2000, 4000])
    end = F(start) * F(100 + r, 100) ** n
    return build('M3.11', '<p>A population grows by %d%% each year. After 2 years it is %s.</p><p>What was it at the start?</p>' % (r, num(end)),
                 num(start),
                 [(num(end * F(100 - 2 * r, 100)), 'отняли %d%% от конечного значения.' % (2 * r)), (num(end * F(100 - r, 100) ** 2), 'дважды отняли %d%% — проценты от разных чисел.' % r),
                  (num(end / F(100 + 2 * r, 100)), 'разделили на 1 + %d%%, как при простом проценте.' % (2 * r)), (num(end / F(100 + r, 100)), 'разделили только один раз.')],
                 'Каждый год — умножение на %s, значит назад — деление на %s².' % (ru(num(F(100 + r, 100))), ru(num(F(100 + r, 100)))),
                 ['%s : %s = %s.' % (num(end), ru(num(F(100 + r, 100) ** 2)), num(start))],
                 'Обратный сложный процент — деление.')


# ================================================================ M4 algebra
@tpl('M4.3')
def substitute(R):
    a, b = R.choice([(-3, 2), (4, -1), (-2, -5), (5, -2), (-1, 3)])
    v = 2 * a * a - 3 * a * b + b * b
    return build('M4.3', '<p>Find the value of \\(2a^2 - 3ab + b^2\\) when \\(a = %d\\) and \\(b = %d\\).</p>' % (a, b),
                 str(v),
                 [(str(-2 * a * a - 3 * a * b + b * b), 'посчитали a² как отрицательное число.'), (str((2 * a) ** 2 - 3 * a * b + b * b), 'возвели в квадрат 2a.'),
                  (str(2 * a * a + 3 * a * b + b * b), 'ошибка со знаком в −3ab.'), (str(2 * a * a - 3 * a * b - b * b), 'ошибка в знаке b².')],
                 'Подставляйте отрицательные числа в скобках.',
                 ['2·(%d)² = %d; −3·(%d)·(%d) = %d; (%d)² = %d.' % (a, 2 * a * a, a, b, -3 * a * b, b, b * b), 'Сумма: %d.' % v],
                 '(−3)² = 9, а −3² = −9.')


@tpl('M4.6')
def simplify_frac(R):
    a, b = R.choice([(2, 3), (3, 4), (2, 5), (4, 3), (3, 2)])
    num_ = '\\(\\dfrac{x}{%d} + \\dfrac{x}{%d}\\)' % (a, b)
    s = F(1, a) + F(1, b)
    def fx(fr_):
        return '\\(\\dfrac{%dx}{%d}\\)' % (fr_.numerator, fr_.denominator) if fr_.numerator != 1 else '\\(\\dfrac{x}{%d}\\)' % fr_.denominator
    return build('M4.6', '<p>Simplify %s.</p>' % num_,
                 fx(s),
                 [('\\(\\dfrac{2x}{%d}\\)' % (a + b), 'сложили знаменатели.'), ('\\(\\dfrac{x}{%d}\\)' % (a + b), 'сложили знаменатели и потеряли x.'),
                  ('\\(\\dfrac{2x}{%d}\\)' % (a * b), 'числители не домножили.'), ('\\(\\dfrac{%dx}{%d}\\)' % (a * b, a + b), 'перевернули дробь.')],
                 'Общий знаменатель %d.' % (a * b),
                 ['<span class="fr"><span>%dx</span><span>%d</span></span> + <span class="fr"><span>%dx</span><span>%d</span></span> = <span class="fr"><span>%dx</span><span>%d</span></span>.' % (b, a * b, a, a * b, a + b, a * b)],
                 'Знаменатели не складываются.', sort=False)


@tpl('M4.6')
def algebraic_cancel(R):
    k = R.choice([2, 3, 4, 5, -2, -3])
    sgn_ = '+' if k > 0 else '-'
    return build('M4.6', '<p>Simplify \\(\\dfrac{x^2 - %d}{x %s %d}\\).</p>' % (k * k, sgn_, abs(k)),
                 '\\(x %s %d\\)' % ('-' if k > 0 else '+', abs(k)),
                 [('\\(x %s %d\\)' % (sgn_, abs(k)), 'знак после сокращения меняется.'), ('\\(x - %d\\)' % (k * k), 'сократили только x.'),
                  ('\\(%d - x\\)' % abs(k), 'ошибка со знаком.'), ('\\(x^2 - %d\\)' % abs(k), 'сократили неправильно.')],
                 'Числитель — разность квадратов.',
                 ['x² − %d = (x − %d)(x + %d).' % (k * k, abs(k), abs(k)), 'Сокращаем на (x %s %d).' % (sgn_.replace('-', '−'), abs(k))],
                 'Сокращают только множители, не слагаемые.', sort=False)


@tpl('M4.7')
def change_subject(R):
    form = R.choice([0, 1, 2])
    if form == 0:
        return build('M4.7', '<p>Make \\(r\\) the subject of \\(V = \\pi r^2 h\\).</p>',
                     '\\(r = \\sqrt{\\dfrac{V}{\\pi h}}\\)',
                     [('\\(r = \\dfrac{V}{\\pi h}\\)', 'забыли квадратный корень.'), ('\\(r = \\sqrt{V - \\pi h}\\)', 'вычли вместо деления.'),
                      ('\\(r = \\dfrac{\\sqrt{V}}{\\pi h}\\)', 'корень только из V.'), ('\\(r = \\sqrt{\\dfrac{\\pi h}{V}}\\)', 'дробь перевёрнута.')],
                     'Разделите на πh, затем извлеките корень.', ['r² = <span class="fr"><span>V</span><span>πh</span></span> → r = √(V/(πh)).'],
                     'Обратные действия — в обратном порядке.', sort=False)
    if form == 1:
        return build('M4.7', '<p>Make \\(x\\) the subject of \\(y = \\dfrac{3x + 2}{x - 1}\\).</p>',
                     '\\(x = \\dfrac{y + 2}{y - 3}\\)',
                     [('\\(x = \\dfrac{y - 2}{y - 3}\\)', 'ошибка со знаком при переносе.'), ('\\(x = \\dfrac{y + 2}{3 - y}\\)', 'ошибка со знаком в знаменателе.'),
                      ('\\(x = \\dfrac{y - 2}{3}\\)', 'забыли знаменатель x − 1.'), ('\\(x = \\dfrac{y + 2}{y + 3}\\)', 'ошибка со знаком.')],
                     'Умножьте на (x − 1) и соберите x с одной стороны.',
                     ['y(x − 1) = 3x + 2 → xy − y = 3x + 2.', 'xy − 3x = y + 2 → x(y − 3) = y + 2 → x = <span class="fr"><span>y + 2</span><span>y − 3</span></span>.'],
                     'Если x встречается дважды — выносите его за скобки.', sort=False)
    return build('M4.7', '<p>Make \\(t\\) the subject of \\(s = ut + 5t\\).</p>',
                 '\\(t = \\dfrac{s}{u + 5}\\)',
                 [('\\(t = \\dfrac{s - 5}{u}\\)', 'нельзя переносить 5 отдельно от t.'), ('\\(t = s - u - 5\\)', 'вычитали вместо деления.'),
                  ('\\(t = \\dfrac{s}{5u}\\)', 'перемножили u и 5.'), ('\\(t = \\dfrac{u + 5}{s}\\)', 'дробь перевёрнута.')],
                 'Вынесите t за скобки.', ['s = t(u + 5) → t = <span class="fr"><span>s</span><span>u + 5</span></span>.'],
                 'Два слагаемых с t — общий множитель.', sort=False)


@tpl('M4.8')
def identity(R):
    a, b = R.choice([(3, 2), (2, 5), (4, 1), (5, 3), (2, -3)])
    # (x + a)^2 - b == x^2 + px + q
    p, q = 2 * a, a * a - b
    return build('M4.8', '<p>Given that \\(x^2 + %dx + %d \\equiv (x + a)^2 + b\\) for all \\(x\\), find \\(b\\).</p>' % (p, q) if q >= 0 else
                 '<p>Given that \\(x^2 + %dx - %d \\equiv (x + a)^2 + b\\) for all \\(x\\), find \\(b\\).</p>' % (p, -q),
                 str(-b),
                 [(str(b), 'ошибка в знаке.'), (str(q), 'взяли свободный член без поправки.'), (str(q + a * a), 'прибавили a² вместо вычитания.'), (str(a), 'это a, а не b.')],
                 'Выделите полный квадрат: a = половина коэффициента при x.',
                 ['a = %d, (x + %d)² = x² + %dx + %d.' % (a, a, p, a * a), 'b = %d − %d = %d.' % (q, a * a, -b)],
                 'Сверяйте коэффициенты при одинаковых степенях.')


@tpl('M4.10')
def line_through(R):
    while True:
        x1, y1 = R.randint(-3, 3), R.randint(-4, 5)
        m = R.choice([2, 3, -2, -1, F(1, 2), -3])
        dx = R.choice([2, 4])
        x2, y2 = x1 + dx, y1 + m * dx
        c = y1 - m * x1
        if c.denominator == 1 if isinstance(c, F) else True:
            break
    c = F(y1) - F(m) * x1
    def eq(mm, cc):
        mm, cc = F(mm), F(cc)
        ms = ('' if mm == 1 else '-' if mm == -1 else (str(mm) if mm.denominator == 1 else '\\tfrac{%d}{%d}' % (mm.numerator, mm.denominator) if mm > 0 else '-\\tfrac{%d}{%d}' % (-mm.numerator, mm.denominator)))
        cs = '' if cc == 0 else (' + %s' % lx(cc).replace('dfrac', 'tfrac') if cc > 0 else ' - %s' % lx(-cc).replace('dfrac', 'tfrac'))
        return '\\(y = %sx%s\\)' % (ms, cs)
    return build('M4.10', '<p>Find the equation of the straight line through \\((%d, %d)\\) and \\((%d, %s)\\).</p>' % (x1, y1, x2, num(y2).replace('−', '-')),
                 eq(m, c),
                 [(eq(F(1) / F(m), F(y1) - F(x1) / F(m)), 'градиент перевёрнут (Δx/Δy).'), (eq(-F(m), F(y1) + F(m) * x1), 'ошибка в знаке градиента.'),
                  (eq(m, c + 2), 'ошибка при нахождении c.'), (eq(m, -c) if c != 0 else eq(m, 3), 'ошибка в знаке c.')],
                 'Градиент m = Δy/Δx, затем подставьте точку.',
                 ['m = %s.' % ru(num(F(m))), 'c = %d − %s·(%d) = %s.' % (y1, ru(num(F(m))), x1, ru(num(c)))],
                 'Проверьте вторую точку подстановкой.', sort=False)


@tpl('M4.10')
def perpendicular(R):
    m = R.choice([2, 3, F(1, 2), -4, F(2, 3), -F(1, 3)])
    p = -1 / F(m)
    return build('M4.10', '<p>Line L has gradient %s. Line M is perpendicular to L.</p><p>What is the gradient of M?</p>' % fr(m),
                 fr(p),
                 [(fr(F(m)), 'это параллельная прямая.'), (fr(-F(m)), 'поменяли только знак.'), (fr(1 / F(m)), 'перевернули, но не сменили знак.'),
                  (fr(F(m) * 2) if F(m) * 2 != p else fr(F(m) + 1), 'ошибка.')],
                 'Произведение градиентов перпендикулярных прямых = −1.',
                 ['m₂ = −1 : %s = %s.' % (frx(F(m)), frx(p))],
                 'Перевернуть и сменить знак.', sort=False)


@tpl('M4.11')
def quad_vertex(R):
    h, k = R.choice([(3, -4), (-2, 5), (1, -9), (4, 2), (-3, -1)])
    b, c = -2 * h, h * h + k
    return build('M4.11', '<p>What are the coordinates of the turning point of \\(y = %s\\)?</p>' % poly(1, b, c),
                 '(%d, %d)' % (h, k),
                 [('(%d, %d)' % (-h, k), 'знак у x в (x − h)² меняется.'), ('(%d, %d)' % (h, c), 'взяли свободный член как y.'),
                  ('(%d, %d)' % (-h, c), 'знак и свободный член.'), ('(%d, %d)' % (k, h), 'перепутали координаты.')],
                 'Выделите полный квадрат: y = (x − h)² + k.',
                 ['y = (x %s %d)² %s %d.' % ('−' if h > 0 else '+', abs(h), '+' if k >= 0 else '−', abs(k)), 'Вершина (%d; %d).' % (h, k)],
                 'x вершины = −b/2a.', sort=False)


@tpl('M4.11')
def quad_roots_graph(R):
    p, q = R.choice([(-1, 5), (2, 6), (-4, 2), (-3, 1), (1, 7)])
    b, c = -(p + q), p * q
    return build('M4.11', '<p>The curve \\(y = %s\\) crosses the x-axis at A and B.</p><p>What is the length AB?</p>' % poly(1, b, c),
                 str(q - p),
                 [(str(abs(p + q)), 'сложили корни.'), (str(abs(c)), 'взяли свободный член.'), (str(abs(b)), 'взяли коэффициент при x.'), (str(q - p + 2), 'ошибка в корнях.')],
                 'Найдите корни, расстояние = разность.',
                 ['x² %s = (x %s %d)(x %s %d) = 0 → x = %d или %d.' % (poly(1, b, c)[3:].replace('-', '−'), '−' if p >= 0 else '+', abs(p), '−' if q >= 0 else '+', abs(q), p, q), 'AB = %d − (%d) = %d.' % (q, p, q - p)],
                 'Длина отрезка всегда положительна.')


@tpl('M4.12')
def func_comp(R):
    a, b = R.choice([(2, 3), (3, -1), (4, 1), (2, -5)])
    c = R.choice([1, 2, -1])
    x = R.choice([2, 3, -1])
    g = x * x + c
    v = a * g + b
    gf = (a * x + b) ** 2 + c
    return build('M4.12', '<p>\\(f(x) = %dx %s %d\\) and \\(g(x) = x^2 %s %d\\).</p><p>Find \\(f(g(%d))\\).</p>' % (a, '+' if b >= 0 else '-', abs(b), '+' if c >= 0 else '-', abs(c), x),
                 str(v),
                 [(str(gf), 'это g(f(%d)) — порядок обратный.' % x), (str((a * x + b) * g), 'перемножили f и g.'), (str(a * x + b + g), 'сложили f и g.'), (str(v + a), 'ошибка в счёте.')],
                 'Сначала внутренняя функция g, потом f.',
                 ['g(%d) = %d.' % (x, g), 'f(%d) = %d·%d %s %d = %d.' % (g, a, g, '+' if b >= 0 else '−', abs(b), v)],
                 'f(g(x)): g действует первой.')


@tpl('M4.12')
def inverse_func(R):
    a, b = R.choice([(3, 2), (2, -5), (4, 1), (5, -3)])
    xv = F(R.choice([2, 3, 4, 5, 6]))
    y = int(a * xv + b)
    return build('M4.12', '<p>\\(f(x) = %dx %s %d\\).</p><p>Find \\(f^{-1}(%d)\\).</p>' % (a, '+' if b >= 0 else '-', abs(b), y),
                 num(xv),
                 [(num(F(a * y + b)), 'посчитали f(%d), а не обратную.' % y), (num(F(1, a * y + b)) if a * y + b else '0', 'обратная — не 1/f.'),
                  (num(F(y + b, a)), 'ошибка в знаке.'), (num(F(y, a) - b), 'порядок действий.')],
                 'f⁻¹(y) — это x, при котором f(x) = y.',
                 ['%dx %s %d = %d → x = %s.' % (a, '+' if b >= 0 else '−', abs(b), y, ru(num(xv)))],
                 'f⁻¹(x) ≠ 1/f(x).')


@tpl('M4.14')
def gradient_pts(R):
    x1, y1, x2, y2 = R.choice([(1, 3, 4, 12), (-2, 5, 2, -3), (0, -1, 3, 8), (2, 7, 6, 5), (-1, -4, 3, 4)])
    m = F(y2 - y1, x2 - x1)
    return build('M4.14', '<p>Find the gradient of the line joining \\((%d, %d)\\) and \\((%d, %d)\\).</p>' % (x1, y1, x2, y2),
                 fr(m),
                 [(fr(1 / m), 'Δx/Δy вместо Δy/Δx.'), (fr(-m), 'ошибка в знаке.'), (fr(F(y2 + y1, x2 + x1)) if x2 + x1 else fr(m * 2), 'сложили координаты.'), (fr(m * 2), 'ошибка.')],
                 'm = <span class="fr"><span>y₂ − y₁</span><span>x₂ − x₁</span></span>.',
                 ['(%s − %s) : (%s − %s) = %s.' % (pn(y2), pn(y1), pn(x2), pn(x1), frx(m))],
                 'Вычитайте в одном порядке сверху и снизу.', sort=False)


@tpl('M4.15')
def simultaneous(R):
    x, y = R.choice([(3, -1), (2, 4), (-2, 5), (4, 1), (5, -2), (1, 6)])
    a1, b1 = R.choice([(2, 3), (3, 2), (1, 4), (5, 1)])
    a2, b2 = R.choice([(1, -1), (4, -3), (3, -2), (2, -5)])
    c1, c2 = a1 * x + b1 * y, a2 * x + b2 * y
    def e(a, b, c):
        return '\\(%s %s %sy = %d\\)' % (('%dx' % a) if a != 1 else 'x', '+' if b > 0 else '-', '' if abs(b) == 1 else abs(b), c)
    return build('M4.15', '<p>Solve the simultaneous equations %s and %s.</p><p>What is \\(x + y\\)?</p>' % (e(a1, b1, c1), e(a2, b2, c2)),
                 str(x + y),
                 [(str(x - y), 'это x − y.'), (str(x * y), 'это xy.'), (str(-(x + y)), 'ошибка в знаке.'), (str(x + y + 2), 'ошибка при исключении.')],
                 'Исключите одну переменную сложением или вычитанием.',
                 ['Решение: x = %d, y = %d (проверьте подстановкой в оба уравнения).' % (x, y), 'x + y = %d.' % (x + y)],
                 'Подставьте ответ в оба уравнения.')


@tpl('M4.15')
def word_eq(R):
    p, q = R.choice([(450, 300), (600, 250), (350, 200), (500, 150)])
    a, b = R.choice([(3, 2), (2, 5), (4, 1), (1, 3)])
    c, d = R.choice([(1, 1), (2, 1), (1, 2)])
    if (a, b) == (c, d) or a * d - b * c == 0:
        return None
    t1, t2 = a * p + b * q, c * p + d * q
    pl = lambda k, w: '%d %s%s' % (k, w, '' if k == 1 else 's')
    return build('M4.15', '<p>%s and %s cost ₸%s. %s and %s cost ₸%s.</p><p>How much does one pen cost?</p>' % (pl(a, 'pen'), pl(b, 'notebook'), num(t1), pl(c, 'pen'), pl(d, 'notebook'), num(t2)),
                 '₸' + num(p),
                 [('₸' + num(q), 'это цена тетради.'), ('₸' + num(p + q), 'это ручка + тетрадь.'), ('₸' + num(F(t1, a + b)), 'средняя цена предмета.'), ('₸' + num(p - 50), 'ошибка при вычитании.')],
                 'Составьте систему: %dp + %dn = %d, %dp + %dn = %d.' % (a, b, t1, c, d, t2),
                 ['Уравняйте коэффициенты при n и вычтите.', 'p = %d, n = %d.' % (p, q)],
                 'Проверьте оба условия.')


@tpl('M4.16')
def quad_solve(R):
    r1 = R.choice([F(1, 2), F(-3, 2), F(1, 3), F(-2, 3), F(5, 2), F(-1, 2)])
    r2 = R.choice([2, -3, 4, -1, 3])
    a = r1.denominator
    B, C = int(-a * (r1 + r2)), int(a * r1 * r2)
    def pair(u, v):
        return '\\(x = %s\\) or \\(x = %s\\)' % (lx(u), lx(v))
    p = int(a * r1)
    return build('M4.16', '<p>Solve \\(%s = 0\\).</p>' % poly(a, B, C),
                 pair(r1, r2),
                 [(pair(u, v), r) for (u, v), r in [((-r1, -r2), 'знаки корней перепутаны.'), ((F(p), r2), 'забыли разделить на %d.' % a),
                                                     ((1 / r1, r2), 'дробь перевёрнута.'), ((r1, -r2), 'знак второго корня.'), ((-r1, r2), 'знак первого корня.')] if u != v],
                 'Разложите на множители.',
                 ['%s = (%dx %s %d)(x %s %d).' % (poly(a, B, C).replace('^{2}', '²'), a, '−' if p > 0 else '+', abs(p), '−' if r2 > 0 else '+', abs(r2)),
                  'x = %s или x = %s.' % (frx(r1), pn(r2) if r2 >= 0 else '−%d' % -r2)],
                 'Проверьте корни подстановкой.', sort=False)


@tpl('M4.16')
def discriminant(R):
    b, c = R.choice([(6, 9), (4, 5), (5, 6), (2, 7), (8, 16), (3, -4), (1, 1)])
    D = b * b - 4 * c
    n = 2 if D > 0 else 1 if D == 0 else 0
    words = {0: 'no real roots', 1: 'exactly one (repeated) root', 2: 'two distinct real roots'}
    return build('M4.16', '<p>How many real roots does \\(%s = 0\\) have?</p>' % poly(1, b, c),
                 words[n].capitalize(),
                 [(w.capitalize(), r) for w, r in [(words[k], 'D = %d.' % D) for k in (0, 1, 2) if k != n]] +
                 [('Infinitely many roots', 'у квадратного уравнения не больше двух корней.'), ('Three real roots', 'у квадратного уравнения не больше двух корней.')],
                 'Дискриминант D = b² − 4ac.',
                 ['D = %d² − 4·1·%d = %d.' % (b, c, D)],
                 'D > 0 — два, D = 0 — один, D < 0 — нет.', sort=False)


@tpl('M4.17')
def inequality(R):
    a, b, c = R.choice([(3, 4, 19), (-2, 5, -7), (5, -3, 12), (-4, 1, 13), (2, -7, 5)])
    # a x + b < c  (a may be negative)
    bound = F(c - b, a)
    if a > 0:
        right = 'x < %s' % num(bound)
        flip = 'x > %s' % num(bound)
    else:
        right = 'x > %s' % num(bound)
        flip = 'x < %s' % num(bound)
    def k(s):
        return '\\(' + s.replace('−', '-') + '\\)'
    return build('M4.17', '<p>Solve \\(%dx %s %d \\lt %d\\).</p>' % (a, '+' if b >= 0 else '-', abs(b), c),
                 k(right),
                 [(k(flip), 'знак неравенства меняется только при делении на отрицательное.' if a > 0 else 'при делении на отрицательное число знак меняется.'),
                  (k(('x < ' if a > 0 else 'x > ') + num(F(c + b, a))), 'перенесли %d без смены знака.' % b),
                  (k(('x < ' if a > 0 else 'x > ') + num(-bound)), 'ошибка в знаке.'), (k(('x \\le ' if a > 0 else 'x \\ge ') + num(bound)), 'неравенство строгое.')],
                 'Решайте как уравнение, но при делении на отрицательное меняйте знак.',
                 ['%dx < %d.' % (a, c - b), 'x %s %s.' % ('<' if a > 0 else '>', ru(num(bound)))],
                 'Деление на минус переворачивает знак.', sort=False)


@tpl('M4.18')
def nth_term(R):
    a, d = R.choice([(5, 3), (7, -2), (-4, 6), (11, 4), (2, 7)])
    seq = [a + d * i for i in range(4)]
    n = R.choice([20, 25, 40, 50])
    v = a + d * (n - 1)
    return build('M4.18', '<p>The sequence %s, … is arithmetic.</p><p>What is its %dth term?</p>' % (', '.join(str(s) for s in seq), n),
                 num(v),
                 [(num(a + d * n), 'взяли d·n вместо d·(n − 1).'), (num(d * n), 'забыли первый член.'), (num(a * n), 'умножили первый член на n.'), (num(v - d * 2), 'ошибка в счёте.')],
                 'aₙ = a₁ + (n − 1)d.',
                 ['a₁ = %d, d = %d.' % (a, d), '%d + %d·%d = %s.' % (a, n - 1, d, num(v))],
                 'Проверьте формулу на n = 1.')


@tpl('M4.19')
def nth_term_formula(R):
    a, d = R.choice([(5, 3), (7, -2), (-4, 6), (11, 4), (2, 7), (9, -3)])
    seq = [a + d * i for i in range(4)]
    c = a - d
    def f(dd, cc):
        return '\\(%dn %s %d\\)' % (dd, '+' if cc >= 0 else '-', abs(cc)) if cc else '\\(%dn\\)' % dd
    return build('M4.19', '<p>Find an expression for the nth term of %s, …</p>' % ', '.join(str(s) for s in seq),
                 f(d, c),
                 [(f(d, a), 'свободный член — это a₁ − d, а не a₁.'), (f(a, d), 'перепутали a и d.'), (f(-d, a + d), 'ошибка в знаке разности.'), (f(d, c + 1), 'ошибка.')],
                 'nth term = dn + (a₁ − d).',
                 ['d = %d, a₁ − d = %d.' % (d, c), 'Проверка n = 1: %d.' % a],
                 'Подставьте n = 1 и n = 2.', sort=False)


@tpl('M4.2')
def index_alg(R):
    a, p, b, q = R.choice([(6, 5, 3, 2), (12, 7, 4, 3), (10, 4, 5, -2), (8, 6, 2, 4), (15, 3, 5, -1)])
    k, e = F(a, b), p - q
    def t(kk, ee):
        return '\\(%s x^{%d}\\)' % (num(kk), ee)
    return build('M4.2', '<p>Simplify \\(\\dfrac{%dx^{%d}}{%dx^{%d}}\\).</p>' % (a, p, b, q),
                 t(k, e),
                 [(t(k, p + q), 'при делении показатели вычитают.'), (t(a - b, e), 'вычли коэффициенты.'), (t(k, F(p, q) if F(p, q).denominator == 1 else e + 1), 'разделили показатели.'), (t(k, -e), 'вычитали в обратном порядке.')],
                 'Коэффициенты делятся, показатели вычитаются.',
                 ['%d : %d = %s; %d − (%d) = %d.' % (a, b, ru(num(k)), p, q, e)],
                 'xᵃ / xᵇ = xᵃ⁻ᵇ.', sort=False)


@tpl('M4.4')
def common_factor(R):
    a, b, c = R.choice([(6, 9, 3), (8, 12, 4), (10, 15, 5), (14, 21, 7), (12, 18, 6)])
    return build('M4.4', '<p>Factorise fully \\(%dx^2y - %dxy^2\\).</p>' % (a, b),
                 '\\(%dxy(%dx - %dy)\\)' % (c, a // c, b // c),
                 [('\\(%dx(%dxy - %dy^2)\\)' % (c, a // c, b // c), 'вынесли не всё: y тоже общий.'), ('\\(xy(%dx - %dy)\\)' % (a, b), 'не вынесли число.'),
                  ('\\(%dxy(%dx + %dy)\\)' % (c, a // c, b // c), 'ошибка в знаке.'), ('\\(%dxy(%dx - %dy)\\)' % (c, b // c, a // c), 'перепутали коэффициенты.')],
                 'Общий множитель: НОД чисел и наименьшие степени букв.',
                 ['НОД(%d, %d) = %d, общие буквы xy.' % (a, b, c)],
                 '«Fully» — выносите всё общее.', sort=False)


# ================================================================ M5 geometry
@tpl('M5.2')
def polygon_angle(R):
    n = R.choice([5, 6, 8, 9, 10, 12, 15, 18, 20])
    ext = F(360, n)
    intr = 180 - ext
    return build('M5.2', '<p>What is the size of each interior angle of a regular polygon with %d sides?</p>' % n,
                 num(intr) + '°',
                 [(num(ext) + '°', 'это внешний угол.'), (num(F(180 * n, n)) + '°' if n > 2 else '90°', 'забыли вычесть 2: сумма = 180(n − 2).'),
                  (num(F(180 * (n - 2))) + '°', 'это сумма всех углов.'), (num(intr + 5) + '°', 'ошибка.')],
                 'Внешний угол = 360 : n.',
                 ['360 : %d = %s°.' % (n, ru(num(ext))), '180 − %s = %s°.' % (ru(num(ext)), ru(num(intr)))],
                 'Внутренний + внешний = 180°.')


@tpl('M5.2')
def polygon_sides(R):
    ext = R.choice([24, 30, 36, 40, 45, 20, 18])
    n = 360 // ext
    return build('M5.2', '<p>Each interior angle of a regular polygon is %d°.</p><p>How many sides does it have?</p>' % (180 - ext),
                 str(n),
                 [(str(n + 2), 'ошибка с формулой суммы.'), (str(n - 1), 'ошибка.'), (str(n + 1), 'ошибка: проверьте 360 : %d.' % ext), (str(n * 2), 'ошибка.')],
                 'Внешний угол = 180 − %d = %d°.' % (180 - ext, ext),
                 ['n = 360 : %d = %d.' % (ext, n)],
                 'Работайте через внешний угол — так быстрее.')


@tpl('M5.3')
def isosceles(R):
    apex = R.choice([40, 52, 68, 30, 110, 96])
    base = F(180 - apex, 2)
    return build('M5.3', '<p>In an isosceles triangle the angle between the two equal sides is %d°.</p><p>What is each of the other two angles?</p>' % apex,
                 num(base) + '°',
                 [(str(apex) + '°', 'равны углы при основании, а не этот.'), (str(180 - apex) + '°', 'забыли разделить на 2.'), (num(F(180 - 2 * apex)) + '°' if apex < 90 else '35°', 'считали, что равны два угла по %d°.' % apex), (num(F(apex, 2)) + '°', 'ошибка.')],
                 'Углы при основании равны.',
                 ['(180 − %d) : 2 = %s°.' % (apex, ru(num(base)))],
                 'Определите, какой угол «между равными сторонами».')


@tpl('M5.5')
def similar_trap(R):
    a, b, c = R.choice([(4, 6, 10), (3, 5, 12), (6, 9, 8), (5, 8, 15)])
    # DE parallel to BC, AD = a, DB = b, DE = c -> BC = c*(a+b)/a
    bc = F(c * (a + b), a)
    return build('M5.5', '<p>In triangle ABC, D is on AB and E is on AC with DE parallel to BC. AD = %d cm, DB = %d cm and DE = %d cm.</p><p>Find BC.</p>' % (a, b, c),
                 num(bc) + ' cm',
                 [(num(F(c * b, a)) + ' cm', 'взяли DB : AD вместо AB : AD.'), (num(F(c + b)) + ' cm', 'прибавили вместо умножения.'), (num(F(c * a, a + b)) + ' cm', 'коэффициент перевёрнут.'), (num(bc + 2) + ' cm', 'ошибка.')],
                 'Треугольники ADE и ABC подобны; AB = %d.' % (a + b),
                 ['k = %d : %d.' % (a + b, a), 'BC = %d · <span class="fr"><span>%d</span><span>%d</span></span> = %s см.' % (c, a + b, a, ru(num(bc)))],
                 'Сравнивайте со всей стороной AB, а не с DB.')


@tpl('M5.7')
def pyth(R):
    a, b, c = R.choice([(5, 12, 13), (8, 15, 17), (7, 24, 25), (9, 12, 15), (20, 21, 29), (12, 16, 20)])
    hyp = R.random() < 0.5
    if hyp:
        return build('M5.7', '<p>A rectangle is %d cm by %d cm.</p><p>How long is its diagonal?</p>' % (a, b),
                     '%d cm' % c,
                     [('%d cm' % (a + b), 'сложили стороны.'), ('%d cm' % (a * a + b * b), 'забыли извлечь корень.'), ('\\(\\sqrt{%d}\\) cm' % (b * b - a * a), 'вычли квадраты.'), ('%d cm' % (c + 1), 'ошибка.')],
                     'Диагональ — гипотенуза.', ['√(%d² + %d²) = √%d = %d см.' % (a, b, c * c, c)], 'Пифагоровы тройки: 3-4-5, 5-12-13, 8-15-17.', sort=False)
    return build('M5.7', '<p>A ladder %d m long leans against a wall. Its foot is %d m from the wall.</p><p>How high up the wall does it reach?</p>' % (c, a),
                 '%d m' % b,
                 [('\\(\\sqrt{%d}\\) m' % (c * c + a * a), 'сложили квадраты — но лестница и есть гипотенуза.'), ('%d m' % (c - a), 'вычли длины.'), ('%d m' % (c * c - a * a), 'забыли корень.'), ('%d m' % (b + 1), 'ошибка.')],
                 'Лестница — гипотенуза.', ['√(%d² − %d²) = √%d = %d м.' % (c, a, b * b, b)], 'Сначала найдите, какая сторона — гипотенуза.', sort=False)


@tpl('M5.7')
def distance_pts(R):
    x1, y1 = R.randint(-4, 3), R.randint(-4, 3)
    dx, dy, d = R.choice([(3, 4, 5), (6, 8, 10), (5, 12, 13), (8, 6, 10), (12, 5, 13)])
    x2, y2 = x1 + dx * R.choice([1, -1]), y1 + dy * R.choice([1, -1])
    return build('M5.7', '<p>Find the distance between \\((%d, %d)\\) and \\((%d, %d)\\).</p>' % (x1, y1, x2, y2),
                 str(d),
                 [(str(dx + dy), 'сложили разности.'), (str(d * d), 'забыли корень.'), (str(abs(abs(x2 + x1) + abs(y2 + y1))) if abs(x2 + x1) + abs(y2 + y1) not in (d,) else str(d + 3), 'сложили координаты.'), (str(d + 1), 'ошибка.')],
                 'd = √(Δx² + Δy²).',
                 ['Δx = %d, Δy = %d.' % (dx, dy), '√(%d + %d) = %d.' % (dx * dx, dy * dy, d)],
                 'Знак разности неважен — она в квадрате.')


@tpl('M5.18')
def trig_ratio(R):
    a, b, c = R.choice([(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25)])
    f = R.choice(['sin', 'cos', 'tan'])
    val = {'sin': F(a, c), 'cos': F(b, c), 'tan': F(a, b)}[f]
    others = {'sin': [F(b, c), F(a, b), F(c, a)], 'cos': [F(a, c), F(b, a), F(c, b)], 'tan': [F(b, a), F(a, c), F(b, c)]}[f]
    return build('M5.18', '<p>In a right-angled triangle the side opposite angle θ is %d cm, the side adjacent to θ is %d cm and the hypotenuse is %d cm.</p><p>What is \\(\\%s\\theta\\)?</p>' % (a, b, c, f),
                 fr(val),
                 [(fr(others[0]), 'перепутали стороны.'), (fr(others[1]), 'перепутали функцию.'), (fr(others[2]), 'дробь перевёрнута.'), (fr(F(a + b, c)) if F(a + b, c) != val else fr(F(c, a + b)), 'ошибка.')],
                 'SOH CAH TOA.',
                 ['%s θ = %s.' % (f, frx(val))],
                 'sin = противолежащий/гипотенуза, cos = прилежащий/гипотенуза, tan = противолежащий/прилежащий.', sort=False)


@tpl('M5.18')
def exact_trig(R):
    exprs = [('\\sin 30^\\circ + \\cos 60^\\circ', F(1), [F(1, 2), F(2), F(3, 2), F(0)]),
             ('\\tan 45^\\circ \\times \\sin 30^\\circ', F(1, 2), [F(1), F(1, 4), F(2), F(3, 2)]),
             ('2\\sin 30^\\circ - \\tan 45^\\circ', F(0), [F(1), F(-1), F(1, 2), F(2)]),
             ('\\cos 60^\\circ \\times 4', F(2), [F(1), F(4), F(1, 2), F(3)])]
    e, v, w = R.choice(exprs)
    return build('M5.18', '<p>Find the exact value of \\(%s\\).</p>' % e,
                 fr(v), [(fr(x), 'проверьте табличные значения: sin 30° = cos 60° = ½, tan 45° = 1.') for x in w],
                 'Табличные значения.', ['sin 30° = ½, cos 60° = ½, tan 45° = 1 → %s.' % frx(v)],
                 'Выучите таблицу для 30°, 45°, 60°.')


@tpl('M5.18')
def sine_rule(R):
    A, B = R.choice([(30, 90), (30, 150), (90, 30), (150, 30)])
    a = R.choice([4, 6, 8, 10])
    sinA = F(1, 2) if A in (30, 150) else F(1)
    sinB = F(1, 2) if B in (30, 150) else F(1)
    b = a * sinB / sinA
    return build('M5.18', '<p>In triangle ABC, angle A = %d°, angle B = %d° and BC = %d cm.</p><p>Find AC.</p>' % (A, B, a) if A + B < 180 else None,
                 num(b) + ' cm',
                 [(num(a * sinA / sinB) + ' cm', 'синусы стоят наоборот.'), (num(F(a * B, A)) + ' cm', 'делили углы, а не синусы.'), (num(F(a)) + ' cm', 'ошибка.') if b != a else (num(F(a + 1)) + ' cm', 'ошибка.'), (num(b * 2 + 1) + ' cm', 'ошибка.')],
                 'Теорема синусов: <span class="fr"><span>a</span><span>sin A</span></span> = <span class="fr"><span>b</span><span>sin B</span></span>.',
                 ['BC лежит против A, AC — против B.', 'AC = %d · sin %d° : sin %d° = %s см.' % (a, B, A, ru(num(b)))],
                 'Сторона и угол напротив неё — пара.') if A + B < 180 else None


@tpl('M5.18')
def cosine_rule(R):
    b, c, A, a2 = R.choice([(5, 8, 60, 49), (3, 8, 60, 49), (5, 3, 120, 49), (8, 5, 120, 129), (6, 10, 60, 76), (4, 6, 120, 76)])
    return build('M5.18', '<p>In triangle ABC, AB = %d cm, AC = %d cm and angle BAC = %d°.</p><p>Find BC.</p>' % (c, b, A),
                 ('%d cm' % math.isqrt(a2)) if math.isqrt(a2) ** 2 == a2 else '\\(\\sqrt{%d}\\) cm' % a2,
                 [('\\(\\sqrt{%d}\\) cm' % (b * b + c * c), 'забыли слагаемое −2bc·cos A.'),
                  (('%d cm' % math.isqrt(b * b + c * c - (a2 - b * b - c * c) * -1)) if False else '\\(\\sqrt{%d}\\) cm' % (2 * (b * b + c * c) - a2), 'ошибка в знаке cos A.'),
                  ('%d cm' % (b + c), 'сложили стороны.'), ('%d cm' % a2, 'забыли корень.')],
                 'Теорема косинусов: a² = b² + c² − 2bc·cos A.',
                 ['cos %d° = %s.' % (A, '½' if A == 60 else '−½'), 'BC² = %d + %d − 2·%d·%d·cos %d° = %d.' % (b * b, c * c, b, c, A, a2)],
                 'cos 120° отрицателен — слагаемое становится плюсом.', sort=False)


@tpl('M5.9')
def circle_thm(R):
    k = R.choice([0, 1, 2])
    x = R.choice([28, 34, 46, 52, 64, 38])
    if k == 0:
        return build('M5.9', '<p>A, B and C lie on a circle with centre O. Angle ACB = %d°.</p><p>What is angle AOB?</p>' % x,
                     '%d°' % (2 * x),
                     [('%d°' % x, 'центральный угол вдвое больше вписанного.'), ('%d°' % (180 - x), 'это для вписанного четырёхугольника.'), ('%d°' % (x // 2), 'наоборот: центральный в 2 раза больше.'), ('%d°' % (90 - x), 'ошибка.')],
                     'Центральный угол = 2 × вписанный на ту же дугу.', ['2 · %d = %d°.' % (x, 2 * x)], 'Оба угла должны опираться на одну дугу.')
    if k == 1:
        return build('M5.9', '<p>ABCD is a cyclic quadrilateral. Angle ABC = %d°.</p><p>What is angle ADC?</p>' % (90 + x),
                     '%d°' % (90 - x),
                     [('%d°' % (90 + x), 'противоположные углы в сумме 180°, а не равны.'), ('%d°' % (270 - x), 'вычли из 360.'), ('%d°' % (180 - 2 * x), 'ошибка.'), ('%d°' % (2 * (90 - x)), 'удвоили.')],
                     'Противоположные углы вписанного четырёхугольника: сумма 180°.', ['180 − %d = %d°.' % (90 + x, 90 - x)], 'Вершины должны лежать на окружности.')
    return build('M5.9', '<p>AB is a diameter of a circle and C is a point on the circle. Angle CAB = %d°.</p><p>What is angle CBA?</p>' % x,
                 '%d°' % (90 - x),
                 [('%d°' % x, 'углы не равны.'), ('%d°' % (180 - x), 'забыли прямой угол при C.'), ('%d°' % (2 * x), 'это центральный угол.'), ('%d°' % (90 + x), 'ошибка.')],
                 'Угол, опирающийся на диаметр, — 90°.', ['180 − 90 − %d = %d°.' % (x, 90 - x)], 'Видите диаметр — ищите прямой угол.')


@tpl('M5.14')
def prism_volume(R):
    b, h, l = R.choice([(6, 4, 10), (8, 5, 12), (10, 6, 9), (5, 12, 7), (9, 4, 15)])
    v = F(b * h, 2) * l
    return build('M5.14', '<p>A prism has a triangular cross-section with base %d cm and perpendicular height %d cm. The prism is %d cm long.</p><p>What is its volume?</p>' % (b, h, l),
                 num(v) + ' cm³',
                 [(num(F(b * h * l)) + ' cm³', 'площадь треугольника — половина bh.'), (num(F(b * h, 2)) + ' cm³', 'забыли длину.'), (num(F(b + h + l)) + ' cm³', 'сложили.'), (num(v / 3) + ' cm³', 'это для пирамиды.')],
                 'V = площадь сечения × длина.', ['½·%d·%d = %s.' % (b, h, num(F(b * h, 2))), '%s · %d = %s см³.' % (num(F(b * h, 2)), l, num(v))],
                 'Призма — без ⅓, пирамида — с ⅓.')


@tpl('M5.15')
def cylinder(R):
    r, h = R.choice([(3, 5), (4, 6), (5, 2), (2, 9), (6, 4)])
    return build('M5.15', '<p>A cylinder has radius %d cm and height %d cm.</p><p>What is its volume, in terms of \\(\\pi\\)?</p>' % (r, h),
                 '\\(%d\\pi\\) cm³' % (r * r * h),
                 [('\\(%d\\pi\\) cm³' % (2 * r * h), 'это площадь боковой поверхности.'), ('\\(%d\\pi\\) cm³' % (r * h), 'радиус не в квадрате.'), ('\\(%d\\pi\\) cm³' % ((2 * r) ** 2 * h), 'взяли диаметр вместо радиуса.'),
                  ('\\(%d\\pi\\) cm³' % (r * r * h // 3) if r * r * h % 3 == 0 else '\\(%d\\pi\\) cm³' % (r * r * h + h), 'это объём конуса.' if r * r * h % 3 == 0 else 'ошибка.')],
                 'V = πr²h.', ['π · %d · %d = %dπ см³.' % (r * r, h, r * r * h)],
                 'Радиус — половина диаметра.', sort=False)


@tpl('M5.15')
def sphere_cone(R):
    r = R.choice([3, 6])
    h = R.choice([4, 8, 10])
    vs = F(4, 3) * r ** 3
    vc = F(1, 3) * r * r * h
    if R.random() < 0.5:
        return build('M5.15', '<p>A sphere has radius %d cm.</p><p>What is its volume, in terms of \\(\\pi\\)?</p>' % r,
                     '\\(%s\\pi\\) cm³' % num(vs),
                     [('\\(%s\\pi\\) cm³' % num(F(4 * r * r)), 'это площадь поверхности.'), ('\\(%s\\pi\\) cm³' % num(F(r ** 3)), 'без 4/3.'), ('\\(%s\\pi\\) cm³' % num(F(4, 3) * (2 * r) ** 3), 'взяли диаметр.'), ('\\(%s\\pi\\) cm³' % num(F(2, 3) * r ** 3), 'ошибка в коэффициенте.')],
                     'V = <span class="fr"><span>4</span><span>3</span></span>πr³.', ['<span class="fr"><span>4</span><span>3</span></span> · %d = %s → %sπ.' % (r ** 3, num(vs), num(vs))],
                     'Объём — r³, поверхность — r².', sort=False)
    return build('M5.15', '<p>A cone has base radius %d cm and perpendicular height %d cm.</p><p>What is its volume, in terms of \\(\\pi\\)?</p>' % (r, h),
                 '\\(%s\\pi\\) cm³' % num(vc),
                 [('\\(%s\\pi\\) cm³' % num(F(r * r * h)), 'забыли ⅓.'), ('\\(%s\\pi\\) cm³' % num(F(r * h, 3)), 'радиус не в квадрате.'), ('\\(%s\\pi\\) cm³' % num(F(r * r * h, 2)), '½ вместо ⅓.'), ('\\(%s\\pi\\) cm³' % num(vc * 4), 'взяли диаметр.')],
                 'V = ⅓πr²h.', ['⅓ · %d · %d = %s → %sπ.' % (r * r, h, num(vc), num(vc))],
                 'Конус = ⅓ цилиндра.', sort=False)


@tpl('M5.16')
def sector(R):
    r, ang = R.choice([(6, 60), (9, 40), (12, 30), (10, 72), (8, 45), (6, 120)])
    arc = F(ang, 360) * 2 * r
    area = F(ang, 360) * r * r
    if R.random() < 0.5:
        return build('M5.16', '<p>A sector has radius %d cm and angle %d°.</p><p>What is its arc length, in terms of \\(\\pi\\)?</p>' % (r, ang),
                     '\\(%s\\pi\\) cm' % num(arc),
                     [('\\(%s\\pi\\) cm' % num(area), 'это площадь сектора.'), ('\\(%s\\pi\\) cm' % num(arc / 2), 'взяли πr вместо 2πr.'), ('\\(%s\\pi\\) cm' % num(arc * 2), 'ошибка.'), ('\\(%s\\pi\\) cm' % num(F(ang, 180) * r * 2 + 1), 'ошибка.')],
                     'Длина дуги = <span class="fr"><span>θ</span><span>360</span></span> · 2πr.', ['<span class="fr"><span>%d</span><span>360</span></span> · %dπ = %sπ см.' % (ang, 2 * r, ru(num(arc)))],
                     'Дуга — от длины окружности, сектор — от площади круга.', sort=False)
    return build('M5.16', '<p>A sector has radius %d cm and angle %d°.</p><p>What is its area, in terms of \\(\\pi\\)?</p>' % (r, ang),
                 '\\(%s\\pi\\) cm²' % num(area),
                 [('\\(%s\\pi\\) cm²' % num(arc), 'это длина дуги.'), ('\\(%s\\pi\\) cm²' % num(F(r * r)), 'это площадь круга.'), ('\\(%s\\pi\\) cm²' % num(area * 2), 'ошибка.'), ('\\(%s\\pi\\) cm²' % num(F(ang, 360) * r), 'радиус не в квадрате.')],
                 'Площадь сектора = <span class="fr"><span>θ</span><span>360</span></span> · πr².', ['<span class="fr"><span>%d</span><span>360</span></span> · %dπ = %sπ см².' % (ang, r * r, ru(num(area)))],
                 'Дуга — от длины окружности, сектор — от площади круга.', sort=False)


@tpl('M5.13')
def bearing_back(R):
    b = R.choice([35, 72, 118, 164, 205, 248, 296, 330])
    back = (b + 180) % 360
    def f(v):
        return '%03d°' % (v % 360)
    return build('M5.13', '<p>The bearing of Q from P is %s.</p><p>What is the bearing of P from Q?</p>' % f(b),
                 f(back),
                 [(f(360 - b), 'вычли из 360 — это отражение, а не обратный азимут.'), (f(b), 'направление то же.'), (f(back + 90), 'ошибка.'), (f(180 - b) if b < 180 else f(b - 90), 'ошибка.')],
                 'Обратный азимут = исходный ± 180°.', ['%s %s 180 = %s.' % (f(b), '+' if b < 180 else '−', f(back))],
                 'Ответ всегда тремя цифрами.', sort=False)


@tpl('M5.6')
def reflect_line(R):
    x, y = R.choice([(3, 1), (2, -5), (-4, 2), (5, 3), (-1, -6)])
    k = R.choice([1, 2, -1, 3])
    if k in (x, y):
        return None
    if R.random() < 0.5:
        ans = (2 * k - x, y)
        txt = 'x = %d' % k
        wr = [((x, 2 * k - y), 'отразили в y = %d.' % k), ((-x, y), 'отразили в оси y.'), ((2 * k + x, y), 'ошибка.'), ((x, -y), 'отразили в оси x.')]
        step = 'Расстояние до прямой x = %d сохраняется: x\' = 2·%d − %d = %d.' % (k, k, x, 2 * k - x)
    else:
        ans = (x, 2 * k - y)
        txt = 'y = %d' % k
        wr = [((2 * k - x, y), 'отразили в x = %d.' % k), ((x, -y), 'отразили в оси x.'), ((x, 2 * k + y), 'ошибка.'), ((-x, y), 'отразили в оси y.')]
        step = 'y\' = 2·%d − (%d) = %d.' % (k, y, 2 * k - y)
    P = lambda p: '(%d, %d)' % p
    return build('M5.6', '<p>The point %s is reflected in the line \\(%s\\).</p><p>What are the coordinates of the image?</p>' % (P((x, y)), txt),
                 P(ans), [(P(a), r) for a, r in wr], 'Точка и образ на одинаковом расстоянии от прямой.', [step], 'Нарисуйте прямую — так ошибиться сложнее.', sort=False)


@tpl('M5.19')
def vec_mag(R):
    a, b = R.choice([(2, 1), (-1, 3), (4, -2), (3, 2)])
    c, d = R.choice([(1, 3), (2, -5), (-1, 2), (0, 4)])
    k = R.choice([2, 3])
    x, y = k * a + c, k * b + d
    m2 = x * x + y * y
    def mag(v):
        s = math.isqrt(v)
        return str(s) if s * s == v else '\\(\\sqrt{%d}\\)' % v
    V = lambda p, q: '\\(\\begin{pmatrix}%d\\\\%d\\end{pmatrix}\\)' % (p, q)
    return build('M5.19', '<p>\\(\\mathbf{a} = %s\\) and \\(\\mathbf{b} = %s\\).</p><p>Find \\(|%d\\mathbf{a} + \\mathbf{b}|\\).</p>' % (V(a, b)[2:-2], V(c, d)[2:-2], k),
                 mag(m2),
                 [(mag(x * x - y * y) if x * x - y * y > 0 else mag(m2 + 2), 'вычли квадраты.'), (str(abs(x) + abs(y)), 'сложили компоненты.'), (mag((a + c) ** 2 + (b + d) ** 2), 'забыли умножить a на %d.' % k), (str(m2), 'забыли корень.')],
                 'Сначала вектор, потом длина √(x² + y²).',
                 ['%da + b = (%d; %d).' % (k, x, y), '√(%d + %d) = √%d.' % (x * x, y * y, m2)],
                 'Длина вектора — теорема Пифагора.', sort=False)


@tpl('M5.10')
def midpoint(R):
    x1, y1, x2, y2 = R.choice([(2, 7, 8, -3), (-4, 1, 6, 5), (3, -2, -5, 8), (1, 1, 7, 9), (-6, 4, 2, -8)])
    M = (F(x1 + x2, 2), F(y1 + y2, 2))
    P = lambda p: '(%s, %s)' % (num(p[0]), num(p[1]))
    return build('M5.10', '<p>Find the midpoint of the line segment joining \\((%d, %d)\\) and \\((%d, %d)\\).</p>' % (x1, y1, x2, y2),
                 P(M),
                 [(P((F(x2 - x1, 2), F(y2 - y1, 2))), 'вычли вместо сложения.'), (P((F(x1 + x2), F(y1 + y2))), 'забыли разделить на 2.'), (P((M[1], M[0])), 'перепутали координаты.'), (P((F(x1 + y1, 2), F(x2 + y2, 2))), 'сложили координаты одной точки.')],
                 'Середина — среднее координат.', ['((%d + %d)/2; (%d + %d)/2) = (%s; %s).' % (x1, x2, y1, y2, ru(num(M[0])), ru(num(M[1])))],
                 'Складывайте x с x, y с y.', sort=False)


@tpl('M5.10')
def circle_eq(R):
    a, b, r = R.choice([(2, -3, 5), (-1, 4, 3), (3, 1, 4), (0, -2, 6), (-4, -1, 2)])
    def s(v, var):
        return var if v == 0 else '(%s %s %d)' % (var, '-' if v > 0 else '+', abs(v))
    return build('M5.10', '<p>A circle has equation \\(%s^2 + %s^2 = %d\\).</p><p>What are its centre and radius?</p>' % (s(a, 'x'), s(b, 'y'), r * r),
                 'centre (%d, %d), radius %d' % (a, b, r),
                 [('centre (%d, %d), radius %d' % (-a, -b, r), 'знаки в скобках меняются.'), ('centre (%d, %d), radius %d' % (a, b, r * r), 'радиус — корень из правой части.'),
                  ('centre (%d, %d), radius %d' % (-a, -b, r * r), 'знаки и корень.'), ('centre (%d, %d), radius %d' % (b, a, r), 'перепутали координаты.')],
                 '(x − a)² + (y − b)² = r²: центр (a; b), радиус r.', ['Центр (%d; %d), r = √%d = %d.' % (a, b, r * r, r)],
                 'Минус в скобке — плюс в координате и наоборот.', sort=False)


@tpl('M5.11')
def euler(R):
    shape = R.choice([('a hexagonal prism', 8, 18, 12), ('a pentagonal pyramid', 6, 10, 6), ('a triangular prism', 5, 9, 6), ('an octagonal pyramid', 9, 16, 9), ('a pentagonal prism', 7, 15, 10)])
    name, f, e, v = shape
    return build('M5.11', '<p>How many edges does %s have?</p>' % name,
                 str(e),
                 [(str(f), 'это число граней.'), (str(v), 'это число вершин.'), (str(e + 2), 'ошибка.'), (str(e - 3) if e - 3 not in (f, v) else str(e + 4), 'ошибка.')],
                 'Призма с n-угольным основанием: 3n рёбер; пирамида: 2n.',
                 ['Проверка по Эйлеру: V − E + F = %d − %d + %d = 2.' % (v, e, f)],
                 'F + V = E + 2.')


@tpl('M5.17')
def sim_volume(R):
    a, b = R.choice([(1, 2), (2, 3), (3, 4), (1, 3)])
    m = R.choice([16, 54, 24, 40]) * a ** 3
    big = F(m * b ** 3, a ** 3)
    return build('M5.17', '<p>Two similar solid statues are made of the same metal. Their heights are in the ratio %d : %d. The smaller has mass %d g.</p><p>What is the mass of the larger?</p>' % (a, b, m),
                 num(big) + ' g',
                 [(num(F(m * b, a)) + ' g', 'масса пропорциональна объёму — k³, а не k.'), (num(F(m * b * b, a * a)) + ' g', 'k² — это для площади.'), (num(big + m) + ' g', 'ошибка.'), (num(big * 2) + ' g', 'ошибка.')],
                 'Масса ∝ объём ∝ k³.', ['k³ = (%d/%d)³ = %s.' % (b, a, frx(F(b ** 3, a ** 3))), '%d · %s = %s г.' % (m, frx(F(b ** 3, a ** 3)), num(big))],
                 'Один материал — масса растёт как объём.')


@tpl('M2.10')
def fraction_problem(R):
    a, b = R.choice([(F(2, 5), F(1, 3)), (F(1, 4), F(2, 3)), (F(3, 8), F(1, 5)), (F(1, 3), F(1, 2))])
    left = R.choice([12, 18, 24, 30])
    rem = (1 - a) * (1 - b)
    total = F(left) / rem
    if total.denominator != 1:
        return None
    return build('M2.10', '<p>Arman spends %s of his money on a game and %s of what is left on lunch. He has ₸%s left.</p><p>How much did he start with?</p>' % (fr(a), fr(b), num(left * 100)),
                 '₸' + num(total * 100),
                 [('₸' + num(F(left * 100) / (1 - a - b)) if (1 - a - b) > 0 else '₸' + num(total * 50), 'взяли дробь от всех денег, а не от остатка.'), ('₸' + num(F(left * 100) / (1 - a)), 'забыли про обед.'),
                  ('₸' + num(F(left * 100) * (1 + a + b)), 'прибавили доли.'), ('₸' + num(total * 100 + 600), 'ошибка.')],
                 'Остаток = (1 − %s)(1 − %s) от начальной суммы = %s.' % (frx(a), frx(b), frx(rem)),
                 ['%s : %s = %s.' % (num(left * 100), frx(rem), num(total * 100))],
                 'Работайте с остатками, а не с потраченным.')


@tpl('M2.5')
def listing(R):
    k = R.choice([0, 1])
    if k == 0:
        d = R.choice([(1, 2, 3, 4), (2, 5, 7, 9), (1, 3, 5, 8)])
        cnt = 4 * 3 * 2
        return build('M2.5', '<p>How many different three-digit numbers can be made from the digits %s if no digit is used more than once?</p>' % ', '.join(map(str, d)),
                     str(cnt), [(str(4 * 4 * 4), 'цифры можно было повторять.'), (str(4), 'это число наборов, а не порядков.'), (str(12), 'двузначные числа.'), (str(4 * 3 * 2 * 1 // 2), 'ошибка.')],
                     'Перебор по разрядам.', ['4 · 3 · 2 = 24.'], 'Порядок важен — это разные числа.')
    t = R.choice([20, 25, 30])
    sols = [(a, b) for a in range(0, t // 2 + 1) for b in range(0, t // 5 + 1) if 2 * a + 5 * b == t]
    return build('M2.5', '<p>In how many ways can ₸%d be paid exactly using only ₸2 and ₸5 coins?</p>' % t,
                 str(len(sols)), [(str(len(sols) + 1), 'посчитали лишний вариант.'), (str(len(sols) - 1) if len(sols) > 1 else '5', 'пропустили вариант.'), (str(t // 5 + 1), 'перебрали все пятёрки без проверки чётности.'), (str(len(sols) + 2), 'ошибка.')],
                 'Перебирайте число пятёрок; остаток должен делиться на 2.',
                 ['Варианты (двушки; пятёрки): ' + ', '.join('(%d; %d)' % s for s in sols) + '.'],
                 'Систематический перебор — по одной переменной.')


@tpl('M2.4')
def think_number(R):
    a, b, c = R.choice([(3, 7, 2), (5, 4, 3), (4, 9, 2), (2, 11, 5)])
    x = R.choice([6, 8, 9, 12, 15])
    res = (x * a - b) // c if (x * a - b) % c == 0 else None
    if res is None:
        return None
    return build('M2.4', '<p>I think of a number, multiply it by %d, subtract %d, then divide by %d. The answer is %d.</p><p>What was my number?</p>' % (a, b, c, res),
                 str(x),
                 [(str((res * c - b) // a) if (res * c - b) % a == 0 else str(x - 2), 'при обратном ходе нужно прибавить %d.' % b), (str((res + b) * c // a) if ((res + b) * c) % a == 0 else str(x + 2), 'нарушили порядок обратных действий.'),
                  (str(res * c), 'не довели обратный ход до конца.'), (str(x + 1), 'ошибка.')],
                 'Обратные действия в обратном порядке.', ['%d · %d = %d, + %d = %d, : %d = %d.' % (res, c, res * c, b, res * c + b, a, x)],
                 'Последнее действие отменяется первым.')


@tpl('M2.1')
def inequality_symbols(R):
    pairs = [(F(3, 7), F(4, 9)), (F(5, 8), F(7, 11)), (F(-2, 3), F(-3, 4)), (F(5, 6), F(9, 11))]
    a, b = R.choice(pairs)
    sym = '<' if a < b else '>'
    return build('M2.1', '<p>Which symbol makes this statement true?</p><p>\\(%s \\;\\square\\; %s\\)</p>' % (lx(a), lx(b)),
                 sym, [('>' if sym == '<' else '<', 'сравните через общий знаменатель.'), ('=', 'дроби не равны.'), ('≥', 'дроби не равны, нужен строгий знак.'), ('≤', 'дроби не равны, нужен строгий знак.')],
                 'Сравните перекрёстным умножением.',
                 ['%d · %d = %d и %d · %d = %d.' % (a.numerator, b.denominator, a.numerator * b.denominator, b.numerator, a.denominator, b.numerator * a.denominator)],
                 'У отрицательных: больше по модулю — меньше.', sort=False)


# ---------------------------------------------------------------- generate pool
def make_pool():
    pool = {}
    seen = set()
    for topic, f in T:
        got, tries = [], 0
        while len(got) < 14 and tries < 400:
            tries += 1
            try:
                q = f(R)
            except (ZeroDivisionError, ValueError):
                q = None
            if not q or q['text'] in seen:
                continue
            seen.add(q['text'])
            got.append(q)
        pool.setdefault(topic, []).extend((f.__name__, q) for q in got)
    return pool


def check(q):
    assert len(q['options']) == 5 and len(set(q['options'])) == 5, q
    assert 0 <= q['correct'] < 5
    assert 'Ответ: <b>%s</b>' % L[q['correct']] in q['explain']


ONLY = {'mix-9': 'M5'}   # themed tests: Test 9 is geometry only


def main(write):
    s = open('tests.js', encoding='utf-8').read()
    head, arr, tail = s[:s.index('[')], s[s.index('['):s.rindex(']') + 1], s[s.rindex(']') + 1:]
    tests = json.loads(arr)
    pool = make_pool()
    for t in pool.values():
        R.shuffle(t)
    print('pool:', sum(len(v) for v in pool.values()), 'questions,', len(pool), 'topics,', len(T), 'templates')
    used_tpl_global = Counter()
    total = 0
    for t in tests:
        if t['kind'] != 'math' or t['q'] >= 30:
            continue
        page = t['id'] + '.html'
        html = open(page, encoding='utf-8').read()
        m = QRE.search(html)
        qs = json.loads(m.group(1))
        if len(qs) != t['q']:
            print('  note', page, 'page has', len(qs), 'catalog says', t['q'])
        need = 30 - len(qs)
        if need <= 0:
            continue
        have = Counter(q.get('topic') for q in qs)
        added, used_tpl = [], set()
        # topics least present in this test first; spread templates across the site
        allowed = [tp for tp in pool if tp.startswith(ONLY.get(t['id'], 'M'))]
        order = sorted(allowed, key=lambda tp: (have[tp], used_tpl_global[tp], R.random()))
        i = 0
        while len(added) < need:
            tp = order[i % len(order)]
            i += 1
            cands = [x for x in pool[tp] if x[0] not in used_tpl]
            if not cands:
                if i > 10 * len(order):
                    used_tpl = set()
                continue
            name, q = cands[0]
            pool[tp].remove(cands[0])
            used_tpl.add(name)
            used_tpl_global[tp] += 1
            added.append(q)
        nid = max([q['id'] for q in qs if isinstance(q.get('id'), int)] + [30]) + 1
        for q in added:
            check(q)
            q = dict(q)
            q['id'] = nid
            nid += 1
            qs.append({k: q[k] for k in ('id', 'topic', 'text', 'image', 'options', 'correct', 'explain', 'src')})
        total += len(added)
        print('  %-8s %2d -> %d  (+%d: %s)' % (t['id'], t['q'], len(qs), len(added), ', '.join(q['topic'] for q in added)))
        if write:
            body = json.dumps(qs, ensure_ascii=False)
            html = QRE.sub(lambda _: 'const questions = ' + body + ';', html, count=1)
            html = re.sub(r'\((\d+) questions\)</h2>', '(%d questions)</h2>' % len(qs), html, count=1)
            open(page, 'w', encoding='utf-8').write(html)
            t['q'] = len(qs)
            if '+ Prepline' not in t['src']:
                t['src'] += ' · + %d Prepline question%s' % (len(added), '' if len(added) == 1 else 's')
    print('added', total)
    if write:
        open('tests.js', 'w', encoding='utf-8').write(head + json.dumps(tests, ensure_ascii=False, indent=0) + tail)


if __name__ == '__main__':
    main('--write' in sys.argv)
