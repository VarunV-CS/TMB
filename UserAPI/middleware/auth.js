import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Middleware to protect routes - verifies JWT token
 * Supports both cookie-based and Authorization header-based authentication
 */
const auth = (req, res, next) => {
  try {
    // Get token - first check cookies, then fall back to Authorization header
    let token = null;
    
    // Check for token in cookies
    if (req.cookies && req.cookies[config.COOKIE_NAME]) {
      token = req.cookies[config.COOKIE_NAME];
    }
    
    // If no cookie token, check Authorization header
    if (!token) {
      const authHeader = req.header('Authorization');
      
      if (authHeader) {
        // Check if it's a Bearer token
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.replace('Bearer ', '');
        } else {
          // Use the header value directly as token (non-Bearer format)
          token = authHeader;
        }
      }
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }
    
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token has expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token is not valid' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

export default auth;

