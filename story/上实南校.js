// ========== 上实南校剧情 ==========
// 初中校园：1号楼→2号楼→3号楼→复合楼
// 关键道具：手电筒、美工刀、润滑油、防毒面具（计数）、酒精灯/盐酸/温度计
// 结局：hasClassMates = true

Object.assign(storyData, {

  // ==================== 校门口 ====================
  "上实南校门口": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png";
      var f = timeImage({
        morning: "images/上实南校/门口-morning.png",
        evening: "images/上实南校/门口-evening.png",
        night: "images/上实南校/门口-night.png",
        midnight: "images/上实南校/门口-midnight.png",
      });
      return f(vars);
    },
    onEnter: function(vars) {
      vars.currentPlace = "东明路";
      vars.currentPos = "上实南校";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      if (vars.hasClassMates) return "你又回到了学校门口。铁门还是半开着，但门卫室的窗户今天看起来更破了。你在救出小陆他们之后带着他们离开了这里——学校里该拿的都拿了，不值得再冒一次险。\n" + describeWeather(vars);
      return "你来到上实南校门口。铁门半开着，门卫室里空无一人——窗户碎了，桌上的茶杯还冒着热气。\n仰望曾经的教室，走廊上散落着几只在游荡的丧尸，教学楼深红色的轮廓在阴沉的天色下显得格外压抑。\n\
你记得初中四年每天从这里走进走出，如今再看，恍如隔世。\n" + describeWeather(vars);
    },
    choices: [
      {
        showCondition: "!hasClassMates",
        text: "从围墙缺口钻进去，直奔1号楼",
        nextScene: "上实南校-1号楼走廊",
        effect: updateTime(2)
      },
      {
        showCondition: "!hasClassMates",
        text: "从正门绕进去",
        nextScene: "上实南校-1号楼走廊",
        effect: updateTime(3)
      },
      {
        text: "不太对劲，退回去",
        nextScene: "东明路-三林路"
      }
    ]
  },

  // ==================== 1号楼·走廊→教务室 ====================
  "上实南校-1号楼走廊": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor.png */,
    text: "你走进1号楼。走廊两侧是教室，门有的开着有的关着，黑板上还留着粉笔字。午后的阳光从窗户斜射进来，照得空气中悬浮的粉笔灰像细小的雪粒，在光柱里缓缓浮动。\n\
走廊尽头有几只穿着校服的丧尸在游荡——它们听到你的脚步声，缓缓转过头来。走廊地板上一片狼藉——书包、水杯散落一地，墙上有几道暗红色的抓痕，看来大部分人成功跑出去了。你没有时间细看，侧身闪进最近的一间办公室，关上了门。\n\
这是一间教务室。办公桌上堆着作业本和教案，角落里有一个铁皮柜，上面挂着一把弹子锁，不知道钥匙在哪里。",
    choices: [
      {
        text: "翻办公桌抽屉",
        nextScene: "上实南校-教务室-翻桌",
        effect: updateTime(2)
      },
      {
        showCondition: "hasCutter",
        text: "用美工刀割开铁皮柜的锁",
        nextScene: "上实南校-教务室-开柜"
      },
      {
        text: "不搜了，离开",
        nextScene: "上实南校-天桥"
      }
    ]
  },

  "上实南校-教务室-翻桌": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolOffice.png */,
    text: "你翻了几张办公桌——大多是批改到一半的试卷和教案。在教务主任的抽屉里，你找到了一张手绘的校园平面图。\n\
图上标出了三栋教学楼和一个复合楼的位置，还有几条连廊和通道。你注意到3号楼的4楼画着一个“实”字——实验室。",
    choices: [
      {
        text: "收好地图，出发",
        nextScene: "上实南校-天桥"
      }
    ]
  },

  "上实南校-教务室-开柜": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolOffice.png */,
    onEnter: { set: { _hasCampusKey: true } },
    text: "你用美工刀对准锁扣处的铁皮，几下就割开了一个口子。锁头连着铁皮一起掉了下来。\n\
柜子里堆着一些杂物——旧的荣誉证书、几个奖杯，还有一个钥匙串，上面贴着“员工通道”的标签。你收起了钥匙。",
    choices: [
      {
        text: "继续前进",
        nextScene: "上实南校-天桥"
      }
    ]
  },

  // ==================== 天桥（1号楼→2号楼） ====================
  "上实南校-天桥": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolBridge.png */,
    text: "你走上连接2号楼的廊桥。地面上散落着碎玻璃，走廊两侧的艺术作品上有着大片大片的血迹，刺鼻的血腥味和沉闷的空气揉在了一起。\n\
前方通往2号楼的门是一扇生锈的铁栅栏门，门轴锈死了，推不动。",
    choices: [
      {
        showCondition: "hasLubricant",
        text: "用润滑油润滑门轴",
        nextScene: "上实南校-天桥-润滑油",
      },
      {
        showCondition: "hasIronPipe",
        text: "用铁管撬开",
        nextScene: "上实南校-天桥-硬砸"
      },
      {
        showCondition: "hasCane",
        text: "用拐杖撬开",
        nextScene: "上实南校-天桥-硬砸"
      },
      {
        showCondition: "hasMopHandle",
        text: "用拖把杆撬开",
        nextScene: "上实南校-天桥-硬砸"
      },
      {
        text: "算了，撤回去",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "上实南校-天桥-润滑油": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolBridge.png */,
    onEnter: { set: { hasLubricant: false } },
    text: "你掏出润滑油，往门轴缝隙里喷了喷。等了片刻，你用力一推——门无声地滑开了。",
    choices: [
      {
        text: "进入2号楼",
        nextScene: "上实南校-2号楼走廊",
        effect: updateTime(1)
      }
    ]
  },

  "上实南校-天桥-硬砸": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolBridge.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你举起手中的家伙狠狠砸了几下门轴。铁锈簌簌地往下掉——门终于松动了。你用力撞开门，但金属撞击声在天桥之间回荡，肯定引起了注意。",
    choices: [
      {
        text: "赶紧进去",
        nextScene: "上实南校-2号楼走廊",
        effect: updateTime(2)
      }
    ]
  },

  // ==================== 2号楼走廊·第一次遭遇体育老师 ====================
  "上实南校-2号楼走廊": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor2.png */,
    onEnter: function(vars) {
      if (vars._visit["上实南校-2号楼走廊"] === 1 && !vars._peTeacherDead) {
        return { set: { _metPETeacher: true } };
      }
      return {};
    },
    text: function(vars) {
      if (vars._peTeacherDead) return "走廊空荡荡的——上次战斗留下的焦痕还在地上。那根断裂的旗杆横在地上，被烧得焦黑。";
      if (vars._metPETeacher) return "走廊里又传来了那种熟悉的拖拽声——呲啦、呲啦。它还在。你不想再跟它正面冲突了。";
      return "你走进2号楼走廊。这里比1号楼暗一些，日光灯管大部分不亮了。走廊两侧是教室，门牌写着“初一（3）班”、“初一（4）班”……。\n\
你正准备往前走，突然听到前方拐角处传来沉重的拖拽声——呲啦、呲啦——像是有什么金属在地面上被拖着走。\n\
然后拐角处出现了一个高大的身影。它穿着一件沾满血污的黑色运动服，胸前挂着一只歪斜的口哨，手里拖着一根断裂的旗杆。\n\
它看到了你。               \n\
那张脸化成灰你都认识，他是你初二初三的体育老师————周华俊。";
    },
    choices: [
      {
        showCondition: "!_metPETeacher",
        text: "握紧武器冲上去",
        nextScene: "上实南校-第一次-战斗"
      },
      {
        showCondition: "!_metPETeacher",
        text: "躲进旁边的教室",
        nextScene: "上实南校-第一次-躲教室"
      },
      {
        showCondition: "!_metPETeacher",
        text: "转身跑向走廊尽头",
        nextScene: "结局-上实南校-第一次-跑"
      },
      {
        showCondition: "_metPETeacher && !_peTeacherDead",
        text: "翻窗绕过它",
        nextScene: "上实南校-3号楼走廊",
        effect: updateTime(3)
      },
      {
        showCondition: "_peTeacherDead",
        text: "穿过走廊",
        nextScene: "上实南校-天桥"
      },
      {
        text: "退回天桥",
        nextScene: "上实南校-天桥"
      }
    ]
  },

  "上实南校-第一次-战斗": {
    image: "images/placeholder.png" /* TODO: images/上实南校/peTeacher.png */,
    text: "你握紧手中的家伙冲了上去。\n体育老师丧尸看到你冲来，抡起旗杆就是一个横扫。你试图格挡——但它的力量大得惊人。旗杆砸在你的武器上，震得你手臂发麻，然后第二下直接砸在了你的头上。\n\
你最后的意识是它面无表情地举起旗杆，又砸了一下。"
  },

  "结局-上实南校-第一次-跑": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor2.png */,
    text: "你转身就跑。但走廊尽头的门是锁着的——你一拉，纹丝不动。\n你回头时它已经离你不到三米了。旗杆拖在地上发出刺耳的摩擦声。\n你无路可退。\n\
————结局：谁特么锁的门————"
  },

  "上实南校-第一次-躲教室": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolClassroom.png */,
    text: "你侧身闪进旁边的教室，轻轻关上门。\n体育老师沉重的脚步声在门外停住了。你屏住呼吸，贴着墙壁——它似乎失去了目标。\n\
过了十几秒，脚步声又响了起来，越来越远。你从门缝里看到它拖着旗杆走远了。\n你松了口气，走到教室后窗——窗外是花坛。",
    choices: [
      {
        text: "翻窗出去，绕向3号楼",
        nextScene: "上实南校-3号楼走廊",
        effect: updateTime(5)
      },
      {
        text: "开门离开",
        nextScene: "结局-上实南校-第一次-回马枪"
      }
    ]
  },

  "结局-上实南校-第一次-回马枪": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolClassroom.png */,
    text: "你开门离开教室，门锁发出轻微的声响。你刚往前走了几步，远处的脚步声又响了起来，越来越近。\n\
————结局：看我装唐阴你一手————"
  },

  // ==================== 3号楼·漆黑走廊→每层可选 ====================
  "上实南校-3号楼走廊": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridorDark.png */,
    text: "你从花坛翻了下去，绕到3号楼，从侧门溜了进去。\n\
3号楼里一片漆黑——电停了。走廊里只有尽头应急出口的绿色标志发出微弱的光，在地面上投下一片惨绿色的阴影。空气又冷又沉，越靠近楼梯，那种阴冷的感觉就越重。\n你摸到了楼梯口。扶手摸起来冰凉的——该上几楼？",
    choices: [
      {
        text: "上2楼看看",
        nextScene: "上实南校-3号楼-2楼"
      },
      {
        text: "上3楼看看",
        nextScene: "上实南校-3号楼-3楼"
      },
      {
        text: "上4楼看看",
        condition: "hasTorch",
        nextScene: "上实南校-3号楼-4楼",
        elseScene: "上实南校-3号楼-4楼-摸黑"
      },
      {
        text: "算了，退出3号楼",
        nextScene: "东明路-三林路"
      }
    ]
  },

  "上实南校-3号楼-2楼": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridorDark.png */,
    text: "你摸索着走上2楼。推开楼梯口的门——走廊里堆满了倒下的桌椅和散落的试卷，一片狼藉。黑暗中你隐约看到走廊尽头有什么东西在动。\n你屏住呼吸，退回楼梯口。这里没有什么可用的东西。得往上走。",
    choices: [
      {
        text: "上3楼",
        nextScene: "上实南校-3号楼-3楼"
      },
      {
        text: "上4楼",
        nextScene: "上实南校-3号楼-4楼",
        condition: "hasTorch",
        elseScene: "上实南校-3号楼-4楼-摸黑"
      }
    ]
  },

  "上实南校-3号楼-3楼": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridorDark.png */,
    text: "你推开3楼的门。走廊尽头就是美术室——门半开着，里面传来有节奏的声响：唰——唰——像是画笔在画布上涂抹的声音。\n\
你往前走了一步，想看清楚——脚底踩到了一根掉落的画笔，发出清脆的断裂声。\n声音停了。然后你听到了脚步声，正朝着门口走来。",
    choices: [
      {
        text: "退回楼梯口",
        nextScene: "上实南校-3号楼-2楼"
      },
      {
        text: "看看谁来了",
        nextScene: "结局-上实南校-美术室"
      }
    ]
  },

  "上实南校-3号楼-4楼": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolStairsDark.png */,
    text: "你打着手电筒上到4楼。楼道尽头是一扇门，门牌上写着“化学实验室”。门缝里隐约飘出一股淡淡的白色气体。",
    choices: [
      {
        text: "推开化学实验室的门",
        nextScene: "上实南校-化学实验室"
      }
    ]
  },

  "上实南校-3号楼-4楼-摸黑": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolStairsDark.png */,
    onEnter: { add: { strength: -1 } },
    text: "你摸黑爬上4楼。膝盖在台阶上磕了一下，但你忍住了。楼道尽头你摸到了一扇门——门牌上凹凸的字迹你辨认了半天：“化学实验室”。",
    choices: [
      {
        text: "推开门",
        nextScene: "上实南校-化学实验室"
      }
    ]
  },

  // ==================== 化学实验室（4楼）·三选一 ====================
  "上实南校-化学实验室": {
    image: "images/placeholder.png" /* TODO: images/上实南校/chemLab.png */,
    text: function(vars) {
      if (vars._visit["上实南校-化学实验室"] > 1) return "化学实验室里静悄悄的。之前泄漏的气体已经散尽了。实验台上——上次能拿的你都已经拿走了。";
      return "你推开化学实验室的门。一股刺鼻的气味扑面而来——角落里的一个试剂柜倒了，白色的气体正从柜门缝隙里一丝一丝地漏出来，贴着地面蔓延。\n实验台上整齐地摆着几样东西：一盏酒精灯、一瓶盐酸溶液、一支温度计。\n气体越来越浓了——你没有太多时间。";
    },
    choices: function(vars) {
      if (vars._visit["上实南校-化学实验室"] > 1) {
        return [
          { text: "离开实验室", nextScene: "上实南校-3号楼下楼" }
        ];
      }
      return [
        {
          showCondition: "hasGasMask",
          text: "戴上防毒面具，进去搜刮",
          nextScene: "上实南校-化学实验室-面具有",
          condition: "maskRemainingUses > 0",
          elseScene: "结局-上实南校-化学实验室-面具坏了被毒死"
        },
        {
          text: "憋一口气冲进去拿了就跑",
          nextScene: "上实南校-化学实验室-憋气"
        }
      ];
    }
  },

  "上实南校-化学实验室-面具坏了被毒死": {
    image: "images/placeholder.png" /* TODO: images/上实南校/chemLab.png */,
    text: function(vars) {
      if(vars._visit['民防设施-物资区-检修记录表']) return "你戴上面具，快步走进实验室。\n\
一股刺鼻的刺激感直冲鼻腔，喉咙像被什么烧了一下——好像是酒精味……不对，好恶心。\n\
当你意识到气味不太对劲时，你才想起来，检修表上写着：“抽检3只做气密性测试，1只存在轻微漏气”。\n\
不过，已经晚了。\n\
————结局：你这防毒面具保熟吗————";
      return "你戴上面具，快步走进实验室。当你意识到气味不太对劲时，已经晚了。\n\
————结局：你这防毒面具保熟吗————";
    }
  },

  "上实南校-化学实验室-面具有": {
    image: "images/placeholder.png" /* TODO: images/上实南校/chemLab.png */,
    onEnter: { add: { maskRemainingUses: -1 } },
    text: "你戴上面具，快步走进实验室，气体对你没有影响。\n你站在实验台前。你可以拿走一样东西——时间只够拿一件。",
    choices: [
      {
        text: "取走酒精灯和火柴",
        nextScene: "上实南校-拿到酒精灯",
        effect: { set: { _hasAlcoholLamp: true } }
      },
      {
        text: "取走盐酸溶液",
        nextScene: "上实南校-拿到盐酸",
        effect: { set: { _hasAcid: true } }
      },
      {
        text: "取走温度计",
        nextScene: "上实南校-拿到温度计",
        effect: { set: { _hasThermometer: true } }
      }
    ]
  },

  "上实南校-化学实验室-憋气": {
    image: "images/placeholder.png" /* TODO: images/上实南校/chemLab.png */,
    onEnter: { add: { strength: -3 }, set: { hurtByZombie: true } },
    text: "你深吸一口气，屏住呼吸冲了进去。气体刺激着你的眼睛和皮肤，但你忍着痛在实验台上摸索。\n你抓到了最近的一样东西——酒精灯。你转身冲了出来，扶着墙大口喘气。\n你的手和脸火辣辣地疼，但至少拿到了东西。",
    choices: [
      {
        text: "查看拿到的——是酒精灯和火柴",
        nextScene: "上实南校-拿到酒精灯",
        effect: { set: { _hasAlcoholLamp: true } }
      }
    ]
  },

  "上实南校-拿到酒精灯": {
    image: "images/placeholder.png" /* TODO: images/上实南校/chemLab.png */,
    text: "酒精灯里还有大半盏酒精，盖子旁边塞着一盒火柴。你把它们小心地收进口袋。\n酒精可以做燃烧弹，火柴可以点火——也许能派上用场。",
    choices: [
      {
        text: "准备下楼",
        nextScene: "上实南校-3号楼下楼"
      }
    ]
  },

  "上实南校-拿到盐酸": {
    image: "images/placeholder.png" /* TODO: images/上实南校/chemLab.png */,
    text: "你拿起那瓶盐酸。溶液澄清透明，瓶身上贴着“HCl 36%”的标签。\n这东西够浓——泼在普通丧尸身上够它受的。但对付大家伙恐怕不太够。",
    choices: [
      {
        text: "收好，准备下楼",
        nextScene: "上实南校-3号楼下楼"
      }
    ]
  },

  "上实南校-拿到温度计": {
    image: "images/placeholder.png" /* TODO: images/上实南校/chemLab.png */,
    text: "你拿起温度计。普通的玻璃体温计，没什么特别的——但如果有同伴受伤了，至少能测一下有没有发烧感染。",
    choices: [
      {
        text: "收好，准备下楼",
        nextScene: "上实南校-3号楼下楼"
      }
    ]
  },

  // ==================== 3号楼·下楼 ====================
  "上实南校-3号楼下楼": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolStairs.png */,
    text: "你从4楼开始往下走。每层楼的楼梯口都有一扇门通向走廊——你隐约能听到门后传来的声音。",
    choices: [
      {
        text: "去3楼看看美术室有没有可用的工具",
        nextScene: "结局-上实南校-美术室"
      },
      {
        text: "去2楼走廊看看有没有别的出口",
        nextScene: "结局-上实南校-2楼"
      },
      {
        text: "直接下到1楼",
        nextScene: "上实南校-1楼出口"
      },
      {
        showCondition: "_hasCampusKey",
        text: "走员工通道下楼",
        nextScene: "上实南校-员工通道",
        elseScene: "上实南校-1楼出口"
      }
    ]
  },

  "结局-上实南校-美术室": {
    image: "images/placeholder.png" /* TODO: images/上实南校/artRoom.png */,
    text: "你推开3楼美术室的门。画架上还立着未完成的素描，水彩颜料干裂在调色盘上。\n然后你看到了它——一个穿着沾满颜料围裙的身影，正背对着你，在一幅巨大的画布前专注地涂抹着什么。它的手边堆着几十支画笔，每一支的笔尖都是暗红色的。\n它听到了你的声音。它转过头来。\n你没能跑掉。\n\n—— 结局：美术室 ——"
  },

  "结局-上实南校-2楼": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor2.png */,
    text: "你推开2楼的门，走进走廊。这里比想象中安静——太安静了。\n然后你听到了一扇教室门后传来闷响——砰砰砰——像是有很多东西在撞门。\n你后退了一步。门锁崩断了。\n穿着校服的丧尸像潮水一样从教室里涌了出来。\n\n—— 结局：2楼走廊 ——"
  },

  "上实南校-1楼出口": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor1.png */,
    text: "你顺利下到了1楼。前方有一扇门通向外面——穿过一小片空地就是2号楼的一楼入口。",
    choices: [
      {
        text: "推开门出去",
        nextScene: "上实南校-2号楼1楼-二次遭遇",
        effect: updateTime(1)
      }
    ]
  },

  "上实南校-员工通道": {
    image: "images/placeholder.png" /* TODO: images/上实南校/staffPassage.png */,
    text: "你用校工钥匙打开了员工通道的门。这是一条内部的楼梯间，干净、安静——天花板上还有应急灯亮着。几步就下到了1楼的后出口。\n你从后出口出来，发现自己直接站在了2号楼1楼的后门附近。",
    choices: [
      {
        text: "进入2号楼",
        nextScene: "上实南校-2号楼1楼-二次遭遇",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 2号楼1楼·二次遭遇体育老师（酒精灯决战） ====================
  "上实南校-2号楼1楼-二次遭遇": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor1.png */,
    text: "你刚走进2号楼1楼的走廊，就听到了那个你不想再听到的声音——旗杆拖在地上的摩擦声。\n它从走廊的另一端出现了。它找到了你——或者说它一直在等你。\n体育老师丧尸拖着旗杆朝你冲了过来。",
    choices: [
      {
        text: "掏出酒精灯狠狠砸向它！",
        nextScene: "上实南校-酒精灯-投掷",
        condition: "_hasAlcoholLamp",
        elseScene: "上实南校-二次-无酒精灯"
      },
      {
        text: "掀起走廊上的桌椅挡住它",
        nextScene: "上实南校-二次-桌椅"
      },
      {
        text: "握紧武器迎战",
        nextScene: "上实南校-二次-战斗"
      },
      {
        text: "转身跑",
        nextScene: "上实南校-二次-跑"
      }
    ]
  },

  "上实南校-二次-无酒精灯": {
    image: "images/placeholder.png" /* TODO: images/上实南校/peTeacher.png */,
    text: "你没有任何东西能克制它。桌椅挡不住它多久，武器打在它身上就像打在木头上——它甚至不觉得痛。\n旗杆带着破风声砸了下来。"
  },

  "上实南校-二次-桌椅": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor1.png */,
    onEnter: { add: { strength: -1 } },
    text: "你抓起一把椅子砸向它，又掀翻了一张桌子挡在走廊中间。它被阻了一下，但很快绕过桌子继续追来——你争取到了一点时间，但不多。\n你依然需要能真正击倒它的东西。",
    choices: [
      {
        text: "掏出酒精灯砸向它！",
        nextScene: "上实南校-酒精灯-投掷",
        condition: "_hasAlcoholLamp",
        elseScene: "上实南校-二次-无酒精灯"
      },
      {
        text: "继续跑",
        nextScene: "上实南校-二次-跑"
      }
    ]
  },

  "上实南校-二次-战斗": {
    image: "images/placeholder.png" /* TODO: images/上实南校/peTeacher.png */,
    text: "你举起武器迎了上去。旗杆和你的武器撞在一起，发出刺耳的金属声——你挡住了第一下，但手臂被震得几乎失去知觉。\n第二下你没能挡住。"
  },

  "上实南校-二次-跑": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor1.png */,
    text: "你转身就跑。但你不知道这里的布局——你跑进了一条死路。你回头时它已经堵住了退路。"
  },

  // ==================== 酒精灯QTE ====================
  "上实南校-酒精灯-投掷": {
    image: "images/placeholder.png" /* TODO: images/上实南校/alcoholLampThrow.png */,
    text: "你掏出酒精灯，拧开盖子，把酒精泼向它——然后狠狠把灯砸了过去。\n酒精灯在它胸口碎裂，玻璃碴和酒精溅了一身。它愣了一下，低头看了看湿透的运动服——然后更狂暴地朝你扑了过来，浑身散发着刺鼻的酒精味。\n你掏出火柴——必须划燃它扔过去。但它离你只有几步之遥了。",
    qte: {
      timeout: 3000,
      onTimeout: "结局-上实南校-酒精灯烧死"
    },
    choices: [
      {
        text: "划燃火柴扔出去！",
        nextScene: "上实南校-击败体育老师"
      },
      {
        text: "侧身躲开它的扑击",
        nextScene: "上实南校-酒精灯-再战"
      }
    ]
  },

  "上实南校-酒精灯-再战": {
    image: "images/placeholder.png" /* TODO: images/上实南校/peTeacher.png */,
    text: "你侧身闪开——它扑了个空，撞在墙上，发出一声闷响。它转过身来，浑身酒精味，嘴里发出低沉的嘶吼。\n你还有机会。火柴还在你手里。",
    qte: {
      timeout: 2000,
      onTimeout: "结局-上实南校-酒精灯烧死"
    },
    choices: [
      {
        text: "划燃火柴扔出去！",
        nextScene: "上实南校-击败体育老师"
      },
      {
        text: "躲开——又扑空了",
        nextScene: "上实南校-酒精灯-再战",
        effect: { add: { chasedByZombies: 1 } }
      }
    ]
  },

  "结局-上实南校-酒精灯烧死": {
    image: "images/placeholder.png" /* TODO: images/上实南校/fireDeath.png */,
    text: "它扑到了你身上。你手中的火柴盒脱手飞了出去，掉在地上——其中一根滑燃了。\n火焰在酒精中蔓延。你最后看到的是它和你一起被火焰吞没。\n\n—— 结局：酒精灯 ——"
  },

  "上实南校-击败体育老师": {
    image: "images/placeholder.png" /* TODO: images/上实南校/peTeacherDefeated.png */,
    onEnter: { set: { _peTeacherDead: true } },
    text: "你划燃火柴，朝它扔了过去。\n火柴划过一道弧线，落在它湿透的胸口——火焰瞬间腾起，像一个火球一样炸开。它发出了一声不像人类的尖啸，在烈火中踉跄了几步，然后倒在了地上。\n火焰燃烧了一会儿，然后熄灭了。它不再动弹。\n你站在原地大口喘气。前面的路终于通了。",
    choices: [
      {
        text: "继续前进",
        nextScene: "上实南校-复合楼入口"
      }
    ]
  },

  // ==================== 复合楼·礼堂 ====================
  "上实南校-复合楼入口": {
    image: "images/placeholder.png" /* TODO: images/上实南校/complexBuilding.png */,
    text: function(vars) {
      if (vars.hasClassMates) return "复合楼里很安静。礼堂的门敞开着——里面空无一人，只有落下的幕布和倒下的座椅。你们上次离开时就是这个样子。";
      return "你从2号楼的后门走进复合楼。左手边是体育馆，右手边是礼堂，楼下还有食堂和图书馆。\n礼堂的门半掩着。你听到里面有人压低声音说话的声音。";
    },
    choices: [
      {
        showCondition: "!hasClassMates",
        text: "推开礼堂的门",
        nextScene: "上实南校-相认"
      },
      {
        text: "去体育馆看看",
        nextScene: "上实南校-体育馆"
      },
      {
        text: "去食堂看看",
        nextScene: "上实南校-食堂"
      },
      {
        text: "去图书馆看看",
        nextScene: "上实南校-图书馆"
      },
      {
        showCondition: "hasClassMates",
        text: "离开复合楼",
        nextScene: "上实南校-撤离成功"
      }
    ]
  },

  "上实南校-图书馆": {
    image: "images/placeholder.png" /* TODO: images/上实南校/library.png */,
    text: function(vars) {
      if (vars._visit["上实南校-图书馆"] > 1) return "图书馆里还是老样子。书架堵着门窗，几个孩子缩在阅览室的角落。王老师听到动静探出头来——看到是你，松了口气。她把手指竖在嘴边，示意你小声点——有孩子在睡觉。";
      return "你推开图书馆的门——准确地说，是推开了一道缝，另外半边门被书架从里面堵死了。你侧身挤了进去。\n\
“别动。”\n\
一个沙哑的女声从书架后面传来，紧接着后颈一凉——有什么尖锐的东西抵在了你的皮肤上。\n\
你僵住了。不是因为那块玻璃——是那个声音你认识。\n\
“……王老师？”\n\
身后沉默了。尖锐的感觉离开了你的脖子。\n\
你转过身——银框圆眼镜，乱糟糟的低马尾，灰色卫衣上沾满了灰，脸颊比记忆里瘦了一圈，眼眶发红。但她还是她。\n\
王老师站在你面前，手里攥着一块磨尖的玻璃片，嘴唇哆嗦了两下，终于挤出一句话：\n\
“你……你是初三（3）班的那个？……你还活着？”\n\
她的声音在发抖。不是害怕——是绷了太久终于松下来一点的那种抖。";
    },
    choices: [
      {
        text: "“王老师，是我。你还好吗？”",
        nextScene: "上实南校-图书馆-对话"
      },
      {
        text: "离开图书馆",
        nextScene: "上实南校-复合楼入口"
      }
    ]
  },

  "上实南校-图书馆-对话": {
    image: "images/placeholder.png" /* TODO: images/上实南校/library.png */,
    text: "王老师放下玻璃片，退了一步，上下打量了你几秒。然后她有些不好意思地笑了一下——那种“我刚才差点用玻璃戳死我一个学生”的笑。\n\
“对不起对不起，我以为……外面那些东西，我已经分不清了。”她揉了揉太阳穴，“我这儿还有十五个孩子，我赌不起。”\n\
她朝阅览室方向偏了偏头。你顺着看过去——书架后面的角落里，十几个穿着校服的孩子挤在一起，有的在发抖，有的在偷偷看你。最小的看起来只有初一，最大的也不过初三。\n\
“6月29号，毕业典礼刚开始就乱了。”她压低声音，“我带他们躲到这里，把门堵了，一直到现在。”\n\
她顿了顿，声音更低了：“吃的……撑不过两天了。”\n\
但她很快深吸一口气，直了直腰——那个在讲台上站了十几年的语文老师的惯性，让她即使在末日里也会在学生面前挺直背。\n\
“你呢？你一个人？外面现在到底怎么样了？”",
    choices: [
      {
        text: "简单说一下外面的情况——不太乐观",
        nextScene: "上实南校-图书馆-情报"
      },
      {
        text: "“我身上还有点吃的，先给你们。”",
        nextScene: "上实南校-图书馆-给食物",
        condition: "itemCount > 0"
      },
      {
        text: "离开图书馆",
        nextScene: "上实南校-复合楼入口"
      }
    ]
  },

  "上实南校-图书馆-情报": {
    image: "images/placeholder.png" /* TODO: images/上实南校/library.png */,
    onEnter: { set: { _knownSideDoorPassword: true } },
    text: "你简单说了说外面的情况——小区里已经不安全了，街上到处都是丧尸，自来水不能喝了，通讯断了，政府没有任何动静。\n\
王老师听着，脸色越来越白，但没有打断你。听完后她沉默了一会儿，然后点了点头。\n\
“我知道了。”她比你想象中平静，“我大概也猜到了——这几天我从图书馆的窗户能看到东明路，人越来越少，那种东西越来越多。”\n\
她转身从书桌上拿起一本便签纸，翻到某一页，撕下来递给你。上面写着一串数字：**0731**。\n\
“教学楼北侧有个小侧门，常年锁着，密码锁的密码就是这个——总务处每年开学才换一次，我偶然看到的。”她苦笑了一下，“侧门比正门好走。你要是以后再来学校，走那边安全些。”\n\
她看了一眼角落里的孩子们，压低声音：“我暂时不能跟你走。这些孩子……我放不下。”",
    choices: [
      {
        text: "“我理解。我找到补给会送过来。”",
        nextScene: "上实南校-图书馆-承诺"
      },
      {
        text: "先走了",
        nextScene: "上实南校-复合楼入口"
      }
    ]
  },

  "上实南校-图书馆-给食物": {
    image: "images/placeholder.png" /* TODO: images/上实南校/library.png */,
    onEnter: function(vars) {
      if (vars.itemCount > 0) vars.itemCount -= 1;
      vars._knownSideDoorPassword = true;
      vars._travelMinutes = 0;
      vars.mm += 10;
      vars.hh += Math.floor(vars.mm / 60);
      vars.mm %= 60;
      vars.dd += Math.floor(vars.hh / 24);
      vars.hh %= 24;
      return {};
    },
    text: "你从包里翻出一些吃的——不多，但你匀了一份出来。\n\
王老师接过去的时候手在微微发抖。她没有说“这怎么好意思”——因为她确实需要。她只是用力握了一下你的手，低声说了句：“谢谢。”\n\
然后她转身把食物分给了孩子们。你看到最小的那个女孩撕开包装时，眼里有光。\n\
王老师走回来，从书桌上拿起一本便签纸，撕下一张递给你。上面写着一串数字：**0731**。\n\
“教学楼北侧小侧门的密码。”她压低声音，“侧门出去就是华夏西路的支路，比正门好走。你以后来的话，走那边安全些。”\n\
她看了一眼角落里的孩子们：“我暂时不能跟你走。这些孩子……我放不下。”\n\
“学长？“耳边传来一个女同学的声音，你回头一看，认出她是之前在公交车上见过几次的朵拉头小学妹，虽然你并不知道她叫什么。\n\
”你好呀。“”竟然能在这里碰到你。“\n\
王老师回头看了看，说道：”保重。“",
    choices: [
      {
        text: "“我还会再来的。”",
        nextScene: "上实南校-图书馆-承诺"
      },
      {
        text: "保重，我先走了",
        nextScene: "上实南校-复合楼入口"
      }
    ]
  },

  "上实南校-图书馆-承诺": {
    image: "images/placeholder.png" /* TODO: images/上实南校/library.png */,
    text: function(vars) {
      if (vars._visit["上实南校-图书馆-承诺"] > 1) return "王老师看到你回来，眼里闪过一丝安心。她没有多说什么——只说了句“你自己也小心”——然后回头照看孩子们去了。";
      return "王老师看着你，沉默了几秒。然后她笑了一下。\n\“你自己也小心。”她说。";
    },
    choices: [
      {
        text: "离开图书馆",
        nextScene: "上实南校-复合楼入口"
      }
    ]
  },

  "上实南校-体育馆": {
    image: "images/placeholder.png" /* TODO: images/上实南校/gym.png */,
    text: function(vars) {
      if (vars._visit["上实南校-体育馆"] > 1) return "体育馆里还是老样子。篮球架歪斜着，那只穿着保安制服的丧尸还在场地中央漫无目的地踱步。";
      return "你推开体育馆的门。场馆里很空旷，篮球架歪斜着，地面散落着几个落满灰的篮球。\n然后你看到了它——一只穿着保安制服的丧尸，背对着你，在场地中央漫无目的地踱步。它的腰间挂着一串钥匙和一根甩棍。\n你后退了一步——脚踏在木地板上发出吱呀一声。\n保安丧尸停了下来，缓缓转过身来。它看到了你，从腰间抽出了甩棍。";
    },
    choices: [
      {
        text: "关上大门，退回走廊",
        nextScene: "上实南校-复合楼入口",
        effect: updateTime(1)
      },
      {
        text: "握紧武器迎战",
        nextScene: "上实南校-体育馆-战斗"
      }
    ]
  },

  "上实南校-体育馆-战斗": {
    image: "images/placeholder.png" /* TODO: images/上实南校/gym.png */,
    text: "你冲了上去。保安丧尸的动作出乎意料地快——它侧身闪过你的攻击，甩棍狠狠砸在你的手臂上。你听到了骨裂的声音。\n你倒在地上，保安丧尸站在你面前，举起了甩棍。落下的最后一击精准而冷酷。"
  },

  "上实南校-食堂": {
    image: "images/placeholder.png" /* TODO: images/上实南校/cafeteria.png */,
    text: function(vars) {
      if (vars._visit["上实南校-食堂"] > 1) return "食堂还是那股馊掉的剩菜味。灶台上的锅具东倒西歪，地上的油渍踩上去有些粘脚。货架上的罐头和真空食品还在——看起来没人动过。";
      return "你走进食堂。取餐台上还放着没来得及收的餐盘，剩菜已经馊了，灶台上的锅具东倒西歪，地面有一层黏糊糊的油渍，踩上去鞋底发出轻微的粘腻声响。\n后厨的门半开着。你走进去看了看——货架上堆着一些罐头和真空包装的食品，都还完好。角落地上的纸箱里放着几包压缩饼干，看起来没过期。";
    },
    choices: [
      {
        text: "吃一包压缩饼干",
        nextScene: "上实南校-食堂-中毒"
      },
      {
        text: "算了，不碰这里的东西",
        nextScene: "上实南校-复合楼入口"
      }
    ]
  },

  "上实南校-食堂-中毒": {
    image: "images/placeholder.png" /* TODO: images/上实南校/cafeteria.png */,
    text: "你撕开包装咬了一口——味道有点怪，但你没在意。几秒钟后，你的胃开始剧烈绞痛。\n你扶着灶台蹲下，冷汗直冒。视线开始模糊——包装袋上有个不起眼的小破口，里面的饼干早就受潮变质了。\n你倒在地上，周围只有没收拾的餐盘和冰冷的灶台。"
  },

  "上实南校-相认": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "你推开门。礼堂里的座椅东倒西歪，舞台上方的幕布垂落下来，遮住了大半个舞台。\n幕布后面传来一阵骚动。然后一个人头探了出来——瘦高个，戴眼镜，一脸警惕。\n他看到了你，愣了两秒，然后脱口而出：“卧槽？”\n另一个人也从幕布后探出头来，短发圆脸：“谁？是人还是……”\n然后他认出了你。\n你也认出了他们——**小陆**、**小王**。是你初中同班同学。\n“你怎么在这里？”小陆从舞台上跳下来，一把抓住你的肩膀，“外面那个穿运动服的还在不在？它追了我们两天了！”",
    choices: [
      {
        text: "“它不会追你们了。”",
        nextScene: "上实南校-相认-说明"
      }
    ]
  },

  "上实南校-相认-说明": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "你告诉他们体育老师已经被解决了。小陆长长地舒了口气，整个人松弛下来。小王招呼幕布后面的人出来——**小赵**从阴影里走了出来，一瘸一拐的。\n“打扰了。”小赵不好意思地笑了笑，“我腿不太利索——前两天被追的时候摔的。”\n小陆简单说明了情况：他们三个约好回来看班主任，结果到学校那天已经出事了。班主任不在，他们被困在了礼堂里，靠食堂仓库的储备粮撑了三天。\n“我们想过来着，但那东西一直在外面转悠，我们不敢出去。”",
    choices: [
      {
        text: "“我带了点吃的——你们还有什么？”",
        nextScene: "上实南校-储备粮"
      }
    ]
  },

  "上实南校-储备粮": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "小王拖出几个大纸箱——食堂仓库里搬出来的。方便面、矿泉水、饼干，堆了半个纸箱。\n“东西够吃几天的，但纸箱封得太紧了，我们撕不开，只能用钥匙划……但这个费劲。”\n纸箱上的胶带缠了好几层，接头处严丝合缝。",
    choices: [
      {
        text: "用美工刀划开纸箱",
        nextScene: "上实南校-储备粮-割开",
        condition: "hasCutter",
        elseScene: "上实南校-储备粮-撕不开"
      },
      {
        text: "试试能不能硬撕",
        nextScene: "上实南校-储备粮-撕不开"
      }
    ]
  },

  "上实南校-储备粮-割开": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    onEnter: updateTime(15, { add: { strength: 5 }, set: { _travelMinutes: 0 } }),
    text: "你掏出美工刀，沿着胶带划了一圈。纸箱啪地弹开了。\n方便面、饼干、矿泉水——你们四个人分着吃了一些。虽然不是什么大餐，但在这种时候能填饱肚子就是幸福。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复5点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "“你的腿怎么样了？”",
        nextScene: "上实南校-小赵的伤"
      }
    ]
  },

  "上实南校-储备粮-撕不开": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "你试着用手撕胶带——胶带缠了好几层，纹丝不动。\n小王不好意思地说：“我们试过了，实在打不开……用钥匙划了半天也没划开。”",
    choices: [
      {
        text: "“算了，先看小赵的伤吧”",
        nextScene: "上实南校-小赵的伤"
      }
    ]
  },

  "上实南校-小赵的伤": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "小赵坐在舞台边缘，裤腿卷到膝盖以上，脚踝处有一片淤青和擦伤。\n“跑的时候踩到花坛边沿崴了一下，然后摔的。这几天一直用冷敷……但不知道有没有发炎。”",
    choices: [
      {
        text: "用温度计测一下体温",
        nextScene: "上实南校-小赵的伤-测温",
        condition: "_hasThermometer",
        elseScene: "上实南校-小赵的伤-目测"
      },
      {
        text: "肉眼看应该问题不大",
        nextScene: "上实南校-小赵的伤-目测"
      }
    ]
  },

  "上实南校-小赵的伤-测温": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "你拿出温度计，甩了甩，让小赵夹在腋下。过了几分钟你取出来看了看——三十七度一，正常体温。\n“没有发烧，皮外伤。好好休息几天就好了。”\n小赵松了口气。小陆拍了拍你的肩膀：“可以啊，装备挺齐全。”",
    choices: [
      {
        text: "“我们先想办法出去吧。”",
        nextScene: "上实南校-商议撤离"
      }
    ]
  },

  "上实南校-小赵的伤-目测": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "你蹲下来看了看伤口——没有化脓，周围皮肤颜色正常。\n“应该没感染。不过有条件的话还是消一下毒比较好。”\n小赵点了点头：“嗯，我注意着。”",
    choices: [
      {
        text: "“先想办法出去吧。”",
        nextScene: "上实南校-商议撤离"
      }
    ]
  },

  // ==================== 礼堂·商议撤离 ====================
  "上实南校-商议撤离": {
    image: "images/placeholder.png" /* TODO: images/上实南校/auditorium.png */,
    text: "你走到礼堂侧面的窗户前，推开窗往下看了看。二楼不算高——窗外是一根老旧的铸铁排水管，贴着墙角一路通到地面。\n小陆凑过来看了一眼：“能爬。我打头？”\n\
小王推开礼堂正门往外瞄了一眼，赶紧缩了回来：“走廊里有东西在晃……算了算了。”\n你站在窗前估摸了一下。几条路摆在面前。",
    choices: [
      {
        showCondition: "_knownSideDoorPassword",
        text: "翻窗爬排水管下去，走北侧小侧门",
        nextScene: "上实南校-翻窗下楼"
      },
      {
        text: "翻窗爬排水管下去，找学校后门",
        nextScene: "上实南校-翻窗下楼"
      },
      {
        text: "从礼堂正门走回教学楼，从正门出去",
        nextScene: "上实南校-原路出校"
      }
    ]
  },

  "上实南校-翻窗下楼": {
    image: "images/placeholder.png" /* TODO: images/上实南校/windowClimb.png */,
    text: "你翻上窗台，双手握住排水管。铸铁管表面冰凉粗糙，手感还算扎实。你深吸一口气，开始往下爬。\n\
两层楼不算高——但爬到一半的时候，脚踩到了一截锈蚀的管道，铁皮哗啦一声脱落了一块。你的身体猛地往下一沉。",
    choices: [
      {
        condition: "strength >= 3",
        text: "紧紧抓住水管，稳住重心",
        nextScene: "上实南校-翻窗成功",
        elseScene: "上实南校-翻窗摔伤"
      },
      {
        text: "脚蹬墙壁，借力跳下去",
        nextScene: "上实南校-翻窗跳下"
      }
    ]
  },

  "上实南校-翻窗成功": {
    image: "images/placeholder.png" /* TODO: images/上实南校/windowClimb.png */,
    onEnter: { add: { strength: -1 } },
    text: "你死死抓住水管，手臂肌肉绷得生疼。脚下悬空了半秒——然后脚尖重新碰到了下一截管道。你不敢再马虎，一步一停地爬到了底。最后两米你直接松手跳了下来，膝盖弯了一下，没事。\n同学们也一个接一个爬了下来。小陆落地最稳，小王蹭了一手铁锈，小赵腿脚不便，最后一个下来时踩了个空——你伸手扶了他一把。\n你们站在了校园后院的空地上。",
    choices: [
      {
        text: "接下来怎么出去？",
        nextScene: "上实南校-校园后院"
      }
    ]
  },

  "上实南校-翻窗摔伤": {
    image: "images/placeholder.png" /* TODO: images/上实南校/windowClimb.png */,
    onEnter: { add: { strength: -2 }, set: { hurtByZombie: true } },
    text: "你手上的力气不够。管道在你手中滑脱——你从两层楼高的位置摔了下去。落地时脚踝传来一阵剧痛，你蜷缩在地上。\n\
“你没事吧？！”小陆紧跟着跳了下来，扶你起来。你试着站了站——能站，但每走一步都钻心地疼。\n同学们也陆续爬了下来。你们站在了校园后院的空地上。",
    choices: [
      {
        text: "一瘸一拐地找出口",
        nextScene: "上实南校-校园后院"
      }
    ]
  },

  "上实南校-翻窗跳下": {
    image: "images/placeholder.png" /* TODO: images/上实南校/windowClimb.png */,
    onEnter: { add: { strength: -2 } },
    text: "你脚蹬墙壁，借力向外跳了出去。落地时你顺势滚了一圈——后背撞在硬地上，肺里的空气被挤了出去，但你马上爬了起来。\n“你疯了？！”小陆在窗台上骂了一声，然后跟着爬了下来。\n同学们陆续落地。除了你背上疼得厉害，其他人都还好。\n你们站在了校园后院的空地上。",
    choices: [
      {
        text: "找出口",
        nextScene: "上实南校-校园后院"
      }
    ]
  },

  // ==================== 校园后院 ====================
  "上实南校-校园后院": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backyard.png */,
    text: "你们站在校园后墙内侧的空地上。杂草丛生，地面上散落着几个被踩扁的易拉罐。\n\
北侧不远处有一扇小铁门——刷着灰漆，不太显眼，但门锁看起来是那种老式密码锁。\n东侧靠近围墙根的地方，有一扇双开的大铁门——学校后门，从里面用一把大锁锁着，锁链有拇指粗。\n远处传来低沉的嘶吼声——不确定是从围墙外传来的，还是从前院方向飘过来的。",
    choices: [
      {
        showCondition: "_knownSideDoorPassword",
        text: "去北侧小铁门——试试密码0731",
        nextScene: "上实南校-侧门撤离"
      },
      {
        text: "去学校后门——想办法弄开那把锁",
        nextScene: "上实南校-后门突围"
      },
      {
        text: "算了，绕回前院从正门走",
        nextScene: "上实南校-原路出校"
      }
    ]
  },

  // ==================== 西侧小侧门 ====================
  "上实南校-侧门撤离": {
    image: "images/placeholder.png" /* TODO: images/上实南校/sideDoor.png */,
    text: "你走到北侧的小铁门前。门上的密码锁落了一层灰，按键上的数字还依稀可辨。你输入0731。\n咔哒一声——锁开了。\n\
你拉开铁门，外面是一条安静的支路——华夏西路的辅路，路边种着一排梧桐树。街上没有丧尸。\n“这边走！”你回头招呼同学们。\n\
四个人鱼贯钻出侧门。你反手把门带上——锁舌咔哒一声又锁上了。\n你们站在了学校围墙外的一条安静小路上。",
    choices: [
      {
        text: "带领同学们离开",
        nextScene: "上实南校-撤离成功"
      }
    ]
  },

  // ==================== 学校后门 ====================
  "上实南校-后门突围": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    text: "你走到后门前。锁链很粗——普通的暴力手段很难弄开。\n后门外面是一条窄巷，通向街外。巷子里有一只丧尸在徘徊——穿着白衬衫和西裤，胸前挂着一张褪色的工作牌。从装束看，是学校里的值日教师。\n它还没有发现你们，但一直在这附近转悠。",
    choices: [
      {
        text: "用盐酸溶断锁链（秒杀级）",
        nextScene: "上实南校-后门-盐酸开锁",
        condition: "_hasAcid",
        elseScene: "上实南校-后门-无酸"
      },
      {
        text: "翻墙过去，把值日教师引开再回来开门",
        nextScene: "上实南校-后门-潜行"
      },
      {
        condition: "hasIronPipe || hasCane || hasMopHandle",
        text: "用家伙砸断锁链",
        nextScene: "上实南校-后门-砸锁",
        elseScene: "上实南校-后门-无工具"
      },
      {
        text: "算了，换条路",
        nextScene: "上实南校-校园后院"
      }
    ]
  },

  "上实南校-后门-盐酸开锁": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    onEnter: { set: { _hasAcid: false } },
    text: "你拧开瓶盖，把盐酸倒在锁链的薄弱处。铁链冒着白泡，发出滋滋的声响。几分钟后，锁环被腐蚀断了。\n你轻轻拉开门——铁链哗啦一声落在地上。\n值日教师被声音惊动，猛地转过头来。但它还没冲到门口，你们已经钻出门外，顺着窄巷跑了出去。它在后面追了几步，然后停住了。\n你们终于离开了学校。",
    choices: [
      {
        text: "回到东明路",
        nextScene: "上实南校-撤离成功"
      }
    ]
  },

  "上实南校-后门-无酸": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    text: "你没有任何东西能快速弄开这条锁链。值日教师就在外面徘徊——砸锁的声音一定会把它引过来。你决定还是换条路走。",
    choices: [
      {
        text: "退回校园后院",
        nextScene: "上实南校-校园后院"
      }
    ]
  },

  "上实南校-后门-砸锁": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(vars) {
      let wpn = "手中的家伙";
      if (vars.hasIronPipe) wpn = "铁管";
      else if (vars.hasCane) wpn = "拐杖";
      else if (vars.hasMopHandle) wpn = "拖把杆";
      return "你举起" + wpn + "，对准锁链的连接处狠狠砸了下去。金属碰撞声在校园里回荡——第一下没砸开。你又砸了一下。锁链上的铁环变形了，但还是没断。\n值日教师被声音吸引，朝后门这边走来。\n第三下——锁链终于崩断了。铁环弹飞出去，砸在地上叮当作响。\n你拉开门，四个人冲了出去。值日教师已经走到巷子中间，离你们只有几米远——但你们已经出了校门，顺着窄巷跑了出去。它在后面追了几步，然后停住了。\n你们终于离开了学校。";
    },
    choices: [
      {
        text: "回到东明路",
        nextScene: "上实南校-撤离成功",
        effect: { add: { strength: -1 } }
      }
    ]
  },

  "上实南校-后门-无工具": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    text: "你看了看锁链——拇指粗的铁环，没有像样的工具根本弄不开。强行砸锁只会把手弄伤，还吸引丧尸。你摇了摇头，还是换条路吧。",
    choices: [
      {
        text: "退回校园后院",
        nextScene: "上实南校-校园后院"
      }
    ]
  },

  "上实南校-后门-潜行": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    text: "你把锁链轻轻搁在地上——尽量不发出声音——然后翻过铁门，落地时压低身形。\n值日教师背对着你。你贴着墙壁，一步一步往外挪。\n你已经走到窄巷的一半——还有几步就是街口。\n然后你踩到了一根树枝。\n咔嚓一声。值日教师猛地转过身来。",
    qte: {
      timeout: 3000,
      onTimeout: "上实南校-后门-潜行失败"
    },
    choices: [
      {
        text: "快跑！它追上来了！",
        nextScene: "上实南校-后门-潜行成功"
      },
      {
        text: "躲到旁边的垃圾箱后面",
        nextScene: "上实南校-后门-潜行失败"
      }
    ]
  },

  "上实南校-后门-潜行成功": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    text: "你撒腿就跑。值日教师追了几步——但同学们也翻过门跟了上来。大家一起跑，脚步声杂乱，它似乎迟疑了一下，然后被你们甩开了。\n你们跑出了窄巷，跑到了街上。回头看时，那只丧尸站在巷口，没有追出来。\n你们终于离开了学校。",
    choices: [
      {
        text: "回到东明路",
        nextScene: "上实南校-撤离成功"
      }
    ]
  },

  "上实南校-后门-潜行失败": {
    image: "images/placeholder.png" /* TODO: images/上实南校/backGate.png */,
    text: "你躲到垃圾箱后面——但位置太窄了，你挤不进去。值日教师冲了过来，在你反应过来之前抓住了你的手臂。\n你挣开了它，但手臂上多了一道深深的血痕。同学们翻过门来帮你，小陆用拖把杆砸了它的头——你们趁这个机会一起跑了出去。\n有人受了伤，但大家都出来了。",
    choices: [
      {
        text: "回到东明路",
        nextScene: "上实南校-撤离成功",
        effect: { set: { hurtByZombie: true } }
      }
    ]
  },

  // ==================== 原路·从正门出 ====================
  "上实南校-原路出校": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolCorridor1.png */,
    text: "你们从礼堂正门走了出去。走廊里空荡荡的——体育老师留下的焦痕还在地上。\n你们沿着来时的路穿过2号楼、绕过天桥、经过1号楼。教室里偶尔传来低沉的嘶吼声，但门都关着。\n校门口就在前方——铁门半开着，外面就是东明路。路面上有几只丧尸在游荡。",
    choices: [
      {
        text: "趁它们还没注意到，悄悄通过",
        nextScene: "上实南校-原路-潜行"
      },
      {
        text: "冲出去——四个人一起跑",
        nextScene: "上实南校-原路-硬冲"
      }
    ]
  },

  "上实南校-原路-潜行": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolGate.png */,
    text: "你们压低身形，贴着校门边缘一个一个钻了出去。路上的丧尸没有注意到你们——它们正围着一辆翻倒的汽车打转。\n你们成功地穿过了东明路，拐进了路对面的一条小巷。回头看时，学校的大门在阴沉的天色下空荡荡地敞着。\n你们终于离开了学校。",
    choices: [
      {
        text: "回到东明路",
        nextScene: "上实南校-撤离成功"
      }
    ]
  },

  "上实南校-原路-硬冲": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolGate.png */,
    text: "“跑！”你一声令下，四个人一起冲了出去。\n路面的丧尸被脚步声惊动，纷纷转过头来。你们跑得很快——快到它们还没来得及围上来，你们已经穿过了马路。\n一只穿着保安服的丧尸从侧面的巷子里冲了出来，差点抓住跑在最后的小赵。你一棍子砸在它手上，它松开了。\n你们拐进对面的小巷，终于甩开了它们。\n你们终于离开了学校。",
    choices: [
      {
        text: "回到东明路",
        nextScene: "上实南校-撤离成功",
        effect: { add: { strength: -1 } }
      }
    ]
  },

  "上实南校-撤离成功": {
    image: "images/placeholder.png" /* TODO: images/上实南校/schoolGate.png */,
    onEnter: function(vars) {
      vars.personalMemorySet.add("返校");
      vars.hasClassMates = true;
      return {};
    },
    text: "你们站在学校外的路边。小陆、小王、小赵——三个人都灰头土脸的，但都活着。\n\
“谢了，”小陆拍了拍你的肩膀，“要不是你来了，我们真不知道还能撑几天。”\n你咧嘴笑了笑：”你们没事就好。“\n小赵对你点了点头，眼神里满是感激。\n\
”今天找到张老师了吗？“”班主任没有，但有语文张老师，哈哈。“”或许我们可以去找找以前的语文王老师呢。“\n\
你多了三个同伴。在这个崩坏的世界里，多一个人就是多一份力量。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得记忆[返校]",
    choices: [
      {
        text: "一起回东明路",
        nextScene: "东明路-三林路"
      }
    ]
  }
});
