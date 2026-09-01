/* DiceBound Options/settings presentation owner.
 *
 * Audio, save-folder integration, progress-reset confirmation, persistence and
 * platform mechanics remain in their authoritative runtime owners. This module
 * owns the Options destination, its controls, responsive chrome and semantic
 * top-action trigger.
 */
(function(root){
  'use strict';

  const OWNER='ui/options';
  const STYLE_ID='dicebound-options-ui-owner';
  let runtime={};

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
  function settings(){
    const source=runtime.getSettings?.()||{};
    return Object.freeze({
      muted:!!source.muted,
      masterVolume:clamp(source.masterVolume??.7,0,1),
      soundPack:source.soundPack==='custom'?'custom':'synth'
    });
  }
  function nativeSaveSupported(){return !!runtime.nativeSaveSupported?.();}

  function installStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById(STYLE_ID))return;
    const style=documentRef.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #muteBtn,#saveFolderBtn,#campResetProgressBtn{display:none!important}
      #optionsBtn{min-width:132px}
      #optionsOverlay.options-overlay{z-index:145;padding:clamp(8px,2vw,22px);align-items:center;justify-content:center;background:rgba(3,7,16,.78);backdrop-filter:blur(8px)}
      #optionsOverlay.options-overlay.hidden{display:none}
      #optionsOverlay .options-shell{width:min(900px,100%);max-height:calc(100vh - clamp(16px,4vw,44px));overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:22px;background:linear-gradient(145deg,#111b34,#172747 55%,#10182c);box-shadow:0 28px 75px rgba(0,0,0,.55);scrollbar-color:#657ca9 transparent}
      #optionsOverlay .options-chrome{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;gap:14px;padding:16px clamp(14px,3vw,28px);border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(16,27,50,.99),rgba(16,27,50,.93));backdrop-filter:blur(12px)}
      #optionsOverlay .options-kicker{display:block;color:#91c5ff;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      #optionsOverlay .options-chrome h2{margin:3px 0 0;font-size:clamp(20px,3vw,30px)}
      #optionsOverlay .options-done{margin-left:auto;flex:0 0 auto;position:relative;z-index:6;min-width:88px}
      #optionsOverlay .options-content{padding:clamp(14px,3vw,28px) clamp(14px,3vw,30px) 28px}
      #optionsOverlay .options-subtitle{margin:0 0 14px;color:#dce7fb;font-size:12px;line-height:1.45}
      #optionsOverlay .options-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:12px}
      #optionsOverlay .options-card{padding:12px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);display:grid;gap:8px}
      #optionsOverlay .options-card b{font-size:12px}#optionsOverlay .options-card span{font-size:10px;color:var(--muted);line-height:1.45}
      #optionsOverlay .options-note{margin-top:12px;font-size:11px;color:var(--muted);line-height:1.5}
      #optionsOverlay .options-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#optionsOverlay .options-inline strong{font-size:11px}
      #optionsOverlay .options-volume{width:100%}#optionsOverlay .options-range{width:100%;accent-color:#d8b36a}
      #optionsOverlay .options-select{width:100%;padding:9px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(9,14,24,.88);color:var(--ink);font:inherit}
      @media(max-width:700px){#optionsOverlay.options-overlay{padding:0;align-items:stretch}#optionsOverlay .options-shell{width:100%;max-height:100vh;min-height:100vh;border-radius:0;border-width:0}#optionsOverlay .options-chrome{padding:14px 16px}#optionsOverlay .options-chrome h2{font-size:22px}#optionsOverlay .options-content{padding:14px 16px 28px}}
    `;
    documentRef.head?.appendChild(style);
  }

  function ensureSurface(){
    const documentRef=doc();
    let overlay=find('optionsOverlay');
    if(!documentRef)return null;
    if(!overlay){overlay=documentRef.createElement('div');overlay.id='optionsOverlay';overlay.className='overlay hidden';documentRef.body?.appendChild(overlay);}
    installStyles();
    overlay.classList.add('overlay','options-overlay');
    overlay.dataset.optionsOwner=OWNER;
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Options');
    if(overlay.dataset.optionsSurface!=='1'){
      overlay.dataset.optionsSurface='1';
      overlay.innerHTML=`<section class="options-shell"><header class="options-chrome"><div><span class="options-kicker">DiceBound runtime</span><h2>Options</h2></div><button type="button" class="small-btn options-done" id="optionsCloseBtn" data-options-done>Done</button></header><div class="options-content"><p class="options-subtitle">Runtime helpers, audio controls and permanent-progress utilities.</p><div class="options-grid"><section class="options-card"><b>Native save tools</b><span>Open the real save-folder location when you are running the Windows wrapper.</span><button type="button" class="small-btn" id="optionsOpenSaveBtn">Open Save Folder</button></section><section class="options-card"><b>Audio</b><span>Toggle sound effects, choose the active sound pack, and set the global SFX volume.</span><button type="button" class="small-btn" id="optionsSoundBtn">Sound: On</button><div class="options-volume"><div class="options-inline"><strong>Volume</strong><span id="optionsVolumeValue">70%</span></div><input class="options-range" id="optionsVolumeSlider" type="range" min="0" max="100" step="1" value="70"></div><div><strong style="font-size:11px">Sound Pack</strong><select class="options-select" id="optionsSoundPackSelect"><option value="synth">Built-in synth</option><option value="custom">Custom asset pack (auto fallback)</option></select></div></section><section class="options-card"><b>Permanent progress</b><span>Reset legacy progress, unlocks, heirlooms, pets and achievements. This uses the existing confirmation flow.</span><button type="button" class="small-btn danger" id="optionsResetBtn">Reset all progress</button></section></div><div class="options-note" id="optionsRuntimeNote"></div></div></section>`;
      find('optionsOpenSaveBtn')?.addEventListener('click',()=>{const result=runtime.openSaveFolder?.();if(result&&typeof result.then==='function')result.finally(()=>sync());else sync();});
      find('optionsSoundBtn')?.addEventListener('click',()=>{runtime.toggleMuted?.();sync();});
      find('optionsVolumeSlider')?.addEventListener('input',event=>{runtime.setVolume?.(clamp(event.target?.value,0,100)/100);sync();});
      find('optionsVolumeSlider')?.addEventListener('change',()=>runtime.playPreview?.());
      find('optionsSoundPackSelect')?.addEventListener('change',event=>{runtime.setSoundPack?.(event.target?.value==='custom'?'custom':'synth');sync();runtime.playPreview?.();});
      find('optionsResetBtn')?.addEventListener('click',()=>{runtime.resetProgress?.();close();});
      find('optionsCloseBtn')?.addEventListener('click',close);
      overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    }
    return overlay;
  }

  function ensureTopAction(){
    const documentRef=doc(),topActions=documentRef?.querySelector?.('.top-actions');
    find('saveFolderBtn')&&(find('saveFolderBtn').hidden=true);
    find('muteBtn')&&(find('muteBtn').hidden=true);
    if(!topActions)return null;
    let button=find('optionsBtn');
    if(!button){
      button=documentRef.createElement('button');button.className='small-btn';button.id='optionsBtn';button.textContent='Options';
      topActions.insertBefore(button,find('restartBtn')||null);
      button.addEventListener('click',open);
    }
    return button;
  }

  function sync(){
    const overlay=ensureSurface();
    const state=settings(),supported=nativeSaveSupported();
    const soundButton=find('optionsSoundBtn'),saveButton=find('optionsOpenSaveBtn'),note=find('optionsRuntimeNote');
    const slider=find('optionsVolumeSlider'),volumeValue=find('optionsVolumeValue'),packSelect=find('optionsSoundPackSelect');
    if(soundButton)soundButton.textContent=state.muted?'Sound: Off':'Sound: On';
    if(slider)slider.value=String(Math.round(state.masterVolume*100));
    if(volumeValue)volumeValue.textContent=`${Math.round(state.masterVolume*100)}%`;
    if(packSelect)packSelect.value=state.soundPack;
    if(saveButton){saveButton.disabled=!supported;saveButton.textContent=supported?'Open Save Folder':'Open Save Folder (native only)';}
    if(note){
      const runtimeText=supported?'Native wrapper detected. Saves live in %LOCALAPPDATA%\\Dicebound\\saves and this screen can open that folder directly.':'Browser build detected. Save-folder opening is available only in the native Windows wrapper; audio and reset controls still work here.';
      note.textContent=`${runtimeText} Custom SFX use the existing supported custom-sound folder and fall back to the built-in synth when an asset is missing.`;
    }
    return Object.freeze({owner:OWNER,muted:state.muted,volume:state.masterVolume,soundPack:state.soundPack,nativeSaveSupported:supported});
  }
  function open(){ensureTopAction();const overlay=ensureSurface();sync();if(overlay){overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');}return overlay;}
  function close(){const overlay=find('optionsOverlay');if(overlay){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');}return overlay||null;}
  function configure(nextRuntime={}){runtime={...runtime,...nextRuntime};ensureTopAction();return api;}
  function inspect(){const overlay=find('optionsOverlay');return Object.freeze({owner:overlay?.dataset.optionsOwner||null,open:!!overlay&&!overlay.classList.contains('hidden'),hasDone:!!overlay?.querySelector?.('[data-options-done]'),nativeSaveSupported:nativeSaveSupported()});}
  const api=Object.freeze({configure,ensure:ensureSurface,ensureTopAction,open,close,sync,inspect,owner:OWNER});
  window.DiceboundOptionsUi=api;
})(window);
