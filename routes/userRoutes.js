const express = require('express');
const { registerUser, loginUser, getMyProfile, getAllUsers } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMyProfile);
router.get('/', protect, adminOnly, getAllUsers);

module.exports = router;
