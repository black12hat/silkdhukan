const User = require('../models/User');

// Protect routes - check if user is authenticated
exports.protect = async (req, res, next) => {
    try {
        // Check if session exists
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to access this resource'
            });
        }

        // Check if user exists
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Check if user is a buyer
exports.isBuyer = (req, res, next) => {
    if (req.user && req.user.role === 'buyer') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Only buyers can access this resource'
        });
    }
};

// Check if user is a seller
exports.isSeller = (req, res, next) => {
    if (req.user && req.user.role === 'seller') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Only sellers can access this resource'
        });
    }
};

// Check if user is an admin
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Only admins can access this resource'
        });
    }
};
