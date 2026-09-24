// 共享：剧情文件加载清单（唯一权威 = index.html 的 <script src="story/*.js">）
//
// 背景（2026-09-24 教训）：9 个审计脚本各自硬编码了一份 FILES 清单，新增 story/复旦江湾.js 时
// 全部漏加 —— 少加载一个文件不报错、只是少一批场景，于是打印的「0 处问题」是**没扫到**而非没问题
// （scene_fn_selftest 还连带误报该章场景「不存在」）。这就是"假绿"。
//
// 根治：所有脚本改为调用本模块，以 index.html 为单一来源。新增剧情文件只要挂进 index.html，
// 审计自动纳入，不再需要人工同步 N 份清单。
//
// 用法：const FILES = require('./story_files').list();
// 安全网：index.html 读不到 / 解析结果异常（< 10 条）时回退内置清单并警告，不让审计静默变空跑。

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// 内置回退清单（顺序 = index.html 加载顺序；仅作安全网，正常情况下不会被用到）
const FALLBACK = [
  'story/utils.js', 'story/core.js', 'story/夜晚剧情.js',
  'story/东明街道/樱桃苑（初始小区）.js', 'story/东明街道/东明街道路径.js',
  'story/东明街道/长者食堂.js', 'story/东明街道/三林菜市场.js',
  'story/东明街道/东明社区图书馆.js', 'story/东明街道/地铁站.js',
  'story/东明街道/五金店.js', 'story/东明街道/益丰大药房.js',
  'story/东明街道/上实南校.js', 'story/东明街道/新达汇.js',
  'story/东明街道/新达汇地下车库.js', 'story/东明街道/全家和公交站.js',
  'story/东明街道/安盛街.js', 'story/东明街道/安居苑.js',
  'story/东明街道/金谊广场.js', 'story/东明街道/警察局.js',
  'story/东明街道/反派NPC.js', 'story/上海市区路径.js',
  'story/仁济南院.js', 'story/建平中学.js', 'story/复旦江湾.js', 'story/张江.js'
];

// 最低合理条数：低于此值视为解析失败（防止正则失配导致"零文件、零问题"的假绿）
const MIN_EXPECTED = 10;

function list() {
  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const files = [...html.matchAll(/<script src="(story\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
    if (files.length >= MIN_EXPECTED) {
      if (files.length !== FALLBACK.length) {
        console.warn('[story_files] 注意：index.html 解析出 ' + files.length + ' 个 story 文件，'
          + '内置回退清单为 ' + FALLBACK.length + ' 个 —— 回退清单已过期，请同步（审计以 index.html 为准，本次结果有效）。');
      }
      return files;
    }
    console.warn('[story_files] index.html 仅解析出 ' + files.length + ' 个 story 文件（< ' + MIN_EXPECTED
      + '），判定为解析异常，回退内置清单。');
  } catch (e) {
    console.warn('[story_files] index.html 读取失败（' + e.message + '），回退内置清单。');
  }
  return FALLBACK.slice();
}

module.exports = { list, FALLBACK };
