/* TATNERA — studio team, invitation links and role management */
(function(){
  'use strict';

  const PENDING_INVITE_KEY='tatnera_pending_studio_invite_v1';
  const Core=window.TatneraCore;
  let members=[],profiles=new Map(),invites=[],loading=false,acceptingInvite=false;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const roleLabel=role=>({
    owner:'Inhaber',
    admin:'Admin',
    artist:'Tätowierer',
    piercer:'Piercer',
    artist_piercer:'Tätowierer & Piercer',
    staff:'Mitarbeiter'
  })[role]||role||'—';
  const roleDescription=role=>({
    owner:'Voller Studio-Zugriff',
    admin:'Studio verwalten',
    artist:'Tattoo-Arbeit & Termine',
    piercer:'Piercing-Arbeit & Termine',
    artist_piercer:'Tattoo- & Piercing-Arbeit',
    staff:'Organisation & Termine'
  })[role]||'';
  const auth=()=>window.TatneraAuth||null;
  const client=()=>auth()?.client||null;
  const studioId=()=>auth()?.studioId?.()||'';
  const currentMembership=()=>auth()?.membership?.()||null;
  const currentUser=()=>auth()?.user?.()||null;
  const canManage=()=>['owner','admin'].includes(currentMembership()?.role||'');
  const isOwner=()=>currentMembership()?.role==='owner';

  function installStyle(){
    if(document.getElementById('studioTeamStyle'))return;
    const style=document.createElement('style');style.id='studioTeamStyle';style.textContent=`
      .studio-team-panel{margin-top:18px}.studio-team-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.studio-team-head h3{margin:3px 0 5px}.studio-team-head p{margin:0;color:var(--muted);font-size:10px;line-height:1.5}
      .studio-team-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:14px;margin-top:16px}.studio-team-box{border:1px solid var(--line);border-radius:13px;background:var(--panel-2);padding:14px}.studio-team-box h4{margin:0 0 10px;font-size:13px}
      .studio-team-list{display:flex;flex-direction:column;gap:8px}.studio-team-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--panel)}.studio-team-main{display:flex;align-items:center;gap:10px;min-width:0}.studio-team-avatar{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;border-radius:11px;background:var(--panel-2);border:1px solid var(--line);font-size:11px;font-weight:900}.studio-team-main strong,.studio-team-main span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.studio-team-main strong{font-size:12px}.studio-team-main span{margin-top:2px;color:var(--muted);font-size:9px}.studio-team-actions{display:flex;align-items:center;gap:7px}.studio-team-actions select{min-height:34px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);color:var(--text);padding:0 8px;font:inherit;font-size:10px}.studio-team-remove{border-color:#713636!important;color:#de9b9b!important}
      .studio-team-form{display:flex;flex-direction:column;gap:9px}.studio-team-form label{display:flex;flex-direction:column;gap:6px;color:var(--muted);font-size:10px;font-weight:700}.studio-team-form input,.studio-team-form select{width:100%;min-height:40px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);padding:0 10px;font:inherit;font-size:12px}.studio-team-form .btn{width:100%}.studio-team-note{margin:9px 0 0;color:var(--muted);font-size:9px;line-height:1.45}
      .studio-invite-result{margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel);font-size:10px}.studio-invite-result strong{display:block;margin-bottom:6px}.studio-invite-link{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.studio-invite-link input{min-width:0;width:100%;min-height:34px;border:1px solid var(--line);border-radius:8px;background:var(--panel-2);color:var(--muted);padding:0 8px;font:inherit;font-size:9px}
      .studio-pending{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.studio-pending h5{margin:0 0 8px;font-size:11px}.studio-pending-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}.studio-pending-row:last-child{border-bottom:0}.studio-pending-row strong,.studio-pending-row span{display:block}.studio-pending-row strong{font-size:10px}.studio-pending-row span{font-size:9px;color:var(--muted);margin-top:2px}.studio-team-empty{padding:12px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:10px;text-align:center}
      @media(max-width:820px){.studio-team-grid{grid-template-columns:1fr}.studio-team-row{grid-template-columns:1fr}.studio-team-actions{justify-content:flex-start;flex-wrap:wrap}}
    `;document.head.appendChild(style);
  }

  function initials(name){
    const parts=String(name||'').trim().split(/\s+/).filter(Boolean);if(!parts.length)return 'ST';
    return (parts.length===1?parts[0].slice(0,2):(parts[0][0]||'')+(parts.at(-1)?.[0]||'')).toUpperCase();
  }
  function profileFor(userId){return profiles.get(userId)||{};}
  function displayName(member){const profile=profileFor(member.user_id);return String(profile.display_name||profile.email||'Teammitglied').trim();}
  function displayMeta(member){const profile=profileFor(member.user_id);return `${profile.email||'Keine E-Mail'} · ${roleLabel(member.role)}`;}
  function allowedInviteRoles(){
    return isOwner()
      ?['admin','artist','piercer','artist_piercer','staff']
      :['artist','piercer','artist_piercer','staff'];
  }
  function allowedEditRoles(member){
    if(member.role==='owner')return ['owner'];
    return isOwner()
      ?['admin','artist','piercer','artist_piercer','staff']
      :['artist','piercer','artist_piercer','staff'];
  }

  async function loadTeam(){
    if(loading||!client()||!studioId())return;loading=true;
    try{
      const {data:memberRows,error:memberError}=await client().from('studio_members').select('id,studio_id,user_id,role,is_active,created_at').eq('studio_id',studioId()).order('created_at',{ascending:true});
      if(memberError)throw memberError;members=memberRows||[];
      const ids=members.map(item=>item.user_id).filter(Boolean);
      profiles=new Map();
      if(ids.length){
        const {data:profileRows,error:profileError}=await client().from('profiles').select('id,email,display_name').in('id',ids);
        if(profileError)throw profileError;for(const item of profileRows||[])profiles.set(item.id,item);
      }
      invites=[];
      if(canManage()){
        const {data:inviteRows,error:inviteError}=await client().from('studio_invites').select('id,email,role,token,expires_at,created_at').eq('studio_id',studioId()).is('accepted_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false});
        if(inviteError)throw inviteError;invites=inviteRows||[];
      }
      syncArtists();renderTeam();
    }catch(error){console.error('TATNERA team load failed',error);renderTeam(String(error?.message||error));}
    finally{loading=false;}
  }

  function syncArtists(){
    if(!Core)return;
    for(const member of members){
      if(!member.is_active||!['owner','artist','artist_piercer'].includes(member.role))continue;
      const name=String(profileFor(member.user_id).display_name||'').trim();if(name)Core.addArtist(name);
    }
    refreshArtistSelects();
  }
  function refreshArtistSelects(){
    if(!Core)return;
    const selectors=['#appointmentForm select[name="artist"]','#projectEditForm select[name="artist"]'];
    selectors.forEach(selector=>{const select=document.querySelector(selector);if(select)Core.populateArtistSelect(select,select.value||Core.artistNameFallback());});
  }

  function memberRow(member){
    const name=displayName(member),mine=member.user_id===currentUser()?.id,roles=allowedEditRoles(member),editable=canManage()&&member.role!=='owner'&&(!(!isOwner()&&member.role==='admin'));
    return `<div class="studio-team-row" data-team-member="${esc(member.id)}"><div class="studio-team-main"><div class="studio-team-avatar">${esc(initials(name))}</div><div><strong>${esc(name)}${mine?' · Du':''}</strong><span>${esc(displayMeta(member))}</span></div></div><div class="studio-team-actions">${editable?`<select data-team-role="${esc(member.id)}">${roles.map(role=>`<option value="${esc(role)}" ${role===member.role?'selected':''}>${esc(roleLabel(role))}</option>`).join('')}</select><button type="button" class="btn ghost studio-team-remove" data-team-remove="${esc(member.id)}">Zugang entfernen</button>`:`<span class="status-pill">${esc(roleLabel(member.role))}</span>`}</div></div>`;
  }

  function inviteOptions(){return allowedInviteRoles().map(role=>`<option value="${esc(role)}">${esc(roleLabel(role))}</option>`).join('');}
  function pendingRows(){
    if(!invites.length)return '<div class="studio-team-empty">Keine offenen Einladungen.</div>';
    return invites.map(item=>`<div class="studio-pending-row"><div><strong>${esc(item.email)}</strong><span>${esc(roleLabel(item.role))} · gültig bis ${esc(new Intl.DateTimeFormat('de-DE',{dateStyle:'medium'}).format(new Date(item.expires_at)))}</span></div><button type="button" class="btn ghost" data-invite-cancel="${esc(item.id)}">Entfernen</button></div>`).join('');
  }

  function renderTeam(error=''){
    const settings=document.getElementById('settings');if(!settings)return;
    let panel=document.getElementById('studioTeamPanel');if(!panel){panel=document.createElement('section');panel.id='studioTeamPanel';panel.className='theme-settings-panel studio-team-panel';const anchor=document.getElementById('studioSettingsPanel');anchor?.insertAdjacentElement('afterend',panel)||settings.appendChild(panel);}
    panel.innerHTML=`<div class="studio-team-head"><div><span class="eyebrow">Team</span><h3>Studio-Mitarbeiter</h3><p>Jeder bekommt einen eigenen TATNERA-Login. Rollen und Studio-Zugriff werden zentral verwaltet.</p></div><span class="status-pill">${esc(roleLabel(currentMembership()?.role))}</span></div>${error?`<p class="studio-team-note" style="color:#d99">Team konnte nicht geladen werden: ${esc(error)}</p>`:''}<div class="studio-team-grid"><section class="studio-team-box"><h4>Aktive Benutzer</h4><div class="studio-team-list">${members.length?members.map(memberRow).join(''):'<div class="studio-team-empty">Noch keine Teammitglieder geladen.</div>'}</div></section><section class="studio-team-box">${canManage()?`<h4>Mitarbeiter einladen</h4><form class="studio-team-form" id="studioInviteForm"><label>E-Mail-Adresse<input required type="email" name="email" placeholder="artist@studio.de" autocomplete="email"></label><label>Rolle<select name="role">${inviteOptions()}</select></label><button type="submit" class="btn primary">Einladungslink erstellen</button></form><p class="studio-team-note">Der Link ist 7 Tage gültig und funktioniert nur mit der angegebenen E-Mail-Adresse.</p><div id="studioInviteResult"></div><div class="studio-pending"><h5>Offene Einladungen</h5>${pendingRows()}</div>`:`<h4>Dein Zugang</h4><p class="studio-team-note">Du bist als <strong>${esc(roleLabel(currentMembership()?.role))}</strong> in diesem Studio angemeldet. Einladungen und Rollen verwalten Inhaber oder Admins.</p>`}</section></div>`;
    bindPanel(panel);
  }

  function bindPanel(panel){
    panel.querySelector('#studioInviteForm')?.addEventListener('submit',createInvite);
    panel.querySelectorAll('[data-team-role]').forEach(select=>select.addEventListener('change',changeRole));
    panel.querySelectorAll('[data-team-remove]').forEach(button=>button.addEventListener('click',removeMember));
    panel.querySelectorAll('[data-invite-cancel]').forEach(button=>button.addEventListener('click',cancelInvite));
  }

  async function createInvite(event){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]');button.disabled=true;
    try{
      const data=Object.fromEntries(new FormData(form).entries()),email=String(data.email||'').trim().toLowerCase(),role=String(data.role||'');
      if(!email)throw new Error('Bitte eine E-Mail-Adresse eingeben.');if(!allowedInviteRoles().includes(role))throw new Error('Diese Rolle darfst du nicht vergeben.');
      const existingMember=[...profiles.entries()].find(([,profile])=>String(profile.email||'').toLowerCase()===email);
      if(existingMember)throw new Error('Diese E-Mail-Adresse gehört bereits zum Studio-Team.');
      const {error:deleteError}=await client().from('studio_invites').delete().eq('studio_id',studioId()).ilike('email',email).is('accepted_at',null);if(deleteError)throw deleteError;
      const {data:invite,error}=await client().from('studio_invites').insert({studio_id:studioId(),email,role,created_by:currentUser().id}).select('id,email,role,token,expires_at').single();if(error)throw error;
      const url=new URL(location.origin+location.pathname);url.searchParams.set('invite',invite.token);
      const result=document.getElementById('studioInviteResult');if(result)result.innerHTML=`<div class="studio-invite-result"><strong>Einladung für ${esc(email)}</strong><div class="studio-invite-link"><input readonly value="${esc(url.toString())}" aria-label="Einladungslink"><button type="button" class="btn ghost" data-copy-invite>Kopieren</button></div></div>`;
      result?.querySelector('[data-copy-invite]')?.addEventListener('click',()=>copyText(url.toString(),result.querySelector('[data-copy-invite]')));
      form.reset();await loadTeam();
    }catch(error){alert(String(error?.message||error));}
    finally{button.disabled=false;}
  }

  async function copyText(text,button){
    try{await navigator.clipboard.writeText(text);if(button){const old=button.textContent;button.textContent='Kopiert ✓';setTimeout(()=>button.textContent=old,1400);}}
    catch(_error){prompt('Einladungslink kopieren:',text);}
  }

  async function changeRole(event){
    const select=event.currentTarget,id=select.dataset.teamRole,next=select.value,member=members.find(item=>item.id===id);if(!member)return;
    if(!confirm(`${displayName(member)} künftig als „${roleLabel(next)}“ führen?`)){select.value=member.role;return;}
    select.disabled=true;
    try{const {error}=await client().from('studio_members').update({role:next}).eq('id',id);if(error)throw error;await loadTeam();}
    catch(error){alert(String(error?.message||error));select.value=member.role;}
    finally{select.disabled=false;}
  }

  async function removeMember(event){
    const id=event.currentTarget.dataset.teamRemove,member=members.find(item=>item.id===id);if(!member)return;
    if(!confirm(`${displayName(member)} den Zugang zu diesem Studio entziehen?\n\nDie bisherigen Tattoo-Akten und Termine bleiben erhalten.`))return;
    try{const {error}=await client().from('studio_members').delete().eq('id',id);if(error)throw error;await loadTeam();}
    catch(error){alert(String(error?.message||error));}
  }

  async function cancelInvite(event){
    const id=event.currentTarget.dataset.inviteCancel;if(!id)return;
    try{const {error}=await client().from('studio_invites').delete().eq('id',id);if(error)throw error;await loadTeam();}
    catch(error){alert(String(error?.message||error));}
  }

  function inviteToken(){
    const query=new URLSearchParams(location.search).get('invite');
    if(query&&/^[0-9a-f-]{36}$/i.test(query)){localStorage.setItem(PENDING_INVITE_KEY,query);return query;}
    const saved=localStorage.getItem(PENDING_INVITE_KEY)||'';return /^[0-9a-f-]{36}$/i.test(saved)?saved:'';
  }
  function decorateInviteLogin(){
    if(!inviteToken())return;const node=document.getElementById('tatneraAuthMessage');if(!node||node.textContent)return;
    node.textContent='Studio-Einladung erkannt. Bitte mit der eingeladenen E-Mail-Adresse einloggen oder registrieren.';node.className='tatnera-auth-message success';
  }
  function clearInviteFromUrl(){
    localStorage.removeItem(PENDING_INVITE_KEY);const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }

  async function acceptPendingInvite(){
    const token=inviteToken(),a=auth(),user=currentUser();if(!token||!a?.client||!user||acceptingInvite)return false;
    if(a.membership?.())return false;
    acceptingInvite=true;
    try{
      const {data:invite,error}=await a.client.from('studio_invites').select('id,studio_id,email,role,token,expires_at').eq('token',token).maybeSingle();
      if(error)throw error;
      if(!invite){
        const node=document.getElementById('tatneraAuthMessage');if(node){node.textContent='Diese Einladung passt nicht zu diesem Konto oder ist nicht mehr gültig. Bitte mit der eingeladenen E-Mail-Adresse anmelden.';node.className='tatnera-auth-message error';}
        return false;
      }
      const {error:joinError}=await a.client.from('studio_members').insert({studio_id:invite.studio_id,user_id:user.id,role:invite.role,is_active:true});if(joinError)throw joinError;
      clearInviteFromUrl();location.reload();return true;
    }catch(error){
      const node=document.getElementById('tatneraAuthMessage');if(node){node.textContent='Studio-Einladung konnte nicht angenommen werden: '+String(error?.message||error);node.className='tatnera-auth-message error';}
      return false;
    }finally{acceptingInvite=false;}
  }

  function startInviteWatcher(){
    if(!inviteToken())return;decorateInviteLogin();let tries=0;
    const timer=setInterval(async()=>{
      tries++;decorateInviteLogin();
      if(await acceptPendingInvite()){clearInterval(timer);return;}
      if(tries>240)clearInterval(timer);
    },500);
  }

  installStyle();startInviteWatcher();
  document.addEventListener('tatnera:auth-ready',()=>loadTeam());
  document.addEventListener('tatnera:runtime-refresh',()=>{if(studioId())renderTeam();});
  document.addEventListener('tatnera:artists-changed',refreshArtistSelects);
  window.TatneraTeam={reload:loadTeam,members:()=>members.map(item=>({...item,profile:{...profileFor(item.user_id)}})),role:()=>currentMembership()?.role||'',canManage};
})();
