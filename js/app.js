import {concat,toWav,toMp3,toOpus} from './export.js';
import * as tts from './tts-model.js';
const $ = id => document.getElementById(id);
const DEF = {rate:1, pitch:1, vol:1, pause:600, limit:1500, voice:''};
const S = {id:null, text:'', pron:'', settings:{...DEF}, chunks:[], cur:-1, token:0};
let voices = [], presets = [], analyzeTimer, saveTimer;

// ---------- helpers ----------
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3500)}
const setStatus = m => $('status').textContent = m;
function download(name, type, data){const u=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
const safeName = s => (s||'book').replace(/[^\w\-]+/g,'_').slice(0,60);

// ---------- IndexedDB ----------
const db = new Promise((res,rej)=>{const r=indexedDB.open('audiobook-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('p',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function tx(mode, fn){const d=await db;return new Promise((res,rej)=>{const t=d.transaction('p',mode);const rq=fn(t.objectStore('p'));t.oncomplete=()=>res(rq.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
function projectData(){const now=new Date().toISOString();return {version:1,id:S.id,title:$('title').value.trim()||'Untitled book',script:S.text,pronunciation:S.pron,settings:S.settings,updatedAt:now,createdAt:S.createdAt||now}}
async function save(manual){
  try{await tx('readwrite',s=>s.put(projectData()));localStorage.setItem('lastId',S.id);await listProjects();if(manual)toast('Saved')}
  catch(e){toast('Could not save: '+(e.name==='QuotaExceededError'?'storage is full.':e.message))}
}
const autosave = () => {clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(false),800)};
async function listProjects(){
  const all=await tx('readonly',s=>s.getAll()).catch(()=>[]);
  const sel=$('projSel');sel.replaceChildren();
  all.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.title;sel.append(o)});
  sel.value=S.id;
}
function load(p){
  stopAll();S.id=p.id;S.createdAt=p.createdAt;S.text=p.script||'';S.pron=p.pronunciation||'';S.settings={...DEF,...(p.settings||{})};
  $('title').value=p.title||'Untitled book';$('editor').value=S.text;$('pron').value=S.pron;syncControls();analyze();listProjects();
}
const newProject = () => load({id:crypto.randomUUID(),title:'Untitled book',script:'',settings:{...DEF}});

// ---------- analysis (Python via PyScript) ----------
function analyze(){
  if(typeof window.analyzeScript!=='function'){$('stats').textContent='Analyzer loading…';return}
  try{
    const r=JSON.parse(window.analyzeScript(S.text,S.settings.limit));
    const st=r.stats;
    $('stats').textContent=`${st.words.toLocaleString()} words · ${st.sentences} sentences · ${st.paragraphs} paragraphs · ${st.chapters} chapters · ~${st.estimated_minutes} min · ~${st.estimated_audio_mb} MB as 64 kbps MP3`;
    $('warn').replaceChildren(...r.warnings.map(w=>{const li=document.createElement('li');li.textContent=w;return li}));
    S.chunks=[];r.chapters.forEach((c,ci)=>c.chunks.forEach(t=>S.chunks.push({ch:ci,title:c.title,text:t})));
    renderChunks();
  }catch(e){$('stats').textContent='Analysis failed: '+e.message}
}
const scheduleAnalyze = () => {clearTimeout(analyzeTimer);analyzeTimer=setTimeout(analyze,300)};
window.addEventListener('pyready',analyze);

function renderChunks(){
  const box=$('chunks');box.replaceChildren();
  if(!S.chunks.length){box.innerHTML='<p class="empty">Nothing to narrate yet. Add some text above.</p>';return}
  const frag=document.createDocumentFragment();let last=-1;
  S.chunks.forEach((c,i)=>{
    if(c.ch!==last){const h=document.createElement('div');h.className='ch';h.textContent=c.title;frag.append(h);last=c.ch}
    const b=document.createElement('button');b.className='chunk';b.dataset.i=i;b.textContent=`${i+1}. ${c.text}`;frag.append(b);
  });
  box.append(frag);mark();fillScope();
}
function mark(){document.querySelectorAll('.chunk.on').forEach(e=>e.classList.remove('on'));const e=document.querySelector(`.chunk[data-i="${S.cur}"]`);if(e){e.classList.add('on');e.scrollIntoView({block:'nearest'})}}

// ---------- speech ----------
const hasTTS = 'speechSynthesis' in window;
function loadVoices(){
  voices=speechSynthesis.getVoices();const sel=$('voice');sel.replaceChildren();
  voices.slice().sort((a,b)=>a.lang.localeCompare(b.lang)||a.name.localeCompare(b.name)).forEach(v=>{const o=document.createElement('option');o.value=v.voiceURI;o.textContent=`${v.name} (${v.lang})`;sel.append(o)});
  $('vnote').textContent=voices.length?`${voices.length} voices from this browser. Availability depends on your device.`:'No voices reported yet. Some browsers load them late.';
  if(S.settings.voice&&voices.some(v=>v.voiceURI===S.settings.voice))sel.value=S.settings.voice;else if(voices.length)S.settings.voice=sel.value;
}
function applyPron(t){
  S.pron.split('\n').forEach(l=>{const i=l.indexOf('=');if(i<1)return;const a=l.slice(0,i).trim(),b=l.slice(i+1).trim();if(a)t=t.split(a).join(b)});
  return t;
}
function run(i,tk){
  if(tk!==S.token)return;
  if(i>=S.chunks.length){S.cur=-1;mark();setStatus('Finished');return}
  S.cur=i;mark();setStatus(`Chunk ${i+1} of ${S.chunks.length}: ${S.chunks[i].title}`);
  const u=new SpeechSynthesisUtterance(applyPron(S.chunks[i].text)),s=S.settings;
  const v=voices.find(v=>v.voiceURI===s.voice);if(v){u.voice=v;u.lang=v.lang}
  u.rate=s.rate;u.pitch=s.pitch;u.volume=s.vol;
  u.onend=()=>{if(tk===S.token)setTimeout(()=>run(i+1,tk),s.pause)};
  u.onerror=e=>{if(tk!==S.token||e.error==='interrupted'||e.error==='canceled')return;toast('Speech failed: '+e.error);setStatus('Failed at chunk '+(i+1))};
  speechSynthesis.speak(u);
}
function playFrom(i){
  if(!hasTTS)return toast('This browser has no Web Speech support.');
  if(!S.chunks.length)return toast('Add some text first.');
  stopAll();S.token++;run(Math.max(0,Math.min(i,S.chunks.length-1)),S.token);
}
function stopAll(){S.token++;if(hasTTS)speechSynthesis.cancel();S.cur=-1;mark();setStatus('Idle')}

// ---------- controls ----------
function syncControls(){
  const s=S.settings;
  ['rate','pitch','vol','pause','limit'].forEach(k=>{$(k).value=s[k];if($(k+'O'))$(k+'O').textContent=s[k]});
  if(s.voice)$('voice').value=s.voice;
}
['rate','pitch','vol','pause','limit'].forEach(k=>$(k).addEventListener('input',()=>{
  S.settings[k]=Number($(k).value)||0;if($(k+'O'))$(k+'O').textContent=$(k).value;if(k==='limit')scheduleAnalyze();autosave()}));
$('voice').addEventListener('change',()=>{S.settings.voice=$('voice').value;autosave()});
$('editor').addEventListener('input',()=>{S.text=$('editor').value;scheduleAnalyze();autosave()});
$('pron').addEventListener('input',()=>{S.pron=$('pron').value;autosave()});
$('title').addEventListener('input',autosave);
$('preset').addEventListener('change',()=>{const p=presets.find(x=>x.id===$('preset').value);if(!p)return;Object.assign(S.settings,{rate:p.rate,pitch:p.pitch,pause:p.pause});syncControls();autosave()});
$('chunks').addEventListener('click',e=>{const b=e.target.closest('.chunk');if(b)playFrom(Number(b.dataset.i))});
$('play').addEventListener('click',()=>playFrom(S.cur>=0?S.cur:0));
$('pauseBtn').addEventListener('click',()=>{if(!hasTTS)return;speechSynthesis.paused?(speechSynthesis.resume(),setStatus('Playing')):(speechSynthesis.pause(),setStatus('Paused'))});
$('stop').addEventListener('click',stopAll);
$('prev').addEventListener('click',()=>playFrom((S.cur<0?0:S.cur)-1));
$('next').addEventListener('click',()=>playFrom((S.cur<0?0:S.cur)+1));
$('newBtn').addEventListener('click',()=>{if(!S.text||confirm('Start a new project? The current one stays saved.'))newProject()});
$('saveBtn').addEventListener('click',()=>save(true));
$('projSel').addEventListener('change',async()=>{const p=await tx('readonly',s=>s.get($('projSel').value)).catch(()=>null);p?load(p):toast('Project not found.')});
$('expBtn').addEventListener('click',()=>{const p=projectData();download(safeName(p.title)+'.project.json','application/json',JSON.stringify(p,null,2));download(safeName(p.title)+'.txt','text/plain',p.script)});
$('themeBtn').addEventListener('click',()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem('theme',t)});

