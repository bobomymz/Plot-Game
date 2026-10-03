# 尸潮笔记 · 项目铁律
> 细节见 `tools/*.md` 与每日日志；审计坑表见 skill。

## 变量/审计
- `_variables` 是 `gameState` 唯一来源；未声明名→条件抛错→**选项不显示**（非 false），报错常点错变量名，须全量审计。派生量放 `_reactive.computed`；新派生值优先写 utils.js 普通函数。初值：计数 0（add）、布尔 false、串 ""。
- 三件套：`condition_audit`(0/0)、`scene_fn_selftest`(0 异常)、`sprint_away_audit`(0 P0)；**清单唯一权威=`tools/story_files.js`**，新脚本禁硬编码 FILES。存档 `fillMissingDefaults`+`refreshComputed` 挂 `applySave`/`backtrack`；只新增变量不必 bump `SAVE_VERSION`，改字段含义必须 bump 或写反推迁移。

## 回溯（10-01 改落点）
- 落点=历史中**最近且当时有 ≥2 个可行选项**的节点（非栈顶；链状回上一节点=原路再死一次）。`countSceneChoices(id,state)`+`findBacktrackIndex()`；`backtrack()` 用 `historyStack.length=idx` 截断。
- ⚠判定必须用该条历史自带快照（先 `snapshotState` 深拷贝，防函数式 choices 副作用）。兜底：全单选项链 / 超出 `BACKTRACK_SCAN_CAP=60` → 栈顶。结局/零选项节点永不作落点。自测 `tools/backtrack_target_selftest.js`（20 断言，无头真引擎）。

## 战斗
- 徒手化＝改文案+onEnter 分支，勿新增场景；代价包 `{add:{strength:-2,mercuryLoad:10},set:{hurtByZombie:true}}`。`combatCost`=tier≥2?1:2；失败包=体力−1~−3、汞+10~+15、hurt、`tryBreakWeapon`。惩罚三处：onEnter、选项 effect、场景级 `qte.onTimeout`（最易漏）。`isEnding()`：id 以『结局』开头或文案含『—— 结局：』。
- **闪色战斗（全库 47 场）**：偏差=Σ|玩家报数−实际数|（绝对值）→ 0=胜/1~2=伤/≥3或超时=死。三档 `flashCombatRouter(胜,伤,死)`；非致死 5 场用 `flashCombatRouterSafe`；伤两形态 `hurtWinOnEnter`（1~2只干死）/`hurtFleeOnEnter`（3只+跑路）。惩罚工厂在 utils.js（汞+5×偏差封顶100）；受伤场景一律独立。路由闭包挂 `__sceneRefs` 供 lint 补入边。工具 `flash_battle_audit.js`/`flash_battle_selftest.js`。

## 背包/水瓶
- 容量=`3+_bagTier+_bagExtra`；`bagVolume` 派生永不 set/add；闸门 `vars._bagTier<N`/`!hasBag`。拾取四件套：`condition:"itemCount<bagVolume"`+`effect:{set,add:{itemCount:1}}`+`elseScene:"整理整理"`。
- ⚠⚠**引擎走 `elseScene` 时不执行选项 `effect`**（engine.js `createChoiceButton`）→ `positionAfterOperation` 必须由**入口场景 onEnter 预设**，不能放 effect。
- 休息整理：`restTidyChoice(id)`+`restTidyGuard(vars)`（utils.js）。**整理整理出口回入口→onEnter 重跑**，写核心状态量的入口必 guard（判定看是否写状态量：`onEnter:{add}`、`chasedByZombies=0/1`、`strength=…` 都算；`showPowerOut=true` 幂等不算）。⚠⚠`transit(v,pos)` 含回头检测（pos===`_prevPos2` 且被追→chased+1）→ 走廊/中庭类节点 onEnter 必 guard，否则返回重跑必白挨追兵。
- 割锯工具（`cuttingToolName`）：美工刀>匕首>斧头>螺丝刀（螺丝刀来源=建平杂物室/实验室锁柜+五金店侧窗）。不含铁管/拐杖/拖把杆。
- **可多持全库仅 3 件**：`instantNoodle` 0~3、`vitaminC` ≤9、`iodineSwabBox` 0~3。⚠判定看**获取闸门**不看初值类型：世界库存 `xxxLeft>0`=真堆叠；`!flag`/`_visit` 门控=单件。世界库存型 7 个非玩家持有。
- 布尔改计数须同步 `FOOD_GIFTS`+`foodGiftChoices`；⚠字段迁移块排在 `fillMissingDefaults` 循环**之前**（写后面=恒假死代码）。

