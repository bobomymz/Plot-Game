#!/usr/bin/env node
// -*- coding: utf-8 -*-
// 体力遥测自测：从 engine.js 抽取"体力遥测"段，在 Node 里用浏览器环境桩跑冒烟测试。
// 用途：改过 engine.js 遥测段或三处 __wrapState 调用点后，跑一次确认记录逻辑没坏。
// 用法：node tools/stamina_telemetry_selftest.js
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "engine.js"), "utf8");

const MARK = "// ====== 体力遥测";
const idx = src.indexOf(MARK);
if (idx < 0) { console.error("FAIL: engine.js 未找到遥测段"); process.exit(1); }
const block = src.slice(idx);

// --- 浏览器环境桩 ---
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
global.window = { addEventListener() {} };
global.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL() {} };
global.Blob = class { constructor(parts) { this.text = parts.join(""); } };
global.currentScene = "测试场景";
global.gameState = null;

// --- 载入遥测段 ---
(0, eval)(block);   // 间接 eval：函数/变量落在全局，便于下面调用

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ok  " + name); }
  else { fail++; console.error("  FAIL " + name); }
}

// 1. 包裹 → session 事件
const state = { strength: 7, dd: 1, hh: 8, mm: 0, hasCold: false, hurtByZombie: false,
                chasedByZombies: 0, _travelMinutes: 0, weather: "晴" };
global.gameState = __wrapState(state, "new");
check("session 事件已记录", __staminaLog.some(e => e.type === "session" && e.tag === "new"));

// 2. 剧情式直接写入 → delta -1，来源不是 "?"
global.gameState.strength = 6;
let last = __staminaLog[__staminaLog.length - 1];
check("写入被记录 delta=-1", last && last.type === "delta" && last.d === -1 && last.from === 7 && last.to === 6);
check("来源归因到具体文件:行号", last && typeof last.src === "string" && /:\d+$/.test(last.src) && last.src !== "?");

// 3. 同值写不记录；非 strength 不记录
const n0 = __staminaLog.length;
global.gameState.strength = 6;
global.gameState.dd = 2;
check("同值写/无关字段不产生记录", __staminaLog.length === n0);

// 4. Math.min 型恢复 + 状态标记
global.gameState.strength = Math.min(10, global.gameState.strength + 3);
last = __staminaLog[__staminaLog.length - 1];
check("恢复 +3 被记录", last && last.d === 3 && last.to === 9);

// 5. 事件入口（restBlocked）
window.__staminaEvent("restBlocked", { strength: 6, cap: 6 });
last = __staminaLog[__staminaLog.length - 1];
check("restBlocked 事件带场景与时间", last && last.type === "restBlocked" && last.cap === 6 && last.scene === "测试场景" && last.dd === 2);

// 6. 防重复包裹
const before = __staminaLog.length;
const again = __wrapState(global.gameState, "again");
check("重复包裹返回同一代理", again === global.gameState);
check("重复包裹不产生新 session", __staminaLog.length === before);

// 7. localStorage 镜像
__staminaMirror();
const mirrored = JSON.parse(store[global.STAMINA_LOG_KEY]);
check("镜像落库且与内存一致", Array.isArray(mirrored) && mirrored.length === __staminaLog.length);

console.log("\n结果：%d 通过 / %d 失败", pass, fail);
process.exit(fail ? 1 : 0);
