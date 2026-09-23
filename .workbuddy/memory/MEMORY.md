# 尸潮笔记 · 项目长期约定

> 只留必须遵守的规则；细节底稿见 `tools/` 各报告与 `.workbuddy/memory/每日日志`。

## 1. 剧情变量（铁律）
- **`storyData._variables` 是 `gameState` 唯一来源**（engine.js:194）。条件里出现未声明的名字 → 整条 `new Function` 抛错 → `checkCondition` 返回 false → **选项直接不显示**（不是 false），且报错只打印表达式文本，**报错里的第一个变量往往是冤枉的**，必须全量审计。
- 例外：`_reactive.computed` 的 7 个派生变量（canSee/hasFood/hasMeleeWeapon/hasNoTransportation/meleeWeaponTier/zombieAtHomeDoor/zombieOutsideHome）不进 `_variables`，审计脚本须先注入。
- 需要新派生值时**优先写成 utils.js 普通函数**（如 `cuttingToolName(vars)`），别加 computed——否则又给审计加假阳性来源。
- **双审计**：`node tools/condition_audit.js`（期望两个 0，只管**字符串**条件）；`node tools/scene_fn_selftest.js`（期望 0 异常，管**函数式** text/choices/condition/nextScene——condition_audit 对函数式**整段跳过、假绿**）。
- 沙箱坑：须 `vm.runInContext('storyData', sandbox)`；用 `process.cwd()`；engine 全局函数要补桩（已含 `flashStatusWarning/flashStatus/showToast/notify/triggerShake`），否则假报 `X is not defined`。
- 计数器初值必须 `0`（用 `add` 累加）；布尔 `false`；字符串 `""`。
- **第三审计（选项状态可视化缺口）**：`node tools/sprint_away_audit.js`（期望 **0 处 P0**）。查"选项显示依赖某状态，但把该状态讲给玩家的通道漏写"→ 玩家看到凭空冒出的选项。这类 bug **不报错**，`condition_audit` 与 `scene_fn_selftest` 都看不见。做法＝劫持工厂给选项打标记反查场景 + 劫持 `describeZombieWave` 打探针，在多状态实跑 `text`，**探针非空才算"玩家看得见"**。现 2 处 P0：`安盛街东侧`（安盛街.js:50/61）、`三林安居苑-小区内部`（安居苑.js:217/226）。

## 2. 战斗
- **徒手化**：默认允许徒手，除非文案表明对方不好惹。改法＝选项文字动态化（`hasMeleeWeapon ? "抄起X" : "徒手…"`）+ onEnter/text 分支，**勿新增场景**（击杀标记靠场景名 `_visit` 或场景内 set，换名断联动）。徒手代价包：`{ add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true } }`。
- **B 类体力门槛失败结局**：只给"被动迎战"的情节拆 `-力竭` 结局（主动攻击的不拆）。**只改体力分支的 elseScene 指向，原结局节点一律不动**（多数是共享节点）；结局显示名与原结局一致；文案用身体失控间接暗示，不直说"体力不足"。
- 核心数值：成功成本 `combatCost`（utils.js）= `meleeWeaponTier >= 2 ? 1 : 2`；失败包 = 体力 −1~−3 + 汞负荷 +10~+15 + `hurtByZombie` + `tryBreakWeapon`（弱 50%/中 25%/强 10%）。
- 惩罚可能写在**节点 onEnter** 或**选项 effect** 两处；失败分支三来源：选项 `elseScene`、`timeoutScene`、**场景级 `qte.onTimeout`**（最易漏）。工具 `tools/combat_penalty_report.js` → `tools/战斗惩罚审计报告.md`。`isEnding()` 用「id 以『结局』开头 **或** 文案含『—— 结局：』」判定，别用「无 choices」。

