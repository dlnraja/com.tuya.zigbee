# 🦾 Antigravity Advanced Agentic Skills Registry

This registry documents the specialized AI skills and agents integrated into the **Tuya Unified Engine**. These tools are available to any AI agent (Claude, Gemini, Windsurf, Cursor, etc.) to maintain the project's Zero-Defect mandate.

## 🧰 Skill Catalog

| Skill Name | Purpose | When to Invoke |
|:---|:---|:---|
| **`squirrel`** | Full-Cycle Dev | Starting new drivers, complex refactors, or feature building. |
| **`logic-lens`** | Deep Logic Review | Auditing async code, race conditions, and SDK3 compliance. |
| **`brooks-lint`** | Architectural Audit | Checking for coupling, design smells, and SOLID violations. |
| **`bug-hunter`** | Root Cause Analysis | Methodical debugging of crashes and trame corruption. |
| **`codebase-audit-pre-push`** | Pre-Push Sanitation | Final cleanup of dead code, junk, and secret detection. |
| **`technical-change-tracker`** | Bot Continuity | Structured session handoff and changelog maintenance. |
| **`mock-hunter`** | Live Data Audit | Identifying hardcoded data in live environments. |
| **`performance-optimizer`** | Efficiency Tuning | Optimizing battery life and event-loop performance. |
| **`agenttrace-session-audit`** | Session Health | Auditing tool failures and latency in agent sessions. |
| **`api-endpoint-builder`** | SDK Extension | Building new internal APIs or webhooks. |
| **`gdb-cli`** | Deep Debugging | Analyzing core dumps or live process crashes (advanced). |
| **`global-chat-agent-discovery`** | MCP discovery | Discovering new tools and servers for project expansion. |
| **`jq`** | JSON Processing | Complex manifest or fingerprint database querying. |
| **`k6-load-testing`** | Scalability | Stress testing the local protocol gateway. |
| **`lambdatest-agent-skills`** | Cloud Testing | Production-grade automation across 46+ frameworks. |
| **`python-pptx-generator`** | Documentation | Generating presentation decks for technical reviews. |
| **`rayden-code`** | UI/UX Generation | Building React-based pairing wizards with premium patterns. |
| **`skill-check`** | Validation | Validating new skills against the agentskills specification. |
| **`tmux`** | Terminal Multiplexing | Managing persistent remote maintenance sessions. |

## 🛠️ Usage Instructions for AI Agents

As an AI agent interacting with this repository, you **MUST** prioritize using these skills for their respective domains. 

1.  **Read the Skill Definition**: Before using a skill, read its `SKILL.md` file in `.agents/skills/<skill-name>/SKILL.md`.
2.  **Follow the Pipeline**: If a skill defines an 8-phase pipeline (like `squirrel`), adhere to it strictly.
3.  **Document Actions**: Use `technical-change-tracker` to record architectural changes in `SYSTEM_CHANGELOG.md`.

## 🌐 AI Workflow Orchestration & Trellis Integration

To align this repository's local Agentic Skills with modern multi-platform orchestration standards, we formally follow the design standards of [Trellis (mindfold-ai/Trellis)](https://github.com/mindfold-ai/Trellis). 

This orchestration model splits development tasks into a strict, repeatable 4-phase loop. Our local skills map directly to these phases to ensure absolute zero-defect execution:

1. **`Plan` Phase**
   - *Trellis Standard*: Defining requirements and generating the `prd.md`.
   - *Local Fleet*: Governed by `squirrel` discovery rules and local `.cursorrules` / `.windsurfrules` constraints.
2. **`Implement` Phase**
   - *Trellis Standard*: Writing clean code with context-aware helper scripts.
   - *Local Fleet*: Hardened by `@logic-lens` (idempotency audits) and `@performance-optimizer` (heap protection / lazy-loading models).
3. **`Verify` Phase**
   - *Trellis Standard*: Multi-layered syntax checks, schema validations, and unit tests.
   - *Local Fleet*: Enforced by the 9-Layer Quality Gate (`_verify_prs.js`) and standard `homey app validate` commands.
4. **`Finish` Phase**
   - *Trellis Standard*: Archiving task metadata and updating logs/journals.
   - *Local Fleet*: Handled by `@technical-change-tracker` via `SYSTEM_CHANGELOG.md` to ensure absolute continuity between AI agent sessions.

---

## 🌐 External References

- **Antigravity Skills**: [Antigravity Awesome Skills](https://github.com/sickn33/antigravity-awesome-skills)
- **Orchestration Harness**: [Trellis Repository](https://github.com/mindfold-ai/Trellis)

---

*This registry is auto-maintained by the Antigravity Skills fleet.*
