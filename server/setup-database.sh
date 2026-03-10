#!/bin/bash

# Database Setup Script for Cash Register System

echo "🗄️  PostgreSQL Database Setup"
echo "================================"
echo ""

# Read database credentials
read -p "Enter database name [cash_register]: " DB_NAME
DB_NAME=${DB_NAME:-cash_register}

read -p "Enter database user [cash_admin]: " DB_USER
DB_USER=${DB_USER:-cash_admin}

read -sp "Enter database password: " DB_PASSWORD
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed!"
    echo "Install it with: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "⚠️  PostgreSQL is not running. Starting..."
    sudo systemctl start postgresql
fi

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\q
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database and user created successfully!"
else
    echo "⚠️  Database or user might already exist, continuing..."
fi

# Run initialization script
echo "Initializing database schema..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -f init-db.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema initialized successfully!"
    echo ""
    echo "📝 Database Configuration:"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo ""
    echo "🔐 Default Admin Credentials:"
    echo "   Email: admin@cashregister.com"
    echo "   Password: Admin@123"
    echo "   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!"
    echo ""
    echo "Add this to your server/.env file:"
    echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
else
    echo "❌ Error initializing database schema!"
    exit 1
fi
