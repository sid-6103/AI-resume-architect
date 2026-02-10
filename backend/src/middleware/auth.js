const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * AUTH MIDDLEWARE
 * Protects routes and handles role-based access
 */

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'careerforge_jwt_secret_key_2024'
        );

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Optional auth - attach user if token exists, but don't block
exports.optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'careerforge_jwt_secret_key_2024'
            );
            req.user = await User.findById(decoded.id);
        } catch (err) {
            // Token invalid, continue without user
        }
    }

    next();
};

// Require Pro subscription
exports.requirePro = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!req.user.isPro()) {
        return res.status(403).json({
            success: false,
            message: 'This feature requires a Pro subscription',
            upgradeRequired: true
        });
    }

    next();
};

// Check resume creation limit
exports.checkResumeLimit = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!req.user.canCreateResume()) {
        return res.status(403).json({
            success: false,
            message: 'Free plan allows only 1 resume. Upgrade to Pro for unlimited resumes.',
            upgradeRequired: true
        });
    }

    next();
};
