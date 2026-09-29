// ========== stackable_items_audit.js ==========
// 审计：全库哪些"物品"变量可【同时持有多个】（计数/堆叠型），
// 区别于①布尔型（有/无，最多 1 件）与②世界库存型（货架/容器还剩多少，非玩家持有）。
//
// 数据源唯一：story/core.js 的 _variables（项目铁律：_variables 是 gameState 唯一来源）。
// 引用统计来源：story/**/*.js 全部剧情文件。
//
// 用法：node tools/stackable_items_audit.js
// 产出：tools/可堆叠物品审计报告.md + 控制台摘要
//
// 三层判定：
//   [自动] 变量类型：布尔 / 数字 / 字符串 / 集合对象（解析 core.js _variables）
//   [半自动] 范围收敛：只有落在「物品区」（// --- 物品状态 ---  →  // 记忆（不占背包））
//            内的数字型变量，才有资格是「可多持道具」
//   [人工] 语义结论：MANUAL（下方常量）——脚本不臆测语义，标注由人维护，
//          新增物品时表A会自动多出一行提醒补登记。
//
// ⚠ 重要：**"变量初值是数字"≠"可同时持有多个"**。判定可多持还须看【获取闸门】：
//    - 闸门 = 世界库存 `xxxLeft > 0`  → 可反复取，直到库存见底（真堆叠）
//    - 闸门 = `!flag`（布尔）或 `_visit['某节点'] > 0`（计数门控）→ 只能拿一次（数字型但单件）
//   教训：`hasInnerLining` 初值为 0（数字），但获取入口用 `_visit[...]>0` 门控 → 实际只有 1 件，
//         单看变量类型会误判为"可刷"。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CORE = path.join(ROOT, 'story', 'core.js');
const STORY_DIR = path.join(ROOT, 'story');

const ITEM_START_ANCHOR = '// --- 物品状态 ---';
const ITEM_END_ANCHOR = '// 记忆（不占背包）';

// ================= 人工语义结论（唯一权威，改这里） =================
// kind: 'stack' 可同时持有多个 | 'stack-boundary' 边界（能多持但非普通道具）
//       | 'holding-meter' 携带计量（非"多件") | 'world-stock' 世界库存
//       | 'state' 状态/次数/电量（非物品）
const MANUAL = {
  instantNoodle:   { kind: 'stack',           name: '泡面',        cap: '0~3 包',   note: '全家员工通道杂物间，世界库存 familyMartNoodleLeft=3；吃一包体力回满，每包占1格' },
  vitaminC:        { kind: 'stack',           name: '维C',         cap: '最多9盒',   note: '益丰大药房：货架 _vitaminCLeft=8（可反复取）+ 白大褂抽屉一次性1（_drawerVitaminTaken）；吃一盒+1体力/防感冒，每盒占1格' },
  iodineSwabBox:   { kind: 'stack',           name: '碘伏棉签盒',  cap: '0~3 盒',   note: '仁济检验科，世界库存 _iodineSwabBoxLeft=3；每盒10根、每盒占1格，用完整盒自动丢弃' },
  gunAmmo:         { kind: 'stack-boundary',  name: '手枪子弹',    cap: '最多3发',  note: '警察局首取3发；不占背包格（枪本体 hasGun 占格），全图几乎无补给' },
  hasInnerLining:  { kind: 'single-digit',    name: '校服内胆',    cap: '实际最多1件', note: '⚠ 初值是数字(0)，但获取入口用 _visit[建平-废弃小楼-3F-团委工作室-收好内胆]>0 门控（不是 !hasInnerLining）→ 只能拿一次，单看类型会误判为可堆叠' },
  itemCount:       { kind: 'holding-meter',   name: '背包已占格数', cap: '0~bagVolume', note: '背包总量计量，非单件物品' },
  bottleWater:     { kind: 'holding-meter',   name: '水瓶水量',    cap: '0/1',      note: '是"一瓶水的口数"（0空/1满），不是"多个瓶子"；饮水机可反复打满' },
  _iodineSwabInBox:{ kind: 'holding-meter',   name: '当前盒剩余根数', cap: '0~10',  note: '正在用的那盒里的棉签数，是计量不是物品数量' },
  supermarketWaterLeft:        { kind: 'world-stock', note: '联华超市仓库瓶装水剩余（世界库存）' },
  vendingBottleLeft:           { kind: 'world-stock', note: '新达汇贩卖机落货口空瓶剩余（世界库存）' },
  newdahuiWarehouseWaterLeft:  { kind: 'world-stock', note: '新达汇后勤仓库箱装水剩余（世界库存）' },
  familyMartNoodleLeft:        { kind: 'world-stock', note: '全家杂物间泡面世界库存（初始3）' },
  lianhuaCannedLeft:           { kind: 'world-stock', note: '联华仓库罐头世界库存（初始2）' },
  _iodineSwabBoxLeft:          { kind: 'world-stock', note: '仁济检验科试剂架棉签盒世界库存（初始3）' },
  _vitaminCLeft:               { kind: 'world-stock', note: '益丰货架维C盒世界库存（初始8）' },
};

