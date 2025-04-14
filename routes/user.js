const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Update user profile
router.put('/profile', isAuthenticated, async (req, res) => {
    try {
        const { firstName, lastName, email, phone } = req.body;

        // Validate input
        if (!firstName || !lastName || !email) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, and email are required'
            });
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({
            email: email,
            _id: { $ne: req.user._id }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email is already taken'
            });
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                firstName,
                lastName,
                email,
                phone
            },
            { new: true, select: '-password' }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Update password
router.put('/password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required'
            });
        }

        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        // Check password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await User.findByIdAndUpdate(
            req.user._id,
            { password: hashedPassword }
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password'
        });
    }
});

// Get user profile
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

module.exports = router; 