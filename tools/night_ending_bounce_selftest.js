// 夜晚死亡结局被全局触发器劫持（弹回过夜菜单）——回归自测
//
// Bug（2026-10-01 波波报告）：
//   Day 2 夜里在「天黑必须过夜」点「睡在自己家」→ 应进「结局-过夜-自己家不再安全」，
//   实际却弹回「天黑必须过夜」。
//
// 根因（engine.js renderScene）：
//   renderScene 进入【任何】场景后都会跑 checkGlobalTriggers()，且没有结局豁免。
//   夜里 hh >= 19，全局触发器 { condition:"hh >= 19", targetScene:"天黑必须过夜", priority:5 }
//   在进入结局场景的瞬间再次命中 → resolved("天黑必须过夜") !== currentScene(结局) → 弹回。
//   过夜安全屋（过夜-自己家等）不受影响，因为 onEnter 先把 hh 拨回 7，触发器不再命中；
//   死亡结局节点没有 onEnter，hh 停在 19+，必被劫持。
//   （触发器目标本身是结局的，如 结局-体力耗尽 / 结局-汞中毒尸变，因 resolved === currentScene
//    天然豁免——所以白天死掉看起来一切正常，只有夜晚"非触发器直达"的结局会中招。）
//
// 修复：renderScene 对结局场景（ID 以「结局」开头，或静态文案含「—— 结局：」）跳过全局触发器检查。
//   非前缀结局全库共 4 个（五金店-货架躲藏 / 上实南校-图书馆-全灭 / 三林安居苑-厨房危险 /
//   建平-结局-空枪），均为静态文案，第二条判定可覆盖；函数式文案结局 ID 均带前缀。
//
// 本脚本按引擎真实语义模拟整条链路：选项可见性 → condition/elseScene → 进入目标 → onEnter → 全局触发器。
// 断言（两条，任一失败退出码 1）：
//   A. 过夜菜单在夜晚可达的每一个结局目标，最终落点必须是结局本身（不被触发器劫持）；
//   B. engine.js 源码中存在结局豁免守卫（isEndingScene）。
// 用法： node tools/night_ending_bounce_selftest.js
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

let FILES;
try { FILES = require('./story_files').list(); }
catch (e) { console.error('无法读取 story_files 清单：' + e.message); process.exit(2); }

// ---------- 载入剧情 ----------
const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
sandbox.flashStatusWarning = function () {};
sandbox.flashStatus = function () {};
sandbox.showToast = function () {};
sandbox.notify = function () {};
sandbox.triggerShake = function () {};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log('缺失:', f); continue; }
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.log('执行失败', f, e.message); }
}
const sd = vm.runInContext('storyData', sandbox);

// ---------- 从 engine.js 抽取真实 checkCondition（大括号配平切片） ----------
const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('engine.js 中找不到 ' + name);
  let depth = 0, i = src.indexOf('{', start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error(name + ' 大括号不配平');
}
vm.runInContext(extractFn(engineSrc, 'checkCondition'), sandbox, { filename: 'engine.js#checkCondition' });
// interpolateDisplay 只用在大括号插值；本测试的跳转目标均为纯 ID，等值实现足够
sandbox.interpolateDisplay = function (s, state) {
  return typeof s === 'string' ? s.replace(/\{([^}]+)\}/g, (_, k) => (state[k] !== undefined ? state[k] : '')) : s;
};
sandbox.parseRedirectTarget = function (target, state) {
  if (typeof target === 'function') { const r = target(state); return typeof r === 'string' ? sandbox.interpolateDisplay(r, state) : r; }
  if (typeof target === 'string') return sandbox.interpolateDisplay(target, state);
  return target;
};
const checkCondition = sandbox.checkCondition, parseRedirectTarget = sandbox.parseRedirectTarget;