## 体力/天气
- ⚠遥测块只能追加 engine.js 末尾，三处 `__wrapState` 单行；场景锚点带 `: {` 后缀。测量前必须 `__clearStaminaLog()`（日志跨版本混合、行号会漂）。归因：对象式规则→应用侧行号；函数式→真实赋值行。
- `weather` 唯一改写 `updateWeather()`；雨只能转阴。户外 `outdoor:true` 三选一：placeholder、onEnter 开 showRain（选项 effect 无效）、路径含「雨」专图。`timeImage(map)` 是工厂。

## ⭐引擎契约（踩过血的，别再犯）
- **`_lastScene` = 上一个渲染完成的场景（"来处"），不是"此刻站在哪"**。engine.js 只写一次（renderScene 开头 `gameState._lastScene = lastRenderedScene`，写完才把 `lastRenderedScene` 更新成新 id）。**任何"当前位置"判断都不能用它**——差别错位一格。10-03 我在搜车起点上搞反过一次（错误结论还写进了这条 MEMORY，已改）。要当前位置就在场景自己的 onEnter 里写专用变量（车库用 `_garageCurCell`）。**验证方式**：`tools/garage_redesign_selftest.js` 那套 vm 沙箱能直接调真实 `renderScene`（缺 `setInterval` 会抛错但那两行已先执行），别靠读行号推理。
- **跨区域别用 `currentPos` 字符串做判定**：`"地下车库"` 新达汇和建平中学都在用，撞名会把别的区域的代码/文案拉过来（10-03 修）。要么用 `currentPos` + `currentPlace` 组合，要么用专用状态位。
- **全局触发器（hh>=19 强制过夜）会绕过所有出口节点**——凡是"离开某区域才结算/清理"的状态，必须把清理放进共用的结算函数里（车库三条离库路径全汇到 `xdGarExitSettle`），不能只挂在出口场景的 onEnter。
- ⚠ **`onEnter`(1516) 早于 `text`(1581)**：onEnter 里自己清掉的键，同一场景的 text 就读不到了；要传给 text 就用文件作用域变量先存快照（如 `_xdNightInGarage`），或走 gameState。

