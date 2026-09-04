/* TATNERA — studio invitation delivery
   The invitation itself never depends on Supabase's built-in mail service.
   A valid setup link is available immediately; email delivery is best-effort
   until a production SMTP/provider is connected. */
(function(){
  'use strict';

  const PUBLIC_APP_URL='https://smettmann.github.io/tatnera/app.html';
  const DELIVERY_TIMEOUT_MS=6000;
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
    const button=form.querySelector('[type="submit"]');if(button)button.textContent='Einladung erstellen';
    const note=form.nextElementSibling;
    if(note?.classList.contains('studio-team-note'))note.textContent='Der Mitarbeiter öffnet den persönlichen Link und legt direkt E-Mail-Adresse, Namen und Passwort für seinen TATNERA-Zugang fest.';
  }

  async function deliverInvite(inviteId){
    const c=client();if(!c)throw new Error('Studio-Verbindung ist noch nicht bereit.');
    const task=c.functions.invoke('send-studio-invite',{body:{inviteId}});
    const timeout=new Promise(resolve=>setTimeout(()=>resolve({data:{ok:true,mailSent:false,code:'delivery_timeout'},error:null}),DELIVERY_TIMEOUT_MS));
    const {data:delivery,error:mailError}=await Promise.race([task,timeout]);
    if(mailError)throw mailError;
    return delivery||{ok:true,mailSent:false};
  }

  function mailtoUrl(email,url){
    const subject='Deine TATNERA Studio-Einladung';
    const body=`Hallo,\n\ndu wurdest zu TATNERA eingeladen. Öffne diesen persönlichen Link und lege dort direkt deine E-Mail-Adresse und dein Passwort an:\n\n${url}\n\nDanach wirst du automatisch dem Studio zugeordnet und kannst dich künftig normal mit E-Mail und Passwort anmelden.`;
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function showResult(email,setupUrl,mailSent=false,mailInfo=''){
    const root=document.getElementById('studioInviteResult');if(!root)return;
    const title=mailSent?'Einladung gesendet ✓':'Einladungslink bereit ✓';
    const message=mailSent
      ?`Die Einladung wurde an ${email} gesendet. Der Link führt direkt zur Zugangserstellung.`
      :'Der Zugang ist vorbereitet. Der Link führt direkt zu „E-Mail-Adresse + Passwort anlegen“. Der automatische Mailversand ist aktuell noch nicht über einen eigenen Mailanbieter eingerichtet.';
    root.innerHTML=`<div class="studio-invite-result"><strong>${esc(title)}</strong><div class="studio-team-note" style="margin:0 0 10px">${esc(message)}</div><div class="studio-invite-link"><input readonly value="${esc(setupUrl)}" aria-label="Einladungslink"><button type="button" class="btn ghost" data-copy-mail-invite>Kopieren</button></div>${!mailSent?`<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px"><a class="btn primary" style="text-decoration:none;text-align:center" href="${esc(mailtoUrl(email,setupUrl))}">Einladung jetzt per E-Mail senden</a></div>`:''}${mailInfo?`<div class="studio-team-note" style="margin-top:8px">${esc(mailInfo)}</div>`:''}</div>`;

    root.querySelector('[data-copy-mail-invite]')?.addEventListener('click',async event=>{
      try{await navigator.clipboard.writeText(setupUrl);const button=event.currentTarget,old=button.textContent;button.textContent='Kopiert ✓';setTimeout(()=>button.textContent=old,1400);}
      catch(_error){prompt('Einladungslink kopieren:',setupUrl);}
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
    button.disabled=true;button.textContent='Einladung wird erstellt …';
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
      const inviteUrl=new URL(PUBLIC_APP_URL);
      inviteUrl.searchParams.set('invite',invite.token);
      inviteUrl.searchParams.set('email',email);
      const setupUrl=inviteUrl.toString();

      /* Show the working setup link immediately. Mail delivery must never block
         or invalidate the invitation. */
      showResult(email,setupUrl,false);
      form.reset();

      try{
        const delivery=await deliverInvite(invite.id);
        if(delivery?.mailSent===true){
          showResult(email,setupUrl,true);
        }else if(delivery?.code&&delivery.code!=='delivery_timeout'){
          showResult(email,setupUrl,false,'Hinweis: Der integrierte Test-Maildienst von Supabase hat den Versand nicht übernommen.');
        }
      }catch(error){
        console.warn('TATNERA invitation mail delivery unavailable',error);
      }

      await window.TatneraTeam?.reload?.();
      requestAnimationFrame(patchUi);
    }catch(error){alert(String(error?.message||error));}
    finally{button.disabled=false;button.textContent='Einladung erstellen';}
  }

  document.addEventListener('submit',sendInvite,true);
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(patchUi));
  document.addEventListener('tatnera:auth-ready',()=>{[150,500,1200].forEach(delay=>setTimeout(patchUi,delay));});
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="settings"],[data-view-target="settings"]'))setTimeout(patchUi,250);});
  patchUi();
})();
