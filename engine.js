// ================= engine.js =================

// --- DOM 元素 ---
const sceneImage  = document.getElementById("scene-image");
const sceneText   = document.getElementById("scene-text");
const choicesArea = document.getElementById("choices-area");
const restartBtn  = document.getElementById("restart-btn");
const backtrackBtn = document.getElementById("backtrack-btn");
const imageArea   = document.getElementById("image-area");
const zoomBadge   = document.getElementById("zoom-badge");
const imageViewer = document.getElementById("image-viewer");
const imageViewerImg = document.getElementById("image-viewer-img");


// --- 游戏运行状态 ---
let currentScene = "start";
let lastRenderedScene = "";   // 上一次成功渲染的场景ID（用于记录 _lastScene）
let gameState = {};
let historyStack = [];   // 回溯历史 [{ sceneId, gameState }]
// ====== QTE 相关 ======
let qteTimer = null;           // QTE 倒计时定时器句柄
let qteRemaining = 0;         // 剩余时间（秒）
let qteInterval = null;       // UI 更新 interval
let _memFlashTimers = [];    // 记忆闪色定时器列表
// ====== 打字机相关 ======
let typingTimer = null;
let typingCallback = null;
let typingFullText = "";
let typingIsHtml = false;      // 标记当前是否 HTML 模式

function stopTyping() {
  clearQTE();   // 终止任何进行中的 QTE
  clearMemoryFlash(); // 终止记忆闪色动画
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
  if (typingCallback) {
    const cb = typingCallback;
    typingCallback = null;
    cb();
  }
  sceneText.classList.remove("typing");
}

function typeText(element, fullText, speed = 80, onComplete) {
  stopTyping();
  typingFullText = fullText;
  element.innerHTML = "";                  // 统一用 innerHTML 清空
  element.classList.add("typing");

  if (!fullText) {
    stopTyping();
    if (onComplete) onComplete();
    return;
  }

  const hasHtml = /<[^>]+>/.test(fullText);
  typingIsHtml = hasHtml;                  // 记下模式，供 skip 使用

  let i = 0;
  let result = "";
  typingCallback = onComplete;

  typingTimer = setInterval(() => {
    if (i < fullText.length) {

      if (hasHtml && fullText[i] === '<') {
        // === HTML 模式：标签作为整体一次性插入 ===
        let j = i;
        while (j < fullText.length && fullText[j] !== '>') j++;
        if (j < fullText.length) {
          result += fullText.substring(i, j + 1);   // 整个 <...> 一起加入
          i = j + 1;
        } else {
          // 畸形标签（没有 >），当普通字符
          result += fullText[i];
          i++;
        }
      } else {
        // === 普通字符：逐字加入 ===
        result += fullText[i];
        i++;
      }

      element.innerHTML = result;           // 关键：用 innerHTML 渲染

    } else {
      // 打字完毕
      clearInterval(typingTimer);
      typingTimer = null;
      element.classList.remove("typing");
      if (typingCallback) {
        const cb = typingCallback;
        typingCallback = null;
        cb();
      }
    }
  }, speed);
}

// ====== 分段文本 ======
const SEGMENT_MS_PER_CHAR = 50;   // 段间停留：每字毫秒数（仿 travelScene 惯例）
const SEGMENT_MIN_PAUSE = 1200;   // 段间停留：最短下限(ms)
let segmentToken = 0;             // 代际令牌：renderScene 顶部递增，旧分段链路全部作废
let segmentActive = false;        // 分段播放中（含段间停留等待）
let segmentAdvance = null;        // 段间停留时点击文本 → 立即进入下一段
let segmentDwellTimer = null;     // 段间停留定时器

function clearSegments() {
  segmentToken++;
  segmentActive = false;
  segmentAdvance = null;
  if (segmentDwellTimer) { clearTimeout(segmentDwellTimer); segmentDwellTimer = null; }
}

// 分段播放：每段走打字机，打完停留 max(SEGMENT_MIN_PAUSE, 去标签字数*SEGMENT_MS_PER_CHAR)，
// 清空后进下一段；最后一段完成后调用 onComplete（即原有 renderChoices+applyMemoryFlash 回调）。
// 全链路用 token 守卫：切场景后（renderScene 顶部 clearSegments 已 token++），
// 旧链的一切回调（打字完成/停留到期）静默作废，不再碰 DOM、不再调度定时器。
function typeSegments(element, segments, speed, onComplete) {
  clearSegments();   // 保险（正常流程 renderScene 顶部已清过）
  const token = segmentToken;
  segmentActive = true;
  let index = 0;

  function playCurrent() {
    if (token !== segmentToken) return;
    const seg = String(segments[index++]);
    const isLast = index >= segments.length;
    typeText(element, seg, speed, function onSegmentDone() {
      if (token !== segmentToken) return;
      if (isLast) {
        segmentActive = false;
        segmentAdvance = null;
        onComplete();
        return;
      }
      const plain = seg.replace(/<[^>]*>/g, "");
      const pause = Math.max(SEGMENT_MIN_PAUSE, plain.length * SEGMENT_MS_PER_CHAR);
      const proceed = function() {
        if (token !== segmentToken) return;
        segmentDwellTimer = null;
        segmentAdvance = null;
        element.innerHTML = "";
        playCurrent();
      };
      segmentDwellTimer = setTimeout(proceed, pause);
      segmentAdvance = function() {   // 停留期点击 → 立即切段
        if (segmentDwellTimer) { clearTimeout(segmentDwellTimer); segmentDwellTimer = null; }
        proceed();
      };
    });
  }
  playCurrent();
}

sceneText.addEventListener("click", () => {
  // 状态1：正在打字 → 停止打字，立即显示全文
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;

    if (typingIsHtml) {
      sceneText.innerHTML = typingFullText;
    } else {
      sceneText.textContent = typingFullText;
    }

    sceneText.classList.remove("typing");
    if (typingCallback) {
      const cb = typingCallback;
      typingCallback = null;
      cb();
    }
    return;
  }

  // 状态1.5：分段播放的段间停留 → 点击立即进入下一段
  if (segmentActive && typeof segmentAdvance === "function") {
    segmentAdvance();
    return;
  }

  // 状态2：打字已完成 → 切换文本展开/收起
  const textArea = document.getElementById("text-area");
  const choicesArea = document.getElementById("choices-area");
  textArea.classList.toggle("text-expanded");
  choicesArea.classList.toggle("text-expanded");
});

// ====== 工具函数 ======
function initGameState() {
  const defaults = (storyData && storyData._variables) || {};
  // 深拷贝：_variables 里含 Set（记忆集合），浅拷贝会让重启后残留上一局的记忆
  gameState = snapshotState(defaults);
  console.log("【引擎】变量已初始化：", gameState);
}

function applyEffect(effect) {
  if (typeof effect === 'function') {
    effect = effect(gameState);
  }
  if (!effect) return;

  if (effect.set) {
    for (let key in effect.set) gameState[key] = effect.set[key];
  }
  if (effect.add) {
    for (let key in effect.add) {
      if (gameState[key] === undefined) gameState[key] = effect.add[key];
      else gameState[key] += effect.add[key];
    }
  }
  if (effect.mul) {
    for (let key in effect.mul) {
      if (gameState[key] === undefined) gameState[key] = effect.mul[key];
      else gameState[key] *= effect.mul[key];
    }
  }

  clampAll();        // 1. 先用 _caps 粗钳
  applyReactive();   // 2. 计算派生变量 + 执行响应规则
  clampAll();        // 3. 规则可能导致越界，再钳一次
}

