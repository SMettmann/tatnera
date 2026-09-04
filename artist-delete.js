/* TATNERA — artist delete UI
   Artists can be removed from future selection without rewriting historical tattoos or appointments. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;

  function installStyle(){
    if(document.getElementById('tatneraArtistDeleteStyle'))return;
    const style=document.createElement('style');style.id='tatneraArtistDeleteStyle';style.textContent=`
      .artist-delete-btn{border-color:#7d3232!important;color:#d87373!important}
      .artist-delete-btn:hover{background:#3a1818!important;color:#fff!important}
    `;document.head.appendChild(style);
  }

  function enhance(){
    const panel=document.getElementById('artistSettingsPanel');if(!panel)return;
    panel.querySelectorAll('.artist-settings-row').forEach(row=>{
      if(row.querySelector('[data-delete-artist]'))return;
      const rename=row.querySelector('[data-rename-artist]');if(!rename)return;
      const button=document.createElement('button');button.type='button';button.className='btn ghost artist-delete-btn';button.dataset.deleteArtist=rename.dataset.renameArtist;button.textContent='Löschen';
      rename.parentElement?.appendChild(button);
    });
  }

  document.addEventListener('click',event=>{
    const add=event.target.closest('[data-add-artist]');
    if(add){
      event.preventDefault();event.stopImmediatePropagation();
      const name=prompt('Name des Artists:');if(name)Core.addArtist(name,{restore:true});
      return;
    }

    const button=event.target.closest('[data-delete-artist]');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    const artist=Core.getArtists(false).find(item=>item.id===button.dataset.deleteArtist);if(!artist)return;
    if(artist.active!==false&&Core.getArtists(true).length<=1){alert('Mindestens ein aktiver Artist muss vorhanden bleiben. Lege zuerst einen weiteren Artist an.');return;}
    if(!confirm(`Artist „${artist.name}“ wirklich löschen?\n\nBereits zugeordnete Tattoos und Termine behalten den bisherigen Artist-Namen.`))return;
    if(!Core.deleteArtist(artist.id))alert('Der Artist konnte nicht gelöscht werden.');
  },true);

  document.addEventListener('tatnera:artists-changed',()=>requestAnimationFrame(enhance));
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(enhance));
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="settings"],[data-view-target="settings"]'))setTimeout(enhance,150);});

  installStyle();
  [0,250,800].forEach(delay=>setTimeout(enhance,delay));
})();
