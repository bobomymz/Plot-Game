// E2E 现场：仁济地下停车场 darkSearch 第3试点（路标导航解锁 + 负热点 + 路径陷阱）
// 三条光源线：手电 / 手机微光（第三档，-5%电+压暗遮罩）/ 无光
// 陷阱链：没照过碎玻璃就去电梯 → 踩玻璃 ch+1 且"学会"（_rjLitGlass 置真）
// QTE链：照亮丧尸群 onFound 跳 惊动丧尸群（10s-ch*1s），超时 → 结局-仁济-车库尸群
//
// 停留模拟原理（engine.js darkLoop/darkPointer/darkFit 的逆向）：
//   光锥判定是 rAF 循环累计——在命中圆内 dispatch 一次 pointermove 后按住不动即可累计；
//   屏幕坐标 = rect.left + offX + x*naturalW*scale（cover: scale=max(W/w,H/h)）。
import { launchGame } from "./test_helper.mjs";

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ FAIL: " + msg); } };

// 把热点（图片原生比例坐标）换算成屏幕坐标，向 #image-area dispatch pointermove 后等待 dwell
async function dwell(g, x, y, ms) {
  await g.page.evaluate(({ x, y }) => {
    const area = document.getElementById("image-area");
    const img = document.getElementById("scene-image");
    const W = area.clientWidth, H = area.clientHeight;
    const w = img.naturalWidth, h = img.naturalHeight;
    const contain = getComputedStyle(img).objectFit === "contain";
    const s = contain ? Math.min(W / w, H / h) : Math.max(W / w, H / h);   // darkFit
    const offX = (W - w * s) / 2, offY = (H - h * s) / 2;
    const rect = area.getBoundingClientRect();
    const cx = rect.left + offX + x * w * s;
    const cy = rect.top + offY + y * h * s;
    area.dispatchEvent(new PointerEvent("pointermove", { clientX: cx, clientY: cy }));
  }, { x, y });
  await g.page.waitForTimeout(ms);
}

// 图片区当前 class 列表（光源档断言：dark-searching / dark-phone / dark-fire）
const areaClasses = (g) => g.page.evaluate(() =>
  [...document.getElementById("image-area").classList]);

const S_ELE = "仁济南院-地下停车场-电梯口";
const S_DEEP = "仁济南院-地下停车场-深处";
const S_RAMP = "仁济南院-地下停车场";
const S_GLASS = "仁济南院-地下停车场-踩到碎玻璃";
const S_ALARM = "仁济南院-地下停车场-惊动丧尸群";
const S_CORR = "仁济南院-后勤通道";

const g = await launchGame();
g.page.on("dialog", (d) => d.accept().catch(() => {}));   // restart 若弹 confirm 自动放行

// ============ A. 手电线：指路牌解锁 → 玻璃陷阱 → 学会 → 丧尸群 QTE 逃生 ============
console.log("\n=== A. 手电线 ===");
await g.waitChoices(20000);            // 首场景打字机 ~2s：launchGame 只等 preload，选项要等打字完成才渲染
await g.click("开始游戏");
await g.set({ hh: 10, hasTorch: true });
await g.teleport(S_RAMP);
await g.waitChoices();
let cs = await g.choices();
ok(cs.includes("借着光，下到车库深处"), "坡道：手电玩家看到“借着光，下到车库深处”");
ok(!cs.some((t) => t.includes("手机微光")), "坡道：手电玩家不出现手机微光选项");

await g.click("借着光，下到车库深处");
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });
ok(await g.waitChoices(20000), "深处：选项出现（打字机完成，darkSearch 已启动）");
ok(await g.scene() === S_DEEP, "到达车库深处");
let cls = await areaClasses(g);
ok(cls.includes("dark-searching"), "深处：图片区带 dark-searching（光锥激活）");
ok(!cls.includes("dark-phone") && !cls.includes("dark-fire"), "深处：手电档不带 dark-phone/dark-fire");
cs = await g.choices();
ok(cs.length === 1 && cs[0] === "退回坡道", "深处：未照亮任何路标前只有“退回坡道”（导航选项未解锁）");

// 照亮“门诊电梯←”牌子（0.492,0.598）→ 发现即互动
await dwell(g, 0.492, 0.598, 2800);
ok((await g.state())._rjLitElevator === true, "照满2秒：_rjLitElevator 置真");
cs = await g.choices();
ok(cs.includes("照着指示牌去门诊电梯"), "发现即互动：“照着指示牌去门诊电梯”追加为选项");

// 照亮“后勤走廊→”标语（0.861,0.550）
await dwell(g, 0.861, 0.550, 2800);
ok((await g.state())._rjLitCorridor === true, "照满2秒：_rjLitCorridor 置真");
cs = await g.choices();
ok(cs.includes("照着标语去后勤走廊"), "发现即互动：“照着标语去后勤走廊”追加为选项");

// 玻璃陷阱：没照过碎玻璃（_rjLitGlass=false）→ 点电梯选项吃 elseScene
const ch0 = (await g.state()).chasedByZombies;
await g.click("照着指示牌去门诊电梯");
ok(await g.scene() === S_GLASS, "陷阱：没照过碎玻璃 → 踩到碎玻璃");
let st = await g.state();
ok(st._rjLitGlass === true, "踩过一次：_rjLitGlass 置真（学会了）");
ok(st.chasedByZombies === ch0 + 1, "踩玻璃：ch+1（" + ch0 + "→" + st.chasedByZombies + "）");

