const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Facility = require('../models/Facility');
const { body, validationResult } = require('express-validator');

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

// POST create new booking
router.post('/', [
  body('facility').notEmpty().withMessage('Facility is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('user').notEmpty().withMessage('User is required'),
  body('purpose').notEmpty().withMessage('Purpose is required')
], async (req, res) => {
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

    const booking = new Booking({
      ...req.body,
      facilityName: facility.name
    });
    
    await booking.save();
    
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

// DELETE booking
router.delete('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
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