## 3. 背包容量
- 容量 = `3 + _bagTier + _bagExtra`；`bagVolume` 是 computed 派生值，**永远不要 set/add**。
- `_bagTier` 0=背包(3)/1=双肩包(4)/2=书包(5)，用 `set`；**闸门用 `vars._bagTier < N`，不用 `!hasXxx`**。
- `_bagExtra` 帆布袋 +1，闸门 `!hasBag`，三处入口不互斥。全库统一叫「帆布袋」。
- 拾取四件套：`condition:"itemCount < bagVolume"` + `effect:{set:{...},add:{itemCount:1}}` + `elseScene:"整理整理"`；**新节点必须 set `positionAfterOperation`**，否则背包满时走 `整理整理` 会掉进空场景。

## 4. 体力系统
- **⚠ 遥测块只能追加在 engine.js 末尾，三处 `__wrapState` 包裹点保持单行**（196 新局 / 769 回溯 / 1381 读档），插行会破坏 KNOWN_SITES 行号归因。
- **来源归因已改为「内容锚定」（2026-09-23）**：`stamina_report.py` 每次运行扫源码定位入口行（函数声明 / 规则 id / 场景对象键 `"X": {`），**core.js/utils.js 增删行后无需再手动校正行号**。跑 `--list-anchors` 可查看解析结果与未命中项；`--selftest` 含锚点校验。**注意：场景锚点必须带 `: {` 后缀**——裸 `"场景名"` 会先撞到 `nextScene` 字符串引用（与 `_visit` 键名同类陷阱）。
- 疲劳属「当前这段连续移动」：tier→0 自动清零 `_fatiguePaid`；剧情代码只归零 `_travelMinutes`，**勿手动动 `_fatiguePaid`**。
- **体力提示**：引擎**无任何自动提示**（`flashStatusWarning()` 只管环境消耗；战斗失败一处也没有）。手写三条通道：① 系统提示行 ② 正文身体描写 ③ 选项文字标「（体力-N）」。标准样式（橙）：`<span style='color: #ffaa00; font-style: italic;'>【系统提示】体力-N，当前体力：{strength}。</span>`（`{strength}` 由 engine.js `interpolateDisplay()` 渲染，**数组 text 每段独立插值**）。**死亡结局节点不补**。工具 `tools/combat_stamina_feedback_audit.js`。
## 5. 天气（2026-09-22 实测）
- `weather` 是普通变量，控制台写值**生效**；唯一改写方 `utils.js:86 updateWeather()`，由 `utils.js:29 updateTime()` 在**跨整点**或**单步 mins>=60** 时调用。雨→50%阴、阴→6-11点30%晴/12-17点35%雨、晴→12-17点30%雨/20%阴。**雨只能转阴**，看着像"被还原"。
- 调试要连同 `showRain=true` 一起设：`engine.js:1148` 每场景无条件清零，雨滴 CSS 类条件 `weather=="雨" && showRain`。
- 户外场景 `engine.js:1160` 自动 `applyWeatherDrain()`（扣体力/受凉值），测试时属预期掉血。
- **户外节点雨天铁律**：`outdoor:true` 必须三选一——① image 为 `images/placeholder.png`；② **本场景 `onEnter`** 开 `showRain`（**选项 effect 里开无效**）；③ 路径含「雨」的专属雨天图。工具 `node tools/rain_image_audit.js`。
- **`timeImage(map)` 是工厂**：必须 `var f=timeImage({...}); return f(vars);`。漏 `(vars)` → image 返回函数对象 → **该节点全天气坏图**（金谊广场 4 处已修）。

## 6. 过夜系统（安全屋）门槛口径
- **`天黑必须过夜` 共 29 个选项**（入口 `夜晚剧情.js`）。建筑类过夜点**两层门槛**：① `showCondition` 加 `_visit['建筑内部场景'] > 0`（没去过 = 不出现）；② `condition` + `elseScene` 原样保留（去过但没清场/没钥匙 = 仍会死）。**就地过夜**与**区域兜底**不加第①层。
- 已加门槛 8 处：理发店 / 全家（环林东路）/ 联华超市 / 安居苑 / 图书馆 / 深夜食堂 / 上科大 / 金谊2F。
- **深夜食堂 cond = `_yorozuyaUnlocked || hasDoorKey1`**：`_yorozuyaUnlocked` 语义是"门当前没上锁"，选「锁好门」会置 false，只看它会误杀带钥匙的玩家。
- 工具 `node tools/overnight_shelter_audit.js`（过夜门槛分级 + 全库 `_visit` 悬空键 + 失效跳转）→ `tools/过夜系统审计报告.md`。脚本须**跳过 `//` 注释行**；校验跳转忽略 `{positionAfterOperation}`/`{_sprintDest}` 占位符。