// ---------- 1. 截取 _variables 块 ----------
const coreSrc = fs.readFileSync(CORE, 'utf8');
const varStart = coreSrc.indexOf('_variables: {');
const varEnd = coreSrc.indexOf('_caps:', varStart);
if (varStart < 0 || varEnd < 0) { console.error('无法定位 _variables 块'); process.exit(1); }
const varBlock = coreSrc.slice(varStart, varEnd);
const lineOf = (idx) => coreSrc.slice(0, idx).split('\n').length;

const itemStartIdx = coreSrc.indexOf(ITEM_START_ANCHOR, varStart);
const itemEndIdx = coreSrc.indexOf(ITEM_END_ANCHOR, varStart);
if (itemStartIdx < 0 || itemEndIdx < 0) { console.error('无法定位物品区锚点'); process.exit(1); }
const itemStartLine = lineOf(itemStartIdx);
const itemEndLine = lineOf(itemEndIdx);

// ---------- 2. 逐行解析变量 ----------
const vars = [];
varBlock.split('\n').forEach((raw, i) => {
  const line = lineOf(varStart) + i;
  const cm = raw.match(/\/\/\s*(.*)$/);
  const comment = cm ? cm[1].trim() : '';
  const code = raw.replace(/\/\/.*$/, '');
  const re = /([A-Za-z_$][\w$]*)\s*:\s*([^,]+?)\s*(?=,|$)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (!m[1] || m[2].trim() === '') continue;
    vars.push({ name: m[1], valRaw: m[2].trim(), comment, line });
  }
});

