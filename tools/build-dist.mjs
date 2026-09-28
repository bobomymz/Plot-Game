#!/usr/bin/env node
// Netlify 构建脚本：两层白名单复制核心运行文件到 dist/（netlify.toml 的 build.command 调用）。
// 背景：build.command 在「本地 Windows（netlify deploy）」和「云端 Ubuntu（Git 集成构建）」
// 都要能跑，所以不用 rsync/cp 等 Unix 工具（Windows 没有 rsync），用纯 Node 跨平台实现。
//
// 两层白名单，防止设计文档/源文件/脚本泄漏到线上：
//   顶层：index.html / style.css / engine.js / story/ / images/
//   扩展名：story 只收 .js（挡 story/尸潮安全屋.md 等设计笔记）；
//          images 只收图片格式（挡 草稿/*.psd、*.excalidraw、爬虫.py、*.html 等杂物）
//
// ⚠ 维护提示（白名单的代价是新增要手动登记）：
//   - 新增运行时必需的顶层文件/目录（如 sounds/、favicon.ico）→ 加进 TOP_FILES / DIR_RULES
//   - 新增图片格式（如 .avif）→ 加进 images 的扩展名列表
//   - 本地直接开 index.html 不走本脚本，漏登记时只有线上缺资源，察觉不到

import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

// ---- 白名单清单（新增运行资源来这里登记） ----
const TOP_FILES = ['index.html', 'style.css', 'engine.js'];
const DIR_RULES = {
  story: ['.js'],
  images: ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg'],
};

// 干净重建：清掉上次构建的残留，防止已删除/改名的文件混进发布目录
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

let copied = 0;
for (const name of TOP_FILES) {
  copyFileSync(join(ROOT, name), join(DIST, name));
  copied++;
}

for (const [dir, exts] of Object.entries(DIR_RULES)) {
  const walk = (cur) => {
    for (const name of readdirSync(cur)) {
      const src = join(cur, name);
      if (statSync(src).isDirectory()) { walk(src); continue; }
      if (!exts.includes(extname(name).toLowerCase())) continue; // 扩展名白名单
      const rel = relative(join(ROOT, dir), src);
      const dest = join(DIST, dir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      copied++;
    }
  };
  walk(join(ROOT, dir));
}

console.log('[build-dist] dist/ 构建完成：' + copied + ' 个文件（' +
  TOP_FILES.length + ' 顶层 + story/*.js + images 图片）');
