// mercury_engine_e2e.js —— 汞系统「真实引擎链路」端到端验证
//
// 与 tools/mercury_selftest.js 的分工：
//   mercury_selftest.js  —— 只载 utils+core，直接调函数/规则，快（37 断言）
//   mercury_engine_e2e.js —— 本文件：无头加载【真实 engine.js + 全部 24 个剧情文件】，
//                            用 DOM 桩跑通 initGameState / applyReactive / applyEffect /
//                            checkCondition / 真实 text 函数，验证"浏览器里会不会真的这样"
//
// 浏览器不可用（playwright 未装 chromium）时的替代方案。已验证 20 断言。
//
// 用法：node tools/mercury_engine_e2e.js    期望「20 通过 / 0 失败」
//
// ⚠ 两个 Node vm 特有的坑（浏览器里不存在，别误判成游戏 bug）：
//   1. engine.js 的 evaluateExpr 用 new Function(...Object.keys(vars)) 求值表达式，
//      该作用域只看得见传入变量 + 全局对象；utils.js 的顶层函数在浏览器里是全局的，
//      在 vm 里必须显式挂到 globalThis（见下方 BIND 列表），否则 fatigueTier 之类假报未定义。
//   2. 直接调 node.choices(vars) 会拿到【全部】选项，showCondition 由引擎另行过滤
//      （engine.js:1026）。验证选项可见性必须自己复刻那次 filter。
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = process.cwd();

