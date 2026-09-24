// 战斗失败 · 体力损失提示审计（2026-09-21）
// 目的：检查「失败分支导致的体力扣除」是否给了玩家任何提示/暗示。
// 提示渠道四类：
//   A 系统提示   —— 文案含「【系统提示】」或 {strength} 占位符（引擎渲染实际数值）
//   B 文案暗示   —— 正文用身体失控描写间接点出（酸软/发抖/使不上/沉得像灌了铅…）
//   C 选项预告   —— 选项文字里直接写了「（体力-N）」
//   D 后继提示   —— 失败节点的下一场景才给出提示
// 输出 tools/战斗体力提示审计.md
const fs = require('fs'), vm = require('vm'), path = require('path');
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
  'story/仁济南院.js', 'story/建平中学.js', 'story/复旦江湾.js', 'story/张江.js'
];
// 2026-09-24 根治：以 index.html 为准重算清单（新增剧情文件自动纳入，杜绝"漏加载=假绿"）
try { const _sf = require('./story_files').list(); FILES.length = 0; for (const _f of _sf) FILES.push(_f); } catch (_e) { console.warn('[FILES] 回退内置清单：' + _e.message); }
const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
for (const g of ['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake']) sandbox[g] = function () { };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) { const abs = path.join(ROOT, f); if (!fs.existsSync(abs)) continue; try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); } catch (e) { } }
const sd = vm.runInContext('storyData', sandbox);

function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const base = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const computed = (sd._reactive && sd._reactive.computed) || {};
for (const key of Object.keys(computed)) { const e = computed[key]; try { base[key] = typeof e === 'function' ? e(base) : new Function(...Object.keys(base), 'return (' + e + ');')(...Object.values(base)); } catch (_) { } }
const HI = Object.assign({}, base, { strength: 10, hasIronPipe: true, hasMeleeWeapon: true, meleeWeaponTier: 2, chasedByZombies: 0, itemCount: 0, _input: 'x' });
function stubState() {
  const v = Object.assign({}, HI);
  if (!v._visit) v._visit = {};
  if (v._lastScene === undefined) v._lastScene = '';
  if (v.weather === undefined) v.weather = '晴';
  if (v.hh === undefined) v.hh = 8;
  return v;
}

function rawText(id) { const sc = sd[id]; if (!sc || sc.text === undefined) return ''; return typeof sc.text === 'function' ? sc.text.toString() : String(sc.text); }
function evalText(id) {
  const sc = sd[id]; if (!sc || sc.text === undefined) return '';
  try {
    const t = typeof sc.text === 'function' ? sc.text(stubState()) : sc.text;
    if (typeof t === 'string') return t;
    if (Array.isArray(t)) return t.filter(x => typeof x === 'string').join(' ');
    return '';
  } catch (_) { return ''; }
}
// 关键：effect 可能是对象（{add/set}）也可能是函数（直接改 vars.strength 或返回 {add}），两种都要覆盖
function effectDrop(fnOrObj) {
  if (!fnOrObj) return 0;
  const v = stubState(); const before = v.strength;
  if (typeof fnOrObj === 'function') {
    let out = null;
    try { out = fnOrObj(v) || null; } catch (_) { return NaN; }   // NaN = 求值失败，需人工确认
    if (out && typeof out === 'object') {
      if (out.add && out.add.strength) v.strength += out.add.strength;
      if (out.set && typeof out.set.strength === 'number') v.strength = out.set.strength;
    }
  } else if (typeof fnOrObj === 'object') {
    if (fnOrObj.add && fnOrObj.add.strength) v.strength += fnOrObj.add.strength;
    if (fnOrObj.set && typeof fnOrObj.set.strength === 'number') v.strength = fnOrObj.set.strength;
  }
  return v.strength - before;
}
function netStrengthDrop(id) {
  const sc = sd[id]; if (!sc) return 0;
  const own = effectDrop(sc.onEnter);
  let worst = 0, err = false;
  let cs = sc.choices; try { cs = typeof cs === 'function' ? cs(stubState()) : cs; } catch (_) { cs = null; }
  if (Array.isArray(cs)) for (const c of cs) {
    if (!c || !c.effect) continue;
    const d = effectDrop(c.effect);
    if (Number.isNaN(d)) err = true; else if (d < worst) worst = d;
  }
  if (Number.isNaN(own)) err = true;
  const v = Math.min(Number.isNaN(own) ? 0 : own, worst);
  return err && v === 0 ? NaN : v;
}
function choiceTexts(id) {
  const sc = sd[id]; if (!sc) return [];
  let cs = sc.choices; try { cs = typeof cs === 'function' ? cs(stubState()) : cs; } catch (_) { return []; }
  if (!Array.isArray(cs)) return [];
  return cs.map(c => { if (!c) return ''; const t = c.text; if (typeof t === 'function') { try { return String(t(stubState()) || ''); } catch (_) { return ''; } } return typeof t === 'string' ? t : ''; }).filter(Boolean);
}
function nextScenes(id) {
  const sc = sd[id]; if (!sc) return [];
  const out = [];
  if (typeof sc.nextScene === 'string' && !sc.nextScene.startsWith('{')) out.push(sc.nextScene);
  let cs = sc.choices; try { cs = typeof cs === 'function' ? cs(stubState()) : cs; } catch (_) { cs = null; }
  if (Array.isArray(cs)) for (const c of cs) { if (!c) continue; for (const k of ['nextScene', 'elseScene', 'timeoutScene']) if (typeof c[k] === 'string' && !c[k].startsWith('{')) out.push(c[k]); }
  return [...new Set(out)];
}

