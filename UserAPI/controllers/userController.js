import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// GET all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    // const users = await User.find().sort({ id: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    /* Convert string ID from URL to number for comparison
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await User.findOne({ id: userId });
    */
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST new user (for admin or public registration)
export const createUser = async (req, res) => {
  const { Username, Email, password } = req.body;
  
  // Validate required fields
  if (!Username || !Email || !password) {
    return res.status(400).json({ message: "Please provide all required fields: Username, Email, password" });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(Email)) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }
  
  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }
  
  try {
    // Check if user with email already exists
    const existingUser = await User.findOne({ Email: Email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with hashed password
    const user = new User({
      Username,
      Email,
      password: hashedPassword
    });
    
    const savedUser = await user.save();
    
    // Generate token for the new user
    const token = generateToken(savedUser._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: savedUser._id,
        Username: savedUser.Username,
        email: savedUser.Email
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT update user
export const updateUser = async (req, res) => {
  try {
    /* Convert string ID to number for comparison
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    */
    const updatedUser = await User.findOneAndUpdate(
      { id: req.params.id },
      // { id: userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE user
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ id: req.params.id });
    /* Convert string ID to number for comparison
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const deletedUser = await User.findOneAndDelete({ id: userId });
    */
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user by email
    const user = await User.findOne({ Email: email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Save token to user document in database
    await User.findByIdAndUpdate(user._id, { token });
    
    // Return user data and token
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        Username: user.Username,
        email: user.Email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// REGISTER user
export const register = async (req, res) => {
  try {
    const { Username, Email, password } = req.body;
    
    // Validate input
    if (!Username || !Email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ Email: Email });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = new User({
      Username,
      Email: Email,
      password: hashedPassword
    });
    
    // Save user
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    // Save token to user document in database
    await User.findByIdAndUpdate(user._id, { token });
    
    // Return user data and token
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        Username: user.Username,
        email: user.Email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// GET current user
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// LOGOUT user - clears token from database
export const logout = async (req, res) => {
  try {
    // Clear the token from the user document
    await User.findByIdAndUpdate(req.user.id, { token: null });
    
    res.json({
      success: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

