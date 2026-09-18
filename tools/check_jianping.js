// 临时校验脚本：加载全部剧情数据，检查建平中学.js 的跳转目标与条件表达式
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const OUT = [];
console.log = (...a) => OUT.push(a.join(" "));

const ROOT = path.resolve(__dirname, "..");
const files = [
  "story/utils.js",
  "story/core.js",
  "story/夜晚剧情.js",
  "story/东明街道/樱桃苑（初始小区）.js",
  "story/东明街道/东明街道路径.js",
  "story/东明街道/长者食堂.js",
  "story/东明街道/三林菜市场.js",
  "story/东明街道/东明社区图书馆.js",
  "story/东明街道/地铁站.js",
  "story/东明街道/五金店.js",
  "story/东明街道/益丰大药房.js",
  "story/东明街道/上实南校.js",
  "story/东明街道/新达汇.js",
  "story/东明街道/新达汇地下车库.js",
  "story/东明街道/全家和公交站.js",
  "story/东明街道/安盛街.js",
  "story/东明街道/安居苑.js",
  "story/东明街道/金谊广场.js",
  "story/东明街道/警察局.js",
  "story/东明街道/反派NPC.js",
  "story/上海市区路径.js",
  "story/仁济南院.js",
  "story/建平中学.js",
  "story/张江.js",
];

const ctx = vm.createContext({ console });
for (const f of files) {
  const p = path.join(ROOT, f);
  try {
    vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: f });
  } catch (e) {
    console.log("!! 加载失败 " + f + " : " + e.message);
  }
}

const run = (src) => vm.runInContext(src, ctx);
const storyData = run("storyData");
const ids = Object.keys(storyData).filter((k) => !k.startsWith("_"));
const idSet = new Set(ids);

// --- 1. 收集建平中学.js 定义/引用的场景 ---
const jpIds = ids.filter((k) => k.startsWith("建平-") || k === "复旦江湾" || k === "罗山路立交桥下");

function mkState() {
  const s = run("JSON.parse(JSON.stringify(storyData._variables, function(k,v){ return v instanceof Set ? {__set: Array.from(v)} : v; }))");
  // 还原 Set
  const fix = (o) => {
    if (o && typeof o === "object") {
      if (o.__set) return new Set(o.__set);
      for (const k in o) o[k] = fix(o[k]);
    }
    return o;
  };
  return fix(s);
}

