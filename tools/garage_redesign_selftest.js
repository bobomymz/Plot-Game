// 新达汇地下车库网格化改造（2026-10-02）回归自测
//
// 需求：docs/区域方案-新达汇车库网格化与方向系统.md（波波拍板 4 项）
//   1. 9 宫格网状结构（北=上，ABC 北排/DEF 中排/GHI 南排），邻接表 XDGRID 为唯一权威。
//   2. 方向系统：_garageFacing 朝向变量，分区移动选项按 前后左右 相对方位表述，
//      步行转向即走，驾驶倒车保持车头朝向；死路方向槽位隐藏；fixedChoices 定序。
//   3. 驾驶逃亡并入网格：_escapeOps 每格 -1，贴沟格（西车道×2）离开额外 -1，耗尽=围堵 QTE。
//   4. 旧区=网格外 POI（挂主通道北段台阶）；入口平台=独立分区，坡道口/疏散图是它的附属 POI。
//
// 本脚本无头加载【真实 engine.js + 全部剧情文件】（DOM 桩，骨架沿用旧版自测）。
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

const XD = "新达汇-B1-";
const G = XD + "入口平台", H = XD + "主通道南段", I = XD + "杂物拐角";
const D = XD + "西车道南段", E = XD + "中段枢纽", F = XD + "第二停车排";
const A = XD + "西车道北段", B = XD + "主通道北段", C = XD + "车道尽头";
const CELLS = [A, B, C, D, E, F, G, H, I];

const base = {
  dd: 1, hh: 8, strength: 5, chasedByZombies: 0,
  _wiredCorrectly: false, _visit: {}, hasCar: false,
  _garageLootLeft: 3, _escapeOps: 0, _garageOps: 0, _garageLastDay: 1,
  _garageFacing: "N", _driving: false, _garageRev: false,
  _lastScene: "新达汇-B1走廊",
  hasTorch: false, hasPhone: false, phoneBattery: 0,
};

console.log("\n=== 1. 变量声明与钳位 ===");
S("var __sv = storyData._variables, __cap = storyData._caps;");
const sv = S("__sv"), cap = S("__cap");
check(sv && "_garageFacing" in sv && sv._garageFacing === "N", "_variables 声明 _garageFacing='N'");
check(sv && "_driving" in sv && sv._driving === false, "_variables 声明 _driving=false");
check(sv && "_escapeOps" in sv && sv._escapeOps === 0, "_variables 声明 _escapeOps=0");
check(sv && "_garageLootLeft" in sv && sv._garageLootLeft === 3, "_variables 声明 _garageLootLeft=3（世界库存）");
check(sv && "_garageMapSeen" in sv && sv._garageMapSeen === false, "_variables 声明 _garageMapSeen=false");
check(sv && "_garageLastDay" in sv && sv._garageLastDay === 1, "_variables 声明 _garageLastDay=1");
check(sv && "_knowsSurvivorCar" in sv && sv._knowsSurvivorCar === false, "_variables 声明 _knowsSurvivorCar=false");
check(sv && "_garageSearchFrom" in sv && sv._garageSearchFrom === "", "_variables 声明 _garageSearchFrom=''");
check(sv && "_garageDecayDays" in sv && sv._garageDecayDays === 0, "_variables 声明 _garageDecayDays=0");
check(sv && "_garageFMarked" in sv && sv._garageFMarked === false, "_variables 声明 _garageFMarked=false");
check(!!(cap && cap._garageLootLeft && cap._garageLootLeft.max === 3), "_caps 登记 _garageLootLeft 0-3");

