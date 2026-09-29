// 多入口进入描述审计（entry-description audit）
//
// 目标：找出「可被多次/从多个节点进入，却只有第一次进入的描述」的剧情 bug。
// 典型形态："你推门走进xxx" / "你进入xxx" / "你来到了xxx" —— 玩家第二次从不同来源
// 到达同一场景时，开头仍然播"推门走进"，与刚刚发生的实际动作冲突。
//
// 两类问题：
//   A. 场景内部子节点回环：房间 A → 子节点 A-桌子 → 返回 A，此时 A 仍播"你推门走进房间"。
//   B. 多场景互跳：商场 1F 可从扶梯/直梯/楼梯/外街四个来源到达，描述却固定为其中一种。
//      尤须注意相对性表述：中间操作（"打开门""拧开把手"）与方位词（"右侧""尽头"）。
//
// 方法（这个是"候选生成器"，不是判定器）：
//   1. 从 index.html 加载全部 story/*.js，按初始/全真/全假/夜晚/全访问五种状态变体
//      调用函数型 choices，求全部跳转边的**并集**（复用 graph_audit 的思路）。
//   2. 建反向图，统计每个节点的入度（来源去重）。
//   3. 对每个入度 ≥2 的节点，把它**每个来源**分别代入 `vars._lastScene` 求一次 text，
//      抽首句做指纹；不同来源指纹相同、且该指纹命中"进入类/到达类/方位类"词表的，列为候选。
//   4. 交叉静态源码：该场景定义块里是否已出现 `_lastScene` / `_visit` 差异化写法。
//
// 局限（必须人工复核，别直接当结论用）：
//   - 多数跳是动态拼接的，静态 + 五变体穷举不全，入度可能被低估（不会高估）。
//   - "指纹相同"未必是 bug：有些句子本身与来源无关（"你环顾四周"），词表已尽量剔除，
//     但仍有误判，报告里每条都附了原文与实际来源清单，靠人眼收口。
//   - "整理整理"（restTidy）是全局通用回跳 mechanism，单独标注，不算候选来源。
//
// 用法：
//   node tools/entry_desc_audit.mjs                 # 全图概览（按文件统计）
//   node tools/entry_desc_audit.mjs 仁济            # 区域详报（文件名包含"仁济"）
//   node tools/entry_desc_audit.mjs 张江 --min=3    # 只看入度≥3 的节点
//   node tools/entry_desc_audit.mjs --all           # 全量明细（很长）

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "tools");

const args = process.argv.slice(2);
const flagAll = args.includes("--all");
const minArg = args.find((a) => a.startsWith("--min="));
const MIN_IN = minArg ? parseInt(minArg.slice(6), 10) || 2 : 2;
const area = args.filter((a) => !a.startsWith("--"))[0] || null;

// ---------- 1. 加载 story ----------
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const files = [];
for (const m of html.matchAll(/<script src="(story\/[^"]+)"><\/script>/g)) files.push(m[1]);
if (!files.length) { console.error("!! index.html 未找到 story 脚本"); process.exit(1); }

const ctx = vm.createContext({ console, flashStatusWarning: () => {}, triggerShake: () => {} });
const run = (src) => vm.runInContext(src, ctx);
const fileOf = {};
const snap = () => { try { return run("Object.keys(storyData)"); } catch (e) { return []; } };
for (const f of files) {
  const before = new Set(snap());
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); }
  catch (e) { console.error("!! 加载失败 " + f + ": " + e.message); }
  for (const k of snap()) if (!before.has(k)) fileOf[k] = f;
}
const storyData = run("storyData");
const ids = Object.keys(storyData).filter((k) => !k.startsWith("_"));
const idSet = new Set(ids);

