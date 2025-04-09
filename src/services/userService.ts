// src/services/userService.ts
import { Pool, QueryResult } from 'pg';
import { cache, otpCache } from '../utils/cache';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt';
import { Logger } from 'pino';

// Define types matching database schema and GraphQL
interface Location {
  id: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  email?: string;
  profilePicture?: string;
  location?: Location;
  bio?: string;
  budget?: number;
  artistType?: string;
  artistRating?: number;
  artistReviewCount?: number;
  hostBio?: string;
  hostRating?: number;
  hostReviewCount?: number;
  categories: Category[];
  subcategories: Subcategory[];
  youtubeId?: string;
  youtubeDisplay?: boolean;
  instagramUsername?: string;
  instagramDisplay?: boolean;
  facebookId?: string;
  facebookDisplay?: boolean;
  xUsername?: string;
  xDisplay?: boolean;
  isArtist: boolean;
}

const INACTIVITY_TIMEOUT = 90 * 24 * 60 * 60; // 90 days in seconds

export class UserService {
  constructor(private db: Pool, private logger: Logger) {}

  async signUp(phone: string, username: string, fullName: string): Promise<User> {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpCache.set(`otp:${phone}`, otp);
      this.logger.info({ phone, otp }, 'Generated OTP for sign-up');

      const { rows }: QueryResult<User> = await this.db.query(
        `INSERT INTO Users (phone, username, full_name, status) VALUES ($1, $2, $3, 'pending') RETURNING *`,
        [phone, username, fullName]
      );
      const user = rows[0];
      return {
        ...user,
        categories: [],
        subcategories: [],
        isArtist: false, // Default value, adjust if DB sets it differently
      };
    } catch (error) {
      this.logger.error({ error, phone, username }, 'Error during sign-up');
      throw new Error('Failed to sign up user');
    }
  }

  async signInWithPhone(phone: string, otp: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    try {
      const storedOtp = otpCache.get<string>(`otp:${phone}`);
      if (storedOtp !== otp) {
        this.logger.warn({ phone }, 'Invalid OTP during sign-in');
        throw new Error('Invalid OTP');
      }

      const { rows }: QueryResult<User> = await this.db.query(
        `UPDATE Users SET status = 'active' WHERE phone = $1 RETURNING *`,
        [phone]
      );
      if (!rows.length) {
        this.logger.warn({ phone }, 'User not found during sign-in');
        throw new Error('User not found');
      }

      const user = rows[0];
      const accessToken = signAccessToken({ id: user.id, username: user.username, isArtist: user.isArtist });
      const refreshToken = signRefreshToken({ id: user.id });
      cache.set(`refresh:${user.id}`, { token: refreshToken, lastActive: Date.now() / 1000 });
      otpCache.del(`otp:${phone}`);

      return {
        accessToken,
        refreshToken,
        user: await this.getCurrentUser(user.id), // Fetch full user data
      };
    } catch (error) {
      this.logger.error({ error, phone }, 'Error during sign-in with phone');
      throw new Error('Failed to sign in user');
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; user: User }> {
    try {
      const decoded = verifyToken(refreshToken, true);
      const cached = cache.get<{ token: string; lastActive: number }>(`refresh:${decoded.id}`);
      if (!cached || cached.token !== refreshToken) {
        this.logger.warn({ refreshToken }, 'Invalid refresh token');
        throw new Error('Invalid refresh token');
      }

      const now = Date.now() / 1000;
      if (now - cached.lastActive > INACTIVITY_TIMEOUT) {
        cache.del(`refresh:${decoded.id}`);
        this.logger.warn({ userId: decoded.id }, 'Session expired due to inactivity');
        throw new Error('Session expired due to inactivity');
      }

      cached.lastActive = now;
      cache.set(`refresh:${decoded.id}`, cached);

      const user = await this.getCurrentUser(decoded.id);
      const accessToken = signAccessToken({ id: user.id, username: user.username, isArtist: user.isArtist });
      return { accessToken, user };
    } catch (error) {
      this.logger.error({ error, refreshToken }, 'Error during refresh token');
      throw new Error('Failed to refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      cache.del(`refresh:${userId}`);
      this.logger.info({ userId }, 'User logged out successfully');
    } catch (error) {
      this.logger.error({ error, userId }, 'Error during logout');
      throw new Error('Failed to log out user');
    }
  }

  async getCurrentUser(userId: string): Promise<User> {
    try {
      const cacheKey = `user:${userId}`;
      let userData = cache.get<User>(cacheKey);
      if (userData) {
        cache.ttl(cacheKey, 3600); // Refresh TTL
        return userData;
      }

      const { rows }: QueryResult<any> = await this.db.query(`
        SELECT u.*, l.address, l.city, l.latitude, l.longitude
        FROM Users u
        LEFT JOIN Locations l ON u.location_id = l.id
        WHERE u.id = $1
      `, [userId]);
      userData = rows[0];
      if (!userData) {
        this.logger.warn({ userId }, 'User not found during getCurrentUser');
        throw new Error('User not found');
      }

      const categoriesResult: QueryResult<Category> = await this.db.query(`
        SELECT c.id, c.name FROM Categories c
        JOIN User_Categories uc ON c.id = uc.category_id
        WHERE uc.user_id = $1
      `, [userId]);
      const subcategoriesResult: QueryResult<Subcategory> = await this.db.query(`
        SELECT s.id, s.name FROM Subcategories s
        JOIN User_Subcategories us ON s.id = us.subcategory_id
        WHERE us.user_id = $1
      `, [userId]);

      const result: User = {
        ...userData,
        location: userData.location ? {
          id: userData.location.id,
          address: userData.location.address || undefined,
          city: userData.location.city || undefined,
          latitude: userData.location.latitude || undefined,
          longitude: userData.location.longitude || undefined,
        } : undefined,
        categories: categoriesResult.rows,
        subcategories: subcategoriesResult.rows,
        isArtist: !!userData.isArtist, // Ensure boolean
      };
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error({ error, userId }, 'Error during getCurrentUser');
      throw new Error('Failed to fetch user data');
    }
  }

  async updateLastActive(userId: string): Promise<void> {
    try {
      const cached = cache.get<{ token: string; lastActive: number }>(`refresh:${userId}`);
      if (cached) {
        cached.lastActive = Date.now() / 1000;
        cache.set(`refresh:${userId}`, cached);
        this.logger.info({ userId }, 'Updated last active timestamp');
      }
    } catch (error) {
      this.logger.error({ error, userId }, 'Error during updateLastActive');
      throw new Error('Failed to update last active timestamp');
    }
  }
}