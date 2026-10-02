// ========== 新达汇·B1地下停车场（2026-10-01 改造版 + 同日评审修订） ==========
// 12区网状结构。Day3 起出现主线目标：金谊广场幸存者小明开车进来搬物资，被排水沟上来的
// 丧尸袭击身亡，车（钥匙插在点火器上）留在 F 区深处——打赢车旁战斗即可开走，无需钥匙。
// 障碍链：dd>=3 时间门槛 → 配电室接线通电（独立回路，不受商场总闸影响）→ 车旁闪色战斗
// → 点火（引擎声=全场信号）→ 限定操作次数的驾驶逃亡 → 撞断杆出库。
// 随机搜车：未通电/非目标区搜车走加权随机池（空车/即食食品/出声/锁车惊吓），每次 +1 噪音。
// 评审修订：搜车回原区（_garageSearchFrom）/ 驱逐当天入口播报+跨日衰减正文 / 接线手机60%中间档
// / 西车道驾驶额外-1 / 车开走后F区空位并关二次点火 / I·K·L 侦查细节 / 涂鸦去重 / 灯态化文案。
// 方案文档：docs/区域方案-新达汇地下车库改造.md

var XDGAR = "新达汇-B1停车场";

// 夜间判定（坡道口的"天光"按小时切换；isNight 派生量的同款口径）
function xdGarNight(vars) {
  return vars.hh >= 19 || vars.hh < 6;
}

// 选项方向词按"目标是否去过"分流：去过写"回"（熟路代入感），没去过写"去"（不能假设玩家来过）。
// 网状地图同一节点入边多条，静态"回X"在首次直到的路线上会穿帮（如 B区 直达 F区 时"回旧区"）。
function xdGarGo(targetId, beenText, firstText) {
  return function(v) {
    return (v._visit && v._visit[targetId] > 0) ? beenText : firstText;
  };
}

// 噪音水位统一反馈：ops>=3 起水声变密，>=5 连爬行声都贴上来（步行区共用一套措辞）
function xdGarNoise(vars) {
  var ops = vars._garageOps || 0;
  if (ops >= 5) return "\n<span class='warn'>排水沟的水声已经连成片，间或混着爪子刮水泥的动静——它们就在车道附近。</span>";
  if (ops >= 3) return "\n<span class='warn'>排水沟那头，有节奏的拍水声一声比一声密。</span>";
  return "";
}

// 车库照明三态："lit"=通电 / "torch"=手电 / "dim"=手机微光 / "dark"=全黑
function xdGarSight(vars) {
  if (vars._wiredCorrectly) return "lit";
  if (vars.hasTorch) return "torch";
  if (vars.hasPhone && vars.phoneBattery > 0) return "dim";
  return "dark";
}

// 随机搜车路由（加权）：F区摸黑可能撞上守着小明的车的丧尸（比通电后正面打更险）。
// 遭遇判定看本轮搜车的起点区（_garageSearchFrom），不看上一次的来路——从F区反复搜，每次都有 30% 撞上。
// __sceneRefs 供 lint_story 补记入边（否则随机池节点会被误判孤立场景）。
function xdGarSearchRouter(vars) {
  var r = Math.random();
  if (vars.dd >= 3 && !vars._wiredCorrectly && vars._garageSearchFrom === XDGAR + "F区" && r < 0.3) {
    return XDGAR + "-摸黑遭遇";
  }
  if (r < 0.35) return XDGAR + "-搜车-空车";
  if (r < 0.55) return (vars._garageLootLeft > 0) ? XDGAR + "-搜车-捡到吃的" : XDGAR + "-搜车-空车";
  if (r < 0.80) return XDGAR + "-搜车-出声";
  return XDGAR + "-搜车-锁车惊吓";
}
xdGarSearchRouter.__sceneRefs = [
  XDGAR + "-摸黑遭遇", XDGAR + "-搜车-空车", XDGAR + "-搜车-捡到吃的",
  XDGAR + "-搜车-出声", XDGAR + "-搜车-锁车惊吓"
];

// 驾驶节点通用 onEnter：每移动一格，逃亡倒计时 -1
function xdGarDriveEnter(vars) {
  vars._escapeOps = Math.max(0, (vars._escapeOps || 0) - 1);
  return {};
}

// 驾驶节点正文尾部：按剩余次数递进的声音暗示（等候区模式：玩家可见文案不点破机制）
function xdGarDriveText(vars) {
  var n = vars._escapeOps || 0;
  if (n <= 1) {
    return "\n<span class='crit'>后视镜里已经全是影子了。它们贴着车道两侧行进，速度和车一样快。</span>";
  }
  if (n <= 3) {
    return "\n<span class='warn'>水声和拍打车身的闷响从四面八方跟上来，一声比一声近。方向感开始变得不重要——重要的是别停。</span>";
  }
  return "\n身后，排水沟的方向炸开一片水声。整个车库都听见了这声引擎。";
}

// 看过疏散图的玩家，驾驶时有方向提示（不构成选项、不耗次数；提示随当前节点变化，不再是同一句）
function xdGarMapHint(vars, hint) {
  return vars._garageMapSeen ? "\n" + hint : "";
}

