// 回溯落点 = 历史里「最近、且当时有 ≥2 个可行选项」的节点 —— 回归自测
//
// 需求（2026-10-01 波波提出）：
//   旧行为：回溯一律落到栈顶（上一个节点）。链状剧情里上一个节点常常只有唯一出口，
//   玩家回溯回去只能再点同一条路、原样走回死亡点，回溯等于没用。
//   新行为：从栈顶往下找第一条「当时确实有 ≥2 个选项可选」的历史，落到那里。
//
// 判定必须用【该条历史自带的 gameState 快照】，不能用当前 gameState：
//   选项可见性随状态变化（去过一次就没了、要带工具才有），只有当时的状态才知道当时有几个选项。
//
// 本脚本无头加载【真实 engine.js + 全部剧情文件】（DOM 桩，骨架同 tools/mercury_engine_e2e.js），
// 直接调引擎里的真函数 countSceneChoices / findBacktrackIndex / backtrack，不复制一份逻辑来测。
//
// 用法： node tools/backtrack_target_selftest.js
// 期望： 「结果：N 通过 / 0 失败」
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
process.chdir(ROOT);

let FILES;
try { FILES = require("./story_files").list(); }
catch (e) { console.error("无法读取 story_files 清单：" + e.message); process.exit(2); }

// ---------- DOM 桩 ----------
function mkEl() {
  const el = {
    style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    appendChild(c) { el.children.push(c); return c; },
    removeChild() {}, remove() {},
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, blur() {}, scrollTo() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
    // ⚠ className 必须有初值：applyScreenEffects 直接拿 overlay.className.indexOf(...)，undefined 会崩
    className: "",
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
// ⚠ 必须是【独立对象】，不能写 sandbox.console = console 之后再改 console.log ——
//   那会把外层 Node 的 console.log 一起改掉，本脚本自己的输出全部消失（假绿：脚本实则已跑完）。
const NOOP_CONSOLE = { log() {}, warn() {}, error() {}, info() {}, debug() {}, table() {} };
const sandbox = {
  console: NOOP_CONSOLE, Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Set, Map, Date, RegExp, Error, Promise, setTimeout, clearTimeout,
};
// ⚠ 故意不传外层 Function：engine.js 用 new Function(...) 求值字符串表达式，
//   只有 vm 自己的 Function，其全局作用域才等于本沙箱（浏览器里 utils.js 顶层函数是全局的）。
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
// 选项文本走 sanitizeInlineHtml（DOMParser）。桩成"原样返回"，够跑通 renderChoices 的选项计数。
sandbox.DOMParser = function () {
  this.parseFromString = function (s) {
    return { getElementById: () => ({ childNodes: [], innerHTML: s, removeChild() {}, appendChild() {} }) };
  };
};
vm.createContext(sandbox);

let loadFail = 0;
const load = (f) => {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log("  缺失 " + f); loadFail++; return false; }
  try { vm.runInContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: f }); return true; }
  catch (e) { console.log("  载入失败 " + f + " :: " + e.message); loadFail++; return false; }
};
const S = (code) => vm.runInContext(code, sandbox);

console.log("=== 载入（按 index.html 顺序，共 " + FILES.length + " 个剧情文件） ===");
for (const f of FILES) load(f);
const engineOk = load("engine.js");
console.log("  engine.js 载入 " + (engineOk ? "成功" : "失败"));

let okCount = 0, badCount = 0;
const check = (cond, msg) => {
  if (cond) { okCount++; console.log("  ok   " + msg); }
  else { badCount++; console.log("  FAIL " + msg); }
};

if (!engineOk || loadFail) { console.log("\n载入阶段就失败，后续断言无意义"); process.exit(1); }

// engine.js 的 new Function 作用域里要能看见 utils.js 的顶层函数（浏览器里天然全局）
S(
  "['fatigueTier','fmtStrength','canSee','mercuryTier','mercuryPainNote','hasFood','meleeWeaponTier'," +
  "'meleeWeaponName','heavyWeaponName','cuttingToolName','zombieAtHomeDoor','zombieOutsideHome'," +
  "'hasNoTransportation','hasMeleeWeapon','describeZombieWave','tryBreakWeapon','weaponBrokeText'," +
  "'combatDrain','combatDrainText','restRecover','updateTime','updateWeather','sprintAway','timeImage'," +
  "'initMemoryGame','travelScene','restTidyChoice','restTidyGuard'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){}" +
  "});"
);
//（引擎日志在载入阶段已被 NOOP_CONSOLE 静音，这里不用再覆盖 console）

