// P2 强表现力迁移工具（2026-09-29，第一批：东明街道）
//   P1 做的是「把既有样式换成 class」（观感不变）；P2 是**新增标记**（观感会变），所以：
//     · 只处理高置信的四类：拟声 sfx / 突袭 crit / 丧尸声 rot / 喊叫 shout
//     · 每条都带**范围扩展**（包整分句，不包单词）+ **长度守卫**（超长进人工清单）
//     · **段配额**：源码里一个 `\n` 分隔的文段内，强强调(crit/rot/shout) ≤2、sfx ≤2、合计 ≤3
// 用法：
//   node tools/markup_migrate_p2.js                 # 普查（只报不写）
//   node tools/markup_migrate_p2.js --apply         # 写入
//   node tools/markup_migrate_p2.js --only=五金店   # 只处理文件名含该串的文件
//   node tools/markup_migrate_p2.js --all           # 全库（默认只扫 story/东明街道）
//   node tools/markup_migrate_p2.js --cat=sfx       # 只看某一类（sfx/crit/rot/shout）
// ⚠ 任何 --apply 前先跑普查看样例；本脚本会跳过已被 <span> 包裹的区域（不会二次包裹）。
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1];
const APPLY = process.argv.includes("--apply");
const ONLY = arg("only");
const CAT = arg("cat");
const ALL = process.argv.includes("--all");

const DIRS = ALL ? ["story", path.join("story", "东明街道")] : [path.join("story", "东明街道")];
const files = [];
for (const d of DIRS) {
  for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) {
    if (!f.endsWith(".js")) continue;
    if (ONLY && !f.includes(ONLY)) continue;
    files.push(path.join(d, f));
  }
}

// ---------- 规则：命中 → class ----------
// expand: 'word' = 只包命中词（拟声词短，放大字号包整句太突兀 —— P1 踩过这个坑）
//         'clause' = 扩到所在分句（突袭/嘶吼/喊叫，包单词观感太弱）
const RULES = [
  {
    key: "sfx", cls: "sfx", expand: "word", maxLen: 10, quota: 2,
    // ⚠ 长词优先（交替分支里长分支写在前面）；单字拟声只收高置信的几个
    // ⚠ ABAB/AABB 式（咕咚咕咚、淅淅沥沥）必须整体命中，只命中后半个字会包出「咕[咚]咕[咚]」的怪相
    // ⚠ 复合词必须整体收录，否则「嘎吱」「哐当」会被单字规则拆成「嘎[吱]」「[哐]当」（半截放大，比不标更难看）
    re: /(?:咕咚咕咚|咕噜咕噜|淅淅沥沥|噼里啪啦|轰隆隆|哗啦啦|叽里咕噜|叮铃咣啷|叮铃铃|吱嘎|嘎吱|哐当|咣当)|(?:咔嚓|哗啦|啪嗒|叮当|哐啷|吱呀|嗡嗡|叮铃|沙沙|砰砰|嗒嗒|咔咔|轰隆|哗哗|吱吱|咯吱|噼啪|滴答|铿锵|咕咚|咕噜|叮咚|噗通|扑通|咔哒|吧嗒|乒乓)(?:——|—)?|(?:砰|啪|哐|轰|嗡|哗|吱|咚|嗤|唰|嗖|铿|铛|咣|嘭|叮)(?:——|—)?/g,
  },
  {
    key: "crit", cls: "crit", expand: "clause", maxLen: 24, quota: 2,
    re: /朝你扑了过来|朝你扑过来|扑了过来|猛地扑|扑上来|扑到你身上|一口咬住|咬住了你|咬住你的|抓住了你的|攥住了你|从背后扑|窜了出来|扑倒在地|喉咙被咬住|撕扯着|狠狠地咬/g,
  },
  {
    key: "rot", cls: "rot", expand: "clause", maxLen: 26, quota: 2,
    re: /喉咙里挤出[^。！？，、\n]{0,10}|嘶吼|低吼|咆哮|嗬嗬|干嚎|喉音/g,
  },
  {
    key: "shout", cls: "shout", expand: "clause", maxLen: 26, quota: 2,
    re: /喊道|大喊|吼道|高喊|嘶声喊|喊了一声/g,
  },
];

// ⚠⚠ 引号必须是边界：剧情文本都在 "…" 里，扩展一旦跨出起始引号，
// <span> 会被插到 `return "` 之前 —— 直接把 JS 语法搞崩（安盛街.js 踩过，已回滚）。
// 分句边界（\u0001 = 源码字面 \n 的替身，见 expandClause）
//   \\ = 续行符：行尾 `\`+换行表示字符串续行，选区一旦吃进去就会把 `\</span>` 拆开 → 语法崩
const B_OPEN = "\"'`\\\n\r\u0001“‘，,。.！!？?；;：:—…";
const B_CLOSE = "\"'`\\\n\r\u0001”’，,。.！!？?；;：:…";

