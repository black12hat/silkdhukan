const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Message = require('../models/Message');
const Review = require('../models/Review');
const path = require('path');
const fs = require('fs');

exports.getDashboard = async (req, res) => {
    try {
        const sellerId = req.session.userId;

        // Get seller's products
        const products = await Product.find({ seller: sellerId });
        
        // Get seller's orders
        const orders = await Order.find({ 'items.seller': sellerId })
            .populate('buyer', 'name email')
            .sort('-createdAt');

        // Calculate dashboard stats
        const stats = {
            totalProducts: products.length,
            totalOrders: orders.length,
            totalRevenue: orders.reduce((total, order) => {
                const sellerItems = order.items.filter(item => item.seller.toString() === sellerId);
                return total + sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }, 0),
            pendingOrders: orders.filter(order => order.status === 'pending').length
        };

        res.render('seller/dashboard', {
            title: 'Seller Dashboard',
            products,
            orders,
            stats
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', {
            message: 'Error loading dashboard'
        });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find({ seller: req.session.userId });
        res.render('seller/products', {
            title: 'My Products',
            products
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).render('error', {
            message: 'Error loading products'
        });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ 'items.seller': req.session.userId })
            .populate('buyer', 'name email')
            .sort('-createdAt');

        res.render('seller/orders', {
            title: 'My Orders',
            orders
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).render('error', {
            message: 'Error loading orders'
        });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Order.find({
            seller: req.session.userId,
            status: 'completed'
        })
        .sort({ createdAt: -1 })
        .populate('buyer', 'companyName')
        .populate('product', 'name');

        res.render('seller/transactions', {
            layout: 'seller',
            transactions,
            title: 'Transactions'
        });
    } catch (error) {
        console.error('Get seller transactions error:', error);
        res.status(500).render('error', {
            layout: 'seller',
            message: 'Error loading transactions',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        // Get monthly sales data for the past 12 months
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    seller: req.session.userId,
                    status: 'completed',
                    createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Get product performance data
        const productPerformance = await Order.aggregate([
            {
                $match: {
                    seller: req.session.userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$product',
                    totalSales: { $sum: '$amount' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        res.render('seller/analytics', {
            layout: 'seller',
            monthlySales,
            productPerformance,
            title: 'Analytics'
        });
    } catch (error) {
        console.error('Get seller analytics error:', error);
        res.status(500).render('error', {
            layout: 'seller',
            message: 'Error loading analytics',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const seller = await User.findById(req.session.userId).select('-password');
        
        res.render('seller/settings', {
            layout: 'seller',
            seller,
            title: 'Settings'
        });
    } catch (error) {
        console.error('Get seller settings error:', error);
        res.status(500).render('error', {
            layout: 'seller',
            message: 'Error loading settings',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.session.userId },
                { recipient: req.session.userId }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'companyName')
        .populate('recipient', 'companyName');

        // Mark messages as read
        await Message.updateMany(
            { recipient: req.session.userId, read: false },
            { $set: { read: true } }
        );

        res.render('seller/messages', {
            layout: 'seller',
            messages,
            currentUserId: req.session.userId,
            title: 'Messages'
        });
    } catch (error) {
        console.error('Get seller messages error:', error);
        res.status(500).render('error', {
            layout: 'seller',
            message: 'Error loading messages',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ seller: req.session.userId })
            .sort({ createdAt: -1 })
            .populate('buyer', 'companyName')
            .populate('product', 'name');

        // Calculate average rating
        const averageRating = reviews.length > 0
            ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
            : 0;

        res.render('seller/reviews', {
            layout: 'seller',
            reviews,
            averageRating,
            title: 'Reviews'
        });
    } catch (error) {
        console.error('Get seller reviews error:', error);
        res.status(500).render('error', {
            layout: 'seller',
            message: 'Error loading reviews',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

exports.getEscrowServices = async (req, res) => {
    try {
        const escrowTransactions = await Order.find({
            seller: req.session.userId,
            escrowEnabled: true
        })
        .sort({ createdAt: -1 })
        .populate('buyer', 'companyName')
        .populate('product', 'name');

        const stats = {
            totalEscrowTransactions: escrowTransactions.length,
            totalEscrowValue: escrowTransactions.reduce((acc, order) => acc + order.amount, 0),
            pendingEscrow: escrowTransactions.filter(order => order.status === 'pending').length
        };

        res.render('seller/escrow', {
            layout: 'seller',
            escrowTransactions,
            stats,
            title: 'Escrow Services'
        });
    } catch (error) {
        console.error('Get seller escrow services error:', error);
        res.status(500).render('error', {
            layout: 'seller',
            message: 'Error loading escrow services',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const seller = await User.findById(req.session.userId).select('-password');
        res.render('seller/profile', {
            title: 'Seller Profile',
            seller
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).render('error', {
            message: 'Error loading profile'
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        
        const seller = await User.findByIdAndUpdate(
            req.session.userId,
            { name, email, phone, address },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: seller
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
};

exports.updateProfilePicture = async (req, res) => {
    try {
        if (!req.files || !req.files.profilePicture) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }

        const file = req.files.profilePicture;
        
        // Make sure the image is a photo
        if (!file.mimetype.startsWith('image')) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image file'
            });
        }

        // Create custom filename
        const fileName = `photo_${req.session.userId}${path.parse(file.name).ext}`;

        // Move file to upload path
        await file.mv(`./public/uploads/${fileName}`);

        // Update database
        const seller = await User.findByIdAndUpdate(
            req.session.userId,
            {
                profilePicture: `/uploads/${fileName}`
            },
            { new: true }
        ).select('-password');

        // Update session data
        req.session.userData = {
            ...req.session.userData,
            profilePicture: `/uploads/${fileName}`
        };

        res.json({
            success: true,
            data: {
                profilePicture: `/uploads/${fileName}`
            }
        });
    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading profile picture'
        });
    }
};

// @desc    Get new product form
// @route   GET /seller/products/new
// @access  Private (Seller only)
exports.getNewProductForm = (req, res) => {
    res.render('seller/product-form', {
        title: 'Add New Product',
        product: null
    });
};

// @desc    Create new product
// @route   POST /seller/products
// @access  Private (Seller only)
exports.createProduct = async (req, res) => {
    try {
        const { 
            name, 
            description, 
            price, 
            category, 
            stock,
            minOrderQuantity,
            specifications,
            shippingInfo
        } = req.body;

        // Handle image uploads
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => {
                // Get the filename only
                const filename = path.basename(file.path);
                // Create the correct URL path
                return `/uploads/products/${filename}`;
            });
        }

        // Parse specifications if it's a string
        const parsedSpecifications = typeof specifications === 'string' 
            ? JSON.parse(specifications) 
            : specifications;

        // Parse shippingInfo if it's a string
        const parsedShippingInfo = typeof shippingInfo === 'string' 
            ? JSON.parse(shippingInfo) 
            : shippingInfo;

        // Create product with explicit type conversion
        const product = await Product.create({
            name,
            description,
            price: Number(price),
            category,
            stock: Number(stock),
            minOrderQuantity: Number(minOrderQuantity),
            images,
            specifications: parsedSpecifications,
            shippingInfo: parsedShippingInfo,
            seller: req.session.userId
        });

        // Log the created product for debugging
        console.log('Created product with images:', product.images);

        res.redirect('/seller/products');
    } catch (error) {
        console.error('Create product error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).render('error', {
            message: 'Error creating product'
        });
    }
};

// @desc    Get edit product form
// @route   GET /seller/products/edit/:id
// @access  Private (Seller only)
exports.getEditProductForm = async (req, res) => {
    try {
        // Get both user and product data
        const user = await User.findById(req.session.userId).select('-password');
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

        // Render the edit product page with both user and product data
        res.render('seller/edit-product', {
            title: 'Edit Product',
            product,
            user
        });
    } catch (error) {
        console.error('Get edit form error:', error);
        res.status(500).render('error', {
            message: 'Error loading product form',
            error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
        });
    }
};

// @desc    Update product
// @route   PUT /seller/products/:id
// @access  Private (Seller only)
exports.updateProduct = async (req, res) => {
    try {
        console.log('Update product request received:', {
            body: req.body,
            files: req.files,
            params: req.params
        });

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

        // Parse JSON strings
        const parsedSpecifications = JSON.parse(specifications || '{}');
        const parsedShippingInfo = JSON.parse(shippingInfo || '{}');
        const parsedExistingImages = JSON.parse(existingImages || '[]');

        // Handle new uploaded images
        let images = parsedExistingImages;
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => {
                // Get the filename only
                const filename = path.basename(file.path);
                // Create the correct URL path
                return `/uploads/products/${filename}`;
            });
            images = [...images, ...newImages];
        }

        console.log('Updating product with data:', {
            id: req.params.id,
            sellerId: req.session.userId,
            images,
            specifications: parsedSpecifications,
            shippingInfo: parsedShippingInfo
        });

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, seller: req.session.userId },
            {
                name,
                description,
                price: Number(price),
                category,
                stock: Number(stock),
                minOrderQuantity: Number(minOrderQuantity),
                images,
                specifications: parsedSpecifications,
                shippingInfo: parsedShippingInfo
            },
            { new: true }
        );

        if (!product) {
            console.log('Product not found or unauthorized');
            return res.status(404).json({
                success: false,
                message: 'Product not found or you are not authorized to update it'
            });
        }

        console.log('Product updated successfully:', product);
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating product'
        });
    }
};

// @desc    Delete product
// @route   DELETE /seller/products/:id
// @access  Private (Seller only)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            seller: req.session.userId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete product images from the uploads folder
        if (product.images && product.images.length > 0) {
            product.images.forEach(imagePath => {
                const fullPath = path.join(__dirname, '..', 'public', imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            });
        }

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

// @desc    Get order details
// @route   GET /seller/orders/:id
// @access  Private (Seller only)
exports.getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            'items.seller': req.session.userId
        }).populate('buyer', 'name email');

        if (!order) {
            return res.status(404).render('error', {
                message: 'Order not found'
            });
        }

        res.render('seller/order-details', {
            title: 'Order Details',
            order
        });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).render('error', {
            message: 'Error loading order details'
        });
    }
};

// @desc    Update order status
// @route   PUT /seller/orders/:id/status
// @access  Private (Seller only)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOne({
            _id: req.params.id,
            'items.seller': req.session.userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update status for seller's items only
        order.items.forEach(item => {
            if (item.seller.toString() === req.session.userId) {
                item.status = status;
            }
        });

        await order.save();

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status'
        });
    }
};

