// 过程性节点豁免过夜 —— 回归自测
//
// 背景（2026-10-03 波波）：
//   「天黑必须过夜」触发器会在玩家进入【任何】场景的瞬间把他拉走，连正在进行的 QTE /
//   闪色战斗也照拉不误（实测 103 个带 qte 的场景 100% 被整场吞掉）；开车途中更糟——
//   人被拉走后车留在车库里，`_driving` 还会带到第二天。
//
// 方案（波波拍板）：场景静态属性 `nightImmune`（布尔 / 函数）+ 自带 qte 的场景自动豁免。
//   ⚠ 刻意【不用】_variables 里的状态变量：豁免是"当前节点的属性"不是"玩家的状态"，
//     用状态表达位置属性就得维护"进入置位 + 四条出口清位"，那正是 _driving 泄漏 bug 的成因。
//     静态属性不进存档 → 回溯/读档天然正确，零清理。
//
// 同时验证：renderScene 内补的 refreshComputed() 让派生量 `_garDenTotal` 不再滞后。
//
// 本脚本跑【真实 renderScene】（沙箱 DOM 桩足够），不模拟——框架的 ofusive 语义差异不再靠演绎。
// 用法： node tools/night_process_immune_selftest.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

let okCount = 0, badCount = 0;
function check(cond, label, extra) {
  if (cond) { okCount++; console.log('  ✓ ' + label); }
  else { badCount++; console.log('  ✗ ' + label + (extra ? '  → ' + extra : '')); }
}

// ---------------- DOM 桩（够 renderScene 跑完 onEnter→触发器→renderChoices） ----------------
function mkEl() {
  return {
    id: '', className: '', style: { cssText: '', setProperty() {}, removeProperty() {} },
    dataset: {}, children: [], childNodes: [],
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    innerHTML: '', textContent: '', scrollTop: 0, value: '', checked: false,
    appendChild(c) { this.children.push(c); return c; }, removeChild() {}, remove() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 800, height: 600, top: 0, left: 0 }; },
    focus() {}, blur() {}, click() {}, closest() { return null; }, insertBefore() {},
    getElementsByTagName() { return []; }, insertAdjacentHTML() {}, cloneNode() { return mkEl(); },
  };
}

let FILES;
try { FILES = require('./story_files').list(); }
catch (e) { console.error('无法读取 story_files 清单：' + e.message); process.exit(2); }

function boot() {
  const doc = {
    body: mkEl(), documentElement: mkEl(), head: mkEl(),
    createElement: () => mkEl(), createElementNS: () => mkEl(), createTextNode: () => mkEl(),
    getElementById: () => mkEl(), querySelector: () => mkEl(), querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    createDocumentFragment: () => mkEl(), fonts: { ready: Promise.resolve(), load: () => {} },
  };
  const sandbox = {
    document: doc,
    window: {
      addEventListener() {}, removeEventListener() {},
      requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
      getComputedStyle: () => ({ getPropertyValue: () => '' }), innerWidth: 800, innerHeight: 600,
      matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    },
    navigator: { userAgent: 'node', clipboard: { writeText: () => {} } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
    Math, Date, JSON, Promise, Object, Array, Set, Map,
    String, Number, Boolean, RegExp, Error, Function, isNaN, parseInt, parseFloat,
    alert() {}, confirm() { return true; }, prompt() { return ''; }, fetch: () => Promise.resolve(),
    // ⚠过滤环境噪音：core.js 的 _reactive.rules 里有 `fatigueTier(_travelMinutes)` 这类函数调用，
    //   而 evaluateExpr 用 new Function(...gameState的键) 求值，utils 的函数不在参数表里 → 沙箱里必报
    //   ReferenceError（引擎自己 try/catch 兜住）。与本次改动无关，静音以免淹没断言输出。
    console: {
      log: console.log,
      warn: console.warn,
      error: (...a) => { const s = String(a[0] || ''); if (s.indexOf('表达式错误') >= 0) return; console.error(...a); },
      info: console.info, table: console.table,
    },
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    Image: function () { return mkEl(); },
    Event: function () { return {}; }, CustomEvent: function () { return {}; },
  };
  sandbox.globalThis = sandbox; sandbox.self = sandbox; sandbox.window.document = doc;
  vm.createContext(sandbox);
  for (const f of FILES) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f });
  }
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'), sandbox, { filename: 'engine.js' });
  return (c) => vm.runInContext(c, sandbox);
}
const S = boot();

