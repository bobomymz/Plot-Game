// ========== 夜晚剧情 ==========
// 全局触发器 hh >= 19 时强制跳转到"天黑必须过夜"
// 玩家必须选择一个安全屋过夜，没有跳过选项

Object.assign(storyData, {

  // ==================== 夜间入口 ====================
  "天黑必须过夜": {
    image: function(vars) {
      if (vars.currentArea === "高架") return "images/highway/highwayNight.png";
      return "images/小区周边/nightStreet.png";
    },
    onEnter: function(vars) {
      vars.strength = Math.max(5, vars.strength);
    },
    text: function(vars) {
      let desc = "天色已经完全暗下来了。\n";
      if (vars.currentArea === "周边社区") {
        desc += "街灯忽明忽暗地闪着，丧尸的嚎叫声在夜风中此起彼伏，比白天听起来更加刺耳。黑暗中你隐约能看到一些摇晃的身影在远处游荡——夜晚是它们的天下。\n你必须尽快找个地方过夜。";
        if (vars.dd >= 3) {
          desc += "\n<span style='color: #ff4444;'>你意识到这片区域已经不再安全了——丧尸越来越多，你能感觉到它们在向这里聚集。留在这里过夜无异于等死。</span>";
        }
      } else if (vars.currentArea === "初始小区") {
        desc += "你所在的地方已经空无一人，能听到的只有风声和远处丧尸的低吼。这时候在外面游荡无异于送死。";
      } else if (vars.currentArea === "高架") {
        desc += "高架上的风很大，刮得路牌吱嘎作响。黑暗中你只能看到远处城市的轮廓和零星的火光。这里完全暴露在外，没有任何遮蔽。";
      } else {
        desc += "四周一片漆黑，你必须找个地方过夜。";
      }
      return desc;
    },
    choices: [
      // ===== 初始小区 =====
      {
        showCondition: "currentArea == '初始小区'",
        text: "睡在自己家",
        condition: "dd == 1",
        nextScene: "过夜-自己家",
        elseScene: "结局-过夜-自己家不再安全"
      },
      {
        showCondition: "currentArea == '初始小区'",
        text: "躲进楼道角落",
        nextScene: "结局-过夜-街头死亡"
      },

      // ===== 周边社区 - 已位于理发店 =====
      {
        showCondition: "currentPos == '理发店' && dd < 3",
        text: "就在理发店凑合一晚",
        nextScene: "过夜-理发店"
      },
      {
        showCondition: "currentPos == '理发店' && dd == 2",
        text: "不睡了，趁夜色离开这片区域",
        nextScene: "过夜-理发店流浪"
      },

      // ===== 周边社区 - 去理发店 =====
      {
        showCondition: "currentPos != '理发店' && currentArea == '周边社区' && dd < 3",
        text: "在理发店过夜",
        nextScene: "过夜-前往理发店"
      },

      // ===== 周边社区 - 全家员工通道 =====
      {
        showCondition: "currentArea == '周边社区' && dd < 3",
        text: "去全家便利店员工通道",
        condition: "!FamilymartHasZombie",
        nextScene: "过夜-全家",
        elseScene: "结局-过夜-全家丧尸还在"
      },

      // ===== 周边社区 - 联华超市地下室 =====
      {
        showCondition: "currentArea == '周边社区' && _visit['小超市'] > 0 && dd < 3",
        text: "去联华超市地下室躲藏",
        condition: "hasTorch && !_supermarketCompromised",
        nextScene: "过夜-小超市",
        elseScene: "结局-过夜-小超市暴露"
      },

      // ===== 周边社区 - 安居苑 =====
      {
        showCondition: "currentArea == '周边社区' && dd < 3",
        text: "去三林安居苑找间空房",
        nextScene: "过夜-安居苑"
      },

      // ===== 周边社区 - 图书馆 =====
      {
        showCondition: "currentArea == '周边社区' && dd < 3",
        text: "去社区图书馆过夜",
        condition: "libraryCleared",
        nextScene: "过夜-图书馆",
        elseScene: "结局-过夜-图书馆未清理"
      },

      // ===== 周边社区 - 哥哥的深夜食堂 =====
      {
        showCondition: "currentArea == '周边社区' && dd < 3",
        text: "去东区哥哥的深夜食堂过夜",
        condition: "_yorozuyaUnlocked",
        nextScene: "过夜-哥哥的深夜食堂",
        elseScene: "结局-过夜-深夜食堂上锁"
      },

      // ===== 高架 =====
      {
        showCondition: "currentArea == '高架' && hasCar",
        text: "锁紧车门在车里过夜",
        nextScene: "过夜-车内"
      },
      {
        showCondition: "currentArea == '高架' && !hasCar",
        text: "在高架上找遮蔽处",
        nextScene: "结局-过夜-街头死亡"
      },

      // ===== 兜底（始终可用） =====
      {
        showCondition: "dd < 3",
        text: "冒险在街头找地方躲一晚",
        nextScene: "过夜-街头兜底"
      },
      {
        showCondition: "dd >= 3",
        text: "在街头寻找掩体",
        nextScene: "结局-过夜-街头死亡"
      }
    ]
  },

  // ==================== 安全屋 - 理发店 ====================
  "过夜-理发店": {
    image: "images/anshengStreet/barberShopRest.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      vars.restAtBarber = true;
      vars.chasedByZombies = Math.max(0, vars.chasedByZombies - 1);
      return {};
    },
    text: "你拉好窗帘，把门锁上。周师傅递给你一条毯子，指了指墙角的折叠床。\n\"今晚就安心睡吧。\"他说着在门口的理发椅上坐下，手里握着一把剪刀。\n你躺在折叠床上，听着窗外丧尸的嚎叫声，竟出奇地睡着了。\n第二天醒来，阳光透过窗帘缝隙洒在地板上。周师傅已经在收拾东西了。\"醒了？外面的东西散了，不过……估计今晚还会更多。\"",
    choices: [
      { text: "继续", nextScene: "理发店-店内" }
    ]
  },

  // ==================== 安全屋 - 前往理发店 ====================
  "过夜-前往理发店": {
    image: "images/anshengStreet/nightRun.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      vars.restAtBarber = true;
      vars.chasedByZombies = Math.max(0, vars.chasedByZombies - 1);
      vars.strength = Math.max(0, vars.strength - 1);
      return {};
    },
    text: "你深吸一口气，压低身形，沿着街道边缘摸黑向安盛街的方向移动。\n一路上你躲过了三波丧尸——有一次你几乎和一只站在墙角的丧尸面对面，但它似乎没注意到你。\n\
当你终于敲响理发店的玻璃门时，周师傅拉开门把你拽了进去，迅速锁好门。\n\"你疯了？晚上还在外面跑！\"他压低声音训斥你，但还是递给你一条毯子。\n你躺在折叠床上，很快就睡着了。\n\
第二天醒来时，你觉得浑身酸痛，但至少——你还活着。",
    choices: [
      { text: "继续", nextScene: "理发店-店内" }
    ]
  },

  // ==================== 安全屋 - 理发店特殊流浪结局 ====================
  "过夜-理发店流浪": {
    image: "images/anshengStreet/nightWander.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      vars.hurtByZombie = true;
      vars.strength = Math.max(0, vars.strength - 2);
      vars.chasedByZombies = Math.min(5, vars.chasedByZombies + 1);
      return {};
    },
    text: "你推开理发店的门，走进夜色中。\n周师傅在你身后喊了什么，但你已经听不进去了。街道比你能想象到的更加黑暗、更加危险。你跑了很久很久——不知道方向，不知道目的地，只知道身后一直有脚步声。\n当你终于停下来喘气时，东方的天空已经泛白。你发现自己站在——杨高南路高架的入口。\n你的衣服被扯破了，手臂上有一道深深的抓痕。你不记得是什么时候受的伤。",
    choices: [
      { text: "继续", nextScene: "杨高南路高架" }
    ]
  },

  // ==================== 安全屋 - 全家员工通道 ====================
  "过夜-全家": {
    image: "images/小区周边/familyMartNight.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      return {};
    },
    text: "你摸黑来到全家便利店。店里的应急灯还亮着微弱的白光。你绕到收银台后面，推开员工通道的门——里面是一个狭小的储物间，堆着几箱饮料和零食。\n你顶上门，在纸箱堆里找了个角落坐下。虽然又冷又硬，但至少比外面安全。\n你靠着墙睡着了。\n第二天醒来，阳光透过店门的玻璃照进来。储物间里很安静。",
    choices: [
      { text: "继续", nextScene: "小区东门-整装待发" }
    ]
  },

  // ==================== 安全屋 - 联华超市地下室 ====================
  "过夜-小超市": {
    image: "images/小区周边/supermarketBasement.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      return {};
    },
    text: "你摸黑来到联华超市，推开仓库的门，拉开活板门上的铁栓。在手电筒的微光中，你小心翼翼地走下楼梯。地下室里堆着一些纸箱，空气中弥漫着陈旧的灰尘味。你从里面关上活板门，用一根铁棍别住。\n没有人会找到这里。\n你在角落里坐下，关掉手电筒保存电量。黑暗中，你听着自己心跳的声音，渐渐入睡。\n第二天醒来时，头顶的缝隙里漏下一缕阳光。地下室还是那么安静。",
    choices: [
      { text: "继续", nextScene: "三林路" }
    ]
  },

  // ==================== 安全屋 - 安居苑空房 ====================
  "过夜-安居苑": {
    image: "images/anshengStreet/anJuYuanBedroom.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      return {};
    },
    text: "你借着月光找到一扇没有上锁的单元门。屋内漆黑一片，但没人。你摸索着找到卧室，关上房门，用椅子顶住。\n床上的被褥还在——你抖了抖灰，把自己裹进去。虽然不太舒服，但至少有个屋顶。\n你很快就睡着了。\n第二天醒来，阳光从破洞的窗帘透进来。外面偶尔传来丧尸的拖步声，但它们没有进来。",
    choices: [
      { text: "继续", nextScene: "三林安居苑-小区内部" }
    ]
  },

  // ==================== 安全屋 - 自己家（Day 1限定） ====================
  "过夜-自己家": {
    image: "images/home/bedroom-night.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      vars.strength = Math.min(10, vars.strength + 2);
      return {};
    },
    text: "你跑回了自己家。锁好门，拉好窗帘。房间里的一切都还是你离开时的样子。\n你躺在床上，盯着天花板。妈妈还没回来——也许她永远不会回来了。\n你闭上眼睛，在熟悉的气味中沉沉睡去。\n第二天早上，你被门外低沉的撞击声惊醒。有人在撞门——不，是丧尸。你从猫眼往外看，一张灰白的脸正贴在门上。\n你不能再待在这里了。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复2点体力，当前体力：{strength}。</span>",
    choices: [
      { text: "收拾东西离开", nextScene: "整理整理" }
    ]
  },

  // ==================== 安全屋 - 车内过夜 ====================
  "过夜-车内": {
    image: "images/highway/carSleep.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      vars.strength = Math.max(0, vars.strength - 1);
      return {};
    },
    text: "你锁好车门，把座椅放倒到一个勉强能躺的角度。高架上的风很大，车身在风中微微摇晃。\n远处有丧尸在游荡——但它们对一辆静止的车没有兴趣。\n你在狭窄的空间里辗转反侧，怎么也找不到舒服的姿势。但疲惫最终还是战胜了不适，你迷迷糊糊地睡着了。\n第二天醒来，你浑身僵硬，脖子酸痛。车窗外依然是无尽的高架和废弃的车辆。",
    choices: [
      { text: "继续", nextScene: "杨高南路高架" }
    ]
  },

  // ==================== 兜底 - 街头过夜 ====================
  "过夜-街头兜底": {
    image: "images/小区周边/streetNight.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      vars.strength = Math.max(0, vars.strength - 2);
      vars.hurtByZombie = true;
      return {};
    },
    text: "你找不到更好的地方了。你蜷缩在一处墙角，用废弃的纸板和塑料袋盖住自己，祈祷没有丧尸发现你。\n这一夜是你人生中最漫长的一夜。\n丧尸的脚步声无数次从你身边经过，你甚至能闻到它们身上的腐臭味。你全程屏住呼吸，一动也不敢动。\n当第一缕晨光照进街道时，你几乎不敢相信自己还活着。你浑身发抖，手臂上不知道什么时候多了一道抓痕在隐隐作痛。",
    choices: [
      { text: "继续前进", nextScene: "整理整理" }
    ]
  },

  // ==================== 安全屋 - 哥哥的深夜食堂 ====================
  "过夜-哥哥的深夜食堂": {
    image: "images/xindahui/izakayaNight.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      return {};
    },
    text: "你锁好门，拉上窗帘。哥哥的深夜食堂里安静而昏暗，只有壁灯发出暖黄色的光。\n你在吧台后面的地板上铺了一张毯子——虽然硬了点，但比露宿街头强了不知道多少倍。门锁结实，窗户完好。\n你听着东区天桥外偶尔传来的风声，慢慢闭上了眼睛。\n\n第二天醒来时，阳光透过窗帘的缝隙照进来。你活动了一下僵硬的脖子——睡得不算好，但至少你还活着。",
    choices: [
      { text: "继续", nextScene: "新达汇-哥哥的深夜食堂" }
    ]
  },

  // ==================== 兜底 - 死亡 ====================
  "结局-过夜-街头死亡": {
    image: "images/zombieWaveSmashYouIntoPieces.png",
    text: "你在街头试图找一个能躲藏的地方。但黑夜中你什么都看不清——当你意识到身边的\"纸箱\"其实是一只蹲着的丧尸时，已经太晚了。\n你在黑暗中发出最后一声惨叫，然后一切都安静了。\n\n—— 结局：露宿街头 ——",
    style: "color: #ff4444; font-weight: bold;"
  },

  // ==================== 安全屋 - 社区图书馆 ====================
  "过夜-图书馆": {
    image: "images/library/libraryNight.png",
    onEnter: function(vars) {
      vars.dd += 1;
      vars.hh = 7;
      vars.mm = 0;
      vars.currentPlace = "图书馆";
      if (vars.dd >= 3) {
        vars._libraryEnding = true;
      }
      return {};
    },
    text: function(vars) {
      if (vars._libraryEnding) {
        return "这是你在图书馆度过的第三个早晨。\n\n你醒了。阳光透过落地窗洒进来，在地板上铺开一片温暖的光。大厅很安静——比这座城市里的任何一个地方都安静。\n你从拼起来的阅览室沙发上坐起来，活动了一下僵硬的脖子。昨天你找到了一箱没开封的矿泉水和几包压缩饼干。水还剩大半箱，饼干也够撑几天。\n你把窗帘拉开一条缝，往外看了一眼。街上还是有丧尸在游荡——但它们在图书馆外面，你在里面。\n\n外面传来微弱的撞击声。你转头看向大门——门锁完好，铁链还挂着。\n你已经在这座图书馆里撑过了最危险的夜晚。你知道，只要你有足够的食物和水，你可以在这里待很久很久。";
      }
      return "你锁好图书馆的大门，拉上阅览室的窗帘。阅览室的沙发拼成了一张简陋的床——虽然不如真的床舒服，但至少有个屋顶，四面有墙。\n你听着窗外偶尔传来的丧尸低吼声，慢慢放松下来。在这个沦陷的城市里，能找到一个可以安心闭上眼睛的地方已经不容易了。\n你很快睡着了。";
    },
    choices: [
      {
        showCondition: "_libraryEnding",
        text: "迎接新的一天",
        nextScene: "临时的避难所"
      },
      {
        showCondition: "!_libraryEnding",
        text: "新的一天开始了",
        nextScene: "图书馆-大厅"
      }
    ]
  },

  // ==================== 成功结局 ====================
  "临时的避难所": {
    image: "images/library/libraryEnding.png",
    text: function(vars) {
      return "你在这个小小的社区图书馆里撑过了最难的时刻。\n\n书架上的书还在，日光灯管偶尔还在闪，门锁结实，窗户完好。你找到的物资省着点用还能撑好些天。外面的世界没有变好——丧尸还在街上游荡，城市的天空依然灰蒙蒙的。但你有了一个可以称之为\"据点\"的地方。\n\n你想起第一天早上醒来时，闹钟显示7:30，阳光穿过半旧的窗帘，你想的是\"妈妈还有半小时就买早餐回来了\"。\n\n现在你已经很久没有想起妈妈了。\n\n你不知道她去了哪里。你不知道这座城市还能撑多久。你不知道明天会怎样。\n\n但至少今天——你还活着。\n在图书馆里，你找到了一本《霍乱时期的爱情》。\n你没有翻开它。\n\n<span style='color: #f8d305ff;'>—— 临时避难所·结局 ——</span>\n\n<span style='color: #888; font-size: 14px;'>你是4217人中第一个达成此结局的玩家。</span>";
    },
    style: "text-align: center;",
    choices: [
      {
        text: "故事还没有结束……继续漫步末世",
        nextScene: "图书馆-大厅"
      },
      {
        text: "重新开始",
        nextScene: "start"
      }
    ]
  },
  // ==================== 死亡 - 自己家不再安全 ====================
  "结局-过夜-自己家不再安全": {
    image: "images/zombieKnockYouDown.png",
    text: "你拼命跑回自己家，掏出钥匙——手抖得插了好几次才对准锁孔。\n门开了。但你还没来得及松一口气，一股熟悉的腐臭扑面而来。\n\
玄关里站着一只丧尸——它穿着你妈妈的围裙。\n你愣在原地。\n它扑了上来。\n\n—— 结局：回家 ——",
    style: "color: #ff4444; font-weight: bold;"
  },

  // ==================== 死亡 - 全家丧尸还在 ====================
  "结局-过夜-全家丧尸还在": {
    image: "images/zombieKnockYouDown.png",
    text: "你摸黑溜进全家便利店。应急灯发出微弱的白光，货架的影子被拉得很长。\n你绕到收银台后面，还没碰到员工通道的门——\n身后传来一声货架摇晃的巨响。你还没来得及回头，就被一股力量扑倒在地上。\n那只迅捷丧尸——原来它还在店里。\n\n—— 结局：全家夜袭 ——",
    style: "color: #ff4444; font-weight: bold;"
  },

  // ==================== 死亡 - 地下室暴露 ====================
  "结局-过夜-小超市暴露": {
    image: "images/zombieKnockYouDown.png",
    text: "你摸黑来到联华超市，推开仓库的门。活板门还开着——你走的时候没来得及关上它。\n你打开手电筒往下照了照，地下室看起来和之前一样安静。\n但当你走下楼梯时，脚下踢到了什么东西——哐当一声。\n黑暗中有好几双眼睛同时亮了起来。\n它们一直在等你回来。\n\n—— 结局：地下室暴露 ——",
    style: "color: #ff4444; font-weight: bold;"
  },

  // ==================== 死亡 - 图书馆未清理 ====================
  "结局-过夜-图书馆未清理": {
    image: "images/library/libraryNight.png",
    text: "你推开图书馆的门，摸黑走了进去。这里安静得不像话，只有你自己的呼吸声在回荡。\n你摸索着找到阅览室，打算在沙发上凑合一晚——\n但黑暗中有什么东西碰了碰你的肩膀。\n你转过头，迎上一张灰白的脸。\n图书馆里的丧尸，原来一直没有离开。\n\n—— 结局：图书馆夜宿 ——",
    style: "color: #ff4444; font-weight: bold;"
  },

  // ==================== 死亡 - 深夜食堂上锁 ====================
  "结局-过夜-深夜食堂上锁": {
    image: "images/xindahui/eastBridge.png",
    text: "你穿过东区天桥，来到哥哥的深夜食堂门口。\nU型锁还挂在那里。你没有钥匙。\n你用力拉了拉门，纹丝不动。\n身后的天桥入口传来拖沓的脚步声——几只丧尸正朝你走来。你无处可退，被困在了天桥上。\n夜晚的寒风裹着腐臭味，成了你最后记忆里的全部。\n\n—— 结局：深夜食堂上锁 ——",
    style: "color: #ff4444; font-weight: bold;"
  },

});
