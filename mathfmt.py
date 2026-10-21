"""Turn plain-text math in explanations into readable HTML: x^(..) -> superscript, a/b and (..)/(..) -> stacked fraction."""
import re
OP = set('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZπ√αβγθφλμ,.·²³⁴⁰¹⁵⁶⁷⁸⁹₁₂₃∞′')
SUPOK = set('0123456789abcdefghijklmnopqrstuvwxyzπ.,−-+/')

def _match_fwd(s, i):  # s[i]=='(' -> index of matching ')'
    d = 0
    for j in range(i, len(s)):
        if s[j] == '(': d += 1
        elif s[j] == ')':
            d -= 1
            if d == 0: return j
    return -1

def _match_back(s, i):  # s[i]==')' -> index of matching '('
    d = 0
    for j in range(i, -1, -1):
        if s[j] == ')': d += 1
        elif s[j] == '(':
            d -= 1
            if d == 0: return j
    return -1

def sup(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == '^' and i + 1 < len(s):
            if s[i + 1] == '(':
                j = _match_fwd(s, i + 1)
                if j > 0:
                    out.append('<sup>%s</sup>' % sup(s[i + 2:j]).replace('/', '⁄')); i = j + 1; continue
            j = i + 1
            if j < len(s) and s[j] in '−-': j += 1
            while j < len(s) and s[j] in SUPOK and s[j] not in '/+−-': j += 1
            e = s[i + 1:j]
            while e and e[-1] in '.,': e = e[:-1]; j -= 1
            if e and e not in '−-':
                out.append('<sup>%s</sup>' % e); i = j; continue
        out.append(c); i += 1
    return ''.join(out)

def _left(s, k):  # operand ending at s[k-1]; returns start index or None
    j = k
    if j > 0 and s[j - 1] == ')':
        m = _match_back(s, j - 1)
        return m if m >= 0 else None
    while True:
        if s[:j].endswith('</sup>'):
            m = s.rfind('<sup>', 0, j)
            if m < 0: break
            j = m; continue
        if j > 0 and s[j - 1] in OP: j -= 1; continue
        break
    while j < k and s[j] in '.,·': j += 1
    if j > 0 and s[j - 1] in '−-' and (j == 1 or s[j - 2] in ' ([=≈'): j -= 1
    return j if j < k else None

def _right(s, k):  # operand starting at s[k]; returns end index or None
    if k < len(s) and s[k] == '(':
        m = _match_fwd(s, k)
        return m + 1 if m > 0 else None
    j = k
    if j < len(s) and s[j] in '−-': j += 1
    while True:
        if s.startswith('<sup>', j):
            m = s.find('</sup>', j)
            if m < 0: break
            j = m + 6; continue
        if j < len(s) and s[j] in OP: j += 1; continue
        break
    while j > k and s[j - 1] in '.,·': j -= 1
    return j if j > k and s[k:j] not in '−-' else None

def _strip(x):
    if x.startswith('(') and x.endswith(')') and _match_fwd(x, 0) == len(x) - 1: return x[1:-1]
    return x

def frac(s):
    i = 0
    while True:
        k = s.find('/', i)
        if k < 0: return s
        if k > 0 and s[k - 1] == '<' or s[k + 1:k + 2] == '>' or s[k - 1:k] in ' ' or s[k + 1:k + 2] in ' ':
            i = k + 1; continue
        a = _left(s, k); b = _right(s, k + 1)
        if a is None or b is None:
            i = k + 1; continue
        num, den = _strip(s[a:k]), _strip(s[k + 1:b])
        if not re.search(r'[0-9a-zA-Zπ√αβγθ]', num) or not re.search(r'[0-9a-zA-Zπ√αβγθ]', den):
            i = k + 1; continue
        h = '<span class="fr"><span>%s</span><span>%s</span></span>' % (frac(num), frac(den))
        s = s[:a] + h + s[b:]
        i = a + len(h)

def fmt(s):
    if not isinstance(s, str): return s
    s = frac(sup(s))
    return re.sub(r'\((<span class="fr"><span>[^()]*?</span><span>[^()]*?</span></span>)\)', r'\1', s)
