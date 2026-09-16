from __future__ import annotations

import ownership_wave10_0670 as wave


def update_combat_presentation() -> int:
    text = wave.COMBAT_PRESENTATION.read_text(encoding='utf-8')
    text = text.replace('enemyPortraitHTML', '')
    wave.write(wave.COMBAT_PRESENTATION, text)
    return 1


strike = wave.STRIKE.read_text(encoding='utf-8')
strike = strike.replace('"getV26FastEcho",', '').replace('"setV26FastEcho",', '')
wave.write(wave.STRIKE, strike)
wave.update_combat_presentation = update_combat_presentation
raise SystemExit(wave.main())