console.log("\n=== 2. 场景存在与旧节点清理 ===");
const newScenes = CELLS.concat([
  "新达汇-B1停车场-配电室", "新达汇-B1停车场-接线", "新达汇-B1停车场-接线成功", "新达汇-B1停车场-接线失败",
  "新达汇-B1停车场-旧区", "新达汇-B1停车场-涂鸦", "新达汇-B1停车场-疏散图",
  "新达汇-B1停车场-搜车", "新达汇-B1停车场-搜车-空车", "新达汇-B1停车场-搜车-捡到吃的",
  "新达汇-B1停车场-搜车-出声", "新达汇-B1停车场-搜车-锁车惊吓", "新达汇-B1停车场-搜车-惊吓击杀",
  "新达汇-B1停车场-车旁遭遇", "新达汇-B1停车场-车旁搜身", "新达汇-B1停车场-车旁搜身-受伤",
  "新达汇-B1停车场-摸黑遭遇", "新达汇-B1停车场-摸黑-脱身", "新达汇-B1停车场-摸黑-带伤",
  "新达汇-B1停车场-上车点火", "新达汇-B1停车场-围堵", "新达汇-B1停车场-冲出坡道",
  "新达汇-B1停车场-车库检查", "新达汇-B1停车场-强制驱逐",
  "新达汇车库出口", "结局-车库遭遇战", "结局-车库围堵",
  "金谊广场-长廊-打听小明", "金谊广场-3F-幸存者-聊车",
]);
let missing = newScenes.filter((id) => !S("storyData[" + JSON.stringify(id) + "]"));
check(missing.length === 0, newScenes.length + " 个新增/保留场景全部存在" + (missing.length ? "（缺：" + missing.join(",") + "）" : ""));

const removed = [];
CELLS.forEach((id) => { /* 旧区名已复用，无旧ID */ });
["新达汇-B1停车场A区", "新达汇-B1停车场B区", "新达汇-B1停车场C区", "新达汇-B1停车场D区",
 "新达汇-B1停车场E区", "新达汇-B1停车场F区", "新达汇-B1停车场G区", "新达汇-B1停车场H区",
 "新达汇-B1停车场I区", "新达汇-B1停车场J区", "新达汇-B1停车场K区", "新达汇-B1停车场L区",
 "新达汇-B1停车场-驾驶-深处掉头", "新达汇-B1停车场-驾驶-东车道", "新达汇-B1停车场-驾驶-主通道",
 "新达汇-B1停车场-驾驶-横道", "新达汇-B1停车场-驾驶-西车道", "新达汇-B1停车场-驾驶-入口平台",
 "新达汇-B1停车场-驾驶-坡道口", "新达汇-B1停车场-驾驶-围堵", "新达汇-B1停车场-驾驶-冲出坡道",
 "新达汇-B1停车场-拿钥匙", "新达汇-B1停车场-搜SUV", "新达汇-B1停车场-搜面包车",
].forEach((id) => removed.push(id));
const stillThere = removed.filter((id) => !!S("storyData[" + JSON.stringify(id) + "]"));
check(stillThere.length === 0, "旧 12 区 + 8 驾驶节点 + 旧拿钥匙链已全部删除" + (stillThere.length ? "（残留：" + stillThere.join(",") + "）" : ""));
check(S("typeof xdGarGo") === "undefined" || S("typeof xdGarGo") === "function" ? S("typeof xdGarMapHint") === "undefined" : true, "xdGarMapHint 已退役（被罗盘定位取代）");

console.log("\n=== 3. 网格结构与连通性 ===");
const grid = S("XDGRID");
check(!!grid && Object.keys(grid).length === 9, "XDGRID 恰好 9 格");
// 坐标一致：邻接边必然正交相邻，且双向对称
let symBad = [], coordBad = [];
const DELTA = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
for (const [id, g] of Object.entries(grid)) {
  for (const dir of ["N", "E", "S", "W"]) {
    const t = g[dir];
    if (!t) continue;
    if (!grid[t]) { symBad.push(id + "->" + t); continue; }
    if (grid[t][{ N: "S", S: "N", E: "W", W: "E" }[dir]] !== id) symBad.push(id + "->" + t + "（单向边）");
    const dx = grid[t].x - g.x, dy = grid[t].y - g.y;
    if (dx !== DELTA[dir][0] || dy !== DELTA[dir][1]) coordBad.push(id + "->" + t);
  }
}
check(symBad.length === 0, "所有边双向对称" + (symBad.length ? "：" + symBad.join(";") : ""));
check(coordBad.length === 0, "邻接边与坐标一致（正交相邻）" + (coordBad.length ? "：" + coordBad.join(";") : ""));
// 连通性：从入口平台 BFS 全可达
const seen = new Set([G]);
let q = [G];
while (q.length) {
  const cur = q.shift();
  for (const dir of ["N", "E", "S", "W"]) {
    const t = grid[cur][dir];
    if (t && !seen.has(t)) { seen.add(t); q.push(t); }
  }
}
check(seen.size === 9, "九宫格全连通（从入口平台可达 9/9）");
// 环秩 = 边数 - 节点数 + 1 ≥ 2
let edgeCount = 0;
for (const [, g] of Object.entries(grid)) for (const dir of ["N", "E", "S", "W"]) if (g[dir]) edgeCount++;
edgeCount /= 2;
check(edgeCount - 9 + 1 >= 2, "环秩 = " + (edgeCount - 9 + 1) + "（≥2，网状结构成立）");
const trench = S("XD_TRENCH");
check(!!trench && trench[D] === true && trench[A] === true && !trench[E] && !trench[G], "贴沟格=西侧车道两格（驾驶额外扣次的挂点）");

