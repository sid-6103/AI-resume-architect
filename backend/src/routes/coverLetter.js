const express = require('express');
const {
    generateCoverLetter,
    getCoverLetters,
    getCoverLetter,
    updateCoverLetter,
    exportCoverLetterPDF,
    deleteCoverLetter
} = require('../controllers/coverLetter');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Generate cover letter (works without auth too, but saves if authenticated)
router.post('/generate', optionalAuth, generateCoverLetter);

// Protected CRUD routes
router.get('/', protect, getCoverLetters);
router.get('/:id', protect, getCoverLetter);
router.put('/:id', protect, updateCoverLetter);
router.delete('/:id', protect, deleteCoverLetter);
router.post('/:id/export-pdf', protect, exportCoverLetterPDF);

module.exports = router;
