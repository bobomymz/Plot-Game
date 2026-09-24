// save_compat_selftest.js —— 旧存档兼容性回归
//
// 针对的 bug（2026-09-24 实报）：
//   条件表达式出错: _xinOutcome >= 3 && ... ReferenceError: _xinOutcome is not defined
//
// 根因：checkCondition 用 new Function(...Object.keys(gameState)) 求值【字符串条件】。
//   gameState 的键集 = 变量名清单。续玩旧档 / 回溯到旧快照都绕过 initGameState，
//   拿到的是「加新变量之前」写下的状态 → 新变量名不在键集里 → 形参不存在 → ReferenceError
//   → 整条条件吞掉异常返回 false。函数式条件写 vars.xxx 只会拿到 undefined（不报错），
//   所以症状只在字符串条件上冒头，"只有一条报错"是假象。
//
// 修复：engine.js 新增 fillMissingDefaults()，在 applySave（含 historyStack 每一项）与
//   backtrack 三条恢复路径上把 _variables 里新增的键补回初始值。
//
// 本工具用真实 engine.js（无头 DOM 桩）验证修复，不重写引擎逻辑。
// 用法：node tools/save_compat_selftest.js      期望「全部通过」
//
// ⚠ 与 mercury_engine_e2e.js 同款 Node vm 坑：utils.js 顶层函数在浏览器里是全局的，
//   在 vm 里要显式挂 globalThis，否则字符串条件里的 fatigueTier/canSee 之类会假报未定义。
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = process.cwd();

function mkEl() {
  const el = {
    style: {}, dataset: {}, children: [], className: "", id: "",
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

// 捕获沙箱内的 console.error（checkCondition 的报错就打在它上面）
const CAUGHT = [];
const sandbox = {
  console: {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: (...a) => { CAUGHT.push(a.map(String).join(" ")); },
  },
  Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
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
// renderScene → typeText 用 setInterval 逐字输出；本工具只验状态、不验打字机，直接桩成空转
sandbox.setInterval = () => 0;
sandbox.clearInterval = () => {};
vm.createContext(sandbox);

const STORY_FILES = require("./story_files").list();
const load = (f) => {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f }); return true; }
  catch (e) { console.log("  载入失败 " + f + " :: " + e.message); return false; }
};

console.log("=== 载入 ===");
let bad = 0;
for (const f of STORY_FILES) if (!load(f)) bad++;
vm.runInContext(
  "['fatigueTier','fmtStrength','canSee','mercuryTier','mercuryPainNote','hasFood','meleeWeaponTier'," +
  "'meleeWeaponName','heavyWeaponName','cuttingToolName','zombieAtHomeDoor','zombieOutsideHome'," +
  "'hasNoTransportation','hasMeleeWeapon','describeZombieWave','tryBreakWeapon','weaponBrokeText'," +
  "'combatDrain','combatDrainText','restoreRecover','restRecover','updateTime','updateWeather','sprintAway'," +
  "'timeImage','initMemoryGame','travelScene'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){}" +
  "});",
  sandbox
);
if (!load("engine.js")) bad++;
console.log("  剧情文件 " + STORY_FILES.length + " 个，载入失败 " + bad + " 个");
if (bad) { console.log("引擎/剧情未全部载入，后续断言无意义，中止。"); process.exit(1); }

let okCount = 0, failCount = 0;
const check = (cond, msg) => { if (cond) { okCount++; console.log("  ok   " + msg); } else { failCount++; console.log("  FAIL " + msg); } };
const run = (code) => vm.runInContext(code, sandbox);

// ---------------------------------------------------------------- 准备：造一份"加新变量之前"的旧档
console.log("\n=== 1. 旧档模拟（删掉复旦江湾章节新增的键） ===");
const XIN_KEYS = run(`['_xinOfferDay','_xinGone','_xinOutcome','_xinKnowsTruth','_studentsCalled',
  '_xinScratched','_xinPillGiven','_xinTurned','_xinOutcomeDay','_phoneOrigin']`);
check(XIN_KEYS.length === 10, "待删键清单 10 个");

const prep = run(`(function(){
  initGameState(); applyReactive();
  function snap(o){ return JSON.parse(JSON.stringify(o, setReplacer), setReviver); }
  var stale = snap(storyData._variables);
  ${JSON.stringify(XIN_KEYS)}.forEach(function (k) { delete stale[k]; });
  // 造一个"正在建平中学、兜里有药丸"的旧档，让那条报错条件本身的所有前置都成立
  stale.currentArea = '建平中学';
  stale.hasMercuryPill = true;
  stale.itemCount = 2;
  stale.dd = 5; stale.hh = 10; stale.mm = 30;
  var stale2 = snap(stale);            // 历史栈里的一份
  // 找到出问题的那条字符串条件（不硬编码，跟着 core.js 走）
  var cond = null, node = storyData['整理整理'];
  if (node && node.choices) node.choices.forEach(function (c) {
    if (typeof c.showCondition === 'string' && c.showCondition.indexOf('_xinPillGiven') >= 0) cond = c.showCondition;
  });
  return { cond: cond, staleKeys: Object.keys(stale).length, allKeys: Object.keys(storyData._variables).length };
})()`);
check(!!prep.cond, "在 整理整理 里定位到报错条件：" + String(prep.cond).slice(0, 40) + "…");
check(prep.staleKeys === prep.allKeys - 10, "旧档键数 = _variables 键数 - 10（" + prep.staleKeys + " / " + prep.allKeys + "）");

