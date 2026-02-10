const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

        console.log('Decoded Token:', decoded);

        req.user = await User.findById(decoded.id);

        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};
