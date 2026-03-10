# Complete Guide: Supabase Database + Node.js Backend

This guide shows you how to use Supabase as a PostgreSQL database host while running your own Node.js/Express backend.

## Architecture Overview

```
Frontend (React/Vite)
    ↓ HTTP Requests
Node.js/Express Backend
    ↓ PostgreSQL Protocol
Supabase PostgreSQL Database
```

## Part 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: Your project name
   - **Database Password**: Strong password (save this!)
   - **Region**: Choose closest to your users
5. Wait 2-3 minutes for project creation

### 1.2 Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

### 1.3 Connection Pooling vs Direct Connection

Supabase provides two connection modes:

**Connection Pooling (Port 6543)** - Recommended for serverless/API:
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
- Better for many short-lived connections
- Use for Node.js APIs, serverless functions
- Transaction mode (not session mode)

**Direct Connection (Port 5432)** - For long-running apps:
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```
- Better for connection pools with fewer connections
- Use for traditional servers with connection pooling
- Full PostgreSQL feature support

## Part 2: Node.js Backend Setup

### 2.1 Project Structure

```
project/
├── server/
│   ├── src/
│   │   ├── index.ts          # Main server file
│   │   ├── config/
│   │   │   └── database.ts   # Database connection
│   │   ├── routes/           # API routes
│   │   └── middleware/       # Auth, error handling
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                  # Environment variables
├── src/                      # Frontend React app
└── package.json
```

### 2.2 Install Dependencies

```bash
cd server
npm install express pg dotenv cors
npm install -D @types/express @types/node @types/pg typescript ts-node nodemon
```

**Key packages:**
- `express` - Web framework
- `pg` - PostgreSQL client for Node.js
- `dotenv` - Load environment variables
- `cors` - Enable CORS for frontend requests

### 2.3 Environment Variables

Create `server/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Server
PORT=3000
NODE_ENV=development

# JWT (for authentication)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 2.4 Database Connection Setup

Create `server/src/config/database.ts`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
  // Connection pool settings
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✓ Database connected');
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});

export default pool;
```

### 2.5 Main Server File

Create `server/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example route
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 10');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### 2.6 Package.json Scripts

Update `server/package.json`:

```json
{
  "name": "backend-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## Part 3: Database Migrations

### 3.1 Using Supabase SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Write your SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email
CREATE INDEX idx_users_email ON users(email);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click **Run** or press `Ctrl+Enter`

### 3.2 Using Migration Files (Recommended)

Create `server/migrations/001_create_users.sql`:

```sql
-- Migration: Create users table
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

Run migrations with Node.js:

```typescript
// server/src/scripts/migrate.ts
import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      console.log(`✓ Completed: ${file}`);
    }
  }

  await pool.end();
}

runMigrations().catch(console.error);
```

## Part 4: API Routes Structure

### 4.1 Authentication Route

Create `server/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, role',
      [email, password_hash, full_name]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ user, token });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
```

### 4.2 Protected Routes with Middleware

Create `server/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### 4.3 Example Protected Route

```typescript
import { Router } from 'express';
import pool from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [req.user!.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
```

## Part 5: Frontend Integration

### 5.1 API Client Setup

Create `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Generic fetch wrapper
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, full_name: string) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),
};

// Users API
export const usersAPI = {
  getAll: () => apiFetch('/api/users'),
  getMe: () => apiFetch('/api/users/me'),
  update: (id: string, data: any) =>
    apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
```

### 5.2 Frontend Environment Variables

Create `.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 5.3 Usage in React Components

```typescript
import { useState } from 'react';
import { authAPI } from '../lib/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user, token } = await authAPI.login(email, password);
      localStorage.setItem('token', token);
      // Redirect to dashboard
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Part 6: Best Practices

### 6.1 Connection Management

```typescript
// Use connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Don't exceed Supabase connection limits
  idleTimeoutMillis: 30000,
});

// Always release connections
async function getData() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users');
    return result.rows;
  } finally {
    client.release(); // Important!
  }
}
```

### 6.2 Error Handling

```typescript
// Global error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});
```

### 6.3 SQL Injection Prevention

```typescript
// ALWAYS use parameterized queries
// ✓ GOOD
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ✗ BAD - Vulnerable to SQL injection
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### 6.4 Environment-specific Configuration

```typescript
const config = {
  development: {
    pool: { max: 5 },
    logging: true,
  },
  production: {
    pool: { max: 20 },
    logging: false,
  },
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
```

## Part 7: Deployment

### 7.1 Prepare for Production

1. Update `.env` with production values:
```env
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
NODE_ENV=production
JWT_SECRET=strong-random-secret-change-this
FRONTEND_URL=https://yourdomain.com
```

2. Build TypeScript:
```bash
npm run build
```

3. Start production server:
```bash
npm start
```

### 7.2 Deploy to Platforms

**Railway / Render / Fly.io:**
1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 7.3 Monitoring

Check Supabase dashboard for:
- Active connections
- Query performance
- Database size
- Connection errors

## Part 8: Troubleshooting

### Connection Issues

**Error: "too many connections"**
- Reduce `max` in pool configuration
- Use connection pooling (port 6543)
- Check for connection leaks (always release!)

**Error: "SSL required"**
```typescript
ssl: {
  rejectUnauthorized: false
}
```

**Connection timeout**
- Check firewall/network
- Verify connection string
- Check Supabase project status

### Performance

**Slow queries**
- Add indexes on frequently queried columns
- Use EXPLAIN ANALYZE in SQL
- Enable query logging

**Too many round trips**
- Use JOINs instead of multiple queries
- Batch inserts with array parameters

## Summary

You now have:
- ✓ Supabase as PostgreSQL database host
- ✓ Node.js/Express backend with full control
- ✓ Secure authentication with JWT
- ✓ Proper connection pooling
- ✓ SQL injection protection
- ✓ Migration system
- ✓ Frontend integration
- ✓ Production-ready setup

**Key Advantages:**
- Full control over API logic
- Custom business rules
- No vendor lock-in
- Easy migration path
- Reliable managed PostgreSQL

**Next Steps:**
1. Set up your Supabase project
2. Configure environment variables
3. Run initial migrations
4. Build your API endpoints
5. Connect frontend
6. Deploy to production
