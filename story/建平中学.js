// ==================== 建平中学 ====================
// 北线·第一梯队：主角的高中。主线幸存营救（忻老师 + 高中同学）。
// 本文件：校园门口 + 校园内部地点节点与连接网络（骨架，剧情后续填充）。
// 地面·北线高架路径在 上海市区路径.js。

// ==================== 垂直通道节点工厂 ====================
// 从 _lastScene（上一个渲染的场景）解析玩家当前所在楼层号；解析失败返回 null。
function jpCurrentFloor(vars, prefix, floors) {
  var last = vars._lastScene || "";
  var m = last.match(/(\d+)F$/);
  if (m && last.indexOf(prefix) === 0) {
    var f = parseInt(m[1], 10);
    if (floors.indexOf(f) >= 0) return f;
  }
  return null;
}

// 楼梯间通用选项：根据 _lastScene 判断当前楼层，只生成"上下 1 层"。
function jpStairChoices(vars, prefix, floors) {
  var minFloor = floors[0];
  var maxFloor = floors[floors.length - 1];
  var floor = jpCurrentFloor(vars, prefix, floors);
  if (floor === null) {
    // 保底：无法判断当前层时列出所有楼层
    return floors.map(function(f) {
      return { text: "去" + f + "楼", nextScene: prefix + "-" + f + "F", effect: updateTime(2) };
    });
  }
  var choices = [];
  if (floor > minFloor) {
    choices.push({ text: "下到" + (floor - 1) + "楼", nextScene: prefix + "-" + (floor - 1) + "F", effect: updateTime(2) });
  }
  if (floor < maxFloor) {
    choices.push({ text: "上到" + (floor + 1) + "楼", nextScene: prefix + "-" + (floor + 1) + "F", effect: updateTime(2) });
  }
  return choices;
}

// 楼梯间：只能上下 1 层。chIncrease 可选：进入时追加的追击等级（环境叙事型楼梯的持续成本）。
function jpStair(prefix, label, floors, chIncrease) {
  return {
    image: "images/placeholder.png" /* TODO: images/jianping/stairwell.png */,
    onEnter: function(vars) { vars.currentPos = label; return chIncrease ? { add: { chasedByZombies: chIncrease } } : {}; },
    text: function(vars) { return label + "。"; },
    choices: function(vars) { return jpStairChoices(vars, prefix, floors); }
  };
}

// 堵路楼梯间：一只强丧尸堵路，需武器（斧/枪/匕首）击杀（一次性，武器不消耗）。没武器只能退回/绕路。
function jpBlockedStair(sceneId, prefix, label, floors, clearedVar) {
  return {
    image: "images/placeholder.png" /* TODO: images/jianping/stairwell.png */,
    onEnter: function(vars) { vars.currentPos = label; },
    text: function(vars) {
      if (!vars[clearedVar]) {
        return label + "。\n一只格外强壮的丧尸堵在楼梯拐角——它比普通丧尸大一圈，低吼着，徒手根本对付不了。" + describeZombieWave(vars);
      }
      return label + "。" + describeZombieWave(vars);
    },
    choices: function(vars) {
      if (!vars[clearedVar]) {
        var cs = [];
        if (vars.hasAxe) cs.push({ text: "用斧头劈开丧尸", nextScene: sceneId, effect: function(v) { v[clearedVar] = true; v.chasedByZombies = Math.min(5, v.chasedByZombies + 1); return {}; } });
        if (vars.hasGun) cs.push({ text: "用手枪射杀丧尸", nextScene: sceneId, effect: function(v) { v[clearedVar] = true; v.chasedByZombies = Math.min(5, v.chasedByZombies + 2); return {}; } });
        if (vars.hasDagger) cs.push({ text: "用匕首刺穿丧尸头颅", nextScene: sceneId, effect: function(v) { v[clearedVar] = true; v.chasedByZombies = Math.min(5, v.chasedByZombies + 1); return {}; } });
        cs.push({ text: "退回", nextScene: function(v) { return v._lastScene; } });
        return cs;
      }
      return jpStairChoices(vars, prefix, floors);
    }
  };
}

// 电梯间：可直达任意楼层（坐电梯，快；会唤醒 Harsh）。
// 激活时播种轨迹：垫 5 份电梯位置，Harsh 起步落后 5 步（约 50 分钟才能追到）。
function jpElevator(prefix, label, floors) {
  var choices = [];
  floors.forEach(function(f) {
    choices.push({ text: "坐电梯去" + f + "楼", nextScene: prefix + "-" + f + "F", effect: updateTime(1) });
  });
  return {
    image: "images/placeholder.png" /* TODO: images/jianping/elevator.png */,
    onEnter: function(vars) {
      vars.currentPos = label;
      vars._harshActive = true;
      vars._harshCaught = false;
      vars._harshIndex = 0;
      vars._harshLastTick = Math.floor((vars.gameMinutes || 0) / 10);   // 重置计步基准，避免休眠期"补进度"
      vars._harshTrack = [prefix + "-电梯", prefix + "-电梯", prefix + "-电梯", prefix + "-电梯", prefix + "-电梯", prefix + "-电梯"];
      flashStatusWarning("⚠ 电梯启动的嗡鸣声中，楼上传来一声凄厉的嚎叫——有什么东西醒了。");
    },
    text: function(vars) { return label + "。" + describeZombieWave(vars); },
    choices: choices
  };
}

// 房间节点（封闭空间，无丧尸描述）。label 为完整显示名，backScene 为返回的楼层场景。
function jpRoom(label, backScene) {
  return {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = label; },
    text: label + "。",
    choices: [
      { text: "离开", nextScene: backScene, effect: updateTime(1) }
    ]
  };
}

// 饭点判断：午餐 11-13、晚餐 17-19（彭奕宸/蔡镜晓的移动时间）
function jpIsMealTime(vars) {
  return (vars.hh >= 11 && vars.hh <= 13) || (vars.hh >= 17 && vars.hh <= 19);
}

// Harsh 追踪：玩家进入地点节点时记录轨迹（仅 Harsh 激活时）。在地点节点 onEnter 里调用。
// 路径剪枝：玩家原路折返一步时，弹出"凸出"的那格——[a,b,c,d] 后回到 c，
// 轨迹剪成 [a,b,c]（不再重复 push c），Harsh 沿剪后轨迹追到中段 c 才可能迎面撞上，
// 而不是"瞬移到轨迹末尾"抓你；同时防止轨迹因来回绕圈无限膨胀。
function jpHarshTrack(vars, sceneId) {
  if (!vars._harshActive) return;
  var track = vars._harshTrack || [];
  if (track.length >= 1 && track[track.length - 1] === sceneId) return;  // 已在末尾（原地停留/重复进同一场景），不重复记
  if (track.length >= 2 && track[track.length - 2] === sceneId) {
    // 折返一步：弹出末尾凸出点，末尾即当前场景，无需再 push
    track.pop();
    if (vars._harshIndex >= track.length) vars._harshIndex = track.length - 1;
    if (vars._harshIndex < 0) vars._harshIndex = 0;
    vars._harshTrack = track;
    return;
  }
  vars._harshTrack = track.concat([sceneId]);
}

// Harsh 距离提示：写入地点节点 text 末尾（仅激活且足够近时）。
// 遭遇前（_harshEncounters == 0）保持悬念用"身影"；被堵住过一次后才直呼 Harsh。
function jpHarshHint(vars) {
  if (!vars._harshActive || !vars._harshTrack || vars._harshTrack.length < 2) return "";
  var dist = vars._harshTrack.length - 1 - vars._harshIndex;
  var met = (vars._harshEncounters || 0) > 0;
  if (dist <= 0) return "\n<span style='color:#ff4444;'>——" + (met ? "Harsh" : "那个身影") + "就在你眼前！</span>";
  if (dist <= 2) return "\n<span style='color:#ffaa00;'>身后传来拖沓的脚步声，" + (met ? "Harsh" : "有什么东西") + "越来越近了……</span>";
  if (dist <= 4) return met ? "\n远处，Harsh还在跟着你。" : "\n远处似乎有个身影在跟着你。";
  return "";   // 距离远时不提及（不剧透）
}

// 建平躲藏场景：reduceLevel 2=室内封闭（降ch2，不失败）；1=半开放/户外（降ch1，ch≥3 时 40% 失败）
function jpHide(image, successText, failText, reduceLevel) {
  return {
    image: image || "images/placeholder.png",
    onEnter: function(vars) {
      vars.showRain = true;
      updateTime(30)(vars);
      if (reduceLevel <= 1 && vars.chasedByZombies >= 3 && Math.random() < 0.4) {
        vars.strength = Math.max(0, vars.strength - 1);
        vars._hideFail = true;
      } else {
        vars.chasedByZombies = Math.max(0, vars.chasedByZombies - reduceLevel);
        vars._hideFail = false;
      }
      return {};
    },
    text: function(vars) { return vars._hideFail ? failText : successText; },
    // 躲完后返回来源场景，避免"无选项 → 剧终"
    choices: [
      { text: "继续", nextScene: function(vars) { return vars._lastScene || "建平-金苹果大道"; } }
    ]
  };
}

