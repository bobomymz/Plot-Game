// 临时脚本：分析整个游戏的 image 完成度
const fs = require("fs"), path = require("path");

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(d, e.name)) : (e.name.endsWith(".js") ? [path.join(d, e.name)] : [])
  );
}

// 用完整对象字面量解析 storyData（场景都是 { "id": {...} } 结构，用简单括号计数解析）
function parseScenes(code) {
  const scenes = {};
  // 匹配 "场景ID": { 的顶层结构（不考虑嵌套对象里的 image）
  // 策略：逐字符扫描，找顶层的 "xxx": { 开头，配对的花括号结尾
  const re = /"([^"]+)":\s*\{/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const id = m[1];
    const start = m.index + m[0].length;
    // 从这里开始数花括号（跳过字符串字面量中的花括号）
    let depth = 1, i = start;
    while (i < code.length && depth > 0) {
      const c = code[i];
      if (c === '"') {
        // 跳过字符串（处理转义）
        i++;
        while (i < code.length && code[i] !== '"') { if (code[i] === "\\") i++; i++; }
      } else if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    const block = code.slice(start, i - 1);
    if (block.includes(":") || block.trim().length > 0) {
      scenes[id] = block;
    }
  }
  return scenes;
}

function imageInfo(block) {
  // 找 image 字段
  const imgRe = /image\s*:\s*(function\s*\(|timeImage\s*\(|"([^"]+)"|\{)/;
  const m = imgRe.exec(block);
  if (!m) return { type: "none" };
  if (block.match(/timeImage\s*\(/)) {
    // timeImage 有多个时段
    const t = block.slice(0, block.indexOf("image") + 5);
    return { type: "timeImage" };
  }
  if (m[1] === "function") return { type: "function" };
  if (m[1] === "{") return { type: "object" };
  return { type: "string", path: m[2] };
}

const files = walk("story").sort();
const results = [];
const placeholderCounts = {};

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  const scenes = parseScenes(code);
  for (const [id, block] of Object.entries(scenes)) {
    const info = imageInfo(block);
    let status = info.type;
    let isPlaceholder = false;
    if (info.type === "string" && info.path) {
      if (info.path.includes("placeholder")) { status = "占位"; isPlaceholder = true; }
      else if (!fs.existsSync(info.path)) { status = "缺失文件"; }
      else status = "真实图";
    }
    const textLen = (block.match(/text\s*:/) ? block.length : 0);
    const isEnding = /结局-/.test(id);
    const choices = (block.match(/nextScene\s*:/g) || []).length;
    results.push({ file: path.basename(f), id, status, isPlaceholder, isEnding, blockLen: block.length, choices });
    if (isPlaceholder) placeholderCounts[path.basename(f)] = (placeholderCounts[path.basename(f)] || 0) + 1;
  }
}

// 汇总
const total = results.length;
const byFile = {};
for (const r of results) byFile[r.file] = byFile[r.file] || { total: 0, real: 0, placeholder: 0, missing: 0, none: 0, ending: 0, timeImage: 0 };
for (const r of results) {
  const b = byFile[r.file];
  b.total++;
  if (r.status === "真实图") b.real++;
  if (r.status === "占位") b.placeholder++;
  if (r.status === "缺失文件") b.missing++;
  if (r.status === "none") b.none++;
  if (r.status === "timeImage") b.timeImage++;
  if (r.isEnding) b.ending++;
}

console.log("=== 按文件汇总 ===");
console.log("文件\t总数\t真实图\t占位\t缺失\t无image\ttimeImage\t结局数");
for (const [f, b] of Object.entries(byFile)) {
  console.log(`${f}\t${b.total}\t${b.real}\t${b.placeholder}\t${b.missing}\t${b.none}\t${b.timeImage}\t${b.ending}`);
}

console.log("\n=== 全局 ===");
const real = results.filter(r => r.status === "真实图").length;
const ph = results.filter(r => r.isPlaceholder).length;
const miss = results.filter(r => r.status === "缺失文件").length;
const none = results.filter(r => r.status === "none").length;
const timeImg = results.filter(r => r.status === "timeImage").length;
console.log(`场景总数: ${total}  真实图: ${real}  占位图: ${ph}  缺失文件: ${miss}  无image: ${none}  timeImage: ${timeImg}`);

// 列出真实图按文件
console.log("\n=== 各文件真实图数量 ===");
for (const [f, b] of Object.entries(byFile)) {
  if (b.real > 0) {
    const list = results.filter(r => r.file === f && r.status === "真实图").map(r => r.id);
    console.log(`\n[${f}] (${b.real}张)`);
    list.forEach(id => console.log("  ✓ " + id));
  }
}
