const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const createSeller = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if seller already exists
        const existingSeller = await User.findOne({ role: 'seller' });
        if (existingSeller) {
            console.log('Seller account already exists');
            process.exit(0);
        }

        // Create seller account
        const hashedPassword = await bcrypt.hash('seller123', 10);
        const seller = new User({
            name: 'Silk Seller',
            email: 'seller@example.com',
            password: hashedPassword,
            role: 'seller',
            phone: '1234567890',
            address: '123 Silk Street, Silk City, SC 12345'
        });

        await seller.save();
        console.log('Seller account created successfully');
        console.log('Email: seller@example.com');
        console.log('Password: seller123');

        process.exit(0);
    } catch (error) {
        console.error('Error creating seller account:', error);
        process.exit(1);
    }
};

createSeller(); 