# 尸潮笔记 · 项目长期约定

## 背包容量体系现状与缺陷（2026-09-20 审计）

- **现状**：`bagVolume` 初始 3（core.js:97），`hasBag` 布尔量表示「是否有背包」。3 处给予 +1 的场景：安盛街-文具店铁柜（安盛街.js:950，帆布袋，updateTime 15）、新达汇-2F杂物间-帆布包（新达汇.js:3799）、三林安居苑-卧室-仔细（安居苑.js:1573）。
- **⚠ 核心缺陷**：3 处闸门**全部用 `!hasBag`**，而全库**没有任何一处把 `hasBag` 重置回 false**（core.js:715「丢下帆布包」要求 hasBag 为真才显示、且代价是掉容量，玩家不会主动点）。**结果：全流程容量上限只能 +1（3→4 格）**，且三处分布在不同支线、彼此互斥。这就是「扩容机会太少」的根因。
- **`hasBag` 全部 4 个引用点**（改造时必须一并处理）：core.js:715（丢下帆布包）、core.js:151（定义）、新达汇.js:3799、安居苑.js:1573（showCondition），安盛街.js:940（text 分支按 hasBag 改写文案）、安盛街.js:950（showCondition）。
- **统计口径**：`tools/bag_scan.py`（全量，含噪音 266 处）→ `tools/背包提及清单.md`；`tools/bag_scan2.py`（精筛，真实容器表述 99 处）→ `tools/背包提及清单_精筛.md`。分类：可背容器 76 / 手提容器 3 / 袋类 20（另有 12 处在代码注释里）。文件分布 Top：安盛街 19、建平中学 18、core 13、新达汇 12、安居苑 10。
- **改造候选（优先级 A，场景已有包、只需补效果）**：安居苑 8 号楼 203 室「敞开的双肩包」（安居苑.js:625/695-699，现只拿门禁卡+采样管+口罩）；建平 高三/高一教室「书包散落一地」（建平中学.js:3087/3186）；上实南校走廊「书包水杯散落一地」（上实南校.js:73）；建平门卫室外卖纸袋（建平中学.js:3503）。建平台阶坐区那排无主背包（建平中学.js:2305/2496）有失忆女生伏笔，**慎动**。
- **多级扩容改造建议**：`hasBag` 布尔无法叠加，需改为 `hasCanvasBag/hasBackpack/hasHikingPack` 各自独立布尔 + `bagName` 显示名，闸门用各自的 `!hasXxx`（**不可再用 `!hasBag`**，否则又互斥）；或改数组 `bags:[]` 并把 `bagVolume` 做成 computed 派生值（参考 `_reactive.computed` 注入做法）。
- 详见 `tools/背包容量道具候选评估报告.md`。

## 剧情变量的唯一来源与条件表达式陷阱（2026-09-20 确立）

- **铁律**：`storyData._variables` 是 `gameState` 的唯一来源（engine.js:194 `initGameState()` 深拷贝）。**没写进 `_variables` 的变量名，一旦出现在条件表达式里就是 ReferenceError**，且引擎 `checkCondition` 把整条表达式包进 `new Function` 一次求值——**一个名字没声明，整条表达式就抛错、选项直接不显示**（不是渲染成 false），报错信息只打印表达式文本，极易误判成表达式里第一个变量的问题。
- **例外（勿当 bug 修）**：`_reactive.computed` 里的 7 个派生变量不进 `_variables`，只在运行时注入——`canSee` / `hasFood` / `hasMeleeWeapon` / `hasNoTransportation` / `meleeWeaponTier` / `zombieAtHomeDoor` / `zombieOutsideHome`。静态审计脚本必须先注入 computed 再判定，否则全是假阳性。
- **回归工具**：`tools/condition_audit.js`（vm 沙箱加载 utils+core+23 剧情文件 → 深拷贝（Set replacer/reviver）→ 注入 computed → 全量求值所有 showCondition/condition，并对 text/onEnter/effect/onPick 函数体实调一次抓 ReferenceError 与「写入未声明变量」）。改动剧情后务必复跑，期望输出两个 0。
  - 沙箱踩坑：vm 内 `sandbox.storyData` 取不到，须 `vm.runInContext('storyData', sandbox)`；本环境 `path.resolve(__dirname,'..')` 失效，用 `process.cwd()`；`flashStatusWarning` 等 engine.js 全局函数要补桩。
- 2026-09-20 修复存档：补声明 8 个漏网变量（`_wiredCorrectly`/`_garageOps`=0/`_pipeBroke`/`_metPETeacher`/`_peTeacherDead`/`_knownSideDoorPassword`/`_foundHongContact`/`_libraryEnding`），消除 40 处报错，变量总数 263→271；其中 `_pipeBroke`、`_libraryEnding`、`_knownSideDoorPassword` 修复前会让对应选项**全部消失导致卡死**。

## 丧尸气味的写作规范（2026-09-18 确立）

**核心规则：气味与成因必须对齐，不能把「甜腻」当通用丧尸味默认值。**

