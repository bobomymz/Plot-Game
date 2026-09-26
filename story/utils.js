// 人类作者注：有几个测试用的.py文件依赖此文档结构，修改后请同步修改相关文件。

// 根据游戏内时间返回对应时段的图片路径
// map: { morning, evening, night, midnight } — morning 必填；evening/midnight 缺省时 fallback 到 night，再 fallback 到 morning
function timeImage(map) {
  return function(vars) {
    const hh = vars.hh;
    let key;
    if (hh >= 16 && hh <= 18) key = "evening";
    else if (hh >= 19 && hh <= 22) key = "night";
    else if (hh === 23 || (hh >= 0 && hh <= 6)) key = "midnight";
    else key = "morning";  // 7-15
    return map[key] || map.night || map.morning;
  };
}

function updateTime(addMinutes, extraEffect = {}) { // 更新时间
  addMinutes = addMinutes || 0;
  return function(vars) {
    var mins = addMinutes;
    if (vars.weather === "雨") mins = Math.round(mins * 1.3);
    var oldHh = vars.hh;
    vars.mm += mins;
    vars.hh += Math.floor(vars.mm / 60);
    vars.mm %= 60;
    vars.dd += Math.floor(vars.hh / 24);
    vars.hh %= 24;
    // 天气：跨越整点时更新
    if (vars.hh !== oldHh || mins >= 60) {
      updateWeather(vars);
    }
    // 疲劳系统：>6分钟的户外移动累加到连续移动时间（当前场景 scene.outdoor 为真才计）
    if (mins > 6 && vars._isOutdoor) {
      vars._travelMinutes = (vars._travelMinutes || 0) + mins;
    }
    return extraEffect;
  }
// 运用了一个特性：updateTime 直接修改了参数 vars（也就是 gameState），但返回的是空 effect 对象。这碰巧能工作，因为 applyEffect 之前 vars 已经被改了。
}

// ====== 疲劳档位 ======
// 连续移动疲劳的五档阶梯：20/36/48/56/60 分钟各 -1 体力；<20 分钟为 0 档。
// travel-fatigue 规则（core.js）用它做 triggerKey 和扣档依据，调档位阈值时改这里即可。
function fatigueTier(min) {
  min = min || 0;
  if (min >= 60) return 5;
  if (min >= 56) return 4;
  if (min >= 48) return 3;
  if (min >= 36) return 2;
  if (min >= 20) return 1;
  return 0;
}

// ====== 显示格式化 ======
// 体力统一保留1位小数显示（"7.0"）。所有给玩家看的体力数字——剧情 {strength} 插值（core.js _display）
// 和 flashStatusWarning 弹窗字符串——都用它，别处手写 Math.round 会显示不一致。
function fmtStrength(v) {
  return Number(v).toFixed(1);
}

// ====== 休息恢复体力（全图休息节点通用） ======
// 休息可无限重复，但体力 >= REST_CAP 时不再回复（防无限刷体力）；行程疲劳清零等其余效果不受影响。
// restRecover 写 vars._restBlocked（core.js _variables 已注册），供休息场景 text 函数配合 restHint 切换提示语。
var REST_CAP = 6;
function restRecover(v, amount) {
  if (v.strength >= REST_CAP) {
    v._restBlocked = true;
    if (typeof window !== "undefined" && window.__staminaEvent) window.__staminaEvent("restBlocked", { strength: v.strength, cap: REST_CAP });   // 体力遥测：休息被拒计数
    return 0;
  }
  v._restBlocked = false;
  var before = v.strength;
  v.strength = Math.min(10, v.strength + amount);
  return v.strength - before;
}
// 休息提示语：被门槛挡住时提示"你已经差不多歇够了"，否则显示 okText（默认"体力+1"）。
// 返回值以 \n 开头、内含 {strength} 插值（text 函数返回值仍会做插值），直接拼在描述末尾即可。
function restHint(vars, okText) {
  if (vars._restBlocked)
    return "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你已经差不多歇够了。</span>";
  return "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】" + (okText || "体力+1") + "，当前体力：{strength}。</span>";
}

// ====== 休息节点 · 就地整理背包入口（全图休息节点通用） ======
// 用法（休息场景内）：choices 里加 restTidyChoice("<本场景ID>")，onEnter 开头加 restTidyGuard(vars)。
//
// ⚠ 为什么要 guard：从「整理整理」退出走的是 nextScene "{positionAfterOperation}"（回本场景），
//   本场景 onEnter 会**再跑一遍**——休息节点普遍在 onEnter 里 updateTime(5~30)、甩追兵(chasedByZombies-1)、
//   消耗一次性 NPC 口粮次数、甚至过夜跳天数。不拦住就是纯刷子（反复整理=反复甩追兵/反复跳天）。
//   故入口 effect 打 _restTidyReturn 标记，onEnter 开头用 guard 吃掉它，返回时只做一次"回到休息点"的落地。
function restTidyChoice(id) {
  return {
    showCondition: "itemCount > 0",
    text: "🎒整理一下物品",
    nextScene: "整理整理",
    effect: { set: { positionAfterOperation: id, _restTidyReturn: true } }
  };
}
// 休息场景 onEnter 开头调用：返回 null 表示不是从整理返回（继续正常结算）；
// 返回 {} 表示是整理返回——已清标记，调用方直接 return 它，不再重复计时间/收益。
function restTidyGuard(vars) {
  if (!vars._restTidyReturn) return null;
  vars._restTidyReturn = false;
  return {};
}

// ====== 天气系统 ======

function updateWeather(vars) {
  var hh = vars.hh;
  var roll = Math.random();

  // 上海夏季：6-11点多晴，12-17点易雷雨，夜间以阴为主
  if (vars.weather === "雨") {
    if (roll < 0.5) vars.weather = "阴";   // 雨停转阴
    // else 雨继续
  } else if (vars.weather === "阴") {
    if (hh >= 6 && hh <= 11 && roll < 0.3) vars.weather = "晴";
    else if (hh >= 12 && hh <= 17 && roll < 0.35) vars.weather = "雨";
    // else 阴继续
  } else { // 晴
    if (hh >= 12 && hh <= 17 && roll < 0.3) vars.weather = "雨";
    else if (roll < 0.2) vars.weather = "阴";
    // else 晴继续
  }

  vars.windy = Math.random() < 0.55;
}

