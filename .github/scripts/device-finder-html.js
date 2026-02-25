'use strict';
module.exports=function(drivers,app){
const t=drivers.reduce((s,d)=>s+d.fpCount,0);
const v=app.version||'?';
const R='https://github.com/dlnraja/com.tuya.zigbee';
return page(drivers,t,v,R);
};
function page(D,t,v,R){return`<!DOCTYPE html>
<html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Device Finder - Universal Tuya Zigbee v${v}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: { 850: '#15202e', 900: '#0f172a' },
        primary: { 500: '#3b82f6', 600: '#2563eb' }
      }
    }
  }
}
</script>
<style>
body { background: #0f172a; color: #f1f5f9; font-family: 'Inter', sans-serif; }
.card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.3); border-color: #3b82f6; }
.detail { display: none; }
.detail.open { display: block; animation: slideDown 0.2s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #1e293b; }
::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #64748b; }
</style>
</head><body>
<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-lg bg-opacity-90">
    <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <div>
          <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">Universal Tuya Zigbee</h1>
          <p class="text-xs text-slate-400 font-mono">v${v}</p>
        </div>
      </div>
      
      <div class="flex gap-4 text-center">
        <div class="bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600">
          <div class="text-2xl font-bold text-white">${D.length}</div>
          <div class="text-xs text-slate-400 uppercase tracking-wider">Drivers</div>
        </div>
        <div class="bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600">
          <div class="text-2xl font-bold text-green-400">${t.toLocaleString()}</div>
          <div class="text-xs text-slate-400 uppercase tracking-wider">Fingerprints</div>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
    
    <!-- Search & Filter -->
    <div class="mb-8 space-y-4">
      <div class="relative max-w-2xl mx-auto group">
        <div class="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-200"></div>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input id="search" class="block w-full pl-11 pr-4 py-4 bg-slate-800 border-0 rounded-xl text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-slate-750 transition-colors sm:text-sm shadow-xl" placeholder="Search device name, fingerprint, model ID..." autocomplete="off">
        </div>
      </div>
      
      <div class="flex flex-wrap justify-center gap-2" id="filters">
        <!-- Filters injected by JS -->
      </div>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="grid">
      ${D.map(d=>card(d,R)).join('')}
    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-slate-800 border-t border-slate-700 mt-auto">
    <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-center">
      <p class="text-slate-400 mb-4">
        Generated automatically by <a href="${R}" class="text-blue-400 hover:text-blue-300">GitHub Actions</a> on ${new Date().toISOString().split('T')[0]}
      </p>
      <div class="flex justify-center gap-6">
        <a href="${R}" class="text-slate-500 hover:text-white transition-colors">GitHub</a>
        <a href="https://homey.app/a/com.dlnraja.tuya.zigbee/test/" class="text-slate-500 hover:text-white transition-colors">Install Test Version</a>
        <a href="https://community.homey.app/t/140352" class="text-slate-500 hover:text-white transition-colors">Forum Support</a>
      </div>
    </div>
  </footer>
</div>
<script>${js()}</script>
</body></html>`;}

