'use strict';
/** Builds our own consolidated KB (markdown, own words, every fact cited) from data/kb + repo docs + git history.
 *  Output: docs/knowledge/KB/ (and KB_STORE_DIR mirror when set). Idempotent; CHANGELOG.md appended only when content changes. */
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT=path.join(__dirname,'../..');const OUT=process.env.KB_OUT_DIR||path.join(ROOT,'docs/knowledge/KB');const STORE=process.env.KB_STORE_DIR||null;
const J=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return d;}};
const git=a=>{try{return cp.execSync('git '+a,{cwd:ROOT,maxBuffer:64<<20}).toString();}catch{return '';}};
const REPO='https://github.com/dlnraja/com.tuya.zigbee/blob/master/';
const cite=(s,u,c)=>`[${s}${c?'@'+String(c).slice(0,7):''}](${u})`;
function families(kb){const fam={};for(const [k,refs] of Object.entries(kb.couples)){const [m,p]=k.split('|');if(!/^TS|^TY/i.test(p))continue;(fam[p]=fam[p]||[]).push([m,refs]);}return fam;}
function pages(){const kb=J(path.join(ROOT,'data/kb/couples.json'),{sources:{},couples:{}});const S=kb.sources;const P={};
 const fam=families(kb);const zha=J(process.env.KB_DIR?path.join(process.env.KB_DIR,'index/zha/entries.json'):'',null);
 const dpBy={};if(zha)for(const e of zha.entries)for(const f of e.fingerprints){const b=(dpBy[f.mfr+'|'+f.pid]=dpBy[f.mfr+'|'+f.pid]||new Set());for(const d of e.dps)b.add(d);}
 let idx='';
 for(const pid of Object.keys(fam).sort()){const rows=fam[pid].sort((a,b)=>a[0].localeCompare(b[0]));
  let md=`# Family ${pid}\n\n${rows.length} manufacturerName fingerprints seen upstream with productId ${pid}. Each row cites the upstream definition (commit-pinned). DPs come from ZHA quirks when present; firmware rows from the Koenkk OTA index.\n\n| manufacturerName | upstream model | DPs (ZHA) | sources |\n|---|---|---|---|\n`;
  for(const [m,refs] of rows){const d=[...(dpBy[m+'|'+pid]||[])].filter(x=>x!==undefined).sort((a,b)=>a-b).join(',');md+=`| \`${m}\` | ${refs.map(r=>r[1]).filter(Boolean)[0]||''} | ${d} | ${refs.map(r=>cite(r[0],r[2],(S[r[0]]||{}).commit)).join(' ')} |\n`;}
  P[`devices/${pid}.md`]=md;idx+=`- [${pid}](devices/${pid}.md) — ${rows.length} fingerprints\n`;}
 P['devices/README.md']='# Device families\n\nGenerated from data/kb/couples.json (facts only).\n\n'+idx;
 // lessons from git (P-numbers)
 const les={};for(const l of git("log origin/master --format=%H%x09%cs%x09%s").split('\n')){const [h,d,s]=l.split('\t');if(!s)continue;for(const p of s.match(/\bP\d{3,4}[a-z]?\b/g)||[])if(!les[p])les[p]={h,d,s:s.replace(/\|/g,'/').slice(0,160)};}
 P['lessons.md']='# Lessons learned (P-numbers)\n\nFirst commit that names each P-number; summary is the commit subject. Details live in the cited commit.\n\n| P | date | commit | subject |\n|---|---|---|---|\n'+Object.keys(les).sort((a,b)=>parseInt(b.slice(1))-parseInt(a.slice(1))).map(p=>`| ${p} | ${les[p].d} | [${les[p].h.slice(0,9)}](https://github.com/dlnraja/com.tuya.zigbee/commit/${les[p].h}) | ${les[p].s} |`).join('\n')+'\n';
 // rules + knowledge pointers
 const list=dir=>(fs.existsSync(path.join(ROOT,dir))?fs.readdirSync(path.join(ROOT,dir)).filter(f=>f.endsWith('.md')).sort():[]).map(f=>{const t=fs.readFileSync(path.join(ROOT,dir,f),'utf8');return `- [${(t.match(/^#\s+(.*)$/m)||[])[1]||f}](${REPO}${dir}/${f})`;}).join('\n');
 P['project-rules.md']='# Project rules & decisions\n\nCore rules (summary in our words):\n- Exact manufacturerName+productId, one couple one driver; a specific driver wins, generic stays fallback.\n- One reliable source is enough; never invent; record the source. Unconfirmed → provisional tier (data/leads/provisional-couples.json).\n- Native clusters are mandatory for pairing; Tuya EF00 and others stay optional.\n- Additive only; nothing that works is removed. Versions strictly incremental and aligned across branches.\n- No copy-paste from other projects: rewrite, credit with id, link and author.\n- No --no-verify, no force-push, no history rewrite. Every fix ships with unit tests.\n\nFull texts (SSOT):\n'+list('docs/rules')+'\n';
 const kn=list('docs/knowledge');
 P['athom-build.md']='# Athom build & publish lessons\n\n- Socket hang up: the upload succeeds; Athom-side processing fails later. Failure rate grows with manifest (app.json) size; parallel uploads and file count are not the cause. Retry policy v2: socket hang up 4 retries, other transient 2, AggregateError 2 then bisect, unknown none. Stop waiting once Athom marks a build failed.\n- AggregateError / processing_failed: found by bisecting commits between the last good and first bad build, then fixed and guarded in CI.\n- Size: keep research data out of the bundle via .homeyignore (backups/, tmp/, data/kb/, data/leads/).\n\nDetailed notes:\n'+kn.split('\n').filter(l=>/ATHOM|SOCKET|AGGREGATE|ACTIONS|GHA|WORKFLOW/i.test(l)).join('\n')+'\n';
 P['protocols.md']=`# Protocols (summary in our words)

## Tuya EF00 over the air (Zigbee cluster 0xEF00, fact-checked 2026-10-21)
- Coordinator → device: 0x00 dataRequest (set DPs), 0x03 dataQuery (ask all DPs), 0x04 sendData, 0x10 mcuVersionRequest, 0x12/0x14 MCU OTA notify/block response, 0x24 mcuSyncTime (time answer), 0x25 gateway connection status, 0x61 weather sync. Source: ${cite('zigbee-herdsman cluster.ts','https://github.com/Koenkk/zigbee-herdsman/blob/master/src/zspec/zcl/definition/cluster.ts')}.
- Device → coordinator: 0x01 dataResponse, 0x02 dataReport, 0x05/0x06 activeStatusReport(Alt), 0x11 mcuVersionResponse, 0x13/0x15 MCU OTA block request/result, 0x24 mcuSyncTime (time request), 0x25 gateway status request, 0x60 weather request. Same source.
- Time answer = 8 bytes: 4-byte big-endian UTC seconds then 4-byte local seconds (UTC + zone + DST). Most devices use the 1970 epoch; some expect a 2000 epoch (Z2M option time_start: 1970/2000/off). Sources: ${cite('zhc tuya.ts','https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/lib/tuya.ts')}, ${cite('Tuya Zigbee UART protocol','https://developer.tuya.com/en/docs/iot/tuya-zigbee-module-uart-communication-protocol?id=K9ear5khsqoty')}.
- DP datatypes: 0 raw, 1 bool, 2 value (4-byte BE), 3 string, 4 enum, 5 bitmap (1/2/4 bytes). Source: zhc tuya.ts dataTypes.
- Some devices only start reporting after a dataQuery on announce/rejoin (zhc onEvent). Sleepy devices: queue writes, flush on wake.

## Tuya module ↔ MCU serial (UART) protocol — not the same id space
- Frames 55 AA, version, 2-byte seq, command, 2-byte length, data, checksum = sum of all previous bytes mod 256. UART ids differ from EF00 ids: e.g. 0x04 module→MCU DP data, 0x05 MCU response, 0x06 MCU report (with linkage), 0x2C report without linkage, 0x28 query DP, 0x0B–0x0E MCU OTA, 0x24 time sync, 0x3A/0x3B weather, 0x2B low-power wake window. Source: ${cite('Tuya MCU standard protocol (Zigbee)','https://developer.tuya.com/en/docs/mcu-standard-protocol/mcusdk-zigbee-uart-protocol?id=Kdg17v4544p37')}.
- Locks use version byte 0x03 with the same 0x24 time layout. Source: ${cite('Tuya Zigbee lock MCU protocol','https://developer.tuya.com/en/docs/iot/zigbee-door-lock-universal-docking-agreement?id=K9bjcnh616mg5')}.

## Wi-Fi LAN 3.1–3.5 (fact-checked against tinytuya core)
- 3.1–3.4 frames start with prefix 0x000055AA; 3.5 uses prefix 0x00006699 with AES-GCM (auth tag; bad tag = frame dropped). Source: ${cite('tinytuya header.py / Monitor.py','https://github.com/jasonacox/tinytuya/tree/master/tinytuya/core')}.
- 3.1: AES-ECB with the local key, only on control payloads, plus an MD5-based signature; 3.2/3.3: AES-ECB on the payload behind a version header, CRC32 trailer; 3.4: session-key negotiation before use and HMAC-SHA256 trailer instead of CRC; 3.5: session key + GCM. Sources: tinytuya XenonDevice.py, ${cite('tuya-local','https://github.com/make-all/tuya-local')}, ${cite('localtuya','https://github.com/rospogrigio/localtuya')}.

## ZCL clusters & bound clusters
- Remotes send commands (onOff, levelControl, scenes, 0xE000/0xE001 Tuya) to the coordinator; Homey needs a BoundCluster to receive them. TS004F switches between command (dimmer) and event (scene) mode via manufacturer attribute 0x8004 tuyaOperationMode (enum8, 0=command, 1=event) on genOnOff (zhc tuya.ts). Source: ${cite('Athom zigbee-clusters','https://github.com/athombv/node-zigbee-clusters')}.

## OTA
- Images indexed by manufacturerCode + imageType + fileVersion, with sha512. Homey performs OTA itself; we only read queryNextImage requests. Source: ${cite('Koenkk zigbee-OTA','https://github.com/Koenkk/zigbee-OTA')}.
`;
 P['homey-sdk.md']=`# Homey SDK rules & pitfalls (our words)
- Driver match is on exact zigbee.manufacturerName + productId arrays in driver.compose.json; endpoints/clusters must match the interview. Source: ${cite('Homey Apps SDK','https://apps.developer.homey.app/wireless/zigbee')}.
- Flow card ids must exist in app.json or triggers throw (invalid_flow_card_id).
- Large app.json slows/destroys Athom processing; keep drivers lean.
- Settings changes arrive via onSettings; never block it on a sleepy device.
- Use BoundCluster for incoming commands; register listeners once (memory leaks otherwise).

Related notes:
${kn.split('\n').filter(l=>/HOMEY|SDK|FLOW|BUTTON/i.test(l)).join('\n')}
`;

 const cat=(re)=>kn.split('\n').filter(l=>re.test(l)).join('\n')||'- (none yet)';
 P['field-notes.md']='# Field notes by topic (pointers to our own write-ups, commit-pinned via repo history)\n\n## Forum threads (140352, 154077, Zigbee tag, other apps)\n'+cat(/FORUM|THREAD|X_SCAN|APPS/i)+'\n\n## Gmail diagnostics (patterns only)\n'+cat(/GMAIL|DIAG/i)+'\n\n## CI / Athom build history\n'+cat(/ATHOM|GHA|ACTIONS|WORKFLOW|CI_/i)+'\n\n## Bastien\n'+cat(/BASTIEN/i)+'\n\n## Homey firmware\n'+cat(/FIRMWARE|HOMEY_NEWS/i)+'\n\n## Device field notes\n'+cat(/FIELD|DEVICE|CURTAIN|SOIL|AOYAN|GLEDOPTO|HOBEIAN/i)+'\n';
 const prov=J(path.join(ROOT,'data/leads/provisional-couples.json'),{entries:[]}).entries;const cand=J(path.join(ROOT,'data/leads/kb-enrich-candidates.json'),{confirmed:[],provisional:[]});
 P['leads.md']=`# Open leads\n\n- Provisional tier: ${prov.length} (data/leads/provisional-couples.json)\n- KB candidates not yet in a driver: ${cand.confirmed.length} with a reliable source (conf 0.85–0.9), ${cand.provisional.length} single weak source (conf ≤0.7). Staged, not applied (manifest-size hold).\n\n| mfr | pid | status | conf | source |\n|---|---|---|---|---|\n`+prov.map(e=>`| \`${e.mfr}\` | ${e.pid} | ${e.status} | ${e.confidence} | ${e.evidence} |`).join('\n')+'\n'+cand.confirmed.map(e=>`| \`${e.mfr}\` | ${e.pid} | kb-confirmed | 0.9 | ${e.refs[0]} |`).join('\n')+'\n'+cand.provisional.map(e=>`| \`${e.mfr}\` | ${e.pid} | kb-weak | 0.6 | ${e.refs[0]} |`).join('\n')+'\n';
 const cr=fs.existsSync(path.join(ROOT,'CREDITS.md'))?fs.readFileSync(path.join(ROOT,'CREDITS.md'),'utf8'):'';
 P['people.md']='# People & credits\n\nHandles and their contributions, extracted from CREDITS.md (no personal data).\n\n'+cr.split('\n').filter(l=>/^- \*\*/.test(l)).map(l=>l.slice(0,300)).join('\n')+`\n\nFull list: ${REPO}CREDITS.md\n`;
 P['faq.md']=`# FAQ — recurring problems and fixes

- **Device pairs as "Zigbee Device"/generic socket** → the exact manufacturerName+productId is missing from the right driver; add it (one couple one driver). See leads.md.
- **Buttons/flows don't fire** → remote in scene vs dimmer mode, missing BoundCluster, or dedup too aggressive; handled by ButtonEventRouter (P2926).
- **Clock wrong on LCD sensors/TRVs** → device asks time via EF00 0x24 on wake; answered with UTC+local (time sync module).
- **App crashes / out of memory** → bounded caches and queues, no full-manifest loads at runtime (Peter 10/10, Bastien v1.0.161 fixes).
- **Publish fails with socket hang up / processing_failed** → Athom-side; see athom-build.md.
- **Sleepy sensor settings never apply** → writes are queued and flushed on wake.
- **Soil sensor humidity wrong (ZG-303Z / AY-303Z)** → native 0x0405 = soil moisture, DP109 = air humidity.
- **Temp/humidity sensor paired as switch** → couple was in a switch driver; moved to sensor driver, devices self-heal class (_TZ3000_bjawzodf).
`;
 const srcRows=Object.entries(S).map(([k,s])=>`| ${s.name} | ${s.repo} | ${s.license} | ${String(s.commit).slice(0,9)} | ${s.date} |`).join('\n');
 P['sources.md']=`# Sources\n\n| source | link | licence | commit | date |\n|---|---|---|---|---|\n${srcRows}\n\nOther inputs (pointers, facts only): Homey forum topics 140352, 154077, Zigbee tag, Unknown devices (${'https://community.homey.app/t/140352'}); GitHub issues/PRs of dlnraja/com.tuya.zigbee and JohanBendz/com.tuya.zigbee; CI history (GitHub Actions); Gmail diagnostics (patterns only, no personal data).\n`;
 P['INDEX.md']=`# Homey Tuya KB — index\n\nRegenerated by scripts/kb/build-homey-kb.js. Facts cited per row; text in our own words.\n\n- [Device families](devices/README.md)\n- [Protocols](protocols.md)\n- [Homey SDK](homey-sdk.md)\n- [Athom build lessons](athom-build.md)\n- [Project rules](project-rules.md)\n- [Lessons (P-numbers)](lessons.md)\n- [Open leads](leads.md)\n- [People & credits](people.md)\n- [FAQ](faq.md)\n- [Field notes by topic](field-notes.md)\n- [Sources](sources.md)\n- [Changelog](CHANGELOG.md)\n- [Unknown commands](UNKNOWN_COMMANDS.md)\n- [Cross-app methods](CROSS_APP_METHODS.md)\n- [Method coverage](METHOD_COVERAGE.md)\n- [Lessons P3001–P3016](LESSONS_P3001_P3016.md)\n- [Platform limits](PLATFORM_LIMITS.md) (P3026: Athom, Homey memory, GitHub limits and margins)\n`;
// P3032 index tail: every other .md already in KB/ gets a line, so INDEX.md covers all KB files.
try{const _fs=require('fs'),_p=require('path');const _d=_p.join(__dirname,'..','..','docs','knowledge','KB');const _have=P['INDEX.md'];const _extra=_fs.readdirSync(_d).filter((n)=>n.endsWith('.md')&&n!=='INDEX.md'&&!_have.includes('('+n+')')).sort();const _lab={'DOC_COVERAGE.md':'Documentation coverage (P3032, generated)','CODE_REFERENCE.md':'Code reference: modules, gates, workflows, env flags (P3032, generated)','DP_ENDPOINT_COVERAGE.md':'DP × endpoint coverage (P3018, generated)','DP_ENDPOINT_COVERAGE.notes.md':'DP × endpoint coverage notes','athom-publish-history.md':'Athom publish history','forum-patterns.md':'Forum patterns','WORK_2026-10-24_25.md':'Work log 2026-10-24/25 (P3015–P3030)','MODULES_CORE_AND_CLUSTERS.md':'Core helpers, time sync and custom clusters'};if(_extra.length){P['INDEX.md']+='\n## Other KB files\n\n'+_extra.map((n)=>'- ['+(_lab[n]||n.replace(/\.md$/,''))+']('+n+')').join('\n')+'\n';}}catch(_){/* index tail is best effort */}

 return P;}
function write(P,dir){const h=crypto.createHash('sha1');let changed=0;for(const [f,t] of Object.entries(P).sort()){h.update(f+t);const p=path.join(dir,f);fs.mkdirSync(path.dirname(p),{recursive:true});if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==t){fs.writeFileSync(p,t);changed++;}}
 const hash=h.digest('hex').slice(0,12);const cl=path.join(dir,'CHANGELOG.md');const old=fs.existsSync(cl)?fs.readFileSync(cl,'utf8'):'# KB changelog\n';
 if(!old.includes(hash))fs.writeFileSync(cl,old.trimEnd()+`\n- ${new Date().toISOString().slice(0,10)} content ${hash}: ${changed} files updated, ${Object.keys(P).length} total\n`);return {changed,hash};}
module.exports={pages,write,families};
if(require.main===module){const P=pages();console.log(write(P,OUT));if(STORE)console.log(write(P,STORE));}