function clampAll() {
  const caps = storyData._caps;
  if (!caps) return;
  for (const key in caps) {
    const cap = caps[key];
    if (cap.min !== undefined && gameState[key] < cap.min) {
      gameState[key] = cap.min;
    }
    if (cap.max !== undefined && gameState[key] > cap.max) {
      gameState[key] = cap.max;
    }
  }
}

// ====== 场景抖动（一次性动画） ======
function triggerShake() {
  const container = document.getElementById("game-container") || document.body;
  // 如果正在抖动，先强制重置
  container.classList.remove("shake");
  void container.offsetWidth;   // 强制回流，让浏览器重置动画
  container.classList.add("shake");

  // 动画结束后自动清理
  container.addEventListener("animationend", function handler() {
    container.classList.remove("shake");
    container.removeEventListener("animationend", handler);
  });
}

// ====== 屏幕特效系统 ======
function applyScreenEffects() {
  const effects = storyData._screenEffects;
  if (!effects || !effects.length) return;

  // 查找或创建遮罩层（只创建一次）
  let overlay = document.getElementById("screen-effect-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "screen-effect-overlay";
    document.body.appendChild(overlay);
  }

  // 收集所有满足条件的特效类名
  const activeClasses = [];
  for (const effect of effects) {
    if (checkCondition(effect.condition, gameState)) {
      activeClasses.push(effect.className);
    }
  }

  // diff 新旧类名，触发生命周期钩子
  const oldClasses = overlay.className;
  const newClasses = activeClasses.join(' ');
  if (oldClasses !== newClasses) {
    // 两阶段：先全部 onDeactivate、再全部 onActivate。
    // 否则轻度→重度（或反向）切换时，新档 onActivate 设的 --zombie-bg
    // 会被旧档 onDeactivate 的 removeProperty 抹掉（钩子是同一 CSS 变量的写/删）。
    for (const effect of effects) {
      const wasActive = oldClasses.indexOf(effect.className) >= 0;
      const nowActive = newClasses.indexOf(effect.className) >= 0;
      if (wasActive && !nowActive && effect.onDeactivate) {
        effect.onDeactivate(overlay);
      }
    }
    for (const effect of effects) {
      const wasActive = oldClasses.indexOf(effect.className) >= 0;
      const nowActive = newClasses.indexOf(effect.className) >= 0;
      if (!wasActive && nowActive && effect.onActivate) {
        effect.onActivate(overlay);
      }
    }
  }

  // 替换类名
  overlay.className = newClasses;

  // 无特效时完全隐藏，避免空层干扰
  overlay.style.display = activeClasses.length === 0 ? 'none' : '';
}

// ====== 状态警告浮层（体力自动下降等非剧情原因的提示） ======
// 用法：在 reactive 规则的 onTrigger 里调用，如 flashStatusWarning("⚠ 体力 -1（饥饿）")
function flashStatusWarning(message) {
  let toast = document.getElementById("status-warning");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "status-warning";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  // 重启动画：先移除 show 再强制回流，最后重新加入，保证连续触发时动画也能重新播放
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
  // 自动隐藏
  if (toast._hideTimer) clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2000);
}

// ====== 记忆闪色动画 ======
function clearMemoryFlash() {
  _memFlashTimers.forEach(t => clearTimeout(t));
  _memFlashTimers = [];
  const overlay = document.getElementById("screen-effect-overlay");
  if (overlay) {
    overlay.style.background = 'transparent';
    overlay.style.animation = ''; // 恢复 pulse-vignette 等 CSS 动画（闪色期间被禁用，见 applyMemoryFlash）
    // 不再设置 display，交给 applyScreenEffects 统一管理
  }
}

const MEM_FLASH_MS = 600;   // 每色闪烁时长
const MEM_PAUSE_MS = 200;   // 闪烁间隔

// 闪色动画本身要花掉的时长（选项级倒计时与闪色同时启动，故需扣除这段"白给"时间）
function memFlashDuration(vars) {
  if (vars._seqPlayed || !Array.isArray(vars._currentSeq)) return 0;
  return vars._currentSeq.length * (MEM_FLASH_MS + MEM_PAUSE_MS);
}

function applyMemoryFlash(vars) {
  if (!vars._currentSeq || vars._seqPlayed) return false;

  const seq = vars._currentSeq;
  const flashMs = MEM_FLASH_MS;
  const pauseMs = MEM_PAUSE_MS;
  const overlay = document.getElementById("screen-effect-overlay");
  if (!overlay) return false;

  closeImageViewer();   // 闪色播在特效层(z-50)，会被查看器(z-140)盖住；开始播放前自动关闭
  clearMemoryFlash();

  overlay.style.display = 'block';
  overlay.style.transition = 'background 0.05s';
  // 关键：vignette-danger（体力≤1）的 pulse-vignette 动画在 keyframes 里写死 background，
  // CSS 动画优先级高于 inline style，会把闪色的 inline background 压掉导致闪色不可见。
  // 闪色期间禁用 overlay 动画，播完/打断时由下方收尾和 clearMemoryFlash 恢复。
  overlay.style.animation = 'none';

  const colorMap = { '红': 'rgba(255,34,0,0.55)', '蓝': 'rgba(34,102,255,0.55)', '绿': 'rgba(34,204,34,0.55)', '黄': 'rgba(255,204,0,0.55)', '紫': 'rgba(170,68,255,0.55)', '白': 'rgba(255,255,255,0.55)' };

  function flash(index) {
    if (index >= seq.length) {
      overlay.style.background = 'transparent';
      overlay.style.animation = '';  // 恢复暗角脉冲等 CSS 动画（闪色期间被禁用）
      applyScreenEffects();  // 闪色结束后恢复屏幕特效（暗角/雨滴等），不再硬编码 display:none
      vars._seqPlayed = true;
      // 序列不清空：回溯/读档落回本场景时需重播原序列（见 renderScene 的 _seqScene 判定）
      return;
    }
    overlay.style.background = colorMap[seq[index]] || '#ffffff';
    const t1 = setTimeout(() => {
      overlay.style.background = 'transparent';
      const t2 = setTimeout(() => flash(index + 1), pauseMs);
      _memFlashTimers.push(t2);
    }, flashMs);
    _memFlashTimers.push(t1);
  }

  flash(0);
  return true;
}

// ====== 图片查看器（imageZoom 标记场景图点击放大）======
// 门票语义：仅当前场景声明 imageZoom: true 时角标显示、点击可开（角标切换在 renderScene 图片节）。
// 纯 UI 态：不写 gameState、不进存档；换场景（renderScene 开头）与记忆闪色启动时自动关闭。
// 层级：z-140，QTE 条（150）浮在其上——倒计时不暂停，但始终可见（末日不暂停，见 design.md D3）。
const VIEWER_MAX_SCALE = 4;        // 缩放上限（相对 contain-fit 的倍率）
const VIEWER_WHEEL_STEP = 1.15;    // 滚轮每格缩放倍率
const VIEWER_DRAG_THRESHOLD = 5;   // 位移阈值(px)，超过算拖拽、松开不关闭

