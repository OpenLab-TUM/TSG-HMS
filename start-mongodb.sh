#!/bin/bash

echo "Starting MongoDB..."

# Check if MongoDB is already running
if pgrep -x "mongod" > /dev/null; then
    echo "MongoDB is already running"
else
    # Try to start MongoDB using Homebrew
    if command -v brew &> /dev/null; then
        echo "Starting MongoDB using Homebrew..."
        brew services start mongodb-community
        sleep 3
        
        if pgrep -x "mongod" > /dev/null; then
            echo "MongoDB started successfully via Homebrew"
        else
            echo "Failed to start MongoDB via Homebrew. Please start manually:"
            echo "brew services start mongodb-community"
        fi
    else
        echo "Homebrew not found. Please start MongoDB manually:"
        echo "mongod"
    fi
fi

echo "MongoDB status:"
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB is not running"
fi
