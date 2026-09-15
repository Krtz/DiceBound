from __future__ import annotations

import pathlib
import re

import tmp_materialize_0670_chainsaw_v5 as v5

base=v5.base
ROOT=base.ROOT
MONOLITH=base.MONOLITH
ASSETS=ROOT/"runtime/js/assets.js"
ANTI_RETURN=ROOT/"tools/test_monolith_chainsaw.py"
MYTHICAL_TEST=ROOT/"tools/test_canonical_mythical_set_summary.py"
PORTRAIT_TEST=ROOT/"tools/test_canonical_class_portrait.py"

# V13 was already absent from the released 0.6.6.39 source. The remaining
# predecessor captures are required inputs to this surgery; every historical
# name, including V13, is forbidden in the resulting runtime.
PORTRAIT_ALIASES={
    "classPortraitV15Patch",
    "classPortraitV16Base",
    "classPortraitV18Base",
    "classPortraitBeta042Base",
    "db054LegacyPortraitSVG",
}
PORTRAIT_FORBIDDEN_ALIASES={"classPortraitV13Base",*PORTRAIT_ALIASES}


def _node_name(source:bytes,node)->str|None:
    ident=node.child_by_field_name("name")
    return base.node_text(source,ident) if ident else None


def _expand_statement_end(source:bytes,end:int)->int:
    while end<len(source) and source[end:end+1] in {b" ",b"\t",b";"}:
        end+=1
    if source[end:end+2]==b"\r\n":
        return end+2
    if source[end:end+1]==b"\n":
        return end+1
    return end


def _portrait_structure(text:str)->tuple[int,int,set[str]]:
    """Count live portrait declarations/reassignments and exact identifier names."""
    source=text.encode("utf-8")
    tree=base.parse(source)
    declarations=0
    assignments=0
    identifiers=set()
    for node in base.walk(tree.root_node):
        if node.type=="identifier":
            identifiers.add(base.node_text(source,node))
        if node.type=="function_declaration" and _node_name(source,node)=="classPortraitSVG":
            declarations+=1
            continue
        if node.type!="assignment_expression":
            continue
        left=node.child_by_field_name("left")
        right=node.child_by_field_name("right")
        if not left or left.type!="identifier" or base.node_text(source,left)!="classPortraitSVG":
            continue
        if right and right.type in {"function_expression","arrow_function"}:
            assignments+=1
    return declarations,assignments,identifiers


def canonicalize_class_portrait(text:str)->tuple[str,int]:
    """Delete every historical portrait implementation/capture and install one current renderer."""
    source=text.encode("utf-8")
    tree=base.parse(source)
    spans=set()
    alias_hits=set()
    portrait_impls=0

    for node in base.walk(tree.root_node):
        if node.type=="function_declaration" and _node_name(source,node)=="classPortraitSVG":
            spans.add((node.start_byte,_expand_statement_end(source,node.end_byte)))
            portrait_impls+=1
            continue
        if node.type=="lexical_declaration":
            names=[]
            for child in node.named_children:
                if child.type!="variable_declarator":
                    continue
                ident=child.child_by_field_name("name")
                if ident and ident.type=="identifier":
                    names.append(base.node_text(source,ident))
            hit=PORTRAIT_ALIASES.intersection(names)
            if hit:
                if len(names)!=1:
                    raise RuntimeError(f"portrait alias shares declaration with live names: {names}")
                alias_hits.update(hit)
                spans.add((node.start_byte,_expand_statement_end(source,node.end_byte)))
            continue
        if node.type=="expression_statement":
            snippet=base.node_text(source,node)
            if re.match(r"\s*classPortraitSVG\s*=\s*function\b",snippet):
                spans.add((node.start_byte,_expand_statement_end(source,node.end_byte)))
                portrait_impls+=1

    missing=PORTRAIT_ALIASES-alias_hits
    if missing:
        raise RuntimeError(f"portrait predecessor captures not found: {sorted(missing)}")
    if portrait_impls<6:
        raise RuntimeError(f"expected portrait history ladder, found only {portrait_impls} implementations")

    out=source
    for start,end in sorted(spans,reverse=True):
        out=out[:start]+out[end:]
    text=out.decode("utf-8")

    # Current art ownership is the asset registry. Unknown or missing art fails
    # closed instead of silently rendering Ranger or resurrecting inline SVGs.
    art_pattern=re.compile(r"  function db054ClassArt\(classId\)\{.*?\n  \}\n  function db054ClassImageHtml\(classId,kind='headshot'\)\{.*?\n  \}",re.S)
    art_replacement='''  function db054ClassArt(classId){
    const id=String(classId);
    if(!DB054_CLASS_ART_IDS.includes(id))throw new Error(`Unknown class art id: ${id}`);
    const assets=window.DiceboundAssets;
    if(!assets)throw new Error("DiceboundAssets must load before class artwork");
    const art=assets.resolveClassArt(id);
    if(!art)throw new Error(`Missing class art asset: ${id}`);
    return art;
  }
  function db054ClassImageHtml(classId,kind='headshot'){
    const cls=CLASSES[classId];
    if(!cls)throw new Error(`Unknown class id: ${classId}`);
    const art=db054ClassArt(cls.id),src=kind==='battle'?art.battle:art.headshot;
    return `<img class="db054-class-art db054-class-art-${kind}" src="${src}" alt="${cls.name}" draggable="false">`;
  }'''
    text,count=art_pattern.subn(art_replacement,text,count=1)
    if count!=1:
        raise RuntimeError(f"expected one class-art helper block, replaced {count}")

    apply_pattern=re.compile(r"  applyClassPortrait=function\(el,classId,combat=false\)\{.*?\n  \};",re.S)
    apply_replacement='''  function classPortraitSVG(classId){
    return db054ClassImageHtml(classId,'headshot');
  }
  applyClassPortrait=function(el,classId,combat=false){
    if(!el)return;
    const cls=CLASSES[classId];
    if(!cls)throw new Error(`Unknown class id: ${classId}`);
    const kind=combat?'battle':'headshot';
    el.classList.remove('ranger-portrait');
    el.classList.add(combat?'combat-portrait':'class-portrait','db054-art-frame');
    el.dataset.classArt=cls.id;
    el.innerHTML=db054ClassImageHtml(cls.id,kind);
  };'''
    text,count=apply_pattern.subn(apply_replacement,text,count=1)
    if count!=1:
        raise RuntimeError(f"expected one final applyClassPortrait layer, replaced {count}")

    declarations,assignments,identifiers=_portrait_structure(text)
    survivors=PORTRAIT_FORBIDDEN_ALIASES.intersection(identifiers)
    if survivors:
        raise RuntimeError(f"portrait predecessors survived structurally: {sorted(survivors)}")
    if declarations!=1 or assignments!=0:
        raise RuntimeError(
            f"classPortraitSVG structural collapse failed: declarations={declarations}, assignments={assignments}"
        )
    return text,portrait_impls


