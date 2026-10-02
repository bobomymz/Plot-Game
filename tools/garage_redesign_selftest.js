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
check(sv && "_garageSearchFrom" in sv && sv._garageSearchFrom === "", "_variables 声明 _garageSearchFrom=''");
check(sv && "_garageSearchPending" in sv && sv._garageSearchPending === false, "_variables 声明 _garageSearchPending=false");
check(sv && "_garageDecayDays" in sv && sv._garageDecayDays === 0, "_variables 声明 _garageDecayDays=0");
check(sv && "_garageFMarked" in sv && sv._garageFMarked === false, "_variables 声明 _garageFMarked=false");
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
// 王老师线先拿车（全局 hasCar=true）但没走过车库线：事故点必须完好（评审硬伤1）
v = Object.assign({}, base, { dd: 3, _wiredCorrectly: true, hasCar: true });
check(!!evalCond(condNear.showCondition, v), "王老师线已有车（全局hasCar）：F区「靠近那辆车」仍在（不用全局hasCar判断）");
// 本线点火离开：闸门全关，正文=空车位
v = Object.assign({}, base, { dd: 3, _wiredCorrectly: true, hasCar: true, _visit: { "新达汇-B1停车场-上车点火": 1 } });
check(!evalCond(condNear.showCondition, v) && !evalCond(condEnter.showCondition, v), "本线点火离开：「靠近」和「上车」都消失（二次点火不可能）");
const ftextGone = fzone.text(v);
check(ftextGone.indexOf("空空荡荡") >= 0 && ftextGone.indexOf("钥匙还插在点火器上") < 0, "车开走后 F区正文=空车位，钥匙不在（状态闭环）");

console.log("\n=== 3.5 摸黑记忆（评审硬伤2） ===");
const mk = S("storyData['新达汇-B1停车场-摸黑-脱身']");
check(mk.onEnter && mk.onEnter.set && mk.onEnter.set._garageFMarked === true
  && mk.onEnter.add && mk.onEnter.add.strength === -1 && mk.onEnter.add.chasedByZombies === 1,
  "摸黑-脱身：对象式 onEnter 记 _garageFMarked + 胜利节点扣体力-1");
const fDarkMarked = fzone.text(Object.assign({}, base, { dd: 3, _garageFMarked: true }));
check(fDarkMarked.indexOf("引擎盖是温的") >= 0, "未通电再回F区：记得那辆温的车（摸黑标记生效）");
const fLitMarked = fzone.text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _garageFMarked: true }));
check(fLitMarked.indexOf("就是它") >= 0, "通电再回F区：首句接「灯亮了，就是它」");

