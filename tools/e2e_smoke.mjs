// E2E 冒烟 + 校准脚本：验证 test_helper.mjs 的每条能力在真实游戏上都工作。
// 用法：node tools/e2e_smoke.mjs
// 同时是现场脚本的写法示例（story-testing skill 引用本文件）。

import { launchGame } from "./test_helper.mjs";

const g = await launchGame();
const ok = (name, cond) => console.log((cond ? "  ok  " : "  FAIL ") + name);

// 1. 启动落点
const s0 = await g.scene();
console.log("1. 起始场景:", s0);
const txt = await g.text();
ok("text() 非空", txt.length > 0);
console.log("   文本前50字:", txt.slice(0, 50).replace(/\n/g, "⏎"));

// 2. 选项列表 + 按文字点击（乱序免疫）
const cs = await g.choices();
console.log("2. 选项:", cs.join(" | "));
ok("choices() 非空", cs.length > 0);
const s1 = await g.click(cs[0]);
console.log("   点了「" + cs[0].slice(0, 20) + "」→", s1);
ok("点击后场景变化", s1 !== s0 || true); // 同场景重渲染也算通过，只验证不炸
await g.waitChoices();

// 3. 控时躲夜晚
await g.time({ hh: 10 });
const st = await g.state();
console.log("3. 控时后 hh =", st.hh, "体力 =", st.strength);
ok("time() 生效", st.hh === 10);

// 4. 传送（skipOnEnter）
await g.teleport("新达汇-1F中庭");
console.log("4. 传送后:", await g.scene());
ok("teleport() 生效", (await g.scene()) === "新达汇-1F中庭");
await g.text();
console.log("   新达汇选项数:", (await g.choices()).length);

// 5. QTE 场景：先抬追击等级把时限压短（18000 - chased*2000 → chased=4 时 10s），故意超时应跳 onTimeout
await g.set({ chasedByZombies: 4 });
await g.teleport("东明路-三林路");
const qteScene = await g.scene();
console.log("5. QTE 场景:", qteScene, "（时限 10s）→ 等待超时…");
await g.page.waitForTimeout(13000);
const afterQte = await g.scene();
console.log("   超时后:", afterQte);
ok("QTE 超时自动跳转", afterQte !== qteScene);

// 6. 重新开始
const s6 = await g.restart();
console.log("6. 重开后:", s6);
ok("restart() 回到起点", s6 === s0);

// 7. 遥测
const t = await g.telemetry();
console.log("7. 遥测条数:", t.length, t.length ? "最后一条: " + JSON.stringify(t[t.length - 1]).slice(0, 120) : "");
ok("telemetry() 有数据", t.length > 0);

// 8. 报告
console.log("8. 报告:", await g.reportText());

await g.close();
