'use strict';
const assert=require('assert');const {assign,batches}=require('../scripts/kb/assign-drivers');const {plan}=require('../scripts/kb/apply-batch');
const dm=(pairs)=>{const byCouple=new Map(),byPid=new Map();for(const [m,p,d] of pairs){const k=`${m}|${p}`.toLowerCase();(byCouple.get(k)||byCouple.set(k,new Set()).get(k)).add(d);(byPid.get(p)||byPid.set(p,new Set()).get(p)).add(d);}return {byCouple,byPid};};
describe('P-KB couple assignment',()=>{
 const kb={couples:{'_TZ3000_aaaaaaaa|TS0043':[['zhc','M','u1']],'_TZ3000_bbbbbbbb|TS0043':[['zhc','M','u1']],'_TZE200_cccccccc|TS0601':[['zhc','N','u2']]}};
 it('sibling rule picks the single specific driver, ignores generic',()=>{const r=assign(kb,[{mfr:'_TZ3000_aaaaaaaa',pid:'TS0043',refs:['u1']}],dm([['_TZ3000_bbbbbbbb','TS0043','button_wireless_3'],['_TZ3000_bbbbbbbb','TS0043','universal_zigbee']]));assert.strictEqual(r.assigned[0].driver,'button_wireless_3');});
 it('TS0601 without sibling stays unassigned; malformed ids rejected',()=>{const r=assign(kb,[{mfr:'_TZE200_cccccccc',pid:'TS0601',refs:['u2']},{mfr:'TS0601',pid:'TZE200_x',refs:['u2']}],dm([['_TZE200_zzzzzzzz','TS0601','radiator_valve']]));assert.strictEqual(r.assigned.length,0);assert.strictEqual(r.unassigned.length,2);});
 it('plan refuses dual couples',()=>{const p=plan([{mfr:'_TZ3000_aaaaaaaa',pid:'TS0043',driver:'button_wireless_3',refs:['u1']}],dm([['_TZ3000_aaaaaaaa','TS0044','button_wireless_4']]),()=>({productId:['TS0043','TS0044']}));assert.strictEqual(p.ok.length,0);assert.match(p.skip[0].why,/dual couple/);});
 it('batches are bounded',()=>{assert.deepStrictEqual(batches([1,2,3,4,5],2).map(b=>b.length),[2,2,1]);});
});
