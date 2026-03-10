#!/bin/bash

# Cash Register Backend Startup Script

echo "🚀 Starting Cash Register Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with the required environment variables."
    echo "See .env.example for reference."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
fi

# Check if logs directory exists
if [ ! -d "logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
fi

# Start the server with PM2
echo "🎯 Starting server with PM2..."
pm2 start ecosystem.config.js

echo "✅ Server started successfully!"
echo "📊 View logs: pm2 logs cash-register-api"
echo "📈 Monitor: pm2 monit"
echo "🔄 Restart: pm2 restart cash-register-api"
echo "🛑 Stop: pm2 stop cash-register-api"
