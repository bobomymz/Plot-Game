// ========== 新达汇·B1地下停车场 ==========
// 8区域网格探索，三辆车找钥匙，操作计数驱赶机制
// 核心变量：_garageOps（操作次数，≥3预警≥5驱逐）
// 核心变量：_wiredCorrectly（是否恢复供电）

Object.assign(storyData, {

  // ==================== 入口区 ====================
  "新达汇-B1停车场A区": {
    image: "images/xindahui/b1ParkingA.png",
    onEnter: { set: { currentPlace: "新达汇", currentPos: "地下车库" } },
    text: "你来到停车场A区。这是离走廊最近的一片区域，头顶还有几盏灯亮着，昏黄的光勉强勾勒出停车位的轮廓。\n前方一走下去就是主通道，两侧延伸入黑暗中——左边隐约能看到一些车辆轮廓，右边拐过去似乎是一个角落。",
    choices: [
      { text: "沿着主通道往前走", nextScene: "新达汇-B1停车场B区", effect: updateTime(2) },
      { text: "左拐进西侧通道", nextScene: "新达汇-B1停车场G区", effect: updateTime(2) },
      { text: "右拐到拐角处看看", nextScene: "新达汇-B1停车场H区", effect: updateTime(1) },
      { text: "返回B1走廊", nextScene: "新达汇-B1走廊", effect: updateTime(2) }
    ]
  },

  // ==================== 主通道（中枢） ====================
  "新达汇-B1停车场B区": {
    image: "images/xindahui/b1ParkingB.png",
    text: function(vars) {
      var desc = "你站在停车场主通道的中段。这里几乎没有光线，只有远处入口区的灯光在墙壁上投下一层模糊的轮廓。";
      if (vars._wiredCorrectly) {
        desc = "灯已经亮了。整个B区被暖黄色的灯光照亮，视野一览无余。你可以看到各个方向通向哪里。";
      } else if (vars.hasTorch) {
        desc += "\n手电筒的光束劈开黑暗，让你能看清四周——前方通向更深处，左右各有岔路。";
      } else {
        desc += "\n你只能靠手机的微弱光线和摸索前进。前方是一条黑暗的通道，左侧有一扇防火门的轮廓，右侧隐约有一条岔路。";
      }
      return desc;
    },
    choices: [
      { text: "往前走——通到更深处", nextScene: "新达汇-B1停车场F区", effect: updateTime(2) },
      { text: "左前方有扇防火门", nextScene: "新达汇-B1停车场C区", effect: updateTime(2) },
      { text: "右前方的通道", nextScene: "新达汇-B1停车场E区", effect: updateTime(2) },
      { text: "往回走到A区", nextScene: "新达汇-B1停车场A区", effect: updateTime(2) }
    ]
  },

  // ==================== C区 · 配电室 ====================
  "新达汇-B1停车场C区": {
    image: "images/xindahui/parkingC.png",
    text: function(vars) {
      if (vars._wiredCorrectly) return "配电室的灯亮着。墙上的配电箱面板已经合上了——几根重新接好的电线整齐地排列着。没什么需要再做的了。";
      return "你穿过防火门，走进停车场附属的配电室。墙上的配电箱面板掉了一半，几根不同颜色的电线从接口处松脱，垂落在外面。\n如果你能把它们重新接好，应该能恢复这一片的照明。";
    },
    choices: [
      {
        text: "试着把电线接回去",
        nextScene: "新达汇-B1停车场-接线",
        effect: updateTime(2),
        showCondition: "!_wiredCorrectly"
      },
      { text: "走下三级台阶到旧区", nextScene: "新达汇-B1停车场D区", effect: updateTime(1) },
      { text: "退回B区主通道", nextScene: "新达汇-B1停车场B区", effect: updateTime(1) }
    ]
  },

  // ==================== 接线谜题 ====================
  "新达汇-B1停车场-接线": {
    image: "images/xindahui/powerPanel.png",
    onEnter: { add: { _garageOps: 1 } },
    text: function(vars) {
      var desc = "配电箱里的线头脱落了好几根。你凑近一看——所有电线的外皮都是黑色的，没有颜色标记。\n配电箱盖板内侧贴着一张接线图，但被灰尘和油污盖住了大半。";
      if (vars.hasTorch) {
        desc += "\n\n你打着手电筒，仔细擦掉了盖板上的污渍。接线图清晰地显示着每组线的接口位置——虽然电线没颜色，但图纸标得很清楚。你知道了该怎么接。";
      } else {
        desc += "\n\n没有光，你只能借着手机屏微弱的亮光辨认图纸。大部分细节都看不清——你只能凭感觉试试了。";
      }
      return desc;
    },
    choices: [
      {
        text: "按图纸指示把线接好——推上电闸",
        nextScene: "新达汇-B1停车场-接线成功",
        effect: updateTime(1),
        showCondition: "hasTorch"
      },
      {
        text: "凭感觉把几根线接在一起",
        nextScene: function() { return Math.random() < 0.3 ? '新达汇-B1停车场-接线成功' : '新达汇-B1停车场-接线失败'; },
        effect: updateTime(2),
        showCondition: "!hasTorch"
      },
      { text: "算了，不接", nextScene: "新达汇-B1停车场C区" }
    ]
  },

  "新达汇-B1停车场-接线成功": {
    image: "images/xindahui/powerPanel.png",
    onEnter: { set: { _wiredCorrectly: true } },
    text: function(vars) {
      if (vars._powerOut) return "你推上电闸。灯管闪了两下——然后灭了。配电箱深处传来一声低沉的嗡鸣，但什么也没有发生。总闸没电，你这里的电闸推上去也没用。";
      return "你推上电闸。头顶的灯管闪了几下，发出一阵嗡嗡声——然后亮了。暖黄色的灯光驱散了整个B区的黑暗。\n你终于能看清周围的全貌了。";
    },
    choices: [
      { text: "返回C区", nextScene: "新达汇-B1停车场C区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-接线失败": {
    image: "images/xindahui/powerPanel.png",
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你把线接上了，但推上电闸的瞬间——啪！一阵火花闪过，灯没亮。你接错了。\n短路的声音在空旷的停车场里回荡……肯定引起了什么东西的注意。你得小心了。",
    choices: [
      { text: "再试一次", nextScene: "新达汇-B1停车场-接线", effect: updateTime(2) },
      { text: "算了，不接", nextScene: "新达汇-B1停车场C区" }
    ]
  },

  // ==================== D区 · 排水沟（环境叙事） ====================
  "新达汇-B1停车场D区": {
    image: "images/xindahui/parkingD.png",
    text: "你走下几级台阶，来到停车场旧区。地面比上面低了一截，空气中弥漫着一股潮湿的泥土味。\n地面上有一排排水沟的铁栅栏——栅栏缝隙里能看到浑浊的水面。水面在手电筒/手机光下泛着暗色的光，看起来不深，但有一种……细微的、有节奏的拍水声从下面传来。\n你不太确定那是水流还是别的东西。",
    choices: [
      { text: "仔细看看栅栏上的刻字", nextScene: "新达汇-B1停车场-涂鸦" },
      { text: "沿斜坡往下走", nextScene: "新达汇-B1停车场F区", effect: updateTime(3) },
      { text: "上台阶回C区", nextScene: "新达汇-B1停车场C区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-涂鸦": {
    image: "images/xindahui/parkingD.png",
    text: "你蹲下来看铁栅栏边缘。有人用马克笔在水泥地上写了一行字，字迹潦草但用力：\n\n\"别在车里过夜。它们会从排水沟爬上来。——一个忠告\"\n\n下面还有一行更小的字，像是同一个人后来又加的：\n\"不听就算了。\"\n\n你站起来，看了一眼排水沟的栅栏。铁条之间的缝隙大约有十厘米宽。足够什么东西伸出来。",
    choices: [
      { text: "离开这里", nextScene: "新达汇-B1停车场D区" }
    ]
  },

  // ==================== E区 · 白色SUV（假线索） ====================
  "新达汇-B1停车场E区": {
    image: "images/xindahui/parkingE.png",
    text: function(vars) {
      if (vars._wiredCorrectly || vars.hasTorch) {
        return "你来到停车场东北角停着一辆白色荣威SUV。驾驶座的门虚掩着，座位上放着一个空了半截的矿泉水瓶，看起来不久前还有人待过。\n你检查了钥匙孔——上面有明显的划痕，像是被人用什么东西撬过或者试过。方向盘上落了一层薄灰，这辆车至少一周没动过了。";
      }
      return "你摸黑走到一处角落，手碰到了什么——是一辆车。车身冰凉，车门虚掩着。你伸手进车里摸索了一会儿，只摸到了一个矿泉水瓶和一些票据。没有钥匙。";
    },
    choices: [
      { text: "仔细搜一下手套箱和储物格", nextScene: "新达汇-B1停车场-搜SUV", effect: updateTime(3) },
      { text: "返回B区", nextScene: "新达汇-B1停车场B区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜SUV": {
    image: "images/xindahui/parkingE.png",
    onEnter: { add: { _garageOps: 1 } },
    text: "你翻了手套箱、中央扶手箱和车门储物格——只有过期的保险单、几张停车票和一包已经潮了的纸巾。没有任何钥匙的踪影。",
    choices: [
      { text: "看来这辆车没用", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(1) }
    ]
  },

  // ==================== F区 · 黑色大众轿车（真钥匙） ====================
  "新达汇-B1停车场F区": {
    image: "images/xindahui/parkingF.png",
    text: function(vars) {
      if (!vars._wiredCorrectly && !vars.hasTorch) {
        return "停车场最深处的角落里停着一辆黑色大众轿车。车身干净，没有落太多灰——有人在最近几天还开过它。车里一片黑，看不清有什么东西。";
      }
      return "你沿着黑暗的通道一直走到了尽头。手在黑暗中摸到了一辆车——车身光滑，右后的轮胎像新换的。你打开手机屏幕照了一下：一辆黑色大众轿车。\n\
  遮阳板半翻着。皮质座椅已经起毛，看起来车龄不小。后备箱里好像有东西，但是看不清是行李箱还是什么。";
    },
    choices: [
      {
        text: "拉开驾驶座的门",
        condition: "!hasCarKey",
        nextScene: "新达汇-B1停车场-拿钥匙",
        effect: updateTime(1),
        elseScene: "新达汇-B1停车场-没钥匙"
      },
      { // 后备箱有丧尸在箱子里
        text: "检查后备箱",
        nextScene: "新达汇-B1停车场-检查后备箱",
        effect: updateTime(1) 
      },
      { text: "返回B区", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(2) }
    ]
  },

  "新达汇-B1停车场-拿钥匙": {
    image: "images/xindahui/carKey.png",
    onEnter: { add: { _garageOps: 1 }, set: { positionAfterOperation: "新达汇-B1停车场-拿钥匙" } },
    text: "你坐进车里，翻开遮阳板——一把车钥匙掉在你手里。\n钥匙上贴着丰田的标志。\n如果能找到这辆车，也许能早点离开东明街道。",
    choices: [
      {
        text: "收好钥匙",
        condition: "itemCount < bagVolume",
        nextScene: "新达汇-B1停车场B区",
        effect: { set: { hasCarKey: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      }
    ]
  },

  "新达汇-B1停车场-没钥匙": {
    image: "images/xindahui/carKey.png",
    onEnter: { add: { _garageOps: 1 }, set: { positionAfterOperation: "新达汇-B1停车场-没钥匙" } },
    text: "你坐进车里，翻找了一会儿。这里除了一本驾驶手册以外并没有什么像样的东西。你只能悻悻离开。",
    choices: [
      { text: "返回B区", nextScene: "新达汇-B1停车场B区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-检查后备箱": {
    image: "images/xindahui/parkingF.png",
    onEnter: { add: { _garageOps: 1 } },
    text: "你打开后备箱，里面有一个小黄人行李箱，鼓鼓的。你拉开拉链，一只丧尸的手突然窜了出来，掐住了你的脖子。\n\
你挣脱那只手，夺路而逃。           \n\
这时，传来一阵水声。           \n\
然后是脚步声，由远及近。           \n\
从四面八方而来。",
  },

  // ==================== G区 · 银色面包车（假线索+噪音） ====================
  "新达汇-B1停车场G区": {
    image: "images/xindahui/parkingG.png",
    text: function(vars) {
      if (vars._wiredCorrectly || vars.hasTorch) {
        return "西侧角落停着一辆银色五菱面包车。后门没有锁，车厢里堆满了纸箱和杂物。方向盘上落满了灰——这辆车已经很久没人碰过了。\n不太像是最近被开过的车。";
      }
      return "你摸黑走到西侧角落，手指碰到了一个冰冷的金属车身。车厢门没锁，你能摸到里面堆着一些纸箱。";
    },
    choices: [
      { text: "爬上后车厢翻一翻纸箱", nextScene: "新达汇-B1停车场-搜面包车", effect: updateTime(3) },
      { text: "穿过一道铁门", nextScene: "新达汇-B1停车场B区", effect: updateTime(1) },
      { text: "回车场A区", nextScene: "新达汇-B1停车场A区", effect: updateTime(2) }
    ]
  },

  "新达汇-B1停车场-搜面包车": {
    image: "images/xindahui/parkingG.png",
    onEnter: { add: { _garageOps: 1, chasedByZombies: 1 } },
    text: "你翻进车厢，在纸箱里摸索了一会儿——有几包受潮的压缩饼干和几瓶过期的矿泉水。吃的倒是有，但没有钥匙。\n你在翻动纸箱时发出了不小的声响——纸箱倒了一个，哐当一声掉在地上。回音在空旷的车库里传得很远很远。",
    choices: [
      { text: "赶紧离开这里", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(1) }
    ]
  },

  // ==================== 操作计数检查 ====================
  "新达汇-B1停车场-车库检查": {
    image: "images/xindahui/b1ParkingB.png",
    text: function(vars) {
      if (vars._garageOps >= 5) {
        return "排水沟那边传来一阵剧烈的翻涌声——水花四溅，然后是什么沉重的东西爬上了地面的声音。你没有回头看。你跑了。";
      }
      if (vars._garageOps >= 3) {
        return "你隐约听到排水沟的方向传来水声——是有节奏的拍打声，不像水流，更像别的东西。地下停车场不再安静了。";
      }
      return "你站在原地喘了口气。地下停车场依然一片寂静。";
    },
    choices: [
      {
        text: "必须马上离开！",
        nextScene: "新达汇-B1停车场-强制驱逐",
        showCondition: "_garageOps >= 5"
      },
      { text: "继续探索", nextScene: "新达汇-B1停车场B区", showCondition: "_garageOps < 5" },
      { text: "回车库入口", nextScene: "新达汇-B1停车场A区", showCondition: "_garageOps < 5" },
      { text: "离开车库", nextScene: "新达汇-B1走廊", showCondition: "_garageOps < 5" }
    ]
  },

  "新达汇-B1停车场-强制驱逐": {
    image: "images/xindahui/b1Corridor.png",
    onEnter: { set: { _garageOps: 0 } },
    text: "你拔腿就跑，穿过B区、冲过A区，一路没有回头。直到站在B1走廊的灯光下，你才敢停下来喘气。\n身后的停车场深处，水声还在回荡。",
    choices: [
      { text: "回到B1走廊", nextScene: "新达汇-B1走廊", effect: updateTime(1) }
    ]
  },

  // ==================== H区 · 死胡同（环境叙事） ====================
  "新达汇-B1停车场H区": {
    image: "images/xindahui/parkingH.png",
    text: "你拐进角落，但前面是一堵墙——死胡同。这里堆着几辆废弃的购物车和一个翻倒的儿童安全座椅。\n购物车里有一只落满灰的毛绒熊玩偶，半埋在杂物里。墙上有人用马克笔写着：\n\
\"它们会从排水沟爬上来。\"",
    choices: [
      { text: "退回A区", nextScene: "新达汇-B1停车场A区", effect: updateTime(1) }
    ]
  },

  // ==================== H区 · 死胡同（环境叙事） ====================
});
