// 地理结构图审计：从 story/*.js 提取场景跳转图，计算结构指标，输出 mermaid 图 + markdown 报告
//
// 用法（在项目根目录）：
//   node tools/graph_audit.mjs                # 全局总览：每文件指标表 + 死链 + 跨文件边
//   node tools/graph_audit.mjs 新达汇          # 区域详报（文件名含"新达汇"的文件合成一组）
//   node tools/graph_audit.mjs 安居苑 --labels # 边上标注选项文字
//
// 提取的边：choices.nextScene / elseScene / timeoutScene + 场景级 qte.onTimeout
// 函数型 choices/nextScene 用多个状态变体（初始/全真/全假/夜晚/全访问）调用求并集，
// 覆盖条件分支；仍可能漏极端状态下的分支，报告中已标注方法局限。
//
// 指标含义见报告末尾"指标说明"。

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "tools", "graph-report");

const args = process.argv.slice(2);
const withLabels = args.includes("--labels");
const areaArgs = args.filter((a) => !a.startsWith("--"));
const areaFilter = areaArgs[0] || null;

// ---------- 1. 从 index.html 解析脚本顺序并加载 ----------
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const files = [];
for (const m of html.matchAll(/<script src="(story\/[^"]+)"><\/script>/g)) files.push(m[1]);
if (files.length === 0) {
  console.error("!! index.html 中未找到 story 脚本");
  process.exit(1);
}

const ctx = vm.createContext({ console });
const run = (src) => vm.runInContext(src, ctx);
const fileOf = {}; // sceneId -> 定义它的文件（后定义覆盖前定义）
const snapshotKeys = () => {
  try { return run("Object.keys(storyData)"); } catch (e) { return []; } // core.js 加载前 storyData 尚不存在
};
for (const f of files) {
  const before = new Set(snapshotKeys());
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  } catch (e) {
    console.error("!! 加载失败 " + f + " : " + e.message);
  }
  for (const k of snapshotKeys()) if (!before.has(k)) fileOf[k] = f;
}

const storyData = run("storyData");
const ids = Object.keys(storyData).filter((k) => !k.startsWith("_"));
const idSet = new Set(ids);
const triggerTargets = new Set((storyData._globalTriggers || []).map((t) => t.targetScene).filter((t) => typeof t === "string"));

// ---------- 2. 状态工厂 + 变体 ----------
function mkState() {
  const s = run(
    'JSON.parse(JSON.stringify(storyData._variables, function(k,v){ return v instanceof Set ? {__set: Array.from(v)} : v; }))'
  );
  const fix = (o) => {
    if (o && typeof o === "object") {
      if (o.__set) return new Set(o.__set);
      for (const k in o) o[k] = fix(o[k]);
    }
    return o;
  };
  return fix(s);
}
function mkVariants() {
  const base = mkState();
  const t1 = mkState();
  const t2 = mkState();
  const night = mkState();
  const visit = mkState();
  const bools = (st, val) => {
    for (const k of Object.keys(st)) if (typeof st[k] === "boolean") st[k] = val;
  };
  bools(t1, true); Object.assign(t1, { strength: 10, chasedByZombies: 0, itemCount: 0, phoneBattery: 100 });
  bools(t2, false); Object.assign(t2, { strength: 1, chasedByZombies: 5, itemCount: 99, phoneBattery: 0 });
  bools(night, true); Object.assign(night, { strength: 10, hh: 23 });
  try { visit._visit = new Proxy({}, { get: () => 1 }); } catch (e) {}
  return [base, t1, t2, night, visit];
}

