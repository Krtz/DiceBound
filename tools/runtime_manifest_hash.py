#!/usr/bin/env python3
"""Cross-platform content hashes for the runtime payload metadata."""
from __future__ import annotations

import hashlib
from pathlib import Path


RUNTIME_EXTENSIONS = frozenset({
    ".html", ".css", ".js", ".png", ".ico", ".jpg", ".jpeg", ".webp",
    ".ogg", ".mp3", ".wav", ".webm",
})
TEXT_RUNTIME_EXTENSIONS = frozenset({".html", ".css", ".js"})


def sha256_runtime_file(path: Path) -> str:
    """Hash a runtime file using canonical LF line endings for source text.

    Git may materialize text files as CRLF on Windows even when the committed
    blob uses LF. Runtime metadata is an identity for the *source payload*, so
    it must not change merely because a developer or CI runner uses a different
    checkout setting. Binary artwork/audio remains byte-for-byte hashed.
    """
    data = path.read_bytes()
    if path.suffix.lower() in TEXT_RUNTIME_EXTENSIONS:
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()
