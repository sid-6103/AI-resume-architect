const Resume = require('../models/Resume');
const User = require('../models/User');

// @desc    Get all resumes for current user
// @route   GET /api/resumes
// @access  Private
exports.getResumes = async (req, res, next) => {
    try {
        const resumes = await Resume.find({ userId: req.user.id });

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
// @access  Private (Changed from Public)
exports.getResume = async (req, res, next) => {
    try {
        const resume = await Resume.findById(req.params.id);

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        // Check ownership
        if (resume.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
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
// @access  Private
exports.createResume = async (req, res, next) => {
    try {
        // req.user is set by protect middleware
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        // Check Limits
        const resumeCount = await Resume.countDocuments({ userId: req.user.id });
        if (!user.isPro && resumeCount >= 1) {
            return res.status(403).json({
                success: false,
                message: 'Free tier limit reached (1 resume). Please upgrade to Pro for unlimited resumes!'
            });
        }

        // Add user to resume
        req.body.userId = req.user.id;


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
// @access  Private
exports.updateResume = async (req, res, next) => {
    try {
        let resume = await Resume.findById(req.params.id);

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        // Make sure user owns resume
        if (!resume.userId || resume.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized to update this resume' });
        }

        // Clean up request body - don't try to update IDs or internal fields
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.userId;
        delete updateData.resumeId; // Client state ID

        // Flatten the request body to use dot notation for nested updates
        const flattenedUpdate = flattenObject(updateData);


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
// @access  Private
exports.deleteResume = async (req, res, next) => {
    try {
        const resume = await Resume.findById(req.params.id);

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        // Make sure user owns resume
        if (resume.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized to delete this resume' });
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
