# -*- coding: utf-8 -*-
"""Prepline: tops up every Critical Thinking test that has fewer than 30 questions
with original NUET-style CT/PS questions (src "PL"), with Russian explanations.

    python3 gen-fill-ct.py --write
"""
import json, re, sys

L = 'ABCDE'
QRE = re.compile(r"^const (?:questions|QUESTIONS)\s*=\s*(\[.*\]);\s*$", re.M)

Q_ASM = '<br><br><b>Which one of the following is an underlying assumption of the above argument?</b>'
Q_CON = '<br><br><b>Which one of the following conclusions can be reliably drawn from the above passage?</b>'
Q_MC = '<br><br><b>Which one of the following best expresses the main conclusion of the above argument?</b>'
Q_WKN = '<br><br><b>Which one of the following, if true, would most weaken the above argument?</b>'
Q_STR = '<br><br><b>Which one of the following, if true, would most strengthen the above argument?</b>'
Q_FLAW = '<br><br><b>Which one of the following best describes the flaw in the above argument?</b>'


def ex(idea, steps, letter, whynot, trap):
    return ('<div class="ex"><div class="ex-h">✦ Идея</div><p class="ex-i">%s</p>'
            '<div class="ex-h">Решение</div><ol class="ex-s">%s</ol>'
            '<div class="ex-a">Ответ: <b>%s</b></div>'
            '<div class="ex-h ex-x">✗ Почему не другие</div><ul class="ex-n">%s</ul>'
            '<div class="ex-t"><b>⚠ Ловушка / совет.</b> %s</div></div>') % (
        idea, ''.join('<li>%s</li>' % s for s in steps[:-1]) + '<li>%s Ответ %s.</li>' % (steps[-1], letter),
        letter, ''.join('<li>%s</li>' % w for w in whynot), trap)


def q(topic, text, options, correct, idea, steps, whynot, trap):
    letter = L[correct]
    return {'topic': topic, 'text': text, 'image': '', 'options': options, 'correct': correct,
            'explain': ex(idea, steps, letter, whynot, trap), 'src': 'PL',
            '_parts': (idea, steps, whynot, trap)}


def place(x, target):
    """Move the right answer to position target by swapping two options; relabel the explanation."""
    c = x['correct']
    if c == target or x['topic'] == 'PS':
        return x
    opts = list(x['options'])
    opts[c], opts[target] = opts[target], opts[c]
    swap = {L[c]: L[target], L[target]: L[c]}
    idea, steps, whynot, trap = x['_parts']

    def relabel(w):
        m = re.match(r'^([A-E](?:, [A-E])*)( — .*)$', w)
        if not m:
            return w
        letters = sorted(swap.get(l, l) for l in m.group(1).split(', '))
        return ', '.join(letters) + m.group(2)
    whynot = sorted((relabel(w) for w in whynot), key=lambda w: w[0])
    return dict(x, options=opts, correct=target, explain=ex(idea, steps, L[target], whynot, trap))


# ------------------------------------------------------------------ assumptions
ASM1 = q('ASM', 'Since a cycle lane opened on Kenesary Street two years ago, the number of accidents involving cyclists on that street has fallen by half. '
         'A cycle lane on Abay Street would therefore make cycling there safer too.' + Q_ASM,
         ['Cycling is the most popular way of getting around the town.',
          'A cycle lane on Abay Street would cost no more than the one on Kenesary Street.',
          'The fall in accidents on Kenesary Street was caused by the cycle lane rather than by something else.',
          'Accidents involving cyclists on Kenesary Street had been rising before the lane opened.',
          'Most cyclists in the town use Abay Street.'], 2,
         'Довод: после появления дорожки аварий стало вдвое меньше. Вывод: дорожка сделает безопаснее и Абая.',
         ['Аргумент считает, что именно дорожка снизила число аварий.', 'Проверка отрицанием: если аварий стало меньше по другой причине, вывод рушится.'],
         ['A, E — популярность не нужна для вывода о безопасности.', 'B — о цене в аргументе речи нет.', 'D — рост до открытия не нужен.'],
         '«После» не значит «из-за». Ищите скрытую причинную связь.')

