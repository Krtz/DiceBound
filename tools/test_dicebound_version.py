#!/usr/bin/env python3
from dicebound_version import (
    release_tag,
    require_current_version,
    require_supported_version,
    windows_file_version,
)


assert require_supported_version("0.6.1") == "0.6.1"
assert require_supported_version("0.6.2.1") == "0.6.2.1"
assert require_supported_version("0.6.1-recovery") == "0.6.1-recovery"
assert require_current_version("0.6.2.1") == "0.6.2.1"
assert windows_file_version("0.6.1") == "0.6.1.0"
assert windows_file_version("0.6.2.1") == "0.6.2.1"
assert release_tag("Beta", "0.6.2.1") == "beta-0.6.2.1"

for invalid in ("0.6", "0.6.2.1.5", "v0.6.2.1", "0.6.x.1", ""):
    try:
        require_supported_version(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError(f"invalid DiceBound version accepted: {invalid!r}")

for historical in ("0.6.1", "0.6.1-recovery"):
    try:
        require_current_version(historical)
    except ValueError:
        pass
    else:
        raise AssertionError(f"historical version accepted for new PR: {historical!r}")

try:
    windows_file_version("0.6.70000.1")
except ValueError:
    pass
else:
    raise AssertionError("oversized VERSIONINFO component accepted")

print("DiceBound version policy PASS: historical 3-part compatibility, current 4-part identity and VERSIONINFO")
