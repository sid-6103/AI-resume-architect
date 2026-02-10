const express = require('express');
const { searchJobs } = require('../controllers/jobs');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/search', protect, searchJobs);

module.exports = router;
