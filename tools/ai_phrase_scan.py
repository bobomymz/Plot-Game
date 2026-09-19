# -*- coding: utf-8 -*-
"""
AI雷同表述扫描器
思路：以仁济南院.js / 东明社区图书馆.js / 上海市区路径.js（高AI参与度）为模板，
归纳可疑AI用语与句式，对 story/ 全部 js 的剧情文本做量化统计；
另做 n-gram 交叉分析，找出跨文件完全重复的表述片段。
只读不改。
"""
import re, os, sys, json, glob
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "story")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai_phrase_report.json")

# ---------------- 候选模式（从三个模板文件归纳） ----------------
# (显示名, 正则, 备注)
PATTERNS = [
    # === A. 高频复用词 ===
    ("纹丝不动", r"纹丝不动", "卡死/推不开的万能描写"),
    ("不再动弹/不再动了", r"不再动(?:弹|了)", "击杀确认句，战斗场景尾部标配"),
    ("安静下来", r"安静(?:了)?下来", "清场确认句"),
    ("缓缓", r"缓缓", "AI最爱的慢速副词"),
    ("微微", r"微微", "同上"),
    ("散落", r"散落", "废墟描写标配"),
    ("东倒西歪", r"东倒西歪", "四字废墟词A"),
    ("横七竖八", r"横七竖八", "四字废墟词B"),
    ("一片狼藉", r"一片狼藉", "废墟总结句"),
    ("密密麻麻", r"密密麻麻", "尸群描写"),
    ("水泄不通", r"水泄不通", "堵路描写"),
    ("屏住呼吸", r"屏住呼吸", "潜行标配"),
    ("压低", r"压低", "潜行动作"),
    ("火辣辣", r"火辣辣", "疼痛描写唯一用词"),
    ("踉跄", r"踉跄", "受击反应"),
    ("跌跌撞撞", r"跌跌撞撞", "逃跑描写"),
    ("反手", r"反手", "动作衔接"),
    ("嗡嗡", r"嗡嗡", "机械/灯管声"),
    ("猎猎作响", r"猎猎作响", "风吹衣摆专用"),
    ("戛然而止", r"戛然而止", "记录中断专用"),
    ("歪歪扭扭", r"歪歪扭扭", "字迹描写"),
    ("干涸", r"干涸", "血迹/液体描写"),
    ("低空盘旋", r"低空盘旋", "苍蝇专用"),
    ("该拿的都拿了", r"该拿的都拿了", "搜刮守卫句"),
    ("黑黢黢", r"黑黢黢", "黑暗描写"),
    ("微光", r"微光", "屏幕/灯光描写"),
    ("心里发毛", r"心里发毛", "不安描写"),
    ("低吼", r"低吼", "丧尸叫声"),
    ("嘶吼", r"嘶吼", "丧尸叫声"),
    ("车门大开", r"车门大开", "弃车描写"),
    ("大敞着", r"大敞着", "开门状态"),
    ("抽搐", r"抽搐", "倒地描写"),
    ("瘫", r"瘫(?:在|倒|软)", "尸体姿态"),
    ("仓皇", r"仓皇", "逃离描写"),
    ("扎眼", r"扎眼", "显眼描写"),
    ("死死", r"死死", "抓握/卡住描写"),
    ("狠狠", r"狠狠", "打击描写"),
    ("干脆利落", r"干脆利落", "处决描写"),
    # === B. 句式模板 ===
    ("像是（比喻引子）", r"像是", "AI比喻句标配开头"),
    ("像…一样", r"像[^。，；\n]{1,14}一样", "明喻句式"),
    ("仿佛", r"仿佛", "比喻替代词"),
    ("安静得有些…", r"安静得有些", "『安静得有些不真实/空旷』模板"),
    ("(安)静得反常", r"(?:安静|静)得反常", "『安静得反常』模板"),
    ("不正常", r"不正常", "异常感描写"),
    ("你甚至没能…", r"你甚至没能", "死亡结局遗憾句式"),
    ("曾经…如今…", r"曾经[^。\n]{0,30}如今", "今昔对比句"),
    ("总比…强", r"总比[^。\n]{0,10}强", "自我安慰句式"),
    ("空气中弥漫", r"空气(?:中)?弥漫", "气味描写开头"),
    ("一股…的气息/气味/味道", r"一股[^。\n]{0,18}(?:气息|气味|味道)", "气味描写"),
    ("泛着…光", r"泛着[^。\n]{0,12}光", "光泽描写"),
    ("走得急", r"走得?(?:太|很|这么)急", "『人走得急』模板"),
    ("四面八方", r"四面八方", "围攻描写"),
    ("震耳欲聋", r"震耳欲聋", "音量夸张"),
    ("吞没", r"吞没", "尸潮结局专用"),
    ("撕碎", r"撕碎", "死亡描写"),
    ("劈头盖脸", r"劈头盖脸", "砸落描写"),
    ("有X、有Y（、有Z）", r"有[^，。]{1,6}、有[^，。]{1,6}(?:、有[^，。]{1,6})?", "三连排比"),
    ("没能…也没能…", r"没能[^。\n]{1,20}也没能", "对称遗憾句"),
    ("至少", r"至少", "退一步句式"),
    ("幸运的是", r"幸运的是", "旁白过渡词"),
    ("然而", r"然而", "书面转折词"),
    ("在这座…的城市", r"在这座[^。\n]{0,8}的(?:城市|城里)", "宏大收尾"),
    ("庇护所", r"庇护所", "安全屋升华词"),
    ("陷入一片黑暗", r"陷入(?:了)?一片黑暗", "死亡描写"),
    ("牢笼", r"牢笼", "困境比喻"),
    ("它没有动", r"它没有动", "短句悬念"),
    ("真讽刺", r"真讽刺", "短句感叹"),
    ("无声地", r"无声地", "副词"),
    ("低低地", r"低低地", "副词"),
    ("静静地", r"静静地", "副词"),
    ("慢慢地", r"慢慢地", "副词"),
    ("紧紧地", r"紧紧地", "副词"),
    ("轻轻", r"轻轻", "副词"),
    ("几乎", r"几乎", "程度副词"),
    ("显然", r"显然", "推断词"),
    ("似乎", r"似乎", "模糊推断"),
    ("隐约", r"隐约", "模糊视觉"),
    ("打量", r"打量", "观察动作"),
    ("环顾四周", r"环顾四周", "观察动作"),
    ("扑面而来", r"扑面而来", "气味/热浪描写"),
    ("的痕迹", r"的痕迹", "痕迹描写"),
    ("拖拽", r"拖拽", "暴力痕迹"),
    ("曾经", r"曾经", "今昔词"),
    ("如今", r"如今", "今昔词"),
    ("早已", r"早已", "时间副词"),
    ("依然|仍旧|仍然", r"依然|仍旧|仍然", "持续副词"),
    ("显得", r"显得", "评价句式"),
    ("格外", r"格外", "程度副词"),
    ("反常", r"反常", "异常词"),
    ("诡异", r"诡异", "异常词"),
    ("死寂", r"死寂", "安静词A"),
    ("沉寂", r"沉寂", "安静词B"),
    ("寂静", r"寂静", "安静词C"),
    ("安静", r"安静", "安静词D"),
    ("平静", r"平静", "安静词E"),
    ("你的世界", r"你的世界", "第二人称宏大句"),
    ("映入眼帘", r"映入眼帘", "视觉套话"),
    ("不知何时", r"不知(?:不)?觉|不知什么时候", "时间过渡"),
]

