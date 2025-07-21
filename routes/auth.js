// routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Validation rules
const callbackValidation = [
  body('callbackUrl')
    .notEmpty()
    .withMessage('Callback URL is required')
    .contains('access_token')
    .withMessage('Callback URL must contain access_token')
];

const switchAccountValidation = [
  body('targetUserId')
    .notEmpty()
    .withMessage('Target user ID is required')
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid user ID format')
];

// Public OAuth Routes
router.get('/generate-url', AuthController.generateAuthUrl);
router.post('/callback', callbackValidation, validateRequest, AuthController.processCallback);

// Protected Routes - require JWT token
router.get('/profile', authMiddleware, AuthController.getProfile);
router.post('/refresh', authMiddleware, AuthController.refresh);
router.get('/sessions', authMiddleware, AuthController.getAllSessions);
router.post('/switch', switchAccountValidation, validateRequest, authMiddleware, AuthController.switchAccount);
router.post('/logout', authMiddleware, AuthController.logout);

// Logout specific account (multi-account support)
router.post('/logout/:userId', authMiddleware, AuthController.logoutAccount);

module.exports = router;