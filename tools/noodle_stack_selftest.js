#!/usr/bin/env node
// -*- coding: utf-8 -*-
// 泡面「可堆叠」改造自测：用迷你引擎（忠实复刻 engine.js 的 renderChoices / checkCondition /
// applyEffect / interpolateDisplay 语义）逐场景点击，验证：
//   ① 全家促销货架可重复拿取、每包占 1 格、世界库存递减到 0 后选项消失
//   ② 整理整理里吃/丢都是「扣 1 包」而不是清零，归零后两个选项都不再出现
//   ③ 背包满时走 elseScene（不凭空多占格）
//   ④ FOOD_GIFTS 口粮赠送对数字型口粮只扣 1 份（不再把计数置 false）
//   ⑤ 旧档 hasInstantNoodle(bool) → instantNoodle(包数) 的迁移（与 engine.js 同源校验，防漂移）
// 用法：node tools/noodle_stack_selftest.js
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

// ---- 迷你引擎 ----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const BASE = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const DISPLAY = sd._display || {};

// 派生变量（bagVolume 等在条件里直接用，静态状态里没有 → 必须先注入，否则假失败）
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
// 复刻 engine.js:796 interpolateDisplay（选项文本同样会插值）
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

console.log('== S1 全家促销货架：可连拿 3 包，每包占 1 格 ==');
{
  let st = newState({ itemCount: 0 });
  enter('全家便利店内部', st);
  ok('初始 instantNoodle = 0', st.instantNoodle === 0, st.instantNoodle);
  ok('初始货架库存 = 3', st.familyMartNoodleLeft === 3, st.familyMartNoodleLeft);
  ok('可见「拿一包泡面（货架上还剩 3 包）」', has(st, '全家便利店内部', '拿一包泡面（货架上还剩 3 包）'));

  for (let i = 1; i <= 3; i++) {
    const dest = click('全家便利店内部', st, '拿一包泡面（货架上还剩 ' + st.familyMartNoodleLeft + ' 包）');
    ok('第' + i + '次拿取 → 全家-拿泡面', dest === '全家-拿泡面', dest);
    enter(dest, st);
    ok('第' + i + '次：instantNoodle = ' + i, st.instantNoodle === i, st.instantNoodle);
    ok('第' + i + '次：itemCount 与包数一致（每包 1 格）', st.itemCount === i, st.itemCount);
    ok('第' + i + '次：货架库存 = ' + (3 - i), st.familyMartNoodleLeft === 3 - i, st.familyMartNoodleLeft);
    if (i < 3) {
      ok('第' + i + '次：文案写明货架剩余', /还剩2包|还剩1包|最后一包/.test(String(textOf(dest, st))), textOf(dest, st));
      enter('全家便利店内部', st);
      ok('第' + i + '次：拿取选项仍可见（不再限带 1 包）',
        has(st, '全家便利店内部', '拿一包泡面（货架上还剩 ' + st.familyMartNoodleLeft + ' 包）'));
      ok('第' + i + '次：店内文案提示包里已带 ' + i + ' 包',
        new RegExp('包里已经带了' + i + '包了').test(String(textOf('全家便利店内部', st))));
    } else {
      ok('第3次：文案写明最后一包', /最后一包/.test(String(textOf(dest, st))));
    }
  }

  enter('全家便利店内部', st);
  ok('库存耗尽后不再显示拿取选项', !hasRe(st, '全家便利店内部', /拿一包泡面/));
  ok('库存耗尽后文案切换为「已经空了」', /已经空了/.test(String(textOf('全家便利店内部', st))));
}

