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

## 9. 待确认
- 樱桃苑民防日记「7月14日…被困第十四天」vs 开局 6/29，第 1–2 天即可读到 —— 是否有意伏笔？
