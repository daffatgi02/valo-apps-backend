const axios = require('axios');
const NodeCache = require('node-cache');
const { RIOT_URLS, CACHE_TTL } = require('../config/constants');
const logger = require('../utils/logger');

class GameDataService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: CACHE_TTL.SKINS });
    this.initializeData();
  }

  async initializeData() {
    try {
      await Promise.all([
        this.getAllSkins(),
        this.getAllBundles(),
        this.getClientVersion()
      ]);
      logger.info('Game data initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize game data:', error.message);
    }
  }

  async getAllSkins() {
    try {
      let skins = this.cache.get('all_skins');
      
      if (!skins) {
        const response = await axios.get(`${RIOT_URLS.SKINS}?language=en-US`);
        skins = response.data.data;
        this.cache.set('all_skins', skins);
        logger.info('Skins data fetched and cached');
      }
      
      return skins;
    } catch (error) {
      logger.error('Failed to fetch skins:', error.message);
      throw error;
    }
  }

  async getAllBundles() {
    try {
      let bundles = this.cache.get('all_bundles');
      
      if (!bundles) {
        const response = await axios.get(`${RIOT_URLS.BUNDLES}?language=en-US`);
        bundles = response.data.data;
        this.cache.set('all_bundles', bundles);
        logger.info('Bundles data fetched and cached');
      }
      
      return bundles;
    } catch (error) {
      logger.error('Failed to fetch bundles:', error.message);
      throw error;
    }
  }

  async getClientVersion() {
    try {
      let version = this.cache.get('client_version');
      
      if (!version) {
        const response = await axios.get(RIOT_URLS.VERSION);
        version = response.data.data;
        this.cache.set('client_version', version, CACHE_TTL.VERSION);
        logger.info('Client version fetched and cached');
      }
      
      return version;
    } catch (error) {
      logger.error('Failed to fetch client version:', error.message);
      throw error;
    }
  }

  async enrichStoreData(storeData) {
    try {
      const [skins, bundles] = await Promise.all([
        this.getAllSkins(),
        this.getAllBundles()
      ]);

      const enrichedSkins = storeData.skins.map(skinId => {
        const skinInfo = this.findSkinById(skins, skinId);
        const bundleInfo = this.findBundleForSkin(bundles, skinInfo);
        
        return {
          id: skinId,
          ...skinInfo,
          bundle: bundleInfo
        };
      });

      return {
        ...storeData,
        skins: enrichedSkins
      };
    } catch (error) {
      logger.error('Failed to enrich store data:', error.message);
      throw error;
    }
  }

  findSkinById(skins, skinId) {
    for (const skin of skins) {
      for (const level of skin.levels) {
        if (level.uuid === skinId) {
          return {
            displayName: skin.displayName,
            displayIcon: skin.displayIcon,
            streamedVideo: skin.streamedVideo,
            themeUuid: skin.themeUuid,
            contentTierUuid: skin.contentTierUuid,
            wallpaper: skin.wallpaper
          };
        }
      }
    }
    return null;
  }

  findBundleForSkin(bundles, skinInfo) {
    if (!skinInfo) return null;
    
    for (const bundle of bundles) {
      if (skinInfo.displayName && skinInfo.displayName.includes(bundle.displayName)) {
        return {
          displayName: bundle.displayName,
          displayIcon: bundle.displayIcon,
          description: bundle.description
        };
      }
    }
    return null;
  }
}

module.exports = new GameDataService();