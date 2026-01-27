
import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";
import config from '../config/index.js';

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};

// Helper function to set JWT cookie
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, // Prevents XSS attacks - JS cannot read the cookie
    secure: config.COOKIE_SECURE, // Only send over HTTPS
    sameSite: config.COOKIE_SAME_SITE, // CSRF protection
    maxAge: config.COOKIE_MAX_AGE // Cookie expiration in milliseconds
  };
  
  res.cookie(config.COOKIE_NAME, token, cookieOptions);
};

// Helper function to clear JWT cookie
const clearTokenCookie = (res) => {
  res.clearCookie(config.COOKIE_NAME, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE
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
  
          console.log('@something jnd', req.body);

  // Validate password strength
  
  
  try {
    // Check if user with email already exists
    const existingUser = await User.findOne({ Email: Email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    
    // Check if username already exists
    const existingUsername = await User.findOne({ Username: Username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken" });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with hashed password
    const user = new User({
      Username,
      Email,
      password
    });
    
    console.log('@something jnd', password);

    const savedUser = await user.save();
    
    // Generate token for the new user
    const token = generateToken(savedUser._id);
    
    // Set token in HTTP-only cookie
    setTokenCookie(res, token);
    
    // Save token to user document in database
    await User.findByIdAndUpdate(savedUser._id, { token });
    
    // Return user data and token (token also in body for backward compatibility)
    res.status(201).json({
      success: true,
      token,
      user: {
        id: savedUser._id,
        Username: savedUser.Username,
        Email: savedUser.Email
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
    
    // If username is being updated, check if it already exists
    if (req.body.Username) {
      const existingUsername = await User.findOne({ 
        Username: req.body.Username,
        _id: { $ne: req.params.id } // Exclude current user
      });
      
      if (existingUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }
    }
    
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
    
    // Set token in HTTP-only cookie
    setTokenCookie(res, token);
    
    // Save token to user document in database
    await User.findByIdAndUpdate(user._id, { token });
    
    // Return user data and token (token also in body for backward compatibility)
    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        Username: user.Username,
        Email: user.Email
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
    
    // Check if username already exists
    const existingUsername = await User.findOne({ Username: Username });
    
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //here
    if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
        // console.log('@something jnd', req.body);

  }
    
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
    
    // Set token in HTTP-only cookie
    setTokenCookie(res, token);
    
    // Save token to user document in database
    await User.findByIdAndUpdate(user._id, { token });
    
    // Return user data and token (token also in body for backward compatibility)
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        Username: user.Username,
        Email: user.Email
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

// LOGOUT user - clears token from database and cookie
export const logout = async (req, res) => {
  try {
    // Clear the token from the user document
    await User.findByIdAndUpdate(req.user.id, { token: null });
    
    // Clear the JWT cookie
    clearTokenCookie(res);
    
    res.json({
      success: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