let viewerOpen = false;
let viewerZoomable = false;        // 当前场景是否带 imageZoom 标记（renderScene 每场景刷新）
let viewerScale = 1;               // 1 = contain 适配屏
let viewerTx = 0, viewerTy = 0;    // 平移量(px)
let viewerPointers = new Map();    // pointerId -> {x, y, downX, downY}
let viewerPinchPrevDist = 0;       // 捏合上一次双指间距（增量式缩放）
let viewerDragMoved = false;

function openImageViewer() {
  if (viewerOpen || !viewerZoomable) return;
  if (!sceneImage.src || sceneImage.style.display === "none") return;
  imageViewerImg.src = sceneImage.src;
  viewerOpen = true;
  viewerScale = 1; viewerTx = 0; viewerTy = 0;
  viewerPointers.clear();
  viewerDragMoved = false;
  imageViewer.style.display = "flex";
  imageViewer.classList.remove("zoomed");
  applyViewerTransform();
}

function closeImageViewer() {
  if (!viewerOpen) return;
  viewerOpen = false;
  viewerPointers.clear();
  imageViewer.style.display = "none";
  imageViewer.classList.remove("zoomed");
}

// 缩放（anchor 为查看器坐标系下的不动点：滚轮光标 / 捏合中点）
function viewerZoomAt(newScale, ax, ay) {
  // 图片尚未排版完成（刚打开、仍在解码）时几何未知，忽略本次手势——
  // 否则按 0 尺寸算出的钳位会把缩放/平移错误归零（通常仅缓存未命中后的第一帧）
  if (imageViewerImg.offsetWidth === 0) return;
  newScale = Math.min(VIEWER_MAX_SCALE, Math.max(1, newScale));
  if (newScale === viewerScale) return;
  const L = imageViewerImg.offsetLeft, T = imageViewerImg.offsetTop;
  // 不动点对应的图片局部坐标（transform-origin 0 0：屏点 = (L,T) + local*scale + (tx,ty)）
  const px = (ax - L - viewerTx) / viewerScale;
  const py = (ay - T - viewerTy) / viewerScale;
  viewerScale = newScale;
  if (viewerScale === 1) {
    viewerTx = 0; viewerTy = 0;    // 回到适配态，由 flexbox 居中
  } else {
    viewerTx = ax - L - px * viewerScale;
    viewerTy = ay - T - py * viewerScale;
    clampViewerPan();
  }
  imageViewer.classList.toggle("zoomed", viewerScale > 1);
  applyViewerTransform();
}

// 平移并钳位：图片边缘不外露背板；不足一屏的维度保持居中
function clampViewerPan() {
  const W = imageViewer.clientWidth, H = imageViewer.clientHeight;
  const L = imageViewerImg.offsetLeft, T = imageViewerImg.offsetTop;
  const w = imageViewerImg.offsetWidth * viewerScale;
  const h = imageViewerImg.offsetHeight * viewerScale;
  if (w <= W) viewerTx = (W - w) / 2 - L;
  else viewerTx = Math.min(-L, Math.max(W - w - L, viewerTx));
  if (h <= H) viewerTy = (H - h) / 2 - T;
  else viewerTy = Math.min(-T, Math.max(H - h - T, viewerTy));
}

function viewerPanBy(dx, dy) {
  if (viewerScale <= 1) return;
  if (imageViewerImg.offsetWidth === 0) return;   // 排版未完成，同 viewerZoomAt
  viewerTx += dx; viewerTy += dy;
  clampViewerPan();
  applyViewerTransform();
}

function applyViewerTransform() {
  imageViewerImg.style.transform =
    "translate(" + viewerTx + "px," + viewerTy + "px) scale(" + viewerScale + ")";
}

// 滚轮缩放（passive:false 才能 preventDefault 阻止页面滚动）
imageViewer.addEventListener("wheel", function (e) {
  if (!viewerOpen) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? VIEWER_WHEEL_STEP : 1 / VIEWER_WHEEL_STEP;
  viewerZoomAt(viewerScale * factor, e.clientX, e.clientY);
}, { passive: false });

// Pointer Events 统一鼠标/触屏：单指拖拽平移、双指捏合缩放、单击关闭
imageViewer.addEventListener("pointerdown", function (e) {
  if (!viewerOpen) return;
  // 捕获失败（如非活动指针）不应中断手势登记——捏合/拖拽比捕获更重要
  try { imageViewer.setPointerCapture(e.pointerId); } catch (err) {}
  viewerPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, downX: e.clientX, downY: e.clientY });
  if (viewerPointers.size === 1) viewerDragMoved = false;
  if (viewerPointers.size === 2) {
    const pts = [...viewerPointers.values()];
    viewerPinchPrevDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }
});

imageViewer.addEventListener("pointermove", function (e) {
  if (!viewerOpen || !viewerPointers.has(e.pointerId)) return;
  const p = viewerPointers.get(e.pointerId);
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (Math.hypot(p.x - p.downX, p.y - p.downY) > VIEWER_DRAG_THRESHOLD) viewerDragMoved = true;

  if (viewerPointers.size === 2) {
    // 捏合：以双指中点为不动点，按间距增量缩放
    const pts = [...viewerPointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (viewerPinchPrevDist > 0 && dist > 0) {
      viewerZoomAt(viewerScale * dist / viewerPinchPrevDist, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    }
    viewerPinchPrevDist = dist;
  } else if (viewerPointers.size === 1 && viewerDragMoved) {
    viewerPanBy(dx, dy);
  }
});

function viewerPointerEnd(e) {
  if (!viewerOpen) return;
  const wasSingle = viewerPointers.size === 1 && viewerPointers.has(e.pointerId);
  viewerPointers.delete(e.pointerId);
  viewerPinchPrevDist = 0;
  // 单指按下且未拖拽 → 单击关闭（微信语义）
  if (wasSingle && !viewerDragMoved) closeImageViewer();
}
imageViewer.addEventListener("pointerup", viewerPointerEnd);
imageViewer.addEventListener("pointercancel", viewerPointerEnd);

// Esc 关闭（桌面）；始终监听、打开时才生效，比开关注册更省事
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && viewerOpen) closeImageViewer();
});

// 点击场景图：仅标记场景（门票语义）打开查看器
sceneImage.addEventListener("click", function () {
  if (viewerZoomable) openImageViewer();
});

function checkCondition(condition, variables) {
  if (condition == null || condition === true) return true;
  // ★ 新增：支持函数回调
  if (typeof condition === 'function') {
    return condition(variables);
  }
  if (typeof condition === 'string') {
    try {
      const keys = Object.keys(variables);
      const vals = Object.values(variables);
      const fn = new Function(...keys, `return Boolean(${condition});`);
      return fn(...vals);
    } catch (e) {
      console.error('条件表达式出错:', condition, e);
      return false;
    }
  }

  if (typeof condition === 'object') {
    for (const key in condition) {
      const req = condition[key];
      const val = variables[key];
      if (typeof req === 'object' && req !== null) {
        for (const op in req) {
          const exp = req[op];
          if (op === '>=' && !(val >= exp)) return false;
          if (op === '<=' && !(val <= exp)) return false;
          if (op === '>' && !(val > exp)) return false;
          if (op === '<' && !(val < exp)) return false;
          if (op === '!=' && !(val !== exp)) return false;
          if (op === '==' && !(val === exp)) return false;
        }
      } else {
        if (val !== req) return false;
      }
    }
    return true;
  }

  return true;
}

// ====== 响应式系统 ======
let _reactiveState = {};   // { ruleId: lastTriggerKeyValue }

