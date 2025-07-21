const express = require('express');
const authRoutes = require('./auth');
const storeRoutes = require('./store');
const gameDataRoutes = require('./gameData');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/store', storeRoutes);
router.use('/game-data', gameDataRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;