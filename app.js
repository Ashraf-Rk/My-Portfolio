(()=>{
/* =========================================================
   CONFIG — paste your Firebase web config here to enable cloud
   sync (see SETUP.md). Leave null to run on IndexedDB only.
   ========================================================= */
const FIREBASE_CONFIG = null;

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtMonth=v=>{if(!v)return '';const [y,m]=String(v).split('-');return m?`${MONTHS[+m-1]||''} ${y}`:y};
const safeUrl=u=>{u=String(u||'').trim();if(!u)return '#';if(/^(https?:|mailto:|tel:)/i.test(u))return u;if(/^[\w-]+(\.[\w-]+)+/.test(u))return 'https://'+u;return '#'};
const safeName=n=>String(n||'file').replace(/[^\w.\-]+/g,'_');
const fmtSize=b=>b>1e6?(b/1e6).toFixed(1)+' MB':Math.max(1,Math.round(b/1e3))+' KB';
const I={
 arrow:'<svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
 up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l16 16M20 4 4 20"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z"/></svg>',
 spark:'<svg viewBox="0 0 48 48" fill="currentColor"><path d="M24 2c2.2 13.8 7.9 19.6 22 22-14.1 2.4-19.8 8.2-22 22-2.2-13.8-7.9-19.6-22-22 14.1-2.4 19.8-8.2 22-22Z"/></svg>',
 globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9.25"/><path d="M12 2.75c2.6 2.3 4 5.8 4 9.25s-1.4 6.95-4 9.25c-2.6-2.3-4-5.8-4-9.25s1.4-6.95 4-9.25zM2.75 12h18.5"/></svg>',
 file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'
};

/* ---------- state ---------- */
const state={ready:false,view:null,pending:null,admin:false};
let DB=null, isAdmin=false, lenis=null;
const urlCache=new Map(), cleanups=[];

/* ---------- IndexedDB (kv + blobs) ---------- */
const idb={db:null,mem:{kv:new Map(),blobs:new Map()},
 open(){return new Promise(res=>{try{const r=indexedDB.open('ashraf-portfolio',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('kv');d.createObjectStore('blobs')};r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>res()}catch(e){res()}})},
 req(s,m,fn){return new Promise(res=>{try{const r=fn(this.db.transaction(s,m).objectStore(s));r.onsuccess=()=>res(r.result);r.onerror=()=>res()}catch(e){res()}})},
 get(s,k){return this.db?this.req(s,'readonly',o=>o.get(k)):Promise.resolve(this.mem[s].get(k))},
 set(s,k,v){if(!this.db){this.mem[s].set(k,v);return Promise.resolve()}return this.req(s,'readwrite',o=>o.put(v,k))},
 del(s,k){if(!this.db){this.mem[s].delete(k);return Promise.resolve()}return this.req(s,'readwrite',o=>o.delete(k))}};

/* ---------- seed data (everything below is editable from the admin panel) ---------- */
function seed(){return{
 v:1,updatedAt:0,seed:true,files:{},
 profile:{name:'Ashraf Rakkab',eyebrow:'Portfolio · Open to opportunities',
  roles:['Computer Science student','Smart & Sustainable Cities engineer','Community activist','Builder of useful things'],
  headline:'I turn ideas about smart, sustainable cities into working software — and into real community impact.',
  statement:'I study computer science and smart & sustainable cities engineering — and I build projects and community work that make cities smarter, greener and fairer.',
  bio:'I am a computer science student and a smart & sustainable cities engineering student, and an active volunteer in my community.\n\nI like projects where code meets the real world: energy systems, web platforms, data and learning programs that help people grow.\n\nThis site collects my projects, certificates and external activities in one place.',
  tags:['Computer Science','Smart & Sustainable Cities','Community Activism'],
  skills:['Python','JavaScript','HTML & CSS','Data analysis','Smart cities','Sustainability','Mentoring','Web design'],
  band:['Code','Build','Sustain'],photo:''},
 contacts:{email:'',linkedin:'',whatsapp:'',github:''},
 projects:[
  {id:'ecogrid',title:'EcoGrid',category:'Web platform · Smart energy',year:'2026',status:'In progress',role:'Developer',featured:true,
   caption:'A web platform for monitoring a smart energy grid — with an invoice system, a manual simulation mode and PDF / CSV / Excel export.',
   description:'EcoGrid is a web project about making energy use visible and manageable.\n\nIt includes an invoice system, a manual simulation mode that lets you trigger and test scenarios by hand, and export tools (PDF, CSV and Excel) so the data can leave the dashboard and be used elsewhere. The project also has its own logo and branding.\n\nEdit this text in the admin panel to describe the goals, your role and what you learned.',
   tags:['HTML','CSS','JavaScript','Smart energy','Dashboard'],images:[],links:[],files:[],code:[],
   suggestions:['Dashboard overview screenshot','Invoice page with PDF / CSV / Excel export','Manual simulation mode in action','Logo and branding board','Architecture or data-flow diagram']},
  {id:'car-rental',title:'Car Rental Website',category:'Web design · Group project',year:'2026',status:'In progress',role:'Web designer',featured:true,
   caption:'A multi-page car rental website — home, About Us, a cars catalogue and a booking form — with a report on an AI feature.',
   description:'A group assignment for a web design course: a complete car rental website with a home page, an About Us page, a Cars page and a booking form.\n\nThe project also includes a short report about an AI feature that could improve the site.\n\nEdit this text in the admin panel to describe your part of the work.',
   tags:['HTML','CSS','JavaScript','Web design','Forms'],images:[],links:[],files:[],code:[],
   suggestions:['Home page hero','Cars listing page','Booking form','About Us page','AI feature report cover']}
 ],
 certificates:[
  {id:'c-python',title:'Python — 300 hours',issuer:'freeCodeCamp',category:'Programming',date:'',hours:300,sessions:0,meetings:0,description:'Completed the Python learning path (about 300 hours).',url:'',fileId:''}
 ],
 activities:[
  {id:'a-mentor',title:'Scholarship Mentoring Program',org:'Community program',role:'Designer & trainer',start:'',end:'',description:'Designed and runs a structured 24-session mentoring program that guides students through scholarship applications — trainer guide, student materials and live sessions.',link:'',imageId:''}
 ]}}
function normalize(d){const b=seed();return{...b,...d,profile:{...b.profile,...(d.profile||{})},contacts:{...b.contacts,...(d.contacts||{})},files:d.files||{},projects:d.projects||[],certificates:d.certificates||[],activities:d.activities||[]}}

/* ---------- files ---------- */
const fileSrc=id=>id?(urlCache.get(id)||''):'';
async function resolveFiles(){for(const [id,m] of Object.entries(DB.files||{})){if(urlCache.has(id))continue;const b=await idb.get('blobs',id);if(b)urlCache.set(id,URL.createObjectURL(b));else if(m.url)urlCache.set(id,m.url)}}
async function prepImage(file,max=1800){
 if(!/^image\/(png|jpe?g|webp)$/i.test(file.type))return file;
 const bmp=await createImageBitmap(file).catch(()=>null);if(!bmp)return file;
 const s=Math.min(1,max/Math.max(bmp.width,bmp.height));if(s===1&&file.size<1.2e6)return file;
 const c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
 const out=await new Promise(r=>c.toBlob(b=>r(b),'image/webp',.88));return out&&out.size<file.size?out:file}
async function addFile(file,{image=false}={}){const blob=image?await prepImage(file):file;const id=uid();await idb.set('blobs',id,blob);DB.files[id]={name:file.name,type:blob.type||file.type,size:blob.size};urlCache.set(id,URL.createObjectURL(blob));touch();return id}
async function removeFile(id){if(!id)return;await idb.del('blobs',id);delete DB.files[id];urlCache.delete(id);touch()}
const isImg=id=>/^image\//.test(DB.files[id]?.type||'');
function pick(cb,accept='*/*',multiple=false){const i=document.createElement('input');i.type='file';i.accept=accept;i.multiple=multiple;i.onchange=()=>{if(i.files.length)cb([...i.files])};i.click()}
function blobToDataURL(b){return new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)})}

/* ---------- saving ---------- */
let saveT=0,pushT=0;
function setStatus(t){const e=$('#admStatus');if(e)e.textContent=t}
function touch(){DB.updatedAt=Date.now();DB.seed=false;clearTimeout(saveT);setStatus('Saving…');saveT=setTimeout(async()=>{await idb.set('kv','site',DB);setStatus(cloud.ready&&cloud.user?'Saved locally · syncing…':'Saved on this device ✓');if(cloud.ready&&cloud.user){clearTimeout(pushT);pushT=setTimeout(()=>cloud.push(),900)}},450)}

/* ---------- cloud (Firebase, optional) ---------- */
const cloud={ready:false,user:null,
 async init(){
  const cfg=FIREBASE_CONFIG||await idb.get('kv','cloudcfg');if(!cfg)return;
  try{const base='https://www.gstatic.com/firebasejs/10.12.2/';
   const [a,f,au,st]=await Promise.all(['firebase-app.js','firebase-firestore.js','firebase-auth.js','firebase-storage.js'].map(x=>import(base+x)));
   this.m={...a,...f,...au,...st};this.app=a.initializeApp(cfg);this.db=f.getFirestore(this.app);this.auth=au.getAuth(this.app);this.st=st.getStorage(this.app);this.ready=true;
   await new Promise(res=>{let first=true;au.onAuthStateChanged(this.auth,u=>{this.user=u;isAdmin=!!u;if(first){first=false;res()}else updateAdminUI()})});
  }catch(e){console.warn('Cloud init failed',e);this.ready=false}},
 async pull(force){if(!this.ready)return false;try{const s=await this.m.getDoc(this.m.doc(this.db,'site','main'));if(!s.exists())return false;const r=JSON.parse(s.data().json);
   if(force||(r.updatedAt||0)>(DB.updatedAt||0)){DB=normalize(r);await idb.set('kv','site',DB);await resolveFiles();return true}}catch(e){console.warn('pull',e)}return false},
 async push(){if(!this.ready||!this.user)return;setStatus('Syncing to cloud…');
  try{for(const [id,m] of Object.entries(DB.files)){if(m.url)continue;const b=await idb.get('blobs',id);if(!b)continue;const r=this.m.ref(this.st,'files/'+id+'-'+safeName(m.name));await this.m.uploadBytes(r,b,{contentType:m.type});m.url=await this.m.getDownloadURL(r)}
   const json=JSON.stringify(DB);if(json.length>950000)setStatus('Warning: data is close to the 1 MB cloud limit — shorten code files.');
   await this.m.setDoc(this.m.doc(this.db,'site','main'),{json,updatedAt:DB.updatedAt});await idb.set('kv','site',DB);if(json.length<=950000)setStatus('Synced to cloud ✓')}
  catch(e){setStatus('Cloud sync failed: '+(e.code||e.message))}}};

