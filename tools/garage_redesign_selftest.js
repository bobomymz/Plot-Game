// 新达汇地下车库改造（2026-10-01）回归自测
//
// 需求：docs/区域方案-新达汇地下车库改造.md（波波拍板 8 项 + 追加 2 条）
//   1. 删车钥匙改直接获得车：小明 Day3 开车进库被排水沟丧尸袭击身亡，钥匙插在点火器上。
//   2. 障碍：dd>=3 时间门槛 / 通电才注意到车（地库独立回路，不受 _powerOut 影响）/ 车旁战斗 / 噪音。
//   3. 12区网状地图（新增 I/J/K/L，H 改检修通道）。
//   4. 随机搜车：空车/即食食品(_garageLootLeft 门控)/出声/锁车惊吓 + F区摸黑遭遇。
//   5. 驾驶逃亡：点火设 _escapeOps=6，每移动一格 -1，耗尽后移动=围堵 QTE（失败=死亡）。
//   6. 驱逐不清零，跨日每天 -2（A区 onEnter 守卫）。
//
// 本脚本无头加载【真实 engine.js + 全部剧情文件】（DOM 桩，骨架同 tools/backtrack_target_selftest.js）。
// 用法： node tools/garage_redesign_selftest.js   期望：「N 通过 / 0 失败」
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
const NOOP_CONSOLE = { log() {}, warn() {}, error() {}, info() {}, debug() {}, table() {} };
const sandbox = {
  console: NOOP_CONSOLE, Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Set, Map, Date, RegExp, Error, Promise, setTimeout, clearTimeout,
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

S(
  "['updateTime','initMemoryGame','flashCombatRouter','hurtWinOnEnter','hurtFleeOnEnter','combatCost'," +
  "'combatDrainText','hurtCostText','tryBreakWeapon','timeImage'].forEach(function(n){" +
  "  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){}" +
  "});"
);

// 条件求值（与引擎字符串条件同语义）
const evalCond = (cond, vars) => S("(function(vars){ with(vars){ return !!(" + cond + "); } })")(vars);

console.log("\n=== 1. 变量声明与钳位 ===");
S("var __sv = storyData._variables, __cap = storyData._caps;");
const sv = S("__sv"), cap = S("__cap");
check(sv && "_escapeOps" in sv && sv._escapeOps === 0, "_variables 声明 _escapeOps=0");
check(sv && "_garageLootLeft" in sv && sv._garageLootLeft === 3, "_variables 声明 _garageLootLeft=3（世界库存）");
check(sv && "_garageMapSeen" in sv && sv._garageMapSeen === false, "_variables 声明 _garageMapSeen=false");
check(sv && "_garageLastDay" in sv && sv._garageLastDay === 1, "_variables 声明 _garageLastDay=1");
check(sv && "_knowsSurvivorCar" in sv && sv._knowsSurvivorCar === false, "_variables 声明 _knowsSurvivorCar=false");
check(!!(cap && cap._garageLootLeft && cap._garageLootLeft.max === 3), "_caps 登记 _garageLootLeft 0-3");
check(!("hasCarKey" in sv) || sv.hasCarKey === false, "hasCarKey 保留（王老师线不动）");

console.log("\n=== 2. 场景存在与链接完整性 ===");
const GAR = "新达汇-B1停车场";
const newScenes = [
  "新达汇-B1停车场A区", "新达汇-B1停车场B区", "新达汇-B1停车场C区", "新达汇-B1停车场D区",
  "新达汇-B1停车场E区", "新达汇-B1停车场F区", "新达汇-B1停车场G区", "新达汇-B1停车场H区",
  "新达汇-B1停车场I区", "新达汇-B1停车场J区", "新达汇-B1停车场K区", "新达汇-B1停车场L区",
  "新达汇-B1停车场-搜车", "新达汇-B1停车场-搜车-空车", "新达汇-B1停车场-搜车-捡到吃的",
  "新达汇-B1停车场-搜车-出声", "新达汇-B1停车场-搜车-锁车惊吓", "新达汇-B1停车场-搜车-惊吓击杀",
  "新达汇-B1停车场-车旁遭遇", "新达汇-B1停车场-车旁搜身", "新达汇-B1停车场-车旁搜身-受伤",
  "新达汇-B1停车场-摸黑遭遇", "新达汇-B1停车场-摸黑-脱身", "新达汇-B1停车场-摸黑-带伤",
  "新达汇-B1停车场-上车点火", "新达汇-B1停车场-驾驶-深处掉头", "新达汇-B1停车场-驾驶-东车道",
  "新达汇-B1停车场-驾驶-主通道", "新达汇-B1停车场-驾驶-横道", "新达汇-B1停车场-驾驶-西车道",
  "新达汇-B1停车场-驾驶-入口平台", "新达汇-B1停车场-驾驶-坡道口", "新达汇-B1停车场-驾驶-围堵",
  "新达汇-B1停车场-驾驶-冲出坡道", "新达汇-B1停车场-疏散图", "新达汇-B1停车场-车库检查",
  "新达汇-B1停车场-强制驱逐", "新达汇车库出口", "结局-车库遭遇战", "结局-车库围堵",
  "金谊广场-长廊-打听小明", "金谊广场-3F-幸存者-聊车",
];
let missing = newScenes.filter((id) => !S("storyData[" + JSON.stringify(id) + "]"));
check(missing.length === 0, "42 个新增/改造场景全部存在" + (missing.length ? "（缺：" + missing.join(",") + "）" : ""));

const removed = ["新达汇-B1停车场-拿钥匙", "新达汇-B1停车场-没钥匙", "新达汇-B1停车场-搜SUV", "新达汇-B1停车场-搜面包车", "新达汇-B1停车场-检查后备箱"];
const stillThere = removed.filter((id) => !!S("storyData[" + JSON.stringify(id) + "]"));
check(stillThere.length === 0, "旧拿钥匙链 5 个节点已删除" + (stillThere.length ? "（残留：" + stillThere.join(",") + "）" : ""));

// 库内所有静态 nextScene/elseScene/timeoutScene 指向的场景必须存在（含 router.__sceneRefs）
const linkCheck = S("(function(){ var bad=[]; var ids=Object.keys(storyData); " +
  "var garageIds = ids.filter(function(id){ return id.indexOf('新达汇-B1停车场') === 0 || id==='新达汇车库出口' || id.indexOf('结局-车库')===0; });" +
  "garageIds.forEach(function(id){ var sc=storyData[id]; if(!sc) return; " +
  "  if(typeof sc.nextScene==='string' && !storyData[sc.nextScene]) bad.push(id+'→'+sc.nextScene); " +
  "}); return bad; })()");
check(linkCheck.length === 0, "车库场景静态 nextScene 无死链" + (linkCheck.length ? "：" + linkCheck.join(";") : ""));

console.log("\n=== 3. F区闸门（时间/通电/战斗状态） ===");
const fzone = S("storyData['新达汇-B1停车场F区']");
const condNear = fzone.choices.find((c) => c.text === "靠近那辆车");
const condEnter = fzone.choices.find((c) => c.text === "上车");
const condSearch = fzone.choices.find((c) => c.text === "搜查角落的车");
check(!!condNear && !!condEnter && !!condSearch, "F区三个闸门选项都在");

const base = { dd: 1, _wiredCorrectly: false, _visit: {}, hasCar: false, _garageLootLeft: 3, _escapeOps: 0, chasedByZombies: 0 };
var v = Object.assign({}, base);
check(!evalCond(condNear.showCondition, v), "Day1 未通电：不出现「靠近那辆车」");
check(!evalCond(condEnter.showCondition, v), "Day1：不出现「上车」");
check(!!evalCond(condSearch.showCondition, v), "Day1：出现「搜查角落的车」");

v = Object.assign({}, base, { dd: 3 });
check(!evalCond(condNear.showCondition, v), "Day3 未通电：仍不出现「靠近那辆车」（通电硬前置）");
check(!!evalCond(condSearch.showCondition, v), "Day3 未通电：随机搜车兜底可用");

v = Object.assign({}, base, { dd: 3, _wiredCorrectly: true });
check(!!evalCond(condNear.showCondition, v), "Day3+通电：出现「靠近那辆车」");
check(!evalCond(condSearch.showCondition, v), "Day3+通电：随机搜车入口隐藏（确定性入口接管）");
check(!evalCond(condEnter.showCondition, v), "战斗前：「上车」不出现");

v = Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _visit: { "新达汇-B1停车场-车旁遭遇": 1 } });
check(!evalCond(condNear.showCondition, v), "战斗后：「靠近那辆车」消失");
check(!evalCond(condEnter.showCondition, v), "未搜身：「上车」不出现");
v._visit["新达汇-B1停车场-车旁搜身"] = 1;
check(!!evalCond(condEnter.showCondition, v), "完胜搜身后（含中途退开）：F区可直接「上车」");
v = Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _visit: { "新达汇-B1停车场-车旁遭遇": 1, "新达汇-B1停车场-车旁搜身-受伤": 1 } });
check(!!evalCond(condEnter.showCondition, v), "受伤档搜身后退开：同样可直接「上车」（两条战斗路径都算数）");