## `_visit`/过夜/QTE
- 只读不写；键名必须=真实场景 ID（悬空键不报错、条件恒假→选项永不出现）。改计数键名前算首达路径。
- **一次性「开启/解锁」动作做独立节点**，用 `_visit['<动作节点>']>0` 记录；此后不再校验工具（世界状态已改变）。
- 入口描述差异化：多入度节点按 `_lastScene` 分流（样板`金谊广场.js`/`长者食堂.js`）。**先把默认句改成安全句，再加差异化**；电梯/楼梯来源别播推门动作。审计 `node tools/entry_desc_audit.mjs`；⚠判定覆盖须在剔除 nextScene 行的源码里搜来源名；已支持工厂节点+前缀匹配识别。⚠⚠**来源分支必须写完整场景 ID 字面量**——`XDGAR+"D区"` 这类常量拼接审计器识别不了（10-01 车库 C/D 区踩过）。
- **网状地图选项方向词**：静态"回X"在目标未到访的路线上穿帮→用 `xdGarGo(targetId, beenText, firstText)`（engine 支持 choice.text 为函数）按 `_visit[targetId]` 分流"回/去"；仅目标必经或单入边链才保留静态"回"。样板=`金谊广场.js`/`长者食堂.js`（车库 10-02 起改网格化，不再用 xdGarGo）。
- **车库网格化+方向系统（10-02 大改，样板=新达汇地下车库.js）**：9 宫格（北=上，邻接表 `XDGRID` 常量=唯一权威）+ `_garageFacing`(N/E/S/W) 朝向；分区移动选项按前/左/右/后相对方位表述（工厂 `xdCellScene`），无邻格方向槽位隐藏；**没有原地转身**（移动方向=新朝向；驾驶倒车 `_garageRev` 保持车头）。驾驶逃亡并入网格：`_driving` 态每格 -1 `_escapeOps`、贴沟格（西车道×2）离开额外 -1、POI 全隐藏；`_visit['新达汇-B1停车场-上车点火']` 键名保留（存档兼容）。**引擎新增 `scene.fixedChoices` 开关**（renderChoices 跳过 shuffle——方位选项不得乱序，其他场景不变）。跨文件入口：新达汇.js B1走廊→`新达汇-B1-入口平台`。自测 `tools/garage_redesign_selftest.js`（102 断言）；新格配图全是 placeholder 待补。方案与实施记录=`docs/区域方案-新达汇车库网格化与方向系统.md`。
- **搜车无中间节点（10-03）**：分区 POI 点下去直接出结果，原「搜车」hub 已删除。记账（起点+密度）在 `xdGarSearchGo()`（函数式 nextScene，挂 `__searchGo`/`__sceneRefs`），正文在 `xdGarSearchApproach(v)`，由四个结果场景拼在开头。⚠**起点读 `_garageCurCell`（每格 onEnter 写入），绝对不能读 `_lastScene`**。耗时：POI 4 分 /「换个位置再搜」3 分（原 2+2、1+2 合并，总耗时不变）。
- **车库 追兵⇄密度 换算闸门（10-03 波波拍板：进库清零/出库按 G 区密度/驾驶逃亡 0）**：**车库内一律用密度，禁止直接加减 `chasedByZombies`**，只在进出车库时换算——进库 `G += min(2, chased)` 且 `chased=0`；出库 `chased += (G>=3?2:(G>=1?1:0))` 且 **`G=0`（不清零会变永动机）**；驾驶冲出坡道 `chased+0` 但 G 清零。⚠出库累加**封顶 4**（`chased>=5` 是即死全局触发器）。闸门挂点：进=G 区 onEnter 的 `entryAnchor` 分支；出=G 区两步行出口（函数式 `xdGarExitTo`）+ `-冲出坡道` 的 onEnter（driveExit 与围堵两路都汇这里）。**边界依据**：步行层→外界只有 G 区两条边，selftest 第 11 节守着。
- **车库密度描写·视觉档（10-03 波波拍板：邻格只报最危险一格 / 报程度不报数字 / 全黑不给邻格）**：总入口 `xdGarDenHint(v,id)` 按光照分流——**lit/torch/驾驶车灯 → `xdGarSightDen`（当前格视觉，表 `XD_SEE_DEN`，**0 档静默**，1/2/3 档各 2~3 变体防刷屏）+ `xdGarNeighborHint`（只报最危险那一邻格，遍历序 前>左>右>后，平局优先正前）**。⚠0 档静默**只关当前格那一句**，邻格提示独立判定照常给（"本格安静但右边堵着"最有用）；本格+邻格都静默时整段返回 ""；**dim/dark → `xdGarNoise`（听觉档，水声）**。⚠⚠**听觉档必须留**：全黑下若零反馈+满格进格即死=处决不是难度。⚠邻格方位词用**相对方位**且与 `xdSignLine` 四向/选项槽位同序，**不报分区字母**（撞立柱漆字）。⚠勿复用 `canSee()`——车库通电是独立回路（`_wiredCorrectly`），一律走 `xdGarSight`。⚠**满档 d>=3 视觉文案几乎看不到**（`xdCellEntry` 会先拦截），只有驾驶路过/格内涨满后驻留能读到。⚠crit ≤24 字且含否定词不上——满档文案都避开否定；邻格提示统一不上 crit（d=3 用 warn）。
- **车库密度·激活与出向闸门（10-03 补漏）**：新增 `_garDenAwake`，`xdGarDenActive = _garDenAwake || _visit[旧区]>0`。⚠**不能用 `_visit[旧区]` 顶替**——那是"你到过排水沟"，会让 B 区台阶口提前叫出"J 区"。置位处：带尾巴进库（进库闸门）、点火 surge。⚠**进库闸门那脚不与「步行进格 +1」叠加**（`xdGarEnterSettle` 返回是否结算过）——叠加会让 chased>=2 一进门就把 G 顶满、出门必先打一场，"躲进车库"变死刑。⚠**出向闸门**：`xdGarExitTo` 判 `xdGarDenActive && xdGarDen(G)>=3` → 先 `-尸潮遭遇`（旧实现只查"走进下一格"，而人是从库外直接落进 G 区的，满员坡道口能白走出去）。`xdGarExitTo(dest, outPos)` 的 outPos 用于把 currentPos 挪出"地下车库"（B1走廊自身不设）。
- **搜车回程不重复记账（10-03）**：新增 `_garageSearchReturn`——「回到原地继续探索」effect 置位，格 onEnter 消费后跳过步行 +1。口径：安静搜 +1（旧 +2）、出声 +2（旧 +3 顶满）。击散 onEnter 也要清标记。⚠引擎顺序 effect(1109) 先于 nextScene(1110)，标记一定赶得上。
- **天黑人在车库（10-03）**：`夜晚剧情.js`「天黑必须过夜」加 `currentPos==='地下车库'` 早分支（onEnter 补跑 `xdGarExitSettle` 防白洗 + 专用文案）。⚠**判定用 currentPos 不用 currentArea**——改 currentArea 会把周边社区过夜选项全干掉（soft-lock 风险）。车库里过夜=必须出去另找地方，沿用现有选项。
- **`_garageMapSeen` 故意不给任何加成**（波波 10-03：逃亡就是要绕晕玩家）。core.js 与车库的旧注释（"驾驶逃亡时给方向提示"/"看过图有方位定位加成"）已改正，别再照注释实现。
- **目标车必须通电才认得出**（波波 10-03）：C 区 lit 的 `!_wiredCorrectly` 分支只写"角落不对劲"（落灰车影/歪栅栏/血腥气/有东西在动），**禁止出现"没有灰/车型/驾驶座门敞开"**——拿手电乱转不该找到那辆深灰荣威。
- ⚠⚠**自测浅拷贝陷阱**：`Object.assign({}, base)` 共享 `base._visit`——前面的点火 surge 用例往里写了"旧区=1"，会让后面"未激活"用例恒为真。构造未激活状态必须 `_visit: {}` 新建。
- **立柱漆字表述随机化（10-03）**：`xdSignLine` 原为固定句式（观感差）→ 改四档模板池 `XD_SIGN_SELF`(lit/torch/**drive**/dim，含 `{self}`) + `XD_SIGN_DIR`(lit/torch/drive，含 `{dirs}`) + `XD_SIGN_DIM_LIMIT`(dim 每回必给的"看不清方向")，每档 2~3 个随机抽（工具 `xdSignPick`/`xdSignFill`）。原来"当前格+四向"挤一句，现拆两句各自随机 → 组合数 n×m。⚠**drive 必须独立成档**：`mode = v._driving ? "drive" : xdGarSight(v)`——旧实现只看 `xdGarSight`，**驾驶态无手电无手机会落进 dark 整段漏掉指路**（修掉的既有 bug）；开车双手在方向盘，模板要写"车灯"不是"顶灯"。
- ⚠⚠**随机文案的自测断言绝不能按措辞写**：曾写 `indexOf("车灯")>=0`，但另一模板是"车**头灯**打在柱子上"（不含"车灯"连续子串）→ 抽样到它才 FAIL，单次跑是绿的。**正确写法**：按「信息是否给出」（含格名/四向）+「是否错档」（不含别的档措辞）+「变体数≥N」断言，改完**连跑 8 次**确认稳定。
- ⚠⚠**九格正文必须按「光照×dd×驾驶」矩阵暴力渲染自测（10-03 血泪）**：曾因 A/D/E 的 `lit()` 引用了 `xdCellScene` 内部的 `opts.id`（`lit/dark` 在工厂调用**之前**声明，取不到）→ ReferenceError 白屏（正文+选项全空），**288 组合里 72 个崩**。⚠**驾驶态不看光照一律走 `opts.lit(v)`**，所以九格的驾驶分支每种光照都要跑。⚠旧自测只用 `dd:1` 渲染，恰好绕开 `dd>=3` 分支 → 假绿。已固化为 selftest 第 15 节（**九格×四光照×dd{1,3,4,5,6}×步行/驾驶=360 组**）。
- ⚠**消耗项的门槛必须与 cost 对齐**：贴沟格一次扣 2 却写 `condition:"_escapeOps>0"` → 剩 1 次也能开出贴沟格、扣成 -1 → 负数撑到坡道口白拿逃亡，围堵 QTE 永不出现。修=门槛改 `>1`。
- **车库四种死法各一个结局节点（10-03）**：`结局-车库车旁`（C 区车旁战败，只差半步）/ `结局-车库尸潮`（满密度格战败，读 `_garFightCell` 报格名，**不提车**）/ `结局-车库巢穴`（J 区巢穴战败，沉进排水沟）/ `结局-车库围堵`（驾驶 QTE 超时）。旧实现三处共用「结局-车库遭遇战」，那段永远写"两步外是深灰色荣威，钥匙插在点火器上"——车还没出现/人死在下层/车已开走都会说死车型和钥匙且位置错。⚠**只有车旁那处有权提车**（进入前提 `_wiredCorrectly`，车确实在）；⚠`_garFightCell` 判空（`xdCellName("")` 返回空串会把句子写残）。
- ⚠**一次性"展示型"提示别塞进 gameState**：撞开围堵的伤口走 `_garRamHurt`(core.js 声明) + **文件作用域** `_xdRamNote`/`xdGarRamSettle(v)`，落点 onEnter 生产、text 消费（每格先清空防残留）。塞 gameState 会污染存档键、被 save_compat 当未声明变量。⚠引擎 **effect 先于 nextScene**，在 nextScene 里置位时体力已扣完。
- ⚠**"数值没动就别写威胁句"**：`xdGarDenBump` 在密度系统未激活时直接 return，此时接线失败/搜车出声的正文不能照写"引起了什么东西的注意"——加 `xdGarDenActive(v)` 分支。
- ⚠**改动若涉及机制/数值/解锁条件，先问波波**（10-03 约定）：Cursor 报的 20 条里，凡动机制/数值/解锁条件的都没擅自改，只改了无争议的 bug 与穿帮文案。
- ⚠**QTE timeout 只能读 gameState 的键**（engine.js 用 `new Function(...Object.keys(gameState))` 求值）→ 调不了 `xdGarDenTotal()`，改用 `core.js` 派生量 `_garDenTotal`（9 格求和字符串式）。⚠两份口径（JS 函数 vs 派生量）改 `XD_DEN` 要同步。
- ⚠⚠**更正 10-03（我曾写错）**：`renderScene` 内顺序是 **onEnter(1516) → checkGlobalTriggers(1541) → renderChoices(1626/1634，QTE timeout 在此求值)**，**不是**"QTE 早于 onEnter"（旧笔记写的 966 vs 1514 行是别处，已作废）。所以同源写错衍生了第二条：
  ⚠**派生量滞后（10-03 实测属实 → 已修）**：`refreshComputed()` 只在 `applyEffect`→`applyReactive` 和 `applySave` 里调；而车库密度是 **onEnter 里直接写 `v[denKey]`**、不走 applyEffect → `_garDenTotal` 会滞后到下一次 applyEffect。
  **修法（已在 engine.js renderScene 落地）**：checkGlobalTriggers 之前补一次 `refreshComputed()`（只重算 computed、不跑 rules，不会提前结算饥饿/疲劳）。效果：点火 surge 全库+9 立刻反映到自己那场 QTE（8.0s→5.75s）。
  ⚠**通用陷阱**：任何"onEnter 里直接改普通变量、而别处依赖其 derived 值"的写法都会踩同一坑——派生量不是实时的，只有 applyEffect/applySave/现在新增的 renderScene 三处会同步。
