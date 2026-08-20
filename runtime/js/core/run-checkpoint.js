(() => {
  "use strict";
  const save=window.DiceboundSave,rng=window.DiceboundRng,identity=window.DiceboundVersion;
  if(!save)throw new Error("DiceboundRunCheckpoint requires DiceboundSave before loading.");
  if(!rng)throw new Error("DiceboundRunCheckpoint requires DiceboundRng before loading.");
  if(!identity)throw new Error("DiceboundRunCheckpoint requires DiceboundVersion before loading.");
  const CHECKPOINT_VERSION=1;

  function cloneJson(value,path="checkpoint",seen=new Set()){
    if(value===null||typeof value==="string"||typeof value==="boolean")return value;
    if(typeof value==="number"){
      if(!Number.isFinite(value))throw new TypeError(`${path} contains a non-finite number`);
      return value;
    }
    if(typeof value!=="object")throw new TypeError(`${path} contains unsupported ${typeof value} data`);
    if(seen.has(value))throw new TypeError(`${path} contains a cycle`);
    seen.add(value);
    let result;
    if(Array.isArray(value))result=value.map((item,index)=>cloneJson(item,`${path}[${index}]`,seen));
    else {
      const proto=Object.getPrototypeOf(value);
      if(proto!==Object.prototype&&proto!==null)throw new TypeError(`${path} contains a non-plain object`);
      result={};
      for(const [key,item] of Object.entries(value))result[key]=cloneJson(item,`${path}.${key}`,seen);
    }
    seen.delete(value);return result;
  }
  function validate(value){
    const checkpoint=cloneJson(value);
    if(Number(checkpoint.checkpointVersion)!==CHECKPOINT_VERSION)throw new Error(`Checkpoint version ${checkpoint.checkpointVersion} is unsupported`);
    if(typeof checkpoint.gameVersion!=="string"||!checkpoint.gameVersion)throw new Error("Checkpoint game version is missing");
    if(!checkpoint.run||typeof checkpoint.run!=="object")throw new Error("Checkpoint run state is missing");
    if(!checkpoint.meta||typeof checkpoint.meta!=="object")throw new Error("Checkpoint career state is missing");
    if(!checkpoint.rng||checkpoint.rng.mode!=="seeded")throw new Error("Checkpoint deterministic RNG state is missing");
    if(!Array.isArray(checkpoint.run.tiles)||!checkpoint.run.tiles.length)throw new Error("Checkpoint board tiles are missing");
    if(!checkpoint.run.player||typeof checkpoint.run.player!=="object")throw new Error("Checkpoint player state is missing");
    return checkpoint;
  }
  function create({run,meta,summary={}}={}){
    return validate({checkpointVersion:CHECKPOINT_VERSION,gameVersion:identity.version,channel:identity.channel,createdAt:new Date().toISOString(),summary,run,meta,rng:rng.snapshot()});
  }
  function store(input){const checkpoint=validate(input);save.saveRunCheckpoint(checkpoint);return cloneJson(checkpoint);}
  function capture(input){return store(create(input));}
  function load(){
    const result=save.loadRunCheckpoint();
    if(!result.checkpoint)return {...result,checkpoint:null};
    try{return {...result,checkpoint:validate(result.checkpoint)};}
    catch(error){return {...result,checkpoint:null,error:error.message};}
  }
  function clear(){return save.clearRunCheckpoint();}
  function diagnostics(){const loaded=load();return Object.freeze({apiVersion:1,checkpointVersion:CHECKPOINT_VERSION,gameVersion:identity.version,present:save.hasRunCheckpoint(),valid:!!loaded.checkpoint,source:loaded.source,recovered:loaded.recovered,error:loaded.error||null,summary:loaded.checkpoint?.summary||null});}

  window.DiceboundRunCheckpoint=Object.freeze({apiVersion:1,checkpointVersion:CHECKPOINT_VERSION,create,validate,store,capture,load,clear,has:()=>save.hasRunCheckpoint(),diagnostics});
})();
