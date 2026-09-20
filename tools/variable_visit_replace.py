# -*- coding: utf-8 -*-
"""
A1 变量 → _visit 自动替换工具(配合 variable_visit_audit.py)
用法:
  python tools/variable_visit_replace.py            # 分析模式:输出替换计划(不修改文件)
  python tools/variable_visit_replace.py --apply    # 应用替换
逻辑:
  1. 复用 audit 的分类取 A1 清单(单向布尔、唯一写入场景、未被规则引擎引用)
  2. 每个写入点判定上下文: onEnter(用写入场景) / choices effect(用选项 nextScene 字面量) / 人工
  3. 删 core.js 定义行; 删写入(set 键 / assign 语句, 清理空 set); 读点替换:
     vars.x → (vars._visit['场景'] > 0)   !x → !_visit['场景']   裸x(条件字符串) → _visit['场景'] > 0
"""
import re
import sys
import json
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent))
import variable_visit_audit as audit

ROOT = audit.ROOT
STORY_DIR = audit.STORY_DIR

def esc(s):
    return (s or "").replace("|", "\\|").replace("\n", " ")

def build_a1():
    var_defs, order = audit.parse_core_vars()
    writes, cond_refs, visit_uses, total_refs = audit.scan_story_files()
    engine_writes = audit.scan_engine_writes()
    special_refs = audit.core_special_refs()
    result = audit.classify(var_defs, order, writes, cond_refs, engine_writes, special_refs, total_refs, visit_uses)
    a1 = [r for r in result if r["grade"] == "A1"]
    return var_defs, a1, (writes, cond_refs, visit_uses, total_refs)

_file_lines_cache = {}
def file_lines(rel):
    if rel not in _file_lines_cache:
        _file_lines_cache[rel] = (ROOT / rel).read_text(encoding="utf-8-sig").splitlines()
    return _file_lines_cache[rel]

CTX_UP = 40
def write_context(rel, line_no):
    """onEnter-obj = 对象式 onEnter(渲染即无条件执行,可安全用写入场景 _visit)
    onEnter-fn = 函数式 onEnter(可能有条件写入) / choices / scene-top / unknown"""
    lines = file_lines(rel)
    i = line_no - 1
    ln = lines[i]
    head = ln[:ln.find("set")] if "set" in ln else ln
    m0 = re.search(r"\bonEnter\s*:\s*(\{)?", head)
    if m0:
        return "onEnter-obj" if m0.group(1) else "onEnter-fn"
    if re.search(r"\beffect\s*:", ln):
        return "choices"
    for j in range(i - 1, max(i - CTX_UP, -1), -1):
        s = lines[j]
        m = re.search(r"\bonEnter\s*:\s*(\{)?", s)
        if m:
            return "onEnter-obj" if m.group(1) else "onEnter-fn"
        if re.search(r"\beffect\s*:", s):
            return "choices"
        if audit.SCENE_RE.match(s):
            return "scene-top"
    return "unknown"

NS_DOWN, NS_UP = 6, 10
def next_scene_literal(rel, line_no):
    """从写入行附近找 choices 元素的 nextScene 字符串字面量。函数式/找不到 → None"""
    lines = file_lines(rel)
    i = line_no - 1
    for rng in (range(i + 1, min(i + 1 + NS_DOWN, len(lines))),
                range(max(i - NS_UP, 0), i)):
        for j in rng:
            m = re.search(r'nextScene\s*:\s*"([^"\\]+)"', lines[j])
            if m:
                return m.group(1)
            if re.search(r"nextScene\s*:\s*function", lines[j]):
                return None
    return None

