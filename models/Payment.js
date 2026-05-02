const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerName: {
    type: String,
    default: ''
  },
  buyerEmail: {
    type: String,
    default: ''
  },
  buyerPhone: {
    type: String,
    default: ''
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerName: {
    type: String,
    default: ''
  },
  sellerEmail: {
    type: String,
    default: ''
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  property: {
    type: Object,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['zamtel', 'airtel', 'mtn', 'visa', 'mastercard', 'paypal', 'bitcoin']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'reversed'],
    default: 'pending'
  },
  approvedAt: {
    type: Date,
    default: null
  },
  reversedAt: {
    type: Date,
    default: null
  },
  paymentDetails: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