/* ---------- local admin auth ---------- */
async function hashPw(pw,salt){
 if(crypto.subtle){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);const b=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:150000},k,256);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 let h=2166136261;const s=pw+[...salt].join(',');for(let r=0;r<5000;r++)for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return String(h>>>0)}
const sess={get:()=>{try{return sessionStorage.getItem('ar_admin')==='1'}catch(e){return false}},set:v=>{try{v?sessionStorage.setItem('ar_admin','1'):sessionStorage.removeItem('ar_admin')}catch(e){}}};

/* ---------- scroll lock / lenis ---------- */
let locks=0;
function lock(){if(locks++===0){lenis&&lenis.stop();document.documentElement.classList.add('locked')}}
function unlock(){if(--locks<=0){locks=0;lenis&&lenis.start();document.documentElement.classList.remove('locked')}}
function scrollToId(id){const el=document.getElementById(id);if(!el)return;const top=el.getBoundingClientRect().top+window.pageYOffset-(id==='home'?0:70);if(lenis)lenis.scrollTo(top,{duration:1.2});else window.scrollTo({top,behavior:'smooth'})}
function goSection(id){closeNav();if(state.view!=='home'){state.pending=id;location.hash='#/'}else scrollToId(id)}

/* ---------- adaptive grid ---------- */
function applyAdaptiveGrid(){const B=16,bw=1920,coef=.6666,w=innerWidth;const red=((bw-w)/bw)*100;const size=B-(B*(red*coef))/100;if(size>B)document.documentElement.style.fontSize=size+'px';else document.documentElement.style.removeProperty('font-size')}

/* ---------- placeholders ---------- */
const hash=s=>[...String(s)].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
function coverSVG(t){const pal=[['#0f9d78','#0b7f95'],['#2fd1a1','#0b7f95'],['#0b7f95','#14532d'],['#14b88a','#0f5f6b']];const [a,b]=pal[hash(t)%4];const ini=String(t||'?').split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity=".13"/></pattern></defs><rect width="800" height="500" fill="url(#g)"/><rect width="800" height="500" fill="url(#p)"/><circle cx="650" cy="110" r="170" fill="#fff" fill-opacity=".09"/><circle cx="120" cy="420" r="120" fill="#000" fill-opacity=".08"/><text x="48" y="440" font-family="Onest,Arial,sans-serif" font-size="150" font-weight="700" fill="#fff" fill-opacity=".92">${ini.replace(/[<&]/g,'')}</text></svg>`;return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg)}
function photoPlaceholder(){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2fd1a1"/><stop offset="1" stop-color="#0b7f95"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="400" cy="390" r="150" fill="#fff" fill-opacity=".85"/><path d="M120 1000c0-210 120-340 280-340s280 130 280 340z" fill="#fff" fill-opacity=".85"/><text x="400" y="930" text-anchor="middle" font-family="Onest,Arial,sans-serif" font-size="38" font-weight="600" fill="#08130f" fill-opacity=".7">Add your photo in Admin → Profile</text></svg>`;return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg)}
const photoURL=()=>fileSrc(DB.profile.photo)||'photo.jpg';
const photoPos=()=>DB.profile.photoPos||(DB.profile.photo?'50% 25%':'16% 50%');
const coverOf=p=>{const im=(p.images||[]).find(i=>i.cover)||(p.images||[])[0];return im&&fileSrc(im.fileId)||coverSVG(p.title)};

/* ---------- builders ---------- */
const lines=a=>a.map((t,i)=>`<span class="ln"><span style="--i:${i}">${esc(t)}</span></span>`).join('');
const words=t=>String(t).split(/\s+/).map((w,i)=>`<span class="wd" style="--i:${i}">${esc(w)}</span>`).join(' ');
const sum=(arr,k)=>arr.reduce((a,c)=>a+(+c[k]||0),0);
const paras=t=>String(t||'').split(/\n{2,}|\n/).filter(s=>s.trim()).map(s=>`<p>${esc(s)}</p>`).join('');
const names=()=>{const n=(DB.profile.name||'').trim().split(/\s+/);return[n[0]||'',n.slice(1).join(' ')||'']};
const sortedCerts=()=>[...DB.certificates].map((c,i)=>({c,i})).sort((a,b)=>(b.c.date||'').localeCompare(a.c.date||'')||a.i-b.i).map(x=>x.c);
function contactLinks(){const c=DB.contacts,out=[];if(c.email)out.push({l:'Email',h:'mailto:'+c.email,t:c.email});if(c.linkedin)out.push({l:'LinkedIn',h:safeUrl(c.linkedin),t:'LinkedIn'});if(c.whatsapp)out.push({l:'WhatsApp',h:'https://wa.me/'+String(c.whatsapp).replace(/\D/g,''),t:'WhatsApp'});if(c.github)out.push({l:'GitHub',h:safeUrl(c.github),t:'GitHub'});return out}

function heroHTML(){const p=DB.profile,[f,l]=names();const hrs=Math.round(sum(DB.certificates,'hours'));
 return `<section id="home" class="hero"><div class="hero-bg" aria-hidden="true"><i></i><i></i><i></i></div><div class="wm" aria-hidden="true">${esc((l||f).toUpperCase())}</div>
 <div class="shell hero-grid"><div class="hero-l">
  <div class="eyebrow rv" style="--d:200ms"><i></i>${esc(p.eyebrow)}</div>
  <h1 class="h1 rv-l" id="h1">${lines([f,l].filter(Boolean))}</h1>
  <div class="roleline rv" style="--d:650ms"><span>I'm a</span><span class="rotor"><span class="rotor-in" id="rotor">${(p.roles.length?p.roles:['Student']).map(r=>`<span>${esc(r)}</span>`).join('')}</span></span></div>
  <p class="lead rv" style="--d:750ms">${esc(p.headline)}</p>
  <div class="mini rv" style="--d:850ms"><div><b>${DB.projects.length}</b><span>Projects</span></div><div><b>${DB.certificates.length}</b><span>Certificates</span></div><div><b>${hrs}h</b><span>Learning hours</span></div></div>
  <div class="cta rv" style="--d:950ms"><button class="btn dark mag" data-open="contact">Let's talk ${I.arrow}</button><button class="btn outline mag" data-go="works">View work</button></div>
 </div>
 <div class="hero-r"><div class="photo rv" id="photoBox" style="--d:400ms">
  <div class="photo-frame" id="photoFrame"><img class="ph-base" src="${photoURL()}" style="object-position:${photoPos()}" alt="Portrait of ${esc(p.name)}"><div class="ph-tint"></div><canvas class="ph-cv" aria-hidden="true"></canvas><span class="ph-hint">Move your cursor ✦</span></div>
  <div class="chip c1" data-depth="26">${I.spark}${esc(p.tags[0]||'Computer Science')}</div>
  <div class="chip c2" data-depth="-20">${I.globe}${esc(p.tags[1]||'Smart Cities')}</div>
  <div class="chip c3" data-depth="32">${I.star}${esc(p.tags[2]||'Community')}</div>
  <div class="hcard" id="hcard" role="link" tabindex="0"></div>
 </div></div></div></section>
 <div class="shell"><div class="marq" aria-hidden="true"><div class="marq-t">${[0,1].map(()=>p.skills.map(s=>`<span>${esc(s)}</span>`).join('')).join('')}</div></div></div>`}

function aboutHTML(){const p=DB.profile;const st=esc(p.statement);
 return `<section id="about" class="sec"><div class="shell"><div class="about"><div><span class="kick rv">About</span><p class="statement rv-w" id="stmt" style="margin-top:1.25rem">${words(p.statement)}</p></div>
 <div class="bio rv" style="--d:200ms">${paras(p.bio)}<div class="pills">${p.tags.map(t=>`<span class="pill">${I.spark.replace('<svg','<svg style="color:var(--accent);font-size:.7rem"')}${esc(t)}</span>`).join('')}</div></div></div>
 <div class="band rv"><span class="bp">${esc(p.band[0]||'Code')}</span><span class="bp l">${esc(p.band[1]||'Build')}</span><span class="bp l" style="min-width:auto">${I.arrow}</span><span class="bp">${esc(p.band[2]||'Sustain')}</span></div></div></section>`}

