# 🧪 Frontend Integration Test Guide

Test your React frontend integration with the MongoDB backend!

## Prerequisites

1. ✅ MongoDB backend is running (`npm run dev`)
2. ✅ Database is seeded (`node seeder.js`)
3. ✅ React app is built and ready

## Test Steps

### 1. Start the Backend
```bash
# In the root directory
npm run dev
```

### 2. Start the Frontend
```bash
# In the client directory
npm start
```

### 3. Test the Integration

#### Dashboard View
- [ ] **Loading State**: Should show spinner while fetching data
- [ ] **Facility Count**: Should display actual number of facilities from MongoDB
- [ ] **Today's Bookings**: Should show real bookings for today
- [ ] **Facility Status**: Should display real facility statuses
- [ ] **Refresh Button**: Should reload data when clicked

#### Bookings View
- [ ] **Real Data**: Should display actual bookings from MongoDB
- [ ] **Search**: Should filter by facility name, user name, or purpose
- [ ] **Status Filter**: Should filter by booking status
- [ ] **Data Format**: Should show proper dates and times
- [ ] **Grid/List Toggle**: Should work in both view modes

#### Facilities View
- [ ] **Real Facilities**: Should display actual facilities from MongoDB
- [ ] **Equipment**: Should show real equipment lists
- [ ] **Status**: Should display real facility statuses
- [ ] **View Details**: Should open facility detail modal

#### Timetable View
- [ ] **Real Bookings**: Should show actual bookings in time slots
- [ ] **Date Navigation**: Should work with real data
- **Today Highlight**: Should highlight current date
- [ ] **Booking Display**: Should show user names and times correctly

#### Booking Creation
- [ ] **New Booking Modal**: Should open when "New Booking" is clicked
- [ ] **Facility Selection**: Should show only available facilities
- [ ] **Form Validation**: Should validate required fields
- [ ] **API Submission**: Should create booking in MongoDB
- [ ] **Data Refresh**: Should update views after booking creation

## Expected Data

### Facilities (6 total)
- Main Sports Hall (500 people, 40x20m)
- Fitness Studio A (30 people, 15x10m)
- Fitness Studio B (25 people, 12x8m)
- Multi-Purpose Room (100 people, 20x15m)
- Gymnastics Hall (200 people, 30x20m)
- Meeting Room (20 people, 8x6m)

### Users (5 total)
- Max Admin (admin role)
- Sarah Smith (collaborator role)
- John Doe (user role)
- Emma Wilson (user role)
- Mike Johnson (user role)

### Bookings (5 total)
- Basketball Training (Main Sports Hall, John Doe)
- Yoga Class (Fitness Studio A, Sarah Smith)
- Team Meeting (Multi-Purpose Room, Mike Johnson)
- Kids Gymnastics (Gymnastics Hall, Emma Wilson)
- Board Meeting (Meeting Room, Max Admin)

## Troubleshooting

### Data Not Loading
- Check browser console for errors
- Verify backend is running on port 5000
- Check MongoDB connection
- Verify API endpoints are accessible

### Booking Creation Fails
- Check form validation
- Verify facility selection
- Check API response in console
- Verify user ID exists in database

### Display Issues
- Check data structure matches expected format
- Verify date formatting
- Check for missing fields in MongoDB documents

## Success Indicators

✅ **All views load real data from MongoDB**
✅ **Search and filtering work correctly**
✅ **New bookings are created and stored**
✅ **Data refreshes automatically**
✅ **No console errors**
✅ **Responsive design maintained**

---

**Happy testing! 🎉**
