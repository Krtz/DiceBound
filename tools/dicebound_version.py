#!/usr/bin/env python3
"""Shared DiceBound version parsing and release-identity helpers."""
from __future__ import annotations

import re


VERSION_PATTERN = r"\d+\.\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?"
VERSION_RE = re.compile(rf"{VERSION_PATTERN}\Z")
CURRENT_VERSION_RE = re.compile(r"\d+\.\d+\.\d+\.\d+\Z")


def require_supported_version(value: str) -> str:
    version = str(value).strip()
    if not VERSION_RE.fullmatch(version):
        raise ValueError(
            f"invalid DiceBound version {version!r}; expected three historical or four current numeric components"
        )
    return version


def require_current_version(value: str) -> str:
    version = require_supported_version(value)
    if not CURRENT_VERSION_RE.fullmatch(version):
        raise ValueError(f"new DiceBound work requires four numeric components, got {version!r}")
    return version


def windows_file_version(value: str) -> str:
    version = require_supported_version(value)
    core = re.split(r"[-+]", version, maxsplit=1)[0]
    parts = [int(part) for part in core.split(".")]
    if any(part > 65535 for part in parts):
        raise ValueError(f"Windows VERSIONINFO components must be <= 65535: {version!r}")
    return ".".join(str(part) for part in (parts + [0])[:4])


def channel_slug(channel: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(channel).lower()).strip("-")
    if not slug:
        raise ValueError(f"invalid release channel {channel!r}")
    return slug


def release_tag(channel: str, version: str) -> str:
    return f"{channel_slug(channel)}-{require_supported_version(version)}"