function evaluateExpr(expr, vars) {
  if (typeof expr === 'function') return expr(vars);
  if (typeof expr === 'string') {
    try {
      const keys = Object.keys(vars);
      const vals = Object.values(vars);
      const fn = new Function(...keys, `return (${expr});`);
      return fn(...vals);
    } catch (e) {
      console.error('表达式错误:', expr, e);
      return undefined;
    }
  }
  return expr;
}

function applyReactive() {
  const reactive = storyData._reactive;
  if (!reactive) return;

  // --- 1. 计算派生变量 ---
  if (reactive.computed) {
    for (const key in reactive.computed) {
      gameState[key] = evaluateExpr(reactive.computed[key], gameState);
    }
  }

  // --- 2. 执行响应式规则 ---
  if (reactive.rules) {
    for (const rule of reactive.rules) {
      if (!rule.id) {
        console.error('reactive rule 缺少 id', rule);
        continue;
      }

      // 检查 condition
      if (rule.condition != null && !evaluateExpr(rule.condition, gameState)) {
        _reactiveState[rule.id] = undefined;   // 条件不满足时重置记录
        continue;
      }

      // triggerKey 节流：相同 key 值不重复触发
      if (rule.triggerKey !== undefined) {
        const key = evaluateExpr(rule.triggerKey, gameState);
        if (_reactiveState[rule.id] === key) continue;
        _reactiveState[rule.id] = key;
      }

      // 执行效果
      let effectResult;
      if (typeof rule.effect === 'function') {
        effectResult = rule.effect(gameState);
      } else if (rule.effect) {
        // 对象形式的效果直接合并到 gameState
        if (rule.effect.set) {
          for (const k in rule.effect.set) gameState[k] = rule.effect.set[k];
        }
        if (rule.effect.add) {
          for (const k in rule.effect.add) {
            if (gameState[k] === undefined) gameState[k] = rule.effect.add[k];
            else gameState[k] += rule.effect.add[k];
          }
        }
        if (rule.effect.mul) {
          for (const k in rule.effect.mul) {
            if (gameState[k] === undefined) gameState[k] = rule.effect.mul[k];
            else gameState[k] *= rule.effect.mul[k];
          }
        }
      }

      // 触发回调：规则真正生效时调用，用于副作用（如"体力自动下降"的警告提示）
      // effectResult 为函数型 effect 的返回值（如"是否实际上升了追击等级"）
      if (rule.onTrigger) {
        rule.onTrigger(gameState, rule, effectResult);
      }
    }
  }
}

// ====== 全局触发检查 ======
function checkGlobalTriggers() {
  if (!storyData._globalTriggers || !storyData._globalTriggers.length) return null;

  let best = null;
  let bestPriority = -Infinity;

  for (const trigger of storyData._globalTriggers) {
    if (checkCondition(trigger.condition, gameState)) {
      const prio = trigger.priority || 0;
      if (prio > bestPriority) {
        best = trigger;
        bestPriority = prio;
      }
    }
  }

  if (best) {
    const resolved = parseRedirectTarget(best.targetScene, gameState);
    if (resolved !== currentScene) {
      return resolved;
    }
  }
  return null;
}

// ====== QTE 状态清理 ======
function clearQTE() {
  if (qteInterval) {
    clearInterval(qteInterval);
    qteInterval = null;
  }
  if (qteTimer) {
    clearTimeout(qteTimer);
    qteTimer = null;
  }
  // 移除可能残留的倒计时 UI
  const oldTimer = document.getElementById("qte-timer");
  if (oldTimer) oldTimer.remove();
}

// ====== 触屏输入补时 ======
// 手机中文输入法（点输入框唤起键盘 → 拼音 → 选字）比物理键盘慢得多，
// 但闪色播放的那几秒是"白给"的，不该跟着放大——所以只对输入型选项、
// 且只对"扣掉闪色时长之后的敲字时间"乘系数，"颜色越多时限越紧"的原设计不变。
// 调这个常量即可调松紧，设为 1 等于关闭该补时。
const TOUCH_INPUT_FACTOR = 1.5;
const IS_TOUCH = !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);

// ====== QTE 倒计时浮层（场景级 / 选项级共用；样式见 style.css 的 #qte-timer） ======
function startQteUi(timeoutMs) {
  const timerDiv = document.createElement("div");
  timerDiv.id = "qte-timer";
  timerDiv.innerHTML =
    '<div class="qte-row">' +
      '<span class="qte-label">⚡ 快做决定！</span>' +
      '<div class="qte-track"><div class="qte-progress"></div></div>' +
      '<span class="qte-countdown">' + (timeoutMs / 1000).toFixed(1) + 's</span>' +
    '</div>';
  document.body.appendChild(timerDiv);

  const progressBar   = timerDiv.querySelector(".qte-progress");
  const countdownSpan = timerDiv.querySelector(".qte-countdown");
  const startTime = Date.now();
  const total = timeoutMs;

  qteInterval = setInterval(() => {
    const remaining = Math.max(0, total - (Date.now() - startTime));
    progressBar.style.width = (total > 0 ? (remaining / total) * 100 : 0) + "%";
    countdownSpan.textContent = (remaining / 1000).toFixed(1) + "s";
    if (remaining < 1000) timerDiv.classList.add("qte-urgent");   // 最后 1 秒转警戒色
  }, 100);
}

// ====== 解析跳转目标（支持函数、{变量}、普通字符串） ======
function parseRedirectTarget(target, state) {
  if (typeof target === 'function') {
    const result = target(state);
    // 函数返回值也做 {变量} 插值，与字符串分支保持一致
    return typeof result === "string" ? interpolateDisplay(result, state) : result;
  }
  if (typeof target === 'string') {
    return interpolateDisplay(target, state);
  }
  return target;
}

// ====== 回溯功能 ======
function pushHistory() {
  historyStack.push({
    sceneId: currentScene,
    gameState: snapshotState(gameState),  // 深拷贝（Set 会被正确还原为 Set）
    // 规则节流状态必须随快照走：gameState 回到过去而节流记录留在"未来"的话，
    // 回溯后饥饿/疲劳规则会按错位的 triggerKey 错扣、漏扣体力（同存档要存 reactiveState 的道理）
    reactiveState: Object.assign({}, _reactiveState)
  });
  //backtrackBtn.style.display = 'inline-block';  // 有历史就显示顶部按钮
}

function backtrack() {
  if (historyStack.length === 0) return;
  stopTyping();
  clearQTE();   // 终止 QTE
  clearMemoryFlash(); // 终止记忆闪色动画
  const prev = historyStack.pop();
  gameState = prev.gameState;
  // 旧存档的历史项没有 reactiveState：保留当前节流记录比清空安全（清空会让已付过的规则立刻重新武装）
  if (prev.reactiveState) _reactiveState = prev.reactiveState;
  currentScene = prev.sceneId;

  // 历史清空则隐藏顶部按钮
  if (historyStack.length === 0) {
    backtrackBtn.style.display = 'none';
  }

  // 回溯时跳过 onEnter，避免效果重复触发；遮罩标志（雨/丧尸包围/停电）按快照补回
  renderRestoredScene(currentScene);   // 内部即 renderScene(sceneId, true) + 恢复遮罩
}

