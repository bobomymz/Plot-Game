// ========== 五金店剧情 ==========
// 正门进必死（5种死法），唯一生路是从联华超市地下室暗道进入
// 目标：找到润滑油（hasLubricant）

Object.assign(storyData, {

  // ==================== 五金店入口（三林路） ====================
  "五金店": {
    image: function(vars) { return vars.weather === "雨" ? "images/placeholder.png" : "images/placeholder.png"; }, /* TODO: images/小区周边/hardwareStore.png */
    onEnter: function(vars) {
      vars.currentPlace = "三林路";
      vars.currentPos = "五金店";
      applyWeatherDrain(vars);
    },
    text: function(vars) { return "你来到三林路上那家老五金店。卷帘门半开着，里面黑漆漆的，看不清有什么。门缝里传出隐约的风声，像是空气在空旷的货架间穿行。\n你注意到侧面的窗户破了一扇，后巷也能绕过去。" + describeWeather(vars); },
    choices: [
      {
        text: "从正门钻进去",
        nextScene: "五金店-正门"
      },
      {
        text: "绕到侧面翻窗",
        nextScene: "五金店-侧窗"
      },
      {
        text: "绕到后巷看看",
        nextScene: "五金店-后巷"
      },
      {
        text: "算了，不进去了",
        nextScene: "三林路"
      }
    ]
  },

  // ==================== 正门路线 ====================
  "五金店-正门": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStore.png */,
    text: "你拉开卷帘门，钻进五金店。店里很暗，只有几缕光线从落满灰的窗户透进来。货架歪七扭八地排列着，上面散落着各种工具和零件。\n你身后传来嘎吱一声——卷帘门自己滑了下来，卡住了。你拉了两下，拉不动。\n退路断了。你只能往前。",
    onEnter: updateTime(2), // 花2分钟钻进店内并环顾四周
    choices: [
      {
        text: "摸黑往前走",
        nextScene: "五金店-正门-摸黑"
      },
      {
        text: "打开手机照明",
        nextScene: "五金店-正门-照明"
      }
    ]
  },

  "五金店-正门-摸黑": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStore.png */,
    onEnter: updateTime(3), // 花3分钟在黑暗中摸索前行
    text: "你伸手探路，在黑暗中缓慢前进。脚下踢到了什么东西——哐当一声，像是一桶油漆被踢翻了。\n你继续走了两步，突然脚下一空——地板有一块检修口没盖盖子。你整个人掉进了地沟里，膝盖磕在水泥地上，疼得你眼前发黑。\n你还没爬起来，头顶就传来一声沉闷的落地声——什么东西跳下来了。在黑暗中你什么都看不见，但你闻到了那股腐臭。很近。",
    choices: [
      {
        text: "伸手去摸四周有没有武器",
        nextScene: "结局-五金店-地沟"
      }
    ]
  },

  "结局-五金店-地沟": {
    image: "images/zombieKnockYouDown.png",
    text: "你的手在黑暗中摸到了一根铁管——但你还没来得及抓稳，它已经扑到了你身上。它的速度太快了。\n迅捷丧尸。这种丧尸你只听说过——它们跑得比人快，攻击比普通丧尸更猛。\n你的喉咙被咬住的时候，最后一个念头是：它是什么时候从五金店里冒出来的？\n\n—— 结局：五金店地沟 ——"
  },

  "五金店-正门-照明": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreInside.png */,
    onEnter: updateTime(1), // 花1分钟掏出手机照明
    text: "你打开手机的手电筒。惨白的光照亮了五金店的内部——货架上凌乱地摆着扳手、螺丝刀、电线和各种五金零件。地上散落着一些碎玻璃和空纸箱。\n你看到前方有一扇门，上面贴着“工具区”的牌子。左手边是柜台，柜台后面的架子上似乎放着一些瓶瓶罐罐。",
    choices: [
      {
        text: "推开工具区的门",
        nextScene: "五金店-工具区门"
      },
      {
        text: "绕过柜台看看后面的架子",
        nextScene: "五金店-前台"
      }
    ]
  },

  "五金店-工具区门": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreInside.png */,
    text: "你握住门把手，轻轻推开。门缝里漆黑一片——你举起手机照了照，看到里面墙上挂满了各种工具。\n一道黑影从门缝上方的货架上直扑下来。你完全来不及反应——它的速度快得不像丧尸，像一头受惊的野兽。\n你被扑倒在地，手机飞了出去，光在地上打转，照亮了它灰白的脸和沾着血迹的嘴角。迅捷丧尸。",
    choices: [
      {
        text: "已经来不及了",
        nextScene: "结局-五金店-迅捷"
      }
    ]
  },

  "结局-五金店-迅捷": {
    image: "images/zombieKnockYouDown.png",
    text: "它的牙齿刺入你脖子的那一刻，你甚至没有感觉到疼痛——太快了。你最后的意识是手机落在地上，光照着天花板上的一道裂缝。\n\n—— 结局：五金店迅捷丧尸 ——"
  },

  "五金店-前台": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreCounter.png */,
    text: "你绕过柜台。后面的架子上确实放着一些瓶瓶罐罐——油漆、松节油、润滑剂……但你还没来得及看清具体的标签，就感到一阵眩晕。你低头——柜台下方有一根管道裂了，正冒出淡淡的白色气体。\n你已经吸进去了。你的视野开始模糊，腿发软。你想后退，但身体不听使唤。你摔倒在地上，离那扇紧闭的卷帘门只有几步之遥，但你连抬手的力气都没有了。",
    choices: [
      {
        text: "试图向门口爬去",
        nextScene: "结局-五金店-毒气"
      }
    ]
  },

  "结局-五金店-毒气": {
    image: "images/placeholder.png" /* TODO: images/home/po.png */,
    text: "你一寸一寸地爬向门口，手指扣着地面的缝隙。但气体比你更快——它弥漫在整个空间里，你的每一次呼吸都让意识更加模糊。\n在你失去知觉前的最后一刻，你看到柜台下方有什么东西动了。一只穿着深蓝色工装裤的手从柜台下面伸了出来。原来它一直就在那里，躲在毒气里。\n\n—— 结局：五金店毒气 ——"
  },

  // ==================== 侧窗路线 ====================
  "五金店-侧窗": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreSide.png */,
    onEnter: updateTime(3), // 花3分钟绕到侧面+翻窗
    text: "你绕到五金店侧面。那扇破窗开在离地面大约一米五的高度，窗框上还残留着几片碎玻璃。里面看起来是工具区——墙上挂着各种工具，地上堆着一些纸箱。\n你小心地爬了进去，没有发出太大声音。你安全地落在了工具区的地面上。",
    choices: [
      {
        text: "先看看墙上挂着什么工具",
        nextScene: "五金店-侧窗-探索"
      }
    ]
  },

  "五金店-侧窗-探索": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreTools.png */,
    onEnter: updateTime(2), // 花2分钟审视墙上工具
    text: "你环顾工具区。墙上挂着一排扳手和螺丝刀，上面沾着机油和灰，但没生锈——五金店的东西保养得还行。你挑了一把趁手的扳手——虽然不是什么神兵利器，但总比空手强。\n你正打算再翻翻看有什么有用的，突然听到工具区门外传来声音——嘎吱，嘎吱——像是什么东西在拖沓地走动。就在门的那一侧。",
    choices: [
      {
        text: "推开工具区的门看看",
        nextScene: "五金店-工具区门"
      },
      {
        text: "躲进货架之间，从缝隙里观察",
        nextScene: "五金店-货架躲藏"
      }
    ]
  },

  "五金店-货架躲藏": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreInside.png */,
    text: "你蹲下来，缩进两排货架之间的缝隙里。透过货架上的空隙，你看向工具区门的方向。\n门没有被推开。但你注意到脚边的地板上正在渗出一种淡白色的气体——它从地板缝里一丝一丝地冒出来，像干冰一样贴着地面蔓延。\n你捂住口鼻，但太晚了。你已经吸了一口。你的喉咙开始收缩，视野边缘开始模糊。你想站起来，但腿已经完全不听使唤了。\n你倒下的时候碰倒了一排货架，扳手和螺丝刀哗啦啦地砸在你身上。你听到工具区门被推开了，然后是脚步声——是走路的脚步声，不紧不慢地朝你走来。",
    choices: [
      {
        text: "……",
        nextScene: "结局-五金店-毒气"
      }
    ]
  },

  // ==================== 后巷路线 ====================
  "五金店-后巷": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreBack.png */,
    onEnter: updateTime(2), // 花2分钟绕到后巷
    text: "你绕到五金店后面的小巷。后巷堆满了废弃的纸箱和空油桶，地面上有一层黏糊糊的黑色油渍。后门是一扇厚重的铁皮门，锁着——但锁看起来不太结实。\n铁皮门的门缝里透出一丝微弱的光线——里面有人？还是有别的什么东西？",
    choices: [
      {
        text: "掏出铁棍撬锁",
        nextScene: "五金店-后巷-撬锁",
        condition: "hasIronPipe",
        elseScene: "五金店-后巷-偷看"
      },
      {
        text: "趴下来从门缝里往里看",
        nextScene: "五金店-后巷-偷看"
      },
      {
        text: "算了，回到店门口",
        nextScene: "五金店"
      }
    ]
  },

  "五金店-后巷-撬锁": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreBack.png */,
    onEnter: updateTime(5), // 花5分钟撬锁
    text: "你把铁棍插进门缝，用力一撬。锁头发出一声闷响，弹开了。\n你拉开铁皮门——门后站着一个人。一个女人。不，一只穿着店员围裙的女丧尸，就贴在门后站着，像是早就知道你会从这里进来。\n它张开了嘴。你闻到了一股熟悉的、甜腻的气味——从它的嘴里呼出的气体。",
    choices: [
      {
        text: "屏住呼吸想后退，但太近了",
        nextScene: "结局-五金店-开门杀"
      }
    ]
  },

  "结局-五金店-开门杀": {
    image: "images/zombieKnockYouDown.png",
    text: "它离你太近了——不到一个手臂的距离。你屏住呼吸想要后退，但它伸出双臂抱住了你，像一个僵硬而冰冷的拥抱。\n它的嘴贴着你的脸，呼出的气体直接喷在你的口鼻上。你只撑了不到五秒，意识就像被关掉的灯一样熄灭了。\n\n—— 结局：五金店开门杀 ——"
  },

  "五金店-后巷-偷看": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreBack.png */,
    onEnter: updateTime(2), // 花2分钟趴下+调整角度偷看
    text: "你趴下身子，把眼睛凑到门缝处。\n一开始你什么都看不到——太暗了。然后你看到里面有什么东西在动，一个模糊的轮廓正在店里缓缓移动。\n你调整了一下角度，想看清楚——然后你看到了一只眼睛。就在门缝的另一侧，也在看着你。\n你僵住了。它也僵住了。\n然后门被猛地拉开了。",
    choices: [
      {
        text: "快跑——但已经来不及了",
        nextScene: "结局-五金店-对视"
      }
    ]
  },

  "结局-五金店-对视": {
    image: "images/zombieKnockYouDown.png",
    text: "一只手从门后猛地伸出来，抓住了你的衣领，把你整个人拽了进去。你摔在冰冷的水泥地上，翻滚了两圈才停下来。当你抬起头时，它已经站在了你面前——那只店员丧尸，围裙上沾满了机油和暗褐色的污渍。\n它的速度快得惊人。你听到的最后声音是你自己的颈椎断裂的声音。\n\n—— 结局：五金店对视 ——"
  },

  // ==================== 联华超市地下室 → 暗道 → 五金店仓库（唯一生路） ====================
  "联华超市-地下室-撬锁": {
    image: "images/placeholder.png" /* TODO: images/小区周边/supermarketBasement.png */,
    onEnter: updateTime(5, { add: { strength: -1 } }), // 花5分钟撬铁栅栏门，很费体力
    text: function(vars) {
      var breakChance = 0.5 - (vars.strength - 5) * 0.05;
      var broke = Math.random() < breakChance;
      vars._pipeBroke = broke;
      var desc = "你打开活板门，下到地下室。在手电筒的照射下，你注意到角落深处还有一扇不起眼的铁栅栏门——上面焊着的铁条已经锈蚀了，锁头看起来很旧。\n你掏出铁管，卡进锁环之间，用力撬动。";
      if (broke) {
        desc += "\n\n铁管发出一声刺耳的金属呻吟——然后啪地一声断了。半截铁管掉在地上，叮叮当当滚到了角落。你看着手里剩下的半截，愣住了。\n\
锁环没有断——你的铁管倒是先断了。而且刚才那声巨响……肯定引起了什么东西的注意。现在这扇铁栅栏门也没撬开，地下室的位置也暴露了，真是两头不讨好。";
        vars.hasIronPipe = false;
        vars.itemCount = Math.max(0, vars.itemCount - 1);
        vars._supermarketCompromised = true;
      } else {
        desc += "\n\n铁管在你的用力下发出嘎吱嘎吱的声音——锁环开始变形了。你又加了一把力，只听咔嚓一声，锁环崩断了。铁栅栏门吱呀一声弹开了一条缝。";
      }
      return desc;
    },
    choices: [
      { text: "没有办法了，离开这里", nextScene: "三林路", showCondition: "_pipeBroke" },
      { text: "拉开铁栅栏门，钻进去", nextScene: "五金店-暗道", showCondition: "!_pipeBroke" }
    ]
  },

  "五金店-暗道": {
    image: "images/placeholder.png" /* TODO: images/小区周边/darkPassage.png */,
    onEnter: updateTime(5), // 花5分钟走暗道+观察岔路
    text: "你钻过铁栅栏门，进入一条狭窄的暗道。墙壁是粗糙的水泥，头顶有管道穿过，偶尔传来水管里咕噜噜的水声。脚下能踩到细碎的砂石，发出沙沙的声响。\n你走了大约十几米，前方出现了一个岔路。左边的通道更宽一些，能隐约听到风声——好像通向外面。右边的通道更窄，尽头能隐约看到一个堆满杂物的房间轮廓。",
    choices: [
      {
        text: "走左边——看看通向哪里",
        nextScene: "五金店-暗道-地铁隧道"
      },
      {
        text: "走右边——钻进那个房间",
        nextScene: "五金店-暗道-仓库"
      }
    ]
  },

  "五金店-暗道-地铁隧道": {
    image: "images/placeholder.png" /* TODO: images/metro/trainTunnel.png */,
    onEnter: updateTime(5), // 花5分钟走到地铁隧道
    text: "你沿着左边的通道走了一段。通道越来越宽，墙上的管道越来越粗。空气变得潮湿而阴冷。\n\
前方出现了亮光——不是日光，是一种昏黄的灯光。你走过去，发现通道尽头是一个检修口，通向一条宽阔的隧道。轨道。\n是地铁隧道。\n你刚刚意识到这一点时，隧道深处传来一阵越来越响的轰鸣声。地面开始震动。一束刺眼的灯光从黑暗的隧道深处直射而来。\n你转身想跑——但来不及了。",
    choices: [
      {
        text: "……",
        nextScene: "结局-五金店-地铁"
      }
    ]
  },

  "结局-五金店-地铁": {
    image: "images/placeholder.png" /* TODO: images/小区周边/tunnelCrash.png */,
    text: "列车以不可阻挡的速度碾过。在最后的一瞬间，你想到的是——这条线路居然还在运行？\n\n—— 结局：五金店地铁 ——"
  },

  "五金店-暗道-仓库": {
    image: "images/placeholder.png" /* TODO: images/小区周边/hardwareStoreStorage.png */,
    onEnter: function(vars) {
      vars.positionAfterOperation = "五金店-暗道-仓库";
      return updateTime(3, { add: { strength: -1 } })(vars);
    },
    text: function(vars) {
      let basicDes = "你钻进右边的通道，从一处破旧的通风口钻了出来。你站在五金店后方的仓库里。\n\
货架上堆满了各种货物——成箱的螺丝钉、卷成捆的电线、落满灰的灯泡。";
      if (vars.hasLubricant) basicDes += "真是破败不堪。"
      else {
        basicDes += "\n你环顾四周，在一个角落的货架上看到了几个熟悉的蓝色罐子。\n\
WD-40 防锈润滑剂。";
      }
      return basicDes;
    },
    choices: [
      {
        text: "拿上润滑油",
        condition: "itemCount < bagVolume",
        nextScene: "五金店-暗道-返回",
        effect: { set: { hasLubricant: true, _supermarketCompromised: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "离开",
        nextScene: "五金店-暗道-返回",
        effect: updateTime(1)
      }
    ]
  },

  "五金店-暗道-返回": {
    image: "images/placeholder.png" /* TODO: images/小区周边/supermarketBasement.png */,
    onEnter: updateTime(4, { add: { strength: -1 } }), // 花4分钟原路返回，来回一趟体力消耗不小
    text: "你原路返回，穿过暗道，爬回联华超市的地下室。铁栅栏门的锁环还断在那里——你没有把它修好，也不可能修好。\n\
你拍了拍口袋里的润滑油罐子。这趟损失了一根铁管，希望这个东西有用。",
    choices: [
      {
        text: "离开地下室",
        nextScene: "三林路"
      }
    ]
  }
});
