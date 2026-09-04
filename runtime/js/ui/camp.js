/* DiceBound Camp presentation owner.
 *
 * This module deliberately owns DOM composition, responsive layout regime
 * selection, authored Camp-object rendering, painted-object hit targets, and
 * the full stage layout used by the Campsite.
 * Gameplay/progression data and actions remain supplied by the compatibility
 * runtime through configure(), so this is not a second class/pet/save owner.
 */
(function(root){
  'use strict';

  const CAMP_OBJECT_IDS=Object.freeze([
    'campTalentBtn','campInfoBtn','campMoonBtn','campOptionsBtn','campNightmareBtn',
    'campHellBtn','campClassBtn','campPetBtn','campChestBtn','campAchievementBtn','campGoBtn'
  ]);
  const CAMP_PROGRESSIVE_OBJECTS=Object.freeze([
    Object.freeze({id:'campAchievementBtn',reveal:'achievementTrophy'}),
    Object.freeze({id:'campTalentBtn',reveal:'talentStar'}),
    Object.freeze({id:'campMoonBtn',reveal:'prestigeMoon'})
  ]);

  // These are the approved Beta 0.6.4.13 desktop composition coordinates.
  // The original composition used the stage-layout anchors below; its old
  // translate values were late *adjustments* to those anchors, not standalone
  // positions.  Keep the actual top-stage coordinates here so this owner does
  // not send controls above the viewport when it refreshes a Camp scene.
  const CAMP_LAYOUTS=Object.freeze([
    Object.freeze({
      id:'wide-desktop',query:'(min-width:1360px) and (min-height:650px)',
      rules:Object.freeze([
        ['#campOptionsBtn','left:8.5%;top:10.5%;translate:none'],
        ['#campTalentBtn','left:30.5%;top:12.5%;translate:none'],
        ['#campMoonBtn','left:48%;top:11.5%;translate:none'],
        ['#campClassBtn','left:39%;top:55%;translate:none']
      ])
    }),
    Object.freeze({
      id:'compact-desktop',query:'(min-width:1000px) and (max-width:1359px) and (min-height:650px)',
      rules:Object.freeze([
        ['#campOptionsBtn','left:8.5%;top:10.5%;translate:none'],
        ['#campTalentBtn','left:30.5%;top:12.5%;translate:none'],
        ['#campMoonBtn','left:48%;top:11.5%;translate:none'],
        ['#campClassBtn','left:39%;top:55%;translate:none']
      ])
    }),
    Object.freeze({
      id:'stacked-or-short',query:'(min-width:1000px) and (max-height:649px)',
      rules:Object.freeze([
        // Preserve the same anchored composition in a short desktop viewport,
        // while allowing the tall moon/class artwork to remain wholly onscreen.
        ['#campOptionsBtn','left:8.5%;top:16%;translate:none'],
        ['#campTalentBtn','left:30.5%;top:18%;translate:none'],
        ['#campMoonBtn','left:48%;top:20%;translate:none'],
        ['#campClassBtn','left:39%;top:68%;translate:none']
      ])
    })
  ]);

  // The authored 16:9 campsite is the single source of final object anchors.
  // The first four values are also mirrored in CAMP_LAYOUTS above because the
  // Beta 0.6.4.13 / #194 baseline names those protected placements directly.
  // Wider/compact refinements are explicit data, not late CSS translations.
  const CAMP_STAGE_ASPECT=16/9;
  const CAMP_STAGE_ANCHORS=Object.freeze({
    campOptionsBtn:Object.freeze({x:.085,y:.105,w:110}),
    campTalentBtn:Object.freeze({x:.305,y:.125,w:165}),
    campMoonBtn:Object.freeze({x:.48,y:.115,w:165}),
    campNightmareBtn:Object.freeze({x:.89,y:.28,w:120}),
    campHellBtn:Object.freeze({x:.80,y:.28,w:118}),
    campClassBtn:Object.freeze({x:.39,y:.55,w:235}),
    campInfoBtn:Object.freeze({x:.26,y:.78,w:145}),
    campBonfire:Object.freeze({x:.50,y:.72,w:170}),
    campGoBtn:Object.freeze({x:.85,y:.74,w:440,h:250}),
    campChestBtn:Object.freeze({x:.64,y:.76,w:245,h:150}),
    campAchievementBtn:Object.freeze({x:.10,y:.83,w:165}),
    campPetBtn:Object.freeze({x:.39,y:.80,w:220})
  });
  const CAMP_STAGE_REFINEMENTS=Object.freeze({
    'wide-desktop':Object.freeze({
      campInfoBtn:Object.freeze({x:.26,y:.78}),campBonfire:Object.freeze({x:.50,y:.72}),
      campChestBtn:Object.freeze({x:.64,y:.76}),campAchievementBtn:Object.freeze({x:.10,y:.83}),
      campPetBtn:Object.freeze({x:.39,y:.80})
    }),
    'compact-desktop':Object.freeze({
      campInfoBtn:Object.freeze({x:.26,y:.78}),campBonfire:Object.freeze({x:.50,y:.72}),
      campChestBtn:Object.freeze({x:.64,y:.76}),campAchievementBtn:Object.freeze({x:.10,y:.83}),
      campPetBtn:Object.freeze({x:.39,y:.80})
    }),
    'stacked-or-short':Object.freeze({})
  });
  // Static Camp styling lives beside the stage layout.  The mobile/grid
  // fallback is still a Camp presentation regime; it must not survive as a
  // historical style injection in the compatibility monolith or shared CSS.
  const CAMP_BASE_STYLE=`
    .legacy-camp-modal{max-width:1100px;background:linear-gradient(180deg,rgba(11,16,30,.96),rgba(16,24,43,.97));overflow:hidden}
    .legacy-camp-modal .legacy-strip,.legacy-camp-modal .rules{display:none !important}
    .camp-help{margin:0 0 10px;color:var(--muted);font-size:12px;line-height:1.5}
    .camp-scene{position:relative;border:1px solid rgba(255,255,255,.10);border-radius:20px;padding:18px 18px 16px;background:radial-gradient(circle at 50% 78%,rgba(255,158,76,.28),rgba(255,158,76,.06) 20%,transparent 32%),radial-gradient(circle at 18% 10%,rgba(255,255,255,.10),transparent 18%),radial-gradient(circle at 82% 12%,rgba(181,140,255,.16),transparent 18%),linear-gradient(180deg,#0c1630 0%,#122347 45%,#0d1527 46%,#1a2c1d 80%,#23351f 100%);box-shadow:inset 0 0 40px rgba(255,255,255,.04),0 18px 40px rgba(0,0,0,.28)}
    .camp-scene::before{content:"";position:absolute;left:0;right:0;bottom:24px;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)}
    .camp-topline{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;color:#e8eefb;font-size:12px}
    .camp-topline span{padding:6px 10px;border-radius:999px;background:rgba(7,11,22,.35);border:1px solid rgba(255,255,255,.08)}
    .camp-sky{display:flex;justify-content:space-between;align-items:flex-start;min-height:110px;margin-bottom:18px}
    .camp-stars{display:flex;gap:12px;align-items:flex-start}
    .camp-ground{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-areas:". trophy ." "class fire go" "pet chest .";gap:14px;align-items:center}
    .camp-spot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:102px;padding:10px;border-radius:18px;background:rgba(9,12,21,.28);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(2px);text-align:center;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03))}
    .camp-bonfire{grid-area:fire;display:flex;align-items:center;justify-content:center;min-height:150px;padding:0;background:transparent;border:0;box-shadow:none;backdrop-filter:none;pointer-events:none;text-align:center}
    #campAchievementBtn{grid-area:trophy}#campClassBtn{grid-area:class}#campPetBtn{grid-area:pet}#campChestBtn{grid-area:chest}#campGoBtn{grid-area:go}
    .camp-spot:hover{transform:translateY(-2px);border-color:rgba(245,200,91,.42);box-shadow:0 10px 18px rgba(0,0,0,.24),0 0 0 1px rgba(245,200,91,.08) inset}
    .camp-spot .camp-icon,.camp-bonfire .camp-icon{font-size:36px;line-height:1;filter:drop-shadow(0 0 12px rgba(255,255,255,.12))}
    .camp-spot .camp-label,.camp-bonfire .camp-label{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .camp-spot .camp-sub{font-size:10px;color:var(--muted);line-height:1.3}
    .camp-spot.class-picker{min-height:132px}.camp-spot.go-spot{min-height:132px;border-color:rgba(98,215,154,.22)}.camp-spot.nightmare-spot{border-color:rgba(181,140,255,.22)}.camp-spot.hell-spot{border-color:rgba(239,90,99,.22)}
    .camp-popup-layer{margin-top:14px;display:grid;gap:12px}.camp-panel{display:none;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(7,11,22,.88),rgba(19,28,49,.94));padding:14px;box-shadow:inset 0 0 18px rgba(255,255,255,.03)}.camp-panel.active{display:block}.camp-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.camp-panel-head h3{margin:0;font-size:18px}.camp-close-btn{min-width:120px}
    .set-tier-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:10px}.set-tier{padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:rgba(245,241,232,.62)}.set-tier.active{color:var(--ink);border-color:rgba(245,200,91,.42);background:linear-gradient(180deg,rgba(245,200,91,.12),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1px rgba(245,200,91,.08)}.set-tier b{display:block;margin-bottom:4px;font-size:12px}.camp-heirloom-card{padding:12px;border-radius:14px;background:rgba(181,140,255,.08);border:1px solid rgba(181,140,255,.16);font-size:11px;line-height:1.5;margin-bottom:10px}.camp-note-line{font-size:11px;color:var(--muted);margin-top:8px;line-height:1.45}.camp-hidden{display:none !important}
    .camp-art-frame{display:flex;align-items:center;justify-content:center;overflow:visible}.camp-bonfire .camp-icon{width:96px;height:96px;font-size:0;line-height:0}.camp-bonfire-art{display:block;max-width:92px;max-height:92px;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 0 14px rgba(255,162,77,.28)) drop-shadow(0 0 26px rgba(255,120,40,.18))}
    #startOverlay.camp-fullscreen .camp-ground{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-areas:". trophy ." "class fire go" "pet chest ."!important;align-items:center!important;gap:18px!important}#startOverlay.camp-fullscreen .camp-bonfire{grid-area:fire!important;min-height:160px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;pointer-events:none!important}#startOverlay.camp-fullscreen .camp-bonfire .camp-icon{width:150px!important;height:150px!important;background:transparent!important;border:0!important;border-radius:0!important;overflow:visible!important}#startOverlay.camp-fullscreen .camp-bonfire-art{max-width:148px!important;max-height:148px!important}
    #startOverlay.camp-fullscreen #campGoBtn.camp-journey-control{min-height:132px!important;padding:4px!important;border:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;overflow:visible}#startOverlay.camp-fullscreen #campGoBtn.camp-journey-control:hover{transform:translateY(-3px) scale(1.025)!important;border:0!important;box-shadow:none!important;background:transparent!important}.camp-journey-art-frame{width:min(100%,340px);height:160px;display:flex;align-items:center;justify-content:center;overflow:visible;pointer-events:none}.camp-journey-art{display:block;max-width:100%;max-height:160px;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 9px 9px rgba(0,0,0,.42));transition:filter .15s ease}#campGoBtn:hover .camp-journey-art{filter:drop-shadow(0 10px 10px rgba(0,0,0,.5)) drop-shadow(0 0 10px rgba(98,215,154,.18))}.camp-journey-label{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#dff7e9;text-shadow:0 2px 6px rgba(0,0,0,.65);pointer-events:none}
    @media(max-width:860px){.camp-ground{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"trophy trophy" "class fire" "pet chest" "go go"}.camp-spot.class-picker,.camp-spot.go-spot{min-height:116px}.camp-sky{min-height:88px}#startOverlay.camp-fullscreen .camp-ground{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-areas:"trophy trophy" "class fire" "pet chest" "go go"!important}.camp-journey-art-frame{height:90px}.camp-journey-art{max-height:90px}}
    #startOverlay.camp-fullscreen{position:fixed;inset:0;z-index:50;padding:0;display:block;overflow-y:auto;overflow-x:hidden;background:linear-gradient(180deg,#08101f,#0d182a 42%,#101b20 70%,#16251a);backdrop-filter:none;scrollbar-color:#53647f transparent}#startOverlay.camp-fullscreen.hidden{display:none}#startOverlay.camp-fullscreen .start-modal,#startOverlay.camp-fullscreen .legacy-camp-modal{width:100%;max-width:none;min-height:100vh;max-height:none;overflow:visible;margin:0;padding:22px clamp(14px,3vw,42px) 48px;border:0;border-radius:0;box-shadow:none;background:transparent}#startOverlay.camp-fullscreen .camp-help{max-width:1160px;margin:0 auto 12px;text-align:center;background:transparent!important;border:0!important;box-shadow:none!important}#startOverlay.camp-fullscreen .camp-popup-layer{display:block;margin-top:18px}#startOverlay.camp-fullscreen .camp-panel{max-height:none;overflow:visible}#startOverlay.camp-fullscreen .camp-panel.active{display:block}#startOverlay.camp-fullscreen #campClassPanel,#startOverlay.camp-fullscreen #campChestPanel{scroll-margin-top:18px}#startOverlay.camp-fullscreen .camp-ground{margin-top:8px}#startOverlay.camp-fullscreen .camp-spot.class-picker .camp-icon{width:78px;height:78px;font-size:50px;border-radius:18px;overflow:hidden}#startOverlay.camp-fullscreen .camp-spot.class-picker .camp-icon svg{width:100%;height:100%;display:block}#startOverlay.camp-fullscreen .camp-spot.active{border-color:rgba(245,200,91,.78);box-shadow:0 0 0 2px rgba(245,200,91,.12) inset,0 0 24px rgba(245,200,91,.16)}#startOverlay.camp-fullscreen .nightmare-spot.active{border-color:#b58cff;box-shadow:0 0 24px rgba(181,140,255,.30),inset 0 0 26px rgba(181,140,255,.12)}#startOverlay.camp-fullscreen .hell-spot.active{border-color:#ef5a63;box-shadow:0 0 25px rgba(239,90,99,.34),inset 0 0 28px rgba(239,90,99,.13)}#startOverlay.camp-fullscreen #nightmareBox,#startOverlay.camp-fullscreen #hellBox,#startOverlay.camp-fullscreen #startHeirloom{display:none!important}.camp-mode-state{display:inline-flex;align-items:center;justify-content:center;min-width:54px;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:900;margin-top:2px;background:rgba(255,255,255,.08)}.camp-heirloom-card{overflow-wrap:anywhere}.camp-topline{justify-content:center}#campPetLine{display:none!important}.set-tier:not(.active){display:none!important}
    #startOverlay.camp-fullscreen .camp-scene{width:min(96vw,1380px)!important;max-width:1380px!important;min-height:calc(100dvh - 150px)!important;margin:0 auto!important;padding:10px clamp(8px,2vw,22px) 32px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important}#startOverlay.camp-fullscreen .camp-scene::before{display:none!important}#startOverlay.camp-fullscreen .camp-label,#startOverlay.camp-fullscreen .camp-bonfire .camp-label{color:#fff!important;font-weight:900;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 2px 3px #000}
    #startOverlay.camp-fullscreen #campChestBtn{background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;min-height:auto!important;padding:0 6px 2px!important}#startOverlay.camp-fullscreen #campChestBtn:hover{transform:translateY(-2px) scale(1.01);box-shadow:none!important;border-color:transparent!important}#startOverlay.camp-fullscreen #campChestBtn .camp-icon{font-size:48px}#startOverlay.camp-fullscreen #campChestBtn .camp-label{margin-top:2px}#startOverlay.camp-fullscreen #campChestBtn .camp-sub{max-width:140px}
    @media(max-width:799px){#startOverlay.camp-fullscreen .camp-scene{min-height:auto}.camp-sky{flex-direction:column;gap:12px}.camp-stars{flex-wrap:wrap}.camp-ground{grid-template-columns:repeat(2,minmax(0,1fr));max-width:none}.camp-topline,.camp-sky,.camp-ground,.camp-popup-layer{max-width:none}}
  `;
  const CAMP_STAGE_STYLE=`
    @media(min-width:800px){
      #startOverlay.camp-fullscreen{background:#020611!important;overflow:hidden!important}
      #startOverlay.camp-fullscreen .start-modal,#startOverlay.camp-fullscreen .legacy-camp-modal{position:relative!important;width:100vw!important;height:100dvh!important;min-height:100dvh!important;max-width:none!important;overflow:hidden!important;margin:0!important;padding:0!important}
      #startOverlay.camp-fullscreen .camp-scene{position:absolute!important;margin:0!important;padding:0!important;overflow:visible!important;transform:none!important;transform-origin:center!important;background:linear-gradient(rgba(3,8,20,.08),rgba(3,7,16,.14)),url("assets/camp/background/campsite.png") center/100% 100% no-repeat!important;border:0!important;border-radius:0!important;box-shadow:none!important}
      #startOverlay.camp-fullscreen .camp-sky,#startOverlay.camp-fullscreen .camp-stars,#startOverlay.camp-fullscreen .camp-ground{display:contents!important}
      #startOverlay.camp-fullscreen .camp-spot,#startOverlay.camp-fullscreen .camp-bonfire{position:absolute!important;right:auto!important;bottom:auto!important;margin:0!important}
      #startOverlay.camp-fullscreen #campGoBtn .camp-journey-art-frame{width:100%!important;max-width:none!important;height:90%!important;min-height:0!important}
      #startOverlay.camp-fullscreen #campGoBtn .camp-journey-art{max-width:100%!important;max-height:100%!important}
      #startOverlay.camp-fullscreen .camp-popup-layer{position:absolute!important;left:50%!important;bottom:2.5vh!important;width:min(88vw,1380px)!important;max-height:64vh!important;transform:translateX(-50%)!important}
    }
    #startOverlay.camp-fullscreen .start-art,#startOverlay.camp-fullscreen .start-modal>h2,#startOverlay.camp-fullscreen .hub-class-heading,#startOverlay.camp-fullscreen .start-modal>.subtitle,#startOverlay.camp-fullscreen .camp-help,#startOverlay.camp-fullscreen .camp-topline{display:none!important}
    #startOverlay.camp-fullscreen .camp-art-button,#startOverlay.camp-fullscreen #campTalentBtn,#startOverlay.camp-fullscreen #campInfoBtn,#startOverlay.camp-fullscreen #campMoonBtn,#startOverlay.camp-fullscreen #campAchievementBtn,#startOverlay.camp-fullscreen #campOptionsBtn,#startOverlay.camp-fullscreen #campNightmareBtn,#startOverlay.camp-fullscreen #campClassBtn,#startOverlay.camp-fullscreen #campPetBtn,#startOverlay.camp-fullscreen #campChestBtn{background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;overflow:visible!important}
    #startOverlay.camp-fullscreen .camp-spot:hover,#startOverlay.camp-fullscreen .camp-spot:focus-visible{background:transparent!important;border-color:transparent!important;box-shadow:none!important}
    #startOverlay.camp-fullscreen .camp-special-art-frame,.db058-camp-art-frame{display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important;background:transparent!important;border:0!important;border-radius:0!important;margin:0 auto}
    #startOverlay.camp-fullscreen .camp-special-art,.db058-camp-art{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;filter:drop-shadow(0 8px 14px rgba(0,0,0,.35))}
    #startOverlay.camp-fullscreen #campTalentBtn .camp-special-art-frame{width:142px!important;height:142px!important}
    #startOverlay.camp-fullscreen #campInfoBtn .camp-special-art-frame{width:112px!important;height:112px!important}
    #startOverlay.camp-fullscreen #campOptionsBtn .db058-camp-art-frame{width:94px;height:94px}
    #startOverlay.camp-fullscreen #campOptionsBtn .db058-camp-art{filter:drop-shadow(0 7px 12px rgba(0,0,0,.38))}
    #startOverlay.camp-fullscreen #campMoonBtn .db058-camp-art-frame{width:160px;height:160px}
    #startOverlay.camp-fullscreen #campMoonBtn .db058-camp-art{filter:drop-shadow(0 0 18px rgba(80,160,255,.62)) drop-shadow(0 8px 16px rgba(0,0,0,.3))}
    #startOverlay.camp-fullscreen #campAchievementBtn .db058-camp-art-frame{width:175px;height:145px}
    #startOverlay.camp-fullscreen #campNightmareBtn .db058-camp-art-frame{width:118px;height:165px}
    #startOverlay.camp-fullscreen #campNightmareBtn .db058-camp-art{object-position:right bottom;filter:drop-shadow(0 12px 18px rgba(0,0,0,.46))}
    #startOverlay.camp-fullscreen #campClassBtn{padding:0!important}
    #startOverlay.camp-fullscreen #campClassIcon{width:210px!important;height:245px!important;max-width:none!important;max-height:none!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important;filter:drop-shadow(0 14px 18px rgba(0,0,0,.45))}
    #startOverlay.camp-fullscreen #campClassIcon .db058-camp-class-fullbody{width:100%;height:100%;object-fit:contain;object-position:center bottom;display:block;pointer-events:none}
    #startOverlay.camp-fullscreen #campChestBtn .camp-icon{min-height:102px!important;display:flex!important;align-items:center!important;justify-content:center!important}
    #startOverlay.camp-fullscreen #campChestBtn .db-art-camp{width:112px!important;height:112px!important;max-width:112px!important;max-height:112px!important;object-fit:contain!important}
    #startOverlay.camp-fullscreen #campPetIcon{width:96px!important;height:96px!important;font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:visible!important}
    #startOverlay.camp-fullscreen #campPetIcon .camp-pet-portrait{width:96px;height:96px;object-fit:contain;filter:drop-shadow(0 5px 7px rgba(0,0,0,.34));pointer-events:none;user-select:none}
    #startOverlay.camp-fullscreen #campPetBtn .camp-label,#startOverlay.camp-fullscreen #campPetBtn .camp-sub,#startOverlay.camp-fullscreen #campClassBtn .camp-label,#startOverlay.camp-fullscreen #campClassBtn .camp-sub,#startOverlay.camp-fullscreen #campMoonBtn .camp-label,#startOverlay.camp-fullscreen #campMoonBtn .camp-sub,#startOverlay.camp-fullscreen #campAchievementBtn .camp-label,#startOverlay.camp-fullscreen #campAchievementBtn .camp-sub,#startOverlay.camp-fullscreen #campOptionsBtn .camp-label,#startOverlay.camp-fullscreen #campOptionsBtn .camp-sub,#startOverlay.camp-fullscreen #campNightmareBtn .camp-label,#startOverlay.camp-fullscreen #campNightmareBtn .camp-sub,#startOverlay.camp-fullscreen #campTalentBtn .camp-label,#startOverlay.camp-fullscreen #campInfoBtn .camp-label{ text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 3px 8px rgba(0,0,0,.95)!important}
    #startOverlay.camp-fullscreen #campTalentBtn .camp-sub,#startOverlay.camp-fullscreen #campInfoBtn .camp-sub{color:#d9e2f3!important;text-shadow:0 2px 5px rgba(0,0,0,.95)!important}
    @media(max-width:999px){#startOverlay.camp-fullscreen #campClassIcon{width:155px!important;height:185px!important}#startOverlay.camp-fullscreen #campNightmareBtn .db058-camp-art-frame{width:130px;height:190px}#startOverlay.camp-fullscreen #campMoonBtn .db058-camp-art-frame{width:110px;height:110px}#startOverlay.camp-fullscreen #campAchievementBtn .db058-camp-art-frame{width:130px;height:110px}#startOverlay.camp-fullscreen #campPetIcon,#startOverlay.camp-fullscreen #campPetIcon .camp-pet-portrait{width:72px!important;height:72px!important}}
    #campScene .camp-spot,#campScene .camp-bonfire{transition:scale .14s ease,filter .14s ease!important;transform-origin:center!important}
    #campScene .camp-spot:not(:disabled):hover,#campScene .camp-spot:not(:disabled):focus-visible,#campScene .camp-bonfire:hover{scale:1.035;filter:brightness(1.09) drop-shadow(0 0 11px rgba(255,218,142,.34)) drop-shadow(0 0 22px rgba(123,190,255,.16))}
    #campScene .camp-spot:not(:disabled):hover .camp-spot-title,#campScene .camp-spot:not(:disabled):focus-visible .camp-spot-title{color:#fff4ce!important;text-shadow:0 0 8px rgba(255,218,142,.45)!important}
  `;

  let runtime={};
  let resizeBound=false;
  let refreshFrame=0;

  function doc(){return root.document||null;}
  function find(id){return runtime.find?.(id)||doc()?.getElementById(id)||null;}
  function action(name,...args){return runtime.actions?.[name]?.(...args);}
  function asset(key,fallback){return root.DiceboundAssets?.resolveCampObject?.(key)?.image||fallback;}
  function assetAlt(key,fallback){return root.DiceboundAssets?.resolveCampObject?.(key)?.alt||fallback;}
  function important(node,property,value){node?.style?.setProperty?.(property,value,'important');}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

  function layoutForViewport(width=root.innerWidth||0,height=root.innerHeight||0){
    if(width>=1360&&height>=650)return CAMP_LAYOUTS[0];
    if(width>=1000&&height>=650)return CAMP_LAYOUTS[1];
    return CAMP_LAYOUTS[2];
  }

  function installLayoutStyles(){
    const documentRef=doc();
    if(!documentRef||documentRef.getElementById('dicebound-camp-layout-owner'))return;
    const style=documentRef.createElement('style');
    style.id='dicebound-camp-layout-owner';
    style.textContent=CAMP_BASE_STYLE+CAMP_STAGE_STYLE;
    style.textContent += `\nhtml body #startOverlay.camp-fullscreen .camp-panel.active > .camp-panel-head{position:sticky!important;top:0!important;z-index:80!important;background:linear-gradient(180deg,rgba(17,24,42,.98),rgba(17,24,42,.90))!important;padding:10px 12px!important;box-shadow:0 8px 18px rgba(0,0,0,.22)!important;backdrop-filter:blur(8px)}\nhtml body #startOverlay.camp-fullscreen .camp-panel.active > .camp-panel-head .camp-close-btn{margin-left:auto!important;flex:0 0 auto!important;position:relative!important;z-index:81!important}`;
    documentRef.head?.appendChild(style);
  }

  function closePanels(){doc()?.querySelectorAll('.camp-panel').forEach(panel=>panel.classList.remove('active'));}
  function openPanel(id){closePanels();find(id)?.classList.add('active');return find(id)||null;}
  function scrollPanel(id){find(id)?.scrollIntoView?.({behavior:'smooth',block:'start'});}

  function ensureCompatStartButton(){
    if(find('startBtn'))return find('startBtn');
    const button=doc()?.createElement('button');
    if(!button)return null;
    button.id='startBtn';button.className='camp-hidden';button.type='button';button.setAttribute('aria-hidden','true');
    find('startOverlay')?.querySelector('.start-modal')?.appendChild(button);
    return button;
  }

  // The legacy mode/storage controls are source inputs for the Camp scene, not
  // sibling presentation. They can be recreated by older runtime paths after
  // Camp initially opens, so hide them every Camp refresh as well as at scene
  // construction. The canonical Camp controls are their only visible
  // destination-level representation.
  function hideLegacyCampDestinations(){
    ['nightmareBox','hellBox','startHeirloom'].forEach(id=>find(id)?.classList.add('camp-hidden'));
  }

  function campTemplate(){
    return `<div class="camp-topline"><span id="campLegacyLine"></span><span id="campPetLine"></span></div>
      <div class="camp-sky"><div class="camp-stars"><button class="camp-spot camp-art-button talent-art-button" id="campTalentBtn"><div class="camp-icon camp-special-art-frame"><img class="camp-special-art camp-talent-art" src="${asset('talentStar','assets/camp/interactions/talent-star.png')}" alt="${assetAlt('talentStar','Northern star of talents')}"></div><div class="camp-label">Talents</div><div class="camp-sub">Spend Legacy points</div></button><button class="camp-spot camp-art-button info-art-button" id="campInfoBtn"><div class="camp-icon camp-special-art-frame"><img class="camp-special-art camp-info-art" src="${asset('infoBooks','assets/camp/interactions/info-books.png')}" alt="${assetAlt('infoBooks','Stack of books and scrolls')}"></div><div class="camp-label">Info</div><div class="camp-sub">Rules &amp; systems</div></button><button class="camp-spot" id="campMoonBtn"><div class="camp-icon">🌙</div><div class="camp-label">Prestige</div><div class="camp-sub">Prestige &amp; reset</div></button></div><div class="camp-stars"><button class="camp-spot nightmare-spot" id="campNightmareBtn"><div class="camp-icon">🕴️</div><div class="camp-label">Nightmare</div><div class="camp-sub">Locked</div></button><button class="camp-spot hell-spot" id="campHellBtn"><div class="camp-icon">😈🤝🕴️</div><div class="camp-label">Hell</div><div class="camp-sub">Locked</div></button></div></div>
      <div class="camp-ground"><button class="camp-spot" id="campPetBtn"><div class="camp-icon" id="campPetIcon">🎲</div><div class="camp-label">Pet</div><div class="camp-sub">Choose companion</div></button><button class="camp-spot class-picker" id="campClassBtn"><div class="camp-icon" id="campClassIcon">🏹</div><div class="camp-label">Class</div><div class="camp-sub" id="campClassSub">Select class</div></button><div class="camp-bonfire" aria-label="Bonfire"><div class="camp-icon camp-art-frame"><img class="camp-art camp-bonfire-art" src="${asset('bonfire','assets/camp/decorations/bonfire.png')}" alt="${assetAlt('bonfire','Bonfire')}"></div></div><button class="camp-spot go-spot camp-journey-control" id="campGoBtn" aria-label="Start next run" title="Start next run"><div class="camp-journey-art-frame"><img class="camp-journey-art" src="${asset('roadCaravan','assets/camp/interactions/road-caravan.png')}" alt="${assetAlt('roadCaravan','Horse pulling a modern caravan')}"></div><div class="camp-journey-label">Start run</div></button><button class="camp-spot" id="campChestBtn"><div class="camp-icon">🪙📦</div><div class="camp-label">Chest</div><div class="camp-sub">Heirlooms &amp; set</div></button><button class="camp-spot" id="campAchievementBtn"><div class="camp-icon">🏆</div><div class="camp-label">Trophy</div><div class="camp-sub">Achievements</div></button></div>
      <div class="camp-popup-layer" id="campPopupLayer">
        <div class="camp-panel" id="campClassPanel"><div class="camp-panel-head"><h3>Classes</h3><button class="small-btn camp-close-btn" data-close-camp-panel>Done</button></div><div class="camp-note-line">Select a class for the next expedition. When you return to camp, the figure in the clearing updates to the new choice.</div><div id="campClassHost"></div></div>
        <div class="camp-panel" id="campChestPanel"><div class="camp-panel-head"><h3>Heirlooms &amp; Impossible Road</h3><button class="small-btn camp-close-btn" data-close-camp-panel>Done</button></div><div id="campHeirloomSummary"></div><div id="campChestSet"></div></div>
      </div>`;
  }

  function wireClick(id,handler){
    const button=find(id);if(!button||button.dataset.dbCampWired==='1')return;
    button.dataset.dbCampWired='1';button.addEventListener('click',handler);
  }

  function wireScene(){
    wireClick('campClassBtn',()=>{action('showClassChoices');openPanel('campClassPanel');refresh();scrollPanel('campClassPanel');});
    wireClick('campChestBtn',()=>{openPanel('campChestPanel');action('renderEquipment');refresh();scrollPanel('campChestPanel');});
    wireClick('campMoonBtn',()=>action('openPrestigeMoon'));
    wireClick('campTalentBtn',()=>action('openTalents'));
    wireClick('campInfoBtn',()=>action('openInfo'));
    wireClick('campAchievementBtn',()=>action('openAchievements'));
    wireClick('campPetBtn',()=>action('openPets'));
    wireClick('campGoBtn',()=>{find('startOverlay')?.classList.add('hidden');closePanels();action('startRun');});
    wireClick('campNightmareBtn',()=>{action('toggleNightmare');refresh();});
    wireClick('campHellBtn',()=>{action('toggleHell');refresh();});
    doc()?.querySelectorAll('[data-close-camp-panel]').forEach(button=>{
      if(button.dataset.dbCampWired==='1')return;
      button.dataset.dbCampWired='1';button.addEventListener('click',closePanels);
    });
  }

  // Heirloom Storage is an earned Camp destination.  Keep its physical art
  // and semantic hit target out of the scene entirely until progression says
  // it exists; a hidden button is still a bug-prone button.
  function chestMarkup(){return '<div class="camp-icon">🪙📦</div><div class="camp-label">Chest</div><div class="camp-sub">Heirlooms &amp; set</div>';}
  function syncHeirloomStorageChest(unlocked){
    const existing=find('campChestBtn');
    if(!unlocked){existing?.remove();find('campChestPanel')?.classList.remove('active');return null;}
    if(existing)return existing;
    const ground=find('campScene')?.querySelector('.camp-ground'),button=doc()?.createElement('button');
    if(!ground||!button)return null;
    button.type='button';button.id='campChestBtn';button.className='camp-spot';button.innerHTML=chestMarkup();ground.appendChild(button);wireScene();return button;
  }

  function ensureOptionsButton(){
    const scene=find('campScene');if(!scene||find('campOptionsBtn'))return find('campOptionsBtn')||null;
    const host=scene.querySelectorAll('.camp-sky .camp-stars')[0]||scene.querySelector('.camp-sky');
    const button=doc()?.createElement('button');if(!host||!button)return null;
    button.className='camp-spot';button.id='campOptionsBtn';
    button.innerHTML='<div class="camp-icon">⚙️</div><div class="camp-label">Options</div><div class="camp-sub">Save, sound &amp; reset</div>';
    button.addEventListener('click',()=>find('optionsBtn')?.click());host.appendChild(button);
    return button;
  }

  function progressionObjectMarkup(id){
    if(id==='campAchievementBtn')return '<div class="camp-icon">🏆</div><div class="camp-label">Trophy</div><div class="camp-sub">Achievements</div>';
    if(id==='campTalentBtn')return `<div class="camp-icon camp-special-art-frame"><img class="camp-special-art camp-talent-art" src="${asset('talentStar','assets/camp/interactions/talent-star.png')}" alt="${assetAlt('talentStar','Northern star of talents')}"></div><div class="camp-label">Talents</div><div class="camp-sub">Spend Legacy points</div>`;
    if(id==='campMoonBtn')return '<div class="camp-icon">🌙</div><div class="camp-label">Prestige</div><div class="camp-sub">Prestige &amp; reset</div>';
    return '';
  }

  function attachProgressionObject(id){
    const existing=find(id);if(existing)return existing;
    const scene=find('campScene');if(!scene)return null;
    const button=doc()?.createElement('button');if(!button)return null;
    button.type='button';button.id=id;button.className=id==='campTalentBtn'?'camp-spot camp-art-button talent-art-button':'camp-spot';button.innerHTML=progressionObjectMarkup(id);
    if(id==='campAchievementBtn')scene.querySelector('.camp-ground')?.appendChild(button);
    else {
      const stars=scene.querySelector('.camp-sky .camp-stars'),info=find('campInfoBtn');
      if(id==='campTalentBtn')stars?.insertBefore(button,info||null);
      if(id==='campMoonBtn'){
        if(info?.parentElement)info.after(button);else stars?.appendChild(button);
      }
    }
    if(!button.parentElement)return null;
    wireScene();return button;
  }

  // Progression decides whether an object is earned.  Camp owns the DOM
  // consequence: a locked object is physically absent, and an earned object
  // is recreated in the canonical scene with this module's click bindings.
  function syncProgressionReveals(reveals={}){
    if(!find('campScene'))return Object.freeze({});
    const visible={};
    for(const entry of CAMP_PROGRESSIVE_OBJECTS){
      const unlocked=!!reveals?.[entry.reveal];visible[entry.id]=unlocked;
      if(unlocked)attachProgressionObject(entry.id);else find(entry.id)?.remove();
    }
    return Object.freeze(visible);
  }

  function ensure(){
    const documentRef=doc(),modal=find('startOverlay')?.querySelector('.start-modal');
    if(!documentRef||!modal)return null;
    installLayoutStyles();hideLegacyCampDestinations();
    let scene=find('campScene');
    if(scene){wireScene();ensureOptionsButton();return scene;}
    modal.classList.add('legacy-camp-modal');
    find('betweenRunsHub')?.remove();modal.querySelector('.start-art')?.remove();modal.querySelector('h2')?.remove();
    const subtitle=modal.querySelector('.subtitle');
    if(subtitle)subtitle.innerHTML='Between runs, gather at camp. Assign talents, swap companions, inspect heirlooms, toggle difficulties and then head back onto the road.';
    const classGrid=find('classGrid'),startButton=find('startBtn');classGrid?.classList.add('camp-hidden');startButton?.classList.add('camp-hidden');
    const help=documentRef.createElement('div');help.className='camp-help';help.textContent='Click the camp features to open their popups. Your selected class and companion remain visible in camp so the hub feels like a literal place between expeditions.';
    modal.insertBefore(help,classGrid||startButton||modal.lastElementChild);
    scene=documentRef.createElement('div');scene.id='campScene';scene.className='camp-scene';scene.innerHTML=campTemplate();help.after(scene);
    if(classGrid)find('campClassHost')?.appendChild(classGrid);startButton?.remove();
    wireScene();ensureOptionsButton();return scene;
  }

  function setObjectArt(id,key,cls,alt,fallback){
    const button=find(id);if(!button)return;
    let frame=button.querySelector('.db058-camp-art-frame');
    if(!frame){const old=button.querySelector('.camp-icon');frame=doc()?.createElement('div');if(!frame)return;frame.className='camp-icon db058-camp-art-frame';if(old)old.replaceWith(frame);else button.prepend(frame);}
    let image=frame.querySelector('img');if(!image){image=doc()?.createElement('img');if(!image)return;frame.replaceChildren(image);}
    image.className=`db058-camp-art ${cls||''}`.trim();image.alt=alt;image.draggable=false;
    const src=asset(key,fallback);if(image.getAttribute('src')!==src)image.src=src;
  }

  function renderClassFigure(icon,view){
    if(!icon||!view.classId)return;
    if(view.classId==='random'){
      if(icon.dataset.campFullbodyClass==='random')return;
      icon.classList.remove('class-portrait','combat-portrait','db054-art-frame');
      delete icon.dataset.portraitClass;
      const art=runtime.resolveRandomClassArt?.()||root.DiceboundAssets?.resolveRandomClassArt?.(),src=art?.campsite||art?.image;
      const image=doc()?.createElement('img');
      if(!image||!src){icon.textContent='🎲';return;}
      image.className='db058-camp-class-fullbody';image.src=src;image.alt=art?.alt||'Random class';image.draggable=false;
      icon.replaceChildren(image);icon.dataset.campFullbodyClass='random';return;
    }
    const art=runtime.resolveClassArt?.(view.classId)||root.DiceboundAssets?.resolveClassArt?.(view.classId);
    const src=art?.campFigure||art?.battle||art?.campsite||art?.headshot||null;
    if(icon.dataset.campFullbodyClass===String(view.classId)&&icon.querySelector('img.db058-camp-class-fullbody')?.getAttribute('src')===src)return;
    icon.classList.remove('class-portrait','combat-portrait','db054-art-frame');
    delete icon.dataset.portraitClass;
    const image=doc()?.createElement('img');
    if(!image||!src){icon.textContent=view.classIcon||'';return;}
    image.className='db058-camp-class-fullbody';image.src=src;image.alt=view.className||String(view.classId);image.draggable=false;
    icon.replaceChildren(image);icon.dataset.campFullbodyClass=String(view.classId);
  }

  function renderPetFigure(icon,view){
    if(!icon)return;
    const petId=view.petId||'neutral',art=root.DiceboundAssets?.resolvePetArt?.(petId),src=art?.portrait||art?.image;
    if(!src){icon.textContent=view.petIcon||'🐾';return;}
    const existing=icon.querySelector('img.camp-pet-portrait');
    if(existing?.getAttribute('src')===src&&icon.dataset.campPetId===String(petId))return;
    const image=doc()?.createElement('img');
    if(!image){icon.textContent=view.petIcon||'🐾';return;}
    image.className='camp-pet-portrait';image.src=src;image.alt=art?.alt||view.petName||String(petId);image.draggable=false;
    image.onerror=()=>{image.remove();icon.textContent=view.petIcon||'🐾';};
    icon.replaceChildren(image);icon.dataset.campPetId=String(petId);
  }

  function refreshArt(view=runtime.getViewModel?.()||{}){
    if(!find('campScene'))return;
    setObjectArt('campMoonBtn','prestigeMoon','db058-prestige-moon','Prestige moon','assets/camp/interactions/prestige-moon.png');
    setObjectArt('campAchievementBtn','achievementKeg','db058-achievement-keg','Ale keg and trophy cup','assets/camp/interactions/achievement-keg.png');
    setObjectArt('campOptionsBtn','optionsCog','db058-options-cog','Options cog','assets/camp/interactions/options-cog.png');
    setObjectArt('campChestBtn','chest','db-art-camp db058-chest','Treasure chest','assets/camp/interactions/chest.png');
    find('campChestBtn')?.classList.add('camp-chest-bare');
    setObjectArt('campNightmareBtn',view.nightmareMode?'nightmareOn':'nightmareOff','db058-nightmare-art',view.nightmareMode?'Nightmare creature emerged':'Nightmare creature spying from behind a tree',view.nightmareMode?'assets/camp/mode-toggles/nightmare/on.png':'assets/camp/mode-toggles/nightmare/off.png');
    const journey=find('campGoBtn')?.querySelector('.camp-journey-art');
    if(journey){const src=asset('roadCaravan','assets/camp/interactions/road-caravan.png');if(journey.getAttribute('src')!==src)journey.src=src;journey.hidden=false;}
    renderClassFigure(find('campClassIcon'),view);
    renderPetFigure(find('campPetIcon'),view);
  }

  function refresh(){
    const overlay=find('startOverlay');if(!overlay)return null;overlay.classList.add('camp-fullscreen');
    const scene=ensure();if(!scene)return null;
    const view=runtime.getViewModel?.()||{};
    syncProgressionReveals(view.reveals);
    syncHeirloomStorageChest(!!view.heirloomStorageUnlocked);
    const classSub=find('campClassSub');if(classSub)classSub.textContent=view.className?`${view.className} selected · click to change`:'Select class';
    const petLine=find('campPetLine');if(petLine)petLine.textContent=view.petLine||'';
    const legacy=find('campLegacyLine');if(legacy)legacy.textContent=view.summary||'';
    const heirloom=find('campHeirloomSummary');if(heirloom)heirloom.innerHTML=view.heirloomHtml||'';
    const set=find('campChestSet');if(set)set.innerHTML=view.setHtml||'';
    setMode('campNightmareBtn',view.nightmareUnlocked,view.nightmareMode,'Nightmare');
    setMode('campHellBtn',view.hellUnlocked,view.hellMode,'HELL');
    scene.dataset.dbCampLayout=layoutForViewport().id;refreshArt(view);applyStageLayout();scheduleHitTargetSync();scheduleViewportPositionSync();return scene;
  }

  function setMode(id,unlocked,enabled,label){
    const button=find(id);if(!button)return;
    button.hidden=!unlocked;button.disabled=!unlocked;button.setAttribute('aria-hidden',String(!unlocked));button.classList.toggle('active',!!enabled);button.setAttribute('aria-pressed',String(!!enabled));
    const sub=button.querySelector('.camp-sub');if(sub)sub.innerHTML=`${enabled?`${label} ON`:`${label} OFF`} <span class="camp-mode-state">${enabled?'ON':'OFF'}</span>`;
  }

  function paintedBounds(button){
    const rects=[...button.children].map(child=>child.getBoundingClientRect()).filter(rect=>rect.width>1&&rect.height>1);
    if(!rects.length)return null;
    return {left:Math.min(...rects.map(rect=>rect.left)),top:Math.min(...rects.map(rect=>rect.top)),right:Math.max(...rects.map(rect=>rect.right)),bottom:Math.max(...rects.map(rect=>rect.bottom))};
  }

  function syncHitTargets(){
    let changed=false;
    for(const id of CAMP_OBJECT_IDS){
      // The caravan is a deliberately large stage object.  Its authored Camp
      // bounds own both the painted frame and its semantic target; measuring
      // it before the stage pass would otherwise lock in the old tiny image.
      if(id==='campGoBtn'&&(root.innerWidth||0)>=800)continue;
      const button=find(id),painted=button&&paintedBounds(button),buttonRect=button?.getBoundingClientRect();
      if(!button||!painted||!buttonRect)continue;
      const width=Math.ceil(painted.right-painted.left),height=Math.ceil(painted.bottom-painted.top);if(width<1||height<1)continue;
      if(buttonRect.width<=width+3&&buttonRect.height<=height+3)continue;
      button.style.setProperty('width',`${width}px`,'important');button.style.setProperty('min-width','0','important');button.style.setProperty('max-width',`${width}px`,'important');
      button.style.setProperty('height',`${height}px`,'important');button.style.setProperty('min-height','0','important');button.style.setProperty('max-height',`${height}px`,'important');
      button.style.setProperty('padding','0','important');button.style.setProperty('justify-self','center','important');
      button.dataset.db064HitTarget='painted-object';changed=true;
    }
    return changed;
  }

  function scheduleHitTargetSync(){
    const schedule=root.requestAnimationFrame||root.setTimeout||setTimeout;
    const sync=()=>schedule(()=>{syncHitTargets();applyStageLayout();});sync();root.setTimeout?.(sync,0);root.setTimeout?.(sync,120);
  }

  function layoutAnchorOverrides(layout=layoutForViewport()){
    return Object.fromEntries(layout.rules.map(([selector,declaration])=>{
      const match=selector.match(/^#(camp(?:Options|Talent|Moon|Class)Btn)$/);
      if(!match)return null;
      const left=declaration.match(/(?:^|;)left:([^;]+)/)?.[1],top=declaration.match(/(?:^|;)top:([^;]+)/)?.[1];
      return [match[1],Object.freeze({x:Number.parseFloat(left)/100,y:Number.parseFloat(top)/100})];
    }).filter(Boolean));
  }

  function stageSpec(id,layout=layoutForViewport()){
    const base=CAMP_STAGE_ANCHORS[id],layoutOverride=layoutAnchorOverrides(layout)[id],refinement=CAMP_STAGE_REFINEMENTS[layout.id]?.[id];
    return base?{...base,...layoutOverride,...refinement}:null;
  }

  function clearStageLayout(){
    const scene=find('campScene');
    for(const node of [scene,...CAMP_OBJECT_IDS.map(id=>find(id)),scene?.querySelector('.camp-bonfire')].filter(Boolean)){
      const properties=['left','top','right','bottom','transform','translate','justify-self'];
      // At the mobile/grid breakpoint a control still needs the painted-object
      // size written by syncHitTargets().  Clearing those dimensions after
      // every sync made the visual shrink while its semantic button stretched
      // across the grid cell.
      if(node===scene||node.dataset.db064HitTarget!=='painted-object')properties.push('width','height','min-width','min-height','max-width','max-height');
      for(const property of properties)node.style.removeProperty(property);
    }
  }

  function stageFrame(viewportWidth,viewportHeight){
    const width=Math.max(1,Number(viewportWidth)||1),height=Math.max(1,Number(viewportHeight)||1),viewportAspect=width/height;
    let stageWidth,stageHeight;
    if(viewportAspect>CAMP_STAGE_ASPECT){stageHeight=height;stageWidth=stageHeight*CAMP_STAGE_ASPECT;}else{stageWidth=width;stageHeight=stageWidth/CAMP_STAGE_ASPECT;}
    return Object.freeze({left:(width-stageWidth)/2,top:(height-stageHeight)/2,width:stageWidth,height:stageHeight,scale:clamp(Math.min(stageWidth/1600,stageHeight/900),.68,1.08)});
  }

  // This is the one authoritative layout writer for Camp.  It deliberately
  // runs after painted-object hit-target sizing, so semantic controls stay
  // centered on their actual artwork without inheriting stale late-patch
  // coordinates or viewport-specific translate hacks.
  function applyStageLayout(){
    const overlay=find('startOverlay'),scene=find('campScene');
    if(!overlay?.classList.contains('camp-fullscreen')||!scene)return false;
    if((root.innerWidth||0)<800){clearStageLayout();return false;}
    const bounds=overlay.getBoundingClientRect(),frame=stageFrame(bounds.width||root.innerWidth||1,bounds.height||root.innerHeight||1),layout=layoutForViewport();
    for(const [property,value] of Object.entries({left:`${Math.round(frame.left)}px`,top:`${Math.round(frame.top)}px`,right:'auto',bottom:'auto',width:`${Math.round(frame.width)}px`,height:`${Math.round(frame.height)}px`,'min-height':'0','max-width':'none',transform:'none',translate:'none'}))important(scene,property,value);
    for(const id of Object.keys(CAMP_STAGE_ANCHORS)){
      const node=id==='campBonfire'?scene.querySelector('.camp-bonfire'):find(id),spec=stageSpec(id,layout);
      if(!node||!spec)continue;
      for(const [property,value] of Object.entries({position:'absolute',left:`${(spec.x*100).toFixed(3)}%`,top:`${(spec.y*100).toFixed(3)}%`,right:'auto',bottom:'auto',transform:'translate(-50%,-50%)',translate:'none'}))important(node,property,value);
      if(id==='campGoBtn'){
        const width=Math.round(clamp(spec.w*frame.scale,spec.w*.68,spec.w*1.08)),height=Math.round(clamp((spec.h||spec.w)*frame.scale,(spec.h||spec.w)*.72,(spec.h||spec.w)*1.08));
        for(const [property,value] of Object.entries({width:`${width}px`,height:`${height}px`,'min-width':`${width}px`,'min-height':`${height}px`,'max-width':`${width}px`,'max-height':`${height}px`,padding:'0'}))important(node,property,value);
      }else if(node.dataset.db064HitTarget!=='painted-object'){
        important(node,'width',`${Math.round(clamp(spec.w*frame.scale,spec.w*.68,spec.w*1.08))}px`);
        if(spec.h)important(node,'min-height',`${Math.round(clamp(spec.h*frame.scale,spec.h*.72,spec.h*1.08))}px`);
      }
    }
    const journey=scene.querySelector('#campGoBtn .camp-journey-art-frame');if(journey){important(journey,'width','100%');important(journey,'height','90%');important(journey,'max-width','none');}
    scene.dataset.dbCampStage=`${Math.round(frame.width)}x${Math.round(frame.height)}`;
    scene.dataset.dbCampLayout=layout.id;
    return true;
  }

  // Kept as a public compatibility name while callers move to stage layout.
  function applyViewportPositions(){return applyStageLayout();}

  function clampShortViewportPositions(){
    if((root.innerWidth||0)<800)return [];
    applyStageLayout();return [];
  }

  function scheduleViewportPositionSync(){
    const schedule=root.requestAnimationFrame||root.setTimeout||setTimeout;
    const apply=()=>{applyStageLayout();schedule(clampShortViewportPositions);};
    apply();
    root.setTimeout?.(()=>{apply();root.setTimeout?.(clampShortViewportPositions,40);},180);
    root.setTimeout?.(clampShortViewportPositions,360);
  }

  function inspectHitTargets(){
    return CAMP_OBJECT_IDS.map(id=>{
      const button=find(id),visual=button?.querySelector('.camp-icon,.camp-journey-art-frame'),buttonRect=button?.getBoundingClientRect(),visualRect=visual?.getBoundingClientRect(),painted=button&&paintedBounds(button);
      return {id,present:!!button,semantic:button?.tagName==='BUTTON',focusable:button?.tabIndex===0,button:buttonRect?{width:Math.round(buttonRect.width),height:Math.round(buttonRect.height)}:null,visual:visualRect?{width:Math.round(visualRect.width),height:Math.round(visualRect.height)}:null,painted:painted?{width:Math.round(painted.right-painted.left),height:Math.round(painted.bottom-painted.top)}:null};
    });
  }

  function scheduleRefresh(){
    if(refreshFrame)return;const schedule=root.requestAnimationFrame||root.setTimeout||setTimeout;
    refreshFrame=schedule(()=>{refreshFrame=0;refresh();});
  }

  function configure(nextRuntime={}){
    runtime={...runtime,...nextRuntime,actions:{...runtime.actions,...nextRuntime.actions}};
    installLayoutStyles();
    if(!resizeBound&&root.addEventListener){resizeBound=true;root.addEventListener('resize',()=>{scheduleRefresh();scheduleHitTargetSync();scheduleViewportPositionSync();},{passive:true});}
    return api;
  }

  const api=Object.freeze({
    configure,ensure,refresh,refreshArt,renderClassFigure,renderPetFigure,openPanel,closePanels,scrollPanel,ensureCompatStartButton,ensureOptionsButton,
    layoutForViewport,layouts:CAMP_LAYOUTS,stageAnchors:CAMP_STAGE_ANCHORS,stageFrame,syncHitTargets,scheduleHitTargetSync,applyStageLayout,applyViewportPositions,clampShortViewportPositions,scheduleViewportPositionSync,inspectHitTargets,
    syncProgressionReveals,progressionRevealObjectIds:()=>CAMP_PROGRESSIVE_OBJECTS.map(entry=>entry.id),
    requiredSemanticIds:()=>[...CAMP_OBJECT_IDS]
  });
  window.DiceboundCamp=api;
})(window);
