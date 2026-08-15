// 临时脚本：分析占位场景的枢纽度（被引用次数）+ 分类
const fs = require("fs"), path = require("path");

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(d, e.name)) : (e.name.endsWith(".js") ? [path.join(d, e.name)] : [])
  );
}

// 收集所有 nextScene 引用
const allCode = [];
for (const f of [...walk("story"), "engine.js"]) {
  const code = fs.readFileSync(f, "utf8");
  allCode.push([f, code]);
}

// 统计每个场景被引用次数
const refCount = {};
for (const [f, code] of allCode) {
  // nextScene: "xxx" 和 nextScene: function 里的返回
  for (const m of code.matchAll(/nextScene\s*:\s*"([^"]+)"/g)) {
    refCount[m[1]] = (refCount[m[1]] || 0) + 1;
  }
  for (const m of code.matchAll(/(?:elseScene|timeoutScene|onTimeout|wrongScene)\s*:\s*"([^"]+)"/g)) {
    refCount[m[1]] = (refCount[m[1]] || 0) + 1;
  }
}

// 复用解析器
function parseScenes(code) {
  const scenes = {};
  const re = /"([^"]+)":\s*\{/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const id = m[1];
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    while (i < code.length && depth > 0) {
      const c = code[i];
      if (c === '"') { i++; while (i < code.length && code[i] !== '"') { if (code[i] === "\\") i++; i++; } }
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    scenes[id] = code.slice(start, i - 1);
  }
  return scenes;
}

function imageInfo(block) {
  const imgRe = /image\s*:\s*(function\s*\(|timeImage\s*\(|"([^"]+)"|\{)/;
  const m = imgRe.exec(block);
  if (!m) return { type: "none" };
  if (block.match(/timeImage\s*\(/)) return { type: "timeImage" };
  if (m[1] === "function") return { type: "function" };
  if (m[1] === "{") return { type: "object" };
  return { type: "string", path: m[2] };
}

const files = walk("story").sort();
const placeholders = [];

for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  const scenes = parseScenes(code);
  for (const [id, block] of Object.entries(scenes)) {
    const info = imageInfo(block);
    if (info.type === "string" && info.path && info.path.includes("placeholder")) {
      const refs = refCount[id] || 0;
      const isEnding = /结局-/.test(id);
      const textLen = block.length;
      // 是否有 showCondition 变化（可能需分条件）
      const hasConditional = /function\s*\(vars\)/.test(block);
      const isHub = refs >= 3;
      placeholders.push({
        file: path.basename(f), id, refs, isEnding, textLen, hasConditional, isHub,
        status: isEnding ? "结局" : isHub ? "枢纽" : "普通"
      });
    }
  }
}

// 按文件输出枢纽 + 结局占位
console.log("=== 占位场景：枢纽节点（被引用>=3次）===");
for (const p of placeholders.filter(p => p.isHub && !p.isEnding)) {
  console.log(`[${p.file}] "${p.id}"  refs=${p.refs}  ${p.hasConditional ? "(有动态text)" : ""}`);
}

console.log("\n=== 占位场景：结局类（被引用+自身）===");
const endings = placeholders.filter(p => p.isEnding);
const endByFile = {};
for (const e of endings) endByFile[e.file] = (endByFile[e.file] || 0) + 1;
for (const [f, c] of Object.entries(endByFile)) console.log(`[${f}] 结局占位 ${c} 个`);
console.log(`结局占位总数: ${endings.length}`);

console.log("\n=== 占位场景分类统计 ===");
const cat = {};
for (const p of placeholders) {
  const k = p.status;
  cat[k] = (cat[k] || 0) + 1;
}
console.log(cat);