STR_RE = re.compile(r'"((?:[^"\\]|\\.)*)"', re.S)
SCENE_KEY_RE = re.compile(r'"((?:[^"\\]|\\.)*)"\s*:\s*\{')
FIELD_VALUE_RE = re.compile(
    r'(?:nextScene|elseScene|onTimeout|timeoutScene|targetScene|positionAfterOperation|image|match)\s*:\s*"((?:[^"\\]|\\.)*)"')
HAN = re.compile(r'[\u4e00-\u9fff]')


def blank_comments(text):
    """把注释替换为等长空白，保持偏移量不变"""
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
    """返回 [(sceneId, textString), ...]，已排除注释/字段值/场景key"""
    raw = open(path, encoding='utf-8').read()
    text = blank_comments(raw)
    scenes = [(m.start(), m.group(1)) for m in SCENE_KEY_RE.finditer(text)]
    excluded = []
    for m in FIELD_VALUE_RE.finditer(text):
        excluded.append((m.start(1), m.end(1)))

    def in_excluded(pos):
        return any(s <= pos < e for s, e in excluded)

    results = []
    si = 0  # 当前场景索引
    for m in STR_RE.finditer(text):
        start = m.start(1)
        while si + 1 < len(scenes) and scenes[si + 1][0] < start:
            si += 1
        # key 自身（后面紧跟冒号）跳过
        after = text[m.end():m.end() + 3].lstrip()
        if after.startswith(':'):
            continue
        if in_excluded(start):
            continue
        s = m.group(1)
        if len(s) >= 4 and HAN.search(s):
            scene = scenes[si][1] if scenes else "?"
            results.append((scene, s))
    return results, len(text)


