/*
Purpose
- Provides endpoints to browse homes and manage listings.
- Only the listing owner or an admin can change or delete a property.

How It Works
- “GET /” returns all properties for the marketplace feed.
- “GET /:id” returns one property by its unique id.
- “GET /my/listings” returns the current user’s properties (requires login).
- “POST /” creates a new property for a logged‑in Seller and writes a log.
- “PUT /:id” updates a property; sets the first image as the cover.
- “DELETE /:id” removes a property and notes the event for admin review.

Where It Fits
- Mounted under /api/properties by the main server file.
*/
const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const Log = require('../models/Log');

const OWNER_FIELDS = 'name phone email profilePic';

// GET all properties
router.get('/', async (req, res) => {
  try {
    const properties = await Property.find()
      .sort({ createdAt: -1 })
      .populate('owner', OWNER_FIELDS);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', OWNER_FIELDS);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET my listings
router.get('/my/listings', auth, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .populate('owner', OWNER_FIELDS);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CREATE property
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Seller') {
      return res.status(403).json({ message: 'Only sellers can create listings' });
    }

    const { title, description, price, location, beds, baths, sqft, image, images, type, tag, ownerName } = req.body;

    const property = new Property({
      title,
      description,
      price,
      location,
      beds,
      baths,
      sqft,
      image: images?.[0] || image,
      images: images || [image],
      type,
      tag,
      ownerName,
      owner: req.user.id
    });

    await property.save();

    await Log.create({
      level: 'INFO',
      message: 'Property created',
      context: { ownerId: req.user.id, propertyId: property._id, title: property.title }
    });

    res.status(201).json(property);
  } catch (err) {
    await Log.create({
      level: 'ERROR',
      message: 'Property creation failed',
      context: { ownerId: req.user?.id, error: err.message }
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE property
router.put('/:id', auth, async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const updates = { ...req.body };
    if (updates.images && updates.images.length > 0) {
      updates.image = updates.images[0];
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    await Log.create({
      level: 'INFO',
      message: 'Property updated',
      context: { userId: req.user.id, propertyId: property._id, title: property.title }
    });

    res.json(property);
  } catch (err) {
    await Log.create({
      level: 'ERROR',
      message: 'Property update failed',
      context: { userId: req.user?.id, propertyId: req.params.id, error: err.message }
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE property
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await property.deleteOne();

    await Log.create({
      level: 'WARN',
      message: 'Property deleted',
      context: { userId: req.user.id, propertyId: req.params.id, title: property.title }
    });

    res.json({ message: 'Property removed' });
  } catch (err) {
    await Log.create({
      level: 'ERROR',
      message: 'Property delete failed',
      context: { userId: req.user?.id, propertyId: req.params.id, error: err.message }
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
