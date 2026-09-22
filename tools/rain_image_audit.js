// 户外节点雨天表现覆盖审计
// 规则：每个 outdoor: true 的节点，三选一满足其一
//   ① image 是 placeholder.png（占位图，等美术，雨天无所谓）
//   ② onEnter 开启了 showRain（雨天叠加雨滴特效，盖在普通图上）
//   ③ image 是特地设计的雨天图（路径含「雨」，含 -雨.webp / -雨天.webp / -雨天-night.webp 等变体）
// 三者都不满足 → 雨天会拿晴天图且无雨滴叠加，视觉不一致 → 报出。
//
// 用法：node tools/rain_image_audit.js   （在项目根目录执行）
// 扫描范围：story/东明街道/*.js（不含建平/仁济/张江），并附带共享文件 core/utils/夜晚剧情 与 上海市区路径 的户外节点。

const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = process.cwd();
const BASE_FILES = ['story/utils.js', 'story/core.js', 'story/夜晚剧情.js'];
const SCOPE_DIR = 'story/东明街道';
const TAIL_FILES = ['story/上海市区路径.js'];

const scopeFiles = fs.readdirSync(path.join(ROOT, SCOPE_DIR))
  .filter(f => f.endsWith('.js'))
  .map(f => path.posix.join(SCOPE_DIR, f));

const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
sandbox.flashStatusWarning = function () {};
sandbox.flashStatus = function () {};
sandbox.showToast = function () {};
sandbox.notify = function () {};
sandbox.triggerShake = function () {};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const sourceOf = {};
function keysNow() {
  try { return vm.runInContext('typeof storyData!=="undefined"?Object.keys(storyData):[]', sandbox); }
  catch (e) { return []; }
}
function loadFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log('缺失:', rel); return; }
  const before = new Set(keysNow());
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: rel }); }
  catch (e) { console.log('执行失败', rel, '→', e.message); }
  for (const k of keysNow()) if (!before.has(k)) sourceOf[k] = rel;
}

for (const f of BASE_FILES) loadFile(f);
for (const f of scopeFiles) loadFile(f);
for (const f of TAIL_FILES) loadFile(f);

const sd = vm.runInContext('storyData', sandbox);

// ---- 状态克隆（含 Set 还原）----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const BASE_STATE = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
function cloneState() { return JSON.parse(JSON.stringify(BASE_STATE, setReplacer), setReviver); }

// ---- 采样 image（扫 天气×时段 组合，覆盖 timeImage 分支）----
const WEATHERS = ['晴', '阴', '雨'];
const HOURS = [9, 17, 20, 1]; // morning / evening / night / midnight
function sampleImage(img) {
  if (typeof img === 'string') return [img];
  if (typeof img !== 'function') return [];
  const out = new Set();
  for (const w of WEATHERS) for (const hh of HOURS) {
    const v = cloneState();
    v.weather = w; v.hh = hh; v.mm = 0; v.windy = false;
    v._visit = {}; v._travelMinutes = 0; v._lastScene = '';
    try {
      const r = img(v);
      if (typeof r === 'string') out.add(r);
      else out.add('【非字符串返回: ' + String(r) + '】');
    } catch (e) { out.add('【ERR:' + e.message + '】'); }
  }
  return Array.from(out);
}

// ---- 判定 onEnter 是否开启 showRain ----
function onEnterEnablesRain(onEnter) {
  if (!onEnter) return false;
  if (typeof onEnter === 'object') return !!(onEnter.set && onEnter.set.showRain);
  if (typeof onEnter === 'function') {
    const v = cloneState(); v.showRain = false;
    v._visit = {}; v._travelMinutes = 0;
    try {
      const r = onEnter(v);
      if (v.showRain === true) return true;
      if (r && typeof r === 'object' && r.set && r.set.showRain) return true;
    } catch (e) { /* 采样失败按未开启处理 */ }
  }
  return false;
}

function classify(samples) {
  const hasPlaceholder = samples.some(s => /placeholder\.png/i.test(s));
  const rainPaths = samples.filter(s => /雨/.test(s));
  const realPaths = samples.filter(s => !/placeholder\.png/i.test(s) && !/^【/.test(s));
  const errs = samples.filter(s => /^【ERR/.test(s));
  return { hasPlaceholder, rainPaths, realPaths, errs };
}

