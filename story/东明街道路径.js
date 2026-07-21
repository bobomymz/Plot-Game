// -------- 社区连接 --------
// 主要记录小区附近街区各个场所的道路连接关系

Object.assign(storyData, {
  "小区东门-整装待发": { // 此时时间；Day1 12:00
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png";
      var f = timeImage({
        morning: "images/home/小区东门.png",
        evening: "images/home/小区东门-evening.png",
        night: "images/home/小区东门-night.png",
        midnight: "images/home/小区东门-midnight.png"
      });
      return f(vars);
    },
    onEnter: function(vars) { applyWeatherDrain(vars); },
    text: function(vars) {
      return "你四处张望。\n远处有不少丧尸在游荡。紧挨着小区的门是一个全家便利店，你经常在那里买早餐。\n\
你向身旁看去，那里有一辆你初中时常坐的公交车，此刻就像一头休憩的野兽，静静蹲守在一个公交站台旁。\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
// 真实地名为环林东路樱桃苑东门
    choices: [
      {
        showCondition: "!_visit['全家便利店（环林东路）']",
        text: "去便利店",
        nextScene: "全家便利店（环林东路）"
      },
      {
        showCondition: "_visit['全家便利店（环林东路）'] > 0",
        text: "再去便利店看看",
        nextScene: "全家便利店（环林东路）",
        effect: updateTime(1)
      },
      {
        text: "去公交车站",
        nextScene: "公交车站（环林东路）"
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲到保安亭后面",
        nextScene: "小区东门-整装待发-躲藏"
      },
      sprintAway(["全家便利店（环林东路）", "公交车站（环林东路）"])
    ]
  },

  "小区西门-整装待发": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png";
      var f = timeImage({
        morning: "images/home/小区西门.png",
        evening: "images/home/小区西门-evening.png",
        night: "images/home/小区西门-night.png",
        midnight: "images/home/小区西门-midnight.png"
      });
      return f(vars);
    },
    onEnter: function(vars) { applyWeatherDrain(vars); },
    text: function(vars) { return "你整理好东西，准备出发了。" + describeWeather(vars); },
    choices: [
      {
        text: "继续",
        nextScene: "东明路-三林路"
      }
    ]
  },


  "三林路-环林东路 十字路口": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png";
      var f = timeImage({
        morning: "images/小区周边/十字路口.png",
        evening: "images/小区周边/十字路口-evening.png",
        night: "images/小区周边/十字路口-night.png",
        midnight: "images/小区周边/十字路口-midnight.png"
      });
      return f(vars);
    },
    onEnter: function(vars) {
      vars.currentArea = "周边社区";
      vars.currentPlace = "十字路口";
      vars.currentPos = "十字路口";
      applyWeatherDrain(vars);
    },
    qte: {
      timeout: "10000 - chasedByZombies * 2000", // 尸潮越猛，限时越短
      onTimeout: "结局-丧尸的围殴"
    },
    text: function(vars) {
      return "你来到了一个十字路口，你需要选择前进的方向。快点选哦，周围的丧尸就要围拢过来了。\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "左转",
        nextScene: "杨高南路高架",
        effect: updateTime(20)
      },
      {
        text: "右转",
        nextScene: "三林路",
        effect: updateTime(10)
      },
      {
        text: "直行",
        nextScene: "安盛街东侧",
        effect: updateTime(7)
      },
      {
        text: "掉头回小区东门",
        nextScene: "小区东门-整装待发",
        effect: updateTime(5)
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲到废弃面包车后面",
        nextScene: "三林路-环林东路十字路口-躲藏"
      },
      sprintAway(["三林路", "安盛街东侧"])
    ]
  },

  "三林路": {
    image: function(vars) { return vars.weather === "雨" ? "images/placeholder.png" : "images/placeholder.png"; }, /* TODO: images/小区周边/三林路.png */
    onEnter: function(vars) {
      vars.currentPlace = "三林路";
      vars.currentPos = "三林路";
      applyWeatherDrain(vars);
    },
    qte: {
      timeout: "10000 - chasedByZombies * 1000",
      onTimeout: "结局-丧尸的围殴"
    },
    text: function(vars) {
      return "你来到了三林路。这里有你童年时住过的老小区，益丰大药房、建设银行、联华超市等。\n你需要选择去哪里。\n快选哦，周围的丧尸就要围拢过来了。\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "往西走",
        nextScene: "三林路-东明路 十字路口",
        effect: updateTime(10)
      },
      {
        text: "往东走",
        nextScene: "三林路-环林东路 十字路口",
        effect: updateTime(10)
      },
      {
        text: "去老小区",
        nextScene: "安居苑前门",
        effect: updateTime(4)
      },
      {
        text: "去药店",
        nextScene: "益丰大药房",
        effect: updateTime(6)
      },
      {
        text: "去银行",
        nextScene: "银行门口",
        effect: updateTime(4)
      },
      {
        text: "去小超市",
        nextScene: "小超市",
        effect: updateTime(2)
      },
      {
        text: "去五金店",
        nextScene: "五金店",
        effect: updateTime(4)
      },
      {
        text: "查看旁边那辆轿车",
        condition: "hasCarKey",
        nextScene: "三林路-获得一辆轿车", // 后续剧情：离开东明街道。不会反复来到这里，所以不需要前置showCondition
        effect: updateTime(1),
        elseScene: "三林路-轿车门锁了"
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲进路边门廊深处",
        nextScene: "三林路-躲藏"
      },
      sprintAway(["三林路-环林东路 十字路口", "三林路-东明路 十字路口", "安居苑前门", "五金店"])
    ]
  },

  "三林路-东明路 十字路口": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png";
      var f = timeImage({
        morning: "images/小区周边/十字路口2.png",
        evening: "images/小区周边/十字路口2-evening.png",
        night: "images/小区周边/十字路口2-night.png",
        midnight: "images/小区周边/十字路口2-midnight.png"
      });
      return f(vars);
    },
    onEnter: function(vars) {
      vars.currentArea = "周边社区";
      vars.currentPlace = "十字路口";
      vars.currentPos = "十字路口";
      applyWeatherDrain(vars);
    },
    qte: {
      timeout: "8000 - chasedByZombies * 1000",
      onTimeout: "结局-丧尸的围殴"
    },
    text: function(vars) {
      return "你来到了一个十字路口。西边通向金谊广场，南边通向新达汇，它们都是大商场，可能有丰富的物资；北面是东明路，东面是三林路。\n你需要选择前进的方向。\n\
快选哦，周围的丧尸就要围拢过来了。\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "金谊广场",
        nextScene: "金谊广场-龙头区",
        effect: updateTime(30)
      },
      {
        text: "新达汇",
        nextScene: "新达汇-喷泉广场",
        effect: updateTime(20)
      },
      {
        text: "东明路",
        nextScene: "东明路-三林路",
        effect: updateTime(10)
      },
      {
        text: "三林路",
        nextScene: "三林路",
        effect: updateTime(10)
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲到配电箱后面",
        nextScene: "三林路-东明路十字路口-躲藏"
      },
      sprintAway(["东明路-三林路", "三林路"])
    ]
  },

  "三林路-获得一辆轿车": {
    image: "images/placeholder.png" /* TODO: images/小区周边/轿车.png */,
    onEnter: {set: {hasCar: true, hasEbike: false, hasRustyBike: false}, add:{chasedByZombies: -1}}, // 躲进车里稍微安全一点，尸潮减弱
    text: function(vars) {
      let basicDes = "你成功地获得了一辆丰田轿车，你可以使用它来快速前往其他地方，如果不堵车的话。\n";
      basicDes += describeZombieWave(vars);
      if(vars.hasEbike) basicDes += "你放弃了电瓶车，快速坐上了驾驶座。";
      if(vars.hasRustyBike) basicDes += "你放弃了自行车，快速坐上了驾驶座";
      // 拿到轿车自动放弃其他交通工具，包括电瓶车和自行车
      return basicDes;
    },
    choices: [
      // 选择前往的地点，但需要地图才能解锁较远的地方，不然会被丧尸包围
    ]
  },

  "三林路-轿车门锁了": {
    image: "images/placeholder.png" /* TODO: images/小区周边/轿车.png */,
    onEnter: updateTime(2), 
    text: function(vars) {
      return "你走近那辆丰田的车，使劲拉了拉车门，它纹丝不动。你狠狠用肘部砸了下车窗，手臂生疼，但玻璃看起来质量还挺好的。看来你需要找其他方式来打开车门。\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "继续",
        nextScene: "三林路"
      }
    ]
  },

  "东明路-三林路": {
    image: function(vars) { return vars.weather === "雨" ? "images/placeholder.png" : "images/小区周边/东明路-三林路.png"; },
    onEnter: function(vars) {
      vars.currentArea = "周边社区";
      vars.currentPlace = "东明路";
      vars.currentPos = "东明路";
      applyWeatherDrain(vars);
    },
    qte: {
      timeout: "8000 - chasedByZombies * 2000",
      onTimeout: "结局-丧尸的围殴"
    },
    text: function(vars) {
      return "你来到了东明路上。这里有很多丧尸，你需要快点做出选择。\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "去十字路口",
        nextScene: "三林路-东明路 十字路口",
        effect: updateTime(2)
      },
      {
        text: "去图书馆",
        nextScene: "图书馆",
        effect: updateTime(6)
      },
      {
        text: "往北走去学校",
        nextScene: "上实南校门口",
        effect: updateTime(20)
      },
      {
        text: "去地铁站",
        nextScene: "11号线-三林东路站",
        effect: updateTime(10)
      },
      {
        showCondition: "chasedByZombies > 1",
        text: "躲到大树后面",
        nextScene: "东明路-三林路-躲藏"
      },
      sprintAway(["三林路-东明路 十字路口", "图书馆", "上实南校门口", "11号线-三林东路站"])
    ]
  },

  "结局-丧尸的围殴": {
    image: "images/zombiesBeatYou.png",
    text: "你反应太慢啦，被丧尸围殴至死。\n\
想 必 下 次 你 会 快 点 选 吧 ~\n\
—— 结局：丧尸的围殴 ——"
  },


  // ==================== 建设银行 ====================
  "银行门口": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png";
      var f = timeImage({
        morning: "images/小区周边/银行门口-morning.png",
        evening: "images/小区周边/银行门口-evening.png",
        night: "images/小区周边/银行门口-night.png",
        midnight: "images/小区周边/银行门口-midnight.png",
      });
      return f(vars);
    },
    onEnter: function(vars) {
      vars.currentPlace = "三林路";
      vars.currentPos = "银行";
      applyWeatherDrain(vars);
    },
    text: function(vars) { return "你来到了建设银行门口。这是你办第一张储蓄卡的地方，你把自己的压岁钱存了2年定期，但是1年就取出来了，只有活期的利率。不过，本来也没多少钱。\n\
如果你带卡了，或许可以去ATM机里掏出一些钱来————不过，这末世里钱有什么用？" + describeWeather(vars); },
    choices: [
      {
        text: "进入银行",
        nextScene: "银行内部",
        effect: updateTime(1)
      },
      {
        text: "离开",
        nextScene: "三林路"
      }
    ]
  },

  "银行内部": {
    image: "images/placeholder.png" /* TODO: images/小区周边/constructionBank.png */,
    onEnter: { set: { currentPlace: "三林路", currentPos: "银行" } },
    text: "你推开银行的玻璃门。大厅里一片狼藉——叫号机倒在地上，宣传单页撒了一地，几盆绿植被打翻，泥土和碎瓷片混合在一起。\n\
ATM机被砸开了，屏幕碎裂，里面空空如也——这时候钱也没什么用了，为什么有人会抢呢？他们真觉得自己能逃出上海啊。\n\
保安室的门半开着，里面似乎有什么东西在动……好像只是树叶的影子。",
    choices: [
      {
        text: "查看保安室",
        nextScene: "银行-保安室",
        effect: updateTime(1)
      },
      {
        text: "查看金库",
        nextScene: "银行-金库",
        effect: updateTime(1)
      },
      {
        text: "翻看地上散落的单据",
        condition: "!hasBankSlip",
        nextScene: "银行-存款凭条",
        effect: updateTime(1),
        elseScene: "地上剩下的单据都已经被踩烂了，什么也看不清。"
      },
      {
        text: "没什么值得留的，离开",
        nextScene: "三林路"
      }
    ]
  },

  "银行-保安室": {
    image: "images/placeholder.png" /* TODO: images/小区周边/bankSecurityRoom.png */,
    text: "你探头往保安室里看。一个穿着保安制服的丧尸被卡在办公椅和墙壁之间，一条腿被椅腿别住了，正徒劳地蹬着地面，发出吱——吱——的摩擦声。它看到你，伸出手臂徒劳地抓挠，但够不到你。\n\
办公桌上有一瓶没开封的矿泉水，在日光灯下反射着微光。",
    choices: [
      {
        text: "绕过它去拿水",
        nextScene: "银行-拿水",
        effect: updateTime(2)
      },
      {
        text: "太危险了，走吧",
        nextScene: "三林路"
      }
    ]
  },

  "银行-拿水": {
    image: "images/placeholder.png" /* TODO: images/小区周边/bankSecurityRoom.png */,
    onEnter: { add: { strength: 1 } },
    text: "你贴着墙壁，小心翼翼地绕到办公桌旁。保安丧尸在你身后徒劳地嘶吼着，但你够到了那瓶水。\n\
拧开瓶盖灌了几口，清凉的液体顺着喉咙滑下去——在这种天气里，一瓶干净的水比什么都珍贵。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>\n\
你转头看向那只丧尸，它正努力地向你移动。“你叫什么名字啊？”耳边只传来虚弱的嘶吼声。”知道你不会说话。好吧，拜拜了。“\n\
你绕过挣扎的保安，退出了银行。",
    choices: [
      {
        text: "继续",
        nextScene: "三林路",
        effect: updateTime(3)
      }
    ]
  },

  "银行-金库": {
    image: "images/placeholder.png" /* TODO: images/小区周边/bankVault.png */,
    text: "你走到银行深处。一道巨大的金库门矗立在面前，银灰色的金属表面反射着冰冷的光。\n门上的电子锁显示屏是暗的——没电了。你把耳朵贴到门上听了听，里面没有任何声音。\n你用力拉了拉把手，纹丝不动。这种级别的金库，没有专业设备根本打不开。不过……如果哪天能通上电，也许还能回来试试。\n你在心里记下了这个位置。",
    choices: [
      {
        text: "回去",
        nextScene: "三林路"
      }
    ]
  },

  "银行-存款凭条": {
    image: "images/placeholder.png" /* TODO: images/小区周边/constructionBank.png */,
    onEnter: { set: { hasBankSlip: true } },
    text: "你蹲下来，从满地的宣传单页和碎纸中捡起一张还算完整的单据。\n\
是一张建设银行的存款凭条——大概是6月28日上午柜台上还没来得及收起来的。\n\n\
<div style=“border-left: 3px solid #8B7355; padding-left: 14px; margin: 14px 0; font-family: 'Courier New', monospace; color: #c0c0c0; font-size: 14px; line-height: 1.8;”>\n\
━━━ 中国建设银行 · 存款凭条 ━━━<br>\n\
<br>\n\
网点：环林东路支行<br>\n\
日期：2026/06/28  09:37<br>\n\
柜员：3127<br>\n\
户名：周启明<br>\n\
金额：¥860.00<br>\n\
━━━━━━━━━━━━━━━━━━<br>\n\
</div>\n\n\
860块——大概是一个小店主三四天的流水。\n\
你把凭条叠好塞进口袋，虽然也不知道留着还有什么用。",
    choices: [
      {
        text: "继续探索银行",
        nextScene: "银行内部"
      },
      {
        text: "离开银行",
        nextScene: "三林路"
      }
    ]
  },

  // ==================== 联华超市 ====================
  "小超市": {
    image: "images/placeholder.png" /* TODO: images/小区周边/lianhuaSupermarket.png */,
    onEnter: { set: { currentPlace: "三林路", currentPos: "联华超市" } },
    text: "你走进联华超市。货架上东西不多，但比起那些被扫荡一空的店铺，这里还算有些存货——几包方便面、几瓶矿泉水、几袋饼干散落在货架上。\n超市不大，一眼就能看到头。后面有一个挂着“仓库重地”牌子的门，门虚掩着。",
    choices: [
      {
        text: "吃点东西补充体力",
        showCondition: "!_supermarketSuppliesTaken",
        nextScene: "联华超市-补给",
        effect: updateTime(5)
      },
      {
        text: "推开仓库的门看看",
        nextScene: "联华超市-仓库",
        effect: updateTime(1)
      },
      {
        text: "离开",
        nextScene: "三林路"
      }
    ]
  },

  "联华超市-补给": {
    image: "images/placeholder.png" /* TODO: images/小区周边/lianhuaSupermarket.png */,
    onEnter: { add: { strength: 1 }, set: { _supermarketSuppliesTaken: true } },
    text: "你撕开一包饼干，就着矿泉水吃了下去。虽然不是什么大餐，但在这种时候，能吃饱就是幸福。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "继续",
        nextScene: "三林路",
        effect: updateTime(5)
      }
    ]
  },

  "联华超市-仓库": {
    image: "images/placeholder.png" /* TODO: images/小区周边/supermarketWarehouse.png */,
    text: function(vars) {
      var desc = "仓库里堆着几箱饮料和一些滞销的零食。角落里有一扇活板门。";
      if (vars._supermarketCompromised) desc += "铁栓已经被撬开了，门板歪在一边——下面的地下室已经暴露了，不再安全。";
      else desc += "上面焊着一根铁栓——通往地下室。这是个干燥隐蔽的空间，万一晚上没地方去，这里也许能凑合一晚。";
      return desc;
    },
    choices: [
      {
        text: "记下这个位置，离开",
        nextScene: "三林路"
      },
      {
        showCondition: "hasIronPipe",
        text: "用手电筒照了照角落，发现一扇锈蚀的铁栅栏门——用铁管试试能不能撬开",
        nextScene: "联华超市-地下室-撬锁"
      }
    ]
  },

  // ========== 躲藏场景（东明街道区域） ==========

  "小区东门-整装待发-躲藏": hideOnLocation("images/placeholder.png" /* TODO: images/home/eastGate.png */,
    "你绕到保安亭的背面蹲下，但一群丧尸漫无目的地游荡过来，把保安亭围住了。它们没有发现你，但你也出不去了——你被困了十多分钟，最后只能趁它们稍微散开时冲出去。慌乱中你被一只丧尸抓了一下。",
    "你绕到保安亭的背面，蹲在墙根和灌木丛之间的空隙里。保安亭的玻璃上映着远处丧尸摇晃的影子，但它们看不见你。\n你等了不知多久，外面的声音渐渐稀疏了。你探出头，街道上已经空了不少。"),
  "三林路-环林东路十字路口-躲藏": hideOnLocation("images/小区周边/十字路口.png",
    "你蹲在一辆被追尾的面包车后面，但一队丧尸挤挤挨挨地从车旁经过，其中一只撞到了侧视镜——啪地一声。它被声音吸引，摇摇晃晃绕到了车后……你只能一脚踹开它夺路而逃。",
    "你蹲在一辆被追尾的面包车后面，透过破碎的车窗观察着路口。丧尸群在你刚才站的地方徘徊了一会儿，然后朝不同的方向散去了。你等了一刻钟，确认安全后才站起来。"),
  "三林路-躲藏": hideOnLocation("images/placeholder.png" /* TODO: images/小区周边/三林路.png */,
    "你闪进一家门锁坏掉的小店门廊深处，缩在黑暗里。但今天运气不好——一队丧尸直接朝你这边涌来。它们不是发现了你，只是恰好走了这条路……狭小的门廊无处可躲，你只能冲出去。",
    "你闪进一家门锁坏掉的小店门廊深处，缩在黑暗里。外面的脚步声来来回回，但没人注意到这个凹陷处。过了不知多久，声音远去了。你活动了一下发麻的腿，走了出来。街道安静了许多。"),
  "三林路-东明路十字路口-躲藏": hideOnLocation("images/小区周边/十字路口2.png",
    "你蜷缩在路口配电箱和绿化带的夹缝里。但一只丧尸晃晃悠悠走到配电箱旁就不动了——它就一直站在那里。你等了很久它还是不走，夹缝里又闷又窄。你只能冒险冲出去。",
    "你蜷缩在路口配电箱和绿化带的夹缝里，用枝叶盖住自己。一只丧尸走到配电箱旁，离你伸手可及，但它没有低头看。它站了一会儿，慢悠悠地走了。你等一切安静后才钻出来。"),
  "东明路-三林路-躲藏": hideOnLocation("images/placeholder.png" /* TODO: images/小区周边/东明路-小区西门门口.png */,
    "你蹲在一棵粗大的法国梧桐后面，但尸群太密集了——它们像潮水一样涌过，树干根本挡不住你。你只能提前暴露，在丧尸反应过来之前冲出去。慌乱中你被一根树枝绊了一下，擦伤了手臂。",
    "你蹲在一棵粗大的法国梧桐后面。树干的阴影把你完全吞没了。几只丧尸拖沓着经过，其中一只在树干上蹭了蹭背，然后慢悠悠地走开了。你屏住呼吸等它们走远，才从树后探出头。"),
});