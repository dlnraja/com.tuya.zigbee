'use strict';

const queues = new Map(); // deviceId -> { q:[], busy:false }
const debounces = new Map(); // key -> { t:Timeout, last:any }

/**
 * FIFO DP queue with backpressure
 */
exports.enqueueDp = (device, handler) => (dp, raw) => {
  const k = device.getId();
  if (!queues.has(k)) queues.set(k, { q: [], busy: false });
  
  const st = queues.get(k);
  
  // Max 100 items, drop & warn
  if (st.q.length > 100) {
    device.log('DP queue full, dropping:', dp);
    return;
  }
  
  st.q.push({ dp, raw });
  
  if (!st.busy) {
    processNext();
  }
  
  function processNext() {
    const item = st.q.shift();
    if (!item) {
      st.busy = false;
      return;
    }
    
    st.busy = true;
    Promise.resolve(handler(item.dp, item.raw))
      .catch(err => device.error('DP handler error:', err))
      .finally(() => {
        st.busy = false;
        if (st.q.length) processNext();
      });
  }
};

/**
 * Debounce capability updates
 */
exports.debounceCap = (device, cap, ms = 200) => val => {
  const key = `${device.getId()}:${cap}`;
  
  // Clear existing timeout
  if (debounces.has(key)) {
    clearTimeout(debounces.get(key).t);
  }
  
  // Set new timeout
  const t = setTimeout(() => {
    device.setCapabilityValue(cap, val)
      .catch(err => device.error(`Failed to set ${cap}:`, err));
    debounces.delete(key);
  }, ms);
  
  debounces.set(key, { t, last: val });
};

/**
 * Safe mode helper
 */
exports.safeMode = (() => {
  const errors = new Map(); // deviceId -> { count, timestamp }
  const THRESHOLD = 5;
  const WINDOW = 60000; // 60 seconds
  
  return {
    recordError(deviceId) {
      const now = Date.now();
      const record = errors.get(deviceId) || { count: 0, timestamp: now };
      
      // Reset if outside window
      if (now - record.timestamp > WINDOW) {
        record.count = 1;
        record.timestamp = now;
      } else {
        record.count++;
      }
      
      errors.set(deviceId, record);
      return record.count >= THRESHOLD;
    },
    
    reset(deviceId) {
      errors.delete(deviceId);
    },
    
    isThrottled(deviceId) {
      const record = errors.get(deviceId);
      if (!record) return false;
      
      const now = Date.now();
      if (now - record.timestamp > WINDOW) {
        errors.delete(deviceId);
        return false;
      }
      
      return record.count >= THRESHOLD;
    }
  };
})();

/**
 * Batch capability updates
 */
exports.batchCapabilities = (device, updates, delay = 50) => {
  const promises = [];
  
  Object.entries(updates).forEach(([cap, value], index) => {
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        device.setCapabilityValue(cap, value)
          .then(resolve)
          .catch(reject);
      }, index * delay);
    });
    
    promises.push(promise);
  });
  
  return Promise.all(promises);
};