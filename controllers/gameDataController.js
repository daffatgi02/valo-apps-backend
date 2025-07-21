const GameDataService = require('../services/GameDataService');
const logger = require('../utils/logger');

class GameDataController {
  async getAllSkins(req, res, next) {
    try {
      const skins = await GameDataService.getAllSkins();
      
      res.json({
        success: true,
        data: skins,
        count: skins.length
      });

      logger.info('All skins data retrieved');

    } catch (error) {
      logger.error('Get all skins error:', error);
      next(error);
    }
  }

  async getAllBundles(req, res, next) {
    try {
      const bundles = await GameDataService.getAllBundles();
      
      res.json({
        success: true,
        data: bundles,
        count: bundles.length
      });

      logger.info('All bundles data retrieved');

    } catch (error) {
      logger.error('Get all bundles error:', error);
      next(error);
    }
  }

  async getVersion(req, res, next) {
    try {
      const version = await GameDataService.getClientVersion();
      
      res.json({
        success: true,
        data: version
      });

      logger.info('Client version retrieved');

    } catch (error) {
      logger.error('Get client version error:', error);
      next(error);
    }
  }
}

module.exports = new GameDataController();