// 根据游戏内时间返回对应时段的图片路径
// map: { morning, evening, night, midnight } — morning 必填，其余可选（fallback 到 morning）
function timeImage(map) {
  return function(vars) {
    const hh = vars.hh;
    let key;
    if (hh >= 16 && hh <= 18) key = "evening";
    else if (hh >= 19 && hh <= 22) key = "night";
    else if (hh === 23 || (hh >= 0 && hh <= 6)) key = "midnight";
    else key = "morning";  // 7-15
    return map[key] || map.morning;
  };
}

function updateTime(addMinutes, extraEffect = {}) { // 更新时间
  addMinutes = addMinutes || 0;
  return function(vars) {
    var oldHh = vars.hh;
    vars.mm += addMinutes;
    vars.hh += Math.floor(vars.mm / 60);
    vars.mm %= 60;
    vars.dd += Math.floor(vars.hh / 24);
    vars.hh %= 24;
    // 天气：跨越整点时更新
    if (vars.hh !== oldHh || addMinutes >= 60) {
      updateWeather(vars);
    }
    return extraEffect;
  }
// 运用了一个特性：updateTime 直接修改了参数 vars（也就是 gameState），但返回的是空 effect 对象。这碰巧能工作，因为 applyEffect 之前 vars 已经被改了。
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
        "阳光炽烈，晒得地面泛着白光。偶尔一阵风吹过，树叶哗哗作响，稍微缓解了炎热。",
        "太阳火辣辣地挂在天上，影子缩成脚下小小一团。阵风掠过，带起一阵热浪和灰尘。",
        "天空蓝得发白，阳光刺得人眯起了眼。风从树梢间穿过，把蝉鸣声吹得时远时近。"
      ];
    } else {
      pool = [
        "烈日当空，空气凝滞——没有一丝风。热浪从柏油路面蒸腾上来，远处的景物在热空气中微微扭曲。",
        "太阳像一只烧红的铁盘扣在天上，闷得人喘不过气。树叶一动不动，整个世界安静得只剩下蝉鸣。",
        "天气闷热得让人烦躁。汗水顺着额头往下淌，衣服早被浸透了。路面上蒸腾的热气模糊了远处的建筑。"
      ];
    }
  } else if (s === "阴") {
    if (w) {
      pool = [
        "天空蒙着一层铅灰色的云，看不到太阳。风断断续续地吹着，路边的塑料袋在地上翻滚，空气又闷又湿。",
        "灰白的云层一直铺到天际线。风吹过来带着一股潮气，像暴雨要来但总也不来。",
        "云层像被揉皱的棉絮，层层叠叠地堆在天上。风时大时小，把路边的枯叶卷起来又放下。"
      ];
    } else {
      pool = [
        "厚厚的云层压得很低，空气闷得像蒸笼。没有风，衣服粘在背上，呼吸都带着一股潮气。",
        "乌云阴沉沉地压在城市上方，仿佛随时会塌下来。空气静止得像一潭死水，连路边的杂草都纹丝不动。",
        "天色暗沉，分不清是上午还是傍晚。空气又闷又重，每吸一口都觉得费力。"
      ];
    }
  } else { // 雨
    if (w) {
      pool = [
        "雨不紧不慢地下着。风把雨丝吹得歪歪斜斜，打在路面上溅起细细的水花。远处偶尔传来低沉的雷声。",
        "雨点被风裹挟着斜打在脸上，凉凉的。路面的积水被雨滴砸出密密麻麻的涟漪，又被风揉碎。",
        "风雨交织，行道树被吹得左右摇晃，雨水顺着叶片哗哗地往下淌。远处传来一阵闷雷，像天空在低吼。"
      ];
    } else {
      pool = [
        "雨直直地落下来，整个世界只剩下淅淅沥沥的雨声。路面上的积水倒映着灰蒙蒙的天空，空气里弥漫着湿润的泥土味。",
        "雨丝细密而均匀，不紧不慢地洗刷着街道。没有风，雨帘笔直地垂落，像天地间挂了无数道透明的线。",
        "雨声沙沙的，不急不缓。水珠顺着屋檐、路灯、招牌的边缘往下滴，整个世界都笼罩在一片灰蒙蒙的雨幕中。"
      ];
    }
  }
  return pool[n];
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
    text: "拼命冲刺，甩开追兵！",
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

function hasNoTransportation(vars) {
  return !vars.hasEbike && !vars.hasCar && !vars.hasRustyBike && !vars.hasScooter;
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
      updateTime(15 + Math.floor(Math.random() * 16))(vars);
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
        }
  };
}