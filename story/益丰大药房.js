Object.assign(storyData,{

  // ==================== 益丰大药房 ====================
  "益丰大药房": {
    image: "images/小区周边/益丰大药房/益丰大药房内部.png",
    onEnter: { set: { currentPlace: "三林路", currentPos: "益丰大药房" } },
    text: function(vars) {
      if (vars.pharmacyZombieKilled) {
        return "你再次走进药房。柜台后面，白大褂丧尸的尸体还静静躺在原地，地上的血迹已经干涸发黑。空气中残留着淡淡的腐臭和消毒水混合的气味。\n货架上的药品依旧东倒西歪，能搜刮的上次基本都拿过了。";
      }
      return "你走进药房，一股混合着消毒水和霉味的空气扑面而来。货架上的药品东倒西歪，但还有些零散的盒子散落在地上。\n柜台后面传来窸窸窣窣的声音——好像有什么东西蹲在那里。";
    },
    choices: [
      {
        showCondition: "!pharmacyZombieKilled",
        text: "悄悄绕到柜台后面查看",
        nextScene: "益丰大药房-柜台后",
        effect: updateTime(1)
      },
      {
        showCondition: "pharmacyZombieKilled",
        text: "绕到柜台后面，看看尸体上还有没有遗漏的东西",
        nextScene: "益丰大药房-柜台后-已清理",
        effect: updateTime(1)
      },
      {
        text: "在左边的货架间快速翻找",
        nextScene: "益丰大药房-翻找",
        effect: updateTime(1)
      },
      {
        text: "去右边的库房看看",
        condition: function(v) { return !v._visit["益丰大药房-办公室门口"] && !v._visit["益丰大药房-解释血迹"]; },
        nextScene: "益丰大药房-库房",
        effect: updateTime(1),
        elseScene: "益丰大药房-库房门锁了"
      },
      {
        text: "没什么好拿的，离开",
        nextScene: "三林路",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-库房门锁了": {
    image: "images/小区周边/益丰大药房/库房门锁了.png",
    text: "你到了库房门口。库房的门关着，里面透出昏黄的光。",
    choices: [
      {
        text: "到其他地方看看",
        nextScene: "益丰大药房-柜台后-已清理",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-柜台后": {
    image: "images/小区周边/益丰大药房/发现白大褂.png",
    text: "你绕到柜台侧面。一只穿着白大褂的丧尸突然窜了出来，你急忙闪开。它好像没看到你一样，蹲在地上，疯狂地撕咬一盒不知道什么的药。",
    choices: [
      {
        showCondition: "hasCane || hasMopHandle || hasIronPipe || hasCutter",
        text: "给它来一下",
        nextScene: "益丰大药房-击杀",
        condition: "strength >= 2",
        elseScene: "益丰大药房-被反杀"
      },
      {
        text: "趁它没发现，慢慢退出去",
        nextScene: "三林路",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-被反杀": {
    image: "images/zombieKnockYouDown.png",
    text: "你举起手中的家伙砸了下去，但手臂太软了——这一击只蹭到了它的后背。\n白大褂丧尸猛地转过身，张开嘴朝你的手臂咬了下来。\n剧烈的疼痛让你眼前发黑……"
  },

  "益丰大药房-击杀": {
    image: "images/小区周边/益丰大药房/击杀白大褂.png",
    onEnter: { add: { strength: 1 }, set: { hurtByZombie: false, pharmacyZombieKilled: true } },
    text: "你一记干脆利落的攻击，白大褂丧尸扑倒在地，不动了。\n你蹲下来翻看它刚才啃咬的药箱——里面居然还有几盒没拆封的碘伏棉签和弹性绷带。柜台下面的抽屉里还有一瓶维生素片。\n\
你撕开碘伏棉签，清理了身上的伤口——至少那些抓痕不会感染了。又把维生素片丢进嘴里嚼了嚼，苦涩中带着一丝甜味。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "收拾一下离开",
        nextScene: "三林路",
        effect: updateTime(1)
      },
      {
        text: "看看他的工牌",
        nextScene: "利昂药剂师的工牌"
      }
    ]
  },

  "益丰大药房-柜台后-已清理": {
    image: "images/小区周边/益丰大药房/击杀白大褂.png",
    text: "你绕过柜台，白大褂丧尸的尸体还静静趴在地上。上次从它身边搜刮的药箱已经空了，地上的血迹早已干涸发黑。\n你在柜台周围又翻了翻，确认没什么遗漏的东西。",
    choices: [
      {
        text: "离开",
        nextScene: "三林路",
        effect: updateTime(1)
      }
    ]
  },

  "利昂药剂师的工牌": {
    image: "images/小区周边/益丰大药房/利昂的工牌.png",
    text: "你从白大衣的领口里取下了一张工牌。",
    choices: [
      {
        text: "离开",
        nextScene: "三林路",
        effect: updateTime(5)
      }
    ]
  },

  "益丰大药房-翻找": {
    image: "images/小区周边/益丰大药房/找到维C.png",
    onEnter: { add: { strength: 1 } },
    text: "你快速扫视货架上的标签。各种不同的药品名看得你眼花缭乱，拿起，放下，拿起，放下，你手快酸死了。\n\
正准备放弃时，你在角落的货架底层发现了几瓶被遗忘的维生素片——日期还没过。\n\
你拧开瓶盖吞了两片，苦涩的味道在舌尖化开，身体感觉暖和了一些。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "离开",
        nextScene: "三林路",
        effect: updateTime(5)
      }
    ]
  },

  "益丰大药房-库房": {
    image: "images/小区周边/益丰大药房/益丰大药房库房.png",
    text: "你推开一扇毛玻璃门，走进平时顾客的禁地————药房库房。这里和待客区完全不同，灯光昏暗，货架上摆满了纸箱。\n\
你不知道这里是怎么分类的，如果要找到好东西，或许要几个小时。头顶的白炽灯微微摇晃着，仿佛等待着你的决定。",
    choices: [
      {
        text: "离开药房",
        nextScene: "三林路",
        effect: updateTime(5)
      },
      {
        showCondition: "_visit['益丰大药房-左边货架翻找'] > 0",
        text: "在左边的货架上翻找",
        nextScene: "益丰大药房-左边货架翻找",
        effect: updateTime(1)
      },
      {
        showCondition: "_visit['益丰大药房-右边货架翻找'] > 0",
        text: "在右边的货架上翻找",
        nextScene: "益丰大药房-右边货架翻找",
        effect: updateTime(1)
      },
      {
        text: "货架太高了，先去找个梯子吧",
        nextScene: "益丰大药房-库房里的丧尸",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-左边货架翻找": {
    image: "images/小区周边/益丰大药房/找到医用石蜡油.png",
    onEnter: { set: { positionAfterOperation: "益丰大药房-库房" } },
    text: function(vars) {
      let basicDes = "你快速扫视货架上的标签。各种不同的药品名看得你眼花缭乱。\n\
正准备放弃时，你在角落里发现了一瓶医用石蜡油。标签如下：\n\
医用石蜡油\n\
通用名：液状石蜡\n\
规格：500ml / 100ml\n\
【医用润滑·无菌防护】\n\
侧面标签（详细说明）\n\
【主要成分】\n\
轻质液状石蜡，无菌纯化处理，无杂质、无刺激。\n\
【医用适用范围】\n\
临床器械润滑：导尿管、胃镜、肛检器械、医用导管润滑；\n\
创面隔离：皮肤干裂、轻度创面涂抹，隔绝污物；\n\
肠道润滑通便（遵医嘱少量口服）。\n\
【使用注意事项】\n\
外用可直接涂抹；口服仅限医用通便，不可大量饮用；\n\
远离明火，本品可燃，储存避光阴凉处；\n\
避免入眼，若不慎接触，大量生理盐水冲洗；\n\
仅供外用 / 医用口服，不可作为食用油。\n\
【储存条件】\n\
密封，置于阴凉干燥处，避免阳光直射，远离火源、氧化剂（酒精、高锰酸钾分开存放）。\n\
【有效期】\n\
未开封 24 个月；开封后 6 个月内用完。\n\
还有些底部小字标签，看起来像手写的：\n\
【生产信息】\n\
生产批号：11423214\n\
生产日期：2023-01-01\n\
失效日期：2025-01-01\n\
医疗器械一类备案产品\n\
【使用注意事项】\n\
仅供应急医用、防护润滑使用\n\
————学徒李明浩";
      if(vars.hasLubricant) {
        basicDes += "\n这或许和你的润滑油差不多。";
      }
      return basicDes;
    },
    choices: [
      {
        text: "拿上石蜡油",
        nextScene: "益丰大药房-库房",
        condition: "itemCount < bagVolume",
        effect: updateTime(5, {add: { itemCount: 1}, set: { hasLiquidParaffin: true }}),
        elseScene: "整理整理"
      },
      {
        text: "不拿",
        nextScene: "益丰大药房-库房",
        effect: updateTime(2)
      }
    ]
  },

  "益丰大药房-右边货架翻找": {
    image: "images/小区周边/益丰大药房/库房的手机.png",
    onEnter: { set: { positionAfterOperation: "益丰大药房-库房" } },
    text: "你埋头寻找，在地板上发现了一部手机。\n\
它看起来是死机状态，一直卡在锁屏界面，显示的时间是23：47。\n\
最后一条消息是<em>赵店长</em>发的。\n\
18：29，<em>我把库房门锁上了，外面现在很乱，你最好不要出去，有事情来办公室找我。\n\
如果你很想家，到消防通道那边按下红色的门把手，从后面出去。\n\
金禾新苑从西南门进去，南门那里通往高架，肯定已经被丧尸堵死了</em>",
    choices: [
      {
        text: "起身离开",
        nextScene: "益丰大药房-办公室门口",
        effect: updateTime(1)
      }
    ]
  },

  "库房里的丧尸": {
    image: "images/小区周边/益丰大药房/库房里的丧尸.png",
    text: "你发现了一只丧尸，正在向你移动。\n\
它穿着一件皱巴巴的白大褂——是药房的员工。但它的身体看起来不太对劲：裸露的皮肤覆盖着一层暗沉的黑色，像被什么东西从头到脚染过一遍。\n\
视线下移，你看到它手上攥着一个针筒。\n\
在摇曳的灯光下，你隐约感觉前面的货架深处还藏着什么东西。\n\
不等你思考，它已经向你扑了过来。",
    onEnter: initMemoryGame(["红","蓝","绿"], 7),
    choices: [
      {
        text: "输入你看到的颜色",
        input: {
          match: function(vars, input) {
            return normalizeColorAnswer(input) === normalizeColorAnswer(vars._currentAnswer);
          },
          placeholder: "例如：3红2蓝 或 2蓝3红",
          wrongScene: "结局-颜色错误，被丧尸咬死"
        },
        effect: updateTime(5, { add: { strength: -1 } }),
        nextScene: "益丰大药房-击倒针筒丧尸",
        timeout: 25000,
        timeoutScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "益丰大药房-击倒针筒丧尸": {
    image: "images/小区周边/益丰大药房/击倒针筒丧尸.png",
    onEnter: { add: { strength: -1 } },
    text: "这只黑皮的药房学徒举起针筒向你挥来，你抬手格挡；他又张开嘴向你肘部咬下，你抽出手向右闪开，脖子后缩，躲过他又一爪。\n\
它发出低沉的怒吼向你再次扑来，你看准时机，抓住针筒，反手一拧将其夺下，再一脚将其踹到货架上，\n\
轰的一声，数不清的药箱砸在它身上。有这个铁质货架压着，一时半会儿应该是起不来了。\n\
你低头看了一眼夺下的针筒——筒壁上还残留着水渍。旁边就是垃圾桶，里面有一个被掰断的针头。",
    choices: [
      {
        text: "检查夺下的针筒",
        nextScene: "益丰大药房-检查针筒",
        effect: updateTime(1)
      },
      {
        text: "继续往深处探索",
        nextScene: "益丰大药房-办公室门口",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-检查针筒": {
    image: "images/小区周边/益丰大药房/击倒针筒丧尸.png",
    onEnter: { set: { positionAfterOperation: "益丰大药房-检查针筒" } },
    text: "你捡起那支针筒。是药店常见的一次性医用注射器——5ml，针头被折断了，断口处扭得不太规整，像是用手硬掰的。\n\
筒壁内侧挂着一层薄薄的水渍，已经干了大半。你凑近闻了闻——只是水，没有药味。\n\
你扫了一眼旁边的垃圾桶：几片碎玻璃，一个掰断的针头，还有一张被揉皱的药品标签——上面用圆珠笔写着几个字，字迹有点潦草，像是在发抖。\n\
\n\
<em>好渴……好渴……</em>\n\
\n\
你是该继续往前走了。",
    choices: [
      {
        text: "继续往深处探索",
        nextScene: "益丰大药房-办公室门口",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-办公室门口": {
    image: "images/小区周边/益丰大药房/办公室门口.png",
    text: "你到了办公室门口。办公室的门关着，里面透出冷白的光。门上贴着一张被汗浸皱的便签。\n\
<span style = 'font-style: italic;'><em>里面有人。我是店长赵广成。别撞门，推一下就开了。求你不是那种东西就行。</em></span></>\n",
    qte: {
      time: 5000,
      onTimeout: "益丰大药房-办公室门口-门锁上了"
    },
    choices: [
      {
        text: "直接开门",
        nextScene: "益丰大药房-推门进入办公室",
        effect: updateTime(1)
      },
      {
        text: "呼叫里面的人（如果有人的话）",
        nextScene: "益丰大药房-呼叫开门",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-办公室门口-门锁上了": {
    image: "images/小区周边/益丰大药房/办公室门口.png",
    text: "你还在犹豫时，门把手传来咔哒一声，好像锁上了。你听到货架深处好像传来了脚步声。",
    choices: [
      {
        text: "撞门",
        nextScene: "益丰大药房-背后偷袭的丧尸",
        effect: updateTime(1, { add: { strength: -1 } })
      },
      {
        text: "呼叫里面的人（如果有人的话）",
        nextScene: "益丰大药房-呼叫开门",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 长发女学徒（背后偷袭的丧尸）剧情线 =====
  // 入口：门锁上了 → 撞门 → 这里
  "益丰大药房-背后偷袭的丧尸": {
    image: "images/小区周边/益丰大药房/背后偷袭的丧尸.png",
    text: function(vars) {
      var t = "你用力撞了几下门，门锁纹丝不动。身后的脚步声突然加快，你回头一看，一个长发遮面的人向你一步一顿地走了过来。\n她？的动作看起来摇摇晃晃，像喝醉酒了一样。她抬起头来，脸色蜡黄，嘴巴微张，发出咯咯咯的声音。没等你反应过来，她又别过头去。";
      if (vars.hurtByZombie) {
        t += "\n\n你手臂上的伤口还在隐隐作痛。";
      }
      if (vars.pharmacyApprenticeWatered) {
        t += "\n她靠在墙边，呼吸比刚才平稳了一些。看到你回来，她抬手指了指走廊深处。";
      }
      return t;
    },
    choices: function(vars) {
      var opts = [];

      // 沟通选项（未给水、未杀时可选）
      if (!vars.pharmacyApprenticeWatered && !vars.pharmacyApprenticeKilled) {
        opts.push({
          text: "尝试跟她沟通",
          nextScene: "益丰大药房-沟通被咬",
          effect: updateTime(1)
        });
      }

      // 给水选项（有水瓶、未给水、未杀）
      if (vars.hasBottle && !vars.pharmacyApprenticeWatered && !vars.pharmacyApprenticeKilled) {
        opts.push({
          text: "拧开瓶盖，把水瓶放在地上推过去",
          nextScene: "益丰大药房-喂水",
          effect: updateTime(1)
        });
      }

      // 解脱选项（有武器、未杀）
      if ((vars.hasCane || vars.hasMopHandle || vars.hasIronPipe || vars.hasCutter) && !vars.pharmacyApprenticeKilled) {
        opts.push({
          text: "给她一下子",
          nextScene: "益丰大药房-解脱学徒",
          effect: updateTime(1)
        });
      }

      // 已给水 → 沿着她指的方向走
      if (vars.pharmacyApprenticeWatered) {
        opts.push({
          text: "沿着她指的方向往前走",
          nextScene: "益丰大药房-消防通道",
          effect: updateTime(1)
        });
      }

      // 离开选项
      if (vars.pharmacyApprenticeKilled) {
        opts.push({
          text: "穿过走廊往回走",
          nextScene: "益丰大药房-解脱后走廊",
          effect: updateTime(1)
        });
      } else {
        opts.push({
          text: "先不管她，往回走",
          nextScene: "益丰大药房-办公室门口",
          effect: updateTime(1)
        });
      }

      return opts;
    }
  },

  // ===== 沟通支线 =====
  "益丰大药房-沟通被咬": {
    image: "images/小区周边/益丰大药房/背后偷袭的丧尸.png",
    onEnter: function(vars) {
      let len = vars._visit["益丰大药房-沟通被咬"] * 2 + 5; // 每次沟通增加2个颜色，初始5个，这样会越来越难
      let eff = initMemoryGame(["红","蓝","绿"], len)(vars); // 初始化记忆游戏
      return eff;
    },
    text: "她听到你的声音，身体猛地一颤——然后朝你扑了过来。你必须在一瞬间判断她的动作轨迹，侧身避开！",
    choices: [
      {
        text: "输入你看到的颜色分布（例如：2红1蓝1绿）",
        input: {
          match: function(vars, input) {
            return normalizeColorAnswer(input) === normalizeColorAnswer(vars._currentAnswer);
          },
          placeholder: "例如：2红1蓝1绿",
          wrongScene: "益丰大药房-被咬到了"
        },
        nextScene: "益丰大药房-沟通躲开",
        effect: updateTime(2),
        timeout: 15000,
        timeoutScene: "颜色记错了"
      }
    ]
  },

  "益丰大药房-沟通躲开": {
    image: "images/小区周边/益丰大药房/背后偷袭的丧尸.png",
    text: "你侧身一闪，她踉跄着撞在货架上，暂时动弹不得。趁着这个间隙你后退了几步，重新拉开了距离。",
    choices: [
      {
        text: "继续",
        nextScene: "益丰大药房-背后偷袭的丧尸",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-被咬到了": {
    image: "images/zombieKnockYouDown.png",
    onEnter: { add: { strength: -1 }, set: { hurtByZombie: true } },
    text: "你慢了半拍，她的牙齿咬进了你的小臂。你痛呼一声甩开她，鲜血顺着手臂往下淌。她嘴角沾着血，又退回了阴影里。\n\
<span style='color: #ff4444; font-style: italic;'>【系统提示】你被咬伤了！体力 -1，当前体力：{strength}。</span>",
    choices: [
      {
        text: "继续",
        nextScene: "益丰大药房-背后偷袭的丧尸",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 给水支线 =====
  "益丰大药房-喂水": {
    image: "images/小区周边/益丰大药房/背后偷袭的丧尸.png",
    onEnter: { set: { pharmacyApprenticeWatered: true } },
    text: "你拧开瓶盖，把水瓶放在地上推了过去。\n她盯着水瓶看了好几秒，才颤抖着蹲下来捡起它。水洒了一半，但她喝到了。\n几口下去，她的呼吸明显平稳了一些。她抬起头，用非常慢的动作——像在克服什么巨大的阻力——抬手指向走廊深处。那里有一扇不太起眼的门。",
    choices: [
      {
        text: "继续",
        nextScene: "益丰大药房-背后偷袭的丧尸",
        effect: updateTime(1)
      }
    ]
  },

  // ===== 解脱支线 =====
  "益丰大药房-解脱学徒": {
    image: "images/小区周边/益丰大药房/背后偷袭的丧尸.png",
    onEnter: { set: { pharmacyApprenticeKilled: true } },
    text: "你握紧武器走上前。\n她没有后退，也没有攻击——只是抬起头，用一种几乎称得上平静的眼神看着你。\n你动手了。\n她倒下去的时候很轻，像一袋衣服从挂钩上滑落。走廊安静了下来。",
    choices: [
      {
        text: "蹲下来翻翻她的口袋",
        nextScene: "益丰大药房-学徒的遗物",
        effect: updateTime(3)
      },
      {
        text: "转身离开",
        nextScene: "益丰大药房-解脱后走廊",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-学徒的遗物": {
    image: "images/小区周边/益丰大药房/背后偷袭的丧尸.png",
    text: "你从她的白大褂口袋里翻出了一张胸牌。\n\
照片上的女孩扎着马尾，笑得很拘谨。姓名栏写着——<em>林小满</em>。\n\
实习药剂师。益丰大药房。工号 021。\n\
照片一角用圆珠笔写了两个字：想你。字迹很轻，像是写给自己看的。\n\
你把胸牌收好，抬头看了一眼天花板。白炽灯还在晃。",
    choices: [
      {
        text: "离开",
        nextScene: "益丰大药房-解脱后走廊",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-解脱后走廊": {
    image: "images/小区周边/益丰大药房/益丰大药房库房.png",
    text: "你穿过走廊往回走。经过办公室门口时，门内传来赵广成压低的声音——\n\
\"外……外面刚才是什么声音？你是……你没事吧？\"\n\
他显然听到了打斗声，语气里带着警惕和不安。",
    choices: [
      {
        text: "敲门，跟他说几句话",
        nextScene: "益丰大药房-解释血迹",
        effect: updateTime(1)
      },
      {
        text: "算了，直接离开药房",
        nextScene: "三林路",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-解释血迹": {
    image: "images/小区周边/益丰大药房/办公室门口.png",
    text: function(vars) {
      if (vars.hurtByZombie) {
        return "你敲门。赵广成把门拉开一条缝——目光落在你手臂上那道还在渗血的牙印时，他的表情从紧张变成了恐惧。\n\
\"你被咬了！\"他的声音变了调，\"你他妈被咬了还往我这里跑？！滚——滚远点！！\"\n\
他猛地把门摔上，门锁咔哒一声重新锁死。\n\
你站在门外，走廊里只剩下你自己。";
      }
      return "你敲门。赵广成把门拉开一条缝，目光落在你手上的血迹上。他抓住你的手腕凑到灯光下，翻来覆去检查了好几遍——确认没有伤口才松开，长长地呼出一口气。\n\
\"吓死我了……不是你的血就好。进来吧，进来再说。\"\n\
他把门完全打开，侧身让你进去。";
    },
    choices: function(vars) {
      if (vars.hurtByZombie) {
        return [
          {
            text: "离开",
            nextScene: "三林路",
            effect: updateTime(1)
          }
        ];
      }
      return [
        {
          text: "坐下",
          nextScene: "益丰大药房-办公室闲聊",
          effect: updateTime(1)
        }
      ];
    }
  },

  "益丰大药房-呼叫开门": {
    image: "images/小区周边/益丰大药房/呼叫开门.png",
    text: "<span style = 'font-style: italic;'><em>喂！里面有人吗？我没被咬，我是正常人！</em></span>\n\
熟悉的咔哒声再次传来，门开了。一个矮胖的中年人把你拉了进去，他手上拿着一只鸡毛掸子。\n\
<span style = 'font-style: italic;'><em>我就是赵广成，你应该看见门外的便签了吧？不好意思，我以为丧尸摸到门口了……吓死我了</em>赵广成把门摔上。砰。</span>\n",
    choices: [
      {
        text: "坐下",
        nextScene: "益丰大药房-办公室闲聊",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-推门进入办公室": {
    image: "images/小区周边/益丰大药房/推门进入办公室.png",
    text: "你推门进入办公室。沙发上坐着一个中年人，手里紧紧攥着一个鸡毛掸子，但他看到你时神情就放松了下来。\n\
<span style = 'font-style: italic;'><em>终于不是丧尸了。年轻人。这个，这个是掸灰的。不是要打人。我怕进来的是……我不知道是什么。你正常，对吧？你是正常人。</em></span>\n\
",
    choices: [
      {
        text: "坐下",
        nextScene: "益丰大药房-办公室闲聊",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-办公室闲聊": {
    image: "images/小区周边/益丰大药房/办公室闲聊.png",
    text: "赵广成给你递了一瓶没开封的矿泉水——从他办公桌底下箱子里拿出来的，外包装还贴着超市的打折标签。\n\
他特别强调了一句：“这是我上星期买的，封好的，不是自来水灌的。自来水不干净，我跟利昂说过好几次了，最近水不对，他不听，老说烧开了就行。”\n\
这好像打开了他的话匣子。“我卖药二十年了，这个事我跟你说，不对劲。二十七号开始就有人来买退烧药，一个两个就算了，来的都是那种\
——你晓得吧，不是普通发烧。脸通红，嘴唇干得裂口子，进来第一句话不是‘多少钱’，是‘有没有水’。我开药店又不是开水站。”\n\
他摇了摇头。“利昂也注意到了。他跟我说‘老赵，最近退烧药走得快，要不要补货’。我当时还说他瞎操心，现在看来——”\n\
”唉。一副末世景观。“你说。",
    choices: [
      {
        text: "离开药房",
        nextScene: "益丰大药房-选择离开的路",
        effect: updateTime(1)
      },
      {
        text: "继续闲聊",
        nextScene: "益丰大药房-办公室闲聊2",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-办公室闲聊2": {
    image: "images/小区周边/益丰大药房/办公室闲聊2.png",
    text: "“利昂这人，其实蛮有意思的。”赵广成换了个坐姿，声音没那么紧绷了。“他不会用筷子吃小笼包，每次都要拿个勺子托着。我说你这样吃法上海人看了要笑，他说‘那你们用筷子喝汤不也漏吗’。我说不过他。”\n\
他又点了一根烟，这次没抽，只是夹着。“你会不会觉得我说太多了？我在这个办公室里闷了一天了，连个喘气的都没有。”\n\
“没事，”你说，“你说。”\n\
“好人没好报啊。利昂这种人，在墨尔本好好待着不行吗，非要跑到上海来。来就来了，还这么认真上班。你知道吗，他盘货的时候嘴里会念英文药名，念完了再用中文念一遍，我一开始以为他在背经。\
”赵广成苦笑了一下，“我现在坐在这儿，满脑子都是这些事。跟你讲出来，好受一点。”\n\
他透过掰弯的百叶窗缝隙往外看了一眼。“行吧，你肯定还要赶路。这里不是人待的地方。等一下——”\n\
他从抽屉里翻出一个皱巴巴的口罩，拍掉上面沾的药片碎屑，递给你。“拿去。不值什么，路上戴着。”\n\
“你怎么办？”你问道。“唉，这药房里有一点食物，够我吃十天半个月的。如果被丧尸抓伤，这里的医疗物资也够。等到物资消耗完了……你不用操心我。不，我的意思是，你的路还很长，不用带上我这个累赘。\n\
后会有期吧。”",
    choices: [
      {
        text: "继续闲聊",
        nextScene: "益丰大药房-办公室闲聊2",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-选择离开的路": {
    image: "images/小区周边/益丰大药房/选择离开的路.png",
    text: "你选择离开药房。赵广成在背后说了句：“拜拜~你是从正门进来的么？小心点，路上丧尸多。”",
    choices: [
      {
        text: "走正门离开",
        nextScene: "益丰大药房-丧尸偷袭，仓皇逃窜",
        effect: updateTime(1)
      },
      {
        showCondition: "_visit['益丰大药房-右边货架翻找'] > 0 || pharmacyApprenticeWatered",
        text: "去消防通道",
        nextScene: "益丰大药房-消防通道",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-丧尸偷袭，仓皇逃窜": {
    image: "images/小区周边/益丰大药房/丧尸偷袭，仓皇逃窜.png",
    onEnter: {set: {hurtByZombie: true}},
    text: "你穿过走廊，从库房走出。和阳光一起洒入药房的，还有无数丧尸的嘶吼。你仓皇逃出药房，还被抓了好几下。",
    choices: [
      {
        text: "快跑！",
        nextScene: "三林路",
        effect: updateTime(1)
      }
    ],
  },

  "益丰大药房-消防通道": {
    image: "images/小区周边/益丰大药房/消防通道.png",
    text: function(vars) {
      if(vars._visit['益丰大药房-消防通道'] >= 2) {
        return "你要如何开门？";
      }
      return "你沿着灯光往货架深处走去，走廊的尽头是一扇防火门。";
    },
    choices: [
      {
        text: "打开旁边的配电箱",
        nextScene: "益丰大药房-配电箱",
      },
      {
        text: "按下把手",
        nextScene: "益丰大药房-消防通道",
      },
      {
        text: "直接撞门",
        nextScene: "益丰大药房-背后偷袭的丧尸",
      }
    ]
  },

  "益丰大药房-配电箱": {
    image: "images/小区周边/益丰大药房/配电箱.png",
    text: "你打开配电箱，里面有一个红色拉杆和一排黑色按钮。",
    choices: [
      {
        text: "按下红色拉杆",
        nextScene: "益丰大药房-打开防火门",
      },
      {
        text: "按下黑色按钮",
        nextScene: "益丰大药房-断电",
      },
      {
        text: "不管，给这里玩坏了咋办",
        nextScene: "益丰大药房-消防通道",
      }
    ]
  },

  "益丰大药房-断电": {
    image: "images/小区周边/益丰大药房/断电.png",
    text: "你按下几个黑色按钮，周围灯光一闪一闪的，然后一个个熄灭了。你听到远处传来了骂骂咧咧的声音，然后是开门声。\n\
突然，传来一声尖叫，响声贯穿整个药房。你听到窸窸窣窣的脚步声。黑暗中隐约传来嘎吱嘎吱的声音。\n\
你快速地关闭了配电箱。",// 赵广成办公室被你断电了，于是他出来看看发生什么了，正好碰上已经尸变的女学徒，尖叫声引来了门口的丧尸，卒
    choices: [
      {
        text: "开门",
        nextScene: "益丰大药房-打开防火门",
        effect: updateTime(1)
      },
      {
        text: "打开配电箱，把黑色按钮按回去",
        nextScene: "益丰大药房-灯光恢复",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-打开防火门": {
    image: "images/小区周边/益丰大药房/打开防火门.png",
    text: "你打开防火门，跑了出去。",
    choices: [
      {
        text: "...",
        nextScene: "三林路-环林东路 十字路口",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-灯光恢复": {
    image: "images/小区周边/益丰大药房/灯光恢复.png",
    text: "你打开配电箱，灯光慢慢恢复了。货架背后走出来1只、2只、3只……好多只丧尸……",
    choices: [
      {
        text: "快开门！",
        nextScene: "结局-被丧尸扑倒咬死",
        effect: updateTime(1)
      },
      {
        text: "战斗",
        nextScene: "益丰大药房-与丧尸打群架",
        effect: updateTime(1)
      }
    ]
  },

  "益丰大药房-与丧尸打群架": {
    image: "images/小区周边/益丰大药房/与丧尸打群架.png",
    text: "丧尸们一拥而上，你需要快速做出反应！",   
    onEnter: initMemoryGame(["红","蓝","绿"], 10), // 中等难度
    choices: [
      {
        text: "输入你看到的颜色",
        input: {
          match: function(vars, input) {
            return normalizeColorAnswer(input) === normalizeColorAnswer(vars._currentAnswer);
          },
          placeholder: "例如：3红2蓝 或 2蓝3红",
          wrongScene: "结局-颜色错误，被丧尸咬死"
        },
        effect: updateTime(5, { add: { strength: -1 } }),
        nextScene: "三林路-环林东路 十字路口",
        timeout: 15000,
        timeoutScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },
});
