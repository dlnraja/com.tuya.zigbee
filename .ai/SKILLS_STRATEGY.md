# Antigravity AI Skills - Deployment Strategy

**Document Objective**: To define how this repository leverages the "Awesome Skills" fleet to achieve a superior, self-healing architecture.

## 1. Logic-Lens (Architectural Review)
We apply **Logic Lens** reasoning to all core library files (`lib/*.js`).
- **Standard**: Every async function MUST be idempotent.
- **Enforcement**: No shared mutable state between concurrent driver initializations.
- **Example**: In `HybridDriverSystem.js`, we implemented an `_hybridInitInProgress` guard to prevent race conditions during Zigbee re-interviews.

## 2. Performance-Optimizer (Energy & Payload)
We use **Performance Optimizer** patterns to manage Homey Pro resource constraints.
- **Standard**: Battery devices use adaptive polling intervals (up to 6h for buttons).
- **Standard**: Large JSON payloads (IR databases) are lazily loaded or streamed.
- **Example**: `IRCodeLibrary.js` is optimized to return minimal trame segments to avoid cluster buffer overflows.

## 3. Codebase-Audit (Hygiene & Security)
We use **Pre-Push Audit** rules to keep the production branches pristine.
- **Standard**: `.DS_Store`, `Thumbs.db`, and `scratch/` files are stripped.
- **Security**: No API keys or private tokens allowed in `lib/data/` mappings.
- **Example**: The `master-self-heal.js` script integrates these rules into the CI/CD pipeline.

## 4. Squirrel (Full-Cycle Implementation)
All new driver creation follows the **Squirrel** 8-phase pipeline.
1. Discovery (Z2M/ZHA/Tuya docs)
2. Planning (Flow Cards, UI, Settings)
3. Build (Hybrid Driver)
4. Test (Validate)
5. Bug Hunt (Logic Lens)
6. Polish (ESLint)
7. Document (PROJECT_INDEX)
8. Ship (vX.X.X Push)

## 5. Technical Change Tracker (Session Continuity)
We maintain **SYSTEM_CHANGELOG.md** using structured TC patterns. This ensures that even if an AI session expires, the next agent can resume the "state machine" of the project without re-researching previous milestones.

## 6. Trellis Orchestration Standard Compatibility
To guarantee seamless portability and execution across different AI systems, our local skills strategy is structured around the **Trellis (mindfold-ai/Trellis)** 4-phase loop. By keeping our instructions modular and mapping them directly to Trellis's Plan, Implement, Verify, and Finish segments, we maintain a zero-defect, self-healing pipeline that guarantees consistency across any workspace environment.
