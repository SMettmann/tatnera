/* TATNERA — service-specific consent flows for Tattoo and Piercing */
(function(){
  'use strict';
  if(window.__tatneraServiceConsentInstalled)return;
  window.__tatneraServiceConsentInstalled=true;

  const Core=window.TatneraCore;
  if(!Core)return;
  const esc=Core.esc;
  const VERSION='1.0';
  const pending=new Map();

  function getProject(id){return Core.getProject(id);}
  function isPiercing(project){return project?.serviceType==='piercing';}
  function serviceName(project){return isPiercing(project)?'Piercing':'Tattoo';}

  function installStyle(){
    if(document.getElementById('serviceConsentStyle'))return;
    const style=document.createElement('style');
    style.id='serviceConsentStyle';
    style.textContent=`
      .service-consent-section{border-left:3px solid var(--line);padding-left:16px!important}
      .service-consent-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}
      .service-consent-summary>div{padding:10px 11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      .service-consent-summary span,.service-consent-summary strong{display:block}
      .service-consent-summary span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px}
      .service-consent-summary strong{font-size:11px;line-height:1.35}
      .service-consent-badge{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid var(--line);border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-top:10px}
      .service-consent-badge.legacy{opacity:.68}
      .service-consent-card-note{margin:10px 0;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);font-size:10px;color:var(--muted);line-height:1.45}
      @media(max-width:700px){.service-consent-summary{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function consentSection(form){
    return form?.elements?.truthful?.closest('.consent-section')||null;
  }

  function setCheckText(form,name,text){
    const input=form?.elements?.[name];
    const span=input?.closest('.consent-check')?.querySelector('span');
    if(span)span.textContent=text;
  }

  function projectSummary(project){
    if(isPiercing(project)){
      const piercing=project.piercing||{};
      const jewelry=[piercing.jewelryType,piercing.material,piercing.gauge,piercing.dimensions].filter(Boolean).join(' · ')||'Noch nicht vollständig erfasst';
      return [
        ['Piercing',project.title||'—'],
        ['Körperstelle',project.placement||'—'],
        ['Schmuck',jewelry]
      ];
    }
    return [
      ['Motiv',project.title||'—'],
      ['Körperstelle',project.placement||'—'],
      ['Größe',project.size||'—']
    ];
  }

  function serviceSpecificCopy(project){
    if(isPiercing(project))return {
      title:'Piercing-spezifische Aufklärung',
      intro:'Diese Angaben beziehen sich ausdrücklich auf das geplante Piercing und den vorgesehenen Schmuck.',
      details:'Piercing, Körperstelle sowie Schmuckart, Material und Maße wurden mit mir abgestimmt und entsprechen der besprochenen Durchführung.',
      specific:'Ich wurde über mögliche Schwellung, Nachblutung, Reizung, Infektion, Narbenbildung sowie Migration/Abstoßung und mögliche Schmuck- oder Materialreaktionen aufgeklärt.',
      healing:'Ich habe Hinweise zu Heilungsdauer, Pflege, Kontrolle und dem Umgang mit dem Erstschmuck erhalten. Änderungen oder Entfernen des Schmucks während der Heilung bespreche ich bei Unsicherheit mit dem Studio.',
      risks:'Ich wurde über typische Risiken eines Piercings, mögliche Reaktionen und Besonderheiten der gewählten Körperstelle informiert und konnte Fragen stellen.',
      aftercare:'Ich habe die Piercing-Pflege, den Umgang mit dem Schmuck und empfohlene Kontrollen erklärt bekommen bzw. erhalte die Hinweise vor Verlassen des Studios.',
      guardian:'Ich stimme als sorgeberechtigte Person der Durchführung dieses Piercings nach erfolgter Aufklärung zu.'
    };
    return {
      title:'Tattoo-spezifische Aufklärung',
      intro:'Diese Angaben beziehen sich ausdrücklich auf das geplante Tattoo und die vereinbarte Platzierung.',
      details:'Motiv, Körperstelle und Größe wurden mit mir abgestimmt. Mir ist bewusst, dass ein Tattoo eine dauerhafte Veränderung der Haut darstellt.',
      specific:'Ich wurde über mögliche Hautreaktionen, Infektionen, Narbenbildung, allergische Reaktionen sowie mögliche Veränderungen von Farbe und Erscheinungsbild im Heilungsverlauf aufgeklärt.',
      healing:'Ich habe Hinweise zur Tattoo-Nachsorge und zum Schutz der tätowierten Haut erhalten bzw. erhalte diese vor Verlassen des Studios.',
      risks:'Ich wurde über typische Risiken und mögliche Reaktionen im Zusammenhang mit dem Tattoo informiert und konnte Fragen stellen.',
      aftercare:'Ich habe Hinweise zur Vorbereitung und Tattoo-Nachsorge erhalten bzw. werde diese vor Verlassen des Studios erhalten.',
      guardian:'Ich stimme als sorgeberechtigte Person der Durchführung dieses Tattoos nach erfolgter Aufklärung zu.'
    };
  }

  function ensureSpecificSection(form,project){
    let section=form.querySelector('[data-service-consent-section]');
    const anchor=consentSection(form);
    if(!section){
      section=document.createElement('section');
      section.className='consent-section service-consent-section';
      section.dataset.serviceConsentSection='true';
      if(anchor)anchor.before(section);
      else form.querySelector('.dialog-actions')?.before(section);
    }
    const copy=serviceSpecificCopy(project);
    const stored=project.consentData?.serviceConsent;
    const usable=stored&&stored.serviceType===(isPiercing(project)?'piercing':'tattoo');
    const summary=projectSummary(project).map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
    section.innerHTML=`
      <h3>${esc(copy.title)}</h3>
      <p>${esc(copy.intro)}</p>
      <div class="service-consent-summary">${summary}</div>
      <div class="consent-checks">
        <label class="consent-check"><input type="checkbox" name="serviceDetailsConfirmed" required><span>${esc(copy.details)}</span></label>
        <label class="consent-check"><input type="checkbox" name="serviceRisksConfirmed" required><span>${esc(copy.specific)}</span></label>
        <label class="consent-check"><input type="checkbox" name="serviceHealingConfirmed" required><span>${esc(copy.healing)}</span></label>
      </div>`;
    form.elements.serviceDetailsConfirmed.checked=Boolean(usable&&stored.detailsConfirmed);
    form.elements.serviceRisksConfirmed.checked=Boolean(usable&&stored.risksConfirmed);
    form.elements.serviceHealingConfirmed.checked=Boolean(usable&&stored.healingConfirmed);
  }

  function configureDialog(projectId){
    const project=getProject(projectId),dialog=document.getElementById('consentDialog'),form=document.getElementById('consentForm');
    if(!project||!dialog||!form)return;
    dialog.dataset.serviceProjectId=project.id;
    dialog.dataset.serviceType=isPiercing(project)?'piercing':'tattoo';
    const piercing=isPiercing(project),copy=serviceSpecificCopy(project),service=serviceName(project);

    const eyebrow=dialog.querySelector('.dialog-head .eyebrow');
    if(eyebrow)eyebrow.textContent=`${service}-Einwilligung & Anamnese`;
    const title=document.getElementById('consentDialogTitle');
    if(title)title.textContent=`${service}-Kundenformular`;
    const meta=document.getElementById('consentDialogMeta');
    if(meta)meta.textContent=`${project.title||service} · ${project.placement||'—'} · ${piercing?'Piercer':'Artist'}: ${project.artist||'—'}`;

    const guardian=document.getElementById('guardianConsentSection');
    if(guardian){
      const p=guardian.querySelector('p');
      if(p)p.textContent=`Bei einer minderjährigen Person dokumentiert TATNERA zusätzlich die Zustimmung einer sorgeberechtigten Person. Das Studio entscheidet selbst, ob und unter welchen Voraussetzungen es ${piercing?'Piercings':'Tattoos'} bei Minderjährigen durchführt.`;
      const guardianText=form.elements.guardianConsent?.closest('.consent-check')?.querySelector('span');
      if(guardianText)guardianText.textContent=copy.guardian;
    }

    const main=consentSection(form);
    if(main){
      const h3=main.querySelector('h3');
      if(h3)h3.textContent=`${service}-Einwilligung`;
    }
    setCheckText(form,'risks',copy.risks);
    setCheckText(form,'aftercare',copy.aftercare);
    ensureSpecificSection(form,project);

    const note=dialog.querySelector('.consent-note');
    if(note)note.textContent=`Die Einwilligung, Gesundheitsangaben und Unterschriften werden mit dieser ${service}-Akte gespeichert und über die Studio-Cloud synchronisiert.`;
    const submit=form.querySelector('.dialog-actions [type="submit"]');
    if(submit)submit.textContent=`${service}-Einwilligung unterschreiben & speichern`;
  }

  function patchCard(projectId){
    const project=getProject(projectId);if(!project)return;
    const card=document.querySelector(`.consent-card[data-consent-project="${CSS.escape(projectId)}"]`);if(!card)return;
    const service=serviceName(project),piercing=isPiercing(project);
    const h3=card.querySelector('h3');if(h3)h3.textContent=`${service}-Einwilligung & Anamnese`;
    const description=card.querySelector('.consent-card-head p');
    if(description)description.textContent=piercing
      ?'Gesundheitsangaben, Piercing-Aufklärung, Schmuck-/Platzierungsbestätigung, Datenschutz und Unterschrift sind mit dieser Piercing-Akte verknüpft.'
      :'Gesundheitsangaben, Tattoo-Aufklärung, Motiv-/Platzierungsbestätigung, Datenschutz und Unterschrift sind mit dieser Tattoo-Akte verknüpft.';
    card.querySelectorAll('small,p,span').forEach(node=>{
      if(node.children.length)return;
      if(piercing)node.textContent=node.textContent.replaceAll('Tattoo-Akte','Piercing-Akte').replaceAll('Tattoo','Piercing');
    });
    let badge=card.querySelector('[data-service-consent-badge]');
    if(!badge){badge=document.createElement('div');badge.dataset.serviceConsentBadge='true';const actions=card.querySelector('.consent-actions');actions?.before(badge);}
    const specific=project.consentData?.serviceConsent;
    const current=specific?.serviceType===(piercing?'piercing':'tattoo');
    badge.className=`service-consent-badge${current?'':' legacy'}`;
    badge.textContent=current?`${service}-Formular · Version ${specific.version||VERSION}`:`${service}-Formular · bisherige Fassung`;
    if(project.consentData&&!current){
      let note=card.querySelector('[data-service-consent-card-note]');
      if(!note){note=document.createElement('div');note.dataset.serviceConsentCardNote='true';note.className='service-consent-card-note';badge.after(note);}
      note.textContent=`Diese Unterschrift stammt aus einer früheren Formularfassung. Beim nächsten Bearbeiten werden die ${service}-spezifischen Bestätigungen ergänzt.`;
    }else card.querySelector('[data-service-consent-card-note]')?.remove();
  }

  function patchVisible(){
    const id=Core.projectIdFromDetail?.();
    if(id)requestAnimationFrame(()=>patchCard(id));
    document.querySelectorAll('.cockpit-task-grid small').forEach(node=>{
      if(/betroffene Tattoos/i.test(node.textContent))node.textContent='Tattoo- & Piercing-Akten prüfen';
    });
  }

  document.addEventListener('click',event=>{
    const open=event.target.closest?.('[data-open-consent]');
    if(!open)return;
    const id=open.dataset.openConsent;
    setTimeout(()=>configureDialog(id),10);
  },true);

  document.addEventListener('submit',event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='consentForm')return;
    const dialog=document.getElementById('consentDialog'),projectId=dialog?.dataset.serviceProjectId,project=getProject(projectId);
    if(!project)return;
    pending.set(project.id,{
      serviceType:isPiercing(project)?'piercing':'tattoo',
      version:VERSION,
      detailsConfirmed:Boolean(form.elements.serviceDetailsConfirmed?.checked),
      risksConfirmed:Boolean(form.elements.serviceRisksConfirmed?.checked),
      healingConfirmed:Boolean(form.elements.serviceHealingConfirmed?.checked),
      confirmedAt:new Date().toISOString(),
      snapshot:{
        title:project.title||'',placement:project.placement||'',size:project.size||'',artist:project.artist||'',
        jewelryType:project.piercing?.jewelryType||'',material:project.piercing?.material||'',gauge:project.piercing?.gauge||'',dimensions:project.piercing?.dimensions||''
      }
    });
  },true);

  document.addEventListener('tatnera:data-changed',event=>{
    const id=event.detail?.projectId;
    if(event.detail?.type==='consent'&&id&&pending.has(id)){
      const project=getProject(id),specific=pending.get(id);pending.delete(id);
      if(project?.consentData){project.consentData.serviceConsent=specific;try{persist();}catch(_error){}}
    }
    if(id)requestAnimationFrame(()=>patchCard(id));
    else requestAnimationFrame(patchVisible);
  });
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>patchCard(event.detail?.projectId||Core.projectIdFromDetail?.())));
  document.addEventListener('tatnera:runtime-refresh',patchVisible);

  installStyle();
  patchVisible();
})();
