// 审计：函数化选项「拼命冲刺，甩开追兵！」（utils.js `sprintAway`，showCondition: chasedByZombies > 2）
// 所在场景是否会让玩家看到"正在被尸群追赶"的语境（唯一通道 = describeZombieWave）。
//
// 方法：不靠源码文本猜，而是劫持 describeZombieWave 打探针，在 chasedByZombies = 3/4/5
// 等真实触发状态下实跑场景 text，看探针是否拿到非空描述。
//   探针非空  → 玩家此刻能看到追兵描写
//   探针为空  → 玩家看不到（要么没调，要么被 _powerOut/无手电 之类的条件屏蔽）
//
// 输出：console 摘要 + tools/sprint_away_audit.json + tools/冲刺选项追兵描述审计报告.md
const fs = require('fs'), vm = require('vm'), path = require('path');

const ROOT = process.cwd();
const CORE = ['story/utils.js', 'story/core.js'];
const REST = [
  'story/夜晚剧情.js',
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
function run(f) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { console.log('缺失:', f); return; }
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); loadedOk.push(f); }
  catch (e) { console.log('执行失败', f, e.message); }
}
for (const f of CORE) run(f);

// ---- 劫持 sprintAway：给返回的选项对象打标记 ----
const origSprint = sandbox.sprintAway;
sandbox.sprintAway = function (destinations) {
  const o = origSprint(destinations);
  o.__sprintAway = true;
  o.__destIsFn = typeof destinations === 'function';
  o.__destRaw = destinations;
  o.__destSrc = typeof destinations === 'function'
    ? destinations.toString().replace(/\s+/g, ' ').trim()
    : JSON.stringify(destinations);
  return o;
};

// ---- 劫持 describeZombieWave：探针记录返回值 ----
const origDZW = sandbox.describeZombieWave;
let probe = null;
sandbox.describeZombieWave = function (vars) {
  const r = origDZW(vars);
  if (probe) probe.push(String(r == null ? '' : r));
  return r;
};

for (const f of REST) run(f);
const sd = vm.runInContext('storyData', sandbox);

