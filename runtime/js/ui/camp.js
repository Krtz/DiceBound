/* DiceBound Camp presentation owner.
 *
 * This module deliberately owns DOM composition, responsive layout regime
 * selection, authored Camp-object rendering, and painted-object hit targets.
 * Gameplay/progression data and actions remain supplied by the compatibility
 * runtime through configure(), so this is not a second class/pet/save owner.
 */
(function(root){
  'use strict';

  const CAMP_OBJECT_IDS=Object.freeze([
    'campTalentBtn','campInfoBtn','campMoonBtn','campOptionsBtn','campNightmareBtn',
    'campHellBtn','campClassBtn','campPetBtn','campChestBtn','campAchievementBtn','campGoBtn'
  ]);

  // These are the approved Beta 0.6.4.13 desktop composition coordinates.
  // The original composition used the stage-layout anchors below; its old
  // translate values were late *adjustments* to those anchors, not standalone
  // positions.  Keep the actual top-stage coordinates here so this owner does
  // not send controls above the viewport when it refreshes a Camp scene.
  const CAMP_LAYOUTS=Object.freeze([
    Object.freeze({
      id:'wide-desktop',query:'(min-width:1360px) and (min-height:650px)',
      rules:Object.freeze([
        ['#campOptionsBtn','left:8.5%;top:10.5%;translate:none'],
        ['#campTalentBtn','left:31.5%;top:12.5%;translate:none'],
        ['#campMoonBtn','left:42.5%;top:11.5%;translate:none'],
        ['#campClassBtn','left:22.5%;top:40.5%;translate:none'],
        ['#campAchievementBtn[data-db064-hit-target="painted-object"]','translate:-35vw 0'],
        ['#campInfoBtn','left:45vw'],
        ['#campInfoBtn[data-db064-hit-target="painted-object"]','translate:10vw 25vh'],
        ['#campPetBtn[data-db064-hit-target="painted-object"]','translate:-31vw -4vh'],
        ['#campChestBtn[data-db064-hit-target="painted-object"]','translate:-22vw 8vh'],
        ['.camp-bonfire','translate:0 4vh'],
        ['#campGoBtn','right:-5vw']
      ])
    }),
    Object.freeze({
      id:'compact-desktop',query:'(min-width:1000px) and (max-width:1359px) and (min-height:650px)',
      rules:Object.freeze([
        ['#campOptionsBtn','left:8.5%;top:10.5%;translate:none'],
        ['#campTalentBtn','left:31.5%;top:12.5%;translate:none'],
        ['#campMoonBtn','left:42.5%;top:11.5%;translate:none'],
        ['#campClassBtn','left:22.5%;top:40.5%;translate:none'],
        ['#campAchievementBtn[data-db064-hit-target="painted-object"]','translate:-32vw 0'],
        ['#campInfoBtn','left:43vw'],
        ['#campInfoBtn[data-db064-hit-target="painted-object"]','translate:9vw 23vh'],
        ['#campPetBtn[data-db064-hit-target="painted-object"]','translate:-28vw -4vh'],
        ['#campChestBtn[data-db064-hit-target="painted-object"]','translate:-20vw 7vh'],
        ['.camp-bonfire','translate:0 4vh'],
        ['#campGoBtn','right:-6vw']
      ])
    }),
    Object.freeze({
      id:'stacked-or-short',query:'(min-width:1000px) and (max-height:649px)',
      rules:Object.freeze([
        // Preserve the same anchored composition in a short desktop viewport,
        // while allowing the tall moon/class artwork to remain wholly onscreen.
        ['#campOptionsBtn','left:8.5%;top:16%;translate:none'],
        ['#campTalentBtn','left:31.5%;top:14%;translate:none'],
        ['#campMoonBtn','left:42.5%;top:24%;translate:none'],
        ['#campClassBtn','left:22.5%;top:58%;translate:none']
      ])
    })
  ]);

  let runtime={};
  let resizeBound=false;
  let refreshFrame=0;

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function action(name,...args){return runtime.actions?.[name]?.(...args);}
  function asset(key,fallback){return root.DiceboundAssets?.resolveCampObject?.(key)?.image||fallback;}
  function assetAlt(key,fallback){return root.DiceboundAssets?.resolveCampObject?.(key)?.alt||fallback;}

  function layoutForViewport(width=root.innerWidth||0,height=root.innerHeight||0){
    if(width>=1360&&height>=650)return CAMP_LAYOUTS[0];
    if(width>=1000&&height>=650)return CAMP_LAYOUTS[1];
    return CAMP_LAYOUTS[2];
  }

  function installLayoutStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById('dicebound-camp-layout-owner'))return;
    const style=documentRef.createElement('style');
    style.id='dicebound-camp-layout-owner';
    style.textContent=CAMP_LAYOUTS.filter(layout=>layout.query).map(layout=>
      `@media ${layout.query}{${layout.rules.map(([selector,declaration])=>
        `html body #startOverlay.camp-fullscreen ${selector}{${declaration}!important}`
      ).join('')}}`
    ).join('\n');
    style.textContent += `\nhtml body #startOverlay.camp-fullscreen .camp-panel.active > .camp-panel-head{position:sticky!important;top:0!important;z-index:80!important;background:linear-gradient(180deg,rgba(17,24,42,.98),rgba(17,24,42,.90))!important;padding:10px 12px!important;box-shadow:0 8px 18px rgba(0,0,0,.22)!important;backdrop-filter:blur(8px)}\nhtml body #startOverlay.camp-fullscreen .camp-panel.active > .camp-panel-head .camp-close-btn{margin-left:auto!important;flex:0 0 auto!important;position:relative!important;z-index:81!important}`;
    documentRef.head?.appendChild(style);
  }

  function closePanels(){doc()?.querySelectorAll('.camp-panel').forEach(panel=>panel.classList.remove('active'));}
  function openPanel(id){closePanels();find(id)?.classList.add('active');return find(id)||null;}
  function scrollPanel(id){find(id)?.scrollIntoView?.({behavior:'smooth',block:'start'});}

  function ensureCompatStartButton(){
    if(find('startBtn'))return find('startBtn');
    const button=doc()?.createElement('button');
    if(!button)return null;
    button.id='startBtn';button.className='camp-hidden';button.type='button';button.setAttribute('aria-hidden','true');
    find('startOverlay')?.querySelector('.start-modal')?.appendChild(button);
    return button;
  }

  function campTemplate(){
    return `<div class="camp-topline"><span id="campLegacyLine"></span><span id="campPetLine"></span></div>
      <div class="camp-sky"><div class="camp-stars"><button class="camp-spot camp-art-button talent-art-button" id="campTalentBtn"><div class="camp-icon camp-special-art-frame"><img class="camp-special-art camp-talent-art" src="${asset('talentStar','assets/camp/objects/talent-star.png')}" alt="${assetAlt('talentStar','Northern star of talents')}"></div><div class="camp-label">Talents</div><div class="camp-sub">Spend Legacy points</div></button><button class="camp-spot camp-art-button info-art-button" id="campInfoBtn"><div class="camp-icon camp-special-art-frame"><img class="camp-special-art camp-info-art" src="${asset('infoBooks','assets/camp/objects/info-books.png')}" alt="${assetAlt('infoBooks','Stack of books and scrolls')}"></div><div class="camp-label">Info</div><div class="camp-sub">Rules &amp; systems</div></button><button class="camp-spot" id="campMoonBtn"><div class="camp-icon">🌙</div><div class="camp-label">Prestige</div><div class="camp-sub">Prestige &amp; reset</div></button></div><div class="camp-stars"><button class="camp-spot nightmare-spot" id="campNightmareBtn"><div class="camp-icon">🕴️</div><div class="camp-label">Nightmare</div><div class="camp-sub">Locked</div></button><button class="camp-spot hell-spot" id="campHellBtn"><div class="camp-icon">😈🤝🕴️</div><div class="camp-label">Hell</div><div class="camp-sub">Locked</div></button></div></div>
      <div class="camp-ground"><button class="camp-spot" id="campPetBtn"><div class="camp-icon" id="campPetIcon">🎲</div><div class="camp-label">Pet</div><div class="camp-sub">Choose companion</div></button><button class="camp-spot class-picker" id="campClassBtn"><div class="camp-icon" id="campClassIcon">🏹</div><div class="camp-label">Class</div><div class="camp-sub" id="campClassSub">Select class</div></button><div class="camp-bonfire" aria-label="Bonfire"><div class="camp-icon camp-art-frame"><img class="camp-art camp-bonfire-art" src="${asset('bonfire','assets/camp/objects/bonfire.png')}" alt="${assetAlt('bonfire','Bonfire')}"></div></div><button class="camp-spot go-spot camp-journey-control" id="campGoBtn" aria-label="Start next run" title="Start next run"><div class="camp-journey-art-frame"><img class="camp-journey-art" src="${asset('roadCaravan','assets/camp/objects/road-caravan.png')}" alt="${assetAlt('roadCaravan','Horse pulling a modern caravan')}"></div><div class="camp-journey-label">Start run</div></button><button class="camp-spot" id="campChestBtn"><div class="camp-icon">🪙📦</div><div class="camp-label">Chest</div><div class="camp-sub">Heirlooms &amp; set</div></button><button class="camp-spot" id="campAchievementBtn"><div class="camp-icon">🏆</div><div class="camp-label">Trophy</div><div class="camp-sub">Achievements</div></button></div>
      <div class="camp-popup-layer" id="campPopupLayer">
        <div class="camp-panel" id="campClassPanel"><div class="camp-panel-head"><h3>Classes</h3><button class="small-btn camp-close-btn" data-close-camp-panel>Done</button></div><div class="camp-note-line">Select a class for the next expedition. When you return to camp, the figure in the clearing updates to the new choice.</div><div id="campClassHost"></div></div>
        <div class="camp-panel" id="campChestPanel"><div class="camp-panel-head"><h3>Heirlooms &amp; Impossible Road</h3><button class="small-btn camp-close-btn" data-close-camp-panel>Done</button></div><div id="campHeirloomSummary"></div><div id="campChestSet"></div></div>
        <div class="camp-panel" id="campMoonPanel"><div class="camp-panel-head"><h3>Prestige &amp; reset progress</h3><button class="small-btn camp-close-btn" data-close-camp-panel>Done</button></div><div class="camp-heirloom-card"><strong>Prestige summary</strong><br><span id="campPrestigeSummary"></span></div><div class="camp-moon-actions"><button class="small-btn" id="campOpenTalentPrestigeBtn">Open talent / Prestige screen</button><button class="small-btn danger" id="campResetProgressBtn">Reset all progress</button></div><div class="camp-note-line">Prestige still happens through the Talent screen, but the moon is now the obvious place to manage that meta-progression and to wipe the save if you really want to.</div></div>
      </div>`;
  }

  function wireClick(id,handler){
    const button=find(id);if(!button||button.dataset.dbCampWired==='1')return;
    button.dataset.dbCampWired='1';button.addEventListener('click',handler);
  }

  function wireScene(){
    wireClick('campClassBtn',()=>{action('showClassChoices');openPanel('campClassPanel');refresh();scrollPanel('campClassPanel');});
    wireClick('campChestBtn',()=>{openPanel('campChestPanel');action('renderEquipment');refresh();scrollPanel('campChestPanel');});
    wireClick('campMoonBtn',()=>{openPanel('campMoonPanel');action('renderTalents');refresh();scrollPanel('campMoonPanel');});
    wireClick('campTalentBtn',()=>action('openTalents'));
    wireClick('campInfoBtn',()=>action('openInfo'));
    wireClick('campAchievementBtn',()=>action('openAchievements'));
    wireClick('campPetBtn',()=>action('openPets'));
    wireClick('campGoBtn',()=>{find('startOverlay')?.classList.add('hidden');closePanels();action('startRun');});
    wireClick('campNightmareBtn',()=>{action('toggleNightmare');refresh();});
    wireClick('campHellBtn',()=>{action('toggleHell');refresh();});
    wireClick('campOpenTalentPrestigeBtn',()=>action('openTalents'));
    wireClick('campResetProgressBtn',()=>action('resetProgress'));
    doc()?.querySelectorAll('[data-close-camp-panel]').forEach(button=>{
      if(button.dataset.dbCampWired==='1')return;
      button.dataset.dbCampWired='1';button.addEventListener('click',closePanels);
    });
  }

  function ensureOptionsButton(){
    const scene=find('campScene');if(!scene||find('campOptionsBtn'))return find('campOptionsBtn')||null;
    const host=scene.querySelectorAll('.camp-sky .camp-stars')[0]||scene.querySelector('.camp-sky');
    const button=doc()?.createElement('button');if(!host||!button)return null;
    button.className='camp-spot';button.id='campOptionsBtn';
    button.innerHTML='<div class="camp-icon">⚙️</div><div class="camp-label">Options</div><div class="camp-sub">Save, sound &amp; reset</div>';
    button.addEventListener('click',()=>find('optionsBtn')?.click());host.appendChild(button);
    return button;
  }

  function ensure(){
    const documentRef=doc(),modal=find('startOverlay')?.querySelector('.start-modal');
    if(!documentRef||!modal)return null;
    installLayoutStyles();
    let scene=find('campScene');
    if(scene){wireScene();ensureOptionsButton();return scene;}
    modal.classList.add('legacy-camp-modal');
    find('betweenRunsHub')?.remove();modal.querySelector('.start-art')?.remove();modal.querySelector('h2')?.remove();
    const subtitle=modal.querySelector('.subtitle');
    if(subtitle)subtitle.innerHTML='Between runs, gather at camp. Assign talents, swap companions, inspect heirlooms, toggle difficulties and then head back onto the road.';
    ['nightmareBox','hellBox','startHeirloom'].forEach(id=>find(id)?.classList.add('camp-hidden'));
    const classGrid=find('classGrid'),startButton=find('startBtn');classGrid?.classList.add('camp-hidden');startButton?.classList.add('camp-hidden');
    const help=documentRef.createElement('div');help.className='camp-help';help.textContent='Click the camp features to open their popups. Your selected class and companion remain visible in camp so the hub feels like a literal place between expeditions.';
    modal.insertBefore(help,classGrid||startButton||modal.lastElementChild);
    scene=documentRef.createElement('div');scene.id='campScene';scene.className='camp-scene';scene.innerHTML=campTemplate();help.after(scene);
    if(classGrid)find('campClassHost')?.appendChild(classGrid);startButton?.remove();
    wireScene();ensureOptionsButton();return scene;
  }

  function movePrestigeControls(){
    const moon=find('campMoonPanel');if(!moon)return;
    let host=find('campPrestigeActions');
    if(!host){host=doc()?.createElement('div');if(!host)return;host.id='campPrestigeActions';host.className='camp-prestige-actions';const note=moon.querySelector('.camp-note-line');if(note)note.before(host);else moon.appendChild(host);}
    const box=find('talentOverlay')?.querySelector('.prestige-box'),prestige=find('prestigeBtn'),reset=find('resetMetaBtn');
    if(box&&box.parentElement!==host)host.appendChild(box);
    if(prestige&&prestige.parentElement!==host)host.appendChild(prestige);
    if(reset&&reset.parentElement!==host)host.appendChild(reset);
    find('campResetProgressBtn')?.remove();
    const open=find('campOpenTalentPrestigeBtn');if(open)open.textContent='⭐ Open talents to allocate points';
  }

  function setObjectArt(id,key,cls,alt,fallback){
    const button=find(id);if(!button)return;
    let frame=button.querySelector('.db058-camp-art-frame');
    if(!frame){const old=button.querySelector('.camp-icon');frame=doc()?.createElement('div');if(!frame)return;frame.className='camp-icon db058-camp-art-frame';if(old)old.replaceWith(frame);else button.prepend(frame);}
    let image=frame.querySelector('img');if(!image){image=doc()?.createElement('img');if(!image)return;frame.replaceChildren(image);}
    image.className=`db058-camp-art ${cls||''}`.trim();image.alt=alt;image.draggable=false;
    const src=asset(key,fallback);if(image.getAttribute('src')!==src)image.src=src;
  }

  function renderClassFigure(icon,view){
    if(!icon||!view.classId)return;
    const art=runtime.resolveClassArt?.(view.classId)||root.DiceboundAssets?.resolveClassArt?.(view.classId);
    const src=art?.battle||`assets/ui/class-art/battle/${view.classId}.png`;
    if(icon.dataset.campFullbodyClass===String(view.classId)&&icon.querySelector('img.db058-camp-class-fullbody')?.getAttribute('src')===src)return;
    icon.classList.remove('class-portrait','combat-portrait','db054-art-frame');
    delete icon.dataset.portraitClass;
    const image=doc()?.createElement('img');
    if(!image){icon.textContent=view.classIcon||'';return;}
    image.className='db058-camp-class-fullbody';image.src=src;image.alt=view.className||String(view.classId);image.draggable=false;
    icon.replaceChildren(image);icon.dataset.campFullbodyClass=String(view.classId);
  }

  function refreshArt(view=runtime.getViewModel?.()||{}){
    if(!find('campScene'))return;
    setObjectArt('campMoonBtn','prestigeMoon','db058-prestige-moon','Prestige moon','assets/camp/objects/prestige-moon.png');
    setObjectArt('campAchievementBtn','achievementKeg','db058-achievement-keg','Ale keg and trophy cup','assets/camp/objects/achievement-keg.png');
    setObjectArt('campOptionsBtn','optionsCog','db058-options-cog','Options cog','assets/camp/objects/options-cog.png');
    setObjectArt('campNightmareBtn',view.nightmareMode?'nightmareOn':'nightmareOff','db058-nightmare-art',view.nightmareMode?'Nightmare creature emerged':'Nightmare creature spying from behind a tree',view.nightmareMode?'assets/camp/objects/nightmare-on.png':'assets/camp/objects/nightmare-off.png');
    renderClassFigure(find('campClassIcon'),view);
  }

  function refresh(){
    const overlay=find('startOverlay');if(!overlay)return null;overlay.classList.add('camp-fullscreen');
    const scene=ensure();if(!scene)return null;movePrestigeControls();
    const view=runtime.getViewModel?.()||{};
    const classSub=find('campClassSub');if(classSub)classSub.textContent=view.className?`${view.className} selected · click to change`:'Select class';
    const petIcon=find('campPetIcon');if(petIcon&&view.petIcon)petIcon.textContent=view.petIcon;
    const petLine=find('campPetLine');if(petLine)petLine.textContent=view.petLine||'';
    const legacy=find('campLegacyLine');if(legacy)legacy.textContent=view.summary||'';
    const prestige=find('campPrestigeSummary');if(prestige)prestige.textContent=view.prestigeSummary||'';
    const heirloom=find('campHeirloomSummary');if(heirloom)heirloom.innerHTML=view.heirloomHtml||'';
    const set=find('campChestSet');if(set)set.innerHTML=view.setHtml||'';
    setMode('campNightmareBtn',view.nightmareUnlocked,view.nightmareMode,'Nightmare');
    setMode('campHellBtn',view.hellUnlocked,view.hellMode,'HELL');
    scene.dataset.dbCampLayout=layoutForViewport().id;refreshArt(view);scheduleHitTargetSync();scheduleViewportPositionSync();return scene;
  }

  function setMode(id,unlocked,enabled,label){
    const button=find(id);if(!button)return;
    button.style.visibility=unlocked?'visible':'hidden';button.classList.toggle('active',!!enabled);button.setAttribute('aria-pressed',String(!!enabled));
    const sub=button.querySelector('.camp-sub');if(sub)sub.innerHTML=`${enabled?`${label} ON`:`${label} OFF`} <span class="camp-mode-state">${enabled?'ON':'OFF'}</span>`;
  }

  function paintedBounds(button){
    const rects=[...button.children].map(child=>child.getBoundingClientRect()).filter(rect=>rect.width>1&&rect.height>1);
    if(!rects.length)return null;
    return {left:Math.min(...rects.map(rect=>rect.left)),top:Math.min(...rects.map(rect=>rect.top)),right:Math.max(...rects.map(rect=>rect.right)),bottom:Math.max(...rects.map(rect=>rect.bottom))};
  }

  function syncHitTargets(){
    let changed=false;
    const preserveShortViewportPositions=(root.innerWidth||0)>=1000&&(root.innerHeight||0)<650;
    for(const id of CAMP_OBJECT_IDS){
      if(preserveShortViewportPositions&&['campOptionsBtn','campTalentBtn','campMoonBtn','campClassBtn'].includes(id))continue;
      const button=find(id),painted=button&&paintedBounds(button),buttonRect=button?.getBoundingClientRect(),parent=button?.offsetParent?.getBoundingClientRect();
      if(!button||!painted||!buttonRect||!parent)continue;
      const width=Math.ceil(painted.right-painted.left),height=Math.ceil(painted.bottom-painted.top);if(width<1||height<1)continue;
      if(buttonRect.width<=width+3&&buttonRect.height<=height+3)continue;
      button.style.setProperty('width',`${width}px`,'important');button.style.setProperty('min-width','0','important');button.style.setProperty('max-width',`${width}px`,'important');
      button.style.setProperty('height',`${height}px`,'important');button.style.setProperty('min-height','0','important');button.style.setProperty('max-height',`${height}px`,'important');
      button.style.setProperty('padding','0','important');button.style.setProperty('justify-self','center','important');
      if(root.getComputedStyle?.(button).position==='absolute'){
        button.style.setProperty('left',`${Math.round(painted.left-parent.left)}px`,'important');button.style.setProperty('top',`${Math.round(painted.top-parent.top)}px`,'important');
        button.style.setProperty('right','auto','important');button.style.setProperty('bottom','auto','important');
      }
      button.dataset.db064HitTarget='painted-object';changed=true;
    }
    return changed;
  }

  function scheduleHitTargetSync(){
    const schedule=root.requestAnimationFrame||root.setTimeout||setTimeout;
    const sync=()=>schedule(syncHitTargets);sync();root.setTimeout?.(sync,0);root.setTimeout?.(sync,120);
  }

  // The historical stage scaler writes inline !important anchors after the
  // stylesheet is loaded. Reapply this owner's semantic coordinates after
  // hit-target sizing so a resize cannot resurrect an old offset or eject a
  // short-viewport control from the scene.
  function positionedLayoutControls(layout=layoutForViewport()){
    return layout.rules.map(([selector,declaration])=>{
      const match=selector.match(/^#(camp(?:Options|Talent|Moon|Class)Btn)$/);
      return match?{id:match[1],declaration}:null;
    }).filter(Boolean);
  }

  function applyViewportPositions(){
    for(const {id,declaration} of positionedLayoutControls()){
      const button=find(id);if(!button)continue;
      for(const property of ['left','top','translate']){
        const value=declaration.match(new RegExp(`(?:^|;)${property}:([^;]+)`))?.[1];
        if(value)button.style.setProperty(property,value,'important');
      }
    }
  }

  function clampShortViewportPositions(){
    if((root.innerWidth||0)<1000||(root.innerHeight||0)>=650)return [];
    const inset=8,width=root.innerWidth||0,height=root.innerHeight||0;
    const adjustments=[];
    for(const {id} of positionedLayoutControls()){
      const button=find(id),rect=button?.getBoundingClientRect();
      if(!rect||rect.width<1||rect.height<1)continue;
      const dx=rect.left<inset?inset-rect.left:rect.right>width-inset?width-inset-rect.right:0;
      const dy=rect.top<inset?inset-rect.top:rect.bottom>height-inset?height-inset-rect.bottom:0;
      if(dx||dy){button.style.setProperty('translate',`${Math.round(dx)}px ${Math.round(dy)}px`,'important');adjustments.push({id,dx:Math.round(dx),dy:Math.round(dy)});}
    }
    return adjustments;
  }

  function scheduleViewportPositionSync(){
    const schedule=root.requestAnimationFrame||root.setTimeout||setTimeout;
    const apply=()=>{applyViewportPositions();schedule(clampShortViewportPositions);};
    apply();
    root.setTimeout?.(()=>{apply();root.setTimeout?.(clampShortViewportPositions,40);},180);
    root.setTimeout?.(clampShortViewportPositions,360);
  }

  function inspectHitTargets(){
    return CAMP_OBJECT_IDS.map(id=>{
      const button=find(id),visual=button?.querySelector('.camp-icon,.camp-journey-art-frame'),buttonRect=button?.getBoundingClientRect(),visualRect=visual?.getBoundingClientRect(),painted=button&&paintedBounds(button);
      return {id,present:!!button,semantic:button?.tagName==='BUTTON',focusable:button?.tabIndex===0,button:buttonRect?{width:Math.round(buttonRect.width),height:Math.round(buttonRect.height)}:null,visual:visualRect?{width:Math.round(visualRect.width),height:Math.round(visualRect.height)}:null,painted:painted?{width:Math.round(painted.right-painted.left),height:Math.round(painted.bottom-painted.top)}:null};
    });
  }

  function scheduleRefresh(){
    if(refreshFrame)return;const schedule=root.requestAnimationFrame||root.setTimeout||setTimeout;
    refreshFrame=schedule(()=>{refreshFrame=0;refresh();});
  }

  function configure(nextRuntime={}){
    runtime={...runtime,...nextRuntime,actions:{...runtime.actions,...nextRuntime.actions}};
    installLayoutStyles();
    if(!resizeBound&&root.addEventListener){resizeBound=true;root.addEventListener('resize',()=>{scheduleRefresh();scheduleHitTargetSync();scheduleViewportPositionSync();},{passive:true});}
    return api;
  }

  const api=Object.freeze({
    configure,ensure,refresh,refreshArt,renderClassFigure,openPanel,closePanels,scrollPanel,ensureCompatStartButton,ensureOptionsButton,
    layoutForViewport,layouts:CAMP_LAYOUTS,syncHitTargets,scheduleHitTargetSync,applyViewportPositions,clampShortViewportPositions,scheduleViewportPositionSync,inspectHitTargets,
    requiredSemanticIds:()=>[...CAMP_OBJECT_IDS]
  });
  window.DiceboundCamp=api;
})(window);
