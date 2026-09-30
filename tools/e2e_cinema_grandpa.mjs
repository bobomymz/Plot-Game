// 现场走查：新达汇4F放映厅大爷插曲链（躲藏/迎战/失手/谢礼/弃他而去/结局-包场）
// 注：不用 helper.waitChoices()——它等 .choice-btn 存在，而换场景后旧按钮仍留在隐藏 DOM 里（SKILL 坑15），
//     会提前返回导致 text() 断尾（坑14）/click 抓旧按钮。改等 #choices-area 可见（=打字播完、新按钮已重建）。
import { launchGame } from "./test_helper.mjs";

const g = await launchGame();
const ok = [];
const bad = [];
function chk(name, cond) { (cond ? ok : bad).push(name); if (!cond) console.log("FAIL: " + name); }

async function waitFresh(timeout = 15000) {
  return g.page.waitForFunction(() => {
    const a = document.getElementById("choices-area");
    return a && a.style.display !== "none" && getComputedStyle(a).display !== "none"
      && !!a.querySelector(".choice-btn, .choice-input-container");
  }, null, { timeout }).then(() => true).catch(() => false);
}

async function reachDiscovery() {
  // 从影厅走廊真实点击进链：放映厅3 → 发现幸存者
  await g.teleport("新达汇-4F影厅走廊");
  await waitFresh();
  await g.click("进3号放映厅");
  await waitFresh();
}

// ---------- A. 躲藏分支（无手机） + 谢礼 + 重访守卫 ----------
await waitFresh();
await g.click("开始游戏");
await g.time({ hh: 10 });
await reachDiscovery();
chk("A1 放映厅3初访有相遇选项", (await g.choices()).some(t => t.includes("过去看看")));
await g.click("过去看看怎么回事");
await waitFresh();
let t = await g.text();
chk("A2 发现幸存者·无手机文案", t.includes("我没带手机"));
chk("A3 无插值残留", !t.includes("{"));
const csA = await g.choices();
chk("A4 三分支齐全", ["躲好", "迎上去", "溜出去"].every(k => csA.some(c => c.includes(k))));
const stBefore = await g.state();
await g.click("把他按到座椅后面躲好");
await waitFresh();
t = await g.text();
chk("A5 躲藏文本落点", t.includes("大拇指"));
await g.click("继续");
await waitFresh();
t = await g.text();
chk("A6 谢礼·保安小刘呼应", t.includes("保安小刘"));
chk("A6b 谢礼·拒护送", t.includes("闭着眼都认得路"));
const stAfter = await g.state();
chk("A7 _cinemaGrandpa置位", stAfter._cinemaGrandpa === true);
chk("A8 水果糖体力+2", stAfter.strength === stBefore.strength + 2);
await g.click("去影厅走廊");
await waitFresh();
chk("A9 回到影厅走廊", (await g.scene()) === "新达汇-4F影厅走廊");
await g.click("进3号放映厅");
await waitFresh();
t = await g.text();
chk("A10 重访空座文案", t.includes("最后一排空了"));
chk("A11 重访隐藏相遇选项", !(await g.choices()).some(c => c.includes("过去看看")));

// ---------- B. 迎战·胜利档（带手机看时间文案） ----------
await g.restart();
await g.time({ hh: 10 });
await g.set({ hasPhone: true });
await reachDiscovery();
await g.click("过去看看怎么回事");
await waitFresh();
t = await g.text();
chk("B1 有手机报时文案", t.includes("掏出手机看了一眼"));
chk("B2 时间已插值", !t.includes("{hh"));
await g.click("迎上去拦住进来的东西");
await waitFresh();
const seq = (await g.state())._currentSeq;
chk("B3 闪色序列存在", Array.isArray(seq) && seq.length === 4);
await g.fillInput(seqAnswer(seq));
await waitFresh();
chk("B4 零偏差→谢礼", (await g.scene()) === "新达汇-4F放映厅3-谢礼");
t = await g.text();
chk("B5 胜利档也到谢礼", t.includes("保安小刘"));
const stB = await g.state();
chk("B6 胜利档未挂伤", stB.hurtByZombie !== true);
chk("B7 谢礼后flag置位", stB._cinemaGrandpa === true);
await g.click("去影厅走廊");
await waitFresh();

function seqAnswer(seq2, { bump = false } = {}) {
  const counts = { 红: 0, 蓝: 0, 绿: 0 };
  seq2.forEach(c => counts[c]++);
  const keys = ["红", "蓝", "绿"].filter(k => counts[k] > 0);
  if (bump) { counts[keys[0]]++; if (keys[1]) counts[keys[1]]--; } // 偏差1~2 → 失手档
  return ["红", "蓝", "绿"].filter(k => counts[k] > 0).map(k => counts[k] + k).join("");
}

// ---------- C. 弃他而去 ----------
await g.restart();
await g.time({ hh: 10 });
await reachDiscovery();
await g.click("过去看看怎么回事");
await waitFresh();
const stC0 = await g.state();
await g.click("趁门还没被堵死，先溜出去");
await waitFresh();
t = await g.text();
chk("C1 弃他而去·太极收尾", t.includes("太极"));
chk("C1b 留白（别的声音）", t.includes("别的声音"));
const stC1 = await g.state();
chk("C2 尸潮+1", stC1.chasedByZombies === stC0.chasedByZombies + 1);
chk("C3 _cinemaGrandpa置位", stC1._cinemaGrandpa === true);
await g.click("去影厅走廊");
await waitFresh();

// ---------- D. 迎战·失手档 ----------
await g.restart();
await g.time({ hh: 10 });
await reachDiscovery();
await g.click("过去看看怎么回事");
await waitFresh();
await g.click("迎上去拦住进来的东西");
await waitFresh();
const seqD = (await g.state())._currentSeq;
await g.fillInput(seqAnswer(seqD, { bump: true }));
await waitFresh();
chk("D1 偏差≤2→失手", (await g.scene()) === "新达汇-4F放映厅3-迎战-失手");
t = await g.text();
chk("D2 马扎救场", t.includes("马扎") && t.includes("欺负年轻人"));
chk("D3 受伤标记", (await g.state()).hurtByZombie === true);
await g.click("继续");
await waitFresh();
chk("D4 失手汇入谢礼", (await g.scene()) === "新达汇-4F放映厅3-谢礼");

// ---------- E. 迎战·死亡档（放最后：结局画面后不再点击） ----------
await g.restart();
await g.time({ hh: 10 });
await reachDiscovery();
await g.click("过去看看怎么回事");
await waitFresh();
await g.click("迎上去拦住进来的东西");
await waitFresh();
await g.fillInput("9红9蓝9绿");
await g.page.waitForTimeout(1500);
chk("E1 大偏差→结局-包场", (await g.scene()) === "结局-包场");
t = await g.text();
chk("E2 结局文本", t.includes("只有你们两个观众"));

console.log(`\n== 放映厅大爷插曲 E2E：${ok.length} 通过 / ${bad.length} 失败 ==`);
console.log(await g.reportText());
await g.close();
