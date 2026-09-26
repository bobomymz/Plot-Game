// ====== 日记本系统（浏览 + 手写 + 丢本特殊节点） ======
//
// 入口：整理整理「📔 翻开日记本」（showCondition: hasDiary，见 core.js）。
// 数据层：utils.js 的 gainMemory / addDiaryEvent / addDiaryNote（自动记 dd/hh/mm/weather）。
// 记忆获取一律走 gainMemory(vars, key, type)，禁止裸调 xxxMemorySet.add ——
// key 必须与本文件 DIARY_ENTRIES 严格一致（tools/check_diary.js 双向审计）。
//
// 本页渲染：diaryRender 按 _diaryPage 分页（0=最新一页），同一天共享日期头，
// 天气取落账时的快照 —— 翻日记能重看"那天下着雨"。
// 引擎零改动：打字机/展开滚动/触控目标/快照回溯全部走普通场景管线。

var DIARY_PER_PAGE = 5;

// 记忆/事件正文表（第一人称日记腔，文风基准 张江.js）。key = 记忆名或事件名。
// ⚠ 正文不要用 { }（text 函数返回值会做 {变量名} 插值）；引号一律“”。
var DIARY_ENTRIES = {
  "忘记搬家的松鼠":
    "回了趟以前的家。床底下居然翻出了小斯克莱特——那只冰河世纪的松鼠，搬家那天我翻遍了所有箱子都没找到它，最后是哭着上的车。<br>原来它一直蹲在原地等我。毛都打结了。我把它摆到书桌上，让它接着看这间屋子。",
  "滑板车的盲从":
    "在小广场捡到一辆滑板车，车轴连点锈都没有。想起小时候，我在滑板车上看见妈妈抱着弟弟回家，想都没想就追了上去，把奶奶一个人丢在了广场上，回家挨了好一顿骂。<br>那时候觉得天塌了。现在想想，能被骂，也是有人管你。",
  "起脚爆射":
    "去操场上踢了一脚球。还是那个脚感，没怎么助跑，球擦着横梁下沿钉进了死角。<br>高三那会儿，非得踢进这种球才肯回教室。现在没铃声了，想踢多久踢多久——反而没那么想踢了。",
  "悠扬琴声":
    "圆厅里有人在弹琴，弹错一个音就退回那一小节从头来。那架琴以前是摆在走廊上的，中午吃完饭路过，总能听上一段。<br>不知不觉听了三年。今天头一回坐下来，正经听。",
  "U-ball":
    "路过龙头区的足球场。U-ball 的牌子还挂着，就是锈得认不全了，最后一个字只剩半边。<br>小时候每周六来上足球课，妈妈坐在场边的台阶上，一边看手机一边等我。俱乐部倒了好几年，台阶还在原来的位置。",
  "返校":
    "回了一趟初中，把小陆、小王、小赵都带出来了。三个人灰头土脸，但都活着。<br>临走小陆拍着我肩膀说“要不是你来”。其实我就是想亲眼确认他们没事。<br>现在确认了。",
  "师生重逢":
    "在一间还亮着灯的机房里碰见了老师。整座城都黑了，就他那几台机器还记得运转。<br>他绕着操作台走了两圈才认出我：“建平的！我带过你课题的那个！”然后拍着我的肩膀说，活着就好。<br>这四个字从一个也活着的人嘴里说出来，比什么都重。",
  "毕业快乐":
    "把那张合照拿给洪金宝看。烧烤店，两个勾肩搭背的年轻人，背面一行马克笔：毕业快乐——金宝，2010.6。<br>他的拇指在照片上来回蹭了半天，最后说“你留着吧，看得住它的人，替他保管”。<br>行。那我替他保管。",
  "介孔材料":
    "在材料楼大厅又站到了那块展板前面。一粒米大的粉末，孔道全部摊开有半个篮球场——肉眼看不见的地方，藏着最大的世界。<br>研学那年在这儿站到差点掉队，忻老师在队伍前面喊“看什么看，走了”。<br>展板还立着。喊我的那个人，不知道去哪儿了。",
  "抄录报告":
    "把检测报告一页页抄进了这个本子。编号、点位、检测方法、那个红色的数字、两枚章的名称，一个数一个数地对。<br>抄到“取件人签收”那一栏，笔尖悬了一下。<br>空着的栏，就让它空着吧。",
  "腐烂尸城":
    "在高三14班的电脑上，点开了自己收藏的《腐烂尸城》。缓存还在，不用网也放得出来——一台城市的互动视频，讲它怎么被尸潮吞没。<br>画面里的丧尸、逃命的人群、绝望的呐喊，和这几天看见的，像得让人发毛。<br>当年看完还得赶去上下一节课。"
};

