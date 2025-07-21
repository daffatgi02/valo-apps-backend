// services/GameDataService.js
const axios = require('axios');
const NodeCache = require('node-cache');
const { RIOT_URLS, CACHE_TTL } = require('../config/constants');
const logger = require('../utils/logger');

class GameDataService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: CACHE_TTL.SKINS });
    this.isInitialized = false;
    
    // Initialize data with delay to avoid blocking server startup
    setTimeout(() => {
      this.initializeData();
    }, 1000);
  }

  async initializeData() {
    try {
      logger.info('Starting game data initialization...');
      
      const results = await Promise.allSettled([
        this.getAllSkins(),
        this.getAllBundles(),
        this.getClientVersion()
      ]);

      // Check each result
      const skinsResult = results[0];
      const bundlesResult = results[1];
      const versionResult = results[2];

      if (skinsResult.status === 'rejected') {
        logger.error('Failed to fetch skins:', skinsResult.reason?.message);
      } else {
        logger.info('Skins data loaded successfully');
      }

      if (bundlesResult.status === 'rejected') {
        logger.error('Failed to fetch bundles:', bundlesResult.reason?.message);
      } else {
        logger.info('Bundles data loaded successfully');
      }

      if (versionResult.status === 'rejected') {
        logger.error('Failed to fetch version:', versionResult.reason?.message);
      } else {
        logger.info('Version data loaded successfully');
      }

      this.isInitialized = true;
      logger.info('Game data initialization completed');
      
    } catch (error) {
      logger.error('Failed to initialize game data:', error.message);
      this.isInitialized = false;
      
      // Retry after 30 seconds
      setTimeout(() => {
        logger.info('Retrying game data initialization...');
        this.initializeData();
      }, 30000);
    }
  }

  async getAllSkins() {
    try {
      let skins = this.cache.get('all_skins');
      
      if (!skins) {
        logger.debug('Fetching skins from API...');
        
        const response = await axios.get(`${RIOT_URLS.SKINS}?language=en-US`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'ValorantStoreAPI/1.0.0'
          }
        });
        
        if (response.data && response.data.data) {
          skins = response.data.data;
          this.cache.set('all_skins', skins);
          logger.info(`Skins data fetched and cached (${skins.length} skins)`);
        } else {
          throw new Error('Invalid response format from skins API');
        }
      } else {
        logger.debug('Using cached skins data');
      }
      
      return skins;
    } catch (error) {
      logger.error('Failed to fetch skins:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Return cached data if available, even if expired
      const cachedSkins = this.cache.get('all_skins');
      if (cachedSkins) {
        logger.warn('Using expired cached skins data due to API error');
        return cachedSkins;
      }
      
      throw error;
    }
  }

  async getAllBundles() {
    try {
      let bundles = this.cache.get('all_bundles');
      
      if (!bundles) {
        logger.debug('Fetching bundles from API...');
        
        const response = await axios.get(`${RIOT_URLS.BUNDLES}?language=en-US`, {
          timeout: 15000,
          headers: {
            'User-Agent': 'ValorantStoreAPI/1.0.0'
          }
        });
        
        if (response.data && response.data.data) {
          bundles = response.data.data;
          this.cache.set('all_bundles', bundles);
          logger.info(`Bundles data fetched and cached (${bundles.length} bundles)`);
        } else {
          throw new Error('Invalid response format from bundles API');
        }
      } else {
        logger.debug('Using cached bundles data');
      }
      
      return bundles;
    } catch (error) {
      logger.error('Failed to fetch bundles:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Return cached data if available, even if expired
      const cachedBundles = this.cache.get('all_bundles');
      if (cachedBundles) {
        logger.warn('Using expired cached bundles data due to API error');
        return cachedBundles;
      }
      
      throw error;
    }
  }

  async getClientVersion() {
    try {
      let version = this.cache.get('client_version');
      
      if (!version) {
        logger.debug('Fetching client version from API...');
        
        const response = await axios.get(RIOT_URLS.VERSION, {
          timeout: 10000,
          headers: {
            'User-Agent': 'ValorantStoreAPI/1.0.0'
          }
        });
        
        if (response.data && response.data.data) {
          version = response.data.data;
          this.cache.set('client_version', version, CACHE_TTL.VERSION);
          logger.info('Client version fetched and cached');
        } else {
          throw new Error('Invalid response format from version API');
        }
      } else {
        logger.debug('Using cached client version');
      }
      
      return version;
    } catch (error) {
      logger.error('Failed to fetch client version:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Return cached data if available, even if expired
      const cachedVersion = this.cache.get('client_version');
      if (cachedVersion) {
        logger.warn('Using expired cached version data due to API error');
        return cachedVersion;
      }
      
      // Return default version if everything fails
      const defaultVersion = {
        version: "release-08.05-shipping-11-878609",
        riotClientBuild: "release-08.05-shipping-11-878609"
      };
      
      logger.warn('Using default client version due to API error');
      return defaultVersion;
    }
  }

  async enrichStoreData(storeData) {
    try {
      if (!this.isInitialized) {
        logger.warn('Game data not initialized, returning raw store data');
        return storeData;
      }

      const [skins, bundles] = await Promise.all([
        this.getAllSkins(),
        this.getAllBundles()
      ]);

      if (!skins || !bundles) {
        logger.warn('Missing game data, returning raw store data');
        return storeData;
      }

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
      // Return original data if enrichment fails
      return storeData;
    }
  }

  findSkinById(skins, skinId) {
    try {
      for (const skin of skins) {
        if (skin.levels) {
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
      }
    } catch (error) {
      logger.error('Error finding skin by ID:', error.message);
    }
    return null;
  }

  findBundleForSkin(bundles, skinInfo) {
    try {
      if (!skinInfo || !skinInfo.displayName) return null;
      
      for (const bundle of bundles) {
        if (bundle.displayName && skinInfo.displayName.includes(bundle.displayName)) {
          return {
            displayName: bundle.displayName,
            displayIcon: bundle.displayIcon,
            description: bundle.description
          };
        }
      }
    } catch (error) {
      logger.error('Error finding bundle for skin:', error.message);
    }
    return null;
  }

  // Health check method
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      cacheStats: {
        skins: !!this.cache.get('all_skins'),
        bundles: !!this.cache.get('all_bundles'),
        version: !!this.cache.get('client_version')
      }
    };
  }
}

module.exports = new GameDataService();