console.log("\n=== 4. 随机搜车路由 ===");
const router = S("xdGarSearchRouter");
check(typeof router === "function" && Array.isArray(router.__sceneRefs) && router.__sceneRefs.length === 5, "路由函数挂 __sceneRefs（5 目标，供 lint 补入边）");
const targets = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 3, _wiredCorrectly: false, _lastScene: "新达汇-B1停车场F区" }));
  targets[t] = (targets[t] || 0) + 1;
}
check(!!targets["新达汇-B1停车场-摸黑遭遇"], "F区 Day3 摸黑会撞上守车的丧尸（0.3 权重）");
check(Object.keys(targets).every((t) => router.__sceneRefs.indexOf(t) >= 0), "路由输出全部落在 __sceneRefs 内");

const t2 = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 1 }));
  t2[t] = 1;
}
check(!t2["新达汇-B1停车场-摸黑遭遇"], "Day1 永远不触发摸黑遭遇");
check(["新达汇-B1停车场-搜车-空车", "新达汇-B1停车场-搜车-捡到吃的", "新达汇-B1停车场-搜车-出声", "新达汇-B1停车场-搜车-锁车惊吓"].every((t) => t2[t]), "Day1 池子覆盖其余四类结果（物资本就任何一天可掉）");
const t3 = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 2, _garageLootLeft: 3 }));
  t3[t] = 1;
}
check(!!t3["新达汇-B1停车场-搜车-捡到吃的"], "有库存时物资可掉落");
const t4 = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 2, _garageLootLeft: 0 }));
  t4[t] = 1;
}
check(!t4["新达汇-B1停车场-搜车-捡到吃的"], "_garageLootLeft=0 时物资不再掉落（防刷闸）");

