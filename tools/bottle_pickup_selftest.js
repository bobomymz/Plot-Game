#!/usr/bin/env node
// -*- coding: utf-8 -*-
// 水瓶拾取点功能自测：用迷你引擎（忠实复刻 engine.js 的 renderChoices / checkCondition /
// applyEffect / parseRedirectTarget 语义）逐场景点击，验证新增水瓶来源的行为契约。
// 用法：node tools/bottle_pickup_selftest.js
"use strict";
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'story/utils.js', 'story/core.js', 'story/夜晚剧情.js',
  'story/东明街道/樱桃园占位.js', // 不存在则跳过
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
sandbox.flashStatusWarning = function () {};
sandbox.flashStatus = function () {};
sandbox.showToast = function () {};
sandbox.notify = function () {};
sandbox.triggerShake = function () {};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.error('加载失败', f, e.message); process.exit(1); }
}
const sd = vm.runInContext('storyData', sandbox);
const CAPS = sd._caps || {};

// ---- 迷你引擎 ----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const BASE = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);

function newState(patch) {
  const st = JSON.parse(JSON.stringify(BASE, setReplacer), setReviver);
  st._visit = st._visit || {};
  Object.assign(st, patch || {});
  return st;
}
function clampAll(st) {
  for (const k in CAPS) {
    const c = CAPS[k];
    if (c.min !== undefined && st[k] < c.min) st[k] = c.min;
    if (c.max !== undefined && st[k] > c.max) st[k] = c.max;
  }
}
function applyEffect(effect, st) {
  if (typeof effect === 'function') effect = effect(st);
  if (!effect) return;
  if (effect.set) for (const k in effect.set) st[k] = effect.set[k];
  if (effect.add) for (const k in effect.add) {
    if (st[k] === undefined) st[k] = effect.add[k]; else st[k] += effect.add[k];
  }
  if (effect.mul) for (const k in effect.mul) {
    if (st[k] === undefined) st[k] = effect.mul[k]; else st[k] *= effect.mul[k];
  }
  clampAll(st);
}
function checkCondition(cond, st) {
  if (cond == null || cond === true) return true;
  if (typeof cond === 'function') return cond(st);
  if (typeof cond === 'string') {
    try {
      return new Function(...Object.keys(st), 'return Boolean(' + cond + ');')(...Object.values(st));
    } catch (e) { return false; }
  }
  return true;
}
// 进入场景：应用 onEnter（引擎里 onEnter 也走 applyEffect），并自增 _visit
function enter(id, st) {
  const node = sd[id];
  if (!node) throw new Error('场景不存在: ' + id);
  st._visit[id] = (st._visit[id] || 0) + 1;
  if (node.onEnter) applyEffect(node.onEnter, st);
  return node;
}
function choiceText(c, st) {
  return typeof c.text === 'function' ? c.text(st) : (c.text || '');
}
function renderChoices(id, st) {
  const node = sd[id];
  let list = node.choices;
  if (typeof list === 'function') list = list(st);
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    if (c.showCondition && !checkCondition(c.showCondition, st)) continue;
    const met = checkCondition(c.condition, st);
    if (!met && !c.elseScene) continue;
    out.push({ choice: c, text: choiceText(c, st), met });
  }
  return out;
}
function resolveTarget(t, st) { return typeof t === 'function' ? t(st) : t; }
function click(id, st, text) {
  const list = renderChoices(id, st);
  const hit = list.find(x => x.text === text);
  if (!hit) {
    throw new Error('场景 ' + id + ' 找不到可点选项「' + text + '」，当前可见：' + JSON.stringify(list.map(x => x.text)));
  }
  const c = hit.choice;
  const met = checkCondition(c.condition, st);
  if (met) {
    if (c.effect) applyEffect(c.effect, st);
    return resolveTarget(c.nextScene, st);
  }
  return resolveTarget(c.elseScene, st) || resolveTarget(c.nextScene, st);
}
function textOf(id, st) {
  const node = sd[id];
  const t = node.text;
  if (typeof t === 'function') return t(st);
  if (Array.isArray(t)) return t.join('\n');
  return t;
}