console.log("\n=== 4. 定序与选项槽位 ===");
let fixedOk = true;
CELLS.forEach((id) => { const sc = S("storyData[" + JSON.stringify(id) + "]"); if (!sc.fixedChoices) fixedOk = false; });
check(fixedOk, "9 个分区全部 fixedChoices=true（方位选项不得乱序）");
const gScene = S("storyData[" + JSON.stringify(G) + "]");
var v = Object.assign({}, base);
const gChoices = gScene.choices(v);
check(gChoices.length === 5, "入口平台面北：前(西车道)+右(主通道) 2个移动槽 + 3个POI = 5 选项（实际 " + gChoices.length + "）");
check(gChoices[0].text.indexOf("向前走") === 0 && gChoices[1].text.indexOf("往右手边走") === 0, "前/右 槽位按固定顺序排列");
check(gChoices[0].nextScene === D && gChoices[1].nextScene === H, "面北时：前=西车道南段，右=主通道南段");
// 面东时的左右映射
var v2 = Object.assign({}, base, { _garageFacing: "E", _lastScene: G });
const gChoicesE = gScene.choices(v2);
check(gChoicesE[0].nextScene === H, "入口平台面东：前=主通道南段");
check(gChoicesE[1].text.indexOf("往左手边走") === 0 && gChoicesE[1].nextScene === D, "面东时左转=北=西车道南段（CCW 映射正确）");
check(gChoicesE.length === 5 && gChoicesE.slice(0, 2).every((c) => c.nextScene === H || c.nextScene === D), "入口平台面东：右(S)/后(W)无邻格 → 槽位隐藏（只剩前+左）");
// 中心枢纽 4 邻 + POI
const eScene = S("storyData[" + JSON.stringify(E) + "]");
var v3 = Object.assign({}, base, { _lastScene: H });
const eChoices = eScene.choices(v3);
check(eChoices.length === 5, "中段枢纽面北：4 个移动槽 + 配电室 POI = 5（实际 " + eChoices.length + "）");
check(eChoices[0].nextScene === B && eChoices[1].nextScene === D && eChoices[2].nextScene === F && eChoices[3].nextScene === H, "中段枢纽：前=北段 左=西车道 右=停车排 后=南段");
// 移动耗时 5 分钟/格（步行）
var wvW = { weather: "阴", hh: 8, mm: 0, dd: 1 };
eChoices[0].effect(wvW);
check(wvW.hh === 8 && wvW.mm === 5, "步行移动耗时 5 分钟/格（8:00→8:05）");
// 中段枢纽面东：4 邻全在，CW/OPP 映射
const eChoicesE = eScene.choices(Object.assign({}, base, { _garageFacing: "E", _lastScene: G }));
check(eChoicesE[2].text.indexOf("往右手边走") === 0 && eChoicesE[2].nextScene === H, "中段枢纽面东：右转=南=主通道南段（CW 映射正确）");
check(eChoicesE[3].text.indexOf("转身走") === 0 && eChoicesE[3].nextScene === D, "中段枢纽面东：掉头槽=西=西车道南段（OPP 映射正确）");
// onEnter facing 初始化：从主通道南段向北进中段枢纽 → facing=N
var v4 = Object.assign({}, base, { _lastScene: H, _garageFacing: "S" });
eScene.onEnter(v4);
check(v4._garageFacing === "N", "从南格进中段枢纽：facing 更新为 N（面向移动方向）");
// 倒车保持车头朝向
var v5 = Object.assign({}, base, { _driving: true, _lastScene: E, _garageFacing: "N", _garageRev: true });
S("storyData[" + JSON.stringify(H) + "]").onEnter(v5);
check(v5._garageFacing === "N" && v5._garageRev === false, "驾驶倒车进南格：车头朝向不变、_garageRev 清除");
// 回溯计数：中段枢纽当时可选数 >1（backtrack 兼容）
const csc = S("countSceneChoices")(E, Object.assign({}, base, { _lastScene: H, _garageFacing: "N" }));
check(csc >= 4, "countSceneChoices 对函数式 choices 求值正常（中段枢纽 " + csc + " 个，回溯可用）");