function describeWeather(vars) {
  var s = vars.weather;
  var w = vars.windy;
  // 按当前小时取模选描述句，同一小时内保持一致
  var n = ((vars.dd - 1) * 24 + vars.hh) % 3;

  var pool;
  if (s === "晴") {
    if (w) {
      pool = [
        "天很晴，阳光有些晒。偶尔有风吹过，稍微凉快一点。",
        "太阳火辣辣的，晒得地面发烫。风一阵一阵地吹过来，卷起灰尘和枯叶。",
        "天空蓝得发白，眼睛睁不大。热风贴着路面走，柏油发软，鼻腔里全是晒热的焦味。"
      ];
    } else {
      pool = [
        "太阳很大，空气里没有一丝风。有点闷热。",
        "烈日当空，空气凝滞得像一潭死水。热浪从路面蒸腾上来，远处的景物在热气中微微扭曲。",
        "日头钉在正顶。树叶耷拉着，柏油路面发亮，吸进去的气都是烫的。"
      ];
    }
  } else if (s === "阴") {
    if (w) {
      pool = [
        "天阴着，云层很厚。风时不时吹过来，带着潮湿的味道。",
        "灰白的云层堆满天际，看不到一丝阳光。风断断续续地刮着，地上的塑料袋和枯叶被吹得到处跑。",
        "云压得很低，楼顶都看不清。风一阵紧过一阵，路边招牌吱嘎响，空气里有股要下雨的腥味。"
      ];
    } else {
      pool = [
        "云层很厚，没什么风，有点闷。",
        "天阴沉沉的，空气闷得像蒸笼。没有一丝风，衣服粘在背上，呼吸都带着潮气。",
        "天色暗下来，云层很厚。路边杂草的叶尖都不颤，吸进去的气带着温潮。"
      ];
    }
  } else { // 雨
    if (w) {
      pool = [
        "下着雨，风把雨丝吹歪了。路上有些积水。",
        "雨不紧不慢地下着，风裹挟着雨点斜打在脸上。路面的积水被砸出密密麻麻的涟漪，远处偶尔传来闷雷。",
        "风把行道树吹歪了，雨点砸在积水上，溅到裤腿。一道闪电过后几秒，闷雷从远处滚过来，地面跟着颤。"
      ];
    } else {
      pool = [
        "雨静静地下着，没有风。到处都是湿漉漉的。",
        "雨丝直直地落下来，整个世界只剩下沙沙的雨声。路面的积水倒映着灰蒙蒙的天空，空气里弥漫着泥土的潮湿气味。",
        "雨没有风，一条条直直地垂下来。沙沙声不停，积水已经漫过路沿。"
      ];
    }
  }
  return pool[n];
}

// 户外天气效果：晴 ch 归零（丧尸趋避阳光）+ 体力扣除，阴扣体力，雨累积受凉值（可能感冒）
function applyWeatherDrain(vars) {
  if (vars.weather === "雨") {
    // 雨天户外：受凉值累积，满 100 感冒（晴/阴户外会清零，进屋躲雨不增长）
    if (!vars.hasCold) {
      vars._rainExposure = (vars._rainExposure || 0) + 20;
      if (vars._rainExposure >= 100) {
        vars._rainExposure = 0;
        vars.hasCold = true;
        flashStatusWarning("⚠ 你着凉了，开始发烧！");
      } else {
        flashStatusWarning("⚠ 你被雨淋湿了，身子发冷（受凉 " + vars._rainExposure + "/100）");
      }
    }
    return;
  }
  // 晴/阴：太阳/干爽把身上的湿气晒掉，受凉值清零
  vars._rainExposure = 0;
  var drain = vars.weather === "晴" ? 0.5 : 0.2;
  if (vars.windy) drain -= 0.1;
  vars.strength = Math.max(0, vars.strength - drain);
  flashStatusWarning("⚠ " + (vars.weather === "晴" ? "烈日暴晒" : "户外奔波") + "，体力 -" + drain + " · 剩余 " + fmtStrength(vars.strength));
  if (vars.weather === "晴") vars.chasedByZombies = 0;
}

// 位置回溯追踪：记录位置栈，检测回头路（ch>0 时折返到上一个地点会引来更多丧尸）
// pos 是当前位置的名字，同一物理位置的不同场景共享同一个 pos 名即可
function transit(vars, pos) {
  const prev2 = vars._prevPos2;
  const prev1 = vars._prevPos1;

  // 回头检测：当前地点 === 上上次地点 且 正在被追
  if (pos && pos === prev2 && (vars.chasedByZombies || 0) > 0) {
    vars.chasedByZombies = Math.min(5, (vars.chasedByZombies || 0) + 1);
    // ch 到 5 直接死亡，不需要提示了
    if (vars.chasedByZombies < 5) {
      vars._backtrackWarning = true;
    }
  }

  // 更新位置栈
  vars._prevPos2 = prev1;
  vars._prevPos1 = pos;
}

// 工厂函数：生成"拼命冲刺，甩开追兵！"选项
// destinations 可以是数组或 function(vars) => 数组
function sprintAway(destinations) {
  return {
    showCondition: "chasedByZombies > 2",
    text: "拼命冲刺，甩开追兵！（体力-2）",
    effect: function(vars) {
      vars.strength -= 2;
      vars.chasedByZombies -= Math.floor(Math.random() * 3);
      var dests = typeof destinations === 'function' ? destinations(vars) : destinations;
      vars._sprintDest = dests[Math.floor(Math.random() * dests.length)];
      return updateTime(2)(vars);
    },
    nextScene: "{_sprintDest}"
  };
}

