# 变量 ↔ _visit 替换审计报告

> 生成方式:`python tools/variable_visit_audit.py` 静态扫描 story/ 全部剧情文件 + engine.js(可复跑)。
> 引擎语义:`_visit[场景ID]` 由引擎在每次渲染场景时自动 +1(onEnter 之前;回溯跳过;随快照存/读档)。剧情只读不写。
> 判定基准:**A1** = 单向布尔(false→true 仅一次)、写入点在专用子场景(场景ID含"-")、未被规则引擎引用 → 可直接改为 `_visit['写入场景'] > 0`;**A2** = 单向布尔但写入在主场景,需先把动作拆成专用子场景;**A3** = 持有/物品线索类,静态单向但语义是"拥有某物",是否替换需人工权衡。

## 一、总览

- `core.js _variables` 定义变量:**263** 个
- 有剧情写入点的:236 个;无写入点:27 个(其中疑似完全未使用 10 个,见附录A)
- **可直接替换(A1):15 个**;拆子场景后可替换(A2):1 个;持有类需人工复核(A3):14 个
- 可替换合计 16 个(不含 A3)——替换后 `_variables` 最多可减少 16 个定义(6%)
- 疑似"写而不读"(写入后无任何读取,直接删即可):Z 级 9 个(见第〇章)
- B级(单向布尔但被规则引擎/多场景写入引用,需重构):25 个
- C级(不建议替换):166 个;D级(计数型,可改 _visit 次数):6 个
- 剧情代码中已有 `_visit['…']` 用法:430 处(惯例已确立,A级替换与既有写法一致)


## 〇、疑似"写而不读"的变量(可直接删除,无需替换,共 9 个)

有写入点但全库读取次数≈0(词频估算+已抽查核实)。这类标记写入后没有任何地方消费,是 AI 写剧情时的冗余产物;确认后直接删定义+删写入即可。
其中 `_quackTradedDay` / `_fangWarnRoadBull` 按注释本该被读取(防重复交易/提醒),疑似漏写了读取逻辑——先确认是删还是补 bug。

| 变量 | 分组 | 说明 | 写入场景 |
| --- | --- | --- | --- |
| `isWeak` | 基础数值 | 是否虚弱 | (函数 storyData) |
| `_jinyiB2GasWarned` | 金谊广场 | B2毒气是否已预警过 | 金谊广场-B2 地下车库 |
| `_pengGalWqxSeen` | 建平中学 - 状态 | 是否已见过 wqx 存档彩蛋（galgame真结局，设计见 galgame.md） | 建平-远翔楼-4F-高三14班-galgame-wqx存档 |
| `_quackTradedDay` | 反派NPC：三林路路霸 +  | 上次跟郎中交易的天（同一天防重复买） | 天台-卖药郎中-给食物 |
| `_fangWarnRoadBull` | 反派NPC：三林路路霸 +  | 方姐是否已提醒过路霸（防重复） | 菜市场-交易-冻肉 |
| `_chefCleared` | 反派NPC：三林路路霸 +  | 厨师丧尸是否清除 | 建平-食堂-煤气阀-关阀 |
| `_jinbaoCommission` | 张江（华大半导体 · 洪金宝 | K0：洪金宝是否已拜托玩家回三林看他爸 | 张江-华大-动力站-委托 |
| `_jinbaoFed` | 张江（华大半导体 · 洪金宝 | 谎言线的加班补给是否已给过（泡面/功能饮料） | 张江-华大-动力站-谎言 |
| `shoes` | 张江（华大半导体 · 洪金宝 | 鞋子 | 金谊广场-2F-换装 |

## 二、A1级:可直接替换(共 15 个)

全部满足:初始 false → 只写 true 一次 → 无复位 → 写入点在专用子场景 → 未被 `_reactive/_globalTriggers/_screenEffects/_caps` 引用。
替换写法:删除变量定义,原 set true 的 effect 删除,所有读点改为 `_visit['写入场景'] > 0`(若原文是"到过之后再来"分支,注意 `> 1` 语义)。