await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });   // 踩玻璃文本打字中 → 选项未渲染
await g.waitChoices(20000);
await g.click("继续");
ok(await g.scene() === S_ELE, "电梯口到达");
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });   // 电梯口文本 ~150 字
await g.waitChoices(20000);
await g.click("退回车库");
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });
await g.waitChoices(20000);
ok((await g.text()).includes("你已经认下的路"), "重进深处：已认下的路 recap（持久化守卫生效）");
cs = await g.choices();
ok(cs.includes("照着指示牌去门诊电梯") && cs.includes("照着标语去后勤走廊"),
  "重进深处：两个已发现路标选项自动补渲染");

// 学会后再走电梯：不再吃玻璃，ch 不变
const ch1 = (await g.state()).chasedByZombies;
await g.click("照着指示牌去门诊电梯");
ok(await g.scene() === S_ELE, "学会后：去电梯直达电梯口（不再踩玻璃）");
ok((await g.state()).chasedByZombies === ch1, "学会后：ch 不再增加");

// 丧尸群负热点（0.297,0.497）：照满即惊动 → onFound 自动跳 QTE 场景
await g.click("退回车库");
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });
await g.waitChoices(20000);
await dwell(g, 0.297, 0.497, 2800);
ok(await g.scene() === S_ALARM, "照满丧尸群 2 秒：onFound 自动跳“惊动丧尸群”");
cs = await g.choices();
ok(cs.includes("照着指示牌，冲向门诊电梯"), "QTE 场景：电梯逃生路可见（_rjLitElevator 门控）");
ok(cs.includes("照着标语，冲向后勤走廊"), "QTE 场景：后勤逃生路可见（_rjLitCorridor 门控）");
ok(cs.includes("原路退回坡道"), "QTE 场景：原路退回常驻");
const ch2 = (await g.state()).chasedByZombies;
await g.click("照着标语，冲向后勤走廊");
ok(await g.scene() === S_CORR, "QTE 内逃进后勤走廊");
ok((await g.state()).chasedByZombies === ch2 + 1, "逃生选项 ch+1（动静闹大）");

// ============ B. QTE 超时 → 死亡结局 ============
console.log("\n=== B. QTE 超时线 ===");
await g.set({ chasedByZombies: 4 });                    // 时限 10000-4000=6s
await g.teleport(S_ALARM);                              // 传送进去倒计时立即开始
await g.page.waitForTimeout(7500);
ok(await g.scene() === "结局-仁济-车库尸群", "超时 → 结局-仁济-车库尸群（实际: " + (await g.scene()) + "）");

// ============ C. 手机微光线：第三档光源 ============
console.log("\n=== C. 手机微光线 ===");
await g.restart();
await g.waitChoices(20000);            // 重启后首场景打字机重新跑
await g.click("开始游戏");
await g.set({ hh: 10, hasPhone: true, phoneBattery: 30, _phoneOrigin: "own" });
await g.teleport(S_RAMP);
await g.waitChoices();
ok((await g.text()).includes("手机电量还剩 30%"), "坡道：手机玩家看到电量 30%");
cs = await g.choices();
ok(cs.includes("借着手机微光，下到车库深处"), "坡道：手机玩家出现“借着手机微光”选项");
ok(!cs.includes("借着光，下到车库深处"), "坡道：不出现手电文案选项");

await g.click("借着手机微光，下到车库深处");
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });
await g.waitChoices(20000);
st = await g.state();
ok(st.phoneBattery === 25, "深处入口扣 5% 电（30→" + st.phoneBattery + "）");
cls = await areaClasses(g);
ok(cls.includes("dark-searching") && cls.includes("dark-phone"), "深处：dark-phone 档激活（光圈+压暗遮罩）");
ok(!cls.includes("dark-fire"), "深处：不带 dark-fire");

await dwell(g, 0.492, 0.598, 2800);                     // 手机小光圈（10%）居中照射仍可达
ok((await g.state())._rjLitElevator === true, "手机微光也能照亮路标（机制可用，难度靠视觉）");

// 电量耗尽 → 坡道拒绝深入
await g.teleport(S_RAMP);
await g.set({ phoneBattery: 0 });
ok((await g.text()).includes("电量见底"), "电量归零：坡道提示“电量见底”");
cs = await g.choices();
ok(!cs.some((t) => t.includes("下到车库深处")), "电量归零：深入选项消失");

// ============ D. 无光线 ============
console.log("\n=== D. 无光线 ===");
await g.set({ hasPhone: false });
ok((await g.text()).includes("只有黑"), "没手机：坡道提示“只有黑”");
cs = await g.choices();
ok(cs.length === 1 && cs[0] === "去浦锦路", "没手机：只剩去浦锦路");

// 后勤通道反进车库深处：无光 → 什么都做不了，光锥不激活
await g.teleport(S_CORR);
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });   // 后勤通道文本长（~15s 打字机）
await g.waitChoices(25000);
await g.click("去地下停车场");
await g.page.evaluate(() => { try { stopTyping(); } catch (e) {} });
await g.waitChoices(20000);
ok(await g.scene() === S_DEEP, "无光从后勤通道进入深处");
ok((await g.text()).includes("化不开的黑"), "无光分支：四面是化不开的黑");
cs = await g.choices();
ok(cs.length === 1 && cs[0] === "退回坡道", "无光：只有退回坡道");
cls = await areaClasses(g);
ok(!cls.includes("dark-searching"), "无光：光锥不激活");
await g.click("退回坡道");
ok(await g.scene() === S_RAMP, "无光也能原路退回坡道（离开选项常驻）");

// ============ 收尾 ============
console.log("\n==== 汇总：" + pass + " 通过 / " + fail + " 失败 ====");
console.log(await g.reportText());
await g.close();
if (fail > 0) process.exitCode = 1;
