#!/usr/bin/env python3
import json
import re
import sys
import subprocess

def bump_version(part="patch"):
    # 1. Read package.json
    with open("package.json", "r") as f:
        pkg = json.load(f)
    
    current_ver = pkg.get("version", "1.0.1")
    parts = list(map(int, current_ver.split(".")))
    while len(parts) < 3:
        parts.append(0)
    
    if part == "major":
        parts[0] += 1
        parts[1] = 0
        parts[2] = 0
    elif part == "minor":
        parts[1] += 1
        parts[2] = 0
    else:  # patch
        parts[2] += 1
    
    new_ver = f"{parts[0]}.{parts[1]}.{parts[2]}"
    print(f"Bumping version: {current_ver} -> {new_ver}")

    # Update package.json
    pkg["version"] = new_ver
    with open("package.json", "w") as f:
        json.dump(pkg, f, indent=2)
        f.write("\n")

    # 2. Update android/app/build.gradle (versionCode and versionName)
    gradle_path = "android/app/build.gradle"
    with open(gradle_path, "r") as f:
        content = f.read()

    # Increment versionCode
    vc_match = re.search(r"versionCode\s+(\d+)", content)
    if vc_match:
        old_vc = int(vc_match.group(1))
        new_vc = old_vc + 1
        content = re.sub(r"versionCode\s+\d+", f"versionCode {new_vc}", content, count=1)
        print(f"Updated versionCode: {old_vc} -> {new_vc}")
    else:
        new_vc = 1

    content = re.sub(r'versionName\s+"[^"]+"', f'versionName "{new_ver}"', content, count=1)
    with open(gradle_path, "w") as f:
        f.write(content)

    # 3. Update AutoUpdateChecker.jsx fallback version
    checker_path = "src/components/AutoUpdateChecker.jsx"
    try:
        with open(checker_path, "r") as f:
            checker_content = f.read()
        checker_content = re.sub(
            r"DEFAULT_FALLBACK_VERSION\s*=\s*'[^']+'",
            f"DEFAULT_FALLBACK_VERSION = '{new_ver}'",
            checker_content
        )
        with open(checker_path, "w") as f:
            f.write(checker_content)
    except Exception as e:
        print(f"Warning: could not update AutoUpdateChecker: {e}")

    print(f"Successfully bumped project to v{new_ver} (versionCode: {new_vc})")
    return new_ver

if __name__ == "__main__":
    part = sys.argv[1] if len(sys.argv) > 1 else "patch"
    bump_version(part)