// ---------- 3. 提取节点 + 边 ----------
const nodes = new Map(); // id -> { choicesMax, nextKindMax, actKindMax, group }
const edges = [];        // {from,to,kind,guarded,label,dyn}
const edgeKey = new Set();
const fnErrors = [];
const posRefs = [];      // positionAfterOperation 引用（改名安全检查用）
const varAssign = new Map(); // 变量名 -> 赋值过的字符串字面量（用于解析 {_var} 动态跳转）
const noteAssign = (name, val) => {
  if (typeof val !== "string" || !val) return;
  if (!varAssign.has(name)) varAssign.set(name, new Set());
  varAssign.get(name).add(val);
};
const scanAssign = (fn) => {
  if (typeof fn !== "function") return;
  for (const m of fn.toString().matchAll(/\b(?:v|vars)\.(\w+)\s*=\s*"([^"]+)"/g)) noteAssign(m[1], m[2]);
};

function addEdge(from, to, kind, guarded, label) {
  if (typeof to !== "string" || !to) return;
  const key = from + "|" + to + "|" + kind;
  if (edgeKey.has(key)) return;
  edgeKey.add(key);
  edges.push({ from, to, kind, guarded: !!guarded, label: label || "", dyn: to.indexOf("{") >= 0 });
}
function resolveFn(v, st, sid, what) {
  if (typeof v !== "function") return v;
  try { return v(st); } catch (e) { fnErrors.push(sid + " " + what + "(): " + e.message); return null; }
}

