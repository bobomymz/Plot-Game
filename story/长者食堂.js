Object.assign(storyData, {
  "东明社区食堂": {
    image: timeImage({
      morning: "images/小区周边/长者食堂.png",
      night: "images/小区周边/长者食堂-night.jpg"
    }),
    onEnter: function(vars) {
      vars.showRain = true;
    },
    text: "你来到了东明社区食堂。平时偶尔回来这里吃一次，饭菜也挺好的，经常能看到老年人来吃。现在这里已经空了。",
    choices: [
      {
        text: "离开",
        nextScene: "东明路-三林路 十字路口",
        effect: updateTime(4)
      },
      {
        text: "关门",
        nextScene: "东明街道食堂"
      },
      {
        text: "坐在椅子上休息一会儿",
        nextScene: "东明路-三林路 十字路口"
      }
    ]
  },
});