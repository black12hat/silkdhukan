const cron = require('node-cron');
const Order = require('../models/Order');

// Schedule job to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const now = new Date();
        
        // Find orders that need auto-release
        const ordersToRelease = await Order.find({
            escrowStatus: 'locked',
            escrowReleaseDate: { $lte: now },
            orderStatus: 'pending',
            paymentStatus: 'escrowed'
        });

        for (const order of ordersToRelease) {
            // Update order status to completed and release escrow
            await Order.findByIdAndUpdate(order._id, {
                orderStatus: 'completed',
                paymentStatus: 'paid',
                escrowStatus: 'released'
            });

            // Here you would typically:
            // 1. Send notification to seller about auto-release
            // 2. Send notification to buyer about auto-release
            // 3. Log the auto-release event
        }

        console.log(`Auto-released ${ordersToRelease.length} escrow orders`);
    } catch (error) {
        console.error('Error in escrow auto-release cron job:', error);
    }
}); 