console.log('== S2 整理整理：吃/丢都只扣 1 包，归零后选项消失 ==');
{
  let st = newState({ instantNoodle: 2, itemCount: 5, strength: 3 });
  ok('可见「吃一包泡面（体力回满，2包）」', has(st, '整理整理', '吃一包泡面（体力回满，2包）'));
  ok('可见「丢一包泡面」', has(st, '整理整理', '丢一包泡面'));

  let dest = click('整理整理', st, '吃一包泡面（体力回满，2包）');
  ok('吃泡面 → 整理整理-吃泡面', dest === '整理整理-吃泡面', dest);
  enter(dest, st);
  ok('吃后：体力回满 10', st.strength === 10, st.strength);
  ok('吃后：instantNoodle 2 → 1（不是清零）', st.instantNoodle === 1, st.instantNoodle);
  ok('吃后：itemCount 5 → 4', st.itemCount === 4, st.itemCount);
  ok('吃后：选项文案更新为 1 包', has(st, '整理整理', '吃一包泡面（体力回满，1包）'));

  dest = click('整理整理', st, '丢一包泡面');
  ok('丢泡面 → 整理整理', dest === '整理整理', dest);
  ok('丢后：instantNoodle 1 → 0', st.instantNoodle === 0, st.instantNoodle);
  ok('丢后：itemCount 4 → 3', st.itemCount === 3, st.itemCount);
  ok('归零后不再显示吃泡面', !hasRe(st, '整理整理', /吃一包泡面/));
  ok('归零后不再显示丢泡面', !hasRe(st, '整理整理', /丢一包泡面/));

  // 丢弃 = 损失，不回货架（与维C一致）
  ok('丢弃不回补货架库存', st.familyMartNoodleLeft === 3, st.familyMartNoodleLeft);
}

console.log('== S3 背包满：走 elseScene，不凭空占格 ==');
{
  const st = newState({ itemCount: 3, _bagTier: 0, _bagExtra: 0 }); // bagVolume = 3
  enter('全家便利店内部', st);
  ok('背包满时拿取选项仍渲染（有 elseScene）', hasRe(st, '全家便利店内部', /拿一包泡面/));
  const dest = click('全家便利店内部', st, '拿一包泡面（货架上还剩 3 包）');
  ok('背包满 → elseScene 整理整理', dest === '整理整理', dest);
  ok('背包满：instantNoodle 不变', st.instantNoodle === 0, st.instantNoodle);
  ok('背包满：itemCount 不变', st.itemCount === 3, st.itemCount);
  // 返回点：拿取失败走 整理整理，整理完必须回店内而不是被传送到别处
  const back = renderChoices('整理整理', st).find(x => x.text === '不丢，谢谢');
  ok('背包满时整理整理有出口选项', !!back);
  const target = back ? String(back.choice.nextScene).replace(/\{(\w+)\}/g, (m, k) => st[k]) : '';
  ok('整理完返回点 = 全家便利店内部', target === '全家便利店内部', target);
}

console.log('== S4 口粮赠送：数字型口粮只扣 1 份 ==');
{
  const st = newState({ instantNoodle: 3, itemCount: 3 });
  enter('上实南校-图书馆-给食物-选择', st);
  ok('可见「给她方便面」', has(st, '上实南校-图书馆-给食物-选择', '给她方便面'));
  const dest = click('上实南校-图书馆-给食物-选择', st, '给她方便面');
  ok('给食物 → 上实南校-图书馆-给食物', dest === '上实南校-图书馆-给食物', dest);
  ok('给出 1 包：instantNoodle 3 → 2（不是清零 / 不是 false）', st.instantNoodle === 2, st.instantNoodle);
  ok('给出 1 包：itemCount 3 → 2', st.itemCount === 2, st.itemCount);

  // 布尔型口粮仍然整件给出（不被数字分支误伤）
  const st2 = newState({ hasBiscuit: true, itemCount: 1 });
  enter('上实南校-图书馆-给食物-选择', st2);
  ok('布尔口粮仍可见（压缩饼干）', has(st2, '上实南校-图书馆-给食物-选择', '给她压缩饼干'));
  click('上实南校-图书馆-给食物-选择', st2, '给她压缩饼干');
  ok('布尔口粮给出后置 false', st2.hasBiscuit === false, st2.hasBiscuit);
  ok('布尔口粮给出后 itemCount -1', st2.itemCount === 0, st2.itemCount);
}

