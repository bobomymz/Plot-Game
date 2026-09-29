# -*- coding: utf-8 -*-
# 工具：把 images/ 下的 PNG/JPG/JPEG 转成 WebP（q80，最长边 1600px）
# 转换成功后删除原图（原图可从 git 历史恢复），并输出 old→new 路径映射到 tools/image-map.json
#
# 用法:
#   python tools/convert-images.py                       # 全量：扫描整个 images/
#   python tools/convert-images.py --only <路径...>       # 只转指定文件（相对项目根，支持 * 通配）
#   python tools/convert-images.py --only <路径...> --keep # 只转指定文件，且保留原图不删
#
# ⚠ 为什么要 --only：全量转按"同目录同名去后缀"生成 webp，会**静默覆盖**已存在的同名
#   webp。实例（2026-09-29）：images/建平/ 里同时存在「挹芬楼-1F休息区-彭奕宸弹琴.jpg」
#   与「…-彭奕宸弹琴.webp」（后者是正式图），全量转会用 jpg 覆盖掉 webp。
#   只补几张新图时请用 --only，避免误伤既有成品图。
import glob
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "images")
# placeholder.png 只有 88 字节，且 CLAUDE.md 约定新剧情占位引用它——保留 PNG 不动
SKIP = {"images/placeholder.png"}
MAX_SIDE = 1600
QUALITY = 80
EXTS = (".png", ".jpg", ".jpeg")

Image.MAX_IMAGE_PIXELS = None  # 图片来源可信，关闭解压炸弹警告


def collect_files():
    """无参数 = 全量扫描 images/；带 --only PAT... = 只取匹配项（PAT 相对项目根，支持 * 通配）。"""
    args = sys.argv[1:]
    only = []
    if "--only" in args:
        i = args.index("--only")
        only = [a for a in args[i + 1:] if not a.startswith("--")]
    if only:
        out = []
        for pat in only:
            hits = glob.glob(os.path.join(ROOT, pat))
            if not hits:
                print("未匹配到文件: {}".format(pat))
            out.extend(hits)
        return out
    out = []
    for dirpath, _dirnames, filenames in os.walk(IMG_DIR):
        for name in filenames:
            if name.lower().endswith(EXTS):
                out.append(os.path.join(dirpath, name))
    return out


def main():
    mapping = {}
    converted = skipped = failed = 0
    before_bytes = after_bytes = 0
    keep = "--keep" in sys.argv[1:]

    files = collect_files()
    total = len(files)

    for f in files:
        rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
        if rel in SKIP:
            skipped += 1
            continue

        new_rel = os.path.splitext(rel)[0] + ".webp"
        new_file = os.path.join(ROOT, new_rel)
        src_size = os.path.getsize(f)
        before_bytes += src_size

        try:
            with Image.open(f) as im:
                if im.mode not in ("RGB", "RGBA"):
                    im = im.convert("RGBA" if "transparency" in im.info else "RGB")
                im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
                im.save(new_file, "WEBP", quality=QUALITY, method=6)

            dst_size = os.path.getsize(new_file)
            if dst_size == 0:
                raise IOError("output is empty")
            after_bytes += dst_size
            if not keep:
                os.remove(f)  # 原图可从 git 历史恢复（--keep 时保留，供未提交的新图先验证）
            mapping[rel] = new_rel
            converted += 1
            if converted % 50 == 0:
                print("进度: {}/{}".format(converted, total))
                sys.stdout.flush()
        except Exception as e:
            failed += 1
            print("失败: {} — {}".format(rel, e))
            if os.path.exists(new_file) and os.path.getsize(new_file) == 0:
                os.remove(new_file)

    # 映射写回：--only 增量转图时**合并**进已有映射，否则会把历史全量映射冲成 1 条
    map_path = os.path.join(ROOT, "tools", "image-map.json")
    merged = {}
    if os.path.exists(map_path):
        try:
            with open(map_path, encoding="utf-8") as fp:
                merged = json.load(fp)
        except Exception:
            merged = {}
    merged.update(mapping)
    with open(map_path, "w", encoding="utf-8") as fp:
        json.dump(merged, fp, ensure_ascii=False, indent=2)

    print("\n===== 完成 =====")
    print("转换 {} 张，跳过 {} 张，失败 {} 张".format(converted, skipped, failed))
    print("体积: {:.1f}MB → {:.1f}MB".format(before_bytes / 1048576, after_bytes / 1048576))
    print("映射已写入 tools/image-map.json（本次 {} 条，累计 {} 条）".format(len(mapping), len(merged)))


if __name__ == "__main__":
    main()