| 变量 | 分组 | 说明(core.js注释) | 写入场景 | 引用文件数 |
| --- | --- | --- | --- | --- |
| `_paraffinTaken` | 场景状态 | 益丰大药房库房石蜡油是否已被拿走（一次性守卫；交易掉后不可重拿） | 益丰大药房-左边货架翻找 | 1 |
| `_supermarketCompromised` | 场景状态 | 联华超市地下室是否已暴露不再安全 | 联华超市-地下室-撬锁 | 2 |
| `_jinbaobeiFrontOpen` | 上实南校临时道具（不占背包容 | 金宝贝前门是否已用钥匙牌打开 | 新达汇-3F金宝贝早教中心 | 1 |
| `fightWithVineZombie` | 操作状态 | 是否与被藤蔓缠绕的丧尸打过 | 三林安居苑-藤蔓丧尸 | 1 |
| `wangGiveKey` | 操作状态 | 王老师是否给了钥匙 | 上实南校-图书馆-给水 | 1 |
| `_jinyiSurvivorsFed` | 金谊广场 | 是否给长廊幸存者送了食物 | 金谊广场-龙头区长廊 | 1 |
| `_jinyiSurvivorsRobbed` | 金谊广场 | 是否被长廊幸存者抢了 | 金谊广场-龙头区长廊 | 1 |
| `_policeGunTaken` | 常规物品 | 是否已在警察局拿到过手枪（防"丢枪→重取"刷满子弹） | 警察局-武器-手枪 | 1 |
| `teacherStudentsDead` | 常规物品 | 给王老师毒水后学生变丧尸的死局标记 | 上实南校-图书馆-给水 | 1 |
| `_xinDead` | 建平中学 - 状态 | 忻老师是否已被丧尸杀死（ch>=3 进入后门辅路时触发） | 建平-后门辅路 | 1 |
| `_lijuanCupTold` | 建平中学 - 状态 | 李娟清醒时是否指认过自己的保温杯（解锁桌面喝水双选项陷阱） | 建平-弘渊楼-2F-李娟 | 1 |
| `_drawerVitaminTaken` | 建平中学 - 状态 | 击杀白大褂后抽屉里那瓶维生素是否已收进背包（一次性，防重复刷） | 益丰大药房-击杀 | 1 |
| `_airlockAlarmZombie` | 张江（华大半导体 · 洪金宝 | 风淋初级警报是否引来丧尸进外走廊（此后连廊多一场遭遇） | 张江-华大-风淋舱-强启失败 | 1 |
| `_airlockAlarmRang` | 张江（华大半导体 · 洪金宝 | 风淋警报是否刚在本场景响过（强启失败场景 text 分支用，读后由下次进入覆 | 张江-华大-风淋舱-强启失败 | 1 |
| `_fangDieselGiven` | 张江（华大半导体 · 洪金宝 | 方姐的柴油交易是否已给过（张江还有活人的消息换，一次性） | 菜市场-交易-柴油 | 1 |

## 三、A2级:需先把动作拆成专用子场景(共 1 个)

这些变量写在主场景 onEnter/选项里(场景ID不含"-"),直接删掉变量后没有天然的 _visit 计数来源。
需先把该动作挪进一个新的子场景(动作本身跳转进去再回来),之后与 A1 同法替换。

| 变量 | 分组 | 说明(core.js注释) | 写入场景 | 引用文件数 |
| --- | --- | --- | --- | --- |
| `_sleepingZombieGone` | 场景状态 | 小区道路椅子上躺着的那个丧尸走了没有 | 反杀老6 | 1 |

## 四、A3级:持有/物品线索类,人工复核(共 14 个)

静态上是单向布尔,但语义是"背包/身上是否拥有某物"。其中**占背包**的绝不能用 _visit(丢弃/容量逻辑依赖独立变量);
**不占背包的钥匙/线索类**(如门禁卡、报告、手机)当前没有丢弃逻辑,替换在机械上可行,但会让"拥有物品"耦合在"到过拾取场景"上——以后若加"被没收/用掉"剧情会断,建议保留。

