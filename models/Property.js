/*
Purpose
- Describes what a “Property” listing looks like in the database.
- Stores details like price, location, images, and who owns the listing.

How It Works
- Defines clear fields for the listing with simple validation rules.
- Keeps a single “cover image” plus an optional array of extra images.
- Records which user owns the listing so permissions can be enforced.
- Automatically tracks when the listing was created and last updated.

Where It Fits
- Queried and modified by the properties routes.
*/
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  beds: {
    type: Number,
    required: true
  },
  baths: {
    type: Number,
    required: true
  },
  sqft: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  images: {
    type: [String],
    default: []
  },
  type: {
    type: String,
    required: true,
    enum: ['House', 'Flats', 'Apartment', 'Shared House']
  },
  tag: {
    type: String,
    default: 'New'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  ownerPhone: {
    type: String,
    default: ''
  },
  ownerEmail: {
    type: String,
    default: ''
  },
  ownerProfilePic: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Property', propertySchema);