def remove_asset_registry_fallback()->None:
    text=ASSETS.read_text(encoding="utf-8")
    old='const resolveClassArt=id=>manifest.classes[String(id)]||manifest.classes.ranger;'
    new='const resolveClassArt=id=>manifest.classes[String(id)]||null;'
    if old not in text:
        if new not in text:
            raise RuntimeError("resolveClassArt fallback shape changed unexpectedly")
    else:
        text=text.replace(old,new,1)
    ASSETS.write_text(text,encoding="utf-8",newline="\n")


def fix_mythical_test()->None:
    text=MYTHICAL_TEST.read_text(encoding="utf-8")
    old="""start=SOURCE.find('function mythicalSetSummary()')
end=SOURCE.find('function enemyForPosition(',start)
if start<0 or end<0: raise SystemExit('could not isolate canonical mythicalSetSummary')
body=SOURCE[start:end]
"""
    new="""start=SOURCE.find('function mythicalSetSummary()')
if start<0: raise SystemExit('canonical mythicalSetSummary missing')
brace=SOURCE.find('{',start)
if brace<0: raise SystemExit('canonical mythicalSetSummary has no body')
depth=0
end=-1
for pos in range(brace,len(SOURCE)):
    ch=SOURCE[pos]
    if ch=='{': depth+=1
    elif ch=='}':
        depth-=1
        if depth==0:
            end=pos+1
            break
if end<0: raise SystemExit('canonical mythicalSetSummary body is unbalanced')
body=SOURCE[start:end]
if re.search(r'\\bfunction\\s+enemyForPosition\\s*\\(',SOURCE):
    raise SystemExit('retired enemyForPosition wrapper returned just to delimit mythicalSetSummary')
"""
    if old not in text:
        if "retired enemyForPosition wrapper returned" not in text:
            raise RuntimeError("mythical summary test shape changed unexpectedly")
    else:
        text=text.replace(old,new,1)
    MYTHICAL_TEST.write_text(text,encoding="utf-8",newline="\n")


