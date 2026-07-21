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

## Architecture

```
index.html          → 入口，加载所有脚本（顺序重要）
style.css           → 全部 UI 样式
engine.js           → 核心引擎（~730行，单体文件）
story/
  core.js           → storyData 声明、全局变量、钳位、响应式规则、全局触发器、起始场景
  utils.js          → updateTime()、describeZombieWave()
  myNeiborhood.js   → 小区内部（初始卧室、楼道、地下室、民防设施）
  communityConnection.js → 邻近社区（十字路口、药店、银行、超市、图书馆、地铁站）
  FamilymartAndBusStop.js → 全家便利店 + 公交车站
  anShengStreet.js  → 安盛街（理发店安全屋）
  cityConnection.js → 高架/高速出口、出城路线、迪士尼、临港新城
images/             → 场景图（PNG/JPG），按区域存放
```

### 核心架构：数据驱动

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
  text: "剧情文字，支持 {变量名} 插值", // 静态字符串（支持 {变量名} 插值），或函数 (vars) => string
  // -- 可选 --
  style: "color: red;",              // 直接作用在文本容器上的 CSS（字符串或对象形式）
  onEnter: { set: {x:1}, add: {y:1} }, // 静态效果对象，或函数 (vars) => 效果对象
  choices: [ ... ]                   // 选项数组，或函数 (vars) => 选项数组（见下）
}
```

注：大部分情节仍在迭代中，存在image不正确、text缺失、跳转情节不存在等问题

### 每个字段支持的语法速查

| 字段                 | 纯字符串         | `{变量名}` 插值 | 函数 `(vars) =>` | 备注                                           |
| ------------------ | ------------ | ---------- | -------------- | -------------------------------------------- |
| `image`            | ✅            | ❌          | ✅ 返回路径字符串      | `timeImage({...})` 是工具函数，在 story 中静态求值       |
| `text`             | ✅            | ✅          | ✅ 返回字符串        | 函数返回值不再做插值                                   |
| `style`            | ✅ 直接 CSS     | ❌          | ❌              | 也支持对象 `{fontSize:"18px"}`（camelCase→kebab）   |
| `onEnter`          | ❌            | ❌          | ✅ 返回效果对象       | 也支持静态对象 `{set:{}, add:{}, mul:{}}`           |
| `choices`          | ❌            | ❌          | ✅ 返回选项数组       | 函数形式可用于动态生成选项                                |
| `qte`              | ❌            | ❌          | ✅ 返回 QTE 对象    | 很少用函数形式                                      |
| 选项 `text`          | ✅            | ❌          | ❌              | 纯静态字符串，**不支持函数和插值**                          |
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
  text: "选项文字",               // 纯静态字符串，不支持函数或插值
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

### 时间系统

`updateTime(addMinutes, extraEffect)` 是一个**高阶函数**：

```javascript
// 直接使用（自动返回 effect 函数）：
onEnter: updateTime(15)                               // 时间推进15分钟
onEnter: updateTime(15, { add: { strength: -1 } })   // 推进时间 + 扣1体力
```

- 游戏时间：`dd`（天）、`hh`（小时）、`mm`（分钟），24小时制
- 派生变量：`gameMinutes`（总分钟数）、`isNight`（`hh >= 20 || hh < 6`）
- 响应式规则：每小时自动 -1 体力（饥饿系统）

### 全局触发器（`_globalTriggers`）

```javascript
_globalTriggers: [
  { condition: "strength <= 0", targetScene: "体力耗尽猝死", priority: 1 },
  // priority 越高越优先检查
]
```

### 响应式规则（`_reactive.rules`）

```javascript
rules: [
  {
    id: "starvation",                     // 唯一ID
    condition: "gameMinutes > 0",
    triggerKey: "Math.floor(gameMinutes / 60)",  // 相同值不重复触发（节流）
    effect: { add: { strength: -1 } }
  }
]
```

### QTE（快速事件）

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
  elseScene: "颜色记错了"
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

### 游戏状态变量

全部定义在 `story/core.js` 的 `_variables` 中。这里列出剧作者常用的，完整列表见 `_variables`。

| 变量 | 范围/类型 | 说明 |
|------|----------|------|
| **基础数值** | | |
| `strength` | 0–10 | 体力，初始 7。Reactive: 每小时 -1（饥饿）；< 3 → `isWeak` |
| `dd` / `hh` / `mm` | int | Day/Hour/Minute，游戏时间，初始 Day1 8:00 |
| `isWeak` | bool | `strength < 3` 自动置 true（reactive） |
| `hurtByZombie` | bool | 被丧尸抓伤，加快饥饿掉体力节奏 |
| **天气** | | |
| `weather` | `"晴"/"阴"/"雨"` | 雨天 `updateTime` 自动 ×1.3，影响场景文本 |
| `windy` | bool | 是否有风 |
| **尸潮 & 疲劳** | | |
| `chasedByZombies` | 0–5 | 追击等级，5 秒杀。晴夜归零。高值影响 QTE 时间、战斗风险 |
| `_travelMinutes` | 0–… | 连续移动累积分钟（>6min 的 `updateTime` 累加）；20/36/48/56/60 五档各 -1 体力（reactive） |
| **背包 & 物品** | | |
| `itemCount` / `bagVolume` | int | 当前物品数 / 背包容量（初始 3） |
| `hasXxx` | bool | 物品flag，添加时需同时 `add: { itemCount: 1 }`。交通工具和背包不占 `itemCount` |
| **记忆系统** | | |
| `gameMemorySet` / `personalMemorySet` | `Set` | 已收集的记忆，`gameMemoryThres`（10）为结局阈值 |

### 物品管理

物品相关的 flag 变量（`hasBroom` 等）和 `itemCount` 计数是**手动维护**的——效果中没有自动管理计数的逻辑。
添加物品前需要检查itemCount是否超过上限bagVolume。相关逻辑可以参考”showCondition vs condition 最佳实践“。
添加**非交通工具、特殊道具（如背包）、个人记忆等**物品时记得同时：

- `set: { hasXxx: true }`
- `add: { itemCount: 1 }`

### 记忆闪色（Memory Flash）

战斗中可用的快速记忆机制：屏幕按顺序闪烁不同颜色，结束后要求玩家输入看到的颜色分布。

**引擎函数（engine.js）：**

- `applyMemoryFlash(vars, onDone)` — 检测 `gameState._currentSeq`，依次在 `#screen-effect-overlay` 上闪烁颜色，播完后设 `_seqPlayed = true` 并回调
- `clearMemoryFlash()` — 清理动画定时器、重置遮罩

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