| 变量 | 分组 | 说明(core.js注释) | 写入场景 | 引用文件数 |
| --- | --- | --- | --- | --- |
| `_hasCampusKey` | 上实南校临时道具（不占背包容 | 员工通道钥匙串（教务室铁皮柜割锁获得，教学楼走员工通道下楼用） | 上实南校-教务室-开柜 | 1 |
| `_hasThermometer` | 上实南校临时道具（不占背包容 | 温度计（化学实验室取，给小赵测温判断是否发炎） | 上实南校-化学实验室-面具有 | 1 |
| `_hasPoliceMap` | 常规物品 | 是否掌握去警察局的穿行路线（金谊广场陈默地图，解锁上实南校北段车阵） | 金谊广场-停车场-救完 | 1 |
| `hasDoorKey2` | 钥匙 | 是否有门钥匙2（新达汇B1配电房黄铜钥匙，王建国遗物） | 新达汇-3F后勤走廊-王建国的口袋 | 1 |
| `hasDoorKey3` | 钥匙 | 是否有门钥匙3（新达汇3F金宝贝前门钥匙牌，配电房抽屉） | 新达汇-B1配电房-抽屉 | 1 |
| `hasRenjiCard` | 钥匙 | 是否有仁济检验科门禁卡（安居苑203室双肩包夹层，钥匙类） | 三林安居苑-8号楼-203室-门禁卡 | 2 |
| `hasWangPhone` | 钥匙 | 王知筠手机（仁济检验科） | 仁济南院-检验科-手机 | 1 |
| `hasWangNotebook` | 钥匙 | 王知筠实验记录本（仁济检验科） | 仁济南院-检验科-记录本 | 1 |
| `hasMercuryReport` | 钥匙 | 检测报告备份（仁济太平间） | 仁济南院-太平间-报告 | 1 |
| `hasPipelineMap` | 建平中学 - 状态 | 管线图（老吴杂物室，"水有毒"真相线索） | 建平-致真楼-1F-老吴杂物室-搜尸体 | 1 |
| `hasKeyRing` | 建平中学 - 状态 | 钥匙串（老吴身上，开工具间/教室/阀门箱） | 建平-致真楼-1F-老吴杂物室-搜尸体 | 1 |
| `_hasFabKeycard` | 张江（华大半导体 · 洪金宝 | fab 门禁卡（科创老师复制的华大访客卡，进厂唯一途径） | 张江-AI岛-机房-长谈给卡 | 1 |
| `_hasFriendPhoto` | 张江（华大半导体 · 洪金宝 | 曹睿泽与洪金宝的合照（不占背包，可给老师/洪金宝看） | 张江-上科大-宿舍-合照 | 1 |
| `_hasTestReport` | 张江（华大半导体 · 洪金宝 | 上海市检测中心的盖章报告（不占背包，L3物证） | 张江-检测中心-制服 | 1 |

## 五、B级:需先重构(共 25 个)

单向布尔,但写入点分散在多个场景,或被规则引擎(_reactive 等)引用。替换前需先收敛写入点;被规则引用的改动牵涉 core.js 规则层,优先级放低。

