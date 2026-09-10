// 一次性工具：根据 tools/image-map.json，把代码文件中的旧图片路径替换为新的 .webp 路径
// 只替换 map 中存在的路径（即磁盘上真实存在并已转换的文件），指向缺失文件的引用保持原样
// 用法: node tools/update-refs.js
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const map = JSON.parse(fs.readFileSync(path.join(__dirname, "image-map.json"), "utf8"));

// 需要扫描替换的文件类型；跳过 node_modules / .git / tools 自身
const SCAN_EXT = new Set([".js", ".css", ".html"]);
const SKIP_DIRS = new Set([".git", "node_modules", "tools", "images"]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (SCAN_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

// 按路径长度降序替换，避免短路径是长路径前缀时误替换
// （路径替换都带 images/ 前缀且以扩展名结尾，实际不会误伤，但保险起见）
const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);

let touchedFiles = 0, totalReplacements = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  let changed = 0;
  for (const [oldPath, newPath] of entries) {
    // 路径里可能有正则特殊字符，转义后全局替换
    const re = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const before = content.length;
    content = content.replace(re, newPath);
    changed += (before - content.length) !== 0 ? 1 : 0;
  }
  if (changed > 0) {
    fs.writeFileSync(file, content, "utf8");
    touchedFiles++;
    totalReplacements += changed;
    console.log(`更新: ${path.relative(ROOT, file)}（${changed} 处路径）`);
  }
}

console.log(`\n完成：${touchedFiles} 个文件，共替换 ${totalReplacements} 种路径`);
