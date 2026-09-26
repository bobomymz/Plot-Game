# 尸潮笔记 · 项目铁律
> 细节见 `tools/*.md` 与每日日志；审计坑表见 skill。

## 变量/审计
- `_variables` 是 `gameState` 唯一来源；未声明名→条件抛错→**选项不显示**（非 false），报错常点错变量名，须全量审计。派生量放 `_reactive.computed`；新派生值优先写 utils.js 普通函数。初值：计数 0（add）、布尔 false、串 ""。
- 三件套：`condition_audit`(0/0)、`scene_fn_selftest`(0 异常)、`sprint_away_audit`(0 P0)；**清单唯一权威=`tools/story_files.js`**，新脚本禁硬编码 FILES（漏跟=假绿）。存档 `fillMissingDefaults`+`refreshComputed` 挂 `applySave`/`backtrack`；只新增变量不必 bump `SAVE_VERSION`，**改字段含义必须 bump 或写反推迁移**。

## 战斗
- 徒手化＝改文案+onEnter 分支，勿新增场景；代价包 `{add:{strength:-2,mercuryLoad:10},set:{hurtByZombie:true}}`。体力门槛失败结局只改 elseScene 指向。
- `combatCost`=tier≥2?1:2；失败包=体力−1~−3、汞+10~+15、hurt、`tryBreakWeapon`。惩罚三处：onEnter、选项 effect、场景级 `qte.onTimeout`（最易漏）。`isEnding()`：id 以『结局』开头或文案含『—— 结局：』。

## 背包/水瓶
- 容量=`3+_bagTier+_bagExtra`；`bagVolume` 派生值永不 set/add；闸门 `vars._bagTier<N`/`!hasBag`。拾取四件套：`condition:"itemCount<bagVolume"`+`effect:{set,add:{itemCount:1}}`+`elseScene:"整理整理"`，新节点必须 set `positionAfterOperation`。⚠09-21 前旧档容量 4→3（`bag_migration_repro.js`）。
- 休息整理入口：`restTidyChoice(id)`+`restTidyGuard(vars)`（utils.js，20 处）。**整理整理出口回入口场景→onEnter 重跑**，故休息 onEnter 必 guard（防重复计时/甩追兵/扣口粮/过夜跳天）；非休息入口同理。
- 割锯工具（`cuttingToolName`）：美工刀>匕首>斧头>螺丝刀；不含铁管/拐杖/拖把杆/扫帚/钥匙。可多次打水，水瓶非紧平衡；`bottleWater` 0/1，丢弃须同清 `waterToxic`/`_hongBottleLabel`；保温杯另体系（建平弘渊楼2F，水全毒）。
- 计数型可堆叠口粮：`instantNoodle` 0~3（全家货架，每包1格，吃=体力回满）、`vitaminC` 0~8；布尔改计数须同步 `FOOD_GIFTS`+`foodGiftChoices`（数字分支只扣1）。⚠字段迁移块要排在 `fillMissingDefaults` 补默认值循环**之前**（写后面=恒假死代码）。

## 体力/天气
- ⚠遥测块只能追加 engine.js 末尾，三处 `__wrapState` 保持单行；**场景锚点必须带 `: {` 后缀**。疲劳属"当前这段连续移动"：tier→0 自动清 `_fatiguePaid`，剧情只归零 `_travelMinutes`。引擎无自动提示，手写三通道；橙 `#ffaa00` `【系统提示】体力-N，当前体力：{strength}。`；死亡结局不补。
- **遥测日志会跨版本混合**：持久化不清空，core.js 三天能漂 4 次行号 → **每次测量前必须 `__clearStaminaLog()`**。归因语义：**对象式规则→应用侧 engine 行号；函数式规则→真实赋值行**。
- `weather` 唯一改写 `updateWeather()`；雨只能转阴。户外 `outdoor:true` 三选一：placeholder 图、本场景 onEnter 开 showRain（选项 effect 无效）、路径含「雨」专图。`timeImage(map)` 是工厂。

## `_visit`/过夜/QTE/shake
- 只读不写；`vars.x`→`(_visit['场景']>0)`，`!x`→`!_visit['场景']`；键名必须=真实场景 ID（悬空键不报错、条件恒假→选项永不出现）。改计数键名前算首达路径：全库自引用本场景 ID（引擎先自增后渲染）。
- `天黑必须过夜` 29 选项；建筑类过夜点两层门槛：`showCondition` 加 `_visit['建筑内部']>0`、原 `condition`/`elseScene` 保留。场景级=`node.qte`，选项级=`choice.timeout`；工厂 `mallQTE`/`jpChaseQTE`/`travelScene`。shake 已 31 处；`applyEffect` 只认 set/add/mul。

## 文风/气味
- **禁增/降频全表见 `tools/ai_phrase_scan*.py`**；基准 `张江.js`。气味按成因：0–2天血腥汗酸、2–7天闷厚腐肉臭、>1周干腐、化工毒气甜腥；**「甜腻」只留**长蛆老尸与化工毒气（金谊B2、五金店）。

## 汞中毒
- `mercuryLoad` 0–100，已注册 `_caps`（隐藏变量必有上限）。≥70→`结局-汞中毒尸变`；慢性：`mercuryLoad>0` 才启动、每小时+1，台账 `_mercuryChronicHour` 勿动；减汞唯一手段：童涵春堂药丸−20。派生 `mercuryTier`/`noPainSense`/`hasDimLight`。
- 体征走正文：灰白→`mercuryMirrorNote(vars,surface)`（7 处勿重复加）；痛觉消失→文案反转+`mercuryPainNote`；夜视→手电弱化版。**玩家可见文案禁止点明机制**（汞/夜视/数值不得出现）；新载体须登记 `mercury_leak_guard` 的 `SCENES`。

## 复旦江湾章（09-24）
- `story/复旦江湾.js`：入口 `建平-后门辅路`（hh<14，错过→`_xinGone`）。2×2（堵门/目击/双逃/救场）+ a 链双窗口（`hasWangPhone&&wangPhoneBattery>=6`，出示不扣电）+ b 链 `_phoneOrigin=="own"`；引信 `jpXinFuse` ③次日/④隔日爆，给药不炸→否则 `结局-变了的忻老师`。
