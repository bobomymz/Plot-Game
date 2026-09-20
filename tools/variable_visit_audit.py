# -*- coding: utf-8 -*-
"""
变量 ↔ _visit 替换审计工具
扫描 story/ 全部剧情文件 + core.js,统计每个 _variables 变量的写入/读取情况,
按启发式规则分级:A=可直接用 _visit['场景'] 替换 / B=可替换但需重构 / C=不建议 / D=计数型可改。
输出: tools/变量_visit替换审计报告.md
用法: python tools/variable_visit_audit.py
"""
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
STORY_DIR = ROOT / "story"
CORE = STORY_DIR / "core.js"
ENGINE = ROOT / "engine.js"
UTILS = STORY_DIR / "utils.js"
OUT_MD = ROOT / "tools" / "变量_visit替换审计报告.md"

# ---------- 工具:花括号平衡截取 ----------
def read_balanced(text, start):
    """从 text[start] 应为 '{' 开始,返回 (花括号内部文本, 结束索引(含'}'))."""
    assert text[start] == "{", f"expect {{ at {start}"
    depth = 0
    i = start
    n = len(text)
    while i < n:
        c = text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1:i], i
        i += 1
    return text[start + 1:], n - 1

# ---------- 1. 解析 core.js 变量定义 ----------
def parse_core_vars():
    text = CORE.read_text(encoding="utf-8-sig")
    m = re.search(r"_variables\s*:\s*\{", text)
    if not m:
        raise RuntimeError("core.js 中找不到 _variables")
    body, _ = read_balanced(text, m.end() - 1)
    # 行号偏移:变量块在文件中的起始行
    start_line = text[:m.end()].count("\n") + 1

    var_defs = {}   # name -> dict(line, comment, initial, group)
    order = []
    group = "未分组"
    for idx, ln in enumerate(body.splitlines()):
        lineno = start_line + idx
        # 分组注释
        gm = re.match(r"^\s*//\s*(.*)$", ln)
        if gm and not re.match(r"^\s*//.*?[-—=]{2,}", ln):
            content = gm.group(1).strip()
            if content and not re.search(r"[0-9,;:、()（）\[\]{}]", content) and len(content) <= 22:
                group = content.strip("-—= ")
                continue
        gm2 = re.match(r"^\s*//\s*[-=]{2,}\s*(.+?)\s*[-=]{2,}\s*$", ln)
        if gm2:
            group = gm2.group(1).strip()
            continue
        # 变量定义行(缩进 4 空格)
        dm = re.match(r"^    ([_A-Za-z]\w*)\s*:", ln)
        if dm:
            inline_comment = ""
            cm = re.search(r"//\s*(.*)$", ln)
            if cm:
                inline_comment = cm.group(1).strip()
            # 一行可能多个定义
            for vm in re.finditer(r"(?<![\w$.])([_A-Za-z]\w*)\s*:\s*([^,{}]+)", ln):
                name, raw = vm.group(1), vm.group(2).strip()
                # 值判断
                if raw in ("false", "true"):
                    typ, init = "bool", raw == "true"
                elif re.fullmatch(r"-?\d+(\.\d+)?", raw):
                    typ, init = "number", float(raw) if "." in raw else int(raw)
                elif raw.startswith('"') or raw.startswith("'"):
                    typ, init = "string", raw
                else:
                    typ, init = "complex", raw
                if name not in var_defs:
                    order.append(name)
                var_defs[name] = dict(line=lineno, comment=inline_comment, initial=init,
                                      typ=typ, group=group, def_file="story/core.js")
    return var_defs, order

# ---------- 2. 逐文件扫描:场景上下文 + 写入点 + 条件引用 ----------
SETADD_RE = re.compile(r"\b(set|add)\s*:\s*\{")
ASSIGN_RE = re.compile(r"\b(?:vars|v|gameState)\.([_A-Za-z]\w*)\s*=(?![=>])")
SCENE_RE = re.compile(r'^  "([^"\\]+)":\s*\{')
HELPER_RE = re.compile(r"^(?:function\s+([\w$]+)|const\s+([\w$]+)\s*=|var\s+([\w$]+)\s*=|let\s+([\w$]+)\s*=)")

