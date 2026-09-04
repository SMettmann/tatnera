/* TATNERA — detailed role policy v2
   Fine-grained UI rules for appointments, payments and cross-service access. */
(function(){
  'use strict';
  if(window.__tatneraRolePolicyV2Installed)return;
  window.__tatneraRolePolicyV2Installed=true;

  const Core=window.TatneraCore;
  const roleLabels={owner:'Inhaber',admin:'Admin',artist:'Tattoo Artist',piercer:'Piercer',artist_piercer:'Artist & Piercer',staff:'Studio-Mitarbeiter'};
  const role=()=>window.TatneraAuth?.membership?.()?.role||'';
  const manager=()=>['owner','admin'].includes(role());
  const serviceOfProject=p=>p?.serviceType==='piercing'?'piercing':'tattoo';
  const currentProject=()=>{
    const id=Core?.projectIdFromDetail?.()||document.getElementById('projectDetail')?.dataset.projectId||'';
    return id?Core?.getProject?.(id):null;
  };
  const serviceAllowed=service=>{
    const r=role();
    if(['owner','admin','artist_piercer','staff'].includes(r))return true;
    if(r==='artist')return service!=='piercing';
    if(r==='piercer')return service==='piercing';
    return false;
  };
  const clinicalAllowed=service=>{
    const r=role();
    if(['owner','admin','artist_piercer'].includes(r))return true;
    if(r==='artist')return service!=='piercing';
    if(r==='piercer')return service==='piercing';
    return false;
  };
  const crossService=service=>(role()==='artist'&&service==='piercing')||(role()==='piercer'&&service==='tattoo');
  const appointmentTypeAllowed=type=>{
    const r=role(),t=String(type||'tattoo');
    if(['owner','admin','staff','artist_piercer'].includes(r))return true;
    if(r==='artist')return t!=='piercing';
    if(r==='piercer')return !['tattoo','touchup'].includes(t);
    return false;
  };
  const canRecordIncomingPayment=service=>manager()||role()==='staff'||role()==='artist_piercer'||(role()==='artist'&&service!=='piercing')||(role()==='piercer'&&service==='piercing');
  const canAdjustMoney=()=>manager();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function deny(text){alert(text||'Dafür hast du mit deiner Rolle keine Berechtigung.');}
  function hidden(node,yes){if(node)node.classList.toggle('tatnera-policy-hidden',Boolean(yes));}

  function installStyle(){
    if(document.getElementById('tatneraRolePolicyV2Style'))return;
    const style=document.createElement('style');style.id='tatneraRolePolicyV2Style';style.textContent=`
      .tatnera-policy-hidden{display:none!important}
      .role-policy-panel{margin-top:18px}.role-policy-current{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2);margin-top:12px}.role-policy-current strong,.role-policy-current span{display:block}.role-policy-current strong{font-size:12px}.role-policy-current span{font-size:9px;color:var(--muted);margin-top:3px}
      .role-policy-table-wrap{overflow:auto;margin-top:12px;border:1px solid var(--line);border-radius:12px}.role-policy-table{width:100%;border-collapse:collapse;min-width:760px}.role-policy-table th,.role-policy-table td{padding:9px 10px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);font-size:9px;vertical-align:top}.role-policy-table th:last-child,.role-policy-table td:last-child{border-right:0}.role-policy-table tr:last-child td{border-bottom:0}.role-policy-table th{text-align:left;background:var(--panel-2);font-size:9px}.role-policy-table td:first-child{font-weight:800;white-space:nowrap}.role-policy-yes{font-weight:800}.role-policy-limited{color:var(--muted)}
      .cross-service-overview{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2)}.cross-service-overview h3{margin:3px 0 8px;font-size:16px}.cross-service-overview p{margin:0;color:var(--muted);font-size:10px;line-height:1.55}.cross-service-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.cross-service-grid>div{padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}.cross-service-grid span,.cross-service-grid strong{display:block}.cross-service-grid span{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.cross-service-grid strong{font-size:11px;margin-top:4px}
      .role-form-warning{margin:8px 0 0;padding:8px 10px;border:1px solid #795b32;border-radius:9px;background:rgba(146,100,42,.08);font-size:9px;color:var(--muted)}
      @media(max-width:700px){.cross-service-grid{grid-template-columns:1fr 1fr}.role-policy-current{align-items:flex-start;flex-direction:column}}
    `;document.head.appendChild(style);
  }

  function permissionText(r,area){
    const all=['owner','admin'];
    if(area==='customers')return 'Voll';
    if(area==='calendar')return all.includes(r)||['staff','artist_piercer'].includes(r)?'Voll':r==='artist'?'Tattoo + allgemein':r==='piercer'?'Piercing + allgemein':'—';
    if(area==='requests')return all.includes(r)||['staff','artist_piercer'].includes(r)?'Tattoo + Piercing':r==='artist'?'Tattoo':r==='piercer'?'Piercing':'—';
    if(area==='tattoo')return all.includes(r)||r==='artist_piercer'?'Voll':r==='artist'?'Voll':r==='staff'?'Planung':r==='piercer'?'Basisinfo':'—';
    if(area==='piercing')return all.includes(r)||r==='artist_piercer'?'Voll':r==='piercer'?'Voll':r==='staff'?'Planung':r==='artist'?'Basisinfo':'—';
    if(area==='clinical')return all.includes(r)||r==='artist_piercer'?'Beide':r==='artist'?'Nur Tattoo':r==='piercer'?'Nur Piercing':'—';
    if(area==='payments')return all.includes(r)?'Voll inkl. Korrektur':r==='staff'?'Eingänge buchen':r==='artist_piercer'?'Eingänge buchen':r==='artist'?'Eigene Tattoo-Akten':r==='piercer'?'Eigene Piercing-Akten':'—';
    if(area==='finance')return all.includes(r)?'Voll':'—';
    if(area==='archive')return all.includes(r)?'Voll':'—';
    if(area==='team')return r==='owner'?'Voll':r==='admin'?'Ohne Inhaber/Admin-Ernennung':'—';
    return '—';
  }

  function renderPolicyPanel(){
    const settings=document.getElementById('settings');if(!settings||!role())return;
    let panel=document.getElementById('rolePolicyPanel');
    if(!panel){panel=document.createElement('section');panel.id='rolePolicyPanel';panel.className='theme-settings-panel role-policy-panel';settings.appendChild(panel);}
    const roles=['owner','admin','artist','piercer','artist_piercer','staff'];
    const areas=[['customers','Kunden'],['calendar','Kalender / Termine'],['requests','Anfragen'],['tattoo','Tattoo-Akten'],['piercing','Piercing-Akten'],['clinical','Fach-Dokumentation'],['payments','Zahlungen'],['finance','Rechnungen / Studiofinanzen'],['archive','Archiv / endgültig löschen'],['team','Team / Rollen']];
    panel.innerHTML=`<div class="theme-settings-head"><div><span class="eyebrow">Berechtigungen</span><h3>Rollen & Zugriff</h3><p>Die Rollen sind bewusst nach Studio-Alltag getrennt. Fachliche Dokumentation bleibt bei den ausführenden Artists/Piercern; Studiofinanzen und irreversible Aktionen bei Inhaber/Admin.</p></div></div><div class="role-policy-current"><div><strong>Deine Rolle: ${esc(roleLabels[role()]||role())}</strong><span>Die Oberfläche passt sich automatisch an diese Rechte an.</span></div><span class="status-pill">Aktiv</span></div>${manager()?`<div class="role-policy-table-wrap"><table class="role-policy-table"><thead><tr><th>Bereich</th>${roles.map(r=>`<th>${esc(roleLabels[r])}</th>`).join('')}</tr></thead><tbody>${areas.map(([key,label])=>`<tr><td>${esc(label)}</td>${roles.map(r=>{const text=permissionText(r,key);return `<td class="${text==='Voll'||text==='Beide'||text==='Tattoo + Piercing'?'role-policy-yes':'role-policy-limited'}">${esc(text)}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`:''}`;
  }

  function sanitizeCrossServiceProject(){
    const p=currentProject(),root=document.getElementById('projectDetail');if(!p||!root)return;
    const service=serviceOfProject(p),restricted=crossService(service);
    root.querySelectorAll('[data-project-tab]').forEach(tab=>{
      if(restricted)hidden(tab,tab.dataset.projectTab!=='overview');
    });
    hidden(root.querySelector('[data-record-new-project-event]'),restricted);
    if(!restricted)return;
    const pane=root.querySelector('[data-project-pane="overview"]');if(!pane||pane.dataset.crossServiceSanitized==='1')return;
    pane.dataset.crossServiceSanitized='1';
    pane.innerHTML=`<section class="cross-service-overview"><span class="eyebrow">Organisatorische Ansicht</span><h3>${esc(p.title|| (service==='piercing'?'Piercing':'Tattoo'))}</h3><p>Du siehst diese Akte nur zur Abstimmung im Studio. Fach-Dokumentation, Dateien, Einwilligungen, Nachsorge und Zahlungen sind für deine Rolle ausgeblendet.</p><div class="cross-service-grid"><div><span>Kunde</span><strong>${esc(typeof customerName==='function'?customerName(p.customerId):'—')}</strong></div><div><span>${service==='piercing'?'Piercer':'Artist'}</span><strong>${esc(p.artist||'—')}</strong></div><div><span>Status</span><strong>${esc(p.status||'—')}</strong></div><div><span>Körperstelle</span><strong>${esc(p.placement||'—')}</strong></div><div><span>Art</span><strong>${service==='piercing'?'Piercing':'Tattoo'}</strong></div></div></section>`;
    window.TatneraProjectTabs?.activate?.('overview');
  }

  function applyPaymentPolicy(){
    const p=currentProject(),service=p?serviceOfProject(p):'tattoo';
    const incoming=p&&canRecordIncomingPayment(service),adjust=canAdjustMoney();
    document.querySelectorAll('#projectDetail [data-add-payment],#projectDetail [data-pay-deposit]').forEach(node=>hidden(node,!incoming));
    document.querySelectorAll('#projectDetail [data-edit-price],#projectDetail [data-delete-payment]').forEach(node=>hidden(node,!adjust));
    const form=document.getElementById('paymentForm');
    if(form){
      const refund=[...form.elements.type?.options||[]].find(option=>option.value==='Erstattung'||option.textContent==='Erstattung');
      if(refund){refund.disabled=!adjust;refund.hidden=!adjust;if(!adjust&&form.elements.type.value==='Erstattung')form.elements.type.value='Teilzahlung';}
      let note=form.querySelector('[data-role-payment-note]');
      if(!note&&!adjust){note=document.createElement('div');note.dataset.rolePaymentNote='true';note.className='role-form-warning';note.textContent='Mit deiner Rolle kannst du Zahlungseingänge erfassen. Erstattungen, Preisänderungen und das Löschen von Buchungen bleiben Inhaber/Admin vorbehalten.';form.querySelector('.dialog-actions')?.insertAdjacentElement('beforebegin',note);}
      if(note)note.hidden=adjust;
    }
  }

  function applyAppointmentPolicy(){
    const form=document.getElementById('appointmentForm');if(!form)return;
    const type=form.elements.type;if(!type)return;
    [...type.options].forEach(option=>{const allowed=appointmentTypeAllowed(option.value);option.disabled=!allowed;option.hidden=!allowed;});
    const allowed=appointmentTypeAllowed(type.value),submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=!allowed;
    let note=form.querySelector('[data-role-appointment-note]');
    if(!note){note=document.createElement('div');note.dataset.roleAppointmentNote='true';note.className='role-form-warning';form.querySelector('.dialog-actions')?.insertAdjacentElement('beforebegin',note);}
    note.hidden=allowed;note.textContent='Dieser Termin gehört zu einem Bereich, den du mit deiner Rolle nicht bearbeiten darfst.';
  }

  function appointmentFromTarget(target){
    const holder=target.closest('[data-record-edit-event],[data-record-delete-event]');
    const id=holder?.dataset.recordEditEvent||holder?.dataset.recordDeleteEvent||'';
    return id?(state.calendarEvents||[]).find(item=>item.id===id):null;
  }

  function guardClick(event){
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    const p=currentProject(),service=p?serviceOfProject(p):'tattoo';
    if(target.closest('[data-edit-price],[data-delete-payment]')&&!canAdjustMoney()){
      event.preventDefault();event.stopImmediatePropagation();deny('Preisänderungen, Erstattungs-Korrekturen und das Löschen von Zahlungen sind nur für Inhaber und Admins möglich.');return;
    }
    if(target.closest('[data-add-payment],[data-pay-deposit]')&&(!p||!canRecordIncomingPayment(service))){
      event.preventDefault();event.stopImmediatePropagation();deny('Für diese Akte darfst du keine Zahlung erfassen.');return;
    }
    const appt=appointmentFromTarget(target);
    if(appt&&!appointmentTypeAllowed(appt.type)){
      event.preventDefault();event.stopImmediatePropagation();deny('Diesen Termin darfst du mit deiner Rolle nur ansehen.');return;
    }
    const addProjectEvent=target.closest('[data-record-new-project-event]');
    if(addProjectEvent){const project=Core?.getProject?.(addProjectEvent.dataset.recordNewProjectEvent);if(project&&!serviceAllowed(serviceOfProject(project))){event.preventDefault();event.stopImmediatePropagation();deny('Für diese Aktenart darfst du keinen Termin anlegen.');}}
  }

  function guardSubmit(event){
    const form=event.target;if(!(form instanceof HTMLFormElement))return;
    if(form.id==='paymentForm'){
      const p=currentProject(),service=p?serviceOfProject(p):'tattoo';
      if(!p||!canRecordIncomingPayment(service)){event.preventDefault();event.stopImmediatePropagation();deny('Für diese Akte darfst du keine Zahlung erfassen.');return;}
      if(form.elements.type?.value==='Erstattung'&&!canAdjustMoney()){event.preventDefault();event.stopImmediatePropagation();deny('Erstattungen dürfen nur Inhaber und Admins buchen.');return;}
    }
    if(form.id==='priceForm'&&!canAdjustMoney()){
      event.preventDefault();event.stopImmediatePropagation();deny('Preis und Anzahlung dürfen nur Inhaber und Admins ändern.');return;
    }
    if(form.id==='appointmentForm'&&!appointmentTypeAllowed(form.elements.type?.value)){
      event.preventDefault();event.stopImmediatePropagation();deny('Diese Terminart darfst du mit deiner Rolle nicht bearbeiten.');
    }
  }

  function protectInvoices(){
    const api=window.TatneraInvoices;if(!api||api.__rolePolicyWrapped)return;
    ['openCreate','open','create'].forEach(key=>{
      if(typeof api[key]!=='function')return;
      const previous=api[key].bind(api);api[key]=function(){if(!manager()){deny('Rechnungen können nur Inhaber und Admins erstellen oder bearbeiten.');return;}return previous(...arguments);};
    });
    api.__rolePolicyWrapped=true;
  }

  let timer=0;
  function apply(){clearTimeout(timer);timer=setTimeout(()=>{if(!role())return;renderPolicyPanel();sanitizeCrossServiceProject();applyPaymentPolicy();applyAppointmentPolicy();protectInvoices();},0);}

  installStyle();
  window.addEventListener('click',guardClick,true);
  window.addEventListener('submit',guardSubmit,true);
  window.addEventListener('change',event=>{if(event.target?.closest?.('#appointmentForm [name="type"]'))applyAppointmentPolicy();},true);
  const observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true});
  ['tatnera:auth-ready','tatnera:runtime-refresh','tatnera:project-opened','tatnera:customer-opened','tatnera:data-changed'].forEach(name=>document.addEventListener(name,apply));
  setTimeout(apply,500);

  window.TatneraRolePolicyV2={role,serviceAllowed,clinicalAllowed,appointmentTypeAllowed,canRecordIncomingPayment,canAdjustMoney,apply};
})();
