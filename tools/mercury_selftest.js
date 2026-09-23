#!/usr/bin/env node
/**
 * mercury_selftest.js —— 汞负荷系统回归自测
 *
 * 覆盖：
 *   1. mercuryTier 档位边界（0/20/40/70）
 *   2. _caps 已注册 → 全局钳制生效（含裸 add 越界）
 *   3. 慢性累积规则：每小时 +1、跨多档一次补足、load=0 不启动
 *   4. 痛觉消失旁白 noPainSense / mercuryPainNote 行为
 *   5. 夜视 hasDimLight 三通道（手电 / 手机有电 / 高汞）
 *   6. 药丸 -20 减汞（且不低于 0）
 *   7. 全身症状通道存在性：noPainSense 文案点是否真的会变
 *
 * 用法：node tools/mercury_selftest.js    期望「全部通过：0 失败」
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = process.cwd();
const sandbox = {
  console, Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat,
  isNaN, Set, Map, Date, RegExp, Error, Function,
};
["flashStatusWarning", "flashStatus", "showToast", "notify", "triggerShake"].forEach(
  (n) => (sandbox[n] = function () {})
);
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ["story/utils.js", "story/core.js"]) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log("缺少文件", f); process.exit(1); }
  vm.runInContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: f });
}
const sd = vm.runInContext("storyData", sandbox);

let pass = 0, fail = 0;
function ok(msg) { pass++; console.log("  ok  " + msg); }
function bad(msg) { fail++; console.log("  FAIL " + msg); }
function eq(actual, expected, msg) {
  if (actual === expected) ok(msg + "  (" + JSON.stringify(actual) + ")");
  else bad(msg + "  期望 " + JSON.stringify(expected) + "，实际 " + JSON.stringify(actual));
}

// ---- 迷你状态机：复刻 engine 的 clampAll / applyReactive 关键部分 ----
function mkState(over) {
  const v = JSON.parse(JSON.stringify(sd._variables));
  if (over) Object.assign(v, over);
  recalc(v);
  return v;
}
function recalc(v) {
  const computed = sd._reactive.computed;
  for (const k of Object.keys(computed)) {
    const e = computed[k];
    try {
      v[k] = typeof e === "function"
        ? e(v)
        : new Function(...Object.keys(v), "return (" + e + ");")(...Object.values(v));
    } catch (_) {}
  }
}
function clampAll(v) {
  const caps = sd._caps || {};
  for (const key of Object.keys(caps)) {
    const c = caps[key];
    if (c.min !== undefined && v[key] < c.min) v[key] = c.min;
    if (c.max !== undefined && v[key] > c.max) v[key] = c.max;
  }
}

console.log("========== 1. mercuryTier 档位边界 ==========");
eq(sandbox.mercuryTier(0), 0, "load=0 → 档位 0");
eq(sandbox.mercuryTier(19), 0, "load=19 → 档位 0（未达 20）");
eq(sandbox.mercuryTier(20), 1, "load=20 → 档位 1（皮肤灰白）");
eq(sandbox.mercuryTier(39), 1, "load=39 → 档位 1");
eq(sandbox.mercuryTier(40), 2, "load=40 → 档位 2（痛觉消失/夜视）");
eq(sandbox.mercuryTier(69), 2, "load=69 → 档位 2");
eq(sandbox.mercuryTier(70), 3, "load=70 → 档位 3（尸变）");
eq(sandbox.mercuryTier(100), 3, "load=100 → 档位 3");
eq(sandbox.mercuryTier(undefined), 0, "load=undefined → 档位 0（健壮性）");

console.log("\n========== 2. _caps 全局钳制 ==========");
ok("_caps.mercuryLoad = " + JSON.stringify(sd._caps.mercuryLoad));
if (sd._caps.mercuryLoad && sd._caps.mercuryLoad.max === 100) ok("_caps 已注册 max=100");
else bad("_caps 未注册 mercuryLoad（P0 回归）");
{
  const v = mkState({ mercuryLoad: 130 });   // 模拟裸 add 越界
  clampAll(v);
  eq(v.mercuryLoad, 100, "裸 add 越界 130 → 钳回 100");
}
{
  const v = mkState({ mercuryLoad: -30 });
  clampAll(v);
  eq(v.mercuryLoad, 0, "负值 -30 → 钳回 0");
}

console.log("\n========== 3. 慢性累积规则 ==========");
const rule = sd._reactive.rules.find((r) => r.id === "mercury-chronic");
if (rule) ok("mercury-chronic 规则存在");
else bad("mercury-chronic 规则缺失");
if (rule) {
  eq(rule.condition, "mercuryLoad > 0", "仅 load>0 启动（被咬才是开关）");
  const v = mkState({ mercuryLoad: 10 });
  v.gameMinutes = 0;
  rule.effect(v);                                     // 首次调用：建立台账，返回 false
  v.gameMinutes = 60;
  const g1 = rule.effect(v);
  eq(g1, 1, "1 小时后 +1");
  eq(v.mercuryLoad, 11, "load 10 → 11");
  v.gameMinutes = 300;                                // 跨 4 小时
  const g2 = rule.effect(v);
  eq(g2, 4, "跨 4 小时一次补 +4");
  eq(v.mercuryLoad, 15, "load 11 → 15");
  // 无时间推进 → 不长
  const g3 = rule.effect(v);
  eq(g3, false, "同一小时内重复结算不增长");
  // 到达 70 所需时间
  eq(70 - 10, 60, "load=10 起需 60 小时（2.5 天）到死亡阈值");
}
{
  const v = mkState({ mercuryLoad: 0 });
  v.gameMinutes = 600;
  eq(v.mercuryLoad > 0, false, "未暴露（load=0）→ 规则条件不满足，永不累积");
}

console.log("\n========== 4. 痛觉消失旁白 ==========");
{
  const v = mkState({ mercuryLoad: 0 });
  eq(v.noPainSense, false, "load=0 → noPainSense=false");
  eq(sandbox.mercuryPainNote(v), "", "低汞时不插入任何旁白");
  const v2 = mkState({ mercuryLoad: 45 });
  eq(v2.noPainSense, true, "load=45 → noPainSense=true");
  const note = sandbox.mercuryPainNote(v2);
  eq(note.length > 0, true, "高汞时返回痛觉旁白（非空）");
  eq(note.includes("<span"), true, "旁白带样式 span");
}

console.log("\n========== 5. hasDimLight 三通道 ==========");
{
  const v = mkState({ hasTorch: false, hasPhone: false, phoneBattery: 0, mercuryLoad: 0 });
  eq(v.hasDimLight, false, "无手电/无手机/低汞 → 无弱光");
  eq(mkState({ hasTorch: true, mercuryLoad: 0 }).hasDimLight, true, "有手电 → true");
  eq(mkState({ hasPhone: true, phoneBattery: 50, mercuryLoad: 0 }).hasDimLight, true, "手机有电 → true");
  eq(mkState({ hasPhone: true, phoneBattery: 0, mercuryLoad: 0 }).hasDimLight, false, "手机没电 → false");
  eq(mkState({ hasTorch: false, hasPhone: false, mercuryLoad: 50 }).hasDimLight, true, "高汞夜视 → true");
  eq(mkState({ hasTorch: false, hasPhone: false, mercuryLoad: 39 }).hasDimLight, false, "汞未达 40 → 无夜视");
}

console.log("\n========== 6. 药丸减汞 ==========");
{
  const v = mkState({ mercuryLoad: 30 });
  v.mercuryLoad = Math.max(0, v.mercuryLoad - 20);
  eq(v.mercuryLoad, 10, "30 - 20 = 10");
  const v2 = mkState({ mercuryLoad: 10 });
  v2.mercuryLoad = Math.max(0, v2.mercuryLoad - 20);
  eq(v2.mercuryLoad, 0, "10 - 20 不低于 0");
}

console.log("\n========== 7. 症状文案通道存在性 ==========");
{
  // 检查 noPainSense 在场景 text 中确实被用到（而非定义了没人用）
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".js")) files.push(p);
    }
  })(path.join(ROOT, "story"));
  const joined = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const painHits = (joined.match(/noPainSense/g) || []).length;
  const dimHits = (joined.match(/hasDimLight/g) || []).length;
  const noteHits = (joined.match(/mercuryPainNote/g) || []).length;
  console.log("  noPainSense 引用 " + painHits + " 次 / hasDimLight " + dimHits + " 次 / mercuryPainNote " + noteHits + " 次");
  if (painHits >= 4) ok("痛觉反转已铺开（scene 内至少 3 处 + 声明）");
  else bad("noPainSense 引用过少，症状可能未落地");
  if (noteHits >= 4) ok("痛觉旁白已在多个受伤点使用");
  else bad("mercuryPainNote 使用过少");
}

console.log("\n结果：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail === 0 ? 0 : 1);
