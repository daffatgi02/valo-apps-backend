// helpers/ErrorHelper.js
const logger = require('../utils/logger');

class ErrorHelper {
  static createError(code, message, details = null) {
    const error = {
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString()
    };

    logger.error('Error created:', error);
    
    return error;
  }

  static handleRiotApiError(error) {
    if (!error.response) {
      return this.createError('NETWORK_ERROR', 'Network connection failed');
    }

    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        return this.createError('UNAUTHORIZED', 'Authentication failed or token expired');
      case 403:
        return this.createError('FORBIDDEN', 'Access denied to requested resource');
      case 429:
        return this.createError('RATE_LIMITED', 'Too many requests, please try again later');
      case 500:
        return this.createError('SERVER_ERROR', 'Riot servers are experiencing issues');
      default:
        return this.createError('API_ERROR', data?.message || 'Riot API request failed', { status, data });
    }
  }
}

module.exports = ErrorHelper;