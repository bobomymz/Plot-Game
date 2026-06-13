// ================= engine.js =================

// --- DOM 元素 ---
const sceneImage  = document.getElementById("scene-image");
const sceneText   = document.getElementById("scene-text");
const choicesArea = document.getElementById("choices-area");
const restartBtn  = document.getElementById("restart-btn");

// --- 游戏运行状态 ---
let currentScene = "start";
let gameState = {};

// ====== 打字机相关 ======
let typingTimer = null;
let typingCallback = null;
let typingFullText = "";

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
  element.textContent = "";
  element.classList.add("typing");

  if (!fullText) {
    stopTyping();
    if (onComplete) onComplete();
    return;
  }

  let i = 0;
  typingCallback = onComplete;
  typingTimer = setInterval(() => {
    if (i < fullText.length) {
      element.textContent += fullText.charAt(i);
      i++;
    } else {
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

// 点击文字可跳过打字机
sceneText.addEventListener("click", () => {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
    sceneText.textContent = typingFullText;
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
      gameState[key] = (gameState[key] || 0) + effect.add[key];
    }
  }
  if (effect.mul) {
    for (let key in effect.mul) {
      gameState[key] = (gameState[key] || 0) * effect.mul[key];
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
    }
  } else {
    const endMsg = document.createElement("p");
    endMsg.textContent = "— 剧 终 —";
    choicesArea.appendChild(endMsg);
  }

  choicesArea.style.display = "flex";  // 恢复正常显示
}

// ====== 核心渲染 ======
function renderScene(sceneId) {
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

  // 进入效果
  if (scene.onEnter) {
    applyEffect(scene.onEnter);
  }

  // 图片
  if (scene.image) {
    sceneImage.src = scene.image;
    sceneImage.style.display = "block";
  } else {
    sceneImage.style.display = "none";
  }

  // 先隐藏选项（等待打字结束）
  choicesArea.style.display = "none";

  // 替换变量占位符
  let displayText = scene.text || "";
  displayText = displayText.replace(/\{(\w+)\}/g, (match, key) => {
    return gameState[key] !== undefined ? gameState[key] : match;
  });

  // ★★★ 新增：重置并应用场景样式 ★★★
  // 先清掉上一场景可能设置的 style
  sceneText.style.cssText = '';
  // 如果场景定义了 style 属性，则应用
  if (scene.style) {
    // 支持两种写法：字符串 "font-size: 24px; color: red;" 或对象 {fontSize: "24px", color: "red"}
    if (typeof scene.style === 'string') {
      sceneText.style.cssText = scene.style;
    } else if (typeof scene.style === 'object') {
      for (const [prop, val] of Object.entries(scene.style)) {
        // 把驼峰式转为连字符式：fontSize → font-size
        const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        sceneText.style.setProperty(cssProp, val);
      }
    }
  }

  // ★★★ 新增：检测是否包含 HTML 标签 ★★★
  const hasHtml = /<[^>]+>/.test(displayText);

  if (hasHtml) {
    // HTML 模式：跳过打字机，直接 innerHTML
    sceneText.innerHTML = displayText;
    sceneText.classList.remove("typing");
    renderChoices(scene);
  } else {
    // 纯文本模式：正常打字机
    typeText(sceneText, displayText, 50, () => {
      renderChoices(scene);
    });
  }
}

// ====== 重新开始 ======
restartBtn.addEventListener("click", () => {
  stopTyping();
  initGameState();
  currentScene = "start";
  renderScene(currentScene);
});

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