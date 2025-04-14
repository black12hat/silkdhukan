const mongoose = require('mongoose');
const Cart = require('../models/Cart');

async function cleanupCarts() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/b2b-escrow-ecommerce');
        console.log('Connected to MongoDB');

        // Find all carts
        const carts = await Cart.find({});
        console.log(`Found ${carts.length} carts to process`);

        let fixedCarts = 0;
        let removedItems = 0;

        // Process each cart
        for (const cart of carts) {
            const originalItemCount = cart.items.length;
            
            // Filter out invalid items
            cart.items = cart.items.filter(item => {
                // Check if item has all required fields
                return item && 
                       item.productId && 
                       mongoose.Types.ObjectId.isValid(item.productId) &&
                       item.productName &&
                       typeof item.productPrice === 'number' &&
                       item.quantity >= 1;
            });

            if (cart.items.length !== originalItemCount) {
                removedItems += (originalItemCount - cart.items.length);
                await cart.save();
                fixedCarts++;
            }
        }

        console.log(`\nCleanup complete:`);
        console.log(`- Fixed ${fixedCarts} carts`);
        console.log(`- Removed ${removedItems} invalid items`);

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the cleanup
cleanupCarts(); 