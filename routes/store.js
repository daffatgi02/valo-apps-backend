const express = require('express');
const storeController = require('../controllers/storeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware); // All store routes require auth

router.get('/daily', storeController.getDailyStore);
router.get('/history', storeController.getStoreHistory);
router.get('/favorites', storeController.getFavorites);
router.post('/favorites/:skinId', storeController.addFavorite);
router.delete('/favorites/:skinId', storeController.removeFavorite);

module.exports = router;