// middleware/auth.js
const jwt = require('jsonwebtoken');
const UserService = require('../services/UserService');
const { JWT_CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
    
    // Check if user session still exists
    const sessionResult = UserService.getUserSession(decoded.userId);
    
    if (!sessionResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Session expired, please login again'
      });
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };

    logger.debug('Auth middleware passed', { userId: decoded.userId });
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

module.exports = authMiddleware;