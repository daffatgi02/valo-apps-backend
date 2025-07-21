const jwt = require('jsonwebtoken');
const RiotAuthService = require('../services/RiotAuthService');
const UserService = require('../services/UserService');
const { JWT_CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Authenticate with Riot
      const riotAuth = await RiotAuthService.authenticate(username, password);
      
      if (!riotAuth.success) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Create JWT token
      const token = jwt.sign(
        { 
          userId: riotAuth.data.userId,
          username: username
        },
        JWT_CONFIG.SECRET,
        { expiresIn: JWT_CONFIG.EXPIRES_IN }
      );

      // Store user session
      await UserService.storeSession(riotAuth.data.userId, {
        accessToken: riotAuth.data.accessToken,
        entitlementsToken: riotAuth.data.entitlementsToken,
        username: username
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: riotAuth.data.userId,
            username: username
          }
        }
      });

      logger.info(`User ${username} logged in successfully`);

    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const userId = req.user.userId;
      const session = await UserService.getSession(userId);

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session expired'
        });
      }

      // Verify tokens still valid
      const isValid = await RiotAuthService.validateTokens(
        session.accessToken, 
        session.entitlementsToken
      );

      if (!isValid) {
        await UserService.removeSession(userId);
        return res.status(401).json({
          success: false,
          message: 'Tokens expired, please login again'
        });
      }

      res.json({
        success: true,
        message: 'Session is valid'
      });

    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      await UserService.removeSession(userId);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const session = await UserService.getSession(req.user.userId);
      
      res.json({
        success: true,
        data: {
          id: req.user.userId,
          username: session.username
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();