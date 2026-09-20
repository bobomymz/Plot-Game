# -*- coding: utf-8 -*-
"""
体力系统静态收支审计
扫描 story/ 全部 js（含 engine.js）中所有 strength 变动点，按来源分类，
生成收支台账报告 tools/体力收支审计报告.md。
只读不改；可反复重跑（行号以当次扫描为准）。

用法：
    python tools/stamina_audit.py
"""
import re, os, glob
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORY = os.path.join(ROOT, "story")
OUT = os.path.join(ROOT, "tools", "体力收支审计报告.md")

# ---------------- 1. 扫描变动点 ----------------
# 直接赋值：v.strength = ... / vars.strength -= ... / gameState.strength += ...
RE_ASSIGN = re.compile(r"\b(?:vars|v|gameState|player)\.strength\s*(\+=|-=|\*=|/=|=)(?!=)\s*([^;\n]+)")
# 自增自减
RE_INCDEC = re.compile(r"\b(?:vars|v|gameState|player)\.strength\s*(\+\+|--)")
# 对象式效果：{ strength: -1 } / { set: { strength: 10 } }
RE_OBJECT = re.compile(r"\bstrength\s*:\s*(-?\d+(?:\.\d+)?)\s*[},]")

FOOD_WORDS = ["吃", "喝", "饼干", "罐头", "泡面", "冻肉", "维C", "维生素", "葡萄糖", "脉动",
              "桃酥", "干粮", "火腿", "炒米", "拉面", "火锅", "饭", "粮", "水", "面包", "蛋糕"]
ONCE_WORDS = ["Taken", "Given", "Snack", "_tried", "一次性", "已拿", "已吃", "已喝", "占背包"]

def strip_comment(line):
    """去掉行尾 // 注释（本库代码行不含协议://，安全）"""
    return line.split("//", 1)[0].rstrip()

def classify(file, lineno, code, ctx, delta_dir):
    """(file, 行号, 本行代码, 上下文±5行, 方向+1/-1/0) -> (类别, 备注)"""
    text = code + "\n" + ctx
    low = code.lower()
    if "restRecover" in text:
        return "休息（通用·REST_CAP上限）", "utils.js restRecover 全图休息节点共用"
    if "combatDrain" in text or "combatCost" in text or "_lastCombatDrain" in text:
        return "战斗·近战胜利", "combatDrain：空手/弱武器-2，中/强武器-1"
    if "sprint" in low or "冲刺" in text:
        return "逃跑·冲刺", "sprintAway 工厂：-2 甩追兵"
    if "hideOnLocation" in text or "_hideFail" in text or "躲藏" in text:
        return "躲藏", "hideOnLocation：被追时躲藏失败-1"
    if "applyWeatherDrain" in text or "rainExposure" in text or "windy" in low or "烈日" in text or "户外奔波" in text:
        return "天气·户外", "applyWeatherDrain：晴-0.5/阴-0.2/有风再-0.1"
    if delta_dir > 0 and re.search(r"_travelMinutes\s*[:=]\s*0", text):
        return "休息·场景（清里程+恢复）", "剧情休息点：恢复并归零连续移动里程"
    if "fatigueTier" in text or "travel-fatigue" in text or "_fatiguePaid" in text:
        return "移动疲劳·规则", "travel-fatigue 五档阶梯"
    if "starvation" in text or "饥饿" in text:
        return "饥饿·规则", "间隔自动扣减：健康120min/受伤60/感冒80/叠加30"
    if "Math.max(5" in code or "过夜" in text:
        return "过夜·保底", "夜晚剧情：过夜后体力至少回到5"
    if delta_dir > 0 and any(w in text for w in FOOD_WORDS):
        return "食物·饮水", "一次性拾取或进食恢复"
    if "Math.min(10" in code or "Math.min( 10" in code:
        return "剧情·恢复", "函数式恢复（剧情效果）"
    if delta_dir < 0:
        return "剧情·损耗", "剧情事件直接扣减"
    return "剧情·其他", "未归类（人工确认）"

