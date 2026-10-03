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
  _garageLootLeft: 3, _escapeOps: 0, _garageLastDay: 1,
  _garDenA: 0, _garDenB: 0, _garDenC: 0, _garDenD: 0, _garDenE: 0,
  _garDenF: 0, _garDenG: 0, _garDenH: 0, _garDenI: 0,
  _garGrace: 0, _garJQuietDay: 0, _garFightCell: "", _garDriveTarget: "",
  _garageFacing: "N", _driving: false, _garageRev: false,
  _lastScene: "新达汇-B1走廊",
  hasTorch: false, hasPhone: false, phoneBattery: 0,
};

// 移动选项的 nextScene 现在是密度路由函数（xdCellEntry 闭包），断言前先解析
const nx = (c, v) => (typeof c.nextScene === "function" ? c.nextScene(v) : c.nextScene);

console.log("\n=== 1. 变量声明与钳位 ===");
S("var __sv = storyData._variables, __cap = storyData._caps;");
const sv = S("__sv"), cap = S("__cap");
check(sv && "_garageFacing" in sv && sv._garageFacing === "N", "_variables 声明 _garageFacing='N'");
check(sv && "_driving" in sv && sv._driving === false, "_variables 声明 _driving=false");
check(sv && "_garageRev" in sv && sv._garageRev === false, "_variables 声明 _garageRev=false（倒车保车头标记）");
check(sv && "_escapeOps" in sv && sv._escapeOps === 0, "_variables 声明 _escapeOps=0");
check(sv && "_garageLootLeft" in sv && sv._garageLootLeft === 3, "_variables 声明 _garageLootLeft=3（世界库存）");
check(sv && "_garageMapSeen" in sv && sv._garageMapSeen === false, "_variables 声明 _garageMapSeen=false");
check(sv && "_garageLastDay" in sv && sv._garageLastDay === 1, "_variables 声明 _garageLastDay=1");
check(sv && "_knowsSurvivorCar" in sv && sv._knowsSurvivorCar === false, "_variables 声明 _knowsSurvivorCar=false");
check(sv && "_garageSearchFrom" in sv && sv._garageSearchFrom === "", "_variables 声明 _garageSearchFrom=''");
check(sv && "_garageDecayDays" in sv && sv._garageDecayDays === 0, "_variables 声明 _garageDecayDays=0");
check(sv && "_garDenA" in sv && sv._garDenA === 0 && "_garDenI" in sv && sv._garDenI === 0, "_variables 声明 9 格密度 _garDenA~I=0");
check(sv && "_garGrace" in sv && sv._garGrace === 0, "_variables 声明 _garGrace=0（击散余波平静）");
check(sv && "_garJQuietDay" in sv && sv._garJQuietDay === 0, "_variables 声明 _garJQuietDay=0（J区安静日）");
check(sv && "_garFightCell" in sv && sv._garFightCell === "", "_variables 声明 _garFightCell=''");
check(sv && "_garDriveTarget" in sv && sv._garDriveTarget === "", "_variables 声明 _garDriveTarget=''");
check(sv && !("_garageOps" in sv) && !("_garageFMarked" in sv), "旧噪音/摸黑标记变量已从 _variables 移除");
check(!!(cap && cap._garageLootLeft && cap._garageLootLeft.max === 3), "_caps 登记 _garageLootLeft 0-3");

