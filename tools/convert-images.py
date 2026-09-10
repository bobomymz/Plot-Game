# -*- coding: utf-8 -*-
# 一次性工具：把 images/ 下所有 PNG/JPG/JPEG 转成 WebP（q80，最长边 1600px）
# 转换成功后删除原图（原图可从 git 历史恢复），并输出 old→new 路径映射到 tools/image-map.json
# 用法: python tools/convert-images.py
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


def main():
    mapping = {}
    converted = skipped = failed = 0
    before_bytes = after_bytes = 0

    files = []
    for dirpath, _dirnames, filenames in os.walk(IMG_DIR):
        for name in filenames:
            if name.lower().endswith(EXTS):
                files.append(os.path.join(dirpath, name))
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
            os.remove(f)  # 原图可从 git 历史恢复
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

    with open(os.path.join(ROOT, "tools", "image-map.json"), "w", encoding="utf-8") as fp:
        json.dump(mapping, fp, ensure_ascii=False, indent=2)

    print("\n===== 完成 =====")
    print("转换 {} 张，跳过 {} 张，失败 {} 张".format(converted, skipped, failed))
    print("体积: {:.1f}MB → {:.1f}MB".format(before_bytes / 1048576, after_bytes / 1048576))
    print("映射已写入 tools/image-map.json（{} 条）".format(len(mapping)))


if __name__ == "__main__":
    main()
