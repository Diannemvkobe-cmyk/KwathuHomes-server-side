/*
Purpose
- Gives administrators simple tools to see activity, users, and system logs.
- Helps with light management tasks like creating or removing an account.

How It Works
- “/overview” returns quick counts for users and listings over recent periods.
- “/traffic” aggregates activity for the last 24 hours into a small number series.
- “/users” lists all users; “/users/:id” shows basic details for one user.
- “POST /users” creates a user; “DELETE /users/:id” removes a user and listings.
- “/logs” returns the most recent system logs to help with diagnostics.

Where It Fits
- Mounted under /api/admin by the main server file.
*/
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const Log = require('../models/Log');

// Simple admin overview metrics endpoint
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const [
      totalAccounts,
      buyersCount,
      sellersCount,
      newUsersThisWeek,
      totalListings,
      newListingsThisMonth
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'Buyer' }),
      User.countDocuments({ role: 'Seller' }),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Property.countDocuments({}),
      Property.countDocuments({ createdAt: { $gte: oneMonthAgo } })
    ]);

    const buyerEngagementPercent =
      buyersCount > 0 ? Math.min(100, Math.round((newUsersThisWeek / buyersCount) * 100)) : 0;

    res.json({
      totalAccounts,
      buyersCount,
      sellersCount,
      newUsersThisWeek,
      totalListings,
      newListingsThisMonth,
      buyerEngagementPercent
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ message: 'Failed to load admin overview', error: err.message });
  }
});

// Traffic & activity over last 24 hours (users + listings created)
router.get('/traffic', async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [recentUsers, recentListings] = await Promise.all([
      User.find({ createdAt: { $gte: twentyFourHoursAgo } }).select('createdAt').lean(),
      Property.find({ createdAt: { $gte: twentyFourHoursAgo } }).select('createdAt').lean()
    ]);

    const bucketCount = 12; // 12 bars for the last 24h (2h per bucket)
    const bucketMs = (24 * 60 * 60 * 1000) / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      index: i,
      from: new Date(twentyFourHoursAgo.getTime() + i * bucketMs),
      to: new Date(twentyFourHoursAgo.getTime() + (i + 1) * bucketMs),
      count: 0
    }));

    const addToBucket = (date) => {
      const diff = date.getTime() - twentyFourHoursAgo.getTime();
      if (diff < 0) return;
      let idx = Math.floor(diff / bucketMs);
      if (idx < 0 || idx >= bucketCount) return;
      buckets[idx].count += 1;
    };

    recentUsers.forEach((u) => addToBucket(u.createdAt));
    recentListings.forEach((p) => addToBucket(p.createdAt));

    const series = buckets.map((b) => b.count);

    res.json({ series });
  } catch (err) {
    console.error('Admin traffic error:', err);
    res.status(500).json({ message: 'Failed to load traffic data', error: err.message });
  }
});

// Users list for admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    const mapped = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ message: 'Failed to load users', error: err.message });
  }
});

// Single user details (for inspect view)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const listingsCount = await Property.countDocuments({ owner: user._id });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic || '',
      createdAt: user.createdAt,
      listingsCount,
      reports: [] // Placeholder for future user reports
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ message: 'Failed to load user detail', error: err.message });
  }
});

// Create user (admin)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }

    if (!['Buyer', 'Seller', 'Admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = new User({ name, email, password, role });
    await user.save();

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
});

// Delete user (and their listings)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Property.deleteMany({ owner: user._id });
    await user.deleteOne();

    await Log.create({
      level: 'WARN',
      message: 'User deleted by admin',
      context: { userId: user._id, email: user.email, role: user.role }
    });

    res.json({ message: 'User and associated listings deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
});

// System logs for admin
router.get('/logs', async (req, res) => {
  try {
    const logs = await Log.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(
      logs.map((log) => ({
        id: log._id,
        level: log.level,
        message: log.message,
        context: log.context,
        createdAt: log.createdAt
      }))
    );
  } catch (err) {
    console.error('Admin logs error:', err);
    res.status(500).json({ message: 'Failed to load logs', error: err.message });
  }
});

module.exports = router;

