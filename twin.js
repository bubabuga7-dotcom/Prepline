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
          bad: 2, replies: ['Формула верная, я ею и пользуюсь.', '6 : 3 = 2, тут всё честно.'],
          line: 'Я смотрел только на радиус. Теперь вижу квадрат: π·6² = 36π, а π·3² = 9π — в 4 раза.' },
        { claim: 'Сторону квадрата увеличили с 4 до 12. Площадь выросла в 3 раза — это же очевидно.',
          steps: ['Площадь квадрата: S = a².', 'Сторона увеличилась в 12 : 4 = 3 раза.', 'Значит, площадь увеличилась в 3 раза.'],
          bad: 2, replies: ['S = a² — это я помню.', '12 : 4 = 3, проверь сам.'],
          line: 'Я снова смотрел только на сторону. 12² = 144, а 4² = 16 — в 9 раз, то есть 3².' },
        { claim: 'Два подобных треугольника, стороны относятся как 2 : 5. Значит, и площади 2 : 5.',
          steps: ['Треугольники подобны, коэффициент подобия k = 5/2.', 'Все стороны большого в 5/2 раза длиннее.', 'Значит, площадь большого в 5/2 раза больше: площади 2 : 5.'],
          bad: 2, replies: ['Подобие тут честное — так дано в условии.', 'Стороны действительно умножаются на k.'],
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
        var shape = [['радиус круга', 'площадь круга'], ['сторону квадрата', 'площадь квадрата'], ['все стороны треугольника, сохранив форму', 'его площадь']][shapeIdx];
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

  function load() { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } }
  function save(m) { try { localStorage.setItem(K, JSON.stringify(m)); } catch (e) {} }
  function log(entry) {
    try { var l = JSON.parse(localStorage.getItem(LOGK) || '[]'); l.push(entry); localStorage.setItem(LOGK, JSON.stringify(l.slice(-500))); } catch (e) {}
  }
  function trapFor(formulaName, optionText) {
    for (var i = 0; i < TRAPS.length; i++) if (TRAPS[i][1] === formulaName && TRAPS[i][2] === optionText) return TRAPS[i][0];
    return null;
  }
  /* the quiz reports a wrong option; runId identifies one quiz attempt */
  function seen(formulaName, optionText, runId) {
    var id = trapFor(formulaName, optionText);
    if (!id) return null;
    var m = load(), c = m[id] || (m[id] = { state: 'suspected', runs: [] });
    if (c.runs.indexOf(runId) < 0) c.runs = c.runs.concat([runId]).slice(-10);
    c.seenAt = Date.now();
    if (c.state === 'healing' || c.state === 'healed') c.state = 'confirmed';         // the mistake came back
    else if (c.runs.length >= 2) c.state = 'confirmed';                                  // a second, separate attempt
    save(m);
    return id;
  }
  function checkDue(c) { return c && c.state === 'healing' && Date.now() >= (c.healFrom || 0) + 3 * DAY; }

  window.PreplineTwin = { TRAPS: TRAPS, ROUNDS: ROUNDS, load: load, save: save, log: log, trapFor: trapFor, seen: seen, checkDue: checkDue, DAY: DAY };
})();
