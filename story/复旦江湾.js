// ==================== 复旦江湾（忻老师章节） ====================
// 北线·建平延伸章节：王知筠线完结（环境科学楼305）+ 忻老师家（2×2 分支矩阵 + 药丸延迟引信）。
// 方案：docs/区域方案-复旦江湾.md；剧情蓝本：忻老师故事线.md（仓库根目录）。
// 阶段3（2026-09-24）：全部正文落地。a链双窗口（305出示/返程车程出示）、b链叫人电话、
//   楼道QTE链（dd加压）、④全歼闪色（3色6闪+combatDrain）、药丸延迟引信（整理整理无提示给药）。
// ⚠️ 全章 currentArea = "复旦"（家侧也是——章中天黑须落复旦防御分支"过夜-复旦-车内"，勿改回建平）。
// 入口：建平-后门辅路上车（hh<14）；出口：全分支 → 回建平-车程 → 建平-校园门口（hasCar=true）。
// 爆线公式（3F走廊路由+高三14班软信号共用，建平中学.js 的 jpXinFuse）：
//   ③(_xinOutcome==3) 次日 dd > _xinOutcomeDay 爆；④ 隔日 dd > _xinOutcomeDay+1 爆；不给药才炸。

// b 链叫人选项（挂 返程车程/教师小区门口/楼道 三处；窗口=楼道口截止，进家中即关）
// 只有全家妈妈遗物原机（_phoneOrigin=="own"）才有同学微信；通话 -5 电量，一次性。
function fdCallOption() {
  return {
    showCondition: "_phoneOrigin == 'own' && phoneBattery > 0 && !_studentsCalled",
    text: "给同学打个电话（电量 {phoneBattery}%）",
    nextScene: "复旦江湾-电话叫人",
    effect: updateTime(3, { set: { _studentsCalled: true }, add: { phoneBattery: -5 } })
  };
}

// 尸潮基线文案（S20 外环本周崩溃中，设计细节.md:713；纯文案，不动机变量）
function fdZombieBaseline(vars) {
  if (vars.dd >= 5) {
    return "更远处的林荫道深处，不成片的低吼一阵一阵地涌过来，像潮水找不着岸。";
  }
  if (vars.dd === 4) {
    return "视线里能数出五六只，散在教学楼之间慢慢挪。风里飘着一股说不清的腐味。";
  }
  return "只有远处花坛边两只游荡的影子，走得慢吞吞的。";
}

