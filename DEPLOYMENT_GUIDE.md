# Deployment Guide - Cash Register Management System

This guide will walk you through deploying your Node.js/Express/PostgreSQL application to your own server.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Production Deployment](#production-deployment)
- [Running the Application](#running-the-application)

---

## Prerequisites

Before you begin, ensure you have:

- A server (VPS, cloud instance, or dedicated server)
- Ubuntu/Debian Linux (recommended) or any Linux distribution
- Root or sudo access to your server
- Domain name (optional but recommended)

---

## Database Setup

### Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -i -u postgres

# Access PostgreSQL prompt
psql

# Create database
CREATE DATABASE cash_register;

# Create user with password
CREATE USER cash_admin WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cash_register TO cash_admin;

# Exit PostgreSQL
\q

# Exit postgres user
exit
```

### Step 3: Initialize Database Schema

```bash
# Copy the init-db.sql file to your server
# Then run:
psql -U cash_admin -d cash_register -f server/init-db.sql
```

**Default Admin Credentials:**
- Email: `admin@cashregister.com`
- Password: `Admin@123`

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

---

## Backend Setup

### Step 1: Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Upload Backend Code

Upload your project to your server. You can use:
- Git: `git clone your-repository-url`
- SCP: `scp -r ./server user@your-server:/path/to/app`
- FTP/SFTP clients

### Step 3: Configure Environment Variables

```bash
# Navigate to server directory
cd server

# Create .env file
nano .env
```

Add the following configuration:

```env
PORT=3000
DATABASE_URL=postgresql://cash_admin:your_secure_password@localhost:5432/cash_register
NODE_ENV=production
JWT_SECRET=generate_a_very_long_random_secret_key_here
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Install Dependencies and Build

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test the server
npm start
```

---

## Frontend Setup

### Step 1: Configure API URL

Edit the `.env` file in the frontend root directory:

```bash
# Navigate to frontend directory
cd ..

# Create .env file
nano .env
```

Add:

```env
VITE_API_URL=http://your-server-ip:3000/api
```

Or if you have a domain:

```env
VITE_API_URL=https://yourdomain.com/api
```

### Step 2: Build Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist` folder with production-ready files.

---

## Production Deployment

### Option 1: Using PM2 (Recommended)

PM2 is a production process manager for Node.js applications.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Navigate to server directory
cd server

# Start the backend with PM2
pm2 start dist/index.js --name cash-register-api

# Setup PM2 to start on system boot
pm2 startup
pm2 save

# Monitor your application
pm2 status
pm2 logs cash-register-api
```

### Option 2: Using Nginx as Reverse Proxy

#### Install Nginx

```bash
sudo apt install nginx -y
```

#### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/cash-register
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # Change this to your domain or IP

    # Frontend
    location / {
        root /path/to/your/project/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/cash-register /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Option 3: Using SSL with Let's Encrypt (Recommended for Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Certbot will automatically configure Nginx for HTTPS
```

---

## Running the Application

### Start Everything

```bash
# Start PostgreSQL (if not running)
sudo systemctl start postgresql

# Start backend with PM2
pm2 start cash-register-api

# Start/Restart Nginx
sudo systemctl restart nginx
```

### Access Your Application

- **With Nginx:** Visit `http://yourdomain.com` or `http://your-server-ip`
- **Without Nginx:**
  - Frontend: Serve the `dist` folder with any web server
  - Backend: `http://your-server-ip:3000`

---

## Monitoring and Maintenance

### View Logs

```bash
# Backend logs
pm2 logs cash-register-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Database Backup

```bash
# Create backup
pg_dump -U cash_admin cash_register > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U cash_admin cash_register < backup_file.sql
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Backend
cd server
npm install
npm run build
pm2 restart cash-register-api

# Frontend
cd ..
npm install
npm run build
sudo systemctl restart nginx
```

---

## Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22

# Allow HTTP
sudo ufw allow 80

# Allow HTTPS
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

---

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify database credentials in `.env`
- Check logs: `pm2 logs cash-register-api`

### Database connection errors
- Ensure PostgreSQL accepts connections
- Verify DATABASE_URL in `.env`
- Check PostgreSQL logs

### Frontend can't connect to backend
- Verify VITE_API_URL in frontend `.env`
- Check if backend is running
- Verify Nginx proxy configuration

### Port already in use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

---

## Security Best Practices

1. Change default admin password immediately
2. Use strong JWT_SECRET (64+ characters)
3. Enable SSL/HTTPS in production
4. Keep PostgreSQL password secure
5. Regular database backups
6. Keep system and packages updated
7. Use firewall (ufw)
8. Limit database access to localhost
9. Use environment variables for all secrets
10. Regular security audits

---

## Performance Optimization

### PostgreSQL Optimization

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Adjust based on your server resources:

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB
```

Restart PostgreSQL after changes:
```bash
sudo systemctl restart postgresql
```

### PM2 Cluster Mode

For better performance with multiple CPU cores:

```bash
pm2 start dist/index.js --name cash-register-api -i max
```

---

## Support

For issues or questions:
1. Check logs first
2. Review this documentation
3. Check database connectivity
4. Verify environment variables

---

**Congratulations!** Your Cash Register Management System is now deployed and ready to use!
