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

// 楼梯间：只能上下 1 层（3 楼只能去 2/4 楼）。根据 _lastScene 判断当前楼层，动态生成选项。
function jpStair(prefix, label, floors) {
  var minFloor = floors[0];
  var maxFloor = floors[floors.length - 1];
  return {
    image: "images/placeholder.png" /* TODO: images/jianping/stairwell.png */,
    onEnter: function(vars) { vars.currentPos = label; },
    text: function(vars) { return label + "。" + describeZombieWave(vars); },
    choices: function(vars) {
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
  };
}

// 电梯间：可直达任意楼层（坐电梯，快；后续会唤醒 Harsh）。
function jpElevator(prefix, label, floors) {
  var choices = [];
  floors.forEach(function(f) {
    choices.push({ text: "坐电梯去" + f + "楼", nextScene: prefix + "-" + f + "F", effect: updateTime(1) });
  });
  return {
    image: "images/placeholder.png" /* TODO: images/jianping/elevator.png */,
    onEnter: function(vars) { vars.currentPos = label; },
    text: function(vars) { return label + "。" + describeZombieWave(vars); },
    choices: choices
  };
}

Object.assign(storyData, {

  // ==================== 校园门口（到达中转节点） ====================

  "建平-校园门口": {
    image: "images/placeholder.png" /* TODO: images/jianping/campusGate.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "建平中学"; vars.currentPlace = "建平"; vars.currentPos = "校园门口"; },
    text: function(vars) {
      return "你站在建平中学前门马路对面的一棵行道树后，没有急着靠近。\n\
三年了，校门还是老样子——“建平中学”四个字褪了色，铁门半敞着。透过门缝，你能看到里面那片熟悉到骨子里的金苹果广场，和广场上歪歪斜斜游荡着的身影。\n\
校门口内外都有丧尸，只是现在它们还没注意到你。你压低身子，盘算着怎么进去。" + describeZombieWave(vars);
    },
    choices: [
      { text: "去前门看看", nextScene: "建平-前门", effect: updateTime(5) },
      { text: "绕去后门", nextScene: "建平-后门", effect: updateTime(10) },
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
          { text: "走进前门（金苹果广场）", nextScene: "建平-金苹果广场", effect: updateTime(2) },
          { text: "退回校园门口", nextScene: "建平-校园门口", effect: updateTime(5) }
        ];
      }
      return [
        {
          text: "输入你看到的颜色分布",
          input: { placeholder: "例如：3红2蓝" },
          condition: checkFlashAnswer,
          nextScene: "建平-前门-清场",
          elseScene: "结局-前门失守"
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
      if (vars._backGateOpened) {
        cs.push({ text: "从后门进去（食堂方向）", nextScene: "建平-食堂", effect: updateTime(2) });
      } else {
        cs.push({ text: "打开后门", nextScene: "建平-后门-开门", effect: updateTime(1) });
      }
      cs.push({ text: "沿辅路去金苹果大道", nextScene: "建平-金苹果大道", effect: updateTime(3) });
      cs.push({ text: "退回校园门口", nextScene: "建平-校园门口", effect: updateTime(10) });
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
      { text: "快逃！退回校园门口", nextScene: "建平-校园门口", effect: updateTime(5) }
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
        nextScene: "建平-食堂",
        elseScene: "结局-后门失守"
      }
    ]
  },

  "结局-后门失守": {
    image: "images/zombieKnockYouDown.png",
    text: "你在丧尸群里乱了阵脚——它们扑上来，把你撕成了碎片。\n—— 结局：后门失守 ——"
  },

  // ==================== 户外 ====================

  "建平-金苹果广场": {
    image: "images/placeholder.png" /* TODO: images/jianping/goldenApplePlaza.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "金苹果广场"; return { add: { chasedByZombies: 1 } }; },
    text: function(vars) { return "金苹果广场。" + describeZombieWave(vars); },
    choices: [
      { text: "去前门", nextScene: "建平-前门", effect: updateTime(2) },
      { text: "去行政楼", nextScene: "建平-行政楼-1F", effect: updateTime(2) },
      { text: "去挹芬楼", nextScene: "建平-挹芬楼-1F", effect: updateTime(2) },
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
      { text: "去食堂", nextScene: "建平-食堂", effect: updateTime(2) },
      { text: "去济美楼", nextScene: "建平-济美楼-1F", effect: updateTime(2) },
      { text: "去操场", nextScene: "建平-操场", effect: updateTime(3) },
      { text: "去水池", nextScene: "建平-水池", effect: updateTime(3) },
      { text: "去后门（辅路）", nextScene: "建平-后门", effect: updateTime(3) }
    ]
  },

  "建平-水池": {
    image: "images/placeholder.png" /* TODO: images/jianping/pond.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "水池"; },
    text: function(vars) { return "水池。" + describeZombieWave(vars); },
    choices: [
      { text: "去金苹果大道", nextScene: "建平-金苹果大道", effect: updateTime(3) },
      { text: "去废弃小楼", nextScene: "建平-废弃小楼-1F", effect: updateTime(2) },
      { text: "去挹芬楼", nextScene: "建平-挹芬楼-1F", effect: updateTime(2) },
      { text: "去弘渊楼（前门）", nextScene: "建平-弘渊楼-1F", effect: updateTime(2) },
      { text: "去济美楼", nextScene: "建平-济美楼-1F", effect: updateTime(2) }
    ]
  },

  "建平-操场": {
    image: "images/placeholder.png" /* TODO: images/jianping/playground.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "操场"; },
    text: function(vars) { return "操场。" + describeZombieWave(vars); },
    choices: [
      { text: "去金苹果大道", nextScene: "建平-金苹果大道", effect: updateTime(3) },
      { text: "去食堂（侧门）", nextScene: "建平-食堂", effect: updateTime(2) },
      { text: "去弘渊楼（后门）", nextScene: "建平-弘渊楼-1F", effect: updateTime(2) },
      { text: "去宿舍", nextScene: "建平-宿舍-1F", effect: updateTime(2) }
    ]
  },

  "建平-思贤堂": {
    image: "images/placeholder.png" /* TODO: images/jianping/sixianHall.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "思贤堂"; },
    text: function(vars) { return "思贤堂（礼堂）。" + describeZombieWave(vars); },
    choices: [
      { text: "去挹芬楼", nextScene: "建平-挹芬楼-1F", effect: updateTime(2) },
      { text: "去废弃小楼", nextScene: "建平-废弃小楼-1F", effect: updateTime(2) }
    ]
  },

  // ==================== 行政楼（3 层 · 2 楼梯） ====================

  "建平-行政楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼1F"; },
    text: function(vars) { return "行政楼 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "出门（金苹果广场）", nextScene: "建平-金苹果广场", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼2F"; },
    text: function(vars) { return "行政楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼3F"; },
    text: function(vars) { return "行政楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) },
      { text: "上天台花园", nextScene: "建平-行政楼-天台", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-天台": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "行政楼天台"; },
    text: function(vars) { return "行政楼天台花园。" + describeZombieWave(vars); },
    choices: [
      { text: "回 3 楼", nextScene: "建平-行政楼-3F", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-东楼梯": jpStair("建平-行政楼", "行政楼东侧楼梯间", [1, 2, 3]),
  "建平-行政楼-西楼梯": jpStair("建平-行政楼", "行政楼西侧楼梯间", [1, 2, 3]),

  // ==================== 挹芬楼（6 层 · 1 电梯 + 2 楼梯 · 丧尸密度最高） ====================

  "建平-挹芬楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼1F"; },
    text: function(vars) { return "挹芬楼 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "出门（金苹果广场）", nextScene: "建平-金苹果广场", effect: updateTime(2) },
      { text: "去水池", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "去废弃小楼", nextScene: "建平-废弃小楼-1F", effect: updateTime(2) },
      { text: "去思贤堂", nextScene: "建平-思贤堂", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼2F"; },
    text: function(vars) { return "挹芬楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼3F"; },
    text: function(vars) { return "挹芬楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼4F"; },
    text: function(vars) { return "挹芬楼 4 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-5F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼5F"; },
    text: function(vars) { return "挹芬楼 5 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-6F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼6F"; },
    text: function(vars) { return "挹芬楼 6 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
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
      { text: "出门（金苹果广场）", nextScene: "建平-金苹果广场", effect: updateTime(2) },
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
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) }
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
      { text: "经廊桥去远翔楼", nextScene: "建平-远翔楼-3F", effect: updateTime(2) }
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
      { text: "经廊桥去远翔楼", nextScene: "建平-远翔楼-4F", effect: updateTime(2) }
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
      { text: "去化学实验室", nextScene: "建平-致真楼-5F-化学实验室", effect: updateTime(1) }
    ]
  },
  "建平-致真楼-东楼梯": jpStair("建平-致真楼", "致真楼东侧楼梯间", [1, 2, 3, 4, 5]),
  "建平-致真楼-西楼梯": jpStair("建平-致真楼", "致真楼西侧楼梯间", [1, 2, 3, 4, 5]),
  "建平-致真楼-电梯": jpElevator("建平-致真楼", "致真楼电梯间", [1, 2, 3, 4, 5]),

  "建平-致真楼-1F-老吴杂物室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼1F老吴杂物室"; },
    text: "致真楼 1 楼 · 老吴杂物室。",
    choices: [
      { text: "回 1 楼", nextScene: "建平-致真楼-1F", effect: updateTime(1) }
    ]
  },

  "建平-致真楼-5F-化学实验室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼5F化学实验室"; },
    text: "致真楼 5 楼 · 化学实验室。",
    choices: [
      { text: "回 5 楼", nextScene: "建平-致真楼-5F", effect: updateTime(1) }
    ]
  },

  // ==================== 远翔楼（5 层 · 无电梯 · 2 楼梯 · 高三教学楼） ====================

  "建平-远翔楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼1F"; },
    text: function(vars) { return "远翔楼 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "出门（金苹果大道）", nextScene: "建平-金苹果大道", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) },
      { text: "去医务室", nextScene: "建平-远翔楼-1F-医务室", effect: updateTime(1) }
    ]
  },
  "建平-远翔楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼2F"; },
    text: function(vars) { return "远翔楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) }
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
      { text: "经廊桥去致真楼", nextScene: "建平-致真楼-5F", effect: updateTime(2) }
    ]
  },
  "建平-远翔楼-东楼梯": jpStair("建平-远翔楼", "远翔楼东侧楼梯间", [1, 2, 3, 4, 5]),
  "建平-远翔楼-西楼梯": jpStair("建平-远翔楼", "远翔楼西侧楼梯间", [1, 2, 3, 4, 5]),

  "建平-远翔楼-1F-医务室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼1F医务室"; },
    text: "远翔楼 1 楼 · 医务室。",
    choices: [
      { text: "回 1 楼", nextScene: "建平-远翔楼-1F", effect: updateTime(1) }
    ]
  },

  "建平-远翔楼-3F-物理办公室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼3F物理办公室"; },
    text: "远翔楼 3 楼 · 物理办公室。",
    choices: [
      { text: "回 3 楼", nextScene: "建平-远翔楼-3F", effect: updateTime(1) }
    ]
  },

  "建平-远翔楼-4F-高三14班": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼4F高三14班"; },
    text: "远翔楼 4 楼 · 高三14班教室。",
    choices: [
      { text: "回 4 楼", nextScene: "建平-远翔楼-4F", effect: updateTime(1) }
    ]
  },

  // ==================== 食堂（正门 / 侧门 / 后厨） ====================

  "建平-食堂": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "食堂"; },
    text: function(vars) { return "食堂。" + describeZombieWave(vars); },
    choices: [
      { text: "去金苹果大道（正门）", nextScene: "建平-金苹果大道", effect: updateTime(2) },
      { text: "去后门（辅路）", nextScene: "建平-后门", effect: updateTime(2) },
      { text: "去操场（侧门）", nextScene: "建平-操场", effect: updateTime(2) },
      { text: "去宿舍", nextScene: "建平-宿舍-1F", effect: updateTime(2) },
      { text: "去后厨", nextScene: "建平-食堂-后厨", effect: updateTime(1) }
    ]
  },

  "建平-食堂-后厨": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "食堂后厨"; },
    text: "食堂后厨。",
    choices: [
      { text: "回食堂", nextScene: "建平-食堂", effect: updateTime(1) }
    ]
  },

  // ==================== 宿舍楼（4 层 · 2 楼梯） ====================

  "建平-宿舍-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "宿舍1F"; },
    text: function(vars) { return "宿舍 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去操场", nextScene: "建平-操场", effect: updateTime(2) },
      { text: "去食堂", nextScene: "建平-食堂", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-宿舍-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-宿舍-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-宿舍-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "宿舍2F"; },
    text: function(vars) { return "宿舍 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-宿舍-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-宿舍-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-宿舍-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "宿舍3F"; },
    text: function(vars) { return "宿舍 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-宿舍-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-宿舍-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-宿舍-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "宿舍4F"; },
    text: function(vars) { return "宿舍 4 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-宿舍-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-宿舍-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-宿舍-东楼梯": jpStair("建平-宿舍", "宿舍东侧楼梯间", [1, 2, 3, 4]),
  "建平-宿舍-西楼梯": jpStair("建平-宿舍", "宿舍西侧楼梯间", [1, 2, 3, 4]),

  // ==================== 弘渊楼 / 图书馆（4 层 · 1 楼梯 · 3 入口） ====================

  "建平-弘渊楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼1F"; },
    text: function(vars) { return "弘渊楼（图书馆）1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "出门（前门·水池）", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "出门（后门·操场）", nextScene: "建平-操场", effect: updateTime(2) },
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼2F"; },
    text: function(vars) { return "弘渊楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼3F"; },
    text: function(vars) { return "弘渊楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) },
      { text: "经廊桥去废弃小楼", nextScene: "建平-废弃小楼-3F", effect: updateTime(2) }
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
    text: "弘渊楼 4 楼 · 电脑区。",
    choices: [
      { text: "回 4 楼", nextScene: "建平-弘渊楼-4F", effect: updateTime(1) }
    ]
  },

  // ==================== 济美楼（4 层 · 2 楼梯 · 音乐/美术） ====================

  "建平-济美楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼1F"; },
    text: function(vars) { return "济美楼 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "出门（金苹果大道）", nextScene: "建平-金苹果大道", effect: updateTime(2) },
      { text: "出门（水池）", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) },
      { text: "去心理教室", nextScene: "建平-济美楼-1F-心理教室", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼2F"; },
    text: function(vars) { return "济美楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼3F"; },
    text: function(vars) { return "济美楼 3 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) }
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
      { text: "回 1 楼", nextScene: "建平-济美楼-1F", effect: updateTime(1) }
    ]
  },

  "建平-济美楼-4F-音乐教室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼4F音乐教室"; },
    text: "济美楼 4 楼 · 音乐教室。",
    choices: [
      { text: "回 4 楼", nextScene: "建平-济美楼-4F", effect: updateTime(1) }
    ]
  },

  // ==================== 废弃小楼（3 层 · 1 楼梯 · 廊桥通图书馆） ====================

  "建平-废弃小楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼1F"; },
    text: function(vars) { return "废弃小楼 1 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去水池", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "去挹芬楼", nextScene: "建平-挹芬楼-1F", effect: updateTime(2) },
      { text: "去思贤堂", nextScene: "建平-思贤堂", effect: updateTime(2) },
      { text: "去楼梯", nextScene: "建平-废弃小楼-楼梯", effect: updateTime(1) }
    ]
  },
  "建平-废弃小楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼2F"; },
    text: function(vars) { return "废弃小楼 2 楼。" + describeZombieWave(vars); },
    choices: [
      { text: "去楼梯", nextScene: "建平-废弃小楼-楼梯", effect: updateTime(1) }
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
    text: "废弃小楼 3 楼 · 团委工作室。",
    choices: [
      { text: "回 3 楼", nextScene: "建平-废弃小楼-3F", effect: updateTime(1) }
    ]
  }

});
