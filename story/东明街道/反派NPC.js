// ========== 反派NPC.js ==========
// 东明街道 两个"活人反派"（非丧尸）：
//   B 三林路路霸 —— 堵"十字路口↔金谊"的三林路直达线，向落单幸存者讨要食物。
//     可给买路钱 / 正面搏斗（记忆闪色，武器分档难度）/ 有枪直接崩 / 转头绕路（走新达汇车库出口辅路）。
//     打死(_roadBull=1)永久解除；打跑(_roadBullBeatenDay=dd)或交食物(_roadBullPaidDay=dd)当天放行、次日恢复。
//   C 天台卖假药的郎中 —— 每天在"金谊广场-天台"或"新达汇-屋顶花园"随机一方摆摊，
//     用一份口粮换一瓶来路不明的"解毒剂"（假药，占格，吃后无效果）。
// 工具依赖：hasFood / consumeOneFood / roadBullBlocked / meleeWeaponTier / meleeWeaponName / initMemoryGame / checkFlashAnswer

// 跨天重摇郎中当天方位（_quackSpot：0没摆/1金谊天台/2新达汇屋顶）。
// 每次进入天台时调用；只在换天时重摇，同一天内固定在一个方位（防玩家跨天台无限刷）。
function refreshQuackSpot(vars) {
  if (vars._quackDay !== vars.dd) {
    vars._quackDay = vars.dd;
    var r = Math.random();
    vars._quackSpot = (r < 0.5) ? (Math.random() < 0.5 ? 1 : 2) : 0;
  }
}

// 路霸处理完成后的落地：按来向回——从十字路口来(去金谊方向)→续走"前往金谊-2"；
// 从金谊出来(返程方向)→回十字路口。
function bullLanding(vars) {
  return vars._bullBack ? "三林路-东明路 十字路口" : "前往金谊广场-2";
}

