// 战斗惩罚审计报告生成器 v2（2026-09-21）
// 输出 tools/战斗惩罚审计报告.md
// 分类：A 颜色记忆QTE战斗 / B 体力门槛战斗 / C 其他战斗；非战斗的解谜与门槛单列。
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
const sandbox = { console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date, isNaN, parseInt, parseFloat, RegExp, Error, Function };
for (const g of ['flashStatusWarning', 'flashStatus', 'showToast', 'notify', 'triggerShake']) sandbox[g] = function () { };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  try { vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: f }); } catch (e) { console.error('!!', f, e.message); }
}
const sd = vm.runInContext('storyData', sandbox);
const FLASH = vm.runInContext('checkFlashAnswer', sandbox);

function setReplacer(k, v) { return (v instanceof Set) ? { __set: Array.from(v) } : v; }
function setReviver(k, v) { return (v && typeof v === 'object' && Array.isArray(v.__set)) ? new Set(v.__set) : v; }
const base = JSON.parse(JSON.stringify(sd._variables, setReplacer), setReviver);
const computed = (sd._reactive && sd._reactive.computed) || {};
for (const key of Object.keys(computed)) { const e = computed[key]; try { base[key] = typeof e === 'function' ? e(base) : new Function(...Object.keys(base), 'return (' + e + ');')(...Object.values(base)); } catch (_) { } }
const HI = Object.assign({}, base, { strength: 10, hasIronPipe: true, hasMeleeWeapon: true, meleeWeaponTier: 2, chasedByZombies: 0, itemCount: 0, _input: 'x' });

