'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');

function run(cmd, args, timeout=240000) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', shell: process.platform==='win32', timeout });
  return { ok: res.status===0, stdout: res.stdout||'', stderr: res.stderr||'' };
}
function has(cmd){ const probe = process.platform==='win32' ? `where ${cmd}` : `which ${cmd}`; return run(process.platform==='win32'?'cmd':['/c',probe]).ok; }
function extract(zip, out, opts={}) {
  fs.mkdirSync(out, { recursive:true });
  const TIMEOUT = (opts.timeoutSec?opts.timeoutSec:240)*1000;
  if (opts.use7z!==false && has('7z')) { const r = run('7z', ['x','-y', zip, `-o${out}`], TIMEOUT); if (r.ok) return { ok:true, method:'7z' }; }
  try { const ez = require('extract-zip'); ez.sync ? ez.sync(zip, { dir: out }) : null; return { ok:true, method:'extract-zip' }; } catch (error) { /* extract-zip not available */ }
  if (process.platform==='win32') { const ps = `Expand-Archive -LiteralPath '${zip.replace(/'/g,"''")}' -DestinationPath '${out.replace(/'/g,"''")}' -Force`; const r = run('javascript',['-NoProfile','-ExecutionPolicy','Bypass','-Command',ps], TIMEOUT); if (r.ok) return { ok:true, method:'Expand-Archive' }; }
  const r = run('unzip',['-o', zip, '-d', out], TIMEOUT); if (r.ok) return { ok:true, method:'unzip' }; return { ok:false, method:'none', error:r.stderr || 'all methods failed' };
}
module.exports = { extract, has };
