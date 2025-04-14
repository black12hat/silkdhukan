const express = require('express');
const { 
    getCart, 
    addToCart, 
    updateCartItem, 
    removeFromCart, 
    clearCart,
    getCartCount 
} = require('../controllers/cartController');
const { protect, isBuyer } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and buyer role
router.use(protect);
router.use(isBuyer);

router.get('/', getCart);
router.get('/count', getCartCount);
router.post('/', addToCart);
router.put('/:itemId', updateCartItem);
router.delete('/:itemId', removeFromCart);
router.delete('/', clearCart);

module.exports = router; 