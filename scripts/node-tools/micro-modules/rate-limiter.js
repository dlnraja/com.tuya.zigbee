/**
 * MICRO-MODULE: RATE LIMITER
 */

export class RateLimiter {
  constructor(requestsPerSecond = 2) {
    this.delay = 1000 / requestsPerSecond;
    this.lastCall = 0;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.delay) {
      await new Promise(resolve => setTimeout(resolve, this.delay - timeSinceLastCall));
    }
    
    this.lastCall = Date.now();
  }
}

export default RateLimiter;
