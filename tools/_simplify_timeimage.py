"""
简化 timeImage 调用：去除 redundant 的 evening/midnight 参数。
规则：
1. 如果 evening == night == midnight（文字相同），只保留 morning 和 night
2. 如果 morning == evening == night == midnight（全相同），只保留 morning
3. 跳过已经只有 ≤2 个参数的调用
"""
import re
import glob
import os

STORY_DIR = r"D:\我的U盘\波波\AI\小游戏\剧情游戏\尸潮笔记\story"

def simplify_timeimage_block(match):
    full = match.group(0)
    # 提取块内的内容
    inner = match.group(1)

    # 解析键值对
    entries = re.findall(r'(morning|evening|night|midnight)\s*:\s*(.+?)(?:,\s*|$)', inner)
    if len(entries) <= 2:
        return full  # 已经简化过了

    d = {k: v.strip() for k, v in entries}

    # 情况1: 所有4个都相同 → 只留 morning
    if len(set(d.values())) == 1 and len(d) >= 3:
        return full.replace(inner, f"morning: {d['morning']}\n")

    # 情况2: evening == night == midnight，但 morning 不同 → 只留 morning + night
    if 'evening' in d and 'night' in d and 'midnight' in d:
        if d['evening'] == d['night'] == d['midnight']:
            # 移除 evening 和 midnight，保留 morning 和 night
            new_inner = inner
            # 去掉 evening 行
            new_inner = re.sub(r'\s*evening\s*:.+?(?:,\s*\n|\n)', '\n', new_inner)
            # 去掉 midnight 行
            new_inner = re.sub(r'\s*midnight\s*:.+?(?:,\s*\n|\n)', '\n', new_inner)
            # 清理多余逗号
            new_inner = new_inner.replace(',\n', '\n')
            return full.replace(inner, new_inner)

    return full

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 匹配 timeImage({...})
    # 注意：块可能跨多行，使用非贪婪匹配
    pattern = r'timeImage\(\{([^}]+)\}\)'
    content = re.sub(pattern, simplify_timeimage_block, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

if __name__ == '__main__':
    files = glob.glob(os.path.join(STORY_DIR, '*.js'))
    changed = []
    for fpath in sorted(files):
        if process_file(fpath):
            changed.append(os.path.basename(fpath))

    print(f"修改了 {len(changed)} 个文件:")
    for f in changed:
        print(f"  - {f}")
