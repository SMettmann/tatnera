/* TATNERA & Du — support / questions / bug reports */
(function(){
  'use strict';
  if(window.__tatneraSupportInstalled)return;
  window.__tatneraSupportInstalled=true;

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  let client=null;
  const db=()=>client||(window.supabase?.createClient?(client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)):null);
  const studio=()=>window.TatneraAuth?.studio?.()||null;
  const user=()=>window.TatneraAuth?.user?.()||null;

  function installStyle(){
    if(document.getElementById('tatneraSupportStyle'))return;
    const style=document.createElement('style');style.id='tatneraSupportStyle';style.textContent=`
      .tatnera-support-card{grid-column:1/-1}.tatnera-support-types{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.tatnera-support-type{border:1px solid var(--line);background:var(--panel-2);color:var(--muted);border-radius:999px;padding:8px 11px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.tatnera-support-type.active{background:var(--text);border-color:var(--text);color:var(--panel)}.tatnera-support-hint{font-size:11px;color:var(--muted);margin:0 0 12px}.tatnera-support-success,.tatnera-support-error{display:none;margin-top:10px;padding:9px 11px;border-radius:10px;font-weight:800}.tatnera-support-success{background:#e8f6ec;color:#245f39}.tatnera-support-error{background:#fdeaea;color:#8e3030}.tatnera-support-success.show,.tatnera-support-error.show{display:block}
    `;document.head.appendChild(style);
  }

  function build(){
    const grid=document.querySelector('#tatnera-you .tatnera-you-grid');
    if(!grid||grid.querySelector('[data-tatnera-support-card]'))return;
    const card=document.createElement('article');card.className='tatnera-you-card tatnera-support-card';card.dataset.tatneraSupportCard='true';card.innerHTML=`
      <div class="tatnera-you-icon">🛟</div><h3>Fragen & Support</h3><p>Etwas funktioniert nicht, du hast eine Frage oder brauchst Hilfe? Schreib uns direkt hier.</p>
      <form class="tatnera-you-form" id="tatneraSupportForm">
        <div class="tatnera-support-types" role="group" aria-label="Art der Anfrage">
          <button type="button" class="tatnera-support-type active" data-support-type="Fehler">Fehler melden</button>
          <button type="button" class="tatnera-support-type" data-support-type="Frage">Frage stellen</button>
          <button type="button" class="tatnera-support-type" data-support-type="Support">Sonstiger Support</button>
        </div>
        <input type="hidden" name="category" value="Fehler">
        <input name="title" required maxlength="100" placeholder="Worum geht es kurz?">
        <textarea name="details" required maxlength="2000" placeholder="Beschreibe kurz, was passiert ist oder wobei du Hilfe brauchst."></textarea>
        <p class="tatnera-support-hint">Bei einem Fehler hilft es, kurz dazuzuschreiben, was du gerade gemacht hast und auf welchem Gerät du bist.</p>
        <button class="btn primary" type="submit">An Support senden</button>
      </form>
      <div class="tatnera-support-success" id="tatneraSupportSuccess">✓ Nachricht angekommen. Wir schauen uns das an.</div>
      <div class="tatnera-support-error" id="tatneraSupportError"></div>`;
    grid.appendChild(card);

    card.querySelectorAll('[data-support-type]').forEach(button=>button.addEventListener('click',()=>{
      card.querySelectorAll('[data-support-type]').forEach(item=>item.classList.toggle('active',item===button));
      card.querySelector('[name="category"]').value=button.dataset.supportType||'Support';
    }));
    card.querySelector('#tatneraSupportForm')?.addEventListener('submit',submit);
  }

  async function submit(event){
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('[type="submit"]'),ok=document.getElementById('tatneraSupportSuccess'),bad=document.getElementById('tatneraSupportError');
    ok?.classList.remove('show');bad?.classList.remove('show');
    const api=db(),s=studio(),u=user();
    if(!api||!s?.id||!u?.id){if(bad){bad.textContent='Nachricht konnte nicht gesendet werden. Bitte neu einloggen.';bad.classList.add('show');}return;}
    const data=new FormData(form),category=String(data.get('category')||'Support').trim(),title=String(data.get('title')||'').trim(),details=String(data.get('details')||'').trim();
    button.disabled=true;
    try{
      const {error}=await api.from('feedback_suggestions').insert({studio_id:s.id,user_id:u.id,title:`[Support · ${category}] ${title}`,details,status:'eingegangen'});
      if(error)throw error;
      const currentCategory=category;form.reset();form.querySelector('[name="category"]').value=currentCategory;
      form.querySelectorAll('[data-support-type]').forEach(item=>item.classList.toggle('active',item.dataset.supportType===currentCategory));
      ok?.classList.add('show');
    }catch(error){if(bad){bad.textContent='Senden fehlgeschlagen. Bitte erneut versuchen.';bad.classList.add('show');}console.warn('TATNERA support save failed',error);}finally{button.disabled=false;}
  }

  installStyle();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(build,50),{once:true});else setTimeout(build,50);
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(build,100));
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(build,20));
})();
