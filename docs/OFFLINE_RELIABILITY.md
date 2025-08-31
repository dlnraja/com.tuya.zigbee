# Offline Reliability Scoring System

## Overview
The offline reliability scoring system evaluates device reliability based on historical data when the device is offline. It helps determine if a device should be:
- **Proposed** (score ≥ 0.7)
- **Confirmed** (score ≥ 0.9)
- **Unreliable** (score < 0.7)

## Configuration
```javascript
const scorer = new OfflineReliabilityScoring(sources, {
  propose: 0.7, // Threshold for proposed status
  confirm: 0.9  // Threshold for confirmed status
});
```

## Sources
Each source should provide:
- `reliability` (0-1): Historical reliability score
- `weight` (number): Importance of this source

Example:
```javascript
const sources = [
  { reliability: 0.8, weight: 1 }, // Community reports
  { reliability: 0.9, weight: 2 }  // Manufacturer data
];
```

## Usage
```javascript
const result = scorer.computeScore();
// Returns: { overall: number, verdict: string }
```

## Integration
Add to device initialization:
```javascript
this.registerCapabilityListener('measure_reliability', async () => {
  const score = reliabilityScorer.computeScore();
  this.setCapabilityValue('measure_reliability', score.overall);
});
```
