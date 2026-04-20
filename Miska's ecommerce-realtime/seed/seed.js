require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'ecommerce';

const sampleProducts = [
  {
    title: 'Rose Gold Lipstick Set',
    description: 'Premium matte lipstick collection in 6 stunning shades',
    price: 1299,
    currency: 'BDT',
    imageUrl: 'https://via.placeholder.com/600x400?text=Rose+Gold+Lipstick+Set',
    stock: 25,
    category: 'Makeup'
  },
  {
    title: 'Hydrating Face Serum',
    description: 'Deep moisturizing serum with vitamin C and hyaluronic acid',
    price: 1899,
    currency: 'BDT',
    imageUrl: 'https://via.placeholder.com/600x400?text=Hydrating+Face+Serum',
    stock: 30,
    category: 'Skincare'
  },
  {
    title: 'Professional Makeup Brush Set',
    description: '12-piece premium brush collection for flawless application',
    price: 2499,
    currency: 'BDT',
    imageUrl: 'https://via.placeholder.com/600x400?text=Makeup+Brush+Set',
    stock: 15,
    category: 'Tools'
  },
  {
    title: 'Glow Up Face Mask',
    description: 'Brightening face mask with natural ingredients for radiant skin',
    price: 599,
    currency: 'BDT',
    imageUrl: 'https://via.placeholder.com/600x400?text=Glow+Up+Face+Mask',
    stock: 40,
    category: 'Skincare'
  },
  {
    title: 'Eyeshadow Palette - Sunset Dreams',
    description: '18 vibrant eyeshadow shades for day and night looks',
    price: 1599,
    currency: 'BDT',
    imageUrl: 'https://via.placeholder.com/600x400?text=Eyeshadow+Palette',
    stock: 20,
    category: 'Makeup'
  }
];

(async () => {
  try {
    await mongoose.connect(uri, { dbName });
    console.log('Connected. Seeding products...');
    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);
    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
})();


