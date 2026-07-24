// -------- 小区东门的全家便利店 --------

Object.assign(storyData, {
  "全家便利店（环林东路）": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/小区周边/全家和公交站/全家便利店门口-night.png";
      return "images/小区周边/全家和公交站/全家便利店门口.png";
    },
    onEnter: function(vars) {
      vars.currentPlace = "初始小区";
      vars.currentPos = "全家便利店";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      return "你来到了全家便利店。\n<span style='font-weight: bold;'>全家熟悉的专属开门声音传来，门缓缓打开。</span>\n也许你可以吃一些东西垫垫肚子。\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "进去看看",
        nextScene: "全家便利店内部"
      },
      {
        text: "转身离开",
        nextScene: "小区东门-整装待发"
      },
      sprintAway(["小区东门-整装待发", "公交车站（环林东路）"])
    ]
  },

  "全家便利店内部": {
    image: "images/小区周边/全家和公交站/全家便利店内部.png",
    text: function(vars) {
      var base = "你走进熟悉又陌生的便利店。\n\
前面的冷藏区放着一些牛奶、鲜肉盒、饮料，以及你常买来作为早餐的饭团。\n\
中间的货架上排满了面包，以及薯片、糖果等各种零食。\n\
柜台没有人，只有显示屏循环播放着会员套餐的广告。";
      if (vars._visit["全家便利店（环林东路）"] && vars.hasBiscuit) {
        base += "\n<span style='color: #aaa;'>上次那只丧尸已经不在了。柜台后面的员工通道半开着，里面黑漆漆的，也许有什么有用的东西。</span>";
      }
      return base;
    },
    choices: [
      {
        showCondition: "!_visit['全家-吃零食']",
        text: "吃零食",
        nextScene: "全家-吃零食"
      },
      {
        showCondition: "!_visit['全家-吃面包']",
        text: "吃面包",
        nextScene: "全家-吃面包"
      },
      {
        showCondition: "!_visit['全家-吃饭团']",
        text: "吃饭团",
        nextScene: "全家-吃饭团"
      },
      {
        showCondition: "!_visit['全家-喝饮料腹泻']",
        text: "喝饮料",
        nextScene: "全家-喝饮料腹泻"
      },
      {
        showCondition: "hasTorch",
        text: "打手电筒探索员工通道",
        condition: "_visit['全家便利店-饼干引路']",
        nextScene: "全家便利店-员工通道",
        effect: updateTime(2),
        elseScene: "结局-全家便利店-员工通道-丧尸的偷袭"
      },
      {
        showCondition: "!hasTorch",
        text: "摸黑探索员工通道",
        nextScene: "全家便利店-员工通道-摸黑",
        effect: updateTime(2)
      }
    ]
  },

  "结局-全家便利店-员工通道-丧尸的偷袭": {
    image: "images/zombieKnockYouDown.png",
    text: "你走进员工通道，里面是一个小仓库，货架都空了，冷库里只有些零星的冰棍和奶制品，而且已经停电了，估计都不能吃了。\n\
你转身看看别处，手电筒的光照亮了货架深处，一只丧尸的脸出现在你面前。\n\
刚想找武器，脚下踩到一块纸皮，嘎吱一声，那只丧尸已如鬼魅般闪现到你的面前。\n\
—— 结局：你太慢啦 ——",
  },

  "全家-吃零食": {
    image: "images/placeholder.png" /* TODO: images/小区周边/全家和公交站/零食.png */,
    onEnter: updateTime(1, { add : { strength: 1 } }),
    text: "薯片在你口中嘎嘣作响，嗯，真好吃。\n\
突然，员工通道的门被一只丧尸撞开了。它双眼通红，眼神呆滞地盯着你，好像眼力不太好。\n\
<span style='font-style: italic;'>这么快的吗？</span>\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>\n\
你选择？", // 迅捷丧尸，速度快，对声音灵敏，
    choices: [
      {
        text: "跑！",
        nextScene: "你太慢啦"
      },
      {
        text: "躲到货架后面",
        condition: "hasDiary",
        nextScene: "躲在货架后",
        elseScene: "脚步声太大啦"
      },
      {
        showCondition: "hasIronPipe",
        text: "用钢管打它",
        nextScene: "邦邦邦"
      },
      {
        text: "朝店里另一个方向丢出你的零食",
        nextScene: "丧尸被零食引开"
      },
      {
        showCondition: "hasBiscuit",
        text: "掏出饼干丢出去！",
        nextScene: "全家便利店-饼干引路",
        effect: updateTime(1, { set: { hasBiscuit: false }, add: { itemCount: -1 } })
      }
    ]
  },

  "邦邦邦": {
    text: "你用钢管打它，它好像很抗揍，并没有倒下，向你扑了过来。而你的钢管已经出现了裂纹，真是粗制滥造！",
    choices: [
      {
        text: "打头",
        nextScene: "被丧尸咬",
        effect: { add : { strength: -2 } }
      },
      {
        text: "打身体",
        nextScene: "被丧尸咬",
        effect: { add : { strength: -2 } }
      },
      {
        text: "打腿",
        nextScene: "棒打丧尸腿",
        effect: { add : { strength: -1, itemCount: -1 }, set: {hasIronPipe: false} } // 钢管被打坏，失去
      }
    ]
  },

  "被丧尸咬": {
    image: "images/placeholder.png" /* TODO: images/grappleWithZombie.png */,
    onEnter: updateTime(1, { set : { hurtByZombie: true, FamilymartHasZombie: false } }),
    text: "你狠狠揍了丧尸几拳，它掐住你的脖子，和你纠缠在地上。你努力控住它的嘴，砰！砰！砰！终于，它倒下了，但你身上多了不少抓痕和咬痕，不知道有没有受伤。",
    choices: [
      {
        text: "继续",
        nextScene: "整理整理"
      }
    ]
  },

  "丧尸被零食引开": {
    text: "你丢出零食，薯片在地上发出清脆的响声。丧尸像发现了猎物一般扑了过去。",
    qte: {
      timeOut: 7000,
      onTimeout: "结局-被丧尸扑倒咬死"
    },
    choices: [
      {
        text: "快走吧",
        nextScene: "结局-你太慢啦"
      }
    ]
  },

  "结局-你太慢啦": {
    image: "images/zombieKnockYouDown.png",
    text: "你抬脚准备离开，那只丧尸转过身来，像一道闪电一样闪现到你面前。\n\
<span style='color: red; font-weight: bold;'>GAME OVER</span>\n\n—— 结局：你太慢啦 ——"
  },

  "结局-脚步声太大啦": {
    image: "images/zombieKnockYouDown.png",
    text: "你转身躲了起来，大气也不敢喘，缓慢地向门口挪动身子。\n\
突然，脚下的地板发出嘎吱一声。\n\
那只丧尸蹭的一下直起身来，猛地向你的位置扑来。\n\
你被咬死了。\n\n—— 结局：脚步声太大啦 ——"
  },

  "躲在货架后": {
    image: "images/placeholder.png" /* TODO: images/hide.png */,
    onEnter: updateTime(1),
    text: "你转身躲在货架后面，大气也不敢喘，缓慢地向门口挪动身子。\n\
突然，日记本从兜里掉了出来，噗地一声落地。\n\
只是轻轻的一声，那只丧尸动作突然停了下来，像是有所察觉，向你缓缓走来。\n\
",
    qte: {
      timeOut: 5000,
      onTimeout: "结局-被丧尸扑倒咬死"
    },
    choices: [
      {
        showCondition: "Math.random() < 0.5", // 50%概率允许查看日记本
        text: "查看日记本",
        nextScene: "日记本的提示-迅捷丧尸",
        effect: updateTime(1)
      },
      {
        text: "跑！",
        nextScene: "结局-你太慢啦"
      },
    ]
  },

  "日记本的提示-迅捷丧尸": {
    image: "images/小区周边/全家和公交站/diary-fastZombie.png",
    text: "你打开了日记本，上面赫然多了一页日记：\n\
7/15 傍晚 空气里有股腥臭味\n\
今晚八点零三分，我躲在一栋单单元门里。\n\
我想绕开小区主路那些游荡的东西，从号底层下的单元门钻进去，打算穿过楼道走到另一头。刚进门，迎面就撞上一只……\n\
它趴在楼梯口，背对着我，嘴里嘎吱嘎吱，像是在咀嚼什么。我屏住呼吸，慢慢退了一步，脚后跟却不争气地蹭了一下地砖——就那一声细微的摩擦，它猛地转过头来，一对灰白色的眼珠直直锁定\n了\n我\n。\n\
它的速度太快了。我根本来不及跑，它几步就窜到我面前，手指差点划到我脖子。我条件反射地把背包挡了一下，借机转身冲进旁边的楼道。\n\
我躲进二楼一户人家的厨房，蹲在橱柜后面，大气都不敢喘。我等了半个小时，它还是没走，哦不，看来这本日记要就此停止了。\n\
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\
我想了个办法：我摸到一个保温杯，从门缝里用力扔出去，砸在走廊尽头的墙上。杯子碎了，发出挺大的动静。可它没有往那边去。\n\
它反而更快地朝我藏身的位置冲来。\n\
它的听力不是普通的敏锐，它能分辨声源的位置。不管我往哪儿扔东西，它都能判断出我发出的声音和我制造的声响来自一个不同的方向。只要我弄出声，它就一定能，找到我。\n\
它撞开了厨房门，我情急之下抄起旁边一根像拖把杆的铁管，狠狠挥了过去。没打到头，却砸中了它的膝盖骨。\n\
只听得“咔嚓”一声，它那条腿反折成一个不正的角\n它\n身\n子\n重\n重\n地\n摔\n在\n地\n上\n。\n\
可它还在爬，朝着我的方向，用指甲抠着地砖，一条腿拖着，另一条腿已经废了。我绕开它的抓取范围，又补了几下，直到它彻底爬不动为止。\n\
我瘫坐在地上，喘了很久。[全文完]\n\
\n\
而此时，丧尸已经冲到你眼前。",
    choices: [
      {
        text: "打头",
        nextScene: "一拳KO",
        effect: { add : { strength: -3 } }
      },
      {
        text: "打身体",
        nextScene: "被丧尸咬",
        effect: { add : { strength: -2 } }
      },
      {
        text: "打腿",
        condition: "hasIronPipe",
        nextScene: "棒打丧尸腿",
        elseScene: "被丧尸咬"
      }
    ]
  },

  "一拳KO": {
    image: "images/placeholder.png" /* TODO: images/小区周边/全家和公交站/pipeAttack.png */,
    onEnter: { set: { FamilymartHasZombie: false} },
    text: "你猛地出拳，正中丧尸面门，右手生疼，而丧尸已经倒地不起。\n\
一个牌子掉在了地上，你伸手捡起。这应该是它的工牌，它是这里的实习店员，估计早上一开业就被咬了。",
    choices: [
      {
        text: "拿上工牌",
        nextScene: "小区东门-整装待发",
        effect: updateTime(1)
      },
      {
        text: "继续",
        nextScene: "整理整理"
      }
    ]
  },

  "棒打丧尸腿": {
    image: "images/placeholder.png" /* TODO: images/小区周边/全家和公交站/pipeAttack.png */,
    onEnter: { set: { FamilymartHasZombie: false} },
    text: "你回手掏出钢管，狠狠地抽在它腿上。只听得嘎吱一声脆响，不知是钢管还是它骨头断裂的声音。那只丧尸已经瘫倒在了地上，像一条扭曲的蛆在蠕动。\
一个牌子掉在了地上，你伸手捡起。这应该是它的工牌，它是这里的实习店员，估计早上一开业就被咬了。",
    choices: [
      {
        text: "拿上工牌",
        nextScene: "小区东门-整装待发",
        effect: updateTime(1)
      },
      {
        text: "继续",
        nextScene: "整理整理"
      }
    ]
  },

  "全家-吃面包": {
    image: "images/小区周边/全家和公交站/面包.png",
    onEnter: updateTime(5, { set : { strength: 10 } }), // 体力回满
    text: "你吃了一些面包，感觉肚子有了一些能量。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复了大量体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "回小区门口",
        nextScene: "小区东门-整装待发"
      }
    ]
  },

  "全家-吃饭团": {
    image: "images/小区周边/全家和公交站/饭团.png",
    onEnter: updateTime(5, { set : { strength: 10 } }), // 体力回满
    text: "你吃了一些饭团，感觉肚子有了一些能量。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复了大量体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "回小区门口",
        nextScene: "小区东门-整装待发"
      }
    ]
  },

  "全家-喝饮料腹泻": {
    image: "images/小区周边/全家和公交站/公厕里的丧尸.png",
    onEnter: updateTime(2),
    text: "你随手从冰柜里抓起一瓶冰凉的柠檬水，咕嘟咕嘟一饮而尽。片刻之后，你感觉胃部传来一阵绞痛。\n\
——你已经一个早上没吃饭了，现在这么快灌下去，怕是又要拉肚子了。\n\
你窜出店找到一个小小的洗手间，打开门，\n\
<span style='font-weight: bold;'>一只丧尸在盯着你。</span>"
  },

  "公交车站（环林东路）": {
    image: function(vars) {
      if (vars.weather === "雨") {
        var f = timeImage({
        morning: "images/小区周边/全家和公交站/公交车站-雨天.png",
        evening: "images/小区周边/全家和公交站/公交车站-雨天-evening.png",
        night: "images/小区周边/全家和公交站/公交车站-雨天-night.png",
        midnight: "images/小区周边/全家和公交站/公交车站-雨天-midnight.png"
        });
        return f(vars);
      }
      var f = timeImage({
        morning: "images/小区周边/全家和公交站/公交车站.png",
        evening: "images/小区周边/全家和公交站/公交车站-evening.png",
        night: "images/小区周边/全家和公交站/公交车站-night.png",
        midnight: "images/小区周边/全家和公交站/公交车站-midnight.png"
      });
      return f(vars);
    }, /* TODO: images/小区周边/全家和公交站/bus.png */
    onEnter: function(vars) {
      vars.positionAfterOperation = "三林路-环林东路 十字路口";
      vars.currentPlace = "初始小区";
      vars.currentPos = "公交站";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      return "你来到了公交车站。\n那辆1003的车窗反射着日光，让你的眼睛不太舒服。窗内有群人影在蠕动，想都不用想就知道是丧尸。\n车门关着，所以你不会被它们围殴，问题不大。\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "继续前进",
        nextScene: "三林路-环林东路 十字路口"
      },
      {
        text: "打开巴士门",
        condition: "strength >= 5",
        nextScene: "直面尸潮",
        elseScene: "结局-被尸潮群殴"
      },
      sprintAway(["三林路-环林东路 十字路口", "小区东门-整装待发"])
    ]
  },

  "结局-被尸潮群殴": {
    image: "images/zombiesBeatYou.png",
    text: "<span style='color: #ff4444; font-weight: bold;'>丧尸一拥而上，把你撕成了碎片。</span>\n\n—— 结局：被尸潮群殴 ——"
  },

  // ========== 饼干引路 + 员工通道 ==========

  "全家便利店-饼干引路": {
    image: "images/placeholder.png" /* TODO: images/小区周边/全家和公交站/饼干引路.png */,
    text: "你从口袋里掏出那包饼干，撕开包装，用力朝员工通道的方向扔了过去。\n\
饼干砸在金属门上，碎屑四溅。那只迅捷丧尸的注意力瞬间被吸引——它像一道闪电般扑向声音的来源，一头扎进了黑漆漆的员工通道。\n\
紧接着，通道深处传来咣当一声巨响——它似乎撞翻了什么重物，然后是一阵杂乱的刮擦声……渐渐安静了下来。\n你等了几秒，确认它没有回来。员工通道的门半开着，里面一片漆黑。",
    choices: [
      {
        showCondition: "hasTorch",
        text: "打手电筒进去看看",
        nextScene: "全家便利店-员工通道",
        effect: updateTime(2)
      },
      {
        text: "摸黑进去看看",
        nextScene: "全家便利店-员工通道-摸黑",
        effect: updateTime(2)
      },
      {
        text: "趁现在赶紧走",
        nextScene: "小区东门-整装待发"
      }
    ]
  },

  "全家便利店-员工通道": {
    image: "images/placeholder.png" /* TODO: images/小区周边/全家和公交站/员工通道.png */,
    onEnter: function(vars) {
      vars.positionAfterOperation = "全家便利店-员工通道";
      return updateTime(3)(vars);
    },
    text: "你打开手电筒，一道光束劈开黑暗。\n员工通道比你想象的要深。那只迅捷丧尸倒在走廊尽头——它撞翻了一个堆满饮料瓶的铁架，被压在下面动弹不得，只能冲你发出微弱的嘶吼。\n\
你小心地绕过它。走廊两侧是储物柜和杂物间。其中一个储物柜的门虚掩着，锁上还插着一把钥匙。\n你拉开柜门，里面挂着一件员工外套。你翻了翻口袋——一把钥匙掉了出来，不知道是开什么的。",
    choices: [
      {
        showCondition: "!hasDoorKey1",
        text: "拿上钥匙",
        condition: "itemCount < bagVolume",
        nextScene: "小区东门-整装待发",
        effect: updateTime(1, { set: { hasDoorKey1: true }, add: { itemCount: 1 } }),
        elseScene: "整理整理"
      },
      {
        showCondition: "hasDoorKey1",
        text: "已经有钥匙了，离开",
        nextScene: "小区东门-整装待发"
      },
      {
        showCondition: "itemCount >= bagVolume",
        text: "背包满了，先整理一下",
        nextScene: "整理整理"
      }
    ]
  },

  "全家便利店-员工通道-摸黑": {
    image: "images/placeholder.png" /* TODO: images/小区周边/全家和公交站/员工通道-暗.png */,
    onEnter: function(vars) {
      if (vars.FamilymartHasZombie) {
        return initMemoryGame(["红","蓝","绿"], 9)(vars);
      }
      return updateTime(3, { add: { strength: -1 } })(vars);
    },
    text: function(vars) {
      if (vars.FamilymartHasZombie) {
        return "你摸黑走进员工通道。太暗了，只能用手扶着墙慢慢往前挪。\n脚下突然踩到什么东西——咔嚓一声，像是一包薯片被你踩碎了。\n\
你心里一紧。黑暗中，你听到了呼吸声。\n不是你的。\n一道黑影从走廊深处猛地窜了出来——是只丧尸！它刚才被你的脚步声吸引，一直在黑暗中等你。它的速度快得惊人，灰色的身影在黑暗中几乎看不清轨迹。\n\
<span style='color: #ffaa00;'>你必须在一瞬间判断它的攻击方向！</span>";
      }
      return "你摸黑走进员工通道。太暗了，只能用手扶着墙慢慢往前挪。\n上次那只迅捷丧尸已经不在了，走廊里很安静，只有你自己的呼吸声。\n你在走廊里摸索了半天，只找到几件挂在墙上的旧工作服和一个上锁的储物柜。\n<span style='color: #888;'>也许下次带个手电筒来会有收获。</span>";
    },
    choices: [
      {
        showCondition: "FamilymartHasZombie",
        text: "输入你看到的颜色分布（例如：3红3蓝3绿）",
        input: { placeholder: "例如：3红3蓝3绿" },
        condition: checkFlashAnswer,
        elseScene: "结局-员工通道-迅捷丧尸咬死",
        effect: updateTime(2, { add: { strength: -1 } }),
        nextScene: "全家便利店-员工通道-踢飞丧尸",
        timeout: 10000,
        timeoutScene: "结局-员工通道-迅捷丧尸咬死"
      },
      {
        showCondition: "!FamilymartHasZombie",
        text: "摸回去",
        nextScene: "全家便利店内部"
      }
    ]
  },

  "全家便利店-员工通道-踢飞丧尸": {
    image: "images/placeholder.png" /* TODO: images/小区周边/全家和公交站/员工通道-暗.png */,
    onEnter: updateTime(1, { set: { FamilymartHasZombie: false } }),
    text: "你在黑暗中精准地预判了它的扑击轨迹——侧身一闪，它擦着你的肩膀扑了个空，一头撞在了走廊的金属货架上，发出沉闷的巨响。\n趁它还没爬起来，你飞起一脚狠狠踹在它身上，把它踢回了员工通道深处。货架上的纸箱哗啦啦地塌了下来，暂时压住了它。\n你抓住这个间隙，一把拉上员工通道的门，用身体死死顶住。\n砰——门那边传来猛烈的撞击声。又是一下。然后安静了。\n你靠着门大口喘气，心脏快要跳出胸腔。几秒后，你抹黑退了出来，回到了便利店。",
    choices: [
      {
        text: "快离开这里",
        nextScene: "全家便利店（环林东路）"
      }
    ]
  },

  "结局-员工通道-迅捷丧尸咬死": {
    image: "images/zombieKnockYouDown.png",
    text: "黑暗中你根本无法判断它从哪个方向扑来。\n迅捷丧尸在黑暗中的速度快得超乎想象——你甚至没来得及举起手臂格挡，它已经把你扑倒在地。\n你的最后记忆是它冰冷的牙齿刺入你的脖子。\n\n—— 结局：员工通道的迅捷丧尸 ——"
  },


});