#!/usr/bin/env node
// -*- coding: utf-8 -*-
/**
 * stamina_src_attribution_probe.js —— 体力遥测「来源行号」归因探针
 *
 * 解决什么问题：
 *   遥测靠 new Error().stack 归因写入点到「文件:行号」，但 V8 报告的帧可能是
 *   「赋值行」/「函数定义行」/「调用方行」三者之一，肉眼核对极易误判。
 *   本脚本用**真实源码**（story/utils.js + story/core.js + engine.js 遥测段）
 *   跑一遍规则触发，把三者并列打印，一次性确认归因语义。
 *
 * 用法：node tools/stamina_src_attribution_probe.js
 *   期望输出每个待核查点：定义行 / 赋值行 / 遥测上报 src，并给出判定。
 *
 * 何时需要跑：
 *   - 有人质疑某条 telemetry src 行号对不上
 *   - 升级了 Node/浏览器内核后确认栈帧行为没变
 *   - 改写了 core.js 的规则写法（对象式 ↔ 函数式）
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const CORE_PATH = path.join(ROOT, "story", "core.js");
const ENGINE_PATH = path.join(ROOT, "engine.js");

// ---------- 1. Node 侧：静态定位「定义行 / 赋值行」 ----------
const coreLines = fs.readFileSync(CORE_PATH, "utf8").split("\n");

function findLine(re, from) {
  for (let i = from || 0; i < coreLines.length; i++) {
    if (re.test(coreLines[i])) return i + 1;
  }
  return null;
}

// 从 rule id 出发，向下扫描到规则块结束，找出真正的 strength 赋值行
function scanRuleAssignment(idLine) {
  const start = idLine - 1;                        // 0-based
  for (let i = start; i < start + 40; i++) {
    const L = coreLines[i];
    if (L === undefined) break;
    // 赋值形态： xxx.strength = ... / xxx.strength -= ...
    if (/\.strength\s*(=[^=]|-=|\+=)/.test(L)) return i + 1;
    // 对象式 effect.add
    if (/add:\s*\{[^}]*strength:/.test(L)) return i + 1;
  }
  return null;
}

// ---------- 2. 沙箱：真实加载遥测段 + 剧情文件 ----------
const store = {};
const sandbox = {
  console, Math, JSON, Object, Array, String, Number, Boolean,
  parseInt, parseFloat, isNaN, Set, Map, WeakSet, Date, RegExp, Error,
  Function, Proxy, Reflect, Symbol, Promise,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  currentScene: "PROBE",
  gameState: null
};
["flashStatusWarning", "flashStatus", "showToast", "notify", "triggerShake", "fmtStrength"].forEach(
  (n) => (sandbox[n] = function () { return ""; })
);
sandbox.window = sandbox;
sandbox.addEventListener = function () {};        // engine.js 末尾 window.addEventListener("beforeunload", ...)
sandbox.globalThis = sandbox;
sandbox.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
sandbox.URL = { createObjectURL: () => "blob:x", revokeObjectURL() {} };
sandbox.Blob = class { constructor(parts) { this.text = parts.join(""); } };
vm.createContext(sandbox);

const engineSrc = fs.readFileSync(ENGINE_PATH, "utf8");
const MARK = "// ====== 体力遥测";
const mi = engineSrc.indexOf(MARK);
if (mi < 0) { console.error("FAIL: engine.js 未找到遥测段标记 " + MARK); process.exit(1); }
vm.runInContext(engineSrc.slice(mi), sandbox, { filename: "engine.js" });
vm.runInContext(fs.readFileSync(path.join(ROOT, "story", "utils.js"), "utf8"), sandbox, { filename: "story/utils.js" });
vm.runInContext(fs.readFileSync(CORE_PATH, "utf8"), sandbox, { filename: "story/core.js" });

// ---------- 3. 复刻 engine.applyReactive 的对象式应用（单独文件 → 归因到 __fake_engine.js） ----------
const FAKE_ENGINE = `
function applyRuleEffect(rule, gs) {
  let result;
  if (typeof rule.effect === 'function') {
    result = rule.effect(gs);            // 第 4 行：函数式调用点
  } else if (rule.effect) {
    if (rule.effect.set) { for (const k in rule.effect.set) gs[k] = rule.effect.set[k]; }
    if (rule.effect.add) {
      for (const k in rule.effect.add) {
        if (gs[k] === undefined) gs[k] = rule.effect.add[k];
        else gs[k] += rule.effect.add[k];   // 第 11 行：对象式应用点
      }
    }
  }
  return result;
}
function callSceneOnEnter(sceneId, gs) { return storyData[sceneId].onEnter(gs); }  // 第 15 行
`;
vm.runInContext(FAKE_ENGINE, sandbox, { filename: "__fake_engine.js" });

// ---------- 4. 逐个触发并取回遥测上报的 src ----------
const probe = `
(function probeuti() {
  // 用 _variables 默认值构造 state
  const defs = storyData._variables;
  const state = {};
  for (const k in defs) { const v = defs[k]; if (typeof v !== 'function') state[k] = v; }
  return { defs: defs, state: state };
})()
`;
const mkState = () => vm.runInContext(probe, sandbox);

function triggerAndGetSrc(setup, label) {
  const code = `
  (function () {
    var __mk = ${probe};
    var st = __mk.state;
    gameState = __wrapState(st, "probe");
    __staminaLog = [];
    ${setup}
    var delta = __staminaLog.filter(function (e) { return e.type === 'delta'; });
    return { srcs: delta.map(function (e) { return e.src + ' (d=' + e.d + ')'; }), n: delta.length };
  })()
  `;
  return vm.runInContext(code, sandbox, { filename: "__probe_run.js" });
}

// ---------- 5. 待核查清单：真实带宽数据里出现的 core.js 行号 ----------
const rules = vm.runInContext("storyData._reactive.rules", sandbox);
const ruleIds = rules.map((r) => r.id);

console.log("=== core.js 响应式规则清单 ===");
console.log("共 " + ruleIds.length + " 条：" + ruleIds.join(", "));
console.log("");

console.log("=== 归因对照（定义行 / 静态赋值行 / 遥测上报 src）===");
console.log("");

function probeRule(id, extraState) {
  const idLine = findLine(new RegExp('id:\\s*"' + id + '"'));
  if (!idLine) { console.log("  " + id + "：源码未找到 rule id"); return null; }
  const defLine = findLine(/effect:\s*(function|\{)/, idLine - 1);
  const assignLine = scanRuleAssignment(idLine);
  const extra = extraState
    ? "Object.assign(gameState, " + JSON.stringify(extraState) + ");"
    : "";
  const out = triggerAndGetSrc(
    extra + " applyRuleEffect(storyData._reactive.rules.filter(function(r){return r.id===" +
    JSON.stringify(id) + "})[0], gameState);"
  );
  return { id, idLine, defLine, assignLine, reported: out.srcs.length ? out.srcs.join(" | ") : "（无 delta）" };
}

const rows = [];
const cases = [
  ["starvation", null],
  ["travel-fatigue", { _travelMinutes: 60, _fatiguePaid: 0, travel: 0 }],
  ["travel-fatigue", { _travelMinutes: 20, _fatiguePaid: 0 }]
];
for (const [id, extra] of cases) {
  const r = probeRule(id, extra);
  if (r) rows.push(r);
}

// ---------- 6. 场景 onEnter（对象式 add） ----------
const sceneCases = [
  ["整理整理-吃食堂干粮", null],
  ["整理整理-喝水", { bottleWater: 1 }]
];
for (const [sceneId, extra] of sceneCases) {
  const keyLine = findLine(new RegExp('"' + sceneId.replace(/[-]/g, "\\-") + '"\\s*:\\s*\\{'));
  let assignLine = null;
  if (keyLine) {
    for (let i = keyLine - 1; i < keyLine + 12; i++) {
      if (coreLines[i] && /strength\s*:/.test(coreLines[i])) { assignLine = i + 1; break; }
    }
  }
  const extraStr = extra ? "Object.assign(gameState, " + JSON.stringify(extra) + ");" : "";
  let reported = "（该场景不存在）";
  if (keyLine) {
    // 构造场景所需的变量：把 _variables 默认值铺好之外，还需 itemCount 之类
    const hasScene = vm.runInContext(
      "typeof storyData[" + JSON.stringify(sceneId) + "] !== 'undefined'", sandbox);
    if (hasScene) {
      const out = triggerAndGetSrc(
        extraStr + " try { callSceneOnEnter(" + JSON.stringify(sceneId) + ", gameState); } catch (e) { return 'ERR ' + e.message; }"
      );
      reported = Array.isArray(out.srcs) && out.srcs.length ? out.srcs.join(" | ") : "（无 delta）";
    }
  }
  rows.push({ id: "scene:" + sceneId, idLine: keyLine, defLine: keyLine, assignLine, reported });
}

const pad = (s, n) => String(s === null || s === undefined ? "—" : s) + " ".repeat(Math.max(0, n - String(s).length));
console.log(pad("规则/场景", 30) + pad("rule id行", 10) + pad("effect定义行", 14) + pad("静态赋值行", 12) + "遥测上报 src");
console.log("-".repeat(100));
for (const r of rows) {
  console.log(pad(r.id, 30) + pad(r.idLine, 10) + pad(r.defLine, 14) + pad(r.assignLine, 12) + r.reported);
}

console.log("");
console.log("=== 结论判定 ===");
for (const r of rows) {
  const m = r.reported && r.reported.match(/core\.js:(\d+)/);
  if (!m) {
    console.log("  " + r.id + " → 归因到 " + r.reported + "（非 core.js，即「应用侧」行号）");
  } else {
    const pl = parseInt(m[1], 10);
    const which = pl === r.assignLine ? "赋值行 ✓"
      : pl === r.defLine ? "effect 定义行"
      : pl === r.idLine ? "rule id 行"
      : "都不是（第 " + pl + " 行）";
    console.log("  " + r.id + " → 上报 " + pl + "，判定：" + which);
  }
}
