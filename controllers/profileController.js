const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/profiles');
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

// Get profile data
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const {
            companyName,
            email,
            phone,
            address,
            businessType,
            taxId
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
        }

        // Update fields
        if (companyName) user.companyName = companyName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (businessType) user.businessType = businessType;
        if (taxId) user.taxId = taxId;

        await user.save();
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update profile picture
exports.updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a file' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update profile picture path
        user.profilePicture = `/uploads/profiles/${req.file.filename}`;
        await user.save();

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}; 