function describeZombieWave(vars) {
  let waveLevel = vars.chasedByZombies;
  if(waveLevel < 0 || waveLevel > 5) return "warning,waveLevel exceeded";

  if(vars._powerOut && !vars.hasTorch) return ""; // 无电且没有手电筒，不显示任何描述，毕竟你无法看到任何东西

  let descriptionSet = [
    ["","不远处有几只丧尸在无目的地游荡，暂时还没注意到你。","你看看周围，除了墙角那只腿断了的丧尸，似乎并没有什么活物。"],//0
    ["空气里多了一丝腐臭，转头一看，几只丧尸从墙角走了出来。","你听到背后传来零星的拖步声，余光里闪过几个歪斜的轮廓。","啪嗒啪嗒，脚步声似乎从看不见的角落传来，你无法确定它的来源。"],//1
    ["身后聚集了一小股尸群，它们挤挤挨挨地跟着你，发出污浊的喘息声。","你转头一看，不知哪里冒出来一群丧尸，它们挥舞着手臂朝你扑来。","一只丧尸突然从旁边冲了出来，你侧身一闪，它扑在地上，声音吸引了周围的丧尸。"],//2
    ["丧尸从四面八方涌来，你不停地躲避着摇晃的身体和伸出的烂手，你已经跑得有点喘不过气了。","丧尸的数量明显多了起来，甚至有几只突然从你身侧撞出，逼得你踉跄着夺路而逃。","你环视四周，发现有几只丧尸正在向你快速冲过来。"],//3
    ["你环视四周，密集的丧尸几乎遮蔽了所有出路，它们张着黑洞洞的嘴，离你的后背仿佛只有咫尺距离，危机感让肾上腺素狂飙。","耳边全是杂乱的吼叫和皮肉摩擦地面的声音，前后左右全是丧尸，留给你的缝隙正在一分一秒地收窄。"],//4
    ["这是真正的地狱——视线所及，天地之间全被涌动的尸潮填满……",
 "无数丧尸构成奔腾不息的洪流，你渺小得像巨浪前的一粒沙。",
    ]
  ];
  let description_thisLevel = descriptionSet[waveLevel];
  if (!description_thisLevel) return "no description";
  let len = description_thisLevel.length;
  if (len == 0) return "len == 0!";
  let result = description_thisLevel[Math.floor(Math.random() * len)];

  // 回头路警告
  if (vars._backtrackWarning) {
    vars._backtrackWarning = false;
    result += "\n\n<span style='color: #ffaa00;'>你折返的脚步在空旷的走廊里回荡——它们听到你的方向了。</span>";
  }

  return result;
}

function canSee(vars) {
  if (vars.currentPlace == "新达汇") return !vars._powerOut || vars.hasTorch;
  // 无电且没有手电筒，不显示任何描述，毕竟你无法看到任何东西
  return 7 <= vars.hh && vars.hh <= 18 || vars.hasTorch;
}

// ====== 汞中毒体征档位（设计细节 §三）======
// 0=无症状 / 1=20-40（皮肤灰白、瞳孔散大）/ 2=40-70（痛觉消失、夜视增强）/ 3=>=70（尸变）
// 只做档位判定，不做任何提示——汞是隐性中毒，提示必须写在正文里（靠 mercuryTier 分支），不要用 flashStatusWarning。
function mercuryTier(load) {
  load = load || 0;
  if (load >= 70) return 3;
  if (load >= 40) return 2;
  if (load >= 20) return 1;
  return 0;
}

