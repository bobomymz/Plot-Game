// ========== 金谊广场.js ==========
// 金谊广场（上南路4677号，11号线三林站旁）
// 东明街道西界，半开放龙头区 + 垂直商场 + 幸存者据点 + 个人记忆密集区

Object.assign(storyData, {

  // ==================== 龙头区 ====================

  "金谊广场-龙头区": {
    image: timeImage({
      morning: "images/placeholder.png" /* TODO: images/金谊广场/龙头区.jpg */,
      night: "images/placeholder.png" /* TODO: images/金谊广场/龙头区-night.jpg */
    }),
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.currentArea = "周边社区";
      vars.currentPlace = "金谊广场";
      vars.currentPos = "龙头区";
      return {};
    },
    text: function(vars) {
      var desc = "你来到了金谊广场的龙头区。";
      if (vars._visit['新达汇-喷泉广场'] > 0) {
        desc += "这里和新达汇不一样——头顶有挑高的玻璃顶棚，阳光从缝隙里漏下来，在地上投出斑驳的光影。风是通的，穿过架空的天桥和半开放的走廊，吹得地上的碎纸屑轻轻打转。\n";
      } else {
        desc += "头顶有挑高的玻璃顶棚，阳光从缝隙里漏下来，在地上投出斑驳的光影。风是通的，穿过架空的天桥和半开放的走廊，吹得地上的碎纸屑轻轻打转。\n";
      }
      desc += "远远能听到小河流水的声音——那条河把龙头区和商场主体隔开了。河对岸的商场大楼沉默地矗立着，玻璃幕墙反射着苍白的天光。旁边地铁站的入口黑洞洞的，像怪兽的巨口。";
      desc += "\n" + describeWeather(vars);
      return desc;
    },
    choices: [
      {
        text: "去地铁站",
        nextScene: "金谊广场-地铁站厅",
        effect: updateTime(2)
      },
      {
        text: "去龙头区长廊",
        nextScene: "金谊广场-龙头区长廊",
        effect: updateTime(2)
      },
      {
        text: "去足球场",
        nextScene: "金谊广场-足球场",
        effect: updateTime(2)
      },
      {
        text: "去地面停车场",
        nextScene: "金谊广场-地面停车场",
        effect: updateTime(2)
      },
      {
        text: "去正门",
        nextScene: "金谊广场地面入口",
        effect: updateTime(3)
      },
      {
        text: "离开金谊广场",
        nextScene: "三林路-东明路 十字路口",
        effect: updateTime(30)
      }
    ]
  },

  // --- 龙头区长廊（幸存者据点） ---
  "金谊广场-龙头区长廊": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/龙头区长廊.jpg */,
    onEnter: function(vars) {
      vars.showRain = true;
      // 从奥乐齐带食物回来时触发交付判定（不清除标记，留给 text 展示交付瞬间）
      if (vars._jinyiHasFoodForSurvivors && !vars._jinyiSurvivorsFed && !vars._jinyiSurvivorsRobbed) {
        if (vars.hurtByZombie) {
          vars._jinyiSurvivorsRobbed = true;
          return { add: { strength: -1 } };
        } else {
          vars._jinyiSurvivorsFed = true;
          return {};
        }
      }
      return {};
    },
    text: function(vars) {
      var desc = "你走向龙头区的长廊。这是一条有顶的走廊，跨过小河通向商场3F。\n";
      if (vars._jinyiHasFoodForSurvivors) {
        // 交付瞬间——展示食物交付的剧情，然后清除标记
        desc += "你带着从B1奥乐齐找到的食物回到长廊。那个中年男人看到你手里的东西，眼睛亮了一下。\n";
        if (vars.hurtByZombie) {
          desc += "他打量了你一眼——目光在你手臂的伤口上停了一下。然后他的表情变了。\n";
          desc += "“你受伤了。”他说，语气不再是刚才的平淡。他身后几个人也站了起来。\n";
          desc += "你还没反应过来，他们就把你手里的食物抢了过去。有人推了你一把，你踉跄着退出了长廊。\n";
          desc += "“对不起。”那个中年男人说，但他没有看你。他已经在分食物了。\n";
          desc += "长廊的门在你面前关上了。";
        } else {
          desc += "“好。”他点了点头，跟身后的人打了个手势。货架被挪开了一条缝，刚好够一个人侧身通过。\n";
          desc += "“说话算话。你过去吧。”\n他把食物接过去，冲你点了点头。这一次，点头里有一点温度。\n长廊的门为你打开了。";
        }
        vars._jinyiHasFoodForSurvivors = false; // 交付剧情已展示，清除标记
      } else if (vars._jinyiSurvivorsFed) {
        desc += "上次你带回的食物让幸存者们放了行。他们还记得你——有人冲你点了点头。长廊的门为你开着。";
      } else if (vars._jinyiSurvivorsRobbed) {
        desc += "你想起上次的情景，手臂上的伤还在隐隐作痛。长廊的门依然关着，但你知道——不止这一条路能进商场。";
      } else {
        desc += "长廊的入口被超市货架和几张倒放的桌子堵死了，只留了一条窄缝。货架后面能看到人影在走动——有人在守着。\n";
        desc += "你走近时，一个中年男人从货架后面探出头来，上下打量了你一眼。\n";
        desc += "“我们这里食物不够。”他说，语气不算凶，但也不算友善。“B1有个奥乐齐，你要是能弄到吃的带回来，我们就让你过去。去奥乐齐的路线——不管走正门还是地铁站，都不好走。但这是唯一的条件。”\n";
        desc += "你往里面瞄了一眼——约莫七八个人，围坐在奥乐齐的购物车和纸箱之间。有老人，也有小孩。";
      }
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      if (vars._jinyiSurvivorsFed) {
        choices.push({ text: "穿过长廊去3F", nextScene: "金谊广场-3F", effect: updateTime(2) });
      }
      if (!vars._jinyiSurvivorsFed && !vars._jinyiSurvivorsRobbed && !vars._jinyiHasFoodForSurvivors) {
        choices.push({ text: "去B1奥乐齐找食物", nextScene: "金谊广场-龙头区", effect: updateTime(1) });
      }
      if (vars._jinyiSurvivorsRobbed) {
        choices.push({ text: "转身离开", nextScene: "金谊广场-龙头区", effect: updateTime(1) });
      }
      choices.push({ text: "离开长廊", nextScene: "金谊广场-龙头区", effect: updateTime(1) });
      return choices;
    }
  },

  // --- 足球场（U-ball 个人记忆） ---
  "金谊广场-足球场": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/足球场.jpg */,
    onEnter: function(vars) {
      vars.personalMemorySet.add("U-ball");
      return {};
    },
    text: function(vars) {
      var desc = "你走到龙头区一侧的足球场。场地不大，人造草皮已经褪色发白，边线几乎看不清了。\n";
      desc += "球门锈得厉害，横梁上的白漆剥落了一大半。但你还是能认出那行字——\n";
      desc += "<em>U-ball 足球俱乐部</em>——字迹已经模糊了，最后一个“部”字只剩了半边。\n";
      desc += "你小时候每周六都来这里上足球课。妈妈就坐在场地边的台阶上，一边看手机一边等你。\n";
      desc += "俱乐部早就倒闭了。球门后面堆着几卷废弃的人工草皮和两个漏气的足球。\n";
      desc += "你站在锈掉的球门前，风从河边吹过来，带走了你脑海里最后一丝关于“那个周六”的画面。\n";
      desc += "<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得记忆[U-ball]——有些东西你以为永远不会忘，但等你再回来时，它已经不在了。</span>";
      return desc;
    },
    choices: [
      { text: "离开足球场", nextScene: "金谊广场-龙头区", effect: updateTime(1) }
    ]
  },

  // --- 吉祥馄饨（陈默旧店） ---
  "金谊广场-吉祥馄饨": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/吉祥馄饨.jpg */,
    text: function(vars) {
      if (vars.dd == 1) {
        var desc = "你推开吉祥馄饨半掩的卷帘门。店里不大——四张桌子、一个收银台、开放式厨房的灶台上还留着经年累月的油渍。\n";
        desc += "墙上贴着一张褪色的价目表，最下面一行用圆珠笔加了一行字——“荠菜鲜肉（新品）”。笔迹和价目表上印的字不一样，是一个人手写的。\n";
        desc += "一个戴着鸭舌帽的黑衣人蹲在厨房角落，正在翻一个旧纸箱。听到脚步声，他吓得一激灵，转过身警惕地看着你。\n";
        if (vars._chenmoRescued) {
          desc += "\n他嘴角微微动了一下——上次你帮他杀出停车场之后，他对你的态度明显不一样了。“好兄弟，你来啦？”";
        }
        else if (vars._visit['初遇陈默']) {
          desc += "\n他盯着你看了两秒，忽然认出来了——“是你？在小区里救了你，你居然也杀到这来了。”";
        }
        else desc += "“呦，竟然是个活人。”";
        return desc;
      } else {
        return "吉祥馄饨的卷帘门锁死了。你透过门缝往里看——桌椅还在，灶台还在，墙上的价目表还在。但厨房角落那个旧纸箱不见了。\n地上只剩一层薄灰，和几个模糊的脚印。\n有人来过，然后走了。";
      }
    },
    choices: function(vars) {
      if (vars.dd == 1) {
        var cs = [
          { text: "跟他聊聊", nextScene: "金谊广场-吉祥馄饨-聊", effect: updateTime(3) },
          { text: "看看店里", nextScene: "金谊广场-吉祥馄饨-看", effect: updateTime(2) }
        ];
        if (vars._visit['金谊广场-吉祥馄饨-聊'] > 0 && !vars._chenmoRescued) {
          cs.push({ text: "带他杀出停车场", nextScene: "金谊广场-吉祥馄饨-杀出去", effect: updateTime(2) });
        }
        var wontonLabel = vars._visit['金谊广场-吉祥馄饨-聊'] > 0 ? "让陈默煮碗馄饨" : "让他帮忙煮碗馄饨";
        cs.push({ text: wontonLabel, nextScene: "金谊广场-吉祥馄饨-吃馄饨", effect: updateTime(2), showCondition: "!_visit['金谊广场-吉祥馄饨-吃馄饨']" });
        cs.push({ text: "离开", nextScene: "金谊广场-地面停车场", effect: updateTime(1) });
        return cs;
      } else {
        return [
          { text: "跟他聊聊", nextScene: "金谊广场-吉祥馄饨-聊", effect: updateTime(3) },
          { text: "看看店里", nextScene: "金谊广场-吉祥馄饨-看", effect: updateTime(2) },
          { text: "离开", nextScene: "金谊广场-地面停车场", effect: updateTime(1) }
        ];
      }
    }
  },

  "金谊广场-吉祥馄饨-聊": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/吉祥馄饨.jpg */,
    text: function(vars) {
      var desc = "他从纸箱里翻出一个防水袋，里面装着一把旧菜刀和几包密封的调料。他把菜刀别在腰上，调料塞进背包。\n";
      desc += "“你还能找到这里，”他看了你一眼。“那就继续活下去吧。”\n";
      desc += "他把背包拉链拉上，站起来，这才正眼看了看你。\n";
      desc += "“我叫陈默。”他说。就三个字，没有握手，没有寒暄——像是觉得名字就够了。\n";
      desc += "他告诉你，这家馄饨店是他以前开的，后来倒闭了。他在这附近跑了五年外卖，哪条路能走、哪条路堵了、哪条路有丧尸，他比导航还清楚。\n";
      desc += "“龙头区那边有一群幸存者，堵在长廊里。他们不坏，但也不傻——想过去，就得拿东西换。”\n";
      desc += "他瞥了一眼门外——停车场方向的丧尸还在河岸边挤作一团。\n";
      if (vars._visit['初遇陈默']) {
        desc += "”有长进了嘛，之前你差点在家门口被干掉。搭把手，咱一起出去？”\n";
      }
      else {
        desc += "“外面那些东西，我一个人冲不出去，我手伤了。你能杀进来，说明你有点本事。”他顿了顿，把菜刀握紧了些。\n";
        desc += "“帮我冲出去，我欠你一个人情。”\n";
      }
      if (vars._jinyiSurvivorsRobbed) {
        desc += "\n他看了一眼你手臂上的伤——目光停了一下。\n";
        desc += "“你手上的伤……是长廊那群人？”他的语气变了，比刚才冷了一点。\n";
        desc += "你没说话，但沉默本身就是回答。\n";
        desc += "他把菜刀插回腰间，动作很慢。“停车场那边别去，——这些，幸存者，不值得你同情。”\n";
        desc += "他顿了顿。“高青路那边，有人偷了我的东西，我带在电动车上的救命物资。我救过那个人。我他妈……”\n";
        desc += "他没有继续往下说。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_chenmoRescued",
        text: "带他杀出停车场",
        nextScene: "金谊广场-吉祥馄饨-杀出去",
        effect: updateTime(2)
      },
      {
        text: "我还是自己走吧",
        nextScene: "金谊广场-地面停车场",
        effect: updateTime(1)
      },
      {
        text: "看看店里",
        nextScene: "金谊广场-吉祥馄饨-看",
        effect: updateTime(2)
      },
    ]
  },

  "金谊广场-吉祥馄饨-看": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/吉祥馄饨.jpg */,
    text: "你在店里转了转。收银台的抽屉开着，里面只有几张皱巴巴的外卖小票——日期停在2020年4月。\n\
厨房的灶台上，排烟罩的边缘还挂着一层陈年油垢——是那种天天开火才会积出来的厚度。\n\
角落里放着一个保温杯，杯身上印的字已经磨得快看不清了——只剩一个模糊的“加油”和一颗褪色的红心。\n这是一家曾经有人认真经营过的店。",
    choices: function(vars) {
      var label = vars._visit['金谊广场-吉祥馄饨-聊'] > 0 ? "回去找陈默" : "回去找他";
      return [
        { text: label, nextScene: "金谊广场-吉祥馄饨-聊", effect: updateTime(1) },
        { text: "继续", nextScene: "金谊广场-吉祥馄饨", effect: updateTime(1) }
      ];
    }
  },

  "金谊广场-吉祥馄饨-吃馄饨": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/吉祥馄饨.jpg */,
    onEnter: updateTime(15, { add: { strength: 2 } }),
    text: function(vars) {
      if (vars._visit['金谊广场-吉祥馄饨-聊'] > 0) {
        return "你指了指灶台。“饿了，帮我煮碗馄饨？”陈默愣了一下，显然没想到你会在这种时候提这种要求。他沉默了两秒，还是走过去掀开冰柜——里面居然还有半袋冷冻的荠菜鲜肉馄饨。\n灶火重新点起来，热汤翻滚。他把一碗馄饨推到你面前，自己没动筷子。“我不饿，你吃。”\n你埋头吃了起来。荠菜的清香混着肉味，热汤顺着喉咙暖到胃里。这是末世里难得的一顿正经饭。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+2，当前体力：{strength}。</span>";
      }
      return "你指了指灶台，比划了一下煮馄饨的动作。那个戴鸭舌帽的黑衣人看了你一眼，没有拒绝——他走过去掀开冰柜，里面居然还有半袋冷冻的荠菜鲜肉馄饨。\n他沉默地生火、煮水、下馄饨，全程没说一句话。一碗热腾腾的馄饨端到你面前，他退开两步，继续蹲回角落翻他的旧纸箱。\n荠菜的清香混着肉味，热汤顺着喉咙暖到胃里。虽然对方态度冷淡，但这碗馄饨是真的。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+2，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "继续", nextScene: "金谊广场-吉祥馄饨", effect: updateTime(1) }
    ]
  },

  // --- 地面停车场（陈默被困） ---
  "金谊广场-地面停车场": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/地面停车场.jpg */,
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.showRain = true;
    },
    text: function(vars) {
      var desc = "你走进地面停车场。这里紧邻小河，空气中弥漫着潮湿的水汽和一股淡淡的腥味。\n";
      desc += "车辆成片停着，有几辆的轮胎已经泡在水里——河水漫过了堤岸的低处。\n";
      desc += "丧尸比你能想到的要多。它们沿着河岸挤在一起，有些半个身子浸在水里，朝着河水的方向缓缓挪动，像是在朝圣。\n";
      desc += "它们被水吸引。河岸是它们的走廊。\n";
      desc += "停车场尽头，吉祥馄饨的招牌歪歪斜斜地挂在墙上。卷帘门半拉着，里面透出一点微光。";
      desc += "\n" + describeWeather(vars);
      return desc;
    },
    choices: [
      { text: "搜刮车辆", nextScene: "金谊广场-停车场-搜刮", effect: updateTime(3) },
      { text: "去吉祥馄饨", nextScene: "金谊广场-吉祥馄饨", effect: updateTime(1) },
      { text: "去龙头区", nextScene: "金谊广场-龙头区", effect: updateTime(2) }
    ]
  },

  "金谊广场-吉祥馄饨-杀出去": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/地面停车场-战斗.jpg */,
    onEnter: initMemoryGame(["红","蓝","绿","黄","白"], 7, { set: { _chenmoRescued: true }, add: { strength: -1 } }),
    text: function(vars) {
      var desc = vars._visit['初遇陈默']
        ? "陈默把菜刀换到左手，给你腾出了空间——他朝你一点头，像是想起了当初在小区里救你的那一下。\n"
        : "陈默——现在你知道他的名字了——把菜刀换到左手，给你腾出了空间。\n";
      desc += "你们一起从吉祥馄饨的卷帘门里冲了出来。停车场的丧尸被你们的动静吸引，有几只从河边转过身来。\n集中注意力——看清它们的动作轨迹！";
      return desc;
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "金谊广场-停车场-救完",
        elseScene: "结局-被丧尸扑倒咬死",
        timeout: 20000,
        timeoutScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "金谊广场-停车场-救完": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/地面停车场.jpg */,
    text: function(vars) {
      var desc = "你和陈默合力清掉了挡路的几只丧尸。他靠在面包车上喘了几口气，用袖子擦了擦菜刀上的血。\n";
      if (vars._visit['初遇陈默']) {
        desc += "“在小区里你欠我一命，在停车场你救我一命。”他喘了几口气，目光在你脸上停了一瞬，“扯平了。”\n";
      }
      desc += "“你比我想的能打。”他看了你一眼，嘴角动了一下——可能是笑，也可能是别的什么。\n";
      desc += "他把菜刀收好，从口袋里掏出一张折得四四方方的纸——是一张手绘的地图，线条粗糙但标注很细。\n";
      desc += "“我跑了五年外卖，这张图是我唯一值钱的东西。”他把地图展开，指着其中几条线。“东明路往北那条消防通道，地图上没有，但能走。安居苑后门那条鹅卵石路，晚上没人。还有——高青路那边有条排水渠，记住了。”\n";
      desc += "他把地图折好，塞进你手里。“你救了我一次。这算还你的。”\n";
      desc += "<span style='color: #00fbffff; font-style: italic;'>【系统提示】陈默好感度提升。你获得了三林片区近道地图的一部分——某些路线的风险和耗时可能会降低。</span>";
      return desc;
    },
    choices: [
      { text: "继续", nextScene: "金谊广场-地面停车场", effect: updateTime(2) }
    ]
  },

  "金谊广场-停车场-搜刮": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/地面停车场.jpg */,
    text: function(vars) {
      if (vars._visit['金谊广场-停车场-搜刮'] > 1) {
        return "你又绕着停车场走了一圈。能拉的车门都拉过了——除了那辆老桑塔纳，其余的全锁着。\n河边丧尸的喉音似乎比刚才更近了。你不想在这里多待。";
      }
      return "你在车辆之间穿梭，试着拉了几扇车门。大部分都锁着，只有一辆老款桑塔纳的后备箱没锁——里面只有半瓶冻成冰的矿泉水和一件发霉的雨衣。\n你抬头看了看河边的丧尸群——它们还在往水边挤。你不想在这里多待。";
    },
    choices: [
      { text: "继续", nextScene: "金谊广场-地面停车场", effect: updateTime(1) }
    ]
  },

  // --- 金谊广场地面入口（正门） ---
  "金谊广场地面入口": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/地面入口.jpg */,
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.showRain = true;
    },
    text: function(vars) {
      var desc = "你来到金谊广场的正门。旋转门的一个格子里卡着一具尸体——它大概是被人群挤进去的，手臂以不自然的角度折在身后，脸上的皮肤已经干瘪发黑。\n";
      desc += "玻璃上全是血手印，层层叠叠，从里到外——有些人想进去，有些人想出来。\n";
      desc += "正门外的广场上，丧尸的密度比停车场还高。丧尸沿着河岸蔓延过来，把这片区域变成了一个天然的死亡陷阱。\n";
      desc += describeWeather(vars);
      return desc;
    },
    choices: [
      {
        text: "从旋转门挤进去",
        nextScene: "金谊广场-正门硬闯",
        effect: updateTime(2)
      },
      {
        text: "左转去地下车库入口",
        nextScene: "金谊广场-B2车库入口",
        effect: updateTime(3)
      },
      {
        text: "往东去新达汇（约30分钟）",
        nextScene: "新达汇车库出口",
        effect: updateTime(30)
      },
      {
        text: "退回龙头区",
        nextScene: "金谊广场-龙头区",
        effect: updateTime(3)
      }
    ]
  },

  // ==================== 硬闯线 ====================

  // --- 正门硬闯（记忆闪色，高难度） ---
  "金谊广场-正门硬闯": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/正门硬闯.jpg */,
    onEnter: initMemoryGame(["红","蓝","绿","黄","白"], 9, { add: { chasedByZombies: 1 } }),
    text: function(vars) {
      var desc = "你推着旋转门的扇格，从尸体和门框之间的缝隙挤了进去。\n";
      desc += "门内的丧尸听到了动静——它们从几个方向同时朝你围过来。中庭的空间很大，但你的退路只有身后那扇卡着尸体的旋转门。\n";
      desc += "集中注意力——在它们合围之前，看清每一只的动作轨迹！";
      return desc;
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "金谊广场-1F 门面层",
        elseScene: "结局-被丧尸扑倒咬死",
        timeout: 18000,
        timeoutScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  // --- B2车库入口（??? 盲选） ---
  "金谊广场-B2车库入口": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B2车库入口.jpg */,
    text: function(vars) {
      if (vars.hasTorch) {
        return "你找到了地下车库的入口。坡道向下延伸，越往里越黑。\n\
你打开手电筒——光束劈开黑暗，照亮了前方的岔路：左边是货梯间的方向，右边似乎是通往更深处的车道，正前方是一扇半开的消防门。";
      }
      return "你找到了地下车库的入口。坡道向下延伸，里面一片漆黑——伸手不见五指。\n\
你只能摸着墙壁慢慢往前走。脚下的地面湿漉漉的，踩上去有细碎的回声。\n黑暗中你摸到了岔路——但完全看不清哪条通向哪里。";
    },
    choices: function(vars) {
      if (vars.hasTorch) {
        return [
          { text: "去货梯间", nextScene: "金谊广场-B2货梯间", effect: updateTime(2) },
          { text: "去消防通道", nextScene: "金谊广场-B2摸到死路", effect: updateTime(1) },
          { text: "退回地面", nextScene: "金谊广场地面入口", effect: updateTime(2) }
        ];
      } else {
        return [
          { text: "???", nextScene: "金谊广场-B2货梯间", effect: updateTime(2) },
          { text: "???", nextScene: "金谊广场-B2摸到死路", effect: updateTime(1) },
          { text: "退回地面", nextScene: "金谊广场地面入口", effect: updateTime(2) }
        ];
      }
    }
  },

  "金谊广场-B2摸到死路": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B2车库-dark.jpg */,
    text: function(vars) {
      if (vars.hasTorch) {
        return "你推开门，手电筒的光束照亮了前方——消防通道的楼梯被坍塌的水泥块堵得严严实实，钢筋从碎块里戳出来，像一丛扭曲的枯枝。灰尘在光束里缓缓飘浮。\n只能原路返回。";
      }
      return "你摸到了一堵冰冷的混凝土墙——墙面粗糙，指尖划过时能感觉到裸露的钢筋茬。顺着墙摸了一圈，尽头是一堆坍塌的碎石，手掌按上去，细碎的沙粒簌簌往下掉。\n\
死路。空气中那股甜味似乎更浓了。你花了一些时间才摸回车库入口。";
    },
    choices: [
      { text: "返回", nextScene: "金谊广场-B2车库入口", effect: updateTime(1) }
    ]
  },

  "金谊广场-B2货梯间": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B2货梯间.jpg */,
    text: function(vars) {
      var desc = "你找到了货梯间。货梯的门开着，轿厢里的应急灯还亮着——发出微弱的黄光。\n";
      desc += "你注意到货梯间角落的通风口附近，有一层淡淡的白雾在缓缓飘动。\n";
      if (vars.hasGasMask && vars.maskRemainingUses > 0) {
        desc += "你戴上了防毒面具——活性炭滤层隔绝了那股甜味，呼吸变得安全了。\n货梯的按钮还亮着，似乎还能用。";
      } else {
        desc += "你感到一阵头晕——那股甜味越来越浓了。你的喉咙开始发紧，视野边缘在变暗。\n";
        desc += "货梯的按钮还亮着，但你已经没有力气去按了。";
      }
      return desc;
    },
    choices: function(vars) {
      if (vars.hasGasMask && vars.maskRemainingUses > 0) {
        return [
          { text: "坐货梯上1F", nextScene: "金谊广场-1F 门面层", effect: updateTime(2, { add: { maskRemainingUses: -1 } }) },
          { text: "深入B2车库探索", nextScene: "金谊广场-B2 地下车库", effect: updateTime(2) },
          { text: "退回车库入口", nextScene: "金谊广场-B2车库入口", effect: updateTime(2) }
        ];
      } else {
        return [
          { text: "挣扎着退回车库入口", nextScene: "金谊广场-B2车库入口", effect: updateTime(2, { add: { strength: -1 } }) },
          { text: "继续往里走", nextScene: "结局-汞中毒尸变", effect: updateTime(1) }
        ];
      }
    }
  },

  // --- 地铁站厅（QTE 闪避） ---
  "金谊广场-地铁站厅": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/地铁站厅.jpg */,
    text: function(vars) {
      var desc = "你从废墟的缝隙钻进了三林路地铁站的站厅。天花板塌了一半，裸露的钢筋像断裂的肋骨一样垂下来。\n";
      desc += "应急灯还在闪烁，把站厅照得一明一暗。\n";
      desc += "站厅里的丧尸比外面少——大部分都挤在靠近排水沟的一侧，朝着潮湿的方向缓慢挪动。但剩下的几只，足够要你的命。\n";
      desc += "你看到前方不远处就是通往B1商业街的通道——只要能冲过去。\n";
      desc += "左侧有动静——一只丧尸从售票机后面冲了出来！";
      return desc;
    },
    qte: {
      timeout: 5000,
      onTimeout: "金谊广场-地铁站厅-失败"
    },
    choices: [
      {
        text: "往右闪，冲向通道",
        nextScene: "金谊广场-B1 心谊如意街",
        effect: updateTime(2)
      }
    ]
  },

  "金谊广场-地铁站厅-失败": {
    image: "images/hurtByzombie.png",
    onEnter: { add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true } },
    text: "你慢了半拍——丧尸从侧面撞上了你，你们一起摔在站厅的瓷砖地上。\n它的指甲划破了你的手臂，你忍着痛一脚踹开它，爬起来跌跌撞撞冲进了通往B1的通道。\n你靠着通道的墙壁大口喘气，手臂上的抓伤火辣辣地疼。",
    choices: [
      { text: "继续前进", nextScene: "金谊广场-B1 心谊如意街", effect: updateTime(1) }
    ]
  },

  // ==================== 商场内部 ====================

  // --- 1F 门面层 ---
  "金谊广场-1F 门面层": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/1F中庭.jpg */,
    text: "你站在金谊广场一楼的中庭。穹顶很高，玻璃裂了几块，阳光从裂缝漏下来，在中庭地面投下一块晃动的光斑。\n中庭中央立着一块商场导航图，上面的楼层指示牌已经歪了，但还能辨认——\nB2 地下车库 / B1 心谊如意街 / 1F 门面层 / 2F 服装 / 3F 餐饮生活 / 4F 影院餐饮 / 5F 健身KTV\n正门方向的旋转门还在缓慢转动，发出吱嘎吱嘎的响声。旁边是一家肯德基，玻璃门碎了一半。",
    choices: [
      {
        text: "去肯德基",
        nextScene: "金谊广场-1F肯德基",
        effect: updateTime(1)
      },
      {
        text: "上2F",
        nextScene: "金谊广场-2F",
        effect: updateTime(2)
      },
      {
        text: "下B1",
        nextScene: "金谊广场-B1 心谊如意街",
        effect: updateTime(2)
      },
      {
        text: "从正门出去",
        nextScene: "金谊广场地面入口",
        effect: updateTime(2)
      }
    ]
  },

  "金谊广场-1F肯德基": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/1F肯德基.jpg */,
    text: function(vars) {
      var desc = "你走进肯德基。餐厅里一片狼藉——托盘和纸杯散落一地，点餐屏幕早就黑了。冰柜的门开着，化冻的水淌了一地，混着打翻的番茄酱，看起来像稀释的血。\n";
      desc += "你推开后厨的门。炸锅里的油已经凝固成一层白膜。\n";
      if (vars._visit['金谊广场-1F肯德基-吃鸡块'] > 0) {
        desc += "架子上只剩几包番茄酱——鸡块已经吃完了。光吃番茄酱可撑不了多久。";
      } else {
        desc += "架子上还有几包密封的番茄酱和两盒未开封的鸡块——冷冻的，还没坏。";
      }
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      if (!vars._visit['金谊广场-1F肯德基-吃鸡块']) {
        choices.push({ text: "吃点鸡块补充体力", nextScene: "金谊广场-1F肯德基-吃鸡块", effect: updateTime(3) });
      }
      choices.push({ text: "离开肯德基", nextScene: "金谊广场-1F 门面层", effect: updateTime(1) });
      return choices;
    }
  },

  "金谊广场-1F肯德基-吃鸡块": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/1F肯德基-吃鸡块.jpg */,
    onEnter: { add: { strength: 3 } },
    text: "你拆开一盒鸡块，撕开番茄酱的小包。\n冷掉了，但还能吃。你坐在油腻的地板上，把两盒鸡块一扫而光。\n胃里终于有了点实在的东西。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+3，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "金谊广场-1F肯德基", effect: updateTime(1) }
    ]
  },

  // --- 2F 服装层 ---
  "金谊广场-2F": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/2F服装.jpg */,
    text: "你走上二楼。这一层是服装区——几家品牌店的橱窗模特东倒西歪，有的被推倒在地上，身上还穿着当季的新款。\n自动扶梯旁边有一家源氏木语家具店，里面的沙发和床垫看起来还完好——在这末世里，一个能安心躺下的地方比什么都珍贵。\n更里面是一家运动品牌折扣店，货架上还挂着几排没拆标签的T恤和运动鞋。",
    choices: [
      {
        text: "在家具店休息一会儿",
        nextScene: "金谊广场-2F-休息",
        effect: updateTime(5, { add: { strength: 1 }, set: { _travelMinutes: 0 } })
      },
      {
        text: "去运动品牌店看看",
        nextScene: "金谊广场-2F-换装",
        effect: updateTime(1)
      },
      {
        text: "上3F",
        nextScene: "金谊广场-3F",
        effect: updateTime(1)
      },
      {
        text: "下1F",
        nextScene: "金谊广场-1F 门面层",
        effect: updateTime(1)
      }
    ]
  },

  "金谊广场-2F-休息": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/2F家具店.jpg */,
    text: "你在家具店的布艺沙发上躺了下来。末日里的商场比任何地方都安静——没有音乐、没有广播、没有人群的嘈杂声。\n你闭上眼睛，让自己沉进沙发里。就一会儿。",
    choices: [
      {
        text: "继续休息",
        nextScene: "金谊广场-2F-休息-休息完",
        effect: updateTime(30)
      },
      {
        text: "起来继续探索",
        nextScene: "金谊广场-2F"
      }
    ]
  },

  "金谊广场-2F-休息-休息完": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/2F家具店.jpg */,
    onEnter: { add: { strength: 1 }, set: { _travelMinutes: 0 } },
    text: "你在沙发上闭着眼睛躺了很久。不记得自己什么时候睡着的——也许只是一小会儿。\n当你睁开眼时，窗外透进来的光已经变了颜色。你活动了一下肩膀，站起来。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>",
    choices: [
      {
        text: "继续休息",
        nextScene: "金谊广场-2F-休息-休息完",
        effect: updateTime(30)
      },
      {
        text: "起来继续探索",
        nextScene: "金谊广场-2F"
      }
    ]
  },

  "金谊广场-2F-换装": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/2F运动店.jpg */,
    onEnter: { set: { positionAfterOperation: "金谊广场-2F-换装" } },
    text: function(vars) {
      var desc = "你走进运动品牌折扣店。货架上的衣服大多被翻乱了，但还有几件挂在角落里——没拆吊牌，尺码齐全。\n";
      desc += "你挑了几件看了看：一件透气速干的运动T恤，一条深灰运动裤，一双防滑登山鞋。\n";
      if (vars.shirt !== "普通T恤") {
        desc += "\n你已经换过衣服了，身上这件比货架上的都干净。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "shirt == '普通T恤'",
        text: "换上运动T恤和登山鞋",
        nextScene: "金谊广场-2F",
        effect: { set: { shirt: "速干运动T恤", shoes: "防滑登山鞋" } }
      },
      {
        text: "不换了，离开",
        nextScene: "金谊广场-2F"
      }
    ]
  },

  // --- 3F（长廊入口，落单幸存者） ---
  "金谊广场-3F": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/3F入口.jpg */,
    text: function(vars) {
      var desc = "你从长廊跨过小河，走进了商场三楼。这里是长廊的唯一入口——身后的玻璃门通向跨河的廊桥，脚下的地板砖还贴着“金谊广场欢迎您”的褪色地贴。\n";
      desc += "自动扶梯已经停了，但楼梯还能走。往上通往4F，往下通往2F。\n";
      // 预留：落单幸存者剧情
      desc += "这一层很安静。餐饮区的桌椅还整齐地摆着，像是打烊后还没来得及收拾。\n";
      desc += "你隐约听到某家店里传来轻微的响动——可能是老鼠，也可能是别的什么。";
      return desc;
    },
    choices: [
      {
        text: "去响动的方向看看",
        nextScene: "金谊广场-3F-幸存者",
        effect: updateTime(1)
      },
      {
        text: "上4F",
        nextScene: "金谊广场-4F",
        effect: updateTime(1)
      },
      {
        text: "下2F",
        nextScene: "金谊广场-2F",
        effect: updateTime(1)
      },
      {
        text: "回长廊",
        nextScene: "金谊广场-龙头区长廊",
        effect: updateTime(2)
      }
    ]
  },

  // 3F落单幸存者——小林
  "金谊广场-3F-幸存者": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/3F幸存者.jpg */,
    text: function(vars) {
      if (vars._visit['金谊广场-3F-幸存者'] > 1) {
        var short = "小林还蹲在吧台下面。他看到是你，眼神没那么紧张了，只是点了点头。\n";
        if (vars._visit['金谊广场-3F-幸存者-分食物']) {
          short += "他手里还攥着你上次给的压缩饼干包装袋——大概舍不得扔。";
        } else if (vars._jinyiSurvivorsRobbed) {
          short += "“长廊那群人……”他欲言又止。“你还能站在这里，已经比大多数人强了。”";
        } else {
          short += "“上次说的那些……你自己小心吧。”他顿了顿。“如果有吃的，记得我。”";
        }
        return short;
      }
      var desc = "你循着声音走进一家日料店。板前座位后面，一个年轻男人蹲在吧台下面，双手抱着一把日式菜刀。\n";
      desc += "他看到你，先是缩了一下，然后慢慢放松了肩膀。\n";
      desc += "“你是……活人？”他的声音沙哑，像是很久没跟人说过话了。\n";
      desc += "他叫小林——二十四五岁，原来在隔壁京东电器做销售。疫情爆发那天他正在日料店吃午饭，然后就再也没出去过。\n";
      desc += "他没有加入长廊那群人。他说他不信任人多的地方。\n";
      desc += "“人多的地方，最后都会出事。”他把菜刀放在膝盖上，手指无意识地敲着刀柄。";
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      // 各对话分支独立判断，每个只能触发一次
      if (!vars._visit['金谊广场-3F-幸存者-聊长廊']) {
        choices.push({ text: "跟他聊聊长廊的事", nextScene: "金谊广场-3F-幸存者-聊长廊", effect: updateTime(2) });
      }
      if (vars._visit['金谊广场-B1奥乐齐-搜刮'] > 0 && !vars._visit['金谊广场-3F-幸存者-分食物']) {
        choices.push({ text: "分他一点食物", nextScene: "金谊广场-3F-幸存者-分食物", effect: updateTime(2) });
      }
      if (vars._chenmoRescued && !vars._visit['金谊广场-3F-幸存者-停车场']) {
        choices.push({ text: "告诉他地面停车场比较安全", nextScene: "金谊广场-3F-幸存者-停车场", effect: updateTime(2) });
      }
      choices.push({ text: "离开", nextScene: "金谊广场-3F", effect: updateTime(1) });
      return choices;
    }
  },

  "金谊广场-3F-幸存者-聊长廊": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/3F幸存者.jpg */,
    text: function(vars) {
      var desc = "你靠着吧台坐下来，问起长廊那群人的事。\n";
      desc += "小林沉默了一会儿。\n";
      desc += "“那个领头的叫老周——以前是奥乐齐的仓库主管。人不坏，但太软了。他谁都不得罪，结果谁都管不住。”\n";
      desc += "“里面有个戴眼镜的，以前在松月楼当领班。他最狠——不是那种拿刀砍人的狠，是那种饿急了的狠。你要小心他。”\n";
      if (vars._jinyiSurvivorsRobbed) {
        desc += "他看了你一眼。“你手臂上的伤……是不是他们干的？”\n你点了点头。\n";
        desc += "“我就知道。”他把菜刀握紧了。“老周不会动手，但那个戴眼镜的——他不会让你白拿东西走。你受伤了，他就觉得你好欺负。”\n";
        desc += "他顿了顿。“我离开长廊，就是因为那个人。”";
      } else {
        desc += "“我离开长廊，就是因为那个人。”小林把菜刀在膝盖上转了一圈。“老周说人人平等，但那个戴眼镜的不这么想。他觉得自己比别人更有资格活下去。你知道这种人最可怕的是什么吗——他们没错。从某种角度来说，他们确实更适合活到最后。”";
      }
      desc += "\n\n他苦笑了一下。“所以我宁愿一个人待着。至少死的时候，不用看别人的脸色。”";
      return desc;
    },
    choices: [
      { text: "继续", nextScene: "金谊广场-3F-幸存者", effect: updateTime(1) }
    ]
  },

  "金谊广场-3F-幸存者-分食物": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/3F幸存者.jpg */,
    text: function(vars) {
      var desc = "你从口袋里掏出半包压缩饼干，放在吧台上推了过去。\n";
      desc += "小林看着那包饼干，愣了好几秒。然后他伸手拿起来，拆开包装，吃了一块。嚼得很慢。\n";
      desc += "“谢了。”他说。就两个字，但语气和刚才不一样了。\n";
      desc += "他想了想，从吧台底下摸出一个皱巴巴的笔记本，翻到其中一页。\n";
      desc += "“B1那个童涵春堂——我在 outbreak 之前看到有人进去过。一个穿白大褂的，从柜台后面拿了一个白色塑料瓶。他没付钱，直接就走了。那个瓶子上的标签他撕掉了，但我看到他塞进口袋之前，瓶身上写着——Hg。”\n";
      desc += "他抬头看你。“我不知道那是什么。但那个人看起来很紧张。像是……在抢时间。”\n";
      if (!vars.hasMercuryPill) {
        desc += "\n“药房应该还有。如果你要下去，顺便看一眼。”";
      }
      desc += "\n\n他把剩下的饼干小心地包好，塞进胸口的口袋里。";
      return desc;
    },
    choices: [
      { text: "继续", nextScene: "金谊广场-3F-幸存者", effect: updateTime(1) }
    ]
  },

  "金谊广场-3F-幸存者-停车场": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/3F幸存者.jpg */,
    text: "你告诉他，地面停车场那边虽然丧尸多，但只要避开河岸，贴着建筑外墙走，就能安全进出。\n小林认真地听着，然后点了点头。\n“我一直以为河边更危险——那些丧尸全挤在水边，我从来没敢靠近过。”\n他想了想。“如果停车场能走，那从停车场旁边的消防梯可以直接下到B2。B2有个货梯，能到1F。”\n他顿了顿。“不过B2的空气有问题——我下去过一次，差点没上来。如果你要去，最好有防毒面具。”\n\n他站了起来，把菜刀别在腰后。“谢谢你告诉我这些。也许……也许我不该一直躲在这里。”",
    choices: [
      { text: "继续", nextScene: "金谊广场-3F-幸存者", effect: updateTime(1) }
    ]
  },
  // --- 4F 餐饮/影院 ---
  "金谊广场-4F": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/4F影院.jpg */,
    text: function(vars) {
      var desc = "你来到四楼。华夏金谊影院的招牌还亮着——不知道是发电机在转还是备用电源。大厅里循环播放着一段片尾字幕，在空无一人的影院里反复回响。\n";
      desc += "放映厅的门半开着，你能看到座椅上坐着几个人——不，是几具尸体。他们躲进来等电影，最后死在了座位上。\n";
      desc += "影院旁边是一家松月楼，后厨的门虚掩着。";
      if (!vars.hasBottle) {
        desc += "\n松月楼门口的垃圾桶旁边，滚落着一只空矿泉水瓶——看起来还算干净。";
      }
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      choices.push({ text: "去影院大厅看看", nextScene: "金谊广场-4F-影院", effect: updateTime(1) });
      choices.push({ text: "去松月楼后厨", nextScene: "金谊广场-4F-后厨", effect: updateTime(1) });
      if (!vars.hasBottle) {
        choices.push({
          text: "捡起空水瓶",
          nextScene: "金谊广场-4F",
          condition: "itemCount < bagVolume",
          effect: { set: { hasBottle: true, bottleWater: 0 }, add: { itemCount: 1 } },
          elseScene: "整理整理"
        });
      }
      choices.push({ text: "上5F", nextScene: "金谊广场-5F", effect: updateTime(1) });
      choices.push({ text: "下3F", nextScene: "金谊广场-3F", effect: updateTime(1) });
      return choices;
    }
  },

  "金谊广场-4F-影院": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/4F影院大厅.jpg */,
    text: "你走进影院大厅。爆米花机早就凉了，玻璃柜里还剩下半锅焦糖色的爆米花——硬得像石头。\n售票台上放着一杯没喝完的可乐，吸管上印着一个模糊的口红印。\n放映厅里，银幕还在亮着——循环播放着某部电影的片尾字幕。座椅上的尸体安静地坐着，像是在等彩蛋。\n你不知道他们死前在看什么电影。但你知道，他们没有等到彩蛋。",
    choices: [
      { text: "啃几颗硬爆米花垫垫肚子", nextScene: "金谊广场-4F-影院-吃爆米花", effect: updateTime(1), showCondition: "!_visit['金谊广场-4F-影院-吃爆米花']" },
      { text: "离开影院", nextScene: "金谊广场-4F", effect: updateTime(1) }
    ]
  },

  "金谊广场-4F-影院-吃爆米花": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/4F影院大厅.jpg */,
    onEnter: updateTime(2, { add: { strength: 1 } }),
    text: "你抓起一把爆米花放进嘴里——硬得像石头，嚼得腮帮子发酸。焦糖味早就散尽了，只剩一股放久了的甜腻。\n你费了好大劲才咽下去几颗，胃里总算有了点东西垫底。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "金谊广场-4F-影院", effect: updateTime(1) }
    ]
  },

  "金谊广场-4F-后厨": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/4F后厨.jpg */,
    text: function(vars) {
      var desc = "你推开松月楼后厨的门。灶台上还放着几笼没蒸完的包子，已经发霉长毛了。\n";
      desc += "水槽里积着半池浑浊的水，表面漂着一层油光。你拧开水龙头，哗啦哗啦。\n";
      if (vars.hasBottle && vars.bottleWater == 0) {
        desc += "\n你可以用空水瓶在这里接水。";
      }
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      if (vars.hasBottle && vars.bottleWater == 0) {
        choices.push({
          text: "接水",
          nextScene: "金谊广场-4F",
          effect: { set: { bottleWater: 1, waterToxic: true }}
        });
      }
      choices.push({ text: "离开后厨", nextScene: "金谊广场-4F", effect: updateTime(1) });
      return choices;
    }
  },

  // --- 5F KTV ---
  "金谊广场-5F": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/5F KTV.jpg */,
    text: function(vars) {
      var desc = "五楼是一家KTV。走廊两侧是包间，门上的小窗透出微弱的走廊灯光。\n";
      desc += "你推开最近的一扇门——包间里的电视还亮着，循环播放着一首没人点的歌的MV。茶几上散落着几个空啤酒瓶和半瓶没喝完的威士忌。\n";
      if (vars.hurtByZombie) {
        desc += "\n你手臂上的伤口还在隐隐作痛——也许这些酒能用来消毒。";
      }
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      if (vars.hurtByZombie && !vars._jinyiAlcoholUsed) {
        choices.push({
          text: "用酒精消毒伤口",
          nextScene: "金谊广场-5F-酒精消毒",
          effect: updateTime(2)
        });
      }
      choices.push({ text: "去天台", nextScene: "金谊广场-天台", effect: updateTime(1) });
      choices.push({ text: "下4F", nextScene: "金谊广场-4F", effect: updateTime(1) });
      return choices;
    }
  },

  "金谊广场-5F-酒精消毒": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/5F KTV.jpg */,
    onEnter: function(vars) {
      vars._jinyiAlcoholUsed = true;
      if (Math.random() < 0.5) {
        vars.hurtByZombie = false;
      }
      return {};
    },
    text: function(vars) {
      var desc = "你拿起那半瓶威士忌，拧开盖子。酒味很冲。\n你咬紧牙关，把酒倒在手臂的伤口上——一阵剧烈的刺痛从伤口蔓延到整个手臂，你差点叫出声来。\n";
      if (!vars.hurtByZombie) {
        desc += "刺痛过后，伤口周围的皮肤泛着红，但看起来干净了不少。\n至少，伤口不会再继续恶化了。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】伤口已消毒，感染风险降低。但已进入体内的汞不会因此消失。</span>";
      } else {
        desc += "但刺痛过后，伤口看起来并没有好转——反而更红了。酒精杀死了表面的细菌，但病毒已经太深了。\n<span style='color: #ffaa00; font-style: italic;'>【系统提示】酒精消毒未能清除感染。伤口仍在恶化。</span>";
      }
      return desc;
    },
    choices: [
      { text: "继续", nextScene: "金谊广场-5F", effect: updateTime(1) }
    ]
  },

  // --- B1 心谊如意街 ---
  "金谊广场-B1 心谊如意街": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B1心谊如意街.jpg */,
    text: function(vars) {
      var desc = "你走下楼梯，来到B1心谊如意街。这是一条地下商业街，两侧是各种店铺——京东电器、肯德基、松月楼……\n";
      if (vars._lastScene === '金谊广场-地铁站厅' || vars._lastScene === '金谊广场-地铁站厅-失败') {
        desc += "走廊尽头是通往三林路地铁站的通道——你刚才就是从那边过来的。\n";
      } else {
        desc += "走廊尽头是通往三林路地铁站的通道，黑洞洞的，偶尔传出丧尸的喉音。\n";
      }
      desc += "走廊里散落着一些被踩碎的货物和几滩干涸的暗色液体。远处传来丧尸的喉音——它们在黑暗中缓慢移动，像潮水一样沿着走廊的潮湿侧涌动。\n";
      desc += "前方左手边是奥乐齐大超市，右手边是童涵春堂药房。";
      return desc;
    },
    choices: [
      {
        text: "去奥乐齐超市",
        nextScene: "金谊广场-B1奥乐齐",
        effect: updateTime(1)
      },
      {
        text: "去童涵春堂药房",
        nextScene: "金谊广场-B1童涵春堂",
        effect: updateTime(1)
      },
      {
        text: "上1F",
        nextScene: "金谊广场-1F 门面层",
        effect: updateTime(2)
      },
      {
        text: "去地铁站",
        nextScene: "金谊广场-地铁站厅",
        effect: updateTime(2)
      }
    ]
  },

  // --- B1 奥乐齐大超市 ---
  "金谊广场-B1奥乐齐": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B1奥乐齐.jpg */,
    text: function(vars) {
      var desc = "你走进奥乐齐。超市很大——货架上的东西被翻过，但还剩下不少。罐头区几乎没被动过，饮料区的矿泉水还有好几箱，零食区的薯片和饼干撒了一地但还有整袋的。\n";
      desc += "冷柜早就停了，里面的冷冻食品已经变质发臭。但干货区、罐头区和饮料区依然有充足的补给。\n";
      if (!vars._jinyiSurvivorsFed && !vars._jinyiSurvivorsRobbed) {
        desc += "\n这些食物足够长廊那些幸存者撑好几天了。";
      }
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      if (!vars._jinyiSurvivorsFed && !vars._jinyiSurvivorsRobbed) {
        choices.push({
          text: "拿上食物和水，带回长廊",
          nextScene: "金谊广场-龙头区长廊",
          effect: function(vars) {
            vars._jinyiHasFoodForSurvivors = true;
            return updateTime(5)(vars);
          }
        });
      }
      choices.push({ text: "搜刮一些自己用的补给", nextScene: "金谊广场-B1奥乐齐-搜刮", effect: updateTime(3, { add: { strength: 1 } }) });
      choices.push({ text: "离开超市", nextScene: "金谊广场-B1 心谊如意街", effect: updateTime(1) });
      return choices;
    }
  },

  "金谊广场-B1奥乐齐-搜刮": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B1奥乐齐.jpg */,
    text: "你走进货架之间，挑了一些还能直接吃的东西——几包压缩饼干、一罐午餐肉、一瓶矿泉水。",
    choices: [
      { text: "坐下来吃点东西", nextScene: "金谊广场-B1奥乐齐-搜刮-吃完", effect: updateTime(1) },
      { text: "直接带点东西走", nextScene: "金谊广场-B1奥乐齐", effect: updateTime(1) }
    ]
  },

  "金谊广场-B1奥乐齐-搜刮-吃完": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B1奥乐齐.jpg */,
    onEnter: { add: { strength: 1 } },
    text: "你坐在收银台旁边，打开压缩饼干和午餐肉，狼吞虎咽地吃了起来。在这末世里，能有东西吃已经是一种奢侈了。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>",
    choices: [
      { text: "继续搜刮", nextScene: "金谊广场-B1奥乐齐-搜刮", effect: updateTime(3) },
      { text: "回到超市门口", nextScene: "金谊广场-B1奥乐齐", effect: updateTime(1) }
    ]
  },

  // --- B1 童涵春堂药房 ---
  "金谊广场-B1童涵春堂": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B1童涵春堂.jpg */,
    text: function(vars) {
      var desc = "你推开童涵春堂的玻璃门。药房里弥漫着中药的苦香味。\n";
      desc += "中药柜的抽屉被拉开了一大半，草药撒了一地。西药区的货架倒是整齐——大概没人觉得中药铺里有西药。\n";
      if (!vars.hasMercuryPill) {
        desc += "\n你在柜台后面的一个小抽屉里发现了一个白色塑料瓶。没有标签，瓶身上用记号笔写着一个模糊的化学符号——Hg。\n里面装着几十粒淡黄色的药丸，没有任何说明。";
      }
      return desc;
    },
    choices: function(vars) {
      var choices = [];
      if (!vars.hasMercuryPill) {
        choices.push({
          text: "拿走无标签药丸",
          nextScene: "金谊广场-B1童涵春堂",
          condition: "itemCount < bagVolume",
          effect: { set: { hasMercuryPill: true }, add: { itemCount: 1 } },
          elseScene: "整理整理"
        });
      }
      choices.push({ text: "离开药房", nextScene: "金谊广场-B1 心谊如意街", effect: updateTime(1) });
      return choices;
    }
  },

  // --- B2 地下车库（毒气丧尸区） ---
  "金谊广场-B2 地下车库": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B2地下车库.jpg */,
    text: function(vars) {
      var desc = "你走进B2地下车库。这里比上面更暗，只有几盏应急灯在远处的柱子上发出微弱的黄光。\n";
      desc += "车库里的空气很闷，带着一股说不清的甜腻味——和货梯间闻到的一样。\n";
      desc += "地面上散落着几具丧尸的尸体——它们的皮肤不是普通的灰白，而是暗沉的黑色。\n";
      desc += "这些丧尸不是被杀的——它们是被毒气熏死的。这座车库里最大的威胁不是丧尸，是空气本身。\n";
      if (!vars.hasGasMask || vars.maskRemainingUses <= 0) {
        desc += "\n你感到喉咙发紧，视野开始模糊——那股甜味越来越浓了。";
      }
      return desc;
    },
    onEnter: function(vars) {
      if (!vars.hasGasMask || vars.maskRemainingUses <= 0) {
        // 无面具直接死
        return { set: { _jinyiB2GasWarned: true } };
      }
      return {};
    },
    choices: function(vars) {
      if (!vars.hasGasMask || vars.maskRemainingUses <= 0) {
        return [
          { text: "快逃", nextScene: "结局-汞中毒尸变", effect: updateTime(1) }
        ];
      }
      return [
        { text: "戴上面具搜索车库", nextScene: "金谊广场-B2-搜刮", effect: updateTime(3, { add: { maskRemainingUses: -1 } }) },
        { text: "去货梯间", nextScene: "金谊广场-B2货梯间", effect: updateTime(1) },
        { text: "退回", nextScene: "金谊广场-1F 门面层", effect: updateTime(2) }
      ];
    }
  },

  "金谊广场-B2-搜刮": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B2地下车库.jpg */,
    text: "你戴紧面具，在车库里搜索。大部分车的车门都锁着，但有一辆SUV的后备箱没关——里面放着一个急救箱和一个备用轮胎。\n\
急救箱里有绷带、碘伏和几片止痛药。\n你在车库的角落里还看到一只黑皮丧尸——它靠在柱子上，一动不动。它的皮肤像干涸的沥青一样漆黑发亮，在应急灯下泛着诡异的光泽。\n\
它已经死了——被这座车库里无孔不入的毒气熏死的。",
    choices: [
      { text: "继续搜索其他车辆", nextScene: "金谊广场-B2-搜刮-搜完", effect: updateTime(3) },
      { text: "去货梯间", nextScene: "金谊广场-B2货梯间", effect: updateTime(1) }
    ]
  },

  "金谊广场-B2-搜刮-搜完": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/B2地下车库.jpg */,
    onEnter: { add: { maskRemainingUses: -1 } },
    text: function(vars) {
      if (vars.maskRemainingUses <= 0) {
        return "你又撬开了几辆车的车门，搜刮了一些杂物。\n面罩的滤层开始发涩——活性炭快到极限了。你得赶紧离开这里。\n<span style='color: #ff4444;'>【警告】防毒面具滤层已耗尽。</span>";
      }
      return "你又撬开了几辆车的车门，搜刮了一些杂物。\n防毒面具的滤层微微发涩——还能撑一会儿，但别在这里待太久。";
    },
    choices: [
      { text: "继续搜索", nextScene: "金谊广场-B2-搜刮-搜完", effect: updateTime(3) },
      { text: "去货梯间", nextScene: "金谊广场-B2货梯间", effect: updateTime(1) }
    ]
  },

  // --- 天台 ---
  "金谊广场-天台": {
    image: "images/placeholder.png" /* TODO: images/金谊广场/天台.jpg */,
    text: function(vars) {
      var desc = "你推开天台的门。风很大，吹得你眯起了眼睛。\n";
      desc += "从这里能看得很远——往西，黄浦江的轮廓在灰白的天空下若隐若现。江面上没有船，只有一片死寂的灰色水面。\n";
      desc += "往东，你能看到来时的路——十字路口、东明路、三林路，那些你走过的地方，现在看起来像一张缩小的地图。\n";
      desc += "你站在天台的边缘，逆光中你的剪影被拉得很长。\n";
      if (vars._chenmoRescued) {
        desc += "\n你想起陈默给你的那张地图——那些近道，那些近路，那些只有他才知道的缝隙。这个世界很大，但总有人知道怎么走。";
      }
      desc += "\n<span style='color: #888;'>（金谊广场探索完毕 — 后续内容待展开）</span>";
      return desc;
    },
    choices: [
      { text: "下5F", nextScene: "金谊广场-5F", effect: updateTime(1) }
    ]
  }

});