// ⚠ 踩过的坑：源码里的换行是两个字符 `\` + `n`，直接在原文上判边界会把 `\` 当普通字符、
// 结果选区从 `n` 开始（出现 `n远处传来…` 这种残缺选区）。
// 解法：先把 `\n` 换成等长的 \u0001\u0001 得到"探针串"（索引一一对应），在探针上判边界。
function expandClause(line, s, e) {
  const probe = line.replace(/\\n/g, "\u0001\u0001");
  let a = s;
  while (a > 0 && !B_OPEN.includes(probe[a - 1])) a--;
  let b = e;
  while (b < probe.length && !B_CLOSE.includes(probe[b])) b++;
  // 结尾若是标点则不含标点；引号保留（引号内容是一句话）
  while (b > a && "。.！!？?；;，,、：:…".includes(probe[b - 1])) b--;
  return [a, b];
}

// 行内注释（// 之后）不算剧情文本：先求出本行的"有效区间"
function commentStart(line) {
  let inStr = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "/" && line[i + 1] === "/") return i;
  }
  return -1;
}

// ---------- 抹掉已标记区域（避免二次包裹），用等长占位保持索引 ----------
function mask(src) {
  const spans = [];
  const masked = src.replace(/<span\b[^>]*>[\s\S]*?<\/span>/g, (m) => {
    spans.push(m);
    return "\u0000".repeat(m.length);
  });
  return { masked, spans };
}
function unmask(s, spans) {
  let i = 0;
  return s.replace(/\u0000+/g, () => spans[i++]);
}

// 行级过滤：不是剧情文本的行不处理
const SKIP_LINE = /^\s*(\/\/|\*)|^\s*(show)?[Cc]ondition\s*:|^\s*(nextScene|elseScene|timeoutScene|next|id)\s*:|^\s*(image|morning|evening|night|midnight|rain)\s*:|\.(webp|png|jpg|jpeg)/;

// ⚠⚠ 最危险的一类坑：拟声词会命中**场景 ID**（"结局-嘎吱嘎吱" 里的"吱"），
// 一旦插进 ID 就把 `"结局-嘎吱嘎吱": {` 变成 `"结局-嘎<span…>吱嘎吱</span>": {`
// —— 语法仍然合法、lint 也不报，但 nextScene 从此死链，玩家点进去直接卡死。
// （樱桃苑踩过；靠 scene_fn_selftest 的死链检查才抓到）
// 防护：把"引号内、短、无空格无标点"的 ID 形态串标为禁区，命中落在其中一律跳过。
function idZones(line) {
  const zones = [];
  for (const m of line.matchAll(/"([^"]{1,28})"/g)) {
    const v = m[1];
    if (/[\s，。！？；：、“”…]/.test(v)) continue;   // 含标点/空格 = 正文，不是 ID
    zones.push([m.index, m.index + m[0].length]);
  }
  return zones;
}

