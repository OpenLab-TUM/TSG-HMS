#!/bin/bash

echo "🚀 Setting up TSG Hallenmanagement Backend with MongoDB"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Start MongoDB
echo "🗄️  Starting MongoDB..."
./start-mongodb.sh

# Wait a moment for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
sleep 5

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB manually and run this script again."
    exit 1
fi

echo "✅ MongoDB is running"

# Seed the database
echo "🌱 Seeding database with sample data..."
node seeder.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to seed database"
    exit 1
fi

echo "✅ Database seeded successfully"

# Start the server
echo "🚀 Starting the server..."
echo "📱 The API will be available at: http://localhost:5000"
echo "🔌 API endpoints: http://localhost:5000/api"
echo "📊 Health check: http://localhost:5000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