console.log("\n=== 5. 驾驶逃亡（并入网格） ===");
const ign = S("storyData['新达汇-B1停车场-上车点火']");
var iv = { chasedByZombies: 0, _escapeOps: 0, _driving: false };
S("storyData['新达汇-B1停车场-上车点火'].onEnter")(iv);
check(iv._escapeOps === 6 && iv._driving === true && iv.chasedByZombies === 1, "点火：_escapeOps=6 + _driving=true + 追兵+1");
check(ign.qte && typeof ign.qte.timeout === "string" && ign.qte.onTimeout === "结局-车库围堵", "点火 QTE：超时=结局-车库围堵");
check(ign.choices[0].nextScene === C, "点火后 → 车道尽头（驾驶态首格）");

var dv = Object.assign({}, base, { _driving: true, _escapeOps: 6, _garageFacing: "E", _lastScene: B });
const cDrv = S("storyData[" + JSON.stringify(C) + "]").choices(dv);
const moves = cDrv.filter((c) => c.condition === "_escapeOps > 0");
check(moves.length >= 1 && moves.every((m) => m.elseScene === "新达汇-B1停车场-围堵"), "驾驶态移动选项：条件 _escapeOps>0，失败一律 elseScene=围堵");
check(cDrv.every((c) => ["靠近那辆车", "上车", "搜查角落的车"].indexOf(typeof c.text === "string" ? c.text : "") === -1), "驾驶态隐藏全部 POI（不能下车搜车）");
// 移动扣次 -1
const fwd = cDrv.find((c) => c.text.indexOf("向前开") === 0 || c.text.indexOf("倒车") === 0);
var wv = { _escapeOps: 3, weather: "阴", hh: 8, mm: 0, dd: 1 };
const eff = fwd.effect(wv);
if (eff && eff.add && eff.add._escapeOps) wv._escapeOps += eff.add._escapeOps;
check(wv._escapeOps === 2, "驾驶移动一次 _escapeOps -1（3→2）");
// 移动耗时 5 分钟/格（驾驶）
var wvT = { _escapeOps: 3, weather: "阴", hh: 8, mm: 0, dd: 1 };
fwd.effect(wvT);
check(wvT.hh === 8 && wvT.mm === 1, "驾驶移动耗时 1 分钟/格（8:00→8:01，比步行快）");
// 贴沟格离开额外 -1
var tv = Object.assign({}, base, { _driving: true, _escapeOps: 6, _garageFacing: "N", _lastScene: G });
const dMoves = S("storyData[" + JSON.stringify(D) + "]").choices(tv);
const dMove = dMoves.find((c) => c.condition === "_escapeOps > 0");
var wv2 = { _escapeOps: 3, weather: "阴", hh: 8, mm: 0, dd: 1 };
const eff2 = dMove.effect(wv2);
if (eff2 && eff2.add && eff2.add._escapeOps) wv2._escapeOps += eff2.add._escapeOps;
check(wv2._escapeOps === 1, "贴沟格离开额外 -1（3→1，一次移动共扣 2）");
check(dMove.text.indexOf("费工夫") < 0, "过路费不在选项文案里点破（先读到费时描写，离开时才付）");
// 围堵与冲出
const rush = S("storyData['新达汇-B1停车场-围堵']");
check(rush.qte && rush.qte.onTimeout === "结局-车库围堵" && rush.choices[0].nextScene === "新达汇-B1停车场-冲出坡道", "围堵 QTE：硬冲成功→冲出坡道，超时→死亡");
const rushTxt = rush.text({ _lastScene: D });
check(rushTxt.indexOf("D 区") >= 0, "围堵正文按来源分区字母给过渡句");
const ramp = S("storyData['新达汇-B1停车场-冲出坡道']");
check(ramp.choices[0].nextScene === "新达汇车库出口", "冲出坡道 → 车库出口（辅路）");
// 入口平台驾驶出口
var gv = Object.assign({}, base, { _driving: true, _escapeOps: 6, _garageFacing: "N" });
const gDrv = gScene.choices(gv);
check(gDrv.some((c) => c.nextScene === "新达汇-B1停车场-冲出坡道"), "驾驶态在入口平台：保留冲坡道出口（不受 ops 限制）");
check(!gDrv.some((c) => c.text === "沿坡道出库" || c.text === "查看消防疏散图" || c.text === "回B1走廊" || c.text === "去B1走廊"), "驾驶态隐藏步行 POI（疏散图/步行出库/走廊）");
// 驾驶文本
const driveText = S("storyData[" + JSON.stringify(H) + "]").text(Object.assign({}, base, { _driving: true, _escapeOps: 6 }));
check(driveText.indexOf("车灯") >= 0, "驾驶态正文=车灯光柱视角");
check(driveText.indexOf("排水沟的方向炸开一片水声") >= 0, "驾驶态带引擎声反馈（旧驾驶链文案移植）");
// 出库交割 + _driving 清除
const exitScene = S("storyData['新达汇车库出口']");
var ev = { showZombies: false, _driving: true, _visit: { "新达汇-B1停车场-上车点火": 1 }, hasCar: false, hasEbike: true, hasRustyBike: true, chasedByZombies: 3 };
exitScene.onEnter(ev);
check(ev.hasCar === true && ev.hasEbike === false && ev.hasRustyBike === false && ev._driving === false, "出库交割：hasCar=true、放弃电瓶车/自行车、_driving 清除");
check(ev.chasedByZombies === 2, "躲进车里：追兵 -1");
var ev2 = { showZombies: false, _driving: false, _visit: {}, hasCar: false, chasedByZombies: 1 };
exitScene.onEnter(ev2);
check(ev2.hasCar === false && ev2.chasedByZombies === 1, "步行到访（未点火）：不触发交割、不误减追兵");

