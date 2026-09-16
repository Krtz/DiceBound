from __future__ import annotations

import re
from pathlib import Path

import tmp_materialize_0670_chainsaw as base

ROOT=Path(__file__).resolve().parents[1]
MONOLITH=ROOT/'runtime/js/dicebound.js'
CSS=ROOT/'runtime/css/extracted-monolith.css'
ITEMS_ORACLE=ROOT/'tools/test_items_oracle.js'


def statement_end(source:bytes,node)->int:
    end=node.end_byte
    while end<len(source) and source[end:end+1] in {b' ',b'\t',b';'}:end+=1
    if source[end:end+2]==b'\r\n':return end+2
    if source[end:end+1]==b'\n':return end+1
    return end


def is_item_feeder_statement(node,snippet:str)->bool:
    """Only remove concrete legacy feeder statements, never an enclosing IIFE."""
    stripped=snippet.lstrip()
    if node.type=='expression_statement':
        return (
            stripped.startswith('Object.assign(gearNames.') or
            stripped.startswith('Object.assign(rarityPrefixes') or
            bool(re.match(r'^(?:gearNames|rarityPrefixes)(?:\.|\[)',stripped))
        )
    if node.type in {'for_statement','for_in_statement','for_of_statement'}:
        return 'gearNames' in snippet and len(snippet)<6000
    return False


def remove_item_compat_feeders(text:str)->tuple[str,int]:
    # Item generation now accepts only canonical supported rarities. Remove the
    # pre-v1.4 naming/icon fallback data and historical extensions that only fed
    # the retired compatibility generator.
    current='''    getPlayer:()=>player,getMeta:()=>meta,getBoardLevel:()=>boardLevel,getClassIdentityId:()=>classIdentityId(),
    slots:EQUIPMENT_SLOTS,slotLabels:SLOT_LABELS,rarityValues,gearNames,rarityPrefixes,rarityBudgets:V14_RARITY_BUDGETS,elementKeys:ELEMENT_KEYS,
    rollGearRarity:bonus=>rollGearRarity(bonus),pick:list=>pick(list),random:()=>random(),rand:(min,max)=>rand(min,max),clamp:(value,min,max)=>clamp(value,min,max),
    gearIcon:slot=>gearIcon(slot),elementChanceForRarity:rarity=>elementChanceForRarity(rarity),seedCode:v15SeedCode,generateFromSeedCode:v15GenerateEquipmentFromSeedCode,
    ordinaryApi:window.DiceboundEquipment,logError:(message,data)=>v25Log('errors','loot',message,data),stateForLog:()=>v25State()'''
    strict='''    getPlayer:()=>player,getMeta:()=>meta,getClassIdentityId:()=>classIdentityId(),slots:EQUIPMENT_SLOTS,
    rollGearRarity:bonus=>rollGearRarity(bonus),pick:list=>pick(list),random:()=>random(),clamp:(value,min,max)=>clamp(value,min,max),
    seedCode:v15SeedCode,generateFromSeedCode:v15GenerateEquipmentFromSeedCode,rarityBudgets:V14_RARITY_BUDGETS,ordinaryApi:window.DiceboundEquipment'''
    if current in text:text=text.replace(current,strict,1)
    elif strict not in text:raise RuntimeError('Items controller compatibility capability block changed unexpectedly')

    source=text.encode('utf-8');tree=base.parse(source);spans=[]
    dead_vars={'gearNames','rarityPrefixes'}
    for node in base.walk(tree.root_node):
        if node.type in {'lexical_declaration','variable_declaration'}:
            names=[]
            for child in node.named_children:
                if child.type!='variable_declarator':continue
                ident=child.child_by_field_name('name')
                if ident and ident.type=='identifier':names.append(base.node_text(source,ident))
            if names and all(name in dead_vars for name in names):spans.append((node.start_byte,statement_end(source,node)))
        elif node.type=='function_declaration':
            ident=node.child_by_field_name('name')
            if ident and base.node_text(source,ident)=='gearIcon':spans.append((node.start_byte,statement_end(source,node)))
        elif node.type in {'expression_statement','for_statement','for_in_statement','for_of_statement'}:
            snippet=base.node_text(source,node)
            if is_item_feeder_statement(node,snippet):spans.append((node.start_byte,statement_end(source,node)))

    # A defensive size guard makes a future parser/shape change fail loudly
    # instead of deleting a giant enclosing block.
    for start,end in spans:
        if end-start>12000:
            raise RuntimeError(f'Refusing oversized item-feeder span: {end-start} bytes')

    merged=[]
    for start,end in sorted(set(spans)):
        if merged and start<merged[-1][1]:
            if end>merged[-1][1]:merged[-1]=(merged[-1][0],end)
        else:merged.append((start,end))
    for start,end in reversed(merged):source=source[:start]+source[end:]
    out=source.decode('utf-8')
    if re.search(r'\bgearNames\b|\brarityPrefixes\b|\bfunction\s+gearIcon\b',out):
        raise RuntimeError('Obsolete item compatibility feeder survived')
    return out,len(merged)


