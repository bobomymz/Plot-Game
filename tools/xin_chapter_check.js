// xin_chapter_check.js —— 忻老师章节（复旦江湾）分支覆盖 / 可达性 / 零选项 校验
//
// 背景：docs/区域方案-复旦江湾.md 的 DoD 里「e2e 走通四分支 + a₁/a₂ + 延迟引信 + missable」
//       一直未做。本脚本用【无头真实 engine.js + 全部剧情文件】把该章按分支矩阵实走一遍。
// 用法：node tools/xin_chapter_check.js    期望「全部通过 / 0 失败」
//
// 覆盖：2×2 分支矩阵（① !a!b 堵门 / ② !a b 学生目击 / ③ a !b 翻窗双逃 / ④ a b 学生救场全歼）
//       + a₁(305出示) / a₂(返程车程出示) 两窗口 + 空口安慰陷阱
//       + 药丸延迟引信 jpXinFuse（③次日 / ④隔日 / 给药不炸 / 结局-变了的忻老师 路由）
//       + missable（_xinGone 空车位）+ 整理整理给药门控 + 仁济门诊药房第二入口
//       + 章节全部节点在四种 a×b 组合下均非零选项
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
// ⚠ 不覆盖 Function：engine.js 的 evaluateExpr 用 new Function 求值字符串条件，
//    若传入外层 realm 的 Function，创建出来的函数全局作用域会是 Node 外层（看不到 utils.js 的
//    fatigueTier 等全局函数）→ 假报 ReferenceError。留给 vm 自己的 Function 才与浏览器一致。
const sandbox = {
  console, Math, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Set, Map, Date, RegExp, Error, Promise, setTimeout, clearTimeout,
};
sandbox.console = Object.assign({}, console, { log() {}, warn() {}, error() {} }); // 静音引擎变量转储
sandbox.document = doc; sandbox.window = sandbox; sandbox.globalThis = sandbox;
sandbox.addEventListener = function () {}; sandbox.removeEventListener = function () {};
sandbox.navigator = { userAgent: "node" };
sandbox.location = { href: "http://localhost/", reload() {} };
sandbox.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, clear: () => { for (const k in store) delete store[k]; } };
sandbox.performance = { now: () => Date.now() };
sandbox.requestAnimationFrame = (f) => setTimeout(f, 0);
sandbox.cancelAnimationFrame = clearTimeout;
vm.createContext(sandbox);

