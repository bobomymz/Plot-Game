// 一次性探针：用【真实 engine.js】验证 _lastScene 的语义（= 上一个渲染场景，还是当前场景）
// 用途：核实 Cursor 报的「搜车记的是上一格」。结论出来后脚本删除，逻辑固化进 garage_redesign_selftest.js。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
process.chdir(ROOT);
let FILES;
try { FILES = require("./story_files").list(); }
catch (e) { console.error("无法读取 story_files 清单：" + e.message); process.exit(2); }

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
    className: "", innerHTML: "", textContent: "", value: "", offsetWidth: 0, clientWidth: 0,
  };
  return el;
}
const doc = {
  getElementById: () => mkEl(), createElement: () => mkEl(), createTextNode: () => ({}),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  body: mkEl(), documentElement: mkEl(), head: mkEl(),
};
const store = {};
const NOOP = { log() {}, warn() {}, error() {}, info() {}, debug() {}, table() {} };
const sandbox = { console: NOOP, Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, Set, Map, Date, RegExp, Error, Promise, setTimeout, clearTimeout };
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
sandbox.DOMParser = function () {
  this.parseFromString = function (s) {
    return { getElementById: () => ({ childNodes: [], innerHTML: s, removeChild() {}, appendChild() {} }) };
  };
};
vm.createContext(sandbox);
const load = (f) => {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log("  缺失 " + f); return false; }
  try { vm.runInContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: f }); return true; }
  catch (e) { console.log("  载入失败 " + f + " :: " + e.message); return false; }
};
const S = (code) => vm.runInContext(code, sandbox);
for (const f of FILES) load(f);
load("engine.js");

S(
  "['updateTime','initMemoryGame','flashCombatRouter','hurtWinOnEnter','hurtFleeOnEnter','combatCost'," +
  "'combatDrainText','hurtCostText','tryBreakWeapon','timeImage'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){}" +
  "});"
);

const hasFn = (n) => S("typeof " + n);
console.log("renderScene typeof  = " + hasFn("renderScene"));
console.log("gotoScene   typeof  = " + hasFn("gotoScene"));

// 真实走一遍：B1走廊 → G（入口平台）→ H（主通道南段）
S("try { initGameState && initGameState(); } catch(e) { console.log('init err ' + e.message); }");
S("if (typeof gameState !== 'undefined' && gameState) { try{ fillMissingDefaults(gameState); }catch(e){} }");

const seq = ["新达汇-B1走廊", "新达汇-B1-入口平台", "新达汇-B1-主通道南段"];
console.log("场景存在性：" + seq.map((id) => id + "=" + S("!!storyData[" + JSON.stringify(id) + "]")).join(" , "));
for (const id of seq) {
  const err = S("(function(){ try { renderScene(" + JSON.stringify(id) + "); return ''; } catch(e) { return e.message; } })()");
  const ls = S("typeof gameState !== 'undefined' ? gameState._lastScene : '(no gameState)'");
  console.log("渲染完 " + id.padEnd(20) + " err=" + JSON.stringify(err) + " -> _lastScene = " + JSON.stringify(ls));
}

// 无论 renderScene 能否跑，都用引擎原文语义复刻验证
console.log("\n--- 复刻引擎语义：_lastScene = 上一个渲染场景 ---");
let lastRenderedScene = "";
const st = { _lastScene: "" };
const render = (id) => { st._lastScene = lastRenderedScene; lastRenderedScene = id; };
render("新达汇-B1走廊");
render("新达汇-B1-入口平台");
console.log("站在 新达汇-B1-入口平台(G) 时 _lastScene = " + JSON.stringify(st._lastScene));
render("新达汇-B1停车场-主通道南段");
console.log("站在 主通道南段(H)     时 _lastScene = " + JSON.stringify(st._lastScene));

// 直接问真实 story 代码：此刻点「搜车」会把起点记成谁
const from = S(
  "(function(){" +
  "  var v = { _garageSearchPending:false, _garageSearchFrom:'', _lastScene:'新达汇-B1-入口平台'," +
  "            _visit:{}, dd:1, chasedByZombies:0, hasPhone:false, phoneBattery:0, hasTorch:false," +
  "            _garDenA:0,_garDenB:0,_garDenC:0,_garDenD:0,_garDenE:0,_garDenF:0,_garDenG:0,_garDenH:0,_garDenI:0," +
  "            currentPos:'地下车库', currentPlace:'新达汇' };" +
  "  var cs = storyData['新达汇-B1-主通道南段'].choices(v);" +
  "  var go = cs.filter(function(c){return c.nextScene && typeof c.nextScene === 'function' && c.nextScene.__searchGo;})[0];" +
  "  if (!go) return '(H 区没找到搜车 POI；POI 文本=' + cs.map(function(c){return (typeof c.text==='function'?c.text(v):c.text);}).join('|') + ')';" +
  "  go.nextScene(v);" +
  "  return v._garageSearchFrom + '  || 密度笔记账 _garDenG=' + v._garDenG + ' _garDenH=' + v._garDenH;" +
  "})()"
);
console.log("\n在 H 区点搜车 -> 记录的起点 _garageSearchFrom = " + JSON.stringify(from));
console.log("（正确值应为 新达汇-B1停车场-主通道南段；若是 新达汇-B1-入口平台 则 bug 属实）");