// ---------- 2. 状态变体 ----------
function mkState() {
  const s = run('JSON.parse(JSON.stringify(storyData._variables, function(k,v){ return v instanceof Set ? {__set: Array.from(v)} : v; }))');
  const fix = (o) => { if (o && typeof o === "object") { if (o.__set) return new Set(o.__set); for (const k in o) o[k] = fix(o[k]); } return o; };
  return fix(s);
}
function mkVariants() {
  const base = mkState();
  const t1 = mkState(); const t2 = mkState(); const night = mkState(); const visit = mkState();
  const bools = (st, val) => { for (const k of Object.keys(st)) if (typeof st[k] === "boolean") st[k] = val; };
  bools(t1, true); Object.assign(t1, { strength: 10, chasedByZombies: 0, itemCount: 0 });
  bools(t2, false); Object.assign(t2, { strength: 1, chasedByZombies: 5, itemCount: 9 });
  bools(night, true); Object.assign(night, { strength: 10, hh: 23 });
  try { visit._visit = new Proxy({}, { get: () => 1 }); } catch (e) {}
  return [base, t1, t2, night, visit];
}
const VARIANTS = mkVariants();

// ---------- 3. 提取边（正图 + 反图）----------
const inMap = new Map();  // target -> Map(source -> Set(kind))
const outTargets = new Map();
const addEdge = (from, to, kind) => {
  if (typeof to !== "string" || !to || to.indexOf("{") >= 0) return;
  if (!inMap.has(to)) inMap.set(to, new Map());
  if (!inMap.get(to).has(from)) inMap.get(to).set(from, new Set());
  inMap.get(to).get(from).add(kind);
  if (!outTargets.has(from)) outTargets.set(from, new Set());
  outTargets.get(from).add(to);
};
const res = (v, st) => { if (typeof v !== "function") return v; try { return v(st); } catch (e) { return null; } };

// ⚠「返回上一个场景」型动态跳过滤（2026-09-29 踩坑）
// 变体里必须注入 `st._lastScene = sid`（否则 text 的分支求不全），但这样一来
// `nextScene: function(vars){ return vars._lastScene || "X" }`（hideOnLocation 等工厂的收尾选项）
// 就会返回 sid 自身 → 每个躲藏/临时节点都被记一条自环边 → 凭空冒出一批假 P0。
// 解法：用哨兵值二次探测，凡原样吐回 _lastScene 的一律不算确定的入边（它只是回到来路）。
const PROBE_LAST = "__PROBE_LAST_SCENE__";
const isReturnPrev = (fn, st) => {
  if (typeof fn !== "function") return false;
  try { return fn(Object.assign({}, st, { _lastScene: PROBE_LAST })) === PROBE_LAST; } catch (e) { return false; }
};

for (const sid of ids) {
  const sc = storyData[sid];
  for (const st of VARIANTS) {
    st._lastScene = sid;
    let cs = res(sc.choices, st);
    if (Array.isArray(cs)) for (const c of cs) {
      for (const k of ["nextScene", "elseScene", "timeoutScene"]) {
        const raw = c[k];
        const t = res(raw, st);
        if (typeof t !== "string") continue;
        if (isReturnPrev(raw, st)) continue; // 动态「返回来路」，不产生确定的入边
        addEdge(sid, t, k);
      }
    }
    const q = res(sc.qte, st);
    if (q && typeof q === "object") {
      for (const k of ["onTimeout", "onSuccess", "onFail"]) if (typeof q[k] === "string") addEdge(sid, q[k], "qte." + k);
    }
  }
}
for (const t of (storyData._globalTriggers || [])) if (typeof t.targetScene === "string") addEdge("《全局触发器》", t.targetScene, "trigger");

// ---------- 4. 源码切片（判定该场景是否已做 _lastScene / _visit 差异化）----------
const fileSlice = new Map(); // file -> Map(key -> {start,end,src})
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const lasts = new Map();
  const re = /^[ \t]{2}["']([^"']+)["']\s*:\s*\{/gm;
  let m; const hits = [];
  while ((m = re.exec(src))) hits.push({ key: m[1], start: m.index, end: re.lastIndex });
  const map = new Map();
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const bounds = i + 1 < hits.length ? hits[i + 1].start : src.length;
    if (!map.has(h.key)) map.set(h.key, { start: h.start, end: bounds, src: src.slice(h.start, bounds) });
  }
  fileSlice.set(f, map);
}
const sceneSrcOf = (sid) => (fileSlice.get(fileOf[sid]) || new Map()).get(sid)?.src || "";