console.log("\n=== 6. 噪音衰减（驱逐不清零，锚点=入口平台） ===");
var av = { dd: 2, _garageLastDay: 1, _garageOps: 7, currentPlace: "", currentPos: "" };
gScene.onEnter(av);
check(av._garageOps === 5 && av._garageLastDay === 2, "跨日衰减：7 - 2 = 5（不清零）");
gScene.onEnter(av);
check(av._garageOps === 5, "同日重入：不再衰减（守卫生效）");
av.dd = 4;
gScene.onEnter(av);
check(av._garageOps === 1 && av._garageDecayDays === 2, "隔两天再衰减：5 - 4 = 1，播报天数=2");
check(av.currentPlace === "新达汇" && av.currentPos === "地下车库", "入口平台 onEnter 照常设置位置");
// 非入口格不做衰减
var av2 = { dd: 5, _garageLastDay: 1, _garageOps: 6 };
S("storyData[" + JSON.stringify(H) + "]").onEnter(av2);
check(av2._garageOps === 6, "普通分区 onEnter 不动噪音（衰减只锚入口平台）");

console.log("\n=== 7. 方向系统文案 ===");
var nv = Object.assign({}, base, { _lastScene: H, _garageFacing: "N" });
eScene.onEnter(nv);
const eText = eScene.text(nv);
check(eText.indexOf("边过来") < 0, "跨格进入不加绝对方位过渡句（玩家无东南西北感）");
const eTextMap = eScene.text(Object.assign({}, nv, { _garageMapSeen: true, _wiredCorrectly: true }));
check(eTextMap.indexOf("疏散图上的方位对上了") >= 0 && eTextMap.indexOf("E 区") >= 0, "看过疏散图：正文给绝对方位定位（含当前格字母）");
const eTextNoMap = eScene.text(Object.assign({}, nv, { _garageMapSeen: false }));
check(eTextNoMap.indexOf("疏散图上的方位对上了") < 0, "没看过疏散图：不给方位定位");
// 立柱漆字指路：亮态给去处（字母），全黑不给；选项本身不写目的地
const eTextLit = eScene.text(Object.assign({}, nv, { _wiredCorrectly: true }));
check(eTextLit.indexOf("立柱上的分区漆字") >= 0 && eTextLit.indexOf("正前是 B 区") >= 0 && eTextLit.indexOf("右手边是 F 区") >= 0, "亮态正文给漆字指路（正前=B 区 右手边=F 区，按朝向相对表述）");
check(eChoices.slice(0, 4).every((c) => c.text.indexOf("——") < 0), "移动选项只写动词，不写目的地");
check(eText.indexOf("分区漆字") < 0, "全黑看不见漆字指路");
// 黑暗降级
const hDarkText = S("storyData[" + JSON.stringify(H) + "]").text(Object.assign({}, base, { _lastScene: G }));
check(hDarkText.indexOf("冰凉的引擎盖") >= 0, "全黑态：触感文案（引擎盖轮廓）");
// C 区事故点分态
const cScene = S("storyData[" + JSON.stringify(C) + "]");
const cTextD3 = cScene.text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true }));
check(cTextD3.indexOf("深灰色的荣威") >= 0 && cTextD3.indexOf("引擎盖摸上去是温的") >= 0, "Day3+通电：事故点=小明的车（温的引擎盖；钥匙句在战斗后分支）");
const cTextGone = cScene.text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _visit: { "新达汇-B1停车场-上车点火": 1 } }));
check(cTextGone.indexOf("空空荡荡") >= 0, "车开走后：空车位闭环文案");
const cTextKnow = cScene.text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _knowsSurvivorCar: true }));
check(cTextKnow.indexOf("小明") >= 0, "知道长廊情报：文案呼应小明");
const cTextNoKnow = cScene.text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _knowsSurvivorCar: false }));
check(cTextNoKnow.indexOf("小明") < 0, "不知道情报：文案不点名（信息分层）");