const SYS = /【系统提示】/;
const PH = /\{strength\}/;
const BODY = /(体力|力竭|脱力|虚脱|乏力|没劲|使不上|酸软|发软|发颤|发抖|打颤|喘不上|腿软|灌了铅|沉得|沉甸甸|虚弱|头重脚轻|眼前发黑|站不稳|撑不住|扶不住|气力|身子发冷|麻木)/;
const ZOMBIE = /丧尸|尸|黑皮|咬|撕|扑|抓|残肢|啃|巡逻队|守卫战/;

// 收集全部失败分支目标
const failSrc = {};
function note(tgt, from, kind) { if (!tgt || typeof tgt !== 'string' || tgt.startsWith('{')) return; (failSrc[tgt] = failSrc[tgt] || []).push(from + '(' + kind + ')'); }
for (const from of Object.keys(sd)) {
  if (from.startsWith('_')) continue;
  const sc = sd[from]; if (!sc || typeof sc !== 'object') continue;
  let cs = sc.choices; try { cs = typeof cs === 'function' ? cs(stubState()) : cs; } catch (_) { }
  if (Array.isArray(cs)) for (const c of cs) {
    if (!c) continue;
    if (c.elseScene) note(c.elseScene, from, 'else');
    if (c.timeoutScene) note(c.timeoutScene, from, 'timeout');
  }
  const q = sc.qte; let qq = q; try { qq = typeof q === 'function' ? q(stubState()) : q; } catch (_) { qq = null; }
  if (qq && qq.onTimeout) note(qq.onTimeout, from, 'QTE超时');
}

const rows = [];
for (const tgt of Object.keys(failSrc)) {
  const sc = sd[tgt]; if (!sc) continue;
  if (/^结局/.test(tgt)) continue;
  const drop = netStrengthDrop(tgt);
  if (Number.isNaN(drop)) { rows.push({ tgt, drop: '?', channels: ['求值失败'], src: [...new Set(failSrc[tgt])], own: evalText(tgt).replace(/\s+/g, ' ').slice(0, 50), combat: true }); continue; }
  if (drop >= 0) continue;
  const evT = evalText(tgt), rawT = rawText(tgt), own = evT + ' ' + rawT;   // 检测用：求值结果 + 源码，双保险
  const cs = choiceTexts(tgt);
  const nxt = nextScenes(tgt);
  const srcText = failSrc[tgt].map(s => { const k = s.replace(/\((else|timeout|QTE超时)\)/, ''); return evalText(k) + ' ' + rawText(k); }).join(' ');
  const combat = ZOMBIE.test(own + srcText);
  const isEnd = /^结局/.test(tgt) || /——\s*结局：/.test(evT + rawT);   // 死亡结局：人已死，体力提示无意义，不计入"无提示"
  const channels = [];
  // 先剥掉系统提示行再检测正文暗示——否则提示里的"体力"二字会被 BODY 误判
  const ownProse = own.replace(/<span[^>]*>【系统提示】[^<]*<\/span>/g, ' ');
  if (SYS.test(own) || PH.test(own)) channels.push('系统提示');
  if (BODY.test(ownProse)) channels.push('文案暗示');
  if (cs.some(t => /体力\s*[-−]/.test(t))) channels.push('选项预告');
  let nxtSys = false, nxtHint = false;
  for (const n of nxt) { const t = evalText(n) + ' ' + rawText(n); if (SYS.test(t) || PH.test(t)) nxtSys = true; if (BODY.test(t)) nxtHint = true; }
  if (nxtSys) channels.push('后继系统提示'); else if (nxtHint) channels.push('后继暗示');
  rows.push({ tgt, drop, channels, end: isEnd, own: (evT || rawT).replace(/\s+/g, ' ').slice(0, 60), src: [...new Set(failSrc[tgt])], combat });
}
rows.sort((a, b) => (a.combat === b.combat ? 0 : a.combat ? -1 : 1) || (a.channels.length - b.channels.length));