console.log("\n=== 2. 场景存在与旧节点清理 ===");
const newScenes = CELLS.concat([
  "新达汇-B1停车场-配电室", "新达汇-B1停车场-接线", "新达汇-B1停车场-接线成功", "新达汇-B1停车场-接线失败",
  "新达汇-B1停车场-旧区", "新达汇-B1停车场-涂鸦", "新达汇-B1停车场-疏散图",
  "新达汇-B1停车场-搜车-空车", "新达汇-B1停车场-搜车-捡到吃的",
  "新达汇-B1停车场-搜车-出声", "新达汇-B1停车场-搜车-锁车惊吓", "新达汇-B1停车场-搜车-惊吓击杀",
  "新达汇-B1停车场-车旁遭遇", "新达汇-B1停车场-车旁搜身", "新达汇-B1停车场-车旁搜身-受伤",
  "新达汇-B1停车场-尸潮遭遇", "新达汇-B1停车场-尸潮-击散",
  "新达汇-B1停车场-巢穴遭遇", "新达汇-B1停车场-巢穴-占稳", "新达汇-B1停车场-截停",
  "新达汇-B1停车场-上车点火", "新达汇-B1停车场-围堵", "新达汇-B1停车场-冲出坡道",
  "新达汇-B1停车场-车库检查",
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
 "新达汇-B1停车场-摸黑遭遇", "新达汇-B1停车场-摸黑-脱身", "新达汇-B1停车场-摸黑-带伤",
 "新达汇-B1停车场-强制驱逐",
 "新达汇-B1停车场-拿钥匙", "新达汇-B1停车场-搜SUV", "新达汇-B1停车场-搜面包车",
 "新达汇-B1停车场-搜车",   // 波波 10-03：砍掉的搜车中间节点（POI 现在直出结果）
].forEach((id) => removed.push(id));
const stillThere = removed.filter((id) => !!S("storyData[" + JSON.stringify(id) + "]"));
check(stillThere.length === 0, "旧 12 区 + 8 驾驶节点 + 旧拿钥匙链 + 摸黑链 + 强制驱逐 + 搜车中间节点已全部删除" + (stillThere.length ? "（残留：" + stillThere.join(",") + "）" : ""));
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
check(gChoices.length === 6, "入口平台面北：前(西车道)+右(主通道) 2个移动槽 + 4个POI = 6 选项（实际 " + gChoices.length + "）");
check(gChoices[0].text.indexOf("向前走") === 0 && gChoices[1].text.indexOf("往右手边走") === 0, "前/右 槽位按固定顺序排列");
check(nx(gChoices[0], v) === D && nx(gChoices[1], v) === H, "面北时：前=西车道南段，右=主通道南段");
// 面东时的左右映射
var v2 = Object.assign({}, base, { _garageFacing: "E", _lastScene: G });
const gChoicesE = gScene.choices(v2);
check(nx(gChoicesE[0], v2) === H, "入口平台面东：前=主通道南段");
check(gChoicesE[1].text.indexOf("往左手边走") === 0 && nx(gChoicesE[1], v2) === D, "面东时左转=北=西车道南段（CCW 映射正确）");
check(gChoicesE.length === 6 && gChoicesE.slice(0, 2).every((c) => nx(c, v2) === H || nx(c, v2) === D), "入口平台面东：右(S)/后(W)无邻格 → 槽位隐藏（2移动槽+4POI）");
// 中心枢纽 4 邻 + POI
const eScene = S("storyData[" + JSON.stringify(E) + "]");
var v3 = Object.assign({}, base, { _lastScene: H });
const eChoices = eScene.choices(v3);
check(eChoices.length === 6, "中段枢纽面北：4 个移动槽 + 防火门/搜车 POI = 6（实际 " + eChoices.length + "）");
check(nx(eChoices[0], v3) === B && nx(eChoices[1], v3) === D && nx(eChoices[2], v3) === F && nx(eChoices[3], v3) === H, "中段枢纽：前=北段 左=西车道 右=停车排 后=南段");
// 移动耗时 5 分钟/格（步行）
var wvW = { weather: "阴", hh: 8, mm: 0, dd: 1 };
eChoices[0].effect(wvW);
check(wvW.hh === 8 && wvW.mm === 5, "步行移动耗时 5 分钟/格（8:00→8:05）");
// 中段枢纽面东：4 邻全在，CW/OPP 映射
var ev3 = Object.assign({}, base, { _garageFacing: "E", _lastScene: G });
const eChoicesE = eScene.choices(ev3);
check(eChoicesE[2].text.indexOf("往右手边走") === 0 && nx(eChoicesE[2], ev3) === H, "中段枢纽面东：右转=南=主通道南段（CW 映射正确）");
check(eChoicesE[3].text.indexOf("转身走") === 0 && nx(eChoicesE[3], ev3) === D, "中段枢纽面东：掉头槽=西=西车道南段（OPP 映射正确）");
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
// 点火不再动 chasedByZombies：引擎声换算成全库密度 +1（不判"是否惊动过排水沟"= 这声就是惊动）
var iv = { chasedByZombies: 0, _escapeOps: 0, _driving: false, _visit: {} };
S("storyData['新达汇-B1停车场-上车点火'].onEnter")(iv);
var ivTotal = ["A","B","C","D","E","F","G","H","I"].reduce((s, L) => s + (iv["_garDen" + L] || 0), 0);
check(iv._escapeOps === 6 && iv._driving === true && ivTotal === 9,
  "点火：_escapeOps=6 + _driving=true + 全库 9 格各 +1（实际总密度 " + ivTotal + "）");
check(iv.chasedByZombies === 0, "点火不再写 chasedByZombies（车库内一律走密度）");
check((iv._visit || {})["新达汇-B1停车场-旧区"] >= 1, "点火即激活密度系统（引擎声＝惊动排水沟源头）");
check(ign.qte && typeof ign.qte.timeout === "string" && ign.qte.onTimeout === "结局-车库围堵", "点火 QTE：超时=结局-车库围堵");
check(nx(ign.choices[0], Object.assign({}, base, { _driving: true })) === C, "点火后 → 车道尽头（驾驶态首格，经密度路由）");

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
// 受伤档情报等价：战斗失误不扣情报（短信/清单背面/钥匙三件都在）
const hurtSearch = S("storyData['新达汇-B1停车场-车旁搜身-受伤']");
const hurtTxt = hurtSearch.text({ dd: 3 });
check(hurtTxt.indexOf("东西太多，我跑第二趟") >= 0 && hurtTxt.indexOf("卖给长廊") >= 0 && hurtTxt.indexOf("钥匙还插在点火器上") >= 0, "受伤档搜身情报完整（短信+清单背面+钥匙）");
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

console.log("\n=== 6. 密度跨日衰减（锚点=入口平台，每格 -1/天） ===");
var av = { dd: 2, _garageLastDay: 1, _garDenB: 3, _garDenE: 1, currentPlace: "", currentPos: "", _visit: {} };
gScene.onEnter(av);
check(av._garDenB === 2 && av._garDenE === 0 && av._garageLastDay === 2, "跨日衰减：B 3→2、E 1→0（每格每天-1）");
gScene.onEnter(av);
check(av._garDenB === 2, "同日重入：不再衰减（守卫生效）");
av.dd = 4;
gScene.onEnter(av);
check(av._garDenB === 0 && av._garageDecayDays === 2, "隔两天再衰减：2 - 2 = 0，播报天数=2");
check(av.currentPlace === "新达汇" && av.currentPos === "地下车库", "入口平台 onEnter 照常设置位置");
// 非入口格不做衰减（也未激活时不涨密度）
var av2 = { dd: 5, _garageLastDay: 1, _garDenH: 2, _visit: {} };
S("storyData[" + JSON.stringify(H) + "]").onEnter(av2);
check(av2._garDenH === 2 && av2._garageLastDay === 1, "普通分区 onEnter 不衰减（衰减只锚入口平台）");

console.log("\n=== 6b. 尸潮密度系统（涨/触发/余波/驾驶） ===");
const ent = S("xdCellEntry");
const denFn = S("xdGarDen");
const actFn = S("xdGarDenActive");
// 激活闸门
check(actFn({ _visit: {} }) === false && actFn({ _visit: { "新达汇-B1停车场-旧区": 1 } }) === true, "去过 J 区才激活密度系统");
// 进格涨密度
var gw = { dd: 1, _visit: { "新达汇-B1停车场-旧区": 1 }, _garGrace: 0, _garDenE: 0, _garageFacing: "N", _lastScene: H };
S("storyData[" + JSON.stringify(E) + "]").onEnter(gw);
check(gw._garDenE === 1, "激活后步行进格：本格密度 +1");
var gw5 = Object.assign({}, gw, { _garDenE: 3 });
S("storyData[" + JSON.stringify(E) + "]").onEnter(gw5);
check(gw5._garDenE === 3, "密度上限 3");
var gw6 = Object.assign({}, gw, { _visit: {}, _garDenE: 0 });
S("storyData[" + JSON.stringify(E) + "]").onEnter(gw6);
check(gw6._garDenE === 0, "未去过 J 区：密度系统未激活，进格不涨");
// 余波平静
var gw4 = Object.assign({}, gw, { _garDenE: 1, _garGrace: 2 });
S("storyData[" + JSON.stringify(E) + "]").onEnter(gw4);
check(gw4._garDenE === 1 && gw4._garGrace === 1, "余波平静第1次进格：消耗计数、不涨");
// 驾驶不涨
var gw2 = Object.assign({}, gw, { _garDenE: 3, _driving: true });
S("storyData[" + JSON.stringify(E) + "]").onEnter(gw2);
check(gw2._garDenE === 3, "驾驶态进格：不涨密度");
// 进格路由
check(ent(E)({ _visit: {}, _garDenE: 3 }) === E, "未激活：路由直通目标格（满密度也不打）");
check(ent(E)({ _visit: { "新达汇-B1停车场-旧区": 1 }, _garDenE: 2 }) === E, "密度2：只警告不开战");
var trig = { _visit: { "新达汇-B1停车场-旧区": 1 }, _garDenE: 3 };
check(ent(E)(trig) === "新达汇-B1停车场-尸潮遭遇" && trig._garFightCell === E, "步行进满密度格 → 尸潮遭遇（记录遭遇格）");
var drvTrig = { _visit: { "新达汇-B1停车场-旧区": 1 }, _garDenE: 3, _driving: true };
check(ent(E)(drvTrig) === "新达汇-B1停车场-截停" && drvTrig._garDriveTarget === E, "驾驶进满密度格 → 截停 QTE（记录目标格）");
// C 血腥加成
check(denFn({ _garDenC: 2, dd: 3 }, C) === 3 && denFn({ _garDenC: 2, dd: 2 }, C) === 2, "C 区 dd>=3 血腥加成 +1（不占存储上限）");
check(ent(C)({ _visit: { "新达汇-B1停车场-旧区": 1 }, _garDenC: 2, dd: 3 }) === "新达汇-B1停车场-尸潮遭遇", "C 区存储2+加成1=满：进格即遭遇");
// J 区源头
const jFn = S("xdJEntry");
check(jFn({ dd: 3, _garJQuietDay: 0 }) === "新达汇-B1停车场-巢穴遭遇", "J 区首入=巢穴遭遇（源头恒满）");
check(jFn({ dd: 3, _garJQuietDay: 3 }) === "新达汇-B1停车场-旧区", "巢穴打散当天：J 区安全");
check(jFn({ dd: 4, _garJQuietDay: 3 }) === "新达汇-B1停车场-巢穴遭遇", "次日：巢穴恢复，再入即战");
// 截停与击散结算
const stopScene = S("storyData['新达汇-B1停车场-截停']");
check(stopScene.qte && stopScene.qte.onTimeout === "结局-车库围堵", "截停 QTE：超时=结局-车库围堵");
check(stopScene.choices[0].nextScene({ _garDriveTarget: E }) === E, "截停硬冲成功：落到目标格");
var clv = { _garFightCell: E, _garDenE: 3, strength: 5, _garGrace: 0 };
S("storyData['新达汇-B1停车场-尸潮-击散']").onEnter(clv);
check(clv._garDenE === 0 && clv._garGrace === 2 && clv.strength === 4, "击散：所在格密度清零 + 余波平静2次 + 体力-1");
var jq = { dd: 3, _garJQuietDay: 0, strength: 5 };
S("storyData['新达汇-B1停车场-巢穴-占稳']").onEnter(jq);
check(jq._garJQuietDay === 3 && jq.strength === 4, "占稳：记录安静日 + 体力-1");
// 密度文案分档
const noiseFn = S("xdGarNoise");
check(noiseFn({ _garDenE: 0, dd: 1 }, E) === "", "密度0：无噪音文案");
check(noiseFn({ _garDenE: 1, dd: 1 }, E).indexOf("隐约又有水响") >= 0, "密度1：轻警告");
check(noiseFn({ _garDenE: 2, dd: 1 }, E).indexOf("要出事") >= 0, "密度2：明确警告");
check(noiseFn({ _garDenE: 3, dd: 1 }, E).indexOf("占满") >= 0, "密度3：满档文案");
check(noiseFn({ dd: 1 }, "新达汇-B1停车场-旧区") === "", "非网格格（J区）不走密度文案");

console.log("\n=== 7. 方向系统文案 ===");
var nv = Object.assign({}, base, { _lastScene: H, _garageFacing: "N" });
eScene.onEnter(nv);
const eText = eScene.text(nv);
check(eText.indexOf("边过来") < 0, "跨格进入不加绝对方位过渡句（玩家无东南西北感）");
// 立柱漆字指路：亮态报当前格+去处（字母，不看疏散图也能定位），全黑不给；选项本身不写目的地
const eTextLit = eScene.text(Object.assign({}, nv, { _wiredCorrectly: true }));
check(eTextLit.indexOf("E 区") >= 0 && eTextLit.indexOf("正前是 B 区") >= 0 && eTextLit.indexOf("右手边是 F 区") >= 0, "亮态漆字句报当前格+四向去处（无需看过疏散图）");
// 表述随机化（波波 10-03）：固定句式观感差，每档必须多变体、且信息一次都不能丢
const litSelfForms = new Set(), litDirForms = new Set();
const litVars = Object.assign({}, nv, { _wiredCorrectly: true });
for (let i = 0; i < 60; i++) {
  const t = eScene.text(litVars);
  for (const line of t.split("\n")) {
    if (line.indexOf("E 区") >= 0 && line.indexOf("正前是") < 0) litSelfForms.add(line);
    if (line.indexOf("正前是 B 区") >= 0) litDirForms.add(line.replace(/正前是 B 区.*/, "…"));
  }
}
check(litSelfForms.size >= 3, "亮态「当前格」句式 " + litSelfForms.size + " 种（随机化生效）");
check(litDirForms.size >= 3, "亮态「四向去处」句式 " + litDirForms.size + " 种（随机化生效）");
check(eTextLit.split("\n").every((ln) => ln.indexOf("{self}") < 0 && ln.indexOf("{dirs}") < 0), "模板占位符已全部替换（无 {self}/{dirs} 残留）");
// 手机微光：只够认当前格字母，看不到四向去处
const eTextDim = eScene.text(Object.assign({}, nv, { hasPhone: true, phoneBattery: 50 }));
check(eTextDim.indexOf("E 区") >= 0 && eTextDim.indexOf("正前是") < 0, "手机微光：只报当前格字母，不报四向去处");
const dimForms = new Set();
const dimVars = Object.assign({}, nv, { hasPhone: true, phoneBattery: 50 });
for (let i = 0; i < 60; i++) {
  for (const line of eScene.text(dimVars).split("\n")) if (line.indexOf("E 区") >= 0) dimForms.add(line);
}
check(dimForms.size >= 3, "手机微光「当前格」句式 " + dimForms.size + " 种");
check(eChoices.slice(0, 4).every((c) => c.text.indexOf("——") < 0), "移动选项只写动词，不写目的地");
check(eText.indexOf("分区漆字") < 0, "全黑看不见漆字指路");
// 驾驶态：车灯是独立光源。旧实现按 xdGarSight 判，无手电/无手机时会落进 dark 而整段漏掉指路。
// ⚠别按具体措辞断言（模板随机，"车头灯"里没有"车灯"子串）——要按「信息是否给出 + 是否错档」断言。
const drvForms = new Set();
const drvVars = Object.assign({}, nv, { _driving: true, hasTorch: true }); // 带手电也不该走手电档
let drvOk = true;
for (let i = 0; i < 40; i++) {
  const s = S("xdSignLine")(E, drvVars, true);
  if (s.indexOf("E 区") < 0 || s.indexOf("正前是 B 区") < 0) drvOk = false;
  for (const line of s.split("\n")) if (line.indexOf("E 区") >= 0) drvForms.add(line);
}
check(drvOk, "驾驶态必定给出当前格+四向（开着车却看不见柱面编号的既有 bug 已修）");
check(drvForms.size >= 2, "驾驶态「当前格」句式 " + drvForms.size + " 种");
check([...drvForms].every((f) => f.indexOf("手电") < 0), "驾驶态即使手持手电也不走手电档（双手在方向盘）");
// 黑暗降级（H=风与回音 / A=水声纸箱 / F=窄缝后备箱盖，三格触感锚点不同）
const hDarkText = S("storyData[" + JSON.stringify(H) + "]").text(Object.assign({}, base, { _lastScene: G }));
check(hDarkText.indexOf("空膛的回音") >= 0 && hDarkText.indexOf("凉风") >= 0, "全黑态 H：听觉锚点（空膛回音+纵向凉风）");
const aDarkText = S("storyData[" + JSON.stringify(A) + "]").text(Object.assign({}, base, { _lastScene: B }));
check(aDarkText.indexOf("纸箱") >= 0 && aDarkText.indexOf("水声") >= 0, "全黑态 A：水声贴耳+泡软的纸箱");
const fDarkText = S("storyData[" + JSON.stringify(F) + "]").text(Object.assign({}, base, { _lastScene: E }));
check(fDarkText.indexOf("后备箱盖") >= 0 && fDarkText.indexOf("侧身") >= 0, "全黑态 F：窄缝侧身+支棱的后备箱盖");
// C 区事故点分态
const cScene = S("storyData[" + JSON.stringify(C) + "]");
const cTextD3 = cScene.text(Object.assign({}, base, { dd: 3, _wiredCorrectly: true }));
check(cTextD3.indexOf("深灰色的荣威") >= 0 && cTextD3.indexOf("引擎盖摸上去是温的") >= 0, "Day3+通电：事故点=小明的车（温的引擎盖；钥匙句在战斗后分支）");
const cTextTorch = cScene.text(Object.assign({}, base, { dd: 3, _wiredCorrectly: false, hasTorch: true }));
check(cTextTorch.indexOf("车身上没有灰") >= 0 && cTextTorch.indexOf("黑暗里分不清") < 0, "Day3+手电（未通电）：光柱能看见车与影子，不再误读黑暗文案");
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
check(roomExit && !roomExit.condition && typeof roomExit.nextScene === "function", "配电室退出口：无 ops 闸门，走密度路由");
// 门外不剧透：E 格描述与 POI 选项都不得出现"配电"（进去才知道是什么）
const ePoiText = typeof eChoices[4].text === "string" ? eChoices[4].text : eChoices[4].text({});
check(ePoiText.indexOf("配电") < 0, "E 格 POI 选项不点破配电室（实际选项文本：" + ePoiText + "）");
check(eScene.text({ dd: 1, _wiredCorrectly: true, _garageOps: 0 }).indexOf("配电") < 0, "E 格亮灯描述不点破配电");
check(eScene.text({ dd: 1 }).indexOf("配电") < 0, "E 格摸黑描述不点破配电");
const bScene = S("storyData[" + JSON.stringify(B) + "]");
const bChoices = bScene.choices(Object.assign({}, base, { _lastScene: G }));
const bStairs = bChoices.find((c) => typeof c.text === "string" && c.text === "走下台阶，下 J 区");
check(!!bStairs && typeof bStairs.nextScene === "function" && bStairs.nextScene({ dd: 1, _garJQuietDay: 0 }) === "新达汇-B1停车场-巢穴遭遇", "主通道北段挂 J 区入口：进入走巢穴遭遇路由");
const iChoices = S("storyData[" + JSON.stringify(I) + "]").choices(Object.assign({}, base, { _lastScene: H }));
check(iChoices.every((c) => typeof c.text !== "string" || c.text.indexOf("检修通道") < 0), "杂物拐角检修通道已删除（跨格捷径会漏更新朝向）");
// 搜车覆盖：9 格全部挂搜车入口（10-03 起为函数式入口，靠 __searchGo 标记识别）
const isSearchPOI = (c) => !!(c.nextScene && c.nextScene.__searchGo === true);
const searchCells = CELLS.filter((id) => S("storyData[" + JSON.stringify(id) + "]").choices(Object.assign({}, base, { _lastScene: G })).some(isSearchPOI));
check(searchCells.length === 9, "9 个分区全部支持搜车（实际 " + searchCells.length + "）");
const fChoices = S("storyData[" + JSON.stringify(F) + "]").choices(Object.assign({}, base, { _lastScene: E }));
check(fChoices.some(isSearchPOI), "第二停车排保留搜车入口（含白荣威假线索）");
const aChoices = S("storyData[" + JSON.stringify(A) + "]").choices(Object.assign({}, base, { _lastScene: B }));
check(aChoices.some(isSearchPOI), "西车道北段挂搜车入口（面包车）");
// 搜车入口全局：驾驶态在 F 无搜车
var fDrv = S("storyData[" + JSON.stringify(F) + "]").choices(Object.assign({}, base, { _driving: true, _escapeOps: 6, _garageFacing: "S" }));
check(!fDrv.some(isSearchPOI), "驾驶态不出现搜车入口");
// 中间节点已砍：POI 直出结果，不再有「开始搜查」这一跳
const gPoi = S("storyData[" + JSON.stringify(G) + "]").choices(Object.assign({}, base, { _lastScene: H })).find(isSearchPOI);
const routerRefs = S("xdGarSearchRouter").__sceneRefs;
check(!!gPoi && typeof gPoi.nextScene === "function" && routerRefs.indexOf(nx(gPoi, Object.assign({}, base, { _lastScene: G }))) >= 0,
  "搜车 POI 直出加权结果（中间节点已删除）");
// 耗时：原「POI 2 分钟 + 中间节点'开始搜查' 2 分钟」合并成一次，总耗时不变
var wvSearch = { weather: "阴", hh: 8, mm: 0, dd: 1 };
gPoi.effect(wvSearch);
check(wvSearch.hh === 8 && wvSearch.mm === 4, "搜车 POI 耗时 4 分钟（2+2 合并，总耗时不变，实际 8:" + wvSearch.mm + "）");
const againChoice = S("storyData['新达汇-B1停车场-搜车-空车']").choices.find((c) => c.text === "换个位置再搜");
var wvAgain = { weather: "阴", hh: 8, mm: 0, dd: 1 };
againChoice.effect(wvAgain);
check(wvAgain.hh === 8 && wvAgain.mm === 3, "「换个位置再搜」耗时 3 分钟（1+2 合并，总耗时不变，实际 8:" + wvAgain.mm + "）");
// 手电档与 lit 同档：接近描写 + 搜车三景读"有光"文案，不再读摸黑
const torchVars = Object.assign({}, base, { hasTorch: true, _garageOps: 0 });
const approach = S("xdGarSearchApproach");
const apprTorch = approach(torchVars);
check(apprTorch.indexOf("手电的光柱罩住一排车头") >= 0 && apprTorch.indexOf("靠手摸") < 0, "接近描写手电档：有光文案（不再读'黑暗里靠手摸'）");
const emptyTorch = S("storyData['新达汇-B1停车场-搜车-空车']").text(torchVars);
check(emptyTorch.indexOf("方向盘上的灰厚得能写字") >= 0, "搜车-空车手电档：能认出车型（不再只报触感）");
check(emptyTorch.indexOf("手电的光柱罩住一排车头") >= 0, "搜车-空车正文自带接近描写（原中间节点正文已下放）");
const noiseTorch = S("storyData['新达汇-B1停车场-搜车-出声']").text(torchVars);
check(noiseTorch.indexOf("无处可藏") >= 0 && noiseTorch.indexOf("黑暗深处") < 0, "搜车-出声手电档：光柱下无处可藏");
const scareTorch = S("storyData['新达汇-B1停车场-搜车-锁车惊吓']").text(torchVars);
const foodTorch = S("storyData['新达汇-B1停车场-搜车-捡到吃的']").text(torchVars);
check(scareTorch.indexOf("光柱罩住一排车头") >= 0 && foodTorch.indexOf("你放轻脚步") >= 0, "四个结果的接近描写全覆盖（惊吓/捡到吃的也在）");

console.log("\n=== 10. 搜车链回原格 ===");
const router = S("xdGarSearchRouter");
check(typeof router === "function" && Array.isArray(router.__sceneRefs) && router.__sceneRefs.length === 4, "路由函数挂 __sceneRefs（4 目标，摸黑遭遇已退役）");
const targets = {};
for (let i = 0; i < 600; i++) {
  const t = router(Object.assign({}, base, { dd: 3, _garageSearchFrom: C }));
  targets[t] = (targets[t] || 0) + 1;
}
check(!targets["新达汇-B1停车场-摸黑遭遇"] && Object.keys(targets).length === 4, "摸黑遭遇已退役：搜车路由只剩 4 个加权目标");
const tLast = {};
for (let i = 0; i < 300; i++) {
  const t = router(Object.assign({}, base, { dd: 3, _lastScene: C, _garageSearchFrom: H }));
  tLast[t] = 1;
}
check(!tLast["新达汇-B1停车场-摸黑遭遇"], "遭遇只看本轮搜车起点，不看 _lastScene 来路");
// 记账逻辑已从删掉的 hub.onEnter 搬到 xdGarSearchGo（波波 10-03）
const searchGo = S("xdGarSearchGo");
check(typeof searchGo === "function" && searchGo().__searchGo === true && Array.isArray(searchGo().__sceneRefs) && searchGo().__sceneRefs.length === 4,
  "搜车入口 xdGarSearchGo 就位：__searchGo 标记 + 4 个 __sceneRefs（供 lint 补入边）");
var sv1 = { _garageSearchPending: false, _garageSearchFrom: "", _lastScene: D, _visit: { "新达汇-B1停车场-旧区": 1 }, _garDenD: 0 };
const sv1Target = searchGo()(sv1);
check(sv1._garageSearchFrom === D && sv1._garageSearchPending === true, "搜车入口记录本轮起点格（原 hub onEnter 逻辑）");
check(sv1._garDenD === 1, "搜车惊扰：起点格密度 +1");
check(router.__sceneRefs.indexOf(sv1Target) >= 0, "搜车入口直出结果：返回加权路由目标之一（不再经过中间节点）");
// 「换个位置再搜」沿用本轮起点：_lastScene 已是结果场景，不能覆盖起点
var sv1b = Object.assign({}, sv1, { _lastScene: "新达汇-B1停车场-搜车-空车" });
searchGo()(sv1b);
check(sv1b._garageSearchFrom === D && sv1b._garDenD === 2, "「换个位置再搜」沿用本轮起点，不被 _lastScene 覆盖");
// 未激活密度时搜车不涨密度（J 区没去过）
var sv1c = { _garageSearchPending: false, _garageSearchFrom: "", _lastScene: D, _visit: {}, _garDenD: 0 };
searchGo()(sv1c);
check(sv1c._garDenD === 0, "未激活（没到过 J 区）时搜车不涨密度");
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
// 车库步行层→外界仅两条边：入口平台→B1走廊、入口平台→坡道出库。scripted 例外：冲出坡道 / 围堵。
const scriptedExits = ["新达汇-B1停车场-冲出坡道", "新达汇-B1停车场-围堵"];
const exitEdges = [];
const SD = S("storyData");
for (const [sid, sc] of Object.entries(SD)) {
  const isGarage = sid.indexOf("新达汇-B1-") === 0 || sid.indexOf("新达汇-B1停车场-") === 0 || sid === "新达汇车库出口";
  if (!isGarage) continue;
  if (sid.indexOf("结局") === 0 || scriptedExits.indexOf(sid) >= 0) continue;
  const cs = typeof sc.choices === "function" ? sc.choices(Object.assign({}, base)) : (sc.choices || []);
  cs.forEach((c) => {
    // 出库选项已改函数式 nextScene（点击时才结算 chased），目标靠 __sceneRefs 声明
    const nxt = typeof c.nextScene === "function"
      ? ((c.nextScene.__sceneRefs || [])[0] || null)
      : c.nextScene;
    if (nxt === "新达汇-B1走廊" || nxt === "新达汇车库出口") exitEdges.push(sid + " -> " + nxt);
  });
}
check(exitEdges.length === 2 && exitEdges.indexOf(G + " -> 新达汇-B1走廊") >= 0 && exitEdges.indexOf(G + " -> 新达汇车库出口") >= 0,
  "步行层→外界仅两条边，均出自入口平台（实际边：" + exitEdges.join(" / ") + "）");
check(S("storyData['新达汇-B1停车场-截停']").choices[0].nextScene({ _garDriveTarget: E }) === E, "驾驶截停：QTE 成功落到目标格（替代旧强制驱逐交割）");
// 跨文件：B1走廊入口已指向新格；金谊线不动
const xdSrc = fs.readFileSync(path.join(ROOT, "story/东明街道/新达汇.js"), "utf8");
check(xdSrc.indexOf("新达汇-B1-入口平台") >= 0 && xdSrc.indexOf("新达汇-B1停车场A区") < 0, "新达汇.js 的 B1走廊入口已指向新格 ID");
check(!!S("storyData['金谊广场地面入口']") && S("storyData['新达汇车库出口']").choices.some((c) => c.nextScene === "金谊广场地面入口"), "车库出口→金谊广场路线保留");

console.log("\n=== 12. 战斗与结局链（保留项抽查） ===");
const battle = S("storyData['新达汇-B1停车场-车旁遭遇']");
check(typeof battle.onEnter === "function" && battle.choices[0].input && battle.choices[0].timeout === 20000, "车旁遭遇：initMemoryGame 闪色 + 20s 超时");
// 尸潮密度遭遇链（二值闪色）
const amb = S("storyData['新达汇-B1停车场-尸潮遭遇']");
check(amb.choices[0].timeout === 18000 && amb.choices[0].timeoutScene === "结局-车库遭遇战", "尸潮遭遇：18s 超时=死亡结局（二值，无受伤档）");
const nest = S("storyData['新达汇-B1停车场-巢穴遭遇']");
check(nest.choices[0].timeout === 18000 && nest.choices[0].nextScene.__sceneRefs[0] === "新达汇-B1停车场-巢穴-占稳" && nest.choices[0].nextScene.__sceneRefs[1] === "结局-车库遭遇战", "巢穴遭遇：二值路由 击散=占稳 / 败=死亡结局");
check(S("storyData['新达汇-B1停车场-尸潮遭遇']").choices[0].nextScene.__sceneRefs[1] === "结局-车库遭遇战", "尸潮遭遇路由死亡档=结局-车库遭遇战");
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

console.log("\n=== 13. 追兵 ⇄ 车库密度 换算闸门（波波 10-03 拍板） ===");
// 独立作用域：本节大量临时变量名（gScene/out3/loop…）在前 12 节已被占用过
(function () {
const gScene = S("storyData['新达汇-B1-入口平台']");
const gChoices = gScene.choices(Object.assign({}, base, { _garageFacing: "N" }));

// —— 进库：尾巴跟到坡道口就散了，换成 G 区密度 ——
var inV = Object.assign({}, base, { chasedByZombies: 3, _lastScene: "新达汇车库出口", _garDenG: 0 });
gScene.onEnter(inV);
check(inV._garDenG === 2 && inV.chasedByZombies === 0, "进库闸门：chased 3 → G 区 +2、chased 清零");
var inV5 = Object.assign({}, base, { chasedByZombies: 5, _lastScene: "新达汇-B1走廊", _garDenG: 0 });
gScene.onEnter(inV5);
check(inV5._garDenG === 2 && inV5.chasedByZombies === 0, "进库闸门：chased 5 也只换 +2（尾巴不按原值全搬进库）");
var inV2 = Object.assign({}, base, { chasedByZombies: 3, _lastScene: H, _garDenG: 0 });
gScene.onEnter(inV2);
check(inV2._garDenG === 0 && inV2.chasedByZombies === 3, "进库闸门：从库内格子进入不换算（库内只看密度）");
var inV0 = Object.assign({}, base, { chasedByZombies: 0, _lastScene: "新达汇车库出口", _garDenG: 1 });
gScene.onEnter(inV0);
check(inV0._garDenG === 1 && inV0.chasedByZombies === 0, "进库闸门：chased=0 时不加密度（也不清空已有密度）");

// —— 出库：库里惊动多少带出来多少 ——
var out3 = { _garDenG: 3, chasedByZombies: 0 };
S("xdGarExitSettle")(out3);
check(out3.chasedByZombies === 2 && out3._garDenG === 0, "出库：G 满密度 → chased +2，G 区清零");
var out2 = { _garDenG: 2, chasedByZombies: 0 };
S("xdGarExitSettle")(out2);
check(out2.chasedByZombies === 1 && out2._garDenG === 0, "出库：G 密度 2 → chased +1");
var out1 = { _garDenG: 1, chasedByZombies: 0 };
S("xdGarExitSettle")(out1);
check(out1.chasedByZombies === 1, "出库：G 密度 1 → 也带 +1（防白洗）");
var out0 = { _garDenG: 0, chasedByZombies: 0 };
S("xdGarExitSettle")(out0);
check(out0.chasedByZombies === 0, "出库：G 密度 0 → 不带尾巴");
var outCap = { _garDenG: 3, chasedByZombies: 4 };
S("xdGarExitSettle")(outCap);
check(outCap.chasedByZombies === 4, "出库累加封顶 4（不碰即死阈值 5）");

// —— 驾驶逃亡：甩在身后 ——
var drvOut = { _garDenG: 3, chasedByZombies: 0 };
S("storyData['新达汇-B1停车场-冲出坡道'].onEnter")(drvOut);
check(drvOut.chasedByZombies === 0 && drvOut._garDenG === 0, "驾驶冲出坡道：chased +0（波波拍板），G 区照样清零");

// —— 两个步行出口都挂闸门，且点击时才结算 ——
const rampOut = gChoices.find((c) => c.text === "沿坡道出库");
const corrOut = gChoices.find((c) => typeof c.text === "function" && c.text({ _visit: {} }).indexOf("B1走廊") >= 0);
check(!!rampOut && typeof rampOut.nextScene === "function" && rampOut.nextScene.__garExit === true, "「沿坡道出库」挂出库闸门");
check(!!corrOut && typeof corrOut.nextScene === "function" && corrOut.nextScene.__garExit === true, "「去/回B1走廊」挂出库闸门");
var rc = Object.assign({}, base, { _garDenG: 3, chasedByZombies: 0 });
check(rampOut.nextScene(rc) === "新达汇车库出口" && rc.chasedByZombies === 2, "出库闸门在点击瞬间结算（不是进场景后才算）");

// —— 防白洗 / 防双输：反复进出既洗不净也涨不爆 ——
var loop = { _garDenG: 0, chasedByZombies: 5, _lastScene: "新达汇车库出口", _visit: {}, dd: 3, _garageFacing: "N", _garageRev: false };
const loopSeq = [];
for (let i = 0; i < 6; i++) {
  gScene.onEnter(loop);          // 进库
  S("xdGarExitSettle")(loop);    // 出库
  loopSeq.push(loop.chasedByZombies);
}
check(loopSeq[loopSeq.length - 1] >= 1, "防白洗：反复进出后 chased 稳定在 ≥1（序列 " + loopSeq.join(",") + "）");
check(Math.max.apply(null, loopSeq) <= 4, "防双输：反复进出不会顶到即死阈值（峰值 " + Math.max.apply(null, loopSeq) + "）");

// —— QTE 时限改读派生量 _garDenTotal ——
const garageSrc = fs.readFileSync(path.join(ROOT, "story/东明街道/新达汇地下车库.js"), "utf8");
const qteExprs = [...garageSrc.matchAll(/timeout: "(Math\.max\([^"]*\))"/g)].map((m) => m[1]);
check(qteExprs.length === 3, "车库三个 QTE 时限在位（实际 " + qteExprs.length + "）");
check(qteExprs.every((e) => e.indexOf("chasedByZombies") < 0), "QTE 时限不再读 chasedByZombies");
check(qteExprs.every((e) => e.indexOf("_garDenTotal") >= 0), "QTE 时限改读派生量 _garDenTotal");
const evalT = (expr, vars) => new Function(...Object.keys(vars), "return Number(" + expr + ");")(...Object.values(vars));
check(evalT(qteExprs[0], { _garDenTotal: 0 }) === 8000, "密度 0 → 8.0s（与原 chased=0 同）");
check(evalT(qteExprs[0], { _garDenTotal: 8 }) === 6000, "密度 8 → 6.0s");
check(evalT(qteExprs[0], { _garDenTotal: 40 }) === 3000, "密度再高也 3.0s 封底");
// 引擎同款求值路径：new Function(...Object.keys(gameState)) —— 派生量必须真的在 gameState 里，
// 否则会抛 ReferenceError 被 catch 成兜底 5000ms（静默失效，必须显式验）
const engineEval = S("(function(){ Object.assign(gameState, {_garDenA:0,_garDenB:0,_garDenC:0,_garDenD:0,_garDenE:0,_garDenF:0,_garDenG:2,_garDenH:0,_garDenI:0}); refreshComputed(); var keys=Object.keys(gameState), vals=Object.values(gameState); return new Function(...keys, 'return Number(' + " + JSON.stringify(qteExprs[0]) + " + ');')(...vals); })()");
check(engineEval === 7500, "引擎真实求值路径可用（G 区密度 2 → 7.5s，实际 " + engineEval + "）");
check(typeof S("storyData._reactive.computed._garDenTotal") === "string", "core.js 已注册 _garDenTotal 派生量");
const denSum = { _garDenA: 1, _garDenB: 2, _garDenC: 0, _garDenD: 0, _garDenE: 0, _garDenF: 0, _garDenG: 3, _garDenH: 0, _garDenI: 0 };
S("Object.assign(gameState, " + JSON.stringify(denSum) + "); refreshComputed();");
check(S("gameState._garDenTotal") === 6, "派生量算对：1+2+3=6（实际 " + S("gameState._garDenTotal") + "）");
check(S("xdGarDenTotal(gameState)") === 6, "JS 函数 xdGarDenTotal 与派生量同口径（无漂移）");

// —— 车库内的 chasedByZombies 读写已清空 ——
const ghostAdd = garageSrc.match(/add:\s*\{[^}]*chasedByZombies/g) || [];
check(ghostAdd.length === 0, "车库内已无对象式 chasedByZombies 写入（effect / onEnter）");
const ghostSet = garageSrc.match(/v\.chasedByZombies\s*=/g) || [];
check(ghostSet.length === 3, "chasedByZombies 直写只剩 3 处（进闸门/出闸门/库外辅路，实际 " + ghostSet.length + "）");
const ghostRead = garageSrc.match(/v\.chasedByZombies\s*>/g) || [];
check(ghostRead.length === 0, "车库正文已无 chasedByZombies 读取（一律改看密度）");
})();

