// ========== 新达汇·三林 ==========
// 开放式商场探索，B1~5F+屋顶+东区

// 商场走廊/中庭/扶梯 QTE 工厂函数
// ch=0 不触发，ch 越大时限越短
function mallQTE(baseTimeout, onTimeout) {
  return function(vars) {
    if (vars.chasedByZombies <= 0) return null;
    return {
      timeout: Math.max(2000, baseTimeout - vars.chasedByZombies * 2000),
      onTimeout: onTimeout
    };
  };
}

Object.assign(storyData, {

  "新达汇-喷泉广场": {
    image: function(vars) {
      if (vars.weather === "雨") return "images/placeholder.png";
      var f = timeImage({
        morning: "images/placeholder.png" /* TODO: images/新达汇/喷泉广场-morning.png */,
        evening: "images/新达汇/喷泉广场-evening.png",
        night: "images/新达汇/喷泉广场-night.png",
        midnight: "images/新达汇/喷泉广场-midnight.png"
      });
      return f(vars);
    },
    onEnter: { set: { currentPlace: "新达汇", currentArea: "周边社区", currentPos: "新达汇" } },
    text: function(vars) {
      var desc = "新达汇·三林的主入口广场。中央的喷泉停着，池底浅浅一层积水漂着落叶。广场上零散地倒着几个歪斜的广告牌和废弃的购物车。\n正前方是商场西区的主入口，玻璃门敞开着；东侧能看到东区的开放式街区；地面有一个通往B1下沉广场的阶梯入口。\n";
      if (!vars._metGaoAtMall && vars.dd <= 3 && vars.hh >= 10 && vars.hh <= 14) {
        desc += "喷泉边上停着一辆红色山地车，车架上贴着几张没撕干净的卡通贴纸。靠商场入口那一侧——一个锅盖头少年正被好几只丧尸围着。他攥着一根从旁边广告牌上拆下来的金属管，边退边打，嘴上还在骂骂咧咧。";
      } else if (vars._metGaoAtMall) {
        desc += "喷泉边上那辆红色山地车还在，车架上的卡通贴纸在日光下反射着褪色的光泽。";
      }
      return desc + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._metGaoAtMall && vars.dd <= 3 && vars.hh >= 10 && vars.hh <= 14) {
        cs.push({ text: "冲上去帮忙", nextScene: "新达汇-喷泉广场-高锦睿-帮忙", effect: updateTime(2) });
        cs.push({ text: "先看看情况", nextScene: "新达汇-喷泉广场-高锦睿-旁观", effect: updateTime(1) });
      }
      cs.push({ text: "进入西区1F中庭", nextScene: "新达汇-1F中庭", effect: updateTime(1) });
      cs.push({ text: "走下阶梯到B1下沉广场", nextScene: "新达汇-B1下沉广场入口", effect: updateTime(2) });
      cs.push({ text: "前往东区", nextScene: "新达汇-东区天桥1", effect: updateTime(4) });
      cs.push({ text: "离开新达汇，回十字路口",
        nextScene: "三林路-东明路 十字路口",
        effect: updateTime(2) });
      return cs;
    }
  },

  // ==================== 高锦睿 · 喷泉广场相遇 ====================

  "新达汇-喷泉广场-高锦睿-帮忙": {
    image: "images/placeholder.png" /* TODO: images/新达汇/喷泉广场-morning.png */,
    onEnter: initMemoryGame(["红","蓝","绿"], 4),
    text: "你抄起地上一根歪倒的广告牌支架冲了上去。丧尸们被喷泉池底的水汽吸引——一只、两只、三只、四只，从水池边同时转过头来。\n高锦睿回头看见你，愣了一下：“诶？！”",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: {
          match: function(vars, input) {
            return normalizeColorAnswer(input) === normalizeColorAnswer(vars._currentAnswer);
          },
          placeholder: "例如：2红1蓝1绿",
          wrongScene: "新达汇-喷泉广场-高锦睿-被救"
        },
        nextScene: "新达汇-喷泉广场-高锦睿-聊",
        effect: updateTime(2, { add: { strength: -1 } })
      }
    ]
  },

  "新达汇-喷泉广场-高锦睿-被救": {
    image: "images/placeholder.png" /* TODO: images/新达汇/喷泉广场-morning.png */,
    onEnter: { set: { hurtByZombie: true }, add: { strength: -2 } },
    text: "你记错了——一只丧尸从你侧面扑过来，你来不及反应。\n一根金属管从你耳边呼啸而过，咚地一声砸在丧尸脸上。那只丧尸踉跄着栽进了喷泉池里。\n高锦睿拽着你的衣领把你拉了起来：\
”别愣着啊！走吧！“\n你低头一看——手臂上多了一道抓痕。",
    choices: [
      {
        text: "跟他撤到商场入口",
        nextScene: "新达汇-喷泉广场-高锦睿-聊",
        effect: updateTime(1)
      }
    ]
  },

  "新达汇-喷泉广场-高锦睿-旁观": {
    image: "images/placeholder.png" /* TODO: images/新达汇/喷泉广场-morning.png */,
    text: "你退后一步，藏在一根倒下的广告牌后面。\n高锦睿用那根金属管又抡倒了一只，然后一脚把最后一只踹进了喷泉池。水花溅了他一身。\n他喘着粗气，把金属管往地上一扔，抬头看到你从广告牌后面走出来。\n\
“你就看着是吧？”他翻了个白眼，但嘴角还是翘了起来。",
    choices: [
      {
        text: "“你一个人不是也解决了？”",
        nextScene: "新达汇-喷泉广场-高锦睿-聊",
        effect: updateTime(1)
      }
    ]
  },

  "新达汇-喷泉广场-高锦睿-聊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/喷泉广场-morning.png */,
    onEnter: { set: { _metGaoAtMall: true } },
    text: "他擦了擦脸上的水，一屁股坐在喷泉池沿上。“我靠，你也来这儿了？”\n\
他告诉你他是骑车过来的——变速器修好了，一路上东躲西藏，刚到这个广场就被水池边的丧尸围了。“这东西好像特别喜欢水，不知道什么毛病。”\n\
他站起来拍了拍裤子，把金属管往肩上一扛。“我打算进去逛逛——这么大的商场，总不能什么都不剩吧。你看看有没有什么好东西，回头碰上了跟我说。”\n\
山地车被他随手锁在了喷泉边的路灯杆上。“反正也没人偷。”",
    choices: [
      {
        text: "“你小心点。”",
        nextScene: "新达汇-喷泉广场",
        effect: updateTime(1)
      }
    ]
  },

  // ==================== B1 地下层 ====================
  "新达汇-B1下沉广场入口": {
    image: "images/placeholder.png" /* TODO: images/新达汇/b1Entry.png */,
    text: function(vars) { return "下沉广场入口。阶梯从地面延伸下来，这里的比上面暗了不少，应急灯发出惨白的光。广场中央的绿植绿意盎然，周围几把户外桌椅东倒西歪。\n前方就是B1美食广场的入口。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "进入美食广场",
        nextScene: "新达汇-B1美食广场",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-B1美食广场": {
    image: "images/placeholder.png" /* TODO: images/新达汇/b1FoodCourt.png */,
    text: function(vars) { return "B1美食广场。开放式就餐区的桌椅大半倒在地上，取餐台的灯还亮着，但柜台后面凌乱不堪。地面上散落着打翻的餐盘和发霉的剩菜，苍蝇在上面嗡嗡地盘旋。\n几扇通往走廊的出口分布在两侧。角落里有一扇货梯间。墙角处有一扇银色的防火门，上面贴着\"后勤通道 · 非工作人员勿入\"的标签。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "推开防火门进入后勤通道",
        nextScene: "新达汇-B1后勤走廊",
        effect: updateTime(1),
      },
      {
        text: "穿过走廊前往停车场",
        nextScene: "新达汇-B1走廊",
        effect: updateTime(2),
      },
      {
        text: "前往货梯间",
        nextScene: "新达汇-B1货梯间",
        effect: updateTime(1),
      },
      {
        text: "回到下沉广场",
        nextScene: "新达汇-B1下沉广场入口",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-B1走廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/b1Corridor.png */,
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "你走进B1走廊。这条通道连接美食广场和停车场，两侧的墙壁上贴着过时的促销海报。荧光灯管在头顶嗡嗡作响，忽明忽暗。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "往前走——停车场A区",
        nextScene: "新达汇-B1停车场A区",
        effect: updateTime(2),
      },
      {
        text: "前往货梯间",
        nextScene: "新达汇-B1货梯间",
        effect: updateTime(1),
      },
      {
        text: "前往消防通道",
        nextScene: "新达汇-B1消防通道",
        effect: updateTime(1),
      },
      {
        text: "前往美食广场",
        nextScene: "新达汇-B1美食广场",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-B1停车场A区": {
    image: "images/placeholder.png" /* TODO: images/新达汇/b1ParkingA.png */,
    text: "你来到停车场A区。一排排车辆整齐地停放着，车身上覆着一层薄灰。头顶的灯大部分不亮了，只有深处还有几盏在闪烁。",
    choices: [
      {
        text: "往深处走——停车场B区",
        nextScene: "新达汇-B1停车场B区",
        effect: updateTime(3),
      },
      {
        text: "前往走廊",
        nextScene: "新达汇-B1走廊",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-B1停车场B区": {
    image: "images/placeholder.png" /* TODO: images/新达汇/b1ParkingB.png */,
    text: "你来到停车场深处。这里几乎完全黑暗。你注意到角落停着一辆黑色轿车，驾驶座的遮阳板半翻着。",
    choices: [
      {
        text: "前往停车场A区",
        nextScene: "新达汇-B1停车场A区",
        effect: updateTime(3),
      },
    ]
  },
  "新达汇-B1货梯间": {
    image: "images/placeholder.png" /* TODO: images/新达汇/b1FreightElevator.png */,
    text: "你走进货梯间。一部货运电梯停在一楼，按钮面板亮着微弱的红光。旁边是步梯通道。",
    choices: [
      {
        text: "坐货梯上1F",
        nextScene: "新达汇-货梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-1F中庭"; return updateTime(3)(v, ""); },
      },
      {
        text: "坐货梯上2F",
        nextScene: "新达汇-货梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-2F中庭环廊"; return updateTime(3)(v, ""); },
      },
      {
        text: "坐货梯上3F",
        nextScene: "新达汇-货梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-3F中庭环廊"; return updateTime(3)(v, ""); },
      },
      {
        text: "坐货梯上4F",
        nextScene: "新达汇-货梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-4F中庭环廊"; return updateTime(3)(v, ""); },
      },
      {
        text: "坐货梯上5F",
        nextScene: "新达汇-货梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-5F北走廊西"; return updateTime(3)(v, ""); },
      },
      {
        text: "前往B1走廊/美食广场",
        nextScene: "新达汇-B1美食广场",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-B1消防通道": {
    image: "images/placeholder.png" /* TODO: images/新达汇/stairwell.png */,
    text: "你推开消防通道的门。步梯间里回荡着你的脚步声，墙上的应急出口标志泛着绿光。从这里可以步行上到各楼层。",
    choices: [
      {
        text: "上到1F",
        nextScene: "新达汇-1F消防通道",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "前往B1走廊",
        nextScene: "新达汇-B1走廊",
        effect: updateTime(1),
      },
    ]
  },

  // ==================== B1 end ====================

  // ==================== 1F 首层（日字型走廊） ====================
  "新达汇-1F中庭": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fAtrium.png */,
    onEnter: function(v) { transit(v, "1F-中庭"); return { set: { positionAfterOperation: "新达汇-1F中庭" } }; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "你站在1F中庭。挑空大厅，阳光从天窗洒下来。环形走廊在头顶层层叠叠，中庭中央有一株大型绿植。\n"
 + (vars._catChasing && !vars._powerOut ? "<span style='color: #ffaa00;'>远处传来猫叫。</span>\n" : "")
 + (!vars._catChasing && !vars._powerOut && vars._catFed && Math.random() < 0.3 ? 
  "<span style='color: #888;'>中庭的大绿植叶片轻轻抖动了一下——那只变异猫从叶子间探出头，看了你一眼，又缩了回去。</span>\n" : "")
 + describeZombieWave(vars); },
    choices: [
      {
        text: "去北走廊西侧逛逛",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧逛逛",
        nextScene: "新达汇-1F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "看看中庭的电子公告屏",
        nextScene: "新达汇-1F公告屏",
        effect: updateTime(1),
      },
      {
        text: "走扶梯上2F",
        nextScene: "新达汇-1F扶梯组",
        effect: updateTime(2),
      },
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-1F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "先整理一下东西",
        nextScene: "整理整理",
      },
      {
        text: "离开商场回广场",
        nextScene: "新达汇-喷泉广场",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F公告屏": {
    image: "images/placeholder.png" /* TODO: images/新达汇/infoScreen.png */,
    text: "电子公告屏显示着停运前的楼层导览。\n\
【1F】华为体验店 | 中庭\n【2F】Nike | 海澜之家 | 雅戈尔\n【3F】卡通尼乐园 | 金宝贝 | 爱婴室\n【4F】大渝火锅 | 大米先生 | 日料店 | CGV影城\n【5F】石物恋·烧肉 | 左庭右院 | 游戏厅\n\
屏幕右下角贴着一张手写便签：\"猫在3F，别喂它，它只认保安。——物业\"",
    choices: [
      {
        text: "前往中庭",
        nextScene: "新达汇-1F中庭",
        effect: updateTime(1),
      },
    ]
  },
  // 1F 北走廊
  "新达汇-1F北走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fNorth.png */,
    onEnter: function(v) { transit(v, "1F-北走廊西"); return {}; },
    text: function(vars) {
      var desc = "1F北走廊西段。走廊两侧是几家关了门的店铺，卷帘门拉着。其中有一家味千拉面，卷帘门的下沿有一道不起眼的缝隙——好像可以抬起来。";
      if (!vars._backhallEntered) desc += "\n墙边有一扇白色的门，上面贴着\"员工通道\"的标签——门锁着，推不动。";
      if (!vars._1f_wireFixed && !vars._powerOut) {
        desc += "\n前方地上有一根断裂的电线搭在积水里，噼啪地冒着火花——挡住了路。";
      } else if (!vars._1f_wireFixed && vars._powerOut) {
        desc += "\n地上有一根断裂的电线横在面前——停电了，它现在无害，你可以直接跨过去。";
      } else {
        desc += "\n之前那根断裂的电线已经被你处理好了，走廊畅通。";
      }
      desc += "\n" + describeZombieWave(vars);
      return desc;
    },
    choices: [
      {
        text: "去华为体验店",
        nextScene: "新达汇-1F数码店",
        effect: updateTime(1),
      },
      {
        text: "用外套包着手拨开电线",
        nextScene: "新达汇-1F北走廊西-电线-拨开",
        effect: updateTime(2),
        showCondition: "!_1f_wireFixed && !_powerOut",
      },
      {
        text: "找根干木棍挑开电线",
        nextScene: "新达汇-1F北走廊西-电线-木棍",
        effect: updateTime(3),
        showCondition: "!_1f_wireFixed && !_powerOut",
      },
      {
        text: "小心从旁边绕过去",
        nextScene: "新达汇-1F北走廊西-电线-绕行",
        effect: updateTime(2),
        showCondition: "!_1f_wireFixed && !_powerOut",
      },
      {
        text: "直接跨过去",
        nextScene: "新达汇-1F北走廊中",
        effect: updateTime(1),
        showCondition: "!_1f_wireFixed && _powerOut",
      },
      // 味千拉面入口
      {
        text: "用铁管撬开味千拉面的卷帘门",
        nextScene: "新达汇-1F味千拉面",
        effect: updateTime(3, { set: { _ramenVisited: true } }),
        showCondition: "(hasIronPipe || hasCane || hasMopHandle) && !_ramenVisited && chasedByZombies <= 1",
      },
      {
        text: "快撬开味千拉面的卷帘门躲进去！",
        nextScene: "新达汇-1F味千拉面",
        effect: updateTime(2, { set: { _ramenVisited: true } }),
        showCondition: "(hasIronPipe || hasCane || hasMopHandle) && !_ramenVisited && chasedByZombies >= 2",
      },
      {
        text: "蹲下身试试能不能抬起卷帘门",
        nextScene: "新达汇-1F味千拉面-徒手",
        showCondition: "!(hasIronPipe || hasCane || hasMopHandle) && !_ramenVisited",
      },
      {
        text: "进入味千拉面",
        nextScene: "新达汇-1F味千拉面",
        effect: updateTime(1),
        showCondition: "_ramenVisited && chasedByZombies <= 1",
      },
      {
        text: "快躲进味千拉面！",
        nextScene: "新达汇-1F味千拉面",
        effect: updateTime(1),
        showCondition: "_ramenVisited && chasedByZombies >= 2",
      },
      
      {
        text: "推开一扇贴着'员工通道'的门",
        nextScene: "新达汇-1F后勤走廊中",
        showCondition: "_backhallEntered",
      },
      {
        text: "往东走",
        nextScene: "新达汇-1F北走廊中",
        effect: updateTime(1),
        showCondition: "_1f_wireFixed",
      },
      {
        text: "穿过中庭回南走廊",
        nextScene: "新达汇-1F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往中庭",
        nextScene: "新达汇-1F中庭",
        effect: updateTime(1),
      },
    ]
  },

  "新达汇-1F北走廊西-电线-拨开": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fNorth.png */,
    onEnter: { set: { _1f_wireFixed: true }, add: { chasedByZombies: 1 } },
    text: "你用外套裹住手，抓住电线头小心地拎到一边。外套是干的，没有导电。但拨开那一刻火花噼啪了两声，在安静的走廊里格外刺耳。",
    choices: [
      {
        text: "继续走",
        nextScene: "新达汇-1F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F北走廊西-电线-木棍": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fNorth.png */,
    onEnter: { set: { _1f_wireFixed: true } },
    text: "你在走廊角落找到一根废弃的拖把杆，用干的那一头把电线挑开了。安全，安静，但多花了些时间。",
    choices: [
      {
        text: "继续走",
        nextScene: "新达汇-1F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F北走廊西-电线-绕行": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fNorth.png */,
    onEnter: { add: { strength: -1 } },
    text: "你贴着墙壁试图绕过积水和电线——但落脚的地方太窄了，你一脚踩进了水里。电流穿过你的身体，一阵刺痛从脚底窜上来。好在电压不大，你只是麻了一下，裤腿湿透了。",
    choices: [
      {
        text: "咬牙继续走",
        nextScene: "新达汇-1F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F味千拉面": {
    image: "images/placeholder.png" /* TODO: images/新达汇/ramenShop.png */,
    text: function(vars) {
      var desc = "你钻进卷帘门，来到味千拉面店内。\n灶台上的汤锅已经冷透了，汤面凝了一层白色的油脂。后厨的操作台上散落着几包未拆封的袋装拉面——不是店里的货，看起来是员工自己囤的。";
      if (vars._ramenVisited) desc += "\n你之前已经来过这里，卷帘门还维持着你离开时的样子。";
      desc += "\n" + describeZombieWave(vars);
      return desc;
    },
    choices: [
      {
        text: "躲在后厨吃点东西，休息一会儿",
        nextScene: "新达汇-1F味千拉面-休息",
        showCondition: "chasedByZombies >= 2",
      },
      {
        text: "在后厨翻翻看有什么吃的",
        nextScene: "新达汇-1F味千拉面-休息",
        showCondition: "chasedByZombies <= 1",
      },
      {
        text: "推开后厨的铁门——好像通到哪里",
        nextScene: "新达汇-1F后勤走廊西",
        effect: updateTime(1),
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F味千拉面-休息": {
    image: "images/placeholder.png" /* TODO: images/新达汇/ramenShop.png */,
    onEnter: updateTime(30, { add: { strength: 1, chasedByZombies: -1 } }),
    text: "你在后厨的角落坐下，撕开一包袋装拉面干嚼了起来。虽然比不上店里现煮的，但在这座沦陷的城市里，能吃到一口面已经是一种奢侈了。\n你靠墙休息了一会儿，外面的声音渐渐远去了。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你回复1点体力，甩掉了一些追兵。当前体力：{strength}，尸潮等级：{chasedByZombies}。</span>",
    choices: [
      {
        text: "回到走廊",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F味千拉面-徒手": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fNorth.png */,
    onEnter: function(vars) {
      vars._ramenVisited = Math.random() < 0.5;
      if (!vars._ramenVisited) {
        vars.chasedByZombies = Math.min(5, vars.chasedByZombies + 2);
      }
      return {};
    },
    text: function(vars) {
      if (vars._ramenVisited) return "你蹲下身，手指扣住卷帘门底部的边缘，用力往上一抬——嘎吱一声，卷帘门弹了起来。你迅速钻了进去。";
      return "你蹲下身，手指扣住卷帘门底部的边缘，用力往上一抬——卷帘门卡住了。你换了个角度再试，门纹丝不动，反而发出刺耳的金属摩擦声。声音在走廊里回荡开来——你听到远处传来拖沓的脚步声，越来越近。\n你只好放弃，转身离开。";
    },
    choices: [
      {
        text: "继续",
        nextScene: function(v) { return v._ramenVisited ? "新达汇-1F味千拉面" : "新达汇-1F北走廊西"; },
      },
    ]
  },
  "新达汇-1F北走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fNorth.png */,
    onEnter: function(v) { transit(v, "1F-北走廊中"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "1F北走廊中段。从这里可以看到中庭的采光顶。走廊继续向前，右侧有一条通道通向中庭方向。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "往东走",
        nextScene: "新达汇-1F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中庭去南走廊",
        nextScene: "新达汇-1F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F北走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fNorth.png */,
    onEnter: function(v) { transit(v, "1F-北走廊东"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "1F北走廊东端。走廊在这里到头，前方是消防通道。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去消防通道",
        nextScene: "新达汇-1F消防通道",
        effect: updateTime(1),
      },
      {
        text: "绕到南走廊东侧",
        nextScene: "新达汇-1F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-1F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  // 1F 南走廊
  "新达汇-1F南走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fSouth.png */,
    onEnter: function(v) { transit(v, "1F-南走廊西"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "1F南走廊西段。沿途是一些美妆店的橱窗，玻璃大多完好。前方通向连廊入口。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去东侧连廊入口",
        nextScene: "新达汇-1F东侧连廊入口",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-1F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "穿过中庭去北走廊",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往中庭",
        nextScene: "新达汇-1F中庭",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F南走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fSouth.png */,
    onEnter: function(v) { transit(v, "1F-南走廊中"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "1F南走廊中段。这里有一片开放式休息区——几把椅子和枯死的绿植，落满了灰。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "往东走",
        nextScene: "新达汇-1F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中庭去北走廊",
        nextScene: "新达汇-1F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-1F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F南走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fSouth.png */,
    onEnter: function(v) { transit(v, "1F-南走廊东"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "1F南走廊东端。走廊尽头是电梯厅。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-1F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "绕到北走廊东侧",
        nextScene: "新达汇-1F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-1F南走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F数码店": {
    image: "images/placeholder.png" /* TODO: images/新达汇/digitalStore.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(vars) {
      if (vars._metGaoAtMall) {
        if (vars._powerOut) return "华为体验店里一片漆黑。感应门没电了，你推开玻璃门走了进去。\n展示台前蹲着一个人——锅盖头，深色卫衣，手里攥着一台黑了屏的展示机。\n高锦睿抬头看到你，一脸绝望：\n“怎么没电了？！我刚下载好一个游戏——等了一下午才下完的。你知不知道商场的WiFi有多慢——不是，你知道拉电闸的是谁吗？”\n你说：“现在都这个样子了，你还想着玩游戏？”\n他愣了一秒，低头看了看手里黑屏的手机。\n“……不然还能干嘛呢。”\n这句话说得很轻。然后他把手机放回展示台，站了起来，咧嘴一笑：“算了算了，反正那游戏也不好玩——我看了评论才两星。”他拍了拍裤子上的灰，朝门口走去。\n“看到什么好东西记得喊我。”";
        return "玻璃门自动滑开——“欢迎光临华为体验店！”\n高锦睿正坐在展示台前的一把转椅上，双眼死死盯着一台展示机。屏幕上是一款赛车游戏，他拇指在屏幕上狂划，嘴里念念有词。\n旁边的展示座上放着一瓶喝了一半的矿泉水——应该是从哪个自动贩卖机砸出来的。\n他看到你头都没抬：“等一下我这局快赢了——操，撞墙了。算了。”\n他把手机放下，转过来面对你。“这里面东西还挺多的，你逛了没？”";
      }
      if (vars.hasPhone) return "华为店里没什么可看的了。";
      if (vars._powerOut) return "华为体验店里一片漆黑。感应门没电了。";
      return "你刚走到门口，玻璃门自动滑开——门框传来一声电子音：\n“欢迎光临华为体验店！”\n声音不大，但在空旷的商场里格外刺耳。\n展示柜被砸碎了，货架上只剩一些充电线和手机壳。";
    },
    choices: [
      {
        text: "蹲下来看看柜台底下",
        nextScene: "新达汇-1F数码店-手机",
        effect: updateTime(2),
        condition: "!hasPhone",
        elseScene: "新达汇-1F数码店-没手机",
      },
      // 有手机就不能再拿了
      {
        text: "回到走廊",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F数码店-手机": {
    image: "images/placeholder.png" /* TODO: images/新达汇/digitalStore.png */,
    onEnter: { set: { positionAfterOperation: "新达汇-1F数码店-手机" } },
    text: "你在柜台下摸到一台落满灰的华为展示机。屏幕有几道裂纹，但还能亮。桌面干干净净，只有一个美团外卖的APP图标。",
    choices: [
      {
        text: "收好手机",
        condition: "itemCount < bagVolume",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1, { set: { hasPhone: true }, add: { itemCount: 1 } }),
        elseScene: "整理整理"
      },
    ]
  },
  "新达汇-1F数码店-没手机": {
    image: "images/placeholder.png" /* TODO: images/新达汇/digitalStore.png */,
    text: "柜台里空荡荡的，什么都没有。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F东侧连廊入口": {
    image: "images/placeholder.png" /* TODO: images/新达汇/1fEastBridge.png */,
    onEnter: function(v) { transit(v, "1F-东侧连廊入口"); return {}; },
    text: function(vars) { return "一条玻璃顶空中连廊，通往东区。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "走过连廊去东区",
        nextScene: "新达汇-东区天桥1",
        effect: updateTime(3),
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-1F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F扶梯组": {
    image: "images/placeholder.png" /* TODO: images/新达汇/escalator.png */,
    onEnter: function(v) { transit(v, "1F-扶梯组"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "停运的扶梯，当楼梯用。从这里可以上下楼。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "上2F",
        nextScene: "新达汇-2F中庭环廊",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "回到1F中庭",
        nextScene: "新达汇-1F中庭",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F电梯厅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/elevatorHall.png */,
    text: function(vars) {
      if (vars._powerOut) return "电梯厅一片死寂，主电闸已经被你拉下来了。";
      if (vars._catChasing) return "电梯厅墙上的电箱面板在闪烁。";
      return "三部直梯并排而立。按钮面板上B1~5F的按键都还亮着。";
    },
    choices: [
      {
        text: "电箱在闪烁——拉下主电闸",
        nextScene: "新达汇-电梯厅-拉闸",
        effect: updateTime(1),
        showCondition: "_catChasing && !_powerOut",
      },
      {
        text: "上2F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-2F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上3F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-3F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上4F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-4F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上5F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-5F北走廊西"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下B1",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-B1美食广场"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-1F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "前往1F中庭",
        nextScene: "新达汇-1F中庭",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-电梯厅-拉闸": {
    image: "images/placeholder.png" /* TODO: images/新达汇/elevatorHall.png */,
    onEnter: { set: { _catChasing: false, _powerOut: true } },
    text: "你一把拉下主电闸。火花四溅，电梯停了。外面传来一声凄厉的猫叫——然后安静了。电闸卡住了，推不上去了。",
    choices: [
      {
        text: "走扶梯",
        nextScene: "新达汇-1F扶梯组",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F消防通道": {
    image: "images/placeholder.png" /* TODO: images/新达汇/stairwell.png */,
    text: "你推开防火门，走进楼梯间。墙上标着「5F」。从这里可以上屋顶或往下走。",
    onEnter: function(v) { transit(v, "5F-消防通道"); return { add: { chasedByZombies: 1 } }; },
    choices: [
      {
        text: "上屋顶",
        nextScene: "新达汇-屋顶花园入口",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "往下走到4F",
        nextScene: "新达汇-4F消防通道",
        effect: updateTime(2),
      },
      {
        text: "回到5F走廊",
        nextScene: "新达汇-5F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F消防通道": {
    image: "images/placeholder.png" /* TODO: images/新达汇/stairwell.png */,
    text: "你推开防火门，走进楼梯间。墙上标着「4F」。脚步声在混凝土楼梯井里回荡。",
    onEnter: function(v) { transit(v, "4F-消防通道"); return { add: { chasedByZombies: 1 } }; },
    choices: [
      {
        text: "往上走到5F",
        nextScene: "新达汇-5F消防通道",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "往下走到3F",
        nextScene: "新达汇-3F消防通道",
        effect: updateTime(2),
      },
      {
        text: "回到4F走廊",
        nextScene: "新达汇-4F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F消防通道": {
    image: "images/placeholder.png" /* TODO: images/新达汇/stairwell.png */,
    text: "你推开防火门，走进楼梯间。墙上标着「3F」。脚步声在混凝土楼梯井里回荡。",
    onEnter: function(v) { transit(v, "3F-消防通道"); return { add: { chasedByZombies: 1 } }; },
    choices: [
      {
        text: "往上走到4F",
        nextScene: "新达汇-4F消防通道",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "往下走到2F",
        nextScene: "新达汇-2F消防通道",
        effect: updateTime(2),
      },
      {
        text: "回到3F走廊",
        nextScene: "新达汇-3F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F消防通道": {
    image: "images/placeholder.png" /* TODO: images/新达汇/stairwell.png */,
    text: "你推开防火门，走进楼梯间。墙上标着「2F」。脚步声在混凝土楼梯井里回荡。",
    onEnter: function(v) { transit(v, "2F-消防通道"); return { add: { chasedByZombies: 1 } }; },
    choices: [
      {
        text: "往上走到3F",
        nextScene: "新达汇-3F消防通道",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "往下走到1F",
        nextScene: "新达汇-1F消防通道",
        effect: updateTime(2),
      },
      {
        text: "回到2F走廊",
        nextScene: "新达汇-2F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F消防通道": {
    image: "images/placeholder.png" /* TODO: images/新达汇/stairwell.png */,
    text: "你推开防火门，走进楼梯间。墙上标着「1F」。从这里可以上下楼。",
    onEnter: function(v) { transit(v, "1F-消防通道"); return { add: { chasedByZombies: 1 } }; },
    choices: [
      {
        text: "往上走到2F",
        nextScene: "新达汇-2F消防通道",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "往下走到B1",
        nextScene: "新达汇-B1消防通道",
        effect: updateTime(2),
      },
      {
        text: "回到1F走廊",
        nextScene: "新达汇-1F北走廊东",
        effect: updateTime(1),
      },
    ]
  },

  // ==================== 2F 零售层（日字型走廊） ====================
  "新达汇-2F中庭环廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fRing.png */,
    onEnter: function(v) { transit(v, "2F-中庭环廊"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "2F中庭环廊。玻璃围栏让人能直接看到1F中庭。环形走廊两侧是各种零售店铺。\n" + (vars._catChasing && !vars._powerOut ? "<span style='color: #ffaa00;'>猫叫声在回荡。</span>\n" : "") + describeZombieWave(vars); },
    choices: [
      {
        text: "去北走廊西侧",
        nextScene: "新达汇-2F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧",
        nextScene: "新达汇-2F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-2F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-2F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "走消防通道",
        nextScene: "新达汇-2F消防通道",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F北走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fNorth.png */,
    onEnter: function(v) { transit(v, "2F-北走廊西"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "2F北走廊西段。这里有一家Nike体验店，大门被撞碎。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "进Nike店看看",
        nextScene: "新达汇-2F-Nike店",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-2F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧",
        nextScene: "新达汇-2F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-2F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F北走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fNorth.png */,
    onEnter: function(v) { transit(v, "2F-北走廊中"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) {
      var desc = "2F北走廊中段。海澜之家(HLA)白色的门头就在走廊边。";
      if(canSee(vars)) { // 看得见
        if (!vars._2f_chairsCleared) {
          desc += "\n走廊上堆着十几把等位椅，歪七扭八地挡住了去路。看起来是餐厅的人堆在这里的。";
        } else {
          desc += "\n之前堆在走廊上的椅子已经被你搬开了，畅通无阻。";
        }
      }
      desc += "\n" + describeZombieWave(vars);
      return desc;
    },
    choices: [
      {
        text: "去海澜之家看看",
        nextScene: "新达汇-2F服装店",
        effect: updateTime(1),
      },
      {
        text: "一把一把搬开椅子（安静但慢）",
        nextScene: "新达汇-2F北走廊中-搬椅",
        effect: updateTime(3),
        showCondition: "!_2f_chairsCleared && canSee",
      },
      {
        text: "从旁边缝隙侧身钻过去",
        nextScene: "新达汇-2F北走廊中-钻缝",
        effect: updateTime(1),
        showCondition: "!_2f_chairsCleared && canSee",
      },
      {
        text: "直接翻过去",
        nextScene: "新达汇-2F北走廊中-翻椅",
        effect: updateTime(1),
        showCondition: "!_2f_chairsCleared && canSee",
      },
      {
        text: "继续到北走廊尽头",
        nextScene: "新达汇-2F北走廊东",
        effect: updateTime(1),
        showCondition: "_2f_chairsCleared && canSee",
      },
      {
        text: "穿过中庭去南走廊",
        nextScene: "新达汇-2F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-2F北走廊西",
        effect: updateTime(1),
      },
    ]
  },

  "新达汇-2F北走廊中-搬椅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fNorth.png */,
    onEnter: { set: { _2f_chairsCleared: true } },
    text: "你一把一把地把椅子搬到旁边。塑料椅腿碰在一起发出轻微的咔嗒声，但整体还算安静。花了些时间，但路通了。",
    choices: [
      {
        text: "继续走",
        nextScene: "新达汇-2F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F北走廊中-钻缝": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fNorth.png */,
    onEnter: { set: { _2f_chairsCleared: true } },
    text: "你侧身挤进椅子之间的缝隙，屏住呼吸一点一点挪过去。虽然姿势不太雅观，但没有碰到任何一把椅子。",
    choices: [
      {
        text: "继续走",
        nextScene: "新达汇-2F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F北走廊中-翻椅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fNorth.png */,
    onEnter: { set: { _2f_chairsCleared: true }, add: { chasedByZombies: 2, strength: -1 } },
    text: "你双手撑住椅背准备翻过去——但一把椅子的腿被你的膝盖碰了一下，哗啦一声倒在了旁边的椅子堆上。几把椅子像多米诺骨牌一样倒了下去，在走廊里发出不小的声响。",
    choices: [
      {
        text: "快走",
        nextScene: "新达汇-2F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F北走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fNorth.png */,
    onEnter: function(v) { transit(v, "2F-北走廊东"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "2F北走廊东端。卫生间和消防通道在这里。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去卫生间",
        nextScene: "新达汇-2F卫生间",
        effect: updateTime(1),
      },
      {
        text: "去消防通道",
        nextScene: "新达汇-2F消防通道",
        effect: updateTime(1),
      },
      {
        text: "绕到南走廊东侧",
        nextScene: "新达汇-2F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-2F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F南走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fSouth.png */,
    onEnter: function(v) { transit(v, "2F-南走廊西"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "2F南走廊西段。前方是通往东区的天桥入口。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去东区天桥",
        nextScene: "新达汇-东区天桥1",
        effect: updateTime(2),
      },
      {
        text: "往东走",
        nextScene: "新达汇-2F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "去北走廊西侧",
        nextScene: "新达汇-2F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-2F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F南走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fSouth.png */,
    onEnter: function(v) { transit(v, "2F-南走廊中"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "2F南走廊中段。雅戈尔深色木纹的门面就在走廊旁。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去雅戈尔看看",
        nextScene: "新达汇-2F服装店",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-2F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中庭去北走廊",
        nextScene: "新达汇-2F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-2F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F南走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/2fSouth.png */,
    onEnter: function(v) { transit(v, "2F-南走廊东"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "2F南走廊东端。电梯厅在这里。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-2F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "绕到北走廊东侧",
        nextScene: "新达汇-2F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-2F南走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F-Nike店": {
    image: "images/placeholder.png" /* TODO: images/新达汇/nikeStore.png */,
    text: "Nike体验店。大门被撞碎，展示架东倒西歪，场景化陈列被翻得面目全非。运动鞋和衣服散落一地。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "新达汇-2F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F服装店": {
    image: "images/placeholder.png" /* TODO: images/新达汇/clothingStore.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(vars) { return "你刚靠近海澜之家的玻璃门，感应器就发出一声短促的电子提示音，门缓缓滑开。声音不大，但在安静的走廊里足够传到很远。\n\
海澜之家和雅戈尔面对面开着。海澜之家白色装修，冷淡简约；雅戈尔深色木纹更显沉稳。试衣间的门关着。雅戈尔那边的收银台后面有一扇门，贴着\"员工间\"的标签。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "快躲进试衣间！",
        nextScene: "新达汇-2F服装店-陷阱",
        showCondition: "chasedByZombies >= 2",
      },
      {
        text: "到试衣间里看看能不能上锁",
        nextScene: "新达汇-2F服装店-陷阱",
        showCondition: "chasedByZombies <= 1",
      },
      {
        text: "推开员工间的门——好像通到后面",
        nextScene: "新达汇-2F后勤走廊",
        effect: updateTime(1),
      },
      {
        text: "感应门声音太大了，先出去",
        nextScene: "新达汇-2F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F服装店-陷阱": {
    image: "images/placeholder.png" /* TODO: images/新达汇/fittingRoom.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(vars) {
      if (vars.chasedByZombies >= 3) return "你拉开一间隔间的门钻了进去，反手锁上门。\n\
但隔音太差了——你能听到外面传来的拖沓脚步声越聚越多。它们在试衣间外面停了下来，发出低沉的嘶吼。\n\
你被困住了。过了很久它们才散去，但你意识到躲进货架林立的服装店不是一个好主意——屏障太多，根本不知道哪个角落藏着什么。";
      return "你拉开一间隔间的门钻了进去，反手锁上门。\n隔间的空间不大，勉强能站一个人。你贴着墙壁，听到外面的感应门又响了几声——有什么东西进来了。\n\
脚步声在试衣间门口徘徊了一会儿，然后远去了。你等了几分钟，确认安全后才推开门。\n<span style='color: #ffaa00;'>警报声引来了更多丧尸。</span>";
    },
    choices: [
      {
        text: "离开服装店",
        nextScene: "新达汇-2F北走廊中",
        effect: updateTime(3),
      },
    ]
  },
  "新达汇-2F卫生间": {
    image: "images/placeholder.png" /* TODO: images/新达汇/toilet.png */,
    text: "公用卫生间。水龙头没有水，发出嘶哑的空响。隔间的门大多关着。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "新达汇-2F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F扶梯组": {
    image: "images/placeholder.png" /* TODO: images/新达汇/escalator.png */,
    onEnter: function(v) { transit(v, "2F-扶梯组"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "停运的扶梯，当楼梯用。从这里可以上下楼。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "上3F",
        nextScene: "新达汇-3F中庭环廊",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "下1F",
        nextScene: "新达汇-1F中庭",
        effect: updateTime(2),
      },
      {
        text: "回到中庭",
        nextScene: "新达汇-2F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F电梯厅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/elevatorHall.png */,
    text: function(vars) {
      if (vars._powerOut) return "电梯厅一片死寂。";
      return "按钮面板上B1、1F、3F、4F、5F的按键都还亮着。";
    },
    choices: [
      {
        text: "下1F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-1F中庭"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上3F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-3F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上4F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-4F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上5F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-5F北走廊西"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下B1",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-B1美食广场"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-2F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-2F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },

  // ==================== 3F 亲子层（日字型走廊） ====================
  "新达汇-3F中庭环廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fRing.png */,
    onEnter: function(v) { transit(v, "3F-中庭环廊"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "这里是3F中庭，墙上有彩色的卡通墙绘，天花板上挂着落了一半的气球。\n"
       + (vars._catChasing && !vars._powerOut ? "<span style='color: #ffaa00;'>猫叫声就在这一层。</span>\n" : "") + describeZombieWave(vars); },
    choices: [
      {
        text: "去北走廊西侧",
        nextScene: "新达汇-3F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧",
        nextScene: "新达汇-3F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-3F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-3F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "走消防通道",
        nextScene: "新达汇-3F消防通道",
        effect: updateTime(1),
      },
      {
        text: "走过天桥去东区",
        nextScene: "新达汇-东区天桥2",
        effect: updateTime(3),
      },
    ]
  },
  "新达汇-3F北走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fNorth.png */,
    onEnter: function(v) { transit(v, "3F-北走廊西"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "3F北走廊西段。金宝贝早教中心蓝黄配色的门头就在前面。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去金宝贝早教中心",
        nextScene: "新达汇-3F金宝贝早教中心",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-3F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧",
        nextScene: "新达汇-3F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-3F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F北走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fNorth.png */,
    onEnter: function(v) { transit(v, "3F-北走廊中"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "3F北走廊中段。一家关了门的童装店，货架已经搬空了，橱窗里落满灰。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "躲进童装店，在空货架后面藏一会儿",
        nextScene: "新达汇-3F童装店-躲藏",
        showCondition: "chasedByZombies >= 2",
      },
      {
        text: "钻进童装店看看",
        nextScene: "新达汇-3F童装店-躲藏",
        showCondition: "chasedByZombies <= 1",
      },
      {
        text: "继续到北走廊尽头",
        nextScene: "新达汇-3F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中庭去南走廊中段",
        nextScene: "新达汇-3F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-3F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F童装店-躲藏": {
    image: "images/placeholder.png" /* TODO: images/新达汇/childrenShop.png */,
    onEnter: updateTime(30, { add: { chasedByZombies: -1 } }),
    text: "童装店里空荡荡的，只有几个落满灰的塑料模特歪倒在地上。你绕到收银台后面蹲下来，这里正好被柜体挡住，从外面完全看不到。\n\
你缩在阴影里，听着外面的走廊里的脚步声来来回回——但它们没有停下来。过了很久，外面终于安静了。\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你甩掉了一些追兵。当前尸潮等级：{chasedByZombies}。</span>",
    choices: [
      {
        text: "从收银台后站起来",
        nextScene: "新达汇-3F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F北走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fNorth.png */,
    onEnter: function(v) { transit(v, "3F-北走廊东"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "3F北走廊东端。爱婴室和消防通道在这里。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去爱婴室逛逛",
        nextScene: "新达汇-3F爱婴室",
        effect: updateTime(1),
      },
      {
        text: "去消防通道",
        nextScene: "新达汇-3F消防通道",
        effect: updateTime(1),
      },
      {
        text: "绕到南走廊东侧",
        nextScene: "新达汇-3F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-3F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F南走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fSouth.png */,
    onEnter: function(v) { transit(v, "3F-南走廊西"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "3F南走廊西段。卡通墙绘密集，走廊尽头是卡通尼乐园的入口。\n"
 + (vars._catChasing && !vars._powerOut ? "<span style='color: #ffaa00;'>猫叫声从儿童乐园方向传来。</span>\n" : "")
 + (!vars._catChasing && !vars._powerOut && vars._catFed && Math.random() < 0.3 ? "墙上的卡通猫墙绘旁边——一只真猫正蹲在消防管道的支架上，安静地俯视着你经过。</span>\n" : "") + describeZombieWave(vars); },
    choices: [
      {
        text: "去卡通尼乐园",
        nextScene: "新达汇-3F大型综合儿童乐园",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-3F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "去北走廊西侧",
        nextScene: "新达汇-3F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-3F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F南走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fSouth.png */,
    onEnter: function(v) { transit(v, "3F-南走廊中"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) {
      if (vars._3f_darkZoneDone) return "3F南走廊中段——之前那段漆黑的地方你现在可以正常通过了。\n" + describeZombieWave(vars);
      var desc = "3F南走廊中段。但前方的灯管全都灭了——一段大约十米长的走廊完全淹没在黑暗中。你隐约地看见地上似乎散落着一些东西。";
      if (vars.hasTorch) desc += "\n你摸了摸口袋里的手电筒——有光。";
      desc += "\n" + describeZombieWave(vars);
      return desc;
    },
    choices: [
      {
        text: "继续到南走廊尽头",
        nextScene: "新达汇-3F南走廊东",
        effect: updateTime(1),
        showCondition: "_3f_darkZoneDone",
      },
      {
        text: "摸黑慢慢摸过去",
        nextScene: "新达汇-3F南走廊中-摸黑",
        effect: updateTime(2),
        showCondition: "!_3f_darkZoneDone",
      },
      {
        text: "打开手电筒快步通过",
        nextScene: "新达汇-3F南走廊东",
        effect: updateTime(1),
        showCondition: "!_3f_darkZoneDone && hasTorch",
      },
      {
        text: "退回环廊找找有没有照明工具",
        nextScene: "新达汇-3F南走廊西",
        effect: updateTime(1),
        showCondition: "!_3f_darkZoneDone && !hasTorch",
      },
      {
        text: "穿过中庭去北走廊中段",
        nextScene: "新达汇-3F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-3F南走廊西",
        effect: updateTime(1),
      },
    ]
  },

  "新达汇-3F南走廊中-摸黑": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fSouth.png */,
    onEnter: { set: { _3f_darkZoneDone: true }, add: { chasedByZombies: 1 } },
    text: "你伸着手在黑暗中摸索前进。脚下嘎吱一声——你踩碎了什么塑料玩具。声音虽不大，但在安静的走廊里还是挺清楚的。",
    choices: [
      {
        text: "继续走",
        nextScene: "新达汇-3F南走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F南走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/3fSouth.png */,
    onEnter: function(v) { transit(v, "3F-南走廊东"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "3F南走廊东端。电梯厅和东区天桥入口在这里。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-3F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "走过天桥去东区",
        nextScene: "新达汇-东区天桥2",
        effect: updateTime(3),
      },
      {
        text: "绕到北走廊东侧",
        nextScene: "新达汇-3F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-3F南走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F大型综合儿童乐园": {
    image: "images/placeholder.png" /* TODO: images/新达汇/kidsPlayArea.png */,
    text: function(vars) {
      if (vars._powerOut) {
        if (canSee(vars))
          return "卡通尼乐园里一片漆黑。一只猫蜷缩在滑梯下面，诡异的绿眼睛在黑暗中闪烁。";
        return "卡通尼乐园里一片漆黑。";
      }
      if (vars._catFed) return "你又来到了卡通尼乐园。那只变异猫蜷在海洋球池深处，尾巴搭在池沿上，缓缓摆动。它看了你一眼，没有动——似乎对你已经失去了兴趣。";
      if (vars._catChasing) return "你又来到了卡通尼乐园。那只变异猫不知什么时候回来了，蹲在滑梯顶上，尾巴缓缓摆动。它看到你，没有跑——只是盯着你。";
      return "你走进卡通尼乐园。游戏机的屏幕大多暗着。一只体型异常的猫蹲在抓娃娃机顶上，绿眼睛在昏暗的光线下发光。它与你对视了一秒，然后从你脚边窜出了门外。\n\
这里并没有什么有用的东西，你转身离开。\n\
走了几步，你就听到猫叫声从身后传来。<span style='font-style: italic;'>其声呜呜然，如怨如慕，如泣如诉。</span>\n\
<span style='color: #ffaa00;'>它跟上你了。</span>";
    },
    choices: [
      {
        text: "推开前门回到商场走廊",
        nextScene: "新达汇-3F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "钻进员工区回到后勤走廊",
        nextScene: "新达汇-3F后勤走廊东",
        effect: updateTime(2),
        showCondition: "_backhallEntered",
      },
      {
        text: "掏出口袋里的饼干，试探性地伸向猫",
        nextScene: "新达汇-卡通尼乐园-喂猫",
        effect: { set: { hasBiscuit: false, _catChasing: false, _catFed: true }, add: { itemCount: -1 } },
        showCondition: "_catChasing && hasBiscuit",
      },
      {
        text: "掏出那包脆脆炒米，撕开包装晃了晃",
        nextScene: "新达汇-卡通尼乐园-喂猫",
        effect: { set: { hasCatSnack: false, _catChasing: false, _catFed: true }, add: { itemCount: -1 } },
        showCondition: "_catChasing && hasCatSnack",
      },
    ]
  },
  "新达汇-卡通尼乐园-喂猫": {
    image: "images/placeholder.png" /* TODO: images/新达汇/kidsPlayArea.png */,
    text: "那只变异猫盯着你手里的食物看了几秒，然后轻盈地从滑梯上跳下来，小心翼翼地靠近。它叼走了食物，退到几步之外，低头吃了起来。\n你慢慢退出卡通尼乐园。变异猫没有跟上来——它消失在了海洋球池深处。\n你能感觉到它不再盯着你了。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "新达汇-3F南走廊西",
        effect: updateTime(3),
      },
    ]
  },
  "新达汇-3F金宝贝早教中心": {
    image: "images/placeholder.png" /* TODO: images/新达汇/earlyEducation.png */,
    text: function(vars) {
      if (vars._backhallEntered) return "你从后勤通道绕进了金宝贝早教中心的后门。\n蓝黄配色的装潢，教室里小桌椅整齐排列，地面铺着软垫。黑板上画着一只歪歪扭扭的小熊。前门确实锁着——但现在你从里面了，想走也可以从前门出去。";
      return "门锁着。蓝黄配色的装潢，教室里小桌椅整齐排列，地面铺着软垫。黑板上画着一只歪歪扭扭的小熊。里面似乎有很轻的动静。";
    },
    choices: [
      {
        text: "推开前门出去",
        nextScene: "新达汇-3F北走廊西",
        effect: updateTime(1),
        showCondition: "_backhallEntered",
      },
      {
        text: "回到后勤走廊",
        nextScene: "新达汇-3F后勤走廊",
        effect: updateTime(1),
        showCondition: "_backhallEntered",
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-3F北走廊西",
        effect: updateTime(1),
        showCondition: "!_backhallEntered",
      },
    ]
  },
  "新达汇-3F爱婴室": {
    image: "images/placeholder.png" /* TODO: images/新达汇/babyStore.png */,
    text: "你走进爱婴室。彩虹渐变logo，白底彩色地砖配木纹货架。货架上还有婴儿湿巾、矿泉水和磨牙饼干。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "新达汇-3F北走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F扶梯组": {
    image: "images/placeholder.png" /* TODO: images/新达汇/escalator.png */,
    onEnter: function(v) { transit(v, "3F-扶梯组"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "停运的扶梯，当楼梯用。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "上4F",
        nextScene: "新达汇-4F中庭环廊",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "下2F",
        nextScene: "新达汇-2F中庭环廊",
        effect: updateTime(2),
      },
      {
        text: "回到中庭",
        nextScene: "新达汇-3F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F电梯厅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/elevatorHall.png */,
    text: function(vars) {
      if (vars._powerOut) return "电梯厅一片死寂。";
      return "按钮面板上B1、1F、2F、4F、5F的按键都还亮着。";
    },
    choices: [
      {
        text: "下1F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-1F中庭"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下2F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-2F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上4F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-4F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上5F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-5F北走廊西"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下B1",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-B1美食广场"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-3F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-3F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },

  // ==================== 4F 餐饮+影院层（日字型走廊） ====================
  "新达汇-4F中庭环廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fRing.png */,
    onEnter: function(v) { transit(v, "4F-中庭环廊"); return {}; },
    text: function(vars) { return "4F，中庭顶部近在咫尺。空气里飘着油烟和酸馊味。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去北走廊西侧",
        nextScene: "新达汇-4F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧",
        nextScene: "新达汇-4F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-4F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-4F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "走消防通道",
        nextScene: "新达汇-4F消防通道",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F北走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fNorth.png */,
    onEnter: function(v) { transit(v, "4F-北走廊西"); return {}; },
    text: function(vars) { return "4F北走廊西段。大米先生快餐店的门口堆满了等位椅。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去大米先生看看",
        nextScene: "新达汇-4F大米先生",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧",
        nextScene: "新达汇-4F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-4F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F北走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fNorth.png */,
    onEnter: function(v) { transit(v, "4F-北走廊中"); return {}; },
    text: function(vars) { return "4F北走廊中段。油烟味很重——大渝火锅的排风扇上挂着一层油脂。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去大渝火锅看看",
        nextScene: "新达汇-4F大渝火锅",
        effect: updateTime(1),
      },
      {
        text: "继续到北走廊尽头",
        nextScene: "新达汇-4F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中庭去南走廊",
        nextScene: "新达汇-4F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-4F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F北走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fNorth.png */,
    onEnter: function(v) { transit(v, "4F-北走廊东"); return {}; },
    text: function(vars) { return "4F北走廊东端。消防通道在这里。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去消防通道",
        nextScene: "新达汇-4F消防通道",
        effect: updateTime(1),
      },
      {
        text: "绕到南走廊东侧",
        nextScene: "新达汇-4F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F南走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fSouth.png */,
    onEnter: function(v) { transit(v, "4F-南走廊西"); return {}; },
    text: function(vars) { return "4F南走廊西段。墙上有老电影海报。日料店的吧台就在前面。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去日料店看看",
        nextScene: "新达汇-4F日料店",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-4F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "去北走廊西侧",
        nextScene: "新达汇-4F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-4F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F南走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fSouth.png */,
    onEnter: function(v) { transit(v, "4F-南走廊中"); return {}; },
    text: function(vars) { return "4F南走廊中段。空气里飘着淡淡的爆米花味——CGV影城就在前面。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去CGV影城",
        nextScene: "新达汇-4F电影院大厅",
        effect: updateTime(1),
      },
      {
        text: "继续到南走廊尽头",
        nextScene: "新达汇-4F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中庭去北走廊",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-4F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F南走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fSouth.png */,
    onEnter: function(v) { transit(v, "4F-南走廊东"); return {}; },
    text: function(vars) {
      var desc = "4F南走廊东端。电梯厅就在前方——但走廊上有一滩从卫生间溢出来的污水，散发着刺鼻的臭气，横跨了整个路面。";
      desc += "\n" + describeZombieWave(vars);
      return desc;
    },
    choices: [
      {
        text: "踮脚踩着干的地方绕过去",
        nextScene: "新达汇-4F电梯厅",
        effect: updateTime(2),
      },
      {
        text: "憋气快步冲过去",
        nextScene: "新达汇-4F南走廊东-滑倒",
        effect: updateTime(1),
      },
      {
        text: "绕到北走廊东侧",
        nextScene: "新达汇-4F北走廊东",
        effect: updateTime(2),
      },
      {
        text: "往西走",
        nextScene: "新达汇-4F南走廊中",
        effect: updateTime(1),
      },
    ]
  },

  "新达汇-4F南走廊东-滑倒": {
    image: "images/placeholder.png" /* TODO: images/新达汇/4fSouth.png */,
    onEnter: { add: { chasedByZombies: 1, strength: -1 } },
    text: "你快步冲过污水区——但地面比看起来滑得多。你脚下一滑，手掌撑在地上才没摔倒，但溅起的水花和你的声音在走廊里回荡。",
    choices: [
      {
        text: "站起来去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-4F电梯厅",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F大渝火锅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/hotpotRestaurant.png */,
    text: function(vars) {
      if (vars._triedHotpot && !vars.hasCatSnack) return "大渝火锅的食材已经被你搜刮干净了。门口的零食台上倒还有几包小零食——但你已经拿过一包了。";
      if (vars._triedHotpot && vars.hasCatSnack) return "大渝火锅的食材已经被你搜刮干净了。";
      var desc = "你走进大渝火锅。冰柜里还有一些食材没完全坏掉。灶台还能用。\n门口等位区的零食台上散落着几包没拆封的零食——其中有一包脆脆炒米。";
      if (vars._backhallEntered) desc += "\n后厨通向一条后勤走廊——你之前去过那里。";
      return desc;
    },
    choices: [
      {
        text: "拿起那包脆脆炒米",
        nextScene: "新达汇-4F大渝火锅",
        effect: { set: { hasCatSnack: true }, add: { itemCount: 1 } },
        showCondition: "!hasCatSnack && !_triedHotpot",
      },
      {
        text: "煮一锅麻辣锅底——过瘾！",
        nextScene: "新达汇-4F火锅-麻辣",
        effect: updateTime(10),
        showCondition: "!_triedHotpot",
      },
      {
        text: "煮一锅番茄锅底——安全",
        nextScene: "新达汇-4F火锅-番茄",
        effect: updateTime(10),
        showCondition: "!_triedHotpot",
      },
      {
        text: "煮一锅菌菇锅底——养生",
        nextScene: "新达汇-4F火锅-菌菇",
        effect: updateTime(10),
        showCondition: "!_triedHotpot",
      },
      {
        text: "推开后厨门",
        nextScene: "新达汇-4F厨房后勤走廊",
        effect: updateTime(1),
      },
      {
        text: "不吃了，离开",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(1),
        showCondition: "!_triedHotpot",
      },
      {
        text: "离开",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(1),
        showCondition: "_triedHotpot",
      },
    ]
  },
  "新达汇-4F火锅-麻辣": {
    image: "images/placeholder.png" /* TODO: images/新达汇/hotpotRestaurant.png */,
    onEnter: { add: { strength: -1 }, set: { _triedHotpot: true } },
    text: "你涮了一片午餐肉——太久没吃辣，胃完全受不了。体力-1。",
    choices: [
      {
        text: "缓一缓，离开",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(5),
      },
    ]
  },
  "新达汇-4F火锅-番茄": {
    image: "images/placeholder.png" /* TODO: images/新达汇/hotpotRestaurant.png */,
    onEnter: { add: { strength: 1 }, set: { _triedHotpot: true } },
    text: "番茄锅底温和多了。吃了一顿饱饭。体力+1。",
    choices: [
      {
        text: "吃饱了，离开",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(5),
      },
    ]
  },
  "新达汇-4F火锅-菌菇": {
    image: "images/placeholder.png" /* TODO: images/新达汇/hotpotRestaurant.png */,
    onEnter: { add: { strength: 2 }, set: { _triedHotpot: true } },
    text: "菌菇汤底鲜甜暖胃。体力+2。",
    choices: [
      {
        text: "吃饱了，离开",
        nextScene: "新达汇-4F北走廊中",
        effect: updateTime(5),
      },
    ]
  },
  "新达汇-4F大米先生": {
    image: "images/placeholder.png" /* TODO: images/新达汇/riceRestaurant.png */,
    text: "门口堆满了等位椅。透过缝隙能看到白绿配色的装潢，暖木色桌椅，透明厨房隔断上贴着\"现炒现做\"。保温台上的菜盘已经凉透了。",
    choices: [
      {
        text: "离开",
        nextScene: "新达汇-4F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F日料店": {
    image: "images/placeholder.png" /* TODO: images/新达汇/japaneseRestaurant.png */,
    text: function(vars) {
      var desc = "吧台被砸了，清酒瓶碎了一地，地上满是碎玻璃和陶瓷片，踩上去咔嚓作响。脚下黏糊糊的——酒液浸透了地毯，走起来带出轻微的粘滞声。";
      if (!vars._catChasing && !vars._powerOut && vars._catFed && Math.random() < 0.3) {
        desc += "\n吧台上有一个轻盈的身影一闪而过——那只变异猫正蹲在碎酒瓶之间，舔舐着地上打翻的三文鱼碎。它看到你，叼起一块鱼肉跳下吧台，消失在阴影里。";
      }
      desc += "\n" + describeZombieWave(vars);
      return desc;
    },
    choices: [
      {
        text: "躲进吧台后面试试",
        nextScene: "新达汇-4F日料店-陷阱",
        showCondition: "chasedByZombies >= 2",
      },
      {
        text: "绕到吧台后面看看后厨",
        nextScene: "新达汇-4F日料店-陷阱",
        showCondition: "chasedByZombies <= 1",
      },
      {
        text: "推开后厨的防火门",
        nextScene: "新达汇-4F厨房后勤走廊",
        effect: updateTime(1),
      },
      {
        text: "离开",
        nextScene: "新达汇-4F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F日料店-陷阱": {
    image: "images/placeholder.png" /* TODO: images/新达汇/japaneseRestaurant.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: function(vars) {
      var desc = "你小心地绕过地上的碎玻璃，翻进吧台后面。还没站稳，脚底传来一声清脆的碎裂声——你踩到了一块埋在阴影里的碎瓷片。\n声音在狭小的日料店里格外响亮，甚至还有回音。";
      if (vars.chasedByZombies >= 3) {
        desc += "\n你听到店外传来急促的脚步声——它们听到了。你只能从后门翻出去，绕了一圈才回到走廊上。碎玻璃满地都是，根本无处下脚。";
      } else {
        desc += "\n你僵在原地，屏住呼吸。过了好一会儿，外面没有什么反应——但你已经不太想在这个满地碎玻璃的地方多待了。";
      }
      desc += "\n<span style='color: #ffaa00;'>踩到碎瓷片的声音引来了注意。</span>";
      return desc;
    },
    choices: [
      {
        text: "离开日料店",
        nextScene: "新达汇-4F南走廊西",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-4F电影院大厅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/cinemaLobby.png */,
    onEnter: { add: { chasedByZombies: 1 } },
    text: "影城的玻璃感应门在你靠近时无声打开——它居然还有电。伴随着一声低沉的电子提示音，你的身影被门框上的摄像头捕捉到了。\n售票处电子屏还在闪烁，爆米花撒了一地。影厅走廊延伸向黑暗深处。",
    choices: [
      {
        text: "走进影厅走廊",
        nextScene: "新达汇-4F影厅走廊",
        effect: updateTime(1),
      },
      {
        text: "离开",
        nextScene: "新达汇-4F南走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F影厅走廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/cinemaHallway.png */,
    text: "暗红色地毯，墙上挂着电影海报。3号厅的门半开着。",
    choices: [
      {
        text: "进3号放映厅",
        nextScene: "新达汇-4F放映厅3",
        effect: updateTime(1),
      },
      {
        text: "前往大厅",
        nextScene: "新达汇-4F电影院大厅",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F放映厅3": {
    image: "images/placeholder.png" /* TODO: images/新达汇/theater3.png */,
    text: "银幕上定格着《飞驰人生3》的片尾字幕。最后一排的角落有什么东西蜷缩着——没有动。",
    choices: [
      {
        text: "悄悄退出",
        nextScene: "新达汇-4F影厅走廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F扶梯组": {
    image: "images/placeholder.png" /* TODO: images/新达汇/escalator.png */,
    onEnter: function(v) { transit(v, "4F-扶梯组"); return {}; },
    text: "停运的扶梯，当楼梯用。",
    choices: [
      {
        text: "上5F",
        nextScene: "新达汇-5F北走廊西",
        effect: updateTime(2, { add: { strength: -1 } }),
      },
      {
        text: "下3F",
        nextScene: "新达汇-3F中庭环廊",
        effect: updateTime(2),
      },
      {
        text: "回到中庭",
        nextScene: "新达汇-4F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F电梯厅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/elevatorHall.png */,
    text: function(vars) {
      if (vars._powerOut) return "电梯厅一片死寂。";
      return "按钮面板上B1、1F、2F、3F、5F的按键都还亮着。";
    },
    choices: [
      {
        text: "下1F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-1F中庭"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下2F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-2F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下3F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-3F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "上5F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-5F北走廊西"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下B1",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-B1美食广场"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-4F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "前往环廊",
        nextScene: "新达汇-4F中庭环廊",
        effect: updateTime(1),
      },
    ]
  },

  // ==================== 5F 特色餐饮层（日字型走廊） ====================
  "新达汇-5F北走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/5fCorridor.png */,
    onEnter: function(v) { transit(v, "5F-北走廊西"); return {}; },
    text: function(vars) { return "5F北走廊西段。走廊比下面几层窄一些，天花板也低了些。石物恋·烧肉和左庭右院就在前面。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去石物恋·烧肉",
        nextScene: "新达汇-5F食物恋",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-5F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "去南走廊西侧",
        nextScene: "新达汇-5F南走廊西",
        effect: updateTime(1),
      },
      {
        text: "走扶梯下4F",
        nextScene: "新达汇-5F扶庭组",
        effect: updateTime(2),
      },
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-5F电梯厅",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F扶梯组": {
    image: "images/placeholder.png" /* TODO: images/新达汇/escalator.png */,
    onEnter: function(v) { transit(v, "5F-扶梯组"); return {}; },
    text: "停运的扶梯，当楼梯用。",
    choices: [
      {
        text: "下4F",
        nextScene: "新达汇-4F中庭环廊",
        effect: updateTime(2),
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-5F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F北走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/5fCorridor.png */,
    onEnter: function(v) { transit(v, "5F-北走廊中"); return {}; },
    text: function(vars) { return "5F北走廊中段。左庭右院的招牌在这里。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去左庭右院",
        nextScene: "新达汇-5F左庭右院",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-5F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中廊去南走廊",
        nextScene: "新达汇-5F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-5F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F北走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/5fCorridor.png */,
    onEnter: function(v) { transit(v, "5F-北走廊东"); return {}; },
    text: function(vars) { return "5F北走廊东端。消防通道从这里上屋顶。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "走消防通道去屋顶",
        nextScene: "新达汇-屋顶花园入口",
        effect: updateTime(2),
      },
      {
        text: "走消防通道下楼",
        nextScene: "新达汇-5F消防通道",
        effect: updateTime(1),
      },
      {
        text: "绕到南走廊东侧",
        nextScene: "新达汇-5F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-5F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F南走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/5fCorridor.png */,
    onEnter: function(v) { transit(v, "5F-南走廊西"); return {}; },
    text: function(vars) { return "5F南走廊西段。游戏厅的招牌灯还在闪烁。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去游戏厅",
        nextScene: "新达汇-5F游戏厅",
        effect: updateTime(1),
      },
      {
        text: "往东走",
        nextScene: "新达汇-5F南走廊中",
        effect: updateTime(1),
      },
      {
        text: "去北走廊西侧",
        nextScene: "新达汇-5F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F南走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/5fCorridor.png */,
    onEnter: function(v) { transit(v, "5F-南走廊中"); return {}; },
    text: function(vars) { return "5F南走廊中段。走廊旁有一个小型展示区，摆着一些商场改造前的历史照片。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "往东走",
        nextScene: "新达汇-5F南走廊东",
        effect: updateTime(1),
      },
      {
        text: "穿过中廊去北走廊",
        nextScene: "新达汇-5F北走廊中",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-5F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F南走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/5fCorridor.png */,
    onEnter: function(v) { transit(v, "5F-南走廊东"); return {}; },
    text: function(vars) { return "5F南走廊东端。电梯厅在这里。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去电梯厅",
        condition: "chasedByZombies <= 3",
        elseScene: "结局-电梯厅被围",
        nextScene: "新达汇-5F电梯厅",
        effect: updateTime(1),
      },
      {
        text: "绕到北走廊东侧",
        nextScene: "新达汇-5F北走廊东",
        effect: updateTime(1),
      },
      {
        text: "往西走",
        nextScene: "新达汇-5F南走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F食物恋": {
    image: "images/placeholder.png" /* TODO: images/新达汇/bbqRestaurant.png */,
    text: "石物恋·烧肉。电圈烤炉摆在桌上，冷藏柜门开着，里面的肉已经不冰了。地上有脚印。",
    choices: [
      {
        text: "推开后厨门",
        nextScene: "新达汇-5F后勤走廊",
        effect: updateTime(1),
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-5F北走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F左庭右院": {
    image: "images/placeholder.png" /* TODO: images/新达汇/hotpotRestaurant2.png */,
    text: function(vars){
      if (vars._deliveryCode) return "左庭右院里那份外卖你已经拿走了。";
      if (vars._powerOut) return "左庭右院的灯已经暗了，角落的打包台上放着一份外卖包裹。";
      if (vars.dd == 1) return "左庭右院。后厨的冰箱还在嗡嗡作响，门口放着一份外卖包裹。";
      return "你走进左庭右院。后厨冰箱还在嗡嗡作响，门口放着一份落满灰的外卖包裹。";
    },
    choices: [
      {
        text: "拿上那份外卖",
        nextScene: "新达汇-5F左庭右院-取外卖",
        effect: updateTime(1),
        showCondition: "!_deliveryCode",
      },
      {
        text: "推开后厨门",
        nextScene: "新达汇-5F后勤走廊",
        effect: updateTime(1),
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-5F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F左庭右院-取外卖": {
    image: "images/placeholder.png" /* TODO: images/新达汇/hotpotRestaurant2.png */,
    onEnter: { set: { _deliveryCode: "473829" }, add: { itemCount: 1 } },
    text: "包裹上贴着美团订单标签，取餐码：<b>473829</b>。送货地址：\"北青公路某号某室\"。",
    choices: [
      {
        text: "回到走廊",
        nextScene: "新达汇-5F北走廊中",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F游戏厅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/arcade.png */,
    text: function(vars) {
      let basicDes = "";
      if (vars._powerOut) basicDes += "游戏厅一片漆黑。街机和娃娃机的屏幕全都暗了。";
      else basicDes += "你走进游戏厅。抓娃娃机和街机的屏幕大多亮着。《拳皇97》定格在选人画面。电源居然还没断。";
      basicDes += "\n" + describeZombieWave(vars);
      return basicDes;
    },
    choices: [
      {
        text: "躲到娃娃机后面",
        nextScene: "新达汇-5F游戏厅-躲藏",
        showCondition: "chasedByZombies >= 2",
      },
      {
        text: "四处看看机台后面有什么",
        nextScene: "新达汇-5F游戏厅-躲藏",
        showCondition: "chasedByZombies <= 1",
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-5F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F游戏厅-躲藏": {
    image: "images/placeholder.png" /* TODO: images/新达汇/arcade.png */,
    onEnter: updateTime(30, { add: { chasedByZombies: -1 } }),
    text: function(vars) {
      var desc = "你绕到一排娃娃机后面，蹲下来缩在机器和墙壁之间的缝隙里。";
      if (vars._powerOut) {
        desc += "黑暗中你只能听着自己的呼吸声。过了很久，外面终于安静了。";
      } else {
        desc += "街机的屏幕在你身旁闪烁着微光，发出嗡嗡的电流声。几台机器上还残留着没被拿走的游戏币。过了很久，外面的脚步声终于远去了。";
      }
      return desc + "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你甩掉了一些追兵。当前尸潮等级：{chasedByZombies}。</span>";
    },
    choices: [
      {
        text: "从缝隙里钻出来",
        nextScene: "新达汇-5F南走廊西",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F电梯厅": {
    image: "images/placeholder.png" /* TODO: images/新达汇/elevatorHall.png */,
    text: function(vars) {
      if (vars._powerOut) return "5F的电梯厅一片死寂。";
      return "按钮面板上B1、1F、2F、3F、4F的按键都还亮着。";
    },
    choices: [
      {
        text: "下1F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-1F中庭"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下2F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-2F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下3F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-3F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下4F",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-4F中庭环廊"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "下B1",
        nextScene: "新达汇-电梯途中",
        effect: function(v) { v._elevatorTarget = "新达汇-B1美食广场"; return updateTime(1)(v, ""); },
        showCondition: "!_powerOut",
      },
      {
        text: "走扶梯",
        nextScene: "新达汇-5F扶梯组",
        effect: updateTime(1),
      },
      {
        text: "回到走廊",
        nextScene: "新达汇-5F北走廊西",
        effect: updateTime(1),
      },
    ]
  },

  // ==================== 屋顶 ====================
  "新达汇-屋顶花园入口": {
    image: "images/placeholder.png" /* TODO: images/新达汇/roofEntrance.png */,
    text: "你推开消防门，走出楼道。外面是一扇铁栅栏门——没有上锁。",
    choices: [
      {
        text: "推开铁门，走上屋顶",
        nextScene: "新达汇-屋顶花园",
        effect: updateTime(1),
      },
      {
        text: "前往5F",
        nextScene: "新达汇-5F北走廊东",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-屋顶花园": {
    image: "images/placeholder.png" /* TODO: images/新达汇/roofGarden.png */,
    text: function(vars) {
      var desc = "你站在新达汇的屋顶花园。视野豁然开朗。中央有一个小型直升机停机坪——旁边停放着一架白色的外卖无人机。";
      if (vars._powerOut && vars._droneBattery <= 0) desc += "\n无人机指示灯已灭，电池彻底耗尽。";
      else if (vars._powerOut) desc += "\n无人机指示灯显示剩余约" + Math.ceil(vars._droneBattery / 2) + "分钟。";
      else desc += "\n无人机充电底座亮着绿灯——充满电了。";
      return desc + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "用手机扫描无人机二维码",
        nextScene: "新达汇-屋顶花园-扫码",
        effect: updateTime(1),
        showCondition: "hasPhone &&  (_droneBattery > 0 || !_powerOut)",
      },
      {
        text: "无人机电池已耗尽",
        nextScene: "新达汇-屋顶花园-没电",
        showCondition: "hasPhone && _droneBattery <= 0 && _powerOut",
      },
      {
        text: "走近看看那架无人机",
        nextScene: "新达汇-屋顶花园-看无人机",
        effect: updateTime(1),
        showCondition: "!hasPhone",
      },
      {
        text: "前往入口",
        nextScene: "新达汇-屋顶花园入口",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-屋顶花园-看无人机": {
    image: "images/placeholder.png" /* TODO: images/新达汇/roofGarden.png */,
    text: "白色的外卖无人机，货箱密封，侧面贴着二维码。你没有手机能扫它。",
    choices: [
      {
        text: "返回",
        nextScene: "新达汇-屋顶花园",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-屋顶花园-扫码": {
    image: "images/placeholder.png" /* TODO: images/新达汇/roofGarden.png */,
    text: function(vars) {
      var desc = "APP弹出对话框：**请验证取餐码**。\n";
      if (vars._powerOut && vars._droneBattery <= 0) return desc + "无人机指示灯已熄灭了。晚了。";
      return desc;
    },
    choices: [
      {
        text: "输入取餐码",
        input: { placeholder: "六位取餐码", maxLength: 6 },
        condition: { _input: "473829" },
        elseScene: "新达汇-屋顶花园-输错码",
        nextScene: "新达汇-屋顶花园-起飞",
        showCondition: "!(_droneBattery <= 0 && _powerOut)",
      },
      {
        text: "……来晚了",
        nextScene: "新达汇-屋顶花园",
        showCondition: "_droneBattery <= 0 && _powerOut",
      },
      {
        text: "先不输入",
        nextScene: "新达汇-屋顶花园",
        showCondition: "!(_droneBattery <= 0 && _powerOut)",
      },
    ]
  },
  "新达汇-屋顶花园-输错码": {
    image: "images/placeholder.png" /* TODO: images/新达汇/roofGarden.png */,
    text: "取餐码错误。",
    choices: [
      {
        text: "再试一次",
        nextScene: "新达汇-屋顶花园-扫码",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-屋顶花园-没电": {
    image: "images/placeholder.png" /* TODO: images/新达汇/roofGarden.png */,
    text: "无人机指示灯完全熄灭，看来是飞不起来了。",
    choices: [
      {
        text: "返回",
        nextScene: "新达汇-屋顶花园",
      },
    ]
  },
  "新达汇-屋顶花园-起飞": {
    image: "images/placeholder.png" /* TODO: images/新达汇/roofGarden.png */,
    text: "取餐码正确。货箱解锁。你爬进货箱，无人机缓缓升起。\n你飞越了新达汇的喷泉广场、三林路的十字路口，飞过华夏西路高架桥上的尸潮——飞向某个未知的方向。\n\
<span style='color: #f8d305ff;'>—— 无人机的救赎 · 好结局 ——</span>",
    style: "text-align: center;",
    choices: [
      {
        text: "重新开始",
        nextScene: "start",
      },
    ]
  },

  // ==================== 东区 ====================
  "新达汇-东区天桥1": {
    image: "images/placeholder.png" /* TODO: images/新达汇/eastBridge.png */,
    onEnter: function(v) { transit(v, "东区-天桥1"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "玻璃顶的空中连廊，连接西区2F和东区。脚下能看到地面的广场。\n" + (!vars._catChasing && !vars._powerOut && vars._catFed && Math.random() < 0.3 ? "头顶的玻璃顶上传来轻轻的脚步声——那只变异猫正走在天桥外侧的玻璃上，像在走T台。它经过你的正上方时停了一下，低头看了看你，然后继续向前走去。\n" : "") + describeZombieWave(vars); },
    choices: [
      {
        text: "去哥哥的深夜食堂",
        nextScene: "新达汇-哥哥的深夜食堂",
        effect: updateTime(1),
      },
      {
        text: "去东区2F平台",
        nextScene: "新达汇-东区2F平台",
        effect: updateTime(1),
      },
      {
        text: "前往西区2F",
        nextScene: "新达汇-2F中庭环廊",
        effect: updateTime(3),
      },
      {
        text: "下楼去喷泉广场",
        nextScene: "新达汇-喷泉广场",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-东区天桥2": {
    image: "images/placeholder.png" /* TODO: images/新达汇/eastBridge2.png */,
    onEnter: function(v) { transit(v, "东区-天桥2"); return {}; },
    qte: mallQTE(10000, "结局-丧尸的围殴"),
    text: function(vars) { return "连接西区3F和东区的天桥，玻璃顶上有几道裂纹。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "去东区3F平台",
        nextScene: "新达汇-东区3F平台",
        effect: updateTime(1),
      },
      {
        text: "前往西区3F",
        nextScene: "新达汇-3F南走廊东",
        effect: updateTime(3),
      },
    ]
  },
  "新达汇-哥哥的深夜食堂": {
    image: "images/placeholder.png" /* TODO: images/新达汇/izakaya.png */,
    text: function(vars) {
      if (vars._yorozuyaUnlocked) return "你在哥哥的深夜食堂里，门锁好了，很安静。";
      return "门上一把U型锁。锁孔的形状跟你找到的那把钥匙好像匹配。";
    },
    choices: [
      {
        text: "用钥匙开锁",
        nextScene: "新达汇-哥哥的深夜食堂-解锁",
        effect: updateTime(1),
        showCondition: "hasDoorKey1 && !_yorozuyaUnlocked",
      },
      {
        text: "在店里休息一会儿",
        nextScene: "新达汇-哥哥的深夜食堂-休息",
        showCondition: "_yorozuyaUnlocked",
      },
      {
        text: "锁好门离开",
        nextScene: "新达汇-东区天桥1",
        effect: updateTime(1),
        showCondition: "_yorozuyaUnlocked",
      },
      {
        text: "前往天桥",
        nextScene: "新达汇-东区天桥1",
        effect: updateTime(1),
        showCondition: "!_yorozuyaUnlocked",
      },
    ]
  },
  "新达汇-哥哥的深夜食堂-解锁": {
    image: "images/placeholder.png" /* TODO: images/新达汇/izakaya.png */,
    onEnter: { set: { _yorozuyaUnlocked: true } },
    text: "你掏出那把全家捡来的钥匙，插进去轻轻一转——门开了。你从里面挂上门链。",
    choices: [
      {
        text: "熟悉一下环境",
        nextScene: "新达汇-哥哥的深夜食堂",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-哥哥的深夜食堂-休息": {
    image: "images/placeholder.png" /* TODO: images/新达汇/izakaya.png */,
    text: "你在吧台前坐下，喝了一瓶饮料。这里很安静。",
    choices: [
      {
        text: "前往天桥",
        nextScene: "新达汇-东区天桥1",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-东区2F平台": {
    image: "images/placeholder.png" /* TODO: images/新达汇/eastPlatform2f.png */,
    onEnter: function(v) { transit(v, "东区-2F平台"); return {}; },
    text: function(vars) { return "东区2F开放式平台，可以看到喷泉广场的全景。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "前往天桥1",
        nextScene: "新达汇-东区天桥1",
        effect: updateTime(1),
      },
      {
        text: "坐东区电梯上3F",
        nextScene: "新达汇-东区3F平台",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-东区3F平台": {
    image: "images/placeholder.png" /* TODO: images/新达汇/eastPlatform3f.png */,
    onEnter: function(v) { transit(v, "东区-3F平台"); return {}; },
    text: function(vars) { return "东区3F平台。视野开阔，可以看到远处的屋顶花园。\n" + describeZombieWave(vars); },
    choices: [
      {
        text: "前往天桥2",
        nextScene: "新达汇-东区天桥2",
        effect: updateTime(1),
      },
      {
        text: "坐东区电梯下2F",
        nextScene: "新达汇-东区2F平台",
        effect: updateTime(1),
      },
    ]
  },

  // ==================== 垂直交通中间场景 ====================
  "新达汇-电梯途中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/elevatorInterior.png */,
    onEnter: function(vars) {
      if (vars.chasedByZombies <= 1) {
        vars.chasedByZombies = Math.min(5, vars.chasedByZombies + 1);
      }
      return {};
    },
    text: function(vars) {
      if (vars.chasedByZombies <= 1) {
        return "你走进电梯，按下了楼层的按钮。电梯门缓缓合上。\n电梯上升途中，机械的嗡鸣在井道里回荡。叮——电梯到达了目标楼层，提示音在空旷的商场里格外刺耳。门开了——走廊里几只丧尸齐刷刷地转过头来。";
      }
      return "你走进电梯，按下了楼层的按钮。电梯门缓缓合上。\n电梯平稳地到达了目标楼层。叮——一声短促的提示音后，门开了。走廊里还算安静。";
    },
    choices: [
      {
        text: "走出电梯",
        nextScene: "{_elevatorTarget}",
      },
    ]
  },
  "新达汇-货梯途中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/freightElevator.png */,
    onEnter: function(vars) {
      if (vars.chasedByZombies >= 4) {
        vars.chasedByZombies = Math.max(0, vars.chasedByZombies - 1);
      }
      if (vars._powerOut) {
        vars.mm += 4;
        vars.hh += Math.floor(vars.mm / 60);
        vars.mm %= 60;
        vars.dd += Math.floor(vars.hh / 24);
        vars.hh %= 24;
      }
      return {};
    },
    text: function(vars) {
      if (vars._powerOut) {
        var desc = "你走进货梯，拉上铁栅栏门。电梯没电了，应急灯发出昏暗的光，运行速度明显比平时慢了很多。\n货梯吱吱嘎嘎地上升，井道里回荡着铁链和齿轮的摩擦声。花了比平时多一倍的时间，货梯才终于停稳。";
        if (vars.chasedByZombies >= 4) desc += "\n厚重的货梯门隔音效果不错——升降过程中外面的声音越来越远，你感觉追兵被甩掉了一些。";
        return desc;
      }
      var desc = "你走进货梯，拉上铁栅栏门，按下了楼层的按钮。货梯吱吱嘎嘎地上升，没有电子提示音，只有铁链和齿轮的摩擦声。";
      if (vars.chasedByZombies >= 4) {
        desc += "\n货梯门比看起来厚重得多。外面的撞门声变得沉闷而遥远——它们进不来。你感觉追兵被甩掉了一些。";
      }
      return desc;
    },
    choices: [
      {
        text: "拉开铁栅栏门，走出去",
        nextScene: "{_elevatorTarget}",
        effect: updateTime(1),
      },
    ]
  },
  "结局-电梯厅被围": {
    image: "images/zombieKnockYouDown.png",
    text: "你朝电梯厅的方向走去。但前方的通道里传来了密集的脚步声——一群丧尸从电梯厅的方向涌了出来。\n它们太多了。你转身想跑，但身后的退路也被截断了。\n尸潮从前后两个方向同时涌来，你被堵在了走廊中间。\n\
—— 结局：电梯厅被围 ——"
  },

  // ==================== 后勤通道网 ====================

  // ---- B1层 ----
  "新达汇-B1后勤走廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    onEnter: function(v) {
      if (v.chasedByZombies >= 4) { v._backhallDead = true; return {}; }
      if (v.chasedByZombies <= 1) v.chasedByZombies = 0;
      else if (v.chasedByZombies == 2) v.chasedByZombies = 1;
      return {};
    },
    text: function(v) { return "你推开防火门，走进一条狭窄的后勤走廊。头顶的管道裸露着，凝结的水珠偶尔滴落在地上，发出清晰的啪嗒声。应急灯发出惨白的光，照出墙面上斑驳的油渍和霉斑。\n" + (v.chasedByZombies <= 1 ? "<span style='color: #00fbffff;'>你反手把防火门轻轻带上——门锁咔哒一声扣死。外面的声音一下子被隔开了，这里很安全。</span>" : v.chasedByZombies == 2 ? "<span style='color: #ffaa00;'>身后的防火门被什么东西撞了一下，闷响了一声。你加快脚步拐了两个弯，追兵被岔路搞糊涂了——甩掉了不少。</span>" : "") + describeZombieWave(v); },
    choices: [
      {
        text: "推开旁边设备间的门进去看看",
        nextScene: "新达汇-B1设备间",
        effect: updateTime(2),
      },
      {
        text: "沿着走廊往前走向垃圾清运区",
        nextScene: "新达汇-B1垃圾清运通道",
        effect: updateTime(2),
      },
      {
        text: "推开防火门进入美食广场",
        nextScene: "新达汇-B1美食广场",
        effect: updateTime(1),
      },
    ],
  },
  "新达汇-B1设备间": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: "你推开一扇半掩的铁门，走进一间设备间。几台锈蚀的空调主机嗡嗡作响，管道从天花板穿过，上面贴着褪色的标签。墙角的工具架上散落着几把扳手和螺丝刀——都是固定在地面上。旁边挂着一本翻开的设备巡检记录表。",
    choices: [
      {
        text: "翻开巡检记录表看看",
        nextScene: "新达汇-B1设备间-记录表",
        effect: updateTime(1),
      },
      {
        text: "回到后勤走廊",
        nextScene: "新达汇-B1后勤走廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-B1设备间-记录表": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: "设备巡检记录表——新达汇物业工程部：\n6/24 | 空调主机A-03 | 正常 | 王建国\n6/25 | 排水泵B-07 | 检修中 | 王建国\n6/25 | 配电房 | 锁芯更换 | 王建国\n6月25日是最后一页。之后全是空白。",
    choices: [
      {
        text: "合上记录表",
        nextScene: "新达汇-B1设备间",
      },
    ]
  },
  "新达汇-B1垃圾清运通道": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: function(v) { var d = "走廊在这里拐了一个弯，变得更窄了。墙上的应急灯有一盏不亮了，照得通道明暗交错。地面上有一层滑腻的污水渍，踩上去鞋底直打滑。\n\
前方有一堆倾倒的货架堵住了半边走廊——生锈的铁架横七竖八地卡在中间，只留出一条勉强能侧身挤过去的窄缝。";
      if (v.chasedByZombies > 0) d += "\n<span style='color: #ff4444;'>身后传来丧尸熟悉的脚步声——越来越近了，不知道是什么时候跟上来的。你没有时间犹豫。</span>"; 
    return d; },
    choices: [
      {
        text: "钻进那间昏暗的房间看看",
        nextScene: "新达汇-B1废弃仓库",
        effect: updateTime(2),
      },
      {
        text: "屏住呼吸，从窄缝中一点一点挤过去",
        nextScene: "新达汇-B1消防通道",
        effect: updateTime(3),
        condition: "chasedByZombies == 0",
        elseScene: "结局-后勤通道暗算",
      },
      {
        text: "咬咬牙——从窄缝硬挤过去",
        nextScene: "结局-后勤通道暗算",
        showCondition: "chasedByZombies > 0",
      },
      {
        text: "沿着来路走回去",
        nextScene: "新达汇-B1后勤走廊",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-B1废弃仓库": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: "你走进一间废弃的小仓库。配电箱的盖板掉在地上，几根电线裸露在外。墙角堆着几个落满灰的纸箱和几袋水泥——水泥已经完全结块了。靠墙还有一个老旧的工具箱，盖子上用记号笔写着\"王建国\"。",
    choices: [
      {
        text: "翻开墙角那几个纸箱看看",
        nextScene: "新达汇-B1废弃仓库-纸箱",
        effect: updateTime(1),
      },
      {
        text: "打开那个老旧的工具箱",
        nextScene: "新达汇-B1废弃仓库-工具箱",
        effect: updateTime(1),
        showCondition: "!hasCutter",
      },
      {
        text: "回到垃圾清运通道",
        nextScene: "新达汇-B1垃圾清运通道",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-B1废弃仓库-纸箱": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: "你打开纸箱——过期的五金店收据、几卷用过的胶带、一团揉皱的报纸。没什么值钱的东西。",
    choices: [
      {
        text: "继续翻看别的",
        nextScene: "新达汇-B1废弃仓库",
      },
    ]
  },
  "新达汇-B1废弃仓库-工具箱": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: function(vars) {
      if (vars.hasCutter) return "工具箱的盖子敞着，里面已经空了。把手旁那个\"王\"字还留在盖子上。";
      return "你掀开工具箱的盖子。里面躺着一把美工刀——刀刃有些锈迹，但刀片还能换。把手旁边用记号笔写着一个\"王\"字。";
    },
    onEnter: { set: { positionAfterOperation: "新达汇-B1废弃仓库" } },
    choices: [
      {
        showCondition: "!hasCutter",
        text: "拿起美工刀",
        nextScene: "新达汇-B1废弃仓库",
        effect: { set: { hasCutter: true }, add: { itemCount: 1 } },
        condition: "itemCount < bagVolume",
        elseScene: "整理整理",
      },
      {
        text: "不拿",
        nextScene: "新达汇-B1废弃仓库",
      },
    ]
  },

  // ---- 1F层 ----
  "新达汇-1F后勤走廊西": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall1f.png */,
    onEnter: function(v) {
      transit(v, "1F-后勤走廊西");
      v._backhallEntered = true;
      if (v.chasedByZombies >= 4) { v._backhallDead = true; return {}; }
      if (v.chasedByZombies <= 1) v.chasedByZombies = 0;
      else if (v.chasedByZombies == 2) v.chasedByZombies = 1;
      return {};
    },
    text: function(v) { return "你推开味千拉面后厨的铁门，走进一条窄长的后勤走廊。地面上有几道深深的车辙印——是运货推车反复碾压留下的。头顶的灯管忽明忽暗，发出轻微的嗡鸣。走廊向前延伸，拐过一个弯消失在视线外。\n" + (v.chasedByZombies <= 1 ? "<span style='color: #00fbffff;'>你回头把铁门带上——门锁卡进了门框。外面的声音一下子被隔开了，这里很安全。</span>" : v.chasedByZombies == 2 ? "<span style='color: #ffaa00;'>你刚走进来，身后的铁门就被撞得哐哐响。你快步拐过一个弯，声响渐远——追兵被狭窄的走廊拖住了。</span>" : "") + describeZombieWave(v); },
    choices: [
      {
        text: "沿着走廊往前走——通向商场方向",
        nextScene: "新达汇-1F后勤走廊中",
        effect: updateTime(2),
      },
      {
        text: "回到味千拉面后厨",
        nextScene: "新达汇-1F味千拉面",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-1F后勤走廊中": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall1f.png */,
    onEnter: function(v) { transit(v, "1F-后勤走廊中"); return {}; },
    text: "走廊在这里分出了几条岔路。左侧墙上有一扇标着\"仓库\" 的门，门半掩着。正前方是一道普通的白色防火门，上面贴着\"通往商场\" 的标签。右侧的墙上有一扇同样的防火门，写着\"消防通道\"。",
    choices: [
      {
        text: "推开右侧的防火门——进入消防通道",
        nextScene: "新达汇-1F消防通道",
        effect: updateTime(1),
      },
      {
        text: "推开前方的门——通向商场北走廊",
        nextScene: "新达汇-1F北走廊西",
        effect: updateTime(1),
      },
      {
        text: "推开仓库的门进去看看",
        nextScene: "新达汇-1F后勤仓库",
        effect: updateTime(1),
      },
      {
        text: "走廊另一头——通向味千拉面方向",
        nextScene: "新达汇-1F后勤走廊西",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-1F后勤仓库": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall1f.png */,
    text: "你推开门。这是一间小型储物仓库，货架上堆着一些落满灰的清洁用品和几箱矿泉水。矿泉水箱上放着一瓶已经开封的——看起来是某个员工留下的。",
    choices: [
      {
        text: "回到后勤走廊",
        nextScene: "新达汇-1F后勤走廊中",
        effect: updateTime(1),
      },
    ]
  },

  // ---- 2F层 ----
  "新达汇-2F后勤走廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall2f.png */,
    onEnter: function(v) {
      transit(v, "2F-后勤走廊");
      if (v.chasedByZombies >= 4) { v._backhallDead = true; return {}; }
      if (v.chasedByZombies <= 1) v.chasedByZombies = 0;
      else if (v.chasedByZombies == 2) v.chasedByZombies = 1;
      return {};
    },
    text: function(v) { return "你从服装店的员工间走出来，站在2F的后勤走廊上。这里比下面几层干燥，地面上铺着防滑地砖，墙上每隔几米就有一盏应急灯。走廊很安静——能听到远处中庭隐约的回音。\n" + (v.chasedByZombies <= 1 ? "<span style='color: #00fbffff;'>员工间的门在你背后自动合上了——弹簧锁扣死了。走廊空荡荡的，只有应急灯的嗡鸣声。</span>" : v.chasedByZombies == 2 ? "<span style='color: #ffaa00;'>你关好员工间的门，脚步声在走廊里回荡了几秒。追你的丧尸被关在了另一边——至少撤退了一些。</span>" : "") + describeZombieWave(v); },
    choices: [
      {
        text: "去走廊另一头的杂物间看看",
        nextScene: "新达汇-2F杂物间",
        effect: updateTime(2),
      },
      {
        text: "推开消防通道的门",
        nextScene: "新达汇-2F消防通道",
        effect: updateTime(1),
      },
      {
        text: "推开员工间的门进入服装店",
        nextScene: "新达汇-2F服装店",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F杂物间": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall2f.png */,
    text: "你推开杂物间的门。里面堆满了废弃的衣架、模特假人的断肢和几卷落满灰的地毯。墙上贴着一张褪色的海报——是两年前商场的周年庆活动。角落里有一个铁皮柜，柜门上挂着一把弹子锁。旁边还塞着一个皱巴巴的帆布包。",
    choices: [
      {
        text: "翻一翻那个帆布包",
        nextScene: "新达汇-2F杂物间-帆布包",
        effect: updateTime(1),
        showCondition: "!hasBag",
      },
      {
        text: "看看铁皮柜里有什么",
        nextScene: "新达汇-2F杂物间-铁皮柜",
        effect: updateTime(2),
      },
      {
        text: "回到后勤走廊",
        nextScene: "新达汇-2F后勤走廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-2F杂物间-帆布包": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall2f.png */,
    text: "你抖了抖帆布包上的灰。布料很结实，背带也没断——可能是哪个店员放在这里的。容量不大不小，正好可以多装一件东西。",
    onEnter: { set: { positionAfterOperation: "新达汇-2F杂物间" } },
    choices: [
      {
        text: "背上帆布包",
        nextScene: "新达汇-2F杂物间",
        effect: { set: { hasBag: true }, add: { bagVolume: 1 } },
      },
      {
        text: "算了",
        nextScene: "新达汇-2F杂物间",
      },
    ]
  },
  "新达汇-2F杂物间-铁皮柜": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall2f.png */,
    text: "你试着拉了拉铁皮柜的门——锁得很紧。弹子锁上没有钥匙。你透过柜门缝隙往里瞄了一眼——空的。",
    choices: [
      {
        text: "继续翻看",
        nextScene: "新达汇-2F杂物间",
      },
    ]
  },
  // ---- 3F层 ----
  "新达汇-3F后勤走廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall3f.png */,
    onEnter: function(v) { transit(v, "3F-后勤走廊"); return {}; },
    text: function(v) { var d = "你走进3F的后勤走廊。这里比下面几层更暗——有两盏应急灯坏了，走廊的中段几乎完全淹没在阴影里。\n\
阴影的深处站着一个摇摇晃晃的轮廓——一只穿着维修工服的丧尸堵在走廊正中间。它面朝着你，似乎还没看清——但窄走廊没有任何绕过去的空间。";
      if (v.chasedByZombies > 0) d += "\n<span style='color: #ff4444;'>身后传来窸窣的脚步声——你身后的动静让它停下了摇晃，缓缓转过头来。</span>";
    return d; },
    choices: [
      {
        text: "放轻脚步，贴着墙从它身边蹭过去",
        nextScene: "新达汇-3F后勤走廊东",
        effect: updateTime(3),
        condition: "chasedByZombies == 0",
        elseScene: "结局-后勤通道暗算",
      },
      {
        text: "拼一把——闭眼冲过去",
        nextScene: "结局-后勤通道暗算",
        showCondition: "chasedByZombies > 0",
      },
      {
        text: "推开消防通道的门",
        nextScene: "新达汇-3F消防通道",
        effect: updateTime(1),
      },
      {
        text: "推开右侧的门——进入金宝贝早教中心",
        nextScene: "新达汇-3F金宝贝早教中心",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F后勤走廊东": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall3f.png */,
    onEnter: function(v) { transit(v, "3F-后勤走廊东"); return {}; },
    text: "走廊在这里分出一条岔路。左边的门半开着，里面传出机械运转的低沉嗡鸣——是一间通风机房。右边的通道通向卡通尼乐园的员工区。",
    choices: [
      {
        text: "进通风机房看看",
        nextScene: "新达汇-3F通风机房",
        effect: updateTime(1),
      },
      {
        text: "进入卡通尼乐园员工区",
        nextScene: "新达汇-3F大型综合儿童乐园",
        effect: updateTime(2),
      },
      {
        text: "走廊另一头——通向金宝贝和消防通道",
        nextScene: "新达汇-3F后勤走廊",
        effect: updateTime(2),
      },
    ]
  },
  "新达汇-3F通风机房": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall3f.png */,
    text: "你走进通风机房。几台大型通风设备正在运转，发出低沉的轰鸣声。墙上挂着几根消防水管和灭火器。角落里有一个检修口，盖板松动着。靠墙还有一个铁架，上面散落着扳手、手套和几个瓶瓶罐罐。",
    choices: [
      {
        text: "走到铁架旁翻翻看有什么",
        nextScene: "新达汇-3F通风机房-铁架",
        effect: updateTime(1),
        showCondition: "!hasLubricant",
      },
      {
        text: "回到后勤走廊",
        nextScene: "新达汇-3F后勤走廊东",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-3F通风机房-铁架": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall3f.png */,
    text: "你走到铁架旁翻找。扳手——用不上。手套——破了一个洞。角落里还有一罐WD-40防锈润滑剂，罐身上沾着油渍和灰尘。看样子是维修工保养风机轴承时剩下的。",
    onEnter: { set: { positionAfterOperation: "新达汇-3F通风机房" } },
    choices: [
      {
        text: "拿起润滑油",
        nextScene: "新达汇-3F通风机房",
        effect: { set: { hasLubricant: true }, add: { itemCount: 1 } },
        condition: "itemCount < bagVolume",
        elseScene: "整理整理",
      },
      {
        text: "放下",
        nextScene: "新达汇-3F通风机房",
      },
    ]
  },

  // ---- 4F层 ----
  "新达汇-4F厨房后勤走廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall4f.png */,
    onEnter: function(v) {
      transit(v, "4F-厨房后勤走廊");
      if (v.chasedByZombies >= 4) { v._backhallDead = true; return {}; }
      if (v.chasedByZombies <= 1) v.chasedByZombies = 0;
      else if (v.chasedByZombies == 2) v.chasedByZombies = 1;
      return {};
    },
    text: function(v) { return "你走进一条宽敞的后勤通道——两旁的墙壁上覆盖着不锈钢板，头顶是密集的排烟管道和消防喷淋头。空气里混杂着油脂、辣油和花椒的气味，像被凝固在了时间里。\n" + (v.chasedByZombies <= 1 ? "<span style='color: #00fbffff;'>身后的防火门在排烟管道的轰鸣中合上了。这条走廊——干净、干燥、空旷。追兵被挡在了门外。</span>" : v.chasedByZombies == 2 ? "<span style='color: #ffaa00;'>身后的防火门被狠狠撞了一下，闷响混在排风管的嗡鸣里。你加快脚步走了几段，撞门声渐渐稀疏了。</span>" : "") + describeZombieWave(v); },
    choices: [
      {
        text: "去看看走廊尽头的仓库",
        nextScene: "新达汇-4F后勤仓库",
        effect: updateTime(2),
      },
      {
        text: "推开消防通道的门",
        nextScene: "新达汇-4F消防通道",
        effect: updateTime(1),
      },
      {
        text: "推开日料店的后厨门",
        nextScene: "新达汇-4F日料店",
        effect: updateTime(1),
      },
      {
        text: "推开火锅店的后厨门",
        nextScene: "新达汇-4F大渝火锅",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-4F后勤仓库": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall4f.png */,
    text: "你推开走廊尽头的门，走进一间干货储藏室。货架上整齐地码放着几箱未开封的食用油、调味料和真空包装的大米——看起来是某个餐厅的备货仓库，还没来得及搬走。",
    choices: [
      {
        text: "回到厨房后勤走廊",
        nextScene: "新达汇-4F厨房后勤走廊",
        effect: updateTime(1),
      },
    ]
  },

  // ---- 5F层 ----
  "新达汇-5F后勤走廊": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall5f.png */,
    onEnter: function(v) {
      transit(v, "5F-后勤走廊");
      if (v.chasedByZombies >= 4) { v._backhallDead = true; return {}; }
      if (v.chasedByZombies <= 1) v.chasedByZombies = 0;
      else if (v.chasedByZombies == 2) v.chasedByZombies = 1;
      return {};
    },
    text: function(v) { return "5F的后勤走廊狭窄而低矮——天花板上的管道几乎要碰到头。隔墙传来管道里的滴答声——残留的油脂在水管里缓慢流动，像是什么东西在墙后面窃窃私语。走廊两侧各有一扇门，分别通向不同的餐厅后厨。\n" + (v.chasedByZombies <= 1 ? "<span style='color: #00fbffff;'>你反手关好后厨门——门锁卡进了门框。低矮的天花板和交错的管道让丧尸很难成群挤进来。暂时安全了。</span>" : v.chasedByZombies == 2 ? "<span style='color: #ffaa00;'>你冲进来关好门，追兵撞了几下门板后散开了大半——窄管道挡住了它们的来路。</span>" : "") + describeZombieWave(v); },
    choices: [
      {
        text: "去看看走廊尽头的清洁工具间",
        nextScene: "新达汇-5F清洁工具间",
        effect: updateTime(2),
      },
      {
        text: "推开消防通道的门",
        nextScene: "新达汇-5F消防通道",
        effect: updateTime(1),
      },
      {
        text: "推开左庭右院的后厨门",
        nextScene: "新达汇-5F左庭右院",
        effect: updateTime(1),
      },
      {
        text: "推开隔壁烧肉店的后厨门",
        nextScene: "新达汇-5F食物恋",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F清洁工具间": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall5f.png */,
    text: "你推开门——是一间清洁工具间。几把拖把靠墙立着，水桶里还残留着半桶浑浊的水，水面浮着一层灰白色的霉膜。墙上挂着一本保洁签到表，最后一次签名的日期是6月25日。签到表旁边用圆珠笔贴着一张皱巴巴的便条。",
    choices: [
      {
        text: "凑近看看那张便条",
        nextScene: "新达汇-5F清洁工具间-便条",
        effect: updateTime(1),
      },
      {
        text: "离开清洁工具间",
        nextScene: "新达汇-5F后勤走廊",
        effect: updateTime(1),
      },
    ]
  },
  "新达汇-5F清洁工具间-便条": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHall5f.png */,
    text: "便条上潦草地写着几行字：\n\"老王，你要是看到这张条，保安室那边有个工具箱，里面有把美工刀和一些工具。钥匙我放在配电房第三个抽屉里了。——小刘 6/26\"\n便条下面有人用更粗的圆珠笔补了一行歪歪扭扭的字：\n\"小刘已经不在了。我把工具箱拿到B1仓库了，你要是还活着，去那边找找。配电房的钥匙我也拿走了。——王建国 6/27\"\n便条的边角微微发黄，像是被水泡过。",
    choices: [
      {
        text: "继续查看",
        nextScene: "新达汇-5F清洁工具间",
      },
    ]
  },

  // ==================== 后勤通道即死结局 ====================
  "结局-后勤通道被堵": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: "你一头扎进后勤通道，反手甩上防火门。\n但外面的尸群太多了——门闩在撞击中呻吟了两秒，然后整扇门向内炸开。脚步声从四面八方涌来，在狭窄的走廊里反射成一片混乱的轰鸣。\n你跑过一个又一个岔路口，推开一扇又一扇门——\n最后一扇是锁死的。\n你转身时它们已经堵住了来路。\n—— 结局：困兽 ——"
  },
  "结局-后勤通道暗算": {
    image: "images/placeholder.png" /* TODO: images/新达汇/backHallB1.png */,
    text: "你试图在黑暗中屏住呼吸——但身后的脚步声出卖了你。\n窄走廊里无处可躲。身前是障碍，身后是追兵。狭窄的水泥墙把它们的嘶吼声压缩成了一道道针扎般的回音。\n\
—— 结局：后勤通道的暗算 ——"
  }
});

