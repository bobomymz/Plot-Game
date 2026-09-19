# -*- coding: utf-8 -*-
import glob, re, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "story")
fp = glob.glob(os.path.join(ROOT, "**", "新达汇.js"), recursive=True)[0]
t = open(fp, encoding="utf-8").read()
for kw in ("防火门", "一片死寂", "楼梯井", "电梯厅一片死寂"):
    idxs = [m.start() for m in re.finditer(re.escape(kw), t)]
    print(kw, len(idxs))
    for i in idxs[:6]:
        print("   …", t[max(0,i-30):i+30].replace("\n", "⏎"), "…")
