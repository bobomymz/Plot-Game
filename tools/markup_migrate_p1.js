// P1 全库迁移工具（2026-09-28）
//   ① inline style → 语义 class（270 处）
//   ② 结局行 —— 结局：… —— → <span class='end'>（122 处）
//   ③ **markdown 残留星号**（玩家可见 = bug）
// 用法：
//   node tools/markup_migrate_p1.js            # 普查（只报不写）：按 (色+斜体+粗体) 分组 + 样例
//   node tools/markup_migrate_p1.js --apply    # 按 MAP 执行替换（只改能确定的，其余列出人工清单）
//   node tools/markup_migrate_p1.js --end      # 迁移结局行
//   node tools/markup_migrate_p1.js --md       # 处理 ** 残留（默认只报，加 --apply 才写）
// ⚠ 任何 --apply 前先跑一次无参数的普查，确认 MAP 没把语义搞反。
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIRS = ["story", path.join("story", "东明街道")];
const files = [];
for (const d of DIRS) {
  for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) {
    if (f.endsWith(".js")) files.push(path.join(d, f));
  }
}

const APPLY = process.argv.includes("--apply");
const MODE_END = process.argv.includes("--end");
const MODE_MD = process.argv.includes("--md");

// ---------- 匹配 inline span ----------
// 形如 <span style='color: #00fbffff; font-style: italic;'>…</span>
const SPAN_RE = /<span\s+style\s*=\s*(['"])(.*?)\1\s*>([\s\S]*?)<\/span>/g;

const parseStyle = (s) => {
  const o = { color: "", italic: false, bold: false, size: "", family: false };
  for (const decl of s.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const k = decl.slice(0, i).trim().toLowerCase();
    const v = decl.slice(i + 1).trim().toLowerCase();
    if (k === "color") o.color = v;
    else if (k === "font-style" && v.includes("italic")) o.italic = true;
    else if (k === "font-weight" && (v.includes("bold") || /^[6-9]00$/.test(v))) o.bold = true;
    else if (k === "font-size") o.size = v;
    else if (k === "font-family") o.family = true;
  }
  return o;
};

// 颜色 → class 映射（key = "色|斜体|粗体"；不知道的返回 null → 进人工清单）
// 依据 style.css 的语义色板（--sys/--warn/--crit/--numb/--term/--fire）
const MAP = {
  "#00fbffff|1|0": "sys",          // 系统提示青（既有 inline，新色板已换成更柔和的 --sys #4ec9d4）
  "#00fbffff|1|1": "sys",
  "#00fbffff|0|0": "sys",
  "#00fbffff|0|1": "sys",
  "#ffaa00|1|0": "sys warn",       // 系统提示橙（体力扣除等）
  "#ffaa00|1|1": "sys warn",
  "#ffaa00|0|0": "warn",
  "#ffaa00|0|1": "warn",
  "#ff4444|0|1": "crit",           // 危险红（带粗体）
  "#ff4444|1|1": "crit",
  "#ff4444|0|0": "crit",
  "#ff4444|1|0": "crit",
  "#ff5555|0|1": "crit",
  "#ff5555|0|0": "crit",
  "#9aa0a6|1|0": "numb",           // 麻木/体征冷灰
  "#9aa0a6|0|0": "numb",
  "#9aa0a6|1|1": "numb",
  "#7fb8e8ff|0|0": "term",         // 电子屏冷青
  "#7fb8e8ff|1|0": "term",
  "#ff9a3c|0|1": "fire",           // 火/光
  "#ff9a3c|0|0": "fire",
  "|1|0": "think",                 // 无色 + 斜体 = 内心独白/吐槽
  "|0|0": "sys",                   // 完全无样式 = UI 教学提示（"请往下滑动哦"这类）
  "#ffb6c1ff|1|0": "sys",          // 【好感度 ±N】——UI 反馈，归入系统提示（颜色由粉改青）
  "red|0|0": "crit",               // 字面 red
  "red|0|1": "crit",               // GAME OVER
  "#ff5555|1|0": "crit",           // 【追击 +1 · 一无所获】
  "#888|0|0": "numb",              // 次要灰字（彩蛋/补充提示）
  "#8fa8c8|1|0": "think",          // 打铃系统 + 玩家愣神反应
  // ⚠ 以下三类刻意不进 MAP（同一 key 内语义分裂，必须人眼逐个定，共 9 处）：
  //   #f8d305ff|0|0 —— 2 处是结局行（→ end），1 处是 <em> 里的 NPC 台词（→ 保留 em、去色）
  //   |0|1          —— 开门声(→sfx) / "一只丧尸在盯着你"(→rot) / "飞踹一脚"(→sfx)
  //   #aaa|0|0      —— 2 处手机短信(→term) / 1 处场景描述(→dust)
};

// ---------- 普查 ----------
function survey() {
  const groups = new Map();
  let total = 0;
  for (const rel of files) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    let m;
    SPAN_RE.lastIndex = 0;
    while ((m = SPAN_RE.exec(src)) !== null) {
      total++;
      const st = parseStyle(m[2]);
      const key = `${st.color}|${st.italic ? 1 : 0}|${st.bold ? 1 : 0}`;
      const txt = m[3].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (!groups.has(key)) groups.set(key, { n: 0, samples: [], files: new Set(), mapped: MAP[key] || null, sys: 0 });
      const g = groups.get(key);
      g.n++;
      g.files.add(rel);
      if (txt.includes("【系统提示】") || txt.includes("【获得")) g.sys++;
      if (g.samples.length < 3) g.samples.push(`${rel}:${txt.slice(0, 46)}`);
    }
  }
  return { total, groups };
}

// ---------- 执行替换 ----------
function applyInline() {
  const changed = [];
  const manual = [];
  for (const rel of files) {
    const p = path.join(ROOT, rel);
    const src = fs.readFileSync(p, "utf8");
    let n = 0, miss = 0;
    const out = src.replace(SPAN_RE, (whole, q, styleStr, inner) => {
      const st = parseStyle(styleStr);
      const key = `${st.color}|${st.italic ? 1 : 0}|${st.bold ? 1 : 0}`;
      const cls = MAP[key];
      if (!cls) { miss++; manual.push(`${rel}: ${key} → ${inner.slice(0, 40)}`); return whole; }
      n++;
      return `<span class='${cls}'>${inner}</span>`;
    });
    if (n) { if (APPLY) fs.writeFileSync(p, out); changed.push(`${rel}: ${n} 处${miss ? `（另外 ${miss} 处未映射，保持原样）` : ""}`); }
    else if (miss) changed.push(`${rel}: 0 处替换 / ${miss} 处未映射`);
  }
  return { changed, manual };
}

// ---------- 结局行 ----------
// 只处理"还没包 end 的"：—— 结局：xxx ——（可能在引号内，前后可能有 \n）
function applyEnd() {
  const changed = [];
  const skip = [];
  const samples = [];
  for (const rel of files) {
    const p = path.join(ROOT, rel);
    const src = fs.readFileSync(p, "utf8");
    let n = 0;
    // ⚠ 前面若已有 class='end'> 说明已迁移（前两个样板改过），跳过避免二次包裹
    const out = src.replace(/(<span class='end'>)?——\s*结局[：:]([^\n"'<>]*?)(——)?(?=(<\/span>)?\s*(?:\\n|"|'|<|\n|$))/g,
      (whole, open, body, dash, _close) => {
        if (open) return whole;           // 已迁移
        n++;
        if (samples.length < 40) samples.push(`${rel}  「${whole}」→ end`);
        return `<span class='end'>—— 结局：${body}${dash || ""}</span>`;
      });
    if (n) { if (APPLY) fs.writeFileSync(p, out); changed.push(`${rel}: ${n} 处`); }
    else skip.push(rel);
  }
  return { changed, skip, samples };
}

// ---------- ** 残留 ----------
function surveyMd() {
  const hits = [];
  for (const rel of files) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const lines = src.split("\n");
    lines.forEach((ln, i) => {
      if (/\*\*/.test(ln) && /^\s*\/\//.test(ln.trim()) === false) {
        const m = ln.match(/\*\*([^*]+)\*\*/g);
        if (m) hits.push(`${rel}:${i + 1}  ${m.join(" , ")}   ← ${ln.trim().slice(0, 90)}`);
      }
    });
  }
  return hits;
}

// ---------- 输出 ----------
if (MODE_MD) {
  const hits = surveyMd();
  console.log("=== ** markdown 残留（玩家可见星号 = bug）===");
  console.log(`共 ${hits.length} 行`);
  for (const h of hits) console.log("  " + h);
  process.exit(0);
}

if (MODE_END) {
  const { changed, skip, samples } = applyEnd();
  console.log(`=== 结局行迁移${APPLY ? "（已写入）" : "（预演，未写入）"} ===`);
  for (const c of changed) console.log("  " + c);
  console.log(`\n未命中文件 ${skip.length} 个（无结局行或已迁移）`);
  if (!APPLY && samples.length) {
    console.log(`\n--- 替换样例（前 ${samples.length} 条，确认没误伤再 --apply）---`);
    for (const s of samples) console.log("  " + s);
  }
  process.exit(0);
}

const { total, groups } = survey();
console.log(`=== inline style 普查：共 ${total} 处 ===\n`);
const rows = [...groups.entries()].sort((a, b) => b[1].n - a[1].n);
for (const [key, g] of rows) {
  const mark = g.mapped ? `→ ${g.mapped}` : "⚠ 未映射";
  console.log(`${String(g.n).padStart(4)}  ${key.padEnd(22)} ${mark}   系统提示类 ${g.sys}/${g.n}   [${g.files.size} 文件]`);
  for (const s of g.samples) console.log(`        ${s}`);
}

if (APPLY) {
  const { changed, manual } = applyInline();
  console.log(`\n=== 执行替换 ===`);
  for (const c of changed) console.log("  " + c);
  if (manual.length) {
    console.log(`\n⚠ 未映射 ${manual.length} 处（保持原样，需人工定 class）：`);
    const seen = new Set();
    for (const m of manual) {
      const k = m.split("→")[0].trim();
      if (seen.has(k)) continue;
      seen.add(k);
      console.log("  " + m);
    }
  }
} else {
  console.log(`\n（预演模式，未写入文件。加 --apply 才真正替换）`);
}
