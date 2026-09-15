from __future__ import annotations

import tmp_materialize_0670_chainsaw_v6 as v6


# The released 0.6.6.39 source already retired the V13 capture itself. The
# remaining ladder is still removed and the permanent guard forbids V13 from
# ever returning.
v6.PORTRAIT_ALIASES.discard("classPortraitV13Base")

_original_canonicalize=v6.canonicalize_class_portrait


def canonicalize_class_portrait(text:str):
    # audit_monolith_shadow_ownership.mask_non_code intentionally treats whole
    # template literals as opaque and can therefore hide a later declaration
    # after the historical SVG templates. Structural surgery is AST-based; use
    # raw source only for the final exact-name absence/count assertions.
    original_mask=v6.base.mask_non_code
    v6.base.mask_non_code=lambda value:value
    try:
        return _original_canonicalize(text)
    finally:
        v6.base.mask_non_code=original_mask


v6.canonicalize_class_portrait=canonicalize_class_portrait

_original_augment=v6.augment_anti_return


def augment_anti_return()->None:
    _original_augment()
    path=v6.ANTI_RETURN
    text=path.read_text(encoding="utf-8")
    text=text.replace(
        'assert not re.search(rf"\\b{re.escape(name)}\\b",code), f"historical class portrait alias {name} returned"',
        'assert not re.search(rf"\\b{re.escape(name)}\\b",text), f"historical class portrait alias {name} returned"'
    )
    text=text.replace(
        'assert len(re.findall(r"\\bfunction\\s+classPortraitSVG\\s*\\(",code))==1, "classPortraitSVG must remain one canonical implementation"',
        'assert len(re.findall(r"\\bfunction\\s+classPortraitSVG\\s*\\(",text))==1, "classPortraitSVG must remain one canonical implementation"'
    )
    text=text.replace(
        'assert not re.search(r"\\bclassPortraitSVG\\s*=\\s*function\\b",code), "classPortraitSVG replacement ladder returned"',
        'assert not re.search(r"\\bclassPortraitSVG\\s*=\\s*function\\b",text), "classPortraitSVG replacement ladder returned"'
    )
    path.write_text(text,encoding="utf-8",newline="\n")


v6.augment_anti_return=augment_anti_return


if __name__=="__main__":
    raise SystemExit(v6.main())
