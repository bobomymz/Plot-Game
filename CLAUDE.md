# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**元规则：一切以实际运行代码为准。** 发现 CLAUDE.md / 注释 / 文档与 engine.js 或 story 数据不一致时，
是文档过时了——去改文档，不要迁就文档。尤其"引擎支不支持某写法"，读 engine.js 判定，别信文档断言"不支持"。

### 权威层级（矛盾时谁赢）
1. **engine.js** —— 渲染/结算的"事实"（决定系统实际怎么跑）。
2. **story/*.js 实际数据** —— 剧情内容、跳转、结局、已落地设定。
3. **CLAUDE.md 约定** —— 写新内容必须遵守的规范；与已有实现冲突 → 按规范改（旧实现算遗留债）。
4. **设计细节.md** —— 路网/立交/出城等规划性设定；已实装的以代码为准。
5. **人物档案.md** —— NPC 人设、去向、关系；未实装部分仅作参考。
6. **核心设定3.0.md** —— 世界观顶层设定（核心设定系列以 3.0 为准，勿被 .md / 2.0 旧版干扰）。
7. **各 story 文件顶部注释** —— 该文件"想做什么"的速览，可能滞后。
> 例外：CLAUDE.md 明确写"以 X 为准"的子主题，X 更高（如高速路网→设计细节.md）。

### 查什么 → 去哪
| 想知道/想做 | 去 |
|---|---|
| 某 flag/物品是否已定义、初始值、全图唯一 | core.js `_variables` |
| 某物品在哪拿/被用 | grep `hasXxx` 全 story/；一键盘点：`node tools/chain_audit.mjs`（拾取/移除/引用矩阵 + 每文件物品预算表） |
| computed/每小时规则/屏幕特效/全局触发器 | core.js `_reactive` / `_screenEffects` / `_globalTriggers` |
| 引擎支持的条件/QTE/闪色/输入框写法 | CLAUDE.md 数据格式节 → 拿不准再读 engine.js |
| 工具函数/工厂用法（updateTime/timeImage/travelScene/initMemoryGame/hasMeleeWeapon/combatDrain…） | utils.js（函数旁注释即文档） |
| 武器耐久规则/新战斗或撬砸节点怎么挂损耗/战斗体力消耗 | CLAUDE.md「武器耐久」「战斗体力消耗」节 + utils.js 对应节 |
| 某区域剧情/场景结构 | 对应 story 文件 + 顶部注释 |
| 路网/立交/出城衔接 | 设计细节.md |
| NPC 人设/去向 | 人物档案.md + 对应场景 |
| 世界观顶层设定 | 核心设定3.0.md |
| 结局节点规范 | grep `"结局-`（core.js 已归一次） |
| 图片查看器（`imageZoom` 标记/🔍角标/缩放平移/QTE 协同） | CLAUDE.md「图片查看器」节 + engine.js「图片查看器」节 |
| 新机制（感冒/户外/疲劳/冷兵器分级） | 见下方各处，勿只看一处 |
| 地理结构优化/图审计（区域重构流程、指标红线） | `.claude/skills/geo-optimization/SKILL.md` + `node tools/graph_audit.mjs <区域>` |
| 剧情测试/走查（L1 lint·L4 E2E helper·坑点清单·无截图原则） | `.claude/skills/story-testing/SKILL.md` + `node tools/lint_story.mjs` / `tools/test_helper.mjs` |
| 解密链设计/优化（难度杠杆分级·已用套路清单·物品预算·方案先行） | `.claude/skills/puzzle-chain-design/SKILL.md` + `node tools/chain_audit.mjs` |
| 新区域整体设计（四阶段编排·区域差异矩阵·入口契约·DoD） | `.claude/skills/area-story-design/SKILL.md` + `node tools/area_check.mjs <区域>`（区域方案落盘 `docs/区域方案-<名>.md`） |

### 新增机制的四处同步清单
加可复用机制时按需更新：core.js(变量+computed+rule) · utils.js(函数) · engine.js(若改行为) · 本表对应行。

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
  上海市区路径.js   → 高架/立交/城市级连接
images/             → 场景图（PNG/JPG），按区域存放
```
另：各种文档放在 D:\我的U盘\波波\AI\小游戏\剧情游戏\尸潮笔记设计稿，不在本文件夹内 ，其中多个story文件的设计稿等。

## 核心架构：数据驱动

游戏是**纯数据驱动**的：引擎读取 `storyData`（一个大对象），每个场景是 `storyData` 的一个 key。

| 部分           | 职责                                           |
| ------------ | -------------------------------------------- |
| `story/*.js` | 用 `Object.assign(storyData, { ... })` 添加场景数据 |
| `engine.js`  | 消费 `storyData` 并渲染到 DOM                      |

### 场景数据格式

每个场景是一个对象，可以有以下字段。注意各字段支持的语法形式不同：

```javascript
"场景ID": {
  // -- 必填 --
  image: "images/path.png",          // 静态字符串，或函数 (vars) => string
  text: "剧情文字，支持 {变量名} 插值", // 静态字符串、字符串数组（分段显示，见「分段文本」节），或函数 (vars) => string/数组
  // -- 可选 --
  style: "color: red;",              // 直接作用在文本容器上的 CSS（字符串或对象形式）
  imageZoom: true,                   // 标记本场景图可点击放大查看（带 🔍 角标），未标记的图点击无反应
  onEnter: { set: {x:1}, add: {y:1} }, // 静态效果对象，或函数 (vars) => 效果对象
  choices: [ ... ]                   // 选项数组，或函数 (vars) => 选项数组（见下）
}
```

注：大部分情节仍在迭代中，存在image不正确、text缺失、跳转情节不存在等问题

### 每个字段支持的语法速查

| 字段                 | 纯字符串         | `{变量名}` 插值 | 函数 `(vars) =>` | 备注                                           |
| ------------------ | ------------ | ---------- | -------------- | -------------------------------------------- |
| `image`            | ✅            | ❌          | ✅ 返回路径字符串      | `timeImage({...})` 是工具函数，在 story 中静态求值       |
| `text`             | ✅ 或字符串数组   | ✅          | ✅ 返回字符串/数组   | 数组=同节点内分段显示（见「分段文本」节）；函数返回值**仍会**做 `{变量名}` 插值 |
| `style`            | ✅ 直接 CSS     | ❌          | ❌              | 也支持对象 `{fontSize:"18px"}`（camelCase→kebab）   |
| `onEnter`          | ❌            | ❌          | ✅ 返回效果对象       | 也支持静态对象 `{set:{}, add:{}, mul:{}}`           |
| `choices`          | ❌            | ❌          | ✅ 返回选项数组       | 函数形式可用于动态生成选项                                |
| `qte`              | ❌            | ❌          | ✅ 返回 QTE 对象    | 支持静态对象 `{timeout, onTimeout, hidden}`，也支持函数 |
| 选项 `text`          | ✅            | ✅          | ✅ 返回字符串      | 同剧情 `text`：函数返回值**仍会**做 `{变量名}` 插值            |
| 选项 `nextScene`     | ✅            | ✅          | ✅ 返回场景 ID 字符串  | 三种形式都支持                                      |
| 选项 `elseScene`     | ✅            | ✅          | ✅ 返回场景 ID 字符串  | 同 nextScene                                  |
| 选项 `condition`     | ✅ 表达式        | ❌          | ✅ 返回 bool      | 也支持布尔值和比较对象（见条件系统）                           |
| 选项 `showCondition` | ✅ 表达式        | ❌          | ✅ 返回 bool      | 同 condition                                  |
| 选项 `effect`        | ❌            | ❌          | ✅ 返回效果对象       | 也支持静态效果对象                                    |
| 选项 `timeout`       | ✅ **JS 表达式** | ❌          | ❌              | 字符串如 `"5000 - x * 2000"` 用 `new Function` 求值 |
| 选项 `timeoutScene`  | ✅            | ✅          | ✅              | 同 nextScene                                  |

### 选项格式

**注意：** 引擎会在渲染前自动**打乱选项顺序**（Fisher-Yates shuffle），防止玩家形成肌肉记忆。编写剧情时不要依赖选项在数组中的物理位置。

```javascript
{
  text: "选项文字",               // 支持 {变量名} 插值，也支持函数 (vars) => 字符串
  nextScene: "目标场景ID",        // 字符串（支持{变量名}插值）、函数(vars) => string
  effect: { set: {...} },       // 静态对象或函数(vars) => 效果对象
  condition: "表达式",           // 见条件系统（可选）
  elseScene: "不满足时跳转",      // 同 nextScene（可选）
  showCondition: "表达式",       // 同 condition（可选）
  // 输入框选项（替代普通按钮）：
  input: {
    match: "正确值",             // 比对密码，也支持函数：function(vars, input) { return boolean; }
    placeholder: "提示文字",      // 输入框占位符（可选）
    matchVar: "变量名",           // 把输入值存入 gameState（可选）
    wrongScene: "错误跳转",       // 不匹配 match 时跳转（可选）
    maxLength: 6                  // 输入最大长度（可选）
  },
  // QTE 选项：
  timeout: 5000,                 // 倒计时(ms)，支持 JS 表达式字符串
  timeoutScene: "超时跳转"       // 同 nextScene
},
```

**选项 `text` 的动态写法**（与剧情 `text` 一致，引擎 `resolveChoiceText` 支持）：

```javascript
// {变量名} 插值 —— 渲染时替换为 gameState 当前值（支持 _display 格式化）
{ text: "继续（当前体力 {strength}）", nextScene: "xxx" }

// 函数形式 —— 动态生成文字，返回值仍会做 {变量名} 插值
{
  text: function(vars) {
    return vars._visit['某场景'] > 0 ? "再次查看（体力 {strength}）" : "第一次查看";
  },
  nextScene: "xxx"
}
```

### 条件系统（`condition` / `showCondition`）

支持四种形式，按优先级：

1. **布尔值** — `true` / `false`
2. **函数** — `function(vars) { return vars.itemCount > 0; }`
3. **字符串表达式** — `"hasBroom && strength > 3"`（内部用 `new Function()` 求值）
4. **比较对象** — `{ itemCount: { ">=": 1 }, strength: { "<": 5 } }`
   - 支持的运算符：`>=`、`<=`、`>`、`<`、`!=`、`==`
   - 直接值表示严格等于：`{ hasBroom: true }`

### ⚠️ 重要：所有变量必须先在 `_variables` 中定义

引擎用 `new Function(...keys, \`return Boolean(${condition});\`)` 求值条件字符串，
其中 `keys` 来自 `Object.keys(gameState)`。这意味着：

- 字符串表达式中出现的**所有变量名**（如 `hasBroom && strength > 3` 中的 `hasBroom` 和 `strength`）
- `set` / `add` / `mul` 效果中**赋值的所有变量名**
- `text` 插值中的 `{变量名}`

都必须先在 `story/core.js` 的 `_variables` 中声明初始值，否则 `new Function` 执行时
会抛 `ReferenceError`（被 catch 吞掉后条件返回 false，控制台可见报错）。

**添加新剧情变量时务必同步注册到 `_variables`**，否则会出现"条件明明写对了但就是走不通"的情况。

### showCondition vs condition 最佳实践

两者的核心区别：

| <br /> | `showCondition`  | `condition`          |
| ------ | ---------------- | -------------------- |
| 控制     | 选项**可见性**        | 选项**执行结果**           |
| 不满足时   | 选项不显示            | 跳转 `elseScene`（必须提供） |
| 适用场景   | "没这个道具就不该看到这个选项" | "选项一直可见，但有/无道具有不同结果" |

**3条黄金法则：**

1.\*\*运用道具解锁剧情 → 用 `showCondition` 或者 `condition` + `elseScene` \*\*
  ````markdown
  ```javascript
  // 第一种情况，选项高度依赖道具：「用铁管撬开门」——没铁管的人根本不会去撬门，选项不该出现
  { text: "用铁管撬开门", showCondition: "hasIronPipe", nextScene: "门开了" }
  // 还有一种情况，这个解密选项的text表述上不一定需要道具，比如“砸开门”，但是需要道具才能成功执行
  { text: "砸开门", condition: "hasIronPipe", nextScene: "门开了", elseScene: "门没开，手好痛" }
  // 另外，这两个情况完全可以同时存在。前者解决是否有道具的问题，后者解决道具某些状态是否可靠的问题（比如剩余使用次数），可以参考上实南校.js中的防毒面具剧情
  ```
  ````
  这是两种设计：第一种是选项高度依赖道具，第二种是选项不依赖道具，选项一直可见，但是执行结果不同。第二种更阴险，如果条件允许，尽量调整text，运用第二种设计来坑玩家。
  
2.**捡拾非交通工具、特殊道具（如背包）、个人记忆等**物品 → 初次捡拾用 `condition:itemCount < bagVolume` + `elseScene: "整理整理"`\*\*，回到同一场景用`condition: !has物品` + `elseScene: "这里是空的"`

  - 注意，使用`condition: !has物品`的前提是这个物品在同一个开放区域内只出现1次，且不允许重复拾取

  ```javascript
  "地点A": {
      text: "你来到了地点A。",
      choices: [
        {
          text: "查看柜子",
          condition: "!hasIronPipe",
          nextScene: "发现铁管",
          elseScene: "这里是空的" // 防止开放式场景反复刷物品
        }
      ]
  },
  "发现铁管": {
    text: "你发现了一根铁管。",
    onEnter: { set: { positionAfterOperation: "发现铁管" } }, // 如果要先整理，整理完会跳回发现铁管场景
    choices: \[
      {
        text: "捡起铁管",
        condition: "itemCount < bagVolume",
        nextScene: "新场景",
        effect: { set: { hasIronPipe: true }, add: { itemCount: 1 } },
        elseScene: "整理整理" // 此节点强制要求玩家丢弃物品直到itemCount<=bagVolume
      },
    ]
  }
  // 剧情节点设计
  ```

3.捡拾交通工具 → 一般用 `showCondtion: "has某个交通工具"`  `condition: "hasNoTransportation"` + `elseScene: "整理整理"`，但涉及道具解锁情节会更加复杂

```javascript
// 典型案例
"三林安居苑-自行车": {
 image: "images/anJuYuan/rustyBike.png",
 text: "……",
 choices: [
   {
     showCondition: "hasNoTransportation",
     text: "试试骑一下",
     condition: "hasLubricant", // 需要用【润滑油】解锁
     nextScene: "三林安居苑-喜提新车",
     effect: {set: {hasLubricant: false, hasRustyBike: true}, add: {itemCount: -1}}, // 注意自行车不占背包容量
     elseScene: "三林安居苑-骑车失败"
   },
   {
     showCondition: "!hasNoTransportation", // 两种情况分类讨论
     text: "先丢下已有的车",
     nextScene: "整理整理",
     effect: {set: {positionAfterOperation: "三林安居苑-自行车"}}
   },
   {
     text: "算了",
     nextScene: "三林安居苑-小区内部"
   }
 ]
},
```

**开放式场景守卫三件套：** 玩家可以自由往返的场景，物品/事件需要防止重复触发。

| 守卫方式                                          | 适用场景               | 示例                                                         |
| :-------------------------------------------- | :----------------- | :--------------------------------------------------------- |
| `showCondition: "!hasXxx"`                    | 唯一道具，拿了就消失         | `"查看柜子", showCondition: "!hasIronPipe", nextScene: "发现铁管"` |
| `showCondition: "!visitXxx"`                  | 一次性事件（不论是否捡到东西）    | `"查看被藤蔓缠住的丧尸", showCondition: "!fightWithVineZombie"`      |
| `condition: "!hasXxx"` + `elseScene: "这里没东西"` | 选项永远可见，但捡过后告诉你"空了" | `"翻找抽屉", condition: "!hasCutter", elseScene: "抽屉已经空了"`     |
| `dd <= N` 等时间条件                               | 有限刷新补给点            | `showCondition: "dd <= 2 && !hasBiscuit"`—Day3后即使没拿过也不再刷新  |

第四种 `condition: "!hasXxx"` 介于前两种之间：玩家永远能看到"翻找抽屉"这个选项，但点进去发现已经空了，比选项直接消失更自然。

**例外：** 体力/属性作为门槛时，通常用 `condition` + `elseScene`（替代/死亡），因为玩家应该看到选项并自己判断能否承担后果。

### 效果系统（effect / onEnter）

支持3种操作，按顺序执行：

```javascript
{
  set: { variableName: value, positionAfterOperation: "场景x" },   // 直接赋值
  add: { strength: -1 },          // 加减
  mul: { chasedByZombies: 2 }     // 乘法
  // 警告：不要写2个及以上的set/add/mul操作，否则会导致前面的操作符被后面相同的操作符覆盖，必须合并到一个操作符中{}。
  // 例如：{ set: { variableName: value, positionAfterOperation: "场景x" } }而不是{ set: { variableName: value }, set: { positionAfterOperation: "场景x" } }
}
```

也支持函数：function(vars) { return { add: { strength: -1 } }; }，必须返回一个effect类型变量，空的{}也可以。

每次效果后自动执行：钳位 → 响应式规则 → 再钳位。

### 显示格式化（`_display`）

`{变量名}` 插值时可通过 `_display` 映射表格式化显示值，不影响原始数据：

```javascript
_display: {
  strength: function(v) { return fmtStrength(v); },  // 体力保留1位小数显示（fmtStrength 见 utils.js）
}
```

引擎在插值替换时查 `_display` 表，有则调用格式化函数，无则直接显示原值。这是一个通用机制，任何变量都可注册显示格式器。
**体力显示约定**：给玩家看的体力数字一律保留1位小数（"7.0"）——剧情 `{strength}` 插值走 `_display` 自动生效；手写 flashStatusWarning 弹窗字符串时用 `fmtStrength(v.strength)`，别用 `Math.round`，否则显示不一致。

### 时间系统

`updateTime(addMinutes, extraEffect)` 是一个**高阶函数**：

```javascript
// 直接使用（自动返回 effect 函数）：
onEnter: updateTime(15)                               // 时间推进15分钟
onEnter: updateTime(15, { add: { strength: -1 } })   // 推进时间 + 扣1体力
```

- 游戏时间：`dd`（天）、`hh`（小时）、`mm`（分钟），24小时制
- 派生变量：`gameMinutes`（总分钟数）、`isNight`（`hh >= 20 || hh < 6`）
- 响应式规则：按间隔自动 -1 体力（饥饿系统：健康约2h扣1，受伤约1h扣1，感冒80min，感冒+受伤30min——见 `minutesBetweenReduceStrength`）

### 全局触发器（`_globalTriggers`）

```javascript
_globalTriggers: [
  { condition: "strength <= 0", targetScene: "体力耗尽猝死", priority: 1 },
  // priority 越高越优先检查
]
```

### 派生变量（`_reactive.computed`）

`computed` 是**只读派生变量**：每次状态变更后（`applyEffect` 末尾），引擎把所有 computed 键重新求值并直接写入 `gameState`，供后续使用。

```javascript
computed: {
  // 字符串表达式（推荐，只依赖 _variables 基础变量）
  gameMinutes: "((dd - 1) * 1440 + (hh - 8) * 60 + mm)",
  isNight:     "hh >= 19 || hh < 6",
  // 函数形式（v 是 gameState，可调用 utils.js 里的全局工具函数）
  hasNoTransportation: function(v) { return hasNoTransportation(v); }
}
```

**与 `_variables` 的区别：**

| <br /> | `_variables` | `computed` |
|---|---|---|
| 是否注册初始值 | ✅ 必须 | ❌ 不需要（注册了也会被覆盖）|
| `condition`/`text` 插值能否使用 | ✅ | ✅ 完全相同 |
| 能否被 `effect.set/add` 修改 | ✅ | ⚠️ 能写但**立刻被重算覆盖**，禁止 |
| 存持久状态 | ✅ | ❌ 每次状态变更都重算 |

**使用要点：**

- `condition` 字符串表达式、`text` 插值 `{变量名}`、`showCondition`、`triggerKey` 都能直接用 computed 变量——因为求值和插值都查 `gameState`，而 computed 已写入其中。
- **绝不要用 `effect.set/add` 改 computed 变量**——它是按公式派生的，改完立刻被 `applyReactive` 重算覆盖。要存持久值，用 `_variables` 里的普通变量。
- computed **不需要（也不能）** 在 `_variables` 里注册初始值。`gameState` 初始没有这些键，第一次 `applyReactive()` 才写入（正常游玩中每次状态变更都会重算，所以一定存在）。
- 函数形式 `function(v) { return canSee(v); }` 中 `v` 是 `gameState`，可直接调用 `story/utils.js` 里定义的全局工具函数。
- ⚠️ **computed 之间不要互相依赖**——求值按对象字面量顺序，A 依赖 B 而 B 在后面时，A 读到的是旧值。只依赖 `_variables` 基础变量最安全。

### 响应式规则（`_reactive.rules`）

规则字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一 ID（必填，缺省报错） |
| `condition` | 表达式/函数 | [可选] 满足时才可能触发。**省略时视为恒满足，且引擎不会清空其节流记录**——适合"键值回落时也需要触发"的场景（如 travel-fatigue：休息归零 `_travelMinutes` 后，规则要在 tier→0 跳变上清 `_fatiguePaid` 台账） |
| `triggerKey` | 表达式 | 节流：相同值不重复触发 |
| `effect` | 对象/函数 | 触发时执行的效果。**函数形式可返回一个值**（见下） |
| `onTrigger` | 函数 | [可选] 效果执行后调用的副作用回调，签名 `(gameState, rule, effectResult)` |

```javascript
rules: [
  {
    id: "starvation",                     // 唯一ID
    condition: "gameMinutes > 0",
    triggerKey: "Math.floor(gameMinutes / 60)",  // 相同值不重复触发（节流）
    effect: { add: { strength: -1 } },
    onTrigger: function(v) { flashStatusWarning("⚠ 体力 -1（饥饿）· 剩余 " + Math.round(v.strength)); }
  }
]
```

#### `onTrigger` 与 effect 返回值（概率性规则判断"是否真正生效"）

`effect` 是**对象**时，触发即必然改状态，`onTrigger` 无条件提示即可。但 `effect` 是**函数**且内部有概率判断（如"25% 概率 +1 追击等级"）时，规则触发不一定真的改了状态——此时让 effect 函数**返回布尔值**表示"是否实际上升"，`onTrigger` 通过第三个参数 `effectResult` 判断是否提示：

```javascript
{
  id: "cat-chase",
  condition: "_catChasing && currentPlace.indexOf('新达汇') >= 0",
  triggerKey: "Math.floor(gameMinutes / 3)",
  effect: function(v) {
    if (Math.random() < 0.25) {
      v.chasedByZombies = Math.min(5, v.chasedByZombies + 1);
      return true;   // 追击等级实际上升
    }
    return false;
  },
  onTrigger: function(v, rule, rose) {
    if (rose) flashStatusWarning("⚠ 尸潮逼近 · 尸潮等级 " + v.chasedByZombies);
  }
}
```

- `onTrigger` 只在 `effect` 执行后调用（无论 effect 是否真的改了状态），是否提示由你在回调里自行判断。
- 对象型 `effect` 的 `effectResult` 恒为 `undefined`（第三个参数无意义）。
- 现有规则（`starvation` / `travel-fatigue` 等）的 `onTrigger` 只声明 `function(v)`，多传的参数被忽略，向后兼容。

#### `flashStatusWarning`：非剧情自动变化的提示

引擎内置全局函数 `flashStatusWarning(message)`，弹出顶部浮层 toast（约 2 秒后淡出，元素 `#status-warning`）。用于**非剧情原因**的自动状态变化提示——如"体力随时间下降"（饥饿/疲劳）和"尸潮等级自动上升"（变异猫追击/仁济医院尸潮围拢）。

剧情原因（`choices`/`onEnter` 里的 effect）**不应**用它提示——玩家能从选项文字直接得知，重复提示反而烦人。

### QTE（快速事件）

QTE 有两种层级：**场景级**（整个节点倒计时）和**选项级**（单个选项倒计时）。两者字段名不同，**不要混淆**：

| 层级 | 声明位置 | 超时跳转字段 | 隐藏进度条 |
|------|---------|------------|-----------|
| 场景级 `qte` | 场景对象上 | `onTimeout` | `hidden: true` |
| 选项级 | 选项上 | `timeoutScene` | ❌ 不支持 |

#### 场景级 QTE（`qte` 字段）

直接写在场景对象上，**进入场景即开始倒计时**，超时自动跳转 `onTimeout`。如东明街道的十字路口节点：

```javascript
"东明路-三林路": {
  qte: {
    timeout: "8000 - chasedByZombies * 2000",  // 计时(ms)，支持 JS 表达式字符串
    onTimeout: "结局-丧尸的围殴",               // 超时跳转的场景（支持 {变量名} 插值）
    hidden: false                              // 可选：true 隐藏进度条（无声倒计时）
  },
  text: "……",
  choices: [ ... ]
}
```

| 字段 | 说明 |
|------|------|
| `timeout` | 倒计时时长(ms)。数字或 **JS 表达式字符串**（用 `new Function` 求值，如 `"8000 - chasedByZombies * 2000"`） |
| `onTimeout` | **必填**。超时后跳转的场景 ID，支持 `{变量名}` 插值，同 `nextScene` |
| `hidden` | 可选。`true` 时不渲染进度条，但倒计时照常生效——适合"悄无声息逼近的威胁" |
| `typewriter` | 可选。`true` 时该 QTE 场景**保留打字机效果**（文字逐字显示，显示完才启动倒计时）。默认 `false`：跳过打字机、文字一次性全显 |

行为特点：
- 进入场景立即开始倒计时（默认跳过打字机效果、文字和选项直接显示；若 `qte.typewriter` 为 `true` 则走打字机，显示完才启动倒计时）。
- 玩家在超时前点击任意选项会取消倒计时（选项 click 内部调用 `clearQTE()`）。
- 超时后自动 `pushHistory()` 并跳转 `onTimeout`。
- **场景级 `qte` 与选项级 `timeout` 互斥**：存在 `scene.qte` 时选项级倒计时不会启动。
- `qte` 也支持函数形式 `function(vars) { return { timeout, onTimeout, hidden, typewriter }; }`，可动态生成。
- **有 `qte` 的场景不是结局**：走 QTE 分支，即使不写 `choices` 也不会被当作"结局节点"（不会显示"剧终+回溯"）。`typewriter` 过场节点无选项时不显示任何占位，纯自动播放。

#### 过场动画节点（`travelScene` 工厂函数）

`utils.js` 提供了 `travelScene(text, nextScene, options)`，生成"过场动画"节点——文字逐字显示，显示完按字数停留，超时自动跳 `nextScene`。适合在长距离移动的起终点之间插入道路行走、时间流逝等过渡节点：

```javascript
Object.assign(storyData, {
  "前往金谊广场-1": travelScene(
    "你转身向西，沿着三林路朝金谊广场的方向走……",
    "前往金谊广场-2",
    { onEnter: { set: { showRain: true } } }   // 可选：户外场景可加特效/效果
  ),
});
```

| 参数 | 说明 |
|------|------|
| `text` | 过场文字（纯文本或带 HTML） |
| `nextScene` | 显示完后自动跳转的场景 ID |
| `options` | 可选。`{ image, onEnter }`：`image` 场景图；`onEnter` 为 effect 对象或函数（如 `{ set: { showRain: true } }`） |

机制要点：
- 内部用 `qte: { hidden: true, typewriter: true, onTimeout: nextScene }` 实现——隐藏进度条、保留打字机、超时自动前进。
- 停留时长按字数估算：`Math.max(2000, 去 HTML 后字数 * 50)` ms。
- **不生成 `choices` 按钮**，纯自动播放；玩家无法手动跳过（如需可跳过的过场，自行加 `choices`）。

#### 选项级 QTE（`timeout` / `timeoutScene`）

在选项中设置 `timeout` 即可激活倒计时条：

```javascript
{
  text: "快跑！",
  nextScene: "逃跑成功",
  timeout: "5000 - repeatedClickTimes * 2000",  // 支持动态表达式
  timeoutScene: "被丧尸抓住了"                    // 超时后跳转
}
```

引擎会在底部渲染进度条，倒计时归零自动跳转 `timeoutScene`。
若只写 `timeout` 而不写 `timeoutScene`，超时后仅移除该选项、保留其他选项。

### 输入框选项（Input）

选项带上 `input` 字段后，引擎渲染为 **标签文字 + 输入框 + 确认按钮**，替代普通按钮。

`input` 只负责**采集输入**：提交时引擎把输入值（trim 后）写入 `gameState._input`，之后完全走普通按钮的流程——对错判定、分支跳转全部由 `condition` / `elseScene` 表达，引擎没有任何输入专属的判定逻辑。

```javascript
{
  text: "输入密码",                    // 选项文字显示为标签
  input: {
    placeholder: "6位数字",            // 输入框占位符（可选）
    maxLength: 8                      // 输入最大长度（可选）
  },
  condition: { _input: "114514" },    // 用 _input 判断对错，四种 condition 形式都可用
  nextScene: "保险柜开了",             // 满足 → effect + nextScene
  effect: { set: { openedSafe: true } },
  elseScene: "密码错误"                // 不满足 → elseScene
}
```

**行为逻辑：**

```
提交输入
  1. gameState._input = 输入值（每次提交覆盖，不自动清除）
  2. checkCondition(condition)
      ├─ 满足（或没写 condition）→ effect + 跳转 nextScene
      └─ 不满足 → 跳转 elseScene（缺省则 nextScene）
```

**注意事项：**

- 输入型选项的 `condition` 只在**提交时**求值（渲染时 `_input` 还不存在），可见性只由 `showCondition` 控制。
- `_input` 是"最近一次输入"的通用变量，elseScene 目标场景的 text 可以用 `{_input}` 展示玩家输的内容。
- 需要三路以上分支时：把 `nextScene` 写成函数 `function(vars) { return "场景ID"; }` 自由路由。注意 effect 只在 condition 满足时执行，各分支的专属效果应放到目标场景的 `onEnter` 里。

**常用模式：**

```javascript
// 1. 密码锁
{
  text: "请输入6位密码",
  input: { placeholder: "密码", maxLength: 6 },
  condition: { _input: "114514" },
  nextScene: "门开了",
  elseScene: "密码错误"
}

// 2. 函数 condition（自定义比对逻辑，如记忆闪色模糊匹配）
{
  text: "输入你看到的颜色分布",
  input: { placeholder: "例如：3红2蓝" },
  condition: checkFlashAnswer,   // utils.js 提供，比对 _input 与 _currentAnswer
  nextScene: "战斗胜利",
  elseScene: "结局-..."//例如：结局-被丧尸扑倒咬死
}

// 3. 纯记录（存变量，后续场景使用）
{
  text: "输入你的名字",
  input: { placeholder: "名字" },
  effect: function(vars) { vars.playerName = vars._input; return {}; },
  nextScene: "继续剧情"
}

// 4. 道具门槛叠加：答对了还得有道具，坑玩家专用
{
  text: "输入你看到的颜色分布",
  input: { placeholder: "例如：3红2蓝" },
  condition: function(vars) { return vars.hasFlashlight && checkFlashAnswer(vars); },
  nextScene: "战斗胜利",
  elseScene: "没看清就被扑倒了"
}

// 5. 尝试次数限制（用 condition 手动实现，不需要引擎内置）
"密码错误": {
  onEnter: { add: { safeAttempts: 1 } },
  text: "密码错误（{safeAttempts}/3）",
  choices: [
    { text: "再试一次", condition: "safeAttempts < 3",
      nextScene: "保险柜", elseScene: "密码锁已锁定" },
    { text: "算了", nextScene: "三林路" }
  ]
}
```
## 变量

### 游戏状态变量

全部定义在 `story/core.js` 的 `_variables` 中。这里列出剧作者常用的，完整列表见 `_variables`。

| 变量 | 范围/类型 | 说明 |
|------|----------|------|
| **基础数值** | | |
| `strength` | 0–10 | 体力，初始 7。Reactive: 按间隔 -1（饥饿：健康2h/受伤1h）；< 3 → `isWeak` |
| `dd` / `hh` / `mm` | int | Day/Hour/Minute，游戏时间，初始 Day1 8:00 |
| `isWeak` | bool | `strength < 3` 自动置 true（reactive） |
| `hurtByZombie` | bool | 被丧尸抓伤，加快饥饿掉体力节奏 |
| **天气** | | |
| `weather` | `"晴"/"阴"/"雨"` | 雨天 `updateTime` 自动 ×1.3，影响场景文本 |
| `windy` | bool | 是否有风 |
| **尸潮 & 疲劳** | | |
| `chasedByZombies` | 0–5 | 追击等级，5 秒杀。晴天进入户外场景归零（applyWeatherDrain，不分昼夜）。高值影响 QTE 时间、战斗风险 |
| `_travelMinutes` | 0–… | 连续移动累积分钟（>6min 的 `updateTime` 累加）；20/36/48/56/60 五档各 -1 体力（reactive） |
| `_fatiguePaid` | 0–5 | 本段连续移动已扣疲劳档位；里程归零时 travel-fatigue 规则自动清零（2026-09-20 起），剧情勿改 |
| **背包 & 物品** | | |
| `itemCount` | int | 当前物品数 |
| `bagVolume` | int | 背包容量 = `3 + _bagTier + _bagExtra`。**computed 派生值，剧情勿直接 set/add**，改下面两个： |
| `_bagTier` | 0/1/2 | 主背包档位：0=默认背包(3格)、1=双肩包(4格·安居苑203室)、2=书包(5格·建平挹芬楼3F高一教室 / 上实南校1号楼走廊)。**只升不降**，换包是「换」不是「加」 |
| `_bagExtra` | int | 附件加成：帆布袋 +1（`hasBag` 管三处拾取） |
| `hasBag` | bool | 是否有帆布袋（袋子，附件类，非主背包） |
| `hasBackpack` / `hasSchoolbag` | bool | 是否拿过双肩包 / 书包（记录用，不影响容量） |
| `hasXxx` | bool | 物品flag，添加时需同时 `add: { itemCount: 1 }`。交通工具、背包、袋子不占 `itemCount` |
| **记忆系统** | | |
| `gameMemorySet` / `personalMemorySet` | `Set` | 已收集的记忆，`gameMemoryThres`（10）为结局阈值 |

### `_lastScene`：引擎自动记录的上一个场景

引擎在每次渲染场景前，自动把"上一个渲染过的场景 ID"写入 `gameState._lastScene`（初始 `""`）。剧情作者可在目标场景的 `text` 函数里用它写差异化承接句——尤其是**拾取物品后跳转离开场景**时，不想加中间节点，就用它补一句"确认拿到"：

```javascript
"安盛街中段": {
  text: function(vars) {
    var desc = "你走在街上。……";
    if (vars._lastScene === "安盛街-文具店搜刮-快速" && vars.hasCutter) {
      desc += "\n你掂了掂手里的美工刀——带着总比空手强。";
    }
    return desc;
  }
}
```

**使用要点：**

- 必须配合物品 flag 做守卫（如 `&& vars.hasCutter`），因为"空手走人 / 背包满了算了"等选项也会以同样的 `_lastScene` 到达目标场景，但没拿东西。
- 每条 `_lastScene` 分支只在"直接从对应场景过来"时触发，反复进出不会重复刷屏（前提是不回头走原路）。
- 回溯、QTE 超时、全局触发器跳转同样会更新 `_lastScene`（取真实离开的那个场景）。
- 引擎不参与业务逻辑，只负责记账；接不承接、承接什么完全由剧情数据决定。

## 通用方法
### 物品管理

物品相关的 flag 变量（`hasBroom` 等）和 `itemCount` 计数是**手动维护**的——效果中没有自动管理计数的逻辑。
添加物品前需要检查itemCount是否超过上限bagVolume。相关逻辑可以参考”showCondition vs condition 最佳实践“。
添加**非交通工具、特殊道具（如背包）、个人记忆等**物品时记得同时：

- `set: { hasXxx: true }`
- `add: { itemCount: 1 }`

### 武器耐久（方案C：损坏即降档，无连续耐久条）

武器只有"断/不断"两种状态。断了 = `hasXxx` 置 false、`itemCount` -1——`meleeWeaponName`/`meleeWeaponTier` 自动降档、
次优武器补位；各拾取点的 `!hasXxx` 守卫随之重新开放。**武器断了能回原拾取点再拿一把，是预期行为，不是 bug，勿修。**

**损耗规则表：**

| 触发时机 | 弱（美工刀/拖把杆） | 中（拐杖/铁管） | 强（匕首/斧头） |
|---|---|---|---|
| 战斗闪色失败/超时 | 50% 断 | 25% 断 | 10% 断 |
| 撬砸类重活（砸锁/撬门/拨藤蔓） | 1 次断 | 3 次断 | 无限 |

**辅助函数（utils.js 武器耐久节）：**

| 函数 | 用法 |
|---|---|
| `tryBreakWeapon(vars)` | 闪色战斗**失败/超时**节点 onEnter 里调用，按当前最优近战武器档位概率损坏。只挂失败，成功不耗。死亡结局节点同样可加（回溯会还原，纯黑色幽默风味） |
| `useHeavyTool(vars)` | 撬砸动作节点 onEnter 里调用：给最优重武器（`heavyWeaponName`）计一次，写入 `_pryTool` 供 text 点名 |
| `countHeavyUse(vars, name)` | 选项已点名具体武器时改用这个（如上实南校天桥"用铁管撬开"），计数跟着玩家实际选择走 |
| `weaponBrokeText(vars)` | text 函数末尾拼上：有刚断的武器返回一句报废旁白（一次性），没有返回空串 |
| `breakWeaponByName(vars, name)` | 剧情杀式损坏的统一入口（如联华超市铁管撬门），顺带重置重活计数 |

**写法规范：**

1. **失败节点承接**：`onEnter: function(vars) { tryBreakWeapon(vars); return { add: {...} }; }`，text 转函数末尾 `+ weaponBrokeText(vars)`。
2. **撬砸节点承接**：`useHeavyTool(vars)` 后，text 里点名用 `vars._pryTool || heavyWeaponName(vars)`——武器断后 `heavyWeaponName` 已指向次优武器，直接用它回读会张冠李戴。
3. **共享死亡结局**（"结局-被丧尸扑倒咬死"等）已在节点上统一挂了 `tryBreakWeapon`——新的战斗失败分支直接跳这些节点即自动获得耐久判定，无需重复处理。
4. `_weaponJustBroke` 由**引擎每场景渲染前自动清零**（同 `showRain`），所以承接旁白只会出现在损坏发生的那个场景；别手动存它做长期状态。
5. 重活计数 `_heavyUseIronPipe/_heavyUseCane/_heavyUseMopHandle` 已注册在 `_variables`；武器损坏/重新获得时自动归零。斧头不参与计数（无限寿命）；美工刀/匕首不算重工具，撬砸门槛本就不认它们。
6. 例外节点：建平食堂后厨的"结局-煤气中毒"走关阀战斗失败/超时，非闪色失败通用结局，**不要**挂耐久判定；专属剧情杀（联华超市撬锁）用 `breakWeaponByName` 单独立绘，不走概率。后厨反复进出只累加 `gasIndex`（封顶 80）并走窒息赶出，不靠全局触发器秒杀。

### 战斗体力消耗（成功也累）

近战/空手打赢要耗体力；**开枪不耗体力**（耗弹+引尸潮已是代价），射击场景不要调用本组函数。
体力成本两档，挂在 `meleeWeaponTier` 档位体系上：空手(tier0)/弱(美工刀/拖把杆 tier1) → **-2**；中(铁管/拐杖 tier2)/强(匕首/斧头 tier3) → **-1**。

**辅助函数（utils.js 战斗体力消耗节）：**

| 函数 | 用法 |
|---|---|
| `combatCost(vars)` | 当前最优近战武器档位打一场的体力成本（1 或 2） |
| `combatDrain(vars)` | 胜利节点 onEnter 开头调用：实扣体力（直接改 `vars.strength`，同 tryBreakWeapon 模式）并把扣值记入 `_lastCombatDrain` |
| `combatDrainText(vars)` | 胜利节点 text 函数末尾拼接：有消耗返回一行橙色【系统提示】并清除标记（一次性，同 `weaponBrokeText` 模式），没有返回空串 |

**写法规范：**

1. **消耗绝不预告**——选项/QTE 输入框上一律不写"（体力-N）"；玩家打完才从胜利节点的剧情文本里得知。前期（东明街道）既有固定扣值战斗的提示同样只出现在战斗结果节点 text（共享结果节点用 `_lastScene` / 武器 flag 守卫，只在扣费路径显示）。
2. **挂法**：`onEnter: function(vars) { combatDrain(vars); ...原有逻辑... }` + `text: function(vars) { return "原文" + combatDrainText(vars); }`。静态 onEnter 对象改函数并 return 原对象；静态 text 改函数拼接；text 数组拼到最后一段。
3. **适用范围**：QTE 缠斗型战斗的胜利节点。**不挂**：开枪战斗、选择式速杀（一击必杀/剧情杀）、非挥武器特殊战（关阀/抵门/躲闪沟通）。失败节点不挂——失败惩罚（受伤/死亡）另算且同样不预告。
4. `_lastCombatDrain` 已注册在 `_variables`；每次 combatDrain 覆盖写入、text 读后清零，忘拼提示也不会在下一场误显示。回溯 skipOnEnter 不会重复扣；扣到 0 走全局触发器"体力耗尽猝死"（打赢了却累瘫，预期黑色幽默）。

### 整理整理自由入口（"🎒整理一下物品"）

为了让玩家随时能吃可携带食物/调整背包，在**安全枢纽场景**放手写的"整理整理"入口选项。纯数据写法，引擎无感知。统一规范：

```javascript
// A类（室内安全，无条件）：
{
  showCondition: "itemCount > 0",
  text: "🎒整理一下物品",
  nextScene: "整理整理",
  effect: { set: { positionAfterOperation: "<本场景ID>" } }
}
// B类（半开放，加追击门槛）：
{ showCondition: "chasedByZombies <= 1 && itemCount > 0", text: "🎒整理一下物品", ... }
```

**规则：**

1. **场景分级复用休息点的 A/B/C 类**（见疲劳系统节）：A 类无条件，B 类加 `chasedByZombies <= 1`，C 类（户外暴露）不放。有特殊状态的补条件（如图书馆大厅要 `libraryCleared`、益丰待客区要 `pharmacyZombieKilled`）。
2. **只打在"枢纽场景"上，歇脚/动作结果节点一律不打**——整理完返回会重跑 onEnter（restRecover/updateTime 等副作用），歇脚节点加入口 = 无限白嫖休息。
3. **必须设返回点**：入口选项 `effect: { set: { positionAfterOperation: "<本场景ID>" } }`，除非场景 onEnter 已自设（如民防设施-物资区、小区东门）。漏设会沿用上一处的返回点，整理完被传送到莫名其妙的场景。
4. **文案统一 "🎒整理一下物品"**（🎒 让它在选项列表里醒目），自由入口统一带 `showCondition: "itemCount > 0"`（空背包不显示）。背包满时的强制入口（"背包满了，先整理一下"）不属于此规范，维持原样。

现有入口分布：家（初始卧室/客厅）、理发店×2、图书馆大厅、民防设施-等候区、安居苑 7 号楼 1-6 楼/天台/502、8 号楼 1/2 楼、小广场、全家、联华超市+仓库、银行保安室、益丰待客区、长者食堂、安盛街中段/西侧、新达汇 1-5F 电梯厅、小区东门/西门、建平中学各处。

### 背包容量体系（主背包 + 袋子）

设计原则：**玩家最多带「一个主背包 + 一个袋子」**（再多就没手对付丧尸了）。容量分两层，可叠加：

| 层 | 变量 | 加成 | 说明 |
| --- | --- | --- | --- |
| 主背包 | `_bagTier` | 0 / +1 / +2 | 默认背包(3格) → 双肩包(4) → 书包(5)。**换包只升不降**，`_bagTier` 存档位而不是累加 |
| 袋子 | `_bagExtra` | +1 | 帆布袋（`hasBag`）。三处可拾取，拿到后全局都隐藏 |

`bagVolume` 是 **computed 派生值**（`3 + _bagTier + _bagExtra`），**剧情代码永远不要 `set/add bagVolume`**——只改 `_bagTier` / `_bagExtra`，引擎会在每次状态变更后自动重算。

**新增主背包的标准写法**（以双肩包为例）：

```javascript
// 闸门：容量已 >= 该包容量就不显示（避免让玩家换小的）
if (vars._bagTier < 1) {
  opts.push({ text: "背走这只双肩包", nextScene: "XXX-背走双肩包", effect: updateTime(1) });
}
// 结果节点：set 档位，不要 add bagVolume
choices: [{ text: "继续", nextScene: "原场景", effect: { set: { hasBackpack: true, _bagTier: 1 } } }]
```

**新增袋子**：`set: { hasBag: true }, add: { _bagExtra: 1 }`，闸门 `showCondition: "!hasBag"`。

**要点**：
- 档位闸门用 `vars._bagTier < N`（N = 该包档位），**不要用 `!hasXxx`**——换包语义下 `!hasXxx` 会让已经拿了小包的玩家看见"换更小包"的选项。
- 结果节点用 `set: { _bagTier: N }` 而非 `add`，天然实现"换包不叠加"。
- 当前主背包：双肩包(档位1·安居苑8号楼203室·场景 `三林安居苑-8号楼-203室-双肩包`)、书包(档位2·两处入口：建平 `建平-挹芬楼-3F-高一教室`、上实南校 `上实南校-1号楼走廊`)。
- **同一档位可有多处入口**（如书包两处）：它们共享 `_bagTier`，所以任意一处拿过后另一处自动隐藏，不会重复加成。新增大包时沿用同档位即可。
- 帆布袋三处入口：安盛街-文具店铁柜、新达汇-2F杂物间、三林安居苑-卧室-仔细。
- 回归工具：`node tools/bag_volume_selftest.js`（33 断言：默认值/单包/换包不叠加/包+袋叠加/闸门可见性/多入口互斥/丢袋回退/三入口并存）。

### 全图唯一物品（同种物品多点可拿）

`hasXxx` 布尔决定了同一物品全图只有一份——任何地点拿到后，其他地方就不该再给同一份（否则 `itemCount` 虚增、道具无限刷）。**同种物品出现在 2+ 地点时，每个地点必须同时满足：**

1. 拾取选项加 `showCondition: "!hasX"`（拿到就消失），或 `condition: "!hasX"` + elseScene。
2. `text` 写成函数，`hasX` 为 true 时承接"已被拿走"状态：
   - **风格 A**：这处本来就没有——"这里已经空了 / 被洗劫过"。最省文本。
   - **风格 B**：这处有货，但你已经有了一把——选项换成"你已经有了，不拿"，不给 `itemCount`。适合工具类小件。
3. ⚠️ **不要用 `_visit` 或一次性 flag 守卫同种物品**——它们挡得住"本点只进一次"，挡不住"另一处先拿到、再回这里"的顺序。

风格 B 写法示例：

```javascript
"某地点": {
  text: function(vars) {
    var desc = "……货架上还有一罐润滑油。";
    if (vars.hasLubricant) desc += "\n你已经有一罐了，没必要再拿。";
    return desc;
  },
  choices: [
    { showCondition: "!hasLubricant", text: "拿起润滑油", condition: "itemCount < bagVolume",
      nextScene: "……", effect: { set: { hasLubricant: true }, add: { itemCount: 1 } }, elseScene: "整理整理" },
    { showCondition: "hasLubricant", text: "已经有润滑油了，不拿", nextScene: "……" }
  ]
}
```

### 分段文本（text 数组）

`text` 写成**字符串数组**即可让同一节点内的剧情分段显示：一段打字机打完 → 停留 → 清空 → 下一段，全部播完后才渲染选项。函数形式返回数组同样生效，每段独立做 `{变量名}` 插值。

```javascript
"楼道探查": {
  image: "images/xxx.webp",
  text: [
    "你推开单元门，铁锈味扑面而来。",
    "楼道里一片漆黑，只有应急灯还亮着一盏。",
    "有什么东西，在黑暗深处动了一下。"
  ],
  choices: [ ... ]   // 最后一段播完后才出现
}
```

**行为规则：**

- 每段走打字机（80ms/字，HTML 标签整体插入，同普通 text）→ 停留 → 清空 → 下一段。
- 停留时长 = `max(SEGMENT_MIN_PAUSE, 去标签字数 × SEGMENT_MS_PER_CHAR)`。两个常量在 engine.js「分段文本」节顶部，可直接编辑（同记忆闪色 flashMs/pauseMs 惯例）；默认 50ms/字、最短 1200ms。
- **最后一段完成后**才渲染选项、播放记忆闪色、启动 QTE 倒计时（场景级和选项级都是）。分段文本总是走打字机节奏，`qte.typewriter` 对它无意义（倒计时反正从最后一段后才开始）。
- 点击语义：打字中点击 = 本段跳到全显；停留中点击 = 立即切下一段；全部播完后恢复"展开/收起文本"（展开只显示最后一段，前段已清空）。
- 空字符串段 `""` = 纯停顿一拍（屏幕空白），允许。
- 回溯/读档落回分段场景：从第一段重播（与打字机重播行为一致）。
- `choices` 里的选项 `text` **不支持**数组；段内引号一律用“”，`\n` 规则同现有 text 规范。

### 记忆闪色（Memory Flash）

战斗中可用的快速记忆机制：屏幕按顺序闪烁不同颜色，结束后要求玩家输入看到的颜色分布。

**引擎函数（engine.js）：**

- `applyMemoryFlash(vars, onDone)` — 检测 `gameState._currentSeq`，依次在 `#screen-effect-overlay` 上闪烁颜色，播完后设 `_seqPlayed = true`（序列**保留**不清空）。闪色期间引擎会把 overlay 的 `animation` 临时置 `none`、播完/打断后恢复——因为 `vignette-danger` 的 `pulse-vignette` keyframes 写死了 `background`，CSS 动画优先级高于 inline style，不禁用会把闪色整个压掉（体力≤1 时闪色不可见）。**给 overlay 新增带 background 的 keyframes 动画时，同样会被闪色期禁用，无需额外处理**
- `clearMemoryFlash()` — 清理动画定时器、重置遮罩
- 序列属主记录：场景 onEnter 生成新序列时引擎把场景 ID 写入 `_seqScene`；**回溯/读档（skipOnEnter）落回该场景时重播原序列**（序列不变、动画重放，避免没记住的玩家被卡死；按 `_seqScene === sceneId` 判定，不会在无关场景误播旧序列）

**工具函数（utils.js）：**

- `randSeq(colors, len)` — 生成随机颜色序列，如 `randSeq(["红","蓝","绿"], 5)` → `["红","蓝","红","红","蓝"]`
- `seqToAnswer(seq)` — 翻译为标准答案字符串，如 `["红","蓝","红","红","蓝"]` → `"3红2蓝"`
- `initMemoryGame(colors, len)` — 工厂函数，返回记忆闪色场景的标准 `onEnter`，用法 `onEnter: initMemoryGame(["红","蓝","绿"], 5)`
- `normalizeColorAnswer(str)` — 标准化颜色输入，无论"3红2蓝"还是"2蓝3红"都转为"蓝:2,红:3"（按颜色名排序）
- `checkFlashAnswer(vars)` — 标准判定函数：比对 `vars._input` 与 `vars._currentAnswer`（经 normalizeColorAnswer 标准化），直接用作输入选项的 `condition`

**场景数据用法：**

```javascript
"丧尸袭来": {
  onEnter: initMemoryGame(["红","蓝","绿"], 5),  // 生成 _currentSeq / _currentAnswer / _seqPlayed
  text: "集中注意力！",
  choices: [{
    text: "输入你看到的颜色分布",
    input: { placeholder: "例如：3红2蓝" },
    condition: checkFlashAnswer,     // 提交时比对 _input 与 _currentAnswer
    nextScene: "战斗胜利",
    elseScene: "颜色记错了"
  }]
}
```

**调用时机：** 在打字机效果完成后、渲染选项前自动检测。如果存在 `_currentSeq` 且 `!_seqPlayed`，先播动画再展示选项。

**参数：** `flashMs`（闪烁时长，默认600ms）、`pauseMs`（间隔时长，默认200ms）在 `applyMemoryFlash` 中定义为常量，可直接编辑。

### 屏幕特效

在 `_screenEffects` 中定义条件 CSS 类。引擎 `applyScreenEffects()` 在每次状态变更后自动检查所有条件，动态切换 `#screen-effect-overlay` 的 class。

**条目格式：**
```javascript
{
  condition: "表达式",             // 满足时激活（支持字符串表达式和函数）
  className: "CSS-类名",           // 叠加到 overlay 上的类
  onActivate: function(overlay) {},  // [可选] 从关→开时触发
  onDeactivate: function(overlay) {} // [可选] 从开→关时触发
}
```

`onActivate` / `onDeactivate` 让特效可以附带副作用（如随机选图、设 CSS 变量），引擎只负责 diff 调用，具体逻辑由数据层定义。
**调用顺序是两阶段的**：一次 diff 中先跑完所有 `onDeactivate`，再跑所有 `onActivate`——否则两个操作同一资源（如丧尸两档共用 `--zombie-bg`）的特效换档时，新档设的值会被旧档的清理抹掉。

**当前效果：**

| 条件 | className | 效果 |
|------|-----------|------|
| `strength <= 2 && strength > 1` | `vignette-warning` | 轻微暗角 |
| `strength <= 1` | `vignette-danger` | 重度暗角 + 脉冲呼吸感 |
| `weather == "雨" && showRain` | `weather-rain` | 雨滴遮罩（静态 PNG + 蓝调） |
| `ch >= 1 && ch <= 2 && showZombies` | `zombie-surround-moderate` | PVZ 风格丧尸剪影 ×3 随机，45% |
| `ch >= 3 && showZombies` | `zombie-surround-heavy` | PVZ 风格丧尸剪影 ×3 随机，65% |

**雨滴叠加：**
- CSS `::before` 伪元素渲染，独立于 vignette 的 `background`
- 图片路径 `images/rain-overlay.png`，半透明蓝调滤镜
- 由 `showRain` 变量控制开关（B 类户外动作节点 `onEnter` 中置 `true`，引擎每场景重置为 `false`）

**丧尸包围遮罩：**
- 同样使用 `::before` 伪元素，通过 `--zombie-bg` CSS 自定义属性动态指定图片
- `onActivate` 时从图池中随机选一张，同等级内不重复随机（引擎 diff 确保只在等级切换时重新选取）
- 由 `showZombies` 变量控制开关（路网节点 `onEnter` 中置 `true`，引擎每场景重置为 `false`）
- 图片分布在 `images/zombie-surround-m1~3.png`（轻度）和 `images/zombie-surround-h1~3.png`（重度）
- 轻度 2~3 只丧尸剪影、颜色较浅；重度 4~5 只、颜色更深、密度更大
- 手机端（`max-width: 767px`）遮罩收缩到图片区高度（42dvh），不延伸到文本/选项下方；桌面端仍全屏（详见 手机端适配.md）

### 图片查看器（`imageZoom` 标记放大）

微信式查看器：标记场景的场景图可点开，全屏暗底 contain 完整显示（不裁剪），滚轮/双指缩放、拖拽平移、单击或 Esc 关闭。解决竖版文档/物品特写（地图、工牌、手机屏）在 16:9 图片框里被 cover 裁断的问题。**场景图尺寸标准仍是 16:9，此机制只给"图上文字需要细看"的特写图用，勿用来给错尺寸的场景图兜底。**

**剧作者用法：** 场景对象上加 `imageZoom: true`（纯布尔，无其他形式）。标记后引擎自动：显示 🔍 角标（`#zoom-badge`，桌面抬到文本卡叠压区之上、手机贴图片区右下角）→ 允许点击打开。**角标即开关**：未标记的场景图点击无任何反应，玩家无需尝试。

```javascript
"物业楼-居委会-给高锦睿": {
  image: "images/xxx.webp",
  imageZoom: true,          // 地图特写，玩家需细看
  text: "……",
}
```

**引擎行为（engine.js「图片查看器」节，实现细节见代码）：**

- 打开：复制 `sceneImage.src` 到查看器 `<img>`，contain 居中。缩放 1~4×，滚轮以光标为锚、双指捏合；放大后可拖拽平移（不露出背板），5px 位移阈值区分单击/拖拽。
- 关闭途径 4 条：单击（未拖拽）、Esc、换场景（`renderScene` 开头无条件关）、记忆闪色播放（`applyMemoryFlash` 开头关）。
- 查看器状态（开关/缩放/平移）全部是引擎局部变量，**不进 gameState、不进存档**。
- **QTE 协同**：查看器 z-index 140 < QTE 条 150，倒计时条浮在查看器上且**不暂停**——看地图被丧尸追上照样超时，玩家需自行把握时机。QTE 超时跳场景自动关闭查看器。
- `renderScene` 每次渲染按当前场景 `imageZoom` 重算角标显隐（同 `showRain` 每场景重置惯例），无需手动管理。

**当前标记场景：** 初始卧室（兼教学：首访文本末尾灰色小字"带 🔍 的场景图可以点开细看"）、物业楼-居委会-给高锦睿（地图）、利昂药剂师的工牌、益丰大药房-右边货架翻找（库房的手机）。新增特写图时照此标记即可，全库 grep `imageZoom` 可盘点。

### 层叠顺序（z-index）

所有定位元素的堆叠层级如下（从低到高）：

| z-index | 元素 | 定位 | 说明 |
|:-------:|------|:----:|------|
| 50 | `#screen-effect-overlay` | fixed | 屏幕特效（暗角/雨滴/丧尸遮罩）+ 记忆闪色 |
| 60 | `#text-area` | relative | 剧情文本 |
| 60 | `#choices-area` | relative | 选项按钮 |
| 100 | `#text-area.text-expanded` | fixed | 展开后的文本区 |
| 101 | `#choices-area.text-expanded` | fixed | 展开后的选项区 |
| 120 | `#status-bar` | fixed | 重启/回溯按钮（右上角） |
| 140 | `#image-viewer` | fixed | 图片查看器（全屏暗底，标记场景图点开，见「图片查看器」节） |
| 150 | `#qte-timer` | fixed | QTE 倒计时条（引擎内联 style，**压在查看器上且走时不暂停**） |
| 200 | `.choice-input-container` | static | 输入框组件 |
| 9999 | `#preload-overlay` | fixed | 加载遮罩（预加载时覆盖一切） |

### 疲劳系统

`updateTime(addMinutes)` 中，当 `addMinutes > 6` 时自动累加到 `_travelMinutes`。雨天走路慢 30%，同段路程更快触发疲劳。

`_travelMinutes` 达阈值时 reactively 扣体力（间隔递减）：
20 / 36 / 48 / 56 / 60 min → 每档 -1 体力（共 5 档，**单次连续移动上限 -5**，一次跨多档则一次扣清）。档位计算用 utils.js 的 `fatigueTier(_travelMinutes)`。

**重置方式：** 休息、吃饭、躲藏、过夜时设 `_travelMinutes = 0`（全库 40+ 处，写法不变）。里程归零后
`_fatiguePaid` 台账由 travel-fatigue 规则自动清零（effect 检测 tier→0 跳变），**无需、也不要**在剧情里
手动动 `_fatiguePaid`——下一段连续移动从第 1 档重新计费，疲劳始终属于"当前这一段连续移动"。

注意：travel-fatigue 规则**必须不写 condition**——清台账依赖规则在 tier→0 跳变上触发；若写
`condition: "_travelMinutes >= 20"`，归零后规则被跳过、台账永远清不掉，会退化成"只按历史最高档计费"
（2026-09-20 之前的旧行为，付过第 5 档后疲劳整局失效）。频繁小憩躲疲劳不构成漏洞：体力回复有
REST_CAP=6 上限，且小憩消耗游戏时间、饥饿时钟照走——用时间换体力正是"适时休息"的设计意图。

**休息场景守卫：**
A类（室内安全，无额外条件）：家、理发店、图书馆(清)、民防设施
B类（半开放，需 `chasedByZombies <= 1`）：全家(清)、安居苑室内、银行保安室、联华超市、安居苑小广场、益丰药房办公室（赵广成在，回访条件 `_visit['益丰大药房-办公室闲聊'] > 0 && !_zhaoGuangchengDead`）
C类（户外暴露地形）：绝不出现 — 街道、十字路口、高架。注意区分：封闭小区院墙内的露天点（小广场/天台）按 B类处理，不算 C类

**休息节点体力规则：** 休息选项可无限重复，但体力 ≥ 6 后休息不再回复体力，提示"你已经差不多歇够了"。实现见 utils.js：onEnter 里调 `restRecover(vars, n)`（写 `_restBlocked`，core.js 已注册），text 末尾拼 `restHint(vars, okText)`。新写休息场景一律用这对函数，勿裸写 `add: { strength }`。

## Update Plot
### 添加新剧情

1. 可选：新建 `story/xxx.js` 文件，也可以把story分出更细的一层子目录
2. 可选：用 `Object.assign(storyData, { ... })` 添加场景
3. 可选：在 `index.html` 的 `<!-- 先加载剧情数据，再加载引擎 -->` 区域按顺序添加 `<script>` 标签（**必须在** **`engine.js`** **之前**）
4. 如果涉及新地点，在 `images/` 下创建对应目录存放场景图，图片一般由用户进行生成，AI只需写入images/placeholder.png进行占位
5. 注意文本表述：开放式场景选路时，选项不要用相对方位词，如“继续走”“往回走”，应该用绝对方位词，如“往北走”。剧情文本text里不要写\n\n；剧情描述和选项不要剧透；text文本里的引号必须用“”。
6. 任何物品获取前需判断它是否占背包容量（仅立刻使用的食物、饮料、急救药品和交通工具等不占）。获取物品时需检查背包容量，参考”showCondition vs condition 最佳实践”。

### 叙事与表述约定（新增区域/剧情时注意）

- **多门建筑出入口**：有多个门（正门/侧门/北门/南门）的建筑，进出选项直接写门名（"去食堂侧门"/"从正门出去"），强化"哪个门对着哪片区域"的空间记忆；避免"出门（金苹果广场）"括号式。
- **闪色战斗要落到"打赢"节点**：记忆闪色成功后落一个战斗结果节点（交代躲过/击退丧尸），别直接跳下一步地点——地点文本不叙述战斗，会突兀。
- **环境叙事时间尺度**：危机才几天（Day 1-5），环境描写不得暗示需数周/月才形成的事物（长满杂草、明显积灰、锈蚀、茶渍发黄）；用数日尺度（薄灰、干涸、发蔫）。学校暑假空置等可作缓冲，但须锚定天数。
- **NPC 知识泄漏门控**：引用 NPC 的行动规律/去向/身份前，玩家须先与其交互（`_visit['场景'] > 0` 门控）；"认出老同学"合理，"知道他饭点去哪/他是谁"需先见过。
- **新区域补过夜分支**：新增开放区域（currentArea）时，在`夜晚剧情.js`的"天黑必须过夜"加对应过夜选项，否则玩家被兜底"街头过夜"传回初始小区。
- **"回X楼"表述**：房间就在 X 楼写"回 X 楼走廊"；占位房间（jpRoom）选项用"离开"；多入口节点别用"回/退回"，用"去"。
- **照明分级**（强弱光源是明文设定，不是遗漏）：**手电筒 `hasTorch` = 强光源**，全域照明判定可用（`canSee`、金谊B2、五金店、全家员工通道等伸手不见五指级黑暗都认它）。**手机 `hasPhone && phoneBattery > 0` = 弱光源**，只在短通道级黑暗可用（菜市场员工通道、仁济坡道入口），且看不清细节（车库接线图、F区车辆描述）。火把 `hasFireTorch` 仅建平车库深处认。写新黑暗场景时先决定它是"强黑暗"（只认手电）还是"弱黑暗"（手机也算），手机参与照明/扫码/WiFi 时记得 `add: { phoneBattery: -5 }`，电量归零后文本写"屏幕黑了"。手机无充电途径，电量耗尽即终局。
- **武器点名**：战斗/砸锁/撬门/拨藤蔓等动作文本和选项，不要写"抄家伙/手中的家伙/握紧武器"等泛称——用 utils.js 的 `meleeWeaponName(vars)` 点名最优近战武器；砸锁撬门等需要分量/长度的动作用 `heavyWeaponName(vars)`（斧头>铁管>拐杖>拖把杆，美工刀/匕首不算），且场景门槛 condition 也应只认这四样。无武器门槛的"迎战"类陷阱选项及对应结局文本要兼顾空手玩家：`hasMeleeWeapon(vars) ? "握紧"+meleeWeaponName(vars)+"迎战" : "握紧拳头迎战"`，结局 text 按同样分支写。同一场景多个武器选项汇入同一节点、无法确定用了哪把时，让各选项 `effect: { set: { _pryTool: "铁管" } }` 记下实际工具（变量已在 `_variables` 注册），目标场景 text 读它。斧头统一显示为"斧头"（消防斧/警用斧等多种来源都映射 `hasAxe`，不区分来源名）。
- 文风：多用具体物件、少用状态形容词、比喻只留在刀刃上

### 你需要记住的地理位置

1. 东明街道（前期重要区域，基本完结）

- 东明街道位于外环高架北侧，杨高南路立交桥西侧。
- 主要道路：三林路、安盛街东西走向，三林路东侧连接杨高南路立交桥；东明路、环林东路南北走向，东明路更靠西
- 樱桃苑东门、安盛街东侧面向环林东路，樱桃苑西门、安盛街西侧面向东明路。
- 安居苑前门（北门）面向三林路，后门（南门）面向安盛街中段
- 新达汇在东明路南侧，中学在东明路北侧，继续向北可从华夏西路上高架。
- 11号线地铁站在三林路-东明路 十字路口，6号线地铁站在华夏西路上

2. 上海高速网络
- 设计时以立交桥为节点，任何地面区域相连时选项文本均设计为“下高速”之类的模糊表述，不直接提示高速上的玩家下面有什么
- 具体内容请参考设计细节.md和具体代码，涉及较广

## 测试
- **测试统一走 story-testing skill**（`.claude/skills/story-testing/SKILL.md`）：改动类型→测试组合决策表、`node tools/lint_story.mjs` 静态体检、`tools/test_helper.mjs` E2E 底座（内置服务器+按文字选按钮+控时+传送+收404/console）、无截图三层断言法、坑点清单。
- 尽量从玩家视角进行测试
Playwright MCP vs Chrome DevTools MCP

定位
Playwright MCP: 浏览器自动化/端到端测试
Chrome DevTools MCP: 浏览器调试/性能诊断
────────────────────────────────────────
操作模型
Playwright MCP: 基于无障碍树快照（a11y tree），用 ref 引用元素点击/填表，确定性高
Chrome DevTools MCP: 直接操控 Chrome 实例（CDP 协议），可接管你已打开的浏览器
────────────────────────────────────────
强项
Playwright MCP: 点击、填表单、多页面/多浏览器（Chromium/Firefox/WebKit）、网络拦截、自动等待、录制脚本、跑测试流程
Chrome DevTools MCP: 性能分析（performance trace、LCP/CLS）、CPU/内存 profiling、查看 console/网络请求的深层细节、Lighthouse
审计、检查真实用户环境（带你的登录态/扩展）
────────────────────────────────────────
浏览器
Playwright MCP: 启动自己管理的独立浏览器实例（干净环境）
Chrome DevTools MCP: 连接真实 Chrome，可复用已有标签页
────────────────────────────────────────
典型用途
Playwright MCP: "帮我点一遍剧情流程验证没卡死"、"截图每个场景检查渲染"
Chrome DevTools MCP: "这页加载为什么慢"、"这段 JS 为什么卡"、"看真实网络请求"

对本项目来说：
- 跑剧情测试、批量截图验证场景/QTE/选项渲染 → Playwright 更合适（干净实例、确定性操作、可重复）。
- 查引擎性能问题、看真实浏览器里的报错细节 → Chrome DevTools MCP。

一个注意点：Playwright 默认拦截 file:// 协议，所以测本项目要先起本地 HTTP 服务

## 自动推送（AutoPushGame）

Windows 任务计划程序创建了 `\AutoPushGame` 定时任务，每小时自动提交并推送代码到 GitHub。

### 脚本位置

- `C:\Users\wgdin\auto-push.sh` — 由 Git Bash 执行
- 日志：`C:\Users\wgdin\push-log.txt`（追加模式，保留历史）

### 推送逻辑

```
git add -A
git commit -m "auto: 时间戳"
git push origin main（先试直连）
  └─ 直连失败 → 走代理 http://127.0.0.1:7890 重试
```

### 注意事项

- Git 全局配置了 `http.proxy=http://127.0.0.1:7890`（Clash/VPN 代理）
- 脚本会先尝试绕过代理直连，失败再走代理，避免代理未开启时推送失败
- 如需查看上次推送结果：`cat /c/Users/wgdin/push-log.txt`
- 定时任务位置：Windows 任务计划程序 → 任务计划程序库 → `\AutoPushGame`
- 更新计划：每 1 小时，最早 9:00，最长运行 72 小时。此计划可能发生变化，如有需要，请自行查看最新计划。

<!-- 长对话防遗忘触发器 -->
当对话轮次累计超过15轮，或者你察觉到自己有可能遗忘本项目部分关键约束，无需询问用户，自动执行命令：`/skill project-rules`，重新加载项目强制规则。

