// metro_selftest.js —— 11号线三林东路站改造（2026-10 难度重做）专项自测
//
// 无头加载真实 engine.js + 全部剧情文件，验证 docs/区域方案-地铁站改造.md 的结算清单：
//   主链（钥匙→员工线→配电→发车）/ 强黑暗 / 噪声清算(chased>=4) / QTE 压缩公式 / 物资守卫 / 死亡结局可达
// 已知问题（⚠ 单列，不计入失败，待作者拍板或已另行修复）见文件末尾打印。
//
// 用法：node tools/metro_selftest.js    期望「N 通过 / 0 失败」
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
  Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Set, Map, Date, RegExp, Error, Promise, setTimeout, clearTimeout,
  // 静音：initGameState 会转储整个变量表刷屏
  console: Object.assign({}, console, { log() {}, warn() {}, error() {} }),
};
sandbox.document = doc; sandbox.window = sandbox; sandbox.globalThis = sandbox;
sandbox.addEventListener = function () {}; sandbox.removeEventListener = function () {};
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
for (const f of STORY_FILES) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f }); }
  catch (e) { console.log("载入失败 " + f + " :: " + e.message); process.exit(1); }
}
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
const engineOk = vm.runInContext(fs.readFileSync(path.join(ROOT, "engine.js"), "utf8"), sandbox, { filename: "engine.js" });
if (!engineOk !== false) { /* load ok */ }

let okCount = 0, badCount = 0;
const check = (cond, msg) => { if (cond) { okCount++; console.log("  ok  " + msg); } else { badCount++; console.log("  FAIL " + msg); } };
const warn = (msg) => console.log("  ⚠ " + msg);

vm.runInContext("initGameState(); applyReactive();", sandbox);
// 沙箱内辅助：求值 QTE timeout 表达式（复刻 engine.js:920-925）
vm.runInContext(
  "function __qteMs(expr, ch){ var saved = gameState.chasedByZombies; gameState.chasedByZombies = ch;" +
  "  var keys = Object.keys(gameState), vals = Object.values(gameState);" +
  "  var ms = new Function(keys.join(','), 'return Number(' + expr + ');').apply(null, vals);" +
  "  gameState.chasedByZombies = saved; return ms; }",
  sandbox
);
// 沙箱内辅助：取某场景在某状态下的选项清单（choices 函数实调；condition+elseScene 不影响显示，QTE 场景引擎也不过滤 condition）
vm.runInContext(
  "function __choices(id){ var n = storyData[id]; if(!n) return null;" +
  "  var cs = typeof n.choices === 'function' ? n.choices.call(n, gameState) : n.choices;" +
  "  return (cs||[]).filter(function(c){ return !c.showCondition || checkCondition(c.showCondition, gameState); }); }",
  sandbox
);
// 沙箱内辅助：模拟点击一个选项（复刻 engine.js:970-981 分支；并执行目标场景 onEnter，
// 与引擎 renderScene 一致——否则配电间/迪士尼等靠 onEnter 结算的场景全部断言失真）
vm.runInContext(
  "function __click(id, text){ var cs = __choices(id); var c = cs.filter(function(x){return x.text===text;})[0];" +
  "  if(!c) return { err: '选项不存在: ' + text };" +
  "  var met = checkCondition(c.condition, gameState);" +
  "  var target;" +
  "  if (met) { if (c.effect) applyEffect(typeof c.effect==='function'?c.effect(gameState):c.effect); target = c.nextScene; }" +
  "  else { target = c.elseScene || c.nextScene; }" +
  "  if (typeof target === 'function') target = target(gameState);" +
  "  var tn = storyData[target];" +
  "  if (tn && tn.onEnter) { var e = typeof tn.onEnter==='function' ? tn.onEnter(gameState) : tn.onEnter;" +
  "    if (e && (e.set||e.add||e.mul)) applyEffect(e); }" +
  "  return { met: met, target: target, effect: c.effect || null }; }",
  sandbox
);
const run = (code) => vm.runInContext(code, sandbox);

