'use strict';
/** P-KB3 Zigbee groups (Z2M groups idea, own implementation): opt-in membership via setting `pe_group_id` (1..0xFFF7). */
function parseGroupIds(v) {
  return [...new Set(String(v ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= 0xFFF7))].slice(0, 8);
}
async function applyGroups(device, zclNode, { endpoint = 1 } = {}) {
  let ids = []; try { ids = parseGroupIds(device?.getSetting?.('pe_group_id')); } catch { return { added: [] }; }
  const g = zclNode?.endpoints?.[endpoint]?.clusters?.groups; const added = [], failed = [];
  if (!g || !ids.length) {return { added, failed };}
  for (const id of ids) { try { await g.addGroup({ groupId: id, groupName: '' }); added.push(id); } catch { failed.push(id); } }
  return { added, failed };
}
module.exports = { parseGroupIds, applyGroups };
