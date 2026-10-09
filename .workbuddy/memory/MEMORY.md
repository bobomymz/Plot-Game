# 尸潮笔记 · 项目铁律

> 索引：细节见 `tools/*.md`（脚本自带注释）；审计坑表见 skill `shichao-story-variable-audit`；历史见 `.workbuddy/memory/YYYY-MM-DD.md`。
> 本文件只放**跨会话必须记住的契约与坑**，实现细节一律指向工具/文档。

## 变量/审计
- `_variables` 是 `gameState` 唯一来源；未声明名→条件抛错→**选项不显示**（非 false，报错常点错变量名，须全量审计）。派生量放 `_reactive.computed`；新派生值优先写 utils.js 普通函数。初值：计数 0（add）、布尔 false、串 ""。
- 三件套必跑：`condition_audit`(0/0)、`scene_fn_selftest`(0 异常)、`sprint_away_audit`(0 P0)；**清单唯一权威=`tools/story_files.js`**，新脚本禁硬编码 FILES。
- 存档：`fillMissingDefaults`+`refreshComputed` 挂 `applySave`/`backtrack`；只新增变量不必 bump `SAVE_VERSION`，改字段含义必须 bump 或写反推迁移。
- ⚠字段迁移块必须排在 `fillMissingDefaults` 循环**之前**（写后面=恒假死代码）。

## 回溯（10-01 改落点）
- 落点=历史中**最近且当时有 ≥2 个可行选项**的节点（非栈顶；链状回上一节点=原路再死一次）。`countSceneChoices()`+`findBacktrackIndex()`；`backtrack()` 用 `historyStack.length=idx` 截断。结局/零选项节点永不作落点。
- ⚠必须用该条历史自带快照（先 `snapshotState` 深拷贝，防函数式 choices 副作用）。兜底：全单选项链 / 超 `BACKTRACK_SCAN_CAP=60` → 栈顶。自测 `tools/backtrack_target_selftest.js`。

## 战斗
- 徒手化＝改文案+onEnter 分支，勿新增场景；代价包 `{add:{strength:-2,mercuryLoad:10},set:{hurtByZombie:true}}`。`combatCost`=tier≥2?1:2；失败包=体力−1~−3、汞+10~+15、hurt、`tryBreakWeapon`。惩罚三处：onEnter、选项 effect、场景级 `qte.onTimeout`（**最易漏**）。`isEnding()`：id 以『结局』开头或文案含『—— 结局：』。
- **闪色战斗（全库 47 场）**：偏差=Σ|玩家报数−实际数| → 0=胜/1~2=伤/≥3或超时=死。三档 `flashCombatRouter(胜,伤,死)`；非致死 5 场用 `flashCombatRouterSafe`；伤两形态 `hurtWinOnEnter`/`hurtFleeOnEnter`。惩罚工厂在 utils.js（汞+5×偏差封顶100）；受伤场景一律独立。路由闭包挂 `__sceneRefs` 供 lint 补入边。工具 `flash_battle_audit.js`/`flash_battle_selftest.js`。

## 背包/水瓶
- 容量=`3+_bagTier+_bagExtra`；`bagVolume` 派生**永不 set/add**；闸门 `vars._bagTier<N`/`!hasBag`。拾取四件套：`condition:"itemCount<bagVolume"`+`effect:{set,add:{itemCount:1}}`+`elseScene:"整理整理"`。
- ⚠⚠**引擎走 `elseScene` 时不执行选项 `effect`** → `positionAfterOperation` 必须由**入口场景 onEnter 预设**，不能放 effect。
- 休息整理：`restTidyChoice(id)`+`restTidyGuard(vars)`（utils.js）。**整理整理出口回入口→onEnter 重跑**，写核心状态量的入口必 guard（`onEnter:{add}`、`chasedByZombies=0/1`、`strength=…` 都算；`showPowerOut=true` 幂等不算）。⚠⚠`transit(v,pos)` 含回头检测（pos===`_prevPos2` 且被追→chased+1）→ 走廊/中庭类节点 onEnter 必 guard。
- 割锯工具（`cuttingToolName`）：美工刀>匕首>斧头>螺丝刀；不含铁管/拐杖/拖把杆。
- **可多持全库仅 3 件**：`instantNoodle` 0~3、`vitaminC` ≤9、`iodineSwabBox` 0~3。⚠判定看**获取闸门**不看初值：世界库存 `xxxLeft>0`=真堆叠；`!flag`/`_visit` 门控=单件。
- 布尔改计数须同步 `FOOD_GIFTS`+`foodGiftChoices`。