Object.assign(storyData, {

  // ==================== 校园门口（到达中转节点） ====================

  "建平-校园门口": {
    image: "images/placeholder.png" /* TODO: images/jianping/campusGate.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "建平中学"; vars.currentPlace = "建平"; vars.currentPos = "校园门口"; },
    text: function(vars) {
      return "你站在建平中学前门马路对面的一棵行道树后，没有急着靠近。\n\
校门还是老样子——“上海市建平中学”七个金字静静地立在墙上，移动门半开。你能看到里面那片熟悉到骨子里的金苹果广场，和广场上歪歪斜斜游荡着的身影。\n\
校门口内外都有丧尸，只是现在它们还没注意到你。你压低身子，盘算着怎么进去。" + describeZombieWave(vars);
    },
    choices: [
      { text: "去前门看看", nextScene: "建平-前门", effect: updateTime(5) },
      { text: "绕去后门", nextScene: "建平-后门", effect: updateTime(10) },
      { text: "去门卫室", nextScene: "建平-门卫室", effect: updateTime(1) },
      { text: "离开这里", nextScene: "罗山路立交桥下", effect: updateTime(10) }
    ]
  },

  // ==================== 校园入口 ====================

  "建平-前门": {
    image: "images/placeholder.png" /* TODO: images/jianping/frontGate.png */,
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.currentArea = "建平中学"; vars.currentPlace = "建平"; vars.currentPos = "前门";
      if (!vars._frontGateCleared) {
        var seq = randSeq(["红","蓝","绿"], 5);
        vars._currentSeq = seq;
        vars._currentAnswer = seqToAnswer(seq);
        vars._seqPlayed = false;
      }
      return {};
    },
    text: function(vars) {
      if (vars._frontGateCleared) {
        return "前门的丧尸已经清空了。你上次冲进来时把它们都甩在了门外。\n现在这里安静了不少，可以自由进出。" + describeZombieWave(vars);
      }
      return "你贴着墙根摸到前门。铁门半敞着，门内外的丧尸已经发现了你，正从两侧缓缓围拢过来。\n你必须趁它们合围之前冲进去。\n<span style='color:#ffaa00;'>集中注意力，记住那些闪烁的颜色！</span>";
    },
    choices: function(vars) {
      if (vars._frontGateCleared) {
        return [
          { text: "走进前门", nextScene: "建平-金苹果广场", effect: updateTime(2) },
          { text: "去校园门口", nextScene: "建平-校园门口", effect: updateTime(5) }
        ];
      }
      return [
        {
          text: "输入你看到的颜色分布",
          input: { placeholder: "例如：3红2蓝" },
          condition: checkFlashAnswer,
          nextScene: "建平-前门-清场",
          elseScene: "结局-前门失守",
          timeout: 12000,            // 5色闪完约4秒，留约8秒输入
          timeoutScene: "结局-前门失守"
        }
      ];
    }
  },

  "建平-前门-清场": {
    image: "images/placeholder.png" /* TODO: images/jianping/frontGate.png */,
    onEnter: { set: { _frontGateCleared: true, showZombies: true, currentPos: "前门" } },
    text: "你记住了颜色的顺序，在丧尸合围之前冲进了前门。\n身后的丧尸被你甩在了门外——它们一时半会儿追不上来。",
    choices: [
      { text: "进入金苹果广场", nextScene: "建平-金苹果广场", effect: updateTime(1) }
    ]
  },

  "结局-前门失守": {
    image: "images/zombieKnockYouDown.png",
    text: "你记错了颜色的顺序——等你回过神来，丧尸已经扑到了你身上。\n—— 结局：前门失守 ——"
  },

  "建平-后门": {
    image: "images/placeholder.png" /* TODO: images/jianping/backGate.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "建平中学"; vars.currentPlace = "建平"; vars.currentPos = "后门"; },
    text: function(vars) {
      var desc = "你绕到学校后门。";
      if (vars._backGateOpened) {
        desc += "后门已经大开着——门内那些丧尸都被你上次开门时引走了，现在这里空荡荡的。";
      } else {
        desc += "丧尸都挤在门内，隔着铁栅栏朝外伸着手臂，低沉的嘶吼连成一片。门内黑压压的一片，看不清到底有多少。";
      }
      return desc + describeZombieWave(vars);
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._backGateOpened) {
        cs.push({ text: "打开后门", nextScene: "建平-后门-开门", effect: updateTime(1) });
      }
      cs.push({ text: "去后门辅路", nextScene: "建平-后门辅路", effect: updateTime(2) });
      cs.push({ text: "去校园门口", nextScene: "建平-校园门口", effect: updateTime(10) });
      return cs;
    }
  },

  "建平-后门-开门": {
    image: "images/placeholder.png" /* TODO: images/jianping/backGate.png */,
    onEnter: function(vars) {
      vars._backGateOpened = true;  // 开门引走丧尸（忻老师后门逃脱的铺垫）
      vars.showZombies = true;
      vars.currentPos = "后门";
      return {};
    },
    text: "你深吸一口气，握住门闩，猛地拉开了后门。\n门轴发出刺耳的摩擦声，门内的丧尸被惊动，齐刷刷地转过头来。\n——后门开了，但丧尸也都被你引了过来。",
    choices: [
      { text: "直接开打！", nextScene: "建平-后门-开打" },
      { text: "快逃！去校园门口", nextScene: "建平-校园门口", effect: updateTime(5) }
    ]
  },

  "建平-后门-开打": {
    image: "images/placeholder.png" /* TODO: images/jianping/backGate.png */,
    onEnter: initMemoryGame(["红","蓝","绿"], 5, { set: { showZombies: true, currentPos: "后门" } }),
    text: "你迎着丧尸群冲了上去。\n<span style='color:#ffaa00;'>集中注意力，记住那些闪烁的颜色！</span>",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "建平-后门辅路",
        elseScene: "结局-后门失守",
        timeout: 12000,            // 5色闪完约4秒，留约8秒输入
        timeoutScene: "结局-后门失守"
      }
    ]
  },

  "结局-后门失守": {
    image: "images/zombieKnockYouDown.png",
    text: "你在丧尸群里乱了阵脚——它们扑上来，把你撕成了碎片。\n—— 结局：后门失守 ——"
  },

  "建平-后门辅路": {
    image: "images/placeholder.png" /* TODO: images/jianping/backAuxRoad.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "后门辅路"; },
    text: function(vars) {
      if (vars._backGateOpened && vars.hh < 19 && !vars._teacherLeft && vars._visit['建平-远翔楼-3F-物理办公室'] > 0) {
        return "你沿着后门辅路走。\n一辆轿车亮着车灯停在不远处——是忻老师。他摇下车窗，朝你招了招手。\n\"上车，我带你一程。\"";
      }
      return "后门辅路。一条通往食堂的窄路，路旁的围墙根长满了杂草。这里远离校门，丧尸反倒不多。";
    },
    choices: function(vars) {
      var cs = [];
      if (vars._backGateOpened && vars.hh < 19 && !vars._teacherLeft && vars._visit['建平-远翔楼-3F-物理办公室'] > 0) {
        cs.push({ text: "跟忻老师上车（去复旦）", nextScene: "建平-前往复旦", effect: function(v) { v._teacherLeft = true; v.hasCar = false; v.hasEbike = false; v.hasRustyBike = false; v.hasScooter = false; return {}; } });
        cs.push({ text: "算了，我还有事", nextScene: "建平-食堂", effect: updateTime(2) });
      }
      cs.push({ text: "去后门", nextScene: "建平-后门", effect: updateTime(2) });
      cs.push({ text: "去食堂", nextScene: "建平-食堂", effect: updateTime(2) });
      cs.push({ text: "去远翔楼", nextScene: "建平-远翔楼-1F", effect: updateTime(2) });
      cs.push({ text: "去致真楼", nextScene: "建平-致真楼-1F", effect: updateTime(2) });
      return cs;
    }
  },

  "建平-前往复旦": {
    image: "images/placeholder.png" /* TODO: images/jianping/leavingCar.png */,
    onEnter: function(vars) { vars.currentArea = "复旦"; vars.currentPlace = "复旦"; vars.currentPos = "车上"; },
    text: "你钻进副驾驶座，忻老师发动了车。\n车轮碾过满地的碎玻璃，缓缓驶离了后门。后视镜里，建平中学的轮廓越来越远，越来越小。\n忻老师把着方向盘，目不转睛地盯着前方的路。",
    choices: [
      { text: "继续", nextScene: "复旦江湾", effect: updateTime(30) }
    ]
  },

  "复旦江湾": {
    image: "images/placeholder.png",
    text: "一段时间后，你们驶入了一处风景优美的校区。“复旦江湾————研学来过的地方。你还记得吧？这里有微电子学院、材料学院、环境科学学院……”（复旦江湾 · 王知筠实验室剧情尚未实装）"
  },

  // ==================== 户外 ====================

  "建平-金苹果广场": {
    image: "images/placeholder.png" /* TODO: images/jianping/goldenApplePlaza.png */,
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.currentPos = "金苹果广场";
      if (!vars._frontGateCleared) return { add: { chasedByZombies: 1 } };   // 前门清空后广场不再反复加追兵
      return {};
    },
    text: function(vars) { return "金苹果广场。丧尸从半开的校门和四周楼里不断涌来，广场上到处是歪斜游荡的身影，几乎没有一块干净的空地。"; },
    choices: [
      { text: "去前门", nextScene: "建平-前门", effect: updateTime(2) },
      { text: "去行政楼", nextScene: "建平-行政楼-1F", effect: updateTime(2) },
      { text: "去挹芬楼北门", nextScene: "建平-挹芬楼北门", effect: updateTime(2) },
      { text: "去致真楼", nextScene: "建平-致真楼-1F", effect: updateTime(2) },
      { text: "去金苹果大道", nextScene: "建平-金苹果大道", effect: updateTime(3) }
    ]
  },

  "建平-金苹果大道": {
    image: "images/placeholder.png" /* TODO: images/jianping/goldenAppleAvenue.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "金苹果大道"; },
    text: function(vars) { return "金苹果大道。" + describeZombieWave(vars); },
    choices: [
      { text: "去金苹果广场", nextScene: "建平-金苹果广场", effect: updateTime(3) },
      { text: "去远翔楼", nextScene: "建平-远翔楼-1F", effect: updateTime(2) },
      { text: "去食堂正门", nextScene: "建平-食堂", effect: updateTime(2) },
      { text: "去济美楼", nextScene: "建平-济美楼-1F", effect: updateTime(2) },
      { text: "躲进报刊亭", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-金苹果大道报刊亭" }
    ]
  },

  "建平-水池": {
    image: "images/placeholder.png" /* TODO: images/jianping/pond.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "水池"; return { add: { chasedByZombies: 1 } }; },
    text: function(vars) { return "水池。丧尸像被什么吸引似的沿着池边越聚越多，有些半个身子泡在水里——水的湿气让它们扎堆在这里。"; },
    choices: [
      { text: "去废弃小楼", nextScene: "建平-废弃小楼-1F", effect: updateTime(2) },
      { text: "去挹芬楼南门", nextScene: "建平-挹芬楼南门", effect: updateTime(2) },
      { text: "去弘渊楼前门", nextScene: "建平-弘渊楼-1F", effect: updateTime(2) },
      { text: "去济美楼", nextScene: "建平-济美楼-1F", effect: updateTime(2) }
    ]
  },

  "建平-操场": {
    image: "images/placeholder.png" /* TODO: images/jianping/playground.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "操场"; },
    text: function(vars) { return "操场。" + describeZombieWave(vars); },
    choices: [
      { text: "去食堂侧门", nextScene: "建平-食堂", effect: updateTime(2) },
      { text: "去弘渊楼后门", nextScene: "建平-弘渊楼-1F", effect: updateTime(2) },
      { text: "去宿舍", nextScene: "建平-宿舍-门口", effect: updateTime(2) },
      { text: "躲到灌木丛", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-操场灌木丛" }
    ]
  },

  "建平-思贤堂": {
    image: "images/placeholder.png" /* TODO: images/jianping/sixianHall.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "思贤堂"; },
    text: function(vars) { return "思贤堂（礼堂）。" + describeZombieWave(vars); },
    choices: [
      { text: "去挹芬楼南门", nextScene: "建平-挹芬楼南门", effect: updateTime(2) },
      { text: "去废弃小楼", nextScene: "建平-废弃小楼-1F", effect: updateTime(2) }
    ]
  },

  // ==================== 行政楼（3 层 · 2 楼梯） ====================

  "建平-行政楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼1F"; return { add: { chasedByZombies: 1 } }; },
    text: function(vars) { return "行政楼 1 楼。大厅里的丧尸比外面更密，大概是顺着校门一口气涌进来的，挤在电梯和楼梯口。"; },
    choices: [
      { text: "去金苹果广场", nextScene: "建平-金苹果广场", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) },
      { text: "去教学处", nextScene: "建平-行政楼-1F-教学处", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼2F"; },
    text: function(vars) { return "行政楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) },
      { text: "去文印室", nextScene: "建平-行政楼-2F-文印室", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼3F"; },
    text: function(vars) { return "行政楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) },
      { text: "上天台花园", nextScene: "建平-行政楼-天台", effect: updateTime(1) },
      { text: "去公开课教室", nextScene: "建平-行政楼-3F-公开课教室", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-天台": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "行政楼天台"; },
    text: function(vars) { return "行政楼天台花园。" + describeZombieWave(vars); },
    choices: [
      { text: "躲起来", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-天台" },
      { text: "回 3 楼", nextScene: "建平-行政楼-3F", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-东楼梯": jpStair("建平-行政楼", "行政楼东侧楼梯间", [1, 2, 3]),
  "建平-行政楼-西楼梯": jpStair("建平-行政楼", "行政楼西侧楼梯间", [1, 2, 3]),

  // ==================== 挹芬楼（6 层 · 1 电梯 + 2 楼梯 · 丧尸密度最高） ====================

  "建平-挹芬楼北门": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "挹芬楼北门"; return {}; },
    text: function(vars) { return "挹芬楼北门。门外就是金苹果广场，广场上几具丧尸正漫无目的地游荡。门内是挹芬楼的大厅——往里走，那股腐臭更浓了，挹芬楼里的丧尸明显比广场上密。"; },
    choices: [
      { text: "去金苹果广场", nextScene: "建平-金苹果广场", effect: updateTime(2) },
      { text: "进入挹芬楼", nextScene: "建平-挹芬楼-1F-西侧走廊", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼南门": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "挹芬楼南门"; return {}; },
    text: function(vars) { return "挹芬楼南门。门外不远处是水池，丧尸沿着岸边密密麻麻地挤着——挹芬楼是全校丧尸最密集的地方，光站在门口就能感到那股压迫感。"; },
    choices: [
      { text: "去水池", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "去思贤堂", nextScene: "建平-思贤堂", effect: updateTime(2) },
      { text: "进入挹芬楼", nextScene: "建平-挹芬楼-1F-东侧走廊", effect: updateTime(1) }
    ]
  },

  "建平-挹芬楼-1F-西侧走廊": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars.currentPos = "挹芬楼1F西侧走廊";
      if (!vars._yifenWestCleared) {
        var seq = randSeq(["红","蓝","绿"], 5);
        vars._currentSeq = seq;
        vars._currentAnswer = seqToAnswer(seq);
        vars._seqPlayed = false;
        return { add: { chasedByZombies: 1 } };
      }
      return {};
    },
    text: function(vars) {
      if (vars._yifenWestCleared) {
        return "挹芬楼 1 楼西侧走廊。丧尸已经被你清掉了，电梯间和教室门口都安静了下来。" + describeZombieWave(vars);
      }
      return "你踏进挹芬楼 1 楼西侧走廊——电梯间附近几只丧尸朝你扑来。\n<span style='color:#ffaa00;'>集中注意力，记住那些闪烁的颜色！</span>";
    },
    choices: function(vars) {
      if (!vars._yifenWestCleared) {
        return [
          {
            text: "输入你看到的颜色分布",
            input: { placeholder: "例如：3红2蓝" },
            condition: checkFlashAnswer,
            effect: { set: { _yifenWestCleared: true } },
            nextScene: "建平-挹芬楼-1F-西侧走廊",
            elseScene: "结局-挹芬楼失守",
            timeout: 12000,
            timeoutScene: "结局-挹芬楼失守"
          }
        ];
      }
      return [
        { text: "去北门", nextScene: "建平-挹芬楼北门", effect: updateTime(1) },
        { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
        { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) },
        { text: "去公开课教室", nextScene: "建平-挹芬楼-1F-公开课教室", effect: updateTime(1) },
        { text: "去东侧走廊", nextScene: "建平-挹芬楼-1F-东侧走廊", effect: updateTime(1) }
      ];
    }
  },

  "建平-挹芬楼-1F-东侧走廊": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars.currentPos = "挹芬楼1F东侧走廊";
      if (!vars._yifenEastCleared) {
        var seq = randSeq(["红","蓝","绿"], 5);
        vars._currentSeq = seq;
        vars._currentAnswer = seqToAnswer(seq);
        vars._seqPlayed = false;
        return { add: { chasedByZombies: 1 } };
      }
      return {};
    },
    text: function(vars) {
      if (vars._yifenEastCleared) {
        return "挹芬楼 1 楼东侧走廊。丧尸已经被你清掉了，楼梯口和休息区门口都安静了下来。" + describeZombieWave(vars);
      }
      return "你走进挹芬楼 1 楼东侧走廊——楼梯口和休息区方向都有丧尸涌来。\n<span style='color:#ffaa00;'>集中注意力，记住那些闪烁的颜色！</span>";
    },
    choices: function(vars) {
      if (!vars._yifenEastCleared) {
        return [
          {
            text: "输入你看到的颜色分布",
            input: { placeholder: "例如：3红2蓝" },
            condition: checkFlashAnswer,
            effect: { set: { _yifenEastCleared: true } },
            nextScene: "建平-挹芬楼-1F-东侧走廊",
            elseScene: "结局-挹芬楼失守",
            timeout: 12000,
            timeoutScene: "结局-挹芬楼失守"
          }
        ];
      }
      return [
        { text: "去南门", nextScene: "建平-挹芬楼南门", effect: updateTime(1) },
        { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
        { text: "去休息区", nextScene: "建平-挹芬楼-1F-休息区", effect: updateTime(30) },
        { text: "去西侧走廊", nextScene: "建平-挹芬楼-1F-西侧走廊", effect: updateTime(1) }
      ];
    }
  },

  "建平-挹芬楼-1F-休息区": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼1F休息区"; vars._travelMinutes = 0; return { add: { strength: 1 } }; },
    text: "你在休息区的长椅上坐下，喘了口气。这里很安静——丧尸都被挡在了外面。\n<span style='color:#00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>",
    choices: [
      { text: "去饮料机", nextScene: "建平-挹芬楼-1F-饮料机", effect: updateTime(1) },
      { text: "回东侧走廊", nextScene: "建平-挹芬楼-1F-东侧走廊", effect: updateTime(1) }
    ]
  },

  "结局-挹芬楼失守": {
    image: "images/zombieKnockYouDown.png",
    text: "你记错了颜色的顺序——挹芬楼的丧尸潮水般涌来，把你吞没了。\n—— 结局：挹芬楼失守 ——"
  },
  "建平-挹芬楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼2F"; },
    text: function(vars) { return "挹芬楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) },
      { text: "去高一教室", nextScene: "建平-挹芬楼-2F-高一教室", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼3F"; },
    text: function(vars) { return "挹芬楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) },
      { text: "去高一教室", nextScene: "建平-挹芬楼-3F-高一教室", effect: updateTime(1) },
      { text: "去机房", nextScene: "建平-挹芬楼-3F-机房", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼4F"; },
    text: function(vars) { return "挹芬楼 4 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) },
      { text: "去高二教室", nextScene: "建平-挹芬楼-4F-高二教室", effect: updateTime(1) },
      { text: "去机房", nextScene: "建平-挹芬楼-4F-机房", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼-5F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼5F"; },
    text: function(vars) { return "挹芬楼 5 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) },
      { text: "去高二教室", nextScene: "建平-挹芬楼-5F-高二教室", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼-6F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼6F"; },
    text: function(vars) { return "挹芬楼 6 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) },
      { text: "去自习教室", nextScene: "建平-挹芬楼-6F-自习教室", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼-东楼梯": jpStair("建平-挹芬楼", "挹芬楼东侧楼梯间", [1, 2, 3, 4, 5, 6]),
  "建平-挹芬楼-西楼梯": jpStair("建平-挹芬楼", "挹芬楼西侧楼梯间", [1, 2, 3, 4, 5, 6]),
  "建平-挹芬楼-电梯": jpElevator("建平-挹芬楼", "挹芬楼电梯间", [1, 2, 3, 4, 5, 6]),

  // ==================== 致真楼（5 层 · 1 电梯 + 2 楼梯 · 老吴杂物室） ====================

  "建平-致真楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼1F"; },
    text: function(vars) { return "致真楼 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去金苹果广场", nextScene: "建平-金苹果广场", effect: updateTime(2) },
      { text: "去后门辅路", nextScene: "建平-后门辅路", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-致真楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-致真楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) },
      { text: "去老吴杂物室", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }
    ]
  },
  "建平-致真楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼2F"; },
    text: function(vars) { return "致真楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-致真楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-致真楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) },
      { text: "去化学实验室", nextScene: "建平-致真楼-2F-化学实验室", effect: updateTime(1) }
    ]
  },
  "建平-致真楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼3F"; },
    text: function(vars) { return "致真楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-致真楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-致真楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) },
      { text: "经廊桥去远翔楼", nextScene: "建平-远翔楼-3F", effect: updateTime(2) },
      { text: "去科创实验室", nextScene: "建平-致真楼-3F-科创实验室", effect: updateTime(1) }
    ]
  },
  "建平-致真楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼4F"; },
    text: function(vars) { return "致真楼 4 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-致真楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-致真楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) },
      { text: "经廊桥去远翔楼", nextScene: "建平-远翔楼-4F", effect: updateTime(2) },
      { text: "去生物实验室", nextScene: "建平-致真楼-4F-生物实验室", effect: updateTime(1) }
    ]
  },
  "建平-致真楼-5F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼5F"; },
    text: function(vars) { return "致真楼 5 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-致真楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-致真楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) },
      { text: "经廊桥去远翔楼", nextScene: "建平-远翔楼-5F", effect: updateTime(2) },
      { text: "去物理实验室", nextScene: "建平-致真楼-5F-物理实验室", effect: updateTime(1) }
    ]
  },
  "建平-致真楼-东楼梯": jpBlockedStair("建平-致真楼-东楼梯", "建平-致真楼", "致真楼东侧楼梯间", [1, 2, 3, 4, 5], "_zhizhenEastStairCleared"),
  "建平-致真楼-西楼梯": jpStair("建平-致真楼", "致真楼西侧楼梯间", [1, 2, 3, 4, 5], 1),
  "建平-致真楼-电梯": jpElevator("建平-致真楼", "致真楼电梯间", [1, 2, 3, 4, 5]),

  "建平-致真楼-1F-老吴杂物室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼1F老吴杂物室"; },
    text: function(vars) {
      var desc = "老吴的杂物室，也是他的总务处工具间。货架上堆满了学校物资——成箱的打印纸、劳技课材料、灯泡电线。";
      if (vars.dd >= 3 && !vars._laowuKilled) {
        desc += "\n角落里，老吴趴在地上，一动不动，像是睡着了。";
      } else if (vars.dd < 3) {
        desc += "\n角落里，老吴趴在地上，一动不动。空气里有股淡淡的血腥味。";
      } else {
        desc += "\n角落里，老吴的尸体还趴在那里——已经被你处理过了。";
      }
      return desc;
    },
    choices: [
      { text: "翻找货架", nextScene: "建平-致真楼-1F-老吴杂物室-翻货架", effect: updateTime(2) },
      { text: "查看老吴", nextScene: "建平-致真楼-1F-老吴杂物室-查看老吴", effect: updateTime(1) },
      { text: "回 1 楼走廊", nextScene: "建平-致真楼-1F", effect: updateTime(1) }
    ]
  },

  "建平-致真楼-1F-老吴杂物室-翻货架": {
    image: "images/placeholder.png",
    text: function(vars) {
      if (vars.hasMultimeter) return "你在货架间又翻了一遍，除了打印纸和劳技课材料，没什么有用的了。";
      return "你在货架间翻找。打印纸、劳技课材料、灯泡、电线……最后，你在一个工具柜的底层翻出一个工具箱。";
    },
    choices: function(vars) {
      if (vars.hasMultimeter) {
        return [{ text: "回杂物室", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }];
      }
      return [
        { text: "打开工具箱", nextScene: "建平-致真楼-1F-老吴杂物室-万用表", effect: updateTime(2) },
        { text: "回杂物室", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }
      ];
    }
  },

  "建平-致真楼-1F-老吴杂物室-万用表": {
    image: "images/placeholder.png",
    onEnter: { set: { hasMultimeter: true }, add: { itemCount: 1 } },
    text: "你打开工具箱——里面躺着一只万用表，还有几把螺丝刀、一卷电工胶带。\n万用表的表盘上贴着一小条胶布，用圆珠笔写着\"吴\"字。这是老吴的家伙什。",
    choices: [
      { text: "收好万用表", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }
    ]
  },

  "建平-致真楼-1F-老吴杂物室-查看老吴": {
    image: "images/placeholder.png",
    text: function(vars) {
      if (vars.dd >= 3 && !vars._laowuKilled) {
        return "你走近老吴，蹲下身想看看情况。\n就在你伸手的一瞬间——那具\"尸体\"突然抽搐了一下，猛地抬起头，露出一张灰白扭曲的脸！\n它诈尸了！";
      }
      if (vars._laowuKilled) {
        return "老吴的尸体趴在那里，已经被你处理过了。";
      }
      return "老吴趴在地上，早已没了气息。他的手里还攥着一串钥匙，身旁的地上散落着一张折皱的图纸。";
    },
    choices: function(vars) {
      if (vars.dd >= 3 && !vars._laowuKilled) {
        return [
          { text: "战斗！", nextScene: "建平-致真楼-1F-老吴杂物室-战斗" },
          { text: "逃离", nextScene: "建平-致真楼-1F", effect: function(v) { v.chasedByZombies = Math.min(5, v.chasedByZombies + 1); return updateTime(1)(v); } },
          { text: "趁机抢走管线图", nextScene: "建平-致真楼-1F-老吴杂物室-抢管线图" }
        ];
      }
      if (!vars.hasKeyRing || !vars.hasPipelineMap) {
        return [
          { text: "搜尸体", nextScene: "建平-致真楼-1F-老吴杂物室-搜尸体", effect: updateTime(2) },
          { text: "回杂物室", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }
        ];
      }
      return [
        { text: "回杂物室", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }
      ];
    }
  },

  "建平-致真楼-1F-老吴杂物室-搜尸体": {
    image: "images/placeholder.png",
    onEnter: { set: { hasKeyRing: true, hasPipelineMap: true }, add: { itemCount: 1 } },
    text: "你小心翼翼地把老吴翻过来。他手里那串钥匙被你取了下来——上面挂着好几把钥匙。\n你又捡起地上那张图纸：是一张供水管线图，旁边用红笔潦草地写着几个字——\"水有毒，别喝\"。",
    choices: [
      { text: "收好，回杂物室", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }
    ]
  },

  "建平-致真楼-1F-老吴杂物室-战斗": {
    image: "images/placeholder.png",
    onEnter: initMemoryGame(["红","蓝","绿"], 5, { set: { currentPos: "致真楼1F老吴杂物室" } }),
    text: "老吴的丧尸扑了过来！\n<span style='color:#ffaa00;'>集中注意力，记住那些闪烁的颜色！</span>",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "建平-致真楼-1F-老吴杂物室-击杀",
        elseScene: "结局-被老吴咬死",
        timeout: 12000,
        timeoutScene: "结局-被老吴咬死"
      }
    ]
  },

  "建平-致真楼-1F-老吴杂物室-击杀": {
    image: "images/placeholder.png",
    onEnter: { set: { _laowuKilled: true, hasKeyRing: true, hasPipelineMap: true }, add: { itemCount: 1 } },
    text: "你终于把老吴的丧尸制服了。它不再动弹。\n你从他身上取下钥匙串，又捡起地上那张管线图——\"水有毒，别喝\"。",
    choices: [
      { text: "回杂物室", nextScene: "建平-致真楼-1F-老吴杂物室", effect: updateTime(1) }
    ]
  },

  "建平-致真楼-1F-老吴杂物室-抢管线图": {
    image: "images/placeholder.png",
    onEnter: { set: { hasPipelineMap: true, hurtByZombie: true }, add: { itemCount: 1, mercuryLoad: 10 } },
    text: "你伸手去抢那张管线图。\n丧尸猛地挥爪，在你的手臂上抓出一道血淋淋的口子。你忍着剧痛抢到了图纸，踉跄着退开。",
    choices: [
      { text: "逃出杂物室", nextScene: "建平-致真楼-1F", effect: function(v) { v.chasedByZombies = Math.min(5, v.chasedByZombies + 1); return updateTime(1)(v); } }
    ]
  },

  "结局-被老吴咬死": {
    image: "images/zombieKnockYouDown.png",
    text: "你没能招架住老吴的丧尸——它把你扑倒在地，一口咬在喉咙上。\n—— 结局：被老吴咬死 ——"
  },

  "建平-致真楼-2F-化学实验室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼2F化学实验室"; },
    text: "致真楼 2 楼 · 化学实验室。",
    choices: [
      { text: "回 2 楼走廊", nextScene: "建平-致真楼-2F", effect: updateTime(1) }
    ]
  },

  // ==================== 远翔楼（5 层 · 无电梯 · 2 楼梯 · 高三教学楼） ====================

  "建平-远翔楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼1F"; },
    text: function(vars) { return "远翔楼 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去金苹果大道", nextScene: "建平-金苹果大道", effect: updateTime(2) },
      { text: "去后门辅路", nextScene: "建平-后门辅路", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) },
      { text: "去医务室", nextScene: "建平-远翔楼-1F-医务室", effect: updateTime(1) },
      { text: "去圆厅", nextScene: "建平-远翔楼-1F-圆厅", effect: updateTime(1) }
    ]
  },
  "建平-远翔楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼2F"; },
    text: function(vars) { return "远翔楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) },
      { text: "去高三教室", nextScene: "建平-远翔楼-2F-高三教室", effect: updateTime(1) }
    ]
  },
  "建平-远翔楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼3F"; },
    text: function(vars) { return "远翔楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) },
      { text: "去物理办公室", nextScene: "建平-远翔楼-3F-物理办公室", effect: updateTime(1) },
      { text: "去高三教室", nextScene: "建平-远翔楼-3F-高三教室", effect: updateTime(1) },
      { text: "经廊桥去致真楼", nextScene: "建平-致真楼-3F", effect: updateTime(2) }
    ]
  },
  "建平-远翔楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼4F"; },
    text: function(vars) { return "远翔楼 4 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) },
      { text: "去高三14班", nextScene: "建平-远翔楼-4F-高三14班", effect: updateTime(1) },
      { text: "去高三13班", nextScene: "建平-远翔楼-4F-高三13班", effect: updateTime(1) },
      { text: "经廊桥去致真楼", nextScene: "建平-致真楼-4F", effect: updateTime(2) }
    ]
  },
  "建平-远翔楼-5F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼5F"; },
    text: function(vars) { return "远翔楼 5 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) },
      { text: "经廊桥去致真楼", nextScene: "建平-致真楼-5F", effect: updateTime(2) },
      { text: "去杂物教室", nextScene: "建平-远翔楼-5F-杂物教室", effect: updateTime(1) }
    ]
  },
  "建平-远翔楼-东楼梯": jpStair("建平-远翔楼", "远翔楼东侧楼梯间", [1, 2, 3, 4, 5], 1),
  "建平-远翔楼-西楼梯": jpBlockedStair("建平-远翔楼-西楼梯", "建平-远翔楼", "远翔楼西侧楼梯间", [1, 2, 3, 4, 5], "_yuanxiangWestStairCleared"),

  "建平-远翔楼-1F-医务室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼1F医务室"; },
    text: "远翔楼 1 楼 · 医务室。",
    choices: [
      { text: "回 1 楼走廊", nextScene: "建平-远翔楼-1F", effect: updateTime(1) }
    ]
  },

  "建平-远翔楼-3F-物理办公室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼3F物理办公室"; },
    text: function(vars) {
      var desc;
      if (!vars._visit["建平-远翔楼-3F-物理办公室"] || vars._visit["建平-远翔楼-3F-物理办公室"] <= 1) {
        desc = "你推开物理办公室的门。\n忻老师——你的物理老师——正坐在办公桌前，手边摊着一沓批了一半的试卷。看到你，他先是一愣，随即露出一个复杂的笑容。\n\"是你啊。没想到还能在这儿见到你。\"\n";
      } else {
        desc = "物理办公室。忻老师还在这里。\n";
      }
      if (!vars._backGateOpened) {
        desc += "忻老师压低声音：\"我的车就停在后门附近，被一群丧尸团团围住了。得先把后门那些东西引开、或者解决掉，我才能开车冲出去。你去后门看看。\"";
      } else if (vars.hh < 19) {
        desc += "忻老师点点头：\"后门清了，好样的。我这就收拾东西开车走。你要是想离开这鬼地方，天黑前来后门辅路找我——我带你一程，去复旦那边。我在江湾有个熟人，是搞实验室的，说不定能帮上忙。\"";
      } else {
        desc += "忻老师看了看窗外：\"天已经黑了。今晚走不了了，等天亮再说吧。\"";
      }
      return desc;
    },
    choices: [
      { text: "躲起来", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-物理办公室" },
      { text: "回 3 楼走廊", nextScene: "建平-远翔楼-3F", effect: updateTime(1) }
    ]
  },

  "建平-远翔楼-4F-高三14班": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼4F高三14班"; },
    text: function(vars) {
      var desc = "高三 14 班教室，你曾经的班级。课桌还摆成原来的样子，黑板上留着没擦掉的粉笔字。";
      if (jpIsMealTime(vars)) {
        desc += "\n彭奕宸正坐在自己的座位上，从书包柜里掏出一包方便面。";
      } else if (vars._pengGalCleared) {
        desc += "\n彭奕宸不在——电脑还亮着，课桌上摊着本翻开的漫画。他大概又溜去音乐教室或者图书馆了。这家伙，在教室里永远待不住。";
      } else if (vars._pengComputerFixed) {
        desc += "\n彭奕宸坐在靠窗的位子，盯着电脑屏幕，一脸跃跃欲试。";
      } else {
        desc += "\n彭奕宸坐在靠窗的位子，盯着那台时不时开不了机的电脑，一脸烦躁。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (jpIsMealTime(vars) && !vars._pengNoodleShared) {
        cs.push({ text: "跟彭奕宸分着吃点方便面", nextScene: "建平-远翔楼-4F-高三14班-方便面" });
      }
      if (!vars._pengComputerFixed) {
        if (vars.hasMultimeter) {
          cs.push({ text: "用万用表检查教室供电", nextScene: "建平-远翔楼-4F-高三14班-修电脑" });
        } else {
          cs.push({ text: "看看那台电脑", nextScene: "建平-远翔楼-4F-高三14班-电脑坏" });
        }
      } else if (!vars._pengGalCleared) {
        cs.push({ text: "帮彭奕宸打galgame", nextScene: "建平-远翔楼-4F-高三14班-galgame" });
      }
      if (vars.chasedByZombies > 0) {
        cs.push({ text: "躲起来", nextScene: "建平-躲藏-14班" });
      }
      cs.push({ text: "回 4 楼走廊", nextScene: "建平-远翔楼-4F", effect: updateTime(1) });
      return cs;
    }
  },

  "建平-远翔楼-4F-高三14班-电脑坏": {
    image: "images/placeholder.png",
    text: "彭奕宸指着那台电脑抱怨：\"这破电脑，动不动就开不了机。我按了半天开机键，屏幕就是黑。\"\n你蹲下来看了看主机，又看了看墙上的插座——插头松垮垮的，插座面板都有点烧焦的痕迹。\n你隐约觉得，问题可能不在电脑本身，而在供电。但要确认，得有个万用表测一测电压。",
    choices: [
      { text: "去哪里找呢？", nextScene: "建平-远翔楼-4F-高三14班", effect: updateTime(1) }
    ]
  },

  "建平-远翔楼-4F-高三14班-修电脑": {
    image: "images/placeholder.png",
    onEnter: { set: { _pengComputerFixed: true } },
    text: "你拿出万用表，测了测墙上的插座。\n果然——电压忽高忽低，明显不稳。你又顺着电线查到讲台下方，发现一个插座的接线松了。\n你拧开面板，重新接好线。\"啪\"的一声，电脑屏幕亮了起来。\n彭奕宸眼睛一亮：\"卧槽，你真行！我之前换电源、换硬盘都没用，原来问题出在插座上！\"",
    choices: [
      { text: "看看彭奕宸要干什么", nextScene: "建平-远翔楼-4F-高三14班", effect: updateTime(2) }
    ]
  },

  "建平-远翔楼-4F-高三14班-galgame": {
    image: "images/placeholder.png",
    text: "电脑修好了，彭奕宸迫不及待地打开一个galgame。\n\"帮我打一关，我要拿那个隐藏结局。\"\n屏幕上的女主角歪着头，问男主角：\"周末……你想带我去哪儿呀？\"",
    choices: [
      { text: "游乐园", nextScene: "建平-远翔楼-4F-高三14班-galgame-2" },
      { text: "图书馆", nextScene: "建平-远翔楼-4F-高三14班-galgame-2" },
      { text: "电影院", nextScene: "建平-远翔楼-4F-高三14班-galgame-2" }
    ]
  },

  "建平-远翔楼-4F-高三14班-galgame-2": {
    image: "images/placeholder.png",
    text: "女主角笑了，接着问：\"那……走累的时候，你想牵我的手吗？\"\n彭奕宸在旁边紧张地盯着屏幕。",
    choices: [
      { text: "牵", nextScene: "建平-远翔楼-4F-高三14班-galgame-完成" },
      { text: "不牵，保持距离", nextScene: "建平-远翔楼-4F-高三14班-galgame-完成" }
    ]
  },

  "建平-远翔楼-4F-高三14班-galgame-完成": {
    image: "images/placeholder.png",
    onEnter: { set: { _pengGalCleared: true } },
    text: "结局动画放完了。彭奕宸一拍大腿：\"爽！这隐藏结局我等了好久！\"\n他心情大好，扭头对你说：\"对了，你想不想看点好东西？B站上有个视频，叫《腐烂尸城》，我收藏了好久。\"",
    choices: [
      { text: "看看那个视频", nextScene: "建平-远翔楼-4F-高三14班-看B站" },
      { text: "下次吧", nextScene: "建平-远翔楼-4F-高三14班", effect: updateTime(1) }
    ]
  },

  "建平-远翔楼-4F-高三14班-看B站": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.mixedMemorySet.add("腐烂尸城"); return {}; },
    text: "彭奕宸点开视频。《腐烂尸城》——一个互动视频，讲一座城市被尸潮吞没，幸存者们在废墟中挣扎求生。\n画面里的丧尸、逃命的人群、绝望的呐喊……和你这些天的经历，是那么相似。\n你看着看着，仿佛自己也置身其中。\n<span style='color:#ffaa00;'>【记忆】你获得了一段混合记忆：腐烂尸城。</span>",
    choices: [
      { text: "关掉视频", nextScene: "建平-远翔楼-4F-高三14班", effect: updateTime(5) }
    ]
  },

  "建平-远翔楼-4F-高三14班-方便面": {
    image: "images/placeholder.png",
    onEnter: { set: { _pengNoodleShared: true }, add: { strength: 1 } },
    text: "彭奕宸把方便面掰成两半，递给你一半。\n就着没喝完的水，你们俩蹲在教室里，一人半包方便面。\n谈不上多好吃，但在这种时候，能和老同学分着吃口热乎的，比什么都强。\n<span style='color:#00fbffff; font-style: italic;'>【系统提示】你回复1点体力，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "建平-远翔楼-4F-高三14班", effect: updateTime(5) }
    ]
  },

  // ==================== 食堂（正门 / 侧门 / 后厨） ====================

  "建平-食堂": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars.currentPos = "食堂";
      // 死亡锁存：Day 3 且阀门未关时刘冠宇已煤气中毒死亡；一旦在食堂观察到（锁存），
      // 之后即使关掉煤气阀也永久保持死亡，不复活。
      if (vars.dd >= 3 && !vars._gasValveClosed) {
        vars._liuCorpse = true;
      }
      return {};
    },
    text: function(vars) {
      var desc = "食堂。";
      if (vars._liuCorpse) {
        desc += "\n靠墙的长椅上，刘冠宇蜷缩着，一动不动。";
      } else {
        desc += "\n刘冠宇坐在靠墙的长椅上，一条腿翘着，腿上缠着绷带。";
      }
      return desc + describeZombieWave(vars);
    },
    choices: [
      { text: "从正门出去", nextScene: "建平-金苹果大道", effect: updateTime(2) },
      { text: "去后门辅路", nextScene: "建平-后门辅路", effect: updateTime(2) },
      { text: "从侧门出去", nextScene: "建平-操场", effect: updateTime(2) },
      { text: "去宿舍", nextScene: "建平-宿舍-门口", effect: updateTime(2) },
      { text: "去后厨", nextScene: "建平-食堂-后厨", effect: updateTime(1) },
      { text: "看看刘冠宇", nextScene: "建平-食堂-刘冠宇", effect: updateTime(1) },
      { text: "躲起来", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-食堂" }
    ]
  },

  "建平-食堂-刘冠宇": {
    image: "images/placeholder.png",
    text: function(vars) {
      if (vars._liuCorpse) {
        return "你走到刘冠宇身边。\n他蜷缩在长椅上，脸色铁青，已经没了呼吸。\n煤气中毒。你来得太晚了。";
      }
      if (vars._gasValveClosed) {
        return "刘冠宇冲你点点头：\"煤气阀关上了？谢了。我说怎么后厨那股味儿一直不散，估计是哪个丧尸搞得鬼吧。我这腿伤还没好利索，就不跟你走了，先在这儿待着。\"";
      }
      if (vars.dd >= 2) {
        return "你走到刘冠宇旁边。突然，你意识到空气的味道似乎有点不对……一股臭鸡蛋味。你感觉呼吸变得急促起来。\n\
刘冠宇皱着眉，压低声音：\"你也闻到了吧————这是煤气泄漏的味道。我要不行了，快走，别把自己搭上。\"";
      }
      return "刘冠宇苦着脸：\"我暑假回学校看看，结果撞上这档子事，腿还被门夹了。还好食堂有吃的，不然早饿死了。\"";
    },
    choices: [
      { text: "继续食堂", nextScene: "建平-食堂", effect: updateTime(1) }
    ]
  },

  "建平-食堂-后厨": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars.currentPos = "食堂后厨";
      if (vars.dd >= 2 && !vars._gasValveClosed) {
        vars.gasIndex = Math.min(100, vars.gasIndex + 20);
      }
      return {};
    },
    text: function(vars) {
      if (vars.dd < 2) {
        if (vars._visit['建平-弘渊楼-4F-电脑区-蔡镜晓'] > 0) {
          return "后厨。灶台、冰柜、货架。蔡镜晓说的没错，这里确实还藏着不少吃的。";
        }
        return "后厨。灶台、冰柜、货架，堆着些没来得及处理的食材。";
      }
      if (vars._gasValveClosed) {
        return "后厨。煤气阀已经关上了，空气清爽了不少。";
      }
      return "后厨。一股浓重的煤气味扑面而来，呛得你直咳嗽。地上横七竖八地躺着几具尸体。\n<span style='color:#ffaa00;'>【警告】煤气正在泄漏，你感到一阵眩晕。</span>";
    },
    choices: function(vars) {
      var cs = [];
      if (vars.dd >= 2 && !vars._gasValveClosed) {
        cs.push({ text: "去关煤气阀", nextScene: "建平-食堂-煤气阀", effect: updateTime(1) });
      }
      if ((vars.dd < 2 || vars._gasValveClosed) && !vars.hasCanteenFood) {
        cs.push({ text: "找食物", nextScene: "建平-食堂-后厨-找食物" });
      }
      cs.push({ text: "回食堂", nextScene: "建平-食堂", effect: updateTime(1) });
      return cs;
    }
  },

  "建平-食堂-后厨-找食物": {
    image: "images/placeholder.png",
    onEnter: { set: { hasCanteenFood: true }, add: { itemCount: 1 } },
    text: "你在货架和冰柜里翻找，找到几罐没开封的罐头和一些干粮。\n这些够你撑一阵子了。",
    choices: [
      { text: "收好食物", nextScene: "建平-食堂-后厨", effect: updateTime(2) }
    ]
  },

  "建平-食堂-煤气阀": {
    image: "images/placeholder.png",
    text: "你摸到后厨的小隔间，找到了煤气阀。\n但几只穿着厨师服的丧尸堵在阀门前面——正是它们搞坏了煤气。",
    choices: [
      { text: "战斗！", nextScene: "建平-食堂-煤气阀-战斗" },
      { text: "退回后厨", nextScene: "建平-食堂-后厨", effect: updateTime(1) }
    ]
  },

  "建平-食堂-煤气阀-战斗": {
    image: "images/placeholder.png",
    onEnter: initMemoryGame(["红","蓝","绿"], 5, { set: { currentPos: "食堂后厨" } }),
    text: "厨师丧尸扑了过来！\n<span style='color:#ffaa00;'>集中注意力，记住那些闪烁的颜色！</span>",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "建平-食堂-煤气阀-关阀",
        elseScene: "结局-煤气中毒",
        timeout: 12000,
        timeoutScene: "结局-煤气中毒"
      }
    ]
  },

  "建平-食堂-煤气阀-关阀": {
    image: "images/placeholder.png",
    onEnter: { set: { _gasValveClosed: true, _chefCleared: true } },
    text: "你解决了厨师丧尸，冲到煤气阀前，用力拧紧了阀门。\n\"嘶——\"漏气声渐渐停息。空气里那股煤气味淡了下去。",
    choices: [
      { text: "回后厨", nextScene: "建平-食堂-后厨", effect: updateTime(1) }
    ]
  },

  "结局-煤气中毒": {
    image: "images/placeholder.png",
    text: "你吸入的煤气越来越多，眼前发黑，双腿发软……\n你栽倒在后厨的地上，再也没有起来。\n—— 结局：煤气中毒 ——"
  },

  // ==================== 宿舍楼（单节点 · 简化） ====================

  "建平-宿舍-门口": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "宿舍门口"; return { add: { chasedByZombies: 1 } }; },
    text: function(vars) { return "学生宿舍楼。楼门半掩着，往里看黑洞洞的，隐约能听到走廊里拖沓的脚步声——这栋楼里的丧尸比外面多得多。\n如果能把它们清干净，这里倒是个能安心过夜的落脚点。"; },
    choices: [
      { text: "进入宿舍", nextScene: "建平-宿舍-内部", effect: updateTime(1) },
      { text: "去操场", nextScene: "建平-操场", effect: updateTime(2) },
      { text: "去食堂", nextScene: "建平-食堂", effect: updateTime(2) }
    ]
  },
  "建平-宿舍-内部": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars.currentPos = "宿舍内部";
      if (!vars._dormCleared) {
        var seq = randSeq(["红","蓝","绿"], 5);
        vars._currentSeq = seq;
        vars._currentAnswer = seqToAnswer(seq);
        vars._seqPlayed = false;
        return { add: { chasedByZombies: 1 } };
      }
      return {};
    },
    text: function(vars) {
      if (vars._dormCleared) {
        return "宿舍内部。丧尸已经被你清理干净了，走廊安静了下来。这里可以安心休息，甚至过夜。" + describeZombieWave(vars);
      }
      return "你推开宿舍的门——走廊里挤着不少丧尸，在昏暗的光线里漫无目的地游荡。得先把它们清掉。\n<span style='color:#ffaa00;'>集中注意力，记住那些闪烁的颜色！</span>";
    },
    choices: function(vars) {
      if (!vars._dormCleared) {
        return [
          {
            text: "输入你看到的颜色分布",
            input: { placeholder: "例如：3红2蓝" },
            condition: checkFlashAnswer,
            effect: { set: { _dormCleared: true } },
            nextScene: "建平-宿舍-内部",
            elseScene: "结局-宿舍失守",
            timeout: 12000,
            timeoutScene: "结局-宿舍失守"
          }
        ];
      }
      return [
        { text: "回宿舍门口", nextScene: "建平-宿舍-门口", effect: updateTime(1) }
      ];
    }
  },
  "结局-宿舍失守": {
    image: "images/zombieKnockYouDown.png",
    text: "你记错了颜色的顺序——宿舍里的丧尸扑了上来，把你堵在了墙角。\n—— 结局：宿舍失守 ——"
  },

  // ==================== 弘渊楼 / 图书馆（4 层 · 1 楼梯 · 3 入口） ====================

  "建平-弘渊楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼1F"; return { add: { chasedByZombies: 1 } }; },
    text: function(vars) { return "弘渊楼（图书馆）1 楼。临水的一层潮气重，丧尸贴着墙根和书架缝隙聚集，比楼上密得多。"; },
    choices: [
      { text: "从前门出去", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "从后门出去", nextScene: "建平-操场", effect: updateTime(2) },
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼2F"; },
    text: function(vars) { return "弘渊楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) },
      { text: "去藏书区", nextScene: "建平-弘渊楼-2F-藏书区", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼3F"; },
    text: function(vars) { return "弘渊楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) },
      { text: "经廊桥去废弃小楼", nextScene: "建平-废弃小楼-3F", effect: updateTime(2) },
      { text: "去阅览区", nextScene: "建平-弘渊楼-3F-阅览区", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼4F"; },
    text: function(vars) { return "弘渊楼 4 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) },
      { text: "去电脑区", nextScene: "建平-弘渊楼-4F-电脑区", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-楼梯": jpStair("建平-弘渊楼", "弘渊楼楼梯间", [1, 2, 3, 4]),

  "建平-弘渊楼-4F-电脑区": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼4F电脑区"; },
    text: function(vars) {
      var desc = "图书馆 4 楼的电脑区。一排排电脑黑着屏幕，只有角落里一台亮着。";
      if (jpIsMealTime(vars)) {
        if (vars._visit['建平-弘渊楼-4F-电脑区-蔡镜晓'] > 0) {
          desc += "\n蔡镜晓不在——这个点他应该去食堂后厨找吃的了。";
        } else {
          desc += "\n电脑区空无一人，角落里那台电脑还亮着。";
        }
      } else {
        desc += "\n蔡镜晓坐在那台亮着的电脑前，戴着耳机打明日方舟，屏幕上闪烁着作战画面。";
        if (vars._pengGalCleared) {
          desc += "\n彭奕宸也占了旁边一台电脑，玩得正起劲——这俩家伙，一个图书馆一个教室，满学校乱窜。";
        }
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (!jpIsMealTime(vars)) {
        cs.push({ text: "跟蔡镜晓搭话", nextScene: "建平-弘渊楼-4F-电脑区-蔡镜晓" });
      }
      // 躲藏文案"蔡镜晓也猫着腰"依赖他在场——饭点他去后厨了，此时不提供躲藏
      if (!jpIsMealTime(vars) && vars.chasedByZombies > 0) {
        cs.push({ text: "躲起来", nextScene: "建平-躲藏-电脑区" });
      }
      cs.push({ text: "回 4 楼走廊", nextScene: "建平-弘渊楼-4F", effect: updateTime(1) });
      return cs;
    }
  },

  "建平-弘渊楼-4F-电脑区-蔡镜晓": {
    image: "images/placeholder.png",
    text: function(vars) {
      var desc = "你拍了拍蔡镜晓的肩膀，他摘下耳机：\"哟，你还活着啊。\"\n";
      if (vars.dd < 2) {
        desc += "\n\"食堂后厨还有不少吃的，就是刘冠宇那家伙腿受伤了，一直赖在食堂。你饭点来找我，我带你去后厨翻吃的。\"";
      } else {
        desc += "\n\"食堂后厨的煤气漏了，现在那边呛得要死，我都不敢去了。得先把煤气阀关了才行——那玩意儿在后厨的小隔间里，好像还有几只厨师的丧尸堵在那儿。\"";
      }
      return desc;
    },
    choices: [
      { text: "回电脑区", nextScene: "建平-弘渊楼-4F-电脑区", effect: updateTime(1) }
    ]
  },

  // ==================== 济美楼（4 层 · 2 楼梯 · 音乐/美术） ====================

  "建平-济美楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼1F"; return { add: { chasedByZombies: 1 } }; },
    text: function(vars) { return "济美楼 1 楼。门口和走廊里都有丧尸游荡——靠近水池的方向，动静尤其多。"; },
    choices: [
      { text: "从侧门出去", nextScene: "建平-金苹果大道", effect: updateTime(2) },
      { text: "从正门出去", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) },
      { text: "去心理教室", nextScene: "建平-济美楼-1F-心理教室", effect: updateTime(1) },
      { text: "去饮料机", nextScene: "建平-济美楼-1F-饮料机", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼2F"; },
    text: function(vars) { return "济美楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) },
      { text: "去美术教室", nextScene: "建平-济美楼-2F-美术教室", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼3F"; },
    text: function(vars) { return "济美楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) },
      { text: "去JTV办公室", nextScene: "建平-济美楼-3F-JTV办公室", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼4F"; },
    text: function(vars) { return "济美楼 4 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) },
      { text: "去音乐教室", nextScene: "建平-济美楼-4F-音乐教室", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-东楼梯": jpStair("建平-济美楼", "济美楼东侧楼梯间", [1, 2, 3, 4]),
  "建平-济美楼-西楼梯": jpStair("建平-济美楼", "济美楼西侧楼梯间", [1, 2, 3, 4]),

  "建平-济美楼-1F-心理教室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼1F心理教室"; },
    text: "济美楼 1 楼 · 心理教室。",
    choices: [
      { text: "回 1 楼走廊", nextScene: "建平-济美楼-1F", effect: updateTime(1) }
    ]
  },

  "建平-济美楼-4F-音乐教室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼4F音乐教室"; },
    text: function(vars) {
      if (vars._pengGalCleared) {
        return "济美楼 4 楼 · 音乐教室。\n彭奕宸正靠着钢琴翻手机，看见你，咧嘴一笑：\"哟，来了。刚才那隐藏结局，谢了啊。\"\n他拍了拍身边的凳子示意你坐，又自顾自念叨着——这家伙果然满学校乱窜，教室、图书馆、这儿，没个准点。";
      }
      return "济美楼 4 楼 · 音乐教室。一架旧钢琴蒙着灰，谱架上的乐谱被风吹乱了几页。";
    },
    choices: [
      { text: "回 4 楼走廊", nextScene: "建平-济美楼-4F", effect: updateTime(1) }
    ]
  },

  // ==================== 废弃小楼（3 层 · 1 楼梯 · 廊桥通图书馆） ====================

  "建平-废弃小楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼1F"; return { add: { chasedByZombies: 1 } }; },
    text: function(vars) { return "废弃小楼 1 楼。这栋没人管的小楼里堆着杂物，丧尸在阴影里躲了不少，比外面看起来的还要多。"; },
    choices: [
      { text: "去水池", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "去思贤堂", nextScene: "建平-思贤堂", effect: updateTime(2) },
      { text: "去楼梯", nextScene: "建平-废弃小楼-楼梯", effect: updateTime(1) },
      { text: "翻看纸箱", nextScene: "建平-废弃小楼-1F-纸箱", effect: updateTime(1) }
    ]
  },
  "建平-废弃小楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼2F"; },
    text: function(vars) { return "废弃小楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-废弃小楼-楼梯", effect: updateTime(1) },
      { text: "去活动室", nextScene: "建平-废弃小楼-2F-活动室", effect: updateTime(1) }
    ]
  },
  "建平-废弃小楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼3F"; },
    text: function(vars) { return "废弃小楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-废弃小楼-楼梯", effect: updateTime(1) },
      { text: "经廊桥去弘渊楼", nextScene: "建平-弘渊楼-3F", effect: updateTime(2) },
      { text: "去团委工作室", nextScene: "建平-废弃小楼-3F-团委工作室", effect: updateTime(1) }
    ]
  },
  "建平-废弃小楼-楼梯": jpStair("建平-废弃小楼", "废弃小楼楼梯间", [1, 2, 3]),

  "建平-废弃小楼-3F-团委工作室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼3F团委工作室"; },
    text: function(vars) {
      var desc = "废弃小楼 3 楼 · 团委工作室。这里堆满了历年校园活动的道具和杂物。";
      if (!vars._innerLiningYouthRoom) {
        desc += "\n\n角落里的一堆校服下面，露出半截校服外套的内胆。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._innerLiningYouthRoom) {
        cs.push({ text: "拿走校服内胆", nextScene: "建平-废弃小楼-3F-团委工作室-内胆" });
      }
      cs.push({ text: "躲起来", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-团委工作室" });
      cs.push({ text: "回 3 楼走廊", nextScene: "建平-废弃小楼-3F", effect: updateTime(1) });
      return cs;
    }
  },

  "建平-废弃小楼-3F-团委工作室-内胆": {
    image: "images/placeholder.png",
    onEnter: { set: { _innerLiningYouthRoom: true }, add: { hasInnerLining: 1 } },
    text: "你抽出那件校服外套的内胆——软软的，还带着点霉味。\n这东西平时没什么用，但对付那个只会嚎叫的家伙……说不定能派上用场。",
    choices: [
      { text: "收好内胆", nextScene: "建平-废弃小楼-3F-团委工作室", effect: updateTime(1) }
    ]
  },

  // ==================== Harsh 被堵住（追上处理） ====================

  "建平-Harsh堵住": {
    image: "images/placeholder.png" /* TODO: images/jianping/harsh.png */,
    onEnter: function(vars) {
      vars._harshEncounters = (vars._harshEncounters || 0) + 1;
      vars._harshReturn = vars._harshTrack && vars._harshTrack.length > 0
        ? vars._harshTrack[vars._harshTrack.length - 1]
        : "建平-金苹果大道";
      return {};
    },
    text: function(vars) {
      var desc = "那个身影堵住了你的去路——是 Harsh，那个生前以严厉著称的年级组长。\n\
她歪着头站在那儿，喉咙里发出低哑的嘶声。她挥臂朝你抓来——但动作很慢，你轻易就躲开了。\n\
可就在这时，她仰起头，发出一声凄厉的嚎叫——那声音在空旷的校园里回荡，引来四面八方的丧尸！";
      if (vars._harshEncounters >= 2) {
        desc += "\n\n<span style='color:#ffaa00;'>这已经是她第二次追上你了。</span>";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (vars.hasInnerLining > 0) {
        cs.push({
          text: "丢出校服内胆！",
          nextScene: "建平-Harsh堵住-驱赶",
          effect: function(v) { v.hasInnerLining -= 1; return {}; }
        });
      }
      cs.push({
        text: "快逃！",
        nextScene: "建平-Harsh堵住-逃跑",
        effect: function(v) { v.chasedByZombies = Math.min(5, v.chasedByZombies + 1); return {}; }
      });
      return cs;
    }
  },

  "建平-Harsh堵住-驱赶": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars._harshCaught = false;
      if (vars._harshEncounters >= 2) {
        // 两次被追上：驱赶后强制休眠（需再次坐电梯才会重新追逐）
        vars._harshActive = false;
        vars._harshTrack = [];
        vars._harshIndex = 0;
      } else {
        // 播种轨迹：垫 6 份返回位置，让她重新落后数步，避免立刻再被追上
        var ret = vars._harshReturn || "建平-金苹果大道";
        vars._harshIndex = 0;
        vars._harshLastTick = Math.floor((vars.gameMinutes || 0) / 10);
        vars._harshTrack = [ret, ret, ret, ret, ret, ret];
      }
      return {};
    },
    text: function(vars) {
      if (vars._harshEncounters >= 2) {
        return "你把内胆丢向她。她一把抱住，低头嗅了嗅，随后缓缓转身，拖着那件校服内胆，一步一步地走远了——彻底消失在了走廊尽头。\n<span style='color:#00fbffff; font-style: italic;'>她走了，短期内不会再追来。</span>";
      }
      return "你把内胆丢向她。她一把抱住，低头嗅了嗅，像是认出了什么。\n她抱着那件校服内胆，缓缓转身走开了几步——但你能感觉到，她还会再追上来。";
    },
    choices: [
      { text: "趁现在离开", nextScene: function(vars) { return vars._harshReturn || "建平-金苹果大道"; }, effect: updateTime(2) }
    ]
  },

  "建平-Harsh堵住-逃跑": {
    image: "images/placeholder.png",
    onEnter: function(vars) {
      vars._harshCaught = false;
      if (vars._harshEncounters >= 2) {
        // 两次被追上且逃跑：Harsh 累了，强制休眠
        vars._harshActive = false;
        vars._harshTrack = [];
        vars._harshIndex = 0;
      } else {
        // 播种轨迹：垫 6 份返回位置，让她重新落后数步
        var ret = vars._harshReturn || "建平-金苹果大道";
        vars._harshIndex = 0;
        vars._harshLastTick = Math.floor((vars.gameMinutes || 0) / 10);
        vars._harshTrack = [ret, ret, ret, ret, ret, ret];
      }
      return {};
    },
    text: function(vars) {
      if (!vars._harshActive) {
        return "你拼命跑，身后传来她那凄厉的嚎叫和渐渐杂乱的丧尸群——好在你七拐八绕，总算甩开了它们。\n你回头望去，那个身影已经不见了。\n<span style='color:#00fbffff; font-style: italic;'>她好像不追了。也许下次坐电梯之前，你该好好想想。</span>";
      }
      return "你拼命跑，身后传来她的嚎叫和丧尸群杂乱的脚步声——你七拐八绕，好不容易才拉开一段距离。\n但你知道，她还在跟着你的轨迹。";
    },
    choices: [
      { text: "喘口气", nextScene: function(vars) { return vars._harshReturn || "建平-金苹果大道"; }, effect: updateTime(2) }
    ]
  },

  // ==================== 房间（环境叙事占位） ====================

  "建平-致真楼-3F-科创实验室": jpRoom("致真楼 3 楼 · 科创实验室", "建平-致真楼-3F"),
  "建平-致真楼-4F-生物实验室": jpRoom("致真楼 4 楼 · 生物实验室", "建平-致真楼-4F"),
  "建平-致真楼-5F-物理实验室": jpRoom("致真楼 5 楼 · 物理实验室", "建平-致真楼-5F"),
  "建平-远翔楼-1F-圆厅": jpRoom("远翔楼 1 楼 · 圆厅", "建平-远翔楼-1F"),
  "建平-远翔楼-2F-高三教室": jpRoom("远翔楼 2 楼 · 高三教室", "建平-远翔楼-2F"),
  "建平-远翔楼-3F-高三教室": jpRoom("远翔楼 3 楼 · 高三教室", "建平-远翔楼-3F"),
  "建平-远翔楼-4F-高三13班": jpRoom("远翔楼 4 楼 · 高三13班教室", "建平-远翔楼-4F"),
  "建平-远翔楼-5F-杂物教室": jpRoom("远翔楼 5 楼 · 空置教室", "建平-远翔楼-5F"),
  "建平-弘渊楼-2F-藏书区": jpRoom("弘渊楼 2 楼 · 藏书区", "建平-弘渊楼-2F"),
  "建平-弘渊楼-3F-阅览区": jpRoom("弘渊楼 3 楼 · 自习阅览区", "建平-弘渊楼-3F"),
  "建平-济美楼-1F-饮料机": jpRoom("济美楼 1 楼 · 饮料机", "建平-济美楼-1F"),
  "建平-济美楼-2F-美术教室": jpRoom("济美楼 2 楼 · 美术教室", "建平-济美楼-2F"),
  "建平-济美楼-3F-JTV办公室": jpRoom("济美楼 3 楼 · JTV办公室", "建平-济美楼-3F"),
  "建平-挹芬楼-1F-公开课教室": jpRoom("挹芬楼 1 楼 · 公开课教室", "建平-挹芬楼-1F-西侧走廊"),
  "建平-挹芬楼-1F-饮料机": jpRoom("挹芬楼 1 楼 · 饮料机", "建平-挹芬楼-1F-休息区"),
  "建平-挹芬楼-2F-高一教室": jpRoom("挹芬楼 2 楼 · 高一教室", "建平-挹芬楼-2F"),
  "建平-挹芬楼-3F-高一教室": jpRoom("挹芬楼 3 楼 · 高一教室", "建平-挹芬楼-3F"),
  "建平-挹芬楼-3F-机房": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼3F机房"; },
    text: "挹芬楼 3 楼 · 机房。",
    choices: [
      { text: "躲起来", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-挹芬楼机房3F" },
      { text: "回 3 楼走廊", nextScene: "建平-挹芬楼-3F", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼-4F-高二教室": jpRoom("挹芬楼 4 楼 · 高二教室", "建平-挹芬楼-4F"),
  "建平-挹芬楼-4F-机房": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼4F机房"; },
    text: "挹芬楼 4 楼 · 机房。",
    choices: [
      { text: "躲起来", showCondition: "chasedByZombies > 0", nextScene: "建平-躲藏-挹芬楼机房4F" },
      { text: "回 4 楼走廊", nextScene: "建平-挹芬楼-4F", effect: updateTime(1) }
    ]
  },
  "建平-挹芬楼-5F-高二教室": jpRoom("挹芬楼 5 楼 · 高二教室", "建平-挹芬楼-5F"),
  "建平-挹芬楼-6F-自习教室": jpRoom("挹芬楼 6 楼 · 自习教室", "建平-挹芬楼-6F"),
  "建平-行政楼-1F-教学处": jpRoom("行政楼 1 楼 · 教学处", "建平-行政楼-1F"),
  "建平-行政楼-2F-文印室": jpRoom("行政楼 2 楼 · 文印室", "建平-行政楼-2F"),
  "建平-行政楼-3F-公开课教室": jpRoom("行政楼 3 楼 · 公开课教室", "建平-行政楼-3F"),
  "建平-废弃小楼-1F-纸箱": jpRoom("废弃小楼 1 楼 · 纸箱", "建平-废弃小楼-1F"),
  "建平-废弃小楼-2F-活动室": jpRoom("废弃小楼 2 楼 · 活动室", "建平-废弃小楼-2F"),
  "建平-门卫室": jpRoom("门卫室", "建平-校园门口"),


  // ==================== 躲藏点（降 ch） ====================

  "建平-躲藏-14班": jpHide("images/placeholder.png", "你躲进14班教室，反锁上门，缩在课桌下。外面的动静渐渐远了，教室里安静得能听见自己的心跳。", "", 2),
  "建平-躲藏-物理办公室": jpHide("images/placeholder.png", "你闪进物理办公室，忻老师示意你蹲下。你们屏息等着，外面的脚步声来了又去。", "", 2),
  "建平-躲藏-电脑区": jpHide("images/placeholder.png", "你蹲在电脑桌下，蔡镜晓也猫着腰。外面的动静渐渐远了。", "", 2),
  "建平-躲藏-挹芬楼机房3F": jpHide("images/placeholder.png", "你躲进机房，缩在一排主机后面。外面的脚步声由远及近，又由近及远。", "", 2),
  "建平-躲藏-挹芬楼机房4F": jpHide("images/placeholder.png", "你躲进机房，缩在一排主机后面。外面的脚步声由远及近，又由近及远。", "", 2),
  "建平-躲藏-团委工作室": jpHide("images/placeholder.png", "你躲进团委工作室，反锁上门。这里堆满杂物，是个不错的藏身处。", "", 2),
  "建平-躲藏-食堂": jpHide("images/placeholder.png", "你躲在食堂的桌下。外面的丧尸徘徊了一阵，没发现你，渐渐散去了。", "食堂太开放了——丧尸还是发现了你，你只能冲出去。", 1),
  "建平-躲藏-天台": jpHide("images/placeholder.png", "你蹲在天台的花坛后面。这里地势高，丧尸上不来。", "", 1),
  "建平-躲藏-操场灌木丛": jpHide("images/placeholder.png", "你钻进操场边的灌木丛。丧尸在附近徘徊了一阵，没发现你。", "灌木丛太浅了——一只丧尸发现了你，你只能逃。", 1),
  "建平-躲藏-金苹果大道报刊亭": jpHide("images/placeholder.png", "你躲进报刊亭。丧尸从外面经过，没注意到你。", "报刊亭的门关不严——丧尸闯了进来，你只能逃。", 1),

});

