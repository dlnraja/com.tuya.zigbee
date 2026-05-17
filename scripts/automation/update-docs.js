const fs = require('fs');

const injection = `
---

## 25. DEEP DIAGNOSTIC & CROSS-REFERENCING MANDATE (AI AGENTS)

When a user reports "it doesn't work well" or an "unknown device" issue, **DO NOT** immediately assume it's just a missing fingerprint. You must perform a **Deep Diagnostic Investigation** using cross-referencing:

1. **Analyze Multiple Sources**: Use the repository's JS scraper scripts to fetch and analyze Homey emails, community forum discussions, diagnostic logs, PRs, and issues.
2. **Cross-Reference Domotic Projects**: Check Z2M (Zigbee2MQTT), ZHA, and Domoticz registries for the exact same \`manufacturerName\` to understand its real DP mappings or cluster behavior.
3. **Manufacturer Identity Variants**: Remember that a single \`manufacturerName\` (e.g., \`_TZ3000_...\`) can be used across *multiple* device IDs and hardware variants. Do not blindly map it without checking the \`productId\` and capability set.
4. **Architecture Context**: Always read documents relating to **Architecture 7+ and 8.0** for clues on SDK3 compliance, TuyaEF00Manager handling, and new cluster rules.
5. **Update Resources**: Enrich documentation, workflows, and GitHub actions with your findings. Do not just patch the code; update the knowledge base.
6. **Agentic Skills & Local Code**: Leverage the local AI tools! Be fully aware of the \`Antigravity skills\` (located in \`.agents/skills/\`) and the local \`Claude Code\` implementations within the project. These serve as major sources of inspiration and diagnostic power.
7. **Dotfile Reading Mandate**: Always read configuration files starting with a dot (e.g., \`.windsurfrules\`, \`.clinerules\`, \`.github/workflows/*\`) to understand the strict project boundaries before applying any cross-referenced fix.
`;

let content = fs.readFileSync('PROJECT_INDEX.md', 'utf8');
if (!content.includes('DEEP DIAGNOSTIC & CROSS-REFERENCING MANDATE')) {
    fs.appendFileSync('PROJECT_INDEX.md', injection);
    console.log('Appended to PROJECT_INDEX.md');
}

const ruleInjection = `
// ============================================================================
// DEEP DIAGNOSTIC & CROSS-REFERENCING MANDATE (CRITICAL)
// ============================================================================
- DO NOT just say 'Missing manufacturer'. Perform deep cross-referencing with Z2M/ZHA and scrape forum/email info.
- Remember a single \`manufacturerName\` can map to MULTIPLE variants and device IDs. Check productId!
- Use Antigravity skills (\`.agents/skills/\`) and local Claude Code scripts.
- Update docs, workflows, and Github Actions after fixing a bug.
- Read Architecture 7+ and 8.0 docs before acting.
`;

['.windsurfrules', '.cursorrules', '.clinerules'].forEach(f => {
    if (fs.existsSync(f)) {
        let text = fs.readFileSync(f, 'utf8');
        if (!text.includes('DEEP DIAGNOSTIC & CROSS-REFERENCING MANDATE')) {
            fs.appendFileSync(f, '\\n' + ruleInjection);
            console.log('Updated ' + f);
        }
    }
});