def scan_story_files():
    files = sorted([p for p in STORY_DIR.rglob("*.js")])
    writes = []          # dict(var, mode, val, file, line, scene)
    cond_refs = defaultdict(set)   # var -> set(file)  出现在 condition/函数条件中
    visit_uses = []      # (file, line, scene_expr)
    total_refs = defaultdict(int)  # var -> 出现总次数(词边界)
    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8-sig")
        lines = text.splitlines()
        scene = "(文件级)"
        for i, ln in enumerate(lines):
            lineno = i + 1
            sm = SCENE_RE.match(ln)
            if sm:
                scene = sm.group(1)
            else:
                hm = HELPER_RE.match(ln)
                if hm:
                    name = next(g for g in hm.groups() if g)
                    scene = f"(函数 {name})"
            # _visit 使用点
            for vm in re.finditer(r"_visit\s*\[", ln):
                visit_uses.append((rel, lineno, scene, ln.strip()[:120]))
            # set/add 对象写入(支持跨行平衡)
            for em in SETADD_RE.finditer(ln):
                seg = ln[em.end() - 1:]
                # 若本行花括号不平衡,向后拼接
                j = i
                while seg.count("{") > seg.count("}") and j + 1 < len(lines):
                    j += 1
                    seg += "\n" + lines[j]
                if seg.startswith("{"):
                    body, _ = read_balanced(seg, 0)
                else:
                    body = seg
                for km in re.finditer(r"(?<![\w$.])([_A-Za-z]\w*)\s*:\s*([^,{}]+)", body):
                    var, val = km.group(1), km.group(2).strip()
                    if var in ("strength",) and em.group(1) == "set" and False:
                        pass
                    writes.append(dict(var=var, mode=em.group(1), val=val,
                                       file=rel, line=lineno, scene=scene))
            # 直接赋值
            for am in ASSIGN_RE.finditer(ln):
                var = am.group(1)
                rhs = ln[am.end():].strip().rstrip(",;")
                rhs = rhs[:60]
                writes.append(dict(var=var, mode="assign", val=rhs,
                                   file=rel, line=lineno, scene=scene))
            # 词频统计(排除定义文件? 不排除,后面扣除)
            for nm in re.findall(r"\b[_A-Za-z]\w*\b", ln):
                total_refs[nm] += 1
            # 条件引用:condition/showCondition 行 或 v./vars. 前缀出现在函数体
            low = ln.lower()
            if ("condition" in low or "condition:" in ln or "showcondition" in low or
                    re.search(r"\b(?:v|vars|gameState)\.\w+", ln) and ("return" in ln or "if" in ln or "?" in ln)):
                for nm in set(re.findall(r"\b[_A-Za-z]\w*\b", ln)):
                    cond_refs[nm].add(rel)
    return writes, cond_refs, visit_uses, total_refs

# ---------- 3. 引擎维护变量(engine.js 直接赋值) ----------
def scan_engine_writes():
    text = ENGINE.read_text(encoding="utf-8-sig")
    names = set()
    for m in re.finditer(r"gameState\.([_A-Za-z]\w*)\s*=(?![=>])", text):
        names.add(m.group(1))
    return names

# ---------- 4. core.js 内引用块(_reactive/_globalTriggers/_screenEffects/_caps) ----------
def core_special_refs():
    text = CORE.read_text(encoding="utf-8-sig")
    refs = set()
    for key in ("_caps", "_reactive", "_globalTriggers", "_screenEffects", "_display"):
        m = re.search(re.escape(key) + r"\s*:\s*[\[{]", text)
        if not m:
            continue
        start = m.end() - 1
        body, _ = read_balanced(text, start) if text[start] == "{" else (text[start:start+2], start)
        # 数组或对象都处理
        if text[start] == "[":
            depth, i = 1, start
            while depth:
                c = text[i]
                if c == "[":
                    depth += 1
                elif c == "]":
                    depth -= 1
                i += 1
            body = text[start + 1:i - 1]
        for nm in set(re.findall(r"\b[_A-Za-z]\w*\b", body)):
            refs.add(nm)
    return refs