const keys = Object.keys(mkState());
function evalExpr(expr, st) {
  try {
    const fn = new Function(...keys, "return Boolean(" + expr + ");");
    return { ok: true, val: fn(...keys.map((k) => st[k])) };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

const problems = { missingTarget: [], condError: [], fnTargetThrow: [], emptyText: [], noChoices: [] };

function checkTarget(t, sceneId, label) {
  if (typeof t !== "string") return;
  if (t.indexOf("{") >= 0) return;
  if (!idSet.has(t)) problems.missingTarget.push(`${sceneId} [${label}] -> ${t}`);
}

for (const sid of jpIds) {
  const sc = storyData[sid];
  if (!sc) continue;
  const st = mkState();
  st._lastScene = sid;

  // 场景级 qte
  let qte = sc.qte;
  if (typeof qte === "function") {
    try { qte = qte(st); } catch (e) { problems.fnTargetThrow.push(`${sid} qte(): ${e.message}`); qte = null; }
  }
  if (qte && qte.onTimeout) checkTarget(qte.onTimeout, sid, "qte.onTimeout");

  // choices
  let cs = sc.choices;
  if (typeof cs === "function") {
    try { cs = cs(st); } catch (e) { problems.fnTargetThrow.push(`${sid} choices(): ${e.message}`); cs = null; }
  }
  if (Array.isArray(cs)) {
    cs.forEach((c, i) => {
      const tag = `choice#${i} "${typeof c.text === "string" ? c.text : "<fn>"}"`;
      let ns = c.nextScene, es = c.elseScene, ts = c.timeoutScene;
      if (typeof ns === "function") { try { ns = ns(st); } catch (e) { problems.fnTargetThrow.push(`${sid} ${tag} nextScene(): ${e.message}`); ns = null; } }
      if (typeof es === "function") { try { es = es(st); } catch (e) { problems.fnTargetThrow.push(`${sid} ${tag} elseScene(): ${e.message}`); es = null; } }
      checkTarget(ns, sid, tag + " nextScene");
      checkTarget(es, sid, tag + " elseScene");
      checkTarget(ts, sid, tag + " timeoutScene");
      // 条件表达式变量注册检查
      for (const key of ["condition", "showCondition"]) {
        const cond = c[key];
        if (typeof cond === "string") {
          const r = evalExpr(cond, st);
          if (!r.ok) problems.condError.push(`${sid} ${tag} ${key}: "${cond}" => ${r.err}`);
        }
      }
    });
  } else if (cs === null) {
    // 已记录异常
  } else if (!sc.qte) {
    problems.noChoices.push(sid);
  }

  // text 为空？
  if (sc.text === undefined || sc.text === null || (typeof sc.text === "string" && !sc.text.trim())) {
    problems.emptyText.push(sid);
  }
}

// --- 2. 全局：所有 _globalTriggers / rules 条件变量检查 ---
for (const g of (storyData._globalTriggers || [])) {
  if (typeof g.condition === "string") {
    const r = evalExpr(g.condition, mkState());
    if (!r.ok) problems.condError.push(`_globalTriggers: "${g.condition}" => ${r.err}`);
  }
  if (typeof g.targetScene === "string" && !idSet.has(g.targetScene)) problems.missingTarget.push(`_globalTriggers -> ${g.targetScene}`);
}

// --- 3. 建平独有的孤立检查：场景无入边 ---
const inbound = {};
for (const sid of ids) {
  const sc = storyData[sid];
  const collect = (c) => {
    const st = mkState();
    st._lastScene = "建平-校园门口";
    let cs2 = c.choices;
    if (typeof cs2 === "function") { try { cs2 = cs2(st); } catch (e) { return; } }
    if (Array.isArray(cs2)) {
      for (const o of cs2) {
        let t = o.nextScene;
        if (typeof t === "function") { try { t = t(st); } catch (e) { continue; } }
        if (typeof t === "string") (inbound[t] = inbound[t] || []).push(sid);
      }
    }
    let q = c.qte;
    if (typeof q === "function") { try { q = q(st); } catch (e) { q = null; } }
    if (q && typeof q.onTimeout === "string") (inbound[q.onTimeout] = inbound[q.onTimeout] || []).push(sid);
  };
  collect(sc);
}

// --- 输出 ---
const uniq = (a) => Array.from(new Set(a));
console.log("=== 建平相关场景数: " + jpIds.length + " ===");
console.log("\n--- [A] 跳转目标不存在 ---");
uniq(problems.missingTarget).sort().forEach((x) => console.log("  " + x));
console.log("\n--- [B] 条件表达式报错（变量未注册等） ---");
uniq(problems.condError).sort().forEach((x) => console.log("  " + x));
console.log("\n--- [C] 函数型 options/qte 求值抛错 ---");
uniq(problems.fnTargetThrow).sort().forEach((x) => console.log("  " + x));
console.log("\n--- [D] 建平场景中无 choices 且无 qte（=剧终节点） ---");
uniq(problems.noChoices).forEach((x) => console.log("  " + x));
console.log("\n--- [E] 建平场景 text 为空 ---");
uniq(problems.emptyText).forEach((x) => console.log("  " + x));
console.log("\n--- [F] 建平场景无任何入边（孤立） ---");
jpIds.filter((k) => !inbound[k] && k !== "start").forEach((k) => console.log("  " + k));

fs.writeFileSync(path.join(ROOT, "tools/check_report.txt"), OUT.join("\n"), "utf8");
