# -*- coding: utf-8 -*-
"""
Prepline: переводит интерфейс сайта на английский.

Меняет всё, что видит пользователь: меню, заголовки страниц, кнопки,
подписи, экраны результатов, страницу «Что такое NUET» вместе с полной
спецификацией, а также служебные комментарии в коде.

Замена идёт по точному совпадению строки, от самых длинных к коротким,
поэтому повторный запуск безопасен и ничего не ломает.

Как запустить:
  положить в папку Prepline и выполнить:  python translate-ui.py

Безопасность: оригиналы копируются в backup-ui/
"""

import glob
import os
import re
import shutil
import sys

BACKUP = "backup-ui"

T = {
# ---------- длинные абзацы: intro.html ----------
"NUET (Nazarbayev University Entrance Test) — вступительный тест Nazarbayev University. Раньше он назывался NUFYPET. Тест разработан вместе с Cambridge Assessment International Education (Кембриджский университет), а принимает его Center for Preparatory Studies (CPS) университета. Экзамен платный — взнос":
 "NUET (Nazarbayev University Entrance Test) is the entrance test for Nazarbayev University. It was formerly known as NUFYPET. The test was developed together with Cambridge Assessment International Education, and it is administered by the university's Center for Preparatory Studies (CPS). There is an entry fee of",
", оплачивается при подаче заявки на admissions.nu.edu.kz; ближе к концу периода подачи заявок стоимость может вырасти, поэтому не стоит тянуть с регистрацией. Апелляции результатов не предусмотрено.":
 ", paid when you apply at admissions.nu.edu.kz. The fee may rise towards the end of the application window, so it is worth registering early. There is no appeals procedure for results.",
"NUET состоит из двух отдельных секций, идущих подряд:":
 "NUET consists of two separate sections, taken one after the other:",
"Итого: 60 вопросов, 120 минут, только тесты с выбором ответа (multiple-choice).":
 "In total: 60 questions, 120 minutes, multiple-choice only.",
"Каждая секция оценивается по шкале":
 "Each section is marked on a scale of",
", итоговый максимум —":
 ", giving a maximum of",
"баллов за обе секции вместе. Проходной балл зависит от категории поступления и года — ориентируйся на официальные документы NU перед подачей, но на практике для гранта нужно заметно выше формального минимума. Мы в Prepline ориентируемся на цель":
 "for both sections combined. The pass mark depends on the admission category and the year, so check the official NU documents before applying. In practice, a scholarship requires well above the formal minimum. At Prepline we aim for",
"— это уже конкурентный результат.":
 "— that is already a competitive score.",
"NUET — обязательный экзамен для поступления в Nazarbayev University по категории «NUET applicants»: и на программу Foundation Year (NUFYP), и напрямую на бакалавриат. Хороший результат по IELTS (6.0+) может давать дополнительную скидку на обучение — но сам NUET сдаётся отдельно и не заменяет языковой сертификат.":
 "NUET is compulsory for anyone applying to Nazarbayev University under the “NUET applicants” category, whether for the Foundation Year programme (NUFYP) or directly for an undergraduate degree. A good IELTS score (6.0+) can earn an additional tuition discount, but NUET is taken separately and does not replace a language certificate.",
"Коротко о том, что за экзамен, из чего состоит и зачем он нужен.":
 "A short guide to what the exam is, how it is structured and why it matters.",
"Официальный список тем от Cambridge Assessment. Каждый M-код — это конкретный навык, который может встретиться на экзамене.":
 "The official topic list from Cambridge Assessment. Each M code is a specific skill that may appear in the exam.",
"Формат основан на TSA (Thinking Skills Assessment) от Cambridge. Вопросы вперемешку — Critical Thinking (текстовые аргументы) и Problem Solving (числа, таблицы, графики).":
 "The format is based on Cambridge's TSA (Thinking Skills Assessment). Questions are mixed: Critical Thinking (written arguments) and Problem Solving (numbers, tables, graphs).",

# ---------- спецификация: математика ----------
"M1. Единицы измерения": "M1. Units",
"Работа со стандартными единицами (масса, длина, время, деньги) и составными величинами (скорость, плотность, давление, цена за единицу).":
 "Standard units of mass, length, time and money, and compound units such as speed, density, pressure and unit pricing.",
"Перевод между связанными единицами измерения, включая площадь и объём, в числовых и алгебраических задачах.":
 "Converting freely between related units, including area and volume, in numerical and algebraic contexts.",
"M2. Числа": "M2. Number",
"Сравнение и упорядочивание целых, отрицательных чисел, десятичных дробей; четыре арифметических действия с дробями и десятичными.":
 "Ordering integers, negative numbers and decimals; the four operations with fractions and decimals.",
"Простые числа, делители, кратные, НОД и НОК с разложением на множители; обратные операции и порядок действий; систематический перебор вариантов.":
 "Primes, factors, multiples, HCF and LCM with prime factorisation; inverse operations and priority of operations; systematic listing strategies.",
"Квадратные и кубические корни; законы степеней, включая дробные и отрицательные показатели; стандартный вид числа (a×10ⁿ).":
 "Square and cube roots; index laws including fractional and negative powers; standard form (a×10ⁿ).",
"Переводы между дробями, десятичными и процентами, включая периодические дроби.":
 "Converting between fractions, decimals and percentages, including recurring decimals.",
"Точные вычисления с корнями и π, упрощение выражений с корнями и рационализация знаменателя.":
 "Exact calculation with surds and π, simplifying surd expressions and rationalising denominators.",
"Границы точности (округление) и оценка результата вычислений.":
 "Bounds and rounding, and estimating the result of a calculation.",
"M3. Отношения и пропорции": "M3. Ratio and proportion",
"Масштабные коэффициенты и масштабные схемы; выражение величины как доли другой; деление величины в заданном отношении.":
 "Scale factors and scale diagrams; expressing one quantity as a fraction of another; dividing a quantity in a given ratio.",
"Отношения в реальных задачах: смеси, конвертация, сравнение величин.":
 "Ratio in real contexts: mixtures, conversion and comparison of quantities.",
"Прямая и обратная пропорциональность, включая графики и уравнения.":
 "Direct and inverse proportion, including graphs and equations.",
"Проценты — вычисление, сравнение, изменение, включая сложные проценты.":
 "Percentages: calculating, comparing and percentage change, including compound interest.",
"Сравнение длин, площадей и объёмов через отношения и подобие.":
 "Comparing lengths, areas and volumes through ratio and similarity.",
"Задачи на рост и убывание, в том числе сложный процент.":
 "Growth and decay problems, including compound interest.",
"M4. Алгебра": "M4. Algebra",
"Алгебраическая нотация и подстановка значений в формулы.":
 "Algebraic notation and substituting values into formulae.",
"Раскрытие скобок, вынесение общего множителя, разложение квадратных выражений на множители, включая разность квадратов.":
 "Expanding brackets, taking out common factors and factorising quadratics, including the difference of two squares.",
"Упрощение выражений и рациональных дробей; преобразование формул; различие между уравнением и тождеством.":
 "Simplifying expressions and rational expressions; rearranging formulae; the difference between an equation and an identity.",
"Работа с координатами и построение графиков линейных и квадратичных функций; нахождение уравнения прямой.":
 "Working with coordinates and sketching linear and quadratic graphs; finding the equation of a straight line.",
"Корни, точки пересечения и вершины парабол; графики кубических, обратных, показательных и тригонометрических функций.":
 "Roots, intercepts and turning points of quadratics; graphs of cubic, reciprocal, exponential and trigonometric functions.",
"Вычисление наклона графика и площади под графиком.":
 "Calculating gradients of graphs and areas under graphs.",
"Решение линейных и квадратных уравнений (включая метод выделения полного квадрата и формулу корней), а также систем уравнений.":
 "Solving linear and quadratic equations (including completing the square and the quadratic formula), and simultaneous equations.",
"Решение линейных неравенств.": "Solving linear inequalities.",
"Арифметические и квадратичные последовательности, нахождение формулы n-го члена.":
 "Linear and quadratic sequences, and finding the nth term.",
"M5. Геометрия": "M5. Geometry",
"Термины и обозначения: точки, прямые, углы, многоугольники.":
 "Terms and notation: points, lines, angles and polygons.",
"Свойства углов при параллельных прямых, в треугольниках и четырёхугольниках; сумма углов многоугольника.":
 "Angle properties of parallel lines, triangles and quadrilaterals; the sum of the angles of a polygon.",
"Признаки равенства треугольников (SSS, SAS, ASA, RHS) и подобия.":
 "Congruence criteria for triangles (SSS, SAS, ASA, RHS) and similarity.",
"Преобразования фигур — поворот, отражение, перенос, масштабирование — и векторы.":
 "Transformations: rotation, reflection, translation and enlargement, and vectors.",
"Теорема Пифагора в 2D и 3D.": "Pythagoras' theorem in 2-D and 3-D.",
"Окружности: термины, теоремы об углах, хордах и касательных, циклические четырёхугольники.":
 "Circles: terminology, theorems on angles, chords and tangents, and cyclic quadrilaterals.",
"Координатная геометрия; масштабные схемы и азимуты (bearings).":
 "Coordinate geometry; scale drawings and three-figure bearings.",
"Площади треугольников, параллелограммов, трапеций; объём призм.":
 "Area of triangles, parallelograms and trapezia; volume of prisms.",
"Длина окружности, площадь круга, объём цилиндра; площадь сектора и длина дуги.":
 "Circumference and area of a circle, volume of a cylinder; area of a sector and arc length.",
"Тригонометрические соотношения (sin, cos, tan) для прямоугольных и произвольных треугольников, точные значения для стандартных углов.":
 "Trigonometric ratios (sin, cos, tan) for right-angled and general triangles, and exact values for standard angles.",
"Действия с векторами.": "Operations with vectors.",

# ---------- спецификация: Critical Thinking ----------
"Critical Thinking — типы заданий": "Critical Thinking — question types",
"Problem Solving — типы заданий": "Problem Solving — question types",
"— найти главный вывод аргумента среди пяти вариантов.":
 "— identify the main conclusion of an argument from five options.",
"— определить, какой вывод логически следует из текста.":
 "— decide which conclusion follows logically from the passage.",
"— найти недостающее допущение, без которого аргумент не работает.":
 "— find the missing assumption without which the argument fails.",
"— определить логическую ошибку в рассуждении.":
 "— identify the flaw in the reasoning.",
"— выбрать утверждение, которое усиливает или ослабляет аргумент.":
 "— choose the statement that strengthens or weakens the argument.",
"— применить общий принцип к конкретной ситуации или найти принцип, который иллюстрирует пример.":
 "— apply a general principle to a specific case, or identify the principle a case illustrates.",
"— найти аргумент с такой же логической структурой, но на другую тему.":
 "— find an argument with the same logical structure on a different topic.",
"— оценить, насколько дополнительная информация повлияла бы на аргумент.":
 "— judge how far additional information would affect the argument.",
"Отбор нужных данных из текста, таблицы или графика.":
 "Selecting the relevant data from a passage, table or graph.",
"Поиск закономерности или процедуры решения.":
 "Finding a pattern or a procedure for solving the problem.",
"Работа с расписаниями, графиками и диаграммами.":
 "Working with timetables, charts and diagrams.",
"Пространственное мышление: развёртки фигур, вращение, симметрия.":
 "Spatial reasoning: nets of solids, rotation and symmetry.",
"Логические головоломки на комбинаторику и перебор вариантов.":
 "Logic puzzles involving combinations and systematic listing.",

# ---------- заголовки разделов ----------
"Кто проводит экзамен": "Who runs the exam",
"Структура: две секции": "Structure: two sections",
"Как считаются баллы": "How the score works",
"Зачем он нужен": "Why it matters",
"Полная спецификация — Математика (M1–M5)": "Full specification — Mathematics (M1–M5)",
"Полная спецификация — Critical Thinking &amp": "Full specification — Critical Thinking &amp",
"Что такое NUET — Prepline": "What is NUET — Prepline",
"Что такое NUET": "What is NUET",
"Что такое": "What is",
"5 000 тенге": "KZT 5 000",

# ---------- index.html ----------
"Prepline — подготовка к NUET": "Prepline — NUET preparation",
"Готовься к NUET там, где видно": "Prepare for NUET where you can see",
"реальный прогресс": "real progress",
"Практика с моментальной обратной связью, разбивкой по секциям и таймером — как на настоящем экзамене. Без воды, только вопросы, которые считают за тебя.":
 "Practice with instant feedback, a breakdown by section and a timer, just like the real exam. No filler — only questions that count.",
"Выбрать раздел и начать": "Choose a section and start",
"Диагностика за 10 минут": "10-minute diagnostic",
"Попробуй сам": "Try it yourself",
"1 вопрос из NUET": "One NUET question",
"проверенных вопросов в базе": "verified questions in the bank",
"теста с таймером": "timed tests",
"минут на один тест": "minutes per test",
"Две секции NUET,": "Two NUET sections,",
"один принцип": "one principle",
"Реальный формат экзамена, а не абстрактные упражнения.":
 "The real exam format, not abstract exercises.",
"22 теста по 27-30 вопросов из реальных мок-экзаменов NUET и NUFYPET — с таймером, навигацией и разбором каждого ответа.":
 "22 tests of 27–30 questions from real NUET and NUFYPET mock exams, with a timer, navigation and a breakdown of every answer.",
"Критическое мышление и решение задач": "Critical Thinking and Problem Solving",
"Вторая секция NUET по спецификации NU: анализ аргументов, логика, problem solving. 16 тестов по 30 вопросов.":
 "The second NUET section as specified by NU: analysing arguments, logic and problem solving. 16 tests of 30 questions.",
"606 вопросов": "606 questions",
"442 вопроса": "442 questions",
"Как это": "How it",
"работает": "works",
"Три шага от первого теста до результата на экзамене.":
 "Three steps from your first test to your exam result.",
"10-минутный тест определяет твой текущий уровень по секциям.":
 "A 10-minute test establishes your current level in each section.",
"Слабые темы получают больше практики — без лишних повторений того, что уже знаешь.":
 "Weak topics get more practice, without repeating what you already know.",
"Ежедневные сессии с таймером и мгновенным разбором каждого ответа.":
 "Daily timed sessions with an instant breakdown of every answer.",
"Ты выходишь на реальный тест, уже привыкнув к формату и темпу.":
 "You sit the real test already used to the format and the pace.",
"Узнай свой уровень": "Find out your level",
"прямо сейчас": "right now",
"Бесплатная диагностика — 10 вопросов, 10 минут, честный результат.":
 "A free diagnostic: 10 questions, 10 minutes, an honest result.",
"Начать бесплатно": "Start for free",
"Астана, Казахстан": "Astana, Kazakhstan",
"Диагностика (10 вопросов)": "Diagnostic (10 questions)",
"— 30 вопросов, 60 минут": "— 30 questions, 60 minutes",

# ---------- мини-тест на главной ----------
"{ q: 'Если x + y = 10 и x − y = 4, чему равно xy?', opts: ['18', '21', '24', '12'], correct: '21' },":
 "{ q: 'If x + y = 10 and x - y = 4, what is xy?', opts: ['18', '21', '24', '12'], correct: '21' },",
"{ q: 'Если 40% от x равно 160% от y, чему равно (3x − 12y)/5?', opts: ['3', '2', '0', '4'], correct: '0' },":
 "{ q: 'If 40% of x equals 160% of y, what is (3x - 12y)/5?', opts: ['3', '2', '0', '4'], correct: '0' },",
"{ q: '25% от 80 плюс 30% от 50 равно:', opts: ['35', '32', '38', '30'], correct: '35' },":
 "{ q: '25% of 80 plus 30% of 50 equals:', opts: ['35', '32', '38', '30'], correct: '35' },",
"{ q: 'Продолжи последовательность: 2, 6, 18, 54, …', opts: ['108', '162', '148', '216'], correct: '162' },":
 "{ q: 'Continue the sequence: 2, 6, 18, 54, ...', opts: ['108', '162', '148', '216'], correct: '162' },",
"{ q: 'Если 3^x = 81, чему равно x² − x?', opts: ['12', '9', '16', '6'], correct: '12' },":
 "{ q: 'If 3^x = 81, what is x^2 - x?', opts: ['12', '9', '16', '6'], correct: '12' },",
"{ q: 'Среднее пяти чисел равно 12. После добавления шестого числа среднее стало 14. Какое число добавили?', opts: ['22', '24', '26', '14'], correct: '24' },":
 "{ q: 'The mean of five numbers is 12. After a sixth number is added the mean becomes 14. What number was added?', opts: ['22', '24', '26', '14'], correct: '24' },",
"{ q: 'Реши уравнение: 2(x − 3) = 4x + 8', opts: ['-7', '-5', '5', '7'], correct: '-7' },":
 "{ q: 'Solve the equation: 2(x - 3) = 4x + 8', opts: ['-7', '-5', '5', '7'], correct: '-7' },",
"{ q: 'Бросают игральный кубик. Какова вероятность выпадения чётного числа больше 2?', opts: ['1/2', '1/3', '2/3', '1/6'], correct: '1/3' }":
 "{ q: 'A die is rolled. What is the probability of an even number greater than 2?', opts: ['1/2', '1/3', '2/3', '1/6'], correct: '1/3' }",
"{ q: '25% от 80 плюс 30% от 50 равно:', opts: ['30', '35', '40', '45'], correct: '35' },":
 "{ q: '25% of 80 plus 30% of 50 equals:', opts: ['30', '35', '40', '45'], correct: '35' },",
"{ q: 'Если 3^x = 81, чему равно x\u00b2 \u2212 x?', opts: ['6', '12', '16', '20'], correct: '12' },":
 "{ q: 'If 3^x = 81, what is x\u00b2 \u2212 x?', opts: ['6', '12', '16', '20'], correct: '12' },",
"{ q: 'Реши уравнение: 2(x \u2212 3) = x + 5', opts: ['8', '11', '2', '\u22121'], correct: '11' },":
 "{ q: 'Solve the equation: 2(x \u2212 3) = x + 5', opts: ['8', '11', '2', '\u22121'], correct: '11' },",
"Если 40% от x равно 160% от y, чему равно (3x \u2212 12y)/5?":
 "If 40% of x equals 160% of y, what is (3x \u2212 12y)/5?",
"Разбор по темам официальной спецификации NUET. Считаются все попытки,":
 "A breakdown by topic from the official NUET specification. Every attempt",
"сохранённые в облако. Темы отсортированы от худшей к лучшей.":
 "saved to the cloud is counted. Topics run from weakest to strongest.",
"Диагностика": "Diagnostic",
"Практика": "Practice",
"Экзамен": "Exam",
"План": "Plan",
"feedback.textContent = isCorrect ? ('Верно! Так и есть — ' + answer + '.') : ('Неверно. Правильный ответ — ' + answer + '.');":
 "feedback.textContent = isCorrect ? ('Correct — that is right: ' + answer + '.') : ('Not quite. The correct answer is ' + answer + '.');",

# ---------- math.html / crit.html / nuet.html ----------
"Математика NUET — Prepline": "NUET Mathematics — Prepline",
"22 теста, 606 проверенных вопросов. Выбери тест ниже — таймер и разбор каждого ответа.":
 "22 tests, 606 verified questions. Pick a test below — timer and a breakdown of every answer.",
"606 проверенных вопросов (+46 практика без ключа) в 22 тестах. MOCK 31-40 полностью обработаны. В очереди: Mock Exam #3-14 (с ключами), MOCK 19-30 (без ключей), банк math_1-60. Оригинальные моки:":
 "606 verified questions (plus 46 practice questions without a key) across 22 tests. MOCK 31–40 fully processed. In the queue: Mock Exam #3–14 (with keys), MOCK 19–30 (no keys), the math_1–60 bank. Original mocks:",
"16 тестов, 442 проверенных вопроса. Assumptions, Conclusions, Flaws, External Factors, Main Conclusions.":
 "16 tests, 442 verified questions. Assumptions, Conclusions, Flaws, External Factors, Main Conclusions.",
"442 проверенных вопроса + 30 практики без ключа в 16 тестах. Assumptions, Conclusions, Flaws, External Factors, Main Conclusions — из TSA past papers и NUET-моков.":
 "442 verified questions plus 30 practice questions without a key across 16 tests. Assumptions, Conclusions, Flaws, External Factors and Main Conclusions, taken from TSA past papers and NUET mocks.",
"Assumptions, Conclusions, Flaws, External Factors — вопросы из TSA past papers с проверенными ключами.":
 "Assumptions, Conclusions, Flaws and External Factors — questions from TSA past papers with verified keys.",
"Тест NUET — Prepline": "NUET Test — Prepline",
"Математика и критическое мышление. Выбери мок ниже — каждый со своим таймером и разбором ответов.":
 "Mathematics and Critical Thinking. Pick a mock below — each has its own timer and answer breakdown.",
"Математика: 606 проверенных вопросов (+46 практика без ключа) в 22 микс-моках. Critical Thinking: 442 вопроса + 30 практики без ключа в 16 моках. MOCK 31-40 полностью обработаны. В очереди: Mock Exam #3-14 (с ключами), MOCK 19-30 (без ключей), банк math_1-60. Оригинальные моки:":
 "Mathematics: 606 verified questions (plus 46 practice questions without a key) across 22 mixed mocks. Critical Thinking: 442 questions plus 30 practice questions without a key across 16 mocks. MOCK 31–40 fully processed. In the queue: Mock Exam #3–14 (with keys), MOCK 19–30 (no keys), the math_1–60 bank. Original mocks:",
"Выбрать раздел и начать готовиться &rarr": "Choose a section and start preparing &rarr",
"Перейти к полным тестам &rarr": "Go to the full tests &rarr",

# ---------- диагностика ----------
"Диагностика — Prepline": "Diagnostic — Prepline",
"Диагностика — Математика — Prepline": "Diagnostic — Mathematics — Prepline",
"Диагностика — Critical Thinking — Prepline": "Diagnostic — Critical Thinking — Prepline",
"Диагностика по математике — 10 вопросов": "Mathematics diagnostic — 10 questions",
"Диагностика по Critical Thinking — 10 вопросов": "Critical Thinking diagnostic — 10 questions",
"Сильный старт — можешь сразу переходить к полным тестам.":
 "A strong start — you can move straight on to the full tests.",
"База есть, но точно стоит пройти несколько полных тестов.":
 "The basics are there, but you should work through several full tests.",
"Есть куда расти — начни с полных тестов по темам, где было больше ошибок.":
 "There is room to grow — start with full tests on the topics where you made most mistakes.",

# ---------- страница слабых мест ----------
"Слабые места — Prepline": "Weak spots — Prepline",
"Разбор по темам официальной спецификации NUET. Считаются все попытки, сохранённые в облако. Темы отсортированы от худшей к лучшей.":
 "A breakdown by topic from the official NUET specification. Every attempt saved to the cloud is counted. Topics are sorted from weakest to strongest.",
"тем затронуто": "topics covered",
"худшая тема": "weakest topic",
"По этому разделу пока нет данных.": "No data for this section yet.",
"мало данных": "not enough data",
"Не удалось подключиться к базе.": "Could not connect to the database.",
"Войди в аккаунт, чтобы увидеть разбор по темам.":
 "Sign in to see the breakdown by topic.",
"Кнопка входа — в правом верхнем углу.": "The sign-in button is in the top right corner.",
"Пока нет данных. Пройди любой тест —": "No data yet. Take any test —",
"разбор появится здесь автоматически.": "the breakdown will appear here automatically.",
"Начать тест": "Start a test",
"Загружаю…": "Loading...",
"Ошибка: ": "Error: ",
"ответов": "answers",
"верно": "correct",
"Всё": "All",

# ---------- общее меню ----------
"Слабые места": "Weak spots",
"Крит. мышление ·": "Critical Thinking ·",
"Критическое мышление": "Critical Thinking",
"Все тесты": "All tests",
"Направления": "Sections",
"Как это работает": "How it works",
"Главная": "Home",
"Математика ·": "Mathematics ·",
"Математика": "Mathematics",
"Тест NUET": "NUET test",

# ---------- движок теста ----------
"Завершить тест": "Finish test",
"Пройти ещё раз": "Take it again",
"На главную": "Home",
"К списку моков": "Back to the mock list",
"Prepline — на главную": "Prepline — home",
"Далее &rarr": "Next &rarr",
"Назад": "Back",
"Начать": "Start",
"Ещё раз": "Again",
"Итог": "Result",
"Процент": "Percentage",
"Не отвечено": "Unanswered",
"Нет ответа": "No answer",
"Правильный ответ: ": "Correct answer: ",
"Правильный ответ:": "Correct answer:",
"Правильный: ": "Correct: ",
"Твой ответ: ": "Your answer: ",
"Верно.": "Correct.",
"Неверно": "Incorrect",
"Время вышло. ": "Time is up. ",
"% — разбор ответов под каждым вопросом.": "% — the breakdown is under each question.",
"История попыток &middot": "Attempt history &middot",
"лучший результат": "best result",
"Лучший: ": "Best: ",
"Лучший:": "Best:",
" попыток: ": " attempts: ",
"попыток:": "attempts:",
". Прошлые: ": ". Previous: ",
"Без ответа: ": "Unanswered: ",
"вопрос(ов). Завершить?": "question(s). Finish anyway?",
"Рисунок к вопросу": "Figure for the question",
"Чертёж к вопросу ": "Diagram for question ",
"Вопрос ": "Question ",
"Вопрос": "Question",
"из ": "of ",
"нет ключа": "no key",
"База: ": "Base: ",
"Цель:": "Target:",
"Формат:": "Format:",
"5 вопросов без проверенного ключа ответа не входят в счёт — помечены серым, просто для практики.":
 "5 questions without a verified answer key do not count towards the score — they are greyed out, for practice only.",
"ответ пока не проверен, только для практики":
 "the answer has not been verified yet, practice only",
"Для этого мока пока нет ключа ответов — вопросы только для практики, без проверки.":
 "There is no answer key for this mock yet — the questions are for practice only, without marking.",

# ---------- подписи карточек ----------
"30 вопросов": "30 questions",
"28 вопросов": "28 questions",
"27 вопросов": "27 questions",
"22 вопроса": "22 questions",
"30 мин": "30 min",
"28 мин": "28 min",
"27 мин": "27 min",
"22 мин": "22 min",
"29 с ключом": "29 with key",
"28 с ключом": "28 with key",
"27 с ключом": "27 with key",
"26 с ключом": "26 with key",
"25 с ключом": "25 with key",
"1 с ключом": "1 with key",
"· разбор с решениями": "· worked solutions",
"· вопросы из моков 1-7, 10": "· questions from mocks 1–7, 10",
"· вопросы из моков 1-7": "· questions from mocks 1–7",
"· вопросы из моков 8-12": "· questions from mocks 8–12",
"· вопросы из моков 8-14": "· questions from mocks 8–14",
"· все ответы решены и проверены": "· all answers worked and verified",
"· все ответы проверены": "· all answers verified",
"· все 5 типов заданий": "· all 5 question types",
"· 1 вопрос без ответа, для практики": "· 1 question without an answer, for practice",
"· 1 вопрос без ответа даже в оригинале": "· 1 question unanswered even in the original",
"· 2 вопроса без ответа, для практики": "· 2 questions without an answer, for practice",
"· 3 вопроса без ответа, для практики": "· 3 questions without an answer, for practice",
"· 5 вопросов пока без ответа, для практики": "· 5 questions without an answer yet, for practice",
"· без официальных ответов, для практики": "· no official answers, for practice",
"· без ключа ответов, для практики": "· no answer key, for practice",
"· только геометрия, полностью с решениями": "· geometry only, fully worked",
"· решено самостоятельно, без исходных ответов": "· solved independently, without the original key",
"· Mock 6 целиком, ответы сверены по решениям": "· the whole of Mock 6, answers checked against the solutions",
"30 вопросов · 30 минут · источник: Mock 6 (ответы сверены по решениям)":
 "30 questions · 30 minutes · source: Mock 6 (answers checked against the solutions)",
"CT Тест": "CT Test",
"Тест": "Test",
"Математика NUFYPET": "NUFYPET Mathematics",
"Математика NUET": "NUET Mathematics",
"Геометрия NUET": "NUET Geometry",
"Mixed Mock #8 · Математика": "Mixed Mock #8 · Mathematics",
"Mock Exam #1 — Математика NUFYPET": "Mock Exam #1 — NUFYPET Mathematics",
"Mock Exam #2 — Математика NUFYPET": "Mock Exam #2 — NUFYPET Mathematics",
"Mock Exam #3 — Математика NUFYPET": "Mock Exam #3 — NUFYPET Mathematics",
"вопросов, все с ключом": "questions, all with keys",
"вопросов, без ключа": "questions, no key",
"вопросов)": "questions)",
"вопросов,": "questions,",
"с ключом)": "with key)",

# ---------- комментарии в коде ----------
"Prepline: история результатов (localStorage)": "Prepline: attempt history (localStorage)",
"// первая попытка — истории ещё нет": "// first attempt — no history yet",
"Prepline × Supabase: авторизация + облачное сохранение":
 "Prepline x Supabase: auth + cloud saving",
"Prepline × Supabase: авторизация + облачные результаты на карточках":
 "Prepline x Supabase: auth + cloud results on the cards",
"Prepline × Supabase: авторизация": "Prepline x Supabase: auth",
"/* mix-1..7: перехватываем saveAttempt — localStorage остаётся, добавляем облако */":
 "/* mix-1..7: hook saveAttempt — localStorage stays, cloud is added */",
"/* mix-8: saveAttempt нет, оборачиваем finish */":
 "/* mix-8: no saveAttempt, wrap finish instead */",
"/* Prepline: показать лучший результат на карточках моков */":
 "/* Prepline: show the best result on the mock cards */",
"/* Prepline: сохранение результата */": "/* Prepline: save the result */",
"/* ---------- левый taskbar (dock) ---------- */": "/* ---------- left taskbar (dock) ---------- */",
"/* ---------- mobile: dock становится нижней панелью ---------- */":
 "/* ---------- mobile: dock becomes a bottom bar ---------- */",
"!-- ЛЕВЫЙ TASKBAR --": "!-- LEFT TASKBAR --",
"/* фон — млечный путь на всю страницу */": "/* background: milky way, full page */",
"/* ---------- hero: фон — звёзды с красными облаками ---------- */":
 "/* ---------- hero: background of stars with red clouds ---------- */",
"/* ---------- живой мини-тест ---------- */": "/* ---------- live mini quiz ---------- */",
"/* ---------- stats: фон — планета ---------- */": "/* ---------- stats: planet background ---------- */",
"/* ---------- CTA: фон — млечный путь ---------- */": "/* ---------- CTA: milky way background ---------- */",
"мини-тест: случайный вопрос при каждой загрузке":
 "mini quiz: a random question on every load",
"// перемешиваем варианты (Фишер–Йетс)": "// shuffle the options (Fisher-Yates)",
"логика ответа (та же, текст фидбэка берёт правильный ответ из данных)":
 "answer logic (unchanged; the feedback text takes the correct answer from the data)",
"GSAP-анимации": "GSAP animations",
"// dock: выезд слева при загрузке": "// dock: slides in from the left on load",
"// hero: появление при загрузке": "// hero: fades in on load",
"// параллакс фото-фонов": "// parallax on the photo backgrounds",
"// параллакс контента hero": "// parallax on the hero content",
"// секции: появление вниз, исчезание при скролле вверх":
 "// sections: fade in downwards, fade out on scrolling up",
"// карточки: стаггер вниз, обратный при скролле вверх":
 "// cards: staggered downwards, reversed on scrolling up",
"// счётчики цифр": "// number counters",
"// меньше этого — данных мало, вывод недостоверен":
 "// below this the sample is too small to trust",
"// «мало данных» — вниз": "// 'not enough data' goes to the bottom",
"// худшие — вверх": "// weakest first",
"// ждём инициализацию prepline-supabase.js": "// wait for prepline-supabase.js to initialise",
}


def main():
    if not os.path.exists("index.html"):
        print("Не вижу index.html. Запусти скрипт внутри папки Prepline.")
        return 1
    os.makedirs(BACKUP, exist_ok=True)

    pairs = sorted(T.items(), key=lambda kv: -len(kv[0]))
    files_done = 0
    total = 0

    for f in sorted(glob.glob("*.html")):
        html = open(f, encoding="utf-8", errors="ignore").read()
        original = html
        n = 0
        for ru, en in pairs:
            if ru in html:
                n += html.count(ru)
                html = html.replace(ru, en)
        if html != original:
            shutil.copy2(f, os.path.join(BACKUP, f))
            open(f, "w", encoding="utf-8").write(html)
            files_done += 1
            total += n
            left = len(re.findall(r"[А-Яа-яЁё]", html))
            print("  %-24s замен: %-5d осталось русских букв: %d" % (f, n, left))

    print()
    print("файлов изменено:  " + str(files_done))
    print("замен всего:      " + str(total))
    print("копии оригиналов: " + BACKUP + "/")
    print()
    print("Дальше: git add . / git commit -m \"english ui\" / git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
