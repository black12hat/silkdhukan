const Order = require('../models/Order');
const Escrow = require('../models/Escrow');
const Product = require('../models/Product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Buyer
exports.createOrder = async (req, res) => {
    try {
        const { productId, quantity, deliveryAddress } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock' });
        }

        // Create Razorpay order
        const amount = product.price * quantity;
        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: `order_${Date.now()}`
        });

        // Ensure phone number is included in delivery address
        const deliveryAddressWithPhone = {
            ...deliveryAddress,
            phone: deliveryAddress.phone || 'Not provided' // Fallback if phone is not provided
        };

        // Create order in database
        const order = await Order.create({
            buyerId: req.user.id,
            sellerId: product.sellerId,
            productId: product._id,
            productName: product.name,
            quantity,
            amount,
            deliveryAddress: deliveryAddressWithPhone,
            razorpayOrderId: razorpayOrder.id,
            paymentStatus: 'pending',
            escrowStatus: null,
            deliveryStatus: 'not_shipped'
        });

        res.json({
            success: true,
            data: {
                order,
                paymentUrl: `/payment/${order._id}`
            }
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
};

// @desc    Retry payment for failed order
// @route   POST /api/orders/:id/retry-payment
// @access  Private/Buyer
exports.retryPayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.buyerId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (order.paymentStatus !== 'failed') {
            return res.status(400).json({ success: false, message: 'Payment can only be retried for failed orders' });
        }

        // Create new Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: order.amount * 100,
            currency: 'INR',
            receipt: `order_${order.orderId}`
        });

        // Update order with new Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        order.paymentStatus = 'pending';
        order.escrowStatus = null;
        await order.save();

        res.json({
            success: true,
            data: {
                paymentUrl: `/payment/${order._id}`
            }
        });
    } catch (error) {
        console.error('Error retrying payment:', error);
        res.status(500).json({ success: false, message: 'Failed to retry payment' });
    }
};

// @desc    Verify payment and update order status
// @route   POST /api/orders/:id/verify-payment
// @access  Private/Buyer
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const order = await Order.findById(req.params.id)
            .populate('sellerId', 'email firstName lastName');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Verify payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment successful
            order.paymentStatus = 'success';
            order.escrowStatus = 'locked'; // Lock funds in escrow
            order.razorpayPaymentId = razorpay_payment_id;
            order.razorpayOrderId = razorpay_order_id;
            order.razorpaySignature = razorpay_signature;
            order.deliveryStatus = 'not_shipped'; // Initialize delivery status
            
            // Save the updated order
            await order.save();

            // Notify seller about new order
            await notifySeller(order);

            res.json({
                success: true,
                message: 'Payment verified successfully',
                data: {
                    orderId: order.orderId,
                    paymentStatus: order.paymentStatus,
                    escrowStatus: order.escrowStatus
                }
            });
        } else {
            // Payment failed
            order.paymentStatus = 'failed';
            order.escrowStatus = null;
            order.failureReason = 'Payment signature verification failed';
            await order.save();

            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
};

// @desc    Update delivery status
// @route   PUT /api/orders/:id/delivery-status
// @access  Private/Seller
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.sellerId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Validate status transition
        const validTransitions = {
            'not_shipped': ['shipped'],
            'shipped': ['delivered'],
            'delivered': ['completed']
        };

        if (!validTransitions[order.deliveryStatus]?.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid status transition from ${order.deliveryStatus} to ${status}` 
            });
        }

        order.deliveryStatus = status;
        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ success: false, message: 'Failed to update delivery status' });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Please log in to view order details' });
    }

    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'companyName email')
      .populate('productId', 'name images');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Make sure user is buyer or seller
    if (order.buyerId._id.toString() !== req.session.userId && 
        order.sellerId._id.toString() !== req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authorized to view this order' });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyerId: req.user.id })
            .populate('sellerId', 'companyName email')
            .populate('productId', 'name images')
            .sort('-createdAt');
        
        // Format the response to match frontend expectations
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            productName: order.productName,
            amount: order.amount,
            paymentStatus: order.paymentStatus,
            escrowStatus: order.escrowStatus,
            deliveryStatus: order.deliveryStatus,
            createdAt: order.createdAt,
            seller: order.sellerId,
            product: order.productId,
            deliveryAddress: order.deliveryAddress,
            failureReason: order.failureReason,
            paymentError: order.paymentError
        }));
        
        res.json({ 
            success: true, 
            count: orders.length, 
            data: formattedOrders 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch orders' 
        });
    }
};

// @desc    Get seller's orders with proper status
// @route   GET /api/orders/sellerorders
// @access  Private/Seller
exports.getSellerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ 
            sellerId: req.user.id,
            paymentStatus: 'success' // Only show paid orders to seller
        })
        .populate('buyerId', 'firstName lastName email')
        .populate('productId', 'name images price')
        .sort('-createdAt');

        // Format orders for seller view
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            productName: order.productName,
            amount: order.amount,
            paymentStatus: order.paymentStatus,
            escrowStatus: order.escrowStatus,
            deliveryStatus: order.deliveryStatus,
            createdAt: order.createdAt,
            buyer: order.buyerId,
            product: order.productId,
            deliveryAddress: order.deliveryAddress,
            quantity: order.quantity
        }));

        res.json({
            success: true,
            count: orders.length,
            data: formattedOrders
        });
    } catch (error) {
        console.error('Error fetching seller orders:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch seller orders' 
        });
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

// Helper function to notify seller about new order
async function notifySeller(order) {
    try {
        // Here you would typically:
        // 1. Send email to seller
        // 2. Create notification in database
        // 3. Send real-time notification if websockets are implemented
        
        // For now, we'll just log it
        console.log(`New order notification for seller ${order.sellerId._id}:`, {
            orderId: order.orderId,
            amount: order.amount,
            productName: order.productName
        });
    } catch (error) {
        console.error('Error notifying seller:', error);
        // Don't throw error as this is a non-critical operation
    }
}