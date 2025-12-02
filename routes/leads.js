const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const leadController = require('../controllers/leadController');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/',
  authenticate,
  authorize('super_admin', 'sub_admin', 'support_agent'),
  logActivity,
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty(),
    body('status').optional().isIn(['new', 'contacted', 'qualified', 'lost', 'won'])
  ],
  leadController.createLead
);

router.get('/',
  authenticate,
  leadController.getLeads
);

router.get('/:id',
  authenticate,
  leadController.getLead
);

router.put('/:id',
  authenticate,
  logActivity,
  leadController.updateLead
);

router.post('/import',
  authenticate,
  authorize('super_admin', 'sub_admin'),
  upload.single('file'),
  leadController.importLeads
);

router.get('/export',
  authenticate,
  leadController.exportLeads
);

module.exports = router;