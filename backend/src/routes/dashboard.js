const express = require('express');
const {
    getDashboard,
    getResumeHistory,
    createUserResume,
    deleteUserResume,
    getATSHistory
} = require('../controllers/dashboard');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

router.get('/', getDashboard);
router.get('/resumes', getResumeHistory);
router.post('/resumes', createUserResume);
router.delete('/resumes/:id', deleteUserResume);
router.get('/resumes/:id/ats-history', getATSHistory);

module.exports = router;
