const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  facilityName: {
    type: String,
    required: true
  },
  // New field for specific hall within the facility
  hall: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  recurring: {
    type: String,
    enum: ['none', 'weekly', 'biweekly', 'monthly'],
    default: 'none'
  },
  recurrenceGroupId: {
    type: String,
    index: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries - updated to include hall
bookingSchema.index({ facility: 1, hall: 1, date: 1, startTime: 1 });
bookingSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
