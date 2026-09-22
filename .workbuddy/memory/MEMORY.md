# 尸潮笔记 · 项目长期约定

> 只留必须遵守的规则；细节与底稿见 `tools/` 报告与每日日志。

## 1. 剧情变量（铁律）
- **`storyData._variables` 是 `gameState` 唯一来源**（engine.js:194）。漏声明的名字出现在条件里 → 引擎整条 `new Function` 抛错 → **选项直接不显示**（不是 false），报错只打印表达式文本，易误判成第一个变量的问题。
- 例外：`_reactive.computed` 的 7 个派生变量（canSee/hasFood/hasMeleeWeapon/hasNoTransportation/meleeWeaponTier/zombieAtHomeDoor/zombieOutsideHome）不进 `_variables`，审计脚本须先注入。
- **改剧情后必跑** `node tools/condition_audit.js`，期望两个 0。沙箱坑：须 `vm.runInContext('storyData', sandbox)`；用 `process.cwd()`；`flashStatusWarning`/`triggerShake` 要补桩。

## 2. 变量 ↔ _visit（2026-09-20 完成）
- 已替换 89 个，变量总量 **352→263**。惯用法：`vars.x` → `(vars._visit['场景'] > 0)`；`!x` → `!_visit['场景']`；**_visit 只读不写**。
- **15 个保留变量勿换**：_policeGunTaken、_supermarketCompromised、_xinDead、teacherStudentsDead、wangGiveKey、_jinyiSurvivorsFed/Robbed、_paraffinTaken、_drawerVitaminTaken、_jinbaobeiFrontOpen、fightWithVineZombie、_airlockAlarmRang/Zombie、_lijuanCupTold、_fangDieselGiven。
- 改写脚本必须带「残留校验 + 失败即中止 + 两阶段统一写盘」三件套。
- 待拍板：9 个"写而不读"变量（_quackTradedDay/_fangWarnRoadBull 疑 bug）；9 个 _visit 悬空场景 ID。

## 3. 背包容量（2026-09-21 完成）
- 容量 = `3 + _bagTier + _bagExtra`；`bagVolume` 是 computed 派生值，**永远不要 set/add**。
- `_bagTier` 0=背包(3)/1=双肩包(4)/2=书包(5)，用 `set`；**闸门用 `vars._bagTier < N`，不用 `!hasXxx`**。
- `_bagExtra` 帆布袋 +1，闸门 `!hasBag`，三处入口不互斥。全库统一叫「帆布袋」。
- 回归：`node tools/bag_volume_selftest.js`。

## 4. 体力系统
- 回归口令（改剧情后建议全跑，期望 0 失败）：`python tools/stamina_audit.py`、`python tools/stamina_report.py --selftest`、`node tools/stamina_telemetry_selftest.js`、`node tools/condition_audit.js`、`node tools/unarmed_fight_selftest.js`、`node tools/bag_volume_selftest.js`。
- **⚠ 遥测块只能追加在 engine.js 末尾，三处 `__wrapState` 包裹点保持单行**（196 新局/769 回溯/1381 读档），插行会破坏 KNOWN_SITES 行号归因。
- **⚠ 在 core.js `_variables` 增删行 → KNOWN_SITES 的 core.js 区间整体平移，必须同步校正**。校验：逐区间确认存在 strength 写入行，正则要覆盖 `vars.strength = 10` 式（`/strength\s*[:+\-*/]?=/`）；mock 行号须落在区间内。
- 疲劳属「当前这段连续移动」：tier→0 自动清零 `_fatiguePaid`；剧情代码只归零 `_travelMinutes`，**勿手动动 `_fatiguePaid`**。
- **体力提示（2026-09-21 审计 + 补齐完成）**：引擎无任何自动提示——`flashStatusWarning()` 只用于环境消耗（饥饿/连续移动/受凉/烈日），**战斗失败一处也没有**；engine.js 体力 Proxy 仅开发期遥测。提示只能手写三条通道：① `【系统提示】体力-N，当前体力：{strength}`（`{strength}` 由 engine.js:785 `interpolateDisplay()` 渲染，**数组 text 的每段也独立插值**）；② 正文身体描写；③ 选项文字标「（体力-N）」。**标准样式（橙 `#ffaa00`）**：`<span style='color: #ffaa00; font-style: italic;'>【系统提示】体力-N，当前体力：{strength}。</span>`，基准见 `utils.js:389 combatDrainText` 与 `上实南校.js` 桌椅节点。失败节点补提示的三种落点：字符串 text 末尾接 `\n<span…>`；函数返回字符串在 return 末尾 `+`（排在 `weaponBrokeText` 后）；**数组 text 追加到末段字符串内**。**死亡结局节点不补**（人已死）。已补齐 12 处战斗/非战斗失败节点，战斗类无提示归零。
- **工具**：`node tools/combat_stamina_feedback_audit.js` → `tools/战斗体力提示审计.md`。**三个踩坑**：① effect 可能是函数**直接改写 `vars.strength`**（非返回 `{add}`），只读返回值会漏检；② 检测"文案暗示"前必须**剥掉系统提示行**（`replace(/<span[^>]*>【系统提示】[^<]*<\/span>/g,' ')`），否则提示里的"体力"二字被误判成正文暗示；③ 结局判定要用「id 以 `结局` 开头 **或** 文案含 `—— 结局：`」，否则 `三林安居苑-厨房危险` 这类会被当成普通失败节点混入统计。

