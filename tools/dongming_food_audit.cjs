// 东明街道·饮食类补给分布 & 体力恢复量 统计（v3：场景锚点 + 全文件模式扫描，按就近前置场景归属）
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = process.cwd();

const STORY_FILES = (() => { try { return require('./story_files').list(); } catch (e) { return null; } })() || [];
const DM_FILES = STORY_FILES.filter(f => f.startsWith('story/东明街道/'));

function makeSandbox() {
  const s = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
  s.flashStatusWarning = s.flashStatus = s.showToast = s.notify = s.triggerShake = function () {};
  s.window = s; s.globalThis = s; vm.createContext(s); return s;
}
const sb = makeSandbox();
for (const f of STORY_FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sb, { filename: f }); } catch (e) {}
}
const sd = vm.runInContext('storyData', sb);
const vars0 = JSON.parse(JSON.stringify(sd._variables || {}));

const fileScenes = {};
for (const f of DM_FILES) {
  const s2 = makeSandbox();
  for (const dep of ['story/utils.js', 'story/core.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, dep), 'utf8'), s2, { filename: dep });
  const before = new Set(Object.keys(vm.runInContext('storyData', s2)));
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), s2, { filename: f });
  fileScenes[f] = Object.keys(vm.runInContext('storyData', s2)).filter(k => !before.has(k));
}

const FOOD = {
  hasFrozenMeat:      { name: '冻肉',       eat: '回满(10)', cat: '肉类' },
  instantNoodle:      { name: '泡面',       eat: '回满(10)', cat: '主食', stack: true },
  hasCannedFood:      { name: '罐头',       eat: '+4',      cat: '罐头' },
  hasBiscuit:         { name: '压缩饼干',   eat: '+1',      cat: '饼干' },
  hasSnackCookie:     { name: '味千小饼干', eat: '+1',      cat: '饼干' },
  hasCracker:         { name: '夹心饼干',   eat: '+1',      cat: '饼干' },
  hasTeethingBiscuit: { name: '磨牙饼干',   eat: '+1',      cat: '饼干' },
  hasCatSnack:        { name: '脆脆炒米',   eat: '+1',      cat: '零食' },
  hasHamSausage:      { name: '火腿肠',     eat: '+2',      cat: '肉制品' },
  hasCanteenFood:     { name: '食堂干粮',   eat: '+2',      cat: '干粮' },
  vitaminC:           { name: '维生素C',    eat: '+1',      cat: '药品', stack: true },
};
const FOOD_KEYS = new Set(Object.keys(FOOD));
const WORLD = {
  familyMartNoodleLeft:      { food: 'instantNoodle', name: '全家员工通道泡面' },
  _flat401NoodleLeft:        { food: 'instantNoodle', name: '401墙角半箱泡面' },
  lianhuaCannedLeft:         { food: 'hasCannedFood', name: '联华仓库罐头' },
  _vitaminCLeft:             { food: 'vitaminC',      name: '益丰药房维C货架' },
  supermarketWaterLeft:      { food: 'water',         name: '联华仓库瓶装水' },
  vendingBottleLeft:         { food: 'water',         name: '新达汇贩卖机空瓶' },
  newdahuiWarehouseWaterLeft:{ food: 'water',         name: '新达汇后勤仓箱装水' },
};

