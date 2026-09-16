from __future__ import annotations

import re
from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
ANTI_RETURN=ROOT/'tools/test_monolith_chainsaw.py'
POWERUP_PRESENTATION=ROOT/'runtime/js/powerups/presentation.js'


def expand_statement_end(source:bytes,end:int)->int:
    while end<len(source) and source[end:end+1] in {b' ',b'\t',b';'}:
        end+=1
    if source[end:end+2]==b'\r\n': return end+2
    if source[end:end+1]==b'\n': return end+1
    return end


def unwrap_db317_readonly(text:str)->tuple[str,int]:
    """The dead writes are gone; remove the compatibility proxy itself."""
    source=text.encode('utf-8')
    tree=base.parse(source)
    replacements=[]
    for node in base.walk(tree.root_node):
        if node.type!='call_expression':
            continue
        fn=node.child_by_field_name('function')
        if not fn or fn.type!='identifier' or base.node_text(source,fn)!='db317Readonly':
            continue
        args=node.child_by_field_name('arguments')
        named=list(args.named_children) if args else []
        if len(named)!=1:
            raise RuntimeError(f'db317Readonly expected one argument, got {len(named)}')
        replacements.append((node.start_byte,node.end_byte,source[named[0].start_byte:named[0].end_byte]))
    for start,end,repl in sorted(replacements,reverse=True):
        source=source[:start]+repl+source[end:]

    tree=base.parse(source)
    removals=[]
    for node in base.walk(tree.root_node):
        if node.type=='function_declaration':
            ident=node.child_by_field_name('name')
            if ident and base.node_text(source,ident)=='db317Readonly':
                removals.append((node.start_byte,expand_statement_end(source,node.end_byte)))
        elif node.type in {'lexical_declaration','variable_declaration'}:
            names=[]
            for child in node.named_children:
                if child.type!='variable_declarator': continue
                ident=child.child_by_field_name('name')
                if ident and ident.type=='identifier': names.append(base.node_text(source,ident))
            if any(name in {'DB317_CONTENT_MUTATORS','DB317_READONLY_CACHE'} for name in names):
                if len(names)!=1:
                    raise RuntimeError(f'compatibility helper shares declaration: {names}')
                removals.append((node.start_byte,expand_statement_end(source,node.end_byte)))
    for start,end in sorted(set(removals),reverse=True):
        source=source[:start]+source[end:]
    out=source.decode('utf-8')
    if re.search(r'\bdb317Readonly\b',out):
        raise RuntimeError('db317Readonly survived compatibility removal')
    return out,len(replacements)


