// ================= engine.js =================

// --- DOM 元素 ---
const sceneImage  = document.getElementById("scene-image");
const sceneText   = document.getElementById("scene-text");
const choicesArea = document.getElementById("choices-area");
const restartBtn  = document.getElementById("restart-btn");
const backtrackBtn = document.getElementById("backtrack-btn");


// --- 游戏运行状态 ---
let currentScene = "start";
let gameState = {};
let historyStack = [];   // 回溯历史 [{ sceneId, gameState }]
// ====== QTE 相关 ======
let qteTimer = null;           // QTE 倒计时定时器句柄
let qteRemaining = 0;         // 剩余时间（秒）
let qteInterval = null;       // UI 更新 interval
// ====== 打字机相关 ======
let typingTimer = null;
let typingCallback = null;
let typingFullText = "";
let typingIsHtml = false;      // 标记当前是否 HTML 模式

function stopTyping() {
  clearQTE();   // 终止任何进行中的 QTE
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

function typeText(element, fullText, speed = 50, onComplete) {
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

sceneText.addEventListener("click", () => {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;

    // 根据模式选择 innerHTML 或 textContent
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
  }
});

// ====== 工具函数 ======
function initGameState() {
  const defaults = (storyData && storyData._variables) || {};
  gameState = { ...defaults };
  console.log("【引擎】变量已初始化：", gameState);
}

function applyEffect(effect) {
  if (!effect) return;
  if (effect.set) {
    for (let key in effect.set) {
      gameState[key] = effect.set[key];
    }
  }
  if (effect.add) {
    for (let key in effect.add) {
      if(gameState[key] === undefined) gameState[key] = effect.add[key];
      else gameState[key] += effect.add[key];
    }
  }
  if (effect.mul) {
    for (let key in effect.mul) {
      if(gameState[key] === undefined) gameState[key] = effect.mul[key];
      else gameState[key] *= effect.mul[key];
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

  // 一次性替换类名（清掉旧特效）
  overlay.className = activeClasses.join(' ');

  // 无特效时完全隐藏，避免空层干扰
  overlay.style.display = activeClasses.length === 0 ? 'none' : '';
}

function checkCondition(condition, variables) {
  if (condition == null || condition === true) return true;

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

  if (best && best.targetScene !== currentScene) {
    return best.targetScene;
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

// ====== 回溯功能 ======
function pushHistory() {
  historyStack.push({
    sceneId: currentScene,
    gameState: JSON.parse(JSON.stringify(gameState))  // 深拷贝
  });
  //backtrackBtn.style.display = 'inline-block';  // 有历史就显示顶部按钮
}

function backtrack() {
  if (historyStack.length === 0) return;
  stopTyping();
  clearQTE();   // 终止 QTE
  const prev = historyStack.pop();
  gameState = prev.gameState;
  currentScene = prev.sceneId;

  // 历史清空则隐藏顶部按钮
  if (historyStack.length === 0) {
    backtrackBtn.style.display = 'none';
  }

  // 回溯时跳过 onEnter，避免效果重复触发
  renderScene(currentScene, true);   // skipOnEnter = true，depth 默认为 0
}

// ====== 渲染选项 ======
function renderChoices(scene) {
  choicesArea.innerHTML = "";

  // ===== QTE 分支（替换现有 QTE 分支）=====
  if (scene.qte) {
    clearQTE();
    const qte = scene.qte;

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
    if (!timeout || timeout < 0) timeout = 5000; // 兜底

    const onTimeout = qte.onTimeout;
    const hidden = qte.hidden === true;   // 是否隐藏进度条

    // === 仅非隐藏时创建浮层 UI ===
    if (!hidden) {
      const timerDiv = document.createElement("div");
      timerDiv.id = "qte-timer";
      timerDiv.style.cssText = `
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%);
        width: 88%;
        max-width: 640px;
        z-index: 2;
        padding: 12px 18px;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 200, 50, 0.45);
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
      `;
      timerDiv.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="color:#ffcc00;font-weight:bold;white-space:nowrap;font-size:15px;">⚡ 快做决定！</span>
          <div style="flex:1;height:10px;background:rgba(255,255,255,0.15);border-radius:5px;overflow:hidden;min-width:60px;">
            <div id="qte-progress" style="height:100%;width:100%;background:#ff4444;border-radius:5px;"></div>
          </div>
          <span id="qte-countdown" style="color:#ffcc00;font-weight:bold;font-size:16px;min-width:42px;text-align:right;">${(timeout/1000).toFixed(1)}s</span>
        </div>
      `;
      document.body.appendChild(timerDiv);

      const progressBar = document.getElementById("qte-progress");
      const countdownSpan = document.getElementById("qte-countdown");

      const startTime = Date.now();
      const total = timeout;

      qteInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, total - elapsed);
        const percent = (remaining / total) * 100;
        progressBar.style.width = percent + "%";
        countdownSpan.textContent = (remaining / 1000).toFixed(1) + "s";

        if (remaining < 1000) {
          progressBar.style.background = "#ff0000";
          countdownSpan.style.color = "#ff0000";
        }
      }, 100);
    }

    // === 超时跳转（隐藏/非隐藏通用） ===
    qteTimer = setTimeout(() => {
      clearQTE();
      if (onTimeout) {
        pushHistory();
        renderScene(onTimeout);
      } else {
        console.warn("QTE 超时，但没有定义 onTimeout 场景");
      }
    }, timeout);

    // 恢复选项横向布局并渲染选项按钮
    choicesArea.style.flexDirection = "row";

    if (scene.choices && scene.choices.length > 0) {
      scene.choices.forEach(choice => {
        // ★ 新增：showCondition 不满足 → 不显示该选项
        if (choice.showCondition && !checkCondition(choice.showCondition, gameState)) return;

        const condMet = checkCondition(choice.condition, gameState);
        if (!condMet && !choice.elseScene) return;

        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice.text;

        btn.addEventListener("click", () => {
          clearQTE();   // 点击后取消隐藏 QTE 的超时
          pushHistory();
          const nowCondMet = checkCondition(choice.condition, gameState);
          if (nowCondMet) {
            if (choice.effect) applyEffect(choice.effect);
            currentScene = choice.nextScene;
          } else {
            currentScene = choice.elseScene || choice.nextScene;
          }
          renderScene(currentScene);
        });

        choicesArea.appendChild(btn);
      });
    }

    if (!scene.choices || scene.choices.length === 0) {
      const noChoiceMsg = document.createElement("p");
      noChoiceMsg.textContent = "（倒计时中……）";
      choicesArea.appendChild(noChoiceMsg);
    }

    choicesArea.style.display = "flex";
    return;
  }

  // ===== 原普通 choices 渲染逻辑=====

  // 恢复横向排列
  choicesArea.style.flexDirection = "row";

  if (scene.choices && scene.choices.length > 0) {
    let visibleCount = 0;

    scene.choices.forEach(choice => {
      // ★ 新增：showCondition 不满足 → 不显示该选项
      if (choice.showCondition && !checkCondition(choice.showCondition, gameState)) return;

      const hasElse = choice.elseScene !== undefined;
      const condMet = checkCondition(choice.condition, gameState);

      if (!hasElse && !condMet) return;
      visibleCount++;

      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choice.text;

      btn.addEventListener("click", () => {
        clearQTE();   // 安全起见，也清理一下
        const nowCondMet = checkCondition(choice.condition, gameState);
        pushHistory();
        if (nowCondMet) {
          if (choice.effect) applyEffect(choice.effect);
          currentScene = choice.nextScene;
        } else {
          currentScene = choice.elseScene || choice.nextScene;
        }
        renderScene(currentScene);
      });

      choicesArea.appendChild(btn);
    });

    if (visibleCount === 0) {
      const noChoiceMsg = document.createElement("p");
      noChoiceMsg.textContent = "（没有可行的选择……剧情终止）";
      choicesArea.appendChild(noChoiceMsg);
      appendBacktrackToChoices();
    }
  } else {
    const endMsg = document.createElement("p");
    endMsg.textContent = "— 剧 终 —";
    choicesArea.appendChild(endMsg);
    appendBacktrackToChoices();
  }

  choicesArea.style.display = "flex";
}

// 辅助函数
function appendBacktrackToChoices() {
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
  stopTyping();

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

  // 进入效果（回溯时跳过）
  if (scene.onEnter && !skipOnEnter) {
    applyEffect(scene.onEnter);
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
  if (scene.onEnter && scene.onEnter.shake && !skipOnEnter) {
    triggerShake();
  }
  // ★ 屏幕特效（根据 _screenEffects 配置自动应用）
  applyScreenEffects();

  // 图片
  if (scene.image) {
    sceneImage.src = scene.image;
    sceneImage.style.display = "block";
  } else {
    sceneImage.style.display = "none";
  }

  choicesArea.style.display = "none";

  let displayText = scene.text || "";
  displayText = displayText.replace(/\{(\w+)\}/g, (match, key) => {
    return gameState[key] !== undefined ? gameState[key] : match;
  });

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
  // 文本框是否显示？
  if (scene.text === "") {
    textArea.style.visibility = 'hidden';
  } else {
    textArea.style.visibility = 'visible';
  }

  if (scene.qte) {
    // QTE 场景直接显示文字，跳过打字机效果
    if (typingIsHtml) {
      sceneText.innerHTML = displayText;
    } else {
      sceneText.textContent = displayText;
    }
    sceneText.classList.remove("typing");
    renderChoices(scene);  // renderChoices 内部会启动倒计时
  } else {
    typeText(sceneText, displayText, 50, () => {
      renderChoices(scene);
    });
  }

}

// ====== 重新开始 ======
restartBtn.addEventListener("click", () => {
  stopTyping();
  clearQTE();   // 终止任何进行中的 QTE
  historyStack = [];          // 清空历史
  backtrackBtn.style.display = 'none';  // 隐藏回溯
  initGameState();
  applyScreenEffects();   // ← 新增：重置特效
  currentScene = "start";
  renderScene(currentScene);
});
// 回溯按钮事件绑定
backtrackBtn.addEventListener("click", backtrack);

// ====== 页面启动 ======
window.addEventListener("DOMContentLoaded", () => {
  if (typeof storyData === 'undefined') {
    console.error("【引擎】storyData 未定义！请确保 story.js 在 engine.js 之前加载。");
    sceneText.textContent = "【引擎错误】storyData 未加载。";
    return;
  }
  initGameState();
  renderScene(currentScene);
});