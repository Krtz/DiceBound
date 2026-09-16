from __future__ import annotations

import re
import ownership_wave10_0670 as wave


def update_combat_presentation() -> int:
    text = wave.COMBAT_PRESENTATION.read_text(encoding='utf-8')
    text = re.sub(r'"enemyPortraitHTML",?', '', text)
    if 'enemyPortraitHTML' in text:
        raise RuntimeError('Dead enemyPortraitHTML dependency survived Combat Presentation cleanup')
    wave.write(wave.COMBAT_PRESENTATION, text)
    return 1


wave.update_combat_presentation = update_combat_presentation
raise SystemExit(wave.main())
