/*
Purpose
- Describes what a “User” looks like in the database.
- Supports Buyers, Sellers, and Admins with secure password handling.

How It Works
- Defines fields like name, email, password, role, and when the account was created.
- Ensures emails are unique, lowercase, and trimmed (no extra spaces).
- Before saving, hashes the password so the real password is never stored.
- Provides a helper function to check a login password against the saved hash.

Where It Fits
- Used by authentication routes and ownership checks across the API.
*/
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Buyer', 'Seller', 'Admin'],
    default: 'Buyer'
  },
  phone: {
    type: String,
    default: ''
  },
  profilePic: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
