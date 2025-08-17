# 🚀 Quick Start Guide

Get your TSG Hallenmanagement MongoDB backend running in minutes!

## Prerequisites

- Node.js (v14+)
- MongoDB Atlas (cloud database - already configured)
- npm or yarn

## Option 1: Automated Setup (Recommended)

```bash
# Make scripts executable (first time only)
chmod +x setup.sh start-mongodb.sh

# Run the automated setup
./setup.sh
```

This will:
- ✅ Install dependencies
- ✅ Start MongoDB
- ✅ Seed the database
- ✅ Start the server

## Option 2: Manual Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. MongoDB Atlas is Ready
- Cloud database connection is configured
- No local MongoDB installation required
- Database is accessible from anywhere

### 3. Seed the Database
```bash
node seeder.js
```

### 4. Start the Server
```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

## Verify Everything is Working

### Check MongoDB
```bash
# Should show MongoDB process
ps aux | grep mongod
```

### Check Server
```bash
# Health check
curl http://localhost:5000/health

# API endpoints
curl http://localhost:5000/api/facilities
curl http://localhost:5000/api/bookings
curl http://localhost:5000/api/users
```

### Run API Tests
```bash
node test-api.js
```

## What You Get

- 🏟️ **6 Facilities** (Sports halls, fitness studios, meeting rooms)
- 👥 **5 Users** (Admin, collaborators, regular users)
- 📅 **5 Sample Bookings** (Various types and statuses)
- 🔌 **Full REST API** with validation and error handling
- 📊 **Real-time data** from MongoDB

## API Access

- **Server**: http://localhost:5001
- **API Base**: http://localhost:5001/api
- **Health Check**: http://localhost:5001/health

## API Endpoints

- **Health**: `GET /health`
- **Facilities**: `GET /api/facilities`
- **Bookings**: `GET /api/bookings`
- **Users**: `GET /api/users`

## Next Steps

1. **Frontend Integration**: Update your React app to use the API
2. **Authentication**: Add user login/logout functionality
3. **Real-time Updates**: Implement WebSocket connections
4. **Production**: Deploy to cloud platform

## Troubleshooting

### MongoDB Connection Issues
- Check your internet connection
- Verify MongoDB Atlas credentials in config.env
- Ensure your IP is whitelisted in MongoDB Atlas
- Check if the cluster is running in MongoDB Atlas

### Server Won't Start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill existing process
kill -9 <PID>

# Start server
npm run dev
```

### Database Connection Issues
- Ensure MongoDB is running
- Check connection string in `config.env`
- Verify network access

## Support

- Check the main README.md for detailed documentation
- Review server console output for error messages
- Test individual API endpoints with curl or Postman

---

**Happy coding! 🎉**
