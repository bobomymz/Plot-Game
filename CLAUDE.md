# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
本文件是**查找索引**；具体规范已拆分到 `docs/` 三本手册与 `.claude/skills/`（见「文档地图」）。

## Overview

**尸潮笔记** — 纯前端中文互动小说/丧尸末日生存游戏。零依赖，无构建步骤，打开 `index.html` 即可运行。

## Running

```powershell
# 直接浏览器打开即可运行
start index.html
# 或
explorer index.html
```

没有构建、打包、测试或依赖安装步骤。修改任意 `.js`/`.css`/`.html` 后刷新浏览器即可看到效果。

## 信息索引（先读这节）

**元规则：一切以实际运行代码为准。** 发现文档与 engine.js 或 story 数据不一致时，
是文档过时了——去改文档，不要迁就文档。尤其"引擎支不支持某写法"，读 engine.js 判定，别信文档断言"不支持"。

### 权威层级（矛盾时谁赢）
1. **engine.js** —— 渲染/结算的"事实"（决定系统实际怎么跑）。
2. **story/*.js 实际数据** —— 剧情内容、跳转、结局、已落地设定。
3. **CLAUDE.md 约定（含本索引指向的 `docs/` 手册）** —— 写新内容必须遵守的规范；与已有实现冲突 → 按规范改（旧实现算遗留债）。
4. **设计细节.md** —— 路网/立交/出城等规划性设定；已实装的以代码为准。
5. **人物档案.md** —— NPC 人设、去向、关系；未实装部分仅作参考。
6. **核心设定3.0.md** —— 世界观顶层设定（核心设定系列以 3.0 为准，勿被 .md / 2.0 旧版干扰）。
7. **各 story 文件顶部注释** —— 该文件"想做什么"的速览，可能滞后。
> 例外：CLAUDE.md 明确写"以 X 为准"的子主题，X 更高（如高速路网→设计细节.md）。

### 文档地图

| 文档 | 定位 |
|---|---|
| `docs/引擎语法手册.md` | **引擎支持什么写法**：场景字段语法速查、选项、条件系统+变量注册、效果、QTE、输入框、`_lastScene`、分段文本、正文/选项 HTML 标记（语义 class）、记忆闪色、屏幕特效、图片查看器、黑暗光锥、z-index |
| `docs/剧情写作规范.md` | **怎么写剧情**：游戏状态变量表、showCondition vs condition 最佳实践、物品/背包/武器耐久/战斗体力/整理整理/日记本/疲劳、添加新剧情步骤、叙事与表述约定、测试 |
| `docs/环境与运维.md` | git 自动推送定时任务、代理配置 |
| `设计细节.md` / `人物档案.md` / `核心设定3.0.md` | 世界观与规划设定（层级见上） |
| `.claude/skills/*/SKILL.md` | 专项工作流：story-testing（测试）、puzzle-chain-design（解密链）、area-story-design（新区域）、geo-optimization（图审计）、text-markup（剧情文本视觉标记）等 |

### 查什么 → 去哪
| 想知道/想做 | 去 |
|---|---|
| 引擎写法：场景字段/条件/QTE/输入框/闪色/分段文本/正文上色标记/图片查看器/黑暗光锥/z-index | `docs/引擎语法手册.md` → 拿不准再读 engine.js |
| 设计规范：变量表/物品与背包/守卫最佳实践/武器耐久/战斗体力/日记本/疲劳/新机制（感冒/户外/冷兵器分级） | `docs/剧情写作规范.md` + utils.js 对应节 |
| 新增剧情文件/场景/图片的步骤 | `docs/剧情写作规范.md`「添加新剧情」 |
| 硬性红线完整清单（长对话防遗忘） | `/skill project-rules` |
| 某 flag/物品是否已定义、初始值、全图唯一 | core.js `_variables` |
| 某物品在哪拿/被用 | grep `hasXxx` 全 story/；一键盘点：`node tools/chain_audit.mjs`（拾取/移除/引用矩阵 + 每文件物品预算表） |
| computed/每小时规则/屏幕特效/全局触发器 | core.js `_reactive` / `_screenEffects` / `_globalTriggers` |
| 工具函数/工厂用法（updateTime/timeImage/travelScene/initMemoryGame/hasMeleeWeapon/combatDrain…） | utils.js（函数旁注释即文档） |
| 改/查代码的工具选择：**优先 Serena 符号工具**（find_symbol/find_referencing_symbols/replace_* 等），勿默认用自带 Read/Edit/Grep | `docs/环境与运维.md`「Serena MCP」节 |
| 某区域剧情/场景结构 | 对应 story 文件 + 顶部注释 |
| 路网/立交/出城衔接 | 设计细节.md |
| NPC 人设/去向 | 人物档案.md + 对应场景 |
| 世界观顶层设定 | 核心设定3.0.md |
| 结局节点规范 | grep `"结局-`（core.js 已归一次） |
| 地理结构优化/图审计（区域重构流程、指标红线） | `.claude/skills/geo-optimization/SKILL.md` + `node tools/graph_audit.mjs <区域>` |
| 剧情测试/走查（L1 lint·L4 E2E helper·坑点清单·无截图原则） | `.claude/skills/story-testing/SKILL.md` + `node tools/lint_story.mjs` / `tools/test_helper.mjs` |
| 解密链设计/优化（难度杠杆分级·已用套路清单·物品预算·方案先行） | `.claude/skills/puzzle-chain-design/SKILL.md` + `node tools/chain_audit.mjs` |
| 新区域整体设计（四阶段编排·区域差异矩阵·入口契约·DoD） | `.claude/skills/area-story-design/SKILL.md` + `node tools/area_check.mjs <区域>`（区域方案落盘 `docs/区域方案-<名>.md`） |
| 剧情文本视觉标记（P2/P3 上色·class 表·配额·markup lint·新增 class 三处同步·inline style/结局行迁移） | `.claude/skills/text-markup/SKILL.md` + `node tools/text_markup_lint.js` / `tools/text_markup_scan.js` |
| 自动推送/git 每小时定时提交 | `docs/环境与运维.md` |

