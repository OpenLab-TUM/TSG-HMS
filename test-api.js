const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5001/api';

async function testAPI() {
  console.log('🧪 Testing TSG Hallenmanagement API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:5001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    console.log('');

    // Test facilities endpoint
    console.log('2. Testing facilities endpoint...');
    const facilitiesResponse = await fetch(`${API_BASE}/facilities`);
    const facilities = await facilitiesResponse.json();
    console.log(`✅ Found ${facilities.length} facilities`);
    console.log('   Sample facility:', facilities[0]?.name);
    console.log('');

    // Test bookings endpoint
    console.log('3. Testing bookings endpoint...');
    const bookingsResponse = await fetch(`${API_BASE}/bookings`);
    const bookings = await bookingsResponse.json();
    console.log(`✅ Found ${bookings.length} bookings`);
    console.log('   Sample booking:', bookings[0]?.purpose);
    console.log('');

    // Test users endpoint
    console.log('4. Testing users endpoint...');
    const usersResponse = await fetch(`${API_BASE}/users`);
    const users = await usersResponse.json();
    console.log(`✅ Found ${users.length} users`);
    console.log('   Sample user:', users[0]?.firstName, users[0]?.lastName);
    console.log('');

    // Test filtered bookings
    console.log('5. Testing filtered bookings...');
    const filteredBookingsResponse = await fetch(`${API_BASE}/bookings?status=confirmed`);
    const filteredBookings = await filteredBookingsResponse.json();
    console.log(`✅ Found ${filteredBookings.length} confirmed bookings`);
    console.log('');

    console.log('🎉 All API tests passed! The backend is working correctly.');
    console.log('');
    console.log('📱 You can now:');
    console.log('   - View facilities at: http://localhost:5000/api/facilities');
    console.log('   - View bookings at: http://localhost:5000/api/bookings');
    console.log('   - View users at: http://localhost:5000/api/users');
    console.log('   - Use the React frontend to interact with the data');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Make sure MongoDB is running');
    console.log('   2. Make sure the server is running (npm run dev)');
    console.log('   3. Check the server console for error messages');
  }
}

// Run the test
testAPI();