exports.markMessageAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const message = await Message.findOneAndUpdate(
            { _id: id, recipient: req.session.userId },
            { read: true },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking message as read'
        });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const seller = await User.findByIdAndUpdate(
            req.session.userId,
            { $set: req.body },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            seller
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings'
        });
    }
};

exports.releaseEscrow = async (req, res) => {
    try {
        const { id } = req.params;

        const escrow = await Order.findOneAndUpdate(
            { _id: id, seller: req.session.userId, status: 'escrow' },
            { status: 'completed' },
            { new: true }
        );

        if (!escrow) {
            return res.status(404).json({
                success: false,
                message: 'Escrow not found or cannot be released'
            });
        }

        res.json({
            success: true,
            escrow
        });
    } catch (error) {
        console.error('Release escrow error:', error);
        res.status(500).json({
            success: false,
            message: 'Error releasing escrow'
        });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        
        if (!recipientId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Recipient ID and content are required'
            });
        }

        const message = new Message({
            sender: req.session.userId,
            recipient: recipientId,
            content,
            read: false
        });

        await message.save();

        // Populate sender and recipient details
        await message.populate([
            { path: 'sender', select: 'companyName' },
            { path: 'recipient', select: 'companyName' }
        ]);

        res.json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message'
        });
    }
};

