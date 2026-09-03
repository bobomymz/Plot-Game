// -------- 仁济南院（西南线 · 真相主通道 · 第一梯队） --------
// 规划基线：设计细节.md §13.9 / 仁济南院设计稿.md
// 已实现：到达路线 + 外部入口 + 医院内部（急诊大厅/检验科/门诊药房/住院部走廊/手术供应室/太平间/检验科后门）
// TODO: 逗留过久 → 尸潮围拢 → 强制过夜（夜晚剧情.js）

Object.assign(storyData, {
  // ==================== 外部：到达与入口 ====================

  "仁济南院-浦锦路": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiRoad.png */,
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.currentArea = "仁济南院";
      vars.currentPlace = "仁济南院";
      vars.currentPos = "浦锦路";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      var desc = "你下了高架，沿着一条两侧种满香樟的路前进。路边褪色的指示牌写着“仁济医院南院”，箭头指向路尽头的几栋白色建筑。\n\
医院的轮廓安静得有些不真实。急诊楼前的通道上横七竖八地倒着几辆救护车和私家车，车门大开，路面上有干涸的暗红色痕迹。几个穿白大褂的身影瘫倒在草坪上，一动不动。\n\
整座医院像一个被突然抽走了声音的蜂巢。";
      return desc + "\n" + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "从急诊正门进",
        nextScene: "仁济南院-急诊大门",
        effect: updateTime(5)
      },
      {
        text: "绕到侧面看看",
        nextScene: "仁济南院-门诊大厅",
        effect: updateTime(8)
      },
      {
        text: "进入地下停车场",
        nextScene: "仁济南院-地下停车场",
        effect: updateTime(6)
      },
      {
        text: "去高架",
        condition: "chasedByZombies < 4",
        nextScene: "济阳路跨线桥",
        effect: updateTime(15),
        elseScene: "结局-仁济-尸潮围困"
      }
    ]
  },

  "仁济南院-急诊大门": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMainGate.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: function(vars) {
      var desc = "急诊大厅的玻璃门半敞着，门上糊着报纸和胶带——有人试图封住它，又放弃了。门前的空地上倒着几具尸体，苍蝇在低空盘旋。旋转门的格子里卡着一个人，玻璃上全是血手印。\n";
      if (vars.dd >= 6) {
        desc += "更糟的是，医院外围的尸潮不知道什么时候围了上来——正门外的空地已经被一群游荡的丧尸堵死，挤也挤不进去。\n<span style='color: #ffaa00;'>【提示】正门已被尸潮堵死，只能另找入口。</span>";
      } else {
        desc += "门缝里透出黑黢黢的走廊，看不清里面。要进去，得先对付门口这些游荡的丧尸。";
      }
      return desc + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        showCondition: "dd < 6",
        text: "硬闯急诊大门",
        condition: "!_renjiERCleared",
        nextScene: "仁济南院-大门-记忆闪色",
        elseScene: "仁济南院-急诊大厅"
      },
      {
        showCondition: "!hasBandage",
        text: "翻看门口那具医护人员的遗体",
        nextScene: "仁济南院-大门-绷带",
        effect: updateTime(2)
      },
      {
        text: "去浦锦路",
        nextScene: "仁济南院-浦锦路",
        effect: updateTime(5)
      }
    ]
  },

  "仁济南院-大门-绷带": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMainGate.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-急诊大门" } },
    text: "你蹲下来，翻看那具瘫倒在门口的遗体。是个年轻的护士，白大褂下摆沾满干涸的血。她的口袋里鼓鼓的——你摸出几卷还没拆封的绷带。\n\
你轻声说了句抱歉，把绷带收好。",
    choices: [
      {
        text: "拿走绷带",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-急诊大门",
        effect: { set: { hasBandage: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "算了，不拿",
        nextScene: "仁济南院-急诊大门"
      }
    ]
  },

  "仁济南院-大门-记忆闪色": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMainGate.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿"], 9),
    text: "你压低身子，朝急诊大厅冲过去。门口的丧尸被你的动静惊动，摇摇晃晃地围了过来。\n\
你必须盯紧每一个扑上来的影子，记清它们的轮廓，才能从缝隙里钻过去。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝2绿2黄1白" },
        condition: checkFlashAnswer,
        nextScene: "仁济南院-大门-记忆闪色-成功",
        effect: updateTime(3),
        elseScene: "仁济南院-大门-记忆闪色-失败",
        timeout: 20000,
        timeoutScene: "仁济南院-大门-记忆闪色-失败"
      }
    ]
  },

  "仁济南院-大门-记忆闪色-成功": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMainGate.png */,
    onEnter: { set: { _renjiERCleared: true } },
    text: "你一脚踹飞堵路的几只丧尸，成功地闯进了急诊大厅。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-急诊大厅"
      }
    ]
  },

  "仁济南院-大门-记忆闪色-失败": {
    image: "images/hurtByzombie.png",
    onEnter: { add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true } },
    text: "你没能及时看清——一只丧尸从斜刺里扑上来，爪子划过你的手臂。你踉跄着冲出重围，跌跌撞撞地摔进了急诊大厅。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-急诊大厅"
      }
    ]
  },

  "仁济南院-门诊大门": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiAmbulance.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: "你来到了门诊大门门口。这里遍地尸体，苍蝇在低空盘旋，但没看到有丧尸。\n\
安静，太安静了。",
    choices: [
      {
        text: "进去",
        nextScene: "仁济南院-门诊大厅"
      },
      {
        text: "往左走",
        nextScene: "仁济南院-救护车通道"
      },
      {
        text: "往右走",
        nextScene: "仁济南院-急诊大门"
      }
    ]
  },

  "仁济南院-救护车通道": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiAmbulance.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: "你来到了救护车通道门口。铁门半掩着，一辆救护车堵在门口，车门大开，车内的担架翻落在地。通道深处的应急灯一闪一闪，投下忽明忽暗的影子。\n\
这里比正门安静一些，但前方仍有两三只丧尸在游荡。",
    choices: [
      {
        text: "悄悄穿过，进入急诊大厅",
        nextScene: "仁济南院-急诊大厅",
        effect: updateTime(3)
      },
      {
        text: "去浦锦路",
        nextScene: "仁济南院-浦锦路",
        effect: updateTime(8)
      }
    ]
  },

  "仁济南院-地下停车场": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiParking.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: function(vars) {
      var desc = "地下停车场的入口坡道黑黢黢的，往下看不到底。入口处横着一辆失控的轿车，挡风玻璃碎了一半。\n";
      if (vars.hasTorch) {
        desc += "你打开照明，光线勉强能照清前方几米——这条潜行路线通向医院的后勤区。";
      } else if(vars.hasPhone) {
        desc += "你打开手机，光线勉强能照清前方几米——这条潜行路线通向医院的后勤区。";
      } else {
        desc += "里面比外面暗得多——没有照明的话，进去什么都看不见，只会撞上不知道什么东西。";
      }
      return desc;
    },
    choices: [
      {
        condition: "hasTorch || hasPhone",
        text: "进去看看",
        nextScene: "仁济南院-后勤通道",
        effect: updateTime(5)
      },
      {
        text: "去浦锦路",
        nextScene: "仁济南院-浦锦路",
        effect: updateTime(6)
      }
    ]
  },

  "仁济南院-后勤通道": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiBackhall.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: "你穿过地下停车场，摸到了医院的后勤通道。这里堆着手推车、氧气瓶和成箱的耗材，空气中弥漫着一股消毒水混合着霉味的气息。\n\
通道尽头是一扇写着“检验科”的门，门旁有一条更窄的走道，通往住院部方向。另一头的墙边，立着一扇沉重的铁门，上面贴着褪色的“太平间”标识。",
    choices: [
      {
        text: "看看这扇门",
        nextScene: "仁济南院-检验科后门",
        effect: updateTime(2)
      },
      {
        text: "往住院部方向走",
        nextScene: "仁济南院-住院部走廊",
        effect: updateTime(3)
      },
      {
        text: "去太平间",
        nextScene: "仁济南院-太平间",
        effect: updateTime(3)
      },
      {
        text: "去地下停车场",
        nextScene: "仁济南院-地下停车场",
        effect: updateTime(5)
      }
    ]
  },

  // ==================== 检验科后门（方瑜遇难） ====================

  "仁济南院-检验科后门": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiBackdoor.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: function(vars) {
      var desc = "检验科的后门关得严严实实——你推了推，纹丝不动，门是从里面反锁的。门上有一小块灰蒙蒙的玻璃观察窗。\n门外的通道上，一个穿着检验科白大褂的人倒在墙边——已经没了呼吸。她的工牌挂在胸前，上面的照片和名字在昏暗的光线下模糊可辨。\n";
      if (vars._fangyuFound) {
        desc += "你已经查看过她的工牌了。";
      } else {
        desc += "她的手里还攥着一部手机，屏幕早就黑了。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_fangyuFound",
        text: "查看那个人的工牌",
        nextScene: "仁济南院-检验科后门-方瑜",
        effect: updateTime(1)
      },
      {
        showCondition: "!_renjiPeeked",
        text: "凑到玻璃窗前往里看",
        nextScene: "仁济南院-检验科后门-窥视",
        effect: updateTime(1)
      },
      {
        text: "去后勤通道",
        nextScene: "仁济南院-后勤通道",
        effect: updateTime(2)
      }
    ]
  },

  "仁济南院-检验科后门-窥视": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { _renjiPeeked: true, positionAfterOperation: "仁济南院-检验科后门" } },
    text: "你垫起脚，把脸凑到那块灰蒙蒙的玻璃窗前，屏住呼吸往里看。\n\
检验科的应急灯还亮着，把操作台上的东西照得清清楚楚——离心机、试剂架、散落的培养皿。\n\
操作台的一角，隐约放着一部手机和一本牛皮纸封面的笔记本。\n\
这里显然有人工作过，而且走得很平静——连灯都没关。",
    choices: [
      {
        text: "离开",
        nextScene: "仁济南院-检验科后门",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-检验科后门-方瑜": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiBackdoor.png */,
    onEnter: { set: { _fangyuFound: true, positionAfterOperation: "仁济南院-检验科后门" } },
    text: "你蹲下来，翻看她的工牌——仁济医院南院，检验科，方瑜。\n\
她的手机屏幕还亮着最后一点微光，你按了一下，微信聊天记录停在最后两行：\n\
\n\
王知筠（18:47）：“到了，后门等我”\n\
方瑜：“好”\n\
\n\
时间停在 6月28日。她等在这里，却没能等到人，也没能等到撤离。",
    choices: [
      {
        text: "放下手机",
        nextScene: "仁济南院-检验科后门",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 急诊大厅（枢纽） ====================

  "仁济南院-急诊大厅": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiER.png */,
    onEnter: function(vars) {
      vars.currentPos = "急诊大厅";
      return {};
    },
    qte: function(vars) {
      if (vars._renjiERCleared) return null;
      return {
        timeout: "10000 - chasedByZombies * 1000",
        onTimeout: "仁济南院-急诊大厅-战斗"
      };
    },
    text: function(vars) {
      var desc = "急诊大厅里一片狼藉。翻倒的轮椅、散落的病历、踩碎的药瓶。挂号台后面倒着两个人，穿着白大褂。墙上的楼层导览图还亮着，但屏幕已经裂了大半。\n\
大厅深处有一扇门，门上的灯牌还亮着；一侧的连廊通往另一栋楼；楼梯间在大厅的另一头。\n";
      if (!vars._renjiERCleared) {
        desc += "大厅中央，一只穿着病号服的丧尸正缓缓转过身来——它发现了你。\n<span style='color: #ffaa00;'>【提示】别愣着，它不会一直等你。</span>";
      } else {
        desc += "大厅里的丧尸已经被你解决了。这里暂时安静了下来。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_renjiERCleared",
        text: "迎战那只丧尸",
        nextScene: "仁济南院-急诊大厅-战斗"
      },
      {
        text: "往大厅深处走",
        nextScene: "仁济南院-检验科",
        effect: updateTime(2)
      },
      {
        text: "上楼",
        nextScene: "仁济南院-楼梯-急诊楼",
        effect: updateTime(1)
      },
      {
        text: "穿过连廊去另一栋楼",
        nextScene: "仁济南院-门诊大厅",
        effect: updateTime(2)
      },
      {
        text: "去住院大楼",
        nextScene: "仁济南院-住院部走廊",
        effect: updateTime(3)
      },
      {
        text: "从正门离开",
        nextScene: "仁济南院-急诊大门",
        effect: updateTime(3)
      }
    ]
  },

  "仁济南院-急诊大厅-战斗": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiER.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿"], 7),
    text: "那只丧尸朝你扑来。它的动作僵硬但力气很大。你盯着它，记清每一个动作的间隙。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝2绿" },
        condition: checkFlashAnswer,
        nextScene: "仁济南院-急诊大厅-胜利",
        elseScene: "仁济南院-急诊大厅-受伤",
        timeout: 12000,
        timeoutScene: "仁济南院-急诊大厅-受伤"
      }
    ]
  },

  "仁济南院-急诊大厅-胜利": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiER.png */,
    onEnter: { set: { _renjiERCleared: true } },
    text: "你抓住机会，把它放倒了。它在地上抽搐了几下，不再动了。\n\
大厅终于安静下来。你靠在墙上喘了几口气。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-急诊大厅"
      }
    ]
  },

  "仁济南院-急诊大厅-受伤": {
    image: "images/hurtByzombie.png",
    onEnter: { add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true, _renjiERCleared: true } },
    text: "它的爪子划过了你的肩膀。你踉跄着躲开，反手一击，终于把它打倒在地。\n\
它不再动了，但你的肩膀火辣辣地疼。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-急诊大厅"
      }
    ]
  },

  // ==================== 门诊药房 ====================

  "仁济南院-门诊药房": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiPharmacy.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-门诊大厅" } },
    text: function(vars) {
      var desc = "门诊药房的玻璃窗被砸开了一个口子，货架上的药盒散落一地，大部分已经被翻得七零八落。\n";
      if (vars.hasAntibiotic && vars.hasPainkiller && vars.hasAlcohol) {
        desc += "处方药架上该拿的都拿了，只剩下些散落的空药盒。";
      } else {
        desc += "柜台后面的处方药架倒还整齐，几瓶没拆封的药还好好地摆在原处。墙角的小推车上，放着一瓶医用酒精。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!hasAntibiotic",
        text: "拿一盒抗生素",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-门诊药房-抗生素",
        elseScene: "整理整理"
      },
      {
        showCondition: "!hasPainkiller",
        text: "拿一瓶止痛药",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-门诊药房-止痛药",
        elseScene: "整理整理"
      },
      {
        showCondition: "!hasAlcohol",
        text: "拿医用酒精",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-门诊药房-酒精",
        elseScene: "整理整理"
      },
      {
        text: "离开药房",
        nextScene: "仁济南院-门诊大厅",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-门诊药房-抗生素": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiPharmacy.png */,
    onEnter: { set: { hasAntibiotic: true, positionAfterOperation: "仁济南院-门诊药房" }, add: { itemCount: 1 } },
    text: "你拿起那盒抗生素。阿莫西林，还没拆封，说明书齐全。\n\
在这个缺医少药的世道里，这盒药能救一条命。",
    choices: [
      { text: "收好", nextScene: "仁济南院-门诊药房" }
    ]
  },

  "仁济南院-门诊药房-止痛药": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiPharmacy.png */,
    onEnter: { set: { hasPainkiller: true, positionAfterOperation: "仁济南院-门诊药房" }, add: { itemCount: 1 } },
    text: "你拿起那瓶止痛药。布洛芬，瓶身完整。\n\
疼得受不了的时候，它能让你缓一缓。",
    choices: [
      { text: "收好", nextScene: "仁济南院-门诊药房" }
    ]
  },

  "仁济南院-门诊药房-酒精": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiPharmacy.png */,
    onEnter: { set: { hasAlcohol: true, positionAfterOperation: "仁济南院-门诊药房" }, add: { itemCount: 1 } },
    text: "你拿起那瓶医用酒精，拧开瓶盖闻了闻——很冲。\n\
如果受了伤，这瓶酒精能用来给伤口消毒。",
    choices: [
      { text: "收好", nextScene: "仁济南院-门诊药房" }
    ]
  },

  // ==================== 检验科（核心 · 王知筠遗物） ====================

  "仁济南院-检验科": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: function(vars) { vars.currentPos = "检验科"; return {}; },
    text: function(vars) {
      var desc = "";
      if (vars._renjiLabCleared) {
        desc += "检验科的门虚掩着——你上次来的时候已经把它打开了。\n检验科里的动静已经平息了。";
      } else {
        desc += "检验科的大门紧闭着，门上的电子锁亮着微弱的红灯。门上贴着一张褪色的“检验科”标识。\n门里传来一阵轻微的、金属摩擦的声音——像是有什么东西在里面走动。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "_renjiLabCleared",
        text: "进入检验科",
        nextScene: "仁济南院-检验科-内部",
        effect: updateTime(1)
      },
      {
        showCondition: "!_renjiLabCleared && hasRenjiCard",
        text: "用门禁卡刷卡开门",
        nextScene: "仁济南院-检验科-进入",
        effect: updateTime(1)
      },
      {
        showCondition: "!_renjiLabCleared && !hasRenjiCard && hasAxe",
        text: "用斧头破门",
        nextScene: "仁济南院-检验科-破门",
        effect: updateTime(2)
      },
      {
        showCondition: "!_renjiLabCleared && !hasRenjiCard && !hasAxe && hasIronPipe",
        text: "用铁棍撬门",
        nextScene: "仁济南院-检验科-撬门",
        effect: updateTime(2)
      },
      {
        showCondition: "!_renjiLabCleared && !hasRenjiCard && !hasAxe && !hasIronPipe",
        text: "试着推门（门锁着）",
        nextScene: "仁济南院-检验科-锁着",
        effect: updateTime(1)
      },
      {
        text: "去急诊大厅",
        nextScene: "仁济南院-急诊大厅",
        effect: updateTime(2)
      }
    ]
  },

  "仁济南院-检验科-锁着": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-检验科" } },
    text: "你用力推了推门——纹丝不动。电子锁死死卡着。\n\
门上没有密码键盘，只有一个刷卡槽。你得找一张门禁卡，或者用点更粗暴的办法。",
    choices: [
      {
        text: "去急诊大厅",
        nextScene: "仁济南院-急诊大厅",
        effect: updateTime(2)
      }
    ]
  },

  "仁济南院-检验科-进入": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-检验科" } },
    text: "你把门禁卡在刷卡槽上一刷——“滴”的一声，电子锁绿灯亮起，门缓缓滑开。\n\
没有惊动任何东西。你侧身闪了进去。\n\
刚进去，你就撞见了它——一只穿着检验科白大褂的丧尸，正站在操作台前，缓缓转过头来。它的皮肤透着一层不正常的灰白。",
    choices: [
      {
        text: "迎战这只丧尸",
        nextScene: "仁济南院-检验科-守卫战"
      }
    ]
  },

  "仁济南院-检验科-破门": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { _renjiNoise: true, positionAfterOperation: "仁济南院-检验科" } },
    text: "你抡起斧头，狠狠砸在门锁上。金属撞击的声音在空荡荡的走廊里回荡——这一下，整层楼大概都听见了。\n\
门锁被砸开了。你一脚踹开门，里面的丧尸已经朝门口扑来。",
    choices: [
      {
        text: "迎战这只丧尸",
        nextScene: "仁济南院-检验科-守卫战"
      }
    ]
  },

  "仁济南院-检验科-撬门": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-检验科" } },
    text: "你把铁棍插进门缝，用力撬。门锁发出令人牙酸的嘎吱声——\n",
    choices: [
      {
        text: "继续用力撬",
        nextScene: function(vars) { return Math.random() < 0.5 ? "仁济南院-检验科-撬开了" : "仁济南院-检验科-撬门-失败"; },
        effect: { add: { strength: -1 } }
      },
      {
        text: "算了，不撬了",
        nextScene: "仁济南院-检验科",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-检验科-撬门-失败": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-检验科" } },
    text: "铁棍滑了一下，你一个趔趄，手被门边划出一道口子。门还是纹丝不动。\n\
你喘了几口气——这锁比想象中结实。",
    choices: [
      {
        text: "再撬一次",
        nextScene: "仁济南院-检验科-撬门",
        effect: updateTime(1)
      },
      {
        text: "算了",
        nextScene: "仁济南院-检验科",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-检验科-撬开了": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { _renjiNoise: true, positionAfterOperation: "仁济南院-检验科" } },
    text: "门锁“啪”地一声弹开了。动静不小，但好歹是把门撬开了。\n\
你冲进去，迎面就是那只丧尸。",
    choices: [
      {
        text: "迎战这只丧尸",
        nextScene: "仁济南院-检验科-守卫战"
      }
    ]
  },

  "仁济南院-检验科-守卫战": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄"], 7),
    text: "那只丧尸朝你扑来，动作僵硬但势大力沉。它身上那股化学试剂的味道呛得你眼睛发酸。\n\
你盯紧它，寻找破绽。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝2绿1黄" },
        condition: checkFlashAnswer,
        nextScene: "仁济南院-检验科-守卫战-胜利",
        elseScene: "仁济南院-检验科-守卫战-受伤",
        timeout: 12000,
        timeoutScene: "仁济南院-检验科-守卫战-受伤"
      }
    ]
  },

  "仁济南院-检验科-守卫战-胜利": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLab.png */,
    onEnter: { set: { _renjiLabCleared: true } },
    text: "你抓住破绽，把它放倒。它瘫在操作台边，白大褂上沾满试剂和血。\n\
检验科终于安静下来。你环顾四周——这里，就是王知筠最后工作的地方。",
    choices: [
      {
        text: "开始搜刮",
        nextScene: "仁济南院-检验科-内部"
      }
    ]
  },

  "仁济南院-检验科-守卫战-受伤": {
    image: "images/hurtByzombie.png",
    onEnter: { add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true, _renjiLabCleared: true } },
    text: "它抓伤了你的手臂，但你最终还是把它打倒了。\n\
它瘫在操作台边不再动弹。你喘着粗气，手臂上火辣辣地疼。",
    choices: [
      {
        text: "继续搜刮",
        nextScene: "仁济南院-检验科-内部"
      }
    ]
  },

  "仁济南院-检验科-内部": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLabInside.png */,
    onEnter: function(vars) { vars.currentPos = "检验科"; return {}; },
    text: function(vars) {
      var desc = "检验科的灯还亮着，应急电源嗡嗡作响。离心机、试剂架、培养皿散乱地摆在操作台上——这里的主人离开得很匆忙，又很平静。\n";
      if (!vars.hasWangPhone && !vars.hasWangNotebook) {
        desc += "操作台的一角，放着一部手机和一本牛皮纸封面的笔记本。手机屏幕暗着，笔记本的封面上写着“2026 实验记录”。";
      } else if (!vars.hasWangPhone) {
        desc += "操作台的一角还放着一部手机，屏幕暗着。";
      } else if (!vars.hasWangNotebook) {
        desc += "操作台的一角还放着一本牛皮纸封面的笔记本，封面写着“2026 实验记录”。";
      } else {
        desc += "操作台上该拿的都拿了。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!hasWangPhone",
        text: "拿起那部手机",
        nextScene: "仁济南院-检验科-手机",
        effect: updateTime(1)
      },
      {
        showCondition: "!hasWangNotebook",
        text: "拿起实验记录本",
        nextScene: "仁济南院-检验科-记录本",
        effect: updateTime(1)
      },
      {
        showCondition: "!hasIodine",
        text: "翻看试剂架",
        nextScene: "仁济南院-检验科-碘伏",
        effect: updateTime(1)
      },
      {
        text: "去手术供应室",
        nextScene: "仁济南院-手术供应室",
        effect: updateTime(2)
      },
      {
        text: "去太平间",
        nextScene: "仁济南院-太平间",
        effect: updateTime(3)
      },
      {
        text: "离开检验科",
        nextScene: "仁济南院-检验科",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-检验科-手机": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiPhone.png */,
    onEnter: function(vars) {
      if (!vars.hasWangPhone) {
        vars.hasWangPhone = true;
        vars.wangPhoneBattery = Math.max(0, 15 - (vars.dd - 3) * 3);
      }
      vars.positionAfterOperation = "仁济南院-检验科-内部";
      return {};
    },
    text: function(vars) {
      var desc = "你拿起那部手机。屏幕自动亮了起来，电量还剩 " + vars.wangPhoneBattery + "%。\n\
锁屏上停着一条没发出去的动态草稿：\n\
\n\
“我刚从仁济南院拿到脑脊液样本的数据，甲基汞含量超过正常值40倍。这不是病毒，是汞中毒。扩散路径是自来水。”\n\
\n\
发送按钮永远停在了那个界面。";
      if (vars.wangPhoneBattery >= 6) {
        desc += "\n相册里还有一段视频，电量还够，也许能看。";
      } else if (vars.wangPhoneBattery >= 1) {
        desc += "\n相册里还有一段视频，但这点电量估计撑不到播放完。";
      } else {
        desc += "\n屏幕闪了一下就黑了——电量彻底耗尽。得先充上电。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "wangPhoneBattery >= 6",
        text: "播放相册里的视频",
        nextScene: "仁济南院-检验科-手机-视频",
        effect: updateTime(7)
      },
      {
        showCondition: "wangPhoneBattery < 6 && hasCharger",
        text: "用充电器给手机充电",
        nextScene: "仁济南院-检验科-手机-充电",
        effect: updateTime(3)
      },
      {
        text: "收起手机",
        nextScene: "仁济南院-检验科-内部"
      }
    ]
  },

  "仁济南院-检验科-手机-充电": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiPhone.png */,
    onEnter: function(vars) {
      vars.wangPhoneBattery = 15;
      vars.positionAfterOperation = "仁济南院-检验科-内部";
      return {};
    },
    text: "你插上充电器，屏幕重新亮了起来，电量缓缓回升。\n\
一会儿的功夫，电量回到了 15%——足够看一段视频了。",
    choices: [
      {
        text: "播放相册里的视频",
        nextScene: "仁济南院-检验科-手机-视频",
        effect: updateTime(7)
      },
      {
        text: "收起手机",
        nextScene: "仁济南院-检验科-内部"
      }
    ]
  },

  "仁济南院-检验科-手机-视频": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiPhone.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-检验科-内部" } },
    text: "视频开始播放。一个戴银框圆眼镜的年轻女人坐在检验科的台面前，对着镜头说话，语速偏快，有点紧张但逻辑清晰：\n\
\n\
“如果你看到这条视频，说明我可能已经出事了。先说结论：这不是病毒，是甲基汞中毒。\n\
6月24日，黄浦江采样点甲基汞超标近40倍。我反复验证过，不是枪头的问题。\n\
扩散路径是自来水。芜湖那边的一个化工厂封存区泄漏了，含汞废水进了长江，自来水厂取水口在下游……\n\
被咬伤是二次传播。唾液里的汞剂量很低，不会立刻致命，但如果持续喝污染水，血汞会突破重症阈值。\n\
别喝自来水。如果已经喝了——我也不知道该怎么办了。请转发。”\n\
\n\
她侧头听了一下，说：“有人来了，我去看看。”\n\
镜头被随手放在台面上，画面对着天花板，然后中断。",
    choices: [
      {
        text: "放下手机",
        nextScene: "仁济南院-检验科-内部"
      }
    ]
  },

  "仁济南院-检验科-记录本": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiNotebook.png */,
    onEnter: function(vars) {
      if (!vars.hasWangNotebook) {
        vars.hasWangNotebook = true;
      }
      vars.positionAfterOperation = "仁济南院-检验科-内部";
      return {};
    },
    text: "你翻开那本牛皮纸封面的实验记录本。前半部分是标准的实验记录——日期、方法、数据、结论。从6月24日那一页开始，字迹越来越潦草：\n\
\n\
“6/24 黄浦江采样甲基汞2.4ng/L，较基线高出约40倍。可能原因：①采样污染②校准漂移③真实——明日复测。”\n\
\n\
“6/25 复测一致。自采自来水1.8ng/L。不是枪头的问题。妈的。”\n\
\n\
“6/26 暴露实验：蚯蚓4小时停止蠕动。我爸今天早上喝了一杯自来水泡的茶。”（这一行被划掉了，但透过划痕还能辨认）\n\
\n\
“6/27 发B站被删了。意料之中。”\n\
\n\
“6/28 204的大爷敲了我的门，递给我一瓶水——从芜湖老厂区带回来的。测完我手抖了。他都对。去仁济。”\n\
\n\
最后一页：“脑脊液汞浓度超正常值40倍。实锤。”\n\
\n\
翻到背面，她用铅笔画了一只戴博士帽的蚯蚓，旁边写着三个字：“对不起。”",
    choices: [
      {
        text: "合上记录本",
        nextScene: "仁济南院-检验科-内部"
      }
    ]
  },

  "仁济南院-检验科-碘伏": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiLabInside.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-检验科-内部" } },
    text: "你在试剂架上翻找，在最里层的角落找到一瓶还没开封的碘伏。\n\
消毒用的，瓶身标签完好。",
    choices: [
      {
        text: "拿走碘伏",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-检验科-内部",
        effect: { set: { hasIodine: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      {
        text: "算了，不拿",
        nextScene: "仁济南院-检验科-内部"
      }
    ]
  },

  // ==================== 住院部走廊 ====================

  "仁济南院-住院部走廊": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiWard.png */,
    onEnter: function(vars) { vars.currentPos = "住院部"; return {}; },
    text: function(vars) {
      var desc = "住院部的走廊很长，两侧的病房门大多紧闭，有几扇半开着。应急灯忽明忽暗，照着墙上几道暗红色的拖拽痕迹。\n";
      if (vars.dd >= 8) {
        desc += "走廊深处传来密集的脚步声——住院部已经彻底失守了，整条走廊都是游荡的丧尸。\n<span style='color: #ffaa00;'>【提示】住院部已被尸潮占据，无法通行。</span>";
      } else if (vars._renjiWardCleared) {
        desc += "你之前清理过这里的丧尸。现在走廊安静了不少。";
      } else {
        desc += "走廊里有一只丧尸在来回游荡，还没发现你。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "dd < 8 && !_renjiWardCleared",
        text: "悄悄摸过去解决它",
        nextScene: "仁济南院-住院部走廊-战斗"
      },
      {
        showCondition: "dd < 8 && !_renjiSurvivorSaved",
        text: "查看走廊尽头的病房",
        nextScene: "仁济南院-住院部走廊-幸存者",
        effect: updateTime(1)
      },
      {
        showCondition: "dd < 8",
        text: "去护士站",
        nextScene: "仁济南院-护士站",
        effect: updateTime(1)
      },
      {
        showCondition: "dd < 8",
        text: "上楼",
        nextScene: "仁济南院-楼梯-住院楼",
        effect: updateTime(1)
      },
      {
        text: "离开",
        nextScene: function(vars) { return vars._lastScene === "仁济南院-后勤通道" ? "仁济南院-后勤通道" : "仁济南院-急诊大厅"; },
        effect: updateTime(3)
      }
    ]
  },

  "仁济南院-住院部走廊-战斗": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiWard.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿"], 6),
    text: "你贴着墙摸过去，趁它转身的瞬间出手。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝2绿" },
        condition: checkFlashAnswer,
        nextScene: "仁济南院-住院部走廊-胜利",
        elseScene: "仁济南院-住院部走廊-受伤",
        timeout: 10000,
        timeoutScene: "仁济南院-住院部走廊-受伤"
      }
    ]
  },

  "仁济南院-住院部走廊-胜利": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiWard.png */,
    onEnter: { set: { _renjiWardCleared: true } },
    text: "你把它解决了。走廊安静下来。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-住院部走廊"
      }
    ]
  },

  "仁济南院-住院部走廊-受伤": {
    image: "images/hurtByzombie.png",
    onEnter: { add: { strength: -2, mercuryLoad: 10 }, set: { hurtByZombie: true, _renjiWardCleared: true } },
    text: "你被它抓了一下，但最终还是把它打倒了。\n\
伤口火辣辣地疼。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-住院部走廊"
      }
    ]
  },

  "仁济南院-住院部走廊-幸存者": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiWard.png */,
    onEnter: function(vars) { vars.currentPos = "住院部"; return {}; },
    text: function(vars) {
      var desc = "你推开走廊尽头那扇半掩的病房门。\n\
病床后面缩着一个男人，穿着皱巴巴的病号服，双手死死抓着一根输液架。听到门响，他浑身一抖，举起输液架对准你。\n\n";
      if (vars._renjiSurvivorSaved) {
        desc += "你已经和这个人说过话了。";
      } else {
        desc += "“别、别过来！”他声音发颤，“我、我不是那种东西……你正常吗？你是正常人吗？”";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_renjiSurvivorSaved",
        text: "告诉他你没事，问他的情况",
        nextScene: "仁济南院-住院部走廊-幸存者-救"
      },
      {
        text: "离开病房",
        nextScene: "仁济南院-住院部走廊",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-住院部走廊-幸存者-救": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiWard.png */,
    onEnter: { set: { _renjiSurvivorSaved: true, positionAfterOperation: "仁济南院-住院部走廊" } },
    text: "你放低声音，告诉他你是正常人，来医院找药的。\n\
他慢慢放下输液架，眼圈发红：“我、我是这里的护工，爆发那天躲进来的。外面……外面怎么样了？”\n\
\n\
他告诉你，医院里的丧尸很多，尤其是急诊和太平间方向。他还说，检验科那边的灯一直亮着——好像有人在里面待过。\n\
他没有力气跟你走，也不愿离开这间病房。你给他留了句话，让他锁好门。",
    choices: [
      {
        text: "离开病房",
        nextScene: "仁济南院-住院部走廊",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== 手术供应室（高级资源） ====================

  "仁济南院-手术供应室": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiSupply.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-检验科-内部" } },
    text: function(vars) {
      var desc = "你来到手术供应室。这里的器械柜大多还锁着，但有几个抽屉被人撬开了。\n";
      if (vars.hasSutureKit && vars.hasTourniquet && vars.hasAnesthetic) {
        desc += "无菌柜里该拿的都拿了。";
      } else {
        desc += "无菌柜里整整齐齐地摆着几个密封的医疗包。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!hasSutureKit",
        text: "拿一个缝合包",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-手术供应室-缝合包",
        elseScene: "整理整理"
      },
      {
        showCondition: "!hasTourniquet",
        text: "拿一根止血带",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-手术供应室-止血带",
        elseScene: "整理整理"
      },
      {
        showCondition: "!hasAnesthetic",
        text: "拿一支麻醉剂",
        condition: "itemCount < bagVolume",
        nextScene: "仁济南院-手术供应室-麻醉剂",
        elseScene: "整理整理"
      },
      {
        text: "离开",
        nextScene: "仁济南院-检验科-内部",
        effect: updateTime(2)
      }
    ]
  },

  "仁济南院-手术供应室-缝合包": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiSupply.png */,
    onEnter: { set: { hasSutureKit: true, positionAfterOperation: "仁济南院-手术供应室" }, add: { itemCount: 1 } },
    text: "你拿起一个无菌缝合包，里面有缝合针、线和持针器。\n\
有了它，深一点的伤口也能处理。",
    choices: [
      { text: "收好", nextScene: "仁济南院-手术供应室" }
    ]
  },

  "仁济南院-手术供应室-止血带": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiSupply.png */,
    onEnter: { set: { hasTourniquet: true, positionAfterOperation: "仁济南院-手术供应室" }, add: { itemCount: 1 } },
    text: "你拿起一根止血带。\n\
大出血的时候，这东西能救命。",
    choices: [
      { text: "收好", nextScene: "仁济南院-手术供应室" }
    ]
  },

  "仁济南院-手术供应室-麻醉剂": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiSupply.png */,
    onEnter: { set: { hasAnesthetic: true, positionAfterOperation: "仁济南院-手术供应室" }, add: { itemCount: 1 } },
    text: "你拿起一支麻醉剂。\n\
这玩意儿在有些场合，比武器还管用。",
    choices: [
      { text: "收好", nextScene: "仁济南院-手术供应室" }
    ]
  },

  // ==================== 太平间（高危 · 黑皮丧尸） ====================

  "仁济南院-太平间": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMorgue.png */,
    onEnter: function(vars) { vars.currentPos = "太平间"; return {}; },
    text: function(vars) {
      var desc = "太平间在地下，一进来就是一股浓重的、甜腻中带着腐臭的气息——比医院别处都更让人作呕。\n\
冷藏柜的门大多敞着，几具尸体被拖出来横在地上。角落的阴影里，有什么东西在缓慢地挪动。\n\
太平间的另一头有一扇门，通向医院的后勤区。\n";
      if (vars._morgueCleared) {
        desc += "你上次来的时候，已经处理掉了这里的东西。";
      } else if (vars._morgueVentOn) {
        desc += "墙上的通风系统在嗡嗡地转，那股甜腻的气味淡了不少。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_morgueCleared && _morgueVentOn",
        text: "等气味散尽，进去处理那只丧尸",
        nextScene: "仁济南院-太平间-黑皮丧尸"
      },
      {
        showCondition: "!_morgueCleared && !_morgueVentOn && hasGasMask && maskRemainingUses > 0",
        text: "戴上防毒面具进去",
        nextScene: "仁济南院-太平间-戴面具",
        effect: updateTime(1)
      },
      {
        showCondition: "!_morgueCleared && !_morgueVentOn && (!hasGasMask || maskRemainingUses <= 0)",
        text: "靠近那边的墙看看",
        nextScene: "仁济南院-太平间-通风",
        effect: updateTime(1)
      },
      {
        showCondition: "!hasMercuryReport",
        text: "翻找角落的柜子",
        nextScene: "仁济南院-太平间-报告",
        effect: updateTime(2)
      },
      {
        text: "去后勤通道",
        nextScene: "仁济南院-后勤通道",
        effect: updateTime(3)
      },
      {
        text: "去检验科",
        nextScene: "仁济南院-检验科-内部",
        effect: updateTime(3)
      }
    ]
  },

  "仁济南院-太平间-通风": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMorgue.png */,
    onEnter: { set: { positionAfterOperation: "仁济南院-太平间" } },
    text: "你贴着墙，避开那股浓烈的气味，看到墙上有一个通风系统的控制面板。上面有一个绿色的按钮。",
    choices: [
      {
        text: "按下按钮",
        nextScene: "仁济南院-太平间-通风开启",
        effect: updateTime(1)
      },
      {
        text: "不按了",
        nextScene: "仁济南院-太平间"
      }
    ]
  },

  "仁济南院-太平间-通风开启": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMorgue.png */,
    onEnter: { set: { _morgueVentOn: true, positionAfterOperation: "仁济南院-太平间" } },
    text: "你按下按钮。头顶的通风管道嗡嗡地响了起来，新鲜的空气灌了进来，那股甜腻的尸臭被一点点冲散。\n\
你等了一会儿，直到能正常呼吸为止。",
    choices: [
      {
        text: "进去处理那只丧尸",
        nextScene: "仁济南院-太平间-黑皮丧尸"
      }
    ]
  },

  "仁济南院-太平间-戴面具": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMorgue.png */,
    onEnter: { add: { maskRemainingUses: -1 }, set: { positionAfterOperation: "仁济南院-太平间" } },
    text: "你戴上防毒面具，过滤后的空气带着一股活性炭的干涩味。\n\
你朝角落的阴影走去。",
    choices: [
      {
        text: "处理那只丧尸",
        nextScene: "仁济南院-太平间-黑皮丧尸"
      }
    ]
  },

  "仁济南院-太平间-黑皮丧尸": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMorgue.png */,
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄", "白"], 8),
    text: "阴影里的东西站起来了——一只皮肤黑得发亮的丧尸。它的身体像覆盖了一层干涸的黑色皮革，在应急灯下泛着诡异的光。\n\
它朝你扑来。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝2绿1黄1白" },
        condition: checkFlashAnswer,
        nextScene: "仁济南院-太平间-黑皮丧尸-胜利",
        elseScene: "仁济南院-太平间-黑皮丧尸-受伤",
        timeout: 14000,
        timeoutScene: "仁济南院-太平间-黑皮丧尸-受伤"
      }
    ]
  },

  "仁济南院-太平间-黑皮丧尸-胜利": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMorgue.png */,
    onEnter: { set: { _morgueCleared: true } },
    text: "你把它放倒了。那层黑色的皮比想象中更硬，但你最终还是解决了它。\n\
它瘫在地上，不再动弹。太平间重新安静下来。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-太平间"
      }
    ]
  },

  "仁济南院-太平间-黑皮丧尸-受伤": {
    image: "images/hurtByzombie.png",
    onEnter: { add: { strength: -3, mercuryLoad: 15 }, set: { hurtByZombie: true, _morgueCleared: true } },
    text: "它的力气大得惊人，你被它撞在墙上，肩膀一阵剧痛。但你还是拼尽全力把它解决了。\n\
它瘫在地上不动了。你靠着墙，剧烈地喘着气。",
    choices: [
      {
        text: "继续",
        nextScene: "仁济南院-太平间"
      }
    ]
  },

  "结局-仁济-尸潮围困": {
    image: "images/zombieWaveSmashYouIntoPieces.png",
    text: "你朝着高架的方向冲去，想要离开这家医院。\n\
但外面的尸潮比你想象中更密。你刚冲出浦锦路，就被从四面八方涌来的丧尸吞没——它们早已把这家医院围得水泄不通，就等着有人从里面出来。\n\
你在震耳欲聋的嘶吼声中被撕碎。\n\
\n—— 结局：仁济围困 ——",
    style: "color: #ff4444; font-weight: bold;"
  },

  "仁济南院-太平间-报告": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMorgue.png */,
    onEnter: function(vars) {
      if (!vars.hasMercuryReport) {
        vars.hasMercuryReport = true;
      }
      vars.positionAfterOperation = "仁济南院-太平间";
      return {};
    },
    text: "你翻找角落的柜子，在最里层的档案格里摸到一个牛皮纸袋。\n\
打开一看，是一份检测报告，落款是“仁济医院南院 检验科”。报告上是一串数据：\n\
\n\
“脑脊液 甲基汞浓度：正常值上限的 40 倍。结论：急性甲基汞中毒。”\n\
\n\
报告的一角有一个手写的批注，字迹潦草，只有三个字：“实锤。”",
    choices: [
      {
        text: "收起报告",
        nextScene: "仁济南院-太平间"
      }
    ]
  },

  // ==================== 冗余探索区（环境叙事 · 不承载关键剧情） ====================

  "仁济南院-门诊大厅": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiHall.png */,
    onEnter: function(vars) { vars.currentPos = "门诊大厅"; return {}; },
    text: "门诊楼的大厅比急诊还要空旷。挂号机全部黑屏，排队用的伸缩栏杆东倒西歪，地上散落着病历本、医保卡和几张撕碎的处方单。\n\
缴费窗口的玻璃碎了一角，里面搁着一张没坐过人的转椅。\n\
大厅一侧有个带玻璃窗口的房间，玻璃上贴着价目表；另一侧有扇门半掩着，门边贴着黄色的警告标志。\n\
墙上贴着褪色的科室索引——大部分科室的门都锁着。",
    choices: [
      {
        text: "看看那个有玻璃窗口的房间",
        nextScene: "仁济南院-门诊药房",
        effect: updateTime(1)
      },
      {
        text: "看看那扇贴着警告标志的门",
        nextScene: "仁济南院-影像科",
        effect: updateTime(1)
      },
      {
        text: "去电梯厅",
        nextScene: "仁济南院-电梯厅",
        effect: updateTime(1)
      },
      {
        text: "上楼",
        nextScene: "仁济南院-楼梯-门诊楼低",
        effect: updateTime(1)
      },
      {
        text: "去急诊大厅",
        nextScene: "仁济南院-急诊大厅",
        effect: updateTime(2)
      },
      {
        text: "从门口离开",
        nextScene: "仁济南院-门诊大门",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-电梯厅": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiElevator.png */,
    onEnter: function(vars) { vars.currentPos = "电梯厅"; return {}; },
    text: "门诊楼的电梯厅里，两部电梯的门都开着，轿厢停在1楼。按钮面板上，几层楼的灯还亮着，只有5楼以上全灭了。\n\
    你正要进去，头顶的应急灯闪了闪——这电梯也不知道还靠不靠得住。",
    choices: [
      {
        text: "坐电梯去2楼（输液大厅）",
        nextScene: "仁济南院-输液大厅",
        effect: updateTime(1)
      },
      {
        text: "坐电梯去4楼（中医科）",
        nextScene: "仁济南院-中医科",
        effect: updateTime(2)
      },
      {
        text: "去门诊大厅",
        nextScene: "仁济南院-门诊大厅",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-影像科": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiRadiology.png */,
    onEnter: function(vars) { vars.currentPos = "影像科"; return {}; },
    text: "影像科的门半掩着。CT室的金属门虚掩，门缝里透出一点微光。X光片散落在地上，踩上去嘎吱作响。\n\
操作台旁瘫着一个穿白大褂的人，已经死了——胸口还别着放射科的胸牌。\n\
墙上贴着一张辐射警告标志，红色的三叶形图案在昏暗里格外醒目。",
    choices: [
      {
        text: "去门诊大厅",
        nextScene: "仁济南院-门诊大厅",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-输液大厅": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiInfusion.png */,
    onEnter: function(vars) { vars.currentPos = "输液大厅"; return {}; },
    text: "二楼的输液大厅里，成排的输液椅还保持着原样，吊瓶架倒了一地，药液已经干涸。\n\
地上散落着几样小东西——一个塑料小汽车、一只掉了鞋带的小鞋。\n\
天花板的吊扇还在慢慢转，发出有节奏的吱呀声，像是什么东西在一下一下地敲着。\n\
大厅一侧的连廊通向急诊医技楼。",
    choices: [
      {
        text: "穿过连廊去急诊楼",
        nextScene: "仁济南院-急诊观察室",
        effect: updateTime(2)
      },
      {
        text: "坐电梯下楼",
        nextScene: "仁济南院-电梯厅",
        effect: updateTime(1)
      },
      {
        text: "上楼",
        nextScene: "仁济南院-楼梯-门诊楼高",
        effect: updateTime(1)
      },
      {
        text: "下楼",
        nextScene: "仁济南院-楼梯-门诊楼低",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-中医科": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiTCM.png */,
    onEnter: function(vars) { vars.currentPos = "中医科"; return {}; },
    text: "四楼的中医坐诊区。墙上挂着一幅针灸穴位图，几根银针还插在图上的穴位上。诊桌上摊着几本翻开的病历，笔迹工整，像是坐诊的人走时很从容。\n\
坐诊区两侧各有一扇门——一侧是针灸推拿室，一侧是中草药房。",
    choices: [
      {
        text: "去针灸推拿室",
        nextScene: "仁济南院-针灸推拿",
        effect: updateTime(1)
      },
      {
        text: "去中草药房",
        nextScene: "仁济南院-中草药房",
        effect: updateTime(1)
      },
      {
        text: "坐电梯下楼",
        nextScene: "仁济南院-电梯厅",
        effect: updateTime(2)
      },
      {
        text: "下楼",
        nextScene: "仁济南院-楼梯-门诊楼高",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-针灸推拿": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiAcupuncture.png */,
    onEnter: function(vars) { vars.currentPos = "针灸推拿"; return {}; },
    text: "针灸推拿室里，几张治疗床并排摆着，床头柜上放着没拆封的银针盒和一排艾灸条。\n\
空气里残留着一股淡淡的艾草焦香，像是有人在这里一直坐到很晚才离开。",
    choices: [
      {
        text: "去中草药房",
        nextScene: "仁济南院-中草药房",
        effect: updateTime(1)
      },
      {
        text: "去中医科",
        nextScene: "仁济南院-中医科",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-中草药房": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiHerbalRoom.png */,
    onEnter: function(vars) { vars.currentPos = "中草药房"; return {}; },
    text: function(vars) {
      var desc = "中草药房里，一整面墙的中药柜抽屉半开着，草药散落一地，有的已经发了霉。柜台上摆着一杆戥子和一个铜碾槽。\n";
      if (!vars._renjiHerbalTaken) {
        desc += "柜台角落里有一包没拆封的花茶，包装上印着“清肝明目”。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_renjiHerbalTaken",
        text: "泡一壶花茶喝下（体力+1）",
        nextScene: "仁济南院-中草药房-喝花茶"
      },
      {
        text: "去中医科",
        nextScene: "仁济南院-中医科",
        effect: updateTime(1)
      },
      {
        text: "去针灸推拿室",
        nextScene: "仁济南院-针灸推拿",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-中草药房-喝花茶": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiHerbalRoom.png */,
    onEnter: { set: { _renjiHerbalTaken: true }, add: { strength: 1 } },
    text: "你抓了一把花茶放进杯子里，接了点热水泡开。药香混着花香升腾起来，在空荡荡的中草药房里显得格外安宁。你捧着杯子慢慢喝了几口，温热的茶水流进胃里，疲惫的身体舒缓了不少。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "仁济南院-中草药房" }
    ]
  },

  "仁济南院-急诊观察室": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiObservation.png */,
    onEnter: function(vars) { vars.currentPos = "急诊观察室"; return {}; },
    text: "2楼是一间观察室。几张观察床上的被子凌乱，输液架上还挂着半空的药瓶。\n\
一台监护仪的屏幕裂了，但电源灯还在一闪一闪。\n\
床头柜上放着半瓶没喝完的水——应该是有人慌乱中留下的。\n\
观察室尽头有一条连廊，通向门诊楼的方向。",
    choices: [
      {
        text: "穿过连廊去门诊楼",
        nextScene: "仁济南院-输液大厅",
        effect: updateTime(2)
      },
      {
        text: "下楼",
        nextScene: "仁济南院-楼梯-急诊楼",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-护士站": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiNurseStation.png */,
    onEnter: function(vars) { vars.currentPos = "护士站"; return {}; },
    text: function(vars) {
      var desc = "护士站的台面一片狼藉，电脑黑着屏，病历架倒了一排，散落的病历纸被踩得脏兮兮。\n\
墙上那块交班的白板上还留着字——“6/28 夜班 3人”，字迹歪歪扭扭。\n";
      if (!vars._renjiGlucoseTaken) {
        desc += "台子下面的小冰箱半开着，里面躺着一瓶没拆封的葡萄糖。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_renjiGlucoseTaken",
        text: "喝掉那瓶葡萄糖（体力+1）",
        nextScene: "仁济南院-护士站-喝葡萄糖"
      },
      {
        text: "去住院部走廊",
        nextScene: "仁济南院-住院部走廊",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-护士站-喝葡萄糖": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiNurseStation.png */,
    onEnter: { set: { _renjiGlucoseTaken: true }, add: { strength: 1 } },
    text: "你拧开那瓶葡萄糖的铝盖，仰头灌了几口。甜腻的糖水顺着喉咙滑下去——太久没尝到甜味了，你几乎要被这熟悉的味道呛到。你靠在护士站台边缓了缓，感觉体力恢复了一些。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "仁济南院-护士站" }
    ]
  },

  "仁济南院-楼梯-住院楼": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiStairs.png */,
    onEnter: function(vars) { vars.currentPos = "楼梯间"; return {}; },
    text: "你来到住院大楼的楼梯间。楼梯比门诊楼的窄，扶手上包着防滑胶垫，墙根有几道干涸的血迹。\n\
往上走了几层，楼层指示灯早已熄灭，你只能靠数台阶来记层数。越往上，走廊越安静——上面是特需病区。",
    choices: [
      {
        text: "上楼",
        nextScene: "仁济南院-特需病房",
        effect: updateTime(2)
      },
      {
        text: "下楼",
        nextScene: "仁济南院-住院部走廊",
        effect: updateTime(2)
      }
    ]
  },

  "仁济南院-特需病房": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiVIPWard.png */,
    onEnter: function(vars) { vars.currentPos = "特需病房"; return {}; },
    text: function(vars) {
      var desc = "这里是特需病房，走廊比普通病区宽敞，墙面上是暖色调的护墙板。\n\
你推开一间没上锁的病房——独立卫浴，窗明几净，床头柜上放着一个相框，照片里一家三口笑得正开心。\n\
窗外的城市灰蒙蒙一片，远处高架的轮廓在暮色里若隐若现。\n\
床头的抽屉里有一封没写完的信，只写了个开头：“亲爱的，如果你们能收到这封信……”\n";
      if (!vars._renjiDrinkTaken) {
        desc += "床头柜的小冰箱里，还放着一瓶没开封的功能饮料——特需病房的待遇，连这种时候都透着讲究。";
      }
      return desc;
    },
    choices: [
      {
        showCondition: "!_renjiDrinkTaken",
        text: "喝掉那瓶功能饮料（体力+1）",
        nextScene: "仁济南院-特需病房-功能饮料"
      },
      {
        text: "下楼",
        nextScene: "仁济南院-楼梯-住院楼",
        effect: updateTime(2)
      }
    ]
  },

  "仁济南院-特需病房-功能饮料": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiVIPWard.png */,
    onEnter: { set: { _renjiDrinkTaken: true }, add: { strength: 1 } },
    text: "你拧开那瓶功能饮料，喝了几口——冰凉的、带着人工甜味的液体顺着喉咙滑下去，是你这几天喝到的最像样的东西。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】体力+1，当前体力：{strength}。</span>",
    choices: [
      { text: "继续", nextScene: "仁济南院-特需病房" }
    ]
  },

  // ==================== 楼梯间（连接楼层 · 可上可下） ====================

  "仁济南院-楼梯-急诊楼": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiStairs.png */,
    onEnter: function(vars) { vars.currentPos = "楼梯间"; return {}; },
    text: "你来到急诊医技楼的楼梯间。水泥台阶上散落着碎玻璃和几团染血的纱布，墙角堆着几把扫帚。\n往上走一层是二楼，往下回到大厅。",
    choices: [
      {
        text: "上楼",
        nextScene: "仁济南院-急诊观察室",
        effect: updateTime(1)
      },
      {
        text: "下楼",
        nextScene: "仁济南院-急诊大厅",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-楼梯-门诊楼低": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiStairs.png */,
    onEnter: function(vars) { vars.currentPos = "楼梯间"; return {}; },
    text: "你来到门诊楼的楼梯间。台阶很宽，扶手上落了灰——好几天没人擦过了。往上一层是二楼。",
    choices: [
      {
        text: "上楼",
        nextScene: "仁济南院-输液大厅",
        effect: updateTime(1)
      },
      {
        text: "下楼",
        nextScene: "仁济南院-门诊大厅",
        effect: updateTime(1)
      }
    ]
  },

  "仁济南院-楼梯-门诊楼高": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiStairs.png */,
    onEnter: function(vars) { vars.currentPos = "楼梯间"; return {}; },
    text: "你继续往上走。楼梯间越往上越暗，灯管有一截没一截地亮着。往上走两层是四楼。三楼的路被堵住了。",
    choices: [
      {
        text: "上楼",
        nextScene: "仁济南院-中医科",
        effect: updateTime(2)
      },
      {
        text: "下楼",
        nextScene: "仁济南院-输液大厅",
        effect: updateTime(2)
      }
    ]
  }
});
