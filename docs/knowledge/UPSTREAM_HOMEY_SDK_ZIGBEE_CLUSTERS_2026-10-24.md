# Homey SDK / upstream watch — zigbee-clusters 3.9.0 and tuya-local (24/10/2026)

Written in our own words from the upstream commits; nothing copied. Every point cites its source commit.

## Athom zigbee-clusters 3.9.0 (released 23/10/2026)
Source: [athombv/node-zigbee-clusters e6846c7…b859be7](https://github.com/athombv/node-zigbee-clusters/compare/e6846c7aff430306175b2f16d1d5678785199087...b859be7f329f5a44052eb59f22062e3aeff8a726) (PRs #235–#254, tag 3.9.0 at 5ca024f).

Our apps pin `zigbee-clusters` `^2.6.0`, so none of this reaches us automatically (major bump). These are leads for a future, tested upgrade.

- **Transaction sequence numbers.** Each node now keeps one counter that starts at a random value and is shared by all its endpoints (PR #235). Responses are matched to the pending request by command as well as by sequence number (PR #237), and a reply with no pending request is ignored (PR #254). Impact for us: fewer false "response timeout" cases on chatty Tuya devices that reuse sequence numbers.
- **Attribute reports carry their sequence number.** An `attr.<name>` listener now gets a second argument with `transactionSequenceNumber` (PR #240, commit 8797f22). Lead: our duplicate-report filter (dynamic per-device windows) could use the sequence number to tell a real repeat from a firmware retransmit, as an optional extra signal only.
- **Default Response behaviour.** Only the global Default Response (0x0B, not cluster-specific) is skipped (PR #236). No Default Response is sent to broadcast frames (PR #238). Unknown commands or clusters are answered with the ZCL statuses UNSUP_COMMAND / UNSUPPORTED_CLUSTER (PR #239).
- **Error text change.** The internal errors `cluster_unavailable` and `binding_unavailable` become a `ZCLError('UNSUPPORTED_CLUSTER')` (lib/Endpoint.js, PR #239). Pitfall for the upgrade: any code that matches those strings must also accept the ZCL error. Today our tree only mentions `binding_unavailable` in comments (remote_button_wireless_wall, remote_button_wireless_smart).
- **Alarms cluster.** `getAlarm` now declares its response (status, alarmCode, clusterId, timeStamp) (commit 709c921).
- **Tooling.** Tests moved to `node:test`, development and CI pinned to Node 22, ESLint 10 flat config, Prettier (PRs #244–#247, #250). Matches our own Node 22 / `node --test` direction.

## tuya-local (21–24/10/2026)
Source: [make-all/tuya-local d51e586…7169307](https://github.com/make-all/tuya-local/compare/d51e586e1691236c53ec42c413952a77f692b578...71693077336f2386873b35e1402341e1db069b63).

- **Long phase_a payload on a DIN breaker.** The Powbay JGQW01 breaker sends DP 6 as an 18-byte block instead of the usual 8 bytes: voltage in bytes 2–3, current in bytes 4–6, active power in bytes 7–9, reactive power in bytes 10–12, and direction flags in the last byte (bit 0 for power, bit 1 for current; set means negative) (commit [8b12d78](https://github.com/make-all/tuya-local/commit/8b12d78806)). Lead: our energy parser should pick the layout from the payload length and keep the 8-byte path as the default, additive only.
- **New Wi-Fi configs (not Zigbee):** Lucci Aria DC ceiling fan, product id `qzr8t7c8qy78bhji`, DPs 1, 2, 3, 8, 15, 16, 22, 101 (PR #6289); Mowe MW278I induction hob, product id `i6qpkzm123tvw3a2`, DPs 101–107, 110, 111, 120 (PR #6279). Kept as Wi-Fi leads only.

## Unchanged sources this run
zigbee-herdsman-converters, Zigbee2MQTT docs, ZHA quirks, deCONZ DDF, Blakadder, tinytuya, localtuya, Johan's app and the Koenkk OTA index had no new commit since the 21/10 refresh (checked against the GitHub API on 24/10/2026). No new exact Zigbee couple entered the enrichment flow.
