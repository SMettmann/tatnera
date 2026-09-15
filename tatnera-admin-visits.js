/* TATNERA admin — anonymous website visitor statistics */
(function(){
  'use strict';
  if(window.__tatneraAdminVisitsInstalled)return;
  window.__tatneraAdminVisitsInstalled=true;

  let client=null,busy=false,bound=false;
  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';

  function db(){
    if(client)return client;
    client=window.TatneraAuth?.client||null;
    if(client)return client;
    if(window.supabase?.createClient)client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    return client;
  }

  function ensureCard(){
    const admin=document.getElementById('tatnera-admin');
    const grid=admin?.querySelector('.tatnera-admin-grid');
    if(!grid)return null;
    let card=grid.querySelector('[data-admin-visits-card]');
    if(card)return card;
    card=document.createElement('section');
    card.className='tatnera-admin-card';
    card.dataset.adminVisitsCard='1';
    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px">
        <div><h3 style="margin:0 0 5px">👀 Website-Besucher</h3><div class="muted" style="font-size:12px">Anonym gezählt · einmal pro Browser-Sitzung auf der öffentlichen Startseite</div></div>
      </div>
      <div class="tatnera-admin-kpis" style="margin-bottom:0">
        <div class="tatnera-admin-kpi"><span>Besucher gesamt</span><strong id="adminVisitsTotal">–</strong></div>
        <div class="tatnera-admin-kpi"><span>Heute</span><strong id="adminVisitsToday">–</strong></div>
        <div class="tatnera-admin-kpi"><span>Letzte 7 Tage</span><strong id="adminVisits7">–</strong></div>
        <div class="tatnera-admin-kpi"><span>Letzte 30 Tage</span><strong id="adminVisits30">–</strong></div>
      </div>`;
    grid.prepend(card);
    return card;
  }

  async function loadStats(){
    if(busy||!document.getElementById('tatnera-admin')?.classList.contains('active-view'))return;
    const api=db(),card=ensureCard();
    if(!api||!card)return;
    busy=true;
    try{
      const now=new Date();
      const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      const d7=new Date(now);d7.setDate(d7.getDate()-7);
      const d30=new Date(now);d30.setDate(d30.getDate()-30);
      const [total,todayQ,weekQ,monthQ]=await Promise.all([
        api.from('site_visit_events').select('id',{count:'exact',head:true}).eq('source','website'),
        api.from('site_visit_events').select('id',{count:'exact',head:true}).eq('source','website').gte('visited_at',today.toISOString()),
        api.from('site_visit_events').select('id',{count:'exact',head:true}).eq('source','website').gte('visited_at',d7.toISOString()),
        api.from('site_visit_events').select('id',{count:'exact',head:true}).eq('source','website').gte('visited_at',d30.toISOString())
      ]);
      const queries=[total,todayQ,weekQ,monthQ];
      if(queries.some(x=>x.error)){
        console.warn('TATNERA Besucherstatistik konnte nicht geladen werden.',...queries.map(x=>x.error).filter(Boolean));
        return;
      }
      const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value??0;};
      set('adminVisitsTotal',total.count);
      set('adminVisitsToday',todayQ.count);
      set('adminVisits7',weekQ.count);
      set('adminVisits30',monthQ.count);
    }finally{busy=false;}
  }

  function bindRefresh(){
    if(bound)return;
    const button=document.getElementById('tatneraAdminRefresh');
    if(!button)return;
    button.addEventListener('click',()=>setTimeout(loadStats,80));
    bound=true;
  }

  document.addEventListener('tatnera:admin-open',()=>{
    ensureCard();
    bindRefresh();
    setTimeout(loadStats,40);
  });
})();
