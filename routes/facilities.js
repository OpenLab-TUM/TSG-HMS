const express = require('express');
const router = express.Router();
const Facility = require('../models/Facility');
const { body, validationResult } = require('express-validator');

// GET all facilities
router.get('/', async (req, res) => {
  try {
    const facilities = await Facility.find().sort({ name: 1 });
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET single facility by ID
router.get('/:id', async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    res.json(facility);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create new facility
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('status').isIn(['open', 'closed']).withMessage('Invalid status'),
  body('equipment').optional().isArray().withMessage('Equipment must be an array'),
  body('openingHoursGrid').optional().isObject().withMessage('Opening hours grid must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Creating facility with data:', req.body);
    const facility = new Facility(req.body);
    await facility.save();
    res.status(201).json(facility);
  } catch (error) {
    console.error('Error creating facility:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update facility
router.put('/:id', [
  body('name').notEmpty().withMessage('Name is required'),
  body('status').isIn(['open', 'closed']).withMessage('Invalid status'),
  body('equipment').optional().isArray().withMessage('Equipment must be an array'),
  body('openingHoursGrid').optional().isObject().withMessage('Opening hours grid must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    console.log('Request body:', req.body);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Updating facility with data:', req.body);
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    
    res.json(facility);
  } catch (error) {
    console.error('Error updating facility:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE facility
router.delete('/:id', async (req, res) => {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' });
    }
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET facilities by status
router.get('/status/:status', async (req, res) => {
  try {
    const facilities = await Facility.find({ status: req.params.status }).sort({ name: 1 });
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
