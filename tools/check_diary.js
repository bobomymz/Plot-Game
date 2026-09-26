/**
 * 日记本系统审计（2026-09-26）
 * 检查项：
 *   1. 全库裸调 xxxMemorySet.add( = 0（记忆获取必须走 gainMemory，否则不进日记本）
 *   2. gainMemory / addDiaryEvent 的 key 与 story/日记本.js 的 DIARY_ENTRIES 双向对齐
 *   3. DIARY_ENTRIES 正文不含 { }（text 函数返回值会做 {变量名} 插值）
 *   4. 日记场景存在性（5 个）+ 变量注册（_diaryLog/_diaryPage）
 *   5. 整理整理入口：「翻开日记本」存在且 showCondition=hasDiary；「丢下日记本」nextScene=整理整理-丢日记本
 *   6. 渲染冒烟：空本子 / 记忆落账 / 手写转义（HTML+花括号）/ 幂等 / 分页与翻页边界
 * 用法: node tools/check_diary.js
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

let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) { pass++; }
  else { fails.push(name + (detail ? ' —— ' + detail : '')); }
}

// ---------- 1. 裸调 xxxMemorySet.add( 扫描（源码级） ----------
let bareAdds = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const re = /(personal|game|mixed)MemorySet\s*\.\s*add\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    bareAdds.push(f + ' @index ' + m.index);
  }
}
check('裸调 MemorySet.add = 0', bareAdds.length === 0, bareAdds.join('; '));

// ---------- 2. key 双向对齐 ----------
const diarySrc = fs.readFileSync(path.join(ROOT, 'story/日记本.js'), 'utf8');
const tableKeys = new Set();
{
  const re = /"([^"]+)":\s*\n?\s*"/g; // DIARY_ENTRIES 字面量 key 行（key: "正文 或 key:\n    "正文）
  const block = diarySrc.slice(diarySrc.indexOf('var DIARY_ENTRIES'), diarySrc.indexOf('function diaryRender'));
  let m;
  const re2 = /"((?:[^"\\]|\\.)*)":\s*\n?\s*"/g;
  while ((m = re2.exec(block)) !== null) tableKeys.add(m[1]);
}
const usedKeys = new Set();
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  let m;
  const reG = /gainMemory\s*\(\s*vars\s*,\s*"([^"]+)"\s*,\s*"(personal|game|mixed)"\s*\)/g;
  while ((m = reG.exec(src)) !== null) usedKeys.add(m[1]);
  const reE = /addDiaryEvent\s*\(\s*vars\s*,\s*"([^"]+)"\s*\)/g;
  while ((m = reE.exec(src)) !== null) usedKeys.add(m[1]);
}
const missingInTable = [...usedKeys].filter(k => !tableKeys.has(k));
const orphanEntries = [...tableKeys].filter(k => !usedKeys.has(k));
check('所有 gainMemory/addDiaryEvent 的 key 都在 DIARY_ENTRIES', missingInTable.length === 0, missingInTable.join(', '));
check('DIARY_ENTRIES 无孤儿条目', orphanEntries.length === 0, orphanEntries.join(', '));
check('DIARY_ENTRIES 覆盖 9 条个人记忆 + 抄录报告（>=10 条）', tableKeys.size >= 10, '实际 ' + tableKeys.size + ' 条');

// ---------- 3. 正文不含 { } ----------
const block2 = diarySrc.slice(diarySrc.indexOf('var DIARY_ENTRIES'), diarySrc.indexOf('function diaryRender'));
const braceBody = block2.match(/"((?:[^"\\]|\\.)*)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/g) || [];
let braceBad = [];
for (const entryStr of braceBody) {
  const body = entryStr.slice(entryStr.indexOf('":') + 2);
  if (body.includes('{') || body.includes('}')) braceBad.push(entryStr.slice(0, 20));
}
check('DIARY_ENTRIES 正文不含花括号', braceBad.length === 0, braceBad.join('; '));

// ---------- 4. 场景与变量 ----------
for (const id of ['日记本', '日记本-写', '日记本-写-空白', '日记本-写好了', '整理整理-丢日记本']) {
  check('场景存在「' + id + '」', Boolean(storyData[id]));
}
check('_variables 注册 _diaryLog', Array.isArray(vars0._diaryLog));
check('_variables 注册 _diaryPage', typeof vars0._diaryPage === 'number');

// ---------- 5. 整理整理入口 ----------
const tidy = storyData['整理整理'];
const tidyChoices = tidy && typeof tidy.choices === 'function' ? tidy.choices(vars0) : (tidy ? tidy.choices : []);
const openEntry = tidyChoices.find(c => c.nextScene === '日记本');
check('整理整理有「翻开日记本」入口', Boolean(openEntry));
check('入口 showCondition = hasDiary', Boolean(openEntry) && openEntry.showCondition === 'hasDiary');
const dropEntry = tidyChoices.find(c => c.nextScene === '整理整理-丢日记本');
check('「丢下日记本」跳特殊节点', Boolean(dropEntry));
check('丢本选项 effect 为 updateTime 包装函数', Boolean(dropEntry) && typeof dropEntry.effect === 'function');

// ---------- 迷你引擎（渲染冒烟） ----------
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

const gainMemory = vm.runInContext('gainMemory', sandbox);
const addDiaryEvent = vm.runInContext('addDiaryEvent', sandbox);
const addDiaryNote = vm.runInContext('addDiaryNote', sandbox);
const diaryRender = vm.runInContext('diaryRender', sandbox);

// 空本子
let s = newState({ hasDiary: true, _diaryLog: [], _diaryPage: 0 });
let out = diaryRender(s);
check('空本子渲染不抛异常且提示崭新', typeof out === 'string' && out.includes('崭新'));
check('空本子无翻页选项（往前翻 showCondition=false）', evalCond(s, '_diaryPage < Math.ceil(_diaryLog.length / 5) - 1') === false);

// 记忆落账 + 幂等
s = newState({ hasDiary: true });
check('gainMemory 首次返回 true', gainMemory(s, '忘记搬家的松鼠', 'personal') === true);
check('gainMemory 幂等返回 false', gainMemory(s, '忘记搬家的松鼠', 'personal') === false);
check('log 落 1 条且带时间/天气', s._diaryLog.length === 1 && s._diaryLog[0].dd === 1 && typeof s._diaryLog[0].weather === 'string');
check('Set 同步入账', s.personalMemorySet.has('忘记搬家的松鼠'));
out = diaryRender(s);
check('渲染含记忆正文与日期头', out.includes('小斯克莱特') && out.includes('6月29日'));

// 事件幂等
addDiaryEvent(s, '抄录报告');
check('addDiaryEvent 落账', s._diaryLog.length === 2);
check('addDiaryEvent 同 key 幂等', addDiaryEvent(s, '抄录报告') === false && s._diaryLog.length === 2);

// 手写转义：HTML 标签 + 花括号（防 innerHTML 注入 + 防插值污染）
addDiaryNote(s, '<b>今天</b>{strength}');
out = diaryRender(s);
check('手写 HTML 被转义（无裸 <b>）', !out.includes('<b>'));
check('手写花括号被中和（无 {strength} 直出）', !out.includes('{strength}'));
check('转义后仍显示原文与插值变量名', out.includes('今天') && out.includes('strength'));

// 分页与翻页边界：共 11 条 → 3 页
s = newState({ hasDiary: true });
const keys = ['忘记搬家的松鼠','滑板车的盲从','起脚爆射','悠扬琴声','U-ball','返校','师生重逢','毕业快乐','介孔材料'];
for (const k of keys) gainMemory(s, k, 'personal');
addDiaryEvent(s, '抄录报告');
addDiaryNote(s, '第一条手写');
const total = Math.ceil(s._diaryLog.length / 5);
check('11 条 → 3 页', total === 3);
check('页0=最新（含手写），页2=最早（含松鼠）',
  diaryRender(s).includes('第一条手写') && (s._diaryPage = 2, diaryRender(s)).includes('小斯克莱特'));
s._diaryPage = 0;
check('往前翻 showCondition 在页0成立、页2不成立',
  evalCond(s, '_diaryPage < Math.ceil(_diaryLog.length / 5) - 1') === true &&
  (s._diaryPage = 2, evalCond(s, '_diaryPage < Math.ceil(_diaryLog.length / 5) - 1')) === false);
check('往后翻 showCondition 在页0不成立、页2成立',
  (s._diaryPage = 0, evalCond(s, '_diaryPage > 0')) === false &&
  (s._diaryPage = 2, evalCond(s, '_diaryPage > 0')) === true);

// onEnter 外部进入归位 / 翻页自跳不归位
const diaryScene = storyData['日记本'];
s._diaryPage = 2; s._lastScene = '日记本';
diaryScene.onEnter(s);
check('自跳（_lastScene=日记本）不重置页码', s._diaryPage === 2);
s._lastScene = '整理整理';
diaryScene.onEnter(s);
check('外部进入归位到最新页', s._diaryPage === 0);

// 写好了 onEnter = updateTime(1)（可执行、返回 effect）
const doneScene = storyData['日记本-写好了'];
check('「日记本-写好了」onEnter 为 updateTime(1) 效果', typeof doneScene.onEnter === 'function' && doneScene.onEnter(s) != null);

// ---------- 汇总 ----------
console.log('日记本审计：' + pass + ' 通过 / ' + fails.length + ' 失败');
if (fails.length) {
  console.log('失败项：');
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
