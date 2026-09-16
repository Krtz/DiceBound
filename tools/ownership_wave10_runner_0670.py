from __future__ import annotations

import pathlib
import subprocess
import ownership_wave10_0670 as wave
import wave10_enemy_presentation_0670 as enemy_presentation

# Apply the focused presentation move before the broad Wave 10 retirement pass.
enemy_presentation.update_presentation()
enemy_presentation.update_monolith()
enemy_presentation.update_pale_devil_id()
# The temporary workflow's final git-add list predates this focused Board fix.
# Stage it here so it is committed only after every later gate passes.
subprocess.run(['git','add','runtime/js/board/generation.js'],check=True)

# Universal Echo timing now belongs to strike resolution. Ultimate resolution must
# not reintroduce class-specific Frog/Ouroboros timing caps around the same action.
ultimate_path = pathlib.Path('runtime/js/combat/ultimate-resolution.js')
ultimate = ultimate_path.read_text(encoding='utf-8')
ultimate = ultimate.replace('"potionHealValue","getPets","getGagInfo","slimeRougeUltimate","getFastEchoCap","setFastEchoCap","frogEchoCap",',
                            '"potionHealValue","getPets","getGagInfo","slimeRougeUltimate",')
old_speed_layer = '''  async function v27OuroborosSpeed() {
    const rt = requireRuntime(), p = player();
    if (p.classId !== "ouroboros") return v25FrogPoisonLifetime();
    const oldCap = rt.getFastEchoCap() || 0, echo = p.doubleStrike || 0; rt.setFastEchoCap(echo >= 50 ? 8 : echo >= 10 ? 28 : 90);
    try { return await v25FrogPoisonLifetime(); }
    finally { rt.setFastEchoCap(oldCap); }
  }

  async function v28FrogSpeedAndSlimeRouge() {
    const rt = requireRuntime(), p = player();
    if (p.classId === "slimerouge") return rt.slimeRougeUltimate();
    if (p.classId !== "frog") return v27OuroborosSpeed();
    const oldCap = rt.getFastEchoCap() || 0, cap = rt.frogEchoCap(p.doubleStrike || 0); if (cap) rt.setFastEchoCap(cap);
    try { return await v27OuroborosSpeed(); }
    finally { rt.setFastEchoCap(oldCap); }
  }
'''
current_dispatch = '''  async function currentClassUltimate() {
    const rt = requireRuntime(), p = player();
    if (p.classId === "slimerouge") return rt.slimeRougeUltimate();
    return v25FrogPoisonLifetime();
  }
'''
if old_speed_layer not in ultimate:
    raise RuntimeError('Ultimate Echo-speed predecessor layer is not in the expected Wave 10 shape')
ultimate = ultimate.replace(old_speed_layer, current_dispatch)
ultimate = ultimate.replace('v28FrogSpeedAndSlimeRouge()', 'currentClassUltimate()')
ultimate = ultimate.replace('v25FrogPoisonLifetime, v27OuroborosSpeed, v28FrogSpeedAndSlimeRouge, unstableUltimate',
                            'v25FrogPoisonLifetime, currentClassUltimate, unstableUltimate')
if any(marker in ultimate for marker in ('frogEchoCap','v27OuroborosSpeed','v28FrogSpeedAndSlimeRouge','getFastEchoCap','setFastEchoCap')):
    raise RuntimeError('Class-specific Ultimate Echo-speed layer survived Wave 10 cleanup')
ultimate_path.write_text(ultimate, encoding='utf-8')
subprocess.run(['git','add','runtime/js/combat/ultimate-resolution.js'],check=True)

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
