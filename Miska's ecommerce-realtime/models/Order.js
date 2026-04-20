
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, default: 'PLACED', enum: ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

