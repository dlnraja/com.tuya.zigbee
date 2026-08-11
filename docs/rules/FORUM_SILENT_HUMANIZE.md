# Forum Silent Enrichment & Human Voice Doctrine

**Status:** active (P108+)  
**Community reference (read-only):** [Stop pasting unchecked AI answers](https://community.homey.app/t/stop-pasting-unchecked-ai-answers-in-the-homey-community/157628)

## Goal
Improve the Homey app, workflows, and automations from **all** forum signals — without dumping unchecked AI text into Homey Community.

## Rules
| ID | Rule |
|----|------|
| FS1 | Default = **no forum reply**. Implement silently in code/CI. |
| FS2 | `REPLY_TOPICS=140352` only; never reply on 26439 / 146735 / 89271 / 43287 / 157628 / others. |
| FS3 | Never paste raw / unchecked LLM output to Discourse (T157628). |
| FS4 | Any rare draft must pass humanize style + `reply-quality-gate` + `forum-ai-paste-gate`. |
| FS5 | Auto-post scripts forced dry-run (`forum-responder.js`, `post-forum-update.js`). |
| FS6 | Scan satellite threads READ-ONLY via `forum-silent-multi-scan.js`. |
| FS7 | Changelogs/commits: generic wording; no external-thread attribution. |

## Tooling
- `tools/ci/forum-silent-multi-scan.js` — multi-topic silent digest
- `tools/ci/forum-ai-paste-gate.js` — anti AI-paste detector
- `.github/scripts/reply-quality-gate.js` — factual + human-leak checks
- `.github/scripts/forum-responder.js` — dry-run only
- Workflows: `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`

## Voice
See `docs/responses/FORUM_STYLE_GUIDE.md`.
