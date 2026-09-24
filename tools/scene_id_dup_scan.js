// 场景 ID 重名扫描（运行时·逐文件隔离）
//
// 背景（2026-09-24 教训）：story/*.js 全部用 Object.assign(storyData, {...}) 聚合，
// 场景 ID 是 storyData 的顶层 key —— 一旦两处定义了同名场景，后加载的会**静默覆盖**先加载的。
// 而 lint_story / condition_audit / scene_fn_selftest 都在**合并后**的 storyData 上工作，
// 看到的是覆盖后的单份，查不出重名。典型坑：仁济南院.js 新增「结局-仁济-检验科失守」
// 会撞掉 夜晚剧情.js 已有的同名结局（过夜门锁被砸坏被咬死）。
//
// 方法（两通道，互为交叉验证）：
//   ① 运行时通道（权威）：对每个剧情文件在**独立 vm context** 中加载
//      （先预载 utils.js + core.js 提供全局函数），比对加载前后的 storyData key 集合，
//      得到该文件独有的 key。独立 context 隔离 → 覆盖不会发生 → 重名必然暴露。
//      这条能覆盖**循环/工厂批量生成**的场景（如 建平-躲藏-*、三林安居苑-7号楼-*6 层），
//      这些 key 在源码里不是 `"ID": {` 字面量，纯文本正则扫不到（会假绿）。
//   ② 文本通道（辅助）：正则扫顶层 `"ID": {`，给出定义行号，便于定位修改。
//
// 用法：node tools/scene_id_dup_scan.js
// 报告：tools/场景ID重名扫描报告.md

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const FILES = require('./story_files').list();
const ROOT = process.cwd();

const HELPER_FILES = ['story/utils.js', 'story/core.js'];
const TOP_KEY = /^[ \t]*"((?:[^"\\]|\\.)*)":\s*\{/gm;

function makeCtx() {
  const fixedMath = Object.create(Math);
  fixedMath.random = () => 0.5; // 固定随机：与 lint_story 一致，保证结果可复现
  return vm.createContext({
    console,
    Math: fixedMath,
    flashStatusWarning: () => {},
    triggerShake: () => {},
  });
}
function load(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}
function keysOf(ctx) {
  try {
    return vm.runInContext(
      "Object.keys(storyData).filter(function(k){return !k.startsWith('_');})", ctx);
  } catch (e) { return []; }
}

// ---------- ① 运行时通道 ----------
const ctxUtils = makeCtx();
load(ctxUtils, HELPER_FILES[0]);
const utilsKeys = new Set(keysOf(ctxUtils));

const ctxUtilsCore = makeCtx();
load(ctxUtilsCore, HELPER_FILES[0]);
load(ctxUtilsCore, HELPER_FILES[1]);
const utilsCoreKeys = new Set(keysOf(ctxUtilsCore));

const fileKeys = new Map();   // file -> [id...]
const loadErrors = [];
for (const file of FILES) {
  if (file === HELPER_FILES[0]) { fileKeys.set(file, [...utilsKeys]); continue; }
  if (file === HELPER_FILES[1]) {
    fileKeys.set(file, [...utilsCoreKeys].filter((k) => !utilsKeys.has(k)));
    continue;
  }
  const ctx = makeCtx();
  try {
    load(ctx, HELPER_FILES[0]);
    load(ctx, HELPER_FILES[1]);
    const before = new Set(keysOf(ctx));
    load(ctx, file);
    fileKeys.set(file, keysOf(ctx).filter((k) => !before.has(k)));
  } catch (e) {
    loadErrors.push(file + ': ' + e.message);
    fileKeys.set(file, []);
  }
}

// ---------- ② 文本通道（行号定位） ----------
const textDefs = new Map();   // id -> ["file:line", ...]
for (const file of FILES) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const m of src.matchAll(TOP_KEY)) {
    const id = m[1];
    const line = src.slice(0, m.index).split('\n').length;
    if (!textDefs.has(id)) textDefs.set(id, []);
    textDefs.get(id).push(file + ':' + line);
  }
}

// ---------- 汇总 ----------
const owner = new Map();      // id -> [file...]
let total = 0;
for (const [file, ids] of fileKeys) {
  for (const id of ids) {
    if (!owner.has(id)) owner.set(id, []);
    owner.get(id).push(file);
    total++;
  }
}
const dups = [...owner.entries()].filter(([, arr]) => arr.length > 1);

console.log('=== 场景 ID 重名扫描（运行时·逐文件隔离） ===');
console.log('扫描文件: ' + FILES.length + ' 个 | 运行时唯一场景 ID: ' + owner.size + ' 个 | 定义总数: ' + total);
if (loadErrors.length) {
  console.log('!! 加载失败 ' + loadErrors.length + ' 个（该文件场景未纳入统计）：');
  loadErrors.forEach((e) => console.log('     ' + e));
}
console.log('重名 ID: ' + dups.length + ' 个');
for (const [id, arr] of dups) {
  console.log('\n  ✗ "' + id + '"');
  for (const f of arr) {
    const loc = (textDefs.get(id) || []).filter((s) => s.startsWith(f + ':')).join(', ') || '(循环/工厂生成，无字面量)';
    console.log('      ' + f + '   ' + loc);
  }
}

// ---------- 报告 ----------
const md = [];
md.push('# 场景 ID 重名扫描报告');
md.push('');
md.push('> 工具：`node tools/scene_id_dup_scan.js`（运行时逐文件隔离，不受 Object.assign 静默覆盖影响）');
md.push('> 扫描 ' + FILES.length + ' 个文件 · 运行时唯一场景 ID **' + owner.size + '** 个 · 定义总数 ' + total);
md.push('');
md.push('## 结论');
md.push('');
if (dups.length === 0) {
  md.push('**0 处重名** —— 无场景 ID 跨文件/同文件重复定义。');
} else {
  md.push('**' + dups.length + ' 处重名** —— 后加载文件会静默覆盖先加载文件的同名场景，必须改名：');
  md.push('');
  md.push('| 重名 ID | 定义位置（按加载顺序，后者覆盖前者） |');
  md.push('|---|---|');
  for (const [id, arr] of dups) {
    const cells = arr.map((f) => {
      const loc = (textDefs.get(id) || []).filter((s) => s.startsWith(f + ':')).join(', ');
      return '`' + f + '`' + (loc ? ' (' + loc + ')' : '（循环/工厂生成）');
    });
    md.push('| `' + id + '` | ' + cells.join(' → ') + ' |');
  }
}
if (loadErrors.length) {
  md.push('');
  md.push('## 加载失败（未纳入统计）');
  md.push('');
  loadErrors.forEach((e) => md.push('- ' + e));
}
md.push('');
fs.writeFileSync(path.join(ROOT, 'tools', '场景ID重名扫描报告.md'), md.join('\n'), 'utf8');
console.log('\n已写出 tools/场景ID重名扫描报告.md');