// ---------- 5. 入口式/相对性表述词表 ----------
// 强入口动词：描述"从外面跨过一道界限"的动作，重复进入必然打架
const STRONG_ENTRY = /推[门开]|推开门|拉开门|打开门|推开|拉开|掀开|拧开|扒开|撬开|钻进|挤进|爬进|翻进|溜进|迈入|迈过|踏入|踏进|跨进|跨过|跨入|步入|走进|进入|进去|进去|踮脚|蹲下|弯腰|俯身|猫腰|爬上|爬下|登上|甩门|夺门|闪身进入|窜进|走出来|爬出来/;
// 到达/落位类：次之，多数场景变化要考虑（"你来到X"若从内部子节点返回就错）
const ARRIVAL = /你来到|你回到|你到了|你抵达|你站到|你走进|你走到|你到达|你步入|你又来到|你再次来到|你回到了|你返回|你重新/;
// 相对方位词：来源不同，"右边/尽头/对面"指的可能不是同一个东西
const DIRECTION = /左手边|右手边|左侧|右侧|左边|右边|两侧|尽头|对面|前方|正前方|身后|背后|眼前|左手|右手/;
// 首次/初次限定词：同一句被重复播时会自相矛盾
const FIRSTONLY = /第一次|头一回|初次|刚进门|一进门|一把推开|下意识/;

