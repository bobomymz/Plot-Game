// ========== 新达汇·B1地下停车场（2026-10-02 网格化改造版） ==========
// 9 宫格网状结构（北=上；A B C=北排 / D E F=中排 / G H I=南排，玩家可见名=分区字母，内部 ID 用分区名）。
// 方向系统：_garageFacing 记录玩家朝向（N/E/S/W），分区移动选项一律按 前后左右 相对方位
//   表述（选项只写动词，去处写在正文的立柱漆字里）；步行"转向即走"（移动方向=新朝向），
//   驾驶倒车保持车头朝向（_garageRev 标记）。
// 分区（按网格位）：西车道北段A / 主通道北段B / 车道尽头C（★事故点）/ 西车道南段D /
//   中段枢纽E / 第二停车排F / 入口平台G / 主通道南段H / 杂物拐角I；旧区（低一层）编 J。
// 网格外 POI：配电室（挂中段枢纽防火门）、旧区+涂鸦（挂主通道北段台阶）、疏散图（挂入口平台）。
// 主线不变：Day3 起金谊广场幸存者小明开车进库搬物资，被排水沟丧尸袭击身亡，
//   车（钥匙插在点火器上）留在东北角车道尽头。
// 障碍链：dd>=3 时间门槛 → 配电室接线通电（独立回路，不受商场总闸影响）→ 车旁闪色战斗
//   → 上车点火（引擎声=全场信号）→ 驾驶逃亡（并入网格：_escapeOps 每格 -1，
//   西侧车道贴沟格离开额外 -1，耗尽后再移动=围堵 QTE）→ 入口平台撞断杆出库。
// 随机搜车：未通电/非目标格搜车走加权随机池（空车/即食食品/出声/锁车惊吓）。
// 尸潮密度（波波 10-02 拍板，取代旧 _garageOps 噪音/驱逐）：排水沟 J 区是源头，到过 J 区后激活；
//   步行进格使所在格密度 +1（上限3）、搜车/接线在作案格 +1、跨日每格 -1；
//   满密度格：步行进格=尸潮遭遇（二值闪色：偏差0=击散清零，否则=死）/ 驾驶进格=截停 QTE。
// 方案文档：docs/区域方案-新达汇车库网格化与方向系统.md

var XDGAR = "新达汇-B1停车场";
var XDCELL = "新达汇-B1-";

// 夜间判定（坡道口的"天光"按小时切换；isNight 派生量的同款口径）
function xdGarNight(vars) {
  return vars.hh >= 19 || vars.hh < 6;
}

// ==================== 网格数据（邻接表 = 唯一权威，lint/graph 工具可直接读取） ====================
// 北=上；坐标 x 向东、y 向北。所有边都是双向车行道（邻接表=全部移动边，无表外捷径）。
var XDGRID = {
  "新达汇-B1-西车道北段": { x: 0, y: 2, E: "新达汇-B1-主通道北段", S: "新达汇-B1-西车道南段" },
  "新达汇-B1-主通道北段": { x: 1, y: 2, W: "新达汇-B1-西车道北段", E: "新达汇-B1-车道尽头", S: "新达汇-B1-中段枢纽" },
  "新达汇-B1-车道尽头":   { x: 2, y: 2, W: "新达汇-B1-主通道北段", S: "新达汇-B1-第二停车排" },
  "新达汇-B1-西车道南段": { x: 0, y: 1, N: "新达汇-B1-西车道北段", E: "新达汇-B1-中段枢纽", S: "新达汇-B1-入口平台" },
  "新达汇-B1-中段枢纽":   { x: 1, y: 1, N: "新达汇-B1-主通道北段", W: "新达汇-B1-西车道南段", E: "新达汇-B1-第二停车排", S: "新达汇-B1-主通道南段" },
  "新达汇-B1-第二停车排": { x: 2, y: 1, N: "新达汇-B1-车道尽头", W: "新达汇-B1-中段枢纽", S: "新达汇-B1-杂物拐角" },
  "新达汇-B1-入口平台":   { x: 0, y: 0, N: "新达汇-B1-西车道南段", E: "新达汇-B1-主通道南段" },
  "新达汇-B1-主通道南段": { x: 1, y: 0, W: "新达汇-B1-入口平台", E: "新达汇-B1-杂物拐角", N: "新达汇-B1-中段枢纽" },
  "新达汇-B1-杂物拐角":   { x: 2, y: 0, W: "新达汇-B1-主通道南段", N: "新达汇-B1-第二停车排" }
};

// 贴沟格（西侧车道贴旧区）：驾驶离开时额外 -1 _escapeOps（过路费，离开时才付）
var XD_TRENCH = { "新达汇-B1-西车道北段": true, "新达汇-B1-西车道南段": true };

// 方向工具：N/E/S/W
var XD_CCW = { N: "W", W: "S", S: "E", E: "N" };   // 面朝此方向时，左手边
var XD_CW  = { N: "E", E: "S", S: "W", W: "N" };   // 右手边
var XD_OPP = { N: "S", S: "N", E: "W", W: "E" };   // 正后方
var XD_DIRS = ["N", "E", "S", "W"];

// 分区字母（玩家可见命名）：北排 A/B/C，中排 D/E/F，南排 G/H/I；旧区（低一层）编 J。
// 玩家通过立柱漆字/疏散图认识这些字母；正文一律用"X区"，内部 ID 保持分区名不变。
var XD_LETTER = {
  "新达汇-B1-西车道北段": "A", "新达汇-B1-主通道北段": "B", "新达汇-B1-车道尽头": "C",
  "新达汇-B1-西车道南段": "D", "新达汇-B1-中段枢纽": "E", "新达汇-B1-第二停车排": "F",
  "新达汇-B1-入口平台": "G", "新达汇-B1-主通道南段": "H", "新达汇-B1-杂物拐角": "I",
  "新达汇-B1停车场-旧区": "J"
};

function xdCellName(id) {
  if (XD_LETTER[id]) return XD_LETTER[id] + " 区";
  return id.indexOf(XDCELL) === 0 ? id.slice(XDCELL.length) : id;
}

// 分区指路（立柱漆字）：按照明分两档——
//   lit/torch（通电/手电）：报当前格 + 四向去处（正前/左手边/右手边/身后，与选项槽位同序）；
//   dim（手机微光）：光够不着远处的柱子，只能凑近认出当前格字母，不知道四向通哪里；
//   dark（全黑）：什么也看不见（不生成）。
// withSelf=false 时省略"你此刻在X区"（头句已经报过）。
function xdSignLine(id, v, withSelf) {
  var sight = xdGarSight(v);
  if (sight === "dark") return "";
  if (sight === "dim") {
    return "\n立柱上喷着分区漆字，手机的光只够凑近认出一根——你此刻在「" + xdCellName(id) + "」。远处柱子上的字照不到，前后左右通向哪里，只能走近了看。";
  }
  var facing = (XD_DIRS.indexOf(v._garageFacing) >= 0) ? v._garageFacing : "N";
  var rels = [["正前", facing], ["左手边", XD_CCW[facing]], ["右手边", XD_CW[facing]], ["身后", XD_OPP[facing]]];
  var segs = [];
  for (var i = 0; i < rels.length; i++) {
    var t = XDGRID[id][rels[i][1]];
    if (t) segs.push(rels[i][0] + "是 " + xdCellName(t));
  }
  if (segs.length === 0) return "";
  var head = withSelf ? "立柱上的分区漆字看得清——你此刻在「" + xdCellName(id) + "」：" : "立柱上的分区漆字看得清——";
  return "\n" + head + segs.join("，") + "。";
}

// from 格指向 to 格的绝对方向（两格必须相邻）
function xdDirFrom(fromId, toId) {
  var g = XDGRID[fromId];
  if (!g) return null;
  for (var i = 0; i < XD_DIRS.length; i++) {
    if (g[XD_DIRS[i]] === toId) return XD_DIRS[i];
  }
  return null;
}

// 车库照明四态："lit"=通电 / "torch"=手电 / "dim"=手机微光 / "dark"=全黑
function xdGarSight(vars) {
  if (vars._wiredCorrectly) return "lit";
  if (vars.hasTorch) return "torch";
  if (vars.hasPhone && vars.phoneBattery > 0) return "dim";
  return "dark";
}

