#!/usr/bin/env node
// -*- coding: utf-8 -*-
// 「三林安居苑-7号楼-401」半箱泡面改造自测。
// 改造：原「收下补给先吃一顿（体力+5，一次性）」→「可拿取，最多 3 包」，复用 instantNoodle 变量。
// 迷你引擎忠实复刻 engine.js 的 renderChoices / checkCondition / applyEffect / interpolateDisplay 语义。
// 验证：
//   ① 新开局 _flat401NoodleLeft = 3，401 屋里可见拿取选项
//   ② 连拿 3 包：instantNoodle / itemCount 同步 +1，世界库存递减，拿空后 _flat401 → 2
//   ③ 拿空后选项消失、屋内文案切「搬空了」
//   ④ 4 楼走廊文案按 _flat401 三态分流（0 未破 / 1 有剩 / 2 搬空）
//   ⑤ 背包满走 elseScene（整理整理）→ **不执行选项 effect**（engine.js:875 实测），
//      故返回点由入口场景 onEnter 预设；整理出口插值后必须落在拿取节点
//   ⑥ 旧档迁移 _flat401>=2 ⇒ _flat401NoodleLeft=0（与 engine.js 同源校验 + 顺序断言）
//   ⑦ 拿取节点文案（还剩 N 包 / 最后一包）
// 用法：node tools/flat401_noodle_selftest.js
"use strict";
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [];
try { for (const f of require('./story_files').list()) FILES.push(f); }
catch (e) { console.warn('[FILES] 回退失败：' + e.message); process.exit(1); }

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
  if (!fs.existsSync(abs)) continue;
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.error('加载失败', f, e.message); process.exit(1); }
}
const sd = vm.runInContext('storyData', sandbox);
const CAPS = sd._caps || {};

// ---- 迷你引擎（与 noodle_stack_selftest 同源） ----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const BASE = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const DISPLAY = sd._display || {};

