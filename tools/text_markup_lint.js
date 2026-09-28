// ====== 正文标记体检（text markup lint）======
//
// 背景：剧情正文支持 HTML（引擎 innerHTML + 打字机整段插标签），但写错会静默破坏画面：
//   - 块级标签（div/p/ul/table）在 <p id="scene-text"> 里会被浏览器自动闭合段落 → 后半段文字掉出面板
//   - class 拼错 → 样式静默失效
//   - 标签未闭合 → 后半段整段被着色
//   - 裸 < 或 & → 被当成标签吞字
//
// 用法：node tools/text_markup_lint.js [文件/目录 ...]   不给参数则扫全库 story/
// 退出码：有 E 级问题 = 1

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

// class 白名单：必须与 style.css 的定义、engine.js 的 CHOICE_HTML_CLASSES 三处同步
const ALLOWED_CLASSES = new Set([
  "sys", "warn", "crit", "numb",
  "sfx", "shout", "rot",
  "smell", "think", "mem",
  "leaf", "water", "fire", "dust", "gore", "chem",
  "hand", "print", "term", "sign",
  "num", "clock", "end",
]);

// 允许出现在正文里的行内标签（<p> 内，块级一律禁止）
const ALLOWED_TAGS = new Set([
  "span", "b", "strong", "i", "em", "small", "mark", "code", "br", "sub", "sup",
]);
const BLOCK_TAGS = new Set([
  "div", "p", "ul", "ol", "li", "table", "tr", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "section", "article", "header", "footer", "nav", "form", "img", "script", "style",
]);

const E = [], W = [];
const add = (arr, file, msg) => arr.push(`${file}: ${msg}`);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

const argPaths = process.argv.slice(2).filter(a => !a.startsWith("--"));
let files = [];
if (argPaths.length) {
  for (const a of argPaths) {
    const p = path.resolve(process.cwd(), a);
    const st = fs.statSync(p);
    if (st.isDirectory()) files.push(...walk(p));
    else files.push(p);
  }
} else {
  files = walk(path.join(ROOT, "story"));
}
files = files.sort();

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

// ---------- 1) 源码级：扫字符串里的标记 ----------
// 注意：斜杠要单独分组——`</span>` 与 `/</g` 都含 "</"+字母，不分组会把
// `String.replace(/</g, "&lt;")` 里的代码误判成标签 <g>（09-28 踩过）
const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
// 注意：闭合标签以 </ 开头，正则必须把斜杠单独分组，否则 </span> 匹配不到（踩过一次坑）
const pairRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g;

