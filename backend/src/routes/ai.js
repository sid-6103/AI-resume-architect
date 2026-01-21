const express = require('express');
const {
    analyzeJD,
    rewriteBulletPoint,
    calculateATSScore
} = require('../controllers/ai');

const router = express.Router();

router.post('/analyze-jd', analyzeJD);
router.post('/rewrite', rewriteBulletPoint);
router.post('/score', calculateATSScore);

module.exports = router;
