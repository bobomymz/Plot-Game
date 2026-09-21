---
name: story-testing
description: 剧情游戏的测试与走查（静态体检/E2E浏览器走查/回归验证）。当用户提到"测试"、"走查"、"冒烟"、"回归"、"验证剧情"、"改完XX区域帮我检查"、"上线/发布前检查"、"跑一遍主线"，或改完 story 数据/engine.js 想确认没坏时使用本技能。按改动类型选 L1 静态体检 / L2 图审计 / L4 浏览器 E2E 的组合执行；无截图原则——语义断言优先，需要人眼的交给用户。
---

# 剧情测试

分层执行：**L1 静态体检（秒级）→ L2 图结构（graph_audit）→ L4 浏览器 E2E（真引擎执行）**。
L3 无头模拟暂缓——L4 在真浏览器里跑的就是真引擎，配合 gameState 读写即可覆盖大部分"真执行"价值。

## 决策表：改了什么 → 跑什么

| 改动 | 必跑 | 加跑 |
|---|---|---|
| 任何 story/*.js 剧情数据 | `node tools/lint_story.mjs`（全图，秒级） | 动了节点/跳转 → `node tools/graph_audit.mjs <区域>` |
| engine.js | `node tools/stamina_telemetry_selftest.js` + `node tools/e2e_smoke.mjs` | 改渲染 → L4 现场脚本抽查若干场景 |
| 数值/物品经济 | lint_story（看 W 类经济警告） | L4 走查后导出 `g.telemetry()` 查体力收支 |
| 新增区域 | lint + graph <区域> + e2e_smoke | L4 现场脚本走新区域主路径 |
| 发布前 | 上面全部 | 主线完整走查一遍 |

**判读铁律：lint 的 [E] 必须清零才能交付；[W] 逐条核对（多为极端变体下的边缘情况，如 jpHide 工厂空 failText）。console 里的 ReferenceError（条件求值被引擎 catch 吞掉）当失败报，不是良性。**

## L1 静态体检：`node tools/lint_story.mjs [区域]`

检查项：死链 / 条件与 timeout 表达式报错（变量未注册）/ 函数抛错 / 空text / 死链图片 / `{插值}` 未注册变量 / itemCount 经济（set hasXxx 没 add itemCount）/ 孤立场景 / positionAfterOperation 死链 / 文本规范（直角引号、\n\n、相对方位词）。
报告 → `tools/lint-report.md`；有 [E] 退出码 1。

注意：vm 里没有 engine.js 的 UI 全局，脚本已 stub `flashStatusWarning`/`triggerShake`——跑出新的 "xxx is not defined" 且 xxx 是引擎函数时，往 stub 列表里补，别当真 bug。

## L4 浏览器 E2E：脚本模式（默认）

公共底座 `tools/test_helper.mjs`（内置静态服务器 + Chrome 启动 + Game 类），现场写路径脚本，`node` 跑，纯文本输出。写法照抄 `tools/e2e_smoke.mjs`：

```js
import { launchGame } from "./test_helper.mjs";
const g = await launchGame();
await g.click("开始游戏");            // 按文字选（乱序免疫；精确匹配优先，包含匹配兜底）
await g.time({ hh: 10 });             // 控时躲"天黑强制过夜"
await g.teleport("新达汇-1F中庭");     // 默认 skipOnEnter 无副作用；测剧情流传 {skipOnEnter:false}
await g.waitChoices();                // 等打字机/分段文本播完（标志=选项出现）
console.log(await g.choices());       // 选项文字列表（守卫生效=树里没有）
console.log((await g.state()).strength);   // gameState 快照（Set 已 __set 展开）
console.log(await g.screenEffects());      // 暗角/雨/丧尸遮罩的 class（语义断言，不用截图）
await g.fillInput("3红2蓝");          // 输入框选项（密码/记忆闪色答案）
console.log(await g.telemetry());     // 体力遥测（每次变动带来源文件:行号）
console.log(await g.reportText());    // console错误/页面异常/资源404 汇总——测试末尾必打
await g.close();
```

其他 API：`scene()` 当前场景ID · `text()` 全文（分段文本只有最后一段）· `restart()` · `zoomBadgeVisible()` · `set({...})` 改状态（自动重渲染重算 computed）· `keepOpen()` 人工验收模式。
不确定场景 ID 时用 `node tools/graph_audit.mjs <区域>` 查，或 grep story 文件。

### 现场脚本套路

1. 传送或点击走到目标场景 → `waitChoices()` → 断言 `choices()` / `state()` / `screenEffects()`
2. 走查 = 循环 `click()`；QTE 场景注意倒计时（见坑3）
3. 结尾必打 `reportText()`；[资源失败] 里出现 .webp 404 = 真问题（图缺失或引用错名）
4. 前置条件不用真玩出来：`set({ hasXxx: true, itemCount: 1 })` 直接造

## L4：MCP 模式（交互调试）

单场景排查（"看看这个场景现在什么样"）用 Playwright MCP / chrome-devtools MCP + **a11y snapshot**，不用截图。快在哪：本游戏 DOM 全语义（真 `<button>` + textContent，`#scene-text` 文本），snapshot 即结构断言。
对比：脚本模式可重复、输出小（几十场景也只有汇总）；MCP 每次 snapshot 回传全树，**长走查别用 MCP**。

## 无截图三层断言法（写测试前先想哪层）

| 想验证 | 途径 |
|---|---|
| 文本/选项/输入框/可见性 | a11y 或 DOM 查询（display:none 不进 a11y 树=免费可见性断言；打字机期间文本是半截→先 stopTyping/等选项出现） |
| 状态/特效/闪色/游戏逻辑 | gameState 读写、overlay.className、`_seqPlayed`/`_currentAnswer`、telemetry |
| 图片/资源加载 | network 404 收集（helper 已内置）；图片"内容对不对"才需要人眼 |

## 坑点清单（2026-09-21 校准实录）

1. **file:// 被 Playwright 拦**：helper 内置静态服务器（8630 起自动找端口）已解决，脚本别自己开浏览器。
2. **选项每次渲染 Fisher-Yates 乱序**：永远按文字选（`click(text)`），不按位置；文字可能是函数+插值后的 → 包含匹配兜底。
3. **QTE 进场景即倒计时**，真实时限按场景数据（如东明路-三林路是 `18000-chased×2000`=18s，不是文档示例的 8s）——慢了会被 `timeoutScene` 跳走。测超时分支用 `set({chasedByZombies:4})` 压短时限；测"来得及选"就快点 click。
4. **`renderScene` 不改 `currentScene`**——引擎约定是调用方先 `currentScene = parseRedirectTarget(目标, gameState)` 再渲染。teleport 已内置此约定，别在 evaluate 里裸调 renderScene。
5. **遥测读内存**：localStorage 每 25 条才镜像一次；实时数据在全局 `__staminaLog`（helper 的 telemetry() 已处理）。
6. **管道截断造孤儿服务器**：`node xxx.mjs | head` 会杀死 stdout 但进程残留、端口卡死。跑 e2e 脚本**不要接 head/tail**；helper 的端口探测已带 2s 超时兜底。
7. **天黑强制过夜**会拦截长走查：开跑先 `time({hh:10})`，或每次 waitChoices 前 controll。
8. **localStorage 自动存档**：新 context 天然干净；复用页面先 `restart()`。
9. **gameState 是顶层 let**：`page.evaluate` 可直接读写（最大杠杆）；但 Set 经序列化变 {} —— 用 helper 的 `state()`。
10. **分段文本（text 数组）**：前段播完即清空，`text()` 只拿得到最后一段；等选项出现才算播完。
11. **`Math.random`**（武器断/尸潮等）不可复现：接受它，或 evaluate 里 stub `Math.random`。
12. **Windows 复制保留 mtime**：图片 404 排查时别信文件时间戳（今天踩过：图是刚补的，mtime 显示昨天）。
13. **vm 静态检查**：极端状态变体（全真/全假/夜晚）可能掏出不可达分支的空 text（jpHide 工厂空 failText）——降为 W 人工核对，勿当 E。

## 人工验收单（真需要人眼的活，模板）

图片内容正确性 / 布局观感（溢出、手机端收缩）/ 特效观感（暗角、雨、丧尸剪影）/ 手势体感（查看器缩放拖拽）/ 节奏感（打字机、QTE松紧）。

生成给用户的任务单格式：
```
## 人工验收单
1. [场景] 建平-弘渊楼-1F-借阅处 —— 看图是否贴合"借阅处长台面"描述
   快速到达：node 起服务后浏览器 console 执行
   currentScene = "建平-弘渊楼-1F-借阅处"; renderScene(currentScene, true);
2. ...
```
（headed 现场：`launchGame({headless:false})` + `teleport` + `keepOpen()`，或直接给用户 console 片段。）

## 维护

- lint_story 新增检查项 → 同步更新本文件 L1 节
- test_helper 新增 API → 同步更新 L4 节代码示例
- 踩到新坑 → 追加进坑点清单（带日期）