// 装配一份天黑但人还活着的状态（over 覆盖用）
function mkState(over) {
  const code =
    '(function(over){' +
    '  var gs = {};' +
    '  for (var k in storyData._variables) { var v = storyData._variables[k];' +
    '    gs[k] = (typeof v === "object" && v !== null && "default" in v) ? v.default : v; }' +
    '  gs.hh = 19; gs.mm = 0; gs.dd = 3; gs.strength = 8; gs.mercuryLoad = 0;' +
    '  gs.chasedByZombies = 0; gs._harshCaught = false; gs._backhallDead = false;' +
    '  ["A","B","C","D","E","F","G","H","I"].forEach(function(x){ gs["_garDen"+x] = 0; });' +
    '  for (var k2 in over) gs[k2] = over[k2];' +
    '  gameState = gs;' +
    '  return gs;' +
    '})(' + JSON.stringify(over || {}) + ')';
  return S(code);
}

// 用真实 renderScene 渲染一个场景，返回最终 currentScene
function render(id, over) {
  mkState(over);
  S('currentScene = ' + JSON.stringify(id) + ';');
  try { S('renderScene(' + JSON.stringify(id) + ');'); }
  catch (e) { return 'RENDER_ERR:' + e.message; }
  return S('currentScene');
}

console.log('===== 断言 A：普通场景 —— 天黑照旧被拉走 =====');
{
  const to = render('新达汇-B1-入口平台');
  check(to === '天黑必须过夜', '无 qte 的普通场景在天黑时仍跳转过夜菜单', '实际落到 ' + JSON.stringify(to));
}

console.log('\n===== 断言 B：QTE / 闪色战斗 —— 不被天黑吞掉 =====');
{
  const qteIds = S('Object.keys(storyData).filter(function(k){ var s=storyData[k]; return s && typeof s === "object" && s.qte; })');
  check(qteIds.length > 0, '全库带 qte 的场景 ' + qteIds.length + ' 个');
  let swallowed = 0, kept = 0, err = 0;
  const swallowedList = [];
  for (const id of qteIds) {
    const to = render(id);
    if (typeof to === 'string' && to.indexOf('RENDER_ERR') === 0) { err++; continue; }
    if (to === '天黑必须过夜') { swallowed++; swallowedList.push(id); }
    else kept++;
  }
  check(swallowed === 0,
    '天黑时没有一个 QTE 场景被吞掉（吞掉的 ' + swallowed + ' 个）',
    swallowedList.slice(0, 5).join(', '));
  check(kept + err === qteIds.length, 'QTE 场景数守恒（留在自身 ' + kept + ' + 渲染异常 ' + err + '）');
  if (swallowedList.length) console.log('     被吞的：' + swallowedList.slice(0, 10).join(', '));
}

console.log('\n===== 断言 C：车库九格 —— 步行照旧走、开车才豁免 =====');
{
  const cell = '新达汇-B1-入口平台';
  const walk = render(cell, { _driving: false });
  check(walk === '天黑必须过夜', '步行穿过车库：天黑照常被拉走', '实际 ' + JSON.stringify(walk));
  const drive = render(cell, { _driving: true });
  check(drive === cell, '开车横在半路：豁免拉走（车不会丢在库里）', '实际 ' + JSON.stringify(drive));
  const immuneDecl = S('typeof storyData["新达汇-B1-入口平台"].nightImmune');
  check(immuneDecl === 'function', '车库格子用函数形态声明 nightImmune（一条覆盖九格）', '实际类型 ' + immuneDecl);
  const driveImmune = S('storyData["新达汇-B1-入口平台"].nightImmune({_driving:true})');
  const walkImmune = S('storyData["新达汇-B1-入口平台"].nightImmune({_driving:false})');
  check(driveImmune === true && walkImmune === false, 'nightImmune 只看 _driving（步行不豁免）');
}

