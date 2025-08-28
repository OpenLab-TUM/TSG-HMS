const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Facility = require('../models/Facility');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');

// Helper function to validate time slots against facility opening hours
function validateTimeSlotsAgainstOpeningHours(facility, date, startTime, endTime) {
  // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = new Date(date).getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayNames[dayOfWeek];
  
  // Get the facility's opening hours grid for this day
  const dayGrid = facility.openingHoursGrid?.[dayKey];
  if (!dayGrid || !Array.isArray(dayGrid)) {
    return { valid: false, message: 'Facility has no opening hours configured for this day' };
  }
  
  // Convert times to slot indices (30-minute slots from 07:00 to 22:00)
  // Slot 0 = 07:00, Slot 1 = 07:30, Slot 2 = 08:00, etc.
  const timeToSlotIndex = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const slotIndex = Math.floor((totalMinutes - 420) / 30); // 420 = 7:00 in minutes
    return Math.max(0, Math.min(29, slotIndex)); // Clamp to 0-29 range
  };
  
  const startSlot = timeToSlotIndex(startTime);
  const endSlot = timeToSlotIndex(endTime);
  
  // Check if all slots in the range are available
  for (let slot = startSlot; slot < endSlot; slot++) {
    if (slot < 0 || slot >= dayGrid.length || dayGrid[slot] === false) {
      const slotTime = new Date();
      slotTime.setHours(7 + Math.floor(slot * 0.5), (slot % 2) * 30, 0, 0);
      const timeString = slotTime.toTimeString().slice(0, 5);
      return { 
        valid: false, 
        message: `Facility is closed at ${timeString} on ${dayKey}. Please adjust your booking time.` 
      };
    }
  }
  
  return { valid: true };
}

const generateRecurrenceGroupId = () => {
  try {
    if (typeof randomUUID === 'function') return randomUUID();
  } catch (_) {}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
};

// Minimal auth middleware for protected booking actions
const JWT_SECRET = process.env.JWT_SECRET;
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const u = await User.findById(decoded.userId).select('-password');
    if (!u) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = u;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// GET all bookings
