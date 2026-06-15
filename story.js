// ================= story.js =================

const storyData = {

  // -------- 1. 变量定义（必须放在最前面）--------
  _variables: {
    strength: 4,            // 体力值
    visitExitTimes: 0,        // 访问小区出口次数，达到2自动放行
    foodUnderBed: true,      // 底下是否有食物，初始为true
    visitWaitingRoomTimes: 0, // 访问等候区次数，达到3丧尸会出现
    repeatedClickTimes: 0,    // 点击重复次数，可以用来设置连点环节
    itemCount: 0,             // 物品数量
    bagVolume: 3,             // 背包容量（最大物品数量）
    hasBroom:  false,          // 是否有扫帚
    hasDiary:  false,          // 是否有日记本
    hasTorch:  false,          // 是否有手电筒
    hasBike:   false,          // 是否有自行车
    hasKey:    false,          // 是否有钥匙
    hasMask:   false,          // 是否有防毒面具
    hasIronPipe: false,        // 是否有铁管
  },

  // -------- 2. 全局触发器和屏幕特效 --------
  _globalTriggers: [
      {
        condition: "strength <= 0",       // 体力归零
        targetScene: "体力耗尽猝死",
        priority: 1
      },
      {
        condition: "itemCount > bagVolume", 
        // 玩家最多携带[背包容量]件物品，后续可以加更多东西
        targetScene: "物品太多啦",
        priority: 2,
        backtrack: "回溯"
      },
      // 未来可继续添加
      // {
      //   condition: "sanity <= 0",
      //   targetScene: "精神崩溃发疯",
      //   priority: 2
      // }
  ],
  // -------- 屏幕特效（基于状态的视觉反馈）--------
  _screenEffects: [
      {
          condition: "strength == 2",
          className: "vignette-warning"
      },
      {
          condition: "strength <= 1",
          className: "vignette-danger"
      }
      // 未来可扩展：
      // { condition: "sanity <= 2", className: "screen-wobble" },
      // { condition: "poisoned",    className: "screen-green-tint" },
  ],


  // -------- 3. 场景列表 --------

  // 每个场景都是一个对象，以场景ID为键

  // 全局触发节点
  "体力耗尽猝死": {
      image: "images/home/tooWeak.png",  
      text: "你的体力彻底耗尽……眼前一黑，倒在了冰冷的地面上。\n再也没有醒来。",
      style: "color: #ff4444; font-weight: bold;"
  },
  "物品太多啦": {
      image: "images/home/tooMany.png",  
      text: "你携带的物品太多啦，不能拿啦。你可以选择撤回哦~",
      style: "color: #ff4444; font-weight: bold;"
  },

  // 正常的剧情节点
  "start": { // 此名字不可更改, 开始场景
    image: "images/gameStart.jpg", // 开始场景图片，写着“尸潮笔记”
    // 可选，图片路径
    text: "",
    // 文本中可以用 {变量名} 显示变量
    onEnter: {
    // 进入场景时自动触发的效果（可选）
      // 例如：每次进入卧室都扣5点体力（测试用）
      // add: { strength: -5 }  
    },
    choices: [
      {
        text: "开始游戏",
        nextScene: "初始卧室"
        // elseScene: "cant_jump" // 如果希望始终显示，跳转失败场景，可以加这个
        // condition: 表示只有在满足条件时才显示，例如：visitExitTimes >= 3
        // effect: 表示点击后触发的效果，例如：add: { visitExitTimes: 1 } // 每次点击增加访问次数1
      }
    ]
  },


  "初始卧室": {
    image: "images/home/bedroom.png",
    text: "你是建平中学的毕业生，高考已经结束，日子仿佛被抽去了骨架，软塌塌地摊在七月闷热的空气里。这天早上你醒来时，阳光已经穿过半旧的窗帘，在地板上烙下懒洋洋的光斑。<span style='font-size: 12px;'>请往下滑动哦</span>\n\
闹钟显示7:30，如果是在往日，早读已经过去一半了。\n哦，这么算的话，再过半小时，妈妈就买早餐回来了。", 
    /* 玩家可以反复回到此场景，闹钟时间均不变，暗示闹钟早就坏了，而妈妈不会再回来了 */
    choices: [
      {
        text: "起床散步去喽",
        nextScene: "开幕雷击"
      },
      {
        text: "推开窗户",
        nextScene: "窗外的风景"
      },
      {
        text: "玩弄一下闹钟",
        nextScene: "闹钟"
      },
      {
        text: "拿出床底的手机",
        nextScene: "床底的食物"
      }
    ]
  },

  "卧室": { // 卧室后续回来的场景
    image: "images/home/bedroom.png",
    text: "", 
    choices: [
      {
        text: "下楼散步",
        nextScene: "开幕雷击"
      },
      {
        text: "看看窗外",
        nextScene: "窗外的风景"
      },
      {
        text: "玩弄一下闹钟",
        nextScene: "闹钟"
      },
      {
        text: "看看床底",
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
        nextScene: "卧室"
      }
    ]
  },

  "开幕雷击": {
    image: "images/home/zombieKnockYouDown.png",
    text: "你打开房门，一个丧尸冲了进来————剧终\n你猜为什么游戏叫这个名字？:)"
  },

  "玄关": {
    image: "images/home/foyer.png",
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
        nextScene: "卧室"
      }
    ]
  },

  // 示例2：内联 HTML，部分文字不同颜色/大小
  "丧尸的凝视": {
    image: "images/home/eyeUnderDoor.png",
    style: "font-size: 19px;",                      // ← 整体字号
    text: "你俯下身，侧脸几乎贴着冰凉的瓷砖……\
    <br><br><div style='color: rgba(8, 243, 47, 1); font-weight: bold; font-size: 22px;'>一只闪烁着绿光的眼睛正盯着你</div>\
    <br><br><div style='color: #ff4444; font-weight: bold; font-size: 18px;'>短暂的死寂之后，整扇门猛地向内凸起——它进来了。</div>",
  },

  "窗外的风景": {
    image: "images/home/overlookNeighboorhood.png",
    text: "你走到窗前。窗外是小区的风景，看起来还不错。你觉得可以下楼看看？",
    choices: [
      {
        text: "出门下楼去",
        nextScene: "玄关"
      },
      {
        text: "自由落体才是最快的",
        nextScene: "自尽"
      }
    ]
  },

  "自尽": {
    image: "images/home/suicide.png",
    text: "最明智的选择，尸潮什么的，与我无关——————————————",
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
      add: { strength: 1 }
    },
    text: "你看了眼床底，手机怎么没了？这里只有一包方便面。\n这是你两个月前藏的私货，你想起来了。毕业前没来得及在学校食堂消耗掉，所以带回家里了。\n\
妈妈还要半小时才回来，不如先吃一顿，大不了中午少吃一点。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复一点体力，当前体力：{strength}。</span>",
    choices: [
      {
        text: "方便面真好吃",
        nextScene: "卧室"
      }
    ]
  },

  "闹钟": {
    image: "images/home/clock.png",
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
    image: "images/home/clockInside.png",
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
    text: "咔哒一声，钥匙插入。你按下把手，拉开家门，外面竟是一只蠢蠢欲动的丧尸！",
    qte: {
      timeout: 5000,              // 5 秒（这次选错就是即死结局，没什么决策深度，所以时间紧）
      onTimeout: "被丧尸扑倒咬死"  // 超时则被咬死
    },
    onEnter: {
      shake: true  // 场景抖动
    },
    choices: [
      {
        text: "一个闪身冲向楼梯间",
        nextScene: "家外楼梯间的抉择"
      },
      {
        text: "躲在家里，从门缝看",
        nextScene: "丧尸的凝视"
      }
    ]
  },

  "丧尸破门而入": {
    image: "images/home/zombieBreakDoor.png",
    text: "突然，丧尸猛地撞开了门，你脑袋挨了重重一击，晕了过去。"
  },

  "家外楼梯间的抉择": {
    //image: "images/staircase.png",
    text: "你跑到楼梯间。丧尸突然闪到了你的身后！\n\
你只能快速选择一个楼层离开，或者躲起来，祈祷丧尸不会追你",
    qte: {
      timeout: 10000,              // 10 秒
      hidden: true,
      onTimeout: "被丧尸扑倒咬死"  // 超时则被咬死
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
    qte: {
      timeout: 15000,              // 15 秒
      onTimeout: "电梯门开了"  // 超时则被咬死
    },
    choices: [ // 选择楼层
      {
        text: "F3",
        nextScene: "3楼-安全"
      },
      {
        text: "F1",
        nextScene: "1楼"
      },
      {
        text: "B1",
        nextScene: "B1"
      }
    ]
  },  

  "电梯门开了": {
    image: "images/home/电梯.png",
    text: "电梯门突然开了，丧尸冲进来咬死了你。\n\
想 必 你 下 次 会 更 加 果 断 吧。"
  },

  "3楼-安全": {
    image: "images/home/3rdFloor.png",
    text: "你走到3楼。这里不知何时已经堆满了家具，你无法进入。",
    choices: [
      {
        text: "返回楼梯间",
        nextScene: "家外楼梯间的抉择"
      }
    ]

  },

  "3楼": {
    image: "images/home/3rdFloor.png",
    text: "你走到3楼。这里不知何时已经堆满了家具，你无法进入。",
    choices: [
      {
        text: "躲在家具里",
        nextScene: "来自丧尸的惊吓"
      }
    ]
  },

  "来自丧尸的惊吓": {
    image: "images/home/zombieScare.png",
    text: "突然，一只丧尸不知从什么地方窜了出来，向你扑来！",
    qte: {
      timeout: "5000 - repeatedClickTimes * 2000 - foodUnderBed * 999", // 5 秒，但每次点击减少2秒
      onTimeout: "反应太慢被咬死了"  // 超时则被咬死
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

  "反应太慢被咬死了": {
    image: "images/home/zombieKnockYouDown.png",
    text: "丧尸冲了上来，把你扑在地上。没来得及反应，你就被咬死了。",
    choices: [
      {
        text: "重来！这次不算！",
        nextScene: "初始卧室"
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
        nextScene: "小区西门"
      },
      {
        text: "不跟着他",
        nextScene: "被丧尸扑倒咬死"
      }
    ]
  },

  "被丧尸扑倒咬死": {
    image: "images/home/zombieKnockYouDown.png",
    text: "丧尸冲了上来，猛地把你扑倒在地。没来得及反应，你就被咬死了。"
  },// 会自动给出重新开始按钮

  "1楼": {
    image: "images/home/1楼.png",
    text: "你到了一楼大厅。一群丧尸正在开party，一看见你就<em><span style='color:red;'>非常热情</span></em>地围拢过来。"
  },

  "B1": {
    image: "images/home/B1.png",
    text: "你来到了地下车库。",
    choices: [
      {
        text: "返回楼梯间",
        nextScene: "来自丧尸的惊吓"
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
// 西出口不是西门，西出口是地下车库的出口
        elseScene: "西出口-丧尸堵路"
      },
      {
        text: "往左走",
        nextScene: "东出口",
        condition: "visitExitTimes >= 2",
        elseScene: "东出口-废车堵路"
      },
      {
        text: "查看墙上的痕迹",
        nextScene: "墙上的痕迹"
      }
    ]
  },

  "B1-2nd": {
    image: "images/home/B1-2nd.png",
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
    image: "images/home/1楼.png",
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
    text: "你走在小区的小道上，曾经你在这里练习足球，可以看到很多老年人带着孩子玩。现在，不会再有了。\n\
你看到有一个人坐在椅子上，像是睡着了.\n\
还能这么悠闲？",
//开party的丧尸不小心点燃了什么易燃物体把自己烧死了
    choices: [
      {
        text: "看看那个人",
        nextScene: "装睡的丧尸"
      },
      {
        text: "去小区东门",
        nextScene: "小区东门"
      },
      {
        text: "去小区西门",
        nextScene: "小区西门"
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
        nextScene: "摇睡丧尸"
      },
      {
        text: "不管它，不如先躲回家",
        nextScene: "反杀老6",
        condition: "strength > 1",
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
    image: "images/home/killSix.png",
    text: "你对它丧失了兴趣，转身离开。\n\
只听得背后传来木头长椅的嘎吱一响，背后阴风袭来，你吓了一大跳，往后<span style = 'font-weight: bold;'>飞踹一脚</span>，把什么东西踹飞了出去。\n\
回头一看，正是椅子上的那个睡神，它竟是一只丧尸！\n\
趁着它暂时晕过去了，你得赶紧离开了。",
    choices: [
      {
        text: "去东门",
        nextScene: "小区东门",
      },
      {
        text: "去西门",
        nextScene: "小区西门",
      }
    ]
  },

  "背后的偷袭": {
    image: "images/home/attackBehind.png",
    onEnter: {shake: true},
    text: "你对ta丧失了兴趣，转身离开。\n\
只听得背后传来木头长椅的嘎吱一响，背后阴风袭来。你只感觉脖颈一痛，便失去了知觉。"
  },

  "西出口-丧尸堵路": {
    image: "images/home/zombie.png",
    text: "你走在前往西出口的路上。这里你轻车熟路，因为平时雨天你都会走这条路回家。\n\
突然，一只丧尸从一个柱子后面闪了出来，你无法继续前进。",
    qte: {
      timeout: 3000,              // 3秒
      onTimeout: "被丧尸扑倒咬死"  // 超时则被咬死
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
    image: "images/home/zombie.png",
    onEnter: {shake: true},
    text: "丧尸向你袭来，你要攻击它哪里？",
    qte: {
      timeout: 2000,              // 2秒
      onTimeout: "被丧尸扑倒咬死"  // 超时则被咬死
    },
    choices: [
      {
        text: "脚",
        nextScene: "嘎吱嘎吱",
        condition: "strength > 1",
        elseScene: "被丧尸扑倒咬死"
      },
      {
        text: "头",
        nextScene: "KO丧尸",
        condition: "strength > 1",
        elseScene: "被丧尸扑倒咬死"
      },
      {
        text: "身体",
        nextScene: "击退丧尸",
        condition: "strength > 2",
        elseScene: "被丧尸扑倒咬死"
      }
    ]
  },

  "嘎吱嘎吱": {
    image: "images/home/zombie.png",
    onEnter: {shake: true},
    text: "你一脚踢出，被丧尸一口咬住，你被咬死了。"
  },

  "KO丧尸": {
    image: "images/home/KOzombie.png",
    text: "你一拳挥出，将丧尸击倒，又补了几脚，它不动了。看来一时半会儿不会有问题了。",
    onEnter: { add: { strength: -1 } },
    choices: [
      {
        text: "还不快走",
        nextScene: "陌生的岔路口"
      }
    ]
  },

  "陌生的岔路口": {
    image: "images/home/crossing.png",
    text: "现在你正处于一个陌生的岔路口，该往哪里走呢？",
    choices: [
      {
        text: "直走到底",
        condition: "visitExitTimes > 2",
        nextScene: "西出口",
        elseScene: "西出口-丧尸堵路"
      },
      {
        text: "前面右转",
        nextScene: "地下非机动车停靠区"
      }
    ]
  },

  "地下非机动车停靠区": {
    image: "images/home/nonMotorized.png",
    text: "你来到了地下非机动车停靠区，这里有不少自行车和电瓶车。",
    choices: [
      {
        text: "继续前进",
        condition: "visitExitTimes > 2",
        nextScene: "西出口",
        elseScene: "西出口-丧尸堵路"
      },
      {
        text: "骑上一辆自行车",
        nextScene: "车上锁了"
      },
      {
        text: "骑上一辆电瓶车",
        condition: "Math.random() < 0.3 || hasKey", // 30%概率解锁一辆电瓶车
        nextScene: "骑车去西出口",
        elseScene: "车上锁了"
      }
    ]
  },

  "车上锁了" : {
    image: "images/home/lockedBike.png",
    text: "哎呀，这车上有锁，看来你是不能白嫖了。",
    choices: [
      {
        text: "四处看看",
        nextScene: "地下非机动车停靠区"
      }
    ]
  },

  "骑车去西出口": {
    image: "images/home/cycleToExit.png",
    onEnter: { hasBike: true, add: { itemCount: 1 } },
    text: "你的运气很好，这辆车没锁。跑了半天的你悠哉游哉骑着车，向西出口前进。",
    choices: [
      {
        text: "继续前进",
        nextScene: "西出口" // 骑车可以快速解锁西出口
      }
    ]
  },

  "击退丧尸": {
    image: "images/home/beatZombie.png",
    text: "你一拳打在丧尸胸口，将它击退，它踉跄几步，眼神凶狠，加快速度向你扑来",
    onEnter: { add: { strength: -2 } },
    choices: [
      {
        text: "快跑！",
        condition: "visitExitTimes > 2",
        nextScene: "东出口",
        elseScene: "防爆门"
      }
    ]
  },

  "防爆门": {
    image: "images/home/防爆门.png",
    text: "你仓皇逃窜，眼前是一道防爆门，关上它就能挡住丧尸！",
    qte: {
      timeout: 3000,              // 3秒
      onTimeout: "被丧尸扑倒咬死"  // 超时则被咬死
    },
    choices: [
      {
        text: "把手左旋",
        nextScene: "被丧尸扑倒咬死"
      },
      {
        text: "把手右旋",
        nextScene: "丧尸被防爆门夹扁"
      }
    ]
  },

  "丧尸被防爆门夹扁": {
    image: "images/home/squeezeZombie.png",
    onEnter: { add: { strength: -1 } },
    text: "在丧尸冲过来时，你侧身把防爆门关上了，它的半只手臂夹在了中间，却仍不断挥舞着。\n\
你向右旋转圆形把手，防爆门锁死，成功地用防爆门把将丧尸夹扁。",
    choices: [
      {
        text: "继续前进",
        condition: "visitExitTimes > 2",
        nextScene: "西出口",
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
        nextScene: "小区西门"
      }
    ]
  },

  "墙上的痕迹": {
    image: "images/home/wallAd.png",
    text: "墙上贴满了广告：公积金贷款、下水道维修、黄色小卡片，中间还有张寻人启事，失踪者叫“林奇”。撕得零零碎碎的，更像是谁的收藏品展览。",
    choices: [
      {
        text: "继续前进",
        nextScene: "东出口",
        condition: "visitExitTimes > 2",
        elseScene: "东出口-废车堵路"
      }
    ]
  },

  "柱子上的纸张": {
    image: "images/home/columnMap.png",
    /* 地图上写道：如果你看到这行字，你应该去东出口，西出口堵上了 */
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
    choices: [
      {
        showCondition: "!hasDiary && !hasTorch",
        text: "查看桌子",
        nextScene: "等候区的桌子"
      },
      {
        showCondition: "!hasBroom",
        text: "拿起扫帚",
        nextScene: "等候区的扫帚"
      },
      {
        showCondition: "!hasKey",
        text: "阅读墙上的告示",
        nextScene: "墙上的民防告示"
      },
      {
        text: "往走廊深处走",
        nextScene: "民防设施-楼梯间"
      },
      {
        showCondition: "visitWaitingRoomTimes <= 1",
        text: "回头离开",
        nextScene: "陌生的岔路口"
      }
    ]
  },

  "等候区的桌子": {
    image: "images/home/table.png",
    text: "你走向桌子，这里叠着几本小册子，有检修报告、民防守则、报纸等。这里看起来平时是有人的。\n\
你仔细翻看了一下，发现其中夹着一本日记本。打开一看，里面是空白的。",
    onEnter: { add: { visitWaitingRoomTimes: 1 } },
    choices: [
      {
        text: "拿上日记本",
        nextScene: "民防设施-等候区",
        condition: "visitWaitingRoomTimes <= 2", 
        // 如果在等候区决策过多次数，丧尸就会进来（不再重复声明）
        effect: { set: { hasDiary: true }, add: { itemCount: 1 } },
        elseScene: "丧尸破门而入",
      },
      {
        text: "拉开抽屉",
        nextScene: "抽屉里的手电筒",
        condition: "visitWaitingRoomTimes <= 2", 
        elseScene: "丧尸破门而入",
      }
    ]
  },

  "抽屉里的手电筒": {
    image: "images/home/light.png",
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
        condition: "visitWaitingRoomTimes <= 2", 
        effect: { set: { hasBroom: true }, add: { itemCount: 1 } },
        elseScene: "丧尸破门而入",
      },
      {
        text: "不拿扫帚",
        nextScene: "民防设施-等候区",
        condition: "visitWaitingRoomTimes <= 2", 
        elseScene: "丧尸破门而入",
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
    image: "images/home/key.png",
    onEnter: { set: { hasKey: true }, add: { itemCount: 1 } },
    text: "你揭下了告示纸，后面掉出来一个小钥匙，像是电瓶车的车钥匙。",
    choices: [
      {
        text: "继续",
        nextScene: "民防设施-等候区"
      }
    ]
  },

  "民防设施-紧急出口": {
    image: "images/home/stairs.png",
    text: "你往走廊深处走，发现了一个楼梯间。\n\
<span style='color:red'>突然，你听到砰的一声，进来的那扇铁门被硬生生撞开了，一个魁梧的丧尸钻了进来。</span>\n\
你要怎么办？",
    choices: [
      {
        text: "继续前进找紧急出口",
        nextScene: "紧急出口"
      },
      {
        text: "上楼梯",
        nextScene: "民防设施-物资区"
      }
    ]
  },

  "紧急出口": {
    image: "images/home/exit.png",
    text: "你来到了紧急出口，而丧尸已经近在眼前",
    choices: [
      {
        text: "战斗",
        nextScene: "被丧尸扑倒咬死"
      },
      {
        text: "开门冲出去",
        condition: "Math.random() < 0.5", // 50%的概率开门失败
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
    image: "images/home/po.png",
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
        nextScene: "民防设施-等候区"
      },
      {
        text: "再等一会儿",
        nextScene: "初遇毒气型丧尸"
      }
    ]
  },

  "初遇毒气型丧尸": {
    image: "images/home/gasZombie.jpg",
    text: "你等了一会儿，没有声音了。           \n\
突然，你看到身边的黑暗中，出现了2个绿色的亮斑，就像2只萤火虫悬停在空中。\n\
只听嘶的一声，亮斑闪烁起来，像被什么挡住了。你闻到一股刺鼻的气味，晕了过去"
  },

  "民防设施-物资区": {
    image: "images/home/material.png",
    text: "你来到了物资区。这里对着很多纸箱子，但不少都是空的。你在其中找到了一个老式防毒面具。",
    choices: [
      {
        text: "拿上防毒面具",
        nextScene: "物资区的丧尸",
        effect: { set: { hasMask: true }, add: { itemCount: 1 } }
      },
      {
        text: "不拿防毒面具",
        nextScene: "物资区的丧尸"
      }
    ]
  },

  "物资区的丧尸": {
    image: "images/home/twoZombies.png",
    text: "你抬头一看，两只丧尸一前一后从杂物堆里走了出来，对你虎视眈虎",
    qte: {
      timeout: 5000,
      hidden: true,
      onTimeout: "物资区的丧尸",
    },
    onEnter: { shake: true },
    choices: [
      {
        text: "先揍前面那个",
        nextScene: "被丧尸扑倒咬死"
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
        nextScene: "民防设施-等候区"
      }
    ]
  },

  "民防设施-通风管道": {
    image: "images/home/vent.png",
    text: "你一脚踹开箱子，这里什么都没有，但是有个通风管道的格栅，看起来不太牢靠。",
    choices: [
      {
        text: "掰开格栅进去",
        nextScene: "民防设施-通风管道的抉择"
      },
      {
        text: "继续找武器",
        nextScene: "被丧尸扑倒咬死"
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
    image: "images/home/deadEnd.png",
    text: "你走错了路，前面是死路一条。\n\
丧尸的那绿色的眼睛是你最后的记忆。"
  },

  "拳打脚踢": {
    image: "images/home/1v2.png",
    onEnter: { add: { strength: -1 } },
    text: "你率先发动了攻击。\n\
前面那只丧尸向你缓缓走来，你一个滑铲闪过去，冲向后面那只愣神的丧尸，一拳正中脑门。\n\
丧尸一个踉跄将要倒地，被你擒住手臂，一个过肩摔，把它重重砸在它的同伙上。\n\
两只丧尸缓缓爬起来，眼睛似乎在燃烧。你决定？",
    choices: [
      {
        text: "躲进旁边的房间",
        nextScene: "民防设施-生活区"
      },
      {
        text: "继续战斗",
        nextScene: "拳打脚踢2"
      }
    ]
  },

  "拳打脚踢2": {
    image: "images/home/1v2.png",
    onEnter: { add: { strength: -1 } },
    text: "你从墙上掰下来一根长长的铁管，狠狠砸在丧尸们的脑袋上。\n\
咚！咚！        \n\
嗯，现在不会有问题了。",
    choices: [
      {
        text: "进入旁边的房间",
        condition: "itemCount < bagVolume",
        nextScene: "民防设施-进风机房",
        effect: { set : { hasIronPipe: true }, add: { itemCount: 1 } }, // 如果物品还够放，那就拿上铁管
        elseScene: "民防设施-进风机房"
      }
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
        nextScene: "丧尸破门而入"
      },
      {
        showCondition: "hasIronPipe",
        text: "用铁管顶住门",
        condition: "hasTorch",
        nextScene: "民防设施-进风机房-安全",
        elseScene: "民防设施-进风机房-失败"
      },
      {
        showCondition: "hasBroom",
        text: "用扫把顶住门",
        condition: "hasTorch",
        nextScene: "民防设施-进风机房-安全",
        elseScene: "民防设施-进风机房-失败"
      }
    ]
  },

  "民防设施-进风机房-安全": {
    image: "images/home/fanRoom.png",
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
    image: "images/home/fanRoom.png",
    text: "你成功地顶住了门。\n\
吁，现在安全了。\n\
你望着眼前的幽深走廊，犹豫片刻，向前走去。\n\
突然，你看到身边的黑暗中，出现了2个绿色的亮斑，就像2只萤火虫悬停在空中。\n\
只听嘶的一声，亮斑闪烁起来，像被什么挡住了。你闻到一股刺鼻的气味，晕了过去。",
    choices: [
      {
        showCondition: "hasMask",
        text: "还不戴上你的防毒面具！",
        nextScene: "民防设施-物资区-安全"
      }
    ]
  },

  "小区东门": {
    image: "images/home/eastGate.png",
    text: "你来到了小区东门。\n\
"
  },

  "小区西门": {
    image: "images/home/westGate.png",
    text: "你来到了小区西门。\n\
"
  }


};
