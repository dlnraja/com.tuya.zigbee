'use strict';
const B=[/\bLLM\b/gi,/\bGPT\b/gi,/\bNLP\b/gi,/\bneural\b/gi,/\b(?:machine|deep)\s*learning/gi,/\bensemble\b/gi,/\balgorithm\w*/gi,/\bauto[- ]?respond\w*/gi,/\bfork[- ]?integrat\w*/gi,/\bdata[- ]?query/gi,/\blanguage\s*model/gi,/\bartificial\s*intelligence/gi,/\bsingle[- ]page\s*app/gi,/\bSPA\b/gi,/Auto-publish\w*/gi,/\bIMAP\w*/gi,/\bGmail\w*/gi,/\bOOM\b/gi,/SPA\s*render\w*/gi,/envelope[- ]only/gi,/scan[- ]forum\w*/gi,/upstream[- ]triage\w*/gi,/session\s*API/gi,/diagnostics?\s*(?:report|state|summary|scripts?)/gi,/OAuth/gi,/pipeline/gi,/infrastructure/gi,/\bcron\b/gi,/\bworkflow\w*/gi,/forum\s*(?:responder|message|state|scan)/gi,/bot\s*self/gi,/token\s*(?:exchange|endpoint|health|refresh|expired)/gi,/GitHub\s*(?:state|Actions?)/gi,/AI\s*(?:Battle|features|changelog)/gi,/multi-AI/gi,/delegation\s*token/gi,/client_secret/gi,/API\s*(?:auth|key)/gi,/scraping/gi,/sanitiz\w+\s+\w+/gi,/\bautomation\b/gi,/triage\s*timeout/gi,/fingerprint\s*research/gi,/auto[- ]resolve/gi,/PII\s*leak\w*/gi,/data\s*sanitiz\w+/gi,/Screenshots?\s*updated/gi,/time\s*guard/gi,/processed\s*IDs?/gi,/\benrichment\b/gi];
const S=[/\d+\s*drivers?\s*(?:and|,|\|)\s*[\d,]+\+?\s*fingerprints?/gi,/[\d,]+\+?\s*fingerprints?\s*now\.?/gi,/\d+\s*drivers?\s*now\.?/gi,/\*?\d+\s*drivers?\s*\|\s*[\d,]+\+?\s*fingerprints?\*?/gi];
function sanitize(t){
  if(!t)return t;
  for(const r of B){r.lastIndex=0;t=t.replace(r,'');}
  for(const r of S){r.lastIndex=0;t=t.replace(r,'');}
  return t.replace(/,\s*,/g,',').replace(/,\s*\./g,'.').replace(/\.\s*\./g,'.').replace(/^\s*,\s*/,'').replace(/\n{3,}/g,'\n\n').trim();
}
module.exports={sanitize};
