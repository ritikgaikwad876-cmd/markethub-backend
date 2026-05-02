const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.status(200).json(products);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.status(200).json(product);
});

const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(200).json({
    message: 'Image uploaded successfully',
    imageUrl,
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, category, image, stock } = req.body;

  if (!name || !description || price === undefined || !category) {
    return res.status(400).json({ message: 'Name, description, price and category are required' });
  }

  const product = await Product.create({
    name,
    description,
    price,
    discountPrice,
    category,
    image,
    stock,
  });

  res.status(201).json({ message: 'Product created', product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  Object.assign(product, req.body);
  await product.save();

  res.status(200).json({ message: 'Product updated', product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await product.deleteOne();
  res.status(200).json({ message: 'Product deleted' });
});

module.exports = {
  getProducts,
  getProductById,
  uploadProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
};
