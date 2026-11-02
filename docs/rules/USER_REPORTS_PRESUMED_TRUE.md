# User reports are presumed true (P3200, t765u)

Applies everywhere: issue triage, diagnostic replies, forum scans, bot replies, AI prompts (`.github/scripts/project-rules.js`).

- When a user says a device fails although its manufacturerName + productId is listed, the user is right until evidence says otherwise.
- Never reply with generic troubleshooting (reset, re-pair, update) for a listed couple. Open a deep investigation and check each lead separately, with a verdict:
  1. couple present in the built `app.json` **and in the publish payload** (prepare-publish compacts the mfr x pid matrix; GH#581 lost `_TZ3000_yupc0pb7|TS0201` this way, GH#584 lost `_TZE284_awepdiwi|TS0601` in 9.0.1599);
  2. couple in one driver only, no other driver wins the match;
  3. productId the device really reports;
  4. endpoints/clusters vs driver;
  5. crash in onNodeInit or at pairing;
  6. capabilities or 0xEF00 mandatory at pairing;
  7. the Test build that was published contains the couple (git history of the build commit, not tags only);
  8. firmware/variant prefix (_TZE200 vs _TZE204 vs _TZE284);
  9. sleepy battery device during interview;
  10. pair template / flow.
- Check tool: `node tools/ci/reported-couples-publish-survival.js [--issues issues.json] [--strict]` (report-only in the triage workflow). Fix = pin the exact couple in `config/architecture/publish-sacred-keep-couples.json` (no app.json growth) and record it in `data/leads/reported-couples.json`.

## Case of manufacturerName (lean rule)

Homey matches the manifest strings exactly, before any runtime normalisation. Pick ONE canonical form = the form the device reports:
- direct evidence first (interview, diag, issue text);
- otherwise the prefix-family convention: `_TZ3000_` / `_TZE200_` / `_TZE204_` / `_TZE284_` / `_TYZB01_` keep an upper-case prefix and a lower-case 8-char suffix; follow the majority across Z2M, ZHA quirks, Johan's app and other Homey apps;
- add at most ONE alternate when sources disagree, with its source. Never generate case cross-products (app.json size, memory, Athom combo budget).
- The survival check only REPORTS case-suspect couples; it never adds variants.
