// ==================== 建平中学 ====================
// 北线·第一梯队：主角的高中。主线幸存营救（忻老师 + 高中同学）。
// 本文件：校园门口 + 校园内部地点节点与连接网络（骨架，剧情后续填充）。
// 地面·北线高架路径在 上海市区路径.js。

// ==================== 垂直通道节点工厂 ====================
// 楼梯间：垂直连接各楼层（爬楼梯，较慢）。prefix 为楼栋前缀（如 "建平-远翔楼"）。
function jbStair(prefix, label, floors) {
  var choices = [];
  floors.forEach(function(f) {
    choices.push({ text: "去" + f + "楼", nextScene: prefix + "-" + f + "F", effect: updateTime(2) });
  });
  return {
    image: "images/placeholder.png" /* TODO: images/jianping/stairwell.png */,
    onEnter: function(vars) { vars.currentPos = label; },
    text: label + "。",
    choices: choices
  };
}

// 电梯间：垂直连接各楼层（坐电梯，快）。
function jbElevator(prefix, label, floors) {
  var choices = [];
  floors.forEach(function(f) {
    choices.push({ text: "坐电梯去" + f + "楼", nextScene: prefix + "-" + f + "F", effect: updateTime(1) });
  });
  return {
    image: "images/placeholder.png" /* TODO: images/jianping/elevator.png */,
    onEnter: function(vars) { vars.currentPos = label; },
    text: label + "。",
    choices: choices
  };
}