## 体力/天气
- `weather` 唯一改写 `updateWeather()`；雨只能转阴。户外 `outdoor:true` 三选一：placeholder、onEnter 开 showRain（选项 effect 无效）、路径含「雨」专图。`timeImage(map)` 是工厂。
- 遥测：块只能追加 engine.js 末尾，三处 `__wrapState` 单行；场景锚点带 `: {` 后缀。测量前必须 `__clearStaminaLog()`（日志跨版本混合、行号漂）。

## ⭐引擎契约（踩过血的，别再犯）
- **`_lastScene` = 上一个渲染完成的场景（"来处"），不是"此刻站在哪"**，差一格错位。要当前位置就在场景自己 onEnter 里写专用变量（车库用 `_garageCurCell`）。验证方式：`tools/garage_redesign_selftest.js` 的 vm 沙箱直调真实 `renderScene`，别靠读行号推理。
- **跨区域别用 `currentPos` 字符串做判定**：`"地下车库"` 新达汇和建平中学都在用，撞名会拉到别的区域代码/文案。用 `currentPos`+`currentPlace` 组合或专用状态位。
- **全局触发器（hh>=19 强制过夜）会绕过所有出口节点**——"离开某区域才结算/清理"的状态必须放进共用结算函数（车库三条离库路径全汇到 `xdGarExitSettle`）。
- ⚠**`onEnter`(1516) 早于 `text`(1581)**：onEnter 里清掉的键同场景 text 读不到；要传给 text 就用文件作用域变量先存快照或走 gameState。
- ⚠**派生量不实时**：`refreshComputed()` 只在 `applyEffect`/`applySave`/`renderScene`(新增) 三处同步。任何"onEnter 里直接改普通变量、别处依赖其 derived 值"都会滞后（车库密度踩过，已在 renderScene 补一次 refreshComputed）。
- ⚠**`renderScene` 内部顺序**：onEnter → refreshComputed → checkGlobalTriggers → renderChoices（QTE timeout 在最后求值）。
- ⚠**QTE timeout 只能读 gameState 的键**（`new Function(...Object.keys(gameState))`）→ 调不了普通函数，用 core.js 派生量（如 `_garDenTotal`）。两份口径改表要同步。
- ⚠**过程性节点豁免过夜 = 场景静态属性 `nightImmune`（布尔/函数）+ 自带 `qte` 自动豁免**，core.js 天黑触发器 `id:"night"`，引擎里 `if (nightImmune && trigger.id === "night") continue;`。**刻意不用 `_variables` 状态**（豁免是节点属性不是玩家状态；用状态就要维护"进入置位+四条出口清位"，正是 `_driving` 泄漏的成因）。只影响 night——死亡类触发器优先级更高。只是**延后**不是免疫。判定用入参 `sceneId`（renderScene 不给 `currentScene` 赋值）。自测 `tools/night_process_immune_selftest.js`。
- 建筑类过夜两层门槛：showCondition 加 `_visit['建筑内部']>0`、原 condition/elseScene 保留。场景级=`node.qte`，选项级=`choice.timeout`；工厂 `mallQTE`/`jpChaseQTE`/`travelScene`。`applyEffect` 只认 set/add/mul。

## `_visit`/过夜/QTE
- 只读不写；键名必须=真实场景 ID（悬空键不报错、条件恒假→选项永不出现）。
- **一次性「开启/解锁」动作做独立节点**，用 `_visit['<动作节点>']>0` 记录；此后不再校验工具。
- 入口描述差异化：多入度节点按 `_lastScene` 分流（样板 `金谊广场.js`/`长者食堂.js`）。**先把默认句改成安全句，再加差异化**；电梯/楼梯来源别播推门动作。审计 `node tools/entry_desc_audit.mjs`。⚠⚠**来源分支必须写完整场景 ID 字面量**——`XDGAR+"D区"` 这类常量拼接审计器识别不了。
- **网状地图选项方向词**：静态"回X"在未到访路线上穿帮→用 `xdGarGo(targetId, beenText, firstText)`（choice.text 可为函数）按 `_visit` 分流"回/去"；仅必经或单入边链保留静态"回"。

