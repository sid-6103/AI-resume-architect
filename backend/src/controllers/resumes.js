const Resume = require('../models/Resume');

// @desc    Get all resumes
// @route   GET /api/resumes
// @access  Public
exports.getResumes = async (req, res, next) => {
    try {
        const resumes = await Resume.find();

        res.status(200).json({
            success: true,
            count: resumes.length,
            data: resumes
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Get single resume
// @route   GET /api/resumes/:id
// @access  Public
exports.getResume = async (req, res, next) => {
    try {
        const resume = await Resume.findById(req.params.id);

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        res.status(200).json({
            success: true,
            data: resume
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Create new resume
// @route   POST /api/resumes
// @access  Public
exports.createResume = async (req, res, next) => {
    try {
        const resume = await Resume.create(req.body);

        res.status(201).json({
            success: true,
            data: resume
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Helper function to flatten object for dot-notation (prevents overwriting nested objects)
const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
};

// @desc    Update resume (Supports Live Preview partial saves)
// @route   PUT /api/resumes/:id
// @access  Public
exports.updateResume = async (req, res, next) => {
    try {
        let resume = await Resume.findById(req.params.id);

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        // Flatten the request body to use dot notation for nested updates
        // This ensures personalInfo.fullName doesn't delete personalInfo.email
        const flattenedUpdate = flattenObject(req.body);

        resume = await Resume.findByIdAndUpdate(req.params.id,
            { $set: flattenedUpdate },
            {
                new: true,
                runValidators: false
            }
        );

        res.status(200).json({
            success: true,
            data: resume
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Delete resume
// @route   DELETE /api/resumes/:id
// @access  Public
exports.deleteResume = async (req, res, next) => {
    try {
        const resume = await Resume.findById(req.params.id);

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        await resume.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
