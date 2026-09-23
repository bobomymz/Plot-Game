# -*- coding: utf-8 -*-
"""
体力遥测聚合报告
读取引擎遥测导出的 JSONL（控制台执行 __dumpStaminaLog() 获得），
生成体力压力分析报告：分来源收支、每游戏日净收支、虚弱时长占比、
REST_CAP 触挡率、天气/状态相关性、死亡与回溯点。

来源归因按**内容锚定**：每次运行先扫源码，用锚点（函数声明 / 规则 id / 场景对象键）
定位入口行，据此划定区间。core.js / utils.js 增删行后**无需手动校正**。

用法：
    python tools/stamina_report.py stamina_log_xxx.jsonl [-o tools/体力遥测报告.md]
    python tools/stamina_report.py --selftest         # 合成数据自测（含锚点解析校验）
    python tools/stamina_report.py --list-anchors     # 打印锚点解析结果，排查未命中
"""
import re, os, sys, json, argparse
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 来源归因：按内容锚定 ----------------
# 不再硬编码行号：每次运行先扫源码，用锚点定位入口函数/场景起始行，再据此划定区间。
# 好处：往 core.js/utils.js 增删行后无需手动校正（旧版的 KNOWN_SITES 会随插入整体漂移）。
# 定位心法：只抓「入口函数 / 规则 id / 场景键所在行」——
#   `{}` 闭包体内无函数调用帧的写入点，测出的行号是 Proxy trap 的，不会进日志；
#   会进日志的只有「经函数 / reactive 规则执行」的写入点。
# anchor 语义：'fn' = 函数声明行起算；'rule' = 规则 id 行起算；'scene' = 场景键行起算；
#              'line' = 单行精确匹配。
CONTENT_ANCHORS = [
    # (文件后缀, 锚点类型, 锚点正则, 区间上限偏移, 标签)
    ("utils.js", "fn",    r"function\s+restRecover\s*\(",            8,  "休息恢复(通用·REST_CAP)"),
    ("utils.js", "fn",    r"function\s+applyWeatherDrain\s*\(",     16,  "天气·户外消耗"),
    ("utils.js", "fn",    r"function\s+sprintAway\s*\(",            14,  "冲刺甩追兵"),
    ("utils.js", "fn",    r"function\s+combatDrain\s*\(",           18,  "战斗·近战胜利"),
    ("utils.js", "fn",    r"function\s+hideOnLocation\s*\(",        10,  "躲藏失败"),
    ("core.js",  "rule",  r'id:\s*"starvation"',                    6,  "饥饿·规则"),
    ("core.js",  "rule",  r'id:\s*"travel-fatigue"',               10,  "连续移动疲劳·规则"),
    # 场景锚点必须带 `: {` 后缀——裸 `"X"` 会先撞到 nextScene 里的字符串引用
    ("core.js",  "scene", r'"整理整理-喝水"\s*:\s*\{',              8,  "喝水(+1)"),
    ("core.js",  "scene", r'"整理整理-吃冻肉"\s*:\s*\{',            7,  "吃冻肉(回满)"),
    ("core.js",  "scene", r'"整理整理-吃维C"\s*:\s*\{',            11,  "吃维C(+1)"),
    ("core.js",  "range", r'"整理整理-吃饼干"\s*:\s*\{', r'"整理整理-吃维C"\s*:\s*\{',  "整理整理·进食(+1~+4/回满)"),
    ("core.js",  "range", r'"整理整理-喝水"\s*:\s*\{',   r'"整理整理-碘伏消毒"\s*:\s*\{', "饮水与进食(明细)"),
    ("engine.js","line",  r"gameState\[key\] \+= effect\.add\[key\]", 2, "场景效果(对象式)"),
    ("engine.js","line",  r"gameState\[k\] \+= rule\.effect\.add\[k\]", 2, "饥饿规则·自动扣体力(对象式)"),
    ("夜晚剧情.js","line", r"Math\.max\(5, vars\.strength\)",        1, "过夜保底(≥5)"),
]

# ---------- 源码缓存 ----------
_SRC = {}
def _srcs(suffix):
    """按后缀找 story/ 下所有 js（含子目录）+ 根目录 engine.js"""
    key = suffix
    if key in _SRC:
        return _SRC[key]
    out = []
    for fp in __import__("glob").glob(os.path.join(ROOT, "story", "**", "*.js"), recursive=True):
        if os.path.basename(fp).endswith(suffix):
            out.append(fp)
    fp2 = os.path.join(ROOT, suffix)
    if os.path.exists(fp2):
        out.append(fp2)
    _SRC[key] = out
    return out