## 车库（10-02 网格化 + 10-03 密度系统；详见 `docs/区域方案-新达汇车库网格化与方向系统.md`，自测 `tools/garage_redesign_selftest.js`）
- **网格**：9 宫格（北=上，邻接表 `XDGRID`=唯一权威）+ `_garageFacing`(N/E/S/W)；选项按前/左/右/后相对方位（工厂 `xdCellScene`），无邻格方向槽位隐藏；**没有原地转身**（移动方向=新朝向；驾驶倒车 `_garageRev` 保持车头）。引擎新增 `scene.fixedChoices`（跳过 shuffle——方位选项不得乱序）。新格配图全是 placeholder 待补。
- **追兵⇄密度换算闸门**（波波拍板）：**库内一律用密度，禁止直接加减 `chasedByZombies`**，只在进出库时换算。进 `G += min(2,chased)` 且 `chased=0`；出 `chased += (G>=3?2:(G>=1?1:0))` 且 **`G=0`（不清零=永动机）**；驾驶冲出坡道 `chased+0` 但 G 清零。⚠出库累加封顶 4（`chased>=5` 是即死触发器）。挂点：进=G 区 onEnter 的 `entryAnchor`；出=G 区两步出口（`xdGarExitTo`）+ `-冲出坡道` onEnter。**边界依据**：步行层→外界只有 G 区两条边（selftest 第 11 节）。
- **密度激活**：`_garDenAwake`，`xdGarDenActive = _garDenAwake || _visit[旧区]>0`。⚠不能用 `_visit[旧区]` 顶替（那是"到过排水沟"，会让 B 区台阶口提前叫出 J 区）。置位：带尾巴进库、点火 surge。⚠进库闸门那脚**不与「步行进格 +1」叠加**（叠加会让 chased>=2 一进门顶满、出门必打，"躲进车库"变死刑）。⚠**出向闸门**：`xdGarExitTo` 判 `xdGarDenActive && xdGarDen(G)>=3` → 先 `-尸潮遭遇`。
- **密度描写**（波波拍板：邻格只报最危险一格 / 报程度不报数字 / 全黑不给邻格）：总入口 `xdGarDenHint(v,id)` 按光照分流——lit/torch/驾驶车灯 → `xdGarSightDen`（当前格，表 `XD_SEE_DEN`，**0 档静默**，1/2/3 档各 2~3 变体）+ `xdGarNeighborHint`（只报最危险一邻格，遍历序 前>左>右>后）。⚠0 档只关当前格那句，邻格提示独立照给；都静默整段返回 ""；dim/dark → `xdGarNoise`（听觉档）。⚠⚠**听觉档必须留**（全黑零反馈+满格即死=处决不是难度）。⚠勿复用 `canSee()`——车库通电是独立回路（`_wiredCorrectly`），一律走 `xdGarSight`。⚠满档 d>=3 视觉文案几乎看不到（`xdCellEntry` 先拦截），只有驾驶路过/驻留能读到。
- **立柱漆字随机化**：`xdSignLine` 四档模板池 `XD_SIGN_SELF`(lit/torch/**drive**/dim) + `XD_SIGN_DIR` + `XD_SIGN_DIM_LIMIT`，每档 2~3 随机抽。⚠**drive 必须独立成档**：`mode = v._driving ? "drive" : xdGarSight(v)`（旧实现驾驶态落进 dark 整段漏掉指路）；开车模板写"车灯"不是"顶灯"。
- **搜车无中间节点**：POI 直接出结果。记账在 `xdGarSearchGo()`（函数式 nextScene，挂 `__searchGo`/`__sceneRefs`），正文 `xdGarSearchApproach(v)`。⚠**起点读 `_garageCurCell`，绝不能读 `_lastScene`**。回程不重复记账用 `_garageSearchReturn`（「回到原地继续探索」置位，格 onEnter 消费后跳过步行 +1；安静搜 +1、出声 +2）。
- **四种死法各一结局节点**：`结局-车库车旁`（C 区车旁战败）/ `结局-车库尸潮`（满密度格，读 `_garFightCell` 报格名，**不提车**）/ `结局-车库巢穴`（J 区）/ `结局-车库围堵`（驾驶 QTE 超时）。⚠**只有车旁那处有权提车**；⚠`_garFightCell` 判空（`xdCellName("")` 返回空串会写残句子）。
- **目标车必须通电才认得出**（波波）：C 区 lit 的 `!_wiredCorrectly` 分支只写"角落不对劲"，**禁止出现"没有灰/车型/驾驶座门敞开"**。
- **`_garageMapSeen` 故意不给任何加成**（逃亡就是要绕晕玩家），旧注释已改正。
- ⚠**消耗项门槛必须与 cost 对齐**：贴沟格扣 2 却写 `condition:"_escapeOps>0"` → 剩 1 次也能开、扣成 -1 → 白拿逃亡。修=门槛 `>1`。
- ⚠**一次性"展示型"提示别塞 gameState**：伤口走 `_garRamHurt`(core.js) + **文件作用域** `_xdRamNote`/`xdGarRamSettle(v)`，落点 onEnter 生产、text 消费（每格先清空防残留）。塞 gameState 会污染存档键。⚠引擎 **effect 先于 nextScene**。
- ⚠**"数值没动就别写威胁句"**：`xdGarDenBump` 未激活时直接 return → 接线失败/搜车出声的正文加 `xdGarDenActive(v)` 分支。
- ⚠**天黑人在车库**：`夜晚剧情.js`「天黑必须过夜」加 `currentPos==='地下车库'` 早分支（补跑 `xdGarExitSettle` 防白洗）。⚠**判定用 currentPos 不用 currentArea**（改 currentArea 会把周边社区过夜选项全干掉，soft-lock）。
- ⚠⚠**自测三坑**：①浅拷贝 `Object.assign({}, base)` 共享 `_visit` → 构造未激活状态必须 `_visit: {}` 新建；②**随机文案断言绝不能按措辞写**（曾写 `indexOf("车灯")`，另一模板是"车头灯"→抽样才 FAIL）；应按「信息是否给出」+「是否错档」+「变体数≥N」断言，**连跑 8 次**；③**九格正文按「光照×dd×驾驶」矩阵暴力渲染**（曾因 `lit()` 引用工厂内部 `opts.id` → 288 组合崩 72 个；旧自测只跑 `dd:1` 绕开 dd>=3 分支=假绿）。已固化 selftest 第 15 节（360 组）。
- ⚠**改机制/数值/解锁条件先问波波**（10-03 约定）。

