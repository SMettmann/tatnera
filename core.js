/* TATNERA — central runtime core
   Shared project identity, artist registry and date helpers.
   Keep this file dependency-light: it is loaded directly after app.js. */
(function(){
  'use strict';

  const ARTIST_KEY='tatnera_artists';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function updateTopbarDate(){
    const label=document.querySelector('.topbar .eyebrow');if(!label)return;
    const text=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
    label.textContent=text.charAt(0).toUpperCase()+text.slice(1);
  }

  function uniqueNames(){
    const names=[];
    const add=value=>{const name=String(value||'').trim();if(name&&!names.some(item=>item.toLowerCase()===name.toLowerCase()))names.push(name);};
    (state.projects||[]).forEach(item=>add(item.artist));
    (state.calendarEvents||[]).forEach(item=>add(item.artist));
    (state.requests||[]).forEach(item=>add(item.artist));
    return names;
  }

  function slug(value){return String(value||'artist').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'artist';}

  function loadArtists(){
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem(ARTIST_KEY)||'null');}catch(_error){}
    const list=Array.isArray(saved)?saved.filter(item=>item&&String(item.name||'').trim()).map(item=>({id:String(item.id||('artist-'+Date.now()+Math.random().toString(36).slice(2,7))),name:String(item.name).trim(),active:item.active!==false})):[];
    uniqueNames().forEach(name=>{if(!list.some(item=>item.name.toLowerCase()===name.toLowerCase()))list.push({id:'artist-'+slug(name),name,active:true});});
    if(!list.length)list.push({id:'artist-default',name:'Studio Artist',active:true});
    localStorage.setItem(ARTIST_KEY,JSON.stringify(list));
    return list;
  }

  state.artists=loadArtists();

  function saveArtists(){localStorage.setItem(ARTIST_KEY,JSON.stringify(state.artists||[]));document.dispatchEvent(new CustomEvent('tatnera:artists-changed',{detail:{artists:getArtists(false)}}));}
  function getArtists(activeOnly=true){const list=Array.isArray(state.artists)?state.artists:[];return (activeOnly?list.filter(item=>item.active!==false):list).map(item=>({...item}));}
  function artistNameFallback(){return getArtists(true)[0]?.name||getArtists(false)[0]?.name||'Studio Artist';}

  function populateArtistSelect(select,selected=''){
    if(!select)return;
    const current=String(selected||select.value||'').trim(),artists=getArtists(true);
    if(current&&!artists.some(item=>item.name===current))artists.push({id:'legacy',name:current,active:true});
    select.innerHTML=artists.map(item=>`<option value="${esc(item.name)}">${esc(item.name)}</option>`).join('');
    select.value=current&&artists.some(item=>item.name===current)?current:artistNameFallback();
  }

  function addArtist(name){const clean=String(name||'').trim();if(!clean)return null;let existing=(state.artists||[]).find(item=>item.name.toLowerCase()===clean.toLowerCase());if(existing){existing.active=true;saveArtists();return existing;}const artist={id:'artist-'+Date.now(),name:clean,active:true};state.artists.push(artist);saveArtists();return artist;}
  function setArtistActive(id,active){const artist=(state.artists||[]).find(item=>item.id===id);if(!artist)return false;artist.active=Boolean(active);saveArtists();return true;}
  function renameArtist(id,name){
    const artist=(state.artists||[]).find(item=>item.id===id),clean=String(name||'').trim();if(!artist||!clean)return false;
    const old=artist.name;artist.name=clean;
    (state.projects||[]).forEach(item=>{if(item.artist===old)item.artist=clean;});
    (state.calendarEvents||[]).forEach(item=>{if(item.artist===old)item.artist=clean;});
    (state.requests||[]).forEach(item=>{if(item.artist===old)item.artist=clean;});
    try{persist();}catch(_error){}
    if(Array.isArray(state.requests))localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));
    saveArtists();return true;
  }

  function projectIdFromDetail(){return document.getElementById('projectDetail')?.dataset.projectId||'';}
  function getProject(id){return (state.projects||[]).find(item=>item.id===id)||null;}
  function currentProject(){return getProject(projectIdFromDetail());}
  function getCustomer(id){return (state.customers||[]).find(item=>item.id===id)||null;}

  function completedTattooEvents(projectId){
    const today=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
    return (state.calendarEvents||[]).filter(event=>event.projectId===projectId&&event.type==='tattoo'&&event.date<=today).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start||'').localeCompare(String(b.start||'')));
  }
  function lastCompletedTattooDate(projectId){return completedTattooEvents(projectId).at(-1)?.date||'';}

  function activateProjectTab(name,{emit=true}={}){
    const detail=document.getElementById('projectDetail');if(!detail||!name)return false;let found=false;
    detail.querySelectorAll('[data-project-tab]').forEach(button=>{const active=button.dataset.projectTab===name;found=found||active;button.classList.toggle('active',active);button.setAttribute('aria-selected',active?'true':'false');button.type='button';});
    detail.querySelectorAll('[data-project-pane]').forEach(pane=>{const active=pane.dataset.projectPane===name;pane.classList.toggle('active',active);pane.hidden=!active;});
    if(found&&emit)document.dispatchEvent(new CustomEvent('tatnera:project-tab',{detail:{projectId:projectIdFromDetail(),tab:name}}));
    return found;
  }

  window.TatneraCore={esc,getArtists,saveArtists,addArtist,setArtistActive,renameArtist,artistNameFallback,populateArtistSelect,projectIdFromDetail,getProject,currentProject,getCustomer,completedTattooEvents,lastCompletedTattooDate,activateProjectTab,updateTopbarDate};
  updateTopbarDate();
})();
