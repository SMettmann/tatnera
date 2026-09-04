/* TATNERA — mobile "Mehr" menu
   Keeps the five everyday bottom tabs and adds a sixth compact entry for
   Tattoo-Akten, Finanzen, Einstellungen and logout. */
(function(){
  'use strict';
  if(window.__tatneraMobileMoreInstalled)return;
  window.__tatneraMobileMoreInstalled=true;

  function installStyle(){
    if(document.getElementById('mobileMoreStyle'))return;
    const style=document.createElement('style');
    style.id='mobileMoreStyle';
    style.textContent=`
      .mobile-more-nav,.mobile-more-backdrop{display:none}
      @media(max-width:760px){
        .sidebar .nav{grid-template-columns:repeat(6,minmax(0,1fr))!important}
        .mobile-more-nav{display:flex!important;order:6!important}
        .mobile-more-backdrop{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.38);align-items:flex-end;justify-content:center;padding:12px 12px calc(88px + env(safe-area-inset-bottom));backdrop-filter:blur(2px)}
        .mobile-more-backdrop.open{display:flex!important}
        .mobile-more-sheet{box-sizing:border-box;width:min(100%,520px);max-height:min(72dvh,620px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:14px;box-shadow:0 24px 70px rgba(0,0,0,.26)}
        .mobile-more-handle{width:42px;height:4px;border-radius:999px;background:var(--line);margin:0 auto 13px}
        .mobile-more-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:2px 2px 12px}
        .mobile-more-head h3{margin:2px 0 0!important}
        .mobile-more-close{appearance:none;border:1px solid var(--line);background:var(--panel-2);color:var(--text);width:38px;height:38px;border-radius:11px;font-size:22px;line-height:1;display:grid;place-items:center}
        .mobile-more-list{display:flex;flex-direction:column;gap:8px}
        .mobile-more-item{appearance:none;width:100%;border:1px solid var(--line);background:var(--panel-2);color:var(--text);border-radius:13px;padding:12px 13px;display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;min-height:58px}
        .mobile-more-item>span:first-child{font-size:20px;display:grid;place-items:center}
        .mobile-more-item strong,.mobile-more-item small{display:block}
        .mobile-more-item strong{font-size:15px!important;line-height:1.2}
        .mobile-more-item small{margin-top:3px;color:var(--muted);font-size:12px!important;line-height:1.3}
        .mobile-more-item .arrow{font-size:18px;color:var(--muted)}
        .mobile-more-item.logout{margin-top:5px;background:transparent;border-color:#b96868;color:#9d3434}
        .mobile-more-account{margin:0 0 10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2)}
        .mobile-more-account strong,.mobile-more-account span{display:block}
        .mobile-more-account strong{font-size:13px!important}
        .mobile-more-account span{font-size:12px!important;color:var(--muted);margin-top:2px}
      }
      @media(max-width:390px){
        .sidebar .nav-item{font-size:8.5px!important}
        .sidebar .nav-item span:first-child{font-size:17px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function activeView(){return document.querySelector('.view.active-view')?.id||'';}

  function accountHtml(){
    const auth=window.TatneraAuth;
    const user=auth?.user?.();
    const studio=auth?.studio?.();
    const role=auth?.membership?.()?.role||'';
    const roleLabel={owner:'Inhaber',admin:'Admin',artist:'Tattoo Artist',piercer:'Piercer',artist_piercer:'Artist & Piercer',staff:'Studio-Mitarbeiter'}[role]||role||'Studio-Zugang';
    return `<strong>${escapeHtml(studio?.name||'TATNERA')}</strong><span>${escapeHtml(user?.email||'')} · ${escapeHtml(roleLabel)}</span>`;
  }

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

  function closeMenu(){
    document.getElementById('mobileMoreBackdrop')?.classList.remove('open');
    document.getElementById('mobileMoreNav')?.setAttribute('aria-expanded','false');
  }
  function openMenu(){
    const account=document.querySelector('#mobileMoreBackdrop .mobile-more-account');if(account)account.innerHTML=accountHtml();
    document.getElementById('mobileMoreBackdrop')?.classList.add('open');
    document.getElementById('mobileMoreNav')?.setAttribute('aria-expanded','true');
  }

  function go(view){closeMenu();if(typeof window.navigate==='function')window.navigate(view);}

  function syncActive(){
    const more=document.getElementById('mobileMoreNav');if(!more)return;
    more.classList.toggle('active',['projects','project-detail','finance','settings'].includes(activeView()));
  }

  function build(){
    const nav=document.querySelector('.sidebar .nav');if(!nav||document.getElementById('mobileMoreNav'))return;
    const more=document.createElement('button');
    more.type='button';more.id='mobileMoreNav';more.className='nav-item mobile-more-nav';more.setAttribute('aria-haspopup','dialog');more.setAttribute('aria-expanded','false');
    more.innerHTML='<span>•••</span> Mehr';nav.appendChild(more);

    const backdrop=document.createElement('div');
    backdrop.id='mobileMoreBackdrop';backdrop.className='mobile-more-backdrop';
    backdrop.innerHTML=`<section class="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="Weitere Bereiche"><div class="mobile-more-handle"></div><div class="mobile-more-head"><div><span class="eyebrow">TATNERA</span><h3>Mehr</h3></div><button type="button" class="mobile-more-close" aria-label="Schließen">×</button></div><div class="mobile-more-account">${accountHtml()}</div><div class="mobile-more-list"><button type="button" class="mobile-more-item" data-mobile-more-view="projects"><span>✦</span><div><strong>Tattoo- & Piercing-Akten</strong><small>Alle laufenden und bisherigen Projekte</small></div><span class="arrow">→</span></button><button type="button" class="mobile-more-item" data-mobile-more-view="finance"><span>€</span><div><strong>Finanzen</strong><small>Zahlungen, Anzahlungen und offene Beträge</small></div><span class="arrow">→</span></button><button type="button" class="mobile-more-item" data-mobile-more-view="settings"><span>⚙</span><div><strong>Einstellungen</strong><small>Studio, Team, Rollen, Farben & Chargen</small></div><span class="arrow">→</span></button><button type="button" class="mobile-more-item logout" data-mobile-logout><span>↪</span><div><strong>Abmelden</strong><small>TATNERA auf diesem Gerät verlassen</small></div><span class="arrow">→</span></button></div></section>`;
    document.body.appendChild(backdrop);

    more.addEventListener('click',()=>backdrop.classList.contains('open')?closeMenu():openMenu());
    backdrop.querySelector('.mobile-more-close')?.addEventListener('click',closeMenu);
    backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeMenu();});
    backdrop.querySelectorAll('[data-mobile-more-view]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.mobileMoreView)));
    backdrop.querySelector('[data-mobile-logout]')?.addEventListener('click',async()=>{
      closeMenu();
      const logout=window.TatneraAuth?.logout;
      if(typeof logout==='function')await logout();
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&backdrop.classList.contains('open'))closeMenu();});

    const viewObserver=new MutationObserver(syncActive);
    document.querySelectorAll('.view').forEach(view=>viewObserver.observe(view,{attributes:true,attributeFilter:['class']}));
    syncActive();
  }

  installStyle();
  build();
  document.addEventListener('tatnera:auth-ready',()=>{build();const account=document.querySelector('#mobileMoreBackdrop .mobile-more-account');if(account)account.innerHTML=accountHtml();});
  document.addEventListener('tatnera:runtime-refresh',syncActive);
})();