console.log("\n=== 8. 事故点闸门 ===");
const condNear = cScene.choices(Object.assign({}, base)).find((c) => typeof c.text === "string" && c.text === "靠近那辆车");
const condEnter = cScene.choices(Object.assign({}, base)).find((c) => typeof c.text === "string" && c.text === "上车");
const condSearch = cScene.choices(Object.assign({}, base)).find((c) => typeof c.text === "string" && c.text === "搜查角落的车");
check(!!condNear && !!condEnter && !!condSearch, "三个闸门选项在位");
check(!evalCond(condNear.showCondition, base), "Day1 未通电：不出现「靠近那辆车」");
check(!!evalCond(condSearch.showCondition, base), "Day1：随机搜车兜底可用");
check(!!evalCond(condNear.showCondition, Object.assign({}, base, { dd: 3, _wiredCorrectly: true })), "Day3+通电：出现「靠近那辆车」");
check(!!evalCond(condNear.showCondition, Object.assign({}, base, { dd: 3, _wiredCorrectly: true, hasCar: true })), "王老师线已有车（全局hasCar）：本线事故点不受影响");
check(!evalCond(condNear.showCondition, Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _visit: { "新达汇-B1停车场-上车点火": 1 } })), "本线点火离开：「靠近」消失（二次点火不可能）");
check(!!evalCond(condEnter.showCondition, Object.assign({}, base, { dd: 3, _wiredCorrectly: true, _visit: { "新达汇-B1停车场-车旁搜身": 1 } })), "完胜搜身后退开：可直接「上车」");

