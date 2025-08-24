const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

// Import models
const User = require('./models/User');
const Facility = require('./models/Facility');
const Booking = require('./models/Booking');

// Sample data
const sampleUsers = [
  {
    email: 'max.admin@tsg-heilbronn.de',
    firstName: 'Max',
    lastName: 'Admin',
    password: 'Admin123!', // Will be hashed
    role: 'admin',
    verified: true,
    status: 'active'
  },
  {
    email: 'sarah.smith@tsg-heilbronn.de',
    firstName: 'Sarah',
    lastName: 'Smith',
    password: 'Sarah123!', // Will be hashed
    role: 'collaborator',
    verified: true,
    status: 'active'
  },
  {
    email: 'john.doe@tsg-heilbronn.de',
    firstName: 'John',
    lastName: 'Doe',
    password: 'John123!', // Will be hashed
    role: 'collaborator',
    verified: true,
    status: 'active'
  },
  {
    email: 'emma.wilson@tsg-heilbronn.de',
    firstName: 'Emma',
    lastName: 'Wilson',
    password: 'Emma123!', // Will be hashed
    role: 'collaborator',
    verified: true,
    status: 'active'
  },
  {
    email: 'mike.johnson@tsg-heilbronn.de',
    firstName: 'Mike',
    lastName: 'Johnson',
    password: 'Mike123!', // Will be hashed
    role: 'collaborator',
    verified: true,
    status: 'active'
  }
];

