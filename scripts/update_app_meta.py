from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = Path(__file__).resolve().parent.parent
APP_CONFIG_PATH = ROOT / "app.json"
PACKAGE_JSON_PATH = ROOT / "package.json"
FORGE_CONFIG_PATH = ROOT / "forge.config.ts"
MAIN_TS_PATH = ROOT / "src" / "main.ts"
GENERATED_ICNS_PATH = ROOT / "src" / "assets" / "app_icon.generated.icns"

sys.dont_write_bytecode = True


def load_app_config() -> dict[str, str]:
    if not APP_CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing file: {APP_CONFIG_PATH}")

    data = json.loads(APP_CONFIG_PATH.read_text(encoding="utf-8"))
    app_name = str(data.get("appName", "")).strip()
    icon_path = str(data.get("iconPath", "")).strip()
    app_version = str(data.get("appVersion", "")).strip()
    update_repo = str(data.get("updateRepo", "")).strip()
    if not app_name:
        raise ValueError("app.json: appName is required")
    if not icon_path:
        raise ValueError("app.json: iconPath is required")
    if not update_repo or "/" not in update_repo:
        raise ValueError("app.json: updateRepo must be in format owner/repo")

    owner, repo = update_repo.split("/", 1)
    if not owner.strip() or not repo.strip():
        raise ValueError("app.json: updateRepo must be in format owner/repo")

    return {
        "app_name": app_name,
        "icon_path": icon_path,
        "app_version": app_version,
        "update_repo": update_repo,
        "repo_owner": owner.strip(),
        "repo_name": repo.strip(),
    }


def update_package_json(app_name: str, app_version: str) -> str:
    data = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))
    effective_version = app_version.strip()
    if not effective_version:
        raise ValueError("app.json: appVersion is required")

    data["productName"] = app_name
    data["version"] = effective_version

    PACKAGE_JSON_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return effective_version


def replace_once(content: str, pattern: str, replacement: str, description: str) -> str:
    updated, count = re.subn(pattern, replacement, content, count=1, flags=re.MULTILINE)
    if count == 0:
        raise ValueError(f"Could not find {description} in {FORGE_CONFIG_PATH.name}")
    return updated


def update_forge_config(app_name: str, icon_path: str, repo_owner: str, repo_name: str) -> str:
    content = FORGE_CONFIG_PATH.read_text(encoding="utf-8")
    packager_icon_path = build_packager_icon(icon_path)

    # Update packager icon path
    content = replace_once(
        content,
        r'(^\s*icon:\s*)["\'][^"\']*["\']',
        rf'\1"{packager_icon_path}"',
        "packagerConfig.icon",
    )

    # Update packager app name (the first `name:` is inside packagerConfig)
    content = replace_once(
        content,
        r'(^\s*name:\s*)["\'][^"\']*["\']',
        rf'\1"{app_name}"',
        "packagerConfig.name",
    )

    content = replace_once(
        content,
        r'(^\s*owner:\s*process\.env\["GITHUB_OWNER"\]\s*\?\?\s*)["\'][^"\']*["\']',
        rf'\1"{repo_owner}"',
        "publishers.repository.owner",
    )
    content = replace_once(
        content,
        r'(^\s*name:\s*process\.env\["GITHUB_REPO"\]\s*\?\?\s*)["\'][^"\']*["\']',
        rf'\1"{repo_name}"',
        "publishers.repository.name",
    )

    FORGE_CONFIG_PATH.write_text(content, encoding="utf-8")
    return packager_icon_path


def build_packager_icon(icon_path: str) -> str:
    """
    Return packaging icon path with platform validation.
    On macOS, Electron packaging icon requires .icns.
    """
    source = ROOT / icon_path
    if not source.exists():
        raise FileNotFoundError(f"Missing icon file: {source}")

    if sys.platform != "darwin":
        return icon_path

    if source.suffix.lower() == ".icns":
        return icon_path

    if Image is None:
        raise RuntimeError(
            "ICON_PATH is not .icns and Pillow is not installed.\n"
            "Run: python3 -m pip install Pillow\n"
            "Or set ICON_PATH to an existing .icns file."
        )

    GENERATED_ICNS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as img:
        # ICNS generation works best with a square image.
        side = min(img.size)
        left = (img.width - side) // 2
        top = (img.height - side) // 2
        cropped = img.crop((left, top, left + side, top + side)).convert("RGBA")
        # Pillow will build multiple icon sizes into one .icns.
        cropped.save(str(GENERATED_ICNS_PATH), format="ICNS", sizes=[(1024, 1024)])

    return GENERATED_ICNS_PATH.relative_to(ROOT).as_posix()


def update_main_ts(app_name: str, icon_path: str, app_version: str, update_repo: str) -> None:
    content = MAIN_TS_PATH.read_text(encoding="utf-8")

    content = replace_once(
        content,
        r'(^\s*const APP_DISPLAY_NAME = )["\'][^"\']*["\'];',
        rf'\1"{app_name}";',
        "APP_DISPLAY_NAME",
    )

    content = replace_once(
        content,
        r'(^\s*const APP_ICON_PATH = )["\'][^"\']*["\'];',
        rf'\1"{icon_path}";',
        "APP_ICON_PATH",
    )

    content = replace_once(
        content,
        r'(^\s*const APP_VERSION = )["\'][^"\']*["\'];',
        rf'\1"{app_version}";',
        "APP_VERSION",
    )
    content = replace_once(
        content,
        r'(^\s*const UPDATE_REPO = )["\'][^"\']*["\'];',
        rf'\1"{update_repo}";',
        "UPDATE_REPO",
    )

    MAIN_TS_PATH.write_text(content, encoding="utf-8")


def main() -> None:
    if not PACKAGE_JSON_PATH.exists():
        raise FileNotFoundError(f"Missing file: {PACKAGE_JSON_PATH}")
    if not FORGE_CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing file: {FORGE_CONFIG_PATH}")
    if not MAIN_TS_PATH.exists():
        raise FileNotFoundError(f"Missing file: {MAIN_TS_PATH}")

    config = load_app_config()
    app_version = update_package_json(config["app_name"], config["app_version"])
    packager_icon_path = update_forge_config(
        config["app_name"],
        config["icon_path"],
        config["repo_owner"],
        config["repo_name"],
    )
    update_main_ts(config["app_name"], config["icon_path"], app_version, config["update_repo"])

    print("Updated app metadata successfully:")
    print(f"- productName (package.json): {config['app_name']}")
    print(f"- version (package.json): {app_version}")
    print(f"- packagerConfig.name (forge.config.ts): {config['app_name']}")
    print(f"- packagerConfig.icon (forge.config.ts): {packager_icon_path}")
    print(f"- APP_DISPLAY_NAME (src/main.ts): {config['app_name']}")
    print(f"- APP_ICON_PATH (src/main.ts): {config['icon_path']}")
    print(f"- APP_VERSION (src/main.ts): {app_version}")
    print(f"- UPDATE_REPO (src/main.ts): {config['update_repo']}")


if __name__ == "__main__":
    main()