// ---- 源码归因：场景 id -> 文件 / 下标 ----
const fileText = {};
for (const f of loadedOk) fileText[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');
function skipStringOrComment(s, i) {
  const c = s[i];
  if (c === '/' && s[i + 1] === '/') { const j = s.indexOf('\n', i); return j < 0 ? s.length : j + 1; }
  if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); return j < 0 ? s.length : j + 2; }
  if (c === '"' || c === "'" || c === '`') {
    let j = i + 1;
    while (j < s.length) { if (s[j] === '\\') { j += 2; continue; } if (s[j] === c) return j + 1; j++; }
    return s.length;
  }
  return -1;
}
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
function lineOf(s, idx) { return s.slice(0, idx).split('\n').length; }
const SCENE_DEF = new Map(); // id -> { file, idx }
for (const f of loadedOk) {
  const t = fileText[f];
  const re = /^\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([A-Za-z_$][\w$]*))\s*:\s*(?=\{|[A-Za-z_$])/gm;
  let m;
  while ((m = re.exec(t)) !== null) {
    const id = m[1] || m[2] || m[3];
    if (!id || id.startsWith('_')) continue;
    if (!SCENE_DEF.has(id)) SCENE_DEF.set(id, { file: f, idx: m.index });
  }
}
// 在场景体内定位某个属性（如 text）的值范围 [start, end) 与所在行号
function attrRange(file, sceneId, attr) {
  const def = SCENE_DEF.get(sceneId);
  if (!def) return null;
  const t = fileText[def.file];
  let i = t.indexOf(':', def.idx);
  if (i < 0) return null;
  i++;
  while (i < t.length && /\s/.test(t[i])) i++;
  if (t[i] !== '{') return null;
  const end = matchBracket(t, i);
  if (end < 0) return null;
  const body = t.slice(i, end);
  let d = 0, p = 0;
  while (p < body.length) {
    const ns = skipStringOrComment(body, p);
    if (ns > 0) { p = ns; continue; }
    const ch = body[p];
    if (ch === '{' || ch === '(' || ch === '[') { d++; p++; continue; }
    if (ch === '}' || ch === ')' || ch === ']') { d--; p++; continue; }
    if (d === 1 && body.startsWith(attr, p) && /^\s*:/.test(body.slice(p + attr.length))) {
      let v = i + p + attr.length;
      v = t.indexOf(':', v) + 1;
      while (v < t.length && /\s/.test(t[v])) v++;
      let dd = 0, q = v;
      while (q < t.length) {
        const ns2 = skipStringOrComment(t, q);
        if (ns2 > 0) { q = ns2; continue; }
        const c2 = t[q];
        if (c2 === '{' || c2 === '(' || c2 === '[') dd++;
        else if (c2 === '}' || c2 === ')' || c2 === ']') { if (dd === 0) break; dd--; }
        else if (c2 === ',' && dd === 0) break;
        q++;
      }
      return { start: v, end: q, line: lineOf(t, v) };
    }
    p++;
  }
  return null;
}
function attrLine(file, sceneId, attr) { const r = attrRange(file, sceneId, attr); return r ? r.line : null; }
// 场景 text 属性内部的最后一个 return 行号（P0 场景的修复点）
function lastReturnLine(file, sceneId) {
  const r = attrRange(file, sceneId, 'text');
  if (!r) return null;
  const seg = fileText[file].slice(r.start, r.end);
  let p = 0, last = null;
  while (p < seg.length) {
    const ns = skipStringOrComment(seg, p);
    if (ns > 0) { p = ns; continue; }
    if (seg.startsWith('return', p) && !/[\w$]/.test(seg[p - 1] || ' ') && !/[\w$]/.test(seg[p + 6] || ' ')) last = r.start + p;
    p++;
  }
  return last === null ? null : lineOf(fileText[file], last);
}
function areaOf(f) {
  if (!f) return '(未定位)';
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

// ---- state 构造 ----
function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const computed = (sd._reactive && sd._reactive.computed) || {};
const baseVars = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);

function mkState(ch, visitV, extra) {
  const st = Object.assign({}, baseVars, { chasedByZombies: ch, showZombies: true, strength: 10, hh: 14, dd: 3 }, extra || {});
  Object.defineProperty(st, '_visit', { value: new Proxy({}, { get: () => visitV }), enumerable: true, configurable: true });
  for (const key of Object.keys(computed)) {
    const e = computed[key];
    try { st[key] = typeof e === 'function' ? e(st) : new Function(...Object.keys(st), 'return (' + e + ');')(...Object.values(st)); } catch (_) {}
  }
  return st;
}
// 触发态：sprintAway 的 showCondition 是 ch>2，所以只看 ch=3/4/5
const STATES = [];
for (const ch of [3, 4, 5]) for (const v of [0, 1]) STATES.push([`ch=${ch}·_visit=${v}`, mkState(ch, v)]);

// ---- 收集：含 sprintAway 选项的场景 ----
function getChoices(node) {
  if (Array.isArray(node.choices)) return node.choices;
  if (typeof node.choices === 'function') {
    try { return node.choices(mkState(3, 1)) || null; } catch (_) { return null; }
  }
  return null;
}
function textSource(node) {
  if (typeof node.text === 'function') return node.text.toString();
  if (typeof node.text === 'string') return JSON.stringify(node.text);
  return '';
}
function runText(node, st) {
  if (typeof node.text === 'string') return node.text;
  if (typeof node.text !== 'function') return '';
  probe = [];
  let out = '';
  try { out = node.text(st) || ''; } catch (e) { out = '[ERR] ' + e.message; }
  const hits = probe.filter(s => s.length > 0);
  probe = null;
  if (Array.isArray(out)) out = out.join('\n');
  return { out: String(out), hit: hits.length > 0, calls: probe ? 0 : undefined, hitText: hits[0] || '' };
}