function classify(v) {
  const s = v.valRaw;
  if (/^(true|false)$/.test(s)) return 'bool';
  if (/^new Set\(\)/.test(s) || /^\[\]/.test(s)) return 'collection';
  if (/^\{/.test(s)) return 'object';
  if (/^"/.test(s)) return 'string';
  if (/^-?\d+(\.\d+)?$/.test(s)) return 'number';
  return 'other';
}
vars.forEach(v => { v.type = classify(v); });

// ---------- 3. 收集 story 全库源码 ----------
function walk(dir, acc) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, acc);
    else if (f.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}
const storyFiles = walk(STORY_DIR, []).map(f => ({ rel: path.relative(ROOT, f).replace(/\\/g, '/'), src: fs.readFileSync(f, 'utf8') }));

function scanEvidence(name) {
  let occurrences = 0, maxPositiveAdd = 0, plusEq = 0, minusEq = 0, gateNotHeld = false;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reAdd = new RegExp('add\\s*:\\s*\\{[^}]*\\b' + esc + '\\s*:\\s*(-?\\d+)', 'g');
  const rePlusEq = new RegExp('\\.' + esc + '\\s*\\+=\\s*(\\d+)', 'g');
  const reMinusEq = new RegExp('\\.' + esc + '\\s*-=\\s*(\\d+)', 'g');
  const reNot = new RegExp('!\\s*' + esc + '\\b');
  for (const { src } of storyFiles) {
    occurrences += (src.match(new RegExp('\\b' + esc + '\\b', 'g')) || []).length;
    if (reNot.test(src)) gateNotHeld = true;
    let m;
    while ((m = reAdd.exec(src)) !== null) maxPositiveAdd = Math.max(maxPositiveAdd, parseInt(m[1], 10));
    while ((m = rePlusEq.exec(src)) !== null) plusEq = Math.max(plusEq, parseInt(m[1], 10));
    while ((m = reMinusEq.exec(src)) !== null) minusEq = Math.max(minusEq, parseInt(m[1], 10));
  }
  return { occurrences, maxPositiveAdd, plusEq, minusEq, gateNotHeld };
}

// ---------- 4. 分类 ----------
const numbers = vars.filter(v => v.type === 'number');
const bools = vars.filter(v => v.type === 'bool');
const structs = vars.filter(v => v.type === 'collection' || v.type === 'object');
const strings = vars.filter(v => v.type === 'string');

// 物品区内的数字型变量
const itemRegionNumbers = numbers.filter(v => v.line >= itemStartLine && v.line < itemEndLine);

const stack = itemRegionNumbers.filter(v => MANUAL[v.name] && MANUAL[v.name].kind === 'stack');
const boundary = itemRegionNumbers.filter(v => MANUAL[v.name] && MANUAL[v.name].kind === 'stack-boundary');
const singleDigit = itemRegionNumbers.filter(v => MANUAL[v.name] && MANUAL[v.name].kind === 'single-digit');
const meters = itemRegionNumbers.filter(v => MANUAL[v.name] && MANUAL[v.name].kind === 'holding-meter');
const worldStock = numbers.filter(v => MANUAL[v.name] && MANUAL[v.name].kind === 'world-stock');
const unclassified = itemRegionNumbers.filter(v => !MANUAL[v.name]);

// ---------- 5. 输出 ----------
console.log('=== _variables 总览 ===');
console.log(`总数 ${vars.length} | 布尔 ${bools.length} | 数字 ${numbers.length} | 字符串 ${strings.length} | 集合/对象 ${structs.length}`);
console.log(`物品区(行 ${itemStartLine}~${itemEndLine})内数字型变量: ${itemRegionNumbers.length}`);
console.log('\n=== 可同时持有多个（stack） ===');
for (const r of stack) {
  const ev = scanEvidence(r.name);
  console.log(`${r.name.padEnd(16)} ${MANUAL[r.name].name} | ${MANUAL[r.name].cap} | 出现${ev.occurrences} add最大+${ev.maxPositiveAdd} +=${ev.plusEq}`);
}
console.log('\n=== 边界（stack-boundary） ===');
for (const r of boundary) {
  const ev = scanEvidence(r.name);
  console.log(`${r.name.padEnd(16)} ${MANUAL[r.name].name} | ${MANUAL[r.name].cap} | 出现${ev.occurrences} add最大+${ev.maxPositiveAdd} -=${ev.minusEq} ${ev.gateNotHeld ? '有!name闸门' : '⚠无!name闸门'}`);
}
console.log('\n=== 数字型但实际单件（single-digit，易误判） ===');
for (const r of singleDigit) {
  const ev = scanEvidence(r.name);
  console.log(`${r.name.padEnd(16)} ${MANUAL[r.name].name} | ${MANUAL[r.name].cap} | 出现${ev.occurrences} add最大+${ev.maxPositiveAdd}`);
}
console.log('\n=== 物品区内未人工分类的数字变量（需补登记） ===');
for (const r of unclassified) console.log(`${r.name.padEnd(24)} 初值=${r.valRaw}  ${r.comment.slice(0, 36)}`);

// ---------- 6. 写报告 ----------
let md = `# 尸潮笔记 · 可堆叠物品审计报告\n\n`;
md += `> 生成：${new Date().toISOString().slice(0, 10)}　脚本：\`tools/stackable_items_audit.js\`（可重跑）\n`;
md += `> 数据源：\`story/core.js\` 的 \`_variables\`（全库唯一变量来源）\n`;
md += `> 口径：**「可同时持有多个」= 计数/堆叠型物品**，区别于「布尔持有（有/无，最多 1 件）」与「世界库存（货架还剩多少，非玩家持有）」。\n\n`;

md += `## 一、结论：可同时持有多个的物品\n\n`;
md += `| 变量 | 物品 | 上限 | 说明 |\n|---|---|---|---|\n`;
for (const r of stack) md += `| \`${r.name}\` | ${MANUAL[r.name].name} | ${MANUAL[r.name].cap} | ${MANUAL[r.name].note} |\n`;

md += `\n## 二、边界项（能多持，但非普通"道具"）\n\n`;
md += `| 变量 | 物品 | 上限 | 说明 |\n|---|---|---|---|\n`;
for (const r of boundary) md += `| \`${r.name}\` | ${MANUAL[r.name].name} | ${MANUAL[r.name].cap} | ${MANUAL[r.name].note} |\n`;

md += `\n## 三、⚠ 数字型但实际单件（易误判，非可堆叠）\n\n`;
md += `| 变量 | 物品 | 实际上限 | 说明 |\n|---|---|---|---|\n`;
for (const r of singleDigit) md += `| \`${r.name}\` | ${MANUAL[r.name].name} | ${MANUAL[r.name].cap} | ${MANUAL[r.name].note} |\n`;
md += `\n> 结论修正：判定"可同时持有多个"**不能只看变量初值是否为数字**，还须看获取闸门是「世界库存 Left>0」（可真堆叠）还是「!flag / _visit[节点]>0」（单件）。\n`;

md += `\n## 四、携带计量（数字，但不是"多件物品"）\n\n`;
md += `| 变量 | 含义 | 范围 | 说明 |\n|---|---|---|---|\n`;
for (const r of meters) md += `| \`${r.name}\` | ${MANUAL[r.name].name} | ${MANUAL[r.name].cap} | ${MANUAL[r.name].note} |\n`;

md += `\n## 五、世界库存（数字，货架/容器剩余，非玩家持有）\n\n`;
md += `| 变量 | 初值 | 说明 |\n|---|---|---|\n`;
for (const r of worldStock) md += `| \`${r.name}\` | ${r.valRaw} | ${MANUAL[r.name].note} |\n`;

md += `\n## 六、实现机制（可多持物品的三处一致处理）\n\n`;
md += `1. 变量声明：\`core.js _variables\` 中初值为数字（0），注释明示「可堆叠 / 每件占1格」。\n`;
md += `2. 拾取：\`effect: { add: { 物品: 1, itemCount: 1 }, ... }\`，并同步扣世界库存 \`xxxLeft: -1\`。\n`;
md += `3. 消耗：吃/用/给出一律 **只扣 1 份** —— \`instantNoodle\`/\`vitaminC\` 走 \`updateTime(..., { add: { 物品: -1, itemCount: -1 } })\`；\n`;
md += `   \`utils.js foodGiftChoices\` 用 \`typeof v[flag] === "number"\` 判定：数字型 \`-=1\`，布尔型置 \`false\`。\n`;
md += `4. 口粮登记：可作"给出去/吃掉/喂猫"的口粮统一在 \`utils.js FOOD_GIFTS\` 维护（一处改、全图生效）。\n`;

md += `\n## 七、附录：变量区其余数字型变量（状态 / 次数 / 电量台账，均非"物品"）\n\n`;
md += `共 ${unclassified.length} 个，均为流程状态码、计数器或电量，不构成玩家"持有物"：\n\n`;
md += unclassified.map(v => `\`${v.name}\``).join('、') + `\n`;

md += `\n> 说明：本区段锚点覆盖了「物品状态」到「记忆」之间的全部声明，故夹杂了建平 / 张江等章节的场景状态变量（如 \`_harshLag\`、\`_xinOutcome\`、\`_roadBull\`），一并列此以示无遗漏。\n`;

md += `\n## 八、复跑\n\n\`\`\`bash\nnode tools/stackable_items_audit.js\n\`\`\`\n`;

fs.writeFileSync(path.join(__dirname, '可堆叠物品审计报告.md'), md, 'utf8');
console.log('\n报告已写入 tools/可堆叠物品审计报告.md');