def parse_dir(op, expr, raw_delta):
    """返回 (+1/-1/0, 数值或None)"""
    if raw_delta is not None:  # 对象式 { strength: -1 }
        return (1 if raw_delta > 0 else -1 if raw_delta < 0 else 0), abs(raw_delta)
    expr = expr.strip()
    if op == "=":
        m = re.match(r"^(\d+(?:\.\d+)?)$", expr)
        if m:
            v = float(m.group(1))
            return (1, v) if v >= 5 else (0, v)  # =10 视为回满收入；=0 等中性
        if expr.startswith("Math.max(5"):
            return 1, None                       # 过夜保底（回到至少5）
        if "Math.max(0" in expr or "Math.max( 0" in expr:
            return -1, None                      # Math.max(0, s - x) 型支出
        if "Math.min(10" in expr or "Math.min( 10" in expr:
            return 1, None                       # Math.min(10, s + x) 型收入
        return 0, None
    m = re.search(r"([+-]?\d+(?:\.\d+)?)\s*\)?\s*$", expr.replace(" ", ""))
    val = float(m.group(1)) if m else None
    if op in ("-=", "/=") or (op == "*=" and val is not None and val < 1):
        return -1, abs(val) if val is not None else None
    if op == "+=":
        return 1, val
    return 0, val

# ---------------- 2. 遍历文件 ----------------
files = sorted(glob.glob(os.path.join(STORY, "**", "*.js"), recursive=True)) + \
        [os.path.join(ROOT, "engine.js")]

sites = []           # 每项: dict(file, rel, line, code, cat, note, dir, val, once)
for fp in files:
    with open(fp, encoding="utf-8-sig") as f:
        lines = f.read().splitlines()
    rel = os.path.relpath(fp, ROOT)
    for i, raw in enumerate(lines):
        code = strip_comment(raw)
        if not code.strip():
            continue
        hits = []
        for m in RE_ASSIGN.finditer(code):
            op, expr = m.group(1), m.group(2)
            d, v = parse_dir(op, expr, None)
            hits.append((d, v, m.group(0)))
        for m in RE_INCDEC.finditer(code):
            d = -1 if m.group(1) == "--" else 1
            hits.append((d, 1.0, m.group(0)))
        # 对象式效果只在 effect/set 语境里认（避免误抓 _display 格式化等）
        if re.search(r"(add|set)\s*:\s*\{[^}]*$", code) or re.search(r"(add|set)\s*:\s*\{", code):
            for m in RE_OBJECT.finditer(code):
                v = float(m.group(1))
                if v != 0:
                    hits.append((1 if v > 0 else -1, abs(v), m.group(0)))
        for d, v, frag in hits:
            ctx7 = "\n".join(lines[max(0, i-7):i] + lines[i+1:i+8])
            cat, note = classify(rel, i+1, code, ctx7, d)
            ctx2 = "\n".join(lines[max(0, i-2):i] + lines[i+1:i+3])
            # 一次性：守卫标记出现在紧邻上下文，只认收入方向，排除通用休息/规则/天气
            once = any(w in ctx2 or w in code for w in ONCE_WORDS)
            once = bool(once and d > 0 and "restRecover" not in code
                        and "规则" not in cat and "天气" not in cat)
            sites.append(dict(rel=rel, line=i+1, code=code.strip(), cat=cat, note=note,
                              dir=d, val=v, once=once))

# ---------------- 3. 系统常量提取 ----------------
def grab(pattern, joiner=" → "):
    out = []
    for fp in files:
        with open(fp, encoding="utf-8-sig") as f:
            txt = f.read()
        seen = set()
        for x in re.findall(pattern, txt):
            x = x.strip()
            if x and x not in seen:
                seen.add(x)
                out.append(os.path.basename(fp) + ": " + x)
    return joiner.join(out) if out else "（未找到）"

CONSTS = [
    ("休息恢复上限 REST_CAP", r"var REST_CAP\s*=\s*[\d.]+"),
    ("饥饿扣体力间隔", r"minutesBetweenReduceStrength:\s*\"[^\"]+\""),
    ("体力上限/初始", r"strength:\s*7,\s*//[^\n]*"),
    ("耗尽结局触发", r"strength\s*<=\s*0\.01[^\n]*"),
    ("连续移动疲劳档位", r"if \(min >= \d+\) return \d"),
]

# ---------------- 4. 汇总 ----------------
cat_sum = defaultdict(lambda: [0, 0.0, 0.0])   # cat -> [次数, 正向总量, 负向总量]
for s in sites:
    c = cat_sum[s["cat"]]
    c[0] += 1
    if s["dir"] > 0 or (s["dir"] == 0 and (s["val"] or 0) >= 5):
        c[1] += s["val"] or 0
    elif s["dir"] < 0:
        c[2] += s["val"] or 0

