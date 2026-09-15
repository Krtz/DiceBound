from __future__ import annotations

import os
import pathlib

import tmp_materialize_0670_chainsaw_v4 as v4
import tmp_fix_0670_startup_owners as startup_owners
import tmp_normalize_0670_source as normalize_source

base=v4.base
ROOT=base.ROOT
MONOLITH=base.MONOLITH
ANTI_RETURN=ROOT/"tools/test_monolith_chainsaw.py"


def augment_anti_return()->None:
    text=ANTI_RETURN.read_text(encoding="utf-8")
    if "STALE_STARTUP_ALIASES=" not in text:
        marker="KILLED="
        line_start=text.index(marker)
        line_end=text.index("\n",line_start)
        text=text[:line_end+1]+"STALE_STARTUP_ALIASES=['db0512GateRewards','db0512RememberReward','db060GuardianArt','db060GuardianTileArt']\n"+text[line_end+1:]

    old='''    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element owner, {len(KILLED)} shadow delegates absent")'''
    if old in text:
        block='''    # Progression bootstrap must be direct and ordered before legacy-meta repair.\n    early_progression="dbProgression=dbProgressionOwner.configure({"\n    legacy_import="importOldSaveIfNeeded();"\n    repair_call="dbProgression.repairTalentPrerequisites();"\n    assert early_progression in text, "Progression owner is not bootstrapped directly"\n    assert repair_call in text, "legacy-meta repair no longer routes directly to Progression owner"\n    assert text.index(early_progression)<text.index(legacy_import), "Progression owner bootstrap must precede legacy-meta repair"\n\n    # Historical startup aliases must stay retired now that their consumers read\n    # canonical Powerup/Guardian/Asset owners directly.\n    for name in STALE_STARTUP_ALIASES:\n        assert not re.search(rf"\\b{re.escape(name)}\\b",code), f"historical startup alias {name} returned"\n    assert "DB0512_GLOBAL_POWER_IDS" in text, "0.5.12 regression snapshot no longer reads canonical powerup metadata"\n    assert "DB317_GUARDIANS.resolveById" in text, "guardian consumers no longer route through the Guardian owner"\n    assert "window.DiceboundAssets.resolveGuardianArt" in text, "secret-boss art fallback no longer routes through DiceboundAssets"\n\n    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element owner, {len(KILLED)} shadow delegates absent, Progression bootstrap ordered, startup aliases retired")'''
        text=text.replace(old,block,1)
    elif "startup aliases retired" not in text:
        raise RuntimeError("Could not augment monolith chainsaw anti-return test")
    ANTI_RETURN.write_text(text,encoding="utf-8",newline="\n")


def main()->int:
    text=MONOLITH.read_text(encoding="utf-8")
    before_lines=text.count("\n")+1
    before_bytes=len(text.encode("utf-8"))

    text,dead_nodes,dead_statements,removed_names=base.delete_dead_proxy_statements(text)
    text=base.replace_element_content(text)
    text,killed,skipped=base.eliminate_delegates(text)

    previous=os.environ.get("CHAINSAW_SUPPORT_NAMES")
    os.environ["CHAINSAW_SUPPORT_NAMES"]="v16Talents"
    try:
        text,support=base.remove_dead_support_declarations(text,removed_names)
    finally:
        if previous is None:
            os.environ.pop("CHAINSAW_SUPPORT_NAMES",None)
        else:
            os.environ["CHAINSAW_SUPPORT_NAMES"]=previous

    MONOLITH.write_text(text,encoding="utf-8",newline="\n")
    base.ELEMENT_MODULE.write_text(base.ELEMENT_MODULE_TEXT,encoding="utf-8",newline="\n")
    base.update_manifest()

    # The raw structural cuts expose two historical startup aliases whose live
    # consumers must be rerouted semantically before the aliases themselves die.
    startup_owners.main()
    normalize_source.main()

    # Generate the structural anti-return test from the exact killed-delegate
    # set, then extend it with the semantic startup-owner invariants.
    base.write_anti_return(killed)
    augment_anti_return()

    final=MONOLITH.read_text(encoding="utf-8")
    after_lines=final.count("\n")+1
    after_bytes=len(final.encode("utf-8"))
    base.update_notes(before_lines,before_bytes,after_lines,after_bytes,killed,dead_nodes,dead_statements,support)

    print(
        f"0.6.7.0 integrated chainsaw: {before_lines}->{after_lines} lines, "
        f"{before_bytes}->{after_bytes} bytes; dead={dead_nodes}/{dead_statements}; "
        f"delegates={len(killed)}; support={','.join(support) or 'none'}"
    )
    if skipped:
        print("Preserved first-class seams:","; ".join(skipped))
    return 0


if __name__=="__main__":
    import tmp_materialize_0670_chainsaw_v6 as v6
    raise SystemExit(v6.main())