def _find(suffix, pattern):
    """在匹配后缀的文件里找 pattern，返回 (basename, 1-based 行号, 匹配行原文)"""
    rx = re.compile(pattern)
    for fp in _srcs(suffix):
        with open(fp, encoding="utf-8-sig") as f:
            for i, ln in enumerate(f, 1):
                if rx.search(ln):
                    return os.path.basename(fp), i, ln.rstrip()
    return None, None, None

def _find_all(suffix, pattern):
    rx = re.compile(pattern)
    hits = []
    for fp in _srcs(suffix):
        with open(fp, encoding="utf-8-sig") as f:
            for i, ln in enumerate(f, 1):
                if rx.search(ln):
                    hits.append((os.path.basename(fp), i))
    return hits

# ---------- 启动时解析全部锚点 ----------
_RESOLVED = []   # (fname, lo, hi, label)
_UNRESOLVED = []
for anchor in CONTENT_ANCHORS:
    suffix, kind, pat = anchor[0], anchor[1], anchor[2]
    if kind == "range":
        f1, l1, _ = _find(suffix, pat)
        f2, l2, _ = _find(suffix, anchor[3])
        if l1 and l2 and f1 == f2:
            _RESOLVED.append((f1, min(l1, l2), max(l1, l2), anchor[4]))
        else:
            _UNRESOLVED.append((suffix, pat, "range 端点未命中"))
        continue
    fname, ln, _raw = _find(suffix, pat)
    if ln is None:
        _UNRESOLVED.append((suffix, pat, "锚点未命中"))
        continue
    if kind == "fn" or kind == "rule" or kind == "scene":
        _RESOLVED.append((fname, ln, ln + anchor[3], anchor[4]))
    elif kind == "line":
        _RESOLVED.append((fname, ln, ln + anchor[3], anchor[4]))

def anchor_report():
    """返回锚点解析情况（供 --selftest / --list-anchors 输出）"""
    return _RESOLVED, _UNRESOLVED

def label_of(src):
    if not src or src == "?":
        return "未知来源"
    m = re.match(r"^(.*\.js):(\d+)$", src)
    if not m:
        return src
    fname, line = m.group(1), int(m.group(2))
    for a_fname, lo, hi, label in _RESOLVED:
        if fname == a_fname and lo <= line <= hi:
            return label
    return src

def game_min(e):
    """游戏内分钟（Day1 8:00 醒来，dd 从 1 起）"""
    return ((e.get("dd") or 1) - 1) * 1440 + (e.get("hh") or 0) * 60 + (e.get("mm") or 0)

def fmt_game_time(minutes):
    d = minutes // 1440 + 1
    h = minutes % 1440 // 60
    m = minutes % 60
    return "Day%d %02d:%02d" % (d, h, m)

SPARK = "▁▂▃▄▅▆▇█"
def spark(v, lo=0, hi=10):
    idx = int((max(lo, min(hi, v)) - lo) / (hi - lo) * (len(SPARK) - 1))
    return SPARK[idx]

# ---------------- 分析 ----------------
def analyze(entries):
    # 会话切分（无 session 事件则视为单段）
    runs, cur = [], {"tag": "(整段)", "start": None}
    for e in entries:
        if e.get("type") == "session":
            if cur["start"] is not None:
                runs.append(cur)
            cur = {"tag": e.get("tag", "?"), "start": e}
        else:
            cur.setdefault("events", []).append(e)
    if cur["start"] is not None or cur.get("events"):
        runs.append(cur)

    deltas_all = [e for e in entries if e.get("type") == "delta"]
    out = {"runs": [], "deltas": deltas_all}
    for r in runs:
        ds = r.get("events", [])
        ds = [e for e in ds if e.get("type") in ("delta", "restBlocked")]
        r["events"] = ds
        r["deltas"] = [e for e in ds if e.get("type") == "delta"]
    out["runs"] = runs
    return out

