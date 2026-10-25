# -*- coding: utf-8 -*-
"""
Prepline: close the whole site to everyone except the owner (lock.js).

  python lock-site.py       # put lock.js first in <head> of every .html page
  python lock-site.py off   # remove it, the site is open again
"""
import glob, re, sys

TAG = '<script src="{p}lock.js"></script><!-- prepline-lock -->'
off = len(sys.argv) > 1 and sys.argv[1] == 'off'
n = 0
for f in glob.glob('**/*.html', recursive=True):
    s = open(f, encoding='utf-8').read()
    new = re.sub(r'<script src="[./]*lock\.js"></script><!-- prepline-lock -->\n?', '', s)
    if not off:
        prefix = '../' * f.count('/')
        tag = TAG.format(p=prefix)
        m = re.search(r'<head[^>]*>', new, re.I)
        if m:
            new = new[:m.end()] + '\n' + tag + new[m.end():]
        else:
            new = tag + '\n' + new
    if new != s:
        open(f, 'w', encoding='utf-8').write(new); n += 1
print(('unlocked' if off else 'locked'), n, 'pages')
