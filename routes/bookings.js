const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Facility = require('../models/Facility');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const generateRecurrenceGroupId = () => {
  try {
    if (typeof randomUUID === 'function') return randomUUID();
  } catch (_) {}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
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

    // Determine status: one-time bookings are confirmed; recurring by collaborators are pending; recurring by admins are confirmed
    const creator = await User.findById(req.body.user).select('role');
    const isRecurring = req.body.recurring && req.body.recurring !== 'none';
    const isAdminCreator = creator?.role === 'admin';
    const computedStatus = isRecurring && !isAdminCreator ? 'pending' : 'confirmed';

    const booking = new Booking({
      ...req.body,
      status: computedStatus,
      facilityName: facility.name,
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
        
        // Create recurring booking
        const recurringBooking = new Booking({
          facility: req.body.facility,
          facilityName: facility.name,
          date: nextDate,
          startTime: startTime,
          endTime: endTime,
          user: req.body.user,
          userName: req.body.userName,
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
