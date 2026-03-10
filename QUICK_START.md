# Quick Start Guide

This is a simplified quick start guide to get your application running quickly.

## Local Development

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ..
npm install
```

### 2. Setup PostgreSQL Database

#### Option A: Using the setup script (Linux/Mac)

```bash
cd server
./setup-database.sh
```

#### Option B: Manual setup

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Run these commands:
CREATE DATABASE cash_register;
CREATE USER cash_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cash_register TO cash_admin;
\q

# Initialize schema
psql -U cash_admin -d cash_register -f server/init-db.sql
```

### 3. Configure Environment Variables

#### Backend (.env in server folder)

```bash
cd server
cp .env.example .env
nano .env
```

Update with your values:
```env
PORT=3000
DATABASE_URL=postgresql://cash_admin:your_password@localhost:5432/cash_register
NODE_ENV=development
JWT_SECRET=your_generated_secret_key
```

#### Frontend (.env in root folder)

```bash
cd ..
cp .env.example .env
nano .env
```

```env
VITE_API_URL=http://localhost:3000/api
```

### 4. Run the Application

#### Start Backend

```bash
cd server
npm run dev
```

Backend will run on http://localhost:3000

#### Start Frontend (in a new terminal)

```bash
npm run dev
```

Frontend will run on http://localhost:5173

### 5. Login

Default credentials:
- Email: `admin@cashregister.com`
- Password: `Admin@123`

**Change this password immediately!**

---

## Production Deployment

See the full [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed production deployment instructions.

### Quick Production Steps

1. **Build everything:**
```bash
# Backend
cd server
npm install
npm run build

# Frontend
cd ..
npm install
npm run build
```

2. **Deploy with PM2:**
```bash
cd server
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Setup Nginx:**
- Copy frontend `dist` folder to web server
- Configure Nginx to proxy `/api` requests to backend
- See DEPLOYMENT_GUIDE.md for full Nginx configuration

---

## File Structure

```
project/
├── server/                    # Backend (Node.js/Express)
│   ├── src/                  # Source code
│   ├── dist/                 # Compiled JavaScript (after build)
│   ├── init-db.sql          # Database schema
│   ├── .env                 # Environment variables
│   ├── ecosystem.config.js  # PM2 configuration
│   ├── setup-database.sh    # Database setup script
│   └── start.sh            # Production startup script
├── src/                      # Frontend (React/TypeScript)
├── dist/                     # Built frontend (after build)
├── .env                      # Frontend environment variables
├── DEPLOYMENT_GUIDE.md       # Full deployment documentation
└── QUICK_START.md           # This file
```

---

## Common Commands

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run typecheck` - Check TypeScript types

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### PM2
- `pm2 start ecosystem.config.js` - Start backend
- `pm2 logs` - View logs
- `pm2 restart cash-register-api` - Restart
- `pm2 stop cash-register-api` - Stop
- `pm2 delete cash-register-api` - Remove from PM2

---

## Troubleshooting

**Backend won't start:**
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify database credentials in `server/.env`
- Check if port 3000 is available: `lsof -i :3000`

**Frontend can't connect:**
- Verify backend is running
- Check VITE_API_URL in `.env`
- Check browser console for errors

**Database errors:**
- Ensure database exists: `psql -U cash_admin -l`
- Verify schema is initialized: run `init-db.sql` again
- Check PostgreSQL logs

---

## Need Help?

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