const rows = [];
for (const key of Object.keys(sd)) {
  if (key.startsWith('_')) continue;
  const node = sd[key];
  if (!node || typeof node !== 'object') continue;
  const choices = getChoices(node);
  if (!choices) continue;
  const sp = choices.filter(c => c && c.__sprintAway);
  if (!sp.length) continue;

  const def = SCENE_DEF.get(key);
  const file = def ? def.file : '';
  const src = textSource(node);
  const hasCall = /describeZombieWave\s*\(/.test(src);
  const callCount = (src.match(/describeZombieWave\s*\(/g) || []).length;
  const returnCount = (src.match(/\breturn\b/g) || []).length;
  const textLine = attrLine(file, key, 'text');
  const retLine = lastReturnLine(file, key);
  // 该场景是否另有"躲藏"类兜底选项（chasedByZombies 门槛 + 文案含"躲"）
  const hideChoice = choices.find(c => c && typeof c.showCondition === 'string' &&
    /chasedByZombies/.test(c.showCondition) && typeof c.text === 'string' && /躲/.test(c.text));
  // 冲刺目标清单（函数式目标在 ch=3 状态下求值）
  let destList = '';
  try {
    const raw = sp[0].__destRaw;
    const arr = typeof raw === 'function' ? raw(mkState(3, 0)) : raw;
    destList = Array.isArray(arr) ? arr.join(' / ') : String(arr);
  } catch (e) { destList = '(求值失败) ' + sp[0].__destSrc; }

  let okStates = 0, emptyStates = [], sample = '';
  for (const [label, st] of STATES) {
    const r = runText(node, st);
    if (r && r.hit) { okStates++; if (!sample) sample = r.hitText; }
    else if (r) emptyStates.push(label);
    if (r && r.out && !sample) sample = r.out;
  }

  let level;
  if (!hasCall && typeof node.text === 'string') level = 'P0-纯字符串文案';
  else if (okStates === 0) level = 'P0-完全缺失';
  else if (okStates < STATES.length) level = 'P1-部分状态盲区';
  else level = 'OK';
  // 源码里根本没调用、但探测却命中？不可能；反向：源码有调用但恒空（如 _powerOut 屏蔽）
  if (hasCall && okStates === 0) level = 'P0-调用被条件屏蔽';

  // 场景文本里已有的"丧尸相关"句子，便于人工判断措辞是否与"被尸群追"冲突
  const flat = String(sample).replace(/\s+/g, ' ');
  const zombieSentences = flat.split(/[。！？\n]/).filter(s => /丧尸|尸群|尸潮|追兵/.test(s)).map(s => s.trim() + '。');

  rows.push({
    id: key, file, area: areaOf(file),
    textKind: typeof node.text === 'function' ? '函数' : (typeof node.text === 'string' ? '字符串' : '无'),
    destIsFn: !!sp[0].__destIsFn, destCount: sp.length, destList,
    hasCall, callCount, returnCount,
    outdoor: node.outdoor === true,
    textLine, retLine,
    hideChoiceText: hideChoice ? String(hideChoice.text) : null,
    okStates, totalStates: STATES.length, emptyStates,
    level, sample: flat.slice(0, 200), zombieSentences,
    textSrc: src.replace(/\s+/g, ' ').slice(0, 300)
  });
}

// 排序：问题优先
const rank = { 'P0-完全缺失': 0, 'P0-调用被条件屏蔽': 1, 'P0-纯字符串文案': 2, 'P1-部分状态盲区': 3, 'OK': 4 };
rows.sort((a, b) => (rank[a.level] - rank[b.level]) || a.id.localeCompare(b.id));

// ===== console 输出 =====
const cnt = {};
for (const r of rows) cnt[r.level] = (cnt[r.level] || 0) + 1;
const byArea = {};
for (const r of rows) (byArea[r.area] = byArea[r.area] || []).push(r);

console.log('=== sprintAway「拼命冲刺，甩开追兵！」场景审计 ===');
console.log(`共 ${rows.length} 个场景含该选项（showCondition: chasedByZombies > 2）`);
console.log('结论分级: ' + Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(' / '));
console.log('（探测状态： chasedByZombies = 3/4/5 × _visit = 0/1，共 ' + STATES.length + ' 组）\n');
console.log('--- 按区域 ---');
for (const [a, list] of Object.entries(byArea).sort((x, y) => y[1].length - x[1].length)) {
  const bad = list.filter(r => r.level !== 'OK').length;
  console.log(`  ${a}: ${list.length} 处${bad ? `（其中 ${bad} 处有问题）` : ''}`);
}
console.log('\n--- 明细 ---');
for (const r of rows) {
  const flag = r.level === 'OK' ? '✅' : (r.level.startsWith('P0') ? '❌' : '⚠️');
  console.log(`\n${flag} [${r.area}] ${r.id}`);
  console.log(`    ${r.level} | text=${r.textKind} | describeZombieWave 调用 ${r.callCount} 次 / return ${r.returnCount} 次 | 探测命中 ${r.okStates}/${r.totalStates} | 目标数 ${r.destCount}${r.destIsFn ? '(函数式)' : ''} | outdoor=${r.outdoor}`);
  if (r.emptyStates.length) console.log(`    盲区状态: ${r.emptyStates.join(', ')}`);
  if (r.level !== 'OK') console.log(`    文案样本: ${r.sample}`);
}

fs.writeFileSync(path.join(ROOT, 'tools', 'sprint_away_audit.json'), JSON.stringify(rows, null, 2), 'utf8');

// ===== Markdown 报告 =====
const L = [];
L.push('# 「拼命冲刺，甩开追兵！」场景追兵描述审计报告\n');
L.push('> 由 `node tools/sprint_away_audit.js` 自动生成。');
L.push('> 审计对象：`utils.js` 的 `sprintAway(destinations)` 工厂生成的选项（`showCondition: chasedByZombies > 2`）。');
L.push('> 判据：**该选项出现时，玩家能否在本场景文本里看到"正在被尸群追赶"**——唯一通道是 `describeZombieWave(vars)`。');
L.push('> 方法：劫持 `describeZombieWave` 打探针，在 `chasedByZombies = 3/4/5 × _visit = 0/1` 共 6 组触发态下实跑场景 `text`，探针拿到非空描述才算命中。\n');

L.push('\n## 一、总览\n');
L.push('| 结论 | 场景数 |');
L.push('| --- | --- |');
for (const [k, v] of Object.entries(cnt).sort((a, b) => rank[a[0]] - rank[b[0]])) L.push(`| ${k} | ${v} |`);
L.push(`| **合计** | **${rows.length}** |`);
L.push('\n分级口径：');
L.push('- **❌ P0-完全缺失**：场景文本里根本没调 `describeZombieWave`，玩家看不到任何追兵描写，选项凭空出现。');
L.push('- **❌ P0-调用被条件屏蔽**：源码有调用，但所有触发态下都返回空（例如被 `_powerOut && !hasTorch` 之类的条件吃掉）。');
L.push('- **❌ P0-纯字符串文案**：场景 `text` 是固定字符串，不含任何动态追兵信息。');
L.push('- **⚠️ P1-部分状态盲区**：某些触发态能命中、某些不能，`_visit`/分支不同会漏。');
L.push('- **✅ OK**：全部触发态都能看到追兵描写。\n');

L.push('\n## 二、按区域分布\n');
L.push('| 区域 | 含该选项 | 有问题 |');
L.push('| --- | --- | --- |');
for (const [a, list] of Object.entries(byArea).sort((x, y) => y[1].length - x[1].length)) {
  L.push(`| ${a} | ${list.length} | ${list.filter(r => r.level !== 'OK').length || '-'} |`);
}

const bad = rows.filter(r => r.level !== 'OK');
L.push(`\n## 三、问题场景明细（${bad.length} 处）\n`);
if (!bad.length) L.push('无。');
else {
  L.push('| 场景 | 区域 | 分级 | text | describeZombieWave 调用/return | 探测命中 |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of bad) {
    L.push(`| ${r.id} | ${r.area} | ${r.level} | ${r.textKind} | ${r.callCount}/${r.returnCount} | ${r.okStates}/${r.totalStates} |`);
  }
  L.push('');
  for (const r of bad) {
    L.push(`\n### ${r.id}（${r.area}）\n`);
    L.push(`- **分级**：${r.level}`);
    L.push(`- **位置**：\`${r.file}\` 第 ${r.textLine} 行（\`text\`）、第 ${r.retLine} 行（最后一个 \`return\`）`);
    L.push(`- **现状**：\`text\` 为${r.textKind}，全文未调用 \`describeZombieWave\`（调用 ${r.callCount} 次 / return ${r.returnCount} 处）`);
    L.push(`- **冲刺目标**：${r.destList}`);
    L.push(`- **兜底选项**：${r.hideChoiceText ? `有「${r.hideChoiceText}」（\`chasedByZombies > 1\`）` : '无躲藏类兜底选项'}`);
    L.push(`- **现有丧尸措辞**：${r.zombieSentences.length ? r.zombieSentences.map(s => '「' + s + '」').join('、') : '（无）'}`);
    if (r.zombieSentences.some(s => /几只|稀稀拉拉|远处徘徊|零星|三三两两/.test(s))) {
      L.push(`- **⚠️ 措辞冲突**：现有文案把丧尸写成"零星 / 远处徘徊"，与「被 3 只以上尸群追击」的进入状态直接矛盾，建议连带改写（不只是补一句描写）。`);
    }
    L.push(`\n  文案样本：\n\n  > ${r.sample}`);
  }
}

L.push(`\n## 四、已达标场景（${rows.length - bad.length} 处）\n`);
L.push('| 场景 | 区域 | describeZombieWave 调用 | 目标数 | 函数式目标 | 兜底选项 | 行号 | outdoor |');
L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows.filter(r => r.level === 'OK')) {
  L.push(`| ${r.id} | ${r.area} | ${r.callCount} | ${r.destCount} | ${r.destIsFn ? '是' : '-'} | ${r.hideChoiceText ? r.hideChoiceText : '-'} | ${r.textLine} | ${r.outdoor ? '是' : '-'} |`);
}

L.push('\n## 五、修复方向（参考）\n');
L.push('1. **首选**：在缺失场景的 `text` 末尾补 `+ describeZombieWave(vars)`（与全库其余户外场景写法一致，随机池自带分级文案，无需另写）。');
L.push('2. 若该场景 `text` 是函数且有多个 `return` 分支，**每个分支都要补**，否则仍会漏（`P1-部分状态盲区` 即此类）。');
L.push('3. 若不想让该场景显示追兵描写，则应改用 `sprintAway` 之外的、`showCondition` 更宽的选项，或给 `sprintAway` 的 `showCondition` 加上本场景可感知的前提。');
L.push('4. 注意 `describeZombieWave` 在 `_powerOut && !hasTorch` 时返回空串——户外东明街道一般不触发，但若场景是室内断电环境需另行确认。\n');

L.push('\n## 六、范围与边界说明\n');
L.push('- **统计范围**：全库所有含 `sprintAway(...)` 选项的场景（共 ' + rows.length + ' 个）。该工厂只在 `chasedByZombies > 2` 时展示，故探测状态只取 `ch=3/4/5`。');
L.push('- **不含**：由 QTE 超时（`onTimeout`）、`elseScene` 等跳入的相邻节点。抽查确认「安盛街东侧-犹豫」（安盛街.js:92，QTE 超时目标）文案自带追兵描写，不在问题之列；若需扩展审计到全部"被追时可达节点"，可复用本脚本探针方式另跑一轮。');
L.push('- **探针法**：脚本劫持 `describeZombieWave` 记录返回值，非空才算"玩家看得见"。因此能识别"源码里写了调用、但被条件屏蔽 / 分支漏写"的隐性缺失（`P1` 类）。\n');

fs.writeFileSync(path.join(ROOT, 'tools', '冲刺选项追兵描述审计报告.md'), L.join('\n') + '\n', 'utf8');
console.log('\n已写出 tools/sprint_away_audit.json 与 tools/冲刺选项追兵描述审计报告.md');
