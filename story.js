// ================= story.js =================

const storyData = {

  // -------- 1. 变量定义（必须放在最前面）--------
  _variables: {
    strength: 4,            // 体力值
    visitExitTimes: 0,        // 访问小区出口次数，达到3自动放行
    // 你可以自由添加其他变量，例如：gold: 0, visitedKitchen: false
  },

  // -------- 2. 场景列表 --------

  // 每个场景都是一个对象，以场景ID为键
  "start": { // 此名字不可更改
    image: "images/home/bedroom.png",
    text: "你是建平中学的毕业生，高考已经结束，日子仿佛被抽去了骨架，软塌塌地摊在七月闷热的空气里。这天早上你醒来时，阳光已经穿过半旧的窗帘，在地板上烙下懒洋洋的光斑。\n\
闹钟显示7:30，如果是在往日，早读已经过去一半了。\n哦，这么算的话，再过半小时，妈妈就买早餐回来了。", 
    /* 玩家可以反复回到此场景，闹钟时间均不变，暗示闹钟早就坏了，而妈妈不会再回来了 */
    // 可选，图片路径
    // 文本中可以用 {变量名} 显示变量
    // 进入场景时自动触发的效果（可选）
    onEnter: {
      // 例如：每次进入卧室都扣5点体力（测试用）
      // add: { strength: -5 }  
    },
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
        // elseScene: "cant_jump" // 如果希望始终显示，跳转失败场景，可以加这个
        // condition: 表示只有在满足条件时才显示，例如：visitExitTimes >= 3
        // effect: 表示点击后触发的效果，例如：add: { visitExitTimes: 1 } // 每次点击增加访问次数1
      },
      {
        text: "拿出床底的手机",
        nextScene: "床底的食物"
      }
    ]
  },

  "卧室": { // 卧室后续回来的场景
    image: "images/home/bedroom.png",
    text: "这是你的卧室，你想干什么呢？", 
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

  "开幕雷击": {
    image: "images/home/enclosure.png",
    text: "你打开房门，一个丧尸冲了进来————剧终\n你觉得为什么游戏叫这个名字？:)"
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
        text: "你要再试一遍吗？",
        nextScene: "start"
      }
    ]
  },

  "床底的食物": {
    image: "images/home/foodUnderBed.png",
    onEnter: {
      add: { strength: 1 },
      min: { strength: 5 } // 体力不能高于5点
    },
    text: "你看了眼床底，手机怎么没了？。这里只有一包方便面。\n这是你两个月前藏的私货，你想起来了。毕业前没来得及在学校食堂消耗掉，所以带回家里了。\n妈妈还要半小时才回来，不如先吃一顿，大不了中午少吃一点",
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
    image: "images/home/clock.png",
    text: "你打不开闹钟，搞不清楚里面有什么东西。也许只是钟坏了，你想。",
    choices: [
      {
        text: "离开房间",
        nextScene: "玄关"
      }
    ]
  },

  "家门外的丧尸": {
    image: "images/home/zombieOutsideHome.png",
    text: "咔哒一声，钥匙插入。你按下把手，拉开家门，外面竟是一只蠢蠢欲动的丧尸！\n\
它加快脚步，向你扑了过来。\n（看到这个游戏的名字，想必你早就料到了这熟悉的剧情。）\n\
你砰的一下摔上房门，门外传来沉重的倒地声，丧尸大抵头部挨了点伤害。",
    choices: [
      {
        text: "开门马上去楼梯间（你不会想和丧尸打架的）",
        nextScene: "家外楼梯间的抉择"
      },
      {
        text: "躲在家里，从门缝看看丧尸走远了没有",
        nextScene: "丧尸的凝视"
      }
    ]
  },

  "家外楼梯间的抉择": {
    //image: "images/staircase.png",
    text: "你跑到楼梯间。丧尸突然闪到了你的身后，你只能快速选择一个楼层离开。",
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
        nextScene: "电梯"
      }
    ]
  },

  "电梯": {
    image: "images/home/电梯.png",
    text: "你躲进了电梯，丧尸没有追上来。你显然不能继续待在你家的2楼，需要赶快选个楼层离开",
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
        text: "返回楼梯间",
        nextScene: "被丧尸扑倒咬死"
      }
    ]
  },

  "被丧尸扑倒咬死": {
    image: "images/home/zombie.png",
    text: "丧尸追上了你，你被咬死了。"
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
        nextScene: "被丧尸扑倒咬死"
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
        condition: "strength >= 1",
        elseScene: "背后的偷袭"
      }
    ]
  },

  "摇睡丧尸": {
    image: "images/home/zombieAwake.png",
    text: "你用更大的力气摇了摇ta，连帽衫的帽子掉了。你惊呆了，这是一只丧尸！\n\
它突然抬起头来，眼睛瞪着你，向你扑来。\n\
达成结局：不要试图叫醒一个装睡的入"
  },

  "反杀老6": {
    image: "images/home/killSix.png",
    text: "你对它丧失了兴趣，转身离开。\n\
只听得背后传来木头长椅的嘎吱一响，背后阴风袭来，你吓了一大跳，往后飞踹一脚，把什么东西踹飞了出去。\n\
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
    text: "你对ta丧失了兴趣，转身离开。\n\
只听得背后传来木头长椅的嘎吱一响，背后阴风袭来。你只感觉脖颈一痛，便失去了知觉。"
  },

  "西出口-丧尸堵路": {
    image: "images/home/zombie.png",
    text: "你走在前往西出口的路上。这里你轻车熟路，因为平时雨天你都会走这条路回家。\n\
突然，一只丧尸从一个柱子后面闪了出来，你无法继续前进。",
    OnEnter: { add: { visitExitTimes: 1 } },
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
    text: "丧尸向你袭来，你要攻击它哪里？",
    choices: [
      {
        text: "脚",
        nextScene: "嘎吱嘎吱",
        condition: "strength >= 1",
        elseScene: "被丧尸扑倒咬死"
      },
      {
        text: "头",
        nextScene: "KO丧尸",
        condition: "strength >= 1",
        elseScene: "被丧尸扑倒咬死"
      },
      {
        text: "身体",
        nextScene: "击退丧尸",
        condition: "strength >= 2",
        elseScene: "被丧尸扑倒咬死"
      }
    ]
  },

  "嘎吱嘎吱": {
    image: "images/home/zombie.png",
    text: "你一脚踢出，被丧尸一口咬住，你被咬死了。"
  },

  "KO丧尸": {
    image: "images/home/zombie.png",
    text: "你一拳挥出，将丧尸击倒，又补了几脚，它不动了。看来一时半会儿不会有问题了。",
    OnEnter: { add: { strength: -1 } },
    choices: [
      {
        text: "继续前进",
        condition: "visitExitTimes >= 2",
        nextScene: "西出口",
        elseScene: "西出口-丧尸堵路"
      }
    ]
  },

  "击退丧尸": {
    image: "images/home/zombie.png",
    text: "你一拳打在丧尸胸口，将它击退，它踉跄几步，眼神凶狠，加快速度向你扑来",
    OnEnter: { add: { strength: -2 } },
    choices: [
      {
        text: "快跑！",
        condition: "visitExitTimes >= 2",
        nextScene: "东出口",
        elseScene: "防爆门"
      }
    ]
  },

  "防爆门": {
    image: "images/home/防爆门.png",
    text: "你仓皇逃窜，眼前是一道防爆门，关上它就能挡住丧尸！",
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
    image: "images/home/zombie.png",
    text: "在丧尸冲过来时，你侧身把防爆门关上了，它的半只手臂夹在了中间，却仍不断挥舞着。你向右旋转圆形把手，防爆门锁死，成功地用防爆门把将丧尸夹扁。",
    choices: [
      {
        text: "继续前进",
        condition: "visitExitTimes >= 2",
        nextScene: "西出口",
        elseScene: "西出口-丧尸堵路"
      }
    ]
  },

  "西出口": {
    image: "images/home/exit.png",
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
        condition: "visitExitTimes >= 2",
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
    image: "images/home/zombie.png",
    OnEnter: { add: { visitExitTimes: 1 } },
    text: "东出口被一辆报废面包车斜卡着，四个轮胎全瘪，活像一只死透的甲虫。你正琢磨怎么翻过去，身后传来熟悉的拖步声，一只丧尸跟了上来",
    choices: [
      {
        text: "战斗！",
        nextScene: "地下车库的丧尸"
      }
    ]
  },

  "东出口": {
    image: "images/home/exit.png",
    text: "你来到了东出口。不幸的是，地下车库的门关上了，你无法打开。右边的墙上有一个按钮，左边有一扇铁门，里面黑漆漆的。",
    choices: [
      {
        text: "按下按钮",
        nextScene: "没用的按钮"
      },
      {
        text: "打开铁门",
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
        nextScene: "被丧尸扑倒咬死"
      }
    ]
  },

  "民防设施-等候区": {
    image: "images/home/doorOpen.png",
    text: "你打开铁门，进入了一个小房间。这个房间空无一人，只有一张桌子和墙上的一些告示。",
    choices: [
      {
        text: "查看桌子",
        nextScene: "没用的桌子"
      },
      {
        text: "阅读墙上的告示",
        nextScene: "墙上的民防告示"
      },
      {
        text: "去相邻的小房间看看",
        nextScene: "民防设施-楼梯间"
      }
    ]
  }




};
