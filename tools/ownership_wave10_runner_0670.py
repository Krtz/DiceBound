from __future__ import annotations

import ownership_wave10_0670 as wave
import wave10_enemy_presentation_0670 as enemy_presentation

# Apply the focused presentation move before the broad Wave 10 retirement pass.
enemy_presentation.update_presentation()
enemy_presentation.update_monolith()
enemy_presentation.update_pale_devil_id()

# Temporary replay shim; removed before the 0.6.7.0 PR.
def update_combat_presentation() -> int:
    text = wave.COMBAT_PRESENTATION.read_text(encoding='utf-8')
    if 'function enemyPortraitHTML(enemy)' not in text or 'rt.enemyPortraitHTML' in text:
        raise RuntimeError('Combat Presentation enemy portrait ownership is not canonical before Wave 10')
    return 1


strike = wave.STRIKE.read_text(encoding='utf-8')
strike = strike.replace('"getV26FastEcho",', '').replace('"setV26FastEcho",', '')
wave.write(wave.STRIKE, strike)
wave.update_combat_presentation = update_combat_presentation
raise SystemExit(wave.main())