// 从 openBrace 位置提取平衡 {} 内的对象文本
function extractBalanced(text, openIdx) {
  let depth = 0, inStr = false, esc = false, q = '';
  for (let j = openIdx; j < text.length; j++) {
    const c = text[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) inStr = false; }
    else {
      if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; }
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return text.slice(openIdx, j + 1); }
    }
  }
  return null;
}
// 找出某关键字（set/add）作为对象键后的平衡对象，返回 {objText, keyPos}
function findKeywordObjects(text, keyword) {
  const res = [];
  const re = new RegExp(keyword + '\\s*:\\s*\\{', 'g');
  let m;
  while ((m = re.exec(text))) {
    const brace = m.index + m[0].length - 1;
    const obj = extractBalanced(text, brace);
    if (obj) res.push({ obj, keyPos: brace });
  }
  return res;
}
// 解析一个对象文本顶层 key:value（值可能带负号），返回 {key: rawValue}
function parseTopPairs(objText) {
  const inner = objText.replace(/^\{/, '').replace(/\}$/, '');
  const pairs = {};
  // 简易：按顶层逗号切分（值内不含未转义逗号——数值/true/简单表达式足够）
  let depth = 0, inStr = false, esc = false, q = '', buf = '', arr = [];
  for (const c of inner) {
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) inStr = false; buf += c; }
    else {
      if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; buf += c; }
      else if (c === '{' || c === '[') { depth++; buf += c; }
      else if (c === '}' || c === ']') { depth--; buf += c; }
      else if (c === ',' && depth === 0) { arr.push(buf); buf = ''; }
      else buf += c;
    }
  }
  if (buf.trim()) arr.push(buf);
  for (const p of arr) {
    const mm = /^\s*["']?(\w+)["']?\s*:\s*(.+?)\s*$/.exec(p);
    if (mm) pairs[mm[1]] = mm[2];
  }
  return pairs;
}