ASM2 = q('ASM', 'Online lessons can never fully replace classroom teaching. In a classroom, a teacher can see at once when a student is confused and explain the point again. '
         'In an online lesson, the teacher sees only small video images, and students often switch their cameras off.' + Q_ASM,
         ['Most students prefer classroom lessons to online lessons.',
          'Noticing quickly when a student is confused is an important part of good teaching.',
          'Online lessons are cheaper to run than classroom lessons.',
          'All students switch their cameras off during online lessons.',
          'Teachers who give online lessons have less experience than other teachers.'], 1,
         'Разница между форматами — только в том, видит ли учитель замешательство. Значит, это должно быть важно.',
         ['Если бы это было неважно, отличие форматов ничего бы не доказывало.'],
         ['A, C, E — в аргументе нет.', 'D — слишком сильно: в тексте «often», и вывод не требует «все».'],
         'Отрицайте вариант: если вывод перестаёт следовать — это допущение.')

ASM3 = q('ASM', 'The new shopping centre being built in the northern districts will reduce traffic in the city centre. '
         'At present, many people who live in the northern districts drive into the city centre to do their shopping.' + Q_ASM,
         ['The new shopping centre will have more shops than the city centre.',
          'Traffic in the city centre is worse than traffic in the northern districts.',
          'People from the southern districts will also use the new shopping centre.',
          'Many northern residents who now drive to the city centre to shop will shop at the new centre instead.',
          'The new shopping centre will have a large car park.'], 3,
         'Пробки уменьшатся, только если жители севера перестанут ездить в центр.',
         ['Без этого допущения новый центр ничего не меняет для трафика в центре.'],
         ['A — «больше магазинов» не обязательно.', 'C — южные районы не нужны для вывода.', 'E — парковка не обязательна.'],
         'Допущение — мостик между доводом и выводом.')

ASM4 = q('ASM', 'Reading on paper is better for learning than reading on a screen. In one study, students who read a text on paper remembered more of it a week later '
         'than students who read the same text on a tablet.' + Q_ASM,
         ['Printed books are more expensive than electronic books.',
          'The students enjoyed reading on paper more than reading on a tablet.',
          'The two groups of students were similar in their ability to remember what they read.',
          'Every student who read on paper remembered more than every student who read on a tablet.',
          'Schools should stop using tablets for teaching.'], 2,
         'Вывод о формате верен, только если группы были сравнимы.',
         ['Если в «бумажной» группе были ученики с лучшей памятью, разница объясняется ими, а не бумагой.'],
         ['D — слишком сильно: хватит разницы в среднем.', 'E — это следствие, а не допущение.', 'A, B — не связаны с выводом.'],
         'В исследованиях часто скрыто допущение «группы одинаковы».')

# ------------------------------------------------------------------ conclusions
CON1 = q('CON', 'Every student who passed the entrance exam was offered a place on the programme. Nobody who was offered a place had to pay a registration fee. '
         'Aliya had to pay a registration fee.' + Q_CON,
         ['Aliya did not pass the entrance exam.',
          'Aliya applied for a place on a programme abroad.',
          'Everyone who did not pay a registration fee passed the entrance exam.',
          'Everyone who was offered a place passed the entrance exam.',
          'Aliya was offered a place but turned it down.'], 0,
         'Цепочка: сдал → получил место → не платил взнос.',
         ['Алия платила → места не получила → экзамен не сдала.'],
         ['C, D — обращения утверждений, они не следуют.', 'E — получивший место взнос не платит.', 'B — об этом ничего нет.'],
         '«Все A — это B» не значит «все B — это A».')

CON2 = q('CON', 'The number of students taking the NUET has risen every year for the last five years. Over the same period, the number of first-year places at Nazarbayev University '
         'has stayed the same.' + Q_CON,
         ['The NUET has become more difficult over the last five years.',
          'Students now need higher NUET scores than before to be admitted.',
          'Nazarbayev University should create more first-year places.',
          'More students now want to study abroad than five years ago.',
          'The largest possible share of NUET candidates who can be given a first-year place has fallen.'], 4,
         'Кандидатов больше, мест столько же → доля тех, кому может хватить места, падает.',
         ['Это чистая арифметика из двух фактов.'],
         ['B — правдоподобно, но не обязательно: порог зависит и от других условий.', 'C — рекомендация, а не вывод из фактов.', 'A, D — не следуют.'],
         'Надёжный вывод не требует догадок сверх текста.')