once_sites = [s for s in sites if s["once"] and s["val"]]
once_total = sum(s["val"] for s in once_sites)
regen_sites = [s for s in sites if s["cat"].startswith("休息") or "保底" in s["cat"]]

total_in = sum(c[1] for c in cat_sum.values())
total_out = sum(c[2] for c in cat_sum.values())

# ---------------- 5. 生成报告 ----------------
L = []
L.append("# 体力系统静态收支审计报告\n")
L.append("> 由 tools/stamina_audit.py 自动生成，重跑即刷新。行号对应当次扫描时的代码。\n")

L.append("## 一、系统常量（从代码提取）\n")
L.append("| 常量 | 代码出处 |")
L.append("| --- | --- |")
for name, pat in CONSTS:
    L.append("| %s | %s |" % (name, grab(pat)))
L.append("")

L.append("## 二、总览\n")
L.append("- 变动点总数：%d 处（收入方向约 %d 处 / 支出方向约 %d 处）" % (
    len(sites), sum(1 for s in sites if s["dir"] > 0), sum(1 for s in sites if s["dir"] < 0)))
L.append("- 可静态求和的收入总量：约 +%.1f 点 / 支出总量：约 -%.1f 点（仅计字面常量，函数式扣值不计入）" % (total_in, total_out))
food_bank = cat_sum.get("食物·饮水", [0, 0.0, 0.0])[1]
L.append("- 有限食物存量粗估（食物·饮水类全部收入，每处≈1份）：约 +%.1f 点 → **全游戏食物总余额即玩家\"真银行存款\"**" % food_bank)
L.append("- 带守卫标记的一次性拾取：%d 处，合计约 +%.1f 点（食物存量的守卫子集）" % (len(once_sites), once_total))
L.append("- 可再生收入：%d 处（通用休息受 REST_CAP=6 上限约束，过夜保底与清里程休息点各线分布）" % len(regen_sites))
L.append("")

L.append("## 三、按类别汇总\n")
L.append("| 类别 | 处数 | 收入Σ+ | 支出Σ- |")
L.append("| --- | --- | --- | --- |")
for cat in sorted(cat_sum, key=lambda k: -(cat_sum[k][1] + cat_sum[k][2])):
    n, i_, o_ = cat_sum[cat]
    L.append("| %s | %d | %+.1f | %.1f |" % (cat, n, i_, o_))
L.append("")

L.append("## 四、可再生 vs 一次性（压力设计的核心账本）\n")
L.append("**可再生收入**（可持续均衡态的来源）：\n")
for s in regen_sites:
    L.append("- `%s:%d` %s" % (s["rel"], s["line"], s["code"][:80]))
L.append("\n**一次性收入TOP**（吃完即无）：\n")
for s in sorted(once_sites, key=lambda x: -(x["val"] or 0))[:25]:
    L.append("- `%s:%d` **+%g** %s" % (s["rel"], s["line"], s["val"], s["code"][:70]))
L.append("")

L.append("## 五、全部变动点清单\n")
L.append("| 位置 | 方向 | 类别 | 代码 |")
L.append("| --- | --- | --- | --- |")
arrow = {1: "+", -1: "-", 0: "±"}
for s in sorted(sites, key=lambda x: (x["rel"], x["line"])):
    L.append("| `%s:%d` | %s | %s | `%s` |" % (s["rel"], s["line"], arrow[s["dir"]], s["cat"], s["code"][:75].replace("|", "\\|")))
L.append("")

L.append("## 六、推论（基于常量的手算锚点）\n")
L.append("- 健康状态饥饿钟 ≈ 12 体力/游戏日（24h ÷ 2h）；满体力裸饿约 20h 耗尽")
L.append("- 感冒 ≈ 18/日；感冒+受伤 ≈ 48/日（满体力仅 5h 耗尽）——叠加状态是压力最陡区间")
L.append("- 单段连续移动上限 -5（20/36/48/56/60min 五档）；雨天 updateTime ×1.3 会更快触档")
L.append("- REST_CAP=6 意味着可持续均衡态被锁在\"休息吊 6 点、食物冲 6→10\"：食物是硬通货")
L.append("- 天气：晴日每次户外进场景 -0.4~-0.5，探索日进出十几次 ≈ 第二条饥饿钟，值得用遥测验证实际占比")
L.append("")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(L))

print("扫描完成：%d 个变动点 → %s" % (len(sites), OUT))
print("收入Σ+%.1f  支出Σ-%.1f  一次性收入Σ+%.1f（%d处）" % (total_in, total_out, once_total, len(once_sites)))
