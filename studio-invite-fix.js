/* TATNERA — artist invitation link flow fix */
(function(){
  'use strict';
  if(window.__tatneraStudioInviteFixInstalled)return;
  window.__tatneraStudioInviteFixInstalled=true;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const auth=()=>window.TatneraAuth||null;
  const client=()=>auth()?.client||null;
  const studioId=()=>auth()?.studioId?.()||'';
  const user=()=>auth()?.user?.()||null;
  const role=()=>auth()?.membership?.()?.role||'';
  const allowed=()=>role()==='owner'?['admin','artist','piercer','artist_piercer','staff']:['artist','piercer','artist_piercer','staff'];

  async function copyText(text,button){
    try{await navigator.clipboard.writeText(text);if(button){const old=button.textContent;button.textContent='Kopiert ✓';setTimeout(()=>button.textContent=old,1400);}}
    catch(_){prompt('Einladungslink kopieren:',text);}
  }

  document.addEventListener('submit',async event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='studioInviteForm')return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const button=form.querySelector('[type="submit"]');
    if(button)button.disabled=true;
    try{
      const c=client(),sid=studioId(),u=user();
      if(!c||!sid||!u)throw new Error('Studio-Zugang ist noch nicht bereit.');
      const data=Object.fromEntries(new FormData(form).entries());
      const email=String(data.email||'').trim().toLowerCase();
      const inviteRole=String(data.role||'');
      if(!email||!email.includes('@'))throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
      if(!allowed().includes(inviteRole))throw new Error('Diese Rolle darfst du nicht vergeben.');

      const {error:deleteError}=await c.from('studio_invites').delete().eq('studio_id',sid).ilike('email',email).is('accepted_at',null);
      if(deleteError)throw deleteError;
      const {data:invite,error}=await c.from('studio_invites').insert({studio_id:sid,email,role:inviteRole,created_by:u.id}).select('id,email,role,token,expires_at').single();
      if(error)throw error;

      const link=new URL('account-setup.html',location.origin+'/');
      link.searchParams.set('invite',invite.token);
      link.searchParams.set('email',invite.email);
      link.searchParams.set('role',invite.role);

      const result=document.getElementById('studioInviteResult');
      if(result){
        result.innerHTML=`<div class="studio-invite-result"><strong>Einladung für ${esc(email)}</strong><div class="studio-invite-link"><input readonly value="${esc(link.toString())}" aria-label="Einladungslink"><button type="button" class="btn ghost" data-copy-invite>Kopieren</button></div><p class="studio-team-note">Diesen Link an den Mitarbeiter schicken. Dort legt er seinen Namen und sein eigenes Passwort fest.</p></div>`;
        const copy=result.querySelector('[data-copy-invite]');
        copy?.addEventListener('click',()=>copyText(link.toString(),copy));
      }
      form.reset();
      try{await window.TatneraTeam?.reload?.();}catch(_){}
    }catch(error){alert(String(error?.message||error));}
    finally{if(button)button.disabled=false;}
  },true);
})();
