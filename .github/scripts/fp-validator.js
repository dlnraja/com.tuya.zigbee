'use strict';
// v5.12.5 - Shared fingerprint validation for all automation scripts
const VALID_PREFIXES=/^_T(Z3000|Z3210|Z3218|ZE200|ZE204|ZE284|YZB01|ZB000|Z3290|Z3260|ZB210|Z2000)_/;
const PLACEHOLDER=/^_T[A-Za-z0-9]+_(x{3,}|z{3,}|y{3,}|test|dummy|sample|smart|unknown)/i;
const MIN_SUFFIX=6;
function isValidTuyaFP(fp){
  if(!fp||typeof fp!=='string')return false;
  if(fp.length<12||fp.length>25)return false;
  if(PLACEHOLDER.test(fp))return false;
  const parts=fp.split('_');
  if(parts.length!==3)return false;
  const prefix='_'+parts[1];const suffix=parts[2];
  if(!VALID_PREFIXES.test(fp)&&!prefix.match(/^_T[A-Z][A-Za-z0-9]{4}$/))return false;
  if(suffix.length<MIN_SUFFIX)return false;
  if(/^(.)\1+$/.test(suffix))return false;
  if(/^[a-f0-9]+$/.test(suffix)&&suffix.length<6)return false;
  return true;
}
function extractFP(text){
  const raw=(text||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[];
  return[...new Set(raw.filter(isValidTuyaFP))];
}
function extractFPWithBrands(text){
  const tuya=extractFP(text);
  const brands=(text||'').match(/\b(SONOFF|eWeLink)\b/g)||[];
  return[...new Set([...tuya,...brands])];
}
function extractPID(text){
  const a=((text||'').match(/\bTS[0-9A-Fa-f]{3,5}\b/g)||[]).map(m=>m.toUpperCase());
  const b=(text||'').match(/\b(SNZB-\d{2}\w*|ZBMINI\w*|S[346]1ZB\w*|BASICZBR\d*|TRVZB)\b/g)||[];
  return[...new Set([...a,...b])];
}
module.exports={isValidTuyaFP,extractFP,extractFPWithBrands,extractPID};
