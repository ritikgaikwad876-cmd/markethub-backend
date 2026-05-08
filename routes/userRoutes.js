const express = require('express');
const {
  registerUser,
  loginUser,
  getMyProfile,
  getAllUsers,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyPasswordResetOtp);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMyProfile);
router.get('/', protect, adminOnly, getAllUsers);

module.exports = router;