| 变量 | 分组 | 说明(core.js注释) | 写入点(场景) | 替换后读法(多场景需 OR 合并) |
| --- | --- | --- | --- | --- |
| `defeatedOldMan` | 场景状态 | 是否已击败安盛街老头丧尸 | `遭遇老头丧尸-犹豫`; `安盛街-踹倒老头丧尸`; `绕过老头丧尸` | `_visit['安盛街-踹倒老头丧尸'] > 0` \|\| `_visit['绕过老头丧尸'] > 0` \|\| … |
| `_hasAlcoholLamp` | 上实南校临时道具（不占背包容 | 酒精灯和火柴（化学实验室取，2号楼1楼砸体育老师丧尸） | `上实南校-化学实验室-面具有`; `上实南校-化学实验室-憋气` | `_visit['上实南校-化学实验室-憋气'] > 0` \|\| `_visit['上实南校-化学实验室-面具有'] > 0` |
| `_triedHotpot` | 上实南校临时道具（不占背包容 | 是否吃过新达汇大渝火锅（一次性） | `新达汇-4F火锅-麻辣`; `新达汇-4F火锅-番茄`; `新达汇-4F火锅-菌菇` | `_visit['新达汇-4F火锅-番茄'] > 0` \|\| `_visit['新达汇-4F火锅-菌菇'] > 0` \|\| … |
| `_powerOut` | 上实南校临时道具（不占背包容 | 新达汇总电闸是否已拉（商场永久断电） | `新达汇-B1保安室-拉闸`; `新达汇-电梯厅-拉闸` | `_visit['新达汇-B1保安室-拉闸'] > 0` \|\| `_visit['新达汇-电梯厅-拉闸'] > 0` |
| `_1f_wireFixed` | 上实南校临时道具（不占背包容 | 1F断裂电线是否已处理 | `新达汇-1F南走廊中-电线-拨开`; `新达汇-1F南走廊中-电线-木棍` | `_visit['新达汇-1F南走廊中-电线-拨开'] > 0` \|\| `_visit['新达汇-1F南走廊中-电线-木棍'] > 0` |
| `_2f_chairsCleared` | 上实南校临时道具（不占背包容 | 2F等位椅堆是否已搬开 | `新达汇-2F北走廊中-搬椅`; `新达汇-2F北走廊中-钻缝`; `新达汇-2F北走廊中-翻椅` | `_visit['新达汇-2F北走廊中-搬椅'] > 0` \|\| `_visit['新达汇-2F北走廊中-翻椅'] > 0` \|\| … |
| `_wangLaptopUnlocked` | 钥匙 | 安居苑203室王知筠笔记本是否已输入开机密码解锁（Dr.Earthwor | `三林安居苑-8号楼-203室-笔记本`; `三林安居苑-8号楼-203室-笔记本-开机`; `三林安居苑-8号楼-203室-笔记本-密码错误` | `_visit['三林安居苑-8号楼-203室-笔记本'] > 0` \|\| `_visit['三林安居苑-8号楼-203室-笔记本-密码错误'] > 0` \|\| … |
| `_renjiGateCleared` | 仁济医院 - 状态 | 门诊正门门口尸群是否清除（浦锦路直通的大门是门诊部） | `仁济南院-门诊大门-记忆闪色-成功`; `仁济南院-门诊大门-记忆闪色-失败` | `_visit['仁济南院-门诊大门-记忆闪色-失败'] > 0` \|\| `_visit['仁济南院-门诊大门-记忆闪色-成功'] > 0` |
| `_renjiERCleared` | 仁济医院 - 状态 | 急诊大厅丧尸是否清除 | `仁济南院-急诊大厅-胜利`; `仁济南院-急诊大厅-受伤` | `_visit['仁济南院-急诊大厅-受伤'] > 0` \|\| `_visit['仁济南院-急诊大厅-胜利'] > 0` |
| `_renjiLabCleared` | 仁济医院 - 状态 | 检验科守卫丧尸是否清除 | `仁济南院-检验科-守卫战-胜利`; `仁济南院-检验科-守卫战-受伤` | `_visit['仁济南院-检验科-守卫战-受伤'] > 0` \|\| `_visit['仁济南院-检验科-守卫战-胜利'] > 0` |
| `_renjiWardCleared` | 仁济医院 - 状态 | 住院部丧尸是否清除 | `仁济南院-住院部走廊-胜利`; `仁济南院-住院部走廊-受伤` | `_visit['仁济南院-住院部走廊-受伤'] > 0` \|\| `_visit['仁济南院-住院部走廊-胜利'] > 0` |
| `_morgueCleared` | 仁济医院 - 状态 | 太平间黑皮丧尸是否处理 | `仁济南院-太平间-黑皮丧尸-胜利`; `仁济南院-太平间-黑皮丧尸-受伤` | `_visit['仁济南院-太平间-黑皮丧尸-受伤'] > 0` \|\| `_visit['仁济南院-太平间-黑皮丧尸-胜利'] > 0` |
| `_renjiNoise` | 仁济医院 - 状态 | 是否破门制造过噪音（影响后续风险） | `仁济南院-检验科-破门`; `仁济南院-检验科-撬开了` | `_visit['仁济南院-检验科-撬开了'] > 0` \|\| `_visit['仁济南院-检验科-破门'] > 0` |
| `_renjiVipZombieCleared` | 仁济医院 - 状态 | 特需病房储物柜丧尸是否已清除（警觉秒杀或沙发引袭后） | `仁济南院-特需病房-沙发-偷袭`; `仁济南院-特需病房-储物柜-警觉` | `_visit['仁济南院-特需病房-储物柜-警觉'] > 0` \|\| `_visit['仁济南院-特需病房-沙发-偷袭'] > 0` |
| `_renjiGateOpen` | 仁济医院 - 状态 | 救护车通道铁门是否已打开（车撞开/枪打开锁均可，持久） | `仁济南院-救护车-倒车撞门`; `仁济南院-救护车-枪击开锁` | `_visit['仁济南院-救护车-倒车撞门'] > 0` \|\| `_visit['仁济南院-救护车-枪击开锁'] > 0` |
| `_yifenEastCleared` | 建平中学 - 状态 | 挹芬楼1F东侧走廊丧尸是否已清（强制记忆闪色） | `建平-挹芬楼-1F-东侧走廊` | `_visit['建平-挹芬楼-1F-东侧走廊'] > 0` |
| `_lijuanFedCup` | 建平中学 - 状态 | 是否已把她的保温杯递给她（发作观察证据，一次性） | `建平-弘渊楼-2F-李娟-发作`; `建平-弘渊楼-2F-李娟-转化` | `_visit['建平-弘渊楼-2F-李娟-发作'] > 0` \|\| `_visit['建平-弘渊楼-2F-李娟-转化'] > 0` |
| `_hyCupsUsed` | 建平中学 - 状态 | 2楼桌面保温杯交互是否已用过（喝水/灌瓶任一后关闭，防刷汞） | `建平-弘渊楼-2F-保温杯-粉色`; `建平-弘渊楼-2F-保温杯-另一只`; `建平-弘渊楼-2F-保温杯-喝水` 等4处 | `_visit['建平-弘渊楼-2F-保温杯-另一只'] > 0` \|\| `_visit['建平-弘渊楼-2F-保温杯-喝水'] > 0` \|\| … |
| `_pengGalCleared` | 建平中学 - 状态 | 是否帮彭奕宸打完galgame | `建平-远翔楼-4F-高三14班-galgame-普通结算`; `建平-远翔楼-4F-高三14班-galgame-真结算` | `_visit['建平-远翔楼-4F-高三14班-galgame-普通结算'] > 0` \|\| `_visit['建平-远翔楼-4F-高三14班-galgame-真结算'] > 0` |
| `_yifenFood6F` | 建平中学 - 状态 | 挹芬楼6F自习教室食品是否已拿 | `建平-挹芬楼-6F-自习教室-食品-吃掉`; `建平-挹芬楼-6F-自习教室-食品-收下` | `_visit['建平-挹芬楼-6F-自习教室-食品-吃掉'] > 0` \|\| `_visit['建平-挹芬楼-6F-自习教室-食品-收下'] > 0` |
| `_jinbaoFriendCommission` | 张江（华大半导体 · 洪金宝 | 洪金宝是否已拜托玩家顺路看曹睿泽（上科大） | `张江-华大-动力站-委托`; `张江-华大-动力站-曹睿泽-委托` | `_visit['张江-华大-动力站-委托'] > 0` \|\| `_visit['张江-华大-动力站-曹睿泽-委托'] > 0` |
| `_jinbaoCaseComplete` | 张江（华大半导体 · 洪金宝 | 是否拿到案例记录表（确证版，真相链物证） | `张江-华大-动力站-告知`; `张江-华大-动力站-补救` | `_visit['张江-华大-动力站-告知'] > 0` \|\| `_visit['张江-华大-动力站-补救'] > 0` |
| `_dieselDelivered` | 张江（华大半导体 · 洪金宝 | 柴油是否已送达动力站（送达→洪金宝撤离顺延一天） | `张江-华大-动力站-柴油-交` | `_visit['张江-华大-动力站-柴油-交'] > 0` |
| `_fabFigBDone` | 张江（华大半导体 · 洪金宝 | 白区三工位人影是否已了结（杀/误杀/对话过） | `张江-华大-白区-工位B-对话`; `张江-华大-白区-工位B-误杀` | `_visit['张江-华大-白区-工位B-对话'] > 0` \|\| `_visit['张江-华大-白区-工位B-误杀'] > 0` |
| `_plazaFigSeen` | 张江（华大半导体 · 洪金宝 | 是否已凑近看过华大厂区广场的人影（一次性观察） | `张江-华大-广场-人影`; `张江-华大-广场-近路-胜` | `_visit['张江-华大-广场-人影'] > 0` \|\| `_visit['张江-华大-广场-近路-胜'] > 0` |

