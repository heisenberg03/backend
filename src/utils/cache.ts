// src/utils/cache.ts
import NodeCache from 'node-cache';

export const otpCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5-minute TTL
export const revocationCache = new NodeCache({ stdTTL: 30 * 24 * 60 * 60, checkperiod: 24 * 60 * 60 }); // 30-day TTL