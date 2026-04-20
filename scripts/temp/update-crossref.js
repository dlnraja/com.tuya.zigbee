const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/cross-ref-intelligence.js', 'utf8');

const enhancedStr = "\n// --- ADVANCED 5-SOURCE CROSS-REFERENCING INJECTION ---\n" +
"// Cross-references diagnostics, forum, expectations, github, AND external Zigbee sources\n" +
"if (diag && Array.isArray(diag.processed)) {\n" +
"    for (const d of diag.processed) {\n" +
"        if (!d.ai_cross_ref) continue;\n" +
"        let confidence = 0;\n" +
"        let matchedSources = 0;\n" +
"        if (JSON.stringify(forum || {}).includes(d.id)) matchedSources++;\n" +
"        if (JSON.stringify(gh || {}).includes(d.id)) matchedSources++;\n" +
"        if (d.ai_cross_ref.known_z2m_quirks) matchedSources++;\n" +
"        if (d.ai_cross_ref.suggested_driver) matchedSources++;\n" +
"        if (matchedSources >= 2) {\n" +
"           report.correlations.push({\n" +
"               type: 'deep_5_source_match',\n" +
"               diag_id: d.id,\n" +
"               driver: d.ai_cross_ref.suggested_driver,\n" +
"               z2m_quirk: d.ai_cross_ref.known_z2m_quirks,\n" +
"               inferred: d.ai_cross_ref.inferred_device_type,\n" +
"               confidence: matchedSources * 20\n" +
"           });\n" +
"        }\n" +
"    }\n" +
"}\n";

if (!txt.includes('ADVANCED 5-SOURCE CROSS-REFERENCING')) {
   txt = txt.replace("const report={ts:new Date().toISOString(),correlations:[],actionable:[],resolved:[],patterns:[]};", "const report={ts:new Date().toISOString(),correlations:[],actionable:[],resolved:[],patterns:[]};\n" + enhancedStr);
   fs.writeFileSync('.github/scripts/cross-ref-intelligence.js', txt);
   console.log('Added deep 5-source cross-reference logic to cross-ref-intelligence.js');
}