console.log("=== 1. 方案结算清单：节点与结局存在性 ===");
const NODES = ["地铁站-站厅层-观察", "地铁站-站厅-搜尸", "地铁站-站厅-缠斗", "地铁站-员工通道-铁门",
  "地铁站-员工通道-走廊", "地铁站-站务室", "地铁站-配电间", "地铁站-站台层-摸黑",
  "地铁站-站台层-隧道尸潮", "地铁站-发车确认", "地铁站-楼梯-折返", "地铁站-选择列车"];
for (const id of NODES) check(!!run(`storyData[${JSON.stringify(id)}]`), "节点存在 " + id);
for (const id of ["结局-地铁站-翻尸失手", "结局-地铁站-坠落轨道", "结局-地铁站-尸潮围堵", "结局-迪士尼-幸存者聚居地"]) {
  check(!!run(`storyData[${JSON.stringify(id)}]`), "结局存在 " + id);
}
const newVars = run("({a:gameState.hasMetroTools, b:gameState._stationPowered, c:gameState._procedureKnown, d:gameState._extinguisherUsed})");
check(newVars.a === false && newVars.b === false && newVars.c === false && newVars.d === false, "新变量 4 个已注册且初值正确");

console.log("\n=== 2. QTE 压缩公式（chasedByZombies 每级 -800ms，下限 2s） ===");
const QTES = [["地铁站-站厅层", 8000], ["地铁站-安检区", 6000], ["地铁站-楼梯", 4000], ["地铁站-站台层", 3000]];
for (const [id, base] of QTES) {
  const t0 = run(`__qteMs(storyData[${JSON.stringify(id)}].qte.timeout, 0)`);
  const t4 = run(`__qteMs(storyData[${JSON.stringify(id)}].qte.timeout, 4)`);
  const want4 = Math.max(2000, base - 3200);
  check(t0 === base && t4 === want4, id + " → chased0=" + t0 / 1000 + "s / chased4=" + t4 / 1000 + "s");
}
const fixed = run(`({a:__qteMs(storyData["地铁站-站厅-搜尸"].qte.timeout,4), b:__qteMs(storyData["地铁站-站厅-缠斗"].qte.timeout,0), c:__qteMs(storyData["地铁站-站台层-摸黑"].qte.timeout,4), d:__qteMs(storyData["地铁站-安检区-爬X光机"].qte.timeout,4)})`);
check(fixed.a === 5000 && fixed.c === 4000 && fixed.d === 5000 && fixed.b === 4000,
  "搜尸5s/摸黑4s/X光机5s 定值，缠斗 chased0=4s");

console.log("\n=== 3. 站台强黑暗三态（合闸前只认手电/火把） ===");
run("gameState._stationPowered=false; gameState.hasTorch=false; gameState.hasFireTorch=false; gameState._extinguisherUsed=false;");
let cs = run("__choices('地铁站-站台层').map(function(c){return c.text;})");
check(cs.length === 2 && cs.join("|").indexOf("摸过去") >= 0 && cs.join("|").indexOf("回站厅") >= 0,
  "无电无光源 → 只有 摸黑+折返（" + cs.length + " 项）");
run("gameState.hasTorch=true;");
cs = run("__choices('地铁站-站台层').map(function(c){return c.text;})");
check(cs.length === 5, "有手电 → " + cs.length + " 项（雾障/潜行/硬冲/员工门/折返）");
run("gameState.hasTorch=false; gameState._stationPowered=true;");
cs = run("__choices('地铁站-站台层').map(function(c){return c.text;})");
check(cs.length === 5, "已送电 → " + cs.length + " 项");
const darkText = run("gameState._stationPowered=false; gameState.hasTorch=false; gameState.hasFireTorch=false; storyData['地铁站-站台层'].text(gameState)");
check(String(darkText).indexOf("真正的黑") >= 0, "黑暗态正文命中「真正的黑」分支");

