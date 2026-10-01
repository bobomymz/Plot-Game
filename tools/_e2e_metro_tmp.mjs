// 临时 E2E：地铁站改造三路线走查（跑完即删）
import { launchGame } from "./test_helper.mjs";

const g = await launchGame();
await g.page.waitForTimeout(1200);
await g.click("开始游戏");
await g.page.waitForTimeout(500);
console.log("启动场景:", await g.page.evaluate(() => currentScene));
let fails = 0;
const ok = (cond, label) => { console.log((cond ? "PASS" : "FAIL") + " " + label); if (!cond) fails++; };
const st = () => g.page.evaluate(() => ({
  cs: currentScene, mt: gameState.hasMetroTools, ic: gameState.itemCount,
  sp: gameState._stationPowered, pk: gameState._procedureKnown,
  ch: gameState.chasedByZombies, hb: gameState.hasBottle, bi: gameState.hasBiscuit
}));
const txt = () => g.page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

// ============ 路线A：侦查流（零战斗零手电通关） ============
await g.teleport("11号线-三林东站");
await g.click("在入口处观察一会儿再下去");
await g.click("捡个水瓶扔向大厅另一头，趁乱去翻维修工的腰间");   // QTE 5s
await g.click("稳住手，把腰扣一颗颗解开");
await g.click("把工具串收进包里");
let s = await st();
ok(s.mt === true && s.ic === 1, "A1 拿到工具串并占包");
await g.click("去开员工通道的铁门");
await g.click("进站务室");
await g.click("翻看《车站用电规程》");
s = await st();
ok(s.pk === true, "A2 用电规程 flag");
await g.click("合上规程，记住这页");
await g.click("从应急柜里拿一瓶矿泉水");
s = await st();
ok(s.hb === true && s.ic === 2, "A3 矿泉水拾取");
await g.click("关上柜门");
await g.click("拿走应急柜里的压缩饼干");
await g.click("关上柜门");
await g.click("回走廊");
await g.click("进配电间");
await g.click("合上红色闸刀（事故照明总闸）");
await g.click("合上黄色闸刀（站台动力）");
s = await st();
ok(s.sp === true && s.ch === 1, "A4 合闸供电+噪音+1");
await g.click("沿员工楼梯下到站台西端");                        // QTE 3s 场景
await g.click("沿屏蔽墙边缘潜行到列车门");
await g.click("进入车厢");
ok((await txt()).includes("蓄电池"), "A5 列车通电文案");
await g.click("进驾驶室");
await g.click("推下牵引推杆");
await g.click("下车");
s = await st();
ok(s.cs === "结局-迪士尼-幸存者聚居地", "A6 抵达好结局");
console.log("--- A 报告 ---\n" + (await g.reportText()));

// ============ 路线B：莽夫流（无钥匙→站台死火→折返补课） ============
await g.restart();
await g.teleport("11号线-三林东站");
await g.click("快步通过闸机，进入站厅");                          // QTE 8s
await g.click("趁它们还没完全反应过来，冲过去");
await g.click("直接冲过去");                                     // 硬冲 chased+2
await g.click("赶紧下楼");
await g.click("进入站台区");
s = await st();
ok(s.ch === 2 && s.sp === false, "B1 噪音2且未供电");
await g.click("贴着屏蔽墙，朝列车的方向摸过去");                  // 摸黑 QTE 4s
await g.click("压低身子，贴着立柱从声音旁边绕过去");
ok((await txt()).includes("黄色背心"), "B2 死火车指向维修工");
await g.click("沿楼梯回站厅，去找维修工的工具");
await g.click("贴着台阶外侧，一级一级往上挪");
await g.click("快步穿过安检区，回站厅");
await g.click("扑向售票机边穿黄背心的维修工");                    // 缠斗 QTE（噪音压缩后）
await g.click("用膝盖压死它的手臂，转成慢慢解扣子");
await g.click("稳住手，把腰扣一颗颗解开");
await g.click("把工具串收进包里");
await g.click("去开员工通道的铁门");
await g.click("进配电间");
await g.click("合上红色闸刀（事故照明总闸）");
await g.click("合上黄色闸刀（站台动力）");
await g.click("沿员工楼梯下到站台西端");                          // ch=3<4
await g.click("沿屏蔽墙边缘潜行到列车门");
await g.click("进入车厢");
await g.click("进驾驶室");                                       // ch=3<4
await g.click("推下牵引推杆");
await g.click("下车");
s = await st();
ok(s.cs === "结局-迪士尼-幸存者聚居地", "B3 折返补课后通关");
console.log("--- B 报告 ---\n" + (await g.reportText()));

// ============ 路线C：噪声清算（隧道尸潮 + 屏息泄压 + 跳闸） ============
await g.restart();
await g.set({ chasedByZombies: 4, hasMetroTools: true });
await g.teleport("地铁站-员工通道-走廊");
await g.click("沿员工楼梯下到站台西端");                          // ch=4 → elseScene
s = await st();
ok(s.cs === "地铁站-站台层-隧道尸潮", "C1 噪音4进站台被尸潮截住");
await g.click("缩到屏蔽墙后，屏住呼吸");
s = await st();
ok(s.cs === "地铁站-站台层-屏息" && s.ch === 2, "C2 屏息存活且噪音-2");
await g.click("从死角里出来，回到站台");
await g.click("从站台西端的员工门回走廊");
await g.click("进配电间");
await g.click("合上灰色闸刀（商业回路）");                        // 试错
s = await st();
ok(s.cs === "地铁站-配电间-跳闸" && s.ch === 4, "C3 错闸跳闸+噪音2");
await g.click("把跳起的总闸推回去，回到柜前");
await g.click("合上红色闸刀（事故照明总闸）");
await g.click("合上黄色闸刀（站台动力）");
await g.click("沿员工楼梯下到站台西端");                          // ch=5? → 检查
s = await st();
console.log("C4 状态:", JSON.stringify(s));
ok(s.cs === "结局-尸潮撕碎了你" || s.cs === "地铁站-站台层-隧道尸潮", "C4 高噪音清算或全局即死");
console.log("--- C 报告 ---\n" + (await g.reportText()));

await g.close();
console.log(fails === 0 ? "\n=== 全部通过 ===" : `\n=== ${fails} 项失败 ===`);
process.exit(fails === 0 ? 0 : 1);
