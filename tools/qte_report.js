// 场景级 QTE 分布统计（v2）
// 口径：场景对象自带 qte 属性（engine.js:822 `scene.qte`），区别于选项级 QTE（choice.timeout）
// 对 object / 工厂调用 / 动态函数三种写法统一提取源码文本
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
for (const k of ['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake']) sandbox[k] = function () {};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const loadedOk = [];
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log('缺失:', f); continue; }
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); loadedOk.push(f); }
  catch (e) { console.log('执行失败', f, e.message); }
}
const sd = vm.runInContext('storyData', sandbox);

const fileText = {};
for (const f of loadedOk) fileText[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');

// ---- 源码扫描器：跳过字符串/注释，做括号配对 ----
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
// 返回从 i（指向开括号）到配对闭括号后一位的下标
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
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// 场景定义处：`"id": ` 或 `'id': ` 或裸 id: （后跟对象或工厂调用）
const SCENE_DEF = new Map(); // id -> 文件
function locateScenes() {
  for (const f of loadedOk) {
    const t = fileText[f];
    const re = /^\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([A-Za-z_$][\w$]*))\s*:\s*(?=\{|[A-Za-z_$])/gm;
    let m;
    while ((m = re.exec(t)) !== null) {
      const id = m[1] || m[2] || m[3];
      if (!id || id.startsWith('_')) continue;
      if (!SCENE_DEF.has(id)) SCENE_DEF.set(id, f);
    }
  }
}
locateScenes();

// 从 start 起读取一个完整的值表达式（遇到深度 0 的逗号 / 收括号为止）
function readValue(s, start) {
  let i = start, depth = 0;
  while (i < s.length) {
    const ns = skipStringOrComment(s, i);
    if (ns > 0) { i = ns; continue; }
    const c = s[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') { if (depth === 0) break; depth--; }
    else if (c === ',' && depth === 0) break;
    i++;
  }
  return s.slice(start, i).trim();
}
// 提取某个场景的 qte 属性值源码（对象字面量 / 工厂调用 / 函数）
function extractQteSrc(text, sceneId) {
  const re = new RegExp('(?:"' + esc(sceneId) + '"|\'' + esc(sceneId) + '\')\\s*:', 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    let vs = m.index + m[0].length;
    while (vs < text.length && /\s/.test(text[vs])) vs++;
    if (text[vs] !== '{') return { src: readValue(text, vs), sceneIsCall: true };  // 场景本身由工厂生成（如 travelScene）
    const end = matchBracket(text, vs);
    if (end < 0) continue;
    const body = text.slice(vs, end);
    // 在 body 深度 1 处找 qte 属性
    let d = 0, i2 = 0;
    while (i2 < body.length) {
      const ns = skipStringOrComment(body, i2);
      if (ns > 0) { i2 = ns; continue; }
      const ch = body[i2];
      if (ch === '{' || ch === '(' || ch === '[') { d++; i2++; continue; }
      if (ch === '}' || ch === ')' || ch === ']') { d--; i2++; continue; }
      if (d === 1 && body.startsWith('qte', i2)) {
        const after = body.slice(i2 + 3).match(/^\s*:/);
        if (after) {
          let v = i2 + 3 + after[0].length;
          while (v < body.length && /\s/.test(body[v])) v++;
          return { src: readValue(body, v), sceneIsCall: false };
        }
      }
      i2++;
    }
    return { src: null, sceneIsCall: false };
  }
  return null;
}
function compact(src) {
  if (!src) return '';
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ---- state 构造（求值字符串 timeout 用）----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const state = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const computed = (sd._reactive && sd._reactive.computed) || {};
for (const key of Object.keys(computed)) {
  const e = computed[key];
  try { state[key] = typeof e === 'function' ? e(state) : new Function(...Object.keys(state), 'return (' + e + ');')(...Object.values(state)); } catch (_) {}
}
// 压力态：把"可能触发 QTE"的开关尽量打开，用于探测动态 QTE
const stress = Object.assign({}, state, { chasedByZombies: 3, gasIndex: 80, _bagTier: 2, _bagExtra: 1, strength: 10, hh: 20, dd: 3 });
stress._visit = new Proxy({}, { get: () => 1 });
for (const key of Object.keys(computed)) {
  const e = computed[key];
  try { stress[key] = typeof e === 'function' ? e(stress) : new Function(...Object.keys(stress), 'return (' + e + ');')(...Object.values(stress)); } catch (_) {}
}

function sourceOf(id) { return SCENE_DEF.get(id) || '(未定位)'; }
function areaOf(f) {
  if (f.includes('建平中学')) return '建平中学';
  if (f.includes('仁济南院')) return '仁济南院';
  if (f.includes('张江')) return '张江';
  if (f.includes('上海市区路径')) return '上海市区路径';
  if (f === 'story/夜晚剧情.js') return '夜晚剧情（全局）';
  if (f === 'story/utils.js') return 'utils.js（全局工具）';
  if (f === 'story/core.js') return 'core.js（全局）';
  if (f.includes('/')) return '东明街道·' + path.basename(f, '.js');
  return f;
}
function evalTimeout(raw) {
  if (typeof raw === 'number') return { ms: raw, ok: true };
  if (typeof raw === 'string') {
    try { const fn = new Function(...Object.keys(state), `return Number(${raw});`); return { ms: fn(...Object.values(state)), ok: true, expr: raw }; }
    catch (e) { return { ms: null, ok: false, expr: raw, err: e.message }; }
  }
  return { ms: null, ok: false, raw: String(raw) };
}
// 动态 QTE：在四种合成状态下求值——(ch=0,未探索) / (ch=0,已探索) / (ch=3,已探索)
const mkState = (ch, visit) => {
  const st = Object.assign({}, state, { chasedByZombies: ch, gasIndex: 80, strength: 10, hh: 20, dd: 3 });
  st._visit = new Proxy({}, { get: () => visit });
  for (const key of Object.keys(computed)) {
    const e = computed[key];
    try { st[key] = typeof e === 'function' ? e(st) : new Function(...Object.keys(st), 'return (' + e + ');')(...Object.values(st)); } catch (_) {}
  }
  return st;
};
const STATES = [
  ['基准(ch=0·首次进入)', mkState(0, 0)],
  ['基准(ch=0·已探索)', mkState(0, 1)],
  ['满追(ch=3)', mkState(3, 0)],
  ['满追(ch=3·已探索)', mkState(3, 1)],
];
function evalTimeoutIn(st, raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') { try { return new Function(...Object.keys(st), `return Number(${raw});`)(...Object.values(st)); } catch (_) { return null; } }
  return null;
}
function probeDynamic(qteFn) {
  let first = null, out = null, meta = null;
  for (const [label, st] of STATES) {
    let r;
    try { r = qteFn(st); } catch (e) { return { err: e.message }; }
    if (!r) continue;
    const ms = evalTimeoutIn(st, r.timeout);
    if (first === null) { first = { ms, label }; meta = { onTimeout: r.onTimeout, hidden: r.hidden === true, typewriter: r.typewriter === true }; }
    if (label === '满追(ch=3)' && typeof ms === 'number') out = ms;
    if (out === null && label === '满追(ch=3·已探索)' && typeof ms === 'number') out = ms;
  }
  if (first === null) return null;
  return Object.assign({ baseMs: first.ms, baseLabel: first.label, chaseMs: out }, meta);
}

const rows = [], choiceLevel = [];
for (const key of Object.keys(sd)) {
  if (key.startsWith('_')) continue;
  const node = sd[key];
  if (typeof node !== 'object' || node === null) continue;
  const file = sourceOf(key), area = areaOf(file);
  const choices = typeof node.choices === 'function' ? node.choices(stress) : (Array.isArray(node.choices) ? node.choices : null);
  if (choices) choices.forEach((c, i) => {
    if (c && c.timeout !== undefined) choiceLevel.push({ id: key, file, area, timeout: c.timeout, timeoutScene: c.timeoutScene, text: typeof c.text === 'string' ? c.text : '(动态)' });
  });
  if (!('qte' in node)) continue;

  const ex = extractQteSrc(fileText[file] || '', key);
  const srcRaw = ex ? ex.src : null;
  const src = compact(srcRaw);
  let kind;
  if (typeof node.qte === 'object' && node.qte !== null) {
    kind = /^travelScene\s*\(/.test(src) ? '过场工厂(travelScene)' : '静态对象';
  } else if (typeof node.qte === 'function') {
    kind = srcRaw && /^function/.test(srcRaw) ? '动态函数' : '追逐工厂(函数)';
  } else kind = '其他';

  let t, hid = null, tw = null, onT = null, dynHit = null, dynChase = null;
  if (typeof node.qte === 'object' && node.qte !== null) {
    // 运行时真值最可靠
    t = evalTimeout(node.qte.timeout);
    hid = node.qte.hidden === true; tw = node.qte.typewriter === true; onT = node.qte.onTimeout;
    if (kind === '过场工厂(travelScene)') { hid = true; tw = true; }
  } else {
    const dyn = probeDynamic(node.qte);
    if (dyn && dyn.err) t = { ok: false, err: dyn.err };
    else if (dyn) { t = { ms: dyn.baseMs, ok: typeof dyn.baseMs === 'number' }; hid = dyn.hidden; tw = dyn.typewriter; onT = dyn.onTimeout; dynHit = dyn.baseLabel; dynChase = dyn.chaseMs; }
    else { t = { ms: null, ok: false, note: '合成状态下均不触发（默认关闭）' }; hid = false; tw = false; onT = '(条件未满足)'; }
  }
  // 工厂名：便于归类
  const factory = /^(\w+)\s*\(/.exec(src || '');
  rows.push({ id: key, file, area, kind, factory: factory ? factory[1] : '', src: src.length > 400 ? src.slice(0, 400) + ' …' : src,
    timeoutMs: t.ms, timeoutOk: t.ok, timeoutExpr: t.expr || null, timeoutErr: t.err || null, timeoutNote: t.note || null,
    onTimeout: onT, hidden: hid, typewriter: tw, choiceCount: choices ? choices.length : 0, hitState: dynHit || null, chaseMs: (typeof dynChase === 'number' ? dynChase : null) });
}

// ===== 输出 =====
const byArea = {};
for (const r of rows) (byArea[r.area] = byArea[r.area] || []).push(r);

console.log('=== 场景级 QTE 总览 ===');
console.log('场景级 QTE 共 ' + rows.length + ' 处，分布在 ' + Object.keys(byArea).length + ' 个区域/文件');
const kinds = {}; for (const r of rows) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
console.log('写法分布: ' + Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(' / '));
console.log('选项级 QTE（choice.timeout）共 ' + choiceLevel.length + ' 处（另计）\n');
console.log('--- 按区域 ---');
Object.entries(byArea).sort((a, b) => b[1].length - a[1].length).forEach(([a, list]) => console.log(`  ${a}: ${list.length}`));

const isDyn = r => r.kind === '动态函数' || r.kind === '追逐工厂(函数)';

console.log('\n--- 动态/工厂型 QTE 明细（源码规则）---');
for (const r of rows) {
  if (!isDyn(r)) continue;
  const probe = r.timeoutOk ? `求值 ${(r.timeoutMs / 1000).toFixed(1)}s（${r.hitState}）→ ${r.onTimeout}` : `探测: ${r.timeoutNote || r.timeoutErr || '未知'}`;
  console.log(`\n  [${r.area}] ${r.id}  (${r.kind})`);
  console.log(`    源码: ${r.src}`);
  console.log(`    ${probe}`);
}

console.log('\n--- 静态/过场节点 QTE 明细 ---');
for (const [a, list] of Object.entries(byArea).sort((x, y) => y[1].length - x[1].length)) {
  const st = list.filter(r => !isDyn(r));
  if (!st.length) continue;
  console.log(`\n【${a}】${st.length} 处`);
  for (const r of st) {
    const t = r.timeoutOk ? (r.timeoutMs / 1000).toFixed(1) + 's' : ('⚠' + (r.timeoutExpr || r.timeoutErr || '?'));
    console.log(`  - ${r.id} | ${t} | → ${r.onTimeout} | ${r.hidden ? '隐藏进度条' : '显示进度条'}${r.typewriter ? ' / 过场打字机' : ''} | ${r.choiceCount === 0 ? '无选项' : '选项' + r.choiceCount + '个'}`);
  }
}

const hid = rows.filter(r => r.hidden).length;
console.log('\n--- 交叉统计 ---');
console.log('  显示进度条: ' + (rows.length - hid) + ' | 隐藏进度条(hidden): ' + hid);
console.log('  有选项: ' + rows.filter(r => r.choiceCount > 0).length + ' | 无选项(纯过场): ' + rows.filter(r => r.choiceCount === 0).length);
const toMap = {};
for (const r of rows) { if (isDyn(r)) continue; const k = String(r.onTimeout); toMap[k] = (toMap[k] || 0) + 1; }
console.log('  静态/过场型超时去向:');
Object.entries(toMap).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`    ${k}: ${v}`));

const nums = rows.filter(r => !isDyn(r) && r.timeoutOk && typeof r.timeoutMs === 'number').map(r => r.timeoutMs);
if (nums.length) {
  const sum = nums.reduce((a, b) => a + b, 0);
  console.log(`  静态对象型 timeout: 最小 ${Math.min(...nums)/1000}s / 最大 ${Math.max(...nums)/1000}s / 均值 ${(sum/nums.length/1000).toFixed(1)}s`);
  const dist = {};
  for (const n of nums) { const s = n / 1000; const b = s <= 5 ? '≤5s' : s <= 8 ? '6-8s' : s <= 12 ? '9-12s' : s <= 15 ? '13-15s' : s <= 20 ? '16-20s' : '>20s'; dist[b] = (dist[b] || 0) + 1; }
  console.log('  时长分布: ' + Object.entries(dist).map(([k, v]) => `${k}:${v}`).join(' '));
}
console.log('\n--- 选项级 QTE（choice.timeout）分布 ---');
const cByArea = {}; for (const c of choiceLevel) cByArea[c.area] = (cByArea[c.area] || 0) + 1;
Object.entries(cByArea).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

fs.writeFileSync(path.join(ROOT, 'tools', 'qte_report.json'), JSON.stringify({ sceneLevel: rows, choiceLevel }, null, 2), 'utf8');
console.log('\n已写出 tools/qte_report.json');

// ===== Markdown 报告 =====
const L = [];
const sec = (s) => L.push('\n## ' + s + '\n');
L.push('# 场景级 QTE 分布报告\n');
L.push('> 由 `node tools/qte_report.js` 自动生成（口径：场景对象自带 `qte` 属性，见 engine.js:822）。');
L.push('> 选项级 QTE（`choice.timeout`，即闪色输入题）另计，见文末。\n');

sec('一、总览');
L.push('| 项目 | 数量 |');
L.push('| --- | --- |');
L.push(`| 场景级 QTE 总数 | **${rows.length}** |`);
L.push(`| 涉及区域/文件 | ${Object.keys(byArea).length} |`);
L.push(`| 写法：静态对象 | ${rows.filter(r => r.kind === '静态对象').length} |`);
L.push(`| 写法：追逐工厂（闭包函数） | ${rows.filter(r => r.kind === '追逐工厂(函数)').length} |`);
L.push(`| 写法：条件动态函数 | ${rows.filter(r => r.kind === '动态函数').length} |`);
L.push(`| 写法：过场工厂 travelScene | ${rows.filter(r => r.kind === '过场工厂(travelScene)').length} |`);
L.push(`| 显示进度条 / 隐藏进度条 | ${rows.length - hid} / ${hid} |`);
L.push(`| 有选项 / 无选项（纯过场） | ${rows.filter(r => r.choiceCount > 0).length} / ${rows.filter(r => r.choiceCount === 0).length} |`);
L.push(`| 选项级 QTE（另计） | ${choiceLevel.length} |`);

sec('二、按区域分布');
L.push('| 区域/文件 | 场景级 QTE | 其中动态触发 |');
L.push('| --- | --- | --- |');
for (const [a, list] of Object.entries(byArea).sort((x, y) => y[1].length - x[1].length)) {
  const dyn = list.filter(isDyn).length;
  L.push(`| ${a} | ${list.length} | ${dyn || '-'} |`);
}

sec('三、机制分类');
L.push('### 3.1 追逐工厂（42 处）——被丧尸追时才启动\n');
L.push('`mallQTE(base, target)`（新达汇，28 处，base=20000）与 `jpChaseQTE(pred)`（建平，14 处，表达式 `20000 - ch*2000`）规则一致：');
L.push('`chasedByZombies <= 0` 时返回 `null`（不启动 QTE）；触发后 `timeout = max(2000, 20000 - ch*2000)`。\n');
L.push('| 追逐层数 ch | 时限 |');
L.push('| --- | --- |');
for (let ch = 1; ch <= 9; ch++) L.push(`| ${ch} | ${(Math.max(2000, 20000 - ch * 2000) / 1000).toFixed(1)}s |`);
L.push(`\n| 场景 | 工厂 | 追加守卫 |`);
L.push('| --- | --- | --- |');
for (const r of rows.filter(r => r.kind === '追逐工厂(函数)')) {
  let guard = '—';
  const gm = /^\s*\w+\s*\(([\s\S]*)\)\s*$/.exec(r.src || '');
  if (gm && gm[1].trim()) guard = compact(gm[1]);
  L.push(`| ${r.id} | ${r.factory} | ${guard} |`);
}

L.push('\n### 3.2 条件动态函数（4 处）——满足特定状态才倒计时\n');
L.push('| 场景 | 触发条件与时限（源码） | 基准时限 | 满追(ch=3) | 超时去向 |');
L.push('| --- | --- | --- | --- | --- |');
for (const r of rows.filter(r => r.kind === '动态函数')) {
  const om = /onTimeout\s*:\s*["']([^"']+)["']/.exec(r.src || '');
  const target = om ? om[1] : r.onTimeout;
  const base = r.timeoutOk ? `${(r.timeoutMs / 1000).toFixed(1)}s（${r.hitState}）` : '需特定状态';
  const chase = typeof r.chaseMs === 'number' ? (r.chaseMs / 1000).toFixed(1) + 's' : '—';
  L.push(`| ${r.id} | \`${r.src}\` | ${base} | ${chase} | ${target} |`);
}

L.push('\n### 3.3 过场工厂 travelScene（4 处）——纯自动播放，不进历史\n');
L.push('`travelScene()` 生成过场节点：`hidden:true + typewriter:true`，时限 = `max(2000, 正文字数 × 50ms)`，超时自动跳下一个场景。引擎对无选项的隐藏 QTE 节点不入档。\n');
L.push('| 场景 | 时限 | 超时去向 |');
L.push('| --- | --- | --- |');
for (const r of rows.filter(r => r.kind === '过场工厂(travelScene)')) L.push(`| ${r.id} | ${(r.timeoutMs / 1000).toFixed(1)}s | ${r.onTimeout} |`);

L.push('\n### 3.4 静态对象（40 处）——进入即倒计时\n');
for (const [a, list] of Object.entries(byArea).sort((x, y) => y[1].length - x[1].length)) {
  const st = list.filter(r => !isDyn(r));
  if (!st.length) continue;
  L.push(`\n**【${a}】${st.length} 处**\n`);
  L.push('| 场景 | 时限 | 超时去向 | 进度条 | 选项数 |');
  L.push('| --- | --- | --- | --- | --- |');
  for (const r of st) {
    const t = r.timeoutOk ? (r.timeoutMs / 1000).toFixed(1) + 's' : ('⚠ ' + (r.timeoutExpr || r.timeoutErr || '?'));
    L.push(`| ${r.id} | ${t} | ${r.onTimeout} | ${r.hidden ? '隐藏' : '显示'} | ${r.choiceCount === 0 ? '无（过场）' : r.choiceCount} |`);
  }
}

// 时长分布（静态对象 + 过场，排除动态）
const nums2 = rows.filter(r => !isDyn(r) && r.timeoutOk && typeof r.timeoutMs === 'number').map(r => r.timeoutMs);
sec('四、时限分布（静态/过场型，不含动态触发）');
if (nums2.length) {
  L.push(`最小 ${Math.min(...nums2) / 1000}s ｜ 最大 ${Math.max(...nums2) / 1000}s ｜ 均值 ${(nums2.reduce((a, b) => a + b, 0) / nums2.length / 1000).toFixed(1)}s\n`);
  const bins = [['≤3s', 0, 3000], ['4-5s', 3001, 5000], ['6-8s', 5001, 8000], ['9-12s', 8001, 12000], ['13-15s', 12001, 15000], ['16-20s', 15001, 20000], ['>20s', 20001, 1e9]];
  L.push('| 区间 | 数量 | 场景 |');
  L.push('| --- | --- | --- |');
  for (const [name, lo, hi] of bins) {
    const g = rows.filter(r => !isDyn(r) && r.timeoutOk && r.timeoutMs >= lo && r.timeoutMs <= hi);
    if (!g.length) continue;
    L.push(`| ${name} | ${g.length} | ${g.map(r => r.id).join('、')} |`);
  }
}

sec('五、超时去向汇总（静态/过场型）');
L.push('| 超时去向 | 次数 |');
L.push('| --- | --- |');
Object.entries(toMap).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => L.push(`| ${k} | ${v} |`));

sec('六、选项级 QTE（choice.timeout，闪色输入题）');
L.push('共 ' + choiceLevel.length + ' 处，全部是 memory-game 闪色输入（input 选项 + timeoutScene）。\n');
L.push('| 区域 | 数量 |');
L.push('| --- | --- |');
Object.entries(cByArea).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => L.push(`| ${k} | ${v} |`));
L.push('\n| 场景 | timeout | 超时去向 |');
L.push('| --- | --- | --- |');
for (const c of choiceLevel) L.push(`| ${c.id} | ${JSON.stringify(c.timeout)} | ${c.timeoutScene} |`);

sec('七、观察与备注');
const top2 = Object.entries(byArea).sort((a, b) => b[1].length - a[1].length).slice(0, 2);
const top2sum = top2.reduce((a, b) => a + b[1].length, 0);
L.push(`1. **集中度**：${top2.map(x => x[0]).join(' + ')} 合计 ${top2sum} 处，占全部场景级 QTE 的 ${Math.round(top2sum / rows.length * 100)}%，且全部是"被追才触发"的追逐工厂——这两张地图是追逐压力的主战场。`);
const zjChoice = choiceLevel.filter(c => c.area === '张江').length;
L.push(`2. **张江没有任何战斗型场景级 QTE**：全图只有 2 处、且都是 travelScene 过场；战斗压力完全由选项级闪色 QTE 承担（${zjChoice} 处，占选项级总量的 ${Math.round(zjChoice / choiceLevel.length * 100)}%）——与东明街道"场景级倒计时"的设计取向明显不同。`);
const shortest = rows.filter(r => !isDyn(r) && r.timeoutOk).sort((a, b) => a.timeoutMs - b.timeoutMs).slice(0, 3);
L.push(`3. **最短时限**：${shortest.map(r => `${r.id} ${(r.timeoutMs / 1000).toFixed(1)}s`).join('、')}——都集中在"秒级闪避/投掷"的即时反应桥段。`);
const noChoiceList = rows.filter(r => r.choiceCount === 0);
L.push(`4. **无选项的纯过场 QTE（${noChoiceList.length} 处）**：${noChoiceList.map(r => r.id).join('、')}。其中 4 处是 travelScene 过场（引擎不入档），五金店那处是自动播放的死亡结局场景。`);
const hiddenReal = rows.filter(r => r.hidden && r.kind !== '过场工厂(travelScene)');
L.push(`5. **真·隐藏倒计时（${hiddenReal.length} 处）**：${hiddenReal.map(r => `${r.id}(${(r.timeoutMs / 1000).toFixed(0)}s)`).join('、')}——玩家看不到剩余时间，压力最大。`);
L.push(`6. **超时去向高度集中**："结局-被丧尸扑倒咬死" ${toMap['结局-被丧尸扑倒咬死'] || 0} 次 + "结局-丧尸的围殴" ${toMap['结局-丧尸的围殴'] || 0} 次，合计 ${(toMap['结局-被丧尸扑倒咬死'] || 0) + (toMap['结局-丧尸的围殴'] || 0)} 处指向这两个共享结局节点。`);
L.push(`7. **追逐工厂是可缺席的**：42 处追逐 QTE 都要求 \`chasedByZombies > 0\`，玩家全程不被追时它们完全不出现——这是设计上的"减负开关"，也让该机制的覆盖率随玩法浮动。`);

fs.writeFileSync(path.join(ROOT, 'tools', '场景级QTE分布报告.md'), L.join('\n') + '\n', 'utf8');
console.log('已写出 tools/场景级QTE分布报告.md');
