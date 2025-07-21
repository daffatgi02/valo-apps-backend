module.exports = {
  RIOT_URLS: {
    AUTH: 'https://auth.riotgames.com/api/v1/authorization',
    ENTITLEMENTS: 'https://entitlements.auth.riotgames.com/api/token/v1',
    STORE: 'https://pd.ap.a.pvp.net/store/v2/storefront',
    VERSION: 'https://valorant-api.com/v1/version',
    SKINS: 'https://valorant-api.com/v1/weapons/skins',
    BUNDLES: 'https://valorant-api.com/v1/bundles'
  },
  
  JWT_CONFIG: {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-key',
    EXPIRES_IN: '24h'
  },

  CACHE_TTL: {
    SKINS: 24 * 60 * 60, // 24 hours
    STORE: 5 * 60, // 5 minutes
    VERSION: 60 * 60 // 1 hour
  },

  CLIENT_PLATFORM: {
    platformType: "PC",
    platformOS: "Windows",
    platformOSVersion: "10.0.19042.1.256.64bit",
    platformChipset: "Unknown"
  }
};