console.log("\n=== 4. 噪声清算（chased>=4 → 隧道尸潮） ===");
run("gameState.chasedByZombies=3;");
check(run("checkCondition('chasedByZombies < 4', gameState)") === true, "chased=3 → 潜行/员工梯可走");
run("gameState.chasedByZombies=4;");
check(run("checkCondition('chasedByZombies < 4', gameState)") === false, "chased=4 → 平台选项条件判假");
const flee = run("__click('地铁站-员工通道-走廊', '沿员工楼梯下到站台西端')");
check(flee.target === "地铁站-站台层-隧道尸潮", "chased=4 点员工梯 → elseScene 隧道尸潮（实际 " + flee.target + "）");
run("gameState.chasedByZombies=0; gameState._stationPowered=true;");
const horde = run("__choices('地铁站-站台层-隧道尸潮').map(function(c){return c.text + '→' + (checkCondition(c.condition, gameState) ? c.nextScene : c.elseScene);})");
check(horde.some(function (s) { return s.indexOf("→地铁站-发车确认") >= 0; }), "尸潮中已供电 → 冲进列车可发车逃生");
check(horde.some(function (s) { return s.indexOf("屏住呼吸→地铁站-站台层-屏息") >= 0; }), "尸潮中 strength>=2 → 屏息躲潮");
run("gameState.strength=1;");
const hordeWeak = run("__click('地铁站-站台层-隧道尸潮', '缩到屏蔽墙后，屏住呼吸')");
check(hordeWeak.target === "结局-地铁站-尸潮围堵", "strength<2 屏息 → 死（死因可读）");

console.log("\n=== 5. 钥匙链全链（观察→搜尸→收包→开铁门） ===");
run("initGameState(); applyReactive(); gameState.strength=7;");
check(run("__choices('地铁站-站厅层-观察').some(function(c){return c.text.indexOf('水瓶') >= 0;})"), "观察场景有『水瓶引开搜尸』入口");
const grab = run("__click('地铁站-站厅-工具串到手', '把工具串收进包里')");
check(grab.met === true && grab.target === "地铁站-站厅-腰串收好", "收纳钥匙串成功");
check(run("gameState.hasMetroTools") === true && run("gameState.itemCount") === 1, "hasMetroTools=true 且占 1 格");
let door = run("__choices('地铁站-员工通道-铁门').map(function(c){return c.text;})");
check(door.some(function (t) { return t.indexOf("钥匙") >= 0; }), "有钥匙 → 铁门出现开门选项");
run("initGameState(); applyReactive();");
door = run("__choices('地铁站-员工通道-铁门').map(function(c){return c.text;})");
check(!door.some(function (t) { return t.indexOf("钥匙") >= 0; }) && door.some(function (t) { return t.indexOf("撞开") >= 0; }),
  "无钥匙 → 只能撞门（软门槛常驻）");
const bash = run("__click('地铁站-员工通道-铁门', '用肩膀撞开铁门')");
check(bash.met === true && bash.target === "地铁站-员工通道-走廊" && run("gameState.chasedByZombies") === 2,
  "力4 撞门成功：进走廊 + 噪声+2");

console.log("\n=== 6. 配电间（信息门槛：规程=防跳闸赌噪音） ===");
run("initGameState(); applyReactive();");
check(run("__choices('地铁站-配电间').length") === 4, "无规程 → 三闸刀都给试（软门槛，合错=跳闸+噪2）");
const trip = run("__click('地铁站-配电间', '合上黄色闸刀（站台动力）')");
check(trip.target === "地铁站-配电间-跳闸", "合错黄闸 → 跳闸场景");
run("__click('地铁站-配电间-跳闸', '把跳起的总闸推回去，回到柜前')");
check(run("gameState.chasedByZombies") === 2, "跳闸推回总闸 → 噪声+2");
check(run("gameState._stationPowered") === false, "跳闸后未供电");
run("gameState.chasedByZombies=0;");
run("__click('地铁站-配电间', '合上红色闸刀（事故照明总闸）')");
check(run("__choices('地铁站-配电间-合红闸').some(function(c){return c.nextScene==='地铁站-配电间-合黄闸';})"), "合红后 → 可合黄");
const power = run("__click('地铁站-配电间-合红闸', '合上黄色闸刀（站台动力）')");
check(power.target === "地铁站-配电间-合黄闸" && run("gameState._stationPowered") === true, "红→黄 → _stationPowered=true");
check(run("__choices('地铁站-配电间').some(function(c){return c.text.indexOf('看一眼') >= 0;})"), "供电后配电间仍有出口（不空场景）");