- ⚠⚠**过程性节点豁免过夜（10-03，波波提议+拍板）**：「天黑必须过夜」触发器会在进入【任何】场景瞬间把人拉走，**实测全库 103 个带 `qte` 的场景 100% 被整场吞掉**（含 47 场闪色战斗），开车途中还会把车丢在库里、`_driving` 带到第二天。
  **方案 = 场景静态属性 `nightImmune`（布尔 / 函数）+ 自带 `qte` 自动豁免**，core.js 的天黑触发器加 `id:"night"`，引擎 `checkGlobalTriggers(sceneId)` 里 `if (nightImmune && trigger.id === "night") continue;`。
  ⚠**刻意不用 `_variables` 状态变量**：豁免是"当前节点的属性"不是"玩家的状态"；用状态表达位置属性就要维护"进入置位 + 四条出口清位"，那正是 `_driving` 泄漏 bug 的成因。静态属性不进存档 → 回溯/读档天然正确、零清理。
  ⚠豁免**只**影响 id==="night"：死亡类触发器（体力耗尽/汞中毒/Harsh）优先级更高且必须生效，豁免不是不死身。
  ⚠豁免只是**延后**不是免疫：离开豁免场景走进任何普通场景的那一刻照样被拉走，必然收敛，不会卡住。
  ⚠ **renderScene 内部不给 `currentScene` 赋值**（它靠调用方先赋值）→ 判定必须用入参 `sceneId`，写成读全局 currentScene 会读到上一个场景。
  自测 `tools/night_process_immune_selftest.js`（20 断言，跑真实 renderScene）。