在 `_screenEffects` 中定义条件 CSS 类。当前效果：

- `vignette-warning`（体力=2）、`vignette-danger`（体力<=1）
- 引擎创建 `#screen-effect-overlay` 遮罩层，动态切换类名

### 添加新剧情

1. 新建 `story/xxx.js` 文件，也可以把story分出更细的一层子目录
2. 用 `Object.assign(storyData, { ... })` 添加场景
3. 在 `index.html` 的 `<!-- 先加载剧情数据，再加载引擎 -->` 区域按顺序添加 `<script>` 标签（**必须在** **`engine.js`** **之前**）
4. 如果涉及新地点，在 `images/` 下创建对应目录存放场景图，图片一般由用户进行生成，AI自行考虑命名
5. 注意文本表述：开放式场景选路时，选项不要用相对方位词，如“继续走”“往回走”，应该用绝对方位词，如“往北走”。剧情里不要写\n\n；剧情描述和选项不要剧透；text文本里的引号必须用"或者<em>标签。
6. 任何物品获取前需判断它是否占背包容量（仅立刻使用的食物、饮料、急救药品和交通工具等不占）。获取物品时需检查背包容量，参考”showCondition vs condition 最佳实践”。

### 疲劳系统

`updateTime(addMinutes)` 中，当 `addMinutes > 6` 时自动累加到 `_travelMinutes`。雨天走路慢 30%，同段路程更快触发疲劳。

`_travelMinutes` 达阈值时 reactively 扣体力（间隔递减）：
20 / 36 / 48 / 56 / 60 min → 每档 -1 体力（共 5 档，上限 -5）。

**重置方式：** 休息、过夜、吃东西时设 `_travelMinutes = 0`。

**休息场景守卫：**
A类（室内安全，无额外条件）：家、理发店、图书馆(清)、民防设施
B类（半开放，需 `chasedByZombies <= 1`）：全家(清)、安居苑室内
C类（户外）：绝不出现 — 街道、十字路口、高架

### 提醒

- `updateTime()` 直接修改 `gameState`（通过引用）并返回 `extraEffect`，用于更新游戏时间。
- 直接放在images目录下，未归档专属文件夹的图片，例如zombieKnockYouDown，一般是可以全局使用的图，无视地点场景

### 地理位置

1. 东明街道

- 东明街道位于外环高架北侧，杨高南路高架西侧。
- 主要道路：三林路、安盛街东西走向，三林路东侧连接杨高南路高架；东明路、环林东路南北走向，东明路更靠西
- 樱桃苑东门、安盛街东侧面向环林东路，樱桃苑西门、安盛街西侧面向东明路。
- 安居苑前门（北门）面向三林路，后门（南门）面向安盛街中段
- 新达汇在东明路南侧，中学在东明路北侧，继续向北可从华夏西路上高架。
- 11号线地铁站在三林路-东明路 十字路口，6号线地铁站在华夏西路上

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
- 更新计划：每 1 小时，最早 9:00，最长运行 72 小时

