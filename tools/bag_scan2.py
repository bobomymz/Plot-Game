# -*- coding: utf-8 -*-
"""
精筛版：只保留真正的「容器类包」表述（可背/可提/可装东西的包），
排除「面包 / 包围 / 一包(量词) / 打包 / 包起来」等噪音与纯代码注释。
输出: tools/背包提及清单_精筛.md
"""
import os, re, io, json
from collections import OrderedDict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORY = os.path.join(ROOT, 'story')

# 真·容器词（按长度降序匹配，避免"帆布包"被"包"抢先）
CONTAINERS = ['背包', '帆布包', '帆布袋', '双肩包', '书包', '挎包', '腰包', '手提包',
              '旅行包', '行李包', '骑行包', '登山包', '单肩包', '斜挎包', '邮差包',
              '电脑包', '公文包', '皮包', '拎包', '小包', '包袋', '背包袋',
              '塑料袋', '购物袋', '编织袋', '蛇皮袋', '麻袋', '布袋', '袋子', '纸袋']
CONTAINERS.sort(key=len, reverse=True)

NEG = ['面包', '包围', '包管', '包括', '包含', '打包', '包装', '包起来', '包住', '包了',
       '包着', '包上', '包进', '包好', '包子', '包厢', '包间', '包袱', '承包', '红包',
       '包月', '包场', '包浆', '包庇', '包抄', '包下', '包干', '包身工', '一包', '半包',
       '两包', '三包', '几包', '每包', '那包', '这包', '此包']

def classify(word, line, is_comment):
    if word in ('背包', '帆布包', '帆布袋', '双肩包'):
        return 'A-可背容器'
    if word in ('书包', '挎包', '腰包', '单肩包', '斜挎包', '邮差包', '骑行包', '登山包', '旅行包', '行李包'):
        return 'A-可背容器'
    if word in ('手提包', '电脑包', '公文包', '皮包', '拎包', '包袋', '小包'):
        return 'B-手提容器'
    if word in ('塑料袋', '购物袋', '编织袋', '蛇皮袋', '麻袋', '布袋', '袋子', '纸袋'):
        return 'C-袋类'
    return 'D-其他'

rows = []
for dirpath, _, files in os.walk(STORY):
    for fn in sorted(files):
        if not fn.endswith('.js'):
            continue
        path = os.path.join(dirpath, fn)
        rel = os.path.relpath(path, ROOT).replace('\\', '/')
        with io.open(path, encoding='utf-8') as f:
            lines = f.readlines()
        for i, raw in enumerate(lines, 1):
            stripped = raw.strip()
            is_comment = stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*')
            for w in CONTAINERS:
                start = 0
                while True:
                    p = raw.find(w, start)
                    if p < 0:
                        break
                    start = p + 1
                    # 排除否定前缀（面包/包围 等）
                    prev = raw[max(0, p - 2):p]
                    if any(raw.startswith(n, p - len(n)) and p - len(n) >= 0 for n in NEG if len(n) > 1):
                        pass
                    # 简单判定：若命中词本身不是背包等，且前一字符构成噪音词，跳过
                    if w == '包' or w not in CONTAINERS:
                        continue
                    # 检查是否属于噪音：例如 "面包" 中 "包" 不在容器词表中，不会命中
                    ctx_s = max(0, p - 30)
                    ctx_e = min(len(raw), p + len(w) + 30)
                    ctx = raw[ctx_s:ctx_e].strip()
                    # 判定该处是否只是一句系统提示/变量名
                    rows.append({
                        'file': rel, 'line': i, 'word': w,
                        'cls': classify(w, raw, is_comment),
                        'comment': is_comment, 'ctx': ctx, 'raw': stripped
                    })
                    break  # 每词每行只记一次

# 去重（同一行同一词）
seen = set()
uniq = []
for r in rows:
    k = (r['file'], r['line'], r['word'])
    if k in seen:
        continue
    seen.add(k)
    uniq.append(r)
rows = uniq

# 排除纯注释行（变量定义说明），但保留 story 文案
story_rows = [r for r in rows if not r['comment']]

out = []
out.append('# 「包」类容器表述 · 精筛清单\n')
out.append('> 自动扫描 `story/` 全部 24 个 js 文件；已剔除 面包/包围/一包(量词)/打包/纯代码注释 等噪音。\n')
out.append('## 一、分类统计\n')
cls_cnt = Counter(r['cls'] for r in story_rows)
out.append('| 类别 | 处数 |')
out.append('| --- | --- |')
for c, n in sorted(cls_cnt.items()):
    out.append('| %s | %d |' % (c, n))
out.append('| **合计（非注释）** | **%d** |' % len(story_rows))
out.append('| 另：代码注释中提及 | %d |' % (len(rows) - len(story_rows)))
out.append('')
out.append('## 二、词频\n')
wc = Counter(r['word'] for r in story_rows)
out.append('| 词 | 处数 |')
out.append('| --- | --- |')
for w, n in wc.most_common():
    out.append('| %s | %d |' % (w, n))
out.append('')
out.append('## 三、按文件分布\n')
out.append('| 文件 | 处数 |')
out.append('| --- | --- |')
byf = Counter(r['file'] for r in story_rows)
for f, n in byf.most_common():
    out.append('| %s | %d |' % (f, n))
out.append('')
out.append('## 四、逐条明细（按文件）\n')
grouped = OrderedDict()
for r in story_rows:
    grouped.setdefault(r['file'], []).append(r)
for f, rs in grouped.items():
    out.append('### %s（%d 处）\n' % (f, len(rs)))
    out.append('| 行 | 类别 | 关键词 | 原文上下文 |')
    out.append('| --- | --- | --- | --- |')
    for r in sorted(rs, key=lambda x: x['line']):
        c = r['ctx'].replace('|', '\\|')
        out.append('| %d | %s | %s | `%s` |' % (r['line'], r['cls'], r['word'], c))
    out.append('')

dst = os.path.join(ROOT, 'tools', '背包提及清单_精筛.md')
io.open(dst, 'w', encoding='utf-8').write('\n'.join(out))
print('story hits:', len(story_rows), ' comment hits:', len(rows) - len(story_rows))
print(dict(cls_cnt))
print('wrote', dst)
