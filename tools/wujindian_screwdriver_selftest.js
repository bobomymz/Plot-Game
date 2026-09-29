#!/usr/bin/env node
// -*- coding: utf-8 -*-
// 「五金店 · 侧窗工具区」螺丝刀改造自测（2026-09-29）。
// 缘起：螺丝刀全图原本只在建平（老吴杂物室 / 5F 物理实验室锁柜，均需钥匙串）；
//   在五金店侧窗翻进去的工具区补一个更早、更近的来源；同时这条路线原本"只进不出"
//   （工具区两个选项都是死路），需补离开出口。
// 改动：
//   ① 「五金店-侧窗-探索」（工具区）新增「从墙上抽走一把螺丝刀」：!hasScrewdriver 门控，
//      复用既有 hasScrewdriver 布尔；背包满走 elseScene「整理整理」
//   ② 新增「五金店-侧窗-拿螺丝刀」节点：onEnter 给螺丝刀 + 占 1 格
//   ③ 工具区 + 侧窗落脚点各加"原路翻窗出去"出口 → 五金店门口
//   ④ 工具区 onEnter 改函数式：入口预设 positionAfterOperation（背包满返回点）
//      + _lastScene 折返守卫（防重复计时）；text 同步按 _lastScene 分流
//   ⑤ 「五金店」门口 text 加"从侧窗翻回来"的差异化描述
// 迷你引擎与 flat401_noodle_selftest 同源，忠实复刻 engine.js 的
// renderChoices / checkCondition / applyEffect / updateTime 语义。
// 用法：node tools/wujindian_screwdriver_selftest.js
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

// ---- 迷你引擎（与 flat401_noodle_selftest 同源） ----
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

const DOOR = '五金店';
const WINDOW = '五金店-侧窗';
const EXPLORE = '五金店-侧窗-探索';
const PICK = '五金店-侧窗-拿螺丝刀';
const PICK_LABEL = '从墙上抽走一把螺丝刀';
const LEAVE_LABEL = '屏住呼吸，原路翻窗退出去';
const LEAVE_LABEL_WIN = '心里发毛，趁早原路翻出去';

console.log('== S0 节点齐全 + 复用既有体系 ==');
{
  ok('场景表含新节点「五金店-侧窗-拿螺丝刀」', !!sd[PICK]);
  ok('拿取节点出口回工具区', !!sd[PICK] && sd[PICK].choices.some(c => c.nextScene === EXPLORE));
  ok('拿取节点 onEnter 是函数（updateTime 包装）', typeof sd[PICK].onEnter === 'function');
  ok('_variables 声明 hasScrewdriver 且初值 false', (sd._variables || {}).hasScrewdriver === false, (sd._variables || {}).hasScrewdriver);
  const drop = (sd['整理整理'].choices || []).some(c => c.showCondition === 'hasScrewdriver');
  ok('「整理整理」仍有"丢下螺丝刀"（复用同一变量）', drop);
}

console.log('== S1 无螺丝刀：工具区见拾取选项 ==');
{
  const st = newState({ itemCount: 0, weather: '阴' });
  enter(EXPLORE, st);
  ok('无螺丝刀：见「从墙上抽走一把螺丝刀」', has(st, EXPLORE, PICK_LABEL));
  ok('原有的推门 / 躲藏选项仍在', has(st, EXPLORE, '推开工具区的门看看') && has(st, EXPLORE, '躲进货架之间，从缝隙里观察'));
  ok('新增离开选项「原路翻窗退出去」', has(st, EXPLORE, LEAVE_LABEL));
  ok('无螺丝刀时工具区共 4 个选项', renderChoices(EXPLORE, st).length === 4, renderChoices(EXPLORE, st).map(x => x.text).length);
}

console.log('== S2 已有螺丝刀（建平拿过）：选项消失 ==');
{
  const st = newState({ hasScrewdriver: true, weather: '阴' });
  enter(EXPLORE, st);
  ok('已有螺丝刀：不见拾取选项', !has(st, EXPLORE, PICK_LABEL));
  ok('已有螺丝刀时工具区共 3 个选项', renderChoices(EXPLORE, st).length === 3, renderChoices(EXPLORE, st).map(x => x.text).length);
}

console.log('== S3 拾取：hasScrewdriver=true + 占 1 格 ==');
{
  const st = newState({ itemCount: 0, weather: '阴' });
  enter(EXPLORE, st);
  const dest = click(EXPLORE, st, PICK_LABEL);
  ok('点拾取 → 进入拿取节点', dest === PICK, dest);
  enter(dest, st);
  ok('拿取后 hasScrewdriver = true', st.hasScrewdriver === true);
  ok('拿取后 itemCount 0 → 1（占 1 格）', st.itemCount === 1, st.itemCount);
  ok('拿取节点文案写明"获得螺丝刀"', /获得螺丝刀/.test(String(textOf(PICK, st))), textOf(PICK, st));
  ok('拿取节点提示当前背包 {itemCount}/{bagVolume} 已插值', /\d+\s*\/\s*\d+/.test(String(textOf(PICK, st))), textOf(PICK, st));
}