## 六、D级:计数型(共 6 个)

只增不减的数值变量。若对应动作可独立成场景,可改用 `_visit['动作场景']` 的次数语义;否则保留。
特别点名:`visitExitTimes` / `visitWaitingRoomTimes` 是手写的"访问某场景次数"计数器,就是 `_visit` 语义的重复造轮子,应优先替换。

| 变量 | 分组 | 说明(core.js注释) | 写入场景 | 引用文件数 |
| --- | --- | --- | --- | --- |
| `visitExitTimes` | 操作状态 | 访问小区出口次数，达到2自动放行 | 东出口-废车堵路、西出口-丧尸堵路 | 1 |
| `visitWaitingRoomTimes` | 操作状态 | 访问等候区次数，达到3丧尸会出现 | 墙上的民防告示、抽屉里的手电筒 | 1 |
| `turnDiaryPages` | 操作状态 | 翻页次数 | 日记本的提示-打开鼓风机、日记本的空白页 | 1 |
| `repeatedClickTimes` | 操作状态 | 点击重复次数，可以用来设置连点环节 | 初遇陈默、结局-来自丧尸的惊吓 | 1 |
| `_waterDispenserUses` | 常规物品 | 饮水机已使用次数（最多10次） | 长者食堂-饮水机 | 1 |
| `hasInnerLining` | 建平中学 - 状态 | 校服内胆数量（丢给 Harsh 驱赶，单次消耗） | 建平-废弃小楼-3F-团委工作室-收好内胆 | 1 |