console.log("\n=== 9. POI 挂接与守卫 ===");
check(!!S("storyData[" + JSON.stringify(E) + "]").choices({}).find ? (eChoices[4].nextScene === "新达汇-B1停车场-配电室") : false, "中段枢纽挂配电室 POI");
const roomScene = S("storyData['新达汇-B1停车场-配电室']");
const roomExit = roomScene.choices.find((c) => c.text === "退回 E 区");
check(roomExit && roomExit.condition === "_garageOps < 5" && roomExit.elseScene === "新达汇-B1停车场-强制驱逐", "配电室退出口：ops>=5 强制驱逐");
// 门外不剧透：E 格描述与 POI 选项都不得出现"配电"（进去才知道是什么）
const ePoiText = typeof eChoices[4].text === "string" ? eChoices[4].text : eChoices[4].text({});
check(ePoiText.indexOf("配电") < 0, "E 格 POI 选项不点破配电室（实际选项文本：" + ePoiText + "）");
check(eScene.text({ dd: 1, _wiredCorrectly: true, _garageOps: 0 }).indexOf("配电") < 0, "E 格亮灯描述不点破配电");
check(eScene.text({ dd: 1 }).indexOf("配电") < 0, "E 格摸黑描述不点破配电");
const bScene = S("storyData[" + JSON.stringify(B) + "]");
const bChoices = bScene.choices(Object.assign({}, base, { _lastScene: G }));
const bStairs = bChoices.find((c) => typeof c.text === "string" && c.text === "走下台阶，下 J 区");
check(!!bStairs && bStairs.condition === "_garageOps < 5" && bStairs.elseScene === "新达汇-B1停车场-强制驱逐", "主通道北段挂旧区 POI，ops>=5 强制驱逐");
const iChoices = S("storyData[" + JSON.stringify(I) + "]").choices(Object.assign({}, base, { _lastScene: H }));
const iCrawl = iChoices.find((c) => typeof c.text === "string" && c.text === "侧身穿过检修通道");
check(!!iCrawl && iCrawl.nextScene === C, "杂物拐角检修通道 → 车道尽头（步行-only 捷径）");
const fChoices = S("storyData[" + JSON.stringify(F) + "]").choices(Object.assign({}, base, { _lastScene: E }));
check(fChoices.some((c) => c.nextScene === "新达汇-B1停车场-搜车"), "第二停车排保留搜车入口（含白荣威假线索）");
const aChoices = S("storyData[" + JSON.stringify(A) + "]").choices(Object.assign({}, base, { _lastScene: B }));
check(aChoices.some((c) => c.nextScene === "新达汇-B1停车场-搜车"), "西车道北段挂搜车入口（面包车）");
// 搜车入口全局：驾驶态在 F 无搜车
var fDrv = S("storyData[" + JSON.stringify(F) + "]").choices(Object.assign({}, base, { _driving: true, _escapeOps: 6, _garageFacing: "S" }));
check(!fDrv.some((c) => c.nextScene === "新达汇-B1停车场-搜车"), "驾驶态不出现搜车入口");

console.log("\n=== 10. 搜车链回原格 ===");
const router = S("xdGarSearchRouter");
check(typeof router === "function" && Array.isArray(router.__sceneRefs) && router.__sceneRefs.length === 5, "路由函数挂 __sceneRefs（5 目标）");
const targets = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 3, _garageSearchFrom: C }));
  targets[t] = (targets[t] || 0) + 1;
}
check(!!targets["新达汇-B1停车场-摸黑遭遇"], "起点=车道尽头时 Day3 摸黑会撞上守车的丧尸（0.3 权重）");
const tLast = {};
for (let i = 0; i < 300; i++) {
  const t = router(Object.assign({}, base, { dd: 3, _lastScene: C, _garageSearchFrom: H }));
  tLast[t] = 1;
}
check(!tLast["新达汇-B1停车场-摸黑遭遇"], "遭遇只看本轮搜车起点，不看 _lastScene 来路");
const searchHub = S("storyData['新达汇-B1停车场-搜车']");
var sv1 = { _garageOps: 0, _garageSearchPending: false, _garageSearchFrom: "", _lastScene: D };
searchHub.onEnter(sv1);
check(sv1._garageSearchFrom === D && sv1._garageSearchPending === true, "搜车hub记录本轮起点格");
const backCheck = S("storyData['新达汇-B1停车场-车库检查']");
const contChoice = backCheck.choices.find((c) => c.text === "回到原地继续探索");
check(typeof contChoice.nextScene === "function" && contChoice.nextScene({ _garageSearchFrom: D }) === D, "「回到原地继续探索」→ 本轮搜车起点格");
check(contChoice.nextScene({}) === H, "无起点记录时兜底回主通道南段");
var sv2 = { _garageSearchPending: true };
backCheck.onEnter(sv2);
check(sv2._garageSearchPending === false, "车库检查清除搜车链标记");
const t4 = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 2, _garageLootLeft: 0 }));
  t4[t] = 1;
}
check(!t4["新达汇-B1停车场-搜车-捡到吃的"], "_garageLootLeft=0 时物资不再掉落（防刷闸）");

