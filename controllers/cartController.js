const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const getItemProductId = (item) => {
  return item.product?._id ? item.product._id.toString() : item.product.toString();
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await cart.populate('items.product');
  }

  return cart;
};

const getMyCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  res.status(200).json(cart);
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'productId is required' });
  }

  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty < 1) {
    return res.status(400).json({ message: 'quantity must be at least 1' });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((item) => getItemProductId(item) === productId);

  if (existing) {
    existing.quantity += qty;
    existing.priceSnapshot = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity: qty,
      priceSnapshot: product.price,
    });
  }

  await cart.save();
  const updated = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.status(200).json({ message: 'Item added to cart', cart: updated });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const qty = Number(quantity);
  if (Number.isNaN(qty)) {
    return res.status(400).json({ message: 'quantity must be a number' });
  }

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find((entry) => getItemProductId(entry) === productId);

  if (!item) {
    return res.status(404).json({ message: 'Item not found in cart' });
  }

  item.quantity = qty;
  if (item.quantity <= 0) {
    cart.items = cart.items.filter((entry) => getItemProductId(entry) !== productId);
  }

  await cart.save();
  const updated = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.status(200).json({ message: 'Cart item updated', cart: updated });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await getOrCreateCart(req.user._id);
  cart.items = cart.items.filter((entry) => getItemProductId(entry) !== productId);

  await cart.save();
  const updated = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.status(200).json({ message: 'Item removed from cart', cart: updated });
});

module.exports = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
};
