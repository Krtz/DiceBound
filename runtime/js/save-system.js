(() => {
  "use strict";
  const IDENTITY=window.DiceboundVersion;
  if(!IDENTITY)throw new Error("DiceboundSave requires DiceboundVersion before loading.");
  const FORMAT="dicebound-save";
  const SCHEMA_VERSION=2;
  const GAME_VERSION=IDENTITY.version;
  const PRIMARY_KEY="dicebound.save.primary";
  const BACKUP_KEY="dicebound.save.backup";
  const BACKUP_KEYS=[BACKUP_KEY,"dicebound.save.backup.2","dicebound.save.backup.3","dicebound.save.backup.4","dicebound.save.backup.5"];
  const RUN_FORMAT="dicebound-active-run";
  const RUN_SCHEMA_VERSION=1;
  const RUN_PRIMARY_KEY="dicebound.run.primary";
  const RUN_BACKUP_KEYS=["dicebound.run.backup","dicebound.run.backup.2","dicebound.run.backup.3"];
  const EXPORT_PREFIX="DICEBOUND_SAVE_V2:";
  const LEGACY_KEYS=["dicebound_transferable_v15","dicebound_transferable_v14","dicebound_transferable_v13","dicebound_v12_fresh_save","dicebound_rpg_v11_save"];
  const storage=window.DiceboundStorage;
  if(!storage)throw new Error("DiceboundSave requires DiceboundStorage before loading.");

  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>window.DiceboundPlatform?.nowIso?.()||new Date().toISOString();
  function utf8ToB64(str){return btoa(unescape(encodeURIComponent(str)));}
  function b64ToUtf8(str){return decodeURIComponent(escape(atob(str)));}

  const migrations={
    0(env){
      return {format:FORMAT,schemaVersion:1,gameVersion:GAME_VERSION,savedAt:env.savedAt||now(),profile:{id:"primary"},payload:{meta:clone(env.payload?.meta||{})}};
    },
    1(env){
      env=clone(env);env.schemaVersion=2;env.gameVersion=GAME_VERSION;env.savedAt=env.savedAt||now();return env;
    }
  };

  function asEnvelope(value){
    if(!value||typeof value!=="object")throw new Error("Save is not an object");
    if(value.format===FORMAT){return clone(value);}
    // Schema 0 is the intentionally loose Alpha/raw-meta import format.
    return {format:FORMAT,schemaVersion:0,gameVersion:"legacy-alpha",savedAt:now(),payload:{meta:clone(value)}};
  }
  function migrate(value){
    let env=asEnvelope(value),guard=0;
    while((Number(env.schemaVersion)||0)<SCHEMA_VERSION){
      const fn=migrations[Number(env.schemaVersion)||0];
      if(!fn)throw new Error(`No save migration from schema ${env.schemaVersion}`);
      env=fn(env); if(++guard>20)throw new Error("Save migration loop");
    }
    if(env.schemaVersion!==SCHEMA_VERSION)throw new Error(`Save schema ${env.schemaVersion} is newer than supported ${SCHEMA_VERSION}`);
    if(!env.payload?.meta||typeof env.payload.meta!=="object")throw new Error("Save payload is missing meta");
    env.gameVersion=GAME_VERSION;
    return env;
  }
  function createEnvelope(meta){return {format:FORMAT,schemaVersion:SCHEMA_VERSION,gameVersion:GAME_VERSION,savedAt:now(),profile:{id:"primary"},payload:{meta:clone(meta)}};}
  function parseStored(raw){if(!raw)return null;return migrate(JSON.parse(raw));}
  function rotateBackups(previous){
    if(!previous)return;
    for(let i=BACKUP_KEYS.length-1;i>=1;i--){const older=storage.getString(BACKUP_KEYS[i-1]);if(older)storage.setString(BACKUP_KEYS[i],older);else storage.remove(BACKUP_KEYS[i]);}
    storage.setString(BACKUP_KEYS[0],previous);
  }
  function writeEnvelope(env,{backup=true}={}){
    const previous=storage.getString(PRIMARY_KEY);
    if(backup&&previous)rotateBackups(previous);
    storage.setString(PRIMARY_KEY,JSON.stringify(migrate(env)));
    return true;
  }
  function saveMeta(meta){return writeEnvelope(createEnvelope(meta));}

  function asRunEnvelope(value){
    if(!value||typeof value!=="object")throw new Error("Active-run checkpoint is not an object");
    if(value.format!==RUN_FORMAT)throw new Error(`Active-run checkpoint format ${value.format||"missing"} is unsupported`);
    if(Number(value.schemaVersion)!==RUN_SCHEMA_VERSION)throw new Error(`Active-run checkpoint schema ${value.schemaVersion} is unsupported`);
    if(!value.payload?.checkpoint||typeof value.payload.checkpoint!=="object")throw new Error("Active-run checkpoint payload is missing");
    const env=clone(value);env.gameVersion=GAME_VERSION;return env;
  }
  function createRunEnvelope(checkpoint){return {format:RUN_FORMAT,schemaVersion:RUN_SCHEMA_VERSION,gameVersion:GAME_VERSION,savedAt:now(),payload:{checkpoint:clone(checkpoint)}};}
  function parseRunStored(raw){if(!raw)return null;return asRunEnvelope(JSON.parse(raw));}
  function rotateRunBackups(previous){
    if(!previous)return;
    for(let i=RUN_BACKUP_KEYS.length-1;i>=1;i--){const older=storage.getString(RUN_BACKUP_KEYS[i-1]);if(older)storage.setString(RUN_BACKUP_KEYS[i],older);else storage.remove(RUN_BACKUP_KEYS[i]);}
    storage.setString(RUN_BACKUP_KEYS[0],previous);
  }
  function writeRunEnvelope(env,{backup=true}={}){
    const previous=storage.getString(RUN_PRIMARY_KEY);
    if(backup&&previous)rotateRunBackups(previous);
    storage.setString(RUN_PRIMARY_KEY,JSON.stringify(asRunEnvelope(env)));
    return true;
  }
  function saveRunCheckpoint(checkpoint){return writeRunEnvelope(createRunEnvelope(checkpoint));}
  function loadRunCheckpoint(){
    let source="none",env=null,error=null;
    const candidates=[[RUN_PRIMARY_KEY,"primary"],...RUN_BACKUP_KEYS.map((key,i)=>[key,`backup-${i+1}`])];
    for(const [key,label] of candidates){
      try{const raw=storage.getString(key);if(!raw)continue;env=parseRunStored(raw);source=label;break;}catch(e){error=e;}
    }
    if(!env)return {checkpoint:null,source:"none",recovered:false,error:error?.message||null};
    const checkpoint=clone(env.payload.checkpoint),recovered=source.startsWith("backup-");
    if(recovered)writeRunEnvelope(createRunEnvelope(checkpoint),{backup:false});
    return {checkpoint,source,recovered,error:error?.message||null};
  }
  function clearRunCheckpoint(){storage.remove(RUN_PRIMARY_KEY);RUN_BACKUP_KEYS.forEach(key=>storage.remove(key));return true;}
  function hasRunCheckpoint(){return storage.has(RUN_PRIMARY_KEY)||RUN_BACKUP_KEYS.some(key=>storage.has(key));}

  function loadMeta({defaultFactory,normalize}={}){
    const makeDefault=()=>typeof defaultFactory==="function"?defaultFactory():{};
    const norm=value=>typeof normalize==="function"?normalize(value):value;
    let source="none",env=null,error=null;
    const candidates=[[PRIMARY_KEY,"primary"],...BACKUP_KEYS.map((key,i)=>[key,`backup-${i+1}`])];
    for(const [key,label] of candidates){
      try{const raw=storage.getString(key);if(!raw)continue;env=parseStored(raw);source=label;break;}catch(e){error=e;}
    }
    if(!env)return {meta:norm(makeDefault()),source:"new",recovered:false,error:error?.message||null};
    const meta=norm(clone(env.payload.meta)),recovered=source.startsWith("backup-");
    if(recovered)writeEnvelope(createEnvelope(meta),{backup:false});
    return {meta,source,recovered,error:error?.message||null};
  }

  function exportText(meta){return EXPORT_PREFIX+utf8ToB64(JSON.stringify(createEnvelope(meta)));}
  function decodeExport(text){
    const input=String(text??"").trim(); if(!input)throw new Error("Save text is empty");
    if(input.startsWith(EXPORT_PREFIX))return JSON.parse(b64ToUtf8(input.slice(EXPORT_PREFIX.length)));
    if(input.startsWith("{"))return JSON.parse(input);
    return JSON.parse(b64ToUtf8(input));
  }
  function importText(text,{defaultFactory,normalize}={}){
    const env=migrate(decodeExport(text));
    let meta=clone(env.payload.meta);
    if(typeof normalize==="function")meta=normalize(meta);
    if(!meta||typeof meta!=="object")meta=typeof defaultFactory==="function"?defaultFactory():{};
    saveMeta(meta); return meta;
  }
  function reset(){storage.remove(PRIMARY_KEY);BACKUP_KEYS.forEach(key=>storage.remove(key));clearRunCheckpoint();return true;}
  function hasSave(){return storage.has(PRIMARY_KEY)||BACKUP_KEYS.some(key=>storage.has(key));}
  function legacySaveKeysPresent(){return LEGACY_KEYS.filter(k=>storage.has(k));}
  function diagnostics(){
    let primaryValid=false;try{primaryValid=!!parseStored(storage.getString(PRIMARY_KEY));}catch(_){}
    const backups=BACKUP_KEYS.map((key,i)=>{let valid=false;try{valid=!!parseStored(storage.getString(key));}catch(_){}return Object.freeze({slot:i+1,key,present:storage.has(key),valid});});
    let runPrimaryValid=false;try{runPrimaryValid=!!parseRunStored(storage.getString(RUN_PRIMARY_KEY));}catch(_){}
    const runBackups=RUN_BACKUP_KEYS.map((key,i)=>{let valid=false;try{valid=!!parseRunStored(storage.getString(key));}catch(_){}return Object.freeze({slot:i+1,key,present:storage.has(key),valid});});
    return Object.freeze({apiVersion:2,format:FORMAT,schemaVersion:SCHEMA_VERSION,gameVersion:GAME_VERSION,primaryKey:PRIMARY_KEY,backupKey:BACKUP_KEY,backupKeys:[...BACKUP_KEYS],backupSlots:BACKUP_KEYS.length,hasPrimary:storage.has(PRIMARY_KEY),hasBackup:backups.some(x=>x.present),primaryValid,backupValid:backups.some(x=>x.valid),backups,activeRun:Object.freeze({format:RUN_FORMAT,schemaVersion:RUN_SCHEMA_VERSION,primaryKey:RUN_PRIMARY_KEY,backupKeys:[...RUN_BACKUP_KEYS],hasPrimary:storage.has(RUN_PRIMARY_KEY),hasBackup:runBackups.some(x=>x.present),primaryValid:runPrimaryValid,backupValid:runBackups.some(x=>x.valid),backups:runBackups}),legacyKeys:legacySaveKeysPresent(),storage:storage.diagnostics()});
  }

  window.DiceboundSave=Object.freeze({apiVersion:2,format:FORMAT,schemaVersion:SCHEMA_VERSION,gameVersion:GAME_VERSION,primaryKey:PRIMARY_KEY,backupKey:BACKUP_KEY,backupKeys:Object.freeze([...BACKUP_KEYS]),runFormat:RUN_FORMAT,runSchemaVersion:RUN_SCHEMA_VERSION,runPrimaryKey:RUN_PRIMARY_KEY,runBackupKeys:Object.freeze([...RUN_BACKUP_KEYS]),loadMeta,saveMeta,saveRunCheckpoint,loadRunCheckpoint,clearRunCheckpoint,hasRunCheckpoint,exportText,importText,reset,hasSave,diagnostics,migrate});
})();