console.log('== S4 工具区 text 按 _lastScene 分流 ==');
{
  const stA = newState({ weather: '阴' });
  stA._lastScene = WINDOW;
  enter(EXPLORE, stA);
  ok('从侧窗进来：播完整描述（含"突然听到门外传来声音"）', /突然听到门外传来声音/.test(String(textOf(EXPLORE, stA))), textOf(EXPLORE, stA));

  const stB = newState({ weather: '阴' });
  stB._lastScene = PICK;
  enter(EXPLORE, stB);
  ok('从拿取节点折返：不重播"突然听到声音"', !/突然听到门外传来声音/.test(String(textOf(EXPLORE, stB))), textOf(EXPLORE, stB));
  ok('从拿取节点折返：改用"退回工具区中央"', /退回工具区中央/.test(String(textOf(EXPLORE, stB))), textOf(EXPLORE, stB));
}

console.log('== S5 折返守卫：不重复计时 ==');
{
  // 首次进入（从侧窗来）：扣 2 分钟
  const stA = newState({ weather: '阴', mm: 10 });
  stA._lastScene = WINDOW;
  enter(EXPLORE, stA);
  ok('首次进入工具区：时间 +2 分钟', stA.mm === 12, stA.mm);

  // 从拿取节点折返：不扣时间
  const stB = newState({ weather: '阴', mm: 10 });
  stB._lastScene = PICK;
  enter(EXPLORE, stB);
  ok('从拿取节点折返：不重复扣时间', stB.mm === 10, stB.mm);
}

console.log('== S6 背包满：走 elseScene，返回点由入口预设 ==');
{
  const st = newState({ itemCount: 3, _bagTier: 0, _bagExtra: 0, weather: '阴' }); // bagVolume = 3
  enter(EXPLORE, st);
  ok('入口 onEnter 已预设返回点 = 拿取节点', st.positionAfterOperation === PICK, st.positionAfterOperation);
  ok('背包满时拾取选项仍渲染（有 elseScene）', has(st, EXPLORE, PICK_LABEL));

  const dest = click(EXPLORE, st, PICK_LABEL);
  ok('背包满 → elseScene 整理整理', dest === '整理整理', dest);
  ok('背包满：hasScrewdriver 不变', st.hasScrewdriver === false, st.hasScrewdriver);
  ok('背包满：itemCount 不变', st.itemCount === 3, st.itemCount);

  // 整理整理出口：{positionAfterOperation} 插值后必须落在拿取节点
  const exit = renderChoices('整理整理', st).find(x => x.text === '×');
  ok('整理整理有出口选项「×」', !!exit);
  const target = exit ? String(exit.choice.nextScene).replace(/\{(\w+)\}/g, (m, k) => st[k]) : '';
  ok('整理完 → 拿取节点（完成这一次拾取）', target === PICK, target);

  // 整理后腾出 1 格 → 进拿取节点确实拿到
  st.itemCount = 2;
  enter(PICK, st);
  ok('整理后进拿取节点：hasScrewdriver → true', st.hasScrewdriver === true);
  ok('整理后进拿取节点：itemCount 2 → 3', st.itemCount === 3, st.itemCount);
}

console.log('== S7 离开出口：两条「只进不出」都补上 ==');
{
  const st = newState({ weather: '阴' });
  enter(EXPLORE, st);
  const dest = click(EXPLORE, st, LEAVE_LABEL);
  ok('工具区「原路翻窗退出去」→ 五金店门口', dest === DOOR, dest);

  const st2 = newState({ weather: '阴' });
  enter(WINDOW, st2);
  ok('侧窗落脚点有「原路翻出去」出口', has(st2, WINDOW, LEAVE_LABEL_WIN));
  const dest2 = click(WINDOW, st2, LEAVE_LABEL_WIN);
  ok('侧窗「原路翻出去」→ 五金店门口', dest2 === DOOR, dest2);
  ok('侧窗仍可进工具区（原路径未动）', has(st2, WINDOW, '先看看墙上挂着什么工具'));
}

console.log('== S8 五金店门口：从侧窗翻回时用差异化描述 ==');
{
  const stA = newState({ weather: '阴' });
  stA._lastScene = EXPLORE;
  enter(DOOR, stA);
  ok('从工具区翻回：写"从侧窗翻出来"', /从侧窗翻出来/.test(String(textOf(DOOR, stA))), textOf(DOOR, stA));

  const stB = newState({ weather: '阴' });
  stB._lastScene = WINDOW;
  enter(DOOR, stB);
  ok('从侧窗落脚点翻出：同样写"从侧窗翻出来"', /从侧窗翻出来/.test(String(textOf(DOOR, stB))), textOf(DOOR, stB));

  const stC = newState({ weather: '阴' });
  stC._lastScene = '三林路-北侧';
  enter(DOOR, stC);
  ok('首次到达：仍播"你来到三林路上那家老五金店"', /你来到三林路上那家老五金店/.test(String(textOf(DOOR, stC))), textOf(DOOR, stC));
}

console.log('== S9 与建平螺丝刀的关系（同变量、同丢弃口径） ==');
{
  const st = newState({ itemCount: 0, weather: '阴' });
  enter(EXPLORE, st);
  enter(click(EXPLORE, st, PICK_LABEL), st);
  ok('五金店螺丝刀 = hasScrewdriver（与建平同物）', st.hasScrewdriver === true);
  ok('提取螺丝刀后 cuttingToolName 返回「螺丝刀」', vm.runInContext('cuttingToolName', sandbox)(st) === '螺丝刀');
}

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
