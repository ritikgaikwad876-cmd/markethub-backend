const Cart = require('../models/Cart');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, shippingDetails, paymentMethod = 'COD' } = req.body;
  const normalizedShippingDetails = {
    name: shippingDetails?.name?.trim() || '',
    phone: shippingDetails?.phone?.trim() || '',
    address: shippingDetails?.address?.trim() || shippingAddress?.trim() || '',
  };
  const finalShippingAddress = shippingAddress?.trim() || normalizedShippingDetails.address;

  if (!normalizedShippingDetails.name || !normalizedShippingDetails.phone || !normalizedShippingDetails.address) {
    return res.status(400).json({ message: 'Name, phone, and address are required' });
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const items = cart.items.map((item) => ({
    product: item.product._id,
    quantity: item.quantity,
    price: item.priceSnapshot,
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order = await Order.create({
    user: req.user._id,
    items,
    shippingAddress: finalShippingAddress,
    shippingDetails: normalizedShippingDetails,
    paymentMethod,
    totalAmount,
  });

  cart.items = [];
  await cart.save();

  res.status(201).json({ message: 'Order placed successfully', order });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('items.product');
  res.status(200).json(orders);
});

const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate('user')
    .populate('items.product');
  res.status(200).json(orders);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['pending', 'delivered'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid order status' });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  order.status = status;
  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate('user')
    .populate('items.product');

  res.status(200).json({ message: 'Order status updated', order: updatedOrder });
});

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
};