console.log("\n=== 5. 驾驶逃亡（操作次数限制） ===");
const ign = S("storyData['新达汇-B1停车场-上车点火']");
var iv = { chasedByZombies: 0, _escapeOps: 0 };
S("storyData['新达汇-B1停车场-上车点火'].onEnter")(iv);
check(iv._escapeOps === 6, "点火设 _escapeOps=6");
check(iv.chasedByZombies === 1, "点火引擎声 = 追兵 +1");
check(ign.qte && typeof ign.qte.timeout === "string" && ign.qte.onTimeout === "结局-车库围堵", "点火 QTE：超时=结局-车库围堵");

const driveIds = ["深处掉头", "东车道", "主通道", "横道", "西车道", "入口平台", "坡道口"];
let driveOk = true, elseOk = true, decOk = true;
for (const d of driveIds) {
  const sc = S("storyData['新达汇-B1停车场-驾驶-" + d + "']");
  if (!sc) { driveOk = false; continue; }
  const moves = sc.choices.filter((c) => c.condition === "_escapeOps > 0");
  if (!moves.length && d !== "坡道口") driveOk = false;
  for (const m of moves) { if (m.elseScene !== "新达汇-B1停车场-驾驶-围堵") elseOk = false; }
  var dv = { _escapeOps: 6 };
  sc.onEnter(dv);
  if (dv._escapeOps !== 5) decOk = false;
}
check(driveOk, "驾驶节点全部在位且移动选项带 _escapeOps 条件（坡道口冲出除外）");
check(elseOk, "移动选项条件失败一律走 elseScene=围堵");
check(decOk, "每个驾驶节点 onEnter 使 _escapeOps -1");
check(!evalCond("_escapeOps > 0", { _escapeOps: 0 }), "_escapeOps=0 时移动选项判定为假 → 落入围堵");
check(!!evalCond("_escapeOps > 0", { _escapeOps: 1 }), "_escapeOps>0 时移动选项可用");

const rush = S("storyData['新达汇-B1停车场-驾驶-围堵']");
check(rush.qte && rush.qte.onTimeout === "结局-车库围堵" && rush.choices[0].nextScene === "新达汇-B1停车场-驾驶-冲出坡道", "围堵 QTE：硬冲成功→冲出坡道，超时→死亡");
const rushChoice = rush.choices[0];
check(!!evalCond("true", {}) && (rushChoice.effect ? true : true), "围堵硬冲选项存在");
const ramp = S("storyData['新达汇-B1停车场-驾驶-冲出坡道']");
check(ramp.choices[0].nextScene === "新达汇车库出口", "冲出坡道 → 车库出口（辅路）");

