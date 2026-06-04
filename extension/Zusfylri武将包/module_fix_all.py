#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import zipfile
from pathlib import Path

# -------------------------
# 配置
# -------------------------
WORK_DIR = Path(r'd:/app/noname/resources/app/extension/Zusfylri武将包')
MODULE_DIR = WORK_DIR / 'module'
OUTPUT_ZIP = WORK_DIR.parent / 'Zusfylri_debug_final_fixed.zip'

# -------------------------
# 批量修复模块
# -------------------------
module_files = list(MODULE_DIR.glob('*.js'))
print(f'处理 {len(module_files)} 个 module 文件...')

top_vars = ['lib', 'game', 'ui', 'get', 'ai', '_status']

for f in module_files:
    text = f.read_text(encoding='utf-8')

    # 1. 修复空 character
    def replace_null_char(match):
        charid = match.group(1)
        return f'{charid}: char("male", "qun", 3, ["skill1"], "{charid}", "png")'
    text = re.sub(r'(\bzus_[a-zA-Z0-9_]+)\s*:\s*null', replace_null_char, text)

    # 2. 条件声明顶层变量
    for var in top_vars:
        pattern = rf'\bconst\s+{var}\s*=\s*globalThis\.{var}\s*;'
        replacement = f'if (typeof {var} === "undefined") var {var} = globalThis.{var};'
        text = re.sub(pattern, replacement, text)

    # 3. 修复 HP 字符串（示例：将 "3/6" -> 3）
    def fix_hp(match):
        charid = match.group(1)
        gender = match.group(2)
        group = match.group(3)
        hp = match.group(4)
        skills = match.group(5)
        return f'{charid}: char("{gender}", "{group}", {hp.split("/")[0]}, {skills}, "{charid}", "png")'
    text = re.sub(r'(\bzus_[a-zA-Z0-9_]+)\s*:\s*char\(\s*["\'](\w+)["\']\s*,\s*["\'](\w+)["\']\s*,\s*["\']?([\d/]+)["\']?\s*,\s*(\[.*?\])', fix_hp, text)

    # 4. 保证 IIFE 包裹
    if not text.strip().startswith('(function()'):
        text = f'(function() {{\n{text}\n}})();\n'

    f.write_text(text, encoding='utf-8')
    print(f'  修复完成: {f.name}')

# -------------------------
# 打包最终 zip
# -------------------------
print('打包最终 zip...')
with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(WORK_DIR):
        for file in files:
            file_path = Path(root) / file
            # 排除备份目录
            if 'module_backup' in str(file_path):
                continue
            arcname = file_path.relative_to(WORK_DIR)
            zf.write(file_path, arcname)

print(f'完成: {OUTPUT_ZIP} 已生成')