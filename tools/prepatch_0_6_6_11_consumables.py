from pathlib import Path

path=Path('tools/materialize_0_6_6_11_consumables.py')
text=path.read_text(encoding='utf-8')
old="  function v16PotionHealValue(mult=1){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.potionHealValue(mult);}\\n  function recordPotionUseV16(){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.recordPotionUse();}\\n  async function alchemistVolatileFlaskV16()"
new="  function v16PotionHealValue(mult=1){if(dbConsumablesResolution)return dbConsumablesResolution.potionHealValue(mult);return Math.max(1,Math.round((10+player.maxHp*.10)*(1+player.potionPower)*mult));}\\n  function recordPotionUseV16(){if(!dbConsumablesResolution)throw new Error('Consumables owner is not configured.');return dbConsumablesResolution.recordPotionUse();}\\n  async function alchemistVolatileFlaskV16()"
if text.count(old)!=1:
    raise SystemExit(f'expected one Potion helper replacement template, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Consumables materializer bootstrap helper patched')