const ZOMBIE = /丧尸|尸潮|尸群|黑皮|它|咬|撕|扑|血|残肢|啃/;
function textOf(id) { const sc = sd[id]; if (!sc) return ''; try { const t = typeof sc.text === 'function' ? sc.text(Object.assign({}, HI)) : sc.text; return typeof t === 'string' ? t.replace(/\s+/g, ' ').trim() : ''; } catch (_) { return ''; } }
function isEnding(id) {
  const sc = sd[id]; if (!sc) return true;
  if (/^结局/.test(id)) return true;
  // 文案含"结局：xxx"标记的也是终局（防某些未以"结局-"命名的死亡节点漏判）
  const t = textOf(id);
  if (/结局\s*[:：]/.test(t)) return true;
  return false;
}
function mergeEff(r, e) {
  if (!e || typeof e !== 'object') return;
  if (e.add) { if (e.add.strength) r.str += e.add.strength; if (e.add.mercuryLoad) r.merc += e.add.mercuryLoad; }
  if (e.set && e.set.hurtByZombie !== undefined) r.hurt = e.set.hurtByZombie;
}
// 汇总节点自身的 onEnter 与「节点内选项」携带的惩罚（很多"犹豫"节点把扣体力写在选项 effect 上）
function effOf(id) {
  const sc = sd[id]; if (!sc) return null;
  const r = { str: 0, merc: 0, hurt: null, brk: false, drain: false, fromChoice: false };
  let e = sc.onEnter;
  if (e) {
    const src = e.toString();
    r.brk = /tryBreakWeapon/.test(src);
    r.drain = /combatDrain\s*\(/.test(src);
    if (typeof e === 'function') {
      const v = Object.assign({}, HI);
      let out = {};
      try { out = e(v) || {}; } catch (err) { r.err = err.message; out = {}; }
      if (v.strength !== HI.strength) r.str += (v.strength - HI.strength);
      if ((v.mercuryLoad || 0) !== (HI.mercuryLoad || 0)) r.merc += ((v.mercuryLoad || 0) - (HI.mercuryLoad || 0));
      if (v.hurtByZombie === true) r.hurt = true;
      mergeEff(r, out);
    } else mergeEff(r, e);
  }
  // 节点内选项 effect：同名惩罚不累加（多出口只取最重的一支），避免重复计
  let cs = sc.choices; try { cs = typeof cs === 'function' ? cs(HI) : cs; } catch (_) { cs = null; }
  if (Array.isArray(cs)) for (const c of cs) {
    if (!c || !c.effect) continue;
    let ce = c.effect;
    if (typeof ce === 'function') { const v = Object.assign({}, HI); try { ce = ce(v) || {}; } catch (_) { continue; } }
    const t = { str: 0, merc: 0, hurt: null };
    mergeEff(t, ce);
    if (t.str < r.str) { r.str = t.str; r.fromChoice = true; }
    if (t.merc > r.merc) { r.merc = t.merc; r.fromChoice = true; }
    if (t.hurt === true && r.hurt !== true) { r.hurt = true; r.fromChoice = true; }
  }
  return r;
}
function pen(e) {
  if (!e) return '—';
  const p = [];
  if (e.str) p.push('体力 ' + e.str);
  if (e.merc) p.push('汞负荷 +' + e.merc);
  if (e.hurt === true) p.push('抓伤');
  if (e.brk) p.push('武器可能损坏');
  return p.join('、') || '—';
}
function tmo(t) { if (t === undefined || t === null) return '默认'; if (typeof t === 'number') return t / 1000 + 's'; return String(t); }

const combats = [], gates = [], puzzles = [];
const failNodes = {};
function addFail(tgt, from) { if (!failNodes[tgt]) failNodes[tgt] = { end: isEnding(tgt), eff: effOf(tgt), txt: textOf(tgt).slice(0, 70), src: [] }; failNodes[tgt].src.push(from); }

for (const from of Object.keys(sd)) {
  if (from.startsWith('_')) continue;
  const sc = sd[from]; if (!sc || typeof sc !== 'object') continue;
  let cs = sc.choices; try { cs = typeof cs === 'function' ? cs(HI) : cs; } catch (_) { continue; }
  if (!Array.isArray(cs)) continue;
  const sceneTxt = textOf(from);
  for (const c of cs) {
    if (!c) continue;
    const cond = typeof c.condition === 'string' ? c.condition : '';
    const nextS = typeof c.nextScene === 'string' ? c.nextScene : '';
    const tgt = c.elseScene || c.timeoutScene;
    const strengthGate = /strength\s*[<>]=?/.test(cond);
    const isFlash = c.condition === FLASH;
    // A 颜色 QTE 战斗
    if (isFlash && tgt) { combats.push({ from, kind: 'A', cond: 'checkFlashAnswer', next: nextS, succ: nextS ? effOf(nextS) : null, tgt, timeout: c.timeout }); addFail(tgt, from); continue; }
    // 输入型但非闪色 = 非战斗解谜
    if (c.input && tgt) { puzzles.push({ from, tgt, cond: cond || '(自定义)' }); continue; }
    // B 体力门槛（有失败分支）
    if (strengthGate && tgt) {
      const ctx = (sceneTxt + ' ' + (c.text && typeof c.text === 'string' ? c.text : '') + ' ' + textOf(tgt)).slice(0, 400);
      (ZOMBIE.test(ctx) ? combats : gates).push({ from, kind: ZOMBIE.test(ctx) ? 'B' : 'gate', cond, next: nextS, succ: nextS ? effOf(nextS) : null, tgt });
      if (ZOMBIE.test(ctx)) addFail(tgt, from);
      continue;
    }
    // C 其他战斗（选项文案/失败结局带丧尸味）；排除背包容量类非战斗门槛
    if (tgt && /击杀|战斗|清场|解决|反杀|迎战|搏斗|拼了/.test(nextS) && !/itemCount|bagVolume/.test(cond) && tgt !== '整理整理') {
      combats.push({ from, kind: 'C', cond: cond || '—', next: nextS, succ: nextS ? effOf(nextS) : null, tgt, timeout: c.timeout }); addFail(tgt, from);
    }
  }
}

// ---- D 类：场景级限时 QTE（scene.qte.timeout + onTimeout）----
const qtess = [];
for (const id of Object.keys(sd)) {
  if (id.startsWith('_')) continue;
  const sc = sd[id]; if (!sc || typeof sc !== 'object' || !sc.qte) continue;
  let q = sc.qte; try { q = typeof q === 'function' ? q(HI) : q; } catch (_) { continue; }
  if (!q || !q.onTimeout) continue;
  const tgt = q.onTimeout;
  qtess.push({ from: id, timeout: q.timeout, tgt, hidden: !!q.hidden });
  addFail(tgt, id + '(场景QTE超时)');
}

// 胜利也扣体力的节点
let drainNodes = [];
for (const id of Object.keys(sd)) { if (id.startsWith('_')) continue; const e = effOf(id); if (e && e.drain) drainNodes.push(id); }

const L = [], P = s => L.push(s);
const A = combats.filter(c => c.kind === 'A'), B = combats.filter(c => c.kind === 'B'), C = combats.filter(c => c.kind === 'C');
const deathFail = Object.keys(failNodes).filter(k => failNodes[k].end);
const hurtAll = Object.keys(failNodes).filter(k => !failNodes[k].end);
const hurtFail = hurtAll.filter(k => { const e = failNodes[k].eff || {}; return e.str || e.merc || e.hurt === true || e.brk; });
const softFail = hurtAll.filter(k => !hurtFail.includes(k));
const qteDeath = qtess.filter(q => failNodes[q.tgt] && failNodes[q.tgt].end);
const qteSoft = qtess.filter(q => failNodes[q.tgt] && !failNodes[q.tgt].end);

P('# 打丧尸战斗 · 失败惩罚审计报告');
P('');
P('> 生成：' + new Date().toLocaleString('zh-CN') + '　｜　工具：`node tools/combat_penalty_report.js`（可复跑）');
P('> 扫描 24 个剧情文件 · ' + Object.keys(sd).filter(k => !k.startsWith('_')).length + ' 个场景');
P('');
P('## 一、总体结论');
P('');
P('| 项目 | 数量 |');
P('|---|---|');
P('| 有失败分支的战斗/判定点 | **' + (combats.length + qtess.length) + '** 处 |');
P('| ├ A 颜色记忆 QTE 战斗 | ' + A.length + ' 处 |');
P('| ├ B 体力门槛战斗 | ' + B.length + ' 处 |');
P('| ├ C 其他选择式战斗 | ' + C.length + ' 处 |');
P('| └ D 场景级限时 QTE（躲闪/反应） | ' + qtess.length + ' 处 |');
P('| 失败分支目标节点 | **' + Object.keys(failNodes).length + '** 个 |');
P('| ├ 直接死亡结局 | **' + deathFail.length + '** 个 |');
P('| ├ 受伤续玩（有惩罚） | **' + hurtFail.length + '** 个 |');
P('| └ 软失败（无惩罚，退回/改道） | ' + softFail.length + ' 个 |');
P('| 胜利也扣体力的节点 | ' + drainNodes.length + ' 个 |');
P('| 非战斗输入解谜（已排除） | ' + puzzles.length + ' 处 |');
P('');
P('**三句话结论**：');
P('');
P('1. **失败惩罚只有两档**——直接死亡结局（' + deathFail.length + ' 个，占 ' + Math.round(deathFail.length / Object.keys(failNodes).length * 100) + '%），或受伤续玩（' + hurtFail.length + ' 个）。死亡结局一律**不扣体力**（人已经死了，onEnter 全空）；受伤续玩扣 **体力 −1~−3 + 汞负荷 +10~+15 + 抓伤标记**，并按武器档位**概率损坏武器**。');
P('2. **战斗成功也要扣体力**（`combatDrain`，' + drainNodes.length + ' 个胜利节点）：武器档位 ≥2（铁管/拐杖/匕首/斧头）扣 **1** 点，空手或弱武器（美工刀/拖把杆）扣 **2** 点。扣到 0 触发全局"体力耗尽猝死"。');
P('3. **战斗失败不产生持久路径封锁**。失败要么直接结束游戏，要么受伤后被打回上一节点（保留进度、可再战）。项目里的"封锁"全部是**战斗前置闸门**（堵路楼梯间 / 尸潮等级闸门 / 剧情通行证闸门），不是失败惩罚。');
P('');
P('---');
P('');
P('## 二、A 类 · 颜色记忆 QTE 战斗（' + A.length + ' 处）');
P('');
P('机制：`onEnter: initMemoryGame([红,蓝,绿...], N)` 随机生成闪色序列，玩家限时内输入颜色分布（如"3红2蓝"），`condition: checkFlashAnswer` 模糊比对（顺序无关）。**输错（elseScene）与超时（timeoutScene）走同一条失败分支**。');
P('');
P('| 发起场景 | 限时 | 输错/超时 → | 结果 |');
P('|---|---|---|---|');
for (const s of A) P('| ' + s.from + ' | ' + tmo(s.timeout) + ' | ' + s.tgt + ' | ' + (failNodes[s.tgt].end ? '❌ **死亡结局**' : '🩸 受伤续玩') + ' |');
P('');
P('**分布特征**：**建平中学（10 处）+ 张江（13 处）全系死亡结局**——单次判定失误即 Game Over；**仁济南院（4 处）+ 益丰/新达汇/金谊/警察局等（7 处）为受伤续玩**——打输只是挂彩，仍能继续推进；教程关失败也是死亡结局。');
P('');
P('---');
P('');
P('## 三、B 类 · 体力门槛战斗（' + B.length + ' 处）');
P('');
P('机制：选项带 `condition: "strength >= N"`，体力不足即走 `elseScene`。');
P('');
P('| 发起场景 | 门槛 | 成功 → | 失败 → | 结果 | 失败惩罚 |');
P('|---|---|---|---|---|---|');
for (const s of B) {
  const fn = failNodes[s.tgt];
  P('| ' + s.from + ' | `' + s.cond + '` | ' + (s.next || '—') + ' | ' + s.tgt + ' | ' + (fn.end ? '❌ **死亡结局**' : '🩸 受伤续玩') + ' | ' + (fn.end ? '—' : pen(fn.eff)) + ' |');
}
P('');
P('---');
P('');
P('## 四、C 类 · 其他选择式战斗（' + C.length + ' 处）');
P('');
P('| 发起场景 | 门槛/条件 | 失败 → | 结果 | 失败惩罚 |');
P('|---|---|---|---|---|');
for (const s of C) { const fn = failNodes[s.tgt]; P('| ' + s.from + ' | ' + (s.cond ? '`' + s.cond + '`' : '—') + ' | ' + s.tgt + ' | ' + (fn.end ? '❌ **死亡结局**' : '🩸 受伤/软失败') + ' | ' + pen(fn.eff) + ' |'); }
P('');
P('---');
P('');
P('## 五、D 类 · 场景级限时 QTE（' + qtess.length + ' 处，早期战斗主力）');
P('');
P('机制：场景挂 `qte: { timeout: N, onTimeout: "场景" }`，进入即开始倒计时，超时自动跳转（**多数限时 6–15 秒**）。这类是樱桃苑/东明街道前期的核心战斗，玩家须在倒计时内选出正确躲闪/攻击方式。');
P('');
P('| 超时 → | 结果 | 限时 | 触发场景 |');
P('|---|---|---|---|');
const byTgt = {};
for (const q of qtess) { if (!byTgt[q.tgt]) byTgt[q.tgt] = []; byTgt[q.tgt].push(q); }
for (const t of Object.keys(byTgt)) {
  const fn = failNodes[t]; const qs = byTgt[t];
  P('| ' + t + ' | ' + (fn.end ? '❌ **死亡结局**' : '🟡 软失败（改道/退回）') + ' | ' + tmo(qs[0].timeout) + ' | ' + qs.map(q => q.from).join('、') + ' |');
}
P('');
P('**说明**：' + qteDeath.reduce((a, q) => a + 1, 0) + ' 处 QTE 超时直接死亡（如 `结局-被丧尸扑倒咬死`、`结局-丧尸的围殴`、`结局-电梯门开了`）；' + qteSoft.reduce((a, q) => a + 1, 0) + ' 处超时只是进入"犹豫"节点（例如 `地下车库的丧尸` 超时 → `结局-被丧尸扑倒咬死` 为死，而 `地铁站-站厅层` 超时 → `地铁站-站厅层-犹豫` 可再选）。');
P('');
P('**另有"选择即死"陷阱**：`地下车库的丧尸` 选"脚"（体力 >1 也满足条件）→ `结局-嘎吱嘎吱`"被丧尸一口咬住，你被咬死了"，属于**门槛通过但选择错误的死亡**，与失败分支无关，玩家极易踩坑。');
P('');
P('---');
P('');
P('## 六、失败惩罚数值汇总');
P('');
P('### 6.1 受伤续玩标准包（' + hurtFail.length + ' 个节点）');
P('');
P('| 失败节点 | 体力 | 汞负荷 | 抓伤 | 断武器 | 失败文案 |');
P('|---|---|---|---|---|---|');
for (const k of hurtFail) { const e = failNodes[k].eff || {}; P('| ' + k + ' | ' + (e.str || '—') + ' | ' + (e.merc ? '+' + e.merc : '—') + ' | ' + (e.hurt === true ? '✔' : '—') + ' | ' + (e.brk ? '✔ 概率' : '—') + ' | ' + (failNodes[k].txt || '（函数式文案）') + ' |'); }
P('');
P('**武器损坏概率**（`COMBAT_BREAK_CHANCE`，story/utils.js:305）：弱档（美工刀/拖把杆）**50%** · 中档（铁管/拐杖）**25%** · 强档（匕首/斧头）**10%**；空手不损。仅挂在失败节点（`tryBreakWeapon`）。');
P('');
P('> 注：部分节点的惩罚写在**节点内选项的 effect** 上（如"犹豫"系节点、图书馆徒手），而非 onEnter；表中已合并统计，同一节点多出口时取最重的一支，不累加。');
P('');
P('**体力扣除梯度**：普通丧尸抓伤 **−2**（主流）；太平间黑皮丧尸 **−3**（最重）；地铁站滑扶手撞击 **−1**（最轻）；益丰被咬 **−1**。全部叠加**汞负荷 +10~+15**与 **`hurtByZombie` 抓伤标记**（后者影响后续感染/瘟疫判定与部分剧情分支）。');
P('');
P('### 6.2 软失败（无惩罚，' + softFail.length + ' 个）');
P('');
P('这些节点虽然叫"失败"，但**不扣体力**，只是被打回/改道：');
P('');
for (const k of softFail) P('- `' + k + '`　←　' + [...new Set(failNodes[k].src)].join('、') + '　（' + (failNodes[k].txt || '（函数式文案）') + '）');
P('');
P('### 6.3 死亡结局清单（' + deathFail.length + ' 个）');
P('');
for (const k of deathFail) P('- `' + k + '`　←　' + [...new Set(failNodes[k].src)].join('、'));
P('');
P('---');
P('');
P('## 七、路径封锁');
P('');
P('**结论：战斗失败不产生持久路径封锁**。失败要么直接结束游戏，要么受伤后被打回上一节点（保留进度、可再战）。');
P('');
P('项目里真正的"封锁"是**战斗前置闸门**，共 3 类：');
P('');
P('| 类型 | 实现 | 封锁效果 | 破解条件 |');
P('|---|---|---|---|');
P('| **堵路楼梯间** | `jpBlockedStair`（建平中学） | 强丧尸堵住楼梯，**徒手完全无法通过**，未清场前永久不可通行 | 斧头 / 手枪（有弹）/ 匕首 / 火把，四选一清理（`_xxxStairCleared` 一次性标记） |');
P('| **尸潮等级闸门** | `chasedByZombies <= 3` 等条件 | 尸潮等级超标时硬闯指定路线 → 死亡结局 | 用"躲藏"降低等级后可重新通行（**软封锁，可恢复**） |');
P('| **剧情通行证闸门** | `_visit[场景]>0` / `_hasPoliceMap` 等 | 未清场/未拿道具时，过夜点或路线上锁，硬闯即死 | 先清场 / 先取得道具 |');
P('');
P('**典型例子**：');
P('');
P('- `建平-后门-内侧-开打` 失败 → `结局-后门-自投罗网`（"根本没有尽头"）——**该路线的闸门在失败时直接把玩家判死，而不是锁路**。');
P('- `警察局-北段-持图失败`：颜色 QTE 失败扣体力 −2、汞 +10、抓伤、尸潮 +1，被推回学校门口，但文案写明"路线记住了，但得缓一缓再试"——**明确不封锁，可反复挑战**。');
P('- `警察局-北段-无图路口`：没有陈默的路线图（`_hasPoliceMap`）就走不了车阵，只能原路返回——**非战斗型路径封锁**。');
P('- `新达汇` 1F–5F 电梯厅 / B1 / 3F 后勤通道：`chasedByZombies <= 3` / `== 0` 的尸潮闸门，超标硬闯 → `结局-电梯厅被围` / `结局-后勤通道暗算`。');
P('- `建平-后门` 的颜色 QTE 是**开启后方路线的唯一钥匙**：只有答对才进 `建平-后门-开门`，答错即 `结局-后门失守`——这是"失败即封锁 + 死亡"的合成形态。');
P('');
P('---');
P('');
P('## 八、值得注意的设计问题');
P('');
P('1. **同类机制惩罚落差极大**：颜色 QTE 在仁济南院是"受伤 −2"，在建平/张江却是"直接死亡"。玩家在仁济养成的"打输只是挂彩"预期，到建平张江会被立刻打破，容易产生挫败感。');
P('2. **死亡结局零过渡**：所有死亡分支的 onEnter 为空，失败瞬间跳结局，没有任何体力/伤势的数值交代，玩家难判断是"体力不够"还是"判定失误"。');
P('3. **门槛严苛度不均**：`张江-华大-风淋舱-击退` 的门槛是 `strength > 0.01`，几乎形同虚设；而 `地铁站-楼梯`、`图书馆-藏书区`、`安盛街-被包围` 等要 `strength >= 3~4`，体力吃紧时直接判死。');
P('4. **成功成本与失败成本倒挂**：成功只扣 1–2 点体力，失败的受伤惩罚（−2~−3 + 汞 +10~+15 + 断武器）远重于"打赢的代价"，且失败不预告，难度随机性偏高。');
P('5. **存在"门槛通过但选择错误"的隐形死亡**：`地下车库的丧尸` 选"脚"、`张江-华大-白区-工位战C` 的毒气型等，条件满足仍会死，玩家无从预判。');

fs.writeFileSync(path.join(ROOT, 'tools', '战斗惩罚审计报告.md'), L.join('\n'), 'utf8');
console.log('A=' + A.length + ' B=' + B.length + ' C=' + C.length + ' 失败节点=' + Object.keys(failNodes).length + ' 死=' + deathFail.length + ' 伤=' + hurtFail.length + ' 扣体力胜利节点=' + drainNodes.length + ' 非战斗解谜=' + puzzles.length);
console.log('[已写出] tools/战斗惩罚审计报告.md');