console.log("\n=== 14. 密度描写·视觉档（波波 10-03 拍板：只有手电/通电才给） ===");
(function () {
const hint = S("xdGarDenHint"), sightDen = S("xdGarSightDen"), nbHint = S("xdGarNeighborHint");

// —— 光照分流：lit / torch 走视觉档，dim / dark 退回听觉档 ——
const litV = Object.assign({}, base, { _wiredCorrectly: true, _garDenE: 2 });
check(hint(litV, E).indexOf("排水沟那头") < 0, "通电档：走视觉描写（不再读水声听觉档）");
const torchV = Object.assign({}, base, { hasTorch: true, _garDenE: 2 });
check(hint(torchV, E).indexOf("排水沟那头") < 0, "手电档：走视觉描写");
const dimV = Object.assign({}, base, { hasPhone: true, phoneBattery: 50, _garDenE: 2 });
check(hint(dimV, E).indexOf("排水沟那头") >= 0, "手机微光档：退回听觉档（那点光看不清车道）");
const darkV = Object.assign({}, base, { _garDenE: 2 });
check(hint(darkV, E).indexOf("排水沟那头") >= 0, "全黑档：退回听觉档（黑着也听得见水声，满格即死不是零信息）");
const drvV = Object.assign({}, base, { _driving: true, _garDenE: 1 });
check(hint(drvV, E).indexOf("排水沟") < 0, "驾驶态走视觉档（车灯算光源）");

// —— 分档变体：9 格会反复经过，每档必须多变体防刷屏 ——
const seen = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
for (var d = 0; d <= 3; d++) {
  for (var i = 0; i < 40; i++) seen[d].add(sightDen(Object.assign({}, base, { _garDenE: d }), E));
}
check(seen[0].size === 1 && [...seen[0]][0] === "", "密度 0 档静默（安静不刷描写）");
check(seen[1].size >= 3, "密度 1 档 " + seen[1].size + " 变体");
check(seen[2].size >= 3, "密度 2 档 " + seen[2].size + " 变体");
check(seen[3].size >= 2, "密度 3（满）档 " + seen[3].size + " 变体");
check([...seen[2]].every((s) => s.indexOf("warn") >= 0), "密度 2 档带 warn 警示色");
check([...seen[3]].every((s) => s.indexOf("crit") >= 0), "密度 3 档带 crit 危急色");

// —— 邻格提示：只报最危险那一个 ——
// 站 E（中段枢纽）朝北：邻格 N=B / W=D / E=F / S=H
const nbV = Object.assign({}, base, { _garageFacing: "N", _wiredCorrectly: true, _garDenB: 1, _garDenF: 2 });
const nb = nbHint(nbV, E);
check(nb.indexOf("右手边那条车道") >= 0, "只报最危险那一格：B=1 / F=2 → 报 F（朝北时是右手边，实际「" + nb.trim() + "」）");
check(nb.indexOf("B 区") < 0 && nb.indexOf("F 区") < 0, "邻格提示不报分区字母（避免与立柱漆字同段重复）");
check(nbV._garDenB === 1 && nbHint(nbV, E).indexOf("正前方") < 0, "较安静的邻格（B=1）不被提及");
const nbTie = Object.assign({}, base, { _garageFacing: "N", _wiredCorrectly: true, _garDenB: 2, _garDenF: 2 });
check(nbHint(nbTie, E).indexOf("正前方那条车道") >= 0, "平局优先报正前方（遍历序 前>左>右>后）");
// 朝向变化：同一组密度，朝东时 F 变成正前方
const nbEast = Object.assign({}, base, { _garageFacing: "E", _wiredCorrectly: true, _garDenF: 2 });
check(nbHint(nbEast, E).indexOf("正前方那条车道") >= 0, "方位词跟随 _garageFacing（朝东时 F 是正前方）");
const nbZero = Object.assign({}, base, { _garageFacing: "N", _wiredCorrectly: true });
check(nbHint(nbZero, E) === "", "邻格全静默时不生成提示（不刷屏）");
// 0 档静默只关「当前格」那一句，邻格提示必须照常——"本格安静但右边堵着"是最有价值的信息
const quietSelf = Object.assign({}, base, { _garageFacing: "N", _wiredCorrectly: true, _garDenE: 0, _garDenB: 2 });
const quietOut = hint(quietSelf, E);
check(quietOut.trim().indexOf("正前方") === 0, "本格 0 档静默时只剩邻格一句（实际「" + quietOut.trim() + "」）");
const allQuiet = Object.assign({}, base, { _garageFacing: "N", _wiredCorrectly: true });
check(hint(allQuiet, E) === "", "本格与邻格都静默时整段为空（干净的车库不追加任何密度句）");
check(hint(Object.assign({}, base, { _garDenB: 3 }), E).indexOf("正前方") < 0, "全黑时不给邻格提示（看不见就是看不见）");
check(nbHint(Object.assign({}, base, { _garageFacing: "N" }), "新达汇-B1停车场-旧区") === "", "旧区 J（网格外）不给邻格提示");

// —— 排版铁律：crit ≤24 字、含否定词不上强强调 ——
const NEG = /没有|没能|未能|并未|并不|差点|险些|几乎没/;
const critPool = S("XD_SEE_DEN[3]") || [];
const critBad = critPool.filter((s) => {
  const plain = s.replace(/<[^>]*>/g, "").replace(/^\n/, "");
  return plain.length > 24 || NEG.test(plain);
});
check(critBad.length === 0, "满档 crit 全部 ≤24 字且不含否定词" + (critBad.length ? "（违规：" + critBad.join(" | ") + "）" : ""));
const nbCrit = S("XD_NB_DEN[3]") || [];
check(nbCrit.every((s) => s.indexOf("crit") < 0), "邻格提示不上 crit（避免与当前格档位撞强强调配额）");

// —— 挂载：正文走总入口，不再直连听觉档 ——
const src = fs.readFileSync(path.join(ROOT, "story/东明街道/新达汇地下车库.js"), "utf8");
check(src.indexOf("xdGarNoise(v, id)") < 0, "每格正文不再直连 xdGarNoise（改走 xdGarDenHint 分流）");
check((src.match(/xdGarDenHint\(v, id\)/g) || []).length === 2, "步行/驾驶两条正文分支都挂了 xdGarDenHint（实际 " + (src.match(/xdGarDenHint\(v, id\)/g) || []).length + "）");
})();

console.log("\n结果：" + okCount + " 通过 / " + badCount + " 失败");
process.exit(badCount ? 1 : 0);
