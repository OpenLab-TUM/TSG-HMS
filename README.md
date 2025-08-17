# TSG Hallenmanagement - Backend with MongoDB

A comprehensive hall management system backend built with Node.js, Express, and MongoDB.

## Features

- **Facility Management**: CRUD operations for sports facilities, meeting rooms, and fitness studios
- **Booking System**: Advanced booking management with conflict detection and recurring bookings
- **User Management**: Role-based access control (Admin, Collaborator, User)
- **RESTful API**: Clean, documented API endpoints with validation
- **MongoDB Integration**: Robust data persistence with Mongoose ODM

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (cloud database)
- npm or yarn

## Quick Start

1. **Install dependencies**: `npm install`
2. **Start MongoDB**: `brew services start mongodb-community` (macOS) or `mongod`
3. **Seed database**: `node seeder.js`
4. **Start server**: `npm run dev`
5. **Access API**: http://localhost:5001

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TSG-Hallenmanagement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp config.env.example config.env
   # Edit config.env with your MongoDB connection string
   ```

4. **MongoDB Atlas is already configured**
   - Cloud database connection is set up
   - No local MongoDB installation required
   - Database is accessible from anywhere

5. **Seed the database with sample data**
   ```bash
   node seeder.js
   ```

6. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Facilities
- `GET /api/facilities` - Get all facilities
- `GET /api/facilities/:id` - Get facility by ID
- `POST /api/facilities` - Create new facility
- `PUT /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Delete facility
- `GET /api/facilities/status/:status` - Get facilities by status

### Bookings
- `GET /api/bookings` - Get all bookings (with filters)
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking
- `GET /api/bookings/range/:startDate/:endDate` - Get bookings by date range
- `GET /api/bookings/facility/:facilityId` - Get bookings for specific facility

### Users
- `GET /api/users` - Get all users (with filters)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `PATCH /api/users/:id/preferences` - Update user preferences
- `GET /api/users/role/:role` - Get users by role

## Database Schema

### Facility
- Basic info: name, capacity, size, status
- Equipment list and description
- Opening hours for each day
- Hourly rate and color coding

### Booking
- Facility and user references
- Date, start/end times
- Purpose, status, and recurring options
- Conflict detection and validation

### User
- Authentication details (username, email)
- Personal info and contact details
- Role-based permissions
- Preferences and settings

## Configuration

Edit `config.env` to customize:
- MongoDB connection string
- Server port
- Environment settings

## Development

- **Auto-restart**: `npm run dev` (uses nodemon)
- **API Testing**: Use Postman or similar tools
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Express-validator for input validation

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Ensure MongoDB is properly secured
3. Use PM2 or similar process manager
4. Set up proper logging and monitoring

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in config.env
   - Verify network access

2. **Port Already in Use**
   - Change PORT in config.env
   - Kill existing process on port 5000

3. **Validation Errors**
   - Check request body format
   - Ensure required fields are provided
   - Verify data types

### Logs

Check console output for:
- Database connection status
- API request logs
- Error messages and stack traces

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