// ---- 断言工具 ----
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.error('  FAIL ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}
function has(st, id, text) { return renderChoices(id, st).some(x => x.text === text); }

console.log('== S1 新达汇-电梯厅贩卖机：最多捞 3 只空瓶 ==');
{
  let st = newState({ itemCount: 0, hasBottle: false });
  enter('新达汇-电梯厅贩卖机', st);
  ok('初始 vendingBottleLeft = 3', st.vendingBottleLeft === 3, st.vendingBottleLeft);
  ok('可见「把手伸进豁口翻一翻」', has(st, '新达汇-电梯厅贩卖机', '把手伸进豁口翻一翻'));

  let taken = 0;
  for (let i = 0; i < 3; i++) {
    let dest = click('新达汇-电梯厅贩卖机', st, '把手伸进豁口翻一翻');
    if (dest !== '新达汇-电梯厅贩卖机-翻找') { ok('第' + (i + 1) + '次翻找应进 -翻找', false, dest); break; }
    enter(dest, st);
    ok('第' + (i + 1) + '次可见「捞一只空瓶带走」', has(st, dest, '捞一只空瓶带走'));
    dest = click(dest, st, '捞一只空瓶带走');
    if (dest !== '新达汇-电梯厅贩卖机-捞空瓶') { ok('应进 -捞空瓶', false, dest); break; }
    enter(dest, st);
    taken++;
    ok('第' + (i + 1) + '次捞瓶后 hasBottle=true / 空瓶 / 无毒性',
      st.hasBottle === true && st.waterToxic === false && st.bottleWater === 0);
    ok('第' + (i + 1) + '次 itemCount 与持瓶状态一致（持瓶占 1 格）',
      st.itemCount === (st.hasBottle ? 1 : 0), st.itemCount);
    ok('第' + (i + 1) + '次库存 = ' + (3 - taken), st.vendingBottleLeft === 3 - taken, st.vendingBottleLeft);
    ok('第' + (i + 1) + '次「继续翻落货口」回 -翻找', has(st, dest, '继续翻落货口'));
    if (i < 2) {
      // 丢掉瓶子，才能再捞
      click('整理整理', st, '丢下水瓶');
    }
  }
  ok('最多产出 3 只空瓶', taken === 3, taken);
  ok('库存耗尽后 = 0', st.vendingBottleLeft === 0, st.vendingBottleLeft);

  // 耗尽后：翻一翻 → elseScene -空手
  enter('新达汇-电梯厅贩卖机', st);
  const dest = click('新达汇-电梯厅贩卖机', st, '把手伸进豁口翻一翻');
  ok('库存为 0 时翻一翻 → -空手', dest === '新达汇-电梯厅贩卖机-空手', dest);
  enter(dest, st);
  ok('空手文案已切换为「捞干净了」', /捞干净/.test(String(textOf(dest, st))));
  ok('空手场景不再给瓶', !renderChoices(dest, st).some(x => /捞一只空瓶/.test(x.text)));
}

console.log('== S2 新达汇-1F后勤仓库：工具分支 + 21 瓶上限 ==');
{
  // (a) 无工具
  let st = newState({ itemCount: 0, hasBottle: false });
  enter('新达汇-1F后勤仓库', st);
  ok('初始库存 20 瓶', st.newdahuiWarehouseWaterLeft === 20, st.newdahuiWarehouseWaterLeft);
  ok('无工具 → 显示「试着徒手撕开纸箱」', has(st, '新达汇-1F后勤仓库', '试着徒手撕开纸箱'));
  ok('无工具 → 不显示划箱选项', !renderChoices('新达汇-1F后勤仓库', st).some(x => /划开纸箱/.test(x.text)));
  ok('显示「拿走箱盖上那瓶已开封的水」', has(st, '新达汇-1F后勤仓库', '拿走箱盖上那瓶已开封的水'));
  let d = click('新达汇-1F后勤仓库', st, '试着徒手撕开纸箱');
  ok('徒手 → -撕不开', d === '新达汇-1F后勤仓库-撕不开', d);
  enter(d, st);
  ok('撕不开不扣库存', st.newdahuiWarehouseWaterLeft === 20, st.newdahuiWarehouseWaterLeft);
  ok('撕不开提示需要利器', /美工刀/.test(String(textOf(d, st))));
  enter('新达汇-1F后勤仓库', st);
  d = click('新达汇-1F后勤仓库', st, '拿走箱盖上那瓶已开封的水');
  ok('已开封瓶 → 专属节点', d === '新达汇-1F后勤仓库-已开封瓶', d);
  enter(d, st);
  ok('已开封瓶：hasBottle=true / 空瓶 / itemCount+1',
    st.hasBottle === true && st.bottleWater === 0 && st.itemCount === 1,
    JSON.stringify({ hasBottle: st.hasBottle, bottleWater: st.bottleWater, itemCount: st.itemCount }));
  ok('已开封瓶不消耗箱装水库存', st.newdahuiWarehouseWaterLeft === 20, st.newdahuiWarehouseWaterLeft);
  enter('新达汇-1F后勤仓库', st);
  ok('持瓶后已开封瓶选项消失', !has(st, '新达汇-1F后勤仓库', '拿走箱盖上那瓶已开封的水'));

  // (b) 有美工刀
  const TOOLS = [['hasCutter', '美工刀'], ['hasDagger', '匕首'], ['hasAxe', '斧头'], ['hasScrewdriver', '螺丝刀']];
  for (const [flag, name] of TOOLS) {
    const s = newState({ itemCount: 0, hasBottle: false });
    s[flag] = true;
    enter('新达汇-1F后勤仓库', s);
    ok(name + ' → 显示「用' + name + '划开纸箱」', has(s, '新达汇-1F后勤仓库', '用' + name + '划开纸箱'));
  }
  // 优先序：美工刀 > 匕首 > 斧头 > 螺丝刀
  let s2 = newState({ itemCount: 0, hasBottle: false, hasAxe: true, hasDagger: true });
  enter('新达汇-1F后勤仓库', s2);
  ok('多工具时优先匕首（美工刀 > 匕首 > 斧头）', has(s2, '新达汇-1F后勤仓库', '用匕首划开纸箱'));

  // (c) 开箱 → 拿水
  let s3 = newState({ itemCount: 0, hasBottle: false, hasCutter: true });
  enter('新达汇-1F后勤仓库', s3);
  let dd = click('新达汇-1F后勤仓库', s3, '用美工刀划开纸箱');
  ok('划箱 → -开箱', dd === '新达汇-1F后勤仓库-开箱', dd);
  enter(dd, s3);
  ok('开箱后文案点名美工刀', /美工刀/.test(String(textOf(dd, s3))));
  dd = click(dd, s3, '拿一瓶');
  ok('拿一瓶 → -拿水', dd === '新达汇-1F后勤仓库-拿水', dd);
  enter(dd, s3);
  ok('拿水：hasBottle=true / 满瓶 / 无毒性 / itemCount+1',
    s3.hasBottle === true && s3.bottleWater === 1 && s3.waterToxic === false && s3.itemCount === 1,
    JSON.stringify({ hb: s3.hasBottle, bw: s3.bottleWater, wt: s3.waterToxic, ic: s3.itemCount }));
  ok('拿水后库存 19', s3.newdahuiWarehouseWaterLeft === 19, s3.newdahuiWarehouseWaterLeft);

  // 已开箱 → 选项变为取水
  enter('新达汇-1F后勤仓库', s3);
  ok('已开箱后不再显示划箱', !renderChoices('新达汇-1F后勤仓库', s3).some(x => /划开纸箱/.test(x.text)));
  ok('持有满瓶时不显示取水', !renderChoices('新达汇-1F后勤仓库', s3).some(x => /从箱里拿一瓶|把瓶子接满/.test(x.text)));

  // 空瓶 → 走「换水」分支（不占格）
  s3 = newState({ itemCount: 1, hasBottle: true, bottleWater: 0, hasCutter: true });
  s3._visit['新达汇-1F后勤仓库-开箱'] = 1;
  s3.newdahuiWarehouseWaterLeft = 20;
  enter('新达汇-1F后勤仓库', s3);
  ok('空瓶 → 显示「把瓶子接满（箱里还有整瓶的）」', has(s3, '新达汇-1F后勤仓库', '把瓶子接满（箱里还有整瓶的）'));
  let d3 = click('新达汇-1F后勤仓库', s3, '把瓶子接满（箱里还有整瓶的）');
  ok('空瓶 → -换水', d3 === '新达汇-1F后勤仓库-换水', d3);
  const icBefore = s3.itemCount;
  enter(d3, s3);
  ok('换水：满瓶且 itemCount 不变', s3.bottleWater === 1 && s3.itemCount === icBefore && s3.waterToxic === false,
    JSON.stringify({ bw: s3.bottleWater, ic: s3.itemCount, was: icBefore }));
  ok('换水扣 1 瓶库存', s3.newdahuiWarehouseWaterLeft === 19, s3.newdahuiWarehouseWaterLeft);

  // 毒水 → 允许换掉
  const s4 = newState({ itemCount: 1, hasBottle: true, bottleWater: 1, waterToxic: true });
  s4._visit['新达汇-1F后勤仓库-开箱'] = 1;
  s4.newdahuiWarehouseWaterLeft = 20;
  enter('新达汇-1F后勤仓库', s4);
  ok('持毒水时也显示取水（可换成干净水）', renderChoices('新达汇-1F后勤仓库', s4).some(x => /把瓶子接满/.test(x.text)));

  // (d) 背包满 + 无瓶 → 走 整理整理
  const s5 = newState({ itemCount: 3, hasBottle: false, hasCutter: true });
  s5._visit['新达汇-1F后勤仓库-开箱'] = 1;
  s5.newdahuiWarehouseWaterLeft = 20;
  enter('新达汇-1F后勤仓库', s5);
  const d5 = click('新达汇-1F后勤仓库', s5, '从箱里拿一瓶矿泉水');
  ok('背包满且无瓶 → elseScene 整理整理', d5 === '整理整理', d5);
  ok('背包满时未扣库存', s5.newdahuiWarehouseWaterLeft === 20, s5.newdahuiWarehouseWaterLeft);
  ok('positionAfterOperation 指向本场景', s5.positionAfterOperation === '新达汇-1F后勤仓库', s5.positionAfterOperation);

  // (e) 总量上限 20（箱）+ 1（已开封）= 21
  const s6 = newState({ itemCount: 0, hasBottle: false, hasCutter: true });
  s6._visit['新达汇-1F后勤仓库-开箱'] = 1;
  s6.newdahuiWarehouseWaterLeft = 20;
  let pulls = 0;
  for (let i = 0; i < 25; i++) {
    enter('新达汇-1F后勤仓库', s6);
    const avail = renderChoices('新达汇-1F后勤仓库', s6).some(x => /从箱里拿一瓶/.test(x.text));
    if (!avail) break;
    let dst = click('新达汇-1F后勤仓库', s6, '从箱里拿一瓶矿泉水');
    enter(dst, s6);
    pulls++;
    s6.hasBottle = false; s6.bottleWater = 0; s6.itemCount -= 1;   // 模拟喝掉/丢弃后回取
  }
  ok('箱装水最多取 20 瓶', pulls === 20 && s6.newdahuiWarehouseWaterLeft === 0, JSON.stringify({ pulls, left: s6.newdahuiWarehouseWaterLeft }));
  enter('新达汇-1F后勤仓库', s6);
  ok('箱空后不再显示取水', !renderChoices('新达汇-1F后勤仓库', s6).some(x => /从箱里拿一瓶|把瓶子接满/.test(x.text)));
  const s7 = newState({ itemCount: 0, hasBottle: false });
  enter('新达汇-1F后勤仓库', s7);
  click('新达汇-1F后勤仓库', s7, '拿走箱盖上那瓶已开封的水');
  ok('合计上限 = 20 箱装 + 1 已开封 = 21', 20 + 1 === 21);
}

console.log('== S3 建平-挹芬楼-3F-高一教室：桌缝空瓶 ==');
{
  const st = newState({ itemCount: 0, hasBottle: false });
  enter('建平-挹芬楼-3F-高一教室', st);
  ok('教师 text 提到空水瓶', /空水瓶/.test(String(textOf('建平-挹芬楼-3F-高一教室', st))));
  ok('显示「从桌缝里抽出那只空水瓶」', has(st, '建平-挹芬楼-3F-高一教室', '从桌缝里抽出那只空水瓶'));
  const d = click('建平-挹芬楼-3F-高一教室', st, '从桌缝里抽出那只空水瓶');
  ok('→ -空水瓶 节点', d === '建平-挹芬楼-3F-高一教室-空水瓶', d);
  enter(d, st);
  ok('空水瓶：hasBottle=true / bottleWater=0 / itemCount+1 / 无毒性',
    st.hasBottle === true && st.bottleWater === 0 && st.itemCount === 1 && st.waterToxic === false,
    JSON.stringify({ hb: st.hasBottle, bw: st.bottleWater, ic: st.itemCount, wt: st.waterToxic }));
  ok('positionAfterOperation 指回教室', st.positionAfterOperation === '建平-挹芬楼-3F-高一教室', st.positionAfterOperation);
  enter('建平-挹芬楼-3F-高一教室', st);
  ok('持瓶后选项消失', !has(st, '建平-挹芬楼-3F-高一教室', '从桌缝里抽出那只空水瓶'));
  ok('持瓶后 text 不再提空水瓶', !/空水瓶/.test(String(textOf('建平-挹芬楼-3F-高一教室', st))));
  // 背包满
  const st2 = newState({ itemCount: 3, hasBottle: false });
  enter('建平-挹芬楼-3F-高一教室', st2);
  ok('背包满 → elseScene 整理整理', click('建平-挹芬楼-3F-高一教室', st2, '从桌缝里抽出那只空水瓶') === '整理整理');
}

console.log('== S4 仁济南院-特需病房-病床：脉动可连瓶带走 ==');
{
  const st = newState({ itemCount: 0, hasBottle: false });
  enter('仁济南院-特需病房', st);
  let d = click('仁济南院-特需病房', st, '搜索病床');
  ok('→ -病床', d === '仁济南院-特需病房-病床', d);
  enter(d, st);
  ok('显示「连瓶一起收进背包」', has(st, d, '连瓶一起收进背包'));
  const d2 = click(d, st, '连瓶一起收进背包');
  ok('→ -病床-带走', d2 === '仁济南院-特需病房-病床-带走', d2);
  enter(d2, st);
  ok('带走：hasBottle=true / 满瓶 / itemCount+1 / 无毒性',
    st.hasBottle === true && st.bottleWater === 1 && st.itemCount === 1 && st.waterToxic === false,
    JSON.stringify({ hb: st.hasBottle, bw: st.bottleWater, ic: st.itemCount, wt: st.waterToxic }));
  enter('仁济南院-特需病房', st);
  ok('已带走 → 病床选项变「再看一眼病床（已经空了）」', has(st, '仁济南院-特需病房', '再看一眼病床（已经空了）'));
  const d3 = click('仁济南院-特需病房', st, '再看一眼病床（已经空了）');
  enter(d3, st);
  ok('空病床文案区分「被带走」', /凹痕/.test(String(textOf(d3, st))), String(textOf(d3, st)).slice(0, 40));
  // 对照：当场喝掉路线仍走原逻辑
  const st2 = newState({ itemCount: 0, hasBottle: false });
  enter('仁济南院-特需病房', st2);
  click('仁济南院-特需病房', st2, '搜索病床');
  enter('仁济南院-特需病房-病床', st2);
  const dd = click('仁济南院-特需病房-病床', st2, '当场喝掉');
  ok('「当场喝掉」仍 → -功能饮料', dd === '仁济南院-特需病房-功能饮料', dd);
  // 背包满
  const st3 = newState({ itemCount: 3, hasBottle: false });
  enter('仁济南院-特需病房-病床', st3);
  ok('背包满 → elseScene 整理整理', click('仁济南院-特需病房-病床', st3, '连瓶一起收进背包') === '整理整理');
}

console.log('\n结果：%d 通过 / %d 失败', pass, fail);
process.exit(fail ? 1 : 0);
