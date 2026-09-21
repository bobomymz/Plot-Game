// 临时探针2：故事字符串 vs 磁盘文件名 字节级对比
const fs = require("fs"), vm = require("vm");
const ctx = vm.createContext({ console });
const html = fs.readFileSync("index.html", "utf8");
const re = /<script src="(story\/[^"]+)"><\/script>/g;
for (const m of html.matchAll(re)) vm.runInContext(fs.readFileSync(m[1], "utf8"), ctx, { filename: m[1] });
const sd = vm.runInContext("storyData", ctx);
const storyImg = sd["建平-弘渊楼-1F-借阅处"].image;
const disk = fs.readdirSync("images/建平").find((f) => f.includes("借阅"));
const diskPath = "images/建平/" + disk;
console.log("story:", JSON.stringify(storyImg));
console.log("disk :", JSON.stringify(diskPath));
console.log("equal:", storyImg === diskPath);
if (storyImg !== diskPath) {
  const a = Buffer.from(storyImg), b = Buffer.from(diskPath);
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if (a[i] !== b[i]) { console.log(`首个差异@${i}: story 0x${(a[i]||0).toString(16)} vs disk 0x${(b[i]||0).toString(16)} | story前后:${JSON.stringify(storyImg.slice(Math.max(0,i-4),i+4))} disk前后:${JSON.stringify(diskPath.slice(Math.max(0,i-4),i+4))}`); break; }
}
