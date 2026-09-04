import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const appPath=path.join(root,'app.html');
const landingPath=path.join(root,'index.html');
const app=fs.readFileSync(appPath,'utf8');
const landing=fs.readFileSync(landingPath,'utf8');
const fail=message=>{console.error(`SMOKE CHECK FAILED: ${message}`);process.exitCode=1;};

const scriptRefs=[...app.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map(match=>match[1]);
if(!scriptRefs.length)fail('app.html enthält keine lokalen Script-Referenzen.');

for(const src of scriptRefs){
  if(/^https?:\/\//i.test(src))continue;
  const clean=src.split(/[?#]/)[0];
  if(!fs.existsSync(path.join(root,clean)))fail(`Script aus app.html fehlt: ${clean}`);
}

if(scriptRefs.at(-1)?.split(/[?#]/)[0]!=='project-tabs-runtime.js'){
  fail('project-tabs-runtime.js muss als letzter statischer Script-Controller der App geladen werden.');
}

const landingRefs=[...landing.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map(match=>match[1]);
for(const src of landingRefs){
  if(/^https?:\/\//i.test(src))continue;
  const clean=src.split(/[?#]/)[0];
  if(!fs.existsSync(path.join(root,clean)))fail(`Script aus index.html fehlt: ${clean}`);
}

const forbiddenLegacy=[
  'aftercare.js','audit-fixes.js','audit-followup.js','consent.js','dashboard-ux.js',
  'history-router.js','ink.js','payments.js','project-tabs-fix.js','project-observer-guard.js',
  'ui-polish.js','ui-refresh.js','workflow-ux.js'
];
for(const file of forbiddenLegacy){
  if(fs.existsSync(path.join(root,file)))fail(`Legacy-Datei wurde wieder hinzugefügt: ${file}`);
  if(app.includes(file))fail(`app.html referenziert Legacy-Datei: ${file}`);
}

const eventDrivenModules=['consent-v2.js','ink-v2.js','payments-v2.js','aftercare-v2.js'];
for(const file of eventDrivenModules){
  const full=path.join(root,file);
  if(!fs.existsSync(full)){fail(`Fachmodul fehlt: ${file}`);continue;}
  const source=fs.readFileSync(full,'utf8');
  if(/MutationObserver/.test(source))fail(`${file} darf die Tattoo-Akte nicht per MutationObserver beobachten.`);
  if(!source.includes('tatnera:project-opened'))fail(`${file} reagiert nicht auf tatnera:project-opened.`);
  if(!source.includes('Core.getProject'))fail(`${file} arbeitet nicht über die zentrale Projekt-ID-Auflösung.`);
}

const jsFiles=fs.readdirSync(root).filter(file=>file.endsWith('.js'));
let tabControllerDefinitions=0;
for(const file of jsFiles){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  tabControllerDefinitions+=(source.match(/window\.TatneraProjectTabs\s*=/g)||[]).length;
}
if(tabControllerDefinitions!==1)fail(`Erwartet genau einen TatneraProjectTabs-Controller, gefunden: ${tabControllerDefinitions}`);

if(!process.exitCode)console.log('TATNERA structural smoke check passed.');
