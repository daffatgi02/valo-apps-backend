// controllers/AuthController.js
const jwt = require('jsonwebtoken');
const OAuthService = require('../services/OAuthService');
const UserService = require('../services/UserService');
const { JWT_CONFIG } = require('../config/constants');
const logger = require('../utils/logger');
const ErrorHelper = require('../helpers/ErrorHelper');

class AuthController {
  // Generate OAuth URL untuk WebView login
  async generateAuthUrl(req, res, next) {
    try {
      logger.debug('Generating OAuth URL for WebView login');
      
      const result = OAuthService.generateAuthUrl();
      
      if (!result.success) {
        logger.error('Failed to generate auth URL:', result.error);
        return res.status(400).json({
          success: false,
          message: 'Failed to generate authentication URL',
          error: result.error
        });
      }

      logger.info('OAuth URL generated successfully');
      
      res.json({
        success: true,
        message: 'Authentication URL generated',
        data: {
          authUrl: result.data.authUrl,
          instructions: [
            'Open this URL in WebView',
            'Complete Riot login process',
            'Monitor for redirect to playvalorant.com',
            'Extract tokens from URL fragment',
            'Send tokens to /api/auth/callback'
          ]
        }
      });
    } catch (error) {
      logger.error('Generate auth URL error:', error);
      next(error);
    }
  }

  // Process OAuth callback dari WebView
  async processCallback(req, res, next) {
    try {
      const { callbackUrl } = req.body;
      
      logger.debug('Processing OAuth callback', { 
        hasCallbackUrl: !!callbackUrl,
        urlLength: callbackUrl?.length 
      });

      // Extract tokens dari callback URL
      const tokenResult = await OAuthService.processTokenCallback(callbackUrl);
      if (!tokenResult.success) {
        logger.error('Token extraction failed:', tokenResult.error);
        return res.status(400).json({
          success: false,
          message: 'Invalid callback tokens',
          error: tokenResult.error
        });
      }

      const { accessToken, idToken, tokenType } = tokenResult.data;

      // Get entitlements token
      logger.debug('Getting entitlements token');
      const entitlementsResult = await OAuthService.getEntitlementsToken(accessToken);
      if (!entitlementsResult.success) {
        logger.error('Entitlements failed:', entitlementsResult.error);
        return res.status(400).json({
          success: false,
          message: 'Failed to get entitlements token',
          error: entitlementsResult.error
        });
      }

      const { entitlementsToken } = entitlementsResult.data;

      // Get user info dari Riot API
      logger.debug('Getting user information');
      const userInfoResult = await UserService.getUserInfo(accessToken);
      if (!userInfoResult.success) {
        logger.error('User info failed:', userInfoResult.error);
        return res.status(400).json({
          success: false,
          message: 'Failed to get user information',
          error: userInfoResult.error
        });
      }

      const userInfo = userInfoResult.data;

      // Get user balance
      logger.debug('Getting user balance', { userId: userInfo.userId });
      const balanceResult = await UserService.getUserBalance(
        accessToken,
        entitlementsToken,
        userInfo.userId,
        userInfo.region
      );

      // Get account XP
      logger.debug('Getting account XP');
      const xpResult = await UserService.getAccountXP(
        accessToken,
        entitlementsToken,
        userInfo.userId,
        userInfo.region
      );

      // Store user session
      logger.debug('Storing user session');
      UserService.storeUserSession(userInfo.userId, {
        accessToken,
        idToken,
        entitlementsToken,
        tokenType,
        ...userInfo,
        balance: balanceResult.success ? balanceResult.data : null,
        accountXP: xpResult.success ? xpResult.data : null
      });

      // Create JWT token untuk API access
      const jwtToken = jwt.sign(
        { 
          userId: userInfo.userId,
          username: userInfo.username,
          region: userInfo.region
        },
        JWT_CONFIG.SECRET,
        { expiresIn: JWT_CONFIG.EXPIRES_IN }
      );

      logger.info(`User ${userInfo.username} authenticated successfully`);

      res.json({
        success: true,
        message: 'Authentication successful',
        data: {
          token: jwtToken,
          user: {
            id: userInfo.userId,
            username: userInfo.username,
            gameName: userInfo.gameName,
            tagLine: userInfo.tagLine,
            region: userInfo.region
          },
          balance: balanceResult.success ? balanceResult.data : null,
          accountXP: xpResult.success ? xpResult.data : null,
          session: {
            loginTime: new Date().toISOString(),
            expiresIn: JWT_CONFIG.EXPIRES_IN
          }
        }
      });
    } catch (error) {
      logger.error('Process callback error:', error);
      next(error);
    }
  }