// 显示文本插值：把 {变量名} 替换为 gameState 当前值，并应用 _display 格式化
// （场景 text 与选项 text 共用。parseRedirectTarget 面向场景ID跳转、不做 _display，故不通用）
function interpolateDisplay(text, state) {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    var val = state[key];
    if (val !== undefined) {
      var fmt = storyData._display && storyData._display[key];
      if (fmt) val = fmt(val);
      return val;
    }
    return match;
  });
}

// 解析选项文本：与场景 text 一致，支持 {变量名} 插值和函数形式（函数返回值同样会做插值）
function resolveChoiceText(choice) {
  var raw = typeof choice.text === "function" ? choice.text(gameState) : (choice.text || "");
  return interpolateDisplay(raw, gameState);
}

// ====== 渲染选项 ======
function renderChoices(scene, sceneId) {
  choicesArea.innerHTML = "";

  // 解析 choices：支持函数（每次动态生成）和静态数组
  let _choices = scene.choices;
  if (typeof _choices === 'function') {
    _choices = _choices(gameState);
  }

  // 打乱选项顺序，防止玩家形成肌肉记忆
  if (_choices && _choices.length > 0) {
    for (let i = _choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_choices[i], _choices[j]] = [_choices[j], _choices[i]];
    }
  }

  // ===== QTE 分支（替换现有 QTE 分支）=====
  const qte = typeof scene.qte === 'function' ? scene.qte(gameState) : scene.qte;
  if (qte) {
    clearQTE();

    // === 动态 timeout：支持字符串表达式 ===
    let timeout = qte.timeout;
    if (typeof timeout === 'string') {
        try {
            const keys = Object.keys(gameState);
            const vals = Object.values(gameState);
            const fn = new Function(...keys, `return Number(${timeout});`);
            timeout = fn(...vals);
        } catch (e) {
            console.error('QTE timeout 表达式错误:', timeout, e);
            timeout = 5000;
        }
    }
    if (!timeout) timeout = 5000; // 兜底
    if (timeout < 0) timeout = 0;

    const onTimeout = qte.onTimeout;
    const hidden = qte.hidden === true;   // 是否隐藏进度条

    // === 仅非隐藏时创建浮层 UI ===
    if (!hidden) {
      startQteUi(timeout);
    }

    // === 超时跳转（隐藏/非隐藏通用） ===
    qteTimer = setTimeout(() => {
      clearQTE();
      if (onTimeout) {
        // 无选项的纯过场节点（travelScene 类：hidden QTE 自动播放）不入历史——
        // 玩家在此没有任何抉择，入档会让回溯落回过场节点并无输入地重走致命路径；
        // 有选项的 QTE 场景照常入档（超时 = 玩家没来得及选，回溯回去重选）
        if (_choices && _choices.length > 0) pushHistory();
        currentScene = parseRedirectTarget(onTimeout, gameState);
        renderScene(currentScene);
      } else {
        console.warn("QTE 超时，但没有定义 onTimeout 场景");
      }
    }, timeout);

    // 渲染选项按钮（排列方向由 style.css 决定：桌面横排 / 手机纵排）
    if (_choices && _choices.length > 0) {
      _choices.forEach(choice => {
        // showCondition 不满足 → 不显示该选项
        if (choice.showCondition && !checkCondition(choice.showCondition, gameState)) return;

        const condMet = checkCondition(choice.condition, gameState);
        if (!condMet && !choice.elseScene) return;

        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = resolveChoiceText(choice);

        btn.addEventListener("click", () => {
          clearQTE();
          const nowCondMet = checkCondition(choice.condition, gameState);
          pushHistory();
          if (nowCondMet) {
            if (choice.effect) applyEffect(choice.effect);
            currentScene = parseRedirectTarget(choice.nextScene, gameState);
          } else {
            currentScene = parseRedirectTarget(choice.elseScene, gameState)
                        || parseRedirectTarget(choice.nextScene, gameState);
          }
          renderScene(currentScene);
        });

        choicesArea.appendChild(btn);
      });
    }

    if (!_choices || _choices.length === 0) {
      // 过场动画（typewriter）纯自动播放，不显示"倒计时中"占位
      if (!qte.typewriter) {
        const noChoiceMsg = document.createElement("p");
        noChoiceMsg.textContent = "（倒计时中……）";
        choicesArea.appendChild(noChoiceMsg);
      }
    }

    choicesArea.style.display = "flex";
    return;
  }

  // ===== 原普通 choices 渲染逻辑=====
  // 排列方向由 style.css 决定：桌面横排 / 手机纵排

  if (_choices && _choices.length > 0) {
    let visibleCount = 0;

    _choices.forEach(choice => {
    // showCondition 不满足 → 不显示该选项
    if (choice.showCondition && !checkCondition(choice.showCondition, gameState)) return;

    const hasElse = choice.elseScene !== undefined;

    // 输入型选项的 condition 依赖提交时的 _input，渲染期不检查（可见性由 showCondition 控制）
    if (!choice.input) {
      const condMet = checkCondition(choice.condition, gameState);
      if (!hasElse && !condMet) return;
    }
    visibleCount++;

    // === INPUT 型选项 ===
    if (choice.input) {
      const container = document.createElement("div");
      container.className = "choice-input-container";

      const label = document.createElement("div");
      label.className = "choice-input-label";
      label.textContent = resolveChoiceText(choice);
      container.appendChild(label);

      const row = document.createElement("div");
      row.className = "choice-input-row";

      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "choice-input-field";
      if (choice.input.placeholder) inp.placeholder = choice.input.placeholder;
      if (choice.input.maxLength) inp.maxLength = choice.input.maxLength;
      row.appendChild(inp);

      const sbtn = document.createElement("button");
      sbtn.className = "choice-btn choice-input-submit";
      sbtn.textContent = "确认";
      row.appendChild(sbtn);

      container.appendChild(row);
      choicesArea.appendChild(container);
      if (choice.timeout !== undefined && choice.timeoutScene === undefined) {
        container.dataset.choiceTimed = "true";
      }

      const submit = () => {
        // 输入只负责采集：写入 _input，之后与普通按钮完全一致地走 condition 分支
        gameState._input = inp.value.trim();
        clearQTE();
        pushHistory();
        if (checkCondition(choice.condition, gameState)) {
          if (choice.effect) applyEffect(choice.effect);
          currentScene = parseRedirectTarget(choice.nextScene, gameState);
        } else {
          currentScene = parseRedirectTarget(choice.elseScene, gameState)
                      || parseRedirectTarget(choice.nextScene, gameState);
        }
        renderScene(currentScene);
      };

      sbtn.addEventListener("click", submit);
      inp.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
      setTimeout(() => inp.focus(), 50);
      return; // 跳过普通按钮
    }

    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = resolveChoiceText(choice);

    btn.addEventListener("click", () => {
      clearQTE();   // 安全起见，也清理一下
      const nowCondMet = checkCondition(choice.condition, gameState);
      pushHistory();
      if (nowCondMet) {
        if (choice.effect) applyEffect(choice.effect);
        currentScene = parseRedirectTarget(choice.nextScene, gameState);
      } else {
        currentScene = parseRedirectTarget(choice.elseScene, gameState)
                    || parseRedirectTarget(choice.nextScene, gameState);
      }
      renderScene(currentScene);
    });

    choicesArea.appendChild(btn);
    if (choice.timeout !== undefined && choice.timeoutScene === undefined) {
      btn.dataset.choiceTimed = "true";
    }
  });

  if (visibleCount === 0) {
    const noChoiceMsg = document.createElement("p");
    noChoiceMsg.textContent = "（没有可行的选择……剧情终止）";
    choicesArea.appendChild(noChoiceMsg);
    appendBacktrackToChoices(scene);
  }
  } else {
    const endMsg = document.createElement("p");
    endMsg.className = "end-msg";
    endMsg.textContent = "— 剧 终 —";
    choicesArea.appendChild(endMsg);
    appendBacktrackToChoices(scene);
  }

  choicesArea.style.display = "flex";

  // ===== Per-choice QTE（选项级倒计时） =====
  if (!scene.qte && _choices && _choices.length > 0) {
    let timedChoice = null;
    let timedTimeout = 0;

    for (const choice of _choices) {
      if (choice.showCondition && !checkCondition(choice.showCondition, gameState)) continue;
      // 输入型选项的 condition 在提交时才求值，这里不做过滤
      if (!choice.input) {
        const condMet = checkCondition(choice.condition, gameState);
        if (!condMet && !choice.elseScene) continue;
      }

      if (choice.timeout !== undefined) {
        timedChoice = choice;
        let timeout = choice.timeout;
        if (typeof timeout === 'string') {
          try {
            const keys = Object.keys(gameState);
            const vals = Object.values(gameState);
            const fn = new Function(...keys, `return Number(${timeout});`);
            timeout = fn(...vals);
          } catch (e) {
            console.error('Choice timeout 表达式错误:', timeout, e);
            timeout = 5000;
          }
        }
        timedTimeout = Math.max(0, timeout || 5000);
        // 触屏输入补时：只放宽"敲字"这一段
        if (IS_TOUCH && choice.input && TOUCH_INPUT_FACTOR > 1) {
          const flashPart = memFlashDuration(gameState);
          const inputPart = Math.max(0, timedTimeout - flashPart);
          timedTimeout = flashPart + Math.round(inputPart * TOUCH_INPUT_FACTOR);
        }
        break;
      }
    }

    if (timedChoice) {
      clearQTE();
      startQteUi(timedTimeout);

      qteTimer = setTimeout(() => {
        clearQTE();
        if (timedChoice.timeoutScene !== undefined) {
          // 有 timeoutScene → 跳转
          const target = parseRedirectTarget(timedChoice.timeoutScene, gameState);
          if (target) {
            pushHistory();
            currentScene = target;
            renderScene(target);
          }
        } else {
          // 无 timeoutScene → 仅移除该选项，保留其他选项
          const el = choicesArea.querySelector('[data-choice-timed="true"]');
          if (el) {
            el.style.transition = 'opacity 0.6s';
            el.style.opacity = '0';
            setTimeout(() => {
              el.remove();
              if (choicesArea.children.length === 0) {
                const endMsg = document.createElement("p");
                endMsg.textContent = "（你没有及时做出选择…）";
                choicesArea.appendChild(endMsg);
                appendBacktrackToChoices(scene);
              }
            }, 600);
          }
        }
      }, timedTimeout);
    }
  }
}

