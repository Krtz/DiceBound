# Post-release asset architecture note

Beta 0.6 itself shipped with the historical asset paths preserved by the adjacent archived build manifest. Issue #29 was implemented **after** that release baseline and introduced the granular semantic asset architecture used by current Git development.

Do not use this note to reinterpret old release hashes or paths; it only explains why current `runtime/assets/` differs from the archived Beta 0.6 browser manifest.
