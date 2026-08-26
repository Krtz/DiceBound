(() => {
  "use strict";

  const classes=window.DiceboundClasses;
  const assets=window.DiceboundAssets;
  const storage=window.DiceboundStorage;
  if(!classes)throw new Error("DiceboundClassUnlockFeedback requires DiceboundClasses");
  if(!storage)throw new Error("DiceboundClassUnlockFeedback requires DiceboundStorage");

  const classRegistry=classes.createRegistry();
  const unlockRegistry=classes.createUnlockRegistry();
  const STORAGE_KEY="dicebound.class-unlock-reveals.v1";
  const state={pending:[],acknowledged:[]};
  let activeId=null;
  let lastObserved={id:null,at:0};

  const number=value=>Number(value)||0;
  const integer=value=>Math.max(0,Math.floor(number(value)));
  const formatNumber=value=>integer(value).toLocaleString("en-US");
  const normalizeIds=value=>Array.from(new Set((Array.isArray(value)?value:[]).map(String).filter(id=>classRegistry[id])));

  function loadState(){
    try{
      const raw=JSON.parse(storage.getString(STORAGE_KEY)||"{}");
      state.pending=normalizeIds(raw.pending);
      state.acknowledged=normalizeIds(raw.acknowledged);
      state.pending=state.pending.filter(id=>!state.acknowledged.includes(id));
    }catch(_){state.pending=[];state.acknowledged=[];}
  }
  function saveState(){storage.setString(STORAGE_KEY,JSON.stringify({version:1,pending:state.pending,acknowledged:state.acknowledged}));}

  function statLabel(stat){
    return ({damageTaken:"damage",healingDone:"HP",highestGold:"Gold",potionsUsed:"potions",defense:"Defense",doubleStrike:"Echo Strike",crit:"Crit",bossDamage:"Boss Damage",maxLifesteal:"Lifesteal"})[stat]||String(stat||"progress");
  }
  function formatPercent(value){return `${Math.round(number(value)*100)}%`;}
  function guardianName(requirement){return `the Board ${integer(requirement.board)} ${requirement.guardian==="boss"?"boss":"miniboss"}`;}
  function secretBossName(id){return ({"road-merchant":"hidden Road Merchant","bloodmage-boss":"hidden Bloodmage","pale-devil":"Pale Devil"})[id]||"hidden boss";}
  function className(id){return classRegistry[id]?.name||String(id||"class");}

  function requirementPhrase(requirement={}){
    switch(requirement.type){
      case "always": return "This class is always available.";
      case "guardianDefeat": return `You defeated ${guardianName(requirement)}.`;
      case "prestige": return `You reached ${formatNumber(requirement.count)} Prestige points.`;
      case "lifetimeStat": {
        const amount=requirement.minimum??requirement.greaterThan;
        if(requirement.stat==="damageTaken")return `You endured ${formatNumber(amount)} total damage.`;
        if(requirement.stat==="healingDone")return `You healed ${formatNumber(amount)} total HP.`;
        if(requirement.stat==="highestGold")return `You held at least ${formatNumber(amount)} Gold at once.`;
        if(requirement.stat==="potionsUsed")return `You drank ${formatNumber(amount)} potions.`;
        return `You reached ${formatNumber(amount)} ${statLabel(requirement.stat)} over your career.`;
      }
      case "careerStat": {
        const amount=requirement.minimum??requirement.greaterThan;
        if(requirement.stat==="maxLifesteal")return `You exceeded ${formatPercent(requirement.greaterThan)} Lifesteal.`;
        return `You reached ${formatNumber(amount)} ${statLabel(requirement.stat)} over your career.`;
      }
      case "runStat": {
        const amount=requirement.minimum??requirement.greaterThan;
        const comparison=requirement.greaterThan!==undefined?"more than ":"";
        const rendered=["doubleStrike","crit","bossDamage"].includes(requirement.stat)?formatPercent(amount):formatNumber(amount);
        return `You reached ${comparison}${rendered} ${statLabel(requirement.stat)} in a run.`;
      }
      case "petLevel": return `${requirement.pet==="neutral"?"DiBo":"A companion"} reached level ${formatNumber(requirement.minimum)}.`;
      case "unlockedClassCount": return `You unlocked ${formatNumber(requirement.minimum)} classes.`;
      case "secretBossKills": return `You defeated the ${secretBossName(requirement.boss)}.`;
      case "allPetsUnlocked": return "You unlocked every companion.";
      case "petsAtLevel": return `You raised ${formatNumber(requirement.count)} companions to level ${formatNumber(requirement.level)}.`;
      case "allPetsAtLevel": return `You raised every companion to level ${formatNumber(requirement.level)}.`;
      case "boardClear": return `You cleared Board ${formatNumber(requirement.board)} with ${className(requirement.classId)}.`;
      case "boardClears": {
        const reqs=Array.isArray(requirement.requirements)?requirement.requirements:[];
        if(reqs.length===2&&reqs[0].board===reqs[1].board)return `You cleared Board ${formatNumber(reqs[0].board)} with both ${className(reqs[0].classId)} and ${className(reqs[1].classId)}.`;
        return reqs.map(requirementPhrase).join(" ");
      }
      case "classUnlocked": return `You unlocked ${className(requirement.classId)}.`;
      case "randomRunBoardClear": return `You cleared Board ${formatNumber(requirement.board)} with the Random class.`;
      case "compound": return joinRequirements(requirement.requirements||[]);
      default: return "You completed this class's unlock challenge.";
    }
  }

  function stripYou(text){return String(text||"").replace(/^You\s+/i,"").replace(/^This class\s+/i,"this class ").replace(/\.$/,"");}
  function joinRequirements(requirements=[]){
    const parts=requirements.map(requirementPhrase).filter(Boolean);
    if(parts.length<=1)return parts[0]||"You completed this class's unlock challenge.";
    const cleaned=parts.map(stripYou);
    if(cleaned.length===2)return `You ${cleaned[0]} and ${cleaned[1]}.`;
    return `You ${cleaned.slice(0,-1).join(", ")}, and ${cleaned[cleaned.length-1]}.`;
  }
  function reasonFor(classId){const rule=unlockRegistry[classId];return rule?requirementPhrase(rule):"You completed this class's unlock challenge.";}
  function toastFor(classId){return `${reasonFor(classId).replace(/\.$/,"")}: ${className(classId)} unlocked!`;}
  function shortCopy(text,max=260){const clean=String(text||"").trim();if(clean.length<=max)return clean;const first=clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();return first&&first.length<=max?first:`${clean.slice(0,max-1).trim()}…`;}
  function revealFor(classId){
    const data=classRegistry[classId];if(!data)return null;
    const art=assets?.resolveClassArt?.(classId)||null;
    return Object.freeze({id:classId,name:data.name,art:art?.campsite||art?.headshot||null,artAlt:data.name,why:reasonFor(classId),identity:shortCopy(data.desc||"A newly remembered Way of the Road."),howItPlays:shortCopy(data.passive?.desc||data.scaleNotes||data.ultimate?.desc||"Experiment with the class to discover its defining rhythm."),secret:!!data.secret});
  }

  function enqueue(classId){
    if(!classRegistry[classId]||state.acknowledged.includes(classId)||state.pending.includes(classId))return false;
    state.pending.push(classId);saveState();return true;
  }
  function acknowledge(classId){
    state.pending=state.pending.filter(id=>id!==classId);
    if(classRegistry[classId]&&!state.acknowledged.includes(classId))state.acknowledged.push(classId);
    activeId=null;saveState();
  }
  function campVisible(){const camp=document.getElementById("startOverlay");return !!camp&&!camp.classList.contains("hidden");}

  function ensureStyle(){
    if(document.getElementById("classUnlockRevealStyle"))return;
    const style=document.createElement("style");style.id="classUnlockRevealStyle";style.textContent=`
      .class-unlock-reveal-modal{max-width:720px;text-align:center;overflow:hidden}
      .class-unlock-reveal-kicker{font-size:12px;font-weight:900;letter-spacing:.2em;color:#fbbf24;margin-bottom:6px}
      .class-unlock-reveal-art-wrap{height:min(38vh,330px);display:flex;align-items:flex-end;justify-content:center;margin:2px auto 8px;filter:drop-shadow(0 18px 28px rgba(0,0,0,.45))}
      .class-unlock-reveal-art{max-width:min(88%,360px);max-height:100%;object-fit:contain;object-position:center bottom}
      .class-unlock-reveal-copy{display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left;margin:14px 0}
      .class-unlock-reveal-card{padding:11px 13px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(15,23,42,.7);line-height:1.45}
      .class-unlock-reveal-card strong{display:block;color:#fde68a;margin-bottom:4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
      .class-unlock-reveal-identity{font-size:14px;line-height:1.5;margin:4px auto 0;max-width:620px;color:#e2e8f0}
      .class-unlock-reveal-progress{font-size:11px;color:var(--muted);margin:-3px 0 10px}
      @media(max-width:640px){.class-unlock-reveal-copy{grid-template-columns:1fr}.class-unlock-reveal-art-wrap{height:min(30vh,250px)}}`;
    document.head.appendChild(style);
  }
  function ensureOverlay(){
    let overlay=document.getElementById("classUnlockRevealOverlay");if(overlay)return overlay;
    ensureStyle();overlay=document.createElement("div");overlay.className="overlay hidden";overlay.id="classUnlockRevealOverlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","classUnlockRevealName");overlay.innerHTML=`<div class="modal wide class-unlock-reveal-modal"><div class="class-unlock-reveal-kicker">NEW CLASS UNLOCKED</div><div class="class-unlock-reveal-art-wrap"><img class="class-unlock-reveal-art" id="classUnlockRevealArt" alt=""></div><h2 id="classUnlockRevealName">New class</h2><p class="class-unlock-reveal-identity" id="classUnlockRevealIdentity"></p><div class="class-unlock-reveal-copy"><div class="class-unlock-reveal-card"><strong>How it plays</strong><span id="classUnlockRevealPlay"></span></div><div class="class-unlock-reveal-card"><strong>Why you unlocked it</strong><span id="classUnlockRevealWhy"></span></div></div><div class="class-unlock-reveal-progress" id="classUnlockRevealProgress"></div><button class="main-btn" id="classUnlockRevealContinue" style="width:100%">Got it</button></div>`;document.body.appendChild(overlay);
    document.getElementById("classUnlockRevealContinue").addEventListener("click",()=>{if(activeId)acknowledge(activeId);overlay.classList.add("hidden");setTimeout(showNextReveal,80);});return overlay;
  }
  function showNextReveal(){
    if(activeId||!campVisible()||!state.pending.length)return false;
    const classId=state.pending[0],data=revealFor(classId);if(!data){acknowledge(classId);return showNextReveal();}
    const overlay=ensureOverlay();activeId=classId;
    const art=document.getElementById("classUnlockRevealArt");art.src=data.art||"";art.alt=data.artAlt;art.hidden=!data.art;
    document.getElementById("classUnlockRevealName").textContent=data.name;
    document.getElementById("classUnlockRevealIdentity").textContent=data.identity;
    document.getElementById("classUnlockRevealPlay").textContent=data.howItPlays;
    document.getElementById("classUnlockRevealWhy").textContent=data.why;
    document.getElementById("classUnlockRevealProgress").textContent=state.pending.length>1?`${state.pending.length} new classes are waiting to be revealed.`:"";
    overlay.classList.remove("hidden");document.getElementById("classUnlockRevealContinue")?.focus();return true;
  }

  function classIdFromUnlockToast(text){
    const normalized=String(text||"").toLowerCase();if(!normalized.includes("unlock"))return null;
    return Object.values(classRegistry).sort((a,b)=>b.name.length-a.name.length).find(data=>normalized.includes(data.name.toLowerCase()))?.id||null;
  }
  function handleToast(){
    const toast=document.getElementById("toast");if(!toast)return;
    const classId=classIdFromUnlockToast(toast.textContent);if(!classId)return;
    const now=Date.now();if(lastObserved.id!==classId||now-lastObserved.at>800){enqueue(classId);lastObserved={id:classId,at:now};}
    const replacement=toastFor(classId);if(toast.textContent!==replacement)toast.textContent=replacement;
  }
  function startObservers(){
    loadState();ensureOverlay();
    const toast=document.getElementById("toast");if(toast)new MutationObserver(handleToast).observe(toast,{childList:true,characterData:true,subtree:true});
    const camp=document.getElementById("startOverlay");if(camp)new MutationObserver(()=>{if(campVisible())setTimeout(showNextReveal,120);}).observe(camp,{attributes:true,attributeFilter:["class"]});
    handleToast();if(campVisible())setTimeout(showNextReveal,120);
  }

  window.DiceboundClassUnlockFeedback=Object.freeze({apiVersion:1,reasonFor,toastFor,revealFor,requirementPhrase,enqueue,showNextReveal,state:()=>({pending:[...state.pending],acknowledged:[...state.acknowledged],activeId})});
  startObservers();
})();
