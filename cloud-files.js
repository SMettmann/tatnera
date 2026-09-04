/* TATNERA — private studio file storage via Supabase Storage */
(function(){
  'use strict';
  if(window.TatneraFiles)return;
  const BUCKET='tatnera-files';
  const MAX_SIZE=10*1024*1024;
  const ALLOWED=new Set(['image/jpeg','image/png','image/webp','application/pdf']);

  function auth(){return window.TatneraAuth||null;}
  function client(){return auth()?.client||null;}
  function studioId(){return auth()?.studioId?.()||'';}
  function ready(){return Boolean(client()&&studioId()&&auth()?.user?.()?.id);}
  function safePart(value){return String(value||'record').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'file';}
  function ext(name){const match=String(name||'').match(/(\.[a-zA-Z0-9]{1,8})$/);return match?match[1].toLowerCase():'';}
  function id(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;}
  function validate(file){
    if(!file)throw new Error('Keine Datei ausgewählt.');
    if(file.size>MAX_SIZE)throw new Error('Die Datei ist größer als 10 MB.');
    if(!ALLOWED.has(file.type))throw new Error('Erlaubt sind JPG, PNG, WEBP und PDF.');
    return true;
  }
  function pathFor(kind,recordId,file){
    const suffix=ext(file.name),base=safePart(String(file.name||'datei').replace(/\.[^.]+$/,''));
    return `${studioId()}/${safePart(kind)}/${safePart(recordId)}/${Date.now()}-${id()}-${base}${suffix}`;
  }
  async function upload(file,{kind='files',recordId='general'}={}){
    if(!ready())throw new Error('Cloud-Dateispeicher ist noch nicht verbunden.');
    validate(file);
    const path=pathFor(kind,recordId,file);
    const {data,error}=await client().storage.from(BUCKET).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});
    if(error)throw error;
    return {id:id(),path:data?.path||path,name:file.name,size:file.size,mime:file.type,createdAt:new Date().toISOString()};
  }
  async function signedUrl(path,expiresIn=3600){
    if(!ready()||!path)return '';
    const {data,error}=await client().storage.from(BUCKET).createSignedUrl(path,expiresIn);
    if(error)throw error;
    return data?.signedUrl||'';
  }
  async function remove(path){
    if(!ready()||!path)return;
    const {error}=await client().storage.from(BUCKET).remove([path]);
    if(error)throw error;
  }
  async function download(path){
    if(!ready()||!path)throw new Error('Datei ist nicht verfügbar.');
    const {data,error}=await client().storage.from(BUCKET).download(path);
    if(error)throw error;
    return data;
  }
  function formatSize(bytes){
    const value=Number(bytes)||0;if(value<1024)return `${value} B`;if(value<1024*1024)return `${Math.max(1,Math.round(value/1024))} KB`;return `${(value/1024/1024).toFixed(1).replace('.',',')} MB`;
  }
  window.TatneraFiles={BUCKET,MAX_SIZE,ready,validate,upload,signedUrl,remove,download,formatSize};
})();