// ==================== Harsh 追踪接入（运行时包装） ====================
// 对所有"建平-地点节点"统一包装：进入时记录轨迹（jpHarshTrack），text 追加距离提示（jpHarshHint）。
// 判定方式是【排除法】：以"建平-"开头（KEEP）且不命中排除规则，才算地点节点。
//
// ⚠️ 新增场景时的注意事项：
//   1. 新增【地点节点】（走廊/楼层/户外等空间）：无需处理，本包装器自动覆盖。
//   2. 新增【非地点的剧情子节点】（战斗/拾取/对话/解密等中间步骤场景）：
//      必须让它的场景ID命中下面的 NON_PLACE 正则，否则会被误记入轨迹，
//      导致 Harsh 的追踪距离失真。做法：场景 ID 以 "-关键词" 结尾
//      （如 "xxx-翻找"、"xxx-对话"），并把关键词同步补进 NON_PLACE。
//   3. 躲藏场景以"建平-躲藏-"开头、Harsh 相关以"建平-Harsh"开头：自动排除。
//   4. 本包装器只遍历到此处已注册的场景——以后若把建平场景拆到别的文件，
//      需保证该文件在 index.html 中先于 engine.js 加载、并先于本段执行。
(function() {
  var EXCLUDE = /^(建平-躲藏-|建平-Harsh|结局-|复旦)/;
  var KEEP = /^建平-/;
  // 非地点节点关键词（每次新增此类场景需同步补充）
  var NON_PLACE = /-(战斗|击杀|驱赶|逃跑|清场|开门|开打|失守|内胆|翻货架|查看老吴|搜尸体|万用表|抢管线图|电脑坏|修电脑|galgame|方便面|看B站|蔡镜晓|找食物|关阀|被堵住)$/;
  for (var sceneId in storyData) {
    if (!storyData.hasOwnProperty(sceneId)) continue;
    if (!KEEP.test(sceneId) || EXCLUDE.test(sceneId) || NON_PLACE.test(sceneId)) continue;

    // 每轮迭代用 IIFE 捕获当轮的 sceneId / scene，避免 var 共享变量导致的闭包串味
    (function(id) {
      var scene = storyData[id];

      // 包装 onEnter：先记轨迹，再执行原逻辑
      var origOnEnter = scene.onEnter;
      scene.onEnter = function(vars) {
        jpHarshTrack(vars, id);
        var result;
        if (typeof origOnEnter === "function") result = origOnEnter(vars);
        else if (origOnEnter && typeof origOnEnter === "object") result = origOnEnter;
        return result || {};
      };

      // 包装 text：末尾追加距离提示
      var origText = scene.text;
      if (typeof origText === "function") {
        scene.text = function(vars) { return (origText(vars) || "") + jpHarshHint(vars); };
      } else if (typeof origText === "string") {
        scene.text = function(vars) { return origText + jpHarshHint(vars); };
      }
    })(sceneId);
  }
})();
