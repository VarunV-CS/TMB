
import User from "../models/User.js";
import Task from "../models/Task.js";
import mongoose from "mongoose";
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

// V2 ENDPOINTS - With Virtual Population

// GET user with populated tasks (Method 1: Virtual Population)
export const getUsersWithTasksV2 = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -token')
      .populate('tasks', 'title description status priority dueDate createdAt');

    res.json({
      version: 'v2',
      count: users.length,
      users: users.map(user => ({
        id: user._id,
        Username: user.Username,
        Email: user.Email,
        role: user.role,
        createdAt: user.createdAt,
        tasks: user.tasks,
        taskCount: user.tasks?.length || 0
      })),
      meta: {
        populatedFields: ['tasks'],
        virtuals: ['taskCount']
      }
    });
  } catch (error) {
    console.error('Get users with tasks v2 error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

// GET single user with populated tasks (V2)
export const getUserByIdV2 = async (req, res) => {
  try {
    const targetId = req.params.id || req.user.id;

    const user = await User.findById(targetId)
      .select('-password -token')
      .populate('tasks', 'title description status priority dueDate createdAt updatedAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate task stats
    const stats = {
      total: user.tasks?.length || 0,
      pending: user.tasks?.filter(t => t.status === 'pending').length || 0,
      inProgress: user.tasks?.filter(t => t.status === 'in_progress').length || 0,
      completed: user.tasks?.filter(t => t.status === 'completed').length || 0,
      highPriority: user.tasks?.filter(t => t.priority === 'high').length || 0,
      mediumPriority: user.tasks?.filter(t => t.priority === 'medium').length || 0,
      lowPriority: user.tasks?.filter(t => t.priority === 'low').length || 0
    };

    res.json({
      version: 'v2',
      user: {
        id: user._id,
        Username: user.Username,
        Email: user.Email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tasks: user.tasks,
      stats,
      meta: {
        populatedFields: ['tasks'],
        virtuals: ['taskCount']
      }
    });
  } catch (error) {
    console.error('Get user by ID v2 error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET current user with populated tasks (V2)
export const getMeV2 = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -token')
      .populate('tasks', 'title description status priority dueDate createdAt updatedAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate task stats
    const stats = {
      total: user.tasks?.length || 0,
      pending: user.tasks?.filter(t => t.status === 'pending').length || 0,
      inProgress: user.tasks?.filter(t => t.status === 'in_progress').length || 0,
      completed: user.tasks?.filter(t => t.status === 'completed').length || 0,
      highPriority: user.tasks?.filter(t => t.priority === 'high').length || 0,
      mediumPriority: user.tasks?.filter(t => t.priority === 'medium').length || 0,
      lowPriority: user.tasks?.filter(t => t.priority === 'low').length || 0
    };

    res.json({
      version: 'v2',
      user: {
        id: user._id,
        Username: user.Username,
        Email: user.Email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tasks: user.tasks,
      stats,
      meta: {
        populatedFields: ['tasks'],
        virtuals: ['taskCount']
      }
    });
  } catch (error) {
    console.error('Get current user v2 error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET user with task summary (V2 - optimized)
export const getUserWithTaskSummaryV2 = async (req, res) => {
  try {
    const targetId = req.params.id || req.user.id;

    const user = await User.findById(targetId).select('-password -token');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Use aggregation for efficient task count
    const taskSummary = await Task.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(targetId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [
            { $ne: ['$dueDate', null] },
            { $lt: ['$dueDate', new Date()] },
            { $ne: ['$status', 'completed'] }
          ]}, 1, 0] } }
        }
      }
    ]);

    const stats = taskSummary[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      overdue: 0
    };

    res.json({
      version: 'v2',
      user: {
        id: user._id,
        Username: user.Username,
        Email: user.Email,
        role: user.role,
        createdAt: user.createdAt
      },
      taskSummary: {
        total: stats.total,
        byStatus: {
          pending: stats.pending,
          inProgress: stats.inProgress,
          completed: stats.completed
        },
        byPriority: {
          high: stats.highPriority,
          medium: stats.mediumPriority,
          low: stats.lowPriority
        },
        overdue: stats.overdue
      },
      meta: {
        populatedFields: [],
        virtuals: [],
        aggregation: true
      }
    });
  } catch (error) {
    console.error('Get user with task summary v2 error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

