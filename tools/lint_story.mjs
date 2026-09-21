// 剧情静态体检（story-testing skill 的 L1 层）：死链/条件报错/函数抛错/空text/孤立/图片404/经济/文本规范
//
// 用法：node tools/lint_story.mjs            # 全图
//       node tools/lint_story.mjs 建平        # 只查文件名含"建平"的文件
// 报告：tools/lint-report.md；有 [E] 错误时退出码 1（可挂 git hook）
//
// 取代 check_jianping.js / check_renji.js（按区域复制的旧脚本）。

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const areaFilter = process.argv.slice(2).filter((a) => !a.startsWith("--"))[0] || null;

// ---------- 1. 加载（同 graph_audit：从 index.html 解析顺序） ----------
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const files = [];
for (const m of html.matchAll(/<script src="(story\/[^"]+)"><\/script>/g)) files.push(m[1]);

// vm 里没有 engine.js 的 UI 全局函数，打桩防误报（跑全图发现新的再补）
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
const triggerTargets = new Set((storyData._globalTriggers || []).map((t) => t.targetScene));

// 已知变量 = _variables ∪ computed ∪ 引擎运行时键
const varKeys = [...new Set([
  ...Object.keys(run("storyData._variables")),
  ...Object.keys((run("storyData._reactive") || {}).computed || {}),
  "_input", "_lastScene",
])];

// ---------- 2. 状态变体 ----------
function mkState() {
  const s = run('JSON.parse(JSON.stringify(storyData._variables, function(k,v){ return v instanceof Set ? {__set: Array.from(v)} : v; }))');
  const fix = (o) => { if (o && typeof o === "object") { if (o.__set) return new Set(o.__set); for (const k in o) o[k] = fix(o[k]); } return o; };
  return fix(s);
}
function mkVariants() {
  const t1 = mkState(), t2 = mkState(), night = mkState(), visit = mkState(), rain = mkState(), over = mkState();
  const bools = (st, val) => { for (const k of Object.keys(st)) if (typeof st[k] === "boolean") st[k] = val; };
  bools(t1, true); Object.assign(t1, { strength: 10, chasedByZombies: 0, itemCount: 0, phoneBattery: 100 });
  bools(t2, false); Object.assign(t2, { strength: 1, chasedByZombies: 5, itemCount: 99, phoneBattery: 0 });
  bools(night, true); Object.assign(night, { strength: 10, hh: 23 });
  try { visit._visit = new Proxy({}, { get: () => 1 }); } catch (e) {}
  Object.assign(rain, { weather: "雨" }); Object.assign(over, { weather: "阴" });
  return [mkState(), t1, t2, night, visit, rain, over];
}

// ---------- 3. 检查 ----------
const out = { E: [], W: [] }; // E=错误(必须修) W=警告(人工核对)
const E = (file, sid, msg) => out.E.push(`[E] ${path.basename(file)} ${sid}: ${msg}`);
const W = (file, sid, msg) => out.W.push(`[W] ${path.basename(file)} ${sid}: ${msg}`);

const evalExpr = (expr) => {
  try { new Function(...varKeys, "return Boolean(" + expr + ");")(...varKeys.map(() => 0)); return true; }
  catch (e) { return e.message; }
};
const checkTarget = (file, sid, t, label) => {
  if (typeof t !== "string" || !t || t.includes("{")) return;
  inbound.add(t); // 顺带记账：有效目标即入边
  if (!idSet.has(t)) E(file, sid, `死链 ${label} -> ${t}`);
};
const stripHtml = (s) => String(s).replace(/<[^>]+>/g, "");
const inbound = new Set();

