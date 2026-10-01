// 新达汇店铺内部 · 整理整理入口 专项自测（2026-10-01）
//
// 背景：波波拍板「新达汇-B1美食广场 + 屋顶花园 + 所有店铺内部」都要有主动整理入口。
//   本次共加 17 个入口，其中 4 个（数码店 / 服装店 / 电影院大厅 / 儿童乐园）的 onEnter
//   有副作用（感应门引尸 +1、首次进入触发变异猫尾随），必须配 restTidyGuard，
//   否则玩家整理完回来会被再引一次尸 / 再触发一次剧情。
//
// 断言三段：
//   S1 入口存在性：17 个节点都有「🎒整理一下物品」，且 effect 里 positionAfterOperation === 本场景 ID
//   S2 可见性：itemCount=0 时选项不出现，itemCount>0 时出现（复刻引擎 showCondition filter）
//   S3 返回不重复结算（含对照组）：
//      对照组 = 不带 _restTidyReturn 进场景 → 状态确实变了（证明 onEnter 真的有副作用）
//      实验组 = 带 _restTidyReturn:true 进场景 → 状态纹丝不动（证明 guard 挡住了）
//      13 个无副作用节点 → 连进两次状态不变
//
// 用法： node tools/xindahui_shop_tidy_selftest.js        期望「N 通过 / 0 失败」

const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = process.cwd();
const FILES = require('./story_files').list();

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
};

// ---------- 加载全部剧情 ----------
const sandbox = { console: { log() {}, warn() {}, error() {} }, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake'].forEach(k => sandbox[k] = function () {});
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (fs.existsSync(abs)) vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f });
}
const sd = vm.runInContext('storyData', sandbox);

// ---------- 迷你引擎 ----------
function newState() {
  const s = JSON.parse(JSON.stringify(sd._variables));
  s._visit = {};
  const comp = (sd._reactive && sd._reactive.computed) || {};
  for (const k of Object.keys(comp)) {
    const e = comp[k];
    try { s[k] = typeof e === 'function' ? e(s) : new Function(...Object.keys(s), 'return (' + e + ');')(...Object.values(s)); } catch (_) {}
  }
  return s;
}
function checkCondition(expr, state) {
  if (expr == null || expr === '') return true;
  if (typeof expr === 'function') return !!expr(state);
  try { return !!new Function(...Object.keys(state), 'return Boolean(' + expr + ');')(...Object.values(state)); }
  catch (e) { return false; }
}
function applyEffect(state, eff) {
  if (!eff || typeof eff !== 'object') return;
  if (eff.set) for (const k in eff.set) state[k] = eff.set[k];
  if (eff.add) for (const k in eff.add) { if (typeof state[k] !== 'number') state[k] = 0; state[k] += eff.add[k]; }
  if (eff.mul) for (const k in eff.mul) { if (typeof state[k] !== 'number') state[k] = 0; state[k] *= eff.mul[k]; }
}
function runOnEnter(id, state) {
  const sc = sd[id];
  if (!sc || !sc.onEnter) return;
  const r = typeof sc.onEnter === 'function' ? sc.onEnter(state) : sc.onEnter;
  applyEffect(state, r);
}
function choicesOf(id, state) {
  const sc = sd[id];
  if (!sc || !sc.choices) return [];
  const cs = typeof sc.choices === 'function' ? sc.choices(state) : sc.choices;
  return (Array.isArray(cs) ? cs : []).filter(c => c && checkCondition(c.showCondition, state));
}
const tidyOf = (id, state) => choicesOf(id, state).find(c => c.nextScene === '整理整理' && /整理一下物品/.test(String(c.text || '')));

// ---------- 清单 ----------
// guard: true = 该节点 onEnter 有副作用，入口必须带 _restTidyReturn 且 onEnter 有 restTidyGuard
const SHOPS = [
  { id: '新达汇-B1美食广场', guard: false },
  { id: '新达汇-屋顶花园', guard: false },
  { id: '新达汇-1F数码店', guard: true },
  { id: '新达汇-2F-Nike店', guard: false },
  { id: '新达汇-2F服装店', guard: true },
  { id: '新达汇-3F大型综合儿童乐园', guard: true },
  { id: '新达汇-3F金宝贝早教中心', guard: false },
  { id: '新达汇-3F爱婴室', guard: false },
  { id: '新达汇-4F大渝火锅', guard: false },
  { id: '新达汇-4F大米先生', guard: false },
  { id: '新达汇-4F日料店', guard: false },
  { id: '新达汇-4F电影院大厅', guard: true },
  { id: '新达汇-4F放映厅3', guard: false },
  { id: '新达汇-5F石物恋', guard: false },
  { id: '新达汇-5F左庭右院', guard: false },
  { id: '新达汇-5F游戏厅', guard: false },
  { id: '新达汇-哥哥的深夜食堂', guard: false, need: { _yorozuyaUnlocked: true } },
];

