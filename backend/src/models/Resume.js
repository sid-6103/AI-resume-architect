const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    // Removed user reference for simplified Week 1
    personalInfo: {
        fullName: String,
        email: String,
        phone: String,
        location: String,
        website: String,
        github: String,
        linkedin: String
    },
    education: [{
        school: String,
        degree: String,
        fieldOfStudy: String,
        startDate: String,
        endDate: String,
        description: String
    }],
    experience: [{
        company: String,
        role: String,
        location: String,
        startDate: String,
        endDate: String,
        current: Boolean,
        description: String,
        highlights: [String], // Array of bullet points
        aiOptimized: {
            type: Boolean,
            default: false
        }
    }],
    skills: {
        technical: [String],
        soft: [String],
        tools: [String]
    },
    projects: [{
        title: String,
        link: String,
        description: String,
        highlights: [String]
    }],
    atsData: {
        targetJD: String,
        atsScore: {
            type: Number,
            default: 0
        },
        matchedKeywords: [String],
        missingKeywords: [String],
        suggestions: [String]
    },
    status: {
        type: String,
        enum: ['draft', 'completed'],
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Resume', resumeSchema);