// 痛觉旁白：汞负荷 40+ 时痛觉消失（设计细节 §三 / §一-1），把"疼"改写成"麻/迟钝"。
// 用法：受伤节点 text 里写 mercuryPainNote(vars)，它返回一句插入语（0 档返回空串）。
// 例如： "...手臂上" + mercuryPainNote(vars) + "。" 不要在汞低档返回任何东西，保持正文干净。
function mercuryPainNote(vars) {
  if (mercuryTier(vars && vars.mercuryLoad) < 2) return "";
  var pool = [
    "\n<span style='color: #9aa0a6;'>应该是疼的。你等着那股疼上来，它没有来——只有一片迟钝的麻木，从伤口向外漫开。</span>",
    "\n<span style='color: #9aa0a6;'>伤口在渗血。你盯着看了一会儿，才想起来这里本该很疼。</span>",
    "\n<span style='color: #9aa0a6;'>你低头确认了一下伤口的深度，心里某个地方知道这很严重——但身体没有给你任何反馈。</span>"
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

// 汞 20+（tier>=1）皮肤灰白：只在"能照见自己"的载体触发（镜子 / 车窗 / 水面）。
// ⚠ 铁律：玩家学到真相前，正文绝不能出现「汞 / 夜视 / 40-70」这类机制名词——
//    只能用身体描写（"脸是灰的"），让玩家自己觉得不对，而不是被告知。
// surface 传载体名词（"镜子" / "车窗" / "水面"），用于让描写贴合场景。
// 用法：text 里 `desc += mercuryMirrorNote(vars, "水面");`；低档位返回空串，正文保持干净。
function mercuryMirrorNote(vars, surface) {
  if (mercuryTier(vars && vars.mercuryLoad) < 1) return "";
  surface = surface || "镜子";
  if (surface === "水面") {
    return "\n<span style='color: #9aa0a6;'>河面很稳，倒影清清楚楚。你看了一会儿才发现不对——水里那张脸太灰了，灰得像蒙了一层没擦净的粉。你抬手碰了碰自己的脸颊，水面跟着晃开，那张脸散成一片。" +
           "</span>";
  }
  if (surface === "车窗") {
    return "\n<span style='color: #9aa0a6;'>车玻璃蒙了层薄灰，正好当镜用。你无意间瞥见自己的脸——灰的。不是光线的事，你凑近了些，那层灰色还在。" +
           "</span>";
  }
  return "\n<span style='color: #9aa0a6;'>你抬眼看了下镜子。那张脸还在，只是没了该有的颜色——灰的，像蒙了一层没擦净的粉。你凑近了些，确认不是光线的问题。" +
         "</span>";
}

function hasNoTransportation(vars) {
  return !vars.hasEbike && !vars.hasCar && !vars.hasRustyBike && !vars.hasScooter;
}

// 是否有近战武器（普通铁管/拐杖/拖把杆/美工刀 + 警察局高级斧头/匕首；手枪是远程耗弹，不算近战）
function hasMeleeWeapon(vars) {
  return vars.hasIronPipe || vars.hasCane || vars.hasMopHandle
      || vars.hasCutter  || vars.hasAxe  || vars.hasDagger;
}

// 按强度返回"最优"近战武器名（斧头 > 匕首 > 铁管 > 拐杖 > 拖把杆 > 美工刀），无则空串
function meleeWeaponName(vars) {
  if (vars.hasAxe) return "斧头";
  if (vars.hasDagger) return "匕首";
  if (vars.hasIronPipe) return "铁管";
  if (vars.hasCane) return "拐杖";
  if (vars.hasMopHandle) return "拖把杆";
  if (vars.hasCutter) return "美工刀";
  return "";
}

// 按"分量/长度"返回适合砸锁、撬门轴、拨藤蔓的武器名（斧头 > 铁管 > 拐杖 > 拖把杆；美工刀/匕首太短太脆不算），无则空串
// 用于此类动作的选项/剧情文本点名武器；相关场景门槛 condition 也只认这四样
function heavyWeaponName(vars) {
  if (vars.hasAxe) return "斧头";
  if (vars.hasIronPipe) return "铁管";
  if (vars.hasCane) return "拐杖";
  if (vars.hasMopHandle) return "拖把杆";
  return "";
}

// 近战武器档位：弱(1 美工刀/拖把杆) 中(2 拐杖/铁管) 强(3 匕首/斧头)，无(0)
// 强丧尸用 condition: "meleeWeaponTier >= N" 挡弱武器
function meleeWeaponTier(vars) {
  if (vars.hasAxe || vars.hasDagger) return 3;
  if (vars.hasIronPipe || vars.hasCane) return 2;
  if (vars.hasCutter || vars.hasMopHandle) return 1;
  return 0;
}

// ====== 武器耐久（方案C：损坏即降档，无连续耐久条） ======
// 武器只有"断/不断"：断了 hasXxx=false、itemCount-1，meleeWeaponName/meleeWeaponTier 自动降档、
// 次优武器补位；各拾取点的 !hasXxx 守卫随之重新开放——断了能回原处再淘一把，是预期行为，不是 bug。
// _weaponJustBroke 记录刚断的武器名，承接场景 text 用 weaponBrokeText(vars) 拼装（读后清除，一次性）。

var WEAPON_FLAG = { "斧头": "hasAxe", "匕首": "hasDagger", "铁管": "hasIronPipe", "拐杖": "hasCane", "拖把杆": "hasMopHandle", "美工刀": "hasCutter" };
var COMBAT_BREAK_CHANCE = { 1: 0.5, 2: 0.25, 3: 0.1 }; // 战斗闪色失败/超时损坏概率：弱1/中2/强3 档
var HEAVY_USE_VAR = { "铁管": "_heavyUseIronPipe", "拐杖": "_heavyUseCane", "拖把杆": "_heavyUseMopHandle" };
var HEAVY_USE_LIMIT = { "铁管": 3, "拐杖": 3, "拖把杆": 1 }; // 撬砸重活寿命；斧头无限不计，美工刀/匕首不算重工具

// 内部：损坏指定武器。置 flag=false、itemCount-1、清重活计数（重新获得后从0计）、记 _weaponJustBroke
function breakWeaponByName(vars, name) {
  var flag = WEAPON_FLAG[name];
  if (!flag || !vars[flag]) return;
  vars[flag] = false;
  vars.itemCount = Math.max(0, vars.itemCount - 1);
  var useVar = HEAVY_USE_VAR[name];
  if (useVar) vars[useVar] = 0;
  vars._weaponJustBroke = name;
}

// 战斗闪色失败/超时节点 onEnter 调用：按当前最优近战武器档位概率判定损坏，返回是否真断了。
// 只挂在失败上（打输可能赔武器），成功不耗——不惩罚正常游玩。
function tryBreakWeapon(vars) {
  var name = meleeWeaponName(vars);
  if (!name) return false;
  var tier = meleeWeaponTier(vars);
  if (Math.random() >= (COMBAT_BREAK_CHANCE[tier] || 0)) return false;
  breakWeaponByName(vars, name);
  return true;
}

// 给指定重武器计一次撬砸，到上限即损坏（斧头/匕首不在表中，无限寿命直接返回）。
// 用于选项已点名具体武器的场景（如上实南校天桥"用铁管撬开/用拐杖撬开"），计数跟着玩家实际选择走。
function countHeavyUse(vars, name) {
  var useVar = HEAVY_USE_VAR[name];
  if (!useVar) return name;
  vars[useVar] = (vars[useVar] || 0) + 1;
  if (vars[useVar] >= HEAVY_USE_LIMIT[name]) breakWeaponByName(vars, name);
  return name;
}

// 撬砸类重活动作节点 onEnter 调用：给当前最优重武器计一次，到上限即损坏（斧头无限不计）。
// 返回使用的武器名并写入 vars._pryTool 供 text 点名——武器断后 heavyWeaponName 会指向次优武器，不能靠它回读。
// 选项已点名具体武器时不要用这个，改用 countHeavyUse(vars, vars._pryTool)。
function useHeavyTool(vars) {
  var name = heavyWeaponName(vars);
  if (!name) return "";
  vars._pryTool = name;
  return countHeavyUse(vars, name);
}

// 断武器承接文本：有刚断的武器返回一句报废旁白并清除标记（一次性），没有返回空串。
// 用法：结果/失败场景 text 函数末尾拼上 weaponBrokeText(vars)。
function weaponBrokeText(vars) {
  var name = vars._weaponJustBroke;
  if (!name) return "";
  vars._weaponJustBroke = "";
  return "\n" + name + "在这场折腾里彻底报废了，你只好把它扔了。";
}

// ====== 战斗体力消耗（成功也累） ======
// 近战/空手打赢要耗体力；开枪耗弹不耗体力——射击场景不要调用本组函数。
// 两档：空手(tier0)/弱(美工刀/拖把杆 tier1) → -2；中(铁管/拐杖 tier2)/强(匕首/斧头 tier3) → -1。
// 适用范围：QTE 缠斗型战斗的胜利节点。选择式速杀（一击必杀/剧情杀）、非挥武器特殊战
// （关阀/抵门/躲闪沟通）不挂；失败节点不挂（失败惩罚另算且不预告）。

// 一场胜利近战的体力成本（按当前最优近战武器档位）
function combatCost(vars) {
  return meleeWeaponTier(vars) >= 2 ? 1 : 2;
}

// 胜利节点 onEnter 调用：直接改 vars.strength（同 tryBreakWeapon 模式），扣值记入
// _lastCombatDrain 供 combatDrainText 事后提示，返回扣值。
// 扣到 0 会走全局触发器"体力耗尽猝死"——打赢了却累瘫，预期黑色幽默。回溯 skipOnEnter 不会重复扣。
function combatDrain(vars) {
  var c = combatCost(vars);
  vars.strength = Math.max(0, vars.strength - c);
  vars._lastCombatDrain = c;
  return c;
}

// 战斗消耗的事后提示：胜利节点 text 函数末尾拼接——有消耗返回一行【系统提示】并清除
// 标记（一次性，同 weaponBrokeText 模式），没有返回空串。消耗不在选项上预告，
// 玩家打完才从剧情文本里得知（{strength} 由引擎插值，显示当前体力）。
// 用法：text: function(vars) { return "你击退了丧尸。" + combatDrainText(vars); }
function combatDrainText(vars) {
  var c = vars._lastCombatDrain;
  if (!c) return "";
  vars._lastCombatDrain = 0;
  return "\n<span style='color: #ffaa00; font-style: italic;'>【系统提示】体力-" + c + "，当前体力：{strength}。</span>";
}

// ====== 日记本系统（数据层；浏览场景与正文表见 story/日记本.js） ======
// 三类条目统一落 _diaryLog：记忆（gainMemory）/ 剧情事件（addDiaryEvent，如张江抄录报告）/
// 玩家手写（addDiaryNote，落库前转义）。每条自动记录 dd/hh/mm/weather（日期头渲染用）。
// ⚠ 新增记忆一律走 gainMemory(vars, key, type)，禁止裸调 xxxMemorySet.add —— 不进日记 = 内容缺失。

// HTML 转义 + 花括号中和：玩家手写经 innerHTML 渲染（engine.js 用 innerHTML），
// 且 text 函数返回值还会做 {变量名} 插值 —— 花括号转成数字实体，插值阶段失配、显示阶段还原。
function diaryEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
}

// 获得记忆：入对应 Set（结局阈值计数照旧）+ 落一条日记。幂等（重复进场景不重复记）。
// type: "personal" / "game" / "mixed"。返回是否新获得（false=早已持有）。
function gainMemory(vars, key, type) {
  if (!vars._diaryLog) vars._diaryLog = [];
  var set = type === "game" ? vars.gameMemorySet : (type === "mixed" ? vars.mixedMemorySet : vars.personalMemorySet);
  if (set.has(key)) return false;
  set.add(key);
  vars._diaryLog.push({ kind: type, key: key, dd: vars.dd, hh: vars.hh, mm: vars.mm, weather: vars.weather });
  return true;
}

// 剧情自动条目（非记忆、不进任何 Set）：同 key 只记一次（防重入节点重复落账）。
function addDiaryEvent(vars, key) {
  if (!vars._diaryLog) vars._diaryLog = [];
  for (var i = 0; i < vars._diaryLog.length; i++) {
    if (vars._diaryLog[i].kind === "event" && vars._diaryLog[i].key === key) return false;
  }
  vars._diaryLog.push({ kind: "event", key: key, dd: vars.dd, hh: vars.hh, mm: vars.mm, weather: vars.weather });
  return true;
}

// 玩家手写：转义后落库。调用方（"日记本-写"）已确保 text 非空。
function addDiaryNote(vars, text) {
  if (!vars._diaryLog) vars._diaryLog = [];
  vars._diaryLog.push({ kind: "note", text: diaryEscape(text), dd: vars.dd, hh: vars.hh, mm: vars.mm, weather: vars.weather });
  return true;
}

// 条目时间 → 日记日期头文本："6月29日 · 星期一 · 雨"（Day 1 = 2026/6/29）。
// 星期由 Date 对象换算，不手写常量；weather 取落账时的天气。
function diaryDateText(entry) {
  var d = new Date(2026, 5, 29);
  d.setDate(d.getDate() + ((entry.dd || 1) - 1));
  var week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  var s = (d.getMonth() + 1) + "月" + d.getDate() + "日 · 星期" + week;
  if (entry.weather) s += " · " + entry.weather;
  return s;
}

// ====== 日记本跨周目账本（ledger） ======
// 设计依据 核心设定.md §2.2：核心 A/B 结局只统计【当前周目】的记忆，核心 F 结局统计
// 【所有周目累积】——所以跨周目累积记在 _diaryLog（日记账本）里，记忆 Set 不回灌新周目
// （回灌 = A/B 拦截提前触发 = F 永远不可达）。Set 快照仍随账本留档备查。
// 两条重开路径（右上角"重新开始"按钮 / 刷新页后存档框"从 Day 1 重新开始"）在清档前调
// persistDiaryLedger（持有日记本才有继承资格）；新周目在樱桃苑「拿上日记本」时调
// restoreDiaryLedger 合并旧账。函数实现在本文件（story 层），engine.js 只有两处一行钩子。

// 账本独立于剧本存档（SAVE_KEY），外部重开/换浏览器不迁移——"全部格式化"的语义留给将来
var DIARY_LEDGER_KEY = "shichaobiji_diary_ledger_v1";

// 条目指纹：记忆/事件按 kind+key（同一记忆两个周目各记一次 = 同一页，不重复出两张）；
// 手写按 时刻+全文（同一分钟写同一句话视为同一页，概率可忽略）。
function diaryEntrySig(e) {
  return e.kind === "note"
    ? "note|" + (e.dd || 1) + "|" + (e.hh || 0) + "|" + (e.mm || 0) + "|" + e.text
    : (e.kind || "?") + "|" + (e.key || "");
}

// 条目排序键：周目号 → 游戏内时刻。旧周目排在前（日记是从后往前翻的：最新页=本周目）。
function diaryEntryOrder(e) {
  return (e.run || 1) * 1000000 + (e.dd || 1) * 1440 + (e.hh || 0) * 60 + (e.mm || 0);
}

// 重开前落账：给本周目新条目补周目戳，与三套记忆 Set 快照一起写进独立 localStorage key。
// 仅持有日记本时调用（继承资格 = 关键道具在手）；存储不可用则静默降级为不留账。
function persistDiaryLedger(vars) {
  if (!vars || !vars.hasDiary || typeof localStorage === "undefined") return false;
  var run = vars._runNumber || 1;
  var log = (vars._diaryLog || []).map(function (e) {
    return e.run ? e : Object.assign({}, e, { run: run });
  });
  try {
    localStorage.setItem(DIARY_LEDGER_KEY, JSON.stringify({
      version: 1,
      runs: run,                      // 已经历（账本连续）的周目数；新周目号 = runs + 1
      diaryLog: log,
      // 记忆 Set 快照：当前实现不回灌（A/B 只看当前周目），仅留档备查
      gameMemory:     vars.gameMemorySet     instanceof Set ? Array.from(vars.gameMemorySet)     : [],
      personalMemory: vars.personalMemorySet instanceof Set ? Array.from(vars.personalMemorySet) : [],
      mixedMemory:    vars.mixedMemorySet    instanceof Set ? Array.from(vars.mixedMemorySet)    : []
    }));
    return true;
  } catch (e) { return false; }
}

// 新周目拿上日记本时合并旧账：旧周目条目去重后并入 _diaryLog（按周目+时刻排序，旧账在前），
// 本周目尚未打戳的条目盖上本周目号，_runNumber 更新。返回并入条数（0 = 无旧账/不可用）。
// 幂等：重复拾取/回溯重入不产生重复条目（sig 去重）。记忆 Set 不回灌，见节首注释。
function restoreDiaryLedger(vars) {
  if (!vars || typeof localStorage === "undefined") return 0;
  var raw = null;
  try { raw = localStorage.getItem(DIARY_LEDGER_KEY); } catch (e) { return 0; }
  if (!raw) return 0;
  var led = null;
  try { led = JSON.parse(raw); } catch (e) { return 0; }
  if (!led || led.version !== 1 || !Array.isArray(led.diaryLog)) return 0;

  var run = (led.runs || 0) + 1;
  vars._runNumber = run;
  if (!vars._diaryLog) vars._diaryLog = [];
  vars._diaryLog.forEach(function (e) { if (!e.run) e.run = run; });

  var seen = {};
  vars._diaryLog.forEach(function (e) { seen[diaryEntrySig(e)] = 1; });
  var old = [];
  for (var i = 0; i < led.diaryLog.length; i++) {
    var e = led.diaryLog[i];
    if (!e) continue;
    e.run = e.run || 1;
    var sig = diaryEntrySig(e);
    if (seen[sig]) continue;   // 本周目已重记的同源条目：保留本周目的，跳过旧页
    seen[sig] = 1;
    old.push(e);
  }
  if (old.length === 0) return 0;
  vars._diaryLog = old.concat(vars._diaryLog).sort(function (a, b) {
    return diaryEntryOrder(a) - diaryEntryOrder(b);
  });
  return old.length;
}

// ====== 记忆闪色辅助函数 ======

function randSeq(colors, len) {
  const seq = [];
  for (let i = 0; i < len; i++) {
    seq.push(colors[Math.floor(Math.random() * colors.length)]);
  }
  return seq;
}

function seqToAnswer(seq) {
  const counts = {};
  for (const c of seq) counts[c] = (counts[c] || 0) + 1;
  const order = ['红','蓝','绿','黄','紫','白'];
  return order.filter(c => counts[c]).map(c => counts[c] + c).join('');
}

// 工厂函数：生成记忆闪色场景的 onEnter
// 用法同 updateTime：onEnter: initMemoryGame(["红","蓝","绿"], 5)
function initMemoryGame(colors, len, effect = {}) {
  return function(vars) {
    const seq = randSeq(colors, len);
    vars._currentSeq = seq;
    vars._currentAnswer = seqToAnswer(seq);
    vars._seqPlayed = false;
    return effect; // 其它额外效果
  };
}

// 标准化颜色输入：无论写"3红2蓝"还是"2蓝3红"，都变成"蓝:2,红:3"（按颜色名排序）
// 配合函数 match 实现模糊比对
function normalizeColorAnswer(str) {
  const colors = ['红','蓝','绿','黄','紫','白'];
  const counts = {};
  const re = /(\d+)([红蓝绿黄紫白])/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    counts[m[2]] = (counts[m[2]] || 0) + parseInt(m[1], 10);
  }
  return colors.filter(c => counts[c]).map(c => c + ':' + counts[c]).join(',');
}

