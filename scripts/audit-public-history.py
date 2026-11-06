#!/usr/bin/env python3
"""High-confidence public-source and Git history leak audit.

This catches common credential formats, NOT all possible secrets. GitHub push
protection and independent review remain recommended. No secret values printed.
"""
from __future__ import annotations

import re
import subprocess
import sys

PATTERNS = {
    "GitHub access token": re.compile(r"(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})"),
    "AWS access key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "Supabase secret key": re.compile(r"sb_secret_[A-Za-z0-9_-]{12,}"),
    "Stripe live secret key": re.compile(r"sk_live_[A-Za-z0-9]{12,}"),
    "Google API key": re.compile(r"AIza[0-9A-Za-z_-]{35}"),
    "Private key header": re.compile(r"-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE\s+KEY-----"),
}
SENSITIVE_PATH = re.compile(
    r"(^|/)(?:\.env(?:\..*)?|[^/]*\.(?:pem|p12|pfx|key|sqlite3?|db|sql|dump)|backups?/.*)$",
    re.IGNORECASE,
)


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True, errors="replace")


def main() -> int:
    tracked = git("ls-files", "-z").split(chr(0))
    offending = [path for path in tracked if path and SENSITIVE_PATH.search(path)]
    if offending:
        for path in offending:
            print(f"BLOCKED: sensitive-looking tracked file: {path}")
        return 1

    # Inspect reachable commit *additions*. This also covers historical files
    # since removed from the default branch. Keep findings redacted.
    patch = git("log", "--all", "-p", "--no-ext-diff", "--pretty=format:commit:%H")
    commit = "unknown"
    findings: list[str] = []
    scanned_lines = 0
    for line in patch.splitlines():
        if line.startswith("commit:"):
            commit = line[7:19]
        if not line.startswith("+") or line.startswith("+++"):
            continue
        scanned_lines += 1
        value = line[1:]
        for name, pattern in PATTERNS.items():
            if pattern.search(value):
                findings.append(f"{name} in commit {commit}")
    for item in sorted(set(findings)):
        print("BLOCKED: possible credential:", item)
    if findings:
        return 1
    print(f"PASS: no matching high-confidence secrets in {scanned_lines} Git history additions")
    print("This is not a comprehensive security or ownership certification.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
