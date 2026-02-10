const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * USER MODEL
 * Handles authentication, subscription tracking, and resume ownership
 */

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        maxlength: [100, 'Name cannot exceed 100 characters'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default
    },

    // Subscription
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'pro'],
            default: 'free'
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        stripePriceId: String,
        status: {
            type: String,
            enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'none'],
            default: 'none'
        },
        currentPeriodEnd: Date,
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false
        }
    },

    // Resume tracking
    resumeCount: {
        type: Number,
        default: 0
    },
    resumes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume'
    }],

    // Cover letter tracking
    coverLetters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CoverLetter'
    }],

    resetPasswordToken: String,
    resetPasswordExpire: Date
}, {
    timestamps: true
});

// Encrypt password before save
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET || 'careerforge_jwt_secret_key_2024',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

// Match user-entered password to hashed password in DB
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user can create more resumes
userSchema.methods.canCreateResume = function () {
    if (this.subscription.plan === 'pro' && this.subscription.status === 'active') {
        return true; // Pro users = unlimited
    }
    return this.resumeCount < 1; // Free users = 1 resume
};

// Check if user has pro access
userSchema.methods.isPro = function () {
    return this.subscription.plan === 'pro' && this.subscription.status === 'active';
};

module.exports = mongoose.model('User', userSchema);
