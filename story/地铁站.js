// ========== 11号线三林东路站剧情 ==========
// 地铁站：连接地面的枢纽，高风险高回报
// 核心设计：噪声积累 → 尸潮强度递增，环境互动（消防栓/灭火器/消防斧）替代道具
// QTE 随深度递减：站厅8s → 安检6s → 楼梯4s → 站台3s

Object.assign(storyData, {

  // ==================== 入口：地面 → 站厅 ====================
  "11号线-三林东路站": {
    image: "images/地铁站/入口.png",
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    text: "你走进11号线三林东路站的1号口。台阶向下延伸，通向一片昏暗的站厅。应急灯亮着，投下惨白的冷光。\n\
你低下头，看到的是触目惊心的场景————人堆。\n\
一具尸体压着另一具，层层叠叠，从台阶中部延伸到底部，你甚至看不到一块完整的地板瓷砖。\n\
其中有些”尸体“好像还在蠕动，你踩着尸体慢慢走下去，绕开那些不知死活的东西。\n\
前面有几只丧尸挡路，你觉得应该先观察一下。\n\
现在可以看到更多内部场景了。\n\
闸机全部敞开着——这不是正常关闭的，有些是被暴力撞开的。地上有干涸的血迹和散落的杂物。\n\
站厅里很安静，但你隐约能听到站台方向传来的回音——什么成群的东西在移动。",
    choices: [
      {
        text: "快步通过闸机，进入站厅",
        nextScene: "地铁站-站厅层",
        effect: updateTime(2)
      },
      {
        text: "在入口处观察一会儿再下去",
        nextScene: "地铁站-站厅层-观察",
        effect: updateTime(3)
      },
      {
        text: "太不对劲了，退回地面",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-站厅层-观察": {
    image: "images/地铁站/stationHall.png",
    text: "你在入口处的阴影里蹲了一会儿。站厅里有几只丧尸在漫无目的地游荡——三只在售票机附近，一只靠在墙角。\n\
它们没有发现你。但你注意到其中一只穿着地铁维修工的黄色背心，腰间挂着一串工具。",
    choices: [
      {
        text: "轻手轻脚翻过闸机",
        nextScene: "地铁站-安检区",
        effect: updateTime(3)
      },
      {
        text: "从员工通道绕过去",
        nextScene: "地铁站-安检区",
        effect: updateTime(2)
      },
      {
        text: "还是回去吧",
        nextScene: "东明路-三林路"
      }
    ]
  },

  // ==================== 站厅层（QTE: 8s，隐藏） ====================
  "地铁站-站厅层": {
    image: "images/地铁站/stationHall.png",
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    qte: {
      timeout: "8000 - chasedByZombies * 500",
      hidden: true,
      onTimeout: "地铁站-站厅层-犹豫"
    },
    text: "你快步穿过闸机，进入站厅层。售票机屏幕全部黑着，几张广告牌歪斜地挂着。应急灯惨淡的白光照亮了大厅。\n\
站厅里散落着几只丧尸——两只在售票机前面徘徊，一只靠在墙角。它们听到你的脚步声，开始转过头来。",
    choices: [
      {
        text: "趁它们还没完全反应过来，冲过去",
        nextScene: "地铁站-安检区",
        effect: updateTime(2)
      },
      {
        text: "蹲下贴着墙壁慢慢绕过去",
        nextScene: "地铁站-安检区",
        condition: "strength >= 2",
        elseScene: "地铁站-站厅层-被发现"
      },
      {
        text: "丢个东西引开它们注意",
        nextScene: "地铁站-站厅层-声东击西",
        effect: updateTime(1)
      },
      {
        text: "退回去",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-站厅层-犹豫": {
    image: "images/地铁站/stationHall.png",
    text: "你在原地犹豫了几秒——就是这几秒，足够它们完成合围了。\n售票机前的两只丧尸从左右包抄过来，墙角那只也直直地朝你走来。你被堵在了闸机口。\n没有退路了——只能硬冲。",
    choices: [
      {
        text: "撞开左边的丧尸冲过去",
        nextScene: "地铁站-安检区",
        condition: "strength >= 2",
        elseScene: "地铁站-站厅层-被发现",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      },
      {
        text: "退回地面",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-站厅层-声东击西": {
    image: "images/地铁站/stationHall.png",
    text: "你从地上捡起一个不知道是谁遗落的水瓶，朝大厅另一头扔了过去。瓶子在地上弹跳了两下，发出清脆的响声。三只丧尸齐刷刷地转头，朝声音的方向挪去。\n你趁这个空当迅速穿过了站厅。",
    choices: [
      {
        text: "进入安检区",
        nextScene: "地铁站-安检区"
      }
    ]
  },

  "地铁站-站厅层-被发现": {
    image: "images/zombieKnockYouDown.png",
    text: "你的体力不够撑住蹲姿太久——腿一软，手掌撑在地上发出一声响。靠在墙角的那只丧尸猛地转过头，嘶吼着朝你扑了过来。\n你还没来得及站起来就被扑倒了。"
  },

  // ==================== 安检区（QTE: 6s，隐藏） ====================
  "地铁站-安检区": {
    image: "images/地铁站/securityCheck.png",
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    qte: {
      timeout: "6000 - chasedByZombies * 500",
      hidden: true,
      onTimeout: "地铁站-安检区-犹豫"
    },
    text: "你来到安检区。X光安检机的传送带静止着，几件行李还卡在入口处。安检门后方的通道通向下一层——楼梯口就在前面大约二十米处。\n\
但在你前方，七八只丧尸聚集在安检通道周围，有的正在翻行李，有的漫无目的地在通道里踱步。\n它们暂时还没看到你。墙边有一个红色的消防栓箱，玻璃面反射着应急灯的光。旁边挂着一个灭火器。",
    choices: [
      {
        text: "砸开消防栓箱，拉开消防栓！",
        nextScene: "地铁站-安检区-消防栓",
        effect: updateTime(1)
      },
      {
        text: "取下灭火器",
        nextScene: "地铁站-安检区-灭火器",
        effect: updateTime(1)
      },
      {
        text: "不碰任何东西，悄悄从X光机下面爬过去",
        nextScene: "地铁站-安检区-绕路",
        effect: updateTime(3)
      },
      {
        text: "直接冲过去",
        nextScene: "地铁站-安检区-硬冲",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-安检区-犹豫": {
    image: "images/地铁站/securityCheck.png",
    text: "你站在原地打量着前方的丧尸群——但你没注意到身后楼梯方向也有东西上来了。等你察觉时，已经被夹在了中间。\n前方的丧尸也被你的动静惊动，齐刷刷地转了过来。你无处可躲。",
    choices: [
      {
        text: "抡起旁边的灭火器砸出一条路",
        nextScene: "地铁站-安检区-硬冲",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      },
      {
        text: "后退往地面跑",
        nextScene: "东明路-三林路",
        effect: { add: { chasedByZombies: 1 } }
      }
    ]
  },

  // ===== 消防栓路线（你的正解链第一步） =====
  "地铁站-安检区-消防栓": {
    image: "images/地铁站/fireHose.png",
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你一拳砸碎消防栓箱的玻璃，扯出盘卷的水带，拧开了阀门。\n高压水流猛地喷出，像一条白色的巨龙横扫过安检通道。丧尸群被冲得东倒西歪——几只被水流直接掀翻在地，其他的也被冲得连连后退，在湿滑的地砖上站不稳脚跟。\n水声在站厅里轰然回响，肯定吸引了更远处的注意——但至少现在，前方的路是干净的。\n消防栓箱里挂着一把消防斧，橙黄色的斧柄在冷光灯下格外醒目。",
    choices: [
      {
        text: "抓起消防斧，冲进丧尸群里大开杀戒",
        nextScene: "地铁站-安检区-消防斧清场",
        condition: "strength >= 2",
        elseScene: "地铁站-安检区-斧子太重"
      },
      {
        text: "趁丧尸还没爬起来，赶紧冲过去",
        nextScene: "地铁站-安检区-冲过水幕",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-安检区-斧子太重": {
    image: "images/地铁站/securityCheck.png",
    text: "你抓起消防斧，但它比看起来重得多——你的手臂根本挥不动。你拖着斧子踉跄了一步，差点被它带倒。\n水里一只丧尸已经摇摇晃晃地站起来了，正朝你淌水走来。你只好丢下斧子，转身就跑。",
    choices: [
      {
        text: "冲向楼梯口",
        nextScene: "地铁站-楼梯",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-安检区-消防斧清场": {
    image: "images/地铁站/axeSlaughter.png",
    onEnter: { add: { strength: -1, chasedByZombies: 1 } },
    text: "你拔出消防斧，冲进了水幕中。\n第一只试图站起来的丧尸被你一斧头抡在头侧，直接飞出去砸在墙上。第二只刚从水里爬起来，斧刃已经劈进了它的肩颈。\n你像切菜一样在水幕中穿行。水声、斧声、骨裂声混在一起——等你回过神来，地上已经没有还能动的丧尸了。\n你浑身湿透，大口喘着气，但前方的路彻底打开了。你提着斧子走到楼梯口，把斧子靠在了墙上——太重了，带着它跑不是什么好主意。",
    choices: [
      {
        text: "扔掉斧子，下楼梯",
        nextScene: "地铁站-楼梯",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-安检区-冲过水幕": {
    image: "images/地铁站/securityCheck.png",
    text: "你踩着满地的积水冲向楼梯口。身后的丧尸在水中挣扎着爬起来，但它们的动作比平时慢得多——水把地面变成了滑溜溜的障碍。\n\
你顺利冲到了楼梯口。回头看时，几只丧尸正在水渍中笨拙地试图站直身体，暂时跟不过来。",
    choices: [
      {
        text: "下楼梯",
        nextScene: "地铁站-楼梯",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 灭火器路线 =====
  "地铁站-安检区-灭火器": {
    image: "images/地铁站/securityCheck.png",
    text: "你从墙上取下灭火器。红色的罐体冰凉而沉重。你拔掉保险销，对准了丧尸群的方向。",
    choices: [
      {
        text: "对准丧尸群直接喷射",
        nextScene: "地铁站-安检区-灭火器失败",
        effect: updateTime(1)
      },
      {
        text: "朝地面喷射，制造雾障掩护通过",
        nextScene: "地铁站-安检区-灭火器雾障",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-安检区-灭火器失败": {
    image: "images/地铁站/securityCheck.png",
    text: "你按下压把，白色的干粉喷涌而出，糊了最近一只丧尸满脸。但它只是甩了甩头，伸出双手朝你的方向摸了过来——它看不见了，但你还是站在它面前。\n你后退一步想拉开距离，但地上有一个不知道谁遗落的背包——你被绊了一下，身体往后倒去。\n在你摔倒在地之前，又有两只丧尸从雾中扑了出来。",
    choices: [
      {
        text: "想爬起来，但已经来不及了",
        nextScene: "结局-灭火器死亡"
      }
    ]
  },

  "结局-灭火器死亡": {
    image: "images/zombieKnockYouDown.png",
    text: "你倒在地上，灭火器从手中脱落，咕噜噜地滚远了。白雾笼罩了你的视野，你什么都看不见——但你感觉到了它们的手抓住你的衣服、你的手臂、你的脖子。\n\n—— 结局：灭火器死亡 ——"
  },

  "地铁站-安检区-灭火器雾障": {
    image: "images/地铁站/fireExtinguisherFog.png",
    onEnter: { set: { _extinguisherUsed: true } },
    text: "你蹲下身，对着脚下的地面按下压把。白色的干粉迅速扩散开来，在你和丧尸群之间形成了一道浓密的雾障。\n你的视野也变得模糊了，但你记住了楼梯口的方向。你低着腰，在雾的掩护下快速穿过安检区。身后的丧尸传来了困惑的低吼——它们看不见你，也不敢贸然冲进雾里。\n你穿过了安检区，安全到达了楼梯口。白雾在你身后缓缓沉降。",
    choices: [
      {
        text: "下楼",
        nextScene: "地铁站-楼梯-绕行",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 绕路 =====
  "地铁站-安检区-绕路": {
    image: "images/地铁站/securityCheck.png",
    text: "你趴下身子，紧贴着地面，一点一点地从X光机的传送带下方爬过去。机器底部积了一层灰，蹭了你一身。\n你花了些时间，但安全地绕过了丧尸群。站起来时你已经到了安检区后方，楼梯口就在不远处。",
    choices: [
      {
        text: "走向楼梯",
        nextScene: "地铁站-楼梯-绕行",
        effect: updateTime(2)
      }
    ]
  },

  // ===== 硬冲 =====
  "地铁站-安检区-硬冲": {
    image: "images/地铁站/securityCheck.png",
    onEnter: { add: { chasedByZombies: 2 }, set: { hurtByZombie: true } },
    text: "你深吸一口气，朝着楼梯口的方向猛冲过去。\n丧尸们被你突然的动作惊动，从几个方向同时朝你围拢。你撞开了一只挡路的，用肩膀顶开了另一只——但第三只还是抓到了你的手臂，袖子被撕开一道口子，皮肤火辣辣地疼。\n你甩开它，带着伤冲到了楼梯口。回头看时，丧尸群已经在你身后汇合了。",
    choices: [
      {
        text: "赶紧下楼",
        nextScene: "地铁站-楼梯-绕行",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 楼梯（QTE: 4s，可见） ====================
  "地铁站-楼梯": {
    image: "images/地铁站/stairs.png",
    qte: {
      timeout: "4000 - chasedByZombies * 400",
      onTimeout: "地铁站-楼梯-犹豫"
    },
    text: "你来到楼梯口。台阶向下延伸，转角处堆着一些被遗弃的行李箱和几只倒下的垃圾桶。站厅上游荡着十余只丧尸，他们好像看到了你，手脚并用慢慢爬上楼梯，向你围拢了过来。\n\
而在你身后，被你用水冲散的丧尸群已经开始爬起来了。你听到水花四溅的声音——它们追上来了。",
    choices: [
      {
        text: "冲下去，踹飞挡路的那只！",
        nextScene: "地铁站-楼梯-踹飞",
        effect: updateTime(1)
      },
      {
        text: "抓紧扶手，快速绕下去",
        nextScene: "地铁站-楼梯-绕行",
        condition: "strength >= 2",
        elseScene: "地铁站-楼梯-摔倒"
      },
      {
        text: "坐上扶手滑下去",
        nextScene: "地铁站-楼梯-滑扶手",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-楼梯-犹豫": {
    image: "images/地铁站/stairs.png",
    text: "你在楼梯口犹豫了一瞬——就是这一瞬，身后的追兵已经赶到了。一只湿漉漉的手抓住了你的衣领，把你往后拽去。\n\
你失去平衡，在台阶上滚了下去，撞翻了下方转角处的丧尸。你和两三只丧尸纠缠在一起滚到了楼梯底部。\n你浑身是伤地爬起来，跑到站台另一侧——楼梯虽然下来了，但你的体力已经消耗殆尽。",
    choices: [
      {
        text: "拖着伤体爬进站台",
        nextScene: "地铁站-站台层",
        effect: { add: { strength: -2, chasedByZombies: 1 }, set: { hurtByZombie: true } }
      }
    ]
  },

  "地铁站-楼梯-踹飞": {
    image: "images/地铁站/stairsKick.png",
    text: "你大步冲下台阶，一只穿着站台工作人员制服的丧尸正从下方爬上来，听到脚步声抬起了头——\n\
你没有减速，一脚踹在它胸口。\n\
冲击力带着它向后飞去——它撞翻了身后另一只正在上楼的丧尸，两只丧尸抱成一团向后滚去。它们又撞倒了身后的同伴——就像多米诺骨牌一样，楼梯上密密麻麻的丧尸一层接一层地滚了下去。\n等声音停下来时，楼梯已经清空了。你几乎不敢相信自己的眼睛。",
    choices: [
      {
        text: "趁它们还没爬起来，快步下楼",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-楼梯-绕行": {
    image: "images/地铁站/stairs.png",
    text: "你紧握着扶手，在倾倒的行李箱和垃圾桶之间小心地绕行。身后的脚步声越来越近了，但你保持了节奏，没有慌乱。\n你顺利地下到了站台层。回头看了一眼——追兵被甩开了一段距离，但还在下来。",
    choices: [
      {
        text: "进入站台区",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-楼梯-摔倒": {
    image: "images/zombieKnockYouDown.png",
    text: "你的体力不足以支撑你在湿滑的地面上保持平衡。你脚下一滑，膝盖重重磕在台阶的边缘上。\n剧痛让你一时间站不起来——而身后的脚步声正在迅速逼近。\n你想爬起来，但已经来不及了。"
  },

  "地铁站-楼梯-滑扶手": {
    image: "images/地铁站/stairs.png",
    text: "你翻身坐上扶手，一路向下滑去。扶手比你想象中滑得多——你几乎是在飞。\n但滑到一半时，你看到下方拐角处站着一只灰白色的东西。它听到你摩擦扶手的声音，抬起了头。\n\
你来不及刹车，几乎和它撞了个满怀。",
    choices: [
      {
        text: "在空中调整姿势，踹飞它！",
        nextScene: "地铁站-楼梯-滑扶手-踹",
        condition: "strength >= 3",
        elseScene: "地铁站-楼梯-滑扶手-撞"
      },
      {
        text: "紧急刹车，从扶手上跳下来",
        nextScene: "地铁站-楼梯-绕行",
        condition: "strength >= 2",
        elseScene: "地铁站-楼梯-摔倒"
      }
    ]
  },

  "地铁站-楼梯-滑扶手-踹": {
    image: "images/地铁站/stairsKick.png",
    onEnter: { add: { strength: -1 } },
    text: "你在扶手上收腿，然后在接近它的瞬间猛地蹬了出去——一脚正中它的面门。丧尸被踹得向后仰倒，而你借着反冲力稳稳地落在地上。\n\
你回头看了一眼——它倒在台阶上，正在挣扎着爬起来。你没有等它。",
    choices: [
      {
        text: "跑进站台",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-楼梯-滑扶手-撞": {
    image: "images/地铁站/stairs.png",
    onEnter: { add: { strength: -1 }, set: { hurtByZombie: true } },
    text: "你来不及调整，直接撞上了它。你和丧尸一起摔在台阶上，滚了两圈。你挣扎着推开它的手臂和嘴巴——它咬了你一口，但冬天的厚外套挡了一下，只擦破了皮。\n你终于把它踹开，爬起来一瘸一拐地冲进了站台。",
    choices: [
      {
        text: "跑进站台",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 站台层（QTE: 3s，可见） ====================
  "地铁站-站台层": {
    image: "images/地铁站/platform.png",
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    qte: {
      timeout: "3000 - chasedByZombies * 300",
      onTimeout: "地铁站-站台层-犹豫"
    },
    text: function(vars) {
      var desc = "你终于下到了站台层。站台比上面更加昏暗，只有应急出口的绿色标志发出微弱的光。轨道两侧的屏蔽门大部分都关着，只有一扇被砸碎了，玻璃渣洒了一地。\n\
轨道对面也有丧尸在徘徊——它们暂时过不来，但它们的声音在空旷的站厅里回荡。\n站台上有五六只丧尸，分散在屏蔽门沿线，暂时还没注意到你。更远处有一扇开着的列车门，车厢里的灯还亮着。";
      if (vars._extinguisherUsed) {
        desc += "\n\n你手上已经没有灭火器了——刚才在上面用掉了。";
      } else {
        desc += "\n\n你注意到站台墙边还有一个灭火器。你手上还有一个。";
      }
      return desc;
    },
    choices: [
      {
        text: "拉开灭火器制造雾障，掩护穿行",
        nextScene: "地铁站-站台层-灭火器雾障",
        effect: updateTime(2),
        showCondition: "!_extinguisherUsed"
      },
      {
        text: "沿屏蔽墙边缘摸过去",
        nextScene: "地铁站-站台层-潜行",
        effect: updateTime(4)
      },
      {
        text: "直接冲向列车门",
        nextScene: "地铁站-站台层-硬冲",
        effect: updateTime(2)
      }
    ],
  },

  "地铁站-站台层-犹豫": {
    image: "images/地铁站/platform.png",
    text: "你在站台入口停下了脚步——丧尸太多了。就是这一瞬间的犹豫，它们已经发现了你。从左右两侧同时包抄过来。\n你后退一步，背抵到了墙上。没有路可退了——你必须立刻决定怎么冲过去。",
    choices: [
      {
        text: "拼命冲！撞开挡路的",
        nextScene: "地铁站-站台层-硬冲",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      },
      {
        text: "退回楼梯",
        nextScene: "地铁站-楼梯-绕行",
        effect: { add: { chasedByZombies: 1 } }
      }
    ]
  },

  "地铁站-站台层-灭火器雾障": {
    image: "images/地铁站/platformFog.png",
    onEnter: { set: { _extinguisherUsed: true } },
    text: "你拔掉保险销，对着站台地面按下压把。白色的干粉喷涌而出，在站台上迅速蔓延开来。\n你低身钻入雾中，沿着屏蔽墙快速移动。丧尸的吼叫声在白雾中变得闷钝而遥远——它们看不见你，你也看不见它们，但你记住了列车门的方向。\n你从雾的另一端钻出时，已经站在了那扇亮着灯的列车门前。",
    choices: [
      {
        text: "踏入车厢",
        nextScene: "地铁站-选择列车"
      }
    ]
  },

  "地铁站-站台层-潜行": {
    image: "images/地铁站/platform.png",
    text: "你紧贴着屏蔽墙，一步一步地横向移动。站台上的丧尸没有注意到你——它们的注意力被轨道对面的声音吸引着。\n你花了些时间，但成功绕过了所有的丧尸，抵达了列车门前。",
    choices: [
      {
        text: "进入车厢",
        nextScene: "地铁站-选择列车",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-站台层-硬冲": {
    image: "images/地铁站/platform.png",
    onEnter: { add: { chasedByZombies: 2 } },
    text: "你撒腿就跑。站台上的丧尸被你突然的动作惊动，从各个方向朝你追来。\n\
你在一排排屏蔽门之间狂奔，身后拖着一串越来越长的脚步声和嘶吼声。列车门就在前方——你冲进去的时候，最近的一只丧尸离你只有几步之遥。\n你转过身，面对着正在涌来的丧尸群，站在车厢里大口喘气。",
    choices: [
      {
        text: "赶紧找地方躲进车厢深处",
        nextScene: "地铁站-选择列车",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 选择列车 ====================
  "地铁站-选择列车": {
    image: "images/地铁站/trainInterior.png",
    onEnter: { set: { _extinguisherUsed: false } },
    text: "你踏进车厢。车厢里的灯还亮着，座椅上散落着几份报纸和一个水杯。穿过整节车厢，你能看到驾驶室的方向。\n车厢另一端的电子显示屏还在闪烁，显示着线路信息。",
    choices: [
      {
        text: "往迪士尼方向",
        nextScene: "地铁站-迪士尼方向",
        effect: updateTime(5)
      },
      {
        text: "往嘉定北方向",
        nextScene: "地铁站-嘉定北方向"
      },
      {
        text: "看看车厢里的线路图",
        nextScene: "地铁站-线路图"
      },
      {
        text: "算了，下车退回地面",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-线路图": {
    image: "images/地铁站/trainMap.png",
    text: "你凑到线路图前。11号线贯穿上海西北到东南：嘉定北→……→三林东路→迪士尼。中间有几个换乘站，但大部分线路都显示着灰色——可能已经停运了。\n迪士尼方向是唯一还在闪烁的绿色线段。",
    choices: [
      {
        text: "去迪士尼",
        nextScene: "地铁站-迪士尼方向",
        effect: updateTime(5)
      },
      {
        text: "下车",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-嘉定北方向": {
    image: "images/地铁站/trainInterior.png",
    text: "你试着往驾驶室方向走了几步——透过前窗可以看到隧道里漆黑一片，前方的轨道上横七竖八地停着几节废弃的车厢，堵死了去路。\n显示屏上闪烁着一行字：\"因线路故障，本次列车终点站调整为迪士尼。\"",
    choices: [
      {
        text: "那就去迪士尼",
        nextScene: "地铁站-迪士尼方向",
        effect: updateTime(5)
      },
      {
        text: "下车",
        nextScene: "东明路-三林路"
      }
    ]
  },

  // ==================== 出发！ ====================
  "地铁站-迪士尼方向": {
    image: "images/地铁站/trainDeparting.png",
    onEnter: { set: { currentArea: "迪士尼", currentPlace: "迪士尼", currentPos: "迪士尼" } },
    text: "你走进驾驶室，按下了关门按钮。屏蔽门缓缓合上。你又试了几个按钮——列车启动了。\n列车在隧道中行驶，车窗外的黑暗被偶尔掠过的应急灯打断。你靠在座位上，听着轨道有节奏的撞击声。\n大概二十分钟后，列车开始减速。窗外出现了灯光——站台的轮廓在黑暗中浮现出来。\n显示屏切换了一行文字：\"迪士尼站到了。\"",
    choices: [
      {
        text: "下车",
        nextScene: "迪士尼门口"
      }
    ]
  }
});
