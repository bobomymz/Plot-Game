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

    // --- 场景状态 ---
    _visit: {},                    // 自动记录各场景访问次数（引擎自动维护，不可修改）
    foodUnderBed: true,        // 底下是否有食物，初始为true
    chasedByZombies: 0,        // 被尸潮追击的等级（0~5，效果：进行任何战斗操作都有概率被群殴，qte时间均缩短，体力消耗增加）
    bikeInAnjuyuan: true,      // 三林安居苑是否还有锈蚀的自行车
    FamilymartHasZombie: true, // 全家是否还有员工丧尸
    pharmacyZombieKilled: false, // 益丰大药房白大褂丧尸是否已被击杀
    pharmacyApprenticeWatered: false, // 益丰大药房长发女学徒是否已被喂水
    pharmacyApprenticeKilled: false, // 益丰大药房长发女学徒是否已被解脱
    libraryCleared: false,     // 是否清空了社区图书馆的丧尸
    defeatedOldMan: false,     // 是否已击败安盛街老头丧尸
    _supermarketCompromised: false, // 联华超市地下室是否已暴露不再安全
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

    // --- 操作状态 ---
    visitExitTimes: 0,         // 访问小区出口次数，达到2自动放行
    visitWaitingRoomTimes: 0,  // 访问等候区次数，达到3丧尸会出现
    talkToBarber: false,       // 是否与理发师交谈过
    restAtBarber: false,       // 是否在理发店休息过
    turnDiaryPages: 0,         // 翻页次数
    repeatedClickTimes: 0,     // 点击重复次数，可以用来设置连点环节
    fightWithVineZombie: false,// 是否与被藤蔓缠绕的丧尸打过
    raidStationeryShop: false, // 是否搜刮过文具店的物品（不论是粗略还是仔细，只有一次机会）
    findKey502: false,         // 是否找到502钥匙
    _droneIntel: false,        // 是否获得无人机侦察情报（物业楼高锦睿）

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
    hasMopHandle: false,      // 是否有拖把杆（理发店）
    hasCutter: false,          // 是否有美工刀
    hasBiscuit: false,         // 是否有饼干（安盛街便利店）
    hasMap: false,             // 是否有交通地图（三林安居苑藤蔓丧尸）
    hasLubricant: false,       // 是否有润滑油（五金店仓库，可带到安居苑修车）
    hasCrumpledLeaflet: false, // 是否有揉皱的传单
    hasPhone: false,           // 是否找到华为店展示机
    hasLiquidParaffin: false,  // 是否有医用石蜡油（益丰大药房左边货架）
    hasBottle: false,                // 是否有水瓶
    // 钥匙
    hasEbikeKey: false,        // 是否有电瓶车钥匙（民防设施告示纸后面）
    hasDoorKey1: false,        // 是否有门钥匙1（全家便利店员工通道）
    hasCarKey: false,          // 是否有轿车钥匙
    hasCatSnack: false,        // 是否有脆脆炒米（新达汇4F大渝火锅门口，猫零食）
    hasKey502: false,          // 是否有502钥匙（鹅卵石路自行车）
    hasCommitteeKey: false,    // 是否有居委会钥匙（樱桃苑5楼孙阿姨）
    // 交通工具（不占背包）
    hasCar: false,             // 是否有轿车
    hasEbike:  false,          // 是否有电瓶车（地下车库非机动车区域）
    hasScooter: false,         // 是否有滑板车
    hasRustyBike: false,       // 是否有锈蚀的自行车
    // 特殊道具（不占背包）
    hasBag: false,             // 是否有背包（bagVolume+1）
    // 记忆（不占背包）
    gameMemoryThres: 10,        // 解锁A结局所需游戏记忆的个数
    gameMemorySet: new Set(),         // 目前已获得的游戏记忆集合
    personalMemoryThres: 10,    // 解锁B结局所需个人记忆的个数
    personalMemorySet: new Set(),     // 目前已获得的个人记忆集合
    mixedMemorySet: new Set(),        // 目前已获得的混合记忆集合

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
    // 未来随时加：
    // sanity:   { min: 0, max: 100 },
    // bagVolume:{ min: 1, max: 20 },
  },

  // story-core.js 中，放在 _caps 和 _globalTriggers 之间

  // -------- 响应式规则 --------
  _reactive: {

    // ===== 1. 派生变量：每次状态变更后自动重算 =====
    computed: {
      // 支持字符串表达式（推荐，简洁）
      gameMinutes: "((dd - 1) * 1440 + (hh - 8) * 60 + mm)",
      isNight:     "hh >= 19 || hh < 6",
      minutesBetweenReduceStrength: "hurtByZombie ? 20 - strength : 60", // 若被丧尸抓伤，体力下降会更快
      canSee: function(v) { return canSee(v); },
      hasNoTransportation: function(v) { return hasNoTransportation(v); } // 是否没有交通工具
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
        effect: { add: { strength: -1 } }   // 简单效果直接用对象
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
          }
        }
      },

    ]
  },

  // -------- 全局触发器 --------
  _globalTriggers: [
    { condition: "strength <= 0", targetScene: "结局-体力耗尽", priority: 10 },
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
    { condition: "strength <= 1", className: "vignette-danger" }
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
        effect: updateTime(1, { set : { hasBottle: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
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
        showCondition: "hasBag",
        text: "丢下帆布包",
        effect: updateTime(1, { set : { hasBag: false }, add: { bagVolume: -1 } }),
        nextScene: "整理整理"
      },
      {
        showCondition: "hasBiscuit",
        text: "吃掉饼干（体力+1）",
        effect: updateTime(1, { add: { strength: 1, itemCount: -1 }, set: { hasBiscuit: false } }),
        nextScene: "整理整理"
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
        showCondition: "hasCrumpledLeaflet",
        text: "丢下揉皱的传单",
        effect: updateTime(1, { set : { hasCrumpledLeaflet: false }, add: { itemCount: -1 } }),
        nextScene: "整理整理"
      },
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
        text: "不丢，谢谢",
        showCondition: "itemCount <= bagVolume", // 只有当物品数量小于等于背包容量时，才能继续前进，否则需要整理整理物品
        nextScene: "{positionAfterOperation}"
      }
    ]
  },
  "start": {
    image: "images/gameStart.jpg",
    text: "",
    choices: [
      {
        text: "开始游戏",
        input: { placeholder: "去哪里？" },
        effect: function(vars) { vars.positionAfterOperation = vars._input; return {}; },
        nextScene: "{positionAfterOperation}"//"初始卧室"
      }
    ]
  },
};
