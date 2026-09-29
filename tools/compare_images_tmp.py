# -*- coding: utf-8 -*-
import os, io, sys

root = os.path.abspath('.')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Collect all code text (js/html/css), plus engine preloads
all_text = []
for dp, dn, fn in os.walk(root):
    if '.git' in dp:
        continue
    for f in fn:
        if not f.endswith(('.js', '.html', '.css')):
            continue
        p = os.path.join(dp, f)
        try:
            all_text.append(open(p, encoding='utf-8').read())
        except Exception:
            all_text.append(open(p, encoding='gbk').read())

combined = '\n'.join(all_text)

# List all existing image files
existing = []
for dirpath, dirnames, filenames in os.walk(os.path.join(root, 'images')):
    for f in sorted(filenames):
        full = os.path.join(dirpath, f)
        rel = os.path.relpath(full, root).replace('\\', '/')
        existing.append(rel)

print("=== 从未在代码(含注释)中出现过的文件 ===")
unused = []
for rel in existing:
    if rel not in combined:
        unused.append(rel)
for f in sorted(unused):
    print(f)
print()
print("总数:", len(unused))
