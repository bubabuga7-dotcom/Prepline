/* Prepline: problems that need a formula from the Formula quiz.
   PREPLINE_PROB[name]() -> { q: question, a: right answer, w: [3 wrong answers], s: [solution steps] }
   Answers use the quiz notation: {top|bottom} fraction, sqrt{…}, ^{…}. Wrong answers come from the usual slips. */
(function () {
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
  function fr(n, d) {                       // reduced fraction in quiz notation
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d); n /= g; d /= g;
    if (d === 1) return mn(n);
    return (n < 0 ? '−' : '') + '{' + Math.abs(n) + '|' + d + '}';
  }
  function mn(x) { return String(x).replace('-', '−'); }
  function num(x) { var r = Math.round(x * 100) / 100; return mn(r); }
  function pi(k) { return (k === 1 ? '' : k === -1 ? '−' : mn(k)) + 'π'; }
  function th(x) { return mn(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function v(x) { return '<i>' + x + '</i>'; }
  function sq(x) { return x < 0 ? '(' + mn(x) + ')' : mn(x); }
  function quad(a, b, c) {                  // ax² + bx + c as text
    var t = (a === 1 ? '' : mn(a)) + 'x²';
    if (b) t += (b < 0 ? ' − ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x';
    if (c) t += (c < 0 ? ' − ' : ' + ') + Math.abs(c);
    return t;
  }

  var P = {};

  /* ---------------- Algebra ---------------- */
  P['Solutions of ax² + bx + c = 0'] = function () {
    var p = ri(-6, 6), q = ri(-6, 6); if (p === q || p === -q || !p || !q) return null;
    var b = -(p + q), c = p * q;
    var e = quad(1, b, c);
    var lo = Math.min(p, q), hi = Math.max(p, q);
    var s = function (u, w) { return 'x = ' + mn(Math.min(u, w)) + ' or x = ' + mn(Math.max(u, w)); };
    return { q: 'Solve ' + e + ' = 0.', a: s(lo, hi), w: [s(-lo, -hi), s(2 * lo, 2 * hi), s(lo, -hi)],
      s: ['a = 1, b = ' + mn(b) + ', c = ' + mn(c) + '; Δ = ' + sq(b) + '² − 4·' + sq(c) + ' = ' + (b * b - 4 * c) + '.',
          'x = (' + mn(-b) + ' ± ' + Math.abs(hi - lo) + ') : 2 → ' + mn(lo) + ' и ' + mn(hi) + '.'] };
  };
  P['Discriminant of ax² + bx + c'] = function () {
    var a = ri(1, 4), b = ri(-7, 7), c = ri(-6, 6); if (!c || !b) return null;
    var d = b * b - 4 * a * c;
    return { q: 'Find the discriminant of ' + quad(a, b, c) + '.',
      a: mn(d), w: [mn(b * b + 4 * a * c), mn(4 * a * c - b * b), mn(b - 4 * a * c)],
      s: ['Δ = b² − 4ac = ' + sq(b) + '² − 4·' + a + '·' + sq(c) + ' = ' + (b * b) + ' − ' + sq(4 * a * c) + ' = ' + mn(d) + '.'] };
  };
  P['x-coordinate of the vertex of y = ax² + bx + c'] = function () {
    var a = ri(1, 3), h = ri(-5, 5); if (!h) return null;
    var b = -2 * a * h, c = ri(-9, 9);
    return { q: 'Find the x-coordinate of the turning point of y = ' + quad(a, b, c) + '.',
      a: mn(h), w: [mn(-h), mn(2 * h), fr(2 * a, -b)],
      s: ['x = −b / 2a = ' + mn(-b) + ' : ' + (2 * a) + ' = ' + mn(h) + '.'] };
  };
  P['Sum of the roots of ax² + bx + c = 0'] = function () {
    var a = ri(2, 5), b = ri(-9, 9), c = ri(-9, 9); if (!b || !c || Math.abs(b) === Math.abs(c)) return null;
    if (b * b - 4 * a * c <= 0) return null;
    return { q: 'The equation ' + quad(a, b, c) + ' = 0 has two real roots. What is their sum?',
      a: fr(-b, a), w: [fr(b, a), fr(c, a), fr(-c, a)], s: ['По Виету сумма = −b/a = ' + mn(-b) + '/' + a + ' = ' + fr(-b, a) + '.'] };
  };
  P['Product of the roots of ax² + bx + c = 0'] = function () {
    var a = ri(2, 5), b = ri(-9, 9), c = ri(-9, -1); if (!b || Math.abs(b) === Math.abs(c)) return null;
    return { q: 'What is the product of the roots of ' + quad(a, b, c) + ' = 0?',
      a: fr(c, a), w: [fr(-c, a), fr(-b, a), fr(a, c)], s: ['По Виету произведение = c/a = ' + mn(c) + '/' + a + ' = ' + fr(c, a) + '.'] };
  };
  P['Difference of two squares'] = function () {
    var m = pick([50, 100, 40, 30]), d = ri(1, 4), a = m + d, b = m - d;
    return { q: 'Work out ' + a + '² − ' + b + '² without a calculator.', a: th((a - b) * (a + b)), w: [th((a - b) * (a - b)), th((a + b) * (a + b)), th(a - b)],
      s: ['a² − b² = (a − b)(a + b) = ' + (a - b) + ' · ' + (a + b) + ' = ' + th((a - b) * (a + b)) + '.'] };
  };
  P['Square of a sum'] = function () {
    var x = ri(1, 6), y = ri(x + 1, 9), s = x + y, p = x * y;
    return { q: 'a + b = ' + s + ' and ab = ' + p + '. Find a² + b².', a: mn(s * s - 2 * p), w: [mn(s * s), mn(s * s - p), mn(s * s + 2 * p)],
      s: ['(a + b)² = a² + 2ab + b², значит a² + b² = (a + b)² − 2ab.', s + '² − 2·' + p + ' = ' + (s * s - 2 * p) + '.'] };
  };
  P['Square of a difference'] = function () {
    var x = ri(1, 6), y = ri(x + 1, 10), d = y - x, p = x * y;
    return { q: 'a − b = ' + d + ' and ab = ' + p + '. Find a² + b².', a: mn(d * d + 2 * p), w: [mn(d * d), mn(d * d - 2 * p), mn(d * d + p)],
      s: ['(a − b)² = a² − 2ab + b², значит a² + b² = (a − b)² + 2ab.', d + '² + 2·' + p + ' = ' + (d * d + 2 * p) + '.'] };
  };
  P['Cube of a sum'] = function () {
    var k = ri(2, 5);
    return { q: 'What is the coefficient of x in the expansion of (x + ' + k + ')³?', a: mn(3 * k * k), w: [mn(k * k), mn(3 * k), mn(k * k * k)],
      s: ['(a + b)³ = a³ + 3a²b + 3ab² + b³; член с x — это 3ab² = 3·x·' + k + '².', '3·' + (k * k) + ' = ' + (3 * k * k) + '.'] };
  };
  P['Multiplying powers'] = function () {
    var b = pick([2, 3, 5, 7]), m = ri(2, 9), n = ri(2, 9);
    return { q: b + '^{' + m + '} × ' + b + '^{' + n + '} = ' + b + '^{k}. Find k.', a: mn(m + n), w: [mn(m * n), mn(m - n), mn(Math.max(m, n))],
      s: ['При умножении показатели складываются: ' + m + ' + ' + n + ' = ' + (m + n) + '.'] };
  };
  P['Dividing powers'] = function () {
    var b = pick([2, 3, 5, 10]), m = ri(8, 15), n = ri(2, 7);
    return { q: b + '^{' + m + '} ÷ ' + b + '^{' + n + '} = ' + b + '^{k}. Find k.', a: mn(m - n), w: [mn(m + n), fr(m, n), mn(n - m)],
      s: ['При делении показатели вычитаются: ' + m + ' − ' + n + ' = ' + (m - n) + '.'] };
  };
  P['Power of a power'] = function () {
    var b = pick([2, 3, 5]), m = ri(2, 5), n = ri(2, 5); if (m === n) return null;
    return { q: '(' + b + '^{' + m + '})^{' + n + '} = ' + b + '^{k}. Find k.', a: mn(m * n), w: [mn(m + n), mn(Math.pow(m, n)), mn(m - n)],
      s: ['Степень степени: показатели перемножаются, ' + m + ' · ' + n + ' = ' + (m * n) + '.'] };
  };
  P['Negative power'] = function () {
    var b = pick([2, 3, 4, 5, 10]), n = b === 10 ? ri(2, 3) : ri(2, 3), p = Math.pow(b, n);
    return { q: 'Evaluate ' + b + '^{−' + n + '}.', a: fr(1, p), w: [mn(-p), '−' + fr(1, p), fr(1, b * n)],
      s: ['a^{−n} = 1/aⁿ: ' + b + '^{' + n + '} = ' + p + ', ответ 1/' + p + '.'] };
  };
  P['Fractional power'] = function () {
    var c = pick([[8, 3, 2, 4], [27, 3, 2, 9], [16, 4, 3, 8], [125, 3, 2, 25], [32, 5, 3, 8], [64, 3, 2, 16]]);
    var r = Math.round(Math.pow(c[0], 1 / c[1]));
    return { q: 'Evaluate ' + c[0] + '^{' + c[2] + '/' + c[1] + '}.', a: mn(c[3]), w: [fr(1, c[3]), mn(r * c[2]), mn(c[0] * c[2] / c[1] % 1 ? c[3] * r : c[0] * c[2] / c[1])],
      s: ['Знаменатель — корень: ' + (c[1] === 2 ? '√' : '<sup>' + c[1] + '</sup>√') + c[0] + ' = ' + r + '.', 'Числитель — степень: ' + r + '^{' + c[2] + '} = ' + c[3] + '.'] };
  };
  P['Zero power (a ≠ 0)'] = function () {
    var a = ri(2, 9), b = ri(2, 9);
    return { q: 'Evaluate (−' + a + ')⁰ + ' + b + '⁰ − ' + a + '¹.', a: mn(2 - a), w: [mn(-a), mn(1 - a), mn(2 + a)],
      s: ['Любое ненулевое число в степени 0 равно 1: 1 + 1 − ' + a + ' = ' + mn(2 - a) + '.'] };
  };

  /* ---------------- Number and ratio ---------------- */
  P['Percentage change'] = function () {
    var c = pick([[80, 92], [250, 200], [40, 50], [1200, 900], [500, 560], [60, 75], [200, 170]]), o = c[0], n = c[1];
    var p = (n - o) / o * 100, s = function (x) { return (x > 0 ? '+' : '−') + num(Math.abs(x)) + '%'; };
    return { q: 'A price changes from ₸' + o + ' to ₸' + n + '. What is the percentage change?', a: s(p), w: [s((n - o) / n * 100), s(-p), s(n / o * 100)],
      s: ['(новое − старое) / старое × 100% = ' + mn(n - o) + ' / ' + o + ' × 100% = ' + s(p) + '.'] };
  };
  P['Value after n years of compound growth at r% a year'] = function () {
    var P0 = pick([1000, 2000, 5000, 10000]), r = pick([5, 10, 20]), n = ri(2, 3);
    var A = Math.round(P0 * Math.pow(1 + r / 100, n));
    return { q: '₸' + th(P0) + ' is invested at ' + r + '% a year compound interest. What is it worth after ' + n + ' years?',
      a: '₸' + th(A), w: ['₸' + th(Math.round(P0 * (1 + r * n / 100))), '₸' + th(Math.round(P0 * Math.pow(1 + r / 100, n + 1))), '₸' + th(Math.round(P0 * Math.pow(1 + r / 100, n - 1)))],
      s: ['A = P(1 + r/100)ⁿ = ' + th(P0) + ' · ' + num(1 + r / 100) + '^{' + n + '} = ' + th(A) + '.'] };
  };
  P['Simple interest'] = function () {
    var P0 = pick([2000, 5000, 8000, 12000]), r = pick([3, 4, 5, 6]), t = ri(2, 5), I = P0 * r * t / 100;
    return { q: 'How much simple interest does ₸' + th(P0) + ' earn in ' + t + ' years at ' + r + '% a year?',
      a: '₸' + th(I), w: ['₸' + th(Math.round(P0 * Math.pow(1 + r / 100, t) - P0)), '₸' + th(P0 * r * t), '₸' + th(P0 * r / 100)],
      s: ['I = Prt/100 = ' + th(P0) + ' · ' + r + ' · ' + t + ' / 100 = ' + th(I) + '.'] };
  };
  P['Original price before an increase of r%'] = function () {
    var r = pick([10, 20, 25, 50]), o = pick([40, 80, 120, 200, 360]) * 10, n = o * (100 + r) / 100;
    return { q: 'After a ' + r + '% increase a coat costs ₸' + th(n) + '. What was the price before the increase?',
      a: '₸' + th(o), w: ['₸' + th(n * (100 - r) / 100), '₸' + th(Math.round(n * 100 / (100 - r))), '₸' + th(n - r * 10)],
      s: ['Новая цена = ' + (100 + r) + '% от старой.', th(n) + ' : ' + num(1 + r / 100) + ' = ' + th(o) + '.'] };
  };
  P['Speed'] = function () {
    var v = pick([40, 60, 72, 80, 90]), m = pick([30, 45, 90, 150]), d = v * m / 60;
    if (d % 1) return null;
    return { q: 'A bus travels ' + d + ' km in ' + m + ' minutes. What is its average speed in km/h?',
      a: v + ' km/h', w: [num(d / m) + ' km/h', th(d * m) + ' km/h', num(d / (m / 100)) + ' km/h'],
      s: [m + ' мин = ' + num(m / 60) + ' ч.', d + ' : ' + num(m / 60) + ' = ' + v + ' км/ч.'] };
  };
  P['Density'] = function () {
    var c = pick([[540, 200, 2.7], [790, 100, 7.9], [180, 20, 9], [1140, 100, 11.4], [96, 120, 0.8]]);
    return { q: 'A block has mass ' + c[0] + ' g and volume ' + c[1] + ' cm³. What is its density?', a: num(c[2]) + ' g/cm³',
      w: [num(c[1] / c[0]) + ' g/cm³', th(c[0] * c[1]) + ' g/cm³', num(c[2] * 10) + ' g/cm³'],
      s: ['ρ = m / V = ' + c[0] + ' : ' + c[1] + ' = ' + num(c[2]) + ' г/см³.'] };
  };
  P['Pressure'] = function () {
    var F = pick([600, 900, 1200, 450]), A = pick([0.2, 0.3, 0.5, 1.5]), p = F / A;
    if (p % 1) return null;
    return { q: 'A force of ' + F + ' N acts on an area of ' + A + ' m². What is the pressure?', a: th(p) + ' Pa',
      w: [th(F * A) + ' Pa', th(p / 10) + ' Pa', th(p * 2) + ' Pa'], s: ['p = F / A = ' + F + ' : ' + A + ' = ' + th(p) + ' Па.'] };
  };
  P['y is inversely proportional to x'] = function () {
    var k = pick([24, 36, 48, 60, 72]), x1 = pick([2, 3, 4, 6]), x2 = pick([8, 12, 3, 4, 6]); if (x1 === x2 || k % x2) return null;
    return { q: 'y is inversely proportional to x. When x = ' + x1 + ', y = ' + (k / x1) + '. Find y when x = ' + x2 + '.',
      a: mn(k / x2), w: [num(k / x1 * x2 / x1), mn(k / x1 + x1 - x2), num(x2 / k * x1)],
      s: ['y = k/x, k = ' + x1 + ' · ' + (k / x1) + ' = ' + k + '.', 'y = ' + k + ' : ' + x2 + ' = ' + (k / x2) + '.'] };
  };
  P['Area scale factor of similar shapes with length scale factor k'] = function () {
    var k = ri(2, 4), A = pick([5, 8, 12, 20]);
    return { q: 'Two similar shapes have lengths in the ratio 1 : ' + k + '. The smaller has area ' + A + ' cm². What is the area of the larger?',
      a: A * k * k + ' cm²', w: [A * k + ' cm²', A * k * k * k + ' cm²', A * 2 * k + ' cm²'], s: ['Площадь × k² = ' + (k * k) + ': ' + A + ' · ' + (k * k) + ' = ' + (A * k * k) + ' см².'] };
  };
  P['Volume scale factor of similar solids with length scale factor k'] = function () {
    var k = ri(2, 3), V = pick([10, 15, 30, 40]);
    return { q: 'Two similar bottles have heights in the ratio 1 : ' + k + '. The smaller holds ' + V + ' ml. How much does the larger hold?',
      a: V * k * k * k + ' ml', w: [V * k + ' ml', V * k * k + ' ml', V * 3 * k + ' ml'], s: ['Объём × k³ = ' + (k * k * k) + ': ' + V + ' · ' + (k * k * k) + ' = ' + (V * k * k * k) + ' мл.'] };
  };

  /* ---------------- Areas and angles ---------------- */
  P['Area of a triangle'] = function () {
    var b = ri(4, 14), h = ri(3, 12); if ((b * h) % 2) return null;
    return { q: 'A triangle has base ' + b + ' cm and perpendicular height ' + h + ' cm. Find its area.', a: b * h / 2 + ' cm²',
      w: [b * h + ' cm²', num((b + h) / 2) + ' cm²', num(b * h / 3) + ' cm²'], s: ['½ · ' + b + ' · ' + h + ' = ' + (b * h / 2) + ' см².'] };
  };
  P['Area of a triangle from two sides and the angle between them'] = function () {
    var a = pick([6, 8, 10, 12]), b = pick([5, 7, 9, 4]);
    return { q: 'Two sides of a triangle are ' + a + ' cm and ' + b + ' cm, and the angle between them is 30°. Find the area.',
      a: num(a * b / 4) + ' cm²', w: [num(a * b / 2) + ' cm²', a * b / 4 + 'sqrt{3} cm²', a * b + ' cm²'],
      s: ['A = ½ab sin C = ½ · ' + a + ' · ' + b + ' · ½ = ' + num(a * b / 4) + ' см² (sin 30° = ½).'] };
  };
  P['Area of a trapezium'] = function () {
    var a = ri(4, 9), b = ri(10, 16), h = pick([4, 6, 8]);
    return { q: 'A trapezium has parallel sides ' + a + ' cm and ' + b + ' cm, ' + h + ' cm apart. Find its area.', a: (a + b) * h / 2 + ' cm²',
      w: [(a + b) * h + ' cm²', a * b * h / 2 + ' cm²', num((a + b + h) / 2) + ' cm²'], s: ['½(' + a + ' + ' + b + ') · ' + h + ' = ' + ((a + b) * h / 2) + ' см².'] };
  };
  P['Area of a parallelogram'] = function () {
    var b = ri(8, 14), h = ri(4, 7), sl = h + ri(1, 3);
    return { q: 'A parallelogram has base ' + b + ' cm, slanted sides of ' + sl + ' cm and perpendicular height ' + h + ' cm. Find its area.',
      a: b * h + ' cm²', w: [b * sl + ' cm²', num(b * h / 2) + ' cm²', 2 * (b + sl) + ' cm²'], s: ['Основание × высота (перпендикулярная): ' + b + ' · ' + h + ' = ' + (b * h) + ' см².'] };
  };
  P['Area of a circle'] = function () {
    var d = pick([6, 8, 10, 14, 20]), r = d / 2;
    return { q: 'A circle has diameter ' + d + ' cm. Find its area, in terms of π.', a: pi(r * r) + ' cm²', w: [pi(2 * r) + ' cm²', pi(d * d) + ' cm²', pi(2 * r * r) + ' cm²'],
      s: ['r = ' + d + ' : 2 = ' + r + '.', 'πr² = ' + pi(r * r) + ' см².'] };
  };
  P['Circumference of a circle'] = function () {
    var r = ri(3, 12);
    return { q: 'A circle has radius ' + r + ' cm. Find its circumference, in terms of π.', a: pi(2 * r) + ' cm', w: [pi(r * r) + ' cm', pi(r) + ' cm', pi(2 * r * r) + ' cm'],
      s: ['C = 2πr = ' + pi(2 * r) + ' см.'] };
  };
  P['Arc length (angle θ in degrees)'] = function () {
    var c = pick([[6, 60], [9, 40], [12, 30], [10, 72], [8, 45], [6, 120], [9, 120]]), r = c[0], t = c[1];
    return { q: 'A sector has radius ' + r + ' cm and angle ' + t + '°. Find its arc length, in terms of π.',
      a: pi(2 * r * t / 360) + ' cm', w: [pi(r * r * t / 360) + ' cm', pi(r * t / 360) + ' cm', pi(2 * r) + ' cm'],
      s: ['l = θ/360 · 2πr = ' + t + '/360 · ' + pi(2 * r) + ' = ' + pi(2 * r * t / 360) + ' см.'] };
  };
  P['Area of a sector (angle θ in degrees)'] = function () {
    var c = pick([[6, 60], [12, 30], [10, 36], [8, 45], [6, 120], [9, 40]]), r = c[0], t = c[1];
    return { q: 'A sector has radius ' + r + ' cm and angle ' + t + '°. Find its area, in terms of π.',
      a: pi(r * r * t / 360) + ' cm²', w: [pi(2 * r * t / 360) + ' cm²', pi(r * r * t / 180) + ' cm²', pi(r * r) + ' cm²'],
      s: ['A = θ/360 · πr² = ' + t + '/360 · ' + pi(r * r) + ' = ' + pi(r * r * t / 360) + ' см².'] };
  };
  P['Pythagoras’ theorem (c is the hypotenuse)'] = function () {
    var t = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15]]);
    if (Math.random() < 0.5)
      return { q: 'A right-angled triangle has shorter sides ' + t[0] + ' cm and ' + t[1] + ' cm. How long is the hypotenuse?', a: t[2] + ' cm',
        w: [t[0] + t[1] + ' cm', 'sqrt{' + (t[1] * t[1] - t[0] * t[0]) + '} cm', t[2] * t[2] + ' cm'], s: ['c = √(' + t[0] + '² + ' + t[1] + '²) = √' + (t[2] * t[2]) + ' = ' + t[2] + ' см.'] };
    return { q: 'A ladder ' + t[2] + ' m long leans against a wall with its foot ' + t[0] + ' m from the wall. How high does it reach?', a: t[1] + ' m',
      w: ['sqrt{' + (t[2] * t[2] + t[0] * t[0]) + '} m', t[2] - t[0] + ' m', t[1] * t[1] + ' m'], s: ['Лестница — гипотенуза: √(' + t[2] + '² − ' + t[0] + '²) = √' + (t[1] * t[1]) + ' = ' + t[1] + ' м.'] };
  };
  P['Sum of the interior angles of an n-sided polygon'] = function () {
    var n = ri(5, 12);
    return { q: 'What is the sum of the interior angles of a polygon with ' + n + ' sides?', a: th((n - 2) * 180) + '°',
      w: [th(n * 180) + '°', th((n - 1) * 180) + '°', th((n - 2) * 360) + '°'], s: ['(n − 2) · 180° = ' + (n - 2) + ' · 180° = ' + th((n - 2) * 180) + '°.'] };
  };
  P['Each exterior angle of a regular n-sided polygon'] = function () {
    var n = pick([5, 6, 8, 9, 10, 12, 15, 20]);
    return { q: 'What is each exterior angle of a regular polygon with ' + n + ' sides?', a: 360 / n + '°',
      w: [num(180 / n) + '°', 180 - 360 / n + '°', th(360 * n) + '°'], s: ['360° : ' + n + ' = ' + (360 / n) + '°.'] };
  };
  P['Each interior angle of a regular n-sided polygon'] = function () {
    var n = pick([5, 6, 8, 9, 10, 12, 18]);
    return { q: 'What is each interior angle of a regular polygon with ' + n + ' sides?', a: 180 - 360 / n + '°',
      w: [360 / n + '°', num(n * 180 / (n - 2)) + '°', 2 * (180 - 360 / n) + '°'], s: ['Внешний угол 360 : ' + n + ' = ' + (360 / n) + '°, внутренний 180 − ' + (360 / n) + ' = ' + (180 - 360 / n) + '°.'] };
  };

  /* ---------------- Volumes and surfaces ---------------- */
  P['Volume of a cylinder'] = function () {
    var r = ri(2, 6), h = ri(3, 10);
    return { q: 'A cylinder has radius ' + r + ' cm and height ' + h + ' cm. Find its volume, in terms of π.', a: pi(r * r * h) + ' cm³',
      w: [pi(2 * r * h) + ' cm³', fr(r * r * h, 3).replace(/^(.*)$/, '$1') + 'π cm³', pi(r * h * h) + ' cm³'], s: ['V = πr²h = π · ' + (r * r) + ' · ' + h + ' = ' + pi(r * r * h) + ' см³.'] };
  };
  P['Volume of a cone'] = function () {
    var r = pick([3, 6]), h = ri(2, 10);
    return { q: 'A cone has base radius ' + r + ' cm and height ' + h + ' cm. Find its volume, in terms of π.', a: pi(r * r * h / 3) + ' cm³',
      w: [pi(r * r * h) + ' cm³', fr(r * r * h, 2) + 'π cm³', pi(r * h / 3) + ' cm³'], s: ['V = ⅓πr²h = ⅓ · ' + (r * r) + ' · ' + h + ' π = ' + pi(r * r * h / 3) + ' см³.'] };
  };
  P['Volume of a sphere'] = function () {
    var r = pick([6, 9]);
    return { q: 'A sphere has radius ' + r + ' cm. Find its volume, in terms of π.', a: pi(4 * r * r * r / 3) + ' cm³',
      w: [pi(4 * r * r) + ' cm³', pi(4 * r * r / 3) + ' cm³', pi(4 * r * r * r) + ' cm³'], s: ['V = 4/3 πr³ = 4/3 · ' + (r * r * r) + ' π = ' + pi(4 * r * r * r / 3) + ' см³.'] };
  };
  P['Volume of a hemisphere'] = function () {
    var r = pick([6, 9]);
    return { q: 'A hemisphere has radius ' + r + ' cm. Find its volume, in terms of π.', a: pi(2 * r * r * r / 3) + ' cm³',
      w: [pi(4 * r * r * r / 3) + ' cm³', pi(2 * r * r) + ' cm³', pi(2 * r * r * r) + ' cm³'], s: ['Половина шара: 2/3 πr³ = 2/3 · ' + (r * r * r) + ' π = ' + pi(2 * r * r * r / 3) + ' см³.'] };
  };
  P['Surface area of a sphere'] = function () {
    var r = ri(2, 7);
    return { q: 'A sphere has radius ' + r + ' cm. Find its surface area, in terms of π.', a: pi(4 * r * r) + ' cm²',
      w: [fr(4 * r * r * r, 3) + 'π cm²', pi(2 * r * r) + ' cm²', pi(r * r) + ' cm²'], s: ['S = 4πr² = 4 · ' + (r * r) + ' π = ' + pi(4 * r * r) + ' см².'] };
  };
  P['Volume of a pyramid'] = function () {
    var a = pick([3, 6, 9]), h = ri(4, 10);
    return { q: 'A pyramid has a square base of side ' + a + ' cm and height ' + h + ' cm. Find its volume.', a: a * a * h / 3 + ' cm³',
      w: [a * a * h + ' cm³', num(a * a * h / 2) + ' cm³', 4 * a * h / 3 % 1 ? num(4 * a * h / 3) + ' cm³' : 4 * a * h / 3 + ' cm³'], s: ['V = ⅓ · ' + (a * a) + ' · ' + h + ' = ' + (a * a * h / 3) + ' см³.'] };
  };
  P['Volume of a prism'] = function () {
    var b = ri(3, 10), h = pick([4, 6, 8]), l = ri(5, 15);
    return { q: 'A prism has a triangular cross-section with base ' + b + ' cm and height ' + h + ' cm. It is ' + l + ' cm long. Find its volume.',
      a: b * h * l / 2 + ' cm³', w: [b * h * l + ' cm³', b * h / 2 + ' cm³', num(b * h * l / 6) + ' cm³'], s: ['Сечение ½ · ' + b + ' · ' + h + ' = ' + (b * h / 2) + ' см².', (b * h / 2) + ' · ' + l + ' = ' + (b * h * l / 2) + ' см³.'] };
  };
  P['Curved surface area of a cylinder'] = function () {
    var r = ri(2, 6), h = ri(3, 10);
    return { q: 'A cylinder has radius ' + r + ' cm and height ' + h + ' cm. Find its curved surface area, in terms of π.', a: pi(2 * r * h) + ' cm²',
      w: [pi(r * r * h) + ' cm²', pi(r * h) + ' cm²', pi(2 * r * r * h) + ' cm²'], s: ['S = 2πrh = 2 · ' + r + ' · ' + h + ' π = ' + pi(2 * r * h) + ' см².'] };
  };
  P['Curved surface area of a cone (l is the slant height)'] = function () {
    var t = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]]);
    return { q: 'A cone has base radius ' + t[0] + ' cm and perpendicular height ' + t[1] + ' cm. Find its curved surface area, in terms of π.',
      a: pi(t[0] * t[2]) + ' cm²', w: [pi(t[0] * t[1]) + ' cm²', pi(2 * t[0] * t[2]) + ' cm²', pi(t[0] * t[0] * t[2]) + ' cm²'],
      s: ['Образующая l = √(' + t[0] + '² + ' + t[1] + '²) = ' + t[2] + '.', 'S = πrl = π · ' + t[0] + ' · ' + t[2] + ' = ' + pi(t[0] * t[2]) + ' см².'] };
  };

  /* ---------------- Coordinates ---------------- */
  P['Gradient of the line through (x₁, y₁) and (x₂, y₂)'] = function () {
    var x1 = ri(-4, 3), y1 = ri(-5, 5), dx = ri(1, 5), dy = ri(-8, 8); if (!dy || dy === dx || dy === -dx) return null;
    var x2 = x1 + dx, y2 = y1 + dy;
    return { q: 'Find the gradient of the line through (' + mn(x1) + ', ' + mn(y1) + ') and (' + mn(x2) + ', ' + mn(y2) + ').',
      a: fr(dy, dx), w: [fr(dx, dy), fr(-dy, dx), fr(y2 + y1, x2 + x1 || 7)], s: ['m = Δy/Δx = ' + mn(dy) + '/' + dx + ' = ' + fr(dy, dx) + '.'] };
  };
  P['Midpoint of (x₁, y₁) and (x₂, y₂)'] = function () {
    var x1 = ri(-6, 4), y1 = ri(-6, 6), x2 = x1 + 2 * ri(1, 5), y2 = y1 + 2 * ri(-4, 4);
    var p = function (a, b) { return '(' + mn(a) + ', ' + mn(b) + ')'; };
    return { q: 'Find the midpoint of (' + mn(x1) + ', ' + mn(y1) + ') and (' + mn(x2) + ', ' + mn(y2) + ').',
      a: p((x1 + x2) / 2, (y1 + y2) / 2), w: [p((x2 - x1) / 2, (y2 - y1) / 2), p(x1 + x2, y1 + y2), p((y1 + y2) / 2, (x1 + x2) / 2)],
      s: ['Середина = среднее координат: (' + mn(x1) + ' + ' + sq(x2) + ')/2, (' + mn(y1) + ' + ' + sq(y2) + ')/2 → ' + p((x1 + x2) / 2, (y1 + y2) / 2) + '.'] };
  };
  P['Distance between (x₁, y₁) and (x₂, y₂)'] = function () {
    var t = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [12, 5, 13]]), x1 = ri(-4, 4), y1 = ri(-4, 4);
    var x2 = x1 + t[0] * pick([1, -1]), y2 = y1 + t[1] * pick([1, -1]);
    return { q: 'Find the distance between (' + mn(x1) + ', ' + mn(y1) + ') and (' + mn(x2) + ', ' + mn(y2) + ').',
      a: mn(t[2]), w: [mn(t[0] + t[1]), mn(t[2] * t[2]), mn(t[2] + 1)], s: ['Δx = ' + t[0] + ', Δy = ' + t[1] + '; d = √(' + (t[0] * t[0]) + ' + ' + (t[1] * t[1]) + ') = ' + t[2] + '.'] };
  };
  P['Line with gradient m through (x₁, y₁)'] = function () {
    var m = pick([2, 3, -2, -1, 4]), x1 = ri(-3, 4), y1 = ri(-5, 6), c = y1 - m * x1; if (!x1) return null;
    return { q: 'A line has gradient ' + mn(m) + ' and passes through (' + mn(x1) + ', ' + mn(y1) + '). Where does it cross the y-axis?',
      a: '(0, ' + mn(c) + ')', w: ['(0, ' + mn(y1 + m * x1) + ')', '(0, ' + mn(y1) + ')', '(0, ' + mn(y1 - m) + ')'],
      s: ['y − ' + sq(y1) + ' = ' + mn(m) + '(x − ' + sq(x1) + '); при x = 0: y = ' + mn(y1) + ' − ' + sq(m * x1) + ' = ' + mn(c) + '.'] };
  };
  P['Gradients of perpendicular lines'] = function () {
    var a = pick([[2, 1], [3, 1], [1, 2], [2, 3], [-4, 1], [-1, 3], [3, 4]]);
    return { q: 'Line L is y = ' + fr(a[0], a[1]) + 'x + 5. What is the gradient of a line perpendicular to L?',
      a: fr(-a[1], a[0]), w: [fr(a[0], a[1]), fr(a[1], a[0]), fr(-a[0], a[1])], s: ['m₁ · m₂ = −1 → m₂ = −1 : ' + fr(a[0], a[1]) + ' = ' + fr(-a[1], a[0]) + '.'] };
  };
  P['Circle with centre (a, b) and radius r'] = function () {
    var a = ri(-5, 5), b = ri(-5, 5), r = ri(2, 8); if (!a || !b) return null;
    var s = function (x, n) { return '(' + x + ' ' + (n > 0 ? '− ' : '+ ') + Math.abs(n) + ')²'; };
    var p = function (x, y, rr) { return 'centre (' + mn(x) + ', ' + mn(y) + '), radius ' + rr; };
    return { q: 'A circle has equation ' + s('x', a) + ' + ' + s('y', b) + ' = ' + r * r + '. Find its centre and radius.',
      a: p(a, b, r), w: [p(-a, -b, r), p(a, b, r * r), p(-a, -b, r * r)], s: ['(x − a)² + (y − b)² = r²: центр (' + mn(a) + ', ' + mn(b) + '), r = √' + (r * r) + ' = ' + r + '.'] };
  };

  /* ---------------- Trigonometry ---------------- */
  function trip() { return pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]); }
  function ratio(name, f) {
    return function () {
      var t = trip(), o = t[0], a = t[1], h = t[2];
      var val = { sin: [o, h], cos: [a, h], tan: [o, a] }[f];
      var all = [[o, h], [a, h], [o, a], [a, o], [h, o], [h, a]].filter(function (x) { return x[0] !== val[0] || x[1] !== val[1]; });
      return { q: 'In a right-angled triangle, the side opposite θ is ' + o + ', the side adjacent to θ is ' + a + ' and the hypotenuse is ' + h + '. Find ' + f + ' θ.',
        a: fr(val[0], val[1]), w: all.slice(0, 3).map(function (x) { return fr(x[0], x[1]); }),
        s: [{ sin: 'sin = противолежащий / гипотенуза', cos: 'cos = прилежащий / гипотенуза', tan: 'tan = противолежащий / прилежащий' }[f] + ' = ' + fr(val[0], val[1]) + '.'] };
    };
  }
  P['sin θ in a right-angled triangle'] = ratio('sin', 'sin');
  P['cos θ in a right-angled triangle'] = ratio('cos', 'cos');
  P['tan θ in a right-angled triangle'] = ratio('tan', 'tan');
  P['Pythagorean identity'] = function () {
    var t = trip();
    return { q: 'θ is acute and sin θ = ' + fr(t[0], t[2]) + '. Find cos θ.', a: fr(t[1], t[2]),
      w: [fr(t[2] - t[0], t[2]), fr(t[0], t[1]), fr(t[1] * t[1], t[2] * t[2])],
      s: ['cos²θ = 1 − sin²θ = 1 − ' + (t[0] * t[0]) + '/' + (t[2] * t[2]) + ' = ' + (t[1] * t[1]) + '/' + (t[2] * t[2]) + '.', 'cos θ = ' + fr(t[1], t[2]) + ' (угол острый).'] };
  };
  P['tan θ in terms of sin and cos'] = function () {
    var t = trip();
    return { q: 'sin θ = ' + fr(t[0], t[2]) + ' and cos θ = ' + fr(t[1], t[2]) + '. Find tan θ.', a: fr(t[0], t[1]),
      w: [fr(t[1], t[0]), fr(t[0] * t[1], t[2] * t[2]), fr(t[2] - t[1], t[2])], s: ['tan θ = sin θ / cos θ = ' + fr(t[0], t[2]) + ' : ' + fr(t[1], t[2]) + ' = ' + fr(t[0], t[1]) + '.'] };
  };
  P['Sine rule'] = function () {
    var a = pick([4, 5, 6, 7, 9]);
    return { q: 'In triangle ABC, angle A = 30°, angle B = 90° and BC = ' + a + ' cm. Find AC.', a: 2 * a + ' cm',
      w: [num(a / 2) + ' cm', a + 'sqrt{3} cm', a + ' cm'], s: ['BC напротив A, AC напротив B.', 'AC = ' + a + ' · sin 90° / sin 30° = ' + a + ' · 1 : ½ = ' + (2 * a) + ' см.'] };
  };
  P['Cosine rule'] = function () {
    var c = pick([[5, 8, 60, 49], [3, 8, 60, 49], [8, 15, 60, 169], [5, 3, 120, 49], [7, 8, 120, 169]]);
    var b = c[0], d = c[1], A = c[2], r = Math.round(Math.sqrt(c[3]));
    return { q: 'In triangle ABC, AB = ' + d + ' cm, AC = ' + b + ' cm and angle A = ' + A + '°. Find BC.', a: r + ' cm',
      w: ['sqrt{' + (b * b + d * d) + '} cm', 'sqrt{' + (2 * (b * b + d * d) - c[3]) + '} cm', b + d + ' cm'],
      s: ['a² = b² + c² − 2bc cos A = ' + (b * b) + ' + ' + (d * d) + ' − 2·' + b + '·' + d + '·(' + (A === 60 ? '½' : '−½') + ') = ' + c[3] + '.', 'BC = √' + c[3] + ' = ' + r + ' см.'] };
  };
  P['Exact value'] = function () {
    var e = pick([['2 sin 30° + tan 45°', '2', ['1', '3', '{3|2}']], ['cos 60° × 4', '2', ['1', '4', '2sqrt{3}']], ['tan 60° × cos 30°', '{3|2}', ['{1|2}', '3', 'sqrt{3}']],
                  ['sin 30° + cos 60°', '1', ['{1|2}', '2', 'sqrt{3}']], ['tan 45° − 2 sin 30°', '0', ['1', '−1', '{1|2}']]]);
    return { q: 'Find the exact value of ' + e[0] + '.', a: e[1], w: e[2], s: ['sin 30° = cos 60° = ½, cos 30° = √3/2, tan 45° = 1, tan 60° = √3 → ' + e[1].replace(/\{(\d+)\|(\d+)\}/, '$1/$2').replace('sqrt', '√') + '.'] };
  };

  /* ---------------- Sequences ---------------- */
  P['n-th term of an arithmetic sequence'] = function () {
    var a = ri(-5, 12), d = pick([3, 4, 5, 7, -2, -3]), n = pick([20, 25, 30, 40, 50]);
    var s = [a, a + d, a + 2 * d, a + 3 * d].map(mn).join(', ');
    return { q: 'Find the ' + n + 'th term of ' + s + ', …', a: mn(a + (n - 1) * d), w: [mn(a + n * d), mn(n * d), mn((a + n) * d)],
      s: ['aₙ = a + (n − 1)d = ' + mn(a) + ' + ' + (n - 1) + ' · ' + sq(d) + ' = ' + mn(a + (n - 1) * d) + '.'] };
  };
  P['Sum of the first n terms of an arithmetic sequence'] = function () {
    var a = ri(1, 9), d = ri(2, 6), n = pick([10, 12, 20]), S = n / 2 * (2 * a + (n - 1) * d);
    return { q: 'Find the sum of the first ' + n + ' terms of ' + [a, a + d, a + 2 * d].join(', ') + ', …', a: th(S),
      w: [th(n * (2 * a + (n - 1) * d)), th(n / 2 * (a + (n - 1) * d)), th(n / 2 * (2 * a + n * d))],
      s: ['Sₙ = n/2 · (2a + (n − 1)d) = ' + (n / 2) + ' · (' + (2 * a) + ' + ' + ((n - 1) * d) + ') = ' + th(S) + '.'] };
  };
  P['n-th term of a geometric sequence'] = function () {
    var a = pick([2, 3, 5]), r = pick([2, 3]), n = ri(5, 7), v = a * Math.pow(r, n - 1);
    return { q: 'Find the ' + n + 'th term of ' + [a, a * r, a * r * r].join(', ') + ', …', a: th(v), w: [th(v * r), th(a + (n - 1) * r), th(Math.pow(a * r, n - 1))],
      s: ['aₙ = a · r^{n − 1} = ' + a + ' · ' + r + '^{' + (n - 1) + '} = ' + th(v) + '.'] };
  };
  P['Sum 1 + 2 + 3 + … + n'] = function () {
    var n = pick([20, 30, 40, 50, 100]);
    return { q: 'Work out 1 + 2 + 3 + … + ' + n + '.', a: th(n * (n + 1) / 2), w: [th(n * (n + 1)), th(n * (n - 1) / 2), th(n * n / 2)],
      s: ['n(n + 1)/2 = ' + n + ' · ' + (n + 1) + ' / 2 = ' + th(n * (n + 1) / 2) + '.'] };
  };

  /* make one problem; distinct options guaranteed */
  window.PREPLINE_PROB = function (name) {
    var g = P[name]; if (!g) return null;
    for (var i = 0; i < 40; i++) {
      var p = g(); if (!p) continue;
      var seen = {}, ok = true;
      [p.a].concat(p.w).forEach(function (x) { if (seen[x]) ok = false; seen[x] = 1; });
      if (ok && p.w.length === 3) return p;
    }
    return null;
  };
  window.PREPLINE_PROB_HAS = function (name) { return !!P[name]; };
})();
