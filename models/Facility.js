const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  equipment: [{
    type: String,
    trim: true
  }],
  // description removed per new requirements
  openingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  // New granular opening schedule: 30 half-hour slots from 07:00 to 22:00 per day
  openingHoursGrid: {
    monday:   { type: [Boolean], default: function() { return Array(30).fill(true); } },
    tuesday:  { type: [Boolean], default: function() { return Array(30).fill(true); } },
    wednesday:{ type: [Boolean], default: function() { return Array(30).fill(true); } },
    thursday: { type: [Boolean], default: function() { return Array(30).fill(true); } },
    friday:   { type: [Boolean], default: function() { return Array(30).fill(true); } },
    saturday: { type: [Boolean], default: function() { return Array(30).fill(true); } },
    sunday:   { type: [Boolean], default: function() { return Array(30).fill(true); } },
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Facility', facilitySchema);
