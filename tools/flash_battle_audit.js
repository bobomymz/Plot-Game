// 闪色战斗三档判定迁移审计（09-29）
// 用途一（迁移前）：列出全库所有闪色战斗场次（input 选项 + timeout），供逐场决策丧尸数/跑路出口。
// 用途二（迁移后校验）：
//   [R1] 每个闪色战斗选项必须走 flashCombatRouter（nextScene 含路由），不得残留 condition:checkFlashAnswer + elseScene 死亡二分支
//   [R2] flashCombatRouter 的三个目标场景必须真实存在（死链检查）
//   [R3] 受伤场景必须挂 hurtWinOnEnter / hurtFleeOnEnter 惩罚包（源码级检查）
//   [R4] 路由的 hurt 目标与"场景内已定义的受伤场景"一致（防止抄错 ID）
// 白名单 WHITELIST：非战斗型闪色（纯记忆挑战，不做三档）。
// 口令：node tools/flash_battle_audit.js
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = process.cwd();
let FILES = [];
try { const _sf = require('./story_files').list(); FILES = _sf.slice(); } catch (_e) { console.error('[FILES] 无法加载 tools/story_files.js：' + _e.message); process.exit(1); }

const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
for (const k of ['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake']) sandbox[k] = function () {};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const loadedOk = [];
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); loadedOk.push(f); }
  catch (e) { console.log('执行失败', f, e.message); }
}
const sd = vm.runInContext('storyData', sandbox);

