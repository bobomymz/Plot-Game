// ====== 场景正文 HTML 渲染自检（真浏览器，打字机跑完后的最终态）======
//
// 为什么需要它：node 侧的 text_markup_lint 只验证"源码标签配对"，验证不了浏览器端。
// 而 engine.js 的打字机是「逐 tick 重写 innerHTML」，跨多行的 <span>（如长者食堂签到机
// 那块跨 7 行的 term）最容易在打字过程中被截断/吞字。这个脚本专治那一类。
//
// 检查项（对每个目标场景）：
//   A) 打字过程中：已输出文本必须是「去标签全文」的严格前缀（防吞字/乱序/重复）
//   B) 最终态：给 typeText 打瞬时补丁后重渲染，断言
//        - 文本完整（去标签后逐字比对 typingFullText）
//        - 目标 class 真的渲染成元素（不是字面文本）
//        - 无浏览器补全的嵌套 span（源码漏闭合时浏览器会补出嵌套层级）
//        - 跨行 span 内部保留 \n（签到记录那种等宽对齐依赖 pre-wrap + \n）
//
// ⚠ 两个坑（09-28 踩过，别回退）：
//   1) teleport 后必须等 DOM 落定再读，否则拿到空串（renderScene 是异步填充的）
//   2) stopTyping() 只 clearInterval，不补齐剩余文本 —— 想拿最终态必须打补丁，不能靠 stopTyping
//
// 用法：node tools/scene_html_render_selftest.mjs   期望「N 通过 / 0 失败」
// 新增样板文件时：把场景 id 加进 CASES 即可。

import { launchGame } from "./test_helper.mjs";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  → " + extra : "")); }
};

// 期望文本取自 story/*.js 去标签后的原文；改了剧情文案就要同步这里
const CASES = [
  {
    id: "长者食堂-签到机",
    must: ["洪德胜", "周建国", "番茄炒蛋+饭+汤", "（屏幕上的日期停在这一天，之后没有新的签到）",
           "你已经不在它的名单里了。"],
    cls: "term",
    multiline: true,   // term 块跨 7 行
  },
  {
    id: "长者食堂-手机信息",
    must: ["【上海应急广播 — 最后更新 6月28日 14:32】", "浦东图书馆（锦绣路）",
           "《我市启动突发公共卫生事件应急预案》", "新民晚报大概不会有下一期了。"],
    cls: "print",
    multiline: true,
  },
  {
    id: "长者食堂-关门",
    must: ["扫码注册充值，即可享用美食。", "砰砰砰————！", "是一只丧尸，它正趴在门上试图进来"],
    cls: "sfx crit",
  },
  {
    id: "结局-闭目养神",
    must: ["淅沥淅沥", "你感觉到一丝不安。", "一只红眼的丧尸向你扑了过来", "—— 结局：闭目养神 ——"],
    cls: "end",
  },
  {
    id: "长者食堂-饮水机",
    must: ["滤芯指示灯闪着绿光"],
    cls: "term",
  },
  {
    id: "长者食堂-办公室",
    must: ["省电，走时关路由器。重开按背后小黑钮三秒。"],
    cls: "hand",
  },
  // 2026-09-28 修掉的 4 个既存 markup bug（回归用，防止复发）
  {
    id: "银行-存款凭条",          // 原 <div style=...> → <span class='print'>（div 会撑破 <p>）
    must: ["━━━ 中国建设银行 · 存款凭条 ━━━", "网点：环林东路支行", "金额：¥860.00",
           "860块——大概是一个小店主三四天的流水。"],
    cls: "print",
    multiline: true,               // 凭条用 <br> 换行，靠这个确认 br 没被吃掉
  },
  {
    id: "结局-丧尸的凝视",         // 原两个 <div> → sfx rot / crit，结局行 → end
    must: ["一只闪烁着绿光的眼睛正盯着你", "整扇门猛地向内凸起——它进来了。",
           "—— 结局：当你凝视深渊时，深渊也在凝视着你。 ——"],
    cls: "end",
  },
  {
    id: "上实南校-撤离成功",       // 原 <span> 未闭合 → 后续文本被染成青色斜体
    must: ["【系统提示】获得记忆[返校]", "你多了三个同伴"],
    cls: "sys",
  },
  // 五金店样板（第一个改完的文件，一并纳入回归）
  {
    id: "五金店",
    must: ["卷帘门半开着", "一股机油混着腐臭的甜味"],
    cls: "smell",
  },
];