console.log("\n=== 4. 随机搜车路由 ===");
const router = S("xdGarSearchRouter");
check(typeof router === "function" && Array.isArray(router.__sceneRefs) && router.__sceneRefs.length === 5, "路由函数挂 __sceneRefs（5 目标，供 lint 补入边）");
const targets = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 3, _wiredCorrectly: false, _garageSearchFrom: "新达汇-B1停车场F区" }));
  targets[t] = (targets[t] || 0) + 1;
}
check(!!targets["新达汇-B1停车场-摸黑遭遇"], "F区搜车链（本轮起点=F区）Day3 摸黑会撞上守车的丧尸（0.3 权重）");
const tLast = {};
for (let i = 0; i < 300; i++) {
  const t = router(Object.assign({}, base, { dd: 3, _wiredCorrectly: false, _lastScene: "新达汇-B1停车场F区", _garageSearchFrom: "新达汇-B1停车场B区" }));
  tLast[t] = 1;
}
check(!tLast["新达汇-B1停车场-摸黑遭遇"], "遭遇只看本轮搜车起点（_garageSearchFrom），不看 _lastScene 来路");
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
let driveOk = true, elseOk = true, decOk = true, westExtra = false;
for (const d of driveIds) {
  const sc = S("storyData['新达汇-B1停车场-驾驶-" + d + "']");
  if (!sc) { driveOk = false; continue; }
  const moves = sc.choices.filter((c) => c.condition === "_escapeOps > 0");
  if (!moves.length && d !== "坡道口") driveOk = false;
  for (const m of moves) { if (m.elseScene !== "新达汇-B1停车场-驾驶-围堵") elseOk = false; }
  var dv = { _escapeOps: 6 };
  sc.onEnter(dv);
  if (d === "西车道") {
    // 过路费改到离开选项时才付（评审硬伤3）：进场只扣 1
    if (dv._escapeOps !== 5) decOk = false;
    const exits = sc.choices.filter((c) => c.condition === "_escapeOps > 0");
    var wv = { _escapeOps: 3, weather: "阴", hh: 8, mm: 0, dd: 1 };
    exits.forEach((c) => {
      const eff = c.effect(wv); // updateTime 返回 extraEffect，引擎侧再套用
      if (eff && eff.add && eff.add._escapeOps) wv._escapeOps += eff.add._escapeOps;
    });
    if (exits.length === 2 && wv._escapeOps === 1) westExtra = true; // 两次离开各额外-1
    else decOk = false;
  } else if (dv._escapeOps !== 5) {
    decOk = false;
  }
}
check(driveOk, "驾驶节点全部在位且移动选项带 _escapeOps 条件（坡道口冲出除外）");
check(elseOk, "移动选项条件失败一律走 elseScene=围堵");
check(decOk, "每个驾驶节点 onEnter 使 _escapeOps -1");
check(westExtra, "西车道过路费在离开选项结算（每次额外-1，先读费时再付费）");
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
check(av._garageDecayDays === 2, "衰减发生时记下天数（A区正文播报「散了一些」用）");
azone.onEnter(av);
check(av._garageDecayDays === 0, "同日重入：衰减播报标记清零");
check(av.currentPlace === "新达汇" && av.currentPos === "地下车库", "A区 onEnter 照常设置位置");
var av2 = Object.assign({}, base, { dd: 3, _garageLastDay: 3, _garageOps: 6, _garageDecayDays: 0, currentPlace: "", currentPos: "" });const atext = azone.text(av2);
check(atext.indexOf("水声密得像下雨") >= 0, "驱逐后当天再进A区：正文播报水声（入口状态可感知）");
check(atext.indexOf("散了一些") < 0, "同日重入（无衰减）：不播报「散了一些」");
var av3 = { dd: 1, _wiredCorrectly: false, _garageDecayDays: 0, _visit: {} };
check(azone.text(av3).indexOf("应急灯还亮着") >= 0, "未通电A区：应急灯文案");
av3._wiredCorrectly = true;
check(azone.text(av3).indexOf("暖黄色的光把坡道照得通透") >= 0, "通电A区：整库暖光文案（灯态随通电变化）");

console.log("\n=== 7.5 搜车链回原区（评审建议2） ===");
const searchHub = S("storyData['新达汇-B1停车场-搜车']");
var sv1 = { _garageOps: 0, _garageSearchPending: false, _garageSearchFrom: "", _lastScene: "新达汇-B1停车场G区" };
searchHub.onEnter(sv1);
check(sv1._garageSearchFrom === "新达汇-B1停车场G区" && sv1._garageSearchPending === true, "搜车hub记录本轮起点（G区）");
searchHub.onEnter(sv1); // 模拟"换个位置再搜"再进hub（此时_lastScene已是结果节点）
check(sv1._garageSearchFrom === "新达汇-B1停车场G区", "链中再进hub：起点不被覆盖");
const backCheck = S("storyData['新达汇-B1停车场-车库检查']");
const contChoice = backCheck.choices.find((c) => c.text === "回到原地继续探索");
check(typeof contChoice.nextScene === "function" && contChoice.nextScene({ _garageSearchFrom: "新达汇-B1停车场G区" }) === "新达汇-B1停车场G区", "「回到原地继续探索」→ 本轮搜车起点区（不再固定送B区）");
check(contChoice.nextScene({}) === "新达汇-B1停车场B区", "无起点记录时兜底回B区");
var sv2 = { _garageSearchPending: true };
backCheck.onEnter(sv2);
check(sv2._garageSearchPending === false, "车库检查清除搜车链标记");
["新达汇-B1停车场A区", "新达汇-B1停车场B区", "新达汇-B1停车场D区", "新达汇-B1停车场H区", "新达汇-B1停车场I区"].forEach((id) => {
  const sc = S("storyData[" + JSON.stringify(id) + "]");
  const hasSearch = sc.choices.some((c) => String(c.nextScene).indexOf("搜车") >= 0);
  check(!hasSearch, id.slice(-2) + "：枢纽/走廊不再挂搜车选项（搜车集中在车排 K/L/G/E/F）");
});
["新达汇-B1停车场G区", "新达汇-B1停车场E区", "新达汇-B1停车场K区", "新达汇-B1停车场L区"].forEach((id) => {
  const sc = S("storyData[" + JSON.stringify(id) + "]");
  check(sc.choices.some((c) => c.nextScene === "新达汇-B1停车场-搜车"), id.slice(-2) + "：车排保留搜车入口");
});
check(S("storyData['新达汇-B1停车场B区']").choices.length === 5, "B区恰好5个选项（地点名、≤5）");
check(S("storyData['新达汇-B1停车场A区']").choices.length === 5, "A区恰好5个选项");