// ==================== 尸潮密度系统（波波 10-02 拍板） ====================
// 排水沟（J区）是源头：到过 J 区后激活。激活后步行进格使所在格密度 +1（上限 3），
// 搜车/接线在作案格 +1（替代旧 _garageOps 全局水位）。驾驶不涨密度，但开进满密度格 = 截停 QTE。
// 进格时该格密度已满 → 记忆闪色遭遇（二值：偏差 0=击散该格清零；任何偏差/超时=死）。
// 跨日在 G 格结算：每格密度 -1/天。预警分档写进每格正文（xdGarNoise），满格前必有多轮可见警告。
var XD_DEN = {
  "新达汇-B1-西车道北段": "_garDenA",
  "新达汇-B1-主通道北段": "_garDenB",
  "新达汇-B1-车道尽头": "_garDenC",
  "新达汇-B1-西车道南段": "_garDenD",
  "新达汇-B1-中段枢纽": "_garDenE",
  "新达汇-B1-第二停车排": "_garDenF",
  "新达汇-B1-入口平台": "_garDenG",
  "新达汇-B1-主通道南段": "_garDenH",
  "新达汇-B1-杂物拐角": "_garDenI"
};

function xdGarDenActive(v) {
  return !!(v._visit && v._visit[XDGAR + "-旧区"] > 0);
}

// 格的有效密度 = 存储值 + C 区血腥加成（dd>=3 小明的血把东西引来了；+1 不占存储上限、不可被击散清掉）
function xdGarDen(v, id) {
  var d = v[XD_DEN[id]] || 0;
  if (id === XDCELL + "车道尽头" && v.dd >= 3) d += 1;
  return d;
}

function xdGarDenTotal(v) {
  var sum = 0;
  for (var k in XD_DEN) sum += (v[XD_DEN[k]] || 0);
  return sum;
}

// 进格路由：挂在每个移动选项的 nextScene 上。满密度格：步行→尸潮遭遇 / 驾驶→截停 QTE。
// （引擎 onEnter 无重定向能力，进格瞬间的密度判定借函数式 nextScene 在点击时完成。）
function xdCellEntry(id) {
  return function(v) {
    if (!xdGarDenActive(v) || xdGarDen(v, id) < 3) return id;
    if (v._driving) {
      v._garDriveTarget = id;
      return XDGAR + "-截停";
    }
    v._garFightCell = id;
    return XDGAR + "-尸潮遭遇";
  };
}

// J 区（源头）：密度恒满——进入即巢穴遭遇，打散后当天安静（_garJQuietDay），次日恢复。
function xdJEntry(v) {
  if ((v._garJQuietDay || 0) >= v.dd) return XDGAR + "-旧区";
  v._garFightCell = "J";
  return XDGAR + "-巢穴遭遇";
}

// 噪音/密度统一反馈：按当前格的有效密度分档写进每格正文尾部。
// 满密度格步行进格即遭遇战，"满"档文案只给驾驶路过/击散前驻留时看。
function xdGarNoise(vars, cellId) {
  if (!cellId || !XD_DEN[cellId]) return "";
  var d = xdGarDen(vars, cellId);
  if (d >= 3) return "\n<span class='warn'>水声贴着这条车道的两头炸，栅栏缝里的水面齐着缝沿——这一片已经被它们占满了。</span>";
  if (d === 2) return "\n<span class='warn'>排水沟那头的拍水声一声比一声近，间或混着爪子刮水泥的动静。再在这里转悠，要出事。</span>";
  if (d === 1) return "\n排水沟那头，隐约又有水响了一声。";
  return "";
}

// 随机搜车路由（加权）。搜车会惊扰所在格（搜车 hub onEnter 给起点格密度 +1）；
// 旧的「车道尽头 30% 摸黑遭遇」已并入尸潮密度系统（C 区 dd>=3 血腥加成，满密度进格=遭遇战）。
// __sceneRefs 供 lint_story 补记入边（否则随机池节点会被误判孤立场景）。
function xdGarSearchRouter(vars) {
  var r = Math.random();
  if (r < 0.35) return XDGAR + "-搜车-空车";
  if (r < 0.55) return (vars._garageLootLeft > 0) ? XDGAR + "-搜车-捡到吃的" : XDGAR + "-搜车-空车";
  if (r < 0.80) return XDGAR + "-搜车-出声";
  return XDGAR + "-搜车-锁车惊吓";
}
xdGarSearchRouter.__sceneRefs = [
  XDGAR + "-搜车-空车", XDGAR + "-搜车-捡到吃的",
  XDGAR + "-搜车-出声", XDGAR + "-搜车-锁车惊吓"
];

// 驾驶正文尾部：按剩余次数递进的声音暗示（等候区模式：玩家可见文案不点破机制）
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

// ==================== 分区工厂 ====================
// 每个分区 = 固定四槽位移动选项（前/左/右/后，按当前朝向映射到相邻格，无路的槽位隐藏，移动耗时 5 分钟/格）
// + 本格 POI 选项（步行限定）。驾驶模式：移动扣 _escapeOps，POI 隐藏，入口平台保留冲坡道出口。
// opts: { id, image, trench, lit(v), dark(v), entryHead(v), entryAnchor, poiArr, driveExit }
function xdCellScene(opts) {
  var id = opts.id;
  var grid = XDGRID[id];

  function moveChoice(relDir, absDir, v) {
    var target = grid[absDir];
    if (v._driving) {
      var verb = { front: "向前开", left: "向左打方向", right: "向右打方向", back: "倒车退回" }[relDir];
      var cost = opts.trench ? -2 : -1;   // 贴沟格离开额外 -1（先读到"费工夫"，离开时才付）
      var extra = (relDir === "back") ? { add: { _escapeOps: cost }, set: { _garageRev: true } }
                                      : { add: { _escapeOps: cost } };
      return {
        text: verb,
        nextScene: xdCellEntry(target),
        effect: updateTime(1, extra),
        condition: "_escapeOps > 0",
        elseScene: XDGAR + "-围堵"
      };
    }
    var verb2 = { front: "向前走", left: "往左手边走", right: "往右手边走", back: "转身走" }[relDir];
    return { text: verb2, nextScene: xdCellEntry(target), effect: updateTime(5) };
  }

  var scene = {
    image: opts.image || "images/placeholder.png",
    fixedChoices: true,   // 方位选项不得乱序（引擎 renderChoices 定序开关）
    onEnter: function(v) {
      var from = v._lastScene;
      if (from && from !== id && XDGRID[from]) {
      var d = xdDirFrom(from, id);
      if (!d) {
        // 非相邻跳转（POI/异常回退）：按网格坐标推断大致来向，保证朝向永远有定义
        var gf = XDGRID[from], gt = XDGRID[id];
        if (gf && gt) {
          var dx = gt.x - gf.x, dy = gt.y - gf.y;
          if (dx > 0) d = "E"; else if (dx < 0) d = "W";
          else if (dy > 0) d = "N"; else if (dy < 0) d = "S";
        }
      }
      if (d) {
          if (v._garageRev) {
            v._garageRev = false;   // 驾驶倒车：车头朝向不变
          } else {
            v._garageFacing = d;    // 步行/驾驶前进：面向移动方向
          }
        }
      } else if (XD_DIRS.indexOf(v._garageFacing) < 0) {
        v._garageFacing = "N";
      }
      // 入口平台专属：跨日衰减（每格密度 -1/天）+ 位置遥测
      if (opts.entryAnchor) {
        v.currentPlace = "新达汇";
        v.currentPos = "地下车库";
        var last = (v._garageLastDay === undefined) ? v.dd : v._garageLastDay;
        if (v.dd > last) {
          var gap = v.dd - last;
          var denBefore = xdGarDenTotal(v);
          for (var dk in XD_DEN) {
            v[XD_DEN[dk]] = Math.max(0, (v[XD_DEN[dk]] || 0) - gap);
          }
          v._garageDecayDays = (denBefore > 0) ? gap : 0;
        } else {
          v._garageDecayDays = 0;
        }
        v._garageLastDay = v.dd;
      }
      // 尸潮密度：激活后每次步行进格，本格 +1（上限 3）；驾驶不涨（波波 10-02）；
      // 击散后的余波平静（_garGrace）按次消耗，消耗期内不涨。
      var denKey = XD_DEN[id];
      if (denKey && xdGarDenActive(v) && !v._driving) {
        if ((v._garGrace || 0) > 0) {
          v._garGrace = v._garGrace - 1;
        } else {
          v[denKey] = Math.min(3, (v[denKey] || 0) + 1);
        }
      }
      return {};
    },
    text: function(v) {
      var sight = xdGarSight(v);
      var head;
      if (v._driving) {
        head = (v._lastScene === XDGAR + "-上车点火")
          ? "你倒车、掉头，车尾扫翻了一排雪糕筒。车头对准来时的车道，车灯把两排车影照得忽明忽暗。"
          : "车灯的光柱扫过这片车道。";
      } else if (v._lastScene && XDGRID[v._lastScene] && v._lastScene !== id) {
        head = "";   // 跨格进入不加过渡句——玩家没有绝对方位感，区域描述本身就是到达文本
      } else if (opts.entryHead) {
        head = opts.entryHead(v);
      } else {
        head = "你回到" + xdCellName(id) + "。";
      }
      var body;
      if (v._driving) {
        // 驾驶：车灯当光源，用亮态环境描写
        body = opts.lit(v);
        if (opts.trench) body += "\n半截从沟里拖出来的栅栏横在车道上，你打着方向绕了过去——打这里过，就得费这个工夫。";
        return head + body + xdSignLine(id, v, head.indexOf(xdCellName(id)) < 0) + xdGarDriveText(v);
      }
      body = (sight === "lit" || sight === "torch") ? opts.lit(v) : opts.dark(v);
      return head + body + xdSignLine(id, v, head.indexOf(xdCellName(id)) < 0) + xdGarNoise(v, id);
    },
    choices: function(v) {
      var out = [];
      var facing = (XD_DIRS.indexOf(v._garageFacing) >= 0) ? v._garageFacing : "N";
      var rels = [["front", facing], ["left", XD_CCW[facing]], ["right", XD_CW[facing]], ["back", XD_OPP[facing]]];
      for (var i = 0; i < rels.length; i++) {
        if (!grid[rels[i][1]]) continue;   // 死路方向：槽位隐藏
        out.push(moveChoice(rels[i][0], rels[i][1], v));
      }
      if (v._driving) {
        if (opts.driveExit) out.push(opts.driveExit);
        return out;
      }
      var poi = opts.poiArr || (opts.poi ? opts.poi(v) : []);
      return out.concat(poi);
    }
  };
  var wrap = {};
  wrap[id] = scene;
  return wrap;
}

