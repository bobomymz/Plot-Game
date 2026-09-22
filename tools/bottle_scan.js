// 水瓶（hasBottle / bottleWater）剧情文本扫描 v2
// 双轨：
//   轨1  权威拾取点：全库所有把 hasBottle 置 true 的场景（不论措辞）
//   轨2  关键词普查：所有含「瓶」字样的场景行，按子类打标
// 交叉后分类：pickup（拾取点） / water（有用水机制） / narrative（纯环境叙事候选池）
// 输出：tools/水瓶剧情提及审计报告.md
const fs = require('fs'), path = require('path');

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
  'story/仁济南院.js', 'story/建平中学.js', 'story/张江.js'
];

// 关键词：仅「饮用水容器」语义。刻意排除 电瓶车/酒瓶/药瓶/盐酸/油漆 等。
const KW_BOTTLE = /水瓶|矿泉水|瓶装水|空水瓶|空瓶|塑料瓶|桶装水|纯净水|凉白开|脉动|饮料瓶|汽水瓶/;
// 子类判定（按优先级）
const SUB = [
  ['玩家水瓶指代', /你的水瓶|手里的水瓶|腰间的?水瓶|瓶里还有水|空水瓶从包里|收好水瓶|递给她你的水瓶|我水瓶里|你上次给她的那一只/],
  ['单支带水（半瓶/未开封）', /半瓶|没开封|没开过|未开封|灌了几口|喝了一半|空了半截/],
  ['成箱成提（供给）', /几箱|一箱|成箱|一提|纸箱|几瓶|数了数/],
  ['空瓶（环境遗留）', /空瓶|空水瓶|空的|瘪的|干得发白/],
  ['饮用瓶装水', /矿泉水|瓶装水|桶装水|纯净水/]
];
function subOf(line) {
  for (const [name, re] of SUB) if (re.test(line)) return name;
  return '饮用水瓶';
}

// 拾取特征
const PICKUP = /hasBottle\s*:\s*true|hasBottle\s*=\s*true/;
// 用水机制特征
const WATER = /bottleWater|waterToxic|_waterDispenserUses|灌水|接水|打满|倒水/;

function splitScenes(src) {
  const re = /^  "([^"]+)"\s*:\s*\{/gm;
  const marks = []; let m;
  while ((m = re.exec(src)) !== null) marks.push({ id: m[1], at: m.index });
  return marks.map((mk, i) => ({
    id: mk.id,
    startLine: src.slice(0, mk.at).split('\n').length,
    body: src.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at : src.length)
  }));
}

const pickups = [];   // 权威拾取点
const rows = [];      // 所有含瓶场景

for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log('缺失:', f); continue; }
  const src = fs.readFileSync(abs, 'utf8');
  for (const sc of splitScenes(src)) {
    const lines = sc.body.split('\n');
    const hits = [];
    lines.forEach((ln, idx) => {
      if (KW_BOTTLE.test(ln)) {
        hits.push({ line: sc.startLine + idx, text: ln.trim(), sub: subOf(ln) });
      }
    });
    const isPickup = PICKUP.test(sc.body);
    if (isPickup) {
      // 找到置 true 的行号
      const pl = lines.findIndex(l => PICKUP.test(l));
      pickups.push({ file: f, id: sc.id, line: sc.startLine + Math.max(pl, 0) });
    }
    if (!hits.length && !isPickup) continue;
    const hasWater = WATER.test(sc.body);
    rows.push({
      file: f, id: sc.id, hits, body: sc.body, pickup: isPickup, water: hasWater,
      kind: isPickup ? 'pickup' : (hasWater ? 'water' : 'narrative')
    });
  }
}

const A = rows.filter(r => r.kind === 'pickup');
const B = rows.filter(r => r.kind === 'water');
const C = rows.filter(r => r.kind === 'narrative');

const out = [];
out.push('# 水瓶（hasBottle）全库剧情提及审计报告');
out.push('');
out.push('生成脚本：`node tools/bottle_scan.js`');
out.push('');
out.push('> **轨1（权威）**：全库所有把 `hasBottle` 置为 `true` 的场景 = 真实拾取点，与措辞无关。');
out.push('> **轨2（普查）**：所有含「饮用水容器」字样（水瓶/矿泉水/瓶装水/空瓶/空水瓶/塑料瓶/桶装水/纯净水/凉白开/脉动/饮料瓶）的场景行，按子类打标。电瓶车、酒瓶、药瓶、盐酸瓶等不计入。');
out.push('> **分类**：`pickup` 拾取点 / `water` 有用水机制 / `narrative` 纯环境叙事（候选池）。');
out.push('');
out.push('## 一、汇总');
out.push('');
out.push('| 分类 | 场景数 |');
out.push('| --- | --- |');
out.push(`| pickup（可拾取水瓶） | ${A.length} |`);
out.push(`| water（有用水机制） | ${B.length} |`);
out.push(`| narrative（纯环境叙事） | ${C.length} |`);
out.push(`| 合计含瓶场景 | ${rows.length} |`);
out.push('');
out.push('## 二、权威拾取点（hasBottle = true）');
out.push('');
out.push('| 场景 ID | 文件 | 行号 | 给予形态 |');
out.push('| --- | --- | --- | --- |');
for (const p of pickups) {
  const r = rows.find(x => x.file === p.file && x.id === p.id);
  const body = r ? r.body : '';
  let form = '空瓶';
  if (/bottleWater\s*[:=]\s*1/.test(body)) form = '带水（bottleWater=1）';
  else if (/bottleWater\s*[:=]\s*0/.test(body)) form = '空瓶（bottleWater=0）';
  if (/_hongBottleLabel\s*:\s*true/.test(body)) form += ' + 老洪标签瓶';
  out.push(`| ${p.id} | ${p.file} | L${p.line} | ${form} |`);
}
out.push('');

function dump(title, list, showSub) {
  out.push(title);
  out.push('');
  if (!list.length) { out.push('_（无）_'); out.push(''); return; }
  for (const r of list) {
    const subs = showSub ? [...new Set(r.hits.map(h => h.sub))].join(' / ') : '';
    out.push(`### ${r.id}${subs ? '  `' + subs + '`' : ''}`);
    out.push(`- 文件：\`${r.file}\``);
    for (const h of r.hits) out.push(`  - L${h.line} [${h.sub}] ${h.text.slice(0, 260)}`);
    out.push('');
  }
}
dump('## 三、A 组 · 已可拾取（pickup）', A, true);
dump('## 四、B 组 · 有用水机制（water）', B, true);
dump('## 五、C 组 · 纯环境叙事（narrative）候选池', C, true);

fs.writeFileSync(path.join(ROOT, 'tools/水瓶剧情提及审计报告.md'), out.join('\n'), 'utf8');

console.log('=== 汇总 ===');
console.log('pickup:', A.length, '| water:', B.length, '| narrative:', C.length, '| 合计含瓶场景:', rows.length);
console.log('');
console.log('=== 权威拾取点 ===');
pickups.forEach(p => console.log(`  ${p.id}  (${p.file}:L${p.line})`));
console.log('');
console.log('=== narrative 候选池 ===');
for (const r of C) {
  const subs = [...new Set(r.hits.map(h => h.sub))].join('/');
  console.log(`\n[${r.id}] {${subs}}  ${r.file}`);
  for (const h of r.hits) console.log(`   L${h.line} ${h.text.slice(0, 170)}`);
}
