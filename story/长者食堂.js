Object.assign(storyData, {
  "长者食堂": {
    image: timeImage({
      morning: "images/小区周边/长者食堂/门口.jpg",
      night: "images/小区周边/长者食堂/门口-night.jpg"
    }),
    onEnter: function(vars) {
      vars.showRain = true;
      vars.currentPlace = "长者食堂"; // 记录当前位置，用于限制某些选项的触发地点（如食堂WiFi看消息）
      // 只在首次进入时记录计时起点，避免回到门口重设计时
      if (vars._cafeteriaEnterMinute === -1) {
        vars._cafeteriaEnterMinute = vars.gameMinutes;
      }
      return {};
    },
    text: function(vars) {
      return "你来到了东明社区食堂。平时偶尔回来这里吃一次，饭菜也挺好的，经常能看到老年人来吃。现在这里已经空了。" + describeWeather(vars);
    },
    choices: [
      {
        text: "离开",
        nextScene: "三林路-东明路 十字路口",
        effect: updateTime(1)
      },
      {
        text: "关门",
        nextScene: "长者食堂-关门"
      },
      {
        text: "坐在椅子上休息一会儿",
        condition: "weather == '雨'", // 只有在雨天休息才会挂
        nextScene: "结局-闭目养神",
        elseScene: "长者食堂-休息"
      },
      {
        text: "看看门口那台刷脸签到机",
        nextScene: "长者食堂-签到机",
        effect: updateTime(1)
      }
    ]
  },

  "结局-闭目养神": {
    image: "images/zombiePounceOnYou.jpg",
    text: "你闭目养神，休息了一会儿。门外的雨声淅沥淅沥，在这末世下似乎是唯一的慰藉。\n\
你感觉到一丝不安。\n\
睁开眼，一只红眼的丧尸向你扑了过来。\n\
—— 结局：闭目养神 —— "
  },

  "长者食堂-休息": {
    image: "images/小区周边/长者食堂/坐在地上.png",
    onEnter: updateTime(5, { add: { strength: 1 }, set: { _travelMinutes: 0 } }),
    text: function(vars) {
        if(vars._visit["长者食堂-休息"] > 1) return "你决定继续休息一会儿。" + describeWeather(vars);
        return "你走向椅子堆，上面沾了些脏东西。你觉得不干净，于是决定就坐在地上休息一会儿……";
    },
    choices: [
      {
        text: "继续休息",
        nextScene: "长者食堂-休息",
        effect: updateTime(1)
      },
      {
        text: "往里面走",
        nextScene: "长者食堂-内部",
        effect: updateTime(1)
      }
    ]
  },

  "长者食堂-关门": {
    image: "images/小区周边/长者食堂/内部.png",
    text: "你关上了门。店里的椅子东倒西歪，打饭区好像没有剩下什么食物。你摇了摇头，看向旁边的墙壁。\n\
“扫码注册充值，即可享用美食。”\n\
砰砰砰————！\n\
你吓了一大跳，回头一看，是一只丧尸，它正趴在门上试图进来。幸好刚才把门关了。\n\
这里丧尸可能越聚越多，最好早点走。",
    choices: [
      {
        text: "推门出去",
        nextScene: "长者食堂-打门口丧尸",
        effect: updateTime(1)
      },
      {
        text: "往里面走",
        nextScene: "长者食堂-内部",
        effect: updateTime(1)
      }
    ]
  },

  "长者食堂-打门口丧尸": {
    image: "images/placeholder.png" /* TODO: images/小区周边/长者食堂/门口丧尸.png */,
    onEnter: function(vars) {
      var elapsed = vars.gameMinutes - vars._cafeteriaEnterMinute;
      vars._cafeteriaElapsed = elapsed; // 存下来供 text 用

      // 难度档位（颜色数）
      var len = 5;                       // 普通：5色
      var extraEffect = {};
      if (elapsed >= 10 || vars.weather === "雨") {
        len = 7;                          // 逗留太久 或 雨天：7色
        extraEffect = { add: { chasedByZombies: 1 } };
      }
      if (elapsed >= 10 && vars.weather === "雨") {
        len = 9;                          // 两者叠加：9色
        extraEffect = { add: { chasedByZombies: 2 } };
      }

      return initMemoryGame(["红","蓝","绿"], len, extraEffect)(vars);
    },
    text: function(vars) {
      var desc = "你推门出去，门外的丧尸立刻朝你扑了过来！它已经凑到了你的面前——集中注意力，看清它的动作轨迹！";
      if (vars._cafeteriaElapsed >= 10) {
        desc += "\n你在食堂里逗留了太久，门外已经聚集了更多丧尸。";
      }
      if (vars.weather === "雨") {
        desc += "\n雨水顺着屋檐滴下来，模糊了你的视线——你更难集中注意力了。";
      }
      return desc;
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "三林路-东明路 十字路口",
        elseScene: "结局-被丧尸扑倒咬死",
        timeout: 15000,
        timeoutScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "长者食堂-内部": {
    image: "images/小区周边/长者食堂/内部.png",
    text: "你在长者食堂的内部。店里的椅子东倒西歪，打饭区好像没有剩下什么食物。厨房里有什么东西在嘀、嘀、嘀地响。",
    choices: [
      {
        text: "看看窗口",
        nextScene: "长者食堂-窗口",
        effect: updateTime(1)
      },
      {
        text: "看看打饭区",
        nextScene: "长者食堂-打饭区",
        effect: updateTime(1)
      },
      {
        text: "看看饮水机",
        nextScene: "长者食堂-饮水机",
        effect: updateTime(1)
      },
      {
        text: "看看后厨",
        nextScene: "长者食堂-后厨",
        effect: updateTime(1)
      },
      {
        text: "看看办公室",
        nextScene: "长者食堂-办公室",
        effect: updateTime(1)
      },
      {
        text: "整理一下身上的东西",
        nextScene: "整理整理",
        effect: updateTime(1),
        effect: {set: {positionAfterOperation: "长者食堂-内部"}}
      }
    ]
  },

  "长者食堂-打饭区": {
    image: "images/小区周边/长者食堂/打饭区.jpg",
    text: function(vars) {
      if (vars._visit['长者食堂-吃饭'] > 0) return "你在长者食堂的打饭区，这里没有食物了。";
      return "你在长者食堂的打饭区。看起来还有些剩余的食物，但闻起来有点奇怪，你要吃吗？";
    },
    choices: [
      {
        showCondition: "!_visit['长者食堂-吃饭']",
        text: "吃",
        nextScene: "长者食堂-吃饭",
        effect: updateTime(1)
      },
      {
        text: "不吃",
        nextScene: "长者食堂-内部",
        effect: updateTime(1)
      }
    ]
  },

  "长者食堂-吃饭": {
    image: "images/小区周边/长者食堂/吃饭.jpg",
    onEnter: {add: {strength: -1}},
    text: "你感觉有点饿，把剩余的一点食物一扫而空。过了一会儿，肚子便疼了起来。\n\
可恶，这些食物已经不新鲜了。",
    choices: [
        {
            text: "呸呸呸",
            nextScene: "长者食堂-内部",
            effect: updateTime(1)
        }
    ]
  },

  "长者食堂-后厨": {
    image: "images/小区周边/长者食堂/后厨.jpg",
    text: "你在长者食堂的后厨。灶台上的锅具东倒西歪，几口炒锅里残留着干涸的菜汤，案板上还搁着半棵蔫了的白菜。\n\
墙上写着标语：厨房重地，闲人免入。\n\
你翻找了一圈——调味料倒是齐全，但带不走也煮不了。冷藏室的门虚掩着，门缝里飘出一股冷气和一丝说不清的甜味。\n\
蝉鸣声隐约从窗外传来。",
    choices: [
      {
        text: "离开后厨",
        nextScene: "长者食堂-内部",
        effect: updateTime(1)
      }
    ]
  },

  "长者食堂-饮水机": {
    image: "images/小区周边/长者食堂/饮水机.jpg",
    text: function(vars) {
      if (!vars.hasBottle) {
        return "饮水机还在运行，滤芯指示灯闪着绿光。不锈钢水槽里积着浅浅一层水渍——之前应该有不少人来这里打过水。\n但你没有容器。嘴对嘴喝的话，你的脖子大概要扭到断掉的程度。";
      }
      if (vars.bottleWater > 0) {
        return "你的水瓶里还有水。饮水机还在嗡嗡作响，但暂时用不上。";
      }
      if (vars._waterDispenserUses >= 10) {
        return "你按下出水键，但只流出几滴——饮水机的水箱已经空了。滤芯指示灯不知什么时候变成了红色。";
      }
      return "饮水机还在运行。\n你把空水瓶放到出水口下面，按下出水键——清亮的水哗哗地灌进瓶口，几秒钟就装满了。";
    },
    choices: [
      {
        showCondition: "hasBottle && bottleWater == 0 && _waterDispenserUses < 10",
        text: "接水",
        effect: updateTime(2, { add: { _waterDispenserUses: 1, bottleWater: 1 }, set: { waterToxic: false } }),
        nextScene: "长者食堂-饮水机"
      },
      {
        text: "离开",
        nextScene: "长者食堂-内部"
      }
    ]
  },

  "长者食堂-窗口": {
    image: "images/小区周边/长者食堂/窗口.jpg",
    text: function(vars) {
      if (vars.dd > 1) {
        return "供汤窗口的保温桶已经断电了。你掀开桶盖——里面的紫菜蛋花汤已经凉透，表面凝了一层灰白的油膜，散发着一股馊掉的酸味。\n不能喝了。";
      }
      return "供汤窗口的不锈钢台面上放着一只保温桶，电磁炉还在低功率保温。你掀开桶盖——小半桶紫菜蛋花汤，热气扑在脸上，带着紫菜和蛋花的咸香。\n\
旁边摞着一叠不锈钢碗，食堂的标准配置。";
    },
    choices: [
      {
        showCondition: "dd == 1",
        text: "趁热喝掉",
        nextScene: "长者食堂-窗口",
        effect: updateTime(2, { add: { strength: 2 } })
      },
      {
        text: "离开窗口",
        nextScene: "长者食堂-内部"
      }
    ]
  },

  "长者食堂-办公室": {
    image: "images/小区周边/长者食堂/办公室.jpg",
    text: function(vars) {
      var desc = "你穿过用餐区往深处走去，后面有一扇半掩的门，里面是间不到五平米的小办公室。桌上放着一台旧台式机、一叠外卖传单，墙角摞着几箱一次性餐具。\n";
      if(vars._visit['长者食堂-办公室']) desc = "办公室桌上放着一台旧台式机、一叠外卖传单，墙角摞着几箱一次性餐具。";

      if (!vars._cafeteriaWifiOn) {
        desc += "桌角的路由器指示灯灭着。你凑近看了看——电源线还插着，但开关被按掉了。插座旁边贴着一张褪色的标签：“省电，走时关路由器。重开按背后小黑钮三秒。”";
      } else {
        desc += "路由器指示灯闪着规律的绿光。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_cafeteriaWifiOn",
        text: "按住路由器背后的小黑钮三秒",
        nextScene: "长者食堂-打开路由器",
        effect: updateTime(1, { set: { _cafeteriaWifiOn: true } })
      },
      {
        text: "离开办公室",
        nextScene: "长者食堂-内部"
      }
    ]
  },

  "长者食堂-打开路由器": {
    image: "images/小区周边/长者食堂/打开路由器.jpg",
    text: "你按住了路由器背后的小黑钮三秒，路由器指示灯开始闪着规律的绿光。",
    choices: [
      {
        text: "继续",
        nextScene: "长者食堂-办公室"
      }
    ]
  },

  "长者食堂-签到本": {
    image: "images/placeholder.png" /* TODO: images/小区周边/长者食堂/办公室.png */,
    text: "你拿起桌上的签到本。封面印着“东明社区食堂 就餐登记表”，纸质已经有些起皱。\n\
翻到最后一页有字迹的地方——\n\
  6月25日（晴）\n\
  洪德胜  11:30  番茄炒蛋+饭+汤  已结\n\
  周建国  11:35  红烧大排+饭    已结\n\
  6月26日（阴）\n\
  周建国  11:20  青菜+饭        已结\n\
  6月27日\n\
  （这一页是空白的）\n\
你合上了签到本。上面的名字有些你认识，有些不认识——但以后大概不会再有新的名字写在这本簿子上了。",
    choices: [
      {
        text: "放下签到本",
        nextScene: "长者食堂-办公室"
      }
    ]
  },

  "长者食堂-手机信息": {
    image: "images/小区周边/长者食堂/手机信息.png",
    text: "你连上了食堂的WiFi。手机震动了一下——\n\
信号很弱，但还能用。大部分网站已经打不开了——服务器大概早就断了电。\n\
只有几个页面还能加载出来：\n\
【上海应急广播 — 最后更新 6月28日 14:32】\n\
“全市已启动一级应急响应。请市民留在室内，关好门窗，等待进一步通知。\n\
临时避难所已启用：\n\
浦东图书馆（锦绣路）\n\
源深体育中心（张杨路）\n\
三林体育中心（齐河路）……”\n\
【新民晚报 — 6月27日 电子版（缓存）】\n\
头版：《我市启动突发公共卫生事件应急预案》\n\
末版一则短讯：\n\
“东明路街道各社区已组织志愿者分发物资。”\n\
你关掉了屏幕。\n\
这些页面大概是这座城市还能对外说话的最后几个小时里留下的。\n\
新民晚报大概不会有下一期了。",
    choices: [
      {
        text: "放下手机",
        nextScene: "{positionAfterOperation}"
      }
    ]
  }
});