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
    onEnter: { set: { hasGun: true, positionAfterOperation: "警察局" }, add: { itemCount: 1 } },
    text: "你在值班室的抽屉里找到一把手枪，弹匣里有几发子弹。枪身冰凉，保险还开着。\n\
你把保险合上，别在腰间——不到万不得已，你不太想用这东西。枪声会引来太多东西。",
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
  }
});
