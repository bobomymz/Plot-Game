# -*- coding: utf-8 -*-
import io

path = 'story/金谊广场.js'
with io.open(path, encoding='utf-8') as f:
    lines = f.readlines()

LQ = '“'  # “
RQ = '”'  # ”

fix_count = 0
for i, line in enumerate(lines):
    if i == 740:  # 停车场场景单独处理
        continue
    s = line
    if LQ in s and RQ in s:
        # 仅当行内中文引号恰好一左一右(作为边界)时才整体替换
        if s.count(LQ) == 1 and s.count(RQ) == 1:
            stripped = s.rstrip()
            if stripped.endswith(RQ + ';') or stripped.endswith(RQ + ';'):
                new = s.replace(LQ, '"', 1)
                idx = new.rfind(RQ)
                new = new[:idx] + '"' + new[idx + 1:]
                if new != s:
                    lines[i] = new
                    fix_count += 1

with io.open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('fixed', fix_count, 'simple-boundary lines')
