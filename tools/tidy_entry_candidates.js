// 整理整理入口 · 候选点分析
//
// 目的：找出「应该能主动整理背包、但当前没有 🎒整理一下物品 入口」的场景。
//
// 背景（2026-10-01）：波波反馈 story/东明街道/新达汇.js 里主动整理入口太少（只有 5 处手写 +
//   3 处 restTidyChoice）。新达汇是个 5 层商场、188 个场景，玩家在里面大量搜刮，
//   但绝大多数拾取点只有 `elseScene: "整理整理"`（包满了才被动弹过去），
//   没有"我还剩两格、想主动扔点东西"的入口。
//
// 判定维度：
//   1. 已有入口？   nextScene:"整理整理" 且（text 含"整理一下物品" / 源码调 restTidyChoice）
//   2. 是拾取点？   本场景内存在 `elseScene: "整理整理"`（拾取四件套之一，说明此处会拿东西）
//   3. 停留型？     节点语义可站住脚（店铺/房间/中庭/环廊/走廊/枢纽），而不是奔跑/战斗/瞬时态
//   4. 返回风险？   onEnter 有副作用（推进时间/自增/置标记）→ 从整理整理返回会重跑一遍，需加 guard
//
// 用法：
//   node tools/tidy_entry_candidates.js --file=story/东明街道/新达汇.js
//   node tools/tidy_entry_candidates.js --prefix=新达汇            （按场景 ID 前缀筛，可跨文件）
//   node tools/tidy_entry_candidates.js --file=... --md            （输出 Markdown 报告到 tools/）
//
// ⚠ 只分析、不改代码。改完再跑一次应看到「候选」清空中你决定采纳的那些。

const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = process.cwd();
const FILES = require('./story_files').list();

const argv = process.argv.slice(2);
const argOf = (k) => { const a = argv.find(s => s.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : null; };
const TARGET_FILE = argOf('file');
const TARGET_PREFIX = argOf('prefix');
const TO_MD = argv.includes('--md');

// ---------- 加载全部剧情 ----------
const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake'].forEach(k => sandbox[k] = function () {});
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.log('执行失败', f, e.message); }
}
const sd = vm.runInContext('storyData', sandbox);

// ---------- 源码切块：场景 ID -> {file, line, src} ----------
const SCENE_DEF = /^ {2}"([^"]+)":\s*\{/;
const blocks = new Map();   // id -> {file, line, src}
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  let cur = null, buf = [], start = 0;
  const flush = () => { if (cur) blocks.set(cur, { file: f, line: start, src: buf.join('\n') }); };
  lines.forEach((ln, i) => {
    const m = ln.match(SCENE_DEF);
    if (m) { flush(); cur = m[1]; buf = [ln]; start = i + 1; return; }
    if (cur) buf.push(ln);
  });
  flush();
}

// ---------- 入度统计（谁会跳到我这里 —— 枢纽的判据之一）----------
const indeg = new Map();
for (const [id, sc] of Object.entries(sd)) {
  const seen = new Set();
  const walk = (c) => {
    if (!c || typeof c !== 'object') return;
    [c.nextScene, c.elseScene].forEach(t => {
      if (typeof t === 'string' && t && !/\{|\}|\s/.test(t)) seen.add(t);
    });
  };
  const cs = Array.isArray(sc.choices) ? sc.choices : [];
  cs.forEach(walk);
  // 函数式 choices：扫源码里的 nextScene/elseScene 字面量
  if (typeof sc.choices === 'function') {
    for (const m of sc.choices.toString().matchAll(/(?:nextScene|elseScene):\s*"([^"]+)"/g)) seen.add(m[1]);
  }
  if (typeof sc.onEnter === 'function') {
    for (const m of sc.onEnter.toString().matchAll(/(?:nextScene|elseScene):\s*"([^"]+)"/g)) seen.add(m[1]);
  }
  for (const t of seen) indeg.set(t, (indeg.get(t) || 0) + 1);
}

