# -*- coding: utf-8 -*-
"""
体力遥测聚合报告
读取引擎遥测导出的 JSONL（控制台执行 __dumpStaminaLog() 获得），
生成体力压力分析报告：分来源收支、每游戏日净收支、虚弱时长占比、
REST_CAP 触挡率、天气/状态相关性、死亡与回溯点。

用法：
    python tools/stamina_report.py stamina_log_xxx.jsonl [-o tools/体力遥测报告.md]
    python tools/stamina_report.py --selftest        # 用合成数据自测统计逻辑
"""
import re, os, sys, json, argparse
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 来源归因：已知代码位（file后缀, 行号下限, 行号上限, 标签） ----------------
# 引擎/辅助函数改版后行号漂移，按区间匹配；区间外的落回原始 file:line。
# ⚠ 维护提醒：story/core.js 的区间会随「在 _variables 里增删变量」整体平移。
#   2026-09-20 在 core.js:61 插入 8 行变量声明，下方 core.js 区间已整体校正（+8 后再按实际内容对齐）。
#   2026-09-21 在 core.js:96 附近插入 5 行背包变量（_bagTier/_bagExtra/hasBackpack/hasSchoolbag + bagVolume 注释），
#              下方 core.js 区间再次整体 +5 校正。
#   若日后再往 _variables 增删行，记得同步这里的 core.js 区间，或跑 tools/stamina_audit.py 对照真实行号。
KNOWN_SITES = [
    ("utils.js",  63,  70, "休息恢复(通用·REST_CAP)"),
    ("utils.js", 168, 180, "天气·户外消耗"),             # 含 178 行 vars.strength -= drain
    ("utils.js", 199, 214, "冲刺甩追兵"),
    ("utils.js", 355, 374, "战斗·近战胜利"),
    ("utils.js", 444, 456, "躲藏失败"),
    ("core.js",  358, 364, "饥饿·规则"),                # starvation 规则：id → 362 行 effect{strength:-1}
    ("core.js",  381, 390, "连续移动疲劳·规则"),         # travel-fatigue 规则：id → 388 行档位扣体力
    ("core.js", 1121, 1130, "喝水(+1)"),
    ("core.js", 1160, 1167, "吃冻肉(回满)"),             # 1163 行 vars.strength = 10
    ("core.js", 1253, 1265, "吃维C(+1)"),
    ("core.js", 1171, 1252, "整理整理·进食(+1~+4/回满)"),  # 各类口粮场景（饼干/炒米/干粮/火腿肠/泡面/罐头…）
    ("engine.js", 209, 214, "场景效果(对象式)"),
    ("engine.js", 641, 646, "饥饿规则·自动扣体力(对象式)"),
    ("夜晚剧情.js", 10, 20, "过夜保底(≥5)"),
]

def label_of(src):
    if not src or src == "?":
        return "未知来源"
    m = re.match(r"^(.*\.js):(\d+)$", src)
    if not m:
        return src
    fname, line = m.group(1), int(m.group(2))
    for suffix, lo, hi, label in KNOWN_SITES:
        if fname.endswith(suffix) and lo <= line <= hi:
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
         "> 由 tools/stamina_report.py 生成。来源标签映射见脚本内 KNOWN_SITES（按行号区间匹配，代码改动后可校正）。\n"]
    runs = res["runs"]
    all_deltas = res["deltas"]
    rb_total = sum(1 for e in entries if e.get("type") == "restBlocked")
    L.append("## 总览\n")
    L.append("- 记录 %d 条（delta %d / 会话 %d / 休息被拒 %d），共 %d 段会话" % (
        len(entries), len(all_deltas), len(runs), rb_total, len(runs)))
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
    gm = 8 * 60
    for i in range(6):                      # 健康饥饿钟：2h 一个
        gm += 120; push(gm, "engine.js:643", -1, 7 - (i + 1), weather="晴")
    gm += 45; push(gm, "utils.js:174", -0.5, 5.5, weather="晴")
    gm += 50; push(gm, "core.js:388", -2, 3.5, travel=40, weather="雨")
    gm += 30; push(gm, "utils.js:370", -2, 1.5, weather="雨", chase=2)
    gm += 90; push(gm, "story/仁济南院.js:1850", 1, 2.5, cold=True)   # 吃葡萄糖
    gm += 80; push(gm, "engine.js:643", -1, 1.5, cold=True)           # 感冒 80min 周期
    gm += 80; push(gm, "engine.js:643", -1, 0.5, cold=True)
    gm += 80; push(gm, "engine.js:643", -0.5, 0, cold=True)           # 归零 → 死亡
    E.append({"type": "session", "tag": "backtrack", "dd": 1, "hh": 22, "mm": 5, "strength": 2.5})
    push(22 * 60 + 5, "utils.js:67", 2, 4.5)                          # 休息
    for i in range(3):
        push(22 * 60 + 30 + i * 30, "utils.js:67", 1, 5.5 + i)        # 休息到 cap
    E.append({"type": "restBlocked", "dd": 1, "hh": 23, "mm": 30, "scene": "小区-家", "strength": 6, "cap": 6})
    E.append({"type": "restBlocked", "dd": 1, "hh": 23, "mm": 45, "scene": "小区-家", "strength": 6, "cap": 6})
    push(23 * 60 + 50, "story/core.js:1162", 5.5, 10)                # 吃冻肉回满
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
    need("连续移动疲劳·规则" in text, "core.js:388 归因为疲劳")
    need("REST_CAP 触挡 2 次" in text, "restBlocked 计数")
    need("虚弱(≤3)时长占比" in text, "虚弱占比输出")
    need("感冒期间支出" in text, "状态相关性输出")
    need("会话2 · backtrack" in text, "回溯会话切分")
    print("\n自测%s（合成数据 %d 条）" % ("通过" if ok else "失败", len(E)))
    return 0 if ok else 1

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jsonl", nargs="*", help="遥测 JSONL 文件（可多个）")
    ap.add_argument("-o", "--out", default=os.path.join(ROOT, "tools", "体力遥测报告.md"))
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
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
    print("提示：报告内含每来源收支/虚弱占比/死亡点；调 KNOWN_SITES 可改善来源标签。")

if __name__ == "__main__":
    main()
