const express = require('express');
const {
    analyzeJD,
    rewriteBulletPoint,
    calculateATSScore,
    optimizeResume,
    bulletDecision,
    generateSummary
} = require('../controllers/ai');

const router = express.Router();

// JD Analysis
router.post('/analyze-jd', analyzeJD);

// Bullet Rewriting
router.post('/rewrite', rewriteBulletPoint);

// ATS Scoring
router.post('/score', calculateATSScore);

// Magic Button - Full Optimization
router.post('/optimize', optimizeResume);

// Accept/Reject Bullet Decision
router.post('/bullet-decision', bulletDecision);

// Generate Summary
router.post('/summary', generateSummary);

module.exports = router;
