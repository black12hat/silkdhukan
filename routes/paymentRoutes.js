const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// Verify payment and create order
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        // Verify Razorpay signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            // Update order with failure details
            await Order.findByIdAndUpdate(orderId, {
                paymentStatus: 'failed',
                failureReason: 'Invalid payment signature',
                paymentError: 'Payment verification failed'
            });

            return res.json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        // Get order details
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update order with success details
        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'success',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            escrowStatus: 'locked',
            deliveryStatus: 'not_shipped'
        });

        // Update user's orders
        await User.findByIdAndUpdate(order.buyerId, {
            $push: { orders: orderId }
        });

        // Update seller's orders
        await User.findByIdAndUpdate(order.sellerId, {
            $push: { orders: orderId }
        });

        res.json({
            success: true,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment'
        });
    }
});

// Handle payment failure
router.post('/failure', async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        // Update order with failure details
        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'failed',
            failureReason: reason || 'Payment failed',
            deliveryStatus: 'not_applicable'
        });

        res.json({
            success: true,
            message: 'Payment failure recorded'
        });
    } catch (error) {
        console.error('Payment failure error:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording payment failure'
        });
    }
});

module.exports = router; 