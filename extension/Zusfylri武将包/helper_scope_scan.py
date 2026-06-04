#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from pathlib import Path

WORK_DIR = Path(r"D:/app/noname/resources/app/extension/Zusfylri武将包")
MODULE_DIR = WORK_DIR / "module"
REPORT_FILE = WORK_DIR / "helper_scope_scan_report.json"

HIGH_RISK_PATTERNS = [
    r"\.set\(\s*['\"]ai['\"]",
    r"filterCard\s*:",
    r"filterTarget\s*:",
    r"viewAs\s*:",
    r"viewAsFilter\s*:",
    r"hiddenCard\s*:",
    r"hiddenWuxie\s*:",
    r"onChooseToUse\s*:",
    r"mod\s*:",
    r"intro\s*:",
]

SAFE_PREFIXES = (
    "globalThis.",
    "window.",
    "Zus.",
    "window.Zus.",
    "game.",
    "lib.",
    "get.",
    "player.",
    "target.",
    "event.",
    "trigger.",
    "card.",
    "cards.",
    "result.",
    "_status.",
)

IGNORED_LOCAL_HELPERS = {
    "char",
    "image",
}


def collect_local_helpers(text):
    prefix = text
    module_markers = [
        re.search(r"window\.zusfylriModules\s*\[", text),
        re.search(r"\bvar\s+[A-Za-z_$][\w$]*Module\s*=", text),
    ]
    starts = [m.start() for m in module_markers if m]
    if starts:
        prefix = text[: min(starts)]

    helpers = set()
    patterns = [
        r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(",
        r"\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function\s*\(",
        r"\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>",
    ]
    for pattern in patterns:
        helpers.update(re.findall(pattern, prefix))
    return helpers - IGNORED_LOCAL_HELPERS


def is_prefixed(line, start):
    before = line[:start]
    for prefix in SAFE_PREFIXES:
        if before.endswith(prefix):
            return True
    return False


def scan_file(path):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    helpers = collect_local_helpers(text)
    issues = []

    for index, line in enumerate(lines):
        if not any(re.search(pattern, line) for pattern in HIGH_RISK_PATTERNS):
            continue

        window = lines[index : min(len(lines), index + 45)]
        for offset, candidate in enumerate(window):
            for helper in helpers:
                for match in re.finditer(rf"(?<![\w$.]){re.escape(helper)}\s*\(", candidate):
                    if is_prefixed(candidate, match.start()):
                        continue
                    issues.append(
                        {
                            "line": index + offset + 1,
                            "risk_start_line": index + 1,
                            "helper": helper,
                            "code": candidate.strip(),
                        }
                    )

    deduped = []
    seen = set()
    for issue in issues:
        key = (issue["line"], issue["helper"], issue["code"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(issue)
    return {
        "module": path.name,
        "local_helpers": sorted(helpers),
        "issues": deduped,
    }


def main():
    report = []
    for path in sorted(MODULE_DIR.glob("*.js")):
        item = scan_file(path)
        if item["issues"]:
            report.append(item)

    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"helper 作用域扫描完成：{REPORT_FILE}")
    print(f"发现 {sum(len(item['issues']) for item in report)} 个疑似高危回调局部 helper 引用。")


if __name__ == "__main__":
    main()
