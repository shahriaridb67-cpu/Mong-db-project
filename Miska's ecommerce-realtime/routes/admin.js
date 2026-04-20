const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const Order = require('../models/Order');

const router = express.Router();

// Admin password (should be in environment variable in production)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Simple session store (in production, use proper session management)
const adminSessions = new Set();

// Middleware to check admin authentication
function requireAdmin(req, res, next) {
  const sessionId = req.headers['x-admin-session'] || req.query.session;
  if (adminSessions.has(sessionId)) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized. Please login first.' });
}

// Login endpoint
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    adminSessions.add(sessionId);
    res.json({ success: true, sessionId });
  } else {
    res.status(401).json({ message: 'Invalid password' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  const sessionId = req.headers['x-admin-session'];
  if (sessionId) {
    adminSessions.delete(sessionId);
  }
  res.json({ success: true });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/img/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (increased for larger images)
  fileFilter: function (req, file, cb) {
    // Accept all image MIME types
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Business Summary (protected)
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const products = await Product.find();
    const orders = await Order.find();
    
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    res.json({
      totalStock,
      totalOrders,
      totalSales
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

// Create product with file upload (protected)
router.post('/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const productData = {
      title: req.body.title,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      category: req.body.category || 'General',
      description: req.body.description || '',
      imageUrl: req.body.imageUrl || ''
    };

    // If file was uploaded, use the uploaded file path
    if (req.file) {
      productData.imageUrl = `/img/uploads/${req.file.filename}`;
    }

    const product = await Product.create(productData);
    const io = req.app.get('io');
    io.emit('productUpdate');
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Read all products (protected)
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Update product (protected)
router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const io = req.app.get('io');
    io.emit('productUpdate');
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete product (protected)
router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Delete associated image file if it exists and is in uploads folder
    if (product.imageUrl && product.imageUrl.startsWith('/img/uploads/')) {
      const imagePath = path.join(__dirname, '..', 'public', product.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Product.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    io.emit('productUpdate');
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

module.exports = router;

