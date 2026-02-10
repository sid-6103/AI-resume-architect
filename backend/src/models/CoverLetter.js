const mongoose = require('mongoose');

/**
 * COVER LETTER MODEL
 * Stores AI-generated cover letters linked to resumes and users
 */

const coverLetterSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resume: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume'
    },

    // Job Details
    jobTitle: {
        type: String,
        maxlength: [200, 'Job title cannot exceed 200 characters']
    },
    companyName: {
        type: String,
        maxlength: [200, 'Company name cannot exceed 200 characters']
    },
    jobDescription: {
        type: String,
        maxlength: [5000, 'Job description cannot exceed 5000 characters']
    },

    // Cover Letter Content
    content: {
        greeting: String,
        opening: String,
        body: String,
        closing: String,
        signature: String,
        fullText: String // Combined formatted text
    },

    // Generation Settings
    tone: {
        type: String,
        enum: ['professional', 'enthusiastic', 'conversational', 'formal'],
        default: 'professional'
    },

    // Metadata
    title: {
        type: String,
        default: 'Untitled Cover Letter'
    },
    status: {
        type: String,
        enum: ['draft', 'generated', 'edited', 'exported'],
        default: 'draft'
    },
    pdfUrl: String
}, {
    timestamps: true
});

module.exports = mongoose.model('CoverLetter', coverLetterSchema);
