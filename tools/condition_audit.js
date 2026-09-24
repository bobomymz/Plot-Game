// 全量条件表达式审计：覆盖 choices / onEnter / _globalTriggers / _reactive 等所有位置
// 目的：找出「引用了既不在 _variables、也不是 _reactive.computed 派生」的标识符
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
// 引擎全局 UI 函数桩：这些在 engine.js 里定义，剧情文件调用它们属于正常用法
sandbox.flashStatusWarning = function () {};
sandbox.flashStatus = function () {};
sandbox.showToast = function () {};
sandbox.notify = function () {};
// 场景抖动：engine.js:242 定义的一次性动画全局函数（onEnter 内调用属正常用法）
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

function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const state = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const computed = (sd._reactive && sd._reactive.computed) || {};
for (const key of Object.keys(computed)) {
  const e = computed[key];
  try { state[key] = typeof e === 'function' ? e(state) : new Function(...Object.keys(state), 'return (' + e + ');')(...Object.values(state)); } catch (_) {}
}
const known = new Set([...Object.keys(state), 'Math', 'JSON', 'Object', 'Array', 'Set', 'Date', 'Number', 'String', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity']);

const errs = [];
// 收集所有字符串型条件表达式
const exprCollector = []; // { where, expr }
function tryEval(expr, where) {
  if (typeof expr !== 'string' || !expr.trim()) return;
  try {
    new Function(...Object.keys(state), 'return Boolean(' + expr + ');')(...Object.values(state));
  } catch (e) {
    const m = /(\w+) is not defined/.exec(e.message);
    errs.push({ where, expr, name: m ? m[1] : null, msg: e.message });
  }
}

for (const key of Object.keys(sd)) {
  if (key === '_variables' || key === '_caps' || key === '_display') continue;
  const node = sd[key];

  if (key === '_globalTriggers') {
    if (Array.isArray(node)) for (const t of node) {
      if (t && t.condition !== undefined) tryEval(t.condition, '_globalTriggers.condition');
      if (t && typeof t.effect === 'object' && t.effect && t.effect.condition !== undefined) tryEval(t.effect.condition, '_globalTriggers.effect.condition');
    }
    continue;
  }
  if (key === '_reactive') {
    if (node.rules) for (const r of node.rules) {
      if (r && r.condition !== undefined && typeof r.condition === 'string') tryEval(r.condition, '_reactive.rules[' + r.id + '].condition');
    }
    continue;
  }
  if (typeof node !== 'object' || node === null) continue;

  // scene.onEnter 对象式 condition
  if (node.onEnter && typeof node.onEnter === 'object' && node.onEnter.condition !== undefined) {
    tryEval(node.onEnter.condition, key + '.onEnter.condition');
  }
  if (Array.isArray(node.choices)) {
    node.choices.forEach((c, i) => {
      if (!c || typeof c !== 'object') return;
      if (c.showCondition !== undefined) tryEval(c.showCondition, key + '.choices[' + i + '].showCondition');
      if (c.condition !== undefined) tryEval(c.condition, key + '.choices[' + i + '].condition');
    });
  }
  // 触发器 / 跳转表等其他含 condition 的结构
  for (const f of ['triggers', 'globalTriggers', 'redirects']) {
    if (Array.isArray(node[f])) for (const t of node[f]) {
      if (t && t.condition !== undefined) tryEval(t.condition, key + '.' + f + '.condition');
    }
  }
}

console.log('=== 条件表达式求值失败：', errs.length, '处 ===');
const byName = {};
for (const e of errs) {
  const n = e.name || '（其他）';
  (byName[n] = byName[n] || []).push(e);
}
for (const n of Object.keys(byName).sort()) {
  const inVars = n in sd._variables;
  const inComputed = Object.keys(computed).includes(n);
  console.log('\n【' + n + '】 出现 ' + byName[n].length + ' 次 | 在_variables=' + inVars + ' 在computed=' + inComputed + ' 在known=' + known.has(n));
  for (const e of byName[n]) console.log('    ' + e.where + '  →  ' + e.expr);
}
// ========== 附加检查：text / onEnter / effect 函数体内引用的变量是否已声明 ==========
// 做法：把每个函数在真实 state 上调用一次，捕获 ReferenceError
const fnErrs = [];
function probeFn(fn, where) {
  if (typeof fn !== 'function') return;
  try {
    const r = fn(state);
    // onEnter 可能返回 { set: { 未声明变量: ... } }
    if (r && typeof r === 'object') {
      for (const bucket of ['set', 'add', 'mul']) {
        if (r[bucket]) for (const k of Object.keys(r[bucket])) {
          if (!(k in state) && !known.has(k)) fnErrs.push({ where, name: k, msg: '写入未声明变量（' + bucket + '）' });
        }
      }
    }
  } catch (e) {
    const m = /(\w+) is not defined/.exec(e.message);
    fnErrs.push({ where, name: m ? m[1] : null, msg: e.message });
  }
}

for (const key of Object.keys(sd)) {
  if (key.startsWith('_')) continue;
  const node = sd[key];
  if (typeof node !== 'object' || node === null) continue;
  probeFn(node.text, key + '.text');
  if (typeof node.onEnter === 'function') probeFn(node.onEnter, key + '.onEnter');
  if (Array.isArray(node.choices)) node.choices.forEach((c, i) => {
    if (!c) return;
    probeFn(c.text, key + '.choices[' + i + '].text');
    probeFn(c.effect, key + '.choices[' + i + '].effect');
    probeFn(c.onPick, key + '.choices[' + i + '].onPick');
  });
}
const uniq = {};
for (const e of fnErrs) { const k = (e.name || '?') + ' @ ' + e.where; uniq[k] = e; }
console.log('\n=== 函数体/写入未声明变量问题：' + Object.keys(uniq).length + ' 处 ===');
Object.values(uniq).forEach(e => console.log('    ' + e.where + '  →  ' + e.msg));
if (!Object.keys(uniq).length) console.log('（无）');