def route_call_only_adapters(text:str)->tuple[str,list[str],list[str]]:
    """Route historical call names directly to the public/focused owners."""
    routes={
        'renderMerchant':'dbMerchant.render',
        'grantLegacyXp':'dbProgression.grantLegacyXp',
        'finalizeRun':'dbProgression.finalizeRun',
        'talentAvailable':'dbProgression.talentAvailable',
        'purchaseTalentNode':'dbProgression.purchaseTalent',
        'renderTalents':'window.DiceboundTalentTree.render',
        'openTalentTree':'window.DiceboundTalentTree.open',
        'renderPetCollection':'window.DiceboundPetChooser.render',
        'feedActivePet':'dbPets.feed',
        'renderClassChoices':'window.DiceboundClassChooser.render',
        'makeMerchantGear':'dbMerchant.makeGear',
        'merchantCatalog':'dbMerchant.catalog',
        'merchantPrice':'dbMerchant.price',
        'openMerchant':'dbMerchant.open',
        'petTurn':'dbCombat.petTurn',
        'rollD20Chaos':'dbCombat.chaos',
        'useUltimate':'dbCombat.ultimate',
        'playerAttack':'dbCombat.attack',
        'guardAction':'dbCombat.guard',
        'usePotion':'dbConsumablesResolution.usePotion',
        'usePotionOutsideCombat':'dbConsumablesResolution.usePotionOutsideCombat',
        'gearPowerScore':'dbItems.score',
        'equipItem':'dbItems.equip',
        'itemSellValue':'dbItems.sellValue',
        'formatGearComparison':'dbItems.formatComparison',
        'updateBossSpecialIndicator':'dbCombatView.renderBossSpecialIndicator',
        'applyUpgrade':'dbPowerups.apply',
        'weightedUpgrade':'dbPowerups.weighted',
        'getUpgradeChoices':'dbPowerups.choices',
        'powerupDisplayDesc':'dbPowerups.describe',
        'renderEndGear':'dbEquipmentUi.renderEndGear',
    }

    # Historical event listeners kept several aliases alive purely as values.
    callback_routes={
        '$("outsidePotionBtn").addEventListener("click",usePotionOutsideCombat)':'$("outsidePotionBtn").addEventListener("click",()=>dbConsumablesResolution.usePotionOutsideCombat())',
        '$("attackBtn").addEventListener("click",playerAttack)':'$("attackBtn").addEventListener("click",()=>dbCombat.attack())',
        '$("guardBtn").addEventListener("click",guardAction)':'$("guardBtn").addEventListener("click",()=>dbCombat.guard())',
        '$("potionBtn").addEventListener("click",usePotion)':'$("potionBtn").addEventListener("click",()=>dbConsumablesResolution.usePotion())',
        '$("ultimateBtn").addEventListener("click",useUltimate)':'$("ultimateBtn").addEventListener("click",()=>dbCombat.ultimate())',
        '$("talentBtn").addEventListener("click",()=>openTalentTree())':'$("talentBtn").addEventListener("click",()=>window.DiceboundTalentTree.open())',
        '$("feedPetBtn").addEventListener("click",()=>feedActivePet(1))':'$("feedPetBtn").addEventListener("click",()=>dbPets.feed(1))',
        '$("feedAllPetBtn").addEventListener("click",()=>feedActivePet(meta.petCookies))':'$("feedAllPetBtn").addEventListener("click",()=>dbPets.feed(meta.petCookies))',
    }
    for old,new in callback_routes.items():
        text=text.replace(old,new)

    source=text.encode('utf-8')
    killed=[]
    skipped=[]
    for name,target in routes.items():
        tree=base.parse(source)
        replacements=[]
        for node in base.walk(tree.root_node):
            if node.type!='call_expression': continue
            fn=node.child_by_field_name('function')
            if fn and fn.type=='identifier' and base.node_text(source,fn)==name:
                replacements.append((fn.start_byte,fn.end_byte,target.encode('utf-8')))
        for start,end,repl in sorted(replacements,reverse=True):
            source=source[:start]+repl+source[end:]

        tree=base.parse(source)
        decls=[]; other=[]
        for node in base.walk(tree.root_node):
            if node.type=='function_declaration':
                ident=node.child_by_field_name('name')
                if ident and base.node_text(source,ident)==name:
                    decls.append(node)
            elif node.type=='identifier' and base.node_text(source,node)==name:
                parent=node.parent
                if parent and parent.type=='function_declaration' and parent.child_by_field_name('name')==node:
                    continue
                other.append(node)
        if len(decls)!=1:
            skipped.append(f'{name}: declarations={len(decls)}')
            continue
        if other:
            skipped.append(f'{name}: non-call refs={len(other)}')
            continue
        decl=decls[0]
        source=source[:decl.start_byte]+source[expand_statement_end(source,decl.end_byte):]
        killed.append(name)
    return source.decode('utf-8'),killed,skipped


def collapse_animate_ultimate(text:str)->tuple[str,int]:
    """Keep one current Ultimate animation implementation, not the patch ladder."""
    source=text.encode('utf-8')
    tree=base.parse(source)
    layers=[]
    calls=[]
    for node in base.walk(tree.root_node):
        if node.type=='function_declaration':
            ident=node.child_by_field_name('name')
            if ident and base.node_text(source,ident)=='animateUltimate':
                layers.append(('decl',node.start_byte,node.end_byte,node))
        elif node.type=='assignment_expression':
            left=node.child_by_field_name('left'); right=node.child_by_field_name('right')
            if left and left.type=='identifier' and base.node_text(source,left)=='animateUltimate' and right and right.type in {'function_expression','arrow_function'}:
                owner=node
                while owner.parent and owner.type!='expression_statement': owner=owner.parent
                if owner.type=='expression_statement': layers.append(('assign',owner.start_byte,owner.end_byte,node))
        elif node.type=='call_expression':
            fn=node.child_by_field_name('function')
            if fn and fn.type=='identifier' and base.node_text(source,fn)=='animateUltimate': calls.append(node.start_byte)
    if len(layers)<=1: return text,0
    layers.sort(key=lambda row:row[1])
    final=layers[-1]
    if any(pos<final[1] for pos in calls):
        return text,0
    kind,start,end,node=final
    if kind=='assign':
        assignment=node
        right=assignment.child_by_field_name('right')
        rhs=base.node_text(source,right)
        match=re.match(r'async\s+function\s*\((.*?)\)\s*\{(.*)\}\s*$',rhs,re.S)
        if not match: return text,0
        canonical=('async function animateUltimate('+match.group(1)+'){'+match.group(2)+'}').encode('utf-8')
    else:
        canonical=source[start:end]
    spans=[(row[1],expand_statement_end(source,row[2])) for row in layers]
    out=source
    for s,e in sorted(spans,reverse=True): out=out[:s]+out[e:]
    insert_at=min(s for s,_ in spans)
    out=out[:insert_at]+b'  '+canonical.strip()+b'\n'+out[insert_at:]
    return out.decode('utf-8'),len(layers)-1