console.log('\n===== 断言 D：死亡类触发器 —— 豁免不得让它们失效 =====');
{
  const qteId = S('Object.keys(storyData).filter(function(k){ var s=storyData[k]; return s && typeof s === "object" && s.qte; })[0]');
  const dead1 = render(qteId, { strength: 0 });
  check(dead1 === '结局-体力耗尽', 'QTE 场景 + 体力耗尽 → 照常死亡（豁免只针对天黑）', '实际 ' + JSON.stringify(dead1));
  const dead2 = render(qteId, { chasedByZombies: 5 });
  check(dead2 === '结局-尸潮撕碎了你', 'QTE 场景 + 追兵满级 → 照常死亡', '实际 ' + JSON.stringify(dead2));
  // ⚠刻意【不】用 chasedByZombies>=5 测驾驶豁免场景：G 区 onEnter 的 xdGarEnterSettle 会先把追兵
  //   换成 G 区密度并清零（这正是波波批准的"进库清零"机制），触发器的检查发生在 onEnter 之后，
  //   所以带满级追兵进库本来就不会即死——那是设计，不是豁免造成的漏洞。
  //   改用 _harshCaught：目标"建平-Harsh堵住"，不受车库任何结算影响。
  const driveDead = render('新达汇-B1-入口平台', { _driving: true, _harshCaught: true });
  check(driveDead === '建平-Harsh堵住', '驾驶豁免场景 + Harsh 追上 → 仍会死（豁免不是不死身）', '实际 ' + JSON.stringify(driveDead));
  const qteHarsh = render(qteId, { _harshCaught: true });
  check(qteHarsh === '建平-Harsh堵住', 'QTE 豁免场景 + Harsh 追上 → 仍会死', '实际 ' + JSON.stringify(qteHarsh));
}

console.log('\n===== 断言 E：派生量不再滞后（renderScene 内已补 refreshComputed） =====');
{
  // 手工把派生量写成脏值；真实密度和是 0。renderScene 里若补了 refreshComputed，脏值会被纠正。
  mkState({ _garDenTotal: 999 });
  S('currentScene = "新达汇-B1-入口平台"; renderScene("新达汇-B1-入口平台");');
  const val = S('gameState._garDenTotal');
  check(val === 0, '进入场景后 _garDenTotal 被重算为真实和（脏值 999 → 0）', '实际 ' + val);

  // 点火：onEnter 的 surge 会把全库 9 格各 +1 → 自己这场 QTE 的时限应当立刻反映
  mkState({});
  S('currentScene = "新达汇-B1-入口平台"; renderScene("新达汇-B1-入口平台");');
  S('currentScene = "新达汇-B1停车场-上车点火"; renderScene("新达汇-B1停车场-上车点火");');
  const after = S('gameState._garDenTotal');
  check(after === 9, '点火 surge（全库 9 格）后派生量同步为 9（旧实现滞后为 0）', '实际 ' + after);
  const timeoutMs = S('(function(){ try { return Math.max(3000, 8000 - gameState._garDenTotal * 250); } catch(e){ return -1; } })()');
  check(timeoutMs === 5750, '由此点火这场 QTE 时限收紧到 5750ms（修复前是满的 8000ms）', '实际 ' + timeoutMs);
}

console.log('\n===== 断言 F：源码契约 =====');
{
  const coreSrc = fs.readFileSync(path.join(ROOT, 'story/core.js'), 'utf8');
  check(/id:\s*"night"[^}]*targetScene:\s*"天黑必须过夜"/.test(coreSrc) ||
        /targetScene:\s*"天黑必须过夜"[^}]*id:\s*"night"/.test(coreSrc.replace(/\n/g, ' ')),
    'core.js：天黑触发器带 id:"night" 标识');
  const engSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  check(engSrc.indexOf('nightImmune') >= 0, 'engine.js：存在 nightImmune 守卫');
  check(/nightImmune\s*&&\s*trigger\.id\s*===\s*"night"/.test(engSrc),
    'engine.js：豁免只对 id==="night" 生效（死亡触发器不得被豁免）');
  const callPos = engSrc.indexOf('checkGlobalTriggers(sceneId);');
  const refreshPos = engSrc.lastIndexOf('refreshComputed();', callPos);
  const endingPos = engSrc.lastIndexOf('const isEndingScene', callPos);
  check(refreshPos > 0 && refreshPos < callPos && refreshPos > endingPos - 400,
    'engine.js：checkGlobalTriggers 之前、onEnter 之后有 refreshComputed()');
  check(!(engSrc.indexOf('sceneId') >= 0 && /checkGlobalTriggers\(\)/.test(engSrc)),
    'engine.js：没有漏改的无参调用（豁免判定必须拿到 sceneId）');
}

console.log('\n结果：' + okCount + ' 通过 / ' + badCount + ' 失败');
process.exit(badCount ? 1 : 0);
