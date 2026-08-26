(() => {
  "use strict";

  // A final/miniboss encounter has one identity.  Board selection, combat data
  // and semantic art all flow through this resolver so render-time adapters
  // cannot silently select a different guardian from the combat payload.
  const boards=window.DiceboundBoards?.createRegistry?.();
  const enemies=window.DiceboundEnemies?.createSpecialRegistry?.();
  const assets=window.DiceboundAssets;
  if(!boards||!enemies||!assets?.resolveGuardianArt)throw new Error("DiceboundGuardians requires board, enemy and asset registries");

  const clone=value=>JSON.parse(JSON.stringify(value));
  const freeze=value=>Object.freeze(value);
  const byBoard={final:Object.create(null),miniboss:Object.create(null)},byId=Object.create(null);

  function build(board,kind,key){
    const id=String(board[key]||"");
    const combat=enemies[id],art=assets.resolveGuardianArt(id);
    if(!combat)throw new Error(`Guardian ${id||"(missing)"} for Board ${board.id} has no combat definition`);
    if(!art?.battle||!art?.boardMarker)throw new Error(`Guardian ${id} is missing canonical battle or board-marker art`);
    const resolved=freeze({
      board:Number(board.id),
      kind,
      id,
      name:combat.name,
      combat:freeze(clone(combat)),
      art:freeze({battle:art.battle,boardMarker:art.boardMarker,alt:combat.name})
    });
    byId[id]=resolved;
    return resolved;
  }

  for(const board of Object.values(boards)){
    const key=String(board.id);
    byBoard.final[key]=build(board,"final","bossId");
    byBoard.miniboss[key]=build(board,"miniboss","minibossId");
  }
  Object.values(byBoard).forEach(entries=>Object.freeze(entries));
  freeze(byId);freeze(byBoard);

  const resolve=(kind,board)=>{
    const numeric=Math.floor(Number(board));
    const resolved=byBoard[kind]?.[String(numeric)];
    return resolved?clone(resolved):null;
  };
  const resolveById=id=>byId[String(id)]?clone(byId[String(id)]):null;

  window.DiceboundGuardians=freeze({
    apiVersion:1,
    resolveFinal:board=>resolve("final",board),
    resolveMiniboss:board=>resolve("miniboss",board),
    resolveById
  });
})();
