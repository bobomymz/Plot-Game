import { launchGame } from "./test_helper.mjs";
const g = await launchGame();
for (const ms of [0, 500, 1500, 3000]) {
  await g.page.waitForTimeout(ms === 0 ? 100 : ms === 500 ? 400 : ms === 1500 ? 1000 : 1500);
  const info = await g.page.evaluate(() => ({
    cs: currentScene,
    btns: [...document.querySelectorAll(".choice-btn")].map(b => b.textContent.trim()),
    area: document.getElementById("choices-area") ? document.getElementById("choices-area").children.length : -1,
    overlay: document.getElementById("preload") ? document.getElementById("preload").style.display : "none"
  }));
  console.log(ms, JSON.stringify(info));
}
await g.close();