# ---------- 5. 分类 ----------
def classify(var_defs, order, writes, cond_refs, engine_writes, special_refs, total_refs, visit_uses):
    writes_by_var = defaultdict(list)
    for w in writes:
        writes_by_var[w["var"]].append(w)

    ENGINE_MANAGED = {
        "_visit", "_lastScene", "_seqScene", "_isOutdoor", "gameMinutes", "isNight",
        "_input", "positionAfterOperation",
    }
    result = []
    for name in order:
        d = var_defs[name]
        ws = writes_by_var.get(name, [])
        # 写入值归类
        set_true = [w for w in ws if w["mode"] == "set" and w["val"] == "true"]
        set_false = [w for w in ws if w["mode"] == "set" and w["val"] == "false"]
        set_num = [w for w in ws if w["mode"] == "set" and re.fullmatch(r"-?\d+(\.\d+)?", w["val"] or "")]
        set_str = [w for w in ws if w["mode"] == "set" and (w["val"] or "").startswith(("'", '"'))]
        set_expr = [w for w in ws if w["mode"] == "set" and w["val"] not in ("true", "false") and not re.fullmatch(r"-?\d+(\.\d+)?", w["val"] or "")]
        add_w = [w for w in ws if w["mode"] == "add"]
        assign_true = [w for w in ws if w["mode"] == "assign" and w["val"] in ("true", "1")]
        assign_false = [w for w in ws if w["mode"] == "assign" and w["val"] in ("false", "0")]
        assign_num0 = [w for w in ws if w["mode"] == "assign" and w["val"] == "0"]
        assign_other = [w for w in ws if w["mode"] == "assign" and w["val"] not in ("true", "false", "0", "1")]

        positive_writes = set_true + assign_true
        negative_writes = set_false + assign_false + assign_num0
        scenes = sorted({w["scene"] for w in ws})
        pos_scenes = sorted({w["scene"] for w in positive_writes})
        files_w = sorted({w["file"] for w in ws})

        typ = d["typ"]
        reasons = []
        if name in ENGINE_MANAGED or name in engine_writes:
            reasons.append("引擎/系统维护")
        if name.startswith("__"):
            reasons.append("临时变量")
        if typ == "string" or set_str or any(a for a in assign_other if (a["val"] or "").startswith(("'", '"'))):
            reasons.append("字符串/位置指针")
        if typ == "complex":
            reasons.append("复杂结构(Set/数组/对象)")
        if negative_writes or (typ == "bool" and d["initial"] and (set_true or assign_true)):
            # 有 false/0 复位,或初始 true 被翻转(资源消耗型)
            reasons.append("存在复位/双向写")
        if set_expr or assign_other:
            if not reasons or "存在复位/双向写" not in reasons:
                reasons.append("表达式写值(动态计算)")
        if d["initial"] is True and typ == "bool":
            reasons.append("初始true资源型(可被消耗为false)")

        single = bool(name)
        if not ws:
            refs = total_refs.get(name, 0)
            grade = "死变量?" if refs == 0 else "只读/未写入"
            reasons.append("无写入点")
        elif typ == "bool" and not d["initial"] and positive_writes and not negative_writes and not set_expr and not assign_other and not set_str:
            # 单向 true 布尔
            if len(pos_scenes) == 1 and name not in special_refs:
                grade = "A"
                reasons.append("单向布尔·单场景写入·未被规则引擎引用")
            else:
                grade = "B"
                reasons.append("单向布尔但多场景写入/被规则引用")
        elif typ == "number" and not d["initial"] and add_w and not negative_writes and not assign_other and not set_false:
            grade = "D"
            reasons.append("数值单向累加(可用 _visit 次数替代,需动作独立成场景)")
        else:
            grade = "C"
            if not reasons:
                reasons.append("含复位或状态语义,依赖独立变量")
        result.append(dict(name=name, **d, grade=grade,
                           writes=ws, scenes=scenes, pos_scenes=pos_scenes,
                           files=files_w, reasons=sorted(set(reasons)),
                           n_pos=len(positive_writes), n_neg=len(negative_writes),
                           n_add=len(add_w),
                           cond_files=sorted(f for f in cond_refs.get(name, ()) if f != "story/core.js")))
    return result

