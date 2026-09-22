// 区域体检三连（area-story-design skill 的配套工具）
//
// 用法：node tools/area_check.mjs [区域]
//   依次跑 lint_story → graph_audit → chain_audit（区域参数透传给三者），输出直接继承显示。
//   末尾汇总各步退出码，任一非零则整体退出非零——迭代循环里"全绿"即三连全过。
//
// 为什么包一层：area-story-design 阶段4 每轮迭代都要跑这三连，一条命令省重复敲的摩擦。
// 各步的判读标准见对应 skill：lint（story-testing）/ graph（geo-optimization）/ chain（puzzle-chain-design）。

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const area = process.argv.slice(2).filter((a) => !a.startsWith("--"))[0] || null;

const steps = [
  ["lint_story.mjs", "① 静态体检（[E] 必须清零）"],
  ["graph_audit.mjs", "② 图结构红线（死链/死胡同/真割点）"],
  ["chain_audit.mjs", "③ 物品经济/预算（≤10、死道具）"],
];

const results = [];
for (const [script, label] of steps) {
  console.log(`\n========== ${label} · node tools/${script}${area ? " " + area : ""} ==========`);
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...(area ? [area] : [])], { stdio: "inherit" });
  if (r.error) {
    console.error(`!! 启动失败 ${script}: ${r.error.message}`);
    results.push([script, 1]);
  } else {
    results.push([script, r.status]);
  }
}

console.log("\n========== 三连汇总 ==========");
let bad = 0;
for (const [script, status] of results) {
  const ok = status === 0;
  if (!ok) bad++;
  console.log(`${ok ? "[ok]" : "[FAIL]"} ${script}${ok ? "" : " 退出码 " + status}`);
}
if (bad) console.log(`\n${bad} 项未过——按上面对应步骤的输出定位。`);
process.exit(bad ? 1 : 0);
