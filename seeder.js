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
    location: {
      type: 'Point',
      coordinates: [9.1829, 48.7758] // Stuttgart coordinates
    },
    status: 'open',
    equipment: ['Basketball hoops', 'Volleyball net', 'Badminton courts', 'Table tennis tables'],
          halls: [
        {
          name: 'Main Court',
          status: 'open',
          openingHoursGrid: Array(30).fill(true)
        },
        {
          name: 'Side Court',
          status: 'open',
          openingHoursGrid: Array(30).fill(true)
        },
        {
          name: 'Training Room',
          status: 'open',
          openingHoursGrid: Array(30).fill(true)
        }
      ],
    openingHoursGrid: {
      monday: Array(30).fill(true),
      tuesday: Array(30).fill(true),
      wednesday: Array(30).fill(true),
      thursday: Array(30).fill(true),
      friday: Array(30).fill(true),
      saturday: Array(30).fill(true),
      sunday: Array(30).fill(true)
    }
  },
  {
    name: 'Fitness Studio A',
    location: {
      type: 'Point',
      coordinates: [9.1835, 48.7762] // Slightly north of main hall
    },
    status: 'open',
    equipment: ['Mirrors', 'Sound system', 'Cardio machines', 'Weight equipment'],
    halls: [
      {
        name: 'Cardio Zone',
        status: 'open',
        openingHoursGrid: Array(30).fill(true)
      },
      {
        name: 'Weight Room',
        status: 'open',
        openingHoursGrid: Array(30).fill(true)
      }
    ],
    openingHoursGrid: {
      monday: Array(30).fill(true),
      tuesday: Array(30).fill(true),
      wednesday: Array(30).fill(true),
      thursday: Array(30).fill(true),
      friday: Array(30).fill(true),
      saturday: Array(30).fill(true),
      sunday: Array(30).fill(true)
    }
  },
  {
    name: 'Fitness Studio B',
    location: {
      type: 'Point',
      coordinates: [9.1830, 48.7765] // North-east of main hall
    },
    capacity: 25,
    size: '12x8m',
    status: 'open',
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
    location: {
      type: 'Point',
      coordinates: [9.1825, 48.7755] // South-west of main hall
    },
    capacity: 100,
    size: '20x15m',
    status: 'open',
    equipment: ['Projector', 'Chairs', 'Tables', 'Sound system'],
    color: '#8b981',
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
    location: {
      type: 'Point',
      coordinates: [9.1840, 48.7760] // East of main hall
    },
    capacity: 200,
    size: '30x20m',
    status: 'open',
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
    location: {
      type: 'Point',
      coordinates: [9.1820, 48.7750] // South of main hall
    },
    capacity: 20,
    size: '8x6m',
    status: 'open',
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
  },
  {
    name: 'Test Facility with Closed Periods',
    location: {
      type: 'Point',
      coordinates: [9.1830, 48.7760] // Near other facilities
    },
    status: 'open',
    equipment: ['Test equipment'],
    halls: [
      {
        name: 'Test Hall',
        status: 'open',
        openingHoursGrid: {
          monday: [
            // 07:00-09:00 (slots 0-3) - closed
            false, false, false, false,
            // 09:00-11:00 (slots 4-7) - open
            true, true, true, true,
            // 11:00-12:00 (slots 8-9) - closed
            false, false,
            // 12:00-14:00 (slots 10-13) - open
            true, true, true, true,
            // 14:00-22:00 (slots 14-29) - closed
            false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false
          ],
          tuesday: Array(30).fill(false), // Closed all day
          wednesday: Array(30).fill(false), // Closed all day
          thursday: Array(30).fill(false), // Closed all day
          friday: Array(30).fill(false), // Closed all day
          saturday: Array(30).fill(false), // Closed all day
          sunday: Array(30).fill(false) // Closed all day
        }
      }
    ],
    openingHoursGrid: {
      monday: [
        // 07:00-09:00 (slots 0-3) - closed
        false, false, false, false,
        // 09:00-11:00 (slots 4-7) - open
        true, true, true, true,
        // 11:00-12:00 (slots 8-9) - closed
        false, false,
        // 12:00-14:00 (slots 10-13) - open
        true, true, true, true,
        // 14:00-22:00 (slots 14-29) - closed
        false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false
      ],
      tuesday: Array(30).fill(false),
      wednesday: Array(30).fill(false),
      thursday: Array(30).fill(false),
      friday: Array(30).fill(false),
      saturday: Array(30).fill(false),
      sunday: Array(30).fill(false)
    }
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
    
    // Create some sample bookings for the current week
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Monday of current week
    
    const sampleBookings = [
      {
        facility: createdFacilities[0]._id, // Main Sports Hall
        facilityName: createdFacilities[0].name,
        hall: 'Main Court',
        date: new Date(monday.getTime() + 1 * 24 * 60 * 60 * 1000), // Tuesday
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
        hall: 'Cardio Zone',
        date: new Date(monday.getTime() + 0 * 24 * 60 * 60 * 1000), // Monday
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
        date: new Date(monday.getTime() + 2 * 24 * 60 * 60 * 1000), // Wednesday
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
        date: new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000), // Thursday
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
        date: new Date(monday.getTime() + 0 * 24 * 60 * 60 * 1000), // Monday
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