for (const sid of ids) {
  const sc = storyData[sid];
  const group = (fileOf[sid] || "?").replace(/^story\//, "");
  nodes.set(sid, { choicesMax: 0, nextKindMax: 0, actKindMax: 0, group });

  // 静态 effect/onEnter 里的 positionAfterOperation
  const staticEffectTargets = (eff) => {
    if (eff && typeof eff === "object" && eff.set && typeof eff.set.positionAfterOperation === "string")
      posRefs.push({ scene: sid, target: eff.set.positionAfterOperation });
  };
  staticEffectTargets(sc.onEnter);
  scanAssign(sc.onEnter);

  for (const st of mkVariants()) {
    st._lastScene = sid;
    let cs = resolveFn(sc.choices, st, sid, "choices");
    if (Array.isArray(cs)) {
      if (cs.length > nodes.get(sid).choicesMax) nodes.get(sid).choicesMax = cs.length;
      let nk = 0, ak = 0;
      for (const c of cs) {
        const guarded = c.condition !== undefined || c.showCondition !== undefined;
        const label = typeof c.text === "string" ? c.text : (typeof c.text === "function" ? String(resolveFn(c.text, st, sid, "text") ?? "") : "");
        const ns = resolveFn(c.nextScene, st, sid, "nextScene");
        const es = resolveFn(c.elseScene, st, sid, "elseScene");
        const ts = resolveFn(c.timeoutScene, st, sid, "timeoutScene");
        if (typeof ns === "string") addEdge(sid, ns, "next", guarded || es !== undefined, label);
        if (typeof es === "string") addEdge(sid, es, "else", guarded, label ? "否则:" + label : "");
        if (typeof ts === "string") addEdge(sid, ts, "timeout", true, label ? "超时:" + label : "");
        if (typeof ns === "string") nk++; else ak++;
        staticEffectTargets(c.effect);
        scanAssign(c.effect);
        if (c.effect && typeof c.effect === "object" && c.effect.set)
          for (const [k, val] of Object.entries(c.effect.set)) noteAssign(k, val);
      }
      nodes.get(sid).nextKindMax = Math.max(nodes.get(sid).nextKindMax, nk);
      nodes.get(sid).actKindMax = Math.max(nodes.get(sid).actKindMax, ak);
    }
    const q = resolveFn(sc.qte, st, sid, "qte");
    if (q && typeof q.onTimeout === "string") addEdge(sid, q.onTimeout, "qte", true, "超时");
  }
}

// 变量路由解析：{_var} 动态目标 → effect/onEnter 里赋过值的场景 ID。
// 候选 ≤30 才展开（positionAfterOperation 这类 50+ 目标的全图回跳变量不展开，避免边爆炸）。
const VIA_MAX = 30;
let viaResolved = 0;
for (const e of edges) {
  if (!e.dyn) continue;
  const varName = e.to.replace(/^\{|\}$/g, "");
  const cands = varAssign.get(varName);
  if (!cands) continue;
  const vals = [...cands].filter((x) => idSet.has(x));
  if (vals.length && vals.length <= VIA_MAX) {
    e.resolved = true;
    viaResolved += vals.length;
    for (const t of vals) {
      const k2 = e.from + "|" + t + "|" + e.kind + "|via";
      if (edgeKey.has(k2)) continue;
      edgeKey.add(k2);
      edges.push({ from: e.from, to: t, kind: e.kind, guarded: e.guarded, label: e.label, dyn: false, via: varName });
    }
  }
}

// ---------- 4. 图算法（无向简单图：割点/连通块/环秩） ----------
function undirected(edgeList, nodeSet) {
  const adj = new Map();
  for (const n of nodeSet) adj.set(n, []);
  const seen = new Set();
  for (const e of edgeList) {
    if (!nodeSet.has(e.from) || !nodeSet.has(e.to) || e.from === e.to) continue;
    const k1 = e.from < e.to ? e.from + "|" + e.to : e.to + "|" + e.from;
    if (seen.has(k1)) continue;
    seen.add(k1);
    adj.get(e.from).push(e.to);
    adj.get(e.to).push(e.from);
  }
  return adj;
}
function analyze(nodeSet, edgeList) {
  const adj = undirected(edgeList, nodeSet);

  // 连通块（含成员清单）
  const visited = new Set();
  const comps = [];
  for (const n of nodeSet) {
    if (visited.has(n)) continue;
    const c = [];
    const stk = [n];
    visited.add(n);
    while (stk.length) {
      const x = stk.pop();
      c.push(x);
      for (const v of adj.get(x) || []) if (!visited.has(v)) { visited.add(v); stk.push(v); }
    }
    comps.push(c);
  }

  // 割点（Tarjan）
  const disc = new Map(), low = new Map();
  let timer = 0;
  const art = [];
  const dfs = (u, parent) => {
    disc.set(u, timer + 1);
    low.set(u, timer + 1);
    timer++;
    visited.has(u); // noop
    let children = 0;
    for (const v of adj.get(u) || []) {
      if (!disc.has(v)) {
        children++;
        dfs(v, u);
        low.set(u, Math.min(low.get(u), low.get(v)));
        if (parent === null && children > 1) art.push(u);
        if (parent !== null && low.get(v) >= disc.get(u)) art.push(u);
      } else if (v !== parent) {
        low.set(u, Math.min(low.get(u), disc.get(v)));
      }
    }
  };
  disc.clear();
  for (const n of nodeSet) if (!disc.has(n)) dfs(n, null);

  // 割点分类：真割点（脱离块 ≥2 节点 = 唯一通路结构） vs 悬挂型（只挂了单体结果节点）
  const artReal = [];
  let artPendant = 0;
  for (const u of new Set(art)) {
    const vis2 = new Set([u]);
    const sizes = [];
    const size2 = (x) => {
      vis2.add(x);
      let c = 1;
      for (const v of adj.get(x) || []) if (!vis2.has(v)) c += size2(v);
      return c;
    };
    for (const n of nodeSet) if (!vis2.has(n)) sizes.push(size2(n));
    sizes.sort((a, b) => b - a);
    const detached = sizes.slice(1);
    if ((detached[0] || 0) >= 2) artReal.push({ node: u, blocks: sizes.length + 1, maxDetach: detached[0] });
    else artPendant++;
  }

  const eSimple = Array.from(adj.values()).reduce((s, a) => s + a.length, 0) / 2;
  const cycleRank = eSimple - nodeSet.size + comps.length;
  return { comps, cycleRank, artReal, artPendant };
}

// 跨层选层模式探测：节点有 ≥3 条 next 边去往不同楼层 → 电梯/楼梯选层反模式提示
const floorToken = (s) => {
  const m = String(s).match(/B\d+(?!F)|\dF|\d+楼|屋顶|天台/);
  return m ? m[0] : null;
};
const crossFloor = (gNodes, gEdges) => {
  const out = [];
  for (const n of gNodes) {
    const f = floorToken(n);
    if (!f) continue;
    const floors = new Set();
    for (const e of gEdges) {
      if (e.from !== n || e.kind !== "next" || !gNodes.has(e.to)) continue;
      const ft = floorToken(e.to);
      if (ft && ft !== f) floors.add(ft);
    }
    if (floors.size >= 3) out.push({ node: n, floors: [...floors].sort().join("/") });
  }
  return out;
};

// ---------- 5. 分组 ----------
let groups; // [{name, files, nodes}]
if (areaFilter) {
  const gFiles = [...new Set(Object.values(fileOf))].filter((f) => path.basename(f).includes(areaFilter));
  if (gFiles.length === 0) {
    console.error('!! 没有文件名包含 "' + areaFilter + '"');
    process.exit(1);
  }
  groups = [{ name: areaFilter, files: gFiles.map((f) => f.replace(/^story\//, "")) }];
} else {
  const byFile = new Map();
  for (const [sid, info] of nodes) {
    if (!byFile.has(info.group)) byFile.set(info.group, []);
    byFile.get(info.group).push(sid);
  }
  groups = [...byFile.entries()].map(([f, ns]) => ({ name: f, files: [f], nodes: ns }));
}

// ---------- 6. 输出 ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
const esc = (s) => String(s).replace(/["'<>#\\\n\r]/g, (c) => ({ '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;", "#": "&#35;", "\\": "\\\\", "\n": " ", "\r": " " })[c]);
const trunc = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : s || "");

let report = "# 地理结构图审计报告\n\n";
report += "- 生成：`node tools/graph_audit.mjs" + (areaFilter ? " " + areaFilter : "") + (withLabels ? " --labels" : "") + "`\n";
report += "- 方法：多状态变体（初始/全真/全假/夜晚/全访问）调用函数型 choices 求并集；变量路由解析（{_var} 动态目标展开为赋值过的场景，候选≤10）；静态扫描 positionAfterOperation 引用\n";
report += "- 局限：极端状态组合下的条件分支可能漏提取；`{变量}` 插值的动态目标无法解析为具体场景\n\n";

for (const g of groups) {
  const gNodes = new Set([...nodes.entries()].filter(([, info]) => g.files.includes(info.group)).map(([sid]) => sid));
  const gEdges = edges.filter((e) => gNodes.has(e.from) && !(e.dyn && e.resolved));
  const inner = gEdges.filter((e) => gNodes.has(e.to));
  const outE = gEdges.filter((e) => !gNodes.has(e.to));
  const inE = edges.filter((e) => !gNodes.has(e.from) && gNodes.has(e.to));
  const { comps, cycleRank, artReal, artPendant } = analyze(gNodes, gEdges);

  // 出度（按不同目标去重）
  const outTargets = new Map();
  for (const e of gEdges) {
    if (!outTargets.has(e.from)) outTargets.set(e.from, new Set());
    outTargets.get(e.from).add(e.to);
  }
  const deadEnds = [...gNodes].filter((n) => !outTargets.get(n) && !n.startsWith("结局-"));

  // 单出口分类：结果型（单边返回父节点，父节点也链回它）vs 非回路型（需检查）
  const dirEdge = new Set(gEdges.filter((e) => gNodes.has(e.to)).map((e) => e.from + "|" + e.to));
  const oneWayAll = [...gNodes].filter((n) => outTargets.get(n) && outTargets.get(n).size === 1 && !n.startsWith("结局-"));
  const oneWayPair = oneWayAll.filter((n) => {
    const t = [...outTargets.get(n)][0];
    return dirEdge.has(t + "|" + n);
  });
  const oneWayOdd = oneWayAll.filter((n) => !oneWayPair.includes(n));

  const manyChoices = [...gNodes].filter((n) => nodes.get(n).choicesMax >= 6).sort((a, b) => nodes.get(b).choicesMax - nodes.get(a).choicesMax);
  const mixed = [...gNodes].filter((n) => nodes.get(n).nextKindMax >= 3 && nodes.get(n).actKindMax >= 3);
  const xf = crossFloor(gNodes, gEdges);
  const dangling = inner.filter((e) => !idSet.has(e.to) && !e.dyn).map((e) => e.from + " → " + e.to);
  const dynTargets = inner.filter((e) => e.dyn && !e.resolved).map((e) => e.from + " → " + e.to);
  const gPosRefs = posRefs.filter((r) => gNodes.has(r.scene) && !idSet.has(r.target));
  const smallComps = comps.filter((c) => c.length !== Math.max(...comps.map((x) => x.length)));

  report += "\n---\n\n## " + g.name + "（" + g.files.join(" + ") + "）\n\n";
  report += "| 指标 | 值 | 提示 |\n|---|---|---|\n";
  report += `| 场景数 | ${gNodes.size} | |\n`;
  report += `| 内部边 | ${inner.length} | |\n`;
  report += `| 连通块 | ${comps.length} | >1 说明有互不连通的孤岛 |\n`;
  report += `| 环路数（环秩） | ${cycleRank} | 0=纯树形（无环），街区级核心区建议 ≥2 |\n`;
  report += `| 真割点（断开≥2节点块） | ${artReal.length} | 唯一通路结构，多=链形偏向 |\n`;
  report += `| 悬挂型割点（仅挂结果节点） | ${artPendant} | 正常模式，不计问题 |\n`;
  report += `| 死胡同（无出边非结局） | ${deadEnds.length} | 应为 0 |\n`;
  report += `| 单出口·结果型（返回父节点） | ${oneWayPair.length} | 正常模式 |\n`;
  report += `| 单出口·非回路型 | ${oneWayOdd.length} | 需检查 |\n`;
  report += `| 选项数 ≥6 的节点 | ${manyChoices.length} | 建议拆分 |\n`;
  report += `| 路由/内容混合节点 | ${mixed.length} | 移动≥3 且 动作≥3，建议拆分 |\n`;
  report += `| 跨层选层模式节点 | ${xf.length} | 一节点直达≥3个楼层，应改为逐层/楼梯节点 |\n`;
  report += `| 出边（去外部） | ${outE.length} | |\n`;
  report += `| 入边（从外部来） | ${inE.length} | |\n`;
  report += `| 死链 | ${dangling.length} | 目标场景不存在 |\n`;

  const section = (title, arr, fmt) => {
    if (!arr.length) return;
    report += "\n### " + title + "\n";
    arr.forEach((x) => (report += "- " + (fmt ? fmt(x) : x) + "\n"));
  };
  section("真割点（唯一通路，脱离块最大规模）", artReal.sort((a, b) => b.maxDetach - a.maxDetach), (x) => "**" + x.node + "** → 脱离 " + x.maxDetach + " 节点（共 " + x.blocks + " 块）");
  section("孤岛（非最大连通块）", smallComps, (c) => {
    const note = c.every((n) => triggerTargets.has(n)) ? " ※全组经全局触发器进入，非孤岛" : "";
    return c.sort().join("、") + "（" + c.length + " 节点）" + note;
  });
  section("死胡同（无出边且非结局）", deadEnds);
  section("单出口·非回路型（需检查）", oneWayOdd);
  section("选项数 ≥6 的节点", manyChoices, (n) => n + "（" + nodes.get(n).choicesMax + " 个选项）");
  section("跨层选层模式节点", xf, (x) => x.node + " → 直达楼层：" + x.floors);
  section("路由/内容混合节点", mixed);
  section("死链", [...new Set(dangling)]);
  section("动态目标（含{变量}，未解析）", [...new Set(dynTargets)]);
  section("positionAfterOperation 指向不存在场景", gPosRefs, (r) => r.scene + " → " + r.target);

  // mermaid
  const idMap = new Map();
  const mid = (s) => {
    if (!idMap.has(s)) idMap.set(s, "n" + idMap.size);
    return idMap.get(s);
  };
  let mm = "flowchart LR\n";
  for (const n of gNodes) mm += `  ${mid(n)}["${esc(n)}"]\n`;
  const outside = [...new Set(outE.map((e) => e.to))];
  for (const o of outside) mm += `  ${mid(o)}["↔${esc(trunc(o, 14))}"]:::ext\n`;
  for (const e of inner) {
    const arrow = e.kind === "next" ? "-->" : "-.->";
    const lbl = withLabels && e.label ? `|"${esc(trunc(e.label, 14))}"` : "";
    mm += `  ${mid(e.from)} ${arrow}${lbl}${lbl ? "|" : ""} ${mid(e.to)}\n`;
  }
  mm += "  classDef ext fill:#555,color:#ccc;\n";
  const safeName = g.name.replace(/[\\/:*?"<>|]/g, "_");
  fs.writeFileSync(path.join(OUT_DIR, safeName + ".mmd"), mm, "utf8");
  report += "\n### 结构图\n\n```mermaid\n" + mm + "```\n";
}

// 全局补充：跨文件边（仅总览模式）
if (!areaFilter) {
  const cross = edges.filter((e) => nodes.has(e.from) && nodes.has(e.to) && nodes.get(e.from).group !== nodes.get(e.to).group);
  report += "\n---\n\n## 跨文件边（" + cross.length + " 条）\n\n";
  for (const e of cross) report += `- ${e.from}（${nodes.get(e.from).group}）→ ${e.to}（${nodes.get(e.to).group}）\n`;
  const trig = storyData._globalTriggers || [];
  const trigDangling = trig.filter((t) => typeof t.targetScene === "string" && !idSet.has(t.targetScene));
  if (trigDangling.length) {
    report += "\n## 全局触发器死链\n\n";
    trigDangling.forEach((t) => (report += "- " + t.condition + " → " + t.targetScene + "\n"));
  }
}

report += `\n---\n\n## 指标说明\n
- **环路数（环秩）** = 内部边数 − 节点数 + 连通块数。0 表示纯树（任意两点仅一条路径），放射形/链形都是 0。核心开放区建议 ≥2，房间级允许小值。
- **真割点**：删掉后分离出 ≥2 节点块，意味着"绕不过去的唯一通路"。真实建筑的门/楼梯间天然是割点，属正常；走廊中部也是真割点则说明结构太线性。只挂单体结果节点的"悬挂型割点"不计。
- **孤岛**：与主体不连通的场景组，玩家走不到（或只能从外部进入），通常是残留节点或漏接边。
- **死胡同**：没有任何出边的非结局节点，玩家会卡死，必须为 0。
- **单出口·结果型**：动作结果节点单边返回父节点，正常。**非回路型**单出口需检查是否漏接边。
- **跨层选层模式**：一个节点有 ≥3 条边直达不同楼层（"进楼梯间选楼层"反模式）。除非楼层 ≤3 且楼梯间无剧情，应改为逐层楼梯节点。中庭/广场类节点直达多层属空间合理，酌情判断。
- **路由/内容混合节点**：≥3 个移动选项且 ≥3 个动作选项，应拆成"路由节点+内容节点"。
- **虚线边**：条件分支（else/timeout/qte）。\n`;

const outFile = path.join(OUT_DIR, (areaFilter || "总览") + ".md");
fs.writeFileSync(outFile, report, "utf8");
console.log("OK nodes=" + nodes.size + " edges=" + edges.length + " viaResolved=" + viaResolved + " fnErrors=" + fnErrors.length);
if (fnErrors.length) [...new Set(fnErrors)].slice(0, 10).forEach((e) => console.log("  fnErr: " + e));
console.log("report -> " + path.relative(ROOT, outFile));
groups.forEach((g) => console.log("group: " + g.name + " (" + g.files.join(",") + ")"));
