/*
Purpose
- Starts the web server (Express) and connects to the database (MongoDB).
- Loads helpers and routes so the app can handle requests from the client.

How It Works
- Loads environment variables from a local file so sensitive values aren’t hardcoded.
- Adds tools that help read data sent from the browser and allow cross‑origin requests.
- Registers groups of endpoints for authentication, property listings, and admin tools.
- Connects to MongoDB; the server only starts listening after a successful connection.
- If the database fails to connect at startup, the app exits to reveal setup issues early.

Where It Fits
- This is the entry point of the backend. When you run “npm start” or “npm run dev”,
  this file is executed to boot the API.
*/
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const adminRoutes = require('./routes/admin');

const app = express();

// Read JSON bodies and web forms safely; allow requests from the frontend app
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Attach route modules under clear URL prefixes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/admin', adminRoutes);

// Connect to the database and only start the server after it succeeds
const MONGODB_URI = process.env.MONGODB_URI

const PORT = process.env.PORT || 5000;

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
