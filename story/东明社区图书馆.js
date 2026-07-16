// ========== 东明社区图书馆剧情 ==========
// 通过逐层清理丧尸，解锁图书馆作为夜间安全屋
// 清理后在图书馆过夜至Day3 → "临时的避难所"成功结局

Object.assign(storyData, {

  // ==================== 入口 ====================
  "图书馆": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFront.png */,
    onEnter: { set: { currentPlace: "东明路", currentPos: "图书馆" } },
    text: function(vars) {
      if (vars.libraryCleared) return "你再次来到东明社区图书馆。玻璃门上还留着上次你清理时留下的痕迹。里面很安静——你知道，现在这里是安全的。";
      return "你来到东明社区图书馆。这是一栋不大的独栋建筑，灰色的外墙爬满了半枯的藤蔓。玻璃门上贴着闭馆通知，日期停留在七月初。\n门没有锁。";
    },
    choices: [
      { text: "进去看看", nextScene: "图书馆-大厅", showCondition: "libraryCleared" },
      { text: "推门进去", nextScene: "图书馆-大厅", showCondition: "!libraryCleared" },
      { text: "绕到侧面试试窗户", nextScene: "图书馆-侧窗", showCondition: "!libraryCleared" },
      { text: "回东明路", nextScene: "东明路-三林路", showCondition: "libraryCleared" },
      { text: "算了，不进去了", nextScene: "东明路-三林路", showCondition: "!libraryCleared" }
    ]
  },

  "图书馆-侧窗": {
    image: "images/placeholder.png" /* TODO: images/library/librarySide.png */,
    text: "你绕到图书馆侧面。一扇通风窗半开着，窗沿上积了厚厚一层灰。你垫脚往里看——里面是阅览室，几张长桌整齐排列着，角落里似乎坐着一个人。\n它没有动。",
    choices: [
      {
        text: "翻窗进去",
        nextScene: "图书馆-阅览室",
        effect: updateTime(3)
      },
      {
        text: "还是走正门吧",
        nextScene: "图书馆-大厅"
      }
    ]
  },

  // ==================== 大厅 ====================
  "图书馆-大厅": {
    image: "images/placeholder.png" /* TODO: images/library/libraryHall.png */,
    text: "你推开门，走进图书馆大厅。正前方是前台和还书机，左手边是阅览室，右手边是藏书区的入口。大厅中央站着一只丧尸——穿着图书馆志愿者的马甲，正漫无目的地原地踱步。\n\
它还没注意到你。",
    choices: [
        { text: "蹲下身子，从前台下方绕过去", nextScene: "图书馆-大厅-潜行", effect: updateTime(2) },
        { text: "从书架上抽一本书，朝另一侧扔出去", nextScene: "图书馆-大厅-声东击西", effect: updateTime(1) },
        { text: "抄起门口的铁质书立，上去解决它", nextScene: "图书馆-大厅-战斗", condition: "hasCane || hasMopHandle || hasIronPipe || strength >= 3", elseScene: "图书馆-大厅-徒劳" }
    ]
  },

  "图书馆-大厅-潜行": {
    image: "images/placeholder.png" /* TODO: images/library/libraryHall.png */,
    text: "你弯下腰，贴着前台边缘缓慢移动。志愿者丧尸在你几步之外来回踱步，你甚至能闻到它身上那股陈旧的霉味。\n你屏住呼吸，一点一点地挪到了阅览室入口的方向。它没有发现你。",
    choices: [
      {
        text: "继续前往阅览室",
        nextScene: "图书馆-阅览室"
      }
    ]
  },

  "图书馆-大厅-声东击西": {
    image: "images/placeholder.png" /* TODO: images/library/libraryBookThrow.png */,
    text: "你随手从书架上抽出一本《浦东新区地方志》，朝大厅另一侧的走廊扔了过去。书砸在墙壁上，发出沉闷的啪嗒声。\n志愿者丧尸猛地转头，拖着步子朝声音的方向走去。\n你趁这个机会快速穿过了大厅。",
    choices: [
      {
        text: "溜进阅览室",
        nextScene: "图书馆-阅览室"
      },
      {
        text: "趁它背对你，从后面接近它",
        nextScene: "图书馆-大厅-背后突袭",
        condition: "hasCane || hasMopHandle || hasIronPipe || hasCutter",
        elseScene: "图书馆-阅览室"
      }
    ]
  },

  "图书馆-大厅-背后突袭": {
    image: "images/placeholder.png" /* TODO: images/library/libraryHall.png */,
    onEnter: { add: { strength: -1 } },
    text: function(vars) {
      let wpn = "手中的家伙";
      if (vars.hasIronPipe) wpn = "铁管";
      else if (vars.hasCane) wpn = "拐杖";
      else if (vars.hasMopHandle) wpn = "拖把杆";
      return "你压低脚步跟了上去。志愿者丧尸正对着墙上被书砸出的痕迹发呆——它不太聪明的样子。\n你举起" + wpn + "，对着它的后脑勺来了一下。它扑通一声倒在地上，不动了。\n你把它拖到前台后面，至少看上去不那么扎眼了。";
    },
    choices: [
      {
        text: "继续探索",
        nextScene: "图书馆-阅览室"
      }
    ]
  },

  "图书馆-大厅-战斗": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFight.png */,
    onEnter: { add: { strength: -1 } },
    text: function(vars) {
      let wpn = "手中的家伙";
      if (vars.hasIronPipe) wpn = "铁管";
      else if (vars.hasCane) wpn = "拐杖";
      else if (vars.hasMopHandle) wpn = "拖把杆";
      return "你握紧" + wpn + "，大步迎了上去。志愿者丧尸听到脚步声转过身来，张开嘴发出嘶哑的吼叫——但你比它快。\n一记结实的打击正中它的头部。它晃了晃，倒在地上不再动弹。\n你喘了口气。动静有点大，可能会把其他地方的东西引过来。";
    },
    choices: [
      {
        text: "赶紧离开大厅",
        nextScene: "图书馆-阅览室"
      }
    ]
  },

  "图书馆-大厅-徒劳": {
    image: "images/zombieKnockYouDown.png",
    text: "你冲向志愿者丧尸，但手里没有像样的武器——你只能用拳头。\n你一拳打在它胸口，它只是退了两步，然后猛地抓住了你的手臂。它的力气比你想象中大得多。\n你挣扎着想甩开它，但大厅里的动静引来了更多麻烦——藏书区方向传来了回应般的低吼。\n两只丧尸一前一后堵住了你的退路。"
  },

  // ==================== 阅览室 ====================
  "图书馆-阅览室": {
    image: "images/placeholder.png" /* TODO: images/library/libraryReadingRoom.png */,
    text: "你走进阅览室。几排长桌整齐排列，桌面上散落着几本书和借阅登记表。日光灯管还在微弱地闪烁，发出嗡嗡的电流声。\n\
靠窗的座位上坐着一个人——一只穿着格子衬衫的丧尸。它低着头，双手捧着一本摊开的书，像在阅读一样。\n你没出声，但它似乎感觉到了什么，翻页的动作停了一下。",
    choices: [
      {
        text: "沿着墙边书架绕过去",
        nextScene: "图书馆-阅览室-绕行",
        effect: updateTime(2)
      },
      {
        text: "压低身形从桌椅之间穿过去",
        nextScene: "图书馆-阅览室-穿行",
        effect: updateTime(2)
      },
      {
        text: "打量一下它在看什么书",
        nextScene: "图书馆-阅览室-看书名",
        effect: updateTime(1)
      }
    ]
  },

  "图书馆-阅览室-看书名": {
    image: "images/placeholder.png" /* TODO: images/library/libraryReadingRoom.png */,
    text: "你眯起眼睛，试图看清它手里的书脊。《霍乱时期的爱情》。\n真讽刺。\n你再往前凑了半步——椅子突然发出了吱嘎一声。\n格子衬衫丧尸猛地合上书，站了起来。",
    choices: [
      {
        text: "赶紧解释——但对面是丧尸",
        nextScene: "图书馆-阅览室-惊醒"
      }
    ]
  },

  "图书馆-阅览室-惊醒": {
    image: "images/placeholder.png" /* TODO: images/library/libraryZombieStandUp.png */,
    text: "格子衬衫丧尸直直地盯着你。它合上书，朝你迈了一步——手里的书攥得紧紧的，像是要拿它砸你。\n随后它低吼一声，朝你扑了过来。",
    choices: [
      {
        text: "侧身闪开，推倒书架挡住它",
        nextScene: "图书馆-阅览室-书架倒",
        condition: "strength >= 3",
        elseScene: "结局-图书馆-书堆"
      },
      {
        text: "用家伙招呼它",
        nextScene: "图书馆-阅览室-战斗",
        condition: "hasCane || hasMopHandle || hasIronPipe || hasCutter",
        elseScene: "图书馆-阅览室-徒手"
      },
      {
        text: "转身就跑",
        nextScene: "图书馆-阅览室-跑"
      }
    ]
  },

  "图书馆-阅览室-书架倒": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFallingShelf.png */,
    onEnter: { add: { strength: -1 } },
    text: "你侧身闪过它的扑击，肩膀狠狠撞在旁边的书架上。书架晃了晃——你又加了一把力。\n沉重的书架朝格子衬衫丧尸倒了下去，把它连带着旁边的桌椅一起压在了下面。书页像雪花一样在空中飞舞。\n书架下面传来低沉的嘶吼声，但很快就没有动静了。",
    choices: [
      {
        text: "穿过阅览室继续前进",
        nextScene: "图书馆-藏书区入口"
      }
    ]
  },

  "图书馆-阅览室-战斗": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFight.png */,
    onEnter: { add: { strength: -1 } },
    text: function(vars) {
      let wpn = "手中的家伙";
      if (vars.hasIronPipe) wpn = "铁管";
      else if (vars.hasCane) wpn = "拐杖";
      else if (vars.hasMopHandle) wpn = "拖把杆";
      return "你挥出" + wpn + "，准准地砸在了它的脑袋上。它踉跄了一步，但居然没有倒下——反而挥舞着那本厚书朝你脸上招呼过来。\n你后退两步，趁它重心不稳，又是一下。这一次它终于趴下了。";
    },
    choices: [
      {
        text: "穿过去",
        nextScene: "图书馆-藏书区入口"
      }
    ]
  },

  "图书馆-阅览室-徒手": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFight.png */,
    onEnter: { add: { strength: -2 } },
    text: "你只能用拳头。你躲开它挥舞的书，一拳打在它脸上——但自己也被它挠了一下，手臂上火辣辣地疼。\n你在阅览椅上磕绊着后退，抓起一把椅子挡在身前，总算把它顶开了一段距离。趁这个机会，你转身冲向了藏书区的方向。",
    choices: [
      {
        text: "捂着伤口继续跑",
        nextScene: "图书馆-藏书区入口",
        effect: { set: { hurtByZombie: true } }
      }
    ]
  },

  "图书馆-阅览室-跑": {
    image: "images/placeholder.png" /* TODO: images/library/libraryReadingRoom.png */,
    onEnter: updateTime(1),
    text: "你转身就跑。格子衬衫丧尸在身后追了几步，但阅览室的椅子绊了它一下——它摔在地上，发出一声沉闷的声响。\n你没有回头看，直接冲进了藏书区。",
    choices: [
      {
        text: "继续往前",
        nextScene: "图书馆-藏书区入口"
      }
    ]
  },

  "图书馆-阅览室-绕行": {
    image: "images/placeholder.png" /* TODO: images/library/libraryReadingRoom.png */,
    text: "你紧贴着墙壁，沿着书架边缘一点一点地移动。格子衬衫丧尸没有抬头——它似乎完全沉浸在书里。\n你安全地绕过了它，抵达了阅览室另一头的出口。",
    choices: [
      {
        text: "进入藏书区",
        nextScene: "图书馆-藏书区入口"
      }
    ]
  },

  "图书馆-阅览室-穿行": {
    image: "images/placeholder.png" /* TODO: images/library/libraryReadingRoom.png */,
    text: "你弯着腰，从桌椅之间穿行。桌上的书和纸张在你经过时微微晃动。\n你走到一半时，格子衬衫丧尸突然翻了一页——哗啦一声。你的心提到了嗓子眼，但它只是继续看书，没有抬头。\n你安全地穿过了阅览室。",
    choices: [
      {
        text: "进入藏书区",
        nextScene: "图书馆-藏书区入口"
      }
    ]
  },

  // ==================== 藏书区入口 ====================
  "图书馆-藏书区入口": {
    image: "images/placeholder.png" /* TODO: images/library/libraryBookshelf.png */,
    text: "你站在藏书区的入口。两排高耸的书架之间是一条狭窄的通道，尽头拐向办公室。\n身后传来拖沓的脚步声——大厅里那只志愿者丧尸，或者别的什么东西，跟上来了。声音越来越近。",
    qte: {
      timeout: "6000 - chasedByZombies * 500",
      hidden: true,
      onTimeout: "结局-图书馆-书架间"
    },
    choices: [
      {
        text: "钻进左边的书架间隙",
        nextScene: "图书馆-藏书区-左",
        effect: updateTime(1)
      },
      {
        text: "沿着右边主通道快跑",
        nextScene: "图书馆-藏书区-右",
        effect: updateTime(1)
      },
      {
        text: "直接冲向通道尽头的门",
        nextScene: "图书馆-藏书区-直冲",
        effect: updateTime(1)
      }
    ]
  },

  "图书馆-藏书区-左": {
    image: "images/placeholder.png" /* TODO: images/library/libraryBookshelf.png */,
    text: "你侧身挤进书架之间的缝隙。这里堆着一些积满灰尘的旧书，几本厚重的百科全书靠在墙角。\n你屏住呼吸，听着身后的脚步声越来越近——但脚步声没有停下来，而是继续沿着主通道远去了。\n你安全了。等外面的动静消失后，你从缝隙里钻了出来，发现直接到了办公室门口。",
    choices: [
      {
        text: "推开办公室的门",
        nextScene: "图书馆-办公室"
      }
    ]
  },

  "图书馆-藏书区-右": {
    image: "images/placeholder.png" /* TODO: images/library/libraryBookshelf.png */,
    text: "你沿着主通道一路奔跑。两侧的书架在你身边飞速后退，通道尽头是一扇防火门。\n但一只丧尸从前方的拐角突然冒了出来——它穿着图书馆的工装背心，听到脚步声转过身来。\n你刹不住脚步，几乎和它撞了个满怀。",
    choices: [
      {
        text: "用肩膀撞开它",
        nextScene: "图书馆-藏书区-冲撞",
        condition: "strength >= 3",
        elseScene: "图书馆-藏书区-扭打"
      },
      {
        text: "抓起旁边的书砸它的脸",
        nextScene: "图书馆-藏书区-砸脸"
      }
    ]
  },

  "图书馆-藏书区-冲撞": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFight.png */,
    onEnter: { add: { strength: -1 } },
    text: "你低下肩膀，狠狠撞在工装丧尸的胸口。它被你撞得向后飞去，后脑勺磕在书架上，滑坐在地上——不动了。\n你顾不上查看，继续往前冲了出去。防火门后面是一条短走廊，连着办公室。",
    choices: [
      {
        text: "推开办公室的门",
        nextScene: "图书馆-办公室"
      }
    ]
  },

  "图书馆-藏书区-砸脸": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFight.png */,
    onEnter: { add: { strength: -1 } },
    text: "你随手从书架上抽出一本书——运气不错，是一本厚厚的《英汉大词典》——抡圆了朝它脸上招呼过去。\n工装丧尸被砸得向后一仰，脚后跟绊在书架底部的踢脚线上，一屁股坐倒在地。你趁机从它身边冲了过去。\n防火门就在眼前。你拉开门冲了进去。",
    choices: [
      {
        text: "继续",
        nextScene: "图书馆-办公室"
      }
    ]
  },

  "图书馆-藏书区-扭打": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFight.png */,
    onEnter: { add: { strength: -2 }, set: { hurtByZombie: true } },
    text: "你没能撞开它——你的体力不够。工装丧尸抓住了你的手臂，你和它扭打在一起。你咬紧牙关，用膝盖顶它的肚子，用手肘砸它的脸。\n终于，你挣脱了它，把它推进了旁边书架之间的缝隙里。你顾不上身上的抓伤，拉开通往办公室的门冲了进去，反手把门关上。",
    choices: [
      {
        text: "锁上门",
        nextScene: "图书馆-办公室"
      }
    ]
  },

  "图书馆-藏书区-直冲": {
    image: "images/placeholder.png" /* TODO: images/library/libraryBookshelf.png */,
    text: "你撒腿就跑，脚掌在瓷砖地面上发出急促的啪嗒声。通道比你想象的更长——两侧的书架像无限延伸的墙壁。\n\
你冲到通道尽头，拐过弯，看到了一扇贴着\"办公区\"牌子的门。你拉开门钻了进去，反手关上。\n外面传来脚步声由远及近，然后在门外停了下来。几秒后，脚步声又渐渐远去了。",
    choices: [
      {
        text: "看向面前的房间",
        nextScene: "图书馆-办公室"
      }
    ]
  },

  // ==================== 办公室（最终战） ====================
  "图书馆-办公室": {
    image: "images/placeholder.png" /* TODO: images/library/libraryOffice.png */,
    text: "你走进办公室。房间不大，一张办公桌、一个文件柜、墙上挂着一串钥匙。窗外是图书馆的后巷。\n\
办公桌旁边倒着一个铁皮柜子，下面压着什么——一条穿着深蓝色裤子的腿。柜子下面传来含混的呻吟声，被压住的那只丧尸正徒劳地试图抽出手臂。\n\
墙上的钥匙串在日光灯下反射着光——上面挂着几把不同的钥匙，其中一把看起来像是消防通道的。",
    choices: [
      {
        text: "绕过它，去拿墙上的钥匙",
        nextScene: "图书馆-办公室-拿钥匙",
        effect: updateTime(1)
      },
      {
        text: "趁它被压着，先解决掉它再拿钥匙",
        nextScene: "图书馆-办公室-清场",
        condition: "hasCane || hasMopHandle || hasIronPipe || hasCutter",
        effect: updateTime(2),
        elseScene: "图书馆-办公室-受伤"
      },
      {
        text: "算了，从办公室窗户翻出去",
        nextScene: "图书馆-逃生",
        effect: updateTime(1)
      }
    ]
  },

  "图书馆-办公室-拿钥匙": {
    image: "images/placeholder.png" /* TODO: images/library/libraryOffice.png */,
    text: "你贴着墙根，小心翼翼地绕过倒下的铁皮柜。被压住的丧尸伸出手臂试图抓你的脚踝，但差了一点——你刚好够不到。\n你取下墙上的钥匙串。上面有六把钥匙，其中一把贴着褪色的标签写着\"消防通道\"。\n你回头看了一眼那只被压住的丧尸。它还在挣扎，但暂时构不成威胁。你可以就这么离开——从消防通道走出去，外面就是后巷。\n但你也可以先把它解决了，把整个图书馆清理干净。",
    choices: [
      {
        text: "用钥匙打开消防通道，离开这里",
        nextScene: "图书馆-逃生"
      },
      {
        text: "先解决它，再慢慢搜刮",
        nextScene: "图书馆-办公室-清场",
        condition: "hasCane || hasMopHandle || hasIronPipe || hasCutter",
        elseScene: "图书馆-办公室-徒劳"
      }
    ]
  },

  "图书馆-办公室-清场": {
    image: "images/placeholder.png" /* TODO: images/library/libraryOffice.png */,
    onEnter: { set: { libraryCleared: true } },
    text: "你举起手中的家伙，干脆利落地给了被压住的丧尸一下。它终于安静了。\n\
办公室里安静了下来。你环顾四周——文件柜里有一些没开封的瓶装水，办公桌抽屉里还有半包压缩饼干。虽然不多，但够你撑一阵子。\n\
更重要的是——你现在可以锁上图书馆的门，把这里变成一个安全的落脚点。窗户结实，大门能锁，只有一道消防通道需要守住。\n你花了些时间把大厅和阅览室的窗帘拉上，把前门反锁。这个小小的图书馆，在这座沦陷的城市里，成了你暂时的庇护所。",
    choices: [
      {
        text: "检查一下消防通道的门锁",
        nextScene: "图书馆-办公室-收尾",
        effect: updateTime(5)
      }
    ]
  },

  "图书馆-办公室-收尾": { // 最早的好结局
    image: "images/placeholder.png" /* TODO: images/library/libraryOffice.png */,
    text: "你检查了消防通道的门——可以从里面闩上，插销结实。阅览室的窗户也都完好，没有破损。大门你已经从里面锁好了。\n\
整个图书馆现在是一个安全的据点。虽然简陋，但有水、有吃的、有屋顶。\n你知道，你可以在这里住下来。至少暂时可以。",
    choices: [
      {
        text: "也许有别的路？",
        nextScene: "start"
      }
    ]
  },

  "图书馆-办公室-徒劳": {
    image: "images/placeholder.png" /* TODO: images/library/libraryOffice.png */,
    text: "你看了看被压住的丧尸，又看了看自己手上——没有能干净利落解决它的东西。你犹豫了一下。\n\
就是这一下犹豫——它猛地抽出了一只手，抓住了你的鞋带。\n你踉跄了一下，但站稳了脚步，一脚踢开了它的手。它暂时构不成威胁，但你也没法安心在这里待下去了。",
    choices: [
      {
        text: "打开消防通道离开",
        nextScene: "图书馆-逃生"
      }
    ]
  },

  "图书馆-办公室-受伤": {
    image: "images/placeholder.png" /* TODO: images/library/libraryOffice.png */,
    onEnter: { set: {hurtByZombie: true} },
    text: "你看了看被压住的丧尸，又看了看自己手上——没有能干净利落解决它的东西。你犹豫了一下。\n\
就是这一下犹豫——它猛地抽出了一只手，抓伤了你的脚踝。\n你踉跄了一下，但站稳了脚步，一脚踢开了它的手。脚上传来的刺痛告诉你，没法安心在这里待下去了。",
    choices: [
      {
        text: "打开消防通道离开",
        nextScene: "图书馆-逃生"
      }
    ]
  },

  // ==================== 逃生 ====================
  "图书馆-逃生": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFireExit.png */,
    text: "你打开消防通道的门，刺眼的阳光让你眯起了眼。后巷连通着东明路的支路，从这里可以绕回主街上。\n你回头看了一眼图书馆的轮廓。里面还有一些丧尸没有被清理干净，但你管不了那么多了。",
    choices: [
      {
        text: "回到东明路",
        nextScene: "东明路-三林路"
      }
    ]
  },

  // ==================== 死亡场景 ====================
  "结局-图书馆-书堆": {
    image: "images/placeholder.png" /* TODO: images/library/libraryFallingShelf.png */,
    text: "你用力推向书架，但书架比看起来重得多——它没有朝丧尸倒过去，反而晃了晃，朝你的方向倾覆过来。\n沉重的书架连带着几百本书劈头盖脸地砸了下来。你的世界陷入了一片黑暗。\n在意识消散之前，你听到的最后声音是丧尸踩着书页走过来的脚步声。\n\n—— 结局：书堆之下 ——"
  },

  "结局-图书馆-书架间": {
    image: "images/placeholder.png" /* TODO: images/library/libraryBookshelf.png */,
    text: "你在书架间犹豫了太久。\n当你终于做出决定时，已经来不及了——脚步声从身后逼近，前方也出现了另一只丧尸的影子。\n狭窄的书架通道成了你的牢笼。前后都是丧尸，你无路可逃。\n\n—— 结局：书架之间 ——"
  }
});
