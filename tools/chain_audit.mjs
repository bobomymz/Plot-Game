// 解密链/物品经济盘点（puzzle-chain-design skill 的配套工具）
//
// 用法：node tools/chain_audit.mjs            # 全图
//       node tools/chain_audit.mjs 建平        # 只看文件名含"建平"的文件（引用计数仍是全图）
// 输出：tools/chain-report.md + 控制台摘要
//
// 回答三个问题：
//   1. 每个 hasXxx 物品：在哪拾取 / 在哪被移除 / 被多少场景引用（复用潜力）
//   2. 每个文件引入多少占背包新物品（≤10 预算检查）
//   3. 哪些物品只有拾取没有引用（死道具）/ 定义了却没实装
//
// 局限（够用即可，别加复杂度）：静态分析函数源码，`hasXxx` 出现在字符串/注释里也会计数；
// 拾取方向靠 `: true` / `= true` 判定，动态拼接的赋值抓不到（人工核对备注列）。

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const areaFilter = process.argv.slice(2).filter((a) => !a.startsWith("--"))[0] || null;

// ---------- 1. 加载（同 lint_story：按 index.html 顺序，记场景→文件归属） ----------
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const files = [];
for (const m of html.matchAll(/<script src="(story\/[^"]+)"><\/script>/g)) files.push(m[1]);
const ctx = vm.createContext({ console, flashStatusWarning: () => {}, triggerShake: () => {} });
const run = (src) => vm.runInContext(src, ctx);
const fileOf = {};
const snap = () => { try { return run("Object.keys(storyData)"); } catch (e) { return []; } };
for (const f of files) {
  const before = new Set(snap());
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); } catch (e) { console.error("!! 加载失败 " + f + ": " + e.message); }
  for (const k of snap()) if (!before.has(k)) fileOf[k] = f;
}
const storyData = run("storyData");
const ids = Object.keys(storyData).filter((k) => !k.startsWith("_"));
const vars = run("storyData._variables");
// 已注册 = _variables ∪ computed（hasNoTransportation 等 computed 不是未注册）
const computedKeys = new Set(Object.keys((run("storyData._reactive") || {}).computed || {}));
const reg = new Set([...Object.keys(vars), ...computedKeys]);

// ---------- 2. 收集每个场景的可扫描源码 ----------
// 两条腿：函数源码 toString（抓动态写法）+ 用基础状态求值（抓 updateTime(N,{...}) 闭包参数——
// 全项目通用写法，effect 是 updateTime 返回的函数，拾取对象在闭包里，toString 看不见）
function baseState() {
  const s = run('JSON.parse(JSON.stringify(storyData._variables, function(k,v){ return v instanceof Set ? {__set: Array.from(v)} : v; }))');
  const fix = (o) => { if (o && typeof o === "object") { if (o.__set) return new Set(o.__set); for (const k in o) o[k] = fix(o[k]); } return o; };
  fix(s);
  try { s._visit = new Proxy({}, { get: () => 1 }); } catch (e) {}
  return s;
}
function sceneSources(sc) {
  const srcs = [];
  const st = baseState();
  const safe = (fn) => { try { return fn(st); } catch (e) { return null; } };
  const push = (v) => {
    if (typeof v === "function") srcs.push(v.toString());
    else if (v && typeof v === "object") srcs.push(JSON.stringify(v));
    else if (typeof v === "string") srcs.push(v); // condition/showCondition 表达式
  };
  push(sc.onEnter);
  if (typeof sc.onEnter === "function") { const r = safe(sc.onEnter); if (r && typeof r === "object") srcs.push(JSON.stringify(r)); }
  push(sc.qte);
  push(sc.text);
  let cs = sc.choices;
  if (typeof cs === "function") { const r = safe(cs); if (Array.isArray(r)) cs = r; else push(sc.choices); }
  if (Array.isArray(cs)) cs.forEach((c) => {
    let eff = c.effect;
    if (typeof eff === "function") { const r = safe(eff); if (r && typeof r === "object") eff = r; }
    push(eff);
    push(c.condition); push(c.showCondition); push(c.text); push(c.nextScene); push(c.elseScene);
  });
  else if (cs) push(cs); // 函数型 choices 求值失败时整体扫源码
  return srcs.filter(Boolean);
}