## 文风/气味
- 禁增/降频全表见 `tools/ai_phrase_scan*.py`；基准 `张江.js`。气味按尸变天数分档：0–2天血腥汗酸、2–7天闷厚腐肉臭、>1周干腐、化工毒气甜腥；「甜腻」只留长蛆老尸与化工毒气。

## 汞中毒
- `mercuryLoad` 0–100（`_caps` 已注册）。≥70→`结局-汞中毒尸变`；慢性：`>0` 才启动、每小时+1，台账 `_mercuryChronicHour` 勿动；减汞唯一=童涵春堂药丸−20。派生 `mercuryTier`/`noPainSense`/`hasDimLight`。
- 体征走正文工具函数（`mercuryMirrorNote` 7 处勿重复加）；**玩家可见文案禁止点明机制**；新载体登记 `mercury_leak_guard` 的 `SCENES`。

## 正文 HTML 排版（方案 `tools/剧情文本HTML增强方案.md`）
- 正文 `innerHTML` **不过滤**（选项才走 `sanitizeInlineHtml` 白名单）；`#scene-text` 是 `<p>` → **只允许行内元素**（`<div>/<p>/<ul>/<table>` 会被自动闭合撑破段落）；`<br>` 安全。
- ⚠**新增 class 三处同步**：`style.css` + `engine.js` 的 `CHOICE_HTML_CLASSES` + `tools/text_markup_lint.js` 的 `ALLOWED_CLASSES`（漏同步 lint 报 E）。
- 单段配额：强强调（crit/sfx/shout）≤2、sfx ≤2、合计 ≤3；crit ≤24 字/rot·shout ≤26 字；**含否定词不上强强调**。整句别包 sfx；纯加粗用 `<b>`。
- ⚠**密度开关=「这个节点会不会死人」**，不是每文件几处；日常点靠 term/print 做信息分区。
- ⚠**对话/情感线三规则**：台词一律不上色（越关键越留白）；`think`=没说出口的；`mem`=回忆画面、`hand`=手写字、`print`=印刷体、`term`=电子屏（三级载体区隔）。
- 工具：`text_markup_scan.js --md`、`text_markup_lint.js`（E 退出1）、`choice_html_selftest.mjs`、`scene_html_render_selftest.mjs`（新样板必加）、`markup_migrate_p1/p2.js`（先预演后 apply）。
- ⚠迁移工具三坑：拟声词污染场景 ID（ID 行整行跳过）；引号必须当边界；续行符 `\` 会吃进选区。⚠**回滚必须显式指定 commit**（整点 auto-commit）。
- ⚠浏览器渲染自检六坑写在脚本注释（teleport 等 DOM 落定、stopTyping 不补齐、跨行 span 取换行最多者、分段文本双补丁双还原、QTE 直通读 `qte`、`__segAcc` 每用例清空）。
- 进度：P1 全库完成（inline 270→0、结局行 129 `end`、`**` 残留 0、lint E=0）；P2 东明街道完成（199 处），剩余=建平/仁济/张江+`story/` 根目录大文件，按区域分批。

## 图片资源
- 转 webp 走 `tools/convert-images.py`；⚠全量转会同名覆盖既有 webp → 只补新图用 `--only`（`--keep` 保留原图）；**新图必须先转 webp 再引用**（原始 PNG ≈6MB）。

## 复旦江湾章（09-24）
- 入口 `建平-后门辅路`（hh<14，错过→`_xinGone`）。2×2（堵门/目击/双逃/救场）+ a 链双窗口（`hasWangPhone&&wangPhoneBattery>=6`）+ b 链 `_phoneOrigin=="own"`；引信 `jpXinFuse` 次日/隔日爆，给药不炸→否则 `结局-变了的忻老师`。

## 部署（10-01 起；完整记录与排查历史见 `tools/Cloudflare部署报告.md`）
- **线上 = https://liveamongzombies.cc/** → Cloudflare Pages 项目 `shichao-biji`。一键重部署 `bash tools/deploy-cloudflare.sh`；产物走 `tools/build-dist.mjs` 白名单。
- 健康检查一条命令：`node tools/ci_health_check.mjs`（workflow 写法/Actions 结论/job 是否创建/Secret 状态/连通性）。
- ⚠**`secrets` 不能出现在 `if:` 中**（GitHub 硬规则）——否则 **job 直接不创建**，报 `No jobs were run`（看着像权限/调度问题，其实是语法非法）。判定法：查 `/actions/runs/<id>/jobs` 的 `total_count`，**0 就是 job 没建**。修法：secret 提到 job 级 `env` 再判 `env.XXX`。10-09 修复 commit `0850f64`。
- CI 需仓库 Secret `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`（**目前仍未配置**，部署步骤被 skip）；**fine-grained PAT 默认无 "Secrets: Read and write"，写 secret 会 403**。写 Secret 要 libsodium sealed box（pynacl 装不上，用 `npm i libsodium-wrappers` + `crypto_box_seal`）。
- ⚠**凭证绝不能写进命令行**（会被工具脱敏成假值→401）。一律从文件读：`../apikey.txt` 第2行 Account ID、第4行 CF Token、第13行 GitHub PAT。⚠token 是账户级全权限：`/user/tokens/verify` 报 Invalid，必须用 `/accounts/{id}/tokens/verify`。
- ⚠新账户 `wrangler pages project create` 返回 `code:8000000` → 改用 REST `POST /accounts/{id}/pages/projects`。
- ⚠Windows 上 wrangler 的 workerd/esbuild 平台二进制可能装不上（`"@esbuild/win32-x64" could not be found`）→ 手动补装（见脚本头部）。
- ⚠**Pages 对 HEAD 返回 403**，线上校验一律用 GET。⚠**Pages 加自定义域名不自动建 DNS 记录**，要手动补（域名 pending→active 约 2 分钟，证书 Google CA）。
- ⚠⚠**仓库同时开着 GitHub Pages**（https://bobomymz.github.io/Plot-Game/ ，source=main 根目录、legacy）→ 设计文档/`tools/*` 全部公开可访问。仓库 public 所以非新增泄露，但门面与 Cloudflare 白名单策略相反，公开与否须波波定。

## Git / 推送
- ⚠⚠**push 时绝不能在 remote URL 里带凭据**——GCM 会存成**独立账户**，此后 AutoPushGame 每次 push 都弹「Select an account」要波波手选、没人点就 Exit 128（10-02 事故）。要临时用 token 一律：`git -c credential.helper= push <带token的url>`。排查/清理：`git credential-manager github list` / `logout <name>`；`cmdkey /list` 在 Git Bash 必须加 `MSYS_NO_PATHCONV=1`。
- ⚠**本机 github.com 经代理时好时坏**：直连常超时、代理常 502/空回复，但 `api.github.com` 直连稳定可达（判定 GitHub 侧问题优先走 API）。AutoPushGame 脚本已带**直连失败→自动回落代理**兜底。都挂时可走 SSH 443：`git -c core.sshCommand="ssh -p 443" push git@ssh.github.com:<repo>.git`。