// ---------------------------------------------------------------- 复现：不补齐 → 必炸（对照组，防假绿）
console.log("\n=== 2. 对照组：不补默认值，条件必炸（证明本测试真的能抓到该 bug） ===");
CAUGHT.length = 0;
const rawRes = run(`(function(){
  var stale = (function(){ var s = snapshotState(storyData._variables);
    ${JSON.stringify(XIN_KEYS)}.forEach(function (k) { delete s[k]; });
    s.currentArea='建平中学'; s.hasMercuryPill=true; s.dd=5; return s; })();
  return checkCondition(${JSON.stringify(prep.cond)}, stale);
})()`);
check(CAUGHT.length > 0, "未补齐 → 抛 ReferenceError 被捕获（console.error " + CAUGHT.length + " 条）");
check(CAUGHT.some((s) => s.indexOf("_xinOutcome is not defined") >= 0), "报错文本确为 _xinOutcome is not defined");
check(rawRes === false, "异常被 checkCondition 吞成 false（选项静默消失，这就是玩家看到的现象）");

// ---------------------------------------------------------------- 修复后：走真实 loadSave → applySave
console.log("\n=== 3. 修复后：真实 loadSave() + applySave() 链路 ===");
const restore = run(`(function(){
  var s = snapshotState(storyData._variables);
  ${JSON.stringify(XIN_KEYS)}.forEach(function (k) { delete s[k]; });
  s.currentArea='建平中学'; s.hasMercuryPill=true; s.itemCount=2;
  s.dd=5; s.hh=10; s.mm=30; s.strength=42; s._visit={'整理整理':2}; s._lastScene='三林路';
  localStorage.setItem('shichaobiji_save_v1', JSON.stringify({
    version: 1, savedAt: 1, sceneId: '整理整理',
    gameState: s,
    historyStack: [{ sceneId: '整理整理', gameState: JSON.parse(JSON.stringify(s, setReplacer), setReviver) }],
    reactiveState: {}
  }, setReplacer));
  var saved = loadSave();
  if (!saved) return { err: 'loadSave 返回 null' };
  applySave(saved);
  var missing = [];
  for (var k in storyData._variables) if (!(k in gameState)) missing.push(k);
  var missingC = [];
  var computed = (storyData._reactive && storyData._reactive.computed) || {};
  for (var k3 in computed) if (!(k3 in gameState)) missingC.push(k3);
  var histMissing = [];
  if (historyStack[0]) for (var k2 in storyData._variables) if (!(k2 in historyStack[0].gameState)) histMissing.push(k2);
  return {
    missing: missing, missingC: missingC, histMissing: histMissing,
    computedCount: Object.keys(computed).length,
    dd: gameState.dd, area: gameState.currentArea, pill: gameState.hasMercuryPill,
    strength: gameState.strength, lastScene: gameState._lastScene,
    visit: (gameState._visit || {})['整理整理'],
    xinOutcome: gameState._xinOutcome, xinOffer: gameState._xinOfferDay,
    bagVolume: gameState.bagVolume, noPain: gameState.noPainSense,
    gameMinutes: gameState.gameMinutes, canSee: typeof gameState.canSee,
    hasFill: typeof fillMissingDefaults === 'function',
    hasRefresh: typeof refreshComputed === 'function'
  };
})()`);
check(restore.hasFill, "engine.js 已提供 fillMissingDefaults()");
check(restore.hasRefresh, "engine.js 已提供 refreshComputed()");
check(!restore.err, "loadSave 读到旧档（" + (restore.err || "正常") + "）");
check(restore.missing.length === 0, "gameState 键集补齐，缺失 0 个" + (restore.missing.length ? "（缺 " + restore.missing.join(",") + "）" : ""));
check(restore.histMissing.length === 0, "historyStack 里的旧快照同样补齐，缺失 0 个");
check(restore.missingC.length === 0, "派生变量（computed " + restore.computedCount + " 个）已重算，缺失 0 个"
  + (restore.missingC.length ? "（缺 " + restore.missingC.join(",") + "）" : ""));
check(restore.bagVolume === 3 && restore.noPain === false && restore.gameMinutes > 0,
  "派生值算对（bagVolume=3 / noPainSense=false / gameMinutes=" + restore.gameMinutes + "）");
check(restore.dd === 5 && restore.area === "建平中学" && restore.pill === true, "旧档已有值未被覆盖（dd/currentArea/hasMercuryPill）");
check(restore.strength === 42 && restore.lastScene === "三林路" && restore.visit === 2, "其余状态位原样保留（strength/_lastScene/_visit）");
check(restore.xinOutcome === 0 && restore.xinOffer === 0, "新变量取 _variables 初值（_xinOutcome=0 未入章）");

