// 休息节点 × 整理整理入口 审计
//   1. 文本扫描：找出每个 restRecover 调用所属的场景 ID（向上最近的顶层 `  "ID": {`）+ 文件 + 行号
//   2. 运行时：对每个休息场景求 choices（函数式用多状态变体求并集），判断是否已有 nextScene "整理整理"
//   3. 输出待补清单（改完后重跑应看到「待补 0」）
// 用法： node tools/rest_tidy_audit.js
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = process.cwd();
const FILES = require('./story_files').list();

// ---------- 1. 文本扫描：restRecover 归属场景 ----------
const SCENE_DEF = /^ {2}"([^"]+)":\s*\{/;
const restScenes = new Map();   // id -> {file, lines:[]}
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log('缺失:', f); continue; }
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  let cur = null;
  lines.forEach((ln, i) => {
    const m = ln.match(SCENE_DEF);
    if (m) { cur = m[1]; return; }
    if (/restRecover\s*\(/.test(ln) && cur) {
      if (!restScenes.has(cur)) restScenes.set(cur, { file: f, lines: [] });
      restScenes.get(cur).lines.push(i + 1);
    }
  });
}

// ---------- 2. 运行时加载 ----------
const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake'].forEach(k => sandbox[k] = function () {});
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.log('执行失败', f, e.message); }
}
const sd = vm.runInContext('storyData', sandbox);

// 多状态变体：让函数式 choices 尽量展开（真/假/访问过/夜晚/有物品）
function variants() {
  const base = JSON.parse(JSON.stringify(sandbox._variables || {}));
  const out = [];
  const mk = (mut) => { const v = JSON.parse(JSON.stringify(base)); mut(v); return v; };
  out.push(mk(() => {}));
  out.push(mk(v => { for (const k in v) { if (typeof v[k] === 'boolean') v[k] = true; } }));
  out.push(mk(v => { for (const k in v) { if (typeof v[k] === 'boolean') v[k] = false; } }));
  out.push(mk(v => { v.hh = 22; v.itemCount = 2; }));
  out.push(mk(v => { v.hh = 9; v.itemCount = 0; v.chasedByZombies = 3; }));
  out.push(mk(v => { v.hh = 15; v.itemCount = 1; v.dd = 3; }));
  // 补派生量
  for (const v of out) {
    v._visit = v._visit || {};
    try { sandbox.refreshComputed && sandbox.refreshComputed(v); } catch (e) {}
  }
  return out;
}
const VS = variants();

function collectChoices(id) {
  const sc = sd[id];
  if (!sc || !sc.choices) return [];
  const got = [];
  const push = (c) => { if (c && typeof c === 'object') got.push(c); };
  if (typeof sc.choices === 'function') {
    for (const v of VS) {
      try {
        const r = sc.choices(v);
        if (Array.isArray(r)) r.forEach(push);
      } catch (e) { /* 该变体抛错，跳过 */ }
    }
  } else if (Array.isArray(sc.choices)) sc.choices.forEach(push);
  return got;
}

// ---------- 3. 判定 ----------
const rows = [];
for (const [id, info] of restScenes) {
  const cs = collectChoices(id);
  const tidy = cs.filter(c => c.nextScene === '整理整理');
  rows.push({
    id, file: info.file, lines: info.lines.join(','),
    choiceCount: cs.length,
    hasTidy: tidy.length > 0,
    tidyText: tidy.length ? tidy.map(c => (typeof c.text === 'string' ? c.text : '(函数式)')).join(' / ') : '',
    missing: !sd[id]
  });
}
rows.sort((a, b) => a.file.localeCompare(b.file) || a.lines.localeCompare(b.lines, undefined, { numeric: true }));

console.log('===== 休息节点（源码含 restRecover）共 ' + rows.length + ' 个 =====\n');
for (const r of rows) {
  console.log((r.hasTidy ? '[已有] ' : '[待补] ') + r.id);
  console.log('        ' + r.file + ':' + r.lines + '   选项数(并集)=' + r.choiceCount + (r.missing ? '   ⚠运行时未找到该场景' : ''));
  if (r.hasTidy) console.log('        入口文案: ' + r.tidyText);
}
const todo = rows.filter(r => !r.hasTidy);
console.log('\n===== 待补「整理一下物品」入口：' + todo.length + ' 个 =====');
todo.forEach(r => console.log('  ' + r.id + '   (' + r.file + ':' + r.lines + ')'));

// 顺带：整理整理节点自身是否健康
const zz = sd['整理整理'];
console.log('\n整理整理节点存在: ' + !!zz + '，选项数: ' + (zz ? (Array.isArray(zz.choices) ? zz.choices.length : '函数式') : '—'));

// ---------- 4. 既有（非休息）整理入口的「返回重复结算」风险扫描 ----------
// 整理整理的出口是 {positionAfterOperation} → 回到入口场景 → onEnter 会再跑一遍。
// 休息节点本次已用 restTidyGuard 兜住；这里扫【其它】入口，列出仍会在返回时被重复结算的场景。
const hits = [];
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  let cur = null;
  lines.forEach((ln, i) => {
    const m = ln.match(SCENE_DEF);
    if (m) { cur = m[1]; return; }
    if (/nextScene:\s*"整理整理"/.test(ln) && cur && cur !== '整理整理' && !/^整理整理-/.test(cur)) {
      if (!hits.some(h => h.id === cur)) hits.push({ id: cur, file: f, line: i + 1 });
    }
  });
}
const risky = [];
for (const h of hits) {
  if (restScenes.has(h.id)) continue;                 // 休息节点已处理，不重复报
  const sc = sd[h.id];
  if (!sc) continue;
  const src = (sc.onEnter && typeof sc.onEnter === 'function') ? sc.onEnter.toString() : '';
  const flags = [];
  if (/updateTime\s*\(/.test(src)) flags.push('推进时间');
  if (/\+\+|--/.test(src)) flags.push('自增计数');
  if (/=\s*true/.test(src)) flags.push('置标记');
  if (flags.length) risky.push({ id: h.id, file: h.file, line: h.line, flags: flags.join('/') });
}
console.log('\n===== 既有整理入口（非休息节点）' + hits.length + ' 个；其中 onEnter 有一次性/时间副作用、返回时会重复结算的：' + risky.length + ' 个 =====');
risky.forEach(r => console.log('  ⚠ ' + r.id + '  (' + r.file + ':' + r.line + ')  → ' + r.flags));
console.log('（这些不属于本次改造范围，留作待办：要么同样加 guard，要么把入口的 positionAfterOperation 指向安全的上级场景）');