CON3 = q('CON', 'Bus fares in the city were cut by 30% in January. Over the next three months the number of bus journeys rose by 10%, '
         'but the money the bus company received from fares fell.' + Q_CON,
         ['The fare cut was a mistake.',
          'The rise in the number of journeys was not enough to make up for the lower fare per journey.',
          'Most of the new passengers used to travel by car.',
          'The bus company will raise its fares again.',
          'The number of bus journeys will continue to rise.'], 1,
         'Выручка = число поездок × цена. Цена ×0,7, поездки ×1,1.',
         ['0,7 · 1,1 = 0,77 — выручка упала, значит, рост поездок не покрыл скидку.'],
         ['A — оценка: у снижения могли быть другие цели.', 'C, D, E — догадки, в тексте их нет.'],
         'Отличайте факт из текста от мнения о нём.')

CON4 = q('CON', 'In a survey of 200 visitors to a museum, each visitor gave exactly one main reason for coming. 120 said they came mainly for the new dinosaur hall '
         'and 50 said they came mainly for the café.' + Q_CON,
         ['The dinosaur hall is the most popular part of the museum.',
          'Most visitors to the museum use the café.',
          'Fewer than a fifth of the visitors surveyed came mainly for something other than the dinosaur hall or the café.',
          'The café earns more money than the dinosaur hall.',
          'More than half of all visitors to the museum come mainly for the dinosaur hall.'], 2,
         'Остальные причины: 200 − 120 − 50 = 30 человек.',
         ['30 из 200 = 15% — меньше пятой части (20%).'],
         ['E — опрошены 200 человек, а не все посетители.', 'A — «главная причина» ≠ популярность.', 'B, D — о посещении кафе и деньгах данных нет.'],
         'Не переносите выборку на всех без оснований.')

CON5 = q('CON', 'Seeds of the steppe tulip will only sprout after they have spent several weeks at a temperature below 5°C. '
         'In greenhouses kept above 10°C all year round, no steppe tulip has ever grown from seed.' + Q_CON,
         ['Any seed kept below 5°C for several weeks will sprout.',
          'Steppe tulips cannot be grown in greenhouses.',
          'Steppe tulips only flower in winter.',
          'A steppe tulip seed that has never been colder than 10°C will not sprout.',
          'Cold winters are harmful to most plants.'], 3,
         'Холод ниже 5°C — необходимое условие прорастания.',
         ['Семя, которое никогда не было холоднее 10°C, этого условия не получило → не прорастёт.'],
         ['A — путает необходимое и достаточное условие.', 'B — тюльпаны можно вырастить не из семян.', 'C, E — не следуют.'],
         '«Только если» задаёт необходимое условие, а не достаточное.')

CON6 = q('CON', 'Every member of the school chess club also belongs to the maths club. Some members of the maths club are in the debating team. '
         'Dias is a member of the chess club.' + Q_CON,
         ['Dias is in the debating team.',
          'Some members of the chess club are in the debating team.',
          'Dias belongs to the maths club.',
          'Every member of the maths club plays chess.',
          'Nobody in the debating team plays chess.'], 2,
         'Шахматы ⊂ математика.',
         ['Диас в шахматном клубе → он и в математическом.'],
         ['A, B — «некоторые» из математиков могут быть не шахматистами.', 'D — обращение.', 'E — не следует.'],
         'Нарисуйте круги Эйлера.')

# ------------------------------------------------------------------ main conclusion
MC1 = q('MC', 'Research suggests that for children aged 6 to 9, homework adds little to what they learn in class. It also takes up time they would otherwise spend playing outside, '
        'which is how young children develop social skills and coordination. So schools should give much less homework to young children, '
        'even though many parents believe that more homework means a better education.' + Q_MC,
        ['Homework adds little to what children aged 6 to 9 learn in class.',
         'Playing outside helps young children develop social skills.',
         'Many parents wrongly believe that more homework means a better education.',
         'Schools should give much less homework to children aged 6 to 9.',
         'Children who play outside do better at school.'], 3,
        'Слово «So» вводит главный вывод.',
        ['Первые два предложения — доводы, последняя часть — уступка.'],
        ['A, B — доводы.', 'C — уступка, к тому же «wrongly» в тексте нет.', 'E — не сказано.'],
        'Спросите: что доказывают остальные предложения?')

