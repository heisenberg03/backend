// src/utils/cache.ts
import NodeCache from 'node-cache';

export const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1-hour TTL for user data
export const otpCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5-minute TTL for OTPs