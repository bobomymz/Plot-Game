// ========== 11号线三林东路站剧情 ==========
// 地铁站：连接地面的枢纽，通往迪士尼方向的唯一出口。
// 设计文档：docs/区域方案-地铁站改造.md（2026-10 难度重做）
// 核心设计：
//   1) 难度来自决策与准备，不是反应力——钥匙串挂在站厅维修工尸体腰间，
//      员工通道铁门锁死（撞门=软门槛），配电间合闸顺序（站务室规程=信息门槛）；
//   2) 噪声经济有牙齿：chasedByZombies 每级缩短 QTE 800ms，>=4 进站台触发隧道尸潮；
//   3) 站台强黑暗（合闸前只认手电/火把，同建平工具间门槛）；
//   4) 列车没供电就是死火——必须配电间合闸充电后才发车；发车不可逆。
// QTE 随深度递减：站厅8s → 安检6s → 楼梯4s → 站台3s（均被尸潮等级压缩，下限2s）

Object.assign(storyData, {

  // ==================== 入口：地面 → 站厅 ====================
  "11号线-三林东站": {
    image: "images/地铁站/入口.webp",
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    text: function(vars) {
      if (vars._visit["11号线-三林东站"] && vars._visit["11号线-三林东站"] > 1) {
        return "闸机还是敞开着，地上那几摊干涸的血迹和杂物没变。站厅里安静得过头，只听见站台方向传来一阵阵成群移动的回音——你加快脚步，想快点穿过这片空地。";
      }
      return [
        "你走进11号线三林东路站的1号口。台阶向下延伸，通向一片昏暗的站厅。应急灯亮着，投下惨白的冷光。",
        "你低下头，看到的是触目惊心的场景————人堆。\n一具尸体压着另一具，层层叠叠，从台阶中部延伸到底部，你甚至看不到一块完整的地板瓷砖。其中一具穿着地铁维修工的黄色背心，半埋在最上层。",
        "其中有些“尸体”好像还在蠕动，你踩着尸体慢慢走下去，绕开那些不知死活的东西。\n前面有几只丧尸挡路，你觉得应该先观察一下。",
        "现在可以看到更多内部场景了。\n闸机全部敞开着——这不是正常关闭的，有些是被暴力撞开的。地上有干涸的血迹和散落的杂物。\n站厅里很安静，但你隐约能听到站台方向传来的回音——什么成群的东西在移动。"
      ];
    },
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
        text: "太不对劲了，回到地面",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-站厅层-观察": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stationHallObserve.webp */,
    text: "你在入口处的阴影里蹲了一会儿。站厅里有几只丧尸在漫无目的地游荡——三只在售票机附近，一只靠在墙角。\n\
其中一只穿着地铁维修工的黄色背心，腰间挂着一串工具，就在闸机西侧那扇挂着“员工专用”牌子的铁门附近徘徊。\n\
那扇铁门关得死死的，门禁读卡器黑着屏。门缝里透出更深的黑——门后好像还有空间。",
    choices: [
      {
        text: "捡个水瓶扔向大厅另一头，趁乱去翻维修工的腰间",
        nextScene: "地铁站-站厅-搜尸",
        effect: updateTime(2)
      },
      {
        text: "直接扑上去，把工具串抢下来",
        nextScene: "地铁站-站厅-缠斗",
        effect: updateTime(1)
      },
      {
        text: "轻手轻脚翻过闸机",
        nextScene: "地铁站-安检区",
        effect: updateTime(3)
      },
      {
        text: "去闸机西侧的员工通道铁门看看",
        nextScene: "地铁站-员工通道-铁门",
        effect: updateTime(1)
      },
      {
        text: "还是回到地面吧",
        nextScene: "东明路-三林路"
      }
    ]
  },

  // ==================== 站厅层（QTE: 8s，隐藏） ====================
  "地铁站-站厅层": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stationHall.png */,
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    qte: {
      timeout: "Math.max(2000, 8000 - chasedByZombies * 800)",
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
        elseScene: "结局-地铁站-站厅层-被发现"
      },
      {
        text: "丢个东西引开它们注意",
        nextScene: "地铁站-站厅层-声东击西",
        effect: updateTime(1)
      },
      {
        text: "扑向售票机边穿黄背心的维修工",
        nextScene: "地铁站-站厅-缠斗",
        effect: updateTime(1)
      },
      {
        text: "往站厅西侧的员工通道铁门去",
        nextScene: "地铁站-员工通道-铁门",
        effect: updateTime(1)
      },
      {
        text: "退回地面",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-站厅层-犹豫": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stationHall.png */,
    onEnter: { shake: true },   // 犹豫几秒，被三只丧尸合围
    text: "你在原地犹豫了几秒——就是这几秒，足够它们完成合围了。\n售票机前的两只丧尸从左右包抄过来，墙角那只也直直地朝你走来。你被堵在了闸机口。\n没有退路了——只能硬冲。",
    choices: [
      {
        text: "撞开左边的丧尸冲过去",
        nextScene: "地铁站-安检区",
        condition: "strength >= 2",
        elseScene: "结局-地铁站-站厅层-被发现",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      },
      {
        text: "退回地面",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "地铁站-站厅层-声东击西": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stationHall.png */,
    text: "你从地上捡起一个不知道是谁遗落的水瓶，朝大厅另一头扔了过去。瓶子在地上弹跳了两下，发出清脆的响声。三只丧尸齐刷刷地转头，朝声音的方向挪去。\n你趁这个空当迅速穿过了站厅。",
    choices: [
      {
        text: "进入安检区",
        nextScene: "地铁站-安检区"
      }
    ]
  },

  "结局-地铁站-站厅层-被发现": {
    image: "images/zombieKnockYouDown.webp",
    text: "你的体力不够撑住蹲姿太久——腿一软，手掌撑在地上发出一声响。靠在墙角的那只丧尸猛地转过头，<span class='crit'>嘶吼着朝你扑了过来</span>。\n你还没来得及站起来就被扑倒了。\n<span class='end'>—— 结局：地铁站-站厅层-被发现 ——</span>"
  },

  // ==================== 站厅·维修工工具串（钥匙链） ====================
  "地铁站-站厅-搜尸": {
    image: "images/placeholder.png" /* TODO: images/地铁站/搜尸.webp */,
    qte: {
      timeout: "5000",
      hidden: true,
      onTimeout: "结局-地铁站-翻尸失手"
    },
    text: "水瓶在大厅另一头弹跳的声响把三只丧尸都引了过去。\n\
你半蹲着挪到黄背心维修工身边——离得近了，那股味道让你胃里翻了个个。它的工牌还别在胸口，姓名栏被血糊住了。\n\
工具串挂在腰带上，五六把钥匙和一套内六角扳手，扣得死紧。你的手指在冷汗里打滑。",
    choices: [
      {
        text: "稳住手，把腰扣一颗颗解开",
        nextScene: "地铁站-站厅-工具串到手",
        effect: updateTime(2)
      },
      {
        text: "不翻了，快走",
        nextScene: "地铁站-安检区",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-站厅-缠斗": {
    image: "images/placeholder.png" /* TODO: images/地铁站/缠斗.webp */,
    qte: {
      timeout: "Math.max(2000, 4000 - chasedByZombies * 800)",
      hidden: true,
      onTimeout: "结局-地铁站-翻尸失手"
    },
    text: "你扑了上去，和黄背心的维修工一起撞在售票机上。\n\
它比你想象的要有力气——你压住它一边肩膀，它的脑袋一扭，牙齿离你的小臂只有一拳远。腰间的工具串硌在你们两个身体中间。",
    choices: [
      {
        text: "死死掐住它的脖子，把工具串整条拽下来",
        nextScene: "地铁站-站厅-工具串到手",
        condition: "strength >= 3",
        elseScene: "结局-地铁站-翻尸失手",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      },
      {
        text: "用膝盖压死它的手臂，转成慢慢解扣子",
        nextScene: "地铁站-站厅-搜尸",
        condition: "strength >= 2",
        elseScene: "结局-地铁站-翻尸失手"
      }
    ]
  },

  "结局-地铁站-翻尸失手": {
    image: "images/zombieKnockYouDown.webp",
    text: "一只手扣住了你的手腕。\n\
不是死人那种痉挛式的抽搐——是抓。黄背心底下那具躯体睁开了浑浊的眼睛，喉咙里滚出一声黏腻的咕哝，另一只手已经摸上了你的衣领。\n\
你翻了一路的死人，只有这一个，等你等得有点不耐烦了。\n<span class='end'>—— 结局：翻尸失手 ——</span>"
  },

  "地铁站-站厅-工具串到手": {
    image: "images/placeholder.png" /* TODO: images/地铁站/工具串.webp */,
    text: function(vars) {
      var desc = "工具串到你手里了——皮革腰包沉甸甸的，五六把钥匙，一套内六角扳手，还有半截写着编号的塑料牌。\n\
维修工的脸朝你的方向歪了歪，又垂了下去。你后退两步，才发现自己一直憋着气。";
      if (vars._lastScene === "地铁站-站厅-缠斗") {
        desc += "\n刚才那一下动静不小——大厅另一头的几个影子开始朝这边挪了。\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>";
      }
      return desc;
    },
    choices: [
      {
        text: "把工具串收进包里",
        condition: "itemCount < bagVolume && !hasMetroTools",
        elseScene: "整理整理",
        effect: updateTime(1, { set: { hasMetroTools: true }, add: { itemCount: 1 } }),
        nextScene: "地铁站-站厅-腰串收好"
      },
      {
        text: "先拎在手里，翻过闸机去安检区",
        nextScene: "地铁站-安检区",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-站厅-腰串收好": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stationHall.png */,
    text: "你把工具串卷紧，塞进包里最顺手的那一层。那扇“员工专用”的铁门就在闸机西侧——上面的钥匙里，总有一把是对得上的。",
    choices: [
      {
        text: "去开员工通道的铁门",
        nextScene: "地铁站-员工通道-铁门",
        effect: updateTime(1)
      },
      {
        text: "翻过闸机，去安检区",
        nextScene: "地铁站-安检区",
        effect: updateTime(2)
      },
      {
        text: "退回地面",
        nextScene: "东明路-三林路"
      }
    ]
  },

  // ==================== 员工通道（钥匙解锁的暗线） ====================
  "地铁站-员工通道-铁门": {
    image: "images/placeholder.png" /* TODO: images/地铁站/员工铁门.webp */,
    text: "闸机西侧的这扇铁门比看起来厚得多。“员工专用”的牌子歪挂着，门禁读卡器黑着屏，门缝里透出的黑暗里有股机油混着灰尘的味道。\n\
门框是焊死的钢架。旁边的墙上用红漆喷着一行褪色的字：“非工作人员止步”。",
    choices: function(vars) {
      var cs = [];
      if (vars.hasMetroTools) {
        cs.push({
          text: "用工具串上的钥匙开铁门",
          nextScene: "地铁站-员工通道-走廊",
          effect: updateTime(1)
        });
      }
      cs.push({
        text: "用肩膀撞开铁门",
        condition: "strength >= 4",
        elseScene: "地铁站-员工通道-撞门失败",
        effect: { add: { strength: -1, chasedByZombies: 2 } },
        nextScene: "地铁站-员工通道-走廊"
      });
      cs.push({
        text: "回到站厅",
        nextScene: "地铁站-站厅层",
        effect: updateTime(1)
      });
      return cs;
    }
  },

  "地铁站-员工通道-撞门失败": {
    image: "images/placeholder.png" /* TODO: images/地铁站/员工铁门.webp */,
    text: "你助跑了两步，用肩膀狠狠撞在铁门上。\n\
<span class='sfx'>哐</span>——门纹丝不动，反震力顺着肩胛骨一路麻到后槽牙。这一下声响在空荡的站厅里格外响亮，游荡的丧尸齐齐停住了脚，朝这个方向转过头来。\n\
你的肩膀火辣辣地疼，撞不动第二次了。",
    choices: [
      {
        text: "揉着肩膀，快步离开这里",
        nextScene: "地铁站-站厅层",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      }
    ]
  },

  "地铁站-员工通道-走廊": {
    image: "images/placeholder.png" /* TODO: images/地铁站/员工通道.webp */,
    text: function(vars) {
      var desc = "门后的走廊比站厅安静得多——那种被墙体包起来的、闷闷的安静。\n\
头顶的应急灯带还剩最后几格电，勉强照出：左手边的配电间铁门上挂着“动力照明”的牌子；右手边的站务室木门虚掩着；走廊尽头的墙上钉着一块下行楼梯的指示牌——“站台”。\n\
里面的门都没有再上锁——这道外门是唯一的一道锁。";
      if (vars._stationPowered) {
        desc += "\n灯带现在全亮了，走廊里亮堂得让人有点不习惯。";
      }
      return desc;
    },
    choices: [
      {
        text: "进配电间",
        nextScene: "地铁站-配电间",
        effect: updateTime(1)
      },
      {
        text: "进站务室",
        nextScene: "地铁站-站务室",
        effect: updateTime(1)
      },
      {
        text: "沿员工楼梯下到站台西端",
        nextScene: "地铁站-站台层",
        effect: updateTime(2),
        condition: "chasedByZombies < 4",
        elseScene: "地铁站-站台层-隧道尸潮"
      },
      {
        text: "回站厅",
        nextScene: "地铁站-站厅层",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 配电间（电力门槛：让列车活过来） ====================
  "地铁站-配电间": {
    image: "images/placeholder.png" /* TODO: images/地铁站/配电间.webp */,
    text: function(vars) {
      var desc = "配电间里一整排柜体靠墙立着，柜面上积着薄灰。\n\
检修面板上露出三排闸刀把手：红色的事故照明总闸、黄色的站台动力闸、灰色的商业回路闸。\n\
手电照过去，红色的把手上还留着半枚模糊的指印。";
      if (vars._procedureKnown) {
        desc += "\n你脑子里过了一遍站务室规程上那行字：<span class='sys'>恢复送电，先红后黄；灰色回路在故障状态下严禁带载。</span>";
      } else {
        desc += "\n哪个该先合？面板上没有任何提示。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._stationPowered) {
        cs.push({
          text: "合上红色闸刀（事故照明总闸）",
          nextScene: "地铁站-配电间-合红闸",
          effect: updateTime(1)
        });
        cs.push({
          text: "合上黄色闸刀（站台动力）",
          nextScene: "地铁站-配电间-跳闸",
          effect: updateTime(1)
        });
        cs.push({
          text: "合上灰色闸刀（商业回路）",
          nextScene: "地铁站-配电间-跳闸",
          effect: updateTime(1)
        });
      } else {
        cs.push({
          text: "看一眼运转中的配电柜",
          nextScene: "地铁站-配电间-合黄闸",
          effect: updateTime(1)
        });
      }
      cs.push({
        text: "退回走廊",
        nextScene: "地铁站-员工通道-走廊",
        effect: updateTime(1)
      });
      return cs;
    }
  },

  "地铁站-配电间-合红闸": {
    image: "images/placeholder.png" /* TODO: images/地铁站/配电间.webp */,
    text: "你把红色柄推到底。\n\
<span class='sfx'>啪嗒、啪嗒、啪嗒</span>——走廊方向传来灯带逐段点亮的轻响，门缝下面透进来一条稳定的白光。事故照明恢复了。\n\
配电间里的检修灯也亮了。柜体侧面的铭牌在灯下看得清清楚楚：<span class='sys'>动力送电前，须确认站台负荷已切除。</span>\n\
现在，还差黄色那一闸。",
    choices: [
      {
        text: "合上黄色闸刀（站台动力）",
        nextScene: "地铁站-配电间-合黄闸",
        effect: updateTime(1)
      },
      {
        text: "先停一停，回走廊看看",
        nextScene: "地铁站-员工通道-走廊",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-配电间-跳闸": {
    image: "images/placeholder.png" /* TODO: images/地铁站/配电间.webp */,
    onEnter: { shake: true },
    text: "闸刀合到一半，柜体里<span class='crit'>炸出一团青白色的火花</span>——总闸“砰”地弹了起来，检修灯应声熄灭，配电间重新沉回黑暗里。\n\
火花爆开的那一声在管道和墙体里嗡嗡地传了很远。你僵在原地，听着黑暗深处——站台方向、隧道方向——应和般地响起了好几声嘶吼。\n\
它们听见了。",
    choices: [
      {
        text: "把跳起的总闸推回去，回到柜前",
        nextScene: "地铁站-配电间",
        effect: { add: { chasedByZombies: 2 } }
      }
    ]
  },

  "地铁站-配电间-合黄闸": {
    image: "images/placeholder.png" /* TODO: images/地铁站/配电间.webp */,
    onEnter: updateTime(1, { set: { _stationPowered: true }, add: { chasedByZombies: 1 } }),
    text: "黄色柄合下的瞬间，整座车站像被人从梦里推醒了。\n\
站台方向，屏蔽门系统的指示灯一格一格转绿；车站广播发出一声电流杂音般的咳嗽，又归于沉默。站台端头的充电桩亮起绿灯——那节列车的蓄电池正在预充。\n\
<span class='rot'>而在更深的地方，在隧道两头的黑暗里，有什么东西也醒了——你听见一声悠长的、拖着的吼。</span>\n\
车站活了。但这座车站的每一寸动静，现在都不只属于你。",
    choices: [
      {
        text: "沿员工楼梯下到站台西端",
        nextScene: "地铁站-站台层",
        effect: updateTime(2),
        condition: "chasedByZombies < 4",
        elseScene: "地铁站-站台层-隧道尸潮"
      },
      {
        text: "回走廊",
        nextScene: "地铁站-员工通道-走廊",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 站务室（支线：情报 + 规程 + 物资） ====================
  "地铁站-站务室": {
    image: "images/placeholder.png" /* TODO: images/地铁站/站务室.webp */,
    text: function(vars) {
      var desc = "站务室的木门一推就开。屋里比走廊暖和一点，还残留着茶叶和打印纸的味道。\n\
值班台上的监控屏靠独立电池还亮着一格，蓝光映着摊开的值班日志——最后一行停在6月28日，字迹越写越潦草。墙角立着一个贴着红十字的应急柜。";
      if (!vars._procedureKnown) {
        desc += "\n手边还摊着一本《车站用电规程》，正翻在“恢复送电”那一页。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      cs.push({
        text: "调出监控回放",
        nextScene: "地铁站-站务室-监控",
        effect: updateTime(2)
      });
      if (!vars._procedureKnown) {
        cs.push({
          text: "翻看《车站用电规程》",
          nextScene: "地铁站-站务室-规程",
          effect: updateTime(1, { set: { _procedureKnown: true } })
        });
      }
      if (!vars.hasBottle) {
        cs.push({
          text: "从应急柜里拿一瓶矿泉水",
          condition: "itemCount < bagVolume",
          elseScene: "整理整理",
          effect: updateTime(1, { set: { hasBottle: true, bottleWater: 1 }, add: { itemCount: 1 } }),
          nextScene: "地铁站-站务室-拿水"
        });
      }
      if (!vars.hasBiscuit) {
        cs.push({
          text: "拿走应急柜里的压缩饼干",
          condition: "itemCount < bagVolume",
          elseScene: "整理整理",
          effect: updateTime(1, { set: { hasBiscuit: true }, add: { itemCount: 1 } }),
          nextScene: "地铁站-站务室-拿饼干"
        });
      }
      cs.push({
        text: "回走廊",
        nextScene: "地铁站-员工通道-走廊",
        effect: updateTime(1)
      });
      return cs;
    }
  },

  "地铁站-站务室-监控": {
    image: "images/placeholder.png" /* TODO: images/地铁站/监控回放.webp */,
    text: "你拖动进度条，回到6月28日。\n\
下午的画面还正常——站厅里人来人往，有人拎着行李，有人在自动售货机前排队。\n\
然后是傍晚：广播的横幅打了出来，人流猛地朝出入口涌——同时又有一股人流从上面灌下来，两股人在楼梯口对冲、挤压，像两股相反的洪水撞在同一截河道里。\n\
画面开始剧烈晃动。值班员冲着镜头的方向大喊着什么——监控没有声音，你只能看见他张大的嘴形。再往后，画面里的站台上全是跑动的人影，朝着隧道两端跑——然后一个机位、一个机位地黑下去。\n\
最后一个黑掉的，就是你现在站着的这层站台。\n\
值班台上的无线电台还噗噗地响着残电，循环着最后收到的那段：\n<span class='sys'>“……各站滞留人员注意……向迪士尼方向……集结……”</span>\n信号早就断了。它只是不肯承认。",
    choices: [
      {
        text: "关掉回放",
        nextScene: "地铁站-站务室",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-站务室-规程": {
    image: "images/placeholder.png" /* TODO: images/地铁站/规程.webp */,
    text: "“恢复送电”那一页被前任值班员用红笔描过一遍，像是怕自己忘了：\n<span class='sys'>先合事故照明总闸（红），后合站台动力（黄）。灰色商业回路在故障状态下严禁带载——短路火花可能触发联动报警。</span>\n\
页脚还有一行小字：“合闸前确认站台无人作业。”——这一条，你只能装作没看见了。",
    choices: [
      {
        text: "合上规程，记住这页",
        nextScene: "地铁站-站务室",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-站务室-拿水": {
    image: "images/placeholder.png" /* TODO: images/地铁站/站务室.webp */,
    text: "应急柜里的矿泉水码得整整齐齐，生产日期就在上个月。你拿了一瓶——瓶身还是凉的。\n<span class='sys'>【系统提示】获得矿泉水（有水）。</span>",
    choices: [
      {
        text: "关上柜门",
        nextScene: "地铁站-站务室",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-站务室-拿饼干": {
    image: "images/placeholder.png" /* TODO: images/地铁站/站务室.webp */,
    text: "压缩饼干的包装上落了层薄灰，擦一把就干净了。你把它塞进包里——这种东西，现在比钱值钱。\n<span class='sys'>【系统提示】获得压缩饼干。</span>",
    choices: [
      {
        text: "关上柜门",
        nextScene: "地铁站-站务室",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 安检区（QTE: 6s，隐藏） ====================
  "地铁站-安检区": {
    image: "images/placeholder.png" /* TODO: images/地铁站/securityCheck.png */,
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    qte: {
      timeout: "Math.max(2000, 6000 - chasedByZombies * 800)",
      hidden: true,
      onTimeout: "地铁站-安检区-犹豫"
    },
    text: function(vars) {
      var desc = "你来到安检区。X光安检机的传送带静止着，几件行李还卡在入口处。安检门后方的通道通向下一层——楼梯口就在前面大约二十米处。\n\
但在你前方，七八只丧尸聚集在安检通道周围，有的正在翻行李，有的漫无目的地在通道里踱步。\n它们暂时还没看到你。墙边有一个红色的消防栓箱，玻璃面反射着应急灯的光。旁边挂着一个灭火器。";
      if (vars._lastScene === "地铁站-站厅层-犹豫") { // 仅"撞开左边的丧尸冲过去"入口扣了1体力
        desc += "\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>";
      }
      return desc;
    },
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
        nextScene: "地铁站-安检区-爬X光机",
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
    image: "images/placeholder.png" /* TODO: images/地铁站/securityCheck.png */,
    onEnter: { shake: true },   // 身后楼梯也上来了，前后夹击
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

  // ===== 消防栓路线 =====
  "地铁站-安检区-消防栓": {
    image: "images/placeholder.png" /* TODO: images/地铁站/fireHose.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你一拳砸碎消防栓箱的玻璃，扯出盘卷的水带，拧开了阀门。\n高压水流猛地喷出，像一条白色的巨龙横扫过安检通道。丧尸群被冲得东倒西歪——几只被水流直接掀翻在地，其他的也被冲得连连后退，在湿滑的地砖上站不稳脚跟。\n水声在站厅里<span class='sfx'>轰</span>然回响，肯定吸引了更远处的注意——但至少现在，前方的路是干净的。\n消防栓箱里挂着一把消防斧，橙黄色的斧柄在冷光灯下格外醒目。",
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
    image: "images/placeholder.png" /* TODO: images/地铁站/securityCheck.png */,
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
    image: "images/placeholder.png" /* TODO: images/地铁站/axeSlaughter.png */,
    onEnter: { add: { strength: -1, chasedByZombies: 1 } },
    text: "你拔出消防斧，冲进了水幕中。\n第一只试图站起来的丧尸被你一斧头抡在头侧，直接飞出去砸在墙上。第二只刚从水里爬起来，斧刃已经劈进了它的肩颈。\n你像切菜一样在水幕中穿行。水声、斧声、骨裂声混在一起——等你回过神来，地上已经没有还能动的丧尸了。\n你浑身湿透，大口喘着气，但前方的路彻底打开了。你提着斧子走到楼梯口，把斧子靠在了墙上——太重了，带着它跑不是什么好主意。\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>",
    choices: [
      {
        text: "扔掉斧子，下楼梯",
        nextScene: "地铁站-楼梯",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-安检区-冲过水幕": {
    image: "images/placeholder.png" /* TODO: images/地铁站/securityCheck.png */,
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
    image: "images/placeholder.png" /* TODO: images/地铁站/securityCheck.png */,
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
    image: "images/placeholder.png" /* TODO: images/地铁站/securityCheck.png */,
    text: "你按下压把，白色的干粉喷涌而出，糊了最近一只丧尸满脸。但它只是甩了甩头，伸出双手朝你的方向摸了过来——它看不见了，但你还是站在它面前。\n你后退一步想拉开距离，但地上有一个不知道谁遗落的背包——你被绊了一下，身体往后倒去。\n在你摔倒在地之前，又有两只丧尸从雾中扑了出来。",
    choices: [
      {
        text: "想爬起来，但已经来不及了",
        nextScene: "结局-灭火器死亡"
      }
    ]
  },

  "结局-灭火器死亡": {
    image: "images/zombieKnockYouDown.webp",
    text: "你倒在地上，灭火器从手中脱落，<span class='sfx'>咕噜</span>噜地滚远了。白雾笼罩了你的视野，你什么都看不见——但你感觉到了它们的手抓住你的衣服、你的手臂、你的脖子。\n<span class='end'>—— 结局：灭火器死亡 ——</span>"
  },

  "地铁站-安检区-灭火器雾障": {
    image: "images/placeholder.png" /* TODO: images/地铁站/fireExtinguisherFog.png */,
    onEnter: { set: { _extinguisherUsed: true } },
    text: "你蹲下身，对着脚下的地面按下压把。白色的干粉迅速扩散开来，在你和丧尸群之间形成了一道浓密的雾障。\n你的视野也变得模糊了，但你记住了楼梯口的方向。你低着腰，在雾的掩护下快速穿过安检区。<span class='rot'>身后的丧尸传来了困惑的低吼——它们看不见你</span>，也不敢贸然冲进雾里。\n你穿过了安检区，安全到达了楼梯口。白雾在你身后缓缓沉降。",
    choices: [
      {
        text: "下楼",
        nextScene: "地铁站-楼梯-绕行",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 爬X光机（原免费通道，现在有代价） =====
  "地铁站-安检区-爬X光机": {
    image: "images/placeholder.png" /* TODO: images/地铁站/crawlXray.webp */,
    qte: {
      timeout: "5000",
      hidden: true,
      onTimeout: "结局-地铁站-传送带"
    },
    text: "你趴下身子，紧贴着地面，从X光安检机的传送带下方一点一点往前爬。机器底部积着一层灰，蹭了你一身。\n\
爬到一半，你的脚踝碰到了什么软的东西。\n\
是一只手。被卡在传送带支架里的、断掉的手。它动了。",
    choices: [
      {
        text: "猛地抽回腿，连滚带爬钻出去",
        nextScene: "地铁站-楼梯-绕行",
        effect: updateTime(1, { add: { chasedByZombies: 1 } })
      },
      {
        text: "缩回手脚，从另一侧退出去",
        nextScene: "地铁站-安检区",
        effect: updateTime(2)
      }
    ]
  },

  "结局-地铁站-传送带": {
    image: "images/zombieKnockYouDown.webp",
    text: "那只手顺着你的脚踝往上摸，攥住了你的小腿——然后是第二天手、第三只。\n\
你这才想起来：卡在传送带下面的，从来就不只是一只手。\n\
它们不着急。这条通道又窄又黑，它们在这里等了几天了，不差你这一会儿。\n<span class='end'>—— 结局：传送带 ——</span>"
  },

  // ===== 硬冲 =====
  "地铁站-安检区-硬冲": {
    image: "images/hurtByzombie.webp",
    onEnter: { add: { chasedByZombies: 2, mercuryLoad: 10 }, set: { hurtByZombie: true } },
    text: function(vars) {
      var painLine = vars.noPainSense
        ? "但第三只还是抓到了你的手臂，袖子被撕开一道口子，皮肉翻卷着——你先看见的是血，不是疼。" + mercuryPainNote(vars)
        : "但第三只还是抓到了你的手臂，袖子被撕开一道口子，皮肤火辣辣地疼。";
      var desc = "你深吸一口气，朝着楼梯口的方向猛冲过去。\n丧尸们被你突然的动作惊动，从几个方向同时朝你围拢。你撞开了一只挡路的，用肩膀顶开了另一只——" + painLine + "\n你甩开它，带着伤冲到了楼梯口。回头看时，丧尸群已经在你身后汇合了。";
      if (vars._lastScene === "地铁站-安检区-犹豫") { // 仅"抡起旁边的灭火器砸出一条路"入口扣了1体力
        desc += "\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>";
      }
      return desc;
    },
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
    image: "images/地铁站/楼梯.webp",
    qte: {
      timeout: "Math.max(2000, 4000 - chasedByZombies * 800)",
      onTimeout: "地铁站-楼梯-犹豫"
    },
    text: "你来到楼梯口。台阶向下延伸，转角处堆着一些被遗弃的行李箱和几只倒下的垃圾桶。站厅上游荡着十余只丧尸，他们好像看到了你，手脚并用慢慢爬上楼梯，向你围拢了过来。\n\
而在你身后，被你惊动的那些东西也没有停——它们正朝着楼梯口围过来。",
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
        elseScene: "结局-地铁站-楼梯-摔倒"
      },
      {
        text: "坐上扶手滑下去",
        nextScene: "地铁站-楼梯-滑扶手",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-楼梯-犹豫": {
    image: "images/hurtByzombie.webp",
    text: "你在楼梯口犹豫了一瞬——就是这一瞬，身后的追兵已经赶到了。<span class='crit'>一只湿漉漉的手抓住了你的衣领</span>，把你往后拽去。\n\
你失去平衡，在台阶上滚了下去，撞翻了下方转角处的丧尸。你和两三只丧尸纠缠在一起滚到了楼梯底部。\n你浑身是伤地爬起来，跑到站台另一侧——楼梯虽然下来了，但你的体力已经消耗殆尽。",
    choices: [
      {
        text: "拖着伤体爬进站台",
        nextScene: "地铁站-站台层",
        effect: { add: { strength: -2, chasedByZombies: 1, mercuryLoad: 10 }, set: { hurtByZombie: true } }
      }
    ]
  },

  "地铁站-楼梯-踹飞": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stairsKick.png */,
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
    image: "images/placeholder.png" /* TODO: images/地铁站/stairs.png */,
    text: "你紧握着扶手，在倾倒的行李箱和垃圾桶之间小心地绕行。身后的脚步声越来越近了，但你保持了节奏，没有慌乱。\n你顺利地下到了站台层。回头看了一眼——追兵被甩开了一段距离，但还在下来。",
    choices: [
      {
        text: "进入站台区",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  "结局-地铁站-楼梯-摔倒": {
    image: "images/zombieKnockYouDown.webp",
    text: "你的体力不足以支撑你在湿滑的地面上保持平衡。你脚下一滑，膝盖重重磕在台阶的边缘上。\n剧痛让你一时间站不起来——而身后的脚步声正在迅速逼近。\n你想爬起来，但已经来不及了。\n<span class='end'>—— 结局：地铁站-楼梯-摔倒 ——</span>"
  },

  "地铁站-楼梯-滑扶手": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stairs.png */,
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
        elseScene: "结局-地铁站-楼梯-摔倒"
      }
    ]
  },

  "地铁站-楼梯-滑扶手-踹": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stairsKick.png */,
    onEnter: { add: { strength: -1 } },
    text: "你在扶手上收腿，然后在接近它的瞬间猛地蹬了出去——一脚正中它的面门。丧尸被踹得向后仰倒，而你借着反冲力稳稳地落在地上。\n\
你回头看了一眼——它倒在台阶上，正在挣扎着爬起来。你没有等它。\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>",
    choices: [
      {
        text: "跑进站台",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  "地铁站-楼梯-滑扶手-撞": {
    image: "images/hurtByzombie.webp",
    onEnter: { add: { strength: -1, mercuryLoad: 10 }, set: { hurtByZombie: true } },
    text: "你来不及调整，直接撞上了它。你和丧尸一起摔在台阶上，滚了两圈。你挣扎着推开它的手臂和嘴巴——它咬了你一口。\n你终于把它踹开，爬起来一瘸一拐地冲进了站台。\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>",
    choices: [
      {
        text: "跑进站台",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 楼梯折返（站台死火后回站厅的变体路线） ====================
  "地铁站-楼梯-折返": {
    image: "images/placeholder.png" /* TODO: images/地铁站/stairsUp.webp */,
    text: "你调头往上爬。来路已经不是来时的样子了——被你甩开的那些东西重新聚回了楼梯，横七竖八地堵在台阶上，像一截被灌满的管道。\n\
有几只听见你的脚步，开始朝上爬。上行的路和下行的路一样难走。",
    choices: [
      {
        text: "踢开挡路的丧尸，硬冲上去",
        nextScene: "地铁站-安检区-回程",
        condition: "strength >= 3",
        elseScene: "结局-地铁站-楼梯-摔倒",
        effect: updateTime(2)
      },
      {
        text: "贴着台阶外侧，一级一级往上挪",
        nextScene: "地铁站-安检区-回程",
        effect: updateTime(4)
      }
    ]
  },

  "地铁站-安检区-回程": {
    image: "images/placeholder.png" /* TODO: images/地铁站/securityCheckReturn.webp */,
    qte: {
      timeout: "5000",
      hidden: true,
      onTimeout: "地铁站-安检区-犹豫"
    },
    text: "你爬回安检区。地上的水渍还没干透，被冲散的丧尸又聚了回来——比你来时更多，有几只还是从站厅方向新晃过来的。\n\
它们暂时还没锁定你。闸机和X光机的影子在应急灯下割成一块一块的，你得再穿一次这片地方。",
    choices: [
      {
        text: "快步穿过安检区，回站厅",
        nextScene: "地铁站-站厅层",
        effect: updateTime(2)
      },
      {
        text: "再退回站台",
        nextScene: "地铁站-站台层",
        effect: updateTime(2)
      }
    ]
  },

  // ==================== 站台层（QTE: 3s，可见；强黑暗） ====================
  "地铁站-站台层": {
    image: "images/地铁站/站台.webp",
    onEnter: { set: { currentPlace: "东明路", currentPos: "地铁站" } },
    qte: {
      timeout: "Math.max(2000, 3000 - chasedByZombies * 800)",
      onTimeout: "地铁站-站台层-犹豫"
    },
    text: function(vars) {
      var desc = "你到了站台层。";
      if (vars._stationPowered) {
        desc += "恢复供电后的站台亮得晃眼——屏蔽门指示灯一格一格的绿，把每根立柱的影子都钉在地上。轨道对面那节列车的灯带也亮了，隔着玻璃能看见空荡荡的车厢。\n\
站台上的五六只丧尸被突然亮起的灯光惊动了，正在茫然地原地打转——但它们很快就会想起光线里那个站着的东西是什么。";
      } else if (vars.hasTorch || vars.hasFireTorch) {
        desc += "这里黑得像口井，只有头顶的应急出口标志泛着一点绿光。你的光源照出去，只切出窄窄的一小片——屏蔽门沿线的黑影里有五六只丧尸，被光柱扫到的那只迟缓地转过了头。\n\
轨道对面停着一节列车，车厢黑着，像一条搁浅的鲸。";
      } else {
        desc += "<span class='rot'>黑。真正的黑。</span>应急出口标志的绿光浮在几十米外，像水底下的一点磷火。你什么都看不见——只有屏蔽门玻璃上你自己的指尖，和脚下那种踩过无数杂物的、深一脚浅一脚的触感。\n\
黑暗里有移动的声音。不止一处。";
      }
      if (vars._extinguisherUsed) {
        desc += "\n你手上已经没有灭火器了——刚才在上面用掉了。";
      } else {
        desc += "\n你注意到站台墙边还有一个灭火器。你手上还有一个。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      var lit = vars._stationPowered || vars.hasTorch || vars.hasFireTorch;
      if (lit) {
        if (!vars._extinguisherUsed) {
          cs.push({
            text: "拉开灭火器制造雾障，掩护穿行",
            nextScene: "地铁站-站台层-灭火器雾障",
            effect: updateTime(2),
            condition: "chasedByZombies < 4",
            elseScene: "地铁站-站台层-隧道尸潮"
          });
        }
        cs.push({
          text: "沿屏蔽墙边缘潜行到列车门",
          nextScene: "地铁站-站台层-潜行",
          effect: updateTime(4),
          condition: "chasedByZombies < 4",
          elseScene: "地铁站-站台层-隧道尸潮"
        });
        cs.push({
          text: "直接冲向列车门",
          nextScene: "地铁站-站台层-硬冲",
          effect: updateTime(2),
          condition: "chasedByZombies < 4",
          elseScene: "地铁站-站台层-隧道尸潮"
        });
        cs.push({
          text: "从站台西端的员工门回走廊",
          nextScene: "地铁站-员工通道-走廊",
          effect: updateTime(1)
        });
      } else {
        cs.push({
          text: "贴着屏蔽墙，朝列车的方向摸过去",
          nextScene: "地铁站-站台层-摸黑",
          effect: updateTime(3),
          condition: "chasedByZombies < 4",
          elseScene: "地铁站-站台层-隧道尸潮"
        });
      }
      cs.push({
        text: "沿公共楼梯回站厅",
        nextScene: "地铁站-楼梯-折返",
        effect: updateTime(2)
      });
      return cs;
    }
  },

  "地铁站-站台层-犹豫": {
    image: "images/placeholder.png" /* TODO: images/地铁站/platform.png */,
    text: "你在站台入口停下了脚步——丧尸太多了。就是这一瞬间的犹豫，它们已经发现了你。从左右两侧同时包抄过来。\n你后退一步，背抵到了墙上。没有路可退了——你必须立刻决定怎么冲过去。",
    choices: [
      {
        text: "拼命冲！撞开挡路的",
        nextScene: "地铁站-站台层-硬冲",
        condition: "chasedByZombies < 4",
        elseScene: "地铁站-站台层-隧道尸潮",
        effect: { add: { strength: -1, chasedByZombies: 1 } }
      },
      {
        text: "退回楼梯",
        nextScene: "地铁站-楼梯-折返",
        effect: { add: { chasedByZombies: 1 } }
      }
    ]
  },

  "地铁站-站台层-灭火器雾障": {
    image: "images/地铁站/灭火器雾障.webp",
    onEnter: { set: { _extinguisherUsed: true } },
    text: "你拔掉保险销，对着站台地面按下压把。白色的干粉喷涌而出，在站台上迅速蔓延开来。\n\
你低身钻入雾中，沿着屏蔽墙快速移动。丧尸的吼叫声在白雾中变得闷钝而遥远——它们看不见你，你也看不见它们，但你记住了列车门的方向。\n\
你从雾的另一端钻出时，已经站在了那扇列车门前。",
    choices: [
      {
        text: "踏入车厢",
        nextScene: "地铁站-选择列车"
      }
    ]
  },

  "地铁站-站台层-潜行": {
    image: "images/placeholder.png" /* TODO: images/地铁站/platform.png */,
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
    image: "images/placeholder.png" /* TODO: images/地铁站/platform.png */,
    onEnter: { add: { chasedByZombies: 2 }, shake: true },
    text: function(vars) {
      var desc = "你撒腿就跑。站台上的丧尸被你突然的动作惊动，从各个方向朝你追来。\n\
你在一排排屏蔽门之间狂奔，<span class='rot'>身后拖着一串越来越长的脚步声和嘶吼声</span>。列车门就在前方——你冲进去的时候，最近的一只丧尸离你只有几步之遥。\n你转过身，面对着正在涌来的丧尸群，站在车厢里大口喘气。";
      if (vars._lastScene === "地铁站-站台层-犹豫") { // 仅"拼命冲！撞开挡路的"入口扣了1体力
        desc += "\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>";
      }
      return desc;
    },
    choices: [
      {
        text: "赶紧找地方躲进车厢深处",
        nextScene: "地铁站-选择列车",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 摸黑（无光源时的赌命通道） =====
  "地铁站-站台层-摸黑": {
    image: "images/placeholder.png" /* TODO: images/地铁站/platformDark.webp */,
    qte: {
      timeout: "4000",
      hidden: true,
      onTimeout: "结局-地铁站-坠落轨道"
    },
    text: "你把指尖贴在屏蔽门的玻璃上，当作导航的堤岸，一步一步往前挪。\n\
脚下的地面黏糊糊的，踩上去有细小的、不肯碎的东西。空气里的味道浓得化不开。\n\
五十步。六十步。黑暗里有很轻的、指甲刮玻璃的声音——就在你前方，不远。",
    choices: [
      {
        text: "压低身子，贴着立柱从声音旁边绕过去",
        nextScene: "地铁站-选择列车",
        effect: updateTime(3)
      },
      {
        text: "不走了，原路摸回去",
        nextScene: "地铁站-站台层",
        effect: updateTime(2)
      }
    ]
  },

  "结局-地铁站-坠落轨道": {
    image: "images/placeholder.png" /* TODO: images/地铁站/坠落轨道.webp */,
    text: "你数到第八十一步的时候，脚下忽然没有了地面。\n\
站台和列车之间的缝隙比你摸出来的任何一段路都宽。你下坠的那半秒里脑子意外地清楚——原来刮玻璃的声音不是在前方，是在下面。\n\
道床上那些更早摸过来的人，接住了你。\n<span class='end'>—— 结局：坠落轨道 ——</span>"
  },

  // ===== 隧道尸潮（噪声清算点：chasedByZombies >= 4） =====
  "地铁站-站台层-隧道尸潮": {
    image: "images/placeholder.png" /* TODO: images/地铁站/隧道尸潮.webp */,
    onEnter: { shake: true },
    text: "你刚要迈步——隧道两端同时响起了脚步声。\n\
不是一只两只。是墙一样推进的声音，从左右两个方向的黑暗里灌进站台，把整个站台层当成了一根管道。应急灯开始一颗一颗地闪。\n\
你在站台上，无路可退。",
    choices: [
      {
        text: "冲进列车，抵死关上车门",
        condition: "_stationPowered",
        elseScene: "结局-地铁站-尸潮围堵",
        nextScene: "地铁站-发车确认",
        effect: updateTime(1)
      },
      {
        text: "退进站台西端的员工楼梯间",
        nextScene: "地铁站-员工通道-走廊",
        effect: updateTime(1)
      },
      {
        text: "缩到屏蔽墙后，屏住呼吸",
        condition: "strength >= 2",
        elseScene: "结局-地铁站-尸潮围堵",
        nextScene: "地铁站-站台层-屏息",
        effect: updateTime(2)
      }
    ]
  },

  "地铁站-站台层-屏息": {
    image: "images/placeholder.png" /* TODO: images/地铁站/platformHold.webp */,
    onEnter: { add: { chasedByZombies: -2 } },
    text: "你把自己折叠进屏蔽墙和立柱之间的死角，把呼吸压成一条线。\n\
潮水从你面前漫过去——数不清的脚、拖着的身体、撞在屏蔽门玻璃上的手。有什么东西在你的藏身处外停了一瞬，鼻音一样的嗅闻声近得像贴着你的耳朵。\n\
然后它跟着大部队过去了。\n\
不知道过了多久，站台重新只剩下滴水声。你从墙后爬出来的时候，腿是软的。",
    choices: [
      {
        text: "从死角里出来，回到站台",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      }
    ]
  },

  "结局-地铁站-尸潮围堵": {
    image: "images/zombieKnockYouDown.webp",
    text: "它们不是跑过来的——是塌方一样塌过来的。\n\
你最后看到的画面是应急灯，它在成百上千个头顶的碰撞下，一闪、一闪、然后熄灭。\n\
站台的广播如果还活着，此刻大概会报出那句它最熟悉的话：请勿越过黄色安全线。\n<span class='end'>—— 结局：尸潮围堵 ——</span>"
  },

  // ==================== 列车 ====================
  "地铁站-选择列车": {
    image: "images/地铁站/车厢里.webp" /* TODO: images/地铁站/trainInterior.png */,
    onEnter: { set: { _extinguisherUsed: false } },
    text: function(vars) {
      if (vars._stationPowered) {
        return "你踏进车厢。灯带亮着，空调口居然还有一丝冷风——蓄电池的预充指示在车门上方一格一格地爬满。\n\
座椅上散落着几份报纸和一个水杯，都保持着六天前有人在场时的样子。穿过整节车厢，你能看到驾驶室的方向。车厢另一端的电子显示屏亮着，滚动着一行字：“本车以蓄电池救援模式运行，终点站：迪士尼。”";
      }
      return "你摸进车厢，反手把门带上。\n\
车厢里黑得只看得见门缝那一线。座椅上散落着几份报纸和一个水杯——你撞到一副骨架般的东西，过了两秒才反应过来那只是个行李箱。\n\
你摸到驾驶室门口，凭着记忆按下面板上凸起的几个键。没有反应。再按，还是没有。\n\
这节车没有电。\n\
你想起入口台阶上那具穿黄色背心的维修工——它的腰间，挂着一整串工具。";
    },
    choices: function(vars) {
      var cs = [];
      if (vars._stationPowered) {
        cs.push({
          text: "进驾驶室",
          nextScene: "地铁站-发车确认",
          condition: "chasedByZombies < 4",
          elseScene: "地铁站-站台层-隧道尸潮",
          effect: updateTime(1)
        });
      } else {
        cs.push({
          text: "沿楼梯回站厅，去找维修工的工具",
          nextScene: "地铁站-楼梯-折返",
          effect: updateTime(2)
        });
      }
      cs.push({
        text: "看看车厢里的线路图",
        nextScene: "地铁站-线路图"
      });
      cs.push({
        text: "下车，回到站台",
        nextScene: "地铁站-站台层",
        effect: updateTime(1)
      });
      return cs;
    }
  },

  "地铁站-线路图": {
    image: "images/placeholder.png" /* TODO: images/地铁站/trainMap.png */,
    text: "你凑到线路图前。11号线贯穿上海西北到东南：嘉定北→……→三林东路→浦三路→御桥→迪士尼。\n\
图下角印着一行小字：往嘉定北方向的隧道因故障封闭——那头的轨道上，据说横着好几节脱线的废车厢。\n\
能走的，只剩迪士尼这一个方向。",
    choices: [
      {
        text: "回到车厢",
        nextScene: "地铁站-选择列车",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 发车（不可逆） ====================
  "地铁站-发车确认": {
    image: "images/placeholder.png" /* TODO: images/地铁站/驾驶室.webp */,
    text: "你推开驾驶室的门，坐进驾驶座。蓄电池的余量表停在绿区，救援模式的推杆立在面板正中，红色，很显眼。\n\
玻璃外是隧道口那团化不开的黑。身后，是你走过的这一整座城市——街道、商场、学校、医院，和你留下来的一切。\n\
推下推杆，车门关闭，列车启动。这一走，就没有回头路了。",
    choices: [
      {
        text: "推下牵引推杆",
        nextScene: "地铁站-迪士尼方向",
        effect: updateTime(5)
      },
      {
        text: "松开手，回到车厢再想想",
        nextScene: "地铁站-选择列车",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 出发！ ====================
  "地铁站-迪士尼方向": {
    image: "images/placeholder.png" /* TODO: images/地铁站/trainDeparting.png */,
    onEnter: { set: { currentArea: "迪士尼", currentPlace: "迪士尼", currentPos: "迪士尼" } },
    text: "你按下了关门按钮。屏蔽门缓缓合上，把站台上所有追过来的东西都关在了外面。\n\
救援模式的列车开得很慢，慢得像在爬。轨道有节奏地撞击着，车窗外的黑暗被偶尔掠过的应急灯打断。\n\
大概二十分钟后，列车开始减速。窗外出现了灯光——不是应急灯的惨白，是探照灯那种稳定的、有人维护的亮。站台的轮廓在黑暗中浮现出来。\n\
显示屏切换了一行文字：“迪士尼站到了。”",
    choices: [
      {
        text: "下车",
        nextScene: "结局-迪士尼-幸存者聚居地"
      }
    ]
  }
});

// ===== 迪士尼 · 好结局占位（后续做正片区域时改回普通区域节点） =====
Object.assign(storyData, {
  "结局-迪士尼-幸存者聚居地": {
    image: "images/placeholder.png" /* TODO: images/迪士尼/门口.webp */,
    text: "列车停稳，门开了。\n\
站台被探照灯照得雪亮，轨道对面垒着沙袋和拒马，沙袋后面有人影在活动——活的、会喊话的人影。\n\
一只喇叭响起，带着电流的毛边：“站台上的！举起双手！慢慢走过来！”\n\
你举起双手，朝着灯光走过去。腿还在抖，但你没有停。\n\
你走到了。\n<span class='end'>—— 抵达：幸存者聚居地 ——</span>\n（作者尚未更新此处，后续剧情待制作）"
  }
});