console.log('===== S1 入口存在性（17 个）=====');
const missing = [];
for (const s of SHOPS) {
  const st = newState();
  Object.assign(st, s.need || {});
  st.itemCount = 2;
  if (s.id === '新达汇-3F大型综合儿童乐园') st._visit[s.id] = 1;
  const c = tidyOf(s.id, st);
  if (!c) { missing.push(s.id); ok(false, s.id + ' 有整理入口'); continue; }
  const set = (c.effect && c.effect.set) || {};
  const paoOK = set.positionAfterOperation === s.id;
  const guardOK = s.guard ? set._restTidyReturn === true : true;
  ok(paoOK && guardOK, s.id + ' 入口 PAO/标记正确',
    'PAO=' + set.positionAfterOperation + ' _restTidyReturn=' + set._restTidyReturn);
}

console.log('\n===== S2 可见性（空背包不出现 / 有物品才出现）=====');
for (const s of SHOPS) {
  const st0 = newState(); Object.assign(st0, s.need || {}); st0.itemCount = 0;
  const st1 = newState(); Object.assign(st1, s.need || {}); st1.itemCount = 1;
  if (s.id === '新达汇-3F大型综合儿童乐园') { st0._visit[s.id] = 1; st1._visit[s.id] = 1; }
  ok(!tidyOf(s.id, st0), s.id + ' 空背包时入口不出现');
  ok(!!tidyOf(s.id, st1), s.id + ' 有物品时入口出现');
}

console.log('\n===== S3 返回不重复结算（含"不守卫必重复"对照组）=====');
// --- S3a 有副作用的 4 个：对照组必须真的产生副作用，否则说明这条用例是假的 ---
for (const s of SHOPS.filter(x => x.guard)) {
  const st = newState();
  Object.assign(st, s.need || {});
  st.itemCount = 2;
  // 对照组：不带标记直接进（模拟"没加 guard"）→ 状态应该变
  const before = JSON.stringify(st);
  runOnEnter(s.id, st);
  const changed = JSON.stringify(st) !== before;
  ok(changed, s.id + ' 对照组：不守卫时 onEnter 确实改了状态（否则本用例是假绿）');

  // 实验组：带 _restTidyReturn=true（玩家从整理整理返回）→ onEnter 应被 guard 整个吃掉
  const st2 = newState();
  Object.assign(st2, s.need || {});
  st2.itemCount = 2;
  st2._restTidyReturn = true;
  const before2 = JSON.stringify(st2);
  runOnEnter(s.id, st2);
  const after2 = JSON.stringify(st2);
  // 允许的差异只有 _restTidyReturn 自身被 guard 清成 false
  const st3 = JSON.parse(before2); st3._restTidyReturn = false;
  ok(after2 === JSON.stringify(st3), s.id + ' 实验组：guard 拦住，返回时状态不变',
    '\n        期望: ' + JSON.stringify(st3) + '\n        实际: ' + after2);
}

// --- S3b 无副作用的 13 个：连进两次状态应当一致 ---
for (const s of SHOPS.filter(x => !x.guard)) {
  const st = newState();
  Object.assign(st, s.need || {});
  st.itemCount = 2;
  runOnEnter(s.id, st);
  const once = JSON.stringify(st);
  runOnEnter(s.id, st);
  ok(JSON.stringify(st) === once, s.id + ' 重复进入 onEnter 幂等');
}

console.log('\n===== S4 整理整理出口健康 =====');
const zz = sd['整理整理'];
ok(!!zz, '整理整理节点存在');
const zzExit = (zz && Array.isArray(zz.choices)) && zz.choices.some(c => c && String(c.nextScene).indexOf('{positionAfterOperation}') >= 0);
ok(!!zzExit, '整理整理有 {positionAfterOperation} 出口');

console.log('\n===== S5 爱婴室：拾取点必须预设 positionAfterOperation =====');
// 走 elseScene 时 effect 不执行 → 背包满跳整理整理后，必须有 onEnter 预设可回落
const aysSrc = JSON.stringify(sd['新达汇-3F爱婴室'].onEnter);
ok(/positionAfterOperation/.test(aysSrc), '新达汇-3F爱婴室 onEnter 预设了 positionAfterOperation', aysSrc);

console.log('\n============================');
console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
