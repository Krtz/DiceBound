#!/usr/bin/env python3
from pathlib import Path

path=Path(__file__).resolve().parents[1]/'runtime/js/dicebound.js'
source=path.read_text(encoding='utf-8')

replacements={
    '  function powerupDisplayDesc(up){return window.DiceboundPowerupRegistry.describe(up,DB_POWERUP_SERVICES);}\n':
    '  function powerupDisplayDesc(up){return dbPowerups.describe(up);}\n',
    "  if(!window.DiceboundPowerupBorrowing||!window.DiceboundEquipment?.pickOrdinaryAffix)throw new Error('Progression/equipment rule modules must load before dicebound.js');\n":
    "  if(!dbPowerups||!window.DiceboundEquipment?.pickOrdinaryAffix)throw new Error('Powerups/progression/equipment rule modules must load before dicebound.js');\n",
}
for old,new in replacements.items():
    count=source.count(old)
    if count!=1:
        raise SystemExit(f'expected exactly one Powerups peer reference to drain, found {count}: {old[:90]!r}')
    source=source.replace(old,new,1)

# The final candidate should no longer coordinate focused Powerup internals
# directly from the compatibility monolith.
for forbidden in ('window.DiceboundPowerupRegistry','window.DiceboundPowerupBorrowing'):
    if forbidden in source:
        raise SystemExit(f'Powerups peer reference remains after drain: {forbidden}')

path.write_text(source,encoding='utf-8')
print('Remaining monolith Powerups peer references drained through DiceboundPowerups')
