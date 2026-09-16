// ========== 张江（洪金宝支线 · 第一梯队） ==========
// 设计依据：张江设计稿.md（L1 主线 / L2 特色 / L3 硬核分层，见 §一.6）。
// 用户指定：单文件 story/张江.js（不拆 story/张江/ 子目录）。
//
// 结构总览：
//   路网落点：北蔡镇罗山立交桥（上海市区路径.js，下高架）→ 张江-落地坡道 → 张江-人工智能岛闸机外（南岸枢纽）
//             张江立交桥下高架 → 张江-北岸落地 → 张江-河北岸-街口（L3，见文末块）
//   南岸：加油站（柴油来源①·L2） / 人工智能岛（科创老师·门禁卡·监控） / 上科大（曹睿泽宿舍）
//         华大半导体 fab（风淋状态机/白区/夹层/动力站·洪金宝，见后续块）
//   L3：川杨河南岸堤 → 川杨河大桥（3 段闪色各耗 1 弹，单向）→ 河北岸 → 上海市检测中心
//
// 知识分层（§八，勿在文本里向未获知者剧透）：
//   K0 未去过安居苑204 → 洪金宝自我介绍、反向委托；K1 去过 204 → 拷问触发；
//   K2 带标签瓶（hasBottle && _hongBottleLabel）→ 认瓶强制破题。
// 洪金宝撤离：computed _jinbaoLeft = dd >= (_dieselDelivered ? 6 : 5)（core.js 注册）。
// 本文件用到的变量需在 story/core.js _variables 的“张江”区块注册（见 core.js 内注释清单）。
// 图片全部占位，TODO 注释标出建议路径（用户生图后替换）。

// 标签瓶（老洪 204 的空瓶）是否会在动力站当场逼出「我爸呢」这道题：
// 需要他在场、且拷问还没发生过。灌水节点的 onEnter / text / choices 共用同一判断，别各写一份。
function isBottleConfront(vars) {
  return !!(vars._hongBottleLabel && vars._metJinbao && !vars._jinbaoLeft && vars._toldJinbaoTruth === "");
}

// 老陈还在白区工位B（见过、没谈完、没误杀）→ 动力站不该同时蹲着他。
function chenInWorkshop(vars) {
  return !vars._fabFigBKilled && !vars._fabFigBDone && vars._visit && vars._visit['张江-华大-白区-工位B'] > 0;
}

