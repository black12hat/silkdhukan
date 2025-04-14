const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    if (!id) return false;
    try {
        return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id);
    } catch (error) {
        return false;
    }
};

// @desc    Get buyer's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to access your cart'
            });
        }

        let cart = await Cart.findOne({ buyer: req.session.userId })
            .populate('items.productId', 'name price images');
        
        // If no cart exists, create one
        if (!cart) {
            cart = new Cart({
                buyer: req.session.userId,
                items: []
            });
            await cart.save();
        }

        // Format cart items with product details
        const formattedItems = cart.items.map(item => ({
            _id: item._id,
            productId: item.productId._id,
            productName: item.productName,
            productPrice: item.productPrice,
            productImage: item.productImage,
            quantity: item.quantity
        }));

        res.json({
            success: true,
            data: {
                items: formattedItems,
                totalAmount: cart.totalAmount
            }
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving cart'
        });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to add items to cart'
            });
        }

        const { productId, productName, productPrice, productImage, quantity = 1 } = req.body;

        // Validate product data
        if (!productId || !productName || typeof productPrice !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Invalid product data'
            });
        }

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({ buyer: req.session.userId });
        if (!cart) {
            cart = new Cart({
                buyer: req.session.userId,
                items: []
            });
        }

        // Add item to cart
        const success = await cart.addItem({
            productId,
            productName,
            productPrice,
            productImage,
            quantity: parseInt(quantity)
        });

        if (!success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to add item to cart'
            });
        }

        // Get updated cart count
        const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);

        res.json({
            success: true,
            data: {
                items: cart.items,
                totalAmount: cart.totalAmount,
                cartCount
            },
            message: 'Product added to cart successfully'
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error adding product to cart'
        });
    }
};

// @desc    Get cart count
// @route   GET /api/cart/count
// @access  Public
exports.getCartCount = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.json({ count: 0 });
        }

        const cart = await Cart.findOne({ buyer: req.session.userId });
        const count = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;

        res.json({ count });
    } catch (error) {
        console.error('Get cart count error:', error);
        res.json({ count: 0 });
    }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
exports.updateCartItem = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to update cart'
            });
        }

        const { itemId } = req.params;
        const { quantity } = req.body;

        if (!itemId || !quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity'
            });
        }

        const cart = await Cart.findOne({ buyer: req.session.userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const success = await cart.updateItemQuantity(itemId, parseInt(quantity));
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        res.json({
            success: true,
            data: {
                items: cart.items,
                totalAmount: cart.totalAmount
            }
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating cart'
        });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
exports.removeFromCart = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to remove items'
            });
        }

        const { itemId } = req.params;
        const cart = await Cart.findOne({ buyer: req.session.userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const success = await cart.removeItem(itemId);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        res.json({
            success: true,
            data: {
                items: cart.items,
                totalAmount: cart.totalAmount
            }
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing item from cart'
        });
    }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to clear cart'
            });
        }

        const cart = await Cart.findOne({ buyer: req.session.userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const success = await cart.clear();
        if (!success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to clear cart'
            });
        }

        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing cart'
        });
    }
};