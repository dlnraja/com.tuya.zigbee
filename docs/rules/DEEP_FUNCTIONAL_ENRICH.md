# Deep functional enrich (P2529)

**Mandate:** Every forum / GitHub / Gmail / image / portal report must be treated as a **full stack** problem — not only `manufacturerName` + `productId`.

Complementary (P2520): union / append only. Never wipe working drivers.

## Forbidden shallow closures

- “Already covered — fingerprint present”
- “Update Test” without RX/TX/flow audit
- “Lock mfr+pid” then stop
- “Compose declares the card” without wire proof

## Required audit vectors

1. **Identity** — sacred couple only; never invent pid  
2. **Driver class** — wrong UI / Unknown Zigbee / misroute  
3. **Clusters** — compose vs interview (EF00 `61184`, ZCL, IAS, raw `0xFD`/`0xFC`)  
4. **DP map** — `cap` ownership, divisors, settings DPs  
5. **RX** — frame → parser → `safeSetCapabilityValue`  
6. **TX** — settings / caps → EF00 or ZCL write  
7. **Flow compose** — cards exist  
8. **Flow wire** — `getDeviceTriggerCard` / auto-wire / run listeners  
9. **Capabilities** — phantoms, mains battery, staleCaps  
10. **Contre quoi** — `test/critical/pNNNN-*.test.js` (P2469)

## CI / workflows

| Hook | Script |
|------|--------|
| L99 inbox | phase `functionalDeep` → `tools/ci/deep-functional-enrich-pass.js` |
| Forum poll | soft `npm run enrich:functional` after investigate |
| Auto-enrich / Gmail / fetch-diags | soft same pass |
| Recurrent orchestrator | soft after L99 inbox |
| Auto bot issue triage | soft after triage (GitHub issues depth) |
| Gate | `npm run check:p2529` |

Pass extracts couples from GitHub/forum text, resolves driver, then probes **clusters · DP map · flow compose · flow wire** (complementary — never wipe).

Machine SSOT: `config/architecture/deep-functional-enrich-ssot.json`  
Related: P2520 complementary · P2352 L99 · P2518 cap/flow/DP · P2528 radar `cap` ownership.
