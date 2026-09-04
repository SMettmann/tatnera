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
    if(note?.classList.contains('studio-team-note'))note.textContent='TATNERA verschickt die Einladung automatisch per E-Mail. Der Empfänger öffnet den Link und legt anschließend sein eigenes Passwort fest.';
  }

  function friendlyMailError(error){
    const code=String(error?.code||'');
    const text=String(error?.message||error||'');
    if(code==='smtp_required'||/not authou?ri[sz]ed/i.test(text))return 'Der Supabase-Testmaildienst darf diese Empfängeradresse nicht anschreiben. Für echte Mitarbeiter muss einmal ein eigener SMTP-Mailversand eingerichtet werden.';
    if(code==='mail_rate_limited'||/rate limit/i.test(text))return 'Zu viele Einladungsmails in kurzer Zeit. Bitte etwa 60 Sekunden warten und dann auf „Erneut senden“ drücken.';
    if(code==='invalid_email'||(/email/i.test(text)&&/invalid/i.test(text)))return 'Die E-Mail-Adresse wurde vom Maildienst abgelehnt. Bitte die Adresse prüfen.';
    if(/session|jwt|unauth|401/i.test(text))return 'Die Anmeldung für den Mailversand ist abgelaufen. Bitte die Seite einmal neu laden und danach erneut senden.';
    return 'Der automatische Mailversand ist fehlgeschlagen. Du kannst den Versand direkt erneut versuchen.';
  }

  async function deliverInvite(inviteId){
    const c=client();if(!c)throw new Error('Studio-Verbindung ist noch nicht bereit.');
    const {data:delivery,error:mailError}=await c.functions.invoke('send-studio-invite',{body:{inviteId}});
    if(mailError)throw mailError;
    if(delivery?.ok!==true){
      const error=new Error(delivery?.error||'Maildienst hat den Versand nicht bestätigt.');
      error.code=delivery?.code||'mail_send_failed';
      throw error;
    }
    return delivery;
  }

  function showResult(email,url,mailSent,mailMessage='',inviteId=''){
    const root=document.getElementById('studioInviteResult');if(!root)return;
    root.innerHTML=`<div class="studio-invite-result"><strong>${mailSent?'Einladung per E-Mail gesendet ✓':'E-Mail konnte noch nicht gesendet werden'}</strong><div class="studio-team-note" data-invite-mail-message style="margin:0 0 8px">${esc(mailSent?`Die Einladung wurde an ${email} geschickt.`:(mailMessage||'Bitte erneut senden.'))}</div>${mailSent||!inviteId?'':`<button type="button" class="btn primary" style="margin:0 0 9px;width:100%" data-resend-studio-invite>Erneut senden</button>`}<div class="studio-invite-link"><input readonly value="${esc(url)}" aria-label="Einladungslink"><button type="button" class="btn ghost" data-copy-mail-invite>Kopieren</button></div></div>`;
    root.querySelector('[data-copy-mail-invite]')?.addEventListener('click',async event=>{
      try{await navigator.clipboard.writeText(url);const button=event.currentTarget,old=button.textContent;button.textContent='Kopiert ✓';setTimeout(()=>button.textContent=old,1400);}
      catch(_error){prompt('Einladungslink kopieren:',url);}
    });
    root.querySelector('[data-resend-studio-invite]')?.addEventListener('click',async event=>{
      const button=event.currentTarget,message=root.querySelector('[data-invite-mail-message]');
      button.disabled=true;button.textContent='Wird gesendet …';if(message)message.textContent='Einladung wird erneut versendet …';
      try{await deliverInvite(inviteId);showResult(email,url,true,'',inviteId);}
      catch(error){console.error('TATNERA invitation retry failed',error);if(message)message.textContent=friendlyMailError(error);button.disabled=false;button.textContent='Erneut senden';}
    });
  }

  async function getOrCreateInvite(c,sid,user,email,role){
    const {data:openInvites,error:lookupError}=await c.from('studio_invites')
      .select('id,email,role,token,expires_at')
      .eq('studio_id',sid).ilike('email',email).is('accepted_at',null)
      .gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1);
    if(lookupError)throw lookupError;

    let invite=(openInvites||[])[0]||null;
    if(invite){
      if(invite.role!==role){
        const {data:updated,error:updateError}=await c.from('studio_invites').update({role}).eq('id',invite.id).select('id,email,role,token,expires_at').single();
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

      const invite=await getOrCreateInvite(c,sid,user,email,role);
      const inviteUrl=new URL(PUBLIC_APP_URL);inviteUrl.searchParams.set('invite',invite.token);
      let mailSent=false,mailMessage='';
      try{await deliverInvite(invite.id);mailSent=true;}
      catch(error){console.error('TATNERA invitation email failed',error);mailMessage=friendlyMailError(error);}

      form.reset();showResult(email,inviteUrl.toString(),mailSent,mailMessage,invite.id);
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