function cardHTML(p,i){
 return `<article class="pcard rv" data-id="${p.id}" style="--d:${(i%2)*120}ms"><div class="pc-img tilt" data-toggle><img src="${coverOf(p)}" alt="${esc(p.title)} cover" loading="lazy"><span class="pc-status">${esc(p.status||'')}</span></div>
 <div class="pc-body"><div class="pc-meta"><span>${esc(p.category)}</span><span>${esc(p.year)}</span></div><h3 data-toggle>${esc(p.title)}</h3><p class="cap">${esc(p.caption)}</p>
 <div class="tags">${(p.tags||[]).slice(0,5).map(t=>`<span>${esc(t)}</span>`).join('')}</div>
 <button class="pc-toggle" data-toggle aria-expanded="false">Quick look ${I.plus}</button>
 <div class="pc-more"><div class="pc-in"><div>${paras((p.description||'').split(/\n/).slice(0,2).join('\n\n'))}
 ${(p.links||[]).length?`<div class="rowlinks">${p.links.map(l=>`<a class="lchip" target="_blank" rel="noopener" href="${esc(safeUrl(l.url))}">${I.up}${esc(l.label||'Link')}</a>`).join('')}</div>`:''}
 <div><a class="btn accent sm" href="#/project/${p.id}">View more ${I.arrow}</a></div></div></div></div></div></article>`}
function worksHTML(){return `<section id="works" class="sec"><div class="shell"><div class="sec-h"><div><span class="kick rv">Selected work</span><h2 class="h2 rv" style="--d:100ms">Projects</h2></div><p class="rv" style="--d:150ms">Tap a card for a quick look, or open the full project page for images, files and code.</p></div>
 ${DB.projects.length?`<div class="cards">${DB.projects.map(cardHTML).join('')}</div>`:'<div class="empty">No projects yet — add one from the admin panel.</div>'}</div></section>`}

function certCardHTML(c,i){const th=c.fileId&&isImg(c.fileId)?`<div class="cc-thumb"><img src="${fileSrc(c.fileId)}" alt="" loading="lazy" draggable="false"></div>`:'';
 return `<article class="ccard" data-cert="${c.id}" style="--i:${i}" tabindex="0"><div class="cc-top"><span class="iss">${esc(c.issuer||'Certificate')}</span><span>${esc(fmtMonth(c.date))}</span></div>${th}<h3>${esc(c.title)}</h3>${c.description?`<p class="cd">${esc(c.description)}</p>`:''}
 <div class="cc-m"><div><b>${+c.hours||0}</b><span>Hours</span></div><div><b>${+c.sessions||0}</b><span>Sessions</span></div><div><b>${+c.meetings||0}</b><span>Meetings</span></div></div></article>`}
function totalsHTML(){const c=DB.certificates;return `<div class="totals"><div class="tot rv"><b data-count="${c.length}">0</b><span>Certificates</span></div><div class="tot rv" style="--d:70ms"><b data-count="${Math.round(sum(c,'hours'))}">0</b><span>Learning hours</span></div><div class="tot rv" style="--d:140ms"><b data-count="${Math.round(sum(c,'sessions'))}">0</b><span>Sessions</span></div><div class="tot rv" style="--d:210ms"><b data-count="${Math.round(sum(c,'meetings'))}">0</b><span>Meetings</span></div></div>`}
function certTeaserHTML(){const cs=sortedCerts().slice(0,6);
 return `<section id="certificates" class="sec" style="padding-top:0"><div class="shell"><div class="sec-h"><div><span class="kick rv">Learning</span><h2 class="h2 rv" style="--d:100ms">Certificates</h2></div><a class="btn dark rv" href="#/certificates" style="align-self:flex-start">Open all certificates ${I.arrow}</a></div>${totalsHTML()}
 ${cs.length?`<div class="railwrap"><div class="rail" id="railHome">${cs.map(certCardHTML).join('')}</div><div class="rbar"><div class="rprog"><i></i></div><div class="arrows"><button data-rail="-1" aria-label="Previous">${I.arrow.replace('class="arr"','style="transform:rotate(180deg)"')}</button><button data-rail="1" aria-label="Next">${I.arrow}</button></div></div></div>`:'<div class="empty">No certificates yet.</div>'}</div></section>`}

function actRow(a,i){const dates=[fmtMonth(a.start),a.end?fmtMonth(a.end):(a.start?'Present':'')].filter(Boolean).join(' – ');
 return `<div class="arow rv" data-act style="--d:${i*60}ms"><div class="ar-h"><span class="ar-n">${String(i+1).padStart(2,'0')}</span><div class="ar-t">${esc(a.title)}<small>${esc([a.org,a.role].filter(Boolean).join(' · '))}</small></div><span class="ar-d">${esc(dates)}</span><span class="ar-i">${I.plus}</span></div>
 <div class="ar-m"><div class="ar-mi"><div><div>${paras(a.description)}${a.link?`<p style="margin-top:1rem"><a class="lchip" target="_blank" rel="noopener" href="${esc(safeUrl(a.link))}">${I.up}Learn more</a></p>`:''}</div>${a.imageId&&fileSrc(a.imageId)?`<div class="ar-img"><img src="${fileSrc(a.imageId)}" alt="" loading="lazy"></div>`:''}</div></div></div></div>`}
function activitiesHTML(){return `<section id="activities" class="sec" style="padding-top:0"><div class="shell"><div class="sec-h"><div><span class="kick rv">Beyond the classroom</span><h2 class="h2 rv" style="--d:100ms">Activities</h2></div><p class="rv" style="--d:150ms">Volunteering, programs and community work outside my studies.</p></div>${DB.activities.length?`<div class="alist">${DB.activities.map(actRow).join('')}</div>`:'<div class="empty">No activities yet.</div>'}</div></section>`}
function statsHTML(){const c=DB.certificates;return `<section class="sec" style="padding-top:0"><div class="shell"><div class="stats rv"><div><b data-count="${DB.projects.length}">0</b><span>Projects built</span></div><div><b data-count="${c.length}">0</b><span>Certificates earned</span></div><div><b data-count="${Math.round(sum(c,'hours'))}" data-suffix="h">0</b><span>Learning hours</span></div><div><b data-count="${DB.activities.length}">0</b><span>Activities</span></div></div></div></section>`}
function footerHTML(){const [f,l]=names();const cl=contactLinks();
 return `<footer id="contact" class="foot"><div class="shell"><div class="foot-cta"><span class="kick" style="color:var(--af)">Contact</span><h2>Let's build something meaningful.</h2><button class="btn light mag" data-open="contact">Start a conversation ${I.arrow}</button></div>
 <div class="foot-cols"><div><h4>${esc(DB.profile.name)}</h4><p style="color:rgba(255,255,255,.6);max-width:30ch;line-height:1.6;font-size:.92rem">${esc(DB.profile.tags.join(' · '))}</p></div>
 <div><h4>Navigate</h4><ul><li><button data-go="home">Home</button></li><li><button data-go="works">Projects</button></li><li><a href="#/certificates">Certificates</a></li><li><button data-go="activities">Activities</button></li></ul></div>
 <div><h4>Elsewhere</h4><ul>${cl.length?cl.map(c=>`<li><a target="_blank" rel="noopener" href="${esc(c.h)}">${esc(c.l)}</a></li>`).join(''):'<li style="color:rgba(255,255,255,.4)">Coming soon</li>'}</ul></div>
 <div><h4>Site</h4><ul><li><button data-go="about">About</button></li><li><button id="toTop">Back to top ↑</button></li></ul></div></div>
 <div class="foot-wm" aria-hidden="true">${esc((f+' '+l).toUpperCase())}</div>
 <div class="foot-bot"><span>© ${new Date().getFullYear()} ${esc(DB.profile.name)}</span><button data-admin>Admin</button></div></div></footer>`}
const homeHTML=()=>heroHTML()+aboutHTML()+worksHTML()+certTeaserHTML()+activitiesHTML()+statsHTML();