function mkEl() {
  const el = {
    style: {}, dataset: {}, children: [], classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
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

const STORY_FILES = (() => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  return [...html.matchAll(/<script src="(story\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
})();

const load = (f) => {
  const abs = path.join(ROOT, f);
  try { vm.runInContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: f }); return true; }
  catch (e) { console.log("  载入失败 " + f + " :: " + e.message); return false; }
};

console.log("=== 载入顺序（按 index.html） ===");
console.log("  剧情文件 " + STORY_FILES.length + " 个");
for (const f of STORY_FILES) load(f);
// engine.js 的 evaluateExpr 用 new Function(...Object.keys(vars)) 求值，
// 该作用域只看得见传入的变量 + 全局对象；utils.js 的顶层函数在浏览器里是全局的，
// Node vm 沙箱里需显式挂到 globalThis，否则 fatigueTier(...) 之类会假报未定义。
vm.runInContext(
  "['fatigueTier','fmtStrength','canSee','mercuryTier','mercuryPainNote','hasFood','meleeWeaponTier'," +
  "'meleeWeaponName','heavyWeaponName','cuttingToolName','zombieAtHomeDoor','zombieOutsideHome'," +
  "'hasNoTransportation','hasMeleeWeapon','describeZombieWave','tryBreakWeapon','weaponBrokeText'," +
  "'combatDrain','combatDrainText','restRecover','updateTime','updateWeather','sprintAway','timeImage'," +
  "'initMemoryGame','travelScene'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){}" +
  "});",
  sandbox
);
const engineOk = load("engine.js");
console.log("  engine.js 载入 " + (engineOk ? "成功" : "失败"));

let okCount = 0, badCount = 0;
const check = (cond, msg) => { if (cond) { okCount++; console.log("  ok  " + msg); } else { badCount++; console.log("  FAIL " + msg); } };

console.log("\n=== 1. 真实引擎初始化 ===");
const boot = vm.runInContext(`(function(){
  try { initGameState(); applyReactive(); } catch(e) { return { err: e.message }; }
  return {
    mercuryLoad: gameState.mercuryLoad,
    tier: gameState.mercuryTier,
    noPain: gameState.noPainSense,
    dim: gameState.hasDimLight,
    cap: JSON.stringify(storyData._caps.mercuryLoad),
    chronicRule: storyData._reactive.rules.some(function(r){return r.id==='mercury-chronic';}),
    hasNoteFn: typeof mercuryPainNote === 'function',
    hasTierFn: typeof mercuryTier === 'function'
  };
})()`, sandbox);
console.log(boot);
check(!boot.err, "initGameState + applyReactive 无异常");
check(boot.mercuryLoad === 0, "初始 mercuryLoad = 0");
check(boot.tier === 0 && boot.noPain === false && boot.dim === false, "初始三档派生变量均为 0/false");
check(boot.cap === '{"min":0,"max":100}', "_caps.mercuryLoad 已注册");

console.log("\n=== 2. _caps 钳制（真实 applyEffect 路径） ===");
const clampRes = vm.runInContext(`(function(){
  gameState.mercuryLoad = 0; applyReactive();
  applyEffect({ add: { mercuryLoad: 500 } });     // 模拟多处裸 add 累加
  var hi = gameState.mercuryLoad;
  applyEffect({ add: { mercuryLoad: -9999 } });
  var lo = gameState.mercuryLoad;
  gameState.mercuryLoad = 0; applyReactive();
  return { hi: hi, lo: lo };
})()`, sandbox);
check(clampRes.hi === 100, "add +500 → 钳到 100（实际 " + clampRes.hi + "）");
check(clampRes.lo === 0, "add -9999 → 钳到 0（实际 " + clampRes.lo + "）");

console.log("\n=== 3. 慢性累积（真实规则链路） ===");
const chronicRes = vm.runInContext(`(function(){
  gameState.mercuryLoad = 0; applyReactive();
  gameState.mercuryLoad = 10; applyReactive();
  gameState._mercuryChronicHour = Math.floor(gameState.gameMinutes / 60);
  var before = gameState.mercuryLoad;
  var beforeMin = gameState.gameMinutes;
  // 推进 3 小时
  gameState.mm += 180; gameState.hh += Math.floor(gameState.mm/60); gameState.mm %= 60;
  applyReactive();
  return { before: before, beforeMin: beforeMin, after: gameState.mercuryLoad, afterMin: gameState.gameMinutes };
})()`, sandbox);
console.log(chronicRes);
check(chronicRes.after - chronicRes.before === 3, "推进 3 小时 → 汞 +3（实际 +" + (chronicRes.after - chronicRes.before) + "）");

console.log("\n=== 4. 未暴露者永不累积（因果链核心） ===");
const noExp = vm.runInContext(`(function(){
  gameState.mercuryLoad = 0; applyReactive();
  gameState.mm += 600; gameState.hh += Math.floor(gameState.mm/60); gameState.mm %= 60;
  applyReactive();
  return gameState.mercuryLoad;
})()`, sandbox);
check(noExp === 0, "load=0 推进 10 小时仍为 0（实际 " + noExp + "）");

console.log("\n=== 5. 受伤文案反转（真实 text 函数） ===");
for (const [load, expectPain] of [[0, true], [45, false]]) {
  const r = vm.runInContext(`(function(){
    gameState.mercuryLoad = ${load}; applyReactive();
    var node = storyData["地铁站-安检区-硬冲"];
    var txt = typeof node.text === 'function' ? node.text(gameState) : node.text;
    return { txt: txt, noPain: gameState.noPainSense };
  })()`, sandbox);
  const got = r.txt.includes("火辣辣") ? "正常痛觉" : (r.txt.includes("不是疼") ? "痛觉消失" : "未命中");
  check(expectPain ? got === "正常痛觉" : got === "痛觉消失", "load=" + load + " → " + got);
}

console.log("\n=== 6. 夜视在暗场景生效（真实 text 函数） ===");
for (const [load, torch, phone, batt, expect] of [
  [0, false, false, 0, "摸黑"], [45, false, false, 0, "夜视"], [0, true, false, 0, "手电"],
  [0, false, true, 50, "手机光"], [0, false, true, 0, "手机没电"],
]) {
  const txt = vm.runInContext(`(function(){
    gameState.mercuryLoad = ${load}; gameState.hasTorch = ${torch};
    gameState.hasPhone = ${phone}; gameState.phoneBattery = ${batt};
    applyReactive();
    return storyData["菜市场-员工通道"].text(gameState);
  })()`, sandbox);
  let got = "其他";
  if (txt.includes("看得清")) got = "手机光/手电";   // 有电的手机与手电筒同走"看得清"分支
  else if (txt.includes("但你看得见")) got = "夜视";
  else if (txt.includes("摸黑往前挪")) got = "手机没电";
  else if (txt.includes("摸黑往前走了几步")) got = "摸黑";
  const expectMap = { "手机光": "手机光/手电", "手电": "手机光/手电" };
  const want = expectMap[expect] || expect;
  check(got === want, "load=" + load + " torch=" + torch + " phone=" + phone + "/" + batt + " → " + got + "（期望 " + want + "）");
}

console.log("\n=== 7. 夜视机制收益：2F椅子选项解锁 ===");
const chairRes = vm.runInContext(`(function(){
  function visible(load){
    // 先置场景/断电状态，再 applyReactive —— 顺序反了会让 canSee 用旧值
    gameState.currentPlace = "新达汇";
    gameState._powerOut = true;
    gameState.hasTorch = false;
    gameState.hasPhone = false;
    gameState.phoneBattery = 0;
    gameState._2f_chairsCleared = false;
    gameState.mercuryLoad = load;
    applyReactive();
    var node = storyData["新达汇-2F北走廊中"];
    var cs = typeof node.choices === 'function' ? node.choices.call(node, gameState) : node.choices;
    // 复刻引擎 engine.js:1026 的 showCondition 过滤（直接调 choices 只会拿到全部选项）
    cs = cs.filter(function(c){ return !c.showCondition || checkCondition(c.showCondition, gameState); });
    var label = cs.map(function(c){return c.text;}).join('|');
    return { label: label, hasChairOpt: (label.indexOf('搬开') >= 0 || label.indexOf('钻到店门口') >= 0), canSee: gameState.canSee, noPain: gameState.noPainSense, dim: gameState.hasDimLight };
  }
  return { low: visible(0), high: visible(45) };
})()`, sandbox);
console.log("低汞:", JSON.stringify(chairRes.low));
console.log("高汞:", JSON.stringify(chairRes.high));
check(chairRes.low.hasChairOpt === false, "低汞断电黑暗中：椅子选项不出现（canSee=" + chairRes.low.canSee + "）");
check(chairRes.high.hasChairOpt === true, "高汞夜视：椅子选项解锁（真实机制收益）");

console.log("\n=== 8. 镜子看到皮肤灰白（20-40 档） ===");
for (const [load, expect] of [[0, false], [25, true]]) {
  const txt = vm.runInContext(`(function(){
    gameState.mercuryLoad = ${load}; applyReactive();
    var n = storyData["新达汇-2F卫生间"];
    return typeof n.text === 'function' ? n.text(gameState) : n.text;
  })()`, sandbox);
  const got = txt.includes("脸是灰的");
  check(got === expect, "load=" + load + " → 镜中灰白描写 " + (got ? "出现" : "不出现"));
}

console.log("\n=== 9. 死亡阈值仍生效 ===");
const trig = vm.runInContext(`JSON.stringify(storyData._globalTriggers.filter(function(t){return t.targetScene==='结局-汞中毒尸变';}))`, sandbox);
check(trig.includes("mercuryLoad >= 70"), "全局触发器 mercuryLoad >= 70 仍在");

console.log("\n结果：" + okCount + " 通过 / " + badCount + " 失败");
process.exit(badCount === 0 ? 0 : 1);