Object.assign(storyData, {

  // ==================== 路网落点（河南岸主线） ====================

  "张江-落地坡道": travelScene(
    "你贴着护栏走下匝道，坡道尽头横着一辆侧翻的电瓶车，你跨过去，踏上了张江的地面。\n\
匝道口立着一块蓝底白字的指示牌：人工智能岛 →，上海科技大学 ←。路对面是一座加油站，罩棚下几台加油机的显示屏全黑着。\n\
这一带是科技园区，楼都不高，玻璃幕墙干干净净——干净得像还没人来得及弄脏它。街上很静，静得能听见红绿灯变换时那一声轻微的咔哒。",
    "张江-人工智能岛闸机外",
    {
      image: "images/placeholder.png", /* TODO: images/张江/落地坡道.webp */
      outdoor: true,
      onEnter: function(vars) {
        vars.currentArea = "张江";
        vars.currentPlace = "人工智能岛";
        vars.currentPos = "闸机外";
        return updateTime(5)(vars);
      }
    }
  ),

  // ==================== 南岸枢纽：人工智能岛闸机外 ====================
  // 夜景亮楼落点（E3）：isNight 分支可见东边 fab 亮楼；_jinbaoLeft 后消失。

  "张江-人工智能岛闸机外": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/闸机外.webp（夜景版需能看见东边 fab 亮楼） */
    onEnter: function(vars) {
      vars.currentArea = "张江";
      vars.currentPlace = "人工智能岛";
      vars.currentPos = "闸机外";
    },
    text: function(vars) {
      var desc = "你站在人工智能岛的闸机外。闸机的挡板大敞着，断电之后就再没合上过。岛上一栋栋小楼围着一圈绿化带，大多黑着窗，只有风吹动招牌的轻响。";
      if (vars.isNight) {
        if (!vars._jinbaoLeft) {
          if (vars.dd >= 3) {
            desc += "\n夜色里，东边华大半导体那栋楼还亮着——只是只剩靠里侧的几排窗户透着光，隔着夜雾发闷，像一截烧到后半段的蜡烛。";
          } else {
            desc += "\n夜色里，东边华大半导体那栋楼亮着灯，白惨惨的一片。这一片死城里，就剩那一个有电的地方。";
          }
        } else {
          desc += "\n你往东看了一眼。那栋楼黑着，和整片园区融成一片——不知道里面的人，是什么时候走的。";
        }
      }
      desc += "\n" + describeWeather(vars);
      return desc;
    },
    choices: [
      { text: "过闸机，进园区", nextScene: "张江-AI岛-园区内", effect: updateTime(3) },
      { text: "往东，去华大半导体", nextScene: "张江-华大-大门", effect: updateTime(10) },
      { text: "往西，去上海科技大学", nextScene: "张江-上科大-校门", effect: updateTime(15) },
      { text: "往北，去川杨河边看看", nextScene: "张江-川杨河南岸堤", effect: updateTime(15) },
      { text: "往西南，去那座加油站", nextScene: "张江-加油站", effect: updateTime(8) },
      { text: "上高架，回西边", nextScene: "北蔡镇罗山立交桥", effect: updateTime(10) }
    ]
  },

  // ==================== 加油站（柴油来源① · L2） ====================

  "张江-加油站": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/加油站.webp */
    onEnter: function(vars) {
      vars.currentPlace = "张江";
      vars.currentPos = "加油站";
    },
    text: function(vars) {
      var desc = "你走到加油站跟前。罩棚下面四台加油机立着，油枪还插在座里，显示屏全黑了。\n\
便利店占着加油站的一角，玻璃门上贴着褪色的“24小时”。后场方向搭着一座铁皮棚，棚门半开，里面黑洞洞的。";
      return desc + "\n" + describeWeather(vars);
    },
    choices: [
      { text: "进便利店看看", nextScene: "张江-加油站-便利店", effect: updateTime(2) },
      { text: "绕到后场的铁皮棚", nextScene: "张江-加油站-棚子", effect: updateTime(2) },
      { text: "往东北，回闸机外", nextScene: "张江-人工智能岛闸机外", effect: updateTime(8) }
    ]
  },

  "张江-加油站-便利店": {
    image: "images/placeholder.png", /* TODO: images/张江/加油站-便利店.webp */
    onEnter: function(vars) { vars.currentPos = "加油站便利店"; },
    text: "便利店的玻璃门虚掩着，门铃还挂着，你推门进去，它哑哑地响了一声。\n\
货架被搬空了大半，地上滚着踩扁的薯片袋。收银机的抽屉开着，里面躺着几张没人要的零钱。冰柜早断了电，柜门里糊着一层化了又干的巧克力印子。\n\
柜台后面贴着值班表，最后一个签到的是 6 月 27 日晚班。",
    choices: [
      { text: "出去", nextScene: "张江-加油站", effect: updateTime(1) }
    ]
  },

  "张江-加油站-棚子": {
    image: "images/placeholder.png", /* TODO: images/张江/加油站-棚子.webp */
    onEnter: function(vars) { vars.currentPos = "加油站铁皮棚"; },
    text: function(vars) {
      var desc = vars.hasDieselCan
        ? "后场的铁皮棚半开着。棚子深处那几只铁皮油桶全空了，歪倒在一边——满的那只已经在你手上。"
        : "后场的铁皮棚半开着。棚子深处码着几只铁皮油桶，有的空了，歪倒在一边——但最里面那只立得笔直，你试着掂了掂把手，掂不动；摇一摇，里面哗啦作响，是满的。";
      if (!vars._gasShedZombieDead) {
        desc += "\n你刚要往里走，油桶后面的阴影里慢慢立起一个人形——穿着站里的工装外套，前襟一大片发黑的血迹。它转过头，朝你张开了嘴。";
      } else {
        desc += "\n那只穿工装的丧尸倒在油桶边上，不会再起来了。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._gasShedZombieDead) {
        cs.push({
          text: function(v) { return hasMeleeWeapon(v) ? "握紧" + meleeWeaponName(v) + "迎战" : "握紧拳头迎战"; },
          nextScene: "张江-加油站-棚子-战斗",
          effect: updateTime(1)
        });
        cs.push({ text: "退出去，别惊动它", nextScene: "张江-加油站", effect: updateTime(1) });
      } else {
        cs.push({
          showCondition: "!hasDieselCan",
          text: "拎起那只满的柴油桶",
          condition: "itemCount < bagVolume",
          nextScene: "张江-加油站-拎桶",
          effect: { set: { hasDieselCan: true }, add: { itemCount: 1 } },
          elseScene: "整理整理"
        });
        cs.push({ text: "离开棚子", nextScene: "张江-加油站", effect: updateTime(1) });
      }
      return cs;
    }
  },

  "张江-加油站-棚子-战斗": {
    image: "images/placeholder.png", /* TODO: images/张江/加油站-棚子-战斗.webp */
    onEnter: initMemoryGame(["红", "蓝", "绿"], 4),
    text: "它从油桶后面挤了出来，撞得空桶哐当乱响。棚子的铁皮墙把它的吼声放大了一圈。\n\
你后退半步，盯住它扑上来的节奏——躲开，还手，别被逼到角落里。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "张江-加油站-棚子-胜利",
        elseScene: "结局-张江-加油站",
        timeout: 9000,
        timeoutScene: "结局-张江-加油站"
      }
    ]
  },

  "张江-加油站-棚子-胜利": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._gasShedZombieDead = true;
      vars.positionAfterOperation = "张江-加油站-棚子";
      return updateTime(2)(vars);
    },
    text: "你侧身让过它的第一扑，顺势抄起手边一只空油桶，抡在它的后脑上。它栽进桶堆里，挣了两下，不动了。\n\
棚子里安静下来，只剩铁皮被风拍打的哐当声。",
    choices: [
      { text: "回去翻油桶", nextScene: "张江-加油站-棚子" }
    ]
  },

  "张江-加油站-拎桶": {
    image: "images/placeholder.png", /* TODO: images/张江/拎桶.webp */
    text: "你把那只满桶拖到棚门口，找了圈麻绳拴上把手，勒紧，拎了拎——死沉，但能背。\n\
一整桶柴油。这年头，有油就等于有电，有电就等于有别的一切。就是不知道这玩意儿现在能派上什么用场——先带着，总会有用得上的地方。",
    choices: [
      { text: "离开棚子", nextScene: "张江-加油站", effect: updateTime(1) }
    ]
  },

  "结局-张江-加油站": {
    image: "images/zombieKnockYouDown.webp",
    onEnter: function(vars) { tryBreakWeapon(vars); return {}; },
    text: function(vars) {
      return "你被它扑倒在加油机前的水泥地上，后脑磕在防撞柱上，眼前炸开一片金星。\n\
它趴在你身上，工装上的油污蹭了你一脸。你最后看到的，是罩棚外那块“24小时便利”的灯箱——早就灭了。\n—— 结局：加油站 ——" + weaponBrokeText(vars);
    }
  },

  // ==================== 人工智能岛（科创老师 · 轻量线） ====================

  "张江-AI岛-园区内": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-园区内.webp */
    onEnter: function(vars) { vars.currentPos = "园区内"; },
    text: "过了闸机，园区里比街上还要静。一栋栋小楼隔着草坪排开，玻璃门里的大厅黑洞洞的，前台的白字招牌在昏光里泛着灰。\n\
只有靠里那栋楼的一层，窗帘缝里漏出一线很弱的光——不是电灯，更像是哪种设备上的指示灯，绿的，一闪一闪。",
    choices: [
      { text: "去那栋有微光的楼", nextScene: "张江-AI岛-公司前台", effect: updateTime(2) },
      { text: "回闸机外", nextScene: "张江-人工智能岛闸机外", effect: updateTime(2) }
    ]
  },

  "张江-AI岛-公司前台": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-公司前台.webp */
    onEnter: function(vars) { vars.currentPos = "公司前台"; },
    text: "玻璃门没锁。前台桌上立着一块公司的水牌，logo 下面是一行小字：“让机器学会学习”。\n\
通往里面的走廊尽头，有一扇门上贴着手写的 A4 纸：“机房·闲人免进”，纸的边角卷了。\n\
门缝底下透出一线光，还有服务器风扇那种持续的、低低的嗡嗡声。",
    choices: [
      { text: "推开那扇门", nextScene: "张江-AI岛-机房", effect: updateTime(2) },
      { text: "去园区", nextScene: "张江-AI岛-园区内", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房.webp（服务器、显示器墙、电子件杂乱） */
    onEnter: function(vars) { vars.currentPos = "机房"; },
    text: function(vars) {
      if (!vars._metTeacher) {
        return "你推开门，一股冷气扑面——机房里居然还开着空调。一排排机柜的指示灯明明灭灭，把屋子照成一片幽蓝。\n\
靠墙的操作台前坐着一个人，背对着你，正就着两台显示器的光鼓捣什么。听到门响，他的手停住了。\n\
“……说过多少次了，闲人免——”他回过头，看清你的脸，后半句卡在了喉咙里。";
      }
      return "机房里机柜风扇嗡嗡地响着，混着空调的冷气。老师还守在他那排显示器前面——这栋楼里最亮、也最吵的角落。";
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._metTeacher) {
        cs.push({ text: "“老师，是我。”", nextScene: "张江-AI岛-机房-重逢", effect: updateTime(1) });
        return cs;
      }
      cs.push({ text: "和老师聊聊", nextScene: "张江-AI岛-机房-话题", effect: updateTime(2) });
      cs.push({ text: "看看监控画面", nextScene: "张江-AI岛-机房-监控", effect: updateTime(2) });
      if (vars._foundFriend && !vars._teacherFriendTold) {
        cs.push({ text: "告诉他曹睿泽的事", nextScene: "张江-AI岛-机房-曹睿泽", effect: updateTime(1) });
      }
      if (vars._hasTestReport && !vars._teacherReportRead) {
        cs.push({ text: "把检测中心的报告给他看", nextScene: "张江-AI岛-机房-读报告", effect: updateTime(2) });
      }
      cs.push({ text: "在角落的行军床上歇一会儿", nextScene: "张江-AI岛-机房-休息" });
      cs.push({
        showCondition: "itemCount > 0",
        text: "🎒整理一下物品",
        nextScene: "整理整理",
        effect: { set: { positionAfterOperation: "张江-AI岛-机房" } }
      });
      cs.push({ text: "离开机房", nextScene: "张江-AI岛-公司前台", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-AI岛-机房-重逢": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-重逢.webp */
    onEnter: function(vars) {
      vars._metTeacher = true;
      vars.personalMemorySet.add("师生重逢");
      return {};
    },
    text: "他从椅子上站起来，又坐下去，又站起来。\n\
“你——你是……”他绕过操作台走近两步，盯着你看了足足三秒，忽然笑出了声，“建平的！我带过你课题的那个！你怎么找到这儿来的？”\n\
你把这几天的事拣着说了。他越听脸色越沉，最后拍了拍你的肩膀：“活着就好。活着就好。”\n\
“这儿不缺电。”他朝机柜摆摆手，“UPS 撑着，楼顶还有块太阳能板，省着用能顶很久。我就是舍不得这些机器——都到这份上了，总得有台机器还记得点什么事。”\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得记忆[师生重逢]——在死城里，还有人认得你。</span>",
    choices: [
      { text: "和他好好聊聊", nextScene: "张江-AI岛-机房-长谈给卡", effect: updateTime(2) }
    ]
  },

  "张江-AI岛-机房-长谈给卡": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-长谈.webp */
    onEnter: { set: { _hasFabKeycard: true } },
    text: function(vars) {
      var desc = "聊到东边那栋楼，他从抽屉里摸出一张卡，又翻出一个插着线的读卡器，摆弄了几分钟，“嘀”的一声，吐出一张新卡。\n\
“华大的访客卡。我以前老去他们那边蹭饭听课——张江这片就这么大，谁家食堂好吃我门儿清。”他把卡递给你，“复制了一张。他们大门，现在认这个。”";
      desc += "\n“还有件事。”他压低了声音，“这几天我翻园区的监控，华大里面还有活人。晚上能看见那边楼里有灯光走动，前天半夜还有个人影往动力站那边搬东西。不知道是谁，看不清。你要过去，替我看一眼。”";
      desc += "\n他想了想，又补了一句：“对了，上科大有个叫曹睿泽的年轻人，以前老来我这儿蹭网下棋，嘴特别欠。这几天监控里再没见他出过门。你要是往西走……顺便看看他。”";
      return desc;
    },
    choices: [
      { text: "收好门禁卡", nextScene: "张江-AI岛-机房", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-话题": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-话题.webp */
    text: "老师往椅背上一靠，摘下眼镜擦了擦。\n\
“想聊什么？我这儿别的没有，电管够——不对，电也得省着。”他笑了笑，指指墙上那面显示器，“这半个月我就守着这些画面过日子，比看电视剧好看，就是结局不太好。”",
    choices: [
      { text: "问他这几天都是怎么过的", nextScene: "张江-AI岛-机房-话题-近况", effect: updateTime(2) },
      { text: "问东边华大有什么要注意的", nextScene: "张江-AI岛-机房-话题-华大规矩", effect: updateTime(2) },
      { text: "问河对岸是什么地方", nextScene: "张江-AI岛-机房-话题-北岸", effect: updateTime(2) },
      {
        showCondition: "_foundHongContact",
        text: "打听一个叫洪金宝的人",
        nextScene: "张江-AI岛-机房-话题-洪金宝",
        effect: updateTime(2)
      },
      { text: "不聊了", nextScene: "张江-AI岛-机房", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-话题-近况": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-话题.webp */
    text: "“我？跟平时上班差不多。”他耸耸肩，“起来，看监控，喂猫——哦，猫前几天也不来了。”\n\
他指着操作台上一台拆了一半的激光打印机：“我在攒东西。读卡器、天线、对讲机，能修的全修了。万一哪天广播里有人喊话，我这边得接得上。”\n\
“再就是给楼里每台机器做备份。”他拍拍机柜，“数据能留下点什么。人留不下的事，机器记得。”",
    choices: [
      { text: "换个话题", nextScene: "张江-AI岛-机房-话题", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-话题-华大规矩": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-话题.webp */
    text: "“华大那地方，规矩大。”他掰着手指头数，“我最多蹭过他们食堂，车间大门朝哪开都没资格看。就记得进去的人都要换一身白衣服，站在一个小舱里吹风，吹够了才放行——说是怕人身上的灰进去毁了机器。”\n\
“具体怎么操作我不清楚。”他摊摊手，“他们连廊墙上贴着规程，你进门自己看。照着来，别乱按。”",
    choices: [
      { text: "换个话题", nextScene: "张江-AI岛-机房-话题", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-话题-北岸": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-话题.webp */
    text: "“过了川杨河就是检测中心那一片。”他朝北边扬了扬下巴，“上海市检测中心，什么都能检的地方。以前我们公司送样都得排队。”\n\
“现在嘛——”他顿了顿，“这阵子谁敢往河边去。河沿上那些东西，全奔着水去的。你要看河，站在堤上远远看一眼就行，别下去。”",
    choices: [
      { text: "换个话题", nextScene: "张江-AI岛-机房-话题", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-话题-洪金宝": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-话题.webp */
    text: "“洪金宝？”他想了想，摇头，“不认识。华大几千号人，我一个外头的，哪认得全。”\n\
“不过——”他指了指监控墙，“我说的那个活人，夜里搬桶的那个。华大动力站是管水管电的，他要活着，八成就是那一片的人。你拿这张卡进去，总能碰上。”",
    choices: [
      { text: "换个话题", nextScene: "张江-AI岛-机房-话题", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-监控": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-监控.webp（显示器墙·摄像头画面） */
    text: function(vars) {
      var desc = "他把一整面显示墙切到园区监控。十几个画面，一半是雪花——掉线的摄像头再也没醒过来。\n\
能看的那些里：闸机外空无一人；华大的大门紧闭，门前广场上有几个人影在慢慢地晃；靠川杨河的滨河路上，黑压压的一片，全贴着河沿挤。";
      if (vars.dd >= 3) desc += "\n“这两天掉的线越来越多。”他敲了敲屏幕边框，“太阳能板老了，我没法上房顶修。”";
      desc += "\n他忽然把一个画面放大——华大厂区里侧，一扇小门旁码着几只桶。“看见没，前天半夜有人搬的。里面肯定有活人，而且过得还行。”";
      return desc;
    },
    choices: [
      { text: "离开监控墙", nextScene: "张江-AI岛-机房", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-曹睿泽": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-曹睿泽.webp */
    onEnter: { set: { _teacherFriendTold: true } },
    text: function(vars) {
      var desc = "你把上科大那间宿舍的事，拣着能说的说了。桌上晾着的凉白开，烧水壶，还有床上那个再没起来的人。\n\
老师半天没说话。他转过身去对着屏幕，手在桌沿上敲，敲了很久才停。\n\
“……他还欠我一顿烧烤。”他说，“下回聊到自动驾驶，谁跟我吵。”\n\
他再转回来的时候，眼眶有点红，声音已经稳了：“你把他的名字记住了。这世上记得他的人，少了一个，就得有人补上。”";
      if (vars._hasFriendPhoto) desc += "\n你把那张合照拿出来给他看。他看了很久，摆摆手：“你收着吧。我这边，记在心里就行。”";
      return desc;
    },
    choices: [
      { text: "先不说这个了", nextScene: "张江-AI岛-机房", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-读报告": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房-读报告.webp */
    onEnter: { set: { _teacherReportRead: true } },
    text: "他把那几页报告翻来覆去看了三遍，从眼镜上方看你，又看纸。\n\
“检测中心自己的章，自己的签名，6 月 28 号出的报告。”他把纸轻轻放平，像怕碰坏什么，“这些数据我都看得懂——这意味着，28 号那天，真相是写在纸上的。就差一天。”\n\
他沉默了一会儿，把报告还给你：“收好。这东西比我这一屋子机器加起来都重。”",
    choices: [
      { text: "收起报告", nextScene: "张江-AI岛-机房", effect: updateTime(1) }
    ]
  },

  "张江-AI岛-机房-休息": {
    image: "images/placeholder.png", /* TODO: images/张江/AI岛-机房.webp */
    onEnter: function(vars) {
      vars.currentPos = "机房";
      vars._travelMinutes = 0;
      restRecover(vars, 1);
      return updateTime(20)(vars);
    },
    text: function(vars) {
      return "机房角落支着一张行军床，床单算不上干净，但很干爽。机柜风扇的白噪音把外面的世界隔得很远。\n\
你躺上去，盯着天花板上的应急灯看了一会儿——绿色的，稳稳地亮着。在这年头，这就算奢侈了。" + restHint(vars);
    },
    choices: [
      { text: "再眯一会儿", nextScene: "张江-AI岛-机房-休息", effect: updateTime(1) },
      { text: "起来", nextScene: "张江-AI岛-机房", effect: updateTime(1) }
    ]
  },

  // ==================== 上科大（曹睿泽宿舍 · 好友线） ====================

  "张江-上科大-校门": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/上科大-校门.webp */
    onEnter: function(vars) {
      vars.currentPlace = "上科大";
      vars.currentPos = "上科大校门";
    },
    text: function(vars) {
      return "校园比岛那边开阔得多。校门口的闸机全开着，门卫室里空着，桌上的杯子只剩杯壁上一圈水痕。\n\
主干道两旁的梧桐落了些叶子——才几天没人扫，路牙边就积了薄薄一层。教学楼的玻璃幕墙映着天光，里面黑沉沉的，看不见人。\n\
生活区在西边，一片宿舍楼贴着校园围墙排开。\n" + describeWeather(vars);
    },
    choices: [
      { text: "往西，去生活区的宿舍楼", nextScene: "张江-上科大-研究生公寓", effect: updateTime(5) },
      { text: "往东，回人工智能岛", nextScene: "张江-人工智能岛闸机外", effect: updateTime(15) }
    ]
  },

  "张江-上科大-研究生公寓": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/研究生公寓.webp */
    onEnter: function(vars) { vars.currentPos = "研究生公寓楼下"; },
    text: "研究生公寓是一栋六层的板楼。单元门上的玻璃碎了一块，门就这么敞着。\n\
楼下的自行车棚里东倒西歪停着几辆车，有的钥匙还插在锁上。公告栏上贴着六月的海报——学术讲座、跳蚤市场、毕业季合影，纸角都翘了起来。\n\
门禁机黑着屏。你侧身进了单元门。",
    choices: [
      { text: "上楼看看", nextScene: "张江-上科大-公寓走廊", effect: updateTime(2) },
      { text: "回校门", nextScene: "张江-上科大-校门", effect: updateTime(5) }
    ]
  },

  "张江-上科大-公寓走廊": {
    image: "images/placeholder.png", /* TODO: images/张江/公寓走廊.webp */
    onEnter: function(vars) { vars.currentPos = "公寓二楼走廊"; },
    text: "二楼走廊。大部分房门都关得死死的，门上贴着外卖小广告和褪色的春联。\n\
只有走廊尽头那扇门虚掩着，门牌 214。门缝里透出一股很淡的味道——不像楼道里的灰味，是那种关了几天窗的屋子特有的闷。",
    choices: [
      { text: "推开 214 的门", nextScene: "张江-上科大-曹睿泽宿舍", effect: updateTime(1) },
      { text: "挨个试试别的门", nextScene: "张江-上科大-走廊-别的门", effect: updateTime(3) },
      { text: "下楼离开", nextScene: "张江-上科大-研究生公寓", effect: updateTime(2) }
    ]
  },

  "张江-上科大-走廊-别的门": {
    image: "images/placeholder.png", /* TODO: images/张江/公寓走廊.webp */
    text: "你从走廊这头试到那头。门都是反锁的，你用肩膀撞开了一间——屋里被搬得干干净净，连床垫都竖了起来，看得出主人走得从容。\n\
另一间的门缝里塞着一张物业催缴单，别的什么也没有。\n\
这条走廊上，只有 214 是敞着的。",
    choices: [
      { text: "回走廊", nextScene: "张江-上科大-公寓走廊", effect: updateTime(1) },
      { text: "下楼离开", nextScene: "张江-上科大-研究生公寓", effect: updateTime(2) }
    ]
  },

  "张江-上科大-曹睿泽宿舍": {
    image: "images/placeholder.png", /* TODO: images/张江/曹睿泽宿舍.webp（尸体克制、凉白开/空水桶/烧水壶、合照） */
    onEnter: function(vars) {
      vars._foundFriend = true;
      vars.currentPos = "曹睿泽宿舍";
    },
    text: function(vars) {
      var desc = "屋里拉着窗帘，光线昏昏的。一个人侧躺在床上，被子拉到肩膀，像睡着了一样——只是露在外面的半张脸，已经灰得没有了活人的颜色。床头柜上摆着一排拆空的药板。\n\
桌上收拾得很整齐：一台合上的笔记本电脑，一个玻璃杯，杯底剩着一口凉白开；旁边是烧水壶，壶嘴还挂着水垢；墙角立着一只空了的桶装水桶，倒在地上，滚了半圈。\n\
桌沿压着一张工作证——上海科技大学，物质科学与技术学院，研究实习员：曹睿泽。证件照里的年轻人戴着圆框眼镜，没什么表情。\n\
一个相框朝下扣在桌角。电脑和一部手机都黑着屏，按了按，一点电也不剩。";
      if (vars._visit['张江-上科大-曹睿泽宿舍'] > 1) {
        desc = "屋里还是老样子。床上的人、桌上那口凉白开、扣着的相框——你上次没动的东西，都还在原地。";
      }
      return desc;
    },
    choices: [
      { text: "扶起那个相框看看", nextScene: "张江-上科大-宿舍-合照", effect: updateTime(1) },
      {
        showCondition: "!_dormFoodTaken",
        text: "翻翻柜子和床底",
        nextScene: "张江-上科大-宿舍-搜刮",
        effect: updateTime(3)
      },
      { text: "离开这间屋子", nextScene: "张江-上科大-公寓走廊", effect: updateTime(1) }
    ]
  },

  "张江-上科大-宿舍-合照": {
    image: "images/placeholder.png", /* TODO: images/张江/合照.webp（烧烤店两人合影特写） */
    text: function(vars) {
      var desc = "你把相框扶起来。照片上是两个年轻人，在一家烧烤店里勾肩搭背，桌上插满了签子，两个人都笑得龇牙咧嘴。\n\
照片背面用马克笔写着一行字：“毕业快乐。——金宝，2010.6”\n\
相框背后还压着一张烧烤店的集点卡，格子盖了大半章，剩下的空白，够再吃一顿。";
      if (vars._hasFriendPhoto) desc += "\n照片你已经收在身上了，相框空着立回桌角。";
      return desc;
    },
    choices: [
      {
        showCondition: "!_hasFriendPhoto",
        text: "把合照收进内袋",
        nextScene: "张江-上科大-曹睿泽宿舍",
        effect: { set: { _hasFriendPhoto: true } }
      },
      { text: "放回桌上", nextScene: "张江-上科大-曹睿泽宿舍" }
    ]
  },

  "张江-上科大-宿舍-搜刮": {
    image: "images/placeholder.png", /* TODO: images/张江/曹睿泽宿舍.webp */
    onEnter: { set: { _dormFoodTaken: true, positionAfterOperation: "张江-上科大-曹睿泽宿舍" } },
    text: function(vars) {
      var desc = "你放轻手脚翻了起来。衣柜里是衣服和几本专业书，床底下滚着一双篮球鞋。\n\
桌角的零食箱里还剩两根火腿肠，包装得好好的。";
      if (vars.hasHamSausage) desc += "\n你已经有一根火腿肠了——剩下的，就留给这屋里的人吧。";
      return desc;
    },
    choices: [
      {
        showCondition: "!hasHamSausage",
        text: "收下一根火腿肠",
        condition: "itemCount < bagVolume",
        nextScene: "张江-上科大-曹睿泽宿舍",
        effect: { set: { hasHamSausage: true }, add: { itemCount: 1 } },
        elseScene: "整理整理"
      },
      { text: "不拿了，出去", nextScene: "张江-上科大-曹睿泽宿舍" }
    ]
  },

  // ==================== 华大半导体 · 外部厂区 ====================
  // 动线：大门（刷卡/断电推开）→ 保安亭 → 连廊（风淋规程贴墙上）→ 灰区
  //       办公区从连廊侧门进（可选轻探索，案例表旁证）。

  "张江-华大-大门": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/华大-大门.webp（读卡器、伸缩门） */
    onEnter: function(vars) {
      vars.currentPlace = "华大半导体";
      vars.currentPos = "华大大门";
    },
    text: function(vars) {
      var desc = "华大半导体的厂区大门比你想象中朴素——一道伸缩门，一根黄黑相间的闸杆，门柱上嵌着读卡器，旁边钉着“访客请登记”的牌子。\n\
大门里侧是一大片厂区广场，水泥地坪干净得发白。远处厂房的玻璃幕墙一层层排开，像一块竖起来的电路板。";
      if (vars._jinbaoLeft) {
        desc += "\n读卡器的指示灯灭了。你伸手推了推伸缩门——门轮子锈住了，吱呀一声，居然让出半米宽的缝。\n电没了，电磁锁比一只手都拦不住。";
      } else {
        desc += "\n读卡器的指示灯亮着一圈幽幽的绿。这年头，亮着的绿灯比丧尸还少见。";
        if (vars.isNight) desc += "\n厂房靠里侧的窗户透着灯光，隔着广场，能听见发电机低低的嗡嗡声。";
      }
      return desc + "\n" + describeWeather(vars);
    },
    choices: function(vars) {
      var cs = [];
      if (vars._jinbaoLeft) {
        cs.push({ text: "从门缝里挤进去", nextScene: "张江-华大-保安亭", effect: updateTime(2) });
      } else {
        cs.push({
          showCondition: "_hasFabKeycard",
          text: "把门禁卡贴上读卡器",
          nextScene: "张江-华大-保安亭",
          effect: updateTime(2)
        });
        cs.push({
          showCondition: "!_hasFabKeycard",
          text: "推推门，敲敲门卫的窗",
          nextScene: "张江-华大-大门-吃闭门羹",
          effect: updateTime(2)
        });
      }
      cs.push({ text: "往西，回闸机外", nextScene: "张江-人工智能岛闸机外", effect: updateTime(10) });
      return cs;
    }
  },

  "张江-华大-大门-吃闭门羹": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/华大-大门.webp */
    onEnter: function(vars) { vars.currentPos = "华大大门"; },
    text: function(vars) {
      var desc = "门纹丝不动。你拍了几下门柱，声音在空旷的广场上散得干干净净，没有任何回应。\n\
读卡器的绿灯不紧不慢地闪着，像在说：卡。";
      if (vars._metTeacher) desc += "\n你想起老师说过——他经常来这边串门，手里有自己的访客卡。";
      else if (vars._metJinbao) desc += "\n离得这么近，就是进不去。";
      return desc;
    },
    choices: [
      { text: "罢了", nextScene: "张江-华大-大门", effect: updateTime(1) }
    ]
  },

  "张江-华大-保安亭": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-保安亭.webp（翻倒的椅子、值班表、黑掉的监控屏） */
    onEnter: function(vars) { vars.currentPos = "保安亭"; },
    text: "厂区广场边上的保安亭。门虚掩着，里面一把椅子翻倒在地，椅背上还搭着件反光背心。\n\
桌上摊着值班登记表，最后一行签在 6 月 27 日夜班，字迹潦草：“交接正常”。之后就是空白。\n\
监控屏全黑了，对讲机的充电座空着——对讲机本身不见了，像有人走的时候顺手带走了最重要的东西。",
    choices: [
      { text: "沿广场往里走，进连廊", nextScene: "张江-华大-连廊", effect: updateTime(3) },
      { text: "出大门", nextScene: "张江-华大-大门", effect: updateTime(2) }
    ]
  },

  "张江-华大-连廊": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-连廊.webp（玻璃连廊、墙上A4规程） */
    onEnter: function(vars) { vars.currentPos = "连廊"; },
    text: function(vars) {
      var desc = "一条玻璃连廊从办公楼上架过来，接进厂房侧面。透过玻璃能看见连廊尽头一扇厚重的门，门楣上挂着一块牌子：净化区。\n\
连廊墙上贴着一张过塑的 A4 纸，标题印得方方正正：《风淋室操作规程》。";
      if (vars._airlockAlarmZombie && !vars._airlockZombieDone) {
        desc += "\n连廊中段的玻璃门外，一个白点正在广场方向慢慢挪过来——是警报引来的。它隔着玻璃撞了一下，又撞了一下。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      cs.push({
        showCondition: "!_readAirlockRules",
        text: "凑近读一读那张规程",
        nextScene: "张江-华大-连廊-规程",
        effect: updateTime(3)
      });
      if (vars._airlockAlarmZombie && !vars._airlockZombieDone) {
        cs.push({
          text: function(v) { return hasMeleeWeapon(v) ? "握紧" + meleeWeaponName(v) + "解决它" : "握紧拳头解决它"; },
          nextScene: "张江-华大-连廊-遭遇",
          effect: updateTime(1)
        });
      }
      cs.push({ text: "推开尽头那扇门", nextScene: "张江-华大-灰区", effect: updateTime(1) });
      cs.push({ text: "从侧门进办公楼", nextScene: "张江-华大-办公区", effect: updateTime(2) });
      cs.push({ text: "出连廊，回保安亭", nextScene: "张江-华大-保安亭", effect: updateTime(3) });
      return cs;
    }
  },

  "张江-华大-连廊-规程": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-规程特写.webp */
    onEnter: { set: { _readAirlockRules: true } },
    text: "《风淋室操作规程》\n\
一、进入风淋舱后，请先关闭外门。外门未关闭时，风淋无法启动。\n\
二、按面板【风淋启动】键，风淋开始，面板显示 25 秒倒计时。\n\
三、风淋运行期间，严禁开启任何一侧舱门，否则将触发压差报警与污染物反灌。\n\
四、倒计时结束、提示音“嘀”后，内门方可解锁。请从内门离开，进入净化区。\n\
五、如遇故障，请按面板【紧急复位】键，并退出舱外等待系统复位。\n\
纸的下角被人用笔加了一行手写小字：“别嫌烦，吹不干净毁的是几千万的货。”",
    choices: [
      { text: "记住了", nextScene: "张江-华大-连廊", effect: updateTime(1) }
    ]
  },

  "张江-华大-连廊-遭遇": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-连廊-遭遇.webp */
    onEnter: initMemoryGame(["红", "蓝", "绿"], 4),
    text: "它挤进玻璃门的缝，白色的无尘服在连廊的灯光下晃眼。你退到墙边，等它扑近——一击，退开，再一击。\n\
别让它的手碰到你，也别让自己被逼到玻璃上。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝" },
        condition: checkFlashAnswer,
        nextScene: "张江-华大-连廊-遭遇-胜",
        elseScene: "结局-张江-连廊",
        timeout: 9000,
        timeoutScene: "结局-张江-连廊"
      }
    ]
  },

  "张江-华大-连廊-遭遇-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._airlockZombieDone = true;
      return updateTime(2)(vars);
    },
    text: function(vars) {
      return "它扑空的瞬间，你侧身让过，顺势把它撞在玻璃门框上。它软软地滑下去，无尘服的头罩歪在一边，露出里面一张干灰的脸。\n\
你喘匀了气。警报的余音还在连廊里嗡嗡地绕。" + weaponBrokeText(vars);
    },
    choices: [
      { text: "回连廊", nextScene: "张江-华大-连廊" }
    ]
  },

  "结局-张江-连廊": {
    image: "images/zombieKnockYouDown.webp",
    onEnter: function(vars) { tryBreakWeapon(vars); return {}; },
    text: function(vars) {
      return "它把你抵在连廊的玻璃上。玻璃外是空荡荡的厂区广场，玻璃内是你越来越弱的挣扎。\n\
它身上那件无尘服干净得反光——你最后想的是，这大概是你离“干净”最近的一次。\n—— 结局：连廊 ——" + weaponBrokeText(vars);
    }
  },

  "张江-华大-办公区": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-办公区.webp（开放工位、白板） */
    onEnter: function(vars) { vars.currentPos = "办公楼"; },
    text: function(vars) {
      var desc = "办公楼一层的开放式工位，几十张桌子排成整齐的方阵。有人桌面收拾得干干净净，有人还摊着没合上的文件、扣着的马克杯。\n\
靠窗那面白板上写满了字，远远看去像一张名单。茶水间在角落里，水池里泡着几个杯子。";
      if (vars.dd >= 3 && !vars._jinbaoLeft) desc += "\n头顶的灯只亮了一半——省着用电，靠里的那几排工位沉在半明半暗里。";
      if (vars._jinbaoLeft) desc += "\n整个楼层黑着，只有窗外的天光把桌面的灰照出一层薄薄的亮。";
      return desc;
    },
    choices: [
      {
        showCondition: "!_fabOfficeDeskSeen",
        text: "去看看那面白板和贴满便利贴的工位",
        nextScene: "张江-华大-办公区-工位",
        effect: updateTime(3)
      },
      { text: "回连廊", nextScene: "张江-华大-连廊", effect: updateTime(2) }
    ]
  },

  "张江-华大-办公区-工位": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-办公区-工位.webp（白板名单特写） */
    onEnter: { set: { _fabOfficeDeskSeen: true } },
    text: "白板上是一张手画的表格，标题写着“互助信息统计（6/28 起）”。\n\
一行一个名字，后面跟着日期和短短几个字：\n\
“张-6/28-发烧，回家休息” “李工-6/29-没来，不接电话” “王-6/29-说家里孩子病了” “陈-6/30-失联”……\n\
表格写到 6 月 30 日就断了，最下面一行没写完，笔画拖出一道长长的划痕。\n\
旁边工位的隔板上贴满了便利贴，最显眼的一张写着：“别喝饮水机的水！！食堂的也别喝！！——6/29”\n\
再下面有人回了一张：“那喝什么？”\n\
没有人回答。",
    choices: [
      { text: "回办公区", nextScene: "张江-华大-办公区", effect: updateTime(1) }
    ]
  },

  // ==================== 灰区（更衣缓冲前厅） ====================
  // 枢纽：更衣柜（无尘服穿/脱）/ 风淋舱 / 上送风夹层检修口 / 风淋系统复位。

  "张江-华大-灰区": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-灰区.webp（更衣柜、长凳、镜子、检修口爬梯） */
    onEnter: function(vars) { vars.currentPos = "灰区"; },
    text: function(vars) {
      var desc = "门后是一间不大的前厅：一排灰蓝色更衣柜靠墙立着，中间一条长凳，墙上嵌着一面镜子。天花板的送风口呼呼地抽着气，把门那一侧的尘埃挡在外面。\n\
这里就是“灰区”——厂房里的人管它叫更衣间。往前，是一扇带观察窗的小舱门：风淋舱。\n\
墙角的天花板上开着一个检修口，一截笼式爬梯垂下来，通往上面的设备夹层。";
      if (vars._airlockLockedOut) desc += "\n风淋舱的观察窗里，面板的灯是红的——系统还锁着，得找地方复位。";
      if (vars._wearingCleanSuit) desc += "\n无尘服的帽子压着你的耳朵，面罩边缘一圈汗气。";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      cs.push({ text: "去风淋舱", nextScene: "张江-华大-风淋舱", effect: updateTime(1) });
      cs.push({ text: "翻翻更衣柜", nextScene: "张江-华大-灰区-更衣柜", effect: updateTime(2) });
      cs.push({
        text: "爬检修口，上设备夹层",
        nextScene: "张江-华大-夹层-入口",
        effect: updateTime(2)
      });
      if (vars._airlockLockedOut) {
        cs.push({
          text: "去墙边配电箱复位风淋系统",
          nextScene: "张江-华大-灰区-风淋复位",
          effect: updateTime(6)
        });
      }
      cs.push({
        showCondition: "itemCount > 0",
        text: "🎒整理一下物品",
        nextScene: "整理整理",
        effect: { set: { positionAfterOperation: "张江-华大-灰区" } }
      });
      cs.push({ text: "去连廊", nextScene: "张江-华大-连廊", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-华大-灰区-更衣柜": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-更衣柜.webp */
    onEnter: function(vars) { vars.currentPos = "灰区更衣柜"; },
    text: function(vars) {
      var desc = "更衣柜大多数没锁。里面挂着工装、便服，有的格子里塞着运动鞋和饭盒。靠最里侧的一格码着几包没拆封的东西——连体无尘服，真空压缩袋抽得扁扁的。\n\
长凳上还搭着一套拆开的，像有人换到一半走了。";
      if (vars._wearingCleanSuit) desc += "\n你身上这件就是从这儿拿的。";
      return desc;
    },
    choices: [
      {
        showCondition: "!_wearingCleanSuit",
        text: "穿上一套无尘服（约 3 分钟）",
        nextScene: "张江-华大-灰区-穿无尘服",
        effect: updateTime(3)
      },
      {
        showCondition: "_wearingCleanSuit",
        text: "把无尘服脱下来放回去",
        nextScene: "张江-华大-灰区-脱无尘服",
        effect: updateTime(2)
      },
      { text: "合上柜门，回前厅", nextScene: "张江-华大-灰区", effect: updateTime(1) }
    ]
  },

  "张江-华大-灰区-穿无尘服": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-穿无尘服.webp */
    onEnter: { set: { _wearingCleanSuit: true } },
    text: "你撕开压缩袋，抖开那身连体服。先是腿，再是胳膊，拉链从胸口一直拉到下巴，最后把帽子扣上、面罩压下去。\n\
镜子里的人裹得严严实实，白得像颗行走的药棉。自己的呼吸声在面罩里放大了一圈，呼出的热气往上飘，糊在镜片边缘。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】已穿上无尘服。白区的人形不容易分辨你是不是活物——但你也一样分不清它们。穿着它不能进食饮水（可在整理整理中脱下）。</span>",
    choices: [
      { text: "回前厅", nextScene: "张江-华大-灰区" }
    ]
  },

  "张江-华大-灰区-脱无尘服": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-更衣柜.webp */
    onEnter: { set: { _wearingCleanSuit: false } },
    text: "你拉开下巴的拉链，把帽子向后一掀——闷了半天的汗气“呼”地散出去，凉气贴上后颈，舒服得你打了个哆嗦。\n\
连体服团成一团塞回柜子，面罩上那圈雾气慢慢干了。",
    choices: [
      { text: "回前厅", nextScene: "张江-华大-灰区" }
    ]
  },

  "张江-华大-灰区-风淋复位": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-配电箱.webp */
    onEnter: { set: { _airlockLockedOut: false, _airlockOuterClosed: false, _airlockBlowing: false, _airlockInnerOpen: false, _airlockLeakRounds: 0, _airlockStartFails: 0 } },
    text: "你循着红色指示灯找到墙边的配电箱，翻开盖板，里面的复位钮蒙着灰。按下去，等了几秒——\n\
“咔哒”一声，风淋舱面板的红灯转成了待机的黄。互锁解除了。\n\
折腾这几分钟，够你在长凳上喘匀三口气。",
    choices: [
      { text: "回前厅", nextScene: "张江-华大-灰区" }
    ]
  },

  // ==================== 风淋舱（状态机） ====================
  // 正确四步：关外门 → 按【风淋启动】 → 等 25 秒倒计时 → “嘀”后开内门。
  // 误操作三档（设计稿§十一）：强启报错×2 → 警报；运行中撞内门 → 气流击退+锁死；
  // 运行中开外门 → AMC 泄漏困舱。断电（_jinbaoLeft）整体跳过。

  "张江-华大-风淋舱": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱.webp（内外双门、面板、喷嘴） */
    onEnter: function(vars) { vars.currentPos = "风淋舱"; },
    text: function(vars) {
      if (vars._jinbaoLeft) {
        return "风淋舱两扇门都虚掩着，面板黑屏。喷嘴里的风早就停了，舱底积着一层薄薄的灰。\n\
那套曾经要把每个人吹得一生不染的机器，现在安静得像口棺材。你直接穿了过去。";
      }
      var desc = "你走进风淋舱。舱不大，两三个人并肩的宽度，四面墙布满喇叭口似的喷嘴。外门在你身后合拢到一半，内门那边亮着一块红色的小牌：联锁。\n\
面板就在手边，一块不大的屏幕，下面两个键——【风淋启动】【紧急复位】。";
      if (vars._airlockLockedOut) desc += "\n面板一片红——互锁过载，两个键按下去都只是“哔”一声。系统没复位，这舱就是一口关不上也开不动的铁盒子。";
      else if (vars._airlockInnerOpen) desc += "\n面板上的倒计时走完了，屏幕定格在一个绿色的“完成”，内门的红牌变成了绿灯。";
      else if (vars._airlockBlowing) desc += "\n风正在吹。气流从四面八方喷出来，打得连体服啪啪作响。";
      else if (vars._airlockOuterClosed) desc += "\n外门关得严严实实。面板屏幕上是一行待机字样：外门已关闭，等待启动。";
      else desc += "\n外门还开着一条缝，风从缝里灌进来，面板屏幕上一行小字：请关闭外门。";
      if (vars._readAirlockRules) desc += "\n墙上那张规程你还记得：先关外门，按启动，等倒计时走完，“嘀”一声，内门开。";
      return desc;
    },
    choices: function(vars) {
      if (vars._jinbaoLeft) {
        return [
          { text: "穿过风淋舱", nextScene: "张江-华大-洁净主走廊", effect: updateTime(1) },
          { text: "去灰区", nextScene: "张江-华大-灰区", effect: updateTime(1) }
        ];
      }
      var cs = [];
      if (vars._airlockLockedOut) {
        // 互锁过载/泄漏之后必须去灰区配电箱复位，舱内面板一个键都不认
        cs.push({ text: "退出风淋舱，去找地方复位", nextScene: "张江-华大-灰区", effect: updateTime(1) });
        return cs;
      }
      if (vars._airlockInnerOpen) {
        cs.push({ text: "推开设绿灯的内门", nextScene: "张江-华大-风淋舱-完成", effect: updateTime(1) });
      } else if (vars._airlockBlowing) {
        cs.push({ text: "站着等风停", nextScene: "张江-华大-风淋舱-吹风", effect: updateTime(1) });
        cs.push({ text: "等不及了，撞内门", nextScene: "张江-华大-风淋舱-击退", effect: updateTime(1) });
        cs.push({ text: "把外门打开一条缝", nextScene: "张江-华大-风淋舱-泄漏", effect: updateTime(1) });
      } else {
        if (!vars._airlockOuterClosed) {
          cs.push({
            text: vars._readAirlockRules ? "按规程：先关严外门" : "把身后的外门关严",
            nextScene: "张江-华大-风淋舱-关门",
            effect: updateTime(1)
          });
          cs.push({
            text: vars._readAirlockRules ? "不关外门，直接按【风淋启动】" : "按面板上最大的那个键",
            nextScene: "张江-华大-风淋舱-强启失败",
            effect: updateTime(1)
          });
        } else {
          cs.push({ text: "按【风淋启动】", nextScene: "张江-华大-风淋舱-吹风", effect: updateTime(1) });
          cs.push({ text: "把外门重新打开", nextScene: "张江-华大-风淋舱-开门", effect: updateTime(1) });
        }
      }
      cs.push({ text: "退出风淋舱，回灰区", nextScene: "张江-华大-灰区", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-华大-风淋舱-关门": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱.webp */
    onEnter: { set: { _airlockOuterClosed: true } },
    text: "你拉上外门，压紧，门边的指示灯从红跳成绿。面板屏幕刷新了一行字：外门已关闭，可以启动。\n\
舱里一下子静了，只剩送风口低低的抽气声。",
    choices: [
      { text: "继续", nextScene: "张江-华大-风淋舱" }
    ]
  },

  "张江-华大-风淋舱-开门": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱.webp */
    onEnter: { set: { _airlockOuterClosed: false } },
    text: "你把外门重新拉开一条缝。面板屏幕不情愿地跳回那行小字：请关闭外门。",
    choices: [
      { text: "继续", nextScene: "张江-华大-风淋舱" }
    ]
  },

  "张江-华大-风淋舱-强启失败": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-报错.webp */
    onEnter: function(vars) {
      vars._airlockStartFails = (vars._airlockStartFails || 0) + 1;
      var eff = {};
      if (vars._airlockStartFails >= 2 && !vars._airlockAlarmZombie) {
        vars._airlockAlarmZombie = true;
        vars.chasedByZombies = Math.min(5, vars.chasedByZombies + 1);
        vars._airlockStartFails = 0;
        eff = { set: { _airlockAlarmRang: true } };
      }
      return eff;
    },
    text: function(vars) {
      var desc = "你按下【风淋启动】。面板“哔——”地叫了一声，屏幕上一行红字：外门未关闭，无法启动。\n";
      if (vars._airlockAlarmRang) {
        desc += "你又不死心地按了一下。这一回，“哔”声变成了长长的蜂鸣，头顶的警示灯转了起来——初级警报。\n\
声音穿透舱壁往连廊那边灌。你透过外门的玻璃看见，广场那头有个白色的影子停住了脚，慢慢转过来。\n<span style='color: #ffaa00;'>有什么东西被警报引来了。</span>";
      } else {
        desc += "蜂鸣器不耐烦地催着你关门。";
      }
      return desc;
    },
    choices: [
      { text: "继续", nextScene: "张江-华大-风淋舱" }
    ]
  },

  "张江-华大-风淋舱-吹风": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-吹风.webp（气流、倒计时） */
    onEnter: function(vars) {
      vars._airlockBlowing = true;
      vars._airlockOuterClosed = true;
      vars._airlockLeakRounds = 0; // 每次重新起风都是一轮新的吹风周期
      return updateTime(1)(vars);
    },
    text: function(vars) {
      var desc = "高速气流从四面八方的喷嘴里喷出来，风压实打实地打在身上，衣摆猎猎作响，睁眼都费劲。\n\
面板屏幕上，倒计时一格一格地跳：25、24、23……\n\
据说这一套是要把人身上的浮尘、皮屑、纤维统统吹掉——在进入那间一尘不染的房间之前。";
      if (vars._airlockLeakRounds > 0) desc += "\n舱里还残着一股淡淡的酸味，像上次泄漏留下的记性。";
      return desc;
    },
    choices: [
      { text: "站稳了，等它吹完", nextScene: "张江-华大-风淋舱-倒计时", effect: updateTime(1) },
      { text: "等不及了，撞内门", nextScene: "张江-华大-风淋舱-击退", effect: updateTime(1) },
      { text: "把外门打开一条缝", nextScene: "张江-华大-风淋舱-泄漏", effect: updateTime(1) }
    ]
  },

  "张江-华大-风淋舱-倒计时": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-倒计时.webp */
    onEnter: { set: { _airlockBlowing: false, _airlockInnerOpen: true } },
    text: "风声一点一点弱下去。最后一声气流的嘶音消失时，面板“嘀——”地响了一声，清脆得像什么仪器出了结果。\n\
内门上那块红牌，翻成了绿色。",
    choices: [
      { text: "推开设绿灯的内门", nextScene: "张江-华大-风淋舱-完成", effect: updateTime(1) }
    ]
  },

  "张江-华大-风淋舱-完成": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-洁净主走廊入口.webp */
    onEnter: { set: { _airlockOuterClosed: false, _airlockBlowing: false, _airlockInnerOpen: false, _airlockStartFails: 0 } },
    text: "你推开内门。风停了，世界一下子安静得发闷。\n\
门里是一条白得晃眼的走廊，头顶层层叠叠的管道和滤网压得很低，空气里有一股说不上来的味道——不是脏，恰恰相反，是干净得过头的味道，像医院，又比医院更空。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】你进入了洁净区。</span>",
    choices: [
      { text: "往里走", nextScene: "张江-华大-洁净主走廊", effect: updateTime(2) }
    ]
  },

  // 错误2：运行中撞内门 —— 气流击退、-1体力、_fabAlert+1、系统锁死须复位
  "张江-华大-风淋舱-击退": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-击退.webp */
    onEnter: function(vars) {
      vars.strength = Math.max(0, vars.strength - 1);
      vars._fabAlert = Math.min(2, (vars._fabAlert || 0) + 1);
      vars._airlockBlowing = false;
      vars._airlockOuterClosed = false;
      vars._airlockLockedOut = true;
      vars._airlockStartFails = 0;
      return {};
    },
    text: "你肩膀撞上内门的瞬间，舱里的气流像被惹怒了一样猛地反扑——出风口“轰”地喷出一股全功率的强风，把你整个人掀得倒退两步，后腰磕在喷嘴棱上，眼前发了一阵黑。\n\
蜂鸣声炸开，面板红字乱跳：互锁过载。内门的牌子重新翻回红色，外门也“咔”地锁死了。\n\
风停了。舱里安静下来，只剩下警示灯一明一灭。这扇门，一时半会儿是打不开了——得出去把系统复位。",
    choices: [
      {
        text: "揉着腰退出舱外",
        nextScene: "张江-华大-灰区",
        effect: updateTime(2),
        condition: "strength > 0.01",
        elseScene: "结局-体力耗尽" // 这里是气流击退，不是酸雾——别复用风淋舱那段毒死文本
      }
    ]
  },

  // 错误3：运行中开外门 —— AMC 泄漏，双门锁死，逐轮腐蚀
  "张江-华大-风淋舱-泄漏": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-泄漏.webp（酸雾） */
    onEnter: function(vars) {
      vars._airlockBlowing = false;
      vars._airlockLockedOut = true;
      // 注意：_airlockLeakRounds 不在这里归零——本节点是逐轮循环的落点，
      // 归零会让面具的"每两轮 -1"永远停在第 1 轮（等于无伤），已在吹风节点重置。
      return {};
    },
    text: function(vars) {
      var desc = "你刚把外门拉开一条缝，舱内“轰”的一声——压差崩了。\n\
一股看不见的东西从洁净区那侧的缝隙里反灌进来，紧跟着喷嘴开始往外吐酸雾，白蒙蒙的，呛得眼睛发辣。两扇门同时“咔哒”锁死，面板红字疯狂闪烁：压差故障，污染物反灌。\n\
这是 AMC——气态分子污染物。厂房手册上说，这东西在洁净区是被滤网锁住的猛兽；现在它跟你关在了同一个笼子里。";
      if (vars.hasGasMask) desc += "\n你摸出防毒面具扣在脸上。滤罐是过期的，橡胶都发硬了——但每一口呛人的酸味都淡了一半。老洪，谢了。";
      else desc += "\n你捂住口鼻，但那股酸味无孔不入，喉咙火烧火燎。";
      if (vars._readAirlockRules) desc += "\n规程第五条在脑子里亮了起来：故障——按【紧急复位】。";
      else desc += "\n面板上那两个键，哪个是停了这个的？";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (vars._readAirlockRules) {
        cs.push({
          text: "按规程：按【紧急复位】",
          nextScene: "张江-华大-风淋舱-泄漏-复位",
          effect: updateTime(1)
        });
      } else {
        cs.push({
          text: "乱拍面板",
          nextScene: "张江-华大-风淋舱-泄漏-乱拍",
          effect: updateTime(1)
        });
      }
      cs.push({ text: "拍门喊救命", nextScene: "张江-华大-风淋舱-泄漏-喊", effect: updateTime(2) });
      return cs;
    }
  },

  // 泄漏通用伤害：每轮 -1（面具每两轮 -1）；体力扣尽 → 结局-风淋舱
  "张江-华大-风淋舱-泄漏-乱拍": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-泄漏.webp */
    onEnter: function(vars) {
      vars._airlockLeakRounds = (vars._airlockLeakRounds || 0) + 1;
      var hurt = vars.hasGasMask ? (vars._airlockLeakRounds % 2 === 0 ? 1 : 0) : 1;
      vars.strength = Math.max(0, vars.strength - hurt);
      vars._leakJustHurt = hurt > 0;
      return {};
    },
    text: function(vars) {
      var desc = "你胡乱按下面板上够得着的每一个键。蜂鸣声变了个调，酸雾又是一阵浓——" + (vars._leakJustHurt ? "你又呛了一口，肺里火烧似的疼。" : "面具替你挡下了这一口。");
      if (Math.random() < 0.45) {
        vars._leakSolved = true;
        desc += "\n终于，不知道是哪个键起了作用——喷雾弱了下去，门锁“咔哒”一声解开。";
      } else {
        vars._leakSolved = false;
        desc += "\n红字还在跳。雾还在冒。";
      }
      return desc;
    },
    choices: [
      {
        text: "继续",
        nextScene: function(vars) {
          if (vars.strength <= 0.01) return "结局-张江-风淋舱";
          return vars._leakSolved ? "张江-华大-风淋舱-泄漏-解除" : "张江-华大-风淋舱-泄漏";
        }
      }
    ]
  },

  "张江-华大-风淋舱-泄漏-复位": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-泄漏.webp */
    onEnter: function(vars) {
      vars._airlockLeakRounds = (vars._airlockLeakRounds || 0) + 1;
      var hurt = vars.hasGasMask ? 0 : 1; // 读规程一次成功：无面具扣1轮，面具档0（减半后不足一轮）
      vars.strength = Math.max(0, vars.strength - hurt);
      vars._leakJustHurt = hurt > 0;
      return {};
    },
    text: function(vars) {
      return "你摸到面板下那颗红色的键，按住。三秒——蜂鸣声矮下去，喷雾一阵强、一阵弱，最后“嘶”地吐了口余气，停了。\n\
两扇门的锁“咔哒”一声，同时解开。\n" + (vars._leakJustHurt ? "你扶着墙干呕了两声，喉咙里全是酸味。" : "面具的镜片上凝着一层白雾。");
    },
    choices: [
      {
        text: "继续",
        nextScene: function(vars) {
          if (vars.strength <= 0.01) return "结局-张江-风淋舱";
          return "张江-华大-风淋舱-泄漏-解除";
        }
      }
    ]
  },

  "张江-华大-风淋舱-泄漏-喊": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-泄漏.webp */
    onEnter: function(vars) {
      vars._airlockLeakRounds = (vars._airlockLeakRounds || 0) + 1;
      var hurt = vars.hasGasMask ? (vars._airlockLeakRounds % 2 === 0 ? 1 : 0) : 1;
      vars.strength = Math.max(0, vars.strength - hurt);
      vars._leakJustHurt = hurt > 0;
      return {};
    },
    text: function(vars) {
      var desc = "你拍着门喊。声音撞在舱壁上，闷得像隔着棉被。" + (vars._leakJustHurt ? "喊出来的每一口气都带着酸味，喊到一半变成咳嗽。" : "面具里全是自己的回音。") + "\n没有人来。这栋楼里如果有活人，他也在很远的地方。\n面板上的红字不管你喊不喊，自顾自地跳。";
      return desc;
    },
    choices: [
      {
        text: "继续",
        nextScene: function(vars) {
          if (vars.strength <= 0.01) return "结局-张江-风淋舱";
          return "张江-华大-风淋舱-泄漏";
        }
      }
    ]
  },

  "张江-华大-风淋舱-泄漏-解除": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-风淋舱-泄漏-解除.webp */
    onEnter: function(vars) {
      vars._airlockBlowing = false;
      vars._airlockOuterClosed = false;
      vars._airlockInnerOpen = false;
      vars._airlockLockedOut = false; // 紧急复位/乱拍蒙对之后门锁解开，舱子恢复待机
      vars._airlockLeakRounds = 0;
      vars._airlockStartFails = 0;
      vars._fabAlert = Math.min(2, (vars._fabAlert || 0) + 1);
      return {};
    },
    text: function(vars) {
      return "你拉开外门跌出去，瘫在灰区的长凳上大口喘气。酸雾从舱门缝里追出来一缕，很快被送风口抽散了。\n\
风淋舱的灯红红绿绿地闪了一阵，最后停在待机的黄。它尽了责，锁了门，放了气——至于里面的人死没死，不归它管。\n<span style='color: #ffaa00;'>厂房深处，好像有什么被这阵动静惊动了。</span>";
    },
    choices: [
      { text: "缓一缓", nextScene: "张江-华大-灰区", effect: updateTime(2) }
    ]
  },

  "结局-张江-风淋舱": {
    image: "images/placeholder.png", /* TODO: images/张江/风淋舱结局.webp */
    text: "酸雾一口比一口深。你滑坐在舱底，后背抵着冰冷的喷嘴墙，手指还在无意识地够那块面板。\n\
面板的红字闪到最后一格，安静地熄了。雾也慢慢散了——滤网尽职尽责地把污染物收了回去，把洁净还给了这间小屋。\n\
你是在全世界最干净的房间里，被干净憋死的。\n\
—— 结局：风淋舱 ——"
  },

  // ==================== 洁净主走廊（开放式中转枢纽） ====================

  "张江-华大-洁净主走廊": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-洁净主走廊.webp（白色管道顶） */
    onEnter: function(vars) { vars.currentPos = "洁净主走廊"; },
    text: function(vars) {
      var desc = "洁净主走廊又长又直，白得没有一丝阴影。头顶的管道一层压着一层，滤网箱呼呼地吞吐着空气，脚下的环氧地坪亮得能照出人影。\n\
走廊一头是风淋舱，另一头的双开气密门虚掩着，门上的牌子：核心工艺区。侧面还有一扇窄些的门：辅助运维区。";
      if (vars._jinbaoLeft) {
        desc += "\n通风停了。走廊里安静得能听见自己的心跳，空气闷得像盖了层湿被子。";
      } else if (vars._fabAlert > 0) {
        desc += "\n远处什么地方传来一声金属的轻响——像是有什么东西被警报惊动了，正在设备之间挪动。";
      }
      return desc;
    },
    choices: [
      { text: "进核心工艺区（白区）", nextScene: "张江-华大-白区", effect: updateTime(2) },
      { text: "进辅助运维区", nextScene: "张江-华大-运维区", effect: updateTime(2) },
      { text: "去风淋舱那头", nextScene: "张江-华大-风淋舱", effect: updateTime(2) }
    ]
  },

  // ==================== 核心工艺白区 ====================
  // 围攻（B2）：不穿无尘服、无引路人、自己穿行 → 高难度闪色，打穿后自由穿行。
  // 穿无尘服 → 识别玩法（三工位：A光刻=丧尸 / B薄膜=活人老陈 / C清洗=毒气型丧尸）。

  "张江-华大-白区": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-白区.webp（工位人影剪影、设备荧光） */
    onEnter: function(vars) { vars.currentPos = "白区"; },
    text: function(vars) {
      var desc = "气密门在身后合拢。这里就是白区——一间大得离谱的无尘车间，成排的工艺设备蒙着荧光，通道白亮亮地铺到视野尽头。\n\
设备之间，立着几条白色的人影。隔着距离和反光，看不清哪条是人，哪条不是。";
      if (vars._jinbaoLeft) {
        desc += "\n车间黑了大半，只有安全指示灯一排排红点点着。人影还立在老地方，只是更安静了。";
      }
      if (!vars._wearingCleanSuit && !vars._fabSwarmDone) {
        desc += "\n你这一身便装，在这片白色里显眼得像滴在牛奶里的墨水。\n\
最近的那几条人影，齐刷刷地转过头来。";
      } else if (vars._wearingCleanSuit) {
        desc += "\n你这一身白，混在人影里不算扎眼——只要你别跑、别喊，它们一时半会儿分不清你是什么。";
      } else {
        desc += "\n上回扑向你的那批已经躺下了。剩下的人影离得远，暂时没有动静。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (!vars._wearingCleanSuit && !vars._fabSwarmDone) {
        cs.push({
          text: function(v) { return hasMeleeWeapon(v) ? "握紧" + meleeWeaponName(v) + "迎战" : "握紧拳头迎战"; },
          nextScene: "张江-华大-白区-围攻",
          effect: updateTime(1)
        });
        cs.push({ text: "去洁净主走廊", nextScene: "张江-华大-洁净主走廊", effect: updateTime(2) });
        return cs;
      }
      if (!vars._fabFigADone) cs.push({ text: "靠近光刻机那台设备边的人影", nextScene: "张江-华大-白区-工位A", effect: updateTime(2) });
      else cs.push({ text: "再走一趟光刻机那边", nextScene: "张江-华大-白区-工位A", effect: updateTime(1) });
      if (!vars._fabFigBDone) cs.push({ text: "靠近薄膜沉积设备边的人影", nextScene: "张江-华大-白区-工位B", effect: updateTime(2) });
      else cs.push({ text: "再走一趟薄膜设备那边", nextScene: "张江-华大-白区-工位B", effect: updateTime(1) });
      if (!vars._fabFigCDone) cs.push({ text: "靠近化学清洗槽边的人影", nextScene: "张江-华大-白区-工位C", effect: updateTime(2) });
      else cs.push({ text: "再走一趟清洗槽那边", nextScene: "张江-华大-白区-工位C", effect: updateTime(1) });
      cs.push({ text: "往东，穿过车间去动力站", nextScene: "张江-华大-动力站-初遇", effect: updateTime(4) });
      cs.push({ text: "去洁净主走廊", nextScene: "张江-华大-洁净主走廊", effect: updateTime(2) });
      return cs;
    }
  },

  "张江-华大-白区-围攻": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-白区-围攻.webp */
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄"], function(vars) { return 6 + Math.min(1, vars._fabAlert); }),
    text: function(vars) {
      return "它们从设备后面涌出来，白色的身影一层叠一层，脚步声在空旷的车间里敲出回音。\n\
你且战且退，肩膀撞上一台设备的护罩——警报器应声尖叫，红色的旋转灯把整片白色染得一片血红。\n\
躲。还手。别停下。";
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：3红2蓝1绿1黄" },
        condition: checkFlashAnswer,
        nextScene: "张江-华大-白区-围攻-胜",
        elseScene: "结局-张江-白区",
        timeout: "14000 + _fabAlert * 1500",
        timeoutScene: "结局-张江-白区"
      }
    ]
  },

  "张江-华大-白区-围攻-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._fabSwarmDone = true;
      vars.chasedByZombies = Math.max(0, vars.chasedByZombies - 1);
      return updateTime(3)(vars);
    },
    text: function(vars) {
      return "你抡圆了最后一击，把扑在最前面的那条白影砸得栽进设备缝里。后面的几条慢了半拍——就这半拍，你抢出一条通道，撞开安全门冲了出去，反手把门带死。\n\
门板震了几下，安静了。\n\
你靠着墙喘气，白区的方向再没有动静。这一片，算是被你打穿了。" + weaponBrokeText(vars);
    },
    choices: [
      { text: "去洁净主走廊缓口气", nextScene: "张江-华大-洁净主走廊" }
    ]
  },

  "结局-张江-白区": {
    image: "images/zombieKnockYouDown.webp",
    onEnter: function(vars) { tryBreakWeapon(vars); return {}; },
    text: function(vars) {
      return "白色的身影把你压倒在同样白色的地坪上。红色警报灯一圈圈转着，把这一幕照得像舞台剧。\n\
它们撕开你的衣服时格外小心，仿佛嫌你身上的尘埃会弄脏这间屋子。\n\
—— 结局：白区 ——" + weaponBrokeText(vars);
    }
  },

  // ---- 工位A：光刻机（丧尸） ----
  "张江-华大-白区-工位A": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位A.webp */
    onEnter: function(vars) { vars.currentPos = "白区工位A"; },
    text: function(vars) {
      if (vars._fabFigADone) {
        return "光刻机边的那条人影已经躺倒在设备脚下了，白色无尘服摊在地上，像一截脱下来的蛇皮。\n\
机器的待机灯还在一明一灭，不知道在等谁的操作。";
      }
      var desc = "光刻机是车间里最金贵的设备，罩着黄色的防光帘。帘子边立着一条人影，背对着你。\n\
它的手臂每隔几秒抬起、放下，抬起、放下——像在重复同一个操作，不知疲倦，也绝不出错。";
      if (vars._fabFigAObs) desc += "\n你注意到：它没有呼吸的起伏。喉咙深处滚着一线含混的、湿漉漉的喉音，像烧开水前的那种响。";
      if (vars._plenumPeeked && !vars._fabFigAObs) desc += "\n（你在夹层的格栅上俯瞰过这片——靠光刻机这条，位置从没挪过。）";
      return desc;
    },
    choices: function(vars) {
      if (vars._fabFigADone) {
        return [{ text: "离开", nextScene: "张江-华大-白区", effect: updateTime(1) }];
      }
      var cs = [];
      if (!vars._fabFigAObs) {
        cs.push({ text: "再观察一会儿", nextScene: "张江-华大-白区-工位A-观察", effect: updateTime(3) });
      }
      cs.push({ text: "出声试探一下", nextScene: "张江-华大-白区-工位A-试探", effect: updateTime(1) });
      cs.push({
        text: function(v) { return hasMeleeWeapon(v) ? "握紧" + meleeWeaponName(v) + "动手" : "握紧拳头动手"; },
        nextScene: "张江-华大-白区-工位战A",
        effect: updateTime(1)
      });
      cs.push({ text: "绕开它", nextScene: "张江-华大-白区", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-华大-白区-工位A-观察": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位A.webp */
    onEnter: { set: { _fabFigAObs: true } },
    text: "你贴着设备的阴影又看了几分钟。\n\
它抬起手臂，按下什么，等待，再按下——动作精准得像台机器本身的一部分。可是它没有呼吸。胸口不起不伏，肩胛骨之间静得像一块案板。\n\
一条喉音从面罩下面丝丝地渗出来，湿的，含混的，不是任何一种语言。\n\
<span style='color: #ffaa00;'>这不是活人的动静。</span>",
    choices: [
      { text: "心里有数了", nextScene: "张江-华大-白区-工位A" }
    ]
  },

  "张江-华大-白区-工位A-试探": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位A.webp */
    text: "你隔着两台设备的距离，轻轻敲了敲护罩。\n\
那条人影停了半秒——然后以完全不符合刚才那种节奏的速度转过头来，脸“啪”地贴上防光帘的玻璃。\n\
面罩后面是一张干灰的脸，眼珠浑浊，像两颗泡久了的鱼眼。\n\
它离开设备，朝你来了。",
    choices: [
      { text: "迎战", nextScene: "张江-华大-白区-工位战A", effect: updateTime(1) },
      { text: "拉开距离跑开", nextScene: "张江-华大-白区", effect: updateTime(2) }
    ]
  },

  "张江-华大-白区-工位战A": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位战A.webp */
    onEnter: initMemoryGame(["红", "蓝", "绿"], 4),
    text: "它从防光帘边挤出来，黄色的光幕在它身后晃成一片。别被逼进帘子里——那里面是几千万一台的镜头。\n\
盯住它的手。它抓过来的路数是直的。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红1蓝1绿" },
        condition: checkFlashAnswer,
        nextScene: "张江-华大-白区-工位战A-胜",
        elseScene: "结局-张江-白区",
        timeout: 9000,
        timeoutScene: "结局-张江-白区"
      }
    ]
  },

  "张江-华大-白区-工位战A-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._fabFigADone = true;
      return updateTime(2)(vars);
    },
    text: function(vars) {
      return "你让过它的第一把抓，绕到侧面，给它后脑来了一下。它撞在光刻机的护罩上，滑下去，不动了。\n\
防光帘晃了几晃，慢慢停住。这条工位，安静了。" + weaponBrokeText(vars);
    },
    choices: [
      { text: "离开工位", nextScene: "张江-华大-白区" }
    ]
  },

  // ---- 工位B：薄膜沉积（老陈·活人） ----
  "张江-华大-白区-工位B": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位B.webp */
    onEnter: function(vars) { vars.currentPos = "白区工位B"; },
    text: function(vars) {
      if (vars._fabFigBKilled) {
        return "老陈倒在薄膜沉积机和料柜之间，扳手还攥在手里。\n\
没有人知道你对他做了什么。这间车间里也不会有人再喊他名字了。";
      }
      if (vars._fabFigBDone) {
        return "薄膜沉积机还开着。记录板摊在椅子上，笔帽没扣——人已经不在。南墙根去动力站的通道上，脚印还是新的。";
      }
      if (vars._jinbaoLeft) {
        return "薄膜沉积机已经停机，屏幕黑着。设备边的椅子推得整整齐齐，桌上一副老花镜压着个本子，翻在最后一页。\n\
这条工位上的人，走了。走得像下班。";
      }
      var desc = "薄膜沉积设备立在车间中段，管路像一捆灰色的肠子盘在它背后。设备边的人影比别处的矮半头，正弓着腰在记录板上写什么。\n\
它的动作有停顿，有回头，还会抬手揉一揉脖子——太“活”了，活得不像是这一片的东西。";
      if (vars._fabFigBObs) desc += "\n它已经察觉到你了。它慢慢退到设备后面，只露出半个头和一条攥着扳手的手臂。";
      return desc;
    },
    choices: function(vars) {
      if (vars._fabFigBKilled || vars._fabFigBDone || vars._jinbaoLeft) {
        return [{ text: "离开", nextScene: "张江-华大-白区", effect: updateTime(1) }];
      }
      var cs = [];
      if (!vars._fabFigBObs) {
        cs.push({ text: "再观察一会儿", nextScene: "张江-华大-白区-工位B-观察", effect: updateTime(3) });
      }
      cs.push({ text: "出声打个招呼", nextScene: "张江-华大-白区-工位B-对话", effect: updateTime(1) });
      cs.push({
        text: function(v) { return hasMeleeWeapon(v) ? "握紧" + meleeWeaponName(v) + "动手" : "握紧拳头动手"; },
        nextScene: "张江-华大-白区-工位B-误杀",
        effect: updateTime(1)
      });
      cs.push({ text: "绕开它", nextScene: "张江-华大-白区", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-华大-白区-工位B-观察": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位B.webp */
    onEnter: { set: { _fabFigBObs: true } },
    text: "你多看了几分钟。\n\
它写两笔，停一下，抬腕看表——表早就不走了，但它还是看了。然后它从口袋里摸出块压缩饼干，隔着面罩蹭了蹭嘴，又塞回去。\n\
会看表，会嘴馋，会不耐烦地叹气。\n\
<span style='color: #ffaa00;'>是活人。</span>",
    choices: [
      { text: "别轻举妄动", nextScene: "张江-华大-白区-工位B" }
    ]
  },

  "张江-华大-白区-工位B-对话": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位B-对话.webp */
    onEnter: { set: { _fabFigBDone: true } },
    text: "“别过来！”你刚出声，那条人影猛地缩到设备后面，扳手举过头顶，“我有扳手！我告诉你我抡得动！”\n\
是人的声音。哑得厉害，但是人的声音。\n\
你摊开双手站住。他从头罩后面打量了你半天，扳手慢慢放下来：“……不是那边来的？”他喘了口气，靠着设备滑坐下去，“我当你也是它们中的一个。这身衣服，害人害己。”\n\
他姓陈，薄膜这道工艺的老工程师。他说厂里活下来的就那么几个，都缩在东头动力站那边；“清洗槽这条你别去惹，那条早就不是人了，肚子里的东西一破，沾上就得烂。”\n\
他朝东边扬了扬下巴：“要去动力站，贴着南墙走，别在中间停留。”",
    choices: [
      { text: "谢过他", nextScene: "张江-华大-白区", effect: updateTime(1) }
    ]
  },

  "张江-华大-白区-工位B-误杀": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位B-误杀.webp */
    onEnter: { set: { _fabFigBKilled: true, _fabFigBDone: true } },
    text: function(vars) {
      return "你抢先出手。" + (hasMeleeWeapon(vars) ? meleeWeaponName(vars) : "拳头") + "落在身上的声音不对——太闷了，还带着一声短促的、人的闷哼。\n\
他倒下去的时候，扳手脱手滚出去老远。面罩摔歪了，露出半张脸——一张错愕的、老花镜滑到鼻尖的脸。\n\
他看着你，嘴动了动，没出声。然后就没有然后了。\n\
记录板摔在地上，那一页写着今天的日期，和一行没写完的设备读数。";
    },
    choices: [
      { text: "……", nextScene: "张江-华大-白区", effect: updateTime(2) }
    ]
  },

  // ---- 工位C：化学清洗槽（毒气型丧尸） ----
  "张江-华大-白区-工位C": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位C.webp */
    onEnter: function(vars) { vars.currentPos = "白区工位C"; },
    text: function(vars) {
      if (vars._fabFigCDone) {
        return "清洗槽边只剩一摊没干的痕迹，被地坪的排风拉出一道长长的痕。\n\
槽子里的液体早就干了，结成一层暗色的壳。";
      }
      var desc = "化学清洗槽那一角，排风管密得像一片小树林。槽边立着的人影一动不动，站姿歪斜，重心不在腿上，像一件被挂起来的衣服。\n\
它的无尘服肚子那一截鼓胀着——有东西在布料下面缓缓地蠕动，一圈，又一圈。";
      if (vars._fabFigCObs) desc += "\n隔着几米就能闻到那股甜腻味了，像熟透到发烂的水果。它的面罩内侧蒙着一层白雾，看不清脸。";
      if (vars._plenumPeeked && !vars._fabFigCObs) desc += "\n（你在夹层的格栅上看过这片——清洗槽那条人影的影子，比别人的宽一圈。）";
      return desc;
    },
    choices: function(vars) {
      if (vars._fabFigCDone) {
        return [{ text: "离开", nextScene: "张江-华大-白区", effect: updateTime(1) }];
      }
      var cs = [];
      if (!vars._fabFigCObs) {
        cs.push({ text: "再观察一会儿", nextScene: "张江-华大-白区-工位C-观察", effect: updateTime(3) });
      }
      cs.push({ text: "出声试探一下", nextScene: "张江-华大-白区-工位C-试探", effect: updateTime(1) });
      cs.push({
        text: function(v) { return hasMeleeWeapon(v) ? "握紧" + meleeWeaponName(v) + "动手" : "握紧拳头动手"; },
        nextScene: "张江-华大-白区-工位战C",
        effect: updateTime(1)
      });
      cs.push({ text: "绕开它（离远点）", nextScene: "张江-华大-白区", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-华大-白区-工位C-观察": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位C.webp */
    onEnter: { set: { _fabFigCObs: true } },
    text: "你捂着口鼻又靠近了半米。\n\
那股甜腻味浓起来了。它肚子上的布料洇出一圈湿痕，正在缓慢地扩大；蠕动的幅度比刚才大，像有什么急着要出来。\n\
它的面罩接缝处，一丝白雾正往外渗，一丝，又一丝。\n\
<span style='color: #ffaa00;'>这东西破了，遭殃的是方圆几米——别贴身。</span>",
    choices: [
      { text: "退开两步", nextScene: "张江-华大-白区-工位C" }
    ]
  },

  "张江-华大-白区-工位C-试探": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位C.webp */
    text: "你敲了敲旁边的排风管。\n\
它整条身子拧过来，动作像一段生锈的铰链。肚子胀得更圆了，白雾从面罩的每一道接缝里往外挤，嘶嘶地响。\n\
它朝你漂过来了——是的，漂，脚尖几乎没有离开过地面。",
    choices: [
      { text: "迎战", nextScene: "张江-华大-白区-工位战C", effect: updateTime(1) },
      { text: "拉开距离跑开", nextScene: "张江-华大-白区", effect: updateTime(2) }
    ]
  },

  "张江-华大-白区-工位战C": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-工位战C.webp */
    onEnter: initMemoryGame(["红", "蓝", "绿"], 4),
    text: "它漂过来的速度比看上去快。别让它近身，更别打它的肚子——排风的方向是朝你这边的。\n\
绕着槽子打。逼它转身。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红1蓝1绿" },
        condition: checkFlashAnswer,
        nextScene: "张江-华大-白区-工位战C-胜",
        elseScene: "结局-张江-毒气",
        timeout: 9000,
        timeoutScene: "结局-张江-毒气"
      }
    ]
  },

  "张江-华大-白区-工位战C-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._fabFigCDone = true;
      var splashed = vars.hasGasMask ? 5 : 15;
      vars.mercuryLoad = Math.min(100, (vars.mercuryLoad || 0) + splashed);
      return updateTime(2)(vars);
    },
    text: function(vars) {
      var desc = "你逼着它转了半个圈，一记横扫把它掀进空槽里。它挣扎着要爬出来，肚子上的布料“嘶”地裂了一道缝——白雾喷出来，被槽子上方的排风口一把拽了上去。\n\
它瘪下去，不动了。整条工位被排风拉得干干净净。";
      if (vars.hasGasMask) {
        desc += "\n几点飞溅落在你的面具上，你用袖子擦掉了。隔着滤罐，那股甜味只剩一点若有若无的尾巴。";
      } else {
        desc += "\n飞溅的液体星星点点落在你的手背和下巴上，凉丝丝的，带着那股甜味。你赶紧擦，越擦越觉得皮肤发麻。\n<span style='color: #ffaa00;'>有什么东西渗进来了。</span>";
      }
      return desc + weaponBrokeText(vars);
    },
    choices: [
      { text: "离开工位", nextScene: "张江-华大-白区" }
    ]
  },

  "结局-张江-毒气": {
    image: "images/placeholder.png", /* TODO: images/张江/毒气结局.webp */
    onEnter: function(vars) { tryBreakWeapon(vars); vars.mercuryLoad = Math.min(100, (vars.mercuryLoad || 0) + 20); return {}; },
    text: function(vars) {
      return "它抱住了你。\n\
在你倒下去之前，最后听见的是它肚皮裂开的那一声轻响——像拉开一罐放了太久的汽水。\n\
白雾温柔地漫过来，甜得发腻。这间车间一尘不染，连你死在这里，都算是弄脏了它。\n\
—— 结局：清洗槽 ——" + weaponBrokeText(vars);
    }
  },

  // ==================== 辅助运维区（小刘） ====================
  // 不穿无尘服初遇 → 虚惊相认（L1 主路，带路豁免白区围攻）；
  // 穿无尘服初遇 → 遭遇战（他把你当丧尸）；胜负按武器档位分打昏/打死。

  "张江-华大-运维区": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-运维区.webp（水泵、配电柜、灭火器） */
    onEnter: function(vars) { vars.currentPos = "辅助运维区"; },
    text: function(vars) {
      var desc = "辅助运维区比白区窄得多，两边是轰隆隆的水泵和一排配电柜，管道从头顶横穿过去，滴着冷凝水。\n\
地上摊着一只撬开的工具箱，扳手、万用表撒了一地——像是有人匆忙翻找过什么。";
      if (vars._jinbaoLeft) {
        desc += "\n水泵停了。这一区安静得只剩下你自己的脚步声，工具还摊在原地，蒙了层薄灰。";
        return desc;
      }
      if (vars._panicEmployeeState === "unmet") {
        desc += "\n配电柜的后面，隐约露着半截白色的身影——蹲着，抱着什么，在发抖。";
      } else if (vars._panicEmployeeState === "calmed") {
        if (vars._liuLedYou) desc += "\n配电柜边上空着——小刘把你领去动力站之后，就再没回这一区守泵了。他那具灭火器还立在柜子边。";
        else desc += "\n小刘蹲在配电柜边上，看见你进来，朝你比了个大拇指，又竖起一根手指抵在面罩前——嘘。";
      } else if (vars._panicEmployeeState === "injured") {
        desc += "\n小刘抱着灭火器缩在角落，头上的肿包消了些。看见你，他往柜子后面又缩了半个身位。";
      } else {
        desc += "\n他还倒在配电柜脚下，无尘服的胸口朝上，面罩裂着。你从他身边绕了过去。";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (vars._jinbaoLeft) {
        cs.push({
          text: "去设备密室那扇门看看",
          nextScene: "张江-华大-设备密室",
          effect: updateTime(2)
        });
        cs.push({ text: "去洁净主走廊", nextScene: "张江-华大-洁净主走廊", effect: updateTime(2) });
        return cs;
      }
      if (vars._panicEmployeeState === "unmet") {
        if (vars._wearingCleanSuit) {
          cs.push({ text: "走近那截发抖的白影", nextScene: "张江-华大-运维区-遭遇战", effect: updateTime(1) });
        } else {
          cs.push({ text: "绕过配电柜看看", nextScene: "张江-华大-运维区-虚惊", effect: updateTime(1) });
        }
      } else if (vars._panicEmployeeState === "calmed" && !vars._liuLedYou) {
        cs.push({ text: "跟小刘聊聊", nextScene: "张江-华大-运维区-闲聊", effect: updateTime(2) });
        cs.push({
          text: "请他带路去动力站",
          nextScene: "张江-华大-动力站-初遇",
          effect: updateTime(6, { set: { _liuLedYou: true } })
        });
      }
      cs.push({
        text: "去设备密室那扇门看看",
        nextScene: "张江-华大-设备密室",
        effect: updateTime(2)
      });
      cs.push({ text: "去洁净主走廊", nextScene: "张江-华大-洁净主走廊", effect: updateTime(2) });
      return cs;
    }
  },

  "张江-华大-运维区-虚惊": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-运维区-虚惊.webp */
    onEnter: { set: { _panicEmployeeState: "calmed" } },
    text: "你刚绕过配电柜，那截白影“腾”地弹起来——一具灭火器抡圆了朝你头上砸！\n\
你侧身一让，灭火器的喷嘴擦着你耳朵撞在柜门上，“哐”一声巨响。\n\
“别过来别过来别——”喊声卡住了。他看清了你的脸。面罩后面那双眼睛瞪得溜圆：“……人？你是人？！”\n\
他腿一软坐在地上，灭火器哐啷滚到一边：“我当是它们……哥，你可别怪我，这几天我看见白色的就头皮炸。”\n\
他姓刘，进厂第三年的操作员，声音还在抖：“厂里活下来的都缩在东头动力站。你要过去吗？我认路——中间那片车间别自己走，贴着我。”",
    choices: [
      {
        text: "请他带路去动力站",
        nextScene: "张江-华大-动力站-初遇",
        effect: updateTime(6, { set: { _liuLedYou: true } })
      },
      { text: "先自己转转", nextScene: "张江-华大-运维区", effect: updateTime(1) }
    ]
  },

  "张江-华大-运维区-遭遇战": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-运维区-遭遇战.webp */
    onEnter: initMemoryGame(["红", "蓝", "绿"], function(vars) { return 5 + Math.min(1, vars._fabAlert); }),
    text: "白影从配电柜后面弹出来，一声变了调的嘶吼——一具灭火器带着风声抡向你的面罩！\n\
他也穿着无尘服，你也穿着无尘服。他看不清你的脸，你隔着面罩也看不清他的表情。\n\
只有一具灭火器，实实在在地砸过来。",
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝1绿" },
        condition: checkFlashAnswer,
        nextScene: "张江-华大-运维区-制服",
        elseScene: "结局-张江-运维区",
        timeout: "12000 + _fabAlert * 1500",
        timeoutScene: "结局-张江-运维区"
      }
    ]
  },

  "张江-华大-运维区-制服": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._panicEmployeeState = (meleeWeaponTier(vars) >= 2) ? "dead" : "injured";
      return updateTime(2)(vars);
    },
    text: function(vars) {
      if (vars._panicEmployeeState === "dead") {
        return "你抢进他的内圈，一记重击正中胸口——他整个人飞出去，撞在配电柜上，滑下来，不动了。\n\
面罩摔裂了。底下是一张年轻的、错愕的脸，嘴还张着，像有一肚子话没喊出来。\n\
胸牌翻在外面：操作部，刘。\n\
他从头到尾，都以为自己在打丧尸。" + weaponBrokeText(vars);
      }
      return "你架开灭火器，用手背给他面罩上来了一下——不重，但把他打了个趔趄。他后脑磕在柜门上，眼睛一翻，软软地滑了下去。\n\
面罩摔歪了，露出半张年轻的脸。胸牌翻在外面：操作部，刘。\n\
你探了探鼻息——活着，就是睡过去了。打得不重，这小子命大，你手下也留了情。" + weaponBrokeText(vars);
    },
    choices: [
      { text: "离开这里", nextScene: "张江-华大-运维区", effect: updateTime(1) }
    ]
  },

  "张江-华大-运维区-闲聊": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-运维区-闲聊.webp */
    text: "小刘告诉你，厂里活下来的就这么几个：管动力的洪工、管设备的陈工，加他一个。\n\
“洪工是真厉害。”他压低声音，透着一点崇拜，“水是他保的，电是他保的，连吃的东西都是他算着分的。他说外面的水都不能喝，我们厂里的系统能把水弄到比药还干净。”\n\
他挠了挠头：“就是这几天油不多了。发电机一停，这些统统完蛋。”\n\
他朝密室那扇门努努嘴：“那边门锁着，钥匙在陈工那儿，我一次也没进去过。”",
    choices: [
      {
        text: "请他带路去动力站",
        nextScene: "张江-华大-动力站-初遇",
        effect: updateTime(6, { set: { _liuLedYou: true } })
      },
      { text: "回运维区", nextScene: "张江-华大-运维区", effect: updateTime(1) }
    ]
  },

  "结局-张江-运维区": {
    image: "images/zombieKnockYouDown.webp",
    onEnter: function(vars) { tryBreakWeapon(vars); return {}; },
    text: function(vars) {
      return "灭火器的底部砸在你的面罩上。镜片碎成蛛网，你眼前最后的东西是那片白色的、带着裂纹的天花板。\n\
他还在砸。一下，又一下，嘴里翻来覆去喊着同一句话：“死开！死开啊！”\n\
他到最后都不知道，被他砸倒的这个，是人。\n\
—— 结局：好心办坏事 ——" + weaponBrokeText(vars);
    }
  },

  // ==================== 设备密室（#26 未定，占位） ====================
  "张江-华大-设备密室": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-设备密室.webp */
    onEnter: function(vars) { vars.currentPos = "设备密室门口"; },
    text: "运维区尽头有一扇加厚的钢门，门牌上只有两个字：机要。门禁读卡器亮着红灯，锁得死死的。\n\
（作者尚未更新此处）",
    choices: [
      { text: "去运维区", nextScene: "张江-华大-运维区", effect: updateTime(1) }
    ]
  },

  // ==================== 上送风夹层（密道） ====================
  // 弱黑暗：手电/手机可（手机 -5 电）；火把=密闭烟熏结局；无光摸黑退回。
  // 格栅俯瞰白区 = 免费观察位。

  "张江-华大-夹层-入口": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-夹层-入口.webp（检修口、笼式爬梯） */
    onEnter: function(vars) { vars.currentPos = "夹层检修口"; },
    text: function(vars) {
      return "你踩着笼式爬梯探进检修口。夹层在洁净区天花板的上头，一进去就被管道和风管挤得只剩一条矮廊，人只能弓着背挪。\n\
里面黑得纯粹——检修灯早断了电，唯一的亮是远处格栅缝里漏上来的一点微光。";
    },
    choices: function(vars) {
      var cs = [];
      if (vars.hasTorch) {
        cs.push({ text: "打开手电筒，弓着腰进去", nextScene: "张江-华大-夹层", effect: updateTime(4) });
      }
      if (vars.hasPhone && vars.phoneBattery > 0) {
        cs.push({
          text: "打开手机照明（电量 {phoneBattery}%）",
          nextScene: "张江-华大-夹层",
          effect: function(v) {
            v.phoneBattery = Math.max(0, v.phoneBattery - 5);
            return updateTime(4)(v);
          }
        });
      }
      if (vars.hasFireTorch) {
        cs.push({ text: "点燃火把，举着爬进去", nextScene: "结局-张江-夹层" });
      }
      cs.push({ text: "摸黑往里爬", nextScene: "张江-华大-夹层-摸黑", effect: updateTime(4) });
      cs.push({ text: "算了，下去", nextScene: "张江-华大-灰区", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-华大-夹层-摸黑": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-夹层-摸黑.webp */
    text: "你摸黑往里拱了没几米，脑门就结结实实磕在一根风管的法兰上，疼得眼冒金星。再往前，手掌按到一片黏腻的灰，不知道积了多少年。\n\
四下里全是一个质地的黑，方向感以肉眼可见的速度蒸发。你摸索着退回检修口，后背已经湿透。\n\
这里没有光，就走不了。",
    choices: [
      { text: "去灰区", nextScene: "张江-华大-灰区", effect: updateTime(2) }
    ]
  },

  "张江-华大-夹层": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-夹层.webp（风管、格栅透光） */
    onEnter: function(vars) { vars.currentPos = "送风夹层"; },
    text: function(vars) {
      var light = vars.hasTorch ? "手电的光柱在管道之间折来折去" : "手机的背光在管道之间晃出一小圈惨白";
      var desc = "你在送风夹层里弓着背前行。" + light + "，照出层层叠叠的风管、线槽和阀轮，脚下的格栅板一步一响。\n\
格栅的缝隙里漏着下方的微光——透过这些缝，能看见整个白区在脚底下铺开。";
      if (vars._plenumPeeked) desc += "\n你已经趴在格栅上看过一轮了。";
      return desc;
    },
    choices: [
      {
        showCondition: "!_plenumPeeked",
        text: "趴在格栅上，往下看看白区",
        nextScene: "张江-华大-夹层-俯瞰",
        effect: updateTime(3)
      },
      { text: "沿夹层往东，去动力站方向的检修口", nextScene: "张江-华大-动力站-初遇", effect: updateTime(6) },
      { text: "沿夹层往西，去灰区检修口", nextScene: "张江-华大-灰区", effect: updateTime(4) }
    ]
  },

  "张江-华大-夹层-俯瞰": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-夹层-俯瞰.webp（格栅视角的白区人影） */
    onEnter: { set: { _plenumPeeked: true } },
    text: "你趴在格栅上，从上往下看整个白区。\n\
光刻机边那条人影，还站在老位置，手臂抬起来，放下去，抬起来，放下去——从这个角度看得清清楚楚，它脚下连一步都没有挪过。\n\
薄膜设备边那条，一会儿写两笔，一会儿抬起手腕看看——看了好几次。\n\
清洗槽边那条最不对劲。它的影子比别人宽出一圈，肚子那里鼓着，偶尔不自然地抖一下。\n\
看够了。下面哪条能惹、哪条不能惹，你心里有数了。",
    choices: [
      { text: "继续赶路", nextScene: "张江-华大-夹层" }
    ]
  },

  "结局-张江-夹层": {
    image: "images/placeholder.png", /* TODO: images/张江/夹层结局.webp */
    text: "火把在夹层里烧得很旺。你举着它往里爬了十几米，才发现不对——烟没有地方去。\n\
它们贴着天花板积起来，越积越厚，最后把你和火把一起泡在里面。你弓着背，退无可退，前面的管道和后面的管道一样烫。\n\
安全出口的标志牌在烟里泛着幽幽的绿光，离你只有五米。它们大概到死都是绿的。\n\
—— 结局：灯下黑 ——"
  },

  // ==================== 动力站（洪金宝线主场景） ====================
  // 入口三路汇入“初遇”：白区穿行 / 小刘带路（运维区）/ 送风夹层（动力站端检修口）。
  // 知识状态：K1 = _visit['三林安居苑-8号楼-204室'] > 0；K2 = hasBottle && _hongBottleLabel。
  // 撤离日 computed _jinbaoLeft（core.js）——断电版 text/choices 全按它分支。

  "张江-华大-动力站-初遇": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站.webp（发电机、纯水系统、值班桌） */
    onEnter: function(vars) {
      vars.currentArea = "张江";
      vars.currentPlace = "华大半导体";
      vars.currentPos = "动力站";
      // 记下走的是哪条路：_lastScene 到了「会面」就被本场景覆盖了，分支必须在这里定死
      if (!vars._metJinbao) {
        if (vars._lastScene === "张江-华大-运维区-虚惊" || vars._lastScene === "张江-华大-运维区-闲聊" || vars._lastScene === "张江-华大-运维区") vars._jinbaoIntroVia = "刘";
        else if (vars._lastScene === "张江-华大-夹层") vars._jinbaoIntroVia = "夹层";
        else vars._jinbaoIntroVia = "自己";
      }
    },
    text: function(vars) {
      if (vars._jinbaoLeft) {
        return "你推开动力站那扇厚重的防火门。门没锁——里面也没人锁它了。\n\
发电机的嗡嗡声消失了，仪表盘黑着，只剩安全出口的指示牌泛着一点绿。空气里还留着一点柴油味，像一台机器刚咽气不久。";
      }
      if (vars._metJinbao) {
        var back = "你回到动力站。";
        if (vars._lastScene === "张江-华大-夹层") back = "你从检修口爬下来，落进动力站。";
        return back;
      }
      var desc = "";
      if (vars._jinbaoIntroVia === "刘") {
        desc = "小刘领着你贴墙穿过车间连廊，在一扇厚重的防火门前停下，敲了三长两短。\n\
门开了一条缝，先探出来的是一根钢管，然后才是一只布满血丝的眼睛。看清小刘身后的你，那只眼睛瞪圆了。";
      } else if (vars._jinbaoIntroVia === "夹层") {
        desc = "你顺着检修口的爬梯下到底，掀开一块格栅板——底下就是动力站。\n\
一个正蹲在仪表前的人猛地回头，手里的扳手差点脱手：“夹、夹层？！你从上面下来的？！”";
      } else {
        desc = "你穿过车间东侧的气密门，走进一间被机器轰鸣填满的厂房。发电机、水泵、成排的滤柱，指示灯一明一灭。\n\
一个蹲在仪表前的人猛地站起来，顺手抄起了手边的钢管。";
      }
      if (vars._fabAlert > 0) desc += "\n“警报是不是你弄响的？”他没放下钢管，声音绷得很紧，“响过之后，我们以为又来了一批。”";
      return desc;
    },
    choices: function(vars) {
      if (vars._jinbaoLeft || vars._metJinbao) {
        return [{ text: "继续", nextScene: "张江-华大-动力站" }];
      }
      return [{ text: "举起双手", nextScene: "张江-华大-动力站-会面", effect: updateTime(1) }];
    }
  },

  // 初见：自我介绍 + 来历盘问（拷问不是玩家选的，是他问出来的）
  "张江-华大-动力站-会面": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-会面.webp */
    onEnter: { set: { _metJinbao: true } },
    text: function(vars) {
      var desc = "";
      if (vars._jinbaoIntroVia === "刘") {
        desc += "“人！是活人！”小刘先喊出了声，一屁股坐在纸箱上，拍着胸口直喘。\n\
拿钢管的人迟疑了两秒，把家伙放回仪表台上。四十来岁，工装洗得发白，眼窝陷得很深，但眼神是清醒的。\n\
“华大半导体，动力部，洪金宝。”他扯了扯嘴角，算是笑，“这栋楼里还喘气的，都到齐了——我，盯设备的老陈，加上这个守泵的。”";
      } else {
        desc += "拿钢管的人盯着你看了足有五秒，才把家伙放回仪表台上。四十来岁，工装洗得发白，眼窝陷得很深，但眼神是清醒的。\n\
“华大半导体，动力部，洪金宝。”他扯了扯嘴角，算是笑，“这栋楼里还喘气的，拢共仨——我，盯设备的老陈，还有个在外头辅助区守泵的小刘。你能自己摸到这儿，是本事，也是运气。”";
      }
      desc += "\n\
他倒了半杯水递给你，盯着你看了两眼，终于还是问了：“这半个月，你是头一个从外面进来的。你……从哪个方向过来的？”";
      return desc;
    },
    choices: [
      { text: "“从西边来的。三林那边。”", nextScene: "张江-华大-动力站-来历", effect: updateTime(2) },
      { text: "“……从哪来的，重要吗。”", nextScene: "张江-华大-动力站-含糊", effect: updateTime(2) }
    ]
  },

  // 含糊其辞：暂时躲过去，但题还在（hub 聊天里可再触发拷问）
  "张江-华大-动力站-含糊": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-会面.webp */
    text: "他盯着你看了两秒，喉结动了动，最后只是点了点头。\n\
“……不重要。活人都一样——都是从死人堆里爬出来的。”他把水杯往你面前又推了推，“喝吧，厂里的水。外面的水，你最好一口都别沾。”\n\
他转回仪表台去了。只是那半杯水，你看见他倒的时候，手抖了一下。",
    choices: [
      { text: "岔开话题", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // 说出“三林”：K0 → 反向委托；K1/K2 → 拷问触发
  "张江-华大-动力站-来历": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-会面.webp */
    text: function(vars) {
      var k1 = vars._visit && vars._visit['三林安居苑-8号楼-204室'] > 0;
      if (k1) {
        return "“三林。”他重复了一遍这两个字，端着的搪瓷缸在半空停住了。\n\
水汽从缸口升上来，糊在他镜片上。他摘下眼镜，捏着镜腿，半天没说话。\n\
“我爸住三林。安居苑。”他终于开口，声音放得很平，平得像在念仪表读数，“8 号楼，204。”\n\
他抬起眼看着你：“你见过我爸吗？”";
      }
      return "“三林。”他重复了一遍这两个字，端着的搪瓷缸在半空停住了。\n\
“我爸住三林。安居苑。”他终于开口，声音放得很平，“8 号楼，204。退休前是搞水务的，一个人住，倔得要命——水管工上门他都嫌人家手潮。”\n\
他搓了搓手指：“电话是 28 号打不通的。你从那边过来……”他顿了顿，“你要是还回去，帮我看看他。告诉他，厂里没事，儿子挺好。”";
    },
    choices: function(vars) {
      var k1 = vars._visit && vars._visit['三林安居苑-8号楼-204室'] > 0;
      if (k1) {
        return [{ text: "迎着他的目光", nextScene: "张江-华大-动力站-拷问", effect: updateTime(1) }];
      }
      return [{ text: "答应他", nextScene: "张江-华大-动力站-委托", effect: updateTime(1) }];
    }
  },

  // K0：双重委托（爸爸 + 曹睿泽）。_foundFriend 已置位时出“先发现后委托”直通选项（B3）。
  "张江-华大-动力站-委托": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-会面.webp */
    onEnter: { set: { _jinbaoCommission: true, _jinbaoFriendCommission: true } },
    text: function(vars) {
      var desc = "你点了点头。他肩膀松下来一截，从怀里摸出一个笔记本，翻到空白页，认认真真写下“爸”字，又画了个方框。\n\
“还有件事。”他犹豫了一下，“上科大有个我大学同学，曹睿泽，读研留校的。以前每周都要通个电话，互相损两句。28 号之后，就再没打通过。”\n\
他把笔帽扣上：“你要是往西走……顺便，看看他。”";
      return desc;
    },
    choices: function(vars) {
      if (vars._foundFriend) {
        return [
          { text: "“曹睿泽……他已经不在了。”", nextScene: "张江-华大-动力站-曹睿泽-回报", effect: updateTime(1) },
          { text: "先应下，别的以后再说", nextScene: "张江-华大-动力站", effect: updateTime(1) }
        ];
      }
      return [{ text: "都记下了", nextScene: "张江-华大-动力站", effect: updateTime(1) }];
    }
  },

  // 道德拷问三选（§八）。K2（标签瓶）强制破题。
  "张江-华大-动力站-拷问": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-拷问.webp */
    text: function(vars) {
      var k2 = vars.hasBottle && vars._hongBottleLabel;
      if (k2) {
        return "你还没想好怎么开口，他的目光先落在了你腰间的水瓶上。\n\
瓶身上那行圆珠笔字，隔着两米都看得清——“芜湖 6.25”。\n\
他站了起来。一步一步走过来，动作慢得像怕惊掉什么。他伸手，没碰瓶子，指尖悬在标签上方。\n\
“这瓶子……”他的声音哑了，“你从我爸那儿拿的。”\n\
不是问句。屋里安静得能听见发电机的每一声嗡鸣。\n\
“我爸呢。”";
      }
      return "屋里安静得能听见发电机的每一声嗡鸣。\n\
他站在你面前，手里还捏着那半杯水，指节因为用力泛了白。\n\
“我爸呢。”";
    },
    choices: [
      { text: "说出 204 的一切", nextScene: "张江-华大-动力站-告知", effect: updateTime(2) },
      {
        text: function(vars) {
          return vars._foundHongContact ? "替他把那句话带到：“他没事。”" : "撒个谎：“他挺好的。”";
        },
        nextScene: "张江-华大-动力站-谎言",
        effect: updateTime(2)
      },
      { text: "“……我不清楚那边的情况。”", nextScene: "张江-华大-动力站-沉默", effect: updateTime(2) }
    ]
  },

  // truth：崩溃 →（电线细节）→ 案例表确证 → 真相链第三方物证
  "张江-华大-动力站-告知": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-告知.webp */
    onEnter: { set: { _toldJinbaoTruth: "truth", _jinbaoCaseComplete: true } },
    text: function(vars) {
      var desc = "“安居苑 8 号楼 204。”你说，“你爸他——”\n\
后面的话你尽量说得平。他从哪天开始不对劲，怎么一个人撑着，最后怎么样了。\n\
洪金宝一直站着听，一动不动。听到最后，他扶住仪表台，慢慢地、慢慢地坐了下去，像一栋被抽掉承重柱的楼。\n\
他没有嚎。他只是用手背抵着嘴，肩膀一耸一耸，从喉咙里漏出一点压碎的声音。";
      if (vars._visit && vars._visit['三林安居苑-8号楼-204室-电线'] > 0) {
        desc += "\n\
“他把自己绑在了暖气片上。”你说，“到死，总阀都是关着的。”\n\
他抬起头，眼泪淌了满脸，却点了点头：“……他就是这样的人。”";
      }
      desc += "\n\
过了很久，他抹了把脸，从怀里摸出那个笔记本，翻到写满名字和日期的那几页，一笔一笔，添上最后一行。\n\
“6 月 26 号起喝的自来水。28 号下午说口渴。当夜。”他念完，合上本子，“齐了。全对上了——时间线完整得……没有第二种解释。”\n\
他把本子递到你面前，双手，像递一份交接单：“带走。给需要的人看。”";
      desc += "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得[洪金宝的案例记录表]——6/28 起，出事的都是“回家喝水的人”。</span>";
      return desc;
    },
    choices: [
      { text: "郑重收下", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // lie：替老洪送达未发送的短信 → 当场吃泡面 + 塞一包饼干
  "张江-华大-动力站-谎言": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-谎言.webp */
    onEnter: function(vars) {
      vars._toldJinbaoTruth = "lie";
      vars._jinbaoFed = true;
      vars._wearingCleanSuit = false; // 当场吃面：连体服帽子得揭开，与整理整理进食门槛一致
      vars.strength = Math.min(10, vars.strength + 3); // 当场吃下的泡面
      vars._travelMinutes = 0;                          // 吃东西按惯例清行程疲劳
      return {};
    },
    text: function(vars) {
      var desc = "";
      if (vars._foundHongContact) {
        desc += "“我在你爸那儿，看到了他没发出去的短信。”你说，“他让我告诉你——”\n\
“他没事。他让你别喝自来水。”";
      } else {
        desc += "“我去过三林。”你说，“你爸挺好。他托人带话——他没事，让你别喝外面的水。”";
      }
      desc += "\n\
洪金宝愣住了。然后他笑了，笑得眼角的褶子全堆起来，用袖子在眼睛上胡乱抹了一把。\n\
“这老头子。”他说，“他就会这样。天塌下来，先想着别吓着别人。”\n\
他转身的动作都轻快了，从纸箱里翻出藏着的泡面，用纯水泡上，又塞给你一包饼干：“吃！今天高兴！”\n\
你捧着那碗面。热气熏在脸上，你不敢抬头看他。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】吃下泡面（体力+3，当前体力 {strength}）。</span>";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (!vars.hasBiscuit) {
        cs.push({
          text: "收下那包饼干",
          condition: "itemCount < bagVolume",
          nextScene: "张江-华大-动力站",
          effect: { set: { hasBiscuit: true }, add: { itemCount: 1 } },
          elseScene: "整理整理"
        });
      }
      cs.push({ text: "面吃完了", nextScene: "张江-华大-动力站", effect: updateTime(10) });
      return cs;
    }
  },

  // silent：客气变淡
  "张江-华大-动力站-沉默": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-沉默.webp */
    onEnter: { set: { _toldJinbaoTruth: "silent" } },
    text: "“我不清楚那边的情况。”你说，“我……没去过那一片。”\n\
他看了你很久。久到发电机都嗡了十几轮。\n\
“……好。”他说。就一个字。\n\
他把那半杯水收了回去，重新坐回仪表台前，背对着你。厂房屋顶的灯把他的影子拉得很长，长到把你隔开。\n\
“水在东边，自己接。”他的声音听不出情绪，“别碰黄色标签的阀。”",
    choices: [
      { text: "……", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // 动力站 hub：在场版 / 断电版（_jinbaoLeft）
  "张江-华大-动力站": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站.webp */
    onEnter: function(vars) {
      vars.currentArea = "张江";
      vars.currentPlace = "华大半导体";
      vars.currentPos = "动力站";
    },
    text: function(vars) {
      if (vars._jinbaoLeft) {
        var dark = "动力站空了。发电机哑着，仪表黑着，几只行军床叠在墙角，床下的鞋印还是新的。\n\
纯水系统停了机。系统旁边，一字排开几只白色的大水桶，桶身上是马克笔的字：“给可能会来的人。”";
        if (!vars._noteRead) dark += "\n\
值班桌上压着一张字条，用一只搪瓷缸镇着。";
        else dark += "\n\
那张字条还压在搪瓷缸底下。";
        return dark;
      }
      var desc = "动力站是这栋楼的心脏——发电机低吼着，水泵喘着，一排滤柱的仪表上，数字绿得发亮。\n\
洪金宝守在仪表台前，那个写满名字和日期的笔记本就摊在手边。\n";
      if (vars._panicEmployeeState === "calmed" && vars._liuLedYou) desc += "小刘在地铺上坐着，见你进来，咧嘴笑了笑，又赶紧把手指竖在嘴前——嘘，洪工在看数据。\n";
      else if (vars._panicEmployeeState === "calmed") desc += "“外头辅助区那个守泵的，姓刘。”洪金宝朝西边偏了偏头，“他愿意给你带路，就跟着他走，别自己穿车间。”\n";
      else if (vars._panicEmployeeState === "injured") desc += "“小刘上回在辅助区让人开了瓢。”洪金宝摇摇头，“打那以后就缩在那边不肯挪窝，见着白影就躲。”\n";
      else if (vars._panicEmployeeState === "dead") desc += "“小刘到现在没回辅助区的话。”洪金宝看了看西边那扇门，眉头拧着，没再往下问。\n";
      else desc += "“外头辅助区还守着个人，姓刘。”洪金宝提了一句，“你要走那边，报我的名字。”\n";
      if (vars._fabFigBKilled) desc += "发电机上搁着一只老陈的茶缸，茶早凉透了。没人收。\n";
      else if (chenInWorkshop(vars)) desc += "老陈那只茶缸搁在发电机边上，还温着——人这会儿在车间盯他那台薄膜机。\n";
      else desc += "老陈蹲在发电机边上，就着灯光听那台机器的动静，像老中医号脉——这台机器和车间里他那台薄膜机，他一天要来回跑好几趟。\n";
      if (vars.dd >= 3 && !vars._dieselDelivered && !vars._jinbaoDieselAsked) {
        desc += (vars._fabFigBKilled || chenInWorkshop(vars))
          ? "洪金宝拿指关节敲了两下发电机的油位表，敲完盯着那根针没说话——像在盘算一句难开口的话。\n"
          : "老陈忽然抬头看了你一眼，嘴唇动了动，又低下头去——像有话想说。\n";
      } else if (vars.dd < 3 && !vars._dieselDelivered) {
        desc += vars._fabFigBKilled
          ? "没人再拍那台发电机的外壳跟它说话了。油位表上的针，比昨天又低了一点。\n"
          : chenInWorkshop(vars)
            ? "油位表上的针又低了一点。没人拍那台机器的外壳跟它说话。\n"
            : "老陈拍了拍发电机外壳：“油还够几天。省着烧。”\n";
      }
      if (vars._toldJinbaoTruth === "silent") desc += "洪金宝没有再看你。自打你说“不清楚”之后，他和你说话，都是隔着仪表说的。\n";
      return desc;
    },
    choices: function(vars) {
      if (vars._jinbaoLeft) {
        var cs = [];
        if (!vars._noteRead) cs.push({ text: "拿起那张字条", nextScene: "张江-华大-动力站-字条", effect: updateTime(2) });
        else cs.push({ text: "再看一遍字条", nextScene: "张江-华大-动力站-字条", effect: updateTime(1) });
        cs.push({ text: "去水桶接水", nextScene: "张江-华大-动力站-纯水", effect: updateTime(1) });
        cs.push({ text: "在行军床上歇一会儿", nextScene: "张江-华大-动力站-休息" });
        cs.push({
          showCondition: "itemCount > 0",
          text: "🎒整理一下物品",
          nextScene: "整理整理",
          effect: { set: { positionAfterOperation: "张江-华大-动力站" } }
        });
        cs.push({ text: "往西，穿过车间回白区", nextScene: "张江-华大-白区", effect: updateTime(4) });
        cs.push({ text: "爬检修口，进送风夹层", nextScene: "张江-华大-夹层", effect: updateTime(2) });
        return cs;
      }
      var cs2 = [];
      cs2.push({ text: "和洪金宝聊聊", nextScene: "张江-华大-动力站-聊天", effect: updateTime(2) });
      cs2.push({ text: "去纯水系统接水", nextScene: "张江-华大-动力站-纯水", effect: updateTime(1) });
      if (vars.dd >= 3 && !vars._jinbaoDieselAsked && !vars._dieselDelivered) {
        cs2.push({
          text: (vars._fabFigBKilled || chenInWorkshop(vars)) ? "问洪金宝在盘算什么" : "问老陈想说什么",
          nextScene: "张江-华大-动力站-柴油-接",
          effect: updateTime(2)
        });
      }
      if (vars.hasDieselCan && !vars._dieselDelivered) {
        cs2.push({ text: "把柴油桶搬进来", nextScene: "张江-华大-动力站-柴油-交", effect: updateTime(3) });
      }
      cs2.push({ text: "在行军床上歇一会儿", nextScene: "张江-华大-动力站-休息" });
      cs2.push({
        showCondition: "itemCount > 0",
        text: "🎒整理一下物品",
        nextScene: "整理整理",
        effect: { set: { positionAfterOperation: "张江-华大-动力站" } }
      });
      cs2.push({ text: "往西，穿过车间回白区", nextScene: "张江-华大-白区", effect: updateTime(4) });
      cs2.push({ text: "爬检修口，进送风夹层", nextScene: "张江-华大-夹层", effect: updateTime(2) });
      return cs2;
    }
  },

  // 聊天话题列表（在场版）
  "张江-华大-动力站-聊天": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-聊天.webp */
    text: function(vars) {
      var desc = "洪金宝把笔记本合上，给你让了半张凳子。仪表的绿光映在他脸上。\n\
“聊吧。”他说，“这栋楼里，快没人跟我说话了。”";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      cs.push({ text: "问他是怎么撑到现在的", nextScene: "张江-华大-动力站-聊天-自己", effect: updateTime(3) });
      cs.push({ text: "问厂里其他人的情况", nextScene: "张江-华大-动力站-聊天-厂里", effect: updateTime(2) });
      if (!vars._jinbaoFriendCommission && !vars._jinbaoFriendTold && !vars._foundFriend) {
        cs.push({ text: "问他还记挂着谁", nextScene: "张江-华大-动力站-曹睿泽-委托", effect: updateTime(2) });
      }
      if (vars._foundFriend && !vars._jinbaoFriendTold) {
        cs.push({ text: "告诉他曹睿泽的事", nextScene: "张江-华大-动力站-曹睿泽-回报", effect: updateTime(2) });
      }
      if (vars._hasFriendPhoto && !vars._jinbaoPhotoShown) {
        cs.push({ text: "把那张合照拿给他看", nextScene: "张江-华大-动力站-合照", effect: updateTime(2) });
      }
      if (vars._hasTestReport && !vars._jinbaoReportRead) {
        cs.push({ text: "把检测中心的报告给他看", nextScene: "张江-华大-动力站-报告", effect: updateTime(3) });
      }
      if (vars._toldJinbaoTruth === "lie" || vars._toldJinbaoTruth === "silent") {
        cs.push({ text: "“关于你父亲……有件事，我得说。”", nextScene: "张江-华大-动力站-补救", effect: updateTime(2) });
      }
      if (vars._visit && vars._visit['三林安居苑-8号楼-204室'] > 0 && vars._toldJinbaoTruth === "") {
        cs.push({ text: "他欲言又止了很久——终究还是问：“你见过我爸吗？”", nextScene: "张江-华大-动力站-拷问", effect: updateTime(1) });
      }
      cs.push({ text: "不聊了", nextScene: "张江-华大-动力站", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-华大-动力站-聊天-自己": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-聊天.webp */
    text: "“我？”他扬了扬下巴，指指身后那排滤柱，“水。厂里的水救了我。”\n\
“半导体的水要走超纯水系统——反渗透、离子交换、紫外，一层层滤下来，比药还干净。我们这行喝惯了厂里的水，谁去喝饮水机。”他顿了顿，“所以 28 号那天，大家都倒了，我没倒。就这么简单。”\n\
他翻开笔记本。一页页全是名字、日期、住址，和几行短得扎眼的字。\n\
“28 号起，群里的人一个个报病、消失。我把能打听到的情况都记下来——谁，哪天，住哪，最后一条消息说的什么。”他的指头点着表格，“出事的，好像都是‘回家的人’。住厂里的、喝厂里水的，一个都没有。”\n\
他合上本子，揉了揉眉心：“可我闭合不了这个变量。回家的多了，倒下的多了——为什么？总有个东西是他们共有的。我算不出来。”\n\
他看着你，忽然笑了一下，笑得很难看：“我是个工程师。我这辈子最恨的，就是算不出来的东西。”",
    choices: [
      { text: "换个话题", nextScene: "张江-华大-动力站-聊天", effect: updateTime(1) }
    ]
  },

  "张江-华大-动力站-聊天-厂里": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-聊天.webp */
    text: function(vars) {
      var desc = "“厂里活下来的，就这么几个了。”他扳着手指，“我，管动力；老陈，管设备——他那个岁数，硬得像他修的那些泵。”";
      if (vars._fabFigBKilled) {
        desc += "\n\
“老陈前两天说，他那台机器上还压着一批没走完的货，非要回去盯。”他皱眉，“都两天了，也该回来了。”\n\
你端着水杯的手，很稳。";
      } else {
        desc += "“他隔一阵就回车间盯他的薄膜机。我说那些货早没主了，他说机器停了他心里空。”";
      }
      if (vars._panicEmployeeState === "dead") {
        desc += "\n\
“还有小刘……辅助区的泵还在转，人却不在工位上。”他盯着仪表，声音低下去。";
      } else if (vars._panicEmployeeState === "injured") {
        desc += "\n\
“小刘上回在辅助区，让一个闯进来的‘东西’开了瓢。”他摇摇头，“打那以后，见着白影就躲。也好，怕死才活得长。”\n\
你点了点头。那个闯进去的“东西”，就是你。";
      } else if (vars._panicEmployeeState === "calmed") {
        desc += vars._liuLedYou
          ? "\n“小刘是个好孩子。就是吓破了胆。”他压低声音，“多亏他把你领进来——不然我这根钢管，可能就先跟你打招呼了。”"
          : "\n“小刘是个好孩子。就是吓破了胆。”他压低声音，“他还敢在外头守泵，比我想的硬气。”";
      } else {
        desc += "\n\
“还有个小刘，在外头辅助区守着泵。胆子小，人机灵。”";
      }
      return desc;
    },
    choices: [
      { text: "换个话题", nextScene: "张江-华大-动力站-聊天", effect: updateTime(1) }
    ]
  },

  // 曹睿泽委托（会面没走到这里时，从聊天补发）
  "张江-华大-动力站-曹睿泽-委托": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-聊天.webp */
    onEnter: { set: { _jinbaoFriendCommission: true } },
    text: "他沉默了一会儿，手指在笔记本封皮上敲了两下。\n\
“上科大有个我大学同学。曹睿泽。”他说，“读研留校的，搞材料。以前每周都要通个电话，互相损两句——他嘴欠，但欠得有意思。”\n\
“28 号之后，电话就再没打通过。”他抬起头，“人工智能岛往西就是上科大。你要是去那边……顺便，看看他。”\n\
他笑了一下：“看见他，替我骂他一句。电话都不敢接，胆小鬼。”",
    choices: function(vars) {
      if (vars._foundFriend) {
        return [
          { text: "“曹睿泽……他已经不在了。”", nextScene: "张江-华大-动力站-曹睿泽-回报", effect: updateTime(1) },
          { text: "先应下", nextScene: "张江-华大-动力站-聊天", effect: updateTime(1) }
        ];
      }
      return [{ text: "应下了", nextScene: "张江-华大-动力站-聊天", effect: updateTime(1) }];
    }
  },

  // 曹睿泽回报（C2 流程）：K0 假设路径核心场景
  "张江-华大-动力站-曹睿泽-回报": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-曹睿泽-回报.webp */
    onEnter: { set: { _jinbaoFriendTold: true } },
    text: function(vars) {
      var desc = "你把上科大那间宿舍的事说了。门牌 214。床上的人。拆空的药板。\n\
“他……”洪金宝的声音低下去，“怎么走的？屋里……是什么样的？”\n\
你描述给他听：桌上晾着的凉白开，喝到一半的杯子；烧水壶，壶嘴挂着水垢；墙角那只倒在地上、滚了半圈的桶装水桶——早就空了。\n\
洪金宝的脸色，一点一点地变了。\n\
“桶装水喝完了。”他慢慢地说，“他穷。研究生那点补贴，桶装水喝完，一定是烧自来水续上的……从上周就开始喝自来水。”\n\
他猛地抓过笔记本，翻到那页表格，手抖着添上一行：曹睿泽，上科大宿舍，自来水。\n\
写完，他盯着那一整页名字，看了很久很久。\n\
“都是。”他哑着嗓子，“回家的、住外面的、喝外面水的——全都在这页纸上。厂里的，一个都不在。”\n\
他合上本子，抬头看你，眼睛里有什么东西烧了起来：“水。是水。”\n\
“我测不了。厂里那些仪器测的是电阻率和颗粒，测不了这个。”他一字一顿，“但这张表，够我自己信了。”";
      if (vars._jinbaoCaseComplete) {
        desc += "\n\
（这行名字，其实早就在表上了——你把 204 的事告诉他那天，他就写下了。今天，他只是终于知道，所有的名字为什么会在同一张纸上。）";
      } else {
        desc += "\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】洪金宝在案例表上记下了自己的推断——这足够他带着纯水、活着离开了。</span>";
      }
      return desc;
    },
    choices: [
      { text: "让他静一静", nextScene: "张江-华大-动力站", effect: updateTime(2) }
    ]
  },

  // 合照（第二情感道具）→ 个人记忆
  "张江-华大-动力站-合照": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-合照.webp */
    onEnter: function(vars) {
      vars._jinbaoPhotoShown = true;
      vars.personalMemorySet.add("毕业快乐");
      return {};
    },
    text: "你把那张合照拿出来，递过去。\n\
烧烤店，两个年轻人勾肩搭背，桌上插满了签子。背面一行马克笔：“毕业快乐。——金宝，2010.6”\n\
洪金宝接过去，很久没说话。他的拇指在照片上来回蹭，蹭那把签子，蹭那两张龇牙咧嘴的脸。\n\
“那天他喝多了。”他终于开口，声音很轻，“非说以后要拿诺奖，让我给他打工。我说行，月薪一根烤肠。”\n\
他把照片翻过来，又翻回去，最后递还给你。\n\
“你留着吧。”他说，“看得住它的人，替他保管。”\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得个人记忆[毕业快乐]。</span>",
    choices: [
      { text: "收好照片", nextScene: "张江-华大-动力站-聊天", effect: updateTime(1) }
    ]
  },

  // 检测中心报告给洪金宝读
  "张江-华大-动力站-报告": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-报告.webp */
    onEnter: { set: { _jinbaoReportRead: true } },
    text: "你把那几页纸放在他面前。\n\
洪金宝拿起来的手很稳，翻到第三页的时候停住了。甲基汞。采样日期。检测方法。下面是那个红色的数字——和一排判定符号。\n\
他把纸放平，又拿过自己的案例表，并排铺开。一边是官方的数据，一边是他手写的名字和日期。他的目光在两张纸之间来来回回。\n\
“都对上了。”他说，“哪天、哪片、什么水——全对上了。”\n\
他摘下眼镜，用两根手指按了按眉心。\n\
“我对了半辈子数据。”他说，“头一回，盼着自己是错的。”\n\
他把报告还给你，双手，很郑重：“这东西别弄丢。纸比人活得长。”",
    choices: [
      { text: "收好报告", nextScene: "张江-华大-动力站-聊天", effect: updateTime(1) }
    ]
  },

  // 补救窗口：lie/silent → confessed（比直接告知更痛；物证回报等同 truth）
  "张江-华大-动力站-补救": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-补救.webp */
    onEnter: function(vars) {
      var wasLie = vars._toldJinbaoTruth === "lie";
      vars._toldJinbaoTruth = "confessed";
      if (!vars._jinbaoCaseComplete) vars._jinbaoCaseComplete = true;
      vars._remediedFromLie = wasLie;
      return {};
    },
    text: function(vars) {
      var desc = "";
      if (vars._remediedFromLie) {
        desc += "“你爸没给我带话。”你说，“那句话，是我编的。”\n\
洪金宝的手停在半空。\n\
“我去过 204。”你听见自己的声音在抖，“你爸他——”\n\
这一次，你没有把话说平。你把所有的都说了。几号开始喝的水，几号的口渴，当夜的事。一样都没落下。\n\
他听完了。比听真话更难受的，是听一个刚刚拆穿的谎话后面藏着的真话。\n\
他坐在那里，很久很久，像一台被拔了电的机器。\n\
“……谢谢你。”他最后说，声音哑得不成样子，“谢谢你没让我一直被骗下去。”";
      } else {
        desc += "“其实……我去过三林。”你说，“你问我的那天，我就去过。”\n\
洪金宝转过头来。\n\
“安居苑 8 号楼 204。”你把 204 的一切，从头说了。哪天开始的水，哪天的口渴，当夜的事。\n\
他听完了，一句话也没说。他站起来，走到仪表台前，背对着你，站了足有十分钟。\n\
“我猜到了。”他最后说，“你那天说‘不清楚’的时候，我就猜到了。”\n\
“但你今天还是说了。”他转过身，眼睛通红，却看着你，“这句，我认。”";
      }
      desc += "\n\
他翻开笔记本，添上最后几行，然后撕下整页案例表，连同一个夹着几张复印件的文件袋，一起推到你面前。\n\
“给需要的人看。”他说，“比什么都重要。”";
      desc += "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得[洪金宝的案例记录表]。</span>";
      return desc;
    },
    choices: [
      { text: "收下", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // 柴油任务：接（Day3+ 老陈开口）
  "张江-华大-动力站-柴油-接": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-柴油.webp */
    onEnter: { set: { _jinbaoDieselAsked: true } },
    text: function(vars) {
      if (vars._fabFigBKilled) {
        return "洪金宝把你拉到发电机边上，压着那台机器的轰鸣说话。\n\
“冒昧问一句。”他指了指油位表上那根快贴到底的针，“外面……还找得到柴油吗？”\n\
“这点油撑不过三天了。它一停，纯水系统停，灯灭——我们就得摸黑走人。”他顿了顿，“本来这话该老陈跟你说，他管设备，比我会算。可他回车间盯货去了，两天没回来。”\n\
“北蔡镇罗山立交下来，有个加油站。”他补了一句，“再有就是……你要是认识搞冷链的、开货车的，他们手里兴许有存货。”\n\
他看着你：“一桶就行。多大代价，我们认。”";
      }
      if (chenInWorkshop(vars)) {
        return "洪金宝把你拉到发电机边上，压着那台机器的轰鸣说话。\n\
“冒昧问一句。”他指了指油位表上那根快贴到底的针，“外面……还找得到柴油吗？”\n\
“这点油撑不过三天了。它一停，纯水系统停，灯灭——我们就得摸黑走人。”他朝西边偏了偏头，“老陈这会儿在车间盯他那台薄膜机。这话本该他来问你——他比我会算油。”\n\
“北蔡镇罗山立交下来，有个加油站。”他补了一句，“再有就是……你要是认识搞冷链的、开货车的，他们手里兴许有存货。”\n\
他看着你：“一桶就行。多大代价，我们认。”";
      }
      return "老陈把你拉到发电机边上，压着那台机器的轰鸣说话。\n\
“小伙子。”他搓着手，搓出老茧摩擦的沙沙声，“冒昧问一句——外面……还找得到柴油吗？”\n\
他拍了拍发电机：“这桶油，撑不过三天了。它一停，纯水系统停，灯灭——洪工他们仨，就得摸黑走人。”\n\
“北蔡镇罗山立交下来，有个加油站。”洪金宝在旁边补了一句，“再有就是……你要是认识搞冷链的、开货车的，他们手里兴许有存货。”\n\
老陈看着你，浑浊的眼睛里全是光：“一桶就行。多大代价，我们认。”";
    },
    choices: [
      { text: "记下了", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // 柴油任务：交（桶留给发电机；送达→撤离顺延一天，由 computed _jinbaoLeft 生效）
  "张江-华大-动力站-柴油-交": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-柴油-交.webp */
    onEnter: { set: { hasDieselCan: false, _dieselDelivered: true }, add: { itemCount: -1 } },
    text: function(vars) {
      if (vars._fabFigBKilled) {
        return "你把那只死沉的铁皮桶挪进动力站，桶底在地上犁出一道白印。\n\
洪金宝拧开桶盖闻了一口，闭上眼睛，很久才吐出那口气。\n\
“满的。”他说，“这能烧到五天。”\n\
他一个人插管、泵油，动作熟得不用看。机器的轰鸣沉了半拍，又稳稳地接上——像一个人缓过来的一口气。\n\
“这活儿本来是老陈干的。”他拍了拍桶身，没再往下说。\n\
他在你肩上按了一下。但这栋楼里的灯，今晚是踏实的。";
      }
      return "你把那只死沉的铁皮桶挪进动力站，桶底在地上犁出一道白印。\n\
老陈扑过来的速度不像他那个岁数的人。他拧开桶盖闻了一口，眼睛眯起来，像闻到了陈年的好酒。\n\
“满的！还是满的！”他冲洪金宝喊，嗓子都劈了，“洪工！三天——不，这能烧到五天！”\n\
洪金宝帮着你把桶抬到发电机边上，插管，泵油。机器的轰鸣沉了半拍，又稳稳地接上——像一个人缓过来的一口气。\n\
“这一桶，”老陈抹了把脸，不知是汗还是泪，“够它再唱一天。”\n\
洪金宝在你肩上按了一下，什么也没说。但这栋楼里的灯，今晚是踏实的。";
    },
    choices: [
      { text: "值了", nextScene: "张江-华大-动力站", effect: updateTime(2) }
    ]
  },

  // 纯水系统（在场版=系统接水；断电版=撤离前灌好的水桶）
  "张江-华大-动力站-纯水": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-纯水.webp */
    onEnter: function(vars) { vars.currentPos = "动力站纯水间"; },
    text: function(vars) {
      var desc;
      if (vars._jinbaoLeft) {
        desc = "几只白色大水桶沿墙一字排开，桶身透亮，水清得能看见桶底。\n\
每只桶身上都是同一行马克笔字，写得端端正正：“给可能会来的人。”\n\
桶太重，带是带不走的。但至少——这里的水，比这个世上的任何水都干净。";
      } else {
        desc = "纯水系统的出水口在滤柱阵列后面，一根亮闪闪的不锈钢管。洪金宝拧开取样阀，清亮的水柱注进量筒。\n\
“喝吧。”他说，“电阻率十八个兆的水——你们在外面，打着灯笼也找不着第二口。”\n\
仪表上的数字绿得发亮，稳稳地，一格都不跳。";
      }
      if (vars._lastScene === "张江-华大-动力站-纯水") {
        desc += vars._restBlocked
          ? "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】你已经喝得肚子发胀了——再灌也变不成力气。</span>"
          : "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】咕咚咕咚灌了个饱，体力+1，当前体力：{strength}。</span>";
      }
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      // 灌瓶（有瓶且未满）
      if (vars.hasBottle && vars.bottleWater < 1) {
        cs.push({
          text: "把水瓶灌满",
          nextScene: "张江-华大-动力站-灌水",
          effect: updateTime(2)
        });
      }
      // 现场喝水（不能穿无尘服）；水管够，但体力回复走休息点同一道门槛，防无限刷
      if (!vars._wearingCleanSuit) {
        cs.push({
          text: "捧起来喝个痛快（体力+1）",
          nextScene: "张江-华大-动力站-纯水",
          effect: function(v) { restRecover(v, 1); return updateTime(2)(v); }
        });
      }
      // 没瓶 → 取样瓶
      if (!vars.hasBottle) {
        cs.push({
          text: "拿一只厂用取样瓶",
          condition: "itemCount < bagVolume",
          nextScene: "张江-华大-动力站-取样瓶",
          effect: { set: { hasBottle: true }, add: { itemCount: 1 } },
          elseScene: "整理整理"
        });
      }
      cs.push({ text: "回动力站", nextScene: "张江-华大-动力站", effect: updateTime(1) });
      return cs;
    }
  },

  // 灌水：标签瓶强制破题（若拷问尚未发生）或情感收束（已发生）
  "张江-华大-动力站-灌水": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-灌水.webp */
    onEnter: function(vars) {
      vars.bottleWater = 1;
      vars.waterToxic = false;
      // 认瓶破题只在"他在场、且这道题还没问出口"时发生；其余情况这一灌就是情感收束
      if (vars._hongBottleLabel && !isBottleConfront(vars)) vars._bottleFilledBySon = true;
      return {};
    },
    text: function(vars) {
      var desc = "你拧开瓶盖，把瓶子接到出水口底下。水柱注进瓶身，咕咚咕咚，把瓶壁上的空气一丝丝挤上去。\n";
      if (vars._hongBottleLabel) {
        if (isBottleConfront(vars)) {
          desc += "\n\
一只手伸过来，按住了你的瓶盖。\n\
洪金宝站在你身后。他不知道什么时候过来的，目光钉在瓶身那行圆珠笔字上——“芜湖 6.25”。\n\
“这瓶子。”他的声音很轻，轻得像怕碰碎什么，“你从我爸那儿拿的。”\n\
不是问句。他抬起眼：“我爸呢。”";
        } else {
          desc += "\n\
瓶身上那行字被水汽洇得发亮——“芜湖 6.25”。\n\
" + (vars._jinbaoLeft
            ? "字条的主人已经走了。这瓶水，他给你留在桶里，你替他灌进他爸的瓶里。"
            : (vars._toldJinbaoTruth === "truth" || vars._toldJinbaoTruth === "confessed"
              ? "洪金宝站在旁边，看着这只瓶子被一点一点灌满。他没有说话。灌到瓶肩的时候，他说：“我爸这人，一辈子舍不得扔瓶子。”"
              : "洪金宝看了那只瓶子一眼，又移开了目光。瓶身上的字，他没有问。"))
          + "\n\
水满了。你拧紧瓶盖。这一瓶水干净得发光。";
        }
      } else {
        desc += "水满了。你拧紧瓶盖。这一瓶水干净得发光。";
      }
      return desc;
    },
    choices: function(vars) {
      if (isBottleConfront(vars)) {
        return [{ text: "迎着他的目光", nextScene: "张江-华大-动力站-拷问", effect: updateTime(1) }];
      }
      return [{ text: "收好水瓶", nextScene: "张江-华大-动力站", effect: updateTime(1) }];
    }
  },

  "张江-华大-动力站-取样瓶": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-取样瓶.webp */
    text: "你在架子上挑了一只一升的白色塑料瓶，瓶身印着“UPW-QC 取样”。瓶盖内衬硅胶，拧上去严丝合缝。\n\
一只没有名字、没有字迹、干干净净的瓶子。能喝，能灌，能带着走。",
    choices: [
      { text: "收好", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // 动力站休息（A 类；断电后仍算——避风有水，只是没人）
  "张江-华大-动力站-休息": {
    image: "images/placeholder.png", /* TODO: images/张江/华大-动力站-休息.webp */
    onEnter: function(vars) {
      vars.currentPos = "动力站";
      vars._travelMinutes = 0;
      restRecover(vars, 2);
      return updateTime(30)(vars);
    },
    text: function(vars) {
      var desc;
      if (vars._jinbaoLeft) {
        desc = "你把行军床从墙角拖开一张，掸了掸灰躺上去。发电机不响了，屋里静得能听见自己的心跳。\n\
床头那几只水桶立在一排，白得像哨兵。有人来过，有人留下水，有人走了——而你还能躺在这儿喘口气。\n";
      } else {
        desc = "洪金宝给你匀了半张行军床。发电机的轰鸣成了最好的白噪音，滤柱的绿灯在天花板上投下一片安心的颜色。\n\
“睡吧。”他说，“这栋楼里，就这儿说了算的是我。”\n";
      }
      return desc + restHint(vars);
    },
    choices: [
      { text: "再歇一会儿", nextScene: "张江-华大-动力站-休息", effect: updateTime(1) },
      { text: "起来", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // Day5+ 字条（五版本路由 + 通用段）
  "张江-华大-动力站-字条": {
    image: "images/placeholder.png", /* TODO: images/张江/字条.webp（物证特写） */
    onEnter: { set: { _noteRead: true } },
    text: function(vars) {
      var body;
      if (!vars._metJinbao) {
        body = "“给不知什么时候会来的陌生人：\n\
我是华大半导体的动力工程师，姓洪。你能在这种时候走进这间屋子，说明你比我走得远——那这几句话，你配看。\n\
我回三林看过我爸。他不在了。安居苑 8 号楼 204，如果你顺路，替我看他一眼。\n\
桌边的水是留给你们的，放心喝。”";
      } else if (vars._toldJinbaoTruth === "truth" || vars._toldJinbaoTruth === "confessed") {
        body = "“给告诉我真相的人：\n\
我回家去过。好好告了别，才走的。爸的厨房收拾得很干净，他到最后一刻都没麻烦任何人。\n\
那句真话很疼。但它让我赶上了一场告别——这笔账，怎么算都是你欠我少，我欠你多。\n\
水留给你们。喝干净的水，替我们多活几天。”";
      } else if (vars._toldJinbaoTruth === "lie") {
        body = "“给带话的人：\n\
我回家去过。\n\
爸还在厨房里。他等我等了很多天。\n\
你早就知道，对不对。\n\
水还是留给你们的。我爸教的——水是给人喝的，不掺假。别的，我不想再多说了。”";
      } else if (vars._toldJinbaoTruth === "silent") {
        body = "“给那位客人：\n\
我回家去过。告了别，才走的。\n\
你不欠我什么，我也不欠你。萍水相逢，你喝过的水是真的，这就够了。\n\
水留给你们。路上小心。”";
      } else {
        body = "“给后面来的人：\n\
我走了。回家看过，了了心事。\n\
水留给你们。喝干净的水，比什么都强。”";
      }
      var tail = "\n\
（字条的末尾还有一行，像是临走前补的：）\n\
“我从设备夹层走的——上面那条道通灰区，黑，但干净。”\n\
“去松江大学城。那边有人收。”";
      if (vars._dieselDelivered) {
        tail += "\n\
“还有——替我们搬油的那位。那桶油让这栋楼的灯多亮了一天。这一天，够我们把想留的都留下了。”";
      }
      return "你抽出那张字条。纸是从案例表本子上撕下来的，背面的表格线里挤满了字。\n" + body + tail;
    },
    choices: [
      { text: "把字条放回搪瓷缸底下", nextScene: "张江-华大-动力站", effect: updateTime(1) }
    ]
  },

  // ==================== L3 · 川杨河南岸堤（过桥门槛） ====================
  // 硬门槛（§七）：hasGasMask && hasGun && gunAmmo >= 3，缺一不可上桥。
  // 桥只连南北两岸地面；回程走高架（张江立交 → 外环罗山路 → 北蔡镇罗山下）。

  "张江-川杨河南岸堤": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/川杨河南岸堤.webp（堤坝、浑黄河面、远处大桥与桥面尸群） */
    onEnter: function(vars) {
      vars.currentArea = "张江";
      vars.currentPlace = "张江";
      vars.currentPos = "川杨河南岸堤";
      vars.showZombies = true;
    },
    text: function(vars) {
      var desc = "你爬上川杨河的南岸堤坝。河面很宽，水色浑黄，缓缓地往东流。\n\
堤下的滨河路上黑压压的一片——那些东西全贴着河沿挤，一个挨一个，脸朝着水，一动不动地挤着。没有一只理会你。它们只是想到水边去。\n\
往北望，一座大桥横在河上。桥面上也是它们——引桥的坡道上、护栏边、车缝里，密密地立着。风从河面上过来，隔得老远，隐约带来一股甜腻的味道。";
      return desc + "\n" + describeWeather(vars);
    },
    choices: function(vars) {
      var cs = [];
      cs.push({
        showCondition: "hasGasMask && hasGun && gunAmmo >= 3",
        text: "戴好防毒面具，数足三发子弹，上桥",
        nextScene: "张江-川杨河大桥-1",
        effect: updateTime(2, { set: { _bridgeFrom: "南" } })
      });
      cs.push({
        showCondition: "!(hasGasMask && hasGun && gunAmmo >= 3)",
        text: "沿引桥走两步，探探虚实",
        nextScene: "张江-川杨河南岸堤-探引桥",
        effect: updateTime(2)
      });
      cs.push({
        text: "它们都冲着水去——空手闯一闯，未必没机会",
        nextScene: "结局-张江-川杨河",
        effect: { set: { _bridgeStage: 0 } }
      });
      cs.push({ text: "往南，回闸机外", nextScene: "张江-人工智能岛闸机外", effect: updateTime(15) });
      return cs;
    }
  },

  // 不满足门槛时的提示性节点：环境叙事交代“为什么空手不行”，不报清单
  "张江-川杨河南岸堤-探引桥": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/川杨河大桥-引桥.webp（近景：坡道、堵车、背影） */
    onEnter: function(vars) { vars.currentPos = "川杨河引桥"; },
    text: function(vars) {
      var desc = "你沿着引桥的坡道走了十几米。堵在坡上的车一辆咬着一辆，车身上落了层灰。\n\
最近的那只背对着你，离你不到十米。你的鞋底蹭过一粒石子——它没有回头。它面前的护栏外就是河，它全部的心思都在那片水上。\n\
可再往前看，坡道中段的那几只，站姿就不一样了。它们立在原地轻轻摇晃，脑袋一下一下地朝两边划——像在听。桥面那么长，丧尸那么多，你没法保证每一只都背对着你走到头。\n\
一股甜腻的味道顺着风飘过来，越来越清楚——是从桥中段的方向来的。这东西隔着这么远都能闻见，走到跟前会是什么样，你不敢想。\n\
你退回堤上。这桥，不是两手空空的人走的。";
      return desc;
    },
    choices: [
      { text: "去南岸堤", nextScene: "张江-川杨河南岸堤", effect: updateTime(1) }
    ]
  },

  // ==================== 川杨河大桥（3 段闪色，每段耗 1 弹） ====================
  // 段1 毒气型（4色5位）→ 段2 迅捷型（4色6位短时限）→ 段3 黑皮·高汞负荷（4色6位）。
  // 方向中立（南北两岸互走共用）；段3 胜利按 _bridgeFrom 分流落点。

  "张江-川杨河大桥-1": {
    image: "images/placeholder.png", /* TODO: images/张江/川杨河大桥-1.webp（引桥堵车、鼓腹的毒气型） */
    onEnter: function(vars) {
      vars._bridgeStage = 1;
      vars.gunAmmo = Math.max(0, vars.gunAmmo - 1);
      vars.showZombies = true;
      return initMemoryGame(["红", "蓝", "绿", "黄"], 5)(vars);
    },
    text: function(vars) {
      return "你扣好面具，猫着腰上了引桥。桥上的车一辆咬着一辆地堵死，车窗蒙着灰，有几辆的门还敞着。\n\
最近的那只就卡在两辆车之间——肚子胀得把外套都撑开了，一股甜腻的烂果味隔着滤罐往鼻子里钻。整个桥面的风里都是这个味。\n\
你拔出手枪，照着它膝弯来了一枪。枪声在河面上炸开，整座桥的影子齐齐晃了一下——然后，全朝你这边涌了过来。\n\
跑。别停。别回头。";
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红1蓝1绿1黄" },
        condition: checkFlashAnswer,
        nextScene: "张江-川杨河大桥-1-胜",
        elseScene: "结局-张江-川杨河",
        timeout: 12000,
        timeoutScene: "结局-张江-川杨河"
      }
    ]
  },

  "张江-川杨河大桥-1-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars.showZombies = true;
      return updateTime(2)(vars);
    },
    text: function(vars) {
      return "你从车缝里挤过去，肩膀蹭掉一整片后视镜。那只鼓着肚子的被车阵卡住了，还在往你这边挤，把两辆车的保险杠挤得直响。\n\
你扶着车门喘气。面具的镜片上糊着一层水汽——甜味被滤罐压得很淡，但你知道它就在周围。你摸了摸弹匣，轻了一格。\n\
桥还长着。桥中段的车流更密。";
    },
    choices: [
      { text: "继续往前", nextScene: "张江-川杨河大桥-2", effect: updateTime(2) }
    ]
  },

  "张江-川杨河大桥-2": {
    image: "images/placeholder.png", /* TODO: images/张江/川杨河大桥-2.webp（桥中段、车缝里扑来的迅捷型） */
    onEnter: function(vars) {
      vars._bridgeStage = 2;
      vars.gunAmmo = Math.max(0, vars.gunAmmo - 1);
      vars.showZombies = true;
      return initMemoryGame(["红", "蓝", "绿", "黄"], 6)(vars);
    },
    text: function(vars) {
      return "桥中段。桥面在这里最宽，车堵得只剩一条歪歪扭扭的缝。\n\
你先听见的是刮擦声——很快的刮擦声，指甲刮过车顶铁皮，一下连一下。\n\
一个穿着运动背心的影子从车顶上窜过来，四脚着地，快得不像话。腰后还别着一只空水壶——生前，它大概天天沿着这条河跑步。\n\
你抬手就是一枪。它中了，滚下去，又立刻爬起来——中弹的腿拖着，速度竟然没慢多少。\n\
它的路数是斜的。别等它绕到你背后。";
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝1绿1黄" },
        condition: checkFlashAnswer,
        nextScene: "张江-川杨河大桥-2-胜",
        elseScene: "结局-张江-川杨河",
        timeout: 11000,
        timeoutScene: "结局-张江-川杨河"
      }
    ]
  },

  "张江-川杨河大桥-2-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars.showZombies = true;
      return updateTime(2)(vars);
    },
    text: function(vars) {
      return "你贴着一辆厢式货车的车头跟它兜了半圈，趁它扑空的当口，抡圆了给它脑袋来了一下。它栽进车底，抽了两下，不动了。腰后的空水壶被压得瘪下去。\n\
你喘匀了气。弹匣又轻了一格。\n\
桥面从这里开始往下走——对岸的引桥已经在望了。坡顶上，立着最后一个。";
    },
    choices: [
      { text: "下坡，去会会它", nextScene: "张江-川杨河大桥-3", effect: updateTime(2) }
    ]
  },

  "张江-川杨河大桥-3": {
    image: "images/placeholder.png", /* TODO: images/张江/川杨河大桥-3.webp（北引桥坡顶的黑皮丧尸，金属光泽皮肤） */
    onEnter: function(vars) {
      vars._bridgeStage = 3;
      vars.gunAmmo = Math.max(0, vars.gunAmmo - 1);
      vars.showZombies = true;
      return initMemoryGame(["红", "蓝", "绿", "黄"], 6)(vars);
    },
    text: function(vars) {
      return "最后一段引桥。\n\
坡顶那只就站在路中间。它的皮肤是暗灰色的，在河光里泛着一层金属一样的哑光。那种颜色你说不上来在哪儿见过——但你本能地知道，离它远点。\n\
你抬手朝它胸口来了一枪。它晃了一下，站住了。弹孔几乎没流血，只洇出一点发黑的东西。\n\
它朝你走过来。不快。它根本不着急。";
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝1绿1黄" },
        condition: checkFlashAnswer,
        nextScene: "张江-川杨河大桥-3-胜",
        elseScene: "结局-张江-川杨河",
        timeout: 13000,
        timeoutScene: "结局-张江-川杨河"
      }
    ]
  },

  "张江-川杨河大桥-3-胜": {
    image: "images/placeholder.png", /* TODO: images/张江/川杨河大桥-下引桥.webp（对岸街口方向） */
    onEnter: function(vars) {
      vars.showZombies = true;
      return updateTime(2)(vars);
    },
    text: function(vars) {
      var head = "你绕过它倒下的位置，一口气冲下引桥。鞋底磕在伸缩缝的铁板上，哐、哐、哐——每一声都在你身后追着你跑。\n";
      if (vars._bridgeFrom === "北") {
        return head + "南岸的堤坝就在眼前。滨河路上那些贴着河沿的影子，从头到尾没有一只回过头。\n\
你活着下了桥。弹匣空了。桥上的东西在你身后重新聚拢，像水面合上一颗石子砸出来的洞——这座桥，你这辈子大概不想再走第二遍。";
      }
      return head + "北岸到了。一排陌生的楼群立在河边，其中一栋灰白色的大楼，隔着河雾都显出轮廓。\n\
你活着下了桥。弹匣空了。桥上的东西在你身后重新聚拢，像水面合上一颗石子砸出来的洞——这座桥，你这辈子大概不想再走第二遍。";
    },
    choices: [
      {
        text: "继续",
        nextScene: function(vars) { return vars._bridgeFrom === "北" ? "张江-川杨河南岸堤" : "张江-河北岸-街口"; },
        effect: updateTime(1)
      }
    ]
  },

  // 桥上死亡结局：按 _bridgeStage 分段（0=空手；1=引桥；2=桥中；3=对岸引桥在望）
  "结局-张江-川杨河": {
    image: "images/zombieKnockYouDown.webp",
    onEnter: function(vars) { tryBreakWeapon(vars); return {}; },
    text: function(vars) {
      var body;
      if (vars._bridgeStage <= 0) {
        body = "你空着手踏上引桥，走了不到二十米。\n\
它们确实都冲着水去。这一点，你看得没错。\n\
可你忘了——你自己身上，七成是水。\n\
第一只抓住你肩膀的时候，你才明白桥面上那些影子为什么齐齐停了一拍。不是因为怕，也不是因为饿。是因为这具温热的、湿漉漉的身体，比二十米外的河水，近得多。";
      } else if (vars._bridgeStage === 1) {
        body = "你在引桥的堵车阵里被追上了。枪响过之后的桥面没有遮拦，影子从每一辆车的暗处漫出来，像涨潮。\n\
防毒面具的镜片最后映出的，是河面上白花花的一片天光。\n\
它们越过你，继续往水边去。你只是顺路。";
      } else if (vars._bridgeStage === 2) {
        body = "那个穿运动背心的影子太快了。\n\
你到死都没看清它是从哪辆车后面绕过来的——只觉得脚踝一紧，天旋地转，桥面的伸缩缝迎面撞上来。\n\
桥中段的风很大。风把桥上的它们吹得东倒西歪，也吹着你，往同一个方向去。";
      } else if (vars._bridgeFrom === "北") {
        body = "南引桥的坡顶，你倒在那只暗灰色皮肤的东西脚下。弹匣空了，胳膊也抬不起来了。\n\
坡下就是南岸的堤坝，堤下的滨河路，再往南就是来时的街口——隔着一百多米。\n\
一百多米。你走了这么远的路，就差这一段。";
      } else {
        body = "北引桥的坡顶，你倒在那只暗灰色皮肤的东西脚下。弹匣空了，胳膊也抬不起来了。\n\
坡下就是北岸。那栋灰白色的大楼立在河边，楼顶的字隔着河雾泛着光——隔着一百多米。\n\
一百多米。你走了这么远的路，就差这一段。";
      }
      return body + "\n—— 结局：川杨河 ——" + weaponBrokeText(vars);
    }
  },

  // ==================== 河北岸 · 街口（张江立交下高架落点） ====================

  "张江-北岸落地": travelScene(
    "你贴着护栏走下张江立交的匝道。北岸的路面比南岸更空，也更荒——绿化带里的冬青没人修剪，人行道上歪着几辆撞倒的共享单车。\n\
匝道口立着一块蓝底白字的指路牌，一个箭头指着东边：检测中心。你顺着箭头望过去，一栋灰白色的大楼立在河边，玻璃幕墙哑着光。",
    "张江-河北岸-街口",
    {
      image: "images/placeholder.png", /* TODO: images/张江/北岸落地.webp */
      outdoor: true,
      onEnter: function(vars) {
        vars.currentArea = "张江";
        vars.currentPlace = "张江北岸";
        vars.currentPos = "街口";
        return updateTime(5)(vars);
      }
    }
  ),

  "张江-河北岸-街口": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/河北岸街口.webp（街角、便利店卷帘门、远处检测中心大楼） */
    onEnter: function(vars) {
      vars.currentArea = "张江";
      vars.currentPlace = "张江北岸";
      vars.currentPos = "街口";
    },
    text: function(vars) {
      var desc = "街口很小。一家便利店和一家打印店对门守着，卷帘门都拉得死死的，门缝里塞着几张过期的传单。\n\
东边那栋灰白色的大楼占了整条街的视线——楼顶一行蓝色大字，隔着街都看得清清楚楚：上海市检测中心。\n\
往南看，川杨河大桥的引桥从这边上坡，桥面上的影子密密麻麻，微微地动。";
      return desc + "\n" + describeWeather(vars);
    },
    choices: function(vars) {
      var cs = [];
      cs.push({ text: "往东，去上海市检测中心", nextScene: "张江-检测中心-大门", effect: updateTime(8) });
      cs.push({
        showCondition: "hasGasMask && hasGun && gunAmmo >= 3",
        text: "戴好防毒面具，数足三发子弹，上桥回南岸",
        nextScene: "张江-川杨河大桥-1",
        effect: updateTime(2, { set: { _bridgeFrom: "北" } })
      });
      cs.push({ text: "上张江立交的匝道，回高架", nextScene: "张江立交桥", effect: updateTime(5) });
      return cs;
    }
  },

  // ==================== 上海市检测中心（L3 真相物证点） ====================
  // 动线：大门 → 大厅（台账=快路径）→ 走廊（有房号直达 / 无房号瞎摸+游荡遭遇）
  //       → 检测三室 305（阶段0 背对）→ 检测员复合战 → 报告（_hasTestReport）
  //       → 撤离（_labAlert>0 多一场遭遇）。断电无电脑，检索全靠纸质台账。

  "张江-检测中心-大门": {
    outdoor: true,
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-大门.webp（旗杆、玻璃门、蓝底门牌） */
    onEnter: function(vars) {
      vars.currentArea = "张江";
      vars.currentPlace = "检测中心";
      vars.currentPos = "检测中心大门";
    },
    text: function(vars) {
      return "检测中心的大门前立着一排旗杆，旗绳抽打着空荡荡的杆身，啪啪地响。\n\
两扇玻璃门，一扇关着，一扇开了一条缝——门禁闸机黑着屏，闸板歪在半开的位置，像有人走得急。门楣上方一块蓝底白字的牌子：公正 · 科学 · 准确 · 高效。\n\
门里的挑高大堂黑洞洞的，只有高侧窗漏下来几束天光，光柱里浮着灰。" + "\n" + describeWeather(vars);
    },
    choices: [
      { text: "从门缝里侧身进去", nextScene: "张江-检测中心-大厅", effect: updateTime(2) },
      { text: "往西，回街口", nextScene: "张江-河北岸-街口", effect: updateTime(8) }
    ]
  },

  "张江-检测中心-大厅": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-大厅.webp（黑屏出件电脑、前台、取件架） */
    onEnter: function(vars) { vars.currentPos = "检测中心大厅"; },
    text: function(vars) {
      var desc = "大堂比外面看起来还空旷。浅灰的石材地面，脚步声在里面滚了一圈又一圈。\n\
正对大门的是一排前台。台面上摆着一台出件查询电脑——屏幕黑着，边框上还贴着一张便签：“自取件请扫码 · 工作时间 9:00-17:00”。没人扫过什么码了。\n\
前台侧立面嵌着一面待取件架，一格一格的，贴着日期标签。右侧一条走廊通向楼里，门口挂着牌子：实验区。\n\
靠窗的接待台边立着一台饮水机——你下意识地离它远了两步。";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      cs.push({ text: "翻开前台的《样品流转台账》", nextScene: "张江-检测中心-台账", effect: updateTime(3) });
      if (vars._hasTestReport && vars.hasDiary && !vars._reportCopiedToDiary) {
        cs.push({ text: "把报告的关键数据抄进日记本", nextScene: "张江-检测中心-抄录", effect: updateTime(10) });
      }
      cs.push({ text: "进实验区", nextScene: "张江-检测中心-走廊", effect: updateTime(2) });
      cs.push({ text: "出大门", nextScene: "张江-检测中心-大门", effect: updateTime(1) });
      return cs;
    }
  },

  // 台账 = 快路径（C5）：最新一页 6/28「应急水源专项 · 检测三室 · 已出报告」
  "张江-检测中心-台账": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-台账.webp（台账特写、待取件架空格） */
    onEnter: { set: { _knowsReportRoom: true } },
    text: function(vars) {
      return "台账是本厚厚的硬皮本，摊开扣在前台上。你把它翻回来，从最后几页往前翻。\n\
前面是一页页的日常样品：管材、涂料、食品、水质……送样人、日期、接收人，一格一格。越往后，字迹越潦草，空白越多。\n\
翻到 6 月 26 日，笔迹换了一个人，项目名称也换了——“应急水源专项”。整整一页全是水样：采样点一栏写着水厂、管网末梢、二次供水……每一行后面都盖着一个红色的“急”字章。\n\
最新一页，6 月 28 日，只有孤零零的一行：\n\
“应急水源专项 · 检测三室 · 已出报告。”\n\
你合上台账，去看那面待取件架。6 月 28 日的格子里，是空的。\n\
报告出了。没有人来取。要是它不在架子上——那它就还躺在出报告的那个房间里。";
    },
    choices: [
      { text: "进实验区，去找检测三室", nextScene: "张江-检测中心-走廊", effect: updateTime(2) },
      { text: "先在前台再翻翻", nextScene: "张江-检测中心-大厅", effect: updateTime(1) }
    ]
  },

  "张江-检测中心-走廊": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-走廊.webp（长走廊、编号门牌、尽头昏暗） */
    onEnter: function(vars) { vars.currentPos = "实验区走廊"; },
    text: function(vars) {
      var desc = "实验区的走廊又长又直，两侧是一模一样的门，门上钉着编号牌。靠窗那一侧还有天光，越往里走越暗，走廊尽头沉在一片灰蒙蒙的昏暗里。\n\
安静。安静得过分。你的脚步声敲在地砖上，一声一声，全是回音。\n\
301 · 理化前处理室。302 · 微生物室。303 · 天平室——这几块的牌子，你借天光看得清清楚楚。再往里，就看不清了。";
      if (vars._labAlert > 0) desc += "\n不知哪里传来一声轻响。这栋楼里醒着的，不止你一个。";
      return desc;
    },
    choices: function(vars) {
      var cs = [];
      if (vars._knowsReportRoom) {
        cs.push({ text: "径直去走廊尽头的 305 · 检测三室", nextScene: "张江-检测中心-三室外", effect: updateTime(2) });
      } else {
        cs.push({ text: "走廊尽头黑得看不清——挨个房间摸过去", nextScene: "张江-检测中心-瞎摸", effect: updateTime(4) });
      }
      cs.push({
        text: "离开实验区",
        nextScene: function(v) {
          if (v._labAlert > 0 && !v._labExitFought) return "张江-检测中心-撤离遭遇";
          return "张江-检测中心-大厅";
        },
        effect: updateTime(2)
      });
      return cs;
    }
  },

  // 瞎摸（没翻台账）：游荡遭遇 + 耗时，_labAlert+1（检测员闪色加长、撤离多一场遭遇）
  "张江-检测中心-瞎摸": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-瞎摸.webp（昏暗深处、白大褂影子） */
    onEnter: function(vars) {
      vars._labAlert = Math.min(2, (vars._labAlert || 0) + 1);
      return initMemoryGame(["红", "蓝", "绿"], 4)(vars);
    },
    text: function(vars) {
      var light = vars.hasTorch ? "手电的光柱扫过一扇又一扇门" : (vars.hasPhone && vars.phoneBattery > 0 ? "手机的背光晃出一小圈惨白" : "你伸出手，摸着墙面一步一挪");
      return "你摸进走廊深处。天光到这儿就断了。" + light + "。\n\
你不知道自己要找什么，也不知道它在哪——只能一扇门一扇门地试。304 是一间药品间，架子翻倒了一半，玻璃瓶碎了一地。\n\
你的手刚搭上再往里那扇门的门把——身后的黑暗里，一声椅子腿刮过地面的锐响。\n\
白大褂。它从没有窗的黑门里出来了，不紧不慢，挡在你和走廊口之间。";
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红1蓝1绿" },
        condition: checkFlashAnswer,
        nextScene: "张江-检测中心-瞎摸-胜",
        elseScene: "结局-张江-检测中心",
        timeout: 9000,
        timeoutScene: "结局-张江-检测中心"
      }
    ]
  },

  "张江-检测中心-瞎摸-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._knowsReportRoom = true; // 摸到尽头看清了 305 的门牌（此后走廊可直达）
      return updateTime(2)(vars);
    },
    text: function(vars) {
      return "你抢在它扑上来之前先动了手。它撞在门框上，滑下去，白大褂的口袋里滚出一支记号笔，骨碌碌滚进黑暗里。\n\
你扶着墙把气喘匀。这一趟打出的动静不小——整层楼都听见了。\n\
定下神，你才借光看清走廊尽头：305，检测三室。\n\
那扇门的观察窗后面，立着一条人影，一动不动。门板底下，隐隐透出一种含混的、念念有词的声音。" + weaponBrokeText(vars);
    },
    choices: [
      { text: "去 305 门口", nextScene: "张江-检测中心-三室外", effect: updateTime(1) },
      { text: "去走廊口", nextScene: "张江-检测中心-走廊", effect: updateTime(1) }
    ]
  },

  // 阶段0 之前：门外观察（弱黑暗——窥视需光源，进门不需要）
  "张江-检测中心-三室外": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-三室外.webp（305门牌、观察窗、人影） */
    onEnter: function(vars) { vars.currentPos = "检测三室门外"; },
    text: function(vars) {
      return "305 的门比别的门厚实，门上装着一块观察窗。窗后立着一条人影——背对着门，站在靠墙的试剂柜前。\n\
隔着门板，那声音清楚了：含混的、气声的念诵，翻来覆去就那几个音——\n\
“……011……应急水源……011……出了……出了……”";
    },
    choices: function(vars) {
      var cs = [];
      if (vars.hasTorch || (vars.hasPhone && vars.phoneBattery > 0)) {
        cs.push({
          text: vars.hasTorch ? "打开手电，贴着观察窗看清里面" : "用手机照亮观察窗（电量 {phoneBattery}%）",
          nextScene: "张江-检测中心-三室外-窥视",
          effect: function(v) {
            if (!v.hasTorch) v.phoneBattery = Math.max(0, v.phoneBattery - 5);
            return updateTime(1)(v);
          }
        });
      }
      cs.push({ text: "推门进去", nextScene: "张江-检测中心-三室内", effect: updateTime(1) });
      cs.push({ text: "去走廊", nextScene: "张江-检测中心-走廊", effect: updateTime(1) });
      return cs;
    }
  },

  "张江-检测中心-三室外-窥视": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-三室外-窥视.webp（观察窗视角：背对的白大褂） */
    text: function(vars) {
      var desc = "你把光贴上观察窗的玻璃。\n\
白大褂，背对着你，一只手搭在试剂柜的柜门上——摩挲，摩挲，摩挲。另一只手垂在身侧，攥着几页纸。攥得很紧，纸角都卷了边。\n";
      if (vars.hasTorch) {
        desc += "手电的光够亮：他的手背和后颈是暗灰色的，泛着一层金属一样的哑光。那不是活人的皮肤。\n\
他不是在整理柜子。他只是在重复“整理柜子”这个动作——和念那串编号一样，一遍，又一遍。";
      } else {
        desc += "手机的光太弱，照不真切——你看得清那身白大褂的轮廓，和那只反复摩挲柜门的手，看不清他的脸。\n\
是人是尸，隔着这一层光，你下不了判断。";
      }
      return desc;
    },
    choices: [
      { text: "离开观察窗", nextScene: "张江-检测中心-三室外" }
    ]
  },

  // 阶段0：检测员背对门口，念样品编号。摔柜门=必定削弱（+噪）；直接迎战=完全体
  "张江-检测中心-三室内": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-三室内.webp（原子荧光仪、试剂柜、背对的检测员） */
    onEnter: function(vars) { vars.currentPos = "检测三室"; },
    text: function(vars) {
      return "检测三室比你想象的挤。一台顶天立地的仪器占了大半间屋——原子荧光形态分析仪，屏幕黑着，侧面还挂着塑封的操作规程。靠墙一排试剂柜，玻璃门里码着成排的棕色小瓶，柜门上贴着菱形的警示标签。\n\
他就站在试剂柜前，背对着你。近了，那念诵才听清——\n\
“26-06-28-011……应急水源……出了……签……字……”\n\
白大褂的胸口别着工牌：检测三部 · 顾嘉铭。他手里攥着的那几页纸，纸角已经被汗浸得发软。\n\
他还没有回头。";
    },
    choices: [
      { text: "蹑手蹑脚绕过去，抡起试剂柜的柜门砸向他", nextScene: "张江-检测中心-摔柜门", effect: updateTime(1) },
      { text: "试着喊一声：“有人吗？”", nextScene: "张江-检测中心-检测员战", effect: updateTime(1) },
      { text: "直接冲上去动手", nextScene: "张江-检测中心-检测员战", effect: updateTime(1) },
      { text: "悄悄退出去", nextScene: "张江-检测中心-走廊", effect: updateTime(1) }
    ]
  },

  "张江-检测中心-摔柜门": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-摔柜门.webp（碎玻璃、棕色小瓶滚落） */
    onEnter: function(vars) {
      vars._labWeakened = true;
      vars._labAlert = Math.min(2, (vars._labAlert || 0) + 1);
      return {};
    },
    text: function(vars) {
      return "你贴着仪器挪过去。五步，三步，一步。你的手搭上试剂柜的柜门边框——\n\
抡出去！\n\
整扇柜门砸在他脸侧和肩膀上，玻璃哗啦碎了一地，棕色的小瓶子骨碌碌滚了一屋子。那声响在这栋死楼里炸开，一层楼都听见了。\n\
他踉跄着撞在仪器桌上，半边脸淌下暗色的血。可他没有倒。他转过头来——很慢，脖子里发出干燥的咔咔声。\n\
好打的对手。更吵的楼。";
    },
    choices: [
      { text: "迎战", nextScene: "张江-检测中心-检测员战", effect: updateTime(1) }
    ]
  },

  // 检测员复合战：4色，位数=(削弱?5:7)+(噪声?1:0)，时限随 _labAlert 缩短
  "张江-检测中心-检测员战": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-检测员战.webp */
    onEnter: initMemoryGame(["红", "蓝", "绿", "黄"], function(vars) {
      return (vars._labWeakened ? 5 : 7) + (vars._labAlert > 0 ? 1 : 0);
    }),
    text: function(vars) {
      var desc;
      if (vars._labWeakened) {
        desc = "他扑过来的第一步就踩在一只滚落的棕色小瓶上，崴了一下——半边脸的血糊住了眼，他的抓扑全凭声音来。\n\
别可怜他。他手上那股力气，足够把你按碎在仪器桌上。";
      } else {
        desc = "他动了。白大褂下面的身体撞得仪器桌直往后挪，手里那几页纸居然还攥着没松——像护着什么命根子。\n\
他的皮肤在昏暗里泛着暗灰的金属光，浑浊的眼球锁定你，全是攻击性。这具身体生前经年累月碰的那些东西，让它死了以后还这么硬。";
      }
      desc += "\n别让他把你逼到试剂柜前——那些柜子里的东西，掉出来一件就够你受的。";
      return desc;
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝1绿1黄" },
        condition: checkFlashAnswer,
        nextScene: "张江-检测中心-制服",
        elseScene: "结局-张江-检测中心",
        timeout: "16000 - _labAlert * 1500",
        timeoutScene: "结局-张江-检测中心"
      }
    ]
  },

  // 终结：制服（非击杀）→ 从他手里抽出官方报告（_hasTestReport，不占背包）
  "张江-检测中心-制服": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-报告.webp（盖章报告特写） */
    onEnter: function(vars) {
      vars._labZombieDead = true;
      vars._hasTestReport = true;
      vars.mercuryLoad = Math.min(100, (vars.mercuryLoad || 0) + (vars.hasGasMask ? 5 : 15));
      return updateTime(3)(vars);
    },
    text: function(vars) {
      var desc = "你把他掀翻在仪器桌前，抄起设备的连接线缠住他的胳膊，又把白大褂的袖子在身后打了个死结。他挣扎的力道大得吓人，缠了很久才不动了——嘴里还在念。\n\
“011……出了……签……”\n\
你蹲在地上喘了半天，才想起他手里那几页纸。\n\
纸从他僵硬的手指里抽出来的时候，发出很轻的、纤维撕裂的响。\n\
《应急水源专项检测报告》。报告编号 YJ-2026-0628-011。采样日期：6 月 26 日至 27 日，六个点位。第三页，测定结果表——你看得懂的部分不多，但“甲基汞”三个字后面那个红色的数字，和它旁边一整排判定符号，谁都看得懂。光是那一行的数字，就把标准限值甩出去几百倍。\n\
报告的末页压着两枚红章：检验检测专用章，CMA。签名栏里是一个龙飞凤舞的名字：顾嘉铭，6 月 28 日。\n\
再下面一栏，取件人签收——空着。\n\
这栋楼里唯一测出真相的人，把报告攥在手里，在这间屋子里念了不知多少天的编号。差一天，就只差一天，它就能躺进待取件架的格子里。\n\
现在，它在你的手里了。";
      if (!vars.hasGasMask) desc += "\n缠斗里蹭到他皮肤的地方，隐隐地发麻。";
      desc += "\n<span style='color: #00fbffff; font-style: italic;'>【系统提示】获得[上海市检测中心报告]——官方全项检测，数据、签名、公章齐全。它不占背包。</span>";
      return desc;
    },
    choices: [
      { text: "收好报告，离开这间屋子", nextScene: "张江-检测中心-走廊", effect: updateTime(1) }
    ]
  },

  // 撤离遭遇：楼里惊动过的动静（_labAlert>0 且未打过）在走廊口截你一场
  "张江-检测中心-撤离遭遇": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-撤离遭遇.webp（走廊口白大褂） */
    onEnter: initMemoryGame(["红", "蓝", "绿"], 5),
    text: function(vars) {
      return "你刚走回走廊口，天光就在前面——\n\
侧面那扇没有窗的黑门里，又一条白大褂的影子挤了出来。它堵在你和大堂之间，头颅以一种别扭的角度歪着。\n\
这座楼里加班的，不止一个。";
    },
    choices: [
      {
        text: "输入你看到的颜色分布",
        input: { placeholder: "例如：2红2蓝1绿" },
        condition: checkFlashAnswer,
        nextScene: "张江-检测中心-撤离-胜",
        elseScene: "结局-张江-检测中心",
        timeout: 10000,
        timeoutScene: "结局-张江-检测中心"
      }
    ]
  },

  "张江-检测中心-撤离-胜": {
    image: "images/youKillZombies.webp",
    onEnter: function(vars) {
      vars._labExitFought = true;
      return updateTime(2)(vars);
    },
    text: function(vars) {
      return "你抄起墙边的灭火器迎面砸过去，它抱着头栽进门框里。你没再看第二眼，撒腿冲进大堂的天光里。\n\
身后的走廊黑沉沉的，什么声音都没有了。" + weaponBrokeText(vars);
    },
    choices: [
      { text: "出大门", nextScene: "张江-检测中心-大门", effect: updateTime(1) }
    ]
  },

  // 抄录（hasDiary 专属）：报告关键数据抄进日记本一页
  "张江-检测中心-抄录": {
    image: "images/placeholder.png", /* TODO: images/张江/检测中心-抄录.webp（接待台、日记本） */
    onEnter: { set: { _reportCopiedToDiary: true } },
    text: function(vars) {
      return "你在接待台边坐下，就着高侧窗的天光，翻开日记本，把报告从第一页抄起。\n\
编号、日期、点位、检测方法、那个红色的数字、两枚章的名称——你抄得很慢，一个数字一个数字地对。抄到“取件人签收”那一栏，你的笔尖悬了一下。\n\
空着的栏，就让它空着吧。你翻过页去。\n\
<span style='color: #00fbffff; font-style: italic;'>【系统提示】报告的关键数据已抄进日记本——就算原件不在了，数字也还在。</span>";
    },
    choices: [
      { text: "合上日记本", nextScene: "张江-检测中心-大厅", effect: updateTime(1) }
    ]
  },

  // 检测中心死亡结局：按 _labZombieDead（报告到手与否）与 _lastScene（死在哪一场）分支
  "结局-张江-检测中心": {
    image: "images/zombieKnockYouDown.webp",
    onEnter: function(vars) { tryBreakWeapon(vars); return {}; },
    text: function(vars) {
      var body;
      if (vars._labZombieDead) {
        body = "你倒在大堂门口。玻璃门外就是天光，就是旗杆，就是那条能回去的街。\n\
内袋里那几页纸，一页都没少——数据、签名、两枚红章，全都好好的。\n\
只有“取件人签收”那一栏，还空着。\n\
现在，它永远空着了。";
      } else if (vars._lastScene === "张江-检测中心-检测员战") {
        body = "白大褂把你压在仪器桌上。\n\
你最后看见的，是墙上贴着的那张元素周期表——眼神发花，满墙的格子都在晃，只有一个格子越来越清楚，正中间偏右，80 号。\n\
汞。\n\
这栋楼早就替你把答案测出来了。就放在你够不着的那只手里。";
      } else {
        body = "白大褂的影子把你按倒在走廊的黑暗里。天光还停在高窗上，下不来。\n\
最后陪着你的是日光灯镇流器里残余的一点嗡声——电都没了，那声音不知道是从哪儿来的。\n\
这栋楼里测出过什么，你到死，都没能走到它面前。";
      }
      return body + "\n—— 结局：检测中心 ——" + weaponBrokeText(vars);
    }
  },
});