const C = rows.filter(r => r.combat), N = rows.filter(r => !r.combat);
const cNone = C.filter(r => !r.channels.length && !r.end), nNone = N.filter(r => !r.channels.length && !r.end);
const cEnd = rows.filter(r => r.end);
const cLive = C.filter(r => !r.end).length, nLive = N.filter(r => !r.end).length;
const L = [], P = s => L.push(s);
P('# 战斗失败 · 体力损失提示审计');
P('');
P('> 生成：' + new Date().toLocaleString('zh-CN') + '　｜　工具：`node tools/combat_stamina_feedback_audit.js`（可复跑）');
P('> 范围：所有「失败分支（elseScene / timeoutScene / QTE超时）」目标中**实际扣除体力**的非死亡节点。');
P('');
P('## 一、结论');
P('');
P('**引擎侧事实：体力变化没有任何全局自动提示。** `flashStatusWarning()` 的全部调用点都在 `core.js` / `utils.js` 的**环境消耗**（饥饿、连续移动、受凉、烈日暴晒），**无一处来自战斗**；`engine.js` 的体力 Proxy 只是开发期遥测记录，不向玩家显示。所以提示**只能靠文案手写**，三条通道：');
P('');
P('1. **系统提示**：文案里写 `【系统提示】体力-N，当前体力：{strength}`（`{strength}` 由 `engine.js:785 interpolateDisplay()` 渲染成实际数值）；');
P('2. **文案暗示**：正文用身体描写间接点出（"手臂发软""体力不够"）；');
P('3. **选项预告**：在选项文字里直接标注「（体力-N）」，决策前即可见。');
P('');
P('另有**后继提示**——失败当帧不给，进入下一场景才由条件式文案补一行，玩家容易错过。');
P('');
P('| 分类 | 节点数 | 完全无提示 | 无提示占比 |');
P('|---|---|---|---|');
P('| **战斗类失败**（打丧尸/尸潮） | ' + C.length + ' | **' + cNone.length + '** | ' + (cLive ? Math.round(cNone.length / cLive * 100) : 0) + '% |');
P('| 其他失败（摔伤/做饭/摸黑等） | ' + N.length + ' | ' + nNone.length + ' | ' + (nLive ? Math.round(nNone.length / nLive * 100) : 0) + '% |');
P('| 合计 | ' + rows.length + ' | ' + (cNone.length + nNone.length) + ' | ' + Math.round((cNone.length + nNone.length) / (cLive + nLive) * 100) + '% |');
P('');
P('> 另有 **' + cEnd.length + '** 个失败目标本身就是死亡结局（人已死，体力提示无意义），不计入上表的无提示统计：' + cEnd.map(r => '`' + r.tgt + '`').join('、') + '。');
P('');
P('---');
P('');
P('## 二、战斗类 · 完全无提示（' + cNone.length + ' 个，建议优先补）');
P('');
if (!cNone.length) P('（无）');
for (const r of cNone) P('- `' + r.tgt + '`　体力 ' + r.drop + '　←　' + r.src.join('、') + '　　｜文案："' + r.own + '…"');
P('');
P('## 三、战斗类 · 逐节点明细（' + C.length + ' 个）');
P('');
P('| 失败节点 | 体力 | 提示渠道 | 失败来源 |');
P('|---|---|---|---|');
for (const r of C) P('| `' + r.tgt + '` | ' + r.drop + ' | ' + (r.channels.length ? r.channels.join(' / ') : (r.end ? '—（死亡结局）' : '**❌ 无**')) + ' | ' + r.src.join('、') + ' |');
P('');
P('---');
P('');
P('## 四、其他失败（非战斗，' + N.length + ' 个，供参考）');
P('');
P('| 失败节点 | 体力 | 提示渠道 | 失败来源 |');
P('|---|---|---|---|');
for (const r of N) P('| `' + r.tgt + '` | ' + r.drop + ' | ' + (r.channels.length ? r.channels.join(' / ') : (r.end ? '—（死亡结局）' : '**❌ 无**')) + ' | ' + r.src.join('、') + ' |');
P('');
P('---');
P('');
P('## 五、按提示渠道分组（仅战斗类）');
P('');
for (const ch of ['系统提示', '文案暗示', '选项预告', '后继系统提示', '后继暗示']) {
  const g = C.filter(r => r.channels.includes(ch));
  P('### ' + ch + '（' + g.length + '）');
  P('');
  if (!g.length) P('（无）');
  for (const r of g) P('- `' + r.tgt + '`（体力 ' + r.drop + '）');
  P('');
}
P('> 注：一个节点可能同时具备多种渠道，故分组数之和大于节点总数。');

fs.writeFileSync(path.join(ROOT, 'tools', '战斗体力提示审计.md'), L.join('\n'), 'utf8');
console.log('失败节点(扣体力)=' + rows.length + ' 战斗类=' + C.length + ' 战斗类无提示=' + cNone.length + ' 其他类=' + N.length);
console.log('--- 战斗类无提示 ---');
for (const r of cNone) console.log('  ' + r.tgt + '  ' + r.drop);
console.log('--- 求值失败 ---');
for (const r of rows.filter(r => Number.isNaN(r.drop) || r.drop === '?')) console.log('  ' + r.tgt);
console.log('--- 战斗类有提示（渠道）---');
for (const r of C.filter(r => r.channels.length)) console.log('  ' + r.tgt + '  ' + r.drop + '  [' + r.channels.join('/') + ']');
console.log('[已写出] tools/战斗体力提示审计.md');
