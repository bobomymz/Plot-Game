# -*- coding: utf-8 -*-
"""
三轮：
1) >=10字完全相同片段（跨场景/跨文件逐字雷同，最硬证据）
2) 验证人工疑点：苍蝇/牛皮纸/猎猎作响/低空盘旋/戛然而止/神兵利器/幽幽的绿光/
   离心机/长桌整齐排列/水泄不通/火辣辣/电梯厅一片死寂/沦陷的城市 等
"""
import re, os, json, glob
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "story")
STR_RE = re.compile(r'"((?:[^"\\]|\\.)*)"', re.S)
SCENE_KEY_RE = re.compile(r'"((?:[^"\\]|\\.)*)"\s*:\s*\{')
FIELD_VALUE_RE = re.compile(
    r'(?:nextScene|elseScene|onTimeout|timeoutScene|targetScene|positionAfterOperation|image|match)\s*:\s*"((?:[^"\\]|\\.)*)"')
HAN = re.compile(r'[\u4e00-\u9fff]')


def blank_comments(text):
    chars = list(text)
    for m in re.finditer(r'/\*.*?\*/', text, re.S):
        for i in range(m.start(), m.end()):
            if chars[i] != '\n':
                chars[i] = ' '
    for m in re.finditer(r'//[^\n]*', text):
        for i in range(m.start(), m.end()):
            if chars[i] != '\n':
                chars[i] = ' '
    return ''.join(chars)


def extract_texts(path):
    raw = open(path, encoding='utf-8').read()
    text = blank_comments(raw)
    scenes = [(m.start(), m.group(1)) for m in SCENE_KEY_RE.finditer(text)]
    excluded = [(m.start(1), m.end(1)) for m in FIELD_VALUE_RE.finditer(text)]

    def in_excluded(pos):
        return any(s <= pos < e for s, e in excluded)

    results = []
    si = 0
    for m in STR_RE.finditer(text):
        start = m.start(1)
        while si + 1 < len(scenes) and scenes[si + 1][0] < start:
            si += 1
        if text[m.end():m.end() + 3].lstrip().startswith(':'):
            continue
        if in_excluded(start):
            continue
        s = m.group(1)
        if len(s) >= 4 and HAN.search(s):
            results.append((scenes[si][1] if scenes else "?", s))
    return results


files = sorted(glob.glob(os.path.join(ROOT, "**", "*.js"), recursive=True))
texts = []  # (fname, scene, text)
for fp in files:
    fname = os.path.basename(fp)
    for scene, s in extract_texts(fp):
        texts.append((fname, scene, s))

# ---- 1) >=10字完全重复片段 ----
# 用滑动窗口：对每条文本，取所有10字窗口；窗口跨场景重复 => 记录
win = 10
occ = defaultdict(list)  # gram -> [(fname, scene, whole_sentence)]
for fname, scene, s in texts:
    # 按句切分，避免跨句窗口误报
    for sent in re.split(r'[。\n！？]', s):
        han_only = re.findall(r'[\u4e00-\u9fff]', sent)
        if len(han_only) < win:
            continue
        joined = ''.join(han_only)
        for i in range(len(joined) - win + 1):
            occ[joined[i:i + win]].append((fname, scene, sent.strip()))

# 聚合：同一句子内相邻窗口合并——按 (sent) 出现的重复片段归并
dup_sents = defaultdict(set)  # normalized repeated fragment set
for gram, lst in occ.items():
    if len(lst) >= 2:
        # 出现位置数
        dup_sents[gram] = lst

# 合并重叠片段：同句子对之间的重复，取最长公共子串更直观——改用句子级对比
# 句子级：找出出现>=2次的完整句子 & 找出句对的最长公共片段
from difflib import SequenceMatcher
sent_occ = defaultdict(list)
for fname, scene, s in texts:
    for sent in re.split(r'[。\n]', s):
        sent = sent.strip()
        han_n = len(HAN.findall(sent))
        if 10 <= han_n <= 60:
            sent_occ[re.sub(r'\{[^}]*\}', 'X', sent)].append((fname, scene))

identical_sents = {k: v for k, v in sent_occ.items() if len(v) >= 2}

print("===== A. 完全相同的句子（>=10汉字，出现>=2次） =====")
for s, locs in sorted(identical_sents.items(), key=lambda x: -len(x[1])):
    print(f"[×{len(locs)}] {s}")
    seen = set()
    for fname, scene in locs:
        key = f"{fname}#{scene}"
        if key not in seen:
            print(f"      - {key}")
            seen.add(key)

print("\n===== B. 人工疑点验证 =====")
CHECKS = {
    "神兵利器": r"神兵利器",
    "幽幽的绿光": r"幽幽的绿光",
    "眼珠浑浊": r"眼珠浑浊",
    "苍蝇": r"苍蝇",
    "牛皮纸": r"牛皮纸",
    "猎猎作响": r"猎猎作响",
    "低空盘旋": r"低空盘旋",
    "戛然而止": r"戛然而止",
    "离心机": r"离心机",
    "长桌整齐排列": r"长桌整齐排列|桌整齐排列",
    "水泄不通": r"水泄不通",
    "火辣辣": r"火辣辣",
    "电梯厅一片死寂": r"一片死寂",
    "沦陷的城市": r"沦陷的城市",
    "甜腻": r"甜腻",
    "应急灯": r"应急灯",
    "血糖/葡萄糖": r"葡萄糖",
    "玻璃幕墙": r"玻璃幕墙",
    "拖拽": r"拖拽",
    "尸潮": r"尸潮",
    "划过你的": r"划过你(?:的)?",
    "扑了个空": r"扑了个空",
    "纹丝不动2": r"纹丝不动",
    "戛然": r"戛然",
    "指望": r"指望",
    "whatever_空空荡荡": r"空空(?:荡荡)?|空荡荡",
}
for label, pat in CHECKS.items():
    hits = []
    for fname, scene, s in texts:
        for m in re.finditer(pat, s):
            a, b = max(0, m.start() - 14), min(len(s), m.end() + 14)
            hits.append(f"{fname}#{scene}: …{s[a:b]}…")
    if hits:
        print(f"\n--- {label} ({len(hits)}) ---")
        for h in hits[:18]:
            print("  " + h)