function checkEffectEconomy(file, sid, eff, label) {
  if (!eff || typeof eff !== "object") return;
  const sets = eff.set || {}, adds = eff.add || {};
  for (const k of Object.keys(sets)) {
    if (/^has[A-Z]/.test(k) && sets[k] === true && adds.itemCount === undefined && !/Bag|Transport|Backpack|Schoolbag|FireTorch/.test(k))
      W(file, sid, `${label}: set ${k}=true 但没有 add itemCount（交通工具/袋子/背包除外，请核对）`);
  }
  if (sets.positionAfterOperation !== undefined && !idSet.has(sets.positionAfterOperation))
    E(file, sid, `positionAfterOperation -> ${sets.positionAfterOperation} 不存在`);
}

for (const sid of ids) {
  const sc = storyData[sid];
  const file = fileOf[sid] || "?";
  if (areaFilter && !path.basename(file).includes(areaFilter)) continue;
  const hasChoicesOrQte = sc.choices !== undefined || sc.qte !== undefined;

  for (const st of mkVariants()) {
    st._lastScene = sid;
    const r = (v, what) => { if (typeof v !== "function") return v; try { return v(st); } catch (e) { E(file, sid, `${what}() 抛错: ${e.message}`); return null; } };

    // qte
    const q = r(sc.qte, "qte");
    if (q) {
      checkTarget(file, sid, q.onTimeout, "qte.onTimeout");
      if (typeof q.timeout === "string") { const bad = evalExpr(q.timeout); if (bad !== true) E(file, sid, `qte.timeout 表达式错误 "${q.timeout}": ${bad}`); }
    }
    // image
    const img = r(sc.image, "image");
    if (typeof img === "string" && img && !fs.existsSync(path.join(ROOT, img))) E(file, sid, `图片不存在: ${img}`);
    // choices
    const cs = r(sc.choices, "choices");
    if (Array.isArray(cs)) {
      if (cs.length === 0 && !q) E(file, sid, "choices 为空数组且无 qte（玩家卡死）");
      cs.forEach((c, i) => {
        const label = `选项#${i}`;
        checkTarget(file, sid, r(c.nextScene, `${label} nextScene`), "nextScene");
        checkTarget(file, sid, r(c.elseScene, `${label} elseScene`), "elseScene");
        checkTarget(file, sid, r(c.timeoutScene, `${label} timeoutScene`), "timeoutScene");
        const ns = typeof c.nextScene === "function" ? null : c.nextScene;
        if (typeof ns === "string" && ns && !ns.includes("{")) inbound.add(ns);
        if (typeof c.timeout === "string") { const bad = evalExpr(c.timeout); if (bad !== true) E(file, sid, `${label} timeout 表达式错误 "${c.timeout}": ${bad}`); }
        for (const key of ["condition", "showCondition"]) {
          if (typeof c[key] === "string") { const bad = evalExpr(c[key]); if (bad !== true) E(file, sid, `${label} ${key} "${c[key]}": ${bad}`); }
          else if (typeof c[key] === "object" && c[key]) {
            for (const [vk, cond] of Object.entries(c[key])) {
              if (!varKeys.includes(vk)) E(file, sid, `${label} ${key} 比较对象引用未注册变量 ${vk}`);
              if (cond && typeof cond === "object") for (const op of Object.keys(cond)) if (![">=", "<=", ">", "<", "!=", "=="].includes(op)) E(file, sid, `${label} ${key} 不支持的运算符 ${op}`);
            }
          }
        }
        // effect 经济 + positionAfterOperation（静态对象；函数型看返回值）
        const eff = typeof c.effect === "function" ? (() => { try { return c.effect(st); } catch (e) { E(file, sid, `${label} effect() 抛错: ${e.message}`); return null; } })() : c.effect;
        checkEffectEconomy(file, sid, eff, label);
        if (typeof c.effect === "function") {
          for (const m of c.effect.toString().matchAll(/positionAfterOperation["']?\s*[:=]\s*"([^"]+)"/g))
            if (!idSet.has(m[1])) E(file, sid, `effect函数内 positionAfterOperation -> ${m[1]} 不存在`);
        }
        // 选项文本规范
        const ct = r(c.text, `${label} text`);
        if (typeof ct === "string") {
          const plain = stripHtml(ct);
          if (plain.includes('"')) W(file, sid, `${label} 文本含直角引号 "（应为“”）: ${ct.slice(0, 30)}`);
          for (const ban of ["继续走", "往回走", "往前走", "回头走"]) if (ct.includes(ban)) W(file, sid, `${label} 选项含相对方位词"${ban}"（应用绝对方位词）`);
        }
      });
    }
    // onEnter
    const oe = typeof sc.onEnter === "function" ? (() => { try { return sc.onEnter(st); } catch (e) { E(file, sid, `onEnter() 抛错: ${e.message}`); return null; } })() : sc.onEnter;
    checkEffectEconomy(file, sid, oe, "onEnter");

    // text：空文本 + 插值变量 + 规范（静态空=E；函数在极端变体下返回空=W，多为不可达分支）
    const tx = r(sc.text, "text");
    const texts = Array.isArray(tx) ? tx : [tx];
    if (sc.text === undefined || sc.text === null || (typeof sc.text === "string" && !sc.text.trim())) E(file, sid, "text 为空（静态）");
    for (const t of texts) {
      if (typeof t === "string" && !t.trim()) { W(file, sid, "text 在某状态变体下为空（可能是不可达分支，核对）"); break; }
      if (t === undefined || t === null) continue;
      if (typeof t !== "string") continue;
      const plain = stripHtml(t);
      if (plain.includes("\n\n")) W(file, sid, `text 含空行 \\n\\n（违反规范）`);
      if (plain.includes('"')) W(file, sid, `text 含直角引号 "（应为“”）: ${t.slice(0, 30)}`);
      for (const m of t.matchAll(/\{(\w+)\}/g)) if (!varKeys.includes(m[1])) E(file, sid, `插值变量 {${m[1]}} 未在 _variables/computed 注册`);
    }
  }
  // 无选项无QTE非结局（潜在卡死/漏写）
  if (!hasChoicesOrQte && !sid.startsWith("结局-")) W(file, sid, "无 choices 且无 qte 且非结局（确认是否剧终节点，结局请加 结局- 前缀）");
}

// 孤立场景（无入边；start/触发器目标豁免）
for (const sid of ids) {
  const file = fileOf[sid] || "?";
  if (areaFilter && !path.basename(file).includes(areaFilter)) continue;
  if (sid !== "start" && !inbound.has(sid) && !triggerTargets.has(sid)) W(file, sid, "无任何入边（孤立场景）");
}

// 全局触发器
for (const t of storyData._globalTriggers || []) {
  if (typeof t.targetScene === "string" && !idSet.has(t.targetScene)) E("core.js", "_globalTriggers", `死链 -> ${t.targetScene}`);
  if (typeof t.condition === "string") { const bad = evalExpr(t.condition); if (bad !== true) E("core.js", "_globalTriggers", `condition "${t.condition}": ${bad}`); }
}

// ---------- 4. 输出 ----------
const dedupe = (a) => [...new Set(a)];
const report = [`# 剧情静态体检 ${areaFilter ? "· " + areaFilter : "· 全图"}`, `- 生成：node tools/lint_story.mjs${areaFilter ? " " + areaFilter : ""}`, `- 场景 ${ids.length} 个，检查范围：${areaFilter ? "文件名含「" + areaFilter + "」" : "全部"}`, "", `## 错误 ${dedupe(out.E).length} 条（必须修）`, ""];
dedupe(out.E).forEach((x) => report.push("- " + x));
report.push("", `## 警告 ${dedupe(out.W).length} 条（人工核对）`, "");
dedupe(out.W).forEach((x) => report.push("- " + x));
fs.writeFileSync(path.join(ROOT, "tools", "lint-report.md"), report.join("\n") + "\n", "utf8");
console.log(`E=${dedupe(out.E).length} W=${dedupe(out.W).length} -> tools/lint-report.md`);
dedupe(out.E).slice(0, 15).forEach((x) => console.log("  " + x));
process.exitCode = dedupe(out.E).length ? 1 : 0;