  // Get current user profile
  async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      
      logger.debug('Getting user profile', { userId });
      
      const sessionResult = UserService.getUserSession(userId);

      if (!sessionResult.success) {
        logger.warn('Profile request with invalid session', { userId });
        return res.status(401).json({
          success: false,
          message: 'Session not found or expired'
        });
      }

      const session = sessionResult.data;

      res.json({
        success: true,
        data: {
          id: userId,
          username: session.username,
          gameName: session.gameName,
          tagLine: session.tagLine,
          region: session.region,
          balance: session.balance,
          accountXP: session.accountXP,
          session: {
            lastActivity: session.lastActivity,
            createdAt: session.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  // Refresh user data (balance, XP, dll.)
  async refresh(req, res, next) {
    try {
      const userId = req.user.userId;
      
      logger.debug('Refreshing user data', { userId });
      
      const sessionResult = UserService.getUserSession(userId);

      if (!sessionResult.success) {
        return res.status(401).json({
          success: false,
          message: 'Session expired, please login again'
        });
      }

      const session = sessionResult.data;

      // Refresh balance
      const balanceResult = await UserService.getUserBalance(
        session.accessToken,
        session.entitlementsToken,
        userId,
        session.region
      );

      // Refresh account XP
      const xpResult = await UserService.getAccountXP(
        session.accessToken,
        session.entitlementsToken,
        userId,
        session.region
      );

      // Update session dengan data fresh
      UserService.storeUserSession(userId, {
        ...session,
        balance: balanceResult.success ? balanceResult.data : session.balance,
        accountXP: xpResult.success ? xpResult.data : session.accountXP
      });

      logger.info('User data refreshed', { userId });

      res.json({
        success: true,
        message: 'Data refreshed successfully',
        data: {
          balance: balanceResult.success ? balanceResult.data : null,
          accountXP: xpResult.success ? xpResult.data : null,
          refreshedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Refresh error:', error);
      next(error);
    }
  }

  // Get all active sessions (multi-account)
  async getAllSessions(req, res, next) {
    try {
      logger.debug('Getting all active sessions');
      
      const result = UserService.getAllActiveSessions();
      
      res.json({
        success: true,
        message: 'Active sessions retrieved',
        data: {
          sessions: result.data,
          count: Object.keys(result.data).length
        }
      });
    } catch (error) {
      logger.error('Get all sessions error:', error);
      next(error);
    }
  }

  // Switch ke account yang berbeda
  async switchAccount(req, res, next) {
    try {
      const { targetUserId } = req.body;
      const currentUserId = req.user.userId;

      logger.debug('Switching account', { from: currentUserId, to: targetUserId });

      if (targetUserId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot switch to the same account'
        });
      }

      const sessionResult = UserService.getUserSession(targetUserId);
      
      if (!sessionResult.success) {
        return res.status(404).json({
          success: false,
          message: 'Target account session not found or expired'
        });
      }

      const session = sessionResult.data;

      // Generate JWT baru untuk target account
      const jwtToken = jwt.sign(
        { 
          userId: targetUserId,
          username: session.username,
          region: session.region
        },
        JWT_CONFIG.SECRET,
        { expiresIn: JWT_CONFIG.EXPIRES_IN }
      );

      logger.info(`Account switched from ${currentUserId} to ${session.username}`);

      res.json({
        success: true,
        message: 'Account switched successfully',
        data: {
          token: jwtToken,
          user: {
            id: targetUserId,
            username: session.username,
            gameName: session.gameName,
            tagLine: session.tagLine,
            region: session.region
          },
          balance: session.balance,
          accountXP: session.accountXP
        }
      });
    } catch (error) {
      logger.error('Switch account error:', error);
      next(error);
    }
  }

  // Logout current user
  async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      
      logger.debug('Logging out user', { userId });
      
      UserService.removeUserSession(userId);

      logger.info(`User ${userId} logged out successfully`);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  // Logout specific account (untuk multi-account)
  async logoutAccount(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.userId;

      logger.debug('Logging out specific account', { targetUserId: userId, currentUserId });

      // Verify session exists
      const sessionResult = UserService.getUserSession(userId);
      if (!sessionResult.success) {
        return res.status(404).json({
          success: false,
          message: 'Account session not found'
        });
      }

      UserService.removeUserSession(userId);

      logger.info(`Account ${userId} logged out by ${currentUserId}`);

      res.json({
        success: true,
        message: 'Account logged out successfully'
      });
    } catch (error) {
      logger.error('Logout account error:', error);
      next(error);
    }
  }
}

module.exports = new AuthController();