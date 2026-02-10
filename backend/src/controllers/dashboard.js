const Resume = require('../models/Resume');
const CoverLetter = require('../models/CoverLetter');
const User = require('../models/User');

/**
 * DASHBOARD CONTROLLER
 * Handles user dashboard data, resume history, and analytics
 */

// @desc    Get dashboard overview
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user with subscription info
        const user = await User.findById(userId);

        // Get all resumes
        const resumes = await Resume.find({ _id: { $in: user.resumes } })
            .sort({ updatedAt: -1 })
            .select('personalInfo.fullName templateId status atsData.atsScore createdAt updatedAt');

        // Get all cover letters
        const coverLetters = await CoverLetter.find({ user: userId })
            .sort({ createdAt: -1 })
            .select('title jobTitle companyName status tone createdAt');

        // Calculate stats
        const totalResumes = resumes.length;
        const avgATSScore = resumes.reduce((acc, r) => acc + (r.atsData?.atsScore || 0), 0) / (totalResumes || 1);
        const completedResumes = resumes.filter(r => r.status === 'completed').length;
        const totalCoverLetters = coverLetters.length;

        res.status(200).json({
            success: true,
            data: {
                user: {
                    name: user.name,
                    email: user.email,
                    subscription: user.subscription,
                    isPro: user.isPro(),
                    memberSince: user.createdAt
                },
                stats: {
                    totalResumes,
                    completedResumes,
                    avgATSScore: Math.round(avgATSScore),
                    totalCoverLetters,
                    resumeLimit: user.isPro() ? 'unlimited' : 1,
                    resumesRemaining: user.isPro() ? 'unlimited' : Math.max(0, 1 - totalResumes)
                },
                resumes,
                coverLetters
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get resume history for current user
// @route   GET /api/dashboard/resumes
// @access  Private
exports.getResumeHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const resumes = await Resume.find({ _id: { $in: user.resumes } })
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: resumes.length,
            data: resumes
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create resume and link to user
// @route   POST /api/dashboard/resumes
// @access  Private
exports.createUserResume = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // Check resume limit
        if (!user.canCreateResume()) {
            return res.status(403).json({
                success: false,
                message: 'Free plan allows only 1 resume. Upgrade to Pro for unlimited.',
                upgradeRequired: true
            });
        }

        const resume = await Resume.create(req.body);

        // Link to user
        user.resumes.push(resume._id);
        user.resumeCount = user.resumes.length;
        await user.save();

        res.status(201).json({
            success: true,
            data: resume
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Delete resume and unlink from user
// @route   DELETE /api/dashboard/resumes/:id
// @access  Private
exports.deleteUserResume = async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        await resume.deleteOne();

        // Unlink from user
        const user = await User.findById(req.user.id);
        user.resumes = user.resumes.filter(id => id.toString() !== req.params.id);
        user.resumeCount = user.resumes.length;
        await user.save();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get ATS score history for a resume
// @route   GET /api/dashboard/resumes/:id/ats-history
// @access  Private
exports.getATSHistory = async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id)
            .select('atsData personalInfo.fullName');

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                resumeName: resume.personalInfo?.fullName,
                currentScore: resume.atsData?.atsScore || 0,
                previousScore: resume.atsData?.previousScore || 0,
                matchedKeywords: resume.atsData?.matchedKeywords || [],
                missingKeywords: resume.atsData?.missingKeywords || [],
                lastAnalyzed: resume.atsData?.lastAnalyzed
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
