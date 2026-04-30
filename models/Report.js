/*
Purpose
- Stores seller/property reports submitted by buyers or anonymous visitors.
- Gives admins a structured queue to review flagged listings and owners.

How It Works
- Links each report to a seller and the property that was flagged.
- Stores lightweight reporter information when available.
- Tracks review status and any action taken by an admin.

Where It Fits
- Written from the public property report flow and read by admin tools.
*/
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  reporterUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reporterName: {
    type: String,
    default: ''
  },
  reporterEmail: {
    type: String,
    default: ''
  },
  reporterRole: {
    type: String,
    default: 'Guest'
  },
  status: {
    type: String,
    enum: ['Open', 'Reviewed', 'Dismissed'],
    default: 'Open'
  },
  adminAction: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);