// ---------- 分类规则 ----------
// 不适合整理：结局、战斗/受击/瞬时态/纯对话分支
const EXCLUDE = [
  /^结局/, /陷阱$/, /迎战/, /失手/, /受伤/, /被围/, /被堵/, /暗算/, /撕不开/, /砸不开/,
  /途中$/, /-聊$/, /-旁观$/, /-被救$/, /-帮忙$/, /摸黑$/, /滑倒$/, /输错码/, /没手机$/, /没吃的$/,
  /^\{/, /追兵/, /逃跑/, /追逐/, /尸潮/, /-躲藏$/, /-弃他而去$/, /丧尸/, /-谢礼$/, /-发现幸存者$/
];
// 停留型关键词（能站住脚翻包的地方）
const STAY = [
  /中庭/, /环廊/, /电梯厅/, /扶梯组/, /走廊/, /大厅/, /广场/, /花园/, /平台/, /天桥/,
  /店$/, /店-/, /乐园/, /中心/, /食堂/, /影厅/, /放映厅/, /机房/, /仓库/, /间$/, /室$/, /房/,
  /卫生间/, /厨房/, /过道/, /通道/, /内部/, /柜$/, /架$/, /箱$/, /抽屉/, /天台/, /车库/, /巡逻/
];

// onEnter 副作用分级：
//   🔴 必须加 guard —— 返回时重跑会真的多吃一次收益/多受一次惩罚
//   🟡 幂等 —— 重跑无害（v.showPowerOut = true 之类）
//   qte  —— 场景级 QTE，返回会重启倒计时（可接受，但要心里有数）
function onEnterRisk(sc) {
  if (!sc || !sc.onEnter) return { red: [], yellow: [], info: [] };
  // 对象式 onEnter（onEnter: { set: {...}, add: {...} }）也要看，不能只扫函数式
  const src = typeof sc.onEnter === 'function' ? sc.onEnter.toString() : JSON.stringify(sc.onEnter);
  const red = [], yellow = [], info = [];
  if (/updateTime\s*\(/.test(src)) red.push('推进时间');
  if (/\+\+|--|\+=|-=/.test(src)) red.push('自增计数');
  if (/restRecover\s*\(/.test(src)) red.push('回体力');
  // 对象式 onEnter 的 add 段一律是累加
  if (/"add"\s*:\s*\{/.test(src) && Object.keys(sc.onEnter.add || {}).length) red.push('add累加:' + Object.keys(sc.onEnter.add).join(','));
  // 对象式 onEnter 的 set 段：常量 true/false 幂等；含变量/三元的要以红报
  const s = sc.onEnter.set || {};
  for (const [k, val] of Object.entries(s)) {
    if (val === true || val === false || typeof val === 'string' || typeof val === 'number') yellow.push('set常量:' + k);
    else red.push('set非常量:' + k);
  }
  // ⚠⚠ transit() 内含回头检测：pos === _prevPos2 且被追 → chasedByZombies +1。
  //    从「整理整理」返回本场景会再跑一次 transit(同一 pos)，第二次起就命中"回头"误判，白挨 +1 追兵。
  if (/transit\s*\(/.test(src)) red.push('transit位置栈');
  // 函数式里出现 add 段（除 updateTime 内已判的）→ 一并按红报，人工复核
  if (typeof sc.onEnter === 'function' && /\badd\s*:\s*\{/.test(src)) red.push('add段');
  // 对状态变量的直接赋值：命中核心变量清单就算红（v.chasedByZombies = 0 这种"甩追兵"最典型，
  // 整理完回来再跑一次就是白嫖一次甩追兵）。幂等标记（= true/false/字符串）归黄。
  const CORE = /(chasedByZombies|strength|mercuryLoad|itemCount|hh|dd|mm|bottleWater|phoneBattery|waterToxic|hasBottle|hurtByZombie|poisoned|_travelMinutes|_fatiguePaid)/;
  for (const m of src.matchAll(/\bv(?:ars)?\.(\w+)\s*=\s*([^;,)}]{1,24})/g)) {
    const [, name, val] = m;
    if (/^(true|false)$/.test(val.trim()) || /^["']/.test(val.trim())) { yellow.push('幂等:' + name); continue; }
    if (CORE.test(name) || /^[A-Za-z_]*$/.test(name)) red.push('写变量:' + name);
  }
  if (/=\s*!/.test(src)) red.push('取反标记');
  if (sc && sc.qte) info.push('场景QTE');
  return { red, yellow, info };
}

function hasTidyEntry(sc, src) {
  if (/restTidyChoice\s*\(/.test(src)) return 'restTidyChoice';
  const cs = Array.isArray(sc.choices) ? sc.choices : [];
  for (const c of cs) {
    if (c && c.nextScene === '整理整理' && /整理一下物品|整理物品|整理背包/.test(String(c.text || ''))) return '手写选项';
  }
  if (typeof sc.choices === 'function' && /整理一下物品/.test(sc.choices.toString())) return '函数式选项';
  return null;
}

// ---------- 主扫描 ----------
const rows = [];
for (const [id, sc] of Object.entries(sd)) {
  const b = blocks.get(id);
  if (!b) continue;                                   // 动态生成、源码里没有顶层定义，跳过
  if (TARGET_FILE && b.file !== TARGET_FILE) continue;
  if (TARGET_PREFIX && !id.startsWith(TARGET_PREFIX) && id !== TARGET_PREFIX) continue;
  if (/^整理整理/.test(id)) continue;                  // 整理整理自身及其子节点

  const src = b.src;
  const entry = hasTidyEntry(sc, src);
  const isPickup = /elseScene:\s*"整理整理"/.test(src);
  const excluded = EXCLUDE.find(re => re.test(id));
  const stay = STAY.some(re => re.test(id));
  const risk = onEnterRisk(sc);
  const choiceKind = typeof sc.choices === 'function' ? '函数式' : (Array.isArray(sc.choices) ? sc.choices.length + '个' : '无');
  rows.push({ id, file: b.file, line: b.line, entry, isPickup, excluded: excluded ? String(excluded) : '', stay,
    risk: risk.red, warn: risk.yellow, info: risk.info,
    in: indeg.get(id) || 0, choiceKind });
}
const VERBOSE = argv.includes('--verbose');
const riskyTag = (r) => (r.risk.length ? '🔴' : '  ');
const riskyDesc = (r) => (r.risk.length ? `  🔴需guard（${r.risk.join('/')}）` : '')
  + (VERBOSE && r.warn.length ? `  🟡幂等（${r.warn.join('/')}）` : '')
  + (r.info.length ? `  [${r.info.join('/')}]` : '');

// 分区（新达汇专用；别的文件会全部落进"其它"）
function zoneOf(id) {
  if (/^结局/.test(id)) return '结局';
  if (/后勤/.test(id)) return '后勤区';
  if (/屋顶|东区/.test(id)) return '屋顶/东区';
  if (/-B1|B1/.test(id)) return 'B1层';
  const m = id.match(/-([1-5])F/);
  if (m) return m[1] + 'F主楼';
  return '跨层/其它';
}

const scope = TARGET_FILE ? `文件 ${TARGET_FILE}` : (TARGET_PREFIX ? `场景前缀 ${TARGET_PREFIX}` : '全库');
const total = rows.length;
const has = rows.filter(r => r.entry);
const cands = rows.filter(r => !r.entry && !r.excluded && r.stay);

// A 类：拾取点（包满了才会被动跳整理，最该给主动入口）
const A = cands.filter(r => r.isPickup);
// B 类：非拾取点的停留型节点（枢纽/房间）
const B = cands.filter(r => !r.isPickup);

// 排序：无风险优先 → 入度高优先 → 行号
const key = (r) => (r.risk.length ? '1' : '0') + String(999 - r.in).padStart(3, '0');
A.sort((x, y) => key(x).localeCompare(key(y)) || x.line - y.line);
B.sort((x, y) => key(x).localeCompare(key(y)) || x.line - y.line);

const out = [];
const P = (s) => { out.push(s); if (!TO_MD) console.log(s); };

P(`===== ${scope}：场景 ${total} 个 =====`);
P(`已有主动整理入口：${has.length} 个`);
has.forEach(r => P(`  [${r.entry}] ${r.id}  (${r.file}:${r.line})`));
P('');
P(`===== 候选 · A 类：拾取点（含 elseScene:整理整理，但无主动入口）= ${A.length} 个 =====`);
P('   ★ 这类最该补：玩家在此处拿东西，包满才被动弹去整理，没满时想主动腾格子却没门。');
A.forEach(r => P(`  ${riskyTag(r)} ${r.id}  (${r.file}:${r.line})  入度=${r.in} 选项=${r.choiceKind}${riskyDesc(r)}`));
P('');
P(`===== 候选 · B 类：停留型枢纽/房间（无拾取，纯路过也能整理）= ${B.length} 个 =====`);
B.forEach(r => P(`  ${riskyTag(r)} ${r.id}  (${r.file}:${r.line})  入度=${r.in} 选项=${r.choiceKind}${riskyDesc(r)}`));
P('');
const skipped = rows.filter(r => !r.entry && r.excluded);
P(`（已按规则排除 ${skipped.length} 个：结局/战斗/瞬时态/纯对话分支，见脚本 EXCLUDE 表）`);
P('');

// ---------- 分区覆盖：哪片区域一个入口都没有 ----------
const ZONES = ['B1层', '1F主楼', '2F主楼', '3F主楼', '4F主楼', '5F主楼', '后勤区', '屋顶/东区', '跨层/其它', '结局'];
const zstat = new Map(ZONES.map(z => [z, { total: 0, has: 0, a: 0, b: 0 }]));
for (const r of rows) {
  const z = zoneOf(r.id);
  if (!zstat.has(z)) zstat.set(z, { total: 0, has: 0, a: 0, b: 0 });
  const s = zstat.get(z);
  s.total++;
  if (r.entry) s.has++;
  if (A.includes(r)) s.a++;
  if (B.includes(r)) s.b++;
}
P('===== 分区覆盖（空白区 = 玩家在这片区域一个整理入口都碰不到）=====');
P('  区域        场景数  已有入口  A类候选  B类候选');
for (const z of ZONES) {
  const s = zstat.get(z);
  if (!s || !s.total) continue;
  const blank = s.has === 0 ? '   ← 空白区' : '';
  P(`  ${z.padEnd(10)}  ${String(s.total).padStart(4)}   ${String(s.has).padStart(6)}   ${String(s.a).padStart(6)}   ${String(s.b).padStart(6)}${blank}`);
}
P('');

// ---------- 建议采纳：最小可行集 ----------
P('===== 建议采纳（最小可行集）=====');
P('  ① A 类全补 —— 这些节点本来就有 elseScene:"整理整理"，设计意图就是"此处拿了东西要腾格子"，');
P('     只是没给主动入口。补齐不会新增任何语义，纯消缺口。');
P(`     共 ${A.length} 个${A.some(r => r.risk.length) ? `（其中 ${A.filter(r => r.risk.length).length} 个需 guard）` : ''}。`);
P('');
const blankZones = ZONES.filter(z => { const s = zstat.get(z); return s && s.total && !s.has && z !== '结局'; });
if (blankZones.length) {
  P('  ② 空白区补枢纽 —— 每片区域至少给 1 个"路过就能整理"的点，否则玩家得特意跑电梯厅。');
  for (const z of blankZones) {
    const safe = B.filter(r => zoneOf(r.id) === z && !r.risk.length);
    const all = B.filter(r => zoneOf(r.id) === z);
    safe.sort((x, y) => y.in - x.in || x.line - y.line);
    all.sort((x, y) => y.in - x.in || x.line - y.line);
    const top = safe[0] || all[0];
    const tag = safe[0] ? '' : '  ⚠该区无安全候选，此点 onEnter 有副作用，必须配 guard';
    P(`     ${z}：${top ? `${top.id}  (${top.file}:${top.line}，入度${top.in})${tag}` : '⚠ 无候选'}`);
    const alt = (safe[0] ? safe[1] : all[1]);
    if (alt) P(`         备选：${alt.id}（入度${alt.in}）`);
  }
} else {
  P('  ② 无空白区，各区域均已有至少一个入口。');
}
P('');
P('  ③ 更密（可选）—— 从 B 类按入度往下取。注意别每个房间都加，');
P('     整理入口的稀缺性本身就是"要不要为腾格子跑一趟"的取舍来源。');
P('');
P('===== 落改模板 =====');
P('  // 节点内加选项（onEnter 无副作用时）：');
P('  { showCondition: "itemCount > 0", text: "🎒整理一下物品", nextScene: "整理整理",');
P('    effect: { set: { positionAfterOperation: "<本场景ID>" } } }');
P('');
P('  // ⚠ 若该节点 onEnter 有副作用（上面标 ⚠ 的），必须用 guard 版本，否则整理完回来会再结算一次：');
P('  //   1) 选项改用 effect: { set: { positionAfterOperation: "<本场景ID>", _restTidyReturn: true } }');
P('  //   2) onEnter 开头加： var g = restTidyGuard(vars); if (g) return g;');
P('  //   3) 若该节点同时是拾取点，onEnter 里还要预设 positionAfterOperation（elseScene 不执行 effect）');

if (TO_MD) {
  const md = ['# 整理整理入口 · 候选点分析报告', '',
    `> 生成：\`node tools/tidy_entry_candidates.js ${argv.join(' ')}\``, '',
    '```', ...out, '```', '',
    '## 说明', '',
    '- **A 类（拾取点）**：节点内存在 `elseScene: "整理整理"`，说明此处会拿到物品。',
    '  目前只有"包满了被动弹过去"这一条路，玩家想主动腾格子时没有入口 —— 优先级最高。',
    '- **B 类（停留型枢纽/房间）**：不拿东西，但玩家会站住脚（中庭/环廊/店铺/房间）。',
    '  给入口属于"顺手"，要控制密度，别每层每个房间都加。',
    '- **入度**：全库有多少个场景会跳到这里，越高说明玩家越常路过。',
    '- **⚠ onEnter 副作用**：从「整理整理」退出走 `{positionAfterOperation}` 回本场景，',
    '  本场景 onEnter 会**再跑一遍**。推进时间/自增/置标记的节点必须加 `restTidyGuard`，否则是纯刷子。', ''
  ].join('\n');
  const name = 'tidy_entry_candidates_' + (TARGET_FILE ? path.basename(TARGET_FILE, '.js') : (TARGET_PREFIX || 'all')) + '.md';
  fs.writeFileSync(path.join(ROOT, 'tools', name), md, 'utf8');
  console.log('已写出报告: tools/' + name);
}