exports.getSalesAnalytics = async (req, res) => {
    try {
        // Get daily sales for the last 30 days
        const dailySales = await Order.aggregate([
            {
                $match: {
                    seller: req.session.userId,
                    status: 'completed',
                    createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get monthly sales for the last 12 months
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    seller: req.session.userId,
                    status: 'completed',
                    createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Get total sales statistics
        const totalStats = await Order.aggregate([
            {
                $match: {
                    seller: req.session.userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$amount' },
                    totalOrders: { $sum: 1 },
                    averageOrderValue: { $avg: '$amount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                dailySales,
                monthlySales,
                totalStats: totalStats[0] || { totalSales: 0, totalOrders: 0, averageOrderValue: 0 }
            }
        });
    } catch (error) {
        console.error('Get sales analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sales analytics'
        });
    }
};

exports.getProductAnalytics = async (req, res) => {
    try {
        // Get top selling products
        const topProducts = await Order.aggregate([
            {
                $match: {
                    seller: req.session.userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$product',
                    totalSales: { $sum: '$amount' },
                    orderCount: { $sum: 1 },
                    averagePrice: { $avg: '$amount' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        // Get product performance by category
        const categoryPerformance = await Order.aggregate([
            {
                $match: {
                    seller: req.session.userId,
                    status: 'completed'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.category',
                    totalSales: { $sum: '$amount' },
                    orderCount: { $sum: 1 },
                    averagePrice: { $avg: '$amount' }
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        // Get inventory status
        const inventoryStatus = await Product.aggregate([
            {
                $match: {
                    seller: req.session.userId
                }
            },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    lowStock: {
                        $sum: {
                            $cond: [{ $lte: ['$stock', 10] }, 1, 0]
                        }
                    },
                    outOfStock: {
                        $sum: {
                            $cond: [{ $eq: ['$stock', 0] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                topProducts,
                categoryPerformance,
                inventoryStatus: inventoryStatus[0] || { totalProducts: 0, lowStock: 0, outOfStock: 0 }
            }
        });
    } catch (error) {
        console.error('Get product analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product analytics'
        });
    }
};