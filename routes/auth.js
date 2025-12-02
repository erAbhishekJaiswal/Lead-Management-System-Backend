const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], authController.login);

router.post('/register', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['super_admin', 'sub_admin', 'support_agent'])
], authController.registerUser);

router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;