// 找场景块原始文本：匹配定义处 "id": { （引用处是 nextScene:"id"，引号后无冒号，不会误中）
function findBlock(text, key) {
  const re = new RegExp('"' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*\\{');
  const m = re.exec(text);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  return extractBalanced(text, open);
}

// 扫描单个场景块：返回 { grant:{foodKey:qty}, worldDec:worldKey|null, strength:amount|null }
function scanSceneBlock(block) {
  const grant = {}; let worldDec = null, strength = null;
  for (const kw of ['set', 'add']) {
    for (const { obj } of findKeywordObjects(block, kw)) {
      const pairs = parseTopPairs(obj);
      for (const key in pairs) {
        const val = pairs[key].trim(), num = Number(val);
        if (FOOD_KEYS.has(key)) { if (val === 'true' || num > 0) grant[key] = Math.max(grant[key] || 0, num > 0 ? num : 1); }
        if ((key === 'instantNoodle' || key === 'vitaminC') && num > 0) grant[key] = Math.max(grant[key] || 0, num);
        if (key === 'bottleWater' && num > 0) grant['water'] = Math.max(grant['water'] || 0, num);
        if (WORLD[key] && num < 0) worldDec = key;
        if (key === 'strength') { if (num >= 10) strength = '回满(10)'; else if (num > 0) strength = '+' + num; }
      }
    }
  }
  const reAssign = /vars\.(\w+)\s*(\+=|=)\s*([^;\n}]+)/g; let m;
  while ((m = reAssign.exec(block))) {
    const k = m[1], expr = m[3].trim(), num = Number(expr);
    if (FOOD_KEYS.has(k) && ((m[2] === '=' && expr === 'true') || m[2] === '+=')) grant[k] = Math.max(grant[k] || 0, 1);
    if ((k === 'instantNoodle' || k === 'vitaminC') && (m[2] === '+=' || (m[2] === '=' && num > 0))) grant[k] = Math.max(grant[k] || 0, num > 0 ? num : 1);
    if (k === 'bottleWater' && (m[2] === '+=' || (m[2] === '=' && num > 0))) grant['water'] = Math.max(grant['water'] || 0, num > 0 ? num : 1);
    if (WORLD[k] && /-/.test(expr)) worldDec = k; // 扣减
    if (k === 'strength' && !strength) { if (num >= 10) strength = '回满(10)'; else if (num > 0) strength = '+' + num; }
  }
  const reTxt = /体力\s*\+\s*(\d+)|体力回满/g; let t;
  while ((t = reTxt.exec(block))) { if (!strength) strength = t[0] === '体力回满' ? '回满(10)' : '+' + t[1]; }
  return { grant, worldDec, strength };
}

function analyzeFile(f) {
  const raw = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const grant = {}, worldDec = {}, strength = {};
  for (const scene of fileScenes[f]) {
    const block = findBlock(raw, scene); if (!block) continue;
    const r = scanSceneBlock(block);
    if (Object.keys(r.grant).length) grant[scene] = r.grant;
    if (r.worldDec) worldDec[scene] = r.worldDec;
    if (r.strength) strength[scene] = r.strength;
  }
  return { grant, worldDec, strength };
}

const acquisition = {}; // foodKey -> [{scene,file,qty,cap,worldName}]
const waterByWorld = {}; // worldKey -> {name, cap, scenes:[]}
const waterOneTime = [];  // [{scene,file}]
const inplace = [];

for (const f of DM_FILES) {
  const { grant, worldDec, strength } = analyzeFile(f);
  // 世界扣减 -> 该场景对应食物 & cap
  const sceneWorldCap = {};
  for (const scene in worldDec) {
    const wk = worldDec[scene];
    sceneWorldCap[scene] = { wk, cap: vars0[wk] || 1, name: WORLD[wk].name, food: WORLD[wk].food };
  }
  // 授予
  for (const scene in grant) {
    const g = grant[scene];
    const wc = sceneWorldCap[scene];
    const fileShort = f.replace('story/东明街道/', '');
    for (const fk in g) {
      const qty = g[fk];
      if (fk === 'water') {
        if (wc && WORLD[wc.wk].food === 'water') {
          const w = (waterByWorld[wc.wk] = waterByWorld[wc.wk] || { name: wc.name, cap: wc.cap, scenes: [] });
          w.scenes.push(scene + '（' + fileShort + '）');
        } else {
          const ex = waterOneTime.find(x => x.scene === scene);
          if (!ex) waterOneTime.push({ scene, file: fileShort });
        }
      } else {
        let cap = 1, wname = '';
        if (wc && wc.food === fk) { cap = wc.cap; wname = wc.name; }
        const ex = (acquisition[fk] || []).find(x => x.scene === scene);
        if (ex) { ex.cap = Math.max(ex.cap, cap); }
        else (acquisition[fk] = acquisition[fk] || []).push({ scene, file: f, qty, cap, worldName: wname });
      }
    }
  }
  // 体力恢复
  for (const scene in strength) inplace.push({ scene, file: f, amount: strength[scene] });
}

// 去重 inplace
const im = {}; const inplaceList = [];
for (const x of inplace) { const key = x.scene + x.amount; if (!im[key]) { im[key] = 1; inplaceList.push(x); } }

const out = [];
out.push('# 东明街道·饮食类补给分布与体力恢复量统计（v3）\n');
out.push('> 数据来源：story/东明街道/* 全部 ' + DM_FILES.length + ' 个剧情文件 + core.js 进食菜单。体力恢复值取全局「整理整理」进食子场景 onEntry（东明街道内食用同值）。统计方法：以 vm 加载的权威场景清单为锚点，按场景真实代码块扫描 `set/add` 字面量与 `vars.X` 直接赋值。\n');

out.push('## 一、携带食物：食用体力恢复量（全局「整理整理」菜单）\n');
out.push('| 食物 | 类别 | 单份恢复体力 | 占背包 |\n|---|---|---|---|');
for (const k of Object.keys(FOOD)) { const x = FOOD[k]; out.push(`| ${x.name} (${k}) | ${x.cat} | ${x.eat} | ${x.stack ? '每格1份·可堆叠' : '占1格'} |`); }
out.push('| 水（bottleWater 喝） | 饮水 | +1 | 不占格 |\n');

out.push('\n## 二、东明街道·饮食补给「获取分布」（按食物归类）\n');
for (const k of Object.keys(FOOD)) {
  const list = acquisition[k] || []; const x = FOOD[k];
  const total = list.reduce((s, e) => s + (e.cap || 1), 0);
  out.push(`\n### ${x.name}（${k}）— 单份恢复 ${x.eat}`);
  if (!list.length) { out.push('- 东明街道内**无可获取节点**（获取在其它章节）。'); continue; }
  out.push(`- 东明街道内可获取节点数：${list.length}；按单源上限累计最多可拿 **${total}** 份。`);
  out.push('| 获取场景 | 文件 | 单份 | 单源上限 | 补给源 |');
  out.push('|---|---|---|---|---|');
  for (const e of list) out.push(`| ${e.scene} | ${e.file.replace('story/东明街道/', '')} | ${e.qty} | ${e.cap} | ${e.worldName || '一次性'} |`);
}

out.push('\n## 三、东明街道·饮水补给获取分布\n');
{
  const bounded = Object.values(waterByWorld);
  const boundedTotal = bounded.reduce((s, w) => s + w.cap, 0);
  out.push(`- 有计数上限的瓶装水水源：${bounded.length} 处，合计上限 **${boundedTotal}** 瓶（世界库存，东明街道内可反复取直到取空）。`);
  out.push('| 水源（世界库存） | 上限(瓶) | 取水场景 |');
  out.push('|---|---|---|');
  for (const w of bounded) out.push(`| ${w.name} | ${w.cap} | ${w.scenes.join('；')} |`);
  out.push(`\n- 无计数上限（可直接/重复接水）的取水点：${waterOneTime.length} 处：`);
  for (const x of waterOneTime) out.push(`  - ${x.scene}（${x.file}）`);
  out.push(`\n> 说明：饮水机 / 卫生间 / 停车场搜刮等无世界库存计数，属"可重复接水"，原则上不稀缺；有计数上限的瓶装水才是稀缺资源。`);
}

out.push('\n## 四、东明街道·就地进食/饮水（场景内直接恢复体力，不走整理整理）\n');
out.push('> 下列节点在场景内直接恢复体力（含进食/饮水），与「整理整理」菜单食用互不冲突。其中 +1 的小额多为"拾取同时顺手吃/喝"或次要补给节点，≥+2 / 回满 为正式餐食。\n');
if (!inplaceList.length) out.push('- 未发现。');
else {
  out.push('| 场景 | 文件 | 恢复量 |');
  out.push('|---|---|---|');
  for (const x of inplaceList) out.push(`| ${x.scene} | ${x.file.replace('story/东明街道/', '')} | ${x.amount} |`);
}

out.push('\n## 五、汇总（东明街道可获取总量）\n');
out.push('| 补给 | 类别 | 有上限可获取 | 单份恢复 |\n|---|---|---|---|');
for (const k of Object.keys(FOOD)) {
  const list = acquisition[k] || []; const total = list.reduce((s, x) => s + (x.cap || 1), 0);
  out.push(`| ${FOOD[k].name} | ${FOOD[k].cat} | ${total} 份 | ${FOOD[k].eat} |`);
}
{ const bt = Object.values(waterByWorld).reduce((s, w) => s + w.cap, 0); out.push(`| 瓶装水（有上限） | 饮水 | ${bt} 瓶 | +1 |（另有 ${waterOneTime.length} 处可重复接水点）`); }

const md = out.join('\n');
fs.writeFileSync('tools/东明街道饮食补给统计.md', md);
console.log(md);
console.log('\n=== 东明街道饮食补给总可获取量（按食物）===');
for (const k of Object.keys(FOOD)) { const list = acquisition[k] || []; const total = list.reduce((s, x) => s + (x.cap || 1), 0); console.log(`${FOOD[k].name}: ${total} 份 (${list.length}节点)`); }
const bt = Object.values(waterByWorld).reduce((s, w) => s + w.cap, 0);
console.log(`瓶装水(有上限): ${bt} 瓶；可重复接水点: ${waterOneTime.length} 处`);
console.log(`就地进食节点: ${inplaceList.length}`);
