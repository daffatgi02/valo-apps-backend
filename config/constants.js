// config/constants.js
module.exports = {
  RIOT_URLS: {
    // Authentication URLs
    AUTH_AUTHORIZE: 'https://auth.riotgames.com/authorize',
    AUTH_USERINFO: 'https://auth.riotgames.com/userinfo',
    ENTITLEMENTS: 'https://entitlements.auth.riotgames.com/api/token/v1',
    
    // Game API URLs
    VERSION: 'https://valorant-api.com/v1/version',
    SKINS: 'https://valorant-api.com/v1/weapons/skins',
    BUNDLES: 'https://valorant-api.com/v1/bundles',
    
    // Player-specific URLs (require placeholders)
    STORE: 'https://pd.{region}.a.pvp.net/store/v2/storefront/{userId}',
    BALANCE: 'https://pd.{region}.a.pvp.net/store/v1/wallet/{userId}',
    ACCOUNT_XP: 'https://pd.{region}.a.pvp.net/account-xp/v1/players/{userId}',
    PLAYER_LOADOUT: 'https://pd.{region}.a.pvp.net/personalization/v2/players/{userId}/playerloadout'
  },
  
  OAUTH_CONFIG: {
    CLIENT_ID: 'play-valorant-web-prod',
    REDIRECT_URI: 'https://playvalorant.com/opt_in',
    RESPONSE_TYPE: 'token id_token',
    SCOPE: 'account openid',
    NONCE: '1'
  },

  X_RIOT_CLIENT_PLATFORM: "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9",

  CLIENT_PLATFORM: {
    platformType: "PC",
    platformOS: "Windows",
    platformOSVersion: "10.0.19042.1.256.64bit",
    platformChipset: "Unknown"
  },

  JWT_CONFIG: {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-key',
    EXPIRES_IN: '24h'
  },

  BALANCE_TYPES: {
    VALORANT_POINTS: '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741',
    RADIANITE_POINTS: 'e59aa87c-4cbf-517a-5983-6e81511be9b7',
    KINGDOM_CREDITS: '85ca954a-41f2-ce94-9b45-8ca3dd39a00d'
  },

  CACHE_TTL: {
    SKINS: 24 * 60 * 60, // 24 hours
    BALANCE: 5 * 60, // 5 minutes
    USER_INFO: 60 * 60, // 1 hour
    VERSION: 60 * 60, // 1 hour
    TOKENS: 24 * 60 * 60 // 24 hours
  }
};