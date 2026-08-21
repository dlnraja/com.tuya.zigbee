# Grok Bot extract

Size: 4546

### Prompt 1

Premier run enrich. JAMAIS dispatcher un workflow PUBLISH (auto-fix-and-publish, publish.yml, publish-stable, draft-to-test, verified-publish-and-diagnostics, auto-publish-on-push, publish-diagnose). JAMAIS cloud agent. JAMAIS forum post.

Repo dlnraja/com.tuya.zigbee. gh déjà authed sur le PC (dlnraja). Diffs locaux NON commités à ne pas écraser: drivers/scene_switch_4/driver.compose.json (EP 1-4), lib/protocol/HybridProtocolManager.js (skip sleepy IAS), lib/devices/BaseUnifiedDevice.js (skip toast si mfr déjà listé) — master ET stable.

À faire:
1. gh run list --repo dlnraja/com.tuya.zigbee --limit 25. Noter auto-enrich-closed-loop, self-improve, continuous-flow, knowledge-graph-sync, driver-maintenance, blakadder-fetch, free-scrape-crossref, recurrent-orchestrator.
2. Dispatcher UNIQUEMENT ceux pas déjà in_progress/success aujourd’hui, max 5: auto-enrich-closed-loop, self-improve, knowledge-graph-sync, blakadder-fetch, free-scrape-crossref.
3. Lire infer-enrich-report si présent (C:\\Users\\Dell\\Documents\\homey\\master\\.tmp\\gh-artifacts\\collect\\.github\\state\\infer-enrich-report.json) — unmatched FPs, collisions.
4. Ne pas git pull, ne pas commit, ne pas publish.

Rapporte runs lancés (ids), FPs unmatched, collisions sacred couples.