// 记忆闪色标准判定：把玩家输入(_input)与当前答案(_currentAnswer)模糊比对
// 用法: condition: checkFlashAnswer
function checkFlashAnswer(vars) {
  return normalizeColorAnswer(vars._input) === normalizeColorAnswer(vars._currentAnswer);
}

// 躲藏场景工厂：统一管理随机躲藏逻辑与 _hideFail 状态
// 用法: "场景": hideOnLocation("images/placeholder.png" /* TODO: images/xxx.png */, "失败文案", "成功文案")
// image / failText / successText 可以是字符串或 function(vars) => string
function hideOnLocation(image, failText, successText) {
  // 兼容旧调用：如果只有2个参数且第一个不是图片路径，则 image 为 failText, failText 为 successText
  if (successText === undefined) {
    successText = failText;
    failText = image;
    image = undefined;
  }
  return {
    image: image,
    onEnter: function(vars) {
      vars.showRain = true;  // 户外躲藏，雨天叠加雨滴
      updateTime(15 + Math.floor(Math.random() * 16))(vars);
      vars._travelMinutes = 0;  // 躲藏是静止，不累积连续移动疲劳
      if (vars.chasedByZombies >= 4 && Math.random() < 0.4) {
        vars.strength = Math.max(0, vars.strength - 1);
        vars._hideFail = true;
      } else {
        vars.chasedByZombies = Math.max(0, vars.chasedByZombies - 1);
        vars._hideFail = false;
      }
      return {};
    },
    text: typeof failText === 'function' || typeof successText === 'function'
      ? function(vars) {
          if (vars._hideFail) {
            return typeof failText === 'function' ? failText(vars) : failText;
          }
          return typeof successText === 'function' ? successText(vars) : successText;
        }
      : function(vars) {
          return vars._hideFail ? failText : successText;
        },
    // 躲完后返回来源场景，避免"无选项 → 剧终"
    choices: [
      { text: "继续前进", nextScene: function(vars) { return vars._lastScene || "三林路-环林东路 十字路口"; } }
    ]
  };
}