- 建筑类过夜两层门槛：showCondition 加 `_visit['建筑内部']>0`、原 condition/elseScene 保留。场景级=`node.qte`，选项级=`choice.timeout`；工厂 `mallQTE`/`jpChaseQTE`/`travelScene`。`applyEffect` 只认 set/add/mul。

## 文风/气味
- 禁增/降频全表见 `tools/ai_phrase_scan*.py`；基准 `张江.js`。气味按尸变天数分档：0–2天血腥汗酸、2–7天闷厚腐肉臭、>1周干腐、化工毒气甜腥；「甜腻」只留长蛆老尸与化工毒气（金谊B2、五金店）。

## 汞中毒
- `mercuryLoad` 0–100（`_caps` 已注册）。≥70→`结局-汞中毒尸变`；慢性：`>0` 才启动、每小时+1，台账 `_mercuryChronicHour` 勿动；减汞唯一=童涵春堂药丸−20。派生 `mercuryTier`/`noPainSense`/`hasDimLight`。
- 体征走正文工具函数（`mercuryMirrorNote` 7 处勿重复加）；**玩家可见文案禁止点明机制**；新载体登记 `mercury_leak_guard` 的 `SCENES`。

## 正文 HTML 排版（方案 `tools/剧情文本HTML增强方案.md`）
- 正文 `innerHTML` **不过滤**（选项才走 `sanitizeInlineHtml` 白名单）；`#scene-text` 是 `<p>` → **只允许行内元素**，`<div>/<p>/<ul>/<table>` 会被自动闭合撑破段落；`<br>` 安全。
- ⚠**新增 class 三处同步**：`style.css` + `engine.js` 的 `CHOICE_HTML_CLASSES` + `tools/text_markup_lint.js` 的 `ALLOWED_CLASSES`（漏同步 lint 报 E）。
- 单段配额：强强调（crit/sfx/shout）≤2、sfx ≤2、合计 ≤3；crit ≤24 字/rot·shout ≤26 字；**含否定词不上强强调**。整句别包 sfx；纯加粗用 `<b>`。
- ⚠**密度开关=「这个节点会不会死人」**，不是每文件几处；日常点靠 term/print 做信息分区。
- ⚠**对话/情感线三规则**：台词一律不上色（越关键越留白，留白贴着上色段=节奏）；`think`=玩家没说出口的；`mem`=回忆画面、`hand`=有人手写的字、`print`=印刷体、`term`=电子屏（三级载体区隔）。
- 工具：`text_markup_scan.js --md`（候选）、`text_markup_lint.js`（E 退出1）、`choice_html_selftest.mjs`、`scene_html_render_selftest.mjs`（新样板必加）、`markup_migrate_p1/p2.js`（先预演后 apply）。
- ⚠迁移工具三坑：拟声词污染场景 ID（ID 行整行跳过+ID 形态禁区）；引号必须当边界；续行符 `\` 会吃进选区。
- ⚠**回滚必须显式指定 commit**（整点 auto-commit，`git checkout -- story/xxx` 回到的是已自动提交的版本）。
- ⚠浏览器渲染自检六坑写在脚本注释（teleport 等 DOM 落定、stopTyping 不补齐文本、跨行 span 取换行最多者、分段文本双补丁双还原、QTE 直通读 `qte` 判 instant、`__segAcc` 每用例清空）。
- P1 全库完成（inline 270→0、结局行 129 `end`、`**` 残留 0、lint E=0）；P2 东明街道完成（199 处），剩余批次=建平/仁济/张江+`story/` 根目录大文件，按区域分批跑回归。

## 图片资源
- 转 webp 走 `tools/convert-images.py`；⚠全量转按同名覆盖既有 webp → 只补新图用 `--only`（`--keep` 保留原图）；**新图必须先转 webp 再引用**（原始 PNG ≈6MB）。

## 复旦江湾章（09-24）
- 入口 `建平-后门辅路`（hh<14，错过→`_xinGone`）。2×2（堵门/目击/双逃/救场）+ a 链双窗口（`hasWangPhone&&wangPhoneBattery>=6`）+ b 链 `_phoneOrigin=="own"`；引信 `jpXinFuse` 次日/隔日爆，给药不炸→否则 `结局-变了的忻老师`。

## 部署（10-01 起）
- **线上 = https://liveamongzombies.cc/**（正式域名，www 同样可访问）→ Cloudflare Pages 项目 `shichao-biji`（账户 `554ccd0d...f19a`，默认域名 `shichao-biji.pages.dev`）。一键重部署 `bash tools/deploy-cloudflare.sh`；产物仍走 `tools/build-dist.mjs` 白名单，未改构建逻辑。
- Zone `liveamongzombies.cc` = `9e7bf29206b617515a9cfea94950da46`：两条 CNAME（裸域 + www）→ `shichao-biji.pages.dev`、proxied。⚠**Pages 加自定义域名不会自动建 DNS 记录**（zone 原本一条都无），要手动补；域名从 pending→active 约 2 分钟，证书 Google CA。
- ⚠**凭证绝不能写进命令行**：会被工具脱敏成假值→401。一律 `TOKEN=$(sed -n '4p' ../apikey.txt | tr -d '\r\n ')` 从文件读（第2行 Account ID、第4行 CF Token、第13行 GitHub PAT）。
- ⚠token 是账户级全权限（名 `liveamongzombies`）：`/user/tokens/verify` 报 Invalid，必须用 `/accounts/{id}/tokens/verify`。
- ⚠新账户 `wrangler pages project create` 返回 `code:8000000` 未知错误 → 改用 REST `POST /accounts/{id}/pages/projects` 可建。
- ⚠Windows 上 wrangler 的 workerd/esbuild 平台二进制可能装不上，报 `"@esbuild/win32-x64" could not be found` → 手动补装（详见脚本头部注释）。
- ⚠**Pages 对 HEAD 请求返回 403**，线上资源校验一律用 GET。
- CI：`.github/workflows/deploy-cloudflare.yml`（push 到 main 自动 build+部署）。需仓库 Secret `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`；**fine-grained PAT 默认无 "Secrets: Read and write"，写 secret 会 403**（能 push 代码、能读 secrets 列表）。
- ⚠⚠**仓库同时开着 GitHub Pages**（https://bobomymz.github.io/Plot-Game/ ，source=main 根目录、legacy）→ `人物档案.md`/`核心设定.md`/`CLAUDE.md`/`tools/*` 全部公开可访问。仓库 public 所以非新增泄露，但门面与 Cloudflare 白名单策略相反，要公开与否须波波定。
- ⚠写 GH Secret 要 libsodium sealed box：**pynacl 装不上（pip 索引不可达）**，用 `npm i libsodium-wrappers` + `crypto_box_seal`。
- ⚠⚠**push 时绝不能在 remote URL 里带凭据**（`https://x-access-token:$PAT@github.com/...`）——GCM 会把它存成**独立账户**，此后 AutoPushGame 每次 push 都弹「Select an account」要波波手选、没人点就 Exit 128（10-02 事故）。要临时用 token 一律：`git -c credential.helper= push <带token的url>`。排查/清理：`git credential-manager github list` / `git credential-manager github logout <name>`；`cmdkey /list` 在 Git Bash 必须加 `MSYS_NO_PATHCONV=1`（不然 `/list` 被当路径）。
