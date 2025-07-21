const NodeCache = require('node-cache');

class UserService {
  constructor() {
    // In production, use Redis or database
    this.sessionCache = new NodeCache({ stdTTL: 24 * 60 * 60 }); // 24 hours
    this.favoritesCache = new NodeCache({ stdTTL: 0 }); // No expiry
  }

  async storeSession(userId, sessionData) {
    this.sessionCache.set(`session_${userId}`, sessionData);
  }

  async getSession(userId) {
    return this.sessionCache.get(`session_${userId}`);
  }

  async removeSession(userId) {
    this.sessionCache.del(`session_${userId}`);
  }

  async getFavorites(userId) {
    return this.favoritesCache.get(`favorites_${userId}`) || [];
  }

  async addFavorite(userId, skinId) {
    const favorites = await this.getFavorites(userId);
    if (!favorites.includes(skinId)) {
      favorites.push(skinId);
      this.favoritesCache.set(`favorites_${userId}`, favorites);
    }
  }

  async removeFavorite(userId, skinId) {
    const favorites = await this.getFavorites(userId);
    const updated = favorites.filter(id => id !== skinId);
    this.favoritesCache.set(`favorites_${userId}`, updated);
  }
}

module.exports = new UserService();