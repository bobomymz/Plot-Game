# 既存 4 处 markup bug 修复报告

日期：2026-09-28　触发：长者食堂样板改造时 `text_markup_lint` 扫出，波波要求修掉
性质：**既存真 bug**（都不是本次 HTML 增强引入的，原本就写错了）

修复后全库 `text_markup_lint` **E: 4 → 0**。

---

## 1. 四处问题与修法

| # | 文件 | 行 | 原写法 | 问题 | 修法 |
|---|---|---|---|---|---|
| ① | `story/东明街道/上实南校.js` | L1396 | `<span style='color:#00fbffff;font-style:italic'>【系统提示】获得记忆[返校]` | **缺 `</span>`** | 补闭合 + 按 P1 口径换 `class='sys'` |
| ② | `story/东明街道/东明街道路径.js` | L811 | `<div style="border-left…">…存款凭条…</div>` | **块级 `<div>` 撑破 `<p>`** | → `<span class='print'>` |
| ③ | `story/东明街道/樱桃苑（初始小区）.js` | L122 | `<div style='color:rgba(8,243,47,1);font-size:22px'>` | 同上 | → `<span class='sfx rot'>` |
| ④ | `story/东明街道/樱桃苑（初始小区）.js` | L123 | `<div style='color:#ff4444;font-size:18px'>` | 同上 | → `<span class='crit'>` |

附带：樱桃苑同一节点的结局行 `—— 结局：当你凝视深渊时……——` 一并迁移为 `class='end'`（P1 口径）。

### 为什么这 4 处是真 bug 而不是"风格问题"

- **①**：浏览器会把未闭合的 `<span>` 一路补到段落结束。当前该 span 正好在文本末尾，暂时看不出来；
  但只要以后在这行后面加任何文字，全都会被染成青色斜体。
- **②③④**：`#scene-text` 是 `<p>`。在 `<p>` 里写 `<div>`，浏览器解析到 `<div>` 时会自动闭合 `<p>`，
  于是 `<div>` 之后的内容**跑出段落节点**。银行凭条那处最明显——"860块……""你把凭条叠好塞进口袋"两行会被挤出去，
  样式全部丢失。

⚠ 顺带确认：`sanitizeInlineHtml`（选项白名单过滤）只作用于**选项文本**；
正文是 `innerHTML` 直接赋值，**不过滤**。所以正文里的 `<div style=…>` 是完整生效的（既撑破段落、又带上了那些样式）。

---

## 2. 修复的代价（要说清楚）

**银行凭条的"卡片感"做不出来了。** 原来 `<div>` 带 `border-left: 3px` + `padding-left: 14px` + `margin: 14px 0`，
做出一块缩进的票据卡片。行内元素拿不到块级的上下 margin，方案硬约束又禁止块级标签，只能取舍：

- 保留：等宽感（用印刷体 + 字距）、分行（`<br>`，行内安全，日记本已在用）、分隔线 `━━━`
- 放弃：左边框、缩进、上下留白

对齐不受影响——凭条里"网点/日期/柜员/户名/金额"都是**两字 + 全角冒号**，冒号位置天然对齐，
不依赖等宽字体。

樱桃苑那两行同理：原 22px 亮绿荧光改成 `sfx rot`（1.35em 放大 + 丧尸脏黄绿），
视觉冲击保留了，颜色从"刺眼荧光绿"收敛到全库语义色板。

---

## 3. 回归（真实数字）

**改动文件**：`story/东明街道/上实南校.js`、`story/东明街道/东明街道路径.js`、
`story/东明街道/樱桃苑（初始小区）.js`、`tools/text_markup_lint.js`、`tools/scene_html_render_selftest.mjs`。

| 项 | 结果 |
|---|---|
| 全库 `node --check` | 全过 |
| **`text_markup_lint` 全库** | **E=0**（修前 4）／ W 68 → 55 |
| `scene_html_render_selftest`（真浏览器） | **92 通过 / 0 失败**（新增 3 个修复场景的断言，原 64） |
| `choice_html_selftest` | 18 / 0 |
| `condition_audit` | 0 处 |
| `scene_fn_selftest` | 0 异常 |
| `save_compat_selftest` | 27 / 0 |
| `lint_story` | E=0 W=110 |
| `scene_id_dup` | 0 |
| `mercury_engine_e2e` / `leak_guard` | 20 / 0，零泄露 |
| `bag_volume` 32/0 · `bottle_pickup` 72/0 · `noodle_stack` 65/0 · `rest_tidy` 155/0 · `xin_chapter` 74/0 · `jp_bell` 23/0 · `unarmed_fight` 34/0 · `mercury` 37/0 | 全绿 |
| `overnight_shelter_audit` | 悬空 0 / 失效 0 |
| `bridge_node_check` | 22 / 0 |
| `e2e_smoke` | 页面异常 0 / 资源失败 0 |

新增断言覆盖：银行凭条（`print` 块内含 `<br>` 换行、正文不丢）、结局-丧尸的凝视（`end` 渲染）、
上实南校-撤离成功（`sys` 闭合，不再污染后续文本）。

---

## 4. 顺带：`text_markup_lint` 的 W 降噪（68 → 55）

修 bug 时发现 W 里大半是误报，会把真问题埋掉，顺手加了跳过规则：

- `condition:` / `nextScene:` / `elseScene:` / `timeoutScene:` 行（比较运算符，不是剧情文本）
- `image:` / `morning:` / `evening:` / `night:` / `midnight:` 行及含 `.webp/.png/.jpg` 的行
  （`客厅-night&midnight.webp` 这种文件名里的 `&` 不进 `innerHTML`）

剩余 55 条主要是"同一行里代码 + 中文字符串"的混合行（如 `hh < 11 ? "上午" : …`），
自动区分代价太大，保持 W 级人工核对。

---

## 5. 遗留

1. 全库 P1 迁移还剩 **265 处 inline style → class**、122 处结局行、7 处 `**` markdown 残留，未动。
2. 银行凭条这类"票据/小票"若后面还有多处，建议单独加一个 `slip` class（等宽 + 印刷色、无辉光），
   比 `print` 更贴切。本次只用了一处，没加——要加记得同步三处
   （`style.css` / `engine.js CHOICE_HTML_CLASSES` / `text_markup_lint.js ALLOWED_CLASSES`）。
