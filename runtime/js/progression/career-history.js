/* DiceBound career telemetry + bounded run history domain owner.
 *
 * Owns lifetime career aggregates, semantic enemy defeat counts, one active
 * run-history identity and exactly-once terminal snapshots. Presentation,
 * active-run state and persistence I/O are injected by DiceboundProgression.
 */
(() => {
  "use strict";

  const OWNER="progression/career-history";
  const HISTORY_LIMIT=30;
  const MODES=new Set(["normal","nightmare","hell"]);

  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const integer=value=>Math.max(0,Math.floor(number(value)));
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const plainMap=value=>value&&typeof value==="object"&&!Array.isArray(value)?{...value}:{};

  function defaultStats(){
    return {
      runsStarted:0,runsFinished:0,fullVictories:0,deaths:0,abandonedRuns:0,
      rolls:0,tilesTraveled:0,damageDealt:0,damageTaken:0,healingDone:0,
      goldEarned:0,goldSpent:0,highestGold:0,enemiesDefeated:0,bossesDefeated:0,
      minibossesDefeated:0,powerupsTaken:0,potionsUsed:0,highestRunLevel:1,
      largestHit:0,criticalStrikes:0,echoStrikes:0,elementalProcs:0,
      boardClears:{},classMaxLevel:{},classRuns:{},enemyDefeats:{}
    };
  }

  function normalizeStats(raw={}){
    const base=defaultStats(),stats={...base,...(raw||{})};
    for(const key of Object.keys(base)){
      if(typeof base[key]==="number")stats[key]=Math.max(0,number(stats[key]));
    }
    stats.highestRunLevel=Math.max(1,integer(stats.highestRunLevel));
    stats.boardClears=plainMap(stats.boardClears);
    stats.classMaxLevel=plainMap(stats.classMaxLevel);
    stats.classRuns=plainMap(stats.classRuns);
    stats.enemyDefeats=plainMap(stats.enemyDefeats);
    return stats;
  }

  function normalizeHistoryEntry(raw={}){
    const equipment=Array.isArray(raw.equipment)?raw.equipment.slice(0,16).map(entry=>({
      slot:String(entry?.slot||""),id:String(entry?.id||""),name:String(entry?.name||entry?.id||"Unknown gear"),
      rarity:String(entry?.rarity||""),element:entry?.element?String(entry.element):null
    })):[];

    const powerups=Array.isArray(raw.powerups)?raw.powerups.slice(0,128).map(entry=>({
      id:String(entry?.id||""),count:Math.max(1,integer(entry?.count)||1)
    })).filter(entry=>entry.id):[];

    const finalStats={};
    for(const key of ["maxHp","hp","attack","defense","crit","dodge","lifeSteal","luck","echo","bossDamage"]){
      finalStats[key]=Math.max(0,number(raw.finalStats?.[key]));
    }

    return {
      id:String(raw.id||""),sequence:integer(raw.sequence),startedAt:raw.startedAt?String(raw.startedAt):null,
      endedAt:raw.endedAt?String(raw.endedAt):null,version:String(raw.version||""),seed:raw.seed?String(raw.seed):null,classId:String(raw.classId||"ranger"),
      mode:MODES.has(String(raw.mode||"").toLowerCase())?String(raw.mode).toLowerCase():"normal",
      outcome:["victory","death","abandoned","ended"].includes(raw.outcome)?raw.outcome:"ended",
      boardReached:Math.max(1,integer(raw.boardReached)||1),position:integer(raw.position),level:Math.max(1,integer(raw.level)||1),
      gold:integer(raw.gold),rolls:integer(raw.rolls),tilesMoved:integer(raw.tilesMoved),legacyXp:integer(raw.legacyXp),
      petId:raw.petId?String(raw.petId):null,prestigeCount:integer(raw.prestigeCount),legacyLevel:Math.max(1,integer(raw.legacyLevel)||1),
      equipment,powerups,finalStats
    };
  }

  function ensure(meta={}){
    meta.stats=normalizeStats(meta.stats||{});
    const career=meta.career&&typeof meta.career==="object"?meta.career:{};
    career.nextRunId=Math.max(1,integer(career.nextRunId)||1);
    career.activeRun=career.activeRun&&typeof career.activeRun==="object"?{
      id:String(career.activeRun.id||""),sequence:integer(career.activeRun.sequence),
      startedAt:career.activeRun.startedAt?String(career.activeRun.startedAt):null,
      version:String(career.activeRun.version||""),seed:career.activeRun.seed?String(career.activeRun.seed):null,classId:String(career.activeRun.classId||"ranger"),
      mode:MODES.has(String(career.activeRun.mode||"").toLowerCase())?String(career.activeRun.mode).toLowerCase():"normal",
      petId:career.activeRun.petId?String(career.activeRun.petId):null
    }:null;
    career.history=(Array.isArray(career.history)?career.history:[]).map(normalizeHistoryEntry).filter(entry=>entry.id).slice(0,HISTORY_LIMIT);
    meta.career=career;
    return Object.freeze({stats:meta.stats,career:meta.career});
  }

  function migrateLegacy(meta={}){
    const state=ensure(meta),s=state.stats;
    // Legacy fields are read exactly at load/import normalization. Keeping this
    // bridge out of ensure() prevents ordinary live reads from rewriting
    // current Career counters later in the same run.
    s.runsFinished=Math.max(s.runsFinished,integer(meta.runs));
    s.runsStarted=Math.max(s.runsStarted,s.runsFinished);
    s.fullVictories=Math.max(s.fullVictories,integer(meta.board6Clears));
    s.damageTaken=Math.max(s.damageTaken,Math.max(0,number(meta.damageTaken)));
    return state;
  }

  function stats(meta){return ensure(meta).stats;}
  function history(meta){return Object.freeze(ensure(meta).career.history.map(entry=>Object.freeze(clone(entry))));}

  function beginRun(meta,{classId="ranger",mode="normal",petId=null,version="",seed=null,startedAt=null}={}){
    const state=ensure(meta),sequence=state.career.nextRunId++;
    const active={
      id:`run-${String(sequence).padStart(6,"0")}`,sequence,
      startedAt:startedAt?String(startedAt):null,version:String(version||""),seed:seed?String(seed):null,classId:String(classId||"ranger"),
      mode:MODES.has(String(mode).toLowerCase())?String(mode).toLowerCase():"normal",
      petId:petId?String(petId):null
    };
    state.career.activeRun=active;
    state.stats.runsStarted++;
    state.stats.classRuns[active.classId]=(integer(state.stats.classRuns[active.classId])||0)+1;
    return Object.freeze(clone(active));
  }

  function boardClearKey(classId,board,mode="normal"){
    const resolved=MODES.has(String(mode).toLowerCase())?String(mode).toLowerCase():"normal";
    return `${String(classId||"ranger")}:${resolved}:b${Math.max(1,integer(board)||1)}`;
  }

  function recordBoardClear(meta,{classId,board,mode="normal"}={}){
    const s=stats(meta),key=boardClearKey(classId,board,mode);
    s.boardClears[key]=(integer(s.boardClears[key])||0)+1;
    return s.boardClears[key];
  }

  function hasBoardClear(meta,classId,board){
    const s=stats(meta),target=Math.max(1,integer(board)||1);
    return ["normal","nightmare","hell"].some(mode=>integer(s.boardClears[boardClearKey(classId,target,mode)])>0);
  }

  function recordDamage(meta,amount){
    const dealt=Math.max(0,number(amount));if(!dealt)return 0;
    const s=stats(meta);s.damageDealt+=dealt;s.largestHit=Math.max(s.largestHit,dealt);return dealt;
  }
  function recordHealing(meta,amount){const value=Math.max(0,number(amount));if(value)stats(meta).healingDone+=value;return value;}
  function recordDamageTaken(meta,amount){const value=Math.max(0,number(amount));if(value)stats(meta).damageTaken+=value;return value;}
  function recordGoldEarned(meta,amount){const value=Math.max(0,number(amount));if(value)stats(meta).goldEarned+=value;return value;}
  function recordGoldSpent(meta,amount){const value=Math.max(0,number(amount));if(value)stats(meta).goldSpent+=value;return value;}
  function recordPotion(meta){const s=stats(meta);s.potionsUsed++;return s.potionsUsed;}
  function recordPowerup(meta){const s=stats(meta);s.powerupsTaken++;return s.powerupsTaken;}
  function recordElementProc(meta,count=1){const s=stats(meta);s.elementalProcs+=Math.max(0,integer(count));return s.elementalProcs;}
  function recordStrike(meta,result={}){
    const s=stats(meta);
    if(result.echo)s.echoStrikes++;
    if(number(result.critTiers)>0||number(result.crit)>0)s.criticalStrikes++;
    return Object.freeze({criticalStrikes:s.criticalStrikes,echoStrikes:s.echoStrikes});
  }

  function recordEnemyDefeats(meta,enemies=[],context={}){
    const s=stats(meta),list=Array.isArray(enemies)?enemies.filter(Boolean):[];
    s.enemiesDefeated+=list.length;
    if(context.boss)s.bossesDefeated++;
    if(context.miniboss)s.minibossesDefeated++;
    for(const enemy of list){
      const id=String(enemy.id||"").trim();
      if(!id)continue;
      s.enemyDefeats[id]=(integer(s.enemyDefeats[id])||0)+1;
    }
    return list.length;
  }

  function recordVitals(meta,{previousHp,currentHp,previousGold,currentGold,classId,level}={}){
    const s=stats(meta);
    const hpBefore=number(previousHp),hpAfter=number(currentHp),goldBefore=number(previousGold),goldAfter=number(currentGold);
    if(Number.isFinite(Number(previousHp))&&hpAfter>hpBefore)s.healingDone+=hpAfter-hpBefore;
    if(Number.isFinite(Number(previousGold))&&goldAfter>goldBefore)s.goldEarned+=goldAfter-goldBefore;
    s.highestGold=Math.max(s.highestGold,Math.floor(Math.max(0,goldAfter)));
    s.highestRunLevel=Math.max(s.highestRunLevel,Math.max(1,integer(level)||1));
    if(classId)s.classMaxLevel[classId]=Math.max(integer(s.classMaxLevel[classId])||1,Math.max(1,integer(level)||1));
    return s;
  }

  function finalizeRun(meta,snapshot={}){
    const state=ensure(meta),s=state.stats,career=state.career;
    let active=career.activeRun;
    if(!active){
      const sequence=career.nextRunId++;
      active={id:`run-${String(sequence).padStart(6,"0")}`,sequence,startedAt:null,version:String(snapshot.version||""),seed:snapshot.seed?String(snapshot.seed):null,classId:String(snapshot.classId||"ranger"),mode:MODES.has(String(snapshot.mode||"").toLowerCase())?String(snapshot.mode).toLowerCase():"normal",petId:snapshot.petId?String(snapshot.petId):null};
    }

    const existing=career.history.find(entry=>entry.id===active.id);
    if(existing){career.activeRun=null;return Object.freeze(clone(existing));}

    const outcome=["victory","death","abandoned","ended"].includes(snapshot.outcome)?snapshot.outcome:"ended";
    s.runsFinished++;
    if(outcome==="victory")s.fullVictories++;
    else if(outcome==="death")s.deaths++;
    else if(outcome==="abandoned")s.abandonedRuns++;
    s.rolls+=integer(snapshot.rolls);
    s.tilesTraveled+=integer(snapshot.tilesMoved);
    s.highestRunLevel=Math.max(s.highestRunLevel,Math.max(1,integer(snapshot.level)||1));
    s.highestGold=Math.max(s.highestGold,integer(snapshot.gold));
    const classId=String(snapshot.classId||active.classId||"ranger");
    s.classMaxLevel[classId]=Math.max(integer(s.classMaxLevel[classId])||1,Math.max(1,integer(snapshot.level)||1));

    const record=normalizeHistoryEntry({
      ...active,...snapshot,id:active.id,sequence:active.sequence,classId,
      endedAt:snapshot.endedAt||null,version:snapshot.version||active.version,mode:snapshot.mode||active.mode,petId:snapshot.petId??active.petId
    });
    if(!career.history.some(entry=>entry.id===record.id))career.history.unshift(record);
    career.history=career.history.slice(0,HISTORY_LIMIT);
    career.activeRun=null;
    return Object.freeze(clone(record));
  }

  function inspect(meta){
    const state=ensure(meta);
    return Object.freeze({owner:OWNER,historyLimit:HISTORY_LIMIT,historyCount:state.career.history.length,activeRunId:state.career.activeRun?.id||null});
  }

  window.DiceboundCareerHistory=Object.freeze({
    apiVersion:1,owner:OWNER,HISTORY_LIMIT,defaultStats,normalizeStats,normalizeHistoryEntry,ensure,migrateLegacy,stats,history,
    beginRun,boardClearKey,recordBoardClear,hasBoardClear,recordDamage,recordHealing,recordDamageTaken,recordGoldEarned,recordGoldSpent,
    recordPotion,recordPowerup,recordElementProc,recordStrike,recordEnemyDefeats,recordVitals,finalizeRun,inspect
  });
})();
