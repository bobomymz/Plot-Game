#!/usr/bin/env node
/**
 * mercury_scan.js —— 汞负荷（mercuryLoad）机制全量扫描
 *
 * 用途：一次性列出 mercuryLoad 的所有读写点，并标记：
 *   - 写入是否自带 Math.min(100) 钳制
 *   - 读取条件是什么
 *   - 是否注册进 _caps（全局上限）
 *
 * 用法：node tools/mercury_scan.js
 * 期望：报告读写点数量；若 "_caps 未注册" 会显式告警（当前为已知 P0）。
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const STORY = path.join(ROOT, "story");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

const files = fs.existsSync(STORY) ? walk(STORY) : [];
const writes = [];
const reads = [];

for (const fp of files) {
  const rel = path.relative(ROOT, fp).replace(/\\/g, "/");
  const lines = fs.readFileSync(fp, "utf8").split(/\r?\n/);
  lines.forEach((raw, idx) => {
    if (!raw.includes("mercuryLoad")) return;
    const ln = idx + 1;
    const s = raw.trim();
    // 读：出现比较运算符，且不是赋值
    const isCompare = /mercuryLoad\s*(>=|<=|==|!=|>|<)/.test(s);
    if (isCompare) {
      reads.push({ rel, ln, s });
    } else if (/mercuryLoad\s*[:=]/.test(s)) {
      writes.push({ rel, ln, s, clamped: /Math\.min\(\s*100/.test(s) });
    }
  });
}

console.log("=".repeat(70));
console.log("汞负荷 mercuryLoad 机制扫描");
console.log("=".repeat(70));

console.log(`\n【写入点】共 ${writes.length} 处`);
const clamped = writes.filter((w) => w.clamped);
console.log(`  自带 Math.min(100) 钳制：${clamped.length} 处`);
console.log(`  裸 add（无钳制）：      ${writes.length - clamped.length} 处`);
console.log("\n  -- 已钳制 --");
clamped.forEach((w) => console.log(`   ${w.rel}:${w.ln}`));
console.log("\n  -- 未钳制（若 _caps 未注册则无上限）--");
writes
  .filter((w) => !w.clamped && !/:/.test(w.s.slice(0, 30).replace(/".*"/, "")))
  .forEach((w) => console.log(`   ${w.rel}:${w.ln}   ${w.s.slice(0, 90)}`));

console.log(`\n【读取点】共 ${reads.length} 处`);
reads.forEach((r) => console.log(`   ${r.rel}:${r.ln}   ${r.s.slice(0, 100)}`));

// _caps 检查
const corePath = path.join(STORY, "core.js");
let capsWarn = "core.js 未找到";
if (fs.existsSync(corePath)) {
  const core = fs.readFileSync(corePath, "utf8");
  const capsBlock = core.slice(core.indexOf("_caps:"), core.indexOf("_caps:") + 500);
  capsWarn = /mercuryLoad\s*:/.test(capsBlock)
    ? "✅ mercuryLoad 已注册进 _caps（有全局上限）"
    : "❌ P0：mercuryLoad 未注册进 _caps —— 无全局上限，35 处裸 add 可无限累加";
}

console.log("\n【上限检查】");
console.log("   " + capsWarn);
console.log("\n【死亡阈值】");
const hasTrigger = fs.existsSync(corePath) &&
  /condition:\s*"mercuryLoad\s*>=\s*70"/.test(fs.readFileSync(corePath, "utf8"));
console.log(`   全局触发器 mercuryLoad >= 70 → 结局-汞中毒尸变 : ${hasTrigger ? "✅" : "❌"}`);
console.log("\n");
