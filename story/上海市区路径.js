// -------- 高架连接 --------
// 记录连接城内城外各个区域的高架、隧道、公共交通


Object.assign(storyData, {
  "杨高南路立交桥": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/highway/highwayJam.png */,
    onEnter: function(vars) { 
      vars.showZombies = true; vars.currentArea = "高架"; vars.currentPlace = "高架"; vars.currentPos = "高架"; 
    },
    text: "你沿着立交桥径直来到了高架上。这里是你平时上学必经之处，也是最快的出城通道（如果你有车的话）。\n\
然而，这里已经堵得水泄不通。你早就料到了这一点，毕竟早上就听到这里传来隐约的喇叭声，连绵不绝。\n\
你继续往前，来到了外环。",
    choices: [
      {
        text: "前往临港方向",
        condition: "!hasNoTransportation",
        nextScene: "下不下高架？",
        effect: updateTime(20),
        elseScene: "结局-累死我了"
      },
      {
        text: "前往出城方向",
        condition: "!hasNoTransportation",
        nextScene: "三条出城线的抉择",
        elseScene: "结局-累死我了"
      },
      {
        text: "前往济阳路跨线桥",
        condition: "!hasNoTransportation",
        nextScene: "济阳路跨线桥",
        effect: updateTime(10),
        elseScene: "结局-累死我了"
      },
      {
        text: "沿外环往东走",
        nextScene: "外环罗山路立交桥",
        effect: updateTime(30)
      },
      {
        text: "下高架",
        nextScene: "三林路-环林东路 十字路口"
      }
    ]
  },

  "结局-累死我了" : {
    image: "images/太阳.jpg",
    text: "你走了很久，处处躲避丧尸聚集的地方。在高架上，你没有找到任何补给。最后，当太阳从云层中探出头来，你就倒在了烈日之下。\n—— 结局：累死我了 ——"
  },

  "下不下高架？": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/highway/zombiesBesideExit.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: "前面车辆感觉越来越多，而且有些不知怎么烧了起来。\n\
幸运的是，这里没有几只丧尸，你可以安全地通过。\n\
直到你来到一处下高架的出口，问题才变得严重起来。\n\
前面的高架路出现了大片的丧尸群。如果下高架，那么速度肯定显著变慢。",
    choices: [
      {
        text: "下",
        nextScene: "前往迪士尼", // 将会有幸存者聚居地剧情
        effect: updateTime(40)
      },
      {
        text: "不下",
        condition: "hasEbike",
        nextScene: "骑车前往临港新城", // 将会引出临港新城剧情
        elseScene: "结局-被丧尸围殴致死"
      }
    ]
  },

  "结局-被丧尸围殴致死" : {
    image: "images/zombiesBeatYou.png",
    text: "你并没有想象中那么灵活，被丧尸围殴至死。\n—— 结局：被丧尸围殴致死 ——"
  },

  "济阳路跨线桥": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/highway/jiyangOverpass.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: "高架在济阳路跨线桥处分叉。桥下往西北方向的道路，通向仁济医院那一带。\n\
如果你不下高架继续往前，前方的高架被废弃车辆堵得严严实实，看不到尽头。",
    choices: [
      {
        text: "下高架",
        condition: "!hasNoTransportation",
        nextScene: "仁济南院-浦锦路",
        effect: updateTime(10),
        elseScene: "结局-累死我了"
      },
      {
        text: "上徐浦大桥",
        nextScene: "上海交通大学",
        effect: updateTime(10)
      },
      {
        text: "前往杨高南路立交桥",
        nextScene: "杨高南路立交桥",
        effect: updateTime(10)
      }
    ]
  },

  // ==================== 外环高架·北线（建平方向） ====================

  "外环罗山路立交桥": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/highway/waijianLuoshan.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "高架"; vars.currentPlace = "高架"; vars.currentPos = "高架"; },
    text: "你沿着外环高架一路向东。越往前，堵车带越稀疏，偶尔才有几辆撞毁的私家车横在路中央，有的引擎盖还在冒烟。\n\
风从高处灌下来，吹得衣摆猎猎作响。高架桥下是成片灰扑扑的屋顶，再远一点，几栋高楼像墓碑一样立在天际线下。\n\
这里难得空旷，你反而更不安了——太安静了。",
    choices: [
      { text: "继续沿外环往东", nextScene: "张江立交桥", effect: updateTime(20) },
      { text: "往回走", nextScene: "杨高南路立交桥", effect: updateTime(30) }
    ]
  },

  "张江立交桥": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/highway/zhangjiang.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "高架"; vars.currentPlace = "高架"; vars.currentPos = "高架"; },
    text: "外环在这里与通往张江方向的匝道交汇。匝道下方灰蒙蒙的一片，是张江高科园区那些低矮的玻璃幕墙写字楼——曾经彻夜灯火通明，如今只剩几块残破的招牌在风里晃荡。\n\
匝道口堵着几辆撞成一团的货车，货厢门敞开着，货物散了一地，早被人翻得乱七八糟。有几只丧尸蹲在车缝里，听到你的脚步声，慢慢抬起了头。",
    choices: [
      { text: "继续往东", nextScene: "罗山路立交桥下", effect: updateTime(20) },
      { text: "往回走", nextScene: "外环罗山路立交桥", effect: updateTime(20) }
    ]
  },

  "罗山路立交桥下": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/highway/luoshanExit.png */,
    onEnter: function(vars) { vars.showZombies = true; vars.currentArea = "高架"; vars.currentPlace = "高架"; vars.currentPos = "高架"; },
    text: "高架在这里缓缓下降，一个下高架的匝道口出现在右侧。匝道口没有堵死——只横着一辆侧翻的出租车，车头瘪进去一块，驾驶室的门大敞着，像是有人仓皇弃车而逃。\n\
你贴着护栏往下望：这一片是宽阔的马路、成片的居民区，还有几所学校的操场。安静得让人心里发毛。",
    choices: [
      { text: "下高架", nextScene: "建平-校园门口", effect: updateTime(10) },
      { text: "上高架", nextScene: "张江立交桥", effect: updateTime(20) }
    ]
  }

});

// ===== 未实装区域 · 占位 stub（先能走通，剧情待后续制作） =====
Object.assign(storyData, {
  "前往迪士尼": {
    image: "images/placeholder.png",
    text: "你沿匝道朝迪士尼方向开去，路越走越偏。远处树林和围栏后隐约可见城堡的塔尖，但通往那里的路到此为止了。\n（作者尚未更新此处）",
    choices: [
      { text: "掉头返回", nextScene: "杨高南路立交桥" }
    ]
  },

  "骑车前往临港新城": {
    image: "images/placeholder.png",
    text: "你骑车朝临港新城方向驶去，道路在城郊的农田与集装箱堆场间延伸，望不到尽头。\n（作者尚未更新此处）",
    choices: [
      { text: "掉头返回", nextScene: "杨高南路立交桥" }
    ]
  },

  "三条出城线的抉择": {
    image: "images/placeholder.png",
    text: "你停在出城的岔口前，路牌指向三个方向，每条路尽头都热浪蒸腾、看不清去向。\n（作者尚未更新此处）",
    choices: [
      { text: "掉头返回", nextScene: "杨高南路立交桥" }
    ]
  },

  "上海交通大学": {
    image: "images/placeholder.png",
    text: "你过了徐浦大桥，来到上海交通大学门口。校门前散落着几只行李箱，闸机大开，校园里静得反常。\n（作者尚未更新此处）",
    choices: [
      { text: "掉头返回", nextScene: "济阳路跨线桥" }
    ]
  }
});