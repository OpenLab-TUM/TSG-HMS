const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();

// Middleware
// CORS configuration to support localhost and ngrok domains with credentials
const allowedOriginPatterns = [
  /^https?:\/\/localhost:(3000|5000|5001)$/,
  /^https?:\/\/127\.0\.0\.1:(3000|5000|5001)$/,
  /^https?:\/\/[a-z0-9-]+\.ngrok\.io$/,
  /^https?:\/\/[a-z0-9-]+\.ngrok-free\.app$/,
];

// Allow additional explicit origins via env (comma-separated)
const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);

    if (envAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const isAllowedByPattern = allowedOriginPatterns.some((re) => re.test(origin));
    if (isAllowedByPattern) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: String(process.env.CORS_ALLOW_CREDENTIALS || 'true') === 'true',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://assemeldlebsh:Assem123@ypt.oy6wu.mongodb.net/tsg-hallenmanagement?retryWrites=true&w=majority&appName=tsg-hallenmanagement', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Atlas connected successfully'))
.catch(err => console.error('MongoDB Atlas connection error:', err));

// Import routes
const authRoutes = require('./routes/auth');
const facilityRoutes = require('./routes/facilities');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
