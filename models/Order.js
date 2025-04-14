const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    amount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    escrowStatus: {
        type: String,
        enum: ['locked', 'released', 'refunded', 'disputed', null],
        default: null
    },
    deliveryStatus: {
        type: String,
        enum: ['not_shipped', 'shipped', 'delivered', 'completed', 'not_applicable'],
        default: 'not_shipped'
    },
    deliveryAddress: {
        name: String,
        phone: String,
        address: String,
        state: String,
        pincode: String,
        country: {
            type: String,
            default: 'India'
        }
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    failureReason: String,
    paymentError: String,
    escrowReleaseDate: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    disputeDetails: {
        raisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        status: {
            type: String,
            enum: ['open', 'resolved', 'cancelled'],
            default: 'open'
        },
        resolution: String,
        raisedAt: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Generate orderId before saving
orderSchema.pre('save', async function(next) {
    if (!this.orderId) {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderId = `ORD${timestamp}${random}`;
    }
    next();
});

// Validate status transitions
orderSchema.pre('save', function(next) {
    // Payment success should lock escrow
    if (this.isModified('paymentStatus') && this.paymentStatus === 'success') {
        this.escrowStatus = 'locked';
    }
    
    // Delivery completion should release escrow
    if (this.isModified('deliveryStatus') && this.deliveryStatus === 'completed') {
        this.escrowStatus = 'released';
    }
    
    // Failed payment should clear escrow
    if (this.isModified('paymentStatus') && this.paymentStatus === 'failed') {
        this.escrowStatus = null;
    }
    
    next();
});

module.exports = mongoose.model('Order', orderSchema);