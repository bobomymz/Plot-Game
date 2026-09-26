// 休息节点 · 整理背包入口 自检
//   验证本次改造的两条不变量（可重跑，别靠肉眼）：
//   ① 每个休息节点都有「🎒整理一下物品」入口，且它 set 的 positionAfterOperation = 本场景 ID
//      （否则从整理整理退出会掉进别处/空场景）
//   ② 从整理整理返回时 onEnter 不再重复结算：时间不推进、尸潮不重复甩、NPC 口粮次数不重复消耗、
//      过夜不重复跳天；且 _restTidyReturn 被清掉，下一次正常进入仍照常结算。
// 用法： node tools/rest_tidy_selftest.js
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = process.cwd();
const FILES = require('./story_files').list();

const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake'].forEach(k => sandbox[k] = function () {});
sandbox.Math.random = () => 0.5;                 // 固定随机数，保证可复现（lint 同款做法）
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log('缺失:', f); continue; }
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.log('执行失败', f, e.message); }
}
const sd = vm.runInContext('storyData', sandbox);

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}

// ---------- 迷你 applyEffect（复刻 engine.js 的 set/add/mul） ----------
function applyEffect(state, eff) {
  if (!eff || typeof eff !== 'object') return;
  for (const k of ['set', 'add', 'mul']) {
    const part = eff[k];
    if (!part) continue;
    for (const key in part) {
      if (k === 'set') state[key] = part[key];
      else if (k === 'add') { if (state[key] === undefined) state[key] = 0; state[key] += part[key]; }
      else if (k === 'mul') state[key] = (state[key] || 0) * part[key];
    }
  }
}
// 进入场景：跑 onEnter（函数式取返回值），再应用返回的 effect
function enter(id, state) {
  const sc = sd[id];
  const eff = typeof sc.onEnter === 'function' ? sc.onEnter(state) : sc.onEnter;
  applyEffect(state, eff);
}
function totalMin(s) { return s.dd * 1440 + s.hh * 60 + s.mm; }
function baseState() {
  const s = JSON.parse(JSON.stringify(sd._variables));
  s.itemCount = 2; s.strength = 0; s.chasedByZombies = 3; s.hh = 10; s.mm = 0; s.dd = 1;
  s._visit = {}; s._restTidyReturn = false; s._zhaoGuangchengFoodGiven = 0;
  s.positionAfterOperation = '';
  // 派生量（bagVolume 等）按需注入，避免 ReferenceError
  const computed = (sd._reactive && sd._reactive.computed) || {};
  for (const key in computed) {
    const e = computed[key];
    try { s[key] = typeof e === 'function' ? e(s) : null; } catch (_) {}
  }
  return s;
}
// 取休息场景的整理入口（choices 可能是函数）
function tidyChoiceOf(id, state) {
  const sc = sd[id];
  const cs = typeof sc.choices === 'function' ? sc.choices(state) : sc.choices;
  return (cs || []).find(c => c && c.nextScene === '整理整理') || null;
}

// ---------- 收集休息节点（源码含 restRecover 的顶层场景） ----------
const SCENE_DEF = /^ {2}"([^"]+)":\s*\{/;
const restScenes = [];
for (const f of FILES) {
  const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/);
  let cur = null;
  lines.forEach(ln => {
    const m = ln.match(SCENE_DEF);
    if (m) { cur = m[1]; return; }
    if (/restRecover\s*\(/.test(ln) && cur && !restScenes.includes(cur)) restScenes.push(cur);
  });
}

console.log('===== 休息节点整理入口自检（共 ' + restScenes.length + ' 个休息节点）=====\n');

console.log('--- S1 入口存在性 + positionAfterOperation 指向本场景 ---');
for (const id of restScenes) {
  const s = baseState();
  const c = tidyChoiceOf(id, s);
  if (!c) { ok(id + ' 有整理入口', false, '未找到 nextScene:"整理整理" 的选项'); continue; }
  applyEffect(s, typeof c.effect === 'function' ? c.effect(s) : c.effect);
  ok(id + ' 整理入口 → positionAfterOperation 指回本场景',
     s.positionAfterOperation === id, '实际=' + s.positionAfterOperation);
}

console.log('\n--- S2 从整理返回：onEnter 不重复结算（时间/尸潮/口粮次数/天数）---');
for (const id of restScenes) {
  const s = baseState();
  const before = { min: totalMin(s), ch: s.chasedByZombies, food: s._zhaoGuangchengFoodGiven, dd: s.dd };
  // 模拟：点整理入口 → 进整理整理 → 点「不丢，谢谢」回到本场景（引擎会跑一次 onEnter）
  s._restTidyReturn = true;
  enter(id, s);
  ok(id + ' 返回时时间不推进',
     totalMin(s) === before.min, before.min + ' → ' + totalMin(s));
  ok(id + ' 返回时尸潮不重复甩',
     s.chasedByZombies === before.ch, before.ch + ' → ' + s.chasedByZombies);
  ok(id + ' 返回时不重复消耗赵广成口粮次数',
     s._zhaoGuangchengFoodGiven === before.food, before.food + ' → ' + s._zhaoGuangchengFoodGiven);
  ok(id + ' 返回时不重复跳天', s.dd === before.dd, before.dd + ' → ' + s.dd);
  ok(id + ' 返回后 _restTidyReturn 已清零', s._restTidyReturn === false);
}

console.log('\n--- S3 标记清零后：正常再次进入仍照常结算（守卫不能吃掉正常收益）---');
let recovered = 0;
for (const id of restScenes) {
  const s = baseState();
  s._restTidyReturn = false;
  const before = totalMin(s);
  enter(id, s);
  const moved = totalMin(s) - before;
  const gotStrength = s.strength > 0;   // 初始 strength=0，restRecover 会给
  ok(id + ' 正常进入仍结算（时间+' + moved + ' 体力+' + (s.strength) + '）', gotStrength);
  if (gotStrength) recovered++;
}

console.log('\n--- S5 对照组：A 类节点（onEnter 含 updateTime）若不守卫，返回必然重复推进时间 ---');
// 防假绿：S2 的"时间不推进"若在这些节点上本来就成立（没写 updateTime），S2 就是白测。
// 这里断言：这些节点【正常进入】确实会推进时间 ⇒ S2 的 0 推进真的是守卫拦下来的。
for (const id of restScenes) {
  const sc = sd[id];
  const src = (sc.onEnter && typeof sc.onEnter === 'function') ? sc.onEnter.toString() : '';
  if (!/updateTime\s*\(/.test(src)) continue;    // 非 A 类，跳过
  const s = baseState();
  s._restTidyReturn = false;
  const before = totalMin(s);
  enter(id, s);
  ok(id + ' [A类] 无标记进入会推进时间（对照组）', totalMin(s) > before, '+' + (totalMin(s) - before) + ' 分钟');
}

console.log('\n--- S4 整理整理自身出口健康 ---');
const zz = sd['整理整理'];
const zzChoices = typeof zz.choices === 'function' ? zz.choices(baseState()) : zz.choices;
const exit = zzChoices.find(c => c.nextScene === '{positionAfterOperation}');
ok('整理整理有 {positionAfterOperation} 出口', !!exit);
ok('出口文案为「不丢，谢谢」', !!exit && exit.text === '不丢，谢谢', exit && exit.text);

console.log('\n===== 结果：' + pass + ' 通过 / ' + fail + ' 失败 =====');
process.exit(fail ? 1 : 0);
