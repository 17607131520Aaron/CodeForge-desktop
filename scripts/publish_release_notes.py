#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_CONFIG_PATH = ROOT / "app.json"
PACKAGE_JSON_PATH = ROOT / "package.json"
NOTES_PATH = ROOT / "release-notes.md"


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, cwd=ROOT, check=True)


def load_token_from_app_config() -> None:
    if os.environ.get("GITHUB_TOKEN"):
        return
    if not APP_CONFIG_PATH.exists():
        return
    data = json.loads(APP_CONFIG_PATH.read_text(encoding="utf-8"))
    token = str(data.get("githubToken", "")).strip()
    if token:
        os.environ["GITHUB_TOKEN"] = token


def read_version() -> str:
    data = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))
    version = data.get("version")
    if not isinstance(version, str) or not version:
        raise ValueError("package.json version is missing")
    return version


def main() -> None:
    if not NOTES_PATH.exists():
        raise FileNotFoundError("release-notes.md not found. Run generate step first.")
    load_token_from_app_config()
    if not os.environ.get("GITHUB_TOKEN"):
        raise EnvironmentError(
            "Missing GITHUB_TOKEN.\n"
            "Set it in app.json (githubToken), for example:\n"
            '  "githubToken": "ghp_xxx"\n\n'
            "Or temporary for current terminal:\n"
            "  export GITHUB_TOKEN=ghp_xxx\n"
            "Then rerun:\n"
            "  pnpm release:publish"
        )

    version = read_version()
    tag = f"v{version}"

    run(["pnpm", "run", "publish"])
    run(["gh", "release", "edit", tag, "--notes-file", str(NOTES_PATH)])

    print(f"Updated release notes for tag {tag}")


if __name__ == "__main__":
    main()