def find_context(s, pos, width=22):
    a, b = max(0, pos - width), min(len(s), pos + width)
    return ("…" if a > 0 else "") + s[a:b] + ("…" if b < len(s) else "")


def main():
    files = sorted(glob.glob(os.path.join(ROOT, "**", "*.js"), recursive=True),
                   key=lambda p: os.path.getsize(p), reverse=True)
    # pattern 统计
    pat_stat = {name: {"total": 0, "files": defaultdict(int), "scenes": defaultdict(int),
                       "examples": []} for name, _, _ in PATTERNS}
    # ngram 按文件
    file_texts = {}   # fname -> joined text
    file_chars = {}
    ngram_files = defaultdict(lambda: defaultdict(int))  # gram -> file -> count
    all_scene_texts = []  # (fname, scene, text)

    for fp in files:
        fname = os.path.relpath(fp, ROOT)
        pairs, total_len = extract_texts(fp)
        joined = "\n".join(t for _, t in pairs)
        file_texts[fname] = joined
        file_chars[fname] = sum(len(HAN.findall(t)) for _, t in pairs)
        for scene, s in pairs:
            all_scene_texts.append((fname, scene, s))
            for name, pat, _ in PATTERNS:
                for mm in re.finditer(pat, s):
                    st = pat_stat[name]
                    st["total"] += 1
                    st["files"][fname] += 1
                    st["scenes"][f"{fname}::{scene}"] += 1
                    if len(st["examples"]) < 4:
                        st["examples"].append({"file": fname, "scene": scene,
                                               "ctx": find_context(s, mm.start())})
        # ngram 3-5
        for seg in re.findall(r'[\u4e00-\u9fff]{2,}', joined):
            for n in (3, 4, 5):
                for i in range(len(seg) - n + 1):
                    ngram_files[seg[i:i + n]][fname] += 1

    # 汇总 ngram：跨文件>=2 且总次数>=4 的4-5字片段（3字要求>=6次）
    dup = []
    for gram, fc in ngram_files.items():
        n = len(gram)
        total = sum(fc.values())
        nfiles = len(fc)
        if n >= 4 and nfiles >= 2 and total >= 4:
            dup.append((gram, n, total, nfiles, dict(fc)))
        elif n == 3 and nfiles >= 3 and total >= 8:
            dup.append((gram, n, total, nfiles, dict(fc)))
    dup.sort(key=lambda x: (x[3], x[2]), reverse=True)

    # 输出
    report = {
        "files": {f: file_chars[f] for f in file_texts},
        "patterns": {k: {"total": v["total"],
                         "files": dict(v["files"]),
                         "top_scenes": sorted(v["scenes"].items(), key=lambda x: -x[1])[:6],
                         "examples": v["examples"]} for k, v in pat_stat.items()},
        "dup_ngrams": dup[:200],
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    # 控制台摘要
    print(f"扫描文件数: {len(files)}")
    print("\n===== 模式统计（按总次数排序） =====")
    for name, _, note in sorted(PATTERNS, key=lambda p: -pat_stat[p[0]]["total"]):
        st = pat_stat[name]
        if st["total"] == 0:
            continue
        print(f"{name} | 总{st['total']} | 文件数{len(st['files'])} | {note}")
    print("\n===== 跨文件雷同 n-gram TOP60 =====")
    for gram, n, total, nfiles, fc in dup[:60]:
        fl = ",".join(f"{os.path.basename(k)}:{v}" for k, v in sorted(fc.items(), key=lambda x: -x[1])[:4])
        print(f"[{n}字×{total} {nfiles}文件] {gram}  ← {fl}")
    print(f"\n完整报告: {OUT}")


if __name__ == "__main__":
    main()
