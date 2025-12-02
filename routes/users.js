const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

// Super admin only routes
router.post('/',
  authenticate,
  authorize('super_admin'),
  logActivity,
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['sub_admin', 'support_agent'])
  ],
  userController.createUser
);

router.get('/',
  authenticate,
  authorize('super_admin', 'sub_admin'),
  userController.getAllUsers
);

router.put('/:id',
  authenticate,
  authorize('super_admin'),
  logActivity,
  userController.updateUser
);

router.delete('/:id',
  authenticate,
  authorize('super_admin'),
  logActivity,
  userController.deleteUser
);

router.get('/:userId/activity',
  authenticate,
  authorize('super_admin'),
  userController.getUserActivity
);

module.exports = router;