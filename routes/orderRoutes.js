const express = require('express');
const {
  createOrder,
  getOrderById,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

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

module.exports = router;