const sampleFacilities = [
  {
    name: 'Main Sports Hall',
    capacity: 500,
    size: '40x20m',
    status: 'available',
    equipment: ['Basketball hoops', 'Volleyball net', 'Badminton courts', 'Table tennis tables'],
    color: '#10b981',
    description: 'Main indoor sports facility with multiple courts and equipment',
    openingHours: {
      monday: { open: '06:00', close: '23:00' },
      tuesday: { open: '06:00', close: '23:00' },
      wednesday: { open: '06:00', close: '23:00' },
      thursday: { open: '06:00', close: '23:00' },
      friday: { open: '06:00', close: '23:00' },
      saturday: { open: '08:00', close: '22:00' },
      sunday: { open: '08:00', close: '22:00' }
    },
    hourlyRate: 50
  },
  {
    name: 'Fitness Studio A',
    capacity: 30,
    size: '15x10m',
    status: 'available',
    equipment: ['Mirrors', 'Sound system', 'Cardio machines', 'Weight equipment'],
    color: '#f59e0b',
    description: 'Modern fitness studio with cardio and strength training equipment',
    openingHours: {
      monday: { open: '06:00', close: '23:00' },
      tuesday: { open: '06:00', close: '23:00' },
      wednesday: { open: '06:00', close: '23:00' },
      thursday: { open: '06:00', close: '23:00' },
      friday: { open: '06:00', close: '23:00' },
      saturday: { open: '08:00', close: '22:00' },
      sunday: { open: '08:00', close: '22:00' }
    },
    hourlyRate: 30
  },
  {
    name: 'Fitness Studio B',
    capacity: 25,
    size: '12x8m',
    status: 'available',
    equipment: ['Yoga mats', 'Dumbbells', 'Resistance bands', 'Meditation area'],
    color: '#10b981',
    description: 'Specialized studio for yoga, pilates, and functional training',
    openingHours: {
      monday: { open: '07:00', close: '22:00' },
      tuesday: { open: '07:00', close: '22:00' },
      wednesday: { open: '07:00', close: '22:00' },
      thursday: { open: '07:00', close: '22:00' },
      friday: { open: '07:00', close: '22:00' },
      saturday: { open: '08:00', close: '20:00' },
      sunday: { open: '08:00', close: '20:00' }
    },
    hourlyRate: 25
  },
  {
    name: 'Multi-Purpose Room',
    capacity: 100,
    size: '20x15m',
    status: 'available',
    equipment: ['Projector', 'Chairs', 'Tables', 'Sound system'],
    color: '#8b5cf6',
    description: 'Versatile space for meetings, presentations, and small events',
    openingHours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '22:00' },
      saturday: { open: '09:00', close: '18:00' },
      sunday: { open: '09:00', close: '18:00' }
    },
    hourlyRate: 40
  },
  {
    name: 'Gymnastics Hall',
    capacity: 200,
    size: '30x20m',
    status: 'available',
    equipment: ['Gymnastics equipment', 'Mats', 'Balance beams', 'Rings'],
    color: '#10b981',
    description: 'Specialized facility for gymnastics training and competitions',
    openingHours: {
      monday: { open: '07:00', close: '22:00' },
      tuesday: { open: '07:00', close: '22:00' },
      wednesday: { open: '07:00', close: '22:00' },
      thursday: { open: '07:00', close: '22:00' },
      friday: { open: '07:00', close: '22:00' },
      saturday: { open: '08:00', close: '20:00' },
      sunday: { open: '08:00', close: '20:00' }
    },
    hourlyRate: 45
  },
  {
    name: 'Meeting Room',
    capacity: 20,
    size: '8x6m',
    status: 'available',
    equipment: ['Conference table', 'TV', 'Whiteboard', 'Video conferencing'],
    color: '#f59e0b',
    description: 'Small meeting room for team discussions and presentations',
    openingHours: {
      monday: { open: '08:00', close: '20:00' },
      tuesday: { open: '08:00', close: '20:00' },
      wednesday: { open: '08:00', close: '20:00' },
      thursday: { open: '08:00', close: '20:00' },
      friday: { open: '08:00', close: '20:00' },
      saturday: { open: '09:00', close: '17:00' },
      sunday: { open: '09:00', close: '17:00' }
    },
    hourlyRate: 20
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://assemeldlebsh:Assem123@ypt.oy6wu.mongodb.net/tsg-hallenmanagement?retryWrites=true&w=majority&appName=tsg-hallenmanagement', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Atlas connected for seeding'))
.catch(err => console.error('MongoDB connection error:', err));

// Seed function
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Facility.deleteMany({});
    await Booking.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Create users with hashed passwords
    const createdUsers = [];
    for (const userData of sampleUsers) {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      createdUsers.push(user);
              console.log(`Created user: ${user.firstName} ${user.lastName} (${user.role})`);
    }
    
    // Insert facilities
    const createdFacilities = await Facility.insertMany(sampleFacilities);
    console.log(`Created ${createdFacilities.length} facilities`);
    
    // Create some sample bookings
    const sampleBookings = [
      {
        facility: createdFacilities[0]._id, // Main Sports Hall
        facilityName: createdFacilities[0].name,
        date: new Date('2025-01-20'),
        startTime: '14:00',
        endTime: '16:00',
        user: createdUsers[2]._id, // John Doe
        userName: `${createdUsers[2].firstName} ${createdUsers[2].lastName}`,
        purpose: 'Basketball Training',
        status: 'confirmed',
        recurring: 'weekly',
        notes: 'Weekly basketball practice session'
      },
      {
        facility: createdFacilities[1]._id, // Fitness Studio A
        facilityName: createdFacilities[1].name,
        date: new Date('2025-01-20'),
        startTime: '10:00',
        endTime: '11:30',
        user: createdUsers[1]._id, // Sarah Smith
        userName: `${createdUsers[1].firstName} ${createdUsers[1].lastName}`,
        purpose: 'Yoga Class',
        status: 'confirmed',
        recurring: 'weekly',
        notes: 'Beginner yoga session'
      },
      {
        facility: createdFacilities[3]._id, // Multi-Purpose Room
        facilityName: createdFacilities[3].name,
        date: new Date('2025-01-21'),
        startTime: '18:00',
        endTime: '20:00',
        user: createdUsers[4]._id, // Mike Johnson
        userName: `${createdUsers[4].firstName} ${createdUsers[4].lastName}`,
        purpose: 'Team Meeting',
        status: 'pending',
        recurring: 'none',
        notes: 'Monthly team planning session'
      },
      {
        facility: createdFacilities[4]._id, // Gymnastics Hall
        facilityName: createdFacilities[4].name,
        date: new Date('2025-01-22'),
        startTime: '15:00',
        endTime: '17:00',
        user: createdUsers[3]._id, // Emma Wilson
        userName: `${createdUsers[3].firstName} ${createdUsers[3].lastName}`,
        purpose: 'Kids Gymnastics',
        status: 'confirmed',
        recurring: 'weekly',
        notes: 'Children\'s gymnastics class'
      },
      {
        facility: createdFacilities[5]._id, // Meeting Room
        facilityName: createdFacilities[5].name,
        date: new Date('2025-01-20'),
        startTime: '09:00',
        endTime: '10:00',
        user: createdUsers[0]._id, // Max Admin
        userName: `${createdUsers[0].firstName} ${createdUsers[0].lastName}`,
        purpose: 'Board Meeting',
        status: 'confirmed',
        recurring: 'monthly',
        notes: 'Monthly board of directors meeting'
      }
    ];
    
    const createdBookings = await Booking.insertMany(sampleBookings);
    console.log(`Created ${createdBookings.length} bookings`);
    
    console.log('Database seeded successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
