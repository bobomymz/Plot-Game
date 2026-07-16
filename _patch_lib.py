import re

with open('story/东明社区图书馆.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find exact text to replace
target = '给了被压住的丧尸一下'
idx = content.find(target)
if idx == -1:
    print('NOT FOUND')
    exit(1)

# Find the start of the text field
line_start = content.rfind('text: "', 0, idx)
if line_start == -1:
    line_start = content.rfind("text: '", 0, idx)
if line_start == -1:
    print('TEXT START NOT FOUND')
    exit(1)

# Find where this text assignment ends: the next '},' on its own (end of choices array)
# Actually, let me find the closing of the text string and the closing of the scene object
text_end = content.find('",', idx + 30)  # end of text string
if text_end == -1:
    print('TEXT END NOT FOUND')
    exit(1)

old = content[line_start:text_end + 2]  # include '",'

new = '''text: function(vars) {
      let wpn = "手中的家伙";
      if (vars.hasIronPipe) wpn = "铁管";
      else if (vars.hasCane) wpn = "拐杖";
      else if (vars.hasMopHandle) wpn = "拖把杆";
      return "你举起" + wpn + "，干脆利落地给了被压住的丧尸一下。它终于安静了。\\n\\
\t办公室里安静了下来。你环顾四周——文件柜里有一些没开封的瓶装水，办公桌抽屉里还有半包压缩饼干。虽然不多，但够你撑一阵子。\\n\\
\t更重要的是——你现在可以锁上图书馆的门，把这里变成一个安全的落脚点。窗户结实，大门能锁，只有一道消防通道需要守住。\\n你花了些时间把大厅和阅览室的窗帘拉上，把前门反锁。这个小小的图书馆，在这座沦陷的城市里，成了你暂时的庇护所。";
    },"''

content = content[:line_start] + new + content[text_end + 2:]
with open('story/东明社区图书馆.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')
