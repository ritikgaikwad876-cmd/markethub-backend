const crypto = require('crypto');
const Razorpay = require('razorpay');
const Cart = require('../models/Cart');
const asyncHandler = require('../utils/asyncHandler');

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured');
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const createPaymentOrder = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const totalAmount = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

  if (totalAmount <= 0) {
    return res.status(400).json({ message: 'Invalid cart total' });
  }

  const razorpay = getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: 'INR',
    receipt: `mh_${req.user._id.toString().slice(-6)}_${Date.now()}`,
    notes: {
      userId: req.user._id.toString(),
    },
  });

  res.status(200).json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification data is required' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: 'Invalid payment signature' });
  }

  res.status(200).json({
    message: 'Payment verified successfully',
    verified: true,
  });
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
};
