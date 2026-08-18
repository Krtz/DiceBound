(() => {
  "use strict";
  const wrapper=window.DiceboundWrapper||null;
  const native=wrapper?.host?.storage||null;
  const memory = new Map();
  let localOk = false;
  try {
    const probe = "__dicebound_storage_probe__";
    localStorage.setItem(probe,"1"); localStorage.removeItem(probe); localOk = true;
  } catch (_) {}

  const backend = native ? "wrapper-native" : localOk ? "localStorage" : "memory";
  function requireSync(value,name){if(value&&typeof value.then==="function")throw new Error(`DiceboundHost.storage.${name} must be synchronous in contract v1`);return value;}
  function getString(key) {
    key=String(key);
    if(native)return requireSync(native.getString(key),"getString") ?? null;
    if(localOk)return localStorage.getItem(key);
    return memory.has(key)?memory.get(key):null;
  }
  function setString(key,value) {
    key=String(key); value=String(value);
    if(native){requireSync(native.setString(key,value),"setString");return true;}
    if(localOk){localStorage.setItem(key,value);return true;}
    memory.set(key,value);return true;
  }
  function remove(key) {
    key=String(key);
    if(native){requireSync(native.remove(key),"remove");return true;}
    if(localOk){localStorage.removeItem(key);return true;}
    memory.delete(key);return true;
  }
  function has(key){return getString(key)!==null;}
  function keys(prefix="") {
    prefix=String(prefix); let all=[];
    if(native)all=Array.from(requireSync(native.keys(),"keys")||[]);
    else if(localOk){for(let i=0;i<localStorage.length;i++)all.push(localStorage.key(i));}
    else all=Array.from(memory.keys());
    return all.filter(k=>typeof k==="string"&&k.startsWith(prefix)).sort();
  }
  function clearPrefix(prefix){for(const key of keys(prefix))remove(key);}
  async function flush(){if(native?.flush)return await native.flush();return true;}
  function diagnostics(){return Object.freeze({apiVersion:2,contractVersion:wrapper?.contractVersion||1,backend,persistent:backend!=="memory",wrapped:!!wrapper?.isWrapped,nativeStorage:!!native,keys:keys("dicebound.")});}

  window.DiceboundStorage=Object.freeze({apiVersion:2,contractVersion:wrapper?.contractVersion||1,backend,isPersistent:backend!=="memory",getString,setString,remove,has,keys,clearPrefix,flush,diagnostics});
})();
