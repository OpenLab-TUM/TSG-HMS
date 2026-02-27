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

// Helper function to validate time slots against facility opening hours
function validateTimeSlotsAgainstOpeningHours(facility, date, startTime, endTime, hallName = null) {
  // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = new Date(date).getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayNames[dayOfWeek];
  
  // Get the opening hours grid - either from specific hall or facility default
  let dayGrid;
  if (hallName && facility.halls) {
    const hall = facility.halls.find(h => h.name === hallName);
    if (hall && hall.openingHoursGrid) {
      dayGrid = hall.openingHoursGrid[dayKey];
    }
  }
  
  // Fall back to facility default if hall doesn't have specific hours
  if (!dayGrid) {
    dayGrid = facility.openingHoursGrid?.[dayKey];
  }
  
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
  // This prevents bookings that span across closed periods (e.g., 10:00-13:00 when facility is closed 11:00-12:00)
  for (let slot = startSlot; slot < endSlot; slot++) {
    if (slot < 0 || slot >= dayGrid.length || dayGrid[slot] === false) {
      const slotTime = new Date();
      slotTime.setHours(7 + Math.floor(slot * 0.5), (slot % 2) * 30, 0, 0);
      const timeString = slotTime.toTimeString().slice(0, 5);
      return { 
        valid: false, 
        message: `Booking cannot span across closed periods. Facility is closed at ${timeString} on ${dayKey}. Please split your booking or choose a different time.` 
      };
    }
  }
  
  return { valid: true };
}

// Pre-save middleware to validate booking against facility opening hours
bookingSchema.pre('save', async function(next) {
  try {
    // Only validate if this is a new booking or if time-related fields have changed
    if (this.isNew || this.isModified('date') || this.isModified('startTime') || this.isModified('endTime') || this.isModified('hall')) {
      const Facility = mongoose.model('Facility');
      const facility = await Facility.findById(this.facility);
      
      if (!facility) {
        return next(new Error('Facility not found'));
      }
      
      // Validate time slots against facility opening hours
      const validationResult = validateTimeSlotsAgainstOpeningHours(facility, this.date, this.startTime, this.endTime, this.hall);
      
      if (!validationResult.valid) {
        return next(new Error(validationResult.message));
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