router.get('/', async (req, res) => {
  try {
    const { status, facility, user, date } = req.query;
    let query = {};
    
    if (status && status !== 'all') query.status = status;
    if (facility) query.facilityName = { $regex: facility, $options: 'i' };
    if (user) query.userName = { $regex: user, $options: 'i' };
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    const bookings = await Booking.find(query)
      .sort({ date: -1, startTime: 1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET single booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Middleware to ensure user can create bookings (verified, active)
async function ensureCanBook(req, res, next) {
  try {
    const { user } = req.body;
    if (!user) {
      return res.status(400).json({ message: 'User is required' });
    }
    const User = require('../models/User');
    const u = await User.findById(user).select('role verified isActive');
    if (!u) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (u.role !== 'admin') {
      if (u.isActive === false) {
        return res.status(403).json({ message: 'Blocked users cannot create bookings' });
      }
      if (!u.verified) {
        return res.status(403).json({ message: 'Unverified users cannot create bookings' });
      }
    }
    return next();
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// POST create new booking
router.post('/', [
  body('facility').notEmpty().withMessage('Facility is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('user').notEmpty().withMessage('User is required'),
  body('purpose').notEmpty().withMessage('Purpose is required')
], ensureCanBook, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if facility exists and get its name
    const facility = await Facility.findById(req.body.facility);
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    if ((facility.status || '').toLowerCase() !== 'open') {
      return res.status(400).json({ message: 'Facility is closed and cannot be booked' });
    }

    // Get user info for userName if not provided
    let userName = req.body.userName;
    if (!userName && req.body.user) {
      const user = await User.findById(req.body.user).select('firstName lastName');
      if (user) {
        userName = `${user.firstName} ${user.lastName}`;
      }
    }

    // Validate time slots against facility opening hours
    const validationResult = validateTimeSlotsAgainstOpeningHours(facility, req.body.date, req.body.startTime, req.body.endTime);
    if (!validationResult.valid) {
      return res.status(400).json({ message: validationResult.message });
    }

    // Check for booking conflicts
    const conflictQuery = {
      facility: req.body.facility,
      date: {
        $gte: new Date(new Date(req.body.date).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(req.body.date).setHours(23, 59, 59, 999))
      },
      $or: [
        {
          startTime: { $lt: req.body.endTime },
          endTime: { $gt: req.body.startTime }
        }
      ]
    };

    const conflictingBooking = await Booking.findOne(conflictQuery);
    if (conflictingBooking) {
      return res.status(400).json({ 
        message: 'Time slot conflicts with existing booking',
        conflictingBooking 
      });
    }

    const recurrenceGroupId = (req.body.recurring && req.body.recurring !== 'none') ? generateRecurrenceGroupId() : undefined;

    // Determine status rules:
    // - Any recurring booking is pending
    // - Any booking longer than 4 hours is pending
    const isRecurring = req.body.recurring && req.body.recurring !== 'none';
    const [sh, sm] = req.body.startTime.split(':').map(Number);
    const [eh, em] = req.body.endTime.split(':').map(Number);
    const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const isLong = durationMinutes > 240; // strictly longer than 4 hours
    const computedStatus = (isRecurring || isLong) ? 'pending' : 'confirmed';

    const booking = new Booking({
      ...req.body,
      status: computedStatus,
      facilityName: facility.name,
      userName: userName, // Populate userName
      ...(recurrenceGroupId ? { recurrenceGroupId } : {})
    });
    
    await booking.save();
    
    // Handle recurring bookings
    if (req.body.recurring && req.body.recurring !== 'none') {
      const baseDate = new Date(req.body.date);
      const startTime = req.body.startTime;
      const endTime = req.body.endTime;
      const recurringBookings = [];
      
      let currentDate = new Date(baseDate);
      let weekCount = 0;
      let monthCount = 0;
      
      // Create recurring bookings for the next 12 occurrences
      for (let i = 1; i <= 12; i++) {
        let nextDate;
        
        switch (req.body.recurring) {
          case 'weekly':
            nextDate = new Date(currentDate);
            nextDate.setDate(currentDate.getDate() + 7);
            break;
          case 'biweekly':
            nextDate = new Date(currentDate);
            nextDate.setDate(currentDate.getDate() + 14);
            break;
          case 'monthly':
            nextDate = new Date(currentDate);
            nextDate.setMonth(currentDate.getMonth() + 1);
            break;
          default:
            break;
        }
        
        if (!nextDate) break;
        
        // Check for conflicts on the next date
        const conflictQuery = {
          facility: req.body.facility,
          date: {
            $gte: new Date(new Date(nextDate).setHours(0, 0, 0, 0)),
            $lt: new Date(new Date(nextDate).setHours(23, 59, 59, 999))
          },
          $or: [
            {
              startTime: { $lt: endTime },
              endTime: { $gt: startTime }
            }
          ]
        };
        
        const hasConflict = await Booking.findOne(conflictQuery);
        if (hasConflict) {
          // Skip this date if there's a conflict
          currentDate = nextDate;
          continue;
        }
        
        // Validate time slots against facility opening hours for this recurring date
        const recurringValidationResult = validateTimeSlotsAgainstOpeningHours(facility, nextDate, startTime, endTime);
        if (!recurringValidationResult.valid) {
          // Skip this date if the facility is closed during the requested time
          currentDate = nextDate;
          continue;
        }
        
        // Create recurring booking
        const recurringBooking = new Booking({
          facility: req.body.facility,
          facilityName: facility.name,
          date: nextDate,
          startTime: startTime,
          endTime: endTime,
          user: req.body.user,
          userName: userName, // Populate userName for recurring bookings
          purpose: req.body.purpose,
          recurring: req.body.recurring,
          status: computedStatus,
          notes: req.body.notes,
          ...(recurrenceGroupId ? { recurrenceGroupId } : {})
        });
        
        recurringBookings.push(recurringBooking);
        currentDate = nextDate;
      }
      
      // Save all recurring bookings
      if (recurringBookings.length > 0) {
        await Booking.insertMany(recurringBookings);
        console.log(`Created ${recurringBookings.length} recurring bookings for ${req.body.recurring} pattern`);
      }
    }
    
    // No need to populate since we store the names directly
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update booking
router.put('/:id', [
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Invalid status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update booking details (time, date, purpose, etc.)
router.put('/:id/details', [
  body('facility').optional().notEmpty().withMessage('Facility is required'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('startTime').optional().notEmpty().withMessage('Start time is required'),
  body('endTime').optional().notEmpty().withMessage('End time is required'),
  body('purpose').optional().notEmpty().withMessage('Purpose is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // If updating time/date, validate against facility opening hours
    if (req.body.date || req.body.startTime || req.body.endTime) {
      const facility = await Facility.findById(booking.facility);
      if (!facility) {
        return res.status(404).json({ message: 'Facility not found' });
      }

      const date = req.body.date || booking.date;
      const startTime = req.body.startTime || booking.startTime;
      const endTime = req.body.endTime || booking.endTime;

      // Validate time slots against facility opening hours
      const validationResult = validateTimeSlotsAgainstOpeningHours(facility, date, startTime, endTime);
      if (!validationResult.valid) {
        return res.status(400).json({ message: validationResult.message });
      }

      // Check for booking conflicts with the new time
      const conflictQuery = {
        facility: booking.facility,
        date: {
          $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        },
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          }
        ],
        _id: { $ne: booking._id } // Exclude current booking
      };

      const conflictingBooking = await Booking.findOne(conflictQuery);
      if (conflictingBooking) {
        return res.status(400).json({ 
          message: 'Time slot conflicts with existing booking',
          conflictingBooking 
        });
      }
    }

    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST verify a pending booking (admin only)
router.post('/:id/verify', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can verify bookings' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be verified' });
    }

    booking.status = 'confirmed';
    await booking.save();
    res.json({ message: 'Booking verified successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE booking (single or entire series if part of recurrence)
router.delete('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // If this booking is part of a recurrence series and has a group id, delete the entire series
    if (booking.recurrenceGroupId) {
      const result = await Booking.deleteMany({ recurrenceGroupId: booking.recurrenceGroupId });
      return res.json({ message: 'Recurring series deleted successfully', deletedCount: result.deletedCount });
    }

    // Fallback for legacy recurring bookings without a recurrenceGroupId
    if (booking.recurring && booking.recurring !== 'none') {
      const match = {
        facility: booking.facility,
        facilityName: booking.facilityName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        user: booking.user,
        userName: booking.userName,
        purpose: booking.purpose,
        recurring: booking.recurring
      };
      const result = await Booking.deleteMany(match);
      return res.json({ message: 'Recurring series deleted successfully', deletedCount: result.deletedCount });
    }

    await booking.deleteOne();
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET bookings for a specific date range
router.get('/range/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const bookings = await Booking.find({
      date: { $gte: start, $lte: end }
    })
    .sort({ date: 1, startTime: 1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET bookings for a specific facility
router.get('/facility/:facilityId', async (req, res) => {
  try {
    const bookings = await Booking.find({ facility: req.params.facilityId })
      .sort({ date: -1, startTime: 1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
