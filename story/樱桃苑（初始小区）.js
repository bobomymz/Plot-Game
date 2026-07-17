// ========== story-myNeiborhood.js ==========
// 我的小区（初始卧室、玄关、窗户、闹钟、床底、楼梯间、地下车库、民防设施等）

Object.assign(storyData, {

  "初始卧室": {
    image: timeImage({
      morning:  "images/home/bedroom.png",
      evening:  "images/home/bedroom-evening.png",
      night:    "images/home/bedroom-night.png",
      midnight: "images/home/bedroom-midnight.png"
    }),
    onEnter: {
      set: { currentPlace: "初始小区", currentPos: "我家" }
    },
    text: function(vars) {
      if(vars._visit["初始卧室"] === 1) {
        return "你是建平中学的毕业生，高考已经结束，日子仿佛被抽去了骨架，软塌塌地摊在七月闷热的空气里。这天早上你醒来时，阳光已经穿过半旧的窗帘，在地板上烙下懒洋洋的光斑。\
    <span style='font-size: 12px;'>请往下滑动哦</span>\n\
闹钟显示7:30，如果是在往日，早读已经过去一半了。\n哦，这么算的话，再过半小时，妈妈就买早餐回来了。\
    <span style='font-size: 12px;'>鼠标点击此框可以快速过剧情哦</span>";
      }
      else if(vars.dd == 1 && vars.hh >= 11) return "有点饿了，妈妈为什么还没回来呢？";
      return "";
    }, 
    /* 玩家可以反复回到此场景，闹钟时间均不变，暗示闹钟早就坏了，而妈妈不会再回来了 */
    choices: [
      {
        text: "起床散步去喽",
        condition: "dd == 2 || dd == 4 || hh % 2 == 1", // 仅第2天、第4天和特定时间段是没有丧尸堵在门口的
        nextScene: "1楼-安全",
        elseScene: "结局-开幕雷击"
      },
      {
        text: "继续睡觉",
        nextScene: "初始卧室",
        effect: updateTime(180) // 睡3个小时
      },
      {
        text: "推开窗户",
        nextScene: "窗外的风景"
      },
      {
        text: "玩弄一下闹钟",
        nextScene: "闹钟",
        effect: updateTime(1) // 花1分钟玩闹钟
      },
      {
        text: "拿出床底的手机",
        nextScene: "床底的食物",
        condition: "foodUnderBed",
        elseScene: "什么都没有"
      }
    ]
  },

  "什么都没有": {
    image: "images/home/nothingUnderBed.png",
    text: "床底什么都没有，说了什么都没有。",
    onEnter: {
      add: { strength: -1 }
// 反复查看会扣体力，然后累死（搞笑）
    },
    choices: [
      {
        text: "看看其它东西",
        nextScene: "初始卧室"
      }
    ]
  },

  "结局-开幕雷击": {
    image: "images/zombieKnockYouDown.png",
    text: "你打开房门，一个丧尸冲了进来————剧终\n你猜为什么游戏叫这个名字？:\n—— 结局：开幕雷击 ——"
  },

  "玄关": {
    image: "images/home/foyer.png",
    onEnter: updateTime(1), // 花1分钟走到玄关
    text: "你走到家门前。\n\
这是一扇棕色木门，不锈钢门锁，上面有些许划痕。猫眼早就模糊不清了，透过它只能看见一团扭曲的暗色，也许下个月会换掉吧。\n\
这时，有人敲响了门。是妈妈？还是查水表的？想起来我们家好像经常忘交水费，哈哈。",
    choices: [
      {
        text: "开门",
        nextScene: "家门外的丧尸"
      },
      {
        text: "趴下来从门缝往外看",
        nextScene: "丧尸的凝视",
      },
      {
        text: "返回卧室",
        nextScene: "初始卧室"
      }
    ]
  },

  "结局-丧尸的凝视": {
    image: "images/home/eyeUnderDoor.png",
    style: "font-size: 19px;",                      // ← 整体字号
    text: "你俯下身，侧脸几乎贴着冰凉的瓷砖……\
    <br><br><div style='color: rgba(8, 243, 47, 1); font-weight: bold; font-size: 22px;'>一只闪烁着绿光的眼睛正盯着你</div>\
    <br><br><div style='color: #ff4444; font-weight: bold; font-size: 18px;'>短暂的死寂之后，整扇门猛地向内凸起——它进来了。</div>\n\
—— 结局：当你凝视深渊时，深渊也在凝视着你。 ——",
  },

  "窗外的风景": {
    image: timeImage({
      morning:  "images/home/overlookNeighboorhood.png",
      evening:  "images/home/overlookNeighboorhood-evening.png",
      night:    "images/home/overlookNeighboorhood-night&midnight.png",
      midnight: "images/home/overlookNeighboorhood-night&midnight.png"
    }),
    onEnter: updateTime(5), // 花5分钟看风景
    text: "你走到窗前。窗外是小区的风景，看起来还不错。你觉得可以下楼看看？",
    choices: [
      {
        text: "出门下楼去",
        nextScene: "玄关"
      },
      {
        text: "自由落体才是最快的",
        nextScene: "结局-自尽"
      }
    ]
  },

  "结局-自尽": {
    image: "images/home/一跃解千愁.png",
    text: "最明智的选择，尸潮什么的，与我无关——————————————\n—— 结局：自由落体 ——",
    choices: [
      {
        text: "重生之我直面尸潮",
        nextScene: "start"
      }
    ]
  },

  "床底的食物": {
    image: "images/home/foodUnderBed.png",
    onEnter: {
      set: { foodUnderBed: false },
      add: { strength: 3 }
    },
    text: "你看了眼床底，手机怎么没了？这里只有一包方便面。\n这是你两个月前藏的私货，你想起来了。毕业前没来得及在学校食堂消耗掉，所以带回家里了。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复3点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "方便面真好吃",
        nextScene: "初始卧室",
        effect: updateTime(15) // 花15分钟吃方便面
      }
    ]
  },

  "闹钟": {
    image: timeImage({
      morning:  "images/home/clock.png",
      evening:  "images/home/clock-evening.png",
      night:    "images/home/clock-night&midnight.png",
      midnight: "images/home/clock-night&midnight.png"
    }),
    text: "你走到闹钟。闹钟显示着7:30。你摇了摇闹钟，感觉里面有什么东西",
    choices: [
      {
        text: "打开看看",
        nextScene: "打开闹钟"
      },
      {
        text: "四处走走",
        nextScene: "玄关"
      }
    ]
  },

  "打开闹钟": {
    image: timeImage({
      morning:  "images/home/clockInside.png",
      evening:  "images/home/clockInside-evening.png",
      night:    "images/home/clockInside-night&midnight.png",
      midnight: "images/home/clockInside-night&midnight.png"
    }),
    text: "你打不开闹钟，搞不清楚里面有什么东西。也许只是钟坏了，你想。",
    choices: [
      {
        text: "离开房间",
        nextScene: "玄关"
      }
    ]
  },
  // 家门外的丧尸场景添加抖动效果
  "家门外的丧尸": {
    image: "images/home/zombieOutsideHome.png",
    text: "你按下把手，拉开家门，外面竟是一只蠢蠢欲动的丧尸！",
    qte: {
      timeout: 5000,              // 5 秒（这次选错就是即死结局，没什么决策深度，所以时间紧）
      onTimeout: "结局-被丧尸扑倒咬死"  // 超时则被咬死
    },
    onEnter: {
      shake: true  // 场景抖动
    },
    choices: [
      {
        text: "一个闪身冲向楼梯间",
        nextScene: "教程-识别颜色躲丧尸"
      },
      {
        text: "躲在家里，从门缝看",
        nextScene: "结局-丧尸的凝视"
      }
    ]
  },

  "教程-识别颜色躲丧尸": {
    image: "images/home/zombieOutsideHome.png",
    text: "【教程】接下来，屏幕将会闪烁不同的颜色，你需要在规定时间内输入你看到的颜色。输入错误，你就会被丧尸扑倒咬死。",
    onEnter: initMemoryGame(["红","蓝"], 5),
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
        nextScene: "家外楼梯间的抉择",
        timeout: 10000,           // ← 10秒倒计时
        timeoutScene: "结局-被丧尸扑倒咬死"       // ← 超时自动触发
      }
    ]
  },

  "结局-颜色错误，被丧尸咬死": {
    image: "images/被丧尸扑倒咬死.png",
    text: "你灵活地躲开丧尸的爪子，但反应慢了半拍，丧尸转身又扑了上来……你被丧尸咬死了。\n—— 结局：视力有待提高 ——"
  },

  "结局-丧尸破门而入": {
    image: "images/home/zombieBreakDoor.png",
    text: "突然，丧尸猛地撞开了门，你脑袋挨了重重一击，晕了过去。\n—— 结局：丧尸破门而入 ——"
  },

  "家外楼梯间的抉择": {
    image: "images/home/staircase.png",
    onEnter: updateTime(1), // 花1分钟跑到楼梯间
    text: "你跑到楼梯间。丧尸突然闪到了你的身后！\n\
你只能快速选择一个楼层离开，或者躲起来，祈祷丧尸不会追你……",
    qte: {
      timeout: 10000,              // 10 秒
      hidden: true,
      onTimeout: "结局-被丧尸扑倒咬死"  // 超时则被咬死
    },
    choices: [
      {
        text: "上楼",
        nextScene: "3楼"
      },
      {
        text: "下楼到1楼",
        nextScene: "1楼"
      },
      {
        text: "下楼到B1",
        nextScene: "B1"
      },
      {
        text: "去坐电梯",
        nextScene: "家门口电梯"
      }
    ]
  },

  "家门口电梯": {
    image: "images/home/lift.jpg",
    text: "你躲进了电梯，丧尸没有追上来。你显然不能继续待在你家的2楼，需要赶快选个楼层离开",
    onEnter: updateTime(1), // 花1分钟到达2楼
    qte: {
      timeout: 15000,              // 15 秒
      onTimeout: "结局-电梯门开了"  // 超时则被咬死
    },
    choices: [ // 选择楼层
      {
        text: "F3",
        nextScene: "3楼-安全"
      },
      {
        text: "F1",
        nextScene: "1楼",
        effect: updateTime(1) // 花1分钟到达1楼
      },
      {
        text: "B1",
        nextScene: "B1",
        effect: updateTime(1) // 花1分钟到达B1
      }
    ]
  },  

  "结局-电梯门开了": {
    image: "images/home/电梯门开了.png",
    text: "电梯门突然开了，丧尸冲进来咬死了你。\n\
想 必 你 下 次 会 更 加 果 断 吧。\n\
—— 结局：电梯惊魂 ——"
  },

  "3楼-安全": {
    image: "images/home/3楼.png",
    text: "你走到3楼。这里不知何时已经堆满了家具，你无法进入。",
    choices: [
      {
        text: "返回楼梯间",
        nextScene: "家外楼梯间的抉择"
      }
    ]

  },

  "3楼": {
    image: "images/home/3楼.png",
    text: "你走到3楼。这里不知何时已经堆满了家具，你无法进入。",
    choices: [
      {
        text: "躲在家具里",
        nextScene: "来自丧尸的惊吓"
      }
    ]
  },
  "结局-来自丧尸的惊吓": {
    image: "images/home/zombieScare.png",
    text: "突然，一只丧尸不知从什么地方窜了出来，向你扑来！",
    qte: {
      timeout: "5000 - repeatedClickTimes * 2000 - foodUnderBed * 999", // 5 秒，但每次点击减少2秒
      onTimeout: "结局-反应太慢被咬死了"  // 超时则被咬死
    },
    choices: [
      {
        text: "闪！你抵消丧尸一张杀。",
        nextScene: "来自丧尸的惊吓",
        condition: "repeatedClickTimes < 2", 
        // 相当于点击2次，因为先检查condition再造成effect
        effect: {
          add: {repeatedClickTimes: 1}
        },
        elseScene: "初遇陈默"
      }
    ]
  },

  "结局-反应太慢被咬死了": {
    image: "images/zombieKnockYouDown.png",
    text: "丧尸冲了上来，把你扑在地上。没来得及反应，你就被咬死了。\n\n—— 结局：反应太慢被咬死了 ——",
    choices: [
      {
        text: "重来！这次不算！",
        nextScene: "start"
      }
    ]
  },

  "初遇陈默": {
    image: "images/home/chenMoSaveYou.png",
    onEnter: {
      set: { repeatedClickTimes: 0 }
    },
    text: "一个黑衣人突然从墙角闪了出来，一棍子打飞了丧尸。他转头看向你，一半脸庞隐藏在鸭舌帽的阴影下。\n\
<em><span style='color: #f8d305ff;'>算你好运。跟着我，我可以带你出小区。</span></em>\n\
你决定？",
    choices: [
      {
        text: "跟着他",
        nextScene: "小区西门",
        effect: updateTime(2) // 花2分钟到达小区西门
      },
      {
        text: "不跟着他",
        nextScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "结局-被丧尸扑倒咬死": {
    image: "images/zombieKnockYouDown.png",
    text: "丧尸冲了上来，猛地把你扑倒在地。没来得及反应，你就被咬死了。\n\
—— 结局：被丧尸扑倒咬死 ——"
  },// 会自动给出重新开始按钮

  "1楼": {
    image: "images/home/1楼-party.png",
    text: "你到了一楼大厅。一群丧尸正在开party，一看见你就<em><span style='color:red;'>非常热情</span></em>地围拢过来。"
  },

  "B1": {
    image: "images/home/B1.png",
    onEnter: { set: { currentPlace: "初始小区", currentPos: "地下车库" } },
    choices: [
      {
        text: "返回楼梯间",
        nextScene: "来自丧尸的惊吓"
      },
      {
        text: "查看柱子上的纸张",
        nextScene: "柱子上的纸张",
      },
      {
        text: "往前走",
        nextScene: "西出口",
        effect: updateTime(2), // 花2分钟到达西出口
        condition: "visitExitTimes >= 2",
// 不查看地图，则东西出口至少要逛两次才能走通，其中西出口可以直接离开，东出口有其他剧情
// 西出口不是西门，西出口是地下车库的出口
        elseScene: "西出口-丧尸堵路"
      },
      {
        text: "往左走",
        nextScene: "东出口",
        effect: updateTime(2), // 花2分钟到达东出口
        condition: "visitExitTimes >= 2",
        elseScene: "东出口-废车堵路"
      },
      {
        text: "查看墙上的痕迹",
        nextScene: "墙上的痕迹",
        effect: updateTime(1) // 花1分钟查看墙上的痕迹
      }
    ]
  },

  "B1-2nd": {
    image: "images/home/B1.png",
    text: "你回到了你那栋楼的地底下。",
    choices: [
      {
        text: "上1楼",
        nextScene: "1楼-安全"
      },
      {
        text: "查看柱子上的纸张",
        nextScene: "柱子上的纸张"
      },
      {
        text: "往前走",
        nextScene: "西出口",
        condition: "visitExitTimes >= 2", 
// 不查看地图，则东西出口至少要逛两次才能走通，其中西出口可以直接离开，东出口有其他剧情
        elseScene: "西出口-丧尸堵路"
      },
      {
        text: "往左走",
        nextScene: "东出口",
        condition: "visitExitTimes >= 2",
        elseScene: "东出口-废车堵路"
      }
    ]
  },

  "1楼-安全": {
    image: "images/home/1楼-安全.png",
    text: "你到了一楼大厅。这里似乎有被火烧过的痕迹，地上还有很多脚印。",
//开party的丧尸不小心点燃了什么易燃物体把自己烧死了
    choices: [
      {
        text: "出去看看",
        nextScene: "小区道路"
      },
      {
        text: "回到B1",
        nextScene: "B1"
      }
    ]
  },

  "小区道路": {
    image: "images/home/小区道路.png",
    onEnter: { set: { currentPlace: "初始小区", currentPos: "小区道路" } },
    text: "你走在小区的小道上。曾经你在这里练习足球，可以看到很多老年人带着孩子玩，时不时有外卖员驶过。现在，不会再有了。\n\
你看到有一个人坐在椅子上，像是睡着了.\n\
还能这么悠闲？",
//开party的丧尸不小心点燃了什么易燃物体把自己烧死了
    choices: [
      {
        text: "看看那个人",
        nextScene: "装睡的丧尸"
      },
      {
        text: "往右走",
        nextScene: "小区东门",
        effect: updateTime(2) // 花2分钟到达小区东门
      },
      {
        text: "往左走",
        nextScene: "小区西门",
        effect: updateTime(2) // 花2分钟到达小区西门
      }
    ]
  },

  "装睡的丧尸": {
    image: "images/home/sleepyombie.png",
    text: "你靠近那个人，ta穿着连帽衫，看不到脸，两手戴着蓝色手套，交叉放于胸前。\n\
你轻轻拍了拍，ta没有反应。\n\
你决定？",
    choices: [
      {
        text: "摇醒ta",
        nextScene: "摇睡丧尸",
        effect: updateTime(1) // 花1分钟到达摇丧尸
      },
      {
        text: "不管它，不如先躲回家",
        nextScene: "反杀老6",
        condition: "strength > 2",
        elseScene: "背后的偷袭"
      }
    ]
  },

  "摇睡丧尸": {
    image: "images/home/zombieAwake.png",
    onEnter: {shake: true},
    text: "你用更大的力气摇了摇ta，连帽衫的帽子掉了。你惊呆了，这是一只丧尸！\n\
它突然抬起头来，眼睛瞪着你，向你扑来。\n\
达成结局：不要试图叫醒一个装睡的入"
  },

  "反杀老6": {
    image: "images/home/老六偷袭未果.png",
    text: "你对它丧失了兴趣，转身离开。\n\
只听得背后传来木头长椅的嘎吱一响，背后阴风袭来，你吓了一大跳，往后<span style = 'font-weight: bold;'>飞踹一脚</span>，把什么东西踹飞了出去。\n\
回头一看，正是椅子上的那个睡神，它竟是一只丧尸！\n\
趁着它暂时晕过去了，你得赶紧离开了。",
    choices: [
      {
        text: "去东门",
        nextScene: "小区东门",
        effect: updateTime(2) // 花2分钟到达小区东门
      },
      {
        text: "去西门",
        nextScene: "小区西门",
        effect: updateTime(2) // 花2分钟到达小区西门
      }
    ]
  },

  "背后的偷袭": {
    image: "images/placeholder.png" /* TODO: images/home/attackBehind.png */,
    onEnter: {shake: true},
    text: "你对ta丧失了兴趣，转身离开。\n\
只听得背后传来木头长椅的嘎吱一响，背后阴风袭来。你只感觉脖颈一痛，便失去了知觉。"
  },

  "西出口-丧尸堵路": {
    image: "images/placeholder.png" /* TODO: images/home/zombie.png */,
    onEnter: updateTime(1, { add: { visitExitTimes: 1 }}), // 花1分钟碰到丧尸
    text: "你走在前往西出口的路上。这里你轻车熟路，因为平时雨天你都会走这条路回家。\n\
突然，一只丧尸从一根柱子后面闪了出来，你无法继续前进。",
    qte: {
      timeout: 3000,              // 3秒
      onTimeout: "结局-被丧尸扑倒咬死"  // 超时则被咬死
    },
    choices: [
      {
        text: "战斗！",
        nextScene: "地下车库的丧尸"
      },
      {
        text: "快跑",
        nextScene: "B1-2nd"
      }
    ]
  },

  "地下车库的丧尸": {
    image: "images/placeholder.png" /* TODO: images/home/zombie.png */,
    onEnter: {shake: true},
    text: "丧尸向你袭来，你要攻击它哪里？",
    qte: {
      timeout: 2000,              // 2秒
      onTimeout: "结局-被丧尸扑倒咬死"  // 超时则被咬死
    },
    choices: [
      {
        text: "脚",
        nextScene: "结局-嘎吱嘎吱",
        condition: "strength > 1",
        elseScene: "结局-被丧尸扑倒咬死"
      },
      {
        text: "头",
        nextScene: "KO丧尸",
        condition: "strength > 1",
        elseScene: "结局-被丧尸扑倒咬死"
      },
      {
        text: "身体",
        nextScene: "击退丧尸",
        condition: "strength > 2",
        elseScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "结局-嘎吱嘎吱": {
    image: "images/placeholder.png" /* TODO: images/home/zombie.png */,
    onEnter: {shake: true},
    text: "你一脚踢出，被丧尸一口咬住，你被咬死了。\n\
—— 结局：嘎吱嘎吱 ——"
  },

  "KO丧尸": {
    image: "images/home/KOzombie.png",
    text: "你一拳挥出，将丧尸击倒，又补了几脚，它不动了。看来一时半会儿不会有问题了。",
    onEnter: updateTime(1, { add: { strength: -1 } }), // 花1分钟揍丧尸
    choices: [
      {
        text: "还不快走",
        nextScene: "陌生的岔路口"
      }
    ]
  },

  "陌生的岔路口": {
    image: "images/placeholder.png" /* TODO: images/home/crossing.png */,
    text: "现在你正处于一个陌生的岔路口，该往哪里走呢？",
    choices: [
      {
        text: "直走到底",
        condition: "visitExitTimes > 2",
        nextScene: "西出口",
        elseScene: "西出口-丧尸堵路",
        effect: updateTime(2) // 花2分钟到达西出口
      },
      {
        text: "前面右转",
        nextScene: "地下非机动车停靠区",
        effect: updateTime(1) // 花1分钟到达地下非机动车停靠区
      }
    ]
  },

  "地下非机动车停靠区": {
    image: "images/home/nonMotorized.png",
    text: "你来到了地下非机动车停靠区，这里有不少自行车和电瓶车。楼梯上方隐约传来丧尸的低吼声",
    choices: [
      {
        text: "继续前进",
        condition: "visitExitTimes > 2",
        nextScene: "西出口",
        elseScene: "西出口-丧尸堵路",
        effect: updateTime(2) // 花2分钟到达西出口
      },
      {
        text: "骑上一辆自行车",
        nextScene: "车上锁了"
      },
      {
        text: "骑上一辆电瓶车",
        condition: "Math.random() < 0.2 || hasEbikeKey", // 30%概率解锁一辆电瓶车
        nextScene: "骑车去西出口",
        elseScene: "车上锁了"
      },
      {
        showCondition: "_visit['民防设施-等候区'] > 0", // 去过民防设施，才能上楼梯
        text: "上楼梯",
        nextScene: "小区西门"
      }
    ]
  },

  "车上锁了" : {
    image: "images/placeholder.png" /* TODO: images/home/lockedBike.png */,
    text: "哎呀，这车上有锁，看来你是不能白嫖了。",
    choices: [
      {
        text: "四处看看",
        nextScene: "地下非机动车停靠区"
      }
    ]
  },

  "骑车去西出口": {
    image: "images/placeholder.png" /* TODO: images/home/cycleToExit.png */,
    onEnter: { set: { positionAfterOperation: "骑车去西出口" } },
    text: "你的运气很好，这辆车没锁。你可以骑上它向西出口前进。",
    choices: [
      {
        text: "骑上电瓶车",
        condition: "itemCount < bagVolume",
        nextScene: "西出口",
        effect: { set: { hasEbike: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      }
    ]
  },

  "击退丧尸": {
    image: "images/placeholder.png" /* TODO: images/home/beatZombie.png */,
    text: "你一拳打在丧尸胸口，将它击退，它踉跄几步，眼神凶狠，加快速度向你扑来",
    onEnter: { add: { strength: -2 } },
    choices: [
      {
        text: "快跑！",
        condition: "visitExitTimes > 2",
        nextScene: "东出口",
        effect: updateTime(2), // 花2分钟到达东出口
        elseScene: "防爆门"
      }
    ]
  },

  "防爆门": {
    image: "images/placeholder.png" /* TODO: images/home/防爆门.png */,
    text: "你仓皇逃窜，眼前是一道防爆门，关上它就能挡住丧尸！",
    qte: {
      timeout: 3000,              // 3秒
      onTimeout: "结局-被丧尸扑倒咬死"  // 超时则被咬死
    },
    choices: [
      {
        text: "把手左旋",
        nextScene: "结局-被丧尸扑倒咬死"
      },
      {
        text: "把手右旋",
        nextScene: "丧尸被防爆门夹扁"
      }
    ]
  },

  "丧尸被防爆门夹扁": {
    image: "images/placeholder.png" /* TODO: images/home/squeezeZombie.png */,
    onEnter: { add: { strength: -1 } },
    text: "在丧尸冲过来时，你侧身把防爆门关上了，它的半只手臂夹在了中间，却仍不断挥舞着。\n\
你向右旋转圆形把手，防爆门锁死，成功地用防爆门把将丧尸夹扁。",
    choices: [
      {
        text: "继续前进",
        condition: "visitExitTimes > 2",
        nextScene: "西出口",
        effect: updateTime(2), // 花2分钟到达西出口
        elseScene: "西出口-丧尸堵路"
      }
    ]
  },

  "西出口": {
    image: "images/home/westExit.png",
    text: "你来到了西出口，成功逃出了地下车库",
    choices: [
      {
        text: "继续前进",
        nextScene: "小区西门",
        effect: updateTime(1) // 芑1分钟到达小区西门
      }
    ]
  },

  "墙上的痕迹": {
    image: "images/home/wallAd.png",
    text: "墙上贴满了广告：公积金贷款、下水道维修、黄色小卡片，中间还有张寻人启事，失踪者叫“林奇”。撕得零零碎碎的，更像是谁的收藏品展览。",
    choices: [
      {
        text: "继续",
        nextScene: "B1-2nd"
      }
    ]
  },

  "柱子上的纸张": {
    image: "images/home/columnMap.png",
    /* 地图上写道：如果你看到这行字，你应该去东出口，西出口堵上了 */
    onEnter: updateTime(1),
    text: "你查看柱子上的纸张，发现这是一张地图。其中标注了西出口和东出口的位置，看来你可以少绕点路了。",
    choices: [
      {
        text: "去东出口",
        nextScene: "东出口"
      },
      {
        text: "去西出口",
        nextScene: "西出口-丧尸堵路"
      }
    ]
  },

  "东出口-废车堵路": {
    image: "images/home/carBlock.png",
    onEnter: { add: { visitExitTimes: 1 } },
    text: "东出口被一辆报废面包车斜卡着，四个轮胎全瘪，活像一只死透的甲虫。\n\
看来，只能指望西出口了（你总不会想和楼道里那些丧尸打吧）。\n\
你正琢磨怎么翻过去，身后传来熟悉的拖步声，一只丧尸跟了上来。",
    choices: [
      {
        text: "战斗！",
        nextScene: "地下车库的丧尸"
      }
    ]
  },

  "东出口": {
    image: "images/home/eastExit.png",
    text: "你来到了东出口。不幸的是，地下车库的门关上了，你无法打开。右边的墙上有一个红色的按钮，左边有一扇铁门，里面黑漆漆的。",
    choices: [
      {
        text: "按下按钮",
        nextScene: "没用的按钮"
      },
      {
        text: "打开铁门进去",
        nextScene: "民防设施-等候区"
      }
    ]
  },

  "没用的按钮": {
    image: "images/home/button.png",
    onEnter: updateTime(1), // 花1分钟按下按钮
    text: "你按下按钮，但是没有反应。此时，后面传来了脚步声。",
    choices: [
      {
        text: "谁？",
        nextScene: "来自丧尸的惊吓"
      }
    ]
  },

  "民防设施-等候区": {
    image: "images/home/CDwaitingRoom.png",
    text: "你在一个小房间里。这个房间空无一人，只有一张桌子和墙上的一些告示。",
    onEnter: { set: { currentPlace: "初始小区", currentPos: "民防设施" } },
    choices: [
      {
        showCondition: "!hasDiary && !hasTorch",
        text: "查看桌子",
        nextScene: "等候区的桌子",
        effect: updateTime(1) // 芑1分钟查看桌子
      },
      {
        showCondition: "!hasBroom",
        text: "拿起扫帚",
        nextScene: "等候区的扫帚",
        effect: updateTime(1) // 芑1分钟拿起扫帚
      },
      {
        showCondition: "!hasEbikeKey",
        text: "阅读墙上的告示",
        nextScene: "墙上的民防告示",
        effect: updateTime(1) // 芑1分钟阅读告示
      },
      {
        text: "往走廊深处走",
        nextScene: "民防设施-楼梯间",
        effect: updateTime(1) // 芑1分钟往走廊深处走
      },
      {
        showCondition: "visitWaitingRoomTimes <= 1",
        text: "回头离开",
        nextScene: "陌生的岔路口",
        effect: updateTime(1) // 芑1分钟回头离开
      }
    ]
  },

  "等候区的桌子": {
    image: "images/home/books.png",
    text: "你走向桌子，这里叠着几本小册子，有检修报告、民防守则、报纸等。这里看起来平时是有人的。\n\
你仔细翻看了一下，发现其中夹着一本日记本。打开一看，里面是空白的。",
    onEnter: { add: { visitWaitingRoomTimes: 1 } },
    choices: [
      {
        text: "拿上日记本",
        nextScene: "民防设施-等候区",
        condition: "visitWaitingRoomTimes <= 3", 
        // 如果在等候区决策过多次数，丧尸就会进来（不再重复声明）
        effect: { set: { hasDiary: true }, add: { itemCount: 1 } },
        elseScene: "结局-丧尸破门而入",
      },
      {
        text: "拉开抽屉",
        nextScene: "抽屉里的手电筒",
        condition: "visitWaitingRoomTimes <= 3", 
        elseScene: "结局-丧尸破门而入",
      }
    ]
  },

  "抽屉里的手电筒": {
    image: "images/placeholder.png" /* TODO: images/home/light.png */,
    onEnter: { add: { visitWaitingRoomTimes: 1 } },
    text: "你打开抽屉，发现里面有一个小手电筒。",
    choices: [
      {
        text: "拿上手电筒",
        nextScene: "民防设施-等候区",
        effect: { set: { hasTorch: true }, add: { itemCount: 1 } }
      },
      {
        text: "不拿手电筒",
        nextScene: "民防设施-等候区"
      }
    ]
  },

  "等候区的扫帚": {
    image: "images/home/broom.png",
    onEnter: { add: { visitWaitingRoomTimes: 1 } },
    text: "你拿起扫帚抖了抖，并没有什么发现。",
    choices: [
      {
        text: "拿上扫帚",
        nextScene: "民防设施-等候区",
        condition: "visitWaitingRoomTimes <= 3", 
        effect: { set: { hasBroom: true }, add: { itemCount: 1 } },
        elseScene: "结局-丧尸破门而入",
      },
      {
        text: "不拿扫帚",
        nextScene: "民防设施-等候区",
        condition: "visitWaitingRoomTimes <= 3", 
        elseScene: "结局-丧尸破门而入",
      }
    ]
  },

  "墙上的民防告示": {
    image: "images/home/notice.png",
    onEnter: { add: { visitWaitingRoomTimes: 1 } },
    text: "你查看了告示",
    qte: {
      timeout: 20000,
      hidden: true,
      onTimeout: "告示后面的钥匙",
    },
    choices: [
      {
        text: "继续",
        nextScene: "民防设施-等候区"
      }
    ]
  },

  "告示后面的钥匙": {
    image: "images/placeholder.png" /* TODO: images/home/key.png */,
    onEnter: { set: { positionAfterOperation: "告示后面的钥匙" } },
    text: "你揭下了告示纸，后面掉出来一个小钥匙，像是电瓶车的车钥匙。",
    choices: [
      {
        text: "拿上钥匙",
        condition: "itemCount < bagVolume",
        nextScene: "民防设施-等候区",
        effect: { set: { hasEbikeKey: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      }
    ]
  },

  "民防设施-楼梯间": {
    image: "images/placeholder.png" /* TODO: images/home/CDstairs.png */,
    qte: {
      timeout: 5000,
      onTimeout: "结局-被丧尸扑倒咬死"
    },
    text: "你往走廊深处走，发现了一个楼梯间。\n\
<span style='color:red;'>突然，你听到砰的一声，进来的那扇铁门被硬生生撞开了，一个魁梧的丧尸钻了进来。</span>\n\
你要怎么办？",
    choices: [
      {
        text: "继续前进找紧急出口",
        nextScene: "民防设施-紧急出口"
      },
      {
        text: "快上楼梯！",
        nextScene: "民防设施-物资区"
      }
    ]
  },

  "民防设施-紧急出口": {
    image: "images/home/exit.png",
    text: "你来到了紧急出口，而丧尸已经近在眼前",
    choices: [
      {
        text: "战斗",
        nextScene: "结局-被丧尸扑倒咬死"
      },
      {
        text: "开门冲出去",
        nextScene: "门锁上了"
      },
      {
        text: "闪！右转进入暗处",
        nextScene: "初遇毒气型丧尸"
      }
    ]
  },

  "门锁上了": {
    image: "images/home/lock.png",
    text: "不好意思，门锁了。\n你还没来得及骂检修人员，就被丧尸创飞了。"
  },

  "初遇毒气型丧尸": {
    image: "images/placeholder.png" /* TODO: images/home/po.png */,
    onEnter: updateTime(5), // 花5分钟躲在黑暗里
    text: "那只魁梧的丧尸像野兽一般朝你扑来，擦过你的后背，狠狠撞在紧急出口的门上。\n\
门震了一下，一点油漆都没刮掉。\n\
你躲进了暗处，大气都不敢喘。\n\
。。。。。。。。。。。。。。。。。。。。。\n\
。。。。。。。。。。。。。。。。。。。。。\n\
。。。。。。。。。。。。。。。。。。。。。\n\
。。。。。。。。。。。。。。。。。。。。。\n\
那只丧尸大抵脑子撞坏了，愣是不知道你去哪了，只能悻悻离开。再等了一会儿，没声音了。",
    choices: [
      {
        text: "原路返回",
        nextScene: "民防设施-等候区",
        effect: updateTime(1) // 花1分钟原路返回
      },
      {
        text: "再等一会儿",
        nextScene: "初遇毒气型丧尸",
        effect: updateTime(1) // 花1分钟再等一会儿
      }
    ]
  },

  "民防设施-物资区": {
    image: "images/placeholder.png" /* TODO: images/home/material.png */,
    onEnter: { set: { positionAfterOperation: "民防设施-物资区" } },
    text: "你来到了物资区。这里堆着很多纸箱子，但不少都是空的。你在其中找到了一个老式防毒面具。这时，杂物堆方向传来窸窸窣窣的声音。",
    choices: [
      {
        text: "拿上防毒面具",
        condition: "itemCount < bagVolume",
        nextScene: "物资区的丧尸",
        effect: { set: { hasGasMask: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "不拿防毒面具",
        nextScene: "物资区的丧尸"
      }
    ]
  },

  "物资区的丧尸": {
    image: "images/home/storageRoom.png",
    text: "你抬头一看，两只丧尸一前一后从杂物堆里走了出来，对你虎视眈眈。",
    qte: {
      timeout: 5000,
      hidden: true,
      onTimeout: "结局-被丧尸扑倒咬死",
    },
    onEnter: { shake: true },
    choices: [
      {
        text: "先揍前面那个",
        nextScene: "结局-被丧尸扑倒咬死"
      },
      {
        text: "先揍后面那个",
        nextScene: "拳打脚踢"
      },
      {
        text: "搬开箱子找找武器",
        nextScene: "民防设施-通风管道"
      },
      {
        text: "还愣着干啥快跑啊",
        nextScene: "民防设施-等候区",
        effect: updateTime(1) // 花1分钟原路返回
      }
    ]
  },

  "民防设施-通风管道": {
    image: "images/home/vent.png",
    onEnter: { add: { strength: -1 } }, // 一脚踹开箱子，费了点力气
    text: "你一脚踹开箱子，这里什么都没有，但是有个通风管道的格栅，看起来不太牢靠。",
    choices: [
      {
        text: "掰开格栅进去",
        nextScene: "民防设施-通风管道的抉择"
      },
      {
        text: "继续找武器",
        nextScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "民防设施-通风管道的抉择": {
    image: "images/home/vent.png",
    text: "你钻进了通风管道，前面是岔路。",
    choices: [
      {
        text: "往左爬",
        nextScene: "死路一条"
      },
      {
        text: "往右爬",
        nextScene: "小区东门"
      }
    ]
  },

  "死路一条": {
    image: "images/placeholder.png" /* TODO: images/home/deadEnd.png */,
    text: "你走错了路，前面是死路一条。\n\
丧尸的那绿色的眼睛是你最后的记忆。\n—— 结局：死路一条 ——"
  },

  "拳打脚踢": {
    image: "images/placeholder.png" /* TODO: images/home/1v2.png */,
    onEnter: { add: { strength: -1 } },
    text: "你率先发动了攻击。\n\
前面那只丧尸向你缓缓走来，你一个滑铲闪过去，冲向后面那只愣神的丧尸，一拳正中脑门。\n\
丧尸一个踉跄将要倒地，被你擒住手臂，一个过肩摔，把它重重砸在它的同伙上。\n\
两只丧尸缓缓爬起来，眼睛似乎在燃烧。你决定？",
    choices: [
      {
        text: "躲进旁边的房间",
        nextScene: "民防设施-进风机房"
      },
      {
        text: "继续战斗",
        nextScene: "拳打脚踢2"
      }
    ]
  },

  "拳打脚踢2": {
    image: "images/placeholder.png" /* TODO: images/home/1v2.png */,
    onEnter: updateTime(3, { add: { strength: -1 } }), // 花3分钟再打一次
    text: "你从墙上掰下来一根长长的铁管，狠狠砸在丧尸们的脑袋上。\n\
咚！咚！        \n\
嗯，现在不会有问题了。",
    choices: [
      {
        text: "进入旁边的房间",
        condition: "itemCount < bagVolume",
        nextScene: "民防设施-进风机房-安全",
        effect: { set : { hasIronPipe: true, positionAfterOperation: "民防设施-进风机房-安全" }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "不急，看一眼有没有遗漏的东西",
        nextScene: "民防设施-物资区-检修记录表"
      }
    ]
  },

  "民防设施-物资区-检修记录表": {
    image: "images/placeholder.png" /* TODO: images/home/检修记录表.png */,
    text: "你从纸箱里翻出一沓文件，掸了掸灰。这是一张《民防设施储藏区检修记录表》，盖着红章，填得还算规整：\n\n\
━━━━━ 民防设施储藏区检修记录表 ━━━━━\n\
检修编号：MF-2024-0873\n\
储藏区位置：东明街道民防工程B2层 · 丙区-7号物资储藏室\n\
检修日期：2024年09月12日  14:30\n\
下次检修日期：2024年12月12日\n\
检修人员：王　　复核人员：刘\n\
责任单位：东明街道人民武装部\n\
━━━━━━━━━━━━━━━━━━━━━━━\n\n\
【一、储藏区环境状况检查】\n\
1. 场地整洁度：合格\n\
2. 通风换气情况：正常\n\
3. 防潮除湿状况：局部潮湿\n\
　　→ 备注：东北角墙体有渗潮痕迹，已登记维修\n\
4. 照明设施状态：完好正常\n\
5. 排水防渗情况：无积水渗漏\n\
6. 消防通道及间距：畅通合规\n\
7. 安防门禁设施：完好可用\n\
　　→ 备注：南侧安全出口防火门锁具转动卡涩，已上油润滑，建议下次检修更换锁芯\n\n\
【二、民防物资存放检查】\n\
1. 物资分类摆放：规范有序\n\
2. 物资台账匹配：账物相符\n\
3. 物资堆放高度/间距：符合规范\n\
4. 物资防尘、防锈、防腐防护：防护缺失\n\
　　→ 备注：部分金属件表面有浮锈，建议加强涂油保养\n\
5. 过期、破损、失效物资：有\n\
　　→ 备注：防毒面具（\"新星\"牌，批次XF-2408）1只。该批次到库30只，抽检3只做气密性测试，1只存在轻微漏气，已单独隔离存放。其余29只暂未发现异常。\n\
6. 应急储备物资完整性：齐全完好\n\n\
【三、储藏区配套设施检修】\n\
1. 货架/储物架：牢固无松动\n\
2. 通风设备：运行正常\n\
3. 除湿/温控设备：参数正常\n\
4. 消防器材：完好有效、在有效期\n\
5. 应急照明、疏散标识：完好清晰\n\
6. 防水、防鼠、防虫设施：破损缺失\n\
　　→ 备注：东北角墙角防鼠网已更换\n\n\
【四、安全隐患排查】\n\
1. 易燃易爆、杂物堆积隐患：无\n\
2. 私拉乱接电线隐患：无\n\
3. 墙体、地面、顶棚破损渗漏隐患：有\n\
　　→ 备注：东北角墙体渗潮（见一-3）\n\
4. 物资堆放倾斜、坍塌隐患：无\n\n\
【五、检修总体结论】\n\
☑ 基本合格，存在轻微问题，限期整改\n\
总体问题汇总：丙区-7号储藏室东北角墙体渗潮及防鼠网破损已修复。安全出口门锁已做临时处理，建议下次检修更换。其余物资储备正常，账物相符。\n\n\
【六、整改落实情况】\n\
整改责任人：王\n\
整改完成时限：2024年09月26日\n\
整改措施：东北角渗潮处已做防水封堵处理，防鼠网已更换，待观察后复查。\n\
整改复核结果：合格　复核人签字：刘\n\n\
检修人员签字：王（2024.09.12）\n\
审核负责人签字：刘（2024.09.13）\n\
━━━━━━━━━━━━━━━━━━━━━━━\n\n\
你把表翻了翻，又看了看面前那堆积满灰尘的纸箱里的防毒面具。那个\"抽检漏气\"的批号……好像就是这批货。",
    choices: [
      {
        text: "进入旁边的房间",
        nextScene: "民防设施-进风机房-安全"
      } // 如果看了表，就不会拿铁棍
    ]
  },

  "民防设施-进风机房": {
    image: "images/home/fanRoom.png",
    text: "你来到了进风机房。\n\
这里有大型电动脚踏两用风机，断电时可人力踩踏送风，配套庞大保温风管、电气控制箱，整间布满金属管道，密密麻麻，如同蜘蛛网。\n\
外面传来砰砰砰的敲门声，你必须尽快做出抉择。",
    choices: [
      {
        text: "走为上策",
        nextScene: "结局-丧尸破门而入"
      },
      {
        showCondition: "hasIronPipe",
        text: "用铁管顶住门",
        effect: { set : { hasIronPipe: false }, add: { itemCount: -1 } },
        nextScene: "民防设施-进风机房-安全",
      },
      {
        showCondition: "hasBroom",
        text: "用扫把顶住门",
        effect: { set : { hasBroom: false }, add: { itemCount: -1 } },
        nextScene: "民防设施-进风机房-失败",
      },
      {
        showCondition: "hasDiary",
        text: "查看日记本",
        nextScene: "日记本的空白页"
      }
    ]
  },

  "日记本的空白页": {
    image: "images/home/diary-fanRoom.png",
    onEnter: updateTime(1, { add: {turnDiaryPages: 1}}), // 花1分钟翻一页
    text: "你拿出空白的日记本，随便翻开一页，这一页并没有字。",
    choices: [
      {
        text: "继续翻",
        condition: "Math.random() < 0.3 && turnDiaryPages <= 3",
        nextScene: "日记本的提示-打开鼓风机",
        elseScene: "日记本的空白页"
      },
      {
        text: "丢掉不看",
        effect: { set : { hasDiary: false }, add: { itemCount: -1 } },
        nextScene: "民防设施-进风机房"
      }
    ]
  },

  "日记本的提示-打开鼓风机": {
    image: "images/home/diary-fanRoom.png",
    onEnter: { set: {turnDiaryPages: 0}},
    text: "你发现这一页写了一篇日记。\n\
7月14日（或者15日？我已经分不清了）\n\
我被困在这个鬼地方第十四天了。昨天，那群东西撞开了东边的铁门，我只能躲进进风机房。门很厚，暂时还能撑住。但我听见它们在走廊里徘徊，脚步一声接一声，像在数我的呼吸。\n\
我试过撬通风管道，但铁网焊死了。我试过撬通风管道，但铁网焊死了。我试过用电台呼叫，只有持续的沙沙声回应我。食物只剩半包压缩饼干。\n\
该死的，如果我那天早上选择下楼跑个步，就不至于被堵在这个鬼地方一直到现在。\n\
————————————————————————————————————————————————————————————\n\
奇怪的是，今天早上，那些脚步声忽然消失了，只有设施里风扇轰鸣的声音。\n\
我冒险把门开了一条缝，它们正朝东侧走廊聚拢，像被什么东西吸引了。我趁这个机会溜了出去，找到了备用物资室。\n\
为什么它们为什么会突然离开？我只知道东边……是进风机房隔壁的通风井。\n\
走廊边这扇门后面有一条路，连着小区东边的检修出口，我已经不敢在这里多待一秒了，今天天黑前我必须尝试从那里出去。\n\
我没有包，还是别带这本小本子了吧。\
...             \n\
看来，需要用声音把丧尸引走。\n\
你按下墙上的红色按钮，打开进风的风扇。外面的脚步声渐渐消失了",
    choices: [
      {
        text: "继续",
        nextScene: "民防设施-进风机房"
      }
    ]
  },

  "民防设施-进风机房-安全": {
    image: "images/placeholder.png" /* TODO: images/home/CDpassage.png */,
    text: "吁，现在安全了。\n\
你继续沿着通道走，经过了消毒室等房间，终于走了出去。",
    choices: [
      {
        text: "小区东门",
        nextScene: "小区东门"
      }
    ]
  },

  "民防设施-进风机房-失败": {
    image: "images/home/fanRoom-fail.png",
    text: "你成功地顶住了门。\n\
吁，现在安全了。\n\
你望着眼前的幽深走廊，犹豫片刻，向前走去。\n\
突然，你看到身边的黑暗中，出现了2个绿色的亮斑，就像2只萤火虫悬停在空中。\n\
只听嘶的一声，亮斑闪烁起来，像被什么挡住了。你眼前一阵发黑，感到头晕目眩。那双绿色的眼睛，缓缓向你靠近。",
    choices: [
      {
        showCondition: "maskRemainingUses > 0",
        text: "还不戴上你的防毒面具！快跑！",
        nextScene: "小区东门",
        effect: { add: { maskRemainingUses: -1 } }
      }
    ]
  },

  "小区东门": {
    image: timeImage({
      morning: "images/home/小区东门.png",
      evening: "images/home/小区东门-evening.png",
      night: "images/home/小区东门-night.png",
      midnight: "images/home/小区东门-midnight.png"
    }),
    onEnter: { set : { positionAfterOperation: "小区东门-整装待发", currentPlace: "初始小区", currentPos: "东门" } },
    text: "你从民防设施钻了出来，刺眼的阳光让你眯起了眼。身后的铁门因为年久失修，已经锈死，你砰地一脚把它踹上。\n应该不会有什么鬼东西跟上了。\n\
你沿着石板路走到保安亭，那年初的大红灯笼正挂在保安亭的墙上，随风摇曳，沙沙作响。\n\
空中传来几声鸟叫，你抬头，看见珠颈斑鸠滑翔而过，落在马路对面的全家便利店上。\n\
你回头看了一眼小区，那栋你住了七八年的楼，静默地站在那里。\n\
你不会再回去了。\n\
",
    choices: [
      {
        showCondition: "itemCount > 0",
        text: "整理一下物品",
        nextScene: "整理整理",
      },
      {
        text: "继续",
        nextScene: "{positionAfterOperation}"
      }
    ]
  },


  "小区西门": {
    image: timeImage({
      morning: "images/home/小区西门.png",
      evening: "images/home/小区西门-evening.png",
      night: "images/home/小区西门-night.png",
      midnight: "images/home/小区西门-midnight.png"
    }),
    onEnter: updateTime(2, { set : { positionAfterOperation: "小区西门-整装待发", currentPlace: "初始小区", currentPos: "西门" } }),
    text: function(vars) {
      let basicDes = "你来到了小区西门。\n\
推开失灵的感应门。门外是一条空荡荡的街道，几辆歪斜的汽车堵在路中间，车窗碎裂，里面空无一人。\n\
社区图书馆的大楼静静伫立在你的眼前，横幅在空中摇荡。\n\
几片落叶悄然飘过，跌宕着飞向左边的地铁站。\n\
远处有一块路牌，上面写着“东明路”。\n\
除了风声，这里什么声音都没有。\n\
死寂。";
      if(_visit['初遇陈默']) basicDes += "陈默踏过石砖路，向北方走去。“我只能帮你到这里。接下来，你只能靠自己了。”他的话在风中回荡。“\n";
      return basicDes;
    },
    choices: [
      {
        showCondition: "itemCount > 0",
        text: "整理一下物品",
        nextScene: "整理整理",
      },
      {
        text: "继续",
        nextScene: "{positionAfterOperation}"
      }
    ]
  },


  // ========== 记忆闪色测试场景 ==========

  "丧尸袭来": {
    image: "images/zombieWaveSmashYouIntoPieces.png",
    onEnter: initMemoryGame(["红","蓝","绿"], 5),
    text: "丧尸从四面八方朝你涌来！你必须在瞬间记住它们的颜色分布——这将决定你的反击策略。\n集中注意力，仔细看！",
    choices: [
      {
        text: "输入你看到的颜色分布（例如：3红2蓝）",
        input: {
          match: function(vars, input) {
            return normalizeColorAnswer(input) === normalizeColorAnswer(vars._currentAnswer);
          },
          placeholder: "例如：3红2蓝 或 2蓝3红",
          wrongScene: "颜色记错了"
        },
        nextScene: "战斗胜利",
        effect: updateTime(5, { add: { strength: -1 } }),
        timeout: 8000,
        timeoutScene: "颜色记错了"
      }
    ]
  },

  "战斗胜利": {
    image: "images/home/bedroom.png",
    text: "你成功记下了丧尸的颜色分布，制定了精准的反击策略！\n战斗胜利！\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】这是个测试场景，你已经成功验证了记忆闪色机制。</span>",
    choices: [
      {
        text: "返回卧室",
        nextScene: "初始卧室"
      }
    ]
  },

  "颜色记错了": {
    image: "images/zombieKnockYouDown.png",
    text: "你记错了颜色分布，反击策略完全错误——丧尸抓住了你的破绽！\n<span style='color: #ff4444;'>—— 测试失败 ——</span>\n不过别担心，这只是测试，你可以回溯再试一次。",
    choices: [
      {
        text: "返回卧室重新挑战",
        nextScene: "初始卧室"
      }
    ]
  }
});