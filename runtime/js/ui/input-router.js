/* DiceBound app-shell keyboard/input routing owner.
 *
 * Owns whether a global key event may invoke an existing semantic action.
 * Gameplay owners still own what those actions do: Road Dice owns rolling and
 * each UI surface owns its visible dismissal control.
 */
(function(root){
  "use strict";

  const OWNER="ui/input-router";
  let runtime={};
  let bound=false;

  function configure(next={}){runtime={...runtime,...next};return api;}
  function doc(){return runtime.getDocument?.()||root.document||null;}
  function win(){return runtime.getWindow?.()||root;}

  function isTextEditingTarget(target){
    if(!target)return false;
    const tag=String(target.tagName||"").toLowerCase();
    if(tag==="input"||tag==="textarea"||tag==="select")return true;
    if(target.isContentEditable)return true;
    return !!target.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]');
  }

  function hiddenByAncestor(node){
    for(let current=node;current;current=current.parentElement){
      if(current.hidden)return true;
      if(current.classList?.contains?.("hidden"))return true;
      if(current.getAttribute?.("aria-hidden")==="true")return true;
    }
    return false;
  }
  function isUsableDismissControl(node){
    if(!node||node.disabled||hiddenByAncestor(node))return false;
    if(typeof node.getClientRects==="function"&&node.getClientRects().length===0)return false;
    return true;
  }
  function visibleDismissControls(){
    return [...(doc()?.querySelectorAll?.("[data-app-dismiss]")||[])].filter(isUsableDismissControl);
  }
  function dismissTop(event){
    const controls=visibleDismissControls();
    const control=controls[controls.length-1];
    if(!control)return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    control.click?.();
    return true;
  }

  function hasBlockingOverlay(){
    const overlays=[...(doc()?.querySelectorAll?.(".overlay")||[])];
    return overlays.some(overlay=>{
      if(overlay?.id==="startOverlay")return false;
      return !hiddenByAncestor(overlay);
    });
  }

  function handleKeydown(event){
    if(!event||event.defaultPrevented||isTextEditingTarget(event.target))return false;
    const key=event.key;

    if(key==="Escape"){
      if(event.repeat){event.preventDefault?.();return true;}
      if(dismissTop(event))return true;
      if(hasBlockingOverlay()){event.preventDefault?.();return true;}
      const opened=runtime.openOptions?.();
      if(opened!==false){event.preventDefault?.();return true;}
      return false;
    }

    if(key!==" "&&key!=="Enter")return false;
    if(hasBlockingOverlay())return false;
    if(event.repeat){event.preventDefault?.();return true;}
    return runtime.handleRoadKeydown?.(event)===true;
  }

  function bind(){
    if(bound)return api;
    const target=win();
    if(!target?.addEventListener)return api;
    bound=true;
    target.addEventListener("keydown",handleKeydown);
    return api;
  }

  function inspect(){
    return Object.freeze({owner:OWNER,bound,dismissControls:visibleDismissControls().length,blockingOverlay:hasBlockingOverlay()});
  }

  const api=Object.freeze({apiVersion:1,owner:OWNER,configure,bind,handleKeydown,isTextEditingTarget,visibleDismissControls,dismissTop,hasBlockingOverlay,inspect});
  root.DiceboundInputRouter=api;
})(window);
