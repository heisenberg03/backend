// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export const signAccessToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
};

export const signRefreshToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key');
};

export const verifyToken = (token: string, isRefreshToken: boolean = false) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      id: string;
      username: string;
      isArtist: boolean;
    };
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};