// 辅助函数
function appendBacktrackToChoices(scene) {
  if (historyStack.length === 0) return;
  const btn = document.createElement("button");
  btn.className = "choice-btn";
  btn.style.background = "rgba(180, 140, 60, 0.45)";  // 金色调区分
  btn.style.border = "1px solid rgba(200, 160, 80, 0.5)";
  btn.textContent = scene.backtrack || "↩ 你失败了，下辈子注意点~";
  btn.addEventListener("click", backtrack);
  choicesArea.appendChild(btn);
}

// ====== 核心渲染 ======
function renderScene(sceneId, skipOnEnter = false, _depth = 0) {
  // 防递归过深
  if (_depth > 3) {
    console.error("全局触发器递归层数过多，已中断");
    return;
  }
  clearSegments();   // 必须在 stopTyping 之前：token 先作废，stopTyping 触发旧分段回调时静默失效
  stopTyping();
  closeImageViewer();   // 换场景（选项/QTE/回溯/重启/全局触发器）一律关闭查看器，单一 hook 点

  // 进入新场景时重置展开状态
  document.getElementById("text-area").classList.remove("text-expanded");
  document.getElementById("choices-area").classList.remove("text-expanded");
  // 内部滚动条回顶（手机端紧凑布局下文字/选项区各自可滚）
  document.getElementById("text-area").scrollTop = 0;
  choicesArea.scrollTop = 0;

  if (!gameState || (Object.keys(gameState).length === 0 && storyData && storyData._variables)) {
    console.warn("【引擎】检测到 gameState 为空，重新初始化变量。");
    initGameState();
  }

  const scene = storyData[sceneId];
  if (!scene) {
    sceneText.textContent = "【错误：找不到场景 " + sceneId + "】";
    choicesArea.innerHTML = "";
    choicesArea.style.display = "none";
    return;
  }

  // 记录上一个场景ID（供目标场景 text 用 _lastScene 差异化承接拾取/事件）
  gameState._lastScene = lastRenderedScene;
  lastRenderedScene = sceneId;

  // 自动记录场景访问次数（回溯时跳过），在onEnter执行之前记录
  if (!skipOnEnter) {
    gameState._visit = gameState._visit || {};
    gameState._visit[sceneId] = (gameState._visit[sceneId] || 0) + 1;
  }

  // 重置雨滴/丧尸包围/停电遮罩——每个场景默认关闭，由 onEnter 选择开启
  gameState.showRain = false;
  gameState.showZombies = false;
  gameState.showPowerOut = false;
  // 武器损坏标记同样每场景清零：onEnter（tryBreakWeapon/useHeavyTool）写入，本场景 text 用 weaponBrokeText 承接，
  // 保证"断了"的旁白只出现在损坏发生的那个场景，不会隔几个场景突然弹出旧账
  gameState._weaponJustBroke = "";
  // 标记当前场景是否户外：供 updateTime 判断"连续移动疲劳"只累计户外跋涉
  gameState._isOutdoor = !!scene.outdoor;

  // 户外场景统一标记：自动应用天气身体影响（掉体力 / 晴 ch 归零 / 感冒累积）。
  // 注意：只做身体效果，不碰 showRain/showZombies —— 雨滴与丧尸包围遮罩共用 ::before 伪元素，
  // 视觉上互斥（后声明的丧尸包围会盖掉雨滴），所以两者仍由 onEnter 手动控制。
  if (scene.outdoor && !skipOnEnter) {
    applyWeatherDrain(gameState);
  }

  // 解析进入效果（支持函数模式）
  // ⚠ skipOnEnter 时必须连函数调用一起跳过：函数型 onEnter 普遍带直接改 gameState 的
  // 副作用（transit 回头检测 +ch、updateTime 闭包推进时间/累计疲劳、initMemoryGame 重掷序列等），
  // 只拦 applyEffect 拦不住这些——回溯/读档恢复时副作用会重复执行（曾有回溯落地即再次触发
  // 全局触发器回到死亡节点、疲劳被重复扣档的 bug）。
  const prevSeq = gameState._currentSeq;  // 闪色序列快照（识别本场景是否新生成了序列）
  let enterEffect = scene.onEnter;
  if (typeof enterEffect === "function") {
    enterEffect = skipOnEnter ? null : enterEffect(gameState);
  }

  // 进入效果（回溯时跳过）
  if (enterEffect && !skipOnEnter) {
    applyEffect(enterEffect);
  }

  // 记忆闪色：本场景 onEnter 生成了新序列 → 记录属主场景 ID，
  // 供回溯/读档恢复时判断"这个序列是不是当前场景的"，避免在无关场景误播旧序列
  if (!skipOnEnter && gameState._currentSeq && gameState._currentSeq !== prevSeq) {
    gameState._seqScene = sceneId;
  }

  // 全局触发器：在状态更改后立即检查是否有触发
  const triggeredScene = checkGlobalTriggers();
  if (triggeredScene) {
    currentScene = triggeredScene;
    // 跳过当前场景的渲染，直接跳转至结局
    renderScene(triggeredScene, false, _depth + 1);
    return;
  }

  // ★ 场景抖动（onEnter 中声明 shake: true）
  if (enterEffect && enterEffect.shake && !skipOnEnter) {
    triggerShake();
  }
  // ★ 屏幕特效（根据 _screenEffects 配置自动应用）
  applyScreenEffects();

  // 图片
  let imageSrc = "";
  if (typeof scene.image === "function") {
    imageSrc = scene.image(gameState) || "";
  } else {
    imageSrc = scene.image || "";
  }
  if (imageSrc) {
    sceneImage.src = imageSrc;
    sceneImage.style.display = "block";
  } else {
    sceneImage.style.display = "none";
  }
  // 图片查看器门票：仅标记场景显示角标、允许点击放大（每场景重置，同 showRain 惯例）
  viewerZoomable = !!scene.imageZoom && !!imageSrc;
  zoomBadge.style.display = viewerZoomable ? "block" : "none";
  imageArea.classList.toggle("image-zoomable", viewerZoomable);

  choicesArea.style.display = "none";

  let displayText = "";
  let textIsSegmented = false;
  if (typeof scene.text === "function") {
    displayText = scene.text(gameState);          // 把当前状态传给函数
  } else {
    displayText = scene.text || "";
  }
  if (Array.isArray(displayText)) {
    // 分段文本：text 数组（函数返回数组同样生效），每段独立做 {变量} 插值
    textIsSegmented = true;
    displayText = displayText.map(s => interpolateDisplay(String(s), gameState));
    if (displayText.length === 0) { textIsSegmented = false; displayText = ""; }
  } else {
    displayText = interpolateDisplay(displayText, gameState);
  }

  sceneText.style.cssText = '';
  if (scene.style) {
    if (typeof scene.style === 'string') {
      sceneText.style.cssText = scene.style;
    } else if (typeof scene.style === 'object') {
      for (const [prop, val] of Object.entries(scene.style)) {
        const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        sceneText.style.setProperty(cssProp, val);
      }
    }
  }

  const textArea = document.getElementById("text-area");
  // 文本框是否显示？（分段文本：所有段都为空才隐藏）
  const textEmpty = textIsSegmented ? displayText.every(s => s === "") : displayText === "";
  if (textEmpty) {
    textArea.style.visibility = 'hidden';
  } else {
    textArea.style.visibility = 'visible';
  }

  // 回溯/读档（skipOnEnter）落回闪色战斗场景：序列保持原样（时间倒流，答案不变），但重播动画——
  // 否则没记住序列的玩家会被永久卡死。放在全局触发器检查之后，避免重定向到的场景误播。
  if (skipOnEnter && gameState._seqScene === sceneId && Array.isArray(gameState._currentSeq) && gameState._currentSeq.length > 0) {
    gameState._seqPlayed = false;
  }

  const hasQte = typeof scene.qte === 'function' ? scene.qte(gameState) : scene.qte;
  if (textIsSegmented) {
    // 分段文本：逐段打字+停留；最后一段完成后才渲染选项/闪色，QTE 倒计时自此开始。
    // 分段文本总是走打字机节奏（即使场景有 qte 且未声明 typewriter——分段本身就意味着节奏化阅读）
    typeSegments(sceneText, displayText, 80, () => {
      renderChoices(scene, sceneId);
      applyMemoryFlash(gameState);
    });
  } else if (hasQte && !hasQte.typewriter) {
    // QTE 场景直接显示文字，跳过打字机效果
    sceneText.innerHTML = displayText;
    sceneText.classList.remove("typing");
    renderChoices(scene, sceneId);  // renderChoices 内部会启动倒计时
  } else {
    // 无 QTE，或 QTE 声明了 typewriter（过场动画）：走打字机，完成后渲染选项并启动倒计时
    typeText(sceneText, displayText, 80, () => {
      renderChoices(scene, sceneId);
      applyMemoryFlash(gameState);
    });
  }

  // 自动存档：全局触发器级联时外层会提前 return，只有最终落地的这一层走到这里，
  // 因此玩家每次动作恰好存一次（选项点击 / QTE 超时 / 回溯 / 重启皆经此路径）
  saveGame(sceneId);
}

