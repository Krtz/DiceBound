(() => {
  "use strict";
  function ownerIds(powerup={}){return [...new Set([powerup.classId,...(powerup.classIds||[])].filter(Boolean))];}
  function ownershipAllowed(powerup,borrowerId,unlockedClassIds=[]){
    const owners=ownerIds(powerup);
    if(!owners.length)return true;
    if(owners.includes(borrowerId))return true;
    const unlocked=new Set(unlockedClassIds||[]);
    return owners.some(id=>unlocked.has(id));
  }
  window.DiceboundPowerupBorrowing=Object.freeze({apiVersion:1,ownerIds,ownershipAllowed});
})();