// ---------- import ----------
async function importFile(f){
  if(!f)return;
  try{
    const raw=await f.text();
    if(f.name.endsWith('.json')){
      const j=JSON.parse(raw);
      if(typeof j!=='object'||j===null||typeof (j.script??j.text)!=='string')throw new Error('JSON must contain a "script" text field.');
      load({id:crypto.randomUUID(),title:String(j.title||f.name),script:j.script??j.text,pronunciation:typeof j.pronunciation==='string'?j.pronunciation:'',settings:typeof j.settings==='object'?j.settings:{}});
    }else{S.text=raw;$('editor').value=raw;if($('title').value==='Untitled book')$('title').value=f.name.replace(/\.\w+$/,'');analyze();autosave()}
    toast('Imported '+f.name);
  }catch(e){toast('Import failed: '+e.message)}
}
$('impBtn').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',e=>{importFile(e.target.files[0]);e.target.value=''});
const ed=$('editor');
ed.addEventListener('dragover',e=>{e.preventDefault();ed.classList.add('drag')});
ed.addEventListener('dragleave',()=>ed.classList.remove('drag'));
ed.addEventListener('drop',e=>{e.preventDefault();ed.classList.remove('drag');importFile(e.dataTransfer.files[0])});

// ---------- keyboard ----------
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select'))return;
  if(e.code==='Space'){e.preventDefault();S.cur>=0?$('pauseBtn').click():playFrom(0)}
  if(e.key==='ArrowRight')$('next').click();
  if(e.key==='ArrowLeft')$('prev').click();
});