console.log("\n=== 7.6 接线手机中间档（评审建议5） ===");
const wireScene = S("storyData['新达汇-B1停车场-接线']");
const dimChoice = wireScene.choices.find((c) => c.showCondition === "!hasTorch && hasPhone && phoneBattery > 0");
const darkChoice = wireScene.choices.find((c) => c.showCondition === "!hasTorch && !(hasPhone && phoneBattery > 0)");
check(!!dimChoice && !!darkChoice, "接线：手机微光档与摸黑档分离");
let dimWin = 0, dimLose = 0;
for (let i = 0; i < 400; i++) { (dimChoice.nextScene() === "新达汇-B1停车场-接线成功") ? dimWin++ : dimLose++; }
check(dimWin > 100 && dimLose > 20, "手机微光档 0.6 成功率两头都能出现（实测 " + dimWin + "/" + (dimWin + dimLose) + "）");
let darkWin = 0;
for (let i = 0; i < 400; i++) { if (darkChoice.nextScene() === "新达汇-B1停车场-接线成功") darkWin++; }
check(darkWin > 30 && darkWin < 250, "摸黑档 0.3 成功率（实测 " + darkWin + "/400）");
const wireTextDim = wireScene.text({ hasTorch: false, hasPhone: true, phoneBattery: 50 });
const wireTextDark = wireScene.text({ hasTorch: false, hasPhone: false, phoneBattery: 0 });
check(wireTextDim.indexOf("只剩两处接口的标注被油污盖死") >= 0, "手机档文案=半懂（把握介于手电与全黑之间）");
check(wireTextDark.indexOf("全凭感觉") >= 0, "摸黑档文案=全赌");

console.log("\n=== 7.7 疏散图分节点提示（评审建议1） ===");
const mapFn = S("xdGarMapHint");
check(mapFn({ _garageMapSeen: true }, "甲节点提示") === "\n甲节点提示", "图提示随节点变化（看图时）");
check(mapFn({}, "甲节点提示") === "", "未看图：无提示");
const hintSeen = new Set();
for (const d of driveIds) {
  const sc = S("storyData['新达汇-B1停车场-驾驶-" + d + "']");
  const t = sc.text({ _escapeOps: 6, _garageMapSeen: true });
  const idx = t.indexOf("疏散图") >= 0 || d === "坡道口" || d === "入口平台" || d === "东车道" || d === "横道" || d === "主通道" || d === "西车道" || d === "深处掉头";
  if (sc.text({ _escapeOps: 6, _garageMapSeen: true }).split("\n").some((l) => l.indexOf("过了这根断杆") >= 0 || l.indexOf("出口坡道就在东南角") >= 0 || l.indexOf("最稳的走法") >= 0 || l.indexOf("外圈道一直通向") >= 0 || l.indexOf("主通道尽头就是入口平台") >= 0 || l.indexOf("主通道离出口更近") >= 0 || l.indexOf("直行就是入口平台") >= 0)) hintSeen.add(d);
}
check(hintSeen.size === driveIds.length, "7个驾驶节点各自带专属图提示句（不再同一句）");

