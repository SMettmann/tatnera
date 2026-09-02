/* TATNERA — workflow UX: tattoo/customer -> appointment without dead ends */
(function(){
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  function installStyle(){
    const style=document.createElement('style');
    style.textContent=`
      .customer-primary-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}
      .customer-project-actions{display:flex;gap:7px;margin-top:11px;padding-top:10px;border-top:1px solid var(--line)}
      .customer-project-actions .btn{font-size:11px;padding:7px 10px}
      .project-header-action{display:flex;justify-content:flex-end;margin-top:11px}
      .project-header-action .btn{white-space:nowrap}
      .project-tab-btn{position:relative;z-index:3;pointer-events:auto!important}
      .project-tabs{position:relative;z-index:3}
    `;
    document.head.appendChild(style);
  }

  function renameEntryPoints(){
    const quick=document.getElementById('quickProjectBtn');if(quick)quick.textContent='+ Neues Tattoo';
    const add=document.getElementById('addProjectBtn');if(add)add.textContent='+ Neues Tattoo';
    const detailNew=document.getElementById('detailNewProject');if(detailNew)detailNew.textContent='+ Neues Tattoo';
    const dialog=document.getElementById('projectDialog');
    if(dialog){
      const eyebrow=dialog.querySelector('.dialog-head .eyebrow');if(eyebrow)eyebrow.textContent='Tattoo-Projekt';
      const title=dialog.querySelector('.dialog-head h2');if(title)title.textContent='Neues Tattoo';
      const submit=dialog.querySelector('button[type="submit"]');if(submit)submit.textContent='Tattoo anlegen';
    }
  }

  function customerProjects(customerId){return state.projects.filter(project=>project.customerId===customerId);}

  function prepareAppointment(customerId,projectId=''){
    const projects=customerProjects(customerId);
    const project=state.projects.find(item=>item.id===projectId&&item.customerId===customerId)||null;
    const autoProject=project||(projects.length===1?projects[0]:null);
    const date=todayISO();

    openAppointmentDialog('',date);
    const form=document.getElementById('appointmentForm');
    const dialog=document.getElementById('appointmentDialog');
    if(!form||!dialog)return;

    // In customer context show only this customer's tattoo projects.
    const projectSelect=form.elements.projectId;
    if(projectSelect){
      projectSelect.innerHTML='<option value="">Kein Tattoo-Projekt / Beratung</option>'+projects.map(item=>`<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('');
    }
    form.elements.customerId.value=customerId;
    form.elements.projectId.value=autoProject?.id||'';
    form.elements.type.value=autoProject?'tattoo':'consultation';
    form.elements.artist.value=autoProject?.artist||form.elements.artist.value||'Sven';
    form.elements.status.value='Angefragt';
    form.elements.duration.value=autoProject?120:45;
    form.elements.notes.value=autoProject?`Termin für ${autoProject.title}`:'Beratung';

    const returnView=state.currentView;
    const returnProjectId=returnView==='project-detail'?(document.getElementById('projectDetail')?.dataset.projectId||''):'';
    const refreshAfterSave=()=>setTimeout(()=>{
      if(returnView==='customer-detail')openCustomer(customerId);
      else if(returnView==='project-detail'&&returnProjectId)openProject(returnProjectId);
    },0);
    form.addEventListener('submit',refreshAfterSave,{once:true});
  }

  function enhanceCustomer(customerId){
    const root=document.getElementById('customerDetail');if(!root)return;
    const projects=customerProjects(customerId);
    const firstCard=root.querySelector('.detail-hero .detail-card');
    if(firstCard&&!firstCard.querySelector('.customer-primary-actions')){
      const actions=document.createElement('div');actions.className='customer-primary-actions';
      actions.innerHTML=`<button type="button" class="btn primary" data-customer-schedule="${esc(customerId)}">+ Termin vereinbaren</button><button type="button" class="btn ghost" data-customer-new-tattoo="${esc(customerId)}">+ Neues Tattoo</button>`;
      firstCard.appendChild(actions);
    }

    root.querySelectorAll('[data-project-id]').forEach(card=>{
      const projectId=card.dataset.projectId;
      const project=state.projects.find(item=>item.id===projectId&&item.customerId===customerId);if(!project)return;
      if(card.querySelector('.customer-project-actions'))return;
      const actions=document.createElement('div');actions.className='customer-project-actions';
      actions.innerHTML=`<button type="button" class="btn ghost" data-project-schedule="${esc(project.id)}" data-project-customer="${esc(customerId)}">Termin planen</button>`;
      card.querySelector('.project-body')?.appendChild(actions);
    });

    const newProject=document.getElementById('detailNewProject');if(newProject)newProject.textContent='+ Neues Tattoo';
  }

  function enhanceProject(projectId){
    const detail=document.getElementById('projectDetail');
    const project=state.projects.find(item=>item.id===projectId);if(!detail||!project)return;
    const main=detail.querySelector('.project-focus-main');
    if(main&&!detail.querySelector('.project-header-action')){
      const action=document.createElement('div');action.className='project-header-action';
      action.innerHTML=`<button type="button" class="btn primary" data-project-schedule="${esc(project.id)}" data-project-customer="${esc(project.customerId)}">+ Termin vereinbaren</button>`;
      const title=main.querySelector('.project-focus-title');
      if(title)title.appendChild(action);else main.prepend(action);
    }
  }

  function installProjectDropdownSync(){
    const select=document.getElementById('appointmentProjectSelect');if(!select||select.dataset.workflowBound==='1')return;
    select.dataset.workflowBound='1';
    select.addEventListener('change',()=>{
      const form=document.getElementById('appointmentForm');if(!form)return;
      const project=state.projects.find(item=>item.id===select.value);
      if(project){
        form.elements.customerId.value=project.customerId;
        form.elements.artist.value=project.artist||form.elements.artist.value;
        form.elements.type.value='tattoo';
      }
    });
  }

  function installDelegatedActions(){
    document.addEventListener('click',event=>{
      const tab=event.target.closest('.project-tab-btn[data-project-tab]');
      if(tab){
        const detail=tab.closest('#projectDetail');if(detail){
          event.preventDefault();
          const name=tab.dataset.projectTab;
          detail.querySelectorAll('.project-tab-btn[data-project-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.projectTab===name));
          detail.querySelectorAll('[data-project-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.projectPane===name));
          return;
        }
      }

      const customerSchedule=event.target.closest('[data-customer-schedule]');
      if(customerSchedule){event.preventDefault();prepareAppointment(customerSchedule.dataset.customerSchedule);return;}

      const projectSchedule=event.target.closest('[data-project-schedule]');
      if(projectSchedule){
        event.preventDefault();event.stopPropagation();
        prepareAppointment(projectSchedule.dataset.projectCustomer,projectSchedule.dataset.projectSchedule);return;
      }

      const newTattoo=event.target.closest('[data-customer-new-tattoo]');
      if(newTattoo){event.preventDefault();openProjectDialog(newTattoo.dataset.customerNewTattoo);return;}
    },true);
  }

  const previousOpenCustomer=openCustomer;
  openCustomer=function(id){previousOpenCustomer(id);requestAnimationFrame(()=>{renameEntryPoints();enhanceCustomer(id);});};

  const previousOpenProject=openProject;
  openProject=function(id){previousOpenProject(id);requestAnimationFrame(()=>enhanceProject(id));};

  const previousOpenProjectDialog=openProjectDialog;
  openProjectDialog=function(customerId=''){
    previousOpenProjectDialog(customerId);
    requestAnimationFrame(renameEntryPoints);
  };

  installStyle();
  renameEntryPoints();
  installProjectDropdownSync();
  installDelegatedActions();
})();
