const Order = require('../models/Order');
const Escrow = require('../models/Escrow');
const Product = require('../models/Product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Buyer
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items' });
    }

    // Verify product availability and calculate total
    let totalAmount = 0;
    let sellerId = null;
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `${product.name} is out of stock` });
      }
      
      item.price = product.price;
      totalAmount += item.price * item.quantity;
      
      // For simplicity, assuming all products in order are from one seller
      sellerId = product.seller;
    }

    // Create order
    const order = await Order.create({
      buyer: req.user.id,
      seller: sellerId,
      items,
      shippingAddress,
      totalAmount,
      paymentMethod
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'companyName email')
      .populate('seller', 'companyName email')
      .populate('items.product', 'name images');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Make sure user is buyer or seller
    if (order.buyer._id.toString() !== req.user.id && 
        order.seller._id.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to view this order' });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate('seller', 'companyName')
      .sort('-createdAt');
    
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get seller's orders
// @route   GET /api/orders/sellerorders
// @access  Private/Seller
exports.getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate('buyer', 'companyName')
      .sort('-createdAt');
    
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Seller or Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check permissions
    if (order.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to update this order' });
    }
    
    // Update status
    order.status = status;
    
    // If delivered, set deliveredAt date
    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    
    await order.save();
    
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};