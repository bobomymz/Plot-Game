# -*- coding: utf-8 -*-
"""
二轮精化：
1) 4-6字 n-gram 跨文件/同文件重复（实锤雷同片段）
2) 核心 AI 句式的完整例句清单
3) 各文件 AI 模式密度排行（每千汉字命中数）
"""
import re, os, json, glob
from collections import defaultdict

sys_path = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(os.path.dirname(sys_path), "story")

STR_RE = re.compile(r'"((?:[^"\\]|\\.)*)"', re.S)
SCENE_KEY_RE = re.compile(r'"((?:[^"\\]|\\.)*)"\s*:\s*\{')
FIELD_VALUE_RE = re.compile(
    r'(?:nextScene|elseScene|onTimeout|timeoutScene|targetScene|positionAfterOperation|image|match)\s*:\s*"((?:[^"\\]|\\.)*)"')
HAN = re.compile(r'[\u4e00-\u9fff]')

# 核心句式（要有完整例句的）
CORE_PATTERNS = {
    "安静得有些…": r"安静得有些[^。\n]{0,10}",
    "(安)静得反常": r"(?:安静|静)得反常",
    "你甚至没能…": r"你甚至没能[^。\n]{0,18}",
    "曾经…如今…": r"曾经[^。\n]{0,30}如今[^。\n]{0,15}",
    "总比…强": r"总比[^。\n]{0,12}强",
    "像…一样": r"像[^。，；\n]{1,14}一样",
    "一股…气息/气味": r"一股[^。\n]{0,18}(?:气息|气味|味道)",
    "泛着…光": r"泛着[^。\n]{0,12}光",
    "没能…也没能…": r"没能[^。\n]{1,20}也没能[^。\n]{0,12}",
    "有X、有Y、有Z": r"有[^，。]{1,8}、有[^，。]{1,8}(?:、有[^，。]{1,8})?",
    "在这座…的城市": r"在这座[^。\n]{0,10}",
    "寂静/死寂/沉寂系": r"死寂|沉寂|寂静",
    "三连列举A、B、C": r"[\u4e00-\u9fff]{2,6}、[\u4e00-\u9fff]{2,6}、[\u4e00-\u9fff]{2,6}",
    "人走得急": r"人?走得?(?:太|很|这么)急[^。\n]{0,12}",
    "像是…": r"像是[^。\n]{0,20}",
}

# n-gram 黑名单（正常汉语搭配，非AI指纹）
NGRAM_BLACKLIST = set("""
的脚步声了一会儿什么东西的脚步一只丧尸注意到你走进你来到你看到你打开
的时候越来起来了你的还有一在地上倒在地了出来了过来了过去了一个
在这里着一个是是什么了一个了过去没来得及看了一了起来放着一
有一个一个人最后一是当然然而是的不是就是说就是说啊
自己的丧尸的门口的房间前面的后面的大厅的走廊的声音的方向
地上墙上楼上下面的里面外面旁边周围附近中间
""".split())


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