## 5. 丧尸气味
**气味与成因对齐，「甜腻」不是通用丧尸味。** 0–2天=血腥铁腥/汗酸馊/尿骚粪臭（味淡近距）；2–7天=闷厚腐肉臭+臭鸡蛋+组织液湿腥（几十米可闻，预警信号）；>1周=干腐味（霉木+陈旧干血），有蛆虫才叠**甜腻**；化工毒气=甜腥/甜酸；变质食物=馊味/酸腐。
**「甜腻」保留给**：长蛆老尸（张江川杨河/大桥尸群、仁济南院太平间）、明确交代的化工毒气（金谊广场B2、五金店、张江华大工位C）。

## 6. 战斗
- **徒手化**：默认允许徒手，除非文案表明对方不好惹。改法＝选项文字动态化（`hasMeleeWeapon ? "抄起X" : "徒手…"`）+ onEnter/text 分支，**勿新增场景**（击杀标记靠场景名 `_visit` 或场景内 set，换名会断联动）。徒手代价包：`{ add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true } }`。待拍板：安居苑驱猫/入户×6户、图书馆办公室。
- **B 类体力门槛失败结局**：只给"被动迎战"的情节拆 `-力竭` 结局（主动攻击的不拆）。**只改体力分支的 elseScene 指向，原结局节点一律不动**（多数结局是共享节点，如「结局-被丧尸扑倒咬死」覆盖所有战斗失败/QTE超时）；结局显示名与原结局一致；原结局变孤儿则删节点。文案用身体失控间接暗示（"膝盖像灌了铅"），不直说"体力不足"。

## 7. AI 雷同表述
- **禁再增**：纹丝不动(19)、安静下来(19)、不再动弹(16)、屏住呼吸(18)、火辣辣地疼(7)、「像是」比喻引子(86/砍半)、泛着…光(17)、该拿的都拿了、衣摆猎猎作响、苍蝇在低空盘旋、在这座沦陷的城市里、安静得有些XX、静得反常。
- **降频**：安静系(≈170)、散落(62)、缓缓(47)、似乎/隐约/几乎、死死/狠狠/反手、东倒西歪(22)、应急灯「惨白的光」、三连列举「A、B、C」。
- 文风基准 张江.js；工具 `tools/ai_phrase_scan*.py`。

## 8. QTE 口径（2026-09-21）
- **场景级** = 场景对象自带 `qte`（engine.js:822）；**选项级** = `choice.timeout`（闪色题）。独立统计。现 90 / 41 处。
- 复用工厂：`mallQTE`（新达汇）、`jpChaseQTE(pred)`（建平）、`travelScene`（过场自动播放，**无选项的 hidden QTE 节点引擎不入历史**）。追逐工厂规则：`chasedByZombies <= 0` 不启动，`timeout = max(2000, 20000 - ch*2000)`。
- 工具：`node tools/qte_report.js` → `tools/场景级QTE分布报告.md`。新增 QTE 优先用现有工厂。

