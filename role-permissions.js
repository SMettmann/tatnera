/* TATNERA — team roles, permissions and invitation hardening */
(function(){
  'use strict';
  if(window.__tatneraRolePermissionsInstalled)return;
  window.__tatneraRolePermissionsInstalled=true;

  const Core=window.TatneraCore;
  const roleLabels={
    owner:'Inhaber',
    admin:'Admin',
    artist:'Tattoo Artist',
    piercer:'Piercer',
    artist_piercer:'Artist & Piercer',
    staff:'Studio-Mitarbeiter'
  };
  const roleDescriptions={
    owner:'Vollzugriff inklusive Team, Studio, Rechnungen und Archiv.',
    admin:'Vollzugriff im Studio; darf Teammitglieder verwalten, aber keinen Inhaber ändern.',
    artist:'Kunden, Kalender, Anfragen und vollständige Tattoo-Dokumentation. Keine Piercing-Durchführung, Studiofinanzen oder Teamverwaltung.',
    piercer:'Kunden, Kalender, Anfragen und vollständige Piercing-Dokumentation. Keine Tattoo-Durchführung, Studiofinanzen oder Teamverwaltung.',
    artist_piercer:'Tattoo- und Piercing-Dokumentation sowie Kunden, Kalender und Anfragen. Keine Studiofinanzen oder Teamverwaltung.',
    staff:'Kunden, Anfragen und Termine organisieren sowie Akten für die Planung anlegen. Keine medizinische/technische Dokumentation, Studiofinanzen oder Archivverwaltung.'
  };

  const auth=()=>window.TatneraAuth||null;
  const client=()=>auth()?.client||null;
  const user=()=>auth()?.user?.()||null;
  const studioId=()=>auth()?.studioId?.()||'';
  const role=()=>auth()?.membership?.()?.role||'';
  const isManager=()=>['owner','admin'].includes(role());
  const isOwner=()=>role()==='owner';
  const canFinance=()=>isManager();
  const canManageStudio=()=>isManager();
  const canArchive=()=>isManager();
  const canCreateService=service=>{
    const r=role();
    if(['owner','admin','artist_piercer','staff'].includes(r))return true;
    if(r==='artist')return service!=='piercing';
    if(r==='piercer')return service==='piercing';
    return false;
  };
  const canEditService=service=>{
    const r=role();
    if(['owner','admin','artist_piercer'].includes(r))return true;
    if(r==='artist')return service!=='piercing';
    if(r==='piercer')return service==='piercing';
    return false;
  };
  const canClinical=service=>canEditService(service);
  const canSeePayments=service=>role()==='staff'||canClinical(service);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const serviceOf=project=>project?.serviceType==='piercing'?'piercing':'tattoo';

  function installStyle(){
    if(document.getElementById('tatneraRolePermissionStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraRolePermissionStyle';
    style.textContent=`
      .tatnera-permission-hidden{display:none!important}
      .studio-role-guide{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 2px}
      .studio-role-guide>div{padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      .studio-role-guide strong,.studio-role-guide span{display:block}.studio-role-guide strong{font-size:10px}.studio-role-guide span{margin-top:3px;font-size:8.5px;line-height:1.4;color:var(--muted)}
      .invite-password-dialog{width:min(92vw,520px);max-width:520px}.invite-password-dialog form{padding:22px}.invite-password-dialog .form-grid{margin-top:14px}
      @media(max-width:820px){.studio-role-guide{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.studio-role-guide{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function hide(node,yes){if(node)node.classList.toggle('tatnera-permission-hidden',Boolean(yes));}
  function hideAll(selector,yes){document.querySelectorAll(selector).forEach(node=>hide(node,yes));}
  function deny(message='Dafür hast du mit deiner Rolle keine Berechtigung.'){alert(message);}

  function syncSidebarRole(){
    const card=document.querySelector('.studio-card');
    const meta=card?.querySelector('span');
    if(meta&&role())meta.textContent=roleLabels[role()]||role();
  }

  function applyNavigation(){
    hide(document.querySelector('.nav-item[data-view="invoices"]'),!canFinance());
    if(!canFinance()&&state?.currentView==='invoices'&&typeof navigate==='function')navigate('dashboard');
    document.querySelectorAll('#dashboard .metric-card').forEach(card=>{
      const financial=/monatsumsatz|gesamtumsatz|studio-umsatz/i.test(card.textContent||'');
      if(financial)hide(card,!canFinance());
    });
  }

  function applySettings(){
    hide(document.getElementById('studioSettingsPanel'),!canManageStudio());
    patchTeamUi();
  }

  function applyCreateButtons(){
    const tattoo=!canCreateService('tattoo'),piercing=!canCreateService('piercing');
    hideAll('#quickProjectBtn,#addProjectBtn,[data-customer-new-tattoo]',tattoo);
    hideAll('#quickPiercingBtn,#addPiercingBtn,[data-customer-new-piercing]',piercing);
    const form=document.getElementById('requestForm');
    if(form){
      const tattooInput=form.querySelector('[name="serviceType"][value="tattoo"]');
      const piercingInput=form.querySelector('[name="serviceType"][value="piercing"]');
      hide(tattooInput?.closest('label'),tattoo);
      hide(piercingInput?.closest('label'),piercing);
      if(tattoo&&tattooInput?.checked&&piercingInput&&!piercing){piercingInput.checked=true;piercingInput.dispatchEvent(new Event('change',{bubbles:true}));}
      if(piercing&&piercingInput?.checked&&tattooInput&&!tattoo){tattooInput.checked=true;tattooInput.dispatchEvent(new Event('change',{bubbles:true}));}
    }
  }

  function currentProject(){
    const id=Core?.projectIdFromDetail?.()||document.getElementById('projectDetail')?.dataset.projectId||'';
    return id?Core?.getProject?.(id):null;
  }

  function applyProjectDetail(){
    const project=currentProject();if(!project)return;
    const service=serviceOf(project),clinical=canClinical(service),payments=canSeePayments(service),editable=canEditService(service);
    const root=document.getElementById('projectDetail');if(!root)return;
    root.querySelectorAll('[data-project-tab]').forEach(tab=>{
      const name=tab.dataset.projectTab;
      let allowed=name==='overview';
      if(name==='payments')allowed=payments;
      if(['design','documents','aftercare'].includes(name))allowed=clinical;
      if(name==='procedure')allowed=service==='piercing'&&clinical;
      hide(tab,!allowed);
    });
    hideAll('#projectDetail [data-edit-project]',!editable);
    hideAll('#projectDetail [data-archive-project],#projectDetail [data-delete-project]',!canArchive());
    const active=root.querySelector('[data-project-tab].active');
    if(active?.classList.contains('tatnera-permission-hidden'))window.TatneraProjectTabs?.activate?.('overview');
  }

  function applyRecordActions(){
    hideAll('[data-archive-customer],[data-archive-project],[data-open-record-archive],[data-delete-customer],[data-delete-project],[data-permanent-delete-customer],[data-permanent-delete-project]',!canArchive());
    const project=currentProject();
    if(project)hideAll('#projectDetail [data-edit-project]',!canEditService(serviceOf(project)));
  }

  function roleOptionsForManager(){
    return isOwner()?['admin','artist','piercer','artist_piercer','staff']:role()==='admin'?['artist','piercer','artist_piercer','staff']:[];
  }

  function ensureOption(select,value,label){
    if(!select)return;
    let option=select.querySelector(`option[value="${value}"]`);
    if(!option){option=document.createElement('option');option.value=value;select.appendChild(option);}
    option.textContent=label;
  }

  function patchTeamUi(){
    const panel=document.getElementById('studioTeamPanel');if(!panel)return;
    const inviteSelect=panel.querySelector('#studioInviteForm select[name="role"]');
    if(inviteSelect){
      for(const value of roleOptionsForManager())ensureOption(inviteSelect,value,roleLabels[value]);
      [...inviteSelect.options].forEach(option=>{if(roleLabels[option.value])option.textContent=roleLabels[option.value];});
    }
    panel.querySelectorAll('[data-team-role]').forEach(select=>{
      const selected=select.value;
      for(const value of roleOptionsForManager())ensureOption(select,value,roleLabels[value]);
      [...select.options].forEach(option=>{if(roleLabels[option.value])option.textContent=roleLabels[option.value];});
      if([...select.options].some(option=>option.value===selected))select.value=selected;
    });
    panel.querySelectorAll('.studio-team-main span,.status-pill').forEach(node=>{
      let text=node.textContent||'';
      text=text.replace(/Tätowierer/g,'Tattoo Artist').replace(/artist_piercer/g,'Artist & Piercer').replace(/\bpiercer\b/gi,'Piercer').replace(/\bstaff\b/gi,'Studio-Mitarbeiter');
      node.textContent=text;
    });
    if(!panel.querySelector('.studio-role-guide')){
      const guide=document.createElement('div');guide.className='studio-role-guide';
      const roles=['owner','admin','artist','piercer','artist_piercer','staff'];
      guide.innerHTML=roles.map(value=>`<div><strong>${esc(roleLabels[value])}</strong><span>${esc(roleDescriptions[value])}</span></div>`).join('');
      panel.querySelector('.studio-team-head')?.insertAdjacentElement('afterend',guide);
    }
  }

  function syncServicePeople(){
    if(!Core?.addArtist||!window.TatneraTeam?.members)return;
    const current=new Set((Core.getArtists?.(true)||[]).map(item=>String(item.name||'').trim().toLowerCase()));
    for(const member of window.TatneraTeam.members()){
      if(member.is_active===false||!['owner','artist','piercer','artist_piercer'].includes(member.role))continue;
      const name=String(member.profile?.display_name||'').trim();
      if(name&&!current.has(name.toLowerCase())){current.add(name.toLowerCase());Core.addArtist(name);}
    }
  }

  async function sendStudioInvite(form){
    const c=client(),sid=studioId(),u=user();if(!c||!sid||!u)throw new Error('Studio-Verbindung ist noch nicht bereit.');
    const values=Object.fromEntries(new FormData(form).entries()),email=String(values.email||'').trim().toLowerCase(),nextRole=String(values.role||'');
    if(!email)throw new Error('Bitte eine E-Mail-Adresse eingeben.');
    if(!roleOptionsForManager().includes(nextRole))throw new Error('Diese Rolle darfst du nicht vergeben.');

    const {data:existingProfiles,error:profileError}=await c.from('profiles').select('id,email').ilike('email',email);if(profileError)throw profileError;
    if((existingProfiles||[]).length){
      const ids=existingProfiles.map(item=>item.id);
      const {data:existingMembers,error:memberError}=await c.from('studio_members').select('id,user_id').eq('studio_id',sid).in('user_id',ids);if(memberError)throw memberError;
      if((existingMembers||[]).length)throw new Error('Diese E-Mail-Adresse gehört bereits zum Studio-Team.');
    }
    const {error:deleteError}=await c.from('studio_invites').delete().eq('studio_id',sid).ilike('email',email).is('accepted_at',null);if(deleteError)throw deleteError;
    const {data:invite,error:inviteError}=await c.from('studio_invites').insert({studio_id:sid,email,role:nextRole,created_by:u.id}).select('id,email,role,token,expires_at').single();if(inviteError)throw inviteError;
    const url=new URL(location.origin+location.pathname);url.searchParams.set('invite',invite.token);
    let sent=false,message='';
    try{
      const {data:delivery,error:mailError}=await c.functions.invoke('send-studio-invite',{body:{inviteId:invite.id,redirectTo:url.toString()}});
      if(mailError)throw mailError;if(delivery?.error)throw new Error(delivery.error);sent=delivery?.ok===true;
    }catch(error){console.error('TATNERA invitation email failed',error);message='Der automatische Mailversand ist fehlgeschlagen. Der Link kann trotzdem manuell verschickt werden.';}
    await window.TatneraTeam?.reload?.();
    requestAnimationFrame(()=>{
      patchTeamUi();
      const result=document.getElementById('studioInviteResult');if(!result)return;
      result.innerHTML=`<div class="studio-invite-result"><strong>${sent?'Einladung per E-Mail gesendet ✓':'Einladung erstellt – E-Mail nicht versendet'}</strong><div class="studio-team-note" style="margin:0 0 8px">${esc(sent?`Die Einladung als ${roleLabels[nextRole]} wurde an ${email} geschickt.`:(message||'Bitte den Link manuell senden.'))}</div><div class="studio-invite-link"><input readonly value="${esc(url.toString())}"><button type="button" class="btn ghost" data-copy-permission-invite>Kopieren</button></div></div>`;
      result.querySelector('[data-copy-permission-invite]')?.addEventListener('click',async event=>{try{await navigator.clipboard.writeText(url.toString());const b=event.currentTarget,old=b.textContent;b.textContent='Kopiert ✓';setTimeout(()=>b.textContent=old,1200);}catch(_error){prompt('Einladungslink kopieren:',url.toString());}});
    });
  }

  async function handleRoleChange(select){
    const id=select.dataset.teamRole,next=select.value,member=window.TatneraTeam?.members?.().find(item=>item.id===id);if(!member)return;
    const allowed=roleOptionsForManager();
    if(!allowed.includes(next)){deny('Diese Rolle darfst du nicht vergeben.');window.TatneraTeam?.reload?.();return;}
    const name=String(member.profile?.display_name||member.profile?.email||'Teammitglied');
    if(!confirm(`${name} künftig als „${roleLabels[next]||next}“ führen?`)){window.TatneraTeam?.reload?.();return;}
    const {error}=await client().from('studio_members').update({role:next}).eq('id',id);if(error)throw error;
    await window.TatneraTeam?.reload?.();
  }

  function requestDialogService(){
    const dialog=document.getElementById('requestDetailDialog');
    return dialog?.querySelector('.request-service-badge.piercing')?'piercing':'tattoo';
  }

  function blockedClick(target){
    if(target.closest('.nav-item[data-view="invoices"]')&&!canFinance()){deny('Rechnungen und Studiofinanzen sind nur für Inhaber und Admins sichtbar.');return true;}
    if(target.closest('#quickProjectBtn,#addProjectBtn,[data-customer-new-tattoo]')&&!canCreateService('tattoo')){deny('Mit deiner Rolle kannst du keine Tattoo-Akte anlegen.');return true;}
    if(target.closest('#quickPiercingBtn,#addPiercingBtn,[data-customer-new-piercing]')&&!canCreateService('piercing')){deny('Mit deiner Rolle kannst du keine Piercing-Akte anlegen.');return true;}
    if(target.closest('[data-archive-customer],[data-archive-project],[data-open-record-archive],[data-delete-customer],[data-delete-project],[data-permanent-delete-customer],[data-permanent-delete-project]')&&!canArchive()){deny('Archivieren und endgültiges Löschen ist nur für Inhaber und Admins möglich.');return true;}
    const edit=target.closest('[data-edit-project]');if(edit){const project=Core?.getProject?.(edit.dataset.editProject);if(project&&!canEditService(serviceOf(project))){deny('Diese Akte kannst du mit deiner Rolle nur ansehen.');return true;}}
    if(target.closest('[data-convert-request],[data-plan-request]')){const service=requestDialogService();if(!canCreateService(service)){deny(`Mit deiner Rolle kannst du keine ${service==='piercing'?'Piercing':'Tattoo'}-Akte aus dieser Anfrage anlegen.`);return true;}}
    return false;
  }

  function guardSubmit(form){
    if(form.id==='projectForm'){
      const service=form.querySelector('[name="serviceType"]:checked')?.value==='piercing'?'piercing':'tattoo';
      if(!canCreateService(service)){deny('Diese Aktenart darfst du mit deiner Rolle nicht anlegen.');return false;}
    }
    if(form.id==='projectEditForm'){
      const project=currentProject();if(project&&!canEditService(serviceOf(project))){deny('Diese Akte kannst du mit deiner Rolle nicht bearbeiten.');return false;}
    }
    if(form.id==='studioSettingsForm'&&!canManageStudio()){deny('Studio- und Rechnungsdaten dürfen nur Inhaber und Admins ändern.');return false;}
    if(form.id==='requestForm'){
      const service=form.elements.serviceType?.value==='piercing'?'piercing':'tattoo';if(!canCreateService(service)){deny('Diese Anfrageart darfst du mit deiner Rolle nicht anlegen oder bearbeiten.');return false;}
    }
    return true;
  }

  function buildPasswordDialog(){
    if(document.getElementById('invitePasswordDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='invitePasswordDialog';dialog.className='dialog invite-password-dialog';
    dialog.innerHTML=`<form id="invitePasswordForm"><div class="dialog-head"><div><span class="eyebrow">Studio-Einladung</span><h2>Zugang fertig einrichten</h2><p class="muted">Lege jetzt dein persönliches Passwort fest. Damit kannst du dich später auf jedem Gerät direkt bei TATNERA anmelden.</p></div></div><div class="form-grid"><label>Neues Passwort<input required minlength="8" type="password" name="password" autocomplete="new-password"></label><label>Passwort wiederholen<input required minlength="8" type="password" name="confirmPassword" autocomplete="new-password"></label></div><div class="dialog-actions"><button type="submit" class="btn primary">Passwort speichern</button></div><p class="studio-team-note" data-invite-password-message></p></form>`;
    document.body.appendChild(dialog);
    dialog.querySelector('form').addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]'),message=form.querySelector('[data-invite-password-message]');
      const password=form.elements.password.value,confirmPassword=form.elements.confirmPassword.value;
      if(password.length<8){message.textContent='Bitte mindestens 8 Zeichen verwenden.';return;}
      if(password!==confirmPassword){message.textContent='Die Passwörter stimmen nicht überein.';return;}
      button.disabled=true;message.textContent='';
      try{
        const u=user(),metadata={...(u?.user_metadata||{}),tatnera_password_set:true};
        const {error}=await client().auth.updateUser({password,data:metadata});if(error)throw error;
        sessionStorage.setItem(`tatnera_invite_password_done_${u?.id||''}`,'1');dialog.close();
      }catch(error){message.textContent='Passwort konnte nicht gespeichert werden: '+String(error?.message||error);}
      finally{button.disabled=false;}
    });
  }

  function maybePromptInvitePassword(){
    const u=user();if(!u?.id||!u.invited_at||u.user_metadata?.tatnera_password_set)return;
    if(sessionStorage.getItem(`tatnera_invite_password_done_${u.id}`)==='1')return;
    buildPasswordDialog();const dialog=document.getElementById('invitePasswordDialog');if(dialog&&!dialog.open)dialog.showModal();
  }

  let applyTimer=0;
  function apply(){
    clearTimeout(applyTimer);applyTimer=setTimeout(()=>{
      if(!role())return;
      document.body.dataset.tatneraRole=role();
      syncSidebarRole();applyNavigation();applySettings();applyCreateButtons();applyProjectDetail();applyRecordActions();syncServicePeople();
    },0);
  }

  installStyle();
  window.addEventListener('click',event=>{if(blockedClick(event.target)){event.preventDefault();event.stopImmediatePropagation();}},true);
  window.addEventListener('submit',event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement))return;
    if(form.id==='studioInviteForm'){
      event.preventDefault();event.stopImmediatePropagation();
      const button=form.querySelector('[type="submit"]');if(button){button.disabled=true;button.textContent='Einladung wird gesendet …';}
      sendStudioInvite(form).catch(error=>alert(String(error?.message||error))).finally(()=>{const current=document.querySelector('#studioInviteForm [type="submit"]');if(current){current.disabled=false;current.textContent='Einladung senden';}});
      return;
    }
    if(!guardSubmit(form)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  window.addEventListener('change',event=>{
    const select=event.target.closest?.('[data-team-role]');if(!select)return;
    event.preventDefault();event.stopImmediatePropagation();
    select.disabled=true;handleRoleChange(select).catch(error=>alert(String(error?.message||error))).finally(()=>select.disabled=false);
  },true);

  const observer=new MutationObserver(()=>apply());observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('tatnera:auth-ready',()=>{setTimeout(()=>{apply();maybePromptInvitePassword();},120);});
  document.addEventListener('tatnera:runtime-refresh',apply);
  document.addEventListener('tatnera:project-opened',apply);
  document.addEventListener('tatnera:customer-opened',apply);
  document.addEventListener('tatnera:data-changed',apply);
  document.addEventListener('tatnera:artists-changed',apply);
  setTimeout(()=>{apply();maybePromptInvitePassword();},700);

  window.TatneraPermissions={
    role,
    roleLabel:value=>roleLabels[value]||value||'—',
    canFinance,
    canManageStudio,
    canArchive,
    canCreateService,
    canEditService,
    canClinical,
    canSeePayments,
    apply
  };
})();
