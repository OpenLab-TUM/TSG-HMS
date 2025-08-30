const mongoose = require('mongoose');

// Hall schema for individual halls within a facility
const hallSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'maintenance'],
    default: 'open'
  },
  // Individual hall opening hours grid
  openingHoursGrid: {
    monday:   { type: [Boolean], default: function() { return Array(30).fill(true); } },
    tuesday:  { type: [Boolean], default: function() { return Array(30).fill(true); } },
    wednesday:{ type: [Boolean], default: function() { return Array(30).fill(true); } },
    thursday: { type: [Boolean], default: function() { return Array(30).fill(true); } },
    friday:   { type: [Boolean], default: function() { return Array(30).fill(true); } },
    saturday: { type: [Boolean], default: function() { return Array(30).fill(true); } },
    sunday:   { type: [Boolean], default: function() { return Array(30).fill(true); } },
  },
  // Hall-specific location within facility
  location: {
    building: String,
    floor: String,
    room: String
  }
}, {
  timestamps: true
});

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
  // Multiple halls within the facility
  halls: [hallSchema],
  // Default equipment for the facility (can be overridden by individual halls)
  equipment: [{
    type: String,
    trim: true
  }],
  // Optional GeoJSON location (longitude, latitude)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false
    },
    coordinates: {
      type: [Number],
      required: false,
      // Expect [longitude, latitude]
      validate: {
        validator: function(v) {
          if (!v || v.length === 0) return true; // optional
          if (!Array.isArray(v) || v.length !== 2) return false;
          const [lng, lat] = v;
          return typeof lng === 'number' && typeof lat === 'number' &&
                 !isNaN(lng) && !isNaN(lat) &&
                 lng >= -180 && lng <= 180 &&
                 lat >= -90 && lat <= 90;
        },
        message: 'Location must be [longitude, latitude] within valid ranges'
      }
    }
  },
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
  // This is now the default for the facility, can be overridden by individual halls
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

// Add geospatial index for location queries only when coordinates exist
facilitySchema.index({ location: '2dsphere' }, { sparse: true });

// Pre-save middleware to handle location field conditionally
facilitySchema.pre('save', function(next) {
  // Only include location if coordinates are provided
  if (!this.location || !this.location.coordinates) {
    this.location = undefined;
  }
  
  // Ensure at least one hall exists
  if (!this.halls || this.halls.length === 0) {
    this.halls = [{
      name: 'Main Hall',
      status: 'open',
      openingHoursGrid: this.openingHoursGrid
    }];
  }
  
  next();
});

// Instance method to set location coordinates
facilitySchema.methods.setLocation = function(longitude, latitude) {
  if (longitude !== undefined && latitude !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
  } else {
    this.location = undefined;
  }
  return this;
};

// Instance method to add a hall
facilitySchema.methods.addHall = function(hallData) {
  this.halls.push(hallData);
  return this;
};

// Instance method to get hall by name
facilitySchema.methods.getHall = function(hallName) {
  return this.halls.find(hall => hall.name === hallName);
};

// Instance method to get all open halls
facilitySchema.methods.getOpenHalls = function() {
  // If facility has only 1 hall, return it regardless of status
  if (this.halls.length === 1) {
    return this.halls;
  }
  
  // For multi-hall facilities, check hall status
  return this.halls.filter(hall => {
    const status = (hall.status || '').toLowerCase();
    return status === 'open' || status === 'available' || !status;
  });
};

module.exports = mongoose.model('Facility', facilitySchema);
