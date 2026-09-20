// 禁徒手战斗改造 · 冒烟自测（2026-09-20）
// 背景：安盛街-收银台 / 安盛街-食品店 / 三林菜市场-大厅 / 益丰大药房-柜台后 四处战斗
//       改为允许徒手攻击（收银台/食品店徒手=抓伤包：体力-2+汞负荷10+hurtByZombie）。
// 用法：node tools/unarmed_fight_selftest.js
// 原理：vm 沙箱加载真实 utils.js + 三个剧情文件，未识别全局自动补桩；对改动点做行为断言。

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'story/utils.js',
  'story/东明街道/安盛街.js',
  'story/东明街道/三林菜市场.js',
  'story/东明街道/益丰大药房.js',
];

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ok  ' + msg); }
  else { fail++; console.log('  FAIL ' + msg); }
}

const sandbox = {
  storyData: {},
  window: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console,
  Math, JSON, Date, Object, Array, String, Number, Boolean, RegExp, parseInt, parseFloat, isNaN,
};
vm.createContext(sandbox);

function loadFile(rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

// 逐个加载；遇到未定义全局就自动补桩重试（最多 40 轮）
for (const rel of FILES) {
  for (let i = 0; i < 40; i++) {
    try { loadFile(rel); break; }
    catch (e) {
      const m = /(\w+) is not defined/.exec(e.message);
      if (m && !(m[1] in sandbox)) {
        console.log('  [stub] ' + rel + ' -> ' + m[1]);
        sandbox[m[1]] = function () { return {}; };
        continue;
      }
      throw e;
    }
  }
}

const armed = { hasIronPipe: true, strength: 5, dd: 1, chasedByZombies: 0, itemCount: 0, weather: '晴' };
const unarmed = { strength: 5, dd: 1, chasedByZombies: 0, itemCount: 0, weather: '晴' };

const S = sandbox.storyData;

console.log('1) 安盛街-收银台：攻击选项对徒手可见');
{
  const sc = S['安盛街-收银台'];
  ok(!!sc, '场景存在');
  const atk = sc.choices.find(c => c.nextScene === '安盛街-文具店击杀');
  ok(!!atk, '攻击选项存在');
  ok(atk.showCondition === '!_stationeryZombieDead', 'showCondition 改为 !_stationeryZombieDead（修掉击杀后重进仍可再打的隐患）');
  ok(atk.condition === 'strength >= 3' && atk.elseScene === '结局-安盛街-文具店被反杀', '体力门槛与反杀结局保留');
  ok(atk.text(unarmed) === '赤手空拳按住它', '徒手选项文案="赤手空拳按住它"');
  ok(atk.text(armed) === '抄起铁管砸过去', '有武器选项文案="抄起铁管砸过去"');
}

console.log('2) 安盛街-文具店击杀：按武器分支结算');
{
  const sc = S['安盛街-文具店击杀'];
  const effA = sc.onEnter(Object.assign({}, armed));
  ok(effA.add && effA.add.strength === -1 && !effA.add.mercuryLoad && !(effA.set && effA.set.hurtByZombie), '有武器：体力-1，无抓伤');
  ok(effA.set && effA.set._stationeryZombieDead === true, '有武器：标记丧尸已死');
  const effU = sc.onEnter(Object.assign({}, unarmed));
  ok(effU.add && effU.add.strength === -2 && effU.add.mercuryLoad === 10, '徒手：体力-2、汞负荷+10');
  ok(effU.set && effU.set.hurtByZombie === true && effU.set._stationeryZombieDead === true, '徒手：hurtByZombie=true 且丧尸已死');
  const tU = sc.text(Object.assign({ hurtByZombie: true }, unarmed));
  const tA = sc.text(Object.assign({}, armed));
  ok(tU.indexOf('手背') >= 0 && tU.indexOf('体力-2') >= 0, '徒手文案含抓伤描述与体力-2');
  ok(tA.indexOf('体力-1') >= 0 && tA.indexOf('狠狠砸了下去') >= 0, '有武器文案保持原样');
}

console.log('3) 结局-安盛街-文具店被反杀：徒手措辞');
{
  const tU = S['结局-安盛街-文具店被反杀'].text(Object.assign({}, unarmed));
  const tA = S['结局-安盛街-文具店被反杀'].text(Object.assign({}, armed));
  ok(tU.indexOf('按了个空') >= 0, '徒手版本措辞生效');
  ok(tA.indexOf('擦过了丧尸的肩膀') >= 0, '有武器版本措辞不变');
}

console.log('4) 安盛街-食品店：徒手可战斗（去掉必死 elseScene）');
{
  const hub = S['安盛街-食品店内部'];
  ok(!!hub, '场景存在');
  const atk = hub.choices.find(c => c.nextScene === '安盛街-食品店战斗');
  ok(!!atk, '战斗选项存在');
  ok(atk.condition === undefined && atk.elseScene === undefined, 'condition/elseScene 已移除');
  ok(atk.text(unarmed) === '赤手空拳跟它拼了', '徒手选项文案不变');
  const sc = S['安盛街-食品店战斗'];
  const effA = sc.onEnter(Object.assign({}, armed));
  ok(effA.add && effA.add.strength === -1 && !(effA.set && effA.set.hurtByZombie), '有武器：体力-1，无抓伤');
  const effU = sc.onEnter(Object.assign({}, unarmed));
  ok(effU.add && effU.add.strength === -2 && effU.add.mercuryLoad === 10, '徒手：体力-2、汞负荷+10');
  ok(effU.set && effU.set.hurtByZombie === true, '徒手：hurtByZombie=true');
  const tU = sc.text(Object.assign({}, unarmed));
  ok(tU.indexOf('小臂') >= 0 && tU.indexOf('体力-2') >= 0 && tU.indexOf('两瓶水') >= 0, '徒手文案：抓伤+搜刮+体力-2');
  ok(sc.text(Object.assign({}, armed)).indexOf('体力-1') >= 0, '有武器文案保持原样');
}

console.log('5) 三林菜市场：大厅/潜行两入口徒手可解决');
{
  const hall = S['菜市场-大厅'];
  const csU = hall.choices(unarmed);
  const csA = hall.choices(armed);
  const pickU = csU.find(c => c.nextScene === '菜市场-大厅-清场');
  const pickA = csA.find(c => c.nextScene === '菜市场-大厅-清场');
  ok(!!pickU && !pickU.showCondition, '大厅入口：徒手可见且无 showCondition');
  ok(pickU.text(unarmed) === '上去把它彻底解决', '大厅入口徒手文案');
  ok(pickA.text(armed) === '用铁管把它彻底解决', '大厅入口有武器文案');
  const sneak = S['菜市场-大厅-潜行'];
  const sp = sneak.choices.find(c => c.nextScene === '菜市场-大厅-清场');
  ok(!sp.showCondition && sp.text(unarmed) === '上去把它彻底解决', '潜行入口：同样开放徒手');
  const tU = S['菜市场-大厅-清场'].text(Object.assign({}, unarmed));
  const tA = S['菜市场-大厅-清场'].text(Object.assign({}, armed));
  ok(tU.indexOf('骑住它的背') >= 0, '清场徒手文案生效');
  ok(tA.indexOf('举起铁管') >= 0, '清场有武器文案不变');
}

console.log('6) 益丰大药房-柜台后：只留体力门槛');
{
  const sc = S['益丰大药房-柜台后'];
  const atk = sc.choices.find(c => c.nextScene === '益丰大药房-击杀');
  ok(!!atk, '攻击选项存在');
  ok(atk.condition === 'strength >= 2' && atk.elseScene === '结局-益丰-被反杀', '条件改为 strength >= 2，反杀结局保留');
  const tU = S['益丰大药房-击杀'].text(Object.assign({}, unarmed));
  const tA = S['益丰大药房-击杀'].text(Object.assign({}, armed));
  ok(tU.indexOf('拳头照它后脑') >= 0 && tU.indexOf('碘伏棉签') >= 0, '击杀徒手文案生效，碘伏段保留');
  ok(tA.indexOf('举起铁管') >= 0, '击杀有武器文案不变');
  const eff = S['益丰大药房-击杀'].onEnter;
  ok(!!(eff && eff.set && eff.set.hurtByZombie === false), '击杀仍清 hurtByZombie（碘伏治疗既有抓伤）');
}

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