// 可当口粮"给出去/吃掉/喂猫/交给路霸或假郎中"的食物清单一处维护（[flag, 显示名]）。
// 水、假解毒剂不算口粮。
var FOOD_GIFTS = [
  ["hasBiscuit", "压缩饼干"], ["instantNoodle", "方便面"], ["hasCannedFood", "罐头"],
  ["hasSnackCookie", "味千小饼干"], ["hasHamSausage", "火腿肠"], ["hasCracker", "夹心饼干"],
  ["hasTeethingBiscuit", "磨牙饼干"], ["hasCatSnack", "脆脆炒米"], ["hasCanteenFood", "食堂干粮"], ["hasFrozenMeat", "冻肉"]
];

// 身上是否有"能当口粮给出去/吃掉"的实打实食物（水、假解毒剂不算）
// 供路霸讨要、天台假郎中交换等"掏食物"判定使用
function hasFood(vars) {
  for (var i = 0; i < FOOD_GIFTS.length; i++) {
    if (vars[FOOD_GIFTS[i][0]]) return true;
  }
  return false;
}

// 生成"从背包挑一份食物给出去"的选项列表（玩家自选给哪样，且只扣对应那一格）。
// opts: {
//   pickText: "给他{名}",        // {名} 会被替换为食物显示名
//   pickScene: "交易成功场景",    // 选中后跳转
//   onPick: function(vars, flag), // 选中某食物后的额外结算（如路霸记当天买路、郎中得假药、喂猫解除尾随）
//   cancelText: "算了，不给了",   // 可选：不传则不生成"算了"项。走独立"给食物"子场景的用法（路霸/郎中/王老师）
//   cancelScene: "返回场景"       //   需要取消项；选项直接嵌在父场景里（新达汇喂变异猫）则不用传
// }
// 返回可直接当 scene.choices 的 choices 函数。以后新增"给食物"剧情直接复用，不用重写循环。
function foodGiftChoices(opts) {
  return function(vars) {
    var cs = [];
    for (var i = 0; i < FOOD_GIFTS.length; i++) {
      (function(flag, label) {
        if (vars[flag]) {
          cs.push({
            text: opts.pickText.replace("{名}", label),
            nextScene: opts.pickScene,
            effect: function(v) {
              // 可堆叠口粮是数字（如 instantNoodle 包数 / vitaminC 盒数），只扣 1 份；布尔标记直接置 false
              if (typeof v[flag] === "number") v[flag] = Math.max(0, v[flag] - 1);
              else v[flag] = false;
              v.itemCount = Math.max(0, v.itemCount - 1);
              if (opts.onPick) opts.onPick(v, flag);
              return {};
            }
          });
        }
      })(FOOD_GIFTS[i][0], FOOD_GIFTS[i][1]);
    }
    if (opts.cancelText) cs.push({ text: opts.cancelText, nextScene: opts.cancelScene });
    return cs;
  };
}