console.log("\n=== 11. 出口路线完整性 ===");
// 车库步行层→外界仅两条边：入口平台→B1走廊、入口平台→坡道出库。scripted 例外：强制驱逐 / 冲出坡道。
const scriptedExits = ["新达汇-B1停车场-强制驱逐", "新达汇-B1停车场-冲出坡道", "新达汇-B1停车场-围堵"];
const exitEdges = [];
const SD = S("storyData");
for (const [sid, sc] of Object.entries(SD)) {
  const isGarage = sid.indexOf("新达汇-B1-") === 0 || sid.indexOf("新达汇-B1停车场-") === 0 || sid === "新达汇车库出口";
  if (!isGarage) continue;
  if (sid.indexOf("结局") === 0 || scriptedExits.indexOf(sid) >= 0) continue;
  const cs = typeof sc.choices === "function" ? sc.choices(Object.assign({}, base)) : (sc.choices || []);
  cs.forEach((c) => {
    const nxt = typeof c.nextScene === "function" ? null : c.nextScene;
    if (nxt === "新达汇-B1走廊" || nxt === "新达汇车库出口") exitEdges.push(sid + " -> " + nxt);
  });
}
check(exitEdges.length === 2 && exitEdges.indexOf(G + " -> 新达汇-B1走廊") >= 0 && exitEdges.indexOf(G + " -> 新达汇车库出口") >= 0,
  "步行层→外界仅两条边，均出自入口平台（实际边：" + exitEdges.join(" / ") + "）");
check(S("storyData['新达汇-B1停车场-强制驱逐']").choices.some((c) => c.nextScene === "新达汇-B1走廊"), "scripted 交割出口：强制驱逐→B1走廊");
// 跨文件：B1走廊入口已指向新格；金谊线不动
const xdSrc = fs.readFileSync(path.join(ROOT, "story/东明街道/新达汇.js"), "utf8");
check(xdSrc.indexOf("新达汇-B1-入口平台") >= 0 && xdSrc.indexOf("新达汇-B1停车场A区") < 0, "新达汇.js 的 B1走廊入口已指向新格 ID");
check(!!S("storyData['金谊广场地面入口']") && S("storyData['新达汇车库出口']").choices.some((c) => c.nextScene === "金谊广场地面入口"), "车库出口→金谊广场路线保留");

console.log("\n=== 12. 战斗与结局链（保留项抽查） ===");
const battle = S("storyData['新达汇-B1停车场-车旁遭遇']");
check(typeof battle.onEnter === "function" && battle.choices[0].input && battle.choices[0].timeout === 20000, "车旁遭遇：initMemoryGame 闪色 + 20s 超时");
const dark = S("storyData['新达汇-B1停车场-摸黑遭遇']");
check(dark.choices[0].timeout === 18000, "摸黑遭遇：18s");
const mk = S("storyData['新达汇-B1停车场-摸黑-脱身']");
check(mk.onEnter.set && mk.onEnter.set._garageFMarked === true, "摸黑-脱身：记 _garageFMarked");
check(mk.choices[0].nextScene === C, "摸黑脱身 → 车道尽头（新格 ID）");
const wireDim = S("storyData['新达汇-B1停车场-接线']").choices.find((c) => c.showCondition === "!hasTorch && hasPhone && phoneBattery > 0");
check(!!wireDim, "接线：手机微光档在位");
check(S("storyData['新达汇-B1停车场-接线成功']").choices[0].nextScene === "新达汇-B1停车场-配电室", "接线成功返回配电室");
const end1 = S("storyData['结局-车库遭遇战']"), end2 = S("storyData['结局-车库围堵']");
check(typeof end1.text === "function" && end1.text({}).indexOf("结局：车库遭遇战") >= 0, "结局行格式：end 标记（遭遇战）");
check(typeof end2.text === "function" && end2.text({}).indexOf("结局：车库围堵") >= 0, "结局行格式：end 标记（围堵）");
const mapScene = S("storyData['新达汇-B1停车场-疏散图']");
check(mapScene.text.indexOf("九宫格") >= 0 && mapScene.onEnter.set._garageMapSeen === true, "疏散图文案升级为九宫格方位 + _garageMapSeen");
check(typeof mapScene.choices[0].nextScene === "function" && mapScene.choices[0].nextScene({ _lastScene: G }) === G, "疏散图「记下了」返回来时的格");
const gcChoices = backCheck.choices;
check(!gcChoices.some((c) => c.nextScene === "新达汇-B1走廊" || c.nextScene === "新达汇车库出口"), "车库检查结算点不直跳出口");

console.log("\n结果：" + okCount + " 通过 / " + badCount + " 失败");
process.exit(badCount ? 1 : 0);
