const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv');

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
        const { amount } = req.body;
        
        const options = {
            amount: amount, // amount in paise
            currency: 'INR',
            receipt: `order_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
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

// Verify payment
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // Create the signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Verify the signature
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Payment is successful
            // Here you would typically:
            // 1. Update your database with the payment details
            // 2. Create an order record
            // 3. Clear the cart
            // 4. Send confirmation email

            res.json({
                success: true,
                data: {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
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

module.exports = router; 