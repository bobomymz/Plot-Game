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

// 绝对方位 → 相对方位（玩家只有朝向感，正文要写"正前/身后/左手边/右手边"，不能写东南西北）
function xdRelName(facing, absDir) {
  var f = (XD_DIRS.indexOf(facing) >= 0) ? facing : "N";
  if (absDir === f) return "正前";
  if (absDir === XD_OPP[f]) return "身后";
  if (absDir === XD_CCW[f]) return "左手边";
  return "右手边";
}

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

// 分区指路（立柱漆字）：按照明分四档——
//   lit（独立回路通电）：顶灯亮着，抬头就能认当前格 + 四向去处（与选项槽位同序）
//   torch（手电）：光柱照到哪才看得见哪，也能认出四向
//   drive（车灯）：驾驶态专属光源——车头灯扫过柱面（开车时双手在方向盘，手电/手机都用不了）
//   dim（手机微光）：光够不着远处的柱子，只能凑近认出当前格字母，不知道四向通哪里
//   dark（全黑）：什么也看不见（不生成）
// withSelf=false 时省略"你此刻在X区"（头句已经报过），只出四向句。
// 表述随机化（波波 10-03）：每档多个模板随机抽取——9 格会反复经过，固定句式观感很差。
// ⚠每档至少 2 个模板，"随机"才有意义（自测第 7 节按收集到的变体数守着）。
var XD_SIGN_SELF = {           // {self} = 当前格名（「A 区」）
  lit: [
    "立柱上的分区漆字看得清——你此刻在「{self}」。",
    "顶灯把这片照得够亮。旁边柱子上喷着分区号，抬头就能认出这里是「{self}」。",
    "你抬头确认了一下柱面——白漆刷的分区号，这里是「{self}」。"
  ],
  torch: [
    "手电的光扫过柱子，照亮了上面的漆字——「{self}」。",
    "你把手电往柱面上照了照。白漆反着光跳出来：这里是「{self}」。",
    "光柱扫过去，柱子上的编号亮了一瞬——{self}。"
  ],
  drive: [
    "车灯掠过柱面，照出一串分区漆字——这里是「{self}」。",
    "车头灯打在旁边的柱子上，编号被照亮了一下：{self}。"
  ],
  dim: [
    "立柱上喷着分区漆字，手机的光只够凑近认出一根——你此刻在「{self}」。",
    "你把手机贴到柱面上，屏幕那点亮光勉强照出一个 {self}。",
    "凑到最近的一根柱子前，屏幕的光只够照亮几个字：{self}。"
  ]
};
var XD_SIGN_DIR = {            // {dirs} = 四向去处列表（"正前是 B 区，右手边是 F 区"）
  lit: [
    "柱子上还标着去处：{dirs}。",
    "顺着车道望过去，能看清岔向哪边：{dirs}。",
    "漆字下面压着一行更小的字，写的是通向哪里：{dirs}。"
  ],
  torch: [
    "光往外扩一圈，还能照见别的柱子：{dirs}。",
    "你把手电往两头各晃了一下：{dirs}。",
    "光柱不够长，但相邻几根上的去处还是认出来了：{dirs}。"
  ],
  drive: [
    "车灯顺着车道扫出去，照见：{dirs}。",
    "光柱一路撞见的柱面都写着去处：{dirs}。"
  ]
};
// dim 档补一句"看不清方向"的限制说明（本句不含占位符，每次都给）
var XD_SIGN_DIM_LIMIT = [
  "远处柱子上的字照不到，前后左右通向哪里，只能走近了看。",
  "再远一截就黑了——别的地方通向哪里，得走过去才知道。",
  "这点光撑不到下一根柱子。要去别处，只能摸着走。"
];
function xdSignPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function xdSignFill(tpl, name, dirs) {
  return tpl.split("{self}").join(name).split("{dirs}").join(dirs);
}

