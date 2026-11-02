/* Shyn twin: misconceptions caught in the Formula quiz become cracks in "You v1.0".
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
    ['area-k', 'Area scale factor of similar shapes with length scale factor k', I('k'), 'Area increases by a factor of k'],
    ['vol-k2', 'Volume scale factor of similar solids with length scale factor k', I('k') + '²', 'Volume increases by a factor of k²'],
    ['circle-area-2pr', 'Area of a circle', I('A') + ' = 2π' + I('r'), 'Area of a circle = 2πr'],
    ['circum-pr2', 'Circumference of a circle', I('C') + ' = π' + I('r') + '²', 'Circumference = πr²'],
    ['arc-no-2', 'Arc length (angle θ in degrees)', I('l') + ' = {θ|360} × π' + I('r'), 'Arc without the factor of two'],
    ['sector-2pr', 'Area of a sector (angle θ in degrees)', I('A') + ' = {θ|360} × 2π' + I('r'), 'Sector using 2πr'],
    ['tri-no-half', 'Area of a triangle', I('A') + ' = base × height', 'Triangle without ½'],
    ['para-slant', 'Area of a parallelogram', I('A') + ' = base × slanted side', 'Parallelogram using the slanted side'],
    ['cone-no-third', 'Volume of a cone', I('V') + ' = π' + I('r') + '²' + I('h'), 'Cone without ⅓'],
    ['sphere-4pr2', 'Volume of a sphere', I('V') + ' = 4π' + I('r') + '²', 'Volume of a sphere = 4πr²'],
    ['pct-new-base', 'Percentage change', '{new − old|new} × 100%', 'Percentage of the new value'],
    ['revpct-subtract', 'Original price before an increase of r%', 'original = new × (1 − {' + I('r') + '|100})', 'Reverse percentage by subtraction'],
    ['compound-simple', 'Value after n years of compound growth at r% a year', I('A') + ' = ' + I('P') + '(1 + {' + I('rn') + '|100})', 'Compound interest treated as simple interest'],
    ['pow-mult', 'Multiplying powers', I('a') + '^{' + I('mn') + '}', 'aᵐ·aⁿ = aᵐⁿ'],
    ['neg-pow', 'Negative power', '−' + I('a') + '^{' + I('n') + '}', 'a⁻ⁿ = −aⁿ'],
    ['frac-pow-swap', 'Fractional power', '(ᵐ√' + I('a') + ')^{' + I('n') + '}', 'Root and power mixed up'],
    ['sq-sum', 'Square of a sum', I('a') + '² + ' + I('b') + '²', '(a + b)² = a² + b²'],
    ['quad-plus-b', 'Solutions of ax² + bx + c = 0', I('x') + ' = {' + I('b') + ' ± sqrt{' + I('b') + '² − 4' + I('ac') + '}|2' + I('a') + '}', '+b instead of −b in the quadratic formula'],
    ['vertex-sign', 'x-coordinate of the vertex of y = ax² + bx + c', I('x') + ' = {' + I('b') + '|2' + I('a') + '}', 'Vertex at b/2a'],
    ['grad-flip', 'Gradient of the line through (x₁, y₁) and (x₂, y₂)', I('m') + ' = {' + I('x') + '₂ − ' + I('x') + '₁|' + I('y') + '₂ − ' + I('y') + '₁}', 'Gradient Δx/Δy'],
    ['perp-equal', 'Gradients of perpendicular lines', I('m') + '₁ = ' + I('m') + '₂', 'Perpendicular = equal gradients'],
    ['ap-nd', 'n-th term of an arithmetic sequence', I('a') + 'ₙ = ' + I('a') + ' + ' + I('nd'), 'n-th term a + nd'],
    ['pyth-no-squares', 'Pythagoras’ theorem (c is the hypotenuse)', I('a') + ' + ' + I('b') + ' = ' + I('c'), 'Pythagoras without squares'],
    ['cos-plus', 'Cosine rule', I('a') + '² = ' + I('b') + '² + ' + I('c') + '² + 2' + I('bc') + ' cos ' + I('A'), '+2bc cos A in the cosine rule'],
    ['poly-n180', 'Sum of the interior angles of an n-sided polygon', I('n') + ' × 180°', 'Sum of angles n × 180°']
  ];

  /* rounds: only area-k for now. A version = the twin's argument with one wrong step. */
  var ROUNDS = {
    'area-k': {
      name: 'Area increases by a factor of k',
      versions: [
        { claim: 'The radius of a circle increased from 3 to 6. I’ll prove that the area doubled. I’m sure.',
          steps: ['Area of a circle: S = πr².', 'The radius increased by 6 : 3 = 2 times.', 'So the area doubled.'],
          bad: 2, replies: ['The formula is correct, and that’s what I’m using.', '6 : 3 = 2, that’s definitely right.', null],
          line: 'I only looked at the radius. Now I see the square: π·6² = 36π, and π·3² = 9π — that’s 4 times as much.' },
        { claim: 'A square’s side increased from 4 to 12. The area tripled — obviously.',
          steps: ['Area of a square: S = a².', 'The side increased by 12 : 4 = 3 times.', 'So the area tripled.'],
          bad: 2, replies: ['S = a² — I remember that.', '12 : 4 = 3, check it yourself.', null],
          line: 'I only looked at the side again. 12² = 144, while 4² = 16 — that’s 9 times as much, or 3².' },
        { claim: 'Two similar triangles have sides in the ratio 2 : 5. So their areas are also 2 : 5.',
          steps: ['The triangles are similar, with scale factor k = 5/2.', 'Every side of the larger triangle is 5/2 times as long.', 'So the larger area is 5/2 times as big: areas 2 : 5.'],
          bad: 2, replies: ['The triangles really are similar — the question says so.', 'The sides really are multiplied by k.', null],
          line: 'Area is length times length, so we use k twice: areas 4 : 25.' }
      ],
      fixes: ['You need to square the length scale factor: area increases by a factor of k²',
              'You need to add the old and new lengths',
              'Area grows at the same rate as perimeter, so the answer is correct',
              'You need to cube the scale factor: area increases by a factor of k³'],
      fixReplies: [null,
              'Adding lengths is about perimeter. Area is length times length.',
              'Perimeter really does increase by a factor of k. But what about area? How many dimensions change?',
              'Cubing works for volume. We’re finding area — how many dimensions change?'],
      check: function (k, up, shapeIdx) {
        k = k || 2 + Math.floor(Math.random() * 4);
        if (up === undefined) up = Math.random() < 0.5;
        if (shapeIdx === undefined) shapeIdx = Math.floor(Math.random() * 3);
        var shape = [['the radius of a circle', 'the area of a circle'], ['the side of a square', 'the area of a square'], ['all sides of a triangle', 'its area (same shape)']][shapeIdx];
        var word = { 2: 'by a factor of 2', 3: 'by a factor of 3', 4: 'by a factor of 4', 5: 'by a factor of 5' }[k];
        var vals = [];                                   // k, k², k³ and one more slip, all different
        [k, k * k, k * k * k, 2 * k, k * k + k, k * k - 1].forEach(function (x) { if (vals.length < 4 && vals.indexOf(x) < 0) vals.push(x); });
        vals.sort(function (a, b) { return a - b; });
        var raz = function (x) { var d = x % 10, h = x % 100; return x + ' times'; };
        return { q: (up ? 'You multiply ' : 'You divide ') + shape[0] + ' by ' + k + '. By what factor does ' + shape[1] + ' ' + (up ? 'increase' : 'decrease') + '?',
          opts: vals.map(raz), ans: vals.indexOf(k * k), k: k,
          why: 'Area changes by a factor of k² = ' + k + '² = ' + (k * k) + '.' };
      }
    }
  };

  /* ---------- batch 2 ---------- */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function raz(x) { var d = x % 10, h = x % 100; return x + ' times'; }
  function uniq4(vals) { var out = []; vals.forEach(function (x) { if (out.length < 4 && out.indexOf(x) < 0) out.push(x); }); return out; }
  function th(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  ROUNDS['vol-k2'] = {
    name: 'Volume increases by a factor of k²',
    versions: [
      { claim: 'A cube’s edge doubled — its volume quadrupled. I’m sure.',
        steps: ['Volume of a cube: V = a³.', 'The edge doubled.', 'So the volume increased by 2² = 4 times.'],
        bad: 2, replies: ['V = a³ — the formula is correct.', 'It was a, now it’s 2a — twice as long, no mistake there.', null],
        line: 'I only counted two dimensions. Volume has three: 2³ = 8.' },
      { claim: 'Two similar containers have heights in the ratio 1 : 3. The smaller holds 200 ml, so the larger holds 1800 ml.',
        steps: ['The containers are similar, with scale factor k = 3.', 'Every dimension of the larger container is 3 times as big.', 'So the volume is 3² = 9 times as large: 1800 ml.'],
        bad: 2, replies: ['The question says they’re similar.', 'If they’re similar, all dimensions scale equally.', null],
        line: 'Length, width, and height — three factors: 3³ = 27, so 5400 ml.' }
    ],
    fixes: ['Volume changes by a factor of k³: length, width, and height all increase', 'Volume changes by a factor of k, just like length', 'Volume changes by a factor of 2k', 'You need to add: k + k²'],
    fixReplies: [null, 'Only length changes by a factor of k. How many dimensions does volume have?', '2k just means doubling. Compare 1³ and 2³.', 'Addition doesn’t apply here — the dimensions are multiplied.'],
    check: function () {
      var k = ri(2, 5), sit = ri(0, 2), word = { 2: 'by a factor of 2', 3: 'by a factor of 3', 4: 'by a factor of 4', 5: 'by a factor of 5' }[k];
      var q = [
        'A cube’s edge was increased ' + word + '. By what factor did the cube’s volume increase?',
        'Two similar bottles have heights in the ratio 1 : ' + k + '. How many times more does the larger bottle hold?',
        'Two similar statues made of the same metal have heights in the ratio 1 : ' + k + '. How many times heavier is the larger one?'][sit];
      var vals = uniq4([k, k * k, k * k * k, 3 * k, k * k + k]).sort(function (a, b) { return a - b; });
      return { q: q, opts: vals.map(raz), ans: vals.indexOf(k * k * k), params: { k: k }, why: 'Volume (and mass) change by a factor of k³ = ' + k + '³ = ' + (k * k * k) + '.' };
    }
  };

  ROUNDS['circle-area-2pr'] = {
    name: 'Area of a circle = 2πr',
    versions: [
      { claim: 'A circle has radius 3, so its area is 6π. Couldn’t be simpler.',
        steps: ['Radius r = 3.', 'Area of a circle: S = 2πr.', '2π · 3 = 6π.'],
        bad: 1, replies: ['r = 3 — that’s given.', null, '2 · 3 = 6, I can do the math.'],
        line: '2πr is the circumference. Area is πr²: 9π, not 6π.' },
      { claim: 'A round table has a diameter of 10 dm. Its area is 10π dm².',
        steps: ['Radius r = 10 : 2 = 5 dm.', 'Area of a circle: S = 2πr.', '2π · 5 = 10π dm².'],
        bad: 1, replies: ['The radius is half the diameter, that’s correct.', null, '2 · 5 = 10, no mistakes there.'],
        line: 'I used the circumference formula again. Area is π · 5² = 25π dm².' }
    ],
    fixes: ['Area of a circle S = πr²; 2πr is the circumference', 'S = πd², using the diameter', 'S = 2πr²', 'S = πr'],
    fixReplies: [null, 'πd² is four times too large: d = 2r, and d² = 4r².', 'An extra factor of two: 2πr² is not the area of a circle.', 'πr is half the circumference, not the area.'],
    check: function () {
      var r = ri(3, 9), sit = ri(0, 2);
      var q = ['Find the area of a circle with radius ' + r + ' cm.', 'A circular flower bed has a diameter of ' + (2 * r) + ' m. Find its area.', 'Find the area of a round pizza with radius ' + r + ' cm.'][sit];
      var u = sit === 1 ? ' m²' : ' cm²';
      var vals = uniq4([r * r, 2 * r, 4 * r * r, 2 * r * r]).sort(function (a, b) { return a - b; });
      return { q: q, opts: vals.map(function (x) { return x + 'π' + u; }), ans: vals.indexOf(r * r), params: { r: r }, why: 'S = πr² = π · ' + r + '² = ' + (r * r) + 'π' + u + '.' };
    }
  };

  ROUNDS['cone-no-third'] = {
    name: 'Cone without ⅓',
    versions: [
      { claim: 'A cone and a cylinder with the same base and height hold the same amount. Shape doesn’t matter.',
        steps: ['Volume of a cylinder: V = πr²h.', 'The cone has the same base and height.', 'So the cone’s volume is also πr²h.'],
        bad: 2, replies: ['V = πr²h — that’s correct for a cylinder.', 'That’s given in the question.', null],
        line: 'A cone narrows toward its tip — it holds only a third of the cylinder’s volume: ⅓πr²h.' },
      { claim: 'Cone: r = 3, h = 4. Volume is 36π.',
        steps: ['Base area: π · 3² = 9π.', 'Volume = base area × height.', '9π · 4 = 36π.'],
        bad: 1, replies: ['3² = 9, the base area is correct.', null, '9 · 4 = 36, check it.'],
        line: '“Base area × height” works for prisms and cylinders. A cone also needs ⅓: 12π.' }
    ],
    fixes: ['A cone’s volume is one-third of a cylinder’s: V = ⅓πr²h', 'V = ½πr²h', 'V = ⅓πrh', 'V = 2πr²h'],
    fixReplies: [null, '½ is for triangles. A cone fits into the corresponding cylinder exactly three times.', 'The radius must be squared: the base is a circle.', 'There’s no factor of two — you actually need to divide the volume.'],
    check: function () {
      var r = pick([3, 6]), h = ri(2, 10), sit = ri(0, 2);
      var q = ['Cone: base radius ' + r + ' cm, height ' + h + ' cm. Find the volume.', 'An ice cream cone has a radius of ' + r + ' cm and a height of ' + h + ' cm. How much can it hold?', 'A pile of sand forms a cone: radius ' + r + ' m, height ' + h + ' m. Find the pile’s volume.'][sit];
      var u = sit === 2 ? ' m³' : ' cm³';
      var a = r * r * h / 3, vals = uniq4([a, r * r * h, 4 * r * r * h / 3, r * h / 3]).sort(function (x, y) { return x - y; });
      return { q: q, opts: vals.map(function (x) { return x + 'π' + u; }), ans: vals.indexOf(a), params: { r: r, h: h }, why: 'V = ⅓πr²h = ⅓ · ' + (r * r) + ' · ' + h + ' π = ' + a + 'π' + u + '.' };
    }
  };

  ROUNDS['pct-new-base'] = {
    name: 'Percentage of the new value',
    versions: [
      { claim: 'The price rose from 100 to 125 tenge. That’s a 20% increase.',
        steps: ['Change: 125 − 100 = 25.', 'I divide the change by the new price: 25 / 125.', '25 / 125 = 0,2 = 20%.'],
        bad: 1, replies: ['125 − 100 = 25 — correct.', null, '25 / 125 = 0.2 — the calculation is correct.'],
        line: 'You calculate the percentage from the original value: 25 out of 100 is 25%.' },
      { claim: 'A town’s population dropped from 8000 to 6000. That’s a decrease of about 33%.',
        steps: ['Change: 8000 − 6000 = 2000.', 'I divide the change by the new population: 2000 / 6000.', '2000 / 6000 ≈ 33%.'],
        bad: 1, replies: ['The difference is 2000 — correct.', null, '2000 / 6000 ≈ 0.33 — that’s correct.'],
        line: 'You need to divide by 8000 — the original population: a 25% decrease.' }
    ],
    fixes: ['You need to divide by the original value: change / original', 'Divide by the average of the old and new values', 'Divide the change by itself', 'Take new / old × 100%'],
    fixReplies: [null, 'You don’t use the average here — percentages are calculated from the original value.', 'The change divided by itself is always 100%.', 'That gives you the new value as a percentage of the old one, not the change.'],
    check: function () {
      var c = pick([[80, 100], [200, 250], [50, 40], [400, 300], [60, 75], [250, 200], [120, 150], [500, 400]]), o = c[0], n = c[1], sit = ri(0, 2);
      var what = [['Price increased', 'Price decreased', ' ₸'], ['Number of students increased', 'Number of students decreased', ''], ['Salary increased', 'Salary decreased', ' ₸']][sit];
      var q = (n > o ? what[0] : what[1]) + ' from ' + o + what[2] + ' to ' + n + what[2] + '. By what percentage?';
      var f = function (x) { x = Math.round(x * 10) / 10; return (x > 0 ? '+' : '−') + String(Math.abs(x)) + '%'; };
      var right = (n - o) / o * 100;
      var vals = uniq4([f(right), f((n - o) / n * 100), f(n / o * 100), f(-right)]);
      var sorted = vals.slice().sort();
      return { q: q, opts: sorted, ans: sorted.indexOf(f(right)), params: { o: o, n: n }, why: '(' + n + ' − ' + o + ') / ' + o + ' × 100% = ' + f(right) + '.' };
    }
  };

  ROUNDS['revpct-subtract'] = {
    name: 'Reverse percentage by subtraction',
    versions: [
      { claim: 'After a 20% increase, the price is 120 ₸. I’ll subtract 20% from 120 — the original price was 96 ₸.',
        steps: ['New price: 120 ₸.', 'I remove 20% from the new price: 120 · 0.8.', '120 · 0,8 = 96 ₸.'],
        bad: 1, replies: ['120 ₸ — that’s given.', null, '120 · 0.8 = 96 — the calculation is correct.'],
        line: 'The 20% was based on the old price, but I subtracted it from the new one. 120 : 1.2 = 100 ₸.' },
      { claim: 'After a 25% discount, a jacket costs 6000 ₸. I’ll add 25% to 6000 — the original price was 7500 ₸.',
        steps: ['Discounted price: 6000 ₸.', 'I add back 25%, calculated from the discounted price: 6000 · 1.25.', '6000 · 1,25 = 7500 ₸.'],
        bad: 1, replies: ['6000 ₸ — that’s given.', null, '6000 · 1.25 = 7500, the calculation is correct.'],
        line: 'The discount was based on the original price: 6000 is 75% of it. 6000 : 0.75 = 8000 ₸.' }
    ],
    fixes: ['The new price is (100 ± r)% of the old price: divide by this factor', 'Subtract or add r tenge', 'Multiply the new price by r/100', 'Assume the old price equals the new price'],
    fixReplies: [null, 'r is a percentage, not an amount in tenge.', 'That only gives you the extra amount, not the original price.', 'The price changed — so the original price was different.'],
    check: function () {
      for (var t = 0; t < 50; t++) {
        var r = pick([10, 20, 25, 50]), up = Math.random() < 0.5, old = pick([40, 60, 80, 120, 200, 300, 400]) * 10;
        var nw = old * (up ? 100 + r : 100 - r) / 100;
        var w1 = nw * (up ? 100 - r : 100 + r) / 100, w2 = up ? nw - r * 10 : nw + r * 10, w3 = nw * 100 / (up ? 100 - r : 100 + r);
        if ([nw, w1, w2, w3].some(function (x) { return x % 1; }) || r === 50 && !up) continue;
        var vals = uniq4([old, w1, w2, w3]); if (vals.length < 4) continue;
        vals.sort(function (a, b) { return a - b; });
        var sit = ri(0, 1);
        var q = (up ? 'After an increase of ' + r + '%, ' : 'After a discount of ' + r + '%, ') + (sit ? 'the phone costs ' : 'the item costs ') + th(nw) + ' ₸. How much did it cost before?';
        return { q: q, opts: vals.map(function (x) { return th(x) + ' ₸'; }), ans: vals.indexOf(old), params: { r: r, up: up, nw: nw },
          why: th(nw) + ' is ' + (up ? 100 + r : 100 - r) + '% of the original price: ' + th(nw) + ' : ' + String((up ? 100 + r : 100 - r) / 100) + ' = ' + th(old) + ' ₸.' };
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
    }).catch(function (e) { console.warn('[Shyn] twin sync:', e && e.message); return false; })
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