// 已注册 hasXxx ∪ 全图源码中出现的 hasXxx（后者单独报告：未注册）
// computed 键不算物品（hasFood/hasNoTransportation 是派生函数包装，永远没有"拾取点"）
const items = new Set(Object.keys(vars).filter((k) => /^has[A-Z]/.test(k) && !computedKeys.has(k)));
const sceneSrc = {}; // sid -> [sources]
for (const sid of ids) {
  const ss = sceneSources(storyData[sid]);
  sceneSrc[sid] = ss;
  // (?!\() 排除函数调用：hasMeleeWeapon(vars) 是 utils 全局函数不是变量
  for (const s of ss) for (const m of s.matchAll(/\bhas[A-Z]\w*(?!\()\b/g)) items.add(m[0]);
}

// ---------- 3. 逐物品记账 ----------
// 不占背包的既有模式（与 lint_story 的豁免正则保持一致 + 已知交通工具）
const NO_BAG = /Bag|Transport|Backpack|Schoolbag|FireTorch|^hasCar$|^hasEbike$|^hasRustyBike$/;
const rows = [];
for (const item of [...items].sort()) {
  if (computedKeys.has(item)) continue; // computed 是派生包装（hasFood/hasNoTransportation），不是物品
  const acq = [], rem = [], ref = [];
  let bagEvidence = NO_BAG.test(item) ? "no" : null; // no=明确不占 / yes=见过 itemCount 配对 / null=待定
  for (const sid of ids) {
    const file = path.basename(fileOf[sid] || "?");
    for (const s of sceneSrc[sid]) {
      // ["']? 兼容 JSON.stringify 的 "hasXxx":true（静态 effect/onEnter 对象）
      const acqRe = new RegExp("\\b" + item + "[\"']?\\s*(:|=>)\\s*[\"']?\\s*true\\b|\\bvars\\." + item + "\\s*=\\s*true\\b");
      const remRe = new RegExp("\\b" + item + "[\"']?\\s*(:|=>)\\s*[\"']?\\s*false\\b|\\bvars\\." + item + "\\s*=\\s*false\\b");
      const hit = (re) => { re.lastIndex = 0; return re.test(s); };
      if (hit(acqRe)) {
        acq.push(file.replace(".js", "") + "/" + sid);
        if (bagEvidence === null && /itemCount/.test(s)) bagEvidence = "yes";
      }
      if (hit(remRe)) rem.push(file.replace(".js", "") + "/" + sid);
      if (new RegExp("\\b" + item + "\\b").test(s)) ref.push(file.replace(".js", "") + "/" + sid);
    }
  }
  const u = (a) => [...new Set(a)];
  // 非布尔 hasXxx（如 hasInnerLining 计数器）：拾取靠 add:{hasX:1}，":true" 抓不到，标类型人工核对
  const counterType = typeof vars[item] !== "boolean" ? `计数型(初始${JSON.stringify(vars[item])})` : null;
  rows.push({ item, bag: bagEvidence === "no" ? "否" : bagEvidence === "yes" ? "占" : "?", acq: u(acq), rem: u(rem), ref: u(ref), registered: reg.has(item), counterType });
}

// ---------- 4. 每文件新物品预算（物品的全部拾取点都在同一文件 → 该文件"独占引入"） ----------
const byFile = {};
for (const r of rows) {
  if (!r.acq.length || r.bag !== "占") continue;
  const fs_ = [...new Set(r.acq.map((a) => a.split("/")[0]))];
  if (fs_.length === 1) byFile[fs_[0]] = (byFile[fs_[0]] || 0) + 1;
}

// ---------- 5. 输出 ----------
const F = areaFilter ? (r) => r.acq.some((a) => a.startsWith(areaFilter)) || r.ref.some((a) => a.startsWith(areaFilter)) : () => true;
const shown = rows.filter(F);
const L = [];
L.push(`# 解密链/物品盘点 ${areaFilter ? "· " + areaFilter : "· 全图"}`, "");
L.push("## 物品矩阵（拾取/移除/引用；引用=出现过的场景，含守卫与文案）", "",
  "| 物品 | 占包 | 拾取点 | 移除点 | 引用场景数 | 备注 |", "|---|---|---|---|---|---|");
for (const r of shown) {
  const notes = [];
  if (!r.registered) notes.push("⚠未注册_variables");
  if (r.counterType) notes.push(r.counterType + "，拾取=add 正值");
  if (r.acq.length && r.ref.length <= r.acq.length && !NO_BAG.test(r.item)) notes.push("⚠死道具（几乎无引用）");
  if (r.acq.length > 1) notes.push("多拾取点×" + r.acq.length);
  if (!r.acq.length && !r.counterType) notes.push(r.registered ? "无拾取点（动态赋值或未实装）" : "仅引用未赋值");
  L.push(`| ${r.item} | ${r.bag} | ${r.acq.length ? r.acq.join("<br>") : "—"} | ${r.rem.length ? r.rem.length + "处" : "—"} | ${r.ref.length} | ${notes.join("；")} |`);
}
L.push("", "## 每文件独占引入的占包物品数（新区域预算 ≤10）", "", "| 文件 | 占包物品数 |", "|---|---|");
Object.entries(byFile).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => L.push(`| ${f} | ${n}${n > 10 ? " ⚠超预算" : ""} |`));
const dead = rows.filter((r) => r.acq.length && r.ref.length <= r.acq.length && !NO_BAG.test(r.item));
const unreg = rows.filter((r) => !r.registered);
console.log(`物品 ${rows.length} 个（占包 ${rows.filter((r) => r.bag === "占").length} / 不占 ${rows.filter((r) => r.bag === "否").length} / 待定 ${rows.filter((r) => r.bag === "?").length}）`);
console.log(`死道具 ${dead.length} 个：${dead.map((r) => r.item).join(", ") || "无"}`);
console.log(`未注册 hasXxx ${unreg.length} 个：${unreg.map((r) => r.item).join(", ") || "无"}`);
fs.writeFileSync(path.join(ROOT, "tools", "chain-report.md"), L.join("\n") + "\n", "utf8");
console.log(`明细 -> tools/chain-report.md`);
