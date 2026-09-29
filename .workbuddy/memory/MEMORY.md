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
- ⚠⚠**引擎走 `elseScene` 时【不执行选项 `effect`】**（engine.js:875 `createChoiceButton` 实测：`if(nowCondMet){effect;nextScene} else {elseScene}`）→ 拾取类的 `positionAfterOperation` **不能放 effect**（背包满走 elseScene 即失效，整理完 `{positionAfterOperation}` 落旧值/空串→死链），**必须由入口场景 `onEnter` 预设**（既有模式：`三林安居苑-小广场` onEnter 写死 `"三林安居苑-滑板车"`）。09-29 实例：401 半箱泡面可拿取（`_flat401NoodleLeft:3`，自测 `tools/flat401_noodle_selftest.js`）；同日 v2 加**割锯工具门槛**（`cuttingToolName` 非空才可「划开纸箱」，徒手撕不开 −1 体力；开箱后 `_visit` 门控使丢工具仍可拿）。
- 割锯工具（`cuttingToolName`）：美工刀>匕首>斧头>螺丝刀；不含铁管/拐杖/拖把杆/扫帚/钥匙。可多次打水，水瓶非紧平衡；`bottleWater` 0/1，丢弃须同清 `waterToxic`/`_hongBottleLabel`；保温杯另体系（建平弘渊楼2F，水全毒）。
- 计数型可堆叠口粮：`instantNoodle` 0~3（全家*员工通道杂物间*纸箱，每包1格，吃=体力回满；09-28 由便利店内货架移入）、`vitaminC` ≤9；布尔改计数须同步 `FOOD_GIFTS`+`foodGiftChoices`（数字分支只扣1）。⚠字段迁移块要排在 `fillMissingDefaults` 补默认值循环**之前**（写后面=恒假死代码）。
- **可多持物品全库仅 3 件**（09-29 审计）：`instantNoodle` 0~3、`vitaminC` ≤9（货架8+白大褂抽屉1）、`iodineSwabBox` 0~3；边界 `gunAmmo` ≤3 发（不占格）。工具+报告 `tools/stackable_items_audit.js` / `tools/可堆叠物品审计报告.md`。⚠⚠**判定可多持看【获取闸门】，不看初值类型**：`世界库存 xxxLeft>0`=真堆叠；`!flag` 或 `_visit[节点]>0` =单件（`hasInnerLining` 初值是数字却被 `_visit[收好内胆]>0` 门控 → 实际只 1 件）。世界库存型 7 个（`supermarketWaterLeft`/`vendingBottleLeft`/`newdahuiWarehouseWaterLeft`/`familyMartNoodleLeft`/`lianhuaCannedLeft`/`_iodineSwabBoxLeft`/`_vitaminCLeft`）非玩家持有。

## 体力/天气
- ⚠遥测块只能追加 engine.js 末尾，三处 `__wrapState` 保持单行；**场景锚点必须带 `: {` 后缀**。疲劳属"当前这段连续移动"：tier→0 自动清 `_fatiguePaid`，剧情只归零 `_travelMinutes`。引擎无自动提示，手写三通道；橙 `#ffaa00` `【系统提示】体力-N，当前体力：{strength}。`；死亡结局不补。
- **遥测日志会跨版本混合**：持久化不清空，core.js 三天能漂 4 次行号 → **每次测量前必须 `__clearStaminaLog()`**。归因语义：**对象式规则→应用侧 engine 行号；函数式规则→真实赋值行**。
- `weather` 唯一改写 `updateWeather()`；雨只能转阴。户外 `outdoor:true` 三选一：placeholder 图、本场景 onEnter 开 showRain（选项 effect 无效）、路径含「雨」专图。`timeImage(map)` 是工厂。