for (const f of files) {
  const rf = rel(f);
  const src = fs.readFileSync(f, "utf8");
  const lineOf = (idx) => src.slice(0, idx).split("\n").length;

  // 标签扫描
  let m;
  tagRe.lastIndex = 0;
  while ((m = tagRe.exec(src)) !== null) {
    const raw = m[0];
    const name = m[2].toLowerCase();
    const attrs = m[3];
    const line = lineOf(m.index);

    // 闭合标签交给下面的配对栈检查，这里只管开标签（否则 </g> 之类会误报"不在白名单"）
    if (m[1] === "/") continue;
    // 比较运算符误匹配（如注释里的 `5<lag<=6`）：真 HTML 标签不会跨行写到下一行去。
    // ⚠ 不要用"标签长度"做阈值——东明街道路径.js 里带长 inline style 的真 <div> 会被误放过。
    if (/[\n\r]/.test(raw)) continue;

    if (BLOCK_TAGS.has(name)) {
      add(E, rf, `L${line} 块级标签 <${name}> 会撑破 <p id="scene-text">，只能用行内元素：${raw}`);
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) {
      add(E, rf, `L${line} 标签 <${name}> 不在白名单：${raw}`);
      continue;
    }
    // class 白名单
    for (const cm of attrs.matchAll(/class\s*=\s*['"]([^'"]*)['"]/g)) {
      for (const c of cm[1].split(/\s+/).filter(Boolean)) {
        if (!ALLOWED_CLASSES.has(c)) add(E, rf, `L${line} class '${c}' 不在白名单（style.css / engine.js 三处需同步）`);
      }
    }
    // 危险属性
    if (/\son[a-z]+\s*=|javascript:/i.test(attrs)) add(E, rf, `L${line} 标签含事件属性或 javascript: —— ${raw}`);
    // 插值写在属性里（{变量} 在属性中不会被替换，属笔误）
    if (/\{[A-Za-z_]\w*\}/.test(attrs)) add(E, rf, `L${line} 标签属性里出现 {变量}（不会插值，多半是写错位置）`);
  }

  // 闭合配对（只查白名单标签，忽略 <br>）
  const stack = [];
  pairRe.lastIndex = 0;
  while ((m = pairRe.exec(src)) !== null) {
    const isClose = m[1] === "/";
    const name = m[2].toLowerCase();
    const selfClose = m[4] === "/";
    if (!ALLOWED_TAGS.has(name)) continue;
    const line = lineOf(m.index);
    if (isClose) {
      const top = stack.pop();
      if (!top) add(E, rf, `L${line} 多余的闭合标签 </${name}>`);
      else if (top.name !== name) add(E, rf, `L${line} 闭合顺序错：期望 </${top.name}>（开于 L${top.line}），实得 </${name}>`);
    } else if (!selfClose && name !== "br") {
      stack.push({ name, line });
    }
  }
  // 未闭合的残留（跨段落很可能是写漏）
  for (const s of stack) add(E, rf, `L${s.line} 标签 <${s.name}> 未见闭合（到文件结束仍未闭）`);

  // 裸 < 或裸 &（排除 <=、=>、&&、</、<标签 等合法用法）——代码注释里误报率高，只报 W
  const bare = /[<&](?![a-zA-Z/!#=])|&(?![a-zA-Z#]{2,6};)(?![&=])/g;
  let bm;
  while ((bm = bare.exec(src)) !== null) {
    // 跳过 JS 逻辑与 `&&`：条件表达式里满地都是（showCondition: "a && b"），不是剧情文本
    if (src[bm.index + 1] === "&" || src[bm.index - 1] === "&") continue;
    // 跳过非剧情文本行（09-28：这些占了全库 W 的大半，会把真问题埋掉）：
    //   - 条件/跳转字段：condition / nextScene 里的比较运算符
    //   - 图片路径：night&midnight.webp 这种文件名里的 & 不进 innerHTML
    const lnStart = src.lastIndexOf("\n", bm.index) + 1;
    const lnEnd = src.indexOf("\n", bm.index);
    const lineTxt = src.slice(lnStart, lnEnd < 0 ? src.length : lnEnd);
    if (/^\s*(show)?[Cc]ondition\s*:|^\s*(nextScene|elseScene|timeoutScene)\s*:|^\s*(image|morning|evening|night|midnight)\s*:|\.(webp|png|jpg|jpeg)/i.test(lineTxt)) continue;
    // 只关心出现在中文文本附近的（代码块里允许比较运算符：这里用简单启发式——前后有中文或引号）
    const s = Math.max(0, bm.index - 12), e = Math.min(src.length, bm.index + 12);
    const ctx = src.slice(s, e);
    if (/[\u4e00-\u9fa5“”]/.test(ctx)) add(W, rf, `L${lineOf(bm.index)} 疑似裸 '${bm[0]}'（在剧情文本里会被当 HTML 吞掉，请用 &lt; / &amp;）`);
  }
}

// ---------- 2) 运行期：把每个场景的 text 真跑一遍，检查去标签后的文本是否完整 ----------
// 只做「标签配对 + 去标签后不为空」的兜底；不重复上面源码级检查。
try {
  const ctx = {
    console, Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, RegExp,
    isNaN, parseInt, parseFloat,
    flashStatusWarning: () => {}, triggerShake: () => {}, DOMParser: function () {},
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const ordered = files.slice().sort((a, b) => {
    const rank = (p) => (p.endsWith("utils.js") ? 0 : p.endsWith("core.js") ? 1 : 2);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  // 只加载被 lint 的文件；依赖缺失时静默跳过（规模统计不是本工具职责）
  const bundle = ordered.map((f) => fs.readFileSync(f, "utf8")).join("\n;\n")
    + "\n;globalThis.__SD = (typeof storyData !== 'undefined') ? storyData : null;\n";
  try {
    vm.runInContext(bundle, ctx, { filename: "story-bundle.js" });
  } catch (e) { /* 顶层依赖引擎，忽略 */ }
  const sd = ctx.__SD || {};
  for (const sid of Object.keys(sd)) {
    const v = sd[sid];
    if (!v || typeof v !== "object" || typeof v.text === "undefined") continue;
    const texts = Array.isArray(v.text) ? v.text : [v.text];
    for (const t of texts) {
      if (typeof t !== "string") continue;
      const plain = t.replace(/<[^>]*>/g, "");
      if (t.trim() && !plain.trim()) add(E, "runtime", `场景 ${sid}: 去掉标签后文本为空（标签写错包住了全部文字）`);
      if (/\n\n/.test(plain)) add(W, "runtime", `场景 ${sid}: 去标签后含空行 \\n\\n（违反规范）`);
    }
  }
} catch (e) {
  add(W, "runtime", `运行期检查跳过：${String(e && e.message || e).slice(0, 80)}`);
}

// ---------- 输出 ----------
console.log("=== text markup lint ===");
console.log(`扫描文件：${files.length}`);
console.log(`E（必须修）：${E.length}`);
E.slice(0, 60).forEach(s => console.log("  E " + s));
if (E.length > 60) console.log(`  …还有 ${E.length - 60} 条`);
console.log(`W（人工核对）：${W.length}`);
W.slice(0, 30).forEach(s => console.log("  W " + s));
if (W.length > 30) console.log(`  …还有 ${W.length - 30} 条`);
process.exit(E.length ? 1 : 0);
