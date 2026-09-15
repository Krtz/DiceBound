from __future__ import annotations

import re

import tmp_materialize_0670_chainsaw_v6 as v6


# The released 0.6.6.39 source already retired the V13 capture itself. The
# remaining ladder is still removed and the permanent guard forbids V13 from
# ever returning.
v6.PORTRAIT_ALIASES.discard("classPortraitV13Base")

_original_canonicalize=v6.canonicalize_class_portrait


def _strip_lexical_portrait_bindings(text:str)->tuple[str,int]:
    """Remove const/let/var classPortraitSVG layers before canonical insertion."""
    source=text.encode("utf-8")
    tree=v6.base.parse(source)
    spans=set()
    for node in v6.base.walk(tree.root_node):
        if node.type not in {"lexical_declaration","variable_declaration"}:
            continue
        names=[]
        for child in node.named_children:
            if child.type!="variable_declarator":
                continue
            ident=child.child_by_field_name("name")
            if ident and ident.type=="identifier":
                names.append(v6.base.node_text(source,ident))
        if "classPortraitSVG" not in names:
            continue
        if len(names)!=1:
            raise RuntimeError(f"classPortraitSVG shares declaration with live names: {names}")
        spans.add((node.start_byte,v6._expand_statement_end(source,node.end_byte)))
    out=source
    for start,end in sorted(spans,reverse=True):
        out=out[:start]+out[end:]
    return out.decode("utf-8"),len(spans)


def _cut_ranger_class_fallbacks(text:str)->tuple[str,int]:
    """Replace code-level CLASSES[classId] || CLASSES.ranger with strict lookup."""
    source=text.encode("utf-8")
    tree=v6.base.parse(source)
    spans=[]
    shape=re.compile(r"^CLASSES\s*\[\s*classId\s*\]\s*\|\|\s*CLASSES\.ranger$")
    for node in v6.base.walk(tree.root_node):
        if node.type!="binary_expression":
            continue
        snippet=v6.base.node_text(source,node).strip()
        if shape.fullmatch(snippet):
            spans.append((node.start_byte,node.end_byte))
    out=source
    replacement=b"CLASSES[classId]"
    for start,end in sorted(spans,reverse=True):
        out=out[:start]+replacement+out[end:]
    return out.decode("utf-8"),len(spans)


def canonicalize_class_portrait(text:str):
    # A late historical portrait layer is a lexical binding rather than a
    # function declaration/reassignment. Strip it structurally first; this also
    # removes its Ranger fallback instead of teaching the canonical renderer to
    # preserve compatibility behavior.
    text,lexical_layers=_strip_lexical_portrait_bindings(text)
    result,removed=_original_canonicalize(text)
    result,ranger_fallbacks=_cut_ranger_class_fallbacks(result)
    if ranger_fallbacks:
        print(f"0.6.7.0 portrait chainsaw: cut {ranger_fallbacks} surviving Ranger class fallback expression(s)")
    return result,removed+lexical_layers


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