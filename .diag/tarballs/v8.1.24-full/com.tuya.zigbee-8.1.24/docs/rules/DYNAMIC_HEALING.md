# Rules for Dynamic Healing & Identification (v1.0.0)

## 1. Dynamic Manufacturer Matching
*   **Rule 1.1: Permissive Fingerprinting**
    *   If a device matches a `productId` (e.g., TS0601) but the `manufacturerName` is not in the explicit list:
    *   **Action**: Attempt to match via `productId` + `Number of EP/Clusters`.
    *   **Fallback**: If a high confidence match is found (90%+), auto-assign the driver and log a warning to "Suggest FP Update".
*   **Rule 1.2: Variant Diversity**
    *   Treat user-reported MFR names as "Source of Truth" even if not in the DB.
    *   **Action**: Use the `HybridHeuristicEngine` to bridge capabilities.

## 2. Dynamic Energy Scanning
*   **Rule 2.1: DP Pattern Recognition**
    *   Tuya devices often use DPs 101-105 for energy.
    *   **Heuristics**:
        *   Value between 2000-2500 (200.0V - 250.0V) -> Likely `measure_voltage` (factor 0.1).
        *   Value between 0-16000 (0-16A) but fluctuating with power -> Likely `measure_current` (factor 0.001).
        *   Value correlated with `onoff` changes -> Likely `measure_power`.
    *   **Action**: If energy capabilities exist but no data is received on standard DPs, activate `EnergyDPScanner`.

## 3. Multilayer Button Integrity
*   **Rule 3.1: Zero-Loopback enforcement**
    *   Maintain a `_lastCommandSentAt` timestamp (500ms window).
    *   Ignore incoming status reports that match the last sent command within the window.
*   **Rule 3.2: Cluster Fallback**
    *   If `scenes` (0x0005) is silent, listen on `onOff` (0x0006) commands.
    *   If both silent, check Tuya Cluster (0xEF00) DP 1-4.

## 4. Maintenance Ethics
*   **Rule 4.1: Transparency**
    *   Always acknowledge inadvertent closures.
    *   Provide direct links to diagnostic reports when replying to users.