CAUGHT.length = 0;
const condAfter = run(`checkCondition(${JSON.stringify(prep.cond)}, gameState)`);
check(CAUGHT.length === 0 && condAfter === false, "同一条件现在无报错、返回 false（选项正确隐藏而非报错）");

// ---------------------------------------------------------------- 全库扫描：补齐后 0 报错
console.log("\n=== 4. 全库字符串条件 × 旧档恢复后的状态（扫全部 condition* 字符串） ===");
const sweep = run(`(function(){
  var conds = [];
  (function walk(node, depth){
    if (!node || typeof node !== 'object' || depth > 12) return;
    if (Array.isArray(node)) { node.forEach(function(n){ walk(n, depth+1); }); return; }
    for (var k in node) {
      var v = node[k];
      if (typeof v === 'string' && /condition$/i.test(k)) conds.push({ where: k, expr: v });
      else walk(v, depth+1);
    }
  })(storyData, 0);
  return conds;
})()`);
CAUGHT.length = 0;
const sweepErrBefore = [];
for (let i = 0; i < sweep.length; i++) {
  CAUGHT.length = 0;
  run(`(function(){ var __r = checkCondition(${JSON.stringify(sweep[i].expr)}, gameState); return __r; })()`);
  if (CAUGHT.length) sweepErrBefore.push(sweep[i].expr);
}
console.log("  扫到字符串条件 " + sweep.length + " 条；补齐后求值报错 " + sweepErrBefore.length + " 条");
sweepErrBefore.slice(0, 5).forEach((e) => console.log("    · " + e));
check(sweep.length > 50, "条件条数 " + sweep.length + " > 50（确认没扫空）");
check(sweepErrBefore.length === 0, "旧档补齐后全库字符串条件 0 报错");

// ---------------------------------------------------------------- 对照组：同一轮扫描跑在未补齐状态上
console.log("\n=== 5. 对照组：同一轮扫描跑在未补齐的旧档上 ===");
CAUGHT.length = 0;
run(`(function(){
  var s = snapshotState(storyData._variables);
  ${JSON.stringify(XIN_KEYS)}.forEach(function (k) { delete s[k]; });
  s.currentArea='建平中学'; s.hasMercuryPill=true; s.dd=5;
  ${JSON.stringify(sweep.map((c) => c.expr))}.forEach(function (e) { checkCondition(e, s); });
})()`);
check(CAUGHT.length > 0, "未补齐状态下同轮扫描报错 " + CAUGHT.length + " 条 → 第 4 节的「0 报错」确实来自修复");

// ---------------------------------------------------------------- 回溯路径
console.log("\n=== 6. 回溯路径：历史栈里塞一份未补齐的旧快照 ===");
const bt = run(`(function(){
  var s = snapshotState(storyData._variables);
  ${JSON.stringify(XIN_KEYS)}.forEach(function (k) { delete s[k]; });
  s.dd = 7; s.currentArea = '三林路'; s.strength = 33;
  historyStack = [{ sceneId: '整理整理', gameState: s, reactiveState: {} }];
  currentScene = '整理整理';
  backtrack();
  var missing = [];
  for (var k in storyData._variables) if (!(k in gameState)) missing.push(k);
  var computed = (storyData._reactive && storyData._reactive.computed) || {};
  var missingC = [];
  for (var k3 in computed) if (!(k3 in gameState)) missingC.push(k3);
  return { missing: missing, missingC: missingC, dd: gameState.dd, strength: gameState.strength,
           xinOutcome: gameState._xinOutcome, n: historyStack.length };
})()`);
check(bt.missing.length === 0, "回溯后键集补齐，缺失 0 个（缺 " + bt.missing.join(",") + "）");
check(bt.missingC.length === 0, "回溯后派生变量补齐，缺失 0 个（缺 " + bt.missingC.join(",") + "）");
check(bt.dd === 7 && bt.strength === 33, "回溯后旧值保留（dd=7 / strength=33）");
check(bt.xinOutcome === 0, "回溯后新变量为初值");
check(bt.n === 0, "历史栈正常出栈");

// ---------------------------------------------------------------- 回归：新开局不受影响
console.log("\n=== 7. 回归：全新开局键集不变（修复不改变新局行为） ===");
const fresh = run(`(function(){
  initGameState(); applyReactive();
  var missing = [];
  for (var k in storyData._variables) if (!(k in gameState)) missing.push(k);
  var extra = [];
  for (var k2 in gameState) if (!(k2 in storyData._variables)) extra.push(k2);
  return { missing: missing, extra: extra, xinOutcome: gameState._xinOutcome, dd: gameState.dd };
})()`);
check(fresh.missing.length === 0, "新开局无缺失键");
check(fresh.xinOutcome === 0 && fresh.dd === 1, "新开局 _xinOutcome=0 / dd=1");
console.log("  引擎运行时自有键（非 _variables）：" + fresh.extra.join(", "));

console.log("\n=== 结果：" + okCount + " 通过 / " + failCount + " 失败 ===");
process.exit(failCount ? 1 : 0);