| 气味来源 | 用词 | 出现条件 |
| --- | --- | --- |
| 尸体腐败（早期 0–2 天） | 血腥铁腥 · 汗液酸馊 · 尿骚粪臭 | 味淡、扩散近，要贴到跟前才闻得到 |
| 尸体腐败（中期 2–7 天） | 闷、厚重、黏稠的腐肉臭 + 臭鸡蛋（硫化氢）+ 组织液湿腥 | 几十米外可闻，是预警信号 |
| 尸体腐败（晚期 >1 周） | 干腐味（霉木 + 陈旧干血），腐肉味反而变淡 | 有蛆虫才叠加**甜腻** |
| 化工品 / 毒气 | 甜腥 · 甜酸（发馊的甜、捂坏的果酒） | 「甜」在此处的正当来源 |
| 变质食物 | 馊味 · 酸腐 · 酸败 | — |

**「甜腻」是保留词**：全游戏只用于①长蛆的老尸（张江川杨河/大桥尸群、仁济南院太平间）②明确交代为化工毒气的场景（金谊广场 B2、五金店、张江华大工位C 的鼓腹毒气型）。早期场景一律不用。

**次级规划（已提出，尚未全面落地）**：气味可进一步与丧尸类型绑定——毒气型 = 发酵甜酸/化工甜腥，黑皮（高汞负荷）= 金属腥，普通型 = 随时间由血腥走到腐肉。

## 连续移动疲劳台账语义（2026-09-20 修订）

- 疲劳属于「当前这一段连续移动」：`_fatiguePaid` 不再「只增不退」，travel-fatigue 规则在 tier→0 跳变时自动清零台账，休息/吃饭/躲藏/过夜归零 `_travelMinutes` 后下一段从第 1 档重新计费（旧版按历史最高档计费会让疲劳付满 5 档后整局失效，已废弃）。
- 剧情代码仍只归零 `_travelMinutes`、勿手动动 `_fatiguePaid`（全库 40+ 归零点无需改动）；规则必须保持无 condition。

## 待确认的时间线疑点

- `story/东明街道/樱桃苑（初始小区）.js` 民防设施日记写「7月14日（或者15日）… 被困第十四天」，但游戏开局为 6/29，玩家第 1–2 天即可读到该日记。需确认是否为有意的时间线伏笔（游戏核心设定含时间回溯/多周目机制，有可能是有意为之）。

## 体力系统压力评估工具（2026-09-20 落地）

- 三件套：tools/stamina_audit.py（静态审计→体力收支审计报告.md，174 变动点）、tools/stamina_report.py（遥测 JSONL 聚合，--selftest 自测 9 项）、tools/stamina_telemetry_selftest.js（Node 冒烟回归 9 项）。
- 遥测在 engine.js 末尾（Proxy 捕获全部 strength 写入）+ 三处 __wrapState 包裹点（196 新局/769 回溯/1381 读档）+ utils.js restRecover 的 restBlocked 事件；工作流：游玩 → 控制台 __dumpStaminaLog() → python tools/stamina_report.py <jsonl>。
- **⚠ 引擎改动约束**：遥测块只能追加在 engine.js 末尾，三处包裹点保持单行——中间插行会破坏 stamina_report.py 的 KNOWN_SITES 行号归因（engine.js 209-214/641-646 等区间映射）。STAMINA_TELEMETRY=false 整体关闭。
- **⚠ KNOWN_SITES 同时含 core.js / utils.js / 夜晚剧情.js 区间**（不止 engine.js）。**在 story/core.js 的 `_variables` 里增删行会让下方所有 core.js 行号整体平移**，必须同步校正 KNOWN_SITES 的 core.js 区间，否则来源标签静默错位（不报错、只是归错类）。`stamina_audit.py` 是当场重扫、行号自算，不受影响；`stamina_telemetry_selftest.js` 靠标记串定位遥测段，也不受影响。**校验手法**：写脚本读各文件、检查每个区间内是否确实存在 `strength` 写入行（engine.js 两处例外——它们是通用 `for (let key in effect.add)` 动态键名循环，不含字面 `strength`，属正常）。
- 2026-09-20 校正：因在 core.js:61 插入 8 行变量声明（+8 平移），KNOWN_SITES 的 5 个 core.js 区间全部重定位，并顺带修好 2 处**本次改动前就已漂移**的旧区间、补 1 条进食场景合并区间、修正 utils.js 天气区间上限（177→180，否则漏掉 178 行的 `strength -= drain`）。同时更新 `--selftest` 里的 mock 行号（`core.js:449`→`373`、`core.js:1224`→`1157`）。
- 回归口令（改剧情后建议全跑）：`python tools/stamina_audit.py`、`python tools/stamina_report.py --selftest`、`node tools/stamina_telemetry_selftest.js`、`node tools/condition_audit.js`、`node tools/unarmed_fight_selftest.js`——期望 0 失败、两个 0。

## AI 雷同表述限用清单（2026-09-19 全库排查，详见 tools/AI雷同表述排查报告.md）

写新剧情时规避以下 AI 指纹（次数为当时全库存量）：