## `_visit`/过夜/QTE/shake
- 只读不写；`vars.x`→`(_visit['场景']>0)`，`!x`→`!_visit['场景']`；键名必须=真实场景 ID（悬空键不报错、条件恒假→选项永不出现）。改计数键名前算首达路径：全库自引用本场景 ID（引擎先自增后渲染）。
- **一次性「开启/解锁」动作**（开箱、划胶带、撬锁）做成**独立节点**，用 `_visit['<动作节点>']>0` 记录其已发生；此后**不再校验工具**——世界状态已改变，玩家事后丢了工具也能继续操作（避免"开过箱却因丢刀而拿不了"）。实例：新达汇后勤水（`_visit['新达汇-1F后勤仓库-开箱']`）、401 半箱泡面（`_visit['三林安居苑-7号楼-401-划开纸箱']`）。
- **入口描述差异化**：多入度节点的 text 必须按 `_lastScene` 分流（样板 `金谊广场.js` 16 处 head 变量、`长者食堂.js`）。**先把默认句改成任何来源都成立的安全句，再给特殊来源加差异化**——只追加"你之前来过"却不改首句会更矛盾（`新达汇-1F味千拉面` 教训）。子节点/多来源返回统一用"你回到X"式安全句（②回环）；**电梯/楼梯来源别播"你推开X门/走坡道"**（方位动作错位，如 `B1`/`家门外`）。审计工具 `node tools/entry_desc_audit.mjs [区域]`（报告 `tools/多入口描述审计报告.md` 第十三节）；**真 bug 已全库修完，全图仅剩 3 个 P0 = `_visit` 门控合成状态误报（人工收口）**。工具已支持：工厂节点识别（`makeXxx` 动态生成，第九~十一节）+ **前缀匹配覆盖识别**（`indexOf("前缀")`/`startsWith("前缀")`，第十三节：`coveredBy` 光搜来源名识别不了前缀写法）。⚠判定覆盖必须在**剔除 nextScene 行的源码**里搜来源名，否则大量漏检。
- `天黑必须过夜` 29 选项；建筑类过夜点两层门槛：`showCondition` 加 `_visit['建筑内部']>0`、原 `condition`/`elseScene` 保留。场景级=`node.qte`，选项级=`choice.timeout`；工厂 `mallQTE`/`jpChaseQTE`/`travelScene`。shake 已 31 处；`applyEffect` 只认 set/add/mul。

## 文风/气味
- **禁增/降频全表见 `tools/ai_phrase_scan*.py`**；基准 `张江.js`。气味按成因：0–2天血腥汗酸、2–7天闷厚腐肉臭、>1周干腐、化工毒气甜腥；**「甜腻」只留**长蛆老尸与化工毒气（金谊B2、五金店）。

## 汞中毒
- `mercuryLoad` 0–100，已注册 `_caps`（隐藏变量必有上限）。≥70→`结局-汞中毒尸变`；慢性：`mercuryLoad>0` 才启动、每小时+1，台账 `_mercuryChronicHour` 勿动；减汞唯一手段：童涵春堂药丸−20。派生 `mercuryTier`/`noPainSense`/`hasDimLight`。
- 体征走正文：灰白→`mercuryMirrorNote(vars,surface)`（7 处勿重复加）；痛觉消失→文案反转+`mercuryPainNote`；夜视→手电弱化版。**玩家可见文案禁止点明机制**（汞/夜视/数值不得出现）；新载体须登记 `mercury_leak_guard` 的 `SCENES`。

