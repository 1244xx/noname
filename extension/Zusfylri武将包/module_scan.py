#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from pathlib import Path
import json

# -------------------------
# 配置
# -------------------------
WORK_DIR = Path(r'd:/app/noname/resources/app/extension/Zusfylri武将包')
MODULE_DIR = WORK_DIR / 'module'
REPORT_FILE = WORK_DIR / 'module_scan_report.json'

# -------------------------
# 扫描模块
# -------------------------
module_files = list(MODULE_DIR.glob('*.js'))
report = []

top_vars = ['lib', 'ui', 'get', 'ai', '_status']
global_funcs = ['game.zusHongyuGetMaster', 'game.zusMoGetXingyanCardByLink', 'game.zusIsGuyanTarget']

for f in module_files:
    data = {
        'module': f.name,
        'characters': [],
        'sort': [],
        'hp_issues': [],
        'top_var_access': [],
        'global_func_access': []
    }

    text = f.read_text(encoding='utf-8')

    # 1. 扫描 character 定义
    char_matches = re.findall(r'(\bzus_[a-zA-Z0-9_]+)\s*:\s*(char\([^\)]*\)|null)', text)
    for charid, expr in char_matches:
        data['characters'].append(charid)
        # 检查 HP 非数值
        hp_match = re.search(r'char\(\s*["\']\w+["\']\s*,\s*["\']\w+["\']\s*,\s*([^\s,]+)', expr)
        if hp_match:
            hp_val = hp_match.group(1)
            if not re.match(r'^\d+$', hp_val):
                data['hp_issues'].append({'charid': charid, 'hp': hp_val})

    # 2. 扫描 sort 数组
    sort_match = re.search(r'sort\s*:\s*\[([^\]]*)\]', text, re.S)
    if sort_match:
        sort_list = re.findall(r'\"(zus_[^\"]+)\"', sort_match.group(1))
        data['sort'] = sort_list
        # 检查 sort 中是否有 character 未定义
        for s in sort_list:
            if s not in data['characters']:
                data.setdefault('sort_mismatch', []).append(s)

    # 3. 顶层裸变量访问
    top_text = text.split('window.zusfylriModules', 1)[0]
    for var in top_vars:
        if re.search(rf'(?<![.\w]){var}\.', top_text):
            data['top_var_access'].append(var)

    # 4. 全局辅助函数访问
    for func in global_funcs:
        if func in text:
            data['global_func_access'].append(func)

    report.append(data)

# -------------------------
# 输出报告
# -------------------------
with REPORT_FILE.open('w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print(f'扫描完成，报告已生成：{REPORT_FILE}')
print('每个 module 的角色数、HP 问题、sort 对齐和潜在顶层访问风险都在报告中。')