Object.assign(storyData, {

  // ==================== A区 · 入口平台（网状枢纽之一） ====================
  "新达汇-B1停车场A区": {
    image: "images/placeholder.png" /* TODO: 优先四图之一 images/xindahui/b1ParkingA.png（亮灯湿痕版） */,
    onEnter: function(vars) {
      vars.currentPlace = "新达汇";
      vars.currentPos = "地下车库";
      // 跨日衰减：每天 -2，驱逐不清零（旧版"驱逐=白板重刷"漏洞的修正）
      var last = (vars._garageLastDay === undefined) ? vars.dd : vars._garageLastDay;
      if (vars.dd > last) {
        var before = vars._garageOps || 0;
        vars._garageOps = Math.max(0, before - (vars.dd - last) * 2);
        vars._garageDecayDays = (before > 0) ? (vars.dd - last) : 0;
      } else {
        vars._garageDecayDays = 0;
      }
      vars._garageLastDay = vars.dd;
      return {};
    },
    text: function(vars) {
      var outside = (vars._lastScene === "新达汇-B1走廊" || vars._lastScene === "新达汇车库出口");
      var day3 = vars.dd >= 3;
      var droveOut = vars._visit["新达汇-B1停车场-上车点火"] > 0;
      var desc = outside ? ("你从外面的" + (xdGarNight(vars) ? "夜色" : "天光") + "里折回来，顺着坡道下到入口的平台。") : "你回到停车场入口的平台。";
      if (vars._wiredCorrectly) {
        desc += "头顶的灯一盏盏亮着，暖黄色的光把坡道照得通透，几盏应急灯反倒显得可有可无。";
        if (day3) {
          desc += "\n两道新鲜的轮胎印从坡道口一路碾进来，压过积水的地方在灯光下亮得反光——湿痕顺着坡道一路往车库深处去，中间没有断过。";
          if (droveOut) desc += "\n另有一道更新鲜的印子，从库里往外碾出去，正正压过坡道口那截断杆。";
        }
      } else {
        desc += "坡道从这里往下延伸进车库深处，头顶几盏应急灯还亮着，昏黄的光勉强照出主通道的轮廓。";
        if (day3) desc += "\n地面上有两道轮胎印，从坡道口一路碾进来——压过积水的地方还没干透，是最近才留下的。";
      }
      desc += "\n主通道往前通向车库深处，左侧是西侧车道，右侧拐角堆着杂物。";
      if (vars._garageDecayDays > 0) {
        desc += "\n排水沟那头的水声比上次退了些——隔了" + vars._garageDecayDays + "天，它们散了一些。";
      }
      if ((vars._garageOps || 0) >= 5) {
        desc += "\n<span class='warn'>还没往下走你就听见了：车库深处的水声密得像下雨。它们还没散。今天硬闯进去，每一步都是赌。</span>";
      }
      return desc;
    },
    choices: [
      { text: "沿主通道往深处走", nextScene: "新达汇-B1停车场B区", effect: updateTime(2) },
      { text: "去西侧车道", nextScene: "新达汇-B1停车场G区", effect: updateTime(2) },
      { text: "去拐角杂物堆", nextScene: "新达汇-B1停车场H区", effect: updateTime(1) },
      { text: "去坡道口（出口方向）", nextScene: "新达汇-B1停车场J区", effect: updateTime(1) },
      { text: xdGarGo("新达汇-B1走廊", "回B1走廊", "去B1走廊"), nextScene: "新达汇-B1走廊", effect: updateTime(2) }
    ]
  },

  // ==================== B区 · 主通道东段（网状枢纽） ====================
  "新达汇-B1停车场B区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/b1ParkingB.png */,
    text: function(vars) {
      var src = vars._lastScene;
      var head;
      if (src === "新达汇-B1停车场A区") head = "你从入口平台那头拐进主通道。";
      else if (src === "新达汇-B1停车场I区") head = "你从横道切回主通道中段。";
      else head = "你折回主通道中段。";
      var sight = xdGarSight(vars);
      var desc;
      if (sight === "lit") {
        desc = head + "灯亮着，暖黄色的光把四个岔口照得一览无余：防火门在左手边第二根立柱后，横道口在右手边，车道尽头在最深处那头。";
      } else if (sight === "torch") {
        desc = head + "手电的光束劈开黑暗，照出立柱上一格格车位编号——防火门的轮廓在左手边，右手边是横道的岔口，最深处那头黑得像一口井。";
      } else if (sight === "dim") {
        desc = head + "举着手机，靠屏幕的微光辨认方向——电量还剩 " + vars.phoneBattery + "%。左侧有一扇防火门的轮廓，右侧隐约有一条岔路。";
      } else {
        desc = head + "这里几乎没有光。左侧好像有一扇门的轮廓，右侧隐约有一条岔路。";
      }
      return desc + xdGarNoise(vars);
    },
    choices: [
      { text: "去车道尽头", nextScene: "新达汇-B1停车场F区", effect: updateTime(2) },
      { text: "去防火门后的配电室", nextScene: "新达汇-B1停车场C区", effect: updateTime(2) },
      { text: "去东北拐角", nextScene: "新达汇-B1停车场E区", effect: updateTime(2) },
      { text: "穿中段横道去西侧车道", nextScene: "新达汇-B1停车场I区", effect: updateTime(1) },
      { text: "回入口平台", nextScene: "新达汇-B1停车场A区", effect: updateTime(2) }
    ]
  },

  // ==================== C区 · 配电室 ====================
  "新达汇-B1停车场C区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingC.png */,
    text: function(vars) {
      if (vars._wiredCorrectly) return "配电室的灯亮着。墙上的配电箱面板已经合上了——几根重新接好的电线整齐地排列着。没什么需要再做的了。";
      var last = vars._lastScene;
      var head;
      if (last === "新达汇-B1停车场D区") {
        head = "你从旧区爬上台阶，推开防火门，回到配电室。";
      } else if (last === "新达汇-B1停车场-接线" || last === "新达汇-B1停车场-接线成功" || last === "新达汇-B1停车场-接线失败") {
        head = "你退开半步，重新打量这台配电箱。";
      } else {
        head = "你穿过防火门，走进停车场附属的配电室。";
      }
      return head + "墙上的配电箱面板掉了一半，几根不同颜色的电线从接口处松脱，垂落在外面。\n如果你能把它们重新接好，应该能恢复这一片的照明。";
    },
    choices: [
      {
        text: "试着把电线接回去",
        nextScene: "新达汇-B1停车场-接线",
        effect: updateTime(2),
        showCondition: "!_wiredCorrectly"
      },
      { text: "走下台阶到旧区", nextScene: "新达汇-B1停车场D区", effect: updateTime(1), condition: "_garageOps < 5", elseScene: "新达汇-B1停车场-强制驱逐" },
      { text: xdGarGo("新达汇-B1停车场B区", "回主通道", "去主通道"), nextScene: "新达汇-B1停车场B区", effect: updateTime(1), condition: "_garageOps < 5", elseScene: "新达汇-B1停车场-强制驱逐" }
    ]
  },

  // ==================== 接线谜题 ====================
  "新达汇-B1停车场-接线": {
    image: "images/placeholder.png" /* TODO: images/xindahui/powerPanel.png */,
    onEnter: { add: { _garageOps: 1 } },
    text: function(vars) {
      var desc = "配电箱里的线头脱落了好几根。你凑近一看——所有电线的外皮都是黑色的，没有颜色标记。\n配电箱盖板内侧贴着一张接线图，但被灰尘和油污盖住了大半。";
      if (vars.hasTorch) {
        desc += "\n你打着手电筒，仔细擦掉了盖板上的污渍。接线图清晰地显示着每组线的接口位置——虽然电线没颜色，但图纸标得很清楚。你知道了该怎么接。";
      } else if (vars.hasPhone && vars.phoneBattery > 0) {
        desc += "\n你借着手机屏的微光辨认图纸。接线图的大半能看清——只剩两处接口的标注被油污盖死。你把看得清的接上，看不清的那两处，只能赌。";
      } else {
        desc += "\n一片漆黑。你只能用手摸着线头和接口的位置，全凭感觉试试了。";
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
        text: "借着微光把线接上——推上电闸",
        nextScene: function() { return Math.random() < 0.6 ? '新达汇-B1停车场-接线成功' : '新达汇-B1停车场-接线失败'; },
        effect: updateTime(2),
        showCondition: "!hasTorch && hasPhone && phoneBattery > 0"
      },
      {
        text: "摸黑把几根线接在一起",
        nextScene: function() { return Math.random() < 0.3 ? '新达汇-B1停车场-接线成功' : '新达汇-B1停车场-接线失败'; },
        effect: updateTime(2),
        showCondition: "!hasTorch && !(hasPhone && phoneBattery > 0)"
      },
      { text: "算了，不接", nextScene: "新达汇-B1停车场C区" }
    ]
  },

  "新达汇-B1停车场-接线成功": {
    image: "images/placeholder.png" /* TODO: images/xindahui/powerPanel.png */,
    onEnter: { set: { _wiredCorrectly: true } },
    text: function(vars) {
      if (vars._powerOut) {
        return "你推上电闸。灯管闪了两下——然后亮了。\n你愣了一下。保安室拉掉的是商场的总闸，管不到这片——地下车库的照明走配电室自己的回路。灯一盏接一盏地亮起来，暖黄色的光铺满整个B区。\n你终于能看清周围的全貌了。";
      }
      return "你推上电闸。头顶的灯管闪了几下，发出一阵<span class='sfx'>嗡嗡</span>声——然后亮了。暖黄色的灯光驱散了整个B区的黑暗。\n你终于能看清周围的全貌了。";
    },
    choices: [
      { text: "返回C区", nextScene: "新达汇-B1停车场C区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-接线失败": {
    image: "images/placeholder.png" /* TODO: images/xindahui/powerPanel.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你把线接上了，但推上电闸的瞬间——<span class='sfx'>啪</span>！一阵火花闪过，灯没亮。你接错了。\n短路的声音在空旷的停车场里回荡……肯定引起了什么东西的注意。你得小心了。",
    choices: [
      { text: "再试一次", nextScene: "新达汇-B1停车场-接线", effect: updateTime(2) },
      { text: "算了，不接", nextScene: "新达汇-B1停车场C区" }
    ]
  },

  // ==================== D区 · 旧区排水沟（低一层） ====================
  "新达汇-B1停车场D区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingD.png */,
    text: function(vars) {
      var sight = xdGarSight(vars);
      var src = vars._lastScene;
      var head;
      if (src === "新达汇-B1停车场F区") {
        head = "你从深处折回来，爬上台阶，回到旧区的地面。";
      } else if (src === "新达汇-B1停车场G区") {
        head = "你顺着西侧斜坡下到旧区。";
      } else {
        head = "你走下台阶，来到停车场旧区。";
      }
      var desc = head + "地面比上面低了一截，脚下的水泥地湿漉漉的，踩上去有细碎的回声。\n地面上有一排排水沟的铁栅栏——栅栏缝隙里能看到浑浊的水面。";
      if (sight === "lit") {
        desc += "灯光斜斜地打下来，水面在昏黄里泛着暗色的光。";
        if (vars.dd >= 3) {
          desc += "栅栏边的水泥地上有几道拖痕，最深的一道通向台阶口；还有几根栅栏，被从里面顶歪了。";
        }
        if ((vars._garageOps || 0) >= 5 || vars._visit["新达汇-B1停车场-上车点火"] > 0) {
          desc += "水面涨上来一截——那阵有节奏的拍水声还在，一道细长的影子贴着栅栏慢慢横移，从这头，到那头。";
        } else {
          desc += "那阵有节奏的拍水声还在，水面下的动静看不分明。";
        }
      } else if (sight === "torch") {
        desc += "手电的光扫过去，水面泛着暗色的光，看起来不深，但有一种……细微的、有节奏的拍水声从下面传来。\n你不太确定那是水流还是别的东西。";
      } else if (sight === "dim") {
        desc += "手机的微光只够照出最近的一格栅栏。水面下有动静，但你看不清是什么。细微的、有节奏的拍水声从下面传来，一下，一下，不紧不慢。";
      } else {
        desc += "黑暗里你看不清水面，只有一种……细微的、有节奏的拍水声从下面传来。看不见的时候，这声音显得格外近。";
      }
      return desc;
    },
    choices: [
      { text: "仔细看看栅栏上的刻字", nextScene: "新达汇-B1停车场-涂鸦" },
      { text: "沿斜坡往深处去", nextScene: "新达汇-B1停车场F区", effect: updateTime(2) },
      { text: "爬西侧斜坡上去", nextScene: "新达汇-B1停车场G区", effect: updateTime(2) },
      { text: xdGarGo("新达汇-B1停车场C区", "上台阶回配电室", "上台阶去配电室"), nextScene: "新达汇-B1停车场C区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-涂鸦": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingD.png */,
    text: function(vars) {
      var desc = "你蹲下来看铁栅栏边缘。有人用马克笔在水泥地上写了一行字，字迹潦草但用力：\n“别在车里过夜。它们会从排水沟爬上来。——一个忠告”\n下面还有一行更小的字，后来补的：\n“不听就算了。”\n你站起来，看了一眼排水沟的栅栏。铁条之间的缝隙大约有十厘米宽。足够什么东西伸出来。";
      if (vars.dd >= 3) {
        desc += "\n<span class='think'>栅栏边的水泥地上，有几道新鲜的拖痕，一直延伸向深处。写这行字的人，恐怕没想到还有人会重蹈覆辙。</span>";
      }
      return desc;
    },
    choices: [
      { text: "离开这里", nextScene: "新达汇-B1停车场D区" }
    ]
  },

  // ==================== E区 · 东北拐角（白荣威·假线索） ====================
  "新达汇-B1停车场E区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingE.png */,
    text: function(vars) {
      var src = vars._lastScene;
      var head;
      if (src === "新达汇-B1停车场H区") head = "你翻过杂物堆，从检修通道里出来，到了东北拐角。";
      else if (src === "新达汇-B1停车场K区") head = "你从第二停车排穿出来，到了东北拐角。";
      else if (src === "新达汇-B1停车场F区") head = "你从深处折回东北拐角。";
      else head = "你拐进东北拐角。";
      var sight = xdGarSight(vars);
      if (sight === "lit" || sight === "torch") {
        return head + "这里停着一辆白色荣威SUV，驾驶座的门虚掩着，座位上放着一个空了半截的矿泉水瓶。\n你检查了钥匙孔——上面有明显的划痕，有人拿东西撬过。方向盘上落了一层薄灰，这辆车至少一周没动过了。";
      }
      if (sight === "dim") {
        return head + "手机屏幕照出一辆车的轮廓——车门虚掩着。你伸手进车里摸索了一会儿，只摸到一个矿泉水瓶和一些票据。没有钥匙。";
      }
      return head + "手碰到了什么——是一辆车。车身冰凉，车门虚掩着。你伸手进车里摸索了一会儿，只摸到了一个矿泉水瓶和一些票据。";
    },
    choices: [
      { text: "翻过杂物堆走检修通道", nextScene: "新达汇-B1停车场H区", effect: updateTime(2) },
      { text: "往深处去", nextScene: "新达汇-B1停车场F区", effect: updateTime(1) },
      { text: xdGarGo("新达汇-B1停车场B区", "回主通道", "去主通道"), nextScene: "新达汇-B1停车场B区", effect: updateTime(1) },
      { text: "去第二停车排", nextScene: "新达汇-B1停车场K区", effect: updateTime(1) },
      { text: "搜查拐角的车", nextScene: "新达汇-B1停车场-搜车", effect: updateTime(2) }
    ]
  },

  // ==================== F区 · 深处（★事故点） ====================
  "新达汇-B1停车场F区": {
    image: "images/placeholder.png" /* TODO: 优先四图之一 images/xindahui/parkingF.png（事故点） */,
    text: function(vars) {
      // 从战斗/摸黑脱身退回时的差异化承接（否则"走到尽头"与"你退了出去"矛盾）
      var ret = (vars._lastScene === "新达汇-B1停车场-摸黑-脱身" || vars._lastScene === "新达汇-B1停车场-摸黑-带伤" || vars._lastScene === "新达汇-B1停车场-车旁搜身-受伤")
        ? "你退回到车库深处。" : "";
      var body;
      // Day3 之前：车还没来，普通角落
      if (vars.dd < 3) {
        var sight0 = xdGarSight(vars);
        if (sight0 === "lit" || sight0 === "torch") {
          body = "你沿着通道一直走到尽头。这里是车库最深的角落，灯照不到的地方堆着几个废弃的轮胎架。角落里的车都落满了灰——很久没人动过了。";
        } else {
          body = "停车场最深处的角落。你的手依次摸过几辆车的引擎盖——全是凉的，覆着厚厚的灰。这里很久没有车动过了。";
        }
      } else if (!vars._wiredCorrectly) {
        // Day3+：车在，但没通电时无法辨认
        body = "车库最深处的角落。黑暗里传来一种细微的、有节奏的湿润声音，像是什么东西在进食。\n你在黑暗里分不清车位的轮廓——只知道那个方向的空气里，多了一股新鲜的血腥气。";
        if (vars._garageFMarked) body += "\n<span class='think'>但有个参照忘不了——那辆引擎盖是温的，在左手边第二个车位。你摸黑记下的。</span>";
      // 车库线已点火开走（用本线标记，不用全局 hasCar——王老师线拿车不该擦掉这里的事故点）
      } else if (vars._visit["新达汇-B1停车场-上车点火"] > 0) {
        // 车已开走：空车位（关掉二次点火，状态闭环）
        body = "车道尽头的角落空了。地面上留着一圈干干净净的长方形车印，四边带着轮胎碾出的湿边。驾驶座的门大敞着，遮阳板翻落在一旁。\n排水沟的栅栏歪着，栅栏边那具尸体还在，手里攥着半张购物清单。点火器上空空荡荡——车和钥匙，都不在了。";
        if (vars.dd >= 5) body += "\n车位的边缘，已经开始落灰了。";
      } else if (vars._visit["新达汇-B1停车场-车旁遭遇"] > 0) {
        // 打赢但没马上开走：水声不退，拖延有代价
        if (vars.dd >= 5) {
          body = "那辆深灰色的荣威还停在车道尽头的角落。引擎盖早就凉透了，车身侧面的血迹干成了深褐色的壳，空气里的甜腥味比几天前厚了一层。栅栏边的尸体已经蜷成一团认不出的轮廓，车里的手机屏幕黑着。\n驾驶座里，钥匙还插在点火器上——这么多天，谁也没来动过。";
        } else {
          body = "车道尽头的角落里，那辆深灰色的荣威轿车安静地停着。驾驶座的门敞开着，车旁的排水沟栅栏歪了两根，栅栏边摊着一具被啃咬过的尸体。\n驾驶座里，钥匙还插在点火器上。\n<span class='warn'>水声没有退。栅栏缝里，灰白的轮廓贴着水面缓缓挪动——它们缩回了沟里，只是在等。这地方每多待一刻，都是在花代价。</span>";
        }
      } else {
        // 目标车在，战斗未发生
        if (vars.dd >= 5) {
          body = "车道尽头那个车位上的，就是那辆深灰色的荣威——车身上没有灰，引擎盖却已经凉透了，车身侧面的血迹干成深褐色的壳，血腥气发酵成一股甜腻的腐味。\n车旁的排水沟栅栏歪了两根，一个影子还伏在车门边，动作慢得像在打盹。栅栏缝里，另一只只露出一截湿漉漉的脊背。";
        } else {
          body = "车道尽头的角落里停着一辆车——<span class='crit'>一辆深灰色的荣威轿车，车身上没有灰。</span>\n驾驶座的门敞开着，车灯熄着，但引擎盖摸上去是温的。车旁的排水沟栅栏歪了两根，一个佝偻的影子正伏在车门边，一下一下地朝车厢里啃咬着什么。\n影子旁边还有一只，正从排水沟里往外爬。";
        }
        if (vars._garageFMarked) body = "灯亮了。你上回摸黑记下的位置——就是它。\n" + body;
        if (vars._knowsSurvivorCar) {
          body += "\n<span class='think'>长廊的人说过——小明前天开着车出去，到现在没回来。就是它了。</span>";
        }
      }
      return ret ? ret + body : body;
    },
    choices: [
      {
        text: "靠近那辆车",
        showCondition: "dd >= 3 && _wiredCorrectly && !_visit['新达汇-B1停车场-上车点火'] && !_visit['新达汇-B1停车场-车旁遭遇']",
        nextScene: "新达汇-B1停车场-车旁遭遇",
        effect: updateTime(1)
      },
      {
        text: "上车",
        showCondition: "dd >= 3 && _wiredCorrectly && !_visit['新达汇-B1停车场-上车点火'] && (_visit['新达汇-B1停车场-车旁搜身'] > 0 || _visit['新达汇-B1停车场-车旁搜身-受伤'] > 0)",
        nextScene: "新达汇-B1停车场-上车点火"
      },
      {
        text: "搜查角落的车",
        showCondition: "dd < 3 || !_wiredCorrectly",
        nextScene: "新达汇-B1停车场-搜车",
        effect: updateTime(2)
      },
      { text: xdGarGo("新达汇-B1停车场B区", "回主通道", "去主通道"), nextScene: "新达汇-B1停车场B区", effect: updateTime(2) },
      { text: xdGarGo("新达汇-B1停车场D区", "上台阶回旧区", "上台阶去旧区"), nextScene: "新达汇-B1停车场D区", effect: updateTime(1) },
      { text: xdGarGo("新达汇-B1停车场E区", "回东北拐角", "去东北拐角"), nextScene: "新达汇-B1停车场E区", effect: updateTime(1) }
    ]
  },

  // ==================== 车旁战斗（2只排水沟丧尸） ====================
  "新达汇-B1停车场-车旁遭遇": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingF.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄", "白"], 7),
    text: function(vars) {
      return "你放轻脚步靠近。伏在车门边的那只先直起了身——<span class='crit'>它半边身子还是湿的，排水沟的污泥顺着下巴往下淌</span>。另一只从栅栏边爬出来，动作又快又轻。\n它们把你堵在车道和排水沟之间。没有退路了——盯住它们的动作，找节奏！";
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        nextScene: flashCombatRouter(
          "新达汇-B1停车场-车旁搜身",
          "新达汇-B1停车场-车旁搜身-受伤",
          "结局-车库遭遇战"
        ),
        timeout: 20000,
        timeoutScene: "结局-车库遭遇战"
      }
    ]
  },

  "新达汇-B1停车场-车旁搜身": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingF.png */,
    onEnter: { add: { chasedByZombies: 1, strength: -1 } }, // 战斗消耗记在胜利节点（开战页不扣）
    text: function(vars) {
      var phoneLine = (vars.dd >= 5)
        ? "他的手机摔在脚边，屏幕裂成了蛛网，黑着——电池早就耗干了，谁也没有来过。"
        : "他的手机摔在脚边，屏幕裂成了蛛网，还亮着——锁屏壁纸是个笑得很开的小女孩，输入界面停在一条没发出去的短信上：“东西太多，我跑第二趟”\n<span class='term'>信号栏空空如也。</span>";
      var desc = "最后一只抽搐着倒下，不动了。你喘匀了气，才敢看那具尸体。\n是个年轻人，穿一件洗得发白的外套，手里还攥着半张购物清单——新达汇超市的目录，背面用圆珠笔写着一行字：“多的卖给长廊。”\n" + phoneLine + "\n驾驶座里，<span class='crit'>钥匙还插在点火器上</span>——他刚停好车，还没来得及拔。";
      desc += "\n<span class='warn'>车库里回荡着打斗的动静。水声正从四面八方聚拢过来。</span>";
      desc += "\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>";
      return desc;
    },
    choices: [
      { text: "上车，马上走", nextScene: "新达汇-B1停车场-上车点火" },
      { text: "先退开，缓一缓", nextScene: "新达汇-B1停车场F区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-车旁搜身-受伤": {
    image: "images/hurtByzombie.webp",
    onEnter: hurtWinOnEnter({ time: 1 }),
    text: function(vars) {
      var phoneLine = (vars.dd >= 5)
        ? "他的手机摔在脚边，屏幕裂成了蛛网，黑着。"
        : "他的手机屏幕还亮着，锁屏壁纸是个小女孩。";
      var desc = "你勉强把两只都干掉了——代价是胳膊上添了一道口子，血顺着手腕往下淌。" + hurtCostText(vars) + "\n那具年轻的尸体倒在车轮边，手里攥着半张购物清单。" + phoneLine + "驾驶座里，钥匙还插在点火器上。";
      desc += "\n<span class='warn'>动静已经传出去了。排水沟那头的水声连成了片。</span>";
      return desc;
    },
    choices: [
      { text: "上车，马上走", nextScene: "新达汇-B1停车场-上车点火" },
      { text: "先退开，缓一缓", nextScene: "新达汇-B1停车场F区", effect: updateTime(1) }
    ]
  },

  // ==================== 摸黑遭遇（未通电撞上守车的丧尸） ====================
  "新达汇-B1停车场-摸黑遭遇": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingF.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄", "白"], 8),
    text: function(vars) {
      return "你的手摸到一辆车——引擎盖是温的。还没等你反应过来，<span class='crit'>一只湿漉漉的手已经攥住了你的手腕</span>。\n黑暗里你看不清它的脸，只闻得到排水沟的腥臭。挣脱，还是赌一把？\n集中注意力——凭声音和触感判断它的动作！";
    },
    choices: [
      {
        text: "输入你感觉到的动作节奏",
        input: { placeholder: "例如：3红2蓝" },
        nextScene: flashCombatRouter(
          "新达汇-B1停车场-摸黑-脱身",
          "新达汇-B1停车场-摸黑-带伤",
          "结局-车库遭遇战"
        ),
        timeout: 18000,
        timeoutScene: "结局-车库遭遇战"
      }
    ]
  },

  "新达汇-B1停车场-摸黑-脱身": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingF.png */,
    onEnter: { add: { chasedByZombies: 1, strength: -1 }, set: { _garageFMarked: true } },
    text: function(vars) {
      return "你借着它的力道把它甩了出去，抄起半截轮胎架砸了下去——不动了。\n黑暗里，你的手摸到那辆车的车门：温的，没锁。钥匙孔的位置，你甚至摸到了插在点火器上的钥匙的轮廓。\n<span class='warn'>但水声已经围上来了。黑灯瞎火的，你分不清哪辆是它——再摸下去就是送死。</span>\n你退了出去。记住这个位置——下次，带着光来。\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "退回深处通道", nextScene: "新达汇-B1停车场F区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-摸黑-带伤": {
    image: "images/hurtByzombie.webp",
    onEnter: function(vars) {
      vars._garageFMarked = true;
      return hurtWinOnEnter({ time: 1 })(vars);
    },
    text: function(vars) {
      return "你在黑暗里赌赢了——它倒了，你的胳膊上也挂了彩。" + hurtCostText(vars) + "\n喘息间，你的指尖碰到旁边一辆车的车门：温的，没锁。点火器上插着什么，你甚至来不及确认。\n<span class='warn'>水声近得已经不需要判断方位。黑暗里多待一秒都是赌命。</span>\n你摸黑退了出去。位置记住了——下次，带着光来。";
    },
    choices: [
      { text: "退回深处通道", nextScene: "新达汇-B1停车场F区", effect: updateTime(1) }
    ]
  },

  // ==================== G区 · 西侧车道（面包车） ====================
  "新达汇-B1停车场G区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingG.png */,
    text: function(vars) {
      var src = vars._lastScene;
      var head;
      if (src === "新达汇-B1停车场A区") head = "你从入口平台拐进西侧车道。";
      else if (src === "新达汇-B1停车场I区") head = "你从横道切到西侧车道。";
      else if (src === "新达汇-B1停车场D区") head = "你顺着西侧斜坡爬上来，回到西侧车道。";
      else if (src === "新达汇-B1停车场L区") head = "你从第二停车排挤出来，回到西侧车道。";
      else head = "你回到西侧车道。";
      var sight = xdGarSight(vars);
      var desc;
      if (sight === "lit" || sight === "torch") {
        desc = head + "车道靠墙停着一辆银色五菱面包车，后门没有锁，车厢里堆满了纸箱和杂物，方向盘上落满了灰——这辆车已经很久没人碰过了。\n车道东头有一扇半开的铁门，穿过去就是主通道；中段横道的口子也在东边，角落里还有一道通往旧区的斜坡。";
      } else {
        desc = head + "手指碰到一个冰冷的金属车身——车厢门没锁，里面堆着一些纸箱。空气比主通道那边更潮，隐隐有水汽的味道。";
      }
      if ((vars._garageOps || 0) >= 5 || vars._visit["新达汇-B1停车场-上车点火"] > 0) {
        desc += "\n<span class='warn'>车道边的排水沟栅栏缝里，水面比别处高了一截，正贴着缝往外渗。</span>";
      }
      return desc + xdGarNoise(vars);
    },
    choices: [
      { text: "翻后车厢搜一搜", nextScene: "新达汇-B1停车场-搜车", effect: updateTime(2) },
      { text: "穿横道去东侧", nextScene: "新达汇-B1停车场I区", effect: updateTime(1) },
      { text: "下斜坡去旧区", nextScene: "新达汇-B1停车场D区", effect: updateTime(2) },
      { text: xdGarGo("新达汇-B1停车场B区", "穿过铁门回主通道", "穿过铁门去主通道"), nextScene: "新达汇-B1停车场B区", effect: updateTime(1) },
      { text: "回入口平台", nextScene: "新达汇-B1停车场A区", effect: updateTime(2) }
    ]
  },

  // ==================== H区 · 拐角杂物堆（检修通道） ====================
  "新达汇-B1停车场H区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingH.png */,
    text: function(vars) {
      var sight = xdGarSight(vars);
      var desc;
      if (sight === "dark") {
        // 全黑：读不了墙上的字
        desc = "拐角处堆着几辆废弃的购物车和一个翻倒的儿童安全座椅。购物车里有什么软乎乎的东西，你伸手摸到了半只毛绒熊的耳朵。";
      } else {
        desc = "拐角处堆着几辆废弃的购物车和一个翻倒的儿童安全座椅。购物车里有一只落满灰的毛绒熊玩偶，半埋在杂物里。旁边的立柱上，有人用马克笔写了两行字：\n“车别乱开。有的不是空的。——302的胖子”";
      }
      if (sight === "lit" || sight === "torch") {
        desc += "\n杂物堆后面塞着一根带血的撬棍，撬棍底下压着一张折叠的保养单——荣威4S店的，车牌号一栏，写的正是东北角那辆白色SUV。\n<span class='think'>有人比你更早想过这辆车的主意。没成。</span>\n杂物堆侧边留出一条刚够侧身通过的缝——有人清出来的，通向东北拐角的检修通道。";
      }
      return desc;
    },
    choices: [
      { text: "侧身穿过检修通道", nextScene: "新达汇-B1停车场E区", effect: updateTime(2) },
      { text: "退回入口平台", nextScene: "新达汇-B1停车场A区", effect: updateTime(1) }
    ]
  },

  // ==================== I区 · 中段横道（内切捷径） ====================
  "新达汇-B1停车场I区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingI.png */,
    text: function(vars) {
      var src = vars._lastScene;
      var head;
      if (src === "新达汇-B1停车场B区") head = "你从主通道切进中段横道。";
      else if (src === "新达汇-B1停车场G区") head = "你从西侧车道切进中段横道。";
      else head = "你从第二停车排拐上中段横道。";
      var desc;
      if (xdGarSight(vars) === "lit") {
        desc = head + "这条横穿车库的窄车道里，两排立柱把车影切成一段一段的。从这里切过去，东侧主通道和西侧车道之间不用再绕入口平台。\n中段有一根立柱上刻满了“正”字，一笔一划刻得很深，密密麻麻数不清有多少个——有人在这里数过什么，数了很久。";
        if (vars.dd >= 3 && (vars._garageOps || 0) >= 3) {
          desc += "\n最底下那个“正”字的最后一笔，刻痕还是新的，露着白茬——有人还在数。";
        }
      } else {
        desc = head + "两排立柱擦着肩膀过去。方向感告诉你——这条道横着连通车库的东西两侧。指尖划过其中一根立柱，上面刻着一道道深浅不一的凹槽，密得硌手。";
      }
      return desc + xdGarNoise(vars);
    },
    choices: [
      { text: "往东去主通道", nextScene: "新达汇-B1停车场B区", effect: updateTime(1) },
      { text: "往西去西侧车道", nextScene: "新达汇-B1停车场G区", effect: updateTime(1) },
      { text: "拐进西侧第二停车排", nextScene: "新达汇-B1停车场L区", effect: updateTime(1) }
    ]
  },

  // ==================== J区 · 坡道下段（收费亭·疏散图·断杆） ====================
  "新达汇-B1停车场J区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/rampBottom.png */,
    text: function(vars) {
      var desc = "下行车道的尽头是出口坡道的起点。收费亭歪在一边，玻璃碎了大半。";
      var droveOut = vars._visit["新达汇-B1停车场-上车点火"] > 0;
      if (vars.dd >= 3) {
        desc += (droveOut)
          ? "\n出口的栏杆断成了两截，断口向外翻卷——被第二次撞开的。收费亭的顶上，还留着一块新砸出来的凹痕。"
          : "\n<span class='crit'>出口的栏杆断成了两截，断口很新</span>——横杆被什么重物从里往外撞断的，收费亭的窗口又多了几道新的撞击凹痕。最近有车从这里闯了进来。";
      }
      desc += "\n亭子侧墙上贴着一张消防疏散图，有机玻璃罩着，还没碎。";
      return desc;
    },
    choices: [
      { text: "查看消防疏散图", nextScene: "新达汇-B1停车场-疏散图", effect: updateTime(1) },
      { text: "沿坡道出库", nextScene: "新达汇车库出口", effect: updateTime(2) },
      { text: "回入口平台", nextScene: "新达汇-B1停车场A区", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-疏散图": {
    image: "images/placeholder.png" /* TODO: images/xindahui/evacuationMap.png */,
    onEnter: { set: { _garageMapSeen: true } },
    text: "你凑近疏散图。有机玻璃罩上积了灰，但图面还清楚：\nB1停车场被一条环形车道分成内外两圈——外圈沿着外墙，从入口平台经东北拐角绕到西侧；内圈是主通道和中段横道，横着切过去能省一半路。\n配电室在防火门后，挨着主通道。出口坡道在入口平台的东南角——出去就是辅路。\n<span class='sys'>【系统提示】你记住了两处要紧的位置：出口坡道在东南角，配电室在防火门后。</span>",
    choices: [
      {
        text: "记下了",
        nextScene: function(v) { return v._lastScene || "新达汇-B1停车场J区"; }
      }
    ]
  },

  // ==================== K区 · 第二停车排·东 ====================
  "新达汇-B1停车场K区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingK.png */,
    text: function(vars) {
      var sight = xdGarSight(vars);
      if (sight === "dark") {
        return "你摸进主通道旁的停车排。车挨着车，中间只留一条窄缝，伸手全是金属的棱角。";
      }
      var desc = "主通道旁边是第二停车排，两排车头对着车头，中间只留一条缝。大多是落了灰的家用车，有一辆的后备箱盖开着，像一张等了很久的嘴。";
      if (sight === "lit") {
        desc += "\n后备箱是空的，箱底垫着一张被水汽洇过的超市传单——纸角朝着车道尽头那头翘着，水痕洇开的方向也是。这排车离排水沟远，湿气是从深处飘过来的。";
      } else {
        // 手电/手机：看见线索的一半（传单和朝向），推理留给通电后
        desc += "\n你探头往那辆开着后备箱的车里照了照——空的，箱底垫着一张纸，被水汽洇得发皱。纸角翘着，朝着车道尽头那头。";
      }
      return desc;
    },
    choices: [
      { text: xdGarGo("新达汇-B1停车场B区", "回主通道", "去主通道"), nextScene: "新达汇-B1停车场B区", effect: updateTime(1) },
      { text: "穿到东北拐角", nextScene: "新达汇-B1停车场E区", effect: updateTime(1) },
      { text: "搜查停车排的车", nextScene: "新达汇-B1停车场-搜车", effect: updateTime(2) }
    ]
  },

  // ==================== L区 · 第二停车排·西 ====================
  "新达汇-B1停车场L区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingL.png */,
    text: function(vars) {
      var sight = xdGarSight(vars);
      if (sight === "dark") {
        return "你摸进西侧的停车排。这里的车停得更乱，有几辆是斜插着的。脚下的地面黏腻腻的，不知道是什么。";
      }
      var desc = "西侧的第二停车排比东边更挤，有几辆车是斜插着停的，像停到一半出了什么事。地面上散着几只一次性手套——修车的人留下的，或者是更晚的什么东西。";
      if (sight === "lit") {
        desc += "\n你捡起其中一只翻过来看——指缝里嵌着几截黄色的绝缘胶布碎屑，和配电室里那种电线外皮上缠的，是同一种东西。";
      } else {
        // 手电/手机：认出是胶布，来源留给通电后
        desc += "\n你捡起其中一只，凑到光跟前翻过来看——指缝里嵌着几截黄色的碎屑，是绝缘胶布。";
      }
      return desc;
    },
    choices: [
      { text: "去西侧车道", nextScene: "新达汇-B1停车场G区", effect: updateTime(1) },
      { text: xdGarGo("新达汇-B1停车场I区", "回中段横道", "去中段横道"), nextScene: "新达汇-B1停车场I区", effect: updateTime(1) },
      { text: "搜查停车排的车", nextScene: "新达汇-B1停车场-搜车", effect: updateTime(2) }
    ]
  },

  // ==================== 随机搜车系统 ====================
  "新达汇-B1停车场-搜车": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: function(vars) {
      vars._garageOps = (vars._garageOps || 0) + 1;
      // 记录本轮搜车起点（链中"换个位置再搜"不覆盖起点；退出搜查时清 pending）
      if (!vars._garageSearchPending) {
        vars._garageSearchFrom = vars._lastScene || XDGAR + "B区";
        vars._garageSearchPending = true;
      }
      return {};
    },
    text: function(vars) {
      var sight = xdGarSight(vars);
      var desc = (sight === "lit")
        ? "你放轻脚步，靠近最近的一排车。灯光下能看清车牌和车型，翻找起来也快得多。"
        : "你放轻脚步，靠近最近的一辆车。黑暗里只能靠手摸——车门把手、车窗缝、储物格。每一次拉拽都可能出声。";
      if (vars._garageOps >= 3 && vars._garageOps < 5) {
        desc += "\n<span class='warn'>排水沟的方向，又传来那种有节奏的拍水声。比刚才近了。</span>";
      }
      return desc;
    },
    choices: [
      {
        text: "开始搜查",
        nextScene: xdGarSearchRouter,
        effect: updateTime(2)
      },
      { text: "不搜了，退回去", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-空车": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    text: function(vars) {
      var looted = (vars._garageLootLeft || 0) <= 0;
      if (xdGarSight(vars) === "lit") {
        var models = ["一辆白色的大众polo", "一辆黑色的日产轩逸", "一辆落满灰的别克凯越", "一辆车窗贴满膜的本田飞度"];
        var m = models[Math.floor(Math.random() * models.length)];
        var desc = "是" + m + "。你拉开驾驶座翻了一遍——储物格里只有过期的保险单和几张停车票。方向盘上的灰厚得能写字，这辆车在爆发前就没人动过。";
        if (looted) desc += "\n<span class='think'>该翻的缝都翻过了——这个车库里的车，别指望再翻出吃的。</span>";
        return desc;
      }
      // 全黑/微光：只报触感，不报车型颜色（看不见就是看不见）
      var desc2 = "你摸到的这辆车引擎盖冰凉，灰厚得糊手。储物格、遮阳板、座椅底下，你挨个摸了过去——只有几张摸不出字的票据。什么都没有。";
      if (looted) desc2 += "\n车库里的缝，你感觉自己已经摸了个遍。再想捡吃的，得去别的地方。";
      return desc2;
    },
    choices: [
      { text: "换个位置再搜", nextScene: "新达汇-B1停车场-搜车", effect: updateTime(1) },
      { text: "不搜了", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-捡到吃的": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: function(vars) {
      vars._garageLootLeft = Math.max(0, (vars._garageLootLeft || 0) - 1);
      var gain = Math.random() < 0.5 ? 1 : 2;
      vars.strength = Math.min(10, (vars.strength || 0) + gain);
      return {};
    },
    text: function(vars) {
      var picks = [
        "副驾的遮阳板上夹着两根未开封的能量棒，包装还没瘪——是车里主人落下的。",
        "后排座椅缝里卡着一块真空包装的面包，保质期还差几天才到。",
        "储物格里翻出一小盒午餐肉，拉环完好，罐身上落着灰。"
      ];
      var p = picks[Math.floor(Math.random() * picks.length)];
      return p + "\n你撕开包装，三两口吃了下去。胃里有了东西，手脚重新听使唤了。\n<span class='sys'>【系统提示】体力有所恢复，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "换个位置再搜", nextScene: "新达汇-B1停车场-搜车", effect: updateTime(1) },
      { text: "不搜了", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-出声": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(vars) {
      var desc = "你拉开副驾车门的瞬间——<span class='sfx'>哐当</span>！车门内侧挂着的灭火器支架被带了下来，砸在水泥地上，滚出去老远。\n回音在空旷的车库里荡了三个来回。你僵在原地，听着自己的心跳。";
      if (xdGarSight(vars) === "lit") {
        desc += "\n灯亮着，无处可藏。排水沟那头的拍水声停了一拍——然后变得更密。";
      } else {
        desc += "\n黑暗深处，有什么东西改变了方向。";
      }
      return desc;
    },
    choices: [
      { text: "赶紧退开", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-锁车惊吓": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    text: function(vars) {
      return "你拉开车门——<span class='crit'>一张脸从车里直冲着你抬起来</span>。\n它不知在车里待了多久，干瘪的手指抠着门框往外套。你向后踉跄，后腰撞在旁边的车身上。<span class='sfx'>咚</span>的一声，整个车库都听得见。";
    },
    choices: [
      {
        text: "撒腿就跑",
        nextScene: "新达汇-B1停车场-车库检查",
        effect: updateTime(1, { add: { chasedByZombies: 1 } })
      },
      {
        text: "抄起家伙结果了它",
        showCondition: "hasMeleeWeapon",
        nextScene: "新达汇-B1停车场-搜车-惊吓击杀",
        effect: updateTime(2, { add: { chasedByZombies: 1 } })
      }
    ]
  },

  "新达汇-B1停车场-搜车-惊吓击杀": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: function(vars) {
      var c = combatCost(vars);
      vars.strength = Math.max(0, vars.strength - c);
      vars._lastCombatDrain = c;
      tryBreakWeapon(vars);
      return {};
    },
    text: function(vars) {
      return "你抄起" + (meleeWeaponName(vars) || "手里的家伙") + "，趁它半个身子还卡在车门里，狠狠来了一下。它抽了两下，不动了。\n" + combatDrainText(vars) + "车里没什么值钱的东西——它死前大概翻过一遍了。";
    },
    choices: [
      { text: "离开这里", nextScene: "新达汇-B1停车场-车库检查", effect: updateTime(1) }
    ]
  },

  // ==================== 噪音检查 / 强制驱逐 ====================
  "新达汇-B1停车场-车库检查": {
    image: "images/placeholder.png" /* TODO: images/xindahui/b1ParkingB.png */,
    onEnter: function(vars) {
      vars._garageSearchPending = false; // 本轮搜查结束，下次进搜车重新记起点
      return {};
    },
    text: function(vars) {
      if (vars._garageOps >= 5) {
        return "排水沟那边传来一阵剧烈的翻涌声——水花四溅，然后是什么沉重的东西爬上了地面的声音。你没有回头看。你跑了。";
      }
      if (vars._garageOps >= 3) {
        return "你隐约听到排水沟的方向传来水声——是有节奏的拍打声，不像水流，更像别的东西。一声比一声密。地下停车场不再安静了。";
      }
      return (vars.chasedByZombies > 0)
        ? "你站在原地喘了口气。刚才闹出的动静，回音还在车库里荡——这里已经不算安分了。"
        : "你站在原地喘了口气。到目前为止，你的动静还算克制。";
    },
    choices: [
      {
        text: "必须马上离开！",
        nextScene: "新达汇-B1停车场-强制驱逐",
        showCondition: "_garageOps >= 5"
      },
      {
        text: "回到原地继续探索",
        nextScene: function(v) { return v._garageSearchFrom || XDGAR + "B区"; },
        showCondition: "_garageOps < 5"
      },
      { text: "离开车库", nextScene: "新达汇-B1走廊", showCondition: "_garageOps < 5" }
    ]
  },

  "新达汇-B1停车场-强制驱逐": {
    image: "images/placeholder.png" /* TODO: images/xindahui/b1Corridor.png */,
    text: "你拔腿就跑，穿过主通道、冲过入口平台，一路没有回头。直到站在B1走廊的灯光下，你才敢停下来喘气。\n身后的停车场深处，水声还在回荡。\n<span class='think'>车库里的东西记仇了。今天最好别再进去——过一晚，等它们散了再说。</span>",
    choices: [
      { text: xdGarGo("新达汇-B1走廊", "回到B1走廊", "走进B1走廊"), nextScene: "新达汇-B1走廊", effect: updateTime(1) }
    ]
  },

  // ==================== 上车点火（QTE：失败=死亡） ====================
  "新达汇-B1停车场-上车点火": {
    image: "images/placeholder.png" /* TODO: images/xindahui/ignition.png */,
    onEnter: function(vars) {
      vars._escapeOps = 6;
      vars.chasedByZombies = Math.min(5, (vars.chasedByZombies || 0) + 1);
      return {};
    },
    qte: {
      timeout: "Math.max(3000, 8000 - chasedByZombies * 800)",
      onTimeout: "结局-车库围堵"
    },
    text: function(vars) {
      // QTE 跳过打字机立即计时——正文必须短到能在时限内读完
      return "钥匙就在点火器上。你拧下去——<span class='crit'>引擎炸醒，整个车库都听见了。</span>\n<span class='warn'>排水沟的方向，水声炸开了。</span>挂挡！";
    },
    choices: [
      { text: "挂挡，冲出车位！", nextScene: "新达汇-B1停车场-驾驶-深处掉头" }
    ]
  },

  // ==================== 驾驶逃亡（限定操作次数） ====================
  // 倒计时 _escapeOps=6 起，每移动一格 -1；次数耗尽后再移动 = 围堵 QTE（失败=死亡）。
  // 行车线路成环（外圈+内切横道），路线不唯一；看过疏散图可得方向提示。
  "新达汇-B1停车场-驾驶-深处掉头": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveF.png */,
    onEnter: xdGarDriveEnter,
    text: function(vars) {
      var desc = "你倒车、掉头，车尾扫翻了一排雪糕筒。<span class='sfx'>哐啷</span>——雪糕筒滚出去老远。车头对准来时的车道，车灯把两排车影照得忽明忽暗。";
      desc += xdGarMapHint(vars, "疏散图上的线过了一遍——从深处出去，往东走外圈经主通道到入口平台，是最稳的走法。") + xdGarDriveText(vars);
      return desc;
    },
    choices: [
      { text: "往东，走东北拐角外圈", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-东车道", effect: updateTime(1) },
      { text: "往西，走西侧车道逆行", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-西车道", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-驾驶-东车道": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveEast.png */,
    onEnter: xdGarDriveEnter,
    text: function(vars) {
      var desc = "你沿外圈车道往东北方向开。两侧的车影一模一样——同样的车身、同样的车距，像同一段路在重复。拐角处的柱子上喷着褪色的转向箭头，指向两个方向。";
      desc += xdGarMapHint(vars, "图上的线对得上：这条外圈道一直通向东北拐角，过了拐角，主通道就在正前方。") + xdGarDriveText(vars);
      return desc;
    },
    choices: [
      { text: "拐进主通道", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-主通道", effect: updateTime(1) },
      { text: "切横道抄近路", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-横道", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-驾驶-主通道": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveB.png */,
    onEnter: xdGarDriveEnter,
    text: function(vars) {
      var desc = "主通道比来时宽绰，但车灯的光柱里，<span class='crit'>影子开始从两侧的停车排里渗出来</span>——它们朝着引擎声的方向汇聚，正横穿过你的车道。";
      desc += xdGarMapHint(vars, "主通道尽头就是入口平台——出口坡道在平台的东南角，直行就到。") + xdGarDriveText(vars);
      return desc;
    },
    choices: [
      { text: "直行冲向入口平台", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-入口平台", effect: updateTime(1) },
      { text: "拐横道绕开它们", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-横道", effect: updateTime(1) },
      { text: xdGarGo("新达汇-B1停车场-驾驶-东车道", "掉头回东车道", "掉头去东车道"), condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-东车道", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-驾驶-横道": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveI.png */,
    onEnter: xdGarDriveEnter,
    text: function(vars) {
      var desc = "你切进中段横道。两排立柱贴着后视镜掠过去，车速不敢提起来——这条道窄得只容一台车。";
      desc += xdGarMapHint(vars, "图上标着：横道往东是主通道，往西是西侧车道；主通道离出口更近。") + xdGarDriveText(vars);
      return desc;
    },
    choices: [
      { text: "往东去主通道", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-主通道", effect: updateTime(1) },
      { text: "往西去西侧车道", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-西车道", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-驾驶-西车道": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveG.png */,
    onEnter: xdGarDriveEnter,
    text: function(vars) {
      var desc = "西侧车道贴着旧区的边走。地面开始泛潮，雨刮器扫过一道从地缝里漫出来的水渍——<span class='crit'>排水沟的水正在往上涨，有什么东西顺着车道边的栅栏往外爬</span>。\n一只灰白的手扒上了后保险杠，你猛打方向才把它甩脱；前面车道上横着半截从沟里拖出来的栅栏，你得绕过去。打这里过，就得费这个工夫。";
      desc += xdGarMapHint(vars, "沿西侧车道直行就是入口平台——图上只标了出口在东南角，没标这一段贴着旧区。") + xdGarDriveText(vars);
      return desc;
    },
    choices: [
      // 离开这一格时才付第二次过路费：先读到"费时"，再决定要不要付
      { text: "直行奔入口平台", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-入口平台", effect: updateTime(1, { add: { _escapeOps: -1 } }) },
      { text: "拐横道往东", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-横道", effect: updateTime(1, { add: { _escapeOps: -1 } }) }
    ]
  },

  "新达汇-B1停车场-驾驶-入口平台": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveA.png */,
    onEnter: xdGarDriveEnter,
    text: function(vars) {
      var desc = "入口平台到了——开阔，头顶的应急灯把车漆照出一点反光。出口坡道就在右手边，坡道顶上透下来一线" + (xdGarNight(vars) ? "沉沉的夜色" : "灰白的天光") + "。";
      desc += xdGarMapHint(vars, "出口坡道就在东南角，坡道顶上就是辅路。") + xdGarDriveText(vars);
      return desc;
    },
    choices: [
      { text: "冲上出口坡道！", nextScene: "新达汇-B1停车场-驾驶-坡道口", effect: updateTime(1) },
      { text: xdGarGo("新达汇-B1停车场-驾驶-主通道", "掉头回主通道", "掉头去主通道"), condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-主通道", effect: updateTime(1) },
      { text: xdGarGo("新达汇-B1停车场-驾驶-东车道", "拐回东车道", "拐进东车道"), condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-东车道", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-驾驶-坡道口": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveJ.png */,
    onEnter: xdGarDriveEnter,
    text: function(vars) {
      var desc = "坡道口。收费亭歪在一边，<span class='crit'>断成两截的栏杆还挂在原地</span>——他闯进来时撞断的。坡道顶上透进来的" + (xdGarNight(vars) ? "夜色" : "天光") + "越来越亮。\n身后，水声连成了一片。";
      desc += xdGarMapHint(vars, "过了这根断杆，外面就是辅路。") + xdGarDriveText(vars);
      return desc;
    },
    choices: [
      { text: "油门踩到底——撞开断杆！", nextScene: "新达汇-B1停车场-驾驶-冲出坡道", effect: updateTime(1) },
      { text: "掉头回入口平台", condition: "_escapeOps > 0", elseScene: "新达汇-B1停车场-驾驶-围堵", nextScene: "新达汇-B1停车场-驾驶-入口平台", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-驾驶-围堵": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveSurrounded.png */,
    qte: {
      timeout: "Math.max(3000, 8000 - chasedByZombies * 800)",
      onTimeout: "结局-车库围堵"
    },
    text: function(vars) {
      var fromName = ({
        "新达汇-B1停车场-驾驶-东车道": "东车道",
        "新达汇-B1停车场-驾驶-主通道": "主通道",
        "新达汇-B1停车场-驾驶-横道": "横道",
        "新达汇-B1停车场-驾驶-西车道": "西侧车道",
        "新达汇-B1停车场-驾驶-入口平台": "入口平台",
        "新达汇-B1停车场-驾驶-坡道口": "坡道口"
      })[vars._lastScene] || "车道";
      return "<span class='crit'>你转过一个弯，车灯的光柱尽头——全是影子。</span>\n它们从停车排里、从排水沟的栅栏缝里、从立柱后面涌出来，把" + fromName + "堵得只剩一条缝。前保险杠已经能听到拍打引擎盖的声音。\n孤注一掷——从" + fromName + "一路撞回坡道，找那条缝，冲过去！";
    },
    choices: [
      {
        text: "踩死油门，赌那条缝！",
        nextScene: "新达汇-B1停车场-驾驶-冲出坡道",
        effect: updateTime(1, { add: { strength: -2 }, set: { hurtByZombie: true } })
      }
    ]
  },

  "新达汇-B1停车场-驾驶-冲出坡道": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveRamp.png */,
    text: function(vars) {
      var night = xdGarNight(vars);
      return "你把油门踩穿。车身擦着断杆冲上坡道，<span class='sfx'>哐</span>的一声，断杆飞出去砸在收费亭顶上。\n" + (night ? "夜色灌进挡风玻璃，坡道顶上就是街口。" : "天光灌进挡风玻璃。") + "后视镜里，坡道口的水声渐渐被引擎声盖过去。\n<span class='crit'>你把整个东明街道的地下，甩在了身后。</span>";
    },
    choices: [
      { text: "继续", nextScene: "新达汇车库出口" }
    ]
  },

  // ==================== 出口（辅路） ====================
  "新达汇车库出口": {
    image: "images/placeholder.png" /* TODO: images/xindahui/garageExit.png */,
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.currentPlace = "新达汇";
      vars.currentPos = "车库出口";
      // 若从驾驶链出库，在此交割载具（一次性；步行再来不会重复结算）
      if (vars._visit["新达汇-B1停车场-上车点火"] > 0 && !vars.hasCar) {
        vars.hasCar = true;
        vars.hasEbike = false;
        vars.hasRustyBike = false;
        vars.chasedByZombies = Math.max(0, (vars.chasedByZombies || 0) - 1); // 躲进车里稍微安全一点
      }
      return {};
    },
    text: function(vars) {
      if (vars.hasCar && vars._visit["新达汇-B1停车场-上车点火"] > 0) {
        return "你把车停在辅路边，引擎还散着热。出口坡道在身后张着黑黢黢的口子，断杆耷拉在坡道顶上。\n这辆深灰色的荣威现在是你的了——有车，很多以前要靠腿的地方，如今一脚油门的事。\n辅路往东通向安盛街和环林东路方向，往西的路牌指向金谊广场——但距离不近，大概要走半小时。\n绕回商场正面的喷泉广场只要几分钟。";
      }
      var desc = "你来到新达汇商场背后的一条辅路。旁边是地下车库的出口坡道，铁栅栏半开着，收费亭被撞歪了斜在一边。";
      if (vars.dd >= 3) {
        desc += "\n坡道口的栏杆断成了两截，断口很新——最近有车从这里闯了进去，再没出来。";
      }
      desc += "\n辅路往东通向安盛街和环林东路方向，往西的路牌指向金谊广场——但距离不近，大概要走半小时。\n绕回商场正面的喷泉广场只要几分钟。";
      return desc;
    },
    choices: [
      { text: xdGarGo("新达汇-喷泉广场", "回喷泉广场", "去喷泉广场"), nextScene: "新达汇-喷泉广场", effect: updateTime(3) },
      { text: "往西去金谊广场", nextScene: "金谊广场地面入口", effect: updateTime(30) },
      { text: "进入车库", nextScene: "新达汇-B1停车场A区", effect: updateTime(2) }
    ]
  },

  // ==================== 死亡结局 ====================
  "结局-车库遭遇战": {
    image: "images/hurtByzombie.webp",
    text: function(vars) {
      return "排水沟里爬出来的东西比你想的多。第一只被你砸倒，第二只从侧面扑上来，第三只咬住了你的小腿——你倒下去的时候，看到那辆深灰色的荣威静静停在两步之外，钥匙还插在点火器上。\n<span class='end'>—— 结局：车库遭遇战 ——</span>";
    }
  },

  "结局-车库围堵": {
    image: "images/hurtByzombie.webp",
    text: function(vars) {
      return "引擎的轰鸣引来了整个车库的东西。它们拍打着车窗、压上引擎盖，车灯的光柱里全是晃动的影子。你踩死油门，车身却在原地打滑——一只灰白的手从侧窗探进来，抓住了你的衣领。\n熄火之后，车库里安静得只剩下水声。\n<span class='end'>—— 结局：车库围堵 ——</span>";
    }
  },

});