/* certificates page */
const cview={cat:'All',q:'',sort:'new',mode:'rail'};
function certsPageHTML(){const cats=['All',...new Set(DB.certificates.map(c=>c.category).filter(Boolean))];
 return `<section class="pagehead"><div class="shell"><a class="crumb" href="#/">${I.arrow} Back home</a><span class="kick rv" style="display:flex">Learning record</span><h1 class="h2 rv" style="--d:100ms;font-size:3.25rem">Certificates</h1></div></section>
 <section class="sec" style="padding-top:2rem"><div class="shell">${totalsHTML()}
 <div class="ctrl"><div class="fchips" id="fchips">${cats.map(c=>`<button class="fc ${c===cview.cat?'on':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
 <input class="search" id="csearch" type="search" placeholder="Search certificates…" value="${esc(cview.q)}" aria-label="Search certificates">
 <div class="seg" id="csort"><button data-sort="new" class="${cview.sort==='new'?'on':''}">Newest</button><button data-sort="hours" class="${cview.sort==='hours'?'on':''}">Most hours</button></div>
 <div class="seg" id="cmode"><button data-mode="rail" class="${cview.mode==='rail'?'on':''}">Rail</button><button data-mode="grid" class="${cview.mode==='grid'?'on':''}">Grid</button></div></div>
 <div class="railwrap"><div class="rail ${cview.mode==='grid'?'grid':''}" id="railPage"></div><div class="rbar"><div class="rprog"><i></i></div><div class="arrows"><button data-rail="-1" aria-label="Previous">${I.arrow.replace('class="arr"','style="transform:rotate(180deg)"')}</button><button data-rail="1" aria-label="Next">${I.arrow}</button></div></div></div></div></section>`}
function fillCertRail(){const r=$('#railPage');if(!r)return;let list=sortedCerts();if(cview.cat!=='All')list=list.filter(c=>c.category===cview.cat);const q=cview.q.trim().toLowerCase();if(q)list=list.filter(c=>(c.title+' '+c.issuer+' '+c.description).toLowerCase().includes(q));if(cview.sort==='hours')list.sort((a,b)=>(+b.hours||0)-(+a.hours||0));
 r.innerHTML=list.length?list.map(certCardHTML).join(''):'<div class="empty" style="flex:1">Nothing matches your filters.</div>';r.scrollLeft=0;railProgress(r)}

/* project page */
function projectHTML(id){const i=DB.projects.findIndex(p=>p.id===id);if(i<0)return `<section class="pagehead"><div class="shell"><a class="crumb" href="#/">${I.arrow} Back home</a><h1 class="pp-title">Project not found</h1></div></section>`;
 const p=DB.projects[i],nx=DB.projects[(i+1)%DB.projects.length];const imgs=(p.images||[]).filter(m=>fileSrc(m.fileId));const first=imgs.find(m=>m.cover)||imgs[0];
 const gal=imgs.length?`<div class="gal"><div class="main" id="gmain" data-lb><img id="gimg" src="${fileSrc(first.fileId)}" alt="${esc(first.caption||p.title)}"></div><div class="gcap" id="gcap">${esc(first.caption||'')}</div>${imgs.length>1?`<div class="thumbs">${imgs.map(m=>`<button class="${m===first?'on':''}" data-thumb="${m.fileId}" data-c="${esc(m.caption||'')}"><img src="${fileSrc(m.fileId)}" alt=""></button>`).join('')}</div>`:''}</div>`:`<div class="gal"><div class="main" style="cursor:default"><img src="${coverSVG(p.title)}" alt=""></div><div class="gcap">Images for this project have not been added yet.</div></div>`;
 const files=(p.files||[]).filter(f=>DB.files[f.fileId]);
 return `<section class="pagehead"><div class="shell"><a class="crumb" href="#/">${I.arrow} Back home</a><div class="pp-top"><div class="pp-meta"><span class="pill">${esc(p.category)}</span>${p.year?`<span class="pill">${esc(p.year)}</span>`:''}${p.status?`<span class="pill" style="background:var(--ink);color:#fff">${esc(p.status)}</span>`:''}</div>
 <h1 class="pp-title rv-l" id="h1">${lines([p.title])}</h1><p class="pp-cap rv" style="--d:400ms">${esc(p.caption)}</p></div>${gal}</div></section>
 <section class="sec" style="padding-top:1rem"><div class="shell"><div class="pp-cols"><div><div class="prose">${paras(p.description)}</div>
 ${(p.code||[]).length?`<h3 style="margin:2rem 0 1rem;font-size:1.4rem;letter-spacing:-.02em">Code</h3>${p.code.map((c,k)=>`<details class="codeblk"><summary>${esc(c.name||'untitled')}<span>${esc(c.lang||'')}</span></summary><pre>${esc(c.content)}</pre><div class="codetools"><button class="btn light sm" data-copycode="${k}">Copy</button><button class="btn light sm" data-dlcode="${k}">Download</button></div></details>`).join('')}`:''}</div>
 <aside class="side">${p.role?`<div><h4>Role</h4><p>${esc(p.role)}</p></div>`:''}${(p.tags||[]).length?`<div><h4>Built with</h4><div class="pills">${p.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div></div>`:''}
 ${(p.links||[]).length?`<div><h4>Links</h4><div class="rowlinks">${p.links.map(l=>`<a class="lchip" target="_blank" rel="noopener" href="${esc(safeUrl(l.url))}">${I.up}${esc(l.label||'Link')}</a>`).join('')}</div></div>`:''}
 ${files.length?`<div><h4>Files</h4><div class="rowlinks">${files.map(f=>`<a class="lchip" download="${esc(DB.files[f.fileId].name)}" href="${fileSrc(f.fileId)}">${I.file}${esc(DB.files[f.fileId].name)} · ${fmtSize(DB.files[f.fileId].size||0)}</a>`).join('')}</div></div>`:''}</aside></div>
 ${DB.projects.length>1?`<a class="next" href="#/project/${nx.id}"><div><small>Next project</small><b>${esc(nx.title)}</b></div>${I.arrow}</a>`:''}</div></section>`}

/* ---------- modals ---------- */
function openModal(html,cls=''){const m=document.createElement('div');m.className='modal '+cls;m.innerHTML=`<div class="m-bg"></div><div class="m-p" role="dialog" aria-modal="true" data-lenis-prevent><button class="m-x" aria-label="Close">${I.x}</button>${html}</div>`;$('#modals').append(m);lock();requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.add('on')));
 const onKey=e=>{if(e.key==='Escape')close()};const close=()=>{m.classList.remove('on');document.removeEventListener('keydown',onKey);setTimeout(()=>{m.remove();unlock()},380)};document.addEventListener('keydown',onKey);$('.m-bg',m).onclick=$('.m-x',m).onclick=close;m.close=close;return m}
function openContact(){closeNav();const c=DB.contacts;
 const m=openModal(`<h3>Let's talk</h3><p>Tell me about your idea, project or opportunity.</p><label class="fld"><span>Your name</span><input id="cn" autocomplete="name"></label><label class="fld"><span>Message</span><textarea id="cm" rows="5"></textarea></label>
 <div class="mrow">${c.email?'<button class="btn dark" id="sm">Send by email</button>':''}${c.whatsapp?'<button class="btn accent" id="sw">Send on WhatsApp</button>':''}${c.linkedin?`<a class="btn outline" target="_blank" rel="noopener" href="${esc(safeUrl(c.linkedin))}">LinkedIn</a>`:''}</div>${!(c.email||c.whatsapp||c.linkedin)?'<p class="hint" style="margin-top:1rem">Contact details have not been added yet.</p>':''}`);
 const body=()=>`Hi ${DB.profile.name.split(' ')[0]},\n\n${$('#cm',m).value}\n\n— ${$('#cn',m).value}`;
 const sm=$('#sm',m),sw=$('#sw',m);if(sm)sm.onclick=()=>{location.href='mailto:'+c.email+'?subject='+encodeURIComponent('Hello from your portfolio')+'&body='+encodeURIComponent(body())};
 if(sw)sw.onclick=()=>window.open('https://wa.me/'+String(c.whatsapp).replace(/\D/g,'')+'?text='+encodeURIComponent(body()),'_blank','noopener')}
function openCert(id){const c=DB.certificates.find(x=>x.id===id);if(!c)return;const src=fileSrc(c.fileId),t=DB.files[c.fileId]?.type||'';
 const view=src?(t.startsWith('image/')?`<div class="certview"><img src="${src}" alt="${esc(c.title)}"></div>`:t==='application/pdf'?`<div class="certview"><iframe src="${src}" title="${esc(c.title)}"></iframe></div>`:`<p><a class="lchip" style="background:var(--surface);color:var(--fg)" download href="${src}">${I.file}Download file</a></p>`):'';
 openModal(`<span class="kick">${esc(c.issuer||'Certificate')}${c.date?' · '+esc(fmtMonth(c.date)):''}</span><h3 style="margin-top:.5rem">${esc(c.title)}</h3>${c.description?`<p>${esc(c.description)}</p>`:''}${view}
 <div class="cc-m" style="margin:1rem 0"><div><b>${+c.hours||0}</b><span>Hours</span></div><div><b>${+c.sessions||0}</b><span>Sessions</span></div><div><b>${+c.meetings||0}</b><span>Meetings</span></div></div>${c.url?`<div class="mrow"><a class="btn dark" target="_blank" rel="noopener" href="${esc(safeUrl(c.url))}">Verify credential ${I.arrow}</a></div>`:''}`,'wide')}
function openLightbox(src,alt){openModal(`<img src="${src}" alt="${esc(alt||'')}">`,'lb')}

/* ---------- nav overlay ---------- */
function buildNav(){const cl=contactLinks();$('#nav').innerHTML=`<div class="navtop"><span class="brand" style="color:#fff">${I.spark}${esc(DB.profile.name)}</span><button class="navx" id="navClose">${I.x.replace('<svg','<svg style="font-size:.85rem"')} Close</button></div>
 <div class="navlinks"><button style="--i:0" data-go="home"><small>01</small>Home</button><button style="--i:1" data-go="works"><small>02</small>Projects</button><a style="--i:2" href="#/certificates"><small>03</small>Certificates</a><button style="--i:3" data-go="activities"><small>04</small>Activities</button><button style="--i:4" data-go="about"><small>05</small>About</button><button style="--i:5" data-open="contact"><small>06</small>Contact</button></div>
 <div class="navfoot">${cl.map(c=>`<a target="_blank" rel="noopener" href="${esc(c.h)}">${esc(c.l)}</a>`).join('')||'<span>Ashraf Rakkab</span>'}</div>`;
 $('#navClose').onclick=closeNav;$$('#nav a').forEach(a=>a.addEventListener('click',closeNav))}
let navOpen=false;
function openNav(){if(navOpen)return;navOpen=true;buildNav();const n=$('#nav');n.classList.add('on');n.setAttribute('aria-hidden','false');lock()}
function closeNav(){if(!navOpen)return;navOpen=false;const n=$('#nav');n.classList.remove('on');n.setAttribute('aria-hidden','true');unlock()}
function buildPNav(){const items=[['Home','home'],['Work','works'],['Certificates','#/certificates'],['Activities','activities'],['About','about'],['Contact','contact']];
 $('#pnav').innerHTML=items.map(([t,g])=>`<li><button ${g==='contact'?'data-open="contact"':g.startsWith('#')?`data-href="${g}"`:`data-go="${g}"`} class="${(g==='home'&&state.view==='home')||(g==='#/certificates'&&state.view==='certs')?'cur':''}">${t}</button></li>`).join('')}

/* ---------- effects ---------- */
let io=null;
function countUp(el){const to=+el.dataset.count,suf=el.dataset.suffix||'';const t0=performance.now();(function s(n){const t=Math.min(1,(n-t0)/1400),e=1-Math.pow(1-t,3);el.textContent=Math.round(to*e).toLocaleString()+suf;if(t<1)requestAnimationFrame(s)})(t0)}
function initReveals(){io&&io.disconnect();io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add('in');if(e.target.dataset.count!==undefined)countUp(e.target);io.unobserve(e.target)}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});$$('.rv,.rv-l,.rv-w,[data-count]').forEach(el=>io.observe(el))}
function railProgress(r){const bar=r.parentElement.querySelector('.rprog i');if(!bar)return;const max=r.scrollWidth-r.clientWidth;const vis=r.clientWidth/r.scrollWidth;bar.style.width=Math.max(12,Math.min(100,vis*100))+'%';bar.style.marginLeft=(max>0?(r.scrollLeft/max)*(100-parseFloat(bar.style.width)):0)+'%'}
function initRail(r){if(!r)return;let down=false,sx=0,sl=0,moved=0;railProgress(r);r.addEventListener('scroll',()=>railProgress(r),{passive:true});
 r.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||r.classList.contains('grid'))return;down=true;moved=0;sx=e.clientX;sl=r.scrollLeft});
 const mv=e=>{if(!down)return;const dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));if(moved>5)r.classList.add('drag');r.scrollLeft=sl-dx};
 const up=()=>{if(!down)return;down=false;setTimeout(()=>r.classList.remove('drag'),0);r._moved=moved};
 window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);cleanups.push(()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up)});
 r.addEventListener('click',e=>{if(r._moved>5){e.stopPropagation();e.preventDefault();r._moved=0}},true);
 r.parentElement.querySelectorAll('[data-rail]').forEach(b=>b.onclick=()=>r.scrollBy({left:(+b.dataset.rail)*Math.min(r.clientWidth*.8,420),behavior:'smooth'}))}

function initLiquid(frame){
 const img=$('.ph-base',frame),cv=$('.ph-cv',frame);if(!img||!cv||matchMedia('(prefers-reduced-motion: reduce)').matches)return()=>{};
 const ctx=cv.getContext('2d'),cover=document.createElement('canvas'),brush=document.createElement('canvas'),bctx=brush.getContext('2d'),cctx=cover.getContext('2d');
 const decay=.016;let dpr=Math.min(devicePixelRatio||1,2),W=0,H=0,radius=0,points=[],last=null,idle=0,raf=0,visible=true,t=0;
 const auto=matchMedia('(hover: none)').matches,src=new Image();let loaded=false;
 function layout(){const r=frame.getBoundingClientRect();if(!r.width)return;W=cv.width=Math.round(r.width*dpr);H=cv.height=Math.round(r.height*dpr);cover.width=W;cover.height=H;
  const brushR=120*(parseFloat(getComputedStyle(document.documentElement).fontSize)/16);radius=brushR*dpr;brush.width=brush.height=Math.ceil(radius*2);
  if(loaded){const iw=src.naturalWidth,ih=src.naturalHeight,s=Math.max(W/iw,H/ih);cctx.clearRect(0,0,W,H);const fp=(img.style.objectPosition||'50% 50%').split(' ').map(v=>(parseFloat(v)||50)/100);cctx.drawImage(src,(W-iw*s)*fp[0],(H-ih*s)*(fp[1]??.5),iw*s,ih*s)}}
 src.onload=()=>{loaded=true;layout()};src.onerror=()=>{if(!src.dataset.fb){src.dataset.fb=1;src.src=photoPlaceholder()}};src.src=img.currentSrc||img.src;
 function stamp(x,y){const c=radius,d=brush.width;bctx.globalCompositeOperation='source-over';bctx.clearRect(0,0,d,d);const g=bctx.createRadialGradient(c,c,0,c,c,c);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.55,'rgba(255,255,255,.82)');g.addColorStop(1,'rgba(255,255,255,0)');bctx.fillStyle=g;bctx.fillRect(0,0,d,d);
  bctx.globalCompositeOperation='source-in';bctx.drawImage(cover,x-c,y-c,d,d,0,0,d,d);ctx.globalCompositeOperation='source-over';ctx.drawImage(brush,x-c,y-c)}
 function add(x,y){if(last){const dx=x-last.x,dy=y-last.y,dist=Math.hypot(dx,dy),step=Math.max(radius*.3,1),n=Math.min(Math.ceil(dist/step),60);for(let i=1;i<=n;i++)points.push({x:last.x+dx*i/n,y:last.y+dy*i/n})}else points.push({x,y});last={x,y};start()}
 function tick(){raf=0;if(!visible||!loaded)return start(true);
  if(auto&&!points.length){t+=.014;add(W/2+Math.sin(t*1.3)*W*.3,H/2+Math.sin(t*.9+1)*H*.3)}
  const drawing=points.length>0;if(drawing)idle=0;else{idle++;if(idle>120&&!auto)return}
  const fade=drawing?decay:Math.min(decay+idle*.004,.5);ctx.globalCompositeOperation='destination-out';ctx.fillStyle=`rgba(0,0,0,${fade})`;ctx.fillRect(0,0,W,H);
  if(drawing){points.forEach(p=>stamp(p.x,p.y));points=[]}if(idle>=120)ctx.clearRect(0,0,W,H);raf=requestAnimationFrame(tick)}
 function start(){if(!raf)raf=requestAnimationFrame(tick)}
 const move=e=>{const r=cv.getBoundingClientRect();if(!r.width)return;const x=(e.clientX-r.left)*dpr,y=(e.clientY-r.top)*dpr;if(x<-radius||y<-radius||x>W+radius||y>H+radius){last=null;return}add(x,y)};
 window.addEventListener('pointermove',move,{passive:true});const ro=new ResizeObserver(layout);ro.observe(frame);const vio=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)start()});vio.observe(frame);if(auto)start();
 return()=>{window.removeEventListener('pointermove',move);ro.disconnect();vio.disconnect();cancelAnimationFrame(raf)}}

function initHero(){
 const frame=$('#photoFrame');if(frame){const bi=$('.ph-base',frame);bi.addEventListener('error',()=>{if(!bi.dataset.fb){bi.dataset.fb=1;bi.src=photoPlaceholder()}});cleanups.push(initLiquid(frame))}
 const rot=$('#rotor');if(rot&&rot.children.length>1){let i=0;const n=rot.children.length;const iv=setInterval(()=>{i=(i+1)%n;rot.style.transform=`translateY(-${i*1.35}em)`},2400);cleanups.push(()=>clearInterval(iv))}
 // parallax chips
 const box=$('#photoBox');if(box&&matchMedia('(hover: hover)').matches){const mv=e=>{const x=(e.clientX/innerWidth-.5),y=(e.clientY/innerHeight-.5);$$('.chip',box).forEach(c=>{const d=+c.dataset.depth||20;c.style.transform=`translate(${x*d}px,${y*d}px)`})};window.addEventListener('pointermove',mv,{passive:true});cleanups.push(()=>window.removeEventListener('pointermove',mv))}
 // hero card carousel
 const el=$('#hcard');if(el){const sl=[];DB.projects.slice(0,2).forEach(p=>sl.push({k:'Project',t:p.title,s:p.category,h:'#/project/'+p.id}));const c=sortedCerts()[0];if(c)sl.push({k:'Certificate',t:c.title,s:(c.hours?c.hours+' hours · ':'')+c.issuer,h:'#/certificates'});const a=DB.activities[0];if(a)sl.push({k:'Activity',t:a.title,s:a.role||a.org,go:'activities'});if(!sl.length)sl.push({k:'Welcome',t:'Portfolio under construction',s:'Add content from the admin panel',go:'works'});
  let i=0,iv;const draw=()=>{const s=sl[i];el.innerHTML=`<div class="hb"><span class="hk">${esc(s.k)} · ${i+1}/${sl.length}</span><span class="ht">${esc(s.t)}</span><span class="hs">${esc(s.s||'')}</span></div><div class="hn"><button data-hc="-1" aria-label="Previous">‹</button><button data-hc="1" aria-label="Next">›</button></div><i class="hp"></i>`;clearInterval(iv);iv=setInterval(()=>{i=(i+1)%sl.length;draw()},4500)};
  el.onclick=e=>{const b=e.target.closest('[data-hc]');if(b){e.stopPropagation();i=(i+ +b.dataset.hc+sl.length)%sl.length;draw();return}const s=sl[i];if(s.h)location.hash=s.h;else if(s.go)scrollToId(s.go)};draw();cleanups.push(()=>clearInterval(iv))}}

function initPointerFx(){
 if(!matchMedia('(hover: hover)').matches)return;
 const mv=e=>{const t=e.target.closest?.('.tilt');$$('.tilt').forEach(x=>{if(x!==t)x.style.transform=''});if(t){const r=t.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;t.style.transform=`perspective(800px) rotateY(${px*6}deg) rotateX(${-py*6}deg)`}
  $$('.mag').forEach(b=>{const r=b.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);if(Math.hypot(dx,dy)<90)b.style.transform=`translate(${dx*.25}px,${dy*.35}px)`;else b.style.transform=''})};
 window.addEventListener('pointermove',mv,{passive:true});cleanups.push(()=>window.removeEventListener('pointermove',mv))}

/* ---------- router ---------- */
function parseRoute(){const h=location.hash;if(h.startsWith('#/project/'))return{v:'project',id:decodeURIComponent(h.slice(10))};if(h==='#/certificates')return{v:'certs'};if(h==='#/admin')return{v:'admin'};return{v:'home'}}
function render(r){cleanups.splice(0).forEach(f=>f());const V=$('#view');
 V.innerHTML=({home:homeHTML,certs:certsPageHTML,project:()=>projectHTML(r.id)})[r.v]()+footerHTML();state.view=r.v;
 const pr=r.v==='project'?DB.projects.find(p=>p.id===r.id):null;document.title=r.v==='certs'?`Certificates — ${DB.profile.name}`:pr?`${pr.title} — ${DB.profile.name}`:`${DB.profile.name} — Portfolio`;
 buildPNav();if(r.v==='home')initHero();if(r.v==='certs'){fillCertRail();initRail($('#railPage'))}if(r.v==='home')initRail($('#railHome'));initPointerFx();
 $('#brandName').textContent=DB.profile.name;{const ln=$('#lname');if(ln)ln.textContent=DB.profile.name}
 if(state.ready)initReveals()}
function route(first){let r=parseRoute();if(r.v==='admin'){history.replaceState(null,'',location.pathname+location.search+'#/');r={v:'home'};setTimeout(openAdmin,350)}
 const same=state.view===r.v&&r.v==='home'&&!first;
 if(same){if(state.pending){const p=state.pending;state.pending=null;setTimeout(()=>scrollToId(p),60)}return}
 const go=()=>{render(r);if(lenis)lenis.scrollTo(0,{immediate:true});else scrollTo(0,0);if(state.pending){const p=state.pending;state.pending=null;setTimeout(()=>scrollToId(p),700)}};
 if(first)go();else{const w=$('#wipe');w.className='';void w.offsetWidth;w.className='go';setTimeout(go,440);setTimeout(()=>w.className='',980)}}

/* ---------- global events ---------- */
document.addEventListener('click',e=>{const t=e.target;let el;
 if(el=t.closest('[data-go]')){e.preventDefault();goSection(el.dataset.go);return}
 if(el=t.closest('[data-href]')){closeNav();location.hash=el.dataset.href;return}
 if(el=t.closest('[data-open="contact"]')){openContact();return}
 if(t.closest('#menuBtn')){openNav();return}
 if(t.closest('#toTop')){scrollToId('home');return}
 if(el=t.closest('[data-admin]')){openAdmin();return}
 if(el=t.closest('.pcard')){if(t.closest('[data-toggle]')){const open=!el.classList.contains('open');$$('.pcard.open').forEach(c=>{c.classList.remove('open');$('.pc-toggle',c).setAttribute('aria-expanded','false')});if(open){el.classList.add('open');$('.pc-toggle',el).setAttribute('aria-expanded','true')}return}}
 if(el=t.closest('[data-act]')){const was=el.classList.contains('open');$$('.arow.open').forEach(a=>a.classList.remove('open'));if(!was)el.classList.add('open');return}
 if(el=t.closest('[data-cert]')){openCert(el.dataset.cert);return}
 if(el=t.closest('#fchips .fc')){cview.cat=el.dataset.cat;$$('#fchips .fc').forEach(b=>b.classList.toggle('on',b===el));fillCertRail();return}
 if(el=t.closest('#csort button')){cview.sort=el.dataset.sort;$$('#csort button').forEach(b=>b.classList.toggle('on',b===el));fillCertRail();return}
 if(el=t.closest('#cmode button')){cview.mode=el.dataset.mode;$$('#cmode button').forEach(b=>b.classList.toggle('on',b===el));$('#railPage').classList.toggle('grid',cview.mode==='grid');return}
 if(el=t.closest('[data-thumb]')){const img=$('#gimg');img.src=fileSrc(el.dataset.thumb);$('#gcap').textContent=el.dataset.c;$$('[data-thumb]').forEach(b=>b.classList.toggle('on',b===el));return}
 if(t.closest('#gmain')){openLightbox($('#gimg').src,$('#gimg').alt);return}
 if(el=t.closest('[data-copycode],[data-dlcode]')){const pr=DB.projects.find(p=>p.id===parseRoute().id);const k=+(el.dataset.copycode??el.dataset.dlcode);const c=pr&&pr.code[k];if(!c)return;
  if(el.dataset.copycode!==undefined){navigator.clipboard?.writeText(c.content);el.textContent='Copied ✓';setTimeout(()=>el.textContent='Copy',1400)}else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c.content],{type:'text/plain'}));a.download=c.name||'code.txt';a.click()}return}
 if(t.closest('#admFab')){openAdmin();return}});
document.addEventListener('input',e=>{if(e.target.id==='csearch'){cview.q=e.target.value;fillCertRail()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav();if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('.ccard')){e.preventDefault();openCert(e.target.dataset.cert)}});
window.addEventListener('hashchange',()=>route(false));
let lastY=0;window.addEventListener('scroll',()=>{const y=window.pageYOffset,h=$('#hdr');h.classList.toggle('glass',y>30||state.view!=='home');h.classList.toggle('hide',y>lastY&&y>400&&!navOpen);lastY=y;const m=document.documentElement.scrollHeight-innerHeight;$('#prog').style.width=(m>0?y/m*100:0)+'%'},{passive:true});

/* ---------- clock ---------- */
const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function tickClock(){const d=new Date();let h=d.getHours();const ap=h>=12?'pm':'am';h=h%12||12;$('#ct').textContent=`${h}:${String(d.getMinutes()).padStart(2,'0')}${ap}`;$('#cd').textContent=`${d.getDate()} ${MN[d.getMonth()]}, ${d.getFullYear()}`}

/* ---------- loader ---------- */
function runLoader(){lock();const L=$('#loader'),fill=$('#lf'),num=$('#ln');const t0=performance.now(),ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 (function step(now){const t=Math.min(1,(now-t0)/1300),p=Math.round(ease(t)*100);fill.style.width=p+'%';num.textContent=String(p).padStart(3,'0');if(t<1)requestAnimationFrame(step);else exit()})(t0);
 function exit(){L.classList.add('out');setTimeout(()=>{L.remove();unlock();state.ready=true;document.body.classList.add('ready');initReveals()},780)}}

/* =========================================================
   ADMIN
   ========================================================= */
const adm={tab:'profile',edit:null};
let binds=[],ACT=[];
const A=fn=>ACT.push(fn)-1;
function F(label,get,set,o={}){const i=binds.push({get,set})-1;let tag;
 if(o.rows)tag=`<textarea rows="${o.rows}" data-bi="${i}" placeholder="${esc(o.ph||'')}"></textarea>`;
 else if(o.options)tag=`<select data-bi="${i}">${o.options.map(v=>`<option>${esc(v)}</option>`).join('')}</select>`;
 else tag=`<input type="${o.type||'text'}" data-bi="${i}" placeholder="${esc(o.ph||'')}">`;
 return `<label class="fld"><span>${esc(label)}</span>${tag}${o.hint?`<small>${esc(o.hint)}</small>`:''}</label>`}
function wire(root){$$('[data-bi]',root).forEach(el=>{const b=binds[el.dataset.bi];let v=b.get();el.value=v??'';el.addEventListener('input',()=>{b.set(el.value);touch()})})}
const mv=(arr,i,d)=>{const j=i+d;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];touch()};
const tools=(arr,i)=>`<div class="tools"><button data-a="${A(()=>{mv(arr,i,-1);admRender()})}" ${i===0?'disabled':''}>↑ Up</button><button data-a="${A(()=>{mv(arr,i,1);admRender()})}" ${i===arr.length-1?'disabled':''}>↓ Down</button><button class="danger" data-a="${A(()=>{if(confirm('Delete this item? This cannot be undone.')){arr.splice(i,1);touch();admRender()}})}">Delete</button></div>`;
const btn=(label,fn,cls='btn dark sm')=>`<button class="${cls}" data-a="${A(fn)}">${label}</button>`;

function pProfile(){const p=DB.profile;return `<h2>Profile</h2>
 <div class="photo-ed"><img src="${photoURL()}" alt=""><div>${btn('Upload photo',()=>pick(async f=>{const old=p.photo;p.photo=await addFile(f[0],{image:true});if(old)removeFile(old);admRender()},'image/*'))}${p.photo?btn('Remove photo',()=>{removeFile(p.photo);p.photo='';admRender()},'btn outline sm'):''}<p class="hint">Use a clear portrait with a plain background. It is shown in grayscale in the hero and revealed in full colour as visitors move their cursor.</p></div></div>
 <div class="grid2">${F('Full name',()=>p.name,v=>p.name=v)}${F('Small line above the name',()=>p.eyebrow,v=>p.eyebrow=v)}</div>
 ${F('Photo focus point (left% top%)',()=>p.photoPos||'',v=>p.photoPos=v.trim(),{ph:photoPos(),hint:'Moves the crop inside the frame, e.g. 16% 50% (more left) or 50% 20%. Leave empty for the default.'})}
 ${F('Rotating roles (one per line) — shown after "I\'m a"',()=>p.roles.join('\n'),v=>p.roles=v.split('\n').map(s=>s.trim()).filter(Boolean),{rows:4})}
 ${F('Hero headline',()=>p.headline,v=>p.headline=v,{rows:3})}
 ${F('About statement (large text)',()=>p.statement,v=>p.statement=v,{rows:3})}
 ${F('Bio (blank line = new paragraph)',()=>p.bio,v=>p.bio=v,{rows:7})}
 ${F('Identity tags (comma separated — first three float around the photo)',()=>p.tags.join(', '),v=>p.tags=v.split(',').map(s=>s.trim()).filter(Boolean))}
 ${F('Skills ticker (comma separated)',()=>p.skills.join(', '),v=>p.skills=v.split(',').map(s=>s.trim()).filter(Boolean))}
 ${F('Three words for the pill band (comma separated)',()=>p.band.join(', '),v=>p.band=v.split(',').map(s=>s.trim()).filter(Boolean))}`}
function pContacts(){const c=DB.contacts;return `<h2>Contact details</h2><p class="hint" style="margin-bottom:1rem">Only filled-in items appear on the site.</p>
 ${F('Email',()=>c.email,v=>c.email=v.trim(),{type:'email',ph:'you@example.com'})}${F('LinkedIn URL',()=>c.linkedin,v=>c.linkedin=v.trim(),{ph:'https://www.linkedin.com/in/…'})}
 ${F('WhatsApp number (with country code)',()=>c.whatsapp,v=>c.whatsapp=v.trim(),{ph:'+963 …',hint:'Used to build a wa.me link.'})}${F('GitHub URL (optional)',()=>c.github,v=>c.github=v.trim(),{ph:'https://github.com/…'})}`}

function pProjects(){
 if(adm.edit){const p=DB.projects.find(x=>x.id===adm.edit);if(p)return pProjEditor(p);adm.edit=null}
 return `<h2>Projects</h2><div class="pbar">${btn('+ New project',()=>{const p={id:uid(),title:'New project',category:'',year:String(new Date().getFullYear()),status:'In progress',role:'',featured:false,caption:'',description:'',tags:[],images:[],links:[],files:[],code:[],suggestions:['Main screenshot','Detail view','Logo or branding','Diagram']};DB.projects.push(p);touch();adm.edit=p.id;admRender()})}</div>
 ${DB.projects.map((p,i)=>`<div class="plist"><img src="${coverOf(p)}" alt=""><div class="pi"><b>${esc(p.title)}</b><small>${esc(p.category)} ${p.year?'· '+esc(p.year):''}</small></div>${btn('Edit',()=>{adm.edit=p.id;admRender()},'btn dark sm')}${tools(DB.projects,i)}</div>`).join('')||'<div class="empty">No projects yet.</div>'}`}
function pProjEditor(p){const imgDone=s=>(p.images||[]).some(m=>m.caption===s);
 return `<div class="pbar">${btn('← All projects',()=>{adm.edit=null;admRender()},'btn outline sm')}<a class="btn accent sm" href="#/project/${p.id}" data-a="${A(()=>closeAdmin())}">Open project page</a></div><h2>${esc(p.title||'Untitled')}</h2>
 <div class="grid2">${F('Title',()=>p.title,v=>p.title=v)}${F('Category',()=>p.category,v=>p.category=v,{ph:'Web platform · Smart energy'})}${F('Year',()=>p.year,v=>p.year=v)}${F('Status',()=>p.status,v=>p.status=v,{options:['Completed','In progress','Planned','Archived']})}${F('My role',()=>p.role,v=>p.role=v)}${F('Tags (comma separated)',()=>(p.tags||[]).join(', '),v=>p.tags=v.split(',').map(s=>s.trim()).filter(Boolean))}</div>
 ${F('Caption — short line shown on the card',()=>p.caption,v=>p.caption=v,{rows:2})}
 ${F('Description — shown in the quick look and on the project page',()=>p.description,v=>p.description=v,{rows:8,hint:'A blank line starts a new paragraph.'})}
 <h3>Images ${btn('+ Upload images',()=>pick(async fs=>{for(const f of fs)p.images.push({id:uid(),fileId:await addFile(f,{image:true}),caption:'',cover:!p.images.length});admRender()},'image/*',true))}</h3>
 <div class="imgs">${(p.images||[]).map((m,i)=>`<div class="imgc"><img src="${fileSrc(m.fileId)}" alt=""><input data-bi="${binds.push({get:()=>m.caption,set:v=>m.caption=v})-1}" placeholder="Caption"><div class="tools">${btn(m.cover?'★ Cover':'☆ Set cover',()=>{p.images.forEach(x=>x.cover=false);m.cover=true;touch();admRender()},'')}${btn('↑',()=>{mv(p.images,i,-1);admRender()},'')}${btn('↓',()=>{mv(p.images,i,1);admRender()},'')}<button class="danger" data-a="${A(()=>{if(confirm('Remove this image?')){removeFile(m.fileId);p.images.splice(i,1);if(p.images.length&&!p.images.some(x=>x.cover))p.images[0].cover=true;touch();admRender()}})}">✕</button></div></div>`).join('')||'<p class="hint">No images yet. The card shows a generated cover until you add one.</p>'}</div>
 <h3>Image ideas for this project</h3><div class="sugg">${(p.suggestions||[]).map(s=>`<button class="${imgDone(s)?'done':''}" data-a="${A(()=>pick(async fs=>{for(const f of fs)p.images.push({id:uid(),fileId:await addFile(f,{image:true}),caption:s,cover:!p.images.length});admRender()},'image/*',true))}">${imgDone(s)?'✓':'+'} ${esc(s)}</button>`).join('')}</div>
 ${F('Edit the ideas list (one per line)',()=>(p.suggestions||[]).join('\n'),v=>p.suggestions=v.split('\n').map(s=>s.trim()).filter(Boolean),{rows:3})}
 <h3>Links ${btn('+ Add link',()=>{p.links.push({label:'',url:''});touch();admRender()})}</h3>
 ${(p.links||[]).map((l,i)=>`<div class="frow"><input data-bi="${binds.push({get:()=>l.label,set:v=>l.label=v})-1}" placeholder="Label (GitHub, Live demo…)"><input data-bi="${binds.push({get:()=>l.url,set:v=>l.url=v})-1}" placeholder="https://…">${btn('✕',()=>{p.links.splice(i,1);touch();admRender()},'btn outline sm danger')}</div>`).join('')}
 <h3>Files (PDF, documents, zips…) ${btn('+ Upload files',()=>pick(async fs=>{for(const f of fs)p.files.push({fileId:await addFile(f)});admRender()},'*/*',true))}</h3>
 ${(p.files||[]).map((f,i)=>`<div class="fileli"><span>${esc(DB.files[f.fileId]?.name||'missing file')} · ${fmtSize(DB.files[f.fileId]?.size||0)}</span>${btn('Remove',()=>{removeFile(f.fileId);p.files.splice(i,1);touch();admRender()},'btn outline sm danger')}</div>`).join('')||'<p class="hint">No files attached.</p>'}
 <h3>Code files ${btn('+ Blank',()=>{p.code.push({name:'main.js',lang:'JavaScript',content:''});touch();admRender()},'btn outline sm')}${btn('+ Upload code',()=>pick(async fs=>{for(const f of fs)p.code.push({name:f.name,lang:(f.name.split('.').pop()||'').toUpperCase(),content:await f.text()});touch();admRender()},'.js,.ts,.py,.java,.html,.css,.json,.c,.cpp,.cs,.php,.md,.txt,.sql,.sh,.xml,.yml,.yaml',true))}</h3>
 ${(p.code||[]).map((c,i)=>`<div class="acard code-ed"><div class="grid2"><label class="fld"><span>File name</span><input data-bi="${binds.push({get:()=>c.name,set:v=>c.name=v})-1}"></label><label class="fld"><span>Language</span><input data-bi="${binds.push({get:()=>c.lang,set:v=>c.lang=v})-1}"></label></div><label class="fld"><span>Code</span><textarea rows="9" spellcheck="false" data-bi="${binds.push({get:()=>c.content,set:v=>c.content=v})-1}"></textarea></label>${btn('Remove file',()=>{p.code.splice(i,1);touch();admRender()},'btn outline sm danger')}</div>`).join('')||'<p class="hint">Code is stored as text and shown on the project page with Copy / Download buttons. Keep each file reasonably small (cloud sync limit ≈ 1 MB total for all text).</p>'}`}

function pCerts(){return `<h2>Certificates</h2><div class="pbar">${btn('+ New certificate',()=>{DB.certificates.unshift({id:uid(),title:'New certificate',issuer:'',category:'',date:'',hours:0,sessions:0,meetings:0,description:'',url:'',fileId:''});touch();admRender()})}</div>
 ${DB.certificates.map((c,i)=>`<div class="acard">${tools(DB.certificates,i)}<div class="grid2">${F('Title',()=>c.title,v=>c.title=v)}${F('Issuer / platform',()=>c.issuer,v=>c.issuer=v,{ph:'DataCamp, freeCodeCamp…'})}${F('Category (used for filter chips)',()=>c.category,v=>c.category=v,{ph:'Programming'})}${F('Date',()=>c.date,v=>c.date=v,{type:'month'})}</div>
 <div class="grid3">${F('Learning hours',()=>c.hours,v=>c.hours=+v||0,{type:'number',min:0})}${F('Sessions',()=>c.sessions,v=>c.sessions=+v||0,{type:'number',min:0})}${F('Meetings',()=>c.meetings,v=>c.meetings=+v||0,{type:'number',min:0})}</div>
 ${F('Description',()=>c.description,v=>c.description=v,{rows:2})}${F('Credential / verification URL',()=>c.url,v=>c.url=v,{ph:'https://…'})}
 <div class="fileli"><span>${c.fileId?esc(DB.files[c.fileId]?.name||'file'):'No certificate file attached (image or PDF)'}</span><span>${btn(c.fileId?'Replace':'Attach file',()=>pick(async f=>{const old=c.fileId;c.fileId=await addFile(f[0],{image:true});if(old)removeFile(old);admRender()},'image/*,application/pdf'),'btn dark sm')} ${c.fileId?btn('Remove',()=>{removeFile(c.fileId);c.fileId='';touch();admRender()},'btn outline sm danger'):''}</span></div></div>`).join('')||'<div class="empty">No certificates yet.</div>'}`}
function pActs(){return `<h2>Activities</h2><div class="pbar">${btn('+ New activity',()=>{DB.activities.unshift({id:uid(),title:'New activity',org:'',role:'',start:'',end:'',description:'',link:'',imageId:''});touch();admRender()})}</div>
 ${DB.activities.map((a,i)=>`<div class="acard">${tools(DB.activities,i)}<div class="grid2">${F('Title',()=>a.title,v=>a.title=v)}${F('Organisation',()=>a.org,v=>a.org=v)}${F('My role',()=>a.role,v=>a.role=v)}${F('Link (optional)',()=>a.link,v=>a.link=v)}${F('Start',()=>a.start,v=>a.start=v,{type:'month'})}${F('End (empty = present)',()=>a.end,v=>a.end=v,{type:'month'})}</div>
 ${F('Description',()=>a.description,v=>a.description=v,{rows:4})}<div class="fileli"><span>${a.imageId?esc(DB.files[a.imageId]?.name||'image'):'No image'}</span><span>${btn(a.imageId?'Replace image':'Add image',()=>pick(async f=>{const old=a.imageId;a.imageId=await addFile(f[0],{image:true});if(old)removeFile(old);admRender()},'image/*'),'btn dark sm')} ${a.imageId?btn('Remove',()=>{removeFile(a.imageId);a.imageId='';touch();admRender()},'btn outline sm danger'):''}</span></div></div>`).join('')||'<div class="empty">No activities yet.</div>'}`}

function pSettings(){
 const mode=cloud.ready?(cloud.user?'Cloud sync is ON — changes are saved to your database and visible to every visitor.':'Cloud is configured but you are not signed in.'):'Cloud sync is OFF — your data is stored in this browser only (IndexedDB).';
 return `<h2>Settings & backup</h2><div class="note ${cloud.ready?'':'warn'}"><b>Storage:</b> ${esc(mode)}${cloud.ready?'':'<br>Visitors on other devices only see what is inside this HTML file. To publish edits to everyone, enable cloud sync (see SETUP.md), or export a backup and re-host.'}</div>
 <h3>Backup</h3><div class="pbar">${btn('Export backup (.json)',exportAll)}${btn('Import backup',()=>pick(async f=>importAll(f[0]),'.json'),'btn outline sm')}${cloud.ready&&cloud.user?btn('Sync now',()=>cloud.push(),'btn outline sm')+btn('Pull from cloud',async()=>{if(confirm('Replace this device\'s data with the cloud copy?')){await cloud.pull(true);admRender();setStatus('Pulled from cloud ✓')}},'btn outline sm'):''}</div>
 <h3>Cloud (Firebase)</h3>${F('Firebase web config (JSON)',()=>'',v=>{cfgDraft=v},{rows:6,ph:'{ "apiKey": "…", "authDomain": "…", "projectId": "…", "storageBucket": "…", "appId": "…" }',hint:'Saved on this device. To make it work for visitors, also paste the same object into FIREBASE_CONFIG at the top of the script in index.html.'})}
 <div class="pbar">${btn('Save config & reload',async()=>{try{const c=JSON.parse(cfgDraft);await idb.set('kv','cloudcfg',c);location.reload()}catch(e){alert('That is not valid JSON.')}})}${btn('Remove config',async()=>{await idb.del('kv','cloudcfg');location.reload()},'btn outline sm danger')}</div>
 ${cloud.ready?'':`<h3>Admin password (this device)</h3><div class="grid2">${F('New password (min 8 characters)',()=>'',v=>{pwDraft=v},{type:'password'})}</div><div class="pbar">${btn('Change password',async()=>{if((pwDraft||'').length<8)return alert('Use at least 8 characters.');const a=await idb.get('kv','auth');const salt=crypto.getRandomValues(new Uint8Array(16));await idb.set('kv','auth',{user:a?.user||'admin',salt,hash:await hashPw(pwDraft,salt)});alert('Password changed.')})}</div>`}
 <h3>Danger zone</h3><div class="pbar">${btn('Reset everything to defaults',async()=>{if(confirm('Delete ALL your content on this device and restore the starter content?')&&confirm('Really delete everything?')){for(const id of Object.keys(DB.files))await idb.del('blobs',id);urlCache.clear();DB=seed();touch();admRender()}},'btn outline sm danger')}${btn('Log out',logout,'btn dark sm')}</div>`}
let cfgDraft='',pwDraft='';

async function exportAll(){const files={};for(const id of Object.keys(DB.files)){const b=await idb.get('blobs',id);if(b)files[id]=await blobToDataURL(b)}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({db:DB,files})],{type:'application/json'}));a.download='ashraf-portfolio-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()}
async function importAll(file){try{const d=JSON.parse(await file.text());if(!d.db)throw 0;if(!confirm('Replace the current content with this backup?'))return;DB=normalize(d.db);for(const [id,u] of Object.entries(d.files||{})){await idb.set('blobs',id,await (await fetch(u)).blob())}urlCache.clear();await resolveFiles();touch();admRender();setStatus('Backup imported ✓')}catch(e){alert('Could not read that backup file.')}}

function admRender(){binds=[];ACT=[];const body=$('#admBody');if(!body)return;const st=body.scrollTop;
 body.innerHTML=({profile:pProfile,contacts:pContacts,projects:pProjects,certs:pCerts,acts:pActs,settings:pSettings})[adm.tab]();wire(body);body.scrollTop=st;
 $$('.admtab').forEach(b=>b.classList.toggle('on',b.dataset.t===adm.tab));
 $$('[data-a]',body).forEach(el=>{const fn=ACT[+el.dataset.a];el.addEventListener('click',e=>{if(el.tagName==='A'){fn();return}e.preventDefault();fn()})})}
function admShell(){const el=$('#admin');el.innerHTML=`<div class="adm-top"><b>${I.spark}Admin panel</b><span id="admStatus">${cloud.ready&&cloud.user?'Cloud sync on':'Saved on this device ✓'}</span><button class="btn dark sm" id="admClose">Close ✕</button></div>
 <div class="adm-main"><div class="adm-tabs">${[['profile','Profile'],['contacts','Contacts'],['projects','Projects'],['certs','Certificates'],['acts','Activities'],['settings','Settings & backup']].map(([k,l])=>`<button class="admtab" data-t="${k}">${l}</button>`).join('')}</div><div id="admBody" data-lenis-prevent></div></div>`;
 $('#admClose').onclick=closeAdmin;$$('.admtab').forEach(b=>b.onclick=()=>{adm.tab=b.dataset.t;adm.edit=null;admRender()});admRender()}
function loginView(){const el=$('#admin');const cloudMode=cloud.ready;
 idb.get('kv','auth').then(a=>{const first=!cloudMode&&!a;
  el.innerHTML=`<div class="adm-top"><b>${I.spark}Admin</b><button class="btn outline sm" id="admClose">Close ✕</button></div><div class="login"><span class="kick">${cloudMode?'Cloud login':'This device'}</span><h2>${first?'Create your admin account':'Sign in to edit'}</h2><p>${cloudMode?'Use the email and password of the Firebase user you created for this site.':first?'Choose a username and a strong password. They are stored (hashed) in this browser only.':'Enter your admin username and password.'}</p>
  <label class="fld"><span>${cloudMode?'Email':'Username'}</span><input id="lu" autocomplete="username" ${cloudMode?'type="email"':''}></label><label class="fld"><span>Password</span><input id="lp" type="password" autocomplete="${first?'new-password':'current-password'}"></label>${first?'<label class="fld"><span>Repeat password</span><input id="lp2" type="password" autocomplete="new-password"></label>':''}<div class="err" id="lerr"></div><button class="btn dark" id="lgo" style="width:100%">${first?'Create & sign in':'Sign in'}</button></div>`;
  $('#admClose').onclick=closeAdmin;const err=m=>$('#lerr').textContent=m;
  const go=async()=>{const u=$('#lu').value.trim(),p=$('#lp').value;if(!u||!p)return err('Fill in both fields.');err('');
   try{if(cloudMode){await cloud.m.signInWithEmailAndPassword(cloud.auth,u,p);await cloud.pull();isAdmin=true;onAdminIn()}
   else if(first){if(p.length<8)return err('Use at least 8 characters.');if(p!==$('#lp2').value)return err('Passwords do not match.');const salt=crypto.getRandomValues(new Uint8Array(16));await idb.set('kv','auth',{user:u,salt,hash:await hashPw(p,salt)});sess.set(true);isAdmin=true;onAdminIn()}
   else{const h=await hashPw(p,a.salt);if(u!==a.user||h!==a.hash)return err('Wrong username or password.');sess.set(true);isAdmin=true;onAdminIn()}}
   catch(e){err(cloudMode?'Sign-in failed: '+(e.code||e.message):'Something went wrong.')}};
  $('#lgo').onclick=go;$$('#admin input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')go()}));setTimeout(()=>$('#lu')?.focus(),50)})}
function onAdminIn(){updateAdminUI();admShell()}
function openAdmin(){const el=$('#admin');el.hidden=false;lock();state.admin=true;if(isAdmin)admShell();else loginView()}
function closeAdmin(){const el=$('#admin');if(el.hidden)return;el.hidden=true;el.innerHTML='';unlock();state.admin=false;if(isAdmin)render(parseRoute().v==='admin'?{v:'home'}:parseRoute())}
function logout(){sess.set(false);isAdmin=false;if(cloud.ready&&cloud.user)cloud.m.signOut(cloud.auth);updateAdminUI();closeAdmin()}
function updateAdminUI(){$('#admFab').hidden=!isAdmin||state.admin}
const _oa=openAdmin;

/* ---------- boot ---------- */
async function boot(){
 applyAdaptiveGrid();addEventListener('resize',applyAdaptiveGrid);window.scrollTo(0,0);
 import('https://unpkg.com/lenis@1.3.23/dist/lenis.mjs').then(m=>{lenis=new m.default({smoothWheel:true});if(locks>0)lenis.stop();const raf=t=>{lenis.raf(t);requestAnimationFrame(raf)};requestAnimationFrame(raf)}).catch(()=>{});
 await idb.open();
 DB=(await idb.get('kv','site'))||seed();DB=normalize(DB);
 isAdmin=sess.get();
 runLoader();
 await cloud.init();
 if(cloud.ready){await cloud.pull();}
 await resolveFiles();
 tickClock();setInterval(tickClock,1000);
 updateAdminUI();
 const _closeA=closeAdmin;
 route(true);
 // keep floating button in sync with the panel
 new MutationObserver(updateAdminUI).observe($('#admin'),{attributes:true,attributeFilter:['hidden']});
}
boot();
})();
