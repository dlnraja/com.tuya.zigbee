# Tasks 005
- [~] T1 raw dump removed (re-fetchable from GitHub links in the index); rules come from deep reads flagged needsDeepRead (spec 009)
- [x] T2 Raw forum dumps found in reports/ (forum-verify-*/actionable-processor.json ~6 MB each, forum-t26439 POSTS.json, FORUM_DEEP_INVESTIGATE, forum-l99-*): change generators (tools/ci/forum-actionable-processor.js, forum-deep-investigate.js, p2571-t26439-deep-harvest.js, forum-t140352-recent-harvest.js, l99-inbox-intelligence-orchestrator.js) to persist links + structured fields only, then git rm + .gitignore — done 2026-10-03: 6 generators fixed (incl. p2572; MAX_CROSS_COUPLES=16 stops the 20k synthetic couples), dumps distilled into data/forum/forum-leads-ssot.json + docs/rules/FORUM_LEADS_RULES.md, ~54 MB of dumps untracked (history kept)
- [x] T3 Scanner: links + rules only
- [x] T4 Workflow step
- [x] T5 Delete raw dumps + ignore
- [ ] T6 New Johan interactions since 2026-10-02
