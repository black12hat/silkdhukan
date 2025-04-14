const express = require('express');
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  retryPayment,
  verifyPayment,
  updateDeliveryStatus
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

router.route('/')
  .post(protect, authorize('buyer'), createOrder);

router.route('/myorders')
  .get(protect, getMyOrders);

router.route('/sellerorders')
  .get(protect, authorize('seller'), getSellerOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.route('/:id/status')
  .put(protect, authorize('seller', 'admin'), updateOrderStatus);

// Payment related routes
router.route('/:id/retry-payment')
  .post(protect, authorize('buyer'), retryPayment);

router.route('/:id/verify-payment')
  .post(protect, authorize('buyer'), verifyPayment);

// Delivery status
router.route('/:id/delivery-status')
  .put(protect, authorize('seller'), updateDeliveryStatus);

// Dispute handling
router.route('/:id/dispute')
  .post(protect, authorize('buyer'), async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.buyerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      order.disputeDetails = {
        raisedBy: req.user.id,
        reason: req.body.reason,
        status: 'open',
        raisedAt: Date.now()
      };

      await order.save();

      res.json({
        success: true,
        message: 'Dispute raised successfully'
      });
    } catch (error) {
      console.error('Error raising dispute:', error);
      res.status(500).json({ success: false, message: 'Failed to raise dispute' });
    }
  });

// Get all orders for the current user (buyer)
router.get('/buyer', async (req, res) => {
    try {
        const orders = await Order.find({ buyerId: req.user._id })
            .populate('productId', 'name images price')
            .populate('sellerId', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
});

// Get order details by ID
router.get('/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({
            orderId: req.params.orderId,
            buyerId: req.user._id
        })
        .populate('productId', 'name images price')
        .populate('sellerId', 'firstName lastName email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details'
        });
    }
});

module.exports = router;