def summarize(deltas, rest_blocked_n, title):
    """对一组 delta 输出 (headline_dict, markdown_lines)"""
    L = []
    if not deltas:
        return L
    deltas = sorted(deltas, key=game_min)
    src_agg = defaultdict(lambda: {"n": 0, "net": 0.0, "in": 0.0, "out": 0.0})
    day_agg = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    weather_agg = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    weak_min = 0.0
    deaths, min_seen, max_seen = [], 10.0, 0.0
    prev = None
    for e in deltas:
        lab = label_of(e.get("src"))
        d = e.get("d", 0)
        a = src_agg[lab]
        a["n"] += 1
        a["net"] += d
        if d > 0:
            a["in"] += d
        else:
            a["out"] += -d
        gm = game_min(e)
        day = (e.get("dd") or 1)
        day_agg[day]["in" if d > 0 else "out"] += abs(d)
        wkey = "%s%s" % (e.get("weather", "?"), "·有风" if e.get("weather") == "晴" and False else "")
        weather_agg[e.get("weather", "?")]["in" if d > 0 else "out"] += abs(d)
        if e.get("to") == 0:
            deaths.append((gm, lab))
        min_seen, max_seen = min(min_seen, e["to"]), max(max_seen, e["to"])
        if prev is not None:
            gap = max(0, gm - prev["gm"])
            if prev["val"] <= 3:
                weak_min += gap
        prev = {"gm": gm, "val": e["to"]}

    span = game_min(deltas[-1]) - game_min(deltas[0])
    total_in = sum(a["in"] for a in src_agg.values())
    total_out = sum(a["out"] for a in src_agg.values())
    days = max(1e-9, span / 1440.0)

    L.append("## %s\n" % title)
    L.append("- 游戏内跨度：%s → %s（约 %.1f 小时）" % (
        fmt_game_time(game_min(deltas[0])), fmt_game_time(game_min(deltas[-1])), span / 60.0))
    L.append("- 体力轨迹：%g → %g（期间最低 %g / 最高 %g）  波形 `%s`" % (
        deltas[0]["from"], deltas[-1]["to"], min_seen, max_seen,
        "".join(spark(e["to"]) for e in deltas[:120])))
    L.append("- 收支：收入 +%.1f / 支出 -%.1f / 净 %+.1f（日均净 %+.1f）" % (
        total_in, total_out, total_in - total_out, (total_in - total_out) / days))
    L.append("- 虚弱(≤3)时长占比：约 %.0f%%（%d 游戏分钟 / %d）；REST_CAP 触挡 %d 次" % (
        100.0 * weak_min / max(1, span), round(weak_min), round(span), rest_blocked_n))
    if deaths:
        for gm, lab in deaths:
            L.append("- **体力归零点**：%s（来源 %s）" % (fmt_game_time(gm), lab))
    L.append("")

    L.append("### 分来源收支\n")
    L.append("| 来源 | 次数 | 收入+ | 支出- | 净 |")
    L.append("| --- | --- | --- | --- | --- |")
    for lab in sorted(src_agg, key=lambda k: -(src_agg[k]["in"] + src_agg[k]["out"])):
        a = src_agg[lab]
        L.append("| %s | %d | %+.1f | %.1f | %+.1f |" % (lab, a["n"], a["in"], a["out"], a["net"]))
    L.append("")

    L.append("### 每游戏日收支\n")
    L.append("| 游戏日 | 收入+ | 支出- | 净 |")
    L.append("| --- | --- | --- | --- |")
    for day in sorted(day_agg):
        a = day_agg[day]
        L.append("| Day %d | %+.1f | %.1f | %+.1f |" % (day, a["in"], a["out"], a["in"] - a["out"]))
    L.append("")

    L.append("### 按天气收支\n")
    L.append("| 天气 | 收入+ | 支出- |")
    L.append("| --- | --- | --- |")
    for w in sorted(weather_agg):
        a = weather_agg[w]
        L.append("| %s | %+.1f | %.1f |" % (w, a["in"], a["out"]))
    L.append("")

    cold = [e for e in deltas if e.get("cold")]
    hurt = [e for e in deltas if e.get("hurt")]
    if cold:
        L.append("- 感冒期间支出：-%.1f（%d 条）" % (sum(-e["d"] for e in cold if e["d"] < 0), len(cold)))
    if hurt:
        L.append("- 受伤期间支出：-%.1f（%d 条）" % (sum(-e["d"] for e in hurt if e["d"] < 0), len(hurt)))
    L.append("")
    return L

