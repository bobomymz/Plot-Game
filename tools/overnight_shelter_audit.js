// 过夜系统（安全屋）审计
//   1. 输出「天黑必须过夜」全部选项的可见性门槛（showCondition / condition / elseScene）
//   2. 检查每个选项是否带「去过才出现」的 _visit 闸门
//   3. 全库扫描 _visit['X'] 键，找出悬空场景 ID（永远为 0 → 选项永不出现）
//   4. 校验所有 nextScene / elseScene 目标是否存在
// 用法： node tools/overnight_shelter_audit.js
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
// 2026-09-24 根治：以 index.html 为准重算清单（新增剧情文件自动纳入，杜绝"漏加载=假绿"）
try { const _sf = require('./story_files').list(); FILES.length = 0; for (const _f of _sf) FILES.push(_f); } catch (_e) { console.warn('[FILES] 回退内置清单：' + _e.message); }

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
const ids = new Set(Object.keys(sd).filter(k => !k.startsWith('_')));
const SPECIAL = new Set(['start']);   // 引擎内置跳转名

// ---------- 1 + 2. 过夜菜单逐项 ----------
const MENU = '天黑必须过夜';
const menu = sd[MENU];
const gateRe = /_visit\s*\[\s*['"]([^'"]+)['"]\s*\]|_visit\.([A-Za-z0-9_\u4e00-\u9fa5]+)/g;
function visitKeysIn(str) {
  if (typeof str !== 'string') return [];
  const out = []; let m;
  gateRe.lastIndex = 0;
  while ((m = gateRe.exec(str))) out.push(m[1] || m[2]);
  return out;
}

console.log('===== ' + MENU + '（共 ' + menu.choices.length + ' 个选项）=====\n');
const ungated = [];
menu.choices.forEach((c, i) => {
  const show = c.showCondition || '';
  const cond = c.condition || '';
  const tgt = typeof c.nextScene === 'string' ? c.nextScene : '（函数式）';
  const gate = visitKeysIn(show).concat(visitKeysIn(cond));
  // 判定：showCondition 里是否含 _visit → 才算「去过才出现」；只看 condition 的是「去了可能死」
  const shownGate = visitKeysIn(show);
  const condGate = visitKeysIn(cond);
  const hasElse = c.elseScene !== undefined;
  const tag = shownGate.length ? '✔ 出现前已过滤'
            : (condGate.length ? '△ 出现后判定（选错即死）' : '✘ 无任何去过门槛');
  console.log('#' + String(i + 1).padStart(2) + ' ' + tag);
  console.log('    text        : ' + (typeof c.text === 'string' ? c.text : '（函数式）'));
  console.log('    showCondition: ' + (show || '—'));
  console.log('    condition    : ' + (cond || '—') + (hasElse ? '   elseScene: ' + c.elseScene : ''));
  console.log('    → ' + tgt + '\n');
  if (!shownGate.length) ungated.push({ i: i + 1, text: typeof c.text === 'string' ? c.text : '(函数式)', tgt: tgt, show: show, cond: cond, elseScene: c.elseScene });
});

console.log('===== A. showCondition 里没有 _visit 门槛的选项：' + ungated.length + ' 个 =====');
ungated.forEach(u => console.log('  #' + u.i + '  ' + u.text + '   [show=' + (u.show || '—') + '] → ' + u.tgt + (u.elseScene ? '  (else:' + u.elseScene + ')' : '')));

// ---------- 3. 全库 _visit 键扫描 ----------
console.log('\n===== B. 全库 _visit[\'X\'] 悬空键检查 =====');
const uses = {};   // key -> [ {file, line} ]
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  fs.readFileSync(abs, 'utf8').split(/\r?\n/).forEach((line, n) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) return;   // 跳过注释行，避免注释里的示例键被误报
    const re = /_visit\s*\[\s*['"]([^'"]+)['"]\s*\]|_visit\.([A-Za-z0-9_\u4e00-\u9fa5]+)/g;
    let m;
    while ((m = re.exec(line))) {
      const k = m[1] || m[2];
      (uses[k] = uses[k] || []).push({ file: f, line: n + 1, raw: trimmed.slice(0, 90) });
    }
  });
}
const dangling = Object.keys(uses).filter(k => !ids.has(k)).sort();
if (!dangling.length) console.log('  （无悬空键）');
dangling.forEach(k => {
  console.log('  【悬空】_visit[\'' + k + '\']  ← 场景表中不存在此 ID，恒为 undefined/0');
  uses[k].forEach(u => console.log('        ' + u.file + ':' + u.line + '  ' + u.raw));
});

// ---------- 4. 跳转目标校验 ----------
console.log('\n===== C. 过夜相关场景的跳转目标校验 =====');
const bad = [];
Object.keys(sd).forEach(k => {
  if (k.startsWith('_')) return;
  const node = sd[k];
  if (typeof node !== 'object' || node === null) return;
  if (!Array.isArray(node.choices)) return;
  node.choices.forEach((c, i) => {
    if (!c) return;
    for (const f of ['nextScene', 'elseScene']) {
      const v = c[f];
      if (typeof v !== 'string') continue;
      // '{positionAfterOperation}' / '{_sprintDest}' 等占位符由引擎在点击时解析，非失效目标
      if (/[{}]/.test(v)) continue;
      if (!ids.has(v) && !SPECIAL.has(v)) bad.push({ from: k, i: i + 1, f: f, v: v });
    }
  });
});
if (!bad.length) console.log('  （无失效跳转）');
bad.forEach(b => console.log('  ' + b.from + '.choices[' + b.i + '].' + b.f + ' → ' + b.v + '  【目标不存在】'));

// ---------- 5. 过夜场景清单（供人肉核对） ----------
const nights = [...ids].filter(k => k.startsWith('过夜-')).sort();
console.log('\n===== D. 过夜安全屋场景清单（' + nights.length + ' 个） =====');
nights.forEach(k => {
  const n = sd[k];
  const wake = (n.choices || []).map(c => typeof c.nextScene === 'string' ? c.nextScene : '（函数式）').join(' / ');
  console.log('  ' + k + '   → 醒来：' + (wake || '（无）'));
});
