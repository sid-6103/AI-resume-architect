const express = require('express');
const {
    getResumes,
    getResume,
    createResume,
    updateResume,
    deleteResume
} = require('../controllers/resumes');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, getResumes)
    .post(protect, createResume);

router.route('/:id')
    .get(protect, getResume) // Maybe allow public if shared? For now private.
    .put(protect, updateResume)
    .delete(protect, deleteResume);

module.exports = router;
