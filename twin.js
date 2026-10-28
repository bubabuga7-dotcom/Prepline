/* Prepline twin: misconceptions caught in the Formula quiz become cracks in "You v1.0".
   Stable trap IDs: a trap is matched by formula name + the exact wrong option text, never by its position.
   Storage (this device):
     prepline:twin      { id: { state, runs:[quiz run ids], seenAt, healFrom } }
       state: suspected (seen in one quiz run) → confirmed (seen in another run) → healing (round won,
              fresh check solved first try) → healed (delayed check, due 3+ days later, solved first try).
     prepline:twin-log  [ { id, kind: 'round'|'check', v, at, steps:[...], fixes:[...], check:[...], first, ms } ] */
(function () {
  var K = 'prepline:twin', LOGK = 'prepline:twin-log', DAY = 864e5;
  var I = function (x) { return '<i>' + x + '</i>'; };

  /* the 25 misconceptions: formula name in the quiz + the wrong option exactly as written there */
  var TRAPS = [
    ['area-k', 'Area scale factor of similar shapes with length scale factor k', I('k'), 'Площадь растёт в k раз'],
    ['vol-k2', 'Volume scale factor of similar solids with length scale factor k', I('k') + '²', 'Объём растёт в k² раз'],
    ['circle-area-2pr', 'Area of a circle', I('A') + ' = 2π' + I('r'), 'Площадь круга = 2πr'],
    ['circum-pr2', 'Circumference of a circle', I('C') + ' = π' + I('r') + '²', 'Длина окружности = πr²'],
    ['arc-no-2', 'Arc length (angle θ in degrees)', I('l') + ' = {θ|360} × π' + I('r'), 'Дуга без двойки'],
    ['sector-2pr', 'Area of a sector (angle θ in degrees)', I('A') + ' = {θ|360} × 2π' + I('r'), 'Сектор через 2πr'],
    ['tri-no-half', 'Area of a triangle', I('A') + ' = base × height', 'Треугольник без ½'],
    ['para-slant', 'Area of a parallelogram', I('A') + ' = base × slanted side', 'Параллелограмм через наклонную сторону'],
    ['cone-no-third', 'Volume of a cone', I('V') + ' = π' + I('r') + '²' + I('h'), 'Конус без ⅓'],
    ['sphere-4pr2', 'Volume of a sphere', I('V') + ' = 4π' + I('r') + '²', 'Объём шара = 4πr²'],
    ['pct-new-base', 'Percentage change', '{new − old|new} × 100%', 'Процент от нового значения'],
    ['revpct-subtract', 'Original price before an increase of r%', 'original = new × (1 − {' + I('r') + '|100})', 'Обратный процент вычитанием'],
    ['compound-simple', 'Value after n years of compound growth at r% a year', I('A') + ' = ' + I('P') + '(1 + {' + I('rn') + '|100})', 'Сложный процент как простой'],
    ['pow-mult', 'Multiplying powers', I('a') + '^{' + I('mn') + '}', 'aᵐ·aⁿ = aᵐⁿ'],
    ['neg-pow', 'Negative power', '−' + I('a') + '^{' + I('n') + '}', 'a⁻ⁿ = −aⁿ'],
    ['frac-pow-swap', 'Fractional power', '(ᵐ√' + I('a') + ')^{' + I('n') + '}', 'Корень и степень перепутаны'],
    ['sq-sum', 'Square of a sum', I('a') + '² + ' + I('b') + '²', '(a + b)² = a² + b²'],
    ['quad-plus-b', 'Solutions of ax² + bx + c = 0', I('x') + ' = {' + I('b') + ' ± sqrt{' + I('b') + '² − 4' + I('ac') + '}|2' + I('a') + '}', '+b вместо −b в формуле корней'],
    ['vertex-sign', 'x-coordinate of the vertex of y = ax² + bx + c', I('x') + ' = {' + I('b') + '|2' + I('a') + '}', 'Вершина в b/2a'],
    ['grad-flip', 'Gradient of the line through (x₁, y₁) and (x₂, y₂)', I('m') + ' = {' + I('x') + '₂ − ' + I('x') + '₁|' + I('y') + '₂ − ' + I('y') + '₁}', 'Градиент Δx/Δy'],
    ['perp-equal', 'Gradients of perpendicular lines', I('m') + '₁ = ' + I('m') + '₂', 'Перпендикулярные = равные градиенты'],
    ['ap-nd', 'n-th term of an arithmetic sequence', I('a') + 'ₙ = ' + I('a') + ' + ' + I('nd'), 'n-й член a + nd'],
    ['pyth-no-squares', 'Pythagoras’ theorem (c is the hypotenuse)', I('a') + ' + ' + I('b') + ' = ' + I('c'), 'Пифагор без квадратов'],
    ['cos-plus', 'Cosine rule', I('a') + '² = ' + I('b') + '² + ' + I('c') + '² + 2' + I('bc') + ' cos ' + I('A'), '+2bc cos A в теореме косинусов'],
    ['poly-n180', 'Sum of the interior angles of an n-sided polygon', I('n') + ' × 180°', 'Сумма углов n × 180°']
  ];

  /* rounds: only area-k for now. A version = the twin's argument with one wrong step. */
  var ROUNDS = {
    'area-k': {
      name: 'Площадь растёт в k раз',
      versions: [
        { claim: 'Радиус круга вырос с 3 до 6. Сейчас докажу, что площадь выросла вдвое. Я уверен.',
          steps: ['Площадь круга: S = πr².', 'Радиус увеличился в 6 : 3 = 2 раза.', 'Значит, площадь увеличилась в 2 раза.'],
          bad: 2, replies: ['Формула верная, я ею и пользуюсь.', '6 : 3 = 2, тут всё честно.', null],
          line: 'Я смотрел только на радиус. Теперь вижу квадрат: π·6² = 36π, а π·3² = 9π — в 4 раза.' },
        { claim: 'Сторону квадрата увеличили с 4 до 12. Площадь выросла в 3 раза — это же очевидно.',
          steps: ['Площадь квадрата: S = a².', 'Сторона увеличилась в 12 : 4 = 3 раза.', 'Значит, площадь увеличилась в 3 раза.'],
          bad: 2, replies: ['S = a² — это я помню.', '12 : 4 = 3, проверь сам.', null],
          line: 'Я снова смотрел только на сторону. 12² = 144, а 4² = 16 — в 9 раз, то есть 3².' },
        { claim: 'Два подобных треугольника, стороны относятся как 2 : 5. Значит, и площади 2 : 5.',
          steps: ['Треугольники подобны, коэффициент подобия k = 5/2.', 'Все стороны большого в 5/2 раза длиннее.', 'Значит, площадь большого в 5/2 раза больше: площади 2 : 5.'],
          bad: 2, replies: ['Подобие тут честное — так дано в условии.', 'Стороны действительно умножаются на k.', null],
          line: 'Площадь — это длина на длину, поэтому k дважды: площади 4 : 25.' }
      ],
      fixes: ['Множитель длины нужно возвести в квадрат: площадь растёт в k² раз',
              'Нужно сложить старую и новую длину',
              'Площадь растёт так же, как периметр, значит, ответ верный',
              'Множитель нужно возвести в куб: площадь растёт в k³ раз'],
      fixReplies: [null,
              'Складывать длины — это про периметр. Площадь — это длина на длину.',
              'Периметр и правда растёт в k раз. А площадь? Сколько направлений у неё меняется?',
              'Куб подходит для объёма. Мы сейчас считаем площадь — сколько направлений у неё меняется?'],
      check: function (k, up, shapeIdx) {
        k = k || 2 + Math.floor(Math.random() * 4);
        if (up === undefined) up = Math.random() < 0.5;
        if (shapeIdx === undefined) shapeIdx = Math.floor(Math.random() * 3);
        var shape = [['радиус круга', 'площадь круга'], ['сторону квадрата', 'площадь квадрата'], ['все стороны треугольника', 'его площадь (форма та же)']][shapeIdx];
        var word = { 2: 'вдвое', 3: 'втрое', 4: 'в 4 раза', 5: 'в 5 раз' }[k];
        var vals = [];                                   // k, k², k³ and one more slip, all different
        [k, k * k, k * k * k, 2 * k, k * k + k, k * k - 1].forEach(function (x) { if (vals.length < 4 && vals.indexOf(x) < 0) vals.push(x); });
        vals.sort(function (a, b) { return a - b; });
        var raz = function (x) { var d = x % 10, h = x % 100; return 'в ' + x + (d >= 2 && d <= 4 && (h < 12 || h > 14) ? ' раза' : ' раз'); };
        return { q: (up ? 'Увеличили ' : 'Уменьшили ') + shape[0] + ' ' + word + '. Во сколько раз ' + (up ? 'увеличилась ' : 'уменьшилась ') + shape[1] + '?',
          opts: vals.map(raz), ans: vals.indexOf(k * k), k: k,
          why: 'Площадь меняется в k² = ' + k + '² = ' + (k * k) + ' раз' + (k * k % 10 >= 2 && k * k % 10 <= 4 && (k * k % 100 < 12 || k * k % 100 > 14) ? 'а' : '') + '.' };
      }
    }
  };

  /* ---------- batch 2 ---------- */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function raz(x) { var d = x % 10, h = x % 100; return 'в ' + x + (d >= 2 && d <= 4 && (h < 12 || h > 14) ? ' раза' : ' раз'); }
  function uniq4(vals) { var out = []; vals.forEach(function (x) { if (out.length < 4 && out.indexOf(x) < 0) out.push(x); }); return out; }
  function th(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  ROUNDS['vol-k2'] = {
    name: 'Объём растёт в k² раз',
    versions: [
      { claim: 'Ребро куба выросло вдвое — объём вырос в четыре раза. Я уверен.',
        steps: ['Объём куба: V = a³.', 'Ребро увеличилось в 2 раза.', 'Значит, объём увеличился в 2² = 4 раза.'],
        bad: 2, replies: ['V = a³ — формула верная.', 'Было a, стало 2a — вдвое, всё честно.', null],
        line: 'Я посчитал только два направления. У объёма их три: 2³ = 8.' },
      { claim: 'Две подобные банки, высоты 1 : 3. Маленькая вмещает 200 мл, значит, большая — 1800 мл.',
        steps: ['Банки подобны, коэффициент k = 3.', 'Все размеры большой банки в 3 раза больше.', 'Значит, объём больше в 3² = 9 раз: 1800 мл.'],
        bad: 2, replies: ['Подобие дано в условии.', 'Если подобны — все размеры растут одинаково.', null],
        line: 'Длина, ширина и высота — три множителя: 3³ = 27, значит, 5400 мл.' }
    ],
    fixes: ['Объём меняется в k³ раз: растут длина, ширина и высота', 'Объём меняется в k раз, как длина', 'Объём меняется в 2k раз', 'Нужно сложить: k + k²'],
    fixReplies: [null, 'В k раз меняется только длина. А у объёма сколько измерений?', '2k — это просто удвоение. Сравни 1³ и 2³.', 'Сложение тут ни при чём — размеры перемножаются.'],
    check: function () {
      var k = ri(2, 5), sit = ri(0, 2), word = { 2: 'вдвое', 3: 'втрое', 4: 'в 4 раза', 5: 'в 5 раз' }[k];
      var q = [
        'Ребро куба увеличили ' + word + '. Во сколько раз увеличился объём куба?',
        'Две подобные бутылки, высоты относятся как 1 : ' + k + '. Во сколько раз большая бутылка вмещает больше?',
        'Две подобные статуэтки из одного металла, высоты 1 : ' + k + '. Во сколько раз большая тяжелее?'][sit];
      var vals = uniq4([k, k * k, k * k * k, 3 * k, k * k + k]).sort(function (a, b) { return a - b; });
      return { q: q, opts: vals.map(raz), ans: vals.indexOf(k * k * k), params: { k: k }, why: 'Объём (и масса) меняются в k³ = ' + k + '³ = ' + (k * k * k) + ' раз' + (/[234]$/.test(String(k * k * k)) && !/1[234]$/.test(String(k * k * k)) ? 'а' : '') + '.' };
    }
  };

  ROUNDS['circle-area-2pr'] = {
    name: 'Площадь круга = 2πr',
    versions: [
      { claim: 'Радиус круга 3, значит, площадь — 6π. Проще некуда.',
        steps: ['Радиус r = 3.', 'Площадь круга: S = 2πr.', '2π · 3 = 6π.'],
        bad: 1, replies: ['r = 3 — так дано.', null, '2 · 3 = 6, считать я умею.'],
        line: '2πr — это длина обода. Площадь — πr²: 9π, а не 6π.' },
      { claim: 'Диаметр круглого стола 10 дм. Площадь — 10π дм².',
        steps: ['Радиус r = 10 : 2 = 5 дм.', 'Площадь круга: S = 2πr.', '2π · 5 = 10π дм².'],
        bad: 1, replies: ['Радиус — половина диаметра, всё верно.', null, '2 · 5 = 10, тут без ошибок.'],
        line: 'Я снова взял длину окружности. Площадь — π · 5² = 25π дм².' }
    ],
    fixes: ['Площадь круга S = πr²; 2πr — это длина окружности', 'S = πd², через диаметр', 'S = 2πr²', 'S = πr'],
    fixReplies: [null, 'πd² в четыре раза больше нужного: d = 2r, а d² = 4r².', 'Лишняя двойка: 2πr² — это не площадь круга.', 'πr — это половина длины окружности, а не площадь.'],
    check: function () {
      var r = ri(3, 9), sit = ri(0, 2);
      var q = ['Найдите площадь круга радиусом ' + r + ' см.', 'Круглая клумба имеет диаметр ' + (2 * r) + ' м. Найдите её площадь.', 'Найдите площадь круглой пиццы радиусом ' + r + ' см.'][sit];
      var u = sit === 1 ? ' м²' : ' см²';
      var vals = uniq4([r * r, 2 * r, 4 * r * r, 2 * r * r]).sort(function (a, b) { return a - b; });
      return { q: q, opts: vals.map(function (x) { return x + 'π' + u; }), ans: vals.indexOf(r * r), params: { r: r }, why: 'S = πr² = π · ' + r + '² = ' + (r * r) + 'π' + u + '.' };
    }
  };

  ROUNDS['cone-no-third'] = {
    name: 'Конус без ⅓',
    versions: [
      { claim: 'Конус и цилиндр с одинаковым основанием и высотой вмещают поровну. Форма не важна.',
        steps: ['Объём цилиндра: V = πr²h.', 'У конуса то же основание и та же высота.', 'Значит, объём конуса тоже πr²h.'],
        bad: 2, replies: ['V = πr²h — для цилиндра верно.', 'Так дано в условии.', null],
        line: 'Конус сужается к вершине — он вмещает только треть цилиндра: ⅓πr²h.' },
      { claim: 'Конус: r = 3, h = 4. Объём — 36π.',
        steps: ['Площадь основания: π · 3² = 9π.', 'Объём = площадь основания × высота.', '9π · 4 = 36π.'],
        bad: 1, replies: ['3² = 9, основание найдено верно.', null, '9 · 4 = 36, проверь.'],
        line: '«Основание × высота» — это для призмы и цилиндра. У конуса ещё ⅓: 12π.' }
    ],
    fixes: ['Объём конуса — треть цилиндра: V = ⅓πr²h', 'V = ½πr²h', 'V = ⅓πrh', 'V = 2πr²h'],
    fixReplies: [null, '½ — это про треугольник. Конус помещается в цилиндр ровно трижды.', 'Радиус должен быть в квадрате: основание — круг.', 'Двойки там нет — наоборот, объём нужно делить.'],
    check: function () {
      var r = pick([3, 6]), h = ri(2, 10), sit = ri(0, 2);
      var q = ['Конус: радиус основания ' + r + ' см, высота ' + h + ' см. Найдите объём.', 'Вафельный рожок — конус радиусом ' + r + ' см и высотой ' + h + ' см. Сколько он вмещает?', 'Песок насыпан конусом: радиус ' + r + ' м, высота ' + h + ' м. Найдите объём кучи.'][sit];
      var u = sit === 2 ? ' м³' : ' см³';
      var a = r * r * h / 3, vals = uniq4([a, r * r * h, 4 * r * r * h / 3, r * h / 3]).sort(function (x, y) { return x - y; });
      return { q: q, opts: vals.map(function (x) { return x + 'π' + u; }), ans: vals.indexOf(a), params: { r: r, h: h }, why: 'V = ⅓πr²h = ⅓ · ' + (r * r) + ' · ' + h + ' π = ' + a + 'π' + u + '.' };
    }
  };

  ROUNDS['pct-new-base'] = {
    name: 'Процент от нового значения',
    versions: [
      { claim: 'Цена выросла со 100 до 125 тенге. Рост — 20%.',
        steps: ['Изменение: 125 − 100 = 25.', 'Делю изменение на новую цену: 25 / 125.', '25 / 125 = 0,2 = 20%.'],
        bad: 1, replies: ['125 − 100 = 25 — верно.', null, '25 / 125 = 0,2 — арифметика верная.'],
        line: 'Процент считают от того, что было: 25 от 100 — это 25%.' },
      { claim: 'Население посёлка упало с 8000 до 6000. Падение — примерно 33%.',
        steps: ['Изменение: 8000 − 6000 = 2000.', 'Делю изменение на новое число жителей: 2000 / 6000.', '2000 / 6000 ≈ 33%.'],
        bad: 1, replies: ['Разница 2000 — верно.', null, '2000 / 6000 ≈ 0,33 — тут всё правильно.'],
        line: 'Делить надо на 8000 — на то, что было: падение 25%.' }
    ],
    fixes: ['Делить нужно на исходное значение: изменение / было', 'Делить на среднее старого и нового', 'Делить изменение на само изменение', 'Брать новое / старое × 100%'],
    fixReplies: [null, 'Среднее нигде не используется — процент считают от исходного.', 'Изменение, делённое на само себя, всегда 100%.', 'Так получится новое в процентах от старого, а не изменение.'],
    check: function () {
      var c = pick([[80, 100], [200, 250], [50, 40], [400, 300], [60, 75], [250, 200], [120, 150], [500, 400]]), o = c[0], n = c[1], sit = ri(0, 2);
      var what = [['Цена выросла', 'Цена снизилась', ' ₸'], ['Число учеников выросло', 'Число учеников уменьшилось', ''], ['Зарплата выросла', 'Зарплата снизилась', ' ₸']][sit];
      var q = (n > o ? what[0] : what[1]) + ' с ' + o + what[2] + ' до ' + n + what[2] + '. На сколько процентов?';
      var f = function (x) { x = Math.round(x * 10) / 10; return (x > 0 ? '+' : '−') + String(Math.abs(x)).replace('.', ',') + '%'; };
      var right = (n - o) / o * 100;
      var vals = uniq4([f(right), f((n - o) / n * 100), f(n / o * 100), f(-right)]);
      var sorted = vals.slice().sort();
      return { q: q, opts: sorted, ans: sorted.indexOf(f(right)), params: { o: o, n: n }, why: '(' + n + ' − ' + o + ') / ' + o + ' × 100% = ' + f(right) + '.' };
    }
  };

  ROUNDS['revpct-subtract'] = {
    name: 'Обратный процент вычитанием',
    versions: [
      { claim: 'После повышения на 20% цена стала 120 ₸. Вычитаю 20% от 120 — раньше было 96 ₸.',
        steps: ['Новая цена: 120 ₸.', 'Убираю 20% от новой цены: 120 · 0,8.', '120 · 0,8 = 96 ₸.'],
        bad: 1, replies: ['120 ₸ — так дано.', null, '120 · 0,8 = 96 — посчитано верно.'],
        line: '20% считались от старой цены, а я отнял от новой. 120 : 1,2 = 100 ₸.' },
      { claim: 'После скидки 25% куртка стоит 6000 ₸. Прибавлю 25% к 6000 — было 7500 ₸.',
        steps: ['Цена со скидкой: 6000 ₸.', 'Возвращаю 25%, считая от цены со скидкой: 6000 · 1,25.', '6000 · 1,25 = 7500 ₸.'],
        bad: 1, replies: ['6000 ₸ — так дано.', null, '6000 · 1,25 = 7500, арифметика честная.'],
        line: 'Скидку брали от старой цены: 6000 — это 75% от неё. 6000 : 0,75 = 8000 ₸.' }
    ],
    fixes: ['Новая цена — это (100 ± r)% от старой: делить на этот множитель', 'Отнять или прибавить r тенге', 'Умножить новую цену на r/100', 'Считать, что старая цена равна новой'],
    fixReplies: [null, 'r — это проценты, а не тенге.', 'Так получится только сама надбавка, а не старая цена.', 'Цена же изменилась — значит, старая была другой.'],
    check: function () {
      for (var t = 0; t < 50; t++) {
        var r = pick([10, 20, 25, 50]), up = Math.random() < 0.5, old = pick([40, 60, 80, 120, 200, 300, 400]) * 10;
        var nw = old * (up ? 100 + r : 100 - r) / 100;
        var w1 = nw * (up ? 100 - r : 100 + r) / 100, w2 = up ? nw - r * 10 : nw + r * 10, w3 = nw * 100 / (up ? 100 - r : 100 + r);
        if ([nw, w1, w2, w3].some(function (x) { return x % 1; }) || r === 50 && !up) continue;
        var vals = uniq4([old, w1, w2, w3]); if (vals.length < 4) continue;
        vals.sort(function (a, b) { return a - b; });
        var sit = ri(0, 1);
        var q = (up ? 'После повышения на ' + r + '% ' : 'После скидки ' + r + '% ') + (sit ? 'телефон стоит ' : 'товар стоит ') + th(nw) + ' ₸. Сколько он стоил до этого?';
        return { q: q, opts: vals.map(function (x) { return th(x) + ' ₸'; }), ans: vals.indexOf(old), params: { r: r, up: up, nw: nw },
          why: th(nw) + ' — это ' + (up ? 100 + r : 100 - r) + '% от старой цены: ' + th(nw) + ' : ' + String((up ? 100 + r : 100 - r) / 100).replace('.', ',') + ' = ' + th(old) + ' ₸.' };
      }
    }
  };

  /* ================= storage: an event log, local first, synced to Supabase (stage16.sql) =================
     Events: { id: uuid, trap, kind: 'seen'|'round'|'check', at: ISO time, data: {...} }
     Buckets: prepline:twin-ev:guest and prepline:twin-ev:<user id>; unsent ids in prepline:twin-out:<bucket>.
     The state of every crack is rebuilt from the events sorted by time, never stored. */
  var bucket = 'guest';
  try { bucket = localStorage.getItem('prepline:twin-owner') || 'guest'; } catch (e) {}
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : r & 3 | 8).toString(16); });
  }
  function rd(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function evKey(b) { return 'prepline:twin-ev:' + (b || bucket); }
  function outKey(b) { return 'prepline:twin-out:' + (b || bucket); }
  function events(b) { return rd(evKey(b), []); }

  /* one-time move of the first local format (prepline:twin + prepline:twin-log) into guest events */
  (function migrate() {
    var old = rd(K, null); if (!old || rd('prepline:twin-migrated', 0)) return;
    var ev = events('guest'), out = rd(outKey('guest'), []), add = function (e) { ev.push(e); out.push(e.id); };
    Object.keys(old).forEach(function (trap) {
      (old[trap].runs || []).forEach(function (run) { add({ id: uuid(), trap: trap, kind: 'seen', at: new Date(run).toISOString(), data: { run: run } }); });
    });
    rd(LOGK, []).forEach(function (r) {
      add({ id: uuid(), trap: r.id, kind: r.kind === 'check' ? 'check' : 'round', at: new Date(r.at).toISOString(),
            data: { first: !!r.first, v: r.v || 0, steps: r.steps || [], fixes: r.fixes || [], check: r.check || [], ms: r.ms || 0 } });
    });
    wr(evKey('guest'), ev); wr(outKey('guest'), out); wr('prepline:twin-migrated', 1);
  })();

  /* rebuild every crack from the events in time order */
  function state() {
    var list = events().slice().sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : 1; });
    var m = {};
    list.forEach(function (e) {
      var c = m[e.trap] || (m[e.trap] = { state: 'suspected', runs: [], next: 0 }), t = Date.parse(e.at);
      if (e.kind === 'seen') {
        var run = e.data && e.data.run;
        if (c.runs.indexOf(run) < 0) c.runs.push(run);
        if (c.state === 'healing' || c.state === 'healed') c.state = 'confirmed';     // the mistake came back after healing
        else if (c.runs.length >= 2) c.state = 'confirmed';                             // seen in a second, separate quiz attempt
        c.seenAt = t;
      } else if (e.kind === 'round') {
        if (e.data.first) { c.state = 'healing'; c.healFrom = t; } else { c.state = 'confirmed'; c.next++; }
      } else if (e.kind === 'check') {
        if (e.data.first) c.state = 'healed'; else { c.state = 'confirmed'; c.next++; }
      }
    });
    return m;
  }
  function record(kind, trap, data, at) {
    var e = { id: uuid(), trap: trap, kind: kind, at: new Date(at || Date.now()).toISOString(), data: data || {} };
    var ev = events(); ev.push(e); wr(evKey(), ev.slice(-2000));
    var out = rd(outKey(), []); out.push(e.id); wr(outKey(), out);
    changed(); sync();
    return e;
  }
  function changed() { try { document.dispatchEvent(new CustomEvent('prepline:twin-changed')); } catch (e) {} }

  function trapFor(formulaName, optionText) {
    for (var i = 0; i < TRAPS.length; i++) if (TRAPS[i][1] === formulaName && TRAPS[i][2] === optionText) return TRAPS[i][0];
    return null;
  }
  /* the quiz reports a wrong option; runId identifies one quiz attempt (same run twice = one event) */
  function seen(formulaName, optionText, runId) {
    var id = trapFor(formulaName, optionText);
    if (!id) return null;
    var dup = events().some(function (e) { return e.kind === 'seen' && e.trap === id && e.data && e.data.run === runId; });
    if (!dup) record('seen', id, { run: runId });
    return id;
  }
  function checkDue(c) { return c && c.state === 'healing' && Date.now() >= (c.healFrom || 0) + 3 * DAY; }

  /* ---------- sync ---------- */
  var busy = false, again = false;
  function supa() { return window.preplineSupa || null; }
  function setOwner(uid) {
    var nb = uid || 'guest';
    if (nb === bucket) return;
    if (uid) {                                  // signing in: the guest's events join this account
      var g = events('guest'), gout = rd(outKey('guest'), []);
      if (g.length) {
        var ev = events(nb), have = {}; ev.forEach(function (e) { have[e.id] = 1; });
        g.forEach(function (e) { if (!have[e.id]) ev.push(e); });
        var out = rd(outKey(nb), []); g.forEach(function (e) { if (out.indexOf(e.id) < 0) out.push(e.id); });
        if (wr(evKey(nb), ev) && wr(outKey(nb), out)) { wr(evKey('guest'), []); wr(outKey('guest'), []); }
      }
      void gout;
    }
    bucket = nb; wr('prepline:twin-owner', nb === 'guest' ? null : nb);
    if (nb === 'guest') try { localStorage.removeItem('prepline:twin-owner'); } catch (e) {}
    changed();
  }
  function sync() {
    var s = supa(); if (!s || bucket === 'guest' || !navigator.onLine) return Promise.resolve(false);
    if (busy) { again = true; return Promise.resolve(false); }
    busy = true;
    var b = bucket, ev = events(b), out = rd(outKey(b), []);
    var byId = {}; ev.forEach(function (e) { byId[e.id] = e; });
    var rows = out.map(function (id) { return byId[id]; }).filter(Boolean)
      .map(function (e) { return { id: e.id, trap: e.trap, kind: e.kind, at: e.at, data: e.data }; });
    var push = rows.length ? s.from('twin_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }) : Promise.resolve({ error: null });
    return push.then(function (r) {
      if (r.error) throw r.error;
      var sent = {}; rows.forEach(function (x) { sent[x.id] = 1; });
      wr(outKey(b), rd(outKey(b), []).filter(function (id) { return !sent[id]; }));   // only what the server accepted
      return s.from('twin_events').select('id,trap,kind,at,data').order('at', { ascending: true }).limit(5000);
    }).then(function (r) {
      if (r.error) throw r.error;
      if (b !== bucket) return false;
      var local = events(b), have = {}; local.forEach(function (e) { have[e.id] = 1; });
      var added = 0;
      (r.data || []).forEach(function (e) { if (!have[e.id]) { local.push({ id: e.id, trap: e.trap, kind: e.kind, at: new Date(e.at).toISOString(), data: e.data || {} }); added++; } });
      if (added) { wr(evKey(b), local); changed(); }
      return true;
    }).catch(function (e) { console.warn('[Prepline] twin sync:', e && e.message); return false; })
      .then(function (ok) { busy = false; if (again) { again = false; sync(); } return ok; });
  }
  function watchAuth() {
    var s = supa();
    if (!s) { if (watchAuth.n = (watchAuth.n || 0) + 1, watchAuth.n < 40) setTimeout(watchAuth, 250); return; }
    s.auth.getSession().then(function (r) { var u = r.data && r.data.session && r.data.session.user; setOwner(u ? u.id : null); sync(); });
    s.auth.onAuthStateChange(function (ev, session) {
      var u = session && session.user;
      if (ev === 'SIGNED_OUT') setOwner(null);
      else if (u) { setOwner(u.id); sync(); }
    });
  }
  window.addEventListener('online', function () { sync(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAuth); else setTimeout(watchAuth, 0);

  window.PreplineTwin = { TRAPS: TRAPS, ROUNDS: ROUNDS, state: state, record: record, events: events, trapFor: trapFor, seen: seen,
    checkDue: checkDue, sync: sync, pending: function () { return rd(outKey(), []).length; }, owner: function () { return bucket; }, DAY: DAY };
})();
