# 五金店 HTML 样板改造报告（P1–P3 落地）

> 2026-09-27 ｜ 方案：`tools/剧情文本HTML增强方案.md` ｜ 预览：`tools/text_style_preview.html`（含样板实拍）
> 波波已拍板 6 项：① 可拾取物**不**高亮 ② 选项文本**支持** HTML ③ 拟声 **1.35em** ④ 气味**不做**颜色分档 ⑤ 汞中毒**允许**视觉暗示 ⑥ 系统青可换柔和色

---

## 一、改了什么

| 文件 | 改动 | 风险 |
|---|---|---|
| `style.css` | `:root` 加 17 个语义色变量；新增 **21 个语义 class**（sys/warn/crit/numb/sfx/shout/rot/smell/think/mem/leaf/water/fire/dust/gore/chem/hand/print/term/sign/num/clock/end） | 只增不改，零影响 |
| `engine.js` | 新增 `sanitizeInlineHtml()`（DOMParser 白名单：标签 11 种 + class 23 个，非白名单标签降级为纯文本、非白名单属性全丢）；选项渲染 **3 处** `textContent → innerHTML`（820 普通选项 / 910 QTE 内选项 / 969 输入型 label） | 有白名单兜底，见 §三验证 |
| `story/东明街道/五金店.js` | 加 **75 处**语义标记，覆盖全部 8 个结局行；0 处 inline style、0 处 markdown 残留（该文件本来就没有） | 文本零删改，只包标签 |
| `tools/text_markup_lint.js`（新） | 块级标签 / 非白名单 class / 标签未闭合 / 事件属性 / 属性里写 `{变量}` / 裸 `<` `&` 全查，E 级退出码 1 | 只读 |
| `tools/choice_html_selftest.mjs`（新） | 真浏览器验证选项 HTML 通路，**18 断言**含 XSS 对照组 | 只读 |
| `tools/ai_phrase_scan{,2,3}.py` | 提取剧情文本时先 `STRIP_HTML_RE` 剥标签——否则标签会打断"雷同表述"的连续匹配导致漏检 | 只影响统计口径 |

## 二、样板用量（五金店 1 个文件）

| class | 处数 | class | 处数 |
|---|---:|---|---:|
| `sfx` 拟声 | 18 | `dust` 尘/暗 | 2 |
| `crit` 突袭危险 | 18 | `chem` 化工/汞（重影） | 2 |
| `end` 结局行 | 9 | `warn` 警告 | 1 |
| `rot` 丧尸/腐 | 7 | `sign` 招牌 | 1 |
| `smell` 气味 | 6 | `print` 印刷标签 | 1 |
| `fire` 火/光 | 5 | `numb` 意识涣散 | 1 |
| `think` 心理 | 3 | `gore` 血迹 | 1 |

**密度**：8.5 万字全库 / 本文件约 2.2 千字 → 75 处 ≈ 每 30 字 1 处，属"高表现力"档。这个文件本身就是「五种死法」的陷阱屋，密度天然偏高；推广到日常探索场景时应降到每 60–100 字 1 处。

## 三、回归（真实数字）

| 项 | 结果 |
|---|---|
| `node --check` 全库 26 文件 | 全通过 |
| `tools/text_markup_lint.js` 五金店 | **E=0 / W=0**（标签闭合 75/75） |
| `tools/choice_html_selftest.mjs`（真浏览器） | **18 通过 / 0 失败** |
| `e2e_smoke.mjs`（真浏览器全流程） | 页面异常 0；唯一 Console 错误是既存 404 图片 |
| `condition_audit.js` | 0 / 0 |
| `scene_fn_selftest.js` | 0 处异常（1471 场景 × 7 变体） |
| `lint_story.mjs` | **E=4**（全是既存图片 404：建平化学实验室×3、全家仓库×1，**非本次引入**，本次未改这两个文件） |
| `save_compat_selftest.js`（改 engine 必跑） | 27 / 0 |
| `mercury_engine_e2e.js` | 20 / 0 |
| `mercury_leak_guard.js` | 渲染 42 次，P0 泄露 0 |
| `scene_id_dup_scan.js` | 重名 0 |
| `bag_volume 32/0`、`bottle_pickup 72/0`、`noodle_stack 64/0`、`rest_tidy 155/0`、`xin_chapter 74/0`、`jp_bell 23/0`、`unarmed_fight 34/0`、`mercury 37/0` | 全绿 |
| `overnight_shelter_audit` | 悬空 0 / 失效跳转 0 |
| `stamina_audit / report --selftest / telemetry_selftest` | 通过 / 通过 / 9-0 |
| `ai_phrase_scan{,2,3}.py` | 去标签后仍可正常运行 |

## 四、选项 HTML 通路验证要点（波波拍板②）

`choice_html_selftest.mjs` 的 18 条断言里，关键几条：
- 白名单 class 渲染成**真元素**，按钮文本里**不含**字面 `<span>`（没被 escape）；`class="sys warn"` 两个 class 同时保留。
- 白名单外 class（如 `evil`）→ class 被移除、**文字保留**（不会吞字）。
- `<div>` / `<script>` / `<img onerror>` → 全部**降级为纯文本**，DOM 里查不到这些元素，注入的 `window.__XSS*` **一个都没执行**。
- `onclick`、`style` → 剥离；`{strength}` 插值照常。
- 输入型选项 label 同样支持；点击跳转功能不受影响。

> ⚠ 后续维护铁律：**新增 class 必须同步三处** —— `style.css` 的 `.类` 定义、`engine.js` 的 `CHOICE_HTML_CLASSES`、`tools/text_markup_lint.js` 的 `ALLOWED_CLASSES`。`text_markup_lint` 会查白名单，漏同步会直接报 E。

## 五、本轮刻意没做的事（等你看了效果再定）

1. **选项文本一个都没上色**。五金店是"正门必死"的陷阱屋，给「从正门钻进去」上 `crit` 等于剧透死法——属信息透明度问题，按①的口径一律不动。选项支持 HTML 的能力已备好，要不要在别的场景用（比如标红"赌一把"）你说了算。
2. **气味统一一色**（`smell` 褐黄斜体），没做血腥/腐肉/化工三档。
3. **`chem` 重影用了 2 处**（柜台下绿色气体、地板缝渗出的绿色气体）——这是⑤批准的"视觉暗示"，玩家只会觉得字在晃，不点明机制。
4. **`num` / 可拾取高亮 0 处**——按①不标。样板里唯一接近的是仓库的 `WD-40 防锈润滑剂`（走 `print` 印刷体，仅表示"这是商品标签"，不是"可拿"）。

## 六、下一步

- 你在浏览器里过一遍五金店（或看 `text_style_preview.html` 的「样板实拍」节），确认三点：**密度是否过花**、**`sfx` 1.35em 在手机上的行高**、**`chem` 重影的观感**。
- 通过后按 P1 推广顺序走：**265 处 inline style → class（全自动）→ 122 处结局行 → 各区域 P2/P3**。建议第二批挑一个「日常探索型」文件（如 `长者食堂.js`）做密度对照，避免全库都按陷阱屋的强度上色。
