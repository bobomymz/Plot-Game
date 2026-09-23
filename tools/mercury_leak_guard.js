// mercury_leak_guard.js —— 汞机制「玩家可见文案泄露」守卫
//
// 背景（2026-09-23，作者拍板）：
//   玩家在【不知道真相】之前，绝不能被正文告知"汞 / 夜视 / 40-70 / 痛觉消失"这套机制。
//   高汞带来的症状必须只以【身体描写】呈现（"这黑本该什么都看不见""伤口本该很疼"），
//   不能出现任何点名机制的字样，否则等于提前剧透核心谜底。
//
// 做法：无头加载真实 engine.js + 全部剧情文件，把 mercuryLoad 推到高档位（45 / 75），
//       逐个渲染所有"已知含汞分支"的场景 text，正则扫描玩家可见字符串。
//
// 判定：
//   P0 = 玩家可见文案里出现 汞 / 夜视 / 痛觉消失 / 40-70 / 甲基汞 / mercuryLoad
//   （注释行不算——引擎不会把 // 渲染给玩家；但为了保险，本脚本只扫渲染结果，天然排除注释）
//
// 用法：node tools/mercury_leak_guard.js
// 期望：0 处 P0

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

// ---------- DOM 桩 ----------
function mkEl() {
  const el = {
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, removeChild() {}, setAttribute() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
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
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f }); return true; }
  catch (e) { console.log("  ❌ 载入失败 " + f + " :: " + e.message); return false; }
};

for (const f of STORY_FILES) load(f);
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
if (!load("engine.js")) { console.log("❌ engine.js 载入失败，退出"); process.exit(1); }

const storyData = vm.runInContext("storyData", sandbox);
const initGameState = vm.runInContext("initGameState", sandbox);
const applyReactive = vm.runInContext("applyReactive", sandbox);

// engine.js 的 evaluateExpr 用 `new Function(...keys, 'return (...)' )` 求值，
// 其作用域只看得见「传入的变量 + 全局对象」。utils.js 的顶层函数在浏览器里是全局的，
// 但 Node vm 沙箱里必须先显式挂到 globalThis —— 否则 fatigueTier(_travelMinutes)
// 之类会假报 "fatigueTier is not defined"（这是审计已知坑，不是真 bug）。
// 注意：必须在 load("engine.js") 之后再挂一次，因为 engine.js 定义期会调 applyReactive。
const REBIND = [
  "fatigueTier", "fmtStrength", "canSee", "mercuryTier", "mercuryPainNote", "hasFood",
  "meleeWeaponTier", "meleeWeaponName", "heavyWeaponName", "cuttingToolName",
  "zombieAtHomeDoor", "zombieOutsideHome", "hasNoTransportation", "hasMeleeWeapon",
  "describeZombieWave", "tryBreakWeapon", "weaponBrokeText", "combatDrain",
  "combatDrainText", "restRecover", "updateTime", "updateWeather", "sprintAway",
  "timeImage", "initMemoryGame", "travelScene",
];
function rebindUtils() {
  vm.runInContext(
    "[" + REBIND.map((n) => "'" + n + "'").join(",") + "].forEach(function(n){" +
    "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){}" +
    "});",
    sandbox
  );
}
rebindUtils();

// 静音引擎的初始化日志（否则满屏变量转储）
sandbox.console = Object.assign({}, console, { log() {}, warn() {}, error() {} });

// ---------- 扫描 ----------
// 机制名泄露词表。注意：只扫【渲染后的玩家可见字符串】，注释天然不在其中。
const LEAK_PATTERNS = [
  { re: /汞/, name: "「汞」字" },
  { re: /夜视/, name: "「夜视」" },
  { re: /痛觉消失/, name: "「痛觉消失」" },
  { re: /40-70|40~70/, name: "「40-70」" },
  { re: /甲基汞/, name: "「甲基汞」" },
  { re: /mercuryLoad/, name: "「mercuryLoad」" },
];

