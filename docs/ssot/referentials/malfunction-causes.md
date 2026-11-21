# Malfunction causes catalogue

Freshness: see manifest.json.

## empty-capabilities
tile or capability stays empty
  - 1. scale-mismatch (conf 0.85): checks: compare DP scale to Z2M/ZHA (div, mul, 0-1 vs 0-100); fixes: scale to the official Homey capability range
  - 2. dp-unmapped (conf 0.75): checks: upstream DP has no capability in device.js; fixes: map the exact DP to an official capability
  - 3. reporting-config (conf 0.65): checks: bindings, attribute reporting, read-only refresh; fixes: request DPs read-only; fix reporting/bind
## works-badly
user reports it works badly (presumed true)
  - 1. scale-mismatch (conf 0.8): checks: DP/cluster conversion vs upstream; fixes: fix scaling, divisor, enum or inversion
  - 2. firmware-quirk (conf 0.6): checks: appVersion / firmware notes in the couple card; fixes: quirk path for that firmware
  - 3. known-wrong-behavior (conf 0.9): checks: already-supported-but-behaves-wrong history; fixes: apply the recorded fix; do not close as already supported
## unexpected-property
tuya.datapoint unexpected property
  - 1. datapoint-shape (conf 0.8): checks: sendStructuredDatapoint vs raw; fixes: accept the reported property shape
## no-status
cannot read status without sending a command
  - 1. missing-readonly-refresh (conf 0.85): checks: requestAllDPs readOnly; DP for position vs set; fixes: status query that does not toggle the device
## crash
crash or OOM
  - 1. driver-crash (conf 0.7): checks: diag/crash ledgers for the driver; fixes: fix the crashing path; keep the driver id
## wrong-class
paired as the wrong class
  - 1. misplaced-couple (conf 0.8): checks: sources vs current owner; git history of the couple; fixes: move the exact couple with a migration path
  - 2. parasite-combo (conf 0.75): checks: mfr x pid cross-product on the driver; fixes: exact-pair or continuation; do not add cartesian parasites
## invalid-flow-card
invalid_flow_card_id or missing flow
  - 1. flow-card-id (conf 0.85): checks: app-level vs driver flow ids; never remove published ids; fixes: stop firing the missing card; add a legal card if needed
## sleepy-battery
battery or sleepy device does not report
  - 1. sleepy-tx (conf 0.7): checks: IAS zone / poll / interview on wake; fixes: configure reporting for sleepy devices
