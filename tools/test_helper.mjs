// E2E 测试公共底座（story-testing skill 的 L4 层核心）
//
// 设计原则：无截图——一切断言走语义通道（DOM 文本 / gameState / 网络404 / console）。
// 现场脚本用法：
//   import { launchGame } from "./test_helper.mjs";
//   const g = await launchGame();
//   await g.click("查看客厅");          // 按文字选按钮（免疫 Fisher-Yates 乱序）
//   await g.teleport("新达汇-1F中庭");   // 传送（默认 skipOnEnter，不触发副作用）
//   console.log(await g.reportText());  // console错误/页面异常/资源404 汇总
//   await g.close();
//
// 引擎挂点（engine.js 全局，page.evaluate 可直接访问）：
//   currentScene / gameState / renderScene(id, skipOnEnter) / stopTyping() / clearQTE()
//   遥测：localStorage["stamina_telemetry_v1"]（体力变动带来源文件:行号）
//
// 已知坑（校准记录，SKILL.md 有完整清单）：
//   - 打字机逐字显示：text() 会先 stopTyping() 跳到全显
//   - 分段文本（text 数组）：前段播完即清空，text() 只返回最后一段
//   - QTE 场景传送进去倒计时立刻开始，慢了会被 timeoutScene 跳走（也是测法）
//   - gameState 里的 Set 经 evaluate 序列化会变 {}，state() 已用 __set 展开处理

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const DEFAULT_PORT = 8630;

// ---------- 内置静态服务器（零依赖，替代 http-server） ----------
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
};

let _server = null; // 单例：同进程多次 launchGame 复用

export async function startServer(port = DEFAULT_PORT) {
  if (_server) return { port: _server.port, url: _server.url, close() {} }; // 已有实例
  for (let p = port; p < port + 5; p++) {
    // 端口被占时先探测（带超时：孤儿服务器会 accept 但不响应，fetch 必须能跑完）
    const probe = await fetch(`http://127.0.0.1:${p}/index.html`, { signal: AbortSignal.timeout(2000) })
      .then((r) => (r.ok ? r.text() : null)).catch(() => null);
    if (probe && probe.includes("尸潮笔记")) return { port: p, url: `http://127.0.0.1:${p}/`, close() {} };

    const ok = await new Promise((resolve) => {
      const srv = http.createServer((req, res) => {
        try {
          const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
          let fp = path.join(ROOT, u === "/" ? "index.html" : u);
          if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
          fs.readFile(fp, (err, data) => {
            if (err) { res.writeHead(404); res.end("404 " + u); return; }
            res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream" });
            res.end(data);
          });
        } catch (e) { res.writeHead(500); res.end(String(e)); }
      });
      srv.on("error", () => resolve(null));
      srv.listen(p, "127.0.0.1", () => resolve(srv));
    });
    if (ok) {
      _server = { srv: ok, port: p, url: `http://127.0.0.1:${p}/` };
      process.on("exit", () => ok.close());
      return { port: p, url: _server.url, close: () => { ok.close(); _server = null; } };
    }
  }
  throw new Error(`端口 ${port}~${port + 4} 均不可用`);
}