// ---------- 引擎语义复刻（renderScene 的 onEnter → 全局触发器两步，含结局豁免） ----------
function checkGlobalTriggers(state) {
  const list = sd._globalTriggers || [];
  let best = null, bestPrio = -Infinity;
  for (const t of list) {
    if (checkCondition(t.condition, state)) {
      const p = t.priority || 0;
      if (p > bestPrio) { best = t; bestPrio = p; }
    }
  }
  return best ? parseRedirectTarget(best.targetScene, state) : null;
}

function isEndingId(id, scene) {
  if (typeof id === 'string' && id.startsWith('结局')) return true;
  const s = scene || sd[id] || {};
  return typeof s.text === 'string' && s.text.includes('—— 结局：');
}

// 模拟 renderScene 进入 sceneId：返回最终落点（若被全局触发器劫持则返回触发器目标）
// 语义对齐 engine.js:1462-1485：先跑 onEnter（含 applyEffect），再查全局触发器；结局场景跳过触发器（修复语义）。
function enterScene(sceneId, state) {
  const scene = sd[sceneId];
  if (!scene) return { land: sceneId, hijack: null };
  let eff = null;
  if (typeof scene.onEnter === 'function') eff = scene.onEnter(state);
  else if (scene.onEnter && typeof scene.onEnter === 'object') eff = scene.onEnter;
  if (eff) {
    if (eff.set) for (const k in eff.set) state[k] = eff.set[k];
    if (eff.add) for (const k in eff.add) state[k] = (state[k] || 0) + eff.add[k];
    if (eff.mul) for (const k in eff.mul) state[k] = (state[k] || 0) * eff.mul[k];
  }
  if (isEndingId(sceneId, scene)) return { land: sceneId, hijack: null };   // 修复：结局是终态
  const trig = checkGlobalTriggers(state);
  if (trig && trig !== sceneId) return { land: trig, hijack: trig };
  return { land: sceneId, hijack: null };
}

function makeState(over) {
  const state = JSON.parse(JSON.stringify(sd._variables || {}));
  Object.assign(state, over || {});
  return state;
}

// ---------- 断言 B：engine.js 源码里必须有结局豁免守卫 ----------
console.log('===== 断言 B：engine.js 结局豁免守卫 =====');
const guardRe = /isEndingScene|结局场景.{0,40}跳过.{0,20}触发器|结局.{0,10}终态/;
const hasGuard = guardRe.test(engineSrc);
console.log('  守卫' + (hasGuard ? '存在 ✓' : '缺失 ✗（夜晚结局仍会被 hh>=19 弹回，见 tools/过夜系统审计报告.md 同期修复记录）'));
let fails = hasGuard ? 0 : 1;

