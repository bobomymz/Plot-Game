// ========== 三林安居苑剧情 ==========
// 安盛街部分已拆分到安盛街.js

Object.assign(storyData, {

  // ==================== 三林安居苑（老小区） ====================
  "三林安居苑后门": {
    image: function(vars) {
      if (vars.weather === "雨") {
        var f = timeImage({
        morning: "images/安居苑/后门-雨天.png",
        evening: "images/安居苑/后门-雨天-evening.png",
        night: "images/安居苑/后门-雨天-night.png",
        midnight: "images/安居苑/后门-雨天-midnight.png"
        });
        return f(vars);
      }
      var f = timeImage({
        morning: "images/安居苑/后门.png",
        evening: "images/安居苑/后门-evening.png",
        night: "images/安居苑/后门-night.png",
        midnight: "images/安居苑/后门-midnight.png"
      });
      return f(vars);
    }, /* TODO: images/安居苑/anJuYuan.png */
    onEnter: function(vars) {
      vars.currentPlace = "安居苑";
      vars.currentPos = "安居苑";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      let desc = "你来到三林安居苑的入口。这是一个老小区，没有地下车库，几栋六层楼围绕着中间的小花园。\n";
      if (vars.chasedByZombies >= 2) {
        desc += "追在身后的尸群暂时还没跟上来——老小区的门卫亭和几辆废弃的电瓶车形成了一道天然的障碍，也许能挡一阵。\n";
      }
      desc += "小区里异常安静，只有风吹过树梢的沙沙声。你注意到花坛里有几只猫——不，它们看起来不太对劲。它们的眼睛泛着不正常的绿光，体型也比普通猫大了一圈。\n其中一只缓缓转过头来，盯着你，发出低沉的嘶嘶声。";
      desc += "\n" + describeWeather(vars);
      return desc;
    },
    choices: [
      {
        text: "慢慢后退，不激怒它们",
        nextScene: "安盛街西侧"
      },
      {
        text: "绕开猫，进入小区",
        nextScene: "三林安居苑-小区内部",
        effect: updateTime(4)
      },
      {
        showCondition: "hasCane || hasMopHandle || hasIronPipe",
        text: "挥舞武器吓唬它们",
        nextScene: "三林安居苑-驱赶变异猫",
        effect: updateTime(2)
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲到门卫亭后面",
        nextScene: "三林安居苑-躲藏"
      },
      sprintAway(["安盛街西侧", "三林安居苑-小区内部"])
    ]
  },

  "三林安居苑-驱赶变异猫": {
    image: "images/placeholder.png" /* TODO: images/安居苑/mutantCat.png */,
    onEnter: { add: { strength: -1 } },
    text: "你挥舞手中的家伙，朝那些变异猫大声吼叫。它们弓起背，发出愤怒的嘶吼，但并没有扑上来——它们似乎还保留着一丝对人类的畏惧。\n\
对峙了几秒后，带头的那只大猫转身跑进了花坛深处，其他的也跟着散了。\n小区暂时安全了，至少入口是。",
    choices: [
      {
        text: "进入小区",
        nextScene: "三林安居苑-小区内部",
        effect: updateTime(2)
      },
      {
        text: "不进小区，返回安盛街",
        nextScene: "安盛街西侧"
      }
    ]
  },

  "三林安居苑-小区内部": {
    image: function(vars) {
      if (vars.weather === "雨") {
        var f = timeImage({
          morning: "images/placeholder.png",
          evening: "images/placeholder.png",
          night: "images/placeholder.png",
          midnight: "images/placeholder.png"
        });
        return f(vars);
      }
      return "images/placeholder.png";
    }, /* TODO: images/安居苑/anJuYuanInside.png */
    onEnter: function(vars) {
      vars.currentPlace = "安居苑";
      vars.currentPos = "安居苑";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      let basicDes = "你走在三林安居苑的一条小道上。老小区的布局很简单：中间是一个小花园，围绕着几栋六层居民楼。旁边还有一个下沉式小广场，你以前经常在这里玩滑板车。\n"
      if(!vars.fightWithVineZombie) basicDes += "花园里的长椅上躺着一个老人，已经变成丧尸了——它的身体被藤蔓缠住，动弹不得，只能发出微弱的嗬嗬声。\n"
      basicDes += "小区南侧有一扇通往安盛街的后门。\n\
你看向西边那栋楼，一楼的几户人家门窗紧闭，有一家的门虚掩着。";
      if (!vars.hasRustyBike) basicDes += "门口还停着一辆老式自行车，车筐里塞着半袋没来得及拿上楼的菜。";
      basicDes += "\n\
东边那栋的门牌上写着“8号楼”——二楼靠东的窗户开着一道缝，像是被人推开后就没关回去。窗台上搁着一只白色的搪瓷缸，上面印着褪了色的红字。风大的时候，能听到什么东西在啪嗒啪嗒地响。"
      // 安居苑北门是前门，面向三林路，南门是后门，面向安盛街中段
      return basicDes + "\n" + describeWeather(vars);
    },
    choices: [
      {
        text: "去那户虚掩着门的人家看看",
        nextScene: "三林安居苑-居民楼",
        effect: updateTime(4)
      },
      {
        text: "往东走去8号楼",
        nextScene: "三林安居苑-8号楼",
        effect: updateTime(4)
      },
      {
        showCondition: "!fightWithVineZombie",
        text: "查看被藤蔓缠住的丧尸",
        nextScene: "三林安居苑-藤蔓丧尸",
        effect: updateTime(2)
      },
      {
        showCondition: "bikeInAnjuyuan",
        text: "检查那辆自行车",
        nextScene: "三林安居苑-自行车",
        effect: updateTime(2)
      },
      {
        text: "从后门去安盛街",
        nextScene: "安盛街中段",
        effect: updateTime(6)
      },
      {
        text: "前往小广场",
        nextScene: "三林安居苑-小广场"
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲进灌木丛",
        nextScene: "三林安居苑-小区内部-躲藏"
      },
      sprintAway(["三林安居苑-居民楼", "三林安居苑-8号楼", "安盛街中段", "安居苑前门"])
    ]
  },

  // ========== 小广场 ==========

  "三林安居苑-小广场": {
    image: function(vars) {
      if (vars.weather === "雨") {
        var f = timeImage({
          morning: "images/placeholder.png",
          evening: "images/placeholder.png",
          night: "images/placeholder.png",
          midnight: "images/placeholder.png"
        });
        return f(vars);
      }
      return "images/placeholder.png";
    }, /* TODO: images/安居苑/smallSquare.png */
    onEnter: function(vars) {
      vars.currentPlace = "安居苑";
      vars.currentPos = "小广场";
      vars.positionAfterOperation = "三林安居苑-滑板车";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      return "你走进三林安居苑的小广场。小广场的周围是一圈石质台阶，你小时玩滑板车时，奶奶就会坐在那里。小广场一侧有一间风格古朴的长亭，是小朋友们玩奥特曼卡牌和陀螺的地方。\
再往后，就是老年人走的鹅卵石路，小时候的你一直不明白，那种路怎么会有人走得下去。\n" + describeWeather(vars);
    },
    choices: [
      {
        text: "往南走",
        nextScene: "三林安居苑-小区内部"
      },
      {
        text: "往北走",
        nextScene: "安居苑前门"
      },
      {
        showCondition: "!hasScooter",
        text: "拿起倒在一旁的滑板车",
        nextScene: "三林安居苑-滑板车",
        condition: "hasNoTransportation",
        elseScene: "整理整理"
      },
      {
        text: "走走鹅卵石路",
        nextScene: "三林安居苑-鹅卵石路"
      }
    ]
  },

  "三林安居苑-滑板车": {
    image: "images/placeholder.png" /* TODO: images/安居苑/skboard.png */,
    onEnter: function(vars) {
      vars.personalMemorySet.add("滑板车的盲从");
      return {};
    },
    text: "你拿起了滑板车。车轴没有锈迹，看起来是辆新车，不错。\n\
一阵童年的回忆涌上心头。\n\
那时，弟弟才3岁，你正是玩滑板板车的年纪。有一天，你在滑板车上看见妈妈抱着弟弟回家了，你不加思索跟了上去，把奶奶丢在了广场里，独自在风中凌乱。\n\
回到家，当然是被臭骂了一顿。\n\
现在这番情景，怕是能活着见到奶奶都很困难了。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】拾取记忆[滑板车的盲从]</span>",
    choices: [
      {
        text: "继续",
        nextScene: "三林安居苑-小广场"
      }
    ]
  },

  "三林安居苑-鹅卵石路": {
    image: "images/placeholder.png" /* TODO: images/安居苑/goldenE.png */,
    onEnter: {set: {positionAfterOperation: "三林安居苑-小广场"}},
    text: function(vars) {
      let basicDes = "你走上了鹅卵石路。鹅卵石路是一条老路，上面的鹅卵石很老，但是很平滑。\n";
      if(!vars.findKey502) basicDes += "你走着走着，发现鹅卵石路的尽头是一个老式的自行车，车筐里塞着半袋没来得及拿上楼的菜。\n\
你骑上去试了试。很可惜，这个自行车上锁了。车篮里有一把钥匙，但不是车锁的钥匙，上面写着“402”。"
    },
    choices: [
      {
        showCondition: "!hasKey502",
        text: "拿上钥匙",
        nextScene: "三林安居苑-小广场",
        condition: "itemCount < bagVolume",
        effect: updateTime(1, {set: {hasKey502: true}, add: {itemCount: 1}}),
        elseScene: "整理整理"
      },
      {
        text: "离开",
        nextScene: "三林安居苑-小广场"
      }
    ]
  },

  // ========== 藤蔓丧尸（美工刀 + 地图） ==========
  "三林安居苑-藤蔓丧尸": {
    image: "images/placeholder.png" /* TODO: images/安居苑/vineZombie.png */,
    text: function(vars) {
      var desc = "你走近长椅上的丧尸。它是个六十来岁的老头，穿着一件洗得发白的中山装，胸口口袋鼓鼓的——好像塞着什么东西。\n\
藤蔓从长椅下方的花坛里疯长出来，把它整个下半身缠得严严实实。它只能扭动上半身，朝你张着黑洞洞的嘴，发出嗬嗬的气声。";
      if (vars.hasCutter) {
        desc += "\n<span style='color: #ffaa00;'>口袋里的美工刀正好可以用来割断这些藤蔓。</span>";
      } else if (vars.hasCane || vars.hasMopHandle || vars.hasIronPipe) {
        desc += "\n你没带刀，但手里的家伙足够长——可以试着拨开藤蔓，或者直接给它一下。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "hasCutter",
        text: "用美工刀割断藤蔓",
        nextScene: "三林安居苑-割藤蔓",
        effect: updateTime(2, {set: {fightWithVineZombie: true}})
      },
      {
        showCondition: "!hasCutter",
        text: "伸手去掏它胸口的袋子",
        nextScene: "三林安居苑-藤蔓丧尸-被咬",
        effect: updateTime(1, {set: {fightWithVineZombie: true}})
      },
      {
        showCondition: "hasCane || hasMopHandle || hasIronPipe",
        text: "用武器拨开藤蔓",
        nextScene: "三林安居苑-藤蔓丧尸-战斗",
        effect: updateTime(1, {set: {fightWithVineZombie: true}})
      },
      {
        text: "算了，不惹它",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-割藤蔓": {
    image: "images/placeholder.png" /* TODO: images/安居苑/cutVines.png */,
    onEnter: updateTime(2),
    text: "你掏出美工刀，推出刀片，小心地靠近丧尸。它朝着你嗬嗬叫着，但够不到你——藤蔓把它的手臂也缠住了一部分。\n你一刀一刀地割下去。藤蔓又粗又韧，刀刃陷进去发出嘎吱嘎吱的声音。终于，最后一根最粗的藤被割断了。\n丧尸失去了束缚，整个身体从长椅上滑了下来，扑通一声摔在地上。它挣扎着想要站起来，那双灰白的眼睛死死盯着你。\n它的下半身因为长期被缠住已经萎缩了，爬行速度很慢——但你最好还是在它叫来同伴之前解决掉它。",
    choices: [
      {
        showCondition: "hasIronPipe",
        text: "铁管砸头，一击毙命",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        showCondition: "hasCane && !hasIronPipe",
        text: "抡起拐杖，狠狠敲下去",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        showCondition: "hasMopHandle && !hasIronPipe",
        text: "抄起拖把杆，猛地砸过去",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        text: "徒手解决",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(2, { add: { strength: -2 } })
      }
    ]
  },

  "三林安居苑-藤蔓丧尸-战斗": {
    image: "images/placeholder.png" /* TODO: images/安居苑/vineZombieFight.png */,
    text: "你用手中的家伙小心地拨开藤蔓。丧尸的手臂突然挣脱了一截，朝你猛地抓来——还好你早有准备，侧身闪开了。\n藤蔓被你这么一搅，松动了些。丧尸大半个身子都滑了出来，在地上扭动着朝你爬过来。\n不能让它继续叫下去了——附近的猫已经开始骚动了。",
    choices: [
      {
        showCondition: "hasIronPipe",
        text: "铁管一击爆头",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        showCondition: "hasCane && !hasIronPipe",
        text: "抡起拐杖，一击爆头",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        showCondition: "hasMopHandle && !hasIronPipe",
        text: "拖把杆横扫，猛敲过去",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        text: "飞踹一脚",
        nextScene: "三林安居苑-藤蔓丧尸-击杀",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        text: "跑！",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-藤蔓丧尸-击杀": {
    image: "images/placeholder.png" /* TODO: images/安居苑/vineZombieDead.png */,
    onEnter: { set: { positionAfterOperation: "三林安居苑-藤蔓丧尸-击杀" } },
    text: function(vars) {
      var desc = "丧尸终于不动了。你蹲下身，翻开它中山装胸口的口袋。\n里面掉出来一张折叠得整整齐齐的地图——是一张上海市浦东新区的交通图，上面用红笔圈出了几条主要的高架出口和加油站位置。背面还手写着几行小字：\n“沪芦高速 S2 → 临港方向可行”\n“外环 S20 浦东段多处拥堵，建议绕行”\n“加油站：杨高南路、秀浦路、申江路”\n<span style='color: #ffaa00;'>这是一张开车出城的路线图。有了它，你可以规划更远的行程了。</span>";
      if (vars.hasCarKey && !vars.hasCar) {
        desc += "\n你摸了摸口袋里的车钥匙。B12停车位，丰田，沪C·8236K——现在你有了地图，可以试试去找那辆车了。";
      }
      return desc;
    },
    choices: [
      {
        text: "收好地图",
        condition: "itemCount < bagVolume",
        nextScene: "三林安居苑-小区内部",
        effect: { set: { hasMap: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      }
    ]
  },

  "三林安居苑-藤蔓丧尸-被咬": {
    image: "images/placeholder.png" /* TODO: images/安居苑/vineZombieBite.png */,
    text: "你刚把手伸过去，丧尸猛地扭头，一口咬住了你的手腕。\n剧烈的疼痛让你惨叫出声。藤蔓在挣扎中崩断了几根——丧尸挣脱了束缚，而你捂着手腕跌坐在地上，鲜血从指缝间涌出。\n<span style='color: #ff4444;'>你被咬了。</span>",
    onEnter: updateTime(1, { set: { hurtByZombie: true }, add: { strength: -3 } }),
    choices: [
      {
        text: "快走！",
        nextScene: "安居苑前门"
      }
    ]
  },

  // ========== 居民楼 ==========

  "三林安居苑-居民楼": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBuilding.png */,
    onEnter: { set: { currentPos: "居民楼" } },
    text: function(vars) {
      var desc = "";
      if (vars._visit["三林安居苑-居民楼"] <= 1) {
        desc = "你走进居民楼的入口。";
      }
      desc += "楼道里很暗，只有安全出口指示牌发出微弱的绿光。墙上一排信箱锈迹斑斑，好几格的盖子都掉了下来，里面塞着积了灰的广告传单和催缴单。\n\
一楼走道尽头有一户人家的门虚掩着，门缝里透出昏暗的光。楼梯间在右手边，铁扶手已经锈得发黑，墙上贴着褪色的楼层指示牌——这栋楼一共六层。";
      return desc;
    },
    choices: [
      {
        text: "推开一楼那户虚掩的门",
        nextScene: "三林安居苑-居民楼-1楼",
        effect: updateTime(2)
      },
      {
        text: "上楼看看",
        nextScene: "三林安居苑-楼道",
        effect: updateTime(3)
      },
      {
        text: "退出去",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-居民楼-1楼": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBuilding.png */,
    text: function(vars) {
      if(vars._visit["三林安居苑-居民楼-1楼"] > 1) return "客厅的茶几上还放着半杯凉掉的茶，厨房传来断断续续的刮擦声。";
      return "你轻轻推开门。这是一户普通的人家——玄关摆着鞋柜，客厅的茶几上还放着半杯凉掉的茶。\n\
厨房方向传来刮擦声，像是有人在用指甲挠墙。你探头一看：一只老年丧尸正趴在厨房地上，不知道在啃什么。\n\
它的腿似乎断了，无法站立，但双手依然有力。听到脚步声，它转头看向你，呲着牙发出威胁的低吼。\n卧室的门关着——不知道里面有什么。";
    },
    choices: [
      {
        text: "轻轻打开卧室门",
        nextScene: "三林安居苑-卧室",
        effect: updateTime(1)
      },
      {
        text: "去厨房看看有什么物资",
        nextScene: "三林安居苑-厨房",
        condition: "hasCane || hasMopHandle || hasIronPipe",
        elseScene: "三林安居苑-厨房危险"
      },
      {
        text: "不冒险了，退出去",
        nextScene: "三林安居苑-居民楼"
      }
    ]
  },

  // ========== 8号楼（老洪 & 王知筠） ==========

  "三林安居苑-8号楼": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBuilding.png */,
    onEnter: { set: { currentPos: "8号楼" } },
    text: "8号楼的单元门虚掩着——门锁不知什么时候被人撬坏了，锁孔边缘有几道新鲜的划痕。你推开门，楼道里光线昏暗，只有尽头窗户透进来的光照出一道斜长的影子。\n\
左手边是锈蚀的信箱，其中一格上贴着住户标签：203、204。走廊尽头的楼梯拐角处散落着几张报纸，日期停在了6月27日。",
    choices: [
      {
        text: "上二楼看看",
        nextScene: "三林安居苑-8号楼-2楼",
        effect: updateTime(2)
      },
      {
        text: "退出去",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-8号楼-2楼": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan5F.png */,
    onEnter: { set: { currentPos: "8号楼2楼" } },
    text: "你走上二楼。走廊里很安静，只有远处某扇没关好的窗户在风里一下一下地拍打着窗框。\n\
两扇门并排对着：203和204。\n\
203的门关着，门下缝隙透出的光线很暗——里面没人活动的迹象。门把手上落了一层薄灰。\n\
204的门虚掩着，门缝里飘出一股淡淡的甜腻味——说不清是什么，但让你本能地不想多闻。",
    choices: [
      {
        text: "推开204虚掩的门",
        nextScene: "三林安居苑-204室",
        effect: updateTime(1)
      },
      {
        text: "敲203的门——没人应，试着开门",
        nextScene: "三林安居苑-203室",
        effect: updateTime(1)
      },
      {
        text: "下楼",
        nextScene: "三林安居苑-8号楼",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 203室——王知筠的家（空的） =====

  "三林安居苑-203室": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan502.png */,
    onEnter: { set: { positionAfterOperation: "三林安居苑-8号楼-2楼" } },
    text: "203的门没锁——你轻轻一拧就开了。\n\
这是一间普通的一室户。客厅不大，但收拾得很干净。书桌上摊着几本翻开的专业书，页边夹着彩色便签。一台笔记本电脑合着放在桌角，电源指示灯早就暗了。\n\
\n\
地上有一个敞开的双肩包，旁边散落着几根便携采样管和一支记号笔——像是有人匆忙收拾了东西出门，还没来得及拉上拉链。\n\
厨房的水槽里放着一只倒扣的马克杯，杯底残留着一圈干透的咖啡渍。\n\
\n\
人不在。不知道是出去了，还是不会再回来了。",
    choices: [
      {
        text: "离开203",
        nextScene: "三林安居苑-8号楼-2楼",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 204室——老洪 =====

  "三林安居苑-204室": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBuilding.png */,
    onEnter: {set: { _enteredHong204: true }},
    text: function(vars) {
      if (!vars._enteredHong204) {
        return "你轻轻推开门。一股甜腻的、让人不太舒服的气味飘了出来——不是腐败的臭味，而是一种说不清的、带着湿气的甜味。\n\
玄关的鞋柜上放着一串钥匙和一副老花镜。客厅里的家具很简单：一张旧沙发，一个茶几，茶几上放着半杯凉掉的茶。茶几下面的报纸是摊开的——6月27日的《新民晚报》。\n\
\n\
厨房方向传来一声微弱的呻吟——不像攻击性的咆哮，更像是一个人在极度痛苦中无意识发出的声音。\n\
你探头往里看：一个穿着深蓝色工装外套的老人坐在地板上，后背靠着橱柜。他的头微微偏向一侧，脸上沾着灰，嘴唇干裂出了血口子。\n\
他的右腿上缠着一根断掉的电线，另一端连在暖气片上——暖气片的金属表面有几道深深的划痕，像是被什么用力拉扯过。\n\
脚边倒着一只空矿泉水瓶，瓶身上的标签歪歪扭扭写着几个字。桌上摊着一本翻开的笔记本，旁边还放着一个旧防毒面具。\n\
厨房的窗台上，放着你在楼下看到的那只搪瓷缸——白色的，缸身印着褪了色的红字，勉强能认出是“芜湖”和“先进”几个字。缸底残留着一圈干透的茶渍。";
      } else {
        return "204室里那股甜腻味还在，但比上次淡了一些。他还靠在橱柜边——已经不会再动了。\n\
你上次没拿的东西还在原处：窗台上的搪瓷缸、桌子上的旧防毒面具和笔记本，地上的空水瓶。";
      }
    },
    choices: function(vars) {
      var opts = [];

      if (!vars._enteredHong204) {
        opts.push({
          text: "蹲下来查看那个老人",
          nextScene: "三林安居苑-204室-老洪",
          effect: updateTime(1)
        });
      }

      if (!vars._foundHongNotebook) {
        opts.push({
          text: "翻看桌上的笔记本",
          nextScene: "三林安居苑-204室-笔记本",
          effect: updateTime(3)
        });
      }

      if (!vars._foundHongMask) {
        opts.push({
          text: "检查那个旧防毒面具",
          nextScene: "三林安居苑-204室-防毒面具",
          effect: updateTime(1)
        });
      }

      if (!vars._foundHongBottle) {
        opts.push({
          text: "捡起地上的空水瓶",
          nextScene: "三林安居苑-204室-空水瓶",
          effect: updateTime(1)
        });
      }

      if (!vars._foundHongContact) {
        opts.push({
          text: "在屋里翻找一下",
          nextScene: "三林安居苑-204室-翻找",
          effect: updateTime(4)
        });
      }

      // 每次都可以查看暖气片痕迹（环境叙事）
      opts.push({
        text: "查看暖气片上的电线痕迹",
        nextScene: "三林安居苑-204室-电线",
        effect: updateTime(1)
      });

      opts.push({
        text: "离开204",
        nextScene: "三林安居苑-8号楼-2楼",
        effect: updateTime(1)
      });

      return opts;
    }
  },

  "三林安居苑-204室-老洪": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanKitchen.png */,
    onEnter: { add: { strength: -1 } },
    text: "你蹲下身，靠近他。他的眼睛半睁着，眼球在微微颤动——他还活着，但已经说不出完整的话了。\n\
他感觉到有人靠近，嘴唇动了动，发出一串含混的气音。你把耳朵凑近，勉强辨认出几个字：\n\
\n\
<em>“水……别喝……”</em>\n\
<em>“我的工作……”</em>\n\
<em>“我要水……快给我水……水……”</em>\n\
\n\
他的头猛地向后仰了一下，喉咙里发出一阵咯咯声。他的眼神开始涣散——不是死亡，是那根弦彻底断了。\n\
他挣了一下，脚踝上的电线在瓷砖地面上刮出一声刺耳的响。\n\
\n\
你后退了一步。他已经不再是他了。",
    choices: [
      {
        text: "离开厨房",
        nextScene: "三林安居苑-204室",
        effect: updateTime(1)
      }
    ]
  },

  "三林安居苑-204室-空水瓶": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanKitchen.png */,
    onEnter: { set: { _foundHongBottle: true } },
    text: "你捡起那只空矿泉水瓶。普通的农夫山泉瓶，水早就喝干了，瓶底只剩一小洼浑浊的水垢。\n\
瓶身上的标签被人用圆珠笔写了一行字——字迹有点抖，但很用力：\n\
\n\
<em>“芜湖 6.25”</em>\n\
\n\
芜湖。他在6月25日去过芜湖。这瓶水是从芜湖带回来的。",
    choices: [
      {
        text: "放下瓶子",
        nextScene: "三林安居苑-204室"
      }
    ]
  },

  "三林安居苑-204室-笔记本": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanKitchen.png */,
    onEnter: { set: { _foundHongNotebook: true } },
    text: "你翻开那本笔记本。封面是深蓝色的硬壳，边角已经磨得发白。前半本记的是些零碎的巡检记录和阀门编号——“3号碱液泵异响，已报修”“东区蒸汽管道保温层脱落”——后半本的内容变了。\n\
字迹从工整变得潦草，像是人在激动或焦虑时写下的：\n\
\n\
<em>“6/25 封存区被人剪开了。旧电解槽车间门开着，含汞污泥桶泡在水里。地上的水是灰色的，往老排水沟的方向渗。那片沟直通长江。”以后统一处理“——他妈的都十几年了。”</em>\n\
\n\
<em>“6/26 回上海了。自来水味道不对。太像了。”</em>\n\
\n\
<em>“6/27 把接的水放了一夜——水面上有油光。跟当年废水池里那层膜一模一样。不是错觉。”</em>\n\
\n\
<em>“6/28 上午 敲了对门小王的门。她是搞水质检测的。她把那瓶水测了。超标。”</em>\n\
\n\
后面还有一行，字迹明显更抖：\n\
<em>“我早上喝了。”</em>",
    choices: [
      {
        text: "合上笔记本",
        nextScene: "三林安居苑-204室"
      }
    ]
  },

  "三林安居苑-204室-防毒面具": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanKitchen.png */,
    onEnter: { set: { _foundHongMask: true } },
    text: "你拿起那只防毒面具。是上海“新星”牌的过滤式面具，面罩上落了灰，但橡胶没有老化开裂——保养得还行。你翻过来看了看滤罐——标签上的有效期是2024年12月。过期一年多了。\n\
\n\
过期滤罐的过滤效率会下降，但对付一般的刺激性气体可能还能撑一阵——如果运气好的话。你把面具放回桌上。",
    choices: [
      {
        text: "拿上防毒面具",
        condition: "itemCount < bagVolume",
        nextScene: "三林安居苑-204室",
        effect: { set: { hasGasMask: true, _foundHongMask: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "算了，不拿",
        nextScene: "三林安居苑-204室"
      }
    ]
  },

  "三林安居苑-204室-翻找": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBuilding.png */,
    onEnter: { set: { _foundHongContact: true } },
    text: "你在屋里翻了翻。衣柜里挂着几件洗得发白的工作服，抽屉里是些零碎物件——老花镜、布洛芬、半包润喉糖。\n\
你在床头柜的抽屉里找到了一部旧手机。充电插上试试——屏幕亮了起来。通话记录里最近的一个号码标注着“儿子 洪伟”。你拨了过去——长嘟一声，然后忙音。\n\
你又试了一次。还是忙音。\n\
你翻到手机备忘录，看到一条没发出去的短信草稿：\n\
\n\
<em>“伟，爸没事。你在张江那边自己小心。自来水别喝了。”</em>\n\
\n\
发送时间：6/28 14:23。没有发送成功。",
    choices: [
      {
        text: "放下手机",
        nextScene: "三林安居苑-204室"
      }
    ]
  },

  "三林安居苑-204室-电线": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanKitchen.png */,
    text: "你低头看那根电线。是一段普通的铜芯电线，大约两米长，一端紧紧地系在暖气片的铸铁管上，缠了好几圈，打了个死结。另一端缠在他的右腿脚踝上——已经挣断了，断口的铜丝在光下微微反光。\n\
暖气片表面有几道深深的划痕，是金属在金属上反复摩擦留下的。可以想象他在失控时用了多大的力气拉扯。\n\
\n\
他是想把自己锁住。在失去意识之前，他做了最后一件事——绑好自己。",
    choices: [
      {
        text: "查看完毕",
        nextScene: "三林安居苑-204室"
      }
    ]
  },

  "三林安居苑-楼道": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanStairs.png */,
    onEnter: updateTime(2),
    text: "你扶着锈迹斑斑的扶手往上走。楼梯间回荡着空洞的脚步声，每上一层，声控灯就啪地亮起，又在身后啪地熄灭。墙皮大片大片地剥落，露出里面发霉的水泥。\n墙上贴满了小广告——疏通下水道、高价回收旧家电、家教辅导……有些纸张已经发黄卷边，字迹模糊不清。\n二楼、三楼、四楼……你在五楼停下了脚步。",
    choices: [
      {
        text: "继续",
        nextScene: "三林安居苑-5楼"
      }
    ]
  },

  "三林安居苑-5楼": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan5F.png */,
    onEnter: { set: { currentPos: "居民楼" } },
    text: "五楼的走廊安静得有些压抑。地上铺着老式的黑白格子瓷砖，有几块已经裂成了蛛网状。并排三扇门：501、502、503，门牌号是那种老式的塑料字，502的“2”已经歪了。\n502的门上贴着一张褪色的福字，边缘翘起，纸面发脆。门把手上落了一层薄灰——这扇门很久没人动过了。",
    choices: [
      {
        text: "试着打开502的门",
        condition: "hasKey502",
        nextScene: "三林安居苑-502",
        effect: updateTime(1, { set: { findKey502: true } }),
        elseScene: "三林安居苑-5楼-门锁了"
      },
      {
        text: "下楼",
        nextScene: "三林安居苑-楼道",
        effect: updateTime(2)
      }
    ]
  },

  "三林安居苑-5楼-门锁了": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan5F.png */,
    text: "你握住门把手用力拧了一下——锁死了，纹丝不动。看来需要找到钥匙才行。",
    choices: [
      {
        text: "下楼",
        nextScene: "三林安居苑-楼道"
      }
    ]
  },

  // ========== 502室内部 ==========

  "三林安居苑-502": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan502.png */,
    onEnter: { set: { currentPos: "502室" } },
    text: "钥匙在锁孔里转动了一圈，咔嗒一声，门开了。\n屋里很暗，窗帘紧拉着，只有一道细缝透进外面昏黄的光线。这间屋子已经很久没人住过了。玄关的鞋架上还摆着几双拖鞋，整整齐齐，仿佛主人只是出了趟远门。地板积了一层薄灰，但墙角隐约可见几个小小的爪印——大概是老鼠留下的。\n客厅的窗帘紧紧拉着，只有一道细缝透进外面昏黄的光线。家具上盖着白布，在昏暗的光线里像几座沉默的雕塑。",
    choices: [
      {
        text: "去厨房",
        nextScene: "三林安居苑-502-厨房",
        effect: updateTime(2)
      },
      {
        text: "去客厅",
        nextScene: "三林安居苑-502-客厅",
        effect: updateTime(2)
      },
      {
        text: "去阳台",
        nextScene: "三林安居苑-502-阳台",
        effect: updateTime(1)
      },
      {
        text: "去小卧室",
        nextScene: "三林安居苑-502-小卧室",
        effect: updateTime(2)
      },
      {
        text: "离开502",
        nextScene: "三林安居苑-5楼"
      }
    ]
  },

  "三林安居苑-502-厨房": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan502Kitchen.png */,
    text: "厨房不大，但收拾得很整齐。灶台上盖着一层塑料布，掀开一看，下面的煤气灶还是老式双头灶，打火旋钮已经有些松了。\n橱柜里基本空了，只剩几包过期的盐、一瓶结了块的酱油，还有半袋早已硬成石头的白砂糖。冰箱的门虚掩着，里面黑漆漆的，门缝里渗出一阵冰凉的冷气——你赶紧把门关上了。\n水槽上方的窗户正对着小区花园。透过玻璃，你能看到那几只变异猫还在花坛边踱来踱去，眼睛里泛着幽幽的绿光。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "三林安居苑-502"
      }
    ]
  },

  "三林安居苑-502-客厅": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan502Livingroom.png */,
    text: "客厅不算大，沙发和茶几都被白布盖着，像几座沉默的雕塑。墙角立着一台老式显像管电视机，屏幕上的灰厚得能写字。电视柜的抽屉拉开了一半，里面散落着几盘VCD——《大话西游》《少林足球》，都是零几年的老片子。\n茶几上放着一个玻璃烟灰缸，里面的烟蒂早已干透发黄。墙上挂着一幅泛黄的十字绣，红线绣着“家和万事兴”，左下角还绣了一行小字：“2008.5.1 妈妈”。\n沙发旁的边几上立着一个木质相框，照片里是一对中年夫妻和一个小男孩，在天安门前笑得灿烂。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "三林安居苑-502"
      }
    ]
  },

  "三林安居苑-502-阳台": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan502Balcony.png */,
    text: "阳台的防盗网已经锈迹斑斑，但依然坚固。站在这里，几乎能看到整个安居苑的全貌——中间的小花园、下沉式广场、还有远处安盛街模糊的天际线。\n晾衣架上还挂着一件褪色的蓝色T恤，被风吹日晒得几乎一碰就要碎成布片。角落里堆着几个空花盆，泥土已经干裂，一株不知名的枯枝倔强地立在最大的那个花盆中央。\n楼下远处有几只丧尸在漫无目的地游荡，暂时还没注意到五楼阳台上的你。风很大，吹得晾衣架轻轻晃动，发出吱呀吱呀的声音。",
    choices: [
      {
        text: "回到客厅",
        nextScene: "三林安居苑-502"
      }
    ]
  },

  "三林安居苑-502-小卧室": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuan502SmallBedroom.png */,
    onEnter: function(vars) {
      vars.personalMemorySet.add("忘记搬家的松鼠");
      return {};
    },
    text: function(vars) {
      let desc = "小卧室很小，只放得下一张单人床和一张旧书桌。\n\
书桌上放着一盏小台灯，旁边是一个空的笔筒，里面插着几支没水的圆珠笔。你拉开书桌的抽屉，里面有几本旧作业本，封面上用歪歪扭扭的字写着小学四年级。\n\
床上的被子叠得整整齐齐，枕头边放着一本《查理九世》。";
      if (!vars.personalMemorySet.has("忘记搬家的松鼠")) {
        desc += "\n你蹲下身，往床底看了一眼。\n\
角落里躺着一个毛绒玩具——是一只冰河世纪风格的松鼠，抱着一颗橡果。它的毛已经有些打结了，灰扑扑的，但你还是一眼就认出了它。\n\
这是你小时候最喜欢的玩具。你叫它<em>小斯克莱特</em>，每天晚上都要抱着它才能睡着。搬家的那天，你翻遍了所有箱子都没找到它，最后在妈妈的催促下哭着上了搬家公司的车。\n\
原来它一直在这里，在这张旧床底下，安静地等了你这么多年。\n\
你把它捡起来，拍了拍灰，放在了书桌上。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得记忆[忘记搬家的松鼠]——有些东西你以为永远丢了，其实它一直在原地等你。</span>";
      } else {
        desc += "\n床底下空空荡荡，只剩一层灰和一颗掉落的纽扣。";
      }
      return desc;
    },
    choices: [
      {
        text: "回到走廊",
        nextScene: "三林安居苑-502"
      }
    ]
  },

  "三林安居苑-卧室": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBedroom.png */,
    text: "你轻轻转动门把手，推开卧室门。\n房间里出乎意料地整洁。床上叠着整齐的被子，书桌上放着一台关机的笔记本电脑和几张照片。\n衣柜打开着，里面有几件换洗的衣物。",
    choices: [
      {
        text: "快速翻一下抽屉",
        effect: updateTime(3),
        nextScene: "三林安居苑-卧室-快速"
      },
      {
        showCondition: "itemCount < bagVolume",
        text: "仔细搜查房间",
        effect: updateTime(15),
        nextScene: "三林安居苑-卧室-仔细"
      },
      {
        text: "不拿了，离开",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-卧室-快速": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBedroom.png */,
    onEnter: { set: { positionAfterOperation: "三林安居苑-卧室-快速" } },
    text: "你拉开书桌的抽屉——一个应急手电筒，还有电。你抓起来塞进口袋，转身就走。衣柜里似乎还有东西，但你不想在这个房间里多待了。",
    choices: [
      {
        showCondition: "!hasTorch",
        text: "拿上手电筒离开",
        condition: "itemCount < bagVolume",
        nextScene: "三林安居苑-小区内部",
        effect: updateTime(1, { set: { hasTorch: true }, add: { itemCount: 1 } }),
        elseScene: "整理整理"
      },
      {
        text: "算了，空手走",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-卧室-仔细": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanBedroom.png */,
    onEnter: { set: { hurtByZombie: false, positionAfterOperation: "三林安居苑-卧室-仔细" } },
    text: "你开始系统地搜索这个房间。书桌抽屉里有一个应急手电筒，还能亮。床头柜里翻出一瓶碘伏消毒液。衣柜顶上还塞着一个旧帆布包——可惜是空的。\n你把有用的东西都收好了。",
    choices: [
      {
        showCondition: "!hasTorch",
        text: "拿上手电筒",
        condition: "itemCount < bagVolume",
        nextScene: "三林安居苑-卧室-仔细",
        effect: updateTime(1, { set: { hasTorch: true }, add: { itemCount: 1 } }),
        elseScene: "整理整理"
      },
      {
        showCondition: "!hasBag",
        text: "拿上帆布包",
        nextScene: "三林安居苑-卧室-仔细",
        effect: {set: {hasBag: true}, add: {bagVolume: 1}}
      },
      {
        text: "离开",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

"三林安居苑-厨房": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanKitchen.png */,
    onEnter: updateTime(5, { add: { strength: 1 } }),
    text: "你握着武器靠近厨房。那只丧尸试图爬过来抓你，被你一棍子敲翻在地。\n你打开橱柜——里面还有几包没开封的挂面和一瓶食用油。虽然面条没法生吃，但你发现料理台上还有半箱矿泉水，以及几罐八宝粥。\n\
你打开一罐八宝粥喝了个精光。甜腻的味道让你想起小时候的早餐，但此刻它是你吃过最好吃的东西。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "离开",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-厨房危险": {
    image: "images/placeholder.png" /* TODO: images/安居苑/anJuYuanKitchenDanger.png */,
    text: "你小心翼翼地靠近厨房。地上那只丧尸看到你，猛地一扑——它的手臂比你想象中要长。\n你躲闪不及，被它抓住了脚踝。你奋力挣扎，但它咬住了你的小腿。\n剧烈的疼痛让你惨叫出声，而你的叫声又引来了小区里其他潜伏的东西……",
    onEnter: { set: { hurtByZombie: true }, add: { strength: -3 } }
  },

  "三林安居苑-自行车": {
    image: "images/placeholder.png" /* TODO: images/安居苑/rustyBike.png */,
    text: "你走到那辆自行车前。这是一辆老式的永久牌自行车，链条看起来有点生锈了，轮胎也瘪了。\n不过，车身上贴着一张褪色的贴纸：“防锈润滑 WD-40 已保养”\
——日期是两周前，看来外表寒碜。",
    choices: [
      {
        showCondition: "hasNoTransportation",
        text: "试试骑一下",
        condition: "hasLubricant",
        nextScene: "三林安居苑-喜提新车",
        effect: {set: {hasLubricant: false, hasRustyBike: true}, add: {itemCount: -1}}, // 注意自行车不占背包容量
        elseScene: "三林安居苑-骑车失败"
      },
      {
        showCondition: "!hasNoTransportation",
        text: "先丢下已有的车",
        nextScene: "整理整理",
        effect: {set: {positionAfterOperation: "三林安居苑-自行车"}}
      },
      {
        text: "算了",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-喜提新车": {
    image: "images/placeholder.png" /* TODO: images/安居苑/gainNewBike.png */,
    text: "你拿出润滑油擦拭了一下链条，骑上去试了试。嗯，手感还不错，看来可以加快点速度了",
    choices: [
      {
        text: "离开这里",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "三林安居苑-骑车失败": {
    image: "images/placeholder.png" /* TODO: images/安居苑/rustyBike.png */,
    text: "你跨上自行车，用力踩下踏板。链条发出刺耳的嘎吱声——车轮勉强转了一圈，然后卡住了。\n\
链条锈得太厉害了，没有润滑油根本没法正常骑行。也许在什么地方能找到防锈液……你记得三林路那边好像有家五金店。",
    choices: [
      {
        text: "继续",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  "安居苑前门": {
    image: function(vars) {
      if (vars.weather === "雨") {
        var f = timeImage({
          morning: "images/placeholder.png",
          evening: "images/placeholder.png",
          night: "images/placeholder.png",
          midnight: "images/placeholder.png"
        });
        return f(vars);
      }
      return "images/placeholder.png";
    }, /* TODO: images/安居苑/anjuyuanFrontDoor.png */
    onEnter: function(vars) { applyWeatherDrain(vars); },
    text: function(vars) { return "你来到了安居苑的前门\n" + describeWeather(vars); },
    choices: [
      {
        text: "离开这里",
        nextScene: "三林路"
      },
      {
        text: "进去",
        nextScene: "三林安居苑-小区内部"
      }
    ]
  },

  // ========== 躲藏场景（安居苑区域） ==========

  "三林安居苑-躲藏": hideOnLocation("images/placeholder.png" /* TODO: images/安居苑/anJuYuan.png */,
    "你绕到门卫亭的窗台下蹲着，但一只丧尸慢悠悠地踱了过来——它似乎对墙角感兴趣。它看到了你，扑了过来。你侧身躲开，头也不回地跑了。",
    "你绕到门卫亭的窗台下，蹲在死角里。铁皮墙壁隔音效果不错，外面的声音变得闷闷的。你蜷缩着，等那些拖沓的脚步声都走远了，才站起来。"),
  "三林安居苑-小区内部-躲藏": hideOnLocation("images/placeholder.png" /* TODO: images/安居苑/anJuYuanInside.png */,
    "你钻进花坛的灌木丛深处。但枝条沙沙作响——一只变异猫正在灌木丛里穿梭。它没发现你，但它的动静引得一只丧尸朝这边走来。你只能从另一侧钻出来，换了个地方。",
    "你钻进花坛的灌木丛深处。枝条和叶片把你完全遮住了。透过叶缝你能看到丧尸在小区里游荡，但它们没有注意到这片浓密的绿植。等小区重新安静下来，你才从灌木中钻出。"),
});
