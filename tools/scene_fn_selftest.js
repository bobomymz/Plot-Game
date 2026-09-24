// 全库场景函数冒烟自测
// 覆盖 condition_audit.js 管不到的一类：**函数式** choices / text / condition / showCondition / nextScene / onEnter。
// 这些在引擎里是直接调用（不走 new Function 字符串求值），写错只会运行时炸、静态审计查不出来。
// 做法：vm 沙箱加载全部剧情文件 → 取 storyData → 用多组状态变体逐个调用函数，捕获异常；
//       并顺带校验字符串 nextScene/elseScene 是否指向存在的场景。
// 用法：node tools/scene_fn_selftest.js
"use strict";
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = process.cwd();
const FILES = [
  'story/utils.js', 'story/core.js', 'story/夜晚剧情.js',
  'story/东明街道/樱桃苑（初始小区）.js', 'story/东明街道/东明街道路径.js',
  'story/东明街道/长者食堂.js', 'story/东明街道/三林菜市场.js',
  'story/东明街道/东明社区图书馆.js', 'story/东明街道/地铁站.js',
  'story/东明街道/五金店.js', 'story/东明街道/益丰大药房.js',
  'story/东明街道/上实南校.js', 'story/东明街道/新达汇.js',
  'story/东明街道/新达汇地下车库.js', 'story/东明街道/全家和公交站.js',
  'story/东明街道/安盛街.js', 'story/东明街道/安居苑.js',
  'story/东明街道/金谊广场.js', 'story/东明街道/警察局.js',
  'story/东明街道/反派NPC.js', 'story/上海市区路径.js',
  'story/仁济南院.js', 'story/建平中学.js', 'story/复旦江湾.js', 'story/张江.js'
];

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

// ---- 基础状态（_variables 深拷贝 + 注入 computed 派生值）----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const base = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const computed = (sd._reactive && sd._reactive.computed) || {};
for (const key of Object.keys(computed)) {
  const e = computed[key];
  try {
    base[key] = typeof e === 'function'
      ? e(base)
      : new Function(...Object.keys(base), 'return (' + e + ');')(...Object.values(base));
  } catch (_) { base[key] = undefined; }
}
function clone(o) { return JSON.parse(JSON.stringify(o, setReplacer), setReviver); }

// ---- 状态变体 ----
const VARIANTS = [
  ['默认', {}],
  ['有满瓶水', { hasBottle: true, bottleWater: 1, waterToxic: false }],
  ['有空瓶', { hasBottle: true, bottleWater: 0, waterToxic: false }],
  ['有割/锯工具', { hasCutter: true }],
  ['有斧头+匕首', { hasAxe: true, hasDagger: true }],
  ['背包已满', { itemCount: 999, hasCutter: true, hasBottle: false }],
  ['追兵满+夜晚', { chasedByZombies: 5, hh: 22 }],
];

const sceneIds = Object.keys(sd).filter(k => k !== '_variables' && k !== '_caps' && k !== '_display' && k !== '_reactive' && k !== '_globalTriggers' && k !== '_input' && k !== '_sprintDest');
const sceneSet = new Set(sceneIds);

const errors = [];
const placeholders = /\{[^}]+\}/;
function isRef(v) { return typeof v === 'string' && v && !placeholders.test(v); }

let checked = { text: 0, choices: 0, cond: 0, onEnter: 0, next: 0 };

for (const id of sceneIds) {
  const node = sd[id];
  if (!node || typeof node !== 'object') continue;
  for (const [label, patch] of VARIANTS) {
    const st = clone(base);
    Object.assign(st, patch);
    const where = id + ' @' + label;

    // onEnter（函数式）
    if (typeof node.onEnter === 'function') {
      checked.onEnter++;
      try { node.onEnter(st); }
      catch (e) { errors.push(where + ' · onEnter: ' + e.message); }
    }
    // text（函数式）
    if (typeof node.text === 'function') {
      checked.text++;
      try { const r = node.text(st); if (r === undefined) errors.push(where + ' · text 返回 undefined'); }
      catch (e) { errors.push(where + ' · text: ' + e.message); }
    }
    // choices（函数式或数组）
    let list = node.choices;
    if (typeof list === 'function') {
      checked.choices++;
      try { list = list(st); }
      catch (e) { errors.push(where + ' · choices(): ' + e.message); continue; }
    }
    if (!Array.isArray(list)) continue;

    for (const c of list) {
      if (!c || typeof c !== 'object') continue;
      // 函数式 condition / showCondition
      for (const key of ['condition', 'showCondition']) {
        if (typeof c[key] === 'function') {
          checked.cond++;
          try { c[key](st); }
          catch (e) { errors.push(where + ' · 选项「' + (typeof c.text === 'string' ? c.text : '?') + '」.' + key + ': ' + e.message); }
        }
      }
      // 文本本身可能是函数
      if (typeof c.text === 'function') {
        checked.cond++;
        try { c.text(st); }
        catch (e) { errors.push(where + ' · choice.text(): ' + e.message); }
      }
      // 跳转目标校验（字符串、非占位符）
      for (const key of ['nextScene', 'elseScene']) {
        const v = c[key];
        if (typeof v === 'function') {
          checked.next++;
          try {
            const t = v(st);
            if (isRef(t) && !sceneSet.has(t)) errors.push(where + ' · ' + key + '() 返回不存在的场景：「' + t + '」');
          } catch (e) { errors.push(where + ' · ' + key + '(): ' + e.message); }
        } else if (isRef(v)) {
          checked.next++;
          if (!sceneSet.has(v)) errors.push(where + ' · ' + key + ' 指向不存在的场景：「' + v + '」');
        }
      }
    }
  }
}

// ---- 输出 ----
const uniq = [...new Set(errors)];
console.log('场景数:', sceneIds.length, '| 变体数:', VARIANTS.length);
console.log('调用统计: text %d / choices %d / 条件与选项文本 %d / onEnter %d / 跳转目标 %d',
  checked.text, checked.choices, checked.cond, checked.onEnter, checked.next);
console.log('');
if (!uniq.length) {
  console.log('=== 全部通过：0 处异常 ===');
  process.exit(0);
}
console.log('=== 异常 %d 处（去重后）===', uniq.length);
for (const e of uniq) console.log('  •', e);
process.exit(1);
