const mongoose = require('mongoose');

const EscrowSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['funded', 'inspecting', 'approved', 'disputed', 'released', 'refunded'],
    default: 'funded'
  },
  paymentId: String,
  disputeReason: String,
  disputeResolution: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  releasedAt: Date
});

module.exports = mongoose.model('Escrow', EscrowSchema);