// ---------- Game 类 ----------
export async function launchGame(opts = {}) {
  const { port = DEFAULT_PORT, headless = true, viewport = { width: 1280, height: 800 } } = opts;
  const srv = await startServer(port);

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless });
  } catch (e) {
    // 无系统 Chrome 时退回 playwright 自带 chromium（未装会报错并给出安装提示）
    try { browser = await chromium.launch({ headless }); }
    catch (e2) { throw new Error(`浏览器启动失败（试过 channel:chrome 和自带 chromium）。\nchrome: ${e.message}\nbundled: ${e2.message}\n可运行 npx playwright-core install chromium 修复`); }
  }
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  // ---- 采集：console错误 / 页面异常 / 资源404 / 请求失败 ----
  const art = { consoleErrors: [], consoleWarnings: [], pageErrors: [], assetFailures: [] };
  page.on("console", (m) => {
    if (m.type() === "error") art.consoleErrors.push(m.text());
    else if (m.type() === "warning") art.consoleWarnings.push(m.text());
  });
  page.on("pageerror", (e) => art.pageErrors.push(String(e)));
  page.on("response", (r) => { if (r.status() >= 400) art.assetFailures.push(`${r.status()} ${r.url().replace(srv.url, "")}`); });
  page.on("requestfailed", (r) => art.assetFailures.push(`FAIL ${r.url().replace(srv.url, "")} ${r.failure()?.errorText || ""}`));

  await page.goto(srv.url + "index.html");
  await page.waitForFunction(() => {
    const o = document.getElementById("preload-overlay");
    return !o || o.style.display === "none" || getComputedStyle(o).display === "none";
  }, null, { timeout: 60000 }).catch(() => { throw new Error("预加载遮罩 60s 未消失（图片预加载卡住？）"); });

  return new Game(page, browser, srv, art);
}

class Game {
  constructor(page, browser, srv, art) { this.page = page; this.browser = browser; this.srv = srv; this.art = art; }

  /** 当前场景 ID（engine 全局 currentScene） */
  scene() { return this.page.evaluate(() => currentScene); }

  /** gameState 快照（Set → {__set:[...]}，避免序列化丢数据） */
  state() {
    return this.page.evaluate(() =>
      JSON.parse(JSON.stringify(gameState, (k, v) => (v instanceof Set ? { __set: [...v] } : v))));
  }

  /** 剧情全文（先 stopTyping 跳过打字机；分段文本只返回最后一段） */
  async text() {
    await this.page.evaluate(() => { try { stopTyping(); } catch (e) {} });
    return this.page.evaluate(() => document.getElementById("scene-text").innerText);
  }

  /** 当前可选文字列表（普通按钮 + 输入框选项的 label） */
  choices() {
    return this.page.evaluate(() => [
      ...[...document.querySelectorAll("#choices-area .choice-btn")].map((b) => b.textContent.trim()),
      ...[...document.querySelectorAll("#choices-area .choice-input-label")].map((l) => l.textContent.trim()),
    ]);
  }

  /** 等选项出现（打字机/分段文本播完的标志）。结局节点会超时——传 expect=false 跳过 */
  waitChoices(timeout = 15000) {
    return this.page.waitForSelector("#choices-area .choice-btn, #choices-area .choice-input-container",
      { timeout }).then(() => true).catch(() => false);
  }

  /**
   * 按文字点选项（引擎乱序免疫：精确匹配优先，其次包含匹配）。
   * 点完等 currentScene 变化（同场景重渲染也会正常返回）。返回新场景 ID。
   */
  async click(text) {
    const before = await this.scene();
    await this.page.evaluate((t) => {
      const bs = [...document.querySelectorAll("#choices-area .choice-btn")];
      const exact = bs.filter((b) => b.textContent.trim() === t);
      const hit = (exact.length ? exact : bs.filter((b) => b.textContent.includes(t)))[0];
      if (!hit) throw new Error(`选项未找到: "${t}" / 可用: ${bs.map((b) => b.textContent.trim()).join(" | ")}`);
      hit.click();
    }, text);
    await this.page.waitForFunction((b) => currentScene !== b, before, { timeout: 10000 }).catch(() => {});
    return this.scene();
  }

  /** 输入框选项：填值并点确认（对错判定由目标场景的 condition 负责） */
  async fillInput(value) {
    await this.page.fill("#choices-area .choice-input-field", value);
    await this.page.click("#choices-area .choice-input-submit");
    await this.page.waitForTimeout(300);
    return this.scene();
  }

