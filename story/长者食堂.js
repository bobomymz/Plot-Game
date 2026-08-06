Object.assign(storyData, {
  "长者食堂": {
    image: timeImage({
      morning: "images/小区周边/长者食堂/门口.jpg",
      night: "images/小区周边/长者食堂/门口-night.jpg"
    }),
    onEnter: function(vars) {
      vars.showRain = true;
      vars._cafeteriaEnterMinute = vars.gameMinutes; // 记录进入食堂的时间（用于计时难度）
    },
    text: function(vars) {
      return "你来到了东明社区食堂。平时偶尔回来这里吃一次，饭菜也挺好的，经常能看到老年人来吃。现在这里已经空了。" + describeWeather(vars);
    },
    choices: [
      {
        text: "离开",
        nextScene: "东明路-三林路 十字路口",
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
      }
    ]
  },

  "结局-闭目养神": {
    image: "images/zombiePounceOnYou.png",
    text: "你闭目养神，休息了一会儿。门外的雨声淅沥淅沥，在这末世下似乎是唯一的慰藉。\n\
你感觉到一丝不安。\n\
睁开眼，一只红眼的丧尸向你扑了过来。\n\
—— 结局：闭目养神 —— "
  },

  "长者食堂-休息": {
    image: "images/小区周边/长者食堂/坐在地上.png",
    onEnter: updateTime(10,{add: { strength: 1 }}),
    text: "你走向椅子堆，上面沾了些脏东西。你觉得不干净，于是决定就坐在地上。"
  },

  "长者食堂-关门": {
    image: "images/小区周边/长者食堂/门口.png",
    text: "你关上了门。店里的椅子东倒西歪，打饭区好像没有剩下什么食物。你摇了摇头，看向旁边的墙壁。\n\
“扫码注册充值，即可享用美食。”\n\
砰砰砰————\n\
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

      return initMemoryGame(["红","蓝","绿","黄","紫"], len, extraEffect)(vars);
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
        nextScene: "东明路-三林路 十字路口",
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
      }
    ]
  }
});