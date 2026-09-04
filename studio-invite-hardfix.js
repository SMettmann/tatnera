/* TATNERA — hard fix for studio invitation flow */
(function(){
  'use strict';

  const PUBLIC_APP_URL='https://smettmann.github.io/tatnera/app.html';
  const FORM_NOTE='TATNERA sendet die Einladung automatisch. Falls der Test-Maildienst blockiert, wird sofort ein sicherer Zugangslink bereitgestellt.';
  const auth=()=>window.TatneraAuth||null;
  const client=()=>auth()?.client||null;
  const studioId=()=>auth()?.studioId?.()||'';
  const currentUser=()=>auth()?.user?.()||null;
  const currentRole=()=>window.TatneraTeam?.role?.()||auth()?.membership?.()?.role||'';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let busy=false;

  function allowedRoles(){
    return currentRole()==='owner'
      ?['admin','artist','piercer','artist_piercer','staff']
      :currentRole()==='admin'
        ?['artist','piercer','artist_piercer','staff']
        :[];
  }

  function patchForm(){
    const form=document.getElementById('studioInviteForm');
    if(!form)return;
    const button=form.querySelector('[type="submit"]');
    if(button&&!button.disabled&&button.textContent!=='Einladung senden')button.textContent='Einladung senden';
    const note=form.nextElementSibling;
    if(note?.classList.contains('studio-team-note')&&note.textContent!==FORM_NOTE)note.textContent=FORM_NOTE;
  }

  async function getOrCreateInvite(c,sid,user,email,role){
    const {data:open,error:lookupError}=await c.from('studio_invites')
      .select('id,email,role,token,expires_at')
      .eq('studio_id',sid).ilike('email',email).is('accepted_at',null)
      .gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1);
    if(lookupError)throw lookupError;
    let invite=(open||[])[0]||null;
    if(invite){
      if(invite.role!==role){
        const {data:updated,error:updateError}=await c.from('studio_invites')
          .update({role}).eq('id',invite.id)
          .select('id,email,role,token,expires_at').single();
        if(updateError)throw updateError;
        invite=updated;
      }
      return invite;
    }
    const {data:created,error:createError}=await c.from('studio_invites')
      .insert({studio_id:sid,email,role,created_by:user.id})
      .select('id,email,role,token,expires_at').single();
    if(createError)throw createError;
    return created;
  }

  async function deliver(inviteId){
    const c=client();
    if(!c)throw new Error('Studio-Verbindung ist noch nicht bereit.');
    const {data,error}=await c.functions.invoke('send-studio-invite',{body:{inviteId}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||data?.manualLinkError||'Einladungsdienst konnte keinen Zugang erzeugen.');
    return data;
  }

  function mailto(email,url){
    const subject='Deine TATNERA Studio-Einladung';
    const body=`Hallo,\n\ndu wurdest zu TATNERA eingeladen. Öffne diesen persönlichen Link und richte deinen Zugang ein:\n\n${url}\n\nViele Grüße`;
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function renderResult(email,inviteId,baseUrl,delivery){
    const root=document.getElementById('studioInviteResult');
    if(!root)return;
    const mailSent=delivery?.mailSent===true;
    const secureUrl=String(delivery?.manualLink||'')||baseUrl;
    const fallback=!mailSent&&secureUrl!==baseUrl;
    const title=mailSent?'Einladung per E-Mail gesendet ✓':fallback?'Einladung bereit ✓':'Einladung erstellt ✓';
    const message=mailSent
      ?`Die Einladung wurde an ${email} gesendet.`
      :fallback
        ?'Der Test-Maildienst ist gerade limitiert. Der sichere Zugangslink ist trotzdem vollständig gültig und kann sofort verschickt werden.'
        :'Die Einladung ist erstellt. Der Zugangslink kann sofort verschickt werden.';

    root.innerHTML=`<div class="studio-invite-result"><strong>${esc(title)}</strong><div class="studio-team-note" style="margin:0 0 10px">${esc(message)}</div><div class="studio-invite-link"><input readonly value="${esc(secureUrl)}" aria-label="Einladungslink"><button type="button" class="btn ghost" data-hardfix-copy>Kopieren</button></div>${!mailSent?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><a class="btn ghost" style="text-decoration:none;text-align:center" href="${esc(mailto(email,secureUrl))}">In E-Mail öffnen</a><button type="button" class="btn primary" data-hardfix-retry>Versand erneut versuchen</button></div>`:''}</div>`;

    root.querySelector('[data-hardfix-copy]')?.addEventListener('click',async event=>{
      try{await navigator.clipboard.writeText(secureUrl);const b=event.currentTarget,old=b.textContent;b.textContent='Kopiert ✓';setTimeout(()=>b.textContent=old,1200);}
      catch(_){prompt('Einladungslink kopieren:',secureUrl);}
    });

    root.querySelector('[data-hardfix-retry]')?.addEventListener('click',async event=>{
      const b=event.currentTarget;b.disabled=true;b.textContent='Wird gesendet …';
      try{const next=await deliver(inviteId);renderResult(email,inviteId,baseUrl,next);}
      catch(error){alert(String(error?.message||error));b.disabled=false;b.textContent='Versand erneut versuchen';}
    });
  }

  async function handleSubmit(event){
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='studioInviteForm')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(busy)return;
    busy=true;
    const button=form.querySelector('[type="submit"]');
    if(button){button.disabled=true;button.textContent='Einladung wird vorbereitet …';}
    try{
      const c=client(),sid=studioId(),user=currentUser();
      if(!c||!sid||!user)throw new Error('Studio-Verbindung ist noch nicht bereit. Bitte die Seite neu laden.');
      const data=Object.fromEntries(new FormData(form).entries());
      const email=String(data.email||'').trim().toLowerCase();
      const role=String(data.role||'');
      if(!email)throw new Error('Bitte eine E-Mail-Adresse eingeben.');
      if(!allowedRoles().includes(role))throw new Error('Diese Rolle darfst du nicht vergeben.');

      const {data:profiles,error:profileError}=await c.from('profiles').select('id,email').ilike('email',email);
      if(profileError)throw profileError;
      if((profiles||[]).length){
        const ids=profiles.map(item=>item.id);
        const {data:members,error:memberError}=await c.from('studio_members').select('id,user_id').eq('studio_id',sid).in('user_id',ids);
        if(memberError)throw memberError;
        if((members||[]).length)throw new Error('Diese E-Mail-Adresse gehört bereits zum Studio-Team.');
      }

      const invite=await getOrCreateInvite(c,sid,user,email,role);
      const base=new URL(PUBLIC_APP_URL);base.searchParams.set('invite',invite.token);
      let delivery;
      try{delivery=await deliver(invite.id);}
      catch(error){
        console.error('TATNERA invite delivery hardfix',error);
        delivery={ok:true,mailSent:false,manualLink:'',error:String(error?.message||error)};
      }

      try{await window.TatneraTeam?.reload?.();}catch(_){ }
      setTimeout(()=>{
        patchForm();
        renderResult(email,invite.id,base.toString(),delivery);
      },50);
    }catch(error){
      alert(String(error?.message||error));
    }finally{
      busy=false;
      const current=document.querySelector('#studioInviteForm [type="submit"]');
      if(current){current.disabled=false;current.textContent='Einladung senden';}
    }
  }

  document.addEventListener('submit',handleSubmit,true);
  document.addEventListener('tatnera:auth-ready',()=>{setTimeout(patchForm,100);setTimeout(patchForm,600);});
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(patchForm,50));
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="settings"],[data-view-target="settings"]'))setTimeout(patchForm,250);});
  setTimeout(patchForm,0);
  setTimeout(patchForm,800);
})();
