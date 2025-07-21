const axios = require('axios');
const https = require('https');
const NodeCache = require('node-cache');
const { RIOT_URLS, CLIENT_PLATFORM, CACHE_TTL } = require('../config/constants');
const GameDataService = require('./GameDataService');
const logger = require('../utils/logger');

class StoreService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: CACHE_TTL.STORE });
    this.httpsAgent = new https.Agent({
      secureProtocol: 'TLSv1_2_method'
    });
  }

  async getDailyStore(userId, accessToken, entitlementsToken) {
    try {
      const cacheKey = `store_${userId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        logger.info(`Returning cached store for user ${userId}`);
        return cached;
      }

      // Get client version for headers
      const version = await GameDataService.getClientVersion();
      
      const clientPlatform = Buffer.from(JSON.stringify(CLIENT_PLATFORM)).toString('base64');
      
      const config = {
        httpsAgent: this.httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'X-Riot-ClientPlatform': clientPlatform,
          'X-Riot-ClientVersion': version.version,
          'X-Riot-Entitlements-JWT': entitlementsToken,
          'Authorization': `Bearer ${accessToken}`
        }
      };

      const storeUrl = `${RIOT_URLS.STORE}/${userId}`;
      const response = await axios.get(storeUrl, config);

      const storeData = {
        skins: response.data.SkinsPanelLayout.SingleItemOffers,
        refreshTime: new Date(response.data.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds * 1000 + Date.now()),
        expires: new Date(response.data.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds * 1000 + Date.now())
      };

      // Cache the result
      this.cache.set(cacheKey, storeData);
      
      logger.info(`Daily store fetched for user ${userId}`);
      return storeData;

    } catch (error) {
      logger.error('Get daily store error:', error.message);
      throw new Error('Failed to fetch daily store');
    }
  }

  async getStoreHistory(userId, days) {
    // Implementation for store history
    // This would require storing historical data
    return [];
  }
}

module.exports = new StoreService();