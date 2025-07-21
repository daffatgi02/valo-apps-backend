// server.js
const express = require('express');

// Check if modules exist before requiring
let cors, helmet, rateLimit, NodeCache;

try {
  cors = require('cors');
  helmet = require('helmet');
  rateLimit = require('express-rate-limit');
  NodeCache = require('node-cache');
} catch (error) {
  console.error('Missing required modules. Please run: npm install cors helmet express-rate-limit node-cache');
  process.exit(1);
}

const logger = require('./utils/logger');
const routes = require('./routes');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting dengan config yang lebih ketat untuk auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit auth requests
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // general API requests
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
  });
  
  // Log debug info in development
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`Request: ${req.method} ${req.path}`, {
      body: req.body,
      query: req.query,
      userAgent: req.get('User-Agent')
    });
  }
  
  next();
});

// Auth routes (OAuth-based authentication)
app.use('/api/auth', authRoutes);

// Existing routes
app.use('/api', routes);

// Root route with enhanced info
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Valorant Store API is running!',
    version: '2.0.0',
    features: {
      oauth_login: 'No username/password required',
      multi_account: 'Support multiple Riot accounts',
      balance_tracking: 'Real-time VP/RP/KC balance',
      session_management: 'Persistent login sessions'
    },
    endpoints: {
      health: '/api/health',
      auth: {
        generate_url: 'GET /api/auth/generate-url',
        callback: 'POST /api/auth/callback',
        profile: 'GET /api/auth/profile',
        sessions: 'GET /api/auth/sessions',
        switch: 'POST /api/auth/switch',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      },
      store: '/api/store',
      gameData: '/api/game-data'
    }
  });
});

// Health check with enhanced diagnostics
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/auth/generate-url',
      'POST /api/auth/callback'
    ]
  });
});

// Error handling
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  logger.info(`🔐 OAuth Login: http://localhost:${PORT}/api/auth/generate-url`);
  logger.info(`👥 Multi-Account Support: Enabled`);
  logger.info(`💰 Balance Tracking: VP/RP/KC`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

module.exports = app;