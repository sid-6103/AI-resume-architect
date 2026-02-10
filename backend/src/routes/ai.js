const express = require('express');
const multer = require('multer');
const {
    analyzeJD,
    calculateATSScore,
    rewriteBulletPoint,
    optimizeResume,
    bulletDecision,
    generateSummary,
    generateCoverLetter,
    standaloneATSCheck
} = require('../controllers/ai');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/analyze-jd', protect, analyzeJD);
router.post('/score', protect, calculateATSScore);
router.post('/rewrite', protect, rewriteBulletPoint);
router.post('/optimize', protect, optimizeResume);
router.post('/bullet-decision', protect, bulletDecision);
router.post('/summary', protect, generateSummary);
router.post('/cover-letter', protect, generateCoverLetter);
router.post('/check-ats', protect, upload.single('resume'), standaloneATSCheck);

module.exports = router;

