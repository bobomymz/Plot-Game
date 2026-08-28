// -------- 高架连接 --------
// 记录连接城内城外各个区域的高架、隧道、公共交通


Object.assign(storyData, {
  "杨高南路立交桥": {
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
  }

});