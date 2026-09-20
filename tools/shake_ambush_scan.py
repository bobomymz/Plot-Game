# -*- coding: utf-8 -*-
"""
精筛「突发袭击」场景：抖动动画只应加在「玩家没有预期到」的时刻。
入选标准（满足任一，且文本证据落在该场景的 text 字段）：
  A. 开门/拐角/转身 突然遭遇——"突然""猛地""窜出""闪出来""跳出来""迎面"
  B. 背后/侧面 偷袭——"背后""身后""后面传来""阴风"
  C. 原本以为是活人，结果尸变/反目
  D. 尸潮涌入/门被撞开/合围
排除：
  - 已带 shake
  - 结局节点（结局以文本收尾，抖动无节奏意义，除非是突然死亡瞬间）
  - 纯粹是"看到远方有丧尸"的铺垫场景
"""
import re, os, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'story')

SUDDEN = ['突然', '猛地', '猛然', '冷不防', '猛地一', '窜出', '窜了出', '闪出', '闪出来',
          '跳了出来', '跳出来', '迎面', '猝不及防', '措手不及', '不知什么', '从背后',
          '从身后', '背后传来', '身后传来', '背后一亮', '阴风', '一转头', '转过身',
          '回过头', '再看一眼', '再一回头']
AMBUSH = ['背后', '身后', '后面', '偷袭', '悄无声息', '不知不觉']
HORDE = ['一拥而上', '围拢', '合围', '尸潮', '撞开', '撞破', '破门', '涌', '挤过来', '堵实']
UNDEAD_TWIST = ['尸变', '原来它', '原来一直', '竟是一只', '竟然是', '居然是丧尸', '全都在']

def load_scenes(src):
    lines = src.split('\n')
    starts = []
    for i, ln in enumerate(lines):
        m = re.match(r'^(\s{2,4})"([^"]+)"\s*:\s*\{', ln)
        if m:
            starts.append((i, m.group(2), len(m.group(1))))
    out = []
    for idx, (s, name, ind) in enumerate(starts):
        e = len(lines)
        for j in range(idx + 1, len(starts)):
            if starts[j][2] <= ind:
                e = starts[j][0]
                break
        out.append((s, name, '\n'.join(lines[s:e])))
    return out

def get_text(block):
    """粗略抽取 text 字段（字符串或函数体）"""
    m = re.search(r'\btext\s*:\s*(?:"((?:[^"\\]|\\.)*)"|`([^`]*)`|function)', block)
    if not m:
        return ''
    if m.group(1):
        return m.group(1)
    if m.group(2):
        return m.group(2)
    # 函数：抓到下一个顶层字段
    fm = re.search(r'\btext\s*:\s*function[^{]*\{', block)
    if not fm:
        return ''
    depth = 1
    i = fm.end()
    while i < len(block) and depth:
        if block[i] == '{': depth += 1
        elif block[i] == '}': depth -= 1
        i += 1
    return block[fm.end():i - 1]

def main():
    hits = []
    for dirpath, _, files in os.walk(ROOT):
        for fn in sorted(files):
            if not fn.endswith('.js'):
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, os.path.join(ROOT, '..'))
            src = open(path, encoding='utf-8').read()
            for s, name, block in load_scenes(src):
                if 'shake' in block:
                    continue
                if name.startswith('结局') or '结局-' in name:
                    continue
                t = get_text(block)
                if not t:
                    continue
                sd = [w for w in SUDDEN if w in t]
                am = [w for w in AMBUSH if w in t]
                hd = [w for w in HORDE if w in t]
                ut = [w for w in UNDEAD_TWIST if w in t]
                # 必须有丧尸/暴力语境
                violent = ('丧尸' in t or '尸' in t or '咬' in t or '扑' in t or '刀' in t or '枪' in t)
                if not violent:
                    continue
                if not (sd or am or hd or ut):
                    continue
                score = len(sd) * 3 + len(am) * 2 + len(hd) * 2 + len(ut) * 3
                hits.append((score, rel, s + 1, name, sd, am, hd, ut, t))
    hits.sort(reverse=True)
    for sc, rel, ln, name, sd, am, hd, ut, t in hits:
        tags = []
        if sd: tags.append('突袭:' + ','.join(sd[:3]))
        if am: tags.append('背后:' + ','.join(am[:2]))
        if hd: tags.append('涌入:' + ','.join(hd[:3]))
        if ut: tags.append('反转:' + ','.join(ut[:2]))
        print(f'[{sc:2d}] {rel}:{ln}  {name}')
        print(f'      {" | ".join(tags)}')
        print(f'      {t[:150].strip()}')
        print()

if __name__ == '__main__':
    main()
