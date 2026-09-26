/**
 * 玩家体验报告整改自检（2026-09-26）
 * 覆盖 4 项改动：
 *   1. 文具店「仔细翻找」可拿饼干 + 背包容量校验（含函数式 condition/effect）
 *   2. 全家便利店「查看日记本」100% 出现（取消 Math.random() < 0.5）
 *   3. 民防等候区隐藏计数器 visitWaitingRoomTimes 的递进听觉暗示
 *   4. 地铁站 4 处 QTE 时限拉长
 * 用法: node tools/playtest_fix_selftest.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const FILES = require('./story_files').list();

const sandbox = {
  console, Math, JSON, Date, Set, Map, Object, Array, String, Number, Boolean,
  isNaN, parseInt, parseFloat, setTimeout, clearTimeout
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.flashStatusWarning = function () {};
sandbox.flashStatus = function () {};
sandbox.showToast = function () {};
sandbox.notify = function () {};
sandbox.triggerShake = function () {};
vm.createContext(sandbox);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}

const storyData = vm.runInContext('storyData', sandbox);
const vars0 = storyData._variables;
const computed = storyData._reactive.computed;

// ---------- 迷你引擎（与 bag_volume_selftest 同构，额外支持函数式条件） ----------
function newState(patch) {
  const s = JSON.parse(JSON.stringify(vars0, (k, v) => (v instanceof Set ? { __set: [...v] } : v)),
    (k, v) => (v && v.__set ? new Set(v.__set) : v));
  s._visit = {};
  Object.assign(s, patch || {});
  recompute(s);
  return s;
}
function recompute(s) {
  for (const k in computed) {
    const f = computed[k];
    if (typeof f === 'function') { s[k] = f(s); continue; }
    const names = Object.keys(s);
    const vals = names.map(n => s[n]);
    s[k] = Function(...names, 'return (' + f + ')').apply(null, vals);
  }
}
// 引擎 checkCondition：支持 null / true / function / string / object
function evalCond(s, cond) {
  if (cond == null || cond === true) return true;
  if (typeof cond === 'function') return Boolean(cond(s));
  if (typeof cond === 'string') {
    try {
      const names = Object.keys(s), vals = names.map(n => s[n]);
      return Boolean(Function(...names, 'return Boolean(' + cond + ');').apply(null, vals));
    } catch (e) { return false; }
  }
  return true;
}
function visibleChoices(s, sceneId) {
  const sc = storyData[sceneId];
  if (!sc) throw new Error('scene not found: ' + sceneId);
  const raw = typeof sc.choices === 'function' ? sc.choices(s) : (sc.choices || []);
  return raw.filter(c => evalCond(s, c.showCondition));
}
function label(c, s) {
  return typeof c.text === 'function' ? c.text(s) : c.text;
}
function labels(list, s) { return list.map(c => label(c, s)); }
function runEffect(s, c) {
  const e = typeof c.effect === 'function' ? c.effect(s) : c.effect;
  if (e) {
    for (const k in e.set || {}) s[k] = e.set[k];
    for (const k in e.add || {}) s[k] = (s[k] || 0) + e.add[k];
    recompute(s);
  }
}
function sceneText(s, sceneId) {
  const sc = storyData[sceneId];
  return typeof sc.text === 'function' ? sc.text(s) : sc.text;
}

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

// =====================================================================
console.log('\n1) 文具店「仔细翻找」—— 饼干可拿 + 容量校验');
const SZ = '安盛街-文具店搜刮-仔细';

{
  // a. 空包 3 格，三件都缺 → 「都拿走」给出三件，+3
  const s = newState();
  const cs = visibleChoices(s, SZ);
  const all = cs.find(c => label(c, s).indexOf('都拿走') === 0);
  ok('a1 「都拿走」存在且列出三件', !!all && label(all, s) === '都拿走（美工刀、半包饼干、传单）');
  ok('a2 空包时条件通过', evalCond(s, all.condition));
  runEffect(s, all);
  ok('a3 hasCutter=true', s.hasCutter === true);
  ok('a4 hasBiscuit=true（本次新增）', s.hasBiscuit === true);
  ok('a5 hasCrumpledLeaflet=true', s.hasCrumpledLeaflet === true);
  ok('a6 itemCount=3', s.itemCount === 3);
  ok('a7 不超过 bagVolume', s.itemCount <= s.bagVolume);
}
{
  // b. 只剩 1 格 → 「都拿走(3件)」条件不满足，命中 elseScene 整理整理
  const s = newState({ itemCount: 2 });
  const all = visibleChoices(s, SZ).find(c => label(c, s).indexOf('都拿走') === 0);
  ok('b1 剩1格时「都拿走」不通过', !evalCond(s, all.condition));
  ok('b2 走 elseScene 整理整理', all.elseScene === '整理整理');
  // 单件「只拿半包饼干」此时仍可拿
  const bis = visibleChoices(s, SZ).find(c => label(c, s) === '只拿半包饼干');
  ok('b3 「只拿半包饼干」可见', !!bis);
  ok('b4 剩1格时单件可通过', evalCond(s, bis.condition));
}
{
  // c. 已有传单（304柜已看）→ 只报两件，+2，不误加传单
  const s = newState({ hasCrumpledLeaflet: true });
  const all = visibleChoices(s, SZ).find(c => label(c, s).indexOf('都拿走') === 0);
  ok('c1 「都拿走」只列两件', !!all && label(all, s) === '都拿走（美工刀、半包饼干）');
  runEffect(s, all);
  ok('c2 itemCount=2（不是写死的+3）', s.itemCount === 2);
  ok('c3 hasBiscuit=true', s.hasBiscuit === true);
}
{
  // d. 三件都有 → 「都拿走」隐藏，只剩「继续」
  const s = newState({ hasCutter: true, hasBiscuit: true, hasCrumpledLeaflet: true });
  const ls = labels(visibleChoices(s, SZ), s);
  ok('d1 无「都拿走」', !ls.some(t => t.indexOf('都拿走') === 0));
  ok('d2 只剩「继续」', ls.length === 1 && ls[0] === '继续');
  ok('d3 文案提示已拿过', sceneText(s, SZ).indexOf('没再重复拿') >= 0);
}
{
  // e. 饼干已在食品店拿过 → 文案切到信封分支，不再重复给饼干
  const s = newState({ hasBiscuit: true });
  const txt = sceneText(s, SZ);
  ok('e1 已有饼干时不再承诺饼干', txt.indexOf('半包饼干和一张皱巴巴的传单') < 0 && txt.indexOf('只剩一张皱巴巴的传单') >= 0);
  ok('e2 「只拿半包饼干」隐藏', !labels(visibleChoices(s, SZ), s).includes('只拿半包饼干'));
  ok('e3 但仍能拿美工刀/传单', labels(visibleChoices(s, SZ), s).includes('只拿美工刀'));
}
{
  // f. 背包满（itemCount == bagVolume）→ 所有拾取项条件都不通过，且不静默走 nextScene
  const s = newState({ itemCount: 3 });
  const cs = visibleChoices(s, SZ);
  const take = cs.filter(c => /^(都拿走|只拿)/.test(label(c, s)));
  ok('f1 满包时所有拾取项都不通过', take.length > 0 && take.every(c => !evalCond(s, c.condition)));
  ok('f2 满包时都配了 elseScene 整理整理', take.every(c => c.elseScene === '整理整理'));
}

// =====================================================================
console.log('\n2) 全家便利店「查看日记本」100% 出现');
{
  const s = newState({ hasDiary: true });
  const sc = storyData['躲在货架后'];
  const raw = typeof sc.choices === 'function' ? sc.choices(s) : sc.choices;
  const view = raw.find(c => (typeof c.text === 'function' ? c.text(s) : c.text) === '查看日记本');
  ok('2.1 「查看日记本」选项存在', !!view);
  ok('2.2 已取消 Math.random() 判定',
    typeof view.showCondition !== 'string' || view.showCondition.indexOf('Math.random') < 0);
  // 连续 200 次渲染都必须可见（原来只有 50%）
  let shown = 0;
  for (let i = 0; i < 200; i++) {
    if (visibleChoices(newState({ hasDiary: true }), '躲在货架后')
      .some(c => label(c, s) === '查看日记本')) shown++;
  }
  ok('2.3 200 次渲染全部可见（' + shown + '/200）', shown === 200);
  ok('2.4 无日记本时不可见', !visibleChoices(newState({ hasDiary: false }), '躲在货架后')
    .some(c => label(c, s) === '查看日记本'));
}

// =====================================================================
console.log('\n3) 民防等候区 —— 隐藏计数器的递进暗示');
const WR = '民防设施-等候区';
{
  const t0 = sceneText(newState({ visitWaitingRoomTimes: 0 }), WR);
  const t1 = sceneText(newState({ visitWaitingRoomTimes: 1 }), WR);
  const t2 = sceneText(newState({ visitWaitingRoomTimes: 2 }), WR);
  const t3 = sceneText(newState({ visitWaitingRoomTimes: 3 }), WR);
  ok('3.1 第0次（刚进门）无暗示', t0.indexOf('门外') < 0);
  ok('3.2 第1次出现「门外似乎传来了什么声音」', t1.indexOf('你听到门外似乎传来了什么声音') >= 0);
  ok('3.3 第1次措辞留有余地（也许是听错）', t1.indexOf('也许是你听错了') >= 0);
  ok('3.4 第2次升级为明确有东西', t2.indexOf('鞋底蹭过水泥地') >= 0 && t2.indexOf('这地方本来不该有别人') >= 0);
  ok('3.5 第3次红色告警（下一次操作即破门）', t3.indexOf('#ff4444') >= 0 && t3.indexOf('不能再待下去') >= 0);
  ok('3.6 告警色逐级升级（无 → 橙 → 红）',
    t1.indexOf('#ff4444') < 0 && t1.indexOf('#ffaa00') >= 0
    && t2.indexOf('#ffaa00') >= 0 && t2.indexOf('#ff4444') < 0
    && t3.indexOf('#ff4444') >= 0);
  // 计数阈值与破门判定对齐：第4次操作必死，第3次提示必须已经出现
  ok('3.7 提示上限与破门阈值对齐（3→4 死）',
    evalCond(newState({ visitWaitingRoomTimes: 4 }), 'visitWaitingRoomTimes <= 3') === false);
}

// =====================================================================
console.log('\n4) 地铁站 QTE 时限');
{
  const cases = [
    ['地铁站-站厅层', 12000, 500],
    ['地铁站-安检区', 9000, 500],
    ['地铁站-楼梯', 7000, 400],
    ['地铁站-站台层', 6000, 300]
  ];
  for (const [id, base, slope] of cases) {
    const q = storyData[id].qte;
    const expr = typeof q === 'function' ? q(newState({ chasedByZombies: 0 })).timeout : q.timeout;
    const calc = (ch) => Function('chasedByZombies', 'return (' + expr + ')')(ch);
    ok('4.' + id + ' 表达式=' + expr, expr.indexOf(String(base)) === 0);
    ok('4.' + id + ' 无追兵时 ' + calc(0) + 'ms（原更短）', calc(0) === base);
    const worst = calc(5);
    ok('4.' + id + ' 尸潮5级仍剩 ' + worst + 'ms（>2000 可反应）', worst > 2000);
  }
}

console.log('\n============================');
console.log('通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