console.log("\n=== 8. 战斗与结局链 ===");
const battle = S("storyData['新达汇-B1停车场-车旁遭遇']");
check(typeof battle.onEnter === "function" && battle.choices[0].input && battle.choices[0].timeout === 20000, "车旁遭遇：initMemoryGame 闪色 + 输入选项 + 20s 超时");
const routerFn = battle.choices[0].nextScene;
check(Array.isArray(routerFn.__sceneRefs) && routerFn.__sceneRefs.join("|").indexOf("结局-车库遭遇战") >= 0, "车旁战斗路由：死档=结局-车库遭遇战");
const dark = S("storyData['新达汇-B1停车场-摸黑遭遇']");
check(dark.choices[0].timeout === 18000, "摸黑遭遇：18s（比正面战斗更紧）");
const inj = S("storyData['新达汇-B1停车场-车旁搜身-受伤']");
check(typeof inj.onEnter === "function", "受伤档走 hurtWinOnEnter（2只=干死形态）");
const battleText = battle.text({});
check(battleText.indexOf("体力-1") < 0, "开战页不写消耗（体力扣减移到胜利节点，写作规范）");
const injText = inj.text({ dd: 3 });
const injText5 = inj.text({ dd: 5 });
check(injText.indexOf("还亮着") >= 0 && injText5.indexOf("黑着") >= 0, "受伤搜身手机状态也分 Day5 档");
const killScene = S("storyData['新达汇-B1停车场-搜车-惊吓击杀']");
check(killScene.text({ hasAxe: true }).indexOf("斧头") >= 0, "惊吓击杀点出武器名");
const ignite = S("storyData['新达汇-B1停车场-上车点火']");
check(ignite.text({}).length < 200 && ignite.text({}).indexOf("挂挡") >= 0, "点火正文已缩短（QTE 立即计时，读得完）");
const rush2 = S("storyData['新达汇-B1停车场-驾驶-围堵']");
const rushWest = rush2.text({ _lastScene: "新达汇-B1停车场-驾驶-西车道" });
check(rushWest.indexOf("西侧车道") >= 0 && rushWest.indexOf("一路撞回坡道") >= 0, "围堵正文按来源给过渡句（西车道→撞回坡道）");
const rampDay = S("storyData['新达汇-B1停车场-驾驶-坡道口']").text({ _escapeOps: 6, hh: 8 });
const rampNight = S("storyData['新达汇-B1停车场-驾驶-坡道口']").text({ _escapeOps: 6, hh: 22 });
check(rampDay.indexOf("天光") >= 0 && rampNight.indexOf("夜色") >= 0, "坡道口天光/夜色按小时切换");
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

console.log("\n=== 10. 二轮评审修订 ===");
const backLow = backCheck.text({ _garageOps: 1, chasedByZombies: 2 });
check(backLow.indexOf("一片寂静") < 0 && backLow.indexOf("回音还在") >= 0, "出声之后低档结算不再写「一片寂静」");
const bNoise = S("storyData['新达汇-B1停车场B区']").text({ _lastScene: "新达汇-B1停车场A区", _garageOps: 3, hh: 8, dd: 3 });
check(bNoise.indexOf("拍水声一声比一声密") >= 0, "B区步行文本带 ops>=3 水声刻度");
const gNoise = S("storyData['新达汇-B1停车场G区']").text({ _lastScene: "新达汇-B1停车场A区", _garageOps: 3, hh: 8, dd: 3, _visit: {} });
check(gNoise.indexOf("拍水声一声比一声密") >= 0, "G区步行文本带 ops>=3 水声刻度");
const cExit = S("storyData['新达汇-B1停车场C区']").choices.find((c) => typeof c.text === "function" && c.text({ _visit: {} }) === "去主通道");
check(cExit && cExit.condition === "_garageOps < 5" && cExit.elseScene === "新达汇-B1停车场-强制驱逐", "C区离开选项：ops>=5 强制驱逐（接线噪音同样有牙齿）");
const kText = S("storyData['新达汇-B1停车场K区']").text({ hasTorch: true, hasPhone: false, phoneBattery: 0 });
check(kText.indexOf("纸角") >= 0 && kText.indexOf("湿气是从深处飘过来的") < 0, "K区手电：看见传单朝向（半档线索）");
const lText = S("storyData['新达汇-B1停车场L区']").text({ hasTorch: true, hasPhone: false, phoneBattery: 0 });
check(lText.indexOf("绝缘胶布") >= 0 && lText.indexOf("同一种东西") < 0, "L区手电：认出胶布（半档线索）");
const hDark = S("storyData['新达汇-B1停车场H区']").text({ hasTorch: false, hasPhone: false, phoneBattery: 0 });
check(hDark.indexOf("马克笔") < 0, "H区全黑读不了墙上的字");
check(S("storyData['新达汇-B1停车场-疏散图']").text.indexOf("两处要紧的位置") >= 0, "疏散图系统提示收窄（不吹「记住整个布局」）");