const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const FILES = [...html.matchAll(/<script src="(story\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
for (const f of FILES) load(f);
const BIND = `['fatigueTier','fmtStrength','canSee','mercuryTier','mercuryPainNote','mercuryMirrorNote','hasFood','meleeWeaponTier',` +
  `'meleeWeaponName','heavyWeaponName','cuttingToolName','zombieAtHomeDoor','zombieOutsideHome','hasNoTransportation',` +
  `'hasMeleeWeapon','describeZombieWave','tryBreakWeapon','weaponBrokeText','combatDrain','combatDrainText','restRecover',` +
  `'updateTime','updateWeather','sprintAway','timeImage','initMemoryGame','travelScene','describeWeather','jpXinFuse'].forEach(function(n){` +
  `  try { if (typeof eval(n) === 'function') globalThis[n] = eval(n); } catch(e){} });`;
vm.runInContext(BIND, sandbox);
load("engine.js");
vm.runInContext(BIND, sandbox);

const storyData = vm.runInContext("storyData", sandbox);
let gameState = vm.runInContext("gameState", sandbox);   // ⚠ initGameState() 会整体替换该全局，故用 let 并在重开后重新取
const applyEffect = vm.runInContext("applyEffect", sandbox);
const checkCondition = vm.runInContext("checkCondition", sandbox);
const applyReactive = vm.runInContext("applyReactive", sandbox);
const jpXinFuse = vm.runInContext("jpXinFuse", sandbox);
const syncGS = () => { gameState = vm.runInContext("gameState", sandbox); };

let ok = 0, bad = 0;
const chk = (c, m) => { if (c) { ok++; console.log("  ok  " + m); } else { bad++; console.log("  FAIL " + m); } };

// ---- 引擎语义复刻 ----
let lastRendered = "";       // engine.js:17 同款
function visibleChoices(node) {
  let cs = typeof node.choices === "function" ? node.choices.call(node, gameState) : node.choices;
  if (!Array.isArray(cs)) return [];
  return cs.filter((c) => !c.showCondition || checkCondition(c.showCondition, gameState));
}
function enterScene(id) {
  const node = storyData[id];
  if (!node) return null;
  gameState._lastScene = lastRendered;                      // engine.js:1138 先写上一个场景
  lastRendered = id;                                        // engine.js:17
  gameState._visit = gameState._visit || {};
  gameState._visit[id] = (gameState._visit[id] || 0) + 1;   // engine.js:1144 先自增后渲染
  if (node.onEnter) {
    try { applyEffect(typeof node.onEnter === "function" ? node.onEnter(gameState) : node.onEnter); }
    catch (e) { throw new Error("onEnter 异常 " + id + " :: " + e.message); }
  }
  return node;
}
function resolve(t) { return typeof t === "function" ? t(gameState) : t; }

// chooser(node, visibleTexts, sceneId) → 选中的 text 子串 / 下标；null = 停止
function walk(startId, chooser, maxSteps) {
  const trail = [];
  let id = startId;
  for (let i = 0; i < (maxSteps || 40); i++) {
    const node = enterScene(id);
    if (!node) return { trail, err: "场景不存在 " + id };
    trail.push(id);
    const vis = visibleChoices(node);
    if (!vis.length) {
      if (id.startsWith("结局-")) return { trail, ended: id };
      return { trail, err: "零可见选项（剧情终止）：" + id };
    }
    const pick = chooser(node, vis.map((x) => String(x.text)), id);
    if (pick == null) return { trail, ended: id };
    let c = typeof pick === "number" ? vis[pick] : vis.find((x) => String(x.text).indexOf(pick) >= 0);
    if (!c) return { trail, err: "选项未命中「" + pick + "」@" + id + "，可见：" + vis.map((x) => x.text).join(" | ") };
    if (c.effect) { try { applyEffect(c.effect); } catch (e) { return { trail, err: "effect 异常 " + id + " :: " + e.message }; } }
    const nid = resolve(c.nextScene);
    if (nid == null) return { trail, err: "nextScene undefined @" + id };
    id = nid;
  }
  return { trail, err: "超过 maxSteps" };
}

// 章节就绪基线（建平侧已清后门、已见忻老师）
function baseChapterState(over) {
  vm.runInContext("initGameState()", sandbox);
  syncGS();                 // 引擎在 initGameState 内替换了全局 gameState，必须重新取引用
  lastRendered = "";
  Object.assign(gameState, {
    currentArea: "建平中学", currentPlace: "建平", currentPos: "后门辅路",
    dd: 3, hh: 13, mm: 0, strength: 12,
    _backGateOpened: true,
    _teacherLeft: false, _xinOutcome: 0, _xinKnowsTruth: false, _studentsCalled: false,
    _xinScratched: false, _xinPillGiven: false, _xinTurned: false, _xinOutcomeDay: 0,
    hasWangPhone: false, wangPhoneBattery: 0, hasPhone: false, phoneBattery: 0, _phoneOrigin: "",
    hasCar: false, hurtByZombie: false, mercuryLoad: 0, chasedByZombies: 0, hasKeyRing: true,
  }, over || {});
  gameState._visit = Object.assign({}, gameState._visit, { "建平-远翔楼-3F-物理办公室": 1 });
  applyReactive();
}

// 章节前进路线（默认：沿途第一个选项即"前进"向；到 305 前先在材料楼拿研学记忆再回草坪）
function chapterRoute(id, texts) {
  const has = (s) => texts.some((t) => t.indexOf(s) >= 0);
  if (id === "建平-校园门口") return null;          // 章节终点，walk 到此为止
  switch (id) {
    case "建平-后门辅路": return "跟忻老师上车";
    case "建平-前往复旦": return "继续";
    case "复旦江湾-校门": return "走进";
    case "复旦江湾-中央草坪":
      if (has("上车，陪忻老师回家")) return "上车，陪忻老师回家";
      return has("环境科学楼") ? "环境科学楼" : "材料楼";
    case "复旦江湾-材料楼-门前": return texts[0];
    case "复旦江湾-材料楼-展板": return texts[0];
    case "复旦江湾-环境科学楼-门厅": return "上三楼";
    case "复旦江湾-环境科学楼-楼梯": return "继续上三楼";
    case "复旦江湾-环境科学楼-305-合影": return texts[0];
    case "复旦江湾-环境科学楼-305-出示": return texts[0];
    case "复旦江湾-返程车程-空口安慰": return texts[0];
    case "复旦江湾-电话叫人": return texts[0];   // 挂了电话 → _lastScene 正确回位
    default: return 0;                            // 其余节点（堵门/翻窗/胜利/出口…）首项即前进
  }
}
function chapterChooser(over) {
  const o = over || {};
  let visited305 = 0, consoled = false, called = false, a2done = false;
  return (node, texts, id) => {
    const has = (s) => texts.some((t) => t.indexOf(s) >= 0);
    if (id === "复旦江湾-环境科学楼-305") {
      visited305++;
      if (o.a1 && has("把王知筠的手机拿给他看")) return "把王知筠的手机拿给他看";
      if (visited305 === 1 && has("拉开抽屉")) return "拉开抽屉";   // 顺路看一次合影
      return "离开办公室";
    }
    if (id === "复旦江湾-环境科学楼-305-出示") return "先把这里看完";
    if (id === "复旦江湾-环境科学楼-门厅") {
      const v = (gameState._visit && gameState._visit["复旦江湾-环境科学楼-305"]) || 0;
      return v > 0 ? "出楼，回草坪" : "上三楼";
    }
    if (id === "复旦江湾-返程车程") {
      if (o.call && !called && has("给同学打个电话")) { called = true; return "给同学打个电话"; }
      if (o.a2 && !a2done && has("把王知筠的手机拿给他看")) { a2done = true; return "把王知筠的手机拿给他看"; }
      if (o.console && !consoled && has("被抓不一定会变的")) { consoled = true; return "被抓不一定会变的"; }
      return "继续赶路";
    }
    if (id === "复旦江湾-返程车程-出示") return "继续赶路";
    return chapterRoute(id, texts);
  };
}

console.log("=== 1. ① !a !b：堵门牺牲（原作剧情） ===");
{
  baseChapterState();
  const r = walk("建平-后门辅路", chapterChooser(), 60);
  if (r.err) console.log("   trail: " + r.trail.join(" → "));
  chk(!r.err, "全程无异常/零选项" + (r.err ? "：" + r.err : ""));
  chk(r.trail.indexOf("建平-校园门口") >= 0, "抵达 建平-校园门口（" + r.trail.length + " 步）");
  chk(gameState._xinOutcome === 1, "①分支 _xinOutcome=1（实际 " + gameState._xinOutcome + "）");
  chk(gameState._xinScratched === true, "江湾挂彩 _xinScratched=true");
  chk(gameState.hasCar === true, "免费得车 hasCar=true");
  chk(gameState.hasEbike !== true && gameState.hasScooter !== true, "上车清空交通工具");
}

console.log("\n=== 2. ② !a b：学生迟到（目击牺牲） ===");
{
  baseChapterState({ _phoneOrigin: "own", hasPhone: true, phoneBattery: 50 });
  const r = walk("建平-后门辅路", chapterChooser({ call: true }), 60);
  chk(!r.err, "全程无异常/零选项" + (r.err ? "：" + r.err : ""));
  chk(gameState._studentsCalled === true, "b 成立 _studentsCalled=true");
  chk(gameState.phoneBattery === 45, "通话 -5 电（50→" + gameState.phoneBattery + "）");
  chk(gameState._xinOutcome === 2, "②分支 _xinOutcome=2（实际 " + gameState._xinOutcome + "）");
  chk(r.trail.indexOf("建平-校园门口") >= 0, "抵达 建平-校园门口");
  chk(gameState.hasCar === true, "免费得车 hasCar=true");
}

console.log("\n=== 3. ③ a !b：305 出示（a₁）→ 翻窗双逃 ===");
{
  baseChapterState({ hasWangPhone: true, wangPhoneBattery: 8 });
  const r = walk("建平-后门辅路", chapterChooser({ a1: true }), 60);
  chk(!r.err, "全程无异常/零选项" + (r.err ? "：" + r.err : ""));
  chk(gameState._xinKnowsTruth === true, "a₁ 出示成功 _xinKnowsTruth=true");
  chk(gameState.wangPhoneBattery === 8, "出示不扣电（电量是门槛不是货币）");
  chk(gameState._xinOutcome === 3, "③分支 _xinOutcome=3（实际 " + gameState._xinOutcome + "）");
  chk(gameState.hurtByZombie === true, "③玩家负伤 hurtByZombie=true");
  chk(gameState.mercuryLoad >= 10, "③玩家汞负荷 +10（实际 " + gameState.mercuryLoad + "）");
  chk(r.trail.indexOf("建平-校园门口") >= 0, "抵达 建平-校园门口");
  chk(gameState.hasCar === true, "免费得车 hasCar=true");
}

console.log("\n=== 4. ④ a b：学生救场全歼 ===");
{
  baseChapterState({ hasWangPhone: true, wangPhoneBattery: 8, _phoneOrigin: "own", hasPhone: true, phoneBattery: 50 });
  const beforeStr = gameState.strength;
  const r = walk("建平-后门辅路", chapterChooser({ a1: true, call: true }), 60);
  chk(!r.err, "全程无异常/零选项" + (r.err ? "：" + r.err : ""));
  chk(gameState._xinOutcome === 4, "④分支 _xinOutcome=4（实际 " + gameState._xinOutcome + "）");
  chk(r.trail.indexOf("忻老师家-学生救场-胜利") >= 0, "走到 学生救场-胜利 节点");
  chk(gameState.strength < beforeStr, "④挂 combatDrain 扣体力（" + beforeStr + "→" + gameState.strength + "）");
  chk(gameState.hurtByZombie !== true, "④无人受伤（玩家未挂 hurtByZombie）");
  chk(r.trail.indexOf("建平-校园门口") >= 0, "抵达 建平-校园门口");
}

console.log("\n=== 5. a₂ 第二窗口（返程车程出示）+ 空口安慰陷阱 ===");
{
  baseChapterState({ hasWangPhone: true, wangPhoneBattery: 8 });
  let r = walk("建平-后门辅路", chapterChooser({ a2: true }), 60);
  chk(!r.err, "a₂ 路径无异常" + (r.err ? "：" + r.err : ""));
  chk(gameState._xinKnowsTruth === true, "a₂ 出示成功 _xinKnowsTruth=true");
  chk(gameState._xinOutcome === 3, "a₂ → ③ 翻窗双逃（实际 " + gameState._xinOutcome + "）");

  baseChapterState();
  r = walk("建平-后门辅路", chapterChooser({ console: true }), 60);
  chk(!r.err, "空口安慰路径无异常" + (r.err ? "：" + r.err : ""));
  chk(r.trail.indexOf("复旦江湾-返程车程-空口安慰") >= 0, "空口安慰节点可达");
  chk(gameState._xinKnowsTruth === false, "空口安慰不改 _xinKnowsTruth（只有证据能动他）");
}

console.log("\n=== 6. 药丸延迟引信 jpXinFuse ===");
{
  const fuse = (over) => { baseChapterState(Object.assign({ _teacherLeft: true, _xinOutcome: 3, _xinScratched: true, _xinOutcomeDay: 3, dd: 4 }, over)); return jpXinFuse(gameState); };
  chk(fuse({}) === true, "③未给药 · dd=4>day=3 → 爆线");
  chk(fuse({ dd: 3 }) === false, "③未给药 · dd=3=day → 未爆（次日才爆）");
  chk(fuse({ _xinPillGiven: true }) === false, "③已给药 → 不爆");
  chk(fuse({ _xinOutcome: 4 }) === false, "④未给药 · dd=4=day+1 → 未爆（隔日才爆）");
  chk(fuse({ _xinOutcome: 4, dd: 5 }) === true, "④未给药 · dd=5>day+1 → 爆线");

  baseChapterState({ _teacherLeft: true, _xinOutcome: 3, _xinScratched: true, _xinOutcomeDay: 3, dd: 4, chasedByZombies: 0 });
  const opt = visibleChoices(storyData["建平-远翔楼-3F"]).find((c) => String(c.text).indexOf("物理办公室") >= 0);
  chk(!!opt, "3F 走廊「去物理办公室」可见");
  chk(opt && resolve(opt.nextScene) === "结局-变了的忻老师", "爆线 → 路由 结局-变了的忻老师（实际 " + (opt && resolve(opt.nextScene)) + "）");
  const etxt = typeof storyData["结局-变了的忻老师"].text === "function" ? storyData["结局-变了的忻老师"].text(gameState) : storyData["结局-变了的忻老师"].text;
  chk(etxt.indexOf("结局：变了的忻老师") >= 0, "结局文案含「—— 结局：变了的忻老师 ——」");
  chk(etxt.indexOf("汞") < 0, "结局文案不点明机制（无「汞」字）");
}

console.log("\n=== 7. missable：错过上车窗口 → _xinGone 空车位 ===");
{
  baseChapterState({ _xinOfferDay: 3, dd: 4, _teacherLeft: false, _xinDead: false });
  const node = enterScene("建平-后门辅路");
  chk(gameState._xinGone === true, "dd>offerDay 且未上车 → _xinGone=true");
  const t = typeof node.text === "function" ? node.text(gameState) : node.text;
  chk(t.indexOf("轮胎印") >= 0, "后门辅路空车位文案（轮胎印）");
  chk(visibleChoices(node).map((c) => c.text).join("|").indexOf("跟忻老师上车") < 0, "错过窗口后「跟忻老师上车」不再出现");
  const off = enterScene("建平-远翔楼-3F-物理办公室");
  const ot = typeof off.text === "function" ? off.text(gameState) : off.text;
  chk(ot.indexOf("天不亮就自己走了") >= 0, "物理办公室 _xinGone 空屋文案");
}

console.log("\n=== 7b. 错过即走（拍板 09-24）：许诺日当天 14 点为硬闸，无第二次机会 ===");
{
  // 当天 13 点 → 窗口仍在，可上车
  baseChapterState({ _xinOfferDay: 3, dd: 3, hh: 13 });
  let node = enterScene("建平-后门辅路");
  chk(gameState._xinGone !== true, "许诺日当天 13 点 → 未过期");
  chk(visibleChoices(node).some((c) => String(c.text).indexOf("跟忻老师上车") >= 0), "当天 13 点「跟忻老师上车」可见");

  // 当天 15 点 → 当场目送他开车走，上车选项消失
  baseChapterState({ _xinOfferDay: 3, dd: 3, hh: 15 });
  node = enterScene("建平-后门辅路");
  chk(gameState._xinGone === true, "许诺日当天 15 点 → _xinGone=true（错过即走）");
  const t = typeof node.text === "function" ? node.text(gameState) : node.text;
  chk(t.indexOf("没有停车") >= 0, "辅路目送离开文案（没有停车）");
  chk(visibleChoices(node).map((c) => c.text).join("|").indexOf("跟忻老师上车") < 0, "当天 15 点「跟忻老师上车」不再出现");
  const off = enterScene("建平-远翔楼-3F-物理办公室");
  const ot = typeof off.text === "function" ? off.text(gameState) : off.text;
  chk(ot.indexOf("过了两点，我就不等了") >= 0, "办公室当天告别文案");

  // 办公室记账：未记账时先进办公室（后门已清）→ 当天记账；14 点前进辅路可上车
  baseChapterState({ _xinOfferDay: 0, dd: 3, hh: 13 });
  chk(gameState._xinOfferDay === 0, "初始 _xinOfferDay=0");
  enterScene("建平-远翔楼-3F-物理办公室");
  chk(gameState._xinOfferDay === 3, "办公室 onEnter 记账 _xinOfferDay=dd（实际 " + gameState._xinOfferDay + "）");
  node = enterScene("建平-后门辅路");
  chk(visibleChoices(node).some((c) => String(c.text).indexOf("跟忻老师上车") >= 0), "记账当天 13 点仍可上车");

  // 文案不再承诺「明天」
  baseChapterState({ _xinOfferDay: 0, dd: 3, hh: 13 });
  const off2 = enterScene("建平-远翔楼-3F-物理办公室");
  const ot2 = typeof off2.text === "function" ? off2.text(gameState) : off2.text;
  chk(ot2.indexOf("明天") < 0, "办公室文案不承诺「明天」（错过即走）");
}

console.log("\n=== 7c. 窗口锚定开门日（拍板 09-24 方案A）：过夜重置漏洞已堵 ===");
{
  // 15:00 开门 → 记账锚定当天，而非首次进办公室/辅路那天
  baseChapterState({ _xinOfferDay: 0, dd: 3, hh: 15 });
  enterScene("建平-后门-开门");
  chk(gameState._xinOfferDay === 3, "开门瞬间记账 _xinOfferDay=清开日（实际 " + gameState._xinOfferDay + "）");

  // 开门后不进办公室/辅路、撑过一夜 → 次日清晨进辅路：空车位，不再有上午窗口
  gameState.dd = 4;
  const node = enterScene("建平-后门辅路");
  chk(gameState._xinGone === true, "过夜重置漏洞已堵：次日进辅路 → _xinGone=true");
  const t = typeof node.text === "function" ? node.text(gameState) : node.text;
  chk(t.indexOf("轮胎印") >= 0, "次日空车位文案（轮胎印）");
  chk(visibleChoices(node).map((c) => c.text).join("|").indexOf("跟忻老师上车") < 0, "次日清晨「跟忻老师上车」不再出现");

  // 当天 15:00 开门 → 当天进辅路：当场目送离开
  baseChapterState({ _xinOfferDay: 0, dd: 3, hh: 15 });
  enterScene("建平-后门-内侧-开门");
  const node2 = enterScene("建平-后门辅路");
  chk(gameState._xinGone === true, "当天 15 点开门后进辅路 → _xinGone=true");
  const t2 = typeof node2.text === "function" ? node2.text(gameState) : node2.text;
  chk(t2.indexOf("没有停车") >= 0, "当天目送离开文案（没有停车）");

  // 内侧补开门点同样记账
  baseChapterState({ _xinOfferDay: 0, dd: 3, hh: 10 });
  enterScene("建平-后门-开门-清场后");
  chk(gameState._xinOfferDay === 3, "「开门-清场后」开门点同样记账（实际 " + gameState._xinOfferDay + "）");
  const node3 = enterScene("建平-后门辅路");
  chk(gameState._xinGone !== true, "当天 10 点开门 → 窗口仍在，未落定");
  chk(visibleChoices(node3).some((c) => String(c.text).indexOf("跟忻老师上车") >= 0), "当天 10 点「跟忻老师上车」可见");
}

console.log("\n=== 8. 整理整理给药丸选项（位置门控） ===");
{
  const bagChoices = () => { const b = storyData["整理整理"]; return (typeof b.choices === "function" ? b.choices.call(b, gameState) : b.choices).filter((c) => !c.showCondition || checkCondition(c.showCondition, gameState)); };
  const hasPillOpt = () => bagChoices().some((c) => String(c.text).indexOf("拿给忻老师") >= 0);
  baseChapterState({ _xinOutcome: 3, _xinScratched: true, hasMercuryPill: true, _xinPillGiven: false, currentArea: "建平中学" });
  chk(hasPillOpt() === true, "在校园（建平中学）→ 给药选项可见");
  baseChapterState({ _xinOutcome: 3, _xinScratched: true, hasMercuryPill: true, _xinPillGiven: false, currentArea: "复旦" });
  chk(hasPillOpt() === false, "在复旦章内 → 不出现（位置门控）");
  baseChapterState({ _xinOutcome: 3, _xinScratched: true, hasMercuryPill: false, currentArea: "建平中学" });
  chk(hasPillOpt() === false, "无药丸 → 不出现");
  baseChapterState({ _xinOutcome: 3, _xinScratched: true, hasMercuryPill: true, _xinPillGiven: true, currentArea: "建平中学" });
  chk(hasPillOpt() === false, "已给过 → 不出现");
  baseChapterState({ _xinOutcome: 4, _xinScratched: true, hasMercuryPill: true, _xinPillGiven: false, currentArea: "建平中学" });
  chk(hasPillOpt() === true, "④分支同样可给药（_xinOutcome>=3 口径）");
}

console.log("\n=== 9. 仁济门诊药房第二入口 ===");
{
  const phChoices = () => { const p = storyData["仁济南院-门诊药房"]; return (typeof p.choices === "function" ? p.choices.call(p, gameState) : p.choices).filter((c) => !c.showCondition || checkCondition(c.showCondition, gameState)); };
  baseChapterState({ hasMercuryPill: false });
  chk(phChoices().some((c) => String(c.nextScene).indexOf("门诊药房-药丸") >= 0), "无药丸时第二入口可见");
  baseChapterState({ hasMercuryPill: true });
  chk(!phChoices().some((c) => String(c.nextScene).indexOf("门诊药房-药丸") >= 0), "已持有药丸时不出现（防重复）");
}

console.log("\n=== 10. 章节全部节点 · 四组合零选项扫描 ===");
{
  const CHAPTER = Object.keys(storyData).filter((k) =>
    k.indexOf("复旦江湾") >= 0 || k === "建平-教师小区门口" || k.indexOf("忻老师家") >= 0 ||
    k === "回建平-车程" || k === "建平-前往复旦" || k === "过夜-复旦-车内");
  chk(CHAPTER.length > 0, "章节节点数 = " + CHAPTER.length);
  const zero = [], missing = [];
  for (const a of [false, true]) for (const b of [false, true]) for (const id of CHAPTER) {
    if (!storyData[id]) { missing.push(id); continue; }
    baseChapterState({ _xinKnowsTruth: a, _studentsCalled: b, _teacherLeft: true, _xinScratched: true, _xinOutcome: 0, hasWangPhone: true, wangPhoneBattery: 8, _phoneOrigin: "own", hasPhone: true, phoneBattery: 50 });
    gameState._visit = Object.assign({}, gameState._visit, { "复旦江湾-环境科学楼-305": 1 });
    applyReactive();
    const vis = visibleChoices(enterScene(id));
    if (!vis.length && !id.startsWith("结局-")) zero.push("a=" + a + " b=" + b + " → " + id);
  }
  chk(missing.length === 0, "全部章节节点可解析" + (missing.length ? "：" + missing.join(",") : ""));
  chk(zero.length === 0, "四组合下无零选项节点" + (zero.length ? "：" + zero.join(" ; ") : ""));
}

console.log("\n结果：" + ok + " 通过 / " + bad + " 失败");
process.exit(bad === 0 ? 0 : 1);