// ====== 重新开始 ======
restartBtn.addEventListener("click", () => {
  stopTyping();
  clearQTE();   // 终止任何进行中的 QTE
  historyStack = [];          // 清空历史
  backtrackBtn.style.display = 'none';  // 隐藏回溯
  _reactiveState = {};        // 清空规则节流记录，否则新局第一小时不扣体力
  clearSave();                // 重启 = 清档（随后 renderScene 会写入全新存档）
  initGameState();
  lastRenderedScene = "";     // 重置上一场景记录，避免旧场景串场
  applyScreenEffects();   // ← 新增：重置特效
  clearMemoryFlash();     // 终止记忆闪色动画
  currentScene = "start";
  renderScene(currentScene);
});
// 回溯按钮事件绑定
backtrackBtn.addEventListener("click", backtrack);

// ====== 自动存档（localStorage） ======
const SAVE_KEY     = "shichaobiji_save_v1";
const SAVE_VERSION = 1;
const HISTORY_CAP  = 30;      // 入档的回溯步数上限（内存中仍是全量）
let storageOk = true;         // 首次读写失败即静默停用（隐私模式/配额满）

// Set 的序列化：JSON 原生不支持 Set，转成 { __set: [...] } 再还原
function setReplacer(k, v) {
  return v instanceof Set ? { __set: Array.from(v) } : v;
}
function setReviver(k, v) {
  return (v && typeof v === "object" && Array.isArray(v.__set)) ? new Set(v.__set) : v;
}
// 深拷贝状态（Set 进出都保持 Set），供存档 / pushHistory / initGameState 共用
function snapshotState(state) {
  return JSON.parse(JSON.stringify(state, setReplacer), setReviver);
}

// 保存当前进度。在 renderScene 末尾调用——此时 onEnter 已执行、_visit 已累加、全局触发器已级联完毕
function saveGame(sceneId) {
  if (!storageOk) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version:      SAVE_VERSION,
      savedAt:      Date.now(),
      sceneId:      sceneId,
      gameState:    gameState,
      historyStack: historyStack.slice(-HISTORY_CAP),
      reactiveState: _reactiveState      // 规则节流状态，不存会导致恢复后二次扣体力
    }, setReplacer));
  } catch (e) {
    storageOk = false;
    console.warn("【存档】写入失败，本局将不再自动存档：", e);
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn("【存档】清除失败：", e);
  }
}