## 9. 场景抖动 shake（2026-09-21 铺开至 31 处）
- 引擎在 `renderScene` 里**独立于 `applyEffect`** 判断（engine.js:1195）。`applyEffect` 只认 `set/add/mul`，**`shake` 被静默忽略** → `onEnter: { set:{...}, shake:true }` 并存安全。
- 三条通道：① `onEnter:{shake:true}`；② 函数式内 `triggerShake()`（**必须保留原有 return**，如 `return updateTime(1)(vars)`，漏掉会静默丢时间推进）；③ 闪色 QTE 用 `initMemoryGame(colors, len, { shake:true })`——utils.js:411 把第 3 个 effect 参数**原样 return**，全库闪色开场通用，无需包函数。
- **只加「进入瞬间玩家没预期」的场景，分支场景必须加条件**（否则二次进入莫名震动）。三个范式：`!(vars._visit['X-清场'] > 0)`、`!vars._wearingCleanSuit && !(vars._visit['X-围攻-胜'] > 0)`、`if (vars.FamilymartHasZombie)`。
- **禁加**：高频反复进入的枢纽（三林路/各十字路口/新达汇走廊）、纯远距离观察铺垫。**全库上限 25–35 处**，已到 31，停止扩张。
- 待办：反派 NPC 3 处（`反派NPC.js:29 路霸-堵路` 建议不加——"缓慢施压"型语义不贴）。报告 `tools/抖动动画适用位置推荐.md`。
- **改剧情后若新调用了 engine 全局函数，`tools/condition_audit.js` 沙箱要补桩**（已含 `flashStatusWarning/flashStatus/showToast/notify/triggerShake`），否则假报 `X is not defined`。

## 11. 天气系统（2026-09-22 实测）
- `weather` 是普通变量，控制台写值**生效**；唯一的改写方是 `utils.js:86 updateWeather()`，由 `utils.js:29 updateTime()` 在**跨整点**或**单步 mins>=60** 时调用。雨→50% 阴、阴→6-11点30%晴/12-17点35%雨、晴→12-17点30%雨/20%阴。**雨只能转阴**，看起来像"被还原"。
- 调试要连同 `showRain=true` 一起设：`engine.js:1148` 每场景无条件清零，雨滴 CSS 类条件 `weather=="雨" && showRain`。
- 户外场景 `engine.js:1160` 自动 `applyWeatherDrain()`（扣体力/受凉值），测试时属预期掉血，不是 bug。

## 12. 过夜系统（安全屋）门槛口径（2026-09-22 定稿）
- **`天黑必须过夜` 共 29 个选项**，入口在 `夜晚剧情.js`。建筑类过夜点用**两层门槛**：① `showCondition` 加 `_visit['建筑内部场景'] > 0`（没去过 = 选项不出现）；② `condition` + `elseScene` 原样保留（去过但没清场/没钥匙 = 仍会死，保留死亡陷阱）。**就地过夜**（`currentPos` 已在店内）与**区域兜底**不加第①层。
- 已加门槛 8 处：理发店 `'理发店内部'`、全家 `'全家便利店（环林东路）'`、联华超市 `'联华超市'`、安居苑 `'三林安居苑-小区内部'`、图书馆 `'图书馆'`、深夜食堂 `'新达汇-哥哥的深夜食堂'`、上科大 `'张江-上科大-校门'`、金谊2F `'金谊广场-2F-休息'`。
- **深夜食堂 cond = `_yorozuyaUnlocked || hasDoorKey1`**：`_yorozuyaUnlocked` 的语义是"门当前没上锁"，店里选「锁好门」会把它置 false，只看它会让带钥匙的玩家夜里被判定进不去。
- **工具**：`node tools/overnight_shelter_audit.js`（过夜选项门槛分级 + 全库 `_visit` 悬空键 + 失效跳转），报告 `tools/过夜系统审计报告.md`。脚本两个注意：扫描要跳过 `//` 注释行；校验跳转要忽略 `{positionAfterOperation}`/`{_sprintDest}` 占位符。
- **`_visit` 键必须等于真实场景 ID**。清掉的 4 个悬空键：`'小超市'`→`'联华超市'`、`'4F电梯厅'`→`'新达汇-4F南走廊东'`、`'全家-喝饮料腹泻'`→`'结局-全家-喝饮料腹泻'`、`'金谊广场-B1奥乐齐-搜刮'`→`'...-搜刮-吃完'`。
- **改 `_visit` 键名前必须算首达路径**：`新达汇-4F南走廊东` 的判据是 `==1 / >1`，若以为是 `'新达汇-4F电梯厅'`，从北走廊东绕进来的玩家计数为 0 → 两个条件同时为假 → 0 选项 → `engine.js:1004`「没有可行的选择……剧情终止」。全库同款计数写法都是**自引用本场景 ID**；`_visit` 在 `engine.js:1144` **先自增、后渲染 text/choices**，故 `_visit['本场景'] === 1` = 首次进入。
- 遗留：`story/尸潮安全屋.md` 仍 v2 过期（已加顶部提示）；「9 个悬空场景 ID」待办清掉 4 个。

## 10. 待确认
- 樱桃苑民防日记「7月14日…被困第十四天」vs 开局 6/29，第 1–2 天即可读到 —— 是否有意伏笔？