## 正文 HTML 排版（09-27 定，方案见 `tools/剧情文本HTML增强方案.md`）
- 引擎已支持：正文走 `innerHTML`，打字机遇 `<` 整段插标签；`{变量}` 在标签内照常插值。
- ⚠**只允许行内元素**：`#scene-text` 是 `<p>`，写 `<div>/<p>/<ul>/<table>` 会被自动闭合撑破段落。日记本已用 `<br>`（安全）。
- ⚠打字机每 tick 重写 `innerHTML` → CSS `animation` 每帧重启，长动画/抖动只在打完后才完整播。
- ⚠**选项文本不支持 HTML**（engine 820/910/969 用 `textContent`），要支持须改引擎+白名单过滤。
- 语义 class 制（非 inline style），色板/字体/class 表见方案 §3；单段配额：≤2 处强调（`crit/sfx/shout`）+ ≤1 处环境色；环境色只包整句不包单词。
- ⚠**选项文本已支持受限 HTML**（09-27 波波拍板）：engine 三处改 `innerHTML` + `sanitizeInlineHtml()`（DOMParser 白名单 11 标签/23 class；非白名单标签降级纯文本、非白名单属性全丢）。
- ⚠**新增 class 必须同步三处**：`style.css` 的 `.类` 定义 + `engine.js` 的 `CHOICE_HTML_CLASSES` + `tools/text_markup_lint.js` 的 `ALLOWED_CLASSES`（漏同步 lint 报 E）。
- 迁移基线：265 处 inline style（未动）、122 处结局行、7 处 `**` markdown 残留（玩家可见星号=bug）。回归见各样板报告。
- **P1 已全库完成（09-28）**：inline style **270→0**、结局行 **122→129 处 `end`**、**`**` 残留 5→0**、全库 lint E=0。工具 `tools/markup_migrate_p1.js`（普查 / `--apply` / `--end` / `--md`，**先预演后 apply**）。
  ⚠270 处只有 20 种「颜色+斜体+粗体」组合；**9 处刻意不进映射表**（同组合语义分裂必须人眼拆）；`日记本.js` 有**双引号**写法会漏网（人工定 hand/clock/think）。
  ⚠**P1 原则 = 迁移不改观感**：整句别包 `sfx`（1.35em 放大，20 字很突兀），纯加粗用 `<b>` 保真（`b` 在白名单内）。
  ⚠**结局行 122 处从裸文本 → 干血红 `end` 是 P1 最大观感增量**（玩家一眼看到自己死没死）；系统提示青 #00fbffff→#4ec9d4；【好感度±N】粉→`sys` 青。
