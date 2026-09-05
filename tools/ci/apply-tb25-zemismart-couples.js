'use strict';

/**
 * apply-tb25-zemismart-couples.js
 *
 * Applies verified TB25/Zemismart/NovaDigital couples from:
 * - Forum post #2173 (Gabriel_Pedrosa_Mach — field-validated)
 * - Z2M converters (Koenkk/zigbee-herdsman-converters, tuya.ts)
 * - Blakadder cross-ref
 *
 * Sources: forum-140352-#2173, z2m-tuya.ts (TB26-2, TB26-3, NFZB-03, TS0003_switch_3_gang_with_backlight),
 *          forum-140352-#2182 (TB25 series confirmed by Gabriel + Zemismart)
 *
 * Couples to add:
 *  1-gang:  _TZ3000_ovyaisip + TS0001  → switch_1gang
 *           _TZ3000_pk8tgtdb + TS0001  → switch_1gang
 *  2-gang:  _TZ3000_kgxej1dv + TS0002  → wall_switch_2gang_1way (already in mfs but confirm driver)
 *           _TZ3000_jjdkhueq + TS0002  → wall_switch_2gang_1way
 *  3-gang:  _TZ3000_yervjnlj + TS0003  → wall_switch_3gang_1way
 *           _TZ3000_vjhcenzo + TS0003  → wall_switch_3gang_1way
 *           _TZ3000_qxcnwv26 + TS0003  → wall_switch_3gang_1way  (Z2M: TS0003_switch_3_gang)
 *           _TZ3000_eqsair32 + TS0003  → wall_switch_3gang_1way  (Z2M: TB26-3 Zemismart)
 *           _TZ3000_f09j9qjb + TS0003  → wall_switch_3gang_1way
 *           _TZ3000_fawk5xjv + TS0003  → wall_switch_3gang_1way  (Z2M: NFZB-03 NovaDigital)
 *           _TZ3000_ok0ggpk7 + TS0003  → wall_switch_3gang_1way  (Z2M: TS0003_switch_3_gang_with_backlight)
 *  4-gang:  _TZE204_aagrxlbd + TS0601  → wall_switch_4_gang_tuya (Z2M: TS0601_switch_4_gang_1)
 *  6-gang:  _TZE200_r731zlxk + TS0601  → wall_switch_6_gang_tuya (Z2M: TS0601_switch_6_gang)
 *           _TZE200_shkxsgis + TS0601  → wall_switch_6_gang_tuya (Gabriel field-validated, same driver as _TZE284_shkxsgis)
 */

const fs = require('fs');
const path = require('path');

const MFS_DB_PATH = path.join(__dirname, '../../data/mfs_db.json');
const APPLY = process.argv.includes('--apply');

