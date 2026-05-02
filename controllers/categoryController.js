const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const formatCategoryName = (value = '') => value.trim().toLowerCase();

const seedCategoriesFromProducts = async () => {
  const existingCount = await Category.countDocuments();

  if (existingCount > 0) {
    return;
  }

  const productCategories = await Product.distinct('category');
  const normalizedCategories = productCategories
    .map(formatCategoryName)
    .filter(Boolean);

  if (normalizedCategories.length === 0) {
    return;
  }

  const uniqueCategories = [...new Set(normalizedCategories)];
  await Category.insertMany(uniqueCategories.map((name) => ({ name })), { ordered: false });
};

const getCategories = asyncHandler(async (req, res) => {
  await seedCategoriesFromProducts();

  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const name = formatCategoryName(req.body.name || '');

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  const existingCategory = await Category.findOne({ name });

  if (existingCategory) {
    return res.status(400).json({ message: 'Category already exists' });
  }

  const category = await Category.create({ name });
  res.status(201).json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  await category.deleteOne();
  res.json({ message: 'Category deleted successfully' });
});

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
};