def remove_obvious_fallbacks(text:str)->tuple[str,int]:
    replacements={
        'const definition=CLASSES[classId]||CLASSES[player.classId];':'const definition=CLASSES[classId];',
        'const cls=CLASSES[player.classId]||CLASSES.ranger;':'const cls=CLASSES[player.classId];',
    }
    count=0
    for old,new in replacements.items():
        hits=text.count(old)
        if hits:
            text=text.replace(old,new)
            count+=hits
    noop='  Object.entries(CLASS_TAGS).forEach(([id,tags])=>{});\n'
    if noop in text:
        text=text.replace(noop,'',1);count+=1
    return text,count


def compact_source(text:str)->str:
    text='\n'.join(line.rstrip(' \t') for line in text.split('\n'))
    text=re.sub(r'\n(?:[ \t]*\n){2,}','\n\n',text)
    return text


def strict_powerup_signature()->int:
    text=POWERUP_PRESENTATION.read_text(encoding='utf-8')
    old="const sourceId=perfectedSignatureSourceClassId(),sourceClass=CLASSES[sourceId],entry=PERFECTED_SIGNATURES[sourceId]||{desc:`Perfected Signature — ${sourceClass?.name||'Current identity'}: +20% Ultimate damage.`,apply(){player.ultimateDamageBonus+=.20;}};"
    new="const sourceId=perfectedSignatureSourceClassId(),sourceClass=CLASSES[sourceId],entry=PERFECTED_SIGNATURES[sourceId];if(!sourceClass||!entry)throw new Error(`Missing Perfected Signature owner for class: ${sourceId}`);"
    if old in text:
        text=text.replace(old,new,1)
        text=text.replace('  /*\n    Full eligible-powerup picker.  /*\n    Full eligible-powerup picker. Unlike getUpgradeChoices(), this deliberately','  /*\n    Full eligible-powerup picker. Unlike getUpgradeChoices(), this deliberately',1)
        POWERUP_PRESENTATION.write_text(compact_source(text),encoding='utf-8',newline='\n')
        return 1
    if 'Missing Perfected Signature owner for class' in text: return 0
    raise RuntimeError('Perfected Signature fallback shape changed unexpectedly')


def update_anti_return(killed:list[str])->None:
    text=ANTI_RETURN.read_text(encoding='utf-8')
    marker="if __name__=='__main__':"
    block='''\n\ndef live_chainsaw_wave_guards(text:str)->None:\n    assert 'db317Readonly' not in text, 'DB317 read-only compatibility proxy returned'\n    assert 'DB317_CONTENT_MUTATORS' not in text, 'DB317 mutator compatibility table returned'\n    assert 'DB317_READONLY_CACHE' not in text, 'DB317 proxy cache returned'\n    assert 'CLASSES[player.classId]||CLASSES.ranger' not in text, 'Ranger class fallback returned'\n    assert 'Object.entries(CLASS_TAGS).forEach(([id,tags])=>{});' not in text, 'empty CLASS_TAGS compatibility pass returned'\n'''
    for name in killed:
        block+=f"    assert not re.search(r'\\bfunction\\s+{re.escape(name)}\\s*\\(',text), 'call-only adapter {name} returned'\n"
    block+="    assert len(re.findall(r'\\b(?:async\\s+)?function\\s+animateUltimate\\s*\\(',text))<=1, 'Ultimate animation patch ladder returned'\n"
    if 'live_chainsaw_wave_guards' not in text:
        # Insert before the existing main invocation and call from it if possible.
        idx=text.rfind("if __name__")
        if idx<0: raise RuntimeError('anti-return main anchor missing')
        text=text[:idx]+block+'\n'+text[idx:]
        # Existing script usually has main() below. Make the guard run inside main before PASS by adding a call near text load.
        anchor="text=MONOLITH.read_text(encoding=\"utf-8\")"
        if anchor in text:
            text=text.replace(anchor,anchor+"\n    live_chainsaw_wave_guards(text)",1)
        else:
            raise RuntimeError('anti-return monolith read anchor missing')
        ANTI_RETURN.write_text(text,encoding='utf-8',newline='\n')


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8')
    before_lines=text.count('\n')+1
    before_bytes=len(text.encode('utf-8'))

    text,unwrapped=unwrap_db317_readonly(text)
    text,killed,skipped=route_call_only_adapters(text)
    text,ultimate_layers=collapse_animate_ultimate(text)
    text,fallbacks=remove_obvious_fallbacks(text)
    text=compact_source(text)
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    signature_fallbacks=strict_powerup_signature()
    update_anti_return(killed)

    final=MONOLITH.read_text(encoding='utf-8')
    after_lines=final.count('\n')+1
    after_bytes=len(final.encode('utf-8'))
    print(f'LIVE_CHAINSAW_WAVE1 {before_lines}->{after_lines} lines, {before_bytes}->{after_bytes} bytes')
    print(f'compat proxies unwrapped={unwrapped}; adapters killed={len(killed)}; animate layers removed={ultimate_layers}; fallbacks/noops removed={fallbacks+signature_fallbacks}')
    if killed: print('killed adapters:', ', '.join(killed))
    if skipped: print('preserved references:', '; '.join(skipped))
    return 0


if __name__=='__main__':
    raise SystemExit(main())