// 路霸是否正堵着"十字路口↔金谊"的三林路直达线。
// 没被永久打死(_roadBull!=1)，且当天既没被打跑也没交过买路钱 → 堵着。
function roadBullBlocked(vars) {
  if (vars._roadBull === 1) return false;
  if (vars._roadBullBeatenDay === vars.dd) return false;
  if (vars._roadBullPaidDay === vars.dd) return false;
  return true;
}

function zombieAtHomeDoor(vars) { // 丧尸还在家门口
  return vars.dd == 1 && vars.hh < 10;
}

// ====== 过场动画节点工厂 ======
// 文字逐字显示（打字机），显示完后按字数停留，超时自动前进到 nextScene。
// qte.typewriter: true 让 QTE 场景保留打字机效果（默认 QTE 会跳过打字机、文字一次性全显）。
// 过场节点不生成 choices 按钮——引擎将其识别为非结局节点（有 qte），纯自动播放，超时跳 nextScene。
// options（可选）：{ image, onEnter }。onEnter 为 effect 对象或函数，如 { set: { showRain: true } }。
// 用法：Object.assign(storyData, { "节点ID": travelScene("沿途文字……", "下一个场景ID", { onEnter: { set: { showRain: true } } }) })
function travelScene(text, nextScene, options) {
  options = options || {};
  var plain = String(text).replace(/<[^>]*>/g, '');  // 去掉 HTML 标签算字数
  var ms = Math.max(2000, plain.length * 50);         // 打字机显示完后额外停留时长（最短 2 秒）
  var scene = {
    image: options.image || "images/placeholder.png",
    qte: { timeout: ms, hidden: true, typewriter: true, onTimeout: nextScene },
    text: text
  };
  if (options.onEnter) scene.onEnter = options.onEnter;
  return scene;
}