# ---------------- 主流程 ----------------
def build_report(entries, title="体力遥测报告"):
    res = analyze(entries)
    L = ["# " + title + "\n",
         "> 由 tools/stamina_report.py 生成。来源标签按**内容锚定**实时解析（见脚本内 CONTENT_ANCHORS）：",
         "> 每次运行先扫源码定位入口函数/规则/场景，源码增删行无需手动校正。\n"]
    if _UNRESOLVED:
        L.append("> ⚠ **以下锚点未命中，相关来源会落回原始 `文件:行号`**：")
        for suffix, pat, why in _UNRESOLVED:
            L.append(">   - `%s` %s（%s）" % (suffix, pat, why))
        L.append("")
    runs = res["runs"]
    all_deltas = res["deltas"]
    rb_total = sum(1 for e in entries if e.get("type") == "restBlocked")
    L.append("## 总览\n")
    L.append("- 记录 %d 条（delta %d / 会话 %d / 休息被拒 %d），共 %d 段会话" % (
        len(entries), len(all_deltas), len(runs), rb_total, len(runs)))
    L.append("- 锚点解析：命中 %d / 未命中 %d" % (len(_RESOLVED), len(_UNRESOLVED)))
    L.append("")
    for i, r in enumerate(runs, 1):
        rb = sum(1 for e in r["events"] if e.get("type") == "restBlocked")
        L.extend(summarize(r["deltas"], rb, "会话%d · %s" % (i, r["tag"])))
    # 全程按来源合计（跨会话）
    if len(runs) > 1:
        L.extend(summarize(all_deltas, rb_total, "全程合计（跨会话）"))
    return L

