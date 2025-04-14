const Escrow = require('../models/Escrow');
const Order = require('../models/Order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create escrow payment
// @route   POST /api/escrow/create
// @access  Private/Buyer
exports.createEscrow = async (req, res) => {
  try {
    const { orderId, paymentMethodId } = req.body;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Ensure the current user is the buyer
    if (order.buyer.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    
    // Create Stripe payment
    const payment = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `Escrow payment for Order #${order._id}`
    });
    
    // Create escrow record
    const escrow = await Escrow.create({
      order: order._id,
      buyer: order.buyer,
      seller: order.seller,
      amount: order.totalAmount,
      status: 'funded',
      paymentId: payment.id
    });
    
    // Update order with escrow info
    order.escrow.status = 'funded';
    order.escrow.transactionId = escrow._id;
    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = 'processing';
    order.paymentResult = {
      id: payment.id,
      status: payment.status,
      update_time: new Date().toISOString(),
      email_address: req.user.email
    };
    
    await order.save();
    
    res.status(201).json({ success: true, data: escrow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Release escrow funds to seller
// @route   PUT /api/escrow/:id/release
// @access  Private/Buyer
exports.releaseEscrow = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);
    
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }
    
    // Ensure the current user is the buyer
    if (escrow.buyer.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    
    // Update escrow status
    escrow.status = 'released';
    escrow.releasedAt = Date.now();
    await escrow.save();
    
    // Update order status
    const order = await Order.findById(escrow.order);
    order.status = 'completed';
    order.escrow.status = 'released';
    await order.save();
    
    // Here we'd normally transfer funds to seller account
    // For demo purposes, we'll just update the status
    
    res.json({ success: true, data: escrow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request refund for escrow
// @route   PUT /api/escrow/:id/dispute
// @access  Private/Buyer
exports.disputeEscrow = async (req, res) => {
  try {
    const { reason } = req.body;
    const escrow = await Escrow.findById(req.params.id);
    
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }
    
    // Ensure the current user is the buyer
    if (escrow.buyer.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    
    // Update escrow status
    escrow.status = 'disputed';
    escrow.disputeReason = reason;
    await escrow.save();
    
    // Update order status
    const order = await Order.findById(escrow.order);
    order.status = 'disputed';
    order.escrow.status = 'disputed';
    await order.save();
    
    res.json({ success: true, data: escrow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get escrow by ID
// @route   GET /api/escrow/:id
// @access  Private
exports.getEscrowById = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id)
      .populate('buyer', 'companyName email')
      .populate('seller', 'companyName email')
      .populate('order');
    
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }
    
    // Ensure user is buyer or seller
    if (escrow.buyer._id.toString() !== req.user.id && 
        escrow.seller._id.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to view this escrow' });
    }
    
    res.json({ success: true, data: escrow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
