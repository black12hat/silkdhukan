const Product = require('../models/Product');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
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

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Seller
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock, images } = req.body;
        const seller = req.session.userId;

        const product = await Product.create({
            name,
            description,
            price,
            category,
            stock,
            images,
            seller,
            status: 'active'
        });

        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product'
        });
    }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private/Seller
exports.getProducts = async (req, res) => {
    try {
        const user = req.session.userId ? await User.findById(req.session.userId).select('-password') : null;

        let products;
        if (user && user.role === 'seller') {
            // Sellers see only their products
            products = await Product.find({ seller: user._id })
                .sort({ createdAt: -1 });
                
            res.render('seller/products', {
                title: 'My Products',
                products,
                user
            });
        } else {
            // Buyers see all products with seller info
            products = await Product.find({ status: 'active' })
                .populate('seller', 'companyName')
                .sort({ createdAt: -1 });
                
            res.render('products/list', {
                title: 'Products',
                products,
                user
            });
        }
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).render('error', {
            message: 'Error loading products',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id)
            .populate('seller', 'companyName');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting product'
        });
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Seller
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            price,
            category,
            stock,
            minOrderQuantity,
            specifications,
            shippingInfo,
            existingImages
        } = req.body;

        // Parse JSON strings back to objects
        const parsedSpecs = JSON.parse(specifications || '{}');
        const parsedShipping = JSON.parse(shippingInfo || '{}');
        const parsedExistingImages = JSON.parse(existingImages || '[]');

        // Handle new uploaded images
        const newImages = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];
        
        // Combine existing and new images
        const images = [...parsedExistingImages, ...newImages];

        const product = await Product.findOneAndUpdate(
            { _id: id, seller: req.session.userId },
            {
                name,
                description,
                price,
                category,
                stock,
                minOrderQuantity,
                specifications: parsedSpecs,
                shippingInfo: parsedShipping,
                images
            },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product'
        });
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Seller
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the product first to get image paths
        const product = await Product.findOne({
            _id: id,
            seller: req.session.userId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete product images from storage
        if (product.images && product.images.length > 0) {
            for (const imageUrl of product.images) {
                const imagePath = path.join(__dirname, '..', 'public', imageUrl);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        }

        // Delete the product from database
        await Product.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product'
        });
    }
};

// Add new product
exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      specifications
    } = req.body;

    const product = new Product({
      name,
      description,
      price,
      category,
      stock,
      specifications,
      seller: req.user.id
    });

    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get product edit page
// @route   GET /seller/products/:id/edit
// @access  Private/Seller
exports.getEditProduct = async (req, res) => {
    try {
        // First get the user
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.redirect('/login');
        }

        // Then get the product
        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.session.userId
        });

        if (!product) {
            return res.status(404).render('error', {
                message: 'Product not found',
                error: { status: 404 }
            });
        }

        // Render the edit page with both user and product data
        res.render('seller/edit-product', {
            title: 'Edit Product',
            product,
            user
        });
    } catch (error) {
        console.error('Get edit product error:', error);
        res.status(500).render('error', {
            message: 'Error loading product',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

// @desc    View product details (public)
// @route   GET /products/view/:id
// @access  Public
exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('seller', 'companyName email');

        if (!product) {
            return res.status(404).render('error', {
                message: 'Product not found',
                error: { status: 404 }
            });
        }

        const user = req.session.userId ? await User.findById(req.session.userId).select('-password') : null;

        res.render('products/view-product', {
            title: product.name,
            product,
            user
        });
    } catch (error) {
        console.error('View product error:', error);
        res.status(500).render('error', {
            message: 'Error loading product',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};