- **P2 第一批·东明街道已完成（09-29）**：新增 **199 处**（sfx 129 / crit 38 / rot 31 / shout 1），文本零增删。工具 `tools/markup_migrate_p2.js`（`--apply`/`--only=`/`--all`/`--cat=`）。
  ⚠**P2 与 P1 最大的区别：P2 是"上色"不是"搬家"，所以靠三闸门自动控密度**——段内强强调 ≤2、sfx ≤2、合计 ≤3；crit ≤24 字/rot·shout ≤26 字；**含否定（没有/未能/并未/并不/差点…）不上强强调**。拦下的一律人工定（拆短 or 留白）。
  ⚠⚠**三条工具坑**：① **拟声词会污染场景 ID**（`"结局-嘎吱嘎吱"` 里的"吱"→插成 `"结局-嘎<span>吱嘎吱</span>"`，语法合法/lint 不报，只有 `scene_fn_selftest` 死链检查能抓到）→ 防护=ID 定义行整行跳过 + **ID 形态禁区**（引号内≤28字符、无空格无中文标点不处理）；② **引号必须当边界**（否则 span 插到 `return "` 前，JS 语法崩）；③ **续行符 `\` 会被吃进选区**（`\</span>`+换行 崩语法），源码字面 `\n` 须先换等长探针字符再判边界（否则切出 `n远处传来…`）。
  ⚠⚠**回滚陷阱：本项目有整点 auto-commit**，`git checkout -- story/xxx` 回滚到的是"已被自动提交进去的版本"而非我以为的基线 → **必须显式指定 commit**（如 `git checkout d31974a -- story/东明街道`）。
  P2 第二批 = 建平/仁济/张江 + `story/` 根目录大文件（`--all`）。
- P2 建议**按区域分批**（东明街道→建平→仁济→张江），每批跑回归。
- **样板一 `五金店.js`（75 处，陷阱屋）**：危险类 crit+end+rot 占 45%。**样板二 `东明街道/长者食堂.js`（42 处，探索/信息型）**：危险类仅 12%，主力是 term 10 / think 5 / smell 5 / print 3。**样板三 `复旦江湾.js`（81 处，对话/情感线）**：危险类 26%，主力 rot 12 / think 11 / crit 8 / term 6。
- ⚠**对话/情感线的三条规则**（样板三验证）：① **台词一律不上色，越关键的台词越留白**——留白段紧贴上色段，对比就是节奏（全上色=圣诞树）；② **`think` 是主色**，专给"玩家察觉到但没说出口"；③ **`mem` 专给回忆画面**、`hand` 专给"有人亲手写过的字"（便利贴/铅笔字/纸条），与 `print`（印刷体）、`term`（电子屏）构成三级载体区隔。
- ⚠**密度开关是「这个节点会不会死人」，不是「每文件几处」**：两文件标记总数只差 1.2 倍，危险类占比差 3.8 倍 → 观感差异全在这。日常点靠 `term`（电子屏）/ `print`（纸上引文）做信息分区、其余整段留白。
- ⚠跨多行 span 可用（签到机签到记录整块 `term` 跨 7 行，等宽+pre-wrap 对齐），但必须跑浏览器自检确认 `\n` 保留。
- 工具：`node tools/text_markup_scan.js --md`（候选清单）、`node tools/text_markup_lint.js`（标记体检，E 有错退出1）、`node tools/choice_html_selftest.mjs`（选项 HTML 18 断言）、**`node tools/scene_html_render_selftest.mjs`（正文最终态 64 断言，新样板必加）**。`lint_story.mjs` 已 `stripHtml` 不误报，`ai_phrase_scan*.py` 也已补去标签。
- ⚠**浏览器渲染自检六坑**（写在脚本注释里）：① teleport 后必须等 DOM 落定（否则空串）；② **`stopTyping()` 只 clearInterval、不补齐剩余文本**（要最终态得打瞬时补丁）；③ 跨行 span 断言要取"该 class 下换行最多的 span"；④ **分段文本（`text` 是数组）走 `typeSegments` 不是 `typeText`**，补丁要打两个、还原也要还原两个（只还原 typeText → 补丁版 typeSegments 泄漏到下条用例，前缀断言集体假失败 227/227）；⑤ **QTE 场景走 `innerHTML` 直通、不设 `typingFullText`**，拿它比前缀会读到上条用例的残留值 → 读 `storyData[currentScene].qte` 判 `instant`，直通场景只断言"一次显示完整+非空"；⑥ 累加器 `__segAcc` 每条用例开头要清空。
- ⚠**既存 4 处 markup bug 已于 09-28 全部修复**（全库 lint E 归零）：上实南校 `<span>` 未闭合、东明街道路径银行存款凭条 `<div>`、
  樱桃苑结局-丧尸的凝视两处 `<div>`。见 `tools/既存markup bug修复报告.md`。
- ⚠**`sanitizeInlineHtml` 只过滤选项文本；正文 `innerHTML` 直接赋值、不过滤** → 正文里写 `<div style=…>` 会完整生效（撑破段落且带样式）。
- ⚠行内元素拿不到块级 margin/缩进：引文卡片、票据边框这类效果做不出来，只能用字体/字距/`<br>` 分行替代。

## 图片资源
- 转 webp 走 `tools/convert-images.py`。⚠**全量转会按「去后缀同名」覆盖既有 webp**（`…-彭奕宸弹琴.jpg` 会盖掉正式图 `…-彭奕宸弹琴.webp`）→ 只补新图用 `--only "<相对路径或 glob>"`（`--keep` 可保留原图不删）。**新图必须先转 webp 再引用**（2560×1440 原始 PNG ≈6MB，直接引用＝进场景卡加载）。

## 复旦江湾章（09-24）
- `story/复旦江湾.js`：入口 `建平-后门辅路`（hh<14，错过→`_xinGone`）。2×2（堵门/目击/双逃/救场）+ a 链双窗口（`hasWangPhone&&wangPhoneBattery>=6`，出示不扣电）+ b 链 `_phoneOrigin=="own"`；引信 `jpXinFuse` ③次日/④隔日爆，给药不炸→否则 `结局-变了的忻老师`。
