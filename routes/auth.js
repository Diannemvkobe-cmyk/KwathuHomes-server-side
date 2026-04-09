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
const Log = require('../models/Log');

const JWT_SECRET = process.env.JWT_SECRET;

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

    const user = new User({ name, email: lowerEmail, password, role, phone, profilePic });
    await user.save();

    await Log.create({
      level: 'INFO',
      message: 'New user registered',
      context: { userId: user._id, email: user.email, role: user.role }
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        profilePic: user.profilePic || ''
      }
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
      context: { userId: user._id, email: user.email, role: user.role }
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        profilePic: user.profilePic || ''
      }
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
    const { name, email, profilePic, phone } = req.body;

    // Build user object
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (phone !== undefined) userFields.phone = phone;
    if (profilePic !== undefined) userFields.profilePic = profilePic;

    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select('-password');

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        profilePic: user.profilePic || ''
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
