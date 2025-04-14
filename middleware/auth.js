const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Check if user is authenticated
exports.isAuthenticated = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            if (req.xhr) {
                return res.status(401).json({
                    success: false,
                    message: 'Please log in to access this route'
                });
            }
            return res.redirect('/login');
        }

        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            req.session.destroy();
            if (req.xhr) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }
            return res.redirect('/login');
        }

        req.user = user;
        req.session.user = user;
        res.locals.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (req.xhr) {
            return res.status(401).json({
                success: false,
                message: 'Server Error'
            });
        }
        res.redirect('/login');
    }
};

// Check if user is a seller
exports.isSeller = (req, res, next) => {
    if (!req.user || req.user.role !== 'seller') {
        if (req.xhr) {
            return res.status(403).json({
                success: false,
                message: 'Only sellers can access this route'
            });
        }
        return res.redirect('/');
    }
    next();
};

// Check if user is a buyer
exports.isBuyer = (req, res, next) => {
    if (!req.user || req.user.role !== 'buyer') {
        if (req.xhr) {
            return res.status(403).json({
                success: false,
                message: 'Only buyers can access this route'
            });
        }
        return res.redirect('/');
    }
    next();
};

// Protect routes
exports.protect = async (req, res, next) => {
    try {
        // Check if user is logged in via session
        if (!req.session.userId) {
            if (req.xhr) {
                return res.status(401).json({
                    success: false,
                    message: 'Please log in to access this route'
                });
            }
            return res.redirect('/login');
        }

        // Get user from database
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            req.session.destroy();
            if (req.xhr) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }
            return res.redirect('/login');
        }

        // Add user to request object
        req.user = user;
        res.locals.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (req.xhr) {
            return res.status(500).json({
                success: false,
                message: 'Server Error'
            });
        }
        res.redirect('/login');
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            if (req.xhr) {
                return res.status(403).json({
                    success: false,
                    message: `User role ${req.user ? req.user.role : 'undefined'} is not authorized to access this route`
                });
            }
            return res.redirect('/');
        }
        next();
    };
};