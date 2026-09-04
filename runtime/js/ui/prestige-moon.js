/* DiceBound Prestige Moon presentation owner.
 * Currency, purchases, refunds and run-reset behavior are supplied through
 * configure(); this module owns only the destination surface and interaction
 * chrome. */
((root) => {
  'use strict';

  const OWNER = 'ui/prestige-moon';
  const STYLE_ID = 'dicebound-prestige-moon-owner';
  let runtime = {};
  let busy = false;

  const doc = () => root.document || null;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const find = id => runtime.find?.(id) || doc()?.getElementById(id) || null;

  function installStyles() {
    const documentRef = doc();
    if (!documentRef || documentRef.getElementById(STYLE_ID)) return;
    const style = documentRef.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #prestigeMoonOverlay.prestige-moon-overlay{position:fixed;inset:0;z-index:165;display:grid;overflow:hidden;background:radial-gradient(ellipse at 50% 60%,rgba(101,134,177,.28),rgba(7,10,25,.98) 58%,#03050d);color:#f7f2e6}
      #prestigeMoonOverlay.prestige-moon-overlay.hidden{display:none}
      #prestigeMoonOverlay .prestige-moon-stars{position:absolute;inset:0;pointer-events:none;opacity:.72;background-image:radial-gradient(circle at 12% 17%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 74% 12%,#dce8ff 0 1px,transparent 1.5px),radial-gradient(circle at 87% 54%,#fff7d5 0 1px,transparent 1.5px),radial-gradient(circle at 18% 79%,#d7e5ff 0 1px,transparent 1.5px),radial-gradient(circle at 55% 33%,#fff 0 1px,transparent 1.5px);background-size:213px 193px,173px 229px,257px 211px,307px 281px,167px 193px}
      #prestigeMoonOverlay .prestige-moon-scene{position:relative;isolation:isolate;display:grid;place-items:center;width:100%;height:100%;min-height:0;padding:clamp(12px,2.5vw,34px)}
      #prestigeMoonOverlay .prestige-moon-back{position:absolute;z-index:8;top:clamp(12px,2vw,28px);right:clamp(12px,2vw,28px);min-width:96px}
      #prestigeMoonOverlay .prestige-moon-intro{position:absolute;z-index:5;top:clamp(14px,2.4vh,30px);left:clamp(14px,2.6vw,40px);width:min(390px,calc(100% - 170px));transform:none;text-align:left;pointer-events:none}
      #prestigeMoonOverlay .prestige-moon-kicker{margin:0;color:#d9e7ff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;text-shadow:0 2px 12px #000}
      #prestigeMoonOverlay .prestige-moon-title{margin:4px 0;color:#fff8e5;font-size:clamp(24px,4vw,52px);letter-spacing:.08em;text-transform:uppercase;text-shadow:0 4px 24px rgba(126,166,255,.45)}
      #prestigeMoonOverlay .prestige-moon-subtitle{margin:0;color:#c8d1e5;font-size:clamp(10px,1.2vw,13px);line-height:1.45;text-shadow:0 2px 8px #000}
      #prestigeMoonOverlay .prestige-moon-body{position:relative;z-index:2;display:grid;place-items:center;width:min(1120px,100%);height:min(820px,86vh);min-height:510px}
      #prestigeMoonOverlay .prestige-moon-orb{position:relative;display:grid;place-items:center;width:min(74vw,820px);height:min(74vw,820px);max-width:min(820px,94vh);max-height:min(820px,94vh);min-width:500px;min-height:500px;border-radius:50%;overflow:visible;background:radial-gradient(circle at 33% 27%,#f6f1d9 0 2%,#d3d2c4 8%,#8d96a4 31%,#596477 58%,#30394b 77%,#111728 100%);box-shadow:0 0 0 2px rgba(235,245,255,.22),0 0 55px rgba(132,172,255,.35),0 0 170px rgba(73,107,207,.34),inset -42px -50px 90px rgba(4,8,20,.64),inset 38px 28px 60px rgba(255,255,240,.25)}
      #prestigeMoonOverlay .prestige-moon-orb::before,#prestigeMoonOverlay .prestige-moon-orb::after{position:absolute;content:"";border-radius:50%;pointer-events:none}.prestige-moon-orb::before{inset:11%;opacity:.5;background:radial-gradient(ellipse at 30% 23%,rgba(45,54,70,.56) 0 6%,transparent 6.5%),radial-gradient(ellipse at 72% 38%,rgba(45,54,70,.47) 0 9%,transparent 9.5%),radial-gradient(ellipse at 48% 74%,rgba(35,45,61,.46) 0 7%,transparent 7.5%),radial-gradient(ellipse at 18% 62%,rgba(246,249,241,.2) 0 3%,transparent 3.5%)}.prestige-moon-orb::after{inset:0;background:linear-gradient(118deg,rgba(255,255,255,.25),transparent 34%,rgba(5,10,23,.46) 72%);mix-blend-mode:screen}
      #prestigeMoonOverlay .prestige-moon-core{position:relative;z-index:3;display:grid;justify-items:center;gap:10px;width:min(320px,55%);padding:18px;border:1px solid rgba(255,248,220,.4);border-radius:20px;background:linear-gradient(180deg,rgba(24,31,52,.82),rgba(12,16,29,.92));box-shadow:0 14px 38px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.1);text-align:center}
      #prestigeMoonOverlay .prestige-moon-core b{color:#ffe49a;font-size:11px;letter-spacing:.12em;text-transform:uppercase}.prestige-moon-core p{margin:0;color:#d6dcee;font-size:10px;line-height:1.4}.prestige-moon-core .main-btn{width:100%;font-size:13px}
      #prestigeMoonOverlay .prestige-held-counter{position:absolute;z-index:6;top:23%;left:50%;min-width:190px;transform:translateX(-50%);padding:10px 14px;border:1px solid rgba(255,238,167,.52);border-radius:16px;background:rgba(7,10,20,.82);box-shadow:0 10px 28px rgba(0,0,0,.42);color:#fff7dd;text-align:center;cursor:help}.prestige-held-counter span{display:block;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#d4ddf2}.prestige-held-counter strong{display:block;margin:2px 0;color:#ffe087;font-size:27px;line-height:1}.prestige-held-tooltip{position:absolute;z-index:12;right:50%;bottom:calc(100% + 9px);display:none;width:min(310px,75vw);padding:10px 12px;border:1px solid rgba(255,236,163,.42);border-radius:12px;background:#0a1020;color:#e9edf8;font-size:10px;line-height:1.45;box-shadow:0 13px 34px rgba(0,0,0,.56);transform:translateX(50%)}.prestige-held-counter:hover .prestige-held-tooltip,.prestige-held-counter:focus-within .prestige-held-tooltip{display:block}
      #prestigeMoonOverlay .prestige-moon-node{position:absolute;z-index:7;display:grid;gap:4px;width:min(230px,29vw);padding:12px;border:1px solid rgba(210,223,255,.38);border-radius:16px;background:linear-gradient(180deg,rgba(25,35,61,.95),rgba(11,16,31,.96));box-shadow:0 12px 30px rgba(0,0,0,.4);color:#f3f5ff;text-align:left;transition:transform .16s ease,border-color .16s ease,filter .16s ease}.prestige-moon-node:not(:disabled):hover{transform:translateY(-3px) scale(1.025);border-color:#ffe29a;filter:brightness(1.08)}.prestige-moon-node:disabled{opacity:.62;cursor:not-allowed}.prestige-moon-node b{color:#fff0bb;font-size:12px}.prestige-moon-node span{color:#c7d0e6;font-size:10px;line-height:1.35}.prestige-moon-node em{color:#f2cf7d;font-size:9px;font-style:normal}.prestige-moon-node.top{top:7%;left:50%;transform:translateX(-50%)}.prestige-moon-node.top:hover{transform:translateX(-50%) translateY(-3px) scale(1.025)}.prestige-moon-node.left{left:3%;top:51%}.prestige-moon-node.right-upper{right:2%;top:31%}.prestige-moon-node.right-middle{right:-1%;top:51%}.prestige-moon-node.right-lower{right:2%;top:71%}.prestige-moon-node.forge-built{border-color:#e9bd69;background:linear-gradient(180deg,rgba(80,53,25,.96),rgba(23,18,28,.98))}.prestige-moon-node.forge-built b::before{content:'⚒ ';}
      #prestigeMoonOverlay .prestige-moon-refund{position:absolute;z-index:8;right:clamp(12px,3vw,42px);bottom:clamp(12px,3vw,36px);min-width:132px}.prestige-moon-refund[disabled]{opacity:.5}
      #prestigeMoonOverlay .prestige-moon-status{position:absolute;z-index:8;bottom:clamp(12px,3vw,34px);left:clamp(12px,3vw,42px);max-width:350px;color:#c4cee3;font-size:10px;line-height:1.4;text-shadow:0 2px 7px #000}
      @media(max-width:760px){#prestigeMoonOverlay .prestige-moon-intro{top:12px;left:12px;width:min(330px,calc(100% - 130px));transform:none;text-align:left}#prestigeMoonOverlay .prestige-moon-subtitle{display:none}#prestigeMoonOverlay .prestige-moon-body{height:calc(100vh - 70px);min-height:450px}#prestigeMoonOverlay .prestige-moon-orb{width:92vw;height:92vw;min-width:360px;min-height:360px;max-width:620px;max-height:620px}.prestige-moon-node{width:min(192px,39vw);padding:9px}.prestige-moon-node.left{left:-1%;top:59%}.prestige-moon-node.right-upper{right:-2%;top:31%}.prestige-moon-node.right-middle{right:-5%;top:53%}.prestige-moon-node.right-lower{right:-2%;top:75%}.prestige-moon-node.top{top:4%}.prestige-moon-core{width:min(260px,65%);padding:12px}.prestige-moon-refund{bottom:10px;right:10px}.prestige-moon-status{left:10px;bottom:10px;max-width:48%}}
      @media(max-height:610px){#prestigeMoonOverlay .prestige-moon-intro{top:10px}#prestigeMoonOverlay .prestige-moon-title{font-size:20px}.prestige-moon-body{height:calc(100vh - 40px);min-height:390px}.prestige-moon-orb{width:min(70vh,620px);height:min(70vh,620px);min-width:390px;min-height:390px}.prestige-moon-node{padding:8px}.prestige-held-counter{top:22%;padding:7px 10px}.prestige-moon-core{padding:10px}.prestige-moon-core p{display:none}}
    `;
    documentRef.head?.appendChild(style);
  }

  function ensureSurface() {
    const documentRef = doc();
    if (!documentRef) return null;
    let overlay = find('prestigeMoonOverlay');
    const created=!overlay;
    if (!overlay) { overlay = documentRef.createElement('div'); overlay.id = 'prestigeMoonOverlay'; documentRef.body?.appendChild(overlay); }
    installStyles();
    overlay.classList.add('overlay', 'prestige-moon-overlay');
    if(created)overlay.classList.add('hidden');
    overlay.dataset.prestigeMoonOwner = OWNER;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Prestige Moon');
    return overlay;
  }

  function nodeMarkup(node) {
    const purchased = !!node.purchased;
    const costLabel = node.cost === null ? 'Cost TBD' : `${node.cost} PP`;
    const disabled = node.cost === null || (!node.repeatable && purchased) || !node.affordable;
    const label = purchased && node.id === 'moon-forge' ? 'Moon Forge built' : node.label;
    const detail = purchased && node.id === 'moon-forge' ? 'The lunar smithy is ready for future Prestige crafting.' : node.detail;
    return `<button type="button" class="prestige-moon-node ${escapeHtml(node.placement || '')}${purchased && node.id === 'moon-forge' ? ' forge-built' : ''}" data-prestige-node="${escapeHtml(node.id)}" ${disabled ? 'disabled' : ''}><b>${escapeHtml(label)}</b><span>${escapeHtml(detail)}</span><em>${escapeHtml(purchased ? 'Purchased' : node.unavailableReason || costLabel)}</em></button>`;
  }

  function render() {
    const overlay = ensureSurface();
    if (!overlay) return null;
    const state = runtime.getState?.() || {};
    const prestige = state.prestige || {unspent: 0, spent: 0, refundableSpent: 0, heldSummary: 'Unavailable', permanentSummary: 'Unavailable', nodes: []};
    overlay.innerHTML = `<div class="prestige-moon-stars" aria-hidden="true"></div><section class="prestige-moon-scene"><button type="button" class="small-btn prestige-moon-back" data-prestige-back>Back to Camp</button><header class="prestige-moon-intro"><p class="prestige-moon-kicker">Account progression destination</p><h2 class="prestige-moon-title">Prestige Moon</h2><p class="prestige-moon-subtitle">Approach the lunar surface to convert Legacy progress into lasting account choices.</p></header><div class="prestige-moon-body"><div class="prestige-moon-orb"><button type="button" class="prestige-held-counter" data-prestige-held><span>Unspent Prestige Points</span><strong>${escapeHtml(prestige.unspent)}</strong><div class="prestige-held-tooltip"><b>Held Prestige bonus</b><br>Every unspent Prestige Point grants one deterministic stat point while it remains unspent.<br><br><b>Current held bonus:</b><br>${escapeHtml(prestige.heldSummary)}</div></button>${(prestige.nodes || []).map(nodeMarkup).join('')}<div class="prestige-moon-core"><b>Legacy conversion</b><p>${escapeHtml(state.prestigeDescription || 'Every 9 total Talent Points becomes one unspent Prestige Point.')}</p><button type="button" class="main-btn" data-prestige-action ${state.canPrestige ? '' : 'disabled'}>Prestige for ${state.prestigeOffer || 1} Point${state.prestigeOffer === 1 ? '' : 's'}</button><p>${escapeHtml(prestige.permanentSummary)}</p></div></div></div><button type="button" class="small-btn danger prestige-moon-refund" data-prestige-refund ${(prestige.refundableSpent ?? prestige.spent) > 0 ? '' : 'disabled'}>Refund Stats</button><div class="prestige-moon-status">${escapeHtml(state.status || 'Moon Forge is intentionally cost-TBD until balance review.')} </div></section>`;
    overlay.querySelector('[data-prestige-back]')?.addEventListener('click', close);
    overlay.querySelector('[data-prestige-action]')?.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      try { await runtime.prestige?.(); } finally { busy = false; render(); }
    });
    overlay.querySelector('[data-prestige-refund]')?.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      try { await runtime.refundAll?.(); } finally { busy = false; render(); }
    });
    overlay.querySelectorAll('[data-prestige-node]').forEach(button => button.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      try { await runtime.purchase?.(button.dataset.prestigeNode); } finally { busy = false; render(); }
    }));
    return overlay;
  }

  function open() {
    const overlay = render();
    overlay?.classList.remove('hidden');
    overlay?.setAttribute('aria-hidden', 'false');
    return overlay || null;
  }
  function close() {
    const overlay = find('prestigeMoonOverlay');
    overlay?.classList.add('hidden');
    overlay?.setAttribute('aria-hidden', 'true');
    runtime.afterClose?.();
    return overlay || null;
  }
  function configure(next = {}) { runtime = {...runtime, ...next}; return api; }
  function inspect() { const overlay = find('prestigeMoonOverlay'); return Object.freeze({owner: overlay?.dataset.prestigeMoonOwner || null, open: !!overlay && !overlay.classList.contains('hidden'), hasBack: !!overlay?.querySelector?.('[data-prestige-back]'), hasHeldCounter: !!overlay?.querySelector?.('[data-prestige-held]'), nodeCount: overlay?.querySelectorAll?.('[data-prestige-node]').length || 0, hasRefund: !!overlay?.querySelector?.('[data-prestige-refund]')}); }

  const api = Object.freeze({owner: OWNER, configure, open, close, render, inspect});
  window.DiceboundPrestigeMoon = api;
})(window);
