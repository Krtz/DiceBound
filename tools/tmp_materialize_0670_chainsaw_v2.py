from __future__ import annotations

import re

import tmp_materialize_0670_chainsaw as base


def fixed_removal_owner(node):
    current=node
    while current.parent and current.type != "expression_statement":
        current=current.parent
    if current.type != "expression_statement":
        return None, False
    replace_empty=False
    while current.parent:
        parent=current.parent
        if parent.type == "if_statement":
            consequence=parent.child_by_field_name("consequence")
            alternative=parent.child_by_field_name("alternative")
            if consequence == current:
                if alternative is None:
                    current=parent
                    continue
                replace_empty=True
                break
            if alternative == current:
                # Preserve the grammar of `if (...) ...; else <dead>;` while
                # deleting the dead alternative's behavior.
                replace_empty=True
                break
        if parent.type in {"for_statement","for_in_statement","while_statement","do_statement"} and parent.child_by_field_name("body") == current:
            current=parent
            continue
        break
    return current, replace_empty


base.removal_owner=fixed_removal_owner
_original_delete=base.delete_dead_proxy_statements


def fixed_delete(text: str):
    text,nodes,statements,names=_original_delete(text)
    # v28AddClassTag exists only to write class/tag data through the DB317
    # read-only views. Once those writes are deleted, its local Set work and
    # poison-tag loop are also provably dead and should disappear with them.
    pattern=re.compile(
        r"\n\s*function v28AddClassTag\(id,tag\)\{[^\n]*\}\n"
        r"\s*\['frog','ouroboros','ninja','slime'\]\.forEach\(id=>v28AddClassTag\(id,'poison'\)\);"
    )
    text,count=pattern.subn("",text,count=1)
    if count != 1:
        raise RuntimeError("Expected to retire the now-empty v28AddClassTag compatibility helper")
    names.add("v28AddClassTag")
    return text,nodes,statements+2,names


base.delete_dead_proxy_statements=fixed_delete

if __name__ == "__main__":
    raise SystemExit(base.main())
