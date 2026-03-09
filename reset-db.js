const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const User = require('./models/User');
const Facility = require('./models/Facility');
const Booking = require('./models/Booking');

const ADMIN_EMAIL = 'admin@tsg-heilbronn.de';
const ADMIN_PASSWORD = 'tdVVwNt734}b';

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const resetDatabase = async () => {
  try {
    // Clear all collections
    await User.deleteMany({});
    await Facility.deleteMany({});
    await Booking.deleteMany({});

    console.log('Cleared all users, facilities, and bookings');

    // Create single admin user
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

    const admin = new User({
      email: ADMIN_EMAIL,
      firstName: 'Admin',
      lastName: 'TSG',
      password: hashedPassword,
      role: 'admin',
      verified: true,
      status: 'active',
      isActive: true,
    });

    await admin.save();
    console.log(`Created admin account: ${ADMIN_EMAIL}`);
    console.log('Database reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();