function card(d,R){
const isEF00 = d.proto==='EF00';
const protoBadge = isEF00 
  ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">EF00</span>'
  : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">ZCL</span>';

const caps = d.caps.slice(0, 12).map(c => 
  `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300 border border-slate-600">${c}</span>`
).join('');

const fps = d.mfrs.slice(0, 4).map(m => `<code class="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-200 border border-slate-700">${m}</code>`).join(' ');
const moreFps = d.mfrs.length > 4 ? `<span class="text-xs text-slate-500 italic">+${d.mfrs.length - 4} more</span>` : '';

const bugUrl = `${R}/issues/new?template=02_bug_report.yml&title=${encodeURIComponent(`[${d.id}] Bug Report`)}&labels=bug`;
const srcUrl = `${R}/tree/master/drivers/${d.id}`;
const shopUrl = `https://www.aliexpress.com/w/wholesale-tuya+zigbee+${encodeURIComponent(d.name.replace(/[_()]/g,' '))}.html?aff_short_key=dlnraja`;

return `
<div class="card bg-slate-800 rounded-xl border border-slate-700 p-5 flex flex-col gap-4 relative overflow-hidden group" 
     data-d="${d.id}" 
     data-c="${d.class}" 
     data-s="${[d.id, d.name, ...d.mfrs, ...d.pids, ...d.caps].join(' ').toLowerCase()}">
  
  <div class="flex justify-between items-start">
    <div>
      <h3 class="font-bold text-lg text-slate-100 leading-tight mb-1 group-hover:text-blue-400 transition-colors">${d.name}</h3>
      <div class="flex items-center gap-2 text-xs text-slate-400 font-mono">
        <span>${d.class}</span>
        <span>•</span>
        <span>${d.id}</span>
      </div>
    </div>
    ${protoBadge}
  </div>

  <div class="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 text-xs font-mono break-all space-y-2">
    <div class="flex flex-wrap gap-1">${fps} ${moreFps}</div>
    ${d.pids.length ? `<div class="text-slate-500 pt-1 border-t border-slate-700/50">${d.pids.slice(0,3).join(', ')}${d.pids.length>3?'...':''}</div>` : ''}
  </div>

  <div class="flex flex-wrap gap-1">
    ${caps}
    ${d.caps.length > 12 ? `<span class="text-xs text-slate-500 px-1">+${d.caps.length-12}</span>` : ''}
  </div>

  <div class="mt-auto pt-4 flex gap-2 border-t border-slate-700">
    <button onclick="toggleDetail(this)" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1">
      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Details
    </button>
    <a href="${srcUrl}" target="_blank" class="bg-slate-700 hover:bg-slate-600 text-slate-300 p-2 rounded-lg transition-colors" title="View Source">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
    </a>
    <a href="${bugUrl}" target="_blank" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg border border-red-500/20 transition-colors" title="Report Bug">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
    </a>
  </div>

  <div class="detail border-t border-slate-700 pt-4 mt-2 text-sm text-slate-300">
    <div class="grid grid-cols-1 gap-4">
      <div>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Fingerprints</span>
        <div class="mt-1 font-mono text-xs bg-slate-950 p-2 rounded border border-slate-700 select-all">${d.mfrs.join(', ')}</div>
      </div>
      <div>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Product IDs</span>
        <div class="mt-1 font-mono text-xs text-slate-400">${d.pids.join(', ') || 'N/A'}</div>
      </div>
      <div>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Capabilities</span>
        <div class="mt-1 text-xs text-slate-400 leading-relaxed">${d.caps.join(', ')}</div>
      </div>
      <a href="${shopUrl}" target="_blank" class="block w-full text-center bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg transform transition hover:-translate-y-0.5">
        🛒 Search on AliExpress
      </a>
    </div>
  </div>
</div>`;
}

function js(){return`
const grid=document.getElementById('grid');
const cards=[...grid.querySelectorAll('.card')];
const search=document.getElementById('search');
const filtersEl=document.getElementById('filters');
const classes=[...new Set(cards.map(c=>c.dataset.c))].sort();

// Create Filters
let activeFilter='all';
const filterBtnClass = 'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200';
const activeClass = 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30';
const inactiveClass = 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200';

filtersEl.innerHTML=\`
  <button class="\${filterBtnClass} \${activeClass}" data-f="all">All (\${cards.length})</button>
  \${classes.map(c=>{
    const n=cards.filter(x=>x.dataset.c===c).length;
    return \`<button class="\${filterBtnClass} \${inactiveClass}" data-f="\${c}">\${c.charAt(0).toUpperCase()+c.slice(1)} (\${n})</button>\`
  }).join('')}
\`;

filtersEl.addEventListener('click',e=>{
  const btn = e.target.closest('button');
  if(!btn || !btn.dataset.f) return;
  
  activeFilter=btn.dataset.f;
  
  // Update UI
  [...filtersEl.querySelectorAll('button')].forEach(b => {
    const isActive = b.dataset.f === activeFilter;
    b.className = \`\${filterBtnClass} \${isActive ? activeClass : inactiveClass}\`;
  });
  
  filterCards();
});

search.addEventListener('input',filterCards);

function filterCards(){
  const q=search.value.toLowerCase().trim();
  let visible = 0;
  
  cards.forEach(c=>{
    const matchClass=activeFilter==='all'||c.dataset.c===activeFilter;
    const matchSearch=!q||c.dataset.s.includes(q);
    
    if(matchClass&&matchSearch) {
      c.style.display='';
      c.style.opacity='0';
      requestAnimationFrame(() => c.style.opacity='1');
      visible++;
    } else {
      c.style.display='none';
    }
  });
}

window.toggleDetail = function(btn) {
  const card = btn.closest('.card');
  const detail = card.querySelector('.detail');
  const isOpen = detail.classList.contains('open');
  
  detail.classList.toggle('open');
  btn.innerHTML = isOpen 
    ? '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Details'
    : '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg> Hide';
    
  if(!isOpen) {
    // Scroll slightly if needed
    // card.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
};
`;}
