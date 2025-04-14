const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    productPrice: {
        type: Number,
        required: true,
        min: 0
    },
    productImage: {
        type: String
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    }
}, { timestamps: true });

const cartSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Calculate total amount
cartSchema.virtual('totalAmount').get(function() {
    return this.items.reduce((total, item) => total + (item.productPrice * item.quantity), 0);
});

// Add item to cart
cartSchema.methods.addItem = async function(itemData) {
    try {
        // Validate required fields
        if (!itemData.productId || !itemData.productName || typeof itemData.productPrice !== 'number') {
            throw new Error('Missing required product data');
        }

        // Convert productId to ObjectId
        const productId = new mongoose.Types.ObjectId(itemData.productId);

        // Find existing item
        const existingItemIndex = this.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (existingItemIndex > -1) {
            // Update existing item
            this.items[existingItemIndex].quantity += parseInt(itemData.quantity) || 1;
            this.items[existingItemIndex].productPrice = itemData.productPrice;
            this.items[existingItemIndex].productName = itemData.productName;
            if (itemData.productImage) {
                this.items[existingItemIndex].productImage = itemData.productImage;
            }
        } else {
            // Add new item
            this.items.push({
                productId,
                productName: itemData.productName,
                productPrice: itemData.productPrice,
                productImage: itemData.productImage || '',
                quantity: parseInt(itemData.quantity) || 1
            });
        }

        // Save the cart
        await this.save();
        return true;
    } catch (error) {
        console.error('Error adding item to cart:', error);
        return false;
    }
};

// Update item quantity
cartSchema.methods.updateItemQuantity = async function(itemId, quantity) {
    try {
        const item = this.items.id(itemId);
        if (!item) return false;

        item.quantity = Math.max(1, parseInt(quantity));
        await this.save();
        return true;
    } catch (error) {
        console.error('Error updating item quantity:', error);
        return false;
    }
};

// Remove item from cart
cartSchema.methods.removeItem = async function(itemId) {
    try {
        const item = this.items.id(itemId);
        if (!item) return false;

        this.items.pull(itemId);
        await this.save();
        return true;
    } catch (error) {
        console.error('Error removing item:', error);
        return false;
    }
};

// Clear cart
cartSchema.methods.clear = async function() {
    try {
        this.items = [];
        await this.save();
        return true;
    } catch (error) {
        console.error('Error clearing cart:', error);
        return false;
    }
};

module.exports = mongoose.model('Cart', cartSchema);