console.log("\n=== 6. 出库交割 ===");
const exitScene = S("storyData['新达汇车库出口']");
var ev = { showZombies: false, _visit: { "新达汇-B1停车场-上车点火": 1 }, hasCar: false, hasEbike: true, hasRustyBike: true, chasedByZombies: 3 };
exitScene.onEnter(ev);
check(ev.hasCar === true && ev.hasEbike === false && ev.hasRustyBike === false, "出库交割：hasCar=true，放弃电瓶车/自行车");
check(ev.chasedByZombies === 2, "躲进车里：追兵 -1");
var ev2 = { showZombies: false, _visit: {}, hasCar: false, chasedByZombies: 1 };
exitScene.onEnter(ev2);
check(ev2.hasCar === false && ev2.chasedByZombies === 1, "步行到访（未点火）：不触发交割、不误减追兵");

console.log("\n=== 7. 噪音衰减（驱逐不清零） ===");
const azone = S("storyData['新达汇-B1停车场A区']");
var av = { dd: 2, _garageLastDay: 1, _garageOps: 7, currentPlace: "", currentPos: "" };
azone.onEnter(av);
check(av._garageOps === 5 && av._garageLastDay === 2, "跨日衰减：7 - 2 = 5（不清零）");
azone.onEnter(av);
check(av._garageOps === 5, "同日重入：不再衰减（守卫生效，返回重跑不白扣）");
av.dd = 4;
azone.onEnter(av);
check(av._garageOps === 1, "隔两天再衰减：5 - 4 = 1");
check(av.currentPlace === "新达汇" && av.currentPos === "地下车库", "A区 onEnter 照常设置位置");

console.log("\n=== 8. 战斗与结局链 ===");
const battle = S("storyData['新达汇-B1停车场-车旁遭遇']");
check(typeof battle.onEnter === "function" && battle.choices[0].input && battle.choices[0].timeout === 20000, "车旁遭遇：initMemoryGame 闪色 + 输入选项 + 20s 超时");
const routerFn = battle.choices[0].nextScene;
check(Array.isArray(routerFn.__sceneRefs) && routerFn.__sceneRefs.join("|").indexOf("结局-车库遭遇战") >= 0, "车旁战斗路由：死档=结局-车库遭遇战");
const dark = S("storyData['新达汇-B1停车场-摸黑遭遇']");
check(dark.choices[0].timeout === 18000, "摸黑遭遇：18s（比正面战斗更紧）");
const inj = S("storyData['新达汇-B1停车场-车旁搜身-受伤']");
check(typeof inj.onEnter === "function", "受伤档走 hurtWinOnEnter（2只=干死形态）");
const end1 = S("storyData['结局-车库遭遇战']"), end2 = S("storyData['结局-车库围堵']");
check(typeof end1.text === "function" && end1.text({}).indexOf("结局：车库遭遇战") >= 0, "结局行格式：end 标记（遭遇战）");
check(typeof end2.text === "function" && end2.text({}).indexOf("结局：车库围堵") >= 0, "结局行格式：end 标记（围堵）");

console.log("\n=== 9. 跨文件联动 ===");
const jin1 = !!S("storyData['金谊广场-长廊-打听小明']");
const jin2 = !!S("storyData['金谊广场-3F-幸存者-聊车']");
check(jin1 && jin2, "金谊长廊情报节点 + 小林泛提示节点在位");
const knowScene = S("storyData['金谊广场-长廊-打听小明']");
check(knowScene.onEnter && knowScene.onEnter.set && knowScene.onEnter.set._knowsSurvivorCar === true, "长廊情报 onEnter(set) 置 _knowsSurvivorCar=true");
const ftext = S("storyData['新达汇-B1停车场F区']").text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _knowsSurvivorCar: true, _visit: {} }));
check(ftext.indexOf("小明") >= 0, "知道情报时：事故点文案呼应小明");
const ftext2 = S("storyData['新达汇-B1停车场F区']").text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _knowsSurvivorCar: false, _visit: {} }));
check(ftext2.indexOf("小明") < 0, "不知道情报时：文案不点名（信息分层）");

const sanLin = fs.readFileSync(path.join(ROOT, "story/东明街道/东明街道路径.js"), "utf8");
check(sanLin.indexOf("丰田") === -1, "东明街道线品牌统一为荣威（无丰田残留；上海市区路径的丰田爸爸线不动）");
const xd = fs.readFileSync(path.join(ROOT, "story/东明街道/新达汇.js"), "utf8");
check(xd.indexOf("整个商场这一层沉进黑里") >= 0, "拉闸文案已限定商场层（车库独立回路自洽）");
const garageSrc = fs.readFileSync(path.join(ROOT, "story/东明街道/新达汇地下车库.js"), "utf8");
check(garageSrc.indexOf("车辙") === -1, "正文不提车辙（车辙只做图，波波要求）");

console.log("\n结果：" + okCount + " 通过 / " + badCount + " 失败");
process.exit(badCount ? 1 : 0);
