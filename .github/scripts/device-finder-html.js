'use strict';
module.exports=function(drivers,app){
const t=drivers.reduce((s,d)=>s+d.fpCount,0);
const v=app.version||'?';
const R='https://github.com/dlnraja/com.tuya.zigbee';
return page(drivers,t,v,R);
};
function page(D,t,v,R){return`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Device Finder - Universal Tuya Zigbee v${v}</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet">
<style>
:root{--bg:#0f172a;--card:#1e293b;--accent:#3b82f6;--green:#10b981;--text:#e2e8f0;--muted:#94a3b8}
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--text);margin:0}
.hero{background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:2rem;text-align:center}
.hero h1{font-size:2rem;margin:0}.hero p{color:var(--muted);margin:.5rem 0}
.stats{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin:1rem 0}
.stat{background:var(--card);border-radius:.5rem;padding:.75rem 1.5rem;text-align:center}
.stat b{font-size:1.5rem;color:var(--accent);display:block}
.search-bar{max-width:600px;margin:1rem auto;position:relative}
.search-bar input{width:100%;padding:.75rem 1rem .75rem 2.5rem;border-radius:.5rem;border:1px solid #334155;background:var(--card);color:var(--text);font-size:1rem}
.search-bar svg{position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--muted);width:1rem;height:1rem}
.filters{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin:.5rem 0}
.filters button{background:var(--card);border:1px solid #334155;color:var(--text);padding:.375rem .75rem;border-radius:.375rem;cursor:pointer;font-size:.875rem}
.filters button.active{background:var(--accent);border-color:var(--accent);color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;padding:1rem;max-width:1400px;margin:0 auto}
.card{background:var(--card);border-radius:.75rem;padding:1.25rem;border:1px solid #334155;transition:all .2s}
.card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 20px rgba(59,130,246,.15)}
.card h3{margin:0 0 .5rem;font-size:1.1rem}.card .meta{color:var(--muted);font-size:.8rem;margin:.25rem 0}
.badge{display:inline-block;padding:.125rem .5rem;border-radius:9999px;font-size:.7rem;font-weight:600;margin:2px}
.badge-ef00{background:#7c3aed20;color:#a78bfa;border:1px solid #7c3aed40}
.badge-zcl{background:#10b98120;color:#6ee7b7;border:1px solid #10b98140}
.cap{display:inline-block;background:#1e293b;border:1px solid #334155;padding:.125rem .375rem;border-radius:.25rem;font-size:.7rem;margin:1px;color:var(--muted)}
.fps{margin:.5rem 0;display:flex;flex-wrap:wrap;gap:.25rem}
.fp{font-family:monospace;font-size:.75rem;background:#0f172a;padding:.125rem .375rem;border-radius:.25rem;border:1px solid #334155}
.actions{display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap}
.btn{padding:.375rem .75rem;border-radius:.375rem;font-size:.75rem;text-decoration:none;font-weight:500;cursor:pointer;border:none}
.btn-bug{background:#ef444420;color:#f87171;border:1px solid #ef444440}.btn-bug:hover{background:#ef444440}
.btn-info{background:#3b82f620;color:#60a5fa;border:1px solid #3b82f640}.btn-info:hover{background:#3b82f640}
.detail{display:none;margin-top:.75rem;padding:.75rem;background:#0f172a;border-radius:.5rem;font-size:.8rem}
.detail.open{display:block}
.footer{text-align:center;padding:2rem;color:var(--muted);font-size:.875rem}
.footer a{color:var(--accent);text-decoration:none}
</style></head><body>
<div class="hero"><h1>🔍 Device Finder</h1>
<p>Universal Tuya Zigbee v${v} — Find your device instantly</p>
<div class="stats">
<div class="stat"><b>${D.length}</b>Drivers</div>
<div class="stat"><b>${t.toLocaleString()}</b>Fingerprints</div>
<div class="stat"><b>${D.reduce((s,d)=>s+d.caps.length,0)}</b>Capabilities</div>
</div>
<div class="search-bar">
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
<input id="search" placeholder="Search by fingerprint, product ID, driver name..." autocomplete="off">
</div>
<div class="filters" id="filters"></div>
</div>
<div class="grid" id="grid">${D.map(d=>card(d,R)).join('')}</div>
<div class="footer">
<p>Generated ${new Date().toISOString().split('T')[0]} | <a href="${R}">GitHub</a> | <a href="https://homey.app/a/com.dlnraja.tuya.zigbee/test/">Install Test</a> | <a href="https://community.homey.app/t/140352">Forum</a></p>
<p>Data auto-updated daily by CI/CD pipeline</p>
</div>
<script>${js()}</script>
</body></html>`;}
function card(d,R){
const proto=d.proto==='EF00'?'<span class="badge badge-ef00">EF00</span>':'<span class="badge badge-zcl">ZCL</span>';
const caps=d.caps.slice(0,8).map(c=>'<span class="cap">'+c+'</span>').join('');
const fps=d.mfrs.slice(0,6).map(m=>'<span class="fp">'+m+'</span>').join('')+(d.mfrs.length>6?'<span class="fp">+' +(d.mfrs.length-6)+' more</span>':'');
const pids=d.pids.slice(0,4).map(p=>'<span class="fp">'+p+'</span>').join('');
const bugUrl=R+'/issues/new?template=02_bug_report.yml&title='+encodeURIComponent('['+d.id+'] Bug: ')+'&labels=bug';
const cls=d.class.charAt(0).toUpperCase()+d.class.slice(1);
return '<div class="card" data-d="'+d.id+'" data-c="'+d.class+'" data-s="'+[d.id,d.name,...d.mfrs,...d.pids,...d.caps].join(' ').toLowerCase()+'">'
+'<div style="display:flex;justify-content:space-between;align-items:start"><h3>'+d.name+'</h3>'+proto+'</div>'
+'<div class="meta">'+cls+' · <code>'+d.id+'</code> · '+d.fpCount+' fingerprints</div>'
+'<div class="fps">'+fps+pids+'</div>'
+'<div>'+caps+'</div>'
+'<div class="actions">'
+'<button class="btn btn-info" onclick="toggleDetail(this)">ℹ Details</button>'
+'<a class="btn btn-bug" href="'+bugUrl+'" target="_blank">🐛 Report Bug</a>'
+'<a class="btn btn-info" href="'+R+'/tree/master/drivers/'+d.id+'" target="_blank">📁 Source</a>'
+'</div>'
+'<div class="detail">'
+'<b>All Fingerprints:</b><br>'+d.mfrs.map(m=>'<code>'+m+'</code>').join(', ')
+'<br><b>Product IDs:</b> '+d.pids.map(p=>'<code>'+p+'</code>').join(', ')
+'<br><b>Capabilities:</b> '+d.caps.join(', ')
+'<br><b>Protocol:</b> '+d.proto
+'<br><b>Driver ID:</b> <code>'+d.id+'</code>'
+'<br><br><a class="btn btn-info" href="https://www.aliexpress.com/w/wholesale-tuya+zigbee+'+encodeURIComponent(d.name.replace(/[_()]/g,' '))+'.html?aff_short_key=dlnraja" target="_blank" rel="noopener">🛒 Find on AliExpress</a>'
+'</div></div>';
}
function js(){return`
const grid=document.getElementById('grid');
const cards=[...grid.querySelectorAll('.card')];
const search=document.getElementById('search');
const filtersEl=document.getElementById('filters');
const classes=[...new Set(cards.map(c=>c.dataset.c))].sort();
let activeFilter='all';
filtersEl.innerHTML='<button class="active" data-f="all">All ('+cards.length+')</button>'+classes.map(c=>{
const n=cards.filter(x=>x.dataset.c===c).length;
return'<button data-f="'+c+'">'+c.charAt(0).toUpperCase()+c.slice(1)+' ('+n+')</button>';
}).join('');
filtersEl.addEventListener('click',e=>{
if(!e.target.dataset.f)return;
activeFilter=e.target.dataset.f;
[...filtersEl.querySelectorAll('button')].forEach(b=>b.classList.toggle('active',b.dataset.f===activeFilter));
filterCards();
});
search.addEventListener('input',filterCards);
function filterCards(){
const q=search.value.toLowerCase().trim();
cards.forEach(c=>{
const matchClass=activeFilter==='all'||c.dataset.c===activeFilter;
const matchSearch=!q||c.dataset.s.includes(q);
c.style.display=matchClass&&matchSearch?'':'none';
});
}
window.toggleDetail=function(btn){btn.closest('.card').querySelector('.detail').classList.toggle('open');btn.textContent=btn.textContent.includes('Details')?'▲ Hide':'ℹ Details';};
`;}
