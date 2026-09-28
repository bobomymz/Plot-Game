// E2E 现场：手机横屏侧栏布局（style.css 横屏媒体块 + engine.js 光锥配合改动）
// 验证矩阵：
//   布局  ：竖屏 flex 三段 → 横屏 grid 侧栏（844×390 走高度判据分支 / 667×375 走宽度判据分支）→ 桌面 block 不受影响
//   光锥  ：竖屏触屏进场 toast 提示横屏；旋转后 --lr 收拢 + dwell 暂停 + ✓ 标记重定位；横屏下继续照热点可用
//   互动  ：横屏侧栏内选项可点（玻璃陷阱 elseScene 分支）
// 触屏模拟：darkCoarse 是引擎顶层 let，evaluate 直接置 true——此后光圈中心带 -56 触屏上移
// （DARK_MOBILE_DY），dwell 的 dispatch y 需 +56 补偿，与真机手势一致。
import { launchGame } from "./test_helper.mjs";

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ FAIL: " + msg); } };

const S_DEEP = "仁济南院-地下停车场-深处";
const S_RAMP = "仁济南院-地下停车场";
const S_GLASS = "仁济南院-地下停车场-踩到碎玻璃";

// 停留模拟（同 e2e_rj_darksearch.mjs，另加 darkCoarse 触屏 -56 偏移补偿：
// 引擎把光圈中心放在指针上方 56px，dispatch 在热点下方 56px 才能让光圈正落热点）
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
    const cy = rect.top + offY + y * h * s + 56;   // +56：触屏光圈上移的反向补偿
    area.dispatchEvent(new PointerEvent("pointermove", { clientX: cx, clientY: cy }));
  }, { x, y });
  await g.page.waitForTimeout(ms);
}

// 布局快照：容器 display + 图片/文本/选项的几何（语义断言，不用截图）
const layout = (g) => g.page.evaluate(() => {
  const disp = getComputedStyle(document.getElementById("game-container")).display;
  const r = (id) => { const b = document.getElementById(id).getBoundingClientRect();
    return { l: b.left, t: b.top, w: b.width, h: b.height }; };
  return { disp, ia: r("image-area"), ta: r("text-area"), ca: r("choices-area") };
});

const toastState = (g) => g.page.evaluate(() => {
  const el = document.getElementById("status-warning");
  return el ? { show: el.classList.contains("show"), text: el.textContent } : { show: false, text: "" };
});

const areaClasses = (g) => g.page.evaluate(() =>
  [...document.getElementById("image-area").classList]);

const markerPos = (g) => g.page.evaluate(() =>
  [...document.querySelectorAll("#image-area .dark-found-mark")]
    .map((el) => ({ left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0, text: el.textContent })));

const skipType = (g) => g.page.evaluate(() => { try { if (typingTimer) document.getElementById("scene-text").click(); } catch (e) {} });

const g = await launchGame({ viewport: { width: 390, height: 844 } });   // iPhone 12 竖屏
await g.page.evaluate(() => { darkCoarse = true; });                     // 模拟触屏（引擎顶层 let）

// ============ A. 竖屏基线：flex 三段布局 + 光锥进场提示横屏 ============
console.log("\n=== A. 竖屏基线（390×844）===");
await g.waitChoices(20000);
await g.click("开始游戏");
let lay = await layout(g);
ok(lay.disp === "flex", "竖屏：flex 三段布局");
ok(lay.ia.w > 380 && lay.ia.h > 190 && lay.ia.h < 250,
  "竖屏：图片区 ~390×219（16:9 contain 宽度受限，42dvh 不钳制）");
ok(lay.ta.t >= lay.ia.h - 2, "竖屏：文本在图片下方");

await g.set({ hh: 10, hasTorch: true });
await g.teleport(S_RAMP);
await g.waitChoices();
await g.click("借着光，下到车库深处");
await skipType(g);
ok(await g.waitChoices(20000), "深处：选项出现（打字机完成，darkSearch 已启动）");
ok(await g.scene() === S_DEEP, "到达车库深处");
let cls = await areaClasses(g);
ok(cls.includes("dark-searching"), "深处：光锥激活");

let t = await toastState(g);
ok(t.show && t.text.includes("横屏"), "竖屏+触屏进场：提示横屏 toast（“" + t.text + "”）");

// ============ B. 竖屏照热点（触屏偏移补偿下的可用性） ============
await dwell(g, 0.492, 0.598, 2800);
ok((await g.state())._rjLitElevator === true, "竖屏：照满电梯牌 2 秒 → _rjLitElevator 置真");
const marks0 = await markerPos(g);
ok(marks0.length === 1 && marks0[0].text.includes("门诊电梯"), "竖屏：✓ 标记出现");
const portImg = lay.ia.w * lay.ia.h;

