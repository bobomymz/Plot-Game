// -------- 警察局（东明路/上实南校向北） --------
// 高级武器选择点。前方道路被尸潮堵死，无法继续前进——搜刮完需原路返回。
// 武器占背包：hasAxe / hasGun / hasDagger（全图唯一，!hasXxx 守卫防重复刷取）

Object.assign(storyData, {
  "警察局": {
    image: "images/placeholder.png" /* TODO: images/警察局/policeStation.png */,
    onEnter: function(vars) {
      vars.currentPlace = "警察局";
      vars.currentPos = "警察局";
      vars.showZombies = true;
    },
    text: function(vars) {
      var desc = "你沿着东明路一直往北，在路口看到了派出所的蓝白招牌。围墙的铁门半开着，门内的停车场里停着几辆警车，车身上有抓痕，轮胎瘪了大半。\n\
派出所的三层小楼静悄悄的，一楼的门虚掩着。\n\
你还来不及细看，就听到远处传来密集的脚步声和低沉的嘶吼——街道尽头的丧尸正在往这边聚集，把通往北面的路堵得严严实实。\n\
看来只能到此为止了。搜刮完，得趁丧尸围拢前原路返回。";
      if (vars._lastScene === "警察局-北段-骑车穿行") {
        desc = "你刹停在派出所门口，把车随手塞进围墙边的车阵里，闪身钻进半开的铁门。\n" + desc;
      }
      return desc + "\n" + describeZombieWave(vars);
    },
    choices: function(vars) {
      var opts = [];
      if (!vars.hasAxe) {
        opts.push({
          text: "拿走警用斧",
          condition: "itemCount < bagVolume",
          nextScene: "警察局-武器-斧头",
          elseScene: "整理整理"
        });
      }
      if (!vars.hasGun) {
        opts.push({
          text: "拿走警用手枪",
          condition: "itemCount < bagVolume",
          nextScene: "警察局-武器-手枪",
          elseScene: "整理整理"
        });
      }
      if (!vars.hasDagger) {
        opts.push({
          text: "拿走警用匕首",
          condition: "itemCount < bagVolume",
          nextScene: "警察局-武器-匕首",
          elseScene: "整理整理"
        });
      }
      opts.push({
        text: "原路返回",
        nextScene: "上实南校门口",
        effect: updateTime(15)
      });
      return opts;
    }
  },

  "警察局-武器-斧头": {
    image: "images/placeholder.png" /* TODO: images/警察局/policeStation.png */,
    onEnter: { set: { hasAxe: true, positionAfterOperation: "警察局" }, add: { itemCount: 1 } },
    text: "你在警械室里找到一把警用消防斧，斧刃磨得很锋利，手柄上缠着黑色电工胶带。掂了掂——比想象中的重，但挥起来很有分量。\n\
有了它，撬门、破门、劈丧尸都够用了。",
    choices: [
      {
        text: "收好斧头",
        nextScene: "警察局"
      }
    ]
  },

  "警察局-武器-手枪": {
    image: "images/placeholder.png" /* TODO: images/警察局/policeStation.png */,
    onEnter: function(v) {
      // 子弹只在第一次拿枪时补给（弹匣里就这3发）；丢枪后回头重拿，不再有子弹
      if (!v._policeGunTaken) {
        v._policeGunTaken = true;
        v.gunAmmo = 3;
      }
      return { set: { hasGun: true, positionAfterOperation: "警察局" }, add: { itemCount: 1 } };
    },
    text: function(vars) {
      return "你在值班室的抽屉里找到一把手枪，弹匣里压着三发子弹。枪身冰凉，保险还开着。\n\
你把保险合上，别在腰间——不到万不得已，你不太想用这东西。枪声会引来太多东西。\n\
而现在这年月，三发打空，上海城里怕是再找不到补给。";
    },
    choices: [
      {
        text: "收好手枪",
        nextScene: "警察局"
      }
    ]
  },

  "警察局-武器-匕首": {
    image: "images/placeholder.png" /* TODO: images/警察局/policeStation.png */,
    onEnter: { set: { hasDagger: true, positionAfterOperation: "警察局" }, add: { itemCount: 1 } },
    text: "你在警械柜里找到一把战术匕首，刀刃闪着冷光，刀鞘上有一个快拆扣。\n\
小巧锋利，适合近身格斗，也比大件的家伙好收。",
    choices: [
      {
        text: "收好匕首",
        nextScene: "警察局"
      }
    ]
  },

  // ==================== 前往警察局的北段车阵（东明路被废弃车辆堵死） ====================
  // 无轻便车 → 步行硬闯失败折返（软挡）；有轻便车 → 中等记忆闪色骑车穿车阵，失败负伤折返可重试

  "警察局-北段-步行尝试": {
    image: "images/placeholder.png" /* TODO: images/警察局/northRoadWalk.png */,
    onEnter: updateTime(20, { add: { strength: -1, chasedByZombies: 1 } }),
    text: "你沿东明路向北走。路况越来越不对劲——翻倒的公交、撞作一团的小轿车把路面堵得几乎看不见地皮，车与车之间只留出侧身才挤得过去的缝。\n\
你刚绕过一辆车头翘起的出租，车顶上就扑下来一只丧尸。你侧身躲过，车缝里却又有手伸出来，一把抓住你的衣角。你连挣带踹退到车阵外，冷汗已经湿了后背。\n\
远处派出所的蓝白招牌近在咫尺，可这段堵死的车龙，你靠两条腿根本钻不过去。\n\
你只能沿原路退回学校门口。没辆能钻缝的轻便车，这段路是过不去的。",
    choices: [
      { text: "退回上实南校门口", nextScene: "上实南校门口" }
    ]
  },

  "警察局-北段-骑车穿行": {
    image: "images/placeholder.png" /* TODO: images/警察局/northRoadRide.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿"], 7),
    text: "你跨上车，钻进车阵的缝隙。前轮贴着车门掠过去，后视镜、雨刮器擦着你的耳畔掠过。两侧丧尸的手一次次抓空——你只要有一瞬走神，就会连人带车撞进它们怀里。\n\
集中注意力！记住闪过的颜色，那是你在车阵里穿行的路线。",
    choices: [
      {
        text: "输入你记下的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "警察局",
        elseScene: "警察局-北段-骑车失败"
      }
    ]
  },

  "警察局-北段-骑车失败": {
    image: "images/placeholder.png" /* TODO: images/警察局/northRoadRide.png */,
    onEnter: updateTime(25, { add: { strength: -2, chasedByZombies: 1 } }),
    text: "你一晃神，前轮碾上散落的碎片，车把猛地一歪——连人带车摔进两车之间的夹缝里。丧尸从四面围拢过来，你几乎是手脚并用地从车底钻出去，把车从碎玻璃里硬拽出来，掉头就逃。\n\
身后追了几条街，才终于把它们甩掉。\n\
回到学校门口，你大口喘着气，胳膊和小腿划了好几道血口子。车还在——只是这一趟，你赔上了不少体力。",
    choices: [
      { text: "退回上实南校门口", nextScene: "上实南校门口" }
    ]
  }
});
