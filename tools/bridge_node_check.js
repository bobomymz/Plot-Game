// bridge_node_check.js —— 校验「东明路-三林塘桥」新增节点组的结构完整性
// 一次性结构校验（非长期守卫）：可达性 / 无零选项死路 / 跳转目标存在 / 结局成对
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
function mkEl() {
  return {
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, removeChild() {}, setAttribute() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
    scrollTo() {}, getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; },
    innerHTML: "", textContent: "", value: "", offsetWidth: 0, clientWidth: 0,
  };
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
sandbox.document = doc; sandbox.window = sandbox; sandbox.globalThis = sandbox;
sandbox.addEventListener = function () {}; sandbox.removeEventListener = function () {};
sandbox.navigator = { userAgent: "node" };
sandbox.location = { href: "http://localhost/", reload() {} };
sandbox.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, clear: () => {} };
sandbox.performance = { now: () => Date.now() };
sandbox.requestAnimationFrame = (f) => setTimeout(f, 0);
sandbox.cancelAnimationFrame = clearTimeout;
sandbox.console = Object.assign({}, console, { log() {}, warn() {}, error() {} });
vm.createContext(sandbox);

const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const FILES = [...html.matchAll(/<script src="(story\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
for (const f of FILES) load(f);
vm.runInContext(
  "['fatigueTier','fmtStrength','canSee','mercuryTier','mercuryPainNote','mercuryMirrorNote','hasFood','meleeWeaponTier'," +
  "'meleeWeaponName','heavyWeaponName','cuttingToolName','zombieAtHomeDoor','zombieOutsideHome','hasNoTransportation'," +
  "'hasMeleeWeapon','describeZombieWave','tryBreakWeapon','weaponBrokeText','combatDrain','combatDrainText','restRecover'," +
  "'updateTime','updateWeather','sprintAway','timeImage','initMemoryGame','travelScene','describeWeather'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){} });", sandbox);
load("engine.js");
vm.runInContext(
  "['fatigueTier','fmtStrength','canSee','mercuryTier','mercuryPainNote','mercuryMirrorNote','hasFood','meleeWeaponTier'," +
  "'meleeWeaponName','heavyWeaponName','cuttingToolName','zombieAtHomeDoor','zombieOutsideHome','hasNoTransportation'," +
  "'hasMeleeWeapon','describeZombieWave','tryBreakWeapon','weaponBrokeText','combatDrain','combatDrainText','restRecover'," +
  "'updateTime','updateWeather','sprintAway','timeImage','initMemoryGame','travelScene','describeWeather'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){} });", sandbox);

const storyData = vm.runInContext("storyData", sandbox);
const gameState = vm.runInContext("gameState", sandbox);
const applyReactive = vm.runInContext("applyReactive", sandbox);
const checkCondition = vm.runInContext("checkCondition", sandbox);

const NEW = ["东明路-三林塘桥", "东明路-三林塘桥-张望", "东明路-三林塘桥-看水", "结局-三林塘桥-跳河",
             "安盛街-服装店-穿衣镜", "张江-AI岛-水景"];
let ok = 0, bad = 0;
const chk = (c, m) => { if (c) { ok++; console.log("  ok  " + m); } else { bad++; console.log("  FAIL " + m); } };

function collectTargets(scene) {
  const out = [];
  const walk = (c) => {
    if (!c) return;
    if (c.nextScene) out.push(c.nextScene);
    if (c.elseScene) out.push(c.elseScene);
    if (c.timeoutScene) out.push(c.timeoutScene);
    if (Array.isArray(c.choices)) c.choices.forEach(walk);
  };
  if (Array.isArray(scene.choices)) scene.choices.forEach(walk);
  else if (typeof scene.choices === "function") {
    try {
      const cs = scene.choices.call(scene, gameState);
      if (Array.isArray(cs)) cs.forEach(walk);
    } catch (e) {}
  }
  if (scene.qte && scene.qte.onTimeout) out.push(scene.qte.onTimeout);
  return out;
}

console.log("=== 新增节点结构校验 ===");
for (const name of NEW) {
  const s = storyData[name];
  chk(!!s, "场景存在：" + name);
  if (!s) continue;
  // 跳转目标必须都存在（占位符除外）
  const tgts = collectTargets(s).filter((t) => typeof t === "string" && !t.startsWith("{"));
  for (const t of tgts) chk(!!storyData[t], "  " + name + " → " + t + " 存在");
  // 结局节点必须有回炉选项
  if (name.startsWith("结局-")) {
    const cs = typeof s.choices === "function" ? s.choices.call(s, gameState) : s.choices;
    chk(Array.isArray(cs) && cs.length > 0, "  " + name + " 有回炉选项（非死路）");
  }
}

// 桥节点：非追击状态下必须至少有一个可选项（防零选项剧情终止）
console.log("\n=== 桥节点「零选项」防护（chasedByZombies=0）===");
gameState.chasedByZombies = 0;
gameState.mercuryLoad = 0;
try { applyReactive(); } catch (e) {}
const bridge = storyData["东明路-三林塘桥"];
const bcs = typeof bridge.choices === "function" ? bridge.choices.call(bridge, gameState) : bridge.choices;
const visible = (bcs || []).filter((c) => !c.showCondition || checkCondition(c.showCondition, gameState));
chk(visible.length > 0, "东明路-三林塘桥 在无追击时有 " + visible.length + " 个可见选项");

// 看水节点在低汞时也应可用
const water = storyData["东明路-三林塘桥-看水"];
const wcs = typeof water.choices === "function" ? water.choices.call(water, gameState) : water.choices;
chk(Array.isArray(wcs) && wcs.length > 0, "东明路-三林塘桥-看水 低汞时仍有 " + (wcs || []).length + " 个选项");

console.log("\n结果：" + ok + " 通过 / " + bad + " 失败");
process.exit(bad === 0 ? 0 : 1);