## 7. `_visit` 使用铁律
- **`_visit` 只读不写**（引擎自增）。惯用法：`vars.x` → `(vars._visit['场景'] > 0)`；`!x` → `!_visit['场景']`。
- **键名必须等于真实场景 ID**。悬空键**不报错**、条件恒假 → 选项永不出现、场景零选项「剧情终止」，`condition_audit.js` 完全看不见。已清 4 个：`'小超市'`→`'联华超市'`、`'4F电梯厅'`→`'新达汇-4F南走廊东'`、`'全家-喝饮料腹泻'`→`'结局-...'`、`'金谊广场-B1奥乐齐-搜刮'`→`'...-搜刮-吃完'`。
- **改计数键名（`==1 / >1`）前必须算首达路径**：全库同款写法都是**自引用本场景 ID**（`_visit` 在 engine.js:1144 **先自增、后渲染**，故 `=== 1` = 首达）。误改成"上一个场景"会让计数为 0 → 两条件同假 → 0 选项 → engine.js:1004「没有可行的选择……剧情终止」。
- 15 个变量**保留勿换**：_policeGunTaken、_supermarketCompromised、_xinDead、teacherStudentsDead、wangGiveKey、_jinyiSurvivorsFed/Robbed、_paraffinTaken、_drawerVitaminTaken、_jinbaobeiFrontOpen、fightWithVineZombie、_airlockAlarmRang/Zombie、_lijuanCupTold、_fangDieselGiven。
- 待拍板：9 个"写而不读"变量（_quackTradedDay/_fangWarnRoadBull 疑 bug）；`_visit` 悬空场景 ID 剩余待认领。

## 8. QTE 口径
- **场景级** = 场景对象自带 `qte`（engine.js:822）；**选项级** = `choice.timeout`（闪色题）。独立统计，现 90 / 41 处。
- 复用工厂：`mallQTE(base, onTimeout)`（新达汇）、`jpChaseQTE(pred)`（建平）、`travelScene(text, next, options)`（过场自动播放，**无选项的 hidden QTE 节点引擎不入历史**）。追逐工厂：`chasedByZombies <= 0` 不启动，`timeout = max(2000, 20000 - ch*2000)`。
- 工具 `node tools/qte_report.js` → `tools/场景级QTE分布报告.md`。判工厂场景要用**运行时 `typeof node.qte`**，别用源码正则。

## 9. 场景抖动 shake（已 31 处，停止扩张）
- 引擎在 `renderScene` 里**独立于 `applyEffect`** 判断（engine.js:1195）。`applyEffect` 只认 `set/add/mul`，**`shake` 被静默忽略** → `onEnter:{set:{...},shake:true}` 并存安全。
- 三条通道：① `onEnter:{shake:true}`；② 函数式内 `triggerShake()`（**必须保留原有 return**，漏掉会静默丢时间推进）；③ 闪色 QTE 用 `initMemoryGame(colors, len, {shake:true})`（utils.js:411 把第 3 个 effect 参数原样 return）。
- **只加「进入瞬间玩家没预期」的场景，分支场景必须加条件**（否则二次进入莫名震动）。范式：`!(vars._visit['X-清场'] > 0)`、`!vars._wearingCleanSuit && !(vars._visit['X-围攻-胜'] > 0)`、`if (vars.FamilymartHasZombie)`。
- **禁加**：高频反复进入的枢纽（三林路/各十字路口/新达汇走廊）、纯远距离观察铺垫。**全库上限 25–35 处**，已 31。报告 `tools/抖动动画适用位置推荐.md`。

