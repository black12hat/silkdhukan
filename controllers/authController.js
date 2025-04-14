const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { companyName, email, password, role, businessType, taxId, phone, address } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Validate business type
    const validBusinessTypes = ['manufacturer', 'wholesaler', 'distributor', 'retailer'];
    if (!validBusinessTypes.includes(businessType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid business type. Must be one of: manufacturer, wholesaler, distributor, retailer' 
      });
    }

    // Validate address object
    if (!address || !address.street || !address.city || !address.state || !address.postalCode || !address.country) {
      return res.status(400).json({ 
        success: false, 
        message: 'Complete address information is required' 
      });
    }

    // Create user
    const user = await User.create({
      companyName,
      email,
      password,
      role,
      businessType,
      taxId,
      phone,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country
      }
    });

    if (user) {
      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          companyName: user.companyName,
          email: user.email,
          role: user.role,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Set session
    req.session.userId = user._id;
    req.session.user = user;
    res.locals.user = user;

    // Save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error saving session'
        });
      }

      // Send success response
      res.json({
        success: true,
        user: {
          _id: user._id,
          companyName: user.companyName,
          email: user.email,
          role: user.role,
          token: generateToken(user._id)
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        _id: user._id,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
        businessType: user.businessType,
        taxId: user.taxId,
        address: user.address,
        phone: user.phone,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};