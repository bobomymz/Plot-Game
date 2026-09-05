// ========== story-core.js ==========
// 全局变量、触发器、屏幕特效、起始场景

const storyData = {

  // -------- 1. 变量定义（必须放在最前面）--------
  _variables: {
    // --- 基础数值 ---
    strength: 7,               // 体力值（初始值为7，最大10）
    isWeak: false,             // 是否虚弱
    dd: 1,                     // 当前日期，初始为1，单位为天数
    hh: 8,                     // 当前时间，初始为8，单位为小时
    mm: 0,                     // 当前时间，初始为0，单位为分钟
    // 时间格式：天数-小时-分钟，从玩家醒来当天零点开始计算，玩家醒来时间为Day1 8:00（2026/6/29）
    hurtByZombie: false,       // 是否被丧尸咬（后续未找到医疗物资会感染）
    hasCold: false,            // 是否感冒（雨天户外累积受凉；只能吃退烧药治愈，掉体力更快）
    _rainExposure: 0,          // 受凉值 0-100（雨天户外场景每次+20，晴/阴户外清零；满100感冒）
    mercuryLoad: 0,            // 汞负荷 0-100，隐藏变量（设计细节 §三）

    // --- 天气 ---
    weather: "晴",             // "晴" / "阴" / "雨"
    windy: true,               // 是否有风

    // --- 场景状态 ---
    _visit: {},                    // 自动记录各场景访问次数（引擎自动维护，不可修改）
    foodUnderBed: true,        // 底下是否有食物，初始为true
    chasedByZombies: 0,        // 被尸潮追击的等级（0~5，效果：进行任何战斗操作都有概率被群殴，qte时间均缩短，体力消耗增加）
    _travelMinutes: 0,         // 连续户外移动累积时间（分钟），户外场景 >6min 的移动累加，休息/吃饭/过夜归零
    _isOutdoor: false,         // 当前渲染场景是否户外（引擎每次渲染按 scene.outdoor 写入，供 updateTime 判断疲劳累计）
    _sleepingZombieGone: false,// 小区道路椅子上躺着的那个丧尸走了没有
    bikeInAnjuyuan: true,      // 三林安居苑是否还有锈蚀的自行车
    FamilymartHasZombie: true, // 全家是否还有员工丧尸
    pharmacyZombieKilled: false, // 益丰大药房白大褂丧尸是否已被击杀
    pharmacyApprenticeWatered: false, // 益丰大药房长发女学徒是否已被喂水
    pharmacyApprenticeKilled: false, // 益丰大药房长发女学徒是否已被解脱
    libraryCleared: false,     // 是否清空了社区图书馆的丧尸
    defeatedOldMan: false,     // 是否已击败安盛街老头丧尸
    _supermarketCompromised: false, // 联华超市地下室是否已暴露不再安全
    _supermarketSuppliesTaken: false,// 联华超市的补给是否已经拿到
    maskRemainingUses: 1,      // 防毒面具剩余使用次数（初始1，含进风机房，耗尽可能二次使用会死）
    hasClassMates: false,      // 是否救出上实南校三位同学
    _yorozuyaUnlocked: false,  // 是否解锁哥哥的深夜食堂
    _triedHotpot: false,       // 是否吃过新达汇大渝火锅（一次性）
    _catChasing: false,        // 新达汇变异猫是否在追玩家
    _catFed: false,            // 新达汇变异猫是否已被喂食（中立）
    _ramenVisited: false,      // 新达汇1F味千拉面是否已被撬开
    _backhallEntered: false,   // 新达汇后勤通道网是否已被发现（防刷）
    _backhallDead: false,      // 新达汇后勤通道被堵死即死标记
    _powerOut: false,          // 新达汇总电闸是否已拉（商场永久断电）
    _1f_wireFixed: false,      // 1F断裂电线是否已处理
    _2f_chairsCleared: false,  // 2F等位椅堆是否已搬开
    _3f_darkZoneDone: false,   // 3F黑暗段是否已安全通过
    _deliveryCode: "",         // 外卖取餐码（拿到外卖时记录）
    _droneBattery: 30,         // 无人机剩余电量(分钟)，断电后消耗
    _extinguisherUsed: false,   // 地铁站里是否使用过灭火器
    _marketHallCleared: false, // 菜市场大厅的丧尸是否已清理
    _marketEntry: "",          // 菜市场进入路线：""=未进入 / "大厅"=正门(安盛街西侧) / "员工通道"=长者食堂后厨

    // --- 操作状态 ---
    visitExitTimes: 0,         // 访问小区出口次数，达到2自动放行
    visitWaitingRoomTimes: 0,  // 访问等候区次数，达到3丧尸会出现
    talkToBarber: false,       // 是否与理发师交谈过
    restAtBarber: false,       // 是否在理发店休息过
    turnDiaryPages: 0,         // 翻页次数
    repeatedClickTimes: 0,     // 点击重复次数，可以用来设置连点环节
    fightWithVineZombie: false,// 是否与被藤蔓缠绕的丧尸打过
    _stationeryZombieDead: false, // 安盛街文具店少年丧尸是否已被击杀
    hasBankSlip: false,        // 是否拿到银行存单
    _droneIntel: false,        // 是否获得无人机侦察情报（物业楼高锦睿）
    _committeeSearched: false,  // 是否搜过物业楼居委会办公室
    showRain: false,           // 是否展示雨滴叠加特效（B类场景 onEnter 控制）
    showZombies: false,        // 是否展示丧尸包围遮罩（路网节点 onEnter 控制）
    showPowerOut: false,       // 是否展示停电灰色遮罩（新达汇室内节点 onEnter 控制）
    wangGiveKey: false,        // 王老师是否给了钥匙
    _lastScene: "",            // 引擎自动记录的上一个场景ID（目标场景 text 用于差异化承接）
    // 金谊广场
    _chenmoRescued: false,      // 是否在停车场救了陈默
    _jinyiSurvivorsFed: false,  // 是否给长廊幸存者送了食物
    _jinyiSurvivorsRobbed: false, // 是否被长廊幸存者抢了
    _jinyiHasFoodForSurvivors: false, // 是否从B1奥乐齐带了食物给长廊幸存者
    _jinyiB2GasWarned: false,   // B2毒气是否已预警过
    _jinyiAlcoholUsed: false,   // KTV酒精是否已用于消毒

    // --- 物品状态 ---
    // 常规物品
    itemCount: 0,              // 物品数量
    bagVolume: 3,              // 背包容量（最大物品数量）
    hasBroom:  false,          // 是否有扫帚（民防设施等候室）
    hasDiary:  false,          // 是否有日记本（民防设施等候室桌上）
    hasTorch:  false,          // 是否有手电筒（民房设施等候室桌子抽屉）
    hasGasMask:   false,       // 是否有防毒面具（民防设施物资区）
    hasIronPipe: false,        // 是否有铁管（民防设施物资区箱子后面，打斗中才能获得）
    hasCane: false,            // 是否有拐杖（安盛街老头丧尸）
    hasMopHandle: false,       // 是否有拖把杆（理发店）
    hasCutter: false,          // 是否有美工刀
    hasAxe: false,             // 是否有斧头（警察局警用斧 / 初始小区1楼消防箱，统一为斧头）
    hasGun: false,             // 是否有手枪（警察局）
    gunAmmo: 0,                // 手枪剩余子弹（警察局首取3发，全图几乎无补给；空枪扣扳机=死）
    _policeGunTaken: false,    // 是否已在警察局拿到过手枪（防"丢枪→重取"刷满子弹）
    hasDagger: false,          // 是否有匕首（警察局）
    hasCharger: false,         // 是否有充电器（图书馆藏书区，解锁王知筠笔记本）
    hasBiscuit: false,         // 是否有饼干（安盛街便利店）
    hasMap: false,             // 是否有交通地图（三林安居苑藤蔓丧尸）
    hasLubricant: false,       // 是否有润滑油（五金店仓库，可带到安居苑修车）
    hasCrumpledLeaflet: false, // 是否有揉皱的传单
    _leafletUsed: false,       // 是否已用传单打开过服装店304柜（传单使命完成）
    _cafeteriaEnterMinute: -1, // 长者食堂首次进入的游戏总分钟数（计时难度用，-1=未进入）
    hasPhone: false,           // 是否拥有可用的手机(自己的原机[全家门口妈妈遗物] 或 华为店展示机)
    phoneBattery: 0,           // 手机剩余电量%(妈妈遗物+20/华为展示机+50；照明、WiFi、扫码节点各-5，无充电途径)
    foundMomRemains: false,    // 是否已在全家门口发现妈妈的遗物(回收自己的手机)
    foundDadCar: false,        // 是否查看过济阳路跨线桥那辆弃车(爸爸线 breadcrumb)
    hasLiquidParaffin: false,  // 是否有医用石蜡油（益丰大药房左边货架）
    hasBottle: false,          // 是否有水瓶
    bottleWater: 0,            // 水瓶还有几口水（0=空瓶，1=有水；饮水机可反复打满）
    waterToxic: false,         // 瓶里的水是否被甲基汞污染（金谊广场后厨接水为毒水）
    _waterDispenserUses: 0,    // 饮水机已使用次数（最多10次）
    waterGivenToTeacher: 0,    // 给王老师的水次数（0→15，满15次信任达成）
    supermarketWaterLeft: 12,  // 联华超市仓库瓶装水剩余（瓶）
    teacherStudentsDead: false, // 给王老师毒水后学生变丧尸的死局标记
    _cafeteriaWifiOn: false,   // 长者食堂办公室路由器是否已开启
    fangTradeCount: 0,         // 方姐交易次数（上限3，满3次后她尸变，再进冷库深处即死）
    hasFrozenMeat: false,      // 是否有冻肉（菜市场方姐换的，体力回满，占1格）
    // 钥匙
    hasEbikeKey: false,        // 是否有电瓶车钥匙（民防设施告示纸后面）
    hasDoorKey1: false,        // 是否有门钥匙1（全家便利店员工通道）
    hasCarKey: false,          // 是否有轿车钥匙
    hasCatSnack: false,        // 是否有脆脆炒米（新达汇4F大渝火锅门口，猫零食）
    hasKey502: false,          // 是否有502钥匙（鹅卵石路自行车）
    hasCommitteeKey: false,    // 是否有居委会钥匙（樱桃苑5楼孙阿姨）
    hasRenjiCard: false,       // 是否有仁济检验科门禁卡（安居苑203室双肩包夹层，钥匙类）
    // 交通工具（不占背包）
    hasCar: false,             // 是否有轿车
    hasEbike:  false,          // 是否有电瓶车（地下车库非机动车区域）
    hasScooter: false,         // 是否有滑板车
    hasRustyBike: false,       // 是否有锈蚀的自行车
    // 特殊道具（不占背包）
    hasBag: false,             // 是否有背包（bagVolume+1）
    hasMercuryPill: false,      // 是否有甲基汞抑制剂（童涵春堂无标签药丸）
    // 仁济医院 - 医疗物资（占背包，全图唯一）
    hasAntibiotic: false,   // 抗生素（仁济门诊药房）
    hasPainkiller: false,   // 止痛药（仁济门诊药房）
    hasBandage: false,      // 绷带（仁济大门）
    hasIodine: false,       // 碘伏（仁济检验科）
    hasAlcohol: false,      // 医用酒精（仁济门诊药房，可消毒伤口）
    hasSutureKit: false,    // 缝合包（仁济手术供应室）
    hasTourniquet: false,   // 止血带（仁济手术供应室）
    hasAnesthetic: false,   // 麻醉剂（仁济手术供应室）
    // 仁济医院 - 真相线索（占背包）
    hasWangPhone: false,    // 王知筠手机（仁济检验科）
    hasWangNotebook: false, // 王知筠实验记录本（仁济检验科）
    hasMercuryReport: false,// 检测报告备份（仁济太平间）
    wangPhoneBattery: 0,    // 王知筠手机剩余电量（捡到时按 dd 计算）
    // 仁济医院 - 状态
    _renjiERCleared: false,     // 急诊大厅丧尸是否清除
    _renjiLabCleared: false,    // 检验科守卫丧尸是否清除
    _renjiWardCleared: false,   // 住院部丧尸是否清除
    _renjiSurvivorSaved: false, // 住院部幸存者是否救出
    _fangyuFound: false,        // 方瑜痕迹是否发现
    _morgueCleared: false,      // 太平间黑皮丧尸是否处理
    _morgueVentOn: false,       // 太平间通风是否打开
    _renjiNoise: false,         // 是否破门制造过噪音（影响后续风险）
    _renjiHerbalTaken: false,   // 中医科草药是否已拿（一次性+1体力）
    _renjiGlucoseTaken: false,  // 护士站葡萄糖是否已喝（一次性+1体力）
    _renjiPeeked: false,        // 是否透过检验科后门玻璃窗窥视过
    _renjiDrinkTaken: false,    // 特需病房功能饮料是否已喝（一次性+1体力）
    // 建平中学 - 状态
    _frontGateCleared: false,   // 前门丧尸是否已清（记忆闪色，成功后一次性进出）
    _backGateOpened: false,     // 后门是否已开（开门引走丧尸，忻老师后门逃脱的铺垫）
    _harshActive: false,        // Harsh（年级组长丧尸）是否被唤醒（坐电梯触发）
    _harshLag: 6,               // Harsh 落后玩家几步（>=0；走远+1、她逼近-1、折返-2；<=0 即追上）
    _harshTrack: [],            // 玩家地点轨迹数组（真实路径，仅用于折返剪枝判断）
    _harshCaught: false,        // 是否被 Harsh 追上（触发"被堵住"）
    _harshEncounters: 0,        // 累计撞上 Harsh 次数（2次强制休眠）
    hasInnerLining: 0,          // 校服内胆数量（丢给 Harsh 驱赶，单次消耗）
    _harshReturn: "",           // 被 Harsh 堵住前的位置（逃跑/驱赶后返回）
    _harshLastTick: -1,          // Harsh 上次推进时的 3 分钟档（用于计算一次推进几步）
    _innerLiningYouthRoom: false, // 团委工作室的校服内胆是否已拿
    _yuanxiangWestStairCleared: false,  // 远翔楼西楼梯强丧尸是否已清
    _zhizhenEastStairCleared: false,    // 致真楼东楼梯强丧尸是否已清
    _yifenWestCleared: false,   // 挹芬楼1F西侧走廊丧尸是否已清（强制记忆闪色）
    _yifenEastCleared: false,   // 挹芬楼1F东侧走廊丧尸是否已清（强制记忆闪色）
    _teacherLeft: false,        // 忻老师是否已开车离开（跟去复旦后为 true）
    hasMultimeter: false,       // 万用表（老吴杂物室，修14班电脑用）
    _dormCleared: false,        // 建平宿舍丧尸是否已清理（记忆闪色，安全过夜前置）
    _liuCorpse: false,          // 刘冠宇是否已死（锁存：在食堂观察到尸体后永久保持，关煤气阀不复活）
    hasPipelineMap: false,      // 管线图（老吴杂物室，"水有毒"真相线索）
    hasKeyRing: false,          // 钥匙串（老吴身上，开工具间/教室/水表井）
    _laowuKilled: false,        // 老吴尸变后是否被击杀
    _pengComputerFixed: false,  // 14班电脑是否修好（供电）
    _pengGalCleared: false,     // 是否帮彭奕宸打完galgame
    _pengNoodleShared: false,   // 14班方便面是否已分享（饭点一次性）
    hasCanteenFood: false,      // 食堂干粮（占背包，一次性，吃+体力）
    hasFeverMed: false,         // 退烧药（医务室，占背包，感冒系统铺路）
    hasWatch: false,            // 机械手表（行政楼2F文印室，占背包，整理整理看时间）
    hasCSGun: false,            // 真人CS枪（废弃小楼1F纸箱，占背包，化学实验室拆成手电筒）
    hasScrewdriver: false,      // 螺丝刀（物理实验室/老吴杂物室锁柜，钥匙串开，拆CS枪用，全图唯一）
    _podiumFood3F: false,       // 挹芬楼3F高一教室锁讲台食物是否已拿（钥匙串开，+3体力）
    _valveBoxOpened: false,     // 崮山路市政阀门箱是否已开（钥匙串开，验水）
    _pengPiano: 0,              // 彭奕宸弹琴位置：1=远翔楼圆厅 2=挹芬楼休息区 3=音乐教室；0=不在钢琴
    _yifenStudentSaved: false,  // 挹芬楼5F幸存学生是否已救活（退烧药，无奖励）
    _yifenFood2F: false,        // 挹芬楼2F高一教室食品是否已拿
    _yifenNote3F: false,        // 挹芬楼3F高一教室纸条是否已看
    _yifenBoard5F: false,       // 挹芬楼5F高二教室黑板字是否已看
    _yifenFood6F: false,        // 挹芬楼6F自习教室食品是否已拿
    _guardTakeoutTaken: false,  // 门卫室外卖是否已处理（Day<3 新鲜+1，Day≥3 变质）
    _playgroundKicked: false,   // 操场那只足球是否已踢过（回忆[起脚爆射]，一次性）
    // 建平·道具解密支线（橘猫向导 B / 石蜡油火把 C）
    hasFireTorch: false,      // 石蜡油火把（化学实验室制，不占格；照明不耗，烧敌人/楼梯丧尸时燃尽）
    _harshDead: false,        // Harsh 是否被火烧死（永久，坐电梯不再唤醒）
    _garageFireCabinet: false,// 地下车库深处消防柜是否已被光源照亮发现
    _jianpingCatFed: false,   // 建平橘猫是否已喂（喂后带路去致真楼 + Harsh 软预警）
    _catReturn: "",           // 橘猫相遇时来自哪个游走节点（喂后"算了/由它去"回这里）
    hasSnackCookie: false,    // 味千小饼干（占格；可拆吃+1 / 喂橘猫）
    hasHamSausage: false,     // 火腿肠（联华"小超市"货架，占格；可吃+1 / 喂橘猫）
    hasCracker: false,        // 夹心饼干（挹芬楼6F自习教室，样板改可收集，占格；可吃+1 / 喂橘猫）
    _stairKillNote: "",       // 堵路强丧尸清场旁白（武器effect写入，楼梯text展示后清除，一次性）
    gasIndex: 0,                // 煤气指数（后厨累积，>=100 中毒死亡）
    _gasValveClosed: false,     // 食堂煤气阀是否关闭
    _chefCleared: false,        // 厨师丧尸是否清除
    // 记忆（不占背包）
    gameMemoryThres: 10,        // 解锁A结局所需游戏记忆的个数
    gameMemorySet: new Set(),         // 目前已获得的游戏记忆集合
    personalMemoryThres: 10,    // 解锁B结局所需个人记忆的个数
    personalMemorySet: new Set(),     // 目前已获得的个人记忆集合
    mixedMemorySet: new Set(),        // 目前已获得的混合记忆集合

    // 穿搭（字符型变量，换装仅限安全场景）
    shirt: "普通T恤",            // 上衣
    pants: "牛仔裤",             // 裤子
    shoes: "运动鞋",             // 鞋子

    // 位置描述变量
    positionAfterOperation: "",            // 下一步跳转的位置，用于跳到某些统筹节点再回来
    _elevatorTarget: "",                   // 电梯/货梯目标楼层场景ID
    currentArea: "初始小区",               // 大区域：初始小区/周边社区/高架/迪士尼/临港/郊区
    currentPlace: "初始小区",              // 具体地点：初始小区/三林路/东明路/安盛街/十字路口/新达汇/安居苑/高架
    currentPos: "我家",                   // 精确位置：我家/地下车库/小区道路/民防设施/东门/西门/全家便利店/公交站/五金店/益丰大药房/银行/联华超市/理发店/文具店/服装店/图书馆/上实南校/地铁站/各类室内场所
    // 如果存在边界情况，某一级的地点变量应该继承上一级的地点变量，最大限度避免错误位置分类
  },

  // --- 钳位设定 ---
  _caps: {
    strength:  { min: 0, max: 10 },
    chasedByZombies:  { min: 0, max: 5 },
    phoneBattery: { min: 0, max: 100 },
    // 未来随时加：
    // sanity:   { min: 0, max: 100 },
    // bagVolume:{ min: 1, max: 20 },
  },

  // --- 显示格式化：{变量名} 插值时调用，不影响原值 ---
  _display: {
    strength: function(v) { return Math.round(v); },
  },

  // story-core.js 中，放在 _caps 和 _globalTriggers 之间

  // -------- 响应式规则 --------
  _reactive: {

    // ===== 1. 派生变量：每次状态变更后自动重算 =====
    computed: {
      // 支持字符串表达式（推荐，简洁）
      gameMinutes: "((dd - 1) * 1440 + (hh - 8) * 60 + mm)",
      isNight:     "hh >= 19 || hh < 6",
      minutesBetweenReduceStrength: "(hurtByZombie && hasCold) ? 15 : (hurtByZombie ? 20 : (hasCold ? 40 : 60))", // 受伤/感冒都会让体力掉更快，叠加更快
      canSee: function(v) { return canSee(v); },
      hasFood: function(v) { return hasFood(v); }, // 是否有食物
      zombieAtHomeDoor: function(v) { return zombieAtHomeDoor(v); }, // 丧尸还在门口
      hasNoTransportation: function(v) { return hasNoTransportation(v); }, // 是否没有交通工具
      hasMeleeWeapon: function(v) { return hasMeleeWeapon(v); }, // 是否有近战武器（普通+斧头/匕首，含在 string condition 里直接引用）
      meleeWeaponTier: function(v) { return meleeWeaponTier(v); }, // 近战武器档位 0-3，强丧尸用 "meleeWeaponTier >= N" 挡弱武器
      zombieOutsideHome: function(v) { return zombieOutsideHome(v); }, // 丧尸在门口
      // 也支持函数（复杂逻辑）
      // fatigue: function(v) { return Math.max(0, 10 - v.strength); }
    },

    // ===== 2. 响应式规则：条件满足时自动触发 =====
    rules: [
      // --- 每小时自动扣一点体力（饥饿） ---
      {
        id: "starvation",
        condition:  "gameMinutes > minutesBetweenReduceStrength",
        triggerKey: "Math.floor(gameMinutes / minutesBetweenReduceStrength)",
        effect: { add: { strength: -1 } },   // 简单效果直接用对象
        onTrigger: function(v) { flashStatusWarning("⚠ 体力 -1（饥饿）· 剩余 " + Math.round(v.strength)); }
      },

      // --- 连续移动疲劳（20/36/48/56/60五档，间隔递减，每档-1体力） ---
      {
        id: "travel-fatigue",
        condition:  "_travelMinutes >= 20",
        triggerKey: "_travelMinutes >= 60 ? 5 : (_travelMinutes >= 56 ? 4 : (_travelMinutes >= 48 ? 3 : (_travelMinutes >= 36 ? 2 : 1)))",
        effect: { add: { strength: -1 } },
        onTrigger: function(v) { flashStatusWarning("⚠ 体力 -1（疲劳）· 剩余 " + Math.round(v.strength)); }
      },

      // --- 体力低于 3 时进入虚弱状态 ---
      {
        id: "weak-status",
        condition:  "strength < 3",
        triggerKey: "strength < 3 ? 1 : 0",   // 只在跨过阈值时触发一次
        effect: function(v) {
          v.isWeak = true;
        }
      },
      {
        id: "weak-status-clear",
        condition:  "strength >= 3",
        triggerKey: "strength >= 3 ? 1 : 0",
        effect: function(v) {
          v.isWeak = false; // 虚弱状态撤销
        }
      },

      // --- 断电后无人机电量消耗 ---
      {
        id: "drone-battery",
        condition:  "_powerOut && _droneBattery > 0",
        triggerKey: "Math.floor(gameMinutes / 1)",
        effect: function(v) {
          v._droneBattery = Math.max(0, v._droneBattery - 1);
        }
      },

      // --- 新达汇变异猫追击：每约3分钟概率吸引丧尸 ---
      {
        id: "cat-chase",
        condition:  "_catChasing && currentPlace.indexOf('新达汇') >= 0",
        triggerKey: "Math.floor(gameMinutes / 3)",
        effect: function(v) {
          if (Math.random() < 0.25) {
            v.chasedByZombies = Math.min(5, v.chasedByZombies + 1);
            return true;   // 追击等级实际上升
          }
          return false;
        },
        onTrigger: function(v, rule, rose) {
          if (rose) flashStatusWarning("⚠ 尸潮逼近 · 尸潮等级 " + v.chasedByZombies);
        }
      },

      // --- 仁济医院尸潮围拢：逗留越久，外面尸潮越多（封顶4，离开才死） ---
      {
        id: "renji-siege",
        condition:  "currentArea == '仁济南院'",
        triggerKey: "Math.floor(gameMinutes / 4)",
        effect: function(v) {
          var prob = v._renjiNoise ? 0.4 : 0.2;   // 破门噪音后概率翻倍
          if (Math.random() < prob) {
            v.chasedByZombies = Math.min(4, v.chasedByZombies + 1);
            return true;   // 追击等级实际上升
          }
          return false;
        },
        onTrigger: function(v, rule, rose) {
          if (rose) flashStatusWarning("⚠ 尸潮围拢 · 尸潮等级 " + v.chasedByZombies);
        }
      },

      // --- Harsh 追逐：每3分钟逼近1步（一次状态变更跨 N 档则推进 N 步），追上触发"被堵住" ---
      {
        id: "harsh-chase",
        condition: function(v) { return v._harshActive && !v._harshCaught; },
        triggerKey: "Math.floor(gameMinutes / 3)",
        effect: function(v) {
          var tick = Math.floor(v.gameMinutes / 3);
          var last = (v._harshLastTick === undefined || v._harshLastTick === null || v._harshLastTick < 0) ? tick - 1 : v._harshLastTick;
          var steps = Math.max(0, tick - last);   // 跨 N 档逼近 N 步（激活当下为 0，不抢跑）
          steps = Math.min(steps, 4);            // 封顶：单次最多逼近4步，防止异常时间跳跃瞬移
          v._harshLastTick = tick;
          v._harshLag = (v._harshLag || 0) - steps;
          if (v._harshLag <= 0) {
            v._harshCaught = true;
            return true;   // 追上了
          }
          return false;
        },
        onTrigger: function(v, rule, caught) {
          if (caught) return;  // 追上交给全局触发器处理
          if ((v._harshLag || 0) <= 2) flashStatusWarning("⚠ 身后传来拖沓的脚步声……（有什么东西在逼近）");
        }
      },

      // --- 彭奕宸钢琴游走：午餐后13-14、放学16-17，每小时 roll 一次去哪架钢琴 ---
      {
        id: "peng-piano",
        condition: function(v) { return v.hh === 13 || v.hh === 16; },
        triggerKey: "hh",
        effect: function(v) {
          var opts = [1, 3];                    // 远翔楼圆厅、音乐教室
          if (v._yifenEastCleared) opts.push(2); // 挹芬楼休息区（清理东侧走廊后才去）
          v._pengPiano = opts[Math.floor(Math.random() * opts.length)];
        }
      },

    ]
  },

  // -------- 全局触发器 --------
  _globalTriggers: [
    { condition: "strength <= 0.01", targetScene: "结局-体力耗尽", priority: 10 },
    { condition: "gasIndex >= 100", targetScene: "结局-煤气中毒", priority: 5 },
    { condition: "_harshCaught", targetScene: "建平-Harsh堵住", priority: 8 },
    { condition: "mercuryLoad >= 70", targetScene: "结局-汞中毒尸变", priority: 9 },
    { condition: "chasedByZombies >= 5", targetScene: "结局-尸潮撕碎了你", priority: 8 },
    { condition: "_backhallDead", targetScene: "结局-后勤通道被堵", priority: 7 },
    { condition: "hh >= 19", targetScene: "天黑必须过夜", priority: 5 },
    { condition: "itemCount > bagVolume", targetScene: "物品太多啦", priority: 2 }
    // 未来可继续添加
    // {
    //   condition: "sanity <= 0",
    //   targetScene: "精神崩溃发疯",
    //   priority: 2
    // }
  ],

  // -------- 屏幕特效 --------
  _screenEffects: [
    { condition: "strength == 2", className: "vignette-warning" },
    { condition: "strength <= 1", className: "vignette-danger" },
    { condition: 'weather == "雨" && showRain', className: "weather-rain" },
    { condition: "_powerOut && showPowerOut", className: "power-out" },
    {
      condition: "chasedByZombies >= 1 && chasedByZombies <= 2 && showZombies",
      className: "zombie-surround-moderate",
      onActivate: function(overlay) {
        var pool = [
          "images/zombie-surround-m1.png",
          "images/zombie-surround-m2.png",
          "images/zombie-surround-m3.png"
        ];
        overlay.style.setProperty('--zombie-bg', "url('" + pool[Math.floor(Math.random() * pool.length)] + "')");
      },
      onDeactivate: function(overlay) {
        overlay.style.removeProperty('--zombie-bg');
      }
    },
    {
      condition: "chasedByZombies >= 3 && showZombies",
      className: "zombie-surround-heavy",
      onActivate: function(overlay) {
        var pool = [
          "images/zombie-surround-h1.png",
          "images/zombie-surround-h2.png",
          "images/zombie-surround-h3.png"
        ];
        overlay.style.setProperty('--zombie-bg', "url('" + pool[Math.floor(Math.random() * pool.length)] + "')");
      },
      onDeactivate: function(overlay) {
        overlay.style.removeProperty('--zombie-bg');
      }
    }
    // 未来可扩展：
    // { condition: "sanity <= 2", className: "screen-wobble" },
    // { condition: "poisoned",    className: "screen-green-tint" },
  ],

  // -------- 起始 / 全局节点 --------
  "结局-体力耗尽": {
    image: "images/outOfStrength.png",
    text: "你的体力彻底耗尽……眼前一黑，倒在了冰冷的地面上。\n再也没有醒来。\n\n—— 结局：体力耗尽 ——",
    style: "color: #ff4444; font-weight: bold;"
  },
  "物品太多啦": {
    image: "images/tooMany.png",
    text: "你携带的物品太多啦，不能拿啦。你可以选择撤回哦~",
    style: "color: #ff4444; font-weight: bold;"
  },
  "直面尸潮": {
    image: "images/youMeetZombies.png",
    onEnter: { add : {chasedByZombies: 2} }, // 被丧尸突然袭击，+2
    text: "一群饥渴的丧尸从阴影中跳出，向你冲了过来，你得快点跑了",
    choices: [
      {
        text: "跑！",
        nextScene: "{positionAfterOperation}"
      }
    ]
  },
  "结局-尸潮撕碎了你": {
    image: "images/zombieWaveSmashYouIntoPieces.png",
    text: "尸潮彻底包围了你，你被撕碎了。\n\
—— 结局：尸潮撕碎了你 ——"
  },
  "整理整理": { // 汇总一下物品
    image: "images/整理整理.png" ,
    text: "你的东西也许有点多。把一些没用的东西丢掉，这样能拿更多有用的东西。",
    choices: [
      {
        showCondition: "hasBroom",
        text: "丢下扫帚",
        effect: updateTime(1, { set : { hasBroom: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasDiary",
        text: "丢下日记本",
        effect: updateTime(1, { set : { hasDiary: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasTorch",
        text: "丢下手电筒",
        effect: updateTime(1, { set : { hasTorch: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasIronPipe",
        text: "丢下铁管",
        effect: updateTime(1, { set : { hasIronPipe: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasGasMask",
        text: "丢下防毒面具",
        effect: updateTime(1, { set : { hasGasMask: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasBottle",
        text: "丢下水瓶",
        effect: updateTime(1, { set : { hasBottle: false, bottleWater: 0, waterToxic: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasBottle && bottleWater > 0",
        text: "喝水（体力+1）",
        nextScene: "整理整理-喝水"
      },
      {
        showCondition: "hasFrozenMeat",
        text: "吃掉冻肉（体力回满）",
        nextScene: "整理整理-吃冻肉"
      },
      {
        showCondition: "hasPhone && phoneBattery > 0 && _cafeteriaWifiOn && currentPlace == '长者食堂'",
        text: "用手机看看有什么消息（电量 {phoneBattery}%）",
        nextScene: "长者食堂-手机信息",
        effect: function(v) { v.positionAfterOperation = v.positionAfterOperation || "长者食堂-内部"; v.phoneBattery = Math.max(0, v.phoneBattery - 5); return {}; }
      },
      {
        showCondition: "hasEbikeKey",
        text: "丢下电瓶车钥匙",
        effect: updateTime(1, { set : { hasEbikeKey: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasDoorKey1",
        text: "丢下门钥匙",
        effect: updateTime(1, { set : { hasDoorKey1: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasKey502",
        text: "丢下502钥匙",
        effect: updateTime(1, { set : { hasKey502: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasCane",
        text: "丢下拐杖",
        effect: updateTime(1, { set : { hasCane: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasMopHandle",
        text: "丢下拖把杆",
        effect: updateTime(1, { set : { hasMopHandle: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasCutter",
        text: "丢下美工刀",
        effect: updateTime(1, { set : { hasCutter: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasAxe",
        text: "丢下斧头",
        effect: updateTime(1, { set : { hasAxe: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasGun",
        text: "丢下手枪",
        effect: updateTime(1, { set : { hasGun: false, gunAmmo: 0 }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasDagger",
        text: "丢下匕首",
        effect: updateTime(1, { set : { hasDagger: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasCharger",
        text: "丢下充电器",
        effect: updateTime(1, { set : { hasCharger: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasBag",
        text: "丢下帆布包",
        effect: updateTime(1, { set : { hasBag: false }, add: { bagVolume: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasBiscuit",
        text: "吃掉饼干（体力+1）",
        nextScene: "整理整理-吃饼干"
      },
      {
        showCondition: "hasBiscuit",
        text: "丢下饼干",
        effect: updateTime(1, { set : { hasBiscuit: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasMap",
        text: "丢下地图",
        effect: updateTime(1, { set : { hasMap: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasCarKey",
        text: "丢下车钥匙",
        effect: updateTime(1, { set : { hasCarKey: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasLubricant",
        text: "丢下润滑油",
        effect: updateTime(1, { set : { hasLubricant: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasLiquidParaffin",
        text: "丢下石蜡油小瓶子",
        effect: updateTime(1, { set : { hasLiquidParaffin: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasSnackCookie",
        text: "丢下味千小饼干",
        effect: updateTime(1, { set : { hasSnackCookie: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasHamSausage",
        text: "丢下火腿肠",
        effect: updateTime(1, { set : { hasHamSausage: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasCracker",
        text: "丢下夹心饼干",
        effect: updateTime(1, { set : { hasCracker: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasMercuryPill && mercuryLoad > 0",
        text: "服用无标签药丸（作用未知）",
        nextScene: "整理整理-服药丸"
      },
      {
        showCondition: "hasMercuryPill",
        text: "丢下无标签药丸",
        effect: updateTime(1, { set : { hasMercuryPill: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasCrumpledLeaflet",
        text: "丢下揉皱的传单",
        effect: updateTime(1, { set : { hasCrumpledLeaflet: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasAlcohol && hurtByZombie",
        text: "用医用酒精消毒伤口",
        effect: function(vars) {
          vars.hurtByZombie = false;
          vars.hasAlcohol = false;
          vars.itemCount = Math.max(0, vars.itemCount - 1);
          return updateTime(1)(vars);
        },
        nextScene: "整理整理"
      },
      {
        showCondition: "hasFeverMed && hasCold",
        text: "服用退烧药",
        nextScene: "整理整理-退烧"
      },
      {
        showCondition: "hasAntibiotic",
        text: "丢下抗生素",
        effect: updateTime(1, { set : { hasAntibiotic: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasPainkiller",
        text: "丢下止痛药",
        effect: updateTime(1, { set : { hasPainkiller: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasBandage",
        text: "丢下绷带",
        effect: updateTime(1, { set : { hasBandage: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasIodine",
        text: "丢下碘伏",
        effect: updateTime(1, { set : { hasIodine: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasAlcohol",
        text: "丢下医用酒精",
        effect: updateTime(1, { set : { hasAlcohol: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasSutureKit",
        text: "丢下缝合包",
        effect: updateTime(1, { set : { hasSutureKit: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasTourniquet",
        text: "丢下止血带",
        effect: updateTime(1, { set : { hasTourniquet: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasAnesthetic",
        text: "丢下麻醉剂",
        effect: updateTime(1, { set : { hasAnesthetic: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      // 王知筠手机/实验记录本/检测报告备份为真相线索，不占背包，不可丢弃
      {
        showCondition: "hasPhone",
        text: "丢下手机",
        effect: updateTime(1, { set : { hasPhone: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      // 注意交通工具不计入物品数量
      {
        showCondition: "hasRustyBike",
        text: "丢下自行车",
        effect: updateTime(1, { set : { hasRustyBike: false } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasEbike",
        text: "丢下电动自行车",
        effect: updateTime(1, { set : { hasEbike: false }}),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasScooter",
        text: "丢下滑板车",
        effect: updateTime(1, { set : { hasScooter: false }}),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasCSGun",
        text: "丢下真人CS枪",
        effect: updateTime(1, { set : { hasCSGun: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasWatch",
        text: "看看时间",
        nextScene: "整理整理-看时间"
      },
      {
        text: "不丢，谢谢",
        showCondition: "itemCount <= bagVolume", // 只有当物品数量小于等于背包容量时，才能继续前进，否则需要整理整理物品
        nextScene: "{positionAfterOperation}"
      }
    ]
  },

  // ====== 整理整理-使用道具（独立描述节点） ======
  "整理整理-看时间": {
    image: "images/整理整理.png",
    text: function(vars) {
      var hh = vars.hh, mm = vars.mm;
      var period = hh >= 6 && hh < 11 ? "上午" : (hh < 14 ? "中午" : (hh < 18 ? "下午" : "晚上"));
      return "你抬起手腕看了眼手表——现在是第 " + vars.dd + " 天，" + period + " " + hh + " 点 " + (mm < 10 ? "0" : "") + mm + " 分。";
    },
    choices: [
      { text: "继续", nextScene: "整理整理" }
    ]
  },

  "整理整理-喝水": {
    image: "images/整理整理.png",
    onEnter: function(vars) {
      vars._drankToxicWater = !!vars.waterToxic; // 供 text 判断是否喝了毒水
      if (vars.waterToxic) vars.mercuryLoad = (vars.mercuryLoad || 0) + 10;
      vars.bottleWater = Math.max(0, vars.bottleWater - 1);
      vars.strength = Math.min(10, vars.strength + 1);
      vars.waterToxic = false;
      return {};
    },
    text: function(vars) {
      if (vars._drankToxicWater) {
        return "你拧开瓶盖喝了几口。水面上浮着一层淡淡的油光，味道也说不上新鲜——你皱了皱眉，还是咽了下去。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>";
      }
      return "你拧开瓶盖，仰头喝了几口。微凉的水顺着喉咙流下，干渴的身体舒服了不少。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "继续", nextScene: "整理整理" }
    ]
  },

  "整理整理-吃冻肉": {
    image: "images/整理整理.png",
    onEnter: function(vars) {
      vars.strength = 10;
      vars.hasFrozenMeat = false;
      vars.itemCount = Math.max(0, vars.itemCount - 1);
      return {};
    },
    text: "你撕开冻肉的包装，也顾不上它还没完全解冻，咬了一大口。冰碴混着肉香在嘴里化开——虽然凉得牙根发酸，但至少是真肉。你三两口把它吃完，感觉力气恢复了不少。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力回满，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "整理整理" }
    ]
  },

  "整理整理-吃饼干": {
    image: "images/整理整理.png",
    onEnter: updateTime(1, { add: { strength: 1, itemCount: -1 }, set: { hasBiscuit: false } }),
    text: "你拆开包装袋，掰了一块压缩饼干放进嘴里。干巴巴的，嚼起来有点硬，但那股麦香让你想起还没出事时的日子。你就着水咽了下去，胃里终于有了点东西。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "整理整理" }
    ]
  },

  "整理整理-服药丸": {
    image: "images/整理整理.png",
    onEnter: function(vars) {
      vars.mercuryLoad = Math.max(0, vars.mercuryLoad - 20);
      vars.hasMercuryPill = false;
      vars.itemCount = Math.max(0, vars.itemCount - 1);
      return updateTime(1)(vars);
    },
    text: "你抠出那粒无标签的淡黄色药丸，放在手心端详了一下，还是放进嘴里用水送了下去。药丸没有味道，说不上来是什么感觉——但你隐约觉得，身体里那股沉甸甸的压迫感好像减轻了一点。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你服下了那粒无标签的药丸。</span>",
    choices: [
      { text: "继续", nextScene: "整理整理" }
    ]
  },

  "整理整理-退烧": {
    image: "images/整理整理.png",
    onEnter: function(vars) {
      vars.hasCold = false;
      vars._rainExposure = 0;
      vars.hasFeverMed = false;
      vars.itemCount = Math.max(0, vars.itemCount - 1);
      return updateTime(5)(vars);
    },
    text: "你掰下一粒退烧药，就着半瓶水咽了下去。药效来得不算快，但过了好一会儿，你身上那股散不掉的寒气慢慢退了，额头也不再发烫。\n你抹了把汗，整个人虚脱似的坐了一会儿——总算不发烧了。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】感冒已治愈。</span>",
    choices: [
      { text: "继续", nextScene: "整理整理" }
    ]
  },

  "start": {
    image: "images/gameStart.jpg",
    text: "游玩者请注意，本游戏有轻微闪烁画面，心脏病患者请勿尝试。",
    choices: [
      {
        text: "开始游戏",
        nextScene: "初始卧室"
        //input: { placeholder: "去哪里？" },
        //effect: function(vars) { vars.positionAfterOperation = vars._input; return {}; },
        //nextScene: "{positionAfterOperation}"//"初始卧室"
      }
    ]
  },

  "结局-汞中毒尸变": {
    image: "images/zombiePounceOnYou.jpg",
    text: "你的手开始不受控制地颤抖。视野边缘在变暗，像有人从四周慢慢拉上帷幕。\n最后的清醒时刻，你低头看向自己的手——皮肤已经变成了暗灰色，在日光下泛着诡异的金属光泽。\n你张开嘴想喊什么，但喉咙里只发出了一声低沉的喉音。\n—— 结局：汞中毒尸变 ——"
  },
};
