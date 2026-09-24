/**
 * bag_migration_repro.js —— 背包容量「旧存档迁移」缺陷复现（无头真实引擎）
 *
 * 背景：2026-09-21 13:00 提交 f9888a5 把背包体系从
 *   旧：bagVolume 是可写普通变量（拾取 add:{bagVolume:1} / 丢弃 add:{bagVolume:-1}）
 *       hasBag = 「是否有任意扩容容器」的唯一标志（帆布袋 / 双肩包 / 书包共用）
 *   新：bagVolume 变成派生值 3 + _bagTier + _bagExtra
 *       hasBag 只剩「帆布袋」语义；双肩包 / 书包 改走 _bagTier
 * 但 SAVE_VERSION 自 09-09 起恒为 1（未随本改造 bump）→ 旧档会被**照常加载**而不是弃档。
 *
 * 复现结论（见输出）：
 *   ① 新开局不变量成立：hasBag=true ⇒ _bagExtra>=1，-1 不可达
 *   ② 旧档经 applySave 的两步（fillMissingDefaults + refreshComputed）后，
 *      容量从实打实的 4 静默掉到 3 —— 玩家"还能再捡一个"的判断落空
 *   ③ 此后点「丢下帆布袋」（showCondition=hasBag，旧档为 true 所以**可见**），
 *      _bagExtra 由 0 减到 -1、容量再掉到 2 —— 与实测现象完全一致
 *   ④ 旧档是双肩包/书包时同样掉容量（同一根因的另一面：+1 变 +0、+2 变 +0）
 *
 * 用法：node tools/bag_migration_repro.js
 *   期望：第 1 组全 ok；第 2/3/4 组打出 BUG 行（= 缺陷复现成功），退出码 0
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = process.cwd();

// ---------- DOM / 环境桩（与 mercury_engine_e2e.js 同一套） ----------
function mkEl() {
  const el = {
    style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    appendChild(c) { el.children.push(c); return c; }, removeChild() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, focus() {}, blur() {},
    scrollTo() {}, getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
    innerHTML: "", textContent: "", value: "", offsetWidth: 0, clientWidth: 0,
  };
  return el;
}
const doc = {
  getElementById: () => mkEl(), createElement: () => mkEl(), createTextNode: () => ({}),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  body: mkEl(), documentElement: mkEl(), head: mkEl(),
};
const store = {};
const sandbox = {
  console, Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Set, Map, Date, RegExp, Error, Function, Promise, setTimeout, clearTimeout,
};
sandbox.document = doc;
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = function () {};
sandbox.removeEventListener = function () {};
sandbox.navigator = { userAgent: "node" };
sandbox.location = { href: "http://localhost/", reload() {} };
sandbox.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};
sandbox.performance = { now: () => Date.now() };
sandbox.requestAnimationFrame = (f) => setTimeout(f, 0);
sandbox.cancelAnimationFrame = clearTimeout;
vm.createContext(sandbox);

// 剧情文件清单唯一权威 = tools/story_files.js（见项目 MEMORY 约定）
const STORY_FILES = require("./story_files").list();
const load = (f) => {
  const abs = path.join(ROOT, f);
  try { vm.runInContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: f }); return true; }
  catch (e) { console.log("  载入失败 " + f + " :: " + e.message); return false; }
};
for (const f of STORY_FILES) load(f);
load("engine.js");

// utils.js 顶层函数在浏览器里是全局的，但 vm 沙箱里必须显式挂到 globalThis —— 否则
// evaluateExpr 的 new Function 会假报 "fatigueTier is not defined"（审计已知坑，非游戏 bug）。
// ⚠ 必须在 load("engine.js") 之后再挂（engine.js 定义期就会调 applyReactive），见 mercury_leak_guard.js:94。
vm.runInContext(
  "['fatigueTier','fmtStrength','canSee','mercuryTier','mercuryPainNote','hasFood','meleeWeaponTier'," +
  "'meleeWeaponName','heavyWeaponName','cuttingToolName','zombieAtHomeDoor','zombieOutsideHome'," +
  "'hasNoTransportation','hasMeleeWeapon','describeZombieWave','tryBreakWeapon','weaponBrokeText'," +
  "'combatDrain','combatDrainText','restRecover','updateTime','updateWeather','sprintAway','timeImage'," +
  "'initMemoryGame','travelScene'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){} });",
  sandbox
);
// 静音引擎的初始化日志（否则满屏变量转储）
sandbox.console = Object.assign({}, console, { log() {}, warn() {}, error() {} });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("   ok    " + m); } else { fail++; console.log("   FAIL  " + m); } };
// defect：条件为真 = 缺陷在场
const defect = (c, m) => { if (c) { fail++; console.log("   BUG   " + m); } else { pass++; console.log("   ok    " + m); } };
const bugCount = () => fail;

// ============================================================
console.log("=== 1) 新开局：不变量 hasBag=true ⇒ _bagExtra>=1（-1 不可达） ===");
const fresh = vm.runInContext(`(function(){
  initGameState(); applyReactive();
  var r = { init: { bagVolume: gameState.bagVolume, _bagExtra: gameState._bagExtra, hasBag: gameState.hasBag } };
  // 真实拾取效果（直接从 storyData 取，避免手抄失真）
  var pick = storyData["安盛街-文具店铁柜"].choices.filter(function(c){ return c.text === "拿走帆布袋"; })[0];
  r.pickCountsItem = !!(pick.effect && (pick.effect.set && pick.effect.set.itemCount) || (pick.effect.add && pick.effect.add.itemCount));
  applyEffect(pick.effect);
  r.afterPick = { bagVolume: gameState.bagVolume, _bagExtra: gameState._bagExtra, hasBag: gameState.hasBag };
  // 真实丢弃效果（整理整理）
  var drop = storyData["整理整理"].choices.filter(function(c){ return c.text === "丢下帆布袋"; })[0];
  applyEffect(drop.effect);
  r.afterDrop = { bagVolume: gameState.bagVolume, _bagExtra: gameState._bagExtra, hasBag: gameState.hasBag };
  return r;
})()`, sandbox);
console.log("     初始        " + JSON.stringify(fresh.init));
console.log("     拾取帆布袋  " + JSON.stringify(fresh.afterPick));
console.log("     丢下帆布袋  " + JSON.stringify(fresh.afterDrop));
ok(fresh.init.bagVolume === 3 && fresh.init._bagExtra === 0, "初始：容量 3 / _bagExtra 0");
ok(fresh.afterPick.bagVolume === 4 && fresh.afterPick._bagExtra === 1, "拾取后：容量 4 / _bagExtra 1");
ok(fresh.afterDrop.bagVolume === 3 && fresh.afterDrop._bagExtra === 0, "丢弃后：容量 3 / _bagExtra 回到 0（新开局不会变负）");
ok(!fresh.pickCountsItem, "帆布袋拾取不占 itemCount（附件语义）——玩家 3 件占格物品 + 帆布袋 = itemCount 3");

// ============================================================
console.log("\n=== 2) 旧档（f9888a5 之前）：hasBag=true + bagVolume=4，无 _bagTier/_bagExtra ===");
const oldSave = vm.runInContext(`(function(){
  initGameState(); applyReactive();
  // 造一份"改造前"的存档状态：删掉改造后才存在的键，容量是实打实的 4
  delete gameState._bagTier;
  delete gameState._bagExtra;
  delete gameState.hasBackpack;
  delete gameState.hasSchoolbag;
  gameState.hasBag    = true;    // 旧语义：有帆布袋
  gameState.bagVolume = 4;       // 旧语义：可写普通变量
  // 玩家实测携带物：帆布袋（附件，不占格）+ 轿车钥匙 + 手电筒 + 水瓶
  gameState.hasCarKey = true;
  gameState.hasTorch  = true;
  gameState.hasBottle = true;
  gameState.itemCount = 3;       // 三件占格物品
  var before = { bagVolume: gameState.bagVolume, itemCount: gameState.itemCount, hasBag: gameState.hasBag };

  // ==== 复刻 applySave 的两步（engine.js:1410 / 1415）====
  fillMissingDefaults(gameState);
  refreshComputed();
  var after = { bagVolume: gameState.bagVolume, _bagExtra: gameState._bagExtra, _bagTier: gameState._bagTier };

  var drop = storyData["整理整理"].choices.filter(function(c){ return c.text === "丢下帆布袋"; })[0];
  return {
    before: before,
    after: after,
    canPick: gameState.itemCount < gameState.bagVolume,          // 玩家想捡东西
    dropVisible: checkCondition(drop.showCondition, gameState)   // 丢弃选项可见性
  };
})()`, sandbox);
console.log("     迁移前（存档里存的）  " + JSON.stringify(oldSave.before));
console.log("     迁移后（补默认值+重算）" + JSON.stringify(oldSave.after));
defect(oldSave.after.bagVolume !== 4,
  "容量 4 → " + oldSave.after.bagVolume + "：静默掉 1 格（_bagExtra 被填成 " + oldSave.after._bagExtra + "，而不是 1）");
defect(!oldSave.canPick,
  "itemCount " + oldSave.before.itemCount + " < bagVolume " + oldSave.after.bagVolume + " = " + oldSave.canPick +
  " → 玩家『还能再捡一个』的判断落空（预期 true）");
ok(oldSave.dropVisible, "「丢下帆布袋」对旧档可见（showCondition=hasBag 为 true）——所以玩家点得到");

// ============================================================
console.log("\n=== 3) 旧档玩家点「丢下帆布袋」→ _bagExtra 减到 -1 ===");
const afterDrop = vm.runInContext(`(function(){
  var drop = storyData["整理整理"].choices.filter(function(c){ return c.text === "丢下帆布袋"; })[0];
  applyEffect(drop.effect);
  var a = { bagVolume: gameState.bagVolume, _bagExtra: gameState._bagExtra, hasBag: gameState.hasBag, itemCount: gameState.itemCount };
  var k = storyData["整理整理"].choices.filter(function(c){ return c.text === "丢下车钥匙"; })[0];
  if (k) applyEffect(k.effect);
  var b = { bagVolume: gameState.bagVolume, itemCount: gameState.itemCount,
            canPick: gameState.itemCount < gameState.bagVolume };
  return { a: a, b: b, hadCarKeyOption: !!k };
})()`, sandbox);
console.log("     丢帆布袋后      " + JSON.stringify(afterDrop.a));
console.log("     再丢车钥匙后    " + JSON.stringify(afterDrop.b));
ok(afterDrop.hadCarKeyOption, "「丢下车钥匙」选项存在（玩家实测丢的就是它）");
defect(afterDrop.a._bagExtra === -1, "_bagExtra = " + afterDrop.a._bagExtra + " ← 控制台看到的 -1（应为 0）");
defect(afterDrop.a.bagVolume !== 2, "容量掉到 " + afterDrop.a.bagVolume + "（3 + _bagExtra(-1) = 2，比合理的 3 再少 1）");
defect(!afterDrop.b.canPick,
  "再丢钥匙后 itemCount " + afterDrop.b.itemCount + " < bagVolume " + afterDrop.b.bagVolume +
  " = " + afterDrop.b.canPick + " → 仍捡不了，与实测一致");

// ============================================================
console.log("\n=== 4) 旧档是双肩包 / 书包时同样掉容量（同一根因的另一面） ===");
const otherBags = vm.runInContext(`(function(){
  function mk(oldVol){
    initGameState(); applyReactive();
    delete gameState._bagTier; delete gameState._bagExtra;
    delete gameState.hasBackpack; delete gameState.hasSchoolbag;
    gameState.hasBag = true;      // 旧语义：有"某个"扩容容器（分不清是哪种）
    gameState.bagVolume = oldVol;
    return gameState;
  }
  var s1 = mk(4); fillMissingDefaults(s1); refreshComputed();
  var r1 = { 旧容量: 4, 迁移后: s1.bagVolume };
  var s2 = mk(5); fillMissingDefaults(s2); refreshComputed();
  var r2 = { 旧容量: 5, 迁移后: s2.bagVolume };
  return { backpack: r1, schoolbag: r2 };
})()`, sandbox);
console.log("     旧档有双肩包  " + JSON.stringify(otherBags.backpack));
console.log("     旧档有书包    " + JSON.stringify(otherBags.schoolbag));
defect(otherBags.backpack.迁移后 !== 4, "双肩包档：应 4，实际 " + otherBags.backpack.迁移后 + "（掉 1）");
defect(otherBags.schoolbag.迁移后 !== 5, "书包档：应 5，实际 " + otherBags.schoolbag.迁移后 + "（掉 2）");

// ============================================================
console.log("\n=== 5) 修复方案效果预演（改前先看数，代码未改） ===");
const fixPreview = vm.runInContext(`(function(){
  initGameState(); applyReactive();
  function oldState(oldVol){
    delete gameState._bagTier; delete gameState._bagExtra;
    delete gameState.hasBackpack; delete gameState.hasSchoolbag;
    gameState.hasBag = true; gameState.bagVolume = oldVol; gameState.itemCount = 3;
    return gameState;
  }
  // 方案A：迁移时把"有 hasBag 但无 _bagExtra/_bagTier"判为帆布袋 → _bagExtra=1
  oldState(4);
  fillMissingDefaults(gameState); refreshComputed();
  if (gameState.hasBag && !gameState._bagExtra && !gameState._bagTier) gameState._bagExtra = 1;
  refreshComputed();
  var A = gameState.bagVolume;

  // 方案A-丢袋子后
  var drop = storyData["整理整理"].choices.filter(function(c){ return c.text === "丢下帆布袋"; })[0];
  applyEffect(drop.effect);
  var Adrop = { bagVolume: gameState.bagVolume, _bagExtra: gameState._bagExtra };

  // 方案B：只给 _caps._bagExtra 加 min:0（治负数不治缩水）
  initGameState(); applyReactive();
  oldState(4);
  fillMissingDefaults(gameState); refreshComputed();
  var B = gameState.bagVolume;   // 仍 3
  return { A: A, Adrop: Adrop, B: B };
})()`, sandbox);
console.log("     方案A（迁移成帆布袋 _bagExtra=1）→ 容量 " + fixPreview.A + "，丢袋后 " + JSON.stringify(fixPreview.Adrop));
console.log("     方案B（_caps 加 min:0，只防负数）  → 容量仍 " + fixPreview.B + "（缩水未解）");
ok(fixPreview.A === 4 && fixPreview.Adrop._bagExtra === 0,
  "方案A 能同时修好缩水与负数（容量 4，丢袋后 _bagExtra 回 0）");
ok(fixPreview.B === 3, "方案B 确认只挡住 -1，容量缩水仍在（需权衡）");

console.log("\n────────────────────────────────────────");
console.log("结果：" + pass + " 通过 / " + fail + " 失败");
console.log("其中 BUG 行数 = " + fail + "（第 2/3/4 组；第 1 组全 ok = 新开局无此缺陷）");