## 10. 水瓶 / 道具经济（2026-09-22 改造完成）
- 拾取点 **5 → 10**。新增 4 处：`新达汇-电梯厅贩卖机-捞空瓶`（`vendingBottleLeft` 上限 3）、`新达汇-1F后勤仓库-拿水`（`newdahuiWarehouseWaterLeft` 20 瓶，需割/锯工具划箱）、`新达汇-1F后勤仓库-已开封瓶`（箱外那瓶，徒手可取，**不消耗箱存**）、`建平-挹芬楼-3F-高一教室-空水瓶`、`仁济南院-特需病房-病床-带走`（满瓶脉动）。
- **割/锯工具清单**（`cuttingToolName(vars)`，utils.js，优先级序）：美工刀 > 匕首 > 斧头 > 螺丝刀。**不含**铁管/拐杖/拖把杆/扫帚（钝器）、`_hasAcid`（一次性链道具）、`钥匙`（上实南校 lore 明说划不开）。
- 后勤仓库**两层语义设计**：有割/锯工具 → 可开箱拿 20 瓶密封水（占背包格）；无工具 → 只能拿箱外已开封那瓶（空瓶当容器）。徒手开箱 → `-撕不开` 提示需要美工刀。
- **平衡已与作者确认**：联华超市 + 长者食堂（有饮水机）**可多次打水**（`_waterDispenserUses` 上限 10），所以水瓶**不是**紧平衡资源，真实难度来自来回赶路的体力消耗 → 加瓶不降难度。
- `bottleWater` 只有 0/1（0 空 / 1 满）；`_waterDispenserUses` 限制长者食堂打水次数。丢弃/送人必须同步清 `bottleWater`/`waterToxic`/`_hongBottleLabel` 三个附属变量。
- **两层语义别混**："水=食物"（成箱矿泉水 → `supermarketWaterLeft`/`restRecover`）≠"瓶=工具"（容器）。
- **双轨扫描法**（可复用）：轨1 扫 `hasBottle\s*[:=]\s*true` 拿权威拾取点（与措辞无关）；轨2 关键词普查。**只靠轨2 必漏**（「半瓶矿泉水」不含"水瓶/空瓶"却是真拾取点）。裸 `/瓶/` 会捞进电瓶车/酒瓶/药瓶/盐酸瓶，必须收紧；**别忘 `脉动`**。工具 `node tools/bottle_scan.js`。
- **禁忌**：`地铁站-声东击西`（一次性投掷）、`上实南校-图书馆-全灭`（情感 callback）、`新达汇-B1后勤走廊/配电房`（刘志鹏线索链 "瓶子朝门"）、`张江-上科大-曹睿泽宿舍`（桶装水=证据链）、`金谊广场-童涵春堂`（Hg 药瓶）、`新达汇-1F数码店`（高锦睿道具）。
- 保温杯是**另一套容器体系**（建平弘渊楼2F 已有喝水/灌瓶机制），未纳入 `hasBottle`。该校保温杯水**全是甲基汞毒水**。
- **遗留（待拍板）**：`联华超市-仓库-拿水` 拿瓶时**不加 `itemCount`** → 丢弃后会多出一个背包格（平衡决策，已记录未改）。
- **长线联动**：`上实南校-图书馆-给水`（上实南校.js:874）与 `益丰大药房-喂水`（:581）**每次吃掉一整个瓶子**，给水 5 次 → 轿车钥匙；`建平-弘渊楼-2F` 有「保温杯水灌进水瓶」分支（甲基汞陷阱）。

## 11. AI 雷同表述
- **禁再增**：纹丝不动、安静下来、不再动弹、屏住呼吸、火辣辣地疼、「像是」比喻引子、泛着…光、该拿的都拿了、衣摆猎猎作响、苍蝇在低空盘旋、在这座沦陷的城市里、安静得有些XX、静得反常。
- **降频**：安静系、散落、缓缓、似乎/隐约/几乎、死死/狠狠/反手、东倒西歪、应急灯「惨白的光」、三连列举「A、B、C」。
- 文风基准 `张江.js`；工具 `tools/ai_phrase_scan*.py`。

