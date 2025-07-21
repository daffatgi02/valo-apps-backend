// services/UserService.js
const axios = require('axios');
const NodeCache = require('node-cache');
const { RIOT_URLS, X_RIOT_CLIENT_PLATFORM, BALANCE_TYPES, CACHE_TTL } = require('../config/constants');
const logger = require('../utils/logger');
const ErrorHelper = require('../helpers/ErrorHelper');

class UserService {
  constructor() {
    this.sessionCache = new NodeCache({ stdTTL: CACHE_TTL.TOKENS });
    this.balanceCache = new NodeCache({ stdTTL: CACHE_TTL.BALANCE });
    this.userInfoCache = new NodeCache({ stdTTL: CACHE_TTL.USER_INFO });
  }

  async getUserInfo(accessToken) {
    try {
      const cacheKey = `userinfo_${accessToken.substring(0, 10)}`;
      const cached = this.userInfoCache.get(cacheKey);
      
      if (cached) {
        logger.debug('Returning cached user info');
        return { success: true, data: cached };
      }

      const response = await axios.get(RIOT_URLS.AUTH_USERINFO, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000
      });

      const userInfo = {
        userId: response.data.sub,
        gameName: response.data.acct?.game_name,
        tagLine: response.data.acct?.tag_line,
        region: response.data.acct?.region || 'ap', // default to Asia Pacific
        username: `${response.data.acct?.game_name}#${response.data.acct?.tag_line}`
      };

      this.userInfoCache.set(cacheKey, userInfo);
      
      logger.debug('User info retrieved', { userId: userInfo.userId, username: userInfo.username });
      
      return {
        success: true,
        data: userInfo
      };
    } catch (error) {
      logger.error('Failed to get user info:', error);
      return ErrorHelper.createError('USER_INFO_FAILED', 'Failed to retrieve user information');
    }
  }

  async getUserBalance(accessToken, entitlementsToken, userId, region) {
    try {
      const cacheKey = `balance_${userId}`;
      const cached = this.balanceCache.get(cacheKey);
      
      if (cached) {
        logger.debug('Returning cached balance', { userId });
        return { success: true, data: cached };
      }

      const balanceUrl = RIOT_URLS.BALANCE
        .replace('{region}', region)
        .replace('{userId}', userId);

      const response = await axios.get(balanceUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Riot-Entitlements-JWT': entitlementsToken,
          'X-Riot-ClientPlatform': X_RIOT_CLIENT_PLATFORM
        },
        timeout: 10000
      });

      const balance = {
        valorantPoints: response.data.Balances[BALANCE_TYPES.VALORANT_POINTS] || 0,
        radianitePoints: response.data.Balances[BALANCE_TYPES.RADIANITE_POINTS] || 0,
        kingdomCredits: response.data.Balances[BALANCE_TYPES.KINGDOM_CREDITS] || 0
      };

      this.balanceCache.set(cacheKey, balance);
      
      logger.debug('Balance retrieved', { userId, balance });
      
      return {
        success: true,
        data: balance
      };
    } catch (error) {
      logger.error('Failed to get user balance:', error);
      return ErrorHelper.createError('BALANCE_FAILED', 'Failed to retrieve user balance');
    }
  }

  async getAccountXP(accessToken, entitlementsToken, userId, region) {
    try {
      const accountXpUrl = RIOT_URLS.ACCOUNT_XP
        .replace('{region}', region)
        .replace('{userId}', userId);

      const response = await axios.get(accountXpUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Riot-Entitlements-JWT': entitlementsToken,
          'X-Riot-ClientPlatform': X_RIOT_CLIENT_PLATFORM
        },
        timeout: 10000
      });

      const accountXP = {
        level: response.data.Progress?.Level || 0,
        xp: response.data.Progress?.XP || 0
      };

      logger.debug('Account XP retrieved', { userId, accountXP });
      
      return {
        success: true,
        data: accountXP
      };
    } catch (error) {
      logger.error('Failed to get account XP:', error);
      return ErrorHelper.createError('ACCOUNT_XP_FAILED', 'Failed to retrieve account XP');
    }
  }

  storeUserSession(userId, sessionData) {
    const sessionKey = `session_${userId}`;
    
    const session = {
      ...sessionData,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.sessionCache.set(sessionKey, session);
    
    logger.debug('User session stored', { userId });
    
    return { success: true };
  }

  getUserSession(userId) {
    const sessionKey = `session_${userId}`;
    const session = this.sessionCache.get(sessionKey);
    
    if (!session) {
      logger.debug('No session found', { userId });
      return { success: false, error: 'Session not found' };
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();
    this.sessionCache.set(sessionKey, session);
    
    return { success: true, data: session };
  }

  removeUserSession(userId) {
    const sessionKey = `session_${userId}`;
    this.sessionCache.del(sessionKey);
    
    // Clear related caches
    this.balanceCache.keys().forEach(key => {
      if (key.includes(userId)) {
        this.balanceCache.del(key);
      }
    });

    this.userInfoCache.keys().forEach(key => {
      if (key.includes(userId)) {
        this.userInfoCache.del(key);
      }
    });
    
    logger.debug('User session removed', { userId });
    
    return { success: true };
  }

  getAllActiveSessions() {
    const sessionKeys = this.sessionCache.keys().filter(key => key.startsWith('session_'));
    const sessions = {};
    
    sessionKeys.forEach(key => {
      const userId = key.replace('session_', '');
      const session = this.sessionCache.get(key);
      if (session) {
        sessions[userId] = {
          username: session.username,
          gameName: session.gameName,
          tagLine: session.tagLine,
          lastActivity: session.lastActivity,
          createdAt: session.createdAt
        };
      }
    });
    
    return { success: true, data: sessions };
  }
}

module.exports = new UserService();