const stripHtml = (s) => String(s).replace(/<[^>]*>/g, "").replace(/\{[^}]*\}/g, "…");
const norm = (s) => stripHtml(s).replace(/[\s"“”.。，,、！？!?：:—…·]/g, "").slice(0, 40);
const firstSentence = (s) => {
  const t = stripHtml(s);
  const m = t.match(/^[\s\S]{0,50}?[。！？\n]/);
  return (m ? m[0] : t.slice(0, 46)).trim();
};

const tagOf = (h) => {
  const t = stripHtml(h);
  const tags = [];
  if (STRONG_ENTRY.test(t)) tags.push("入口动词");
  if (ARRIVAL.test(t)) tags.push("到达");
  if (DIRECTION.test(t)) tags.push("方位");
  if (FIRSTONLY.test(t)) tags.push("首次限定");
  return tags;
};

// ---------- 6. 逐节点分析 ----------
function headsFor(sid) {
  const sc = storyData[sid];
  if (sc.text === undefined) return null;
  const out = [];
  for (const st of VARIANTS) {
    // fresh copy per call（text 可能有副作用）
    let t;
    try { t = typeof sc.text === "function" ? sc.text(st) : sc.text; } catch (e) { continue; }
    if (Array.isArray(t)) t = t[0];
    if (typeof t === "string") out.push(firstSentence(t));
  }
  return [...new Set(out)];
}
function headsFrom(sid, lastScene) {
  const sc = storyData[sid];
  if (sc.text === undefined) return [];
  const out = [];
  for (const i in VARIANTS) {
    const st = mkState();
    Object.assign(st, VARIANTS[i]);
    st._lastScene = lastScene;
    let t;
    try { t = typeof sc.text === "function" ? sc.text(st) : sc.text; } catch (e) { continue; }
    if (Array.isArray(t)) t = t[0];
    if (typeof t === "string") out.push(firstSentence(t));
  }
  return [...new Set(out)];
}

const rows = [];
for (const sid of ids) {
  const hasText = storyData[sid] && storyData[sid].text !== undefined;
  if (!hasText) continue;
  const inMapSid = inMap.get(sid);
  if (!inMapSid) continue;
  const sources = [...inMapSid.keys()];
  // 有效入度：排除"整理整理"通用回跳机制（单独标注）
  const tidySources = sources.filter((s) => s === "整理整理");
  const realSources = sources.filter((s) => s !== "整理整理" && s !== "《全局触发器》");
  const effective0 = new Set([...realSources, ...(tidySources.length ? ["整理整理"] : [])]);
  if (effective0.size < MIN_IN) continue;

  const rawSrc = sceneSrcOf(sid);
  // 精确判定「某来源有没有被文案差异化」：把 nextScene/elseScene 跳转行删掉后，
  // 在该场景源码里搜来源名字符串。差异化写法必然形如 vars._lastScene === "来源"，
  // 所以搜不到 = 这个入口一定落进默认分支（ fuzzy：变量名拼接的极少数写法会漏）。
  const srcNoJump = rawSrc.replace(/(nextScene|elseScene|timeoutScene|positionAfterOperation)[^\n]*/g, "");
  // ⚠必须在**剔除跳转行之后**的文本里搜：nextScene:"子场景" 里也会出现来源名，
  // 用它判定会把大量未差异化节点误判为"已覆盖"（2026-09-29 踩过）。
  const coveredBy = (s) => srcNoJump.includes(s);
  const diffed = /_lastScene/.test(rawSrc) || /_visit\s*[\[.]/.test(rawSrc);

  const effective = [...effective0];
  const uncovered = effective.filter((s) => s !== "整理整理" && !coveredBy(s));

  // 不同来源下实际会播出的首句（把来源代入 _lastScene 求值）
  const headBySrc = new Map();
  for (const s of effective) for (const h of headsFrom(sid, s)) {
    if (!headBySrc.has(s)) headBySrc.set(s, []);
    headBySrc.get(s).push(h);
  }
  const allHeads = [...new Set([...headBySrc.values()].flat())];

  // 命中标签：任一分支首句含入口式表述
  const hits = allHeads.map((h) => ({ h, tags: tagOf(h) })).filter((x) => x.tags.length);
  if (!hits.length) continue;

  // 未被文案覆盖的来源 → 各自会落到哪句默认描述
  const uncoveredDetail = uncovered.map((s) => ({ src: s, heads: headBySrc.get(s) || [] }));
  const badGroup = uncoveredDetail.filter((d) => d.heads.some((h) => tagOf(h).length));
  if (!badGroup.length) continue;

  // 共用同一句（默认句）的未覆盖来源
  const keyOf = (h) => norm(h);
  const share = new Map();
  for (const d of badGroup) for (const h of d.heads) {
    if (!tagOf(h).length) continue;
    const k = keyOf(h);
    if (!share.has(k)) share.set(k, { head: h, srcs: new Set() });
    share.get(k).srcs.add(d.src);
  }
  // 父子回环：来源是本场景的子节点（ID 前缀相同）
  const isChild = (s) => s.startsWith(sid + "-") || s.startsWith(sid + "（");
  const childBack = uncovered.filter(isChild);
  const selfLoop = uncovered.includes(sid);

  // 定级：P0=子节点/自环返回却播进门句（必错）；P1=多个未覆盖来源共用到达句；P2=单个
  let level = "P2";
  if (childBack.length || selfLoop) level = "P0";
  else if ([...share.values()].some((s) => s.srcs.size >= 2)) level = "P1";

  rows.push({
    sid, group: (fileOf[sid] || "?").replace(/^story\//, "").replace(/\.js$/, ""),
    indeg: effective.length, sources: [...effective], childBack, selfLoop, level,
    diffed, heads: allHeads, hits, uncovered, uncoveredDetail, badGroup, share: [...share.values()],
  });
}

// ---------- 7. 输出 ----------
const L = [];
const filesOfInterest = area ? [...new Set(Object.values(fileOf))].filter((f) => f.includes(area)) : null;
const G = (r) => (!filesOfInterest ? true : filesOfInterest.includes(fileOf[r.sid]));
const LV = { P0: 0, P1: 1, P2: 2 };
const shown = rows.filter(G).sort((a, b) => LV[a.level] - LV[b.level] || b.indeg - a.indeg || a.sid.localeCompare(b.sid));

const stat = new Map();
for (const r of rows) {
  if (!stat.has(r.group)) stat.set(r.group, { n: 0, c: 0, p0: 0, p1: 0, p2: 0 });
  const v = stat.get(r.group); v.c++; v["p" + (r.level === "P0" ? 0 : r.level === "P1" ? 1 : 2)]++;
}
for (const sid of ids) { const g = (fileOf[sid] || "?").replace(/^story\//, "").replace(/\.js$/, ""); if (!stat.has(g)) stat.set(g, { n: 0, c: 0, p0: 0, p1: 0, p2: 0 }); stat.get(g).n++; }
const statSorted = [...stat.entries()].sort((a, b) => b[1].p0 - a[1].p0 || b[1].p1 - a[1].p1 || b[1].c - a[1].c);
statSorted.forEach(([g, v]) => L.push(`| ${g} | ${v.n} | ${v.c} | ${v.p0} | ${v.p1} | ${v.p2} |`));
console.log("概览（场景数 / 候选 / P0 / P1 / P2）：");
statSorted.forEach(([g, v]) => console.log("  " + g + ": " + v.n + " / " + v.c + " / " + v.p0 + " / " + v.p1 + " / " + v.p2));

L.push("# 多入口进入描述审计" + (area ? " · " + area : " · 全图概览"), "");
L.push("- 生成：`node tools/entry_desc_audit.mjs " + (area || "") + " --min=" + MIN_IN + "`");
L.push("- 方法：五状态变体求跳转并集 → 反图 → 把**每个来源**代入 `vars._lastScene` 求一次 text 首句 → 剔除目标场景源码里出现过的来源名（已差异化）→ 剩下的「未呼应入口」若落在含入口/到达/方位词的句子上，列为候选");
L.push("- ⚠这是**候选生成器**，不是判定器。每条都要人眼收口：与来源无关的通用描述（如“你环顾四周”）对任何入口都成立，属正常。", "");
L.push("## 按文件统计", "", "| 文件 | 场景数 | 候选 | P0 | P1 | P2 |", "|---|---|---|---|---|---|");
L.push('- **P0**：存在「子节点返回/自环」却仍播进门句 —— 房间 A → 子动作 → 回 A，A 又播一次进 A 的描述。几乎必错。');
L.push("- **P2**：单个未覆盖来源落在含到达/方位描述的分句上，需人眼确认是否真的违和。", "");

L.push("", "## 候选明细（P0 → P2 排序）", "");
for (const r of shown) {
  L.push("", "### [" + r.level + "] `" + r.sid + "`", "");
  L.push("- 文件：" + r.group + "　总入度：" + r.indeg + "　未呼应入口：" + r.uncovered.length + (r.diffed ? "（已写差异化，但**没覆盖下面这些来源**）" : "（**完全没写 _lastScene 分支**）"));
  const fmt = (s) => (s === "整理整理" ? "`整理整理`(通用)" : s.startsWith(r.sid + "-") || s.startsWith(r.sid + "（") ? "**" + s + "**(子)" : s);
  L.push("- 未呼应来源：" + r.uncovered.map(fmt).join("、"));
  const coveredSrc = r.sources.filter((s) => !r.uncovered.includes(s));
  if (coveredSrc.length) L.push("- 已呼应来源：" + coveredSrc.map(fmt).join("、"));
  L.push("- 落到这些入口会播出的首句：");
  for (const d of r.badGroup) {
    for (const h of d.heads) {
      const tags = tagOf(h);
      L.push("  - " + (tags.length ? "`" + tags.join("/") + "` " : "") + stripHtml(h).slice(0, 70) + "　⟵ " + fmt(d.src));
    }
  }
  if (r.share.length) {
    L.push("- 共用同一句：" + r.share.map((s) => "[" + [...s.srcs].map(fmt).join("｜") + "]").join(" "));
  }
}

// --json：给下游脚本/人工分形态用的结构化结果（含 selfLoop/childBack/diffed 判定字段）
if (args.includes("--json")) {
  fs.writeFileSync(
    path.join(OUT_DIR, "entry-desc" + (area ? "-" + area : "") + ".json"),
    JSON.stringify(shown.map((r) => ({
      sid: r.sid, group: r.group, level: r.level, indeg: r.indeg, diffed: r.diffed,
      selfLoop: r.selfLoop, childBack: r.childBack, uncovered: r.uncovered, sources: r.sources,
      heads: [...new Set(r.badGroup.flatMap((d) => d.heads))].map((h) => stripHtml(h)),
      srcHeadsBy: Object.fromEntries(r.badGroup.map((d) => [d.src, d.heads.map((h) => stripHtml(h))])),
    })), null, 1), "utf8");
}

const outName = "entry-desc-report" + (area ? "-" + area : "") + ".md";
fs.writeFileSync(path.join(OUT_DIR, outName), L.join("\n") + "\n", "utf8");
console.log("候选节点 " + shown.length + " / 总场景 " + ids.length + (area ? " · 区域 " + area : ""));
console.log("概览：");
[...stat.entries()].sort((a, b) => b[1].c - a[1].c).slice(0, 12).forEach(([g, v]) => console.log("  " + g + ": " + v.c + "/" + v.n));
console.log("report -> tools/" + outName);
