const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');

const router = express.Router();

// Health check
router.get('/health', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

// Products list
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Create order
router.post('/orders', async (req, res) => {
  try {
    const { customerName, customerEmail, items } = req.body;
    if (!customerName || !customerEmail || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid order payload' });
    }

    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(400).json({ message: 'Invalid product in order' });
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.title}` });
      }
      totalAmount += product.price * item.quantity;
      product.stock -= item.quantity;
      await product.save();
      item.title = product.title;
      item.price = product.price;
    }

    const order = await Order.create({
      customerName,
      customerEmail,
      items,
      totalAmount
    });

    // Emit realtime events
    const io = req.app.get('io');
    io.emit('productUpdate'); // products changed → refresh UI
    io.emit('newOrder', order); // a new order appeared

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to place order' });
  }
});

// Orders list
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

module.exports = router;


