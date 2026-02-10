const express = require('express');
const {
    register,
    login,
    getMe,
    updateProfile,
    updatePassword
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/update-password', protect, updatePassword);

module.exports = router;