// 已知含汞分支的场景清单（新增汞分支后请同步登记）
const SCENES = [
  ["菜市场-员工通道", "三林菜市场·夜视"],
  ["菜市场-通道迷路", "三林菜市场·夜视迷路"],
  ["新达汇-B1值班过道", "新达汇·夜视"],
  ["新达汇-B1保安室", "新达汇·夜视"],
  ["新达汇-2F北走廊中", "新达汇·夜视椅堆"],
  ["新达汇-2F卫生间", "新达汇·镜中灰白"],
  ["新达汇-3F大型综合儿童乐园", "新达汇·夜视滑梯"],
  ["上实南校-3号楼-4楼-摸黑", "上实南校·夜视楼梯"],
  ["理发店内部", "安盛街·镜中灰白"],
  ["金谊广场-地铁站厅-失败", "金谊广场·痛觉反转"],
  ["图书馆-阅览室-徒手", "图书馆·痛觉反转"],
  ["地铁站-安检区-硬冲", "地铁站·痛觉反转"],
  ["建平-致真楼-1F-老吴杂物室", "建平·痛觉反转"],
  ["樱桃苑-4楼-失败", "樱桃苑·痛觉反转"],
  // ===== 2026-09-23 新增：倒影 / 反光载体扩容 =====
  ["东明路-三林塘桥", "三林塘桥·水面倒影"],
  ["东明路-三林塘桥-看水", "三林塘桥·看水"],
  ["安盛街-服装店-穿衣镜", "服装店·穿衣镜"],
  ["三林路-轿车门锁了", "三林路·车窗反光"],
  ["张江-滨河绿道", "张江·滨河绿道水面"],
  ["张江-川杨河南岸堤", "张江·南岸堤水面"],
  ["张江-AI岛-水景", "张江·AI岛水景"],
];

const LOADS = [45, 75]; // 档位 2 / 档位 3
let p0 = 0, checked = 0;

console.log("============================================================");
console.log(" 汞机制玩家可见文案泄露守卫");
console.log("============================================================");

for (const load of LOADS) {
  console.log("\n--- mercuryLoad = " + load + " ---");
  for (const [name, label] of SCENES) {
    // 场景是 storyData 的直接键（engine.js:1129 用 storyData[sceneId] 取），不是 storyData.scenes
    const scene = storyData[name];
    if (!scene) { console.log("  ⚠ 场景不存在：" + name); continue; }

    // initGameState() 无返回值，它直接改写引擎里的全局 gameState（engine.js:193）
    if (typeof initGameState === "function") { try { initGameState(); } catch (e) { /* 可选 */ } }
    vm.runInContext(
      "(function(){ gameState.mercuryLoad = " + load + ";" +
      " gameState.strength = 8; gameState.itemCount = 1;" +
      " gameState.hasTorch = false; gameState.hasPhone = false; gameState.phoneBattery = 0;" +
      "})()",
      sandbox
    );
    if (typeof applyReactive === "function") {
      try { rebindUtils(); applyReactive(); } catch (e) { /* 未初始化完整时忽略 */ }
    }

    let text;
    try {
      const vars = vm.runInContext("gameState", sandbox);
      text = typeof scene.text === "function" ? scene.text(vars) : scene.text;
    } catch (e) { console.log("  ❌ " + label + " text() 抛错：" + e.message); p0++; continue; }

    const s = Array.isArray(text) ? text.join("\n") : String(text == null ? "" : text);
    let hit = null;
    for (const p of LEAK_PATTERNS) { if (p.re.test(s)) { hit = p; break; } }

    checked++;
    if (hit) {
      p0++;
      const idx = s.search(hit.re);
      console.log("  ❌ P0 " + label + "（" + name + "）泄露 " + hit.name);
      console.log("        …" + s.slice(Math.max(0, idx - 30), idx + 50).replace(/\n/g, " / ") + "…");
    } else {
      console.log("  ✅ " + label + "（" + name + "）无泄露");
    }
  }
}

console.log("\n============================================================");
console.log(" 渲染场景 " + checked + " 次 | P0 泄露 " + p0 + " 处");
console.log(p0 === 0 ? " ✅ 玩家可见文案零泄露" : " ❌ 存在机制泄露，必须修掉");
console.log("============================================================");
process.exit(p0 === 0 ? 0 : 1);
