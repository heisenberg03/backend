// src/services/userService.ts
import { Pool } from 'pg';
import NodeCache from 'node-cache';
import { signToken } from '../utils/jwt';

const otpCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5-minute TTL
const revocationCache = new NodeCache({ stdTTL: 30 * 24 * 60 * 60, checkperiod: 24 * 60 * 60 }); // 30-day TTL

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export class UserService {
  constructor(private db: Pool) {}

  async signUp(phone: string, username: string, fullName: string): Promise<any> {
    const otp = generateOTP();
    otpCache.set(`otp:${phone}`, otp);
    console.log(`OTP for ${phone}: ${otp}`); // Placeholder for SMS

    const { rows } = await this.db.query(`
      INSERT INTO Users (phone, username, full_name, status)
      VALUES ($1, $2, $3, 'pending') RETURNING *
    `, [phone, username, fullName]);
    return rows[0];
  }

  async signInWithPhone(phone: string, otp: string): Promise<{ accessToken: string; user: any }> {
    const storedOtp = otpCache.get(`otp:${phone}`);
    if (storedOtp !== otp) throw new Error('Invalid OTP');

    const { rows } = await this.db.query(`
      UPDATE Users SET status = 'active'
      WHERE phone = $1 RETURNING *
    `, [phone]);
    if (!rows.length) throw new Error('User not found');

    const user = rows[0];
    const accessToken = signToken({ id: user.id, username: user.username, isArtist: user.is_artist }, '30d');
    otpCache.del(`otp:${phone}`);
    return { accessToken, user };
  }

  async logout(token: string): Promise<void> {
    revocationCache.set(`revoked:${token}`, true);
  }

  async getCurrentUser(userId: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT u.*, l.address, l.city, l.latitude, l.longitude
      FROM Users u
      LEFT JOIN Locations l ON u.location_id = l.id
      WHERE u.id = $1
    `, [userId]);
    const userData = rows[0];
    if (!userData) throw new Error('User not found');

    const categories = await this.db.query(`
      SELECT c.id, c.name FROM Categories c
      JOIN User_Categories uc ON c.id = uc.category_id
      WHERE uc.user_id = $1
    `, [userId]);
    const subcategories = await this.db.query(`
      SELECT s.id, s.name FROM Subcategories s
      JOIN User_Subcategories us ON s.id = us.subcategory_id
      WHERE us.user_id = $1
    `, [userId]);

    return {
      ...userData,
      location: userData.location_id ? {
        id: userData.location_id,
        address: userData.address,
        city: userData.city,
        latitude: userData.latitude,
        longitude: userData.longitude,
      } : undefined,
      categories: categories.rows,
      subcategories: subcategories.rows,
    };
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    return !!revocationCache.get(`revoked:${token}`);
  }
}