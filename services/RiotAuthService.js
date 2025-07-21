const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const { RIOT_URLS, CLIENT_PLATFORM } = require('../config/constants');
const logger = require('../utils/logger');

class RiotAuthService {
  constructor() {
    this.httpsAgent = new https.Agent({
      secureProtocol: 'TLSv1_2_method',
      rejectUnauthorized: false 
    });
  }

  async authenticate(username, password) {
    try {
      // Get client version
      const version = await this.getClientVersion();
      
      const axiosConfig = {
        httpsAgent: this.httpsAgent,
        timeout: 30000,
        headers: {
          'Accept-Encoding': 'deflate, gzip',
          'User-Agent': `RiotClient/${version.riotClientBuild} (Windows;10;;Professional, x64)`,
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };
      const nonce = crypto.randomBytes(16).toString('base64url');
      const authInitBody = {
        acr_values: "",
        claims: "",
        client_id: "riot-client",
        code_challenge: "",
        code_challenge_method: "",
        nonce: nonce,
        redirect_uri: "http://localhost/redirect",
        response_type: "token id_token",
        scope: "openid link ban lol_region account"
      };

      logger.info('Initializing authentication...');
      await axios.post(RIOT_URLS.AUTH, authInitBody, axiosConfig);

      const loginBody = {
        language: "en_US",
        password: password,
        region: null,
        remember: false,
        type: "auth",
        username: username
      };

      logger.info('Attempting login...');
      const loginResponse = await axios.put(RIOT_URLS.AUTH, loginBody, axiosConfig);
      
      if (loginResponse.data.type === 'error') {
        logger.error('Login failed:', loginResponse.data.error);
        return {
          success: false,
          error: loginResponse.data.error
        };
      }

      if (!loginResponse.data.response || !loginResponse.data.response.parameters) {
        logger.error('Invalid response structure');
        return {
          success: false,
          error: 'Invalid response from authentication server'
        };
      }

      const uri = loginResponse.data.response.parameters.uri;
      const fragment = new URL(uri).hash.substring(1);
      const params = new URLSearchParams(fragment);
      
      const accessToken = params.get('access_token');
      const tokenType = params.get('token_type') || 'Bearer';

      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      logger.info('Access token obtained, getting entitlements...');

      const entitlementsConfig = {
        ...axiosConfig,
        headers: {
          ...axiosConfig.headers,
          'Authorization': `${tokenType} ${accessToken}`
        }
      };

      const entitlementsResponse = await axios.post(
        RIOT_URLS.ENTITLEMENTS, 
        {}, 
        entitlementsConfig
      );

      const entitlementsToken = entitlementsResponse.data.entitlements_token;

      const payload = accessToken.split('.')[1];
      let decoded;
      try {
        const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
        decoded = JSON.parse(Buffer.from(paddedPayload, 'base64').toString());
      } catch (decodeError) {
        logger.error('Failed to decode JWT:', decodeError);
        throw new Error('Failed to decode user information');
      }
      
      const userId = decoded.sub;

      logger.info('Authentication successful');

      return {
        success: true,
        data: {
          accessToken,
          entitlementsToken,
          userId,
          tokenType
        }
      };

    } catch (error) {
      logger.error('Riot authentication error:', error.message);
      
      if (error.response) {
        logger.error('Response data:', error.response.data);
        logger.error('Response status:', error.response.status);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getClientVersion() {
    try {
      const response = await axios.get(RIOT_URLS.VERSION, {
        timeout: 10000
      });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get client version:', error.message);
      return {
        version: "release-08.05-shipping-11-878609",
        riotClientBuild: "release-08.05-shipping-11-878609"
      };
    }
  }

  async validateTokens(accessToken, entitlementsToken) {
    try {
      const config = {
        httpsAgent: this.httpsAgent,
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Riot-Entitlements-JWT': entitlementsToken,
          'Content-Type': 'application/json'
        }
      };

      await axios.post(RIOT_URLS.ENTITLEMENTS, {}, config);
      return true;
    } catch (error) {
      logger.error('Token validation failed:', error.message);
      return false;
    }
  }
}

module.exports = new RiotAuthService();