// ---------- 0. 引擎里两个新函数必须在位 ----------
console.log("\n=== 0. 引擎侧接口 ===");
const api = S("({cc: typeof countSceneChoices, fi: typeof findBacktrackIndex, cap: typeof BACKTRACK_SCAN_CAP === 'undefined' ? null : BACKTRACK_SCAN_CAP})");
check(api.cc === "function", "countSceneChoices 存在（实际 " + api.cc + "）");
check(api.fi === "function", "findBacktrackIndex 存在（实际 " + api.fi + "）");
check(api.cap !== null && api.cap > 0, "BACKTRACK_SCAN_CAP 已定义（实际 " + api.cap + "）");

// ---------- 1. 选真实场景当样本：枢纽(≥3) / 链节点(1) / 结局(0) ----------
console.log("\n=== 1. 挑样本场景（真实剧情数据，初始状态） ===");
S("initGameState(); applyReactive();");
const samples = S(`(function(){
  var st = snapshotState(gameState);
  var hub = null, chain = null, ending = null, dist = {c0:0,c1:0,c2:0,c3:0};
  for (var id in storyData) {
    if (id.charAt(0) === '_') continue;
    var n = storyData[id];
    if (!n || typeof n !== 'object') continue;
    if (n.qte) continue;                       // QTE 场景另走分支，本测试用普通场景
    var c = countSceneChoices(id, st);
    if (c === 0) dist.c0++; else if (c === 1) dist.c1++; else if (c === 2) dist.c2++; else dist.c3++;
    if (c >= 3 && !hub) hub = id;
    if (c === 1 && !chain) chain = id;
    if (c === 0 && !ending && id.indexOf('结局') === 0) ending = id;
  }
  return { hub: hub, chain: chain, ending: ending, dist: dist };
})()`);
console.log("  样本：枢纽=" + samples.hub + " / 链节点=" + samples.chain + " / 结局=" + samples.ending);
console.log("  初始状态下各场景可见选项数分布：0个=" + samples.dist.c0 + "  1个=" + samples.dist.c1 +
            "  2个=" + samples.dist.c2 + "  ≥3个=" + samples.dist.c3);
check(!!samples.hub && !!samples.chain && !!samples.ending, "三类样本场景都找得到");

// ---------- 2. 落点选择（核心断言） ----------
console.log("\n=== 2. findBacktrackIndex 的落点 ===");
S(`
  function mkStack(ids) {
    historyStack = ids.map(function (id) {
      return { sceneId: id, gameState: snapshotState(gameState), reactiveState: {} };
    });
    return historyStack.length;
  }
  var HUB = ${JSON.stringify(samples.hub)}, CHAIN = ${JSON.stringify(samples.chain)}, END = ${JSON.stringify(samples.ending)};
`);
const idxOf = (ids) => S("mkStack(" + JSON.stringify(ids) + "); findBacktrackIndex()");

check(idxOf([samples.hub]) === 0, "A. 只有枢纽 → 落回它（0）");
check(idxOf([samples.hub, samples.chain]) === 0, "B. 栈顶是链节点 → 跳过，落到枢纽（0）");
check(idxOf([samples.hub, samples.chain, samples.chain, samples.chain]) === 0,
      "C. 连续 3 个链节点 → 一路跳过，落到枢纽（0）");
check(idxOf([samples.chain, samples.chain]) === 1, "D. 整条历史都是链 → 退回栈顶（1，旧行为，不至于无处可去）");
check(idxOf([samples.hub, samples.ending]) === 0, "E. 结局/无选项节点永不被选为落点（0）");
check(idxOf([samples.chain, samples.hub, samples.chain]) === 1,
      "F. 取【最近】的多选项节点，不是最早的（1，枢纽在中间）");
check(idxOf([samples.hub, samples.hub, samples.chain]) === 1,
      "G. 多个枢纽时取最近的那个（1）");

// ---------- 3. 扫描上限 ----------
console.log("\n=== 3. BACKTRACK_SCAN_CAP 生效 ===");
const capCases = S(`(function(){
  var cap = BACKTRACK_SCAN_CAP;
  function stackWith(hubAt, total) {
    var ids = [];
    for (var i = 0; i < total; i++) ids.push(i === hubAt ? HUB : CHAIN);
    return ids;
  }
  return {
    cap: cap,
    inside:  (mkStack(stackWith(0, cap)), findBacktrackIndex()),      // 枢纽恰在窗口内
    outside: (mkStack(stackWith(0, cap + 10)), findBacktrackIndex())  // 枢纽被窗口切掉
  };
})()`);
console.log("  cap=" + capCases.cap + "  窗口内落点=" + capCases.inside + "  窗口外落点=" + capCases.outside);
check(capCases.inside === 0, "H. 枢纽在扫描窗口内 → 仍能选中（0）");
check(capCases.outside === capCases.cap + 9, "I. 枢纽在窗口外 → 退回栈顶（" + (capCases.cap + 9) + "，旧行为）");