MC2 = q('MC', 'Some people say that because electric cars produce no exhaust, switching to them will solve the city\'s air pollution problem. '
        'But much of the dust in city air comes from tyres and brakes wearing down, and electric cars, being heavier, wear their tyres faster. '
        'Electric cars will help, but on their own they will not make the city\'s air clean.' + Q_MC,
        ['Electric cars produce no exhaust.',
         'Much of the dust in city air comes from tyres and brakes.',
         'Electric cars wear their tyres faster than other cars.',
         'The city should reduce the number of cars on its roads.',
         'Switching to electric cars will not on its own make the city\'s air clean.'], 4,
        'Автор спорит с мнением «электромобили решат проблему».',
        ['Пыль от шин и тормозов — довод, последний тезис — вывод.'],
        ['A — чужая позиция.', 'B, C — доводы.', 'D — в тексте не предлагается.'],
        'Главный вывод часто стоит после «But» и опровергает чужое мнение.')

MC3 = q('MC', 'It is often claimed that learning a second language at school is a waste of time, because so many adults forget the language they studied. '
        'But the value of language study does not lie only in being able to speak the language later. Students who learn a second language become more aware of how '
        'their own language works, and they practise memory skills that help in other subjects. School language lessons are therefore worthwhile '
        'even for students who later forget most of the language.' + Q_MC,
        ['Many adults forget the language they studied at school.',
         'School language lessons are worthwhile even for students who later forget most of the language.',
         'Learning a second language makes students more aware of their own language.',
         'Language study helps students in other subjects.',
         'Schools should teach two foreign languages instead of one.'], 1,
        '«Therefore» вводит вывод.',
        ['Осознание родного языка и память — доводы в пользу последнего предложения.'],
        ['A — чужой довод.', 'C, D — доводы.', 'E — не сказано.'],
        'Ищите слова therefore, so, thus.')

# ------------------------------------------------------------------ weaken
WKN1 = q('WKN', 'The city should replace its old streetlights with LED lights. LED lights use about half as much electricity as the old lights, '
         'so the change will cut the city\'s street-lighting bill by about half.' + Q_WKN,
         ['LED lights last much longer than the old lights.',
          'Several other cities have already switched to LED streetlights.',
          'A large part of the street-lighting bill is a fixed maintenance charge that does not depend on electricity use.',
          'The price of electricity is expected to rise next year.',
          'Some residents prefer the colour of the old lights.'], 2,
         'Вывод: счёт упадёт вдвое, потому что электричества нужно вдвое меньше.',
         ['Если большая часть счёта — фиксированная плата, вдвое меньше электричества не даст половины экономии.'],
         ['A — усиливает.', 'B, E — не о размере счёта.', 'D — не меняет долю экономии.'],
         'Ищите разрыв между «расход вдвое меньше» и «счёт вдвое меньше».')

WKN2 = q('WKN', 'A café owner noticed that on days when she played slow music, customers stayed longer and spent more. '
         'She concluded that playing slow music causes customers to spend more.' + Q_WKN,
         ['Slow music costs less to play in public than fast music.',
          'She usually played slow music on cold, rainy days, when customers stay indoors longer anyway.',
          'Most of her customers are regulars who come every day.',
          'Other cafés have noticed the same effect of slow music.',
          'Customers who stay longer usually order a second drink.'], 1,
         'Корреляция → вывод о причине. Ищем другую причину.',
         ['Холодная погода сама удерживает людей — музыка может быть ни при чём.'],
         ['D, E — усиливают.', 'A, C — не связаны с причиной.'],
         'Альтернативная причина — главный способ ослабить причинный вывод.')

WKN3 = q('WKN', 'Students who play in school sports teams get better exam results than students who do not. Clearly, playing team sports improves academic performance, '
         'so all students should be required to join a team.' + Q_WKN,
         ['Team sports teach students to cooperate with others.',
          'Some excellent students do not play any sport.',
          'Sports teams train after school hours.',
          'Schools allow only students with good grades to join their sports teams.',
          'Exam results have improved across the whole country.'], 3,
         'Возможна обратная связь: хорошие оценки → место в команде.',
         ['Если в команду берут только хорошистов, спорт не причина высоких оценок.'],
         ['B — отдельные исключения не опровергают тенденцию.', 'A — довод «за» спорт вообще.', 'C, E — не по теме.'],
         'Проверьте, не перепутаны ли причина и следствие.')

