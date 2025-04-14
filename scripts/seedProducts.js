const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
require('dotenv').config();

const sampleProducts = [
    {
        name: "Kanchipuram Silks",
        price: 1699.99,
        description: "Kanchipuram silk is a luxurious, heavyweight silk fabric known for its intricate patterns, designs, and vibrant colors.",
        images: ["https://anyaonline.in/cdn/shop/collections/2_540x_540x_a0c59dae-31ec-41a2-a36d-fdfdcd738e09.jpg?v=1698576136/300x200"],
        category: "Kanchipuram Silks",
        minOrderQuantity: 1,
        stock: 25,
        specifications: {
            material: "Pure Kanchipuram Silk",
            color: "Multiple",
            weight: "800g",
            length: "6.3m"
        },
        shippingInfo: {
            weight: 800,
            dimensions: {
                length: 35,
                width: 25,
                height: 5
            },
            shippingOptions: ["Standard", "Express"]
        }
    },
    {
        name: "Mysore Silk",
        price: 1049.99,
        description: "Mysore silk is a lightweight, soft silk fabric with a subtle sheen and a smooth texture. It's often used for sarees, dress materials, and home furnishings.",
        images: ["https://banaraswalafabrics.com/cdn/shop/files/MSE1018-R.jpg?v=1718180244&width=713/300x200"],
        category: "Mysore Silk",
        minOrderQuantity: 1,
        stock: 30,
        specifications: {
            material: "Pure Mysore Silk",
            color: "Multiple",
            weight: "500g",
            length: "5.5m"
        },
        shippingInfo: {
            weight: 500,
            dimensions: {
                length: 30,
                width: 20,
                height: 4
            },
            shippingOptions: ["Standard", "Express"]
        }
    },
    {
        name: "Banarasi Silk",
        price: 1119.99,
        description: "Banarasi silk is a luxurious, heavyweight silk fabric known for its intricate patterns, designs, and vibrant colors. It's often used for sarees, dress materials, and home furnishings.",
        images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTi4O5AY6fhBIfKPUkCNBzKScCSKtkoBWzi9A&s/300x200"],
        category: "Banarasi Silk",
        minOrderQuantity: 1,
        stock: 20,
        specifications: {
            material: "Pure Banarasi Silk",
            color: "Multiple",
            weight: "750g",
            length: "6.0m"
        },
        shippingInfo: {
            weight: 750,
            dimensions: {
                length: 32,
                width: 22,
                height: 5
            },
            shippingOptions: ["Standard", "Express"]
        }
    },
    {
        name: "Patola Silk",
        price: 989.99,
        description: "Patola silk is a luxurious, heavyweight silk fabric known for its intricate patterns, designs, and vibrant colors. It's often used for sarees, dress materials, and home furnishings.",
        images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCvGBq0VVu6VOBJGBeknYQkumEnk6su62jVw&s/300x200"],
        category: "Patola Silk",
        minOrderQuantity: 1,
        stock: 15,
        specifications: {
            material: "Pure Patola Silk",
            color: "Multiple",
            weight: "600g",
            length: "5.5m"
        },
        shippingInfo: {
            weight: 600,
            dimensions: {
                length: 30,
                width: 20,
                height: 4
            },
            shippingOptions: ["Standard", "Express"]
        }
    },
    {
        name: "Tussar Silk",
        price: 1259.99,
        description: "Tussar silk is a lightweight, soft silk fabric with a subtle sheen and a smooth texture. It's often used for sarees, dress materials, and home furnishings",
        images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaORRZslJSfgmU25csjRp1fN_PJ1-eZ_239Q&s/Zr/300x200"],
        category: "Tussar Silk",
        minOrderQuantity: 1,
        stock: 22,
        specifications: {
            material: "Pure Tussar Silk",
            color: "Multiple",
            weight: "550g",
            length: "5.5m"
        },
        shippingInfo: {
            weight: 550,
            dimensions: {
                length: 30,
                width: 20,
                height: 4
            },
            shippingOptions: ["Standard", "Express"]
        }
    },
    {
        name: "Ahimsa Silk",
        price: 1929.99,
        description: "Ahimsa silk is a type of silk fabric that's made from the cocoons of silkworms that are allowed to emerge naturally. It's a cruelty-free, eco-friendly alternative to traditional silk fabrics.",
        images: ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtk6j3SfSQqOGcPcT-Yrfdq7vlkANkIy7aPA&s/300x200"],
        category: "Ahimsa Silk",
        minOrderQuantity: 1,
        stock: 18,
        specifications: {
            material: "Pure Ahimsa Silk",
            color: "Multiple",
            weight: "450g",
            length: "5.5m"
        },
        shippingInfo: {
            weight: 450,
            dimensions: {
                length: 30,
                width: 20,
                height: 4
            },
            shippingOptions: ["Standard", "Express"]
        }
    }
];

async function seedProducts() {
    try {
        console.log('Starting database seeding process...');
        
        // Connect to MongoDB
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        console.log('Using connection string:', process.env.MONGO_URI);
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully');

        // Create a test seller if none exists
        console.log('Checking for existing seller...');
        let seller = await User.findOne({ role: 'seller' });
        if (!seller) {
            console.log('No seller found, creating test seller...');
            seller = await User.create({
                companyName: 'SilkCraft Enterprises',
                email: 'seller@test.com',
                password: 'password123',
                role: 'seller',
                businessType: 'Manufacturer',
                phone: '+91-9876543210',
                address: '123 Silk Street, Textile Market, Mumbai - 400001',
                taxId: 'GSTIN123456789',
                isVerified: true,
                settings: {
                    emailNotifications: true,
                    smsNotifications: true,
                    orderUpdates: true,
                    marketingEmails: false,
                    profileVisibility: true,
                    showContactInfo: true
                },
                paymentSettings: {
                    bankName: 'State Bank of India',
                    accountNumber: '1234567890',
                    ifscCode: 'SBIN0001234'
                }
            });
            console.log('Created test seller:', seller._id);
        } else {
            console.log('Found existing seller:', seller._id);
        }

        // Add seller ID to products
        console.log('Preparing products with seller ID...');
        const productsWithSeller = sampleProducts.map(product => ({
            ...product,
            seller: seller._id
        }));

        // Insert sample products
        console.log('Inserting new products...');
        const products = await Product.insertMany(productsWithSeller);
        console.log('Successfully inserted products count:', products.length);

        // Verify the insertion
        console.log('Verifying product insertion...');
        const verifyProducts = await Product.find({});
        console.log('Total products in database:', verifyProducts.length);

        console.log('Database seeding completed successfully!');
        await mongoose.connection.close();
        console.log('Database connection closed');
        
        return true;
    } catch (error) {
        console.error('Error during database seeding:', error);
        console.error('Error details:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('Database connection closed after error');
        }
        return false;
    }
}

// Run the seeding process
console.log('Starting product seeding process...');
seedProducts()
    .then(success => {
        if (success) {
            console.log('Product seeding completed successfully');
            process.exit(0);
        } else {
            console.log('Product seeding failed');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    }); 