def write_portrait_test()->None:
    PORTRAIT_TEST.write_text(r'''from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'runtime/js/dicebound.js').read_text(encoding='utf-8')
ASSETS=(ROOT/'runtime/js/assets.js').read_text(encoding='utf-8')

if len(re.findall(r'\bfunction\s+classPortraitSVG\s*\(',SOURCE))!=1:
    raise SystemExit('classPortraitSVG must have exactly one canonical declaration')
if re.search(r'\bclassPortraitSVG\s*=\s*function\b',SOURCE):
    raise SystemExit('classPortraitSVG replacement ladder returned')
for retired in (
    'classPortraitV13Base','classPortraitV15Patch','classPortraitV16Base',
    'classPortraitV18Base','classPortraitBeta042Base','db054LegacyPortraitSVG',
):
    if re.search(rf'\b{re.escape(retired)}\b',SOURCE):
        raise SystemExit('retired class portrait predecessor returned: '+retired)
for obsolete in (
    'Summoner portrait','Pokemon Trainer portrait','Alchemist portrait',
    'Ouroboros portrait','Slime Rouge portrait',
):
    if obsolete in SOURCE:
        raise SystemExit('dead inline class portrait SVG returned: '+obsolete)

expected="""function classPortraitSVG(classId){
    return db054ClassImageHtml(classId,'headshot');
  }"""
if expected not in SOURCE:
    raise SystemExit('canonical class portrait no longer routes directly to authoritative image art')
if 'const cls=CLASSES[classId]||CLASSES.ranger' in SOURCE:
    raise SystemExit('Ranger class-art fallback returned')
if 'return fromRegistry||{' in SOURCE:
    raise SystemExit('synthetic class-art path fallback returned')
if "try{el.innerHTML=db054LegacyPortraitSVG" in SOURCE:
    raise SystemExit('inline-SVG image-error fallback returned')
if 'const resolveClassArt=id=>manifest.classes[String(id)]||manifest.classes.ranger;' in ASSETS:
    raise SystemExit('asset registry Ranger fallback returned')
if 'const resolveClassArt=id=>manifest.classes[String(id)]||null;' not in ASSETS:
    raise SystemExit('class art registry must fail closed for unknown ids')
if 'if(!art)throw new Error(`Missing class art asset: ${id}`);' not in SOURCE:
    raise SystemExit('missing class art must fail closed instead of falling back')
print('Canonical class portrait PASS: historical SVG ladder and all Ranger/legacy fallbacks removed')
''',encoding="utf-8",newline="\n")


def augment_anti_return()->None:
    text=ANTI_RETURN.read_text(encoding="utf-8")
    marker="STALE_CLASS_PORTRAIT_ALIASES="
    if marker not in text:
        anchor="STALE_STARTUP_ALIASES=['db0512GateRewards','db0512RememberReward','db060GuardianArt','db060GuardianTileArt']\n"
        if anchor not in text:
            raise RuntimeError("chainsaw anti-return startup alias anchor missing")
        text=text.replace(anchor,anchor+"STALE_CLASS_PORTRAIT_ALIASES=['classPortraitV13Base','classPortraitV15Patch','classPortraitV16Base','classPortraitV18Base','classPortraitBeta042Base','db054LegacyPortraitSVG']\n",1)
        needle='''    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element owner, {len(KILLED)} shadow delegates absent, Progression bootstrap ordered, startup aliases retired")'''
        replacement='''    for name in STALE_CLASS_PORTRAIT_ALIASES:
        assert not re.search(rf"\\b{re.escape(name)}\\b",text), f"historical class portrait alias {name} returned"
    assert len(re.findall(r"\\bfunction\\s+classPortraitSVG\\s*\\(",text))==1, "classPortraitSVG must remain one canonical implementation"
    assert not re.search(r"\\bclassPortraitSVG\\s*=\\s*function\\b",text), "classPortraitSVG replacement ladder returned"
    assert "db054LegacyPortraitSVG" not in text, "class portrait legacy fallback returned"
    assert "CLASSES[classId]||CLASSES.ranger" not in text, "class portrait Ranger fallback returned"

    print(f"Monolith chainsaw anti-return PASS: 0 DB317 writes, canonical element owner, {len(KILLED)} shadow delegates absent, Progression bootstrap ordered, startup aliases retired, class portrait fallbacks retired")'''
        if needle not in text:
            raise RuntimeError("chainsaw anti-return print anchor missing")
        text=text.replace(needle,replacement,1)
    ANTI_RETURN.write_text(text,encoding="utf-8",newline="\n")


def main()->int:
    v5.main()
    before=MONOLITH.read_text(encoding="utf-8")
    before_lines=before.count("\n")+1
    before_bytes=len(before.encode("utf-8"))
    final,removed_impls=canonicalize_class_portrait(before)
    MONOLITH.write_text(final,encoding="utf-8",newline="\n")
    remove_asset_registry_fallback()
    fix_mythical_test()
    write_portrait_test()
    augment_anti_return()
    after=MONOLITH.read_text(encoding="utf-8")
    after_lines=after.count("\n")+1
    after_bytes=len(after.encode("utf-8"))
    print(
        f"0.6.7.0 portrait chainsaw: {removed_impls} historical implementations -> 1; "
        f"{before_lines}->{after_lines} lines, {before_bytes}->{after_bytes} bytes; fallbacks=0"
    )
    return 0


if __name__=="__main__":
    raise SystemExit(main())
