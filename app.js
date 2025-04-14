const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const expressLayout = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const User = require('./models/User');
const messageRoutes = require('./routes/messageRoutes');
const Product = require('./models/Product');
const Order = require('./models/Order');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const cartRoutes = require('./routes/cartRoutes');
const fs = require('fs');
const Cart = require('./models/Cart');
const paymentRoutes = require('./routes/payment');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: true,
    credentials: true
}));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('Session:', req.session?.userId ? 'User logged in' : 'No user session');
    next();
});

app.use(expressLayout);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');

// Add default values for layout variables
app.use((req, res, next) => {
    res.locals.style = '';  // Default empty string for style
    res.locals.script = ''; // Default empty string for script
    next();
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/b2b-escrow',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Make user data available to all templates
app.use(async (req, res, next) => {
    try {
        if (req.session.userId) {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                req.user = user;
                res.locals.user = user;
            } else {
                // Clear invalid session
                req.session.destroy();
                res.locals.user = null;
            }
        } else {
            res.locals.user = null;
        }
        res.locals.path = req.path;
        next();
    } catch (error) {
        console.error('User middleware error:', error);
        res.locals.user = null;
        res.locals.path = req.path;
        next();
    }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the public directory
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payment', paymentRoutes);

// Main Routes
app.use('/seller', sellerRoutes);
app.use('/messages', messageRoutes);

// Public Routes
app.get('/', (req, res) => res.render('home'));
app.get('/login', (req, res) => res.render('auth/login'));
app.get('/register', (req, res) => res.render('auth/register'));
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session error occurred');
            return res.status(500).render('error', { message: 'Error logging out' });
        }
        res.redirect('/');
    });
});

// Product listing route
app.get('/prod', async (req, res) => {
    try {
        console.log('Accessing product list route');
        const products = await Product.find({}).populate('seller', 'name');
        res.render('prod', { 
            products,
            path: 'prod',
            user: req.session.user,
            title: 'Products - SilkDhukan'
        });
    } catch (error) {
        console.error('Database error occurred:', error);
        res.status(500).render('error', { 
            message: 'Error loading products',
            path: 'prod',
            title: 'Error'
        });
    }
});

// Add route for viewing individual product
app.get('/prod/:id', async (req, res) => {
    try {
        console.log('=== Product View Request ===');
        console.log('Product ID:', req.params.id);
        
        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.log('Error: Invalid MongoDB ObjectId format');
            return res.status(404).render('error', {
                message: 'Invalid product ID format',
                error: { status: 404 },
                user: req.session?.user
            });
        }

        // Try to find the product
        const product = await Product.findById(req.params.id)
            .populate('seller', 'companyName email');

        console.log('Product found:', product ? 'Yes' : 'No');
        if (product) {
            console.log('Product details:', {
                name: product.name,
                seller: product.seller?.companyName,
                hasImages: product.images?.length > 0
            });
        }

        if (!product) {
            console.log('Error: Product not found in database');
            return res.status(404).render('error', {
                message: 'Product not found',
                error: { status: 404 },
                user: req.session?.user
            });
        }

        // Get user information if logged in
        const user = req.session.userId ? await User.findById(req.session.userId).select('-password') : null;
        console.log('User context:', user ? `User found (${user.role})` : 'No user in session');

        // Check if view-product.ejs exists
        const viewPath = path.join(__dirname, 'views', 'products', 'view-product.ejs');
        if (!fs.existsSync(viewPath)) {
            console.error('Error: view-product.ejs template not found at:', viewPath);
            throw new Error('Product view template not found');
        }

        console.log('Rendering product view template...');
        res.render('products/view-product', {
            title: product.name,
            product,
            user,
            path: '/prod'
        });
        console.log('Template rendered successfully');

    } catch (error) {
        console.error('Product view error:', error);
        res.status(500).render('error', {
            message: 'Error loading product',
            error: { 
                status: 500, 
                stack: process.env.NODE_ENV === 'development' ? error.stack : '',
                details: error.message
            },
            user: req.session?.user
        });
    }
});

// Cart page route
app.get('/cart', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.userId) {
            return res.redirect('/login?redirect=/cart');
        }

        // Get fresh user data from database
        const user = await User.findById(req.session.userId);
        if (!user) {
            // If user not found, clear session and redirect
            req.session.destroy();
            return res.redirect('/login?redirect=/cart');
        }

        // Get cart data
        const cart = await Cart.findOne({ buyer: req.session.userId });
        
        res.render('cart', {
            title: 'Shopping Cart',
            style: 'cart.css',
            script: 'cart.js',
            user: user,
            cart: cart || { items: [], totalAmount: 0 }
        });
    } catch (error) {
        console.error('Cart page error:', error);
        res.status(500).render('error', { 
            message: 'Error loading cart page'
        });
    }
});

