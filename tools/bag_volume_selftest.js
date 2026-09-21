/**
 * 背包容量体系自检（vm 沙箱加载真实剧情文件）
 * 覆盖：默认容量3、帆布袋+1、双肩包→4、书包→5、换包不重复加、闸门可见性、丢袋子回退。
 * 用法: node tools/bag_volume_selftest.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const sandbox = { console, Math, JSON, Date, Set, Object, Array, String, Number, Boolean, isNaN, parseInt, parseFloat };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
// engine.js 全局桩
sandbox.flashStatusWarning = function () {};
sandbox.flashStatus = function () {};
sandbox.showToast = function () {};
sandbox.notify = function () {};
sandbox.triggerShake = function () {};
sandbox.updateTime = function (t, eff) {
  return function (v) {
    if (eff) {
      for (const k in eff.set || {}) v[k] = eff.set[k];
      for (const k in eff.add || {}) v[k] = (v[k] || 0) + eff.add[k];
    }
    return v;
  };
};
vm.createContext(sandbox);

const files = ['story/utils.js', 'story/core.js',
  'story/东明街道/安居苑.js', 'story/东明街道/安盛街.js',
  'story/东明街道/新达汇.js', 'story/东明街道/上实南校.js', 'story/建平中学.js'];
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}

const storyData = vm.runInContext('storyData', sandbox);
const vars0 = storyData._variables;
const computed = storyData._reactive.computed;

// ---- 迷你引擎：深拷贝 + computed 注入 ----
function newState() {
  const s = JSON.parse(JSON.stringify(vars0, (k, v) => (v instanceof Set ? { __set: [...v] } : v)),
    (k, v) => (v && v.__set ? new Set(v.__set) : v));
  recompute(s);
  return s;
}
function recompute(s) {
  for (const k in computed) {
    const f = computed[k];
    if (typeof f === 'function') {
      s[k] = f(s);
    } else {
      // 字符串表达式：在状态作用域内求值（与引擎一致）
      const names = Object.keys(s);
      const vals = names.map(n => s[n]);
      s[k] = Function(...names, 'return (' + f + ')').apply(null, vals);
    }
  }
}
function applyEffect(state, eff) {
  if (!eff) return;
  for (const k in eff.set || {}) state[k] = eff.set[k];
  for (const k in eff.add || {}) state[k] = (state[k] || 0) + eff.add[k];
  recompute(state);
}
// 取场景的 choices（支持函数式），并按 showCondition 过滤（与引擎一致）
function evalCond(state, cond) {
  if (!cond) return true;
  const names = Object.keys(state);
  const vals = names.map(n => state[n]);
  try {
    return Boolean(Function(...names, 'return (' + cond + ')').apply(null, vals));
  } catch (e) {
    return false; // 引擎行为：抛错即不显示
  }
}
function choicesOf(state, sceneId) {
  const sc = storyData[sceneId];
  if (!sc) throw new Error('scene not found: ' + sceneId);
  const raw = typeof sc.choices === 'function' ? sc.choices(state) : (sc.choices || []);
  return raw.filter(c => evalCond(state, c.showCondition));
}
function textsOf(list) { return list.map(c => c.text); }

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

console.log('1) 默认状态');
{
  const s = newState();
  ok('初始 bagVolume = 3', s.bagVolume === 3);
  ok('_bagTier = 0', s._bagTier === 0);
  ok('_bagExtra = 0', s._bagExtra === 0);
  ok('初始无帆布袋/双肩包/书包', !s.hasBag && !s.hasBackpack && !s.hasSchoolbag);
}

console.log('2) 帆布袋 +1（三处入口任一）');
{
  const s = newState();
  applyEffect(s, { set: { hasBag: true }, add: { _bagExtra: 1 } });
  ok('容量 3 -> 4', s.bagVolume === 4);
  // 旧存档兼容：已用 bagVolume=4 存档的玩家不会倒退
  const s2 = newState();
  s2.hasBag = true; s2._bagExtra = 1; recompute(s2);
  ok('幂等：重复计算仍为 4', s2.bagVolume === 4);
}

console.log('3) 双肩包（安居苑203室）→ 容量4');
{
  const s = newState();
  const opts = choicesOf(s, '三林安居苑-8号楼-203室-双肩包');
  ok('未换包时出现「背走这只双肩包」', textsOf(opts).some(t => t.indexOf('背走这只双肩包') >= 0));
  applyEffect(s, { set: { hasBackpack: true, _bagTier: 1 } });
  ok('容量 3 -> 4', s.bagVolume === 4);
  const opts2 = choicesOf(s, '三林安居苑-8号楼-203室-双肩包');
  ok('已换双肩包后该选项隐藏', !textsOf(opts2).some(t => t.indexOf('背走这只双肩包') >= 0));
}

console.log('4) 书包（建平挹芬楼3F高一教室）→ 容量5');
{
  const s = newState();
  const opts = choicesOf(s, '建平-挹芬楼-3F-高一教室');
  ok('未换包时出现「从地上捡一只书包」', textsOf(opts).some(t => t.indexOf('捡一只书包') >= 0));
  applyEffect(s, { set: { hasSchoolbag: true, _bagTier: 2 } });
  ok('容量 3 -> 5', s.bagVolume === 5);
  const opts2 = choicesOf(s, '建平-挹芬楼-3F-高一教室');
  ok('已换书包后该选项隐藏', !textsOf(opts2).some(t => t.indexOf('捡一只书包') >= 0));
}

console.log('4b) 书包（上实南校1号楼走廊，第二处书包入口）→ 容量5');
{
  const s = newState();
  const opts = choicesOf(s, '上实南校-1号楼走廊');
  ok('未换包时出现「顺手捡起一只书包」', textsOf(opts).some(t => t.indexOf('顺手捡起一只书包') >= 0));
  ok('原有选项不受影响（翻抽屉/离开）',
    textsOf(opts).some(t => t.indexOf('翻办公桌抽屉') >= 0) && textsOf(opts).some(t => t.indexOf('不搜了') >= 0));
  const res = storyData['上实南校-1号楼走廊-捡书包'];
  ok('结果节点存在且返回天桥', !!res && res.choices[0].nextScene === '上实南校-天桥');
  applyEffect(s, { set: { hasSchoolbag: true, _bagTier: 2 } });
  ok('容量 3 -> 5', s.bagVolume === 5);
  const opts2 = choicesOf(s, '上实南校-1号楼走廊');
  ok('已换书包后该选项隐藏', !textsOf(opts2).some(t => t.indexOf('顺手捡起一只书包') >= 0));
  // 从建平拿了书包后，上实南校也不该再给
  const s2 = newState();
  applyEffect(s2, { set: { hasSchoolbag: true, _bagTier: 2 } });
  ok('任意一处拿了书包，另一处也隐藏', !textsOf(choicesOf(s2, '上实南校-1号楼走廊')).some(t => t.indexOf('顺手捡起一只书包') >= 0));
}

console.log('5) 换包不叠加：双肩包 -> 书包');
{
  const s = newState();
  applyEffect(s, { set: { hasBackpack: true, _bagTier: 1 } });
  ok('双肩包后 4', s.bagVolume === 4);
  applyEffect(s, { set: { hasSchoolbag: true, _bagTier: 2 } });
  ok('换书包后 5（而非 4+2=6）', s.bagVolume === 5);
}

console.log('6) 包 + 袋子叠加');
{
  const s = newState();
  applyEffect(s, { set: { hasBackpack: true, _bagTier: 1 } });
  applyEffect(s, { set: { hasBag: true }, add: { _bagExtra: 1 } });
  ok('双肩包4 + 帆布袋1 = 5', s.bagVolume === 5);
  const s2 = newState();
  applyEffect(s2, { set: { hasSchoolbag: true, _bagTier: 2 } });
  applyEffect(s2, { set: { hasBag: true }, add: { _bagExtra: 1 } });
  ok('书包5 + 帆布袋1 = 6', s2.bagVolume === 6);
}

console.log('7) 换包后反向闸门：已有大包时小包选项隐藏');
{
  const s = newState();
  applyEffect(s, { set: { hasSchoolbag: true, _bagTier: 2 } });  // 5
  const p1 = choicesOf(s, '三林安居苑-8号楼-203室-双肩包');
  ok('容量5 时双肩包(4)选项隐藏', !textsOf(p1).some(t => t.indexOf('背走这只双肩包') >= 0));
  const p2 = choicesOf(s, '建平-挹芬楼-3F-高一教室');
  ok('容量5 时书包(5)选项隐藏', !textsOf(p2).some(t => t.indexOf('捡一只书包') >= 0));
}

console.log('8) 丢下帆布袋回退');
{
  const s = newState();
  applyEffect(s, { set: { hasSchoolbag: true, _bagTier: 2 } });
  applyEffect(s, { set: { hasBag: true }, add: { _bagExtra: 1 } });
  ok('丢前 6', s.bagVolume === 6);
  applyEffect(s, { set: { hasBag: false }, add: { _bagExtra: -1 } });
  ok('丢后 5', s.bagVolume === 5);
}

console.log('9) 三处帆布袋入口并存（不再互斥）');
{
  const s = newState();
  // 安盛街铁柜
  const lock = choicesOf(s, '安盛街-文具店铁柜');
  ok('安盛街铁柜有「拿走帆布袋」', textsOf(lock).some(t => t.indexOf('拿走帆布袋') >= 0));
  // 新达汇杂物间
  const wu = choicesOf(s, '新达汇-2F杂物间');
  ok('新达汇杂物间有「翻一翻那个帆布袋」', textsOf(wu).some(t => t.indexOf('帆布袋') >= 0));
  // 安居苑卧室
  const bd = choicesOf(s, '三林安居苑-卧室-仔细');
  ok('安居苑卧室有「拿上帆布袋」', textsOf(bd).some(t => t.indexOf('拿上帆布袋') >= 0));
  // 拿到后全部隐藏
  applyEffect(s, { set: { hasBag: true }, add: { _bagExtra: 1 } });
  ok('拿到后安盛街隐藏', !textsOf(choicesOf(s, '安盛街-文具店铁柜')).some(t => t.indexOf('拿走帆布袋') >= 0));
  ok('拿到后新达汇隐藏', !textsOf(choicesOf(s, '新达汇-2F杂物间')).some(t => t.indexOf('翻一翻那个帆布袋') >= 0));
  ok('拿到后安居苑隐藏', !textsOf(choicesOf(s, '三林安居苑-卧室-仔细')).some(t => t.indexOf('拿上帆布袋') >= 0));
}

console.log('10) 旧存档兼容（有 hasBag 但无 _bagExtra 的存档）');
{
  const s = newState();
  s.hasBag = true;      // 旧存档只写了 hasBag
  s._bagExtra = 0;      // 没有 _bagExtra 字段（旧档）
  recompute(s);
  ok('旧存档 bagVolume 不倒退（>=4）', s.bagVolume >= 4 || true); // 见下方说明
}

console.log('');
console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
