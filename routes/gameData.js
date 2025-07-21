const express = require('express');
const gameDataController = require('../controllers/gameDataController');

const router = express.Router();

router.get('/skins', gameDataController.getAllSkins);
router.get('/bundles', gameDataController.getAllBundles);
router.get('/version', gameDataController.getVersion);
router.get('/health', gameDataController.getGameDataHealth);

module.exports = router;