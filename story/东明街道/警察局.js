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
      if (vars._lastScene === "警察局-北段-持图穿行") {
        desc = "你顺着陈默标的后街巷一路摸到派出所围墙根，贴墙闪身钻进半开的铁门。\n" + desc;
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
  // 只有掌握陈默的路线图（_hasPoliceMap）才找得到穿行车阵的后街巷；没图 → 车阵里绕不出去折返

  "警察局-北段-无图路口": {
    image: "images/placeholder.png" /* TODO: images/警察局/northRoadWalk.png */,
    onEnter: updateTime(10),
    text: "你沿东明路向北走了没多远，路就被翻倒的公交和撞作一团的小轿车堵得死死的，车与车之间只留出侧身才挤得过去的缝，抬眼望去连条能绕的岔路都没有——你不熟这一片，更不知道从哪条巷子能钻到派出所。\n\
一辆车顶上的丧尸朝你扑下来，你赶紧撤了一步。再往前，就是自己送进车缝里的丧尸嘴。\n\
看来得先弄到一张能把这片路线画明白的地图，才能摸到派出所。你原路退回学校门口。",
    choices: [
      { text: "退回上实南校门口", nextScene: "上实南校门口" }
    ]
  },

  "警察局-北段-持图穿行": {
    image: "images/placeholder.png" /* TODO: images/警察局/northRoadRide.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿"], 7),
    text: "你把陈默那张路线图在脑子里过了一遍——后街巷、消防通道、围墙根，一路串到派出所门口。你照着线钻进车缝，贴着车门起伏前行。\n\
可图上的线只到派出所外墙，最后这几步，你得盯着丧尸手的轨迹，在车阵里腾挪。\n\
集中注意力！记住闪过的颜色，那是你按图穿行的路线。",
    choices: [
      {
        text: "输入你记下的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "警察局",
        elseScene: "警察局-北段-持图失败"
      }
    ]
  },

  "警察局-北段-持图失败": {
    image: "images/placeholder.png" /* TODO: images/警察局/northRoadRide.png */,
    onEnter: updateTime(25, { add: { strength: -2, chasedByZombies: 1 } }),
    text: "你一恍神，走岔了图上那条线，正撞上从车缝里扑出来的丧尸。你连滚带爬地从车底钻出去，掉头就逃，一路晃到学校门口，胳膊和小腿划了好几道血口子。\n\
车阵还在那儿——路线记住了，但得缓一缓再试。",
    choices: [
      { text: "退回上实南校门口", nextScene: "上实南校门口" }
    ]
  }
});