function zombieOutsideHome(vars) { // 丧尸在家门口
  return (vars.dd == 1 || vars.dd == 3) && vars.hh % 2 == 0;
}

// ====== 手机地图导航（挂在"整理整理"，showCondition: hasPhone） ======
// 导航表：每条 = { keys:玩家可能输入的关键词, name:显示名, route:途经的真实场景ID, tip:方向/条件提示 }
// route 直接用游戏节点 ID —— 点亮机制：去过的节点(_visit>0)报出节点名，没去过的显示 ？？？。
// 需要补新目的地时，只在 NAV_TABLE 里加一条即可，不用改引擎。目前只收录了前往仁济、建平两条高架线。
var NAV_TABLE = [
  {
    keys: ["仁济", "仁济医院", "仁济南院", "南院"],
    name: "仁济医院南院",
    route: [
      "三林路-环林东路 十字路口",
      "杨高南路立交桥",
      "济阳路跨线桥",
      "仁济南院-浦锦路"
    ],
    tip: "全程走高架，必须有车。上杨高南路立交桥后往西，到济阳路跨线桥朝西北下高架。"
  },
  {
    keys: ["建平", "建平中学"],
    name: "建平中学",
    route: [
      "三林路-环林东路 十字路口",
      "杨高南路立交桥",
      "外环罗山路立交桥",
      "张江立交桥",
      "罗山路立交桥下",
      "建平-校园门口"
    ],
    tip: "全程走高架，必须有车。上杨高南路立交桥后沿外环一路往东，到罗山路立交桥下下高架。"
  }
];

// 按玩家输入(_input)模糊匹配导航表；查不到返回 null
function navLookup(input) {
  if (!input) return null;
  var s = String(input).trim();
  if (!s) return null;
  for (var i = 0; i < NAV_TABLE.length; i++) {
    for (var j = 0; j < NAV_TABLE[i].keys.length; j++) {
      if (s.indexOf(NAV_TABLE[i].keys[j]) >= 0) return NAV_TABLE[i];
    }
  }
  return null;
}

// 渲染一条导航结果：去过的节点报节点名，没去过的打问号（点亮机制）
function navRouteText(vars, entry) {
  var visit = vars._visit || {};
  var complete = true;
  var lines = "";
  for (var i = 0; i < entry.route.length; i++) {
    var id = entry.route[i];
    if (visit[id] > 0) {
      lines += "\n" + (i + 1) + "、" + id;
    } else {
      lines += "\n" + (i + 1) + "、？？？";
      complete = false;
    }
  }
  var out = "你在离线地图上标出了去【" + entry.name + "】的路线：" + lines + "\n" + entry.tip;
  if (!complete) {
    out += "\n标着问号的路段你还没走过，地图上是一片空白——到了那儿再看吧。";
  }
  return out;
}

// 王知筠手机锁屏草稿（仁济检验科 / 整理整理共用）
// reopen: true = 已经拿在身上再打开（整理背包、检验科回看）
function wangPhoneLockscreenText(vars, reopen) {
  var head = reopen
    ? "你拿出王知筠的手机。电量还剩 " + vars.wangPhoneBattery + "%。\n"
    : "你拿起那部手机。屏幕自动亮了起来，电量还剩 " + vars.wangPhoneBattery + "%。\n";
  var tail;
  if (vars.wangPhoneBattery >= 6) {
    tail = "\n相册里还有一段视频，电量还够，也许能看。";
  } else if (vars.wangPhoneBattery >= 1) {
    tail = "\n相册里还有一段视频，但这点电量估计撑不到播放完。";
  } else {
    tail = "\n屏幕闪了一下就黑了——电量彻底耗尽。得先充上电。";
  }
  return head +
    "锁屏上停着一条没发出去的动态草稿：\n" +
    "“我刚从仁济南院拿到脑脊液样本的数据，甲基汞含量超过正常值40倍。这不是病毒，是汞中毒。扩散路径是自来水。”\n" +
    "发送按钮永远停在了那个界面。" + tail;
}

function wangPhoneVideoText() {
  return "视频开始播放。一个戴银框圆眼镜的年轻女人坐在检验科的台面前，对着镜头说话，语速偏快，有点紧张但逻辑清晰：\n\
“如果你看到这条视频，说明我可能已经出事了。先说结论：这不是病毒，是甲基汞中毒。\n\
6月24日，黄浦江采样点甲基汞超标近40倍。我反复验证过，不是枪头的问题。\n\
扩散路径是自来水。芜湖那边的一个化工厂封存区泄漏了，含汞废水进了长江，自来水厂取水口在下游……\n\
被咬伤是二次传播。唾液里的汞剂量很低，不会立刻致命，但如果持续喝污染水，血汞会突破重症阈值。\n\
别喝自来水。如果已经喝了——我也不知道该怎么办了。请转发。”\n\
她侧头听了一下，说：“有人来了，我去看看。”\n\
镜头被随手放在台面上，画面对着天花板，然后中断。";
}

// 割/锯类工具（用于划开胶带封死的纸箱）：美工刀 > 匕首 > 斧头 > 螺丝刀，无则空串。
// 门槛写法：condition: function(v) { return !!cuttingToolName(v); }（用函数条件，避免为它新增 computed 变量）
function cuttingToolName(vars) {
  if (vars.hasCutter) return "美工刀";
  if (vars.hasDagger) return "匕首";
  if (vars.hasAxe) return "斧头";
  if (vars.hasScrewdriver) return "螺丝刀";
  return "";
}