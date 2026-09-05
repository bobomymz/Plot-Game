---
name: project-rules
description: 尸潮笔记项目强制规则 — 重新注入硬性约束，用于长对话防止规则遗忘。
---

# SKILL.md — Project Mandatory Rules
> Usage: `/skill project-rules`
> 作用：重新注入项目强制约束，用于长对话防止规则遗忘
> 只包含硬性强制要求，不含冗余解释。

## 输出格式与排版强制要求
- 剧情文本 `text` 内禁止写 `\n\n`（空行）。
- `text` 与选项文字里的引号必须用中文引号 `“”`。
- 剧情描述和选项文字禁止剧透。
- 开放式场景选路，选项必须用绝对方位词（"往北走"），禁止相对方位词（"继续走""往回走"）。
- 引擎渲染前会自动打乱选项顺序，编写剧情禁止依赖选项在数组中的物理位置。

## 代码编写 & 审查强制约束
- 所有变量（`condition` 表达式、`set`/`add`/`mul`、`text` 插值 `{变量名}` 中出现）必须先注册到 `story/core.js` 的 `_variables`，否则条件静默失效（报 ReferenceError）。
- 效果对象禁止写 2 个及以上 `set`/`add`/`mul` 操作符；同类赋值必须合并进同一个 `{}`。
- `computed` 派生变量禁止用 `effect.set/add` 修改；禁止 computed 之间互相依赖。
- 响应式规则 `_reactive.rules` 每条 `id` 必填且唯一。
- `showCondition` 控制可见性（不满足则不显示）；`condition` 控制执行结果（不满足必须提供 `elseScene`）。道具解锁用 `showCondition` 或 `condition`+`elseScene`。
- 拾取非交通工具/背包/个人记忆物品：必须同时 `set: { hasXxx: true }` + `add: { itemCount: 1 }`；交通工具、背包不占 `itemCount`。
- 获取占背包物品前，必须检查 `itemCount < bagVolume`，否则走 `elseScene: "整理整理"`。
- 全图唯一物品出现在 2+ 地点时，每点必须加 `showCondition: "!hasX"`（或 `condition: "!hasX"` + elseScene）；禁止用 `_visit` 或一次性 flag 守卫同种物品。
- 开放式场景物品/事件必须加守卫（`!hasXxx` / `!visitXxx` / `condition: "!hasXxx"`+elseScene / 时间条件 `dd <= N`）。
- 输入型选项的 `condition` 只在提交时求值，可见性只由 `showCondition` 控制。
- 场景级 `qte` 与选项级 `timeout` 互斥，字段名不同（`onTimeout` vs `timeoutScene`），禁止混淆。
- `flashStatusWarning` 只用于非剧情自动变化（饥饿/疲劳/尸潮等级）；剧情 `choices`/`onEnter` 的 effect 禁止调用它。
- `updateTime()` 直接改 `gameState` 并返回 `extraEffect`（用于推进游戏时间）。

## 项目命名、路径、文件规范
- 新剧情：新建 `story/xxx.js`，用 `Object.assign(storyData, { ... })` 添加场景。
- 新增 `story/*.js` 必须在 `index.html` 剧情数据区加 `<script>` 标签，且必须在 `engine.js` 之前。
- 新地点在 `images/` 下建对应目录；AI 只写 `images/placeholder.png` 占位，图片由用户生成。
- 直接放在 `images/` 根目录的图（如 `zombieKnockYouDown`）为全局可用图，无视地点场景。

## 工具调用规范（省 token，长对话防漂移）
- 浏览器验证剧情跳转/flag/选项：优先 `evaluate_script` 返回紧凑 JSON（当前场景、选项文字、关键变量——游戏状态全在全局 `gameState`），禁止惯性 `take_snapshot`（整棵 a11y 树，数 k token/次）。
- 点击选项可用 `evaluate_script` 直接触发 `button.click()`，省去先 snapshot 拿 uid。
- 确需快照/截图时，用 `filePath` 参数落盘，再按需局部读取，不整份进上下文。
- `take_screenshot` 仅用于确认视觉效果（图片加载/遮罩/布局）。
- 读 `story/*.js`、engine.js：先 Grep 定位（场景 ID/变量名/函数名），再 Read 带 offset/limit 局部读；仅小文件或需通览结构时才整读。
- 本会话已 Read 过的文件禁止重读（Edit/Write 自带校验）。
- 大范围清点/扫描交给 Explore 子代理，只取结论不吞文件内容。

## 思考与推理必须遵守的规则
- 多门建筑：进出选项直接写门名（"去食堂侧门"），禁止"出门（金苹果广场）"括号式。
- 记忆闪色成功后必须落到"打赢"战斗结果节点，禁止直接跳地点（地点文本不叙述战斗）。
- 环境叙事用 Day 1-5 数日尺度（薄灰/干涸/发蔫），禁止暗示数周/月（杂草/锈蚀/茶渍发黄）。
- 引用 NPC 行动规律/去向/身份前，玩家必须先与之交互（`_visit['场景'] > 0` 门控）。
- 新增开放区域（currentArea）必须同步在"天黑必须过夜"补过夜选项，否则玩家被兜底"街头过夜"。
- "回X楼"表述：房间在 X 楼写"回 X 楼走廊"；占位房间（jpRoom）用"离开"；多入口节点用"去"不用"回/退回"。
- 高速网络：以立交桥为节点，地面相连选项用"下高速"模糊表述，禁止提示高速玩家下面有什么。

## 回答、文档生成硬性约束
- 生成剧情/选项文字时，必须同时满足上面"输出格式"与"叙事规则"：不剧透、中文引号、绝对方位词、数日环境尺度、NPC 知识门控。
- 新增剧情/区域不得引入上述违规表述。

## 禁止行为清单
- 禁止：不注册变量就在 `condition`/`text`/`effect` 中使用。
- 禁止：一个效果写多个 `set`/`add`/`mul` 操作符。
- 禁止：`effect.set/add` 改 computed 变量；computed 互相依赖。
- 禁止：用 `_visit`/一次性 flag 守卫全图唯一物品。
- 禁止：选项用相对方位词。
- 禁止：`text` 写 `\n\n`、用非中文引号。
- 禁止：剧情/选项剧透。
- 禁止：剧情 effect 调用 `flashStatusWarning`。
- 禁止：高速/地面相连场景提示桥下内容。
- 禁止：新区域漏掉过夜分支。
