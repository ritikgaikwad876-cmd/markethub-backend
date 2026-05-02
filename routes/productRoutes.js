const express = require('express');
const {
  getProducts,
  getProductById,
  uploadProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getProducts);
router.post('/upload', protect, adminOnly, uploadSingleImage, uploadProductImage);
router.get('/:id', getProductById);
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
