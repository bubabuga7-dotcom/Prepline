/* Prepline: Russian hints for tricky English words in questions.
   On in Fast mode and on the results screen; off in Exam mode (window.PL_MODE from test-ux.js). Tap or hover a dotted word. */
(function () {
  if (typeof questions === 'undefined' || window.PL_GLOSSARY) return;
  var G = window.PL_GLOSSARY = {
    'except': 'кроме, за исключением', 'at least': 'не меньше, хотя бы', 'at most': 'не больше, максимум', 'consecutive': 'идущие подряд',
    'respectively': 'соответственно', 'inclusive': 'включительно', 'integer': 'целое число', 'integers': 'целые числа',
    'remainder': 'остаток', 'quotient': 'частное', 'product': 'произведение', 'sum': 'сумма', 'difference': 'разность',
    'multiple': 'кратное', 'multiples': 'кратные', 'factor': 'делитель, множитель', 'factors': 'делители, множители',
    'perpendicular': 'перпендикулярный', 'parallel': 'параллельный', 'adjacent': 'прилежащий, соседний', 'hypotenuse': 'гипотенуза',
    'circumference': 'длина окружности', 'perimeter': 'периметр', 'cuboid': 'прямоугольный параллелепипед', 'prism': 'призма',
    'cylinder': 'цилиндр', 'cone': 'конус', 'sphere': 'шар, сфера', 'hemisphere': 'полушар', 'vertex': 'вершина', 'vertices': 'вершины',
    'bearing': 'азимут', 'gradient': 'угловой коэффициент', 'intercept': 'точка пересечения с осью', 'inequality': 'неравенство',
    'simplify': 'упростить', 'expand': 'раскрыть скобки', 'factorise': 'разложить на множители', 'factorize': 'разложить на множители',
    'evaluate': 'вычислить значение', 'estimate': 'оценить, прикинуть', 'approximately': 'приблизительно', 'to the nearest': 'с точностью до',
    'significant figures': 'значащие цифры', 'decimal places': 'знаки после запятой', 'mean': 'среднее арифметическое', 'median': 'медиана',
    'at random': 'наугад, случайно', 'independent': 'независимые', 'discount': 'скидка', 'interest': 'проценты (по вкладу)',
    'profit': 'прибыль', 'depreciation': 'потеря стоимости', 'assumption': 'допущение', 'conclusion': 'вывод', 'flaw': 'ошибка в рассуждении',
    'weaken': 'ослабить', 'strengthen': 'усилить', 'reliably': 'надёжно, достоверно', 'implies': 'подразумевает', 'whereas': 'тогда как',
    'nevertheless': 'тем не менее', 'unless': 'если не', 'neither': 'ни один из (двух)', 'twice': 'вдвое, дважды', 'exceed': 'превышать',
    'fewer than': 'меньше чем', 'no more than': 'не больше чем', 'no fewer than': 'не меньше чем', 'per': 'на, за каждый',
    'underlying': 'лежащий в основе', 'principle': 'принцип', 'illustrates': 'иллюстрирует', 'parallels': 'аналогично', 'mutually exclusive': 'несовместные'
  };
  var keys = Object.keys(G).sort(function (a, b) { return b.length - a.length; });
  var SRC = '\\b(' + keys.map(function (k) { return k.replace(/ /g, '\\s+'); }).join('|') + ')\\b';
  var RE = new RegExp(SRC, 'gi'), RE1 = new RegExp(SRC, 'i');

  var css = document.createElement('style');
  css.textContent = '.gl{border-bottom:1px dotted currentColor;cursor:help;position:relative}' +
    '.gl.show::after{content:attr(data-ru);position:absolute;left:0;top:calc(100% + 4px);z-index:50;white-space:nowrap;' +
    'background:#2B2F36;color:#F2F3F5;font:500 13px/1.3 Inter,system-ui,sans-serif;padding:5px 9px;border-radius:5px;box-shadow:0 6px 18px rgba(0,0,0,.35);text-transform:none;letter-spacing:0}' +
    'html[data-theme=light] .gl.show::after{background:#2B2F36;color:#fff}';
  document.head.appendChild(css);

  function on() { return window.PL_MODE === 'fast' || (typeof state !== 'undefined' && state.finished); }
  function annotate(root) {
    if (root.getAttribute('data-gl')) return;
    root.setAttribute('data-gl', '1');
    var seen = {}, walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        for (var p = n.parentNode; p && p !== root; p = p.parentNode)
          if (p.classList && (p.classList.contains('katex') || p.classList.contains('gl')) || /^(SCRIPT|STYLE|BUTTON|A)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return RE1.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var t = n.nodeValue, out = document.createDocumentFragment(), last = 0, m;
      RE.lastIndex = 0;
      while ((m = RE.exec(t))) {
        var k = m[1].toLowerCase().replace(/\s+/g, ' ');
        if (seen[k]) continue;
        seen[k] = 1;
        out.appendChild(document.createTextNode(t.slice(last, m.index)));
        var s = document.createElement('span'); s.className = 'gl'; s.tabIndex = 0; s.setAttribute('data-ru', G[k]); s.textContent = m[1];
        out.appendChild(s); last = m.index + m[1].length;
      }
      if (!last) return;
      out.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(out, n);
    });
  }
  function scan() {
    if (!on()) return;
    [].forEach.call(document.querySelectorAll('.question, .pl-text, .review-item > div > span:first-child'), annotate);
  }
  var pend = null;
  new MutationObserver(function () { if (!pend) pend = setTimeout(function () { pend = null; scan(); }, 60); })
    .observe(document.body, { childList: true, subtree: true });
  document.addEventListener('prepline:started', scan);
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('.gl');
    [].forEach.call(document.querySelectorAll('.gl.show'), function (x) { if (x !== g) x.classList.remove('show'); });
    if (g) { g.classList.add('show'); e.stopPropagation(); }
  }, true);
  document.addEventListener('mouseover', function (e) { var g = e.target.closest && e.target.closest('.gl'); if (g) g.classList.add('show'); });
  document.addEventListener('mouseout', function (e) { var g = e.target.closest && e.target.closest('.gl'); if (g) g.classList.remove('show'); });
  scan();
})();
