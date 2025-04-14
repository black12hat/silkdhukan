const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { isAuthenticated, isSeller } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for product image uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/products');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Protect all seller routes
router.use(isAuthenticated);
router.use(isSeller);

// Dashboard
router.get('/dashboard', sellerController.getDashboard);

// Products routes
router.get('/products', sellerController.getProducts);
router.get('/products/edit/:id', sellerController.getEditProductForm);
router.post('/products', upload.array('images', 5), sellerController.createProduct);
router.put('/products/:id', upload.array('images', 5), sellerController.updateProduct);
router.delete('/products/:id', sellerController.deleteProduct);

// Order routes
router.get('/orders', sellerController.getOrders);
router.get('/orders/:id', sellerController.getOrderDetails);
router.put('/orders/:id/status', sellerController.updateOrderStatus);

// Profile routes
router.get('/profile', sellerController.getProfile);
router.put('/profile', sellerController.updateProfile);

// Transactions
router.get('/transactions', sellerController.getTransactions);

// Messages
router.get('/messages', sellerController.getMessages);
router.post('/messages', sellerController.sendMessage);
router.put('/messages/:id/read', sellerController.markMessageAsRead);

// Analytics
router.get('/analytics', sellerController.getAnalytics);
// router.get('/analytics/sales', sellerController.getSalesAnalytics);
// router.get('/analytics/products', sellerController.getProductAnalytics);

// Settings
router.get('/settings', sellerController.getSettings);
router.put('/settings', sellerController.updateSettings);

// Profile
router.get('/profile', sellerController.getProfile);
router.put('/profile', sellerController.updateProfile);
router.post('/profile/picture', upload.single('profilePicture'), sellerController.updateProfilePicture);

// Reviews
router.get('/reviews', sellerController.getReviews);
// router.post('/reviews/:id/reply', sellerController.replyToReview);

// // Escrow Services
// router.get('/escrow', sellerController.getEscrowServices);
// router.put('/escrow/:id/release', sellerController.releaseEscrow);

module.exports = router; 