  /**
   * 传送到任意场景。skipOnEnter=true（默认）不跑 onEnter 副作用，适合看渲染/结构；
   * 测剧情流（时间推进/物品入手）用 skipOnEnter:false。
   * 引擎约定：renderScene 不改 currentScene，调用方要先赋值再渲染（同选项点击处理器的写法）。
   */
  async teleport(sceneId, { skipOnEnter = true } = {}) {
    await this.page.evaluate(([id, sk]) => {
      try { stopTyping(); } catch (e) {}
      try { clearQTE(); } catch (e) {}
      currentScene = parseRedirectTarget(id, gameState);
      renderScene(currentScene, sk);
    }, [sceneId, skipOnEnter]);
    const landed = await this.page.waitForFunction((id) => currentScene === id, sceneId, { timeout: 5000 })
      .then(() => true).catch(() => false);
    if (!landed) throw new Error(`传送后 currentScene ≠ "${sceneId}"（场景ID不存在？当前: ${await this.scene()}）`);
    return sceneId;
  }

  /** 直接改 gameState；reapply=true 时重渲染当前场景以重算 computed/特效（不跑 onEnter） */
  async set(patch, { reapply = true } = {}) {
    await this.page.evaluate((p) => Object.assign(gameState, p), patch);
    if (reapply) await this.page.evaluate(() => renderScene(currentScene, true));
  }

  /** 控时（躲"天黑强制过夜"拦截：测试长走查前先拨回白天） */
  time({ dd, hh, mm } = {}) { return this.set(Object.fromEntries(Object.entries({ dd, hh, mm }).filter(([, v]) => v !== undefined))); }

  /** 点"重新开始"清档开新局 */
  async restart() {
    await this.page.click("#restart-btn");
    await this.page.waitForTimeout(500);
    return this.scene();
  }

  /** 屏幕特效激活的 class（暗角/雨/丧尸遮罩——语义级特效断言，不用截图） */
  screenEffects() { return this.page.evaluate(() => document.getElementById("screen-effect-overlay").className.trim()); }

  /** 🔍 角标是否可见（imageZoom 标记是否生效；display:none 不进 a11y 树的原理同） */
  zoomBadgeVisible() { return this.page.evaluate(() => document.getElementById("zoom-badge").style.display !== "none"); }

  /** 体力遥测日志（体力每次变动的 from/to/来源文件:行号）。读内存 __staminaLog——localStorage 每 25 条才镜像一次，是滞后的 */
  telemetry() {
    return this.page.evaluate(() => {
      try { return typeof __staminaLog !== "undefined" ? __staminaLog.slice() : []; }
      catch (e) { return []; }
    });
  }

  /** 文本汇总：console错误 / 页面异常 / 资源失败（favicon 噪音已滤除，URL解码可读）。测试末尾必打 */
  reportText() {
    const dedupe = (a) => [...new Set(a)];
    const dec = (u) => { try { return decodeURIComponent(u); } catch (e) { return u; } };
    const f = this.art.assetFailures.filter((u) => !u.includes("favicon")).map(dec);
    let out = "";
    const sec = (title, arr, cap = 20) => {
      out += `\n[${title}: ${dedupe(arr).length}]\n`;
      dedupe(arr).slice(0, cap).forEach((x) => (out += "  " + x.slice(0, 200) + "\n"));
    };
    sec("Console错误", this.art.consoleErrors.filter((t) => !t.includes("favicon")));
    sec("页面异常", this.art.pageErrors);
    sec("资源失败", f);
    if (!this.art.consoleErrors.length && !this.art.pageErrors.length && !f.length) out += "\n[全部干净 ✔]\n";
    return out;
  }

  /** 人工验收模式：保持浏览器打开（headed 启动 + 本方法 = 给人看的现场，Ctrl+C 结束） */
  async keepOpen() { console.log("(浏览器保持打开，Ctrl+C 结束)"); await new Promise(() => {}); }

  async close() { await this.browser.close(); if (_server) { _server.srv.close(); _server = null; } }
}
