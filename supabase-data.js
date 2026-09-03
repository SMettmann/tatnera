/* TATNERA — cloud data bridge for customers, tattoo projects and appointments */
(function(){
  'use strict';

  const LOCAL_KEYS=['tatnera_customers','tatnera_projects','tatnera_calendar'];
  const ARCHIVE_KEY='tatnera_archive_v1';
  let client=null,studioId='',userId='',cloudReady=false,syncTimer=null,syncRunning=false,syncAgain=false;
  let rows={customers:new Map(),projects:new Map(),appointments:new Map()};
  const localPersist=typeof persist==='function'?persist:null;

  function clone(value){
    try{return JSON.parse(JSON.stringify(value));}catch(_error){return {};}
  }
  function moneyCents(value){return Math.round((Number(value)||0)*100);}
  function centsMoney(value){return (Number(value)||0)/100;}
  function cleanDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):null;}
  function pad(value){return String(value).padStart(2,'0');}
  function localDate(value){const d=new Date(value);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
  function localTime(value){const d=new Date(value);return `${pad(d.getHours())}:${pad(d.getMinutes())}`;}
  function startsAt(event){
    const [y,m,d]=String(event.date||'').split('-').map(Number),[h,minute]=String(event.start||'00:00').split(':').map(Number);
    const dt=new Date(y||1970,(m||1)-1,d||1,h||0,minute||0,0,0);return dt.toISOString();
  }
  function endsAt(event){const start=new Date(startsAt(event));start.setMinutes(start.getMinutes()+Math.max(1,Number(event.duration)||60));return start.toISOString();}
  function payloadOf(row){return row?.payload&&typeof row.payload==='object'&&!Array.isArray(row.payload)?row.payload:{};}
  function hasSavedLocalData(){return LOCAL_KEYS.some(key=>localStorage.getItem(key)!==null);}
  function importDecisionKey(){return `tatnera_cloud_import_v1_${studioId}`;}

  function installStyle(){
    if(document.getElementById('tatneraCloudStyle'))return;
    const style=document.createElement('style');style.id='tatneraCloudStyle';style.textContent=`
      .tatnera-cloud-loader{position:fixed;inset:0;z-index:99990;display:grid;place-items:center;background:rgba(14,14,18,.94);color:#f5f3fb;font-family:inherit}.tatnera-cloud-loader[hidden]{display:none}.tatnera-cloud-loader>div{padding:18px 22px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:#19191f;font-size:12px;font-weight:800;box-shadow:0 18px 60px rgba(0,0,0,.35)}
      .tatnera-cloud-state{margin-top:6px;font-size:9px;color:var(--muted);text-align:center}.tatnera-cloud-state.error{color:#df8f8f}
    `;document.head.appendChild(style);
  }
  function ensureLoader(){
    let node=document.getElementById('tatneraCloudLoader');if(node)return node;
    node=document.createElement('div');node.id='tatneraCloudLoader';node.className='tatnera-cloud-loader';node.hidden=true;node.innerHTML='<div>Studio-Daten werden geladen …</div>';document.body.appendChild(node);return node;
  }
  function showLoader(show){ensureLoader().hidden=!show;}
  function setCloudState(text,error=false){
    const bottom=document.querySelector('.sidebar-bottom');if(!bottom)return;
    let node=bottom.querySelector('[data-cloud-state]');if(!node){node=document.createElement('div');node.dataset.cloudState='true';node.className='tatnera-cloud-state';bottom.appendChild(node);}
    node.textContent=text||'';node.classList.toggle('error',error);
  }

  function readArchive(){
    try{
      const value=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'null');
      return value&&typeof value==='object'?value:{customers:[],projects:[]};
    }catch(_error){return {customers:[],projects:[]};}
  }
  function archiveLookup(){
    const archive=readArchive(),customers=new Map(),projects=new Map(),appointments=new Map();
    for(const entry of archive.customers||[]){
      if(entry?.customer?.id)customers.set(entry.customer.id,{item:entry.customer,archivedAt:entry.archivedAt});
      for(const project of entry?.projects||[])if(project?.id)projects.set(project.id,{item:project,archivedAt:entry.archivedAt});
      for(const event of entry?.events||[])if(event?.id)appointments.set(event.id,{item:event,archivedAt:entry.archivedAt});
    }
    for(const entry of archive.projects||[]){
      if(entry?.project?.id)projects.set(entry.project.id,{item:entry.project,archivedAt:entry.archivedAt});
      for(const event of entry?.events||[])if(event?.id)appointments.set(event.id,{item:event,archivedAt:entry.archivedAt});
    }
    return {customers,projects,appointments};
  }

  async function loadRows(){
    const selections={
      customers:'id,studio_id,client_id,first_name,last_name,email,phone,street,postal_code,city,date_of_birth,notes,created_by,created_at,updated_at,payload,archived_at',
      projects:'id,studio_id,client_id,customer_id,artist_user_id,title,placement,size,description,status,price_cents,deposit_cents,created_by,created_at,updated_at,payload,archived_at',
      appointments:'id,studio_id,client_id,project_id,customer_id,artist_user_id,appointment_type,status,starts_at,ends_at,notes,created_by,created_at,updated_at,payload,archived_at'
    };
    const [customerResult,projectResult,appointmentResult]=await Promise.all([
      client.from('customers').select(selections.customers).eq('studio_id',studioId),
      client.from('tattoo_projects').select(selections.projects).eq('studio_id',studioId),
      client.from('appointments').select(selections.appointments).eq('studio_id',studioId)
    ]);
    if(customerResult.error)throw customerResult.error;if(projectResult.error)throw projectResult.error;if(appointmentResult.error)throw appointmentResult.error;
    rows.customers=new Map((customerResult.data||[]).map(row=>[row.client_id,row]));
    rows.projects=new Map((projectResult.data||[]).map(row=>[row.client_id,row]));
    rows.appointments=new Map((appointmentResult.data||[]).map(row=>[row.client_id,row]));
  }

  function customerFromRow(row){
    const payload=clone(payloadOf(row));
    return {...payload,id:row.client_id,firstName:row.first_name||'',lastName:row.last_name||'',email:row.email||'',phone:row.phone||'',street:row.street||payload.street||'',postalCode:row.postal_code||payload.postalCode||'',city:row.city||payload.city||'',dateOfBirth:row.date_of_birth||payload.dateOfBirth||'',notes:row.notes||''};
  }
  function projectFromRow(row,customerIds){
    const payload=clone(payloadOf(row));
    return {...payload,id:row.client_id,customerId:customerIds.get(row.customer_id)||payload.customerId||'',title:row.title||'',placement:row.placement||'',size:row.size||'',description:row.description||'',status:row.status||payload.status||'Entwurf',price:centsMoney(row.price_cents),deposit:centsMoney(row.deposit_cents)};
  }
  function appointmentFromRow(row,customerIds,projectIds){
    const payload=clone(payloadOf(row)),start=new Date(row.starts_at),end=new Date(row.ends_at);
    return {...payload,id:row.client_id,date:payload.date||localDate(start),start:payload.start||localTime(start),duration:Number(payload.duration)||Math.max(1,Math.round((end-start)/60000)),customerId:customerIds.get(row.customer_id)||payload.customerId||'',projectId:projectIds.get(row.project_id)||payload.projectId||'',type:row.appointment_type||payload.type||'tattoo',status:row.status||payload.status||'Bestätigt',notes:row.notes||payload.notes||''};
  }

  function hydrateState(){
    const activeCustomers=[...rows.customers.values()].filter(row=>!row.archived_at),customerIds=new Map(activeCustomers.map(row=>[row.id,row.client_id]));
    const activeProjects=[...rows.projects.values()].filter(row=>!row.archived_at),projectIds=new Map(activeProjects.map(row=>[row.id,row.client_id]));
    const activeAppointments=[...rows.appointments.values()].filter(row=>!row.archived_at);
    state.customers=activeCustomers.map(customerFromRow);
    state.projects=activeProjects.map(row=>projectFromRow(row,customerIds));
    state.calendarEvents=activeAppointments.map(row=>appointmentFromRow(row,customerIds,projectIds));
    if(localPersist)localPersist();
    refreshUi();
  }

  function refreshUi(){
    try{if(typeof renderCustomers==='function')renderCustomers(document.getElementById('customerSearch')?.value||'');}catch(_error){}
    try{if(typeof renderProjects==='function')renderProjects();}catch(_error){}
    try{if(typeof updateCustomerSelect==='function')updateCustomerSelect();}catch(_error){}
    try{if(typeof renderAppointments==='function')renderAppointments();}catch(_error){}
    try{if(typeof renderCalendar==='function')renderCalendar();}catch(_error){}
    document.dispatchEvent(new CustomEvent('tatnera:runtime-refresh'));
  }

  function customerDbRow(customer){
    const known=rows.customers.get(customer.id);
    return {studio_id:studioId,client_id:String(customer.id),first_name:String(customer.firstName||''),last_name:String(customer.lastName||''),email:String(customer.email||''),phone:String(customer.phone||''),street:String(customer.street||customer.addressStreet||''),postal_code:String(customer.postalCode||customer.zip||''),city:String(customer.city||''),date_of_birth:cleanDate(customer.dateOfBirth||customer.birthDate),notes:String(customer.notes||''),created_by:known?.created_by||userId,payload:clone(customer),archived_at:null};
  }
  function projectDbRow(project,customerMap){
    const known=rows.projects.get(project.id),customerDbId=customerMap.get(project.customerId);
    if(!customerDbId)throw new Error(`Kunde für Tattoo „${project.title||project.id}“ konnte nicht zugeordnet werden.`);
    return {studio_id:studioId,client_id:String(project.id),customer_id:customerDbId,artist_user_id:known?.artist_user_id||null,title:String(project.title||''),placement:String(project.placement||''),size:String(project.size||''),description:String(project.description||''),status:String(project.status||'Entwurf'),price_cents:moneyCents(project.price),deposit_cents:moneyCents(project.deposit),created_by:known?.created_by||userId,payload:clone(project),archived_at:null};
  }
  function appointmentDbRow(event,customerMap,projectMap){
    const known=rows.appointments.get(event.id);
    return {studio_id:studioId,client_id:String(event.id),project_id:event.projectId?projectMap.get(event.projectId)||null:null,customer_id:event.customerId?customerMap.get(event.customerId)||null:null,artist_user_id:known?.artist_user_id||null,appointment_type:String(event.type||'tattoo'),status:String(event.status||'Bestätigt'),starts_at:startsAt(event),ends_at:endsAt(event),notes:String(event.notes||''),created_by:known?.created_by||userId,payload:clone(event),archived_at:null};
  }

  async function upsertCustomers(){
    const values=(state.customers||[]).map(customerDbRow);if(!values.length)return;
    const {data,error}=await client.from('customers').upsert(values,{onConflict:'studio_id,client_id'}).select('*');if(error)throw error;
    for(const row of data||[])rows.customers.set(row.client_id,row);
  }
  async function upsertProjects(){
    const customerMap=new Map([...rows.customers.values()].map(row=>[row.client_id,row.id]));
    const values=(state.projects||[]).map(project=>projectDbRow(project,customerMap));if(!values.length)return;
    const {data,error}=await client.from('tattoo_projects').upsert(values,{onConflict:'studio_id,client_id'}).select('*');if(error)throw error;
    for(const row of data||[])rows.projects.set(row.client_id,row);
  }
  async function upsertAppointments(){
    const customerMap=new Map([...rows.customers.values()].map(row=>[row.client_id,row.id])),projectMap=new Map([...rows.projects.values()].map(row=>[row.client_id,row.id]));
    const values=(state.calendarEvents||[]).map(event=>appointmentDbRow(event,customerMap,projectMap));if(!values.length)return;
    const {data,error}=await client.from('appointments').upsert(values,{onConflict:'studio_id,client_id'}).select('*');if(error)throw error;
    for(const row of data||[])rows.appointments.set(row.client_id,row);
  }

  async function archiveMissing(table,map,activeIds,archiveMap){
    for(const [clientId,row] of [...map.entries()]){
      if(row.archived_at||activeIds.has(clientId))continue;
      const archived=archiveMap.get(clientId);
      if(archived){
        const archivedAt=archived.archivedAt||new Date().toISOString();
        const {data,error}=await client.from(table).update({archived_at:archivedAt,payload:clone(archived.item)}).eq('id',row.id).select('*').single();if(error)throw error;
        map.set(clientId,data);
      }
    }
  }
  async function deleteMissing(table,map,activeIds,archiveMap){
    for(const [clientId,row] of [...map.entries()]){
      if(row.archived_at||activeIds.has(clientId)||archiveMap.has(clientId))continue;
      const {error}=await client.from(table).delete().eq('id',row.id);if(error)throw error;map.delete(clientId);
    }
  }
  async function reconcileMissing(){
    const archive=archiveLookup(),activeCustomers=new Set((state.customers||[]).map(item=>String(item.id))),activeProjects=new Set((state.projects||[]).map(item=>String(item.id))),activeAppointments=new Set((state.calendarEvents||[]).map(item=>String(item.id)));
    await archiveMissing('appointments',rows.appointments,activeAppointments,archive.appointments);
    await archiveMissing('tattoo_projects',rows.projects,activeProjects,archive.projects);
    await archiveMissing('customers',rows.customers,activeCustomers,archive.customers);
    await deleteMissing('appointments',rows.appointments,activeAppointments,archive.appointments);
    await deleteMissing('tattoo_projects',rows.projects,activeProjects,archive.projects);
    await deleteMissing('customers',rows.customers,activeCustomers,archive.customers);
  }

  async function syncNow(){
    if(!cloudReady||syncRunning)return;
    syncRunning=true;setCloudState('Cloud wird gespeichert …');
    try{
      await upsertCustomers();await upsertProjects();await upsertAppointments();await reconcileMissing();
      setCloudState('Cloud gespeichert');
      document.dispatchEvent(new CustomEvent('tatnera:cloud-saved',{detail:{studioId}}));
    }catch(error){
      console.error('TATNERA cloud sync failed',error);setCloudState('Cloud-Sync fehlgeschlagen',true);
    }finally{
      syncRunning=false;if(syncAgain){syncAgain=false;scheduleSync(50);}
    }
  }
  function scheduleSync(delay=180){
    if(!cloudReady)return;if(syncRunning){syncAgain=true;return;}clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,delay);
  }

  async function bootstrapFromLocal(){
    cloudReady=true;setCloudState('Lokale Daten werden übernommen …');
    await syncNow();
    await loadRows();hydrateState();
  }

  async function onAuthReady(event){
    client=window.TatneraAuth?.client||null;studioId=event.detail?.studioId||window.TatneraAuth?.studioId?.()||'';userId=event.detail?.userId||window.TatneraAuth?.user?.()?.id||'';
    if(!client||!studioId||!userId)return;
    cloudReady=false;showLoader(true);setCloudState('Cloud wird verbunden …');
    try{
      await loadRows();
      const hasCloud=rows.customers.size||rows.projects.size||rows.appointments.size;
      if(!hasCloud&&hasSavedLocalData()){
        let decision=localStorage.getItem(importDecisionKey());
        if(!decision){
          decision=confirm('Auf diesem Browser sind bereits lokale TATNERA-Daten gespeichert.\n\nMöchtest du diese Daten einmalig in dein neues Studio übernehmen?')?'import':'empty';
          localStorage.setItem(importDecisionKey(),decision);
        }
        if(decision==='import'){await bootstrapFromLocal();}
        else{state.customers=[];state.projects=[];state.calendarEvents=[];if(localPersist)localPersist();refreshUi();cloudReady=true;}
      }else{
        hydrateState();cloudReady=true;
      }
      setCloudState('Cloud verbunden');
      document.dispatchEvent(new CustomEvent('tatnera:cloud-ready',{detail:{studioId}}));
    }catch(error){
      console.error('TATNERA cloud load failed',error);setCloudState('Cloud-Verbindung fehlgeschlagen',true);
      alert('Die Studio-Daten konnten nicht aus der Cloud geladen werden. Deine lokale Arbeitskopie bleibt erhalten.');
    }finally{showLoader(false);}
  }

  installStyle();ensureLoader();
  if(localPersist){
    persist=function(){const result=localPersist.apply(this,arguments);scheduleSync();return result;};
  }
  document.addEventListener('tatnera:auth-ready',onAuthReady);
  window.TatneraCloud={sync:()=>scheduleSync(0),isReady:()=>cloudReady,studioId:()=>studioId};
})();