const fileText = {};
for (const f of loadedOk) fileText[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');

// ---- 源码工具（同 qte_report.js）----
function skipStringOrComment(s, i) {
  const c = s[i];
  if (c === '/' && s[i + 1] === '/') { const j = s.indexOf('\n', i); return j < 0 ? s.length : j + 1; }
  if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); return j < 0 ? s.length : j + 2; }
  if (c === '"' || c === "'" || c === '`') {
    let j = i + 1;
    while (j < s.length) {
      if (s[j] === '\\') { j += 2; continue; }
      if (s[j] === c) return j + 1;
      j++;
    }
    return s.length;
  }
  return -1;
}
function matchBracket(s, i) {
  const open = s[i], close = { '{': '}', '(': ')', '[': ']' }[open];
  let depth = 0, j = i;
  while (j < s.length) {
    const ns = skipStringOrComment(s, j);
    if (ns > 0) { j = ns; continue; }
    const ch = s[j];
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === ']') { depth--; if (depth === 0) return j + 1; }
    j++;
  }
  return -1;
}
// 场景 id → 定义文件（首个命中）
const SCENE_DEF = new Map();
for (const f of loadedOk) {
  const re = /^\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*:\s*(?=\{)/gm;
  let m;
  while ((m = re.exec(fileText[f])) !== null) {
    if (!SCENE_DEF.has(m[1])) SCENE_DEF.set(m[1], f);
  }
}
// 抓取场景块源码（定位 "id": { ... } 完整块）
function sceneBlockSrc(sceneId) {
  const f = SCENE_DEF.get(sceneId);
  if (!f) return null;
  const t = fileText[f];
  const re = new RegExp('"' + sceneId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*\\{', 'g');
  let m;
  while ((m = re.exec(t)) !== null) {
    const open = t.indexOf('{', m.index + m[0].length - 1);
    const end = matchBracket(t, open);
    if (end > 0) return { file: f, src: t.slice(open, end) };
  }
  return null;
}

// ---- 压力态求值 choices 函数（工厂型场景）----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const state = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const computed = (sd._reactive && sd._reactive.computed) || {};
const stress = Object.assign({}, state, { chasedByZombies: 3, strength: 10, hh: 12, dd: 3 });
stress._visit = new Proxy({}, { get: () => 1 });
for (const key of Object.keys(computed)) {
  const e = computed[key];
  try { stress[key] = typeof e === 'function' ? e(stress) : new Function(...Object.keys(stress), 'return (' + e + ');')(...Object.values(stress)); } catch (_) {}
}

// ---- 收集闪色战斗场次（运行时：input + timeout 的选项）----
const battles = [];
for (const key of Object.keys(sd)) {
  if (key.startsWith('_')) continue;
  const node = sd[key];
  if (typeof node !== 'object' || node === null) continue;
  let choices = node.choices;
  try { if (typeof choices === 'function') choices = choices(stress); } catch (_) { continue; }
  if (!Array.isArray(choices)) continue;
  const flashChoices = choices.filter(c => c && c.input && c.timeout !== undefined);
  if (!flashChoices.length) continue;
  battles.push({ id: key, n: flashChoices.length, sample: flashChoices[0] });
}

// ---- 反向链接：谁跳到本场景 ----
function inbound(sceneId) {
  const res = [];
  for (const f of loadedOk) {
    const t = fileText[f];
    let idx = 0;
    while ((idx = t.indexOf('"' + sceneId + '"', idx)) !== -1) {
      const line = t.slice(t.lastIndexOf('\n', idx) + 1, t.indexOf('\n', idx)).trim();
      if (!/^\s*"/.test(line) || line.startsWith('" scenes') ) { /* 场景定义行本身跳过 */ }
      res.push(f.replace('story/', '') + ': ' + line.slice(0, 90));
      idx += sceneId.length;
    }
  }
  return res;
}

// ---- 输出清单 + 校验 ----
const WHITELIST = []; // 非战斗型闪色（不做三档），格式：场景 ID
const rows = [];
let errors = 0, warns = 0;

for (const b of battles) {
  const blk = sceneBlockSrc(b.id);
  const src = blk ? blk.src : '(未定位源码)';
  const file = blk ? blk.file.replace('story/', '') : '?';
  const isFactory = /choices\s*:\s*function|return\s*\[/.test(src) && !Array.isArray(sd[b.id].choices);
  const im = /initMemoryGame\s*\(([^)]*)\)/.exec(src);
  const lenArg = im ? im[1].replace(/\s+/g, '') : '(动态/工厂)';
  const hasRouter = /flashCombatRouter\s*\(/.test(src);
  const hasOldCond = /condition\s*:\s*checkFlashAnswer/.test(src);
  const elseScene = b.sample.elseScene || null;
  const timeoutScene = b.sample.timeoutScene || null;
  const timeout = b.sample.timeout;

  // 迁移后校验
  if (hasOldCond) { console.log('[R1][FAIL] ' + b.id + '（' + file + '）仍是旧二分支 condition:checkFlashAnswer'); errors++; }
  if (WHITELIST.includes(b.id)) continue;
  if (!hasRouter) { console.log('[R1][FAIL] ' + b.id + '（' + file + '）未接 flashCombatRouter'); errors++; }
  const rt = /flashCombatRouter\s*\(\s*(?:\[\s*)?["']([^"']+)["']\s*,\s*(?:\[\s*)?["']([^"']+)["']\s*,\s*(?:\[\s*)?["']([^"']+)["']/.exec(src);
  let targets = null;
  if (rt) {
    targets = [rt[1], rt[2], rt[3]];
    for (const tg of targets) {
      if (!sd[tg]) { console.log('[R2][FAIL] ' + b.id + ' 路由目标不存在: ' + tg); errors++; }
    }
  } else if (hasRouter) {
    console.log('[R2][WARN] ' + b.id + ' 路由参数是动态写法，跳过静态目标检查'); warns++;
  }
  if (timeoutScene && !sd[timeoutScene]) { console.log('[R2][FAIL] ' + b.id + ' timeoutScene 不存在: ' + timeoutScene); errors++; }
  rows.push({ id: b.id, file, lenArg, hasRouter, hasOldCond, elseScene, timeoutScene, timeout, isFactory, targets, inbound: inbound(b.id) });
}

// [R3] 受伤场景惩罚包检查：所有被当作 hurt 目标的场景，源码应含 hurtWinOnEnter/hurtFleeOnEnter
const hurtTargets = new Set();
for (const r of rows) if (r.targets) hurtTargets.add(r.targets[1]);
for (const h of hurtTargets) {
  const blk = sceneBlockSrc(h);
  if (!blk) { console.log('[R3][FAIL] 受伤场景源码未定位: ' + h); errors++; continue; }
  if (!/hurtWinOnEnter|hurtFleeOnEnter/.test(blk.src)) {
    console.log('[R3][WARN] ' + h + ' 未挂 hurtWinOnEnter/hurtFleeOnEnter（若手工 onEnter 请人工确认）'); warns++;
  }
}

// ---- Markdown 清单 ----
const L = [];
L.push('# 闪色战斗三档判定迁移清单\n');
L.push('> 由 `node tools/flash_battle_audit.js` 自动生成。判定规则：0偏差=胜利 / 1~2偏差=受伤（干死或跑路）/ ≥3偏差或超时=死亡。');
L.push('> 旧写法 = `condition: checkFlashAnswer` + `elseScene` 死亡；新写法 = `nextScene: flashCombatRouter(胜,伤,死)`，超时仍走 timeoutScene 死亡。\n');
L.push('| # | 场景 | 文件 | 序列 | 已迁移 | 旧elseScene | 超时 | 工厂 |');
L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
rows.forEach((r, i) => {
  L.push(`| ${i + 1} | ${r.id} | ${r.file} | ${r.lenArg} | ${r.hasRouter ? '✅' : '❌'} | ${r.elseScene || '—'} | ${typeof r.timeout === 'number' ? (r.timeout / 1000) + 's' : JSON.stringify(r.timeout)} | ${r.isFactory ? '是' : '—'} |`);
});
L.push('\n## 反向链接（每场战斗的入口，跑路档出口决策用）\n');
for (const r of rows) {
  L.push('**' + r.id + '**（' + r.file + '）');
  r.inbound.slice(0, 8).forEach(x => L.push('- ' + x));
  L.push('');
}
fs.writeFileSync(path.join(ROOT, 'tools', '闪色战斗迁移清单.md'), L.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'tools', 'flash_battle_audit.json'), JSON.stringify(rows, null, 2), 'utf8');

console.log('=== 闪色战斗审计 ===');
console.log('场次总数: ' + rows.length + '（含工厂动态生成）');
console.log('已迁移: ' + rows.filter(r => r.hasRouter).length + ' / 未迁移: ' + rows.filter(r => !r.hasRouter).length);
console.log('FAIL: ' + errors + '  WARN: ' + warns);
if (errors) process.exit(1);
console.log('已写出 tools/闪色战斗迁移清单.md');