// ============ C. 旋转横屏 844×390（宽 >767 → 高度判据分支） ============
console.log("\n=== C. 旋转横屏（844×390）===");
await g.page.setViewportSize({ width: 844, height: 390 });
await g.page.waitForTimeout(400);
lay = await layout(g);
ok(lay.disp === "grid", "横屏：grid 侧栏布局（844>767，由高度 ≤500 判据兜住）");
ok(lay.ia.w > 490 && lay.ia.h > 370,
  "横屏：图片列 ~506×390 满高（竖屏 " + Math.round(portImg) + "px² → " + Math.round(lay.ia.w * lay.ia.h) + "px²，约 " + (lay.ia.w * lay.ia.h / portImg).toFixed(1) + " 倍）");
ok(lay.ta.l >= lay.ia.l + lay.ia.w - 2, "横屏：文本栏在图片列右侧");
ok(lay.ca.l >= lay.ia.l + lay.ia.w - 2, "横屏：选项栏在图片列右侧");

// ============ D. 旋转后：光圈收拢 + dwell 暂停 + 标记重定位 ============
console.log("\n=== D. 旋转后的光锥状态 ===");
const post = await g.page.evaluate(() => ({
  lr: document.getElementById("image-area").style.getPropertyValue("--lr"),
  active: darkLight.active
}));
ok(post.lr === "0px", "旋转后：--lr 收拢为 0px（无残留错位亮圈）");
ok(post.active === false, "旋转后：dwell 累计暂停（darkLight.active=false）");
const marks1 = await markerPos(g);
ok(marks1.length === 1, "旋转后：✓ 标记仍在（resize 重画）");
ok(Math.abs(marks1[0].left - marks0[0].left) > 5 || Math.abs(marks1[0].top - marks0[0].top) > 5,
  "旋转后：标记按新几何重定位（" + marks0[0].left.toFixed(0) + "," + marks0[0].top.toFixed(0) +
  " → " + marks1[0].left.toFixed(0) + "," + marks1[0].top.toFixed(0) + "）");

// ============ E. 横屏下继续照热点（darkFit 新几何自适应）+ 侧栏选项可点 ============
console.log("\n=== E. 横屏下的光锥与互动 ===");
await dwell(g, 0.861, 0.550, 2800);
ok((await g.state())._rjLitCorridor === true, "横屏：照满标语 2 秒 → _rjLitCorridor 置真");
const ch0 = (await g.state()).chasedByZombies;
await g.click("照着指示牌去门诊电梯");
ok(await g.scene() === S_GLASS, "横屏：点侧栏选项 → 玻璃陷阱（elseScene 分支）");
ok((await g.state()).chasedByZombies === ch0 + 1, "横屏：踩玻璃 ch+1（" + ch0 + "→" + (ch0 + 1) + "）");

// ============ F. 横屏再进深处：不再弹提示（先等旧 toast 超时） ============
console.log("\n=== F. 横屏进场无提示 ===");
await g.page.waitForTimeout(2200);          // 清掉上一条 🔦 toast（2s 自动隐藏）
await g.teleport(S_DEEP);
await skipType(g);
await g.waitChoices(20000);
t = await toastState(g);
ok(!t.show, "横屏+触屏进场：不再提示横屏（orientation 门控生效）");

// ============ G. 667×375（宽 ≤767 → 宽度判据分支，竖屏块同命中、横屏块源序覆盖） ============
console.log("\n=== G. 小机型横屏（667×375）===");
await g.page.setViewportSize({ width: 667, height: 375 });
await g.page.waitForTimeout(400);
lay = await layout(g);
ok(lay.disp === "grid", "横屏：grid 侧栏（竖屏块同命中，横屏块后置覆盖）");
ok(lay.ia.h > 330, "横屏：图片区满高 ~375（竖屏 42dvh=157 钳制被解除）");

// ============ H. 桌面 1280×800：两判据都不命中 → 基础层 ============
console.log("\n=== H. 桌面（1280×800）===");
await g.page.setViewportSize({ width: 1280, height: 800 });
await g.page.waitForTimeout(400);
lay = await layout(g);
ok(lay.disp === "block", "桌面：不受横屏块影响（基础层自然流）");

// ============ 收尾 ============
console.log("\n==== 汇总：" + pass + " 通过 / " + fail + " 失败 ====");
console.log(await g.reportText());
await g.close();
if (fail > 0) process.exitCode = 1;