def main():
    apply_mode = "--apply" in sys.argv
    var_defs, a1, _ = build_a1()

    # ---------- 1. 每变量确定替换场景 ----------
    # 人工目检后确认等价的 choices/fn 写入变量(name -> 替换场景),脚本按 auto 处理
    # 依据 tools/_manual_ctx.txt 逐个核对写入点代码(2026-09-20):
    #  - onEnter-fn 类:写入无条件(set 在 if 外或函数体直接执行),首入即置位,_visit 首入即>0,等价
    #  - choices 类:nextScene 为专用结果子场景(只有该选项可达/该动作专属),_visit>0 当且仅当选过该选项
    #  - _chenmoRescued: initMemoryGame 工厂第三参 effect 在 onEnter 执行时无条件应用(utils.js:409)
    #  - _stationeryZombieDead/restAtBarber: 同场景 onEnter 多分支全部 set,场景一致
    OVERRIDE = {
        # ---- onEnter-fn 无条件写入(胜利/结果场景) ----
        "_airlockZombieDone": "张江-华大-连廊-遭遇-胜",
        "_backGateCleared": "建平-后门-内侧-清场",
        "_backhallEntered": "新达汇-1F后勤走廊西",
        "_dormCleared": "建平-宿舍-内部-清场",          # choices effect → 闪色胜利进清场
        "_fabFigADone": "张江-华大-白区-工位战A-胜",
        "_fabFigCDone": "张江-华大-白区-工位战C-胜",
        "_fabSwarmDone": "张江-华大-白区-围攻-胜",
        "_foundFriend": "张江-上科大-曹睿泽宿舍",
        "_frontGateCleared": "建平-前门-清场",          # onEnter return set
        "_gasShedZombieDead": "张江-加油站-棚子-胜利",
        "_jinbaoPhotoShown": "张江-华大-动力站-合照",
        "_labExitFought": "张江-检测中心-撤离-胜",
        "_labWeakened": "张江-检测中心-摔柜门",
        "_labZombieDead": "张江-检测中心-制服",
        "_lijuanKilled": "建平-弘渊楼-2F-李娟-解脱",
        "_metTeacher": "张江-AI岛-机房-重逢",
        "_plazaFought": "张江-华大-广场-近路-胜",
        "_sistKitchenZombieDead": "张江-上科大-食堂-后厨-胜利",
        "_wangjianguoDead": "新达汇-3F后勤走廊-王建国",
        "_yifenStudentSaved": "建平-挹芬楼-5F-高二教室-救活",
        "_yifenWestCleared": "建平-挹芬楼-1F-西侧走廊-清场",  # choices effect → 闪色胜利进清场
        "foundMomRemains": "全家门口-妈妈的遗物",
        "hasClassMates": "上实南校-撤离成功",
        "vmSmashed": "新达汇-电梯厅贩卖机-砸开",        # onEnter return set
        # ---- onEnter-fn 无条件写入(普通场景) ----
        "_guardTakeoutTaken": "建平-门卫室-外卖",       # set 在 if(dd<3) 之外
        "_jinyiAlcoholUsed": "金谊广场-5F-酒精消毒",
        "_chenmoRescued": "金谊广场-吉祥馄饨-杀出去",   # initMemoryGame effect
        # ---- onEnter-fn 同场景多分支全 set ----
        "_stationeryZombieDead": "安盛街-文具店击杀",   # 两分支都 set
        "restAtBarber": "理发店-休息",                  # 过夜/白天两分支都 set
        # ---- choices → 专用结果子场景 ----
        "_cafeteriaWifiOn": "长者食堂-打开路由器",
        "_mallGuardSnack": "新达汇-B1保安室-抽屉-吃桃酥",
        "askRoadBullInfo": "理发店-打听路况",
        # ---- choices → 两写入点 nextScene 相同(且为动作专属可达) ----
        "_freightDoorOpen": "张江-厂界便道",            # 卸油门选项专属
        # ---- 既有目检 ----
        "_leafletUsed": "安盛街-服装店-304柜",
        "_vmReached": "新达汇-电梯厅贩卖机-翻找",
    }
    plans = []      # auto: {name, scene, writes:[(file,line)]}
    manual = []     # {name, reason, writes}
    for r in sorted(a1, key=lambda x: x["name"]):
        name = r["name"]
        pw = [w for w in r["writes"] if (w["mode"] == "set" and w["val"] == "true") or
              (w["mode"] == "assign" and w["val"] in ("true", "1"))]
        ctxs = []
        for w in pw:
            ctx = write_context(w["file"], w["line"])
            ctxs.append((w, ctx))
        ok = True
        reason = []
        scenes = set()
        for w, ctx in ctxs:
            if ctx == "onEnter-obj":
                scenes.add(w["scene"])
            elif name in OVERRIDE:
                scenes.add(OVERRIDE[name])
            else:
                ok = False
                reason.append(f"{ctx} 写入 {w['file']}:{w['line']}")
        if ok and len(scenes) == 1:
            plans.append(dict(name=name, scene=scenes.pop(),
                              writes=[(w["file"], w["line"], w["mode"]) for w, _ in ctxs],
                              comment=r["comment"]))
        else:
            manual.append(dict(name=name, reason="; ".join(reason) or f"多个场景 {scenes}",
                               writes=[(w["file"], w["line"], w["mode"]) for w, _ in ctxs]))

    # ---------- 2. 读点统计 + text 插值检查 ----------
    repl_names = {p["name"] for p in plans}
    read_counts = defaultdict(int)
    interp_hits = []
    files_all = sorted({p for p in STORY_DIR.rglob("*.js")})
    for path in files_all:
        rel = path.relative_to(ROOT).as_posix()
        for i, ln in enumerate(file_lines(rel), 1):
            for nm in repl_names:
                if re.search(r"(?<![\w$.])" + nm + r"\b", ln):
                    read_counts[nm] += 1
                if re.search(r"\{" + nm + r"\}", ln):
                    interp_hits.append((nm, rel, i))
    manual_names = {m["name"] for m in manual}

    # ---------- 3. 输出计划 ----------
    print(f"A1 共 {len(a1)} 个:auto {len(plans)} / 人工 {len(manual)}")
    if interp_hits:
        print(f"⚠ text 插值引用 {len(interp_hits)} 处(需人工):")
        for nm, rel, i in interp_hits:
            print(f"   {nm} @ {rel}:{i}")
    print("\n== 人工清单(本次不动) ==")
    for m in manual:
        print(f"  {m['name']}  ← {m['reason']}")
        for f, l, mode in m["writes"]:
            src = file_lines(f)[l - 1].strip()
            print(f"      {f}:{l} [{mode}] {src[:110]}")
    print("\n== 自动替换计划 ==")
    for p in plans:
        print(f"  {p['name']}  → _visit['{p['scene']}'] > 0   (写入点 {len(p['writes'])} 个, 全库引用行 {read_counts[p['name']]} 行)")
    if not apply_mode:
        print("\n(分析模式,未修改文件。确认后加 --apply)")
        return

    # ---------- 4. 应用 ----------
    # 构建替换表
    tab = {}
    for p in plans:
        nm = p["name"]
        sc = p["scene"].replace("'", "\\'")  # 场景名内一般无单引号
        tab[nm] = dict(scene=p["scene"],
                       re_prefix=re.compile(r"\b(vars|v|gameState)\." + nm + r"\b"),
                       re_neg=re.compile(r"(?<![\w$.])!\s*" + nm + r"\b"),
                       re_bare=re.compile(r"(?<![\w$.!])" + nm + r"\b"),
                       expr_prefix=lambda m, s=sc: f"({m.group(1)}._visit['{s}'] > 0)",
                       expr_neg=f"!_visit['{sc}']",
                       expr_bare=f"_visit['{sc}'] > 0")

    def apply_reads(line):
        orig = line
        for nm, t in tab.items():
            line = t["re_prefix"].sub(t["expr_prefix"], line)
            line = t["re_neg"].sub(t["expr_neg"], line)
            line = t["re_bare"].sub(t["expr_bare"], line)
        return line, orig

    def del_set_key(lines, idx, name):
        """在 idx 行起的花括号块内删 name: true,返回(新行列表, 是否成功)
        注意:只匹配 set(不能用 SETADD_RE——它会先命中 add,导致删错块/删失败)"""
        ln = lines[idx]
        m = re.search(r"\bset\s*:\s*\{", ln)
        if not m:
            return None, False
        start = m.end() - 1
        seg = ln[start:]
        j = idx
        while seg.count("{") > seg.count("}") and j + 1 < len(lines):
            j += 1
            seg += "\n" + lines[j]
        try:
            body, endpos = audit.read_balanced(seg, 0)
        except AssertionError:
            return None, False
        new_body = re.sub(r",?\s*" + name + r"\s*:\s*true\b", "", body)
        # 删块内第一个键时前面无逗号,残留的尾随逗号会顶到块头;删最后一个键同理反之
        new_body = re.sub(r"^\s*,", "", new_body)
        new_body = re.sub(r",\s*$", "", new_body)
        if new_body.strip() == "":
            new_seg = "{}"
        else:
            new_seg = "{" + new_body + "}"
        replaced = seg[:0] + new_seg + seg[endpos + 1:]
        new_lines = (ln[:start] + replaced).split("\n")
        out = lines[:idx] + new_lines + lines[j + 1:]
        # 校验:删除后该块附近不得再有 name: true 键(裸名读点是合法的,由读点替换阶段处理)
        joined = "\n".join(out[idx:idx + (j - idx) + 2])
        if re.search(r"\b" + name + r"\s*:\s*true\b", joined):
            return None, False
        return out, True

    changed = {}   # rel -> [ (line_no, old, new) ]
    def record(rel, lineno, old, new):
        changed.setdefault(rel, []).append((lineno, old, new))

    files_to_touch = set()
    for p in plans:
        for f, l, mode in p["writes"]:
            files_to_touch.add(f)
        files_to_touch.add("story/core.js")
    # 读点所在文件也纳入
    for path in files_all:
        rel = path.relative_to(ROOT).as_posix()
        for ln in file_lines(rel):
            if any(t["re_bare"].search(ln) or t["re_prefix"].search(ln) for t in tab.values()):
                files_to_touch.add(rel)
                break

    results = {}   # rel -> lines(两阶段:全部处理成功后才统一写盘)
    for rel in sorted(files_to_touch):
        path = ROOT / rel
        lines = file_lines(rel)
        # 写入点处理(从后往前,行号不漂移)
        writes_here = []
        for p in plans:
            for f, l, mode in p["writes"]:
                if f == rel:
                    writes_here.append((l, p["name"], mode))
        writes_here.sort(reverse=True)
        for l, nm, mode in writes_here:
            idx = l - 1
            if mode == "set":
                out, ok = del_set_key(lines, idx, nm)
                if not ok:
                    raise SystemExit(f"del_set_key 失败: {rel}:{l} {nm} —— 已中止,未写入任何文件,请人工处理该写入点")
                # 清理空 set
                out[idx] = re.sub(r"set\s*:\s*\{\s*\}\s*,\s*", "", out[idx])
                out[idx] = re.sub(r",\s*set\s*:\s*\{\s*\}", "", out[idx])
                out[idx] = re.sub(r"set\s*:\s*\{\s*\}", "", out[idx])
                old_line = lines[idx]
                lines = out
                # 行可能被拆分/合并,直接记录整体
                record(rel, l, old_line, " | ".join(out[idx:idx + 2]))
            else:
                old_line = lines[idx]
                new_line = re.sub(r"(?:vars|v|gameState)\." + nm + r"\s*=\s*(?:true|1)\s*;?", "", old_line)
                if re.search(r"\b" + nm + r"\s*=\s*(?:true|1)\b", new_line):
                    raise SystemExit(f"assign 删除后仍有赋值残留: {rel}:{l} {nm} —— 已中止,未写入任何文件")
                if new_line.strip() == "":
                    del lines[idx]
                else:
                    lines[idx] = new_line
                record(rel, l, old_line, new_line.strip() or "(整行删除)")
        # 定义行(仅 core.js;支持一行多定义)
        if rel == "story/core.js":
            keep = []
            deleted_defs = []
            for i, ln in enumerate(lines, 1):
                code_part = ln
                hit = False
                for nm in tab:
                    pat = re.compile(r"\b" + nm + r"\s*:\s*false\s*,?\s*")
                    if pat.search(code_part):
                        code_part = pat.sub("", code_part, count=1)
                        hit = True
                        deleted_defs.append((i, ln, nm))
                if hit:
                    stripped = re.sub(r"//.*$", "", code_part).strip().rstrip(",").strip()
                    if stripped == "":
                        continue  # 整行已空(可能只剩注释),删除
                    keep.append(code_part.rstrip())
                else:
                    keep.append(ln)
            lines = keep
            for i, ln, nm in deleted_defs:
                record(rel, i, ln, f"(定义 {nm} 删除)")
        # 读点替换(逐行,含刚处理过的写入行)
        for i, ln in enumerate(lines):
            new_line, orig = apply_reads(ln)
            if new_line != ln:
                lines[i] = new_line
                record(rel, i + 1, ln, new_line)
        _file_lines_cache[rel] = lines
        results[rel] = lines

    # 全部处理成功 → 统一写盘
    for rel, lines in results.items():
        (ROOT / rel).write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ---------- 5. 日志 ----------
    log = ["# A1 变量替换应用日志\n", f"> auto 替换 {len(plans)} 个变量;修改文件 {len(changed)} 个;修改点 {sum(len(v) for v in changed.values())} 处\n"]
    for rel in sorted(changed):
        log.append(f"\n## {rel}({len(changed[rel])} 处)\n")
        for lineno, old, new in changed[rel]:
            log.append(f"- L{lineno}: `{esc(old.strip())[:150]}`")
            log.append(f"  → `{esc(new.strip())[:150]}`")
    logpath = ROOT / "tools" / "变量替换应用日志.md"
    logpath.write_text("\n".join(log), encoding="utf-8")
    print(f"\n已应用:修改 {len(changed)} 个文件、{sum(len(v) for v in changed.values())} 处;日志: {logpath.name}")
    print(f"人工清单({len(manual)} 个未动):" + ", ".join(m["name"] for m in manual))

if __name__ == "__main__":
    main()
