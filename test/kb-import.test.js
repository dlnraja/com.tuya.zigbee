'use strict';
const assert=require('assert');const fs=require('fs');const os=require('os');const path=require('path');
const imp=require('../scripts/kb/kb-import');const compact=require('../scripts/kb/build-compact');const kbLocal=require('../scripts/research/lib/kb-local');const enr=require('../scripts/kb/enrich-candidates');
describe('P-KB importer',()=>{
 it('parseZhc assigns tuya.fingerprint and zigbeeModel to the following model',()=>{
  const src=`{\n fingerprint: tuya.fingerprint("TS0601", ["_TZE200_aaaa1111", "_TZE204_bbbb2222"]),\n model: "X1",\n vendor: "Acme",\n description: "Thing",\n},{\n zigbeeModel: ["TS0204"],\n model: "TS0204",\n vendor: "Tuya",\n description: "Gas",\n}`;
  const r=imp.parseZhc(src);assert.strictEqual(r.length,2);assert.deepStrictEqual(r[0].fingerprints.map(f=>f.mfr),['_TZE200_aaaa1111','_TZE204_bbbb2222']);assert.strictEqual(r[0].fingerprints[0].pid,'TS0601');assert.deepStrictEqual(r[1].zigbeeModel,['TS0204']);assert.strictEqual(r[1].fingerprints.length,0);});
 it('parseZhc handles explicit modelID/manufacturerName objects',()=>{const r=imp.parseZhc(`fingerprint: [{modelID: "TS011F", manufacturerName: "_TZ3000_abcdefgh"}],\n model: "P1",\n vendor: "V",\n description: "D",`);assert.deepStrictEqual(r[0].fingerprints,[{mfr:'_TZ3000_abcdefgh',pid:'TS011F'}]);});
 it('parseZ2mPage reads the table and options',()=>{const p=imp.parseZ2mPage('| Model | M1  |\n| Vendor  | [Tuya](/supported-devices/#v=Tuya)  |\n| Description | A plug |\n| Exposes | switch (state), power, energy |\n\n* `power_outage_memory`: x\n');
  assert.strictEqual(p.model,'M1');assert.strictEqual(p.vendor,'Tuya');assert.deepStrictEqual(p.exposes,['switch (state)','power','energy']);assert.deepStrictEqual(p.options,['power_outage_memory']);});
 it('compact build is deterministic, cited and size-bounded',()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'kb-'));fs.mkdirSync(path.join(d,'index/zhc'),{recursive:true});
  fs.writeFileSync(path.join(d,'index/zhc/entries.json'),JSON.stringify({cite:{source:'zhc',repo:'r',license:'MIT',commit:'abc',date:'2026-10-21'},entries:[{model:'X1',fingerprints:[{mfr:'_TZE200_aaaa1111',pid:'TS0601'}],url:'https://u/1'}]}));
  const a=compact.build(d),b=compact.build(d);assert.deepStrictEqual(a,b);assert.deepStrictEqual(a.couples['_TZE200_aaaa1111|TS0601'][0],['zhc','X1','https://u/1']);assert.strictEqual(a.sources.zhc.commit,'abc');
  const f=path.join(d,'c.json');assert.strictEqual(compact.write(a,f),true);assert.strictEqual(compact.write(a,f),false);
  process.env.KB_MAX_BYTES='10';try{delete require.cache[require.resolve('../scripts/kb/build-compact')];assert.throws(()=>require('../scripts/kb/build-compact').write(a,path.join(d,'x.json')),/too big/);}finally{delete process.env.KB_MAX_BYTES;delete require.cache[require.resolve('../scripts/kb/build-compact')];}
  const recs=kbLocal.records(f);assert.strictEqual(recs[0].src,'kb:zhc');assert.strictEqual(recs[0].conf,0.9);assert.strictEqual(recs[0].commit,'abc');});
 it('kb-local returns [] when file missing',()=>{assert.deepStrictEqual(kbLocal.records('/nonexistent/x.json'),[]);});
 it('enrich candidates skip covered couples and split by source reliability',()=>{const kb={couples:{'_TZE200_aaaa1111|TS0601':[['zhc','X','u']],'_TZ3000_bbbbbbbb|TS011F':[['johan','d','v']],'_TZ3000_cccccccc|TS0001':[['zha','q','w']]}};
  const c=enr.candidates(kb,new Set(['_tz3000_cccccccc|ts0001']));assert.strictEqual(c.confirmed.length,1);assert.strictEqual(c.provisional.length,1);});
 it('P3068 candidate verdicts promote/demote exact couples only, additive',()=>{const kb={couples:{'TUYATEC-aaaa|RH3052':[['johan','t',"u1"]],'TUYATEC-aaaa|TS0201':[['johan','t',"u2"]],'_TZ3000_bbbb|RH3001':[['johan','d',"u3"]],'_TZ3000_dddd|TS0001':[['zhc','m',"u4"]]}};
  const plain=enr.candidates(kb,new Set());assert.strictEqual(plain.demoted,undefined);assert.strictEqual(plain.provisional.length,3);
  const v={promoted:[{mfr:'tuyatec-AAAA',pid:'rh3052',source:'blakadder',url:'https://b/1',target:'temphumidsensor',status:'parked-budget'}],demoted:[{mfr:'_TZ3000_bbbb',pid:'RH3001',reason:'x',upstreamPids:['TS0203']},{mfr:'_TZ3000_dddd',pid:'TS0001',reason:'ignored: reliable ref wins'}]};
  const c=enr.candidates(kb,new Set(),v);assert.deepStrictEqual(c.confirmed.map(e=>e.pid).sort(),['RH3052','TS0001']);assert.strictEqual(c.confirmed.find(e=>e.pid==='RH3052').refs[0],'https://b/1');
  assert.deepStrictEqual(c.provisional.map(e=>e.pid),['TS0201']);assert.deepStrictEqual(c.demoted.map(e=>e.mfr+'|'+e.pid),['_TZ3000_bbbb|RH3001']);});
});
