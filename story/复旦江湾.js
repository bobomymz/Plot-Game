// ==================== 复旦江湾（忻老师章节） ====================
// 北线·建平延伸章节：王知筠线完结（环境科学楼305）+ 忻老师家（2×2 分支矩阵 + 药丸延迟引信）。
// 方案：docs/区域方案-复旦江湾.md；剧情蓝本：忻老师故事线.md（仓库根目录）。
// 骨架期（阶段2）：全部 placeholder 图 + 一句话占位 text，只定枢纽/跳转/守卫/章节状态机。
// 阶段3 待填：楼道 QTE 链、④全歼闪色、a 出示手机（305）、b 叫人（返程车程→楼道口窗口）、
//   ③药丸（整理整理，无提示）、全部正文与分支文本、尸潮基线 f(dd)、后日谈。
// ⚠️ 全章 currentArea = "复旦"（家侧也是——章中天黑须落复旦防御分支"过夜-复旦-车内"，勿改回建平）。
// 入口：建平-后门辅路上车（hh<14）；出口：全分支 → 回建平-车程 → 建平-校园门口（hasCar=true）。

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
    text: "车在校区门口停下。忻老师熄了火，望着空荡荡的校道：“到了。先去环境科学楼——王老师应该在三楼。”（占位：尸潮基线 f(dd) → 阶段3）",
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
      var desc = "一大片草坪铺在校区中央，林荫道向几栋学院楼延伸。微电子楼的玻璃幕墙反着光。（占位枢纽）";
      if (vars._visit["复旦江湾-环境科学楼-305"] > 0) {
        desc += "\n忻老师站在车边等你：“看完了？——去我家吧。”";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [
        { text: "往材料楼那边走走", nextScene: "复旦江湾-材料楼-门前", effect: updateTime(8) },
        { text: "去环境科学楼", nextScene: "复旦江湾-环境科学楼-门厅", effect: updateTime(8) },
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
    text: "材料科学楼门前立着一块铭牌。你记得——研学那年，全班就是在这栋楼前拍的合影。（占位：研学记忆 pickup → 阶段3）",
    choices: [
      { text: "回到草坪", nextScene: "复旦江湾-中央草坪", effect: updateTime(8) }
    ]
  },

  "复旦江湾-环境科学楼-门厅": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/环境楼门厅.webp */,
    onEnter: function(vars) {
      vars.currentPos = "环境科学楼";
      return {};
    },
    text: "门厅里积着薄灰，楼梯向上拐向三楼。305 就在三楼走廊尽头。（占位：上楼 → 305）",
    choices: [
      { text: "上三楼，去 305", nextScene: "复旦江湾-环境科学楼-305", effect: updateTime(4) },
      { text: "出楼，回草坪", nextScene: "复旦江湾-中央草坪", effect: updateTime(6) }
    ]
  },

  "复旦江湾-环境科学楼-305": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/环境楼305.webp */,
    onEnter: function(vars) {
      vars.currentPos = "305";
      return {};
    },
    text: "王知筠不在了。办公桌上那盆绿萝半死不活，显示屏下压着一张便利贴。她的办公室安静得像只是午休。（占位：三房间终章文本 + a 出示手机 → 阶段3）",
    choices: [
      { text: "拉开抽屉看看", nextScene: "复旦江湾-环境科学楼-305-合影", effect: updateTime(2) },
      { text: "离开办公室", nextScene: "复旦江湾-环境科学楼-门厅", effect: updateTime(2) }
    ]
  },

  "复旦江湾-环境科学楼-305-合影": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/课题组合影.webp */,
    imageZoom: true,
    text: "抽屉里压着一张 2026 年 3 月的课题组合影。王知筠站在第二排最左边，笑得比谁都用力。（占位：imageZoom 特写）",
    choices: [
      { text: "把合影放回去", nextScene: "复旦江湾-环境科学楼-305", effect: updateTime(1) }
    ]
  },

  // ==================== 返程 ====================

  "复旦江湾-返程车程": travelScene(
    "忻老师发动了车。来时他一路找话，回去的路上，他一句也不说了。（占位：车内对话 = b 链地址窗口 → 阶段3）",
    "建平-教师小区门口"
  ),

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
        return "忻老师把车停在小区门口，掏出门禁卡刷开了铁门。“我家在 3 号楼。跟紧我。”（章节态：深入已解锁）";
      }
      if (vars._teacherLeft) {
        return "教师小区的铁门虚掩着。3 号楼的方向安安静静。（章节后状态 → 阶段3细化）";
      }
      if (vars._xinGone) {
        return "教师小区的铁门锁着，门房还是空的。你想起忻老师说他住这附近——不知道他到家了没有。（错过窗口后 → 阶段3细化）";
      }
      return "崮山路旁一个老小区，铁门紧锁，门房里空无一人。门禁的指示灯黑着，里面静得只剩风声。（伏笔：正常游玩仅留印象，深入在复旦章节解锁）";
    },
    choices: function(vars) {
      var cs = [];
      if (vars._teacherLeft && vars._xinOutcome === 0) {
        cs.push({ text: "跟忻老师进小区", nextScene: "忻老师家-楼道", effect: updateTime(5) });
      }
      cs.push({ text: "离开", nextScene: "建平-校园门口", effect: updateTime(3) });
      return cs;
    }
  },

  "忻老师家-楼道": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/教师小区楼道.webp */,
    onEnter: function(vars) {
      vars.currentPos = "忻老师家楼道";
      return {};
    },
    text: "楼道里的丧尸比来时更多——dd 已经涨了。（占位：重闯走廊第二遍，高潮 QTE 链 + b 叫人窗口在此截止 → 阶段3）",
    choices: [
      { text: "往上走，去他家门口", nextScene: "忻老师家-家中", effect: updateTime(6) },
      { text: "退回小区门口", nextScene: "建平-教师小区门口", effect: updateTime(4) }
    ]
  },

  "忻老师家-家中": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/忻老师家客厅.webp */,
    onEnter: function(vars) {
      vars.currentPos = "忻老师家";
      return {};
    },
    text: "客厅空着。卧室的门从里面锁上了，门上贴着一张纸条。（占位：妻儿呈现/纸条，已拍板不做开门结局 → 阶段3）",
    choices: function(vars) {
      var cs = [];
      // 2×2 分支矩阵路由（占位文案；真实触发=尸潮涌上楼道等 → 阶段3）
      if (!vars._xinKnowsTruth && !vars._studentsCalled) {
        cs.push({ text: "楼道里响起了撞击声……", nextScene: "忻老师家-楼道-堵门" });
      }
      if (!vars._xinKnowsTruth && vars._studentsCalled) {
        cs.push({ text: "楼下传来学生们的喊声，但似乎……", nextScene: "忻老师家-楼道-堵门" });
      }
      if (vars._xinKnowsTruth && !vars._studentsCalled) {
        cs.push({ text: "从窗户离开这里", nextScene: "忻老师家-翻窗双逃" });
      }
      if (vars._xinKnowsTruth && vars._studentsCalled) {
        cs.push({ text: "撑住，等学生们上来", nextScene: "忻老师家-学生救场" });
      }
      return cs;
    }
  },

  "忻老师家-楼道-堵门": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/楼道堵门.webp */,
    onEnter: function(vars) {
      vars._xinOutcome = vars._studentsCalled ? 2 : 1;  // ①②：他堵门牺牲（②=学生目击）
      return {};
    },
    text: "他用身体抵住门，从门缝里把车钥匙塞进你手心。（占位①②：原作式堵门/翻窗 → 阶段3）",
    choices: [
      { text: "翻窗，离开这里", nextScene: "回建平-车程", effect: updateTime(5) }
    ]
  },

  "忻老师家-翻窗双逃": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/翻窗双逃.webp */,
    onEnter: function(vars) {
      vars._xinOutcome = 3;  // ③：带伤双逃（玩家 hurtByZombie+mercuryLoad+10、忻老师多处深抓伤 → 阶段3）
      return {};
    },
    text: "你们先后翻出窗户，跌进楼下的绿化带。谁都挂了彩。（占位③：药丸延迟引信入口 → 阶段3）",
    choices: [
      { text: "互相搀扶着回建平", nextScene: "回建平-车程", effect: updateTime(8) }
    ]
  },

  "忻老师家-学生救场": {
    image: "images/placeholder.png" /* TODO: images/复旦江湾/学生救场.webp */,
    onEnter: function(vars) {
      vars._xinOutcome = 4;  // ④：学生救场全歼（闪色战斗 + combatDrain → 阶段3）
      return {};
    },
    text: "两辆自行车撞开单元门——蔡镜晓和彭奕宸到了。（占位④：四人合力全歼 → 阶段3）",
    choices: [
      { text: "清完最后一只，收队", nextScene: "回建平-车程", effect: updateTime(6) }
    ]
  },

  // ==================== 章节出口 ====================

  "回建平-车程": travelScene(
    "回建平的路上，车里很安静。（占位：①②独驾/带学生、③④他活着交车 → 阶段3分文本）",
    "建平-校园门口",
    { onEnter: function(vars) { vars.hasCar = true; return {}; } }  // 全分支统一：章节出口 = 免费得车（方案已拍板）
  )

});