function injectComputed(st) {
  const computed = (sd._reactive && sd._reactive.computed) || {};
  for (const key of Object.keys(computed)) {
    const e = computed[key];
    try {
      st[key] = typeof e === 'function' ? e(st)
        : new Function(...Object.keys(st), 'return (' + e + ');')(...Object.values(st));
    } catch (_) {}
  }
  return st;
}
function newState(patch) {
  const st = JSON.parse(JSON.stringify(BASE, setReplacer), setReviver);
  st._visit = st._visit || {};
  Object.assign(st, patch || {});
  return injectComputed(st);
}
function clampAll(st) {
  for (const k in CAPS) {
    const c = CAPS[k];
    if (c.min !== undefined && st[k] < c.min) st[k] = c.min;
    if (c.max !== undefined && st[k] > c.max) st[k] = c.max;
  }
}
function applyEffect(effect, st) {
  if (typeof effect === 'function') effect = effect(st);
  if (!effect) return;
  if (effect.set) for (const k in effect.set) st[k] = effect.set[k];
  if (effect.add) for (const k in effect.add) {
    if (st[k] === undefined) st[k] = effect.add[k]; else st[k] += effect.add[k];
  }
  if (effect.mul) for (const k in effect.mul) {
    if (st[k] === undefined) st[k] = effect.mul[k]; else st[k] *= effect.mul[k];
  }
  clampAll(st);
  injectComputed(st);
}
function checkCondition(cond, st) {
  if (cond == null || cond === true) return true;
  if (typeof cond === 'function') return cond(st);
  if (typeof cond === 'string') {
    try { return new Function(...Object.keys(st), 'return Boolean(' + cond + ');')(...Object.values(st)); }
    catch (e) { return false; }
  }
  return true;
}
function interpolate(text, st) {
  return String(text).replace(/\{(\w+)\}/g, function (m, key) {
    const v = st[key];
    if (v === undefined) return m;
    return DISPLAY[key] ? DISPLAY[key](v) : v;
  });
}
function enter(id, st) {
  const node = sd[id];
  if (!node) throw new Error('场景不存在: ' + id);
  st._visit[id] = (st._visit[id] || 0) + 1;
  if (node.onEnter) applyEffect(node.onEnter, st);
  return node;
}
function renderChoices(id, st) {
  const node = sd[id];
  let list = node.choices;
  if (typeof list === 'function') list = list(st);
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    if (c.showCondition && !checkCondition(c.showCondition, st)) continue;
    const met = checkCondition(c.condition, st);
    if (!met && !c.elseScene) continue;
    const raw = typeof c.text === 'function' ? c.text(st) : (c.text || '');
    out.push({ choice: c, text: interpolate(raw, st), met });
  }
  return out;
}
function resolveTarget(t, st) { return typeof t === 'function' ? t(st) : t; }
// 忠实复刻 engine.js:875 createChoiceButton：elseScene 分支【不执行 effect】
function click(id, st, text) {
  const list = renderChoices(id, st);
  const hit = list.find(x => x.text === text);
  if (!hit) throw new Error('场景 ' + id + ' 找不到可点选项「' + text + '」，当前可见：' + JSON.stringify(list.map(x => x.text)));
  const c = hit.choice;
  const met = checkCondition(c.condition, st);
  if (met) {
    if (c.effect) applyEffect(c.effect, st);
    return resolveTarget(c.nextScene, st);
  }
  return resolveTarget(c.elseScene, st) || resolveTarget(c.nextScene, st);
}
function textOf(id, st) {
  const t = sd[id].text;
  return interpolate(typeof t === 'function' ? t(st) : (Array.isArray(t) ? t.join('\n') : t), st);
}
function has(st, id, text) { return renderChoices(id, st).some(x => x.text === text); }
function hasRe(st, id, re) { return renderChoices(id, st).some(x => re.test(x.text)); }

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.error('  FAIL ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}

const ROOM = '三林安居苑-7号楼-401';
const PICK = '三林安居苑-7号楼-401-拿泡面';
const CORRIDOR = '三林安居苑-7号楼-4楼';
const pick3 = '拿走一包泡面（还剩 3 包）';

console.log('== S1 新开局：401 半箱泡面可拿取（最多 3 包） ==');
{
  const st = newState({ itemCount: 0 });
  enter(ROOM, st);
  ok('新开局 _flat401NoodleLeft = 3', st._flat401NoodleLeft === 3, st._flat401NoodleLeft);
  ok('新开局 _flat401 = 0（未破门）', st._flat401 === 0, st._flat401);
  ok('401 屋里可见「拿走一包泡面（还剩 3 包）」', has(st, ROOM, pick3));
  ok('401 文案写明还剩 3 包', /那半箱泡面还剩 3 包/.test(String(textOf(ROOM, st))), textOf(ROOM, st));
  ok('不再有旧选项「收下墙角的补给，先踏踏实实吃一顿」', !hasRe(st, ROOM, /踏踏实实吃一顿/));
}

console.log('== S2 连拿 3 包：变量 / 占格 / 世界库存同步 ==');
{
  let st = newState({ itemCount: 0 });
  enter(ROOM, st);
  for (let i = 1; i <= 3; i++) {
    const label = '拿走一包泡面（还剩 ' + (4 - i) + ' 包）';
    const dest = click(ROOM, st, label);
    ok('第' + i + '次拿取 → 拿泡面节点', dest === PICK, dest);
    enter(dest, st);
    ok('第' + i + '次：instantNoodle = ' + i, st.instantNoodle === i, st.instantNoodle);
    ok('第' + i + '次：itemCount = ' + i + '（每包占 1 格）', st.itemCount === i, st.itemCount);
    ok('第' + i + '次：_flat401NoodleLeft = ' + (3 - i), st._flat401NoodleLeft === 3 - i, st._flat401NoodleLeft);
    if (i < 3) {
      ok('第' + i + '次：节点文案写明箱内剩余', new RegExp('还剩 ' + (3 - i) + ' 包').test(String(textOf(PICK, st))), textOf(PICK, st));
    } else {
      ok('第3次：节点文案写明最后一包', /最后一包/.test(String(textOf(PICK, st))), textOf(PICK, st));
      ok('第3次（拿空）：_flat401 → 2', st._flat401 === 2, st._flat401);
    }
    enter(ROOM, st);
  }
  ok('拿空后 401 不再显示拿取选项', !hasRe(st, ROOM, /拿走一包泡面/));
  ok('拿空后 401 文案切「搬空了」', /已经被你搬空了/.test(String(textOf(ROOM, st))), textOf(ROOM, st));
}

console.log('== S3 4 楼走廊文案按 _flat401 三态分流 ==');
{
  const st0 = newState({ _flat401: 0 });
  ok('未破门：走廊写「里面没有任何动静」', /没有任何动静/.test(String(textOf(CORRIDOR, st0))));

  const st1 = newState({ _flat401: 1 });
  ok('已破未取空：走廊写「还有些你没能带走的东西」', /还有些你没能带走的东西/.test(String(textOf(CORRIDOR, st1))), textOf(CORRIDOR, st1));

  const st2 = newState({ _flat401: 2 });
  ok('已搬空：走廊写「已经被你搬空了」', /已经被你搬空了/.test(String(textOf(CORRIDOR, st2))), textOf(CORRIDOR, st2));
  ok('已搬空：走廊仍可「走进401」', has(st2, CORRIDOR, '走进401'));
}

console.log('== S4 背包满：走 elseScene，返回点由入口场景 onEnter 预设 ==');
{
  const st = newState({ itemCount: 3, _bagTier: 0, _bagExtra: 0 }); // bagVolume = 3
  enter(ROOM, st);
  ok('入口 onEnter 已预设返回点 = 拿取节点', st.positionAfterOperation === PICK, st.positionAfterOperation);
  ok('背包满时拿取选项仍渲染（有 elseScene）', hasRe(st, ROOM, /拿走一包泡面/));

  const dest = click(ROOM, st, pick3);
  ok('背包满 → elseScene 整理整理', dest === '整理整理', dest);
  ok('背包满：instantNoodle 不变', st.instantNoodle === 0, st.instantNoodle);
  ok('背包满：itemCount 不变（不凭空占格）', st.itemCount === 3, st.itemCount);
  ok('背包满：世界库存不变', st._flat401NoodleLeft === 3, st._flat401NoodleLeft);

  // 整理整理出口：{positionAfterOperation} 插值后必须落在拿取节点（否则玩家被传送/死链）
  const exit = renderChoices('整理整理', st).find(x => x.text === '×');
  ok('整理整理有出口选项「×」', !!exit);
  const target = exit ? String(exit.choice.nextScene).replace(/\{(\w+)\}/g, (m, k) => st[k]) : '';
  ok('整理完 → 拿取节点（完成这一次拾取）', target === PICK, target);

  // 整理后腾出空间 → 进拿取节点确实拿到
  st.itemCount = 2;
  enter(PICK, st);
  ok('整理后进拿取节点：instantNoodle 0 → 1', st.instantNoodle === 1, st.instantNoodle);
  ok('整理后进拿取节点：世界库存 3 → 2', st._flat401NoodleLeft === 2, st._flat401NoodleLeft);
  ok('整理后进拿取节点：itemCount 2 → 3', st.itemCount === 3, st.itemCount);
}

console.log('== S5 旧档迁移：_flat401>=2 ⇒ _flat401NoodleLeft=0 ==');
{
  const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const iMig = engineSrc.indexOf('state._flat401NoodleLeft = (state._flat401 >= 2)');
  const iLoop = engineSrc.indexOf('for (const key in defs)');
  ok('engine.js 存在 401 泡面迁移块', iMig > 0);
  // 顺序反了迁移就是死代码（补默认值会先把它填成初值 3）
  ok('迁移排在「补默认值」循环之前（否则是死代码）', iMig > 0 && iLoop > 0 && iMig < iLoop, { iMig, iLoop });

  function migrate(state) {
    const defs = sd._variables || {};
    if (!("_flat401NoodleLeft" in state)) {
      state._flat401NoodleLeft = (state._flat401 >= 2) ? 0 : 3;
    }
    for (const key in defs) if (!(key in state)) state[key] = JSON.parse(JSON.stringify(defs[key], setReplacer), setReviver);
    return state;
  }
  const ate = migrate({ _flat401: 2, itemCount: 4 });
  ok('旧档已吃过（_flat401=2）→ 库存补 0（不凭空冒出 3 包）', ate._flat401NoodleLeft === 0, ate._flat401NoodleLeft);

  const broke = migrate({ _flat401: 1, itemCount: 0 });
  ok('旧档已破门未取（_flat401=1）→ 库存补满 3', broke._flat401NoodleLeft === 3, broke._flat401NoodleLeft);

  const fresh = migrate({ _flat401: 0 });
  ok('旧档未破门（_flat401=0）→ 库存补满 3', fresh._flat401NoodleLeft === 3, fresh._flat401NoodleLeft);

  const noKey = migrate({});
  ok('完全旧档（无 _flat401）→ 库存补满 3（undefined>=2 为假）', noKey._flat401NoodleLeft === 3, noKey._flat401NoodleLeft);

  const newSave = migrate({ _flat401: 2, _flat401NoodleLeft: 1 });
  ok('新档已有 _flat401NoodleLeft 时不被迁移覆盖', newSave._flat401NoodleLeft === 1, newSave._flat401NoodleLeft);
}

console.log('== S6 与既有泡面体系的关系 ==');
{
  const vars = sd._variables || {};
  ok('_variables 声明 _flat401NoodleLeft 且初值 3', vars._flat401NoodleLeft === 3, vars._flat401NoodleLeft);

  // 401 与全家共用 instantNoodle 变量（同一物品），401 是第二个来源、不消耗全家世界库存
  const st = newState({ itemCount: 0 });
  enter(ROOM, st);
  const dest = click(ROOM, st, pick3);
  enter(dest, st);
  ok('401 拿取走 instantNoodle（与全家泡面同物）', st.instantNoodle === 1, st.instantNoodle);
  ok('401 拿取不扣全家世界库存（两处库存独立）', st.familyMartNoodleLeft === 3, st.familyMartNoodleLeft);

  const gifts = vm.runInContext('FOOD_GIFTS', sandbox);
  ok('FOOD_GIFTS 含 instantNoodle（401 泡面同样可送出/吃掉）',
    gifts.map(x => x[0]).indexOf('instantNoodle') >= 0);
}

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
