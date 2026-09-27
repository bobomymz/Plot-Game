// ====== 选项文本受限 HTML 自检（真浏览器）======
//
// 覆盖 engine.js 的 sanitizeInlineHtml + createChoiceButton（820/910/969 三处 innerHTML 改造）：
//   1) 合法标签/白名单 class → 渲染成真元素（不是字面文本）
//   2) 白名单外 class → 被丢弃
//   3) 非白名单标签（div/script/img）→ 降级为纯文本，文字保留、标签不生效
//   4) 事件属性 / javascript: / style → 全部剥离，且不会执行
//   5) 正文（scene-text）同样支持标签，且打字机不会把标签当字面文本
//
// 用法：node tools/choice_html_selftest.mjs   期望「N 通过 / 0 失败」

import { launchGame } from "./test_helper.mjs";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  → " + extra : "")); }
};

const g = await launchGame();
await g.time({ dd: 1, hh: 10, mm: 0 });

// ---------- 构造一个临时场景：选项文本里塞各种 HTML ----------
const probe = "选项HTML自检探针";
await g.page.evaluate((sid) => {
  storyData[sid] = {
    image: "images/placeholder.png",
    text: "正文<span class='crit'>突袭</span>与<span class='sfx'>哐当</span>。",
    choices: [
      { text: "普通选项", nextScene: "start" },
      { text: "白名单 class：<span class='crit'>危险</span>", nextScene: "start" },
      { text: "系统提示：<span class='sys warn'>体力-1</span>", nextScene: "start" },
      { text: "白名单外 class：<span class='evil'>不该生效</span>", nextScene: "start" },
      { text: "块级标签：<div>不该成块</div>", nextScene: "start" },
      { text: "脚本标签：<script>window.__XSS__ = 1;<\/script>危险", nextScene: "start" },
      { text: "图片注入：<img src=x onerror='window.__XSS2__=1'>", nextScene: "start" },
      { text: "事件属性：<span onclick='window.__XSS3__=1' class='crit'>点我</span>", nextScene: "start" },
      { text: "内联 style：<span style='color:#ff0000;font-size:99px' class='crit'>红</span>", nextScene: "start" },
      { text: "插值：<span class='num'>{strength}</span>", nextScene: "start" },
    ],
  };
}, probe);

await g.teleport(probe);
await g.waitChoices();

// ---------- 1) 正文标签生效 ----------
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });
const bodyHtml = await g.page.evaluate(() => document.getElementById("scene-text").innerHTML);
const bodyText = await g.page.evaluate(() => document.getElementById("scene-text").innerText);
ok("正文：crit 渲染成元素（非字面文本）", bodyHtml.includes("class=\"crit\"") || bodyHtml.includes("class='crit'"), bodyHtml.slice(0, 80));
ok("正文：去标签后文本完整（突袭/哐当 都在）", bodyText.includes("突袭") && bodyText.includes("哐当"), bodyText);
const critColor = await g.page.evaluate(() => {
  const el = document.querySelector("#scene-text .crit");
  return el ? getComputedStyle(el).color : null;
});
ok("正文：crit 真的拿到危险色（CSS 生效）", critColor === "rgb(255, 77, 61)", String(critColor));

// ---------- 2) 选项：白名单 class ----------
const btnHtml = await g.page.evaluate(() => {
  const bs = [...document.querySelectorAll("#choices-area .choice-btn")];
  return bs.map((b) => b.innerHTML);
});
const btnText = await g.page.evaluate(() => [...document.querySelectorAll("#choices-area .choice-btn")].map((b) => b.textContent.trim()));

ok("选项：白名单 class 渲染成元素", btnHtml.some(h => h.includes("class=\"crit\"") && h.includes("危险")));
ok("选项：sys warn 两个 class 同时保留", btnHtml.some(h => /class="sys warn"/.test(h)), btnHtml.find(h => h.includes("体力-1")) || "");
ok("选项：文本不含字面标签（没被 escape 成文本）", !btnText.some(t => t.includes("<span")), btnText.slice(0, 3).join(" | "));

// ---------- 3) 白名单外 class 被丢弃 ----------
ok("选项：白名单外 class 被丢弃（class 属性移除，文字保留）",
  btnHtml.some(h => h.includes("不该生效") && !h.includes("evil")), btnHtml.find(h => h.includes("不该生效")) || "");

// ---------- 4) 块级 / script / img 降级为纯文本 ----------
ok("选项：<div> 不产生块级元素", !btnHtml.some(h => h.includes("<div")), btnHtml.find(h => h.includes("不该成块")) || "");
ok("选项：<div> 文字仍保留", btnText.some(t => t.includes("不该成块")));
ok("选项：<script> 不成元素",
  (await g.page.evaluate(() => document.querySelectorAll("#choices-area script").length)) === 0);
ok("选项：<img> 不成元素",
  (await g.page.evaluate(() => document.querySelectorAll("#choices-area img").length)) === 0);

// ---------- 5) 事件属性 / style 剥离 + 未执行 ----------
ok("选项：onclick 被剥离", !btnHtml.some(h => h.includes("onclick")), btnHtml.find(h => h.includes("点我")) || "");
ok("选项：style 被剥离", !btnHtml.some(h => h.includes("style=")), btnHtml.find(h => h.includes(">红<")) || "");
const xss = await g.page.evaluate(() => ({ a: window.__XSS__, b: window.__XSS2__, c: window.__XSS3__ }));
ok("选项：注入脚本未执行（__XSS* 全为 undefined）",
  xss.a === undefined && xss.b === undefined && xss.c === undefined, JSON.stringify(xss));
const critBtnColor = await g.page.evaluate(() => {
  const el = [...document.querySelectorAll("#choices-area .choice-btn .crit")][0];
  return el ? getComputedStyle(el).color : null;
});
ok("选项：crit 子元素拿到危险色", critBtnColor === "rgb(255, 77, 61)", String(critBtnColor));

// ---------- 6) 插值正常 ----------
ok("选项：{strength} 插值生效（不是字面量）", btnText.some(t => /\d/.test(t) && t.includes("插值")), btnText.find(t => t.includes("插值")) || "");

// ---------- 7) 输入型选项 label 也支持 ----------
await g.page.evaluate((sid) => {
  storyData[sid + "-input"] = {
    image: "images/placeholder.png",
    text: "输入型<span class='term'>标签</span>。",
    choices: [{ input: { placeholder: "输入" }, text: "密码：<span class='num'>4 位</span>", nextScene: "start" }],
  };
}, probe);
await g.teleport(probe + "-input");
await g.page.waitForSelector("#choices-area .choice-input-container", { timeout: 10000 }).catch(() => {});
const labelHtml = await g.page.evaluate(() => {
  const el = document.querySelector("#choices-area .choice-input-label");
  return el ? el.innerHTML : null;
});
ok("输入型选项 label 支持 HTML", !!labelHtml && labelHtml.includes("class=\"num\""), String(labelHtml));

// ---------- 8) 点击仍然正常（改造没破坏交互）----------
await g.teleport(probe);
await g.waitChoices();
const after = await g.click("普通选项");
ok("选项点击仍可跳转", after === "start", String(after));

console.log("\n" + (await g.reportText()));
console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
await g.close();
process.exit(fail ? 1 : 0);
