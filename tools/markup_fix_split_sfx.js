// 修复 P2 因规则缺陷留下的「半截拟声」sfx span（2026-09-29）
//   症状：<span class='sfx'>吱</span>嘎 / 嘎<span class='sfx'>吱</span> —— 只把拟声词的一半放大，比不标更难看
//   成因①：长词表缺「吱嘎/嘎吱/哐当/咣当/叮铃」，被单字规则命中半个字
//   成因②：「砰砰」+「砰」的合并检查排在配额之后，后一个匹配被「段内sfx已满2」拦下 → 半截放大
//   本脚本把这类 span 还原为纯文本；随后重跑 markup_migrate_p2.js（已补长词 + 合并前置）即可整体包好。
// 幂等：只还原「span 内容能与邻字拼回完整拟声词」的情况，合法的独立拟声 span 不动。
// 用法：
//   node tools/markup_fix_split_sfx.js          # 预演（只报不写）
//   node tools/markup_fix_split_sfx.js --apply  # 写入
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const APPLY = process.argv.includes("--apply");

// 完整拟声词表（两字以上）：用于判断「span 内容 + 邻字」能否拼回一个完整词
const WORDS = new Set([
  "吱嘎", "嘎吱", "哐当", "咣当", "叮铃", "叮当", "咣啷", "哐啷",
  "哗啦", "噼啪", "叮咚", "咕咚", "扑通", "噗通", "吧嗒", "啪嗒",
  "咔嚓", "咔哒", "轰隆", "嗡嗡", "沙沙", "砰砰", "嗒嗒", "咔咔",
  "哗哗", "吱吱", "咯吱", "咚咚", "啪啪", "叮咣",
]);

const DIRS = ["story", path.join("story", "东明街道")];
let total = 0;
const per = [];
for (const d of DIRS) {
  for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) {
    if (!f.endsWith(".js")) continue;
    const rel = path.join(d, f);
    const p = path.join(ROOT, rel);
    const src = fs.readFileSync(p, "utf8");
    let out = src, n = 0;

    // 1) 同字延续：<span>砰砰</span>砰 → 还原「砰砰砰」
    out = out.replace(/<span class='sfx'>([\u4e00-\u9fa5]+)<\/span>([\u4e00-\u9fa5])/g, (m, inner, next) => {
      if (next === inner[inner.length - 1]) { n++; return inner + next; }
      return m;
    });
    // 2) 前字 + <span>单字</span>：嘎<span>吱</span> → 还原「嘎吱」
    out = out.replace(/([\u4e00-\u9fa5])<span class='sfx'>([\u4e00-\u9fa5])<\/span>/g, (m, a, b) => {
      if (WORDS.has(a + b) || WORDS.has(b + a)) { n++; return a + b; }
      return m;
    });
    // 3) <span>单字</span> + 后字：<span>吱</span>嘎 → 还原「吱嘎」
    out = out.replace(/<span class='sfx'>([\u4e00-\u9fa5])<\/span>([\u4e00-\u9fa5])/g, (m, a, b) => {
      if (WORDS.has(a + b) || WORDS.has(b + a)) { n++; return a + b; }
      return m;
    });

    if (n) {
      per.push(`${String(n).padStart(3)}  ${rel}`);
      total += n;
      if (APPLY && out !== src) fs.writeFileSync(p, out, "utf8");
    }
  }
}
console.log(`=== 修复半截拟声 span ${APPLY ? "（已写入）" : "（预演，未写入）"} ===`);
console.log(per.join("\n"));
console.log(`\n合计还原 ${total} 处`);