const NEW_COUPLES = [
  // 1-gang Zemismart/Novadigital TB25 (Gabriel forum-#2173, not in Z2M yet)
  { mfr: '_TZ3000_ovyaisip', pid: 'TS0001', driverId: 'switch_1gang', source: 'forum-140352-#2173:gabriel-tb25-1gang', label: 'Zemismart TB25-1 / Novadigital 1-gang' },
  { mfr: '_TZ3000_pk8tgtdb', pid: 'TS0001', driverId: 'switch_1gang', source: 'forum-140352-#2173:gabriel-tb25-1gang', label: 'Zemismart TB25-1 1-gang variant' },
  // 2-gang (in mfs_db with wrong/no driverId — ensure correct)
  { mfr: '_TZ3000_kgxej1dv', pid: 'TS0002', driverId: 'wall_switch_2gang_1way', source: 'forum-140352-#2173:gabriel-tb25-2gang', label: 'Zemismart TB25-2 2-gang' },
  { mfr: '_TZ3000_jjdkhueq', pid: 'TS0002', driverId: 'wall_switch_2gang_1way', source: 'forum-140352-#2173:gabriel-tb25-2gang', label: 'Zemismart TB25-2 2-gang variant' },
  // 3-gang (confirmed Zemismart TB25-3 + NovaDigital NFZB-03)
  { mfr: '_TZ3000_yervjnlj', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', source: 'forum-140352-#2173:gabriel-tb25-3gang', label: 'Zemismart TB25-3 3-gang' },
  { mfr: '_TZ3000_vjhcenzo', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', source: 'forum-140352-#2173:gabriel-tb25-3gang', label: 'Zemismart TB25-3 3-gang variant' },
  { mfr: '_TZ3000_qxcnwv26', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', source: 'forum-140352-#2173:gabriel-tb25-3gang+z2m:TS0003_switch_3_gang', label: 'Zemismart TB25-3 (Z2M TS0003_switch_3_gang)' },
  { mfr: '_TZ3000_eqsair32', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', source: 'forum-140352-#2173:gabriel-tb25-3gang+z2m:TB26-3-zemismart', label: 'Zemismart TB26-3 (Z2M whitelabel)' },
  { mfr: '_TZ3000_f09j9qjb', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', source: 'forum-140352-#2173:gabriel-tb25-3gang', label: 'Zemismart/Novadigital TB25-3 variant' },
  { mfr: '_TZ3000_fawk5xjv', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', source: 'forum-140352-#2173:gabriel-tb25-3gang+z2m:NFZB-03-novadigital', label: 'NovaDigital NFZB-03 3-gang (Z2M)' },
  { mfr: '_TZ3000_ok0ggpk7', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', source: 'forum-140352-#2173:gabriel-tb25-3gang+z2m:TS0003_with_backlight', label: 'Tuya 3-gang with backlight (Z2M)' },
  // 4-gang EF00 (Z2M: TS0601_switch_4_gang_1)
  { mfr: '_TZE204_aagrxlbd', pid: 'TS0601', driverId: 'wall_switch_4_gang_tuya', source: 'forum-140352-#2173:gabriel-tb25-4gang+z2m:TS0601_switch_4_gang_1', label: 'Zemismart TB25-4 4-gang EF00 (Z2M _TZE204_aagrxlbd)' },
  // 6-gang EF00
  { mfr: '_TZE200_r731zlxk', pid: 'TS0601', driverId: 'wall_switch_6_gang_tuya', source: 'forum-140352-#2173:gabriel-tb25-6gang+z2m:TS0601_switch_6_gang', label: 'Zemismart TB25-6 6-gang EF00 (Z2M _TZE284_r731zlxk sibling)' },
  { mfr: '_TZE200_shkxsgis', pid: 'TS0601', driverId: 'wall_switch_6_gang_tuya', source: 'forum-140352-#2173:gabriel-tb25-6gang', label: 'Zemismart 6-gang (TZE200 sibling of TZE284_shkxsgis)' },
];

async function main() {
  const raw = fs.readFileSync(MFS_DB_PATH);
  const db = JSON.parse(raw);

  const toAdd = [];
  const toUpdate = [];

  for (const c of NEW_COUPLES) {
    const existing = db[c.mfr];
    if (!existing) {
      toAdd.push(c);
    } else {
      const hasModelId = Array.isArray(existing.modelIds) && existing.modelIds.includes(c.pid);
      const correctDriver = existing.driverId === c.driverId;
      if (!hasModelId || !correctDriver) {
        toUpdate.push({ ...c, existing });
      } else {
        console.log('✅ Already correct:', c.mfr, '+', c.pid, '→', c.driverId);
      }
    }
  }

  console.log('\n--- TO ADD (' + toAdd.length + ') ---');
  for (const c of toAdd) console.log(' +', c.mfr, '+', c.pid, '→', c.driverId, '[', c.label, ']');

  console.log('\n--- TO UPDATE (' + toUpdate.length + ') ---');
  for (const c of toUpdate) console.log(' ~', c.mfr, ':', JSON.stringify(c.existing), '→', c.driverId, '+', c.pid);

  if (!APPLY) {
    console.log('\nDry-run. Pass --apply to commit changes.');
    return;
  }

  // Apply
  for (const c of toAdd) {
    db[c.mfr] = { driverId: c.driverId, source: c.source, modelIds: [c.pid] };
  }
  for (const c of toUpdate) {
    const e = db[c.mfr] || {};
    e.driverId = c.driverId;
    e.source = c.source;
    if (!Array.isArray(e.modelIds)) e.modelIds = [];
    if (!e.modelIds.includes(c.pid)) e.modelIds.push(c.pid);
    db[c.mfr] = e;
  }

  fs.writeFileSync(MFS_DB_PATH, JSON.stringify(db, null, 2) + '\n', 'utf8');
  console.log('\n✅ mfs_db updated with', toAdd.length + toUpdate.length, 'changes.');
}

main().catch(console.error);
