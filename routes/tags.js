const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, tagController.getAllTags);

router.put('/:id', 
  authenticate, 
  authorize('super_admin', 'sub_admin', 'support_agent'),
  tagController.updateLeadTags
);

router.get('/:tag/leads', 
  authenticate, 
  tagController.getLeadsByTag
);

module.exports = router;