Object.assign(storyData,

  // ==================== G · 入口平台（南排西 = 网格西南角） ====================
  xdCellScene({
    id: "新达汇-B1-入口平台",
    entryAnchor: true,
    image: "images/placeholder.png" /* TODO: images/xindahui/b1ParkingA.png（亮灯湿痕版） */,
    entryHead: function(v) {
      if (v._lastScene === "新达汇-B1走廊") return "你从B1走廊的连门里钻出来，顺着坡道下到入口的平台。";
      if (v._lastScene === "新达汇车库出口") return "你顺着出口坡道走下去，回到入口的平台。";
      return "你回到 G 区。";
    },
    lit: function(v) {
      var day3 = v.dd >= 3;
      var droveOut = v._visit[XDGAR + "-上车点火"] > 0;
      var desc;
      if (v._wiredCorrectly) {
        desc = "头顶的灯一盏盏亮着，暖黄色的光把坡道口照得通透，几盏应急灯反倒显得可有可无。";
        if (day3) {
          desc += "\n两道新鲜的轮胎印从坡道口一路碾进来，压过积水的地方在灯光下亮得反光——湿痕顺着坡道一路往车库深处去，中间没有断过。";
          if (droveOut) desc += "\n另有一道更新鲜的印子，从库里往外碾出去，正正压过坡道口那截断杆。";
        }
      } else {
        desc = "坡道从这里向上通向出口，头顶几盏应急灯还亮着，昏黄的光勉强照出平台开阔的轮廓。";
        if (day3) desc += "\n地面上有两道轮胎印，从坡道口一路碾进来——压过积水的地方还没干透，是最近才留下的。";
      }
      desc += "\n收费亭歪在坡道边，玻璃碎了大半；亭子侧墙上贴着一张消防疏散图，有机玻璃罩着，还没碎。";
      if (v._garageDecayDays > 0) {
        desc += "\n排水沟那头的水声比上次退了些——隔了" + v._garageDecayDays + "天，它们散了一些。";
      }
      if (xdGarDenActive(v) && xdGarDenTotal(v) >= 4) {
        desc += "\n<span class='warn'>还没往里走你就听见了：车库深处的水声密得像下雨。它们还没散。今天硬闯进去，每一步都是赌。</span>";
      }
      return desc;
    },
    dark: function(v) {
      var desc = "你摸着坡道的护栏走到平台——水泥地在这里展开成一片开阔地，坡度向上收进黑暗里。收费亭的金属框冰凉，玻璃碴子踩在脚下轻响。";
      if (xdGarDenActive(v) && xdGarDenTotal(v) >= 4) {
        desc += "\n<span class='warn'>车库深处的水声密得像下雨。它们还没散。</span>";
      }
      return desc;
    },
    poiArr: [
      { text: "搜查平台边停着的车", nextScene: XDGAR + "-搜车", effect: updateTime(2) },
      { text: "查看消防疏散图", nextScene: XDGAR + "-疏散图", effect: updateTime(1) },
      { text: "沿坡道出库", nextScene: "新达汇车库出口", effect: updateTime(2) },
      { text: function(v) { return (v._visit && v._visit["新达汇-B1走廊"] > 0) ? "回B1走廊" : "去B1走廊"; }, nextScene: "新达汇-B1走廊", effect: updateTime(2) }
    ],
    driveExit: {
      text: "踩死油门，冲上坡道——撞开断杆！",
      nextScene: XDGAR + "-冲出坡道",
      effect: updateTime(1)
    }
  }),

  // ==================== H · 主通道南段（南排中） ====================
  xdCellScene({
    id: "新达汇-B1-主通道南段",
    image: "images/placeholder.png" /* TODO: images/xindahui/b1ParkingB.png */,
    lit: function(v) {
      return "主通道从这里笔直往车库深处去，两侧车位上的家用车落满灰。灯光把通道照出一截纵深，尽头隐在立柱后面。";
    },
    dark: function(v) {
      return "主通道两侧的车排得笔直，指节敲上去，一辆辆都是空膛的回音。头顶的空当里有一缕流动的凉风——从入口那头灌进来，顺着通道一路往深处去。方向感告诉你：这条道纵贯车库，一直往前就是深处。";
    },
    poiArr: [
      { text: "搜查通道两侧的车", nextScene: XDGAR + "-搜车", effect: updateTime(2) }
    ]
  }),

  // ==================== I · 杂物拐角（南排东 = 东南角） ====================
  xdCellScene({
    id: "新达汇-B1-杂物拐角",
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingH.png */,
    lit: function(v) {
      var desc = "拐角处堆着几辆废弃的购物车和一个翻倒的儿童安全座椅。购物车里有一只落满灰的毛绒熊玩偶，半埋在杂物里。旁边的立柱上，有人用马克笔写了两行字：\n“车别乱开。有的不是空的。——302的胖子”";
      desc += "\n杂物堆后面塞着一根带血的撬棍，撬棍底下压着一张折叠的保养单——荣威4S店的，车牌号一栏，写的正是 F 区那辆白色SUV。\n<span class='think'>有人比你更早想过这辆车的主意。没成。</span>";
      return desc;
    },
    dark: function(v) {
      return "拐角处堆着几辆废弃的购物车，你伸手摸到了半只毛绒熊的耳朵。绒毛早被潮气泡硬了，一股旧毛毯的霉味。";
    },
    poiArr: [
      { text: "搜查拐角的车", nextScene: XDGAR + "-搜车", effect: updateTime(2) }
    ]
  }),

  // ==================== D · 西车道南段（中排西，贴沟格） ====================
  xdCellScene({
    id: "新达汇-B1-西车道南段",
    trench: true,
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingG.png */,
    lit: function(v) {
      var desc = "西侧车道贴着 J 区的边走，地面泛潮，一道水渍从地缝里漫出来。半截从沟里拖出来的栅栏横在车道上，看得出有什么东西费过一番力气。";
      if ((xdGarDenActive(v) && xdGarDen(v, id) >= 2) || v._visit[XDGAR + "-上车点火"] > 0) {
        desc += "\n<span class='warn'>车道边的排水沟栅栏缝里，水面比别处高了一截，正贴着缝往外渗。</span>";
      }
      return desc;
    },
    dark: function(v) {
      return "潮气贴着地面涌上来，脚下的水泥黏腻腻的。你抬脚时绊到一截铁栅栏——横在车道中间，边缘带着锈。";
    },
    poiArr: [
      { text: "搜查路边停着的车", nextScene: XDGAR + "-搜车", effect: updateTime(2) }
    ]
  }),

  // ==================== E · 中段枢纽（中排中 = 网格正中心） ====================
  xdCellScene({
    id: "新达汇-B1-中段枢纽",
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingI.png */,
    lit: function(v) {
      var desc = "两排立柱把这片开阔的车区切成田字。中段有一根立柱上刻满了“正”字，一笔一划刻得很深，密密麻麻数不清有多少个——有人在这里数过什么，数了很久。";
      if (v.dd >= 3 && xdGarDen(v, id) >= 2) {
        desc += "\n最底下那个“正”字的最后一笔，刻痕还是新的，露着白茬——有人还在数。";
      }
      desc += "\n第二根立柱后有一扇防火门，关着。门把手上落了层灰，但没上锁——推得开。";
      return desc;
    },
    dark: function(v) {
      return "你贴着立柱往里走，指尖划过一道道深浅不一的凹槽，密得硌手。黑暗里，一根立柱后露出一扇门的轮廓——你摸到了门框和一块褪色的铁皮牌。";
    },
    poiArr: [
      { text: "推开那扇门", nextScene: XDGAR + "-配电室", effect: updateTime(1) },
      { text: "搜查立柱间的车", nextScene: XDGAR + "-搜车", effect: updateTime(2) }
    ]
  }),

  // ==================== F · 第二停车排（中排东） ====================
  xdCellScene({
    id: "新达汇-B1-第二停车排",
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingK.png */,
    lit: function(v) {
      return "主通道旁边是第二排车位，两排车头对着车头，中间只留一条缝。有一辆的后备箱盖开着，像一张等了很久的嘴——箱底垫着一张被水汽洇过的超市传单，纸角朝着 C 区那头翘着，水痕洇开的方向也是。这排车离排水沟远，湿气是从深处飘过来的。\n稍近的一格车位上停着一辆白色荣威SUV，驾驶座的门虚掩着，座位上放着一个空了半截的矿泉水瓶。你检查了钥匙孔——上面有明显的划痕，有人拿东西撬过。方向盘上落了一层薄灰，这辆车从爆发前就没动过了。";
    },
    dark: function(v) {
      return "这里的车两排车头对着车头，缝窄得只能侧身。你侧身挤进去，一绺胶皮味蹭过手背——有辆车的后备箱盖支棱着。摸到的车引擎盖冰凉，车门虚掩着，车里只摸出一个矿泉水瓶和一些票据。没有钥匙。";
    },
    poiArr: [
      { text: "搜查停车排的车", nextScene: XDGAR + "-搜车", effect: updateTime(2) }
    ]
  }),

  // ==================== A · 西车道北段（北排西 = 西北角，贴沟格） ====================
  xdCellScene({
    id: "新达汇-B1-西车道北段",
    trench: true,
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingG2.png */,
    lit: function(v) {
      var desc = "车道靠墙停着一辆银色五菱面包车，后门没有锁，车厢里堆满了纸箱和杂物，方向盘上落满了灰——看灰的厚度，爆发前就没再碰过了。\n这一段贴着 J 区的边，空气比主通道那边更潮，隐隐有水汽的味道。";
      if ((xdGarDenActive(v) && xdGarDen(v, id) >= 2) || v._visit[XDGAR + "-上车点火"] > 0) {
        desc += "\n<span class='warn'>车道边的排水沟栅栏缝里，水面比别处高了一截，正贴着缝往外渗。</span>";
      }
      return desc;
    },
    dark: function(v) {
      return "水声在这一段贴着耳朵，墙根那头的栅栏缝里，水汽扑在手背上。手指碰到一辆车——后门大敞，车厢里的纸箱被潮气泡得发软，一按一个坑。";
    },
    poiArr: [
      { text: "翻后车厢搜一搜", nextScene: XDGAR + "-搜车", effect: updateTime(2) }
    ]
  }),

  // ==================== B · 主通道北段（北排中，旧区台阶） ====================
  xdCellScene({
    id: "新达汇-B1-主通道北段",
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingD.png */,
    lit: function(v) {
      var desc = "主通道到了北头。脚下的地面比南边更潮，一排排水沟的铁栅栏沿着墙根铺过去——栅栏缝隙里能看到浑浊的水面，细微的、有节奏的拍水声从下面传来，一下，一下，不紧不慢。";
      if (v.dd >= 3) {
        desc += "栅栏边的水泥地上有几道拖痕，最深的一道通向台阶口；还有几根栅栏，被从里面顶歪了。";
      }
      desc += "\n墙角有一道下行的台阶口，黑黢黢的通向更低一层——台阶口的柱子上喷着 J 的字样。";
      return desc;
    },
    dark: function(v) {
      return "拍水声在这一带格外清楚，一下，一下，不紧不慢。看不见的时候，这声音显得格外近。你的脚碰到一级向下的台阶——墙角有下行的口子。";
    },
    poiArr: [
      { text: "搜查北头停着的车", nextScene: XDGAR + "-搜车", effect: updateTime(2) },
      { text: "走下台阶，下 J 区", nextScene: xdJEntry, effect: updateTime(1) }
    ]
  }),

  // ==================== C · 车道尽头（北排东 = 东北角 ★事故点） ====================
  xdCellScene({
    id: "新达汇-B1-车道尽头",
    image: "images/placeholder.png" /* TODO: 优先四图之一 images/xindahui/parkingF.png（事故点） */,
    lit: function(v) {
      // 从战斗/摸黑脱身退回时的差异化承接（否则"走到尽头"与"你退了出去"矛盾）
      var ret = (v._lastScene === XDGAR + "-车旁搜身" || v._lastScene === XDGAR + "-车旁搜身-受伤" || v._lastScene === XDGAR + "-尸潮-击散")
        ? "你退回到车库深处。" : "";
      var body;
      // Day3 之前：车还没来，普通角落
      if (v.dd < 3) {
        body = "这里是车道最深的角落，光照不到的地方堆着几个废弃的轮胎架。角落里的车都落满了灰——爆发前就没再动过了。";
      } else if (!v._wiredCorrectly) {
        // Day3+：车在，但没通电。这个分支只有手电玩家会走到（手机微光/全黑走 dark()）
        body = "光柱扫过去——车道尽头的车位上停着一辆车，<span class='crit'>车身上没有灰。</span>驾驶座的门敞开着，看不清车里。\n车旁的排水沟栅栏歪了两根。一个影子伏在车门边，一下一下地动着；光一晃，它抬起头，朝你这边缓缓转过来。\n另一只正从沟里往外爬。";
      // 车库线已点火开走（用本线标记，不用全局 hasCar——王老师线拿车不该擦掉这里的事故点）
      } else if (v._visit[XDGAR + "-上车点火"] > 0) {
        // 车已开走：空车位（关掉二次点火，状态闭环）
        body = "车道尽头的角落空了。地面上留着一圈干干净净的长方形车印，四边带着轮胎碾出的湿边。驾驶座的门大敞着，遮阳板翻落在一旁。\n排水沟的栅栏歪着，栅栏边那具尸体还在，手里攥着半张购物清单。点火器上空空荡荡——车和钥匙，都不在了。";
        if (v.dd >= 5) body += "\n车位的边缘，已经开始落灰了。";
      } else if (v._visit[XDGAR + "-车旁遭遇"] > 0) {
        // 打赢但没马上开走：水声不退，拖延有代价
        if (v.dd >= 5) {
          body = "那辆深灰色的荣威还停在车道尽头的角落。引擎盖早就凉透了，车身侧面的血迹干成了深褐色的壳，空气里的甜腥味比几天前厚了一层。栅栏边的尸体已经蜷成一团认不出的轮廓，车里的手机屏幕黑着。\n驾驶座里，钥匙还插在点火器上——这么多天，谁也没来动过。";
        } else {
          body = "车道尽头的角落里，那辆深灰色的荣威轿车安静地停着。驾驶座的门敞开着，车旁的排水沟栅栏歪了两根，栅栏边摊着一具被啃咬过的尸体。\n驾驶座里，钥匙还插在点火器上。\n<span class='warn'>水声没有退。栅栏缝里，灰白的轮廓贴着水面缓缓挪动——它们缩回了沟里，只是在等。这地方每多待一刻，都是在花代价。</span>";
        }
      } else {
        // 目标车在，战斗未发生
        if (v.dd >= 5) {
          body = "车道尽头那个车位上的，就是那辆深灰色的荣威——车身上没有灰，引擎盖却已经凉透了，车身侧面的血迹干成深褐色的壳，血腥气发酵成一股甜腻的腐味。\n车旁的排水沟栅栏歪了两根，一个影子还伏在车门边，动作慢得像在打盹。栅栏缝里，另一只只露出一截湿漉漉的脊背。";
        } else {
          body = "车道尽头的角落里停着一辆车——<span class='crit'>一辆深灰色的荣威轿车，车身上没有灰。</span>\n驾驶座的门敞开着，车灯熄着，但引擎盖摸上去是温的。车旁的排水沟栅栏歪了两根，一个佝偻的影子正伏在车门边，一下一下地朝车厢里啃咬着什么。\n影子旁边还有一只，正从排水沟里往外爬。";
        }
        if (v._knowsSurvivorCar) {
          body += "\n<span class='think'>长廊的人说过——小明前天开着车出去，到现在没回来。就是它了。</span>";
        }
      }
      return ret + body;
    },
    dark: function(v) {
      if (v.dd < 3) {
        return "你沿着通道一直摸到尽头。手依次划过几辆车的引擎盖——全是凉的，覆着厚厚的灰。这里很久没有车动过了。";
      }
      return "黑暗里传来一种细微的、有节奏的湿润声音，像是什么东西在进食。\n你在黑暗里分不清车位的轮廓——只知道那个方向的空气里，多了一股新鲜的血腥气。";
    },
    poiArr: [
      {
        text: "靠近那辆车",
        showCondition: "dd >= 3 && _wiredCorrectly && !_visit['新达汇-B1停车场-上车点火'] && !_visit['新达汇-B1停车场-车旁遭遇']",
        nextScene: XDGAR + "-车旁遭遇",
        effect: updateTime(1)
      },
      {
        text: "上车",
        showCondition: "dd >= 3 && _wiredCorrectly && !_visit['新达汇-B1停车场-上车点火'] && (_visit['新达汇-B1停车场-车旁搜身'] > 0 || _visit['新达汇-B1停车场-车旁搜身-受伤'] > 0)",
        nextScene: XDGAR + "-上车点火"
      },
      {
        text: "搜查角落的车",
        showCondition: "dd < 3 || !_wiredCorrectly",
        nextScene: XDGAR + "-搜车",
        effect: updateTime(2)
      }
    ]
  }),

  // ==================== 配电室（网格外 POI · 原C区） ====================
  {
  "新达汇-B1停车场-配电室": {
    image: "images/placeholder.png" /* TODO: images/xindahui/powerPanel.png */,
    text: function(v) {
      if (v._wiredCorrectly) return "配电室的灯亮着。墙上的配电箱面板已经合上了——几根重新接好的电线整齐地排列着。没什么需要再做的了。";
      var last = v._lastScene;
      var head;
      if (last === XDGAR + "-接线" || last === XDGAR + "-接线成功" || last === XDGAR + "-接线失败") {
        head = "你退开半步，重新打量这台配电箱。";
      } else {
        head = "你推开防火门，走进停车场附属的配电室。";
      }
      return head + "墙上的配电箱面板掉了一半，几根不同颜色的电线从接口处松脱，垂落在外面。\n如果你能把它们重新接好，应该能恢复这一片的照明。";
    },
    choices: [
      {
        text: "试着把电线接回去",
        nextScene: XDGAR + "-接线",
        effect: updateTime(2),
        showCondition: "!_wiredCorrectly"
      },
      { text: "退回 E 区", nextScene: xdCellEntry("新达汇-B1-中段枢纽"), effect: updateTime(1) }
    ]
  },

  // ==================== 接线谜题 ====================
  "新达汇-B1停车场-接线": {
    image: "images/placeholder.png" /* TODO: images/xindahui/powerPanel.png */,
    onEnter: function(v) {
      // 作案惊扰：动配电箱的动静把东西往 E 区引（+1，上限 3）
      if (xdGarDenActive(v)) {
        v._garDenE = Math.min(3, (v._garDenE || 0) + 1);
      }
      return {};
    },
    text: function(v) {
      var desc = "配电箱里的线头脱落了好几根。你凑近一看——所有电线的外皮都是黑色的，没有颜色标记。\n配电箱盖板内侧贴着一张接线图，但被灰尘和油污盖住了大半。";
      if (v.hasTorch) {
        desc += "\n你打着手电筒，仔细擦掉了盖板上的污渍。接线图清晰地显示着每组线的接口位置——虽然电线没颜色，但图纸标得很清楚。你知道了该怎么接。";
      } else if (v.hasPhone && v.phoneBattery > 0) {
        desc += "\n你借着手机屏的微光辨认图纸。接线图的大半能看清——只剩两处接口的标注被油污盖死。你把看得清的接上，看不清的那两处，只能赌。";
      } else {
        desc += "\n一片漆黑。你只能用手摸着线头和接口的位置，全凭感觉试试了。";
      }
      return desc;
    },
    choices: [
      {
        text: "按图纸指示把线接好——推上电闸",
        nextScene: XDGAR + "-接线成功",
        effect: updateTime(1),
        showCondition: "hasTorch"
      },
      {
        text: "借着微光把线接上——推上电闸",
        nextScene: function() { return Math.random() < 0.6 ? XDGAR + "-接线成功" : XDGAR + "-接线失败"; },
        effect: updateTime(2),
        showCondition: "!hasTorch && hasPhone && phoneBattery > 0"
      },
      {
        text: "摸黑把几根线接在一起",
        nextScene: function() { return Math.random() < 0.3 ? XDGAR + "-接线成功" : XDGAR + "-接线失败"; },
        effect: updateTime(2),
        showCondition: "!hasTorch && !(hasPhone && phoneBattery > 0)"
      },
      { text: "算了，不接", nextScene: XDGAR + "-配电室" }
    ]
  },

  "新达汇-B1停车场-接线成功": {
    image: "images/placeholder.png" /* TODO: images/xindahui/powerPanel.png */,
    onEnter: { set: { _wiredCorrectly: true } },
    text: function(v) {
      if (v._powerOut) {
        return "你推上电闸。灯管闪了两下——然后亮了。\n你愣了一下。保安室拉掉的是商场的总闸，管不到这片——地下车库的照明走配电室自己的回路。灯一盏接一盏地亮起来，暖黄色的光铺满整个车库。\n你终于能看清周围的全貌了。";
      }
      return "你推上电闸。头顶的灯管闪了几下，发出一阵<span class='sfx'>嗡嗡</span>声——然后亮了。暖黄色的灯光驱散了整个车库的黑暗。\n你终于能看清周围的全貌了。";
    },
    choices: [
      { text: "返回配电室", nextScene: XDGAR + "-配电室", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-接线失败": {
    image: "images/placeholder.png" /* TODO: images/xindahui/powerPanel.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: "你把线接上了，但推上电闸的瞬间——<span class='sfx'>啪</span>！一阵火花闪过，灯没亮。你接错了。\n短路的声音在空旷的停车场里回荡……肯定引起了什么东西的注意。你得小心了。",
    choices: [
      { text: "再试一次", nextScene: XDGAR + "-接线", effect: updateTime(2) },
      { text: "算了，不接", nextScene: XDGAR + "-配电室" }
    ]
  },

  // ==================== 旧区（网格外 POI · 低一层，原D区） ====================
  "新达汇-B1停车场-旧区": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingD.png */,
    text: function(v) {
      var sight = xdGarSight(v);
      var desc = "你走下台阶，来到停车场的低层——J 区。地面比上面低了一截，脚下的水泥地湿漉漉的，踩上去有细碎的回声。\n地面上有一排排水沟的铁栅栏——栅栏缝隙里能看到浑浊的水面。";
      if (sight === "lit" || sight === "torch") {
        desc += "灯光斜斜地打下来，水面在昏黄里泛着暗色的光。";
        if (v.dd >= 3) {
          desc += "栅栏边的水泥地上有几道拖痕，最深的一道通向台阶口；还有几根栅栏，被从里面顶歪了。";
        }
        if (v.chasedByZombies > 0) {
          desc += "水面涨上来一截——那阵有节奏的拍水声还在，一道细长的影子贴着栅栏慢慢横移，从这头，到那头。";
        } else {
          desc += "那阵有节奏的拍水声还在，水面下的动静看不分明。";
        }
      } else if (sight === "dim") {
        desc += "手机的微光只够照出最近的一格栅栏。水面下有动静，但你看不清是什么。细微的、有节奏的拍水声从下面传来，一下，一下，不紧不慢。";
      } else {
        desc += "黑暗里你看不清水面，只有一种……细微的、有节奏的拍水声从下面传来。看不见的时候，这声音显得格外近。";
      }
      return desc;
    },
    choices: [
      { text: "仔细看看栅栏上的刻字", nextScene: XDGAR + "-涂鸦" },
      { text: "爬台阶，回主通道北段", nextScene: xdCellEntry("新达汇-B1-主通道北段"), effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-涂鸦": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingD.png */,
    text: function(v) {
      var desc = "你蹲下来看铁栅栏边缘。有人用马克笔在水泥地上写了一行字，字迹潦草但用力：\n“别在车里过夜。它们会从排水沟爬上来。——一个忠告”\n下面还有一行更小的字，后来补的：\n“不听就算了。”\n你站起来，看了一眼排水沟的栅栏。铁条之间的缝隙大约有十厘米宽。足够什么东西伸出来。";
      if (v.dd >= 3) {
        desc += "\n<span class='think'>栅栏边的水泥地上，有几道新鲜的拖痕，一直延伸向台阶口。写这行字的人，恐怕没想到还有人会重蹈覆辙。</span>";
      }
      return desc;
    },
    choices: [
      { text: "离开这里", nextScene: XDGAR + "-旧区" }
    ]
  },

  // ==================== 疏散图（网格外 POI） ====================
  "新达汇-B1停车场-疏散图": {
    image: "images/placeholder.png" /* TODO: images/xindahui/evacuationMap.png */,
    onEnter: { set: { _garageMapSeen: true } },
    text: "你凑近疏散图。有机玻璃罩上积了灰，但图面还清楚：\n整个B1停车场是一块方方正正的九宫格——上排 A、B、C，中排 D、E、F，下排 G、H、I。绿色的疏散箭头从每一格汇向下排：出口坡道在 G 区，出去就是辅路；B1 走廊的连门也开在 G 区；下 J 区的台阶画在 B 区的角落。\n<span class='sys'>【系统提示】你记住了整个车库的方位：上（北）是深处，下（南）是入口。</span>",
    choices: [
      {
        text: "记下了",
        nextScene: function(v) { return v._lastScene || "新达汇-B1-入口平台"; }
      }
    ]
  },

  // ==================== 车旁战斗（2只排水沟丧尸） ====================
  "新达汇-B1停车场-车旁遭遇": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingF.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄", "白"], 7),
    text: function(v) {
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
    text: function(v) {
      var phoneLine = (v.dd >= 5)
        ? "他的手机摔在脚边，屏幕裂成了蛛网，黑着——电池早就耗干了，谁也没有来过。"
        : "他的手机摔在脚边，屏幕裂成了蛛网，还亮着——锁屏壁纸是个笑得很开的小女孩，输入界面停在一条没发出去的短信上：“东西太多，我跑第二趟”\n<span class='term'>信号栏空空如也。</span>";
      var desc = "最后一只抽搐着倒下，不动了。你喘匀了气，才敢看那具尸体。\n是个年轻人，穿一件洗得发白的外套，手里还攥着半张购物清单——新达汇超市的目录，背面用圆珠笔写着一行字：“多的卖给长廊。”\n" + phoneLine + "\n驾驶座里，<span class='crit'>钥匙还插在点火器上</span>——他刚停好车，还没来得及拔。";
      desc += "\n<span class='warn'>车库里回荡着打斗的动静。水声正从四面八方聚拢过来。</span>";
      desc += "\n<span class='sys warn'>【系统提示】体力-1，当前体力：{strength}。</span>";
      return desc;
    },
    choices: [
      { text: "上车，马上走", nextScene: XDGAR + "-上车点火" },
      { text: "先退开，缓一缓", nextScene: xdCellEntry(XDCELL + "车道尽头"), effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-车旁搜身-受伤": {
    image: "images/hurtByzombie.webp",
    onEnter: hurtWinOnEnter({ time: 1 }),
    text: function(v) {
      var phoneLine = (v.dd >= 5)
        ? "他的手机摔在脚边，屏幕裂成了蛛网，黑着——电池早就耗干了，谁也没有来过。"
        : "他的手机屏幕还亮着——锁屏壁纸是个笑得很开的小女孩，输入界面停在一条没发出去的短信上：“东西太多，我跑第二趟”";
      var desc = "你勉强把两只都干掉了——代价是胳膊上添了一道口子，血顺着手腕往下淌。" + hurtCostText(v) + "\n你喘着粗气看那具尸体：年轻人，手里攥着半张购物清单——背面用圆珠笔写着一行字：“多的卖给长廊。”\n" + phoneLine + "\n驾驶座里，<span class='crit'>钥匙还插在点火器上</span>——他刚停好车，还没来得及拔。";
      desc += "\n<span class='warn'>动静已经传出去了。排水沟那头的水声连成了片。</span>";
      return desc;
    },
    choices: [
      { text: "上车，马上走", nextScene: XDGAR + "-上车点火" },
      { text: "先退开，缓一缓", nextScene: xdCellEntry(XDCELL + "车道尽头"), effect: updateTime(1) }
    ]
  },

  // ==================== 尸潮密度遭遇（满密度格伏击 · 二值闪色：偏差0=击散，否则=死） ====================
  // 走格路由 xdCellEntry 在满密度格把 nextScene 切到这里；_garFightCell 记录所在格。
  "新达汇-B1停车场-尸潮遭遇": {
    image: "images/placeholder.png" /* TODO: images/xindahui/hordeAmbush.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄", "白"], 6),
    text: function(v) {
      var cn = xdCellName(v._garFightCell || "");
      return "你刚踏进" + cn + "，水声就在四面炸开了。<span class='crit'>排水沟里的东西已经漫上了车道——不是一个，是一小群。</span>\n它们从车与车的缝隙里挤出来，湿漉漉的影子把你围在立柱边。退路被堵死了。\n集中注意力——凭记忆报出它们的动作节奏，一步都不能错！";
    },
    choices: [
      {
        text: "输入你感觉到的动作节奏",
        input: { placeholder: "例如：3红2蓝" },
        nextScene: flashCombatRouterDeadly(
          "新达汇-B1停车场-尸潮-击散",
          "结局-车库遭遇战"
        ),
        timeout: 18000,
        timeoutScene: "结局-车库遭遇战"
      }
    ]
  },

  "新达汇-B1停车场-尸潮-击散": {
    image: "images/placeholder.png" /* TODO: images/xindahui/hordeAmbush.png */,
    onEnter: function(v) {
      var key = XD_DEN[v._garFightCell];
      if (key) v[key] = 0;   // 打散：这一片的尸潮清空
      v._garGrace = 2;       // 余波平静：接下来 2 次步行进格密度不涨
      v.strength = Math.max(0, (v.strength || 0) - 1);
      return {};
    },
    text: function(v) {
      return "最后一个影子的节奏在你手里断了线——它栽倒在水痕里，不动了。\n余下的水声退了半拍，像潮水从礁石边暂且绕开。<span class='think'>这一片，暂时清空了。但排水沟还在往下渗——它们会慢慢聚回来。</span>\n<span class='sys'>【系统提示】体力-1，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "站稳，继续走", nextScene: function(v) { return v._garFightCell || XDCELL + "中段枢纽"; } }
    ]
  },

  // ==================== J 区巢穴遭遇（源头：密度恒满，打散后当天安静） ====================
  "新达汇-B1停车场-巢穴遭遇": {
    image: "images/placeholder.png" /* TODO: images/xindahui/drainNest.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄", "白"], 7),
    text: function(v) {
      return "台阶下到一半你就听见了——排水沟里的水声密得不正常。<span class='crit'>你往 J 区里迈的第一步，水面就炸了。</span>\n它们从栅栏缝里往外挤，湿漉漉的手扒开铁条——这里是它们的巢，你是闯进来的那个。\n集中注意力——报出它们的动作节奏！";
    },
    choices: [
      {
        text: "输入你感觉到的动作节奏",
        input: { placeholder: "例如：3红2蓝" },
        nextScene: flashCombatRouterDeadly(
          "新达汇-B1停车场-巢穴-占稳",
          "结局-车库遭遇战"
        ),
        timeout: 18000,
        timeoutScene: "结局-车库遭遇战"
      }
    ]
  },

  "新达汇-B1停车场-巢穴-占稳": {
    image: "images/placeholder.png" /* TODO: images/xindahui/drainNest.png */,
    onEnter: function(v) {
      v._garJQuietDay = v.dd;   // 打散巢穴：当天 J 区安静，次日恢复
      v.strength = Math.max(0, (v.strength || 0) - 1);
      return {};
    },
    text: function(v) {
      return "你把扑上来的第一个钉死在栅栏上，剩下的缩回了水面之下。<span class='think'>巢被打散了——但水沟还在。隔一天再来，它们多半又聚回去了。</span>\n<span class='sys'>【系统提示】体力-1，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "走进 J 区", nextScene: XDGAR + "-旧区" }
    ]
  },

  // ==================== 驾驶截停（开进满密度格 · QTE） ====================
  "新达汇-B1停车场-截停": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveSurrounded.png */,
    qte: {
      timeout: "Math.max(3000, 8000 - chasedByZombies * 800)",
      onTimeout: "结局-车库围堵"
    },
    text: function(v) {
      var cn = xdCellName(v._garDriveTarget || XDCELL + "中段枢纽");
      return "车灯的光柱扫进" + cn + "——<span class='crit'>满了。整个格子都是影子，水声从栅栏缝里漫上车道。</span>\n它们认得这声引擎，正从三个方向往车道中间合拢。刹车就是死——只有冲！";
    },
    choices: [
      {
        text: "轰油门，从缝里冲过去！",
        nextScene: function(v) { return v._garDriveTarget || XDCELL + "中段枢纽"; },
        effect: updateTime(1, { add: { strength: -2, chasedByZombies: 1 }, set: { hurtByZombie: true } })
      }
    ]
  },

  // ==================== 随机搜车系统 ====================
  "新达汇-B1停车场-搜车": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: function(v) {
      // 记录本轮搜车起点（链中"换个位置再搜"不覆盖起点；退出搜查时清 pending）
      if (!v._garageSearchPending) {
        v._garageSearchFrom = v._lastScene || XDCELL + "主通道南段";
        v._garageSearchPending = true;
      }
      // 作案惊扰：搜车的动静把东西往起点格引（+1，上限 3）
      var sk = XD_DEN[v._garageSearchFrom];
      if (sk && xdGarDenActive(v)) {
        v[sk] = Math.min(3, (v[sk] || 0) + 1);
      }
      return {};
    },
    text: function(v) {
      var sight = xdGarSight(v);
      var desc = (sight === "lit")
        ? "你放轻脚步，靠近最近的一排车。灯亮着，能看清车牌和车型，翻找起来也快得多。"
        : (sight === "torch")
          ? "你放轻脚步，靠近最近的一排车。手电的光柱罩住一排车头，车牌和车型看得清，翻找起来也快——只是光柱外的地方，黑得更深了。"
          : "你放轻脚步，靠近最近的一辆车。黑暗里只能靠手摸——车门把手、车窗缝、储物格。每一次拉拽都可能出声。";
      var fromDen = (v._garageSearchFrom && XD_DEN[v._garageSearchFrom]) ? xdGarDen(v, v._garageSearchFrom) : 0;
      if (fromDen >= 2) {
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
      { text: "不搜了，退回去", nextScene: XDGAR + "-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-空车": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    text: function(v) {
      var looted = (v._garageLootLeft || 0) <= 0;
      if (xdGarSight(v) === "lit" || xdGarSight(v) === "torch") {
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
      { text: "换个位置再搜", nextScene: XDGAR + "-搜车", effect: updateTime(1) },
      { text: "不搜了", nextScene: XDGAR + "-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-捡到吃的": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: function(v) {
      v._garageLootLeft = Math.max(0, (v._garageLootLeft || 0) - 1);
      var gain = Math.random() < 0.5 ? 1 : 2;
      v.strength = Math.min(10, (v.strength || 0) + gain);
      return {};
    },
    text: function(v) {
      var picks = [
        "副驾的遮阳板上夹着两根未开封的能量棒，包装还没瘪——是车里主人落下的。",
        "后排座椅缝里卡着一块真空包装的面包，保质期还差几天才到。",
        "储物格里翻出一小盒午餐肉，拉环完好，罐身上落着灰。"
      ];
      var p = picks[Math.floor(Math.random() * picks.length)];
      return p + "\n你撕开包装，三两口吃了下去。胃里有了东西，手脚重新听使唤了。\n<span class='sys'>【系统提示】体力有所恢复，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "换个位置再搜", nextScene: XDGAR + "-搜车", effect: updateTime(1) },
      { text: "不搜了", nextScene: XDGAR + "-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-出声": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(v) {
      var desc = "你拉开副驾车门的瞬间——<span class='sfx'>哐当</span>！车门内侧挂着的灭火器支架被带了下来，砸在水泥地上，滚出去老远。\n回音在空旷的车库里荡了三个来回。你僵在原地，听着自己的心跳。";
      var soundSight = xdGarSight(v);
      if (soundSight === "lit") {
        desc += "\n灯亮着，无处可藏。排水沟那头的拍水声停了一拍——然后变得更密。";
      } else if (soundSight === "torch") {
        desc += "\n手电的光柱晃过去，立柱间一览无余——也无处可藏。排水沟那头的拍水声停了一拍——然后变得更密。";
      } else {
        desc += "\n黑暗深处，有什么东西改变了方向。";
      }
      return desc;
    },
    choices: [
      { text: "赶紧退开", nextScene: XDGAR + "-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-锁车惊吓": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    text: function(v) {
      return "你拉开车门——<span class='crit'>一张脸从车里直冲着你抬起来</span>。\n它不知在车里待了多久，干瘪的手指抠着门框往外套。你向后踉跄，后腰撞在旁边的车身上。<span class='sfx'>咚</span>的一声，整个车库都听得见。";
    },
    choices: [
      {
        text: "撒腿就跑",
        nextScene: XDGAR + "-车库检查",
        effect: updateTime(1, { add: { chasedByZombies: 1 } })
      },
      {
        text: "抄起家伙结果了它",
        showCondition: "hasMeleeWeapon",
        nextScene: XDGAR + "-搜车-惊吓击杀",
        effect: updateTime(2, { add: { chasedByZombies: 1 } })
      }
    ]
  },

  "新达汇-B1停车场-搜车-惊吓击杀": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    onEnter: function(v) {
      var c = combatCost(v);
      v.strength = Math.max(0, v.strength - c);
      v._lastCombatDrain = c;
      tryBreakWeapon(v);
      return {};
    },
    text: function(v) {
      return "你抄起" + (meleeWeaponName(v) || "手里的家伙") + "，趁它半个身子还卡在车门里，狠狠来了一下。它抽了两下，不动了。" + combatDrainText(v) + "\n车里没什么值钱的东西——它死前大概翻过一遍了。";
    },
    choices: [
      { text: "离开这里", nextScene: XDGAR + "-车库检查", effect: updateTime(1) }
    ]
  },

  // ==================== 搜车链收口（回到原地） ====================
  "新达汇-B1停车场-车库检查": {
    image: "images/placeholder.png" /* TODO: images/xindahui/b1ParkingB.png */,
    onEnter: function(v) {
      v._garageSearchPending = false; // 本轮搜查结束，下次进搜车重新记起点
      return {};
    },
    text: function(v) {
      var fromDen = (v._garageSearchFrom && XD_DEN[v._garageSearchFrom]) ? xdGarDen(v, v._garageSearchFrom) : 0;
      if (xdGarDenActive(v) && fromDen >= 2) {
        return "你站在原地喘了口气。" + (v.chasedByZombies > 0 ? "刚才的回音还没散，" : "") + "起点那片的水声已经贴上立柱了——回去的路上，未必太平。";
      }
      return (v.chasedByZombies > 0)
        ? "你站在原地喘了口气。刚才闹出的动静，回音还在车库里荡——这里已经不算安分了。"
        : "你站在原地喘了口气。到目前为止，你的动静还算克制。";
    },
    choices: [
      {
        text: "回到原地继续探索",
        nextScene: function(v) { return xdCellEntry(v._garageSearchFrom || XDCELL + "主通道南段")(v); }
      }
      // 注意：这里不放"离开车库"直跳——车库的两个出口（入口平台→B1走廊/坡道出库）
      // 结算点传送会绕开既有线路；玩家从原地沿路走到入口平台出去。
      // 旧 _garageOps>=5 的"必须马上离开/强制驱逐"已随噪音系统退役（波波 10-02：危险改走尸潮密度）。
    ]
  },

  // ==================== 上车点火（QTE：失败=死亡） ====================
  "新达汇-B1停车场-上车点火": {
    image: "images/placeholder.png" /* TODO: images/xindahui/ignition.png */,
    onEnter: function(v) {
      v._escapeOps = 6;
      v._driving = true;   // 进入驾驶模式：分区选项切换为驾驶语义
      v.chasedByZombies = Math.min(5, (v.chasedByZombies || 0) + 1);
      return {};
    },
    qte: {
      timeout: "Math.max(3000, 8000 - chasedByZombies * 800)",
      onTimeout: "结局-车库围堵"
    },
    text: function(v) {
      // QTE 跳过打字机立即计时——正文必须短到能在时限内读完
      return "钥匙就在点火器上。你拧下去——<span class='crit'>引擎炸醒，整个车库都听见了。</span>\n<span class='warn'>排水沟的方向，水声炸开了。</span>挂挡！";
    },
    choices: [
      { text: "挂挡，冲出车位！", nextScene: xdCellEntry(XDCELL + "车道尽头") }
    ]
  },

  // ==================== 驾驶逃亡（并入网格：每移动一格 -1） ====================
  // 倒计时 _escapeOps=6 起，每移动一格 -1（西侧车道贴沟格离开额外 -1）；次数耗尽后再移动 = 围堵 QTE。
  // 网格成环，路线不唯一（最短 4 格：车道尽头→…→入口平台）；看过疏散图有方位定位加成。
  "新达汇-B1停车场-围堵": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveSurrounded.png */,
    qte: {
      timeout: "Math.max(3000, 8000 - chasedByZombies * 800)",
      onTimeout: "结局-车库围堵"
    },
    text: function(v) {
      var fromName = (v._lastScene && XDGRID[v._lastScene]) ? xdCellName(v._lastScene) : "车道";
      return "<span class='crit'>你转过一个弯——" + fromName + "的尽头，车灯的光柱里全是影子。</span>\n它们从停车排里、从排水沟的栅栏缝里、从立柱后面涌出来，把" + fromName + "堵得只剩一条缝。前保险杠已经能听到拍打引擎盖的声音。\n孤注一掷——从" + fromName + "一路撞回坡道，找那条缝，冲过去！";
    },
    choices: [
      {
        text: "踩死油门，赌那条缝！",
        nextScene: XDGAR + "-冲出坡道",
        effect: updateTime(1, { add: { strength: -2 }, set: { hurtByZombie: true } })
      }
    ]
  },

  "新达汇-B1停车场-冲出坡道": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveRamp.png */,
    text: function(v) {
      var night = xdGarNight(v);
      return "你把油门踩穿。车身擦着断杆冲上坡道，<span class='sfx'>哐</span>的一声，断杆飞出去砸在收费亭顶上。\n" + (night ? "夜色灌进挡风玻璃，坡道顶上就是街口。" : "天光灌进挡风玻璃。") + "后视镜里，坡道口的水声渐渐被引擎声盖过去。\n<span class='crit'>你把整个东明街道的地下，甩在了身后。</span>";
    },
    choices: [
      { text: "继续", nextScene: "新达汇车库出口" }
    ]
  },

  // ==================== 出口（辅路） ====================
  "新达汇车库出口": {
    image: "images/placeholder.png" /* TODO: images/xindahui/garageExit.png */,
    onEnter: function(v) {
      v.showZombies = true;
      v.currentPlace = "新达汇";
      v.currentPos = "车库出口";
      v._driving = false;   // 出库即脱离驾驶模式（步行再来不会带着车的状态）
      // 若从驾驶链出库，在此交割载具（一次性；步行再来不会重复结算）
      if (v._visit[XDGAR + "-上车点火"] > 0 && !v.hasCar) {
        v.hasCar = true;
        v.hasEbike = false;
        v.hasRustyBike = false;
        v.chasedByZombies = Math.max(0, (v.chasedByZombies || 0) - 1); // 躲进车里稍微安全一点
      }
      return {};
    },
    text: function(v) {
      if (v.hasCar && v._visit[XDGAR + "-上车点火"] > 0) {
        return "你把车停在辅路边，引擎还散着热。出口坡道在身后张着黑黢黢的口子，断杆耷拉在坡道顶上。\n这辆深灰色的荣威现在是你的了——有车，很多以前要靠腿的地方，如今一脚油门的事。\n辅路往东通向安盛街和环林东路方向，往西的路牌指向金谊广场——但距离不近，大概要走半小时。\n绕回商场正面的喷泉广场只要几分钟。";
      }
      var desc = "你来到新达汇商场背后的一条辅路。旁边是地下车库的出口坡道，铁栅栏半开着，收费亭被撞歪了斜在一边。";
      if (v.dd >= 3) {
        desc += "\n坡道口的栏杆断成了两截，断口很新——最近有车从这里闯了进去，再没出来。";
      }
      desc += "\n辅路往东通向安盛街和环林东路方向，往西的路牌指向金谊广场——但距离不近，大概要走半小时。\n绕回商场正面的喷泉广场只要几分钟。";
      return desc;
    },
    choices: [
      { text: "去喷泉广场", nextScene: "新达汇-喷泉广场", effect: updateTime(3) },
      { text: "往西去金谊广场", nextScene: "金谊广场地面入口", effect: updateTime(30) },
      { text: "进入车库", nextScene: XDCELL + "入口平台", effect: updateTime(2) }
    ]
  },

  // ==================== 死亡结局 ====================
  "结局-车库遭遇战": {
    image: "images/hurtByzombie.webp",
    text: function(v) {
      return "排水沟里爬出来的东西比你想的多。第一只被你砸倒，第二只从侧面扑上来，第三只咬住了你的小腿——你倒下去的时候，看到那辆深灰色的荣威静静停在两步之外，钥匙还插在点火器上。\n<span class='end'>—— 结局：车库遭遇战 ——</span>";
    }
  },

  "结局-车库围堵": {
    image: "images/hurtByzombie.webp",
    text: function(v) {
      return "引擎的轰鸣引来了整个车库的东西。它们拍打着车窗、压上引擎盖，车灯的光柱里全是晃动的影子。你踩死油门，车身却在原地打滑——一只灰白的手从侧窗探进来，抓住了你的衣领。\n熄火之后，车库里安静得只剩下水声。\n<span class='end'>—— 结局：车库围堵 ——</span>";
    }
  }

});