def extract_dynamic_css(text:str)->tuple[str,int]:
    css=CSS.read_text(encoding='utf-8').rstrip()+"\n"
    moved=0
    patterns=[
        ('v19 runtime styles',re.compile(r'''\n\s*// Styling added in JS keeps the single-file build self-contained\.\s*\n\s*const v19Style=document\.createElement\("style"\);v19Style\.textContent=`(?P<css>.*?)`;\s*\n\s*document\.head\.appendChild\(v19Style\);''',re.S)),
        ('guardian art styles',re.compile(r'''\n\s*const db060GuardianArtStyle=document\.createElement\('style'\);\s*\n\s*db060GuardianArtStyle\.id='dicebound-beta-0-6-guardian-art-style';\s*\n\s*db060GuardianArtStyle\.textContent=`(?P<css>.*?)`;\s*\n\s*document\.head\.appendChild\(db060GuardianArtStyle\);''',re.S)),
    ]
    for label,pattern in patterns:
        match=pattern.search(text)
        if not match:continue
        block=match.group('css').strip('\n')
        marker=f'/* 0.6.7.0 extracted {label} */'
        if marker not in css:css+=f"\n{marker}\n{block}\n"
        text=text[:match.start()]+"\n"+text[match.end():];moved+=1
    CSS.write_text(css,encoding='utf-8',newline='\n')
    return text,moved


def remove_regression_surfaces(text:str)->tuple[str,int]:
    names={'DiceboundV16Regression','DiceboundV17Regression','DiceboundV18Regression','DiceboundV19Regression'}
    source=text.encode('utf-8');tree=base.parse(source);spans=[]
    for node in base.walk(tree.root_node):
        if node.type not in {'expression_statement','try_statement'}:continue
        snippet=base.node_text(source,node)
        if not any(name in snippet for name in names):continue
        parent=node.parent
        if parent and parent.type in {'expression_statement','try_statement'} and any(name in base.node_text(source,parent) for name in names):continue
        if node.end_byte-node.start_byte>12000:raise RuntimeError('Refusing oversized regression-surface span')
        spans.append((node.start_byte,statement_end(source,node)))
    for start,end in sorted(set(spans),reverse=True):source=source[:start]+source[end:]
    out=source.decode('utf-8')
    survivors=[name for name in names if name in out]
    if survivors:raise RuntimeError(f'Regression-only globals survived: {survivors}')
    return out,len(spans)