Object.assign(storyData, {

  // ==================== 校园门口（到达中转节点） ====================

  "建平-校园门口": {
    image: "images/placeholder.png" /* TODO: images/jianping/campusGate.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "建平中学"; vars.currentPlace = "建平"; vars.currentPos = "校园门口"; },
    text: "你站在建平中学前门马路对面的一棵行道树后，没有急着靠近。\n\
三年了，校门还是老样子——“建平中学”四个字褪了色，铁门半敞着。透过门缝，你能看到里面那片熟悉到骨子里的金苹果广场，和广场上歪歪斜斜游荡着的身影。\n\
校门口内外都有丧尸，只是现在它们还没注意到你。你压低身子，盘算着怎么进去。",
    choices: [
      { text: "去前门看看", nextScene: "建平-前门", effect: updateTime(5) },
      { text: "绕去后门", nextScene: "建平-后门", effect: updateTime(10) }
    ]
  },

  // ==================== 校园入口 ====================

  "建平-前门": {
    image: "images/placeholder.png" /* TODO: images/jianping/frontGate.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "建平中学"; vars.currentPlace = "建平"; vars.currentPos = "前门"; },
    text: "你贴着墙根摸到前门。金苹果广场就在铁门之内，那座再熟悉不过的金苹果雕塑在灰暗的天色下泛着暗沉的光。几只丧尸在雕塑附近游荡，时不时发出几声低吼。\n\
前门的铁门半开着，但门内外的丧尸都不少。你暂时没敢贸然进去。",
    choices: [
      { text: "走进前门（金苹果广场）", nextScene: "建平-金苹果广场", effect: updateTime(2) },
      { text: "退回校园门口", nextScene: "建平-校园门口", effect: updateTime(5) }
    ]
  },

  "建平-后门": {
    image: "images/placeholder.png" /* TODO: images/jianping/backGate.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "建平中学"; vars.currentPlace = "建平"; vars.currentPos = "后门"; },
    text: "你绕到学校后门。这里的情况比前门更糟——丧尸都挤在门内，隔着铁栅栏朝外伸着手臂，低沉的嘶吼连成一片。门内黑压压的一片，看不清到底有多少。\n\
你后退了两步，怕惊动它们。",
    choices: [
      { text: "从后门进去（食堂方向）", nextScene: "建平-食堂", effect: updateTime(2) },
      { text: "沿辅路去金苹果大道", nextScene: "建平-金苹果大道", effect: updateTime(3) },
      { text: "退回校园门口", nextScene: "建平-校园门口", effect: updateTime(10) }
    ]
  },

  // ==================== 户外 ====================

  "建平-金苹果广场": {
    image: "images/placeholder.png" /* TODO: images/jianping/goldenApplePlaza.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "金苹果广场"; },
    text: "金苹果广场。",
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
    text: "金苹果大道。",
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
    text: "水池。",
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
    text: "操场。",
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
    text: "思贤堂（礼堂）。",
    choices: [
      { text: "去挹芬楼", nextScene: "建平-挹芬楼-1F", effect: updateTime(2) },
      { text: "去废弃小楼", nextScene: "建平-废弃小楼-1F", effect: updateTime(2) }
    ]
  },

  // ==================== 行政楼（3 层 · 2 楼梯） ====================

  "建平-行政楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼1F"; },
    text: "行政楼 1 楼。",
    choices: [
      { text: "出门（金苹果广场）", nextScene: "建平-金苹果广场", effect: updateTime(2) },
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼2F"; },
    text: "行政楼 2 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "行政楼3F"; },
    text: "行政楼 3 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-行政楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-行政楼-西楼梯", effect: updateTime(1) },
      { text: "上天台花园", nextScene: "建平-行政楼-天台", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-天台": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.showZombies = true; vars.currentPos = "行政楼天台"; },
    text: "行政楼天台花园。",
    choices: [
      { text: "回 3 楼", nextScene: "建平-行政楼-3F", effect: updateTime(1) }
    ]
  },
  "建平-行政楼-东楼梯": jbStair("建平-行政楼", "行政楼东侧楼梯间", [1, 2, 3]),
  "建平-行政楼-西楼梯": jbStair("建平-行政楼", "行政楼西侧楼梯间", [1, 2, 3]),

  // ==================== 挹芬楼（6 层 · 1 电梯 + 2 楼梯 · 丧尸密度最高） ====================

  "建平-挹芬楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼1F"; },
    text: "挹芬楼 1 楼。",
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
    text: "挹芬楼 2 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼3F"; },
    text: "挹芬楼 3 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼4F"; },
    text: "挹芬楼 4 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-5F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼5F"; },
    text: "挹芬楼 5 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-6F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "挹芬楼6F"; },
    text: "挹芬楼 6 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-挹芬楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-挹芬楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-挹芬楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-挹芬楼-东楼梯": jbStair("建平-挹芬楼", "挹芬楼东侧楼梯间", [1, 2, 3, 4, 5, 6]),
  "建平-挹芬楼-西楼梯": jbStair("建平-挹芬楼", "挹芬楼西侧楼梯间", [1, 2, 3, 4, 5, 6]),
  "建平-挹芬楼-电梯": jbElevator("建平-挹芬楼", "挹芬楼电梯间", [1, 2, 3, 4, 5, 6]),

  // ==================== 致真楼（5 层 · 1 电梯 + 2 楼梯 · 老吴杂物室） ====================

  "建平-致真楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼1F"; },
    text: "致真楼 1 楼。",
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
    text: "致真楼 2 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-致真楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-致真楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) }
    ]
  },
  "建平-致真楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "致真楼3F"; },
    text: "致真楼 3 楼。",
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
    text: "致真楼 4 楼。",
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
    text: "致真楼 5 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-致真楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-致真楼-西楼梯", effect: updateTime(1) },
      { text: "去电梯", nextScene: "建平-致真楼-电梯", effect: updateTime(0) },
      { text: "经廊桥去远翔楼", nextScene: "建平-远翔楼-5F", effect: updateTime(2) },
      { text: "去化学实验室", nextScene: "建平-致真楼-5F-化学实验室", effect: updateTime(1) }
    ]
  },
  "建平-致真楼-东楼梯": jbStair("建平-致真楼", "致真楼东侧楼梯间", [1, 2, 3, 4, 5]),
  "建平-致真楼-西楼梯": jbStair("建平-致真楼", "致真楼西侧楼梯间", [1, 2, 3, 4, 5]),
  "建平-致真楼-电梯": jbElevator("建平-致真楼", "致真楼电梯间", [1, 2, 3, 4, 5]),

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
    text: "远翔楼 1 楼。",
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
    text: "远翔楼 2 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-远翔楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "远翔楼3F"; },
    text: "远翔楼 3 楼。",
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
    text: "远翔楼 4 楼。",
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
    text: "远翔楼 5 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-远翔楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-远翔楼-西楼梯", effect: updateTime(1) },
      { text: "经廊桥去致真楼", nextScene: "建平-致真楼-5F", effect: updateTime(2) }
    ]
  },
  "建平-远翔楼-东楼梯": jbStair("建平-远翔楼", "远翔楼东侧楼梯间", [1, 2, 3, 4, 5]),
  "建平-远翔楼-西楼梯": jbStair("建平-远翔楼", "远翔楼西侧楼梯间", [1, 2, 3, 4, 5]),

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
    text: "食堂。",
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
    text: "宿舍 1 楼。",
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
    text: "宿舍 2 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-宿舍-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-宿舍-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-宿舍-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "宿舍3F"; },
    text: "宿舍 3 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-宿舍-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-宿舍-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-宿舍-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "宿舍4F"; },
    text: "宿舍 4 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-宿舍-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-宿舍-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-宿舍-东楼梯": jbStair("建平-宿舍", "宿舍东侧楼梯间", [1, 2, 3, 4]),
  "建平-宿舍-西楼梯": jbStair("建平-宿舍", "宿舍西侧楼梯间", [1, 2, 3, 4]),

  // ==================== 弘渊楼 / 图书馆（4 层 · 1 楼梯 · 3 入口） ====================

  "建平-弘渊楼-1F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼1F"; },
    text: "弘渊楼（图书馆）1 楼。",
    choices: [
      { text: "出门（前门·水池）", nextScene: "建平-水池", effect: updateTime(2) },
      { text: "出门（后门·操场）", nextScene: "建平-操场", effect: updateTime(2) },
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-2F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼2F"; },
    text: "弘渊楼 2 楼。",
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼3F"; },
    text: "弘渊楼 3 楼。",
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) },
      { text: "经廊桥去废弃小楼", nextScene: "建平-废弃小楼-3F", effect: updateTime(2) }
    ]
  },
  "建平-弘渊楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "弘渊楼4F"; },
    text: "弘渊楼 4 楼。",
    choices: [
      { text: "去楼梯", nextScene: "建平-弘渊楼-楼梯", effect: updateTime(1) },
      { text: "去电脑区", nextScene: "建平-弘渊楼-4F-电脑区", effect: updateTime(1) }
    ]
  },
  "建平-弘渊楼-楼梯": jbStair("建平-弘渊楼", "弘渊楼楼梯间", [1, 2, 3, 4]),

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
    text: "济美楼 1 楼。",
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
    text: "济美楼 2 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼3F"; },
    text: "济美楼 3 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-4F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "济美楼4F"; },
    text: "济美楼 4 楼。",
    choices: [
      { text: "去东楼梯", nextScene: "建平-济美楼-东楼梯", effect: updateTime(1) },
      { text: "去西楼梯", nextScene: "建平-济美楼-西楼梯", effect: updateTime(1) },
      { text: "去音乐教室", nextScene: "建平-济美楼-4F-音乐教室", effect: updateTime(1) }
    ]
  },
  "建平-济美楼-东楼梯": jbStair("建平-济美楼", "济美楼东侧楼梯间", [1, 2, 3, 4]),
  "建平-济美楼-西楼梯": jbStair("建平-济美楼", "济美楼西侧楼梯间", [1, 2, 3, 4]),

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
    text: "废弃小楼 1 楼。",
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
    text: "废弃小楼 2 楼。",
    choices: [
      { text: "去楼梯", nextScene: "建平-废弃小楼-楼梯", effect: updateTime(1) }
    ]
  },
  "建平-废弃小楼-3F": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼3F"; },
    text: "废弃小楼 3 楼。",
    choices: [
      { text: "去楼梯", nextScene: "建平-废弃小楼-楼梯", effect: updateTime(1) },
      { text: "经廊桥去弘渊楼", nextScene: "建平-弘渊楼-3F", effect: updateTime(2) },
      { text: "去团委工作室", nextScene: "建平-废弃小楼-3F-团委工作室", effect: updateTime(1) }
    ]
  },
  "建平-废弃小楼-楼梯": jbStair("建平-废弃小楼", "废弃小楼楼梯间", [1, 2, 3]),

  "建平-废弃小楼-3F-团委工作室": {
    image: "images/placeholder.png",
    onEnter: function(vars) { vars.currentPos = "废弃小楼3F团委工作室"; },
    text: "废弃小楼 3 楼 · 团委工作室。",
    choices: [
      { text: "回 3 楼", nextScene: "建平-废弃小楼-3F", effect: updateTime(1) }
    ]
  }

});
