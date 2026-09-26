// item_guard_leak_scan.js —— 「物品守卫」缺陷扫描
//
// 背景（2026-09-26，波波提出）：
//   建平-致真楼-1F-老吴杂物室-铁柜：玩家【没开过柜门】就因为身上有螺丝刀（可能来自别处），
//   被文案告知「你已经有螺丝刀了。」——等于在玩家不知道柜子里有什么的前提下，把柜内物品点名了。
//
// 这类缺陷统称「物品守卫（item guard）」：用物品变量 hasX / xxx 当闸门，却没有区分
//   「玩家是在【本处】拿到的」 与 「玩家从别处带来、本处根本没看过」。
// 表现有两种，本脚本都扫：
//
//   【A 剧透型】未开容器/未见物品，仅凭 hasX 就在玩家可见文案里点名该物品
//              （"你已经有螺丝刀了" / "（你已经有一把螺丝刀了。）" / "斧头你身上已经有一把了"）
//   【B 吞内容型】指向某场景的入口全被 !hasX 之类守卫包住：玩家一旦从别处拿到 X，
//              该场景（及其内容/叙事）永久不可达 —— 要么死内容，要么逼玩家去猜
//
// 判定辅助信息（脚本自动收集，最终定性仍由人复核）：
//   - 守卫变量：条件表达式里引用的 vars.xxx
//   - 是否有「本处标记」守卫（_visit[本场景] / _xxxTaken / _xxxOpened 等）：有则安全
//   - 该变量的来源场景数：>1 表示玩家可能带着别处的 X 首次进入本场景 → 真剧透风险高
//
// 用法（项目根目录）：node tools/item_guard_leak_scan.js [--md]
//   --md  额外把结果写入 tools/物品守卫审计报告.md
// 退出码：0 = 无 P0/P1 候选；1 = 存在待处理候选

const fs = require("fs");
const path = require("path");

process.chdir(path.resolve(__dirname, ".."));
const ROOT = process.cwd();
const FILES = require("./story_files").list();

// ---------- 1. 读源码 ----------
const src = {}; // file -> { lines: [] }
for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.warn("!! 缺少文件 " + f); continue; }
  src[f] = { lines: fs.readFileSync(p, "utf8").split(/\r?\n/) };
}

// ---------- 2. 行号 → 场景 ID 映射 ----------
// 匹配形如   "场景ID": {   或   "场景ID": function(vars) {
const SCENE_DEF = /^\s*["']([^"']+)["']\s*:\s*(\{|function)/;
for (const f of Object.keys(src)) {
  const marks = [];
  const lines = src[f].lines;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SCENE_DEF);
    if (m) marks.push({ line: i + 1, id: m[1] });
  }
  src[f].marks = marks;
}
function sceneAt(f, line) {
  const marks = src[f].marks;
  let cur = null;
  for (const mk of marks) { if (mk.line <= line) cur = mk.id; else break; }
  return cur;
}

// ---------- 3. 变量 → 中文说明 / 中文物品名（core.js _variables 注释） ----------
const varInfo = {}; // name -> 注释
const varName = {}; // name -> 物品中文名（注释里第一个括号/逗号前的词）
{
  const lines = src["story/core.js"] ? src["story/core.js"].lines : [];
  const re = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(false|true|0|-?\d+|""|'')\s*,?\s*\/\/\s*(.+)$/;
  for (const l of lines) {
    const m = l.match(re);
    if (!m) continue;
    const note = m[3].trim();
    varInfo[m[1]] = note;
    const nm = note.split(/[（(,，。]/)[0].trim();
    if (nm) varName[m[1]] = nm;
  }
}

// 场景块源码（用于判断「该物品在本场景其它文案里是否已露过面」）
function sceneBlock(f, line) {
  const marks = src[f].marks;
  let start = null, end = src[f].lines.length;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].line <= line) start = marks[i].line;
    else { end = marks[i].line - 1; break; }
  }
  if (start === null) return "";
  return src[f].lines.slice(start, Math.min(end, line + 40)).join("\n");
}

