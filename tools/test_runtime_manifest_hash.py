#!/usr/bin/env python3
"""Regression coverage for cross-platform runtime build metadata hashes."""
from __future__ import annotations

import tempfile
from pathlib import Path

from runtime_manifest_hash import sha256_runtime_file


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    lf = root / "runtime-lf.js"
    crlf = root / "runtime-crlf.js"
    lf.write_bytes(b"const answer = 42;\nconsole.log(answer);\n")
    crlf.write_bytes(b"const answer = 42;\r\nconsole.log(answer);\r\n")
    assert sha256_runtime_file(lf) == sha256_runtime_file(crlf), (
        "runtime source hash must not depend on Windows CRLF checkout conversion"
    )

    binary_lf = root / "art-lf.png"
    binary_crlf = root / "art-crlf.png"
    binary_lf.write_bytes(b"binary\nasset")
    binary_crlf.write_bytes(b"binary\r\nasset")
    assert sha256_runtime_file(binary_lf) != sha256_runtime_file(binary_crlf), (
        "binary runtime assets must remain byte-exact"
    )

print("Runtime manifest hash PASS: text checkout EOLs are canonical; binary assets remain byte-exact")