## 七、C级:不建议替换(共 166 个)

| 原因 | 数量 | 变量 |
| --- | --- | --- |
| 存在复位/双向写 | 79 | `mm`、`hurtByZombie`、`hasCold`、`_rainExposure`、`chasedByZombies`、`_travelMinutes`、`_restBlocked`、`_hasAcid`、`_yorozuyaUnlocked`、`_catChasing`、`_extinguisherUsed`、`hasBankSlip`、`hasBroom`、`hasDiary`、`hasTorch`、`hasGasMask`、`hasIronPipe`、`hasCane`、`hasMopHandle`、`hasCutter`、`hasAxe`、`hasGun`、`hasDagger`、`hasCharger`、`hasBiscuit`、`hasMap`、`hasLubricant`、`hasCrumpledLeaflet`、`hasPhone`、`hasLiquidParaffin`、`hasBottle`、`bottleWater`、`waterToxic`、`hasFrozenMeat`、`hasInstantNoodle`、`hasCannedFood`、`hasEbikeKey`、`hasDoorKey1`、`hasCarKey`、`hasCatSnack`、`hasKey502`、`hasCommitteeKey`、`hasEbike`、`hasScooter`、`hasRustyBike`、`hasBag`、`hasMercuryPill`、`hasAntibiotic`、`hasPainkiller`、`hasBandage`、`_iodineBoxJustEmptied`、`hasAlcohol`、`hasSutureKit`、`hasTourniquet`、`hasAnesthetic`、`_harshActive`、`_harshCaught`、`hasMultimeter`、`hasCanteenFood`、`hasFeverMed`、`hasWatch`、`hasCSGun`、`hasScrewdriver`、`hasSnackCookie`、`hasHamSausage`、`hasCracker`、`hasTeethingBiscuit`、`hasFakeAntidote`、`_lastCombatDrain`、`_hongBottleLabel`、`hasDieselCan`、`_wearingCleanSuit`、`_airlockOuterClosed`、`_airlockBlowing`、`_airlockInnerOpen`、`_airlockStartFails`、`_airlockLockedOut`、`_airlockLeakRounds`、`_leakSolved` |
| 表达式写值(动态计算) | 55 | `strength`、`hh`、`mercuryLoad`、`_fatiguePaid`、`_catFed`、`_ramenVisited`、`_backhallDead`、`_droneBattery`、`_powerRoomOpen`、`_got3fExtinguisher`、`_jinyiHasFoodForSurvivors`、`_flat401`、`itemCount`、`gunAmmo`、`_cafeteriaEnterMinute`、`phoneBattery`、`foundDadCar`、`waterGivenToTeacher`、`supermarketWaterLeft`、`familyMartNoodleLeft`、`lianhuaCannedLeft`、`hasCar`、`iodineSwabBox`、`_iodineSwabInBox`、`wangPhoneBattery`、`_backGateOpened`、`_harshLag`、`_harshEncounters`、`_harshLastTick`、`_teacherLeft`、`_xinDeathVisit`、`_lijuanTurned`、`vitaminC`、`_vitaminCured`、`_pengPiano`、`_playgroundKicked`、`hasFireTorch`、`_harshDead`、`_garageFireCabinet`、`_jianpingCatFed`、`_roadBull`、`_roadBullBeatenDay`、`_roadBullPaidDay`、`_quackSpot`、`_quackDay`、`_jpStairFloor`、`_lastShotFired`、`gasIndex`、`_fabAlert`、`_airlockMaskOn`、`_leakJustHurt`、`_knowsReportRoom`、`_labAlert`、`_remediedFromLie`、`_bridgeStage` |
| 字符串/位置指针、表达式写值(动态计算) | 19 | `weather`、`_deliveryCode`、`_marketEntry`、`_harshReturn`、`_liuCorpse`、`_pengGalResult`、`_catReturn`、`_bullBack`、`_stairKillNote`、`_pryTool`、`_toldJinbaoTruth`、`_panicEmployeeState`、`_bridgeFrom`、`_labExitTo`、`shirt`、`_elevatorTarget`、`currentArea`、`currentPlace`、`currentPos` |
| 含复位或状态语义,依赖独立变量 | 4 | `maskRemainingUses`、`bagVolume`、`_iodineSwabBoxLeft`、`_vitaminCLeft` |
| 引擎/系统维护、表达式写值(动态计算) | 3 | `showRain`、`showZombies`、`showPowerOut` |
| 初始true资源型(可被消耗为false)、存在复位/双向写 | 2 | `foodUnderBed`、`FamilymartHasZombie` |
| 字符串/位置指针、引擎/系统维护、表达式写值(动态计算) | 2 | `_weaponJustBroke`、`positionAfterOperation` |
| 初始true资源型(可被消耗为false)、表达式写值(动态计算) | 1 | `windy` |
| 复杂结构(Set/数组/对象)、表达式写值(动态计算) | 1 | `_harshTrack` |