function runFile(rel) {
  const p = path.join(ROOT, rel);
  const src0 = fs.readFileSync(p, "utf8");
  const rawLines = src0.split("\n");        // 未 mask 的原文行（用于把已存在的同类标记计入配额）
  const { masked, spans } = mask(src0);
  const lines = masked.split("\n");
  const outLines = [];
  const hits = [];      // 普查输出
  let applied = 0;

  // ⚠⚠ 场景级 style 守卫（engine.js:1531 把 scene.style 直接刷在 #scene-text 容器上）：
  // 【2026-09-29 方案 A】全库 28 处死亡结局的 `style:"color:#ff4444..."` 已由
  //   tools/markup_strip_death_style.js 删除，改由 <span class='end'> 独立承担结局行血红。
  //   故本守卫只针对「**红色系** style」——那种场景整段是红+粗：
  //     · crit（红粗）视觉零增量 → 跳过
  //     · rot（脏黄绿）会破坏整段统一的死亡红 → 跳过
  //   sfx 是字号放大、不吃父级 color，效果仍保留。
  // ⚠ 非红色 style（居中/字号/日记本楷体）不影响 crit/rot 的观感，不再误跳。
  //   万一日后重新引入红色 style，本守卫会自动恢复生效。
  const styleScene = new Array(lines.length).fill(false);
  {
    let start = -1, hasRedStyle = false;
    const flush = (end) => { if (start >= 0 && hasRedStyle) for (let k = start; k < end; k++) styleScene[k] = true; };
    for (let li = 0; li < lines.length; li++) {
      if (/^\s*"[^"]+"\s*:\s*\{/.test(lines[li])) { flush(li); start = li; hasRedStyle = false; }
      else if (start >= 0 && /^\s*style\s*:\s*["'][^"']*color\s*:\s*#ff4444/i.test(lines[li])) hasRedStyle = true;
    }
    flush(lines.length);
  }

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!/[一-龥]/.test(line)) { outLines.push(line); continue; }
    if (SKIP_LINE.test(line)) { outLines.push(line); continue; }
    // 场景 ID 定义行（"xxx": {）——整行跳过
    if (/^\s*"[^"]+"\s*:\s*\{/.test(line)) { outLines.push(line); continue; }
    const zones = idZones(line);

    // ⚠ 踩过的坑：`// 丧尸低吼扑来` 这种行内注释里的词会被当剧情文本命中 → 只处理注释之前的区间
    const cs = commentStart(line);
    const limit = cs < 0 ? line.length : cs;

    // 本行按源码字面 \n 切段，段内独立配额
    const segs = line.split("\\n");
    const used = segs.map(() => ({ sfx: 0, strong: 0, total: 0 }));
    const edits = [];   // {segIdx, start, end, cls, word}

    // ⚠⚠ 把本行**已存在的** sfx/crit/rot/shout 标记也计入段配额：
    //   mask() 会把已标记的 <span> 抹成占位符（避免二次包裹），于是重跑时它们不计入配额，
    //   多轮 apply 会在同一段里越标越多、突破 ≤2/≤3 的上限（建平中学.js:2239 踩过）。
    //   注意只计这四类；P1 的 end/sys、P3 的 think/hand 等不算 P2 配额。
    {
      const raw = rawLines[li] || "";
      const rePre = /<span class='(sfx|crit|rot|shout)'[^>]*>/g;
      let pm;
      while ((pm = rePre.exec(raw)) !== null) {
        const sPos = pm.index;
        let acc2 = 0, si = 0;
        for (let k = 0; k < segs.length; k++) {
          if (sPos >= acc2 && sPos <= acc2 + segs[k].length) { si = k; break; }
          acc2 += segs[k].length + 2;
        }
        const q2 = used[si];
        if (pm[1] === "sfx") q2.sfx++; else q2.strong++;
        q2.total++;
      }
    }

    for (const rule of RULES) {
      if (CAT && rule.key !== CAT) continue;
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        let s = m.index, e = m.index + m[0].length;
        if (s >= limit) continue;
        // 命中落在 ID 形态串里（场景 ID 定义 / nextScene 引用）→ 跳过
        if (zones.some(([a, b]) => s >= a && s < b)) continue;
        if (rule.expand === "clause") [s, e] = expandClause(line, s, e);
        if (e > limit) e = limit;
        const word = line.slice(s, e);
        if (!word.trim()) continue;
        // 抹除区（已标记）内不处理
        if (line.slice(s, e).includes("\u0000")) continue;
        // 长度守卫
        const plain = word.replace(/\u0000/g, "");
        const cjk = (plain.match(/[一-龥]/g) || []).length;
        if (cjk === 0 || cjk > rule.maxLen) { hits.push({ rel, li: li + 1, cls: rule.cls, word: plain, why: `超长(${cjk}字)`, skip: true }); continue; }
        // ⚠ 否定句不上强强调：「但并没有扑上来——它们似乎还保留着一丝畏惧」整句标红是反效果
        if (rule.cls !== "sfx" && /没有|没能|未能|并未|并不|不曾|还没|差点|险些|几乎没/.test(plain)) {
          hits.push({ rel, li: li + 1, cls: rule.cls, word: plain, why: "含否定/存疑", skip: true });
          continue;
        }
        // 死亡场景（场景级 style 整段红）里 crit/rot 无视觉增量 → 跳过（sfx 保留）
        if (rule.cls !== "sfx" && styleScene[li]) {
          hits.push({ rel, li: li + 1, cls: rule.cls, word: plain, why: "死亡场景整段已红(场景级style)", skip: true });
          continue;
        }
        // rot 是「丧尸/非人生物声」专用；发电机/水泵这类机械声也会被「低吼」误命中（张江动力站踩过）
        if (rule.cls === "rot" && /发电机|水泵|电机|马达|引擎|机器|风机|配电/.test(plain)) {
          hits.push({ rel, li: li + 1, cls: rule.cls, word: plain, why: "机械声非丧尸声", skip: true });
          continue;
        }
        // ⚠⚠ 相邻同类合并必须在**配额判断之前**：
        //   合并只是把新命中并进已有 span、不新增配额；若放到配额之后，后一个匹配会先被
        //   「段内sfx已满2」拦下、永远走不到合并分支，留下「砰砰**砰**」这种半截放大。
        //   （建平中学.js:2239「砰！砰砰砰！」踩过）
        // 间隔 ≤1 个非标点字符也算相邻：否则「咕咚咕咚」会包成「咕[咚]咕[咚]」
        const near = edits.find((ed) => {
          if (ed.cls !== rule.cls) return false;
          if (ed.end === s || ed.start === e) return true;
          const gap = ed.end < s ? line.slice(ed.end, s) : line.slice(e, ed.start);
          return gap.length === 1 && !/[\s""'`，,。.！!？?；;：:—…\\]/.test(gap);
        });
        if (near) { near.start = Math.min(near.start, s); near.end = Math.max(near.end, e); continue; }
        // 定位所属段
        let acc = 0, segIdx = 0;
        for (let k = 0; k < segs.length; k++) {
          if (s >= acc && s <= acc + segs[k].length) { segIdx = k; break; }
          acc += segs[k].length + 2;
        }
        const q = used[segIdx];
        const isStrong = rule.cls !== "sfx";
        if (isStrong && q.strong >= 2) { hits.push({ rel, li: li + 1, cls: rule.cls, word: plain, why: "段内强强调已满2", skip: true }); continue; }
        if (!isStrong && q.sfx >= 2) { hits.push({ rel, li: li + 1, cls: rule.cls, word: plain, why: "段内sfx已满2", skip: true }); continue; }
        if (q.total >= 3) { hits.push({ rel, li: li + 1, cls: rule.cls, word: plain, why: "段内合计已满3", skip: true }); continue; }
        // 与其他类已选区域重叠则跳过（crit > shout > rot > sfx，按规则顺序先到先得）
        if (edits.some((ed) => s < ed.end && e > ed.start)) continue;
        if (isStrong) q.strong++; else q.sfx++;
        q.total++;
        edits.push({ segIdx, start: s, end: e, cls: rule.cls, word: plain });
      }
    }

    if (!edits.length) { outLines.push(line); continue; }
    edits.sort((a, b) => b.start - a.start);
    let out = line;
    for (const ed of edits) {
      out = out.slice(0, ed.start) + `<span class='${ed.cls}'>` + out.slice(ed.start, ed.end) + "</span>" + out.slice(ed.end);
      applied++;
      hits.push({ rel, li: li + 1, cls: ed.cls, word: ed.word, why: "" });
    }
    outLines.push(out);
  }

  const out = unmask(outLines.join("\n"), spans);
  if (APPLY && applied) fs.writeFileSync(p, out, "utf8");
  return { rel, applied, hits };
}

