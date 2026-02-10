const express = require('express');
const { generatePDF } = require('../controllers/pdf');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/generate/:id', protect, generatePDF);

module.exports = router;
