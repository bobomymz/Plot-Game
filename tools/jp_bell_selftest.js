// 建平·校园自动打铃自检（jpBellNote）
// 覆盖：课表时刻映射 / 15 分钟窗口 / 同铃去重 / 周末静默 / 周五 14:45 放学截断 /
//       区域门控 / 地下车库与闪色场景排除 / 躲藏点也听得见。
// 课表数据源 story/建平中学.js 的 JP_BELLS；改课表（或改课程表图片）后跑一次。
//
//   node tools/jp_bell_selftest.js
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = process.cwd();
const FILES = require("./story_files").list();

const sandbox = {
  console, Math, JSON, Object, Array, Set, Map, String, Number, Boolean, Date,
  isNaN, parseInt, parseFloat, RegExp, Error, Function,
  flashStatusWarning: function () {}, flashStatus: function () {},
  showToast: function () {}, notify: function () {}, triggerShake: function () {}
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (fs.existsSync(abs)) {
    try { vm.runInContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: f }); }
    catch (e) { console.log("执行失败", f, e.message); }
  }
}
const storyData = vm.runInContext("storyData", sandbox);
const jpBellNote = vm.runInContext("jpBellNote", sandbox);

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name + (extra ? "  → " + extra : "")); }
}
function st(dd, hh, mm, area, key, heard) {
  return {
    dd: dd, hh: hh, mm: mm,
    currentArea: area === undefined ? "建平中学" : area,
    _lastBellKey: key || "", _bellFirstHeard: !!heard
  };
}
const ring = (dd, hh, mm) => jpBellNote(st(dd, hh, mm));

console.log("=== 建平·校园打铃自检 ===");

// —— 课表时刻映射（dd1 = 2026/6/29 = 周一）——
ok("周一 7:20 早读铃", /早读开始/.test(ring(1, 7, 20)));
ok("周一 8:00 上课铃（致爱丽丝）", /《致爱丽丝》/.test(ring(1, 8, 0)));
ok("周一 8:40 出操（运动员进行曲）", /运动员进行曲/.test(ring(1, 8, 40)));
ok("周一 9:40 下课铃", /下课铃/.test(ring(1, 9, 40)));
ok("周一 11:20 午休铃", /上午结束/.test(ring(1, 11, 20)));
ok("周一 13:15 下午第一节上课", /《致爱丽丝》/.test(ring(1, 13, 15)));
ok("周二 17:15 放学铃", /放学/.test(ring(2, 17, 15)));

// —— 15 分钟窗口：铃后 20 分钟到，不该补响 ——
ok("8:20（铃后 20 分钟）不响", ring(1, 8, 20) === "");
ok("13:05（上课前十分钟）不响", ring(1, 13, 5) === "");

// —— 周五 14:45 放学，之后的课不排 ——
ok("周五 14:45 放学铃", /放学/.test(ring(5, 14, 45)));
ok("周五 15:35（放学后）不响", ring(5, 15, 35) === "");
ok("周四 15:35 仍有下课铃（周一~四全天课）", /下课铃/.test(ring(4, 15, 35)));

// —— 周末静默 ——
ok("周六（dd6）全天不响", ring(6, 8, 0) === "" && ring(6, 13, 15) === "");
ok("周日（dd7）全天不响", ring(7, 8, 0) === "" && ring(7, 17, 15) === "");

// —— 同铃去重 + 首次旁白 ——
{
  const s = st(1, 8, 0);
  const first = jpBellNote(s);
  ok("首次响铃追加「没人关掉它」", /没人来关掉它/.test(first));
  const second = jpBellNote(s);
  ok("同一铃第二次进入不复读", second === "", second);
  ok("台账跨天不串味（dd1-3 已记 → 换 dd2 仍可响）", jpBellNote(st(2, 8, 0)) !== "");
}

// —— 区域门控 ——
ok("不在建平区域不响", jpBellNote(st(1, 8, 0, "复旦")) === "");

// —— 排除：地下车库（铁门+地下）、走廊闪色战斗 ——
{
  const at = { dd: 1, hh: 8, mm: 0, currentArea: "建平中学", _lastBellKey: "", _bellFirstHeard: false, _visit: {}, chasedByZombies: 0, weather: "晴" };
  const garage = storyData["建平-地下车库"];
  const front = storyData["建平-前门"];
  const corridor = storyData["建平-挹芬楼-1F-西侧走廊"];
  ok("地下车库听不到铃声", garage && !/致爱丽丝|早读|下课/.test(garage.text(at) || ""));
  ok("前门闪色战斗场景不插铃声", front && !/致爱丽丝|早读|下课/.test(front.text(at) || ""));
  ok("挹芬楼 1F 西侧走廊闪色场景不插铃声", corridor && !/致爱丽丝|早读|下课/.test(corridor.text(at) || ""));
}

// —— 躲藏点也听得见（这套系统最值钱的一笔）——
{
  const at = { dd: 1, hh: 8, mm: 0, currentArea: "建平中学", _lastBellKey: "", _bellFirstHeard: false, _hideFail: false, _visit: {}, chasedByZombies: 0, weather: "晴" };
  const hide = storyData["建平-躲藏-14班"];
  ok("躲藏点（14班）听得到上课铃", hide && /《致爱丽丝》/.test(hide.text(at) || ""));
}

// —— 普通地点节点自动挂铃（包装器生效）——
{
  const at = { dd: 1, hh: 9, mm: 45, currentArea: "建平中学", _lastBellKey: "", _bellFirstHeard: false, _visit: {}, chasedByZombies: 0, weather: "晴" };
  const plaza = storyData["建平-金苹果广场"];
  ok("金苹果广场自动挂下课铃", plaza && /下课铃/.test(plaza.text(at) || ""));
}

console.log("\n结果：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail ? 1 : 0);
