const User = require('../models/User');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

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

  const normalizedEmail = email.trim().toLowerCase();

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

  const normalizedEmail = email.trim().toLowerCase();

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


module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
  getAllUsers
};