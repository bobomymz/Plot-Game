#!/usr/bin/env node
/**
 * 方案 A：删除死亡结局场景的场景级红色 style。
 *
 * 背景：engine.js:1531 把 scene.style 刷在 #scene-text 容器上，
 *       全库 28 处死亡结局带 style:"color:#ff4444[; font-weight:bold]"
 *       → 整段正文红+粗，导致 P1 的 <span class='end'> 结局行失去对比度。
 * 方案：删掉这 28 处 style，改由 end span 独立承担结局行血红，与全库其它结局一致。
 *       清掉后重跑 markup_migrate_p2.js 即可把守卫跳过的 crit/rot 补回。
 *
 * 规则（精确、可重跑）：
 *   - 仅删除「值形如 color: #ff4444 开头」的 style 行；
 *   - 且该行所在场景块内必须含 class='end'（双保险，防止误删非结局红字）；
 *   - 若该行为对象最后一项（行尾无逗号），整行删除；
 *   - 若该行后还有其它键（行尾有逗号），同样整行删除（连带逗号），保证语法正确。
 *
 * 用法：
 *   node tools/markup_strip_death_style.js            # 预演（只报告）
 *   node tools/markup_strip_death_style.js --apply     # 落盘
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STORY = path.join(ROOT, "story");
const APPLY = process.argv.includes("--apply");

// 目标 style 值：以 color: #ff4444 开头（红色系）
const RED_STYLE_RE = /^\s*style:\s*(["'])color:\s*#ff4444[^"']*\1,?\s*$/i;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

const files = walk(STORY);
const report = [];
let totalRemoved = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");

  // 先定位所有含 class='end' 的行，用于判定"该 style 是否属于结局场景"
  const endLineIdx = [];
  lines.forEach((ln, i) => { if (/class='end'/.test(ln)) endLineIdx.push(i); });

  const toDelete = [];
  for (let i = 0; i < lines.length; i++) {
    if (!RED_STYLE_RE.test(lines[i])) continue;

    // 双保险：向下最近的 class='end' 必须在 30 行内（同一场景块基本紧邻）
    const nearEnd = endLineIdx.some((j) => j > i && j - i <= 30);
    // 或是向上（个别场景把 end 写在 style 前，如 text 数组最后一段）
    const nearEndUp = endLineIdx.some((j) => j < i && i - j <= 30);
    if (!nearEnd && !nearEndUp) {
      report.push({ file: path.relative(ROOT, file), line: i + 1, text: lines[i].trim(), action: "跳过(附近无end)" });
      continue;
    }
    toDelete.push(i);
  }

  if (toDelete.length === 0) continue;

  // 从后往前删，避免索引漂移
  const delSet = new Set(toDelete);
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    if (delSet.has(i)) {
      report.push({ file: path.relative(ROOT, file), line: i + 1, text: lines[i].trim(), action: "删除" });
      totalRemoved++;
      continue;
    }
    kept.push(lines[i]);
  }

  if (APPLY) fs.writeFileSync(file, kept.join("\n"), "utf8");
}

console.log(`模式：${APPLY ? "APPLY（已落盘）" : "预演（只读）"}`);
console.log(`待删红色 style：${totalRemoved} 处`);
console.log("");
for (const r of report) {
  console.log(`  [${r.action}] ${r.file}:${r.line}  ${r.text}`);
}
