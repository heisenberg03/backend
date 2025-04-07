// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export const signToken = (payload: any, expiresIn?: string) => {
  return expiresIn 
    ? jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn })
    : jwt.sign(payload, process.env.JWT_SECRET!);
};