WKN4 = q('WKN', 'A new phone app claims to improve sleep. In a trial, 80% of people who used the app for a month said they slept better at the end of the month '
         'than at the start. The app must therefore be effective.' + Q_WKN,
         ['The app is free to download.',
          'The app plays relaxing sounds at night.',
          'Sleeping well improves concentration.',
          'The app was designed with the help of doctors.',
          'The trial began during the exam period and ended after the exams were over.'], 4,
         'Нет контрольной группы: сон мог улучшиться и без приложения.',
         ['Конец экзаменов — другая причина лучшего сна.'],
         ['B, D — скорее усиливают.', 'A, C — не связаны с эффективностью.'],
         'Без сравнения с теми, кто не пользовался, причинный вывод слаб.')

# ------------------------------------------------------------------ strengthen
STR1 = q('STR', 'The school canteen should stop selling sugary drinks. If students cannot buy them at school, they will drink less sugar overall, '
         'and this will improve their health.' + Q_STR,
         ['Sugary drinks are the canteen\'s most profitable item.',
          'Several schools in other countries have stopped selling sugary drinks.',
          'Students rarely bring drinks from home or buy them in shops near the school.',
          'Some fruit juices sold in the canteen contain as much sugar as fizzy drinks.',
          'Many students say they like the taste of sugary drinks.'], 2,
         'Слабое место: ученики могут купить напитки в другом месте.',
         ['Если они почти не приносят и не покупают напитки вне школы, запрет действительно снизит сахар.'],
         ['D — ослабляет: сахар останется в соках.', 'A — довод против запрета.', 'B — нет данных о результате.', 'E — не о результате запрета.'],
         'Усиливает то, что закрывает лазейку в рассуждении.')

STR2 = q('STR', 'Making public transport free in Astana would reduce traffic jams, because many drivers would leave their cars at home and take the bus instead.' + Q_STR,
         ['Buses in Astana are often crowded at rush hour.',
          'Free public transport would be expensive for the city.',
          'In a survey, most drivers in Astana said that the cost of tickets is the main reason they do not use buses.',
          'Traffic jams in Astana are worst in winter.',
          'Many people in Astana walk to work.'], 2,
         'Вывод держится на том, что водители пересядут на автобус, если он бесплатный.',
         ['Если цена — главная причина не ездить на автобусе, бесплатный проезд их переманит.'],
         ['A — скорее ослабляет.', 'B — довод против, но не о пробках.', 'D, E — не связаны с выводом.'],
         'Ищите факт, который подтверждает ключевое допущение.')

STR3 = q('STR', 'Reading aloud to toddlers improves their vocabulary. In a study, toddlers whose parents read to them every day knew more words at the age of three '
         'than toddlers who were rarely read to.' + Q_STR,
         ['Most parents enjoy reading to their children.',
          'Children\'s books have become more expensive.',
          'Toddlers who watch television also learn new words.',
          'In the study, the two groups of families had similar levels of income and parental education.',
          'Some toddlers who were rarely read to had large vocabularies.'], 3,
         'Главная угроза — другие различия между семьями.',
         ['Если доход и образование одинаковы, остаётся объяснение «чтение».'],
         ['E — ослабляет.', 'C — не о чтении.', 'A, B — не по теме.'],
         'Исключение альтернативной причины усиливает причинный вывод.')

STR4 = q('STR', 'The city should plant trees along Respublika Avenue to reduce the amount of dust that reaches nearby flats. The leaves of trees trap dust from the air.' + Q_STR,
         ['Trees along roads need watering in summer.',
          'Some residents do not want trees blocking their view.',
          'On streets where trees were planted, dust in nearby flats fell, while on similar streets without new trees it did not change.',
          'Dust in the air can cause breathing problems.',
          'Most trees lose their leaves in winter.'], 2,
         'Нужно доказательство, что деревья реально уменьшают пыль в квартирах.',
         ['Сравнение с похожими улицами без деревьев показывает эффект.'],
         ['E — ослабляет.', 'D — объясняет вред пыли, но не эффект деревьев.', 'A, B — не о пыли.'],
         'Лучшее усиление — данные «до/после» с контрольной группой.')