- **禁再增**：纹丝不动(19)、安静下来(19)、不再动弹(16)、火辣辣地疼(7)、屏住呼吸(18)、像是比喻引子(86，砍半目标)、泛着…光(17)、该拿的都拿了(4)、衣摆猎猎作响(2)、苍蝇在低空盘旋(2)、在这座沦陷的城市里(3)、安静得有些XX(4)、静得反常(4)。
- **降频**：安静系(≈170)、散落(62)、缓缓(47)、似乎/隐约/几乎、死死/狠狠/反手、东倒西歪(22)、应急灯「惨白的光」、三连列举「A、B、C」。
- 文风基准：张江.js（密度3.4/千字，全库最低）；反面教材：仁济南院(13.8)、utils.js 全局天气文案(10.3，全游戏高频出现)。
- 排查工具：tools/ai_phrase_scan.py / scan2 / scan3 可复跑。

## 战斗徒手化改造约定（2026-09-20 落地 4 处）

- 用户原则：战斗默认允许徒手，除非场景文案表明对方不好惹（如全家迅捷丧尸保留"用钢管打它"门槛）。
- 统一改法（勿新增场景）：选项文字动态化（hasMeleeWeapon ? "抄起X" : "徒手…"），同一击杀场景内 onEnter/text 按 hasMeleeWeapon 分支——击杀标记多靠场景名（_visit）或场景内 set（_stationeryZombieDead），换场景名会断联动。
- 徒手代价包（全库标准）：{ add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true } }；体力门槛（如 strength>=3/2）对武器和徒手同等生效，虚弱走原反杀结局。
- 已改：收银台/食品店（徒手抓伤）、菜市场大厅+潜行、药房柜台后（徒手无代价）；回归：tools/unarmed_fight_selftest.js（34 断言，vm 沙箱加载真实 utils+剧情文件，未定义全局自动补桩）。
- 尚未改的边缘项：安居苑驱猫、安居苑入户×6户、图书馆办公室——待用户拍板。

## 变量 ↔ _visit 替换（2026-09-20 审计+落地完成，详见 tools/变量_visit替换审计报告.md 与 变量替换应用日志.md）

- **A1 已批量替换 89 个**（tools/variable_visit_replace.py --apply，改 18 个 story 文件、删 core.js 定义 89 个，_visit 用法 138→430）：56 个 onEnter 对象式自动 + 33 个目检 OVERRIDE（含 _chenmoRescued=initMemoryGame effect 无条件应用）。**总量 352→263**。
- **15 个保留变量勿再替换**：_policeGunTaken（onEnter 内"首次进入"判断，_visit 提前累加会 off-by-one）、_supermarketCompromised/_xinDead/teacherStudentsDead/wangGiveKey（条件写入）、_jinyiSurvivorsFed/Robbed（互斥条件）、_paraffinTaken/_drawerVitaminTaken/_jinbaobeiFrontOpen（写入场景=当前场景自身，_visit 先累加会误吞选项）、fightWithVineZombie（三入口不同 nextScene）、_airlockAlarmRang/_airlockAlarmZombie（条件+同场景 text 分支）、_lijuanCupTold（dd<3 且首访）、_fangDieselGiven（nextScene 非专属）。
- 替换读点惯用法：函数式 `vars.x` → `(vars._visit['场景'] > 0)`；条件字符串裸名 `x` → `_visit['场景'] > 0`；`!x` → `!_visit['场景']`（条件字符串内单引号写法已有先例）。_visit 只读不写；新剧情一次性标记优先用专用子场景 + `_visit['场景'] > 0`。
- 工具：tools/variable_visit_audit.py（审计分级，可复跑）；variable_visit_replace.py（OVERRIDE 白名单机制，改写时须带「删除后残留校验+失败即 SystemExit 中止+两阶段统一写盘」三件套——第一版缺这些曾产生 9 个语法损坏文件，靠 node --check 验证抓出）。
- A2 拆子场景后 1（_sleepingZombieGone）；A3 持有/线索类 14 勿换；B 需重构 25；C 166；D 计数型 6（visitExitTimes/visitWaitingRoomTimes 是手写 _visit 重复造轮子，优先换）。
- **9 个"写而不读"变量待用户拍板**（有写入、全库无读取）：isWeak、_jinyiB2GasWarned、_pengGalWqxSeen、_quackTradedDay、_fangWarnRoadBull、_chefCleared、_jinbaoCommission、_jinbaoFed、shoes。其中 _quackTradedDay/_fangWarnRoadBull 注释声称防重复但读取逻辑不存在（疑似 bug：郎中同天可重复买、方姐重复提醒）。
- 遗留：_visit 引用中有 9 个场景 ID 在两空格缩进扫描中不存在（小超市、全家-喝饮料腹泻、4F电梯厅×6、金谊广场-B1奥乐齐-搜刮），替换前已存在，疑为真实悬空引用或缩进变体，待排查。
- 备份：.workbuddy/backup_story_20260920/story/（替换前全量 24 个 js）。
