// 一次性校验：仁济南院.js 的跳转目标与条件表达式（复用 check_jianping.js 思路）
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

const renjiIds = ids.filter((k) => k.indexOf("仁济") >= 0);

function mkState() {
  const s = run("JSON.parse(JSON.stringify(storyData._variables, function(k,v){ return v instanceof Set ? {__set: Array.from(v)} : v; }))");
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

for (const sid of renjiIds) {
  const sc = storyData[sid];
  if (!sc) continue;
  const st = mkState();
  st._lastScene = sid;

  let qte = sc.qte;
  if (typeof qte === "function") {
    try { qte = qte(st); } catch (e) { problems.fnTargetThrow.push(`${sid} qte(): ${e.message}`); qte = null; }
  }
  if (qte && qte.onTimeout) checkTarget(qte.onTimeout, sid, "qte.onTimeout");

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

  if (sc.text === undefined || sc.text === null || (typeof sc.text === "string" && !sc.text.trim())) {
    problems.emptyText.push(sid);
  }
}

// 入边检查（孤立场景）
const inbound = {};
for (const sid of ids) {
  const sc = storyData[sid];
  if (!sc) continue;
  const st = mkState();
  st._lastScene = "仁济南院-浦锦路";
  let cs2 = sc.choices;
  if (typeof cs2 === "function") { try { cs2 = cs2(st); } catch (e) { continue; } }
  if (Array.isArray(cs2)) {
    for (const o of cs2) {
      let t = o.nextScene;
      if (typeof t === "function") { try { t = t(st); } catch (e) { continue; } }
      if (typeof t === "string") (inbound[t] = inbound[t] || []).push(sid);
    }
  }
  let q = sc.qte;
  if (typeof q === "function") { try { q = q(st); } catch (e) { q = null; } }
  if (q && typeof q.onTimeout === "string") (inbound[q.onTimeout] = inbound[q.onTimeout] || []).push(sid);
}

const uniq = (a) => Array.from(new Set(a));
console.log("=== 仁济南院相关场景数: " + renjiIds.length + " ===");
console.log("\n--- [A] 跳转目标不存在 ---");
uniq(problems.missingTarget).sort().forEach((x) => console.log("  " + x));
console.log("\n--- [B] 条件表达式报错（变量未注册等） ---");
uniq(problems.condError).sort().forEach((x) => console.log("  " + x));
console.log("\n--- [C] 函数型 options/qte 求值抛错 ---");
uniq(problems.fnTargetThrow).sort().forEach((x) => console.log("  " + x));
console.log("\n--- [D] 无 choices 且无 qte（=剧终节点） ---");
uniq(problems.noChoices).forEach((x) => console.log("  " + x));
console.log("\n--- [E] text 为空 ---");
uniq(problems.emptyText).forEach((x) => console.log("  " + x));
console.log("\n--- [F] 无任何入边（孤立） ---");
renjiIds.filter((k) => !inbound[k]).forEach((k) => console.log("  " + k));

fs.writeFileSync(path.join(ROOT, "tools/check_renji_report.txt"), OUT.join("\n"), "utf8");
console.log("written to tools/check_renji_report.txt (original console.log)");
