import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool, { query } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

interface SignUpBody {
  username: string;
  email: string;
  password: string;
  full_name_en: string;
  full_name_ku: string;
  phone?: string;
}

interface SignInBody {
  username?: string;
  email?: string;
  password: string;
}

// Register a new user
router.post('/register', async (req: Request<{}, {}, SignUpBody>, res: Response) => {
  try {
    const { username, email, password, full_name_en, full_name_ku, phone } = req.body;

    if (!username || !email || !password || !full_name_en) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const profileId = uuidv4();

    const client = await pool.connect();
    try {
      // Create user
      await client.query(
        `INSERT INTO auth_users (id, username, email, password_hash, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, username, email, hashedPassword]
      );

      // Create user profile
      await client.query(
        `INSERT INTO user_profiles (id, user_id, full_name_en, full_name_ku, phone, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [profileId, userId, full_name_en, full_name_ku, phone || '', 'employee', true]
      );

      const token = jwt.sign({ id: userId, email, role: 'employee' }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '7d',
      });

      res.json({ message: 'User registered successfully', token, user: { id: userId, email, role: 'employee' } });
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: Request<{}, {}, SignInBody>, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ error: 'Username/email and password required' });
    }

    // Support login with either username or email
    const loginField = username || email;
    const result = await query(
      `SELECT au.id AS id, au.username, au.email, au.password_hash, up.role, up.id AS profile_id
      FROM auth_users au
      LEFT JOIN user_profiles up ON au.id = up.user_id
      WHERE au.username = $1 OR au.email = $1`,
      [loginField]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'employee' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
