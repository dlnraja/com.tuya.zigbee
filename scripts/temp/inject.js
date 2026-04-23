const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/cross-ref-intelligence.js', 'utf8');

const enhancedStr = 
// --- ADVANCED 5-SOURCE CROSS-REFERENCING INJECTION ---
// Cross-references diagnostics, forum, expectations, github, AND external Zigbee sources
if (diag && Array.isArray(diag.processed)) {
    for (const d of diag.processed) {
        if (!d.ai_cross_ref) continue;
        
        let confidence = 0;
        let matchedSources = 0;
        
        if (JSON.stringify(forum || {}).includes(d.id)) matchedSources++;
        if (JSON.stringify(gh || {}).includes(d.id)) matchedSources++;
        if (d.ai_cross_ref.known_z2m_quirks) matchedSources++;
        if (d.ai_cross_ref.suggested_driver) matchedSources++;
        
        if (matchedSources >= 2) {
           report.correlations.push({
               type: 'deep_5_source_match',
               diag_id: d.id,
               driver: d.ai_cross_ref.suggested_driver,
               z2m_quirk: d.ai_cross_ref.known_z2m_quirks,
               inferred: d.ai_cross_ref.inferred_device_type,
               confidence: matchedSources * 20
           });
        }
    }
}
;

if (!txt.includes('ADVANCED 5-SOURCE CROSS-REFERENCING')) {
   txt = txt.replace(/const report=\{.*?\} ;/, 'const report={ts:new Date().toISOString(),correlations:[],actionable:[],resolved:[],patterns:[]};\n' + enhancedStr);
   fs.writeFileSync('.github/scripts/cross-ref-intelligence.js', txt);
   console.log('Added deep 5-source cross-reference logic to cross-ref-intelligence.js');
}