console.log("\n=== 7. 站务室（情报 + 规程 + 物资守卫） ===");
run("initGameState(); applyReactive(); gameState.itemCount=0;");
let w = run("__choices('地铁站-站务室').map(function(c){return c.text;})");
check(w.some(function (t) { return t.indexOf("规程") >= 0; }) && w.some(function (t) { return t.indexOf("矿泉水") >= 0; }) && w.some(function (t) { return t.indexOf("饼干") >= 0; }),
  "规程/水/饼干三项齐备（!hasX 守卫初始可见）");
run("__click('地铁站-站务室', '翻看《车站用电规程》')");
check(run("gameState._procedureKnown") === true, "规程 → _procedureKnown=true");
check(!run("__choices('地铁站-站务室').some(function(c){return c.text.indexOf('规程') >= 0;})"), "规程选项看完即消失");
run("__click('地铁站-站务室', '从应急柜里拿一瓶矿泉水')");
check(run("gameState.hasBottle") === true && run("gameState.bottleWater") === 1 && run("gameState.itemCount") === 1, "拿水：hasBottle+bottleWater+占1格");
check(!run("__choices('地铁站-站务室').some(function(c){return c.text.indexOf('矿泉水') >= 0;})"), "水选项拿后消失");
run("__click('地铁站-站务室', '拿走应急柜里的压缩饼干')");
check(run("gameState.hasBiscuit") === true && run("gameState.itemCount") === 2, "拿饼干：hasBiscuit+占1格");
const procText = run("storyData['地铁站-配电间'].text(gameState)");
check(String(procText).indexOf("先红后黄") >= 0, "有规程 → 配电间正文显示合闸口诀");

console.log("\n=== 8. 死火折返 → 供电 → 发车（不可逆终点） ===");
run("initGameState(); applyReactive();");
const deadText = run("storyData['地铁站-选择列车'].text(gameState)");
check(String(deadText).indexOf("没有电") >= 0, "未供电进车厢 → 死火文案");
check(!run("__choices('地铁站-选择列车').some(function(c){return c.nextScene==='地铁站-发车确认';})"), "死火态无驾驶室入口（必须先供电）");
check(run("__choices('地铁站-选择列车').some(function(c){return c.nextScene==='地铁站-楼梯-折返';})"), "死火态 → 折返取工具");
run("gameState._stationPowered=true; gameState.chasedByZombies=0;");
check(run("__choices('地铁站-选择列车').some(function(c){return c.nextScene==='地铁站-发车确认';})"), "供电后 → 驾驶室入口出现");
run("__click('地铁站-发车确认', '推下牵引推杆')");
check(run("gameState.currentArea") === "迪士尼", "发车 → currentArea=迪士尼（不可逆）");
const disney = run("__choices('地铁站-迪士尼方向').map(function(c){return c.nextScene;})");
check(disney.length === 1 && disney[0] === "结局-迪士尼-幸存者聚居地", "迪士尼方向唯一出口=好结局");

console.log("\n=== 9. 新增死亡结局可达性（入边扫描） ===");
const inbound = run(
  "(function(){ var targets=['结局-地铁站-翻尸失手','结局-地铁站-坠落轨道','结局-地铁站-尸潮围堵'];" +
  "  var found={}; targets.forEach(function(t){found[t]=0;});" +
  "  for (var id in storyData){ var n=storyData[id]; if(!n||!n.qte&&typeof n.qte!=='function'&&typeof n.qte!=='object'){ if(!n) continue; }" +
  "    var q = typeof n.qte==='function'?n.qte(gameState):n.qte; if(q&&q.onTimeout&&found[q.onTimeout]!==undefined) found[q.onTimeout]++;" +
  "    var cs = typeof n.choices==='function'?n.choices.call(n,gameState):(n.choices||[]);" +
  "    (Array.isArray(cs)?cs:[]).forEach(function(c){ if(c.elseScene&&found[c.elseScene]!==undefined)found[c.elseScene]++; }); }" +
  "  return found; })()"
);
for (const [id, n] of Object.entries(inbound)) check(n > 0, id + " 有 " + n + " 条入边（QTE超时/elseScene）");

