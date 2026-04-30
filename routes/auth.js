/*
Purpose
- Handles account actions: sign up, log in, and update a basic profile.
- Issues short text “tokens” (JWT) so the app can recognize the user later.

How It Works
- “/register” creates a new user if the email isn’t already taken, then returns a token.
- “/login” checks the email and password; if valid, returns a token and user details.
- “/profile” requires a valid token and updates simple fields like name or phone.
- Each important action writes a small log entry so admins can see recent activity.

Where It Fits
- These endpoints are mounted under /api/auth by the main server file.
*/
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Property = require('../models/Property');
const Log = require('../models/Log');

const JWT_SECRET = process.env.JWT_SECRET;
const SAVED_PROPERTY_FIELDS = 'title description price location beds baths sqft image images type tag owner ownerName ownerPhone ownerWhatsapp ownerEmail ownerProfilePic createdAt updatedAt';

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  approvalStatus: user.approvalStatus || 'Approved',
  phone: user.phone || '',
  whatsapp: user.whatsapp || '',
  profilePic: user.profilePic || ''
});

const ensureBuyer = (req, res) => {
  if (req.user.role !== 'Buyer') {
    res.status(403).json({ message: 'Only buyers can manage saved properties' });
    return false;
  }
  return true;
};

const loadSavedProperties = async (userId) => {
  const user = await User.findById(userId)
    .populate({
      path: 'savedProperties',
      options: { sort: { createdAt: -1 } },
      populate: {
        path: 'owner',
        select: 'name phone email profilePic'
      }
    })
    .lean();

  if (!user) {
    return null;
  }

  const savedProperties = Array.isArray(user.savedProperties)
    ? user.savedProperties.filter(Boolean)
    : [];

  return savedProperties;
};

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, profilePic } = req.body;
    const lowerEmail = String(email || '').toLowerCase().trim();

    // Check if user exists
    const existingUser = await User.findOne({ email: lowerEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email: lowerEmail,
      password,
      role,
      phone,
      profilePic,
      approvalStatus: 'Pending'
    });
    await user.save();

    await Log.create({
      level: 'INFO',
      message: 'New user registered',
      context: { userId: user._id, email: user.email, role: user.role, approvalStatus: user.approvalStatus }
    });

    res.status(201).json({
      message: 'Registration submitted. The admin has been notified and your account will be approved before you can use the system.',
      requiresApproval: true,
      approvalStatus: user.approvalStatus,
      user: serializeUser(user)
    });
  } catch (err) {
    await Log.create({
      level: 'ERROR',
      message: 'User registration failed',
      context: { error: err.message }
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const lowerEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const approvalStatus = String(user.approvalStatus || 'Approved');
    if (approvalStatus === 'Pending') {
      return res.status(403).json({
        message: 'Your registration is still pending admin approval.',
        approvalStatus
      });
    }

    if (approvalStatus === 'Rejected') {
      return res.status(403).json({
        message: 'Your registration was rejected. Please contact the admin.',
        approvalStatus
      });
    }

    if (!JWT_SECRET) {
      await Log.create({
        level: 'ERROR',
        message: 'JWT secret missing during login',
        context: { email: lowerEmail }
      });
      return res.status(500).json({ message: 'Server configuration error' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    await Log.create({
      level: 'INFO',
      message: 'User login',
      context: { userId: user._id, email: user.email, role: user.role, approvalStatus: user.approvalStatus || 'Approved' }
    });

    res.json({
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    await Log.create({
      level: 'ERROR',
      message: 'User login failed',
      context: { email: req.body?.email, error: err.message }
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE PROFILE
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, email, profilePic, phone, whatsapp } = req.body;

    // Build user object
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (phone !== undefined) userFields.phone = phone;
    if (whatsapp !== undefined) userFields.whatsapp = whatsapp;
    if (profilePic !== undefined) userFields.profilePic = profilePic;

    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select('-password');

    res.json({
      user: serializeUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/saved-properties', require('../middleware/auth'), async (req, res) => {
  try {
    if (!ensureBuyer(req, res)) return;

    const savedProperties = await loadSavedProperties(req.user.id);
    if (savedProperties === null) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(savedProperties);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/saved-properties/:propertyId', require('../middleware/auth'), async (req, res) => {
  try {
    if (!ensureBuyer(req, res)) return;

    const property = await Property.findById(req.params.propertyId).select(SAVED_PROPERTY_FIELDS);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const propertyId = property._id.toString();
    const savedPropertyIds = Array.isArray(user.savedProperties) ? user.savedProperties : [];
    const alreadySaved = savedPropertyIds.some((savedId) => String(savedId) === propertyId);

    if (!alreadySaved) {
      user.savedProperties.push(property._id);
      await user.save();
    }

    const savedProperties = await loadSavedProperties(user._id);
    res.status(alreadySaved ? 200 : 201).json(savedProperties);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/saved-properties/:propertyId', require('../middleware/auth'), async (req, res) => {
  try {
    if (!ensureBuyer(req, res)) return;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { savedProperties: req.params.propertyId } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const savedProperties = await loadSavedProperties(user._id);
    res.json(savedProperties);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET public user contact info (phone & whatsapp) - no auth required
router.get('/:id/contact', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('phone whatsapp').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      phone: user.phone || '',
      whatsapp: user.whatsapp || ''
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
