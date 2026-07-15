// ========== 安盛街剧情 ==========
// 包括安盛街东侧、中段、西侧、各店铺、理发店安全屋、朝新达汇方向
// 安居苑相关内容已拆分到安居苑.js

Object.assign(storyData, {

  // ==================== 入口：安盛街东侧 ====================
  "安盛街东侧": {
    image: "images/anshengStreet/eastEntrance.png",
    onEnter: { set: { currentPlace: "安盛街", currentPos: "安盛街" } },
    qte: {
      timeout: "10000 - chasedByZombies * 1000",
      onTimeout: "安盛街东侧-犹豫"
    },
    text: function(vars) {
      if (!vars._visit["理发店内部"]) {
        return "你来到了安盛街东侧。小时候你经常来这里逛，那时人来人往、商铺林立。如今卷帘门半掩、招牌歪斜，街上只剩稀稀拉拉的几只丧尸在远处徘徊。\n你曾经理发的那个小店就在前面不远——希望那里还安全。";
      }
      return "你再次回到安盛街东侧。街面上又多了一些血迹和碎玻璃，空气里的腐臭味比上次更重了。";
    },
    choices: [
      {
        text: "继续往前",
        nextScene: function(vars) { return vars.defeatedOldMan ? "安盛街-理发店" : "遭遇老头丧尸"; },
        effect: updateTime(1)
      },
      {
        text: "离开这里，回十字路口",
        nextScene: "三林路-环林东路 十字路口",
        effect: updateTime(5)
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲进废弃报刊亭",
        nextScene: "安盛街东侧-躲藏"
      },
      sprintAway(function(v) {
        return v.defeatedOldMan
          ? ["安盛街-理发店", "三林路-环林东路 十字路口"]
          : ["遭遇老头丧尸", "三林路-环林东路 十字路口"];
      })
    ]
  },

  "安盛街东侧-犹豫": {
    image: "images/anshengStreet/eastEntrance.png",
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你在街口犹豫了一下——就是这一下，远处徘徊的那几只丧尸注意到了你。它们拖着步子朝你的方向聚拢过来。\n你不能再站在这里了。前方那个拄着拐杖的身影还在那里——但它只有一只，而朝你走来的远不止一只。",
    choices: [
      {
        text: "冲过去",
        nextScene: function(vars) { return vars.defeatedOldMan ? "安盛街-理发店" : "遭遇老头丧尸"; },
        effect: updateTime(1)
      },
      {
        text: "撤回十字路口",
        nextScene: "三林路-环林东路 十字路口",
        effect: updateTime(3)
      }
    ]
  },

  // ==================== 老头丧尸遭遇战 ====================
  "遭遇老头丧尸": {
    image: "images/anshengStreet/oldManZombie.png",
    qte: {
      timeout: "10000 - chasedByZombies * 1000",
      onTimeout: "遭遇老头丧尸-犹豫"
    },
    text: "没走几步，拐角处突然闪出一个佝偻的身影。那是一个拄着拐杖的老头丧尸，灰白的眼珠死死盯着你，嘴里发出含混的咯咯声，一步一步向你挪过来。\n它动作不快，但那根金属拐杖在阳光下闪着冷光——被敲一下可不是闹着玩的。",
    choices: [
      {
        text: "不管它，绕过去",
        nextScene: "绕过老头丧尸"
      },
      {
        text: "打它头",
        nextScene: "结局-老头丧尸砸死你"
      },
      {
        text: "打它胸口",
        nextScene: "结局-老头丧尸砸死你"
      },
      {
        text: "踹它腿",
        nextScene: "安盛街-踹倒老头丧尸"
      }
    ]
  },

  "结局-老头丧尸砸死你": {
    image: "images/anshengStreet/oldManKill.png",
    text: "你冲上去的瞬间，老头丧尸举起拐杖狠狠砸了下来。\n它的力气大得惊人——你眼前一黑，倒在了冰冷的地面上。\n你为自己莽撞的攻击付出了代价。\n\n—— 结局：老头丧尸 ——"
  },

  "遭遇老头丧尸-犹豫": {
    image: "images/anshengStreet/oldManZombie.png",
    text: "你盯着老头丧尸犹豫要怎么处理它——但它没给你犹豫的时间。它举起拐杖，拖着步子加速朝你冲了过来。\n你只能仓促应对。",
    choices: [
      {
        text: "侧身闪开，从旁边绕过去",
        nextScene: "绕过老头丧尸",
        effect: { add: { chasedByZombies: 1 } }
      },
      {
        text: "一脚踹向它的膝盖",
        nextScene: "安盛街-踹倒老头丧尸",
        effect: { add: { chasedByZombies: 1 }, set: { defeatedOldMan: true } }
      }
    ]
  },

  "安盛街-踹倒老头丧尸": {
    image: "images/anshengStreet/oldManFall.png",
    onEnter: updateTime(1, { add: { strength: -1 }, set: { defeatedOldMan: true } }),
    text: "你一脚踹在它的膝盖上。老头丧尸失去平衡，咕咚一声摔倒在地，拐杖也脱手飞了出去。\n它在地上挣扎着想爬起来，但关节似乎不太灵活，一时半会儿起不来。",
    choices: [
      {
        text: "捡起拐杖",
        nextScene: "安盛街-获得拐杖",
        effect: updateTime(1)
      },
      {
        text: "不管它，继续往前",
        nextScene: "安盛街-理发店",
        effect: updateTime(1)
      }
    ]
  },

  "安盛街-获得拐杖": {
    image: "images/anshengStreet/cane.png",
    onEnter: { set: { positionAfterOperation: "安盛街-获得拐杖" } },
    text: "老头丧尸的拐杖掉在地上，是一根金属材质的——沉甸甸的，虽然不是什么神兵利器，但总比空手强。\n老头丧尸在地上扭动着，朝你发出嘶哑的吼声。该走了。",
    choices: [
      {
        text: "捡起拐杖",
        condition: "itemCount < bagVolume",
        nextScene: "安盛街-理发店",
        effect: updateTime(1, { set: { hasCane: true }, add: { itemCount: 1 } }),
        elseScene: "整理整理"
      },
      {
        text: "不管它，继续往前",
        nextScene: "安盛街-理发店",
        effect: updateTime(1)
      }
    ]
  },

  "安盛街-物品栏满了": {
    image: "images/anshengStreet/oldManFall.png",
    text: "你想捡起拐杖，但身上东西已经太多了。你犹豫了一下，还是放下了拐杖。\n毕竟带着一堆东西逃命不是什么好事。",
    choices: [
      {
        text: "继续往前",
        nextScene: "安盛街-理发店",
        effect: updateTime(1)
      }
    ]
  },

  "绕过老头丧尸": {
    image: "images/anshengStreet/bypassOldMan.png",
    onEnter: updateTime(1, { set: { defeatedOldMan: true } }),
    text: "你侧身一闪，从老头丧尸的左边绕了过去。它挥舞拐杖试图够到你，但动作太慢了，你轻松躲开，头也不回地朝前走去。",
    choices: [
      {
        text: "转身离开",
        nextScene: "安盛街东侧"
      },
      {
        text: "继续往前",
        nextScene: "安盛街-理发店",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 安盛街-理发店（安全屋入口） ====================
  "安盛街-理发店": {
    image: "images/anshengStreet/barberShopOutside.png",
    text: function(vars) {
      let basicDes = "";
      let isNight = vars.hh >= 19 || vars.hh <= 6;

      if (!vars._visit["理发店内部"]) { // 没来过
        basicDes = "你快步向前走去，来到了熟悉的理发店门口。\n";
        if (isNight) {
          basicDes += "卷帘门半拉着，但玻璃门后面透出微弱的烛光。那个熟悉的老板——周师傅，正透过门缝警惕地向外张望。他看到是你，愣了一下，随即掏出钥匙，咔哒一声打开玻璃门上的U形锁。\n\"快进来，快进来！外面可不安全。\"他压低声音招呼道。";
        } else {
          basicDes += "搬到这片地方后，你基本上都在这里理发了。然而此刻玻璃门紧锁着，窗帘拉得严严实实，只有门口旋转灯箱还在无声地转着。\n你敲了敲门，过了好一会儿，门后才传来一个低沉的声音：\"谁？\"";
        }
      } else {
        basicDes = "你再次来到理发店门口。";
        if (isNight) {
          basicDes += "烛光还在，周师傅应该还没睡。";
        } else {
          basicDes += "白天看起来和上次差不多——门窗紧闭，安静得有些诡异。";
        }
      }

      let zombieDes = describeZombieWave(vars);
      return basicDes + "\n" + zombieDes;
    },
    choices: [
      {
        text: "进去",
        nextScene: "理发店内部"
      },
      {
        showCondition: "_visit['理发店内部'] >= 2",
        text: "绕到后门",
        nextScene: "安盛街-后巷",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 理发店内部（入口，从街上进入时触发） ====================
  "理发店内部": {
    image: "images/anshengStreet/barberShopInside.png",
    onEnter: { set: { currentPlace: "安盛街", currentPos: "理发店" } },
    text: function(vars) {
      let isNight = vars.hh >= 19 || vars.hh <= 6;
      if (vars._visit["理发店内部"] === 1) {
        let desc = "你推开门走进理发店，门上的风铃发出熟悉的叮当声。\n空气里混合着洗发水和消毒水的气味。四把理发椅静静地立在镜子前，手推车上挂着各种剪刀和推子，储藏室里堆着几箱矿泉水和方便面——看来周师傅早有准备。";
        if (isNight) {
          desc += "\n周师傅迅速锁好门，拉紧窗帘。\"这几天外面越来越不对劲了，\"他边说边给你倒了杯水，\"能活着走到这里，你小子运气不错。\"";
        } else {
          desc += "\n周师傅看了你一眼，确定你没有受伤，才松了一口气。\"你怎么还在外面乱跑？不知道现在什么情况吗？\"他递给你一瓶水，\"坐吧，休息一会儿。\"";
        }
        if (isNight && vars.chasedByZombies > 0) {
          desc += "\n<span style='color: #ffaa00;'>外面丧尸的吼声此起彼伏——今晚在这里过夜应该能甩掉它们。</span>";
        }
        return desc;
      }
      return "你推门走进理发店，顺手把门带上。这里还是老样子。";
    },
    choices: [
      {
        showCondition: "!talkToBarber",
        text: "与周师傅交谈",
        nextScene: "理发店-交谈",
        effect: updateTime(5)
      },
      {
        showCondition: "!restAtBarber || hh >= 19 || hh <= 6",
        text: "休息一会儿",
        nextScene: "理发店-休息"
      },
      {
        text: "看看店里有什么",
        nextScene: "理发店-观察",
        effect: updateTime(2)
      },
      {
        text: "从前门离开",
        nextScene: "安盛街中段"
      },
      {
        text: "从后门离开",
        nextScene: "安盛街-后巷",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 理发店-店内（中枢，内部操作后回到这里） ====================
  "理发店-店内": {
    image: "images/anshengStreet/barberShopInside.png",
    onEnter: { set: { currentPlace: "安盛街", currentPos: "理发店" } },
    text: function(vars) {
      let isNight = vars.hh >= 19 || vars.hh <= 6;
      let desc = "你在理发店里。";
      if (isNight) {
        desc += "烛光摇曳，周师傅在一旁清点物资，偶尔抬头看看窗外。";
      } else {
        desc += "日光透过窗帘缝隙照进来，在地板上投下细长的光斑。周师傅在角落里磨着剪刀，沙沙作响。";
      }
      if (isNight && vars.chasedByZombies > 0) {
        desc += "\n<span style='color: #ffaa00;'>窗外的低吼声时远时近——今晚在这里过夜应该能甩掉它们。</span>";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!talkToBarber",
        text: "与周师傅交谈",
        nextScene: "理发店-交谈",
        effect: updateTime(5)
      },
      {
        showCondition: "hh >= 19 || hh <= 6",
        text: "休息一会儿",
        nextScene: "理发店-休息"
      },
      {
        text: "看看店里有什么",
        nextScene: "理发店-观察",
        effect: updateTime(2)
      },
      {
        text: "从前门离开",
        nextScene: "安盛街中段"
      },
      {
        text: "从后门离开",
        nextScene: "安盛街-后巷",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 理发店-交谈 ====================
  "理发店-交谈": {
    image: "images/anshengStreet/barberShopInside.png",
    onEnter: { set: { talkToBarber: true } },
    text: function(vars) {
      let desc = "周师傅靠在理发椅上，指了指窗外：\"\
对面就是老小区三林安居苑的入口，你以前住在那里，对吗？那边可能有幸存者——但我不确定，毕竟那边流浪猫狗挺多的，天知道它们现在变成什么样了。\"\n他顿了顿：\"\
如果你要继续走，西边路口左转可以到新达汇，那是大商场，物资多，但人也多——丧尸也多。你好自为之吧。\"";
      if (vars.chasedByZombies > 0) {
        desc += "\n\"对了，\"他压低声音，\"丧尸晚上会更活跃，你最好找个歇脚的地方，不要一直当个流浪者。\"";
      }
      return desc;
    },
    choices: [
      {
        text: "\"谢谢你，周师傅\"",
        nextScene: "理发店-店内"
      },
      {
        showCondition: "chasedByZombies >= 2",
        text: "\"那我今晚就留下来\"",
        nextScene: "理发店-休息"
      }
    ]
  },

  // ==================== 理发店-休息（晚上清零尸潮） ====================
  "理发店-休息": {
    image: "images/anshengStreet/barberShopRest.png",
    text: function(vars) { // 历史遗留设计，现在晚上强制选择庇护所
      let isNight = vars.hh >= 19 || vars.hh <= 6; // 包含了timeImage的night和midnight
      let isMorning = vars.hh > 6 && vars.hh < 12; // 是不是早上
      let basicDes = "";
      let hint = "";
      if (isNight) {
        basicDes = "周师傅拉出一张折叠床，递给你一条毯子。\n\"今晚就安心睡吧，我守上半夜，你守下半夜。\"\n你把身体埋进折叠床里，听着窗外偶尔传来的丧尸低吼声，竟出奇地睡着了。\n\
	第二天醒来时，阳光透过窗帘缝隙洒在地上。外面的丧尸不知道什么时候散了。你感觉精神好了许多。";
        hint = "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复3点体力，当前体力：{strength}。</span>\
第二天醒来时，阳光透过窗帘缝隙洒在地上。外面的丧尸不知道什么时候散了。你感觉精神好了许多。";
      } else if(!isMorning) {
        basicDes = "你在理发椅上靠了一会儿。虽然只是短暂的小憩，但足够让酸痛的肌肉稍微放松一点。\n周师傅在门口望风，偶尔回头看你一眼。\"别睡太久，天黑前最好有个打算。\"";
        hint = "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>";
      }
      else basicDes = "你在理发店休息。";
      return basicDes + hint + describeZombieWave(vars);
    },
    onEnter: function(vars) {
      let isNight = vars.hh >= 19 || vars.hh <= 6;
      if (isNight) { // 在理发店过夜
        vars.chasedByZombies = 0;
        vars.strength = Math.min(10, vars.strength + 3); // 加三点体力
        vars.restAtBarber = true;
        vars.dd ++;
        vars.hh = 7;
        vars.mm = 30;
        // 更新时间为第二天7：30
        return {};
      } else {
        vars.strength = Math.min(10, vars.strength + 1);
        vars.restAtBarber = true;
        updateTime(30);
        return {};
      }
    },
    choices: [
      {
        text: "继续",
        nextScene: "理发店-店内"
      }
    ]
  },

  // ==================== 理发店-观察 ====================
  "理发店-观察": {
    image: "images/anshengStreet/barberShopInside.png",
    text: function(vars) {
      let desc = "你环顾理发店。镜台上整齐地排列着剪刀、推子、梳子，墙上贴着几张褪色的发型海报。角落里堆着矿泉水和几箱方便面——周师傅囤了不少物资。\n\
柜台后面有一台老式收音机，此刻正发出沙沙的静电声。周师傅说它已经两天没收到任何信号了。";
      if (!vars.hasCane && vars.itemCount < vars.bagVolume) { // 如果背包已满，就不要强调这句话了
        desc += "\n门后面立着一根备用的拖把杆——金属的，挺结实，可以当武器。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!hasCane && itemCount < bagVolume",
        text: "拿走拖把杆",
        nextScene: "理发店-拿到拖把杆",
        effect: updateTime(1)
      },
      {
        text: "回到前面",
        nextScene: "理发店-店内"
      }
    ]
  },

  "理发店-拿到拖把杆": {
    image: "images/anshengStreet/mopHandle.png",
    onEnter: { set: { positionAfterOperation: "理发店-拿到拖把杆" } },
    text: "墙角靠着一根金属拖把杆，拆下来应该能当武器用。",
    choices: [
      {
        text: "拿上拖把杆",
        condition: "itemCount < bagVolume",
        nextScene: "理发店-店内",
        effect: { set: { hasCane: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "不拿了",
        nextScene: "理发店-店内"
      }
    ]
  },

  // ==================== 安盛街-后巷 ====================
  "安盛街-后巷": {
    image: "images/anshengStreet/backAlley.png",
    onEnter: {
      set: {hurtByZombie: true}
    },
    text: "你从后门钻出来，进入一条狭窄的后巷。这里堆满了垃圾桶和废弃的纸箱，空气里弥漫着垃圾的酸臭味。\n\
你继续往前走去。          \n\
这里是死路。             \n\
而当你意识到身旁的\'垃圾\'是一只丧尸的手时，它已经抓伤了你的脖子！\n\
你飞速逃离了这里",
    choices: [
      {
        text: "继续",
        nextScene: "安盛街中段"
      }
    ]
  },

  // ==================== 安盛街中段 ====================
  "安盛街中段": {
    image: "images/anshengStreet/midStreet.png",
    onEnter: { set: { positionAfterOperation: "安盛街中段", currentArea: "周边社区", currentPlace: "安盛街", currentPos: "安盛街" } },
    qte: {
      timeout: "10000 - chasedByZombies * 1000",
      onTimeout: "安盛街中段-犹豫"
    },
    text: function(vars) {
      let desc = "你来到街上。街道两旁的店铺大多紧闭着门，有几家的橱窗被砸碎了，玻璃渣洒了一地。\n\
前方可以看到几家还开着门的店铺：一家文具店，一家服装店，还有一家食品批发部。北边是安居苑的后门。\n";
      let zombieDes = describeZombieWave(vars);
      return desc + zombieDes;
    },
    choices: [
      {
        text: "去文具店",
        nextScene: "安盛街-文具店",
        effect: updateTime(2)
      },
      {
        text: "去服装店",
        nextScene: "安盛街-服装店",
        effect: updateTime(2)
      },
      {
        text: "去批发部",
        nextScene: "安盛街-食品批发部",
        effect: updateTime(2)
      },
      {
        text: "去理发店",
        nextScene: "安盛街-理发店",
        effect: updateTime(2)
      },
      {
        text: "往西走",
        nextScene: "安盛街西侧",
        effect: updateTime(6)
      },
      {
        text: "往东走",
        nextScene: "安盛街东侧",
        effect: updateTime(6)
      },
      {
        text: "去三林安居苑",
        nextScene: "三林安居苑",
        effect: updateTime(2)
      },
      {
        showCondition: "itemCount > 0",
        text: "先整理一下东西",
        nextScene: "整理整理"
      },
      sprintAway(["安盛街-文具店", "安盛街-服装店", "安盛街-食品批发部", "安盛街-理发店", "安盛街西侧", "安盛街东侧", "三林安居苑"])
    ]
  },

  "安盛街中段-犹豫": {
    image: "images/anshengStreet/midStreet.png",
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你在街中央站得太久了。丧尸从街道两端围拢过来，低吼声此起彼伏。你不能再犹豫了——必须立刻做出选择。",
    choices: [
      {
        text: "一头扎进最近的店铺",
        nextScene: "安盛街-文具店",
        effect: updateTime(2)
      },
      {
        text: "朝人少的方向跑",
        nextScene: "安盛街西侧",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      }
    ]
  },

  // ==================== 安盛街-文具店 ====================
  "安盛街-文具店": {
    image: "images/anshengStreet/stationeryShop.png",
    text: "你推开吱呀作响的玻璃门，走进文具店。店里的货架歪歪扭扭，本子、笔、修正带散落一地。空气中有一股淡淡的墨水味。\n收银台后面有动静——像是什么东西在翻找东西。",
    choices: [
      {
        text: "悄悄靠近查看",
        nextScene: "安盛街-文具店的丧尸",
        effect: updateTime(1)
      },
      {
        text: "在门口搜刮一下就走",
        nextScene: "安盛街-文具店搜刮",
        effect: updateTime(2)
      },
      {
        text: "离开文具店",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-文具店的丧尸": {
    image: "images/anshengStreet/stationeryZombie.png",
    text: "你蹑手蹑脚地靠近收银台。一个穿校服的少年丧尸正蹲在地上，专心致志地啃咬一盒水彩笔，五颜六色的颜料糊了它一脸。\n它似乎还没发现你——但只要你发出一点声音……",
    choices: [
      {
        text: "悄悄退出去",
        nextScene: "安盛街中段",
        effect: updateTime(1)
      },
      {
        showCondition: "hasCane",
        text: "用拖把杆/拐杖敲它",
        nextScene: "安盛街-文具店击杀",
        condition: "strength >= 3",
        elseScene: "结局-安盛街-文具店被反杀"
      },
      {
        text: "仔细查看一下周围",
        showCondition: "!raidStationeryShop",
        nextScene: "安盛街-文具店搜刮",
        effect: updateTime(1)
      }
    ]
  },

  "安盛街-文具店击杀": {
    image: "images/anshengStreet/stationeryKill.png",
    onEnter: { add: { strength: -1 } },
    text: "你举起手中的家伙，狠狠砸了下去。少年丧尸还没来得及抬头就被砸翻在地，水彩笔滚了一地。\n你补了几下，确定它不会再动了。收银台后面的员工通道看起来通往更里面——也许仓库里还有什么有用的东西。",
    choices: [
      {
        text: "进去看看",
        nextScene: "安盛街-文具店仓库",
        effect: updateTime(2)
      },
      {
        text: "见好就收，离开这里",
        nextScene: "安盛街中段"
      }
    ]
  },

  "结局-安盛街-文具店被反杀": {
    image: "images/anshengStreet/stationeryZombie.png",
    text: "你举起手中的家伙，但它太重了，你的手臂发软，这一击只擦过了丧尸的肩膀。\n少年丧尸猛地转过头，那双灰白的眼珠直直锁定了你。它发出一声尖啸，像一头野兽般扑了过来——\n你太虚弱了，根本无力招架。\n\n—— 结局：文具店被反杀 ——"
  },

  "安盛街-文具店搜刮": {
    image: "images/anshengStreet/stationeryLoot.png",
    onEnter: { set: { raidStationeryShop: true } }, // 标记为已搜刮过文具店的物品
    text: "你看着门口附近凌乱的货架。铅笔橡皮撒了一地，收银台下面似乎有什么东西在闪光。",
    choices: [
      {
        text: "快速扫几眼就走",
        effect: updateTime(3),
        nextScene: "安盛街-文具店搜刮-快速"
      },
      {
        text: "蹲下来仔细翻找",
        effect: updateTime(15),
        nextScene: "安盛街-文具店搜刮-仔细",
        elseScene: "安盛街-文具店搜刮-仔细"
      }
    ]
  },

  "安盛街-文具店搜刮-快速": {
    image: "images/anshengStreet/stationeryLoot.png",
    onEnter: { set: { positionAfterOperation: "安盛街-文具店搜刮-快速" } },
    text: "你弯腰捡起柜台下面那把美工刀，揣进口袋就走了。店里太安静了，待久了总觉得不太安全。\n也许有些藏在角落的东西没来得及看，但命更重要。",
    choices: [
      {
        text: "拿上美工刀离开",
        condition: "itemCount < bagVolume",
        nextScene: "安盛街中段",
        effect: { set: { hasCutter: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "空手走人",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-文具店搜刮-仔细": {
    image: "images/anshengStreet/stationeryLoot.png",
    onEnter: { set: { positionAfterOperation: "安盛街-文具店搜刮-仔细" } },
    text: "你蹲下身，从货架底层开始一排一排地翻。铅笔、橡皮、尺子——都不是你要的。但收银台下面的抽屉里有一把崭新的美工刀，还有一整盒备用刀片。\n\
你正要起身，余光扫到柜台底下贴着一个信封——撕下来一看，里面是半包饼干和一张皱巴巴的传单。",
    choices: [
      {
        text: "都拿走",
        condition: "itemCount + 2 <= bagVolume",
        nextScene: "安盛街中段",
        effect: updateTime(1, { set: { hasCutter: true, hasCrumpledLeaflet: true }, add: { itemCount: 2 } }),
        elseScene: "整理整理"
      },
      {
        text: "只拿美工刀",
        condition: "itemCount + 1 <= bagVolume",
        nextScene: "安盛街中段",
        effect: updateTime(1, { set: { hasCutter: true }, add: { itemCount: 1 } }),
        elseScene: "整理整理"
      },
      {
        text: "背包满了，算了",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-文具店仓库": {
    image: "images/anshengStreet/stationeryWarehouse.png",
    text: "你推开吱嘎作响的铁门，走进文具店后面的小仓库。货架上堆满了各种文具和办公用品，墙角有几箱没拆封的打印纸。\n你的目光落在角落的一个铁柜上——上面贴着\"员工物品\"的标签，柜门虚掩着。",
    choices: [
      {
        text: "快速扫一眼就走",
        effect: updateTime(3),
        nextScene: "安盛街中段"
      },
      {
        text: "撬开铁柜看看",
        nextScene: "安盛街-文具店铁柜",
        effect: updateTime(15)
      },
      {
        text: "此地不宜久留",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-文具店铁柜": {
    image: "images/anshengStreet/stationeryLocker.png",
    text: "你打开铁柜，里面放着一个帆布袋、半包饼干、一瓶没开过的矿泉水。",
    choices: [
      {
        text: "吃掉饼干和水",
        nextScene: "安盛街-文具店铁柜-吃喝",
        effect: updateTime(5)
      },
      {
        showCondition: "!hasBag",
        text: "拿走帆布袋",
        nextScene: "安盛街中段",
        effect: updateTime(15, { set: { hasBag: true }, add: { bagVolume: 1} } )
      },
      {
        text: "不管了，离开",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-文具店铁柜-吃喝": {
    image: "images/anshengStreet/stationeryLocker.png",
    onEnter: { add: { strength: 2 } },
    text: "你拧开矿泉水瓶盖，咕嘟咕嘟喝了几大口，又撕开饼干包装吃了两块。虽然不是什么美餐，但足够补充体力了。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复2点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "离开",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-物品栏满了2": {
    image: "images/anshengStreet/stationeryZombie.png",
    text: "你想再捡点东西，但身上已经满当当的了。\n少年丧尸似乎察觉到了什么，开始抬起头来。你当机立断——现在不走更待何时。",
    choices: [
      {
        text: "闪人",
        nextScene: "安盛街中段"
      }
    ]
  },

  // ==================== 安盛街-服装店 ====================
  "安盛街-服装店": {
    image: "images/anshengStreet/clothingStore.png",
    text: "你走进服装店。模特假人歪倒在地上，衣物被扯得乱七八糟。试衣间的帘子半开着，里面黑漆漆的，什么都看不清。\n\
这家店看起来已经被洗劫过了，货架被推得东倒西歪。",
    choices: [
      {
        text: "检查试衣间",
        nextScene: "安盛街-服装店试衣间",
        effect: updateTime(1)
      },
      {
        text: "在收银台附近找找",
        nextScene: "安盛街-服装店收银台",
        effect: updateTime(1)
      },
      {
        text: "感觉不太对，离开这里",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-服装店试衣间": {
    image: "images/anshengStreet/fittingRoom.png",
    qte: {
      timeout: 5000,
      onTimeout: "结局-安盛街-试衣间丧尸扑脸"
    },
    text: "你慢慢拉开试衣间的帘子。\n里面蜷缩着一个女人——不，一只女丧尸。她穿着一件还没摘吊牌的连衣裙，听到帘子拉开的声音，猛地抬起头，张开嘴朝你扑来！",
    choices: [
      {
        text: "关上帘子！",
        nextScene: "安盛街-服装店逃出",
        effect: updateTime(1)
      },
      {
        text: "一脚踹过去",
        nextScene: "安盛街-服装店反击",
        condition: "strength >= 3",
        elseScene: "结局-安盛街-试衣间丧尸扑脸"
      },
      {
        text: "快跑！",
        nextScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "结局-安盛街-试衣间丧尸扑脸": {
    image: "images/anshengStreet/zombieInFittingRoom.png",
    text: "丧尸猛地扑到你身上，你失去平衡仰面摔倒。\n还没来得及挣扎，它已经咬了下来。\n\n—— 结局：试衣间丧尸 ——"
  },

  "安盛街-服装店反击": {
    image: "images/anshengStreet/fittingRoomFight.png",
    onEnter: { add: { strength: -1 } },
    text: "你一脚正中丧尸的胸口，它被踹回了试衣间，撞在墙上发出沉闷的声响。\n趁它还没爬起来，你头也不回地冲出了服装店。",
    choices: [
      {
        text: "回安盛街",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-服装店逃出": {
    image: "images/anshengStreet/clothingStoreExit.png",
    onEnter: updateTime(1),
    text: "你猛地拉上帘子，转身就跑。身后传来丧尸撞破帘子的声音，但你已经在店门外了。\n心跳得厉害。你靠在墙上喘了几口气，确定它没有追出来。",
    choices: [
      {
        text: "继续探索",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-服装店收银台": {
    image: "images/anshengStreet/clothingCounter.png",
    text: "你翻找收银台。收银机已经被撬开了，里面一分钱都没有——但这年头钱也没什么用。柜台下面的抽屉半开着，里面塞着一堆票据和杂物。",
    choices: [
      {
        text: "快速扫一眼",
        effect: updateTime(3),
        nextScene: "安盛街中段"
      },
      {
        text: "仔细翻找抽屉",
        effect: updateTime(15),
        nextScene: "安盛街-服装店收银台-仔细"
      },
      {
        text: "没什么用，离开",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-服装店收银台-仔细": {
    image: "images/anshengStreet/clothingCounter.png",
    onEnter: { set: { positionAfterOperation: "安盛街-服装店收银台-仔细" } },
    text: function(vars) {
      let basicDes = "你把抽屉整个拉了出来，把里面的东西倒在地上。一堆过期的会员卡、几张外卖单、半管护手霜";
      if(vars.hasCrumpledLeaflet) { // 如果已经拿到传单
        basicDes += "。";
      }
      else {
        basicDes += "————以及一张揉皱的传单，上面印着\"304柜 新到男装\"。";
      }
      return basicDes;
    },
    choices: [
      {
        showCondition: "!hasCrumpledLeaflet", // 只有在没有拿到传单时才显示
        text: "拿走传单",
        condition: "itemCount < bagVolume",
        nextScene: "安盛街中段",
        effect: updateTime(1, { set: { hasCrumpledLeaflet: true }, add: { itemCount: 1 } }),
        elseScene: "整理整理"
      },
      {
        text: "没用，走人",
        nextScene: "安盛街中段"
      }
    ]
  },

  // ==================== 安盛街-食品批发部 ====================
  "安盛街-食品批发部": {
    image: "images/anshengStreet/convenienceStore.png",
    text: function(vars) {
      let desc = "这是一家临街的食品批发部，几箱饮料摞在门口，但胜在不起眼。玻璃门上贴满了促销海报，看不清里面的情况。";
      if (vars.chasedByZombies >= 3) {
        desc += "\n<span style='color: #ff4444;'>远处的尸群正在逼近，你没有太多时间在这里逗留。</span>";
      }
      return desc;
    },
    choices: [
      {
        text: "推门进去",
        nextScene: "安盛街-食品批发部内部",
        effect: updateTime(1)
      },
      {
        text: "没时间了，离开",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-食品批发部内部": {
    image: "images/anshengStreet/convenienceStoreInside.png",
    text: "你推开门，门上的风铃发出清脆的响声。\n货架上的东西不多，但还剩一些：几瓶矿泉水、几包饼干、两罐午餐肉。柜台后面的冰柜已经不制冷了，里面的东西散发出一股怪味。\n正当你准备搜刮时，柜台后面站起来一个人——不，一只穿着店员制服的丧尸。它似乎刚才在柜台下面\"休息\"。",
    qte: {
      timeout: "8000 - chasedByZombies * 1500",
      onTimeout: "结局-安盛街-食品批发部被咬"
    },
    choices: [
      {
        showCondition: "dd <= 2 && !hasBiscuit", // 还没有被拿光（周围可能有别的幸存者，到Day3就没有水和饼干了）
        text: "快拿一瓶水和一包饼干",
        nextScene: "安盛街-食品批发部得手",
        effect: updateTime(1)
      },
      {
        showCondition: "hasCane || hasIronPipe",
        text: "抄家伙打它",
        nextScene: "安盛街-食品批发部战斗"
      },
      {
        text: "赶紧跑",
        nextScene: "安盛街-食品批发部逃跑"
      }
    ]
  },

  "安盛街-食品批发部得手": { // 一个有时限的无限补给点，可供玩家不断补给
    image: "images/anshengStreet/convenienceLoot.png",
    onEnter: updateTime(1, { add: { strength: 1 } }),
    text: "你飞快地抓起离你最近的一瓶水和一包饼干，转身就跑。店员丧尸慢悠悠地从柜台后面绕出来，但你已经在门外了。\n你拧开瓶盖灌了几口水，体力恢复了一些。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "把饼干塞进口袋",
        condition: "itemCount < bagVolume",
        nextScene: "安盛街中段",
        effect: { set: { hasBiscuit: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      }
    ]
  },

  "安盛街-食品批发部战斗": {
    image: "images/anshengStreet/convenienceFight.png",
    onEnter: { add: { strength: -1 } },
    text: "你举起手中的家伙，一棍子把店员丧尸打翻在地。它挣扎了几下，不动了。\n你迅速扫荡了货架上剩下的东西：两瓶水、几包饼干，还有一罐午餐肉。虽然不是山珍海味，但足够补充体力了。",
    choices: [
      {
        text: "吃喝补充体力",
        nextScene: "安盛街-食品批发部战斗-吃喝",
        effect: updateTime(5)
      }
    ]
  },

  "安盛街-食品批发部战斗-吃喝": {
    image: "images/anshengStreet/convenienceFight.png",
    onEnter: { add: { strength: 2 } },
    text: "你拧开一瓶水，就着饼干和午餐肉吃了一顿。虽然冷了点，但能填饱肚子就是好事。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复2点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "继续",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-食品批发部逃跑": {
    image: "images/anshengStreet/convenienceEscape.png",
    onEnter: updateTime(1),
    text: "你转身就跑，店员丧尸慢吞吞地跟在后面，但还没追到门口就放弃了——它似乎被什么东西绊倒了，哗啦一声撞在冰柜上。\n管他呢，跑就对了。",
    choices: [
      {
        text: "继续",
        nextScene: "安盛街中段"
      }
    ]
  },

  "结局-安盛街-食品批发部被咬": {
    image: "images/anshengStreet/convenienceStoreInside.png",
    text: "你在货架前犹豫了太久。店员丧尸悄无声息地走到了你身后——\n等你察觉到脖子上传来的凉意时，已经太晚了。\n\n—— 结局：批发部被咬 ——"
  },

  // ==================== 安盛街-尸潮遭遇战 ====================
  "安盛街-尸潮来袭": {
    image: "images/anshengStreet/zombieWave.png",
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你正走着，突然听到身后传来一阵密集的脚步声。\n回头一看，一群丧尸从十字路口的方向涌了过来——至少二三十只，像潮水一样塞满了整条街道。它们看到了你，发出嘶哑的吼声，加快了速度。\n你必须马上决定往哪跑！",
    qte: {
      timeout: "7000 - chasedByZombies * 1500",
      onTimeout: "结局-安盛街-被尸潮吞没"
    },
    choices: [
      {
        text: "往老小区跑！",
        nextScene: "安盛街-逃往安居苑",
        effect: updateTime(2)
      },
      {
        text: "躲进旁边的店铺！",
        nextScene: "安盛街-躲进店铺"
      },
      {
        showCondition: "_visit['理发店内部'] >= 1",
        text: "回头跑回理发店！",
        nextScene: "安盛街-逃回理发店",
        effect: updateTime(1)
      }
    ]
  },

  "结局-安盛街-被尸潮吞没": {
    image: "images/anshengStreet/zombieWaveSwallow.png",
    text: "你在街道中央犹豫了太久。\n尸潮像一面墙一样压了过来，无数双手抓住了你的衣服、手臂、脖子……\n你甚至来不及喊叫，就被拖进了那团蠕动的黑暗中。\n\n—— 结局：被尸潮吞没 ——"
  },

  "安盛街-逃往安居苑": {
    image: "images/anshengStreet/runToAnJuYuan.png",
    onEnter: updateTime(2, { add: { chasedByZombies: 1 } }),
    text: "你朝着老小区的方向拔腿狂奔。肺像被火烧一样，双腿酸软，但身后的脚步声越来越近——你不能停。\n\
前方出现了三林安居苑的后门。门卫亭、几辆歪斜的电瓶车、一道半开的大铁门，在你看来简直是一道天然的防线。\n\
你侧身挤过铁门，顺手把一辆电瓶车拖过来挡在门口。尸潮紧随其后撞了上来，但被这些障碍物暂时挡住了。\n\
隔着一道铁门，丧尸们挤挤挨挨地伸着手，却够不到你。你大口喘着气，暂时安全了。",
    choices: [
      {
        text: "继续",
        nextScene: "三林安居苑"
      }
    ]
  },

  "安盛街-躲进店铺": {
    image: "images/anshengStreet/hideInShop.png",
    onEnter: updateTime(5, { add: { chasedByZombies: -2 } }),
    text: "你一头扎进路边一家不知名的店铺，蹲在柜台后面，用手捂住嘴巴。\n\
外面的脚步声越来越近，越来越密。丧尸的嚎叫声此起彼伏，听得你头皮发麻。你甚至能闻到它们身上那股腐烂的臭味——它们就在门外。\n\
但幸运的是，它们没有停下来。尸潮像一阵暴风，从店铺门口席卷而过，渐渐远去了。\n等了很久很久，你才敢探出头来。",
    choices: [
      {
        text: "小心地走出去",
        nextScene: "安盛街中段"
      }
    ]
  },

  "安盛街-逃回理发店": {
    image: "images/anshengStreet/runToBarberShop.png",
    onEnter: updateTime(2),
    text: "你转身就跑，沿着来时的路狂奔。理发店的灯箱是你唯一认得的坐标。\n你用尽全力拍打玻璃门：\"周师傅！开门！是我！\"\n门锁咔哒一声打开了，一只手把你拉了进去。周师傅迅速锁好门，拉上窗帘。外面传来杂乱的脚步声和低吼——但它们没有停留，直接从门前过去了。\n\"你运气真是太好了，\"周师傅擦着额头的汗，\"下次可别引这么多回来。\"",
    choices: [
      {
        text: "喘口气",
        nextScene: "理发店内部"
      }
    ]
  },

  // ==================== 安盛街-被包围 ====================
  "安盛街-被包围": {
    image: "images/anshengStreet/surrounded.png",
    onEnter: { add: { chasedByZombies: 2 } },
    text: "你走到一半，发现事情不太对——丧尸不只从后面来。\n前面、左边的小巷、右边的店铺里，都有丧尸在向你靠近。它们不知道什么时候绕到了你的前方，形成了一个松散的包围圈。\n留给你的时间不多了。",
    qte: {
      timeout: "6000 - chasedByZombies * 1200",
      onTimeout: "结局-安盛街-被尸潮吞没"
    },
    choices: [
      {
        text: "砸开右边店铺的门",
        nextScene: "安盛街-破门逃生",
        condition: "hasCane || hasIronPipe",
        elseScene: "结局-安盛街-被尸潮吞没"
      },
      {
        text: "硬闯前面的缺口",
        nextScene: "安盛街-冲出包围",
        condition: "strength >= 4",
        elseScene: "结局-安盛街-被尸潮吞没"
      }
    ]
  },

  "安盛街-破门逃生": {
    image: "images/anshengStreet/breakDoor.png",
    onEnter: updateTime(2, { add: { strength: -1 } }),
    text: "你举起手中的家伙，对准店铺门的锁狠狠砸了下去。一下，两下——锁头终于崩开了。\n你踹开门冲了进去，反手把门顶上。外面传来丧尸撞门的声音，但这扇铁门足够结实。\n\
    你穿过黑漆漆的店铺，从另一侧的门钻了出来，发现自己到了安盛街的后巷。",
    choices: [
      {
        text: "继续前进",
        nextScene: "安盛街-后巷"
      }
    ]
  },

  "安盛街-冲出包围": {
    image: "images/anshengStreet/breakThrough.png",
    onEnter: updateTime(2, { add: { strength: -1, chasedByZombies: 1 } }),
    text: "你深吸一口气，朝着最薄弱的缺口猛冲过去。一只丧尸伸手抓向你的衣领，被你一肘击翻；另一只从侧面扑来，你侧身闪过。\n你的肺部在燃烧，腿像灌了铅一样沉重——但你不能停。\n终于，你冲出了包围圈。身后的丧尸群还在追，但你已经甩开了距离。前方就是安盛街西侧，视野开阔了很多。",
    choices: [
      {
        text: "继续往前",
        nextScene: "安盛街西侧"
      }
    ]
  },

  // ==================== 安盛街西侧（分岔路口） ====================
  "安盛街西侧": {
    image: "images/anshengStreet/westStreet.png",
    onEnter: { set: { positionAfterOperation: "安盛街西侧", currentArea: "周边社区", currentPlace: "安盛街", currentPos: "安盛街" } },
    text: function(vars) {
      let desc = "你来到了安盛街西侧。这里比东侧更加破败——路面上到处是斑斑点点的血迹，有些已经发暗，有些还泛着潮。几辆废弃的车辆歪停在路边。\n\
  一块歪斜的路牌指向两个方向：右边是小区西门的方向，那里有个十字路口，左边沿大路一直走可以到新达汇商场。";
      if (vars.chasedByZombies >= 3) {
        desc += "\n<span style='color: #ff4444;'>身后的丧尸越来越近了，你必须赶快决定去向。</span>";
      }
      let zombieDes = describeZombieWave(vars);
      return desc + "\n" + zombieDes;
    },
    qte: {
      timeout: "12000 - chasedByZombies * 2000",
      onTimeout: "安盛街-尸潮来袭"
    },
    choices: [
      {
        text: "去十字路口",
        nextScene: "三林路-东明路 十字路口",
        effect: updateTime(10)
      },
      {
        text: "继续往西，去新达汇方向",
        nextScene: "朝新达汇前进",
        effect: updateTime(30)
      },
      {
        text: "返回安盛街中段",
        nextScene: "安盛街中段",
        effect: updateTime(6)
      },
      {
        showCondition: "itemCount > 0",
        text: "先整理一下东西",
        nextScene: "整理整理"
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲到广告牌后面",
        nextScene: "安盛街西侧-躲藏"
      },
      sprintAway(["朝新达汇前进", "三林安居苑", "安盛街中段"])
    ]
  },

  "朝新达汇前进": {
    image: "images/anshengStreet/toXindahui.png",
    text: "你沿着大路向西走去。越往前走，街道越宽阔，路边出现了更多的商铺和写字楼。\n远处的天际线上，你能看到新达汇商场的大楼——玻璃幕墙反射着夕阳的余晖，像一个沉默的巨人。\n但路上并不太平。沿途的丧尸明显多了起来——毕竟是通往大型商场的主干道。",
    choices: [
      {
        text: "继续前进",
        nextScene: "新达汇-喷泉广场",
        effect: updateTime(20)
      },
      {
        text: "这条路太危险了，返回安盛街",
        nextScene: "安盛街西侧",
        effect: updateTime(10)
      },
      sprintAway(["新达汇-喷泉广场", "安盛街西侧"])
    ]
  },

  // ========== 躲藏场景（安盛街区域） ==========

  "安盛街东侧-躲藏": {
    image: "images/anshengStreet/eastEntrance.png",
    onEnter: function(vars) {
      updateTime(15 + Math.floor(Math.random() * 16))(vars);
      if (vars.chasedByZombies >= 4 && Math.random() < 0.4) {
        vars.strength = Math.max(0, vars.strength - 1);
        vars._hideFail = true;
      } else {
        vars.chasedByZombies = Math.max(0, vars.chasedByZombies - 1);
        vars._hideFail = false;
      }
      return {};
    },
    text: function(vars) {
      if (vars._hideFail) return "你侧身挤进路边一个半塌的报刊亭，但铁皮墙突然被什么东西撞了一下——一只丧尸在无意识地撞墙。铁皮发出凹痕声，再待下去就要被发现。你只能一脚踹开门，冲了出去。";
      return "你侧身挤进路边一个半塌的报刊亭。里面散落着过期杂志和碎玻璃。你蹲在柜台后面，从缝隙里看着街道。几只丧尸从亭外经过，没往里面看一眼。等了很久，你才推开吱呀作响的门走出来。";
    },
    choices: [
      { text: "继续", nextScene: "安盛街东侧" }
    ]
  },

  "安盛街西侧-躲藏": {
    image: "images/anshengStreet/westStreet.png",
    onEnter: function(vars) {
      updateTime(15 + Math.floor(Math.random() * 16))(vars);
      if (vars.chasedByZombies >= 4 && Math.random() < 0.4) {
        vars.strength = Math.max(0, vars.strength - 1);
        vars._hideFail = true;
      } else {
        vars.chasedByZombies = Math.max(0, vars.chasedByZombies - 1);
        vars._hideFail = false;
      }
      return {};
    },
    text: function(vars) {
      if (vars._hideFail) return "你躲到一块倒下的巨型广告牌后面，但铁架发出吱嘎声——几只丧尸爬上了倒下的广告牌。铁架在摇晃，快撑不住了！你一脚踹开最近的那只，从铁架缝隙里钻了出去。";
      return "你躲到一块倒下的巨型广告牌后面。铁架和帆布形成了一个三角空间，像街边的一个临时掩体。外面的丧尸在广告牌另一侧徘徊，看不见你。等声音远去，你才从里面爬出来。";
    },
    choices: [
      { text: "继续", nextScene: "安盛街西侧" }
    ]
  }
});