// 渲染当前页。同一天连续条目共享一个日期头；手写条目直接出 text（已转义），
// 记忆/事件查 DIARY_ENTRIES（查不到出兜底行，check_diary.js 保证兜底永不触发）。
function diaryRender(vars) {
  var log = vars._diaryLog || [];
  if (log.length === 0) {
    return "日记本摊开着，还是崭新的，一股纸浆味。<br>你还没在上面写过什么。";
  }
  var total = Math.ceil(log.length / DIARY_PER_PAGE);
  var page = Math.min(Math.max(0, vars._diaryPage || 0), total - 1);
  var start = Math.max(0, log.length - (page + 1) * DIARY_PER_PAGE);
  var end = log.length - page * DIARY_PER_PAGE;

  var parts = [];
  var lastDay = -1;
  for (var i = start; i < end; i++) {
    var e = log[i];
    if (e.dd !== lastDay) {
      parts.push("<strong>—— " + diaryDateText(e) + " ——</strong>");
      lastDay = e.dd;
    }
    if (e.kind === "note") {
      parts.push(e.text);
    } else {
      // 值支持纯字符串（当前用法）或 { body, ink } 对象（预留墨色字段）
      var ent = DIARY_ENTRIES[e.key];
      var body = !ent ? "（这一页的字迹被水洇开了，认不出来。）"
               : (typeof ent === "string" ? ent : (ent.body || "……"));
      parts.push(body);
    }
  }
  parts.push("<span style=\"color:#8a7f6a;\">（第 " + (page + 1) + " / " + total + " 页）</span>");
  return parts.join("<br><br>");
}

Object.assign(storyData, {

  // ---- 主浏览页：翻页自跳，onEnter 只在"从外部进入"时归位到最新页（_lastScene 是引擎自动维护的） ----
  "日记本": {
    image: "images/placeholder.png", /* TODO: images/日记本.webp（16:9 横版摊开的笔记本纸面） */
    style: "font-family: 'Kaiti SC','STKaiti','KaiTi',serif; color: #ffffff; line-height: 1.8;",
    onEnter: function(vars) {
      if (vars._lastScene !== "日记本") vars._diaryPage = 0;
      return {};
    },
    text: function(vars) { return diaryRender(vars); },
    choices: [
      {
        text: "往前翻（更早的）",
        showCondition: "_diaryPage < Math.ceil(_diaryLog.length / 5) - 1",
        effect: { add: { _diaryPage: 1 } },
        nextScene: "日记本"
      },
      {
        text: "往后翻（最近的）",
        showCondition: "_diaryPage > 0",
        effect: { add: { _diaryPage: -1 } },
        nextScene: "日记本"
      },
      { text: "写点什么", nextScene: "日记本-写" },
      { text: "合上日记本", nextScene: "整理整理" }
    ]
  },

  // ---- 手写：input 只采集，落库与转义在 addDiaryNote；空输入走 elseScene ----
  "日记本-写": {
    image: "images/placeholder.png", /* TODO: 同日记本 */
    style: "font-family: 'Kaiti SC','STKaiti','KaiTi',serif; color: #ffffff; line-height: 1.8;",
    text: "你翻开新的一页。笔尖在纸上顿了顿——写点什么好呢。",
    choices: [
      {
        text: "落笔",
        input: { placeholder: "今天……", maxLength: 80 },
        condition: function(v) { return (v._input || "").trim().length > 0; },
        effect: function(v) { addDiaryNote(v, v._input); return {}; },
        nextScene: "日记本-写好了",
        elseScene: "日记本-写-空白"
      },
      { text: "算了，合上本子", nextScene: "日记本" }
    ]
  },

  "日记本-写-空白": {
    image: "images/placeholder.png", /* TODO: 同日记本 */
    style: "font-family: 'Kaiti SC','STKaiti','KaiTi',serif; color: #ffffff; line-height: 1.8;",
    text: "你盯着空白的一页看了半天，最后什么也没写。",
    choices: [
      { text: "翻看日记本", nextScene: "日记本" }
    ]
  },

  // ---- 写入确认：+1 分钟（与丢东西同级的手上功夫）；回显最后一条（已转义，不再二次处理） ----
  "日记本-写好了": {
    image: "images/placeholder.png", /* TODO: 同日记本 */
    style: "font-family: 'Kaiti SC','STKaiti','KaiTi',serif; color: #ffffff; line-height: 1.8;",
    onEnter: updateTime(1),
    text: function(v) {
      var log = v._diaryLog || [];
      if (log.length === 0) return "……";
      var last = log[log.length - 1];
      return "你在「" + diaryDateText(last) + "」这一页写下了：<br><br>" + last.text +
        "<br><br>写完，你把笔帽按了回去。";
    },
    choices: [
      { text: "再写一条", nextScene: "日记本-写" },
      { text: "翻看日记本", nextScene: "日记本" },
      { text: "合上日记本", nextScene: "整理整理" }
    ]
  },

  // ---- 丢本特殊节点（波波拍板文案）：物品没了，账本保留——"未曾有过什么"留给多周目回味 ----
  "整理整理-丢日记本": {
    image: "images/placeholder.png", /* TODO: images/日记本-丢弃.webp */
    text: "你把日记本丢到了地上——太占空间了。<br>起身，转头一看，地上已经空空如也，像是未曾有过什么。",
    choices: [
      { text: "……", nextScene: "整理整理" }
    ]
  }

});