console.log('== S5 旧档迁移：hasInstantNoodle(bool) → instantNoodle(包数) ==');
{
  // 与 engine.js 同源校验：源码里必须真有这段迁移，否则本节就是在测一个空壳
  const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const iMig = engineSrc.indexOf('state.instantNoodle = state.hasInstantNoodle');
  const iLoop = engineSrc.indexOf('for (const key in defs)');
  ok('engine.js 存在泡面迁移块', iMig > 0 && /if \("hasInstantNoodle" in state\)/.test(engineSrc));
  // 顺序反了迁移就是死代码（补默认值会先把 instantNoodle 填 0，迁移条件恒不成立）
  ok('迁移排在「补默认值」循环之前（否则是死代码）', iMig > 0 && iLoop > 0 && iMig < iLoop, { iMig, iLoop });

  // 复刻 fillMissingDefaults（engine.js:1346 起）——顺序必须一致：迁移在补默认值【之前】
  function migrate(state) {
    const defs = sd._variables || {};
    if ("hasInstantNoodle" in state) {
      if (!("instantNoodle" in state)) state.instantNoodle = state.hasInstantNoodle ? 1 : 0;
      delete state.hasInstantNoodle;
    }
    for (const key in defs) if (!(key in state)) state[key] = JSON.parse(JSON.stringify(defs[key], setReplacer), setReviver);
    return state;
  }
  const old1 = migrate({ hasInstantNoodle: true, itemCount: 4, strength: 6 });
  ok('旧档持 1 包 → instantNoodle = 1', old1.instantNoodle === 1, old1.instantNoodle);
  ok('旧档旧键已删除（不留两套真相）', !('hasInstantNoodle' in old1));
  ok('旧档新开局键集补齐（instantNoodle 在 _variables 里）', 'instantNoodle' in sd._variables);

  const old0 = migrate({ hasInstantNoodle: false, itemCount: 0 });
  ok('旧档无泡面 → instantNoodle = 0', old0.instantNoodle === 0, old0.instantNoodle);

  const fresh = migrate({ instantNoodle: 2, itemCount: 2 });
  ok('新档已有 instantNoodle 时不被覆盖', fresh.instantNoodle === 2, fresh.instantNoodle);

  // 迁移后能正常吃掉（走完整引擎语义）
  const st = injectComputed(old1);
  ok('迁移后进整理整理可见吃泡面', has(st, '整理整理', '吃一包泡面（体力回满，1包）'));
  const dest = click('整理整理', st, '吃一包泡面（体力回满，1包）');
  enter(dest, st);
  ok('迁移后吃泡面：包数归零 / 背包 -1 / 体力回满',
    st.instantNoodle === 0 && st.itemCount === 3 && st.strength === 10,
    JSON.stringify({ n: st.instantNoodle, ic: st.itemCount, s: st.strength }));
}

console.log('== S6 全库一致性：旧名已彻底退场 ==');
{
  const vars = sd._variables || {};
  ok('_variables 声明 instantNoodle 且初值 0', vars.instantNoodle === 0, vars.instantNoodle);
  ok('_variables 不再声明 hasInstantNoodle', !('hasInstantNoodle' in vars));

  const gifts = vm.runInContext('FOOD_GIFTS', sandbox);
  const flags = gifts.map(x => x[0]);
  ok('FOOD_GIFTS 用新名 instantNoodle', flags.indexOf('instantNoodle') >= 0, JSON.stringify(flags));
  ok('FOOD_GIFTS 不含旧名 hasInstantNoodle', flags.indexOf('hasInstantNoodle') < 0);

  let leftover = [];
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      if (/hasInstantNoodle/.test(line)) leftover.push(f + ':' + (i + 1));
    });
  }
  ok('story/ 全库无 hasInstantNoodle 残留（0 处）', leftover.length === 0, JSON.stringify(leftover));
}

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