Object.assign(storyData, {
  /* ==================== B 三林路路霸 ==================== */
  "三林路-路霸-堵路": {
    image: "images/placeholder.png", /* TODO: images/小区周边/路霸堵路.webp */
    onEnter: function(vars) {
      vars.currentPos = "三林路中段";
      vars._bullBack = (vars._lastScene === "金谊广场-龙头区" || vars._lastScene === "金谊广场地面入口");
      return {};
    },
    text: function(vars) {
      var desc = "三林路中段，一辆被推倒的移动餐车和几张翻倒的塑料椅横在人行道上，把通往金谊的方向堵了个严实。一个敦实的中年男人蹲在餐车后面，短袖露出的两条手臂晒得黝黑，右手掂着一根拆下来的床腿钢管。他看见你，慢吞吞地站起来，把钢管往肩上一扛。\n“哎，兄弟。”他咧嘴一笑，露出一口被烟熏黄的牙，“此山是我开。去金谊，得留点买路钱——吃的就行，不图你那点破烂家当。”";
      if (vars._visit['三林路-路霸-堵路'] > 0) desc += "\n他看来是又堵回这边了。上次的教训，显然没让他记住太久。";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (vars.gunAmmo > 0) {
        cs.push({ text: "拔出手枪，直接崩了他", nextScene: "三林路-路霸-击毙" });
      }
      if (hasMeleeWeapon(vars)) {
        cs.push({ text: "握紧" + meleeWeaponName(vars) + "，正面迎战", nextScene: "三林路-路霸-搏斗" });
      } else {
        cs.push({ text: "赤手空拳，硬拼一下", nextScene: "三林路-路霸-搏斗" });
      }
      if (hasFood(vars)) {
        cs.push({ text: "从背包里掏出一份吃的递过去", nextScene: "三林路-路霸-给食物" });
      }
      cs.push({ text: "不跟他纠缠，折回去走新达汇车库出口那条辅路", nextScene: "新达汇车库出口", effect: updateTime(5) });
      return cs;
    }
  },

  // 从背包里挑一样口粮给他（玩家自选给哪个，扣对应那一格）
  "三林路-路霸-给食物": {
    image: "images/placeholder.png",
    text: "你翻了一下背包。要给的话，得想清楚给哪样——这世道一粒米都能救命，犯不上把好东西也搭进去。",
    choices: foodGiftChoices({
      pickText: "给他{名}",
      pickScene: "三林路-路霸-买路",
      onPick: function(v) { v._roadBullPaidDay = v.dd; }, // 当天放行
      cancelText: "算了，不给了",
      cancelScene: "三林路-路霸-堵路"
    })
  },

  // 有枪（有子弹）直接崩：一枪了账，永久清掉这个堵点
  "三林路-路霸-击毙": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars._roadBull = 1;                    // 永久解除
      vars.gunAmmo = Math.max(0, vars.gunAmmo - 1); // 消耗1发
      return {};
    },
    text: "你拔枪的速度比他开口讨要的还快。枪响在三林路上炸开，惊起几只蹲在车顶的乌鸦。\n血从那个男人的胸口洇开。他踉跄两步，低头看了看自己，像是不敢相信，最后连钢管都握不住，“哐当”砸在地上。他跪下去之前，喉咙里滚出一句含含糊糊的“……你他妈真有枪啊。”\n四周一下子安静得可怕。但远处，丧尸的声音明显被枪声引来了。",
    choices: [
      {
        text: "翻他兜里有啥（拿走那半包火腿肠）",
        showCondition: "!hasHamSausage && itemCount < bagVolume",
        nextScene: "三林路-路霸-搜身"
      },
      {
        text: "别管了，赶紧走",
        nextScene: bullLanding,
        effect: { add: { chasedByZombies: 1 } }
      }
    ]
  },

  "三林路-路霸-搜身": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars.hasHamSausage = true;
      vars.itemCount = Math.min(vars.bagVolume, vars.itemCount + 1);
      return {};
    },
    text: "你忍着恶心在他身上草草翻了一遍——兜里掏出一卷揉皱的纸币、一个空钱包，和半包还没拆封的火腿肠。那是他留着充饥的。\n你把火腿肠揣进背包，没再多看他一眼。那头，丧尸的声音越来越近了。",
    choices: [
      { text: "赶紧离开", nextScene: bullLanding, effect: { add: { chasedByZombies: 1 } } }
    ]
  },

  // 交一份口粮买路：当天放行往返，次日这老狐狸又会堵回来
  "三林路-路霸-买路": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars._roadBullPaidDay = vars.dd; // 当天放行（食物已在"给食物"子场景扣掉）
      return {};
    },
    text: "你从背包里摸出一份吃的，放在餐车边缘。他探过身来看了看，掂了掂，满意地揣进怀里，往后退开两步，给路让出了个空。\n“识相。走吧。”他咧咧嘴，“路上要是碰上好东西，回头给哥也捎一口——这条道，哥记你情。”\n你没答话，侧身从他身边过去。他这话说得轻巧，但眼神里那点盘算，你懂。",
    choices: [
      { text: "继续走", nextScene: bullLanding }
    ]
  },

  // 正面搏斗：记忆闪色，难度按武器档位动态调整
  //   空手/拖把杆/美工刀 → 蓝7 (难)   拐杖/铁管 → 蓝4   匕首/斧头 → 蓝3 (易)
  "三林路-路霸-搏斗": {
    image: "images/placeholder.png", /* TODO: images/小区周边/与路霸搏斗.webp */
    onEnter: function(vars) {
      var tier = meleeWeaponTier(vars);
      var len = tier === 3 ? 3 : tier === 2 ? 4 : 5; // 空手也按5（拼一把的凶险赌命）
      return initMemoryGame(["红", "蓝", "绿"], len)(vars);
    },
    text: function(vars) {
      var w = meleeWeaponName(vars);
      if (w) return "他抡起钢管劈头砸下来，你攥紧" + w + "迎上去。兵刃交接的一瞬，你必须盯住他动作的破绽，判断他下一式往哪边倒——迟半拍，就是他的钢管先到。";
      return "他抡起钢管劈头砸下来。你来不及摸武器，只能凭本能侧身、进逼、夺门——必须在他收回钢管的那一瞬，抓住他身形的破绽。迟半拍，就是他的钢管先到。";
    },
    choices: [
      {
        text: "盯住他的破绽，输入你看到的颜色分布",
        input: { placeholder: "例如：2红1蓝2绿" },
        condition: checkFlashAnswer,
        nextScene: "三林路-路霸-打赢",
        elseScene: "结局-被路霸打死",
        timeout: 14000,
        timeoutScene: "结局-被路霸打死"
      }
    ]
  },
  "三林路-路霸-打赢": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      if (meleeWeaponTier(vars) >= 3) vars._roadBull = 1;      // 刀/斧架起来够凶，一下撂倒，永久清
      else vars._roadBullBeatenDay = vars.dd;                   // 轻武器/空手只能把他打跑，他明天还会回来
      return {};
    },
    text: function(vars) {
      if (meleeWeaponTier(vars) >= 3) {
        return "你瞅准他砸空的空隙，下手又准又狠。"+meleeWeaponName(vars)+"正中他肩头，他闷哼一声，钢管脱手，人矮了半截，直挺挺栽在地上不动了。\n你把"+meleeWeaponName(vars)+"抽回来，抹了把溅上脸的血。这一下是下了死手——他再也不会堵这条道了。\n远处的丧尸被这边的动静吸引，开始往这儿赶。";
      }
      return "你抓住他收棍的空档，连消带打把他逼开。他踉跄着倒退几步，钢管“咣”地砸在地上，捂着腰间扶餐车才没倒——显然吃疼了。他恶狠狠地瞪你一眼，撂下一句“……你等着，我有的是时间”，转身就跑了。\n你喘着粗气，知道这条道今天是通了，但这梁子，八成明儿还得见。";
    },
    choices: [
      { text: "继续走", nextScene: bullLanding, effect: function(v) { if (v._roadBull === 1) v.chasedByZombies = Math.min(5, v.chasedByZombies + 1); return {}; } }
    ]
  },

  // 搏斗失败：黑色幽默死亡结局
  "结局-被路霸打死": {
    image: "images/placeholder.png",
    onEnter: function(vars) { tryBreakWeapon(vars); return {}; }, // 兵刃相接打输，按档位概率损坏武器
    text: function(vars) {
      return "你慢了半拍。只是半拍。\n钢管带着风砸下来，结结实实落在你太阳穴上。眼前一黑前的最后一个念头，是那个男人蹲下身，翻着你的包，骂骂咧咧：“就这点吃的？那你赶什么路啊，兄弟。”" + weaponBrokeText(vars) + "\n——结局：被一个抢吃的打死了 ——";
    },
    style: "color: #ff4444; font-weight: bold;"
  },

  /* ==================== C 天台卖假药的郎中 ==================== */
  // 入口由 金谊广场-天台(_quackSpot==1) 与 新达汇-屋顶花园(_quackSpot==2) 的 choices 条件接入
  "天台-卖药郎中": {
    image: "images/placeholder.png", /* TODO: images/小区周边/天台卖药郎中.webp */
    text: function(vars) {
      let basicDes = "天台的风里，一个干瘦的老头盘腿坐在避风角，面前铺着一张皱巴巴的塑料布，上头摆着五六瓶贴着歪标签的玻璃瓶。他看到你，浑浊的眼睛一亮，招招手。\n\
“小哥，来得正好——”他压低声音，神神秘秘地捻起一瓶浑浊的液体，“丧尸病毒的解毒剂，我托人从上头弄来的祖传方子。现在外头那些咬了人的、喝了脏水的，全靠这个吊命。\
你别不信，你看我这老头，过去这么多天，不是活得好好的？一份口粮，换一瓶保命的，不亏。”\n瓶身上那张手写的标签歪歪扭扭，实在潦草。";
      if(vars.hurtByZombie) basicDes += "他注意到你身上的伤，又补了一句：“你不是被咬了吗？来喝一点恢复一下，黑皮粽子嘴里你都能多撑3天，哈哈。”";
      return basicDes;
    },
    choices: function(vars) {
      return [
        {
          text: "掏出一份口粮，换一瓶解毒剂",
          showCondition: "hasFood && hasFakeAntidote == false",
          nextScene: "天台-卖药郎中-给食物"
        },
        {
          text: "“一瓶凉水还想换吃的？省省吧老头。”",
          nextScene: function(vars) { return vars._quackSpot === 1 ? "金谊广场-天台" : "新达汇-屋顶花园"; }
        }
      ];
    }
  },
  // 从口粮里挑一瓶换假药（玩家自选给哪个，扣对应那一格）
  "天台-卖药郎中-给食物": {
    image: "images/placeholder.png",
    text: "你掂了掂手里的口粮。老头等着你把哪一样递过去——这买卖亏是定了，就看你想亏多少。",
    choices: foodGiftChoices({
      pickText: "给他{名}",
      pickScene: "天台-卖药郎中-成交",
      onPick: function(v) { v.hasFakeAntidote = true; v._quackTradedDay = v.dd; }, // 得假药
      cancelText: "算了，不换了",
      cancelScene: "天台-卖药郎中"
    })
  },
  "天台-卖药郎中-成交": {
    image: "images/placeholder.png",
    text: "老头接过口粮，飞快地塞进怀里，又飞快地把那瓶浑浊的“解毒剂”塞进你手里，动作急得像怕你反悔。\n\
你掂了掂那瓶东西——标签上歪歪扭扭写着“特製解毒·祖传秘方”。他麻利地卷起塑料布，嘟囔着“再不走那边丧尸该打喷嚏了”，猫着腰溜下了天台。\n",
    choices: [
      { text: "离开天台", nextScene: function(v) { return v._quackSpot === 1 ? "金谊广场-5F" : "新达汇-屋顶花园入口"; } }
    ]
  },

  /* ==================== NPC 侧写：高锦睿提路霸/郎中 ==================== */
  // 由 新达汇-喷泉广场-高锦睿-聊 的问话选项一次性接入
  "新达汇-喷泉广场-高锦睿-路霸": {
    image: "images/placeholder.png",
    text: "高锦睿撇撇嘴：“你说三林路上那堵道的哥们？我劝你别跟他硬刚——他那钢管不是吃素的。我是骑车嗖一下就过去了，他追都追不上；你要两条腿，要么绕新达汇车库那条辅路，要么……得，给他点吃的了事。”\n\
他顿了顿，又压低声音：“天台那有个卖药的。一小老头，说什么‘解毒剂’‘特效药’。你要不要去看看？”",
    choices: [
      { text: "“知道了，谢了。”", nextScene: "新达汇-喷泉广场", effect: updateTime(1) }
    ]
  },

  /* ==================== NPC 侧写：周师傅提路霸/郎中 ==================== */
  // 由 理发店-交谈（安盛街）的问话选项一次性接入（askRoadBullInfo 门控）
  "理发店-打听路况": {
    image: "images/placeholder.png",
    text: "周师傅手里的剪子顿了一下：“你要是往金谊那头走，注意点————三林路那截儿有个人不太安分，堵着往来的要吃的，不给就打————我本来想去金谊广场的，结果被他拦了。新达汇那边丧尸又多，索性就先待在这里。”",
    choices: [
      { text: "“多谢周师傅指点。”", nextScene: "理发店-店内" }
    ]
  }
});