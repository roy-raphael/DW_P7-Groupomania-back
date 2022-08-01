import rateLimiterFlexible from 'rate-limiter-flexible';

// middleware that blocks the connexion attemp if the user has failed too many times
export async function loginRateLimiter(req, res, next) {
    const resById = await loginLimiter.get(req.body.email);
    let retrySecs = 0;
  
    // Get the remaining seconds before the next authorized connexion try   
    // (if the user has already too much failed attempts)
    if (resById !== null && resById.remainingPoints <= 0) { 
        retrySecs = Math.round(resById.msBeforeNext / 1000) || 1;
    }
    
    if (retrySecs > 0) {
        res.set('Retry-After', String(retrySecs));
        res.status(429).end('Too Many Requests');
    } else {
        next();
    }
}

// Main rate limiter : number of authorized tries + blocking system
export const loginLimiter = new rateLimiterFlexible.RateLimiterMemory({
    keyPrefix: 'login',
    points: 5, // 5 attempts
    duration: 60, // within 1 minute
});

// Secondary rate llimiter : tracks the number of consecutive connexion failed attempt
export const loginConsecutiveLimiter = new rateLimiterFlexible.RateLimiterMemory({
  keyPrefix: 'login_consecutive_limiter',
  points: 99999, // doesn't matter much, this is just counter
  duration: 0, // never expire
});

// Returns a number from the Fibonacci suite corresponding to a given number
export function getFibonacciBlockDurationMinutes(countConsecutiveOutOfLimits) {
    if (countConsecutiveOutOfLimits <= 1) {
      return 1;
    }
    return getFibonacciBlockDurationMinutes(countConsecutiveOutOfLimits - 1) + getFibonacciBlockDurationMinutes(countConsecutiveOutOfLimits - 2);
}