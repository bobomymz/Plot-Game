// ========== 三林菜市场（方姐） ==========
// 交易点：方姐，以物易物。联通安盛街西侧（正门）+ 长者食堂后厨（员工通道）。
// 交易上限 3 次；满 3 次后方姐尸变，再进冷库深处即死。
// 员工通道岔路：正确方向是"安全出口"（图片上绘制，剧情文字不提），需手电筒/手机照明看清。

Object.assign(storyData, {

  // ==================== 正门入口（安盛街西侧） ====================
  "菜市场-卷帘门": {
    image: "images/placeholder.png" /* TODO: images/菜市场/卷帘门.jpg */,
    onEnter: function(vars) {
      vars.currentPlace = "三林菜市场";
      vars.currentPos = "菜市场卷帘门";
      applyWeatherDrain(vars);
    },
    text: "你来到菜市场的卷帘门前。卷帘门只落下来一半，底部离地留着一道半人高的缝，刚好够一个人猫着腰钻进去。\n透过那道缝往里看，只有几排冰柜的黑影静悄悄地立在昏暗里，什么声音都没有——静得有点不真实。\n门缝里飘出一股鱼腥味，混着一丝若有若无的腐味。",
    choices: [
      { text: "从卷帘门下钻进去", nextScene: "菜市场-大厅", effect: updateTime(1) },
      { text: "先不进去，退回安盛街", nextScene: "安盛街西侧", effect: updateTime(1) }
    ]
  },

  "菜市场-大厅": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png"; /* TODO: images/菜市场/大厅-雨.jpg */
      var f = timeImage({ morning: "images/placeholder.png" }); /* TODO: images/菜市场/大厅.jpg */
      return f(vars);
    },
    onEnter: function(vars) {
      vars.currentPlace = "三林菜市场";
      vars.currentPos = "菜市场大厅";
      vars._marketEntry = "大厅";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      var desc = "你从卷帘门下的缝隙里钻进了菜市场。头顶的日光灯早就熄了，只有侧窗漏进来的天光把摊位间的过道照得明暗交错。\n鱼摊、肉摊、菜摊……冰柜的玻璃门蒙着厚厚的雾气，看不清里面还剩什么。";
      if (!vars._marketHallCleared) {
        desc += "\n过道中间趴着一具穿着围裙的尸体，正以一种奇怪的姿势抽搐着——它还有一口气。看到你，它开始往你的方向爬。";
      } else {
        desc += "\n过道空荡荡的——上次那只趴在地上的丧尸已经被你解决了。";
      }
      return desc + "\n" + describeWeather(vars);
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._marketHallCleared) {
        cs.push({ text: "绕开它，从摊位底下钻过去", nextScene: "菜市场-大厅-潜行", effect: updateTime(2) });
        cs.push({ text: "抄家伙把它彻底解决", nextScene: "菜市场-大厅-清场", effect: updateTime(2) });
        cs.push({ text: "太危险了，退回去", nextScene: "安盛街西侧", effect: updateTime(1) });
      } else {
        cs.push({ text: "前往冷库区", nextScene: "菜市场-冷库区", effect: updateTime(2) });
        cs.push({ text: "从卷帘门钻出去", nextScene: "安盛街西侧", effect: updateTime(1) });
      }
      return cs;
    }
  },

  "菜市场-大厅-潜行": {
    image: "images/placeholder.png" /* TODO: images/菜市场/大厅-潜行.jpg */,
    text: "你压低身子，贴着冰柜的阴影一点一点往前挪。那只丧尸拖着半截身子，在地上留下一道长长的血痕。\n你屏住呼吸，从它旁边绕了过去。它似乎嗅到了什么，抽搐着朝你的方向转了一下头，但什么也没抓到。\n你安全地穿过了大厅。那只丧尸还趴在原地——留着它，总归是个隐患，但你管不了那么多了。",
    choices: [
      { text: "前往冷库区", nextScene: "菜市场-冷库区", effect: updateTime(2) },
      { text: "绕回去把它解决掉", nextScene: "菜市场-大厅-清场", effect: updateTime(2) }
    ]
  },

  "菜市场-大厅-清场": {
    image: "images/placeholder.png" /* TODO: images/菜市场/大厅-清场.jpg */,
    onEnter: { set: { _marketHallCleared: true } },
    text: function(vars) {
      var wpn = "手中的家伙";
      if (vars.hasIronPipe) wpn = "铁管";
      else if (vars.hasCane) wpn = "拐杖";
      else if (vars.hasMopHandle) wpn = "拖把杆";
      return "你走上前，它朝你张开了嘴。你举起" + wpn + "，给了它一下。\n它抽搐了几下，不动了。你把它拖到冰柜后面，用一张脏布盖上——至少看着不那么碍眼。\n大厅安静了下来。";
    },
    choices: [
      { text: "前往冷库区", nextScene: "菜市场-冷库区", effect: updateTime(2) }
    ]
  },

  // ==================== 员工通道（长者食堂后厨进入） ====================
  "菜市场-员工通道": {
    image: function(vars) {
      // 有照明能看清"安全出口"标志（图片上画在左侧通道）；没照明图很昏暗
      if (vars.hasTorch || vars.hasPhone) return "images/placeholder.png"; /* TODO: images/菜市场/员工通道-亮.jpg */
      return "images/placeholder.png"; /* TODO: images/菜市场/员工通道-暗.jpg */
    },
    onEnter: { set: { currentPlace: "三林菜市场", currentPos: "员工通道", _marketEntry: "员工通道" } },
    text: function(vars) {
      if (vars.hasTorch || vars.hasPhone) {
        return "你穿过长者食堂后厨那道冷藏室的门，走进一条堆着空菜筐的过道。头顶的灯管蒙着灰，但借着你手里的光，通道里的情况还算看得清。\n前方分岔出三条通道——左边堆着几只倒扣的塑料周转箱，中间是一条直道，右边好像通向一个小房间。";
      }
      return "你推开冷藏室的门，走进一条堆着空菜筐的过道。门在身后咔哒一声合上——你面前一片漆黑。\n你摸黑往前走了几步，脚下踩到一只滚落的菜筐，差点绊倒。手边似乎摸到了几面墙，前方好像分出了岔路，但你什么也看不清。";
    },
    choices: [
      {
        text: "往左边那条通道走",
        nextScene: function(vars) { return (vars.hasTorch || vars.hasPhone) ? "菜市场-冷库区" : "菜市场-通道迷路"; },
        effect: updateTime(2)
      },
      {
        text: "往中间那条通道走",
        nextScene: "菜市场-通道迷路",
        effect: updateTime(2)
      },
      {
        text: "往右边那条通道走",
        nextScene: "菜市场-通道迷路",
        effect: updateTime(2)
      },
      {
        text: "摸黑退回去",
        nextScene: "长者食堂-后厨",
        effect: updateTime(1)
      }
    ]
  },

  "菜市场-通道迷路": {
    image: "images/placeholder.png" /* TODO: images/菜市场/员工通道-暗.jpg */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(vars) {
      if (vars.hasTorch || vars.hasPhone) {
        return "你沿着通道走了几步，发现前方是一条死路——堆满的旧货架堵死了去路。你回想了一下，刚才岔路口那几个方向里，好像有个方向你漏看了。\n你退回了岔路口，重新打量四周。";
      }
      return "你凭着感觉往前走，却一头撞进了一个杂物间——手在黑暗中碰到冰冷的东西，像是铁钩。你打了个寒战，赶紧退回去。黑暗中，你隐约觉得背后有拖沓的脚步声。你不敢再乱闯了。";
    },
    choices: [
      { text: "回到岔路口重新选择", nextScene: "菜市场-员工通道", effect: updateTime(2) },
      { text: "太黑了，原路退回", nextScene: "长者食堂-后厨", effect: updateTime(1) }
    ]
  },

  // ==================== 冷库区 ====================
  "菜市场-冷库区": {
    image: function(vars) {
      var f = timeImage({ morning: "images/placeholder.png" }); /* TODO: images/菜市场/冷库区.jpg */
      return f(vars);
    },
    onEnter: { set: { currentPlace: "三林菜市场", currentPos: "冷库区" } },
    text: "你走进冷库区。温度明显低了下来，墙角一排冷库门上结着白霜，其中一扇虚掩着，门缝里漏出微弱的昏黄灯光，还有一股柴油的味道。\n\
那就是发电机的声音——低沉的嗡嗡声，从虚掩的门后传出来。",
    choices: function(vars) {
      var cs = [];
      if (vars.fangTradeCount >= 3) {
        // 满3次交易后，方姐已尸变——再进冷库深处即死
        cs.push({ text: "推开门进去", nextScene: "菜市场-方姐尸变" });
      } else if (vars.hh >= 12 && vars.hh <= 15) {
        cs.push({ text: "推开门进去", nextScene: "菜市场-交易点", effect: updateTime(1) });
      } else {
        cs.push({ text: "推开门进去", nextScene: "菜市场-冷库区-闭门羹", effect: updateTime(1) });
      }
      cs.push({ text: "离开冷库区", nextScene: function(vars) {
        return vars._marketEntry === "员工通道" ? "菜市场-员工通道" : "菜市场-大厅";
      }, effect: updateTime(2) });
      return cs;
    }
  },

  "菜市场-冷库区-闭门羹": {
    image: "images/placeholder.png" /* TODO: images/菜市场/冷库区.jpg */,
    text: function(vars) {
      var met = vars._visit && vars._visit["菜市场-交易点"] > 0;
      if (!met) {
        // 第一次来，不知道这里平时有人——只觉得没人
        return "你推开门——冷库里黑黢黢的，只有发电机低沉的嗡嗡声。昏黄的灯光熄了，冷藏柜的门虚掩着，冷气从门缝里丝丝地往外冒，但人不在。\n你合上门。这里没人。";
      }
      // 见过方姐后，才知道她是分时间交易的
      return "你推开门——冷库里黑黢黢的，发电机还在嗡嗡地转，但人不在。方姐没在这里。\n你合上门，心里记下：下次挑日头正毒、外面丧尸都蔫了的时候再来碰碰运气。";
    },
    choices: [
      { text: "离开冷库区", nextScene: function(vars) {
        return vars._marketEntry === "员工通道" ? "菜市场-员工通道" : "菜市场-大厅";
      }, effect: updateTime(2) }
    ]
  },

  // ==================== 交易点（冷库深处·方姐） ====================
  "菜市场-交易点": {
    image: "images/placeholder.png" /* TODO: images/菜市场/交易点.jpg */,
    onEnter: { set: { currentPlace: "三林菜市场", currentPos: "冷库深处" } },
    text: function(vars) {
      var desc = "你推开门，柴油发电机的嗡嗡声清晰起来。昏黄的灯泡下，一个围着脏围裙的中年女人正蹲在一台冷藏柜前翻着什么。听到动静她猛地回头——看到是你，才慢慢松了手里的砍骨刀。\n“进货的来了？”她站起来，抹了把汗，嗓音沙哑，“我这儿不白给，也不白拿。拿东西来换，肉、水、家伙，都有。”";
      if (vars.fangTradeCount === 1) desc += "\n她已经给你换过一次了。";
      else if (vars.fangTradeCount === 2) desc += "\n你们换过两次了。她看起来比上次更疲惫，眼窝深陷。";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (vars.hasLubricant) {
        cs.push({ text: "“我有一瓶润滑油，想换冻肉。”", nextScene: "菜市场-交易-冻肉", effect: updateTime(2) });
      }
      if (vars.hasLiquidParaffin && vars.hasBottle) {
        cs.push({ text: "“我有一瓶医用石蜡油，想换干净水。”", nextScene: "菜市场-交易-水", effect: updateTime(2) });
      }
      if (vars.hasGasMask) {
        cs.push({ text: "“我有个防毒面具，想换根铁棍。”", nextScene: "菜市场-交易-铁棍", effect: updateTime(2) });
      }
      if (cs.length === 0) {
        cs.push({ text: "“我现在没什么能换的。”", nextScene: "菜市场-交易点-没东西", effect: updateTime(1) });
      }
      cs.push({ text: "离开", nextScene: "菜市场-冷库区", effect: updateTime(1) });
      return cs;
    }
  },

  "菜市场-交易点-没东西": {
    image: "images/placeholder.png" /* TODO: images/菜市场/交易点.jpg */,
    text: "你摸了摸身上——没有方姐要的东西。方姐看了你一眼，没说什么，又蹲回冷藏柜前。“等有货了再来。”",
    choices: [
      { text: "离开", nextScene: "菜市场-冷库区", effect: updateTime(1) }
    ]
  },

  // ==================== 交易结果 ====================
  "菜市场-交易-冻肉": {
    image: "images/placeholder.png" /* TODO: images/菜市场/交易-冻肉.jpg */,
    onEnter: function(vars) {
      vars.fangTradeCount += 1;
      vars.hasLubricant = false;
      vars.hasFrozenMeat = true;
      vars.itemCount = Math.max(0, vars.itemCount - 1 + 1); // 润滑油-1，冻肉+1，净0
      return {};
    },
    text: function(vars) {
      var desc = "方姐接过润滑油，凑到灯下看了看，又拧开盖子闻了闻，点了点头。“好东西，能让我那台发电机多转几天。”\n她拉开冷藏柜，从最里面摸出一大块冻得梆硬的肉，用油纸裹了，塞给你。“五花肉，化冻了煎着吃、炖着吃都行——你这体力亏空，得吃顿实的。”";
      if (vars.fangTradeCount >= 3) desc += "\n她把肉递给你的时候，你注意到她的手指在微微发抖，指甲缝里有一点已经发黑的淤青。她飞快地把手缩回了围裙底下。";
      return desc;
    },
    choices: function(vars) {
      if (vars.fangTradeCount >= 3) {
        return [{ text: "离开", nextScene: "菜市场-冷库区" }];
      }
      return [{ text: "继续交易", nextScene: "菜市场-交易点" }, { text: "离开", nextScene: "菜市场-冷库区" }];
    }
  },

  "菜市场-交易-水": {
    image: "images/placeholder.png" /* TODO: images/菜市场/交易-水.jpg */,
    onEnter: function(vars) {
      vars.fangTradeCount += 1;
      vars.hasLiquidParaffin = false;
      vars.itemCount = Math.max(0, vars.itemCount - 1);
      vars.bottleWater = 1;
      vars.waterToxic = false; // 方姐给的是干净的桶装水
      return {};
    },
    text: function(vars) {
      var desc = "方姐接过石蜡油，掂了掂。“医用级的，好东西——我这冷库的铰链早就该上油了。”\n她转身从角落里提过来一只塑料桶，拧开盖，拿你的水瓶灌满。“干净水，我囤的桶装水。你放心喝，不是自来水管里接的。”\n你拧紧瓶盖。水清亮亮的，能直接拿去解人渴。";
      if (vars.fangTradeCount >= 3) desc += "\n灌水的时候，她扶着桶的手抖了一下，水洒出来一些。她笑了笑：“年纪大了，手劲不行了。”但你注意到她笑的时候，嘴角抽动得有些僵硬。";
      return desc;
    },
    choices: function(vars) {
      if (vars.fangTradeCount >= 3) {
        return [{ text: "离开", nextScene: "菜市场-冷库区" }];
      }
      return [{ text: "继续交易", nextScene: "菜市场-交易点" }, { text: "离开", nextScene: "菜市场-冷库区" }];
    }
  },

  "菜市场-交易-铁棍": {
    image: "images/placeholder.png" /* TODO: images/菜市场/交易-铁棍.jpg */,
    onEnter: function(vars) {
      vars.fangTradeCount += 1;
      vars.hasGasMask = false;
      vars.hasIronPipe = true;
      vars.itemCount = Math.max(0, vars.itemCount); // 面具-1，铁棍+1，净0
      return {};
    },
    text: function(vars) {
      var desc = "方姐看了一眼防毒面具，眼神闪了闪。“这玩意儿……你留着能保命，怎么舍得换？”\n你沉默了一下。她没追问，从冰柜下面抽出一根钢管——比手腕略细，沉甸甸的，一头缠着黑胶带。“铁棍。砸丧尸比你的拳头好用。”\n她递给你的时候，手没有完全伸直——像是用尽了力气才举到一半。";
      if (vars.fangTradeCount >= 3) desc += "\n你接过铁棍，触到她的指尖——冰凉得不正常。她飞快地缩回手，背过身去，声音闷闷的：“……货拿好，走吧。”";
      return desc;
    },
    choices: function(vars) {
      if (vars.fangTradeCount >= 3) {
        return [{ text: "离开", nextScene: "菜市场-冷库区" }];
      }
      return [{ text: "继续交易", nextScene: "菜市场-交易点" }, { text: "离开", nextScene: "菜市场-冷库区" }];
    }
  },

  // ==================== 方姐尸变（死局） ====================
  "菜市场-方姐尸变": {
    image: "images/placeholder.png" /* TODO: images/菜市场/方姐尸变.jpg */,
    style: "color: #ff4444;",
    text: "你推开门。\n发电机还在嗡嗡地转，昏黄的灯泡把冷库照得惨白。方姐背对着你，蹲在冷藏柜前——听到门响，她没有回头。\n“来了。”她的声音像是从喉咙深处挤出来的，又哑又黏。\n她慢慢站了起来，转过身。\n那张脸——围裙、汗珠、疲惫的笑容，全都不见了。皮肤泛着一层死灰，眼珠浑浊，泛着幽幽的绿光。她手里握着那把砍骨刀。\n你这才看清，她围裙底下的手臂上，有一道已经发黑溃烂的咬痕。\n她一直都知道。\n“……对不起。”她最后说了一句人话，然后朝你扑了过来。\n\n—— 结局：交易终止 ——"
  }

});
