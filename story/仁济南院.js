// -------- 仁济南院（西南线 · 真相主通道 · 第一梯队） --------
// 规划基线：设计细节.md §13.9 / 仁济南院设计稿.md
// 本次实现：到达路线（杨高南路高架 → 仁济南院-浦锦路）+ 外部入口占位
// TODO: 医院内部（急诊大厅 / 检验科 / 门诊药房 / 住院部走廊 / 手术供应室 / 太平间）
//       医院内部需门禁卡（hasRenjiCard，安居苑203室双肩包夹层）或破门进入

Object.assign(storyData, {
  "仁济南院-浦锦路": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiRoad.png */,
    onEnter: function(vars) {
      vars.showZombies = true;
      vars.currentArea = "仁济南院";
      vars.currentPlace = "仁济南院";
      vars.currentPos = "浦锦路";
      applyWeatherDrain(vars);
    },
    text: function(vars) {
      var desc = "你下了高架，沿着一条两侧种满香樟的路往前开。路边褪色的指示牌写着“仁济医院南院”，箭头指向路尽头的几栋白色建筑。\n\
医院的轮廓安静得有些不真实。急诊楼前的通道上横七竖八地倒着几辆救护车和私家车，车门大开，路面上有干涸的暗红色痕迹。几个穿白大褂的身影瘫倒在草坪上，一动不动。\n\
整座医院像一个被突然抽走了声音的蜂巢。\n";
      return desc + describeWeather(vars) + "\n" + describeZombieWave(vars);
    },
    choices: [
      {
        text: "从急诊正门进",
        nextScene: "仁济南院-大门",
        effect: updateTime(5)
      },
      {
        text: "绕到救护车通道",
        nextScene: "仁济南院-救护车通道",
        effect: updateTime(8)
      },
      {
        text: "从地下停车场入口进",
        nextScene: "仁济南院-地下停车场",
        effect: updateTime(6)
      },
      {
        text: "回高架",
        nextScene: "杨高南路高架",
        effect: updateTime(15)
      }
    ]
  },

  "仁济南院-大门": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiMainGate.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: function(vars) {
      var desc = "急诊大厅的玻璃门半敞着，门上糊着报纸和胶带——有人试图封住它，又放弃了。门前的空地散落着几具尸体，苍蝇在低空盘旋。\n\
门缝里透出黑黢黢的走廊，看不清里面。你掂了掂手里的家伙——现在贸然进去，恐怕凶多吉少。";
      return desc + describeZombieWave(vars);
    },
    choices: [
      {
        text: "退回浦锦路",
        nextScene: "仁济南院-浦锦路",
        effect: updateTime(5)
      }
    ]
  },

  "仁济南院-救护车通道": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiAmbulance.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: function(vars) {
      var desc = "你绕到医院侧面。救护车通道的铁门半掩着，一辆救护车堵在门口，车门大开，车内的担架翻落在地。通道深处的应急灯一闪一闪，投下忽明忽暗的影子。\n\
这里比正门安静一些——但也只是相对而言。";
      return desc + describeZombieWave(vars);
    },
    choices: [
      {
        text: "退回浦锦路",
        nextScene: "仁济南院-浦锦路",
        effect: updateTime(8)
      }
    ]
  },

  "仁济南院-地下停车场": {
    image: "images/placeholder.png" /* TODO: images/仁济南院/renjiParking.png */,
    onEnter: function(vars) { vars.showZombies = true; },
    text: function(vars) {
      var desc = "地下停车场的入口坡道黑黢黢的，往下看不到底。入口处横着一辆失控的轿车，挡风玻璃碎了一半。\n\
里面比外面暗得多——没有照明的话，进去什么都看不见。";
      return desc + describeZombieWave(vars);
    },
    choices: [
      {
        text: "退回浦锦路",
        nextScene: "仁济南院-浦锦路",
        effect: updateTime(6)
      }
    ]
  }
});