# ---------- 6. 报告 ----------
def esc(s):
    return (s or "").replace("|", "\\|").replace("\n", " ")

def main():
    var_defs, order = parse_core_vars()
    writes, cond_refs, visit_uses, total_refs = scan_story_files()
    engine_writes = scan_engine_writes()
    special_refs = core_special_refs()
    result = classify(var_defs, order, writes, cond_refs, engine_writes, special_refs, total_refs, visit_uses)

    by = defaultdict(list)
    for r in result:
        by[r["grade"]].append(r)

    n_all = len(result)
    nA, nB, nC, nD = len(by["A"]), len(by["B"]), len(by["C"]), len(by["D"])
    nDead = len([r for r in result if "无写入点" in r["reasons"] and total_refs.get(r["name"], 0) <= 1])
    nNowrite = len([r for r in result if "无写入点" in r["reasons"]])
    nVisitUses = len(visit_uses)

    L = []
    L.append("# 变量 ↔ _visit 替换审计报告\n")
    L.append("> 生成方式:`python tools/variable_visit_audit.py` 静态扫描 story/ 全部 24 个剧情文件 + engine.js。")
    L.append("> 引擎语义:`_visit[场景ID]` 由引擎在每次渲染场景时自动 +1(onEnter 之前,回溯跳过、随快照存读档)。")
    L.append(f"> 判定基准:A = 单向布尔(false→true 仅一次)、写入场景唯一、未被 _reactive/_globalTriggers/_screenEffects/_caps 引用 → 可直接改为 `_visit['写入场景'] > 0`。\n")
    L.append("## 一、总览\n")
    L.append(f"- `core.js _variables` 定义变量:**{n_all}** 个")
    L.append(f"- 有剧情写入点的:{n_all - nNowrite} 个;无写入点:{nNowrite} 个(其中疑似完全未使用 {nDead} 个,见附录)")
    L.append(f"- **A级(可直接替换):{nA} 个** → 替换后 _variables 可减少 {nA} 个")
    L.append(f"- B级(可替换但需先重构/多场景写入):{nB} 个")
    L.append(f"- C级(不建议替换):{nC} 个")
    L.append(f"- D级(计数型,可改为 _visit 次数):{nD} 个")
    L.append(f"- 剧情代码中已有 `_visit['…']` 用法:{nVisitUses} 处(引擎惯例已确立)\n")

    def var_table(rows, show_writes=True):
        out = []
        out.append("| 变量 | 分组 | 说明(core.js注释) | 写入场景 | 写入次数 | 条件引用文件数 |")
        out.append("| --- | --- | --- | --- | --- | --- |")
        for r in rows:
            sc = "、".join(r["pos_scenes"][:3]) if r["pos_scenes"] else "、".join(r["scenes"][:3])
            if len(r["pos_scenes"]) > 3:
                sc += f" 等{len(r['pos_scenes'])}处"
            cmt = esc(r["comment"])[:38]
            out.append(f"| `{r['name']}` | {esc(r['group'])} | {cmt} | {esc(sc)} | {r['n_pos'] + r['n_add']} | {len(r['cond_files'])} |")
        return out

    L.append("\n## 二、A级:可直接用 _visit 替换(共 %d 个)\n" % nA)
    L.append("这些变量全部是 `false→true` 一次性标记,写入点在唯一场景内,替换写法:`_visit['写入场景'] > 0`。")
    L.append("若写入场景本身就是该动作的专用子场景(如「益丰大药房-击杀」),替换是零语义损失;\n若写入发生在主场景 onEnter,则需要把该动作拆成专用子场景才能替换。\n")
    L.extend(var_table(by["A"]))

    L.append("\n## 三、B级:可替换但需先重构(共 %d 个)\n" % nB)
    L.append("单向布尔,但写入点分散在多个场景(或在多个分支重复 set true)。替换前需收敛写入点或拆分专用子场景。\n")
    L.extend(var_table(by["B"]))

    L.append("\n## 四、D级:计数型(共 %d 个)\n" % nD)
    L.append("只增不减的数值变量。若对应动作可独立成场景,可改用 `_visit['动作场景']` 的次数语义;否则保留。\n")
    L.extend(var_table(by["D"]))

    L.append("\n## 五、C级:不建议替换(共 %d 个)\n" % nC)
    reason_map = defaultdict(list)
    for r in by["C"]:
        key = "、".join(r["reasons"]) if r["reasons"] else "含复位或状态语义"
        reason_map[key].append(r["name"])
    L.append("| 原因 | 数量 | 变量 |")
    L.append("| --- | --- | --- |")
    for k in sorted(reason_map, key=lambda x: -len(reason_map[x])):
        names = reason_map[k]
        L.append(f"| {k} | {len(names)} | {esc('、'.join('`%s`' % n for n in names))} |")

    L.append("\n## 六、替换注意事项\n")
    L.append("1. **存档兼容**:替换后旧存档里的旧变量值不再被读取。旧档中 `_visit['写入场景']` 与变量值在快照里本是一致生成的,一般等价;但跨版本存档建议过渡期写 `(vars.旧变量 || vars._visit['场景'] > 0)` 双读。")
    L.append("2. **场景名联动**:改用 _visit 后,场景 ID 成为逻辑的一部分——以后重命名该场景必须全库同步(与既有约定「击杀标记靠场景名或场景内 set,换场景名会断联动」一致)。")
    L.append("3. **回溯/读档一致性**:_visit 与普通变量都随快照恢复,替换不引入新的回溯问题;但 `_visit` 在「回溯跳过」时不累加,依赖 `>1`(第二次进入)语义的场景要实测。")
    L.append("4. **禁止用手写逻辑改 _visit**:_visit 只能由引擎维护,剧情代码只读不写(与 `_fatiguePaid` 同类约束)。")
    L.append("5. **文本分支依赖**:部分变量在 text 函数里用于差异化描述(如尸体还在),替换时注意 `>0`(到过)与 `>1`(第二次到)的取值。")

    # 附录
    L.append("\n## 附录A:疑似完全未使用的变量\n")
    L.append("(定义后全库无词频引用或仅定义处出现 1 次)\n")
    dead = [r for r in result if "无写入点" in r["reasons"] and total_refs.get(r["name"], 0) <= 1]
    if dead:
        L.append("| 变量 | 分组 | 说明 |")
        L.append("| --- | --- | --- |")
        for r in dead:
            L.append(f"| `{r['name']}` | {esc(r['group'])} | {esc(r['comment'])[:40]} |")
    else:
        L.append("无")
    L.append("\n## 附录B:未在 _variables 中定义的“影子变量”(代码中直接赋值)\n")
    shadow = defaultdict(list)
    defined = set(order)
    for w in writes:
        if w["var"] not in defined and w["var"] not in ("_input",):
            shadow[w["var"]].append(w)
    if shadow:
        L.append("| 变量 | 写入点(文件:行·场景) |")
        L.append("| --- | --- |")
        for v in sorted(shadow):
            pts = "; ".join(f"{w['file'].split('/')[-1]}:{w['line']}·{w['scene']}" for w in shadow[v][:4])
            L.append(f"| `{v}` | {esc(pts)} |")
    else:
        L.append("无")

    OUT_MD.write_text("\n".join(L), encoding="utf-8")

    # 控制台摘要
    print(f"变量总数 {n_all} | A可替换 {nA} | B需重构 {nB} | C不建议 {nC} | D计数型 {nD} | 无写入 {nNowrite} | 疑似死变量 {nDead} | _visit现有用法 {nVisitUses} 处")
    print("\nA级清单(可直接替换):")
    for r in sorted(by["A"], key=lambda x: x["group"]):
        print(f"  [{r['group']}] {r['name']}  ← {r['pos_scenes'][0] if r['pos_scenes'] else '?'}")
    print(f"\n报告已写入: {OUT_MD}")

if __name__ == "__main__":
    main()
