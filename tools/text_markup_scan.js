// ====== 剧情文本 HTML 增强 · 候选扫描器（只读，不改任何剧情文件）======
//
// 用途：为「用 HTML 提升剧情文本表现力」盘点改造面——
//   1) 统计规模（场景节点数 / 文本总字数 / 现有 inline style 数量）
//   2) 按语义类别抓候选片段：拟声词、突袭危险、环境色、心理活动、书面载体、
//      气味、电子/机械文本、喊叫、结局行、markdown 残留
//
// 用法：node tools/text_markup_scan.js [--md]
//   --md  额外写出 tools/剧情文本HTML增强-候选清单.md
//
// ⚠ 只读：本脚本不写任何 story/ 文件。

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const STORY_DIR = path.join(ROOT, "story");

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}
const files = walk(STORY_DIR).sort();
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

// ---------- 类别定义：name -> 正则（逐条匹配，取上下文窗口）----------
const ONOMATOPOEIA_CHARS = "砰啪咔哐轰嗒嗡哗吱咚咯嗤唰嗖嚓铿哐啷";
const CATEGORIES = [
  {
    key: "onomatopoeia",
    name: "拟声词（拟放大字号）",
    re: new RegExp(`[${ONOMATOPOEIA_CHARS}]{1,4}(?:——|—)?|哗啦|咔嚓|砰砰|嗒嗒|嗡嗡|吱呀|沙沙|啪嗒`, "g"),
    minLen: 2,
  },
  {
    key: "attack",
    name: "突袭/受伤（红色加粗 or 危险色）",
    re: /朝你扑了过来|扑了过来|猛地扑|扑上来|一口咬住|咬住了|抓住了你|攥住了你|从背后|窜出来|扑倒|撕扯|喉咙被咬住/g,
  },
  {
    key: "zombieVoice",
    name: "丧尸声音/嘶吼",
    re: /喉咙里挤出[^。\n]{0,12}|嘶吼|低吼|咆哮|嗬嗬|喉音|干嚎/g,
  },
  {
    key: "env",
    name: "环境描写（按环境配色）",
    re: /灌木丛|绿化带|杂草|草地|香樟|水杉|芦苇|河水|河面|积水|雨丝|雾|灰尘|尘土|火光|火苗|燃烧|焦痕|血迹|干涸的血|腐肉|白骨|铁锈|玻璃碴|水泥|白墙|日光灯/g,
  },
  {
    key: "smell",
    name: "气味（本项目特色）",
    re: /一股[^。\n]{0,16}味|气味|腐臭|腥味|臭|刺鼻|甜腻|泥腥|机油味/g,
  },
  {
    key: "thought",
    name: "心理活动（斜体候选）",
    re: /你心想|心里[一二]?[想阵]|脑子里|一个念头|你忽然想起|你想起来|不知道为什么|你想/g,
  },
  {
    key: "carrier",
    name: "书面载体（信/条/屏/告示…）",
    re: /写着["“][^"”]{2,40}["”]|标签上[^。\n]{0,20}|告示|通知|横幅|招牌|白板|备忘录|短信|微信|实验记录|检修表|报告上|封面上/g,
  },
  {
    key: "screen",
    name: "电子屏/机械面板文本",
    re: /屏幕上[^。\n]{0,30}|面板屏幕|弹出[^。\n]{0,20}|显示屏|系统跳出|待机字样|倒计时/g,
  },
  {
    key: "shout",
    name: "喊叫/命令（放大加粗）",
    re: /[^。\n]{0,10}大喊[^。\n]{0,20}|吼道|喊道|快跑|别动|卧槽|救命/g,
  },
  {
    key: "ending",
    name: "结局行",
    re: /—— 结局：[^—]*——/g,
  },
  {
    key: "markdown",
    name: "markdown 残留（** ** 未渲染）",
    re: /\*\*[^*\n]{1,20}\*\*/g,
  },
  {
    key: "inlineStyle",
    name: "现有 inline style（待迁移为 class）",
    re: /<span style='[^']*'>/g,
  },
];

// ---------- 扫描 ----------
const stats = { files: files.length, chars: 0 };
const hits = {};
for (const c of CATEGORIES) hits[c.key] = { name: c.name, count: 0, samples: [] };

