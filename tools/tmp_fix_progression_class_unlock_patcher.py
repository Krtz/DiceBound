from pathlib import Path

path=Path('tools/tmp_progression_class_unlock_owner.py')
text=path.read_text(encoding='utf-8')
old="dice=replace_once(dice,'    unlockClass:id=>unlockClass(id),','    unlockClass:id=>dbProgression.unlockClass(id),','Progression oracle class unlock routing')"
new="""oracle_unlock_old='''    achievementCount:()=>dbProgression.achievementCount(),\n    unlockClass:id=>unlockClass(id),\n    classUnlockFeedbackState:'''\noracle_unlock_new='''    achievementCount:()=>dbProgression.achievementCount(),\n    unlockClass:id=>dbProgression.unlockClass(id),\n    classUnlockFeedbackState:'''\ndice=replace_once(dice,oracle_unlock_old,oracle_unlock_new,'Progression oracle class unlock routing')"""
if text.count(old)!=1:
    raise SystemExit(f'expected one broad oracle unlock patch statement, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8',newline='\n')
print('Scoped Progression oracle class-unlock patch to the characterization surface.')