// ---------- 4. countSceneChoices 与引擎真实渲染的选项数一致 ----------
console.log("\n=== 4. countSceneChoices vs 引擎 renderChoices 实际按钮数 ===");
const cmp = S(`(function(){
  var st = snapshotState(gameState);
  var bad = [], checked = 0;
  for (var id in storyData) {
    if (id.charAt(0) === '_') continue;
    var n = storyData[id];
    if (!n || typeof n !== 'object') continue;
    if (n.qte) continue;                       // QTE 分支另走，且会起定时器
    if (typeof n.choices === 'function') continue;   // 函数式 choices 每次现场生成，只测静态
    if (!n.choices || !n.choices.length) continue;
    if (checked >= 400) break;                 // 抽样上限，别把整库刷满
    var mine = countSceneChoices(id, st);
    choicesArea.children.length = 0;          // ⚠ 桩的 innerHTML="" 不会清 children，必须手动清
    choicesArea.innerHTML = "";
    try { renderChoices(n, id); } catch (e) { continue; }
    var real = choicesArea.children.length;
    checked++;
    if (mine !== real) bad.push({ id: id, mine: mine, real: real });
  }
  return { checked: checked, bad: bad };
})()`);
console.log("  核对 " + cmp.checked + " 个静态 choices 场景");
if (cmp.bad.length) cmp.bad.slice(0, 10).forEach(b => console.log("    差异 " + b.id + "：判定 " + b.mine + " / 实际 " + b.real));
check(cmp.bad.length === 0, "J. 与引擎真实渲染的选项数完全一致（差异 " + cmp.bad.length + " 处）");

// ---------- 5. backtrack 真跑一次：落点 = 枢纽，且多余历史被丢弃 ----------
console.log("\n=== 5. 真实 backtrack() ===");
const bt = S(`(function(){
  try {
    initGameState(); applyReactive();
    gameState.__probeHub = 1;                        // 打标记：落点应还原成【快照里】的状态
    mkStack([HUB, CHAIN, CHAIN]);
    var snapHas = historyStack[0].gameState.__probeHub;
    gameState.__probeHub = 99;                       // 当前状态改脏
    currentScene = END;
    backtrack();
    return { err: null, scene: currentScene, len: historyStack.length, probe: gameState.__probeHub, snapHas: snapHas };
  } catch (e) { return { err: e.message, stack: String(e.stack || '').split(String.fromCharCode(10)).slice(0, 8) }; }
})()`);
if (bt.err) {
  console.log("  DOM 桩跑不动 renderScene：" + bt.err);
  (bt.stack || []).forEach(l => console.log("    " + l.trim()));
  check(false, "K. 真实 backtrack() 跑到落地（桩不足，需人工确认）");
} else {
  console.log("  落点场景=" + bt.scene + "  剩余历史=" + bt.len + "  __probeHub=" + bt.probe + "（快照值 " + bt.snapHas + "）");
  check(bt.scene === samples.hub, "K. backtrack 落到枢纽场景（" + bt.scene + "）");
  check(bt.len === 0, "L. 落点及其后的历史一并作废（剩余 " + bt.len + " 条）");
  check(bt.probe === bt.snapHas, "M. 恢复的是【该条历史自带的快照】，不是当前状态");
}

// ---------- 6. 源码断言：backtrack 已改为截断，不再是 pop ----------
console.log("\n=== 6. 源码守卫 ===");
const engineSrc = fs.readFileSync(path.join(ROOT, "engine.js"), "utf8");
const btStart = engineSrc.indexOf("function backtrack(");
const btBody = btStart < 0 ? "" : engineSrc.slice(btStart, btStart + 1400);
check(/historyStack\.length\s*=\s*idx/.test(btBody), "N. backtrack 用 historyStack.length = idx 截断");
check(!/historyStack\.pop\(\)/.test(btBody), "O. backtrack 不再无脑 pop 栈顶");
check(/findBacktrackIndex\(\)/.test(btBody), "P. backtrack 调用了落点选择");

// ---------- 结论 ----------
console.log("\n===== 结论 =====");
console.log("结果：" + okCount + " 通过 / " + badCount + " 失败");
if (badCount > 0) { console.log("自测未通过"); process.exit(1); }
console.log("全绿：回溯落点 = 历史中最近的、且当时有 ≥2 个可行选项的节点");
process.exit(0);