def update_items_oracle()->int:
    text=ITEMS_ORACLE.read_text(encoding='utf-8')
    old_assert='''  assert.ok(generated.some(c=>c.requestedRarity==="artifact"),"missing Artifact compatibility case");
  assert.ok(generated.some(c=>c.requestedRarity==="mythical"),"missing Mythical compatibility case");
  assert.ok(generated.some(c=>c.requestedRarity==="omega"),"missing Omega compatibility case");
  assert.ok(generated.some(c=>c.requestedRarity==="bogus"&&c.item),"invalid rarity compatibility path must remain non-null");'''
    new_assert='''  for(const rarity of ["artifact","mythical","omega","bogus"]){const rejected=actual.cases.find(c=>c.kind==="reject"&&c.requestedRarity===rarity);assert.ok(rejected?.error,`missing strict rejection for ${rarity}`);assert.equal(rejected.rngCalls,0,`${rarity} rejection must not consume gameplay RNG`);}'''
    if old_assert in text:text=text.replace(old_assert,new_assert,1)
    elif new_assert not in text:raise RuntimeError('Items oracle compatibility assertions changed unexpectedly')

    for entry in [
        "['compat-artifact','artifact',null,'ranger',4,40],",
        "['compat-mythical','mythical','chest','fighter',4,40],",
        "['compat-omega','omega','ring','sorcerer',4,40],",
        "['invalid-bogus','bogus',null,'ranger',2,20],",
    ]:text=text.replace(entry,'')
    loop='''      for(const [name,rarity,slot,classId,board,position] of genCases){const before=restore(name,{classId,board,position});const item=gen.generateEquipment(rarity,slot);finish({name,kind:'generate',requestedRarity:rarity,forcedSlot:slot,classId,board,position,item:compactItem(item)},before);}'''
    reject='''      for(const [name,rarity,slot,classId,board,position] of genCases){const before=restore(name,{classId,board,position});const item=gen.generateEquipment(rarity,slot);finish({name,kind:'generate',requestedRarity:rarity,forcedSlot:slot,classId,board,position,item:compactItem(item)},before);}
      for(const rarity of ['artifact','mythical','omega','bogus']){const before=restore('reject-'+rarity,{classId:'ranger',board:4,position:40});let error=null;try{gen.generateEquipment(rarity,null);}catch(reason){error=String(reason?.message||reason);}finish({name:'reject-'+rarity,kind:'reject',requestedRarity:rarity,error},before);}'''
    if loop in text:text=text.replace(loop,reject,1)
    elif "kind:'reject'" not in text:raise RuntimeError('Items oracle generation loop changed unexpectedly')

    compare='''    assert.deepEqual(actual.cases,fixture.cases);'''
    strict_compare='''    const retired=new Set(['compat-artifact','compat-mythical','compat-omega','invalid-bogus']);
    assert.deepEqual(actual.cases.filter(c=>c.kind!=='reject'),fixture.cases.filter(c=>!retired.has(c.name)));'''
    if compare in text:text=text.replace(compare,strict_compare,1)
    elif strict_compare not in text:raise RuntimeError('Items oracle fixture comparison changed unexpectedly')
    ITEMS_ORACLE.write_text(text,encoding='utf-8',newline='\n')
    return 1


def main()->int:
    text=MONOLITH.read_text(encoding='utf-8');before=text.count('\n')+1
    text,item_spans=remove_item_compat_feeders(text)
    text,styles=extract_dynamic_css(text)
    text,regressions=remove_regression_surfaces(text)
    text='\n'.join(line.rstrip() for line in text.split('\n'))
    text=re.sub(r'\n(?:[ \t]*\n){2,}','\n\n',text)
    after=text.count('\n')+1
    if after<4500:raise RuntimeError(f'Bulk cutter removed implausibly much source in one pass: {before}->{after}')
    MONOLITH.write_text(text,encoding='utf-8',newline='\n')
    update_items_oracle()
    print(f'BULK_0670_CLEANUP {before}->{after} lines; item feeder spans={item_spans}; dynamic styles={styles}; regression surfaces={regressions}')
    return 0


if __name__=='__main__':raise SystemExit(main())