## 八、替换注意事项

1. **存档兼容**:替换后旧存档里的旧变量值不再被读取。旧档中 `_visit['写入场景']` 与变量值在快照里本是一致生成的,一般等价;但跨版本存档建议过渡期写 `(vars.旧变量 || vars._visit['场景'] > 0)` 双读。
2. **场景名联动**:改用 _visit 后,场景 ID 成为逻辑的一部分——以后重命名该场景必须全库同步(与既有约定「击杀标记靠场景名或场景内 set,换场景名会断联动」一致)。
3. **回溯/读档一致性**:_visit 与普通变量都随快照恢复,替换不引入新的回溯问题;但 `_visit` 在「回溯跳过」时不累加,依赖 `>1`(第二次进入)语义的场景要实测。
4. **禁止用手写逻辑改 _visit**:_visit 只能由引擎维护,剧情代码只读不写(与 `_fatiguePaid` 同类约束)。
5. **文本分支依赖**:部分变量在 text 函数里用于差异化描述(如尸体还在),替换时注意 `>0`(到过)与 `>1`(第二次到)的取值。

## 附录A:疑似完全未使用的变量

(定义后全库无词频引用或仅定义处出现 1 次)

| 变量 | 分组 | 说明 |
| --- | --- | --- |
| `_seqScene` | 操作状态 | 引擎记录的记忆闪色序列属主场景ID（回溯/读档落回该场景时重播原序列） |
| `_flat201` | 金谊广场 |  |
| `_flat202` | 金谊广场 |  |
| `_flat301` | 金谊广场 |  |
| `_flat302` | 金谊广场 |  |
| `_hyBorrowCardSeen` | 建平中学 - 状态 | 是否看过 1F 借阅处的借书证（知道"李娟"的名字） |
| `gameMemoryThres` | 张江（华大半导体 · 洪金宝支线，见 张江设计稿.md §九） | 解锁A结局所需游戏记忆的个数 |
| `gameMemorySet` | 张江（华大半导体 · 洪金宝支线，见 张江设计稿.md §九） | 目前已获得的游戏记忆集合 |
| `personalMemoryThres` | 张江（华大半导体 · 洪金宝支线，见 张江设计稿.md §九） | 解锁B结局所需个人记忆的个数 |
| `pants` | 张江（华大半导体 · 洪金宝支线，见 张江设计稿.md §九） | 裤子 |

