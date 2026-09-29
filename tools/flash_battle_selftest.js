#!/usr/bin/env node
/**
 * flash_battle_selftest.js —— 记忆闪色「三档判定」回归自测（2026-09-29）
 *
 * 背景：原闪色战斗是全等比对（差一个数即死），改为距离计分 + 分档：
 *   0 偏差 = 胜利；1~2 偏差 = 受伤；≥3 偏差 / 超时 = 死亡。
 *   库中「答错也不致死」的 5 场用两档路由（0=成功，其余=原非致死结果）。
 *
 * 覆盖：
 *   1. colorCountMap / flashAnswerDeviation 偏差计分（含波波给的样例）
 *   2. flashCombatRouter 三档边界（0 / 1 / 2 / 3）
 *   3. flashCombatRouterSafe 两档边界（0 / ≥1）
 *   4. 防刷分：多报 / 乱填 / 空输入 一律进死亡档（不给免费胜利）
 *   5. 路由工厂 __sceneRefs（供 lint 补记入边）
 *   6. hurtPenaltyBase：汞 +5×偏差（封顶 100）、hurtByZombie
 *   7. hurtWinOnEnter：体力 -(combatCost+1)、_lastCombatDrain、human 开关
 *   8. hurtFleeOnEnter：体力 -2、追兵 +chase（chase:0 不加）
 *   9. hurtCostText：读后清除、withWound=false 不播抓伤
 *
 * 用法：node tools/flash_battle_selftest.js   期望「全部通过：0 失败」
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
const G = vm.runInContext("this", sandbox);

let pass = 0, fail = 0;
function ok(msg) { pass++; console.log("  ok  " + msg); }
function bad(msg) { fail++; console.log("  FAIL " + msg); }
function eq(actual, expected, msg) {
  if (actual === expected) ok(msg + "  (" + JSON.stringify(actual) + ")");
  else bad(msg + "  期望 " + JSON.stringify(expected) + "，实际 " + JSON.stringify(actual));
}

// 迷你状态机：复刻 engine 的关键部分（初值 + computed 派生 + _caps 钳制）
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

// ================= 1. 偏差计分 =================
console.log("\n=== 1. flashAnswerDeviation 偏差计分 ===");
{
  const f = (ans, inp) => G.flashAnswerDeviation(mkState({ _currentAnswer: ans, _input: inp }));
  eq(f("3红2蓝1绿", "2红1蓝"), 3, "波波样例：3红2蓝1绿 答 2红1蓝 → 3 偏差（红1+蓝1+绿1）");
  eq(f("2红2蓝", "2红2蓝"), 0, "完全一致 → 0 偏差");
  eq(f("2红2蓝", "2蓝2红"), 0, "顺序无关（2蓝2红）→ 0 偏差");
  eq(f("2红2蓝", "2红1蓝"), 1, "少报 1 个蓝 → 1 偏差");
  eq(f("2红2蓝", "3红2蓝"), 1, "多报 1 个红 → 1 偏差");
  eq(f("2红2蓝", ""), 4, "空输入 → 偏差 = 总闪色数 4（必死）");
  eq(f("2红2蓝", "3红2绿"), 5, "3红2绿 对 2红2蓝 → 红1+蓝2+绿2 = 5 偏差");
  eq(f("2红2蓝", "9红9蓝9绿9黄9紫9白"), 50, "乱填满色 → 红7+蓝7+绿9+黄9+紫9+白9 = 50 偏差");
}

// ================= 2. 三档路由 =================
console.log("\n=== 2. flashCombatRouter 三档边界 ===");
{
  const R = (ans, inp) => G.flashCombatRouter("W", "H", "D")(mkState({ _currentAnswer: ans, _input: inp }));
  eq(R("2红2蓝", "2红2蓝"), "W", "0 偏差 → 胜利档");
  eq(R("3红2蓝1绿", "2红2蓝1绿"), "H", "1 偏差 → 受伤档");
  eq(R("3红2蓝1绿", "2红1蓝1绿"), "H", "2 偏差 → 受伤档");
  eq(R("3红2蓝1绿", "1红1蓝1绿"), "D", "3 偏差 → 死亡档");
  eq(R("2红2蓝", ""), "D", "空输入 → 死亡档（不给免费胜利）");
  eq(R("2红2蓝", "9红9蓝9绿9黄9紫9白"), "D", "乱填满色 → 死亡档（堵刷分）");
  const refs = G.flashCombatRouter("A1", "A2", "A3").__sceneRefs;
  eq(JSON.stringify(refs), JSON.stringify(["A1", "A2", "A3"]), "三档路由 __sceneRefs 就位（供 lint 补入边）");
}

// ================= 3. 两档路由 =================
console.log("\n=== 3. flashCombatRouterSafe 两档边界（非致死场景）===");
{
  const R = (ans, inp) => G.flashCombatRouterSafe("W", "S")(mkState({ _currentAnswer: ans, _input: inp }));
  eq(R("2红2蓝", "2红2蓝"), "W", "0 偏差 → 成功档");
  eq(R("2红2蓝", "2红1蓝"), "S", "1 偏差 → 原非致死结果");
  eq(R("2红2蓝", ""), "S", "空输入 → 原非致死结果（不设死亡档）");
  const refs = G.flashCombatRouterSafe("B1", "B2").__sceneRefs;
  eq(JSON.stringify(refs), JSON.stringify(["B1", "B2"]), "两档路由 __sceneRefs 就位");
}

// ================= 4. hurtPenaltyBase =================
console.log("\n=== 4. hurtPenaltyBase 公共受伤惩罚 ===");
{
  const v1 = mkState({ mercuryLoad: 10, hurtByZombie: false, _currentAnswer: "2红2蓝", _input: "2红1蓝" }); // dev=1
  G.hurtPenaltyBase(v1);
  eq(v1.mercuryLoad, 15, "汞 +5×偏差（dev1 → +5）");
  eq(v1.hurtByZombie, true, "hurtByZombie 置真");

  const v2 = mkState({ mercuryLoad: 10, _currentAnswer: "3红2蓝1绿", _input: "1红1蓝1绿" }); // dev=3
  G.hurtPenaltyBase(v2);
  eq(v2.mercuryLoad, 25, "汞 +5×偏差（dev3 → +15）");

  const v3 = mkState({ mercuryLoad: 98, _currentAnswer: "3红2蓝1绿", _input: "1红1蓝1绿" });
  G.hurtPenaltyBase(v3);
  eq(v3.mercuryLoad, 100, "汞封顶 100（98 + 15 → 100）");
}

// ================= 5. hurtWinOnEnter =================
console.log("\n=== 5. hurtWinOnEnter 受伤-干死档 ===");
{
  const v1 = mkState({ strength: 12, _currentAnswer: "2红2蓝", _input: "2红1蓝" }); // 无武器 → combatCost=2
  G.hurtWinOnEnter({})(v1);
  eq(v1.strength, 9, "体力 -(combatCost+1)（无武器 combatCost=2 → -3）");
  eq(v1._lastCombatDrain, 3, "_lastCombatDrain 记录 3");

  const v2 = mkState({ strength: 12, hasDagger: true, _currentAnswer: "2红2蓝", _input: "2红1蓝" });
  recalc(v2); // meleeWeaponTier 依赖 computed
  G.hurtWinOnEnter({ pos: "X-落点" })(v2);
  eq(v2.positionAfterOperation, "X-落点", "opts.pos 写入 positionAfterOperation");
  eq(v2.strength, 10, "有刀 combatCost=1 → 受伤 -2");

  const v3 = mkState({ strength: 12, mercuryLoad: 10, _currentAnswer: "2红2蓝", _input: "2红1蓝" });
  G.hurtWinOnEnter({ human: true })(v3);
  eq(v3.mercuryLoad, 10, "human:true → 不挂汞（人类对手）");
  eq(v3.hurtByZombie, false, "human:true → 不挂 hurtByZombie");
  eq(v3.strength, 9, "human:true 仍扣体力 -(combatCost+1)");
}

// ================= 6. hurtFleeOnEnter =================
console.log("\n=== 6. hurtFleeOnEnter 受伤-跑路档 ===");
{
  const v1 = mkState({ strength: 12, chasedByZombies: 0, _currentAnswer: "2红2蓝", _input: "2红1蓝" });
  G.hurtFleeOnEnter({ chase: 1 })(v1);
  eq(v1.strength, 10, "跑路体力固定 -2");
  eq(v1.chasedByZombies, 1, "追兵 +1");
  eq(v1.hurtByZombie, true, "跑路也挂 hurtByZombie");

  const v2 = mkState({ strength: 12, chasedByZombies: 1, _currentAnswer: "2红2蓝", _input: "2红1蓝" });
  G.hurtFleeOnEnter({ chase: 0 })(v2);
  eq(v2.chasedByZombies, 1, "chase:0 → 不加追兵（如旋转门场景已自带）");

  const v3 = mkState({ strength: 12, chasedByZombies: 0, _currentAnswer: "2红2蓝", _input: "2红1蓝" });
  G.hurtFleeOnEnter({})(v3);
  eq(v3.chasedByZombies, 1, "chase 缺省 → 默认 +1");
}

// ================= 7. hurtCostText =================
console.log("\n=== 7. hurtCostText 受伤提示（读后清除）===");
{
  const v1 = mkState({ strength: 7, _lastCombatDrain: 3 });
  v1.mercuryLoad = 0;
  const t1 = G.hurtCostText(v1);
  ok("含体力提示：" + (/体力-3/.test(t1) ? "是" : "否（缺）"));
  eq(v1._lastCombatDrain, 0, "读后清除 _lastCombatDrain");
  ok("含抓伤状态行：" + (/被丧尸抓伤/.test(t1) ? "是" : "否（缺）"));

  const v2 = mkState({ strength: 7, _lastCombatDrain: 2 });
  const t2 = G.hurtCostText(v2, false);
  eq(/被丧尸抓伤/.test(t2), false, "withWound=false → 不播抓伤（人类对手）");
  ok("仍含体力提示：" + (/体力-2/.test(t2) ? "是" : "否（缺）"));
}

console.log("\n============================================================");
console.log("结果：" + pass + " 通过 / " + fail + " 失败");
if (fail > 0) process.exit(1);
