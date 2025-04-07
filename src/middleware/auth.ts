// src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';

export const authMiddleware = async (request: any, userService: UserService) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  const isRevoked = await userService.isTokenRevoked(token);
  if (isRevoked) throw new Error('Token revoked');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded;
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};