function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") n++;
  return n;
}

for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  stats.chars += src.length;
  for (const c of CATEGORIES) {
    const re = new RegExp(c.re.source, c.re.flags);
    let m;
    while ((m = re.exec(src)) !== null) {
      const tok = m[0];
      if (c.minLen && tok.length < c.minLen) continue;
      const h = hits[c.key];
      h.count++;
      if (h.samples.length < 25) {
        const s = Math.max(0, m.index - 30);
        const snip = src.slice(s, m.index + tok.length + 40).replace(/\s+/g, " ").trim();
        h.samples.push({ file: rel(f), line: lineOf(src, m.index), token: tok, snip });
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
}

// ---------- 规模：尝试在 vm 中加载剧情，统计真实节点数 ----------
let sceneCount = null, textCount = 0, textChars = 0, loadErr = null;
const failed = [];
try {
  const ctx = { console, Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, RegExp, isNaN, parseInt, parseFloat };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.storyData = {};
  vm.createContext(ctx);
  // 单文件跑不通（const 声明不落 context、且加载顺序有依赖）→ 按 utils→core→其余 拼成一个大脚本，
  // 末尾把 storyData 抓到 globalThis.__SD 上。顶层执行依赖引擎时会整段失败，属预期，规模数据按不可用处理。
  const ordered = files.slice().sort((a, b) => {
    const rank = (p) => (p.endsWith("utils.js") ? 0 : p.endsWith("core.js") ? 1 : 2);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const bundle = ordered.map((f) => fs.readFileSync(f, "utf8")).join("\n;\n")
    + "\n;globalThis.__SD = (typeof storyData !== 'undefined') ? storyData : null;\n";
  try {
    vm.runInContext(bundle, ctx, { filename: "story-bundle.js" });
    const sd = ctx.__SD || {};
    sceneCount = Object.keys(sd).filter((k) => !k.startsWith("_")).length;
    for (const k of Object.keys(sd)) {
      const v = sd[k];
      if (!v || typeof v !== "object") continue;
      if (typeof v.text !== "undefined") {
        textCount++;
        const t = typeof v.text === "function" ? "" : String(v.text || "");
        textChars += t.length;
      }
    }
  } catch (e) {
    loadErr = String(e && e.message ? e.message : e);
  }
} catch (e) {
  loadErr = String(e && e.message ? e.message : e);
}

// ---------- 输出 ----------
const lines = [];
lines.push("# 剧情文本 HTML 增强 · 候选清单");
lines.push("");
lines.push("> 由 `node tools/text_markup_scan.js --md` 生成，只读扫描，未改动任何剧情文件。");
lines.push("");
lines.push("## 一、规模");
lines.push("");
lines.push(`- 剧情 JS 文件：**${stats.files}** 个，源码总字符数：**${stats.chars.toLocaleString()}**`);
if (sceneCount !== null) {
  lines.push(`- 场景节点：**${sceneCount}** 个，其中带 \`text\` 的：**${textCount}** 个，\`text\` 静态文本合计 **${textChars.toLocaleString()}** 字`);
} else {
  lines.push(`- 场景节点：vm 加载失败（${loadErr}），规模数据不可用`);
}
lines.push("");
lines.push("## 二、分类候选");
lines.push("");
lines.push("| 类别 | 命中次数 |");
lines.push("| --- | ---: |");
for (const c of CATEGORIES) lines.push(`| ${hits[c.key].name} | ${hits[c.key].count} |`);
lines.push("");
for (const c of CATEGORIES) {
  const h = hits[c.key];
  lines.push(`### ${h.name}（${h.count} 处）`);
  lines.push("");
  if (h.samples.length === 0) { lines.push("_（无）_"); lines.push(""); continue; }
  for (const s of h.samples) {
    lines.push(`- \`${s.file}:${s.line}\` …${s.snip}…`);
  }
  lines.push("");
}

const report = lines.join("\n");
if (process.argv.includes("--md")) {
  const out = path.join(__dirname, "剧情文本HTML增强-候选清单.md");
  fs.writeFileSync(out, report, "utf8");
  console.log("已写出：" + rel(out));
} else {
  console.log(report);
}
