// controllers/gameDataController.js
const GameDataService = require('../services/GameDataService');
const logger = require('../utils/logger');

class GameDataController {
  async getAllSkins(req, res, next) {
    try {
      const skins = await GameDataService.getAllSkins();
      
      res.json({
        success: true,
        data: skins,
        count: skins ? skins.length : 0,
        cached: true
      });

      logger.info('All skins data retrieved');

    } catch (error) {
      logger.error('Get all skins error:', error);
      
      res.status(503).json({
        success: false,
        message: 'Unable to fetch skins data at the moment',
        error: 'Service temporarily unavailable'
      });
    }
  }

  async getAllBundles(req, res, next) {
    try {
      const bundles = await GameDataService.getAllBundles();
      
      res.json({
        success: true,
        data: bundles,
        count: bundles ? bundles.length : 0,
        cached: true
      });

      logger.info('All bundles data retrieved');

    } catch (error) {
      logger.error('Get all bundles error:', error);
      
      res.status(503).json({
        success: false,
        message: 'Unable to fetch bundles data at the moment',
        error: 'Service temporarily unavailable'
      });
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
      
      res.status(503).json({
        success: false,
        message: 'Unable to fetch version data at the moment',
        error: 'Service temporarily unavailable'
      });
    }
  }

  async getGameDataHealth(req, res, next) {
    try {
      const healthStatus = GameDataService.getHealthStatus();
      
      res.json({
        success: true,
        data: healthStatus,
        message: healthStatus.initialized ? 'Game data service is healthy' : 'Game data service is initializing'
      });

    } catch (error) {
      logger.error('Get game data health error:', error);
      next(error);
    }
  }
}

module.exports = new GameDataController();