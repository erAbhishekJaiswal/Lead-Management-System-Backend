const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const noteController = require('../controllers/noteController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/:id/notes',
  authenticate,
  authorize('super_admin', 'sub_admin', 'support_agent'),
  [
    body('content').notEmpty().trim()
  ],
  noteController.addNote
);

router.put('/:id/notes/:noteId',
  authenticate,
  [
    body('content').notEmpty().trim()
  ],
  noteController.updateNote
);

router.delete('/:id/notes/:noteId',
  authenticate,
  noteController.deleteNote
);

router.get('/:id/notes',
  authenticate,
  noteController.getLeadNotes
);

module.exports = router;