Object.assign(storyData, {

  // ==================== 江湾侧 ====================

  "复旦江湾-校门": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/复旦江湾/校门.webp */,
    onEnter: function(vars) {
      vars.currentArea = "复旦";
      vars.currentPlace = "复旦江湾";
      vars.currentPos = "校门";
      vars.showZombies = true;
      return {};
    },
    text: function(vars) {
      return "车在校区门口停下。铁艺校门敞着，门卫室的玻璃碎了一地。忻老师熄了火，没有马上下车，先隔着挡风玻璃朝里面看了很久。\n\
“到了。先去环境科学楼——王老师应该在三楼。”\n"
        + fdZombieBaseline(vars)
        + "\n他把车钥匙揣回口袋：“车放门口。走吧。”";
    },
    choices: [
      { text: "跟他走进校区", nextScene: "复旦江湾-中央草坪", effect: updateTime(5) }
    ]
  },

  "复旦江湾-中央草坪": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/复旦江湾/中央草坪.webp */,
    onEnter: function(vars) {
      vars.currentPos = "中央草坪";
      vars.showZombies = true;
      return {};
    },
    text: function(vars) {
      var desc = "一大片草坪铺在校区中央，几条林荫道向四周的学院楼延伸。东边那栋玻璃幕墙的是微电子楼，反着上午的光；西边一排红砖小楼，是材料、环境几个学院。";
      if (vars._visit["复旦江湾-环境科学楼-305"] > 0) {
        desc += "\n忻老师站在你身侧，轻声说：“看完了？——那，去我家吧。”";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [
        { text: "往西走，去材料楼", nextScene: "复旦江湾-材料楼-门前", effect: updateTime(8) },
        { text: "穿过草坪，去环境科学楼", nextScene: "复旦江湾-环境科学楼-门厅", effect: updateTime(8) },
        { text: "回校门", nextScene: "复旦江湾-校门", effect: updateTime(5) }
      ];
      // 305 看完才解锁返程（章节不可中途弃线，忻老师不会空手回家）
      if (vars._visit["复旦江湾-环境科学楼-305"] > 0) {
        cs.push({ text: "上车，陪忻老师回家", nextScene: "复旦江湾-返程车程", effect: updateTime(30) });
      }
      return cs;
    }
  },

  "复旦江湾-材料楼-门前": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/复旦江湾/材料楼门前.webp */,
    onEnter: function(vars) {
      vars.currentPos = "材料楼";
      return {};
    },
    text: "材料科学楼门前立着一块介绍铭牌，玻璃面上积了层薄灰。研学那年，全班就是在这栋楼前拍的合影——你还记得摄影师喊“靠拢一点”的时候，忻老师站在最边上，比了个夸张的剪刀手。\n楼里的大厅黑着，但还能进。",
    choices: [
      { text: "进大厅看看那排展板", showCondition: function(v) { return !v.personalMemorySet.has("介孔材料"); }, nextScene: "复旦江湾-材料楼-展板", effect: updateTime(2) },
      { text: "回到草坪", nextScene: "复旦江湾-中央草坪", effect: updateTime(8) }
    ]
  },

  // 研学个人记忆 pickup（作者拍板：介孔材料展板，与王知筠无关）
  "复旦江湾-材料楼-展板": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/材料楼展板.webp */,
    onEnter: function(vars) { gainMemory(vars, "介孔材料", "personal"); return {}; },
    text: [
      "大厅里立着一排介绍院史的展板。你在其中一块前停了下来——「介孔材料」，配着一张蜂窝状的示意图。",
      "展板上写，一粒米大小的介孔粉末，里面的孔道全部摊开，面积抵得上半个篮球场。肉眼看不见的地方，藏着最大的世界。",
      "那年研学，你就在这块展板前站了很久，差点掉队。忻老师在队伍前面喊：“看什么看，走了！”你应了一声，脚下没动，把示意图上每一个箭头都看完才走。",
      "展板还在。蜂窝状的示意图上积了一层细灰——半个篮球场，安安静静地藏在一粒米里面。",
      "<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得记忆[介孔材料]</span>"
    ],
    choices: [
      { text: "退回楼外", nextScene: "复旦江湾-材料楼-门前", effect: updateTime(1) }
    ]
  },

  "复旦江湾-环境科学楼-门厅": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/环境楼门厅.webp */,
    onEnter: function(vars) {
      vars.currentPos = "环境科学楼";
      return {};
    },
    text: function(vars) {
      var desc = "环境科学楼比材料楼旧一些，门口的电子屏黑着。门厅里积着薄灰，公告栏上还钉着六月中旬的讲座海报。楼梯向上拐向三楼，忻老师先你半步踏上台阶：“305，走廊尽头。”";
      // 挂彩后重访：tell（下楼时按小臂）
      if (vars._xinScratched && (vars._visit["复旦江湾-环境科学楼-门厅"] || 0) > 1) {
        desc += "\n你注意到，他扶楼梯扶手一直用的右手——左边的袖口，往下坠着。";
      }
      return desc;
    },
    choices: [
      { text: "上三楼，去 305", nextScene: function(v) { return !v._xinScratched ? "复旦江湾-环境科学楼-楼梯" : "复旦江湾-环境科学楼-305"; }, effect: updateTime(4) },
      { text: "出楼，回草坪", nextScene: "复旦江湾-中央草坪", effect: updateTime(6) }
    ]
  },

  // 江湾挂彩 beat（作者拍板#5：暗处贴墙一只，他护玩家、隔袖小臂挂彩；玩家半目睹；set _xinScratched）
  "复旦江湾-环境科学楼-楼梯": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/环境楼楼梯.webp */,
    onEnter: function(vars) {
      vars.currentPos = "环境科学楼楼梯";
      vars._xinScratched = true;
      return {};
    },
    text: [
      "楼梯间比门厅暗得多。你们一前一后往上走，转角处的窗外，树影把光切成一条一条的。",
      "二楼转三楼的平台上贴着墙站着一只。它一直贴在那儿，像一块剥落的墙皮——直到你们走到最后两级台阶，它才动。",
      "它扑向走在前面的你。忻老师一把把你拽到身后，反手抡起了转角处的灭火器。红色的罐体砸在那东西的太阳穴上，闷响一声，它歪着栽进墙角，不动了。",
      "“没事吧？”你问他。他拍了拍手上的灰：“没事。走。”楼梯间很暗，你没看清他垂在身侧的左手——袖口那里，破了一道口子。"
    ],
    choices: [
      { text: "继续上三楼", nextScene: "复旦江湾-环境科学楼-305", effect: updateTime(2) }
    ]
  },

  "复旦江湾-环境科学楼-305": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/环境楼305.webp */,
    onEnter: function(vars) {
      vars.currentPos = "305";
      return {};
    },
    text: function(vars) {
      var segs = [
        "305 的门虚掩着。忻老师敲了两下：“王老师？”没有人应。",
        "办公室不大，两张办公桌对着放。靠窗那张桌上，一盆绿萝半死不活地垂着叶子，显示屏黑着，屏座下压着一张便利贴——“今天蚯蚓怎么样了？”字迹圆圆的，末尾画了个笑脸。",
        "另一张桌上，培养皿摞成几摞，标签分三类：活体、待处理、已牺牲。窗台上放着一件没拆的快递，牛皮纸包装压得有点皱，发货单上是《寂静的春天》新译本。",
        "白板上还留着板书，一角写着“蚯蚓 vs 土壤：谁在给谁打工？”。抽屉半开着，里面是几页打印纸——B站创作中心的后台截图，最新一期视频的标题后面，跟着一行小字：定时发布已取消。",
        "你站在门口，忽然想起来——研学那年，你就是站在这间办公室门口听她讲过课。她把一捧土举到光里，说每一把土里都住着一座城市。",
        "忻老师在办公室里慢慢走了一圈，什么也没碰。最后他停在窗边，说：“她不在这儿了。走吧。”"
      ];
      // a₁ 之后重访：两人已知同一件事，空气变了
      if (vars._xinKnowsTruth && (vars._visit["复旦江湾-环境科学楼-305"] || 0) > 1) {
        segs[5] = "办公室还是那样。只是现在，你们两个知道了同一件事——绿萝、便利贴、培养皿，样样都沉了一层。";
      }
      return segs;
    },
    choices: [
      { text: "拉开抽屉，看看那张合影", nextScene: "复旦江湾-环境科学楼-305-合影", effect: updateTime(2) },
      { text: "把王知筠的手机拿给他看", showCondition: "hasWangPhone && wangPhoneBattery >= 6 && !_xinKnowsTruth", nextScene: "复旦江湾-环境科学楼-305-出示", effect: updateTime(3) },
      { text: "离开办公室", nextScene: "复旦江湾-环境科学楼-门厅", effect: updateTime(2) }
    ]
  },

  "复旦江湾-环境科学楼-305-合影": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/课题组合影.webp */,
    imageZoom: true,
    text: "你从抽屉里拿出那张合影。2026 年 3 月，课题组的春天。王知筠站在第二排最左边，笑得比谁都用力，手里还举着一只培养皿。\n照片背面有一行铅笔字：“春天来了，蚯蚓都醒了。”",
    choices: [
      { text: "把合影放回去", nextScene: "复旦江湾-环境科学楼-305", effect: updateTime(1) }
    ]
  },

  // a₁ 出示（拍板：主动·情报·双刃齐下——点燃救家人 urgency）
  "复旦江湾-环境科学楼-305-出示": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/环境楼305.webp（复用） */,
    onEnter: function(vars) { vars._xinKnowsTruth = true; return {}; },
    text: [
      "你把手机递过去：“忻老师，你看看这个。”",
      "他起先没接。僵持了几秒，他把手机拿过去，点亮屏幕——是王知筠留下的那段视频，还有检测数据。他看得很慢，视频看完，又把数据从头翻到尾。",
      "办公室里静了很久。窗外一只鸟叫了两声，飞走了。",
      "“水。”他终于开口，声音很平，“不是被抓的人会变。是水。”",
      "他抬起头看你。你在他脸上同时看到两样东西——像放下一块石头的轻松，和一块更大的石头压上来的绝望。“我家里那口壶，从来不断水的。她们喝了五天了。”",
      "你在楼梯上好像看见过他袖口有道破口。你张了张嘴，还没想好怎么说。"
    ],
    choices: [
      { text: "先把这里看完", nextScene: "复旦江湾-环境科学楼-305", effect: updateTime(1) }
    ]
  },

  // ==================== 返程（常驻枢纽：b 窗口开启 + 挂彩透露 + a₂ 第二窗口） ====================

  "复旦江湾-返程车程": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/返程车程.webp */,
    onEnter: function(vars) {
      vars.currentPos = "返程车上";
      return {};
    },
    text: function(vars) {
      var first = (vars._visit["复旦江湾-返程车程"] || 0) <= 1;
      if (!first) {
        var short = "堵死的路口还没通。引擎怠速的震动从脚底传上来。";
        short += vars._xinKnowsTruth ? "\n忻老师把袖口放了下来，两只手搭在方向盘上。" : "\n那串车钥匙还搁在排挡上，谁都没去碰。";
        return short;
      }
      var segs = [
        "车驶出校区，忻老师把方向打向东。来时他一路找话，回去的路上，他一句也不说了。",
        "“你家在哪？”你问。“崮山路旁边，教师小区，3 号楼。”他答得很快，像早就等着这一问。窗外，前面的路口堵死了——三四辆车追成一串，消防栓被撞断了，水漫了一地。"
      ];
      if (vars._xinKnowsTruth) {
        // 三态之 a₁ 已给：平静版（大叔线同构——他欠同行者一句实话）
        segs.push("他熄了火等着，忽然卷起左边的袖子，把小臂凑到车窗的光里给你看——三道抓痕，结着暗红的痂。“江湾楼梯上那只。我这不是第一次瞒人。”他看着你，很平静：“按那位姑娘的数据，我还有时间。到你家门口之前，你该知道你跟的是什么。”");
      } else {
        // !a：绝望版交待后事（无论有无手机，a₂/空口安慰在此分岔）
        segs.push("等堵车的空当，他忽然卷起左边的袖子——三道抓痕，结着暗红的痂。“江湾楼梯上那只。”他说得很慢，“我是个死人了。电影里都是这么演的——被抓，几个钟头，就完。”他把车钥匙从口袋里掏出来，搁在了排挡上：“到了楼下你先走。车归你。”");
      }
      return segs;
    },
    choices: function(vars) {
      var cs = [];
      cs.push(fdCallOption());
      // a₂ 反应式出示（赦免向）：他刚给自己判完死刑，出示="你不是死刑"
      cs.push({
        text: "把王知筠的手机拿给他看",
        showCondition: "hasWangPhone && wangPhoneBattery >= 6 && !_xinKnowsTruth",
        nextScene: "复旦江湾-返程车程-出示",
        effect: updateTime(3)
      });
      // 空口安慰陷阱（有无手机都可见）：教玩家"只有一张说话的脸+确凿数字能动他"
      cs.push({
        text: "“被抓不一定会变的，我就是带着伤活下来的”",
        showCondition: "!_xinKnowsTruth",
        nextScene: "复旦江湾-返程车程-空口安慰"
      });
      cs.push({ text: "等前面的车挪动，继续赶路", nextScene: "建平-教师小区门口", effect: updateTime(25) });
      return cs;
    }
  },

  // a₂ 出示（拍板：反应式·赦免——水的那半在这里=「他们也还来得及」）
  "复旦江湾-返程车程-出示": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/返程车程.webp（复用） */,
    onEnter: function(vars) { vars._xinKnowsTruth = true; return {}; },
    text: [
      "你把王知筠的手机掏出来，递到他眼前：“你先看看这个，再决定自己算不算死人。”",
      "他盯着那块亮起来的屏幕，很久没有伸手。暮色从车窗斜进来，手机屏的光打在他脸上，也打在他卷起的袖口上。",
      "视频看完，数据从头翻到尾。他把手机还给你，用两只手，像还一件很重的东西。",
      "“不是被抓。”他说，“是水。”他低头看了看小臂上那三道痂，忽然笑了一下，比哭还难看：“那我这条命，是从水手里捡回来的。”",
      "“我家里那口壶……”他说到一半停住了。这一次，后半句是往前的：“她们也还来得及。对吧？”你没有回答。他也没再问，把排挡上的钥匙收了回去，重新发动了车。"
    ],
    choices: [
      { text: "继续赶路", nextScene: "建平-教师小区门口", effect: updateTime(25) }
    ]
  },

  "复旦江湾-返程车程-空口安慰": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/返程车程.webp（复用） */,
    text: "你说：“被抓不一定会变的。你看我——我就是带着伤活下来的。”\n他从后视镜里看了你一眼，摇了摇头：“电影里不是这么演的。”顿了顿，又说：“……你们小孩，命硬。”\n他没再多说。排挡上的钥匙，还搁在那儿。",
    choices: [
      { text: "回到车上等着", nextScene: "复旦江湾-返程车程" }
    ]
  },

  // b 链电话 beat（刘冠宇台词挂 !_liuCorpse 守卫——死人不给台词）
  "复旦江湾-电话叫人": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/返程车程.webp（复用） */,
    text: function(vars) {
      if (!vars._liuCorpse) {
        return "你翻出同学群，把地址报了过去。电话很快回了过来，接起来却是刘冠宇的声音：“我腿就不去了——蔡镜晓和彭奕宸刚下楼推车。你等着，他们骑车快。”\n听筒那边一阵椅子腿刮地的动静，然后是蔡镜晓的声音：“收到！二十分钟！”";
      }
      return "你翻出同学群，把地址报了过去。电话几乎立刻回了过来，是蔡镜晓：“收到！我和彭奕宸刚下楼推车——二十分钟！”背景里有车锁落开的咔哒声。\n你捏着手机站了两秒。帮忙的人，还是来了。";
    },
    choices: [
      { text: "挂了电话", nextScene: function(v) { return v._lastScene; } }
    ]
  },

  // ==================== 家侧（高潮） ====================

  // 教师小区（忻老师家·印象/解锁双态节点）——挂在建平外部路网（建平-校园门口有步行入口），定义在本文件。
  // 正常游玩：路过印象（锁着的铁门/空岗亭），守卫拦深入——伏笔 + “学生骑车可达”的地理逻辑。
  // 复旦章节（_teacherLeft && _xinOutcome == 0）：忻老师开门禁，解锁深入。
  // ⚠️ onEnter 不设 currentArea：从建平侧步行来 = 建平中学（夜落宿舍），从章节车程来 = 复旦（夜落防御分支），两侧都对。
  "建平-教师小区门口": {
    outdoor: true,
    image: "images/placeholder.png" /* TODO: images/建平/教师小区门口.webp */,
    onEnter: function(vars) {
      vars.currentPos = "教师小区门口";
      return {};
    },
    text: function(vars) {
      if (vars._teacherLeft && vars._xinOutcome === 0) {
        var desc = "车拐进崮山路旁的小区。忻老师熄了火，没马上下车，先隔着挡风玻璃往里看了看——铁门虚掩着，门房的窗户黑着。\n“门禁还是我走那天锁的。”他掏出磁卡刷开铁门，“我家在 3 号楼。跟紧我。”";
        if (vars._studentsCalled) {
          desc += "\n身后传来一阵车轮碾过碎玻璃的声音——蔡镜晓和彭奕宸骑到了小区门口，放倒车，朝你们重重点头。";
        }
        return desc;
      }
      if (vars._teacherLeft) {
        return "教师小区的铁门虚掩着。3 号楼的方向安安静静，楼道口的地上有一摊发黑的印子，已经没人说得清是谁留下的。";
      }
      if (vars._xinGone) {
        return "教师小区的铁门锁着，门房还是空的。你想起忻老师说他住这附近——不知道他到家了没有，也不知道他家那扇门后面，等着他的是什么。";
      }
      return "崮山路旁一个老小区，铁门紧锁，门房里空无一人。门禁的指示灯黑着，里面静得只剩风声。";
    },
    choices: function(vars) {
      var cs = [];
      if (vars._teacherLeft && vars._xinOutcome === 0) {
        cs.push({ text: "跟忻老师进小区", nextScene: "忻老师家-楼道", effect: updateTime(5) });
        cs.push(fdCallOption());
      }
      cs.push({ text: "离开", nextScene: "建平-校园门口", effect: updateTime(3) });
      return cs;
    }
  },

  "忻老师家-楼道": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/教师小区楼道.webp */,
    qte: function(vars) {
      // QTE①：楼道全员必经，dd 加压（Day3=10s / Day4=8.5s / Day5=7s）
      return {
        timeout: "10000 - (dd - 3) * 1500",
        onTimeout: "结局-丧尸的围殴"
      };
    },
    onEnter: function(vars) {
      vars.currentPos = "忻老师家楼道";
      return {};
    },
    text: function(vars) {
      var desc = "3 号楼的单元门虚掩着，楼道比江湾那边的门厅暗得多，也窄得多。信报箱上贴着的春联褪成了粉白色。楼上某户的门虚开着，电视在循环播同一段广告。\n";
      if (vars.dd >= 5) {
        desc += "楼梯上黑压压地挤着好几只，扶手上搭着的手臂一动不动，分不清哪些还是活人变的。";
      } else if (vars.dd === 4) {
        desc += "一楼拐角和二楼台阶上各有一只，中间还躺着一只不动了的，占据了半边楼梯。";
      } else {
        desc += "一楼拐角蹲着一只，听见动静，慢吞吞地回过头来。";
      }
      desc += "\n忻老师从你身侧挤过去半步，压低声音：“我前面走。我家里的事，我来开头。”";
      return desc;
    },
    choices: function(vars) {
      var cs = [
        { text: "跟他上楼，去他家门口", nextScene: "忻老师家-家中", effect: updateTime(6) },
        { text: "退回小区门口", nextScene: "建平-教师小区门口", effect: updateTime(4) }
      ];
      cs.push(fdCallOption());
      return cs;
    }
  },

  "忻老师家-家中": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/忻老师家客厅.webp */,
    onEnter: function(vars) {
      vars.currentPos = "忻老师家";
      return {};
    },
    text: [
      "门开了。玄关的灯还能亮——忻老师按了两下开关，第二下才亮。鞋柜上他的拖鞋摆得整整齐齐，女主人的风衣还挂在钩子上。",
      "客厅空着。茶几上一壶凉透的水，两只杯子，杯底都有水垢的印子。电视柜上摆着一张三口之家的合照——小女孩缺了颗门牙，笑得没心没肺。",
      "卧室的门关着。门把手上挂了一把黄铜小锁——从里面锁上的那种老式锁舌。门上贴着一张纸条，字迹娟秀，写得很急：",
      "“当你看到这行字时，我们已经离开了。不要开门了，你不会想再见到我们的。”",
      "忻老师站在门前，站了很久。他伸出手，指腹碰到那张纸条，又收了回来。他一个字也没说。",
      "楼下，单元门“哐”的一声——有什么东西撞了进来。紧接着是第二声。楼道里的低吼，一层一层地涨上来。"
    ],
    choices: function(vars) {
      // 2×2 分支矩阵路由（a=知识改变行为；b=帮手到场）——叫人窗口在此关闭
      if (!vars._xinKnowsTruth && !vars._studentsCalled) {
        return [{ text: "楼道口的第一只已经踏上这一层——忻老师把你推向窗户", nextScene: "忻老师家-楼道-堵门" }];
      }
      if (!vars._xinKnowsTruth && vars._studentsCalled) {
        return [{ text: "楼下传来自行车铃急促地响——可楼道里的低吼更近", nextScene: "忻老师家-楼道-堵门" }];
      }
      if (vars._xinKnowsTruth && !vars._studentsCalled) {
        return [{ text: "忻老师一把拉开窗户：“我们一起走”", nextScene: "忻老师家-翻窗双逃" }];
      }
      return [{ text: "撑住——他们就在楼下了", nextScene: "忻老师家-学生救场" }];
    }
  },

  // ①②：他堵门牺牲（①独驾/②学生目击）——钥匙是遗产不是逃生指令
  "忻老师家-楼道-堵门": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/楼道堵门.webp */,
    onEnter: function(vars) {
      vars._xinOutcome = vars._studentsCalled ? 2 : 1;  // ①他堵门牺牲 / ②学生目击牺牲
      vars._xinOutcomeDay = vars.dd;
      return {};
    },
    text: function(vars) {
      var segs = [
        "你们退出家门的时候，第一只丧尸已经拐上了这一层楼梯。是只穿睡衣的——它原来是这栋楼里的住户。",
        "忻老师反手把家门带上，用背抵住了楼梯口。楼道太窄，一只丧尸的宽度，刚好塞得下他一个人。",
        "“窗户。”他头也不回，从门缝里把一串车钥匙塞进你手心——还是那串在排挡上搁过的钥匙。他的手很稳。“替我把车开走。别回头。”"
      ];
      if (vars._studentsCalled) {
        segs.push("楼道下面传来急刹车的金属声和喊声——“老师！忻老师！”是蔡镜晓。来不及了。楼梯口那具抵着的身体抖了一下，像是笑了一下。");
      }
      segs.push("你踩着防盗笼翻出窗户。最后看见的，是他抵着楼梯口的背影，和那只按在墙上的左手——袖口垂下来，遮着什么。");
      return segs;
    },
    choices: [
      {
        text: "跳下去，离开这里",
        timeout: "8000 - (dd - 3) * 1000",
        timeoutScene: "结局-被丧尸扑倒咬死",
        nextScene: "回建平-车程",
        effect: updateTime(5)
      }
    ]
  },

  // ③：带伤双逃（玩家挂 hurtByZombie + mercuryLoad+10；忻老师多处深抓伤）
  "忻老师家-翻窗双逃": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/翻窗双逃.webp */,
    onEnter: function(vars) {
      vars._xinOutcome = 3;
      vars._xinOutcomeDay = vars.dd;
      vars.hurtByZombie = true;
      vars.mercuryLoad = Math.min(100, (vars.mercuryLoad || 0) + 10);
      return {};
    },
    text: function(vars) {
      var brokeFree = hasMeleeWeapon(vars)
        ? "你抡起手里的" + meleeWeaponName(vars) + "，把那只手砸脱了"
        : "你拼命运气，总算甩脱了那只手";
      return [
        "楼梯口的丧尸越挤越多。忻老师看了那扇窗一眼，又看了你一眼：“一起？”“一起。”",
        "他先翻出去，踩着防盗笼往下探。一只丧尸从楼道口扑进来，抓住了你的小臂——钝痛。" + brokeFree + "，跟着翻了出去。",
        "你们先后摔进楼下的冬青树丛。树枝在你脸上划了几道口子，不深。忻老师躺在旁边喘——他那边动静大得多，翻窗前他在楼道口挡了一下，几只丧尸的手从他背上、小臂上抓了过去，衬衫撕开了好几条。",
        "“死不了。”他先爬起来，把你拉起来，掸了掸你身上的碎叶子。他自己身上没法掸——那些口子还在渗血。他没再说话，也没再看那扇窗。"
      ];
    },
    choices: [
      { text: "互相搀扶着离开", nextScene: "回建平-车程", effect: updateTime(8) }
    ]
  },

  // ④：学生救场全歼（QTE③撑住 → 闪色3色6闪 → 胜利挂 combatDrain）
  "忻老师家-学生救场": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/学生救场.webp */,
    qte: function(vars) {
      // QTE③：撑到学生上来，dd 加压
      return {
        timeout: "9000 - (dd - 3) * 1200",
        onTimeout: "结局-丧尸的围殴"
      };
    },
    onEnter: function(vars) {
      vars._xinOutcome = 4;
      vars._xinOutcomeDay = vars.dd;
      return {};
    },
    text: "楼道口的第一只挤进门框的时候，楼下传来了金属撞击声——两辆自行车横着撞开了单元门。\n“老师！！”蔡镜晓的喊声在楼道里炸开，混着车铃和什么东西被踹倒的动静。\n“撑住！”忻老师抄起门边的伞架，横在楼梯口，“他们上来还要一分钟——一分钟就行！”",
    choices: [
      { text: "抵住楼梯口，等他们上来", nextScene: "忻老师家-学生救场-战斗", effect: updateTime(2) }
    ]
  },

  "忻老师家-学生救场-战斗": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/楼道堵门.webp（复用） */,
    onEnter: initMemoryGame(["红", "蓝", "绿"], 6),
    text: "楼梯口已经挤了三四只，楼下的脚步声两级两级地往上踩。近了，更近了——就是现在！",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "忻老师家-学生救场-胜利",
        elseScene: "结局-被丧尸扑倒咬死"
      }
    ]
  },

  "忻老师家-学生救场-胜利": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/学生救场.webp（复用） */,
    onEnter: function(vars) { combatDrain(vars); return {}; },
    text: function(vars) {
      return "你率先迎着楼梯口撞上来的那只撞了过去。楼道窄，它展不开，你也展不开——就是最原始的挤、抵、抡。\n\
蔡镜晓的自行车锁从侧面抡了过来，彭奕宸抄起车筐里的扳手补上最后一下。忻老师把伞架横过来，把你身后那只别在了栏杆上。四个人，一条楼道，从三楼一直清到单元门口。\n\
最后一只倒下去的时候，楼道里只剩下四个人的喘气声。\n\
“老师，”蔡镜晓扶着膝盖，抬起头，“您家……”\n\
忻老师靠在单元门上，看了很久楼上那扇开着门的家，摇了摇头：“已经不在了。都过去了。”" + combatDrainText(vars);
    },
    choices: [
      { text: "收队，回建平", nextScene: "回建平-车程", effect: updateTime(10) }
    ]
  },

  // ==================== 章节出口 ====================

  // 全分支统一：章节出口 = 免费得车（方案已拍板；hasCar 后期机动性质变，出城线远期钥匙）
  "回建平-车程": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/回建平车程.webp */,
    onEnter: function(vars) {
      vars.hasCar = true;
      vars.currentPos = "回建平车上";
      return {};
    },
    text: function(vars) {
      if (vars._xinOutcome === 1) {
        return "你一个人开着那辆车。方向盘上还留着他手心的温度。\n后视镜里，教师小区越来越小。你把车速压得很慢——好像开得慢一点，就还有人在等你回头看一眼。";
      }
      if (vars._xinOutcome === 2) {
        return "车里很挤。蔡镜晓坐在后座，抱着他那把车锁，一路没说话。彭奕宸坐在他旁边，眼睛看着窗外。\n没有人提刚才的事——有些画面，看一眼就够记一辈子了。";
      }
      if (vars._xinOutcome === 3) {
        return "你们把车窗都摇了下来。风吹着忻老师小臂上那些结了痂的口子，他一句疼也没喊，只是让你把车开稳一点。\n“你比我需要它。”他把钥匙塞进你手心的时候说，“我留在学校了——这次是真的。”";
      }
      return "你开着车，后视镜里，蔡镜晓和彭奕宸骑着车跟在后面。忻老师坐在副驾驶，一路都在看窗外。\n快到建平的时候，他忽然开口：“车你开着。我留在学校了——你比我需要它。”";
    },
    choices: [
      { text: "回到建平", nextScene: "建平-校园门口", effect: updateTime(20) }
    ]
  },

  // ③④不给药的延迟引信结局（由建平中学.js 3F走廊 jpXinFuse 路由进来；专属立绘）
  "结局-变了的忻老师": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/结局-变了的忻老师.webp */,
    onEnter: function(vars) {
      vars._xinTurned = true;
      tryBreakWeapon(vars);   // 死亡结局挂耐久判定（回溯还原，黑色幽默惯例）
      return {};
    },
    text: function(vars) {
      var lastMove = hasMeleeWeapon(vars)
        ? "你摸向腰间的" + meleeWeaponName(vars) + "——太慢了。"
        : "你后退半步——太慢了。";
      return "物理办公室的门虚掩着。你推开门。\n\
他站在窗边，背对着你。那沓批了一半的试卷，还摊在桌上。\n\
“忻老师？”\n\
他转过身来。那件熟悉的格子衬衫上，深色的痕迹从领口一直洇到下摆。小臂上那三道痂已经发黑发亮，像三条烧焦的缝。\n\
他看着你，歪了歪头——像是在努力回想你是谁。然后，他张开了嘴。\n"
        + lastMove + "\n—— 结局：变了的忻老师 ——";
    }
  }

});