// ---------- 主流程 ----------
let totalApplied = 0;
const allHits = [];
const perFile = [];
for (const rel of files) {
  const r = runFile(rel);
  totalApplied += r.applied;
  perFile.push(`${String(r.applied).padStart(4)}  ${rel}`);
  allHits.push(...r.hits);
}

console.log(`=== P2 普查${APPLY ? "（已写入）" : "（预演，未写入）"} · 范围 ${ALL ? "全库" : "story/东明街道"}${ONLY ? " · 仅 " + ONLY : ""} ===`);
console.log(perFile.join("\n"));
console.log(`\n合计 ${totalApplied} 处`);

// 分类统计
const byCls = {};
for (const h of allHits) if (!h.skip) byCls[h.cls] = (byCls[h.cls] || 0) + 1;
console.log("\n按 class：" + Object.entries(byCls).map(([k, v]) => `${k} ${v}`).join(" · "));

if (!APPLY) {
  const show = allHits.filter((h) => !h.skip);
  console.log(`\n--- 样例（前 70 条，确认范围没包错再 --apply）---`);
  for (const h of show.slice(0, 70)) {
    console.log(`  ${path.basename(h.rel)}:${h.li}  [${h.cls}] ${h.word.slice(0, 60)}`);
  }
  const skipped = allHits.filter((h) => h.skip);
  if (skipped.length) {
    console.log(`\n--- 被守卫跳过 ${skipped.length} 条（需人工定）---`);
    for (const h of skipped.slice(0, 30)) console.log(`  ${path.basename(h.rel)}:${h.li}  [${h.cls}] ${h.why}  ${h.word.slice(0, 40)}`);
  }
}