const strip = (s) => String(s).replace(/<\/?[a-zA-Z][^>]*>/g, "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const g = await launchGame();
await g.time({ dd: 1, hh: 12, mm: 0 });

const snap = () => g.page.evaluate(() => {
  const el = document.getElementById("scene-text");
  return {
    full: typeof typingFullText === "string" ? typingFullText : null,
    text: el ? el.textContent : null,
    spans: el ? [...el.querySelectorAll("span")].map((s) => s.className) : [],
    nested: el ? el.querySelectorAll("span span").length : -1,
  };
});

for (const c of CASES) {
  const tag = `[${c.id}]`;

  // ---------- A) 原版打字机：验证过程不吞字 ----------
  await g.teleport(c.id);
  await wait(1200);                       // 让它打一段（80ms/字 → 约 15 字）
  const mid = await snap();
  if (mid.full && mid.text) {
    const plain = strip(mid.full);
    ok(`${tag} 打字中：输出是全文的严格前缀（不吞字/不乱序）`,
       plain.startsWith(mid.text) && mid.text.length > 0 && mid.text.length < plain.length,
       `${mid.text.length}/${plain.length} 字`);
  } else {
    ok(`${tag} 打字中：输出是全文的严格前缀（不吞字/不乱序）`, false, "文本为空，渲染未完成");
  }

  // ---------- B) 瞬时补丁：验证最终态 ----------
  await g.page.evaluate(() => {
    if (!window.__origTypeText) window.__origTypeText = typeText;
    typeText = function (el, full, speed, cb) { el.innerHTML = full; sceneText.classList.remove("typing"); if (cb) cb(); };
  });
  await g.teleport(c.id);
  const info = await snap();
  await g.page.evaluate(() => { if (window.__origTypeText) { typeText = window.__origTypeText; } });

  const fullText = info.full ? strip(info.full) : "";

  ok(`${tag} 渲染出正文`, !!fullText && fullText.length > 0);

  for (const frag of c.must) {
    ok(`${tag} 含「${frag.slice(0, 14)}${frag.length > 14 ? "…" : ""}」`, fullText.includes(frag));
  }

  // class 真的生效（渲染成元素，不是把 "<span class='term'>" 当字面文本打出来）
  const clsList = c.cls.split(/\s+/);
  ok(`${tag} class '${c.cls}' 渲染成元素`,
     clsList.every((cl) => info.spans.some((s) => String(s).split(/\s+/).includes(cl))),
     info.spans.join("|"));

  // 没把标签当字面文本
  ok(`${tag} 未出现字面标签`, !/<span|&lt;span/i.test(info.text || ""));

  // 未闭合检测：浏览器补全会让 span 互相嵌套
  ok(`${tag} 无浏览器补全的嵌套 span`, info.nested === 0, "nested=" + info.nested);

  // DOM 文本 vs 期望：去空白后应完全相等（防重复插入）
  ok(`${tag} DOM 文本 == 去标签全文（无重复）`,
     (info.text || "").replace(/\s+/g, "") === fullText.replace(/\s+/g, ""));

  if (c.multiline) {
    // 跨行 span 内部必须保留 \n，否则签到记录那种等宽对齐会塌成一行。
    // ⚠ 取"该 class 下换行最多的那个"，不能取第一个：签到机第一个 term 是单行的「蓝光一闪一闪」
    const multi = await g.page.evaluate((cl) => {
      const el = document.getElementById("scene-text");
      const ss = [...el.querySelectorAll("span")].filter((x) => String(x.className).split(/\s+/).includes(cl));
      if (!ss.length) return -1;
      return Math.max(...ss.map((s) => (s.textContent.match(/\n/g) || []).length));
    }, clsList[0]);
    ok(`${tag} 跨行 span 内含换行（≥3 个 \\n）`, multi >= 3, "count=" + multi);
  }
}

await g.close();
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