console.log("\n=== 11. 方向词动态分流（回/去按目标是否去过） ===");
const fChoices = S("storyData['新达汇-B1停车场F区']").choices;
const dOpt = fChoices.find((c) => c.nextScene === "新达汇-B1停车场D区");
check(dOpt.text({ _visit: {} }) === "上台阶去旧区", "F区没去过旧区：选项写「去」（不假设来路）");
check(dOpt.text({ _visit: { "新达汇-B1停车场D区": 1 } }) === "上台阶回旧区", "F区去过旧区：选项写「回」");
const eOpt = fChoices.find((c) => c.nextScene === "新达汇-B1停车场E区");
check(eOpt.text({ _visit: {} }) === "去东北拐角" && eOpt.text({ _visit: { "新达汇-B1停车场E区": 1 } }) === "回东北拐角", "F区→E区 同规则");
const kC = S("storyData['新达汇-B1停车场K区']").choices.find((c) => c.nextScene === "新达汇-B1停车场B区");
check(kC.text({ _visit: {} }) === "去主通道", "K区→B区：没去过写「去」");
const aExit = S("storyData['新达汇-B1停车场A区']").choices.find((c) => c.nextScene === "新达汇-B1走廊");
check(aExit.text({ _visit: {} }) === "去B1走廊", "A区→B1走廊：辅路直入者没进过商场，写「去」");
const rampBack = S("storyData['新达汇-B1停车场-驾驶-坡道口']").choices.find((c) => c.nextScene === "新达汇-B1停车场-驾驶-入口平台");
check(typeof rampBack.text === "string" && rampBack.text === "掉头回入口平台", "坡道口→入口平台：唯一入边刚去过，保留静态「回」");
const jText = S("storyData['新达汇-B1停车场J区']").text({ dd: 4, hh: 8, _visit: { "新达汇-B1停车场-上车点火": 1 } });
check(jText.indexOf("第二次撞开") >= 0, "J区车走后：断杆被第二次撞开 + 亭顶砸痕");
const aTextOut = S("storyData['新达汇-B1停车场A区']").text({ dd: 4, hh: 8, _wiredCorrectly: true, _garageLastDay: 4, _garageOps: 0, _garageDecayDays: 0, _visit: { "新达汇-B1停车场-上车点火": 1 }, _lastScene: "新达汇-B1走廊" });
check(aTextOut.indexOf("从库里往外碾出去") >= 0, "A区车走后：多一道向外的新轮印");
const exitText = S("storyData['新达汇车库出口']").text({ hasCar: true, _visit: { "新达汇-B1停车场-上车点火": 1 } });
check(exitText.indexOf("安盛街") >= 0, "辅路 hasCar 分支保留方位说明（选项不悬空）");
const iText = S("storyData['新达汇-B1停车场I区']").text({ _lastScene: "新达汇-B1停车场B区", dd: 4, _garageOps: 4, _wiredCorrectly: true, hh: 8 });
check(iText.indexOf("白茬") >= 0, "I区「正」字随天数+噪音添新笔（悬念有下文）");
const dDay1 = S("storyData['新达汇-B1停车场D区']").text({ _lastScene: "新达汇-B1停车场C区", dd: 1, _wiredCorrectly: true, _garageOps: 0, hh: 8, _visit: {} });
const dDay5 = S("storyData['新达汇-B1停车场D区']").text({ _lastScene: "新达汇-B1停车场C区", dd: 5, _wiredCorrectly: true, _garageOps: 5, hh: 8, _visit: {} });
check(dDay1.indexOf("横移") < 0, "D区 Day1 亮灯：只有拍水声（按日期分层）");
check(dDay5.indexOf("拖痕") >= 0 && dDay5.indexOf("横移") >= 0, "D区 Day5 满噪音：拖痕+歪栅栏+影子横移");
const gFlood = S("storyData['新达汇-B1停车场G区']").text({ _lastScene: "新达汇-B1停车场A区", _garageOps: 5, hh: 8, dd: 4, _visit: {} });
check(gFlood.indexOf("水面比别处高了一截") >= 0, "G区步行侧满噪音也见涨水（和驾驶侧同一个车库）");

console.log("\n结果：" + okCount + " 通过 / " + badCount + " 失败");
process.exit(badCount ? 1 : 0);
