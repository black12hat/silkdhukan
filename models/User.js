const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Please add a company name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['buyer', 'seller', 'admin'],
        default: 'buyer'
    },
    businessType: {
        type: String,
        enum: ['manufacturer', 'wholesaler', 'distributor', 'retailer'],
        required: [true, 'Please specify business type']
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number']
    },
    address: {
        street: {
            type: String,
            required: [true, 'Please add a street address']
        },
        city: {
            type: String,
            required: [true, 'Please add a city']
        },
        state: {
            type: String,
            required: [true, 'Please add a state']
        },
        postalCode: {
            type: String,
            required: [true, 'Please add a postal code']
        },
        country: {
            type: String,
            required: [true, 'Please add a country']
        }
    },
    taxId: {
        type: String,
        required: [true, 'Please add a tax ID']
    },
    profilePicture: {
        type: String,
        default: '/images/default-profile.png'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    settings: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: true
        },
        orderUpdates: {
            type: Boolean,
            default: true
        },
        marketingEmails: {
            type: Boolean,
            default: false
        },
        profileVisibility: {
            type: Boolean,
            default: true
        },
        showContactInfo: {
            type: Boolean,
            default: false
        }
    },
    paymentSettings: {
        bankName: String,
        accountNumber: String,
        ifscCode: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);