### 新增机制的同步清单
加可复用机制时按需更新：core.js(变量+computed+rule) · utils.js(函数) · engine.js(若改行为) · `docs/引擎语法手册.md` 或 `docs/剧情写作规范.md` 对应节 · 本表对应行。

## 高频红线

最易踩的强制规则（完整清单：`/skill project-rules`；细节展开：两本手册）：

- 新变量必须先注册 `story/core.js` 的 `_variables`（条件字符串、`{插值}`、set/add/mul 全认它），否则条件静默失效。
- 效果对象同类操作符只能写一个：多个 `set`/`add`/`mul` 会互相覆盖，必须合并进同一个 `{}`。
- `text` 禁 `\n\n`；引号一律中文“”；剧情/选项不剧透；选项用绝对方位词（"往北走"），禁"继续走/往回走"。
- 引擎渲染前会打乱选项顺序（Fisher-Yates），勿依赖选项在数组中的物理位置。
- 拿物品 = `set: { hasXxx: true }` + `add: { itemCount: 1 }`，且先查 `itemCount < bagVolume`；交通工具/背包/袋子不占容量。
- `bagVolume` 等 computed 派生值勿 set/add（改 `_bagTier`/`_bagExtra`）；computed 之间勿互相依赖。
- 同一物品多拾取点的守卫用 `!hasX`，勿用 `_visit`/一次性 flag。
- 战斗体力消耗与失败惩罚绝不预告（打完才在结果节点 text 得知）；动作文本点名实际武器（`meleeWeaponName`/`heavyWeaponName`）。
- 新增 `story/*.js` 必须在 `index.html` 的 `engine.js` 之前加 `<script>` 标签。
- 新图引用写 `.webp`（占位用 `images/placeholder.png`，由用户生成正式图）。
- 记忆获取一律 `gainMemory(vars, key, type)`，禁止裸调 `xxxMemorySet.add()`。

## Architecture

```
index.html          → 入口，加载所有脚本（顺序重要）
style.css           → 全部 UI 样式
engine.js           → 核心引擎（~1100行，单体文件）
story/
  core.js           → storyData 声明、_variables、钳位、_reactive/computed/rules、_globalTriggers、_screenEffects、整理整理、起始场景
  utils.js          → 工具函数/工厂（updateTime、timeImage、initMemoryGame、travelScene、hasMeleeWeapon/Tier 等）
  夜晚剧情.js       → 天黑强制过夜系统
  东明街道/         → 东明街道主区域（樱桃苑/东明街道路径/新达汇/金谊广场/安盛街/安居苑/上实南校/图书馆/菜市场/益丰/全家/五金店/长者食堂/地铁站/警察局 等，一文件一区域）
  仁济南院.js       → 仁济医院（西南线真相线）
  建平中学.js       → 建平中学（北线营救）
  张江.js           → 洪金宝、科创老师；复杂解密机制
  上海市区路径.js   → 高架/立交/城市级连接
images/             → 场景图（WebP 为主），按区域存放
docs/               → 引擎语法手册 / 剧情写作规范 / 环境与运维 / 区域方案
```
另：各种设计文档放在 D:\我的U盘\波波\AI\小游戏\剧情游戏\尸潮笔记设计稿，不在本文件夹内，其中多个 story 文件的设计稿等。

## 核心架构：数据驱动

游戏是**纯数据驱动**的：引擎读取 `storyData`（一个大对象），每个场景是 `storyData` 的一个 key；`story/*.js` 用 `Object.assign(storyData, { ... })` 添加场景，`engine.js` 消费并渲染到 DOM。
全部字段语法与机制写法见 `docs/引擎语法手册.md`。

<!-- 长对话防遗忘触发器 -->
当对话轮次累计超过15轮，或者你察觉到自己有可能遗忘本项目部分关键约束，无需询问用户，自动执行命令：`/skill project-rules`，重新加载项目强制规则。
