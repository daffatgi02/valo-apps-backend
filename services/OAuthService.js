// services/OAuthService.js
const axios = require('axios');
const crypto = require('crypto');
const { OAUTH_CONFIG, RIOT_URLS } = require('../config/constants');
const logger = require('../utils/logger');
const ErrorHelper = require('../helpers/ErrorHelper');

class OAuthService {
  generateAuthUrl() {
    try {
      const params = new URLSearchParams({
        redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
        client_id: OAUTH_CONFIG.CLIENT_ID,
        response_type: OAUTH_CONFIG.RESPONSE_TYPE,
        nonce: OAUTH_CONFIG.NONCE,
        scope: OAUTH_CONFIG.SCOPE
      });

      const authUrl = `${RIOT_URLS.AUTH_AUTHORIZE}?${params.toString()}`;
      
      logger.debug('Generated OAuth URL', { authUrl });
      
      return {
        success: true,
        data: { authUrl }
      };
    } catch (error) {
      logger.error('Failed to generate auth URL:', error);
      return ErrorHelper.createError('AUTH_URL_GENERATION_FAILED', 'Failed to generate authentication URL');
    }
  }

  async processTokenCallback(callbackUrl) {
    try {
      if (!callbackUrl || !callbackUrl.includes('access_token')) {
        return ErrorHelper.createError('INVALID_CALLBACK', 'Invalid callback URL or missing tokens');
      }

      const url = new URL(callbackUrl);
      const fragment = url.hash.substring(1);
      const params = new URLSearchParams(fragment);

      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      const tokenType = params.get('token_type') || 'Bearer';

      if (!accessToken || !idToken) {
        return ErrorHelper.createError('MISSING_TOKENS', 'Missing required tokens in callback');
      }

      logger.debug('Tokens extracted from callback', { 
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken 
      });

      return {
        success: true,
        data: {
          accessToken,
          idToken,
          tokenType
        }
      };
    } catch (error) {
      logger.error('Token callback processing failed:', error);
      return ErrorHelper.createError('TOKEN_PROCESSING_FAILED', 'Failed to process authentication tokens');
    }
  }

  async getEntitlementsToken(accessToken) {
    try {
      const response = await axios.post(
        RIOT_URLS.ENTITLEMENTS,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const entitlementsToken = response.data.entitlements_token;
      
      if (!entitlementsToken) {
        throw new Error('No entitlements token received');
      }

      logger.debug('Entitlements token obtained');
      
      return {
        success: true,
        data: { entitlementsToken }
      };
    } catch (error) {
      logger.error('Failed to get entitlements token:', error);
      return ErrorHelper.createError('ENTITLEMENTS_FAILED', 'Failed to obtain entitlements token');
    }
  }
}

module.exports = new OAuthService();