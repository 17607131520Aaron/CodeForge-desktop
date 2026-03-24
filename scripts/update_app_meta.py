from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

# ====== Configure these two variables ======
APP_NAME = "AI助理调试工具"
ICON_PATH = "src/assets/app_icon.jpg"
# ===========================================

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_JSON_PATH = ROOT / "package.json"
FORGE_CONFIG_PATH = ROOT / "forge.config.ts"
MAIN_TS_PATH = ROOT / "src" / "main.ts"
GENERATED_ICNS_PATH = ROOT / "src" / "assets" / "app_icon.generated.icns"

sys.dont_write_bytecode = True


def update_package_json() -> None:
    data = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))
    data["productName"] = APP_NAME

    PACKAGE_JSON_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def replace_once(content: str, pattern: str, replacement: str, description: str) -> str:
    updated, count = re.subn(pattern, replacement, content, count=1, flags=re.MULTILINE)
    if count == 0:
        raise ValueError(f"Could not find {description} in {FORGE_CONFIG_PATH.name}")
    return updated


def update_forge_config() -> str:
    content = FORGE_CONFIG_PATH.read_text(encoding="utf-8")
    packager_icon_path = build_packager_icon()

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
        rf'\1"{APP_NAME}"',
        "packagerConfig.name",
    )

    FORGE_CONFIG_PATH.write_text(content, encoding="utf-8")
    return packager_icon_path


def build_packager_icon() -> str:
    """
    Return packaging icon path with platform validation.
    On macOS, Electron packaging icon requires .icns.
    """
    source = ROOT / ICON_PATH
    if not source.exists():
        raise FileNotFoundError(f"Missing icon file: {source}")

    if sys.platform != "darwin":
        return ICON_PATH

    if source.suffix.lower() == ".icns":
        return ICON_PATH

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


def update_main_ts() -> None:
    content = MAIN_TS_PATH.read_text(encoding="utf-8")

    content = replace_once(
        content,
        r'(^\s*const APP_DISPLAY_NAME = )["\'][^"\']*["\'];',
        rf'\1"{APP_NAME}";',
        "APP_DISPLAY_NAME",
    )

    content = replace_once(
        content,
        r'(^\s*const APP_ICON_PATH = )["\'][^"\']*["\'];',
        rf'\1"{ICON_PATH}";',
        "APP_ICON_PATH",
    )

    MAIN_TS_PATH.write_text(content, encoding="utf-8")


def main() -> None:
    if not PACKAGE_JSON_PATH.exists():
        raise FileNotFoundError(f"Missing file: {PACKAGE_JSON_PATH}")
    if not FORGE_CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing file: {FORGE_CONFIG_PATH}")
    if not MAIN_TS_PATH.exists():
        raise FileNotFoundError(f"Missing file: {MAIN_TS_PATH}")

    update_package_json()
    packager_icon_path = update_forge_config()
    update_main_ts()

    print("Updated app metadata successfully:")
    print(f"- productName (package.json): {APP_NAME}")
    print(f"- packagerConfig.name (forge.config.ts): {APP_NAME}")
    print(f"- packagerConfig.icon (forge.config.ts): {packager_icon_path}")
    print(f"- APP_DISPLAY_NAME (src/main.ts): {APP_NAME}")
    print(f"- APP_ICON_PATH (src/main.ts): {ICON_PATH}")


if __name__ == "__main__":
    main()