function xdSignLine(id, v, withSelf) {
  // ⚠驾驶态单独成档：开车时光源是车灯，不受 hasTorch/hasPhone 影响（旧实现会误判成 dark 而漏掉指路）
  var mode = v._driving ? "drive" : xdGarSight(v);
  if (mode === "dark") return "";
  var name = xdCellName(id);
  if (mode === "dim") {
    var dOut = withSelf ? "\n" + xdSignFill(xdSignPick(XD_SIGN_SELF.dim), name, "") : "";
    return dOut + "\n" + xdSignPick(XD_SIGN_DIM_LIMIT);
  }
  var facing = (XD_DIRS.indexOf(v._garageFacing) >= 0) ? v._garageFacing : "N";
  var rels = [["正前", facing], ["左手边", XD_CCW[facing]], ["右手边", XD_CW[facing]], ["身后", XD_OPP[facing]]];
  var segs = [];
  for (var i = 0; i < rels.length; i++) {
    var t = XDGRID[id][rels[i][1]];
    if (t) segs.push(rels[i][0] + "是 " + xdCellName(t));
  }
  if (segs.length === 0) return "";
  var dirs = segs.join("，");
  var s = withSelf ? "\n" + xdSignFill(xdSignPick(XD_SIGN_SELF[mode]), name, dirs) : "";
  return s + "\n" + xdSignFill(xdSignPick(XD_SIGN_DIR[mode]), name, dirs);
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

// 密度系统是否已被惊动：到过 J 区 / 点过火 / 带着追兵钻进库内，三者任一。
// ⚠前两条都能靠 _visit[旧区] 表达，第三条不行——带尾巴进库确实惊动了尸潮，但你人没去过排水沟，
//   拿 _visit[旧区] 顶替会让 B 区台阶口提前叫出"J 区"这个地名（穿帮）。所以单独一个 _garDenAwake。
function xdGarDenActive(v) {
  if (v._garDenAwake) return true;
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

// ==================== 追兵 ⇄ 车库密度 换算闸门（波波 10-03 拍板） ====================
// 车库内一律用尸潮密度表达威胁，不再直接加减 chasedByZombies；只在进出车库时做一次换算：
//   进库：尾巴跟到坡道口就散了 → G 区密度 += min(2, chased)，chased 清零
//         （封闭空间甩尾巴是成立的战术，代价是库内寸步难行、出来还要再付一笔）
//   出库：库里惊动了多少带出来多少 → chased += (G 区密度 3→+2 / 1~2→+1 / 0→+0)，G 区清零
//   驾驶冲出坡道：chased +0（正文写死"甩在了身后"），G 区同样清零
// 边界：步行层通往外界只有 G 区的两条边（沿坡道出库 / 去回B1走廊），所以闸门只挂 G 区。
// ⚠出库累加封顶 4 不碰 5：chasedByZombies>=5 是即死全局触发器，不该由"跨过出口这一步"瞬间造成。
function xdGarIsOutside(id) {
  return !id || (!XDGRID[id] && id.indexOf(XDGAR) !== 0);
}

// 给某格 +n（沿用统一口径：没惊动过排水沟就不记账；上限 3，与步行进格一致）
function xdGarDenBump(v, cellId, n) {
  if (!cellId || !XD_DEN[cellId] || !xdGarDenActive(v)) return;
  var k = XD_DEN[cellId];
  v[k] = Math.min(3, (v[k] || 0) + (n || 1));
}

// 上车点火专用：引擎炸醒整个车库——不判"是否惊动过排水沟"（这是硬信号，等于把源头一起炸醒）
function xdGarDenSurge(v, n) {
  v._visit = v._visit || {};
  v._visit[XDGAR + "-旧区"] = Math.max(1, v._visit[XDGAR + "-旧区"] || 0);
  v._garDenAwake = true;
  for (var k in XD_DEN) v[XD_DEN[k]] = Math.min(3, (v[XD_DEN[k]] || 0) + (n || 1));
}

// 玩家此刻所站的分格——全车库唯一的"当前位置"可信来源。
// ⚠⚠绝不能用 v._lastScene 顶替：引擎的 _lastScene 语义是「上一个渲染完成的场景」
//    （engine.js renderScene 开头 gameState._lastScene = lastRenderedScene，写进去的是旧 id）。
//    站在 H 区时它记的是来处的 G 区——拿它当"当前格"会把密度加错格、回程还会把人送回上一格。
//    2026-10-03 用真实引擎跑序列（走廊→G→H）实测证实。
// 兜底两级：旧存档没有这个键 → 退回 _lastScene（若它恰好是格子）→ 再回落到主通道南段。
function xdGarCurCell(v) {
  if (v._garageCurCell && XD_DEN[v._garageCurCell]) return v._garageCurCell;
  if (v._lastScene && XD_DEN[v._lastScene]) return v._lastScene;
  return XDCELL + "主通道南段";
}

// 进库结算：挂 G 区 onEnter，仅当来源是库外场景时触发
// 返回是否真的结算过（true = 本次进库带了尾巴）。
// ⚠调用方要读这个返回值：结算过的那一脚**不再叠加"步行进格 +1"**——尾巴本身就是这笔动静，
//   叠上去的话 chased>=2 一进门就把 G 区顶到 3（满），出门还得先打一场，等于"躲进车库"直接变死刑。
function xdGarEnterSettle(v) {
  var ch = v.chasedByZombies || 0;
  if (ch <= 0 || !xdGarIsOutside(v._lastScene)) return false;
  // 尾巴跟着钻进封闭车库 = 尸潮被惊动（等价于下过 J 区）。不打开这个开关的话，
  // G 区密度会照涨、视觉档照写"站了好几个"，但 xdCellEntry 因未激活而一律放行——白洗。
  v._garDenAwake = true;
  v._garDenG = Math.min(3, (v._garDenG || 0) + Math.min(2, ch));
  v.chasedByZombies = 0;
  return true;
}

// 出库结算：extra===0 用于驾驶冲出坡道（甩在身后，不带尾巴）
// ⚠凡是"人离开车库"的路径都必须经过这里（G 区两个步行出口 / 驾驶冲出坡道 / 夜里被强制拉去过夜），
//   所以它顺手把两个状态也一起清掉：
//   _garageCurCell = ""  → 人不站在任何格子里了（夜里判定"人还在库里"就看这个键）
//   _driving = false     → 脱离驾驶态。19 点全局触发器会在开车途中把人直接拉去过夜，
//                          不经过任何出口节点；不在这里清，第二天再进库格子仍按驾驶生成选项
//                          （搜查和配电室消失、移动改扣 _escapeOps），但车早就没了。
function xdGarExitSettle(v, extra) {
  var d = v._garDenG || 0;
  var add = (extra === 0) ? 0 : (d >= 3 ? 2 : (d >= 1 ? 1 : 0));
  if (add > 0) v.chasedByZombies = Math.min(4, (v.chasedByZombies || 0) + add);
  v._garDenG = 0;   // 尾巴跟着出去了，坡道口这片散了
  v._garageCurCell = "";
  v._driving = false;
}

// 出库选项：nextScene 包一层，点击时结算再跳（__sceneRefs 供 lint 补入边）
// ⚠满密度的坡道口走不出去：旧实现只有"走进下一格"的 xdCellEntry 查密度，而人是从库外直接落进 G 区的
//   （不经 xdCellEntry），于是"甩进车库的代价"可以从满员的坡道口白走出去。这里补一道出向闸门：
//   满格时先在本格接战，击散后（G 区清零）才走得掉。
// outPos：出库后要把 currentPos 从"地下车库"改掉——B1走廊自身 onEnter 不设 currentPos，
//   不改的话夜里会误判"人还在库里"（新达汇车库出口的 onEnter 自己会设，不用传）。
function xdGarExitTo(destId, outPos) {
  var f = function(v) {
    if (xdGarDenActive(v) && xdGarDen(v, XDCELL + "入口平台") >= 3) {
      v._garFightCell = XDCELL + "入口平台";
      return XDGAR + "-尸潮遭遇";
    }
    xdGarExitSettle(v);
    if (outPos) v.currentPos = outPos;
    return destId;
  };
  f.__garExit = true;
  f.__sceneRefs = [destId, XDGAR + "-尸潮遭遇"];
  return f;
}

// 搜车链出声后跳转：把动静记在本轮搜车的起点格（搜车本身已在 xdGarSearchGo 记过一笔）
function xdGarNoiseTo(destId) {
  var f = function(v) { xdGarDenBump(v, v._garageSearchFrom); return destId; };
  f.__sceneRefs = [destId];
  return f;
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
// ⚠这是「无光档」——纯听觉（水声/拍水声），黑着也成立。有光时改走 xdGarSightDen（视觉档）。
// ⚠满档（d>=3）步行进格即遭遇战，只有两种时机能读到：驾驶路过、或在格内闹出动静把本格涨满后驻留。
function xdGarNoise(vars, cellId) {
  if (!cellId || !XD_DEN[cellId]) return "";
  var d = xdGarDen(vars, cellId);
  if (d >= 3) return "\n<span class='warn'>水声贴着这条车道的两头炸，栅栏缝里的水面齐着缝沿——这一片已经被它们占满了。</span>";
  if (d === 2) return "\n<span class='warn'>排水沟那头的拍水声一声比一声近，间或混着爪子刮水泥的动静。再在这里转悠，要出事。</span>";
  if (d === 1) return "\n排水沟那头，隐约又有水响了一声。";
  return "";
}

// ==================== 密度描写·视觉档（波波 10-03 拍板） ====================
// 对标全局的 describeZombieWave：按当前格密度分档，每档多个变体（9 格会反复经过，防刷屏）。
// 与 describeZombieWave 的三点不同：
//   ① 只描述「这一片」，不描述「你身后跟了多少」——车库密度是分区级的，不是全局追兵；
//   ② 报程度不报数字（波波拍板）——密度是 0~3 的抽象值，坐实成"三只"会和二值闪色的设定打架；
//   ③ 只在有光时给（通电 lit / 手电 torch / 驾驶车灯），全黑与手机微光档走 xdGarNoise 听觉档。
// ⚠排版铁律：crit 是强强调，≤24 字且含否定词（没有/没能/并未…）一律不上——满档两句都避开了否定。
var XD_SEE_DEN = [
  null, // 0 静默（波波 10-03）：安静就是安静，不刷描写——干净的车道不需要一句"这里是空的"来确认。
        //   ⚠只关掉「当前格」这一句，邻格提示照常给（xdGarNeighborHint 独立判定），
        //     所以"本格安静但右边车道堵着"这种最有价值的信息不会跟着一起消失。
  [ // 1 零星
    "\n车道那头有一两个影子在慢慢挪。它们还没往这边看。",
    "\n两排车之间立着个东西，晃了一下。看不清它是站着的还是靠着车。",
    "\n光照到的边缘，有个影子歪了歪，又不动了。"
  ],
  [ // 2 聚集
    "\n<span class='warn'>这一片已经站了好几个丧尸。它们挤在车缝里，肩膀挨着肩膀，慢慢朝这边转过来。</span>",
    "\n<span class='warn'>车道两侧都立着丧尸，数量不少。光照过去，好几张脸同时抬了起来。</span>",
    "\n<span class='warn'>你数不清有多少丧尸——只知道这片车道里，能下脚的地方不多了。</span>"
  ],
  [ // 3 满（驾驶路过 / 格内涨满后驻留才能读到）
    "\n<span class='crit'>整条车道全是丧尸，它们一起转过头来。</span>",
    "\n<span class='crit'>这一片挤满了，从这头一直排到那头。</span>"
  ]
];
function xdGarSightDen(v, cellId) {
  if (!cellId || !XD_DEN[cellId]) return "";
  var d = Math.min(3, xdGarDen(v, cellId));
  var pool = XD_SEE_DEN[d];
  if (!pool || pool.length === 0) return "";
  return pool[Math.floor(Math.random() * pool.length)];
}

// 邻格提示：只报「最危险的那一个」邻格（波波拍板——报全部会一格四句，且撞立柱漆字）。
// 方位词用相对方位（正前/左手边/右手边/身后），与 xdSignLine 的四向同序、与选项槽位（前/左/右/后）对齐，
// 玩家能直接对应到该往哪走；不报分区字母（立柱漆字刚报过，避免同段重复）。
// 平局取遍历首个：正前 > 左手边 > 右手边 > 身后（优先提示前进方向）。
// ⚠全黑/手机微光不给——看不见就是看不见，这是光照档的信息优势，不是隐藏数值。
var XD_NB_DEN = [
  null,
  ["影影绰绰立着一两个", "有个东西在慢慢挪"],
  ["黑压压挤了一片，看不清有多少", "站了好几个，肩膀挨着肩膀"],
  ["<span class='warn'>已经填满了，那头没有路可走</span>", "<span class='warn'>密密麻麻排到了车道另一头</span>"]
];
function xdGarNeighborHint(v, cellId) {
  var g = XDGRID[cellId];
  if (!g) return "";
  var facing = (XD_DIRS.indexOf(v._garageFacing) >= 0) ? v._garageFacing : "N";
  var rels = [["正前方", facing], ["左手边", XD_CCW[facing]], ["右手边", XD_CW[facing]], ["身后", XD_OPP[facing]]];
  var bestD = 0, bestRel = "";
  for (var i = 0; i < rels.length; i++) {
    var t = g[rels[i][1]];
    if (!t || !XD_DEN[t]) continue;
    var d = Math.min(3, xdGarDen(v, t));
    if (d > bestD) { bestD = d; bestRel = rels[i][0]; }
  }
  if (bestD <= 0) return "";
  var pool = XD_NB_DEN[bestD];
  if (!pool || pool.length === 0) return "";
  return "\n" + bestRel + "那条车道，" + pool[Math.floor(Math.random() * pool.length)] + "。";
}

// 密度反馈总入口（挂每格正文尾部）：按光照分流。
//   有光（通电/手电/车灯）：当前格视觉档 + 邻格最危险提示（两句）
//   无光（全黑/手机微光）：只有当前格听觉档（一句）——黑着也能听出水声，保证满格即死不是零信息处决。
function xdGarDenHint(v, cellId) {
  var sight = v._driving ? "lit" : xdGarSight(v);
  if (sight === "lit" || sight === "torch") {
    return xdGarSightDen(v, cellId) + xdGarNeighborHint(v, cellId);
  }
  return xdGarNoise(v, cellId);
}

// 随机搜车路由（加权）。搜车会惊扰所在格（搜车入口 xdGarSearchGo 给起点格密度 +1）；
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

// 搜车入口（波波 10-03：砍掉「开始搜查 / 不搜了退回去」的中间节点——点 POI 直接出结果）
// 中间节点原做的两件事搬进这里：① 记本轮起点格（供车库检查收口回原地）② 起点格密度 +1。
// ⚠⚠起点【不能】取 v._lastScene——它记的是"来处"不是"当前"（详见 xdGarCurCell 说明）。
//    用错的话：从 G 走进 H 再搜车，密度加在 G 上，「回到原地」还会把人送回 G；
//    若来处不是格子（B1走廊/疏散图/车库出口），XD_DEN 查不到，这一笔密度直接丢掉，
//    回程更会把人跳去那个库外场景，绕开 xdGarExitTo 的出库结算。
// ⚠换位置再搜时 _garageSearchPending 已为 true → 不覆盖起点（沿用旧 hub 的守卫逻辑）。
function xdGarSearchGo() {
  var f = function(v) {
    if (!v._garageSearchPending) {
      v._garageSearchFrom = xdGarCurCell(v);
      v._garageSearchPending = true;
    }
    var sk = XD_DEN[v._garageSearchFrom];
    if (sk && xdGarDenActive(v)) {
      v[sk] = Math.min(3, (v[sk] || 0) + 1);
    }
    return xdGarSearchRouter(v);
  };
  f.__searchGo = true;   // 供自测/lint 识别搜车入口（不再靠 nextScene 字面量比对）
  f.__sceneRefs = xdGarSearchRouter.__sceneRefs;
  return f;
}

// 靠近车辆的动作描写 + 本轮起点密度预警（原中间节点的正文，下放到四个搜车结果各带一份）
function xdGarSearchApproach(v) {
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
}

// 点火器上那把钥匙的说明（Day5 起换口径）：
// ⚠️ 旧实现一律写"他刚停好车，还没来得及拔"——和同段的"电池早就耗干了"、分区正文的
//    "引擎盖凉透/血迹结成壳"直接打架：同一个人不可能既是刚停好车，又已经躺了好几天。
function xdKeyLine(v) {
  return (v.dd >= 5)
    ? "——他停好车就再没能下去。这把钥匙，在这里插了好几天。"
    : "——他刚停好车，还没来得及拔。";
}

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

// 撞开围堵的伤口提示（一次性）。旧实现截停/围堵成功各扣 2 点体力并挂 hurtByZombie，
// 但落点正文只写车灯和坡道，既没有伤口也没有体力提示——玩家看不到自己付出了什么。
// ⚠️ 提示串不进 gameState（避免污染存档键），用文件作用域变量在「落点 onEnter 生产 / 落点 text 消费」。
var _xdRamNote = "";
var XD_RAM_NOTE = "\n<span class='warn'>车头顶开一条缝挤了出去，你在驾驶座上被甩得撞上门框，肩膀发麻，肋下一阵闷痛。</span>\n<span class='sys warn'>【系统提示】体力-2，当前体力：{strength}。</span>";
// 落点 onEnter 调用：把 _garRamHurt 兑现成本格的提示串（无事则清空，防上一格残留）
function xdGarRamSettle(v) {
  _xdRamNote = "";
  if (v._garRamHurt) { v._garRamHurt = false; _xdRamNote = XD_RAM_NOTE; }
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
        // ⚠️ 门槛必须与 cost 对齐：贴沟格要扣 2，就要求 >1，否则剩 1 次也能开出贴沟格、
        //    _escapeOps 被扣成 -1（透支），下一格靠负数撑到坡道口就能白拿逃亡。
        condition: opts.trench ? "_escapeOps > 1" : "_escapeOps > 0",
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
      var enteredWithTail = false;   // 本次是从库外带着尾巴进来的（闸门已记账，不再叠加步行 +1）
      // ⚠️落步即登记"当前所在格"：搜车起点、夜里判定"人还在库里"都靠它。
      //   这是本格的 id 字面量（工厂闭包内），不依赖 _lastScene——后者是"来处"。
      v._garageCurCell = id;
      xdGarRamSettle(v);             // 撞开围堵的伤口感（上一格遗留的先清掉，本格有则兑现）
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
        enteredWithTail = xdGarEnterSettle(v);   // 进库闸门：chased → G 区密度（仅当来源是库外场景时生效）
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
      // ⚠搜车收口「回到原地」不再 +1：搜车那笔已在 xdGarSearchGo 记过（出声/惊吓另记一笔），
      //   回程再记就是第三次——安静搜一趟变 +2、出声变 +3 直接顶满，而且满格判定发生在"回到格子"
      //   这一步，玩家会觉得是"往回走"害死自己，不是"翻车"害死自己。
      var denKey = XD_DEN[id];
      if (v._garageSearchReturn) {
        v._garageSearchReturn = false;
      } else if (enteredWithTail) {
        // 进库闸门已经把"带尾巴进来"这笔动静记进 G 区了，同一脚不记两次
      } else if (denKey && xdGarDenActive(v) && !v._driving) {
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
        return head + body + xdSignLine(id, v, head.indexOf(xdCellName(id)) < 0) + xdGarDenHint(v, id) + xdGarDriveText(v) + _xdRamNote;
      }
      body = (sight === "lit" || sight === "torch") ? opts.lit(v) : opts.dark(v);
      return head + body + xdSignLine(id, v, head.indexOf(xdCellName(id)) < 0) + xdGarDenHint(v, id) + _xdRamNote;
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
      // ⚠️ 应急灯一律写成"早就黑了"：它们的电池在爆发后的头两天就耗尽了，和主线通电的
      //    独立回路不是一回事。旧实现在未通电档写"应急灯还亮着，照出平台轮廓"，
      //    而 dark()（无手电无手机）写的是伸手不见五指——同一处环境两种说法，直接打架。
      if (v._wiredCorrectly) {
        desc = "头顶的灯一盏盏亮着，暖黄色的光把坡道口照得通透。角落那几盏应急灯仍是黑的——罩子里的电池早在前几天就耗尽了。";
        if (day3) {
          desc += "\n两道新鲜的轮胎印从坡道口一路碾进来，压过积水的地方在灯光下亮得反光——湿痕顺着坡道一路往车库深处去，中间没有断过。";
          if (droveOut) desc += "\n另有一道更新鲜的印子，从库里往外碾出去，正正压过坡道口那截断杆。";
        }
      } else {
        desc = "坡道从这里向上通向出口。头顶几盏应急灯黑着罩子，电池早就耗尽了——你靠手里的光才照出平台开阔的轮廓。";
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
      { text: "搜查平台边停着的车", nextScene: xdGarSearchGo(), effect: updateTime(4) },
      { text: "查看消防疏散图", nextScene: XDGAR + "-疏散图", effect: updateTime(1) },
      { text: "沿坡道出库", nextScene: xdGarExitTo("新达汇车库出口"), effect: updateTime(2) },
      { text: function(v) { return (v._visit && v._visit["新达汇-B1走廊"] > 0) ? "回B1走廊" : "去B1走廊"; }, nextScene: xdGarExitTo("新达汇-B1走廊", "新达汇"), effect: updateTime(2) }
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
    // ⚠️ 旧实现写死"一直往前就是深处"——面朝南（从枢纽下来）时正前方是墙，面朝西时前面是入口，
    //    全说成"深处"会当场穿帮。相对方位按当前朝向算：深处=北（通枢纽），入口=西（通入口平台）。
    // ⚠️ 手机微光档不走这套：立柱漆字紧接着就说"前后左右看不清"，同屏两句方向判断会打架。
    dark: function(v) {
      var base = "主通道两侧的车排得笔直，指节敲上去，一辆辆都是空膛的回音。头顶的空当里有一缕流动的凉风——顺着通道从这头灌到那头。";
      if (xdGarSight(v) === "dim") {
        return base + "手机的光只够照出脚下一截，通道往两头伸进暗里，分不清哪头是哪儿。";
      }
      var f = (XD_DIRS.indexOf(v._garageFacing) >= 0) ? v._garageFacing : "N";
      return base + "\n你辨了辨风向：" + xdRelName(f, "W") + "是坡道口那边的入口，" + xdRelName(f, "N") + "才是车库深处。";
    },
    poiArr: [
      { text: "搜查通道两侧的车", nextScene: xdGarSearchGo(), effect: updateTime(4) }
    ]
  }),

  // ==================== I · 杂物拐角（南排东 = 东南角） ====================
  xdCellScene({
    id: "新达汇-B1-杂物拐角",
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingH.png */,
    lit: function(v) {
      var desc = "拐角处堆着几辆废弃的购物车和一个翻倒的儿童安全座椅。购物车里有一只落满灰的毛绒熊玩偶，半埋在杂物里。旁边的立柱上，有人用马克笔写了两行字：\n“车别乱开。有的不是空的。——302的胖子”";
      desc += "\n杂物堆后面塞着一根带血的撬棍，撬棍底下压着一张折叠的保养单——荣威4S店的，被水汽泡得字迹发糊。";
      // ⚠️ 车牌属于谁，要等你见过 F 区那辆白车才成立——否则没去过 F 区就把红鲱鱼的位置和结果都讲完了
      if (v._visit && v._visit[XDCELL + "第二停车排"] > 0) {
        desc += "\n单子上车牌号那一栏还没完全泡烂，凑着水痕认了认——正是 F 区那辆白色SUV。\n<span class='think'>有人比你更早想过这辆车的主意。没成。</span>";
      }
      return desc;
    },
    dark: function(v) {
      return "拐角处堆着几辆废弃的购物车，你伸手摸到了半只毛绒熊的耳朵。绒毛早被潮气泡硬了，一股旧毛毯的霉味。";
    },
    poiArr: [
      { text: "搜查拐角的车", nextScene: xdGarSearchGo(), effect: updateTime(4) }
    ]
  }),

  // ==================== D · 西车道南段（中排西，贴沟格） ====================
  xdCellScene({
    id: "新达汇-B1-西车道南段",
    trench: true,
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingG.png */,
    lit: function(v) {
      var desc = "西侧车道贴着 J 区的边走，地面泛潮，一道水渍从地缝里漫出来。半截从沟里拖出来的栅栏横在车道上，看得出有什么东西费过一番力气。";
      // ⚠️ 只能写死本格 ID：lit/dark 在 xdCellScene 调用之前声明，取不到工厂内部的 opts.id
      if ((xdGarDenActive(v) && xdGarDen(v, "新达汇-B1-西车道南段") >= 2) || v._visit[XDGAR + "-上车点火"] > 0) {
        desc += "\n<span class='warn'>车道边的排水沟栅栏缝里，水面比别处高了一截，正贴着缝往外渗。</span>";
      }
      return desc;
    },
    dark: function(v) {
      return "潮气贴着地面涌上来，脚下的水泥黏腻腻的。你抬脚时绊到一截铁栅栏——横在车道中间，边缘带着锈。";
    },
    poiArr: [
      { text: "搜查路边停着的车", nextScene: xdGarSearchGo(), effect: updateTime(4) }
    ]
  }),

  // ==================== E · 中段枢纽（中排中 = 网格正中心） ====================
  xdCellScene({
    id: "新达汇-B1-中段枢纽",
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingI.png */,
    lit: function(v) {
      var desc = "两排立柱把这片开阔的车区切成田字。中段有一根立柱上刻满了“正”字，一笔一划刻得很深，密密麻麻数不清有多少个——有人在这里数过什么，数了很久。";
      // ⚠️ 只能写死本格 ID：lit/dark 在 xdCellScene 调用之前声明，取不到工厂内部的 opts.id
      if (v.dd >= 3 && xdGarDen(v, "新达汇-B1-中段枢纽") >= 2) {
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
      { text: "搜查立柱间的车", nextScene: xdGarSearchGo(), effect: updateTime(4) }
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
      { text: "搜查停车排的车", nextScene: xdGarSearchGo(), effect: updateTime(4) }
    ]
  }),

  // ==================== A · 西车道北段（北排西 = 西北角，贴沟格） ====================
  xdCellScene({
    id: "新达汇-B1-西车道北段",
    trench: true,
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingG2.png */,
    lit: function(v) {
      var desc = "车道靠墙停着一辆银色五菱面包车，后门没有锁，车厢里堆满了纸箱和杂物，方向盘上落满了灰——看灰的厚度，爆发前就没再碰过了。\n这一段贴着 J 区的边，空气比主通道那边更潮，隐隐有水汽的味道。";
      // ⚠️ 只能写死本格 ID：lit/dark 在 xdCellScene 调用之前声明，取不到工厂内部的 opts.id
      if ((xdGarDenActive(v) && xdGarDen(v, "新达汇-B1-西车道北段") >= 2) || v._visit[XDGAR + "-上车点火"] > 0) {
        desc += "\n<span class='warn'>车道边的排水沟栅栏缝里，水面比别处高了一截，正贴着缝往外渗。</span>";
      }
      return desc;
    },
    dark: function(v) {
      return "水声在这一段贴着耳朵，墙根那头的栅栏缝里，水汽扑在手背上。手指碰到一辆车——后门大敞，车厢里的纸箱被潮气泡得发软，一按一个坑。";
    },
    poiArr: [
      // 不点名"这辆车的后车厢"——搜车结果走随机池，可能翻出 Polo/轩逸/凯越，
      // 选项写死五菱会对不上。这排车都是可搜目标，找到哪辆是哪辆。
      { text: "在这一排车里翻找", nextScene: xdGarSearchGo(), effect: updateTime(4) }
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
    // ⚠️ 下 J 区的选项不能直接报字母：全黑档正文认不出台阶口柱子上的喷漆，没读过立柱、
    //    也没看过疏散图时，这一条会先把分区名字交给玩家。去过了才认得路，此后一直用字母。
    poi: function(v) {
      var knownJ = (v._visit && v._visit[XDGAR + "-旧区"] > 0) || xdGarSight(v) !== "dark";
      return [
        { text: "搜查北头停着的车", nextScene: xdGarSearchGo(), effect: updateTime(4) },
        { text: knownJ ? "走下台阶，下 J 区" : "走下那道台阶", nextScene: xdJEntry, effect: updateTime(1) }
      ];
    }
  }),

  // ==================== C · 车道尽头（北排东 = 东北角 ★事故点） ====================
  xdCellScene({
    id: "新达汇-B1-车道尽头",
    image: "images/placeholder.png" /* TODO: 优先四图之一 images/xindahui/parkingF.png（事故点） */,
    lit: function(v) {
      // 从战斗/摸黑脱身退回时的差异化承接（否则"走到尽头"与"你退了出去"矛盾）
      // ⚠️ 不含「尸潮-击散」——那是"站稳，继续走"，加"你退回到车库深处"会跟按钮反着来
      var ret = (v._lastScene === XDGAR + "-车旁搜身" || v._lastScene === XDGAR + "-车旁搜身-受伤")
        ? "你退回到车库深处。" : "";
      var body;
      // Day3 之前：车还没来，普通角落
      if (v.dd < 3) {
        body = "这里是车道最深的角落，光照不到的地方堆着几个废弃的轮胎架。角落里的车都落满了灰——爆发前就没再动过了。";
      } else if (!v._wiredCorrectly) {
        // Day3+：车在，但没通电。这个分支只有手电玩家会走到（手机微光/全黑走 dark()）
        // ⚠️波波 10-03 拍板：那辆深灰色荣威是**要通电才能解锁的目标车**，拿手电乱转不该能认出来。
        //   所以这里只给"这个角落不对劲"的信息（血腥气、歪掉的栅栏、有东西在动），
        //   绝不写"没有灰/什么车型/驾驶座门开着"——那是通电后的奖励信息。
        body = "光柱扫到车道尽头，照见的只是一排同样落着灰的车；最里面那几个车位陷在光柱够不到的暗里，轮廓糊成一团。\n车旁的排水沟栅栏歪了两根，缝里往外渗着水，空气里有一股新鲜的血腥气。\n<span class='warn'>黑暗里有东西伏在车影之间，一下一下地动着；光一晃，它抬起头，朝你这边缓缓转过来。</span>另一只正从沟里往外爬。";
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
        nextScene: xdGarSearchGo(),
        effect: updateTime(4)
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
    // 火花起在配电室所在的中段枢纽（E 区）：动静记在这一格，不再全局 chased +1
    onEnter: function(v) { xdGarDenBump(v, XDCELL + "中段枢纽"); return {}; },
    // ⚠️ 密度系统未激活时 xdGarDenBump 直接 return（数值一点没动），正文却照写"引起了什么东西的注意"——
    //    威胁句和机制对不上。未激活就只写声音本身，不替它加一句回应。
    text: function(v) {
      var t = "你把线接上了，但推上电闸的瞬间——<span class='sfx'>啪</span>！一阵火花闪过，灯没亮。你接错了。\n短路的声音在空旷的停车场里回荡";
      t += xdGarDenActive(v)
        ? "……<span class='warn'>排水沟那头的水声停了一拍，然后变得更密。</span>肯定引起了什么东西的注意。你得小心了。"
        : "，撞在立柱和车顶之间，弹了几个来回，然后彻底散了。";
      return t;
    },
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
        if (xdGarDenTotal(v) >= 2) {
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
          "结局-车库车旁"
        ),
        timeout: 20000,
        timeoutScene: "结局-车库车旁"
      }
    ]
  },

  "新达汇-B1停车场-车旁搜身": {
    image: "images/placeholder.png" /* TODO: images/xindahui/parkingF.png */,
    // 翻尸体的动静留在打斗发生的那一格 = C 区（车道尽头）；体力消耗记在胜利节点（开战页不扣）
    // ⚠️ 旧实现记的是 F 区（第二停车排），记错格子；打死地点的密度会和实际动静对不上。
    onEnter: function(v) { xdGarDenBump(v, XDCELL + "车道尽头"); return { add: { strength: -1 } }; },
    text: function(v) {
      var phoneLine = (v.dd >= 5)
        ? "他的手机摔在脚边，屏幕裂成了蛛网，黑着——电池早就耗干了，谁也没有来过。"
        : "他的手机摔在脚边，屏幕裂成了蛛网，还亮着——锁屏壁纸是个笑得很开的小女孩，输入界面停在一条没发出去的短信上：“东西太多，我跑第二趟”\n<span class='term'>信号栏空空如也。</span>";
      var desc = "最后一只抽搐着倒下，不动了。你喘匀了气，才敢看那具尸体。\n是个年轻人，穿一件洗得发白的外套，手里还攥着半张购物清单——新达汇超市的目录，背面用圆珠笔写着一行字：“多的卖给长廊。”\n" + phoneLine + "\n驾驶座里，<span class='crit'>钥匙还插在点火器上</span>" + xdKeyLine(v);
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
    // 同一场打斗，带伤胜利也得在 C 区（打斗发生地）留一笔——旧实现只记完胜档，密度会凭消失
    onEnter: function(v) { xdGarDenBump(v, XDCELL + "车道尽头"); return hurtWinOnEnter({ time: 1 })(v); },
    text: function(v) {
      var phoneLine = (v.dd >= 5)
        ? "他的手机摔在脚边，屏幕裂成了蛛网，黑着——电池早就耗干了，谁也没有来过。"
        : "他的手机屏幕还亮着——锁屏壁纸是个笑得很开的小女孩，输入界面停在一条没发出去的短信上：“东西太多，我跑第二趟”";
      var desc = "你勉强把两只都干掉了——代价是胳膊上添了一道口子，血顺着手腕往下淌。" + hurtCostText(v) + "\n你喘着粗气看那具尸体：年轻人，手里攥着半张购物清单——背面用圆珠笔写着一行字：“多的卖给长廊。”\n" + phoneLine + "\n驾驶座里，<span class='crit'>钥匙还插在点火器上</span>" + xdKeyLine(v);
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
          "结局-车库尸潮"
        ),
        timeout: 18000,
        timeoutScene: "结局-车库尸潮"
      }
    ]
  },

  "新达汇-B1停车场-尸潮-击散": {
    image: "images/placeholder.png" /* TODO: images/xindahui/hordeAmbush.png */,
    onEnter: function(v) {
      var key = XD_DEN[v._garFightCell];
      if (key) v[key] = 0;   // 打散：这一片的尸潮清空
      v._garGrace = 2;       // 余波平静：接下来 2 次步行进格密度不涨
      v._garageSearchReturn = false;   // 回程标记作废（被遭遇战打断，别留到下一格误吞一次记账）
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
      // 隔天巢穴会重新聚满，再进一次就不是"迈的第一步"了——写死会撞重复
      var again = (v._garJQuietDay || 0) > 0;
      var open = again
        ? "<span class='crit'>你又一次踏进水里。这一次没等你迈第二步，水面就炸了。</span>"
        : "<span class='crit'>你往 J 区里迈的第一步，水面就炸了。</span>";
      return "台阶下到一半你就听见了——排水沟里的水声密得不正常。" + open + "\n它们从栅栏缝里往外挤，湿漉漉的手扒开铁条——这里是它们的巢，你是闯进来的那个。\n集中注意力——报出它们的动作节奏！";
    },
    choices: [
      {
        text: "输入你感觉到的动作节奏",
        input: { placeholder: "例如：3红2蓝" },
        nextScene: flashCombatRouterDeadly(
          "新达汇-B1停车场-巢穴-占稳",
          "结局-车库巢穴"
        ),
        timeout: 18000,
        timeoutScene: "结局-车库巢穴"
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
      // 时限改读派生量 _garDenTotal（core.js computed）：QTE timeout 是字符串，只能读 gameState 的键
      // 密度 0→8.0s，每 +1 密度 -0.25s，3.0s 封底（原 chased 口径 0~4 → 8.0~4.8s）
      timeout: "Math.max(3000, 8000 - _garDenTotal * 250)",
      onTimeout: "结局-车库围堵"
    },
    text: function(v) {
      var cn = xdCellName(v._garDriveTarget || XDCELL + "中段枢纽");
      return "车灯的光柱扫进" + cn + "——<span class='crit'>满了。整个格子都是影子，水声从栅栏缝里漫上车道。</span>\n它们认得这声引擎，正从三个方向往车道中间合拢。刹车就是死——只有冲！";
    },
    choices: [
      {
        text: "轰油门，从缝里冲过去！",
        // 撞开一条路：动静留在冲进去的那一格（驾驶态本身不涨密度，这一笔是撞围堵的代价）
        nextScene: function(v) {
          var t = v._garDriveTarget || XDCELL + "中段枢纽";
          xdGarDenBump(v, t);
          v._garRamHurt = true;   // 落点正文补一句伤口+体力（effect 先于 nextScene，体力已扣完）
          return t;
        },
        effect: updateTime(1, { add: { strength: -2 }, set: { hurtByZombie: true } })
      }
    ]
  },

  // ==================== 随机搜车系统 ====================
  // （波波 10-03：原「搜车」中间节点已删除——分区 POI 直接走 xdGarSearchGo() 出结果。
  //   中间节点的记账逻辑在 xdGarSearchGo、正文在 xdGarSearchApproach，两者都由四个结果场景复用。）
  "新达汇-B1停车场-搜车-空车": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    text: function(v) {
      var looted = (v._garageLootLeft || 0) <= 0;
      if (xdGarSight(v) === "lit" || xdGarSight(v) === "torch") {
        var models = ["一辆白色的大众polo", "一辆黑色的日产轩逸", "一辆落满灰的别克凯越", "一辆车窗贴满膜的本田飞度"];
        var m = models[Math.floor(Math.random() * models.length)];
        var desc = "是" + m + "。你拉开驾驶座翻了一遍——储物格里只有过期的保险单和几张停车票。方向盘上的灰厚得能写字，这辆车在爆发前就没人动过。";
        if (looted) desc += "\n<span class='think'>该翻的缝都翻过了——这个车库里的车，别指望再翻出吃的。</span>";
        return xdGarSearchApproach(v) + "\n" + desc;
      }
      // 全黑/微光：只报触感，不报车型颜色（看不见就是看不见）
      var desc2 = "你摸到的这辆车引擎盖冰凉，灰厚得糊手。储物格、遮阳板、座椅底下，你挨个摸了过去——只有几张摸不出字的票据。什么都没有。";
      if (looted) desc2 += "\n车库里的缝，你感觉自己已经摸了个遍。再想捡吃的，得去别的地方。";
      return xdGarSearchApproach(v) + "\n" + desc2;
    },
    choices: [
      { text: "换个位置再搜", nextScene: xdGarSearchGo(), effect: updateTime(3) },
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
      return xdGarSearchApproach(v) + "\n" + p + "\n你撕开包装，三两口吃了下去。胃里有了东西，手脚重新听使唤了。\n<span class='sys'>【系统提示】体力有所恢复，当前体力：{strength}。</span>";
    },
    choices: [
      { text: "换个位置再搜", nextScene: xdGarSearchGo(), effect: updateTime(3) },
      { text: "不搜了", nextScene: XDGAR + "-车库检查", effect: updateTime(1) }
    ]
  },

  "新达汇-B1停车场-搜车-出声": {
    image: "images/placeholder.png" /* TODO: images/xindahui/searchCars.png */,
    // 哐当一声是搜车之外的第二次动静：再给起点格 +1（搜车本身那笔在 xdGarSearchGo）
    onEnter: function(v) { xdGarDenBump(v, v._garageSearchFrom); return {}; },
    text: function(v) {
      var desc = xdGarSearchApproach(v) + "\n你拉开副驾车门的瞬间——<span class='sfx'>哐当</span>！车门内侧挂着的灭火器支架被带了下来，砸在水泥地上，滚出去老远。\n回音在空旷的车库里荡了三个来回。你僵在原地，听着自己的心跳。";
      var soundSight = xdGarSight(v);
      // ⚠️ 未激活时这一声不会惊动任何东西（xdGarDenBump 直接 return），正文不能替它写回应
      if (!xdGarDenActive(v)) {
        desc += "\n你僵着不动等了半分钟。回音散尽之后，车库里没有第二声响动——这一次，运气不错。";
      } else if (soundSight === "lit") {
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
      return xdGarSearchApproach(v) + "\n你拉开车门——<span class='crit'>一张脸从车里直冲着你抬起来</span>。\n它不知在车里待了多久，干瘪的手指抠着门框往外套。你向后踉跄，后腰撞在旁边的车身上。<span class='sfx'>咚</span>的一声，整个车库都听得见。";
    },
    choices: [
      {
        text: "撒腿就跑",
        nextScene: xdGarNoiseTo(XDGAR + "-车库检查"),
        effect: updateTime(1)
      },
      {
        text: "抄起家伙结果了它",
        showCondition: "hasMeleeWeapon",
        nextScene: xdGarNoiseTo(XDGAR + "-搜车-惊吓击杀"),
        effect: updateTime(2)
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
      var totalDen = xdGarDenTotal(v);
      if (xdGarDenActive(v) && fromDen >= 2) {
        return "你站在原地喘了口气。起点那片的水声已经贴上立柱了——回去的路上，未必太平。";
      }
      return (totalDen > 0)
        ? "你站在原地喘了口气。刚才闹出的动静，回音还在车库里荡——这里已经不算安分了。"
        : "你站在原地喘了口气。到目前为止，你的动静还算克制。";
    },
    choices: [
      {
        // ⚠置 _garageSearchReturn：回原地的这一步不再给格子记第二笔密度（见 xdCellScene.onEnter）
        text: "回到原地继续探索",
        nextScene: function(v) { return xdCellEntry(v._garageSearchFrom || XDCELL + "主通道南段")(v); },
        effect: { set: { _garageSearchReturn: true } }
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
      // 掉头：正文写的是"车头对准来时的车道"，朝向必须跟着翻过来，否则 front 槽位指向墙被隐藏、
      //        玩家只能靠"倒车退回"往来路开，和文案正好相反。
      //        C 区（车道尽头）是死胡同，进入方向只可能是 E 或 N，两个邻格恰好是 W/S——
      //        反转 180° 后 front 必定有路（这是我也-C区结构，不是巧合）。
      v._garageFacing = XD_OPP[(XD_DIRS.indexOf(v._garageFacing) >= 0) ? v._garageFacing : "E"] || "W";
      xdGarDenSurge(v, 1); // 引擎炸醒整个车库：全库密度 +1（不判"是否惊动过排水沟"——这声就是惊动）
      return {};
    },
    qte: {
      // 时限改读派生量 _garDenTotal（core.js computed）：QTE timeout 是字符串，只能读 gameState 的键
      // 密度 0→8.0s，每 +1 密度 -0.25s，3.0s 封底（原 chased 口径 0~4 → 8.0~4.8s）
      timeout: "Math.max(3000, 8000 - _garDenTotal * 250)",
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
  // 网格成环，路线不唯一（最短 4 格：车道尽头→…→入口平台）。
  // ⚠看过疏散图**不给任何方位加成**（波波 10-03 拍板）：驾驶逃亡就是要绕晕玩家，
  //   _garageMapSeen 只是"读过图"的标记，别拿它去给指路/槽位开小灶。
  "新达汇-B1停车场-围堵": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveSurrounded.png */,
    qte: {
      // 时限改读派生量 _garDenTotal（core.js computed）：QTE timeout 是字符串，只能读 gameState 的键
      // 密度 0→8.0s，每 +1 密度 -0.25s，3.0s 封底（原 chased 口径 0~4 → 8.0~4.8s）
      timeout: "Math.max(3000, 8000 - _garDenTotal * 250)",
      onTimeout: "结局-车库围堵"
    },
    text: function(v) {
      var fromName = (v._lastScene && XDGRID[v._lastScene]) ? xdCellName(v._lastScene) : "车道";
      return "<span class='crit'>你转过一个弯——" + fromName + "的尽头，车灯的光柱里全是影子。</span>\n它们从停车排里、从排水沟的栅栏缝里、从立柱后面涌出来，把" + fromName + "堵得只剩一条缝。前保险杠已经能听到拍打引擎盖的声音。\n孤注一掷——从" + fromName + "一路撞回坡道，找那条缝，冲过去！";
    },
    choices: [
      {
        text: "踩死油门，赌那条缝！",
        nextScene: function(v) { v._garRamHurt = true; return XDGAR + "-冲出坡道"; },
        effect: updateTime(1, { add: { strength: -2 }, set: { hurtByZombie: true } })
      }
    ]
  },

  "新达汇-B1停车场-冲出坡道": {
    image: "images/placeholder.png" /* TODO: images/xindahui/driveRamp.png */,
    // 驾驶逃亡结算点：driveExit 与「围堵→冲出坡道」两条路径都汇到这里，闸门挂此处才都覆盖得到。
    // chased +0（波波 10-03 拍板：正文写死"甩在了身后"），但 G 区密度照样清零。
    onEnter: function(v) { xdGarExitSettle(v, 0); xdGarRamSettle(v); return {}; },
    text: function(v) {
      var night = xdGarNight(v);
      return "你把油门踩穿。车身擦着断杆冲上坡道，<span class='sfx'>哐</span>的一声，断杆飞出去砸在收费亭顶上。" + _xdRamNote + "\n" + (night ? "夜色灌进挡风玻璃，坡道顶上就是街口。" : "天光灌进挡风玻璃。") + "后视镜里，坡道口的水声渐渐被引擎声盖过去。\n<span class='crit'>你把整个东明街道的地下，甩在了身后。</span>";
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
        // 保留 chased：本节点是库外辅路（户外），不在车库密度系统的管辖范围，
        // 出库换算已在 -冲出坡道 / G 区两个出口选项处结清，这里是库外的独立账。
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
  // ⚠️ 三种死法各自独立成节点。旧实现三处共用「结局-车库遭遇战」，那一段永远写
  //    "两步外是深灰色荣威，钥匙插在点火器上"——车还没出现（dd<3）、人死在下层巢穴、
  //    车已经开走，都会把车型和钥匙说死，而且地理位置根本是错的。
  // 车旁（C 区·目标车边）：车就在半步外，写"差一步"是这一处才成立的画面
  "结局-车库车旁": {
    image: "images/hurtByzombie.webp",
    text: function(v) {
      return "排水沟里爬出来的东西比你想的多。第一只被你砸倒，第二只从侧面扑上来，第三只咬住了你的小腿。\n它们把你往栅栏那头拖，后背在水泥地上磨出一道火辣辣的痕。你伸手去够那扇敞开的驾驶座车门，指尖只擦到冰凉的车身——差了半步。\n<span class='end'>—— 结局：倒在车门外 ——</span>";
    }
  },

  // 尸潮（任意满密度格）：死在你踏进去的那一格，不提车（车可能根本不在这里）
  "结局-车库尸潮": {
    image: "images/hurtByzombie.webp",
    text: function(v) {
      var cn = (v._garFightCell && XD_LETTER[v._garFightCell]) ? xdCellName(v._garFightCell) : "这片车道";
      return "你报错了节奏。\n第一只撞在你胸口，第二只从车缝里挤出来抱住你的腰。湿透的手从四面扒上来，把你按在" + cn + "的立柱边——水声盖过了你最后的声音。\n<span class='end'>—— 结局：被尸潮按倒 ——</span>";
    }
  },

  // 巢穴（J 区·排水沟里）：死在源头的水里，没有车、没有坡道，只有栅栏和水
  "结局-车库巢穴": {
    image: "images/hurtByzombie.webp",
    text: function(v) {
      return "栅栏缝里伸出来的手比你想的多。它们把你按进齐膝的浑水里，指节抠着腰带和衣领，一寸一寸往下拽。\n水面最后浮上来一串气泡，随即平了。排水沟重新安静——这里是它们的巢，你只是走进来的那个。\n<span class='end'>—— 结局：沉进排水沟 ——</span>";
    }
  },

  "结局-车库围堵": {
    image: "images/hurtByzombie.webp",
    text: function(v) {
      return "引擎的轰鸣引来了整个车库的东西。它们拍打着车窗、压上引擎盖，车灯的光柱里全是晃动的影子。你踩死油门，车身却在原地打滑——一只灰白的手从侧窗探进来，抓住了你的衣领。\n熄火之后，车库里安静得只剩下水声。\n<span class='end'>—— 结局：车库围堵 ——</span>";
    }
  }

});