# ------------------------------------------------------------------ external factors (crit-5 style)
EF1 = q('EF', 'Since an entry fee was introduced at the national park, the number of visitors has fallen by a third. The fee is clearly discouraging people from visiting, '
        'and it should be removed.' + Q_WKN,
        ['Visitor numbers at the park had been rising before the fee was introduced.',
         'Other national parks charge higher entry fees.',
         'Most visitors come to the park at weekends.',
         'The fee is the same for adults and children.',
         'The main road to the park was closed for repairs for most of the time since the fee was introduced.'], 4,
        'Падение посетителей объясняют платой. Ищем другую причину.',
        ['Закрытая дорога сама сокращает число посетителей.'],
        ['A — усиливает: рост сменился падением после платы.', 'B, C, D — не объясняют падение.'],
        'Другая причина того же следствия ослабляет вывод.')

EF2 = q('EF', 'Children who learn to swim at school are less likely to drown later in life. All schools should therefore offer swimming lessons.' + Q_STR,
        ['Building a swimming pool is expensive.',
         'Most people who drown never learned to swim properly.',
         'Some children are afraid of water.',
         'Most schools already have a sports hall.',
         'Drowning is more common in summer than in winter.'], 1,
        'Нужно подтвердить связь «умение плавать → меньше утоплений».',
        ['Если тонут в основном не умеющие плавать, уроки плавания действительно спасают.'],
        ['A — ослабляет рекомендацию.', 'C, D, E — не о связи.'],
        'Усиливает факт, который делает довод весомее.')

# ------------------------------------------------------------------ flaw
FLAW1 = q('FLAW', 'Everyone who wins the national maths olympiad practises for at least two hours a day. Bota practises for at least two hours a day, '
          'so she will win the olympiad.' + Q_FLAW,
          ['It generalises from a single example.',
           'It assumes that what is needed to win is enough to guarantee winning.',
           'It attacks Bota rather than her ideas.',
           'It relies on the opinion of an expert.',
           'It assumes that practising for more than two hours a day is harmful.'], 1,
          'Победитель → тренируется 2 часа. Обратное не следует.',
          ['Тренировка — необходимое условие, а не достаточное.'],
          ['A — обобщения по одному случаю нет.', 'C, D, E — этого в тексте нет.'],
          'Классическая ошибка: путать необходимое и достаточное.')

# ------------------------------------------------------------------ problem solving
PS1 = q('PS', 'A shop sells pens for ₸120 each, or in packs of 5 for ₸500. Amina needs exactly 18 pens, and does not want any extra.'
        '<br><br><b>What is the least amount she can pay?</b>',
        ['₸1800', '₸1860', '₸1900', '₸2000', '₸2160'], 1,
        'Пачка выгоднее: ₸100 за ручку против ₸120.',
        ['3 пачки = 15 ручек за ₸1500, ещё 3 ручки по ₸120 = ₸360.', 'Итого ₸1860.'],
        ['D — 4 пачки дают 20 ручек, а лишние ей не нужны.', 'A — 18 ручек по ₸100 так не купить.', 'E — все по одной.'],
        'Читайте ограничения: «no extra».')

PS2 = q('PS', 'A clock gains 3 minutes every hour. It is set to the correct time at 9:00 am.'
        '<br><br><b>What time does the clock show when the correct time is 5:00 pm on the same day?</b>',
        ['5:08 pm', '5:21 pm', '5:24 pm', '5:27 pm', '5:32 pm'], 2,
        'С 9:00 до 17:00 — 8 часов.',
        ['8 · 3 = 24 минуты вперёд → 17:24.'],
        ['B — 7 часов.', 'D — 9 часов.', 'A — 8 минут вместо 8·3.'],
        'Считайте точно интервал.')