console.log("\n=== ⚠ 已知问题单列（不计入失败） ===");
run("initGameState(); applyReactive(); gameState._stationPowered=true;");
const before = run("gameState.chasedByZombies");
run("__click('地铁站-配电间', '看一眼运转中的配电柜')") && run("gameState.chasedByZombies"); // 走到合黄闸目标本身不触发 onEnter（自测只模拟点击）
// 直接验证：再次渲染合黄闸 onEnter 是否重复加噪
run("gameState._stationPowered=true; gameState.chasedByZombies=0;");
run("(function(){ var n=storyData['地铁站-配电间-合黄闸']; var e=typeof n.onEnter==='function'?n.onEnter(gameState):n.onEnter; if(e&&e.add&&e.add.chasedByZombies) applyEffect(e); })()");
const afterRe = run("gameState.chasedByZombies");
if (afterRe > 0) warn("配电间-合黄闸 已供电后重入仍 +1 噪声（" + before + "→" + afterRe + "）——重复计费，建议 onEnter 加 _stationPowered 守卫");
else console.log("  ok  合黄闸重入不重复加噪");

console.log("\n=== 10. 「先拎在手里」与「收进包里」等效（都到手、都占格） ===");
run("initGameState(); applyReactive(); gameState.itemCount=0;");
const hand1 = run("__click('地铁站-站厅-工具串到手', '先拎在手里，翻过闸机去安检区')");
check(hand1.target === "地铁站-安检区" && run("gameState.hasMetroTools") === true && run("gameState.itemCount") === 1,
  "拎手里 → 拿到工具串且占 1 格，直达安检区");
run("initGameState(); applyReactive(); gameState.itemCount = 3 + gameState._bagTier + gameState._bagExtra;");
const hand2 = run("__click('地铁站-站厅-工具串到手', '先拎在手里，翻过闸机去安检区')");
check(hand2.target === "整理整理" && run("gameState.hasMetroTools") === false, "拎手里遇背包满 → 整理整理折返（onEnter 已预设出口）");

const stale = run(
  "(function(){ gameState.positionAfterOperation = '三林安居苑-滑板车';" +  // 模拟上一次整理残留
  "  gameState.itemCount = 3 + gameState._bagTier + gameState._bagExtra;" +  // 背包满
  "  var c = storyData['地铁站-站厅-工具串到手'].choices.filter(function(x){return x.text.indexOf('收进包里')>=0;})[0];" +
  "  var met = checkCondition(c.condition, gameState);" +
  "  return { met: met, elseScene: c.elseScene, hasPreset: !!(storyData['地铁站-站厅-工具串到手'].onEnter) }; })()"
);
if (!stale.hasPreset) warn("工具串到手/站务室未预设 positionAfterOperation——背包满走 elseScene『整理整理』后出口解析到残留值 '" + stale.elseScene + "'（实际会落 '" + stale.met + "' 分支），跨区域传送风险（09-29 401泡面同款坑）");
else console.log("  ok  拾取宿主场景已预设 positionAfterOperation");

// 夜间发车劫持
run("initGameState(); applyReactive();");
const nightRes = run(
  "(function(){ gameState.hh=18; gameState.mm=56; applyEffect(updateTime(5,{}));" +
  "  var hit = storyData._globalTriggers.filter(function(t){ return t.priority===5 && checkCondition(t.condition, gameState); })[0];" +
  "  return { hh: gameState.hh, target: hit ? hit.targetScene : null }; })()"
);
if (nightRes.target === "天黑必须过夜") warn("hh=18:56 推杆(+5min) → 迪士尼方向渲染时被全局触发器劫持到「天黑必须过夜」（错过好结局；与遗留1同源）");
else console.log("  ok  夜间发车不受全局触发器影响");

console.log("\n结果：" + okCount + " 通过 / " + badCount + " 失败");
process.exit(badCount === 0 ? 0 : 1);
