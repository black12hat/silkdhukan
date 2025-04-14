const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
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

// Public routes
router.get('/', productController.getProducts);
router.get('/view/:id', productController.viewProduct);

// Protected routes (seller only)
router.use(isAuthenticated);
router.use(isSeller);

router.get('/edit/:id', productController.getEditProduct);
router.post('/', upload.array('images', 5), productController.createProduct);
router.put('/:id', upload.array('images', 5), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;