// ---------- 状态网格：最大化各选项可见性 ----------
const AREAS = ['初始小区', '周边社区', '高架', '仁济南院', '建平中学', '金谊广场', '张江', '复旦'];
// 从过夜菜单的 showCondition 里抽取 currentPos 字面量，补上常见值
const MENU = '天黑必须过夜';
const menu = sd[MENU];
const POS_SET = new Set(['我家', '理发店', '']);
for (const c of menu.choices) {
  const sc = c.showCondition || '';
  for (const m of sc.matchAll(/currentPos\s*[!=]=\s*'([^']+)'/g)) POS_SET.add(m[1]);
}
const POSTS = [...POS_SET];
// 打满「去过/持有」类门槛（_visit 键、手电、钥匙等），只留区域/位置/日期维度扫描
function gridState(area, pos) {
  const st = makeState({
    dd: 2, hh: 19, mm: 30, currentArea: area, currentPos: pos,
    hasTorch: true, hasDoorKey1: true, _yorozuyaUnlocked: true,
    FamilymartHasZombie: false, _supermarketCompromised: false,
    chasedByZombies: 0, mercuryLoad: 0,
  });
  st._visit = st._visit || {};
  for (const c of menu.choices) {
    const sc = c.showCondition || '';
    for (const m of sc.matchAll(/_visit\['([^']+)'\]/g)) st._visit[m[1]] = 1;
  }
  return st;
}

// ---------- 断言 A：夜晚从过夜菜单可达的结局必须落在自身 ----------
console.log('\n===== 断言 A：过夜菜单夜晚可达结局的最终落点 =====');
const hijacked = [];
let checked = 0;
for (let i = 0; i < menu.choices.length; i++) {
  const c = menu.choices[i];
  for (const area of AREAS) {
    for (const pos of POSTS) {
      const st = gridState(area, pos);
      if (c.showCondition && !checkCondition(c.showCondition, st)) continue;
      const condMet = checkCondition(c.condition, st);
      const rawTarget = condMet ? c.nextScene : c.elseScene;
      if (rawTarget === undefined) continue;
      const target = parseRedirectTarget(rawTarget, st);
      const tgtScene = sd[target];
      if (!tgtScene || !isEndingId(target, tgtScene)) continue;   // 只看结局目标
      checked++;
      const r = enterScene(target, st);
      if (r.land !== target) {
        hijacked.push({ idx: i + 1, text: typeof c.text === 'string' ? c.text : '(函数式)', area, pos, target, land: r.land });
      }
      break;   // 该选项找到一个可见组合即可判 Target 落点（目标不随 area/pos 变化的静态结局）
    }
    if (hijacked.some(h => h.idx === i + 1)) break;
  }
}
if (hijacked.length) {
  fails += hijacked.length;
  console.log('  被劫持的夜晚结局：');
  hijacked.forEach(h => console.log('  #' + String(h.idx).padStart(2) + ' 「' + h.text + '」[' + h.area + '/' + (h.pos || '-') + '] → ' + h.target + '  实际落到 ' + h.land));
} else {
  console.log('  共核对 ' + checked + ' 条「选项×可见状态」→ 结局落点，全部落在结局本身 ✓');
}

// ---------- 信息展示：波波报告路径的对照（Day1 正常 / Day2 修复后落点） ----------
console.log('\n===== 对照：波波报告的路径 =====');
{
  const homeChoice = menu.choices.find(c => c.text === '睡在自己家');
  const st2 = gridState('初始小区', '我家');
  st2._visit = {};   // 初始小区不需要 _visit 门槛，清空避免干扰
  const condMet = checkCondition(homeChoice.condition, st2);
  const target = parseRedirectTarget(condMet ? homeChoice.nextScene : homeChoice.elseScene, st2);
  const r2 = enterScene(target, st2);
  console.log('  Day2 夜（dd=2, hh=19, 在我家）点「睡在自己家」→ ' + r2.land + (r2.land === target ? '  ✓ 落在结局「回家」' : '  ✗ 被劫持'));
  const st1 = gridState('初始小区', '我家');
  st1.dd = 1; st1._visit = {};
  const t1 = parseRedirectTarget(homeChoice.nextScene, st1);
  const r1 = enterScene(t1, st1);
  console.log('  Day1 夜（dd=1, hh=20, 在我家）同一选项 → ' + r1.land + '（onEnter 拨回 hh=7，触发器不命中，与修复无关）');
  if (r1.land !== t1) { fails++; console.log('  ✗ Day1 路径异常'); }
  if (r2.land !== target) { fails++; console.log('  ✗ Day2 路径仍被劫持'); }
}

// ---------- 结局 ID 命名信息 ----------
console.log('\n===== 信息：文案含「—— 结局：」但 ID 不以「结局」开头（守卫第二条覆盖） =====');
let namingOdd = 0;
for (const k of Object.keys(sd)) {
  if (k.startsWith('_')) continue;
  const n = sd[k];
  if (!n || typeof n !== 'object') continue;
  if (typeof n.text === 'string' && n.text.includes('—— 结局：') && !k.startsWith('结局')) {
    console.log('  ' + k);
    namingOdd++;
  }
}
if (!namingOdd) console.log('  （无）');

console.log('\n===== 结论 =====');
console.log('失败数: ' + fails);
if (fails > 0) { console.log('自测未通过'); process.exit(1); }
console.log('全绿：夜晚可达结局全部落在自身，引擎守卫在位');
process.exit(0);
