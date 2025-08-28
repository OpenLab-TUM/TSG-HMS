const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// POST /auth/register - Register new collaborator
router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user (collaborator by default, unverified)
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'collaborator',
      verified: false,
      status: 'pending'
    });

    await newUser.save();

    // TODO: Send verification email to admin
    console.log(`New collaborator registration: ${email} - ${firstName} ${lastName}`);

    res.status(201).json({ 
      message: 'Registration successful! Please wait for admin verification before you can book facilities.',
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        verified: newUser.verified,
        status: newUser.status
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /auth/login - User login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If legacy admin without password, allow login with default password and migrate
    if (!user.password) {
      const defaultAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!';
      if (user.role === 'admin' && password === defaultAdminPassword) {
        const saltRounds = 12;
        user.password = await bcrypt.hash(password, saltRounds);
        if (user.status !== 'active') user.status = 'active';
        if (!user.verified) user.verified = true;
        await user.save();
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    // Blocked users cannot login (admins exempt)
    if (user.role !== 'admin' && user.isActive === false) {
      return res.status(401).json({ 
        message: 'Your account has been blocked. Please contact an administrator.' 
      });
    }

    // Collaborators must be verified to login
    if (user.role === 'collaborator' && !user.verified) {
      return res.status(401).json({ 
        message: 'Your account is pending verification. Please wait for admin approval.' 
      });
    }

    // Ensure status is active for non-admins
    if (user.role !== 'admin' && user.status !== 'active') {
      return res.status(401).json({ 
        message: 'Your account is not active. Please contact an administrator.' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        verified: user.verified,
        status: user.status,
        isActive: user.isActive !== false
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /auth/verify - Verify JWT token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Token is valid',
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error during token verification' });
  }
});

// POST /auth/refresh - Refresh JWT token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign(
      { 
        userId: req.user._id, 
        email: req.user.email, 
        role: req.user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Token refreshed',
      token,
      user: req.user
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
});

// POST /auth/verify-user/:userId - Admin verifies a collaborator
router.post('/verify-user/:userId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can verify users' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'collaborator') {
      return res.status(400).json({ message: 'Only collaborators can be verified' });
    }

    user.verified = true;
    user.status = 'active';
    await user.save();

    // TODO: Send verification email to user
    console.log(`User ${user.email} has been verified by admin ${req.user.email}`);

    res.json({
      message: 'User verified successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        verified: user.verified,
        status: user.status
      }
    });

  } catch (error) {
    console.error('User verification error:', error);
    res.status(500).json({ message: 'Server error during user verification' });
  }
});

// GET /auth/pending-users - Get list of pending collaborators (admin only)
router.get('/pending-users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can view pending users' });
    }

    const pendingUsers = await User.find({ 
      role: 'collaborator', 
      verified: false 
    }).select('-password');

    res.json({
      message: 'Pending users retrieved successfully',
      users: pendingUsers
    });

  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ message: 'Server error while retrieving pending users' });
  }
});

module.exports = router;
