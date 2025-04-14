const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a new order
router.post('/create', async (req, res) => {
    try {
        const { shipping, amount } = req.body;
        
        // Get cart items
        const cart = await Cart.findOne({ buyer: req.user._id })
            .populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Create Razorpay order
        const options = {
            amount: amount,
            currency: 'INR',
            receipt: `order_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Create order in database for each cart item
        const orders = await Promise.all(cart.items.map(async (item) => {
            const order = new Order({
                orderId: uuidv4(),
                buyerId: req.user._id,
                sellerId: item.productId.seller,
                productId: item.productId._id,
                productName: item.productId.name,
                amount: item.productId.price * item.quantity * 100, // Convert to paise
                quantity: item.quantity,
                deliveryAddress: shipping,
                razorpayOrderId: razorpayOrder.id,
                paymentStatus: 'pending',
                deliveryStatus: 'not_shipped',
                escrowStatus: 'locked'
            });

            await order.save();
            return order;
        }));

        // Clear the cart after successful order creation
        await Cart.findOneAndUpdate(
            { buyer: req.user._id },
            { $set: { items: [], totalAmount: 0 } }
        );

        res.json({
            success: true,
            data: {
                orderId: orders[0].orderId, // Return the first order ID for reference
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// Verify payment and update order status
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

        // Create the signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Verify the signature
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update order with payment details
            const order = await Order.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                {
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    paymentStatus: 'success',
                    escrowStatus: 'locked',
                    deliveryStatus: 'not_shipped'
                },
                { new: true }
            );

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            res.json({
                success: true,
                message: 'Payment verified successfully',
                order: {
                    orderId: order.orderId,
                    paymentStatus: order.paymentStatus,
                    deliveryStatus: order.deliveryStatus,
                    escrowStatus: order.escrowStatus
                }
            });
        } else {
            // Update order with failure details
            await Order.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                {
                    paymentStatus: 'failed',
                    failureReason: 'Invalid payment signature',
                    paymentError: 'Payment verification failed',
                    deliveryStatus: 'not_applicable'
                }
            );

            res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment'
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
            paymentError: 'Payment failed',
            deliveryStatus: 'not_applicable'
        });

        res.json({
            success: true,
            message: 'Payment failure recorded'
        });
    } catch (error) {
        console.error('Error recording payment failure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record payment failure'
        });
    }
});

// Confirm delivery and release escrow
router.post('/confirm-delivery', async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findOneAndUpdate(
            { _id: orderId, buyerId: req.user._id },
            {
                deliveryStatus: 'delivered',
                escrowStatus: 'released'
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or unauthorized'
            });
        }

        res.json({
            success: true,
            message: 'Delivery confirmed and escrow released'
        });
    } catch (error) {
        console.error('Error confirming delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm delivery'
        });
    }
});

// Raise a dispute
router.post('/dispute', async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        const order = await Order.findOneAndUpdate(
            { _id: orderId, buyerId: req.user._id },
            {
                escrowStatus: 'disputed',
                'disputeDetails.raisedBy': req.user._id,
                'disputeDetails.reason': reason,
                'disputeDetails.status': 'open'
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or unauthorized'
            });
        }

        res.json({
            success: true,
            message: 'Dispute raised successfully'
        });
    } catch (error) {
        console.error('Error raising dispute:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to raise dispute'
        });
    }
});

module.exports = router; 