## 附录B:未在 _variables 中定义的“影子变量”(代码中直接赋值)

| 变量 | 写入点(文件:行·场景) |
| --- | --- |
| `_backtrackWarning` | utils.js:194·(函数 transit); utils.js:244·(函数 describeZombieWave) |
| `_cafeteriaElapsed` | 长者食堂.js:100·长者食堂-打门口丧尸 |
| `_currentAnswer` | utils.js:413·(函数 initMemoryGame); 建平中学.js:352·建平-前门; 建平中学.js:1096·建平-挹芬楼-1F-西侧走廊; 建平中学.js:1152·建平-挹芬楼-1F-东侧走廊 |
| `_currentSeq` | utils.js:412·(函数 initMemoryGame); 建平中学.js:351·建平-前门; 建平中学.js:1095·建平-挹芬楼-1F-西侧走廊; 建平中学.js:1151·建平-挹芬楼-1F-东侧走廊 |
| `_drankToxicWater` | core.js:1106·整理整理-喝水 |
| `_employeeWeapon` | 全家和公交站.js:516·全家便利店-员工通道-摸黑; 全家和公交站.js:523·全家便利店-员工通道-摸黑; 全家和公交站.js:534·全家便利店-员工通道-摸黑 |
| `_foundHongContact` | 安居苑.js:1110·三林安居苑-8号楼-204室-翻找 |
| `_foundHongMask` | 安居苑.js:1076·三林安居苑-8号楼-204室-防毒面具; 安居苑.js:1092·三林安居苑-8号楼-204室-防毒面具 |
| `_foundHongNotebook` | 安居苑.js:1056·三林安居苑-8号楼-204室-笔记本 |
| `_garageOps` | 新达汇地下车库.js:71·新达汇-B1停车场-接线; 新达汇地下车库.js:161·新达汇-B1停车场-搜SUV; 新达汇地下车库.js:200·新达汇-B1停车场-拿钥匙; 新达汇地下车库.js:215·新达汇-B1停车场-没钥匙 |
| `_gasMaskGarage` | 建平中学.js:942·建平-地下车库-工具间-开门 |
| `_gateWeapon` | 金谊广场.js:556·金谊广场-正门硬闯; 金谊广场.js:559·金谊广场-正门硬闯; 金谊广场.js:568·金谊广场-正门硬闯 |
| `_hideFail` | utils.js:456·(函数 hideOnLocation); utils.js:459·(函数 hideOnLocation); 建平中学.js:215·(函数 jpHide); 建平中学.js:218·(函数 jpHide) |
| `_knownSideDoorPassword` | 上实南校.js:761·上实南校-图书馆-情报; 上实南校.js:786·上实南校-图书馆-给食物-选择; 上实南校.js:796·上实南校-图书馆-给食物 |
| `_libraryEnding` | 夜晚剧情.js:469·过夜-图书馆 |
| `_metGaoAtMall` | 新达汇.js:121·新达汇-喷泉广场-高锦睿-聊 |
| `_metPETeacher` | 上实南校.js:190·上实南校-2号楼走廊 |
| `_peTeacherDead` | 上实南校.js:657·上实南校-击败体育老师 |
| `_pipeBroke` | 五金店.js:299·联华超市-地下室-撬锁 |
| `_prevPos1` | utils.js:200·(函数 transit) |
| `_prevPos2` | utils.js:199·(函数 transit) |
| `_roofOpened` | 安居苑.js:1317·三林安居苑-7号楼-天台破锁 |
| `_seqPlayed` | utils.js:414·(函数 initMemoryGame); 建平中学.js:353·建平-前门; 建平中学.js:1097·建平-挹芬楼-1F-西侧走廊; 建平中学.js:1153·建平-挹芬楼-1F-东侧走廊 |
| `_sprintDest` | utils.js:213·(函数 sprintAway) |
| `_tryDoor` | 樱桃苑（初始小区）.js:1721·樱桃苑-5楼; 樱桃苑（初始小区）.js:1726·樱桃苑-5楼 |
| `_wiredCorrectly` | 新达汇地下车库.js:102·新达汇-B1停车场-接线成功 |
| `askTunnelLore` | 安盛街.js:437·理发店-交谈 |