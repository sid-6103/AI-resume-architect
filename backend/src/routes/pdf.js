const express = require('express');
const { generatePDF, downloadPDF, previewPDF } = require('../controllers/pdf');

const router = express.Router();

// PDF Generation
router.post('/generate-pdf', generatePDF);
router.post('/preview-pdf', previewPDF);

// Download
router.get('/download/:fileName', downloadPDF);

module.exports = router;