// ---------- init ----------
function netState(){const n=$('net');n.textContent=navigator.onLine?'Online':'Offline';n.classList.toggle('off',!navigator.onLine)}
addEventListener('online',netState);addEventListener('offline',netState);
addEventListener('beforeunload',()=>{if(hasTTS)speechSynthesis.cancel()});
(async function init(){
  netState();
  document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  try{presets=(await (await fetch('config/presets.json')).json()).presets}catch{presets=[];toast('Presets failed to load.')}
  const ps=$('preset');presets.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;ps.append(o)});
  if(hasTTS){speechSynthesis.addEventListener('voiceschanged',loadVoices);loadVoices()}else{$('vnote').textContent='Web Speech is not supported in this browser.';$('play').disabled=true}
  const last=localStorage.getItem('lastId');
  const p=last&&await tx('readonly',s=>s.get(last)).catch(()=>null);
  p?load(p):newProject();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
})();

// ---------- audio generation and export (real audio, not Web Speech) ----------
const A = {clips:[], sr:16000, token:0, busy:false, url:null};
let amodels = [];
const aStatus = m => $('astat').textContent = m;
function fillScope(){
  const sel=$('scope'),keep=sel.value,seen=new Map();
  S.chunks.forEach(c=>seen.set(c.ch,c.title));
  sel.replaceChildren(new Option('Whole script','all'));
  seen.forEach((t,i)=>sel.append(new Option(t,String(i))));
  sel.value=[...sel.options].some(o=>o.value===keep)?keep:'all';
}
async function generate(){
  if(A.busy){A.token++;return}
  const m=amodels.find(x=>x.id===$('amodel').value);
  if(!m)return toast('No exportable voice model configured.');
  const list=S.chunks.filter(c=>$('scope').value==='all'||String(c.ch)===$('scope').value);
  if(!list.length)return toast('Add some text first.');
  if(!tts.isLoaded(m.hf)&&!confirm(`Download “${m.name}” (${m.size})? It is cached by your browser afterward. These MMS models are licensed for non-commercial use.`))return;
  A.busy=true;const tk=++A.token;A.clips=[];$('expAudio').disabled=true;$('genBtn').textContent='Cancel';
  try{
    aStatus('Loading model…');
    await tts.loadModel(m.hf,p=>{if(p.status==='progress')aStatus(`Downloading model ${Math.round(p.progress)}%`)});
    for(let i=0;i<list.length;i++){
      if(tk!==A.token)throw new Error('cancelled');
      aStatus(`Generating chunk ${i+1} of ${list.length} (${Math.round(i/list.length*100)}%)`);
      const r=await tts.synth(applyPron(list[i].text));
      A.clips.push(r.pcm);A.sr=r.sr;
      await new Promise(r=>setTimeout(r));
    }
    const pcm=concat(A.clips,A.sr,S.settings.pause);
    if(A.url)URL.revokeObjectURL(A.url);
    A.url=URL.createObjectURL(toWav(pcm,A.sr));$('aprev').src=A.url;$('aprev').hidden=false;
    $('expAudio').disabled=false;aStatus(`Ready: ${(pcm.length/A.sr/60).toFixed(1)} min of audio. Choose a format and download.`);
  }catch(e){
    A.clips=[];
    if(e.message==='cancelled')aStatus('Cancelled.');
    else{aStatus('Failed: '+e.message);toast('Audio generation failed. Check your connection and try again.')}
  }finally{A.busy=false;$('genBtn').textContent='Generate audio'}
}
async function exportAudio(){
  if(!A.clips.length)return toast('Generate audio first.');
  const fmt=$('fmt').value,btn=$('expAudio');btn.disabled=true;
  try{
    const pcm=concat(A.clips,A.sr,S.settings.pause);
    const sc=$('scope').value,base=safeName($('title').value)+(sc==='all'?'':'_'+safeName($('scope').selectedOptions[0].textContent));
    let blob,ext;
    if(fmt==='wav'){blob=toWav(pcm,A.sr);ext='wav'}
    else if(fmt==='mp3'){blob=await toMp3(pcm,A.sr,p=>aStatus(`Encoding MP3 ${p}%`));ext='mp3'}
    else{aStatus('Encoding Opus in real time…');blob=await toOpus(pcm,A.sr);ext=blob.type.includes('ogg')?'ogg':'webm'}
    download(`${base}.${ext}`,blob.type,blob);aStatus(`Exported ${base}.${ext}`);
  }catch(e){aStatus('Export failed: '+e.message);toast('Export failed: '+e.message)}
  finally{btn.disabled=false}
}
$('genBtn').addEventListener('click',generate);
$('expAudio').addEventListener('click',exportAudio);
(async()=>{
  try{
    amodels=(await (await fetch('config/models.json')).json()).models.filter(m=>m.exportable&&m.hf);
    amodels.forEach(m=>$('amodel').append(new Option(m.name,m.id)));
  }catch{aStatus('Could not load model list.')}
  fillScope();
})();
