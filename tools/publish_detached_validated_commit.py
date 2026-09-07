#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import os
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(os.environ["GITHUB_WORKSPACE"]).resolve()
REPO = os.environ["GITHUB_REPOSITORY"]
TOKEN = os.environ["GITHUB_TOKEN"]
API = f"https://api.github.com/repos/{REPO}"


def git(*args: str, binary: bool = False):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=not binary)


def api(method: str, path: str, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API}{path}", data=data, method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "DiceBound-validated-commit-publisher",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as response:
        return json.load(response)


base_sha = git("rev-parse", "origin/main").strip()
head_sha = git("rev-parse", "HEAD").strip()
base_commit = api("GET", f"/git/commits/{base_sha}")
base_tree = base_commit["tree"]["sha"]

raw = git("diff", "--name-status", "-z", base_sha, head_sha, binary=True)
parts = raw.split(b"\0")
entries = []
i = 0
while i < len(parts) and parts[i]:
    status = parts[i].decode("utf-8")
    i += 1
    if status.startswith(("R", "C")):
        old_path = parts[i].decode("utf-8"); new_path = parts[i + 1].decode("utf-8"); i += 2
        if status.startswith("R"):
            entries.append({"path": old_path, "mode": "100644", "type": "blob", "sha": None})
        path = new_path
    else:
        path = parts[i].decode("utf-8"); i += 1

    if status.startswith("D"):
        entries.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
        continue

    blob_bytes = git("show", f"{head_sha}:{path}", binary=True)
    blob = api("POST", "/git/blobs", {
        "content": base64.b64encode(blob_bytes).decode("ascii"),
        "encoding": "base64",
    })
    mode_line = git("ls-tree", head_sha, "--", path).strip()
    mode = mode_line.split(None, 1)[0] if mode_line else "100644"
    entries.append({"path": path, "mode": mode, "type": "blob", "sha": blob["sha"]})

if not entries:
    raise SystemExit("No validated changes found relative to origin/main")

new_tree = api("POST", "/git/trees", {"base_tree": base_tree, "tree": entries})
new_commit = api("POST", "/git/commits", {
    "message": "Beta 0.6.6.13 — extract Elemental Proc / Effect resolution",
    "tree": new_tree["sha"],
    "parents": [base_sha],
})
sha = new_commit["sha"]
print(f"VALIDATED_BASE_SHA={base_sha}")
print(f"VALIDATED_TREE_SHA={new_tree['sha']}")
print(f"VALIDATED_COMMIT_SHA={sha}")
print(f"VALIDATED_CHANGED_PATHS={len(entries)}")