// 读取并校验存档；不可用则返回 null（调用方走全新开局）
function loadSave() {
  let saved;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    saved = JSON.parse(raw, setReviver);
  } catch (e) {
    storageOk = false;
    console.warn("【存档】读取失败：", e);
    return null;
  }

  if (!saved || saved.version !== SAVE_VERSION) return null;
  if (!saved.gameState || typeof saved.gameState !== "object") return null;
  if (!saved.sceneId || !storyData[saved.sceneId]) {
    console.warn("【存档】场景已不存在，弃档：", saved.sceneId);
    return null;
  }
  // 剧情改动后可能有历史场景被删除，逐项过滤
  saved.historyStack = (saved.historyStack || []).filter(function (h) {
    return h && h.sceneId && storyData[h.sceneId] && h.gameState;
  });
  return saved;
}

// 把存档写回运行状态（不负责渲染）
function applySave(saved) {
  gameState      = saved.gameState;               // Set 已由 reviver 还原
  historyStack   = saved.historyStack || [];
  _reactiveState = saved.reactiveState || {};
  currentScene   = saved.sceneId;
  // ⚠️ 必须从 gameState._lastScene 恢复：renderScene 会先把 lastRenderedScene 写进
  // gameState._lastScene 再更新自己。若这里填 saved.sceneId，_lastScene 会被覆盖成当前场景，
  // 所有依赖 _lastScene 的承接句全部失效。
  lastRenderedScene = saved.gameState._lastScene || "";
  // 注意：这里不显示右上角"回溯"按钮——正常游玩中它常态隐藏（pushHistory 的显示语句被注释），
  // 回溯入口只有死亡屏的 appendBacktrackToChoices。恢复后保持一致；历史栈照常保留，死亡屏照样可回溯。
}

// 恢复渲染：跳过 onEnter（效果不重复），并补回被 renderScene 无条件重置的遮罩标志
function renderRestoredScene(sceneId) {
  const flags = {
    showRain:     gameState.showRain,
    showZombies:  gameState.showZombies,
    showPowerOut: gameState.showPowerOut
  };
  renderScene(sceneId, true);
  Object.assign(gameState, flags);
  applyScreenEffects();
}

// 存档摘要（不剧透场景名）
function makeSaveSummary(saved) {
  const v = saved.gameState;
  const mm = String(v.mm !== undefined ? v.mm : 0).padStart(2, "0");
  const memCount = ["gameMemorySet", "personalMemorySet", "mixedMemorySet"]
    .reduce(function (n, k) { return n + (v[k] instanceof Set ? v[k].size : 0); }, 0);
  return "Day " + v.dd + " " + v.hh + ":" + mm + " · 记忆 " + memCount + " 段";
}

// 启动时的存档选择框（append 到 body 末尾，不进 #game-container，避免干扰兄弟选择器）
function showSaveDialog(summary, onContinue, onNew) {
  const dialog = document.createElement("div");
  dialog.id = "save-dialog";
  dialog.innerHTML =
    '<div class="save-dialog-box">' +
      '<div class="save-dialog-title">尸潮笔记</div>' +
      '<div class="save-dialog-summary">上次进度：' + summary + '</div>' +
      '<div class="save-dialog-actions">' +
        '<button class="choice-btn" id="save-continue">继续上次冒险</button>' +
        '<button class="choice-btn" id="save-new">从 Day 1 重新开始</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dialog);

  document.getElementById("save-continue").addEventListener("click", function () {
    dialog.remove();
    onContinue();
  });
  document.getElementById("save-new").addEventListener("click", function () {
    dialog.remove();
    onNew();
  });
}

// ====== 图片预加载 ======
function collectImagePaths(storyData) {
  const paths = new Set();

  // 用几组典型游戏时间覆盖 timeImage() 的全部四个时段
  const timeSamples = [
    { hh: 10 },   // morning (7-15)
    { hh: 17 },   // evening (16-18)
    { hh: 20 },   // night (19-22)
    { hh: 2 }     // midnight (23-6)
  ];

  // 覆盖天黑必须过夜 中按 currentArea 分发的路径
  const nightSamples = [
    { currentArea: "初始小区" },
    { currentArea: "周边社区" },
    { currentArea: "高架" },
    { currentArea: "迪士尼" },
    { currentArea: "临港" }
  ];

  // 天气采样：部分 image 函数会按 weather 分支返回不同路径（如雨天变体）
  const weatherValues = ["晴", "阴", "雨"];

  for (const [sceneId, scene] of Object.entries(storyData)) {
    if (!scene || !scene.image) continue;

    if (typeof scene.image === "string") {
      // 静态字符串 → 直接加入
      paths.add(scene.image);
    } else if (typeof scene.image === "function") {
      // 函数 → 用多组采样值尝试解析（时间 × 天气，确保覆盖雨天分支）
      const baseSamples = sceneId === "天黑必须过夜" ? nightSamples : timeSamples;
      for (const base of baseSamples) {
        for (const w of weatherValues) {
          try {
            const sampleVars = Object.assign({}, base, { weather: w });
            const result = scene.image(sampleVars);
            if (result && typeof result === "string") {
              paths.add(result);
            }
          } catch (e) {
            // 采样值不兼容则跳过
          }
        }
      }
    }
  }

  return Array.from(paths);
}

function preloadImages(onProgress, onComplete) {
  const paths = collectImagePaths(storyData);
  const total = paths.length;

  if (total === 0) {
    if (onComplete) onComplete();
    return;
  }

  let loaded = 0;
  console.log("【预加载】开始预加载 " + total + " 张图片...");

  for (const path of paths) {
    const img = new Image();
    const onDone = function () {
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (loaded >= total) {
        console.log("【预加载】完成，" + total + " 张图片已缓存。");
        if (onComplete) onComplete();
      }
    };
    img.onload = onDone;
    img.onerror = function () {
      console.warn("【预加载】图片加载失败（可能是路径错误）: " + path);
      onDone();
    };
    img.src = path;
  }
}

// ====== 页面启动 ======
// 预加载 + 首屏渲染。restore=true 时走"恢复存档"渲染（跳过 onEnter、补回遮罩标志）
function startPreload(sceneId, restore) {
  const overlay = document.getElementById("preload-overlay");
  const bar    = document.getElementById("preload-bar");
  const label  = document.getElementById("preload-label");

  const renderFirst = function () {
    if (restore) renderRestoredScene(sceneId);
    else renderScene(sceneId);
  };

  if (overlay && bar) {
    // 有进度条 UI → 显示进度
    preloadImages(
      function (loaded, total) {
        const pct = Math.round((loaded / total) * 100);
        bar.style.width = pct + "%";
        if (label) label.textContent = "加载资源中… " + pct + "% (" + loaded + "/" + total + ")";
      },
      function () {
        // 预加载完成后淡出遮罩
        overlay.classList.add("preload-done");
        setTimeout(function () {
          overlay.style.display = "none";
        }, 500);
        renderFirst();
      }
    );
  } else {
    // 无 UI → 静默预加载 + 立即渲染（不阻塞游戏）
    preloadImages(null, null);
    renderFirst();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (typeof storyData === 'undefined') {
    console.error("【引擎】storyData 未定义！请确保 story.js 在 engine.js 之前加载。");
    sceneText.textContent = "【引擎错误】storyData 未加载。";
    return;
  }
  initGameState();

  // --- 存档检测 → 选择 → 预加载 ---
  const saved = loadSave();
  if (saved) {
    showSaveDialog(
      makeSaveSummary(saved),
      function () {                          // 继续
        applySave(saved);
        startPreload(saved.sceneId, true);
      },
      function () {                          // 从头开始
        clearSave();
        startPreload("start", false);
      }
    );
  } else {
    startPreload("start", false);
  }
});