/* TATNERA — automatic studio invitation email delivery */
(function(){
  'use strict';

  const PUBLIC_APP_URL='https://smettmann.github.io/tatnera/app.html';
  const auth=()=>window.TatneraAuth||null;
  const client=()=>auth()?.client||null;
  const studioId=()=>auth()?.studioId?.()||'';
  const currentUser=()=>auth()?.user?.()||null;
  const currentRole=()=>window.TatneraTeam?.role?.()||auth()?.membership?.()?.role||'';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function allowedRoles(){
    return currentRole()==='owner'
      ?['admin','artist','piercer','artist_piercer','staff']
      :currentRole()==='admin'
        ?['artist','piercer','artist_piercer','staff']
        :[];
  }

  function patchUi(){
    const form=document.getElementById('studioInviteForm');if(!form)return;
    const button=form.querySelector('[type="submit"]');if(button)button.textContent='Einladung senden';
    const note=form.nextElementSibling;
    if(note?.classList.contains('studio-team-note'))note.textContent='TATNERA verschickt die Einladung per E-Mail. Der Link führt immer zur veröffentlichten App und bleibt 7 Tage gültig.';
  }

  function showResult(email,url,mailSent,mailMessage=''){
    const root=document.getElementById('studioInviteResult');if(!root)return;
    root.innerHTML=`<div class="studio-invite-result"><strong>${mailSent?'Einladung per E-Mail gesendet ✓':'Einladung erstellt – E-Mail nicht versendet'}</strong><div class="studio-team-note" style="margin:0 0 8px">${esc(mailSent?`Die Einladung wurde an ${email} geschickt.`:(mailMessage||'Bitte den Link unten manuell senden.'))}</div><div class="studio-invite-link"><input readonly value="${esc(url)}" aria-label="Einladungslink"><button type="button" class="btn ghost" data-copy-mail-invite>Kopieren</button></div></div>`;
    root.querySelector('[data-copy-mail-invite]')?.addEventListener('click',async event=>{
      try{await navigator.clipboard.writeText(url);const button=event.currentTarget,old=button.textContent;button.textContent='Kopiert ✓';setTimeout(()=>button.textContent=old,1400);}
      catch(_error){prompt('Einladungslink kopieren:',url);}
    });
  }

  async function sendInvite(event){
    const form=event.target;if(!(form instanceof HTMLFormElement)||form.id!=='studioInviteForm')return;
    event.preventDefault();event.stopImmediatePropagation();
    const c=client(),sid=studioId(),user=currentUser(),button=form.querySelector('[type="submit"]');
    if(!c||!sid||!user){alert('Studio-Verbindung ist noch nicht bereit. Bitte die Seite kurz neu laden.');return;}
    button.disabled=true;button.textContent='Einladung wird gesendet …';
    try{
      const data=Object.fromEntries(new FormData(form).entries()),email=String(data.email||'').trim().toLowerCase(),role=String(data.role||'');
      if(!email)throw new Error('Bitte eine E-Mail-Adresse eingeben.');
      if(!allowedRoles().includes(role))throw new Error('Diese Rolle darfst du nicht vergeben.');

      const {data:existingProfiles,error:profileError}=await c.from('profiles').select('id,email').ilike('email',email);
      if(profileError)throw profileError;
      if((existingProfiles||[]).length){
        const userIds=(existingProfiles||[]).map(item=>item.id);
        const {data:existingMembers,error:memberError}=await c.from('studio_members').select('id,user_id').eq('studio_id',sid).in('user_id',userIds);
        if(memberError)throw memberError;
        if((existingMembers||[]).length)throw new Error('Diese E-Mail-Adresse gehört bereits zum Studio-Team.');
      }

      const {error:deleteError}=await c.from('studio_invites').delete().eq('studio_id',sid).ilike('email',email).is('accepted_at',null);
      if(deleteError)throw deleteError;
      const {data:invite,error:inviteError}=await c.from('studio_invites').insert({studio_id:sid,email,role,created_by:user.id}).select('id,email,role,token,expires_at').single();
      if(inviteError)throw inviteError;

      const inviteUrl=new URL(PUBLIC_APP_URL);inviteUrl.searchParams.set('invite',invite.token);
      let mailSent=false,mailMessage='';
      try{
        const {data:delivery,error:mailError}=await c.functions.invoke('send-studio-invite',{body:{inviteId:invite.id,redirectTo:inviteUrl.toString()}});
        if(mailError)throw mailError;
        if(delivery?.error)throw new Error(delivery.error);
        mailSent=delivery?.ok===true;
      }catch(error){
        console.error('TATNERA invitation email failed',error);
        mailMessage='Der automatische Mailversand ist fehlgeschlagen. Der Einladungslink wurde trotzdem erstellt und kann manuell verschickt werden.';
      }

      form.reset();showResult(email,inviteUrl.toString(),mailSent,mailMessage);
      await window.TatneraTeam?.reload?.();
      requestAnimationFrame(patchUi);
    }catch(error){alert(String(error?.message||error));}
    finally{button.disabled=false;button.textContent='Einladung senden';}
  }

  document.addEventListener('submit',sendInvite,true);
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(patchUi));
  document.addEventListener('tatnera:auth-ready',()=>{[150,500,1200].forEach(delay=>setTimeout(patchUi,delay));});
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="settings"],[data-view-target="settings"]'))setTimeout(patchUi,250);});
  patchUi();
})();