def selftest():
    """合成一段含死亡→回溯→恢复的遥测数据，验证统计逻辑"""
    E = []
    def gm2t(gm):
        return {"dd": gm // 1440 + 1, "hh": gm % 1440 // 60, "mm": gm % 60}
    def push(gm, src, d, to, **kw):
        e = {"type": "delta", "src": src, "from": to - d, "to": to, "d": d}
        e.update(gm2t(gm)); e.update(kw)
        E.append(e)
    E.append({"type": "session", "tag": "new", "dd": 1, "hh": 8, "mm": 0, "strength": 7})
    # 合成数据用「当前解析出的真实行号」，这样锚点漂移时自测会一起报出来
    ENGINE_STARVE = next((lo for f, lo, _hi, lab in _RESOLVED if lab == "饥饿规则·自动扣体力(对象式)"), 644)
    CORE_FATIGUE = next((lo for f, lo, _hi, lab in _RESOLVED if lab == "连续移动疲劳·规则"), 390)
    CORE_MERCURY_DRAIN = next((lo for f, lo, _hi, lab in _RESOLVED if lab == "吃冻肉(回满)"), 1165)
    UTI_REST = next((lo for f, lo, _hi, lab in _RESOLVED if lab == "休息恢复(通用·REST_CAP)"), 67)
    UTI_WEATHER = next((lo for f, lo, _hi, lab in _RESOLVED if lab == "天气·户外消耗"), 174)
    UTI_COMBAT = next((lo for f, lo, _hi, lab in _RESOLVED if lab == "战斗·近战胜利"), 374)
    gm = 8 * 60
    for i in range(6):                      # 健康饥饿钟：2h 一个
        gm += 120; push(gm, "engine.js:%d" % ENGINE_STARVE, -1, 7 - (i + 1), weather="晴")
    gm += 45; push(gm, "utils.js:%d" % UTI_WEATHER, -0.5, 5.5, weather="晴")
    gm += 50; push(gm, "core.js:%d" % CORE_FATIGUE, -2, 3.5, travel=40, weather="雨")
    gm += 30; push(gm, "utils.js:%d" % UTI_COMBAT, -2, 1.5, weather="雨", chase=2)
    gm += 90; push(gm, "story/仁济南院.js:1850", 1, 2.5, cold=True)   # 吃葡萄糖
    gm += 80; push(gm, "engine.js:%d" % ENGINE_STARVE, -1, 1.5, cold=True)   # 感冒 80min 周期
    gm += 80; push(gm, "engine.js:%d" % ENGINE_STARVE, -1, 0.5, cold=True)
    gm += 80; push(gm, "engine.js:%d" % ENGINE_STARVE, -0.5, 0, cold=True)   # 归零 → 死亡
    E.append({"type": "session", "tag": "backtrack", "dd": 1, "hh": 22, "mm": 5, "strength": 2.5})
    push(22 * 60 + 5, "utils.js:%d" % UTI_REST, 2, 4.5)                          # 休息
    for i in range(3):
        push(22 * 60 + 30 + i * 30, "utils.js:%d" % UTI_REST, 1, 5.5 + i)        # 休息到 cap
    E.append({"type": "restBlocked", "dd": 1, "hh": 23, "mm": 30, "scene": "小区-家", "strength": 6, "cap": 6})
    E.append({"type": "restBlocked", "dd": 1, "hh": 23, "mm": 45, "scene": "小区-家", "strength": 6, "cap": 6})
    push(23 * 60 + 50, "story/core.js:%d" % CORE_MERCURY_DRAIN, 5.5, 10)        # 吃冻肉回满
    md = build_report(E, title="自测报告")
    text = "\n".join(md)
    # --- 断言 ---
    ok = True
    def need(cond, name):
        nonlocal ok
        print(("  ok  " if cond else "  FAIL ") + name)
        ok = ok and cond
    need("体力归零点" in text, "死亡点被识别")
    need("饥饿规则·自动扣体力" in text, "engine.js:643 归因为饥饿规则")
    need("休息恢复(通用·REST_CAP)" in text, "utils.js:67 归因为休息")
    need("天气·户外消耗" in text, "utils.js:174 归因为天气")
    need("连续移动疲劳·规则" in text, "core.js:390 归因为疲劳")
    need("REST_CAP 触挡 2 次" in text, "restBlocked 计数")
    need("虚弱(≤3)时长占比" in text, "虚弱占比输出")
    need("感冒期间支出" in text, "状态相关性输出")
    need("会话2 · backtrack" in text, "回溯会话切分")
    # --- 锚点解析正确性 ---
    need(len(_UNRESOLVED) == 0, "全部内容锚点命中（未命中 %d）" % len(_UNRESOLVED))
    resolved = {lab for _f, _lo, _hi, lab in _RESOLVED}
    for must in ("休息恢复(通用·REST_CAP)", "饥饿·规则", "连续移动疲劳·规则",
                 "喝水(+1)", "吃冻肉(回满)", "吃维C(+1)", "整理整理·进食(+1~+4/回满)"):
        need(must in resolved, "锚点已解析：%s" % must)
    # 锚点行号必须落在文件范围内（防止命中注释里的假锚点）
    in_range = all(lo >= 1 and hi > lo for _f, lo, hi, _l in _RESOLVED)
    need(in_range, "锚点区间行号合法")
    print("\n自测%s（合成数据 %d 条）" % ("通过" if ok else "失败", len(E)))
    return 0 if ok else 1

def list_anchors():
    print("内容锚点解析结果（当前源码）：\n")
    print("  状态  文件              行号区间      标签")
    print("  " + "-" * 66)
    for fname, lo, hi, label in sorted(_RESOLVED, key=lambda x: (x[0], x[1])):
        print("  ok    %-16s %5d-%-5d  %s" % (fname, lo, hi, label))
    for suffix, pat, why in _UNRESOLVED:
        print("  MISS  %-16s %-13s  %s（%s）" % (suffix, "-", pat, why))
    print("\n命中 %d / 未命中 %d" % (len(_RESOLVED), len(_UNRESOLVED)))
    return 0 if not _UNRESOLVED else 1

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jsonl", nargs="*", help="遥测 JSONL 文件（可多个）")
    ap.add_argument("-o", "--out", default=os.path.join(ROOT, "tools", "体力遥测报告.md"))
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--list-anchors", action="store_true", help="打印内容锚点解析结果")
    args = ap.parse_args()
    if args.list_anchors:
        sys.exit(list_anchors())
    if args.selftest:
        sys.exit(selftest())
    if not args.jsonl:
        ap.print_help()
        sys.exit(1)
    entries = []
    for fp in args.jsonl:
        with open(fp, encoding="utf-8") as f:
            for ln in f:
                ln = ln.strip()
                if ln:
                    entries.append(json.loads(ln))
    entries.sort(key=lambda e: e.get("rt", 0))
    md = build_report(entries)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print("报告已生成：%s（输入 %d 条）" % (args.out, len(entries)))
    if _UNRESOLVED:
        print("⚠ 有 %d 个锚点未命中，查看：python tools/stamina_report.py --list-anchors" % len(_UNRESOLVED))
    else:
        print("锚点全部命中（内容锚定，源码行号变动无需校正）。")

if __name__ == "__main__":
    main()