## 12. 丧尸气味
**气味与成因对齐，「甜腻」不是通用丧尸味。** 0–2天=血腥铁腥/汗酸馊/尿骚粪臭（味淡近距）；2–7天=闷厚腐肉臭+臭鸡蛋+组织液湿腥（几十米可闻，预警信号）；>1周=干腐味（霉木+陈旧干血），有蛆虫才叠**甜腻**；化工毒气=甜腥/甜酸；变质食物=馊味/酸腐。
**「甜腻」保留给**：长蛆老尸（张江川杨河/大桥尸群、仁济南院太平间）、明确交代的化工毒气（金谊广场B2、五金店、张江华大工位C）。

## 13. 汞中毒系统（2026-09-23 实装完成）
- **`mercuryLoad` 0-100**，已注册进 `_caps`（**隐藏变量必有上限；查此类变量必须同时 grep `_caps`**，漏注册不报错）。
- **`>= 70` 触发 `结局-汞中毒尸变`**（`_globalTriggers` priority 9）。另 2 处硬编码直跳（金谊广场 B2 未戴面具）与变量无关。
- **慢性累积 `mercury-chronic` 规则**：`condition: "mercuryLoad > 0"` → **被咬/喝毒水才启动**，未暴露者永不累积（因果链：被咬是开关，时间是放大器）。**每小时 +1**（作者定），load=10 起约 2.5 天到 70。台账 `_mercuryChronicHour`（规则自维护，剧情勿改）。
- **三个派生变量**（`_reactive.computed`，审计脚本自动注入，**新增此类变量无需改审计脚本**）：
  - `mercuryTier` 0/1/2/3（分档 **0/20/40/70**），判定函数 `mercuryTier(load)` 在 utils.js
  - `noPainSense` = tier≥2（痛觉消失）
  - `hasDimLight` = 手电 ∨ 手机有电 ∨ 高汞夜视
- **体征提示一律走正文，禁止 `flashStatusWarning`**（汞是隐性中毒，不是体力那种可量化消耗）：
  - 20-40 皮肤灰白 → 只在**能照见自己**的载体（新达汇-2F卫生间裂镜、理发店镜子）
  - 40-70 痛觉消失 → **文案反转**（"火辣辣地疼"→"你先看见的是血，不是疼"）+ `mercuryPainNote(vars)` 旁白池；颜色用灰 `#9aa0a6`（与橙色系统提示刻意区分）
  - 40-70 夜视 → 手电/手机光的**弱化版**：一律写明"只辨轮廓，看不清文字"，**不能替代手电**；真实收益仅 `新达汇-2F北走廊中` 椅子选项 `(canSee || noPainSense)`
- 减汞唯一手段：童涵春堂药丸 **−20**（`core.js` 整理整理-服药丸）。
- 工具：`tools/mercury_scan.js`（读写点普查）/ `mercury_selftest.js`（37 断言）/ `mercury_engine_e2e.js`（20 断言，**无头加载真实 engine.js，浏览器不可用时的替代 E2E**）。

## 14. 待拍板 / 遗留
- 樱桃苑民防日记「7月14日…被困第十四天」vs 开局 6/29，第 1–2 天即可读到 —— 是否有意伏笔？
- `story/尸潮安全屋.md` 仍 v2 过期（已加顶部提示）。
- 徒手化待拍板：安居苑驱猫/入户×6户、图书馆办公室。
- 反派 NPC 3 处 shake 待办（`反派NPC.js:29 路霸-堵路` 建议不加）。
- 水瓶待拍板：`联华超市-仓库-拿水` 的 `itemCount` bug（见 §10）。
- 汞系统可选扩展（未做）：更多倒影/水面载体（现仅 2 处镜子）；夜视的更多机制收益（**加多会让玩家"养汞"换夜视，与叙事冲突，需拍板**）。