// Cart routes
app.get('/cart', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.userId) {
            return res.redirect('/login?redirect=/cart');
        }

        // Get fresh user data from database
        const user = await User.findById(req.session.userId);
        if (!user) {
            // If user not found, clear session and redirect
            req.session.destroy();
            return res.redirect('/login?redirect=/cart');
        }

        // Check if user is a buyer
        if (user.role !== 'buyer') {
            return res.redirect('/');
        }

        // Render cart page with user data
        res.render('cart', {
            path: '/cart',
            user: user,
            title: 'Shopping Cart'
        });
    } catch (error) {
        console.error('Cart page error:', error);
        res.status(500).render('error', {
            message: 'Error loading cart page',
            path: '/cart',
            title: 'Error - Shopping Cart',
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Checkout route
app.get('/checkout', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.userId) {
            return res.redirect('/login?redirect=/checkout');
        }

        // Get fresh user data from database
        const user = await User.findById(req.session.userId);
        if (!user) {
            // If user not found, clear session and redirect
            req.session.destroy();
            return res.redirect('/login?redirect=/checkout');
        }

        // Check if user is a buyer
        if (user.role !== 'buyer') {
            return res.redirect('/');
        }

        // Get cart data
        const cart = await Cart.findOne({ buyer: req.session.userId })
            .populate('items.productId', 'name price images');
        
        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        res.render('checkout', {
            title: 'Checkout',
            style: 'checkout.css',
            script: 'checkout.js',
            user: user,
            cart: cart
        });
    } catch (error) {
        console.error('Checkout page error:', error);
        res.status(500).render('error', { 
            message: 'Error loading checkout page'
        });
    }
});

// Orders route
app.get('/orders', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.userId) {
            return res.redirect('/login?redirect=/orders');
        }

        // Get fresh user data from database
        const user = await User.findById(req.session.userId);
        if (!user) {
            // If user not found, clear session and redirect
            req.session.destroy();
            return res.redirect('/login?redirect=/orders');
        }

        // Check if user is a buyer
        if (user.role !== 'buyer') {
            return res.redirect('/');
        }

        // Render orders page with user data
        res.render('orders', {
            path: '/orders',
            user: user,
            title: 'My Orders'
        });
    } catch (error) {
        console.error('Orders page error:', error);
        res.status(500).render('error', {
            message: 'Error loading orders page',
            path: '/orders',
            title: 'Error - My Orders',
            user: req.session.userId ? await User.findById(req.session.userId) : null
        });
    }
});

// Profile routes
app.get('/profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/login?redirect=/profile');
        }

        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            req.session.destroy();
            return res.redirect('/login?redirect=/profile');
        }

        // Get additional data based on user role
        let additionalData = {};
        if (user.role === 'buyer') {
            const cart = await Cart.findOne({ buyer: user._id });
            const orders = await Order.find({ buyer: user._id })
                .populate('items.productId', 'name price images')
                .sort({ createdAt: -1 })
                .limit(5);
            additionalData = { cart, orders };
        } else if (user.role === 'seller') {
            const products = await Product.find({ seller: user._id })
                .sort({ createdAt: -1 })
                .limit(5);
            const orders = await Order.find({ 'items.seller': user._id })
                .populate('buyer', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(5);
            additionalData = { products, orders };
        }

        res.render('profile', {
            title: 'My Profile',
            style: 'profile.css',
            script: 'profile.js',
            user,
            ...additionalData
        });
    } catch (error) {
        console.error('Profile page error:', error);
        res.status(500).render('error', { 
            message: 'Error loading profile page'
        });
    }
});

// Settings routes
app.get('/settings', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/login?redirect=/settings');
        }

        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            req.session.destroy();
            return res.redirect('/login?redirect=/settings');
        }

        res.render('settings', {
            title: 'Settings',
            style: 'settings.css',
            script: 'settings.js',
            user
        });
    } catch (error) {
        console.error('Settings page error:', error);
        res.status(500).render('error', { 
            message: 'Error loading settings page'
        });
    }
});

// Error handlers - MOVED AFTER THE PRODUCT ROUTES
app.use(async (req, res) => {
    console.log('404 Not Found:', req.path);
    res.status(404).render('error', { 
        message: 'Page not found',
        path: req.path,
        title: '404 - Page Not Found',
        user: req.session?.userId ? await User.findById(req.session.userId) : null
    });
});

app.use(async (err, req, res, next) => {
    console.error('Server error occurred');
    res.status(500).render('error', { 
        message: 'Server error',
        path: req.path,
        title: '500 - Server Error',
        user: req.session?.userId ? await User.findById(req.session.userId) : null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
