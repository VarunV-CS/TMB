import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Middleware to protect routes - verifies JWT token
 */
const auth = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token format invalid' });
    }
    
    // Get token from Bearer string
    const token = authHeader.replace('Bearer ', '');
    
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth;

