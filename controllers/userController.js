const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const { sendPasswordResetOtpEmail } = require('../utils/mailer');

const PASSWORD_RESET_OTP_MINUTES = 10;
const PASSWORD_RESET_SESSION_MINUTES = 15;

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// Build response with token
const buildAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  token: generateToken({ id: user._id, role: user.role }),
});

// REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide all fields");
  }

  const normalizedEmail = normalizeEmail(email);

  const userExists = await User.findOne({ email: normalizedEmail });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // ✅ NO hashing here

  const user = await User.create({
    name,
    email: normalizedEmail,
    password
  });

  res.status(201).json({
    message: "User registered successfully",
    user: buildAuthResponse(user)
  });
});

// LOGIN USER
const loginUser = asyncHandler(async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }

  res.status(200).json({
    message: "Login successful",
    user: buildAuthResponse(user)
  });

});


// GET MY PROFILE
const getMyProfile = asyncHandler(async (req, res) => {

  res.status(200).json({
    user: req.user
  });

});


// GET ALL USERS (Admin)
const getAllUsers = asyncHandler(async (req, res) => {

  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json(users);

});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      message: 'Please provide a valid email address',
    });
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetSessionHash +passwordResetSessionExpiresAt'
  );

  if (!user) {
    return res.status(200).json({
      message: 'If an account with that email exists, an OTP has been sent.',
    });
  }

  const otp = generateOtp();

  user.passwordResetOtpHash = hashValue(otp);
  user.passwordResetOtpExpiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_MINUTES * 60 * 1000);
  user.passwordResetSessionHash = null;
  user.passwordResetSessionExpiresAt = null;

  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiresInMinutes: PASSWORD_RESET_OTP_MINUTES,
    });
  } catch (error) {
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error(error.message || 'Failed to send OTP email');
  }

  return res.status(200).json({
    message: 'If an account with that email exists, an OTP has been sent.',
  });
});

const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      message: 'Please provide a valid email address',
    });
  }

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({
      message: 'OTP must be a 6-digit code',
    });
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetSessionHash +passwordResetSessionExpiresAt'
  );

  if (
    !user ||
    !user.passwordResetOtpHash ||
    !user.passwordResetOtpExpiresAt ||
    user.passwordResetOtpExpiresAt.getTime() < Date.now() ||
    user.passwordResetOtpHash !== hashValue(normalizedOtp)
  ) {
    return res.status(400).json({
      message: 'Invalid or expired OTP',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetSessionHash = hashValue(resetToken);
  user.passwordResetSessionExpiresAt = new Date(Date.now() + PASSWORD_RESET_SESSION_MINUTES * 60 * 1000);

  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    message: 'OTP verified successfully',
    resetToken,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, password, confirmPassword } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedResetToken = String(resetToken || '').trim();
  const nextPassword = String(password || '').trim();
  const nextConfirmPassword = String(confirmPassword || '').trim();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      message: 'Please provide a valid email address',
    });
  }

  if (!normalizedResetToken) {
    return res.status(400).json({
      message: 'Reset session is invalid. Verify the OTP again.',
    });
  }

  if (nextPassword.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters',
    });
  }

  if (nextPassword !== nextConfirmPassword) {
    return res.status(400).json({
      message: 'Password and confirm password must match',
    });
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+password +passwordResetSessionHash +passwordResetSessionExpiresAt'
  );

  if (
    !user ||
    !user.passwordResetSessionHash ||
    !user.passwordResetSessionExpiresAt ||
    user.passwordResetSessionExpiresAt.getTime() < Date.now() ||
    user.passwordResetSessionHash !== hashValue(normalizedResetToken)
  ) {
    return res.status(400).json({
      message: 'Reset session expired. Please verify OTP again.',
    });
  }

  user.password = nextPassword;
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetSessionHash = null;
  user.passwordResetSessionExpiresAt = null;

  await user.save();

  return res.status(200).json({
    message: 'Password reset successful. You can now log in.',
  });
});


module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
  getAllUsers,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
};