PS3 = q('PS', 'Five friends — Arman, Bota, Chingis, Dana and Erlan — sit in a row of five seats. Chingis sits at the left-hand end. '
        'Arman does not sit at either end and does not sit next to Chingis. Dana sits immediately to the right of Arman. Bota sits next to Erlan.'
        '<br><br><b>Who sits at the right-hand end?</b>',
        ['Arman', 'Bota', 'Chingis', 'Dana', 'Erlan'], 3,
        'Места 1–5, Чингис на 1. Арман не на краю и не рядом с Чингисом → место 3 или 4.',
        ['Арман 3 → Дана 4, свободны 2 и 5 — Бота и Ерлан не рядом. Не подходит.',
         'Арман 4 → Дана 5, Бота и Ерлан на 2 и 3 — рядом. Справа Дана.'],
        ['B, E — у края только при Армане на 2, но он не может сидеть рядом с Чингисом.', 'A — не на краю по условию.', 'C — слева.'],
        'Перебирайте позицию самого ограниченного человека.')

PS4 = q('PS', 'Taxi company P charges ₸600 plus ₸150 per km. Taxi company Q charges ₸1000 plus ₸110 per km.'
        '<br><br><b>For what length of journey do the two companies charge the same?</b>',
        ['4 km', '8 km', '10 km', '12 km', '16 km'], 2,
        'Приравняйте стоимость.',
        ['600 + 150k = 1000 + 110k → 40k = 400 → k = 10 км.'],
        ['A, B — Q всё ещё дороже.', 'D, E — P уже дороже.'],
        'Разница посадки ₸400, разница за км ₸40.')

PS5 = q('PS', 'The mean age of four brothers is 15. When their father is included, the mean age of the five of them is 20.'
        '<br><br><b>How old is the father?</b>',
        ['20', '35', '40', '45', '100'], 2,
        'Работайте с суммами, а не средними.',
        ['Сумма братьев 4 · 15 = 60, всех пятерых 5 · 20 = 100.', 'Отец: 100 − 60 = 40.'],
        ['B — 20 + 15.', 'E — общая сумма.', 'A — среднее.'],
        'Среднее × количество = сумма.')

PS6 = q('PS', 'A wooden cube with edges 3 cm long is painted on all six faces. It is then cut into 27 cubes, each with edges 1 cm long.'
        '<br><br><b>How many of the small cubes have paint on exactly two faces?</b>',
        ['6', '8', '12', '18', '24'], 2,
        'Две окрашенные грани — у кубиков на рёбрах, но не в углах.',
        ['На каждом из 12 рёбер один такой кубик → 12.'],
        ['A — центры граней (одна грань).', 'B — углы (три грани).', 'E — по 2 на ребро, как у куба 4 см.'],
        'Углы — 3 грани, рёбра — 2, центры граней — 1.')

PS7 = q('PS', 'A train leaves Astana at 22:40 and arrives in Almaty at 13:15 the next day. Both cities use the same time zone.'
        '<br><br><b>How long does the journey take?</b>',
        ['9 h 25 min', '13 h 35 min', '14 h 25 min', '14 h 35 min', '15 h 35 min'], 3,
        'Разбейте на части до полуночи и после.',
        ['22:40 → 00:00 = 1 ч 20 мин; 00:00 → 13:15 = 13 ч 15 мин.', 'Итого 14 ч 35 мин.'],
        ['A — вычли 13:15 из 22:40.', 'C — ошибка с минутами.'],
        'Через полночь считайте двумя частями.')

PS8 = q('PS', 'In a class of 30 students, 18 study French, 15 study German and 5 study neither language.'
        '<br><br><b>How many students study both languages?</b>',
        ['3', '5', '8', '10', '13'], 2,
        'Хотя бы один язык изучают 30 − 5 = 25.',
        ['18 + 15 − 25 = 8.'],
        ['A — забыли про 5 «ни одного».', 'E — 18 − 5.'],
        'Круги Эйлера: сумма − пересечение = объединение.')

PS9 = q('PS', 'A recipe uses flour and sugar in the ratio 5 : 2 by weight. Dana has 600 g of flour and 200 g of sugar.'
        '<br><br><b>What is the greatest total weight of flour and sugar she can use while keeping to the recipe\'s ratio?</b>',
        ['560 g', '600 g', '700 g', '800 g', '840 g'], 2,
        'Проверьте, что закончится первым.',
        ['Для 600 г муки нужно 240 г сахара — его не хватает.', 'Сахар 200 г → мука 500 г → всего 700 г.'],
        ['E — сахара не хватит.', 'D — всё подряд, без пропорции.'],
        'Ограничивает тот ингредиент, которого меньше относительно пропорции.')

