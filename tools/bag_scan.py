# -*- coding: utf-8 -*-
"""
扫描剧情文本中所有含「包」的表述，按语义分类，输出清单。
用法: python tools/bag_scan.py
输出: tools/背包提及清单.md
"""
import os, re, json, io, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORY = os.path.join(ROOT, 'story')

# 与「包」无关的高频词（包管/包括/包起来/包含 等），以及代码用词
NOISE = ['包括', '包含', '包管', '承包', '包办', '打包', '包装', '包起来', '包住', '包了',
         '包着', '包上', '包进', '包好', '面包', '包子', '包厢', '包间', '包围', '包袱',
         '承包', '红包', '包月', '包场', '包浆', '包膜', '包庇']

BAG_WORDS = ['背包', '帆布包', '帆布袋', '双肩包', '书包', '挎包', '腰包', '手提包', '旅行包',
             '行李包', '邮差包', '骑行包', '登山包', '单肩包', '斜挎包', '腰包', '包袋',
             '拎包', '皮包', '公文包', '电脑包', '纸袋', '塑料袋', '购物袋', '编织袋',
             '蛇皮袋', '麻袋', '布袋', '袋子']

rows = []
for dirpath, _, files in os.walk(STORY):
    for fn in files:
        if not fn.endswith('.js'):
            continue
        path = os.path.join(dirpath, fn)
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        with io.open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            # 跳过纯注释行里明显的代码注释（保留，但标记）
            for m in re.finditer(r'包', line):
                s = max(0, m.start() - 18)
                e = min(len(line), m.end() + 18)
                ctx = line[s:e].strip()
                # 判定类别
                if any(w in line[max(0,m.start()-1):m.end()+2] for w in ['包括','包含','包管','承包','包办']):
                    continue
                hit = None
                for w in BAG_WORDS:
                    if w in line:
                        hit = w
                        break
                rows.append({
                    'file': rel, 'line': i, 'word': hit or '包',
                    'ctx': ctx, 'raw': line.rstrip()
                })

# 按文件聚合
from collections import OrderedDict, Counter
bysite = OrderedDict()
for r in rows:
    bysite.setdefault(r['file'], []).append(r)

wordcnt = Counter(r['word'] for r in rows)

out = []
out.append('# 「包」相关表述全量清单\n')
out.append('> 由 `tools/bag_scan.py` 自动扫描 story/ 全部 24 个 js 文件生成。\n')
out.append('## 一、词汇频次总览\n')
out.append('| 词 | 出现次数 |')
out.append('| --- | --- |')
for w, c in wordcnt.most_common():
    out.append('| %s | %d |' % (w, c))
out.append('')
out.append('总计 **%d** 处含「包」表述。\n' % len(rows))
out.append('## 二、按文件分布\n')
out.append('| 文件 | 处数 |')
out.append('| --- | --- |')
for f, rs in sorted(bysite.items(), key=lambda x: -len(x[1])):
    out.append('| %s | %d |' % (f, len(rs)))
out.append('')
out.append('## 三、逐条明细\n')
for f, rs in bysite.items():
    out.append('### %s（%d 处）\n' % (f, len(rs)))
    out.append('| 行 | 关键词 | 上下文 |')
    out.append('| --- | --- | --- |')
    for r in rs:
        c = r['ctx'].replace('|', '\\|')
        out.append('| %d | %s | `%s` |' % (r['line'], r['word'], c))
    out.append('')

dst = os.path.join(ROOT, 'tools', '背包提及清单.md')
with io.open(dst, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('total hits:', len(rows))
print('words:', wordcnt.most_common(15))
print('wrote', dst)
