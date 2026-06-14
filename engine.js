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
let historyStack = [];   // ★ 新增：回溯历史 [{ sceneId, gameState }]

// ====== 打字机相关 ======
let typingTimer = null;
let typingCallback = null;
let typingFullText = "";
let typingIsHtml = false;      // ★ 新增：标记当前是否 HTML 模式

function stopTyping() {
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
  element.innerHTML = "";                  // ★ 统一用 innerHTML 清空
  element.classList.add("typing");

  if (!fullText) {
    stopTyping();
    if (onComplete) onComplete();
    return;
  }

  const hasHtml = /<[^>]+>/.test(fullText);
  typingIsHtml = hasHtml;                  // ★ 记下模式，供 skip 使用

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

      element.innerHTML = result;           // ★ 关键：用 innerHTML 渲染

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

    // ★ 根据模式选择 innerHTML 或 textContent
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

// ====== 回溯功能 ======
function pushHistory() {
  historyStack.push({
    sceneId: currentScene,
    gameState: JSON.parse(JSON.stringify(gameState))  // 深拷贝
  });
  backtrackBtn.style.display = 'inline-block';  // 有历史就显示顶部按钮
}

function backtrack() {
  if (historyStack.length === 0) return;
  stopTyping();
  const prev = historyStack.pop();
  gameState = prev.gameState;
  currentScene = prev.sceneId;

  // 历史清空则隐藏顶部按钮
  if (historyStack.length === 0) {
    backtrackBtn.style.display = 'none';
  }

  // ★ 回溯时跳过 onEnter，避免效果重复触发
  renderScene(currentScene, true);
}

// ====== 渲染选项 ======
function renderChoices(scene) {
  choicesArea.innerHTML = "";

  if (scene.choices && scene.choices.length > 0) {
    let visibleCount = 0;

    scene.choices.forEach(choice => {
      const hasElse = choice.elseScene !== undefined;
      const condMet = checkCondition(choice.condition, gameState);

      if (!hasElse && !condMet) return;
      visibleCount++;

      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choice.text;

      btn.addEventListener("click", () => {
        const nowCondMet = checkCondition(choice.condition, gameState);
        pushHistory();   // ★ 压入历史
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
      // ★ 结局：底部放回溯按钮
      appendBacktrackToChoices();
    }
  } else {
    // ★ 无 choices = 结局
    const endMsg = document.createElement("p");
    endMsg.textContent = "— 剧 终 —";
    choicesArea.appendChild(endMsg);
    // ★ 结局：底部放回溯按钮
    appendBacktrackToChoices();
  }

  choicesArea.style.display = "flex";
}

// ★ 新增辅助函数
function appendBacktrackToChoices() {
  if (historyStack.length === 0) return;
  const btn = document.createElement("button");
  btn.className = "choice-btn";
  btn.style.background = "rgba(180, 140, 60, 0.45)";  // 金色调区分
  btn.style.border = "1px solid rgba(200, 160, 80, 0.5)";
  btn.textContent = "↩ 回溯到上一次选择";
  btn.addEventListener("click", backtrack);
  choicesArea.appendChild(btn);
}

// ====== 核心渲染 ======
function renderScene(sceneId, skipOnEnter = false) {
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

  // ★ 进入效果（回溯时跳过）
  if (scene.onEnter && !skipOnEnter) {
    applyEffect(scene.onEnter);
  }

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

  typeText(sceneText, displayText, 50, () => {
    renderChoices(scene);
  });
}

// ====== 重新开始 ======
restartBtn.addEventListener("click", () => {
  stopTyping();
  historyStack = [];          // ★ 清空历史
  backtrackBtn.style.display = 'none';  // ★ 隐藏回溯
  initGameState();
  currentScene = "start";
  renderScene(currentScene);
});
// ★★★ 新增：回溯按钮事件绑定 ★★★
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