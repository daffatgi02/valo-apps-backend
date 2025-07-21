const StoreService = require('../services/StoreService');
const GameDataService = require('../services/GameDataService');
const UserService = require('../services/UserService');
const logger = require('../utils/logger');

class StoreController {
  async getDailyStore(req, res, next) {
    try {
      const userId = req.user.userId;
      const session = await UserService.getSession(userId);

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Get daily store from Riot API
      const storeData = await StoreService.getDailyStore(
        userId,
        session.accessToken,
        session.entitlementsToken
      );

      // Enrich with skin details
      const enrichedStore = await GameDataService.enrichStoreData(storeData);

      res.json({
        success: true,
        data: {
          store: enrichedStore,
          refreshTime: storeData.refreshTime,
          expires: storeData.expires
        }
      });

      logger.info(`Daily store retrieved for user ${userId}`);

    } catch (error) {
      logger.error('Get daily store error:', error);
      next(error);
    }
  }

  async getStoreHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { days = 7 } = req.query;

      const history = await StoreService.getStoreHistory(userId, parseInt(days));

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      next(error);
    }
  }

  async getFavorites(req, res, next) {
    try {
      const userId = req.user.userId;
      const favorites = await UserService.getFavorites(userId);

      res.json({
        success: true,
        data: favorites
      });

    } catch (error) {
      next(error);
    }
  }

  async addFavorite(req, res, next) {
    try {
      const userId = req.user.userId;
      const { skinId } = req.params;

      await UserService.addFavorite(userId, skinId);

      res.json({
        success: true,
        message: 'Added to favorites'
      });

    } catch (error) {
      next(error);
    }
  }

  async removeFavorite(req, res, next) {
    try {
      const userId = req.user.userId;
      const { skinId } = req.params;

      await UserService.removeFavorite(userId, skinId);

      res.json({
        success: true,
        message: 'Removed from favorites'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StoreController();