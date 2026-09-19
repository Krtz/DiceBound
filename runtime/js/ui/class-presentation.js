(function(root){
  "use strict";

  const OWNER="ui/class-presentation";
  let runtime=null;

  function configure(next={}){
    for(const name of ["find","getClass","resolveClassArt"]){
      if(typeof next?.[name]!=="function")throw new Error(`Class presentation requires ${name}().`);
    }
    runtime=next;
    return api;
  }
  function rt(){if(!runtime)throw new Error("Class presentation must be configured before use.");return runtime;}
  function classEntry(classId){
    const entry=rt().getClass(String(classId));
    if(!entry)throw new Error(`Unknown class id: ${classId}`);
    return entry;
  }
  function artEntry(classId){
    const art=rt().resolveClassArt(String(classId));
    if(!art)throw new Error(`Missing class art asset: ${classId}`);
    return art;
  }
  function imageElement(src,alt,className,onError){
    const doc=rt().document||root.document;
    if(!doc?.createElement)throw new Error("Class presentation requires a document with createElement().");
    const img=doc.createElement("img");
    img.className=className||"";
    img.alt=alt||"";
    img.draggable=false;
    img.src=src;
    if(typeof img.addEventListener==="function")img.addEventListener("error",onError,{once:true});
    else img.onerror=onError;
    return img;
  }
  function emojiFallback(el,entry){
    el.innerHTML="";
    el.textContent=entry.icon||"🎲";
    el.dataset.classArtFallback="emoji";
  }
  function applyPortrait(el,classId,combat=false){
    if(!el)return null;
    const entry=classEntry(classId),art=artEntry(classId),src=combat?art.battle:art.headshot;
    el.classList?.remove?.("ranger-portrait");
    el.classList?.add?.(combat?"combat-portrait":"class-portrait","db054-art-frame");
    el.dataset.classArt=entry.id;
    delete el.dataset.classArtFallback;
    el.innerHTML="";
    const img=imageElement(src,entry.name,`db054-class-art db054-class-art-${combat?"battle":"headshot"}`,()=>emojiFallback(el,entry));
    el.appendChild(img);
    return img;
  }
  function applyBoardMarker(el,classId){
    if(!el)return null;
    const entry=classEntry(classId),art=artEntry(classId);
    el.setAttribute?.("aria-label",`${entry.name} board marker`);
    el.dataset.classArt=entry.id;
    delete el.dataset.classArtFallback;
    el.innerHTML="";
    const img=imageElement(art.marker,`${entry.name} board marker`,"db-class-board-marker",()=>emojiFallback(el,entry));
    el.appendChild(img);
    return img;
  }
  function syncActive(classId){
    const id=String(classId);
    applyPortrait(rt().find("heroAvatar"),id,false);
    applyPortrait(rt().find("combatPlayerIcon"),id,true);
    applyBoardMarker(rt().find("pawn"),id);
    return Object.freeze({classId:id,owner:OWNER});
  }
  function inspect(){
    const hero=rt().find("heroAvatar"),combat=rt().find("combatPlayerIcon"),pawn=rt().find("pawn");
    return Object.freeze({
      owner:OWNER,
      hero:hero?.dataset?.classArt||null,
      combat:combat?.dataset?.classArt||null,
      pawn:pawn?.dataset?.classArt||null
    });
  }

  const api=Object.freeze({owner:OWNER,apiVersion:1,configure,applyPortrait,applyBoardMarker,syncActive,inspect});
  root.DiceboundClassPresentation=api;
})(window);
