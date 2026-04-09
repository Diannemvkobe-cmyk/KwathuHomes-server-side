/*
Purpose
- Stores simple “what happened” records for administrators to review.
- Each log entry includes a level, message, optional details, and time.

How It Works
- Uses three levels: INFO (normal), WARN (something changed), ERROR (failed).
- Keeps lightweight context data so actions can be traced without heavy auditing.
- Helps diagnose issues and understand recent activity across the system.

Where It Fits
- Written from authentication and properties routes; read via admin logs.
*/
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR'],
    default: 'INFO'
  },
  message: {
    type: String,
    required: true
  },
  context: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Log', logSchema);

