#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_JSON_PATH = ROOT / "package.json"
DEFAULT_OUTPUT_PATH = ROOT / "release-notes.md"


def run_git(args: list[str], allow_error: bool = False) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0 and not allow_error:
        raise RuntimeError(proc.stderr.strip() or f"git {' '.join(args)} failed")
    return proc.stdout.strip()


def read_version() -> str:
    data = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))
    version = data.get("version")
    if not isinstance(version, str) or not version.strip():
        raise ValueError("package.json version is missing")
    return version


def get_last_tag() -> str | None:
    tag = run_git(["describe", "--tags", "--abbrev=0"], allow_error=True)
    return tag if tag else None


def collect_commits(last_tag: str | None, fallback_limit: int) -> list[str]:
    if last_tag:
        log_out = run_git(["log", f"{last_tag}..HEAD", "--pretty=format:%s"])
    else:
        log_out = run_git(["log", f"-n{fallback_limit}", "--pretty=format:%s"])

    commits = []
    for line in log_out.splitlines():
        text = line.strip()
        if text:
            commits.append(text)
    return commits


def build_markdown(version: str, last_tag: str | None, commits: list[str]) -> str:
    date_text = dt.datetime.now().strftime("%Y-%m-%d")
    lines = [f"# Release v{version}", "", f"- Date: {date_text}"]
    lines.append(f"- Range: {last_tag}..HEAD" if last_tag else "- Range: last commits (no tag found)")
    lines.extend(["", "## What's Changed", ""])

    if commits:
        lines.extend([f"- {msg}" for msg in commits])
    else:
        lines.append("- Maintenance release with internal improvements.")

    lines.extend(["", "## Full Changelog", "", f"- Compare changes in GitHub Releases for v{version}.", ""])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate release-notes markdown from git commits.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_PATH), help="Output markdown file path")
    parser.add_argument("--fallback-limit", type=int, default=20, help="Commit count when no git tag exists")
    args = parser.parse_args()

    output = Path(args.output).resolve()
    version = read_version()
    last_tag = get_last_tag()
    commits = collect_commits(last_tag, args.fallback_limit)
    content = build_markdown(version, last_tag, commits)

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding="utf-8")

    print(f"Generated release notes: {output}")
    print(f"Version: v{version}")
    print(f"Commits: {len(commits)}")


if __name__ == "__main__":
    main()