PLAN = {
    'crit-5': [ASM1, CON1, ASM2, EF1, CON2, ASM3, EF2, CON3],
    'crit-7': [MC1, PS1],
    'crit-9': [WKN1],
    'crit-10': [WKN2],
    'crit-11': [STR1],
    'crit-15': [CON4, STR2, WKN3, PS4],
    'crit-16': [PS6],
    'crit-17': [FLAW1, PS2, MC2, PS3],
    'crit-18': [STR3],
    'crit-28': [MC3],
    'crit-67': [CON5, PS5, WKN4, PS7, CON6, STR4, PS8, ASM4, PS9],
}


def balance():
    """Spread right answers evenly over A–E (problem-solving options stay in numeric order)."""
    cyc = 0
    for page in PLAN:
        out = []
        for x in PLAN[page]:
            out.append(place(x, cyc % 5) if x['topic'] != 'PS' else x)
            if x['topic'] != 'PS':
                cyc += 1
        PLAN[page] = out


def check():
    # problem-solving answers recomputed
    assert min(p * 500 + s * 120 for p in range(5) for s in range(19) if 5 * p + s == 18) == 1860
    assert 9 * 60 + 8 * 63 == 17 * 60 + 24
    seats = []
    import itertools
    for perm in itertools.permutations('ABCDE'):
        pos = {n: i for i, n in enumerate(perm)}
        if pos['C'] != 0 or pos['A'] in (0, 4) or abs(pos['A'] - pos['C']) == 1:
            continue
        if pos['D'] != pos['A'] + 1 or abs(pos['B'] - pos['E']) != 1:
            continue
        seats.append(perm[4])
    assert set(seats) == {'D'}, seats
    assert [k for k in range(50) if 600 + 150 * k == 1000 + 110 * k] == [10]
    assert 5 * 20 - 4 * 15 == 40
    assert sum(1 for x in range(3) for y in range(3) for z in range(3) if [x in (0, 2), y in (0, 2), z in (0, 2)].count(True) == 2) == 12
    assert (24 * 60 - (22 * 60 + 40)) + 13 * 60 + 15 == 14 * 60 + 35
    assert 18 + 15 - (30 - 5) == 8
    assert min(600 / 5, 200 / 2) * 7 == 700
    for page, qs in PLAN.items():
        for x in qs:
            assert len(x['options']) == 5 and len(set(x['options'])) == 5
            assert 'Ответ: <b>%s</b>' % L[x['correct']] in x['explain']
    letters = [L[x['correct']] for qs in PLAN.values() for x in qs]
    from collections import Counter
    print('answer letters:', Counter(letters))


def main(write):
    balance()
    check()
    s = open('tests.js', encoding='utf-8').read()
    head, arr, tail = s[:s.index('[')], s[s.index('['):s.rindex(']') + 1], s[s.rindex(']') + 1:]
    tests = {t['id']: t for t in json.loads(arr)}
    order = [t['id'] for t in json.loads(arr)]
    for page, add in PLAN.items():
        html = open(page + '.html', encoding='utf-8').read()
        qs = json.loads(QRE.search(html).group(1))
        assert len(qs) + len(add) == 30, (page, len(qs), len(add))
        nid = max([x['id'] for x in qs] + [30]) + 1
        for x in add:
            x = dict(x, id=nid)
            nid += 1
            qs.append({k: x[k] for k in ('id', 'topic', 'text', 'image', 'options', 'correct', 'explain', 'src')})
        print(page, '->', len(qs))
        if write:
            body = json.dumps(qs, ensure_ascii=False)
            html = QRE.sub(lambda _: 'const questions = ' + body + ';', html, count=1)
            html = re.sub(r'\((\d+) questions', '(%d questions' % len(qs), html, count=1)
            open(page + '.html', 'w', encoding='utf-8').write(html)
            t = tests[page]
            t['q'] = len(qs)
            if '+ Prepline' not in t['src']:
                t['src'] += ' · + %d Prepline question%s' % (len(add), '' if len(add) == 1 else 's')
    if write:
        open('tests.js', 'w', encoding='utf-8').write(head + json.dumps([tests[i] for i in order], ensure_ascii=False, indent=0) + tail)


if __name__ == '__main__':
    main('--write' in sys.argv)