// ---------- 4. 变量来源场景（谁把这个物品给了玩家） ----------
const sources = {}; // var -> Set(场景ID)
function addSource(v, scene) {
  if (!scene) return;
  (sources[v] = sources[v] || new Set()).add(scene);
}
const SET_TRUE = /\b([A-Za-z_][A-Za-z0-9_]*)\s*:=\s*true\b|\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*true\b|\bvars\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*true\b/;
for (const f of Object.keys(src)) {
  const lines = src[f].lines;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*\/\//.test(l)) continue;
    let m; const re = /\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*true\b|\bvars\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*true\b/g;
    while ((m = re.exec(l))) {
      const v = m[1] || m[2];
      if (!v) continue;
      addSource(v, sceneAt(f, i + 1));
    }
  }
}

// ---------- 5. A 类：剧透型文案 ----------
const LEAK_RE = /(已经有|已经拿|已经取|已经搜|已经翻|已经带着|已经戴上|已经装了|不再需要|用不着|没必要|不需要再|不必再|不用再拿|没再重复拿)/;
const hits = [];
for (const f of Object.keys(src)) {
  const lines = src[f].lines;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*\/\//.test(raw)) continue;              // 注释行不算玩家可见
    if (!LEAK_RE.test(raw)) continue;
    if (!/["'`]/.test(raw)) continue;                 // 不是字符串内容（多半是标识符/注释）
    const line = i + 1;
    const scene = sceneAt(f, line);

    // 向上找最近的 if(...) 条件（括号平衡，最多回溯 15 行）
    let cond = "";
    let condLine = -1;
    for (let j = i; j >= Math.max(0, i - 15); j--) {
      const s = lines[j];
      const idx = s.search(/if\s*\(/);
      if (idx >= 0) {
        let buf = s.slice(idx);
        let depth = 0, k = idx;
        const scan = (str) => {
          for (let p = 0; p < str.length; p++) {
            const c = str[p];
            if (c === "(") depth++;
            else if (c === ")") { depth--; if (depth === 0) return p + 1; }
          }
          return -1;
        };
        let end = scan(buf);
        let jj = j;
        while (end < 0 && jj < i) { jj++; buf += "\n" + lines[jj]; end = scan(buf); }
        cond = buf.slice(0, end > 0 ? end : buf.length);
        condLine = j + 1;
        break;
      }
    }
    const varsInCond = [...new Set([...cond.matchAll(/\b(?:vars|v)\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]))];
    const hasVisitGuard = /_visit\s*\[/.test(cond) || varsInCond.some((v) => /^_/.test(v) && !/^_has/.test(v));
    const itemVars = varsInCond.filter((v) => !/^_/.test(v));

    // 物品在本场景「其它（非本节卫分支）」文案里是否已露面（露过面 → 玩家看得见，不算剧透）
    // 排除：①场景定义行（ID 含物品词，非玩家可见）②命中行所属的守卫分支区间 [condLine, line]（那句就是剧透串本身）
    const mb = src[f].marks;
    let bs = null, be = src[f].lines.length;
    for (const mk of mb) { if (mk.line <= line) bs = mk.line; else { be = mk.line - 1; break; } }
    const blockLines = src[f].lines.slice(bs, Math.min(be, line + 40));
    const visibleNames = itemVars.map((v) => varName[v]).filter(Boolean);
    const mentioned = visibleNames.filter((cn) => {
      const re = new RegExp(cn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      let all = 0;
      blockLines.forEach((bl, idx) => {
        const ln = bs + idx;
        if (ln >= condLine && ln <= line) return; // 守卫分支区间，本身就是剧透串
        if (SCENE_DEF.test(bl)) return;           // 场景定义行（ID 含物品词）
        if (/nextScene|elseScene|timeoutScene|":\s*\{|function\s*\(|positionAfterOperation/.test(bl)) return; // 跳转/定义/函数，非玩家可见描述
        // 另一条 `if (hasX) return "…物品…"` 守卫串（与命中行同属剧透串，非默认可见描述）
        if (/\bif\s*\(/.test(bl) && itemVars.some((v) => bl.includes("vars." + v) || bl.includes("v." + v) || bl.includes(v))) return;
        if (re.test(bl)) all++;
      });
      return all > 0;
    });

    hits.push({
      file: f, line, scene, cond: cond.replace(/\s+/g, " ").slice(0, 120),
      varsInCond, itemVars, hasVisitGuard,
      visibleNames, mentioned,
      text: raw.trim().slice(0, 160),
    });
  }
}

// ---------- 6. B 类：入口被物品守卫包死（吞内容） ----------
// 收集每个 nextScene 目标的入边：{ target, guardText, from }
const inEdges = {}; // target -> [{ file, line, from, guard }]
for (const f of Object.keys(src)) {
  const lines = src[f].lines;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const m = raw.match(/nextScene:\s*["']([^"']+)["']/);
    if (!m) continue;
    const target = m[1];
    // 向上找最近 if / else if 条件（只认"包裹本行的那个 if"：本行缩进要深于 if 行缩进）
    let guard = "";
    const indThis = raw.search(/\S/);
    for (let j = i; j >= Math.max(0, i - 25); j--) {
      const s = lines[j];
      const idx = s.search(/\b(if|else if)\s*\(/);
      if (idx >= 0) {
        const indIf = s.search(/\S/);
        if (indThis > indIf) { // 本行确实缩进更深 → 落在 if 块内
          guard = s.slice(idx).replace(/\s+/g, " ");
          if (/\{\s*$/.test(guard)) guard = guard.replace(/\s*\{\s*$/, "");
        }
        break; // 找到最近的 if 后即停（无论是否包裹本行）
      }
    }
    const gvars = [...new Set([...guard.matchAll(/(?:vars|v)\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((x) => x[1]))];
    (inEdges[target] = inEdges[target] || []).push({
      file: f, line: i + 1, from: sceneAt(f, i + 1), guard, gvars,
    });
  }
}

// B 类候选：所有入边都带 !hasX 之类的负向物品守卫（对某个变量 v，每条入边都含 !v）
const swallow = [];
let suppressedB = 0;
for (const target of Object.keys(inEdges)) {
  const edges = inEdges[target];
  if (edges.length === 0) continue;
  // 候选变量 = 出现在任一入边守卫里的物品变量
  const cand = new Set();
  for (const e of edges) for (const v of e.gvars) if (!/^_/.test(v)) cand.add(v);
  for (const v of cand) {
    const allNeg = edges.every((e) => e.gvars.includes(v) && new RegExp("!\\s*(?:vars|v)\\." + v + "\\b").test(e.guard));
    if (!allNeg) continue;
    const srcList = [...(sources[v] || [])];
    const srcCount = srcList.length;
    // 抑制：目标场景本身就是该物品的来源（或其子场景）—— 拿过之后不再显示属正常设计
    const selfSource = srcList.some((s) => s === target || s.indexOf(target) === 0 || target.indexOf(s) === 0);
    if (selfSource) { suppressedB++; continue; }
    swallow.push({
      target, varName: v,
      desc: varInfo[v] || "",
      edges: edges.map((e) => e.file.replace("story/", "") + ":" + e.line + " ← " + (e.from || "?") + "  guard: " + e.guard.slice(0, 90)),
      sources: srcList,
      srcCount,
    });
  }
}
swallow.sort((a, b) => b.srcCount - a.srcCount);

// ---------- 7. 输出 ----------
function severity(h) {
  if (h.hasVisitGuard) return "OK-有本处标记守卫";
  if (h.itemVars.length === 0) return "IGNORE-非物品守卫(人工确认)";
  if (h.mentioned.length > 0) return "OK-物品在本场景已露面";
  const multi = h.itemVars.some((v) => (sources[v] ? sources[v].size : 0) > 1);
  const selfSrc = h.itemVars.some((v) => (sources[v] || new Set()).has(h.scene));
  if (multi && !selfSrc) return "P0-多来源剧透";
  if (!selfSrc) return "P1-剧透(非本处来源)";
  return "P2-本处来源,仅回看(查可达性)";
}

const rows = hits.map((h) => Object.assign({}, h, { level: severity(h) }));
rows.sort((a, b) => a.level.localeCompare(b.level));

console.log("=== A 类：物品守卫剧透文案候选（共 " + rows.length + " 处）===\n");
for (const h of rows) {
  console.log("[" + h.level + "] " + h.file.replace("story/", "") + ":" + h.line
    + "  场景: " + (h.scene || "?"));
  console.log("   守卫: " + (h.cond || "(无/未识别)"));
    console.log("   变量: " + (h.itemVars.join(", ") || "-")
      + (h.itemVars.length ? "  (" + h.itemVars.map((v) => v + "→来源" + (sources[v] ? sources[v].size : 0) + "处=[" + [...(sources[v] || [])].join(",") + "]").join("; ") + ")" : ""));
  console.log("   文案: " + h.text);
  console.log("");
}

console.log("=== B 类：入口被 !物品变量 守卫包死的场景（共 " + swallow.length + " 处）===\n");
for (const s of swallow) {
  console.log("[B" + (s.srcCount > 1 ? "-P0-多来源" : "-P2") + "] 目标: " + s.target);
  console.log("   守卫变量: " + s.varName + (s.desc ? "  // " + s.desc : ""));
  console.log("   该变量来源(" + s.srcCount + "): " + (s.sources.join(" | ") || "(none)"));
  for (const e of s.edges) console.log("   入边: " + e);
  console.log("");
}

const p0 = rows.filter((h) => h.level.startsWith("P0")).length;
const p1 = rows.filter((h) => h.level.startsWith("P1")).length;
const b0 = swallow.filter((s) => s.srcCount > 1).length;
console.log("=== 汇总 ===  A类 P0=" + p0 + " P1=" + p1 + " P2=" + rows.filter((h) => h.level.startsWith("P2")).length
  + "  OK=" + rows.filter((h) => h.level.startsWith("OK")).length
  + "  |  B类 多来源=" + b0 + " / 共 " + swallow.length);

if (process.argv.includes("--md")) {
  const out = ["# 物品守卫（item guard）缺陷审计报告", "",
    "> 生成器：`node tools/item_guard_leak_scan.js --md`（全库源码扫描，非抽样）",
    "> 生成时间：" + new Date().toISOString().slice(0, 19).replace("T", " "), "",
    "## 缺陷定义", "",
    "- **A 类·剧透型**：玩家没开过容器/没见过物品，仅凭 `hasX` 就在可见文案里点名该物品。",
    "- **B 类·吞内容型**：指向某场景的入口全被 `!hasX` 包住，玩家一旦从别处拿到 X，该场景永久不可达。", "",
    "## A 类明细", "",
    "| 级别 | 位置 | 场景 | 守卫 | 变量(来源数) | 文案 |",
    "| --- | --- | --- | --- | --- | --- |"];
  for (const h of rows) {
    out.push("| " + h.level + " | " + h.file.replace("story/", "") + ":" + h.line + " | " + (h.scene || "?")
      + " | `" + (h.cond || "-") + "` | " + (h.itemVars.map((v) => v + "(" + (sources[v] ? sources[v].size : 0) + ")").join(", ") || "-")
      + " | " + h.text.replace(/\|/g, "\\|") + " |");
  }
  out.push("", "## B 类明细", "");
  for (const s of swallow) {
    out.push("### " + s.target + "  —  守卫变量 `" + s.varName + "`（来源 " + s.srcCount + " 处）");
    if (s.desc) out.push("- 变量说明：" + s.desc);
    out.push("- 来源场景：" + (s.sources.join(" / ") || "(none)"));
    for (const e of s.edges) out.push("- 入边：" + e);
    out.push("");
  }
  const p = path.join(ROOT, "tools", "物品守卫审计报告.md");
  fs.writeFileSync(p, out.join("\n"), "utf8");
  console.log("\n报告已写入 " + p);
}

process.exit(p0 + p1 + b0 > 0 ? 1 : 0);
