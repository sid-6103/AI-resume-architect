const express = require('express');
const {
    getResumes,
    getResume,
    createResume,
    updateResume,
    deleteResume
} = require('../controllers/resumes');

const router = express.Router();

// Public routes for Week 1 core development
router
    .route('/')
    .get(getResumes)
    .post(createResume);

router
    .route('/:id')
    .get(getResume)
    .put(updateResume)
    .delete(deleteResume);

module.exports = router;