def main():
    files = sorted(glob.glob(os.path.join(ROOT, "**", "*.js"), recursive=True))
    file_texts, file_han_chars = {}, {}
    scene_pairs = {}
    for fp in files:
        fname = os.path.basename(fp)
        pairs = extract_texts(fp)
        scene_pairs[fname] = pairs
        joined = "\n".join(t for _, t in pairs)
        file_texts[fname] = joined
        file_han_chars[fname] = len(HAN.findall(joined))

    # ---- 1) 模式密度排行 ----
    # 用一轮的完整模式表（精简重建）
    PATS = {
        "安静": r"安静", "像是": r"像是", "散落": r"散落", "似乎": r"似乎", "缓缓": r"缓缓",
        "轻轻": r"轻轻", "几乎": r"几乎", "隐约": r"隐约", "嘶吼": r"嘶吼", "像…一样": r"像[^。，；\n]{1,14}一样",
        "嗡嗡": r"嗡嗡", "压低": r"压低", "狠狠": r"狠狠", "死死": r"死死", "东倒西歪": r"东倒西歪",
        "至少": r"至少", "踉跄": r"踉跄", "反手": r"反手", "纹丝不动": r"纹丝不动", "安静下来": r"安静(?:了)?下来",
        "微微": r"微微", "低吼": r"低吼", "屏住呼吸": r"屏住呼吸", "格外": r"格外", "泛着…光": r"泛着[^。\n]{0,12}光",
        "不再动弹": r"不再动(?:弹|了)", "干涸": r"干涸", "微光": r"微光", "歪歪扭扭": r"歪歪扭扭",
        "一股…气味": r"一股[^。\n]{0,18}(?:气息|气味|味道)", "曾经": r"曾经", "瘫": r"瘫(?:在|倒|软)",
        "四面八方": r"四面八方", "打量": r"打量", "如今": r"如今", "横七竖八": r"横七竖八", "火辣辣": r"火辣辣",
        "早已": r"早已", "死寂": r"死寂", "密密麻麻": r"密密麻麻", "抽搐": r"抽搐", "仿佛": r"仿佛",
        "吞没": r"吞没", "一片狼藉": r"一片狼藉", "显然": r"显然", "该拿的都拿了": r"该拿的都拿了",
    }
    density = []
    pat_hits = defaultdict(lambda: defaultdict(int))
    for fname in file_texts:
        t = file_texts[fname]
        han = file_han_chars[fname]
        if han == 0:
            continue
        hits = 0
        for name, pat in PATS.items():
            c = len(re.findall(pat, t))
            hits += c
            if c:
                pat_hits[fname][name] = c
        density.append((fname, han, hits, round(hits / han * 1000, 1)))
    density.sort(key=lambda x: -x[3])

    # ---- 2) 4-6字 n-gram 跨文件 ----
    ngram_files = defaultdict(lambda: defaultdict(int))
    ngram_ctx = defaultdict(list)
    for fname, pairs in scene_pairs.items():
        for scene, s in pairs:
            for seg in re.findall(r'[\u4e00-\u9fff]{2,}', s):
                for n in (4, 5, 6):
                    for i in range(len(seg) - n + 1):
                        g = seg[i:i + n]
                        ngram_files[g][fname] += 1
                        if len(ngram_ctx[g]) < 2:
                            ngram_ctx[g].append(f"{fname}#{scene}")
    dup = []
    for g, fc in ngram_files.items():
        if g in NGRAM_BLACKLIST:
            continue
        # 排除含黑名单子串的
        if any(b in g for b in ("的脚步", "了一声", "的时候", "的样子", "上楼", "下楼", "离开", "继续", "整理一下", "系统提示", "当前体力")):
            continue
        total = sum(fc.values())
        nfiles = len(fc)
        if nfiles >= 2 and total >= 3:
            dup.append((g, total, nfiles, dict(fc)))
    dup.sort(key=lambda x: (x[2], x[1]), reverse=True)

    # ---- 3) 核心句式完整例句 ----
    core_examples = {}
    for name, pat in CORE_PATTERNS.items():
        exs = []
        for fname, pairs in scene_pairs.items():
            for scene, s in pairs:
                for m in re.finditer(pat, s):
                    exs.append(f"{fname}#{scene}: …{s[max(0,m.start()-12):m.end()+10]}…")
        core_examples[name] = exs

    # 输出
    print("===== 文件AI模式密度排行（每千汉字命中数） =====")
    for fname, han, hits, d in density:
        print(f"{d:>6} /千字  {fname}  (汉字{han}, 命中{hits})")

    print("\n===== 4-6字跨文件重复片段（实锤雷同，TOP80） =====")
    for g, total, nfiles, fc in dup[:80]:
        fl = ",".join(f"{os.path.basename(k)}:{v}" for k, v in sorted(fc.items(), key=lambda x: -x[1])[:5])
        print(f"[×{total} {nfiles}文件] {g}  ← {fl}")

    print("\n===== 核心句式完整例句 =====")
    for name, exs in core_examples.items():
        print(f"\n--- {name} ({len(exs)}例) ---")
        for e in exs[:14]:
            print("  " + e)

    with open(os.path.join(sys_path, "ai_phrase_round2.json"), "w", encoding="utf-8") as f:
        json.dump({"density": density, "dup": dup[:300], "core_examples": core_examples},
                  f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    import sys
    main()