const rows = [];
for (const key of Object.keys(sd)) {
  if (key.startsWith('_')) continue;
  const scene = sd[key];
  if (!scene || typeof scene !== 'object' || !scene.outdoor) continue;
  const file = sourceOf[key] || '（未知来源）';
  const samples = sampleImage(scene.image);
  const { hasPlaceholder, rainPaths, realPaths, errs } = classify(samples);
  const rain = onEnterEnablesRain(scene.onEnter);

  let verdict, reason;
  if (samples.length === 0) {
    verdict = 'FLAG'; reason = '无 image 字段（户外却无图）';
  } else if (errs.length && !realPaths.length && !hasPlaceholder) {
    verdict = 'FLAG'; reason = 'image 采样报错，无法判定';
  } else if (rainPaths.length) {
    verdict = 'OK'; reason = '有雨天专属图';
  } else if (rain) {
    verdict = 'OK'; reason = 'onEnter 开 showRain';
  } else if (hasPlaceholder) {
    verdict = 'OK'; reason = '占位图';
  } else if (realPaths.length) {
    verdict = 'FLAG'; reason = '普通图 + 无 showRain + 无雨天图';
  } else {
    verdict = 'FLAG'; reason = '未能识别';
  }

  rows.push({ key, file, verdict, reason, rain, samples, hasPlaceholder, rainPaths, realPaths, errs });
}

// ---- 输出 ----
const inScope = rows.filter(r => r.file.startsWith(SCOPE_DIR));
const outScope = rows.filter(r => !r.file.startsWith(SCOPE_DIR));

function pad(s, n) { s = String(s); let w = 0; for (const ch of s) w += (ch.charCodeAt(0) > 255 ? 2 : 1); return s + ' '.repeat(Math.max(0, n - w)); }

function printGroup(title, list) {
  console.log('\n' + title + '（' + list.length + ' 个户外节点）');
  console.log('-'.repeat(100));
  const flags = list.filter(r => r.verdict === 'FLAG');
  const oks = list.filter(r => r.verdict === 'OK');
  console.log('  ✔ 合规：' + oks.length + '　✘ 有问题：' + flags.length);
  if (flags.length) {
    console.log('\n  【需要处理】');
    for (const r of flags) {
      console.log('  ✘ ' + pad(r.key, 34) + ' │ ' + r.file.replace(/^story\//, ''));
      console.log('      判定：' + r.reason);
      console.log('      采样：' + (r.samples.length ? r.samples.join('  |  ') : '(无 image)'));
      if (r.errs.length) console.log('      报错：' + r.errs.join('  |  '));
      console.log('      showRain=' + r.rain);
    }
  }
  console.log('\n  【合规明细】');
  for (const r of oks) {
    const tag = r.rainPaths.length ? '雨天图' : (r.rain ? 'showRain' : '占位图');
    console.log('  ✔ ' + pad(r.key, 34) + ' │ ' + pad(tag, 9) + ' │ ' + r.file.replace(/^story\//, ''));
  }
}

console.log('============================================================');
console.log(' 户外节点雨天表现覆盖审计');
console.log(' 规则：image=placeholder.png ／ onEnter开showRain ／ 有雨天专属图');
console.log('============================================================');
printGroup('【主范围】东明街道 story/东明街道/*.js', inScope);
if (outScope.length) printGroup('【附带】共享文件 / 其他区域', outScope);

const allFlags = rows.filter(r => r.verdict === 'FLAG');
console.log('\n============================================================');
console.log(' 合计：' + rows.length + ' 个户外节点，' + allFlags.length + ' 个待处理');
console.log('============================================================');

// ================= 副检：image 函数返回非字符串（渲染必坏图） =================
// 典型病：var f = timeImage({...}); return f;   ← 漏了 (vars)，把工厂函数本身返回了
console.log('\n============================================================');
console.log(' 副检：image 返回非字符串（引擎 sceneImage.src 会变成函数源码 → 显示坏图）');
console.log('============================================================');
const brokenImgs = [];
for (const key of Object.keys(sd)) {
  if (key.startsWith('_')) continue;
  const scene = sd[key];
  if (!scene || typeof scene !== 'object') continue;
  if (typeof scene.image !== 'function') continue;
  const bad = [];
  for (const w of WEATHERS) for (const hh of HOURS) {
    const v = cloneState();
    v.weather = w; v.hh = hh; v.mm = 0; v.windy = false;
    v._visit = {}; v._travelMinutes = 0; v._lastScene = '';
    let r;
    try { r = scene.image(v); } catch (e) { bad.push(w + '/' + hh + ' → ERR:' + e.message); continue; }
    if (typeof r !== 'string') bad.push(w + '/' + hh + ' → ' + (typeof r) + (typeof r === 'function' ? '（疑似 timeImage 工厂漏调用）' : ''));
    else if (/^【/.test(r)) bad.push(w + '/' + hh + ' → ' + r);
  }
  if (bad.length) brokenImgs.push({ key, file: sourceOf[key] || '（未知来源）', bad: Array.from(new Set(bad)) });
}
if (!brokenImgs.length) console.log('（无）');
for (const b of brokenImgs) {
  const mark = b.file.startsWith(SCOPE_DIR) || b.file === 'story/夜晚剧情.js' ? '★' : '·';
  console.log(mark + ' ' + b.key + '  │ ' + b.file.replace(/^story\//, ''));
  console.log('    ' + b.bad.join('\n    '));
}
console.log('\n（★ = 东明街道及基础系统文件；· = 其他区域）');
