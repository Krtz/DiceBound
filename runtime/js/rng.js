(() => {
  "use strict";
  const nativeRandom = Math.random.bind(Math);
  let seeded=false, seedValue=null, state=0, calls=0;
  function hashSeed(value){
    const s=String(value ?? "dicebound"); let h=2166136261>>>0;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0 || 0x6d2b79f5;
  }
  function seed(value){seedValue=String(value ?? "dicebound");state=hashSeed(seedValue);calls=0;seeded=true;return snapshot();}
  function clear(){seeded=false;seedValue=null;state=0;calls=0;return snapshot();}
  function random(){
    if(!seeded)return nativeRandom();
    state=(state+0x6D2B79F5)>>>0;let t=state;
    t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);calls++;
    return ((t^(t>>>14))>>>0)/4294967296;
  }
  function int(min,max){min=Math.ceil(Number(min));max=Math.floor(Number(max));if(max<min)[min,max]=[max,min];return Math.floor(random()*(max-min+1))+min;}
  function pick(arr){if(!Array.isArray(arr)||!arr.length)return undefined;return arr[Math.floor(random()*arr.length)];}
  function snapshot(){return Object.freeze({apiVersion:1,mode:seeded?"seeded":"native",seed:seedValue,state:state>>>0,calls});}
  function restore(snap){if(!snap||snap.mode!=="seeded")return clear();seedValue=String(snap.seed??"dicebound");state=Number(snap.state)>>>0;calls=Math.max(0,Number(snap.calls)||0);seeded=true;return snapshot();}
  async function withSeed(value,fn){const before=snapshot();seed(value);try{return await fn();}finally{restore(before);}}
  window.DiceboundRng=Object.freeze({apiVersion:1,random,int,pick,seed,clear,snapshot,restore,withSeed});
})();
