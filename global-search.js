/* TATNERA — global studio search
   Finds customers, tattoo/piercing records, appointments, requests and invoices from one place. */
(function(){
  'use strict';
  if(window.__tatneraGlobalSearchInstalled)return;
  window.__tatneraGlobalSearchInstalled=true;

  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const norm=value=>String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const stateRef=()=>window.state||{};
  const customerName=id=>{
    const c=(stateRef().customers||[]).find(item=>String(item.id)===String(id));
    return c?`${c.firstName||''} ${c.lastName||''}`.trim():'Kunde';
  };
  const projectName=id=>{
    const p=(stateRef().projects||[]).find(item=>String(item.id)===String(id));
    return p?.title||'';
  };

  function installStyle(){
    if(document.getElementById('tatneraGlobalSearchStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraGlobalSearchStyle';
    style.textContent=`
      .tatnera-global-search-trigger{display:inline-flex;align-items:center;justify-content:center;gap:7px}
      .tatnera-global-search-trigger .search-symbol{font-size:16px;line-height:1}
      #tatneraGlobalSearch{width:min(760px,94vw);max-height:min(760px,88vh);padding:0;border:1px solid var(--line);border-radius:18px;background:var(--panel);color:var(--text);box-shadow:0 28px 80px rgba(0,0,0,.45);overflow:hidden}
      #tatneraGlobalSearch::backdrop{background:rgba(0,0,0,.68);backdrop-filter:blur(3px)}
      .global-search-shell{display:flex;flex-direction:column;max-height:min(760px,88vh)}
      .global-search-head{padding:18px 18px 12px;border-bottom:1px solid var(--line)}
      .global-search-title-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
      .global-search-title-row h2{margin:0;font-size:18px}.global-search-title-row p{margin:3px 0 0;font-size:10px;color:var(--muted)}
      .global-search-input-wrap{display:flex;align-items:center;gap:10px;border:1px solid var(--line);background:var(--panel-2);border-radius:13px;padding:0 12px}
      .global-search-input-wrap span{font-size:18px;color:var(--muted)}
      #tatneraGlobalSearchInput{width:100%;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:15px;padding:13px 0}
      .global-search-results{overflow:auto;padding:10px 12px 16px}
      .global-search-empty{padding:26px 14px;text-align:center;color:var(--muted);font-size:12px}
      .global-search-group{margin-top:10px}.global-search-group:first-child{margin-top:0}
      .global-search-group-title{padding:5px 8px;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:850}
      .global-search-result{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;text-align:left;border:1px solid transparent;background:transparent;color:var(--text);padding:11px 10px;border-radius:11px;cursor:pointer}
      .global-search-result:hover,.global-search-result:focus-visible{background:var(--panel-2);border-color:var(--line);outline:0}
      .global-search-result strong,.global-search-result span{display:block}.global-search-result strong{font-size:12px}.global-search-result span{margin-top:3px;font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .global-search-kind{font-size:9px!important;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)!important;text-align:right;margin:0!important}
      @media(max-width:760px){
        .tatnera-global-search-trigger .search-label{display:none}
        .tatnera-global-search-trigger{min-width:44px;padding-left:12px!important;padding-right:12px!important}
        #tatneraGlobalSearch{width:calc(100vw - 18px);max-height:86vh;border-radius:16px}
        .global-search-head{padding:14px 14px 10px}.global-search-results{padding:8px 8px 14px}
        .global-search-result{padding:12px 9px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDialog(){
    let dialog=document.getElementById('tatneraGlobalSearch');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='tatneraGlobalSearch';
    dialog.innerHTML=`<div class="global-search-shell">
      <div class="global-search-head">
        <div class="global-search-title-row"><div><h2>Alles durchsuchen</h2><p>Kunden, Akten, Termine, Anfragen und Rechnungen</p></div><button type="button" class="close-btn" data-close-global-search>×</button></div>
        <label class="global-search-input-wrap"><span>⌕</span><input id="tatneraGlobalSearchInput" type="search" autocomplete="off" placeholder="Name, Motiv, Telefon, E-Mail, Termin …"></label>
      </div>
      <div class="global-search-results" id="tatneraGlobalSearchResults"></div>
    </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close-global-search]')?.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    dialog.querySelector('#tatneraGlobalSearchInput')?.addEventListener('input',event=>render(event.target.value));
    return dialog;
  }

  function ensureTrigger(){
    const actions=document.querySelector('.topbar .top-actions');
    if(!actions||actions.querySelector('[data-global-search-open]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='btn ghost tatnera-global-search-trigger';
    button.dataset.globalSearchOpen='true';
    button.setAttribute('aria-label','Alles durchsuchen');
    button.innerHTML='<span class="search-symbol">⌕</span><span class="search-label">Suchen</span>';
    actions.prepend(button);
  }

  function haystack(...values){return norm(values.flat().filter(Boolean).join(' '));}

  function collect(query){
    const q=norm(query).trim();
    if(!q)return [];
    const s=stateRef(),out=[];

    (s.customers||[]).forEach(c=>{
      const text=haystack(c.firstName,c.lastName,c.email,c.phone,c.notes,c.status,c.id);
      if(text.includes(q))out.push({group:'Kunden',kind:'Kunde',title:`${c.firstName||''} ${c.lastName||''}`.trim()||'Kunde',detail:[c.email,c.phone].filter(Boolean).join(' · ')||'Kundenakte',score:text.startsWith(q)?0:1,open:()=>window.openCustomer?.(c.id)});
    });

    (s.projects||[]).forEach(p=>{
      const piercing=p.serviceType==='piercing';
      const text=haystack(p.title,p.placement,p.size,p.artist,p.status,p.description,p.id,customerName(p.customerId),piercing?'piercing':'tattoo');
      if(text.includes(q))out.push({group:'Akten',kind:piercing?'Piercing':'Tattoo',title:p.title|| (piercing?'Piercing':'Tattoo'),detail:`${customerName(p.customerId)}${p.placement?' · '+p.placement:''}`,score:text.startsWith(q)?0:1,open:()=>window.openProject?.(p.id)});
    });

    (s.calendarEvents||[]).forEach(e=>{
      const text=haystack(e.date,e.start,e.artist,e.status,e.type,e.notes,customerName(e.customerId),projectName(e.projectId));
      if(text.includes(q))out.push({group:'Termine',kind:'Termin',title:`${e.date||''}${e.start?' · '+e.start:''}`,detail:[customerName(e.customerId),projectName(e.projectId),e.artist].filter(Boolean).join(' · '),score:2,open:()=>{window.navigate?.('calendar');setTimeout(()=>{try{if(typeof window.openAppointmentDialog==='function')window.openAppointmentDialog(e.id,e.date);}catch(_error){}},80);}});
    });

    (s.requests||[]).forEach(r=>{
      const text=haystack(r.name,r.customerName,r.email,r.phone,r.subject,r.motif,r.placement,r.message,r.notes,r.stage,r.id);
      if(text.includes(q))out.push({group:'Anfragen',kind:'Anfrage',title:r.name||r.customerName||r.subject||r.motif||'Anfrage',detail:[r.email,r.phone,r.placement].filter(Boolean).join(' · ')||'Anfrage öffnen',score:3,open:()=>{window.navigate?.('requests');}});
    });

    const invoiceSources=[];
    if(Array.isArray(s.invoices))invoiceSources.push(...s.invoices);
    (s.projects||[]).forEach(p=>{
      if(Array.isArray(p.invoices))p.invoices.forEach(inv=>invoiceSources.push({...inv,__project:p}));
    });
    invoiceSources.forEach(inv=>{
      const p=inv.__project;
      const text=haystack(inv.number,inv.invoiceNumber,inv.id,inv.status,inv.amount,inv.total,inv.date,customerName(inv.customerId||p?.customerId),p?.title);
      if(text.includes(q))out.push({group:'Rechnungen',kind:'Rechnung',title:inv.number||inv.invoiceNumber||'Rechnung',detail:[customerName(inv.customerId||p?.customerId),p?.title,inv.status].filter(Boolean).join(' · '),score:4,open:()=>window.navigate?.('invoices')});
    });

    return out.sort((a,b)=>a.score-b.score||a.group.localeCompare(b.group,'de')||a.title.localeCompare(b.title,'de')).slice(0,40);
  }

  function render(query){
    const root=document.getElementById('tatneraGlobalSearchResults');if(!root)return;
    const q=String(query||'').trim();
    if(!q){root.innerHTML='<div class="global-search-empty">Tippe einen Namen, ein Motiv, eine Telefonnummer oder einen anderen Suchbegriff ein.</div>';return;}
    const results=collect(q);
    if(!results.length){root.innerHTML=`<div class="global-search-empty">Keine Treffer für „${esc(q)}“.</div>`;return;}
    const groups=new Map();
    results.forEach(item=>{if(!groups.has(item.group))groups.set(item.group,[]);groups.get(item.group).push(item);});
    root.innerHTML='';
    groups.forEach((items,name)=>{
      const group=document.createElement('section');group.className='global-search-group';
      const title=document.createElement('div');title.className='global-search-group-title';title.textContent=`${name} · ${items.length}`;group.appendChild(title);
      items.forEach(item=>{
        const button=document.createElement('button');button.type='button';button.className='global-search-result';button.innerHTML=`<div><strong>${esc(item.title)}</strong><span>${esc(item.detail||'')}</span></div><span class="global-search-kind">${esc(item.kind)}</span>`;
        button.addEventListener('click',()=>{document.getElementById('tatneraGlobalSearch')?.close();item.open?.();});group.appendChild(button);
      });
      root.appendChild(group);
    });
  }

  function openSearch(){
    const dialog=ensureDialog(),input=dialog.querySelector('#tatneraGlobalSearchInput');
    render(input?.value||'');
    if(!dialog.open)dialog.showModal();
    setTimeout(()=>input?.focus(),30);
  }

  document.addEventListener('click',event=>{if(event.target.closest('[data-global-search-open]')){event.preventDefault();openSearch();}});
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='k'){event.preventDefault();openSearch();}
    if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){event.preventDefault();openSearch();}
  });
  document.addEventListener('tatnera:runtime-refresh',ensureTrigger);
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(ensureTrigger,100));

  installStyle();ensureDialog();ensureTrigger();
  window.TatneraGlobalSearch={open:openSearch,render};
})();
