/* Prepline: which Formula quiz formulas a question topic uses (topic code -> formula names in formulas.html). */
window.PREPLINE_TOPIC_FORMULAS = (function () {
  var IDX = ['Multiplying powers', 'Dividing powers', 'Power of a power', 'Negative power', 'Fractional power', 'Zero power (a ≠ 0)'];
  var PCT = ['Percentage change', 'Original price before an increase of r%'];
  var EXP = ['Square of a sum', 'Square of a difference', 'Difference of two squares', 'Cube of a sum'];
  var QUAD = ['Solutions of ax² + bx + c = 0', 'Discriminant of ax² + bx + c', 'Sum of the roots of ax² + bx + c = 0', 'Product of the roots of ax² + bx + c = 0'];
  var LINE = ['Gradient of the line through (x₁, y₁) and (x₂, y₂)', 'Line with gradient m through (x₁, y₁)', 'Gradients of perpendicular lines'];
  var COORD = ['Midpoint of (x₁, y₁) and (x₂, y₂)', 'Distance between (x₁, y₁) and (x₂, y₂)', 'Circle with centre (a, b) and radius r'];
  var SOLID = ['Volume of a cylinder', 'Volume of a cone', 'Volume of a sphere', 'Volume of a hemisphere', 'Surface area of a sphere',
               'Curved surface area of a cylinder', 'Curved surface area of a cone (l is the slant height)'];
  var TRIG = ['sin θ in a right-angled triangle', 'cos θ in a right-angled triangle', 'tan θ in a right-angled triangle', 'Sine rule', 'Cosine rule',
              'Area of a triangle from two sides and the angle between them', 'Pythagorean identity'];
  var SEQ = ['n-th term of an arithmetic sequence', 'Sum of the first n terms of an arithmetic sequence', 'n-th term of a geometric sequence', 'Sum 1 + 2 + 3 + … + n'];
  var SIM = ['Area scale factor of similar shapes with length scale factor k', 'Volume scale factor of similar solids with length scale factor k'];
  return {
    'M1.1': ['Speed', 'Density', 'Pressure'],
    'M2.7': IDX, 'M4.2': IDX,
    'M2.10': PCT, 'M3.8': PCT,
    'M3.11': ['Value after n years of compound growth at r% a year', 'Simple interest'],
    'M3.6': ['y is inversely proportional to x'], 'M3.9': ['y is inversely proportional to x'],
    'M3.10': SIM, 'M5.17': SIM, 'M5.5': SIM,
    'M4.4': EXP, 'M4.5': EXP, 'M4.6': EXP, 'M4.8': EXP,
    'M4.16': QUAD, 'M4.11': ['x-coordinate of the vertex of y = ax² + bx + c'].concat(QUAD),
    'M4.10': LINE, 'M4.14': LINE, 'M4.9': COORD, 'M5.10': COORD.concat(LINE),
    'M5.2': ['Sum of the interior angles of an n-sided polygon', 'Each exterior angle of a regular n-sided polygon', 'Each interior angle of a regular n-sided polygon'],
    'M5.3': ['Area of a triangle', 'Pythagoras’ theorem (c is the hypotenuse)'],
    'M5.7': ['Pythagoras’ theorem (c is the hypotenuse)', 'Distance between (x₁, y₁) and (x₂, y₂)'],
    'M5.8': ['Area of a circle', 'Circumference of a circle'],
    'M5.14': ['Volume of a prism', 'Volume of a pyramid', 'Area of a trapezium', 'Area of a parallelogram', 'Area of a triangle'],
    'M5.15': SOLID.concat(['Area of a circle', 'Circumference of a circle']),
    'M5.16': ['Arc length (angle θ in degrees)', 'Area of a sector (angle θ in degrees)'],
    'M5.18': TRIG,
    'M4.18': SEQ, 'M4.19': SEQ
  };
})();
